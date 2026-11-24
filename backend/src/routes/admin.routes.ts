import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { Role } from '../types/index.js';
import { AuditService } from '../services/auditService.js';
import { NotificationService } from '../services/notificationService.js';
import { mongoSyncService } from '../services/mongoSyncService.js';

const router = Router();

// Strict Admin-only endpoints
router.use(authenticate, requireRole(Role.ADMIN));

// =========================================================================
// 1. DASHBOARD OVERVIEW & ANALYTICS
// =========================================================================

/**
 * GET /api/admin/stats
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const totalStudents = await prisma.student.count();
    const totalFaculty = await prisma.faculty.count();
    const totalDepartments = await prisma.department.count();
    const totalUsers = await prisma.user.count();
    const totalRequests = await prisma.clearanceRequest.count();
    const approvedRequests = await prisma.clearanceRequest.count({
      where: { overallStatus: 'CERTIFICATE_ISSUED' },
    });
    const pendingRequests = await prisma.clearanceRequest.count({
      where: {
        overallStatus: {
          in: [
            'PENDING_ACCOUNT',
            'PENDING_STUDENT_SECTION',
            'PENDING_LIBRARY',
            'PENDING_IT',
            'PENDING_CLASS_COORDINATOR',
            'PENDING_EXAMINATION_CONTROLLER',
          ],
        },
      },
    });
    const rejectedRequests = await prisma.clearanceRequest.count({
      where: { overallStatus: 'REJECTED' },
    });
    const totalReapplications = await prisma.reapplicationRecord.count();
    const totalCertificates = await prisma.certificate.count({ where: { status: 'VALID' } });

    // Financial calculations
    const feeAggregate = await prisma.feeRecord.aggregate({
      _sum: {
        totalFee: true,
        paidAmount: true,
        outstandingBalance: true,
      },
    });

    const departmentBreakdown = {
      account: await prisma.clearanceRequest.count({ where: { currentStage: 'ACCOUNT' } }),
      studentSection: await prisma.clearanceRequest.count({ where: { currentStage: 'STUDENT_SECTION' } }),
      library: await prisma.clearanceRequest.count({ where: { currentStage: 'LIBRARY' } }),
      it: await prisma.clearanceRequest.count({ where: { currentStage: 'IT' } }),
      coordinator: await prisma.clearanceRequest.count({ where: { currentStage: 'CLASS_COORDINATOR' } }),
      examController: await prisma.clearanceRequest.count({ where: { currentStage: 'EXAM_CONTROLLER' } }),
    };

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalUsers,
        totalRequests,
        approvedRequests,
        pendingRequests,
        rejectedRequests,
        totalReapplications,
        totalCertificates,
        financial: {
          totalAssessed: feeAggregate._sum.totalFee || 0,
          totalCollected: feeAggregate._sum.paidAmount || 0,
          totalOutstanding: feeAggregate._sum.outstandingBalance || 0,
        },
        departmentBreakdown,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 2. STUDENT MANAGEMENT
// =========================================================================

/**
 * GET /api/admin/students
 * View all registered students with search, filters & pagination
 */
router.get('/students', async (req: Request, res: Response) => {
  try {
    const { search, courseId, semesterId, departmentId, status } = req.query;
    const where: any = {};

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { studentId: { contains: q } },
        { enrollmentNo: { contains: q } },
        { admissionNumber: { contains: q } },
        { user: { fullName: { contains: q } } },
        { user: { email: { contains: q } } },
        { course: { name: { contains: q } } },
      ];
    }

    if (courseId) where.courseId = String(courseId);
    if (semesterId) where.semesterId = String(semesterId);
    if (departmentId) where.departmentId = String(departmentId);
    if (status) where.enrollmentStatus = String(status);

    const students = await prisma.student.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, isActive: true, createdAt: true } },
        course: true,
        semester: true,
        academicYear: true,
        department: true,
        feeRecords: { select: { id: true, totalFee: true, paidAmount: true, outstandingBalance: true, paymentStatus: true } },
        requests: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { id: true, requestId: true, overallStatus: true, currentStage: true },
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
 * GET /api/admin/students/:id
 * Individual student profile with fee, clearance, and history details
 */
