import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma/client.js';
import { config } from '../config/index.js';
import { Role } from '../types/index.js';
import { authenticate, requireMfaVerified } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { AuditService } from '../services/auditService.js';
import { MfaService } from '../services/mfaService.js';
import { seedDatabase } from '../prisma/seed.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().min(2), // Accepts email, student ID, or employee ID
  password: z.string().min(1),
  expectedRole: z.string().optional(),
  portal: z.string().optional(),
});

/**
 * POST /api/auth/login
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email: identifier, password, expectedRole, portal } = loginSchema.parse(req.body);
    const cleaned = identifier.trim();

    let user;
    if (cleaned.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: cleaned.toLowerCase() },
        include: { studentProfile: { include: { course: true, semester: true } } },
      });
    } else {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { studentProfile: { studentId: cleaned.toUpperCase() } },
            { studentProfile: { enrollmentNo: cleaned.toUpperCase() } },
            { phone: cleaned },
          ],
        },
        include: { studentProfile: { include: { course: true, semester: true } } },
      });
    }

    if (!user) {
      AuditService.logSecurityEvent({
        eventType: 'FAILED_LOGIN_UNKNOWN_USER',
        severity: 'MEDIUM',
        ipAddress: req.ip,
        details: `Failed login attempt for non-existent identifier: ${identifier}`,
      });
      return res.status(401).json({ success: false, error: 'Invalid email/ID or password.' });
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return res.status(423).json({
        success: false,
        error: `Account is temporarily locked until ${user.lockoutUntil.toLocaleTimeString()} due to multiple failed login attempts.`,
      });
    }

    // Check account active status
    if (!user.isActive) {
      AuditService.logSecurityEvent({
        eventType: 'DEACTIVATED_ACCOUNT_LOGIN_ATTEMPT',
        severity: 'MEDIUM',
        userId: user.id,
        ipAddress: req.ip,
        details: `Login attempt for deactivated account: ${user.email}`,
      });
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated by the University Administration. Please contact the Admin Office.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      let lockoutDate: Date | null = null;
      if (attempts >= 5) {
        lockoutDate = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        AuditService.logSecurityEvent({
          eventType: 'BRUTE_FORCE_LOCKOUT',
          severity: 'HIGH',
          userId: user.id,
          ipAddress: req.ip,
          details: `Account ${user.email} locked after ${attempts} failed attempts.`,
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockoutUntil: lockoutDate,
        },
      });

      AuditService.logSecurityEvent({
        eventType: 'FAILED_LOGIN',
        severity: 'LOW',
        userId: user.id,
        ipAddress: req.ip,
        details: `Failed password attempt (${attempts}/5) for ${user.email}`,
      });

      return res.status(401).json({ success: false, error: 'Invalid email/ID or password.' });
    }

    // Role-specific portal authorization verification
    const targetRole = (expectedRole || portal || '').toUpperCase().trim();
    if (targetRole) {
      if (targetRole === 'STUDENT' && user.role !== Role.STUDENT) {
        AuditService.logSecurityEvent({
          eventType: 'UNAUTHORIZED_PORTAL_ACCESS_ATTEMPT',
          severity: 'MEDIUM',
          userId: user.id,
          ipAddress: req.ip,
          details: `User ${user.email} (${user.role}) attempted unauthorized login to STUDENT portal`,
        });
        return res.status(403).json({
          success: false,
          error: 'Access Denied: This login page is reserved for Students. Please use your designated Faculty, Department, or Admin portal.',
        });
      }

      if (targetRole === 'FACULTY' && user.role === Role.STUDENT) {
        AuditService.logSecurityEvent({
          eventType: 'UNAUTHORIZED_PORTAL_ACCESS_ATTEMPT',
          severity: 'MEDIUM',
          userId: user.id,
          ipAddress: req.ip,
          details: `Student ${user.email} attempted login to FACULTY portal`,
        });
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Student accounts cannot access the Faculty & Staff portal.',
        });
      }

      if (targetRole === 'ADMIN' && user.role !== Role.ADMIN) {
        AuditService.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ADMIN_LOGIN_ATTEMPT',
          severity: 'HIGH',
          userId: user.id,
          ipAddress: req.ip,
          details: `User ${user.email} (${user.role}) attempted unauthorized login to ADMIN portal`,
        });
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Strictly restricted to University System Administrators.',
        });
      }

      const deptMap: Record<string, Role> = {
        'IT': Role.IT_DEPARTMENT,
        'IT_DEPARTMENT': Role.IT_DEPARTMENT,
        'LIBRARY': Role.LIBRARY,
        'ACCOUNT': Role.ACCOUNT_SECTION,
        'ACCOUNT_SECTION': Role.ACCOUNT_SECTION,
        'COORDINATOR': Role.CLASS_COORDINATOR,
        'CLASS_COORDINATOR': Role.CLASS_COORDINATOR,
        'EXAM': Role.EXAMINATION_CONTROLLER,
        'EXAM_CONTROLLER': Role.EXAMINATION_CONTROLLER,
        'EXAMINATION_CONTROLLER': Role.EXAMINATION_CONTROLLER,
        'STUDENT_SECTION': Role.STUDENT_SECTION,
      };

      if (deptMap[targetRole] && user.role !== deptMap[targetRole] && user.role !== Role.ADMIN) {
        AuditService.logSecurityEvent({
          eventType: 'UNAUTHORIZED_DEPARTMENT_LOGIN_ATTEMPT',
          severity: 'MEDIUM',
          userId: user.id,
          ipAddress: req.ip,
          details: `User ${user.email} (${user.role}) attempted unauthorized login to ${targetRole} portal`,
        });
        return res.status(403).json({
          success: false,
          error: `Access Denied: This login terminal is designated for ${targetRole.replace('_', ' ')} personnel only. Your account role (${user.role}) is not authorized.`,
        });
      }
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Check if MFA is required or enabled
    const privilegedRoles = [
      Role.ADMIN,
      Role.ACCOUNT_SECTION,
      Role.CLASS_COORDINATOR,
      Role.EXAMINATION_CONTROLLER,
    ];

    const needsMfa = user.isMfaEnabled || privilegedRoles.includes(user.role as Role);

    if (needsMfa && user.mfaSecret) {
      // Create temporary MFA pending token
      const mfaTicket = jwt.sign(
        { userId: user.id, stage: 'MFA_PENDING' },
        config.jwtSecret,
        { expiresIn: '5m' }
      );

      return res.json({
        success: true,
        mfaRequired: true,
        mfaTicket,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    }

    // Standard session token
    const token = jwt.sign(
      { userId: user.id, isMfaVerified: false },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    await AuditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      details: `User ${user.email} logged in successfully`,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentCode: user.departmentCode,
        isMfaEnabled: user.isMfaEnabled,
        studentProfile: user.studentProfile,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Login failed.' });
  }
});

/**
 * POST /api/auth/mfa/verify
 * Validates TOTP token during login
 */
