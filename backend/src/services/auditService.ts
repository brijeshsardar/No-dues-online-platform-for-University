import { prisma } from '../prisma/client.js';

interface AuditLogParams {
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

interface SecurityEventParams {
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string | null;
  ipAddress?: string;
  details: string;
}

export class AuditService {
  /**
   * Log administrative, workflow, and user actions into immutable audit table
   */
  static async log(params: AuditLogParams) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          userRole: params.userRole,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          previousStateJson: params.previousState ? JSON.stringify(params.previousState) : null,
          newStateJson: params.newState ? JSON.stringify(params.newState) : null,
          ipAddress: params.ipAddress || 'unknown',
          userAgent: params.userAgent?.substring(0, 255) || 'unknown',
          details: params.details,
        },
      });
    } catch (error) {
      console.error('[AUDIT_LOG_ERROR] Failed to record audit log:', error);
    }
  }

  /**
   * Record security threats, brute-force attempts, and unauthorized access attempts
   */
  static async logSecurityEvent(params: SecurityEventParams) {
    try {
      await prisma.securityEvent.create({
        data: {
          eventType: params.eventType,
          severity: params.severity,
          userId: params.userId,
          ipAddress: params.ipAddress || 'unknown',
          details: params.details,
        },
      });
      console.warn(`[SECURITY_EVENT][${params.severity}] ${params.eventType}: ${params.details}`);
    } catch (error) {
      console.error('[SECURITY_EVENT_ERROR] Failed to record security event:', error);
    }
  }
}
