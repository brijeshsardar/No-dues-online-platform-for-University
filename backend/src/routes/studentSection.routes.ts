import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { Role } from '../types/index.js';
import { AuditService } from '../services/auditService.js';
import { NotificationService } from '../services/notificationService.js';
import { WorkflowEngine } from '../services/workflowEngine.js';

const router = Router();

// Student Section and Admin have authorized access to Student Administration endpoints
router.use(authenticate, requireRole(Role.STUDENT_SECTION, Role.ADMIN));

// =========================================================================
// 1. DASHBOARD STATS & OVERVIEW
// =========================================================================
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const totalStudents = await prisma.student.count();
    const activeStudents = await prisma.student.count({ where: { enrollmentStatus: 'ACTIVE' } });
    const graduatedStudents = await prisma.student.count({ where: { enrollmentStatus: 'GRADUATED' } });
    const suspendedStudents = await prisma.student.count({ where: { enrollmentStatus: 'SUSPENDED' } });
    const totalCourses = await prisma.course.count();
    const totalSemesters = await prisma.semester.count();

    // Pending conduct verification in clearance pipeline
    const pendingClearance = await prisma.clearanceRequest.count({
      where: {
        currentStage: 'STUDENT_SECTION',
        overallStatus: 'PENDING_STUDENT_SECTION',
      },
    });

    const approvedClearance = await prisma.approval.count({
      where: {
        departmentCode: 'STUDENT_SECTION',
        status: 'APPROVED',
      },
    });

    // Recent registered students
    const recentStudents = await prisma.student.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, isActive: true, phone: true } },
        course: { select: { name: true, code: true } },
        semester: { select: { name: true, code: true } },
      },
    });

    // Course distribution
    const courses = await prisma.course.findMany({
      include: {
        _count: { select: { students: true } },
      },
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        graduatedStudents,
        suspendedStudents,
        totalCourses,
        totalSemesters,
        pendingClearance,
        approvedClearance,
        recentStudents,
        courses: courses.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          count: c._count.students,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 2. STUDENT MANAGEMENT & REGISTRATION
// =========================================================================

/**
 * GET /api/student-section/students
 * Search and filter students
 */
router.get('/students', async (req: Request, res: Response) => {
  try {
    const { q, courseId, semesterId, enrollmentStatus, departmentId } = req.query;
    const where: any = {};

    if (courseId) where.courseId = String(courseId);
    if (semesterId) where.semesterId = String(semesterId);
    if (departmentId) where.departmentId = String(departmentId);
    if (enrollmentStatus) where.enrollmentStatus = String(enrollmentStatus);

    if (q) {
      const searchStr = String(q).trim();
      where.OR = [
        { studentId: { contains: searchStr } },
        { enrollmentNo: { contains: searchStr } },
        { admissionNumber: { contains: searchStr } },
        { user: { fullName: { contains: searchStr } } },
        { user: { email: { contains: searchStr } } },
        { user: { phone: { contains: searchStr } } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        course: true,
        semester: true,
        department: true,
        academicYear: true,
        feeRecords: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            totalFee: true,
            paidAmount: true,
            outstandingBalance: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: students.length, students });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/student-section/students
 * Register a new student with personal, academic, and login accounts
 */
router.post('/students', async (req: Request, res: Response) => {
  try {
    const {
      // Personal
      fullName,
      fatherName,
      motherName,
      dob,
      gender,
      phone,
      email,
      address,
      photoUrl,
      // Academic
      studentId,
      rollNumber,
      admissionNumber,
      courseId,
      departmentId,
      semesterId,
      academicSession,
      admissionDate,
      enrollmentStatus = 'ACTIVE',
      batchYear = '2025-2029',
      // Login
      password,
    } = req.body;

    if (!fullName || !email || !studentId || !courseId || !semesterId) {
      return res.status(400).json({
        success: false,
        error: 'Mandatory fields missing: Full Name, Email, Registration Number (Student ID), Course, and Semester are required.',
      });
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user account with this email address already exists in the system.',
      });
    }

    // Check registration number uniqueness
    const existingStudent = await prisma.student.findUnique({
      where: { studentId: studentId.trim() },
    });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: 'A student with this Registration Number (Student ID) already exists.',
      });
    }

    // Check roll/enrollment number uniqueness
    const enNo = (rollNumber || studentId).trim();
    const existingRoll = await prisma.student.findUnique({
      where: { enrollmentNo: enNo },
    });
    if (existingRoll) {
      return res.status(400).json({
        success: false,
        error: 'A student with this Roll/Enrollment Number already exists.',
      });
    }

    // Get current or active academic year
    let academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });
    if (!academicYear) {
      academicYear = await prisma.academicYear.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }
    if (!academicYear) {
      academicYear = await prisma.academicYear.create({
        data: { yearString: '2025-2026', isCurrent: true },
      });
    }

    const passwordHash = await bcrypt.hash(password || 'Student@123', 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User account with role 'STUDENT'
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          fullName: fullName.trim(),
          role: 'STUDENT',
          phone: phone || null,
          avatarUrl: photoUrl || null,
          isActive: true,
        },
      });

      // 2. Create Student Profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId: studentId.trim(),
          enrollmentNo: enNo,
          admissionNumber: admissionNumber ? admissionNumber.trim() : `ADM-${Date.now().toString().slice(-6)}`,
          fatherName: fatherName || null,
          motherName: motherName || null,
          dob: dob || null,
          gender: gender || 'Not Specified',
          address: address || null,
          photoUrl: photoUrl || null,
          admissionDate: admissionDate || new Date().toISOString().split('T')[0],
          enrollmentStatus,
          courseId,
          departmentId: departmentId || null,
          semesterId,
          academicYearId: academicYear!.id,
          batchYear,
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
          course: true,
          semester: true,
          department: true,
        },
      });

      // 3. Create Default Fee Record (assessed tuition, awaiting Account Section verification)
      await tx.feeRecord.create({
        data: {
          studentId: student.id,
          semesterId,
          academicYearId: academicYear!.id,
          totalFee: 10000,
          paidAmount: 0,
          outstandingBalance: 10000,
          paymentStatus: 'PENDING',
          remarks: 'Initial academic fee assessed upon admission by Student Section',
          verifiedByUserId: req.user!.id,
          verifiedAt: new Date(),
        },
      });

      return student;
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'STUDENT_SECTION_REGISTER_STUDENT',
      entityType: 'Student',
      entityId: result.id,
      ipAddress: req.ip,
      details: `Student Section registered student ${result.studentId} (${result.user.fullName}) with email ${result.user.email}`,
    });

    await NotificationService.send(
      result.user.id,
      'Welcome to CT University!',
      `Your student profile (${result.studentId}) has been registered by the Student Section. You can now log in using your student credentials.`,
      'INFO'
    );

    res.status(201).json({ success: true, student: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/student-section/students/:id
 * Retrieve single student dossier
 */
router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        course: true,
        semester: true,
        department: true,
        academicYear: true,
        feeRecords: {
          orderBy: { createdAt: 'desc' },
          include: { transactions: true },
        },
        requests: {
          orderBy: { submittedAt: 'desc' },
          include: { approvals: true, certificate: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    res.json({ success: true, student });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/student-section/students/:id
 * Update student profile and academic details
 */
router.put('/students/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    const {
      fullName,
      fatherName,
      motherName,
      dob,
      gender,
      phone,
      address,
      photoUrl,
      courseId,
      departmentId,
      semesterId,
      academicSession,
      admissionDate,
      enrollmentStatus,
      batchYear,
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      if (fullName || phone || photoUrl) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            fullName: fullName || student.user.fullName,
            phone: phone !== undefined ? phone : student.user.phone,
            avatarUrl: photoUrl !== undefined ? photoUrl : student.user.avatarUrl,
          },
        });
      }

      return await tx.student.update({
        where: { id: req.params.id },
        data: {
          fatherName: fatherName !== undefined ? fatherName : student.fatherName,
          motherName: motherName !== undefined ? motherName : student.motherName,
          dob: dob !== undefined ? dob : student.dob,
          gender: gender || student.gender,
          address: address !== undefined ? address : student.address,
          photoUrl: photoUrl !== undefined ? photoUrl : student.photoUrl,
          courseId: courseId || student.courseId,
          departmentId: departmentId !== undefined ? departmentId : student.departmentId,
          semesterId: semesterId || student.semesterId,
          admissionDate: admissionDate || student.admissionDate,
          enrollmentStatus: enrollmentStatus || student.enrollmentStatus,
          batchYear: batchYear || student.batchYear,
        },
        include: {
          user: true,
          course: true,
          semester: true,
          department: true,
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'STUDENT_SECTION_UPDATE_STUDENT',
      entityType: 'Student',
      entityId: updated.id,
      ipAddress: req.ip,
      details: `Student Section updated profile for student ${updated.studentId} (${updated.user.fullName})`,
    });

    res.json({ success: true, student: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/student-section/students/:id/toggle-status
 * Activate or suspend student account
 */
router.patch('/students/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    const newActiveState = !student.user.isActive;
    const newEnrollment = newActiveState ? 'ACTIVE' : 'SUSPENDED';

    await prisma.$transaction([
      prisma.user.update({
        where: { id: student.userId },
        data: { isActive: newActiveState },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { enrollmentStatus: newEnrollment },
      }),
    ]);

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'STUDENT_SECTION_STATUS_TOGGLE',
      entityType: 'Student',
      entityId: student.id,
      ipAddress: req.ip,
      details: `Student Section toggled active status for ${student.studentId} to ${newActiveState} (${newEnrollment})`,
    });

    res.json({
      success: true,
      isActive: newActiveState,
      enrollmentStatus: newEnrollment,
      message: `Student account successfully ${newActiveState ? 'activated' : 'suspended'}.`,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/student-section/students/:id/reset-password
 * Reset student login password
 */
router.post('/students/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: student.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'STUDENT_SECTION_PASSWORD_RESET',
      entityType: 'Student',
      entityId: student.id,
      ipAddress: req.ip,
      details: `Student Section reset login password for student ${student.studentId} (${student.user.email})`,
    });

    res.json({ success: true, message: `Password reset successfully for ${student.user.fullName}.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 3. COURSES & ACADEMIC STRUCTURE
// =========================================================================

router.get('/courses', async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, count: courses.length, courses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/courses', async (req: Request, res: Response) => {
  try {
    const { code, name, departmentName, durationYears = 4 } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'Course code and name are required.' });
    }

    const existing = await prisma.course.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Course with this code already exists.' });
    }

    const course = await prisma.course.create({
      data: {
        code: code.toUpperCase().trim(),
        name: name.trim(),
        departmentName: departmentName || 'Academic Faculty',
        durationYears: Number(durationYears) || 4,
      },
    });

    res.status(201).json({ success: true, course });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/semesters', async (_req: Request, res: Response) => {
  try {
    const semesters = await prisma.semester.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { number: 'asc' },
    });
    res.json({ success: true, semesters });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/departments', async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, departments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 4. STUDENT SECTION CLEARANCE QUEUE & CONDUCT VERIFICATION
// =========================================================================

/**
 * GET /api/student-section/clearance-queue
 */
router.get('/clearance-queue', async (_req: Request, res: Response) => {
  try {
    const requests = await prisma.clearanceRequest.findMany({
      where: {
        OR: [
          { currentStage: 'STUDENT_SECTION' },
          { approvals: { some: { departmentCode: 'STUDENT_SECTION' } } },
        ],
      },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            course: true,
            semester: true,
          },
        },
        approvals: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, count: requests.length, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/student-section/clearance-action
 * Authorize or reject student conduct clearance in the pipeline
 */
router.post('/clearance-action', async (req: Request, res: Response) => {
  try {
    const { requestId, action, remarks } = req.body;
    if (!requestId || !action) {
      return res.status(400).json({ success: false, error: 'Request ID and action are required.' });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be APPROVE or REJECT.' });
    }

    if (action === 'REJECT' && !remarks?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A detailed reason is required when rejecting conduct clearance.',
      });
    }

    const request = await prisma.clearanceRequest.findUnique({
      where: { id: requestId },
      include: { student: { include: { user: true } } },
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Clearance request not found.' });
    }

    if (request.currentStage !== 'STUDENT_SECTION' && req.user!.role !== Role.ADMIN) {
      return res.status(400).json({
        success: false,
        error: `Clearance request is currently at ${request.currentStage} stage, not Student Section stage.`,
      });
    }

    const updated = await WorkflowEngine.processDepartmentApproval({
      clearanceRequestId: requestId,
      departmentCode: 'STUDENT_SECTION',
      action: action as 'APPROVE' | 'REJECT',
      reviewerUserId: req.user!.id,
      reviewerRole: req.user!.role as Role,
      remarks: remarks || (action === 'APPROVE' ? 'Student Section conduct, enrollment status, and disciplinary records verified clear.' : undefined),
      ip: req.ip,
    });

    res.json({
      success: true,
      message: action === 'APPROVE' ? 'Student Section clearance approved.' : 'Clearance request rejected by Student Section.',
      request: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
