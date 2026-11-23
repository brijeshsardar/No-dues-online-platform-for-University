import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole, requireMfaVerified } from '../middleware/auth.js';
import { Role } from '../types/index.js';
import { WorkflowEngine, WorkflowStage } from '../services/workflowEngine.js';

const router = Router();

// Staff departments permitted to access clearance queues
const DEPARTMENT_ROLES = [
  Role.ACCOUNT_SECTION,
  Role.STUDENT_SECTION,
  Role.LIBRARY,
  Role.IT_DEPARTMENT,
  Role.CLASS_COORDINATOR,
  Role.ADMIN,
];

router.use(authenticate, requireRole(...DEPARTMENT_ROLES));

/**
 * Helper to determine which department stage corresponds to user role
 */
function getRoleStage(role: Role): WorkflowStage | null {
  switch (role) {
    case Role.ACCOUNT_SECTION: return 'ACCOUNT';
    case Role.STUDENT_SECTION: return 'STUDENT_SECTION';
    case Role.LIBRARY: return 'LIBRARY';
    case Role.IT_DEPARTMENT: return 'IT';
    case Role.CLASS_COORDINATOR: return 'CLASS_COORDINATOR';
    default: return null;
  }
}

/**
 * GET /api/clearance/assigned
 * Returns requests currently awaiting action by the caller's department
 */
router.get('/assigned', async (req: Request, res: Response) => {
  try {
    const userRole = req.user!.role as Role;
    const stage = getRoleStage(userRole);

    let whereClause: any = {};
    if (userRole === Role.ADMIN) {
      // Admin can see all
      whereClause = {};
    } else if (stage) {
      whereClause = {
        OR: [
          { currentStage: stage },
          {
            approvals: {
              some: {
                departmentCode: stage,
                status: { in: ['PENDING', 'REAPPLICATION_SUBMITTED'] },
              },
            },
          },
        ],
      };
    }

    const requests = await prisma.clearanceRequest.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            course: true,
            semester: true,
            feeRecords: {
              include: {
                transactions: { orderBy: { paymentDate: 'desc' } },
              },
            },
          },
        },
        semester: true,
        academicYear: true,
        approvals: {
          include: {
            reviewedByUser: { select: { fullName: true, role: true } },
            reapplicationRecords: { orderBy: { submittedAt: 'desc' } },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    res.json({ success: true, count: requests.length, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/clearance/:id
 * Retrieve full dossier of a clearance request
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const request = await prisma.clearanceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            course: true,
            semester: true,
            academicYear: true,
            feeRecords: {
              include: { verifiedByUser: { select: { fullName: true } } },
            },
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
      return res.status(404).json({ success: false, error: 'Clearance request not found.' });
    }

    res.json({ success: true, request });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/clearance/:id/approve
 * Performs department approval with workflow enforcement and digital signing
 */
router.post('/:id/approve', requireMfaVerified, async (req: Request, res: Response) => {
  try {
    const { departmentCode, remarks, verificationDetails } = req.body;
    const userRole = req.user!.role as Role;

    // Use department code passed or deduce from user role
    const stage = (departmentCode || getRoleStage(userRole)) as WorkflowStage;
    if (!stage) {
      return res.status(400).json({ success: false, error: 'Invalid department clearance stage.' });
    }

    const updated = await WorkflowEngine.processDepartmentApproval({
      clearanceRequestId: req.params.id,
      departmentCode: stage,
      action: 'APPROVE',
      reviewerUserId: req.user!.id,
      reviewerRole: userRole,
      remarks,
      verificationDetails,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `Successfully approved clearance for ${stage}.`,
      request: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/clearance/:id/return
 * Returns request to student or previous department with mandatory clarification reason
 */
router.post('/:id/return', async (req: Request, res: Response) => {
  try {
    const { remarks, departmentCode } = req.body;
    if (!remarks || remarks.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Mandatory return remark / clarification reason is required.' });
    }

    const userRole = req.user!.role as Role;
    const stage = (departmentCode || getRoleStage(userRole)) as WorkflowStage;

    const updated = await WorkflowEngine.processDepartmentApproval({
      clearanceRequestId: req.params.id,
      departmentCode: stage,
      action: 'RETURN',
      reviewerUserId: req.user!.id,
      reviewerRole: userRole,
      remarks,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `Request returned by ${stage} with clarification note.`,
      request: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/clearance/:id/reject
 * Rejects clearance request with mandatory reason
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { reason, departmentCode } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    }

    const userRole = req.user!.role as Role;
    const stage = (departmentCode || getRoleStage(userRole)) as WorkflowStage;

    const updated = await WorkflowEngine.processDepartmentApproval({
      clearanceRequestId: req.params.id,
      departmentCode: stage,
      action: 'REJECT',
      reviewerUserId: req.user!.id,
      reviewerRole: userRole,
      remarks: reason,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `Request rejected by ${stage}.`,
      request: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/clearance/:id/reopen
 * Resets / re-opens an accidentally rejected request back to active review
 */
router.post('/:id/reopen', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const justification = reason || 'Accidental rejection corrected by staff';

    const request = await prisma.clearanceRequest.findUnique({
      where: { id: req.params.id },
      include: { approvals: true, student: true },
    });

    if (!request) return res.status(404).json({ success: false, error: 'Request not found' });
    if (request.overallStatus !== 'REJECTED') {
      return res.status(400).json({ success: false, error: 'Only rejected requests can be re-opened.' });
    }

    // Determine which department was the rejected stage
    const rejectedApproval = request.approvals.find((a) => a.status === 'REJECTED');
    const stageToRestore = rejectedApproval?.departmentCode || request.currentStage || 'ACCOUNT';

    const statusMap: Record<string, string> = {
      ACCOUNT: 'PENDING_ACCOUNT',
      STUDENT_SECTION: 'PENDING_STUDENT_SECTION',
      LIBRARY: 'PENDING_LIBRARY',
      IT: 'PENDING_IT',
      CLASS_COORDINATOR: 'PENDING_CLASS_COORDINATOR',
      EXAM_CONTROLLER: 'PENDING_EXAMINATION_CONTROLLER',
    };
    const newStatus = statusMap[stageToRestore] || 'PENDING_ACCOUNT';

    const updated = await prisma.$transaction(async (tx) => {
      if (rejectedApproval) {
        await tx.approval.update({
          where: { id: rejectedApproval.id },
          data: {
            status: 'PENDING',
            remarks: `Re-opened: ${justification}`,
            reviewedByUserId: null,
            actionTimestamp: null,
          },
        });
      }

      return await tx.clearanceRequest.update({
        where: { id: request.id },
        data: {
          overallStatus: newStatus,
          currentStage: stageToRestore,
          rejectionReason: null,
        },
      });
    });

    res.json({
      success: true,
      message: `Request ${request.requestId} has been restored to ${stageToRestore} review queue.`,
      request: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