router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        course: true,
        semester: true,
        academicYear: true,
        department: true,
        feeRecords: {
          include: {
            transactions: { orderBy: { paymentDate: 'desc' } },
            modificationLogs: { orderBy: { createdAt: 'desc' } },
          },
        },
        requests: {
          include: {
            approvals: { include: { reapplicationRecords: true } },
            certificate: true,
            examEligibility: true,
          },
        },
      },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    // Fetch student's audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [{ entityId: student.id }, { userId: student.userId }],
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    res.json({ success: true, student, auditLogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/students
 * Add new student: Personal, Academic, and Login details
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
      enrollmentNo,
      admissionNumber,
      courseId,
      departmentId,
      semesterId,
      academicYearId,
      admissionDate,
      enrollmentStatus = 'ACTIVE',
      section = 'A',
      batchYear = '2024-2028',
      initialTotalFee = 10000,
      initialPaidAmount = 0,
      // Login
      password,
    } = req.body;

    if (!fullName || !email || !studentId) {
      return res.status(400).json({ success: false, error: 'Full name, email, and registration number are mandatory.' });
    }

    // Uniqueness validation
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user account with this email address already exists.' });
    }

    const existingStudentId = await prisma.student.findUnique({ where: { studentId: studentId.trim() } });
    if (existingStudentId) {
      return res.status(400).json({ success: false, error: 'A student with this Registration Number already exists.' });
    }

    const countStudents = await prisma.student.count();
    const genRollNo = enrollmentNo?.trim() || `EN2026${(98130 + countStudents).toString()}`;
    const genAdmNo = admissionNumber?.trim() || `ADM-2026-${(1050 + countStudents).toString()}`;

    // Resolve course, semester, academic year
    let course = courseId ? await prisma.course.findUnique({ where: { id: courseId } }) : await prisma.course.findFirst();
    let semester = semesterId ? await prisma.semester.findUnique({ where: { id: semesterId } }) : await prisma.semester.findFirst();
    let academicYear = academicYearId ? await prisma.academicYear.findUnique({ where: { id: academicYearId } }) : await prisma.academicYear.findFirst({ where: { isCurrent: true } });

    if (!course || !semester || !academicYear) {
      return res.status(400).json({ success: false, error: 'Academic course, semester, or academic session not found in database.' });
    }

    const passwordHash = await bcrypt.hash(password || 'Password123!', 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User Account
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          fullName: fullName.trim(),
          role: Role.STUDENT,
          phone: phone || null,
          avatarUrl: photoUrl || null,
          departmentId: departmentId || null,
          isActive: true,
        },
      });

      // 2. Create Student Profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId: studentId.trim(),
          enrollmentNo: genRollNo,
          admissionNumber: genAdmNo,
          fatherName: fatherName || null,
          motherName: motherName || null,
          dob: dob || null,
          gender: gender || 'Not Specified',
          address: address || null,
          photoUrl: photoUrl || null,
          admissionDate: admissionDate || new Date().toISOString().split('T')[0],
          enrollmentStatus,
          courseId: course.id,
          departmentId: departmentId || null,
          semesterId: semester.id,
          academicYearId: academicYear.id,
          section,
          batchYear,
        },
        include: { user: true, course: true, semester: true, academicYear: true },
      });

      // 3. Create Initial Fee Record
      const totalFee = Number(initialTotalFee) || 10000;
      const paidAmount = Number(initialPaidAmount) || 0;
      const balance = Math.max(0, totalFee - paidAmount);
      const pStatus = balance === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

      await tx.feeRecord.create({
        data: {
          studentId: student.id,
          semesterId: semester.id,
          academicYearId: academicYear.id,
          totalFee,
          paidAmount,
          outstandingBalance: balance,
          paymentStatus: pStatus,
          remarks: 'Initial fee assessed upon student admission',
          verifiedByUserId: req.user!.id,
          verifiedAt: new Date(),
        },
      });

      return student;
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_CREATE_STUDENT',
      entityType: 'Student',
      entityId: result.id,
      ipAddress: req.ip,
      details: `Admin created student ${result.studentId} (${result.user.fullName}) and generated individual login account ${result.user.email}`,
    });

    res.status(201).json({ success: true, student: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/students/:id
 * Edit existing student details
 */
router.put('/students/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    const {
      fullName,
      fatherName,
      motherName,
      dob,
      gender,
      phone,
      address,
      photoUrl,
      enrollmentStatus,
      courseId,
      departmentId,
      semesterId,
      section,
      batchYear,
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      // Update User details
      if (fullName || phone || photoUrl) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            fullName: fullName || student.user.fullName,
            phone: phone !== undefined ? phone : student.user.phone,
            avatarUrl: photoUrl !== undefined ? photoUrl : student.user.avatarUrl,
            departmentId: departmentId !== undefined ? departmentId : student.user.departmentId,
          },
        });
      }

      // Update Student details
      return tx.student.update({
        where: { id: student.id },
        data: {
          fatherName: fatherName !== undefined ? fatherName : student.fatherName,
          motherName: motherName !== undefined ? motherName : student.motherName,
          dob: dob !== undefined ? dob : student.dob,
          gender: gender !== undefined ? gender : student.gender,
          address: address !== undefined ? address : student.address,
          photoUrl: photoUrl !== undefined ? photoUrl : student.photoUrl,
          enrollmentStatus: enrollmentStatus !== undefined ? enrollmentStatus : student.enrollmentStatus,
          courseId: courseId || student.courseId,
          departmentId: departmentId !== undefined ? departmentId : student.departmentId,
          semesterId: semesterId || student.semesterId,
          section: section !== undefined ? section : student.section,
          batchYear: batchYear !== undefined ? batchYear : student.batchYear,
        },
        include: { user: true, course: true, semester: true, department: true },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_UPDATE_STUDENT',
      entityType: 'Student',
      entityId: student.id,
      ipAddress: req.ip,
      details: `Admin updated student records for ${student.studentId}`,
    });

    res.json({ success: true, student: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/students/:id
 * Delete student record and corresponding user account with confirmation
 */
router.delete('/students/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    // Cascade delete via user account deletion
    await prisma.user.delete({ where: { id: student.userId } });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_DELETE_STUDENT',
      entityType: 'Student',
      entityId: student.id,
      ipAddress: req.ip,
      details: `Admin deleted student ${student.studentId} (${student.user.fullName}) and login ${student.user.email}`,
    });

    res.json({ success: true, message: `Student ${student.studentId} deleted permanently.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/students/:id/toggle-status
 * Activate or deactivate student account
 */
router.post('/students/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    const newStatus = !student.user.isActive;
    await prisma.user.update({
      where: { id: student.userId },
      data: { isActive: newStatus },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: newStatus ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
      entityType: 'User',
      entityId: student.userId,
      ipAddress: req.ip,
      details: `Admin ${newStatus ? 'activated' : 'deactivated'} student account ${student.user.email}`,
    });

    res.json({ success: true, isActive: newStatus });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/students/:id/reset-password
 * Reset student password securely
 */
router.post('/students/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockoutUntil: null },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_RESET_STUDENT_PASSWORD',
      entityType: 'User',
      entityId: student.userId,
      ipAddress: req.ip,
      details: `Admin reset password for student ${student.studentId} (${student.user.email})`,
    });

    res.json({ success: true, message: `Password reset successfully for student ${student.user.fullName}.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 3. FACULTY MANAGEMENT
// =========================================================================

/**
 * GET /api/admin/faculty
 * List all faculty members with search & filters
 */
router.get('/faculty', async (req: Request, res: Response) => {
  try {
    const { search, departmentId, status } = req.query;
    const where: any = {};

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { employeeId: { contains: q } },
        { designation: { contains: q } },
        { specialization: { contains: q } },
        { user: { fullName: { contains: q } } },
        { user: { email: { contains: q } } },
      ];
    }

    if (departmentId) where.departmentId = String(departmentId);
    if (status) where.employmentStatus = String(status);

    const faculty = await prisma.faculty.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true } },
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: faculty.length, faculty });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/faculty
 * Add new faculty member & create faculty account
 */
