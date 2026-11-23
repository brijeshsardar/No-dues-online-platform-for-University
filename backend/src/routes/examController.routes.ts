import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole, requireMfaVerified } from '../middleware/auth.js';
import { Role, RequestStatus, ApprovalStatus } from '../types/index.js';
import { AuditService } from '../services/auditService.js';
import { NotificationService } from '../services/notificationService.js';
import { CryptoService } from '../services/cryptoService.js';
import { PdfService } from '../services/pdfService.js';

const router = Router();

// Only Examination Controller and Admin
router.use(authenticate, requireRole(Role.EXAMINATION_CONTROLLER, Role.ADMIN));

/**
 * GET /api/exam-controller/requests
 * Lists requests awaiting final Examination Controller review or completed
 */
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.overallStatus = status as string;
    } else {
      where.overallStatus = {
        in: [
          RequestStatus.PENDING_EXAMINATION_CONTROLLER,
          RequestStatus.EXAM_ELIGIBLE,
          RequestStatus.CERTIFICATE_ISSUED,
          RequestStatus.RETURNED,
          RequestStatus.REJECTED,
        ],
      };
    }

    const requests = await prisma.clearanceRequest.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            course: true,
            semester: true,
            academicYear: true,
            feeRecords: true,
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
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, count: requests.length, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exam-controller/:id/authorize
 * Final Authority: Validates all pre-conditions, marks EXAM_ELIGIBLE,
 * and issues cryptographic Certificate with QR Code.
 */
