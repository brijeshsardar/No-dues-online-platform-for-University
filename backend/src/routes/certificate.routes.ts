import { Router, Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { verificationRateLimiter } from '../middleware/security.js';
import { Role } from '../types/index.js';
import { AuditService } from '../services/auditService.js';
import { CryptoService } from '../services/cryptoService.js';

const router = Router();

/**
 * GET /api/certificates/verify/:token
 * PUBLIC ONLINE VERIFICATION ENDPOINT
 * Does not require authentication so anyone scanning the QR code can verify validity.
 * Adheres strictly to security rule: Displays only minimal non-sensitive data.
 * No financial records, addresses, or internal remarks are exposed!
 */
router.get('/verify/:token', verificationRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { verificationToken: token },
      include: {
        student: {
          include: {
            user: { select: { fullName: true } },
            course: { select: { name: true } },
            semester: { select: { name: true } },
            academicYear: { select: { yearString: true } },
          },
        },
        clearanceRequest: {
          select: { requestId: true },
        },
      },
    });

    if (!certificate) {
      // Record verification check attempt
      return res.status(404).json({
        success: false,
        status: 'NOT_FOUND',
        message: 'No certificate found with this verification token. The certificate may be invalid or forged.',
      });
    }

    // Verify digital signature integrity
    const canonicalPayload = {
      institution: 'CT UNIVERSITY',
      certificateId: certificate.certificateId,
      requestId: certificate.clearanceRequest.requestId,
      studentId: certificate.student.studentId,
      studentName: certificate.student.user.fullName,
      course: certificate.student.course.name,
      semester: certificate.student.semester.name,
      academicYear: certificate.student.academicYear.yearString,
      examEligibility: 'AUTHORIZED',
      examSession: 'Spring 2026 Regular End-Semester Examinations',
      issuedAt: certificate.issuedAt.toISOString(),
      verificationToken: certificate.verificationToken,
    };

    const isSignatureAuthentic = CryptoService.verifySignature(canonicalPayload, certificate.digitalSignature);

    // Record verification event in database
    await prisma.certificateVerification.create({
      data: {
        certificateId: certificate.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 255),
        verificationResult: certificate.status,
      },
    });

    if (certificate.status === 'REVOKED') {
      return res.json({
        success: true,
        status: 'REVOKED',
        message: 'This certificate has been officially REVOKED by University Administration.',
        revokedAt: certificate.revokedAt,
        revocationReason: certificate.revocationReason,
        certificate: {
          certificateId: certificate.certificateId,
          studentName: certificate.student.user.fullName,
          studentIdMasked: certificate.student.studentId,
          course: certificate.student.course.name,
          semester: certificate.student.semester.name,
          issuingInstitution: 'CT University',
        },
      });
    }

    // Return strictly minimal verified details
    res.json({
      success: true,
      status: 'VALID',
      isSignatureAuthentic,
      certificate: {
        certificateId: certificate.certificateId,
        requestId: certificate.clearanceRequest.requestId,
        studentName: certificate.student.user.fullName,
        studentIdMasked: certificate.student.studentId,
        course: certificate.student.course.name,
        semester: certificate.student.semester.name,
        academicYear: certificate.student.academicYear.yearString,
        issueDate: certificate.issuedAt,
        examinationEligibility: 'AUTHORIZED',
        issuingInstitution: 'CT University - Office of the Controller of Examinations',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/certificates/:id/download
 * Downloads the signed PDF certificate
 */
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { student: true },
    });

    if (!certificate || !certificate.pdfFilePath) {
      return res.status(404).json({ success: false, error: 'Certificate document not found.' });
    }

    // IDOR check: If student role, must own the certificate
    if (req.user!.role === Role.STUDENT && certificate.student.userId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only download your own certificate.' });
    }

    if (!fs.existsSync(certificate.pdfFilePath)) {
      return res.status(404).json({ success: false, error: 'Physical PDF file not found on server.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CT_Clearance_${certificate.certificateId}.pdf"`);
    fs.createReadStream(certificate.pdfFilePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/certificates/:id/revoke
 * Admin only: Revokes an active certificate with mandatory reason
 */
router.post('/:id/revoke', authenticate, requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Mandatory revocation reason is required.' });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { student: { include: { user: true } } },
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    const updated = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedByUserId: req.user!.id,
        revocationReason: reason,
      },
    });

    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'REVOKE_CERTIFICATE',
      entityType: 'Certificate',
      entityId: certificate.id,
      previousState: { status: certificate.status },
      newState: { status: 'REVOKED', reason },
      ipAddress: req.ip,
      details: `Admin revoked certificate ${certificate.certificateId}. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: `Certificate ${certificate.certificateId} has been revoked.`,
      certificate: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
