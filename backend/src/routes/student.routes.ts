import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { Role } from '../types/index.js';
import { WorkflowEngine } from '../services/workflowEngine.js';

const router = Router();

// Student-only endpoints
router.use(authenticate, requireRole(Role.STUDENT));

/**
 * GET /api/student/profile
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        course: true,
        semester: true,
        academicYear: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    res.json({ success: true, student });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/student/fee-details
 * Only displays permitted fee information. Students cannot edit.
 */
router.get('/fee-details', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student record not found.' });

    const feeRecord = await prisma.feeRecord.findFirst({
      where: {
        studentId: student.id,
        semesterId: student.semesterId,
        academicYearId: student.academicYearId,
      },
      include: {
        student: { include: { user: true } },
        semester: true,
        academicYear: true,
        verifiedByUser: { select: { fullName: true } },
        transactions: {
          orderBy: { paymentDate: 'desc' },
          include: { recordedByUser: { select: { fullName: true } } },
        },
        modificationLogs: {
          orderBy: { createdAt: 'desc' },
          include: { modifiedByUser: { select: { fullName: true } } },
        },
      },
    });

    res.json({
      success: true,
      feeRecord: feeRecord || {
        totalFee: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        paymentStatus: 'NOT_RECORDED',
        transactions: [],
        modificationLogs: [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/student/requests/submit
 * Submits a new no-dues clearance request
 */
router.post('/requests/submit', async (req: Request, res: Response) => {
  try {
    const { remarks } = req.body;
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }

    const request = await WorkflowEngine.submitRequest(
      student.id,
      student.semesterId,
      student.academicYearId,
      remarks,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Clearance request submitted successfully.',
      request,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/student/requests/:id/reapply/:departmentCode
 * Reapplies specifically to a rejected department without resetting other approvals
 */
router.post('/requests/:id/reapply/:departmentCode', async (req: Request, res: Response) => {
  try {
    const { id, departmentCode } = req.params;
    const studentResponse = req.body.studentResponse || req.body.remarks || req.body.studentRemarks || 'Submitted requested documentation and clarifications.';

    const updatedApproval = await WorkflowEngine.submitReapplication({
      clearanceRequestId: id,
      departmentCode: departmentCode as any,
      studentUserId: req.user!.id,
      studentResponse: studentResponse,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `Reapplication submitted specifically to ${departmentCode}. The department officer has been notified.`,
      approval: updatedApproval,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/student/requests
 * Returns all clearance requests submitted by the logged-in student (IDOR protected)
 */
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
    });

    if (!student) return res.status(404).json({ success: false, error: 'Student record not found.' });

    const requests = await prisma.clearanceRequest.findMany({
      where: { studentId: student.id },
      include: {
        semester: true,
        academicYear: true,
        approvals: {
          include: {
            reviewedByUser: { select: { fullName: true, role: true } },
            reapplicationRecords: { orderBy: { submittedAt: 'desc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
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

/**
 * GET /api/student/requests/:id
 * Detailed view with approval trail. IDOR protected: student can ONLY view their own request.
 */
router.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
    });

    const request = await prisma.clearanceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true } },
            course: true,
          },
        },
        semester: true,
        academicYear: true,
        approvals: {
          include: { reviewedByUser: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        examEligibility: true,
        certificate: true,
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found.' });
    }

    // IDOR Protection Check
    if (request.studentId !== student?.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You cannot view other students requests.' });
    }

    res.json({ success: true, request });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