router.post('/mfa/verify', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { mfaTicket, token: totpCode } = req.body;
    if (!mfaTicket || !totpCode) {
      return res.status(400).json({ success: false, error: 'MFA ticket and 6-digit code are required.' });
    }

    const decoded = jwt.verify(mfaTicket, config.jwtSecret) as any;
    if (decoded.stage !== 'MFA_PENDING') {
      return res.status(401).json({ success: false, error: 'Invalid MFA session.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { studentProfile: true },
    });

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ success: false, error: 'MFA not configured for user.' });
    }

    const isValid = MfaService.verifyToken(totpCode, user.mfaSecret);
    if (!isValid) {
      AuditService.logSecurityEvent({
        eventType: 'INVALID_MFA_TOKEN',
        severity: 'MEDIUM',
        userId: user.id,
        ipAddress: req.ip,
        details: `Invalid MFA token provided for ${user.email}`,
      });
      return res.status(401).json({ success: false, error: 'Invalid MFA verification code.' });
    }

    // Success: Issue fully verified JWT
    const sessionToken = jwt.sign(
      { userId: user.id, isMfaVerified: true },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    await AuditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'MFA_VERIFIED_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      details: `User ${user.email} verified MFA and completed login`,
    });

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentCode: user.departmentCode,
        isMfaEnabled: true,
        studentProfile: user.studentProfile,
      },
    });
  } catch (err: any) {
    res.status(401).json({ success: false, error: 'MFA verification failed or session expired.' });
  }
});