router.post('/:id/authorize', requireMfaVerified, async (req: Request, res: Response) => {
  try {
    const { remarks, examSession } = req.body;
    const requestId = req.params.id;

    // 1. Fetch full dossier
    const request = await prisma.clearanceRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          include: {
            user: true,
            course: true,
            semester: true,
            academicYear: true,
            feeRecords: true,
          },
        },
        semester: true,
        academicYear: true,
        approvals: {
          include: { reviewedByUser: true },
        },
        certificate: true,
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Clearance request not found.' });
    }

    // Security Check: Stage must be EXAM_CONTROLLER
    if (request.currentStage !== 'EXAM_CONTROLLER') {
      AuditService.logSecurityEvent({
        eventType: 'EXAM_ELIGIBILITY_BYPASS_ATTEMPT',
        severity: 'CRITICAL',
        userId: req.user!.id,
        ipAddress: req.ip,
        details: `Attempted final exam authorization out-of-order for request ${request.requestId}. Current stage: ${request.currentStage}`,
      });
      return res.status(400).json({
        success: false,
        error: `Workflow violation: Clearance stage is currently at ${request.currentStage}, not ready for Controller of Examinations authorization.`,
      });
    }

    // 2. Strict Pre-condition validation: ALL 5 previous departments must be APPROVED
    const requiredStages = ['ACCOUNT', 'STUDENT_SECTION', 'LIBRARY', 'IT', 'CLASS_COORDINATOR'];
    for (const stg of requiredStages) {
      const app = request.approvals.find((a) => a.departmentCode === stg);
      if (!app || app.status !== ApprovalStatus.APPROVED) {
        return res.status(400).json({
          success: false,
          error: `Mandatory clearance requirement incomplete: Stage ${stg} is ${app?.status || 'NOT_FOUND'}. Cannot authorize examination eligibility.`,
        });
      }
    }

    // 3. Strict Pre-condition validation: Account Section Fee Record
    const feeRecord = request.student.feeRecords.find(
      (f) => f.semesterId === request.semesterId && f.academicYearId === request.academicYearId
    );

    if (!feeRecord) {
      return res.status(400).json({
        success: false,
        error: 'Official fee record is missing. Cannot verify financial clearance.',
      });
    }

    if (feeRecord.outstandingBalance > 0 && feeRecord.paymentStatus !== 'PAID' && feeRecord.paymentStatus !== 'WAIVED') {
      return res.status(400).json({
        success: false,
        error: `Financial Clearance Blocked: Student has an outstanding balance of $${feeRecord.outstandingBalance.toFixed(2)}. Final authorization denied.`,
      });
    }

    // 4. Generate Certificate Identifiers & Tokens
    const certYear = new Date().getFullYear();
    const certToken = CryptoService.generateSecureToken(24);
    const countCerts = await prisma.certificate.count();
    const certId = `CT-NDC-EX-${certYear}-${(1001 + countCerts).toString()}`;
    const sessionName = examSession || 'Spring 2026 Regular End-Semester Examinations';

    // 5. Generate Cryptographically Signed PDF Certificate
    const pdfResult = await PdfService.generateCertificatePdf({
      certificateId: certId,
      requestId: request.requestId,
      studentName: request.student.user.fullName,
      studentId: request.student.studentId,
      enrollmentNo: request.student.enrollmentNo,
      courseName: request.student.course.name,
      semesterName: request.student.semester.name,
      academicYear: request.student.academicYear.yearString,
      issueDate: new Date(),
      verificationToken: certToken,
      examSession: sessionName,
      approvals: request.approvals.map((a) => ({
        department: a.departmentCode,
        reviewerName: a.reviewedByUser?.fullName || 'Authorized Officer',
        status: a.status,
        timestamp: a.actionTimestamp,
      })),
    });

    // 6. Execute atomic commit for Exam Controller approval + Eligibility + Certificate creation
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Update Controller approval
      await tx.approval.update({
        where: {
          clearanceRequestId_departmentCode: {
            clearanceRequestId: request.id,
            departmentCode: 'EXAM_CONTROLLER',
          },
        },
        data: {
          status: ApprovalStatus.APPROVED,
          reviewedByUserId: req.user!.id,
          remarks: remarks || 'All departmental clearances confirmed. Examination eligibility authorized.',
          digitalSignatureHash: CryptoService.sha256({
            requestId: request.id,
            certId,
            authorizedBy: req.user!.id,
            timestamp: now.toISOString(),
          }),
          actionTimestamp: now,
        },
      });

      // Create ExaminationEligibility record
      const eligibility = await tx.examinationEligibility.create({
        data: {
          clearanceRequestId: request.id,
          studentId: request.studentId,
          authorizedByUserId: req.user!.id,
          examinationSession: sessionName,
          hallTicketAllowed: true,
          verifiedFeeAmount: feeRecord.paidAmount,
          remarks: remarks || 'Unconditionally authorized for examination hall ticket issuance.',
          authorizedAt: now,
        },
      });

      // Create Certificate record
      const certificate = await tx.certificate.create({
        data: {
          certificateId: certId,
          clearanceRequestId: request.id,
          studentId: request.studentId,
          verificationToken: certToken,
          qrCodeDataUrl: pdfResult.qrDataUrl,
          digitalSignature: pdfResult.signature,
          pdfFilePath: pdfResult.filePath,
          issuedAt: now,
          status: 'VALID',
        },
      });

      // Update Clearance Request status
      const updatedReq = await tx.clearanceRequest.update({
        where: { id: request.id },
        data: {
          overallStatus: RequestStatus.CERTIFICATE_ISSUED,
          currentStage: 'COMPLETED',
          completedAt: now,
        },
      });

      return { updatedReq, eligibility, certificate };
    });

    // 7. Audit log & notifications
    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'AUTHORIZE_EXAMINATION_ELIGIBILITY',
      entityType: 'ClearanceRequest',
      entityId: request.id,
      previousState: { status: request.overallStatus, stage: request.currentStage },
      newState: { status: RequestStatus.CERTIFICATE_ISSUED, certId },
      ipAddress: req.ip,
      details: `Examination Controller authorized exam eligibility and issued Certificate ${certId} for ${request.student.studentId}`,
    });

    await NotificationService.send(
      request.student.userId,
      'Examination Eligibility Authorized! 🎉',
      `Congratulations! Your No-Dues clearance is complete and your Examination Eligibility Certificate (${certId}) is now available for download.`,
      'SUCCESS',
      `/certificate/${result.certificate.id}`
    );

    res.json({
      success: true,
      message: 'Examination eligibility authorized and digital certificate generated successfully.',
      certificateId: certId,
      verificationToken: certToken,
      certificate: result.certificate,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exam-controller/:id/return
 */
router.post('/:id/return', async (req: Request, res: Response) => {
  try {
    const { remarks } = req.body;
    if (!remarks) {
      return res.status(400).json({ success: false, error: 'Clarification remarks required.' });
    }

    const request = await prisma.clearanceRequest.findUnique({
      where: { id: req.params.id },
      include: { student: true },
    });

    if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: {
          clearanceRequestId_departmentCode: {
            clearanceRequestId: request.id,
            departmentCode: 'EXAM_CONTROLLER',
          },
        },
        data: {
          status: ApprovalStatus.RETURNED,
          reviewedByUserId: req.user!.id,
          remarks,
          actionTimestamp: new Date(),
        },
      });

      return await tx.clearanceRequest.update({
        where: { id: request.id },
        data: {
          overallStatus: RequestStatus.RETURNED,
          returnReason: remarks,
          returnedByDepartment: 'EXAMINATION_CONTROLLER',
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'RETURN_EXAM_ELIGIBILITY',
      entityType: 'ClearanceRequest',
      entityId: request.id,
      ipAddress: req.ip,
      details: `Examination Controller returned request ${request.requestId}. Remarks: ${remarks}`,
    });

    await NotificationService.send(
      request.student.userId,
      'Request Returned by Examination Controller',
      `Your clearance request was returned for clarification: ${remarks}`,
      'WARNING',
      `/requests/${request.id}`
    );

    res.json({ success: true, message: 'Request returned for clarification.', request: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exam-controller/:id/reject
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason required.' });
    }

    const request = await prisma.clearanceRequest.findUnique({
      where: { id: req.params.id },
      include: { student: true },
    });

    if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: {
          clearanceRequestId_departmentCode: {
            clearanceRequestId: request.id,
            departmentCode: 'EXAM_CONTROLLER',
          },
        },
        data: {
          status: ApprovalStatus.REJECTED,
          reviewedByUserId: req.user!.id,
          remarks: reason,
          actionTimestamp: new Date(),
        },
      });

      return await tx.clearanceRequest.update({
        where: { id: request.id },
        data: {
          overallStatus: RequestStatus.REJECTED,
          rejectionReason: reason,
          currentStage: 'COMPLETED',
        },
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'REJECT_EXAM_ELIGIBILITY',
      entityType: 'ClearanceRequest',
      entityId: request.id,
      ipAddress: req.ip,
      details: `Examination Controller rejected request ${request.requestId}. Reason: ${reason}`,
    });

    await NotificationService.send(
      request.student.userId,
      'Clearance Request Rejected',
      `Your clearance request was rejected by Examination Controller: ${reason}`,
      'ALERT',
      `/requests/${request.id}`
    );

    res.json({ success: true, message: 'Request rejected.', request: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
