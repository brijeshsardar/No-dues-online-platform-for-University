import { prisma } from '../prisma/client.js';
import { Role, RequestStatus, ApprovalStatus } from '../types/index.js';
import { CryptoService } from './cryptoService.js';
import { AuditService } from './auditService.js';
import { NotificationService } from './notificationService.js';

export const WORKFLOW_STAGES = [
  'ACCOUNT',
  'STUDENT_SECTION',
  'LIBRARY',
  'IT',
  'CLASS_COORDINATOR',
  'EXAM_CONTROLLER',
] as const;

export type WorkflowStage = typeof WORKFLOW_STAGES[number];

export class WorkflowEngine {
  /**
   * Initializes a new clearance request with default pending department approvals
   */
  static async submitRequest(studentId: string, semesterId: string, academicYearId: string, remarks?: string, ip?: string) {
    // 1. Verify student exists and has no existing active request
    const existing = await prisma.clearanceRequest.findFirst({
      where: {
        studentId,
        semesterId,
        academicYearId,
        overallStatus: {
          notIn: [RequestStatus.REJECTED, RequestStatus.CERTIFICATE_ISSUED],
        },
      },
    });

    if (existing) {
      throw new Error(`An active clearance request (${existing.requestId}) already exists for this semester.`);
    }

    // 2. Generate unique Request ID: ND-YYYY-XXXXX
    const year = new Date().getFullYear();
    const count = await prisma.clearanceRequest.count();
    const requestId = `ND-${year}-${(10001 + count).toString()}`;

    // 3. Create Request inside a transaction
    const clearanceRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.clearanceRequest.create({
        data: {
          requestId,
          studentId,
          semesterId,
          academicYearId,
          overallStatus: RequestStatus.PENDING_ACCOUNT,
          currentStage: 'ACCOUNT',
          submissionRemarks: remarks,
        },
      });

      // Initialize all 6 approvals in PENDING state
      for (const dept of WORKFLOW_STAGES) {
        await tx.approval.create({
          data: {
            clearanceRequestId: request.id,
            departmentCode: dept,
            status: ApprovalStatus.PENDING,
          },
        });
      }

      return request;
    });

    // 4. Audit & Notifications
    await AuditService.log({
      action: 'SUBMIT_REQUEST',
      entityType: 'ClearanceRequest',
      entityId: clearanceRequest.id,
      newState: clearanceRequest,
      ipAddress: ip,
      details: `Student submitted clearance request ${clearanceRequest.requestId}`,
    });

    // Notify student and Account Section officers
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (student) {
      await NotificationService.send(
        student.userId,
        'No-Dues Request Submitted',
        `Your clearance request ${requestId} has been submitted and is currently routed to the Account Section.`,
        'SUCCESS',
        `/requests/${clearanceRequest.id}`
      );
    }

    await NotificationService.notifyRole(
      Role.ACCOUNT_SECTION,
      'New Clearance Request Assigned',
      `Request ${requestId} is awaiting fee verification.`,
      'INFO',
      `/dashboard/account`
    );

    return clearanceRequest;
  }

  /**
   * Approves a department clearance step with strict sequential enforcement
   */
  static async processDepartmentApproval(params: {
    clearanceRequestId: string;
    departmentCode: WorkflowStage;
    action: 'APPROVE' | 'RETURN' | 'REJECT';
    reviewerUserId: string;
    reviewerRole: Role;
    remarks?: string;
    verificationDetails?: Record<string, any>;
    ip?: string;
  }) {
    const {
      clearanceRequestId,
      departmentCode,
      action,
      reviewerUserId,
      reviewerRole,
      remarks,
      verificationDetails,
      ip,
    } = params;

    const request = await prisma.clearanceRequest.findUnique({
      where: { id: clearanceRequestId },
      include: {
        student: { include: { user: true } },
        approvals: true,
      },
    });

    if (!request) {
      throw new Error('Clearance request not found.');
    }

    // Security Check: Workflow cannot be modified if certificate is already issued
    if (
      request.overallStatus === RequestStatus.CERTIFICATE_ISSUED ||
      request.overallStatus === RequestStatus.EXAM_ELIGIBLE
    ) {
      throw new Error(`Cannot modify request with status ${request.overallStatus}`);
    }

    const currentDeptApproval = request.approvals.find((a) => a.departmentCode === departmentCode);
    const isReapplicationReview = currentDeptApproval?.status === 'REAPPLICATION_SUBMITTED';

    // Security Check: Sequential stage enforcement (exempt if reviewing a submitted reapplication for this department)
    if (request.currentStage !== departmentCode && !isReapplicationReview) {
      AuditService.logSecurityEvent({
        eventType: 'WORKFLOW_TAMPER_ATTEMPT',
        severity: 'HIGH',
        userId: reviewerUserId,
        ipAddress: ip,
        details: `Attempted out-of-order approval for department ${departmentCode}. Current stage is ${request.currentStage}. Request ID: ${request.requestId}`,
      });
      throw new Error(`Workflow sequence violation: Current required stage is ${request.currentStage}, cannot process ${departmentCode}.`);
    }

    // Check Role vs Department Authorization
    this.validateRoleForDepartment(reviewerRole, departmentCode);

    // If Department is ACCOUNT and Action is APPROVE, strictly verify fee record
    if (departmentCode === 'ACCOUNT' && action === 'APPROVE') {
      const feeRecord = await prisma.feeRecord.findFirst({
        where: {
          studentId: request.studentId,
          semesterId: request.semesterId,
          academicYearId: request.academicYearId,
        },
      });

      if (!feeRecord) {
        throw new Error('Official fee record not found for student in this semester.');
      }

      if (feeRecord.outstandingBalance > 0 && feeRecord.paymentStatus !== 'PAID' && feeRecord.paymentStatus !== 'WAIVED') {
        throw new Error(`Cannot approve fee clearance: Student has an outstanding balance of $${feeRecord.outstandingBalance.toFixed(2)}.`);
      }
    }

    // Compute digital signature hash of the approval
    const timestamp = new Date();
    const signatureHash = CryptoService.sha256({
      clearanceRequestId: request.id,
      departmentCode,
      action,
      reviewerUserId,
      timestamp: timestamp.toISOString(),
      verificationDetails,
    });

    const nextStage = this.getNextStage(departmentCode);
    const nextStatus = this.calculateNextStatus(departmentCode, action, nextStage);

    // Update inside transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update department approval record
      const updatedApproval = await tx.approval.update({
        where: {
          clearanceRequestId_departmentCode: {
            clearanceRequestId: request.id,
            departmentCode,
          },
        },
        data: {
          status: action === 'APPROVE' ? ApprovalStatus.APPROVED : action === 'RETURN' ? ApprovalStatus.RETURNED : ApprovalStatus.REJECTED,
          reviewedByUserId: reviewerUserId,
          remarks: remarks || null,
          rejectionReason: action === 'REJECT' ? (remarks || 'Rejected by department officer') : currentDeptApproval?.rejectionReason,
          verificationDetails: verificationDetails ? JSON.stringify(verificationDetails) : null,
          digitalSignatureHash: signatureHash,
          actionTimestamp: timestamp,
        },
      });

      // Record rejection or reapplication approval in ReapplicationRecord
      if (action === 'REJECT') {
        await tx.reapplicationRecord.create({
          data: {
            approvalId: updatedApproval.id,
            departmentCode,
            rejectionReason: remarks || 'Rejected by department officer',
            rejectionDate: timestamp,
            status: 'REJECTED',
          },
        });
      } else if (isReapplicationReview && action === 'APPROVE') {
        // Mark pending reapplication record as approved
        const latestPendingReapply = await tx.reapplicationRecord.findFirst({
          where: { approvalId: updatedApproval.id, status: 'PENDING_REVIEW' },
          orderBy: { submittedAt: 'desc' },
        });
        if (latestPendingReapply) {
          await tx.reapplicationRecord.update({
            where: { id: latestPendingReapply.id },
            data: {
              status: 'APPROVED',
              reviewedAt: timestamp,
              reviewerRemarks: remarks || 'Reapplication approved',
            },
          });
        }
      }

      // Check if all prerequisite department approvals are now approved
      const allApprovals = await tx.approval.findMany({
        where: { clearanceRequestId: request.id },
      });
      const prerequisiteStages: WorkflowStage[] = ['ACCOUNT', 'STUDENT_SECTION', 'LIBRARY', 'IT', 'CLASS_COORDINATOR'];
      const allPrerequisitesApproved = prerequisiteStages.every((st) => {
        if (st === departmentCode) return action === 'APPROVE';
        const ap = allApprovals.find((a) => a.departmentCode === st);
        return ap?.status === 'APPROVED';
      });

      let calculatedOverallStatus: string = nextStatus;
      let calculatedCurrentStage: string = action === 'APPROVE' ? (nextStage || 'COMPLETED') : departmentCode;

      if (action === 'APPROVE' && allPrerequisitesApproved) {
        calculatedOverallStatus = RequestStatus.PENDING_EXAMINATION_CONTROLLER;
        calculatedCurrentStage = 'EXAM_CONTROLLER';
      } else if (action === 'REJECT') {
        calculatedOverallStatus = RequestStatus.REJECTED;
        calculatedCurrentStage = departmentCode;
      }

      // Update Clearance Request overall status and current stage
      const updatedReq = await tx.clearanceRequest.update({
        where: { id: request.id },
        data: {
          overallStatus: calculatedOverallStatus,
          currentStage: calculatedCurrentStage,
          returnReason: action === 'RETURN' ? remarks : null,
          rejectionReason: action === 'REJECT' ? remarks : null,
          returnedByDepartment: action === 'RETURN' ? departmentCode : null,
        },
      });

      return updatedReq;
    });

    // Audit Log
    await AuditService.log({
      userId: reviewerUserId,
      userRole: reviewerRole,
      action: `${action}_${departmentCode}`,
      entityType: 'ClearanceRequest',
      entityId: request.id,
      previousState: { status: request.overallStatus, stage: request.currentStage },
      newState: { status: updated.overallStatus, stage: updated.currentStage },
      ipAddress: ip,
      details: `${reviewerRole} performed ${action} on department ${departmentCode} for request ${request.requestId}. Remarks: ${remarks || 'None'}`,
    });

    // Notify Student
    let notifTitle = `Department ${departmentCode} ${action === 'APPROVE' ? 'Approved' : action === 'RETURN' ? 'Returned' : 'Rejected'}`;
    let notifMsg = `Your request ${request.requestId} was ${action.toLowerCase()}ed by ${departmentCode}. Remarks: ${remarks || 'No remarks.'}`;
    let notifType: 'SUCCESS' | 'WARNING' | 'ALERT' = action === 'APPROVE' ? 'SUCCESS' : action === 'RETURN' ? 'WARNING' : 'ALERT';

    await NotificationService.send(request.student.userId, notifTitle, notifMsg, notifType, `/requests/${request.id}`);

    // Notify next department if approved
    if (action === 'APPROVE' && nextStage) {
      const nextRole = this.getRoleForDepartment(nextStage);
      if (nextRole) {
        await NotificationService.notifyRole(
          nextRole,
          'Pending Clearance Request',
          `Request ${request.requestId} is now ready for ${nextStage} review.`,
          'INFO'
        );
      }
    }

    return updated;
  }

  private static validateRoleForDepartment(role: Role, departmentCode: WorkflowStage) {
    if (role === Role.ADMIN) return; // Admin can inspect, but standard workflow relies on role match

    const mapping: Record<WorkflowStage, Role> = {
      ACCOUNT: Role.ACCOUNT_SECTION,
      STUDENT_SECTION: Role.STUDENT_SECTION,
      LIBRARY: Role.LIBRARY,
      IT: Role.IT_DEPARTMENT,
      CLASS_COORDINATOR: Role.CLASS_COORDINATOR,
      EXAM_CONTROLLER: Role.EXAMINATION_CONTROLLER,
    };

    if (mapping[departmentCode] !== role) {
      throw new Error(`Security Exception: Role ${role} is not permitted to approve stage ${departmentCode}.`);
    }
  }

  private static getNextStage(current: WorkflowStage): WorkflowStage | null {
    const idx = WORKFLOW_STAGES.indexOf(current);
    if (idx >= 0 && idx < WORKFLOW_STAGES.length - 1) {
      return WORKFLOW_STAGES[idx + 1];
    }
    return null;
  }

  private static calculateNextStatus(
    stage: WorkflowStage,
    action: 'APPROVE' | 'RETURN' | 'REJECT',
    nextStage: WorkflowStage | null
  ): RequestStatus {
    if (action === 'REJECT') return RequestStatus.REJECTED;
    if (action === 'RETURN') return RequestStatus.RETURNED;

    switch (nextStage) {
      case 'STUDENT_SECTION':
        return RequestStatus.PENDING_STUDENT_SECTION;
      case 'LIBRARY':
        return RequestStatus.PENDING_LIBRARY;
      case 'IT':
        return RequestStatus.PENDING_IT;
      case 'CLASS_COORDINATOR':
        return RequestStatus.PENDING_CLASS_COORDINATOR;
      case 'EXAM_CONTROLLER':
        return RequestStatus.PENDING_EXAMINATION_CONTROLLER;
      default:
        return RequestStatus.APPROVED;
    }
  }

  private static getRoleForDepartment(stage: WorkflowStage): Role | null {
    switch (stage) {
      case 'ACCOUNT': return Role.ACCOUNT_SECTION;
      case 'STUDENT_SECTION': return Role.STUDENT_SECTION;
      case 'LIBRARY': return Role.LIBRARY;
      case 'IT': return Role.IT_DEPARTMENT;
      case 'CLASS_COORDINATOR': return Role.CLASS_COORDINATOR;
      case 'EXAM_CONTROLLER': return Role.EXAMINATION_CONTROLLER;
      default: return null;
    }
  }

  /**
   * Reapplies specifically to a rejected or returned department
   */
  static async submitReapplication(params: {
    clearanceRequestId: string;
    departmentCode: WorkflowStage;
    studentUserId: string;
    studentResponse: string;
    ip?: string;
  }) {
    const { clearanceRequestId, departmentCode, studentUserId, studentResponse, ip } = params;

    if (!studentResponse || studentResponse.trim().length === 0) {
      throw new Error('Mandatory explanation / response is required to reapply.');
    }

    const request = await prisma.clearanceRequest.findUnique({
      where: { id: clearanceRequestId },
      include: {
        student: { include: { user: true } },
        approvals: true,
      },
    });

    if (!request) {
      throw new Error('Clearance request not found.');
    }

    if (request.student.userId !== studentUserId) {
      throw new Error('Unauthorized: You can only reapply for your own clearance request.');
    }

    const approval = request.approvals.find((a) => a.departmentCode === departmentCode);
    if (!approval) {
      throw new Error(`Department clearance record for ${departmentCode} not found.`);
    }

    if (approval.status !== 'REJECTED' && approval.status !== 'RETURNED') {
      throw new Error(`Cannot reapply: Department ${departmentCode} is in '${approval.status}' status (must be REJECTED or RETURNED).`);
    }

    const timestamp = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // Create ReapplicationRecord history
      await tx.reapplicationRecord.create({
        data: {
          approvalId: approval.id,
          departmentCode,
          rejectionReason: approval.rejectionReason || approval.remarks || 'Previous department rejection',
          rejectionDate: approval.actionTimestamp || timestamp,
          studentResponse: studentResponse.trim(),
          submittedAt: timestamp,
          status: 'PENDING_REVIEW',
        },
      });

      // Update approval status to REAPPLICATION_SUBMITTED
      const updatedApproval = await tx.approval.update({
        where: { id: approval.id },
        data: {
          status: 'REAPPLICATION_SUBMITTED',
          reapplicationRemarks: studentResponse.trim(),
          reapplicationSubmittedAt: timestamp,
        },
      });

      // Update overall request to show active review for this department without affecting other approved departments
      await tx.clearanceRequest.update({
        where: { id: request.id },
        data: {
          overallStatus: `PENDING_${departmentCode}`,
          currentStage: departmentCode,
          updatedAt: timestamp,
        },
      });

      return updatedApproval;
    });

    // Audit log
    await AuditService.log({
      userId: studentUserId,
      userRole: Role.STUDENT,
      action: `REAPPLY_${departmentCode}`,
      entityType: 'Approval',
      entityId: approval.id,
      ipAddress: ip,
      details: `Student ${request.student.user.fullName} (${request.student.studentId}) submitted reapplication for department ${departmentCode}. Response: "${studentResponse.trim()}"`,
    });

    // Notify Department
    const targetRole = this.getRoleForDepartment(departmentCode);
    if (targetRole) {
      await NotificationService.notifyRole(
        targetRole,
        `Reapplication Received: ${request.student.user.fullName}`,
        `Student ${request.student.user.fullName} (${request.student.studentId}) submitted a reapplication for ${departmentCode} clearance. Response: "${studentResponse.trim()}".`,
        'INFO',
        `/dashboard`
      );
    }

    // Notify Student
    await NotificationService.send(
      studentUserId,
      `Reapplication Submitted to ${departmentCode}`,
      `Your reapplication for ${departmentCode} clearance has been submitted and is under review.`,
      'SUCCESS',
      `/dashboard`
    );

    return updated;
  }
}
