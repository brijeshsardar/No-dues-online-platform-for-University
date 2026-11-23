import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuditService } from '../services/auditService.js';

/**
 * Strict Rate Limiter for Authentication endpoints to prevent brute-force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 500, // 500 in dev/test, 10 in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    AuditService.logSecurityEvent({
      eventType: 'BRUTE_FORCE_RATE_LIMIT_TRIGGERED',
      severity: 'HIGH',
      ipAddress: req.ip,
      details: `Rate limit exceeded on authentication endpoint: ${req.originalUrl} from IP: ${req.ip}`,
    });

    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    });
  },
});

/**
 * Standard API Rate Limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'API rate limit exceeded. Please throttle your requests.',
    });
  },
});

/**
 * Verification Rate Limiter for Public Certificate Verification
 */
export const verificationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Verification request rate limit exceeded. Please wait a moment.',
    });
  },
});