/**
 * POST /api/auth/mfa/setup
 * Generates new MFA secret & QR Code for the authenticated user
 */
router.post('/mfa/setup', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const secret = MfaService.generateSecret();
    const otpAuthUrl = MfaService.generateOtpAuthUrl(user.email, secret);
    const qrCodeDataUrl = await MfaService.generateQrCodeDataUrl(otpAuthUrl);

    // Temporarily save secret until confirmed
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret },
    });

    res.json({
      success: true,
      secret,
      qrCodeDataUrl,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/mfa/confirm
 * Confirms code from authenticator app to enable MFA
 */
router.post('/mfa/confirm', authenticate, async (req: Request, res: Response) => {
  try {
    const { token: totpCode } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ success: false, error: 'MFA setup not initiated.' });
    }

    const isValid = MfaService.verifyToken(totpCode, user.mfaSecret);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please try again.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isMfaEnabled: true },
    });

    await AuditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'MFA_ENABLED',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      details: `User ${user.email} successfully enabled MFA`,
    });

    res.json({ success: true, message: 'Two-Factor Authentication successfully enabled.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        studentProfile: {
          include: {
            course: true,
            semester: true,
            academicYear: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentCode: user.departmentCode,
        isMfaEnabled: user.isMfaEnabled,
        isMfaVerified: req.user!.isMfaVerified,
        studentProfile: user.studentProfile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  res.clearCookie('token');
  await AuditService.log({
    userId: req.user?.id,
    userRole: req.user?.role,
    action: 'LOGOUT',
    entityType: 'User',
    entityId: req.user?.id,
    ipAddress: req.ip,
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * POST /api/auth/forgot-password
 * Request password reset instructions
 */
router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ success: false, error: 'Email or institutional User ID is required.' });
    }

    const cleaned = identifier.trim();
    let user;
    if (cleaned.includes('@')) {
      user = await prisma.user.findUnique({ where: { email: cleaned.toLowerCase() } });
    } else {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { studentProfile: { studentId: cleaned.toUpperCase() } },
            { studentProfile: { enrollmentNo: cleaned.toUpperCase() } },
            { phone: cleaned },
          ],
        },
      });
    }

    if (user) {
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        details: `Password reset instructions requested for account: ${user.email}`,
      });
    }

    res.json({
      success: true,
      message:
        'If an active account exists with the provided identifier, password reset instructions have been dispatched to the registered institutional email address. (For test evaluation accounts, the default password is Password123!).',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/quick-switch (Development & evaluation helper)
 * Easily switch between all 8 roles for testing the full workflow seamlessly
 */
router.post('/quick-switch', async (req: Request, res: Response) => {
  try {
    const { role, email } = req.body;
    let user;

    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: { studentProfile: { include: { course: true, semester: true, academicYear: true } } },
      });
    } else if (role) {
      user = await prisma.user.findFirst({
        where: { role },
        include: { studentProfile: { include: { course: true, semester: true, academicYear: true } } },
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: `No user found for switch.` });
    }

    const token = jwt.sign(
      { userId: user.id, isMfaVerified: true },
      config.jwtSecret,
      { expiresIn: '4h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentCode: user.departmentCode,
        isMfaEnabled: user.isMfaEnabled,
        studentProfile: user.studentProfile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/reset-demo
 * 1-Click reset of the entire database back to pristine initial state
 */
router.post('/reset-demo', async (_req: Request, res: Response) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Database reset to clean test state successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
