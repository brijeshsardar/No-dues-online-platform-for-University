import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { Role } from '../types/index.js';
import { AuditService } from '../services/auditService.js';
import { NotificationService } from '../services/notificationService.js';

const router = Router();

// Account Section and Admin have full management access
// Students have read access to their own receipts
router.use(authenticate);

/**
 * GET /api/fees/records
 * Search & view student fee ledgers with transaction histories
 */
router.get('/records', requireRole(Role.ACCOUNT_SECTION, Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { search, semesterId, academicYearId } = req.query;

    const where: any = {};
    if (semesterId) where.semesterId = semesterId as string;
    if (academicYearId) where.academicYearId = academicYearId as string;

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.student = {
        OR: [
          { studentId: { contains: q } },
          { enrollmentNo: { contains: q } },
          { user: { fullName: { contains: q } } },
          { user: { email: { contains: q } } },
        ],
      };
    }

    const feeRecords = await prisma.feeRecord.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            course: true,
          },
        },
        semester: true,
        academicYear: true,
        verifiedByUser: { select: { fullName: true } },
        transactions: {
          orderBy: { paymentDate: 'desc' },
          include: {
            recordedByUser: { select: { fullName: true, role: true } },
          },
        },
        modificationLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            modifiedByUser: { select: { fullName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, count: feeRecords.length, feeRecords });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fees/record-payment
 * Records a new payment received from a student with automatic calculation
 */
