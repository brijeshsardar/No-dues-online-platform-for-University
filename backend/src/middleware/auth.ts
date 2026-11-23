import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../prisma/client.js';
import { AuditService } from '../services/auditService.js';
import { Role } from '../types/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentCode: string | null;
  isMfaEnabled: boolean;
  isMfaVerified: boolean;
  studentId?: string;
  studentProfileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies JWT token from httpOnly cookie or Authorization header
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token is missing. Please log in.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token.',
      });
    }

    // Fetch user from DB to ensure account is active and not locked
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'User account is inactive or not found.',
      });
    }

    // Check temporary lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return res.status(423).json({
        success: false,
        error: `Account temporarily locked due to security policy until ${user.lockoutUntil.toLocaleTimeString()}`,
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      departmentCode: user.departmentCode,
      isMfaEnabled: user.isMfaEnabled,
      isMfaVerified: decoded.isMfaVerified || false,
      studentId: user.studentProfile?.studentId,
      studentProfileId: user.studentProfile?.id,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication credentials.',
    });
  }
}

/**
 * Strict Role-Based Access Control (RBAC) middleware
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log security violation attempt
      AuditService.logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'MEDIUM',
        userId: req.user.id,
        ipAddress: req.ip,
        details: `User with role ${req.user.role} attempted to access restricted endpoint ${req.method} ${req.originalUrl}. Required: [${allowedRoles.join(', ')}]`,
      });

      return res.status(403).json({
        success: false,
        error: `Access denied. Your role [${req.user.role}] does not have permission for this resource.`,
      });
    }

    next();
  };
}

/**
 * Enforces MFA verification for privileged administrative or clearance roles
 */
export function requireMfaVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const privilegedRoles: Role[] = [
    Role.ADMIN,
    Role.ACCOUNT_SECTION,
    Role.CLASS_COORDINATOR,
    Role.EXAMINATION_CONTROLLER,
  ];

  if (privilegedRoles.includes(req.user.role)) {
    if (req.user.isMfaEnabled && !req.user.isMfaVerified) {
      return res.status(403).json({
        success: false,
        mfaRequired: true,
        error: 'Multi-factor authentication (MFA) step verification required for this privileged action.',
      });
    }
  }

  next();
}
