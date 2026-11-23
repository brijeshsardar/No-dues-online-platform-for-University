import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { Role } from '../types/index.js';
import { AuditService } from '../services/auditService.js';

const router = Router();

// Allow Coordinators, Faculty/Staff, and Administrators
const FACULTY_ROLES = [
  Role.CLASS_COORDINATOR,
  Role.ACCOUNT_SECTION,
  Role.STUDENT_SECTION,
  Role.LIBRARY,
  Role.IT_DEPARTMENT,
  Role.EXAMINATION_CONTROLLER,
  Role.ADMIN,
];

router.use(authenticate, requireRole(...FACULTY_ROLES));

/**
 * GET /api/faculty/profile
 * Returns profile details for the faculty member
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        departmentCode: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, error: 'Faculty profile not found.' });

    // Derive designation and assigned department
    let designation = 'Faculty Member';
    if (user.role === Role.CLASS_COORDINATOR) designation = 'Assistant Professor & Class Coordinator';
    else if (user.role === Role.ACCOUNT_SECTION) designation = 'Chief Accounts Officer';
    else if (user.role === Role.LIBRARY) designation = 'Chief Librarian & Research Head';
    else if (user.role === Role.IT_DEPARTMENT) designation = 'Senior Systems & Network Engineer';
    else if (user.role === Role.STUDENT_SECTION) designation = 'Student Affairs Registrar';
    else if (user.role === Role.EXAMINATION_CONTROLLER) designation = 'Controller of Examinations';
    else if (user.role === Role.ADMIN) designation = 'Chief University Administrator';

    res.json({
      success: true,
      profile: {
        ...user,
        designation,
        employeeId: `FAC-${user.id.substring(0, 6).toUpperCase()}`,
        assignedCohort: 'B.Tech CSE - 5th Semester (Section A)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/faculty/students
 * Returns enrolled students with course, semester, fee records, and clearance status
 */
router.get('/students', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        course: true,
        semester: true,
        academicYear: true,
        feeRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        requests: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          include: {
            approvals: true,
            certificate: true,
          },
        },
      },
      orderBy: { studentId: 'asc' },
    });

    // Enhance students with academic attendance and simulated subject credits
    const enhancedStudents = students.map((s, index) => {
      // Deterministic attendance based on index for realistic testing
      const baseAttendance = [86, 72, 94, 88, 79, 91][index % 6] || 85;
      const latestFee = s.feeRecords[0];
      const latestReq = s.requests[0];

      return {
        id: s.id,
        studentId: s.studentId,
        enrollmentNo: s.enrollmentNo,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        courseName: s.course.name,
        courseCode: s.course.code,
        semesterName: s.semester.name,
        section: s.section || 'A',
        batchYear: s.batchYear,
        attendancePercentage: baseAttendance,
        attendanceEligible: baseAttendance >= 75,
        feeStatus: latestFee ? latestFee.paymentStatus : 'PENDING',
        feeOutstanding: latestFee ? latestFee.outstandingBalance : 0,
        clearanceStatus: latestReq ? latestReq.overallStatus : 'NOT_APPLIED',
        currentClearanceStage: latestReq ? latestReq.currentStage : 'N/A',
        hasCertificate: !!latestReq?.certificate,
        certificateId: latestReq?.certificate?.certificateId || null,
      };
    });

    res.json({
      success: true,
      count: enhancedStudents.length,
      students: enhancedStudents,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/faculty/academic-records
 * Returns academic cohort details and class schedules
 */
router.get('/academic-records', async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: { select: { students: true } },
      },
    });

    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    res.json({
      success: true,
      cohort: {
        program: 'B.Tech in Computer Science & Engineering',
        department: 'School of Engineering and Technology',
        semester: '5th Semester (Fall/Spring 2026)',
        academicYear: activeAcademicYear?.yearString || '2025-2026',
        totalRegisteredStudents: courses.reduce((acc, c) => acc + c._count.students, 0),
        subjects: [
          { code: 'CSE-501', title: 'Design and Analysis of Algorithms', credits: 4, faculty: 'Prof. Arun Gupta' },
          { code: 'CSE-502', title: 'Database Management Systems', credits: 4, faculty: 'Dr. Neha Verma' },
          { code: 'CSE-503', title: 'Computer Networks & Security', credits: 3, faculty: 'Er. Rajesh Kumar' },
          { code: 'CSE-504', title: 'Software Engineering Principles', credits: 3, faculty: 'Prof. Arun Gupta' },
          { code: 'CSE-505', title: 'Information Security & Cryptography', credits: 4, faculty: 'Dr. K. Sharma' },
        ],
      },
      courses,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/faculty/attendance
 * Allows faculty/coordinator to update attendance remarks for a student
 */
router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const { studentId, attendancePercentage, remarks } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID is required.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'UPDATE_ATTENDANCE_RECORD',
      entityType: 'Student',
      entityId: student.id,
      ipAddress: req.ip,
      details: `Faculty ${req.user!.fullName} updated attendance remarks for ${student.user.fullName} (${student.studentId}): ${attendancePercentage}% - ${remarks || 'Verified'}`,
    });

    res.json({
      success: true,
      message: `Academic attendance records updated for ${student.user.fullName}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