router.post('/faculty', async (req: Request, res: Response) => {
  try {
    const {
      // Personal
      fullName,
      fatherName,
      dob,
      gender,
      phone,
      email,
      address,
      photoUrl,
      // Professional
      employeeId,
      departmentId,
      designation = 'Assistant Professor',
      specialization,
      assignedCourses,
      assignedClasses,
      joiningDate,
      employmentStatus = 'ACTIVE',
      // Login
      password,
      role = 'CLASS_COORDINATOR',
    } = req.body;

    if (!fullName || !email || !employeeId) {
      return res.status(400).json({ success: false, error: 'Full name, email, and employee ID are mandatory.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user account with this email address already exists.' });
    }

    const existingEmp = await prisma.faculty.findUnique({ where: { employeeId: employeeId.trim() } });
    if (existingEmp) {
      return res.status(400).json({ success: false, error: 'A faculty member with this Employee ID already exists.' });
    }

    const passwordHash = await bcrypt.hash(password || 'Password123!', 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          fullName: fullName.trim(),
          role: role || 'CLASS_COORDINATOR',
          phone: phone || null,
          avatarUrl: photoUrl || null,
          departmentId: departmentId || null,
          isActive: true,
        },
      });

      // Create Faculty
      const faculty = await tx.faculty.create({
        data: {
          userId: user.id,
          employeeId: employeeId.trim(),
          fatherName: fatherName || null,
          dob: dob || null,
          gender: gender || 'Not Specified',
          address: address || null,
          photoUrl: photoUrl || null,
          departmentId: departmentId || null,
          designation,
          specialization: specialization || null,
          assignedCourses: assignedCourses || null,
          assignedClasses: assignedClasses || null,
          joiningDate: joiningDate || new Date().toISOString().split('T')[0],
          employmentStatus,
        },
        include: { user: true, department: true },
      });

      return faculty;
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_CREATE_FACULTY',
      entityType: 'Faculty',
      entityId: result.id,
      ipAddress: req.ip,
      details: `Admin added faculty member ${result.employeeId} (${result.user.fullName}) with role ${result.user.role}`,
    });

    res.status(201).json({ success: true, faculty: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/faculty/:id
 * Edit faculty details
 */
router.put('/faculty/:id', async (req: Request, res: Response) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!faculty) return res.status(404).json({ success: false, error: 'Faculty member not found.' });

    const {
      fullName,
      phone,
      photoUrl,
      fatherName,
      dob,
      gender,
      address,
      departmentId,
      designation,
      specialization,
      assignedCourses,
      assignedClasses,
      joiningDate,
      employmentStatus,
      role,
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      // Update User
      if (fullName || phone || photoUrl || role || departmentId) {
        await tx.user.update({
          where: { id: faculty.userId },
          data: {
            fullName: fullName || faculty.user.fullName,
            phone: phone !== undefined ? phone : faculty.user.phone,
            avatarUrl: photoUrl !== undefined ? photoUrl : faculty.user.avatarUrl,
            departmentId: departmentId !== undefined ? departmentId : faculty.user.departmentId,
            role: role || faculty.user.role,
          },
        });
      }

      // Update Faculty
      return tx.faculty.update({
        where: { id: faculty.id },
        data: {
          fatherName: fatherName !== undefined ? fatherName : faculty.fatherName,
          dob: dob !== undefined ? dob : faculty.dob,
          gender: gender !== undefined ? gender : faculty.gender,
          address: address !== undefined ? address : faculty.address,
          photoUrl: photoUrl !== undefined ? photoUrl : faculty.photoUrl,
          departmentId: departmentId !== undefined ? departmentId : faculty.departmentId,
          designation: designation || faculty.designation,
          specialization: specialization !== undefined ? specialization : faculty.specialization,
          assignedCourses: assignedCourses !== undefined ? assignedCourses : faculty.assignedCourses,
          assignedClasses: assignedClasses !== undefined ? assignedClasses : faculty.assignedClasses,
          joiningDate: joiningDate || faculty.joiningDate,
          employmentStatus: employmentStatus || faculty.employmentStatus,
        },
        include: { user: true, department: true },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_UPDATE_FACULTY',
      entityType: 'Faculty',
      entityId: faculty.id,
      ipAddress: req.ip,
      details: `Admin updated faculty record for ${faculty.employeeId}`,
    });

    res.json({ success: true, faculty: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/faculty/:id
 * Delete faculty record and associated user account with confirmation
 */
router.delete('/faculty/:id', async (req: Request, res: Response) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!faculty) return res.status(404).json({ success: false, error: 'Faculty member not found.' });

    await prisma.user.delete({ where: { id: faculty.userId } });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_DELETE_FACULTY',
      entityType: 'Faculty',
      entityId: faculty.id,
      ipAddress: req.ip,
      details: `Admin deleted faculty member ${faculty.employeeId} (${faculty.user.fullName})`,
    });

    res.json({ success: true, message: `Faculty member ${faculty.employeeId} deleted.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/faculty/:id/toggle-status
 */
router.post('/faculty/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!faculty) return res.status(404).json({ success: false, error: 'Faculty not found.' });

    const newStatus = !faculty.user.isActive;
    await prisma.user.update({
      where: { id: faculty.userId },
      data: { isActive: newStatus },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: newStatus ? 'ACTIVATE_FACULTY' : 'DEACTIVATE_FACULTY',
      entityType: 'User',
      entityId: faculty.userId,
      ipAddress: req.ip,
      details: `Admin ${newStatus ? 'activated' : 'deactivated'} faculty account ${faculty.user.email}`,
    });

    res.json({ success: true, isActive: newStatus });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/faculty/:id/reset-password
 */
router.post('/faculty/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!faculty) return res.status(404).json({ success: false, error: 'Faculty not found.' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: faculty.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockoutUntil: null },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_RESET_FACULTY_PASSWORD',
      entityType: 'User',
      entityId: faculty.userId,
      ipAddress: req.ip,
      details: `Admin reset password for faculty member ${faculty.employeeId} (${faculty.user.email})`,
    });

    res.json({ success: true, message: `Password reset successfully for ${faculty.user.fullName}.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 4. DEPARTMENT MANAGEMENT
// =========================================================================

/**
 * GET /api/admin/departments
 * List all departments with student & faculty counts
 */
router.get('/departments', async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        headUser: { select: { id: true, fullName: true, email: true, role: true } },
        _count: {
          select: {
            faculty: true,
            students: true,
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, count: departments.length, departments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/departments/:id
 * Individual department view with student & faculty rosters
 */
router.get('/departments/:id', async (req: Request, res: Response) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: {
        headUser: { select: { id: true, fullName: true, email: true, role: true, phone: true } },
        faculty: {
          include: {
            user: { select: { fullName: true, email: true, phone: true, isActive: true } },
          },
        },
        students: {
          include: {
            user: { select: { fullName: true, email: true, isActive: true } },
            course: true,
            semester: true,
          },
          take: 50,
        },
        users: {
          select: { id: true, fullName: true, email: true, role: true, isActive: true },
        },
      },
    });

    if (!department) return res.status(404).json({ success: false, error: 'Department not found.' });

    res.json({ success: true, department });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/departments
 * Add new department
 */
router.post('/departments', async (req: Request, res: Response) => {
  try {
    const { code, name, type = 'ACADEMIC', description, headUserId, permissions } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'Department code and name are required.' });
    }

    const existing = await prisma.department.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Department with this code already exists.' });
    }

    const department = await prisma.department.create({
      data: {
        code: code.toUpperCase().trim(),
        name: name.trim(),
        type,
        description: description || null,
        headUserId: headUserId || null,
        permissions: permissions ? (typeof permissions === 'string' ? permissions : JSON.stringify(permissions)) : null,
      },
      include: { headUser: true },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      ipAddress: req.ip,
      details: `Admin created department ${department.name} (${department.code})`,
    });

    res.status(201).json({ success: true, department });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/departments/:id
 * Edit department details
 */
router.put('/departments/:id', async (req: Request, res: Response) => {
  try {
    const { name, type, description, headUserId, permissions, isActive } = req.body;

    const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Department not found.' });

    const updated = await prisma.department.update({
      where: { id: req.params.id },
      data: {
        name: name || existing.name,
        type: type || existing.type,
        description: description !== undefined ? description : existing.description,
        headUserId: headUserId !== undefined ? headUserId : existing.headUserId,
        permissions: permissions ? (typeof permissions === 'string' ? permissions : JSON.stringify(permissions)) : existing.permissions,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: { headUser: true },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: updated.id,
      ipAddress: req.ip,
      details: `Admin updated department ${updated.name}`,
    });

    res.json({ success: true, department: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/departments/:id
 * Delete department when no longer in use
 */
router.delete('/departments/:id', async (req: Request, res: Response) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { students: true, faculty: true } } },
    });

    if (!department) return res.status(404).json({ success: false, error: 'Department not found.' });

    if (department._count.students > 0 || department._count.faculty > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete department: It currently has ${department._count.students} students and ${department._count.faculty} faculty assigned. Please reassign them first.`,
      });
    }

    await prisma.department.delete({ where: { id: req.params.id } });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      ipAddress: req.ip,
      details: `Admin deleted department ${department.name} (${department.code})`,
    });

    res.json({ success: true, message: `Department ${department.name} deleted successfully.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 5. USER AND ROLE MANAGEMENT
// =========================================================================

/**
 * GET /api/admin/users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { role, departmentId, search } = req.query;
    const where: any = {};

    if (role) where.role = String(role);
    if (departmentId) where.departmentId = String(departmentId);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        department: true,
        studentProfile: { include: { course: true, semester: true } },
        facultyProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: users.length, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Assign and modify user roles
 */
router.put('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { role, departmentCode, departmentId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        role,
        departmentCode: departmentCode || user.departmentCode,
        departmentId: departmentId !== undefined ? departmentId : user.departmentId,
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_UPDATE_USER_ROLE',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      details: `Admin changed role of ${user.email} from ${user.role} to ${role}`,
    });

    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/toggle-active
 */
router.post('/users/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const newActive = !user.isActive;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: newActive },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: newActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      details: `Admin ${newActive ? 'activated' : 'deactivated'} user account ${user.email}`,
    });

    res.json({ success: true, isActive: newActive });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 6. CLEARANCE & REAPPLICATION MANAGEMENT
// =========================================================================

/**
 * GET /api/admin/clearance/all
 * View all clearance requests across all stages and departments
 */
router.get('/clearance/all', async (req: Request, res: Response) => {
  try {
    const { status, stage, search } = req.query;
    const where: any = {};

    if (status) where.overallStatus = String(status);
    if (stage) where.currentStage = String(stage);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { requestId: { contains: q } },
        { student: { studentId: { contains: q } } },
        { student: { user: { fullName: { contains: q } } } },
      ];
    }

    const requests = await prisma.clearanceRequest.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true } },
            course: true,
            semester: true,
            feeRecords: true,
          },
        },
        approvals: {
          include: {
            reviewedByUser: { select: { fullName: true, role: true } },
            reapplicationRecords: true,
          },
        },
        certificate: true,
        examEligibility: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, count: requests.length, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/clearance/reapplications
 * Monitor rejected applications & department-specific reapplications
 */
router.get('/clearance/reapplications', async (_req: Request, res: Response) => {
  try {
    const reapplications = await prisma.reapplicationRecord.findMany({
      include: {
        approval: {
          include: {
            clearanceRequest: {
              include: {
                student: { include: { user: true, course: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, count: reapplications.length, reapplications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 7. BROADCAST NOTIFICATIONS
// =========================================================================

/**
 * POST /api/admin/notifications/broadcast
 * Broadcast official alerts & notifications to roles or departments
 */
router.post('/notifications/broadcast', async (req: Request, res: Response) => {
  try {
    const { targetRole, title, message, type = 'INFO', linkUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required.' });
    }

    const where: any = { isActive: true };
    if (targetRole && targetRole !== 'ALL') {
      where.role = targetRole;
    }

    const targetUsers = await prisma.user.findMany({ where, select: { id: true } });

    await prisma.$transaction(
      targetUsers.map((u) =>
        prisma.notification.create({
          data: {
            userId: u.id,
            title,
            message,
            type,
            linkUrl: linkUrl || null,
          },
        })
      )
    );

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ADMIN_BROADCAST_NOTIFICATION',
      entityType: 'Notification',
      ipAddress: req.ip,
      details: `Admin dispatched broadcast notification to ${targetUsers.length} users (${targetRole || 'ALL'})`,
    });

    res.json({ success: true, count: targetUsers.length, message: `Notification broadcasted to ${targetUsers.length} users.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 8. SYSTEM SETTINGS & METADATA
// =========================================================================

/**
 * GET /api/admin/academic-meta
 */
router.get('/academic-meta', async (_req: Request, res: Response) => {
  try {
    const [courses, semesters, academicYears, departments] = await Promise.all([
      prisma.course.findMany({ orderBy: { code: 'asc' } }),
      prisma.semester.findMany({ orderBy: { number: 'asc' } }),
      prisma.academicYear.findMany({ orderBy: { yearString: 'desc' } }),
      prisma.department.findMany({ orderBy: { name: 'asc' } }),
    ]);

    res.json({ success: true, courses, semesters, academicYears, departments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/settings/course
 */
router.post('/settings/course', async (req: Request, res: Response) => {
  try {
    const { code, name, departmentName, durationYears = 4 } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, error: 'Code and name required.' });

    const course = await prisma.course.create({
      data: {
        code: code.toUpperCase().trim(),
        name: name.trim(),
        departmentName: departmentName || 'Academic Division',
        durationYears: Number(durationYears),
      },
    });

    res.status(201).json({ success: true, course });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/settings/academic-year
 */
router.post('/settings/academic-year', async (req: Request, res: Response) => {
  try {
    const { yearString, isCurrent = false } = req.body;
    if (!yearString) return res.status(400).json({ success: false, error: 'Year string required.' });

    if (isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }

    const ay = await prisma.academicYear.create({
      data: { yearString: yearString.trim(), isCurrent: Boolean(isCurrent) },
    });

    res.status(201).json({ success: true, academicYear: ay });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 9. AUDIT LOGS, SECURITY & REPORTS
// =========================================================================

/**
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { action, limit = 100 } = req.query;
    const where: any = {};
    if (action) where.action = { contains: String(action) };

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
    });

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/security-events
 */
router.get('/security-events', async (req: Request, res: Response) => {
  try {
    const { severity } = req.query;
    const where: any = {};
    if (severity) where.severity = String(severity);

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/reports
 */
router.get('/reports', async (_req: Request, res: Response) => {
  try {
    const requests = await prisma.clearanceRequest.findMany({
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true } },
            course: true,
            semester: true,
            academicYear: true,
          },
        },
        approvals: true,
        examEligibility: true,
        certificate: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 15. MONGODB REAL-TIME SYNC & RECORD REPLICATION
// =========================================================================

/**
 * GET /api/admin/mongodb/status
 * Check MongoDB live connection status, synced record count, collection counts & durable queue stats
 */
router.get('/mongodb/status', async (_req: Request, res: Response) => {
  try {
    const status = await mongoSyncService.getStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/mongodb/test-connection
 * Test connection to a MongoDB Atlas cluster without altering active connection state
 */
router.post('/mongodb/test-connection', async (req: Request, res: Response) => {
  try {
    const { uri } = req.body;
    const result = await mongoSyncService.testConnection(uri);
    res.json({ success: result.reachable, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/mongodb/connect
 * Connect or update MongoDB Atlas connection URI and trigger initial sync
 */
router.post('/mongodb/connect', async (req: Request, res: Response) => {
  try {
    const { uri } = req.body;
    if (!uri || typeof uri !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid MongoDB URI string is required.' });
    }

    const validation = (mongoSyncService.constructor as any).validateUri(uri);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const connected = await mongoSyncService.connect(uri);
    if (!connected) {
      const status = await mongoSyncService.getStatus();
      return res.status(400).json({
        success: false,
        error: status.lastError || 'Failed to connect to MongoDB cluster.',
        maskedUri: status.maskedUri,
      });
    }

    // After connecting, trigger initial mirror of all 19 models
    const syncResult = await mongoSyncService.syncAllRecords(prisma);

    res.json({
      success: true,
      message: 'MongoDB Atlas connected and all 19 collections synchronized!',
      maskedUri: (mongoSyncService.constructor as any).maskUri(uri),
      syncResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/mongodb/disconnect
 * Disconnect from MongoDB Atlas and enter standby mode
 */
router.post('/mongodb/disconnect', async (_req: Request, res: Response) => {
  try {
    await mongoSyncService.disconnect();
    res.json({
      success: true,
      message: 'Disconnected from MongoDB Atlas. System in STANDBY mode.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/mongodb/sync-all
 * Force a full synchronization of all 19 database models into MongoDB
 */
router.post('/mongodb/sync-all', async (_req: Request, res: Response) => {
  try {
    const result = await mongoSyncService.syncAllRecords(prisma);
    if (!result.success && result.totalSynced === 0) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      message: `Synchronized ${result.totalSynced} records across collections to MongoDB Atlas!`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/mongodb/retry-failed
 * Retry pending and failed jobs from the durable database queue
 */
router.post('/mongodb/retry-failed', async (_req: Request, res: Response) => {
  try {
    const result = await mongoSyncService.processDurableQueue();
    res.json({
      success: true,
      message: `Processed ${result.processed} pending operations (${result.failed} failed).`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/mongodb/change-history
 * Retrieve immutable audit change history records
 */
router.get('/mongodb/change-history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const model = req.query.model as string | undefined;
    const action = req.query.action as string | undefined;

    const history = await mongoSyncService.getChangeHistory(limit, model, action);
    res.json({ success: true, count: history.length, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