router.post('/record-payment', requireRole(Role.ACCOUNT_SECTION, Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const {
      feeRecordId,
      amount,
      paymentDate,
      paymentMode,
      transactionRef,
      remarks,
    } = req.body;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid positive payment amount is required.' });
    }

    const feeRecord = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        student: { include: { user: true } },
      },
    });

    if (!feeRecord) {
      return res.status(404).json({ success: false, error: 'Student fee record not found.' });
    }

    // Automatic financial calculations
    const previousTotalPaid = feeRecord.paidAmount;
    const newTotalPaid = previousTotalPaid + payAmount;
    const remainingBalance = Math.max(0, feeRecord.totalFee - newTotalPaid);
    const newStatus = remainingBalance === 0 ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'PENDING');

    // Generate unique receipt number: RCPT-YYYY-XXXXX
    const year = new Date().getFullYear();
    const count = await prisma.paymentTransaction.count();
    const receiptNumber = `RCPT-${year}-${(10001 + count).toString()}`;

    // Execute database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment Transaction
      const transaction = await tx.paymentTransaction.create({
        data: {
          receiptNumber,
          studentId: feeRecord.studentId,
          feeRecordId: feeRecord.id,
          amount: payAmount,
          previousTotalPaid,
          newTotalPaid,
          remainingBalance,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMode: paymentMode || 'ONLINE',
          transactionRef: transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
          remarks: remarks || `Payment received by ${req.user!.fullName}`,
          recordedByUserId: req.user!.id,
        },
      });

      // 2. Update Fee Record
      const updatedFeeRecord = await tx.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          paidAmount: newTotalPaid,
          outstandingBalance: remainingBalance,
          paymentStatus: newStatus,
          paymentReference: transactionRef || receiptNumber,
          verifiedByUserId: req.user!.id,
          verifiedAt: new Date(),
          remarks: remarks || feeRecord.remarks,
        },
      });

      return { transaction, updatedFeeRecord };
    });

    // 3. Send notifications
    await NotificationService.send(
      feeRecord.student.userId,
      `Fee Payment Received: ₹${payAmount.toLocaleString()}`,
      `Your payment of ₹${payAmount.toLocaleString()} has been officially credited. Total Paid: ₹${newTotalPaid.toLocaleString()}, Remaining Balance: ₹${remainingBalance.toLocaleString()}. Receipt No: ${receiptNumber}.`,
      'SUCCESS',
      '/fee-status'
    );

    if (remainingBalance === 0) {
      await NotificationService.send(
        feeRecord.student.userId,
        'Academic Fees Fully Cleared',
        'Your tuition and academic examination fees are fully settled (Balance: ₹0.00). You are eligible for Account Section clearance.',
        'SUCCESS',
        '/fee-status'
      );
    }

    // 4. Audit Log
    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'RECORD_PAYMENT',
      entityType: 'FeeRecord',
      entityId: feeRecord.id,
      previousState: feeRecord,
      newState: result.updatedFeeRecord,
      ipAddress: req.ip,
      details: `Account Officer ${req.user!.fullName} recorded payment of ₹${payAmount} for student ${feeRecord.student.studentId} (${feeRecord.student.user.fullName}). Receipt: ${receiptNumber}. New balance: ₹${remainingBalance}`,
    });

    res.status(201).json({
      success: true,
      message: `Payment of ₹${payAmount.toLocaleString()} recorded successfully. Receipt generated: ${receiptNumber}`,
      transaction: result.transaction,
      feeRecord: result.updatedFeeRecord,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fees/update-total-fee
 * Modify a student's total fee amount with mandatory reason & audit tracking
 */
router.post('/update-total-fee', requireRole(Role.ACCOUNT_SECTION, Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { feeRecordId, newTotalFee, reason } = req.body;

    const parsedTotal = parseFloat(newTotalFee);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({ success: false, error: 'Valid non-negative total fee amount is required.' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Mandatory reason for modifying the fee structure is required.' });
    }

    const feeRecord = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: { student: { include: { user: true } } },
    });

    if (!feeRecord) {
      return res.status(404).json({ success: false, error: 'Fee record not found.' });
    }

    const previousTotalFee = feeRecord.totalFee;
    const newOutstanding = Math.max(0, parsedTotal - feeRecord.paidAmount);
    const newStatus = newOutstanding === 0 ? 'PAID' : (feeRecord.paidAmount > 0 ? 'PARTIAL' : 'PENDING');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Log modification
      const modLog = await tx.feeModificationLog.create({
        data: {
          feeRecordId: feeRecord.id,
          previousTotalFee,
          newTotalFee: parsedTotal,
          reason: reason.trim(),
          modifiedByUserId: req.user!.id,
        },
      });

      // 2. Update Fee Record
      const updated = await tx.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          totalFee: parsedTotal,
          outstandingBalance: newOutstanding,
          paymentStatus: newStatus,
          verifiedByUserId: req.user!.id,
          verifiedAt: new Date(),
        },
      });

      return { modLog, updated };
    });

    // Notify student
    await NotificationService.send(
      feeRecord.student.userId,
      'Academic Fee Schedule Adjusted',
      `Your total academic fee was adjusted to ₹${parsedTotal.toLocaleString()} by the Account Section. Reason: "${reason.trim()}". Current outstanding balance: ₹${newOutstanding.toLocaleString()}.`,
      'INFO',
      '/fee-status'
    );

    // Audit log
    await AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'MODIFY_TOTAL_FEE',
      entityType: 'FeeRecord',
      entityId: feeRecord.id,
      previousState: { totalFee: previousTotalFee, outstandingBalance: feeRecord.outstandingBalance },
      newState: { totalFee: parsedTotal, outstandingBalance: newOutstanding },
      ipAddress: req.ip,
      details: `Account Officer ${req.user!.fullName} adjusted total fee for ${feeRecord.student.studentId} from ₹${previousTotalFee} to ₹${parsedTotal}. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: `Total fee updated to ₹${parsedTotal.toLocaleString()}. Remaining balance recalculated: ₹${newOutstanding.toLocaleString()}`,
      feeRecord: result.updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/fees/receipts/:receiptNumber
 * Fetch full receipt details for display or download
 */
router.get('/receipts/:receiptNumber', async (req: Request, res: Response) => {
  try {
    const { receiptNumber } = req.params;

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { receiptNumber },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            course: true,
            semester: true,
          },
        },
        feeRecord: true,
        recordedByUser: { select: { fullName: true, role: true } },
      },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Payment receipt not found.' });
    }

    // Security IDOR check: If user is a student, ensure they own this receipt
    if (req.user!.role === Role.STUDENT && transaction.student.userId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this receipt.' });
    }

    res.json({ success: true, transaction });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
