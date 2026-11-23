import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { apiRateLimiter } from './middleware/security.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import clearanceRoutes from './routes/clearance.routes.js';
import feeRoutes from './routes/fee.routes.js';
import examControllerRoutes from './routes/examController.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import studentSectionRoutes from './routes/studentSection.routes.js';

const app = express();

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", config.clientUrl],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Strict CORS configuration
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.cookieSecret));

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'CT University Secure Digital No-Dues & Examination Eligibility Clearance System',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    security: {
      cryptographicSignature: 'ENABLED',
      mfaProtection: 'ENABLED',
      rbacEnforcement: 'STRICT',
      auditLogging: 'ACTIVE',
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/clearance', clearanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/exam-controller', examControllerRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student-section', studentSectionRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Secure Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[UNHANDLED_ERROR]', err);
  const status = err.statusCode || 500;
  const message = config.isProduction ? 'Internal Server Error. Please contact system administrator.' : err.message;
  res.status(status).json({
    success: false,
    error: message,
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`==================================================================`);
  console.log(` CT UNIVERSITY NO-DUES & EXAMINATION CLEARANCE SYSTEM BACKEND `);
  console.log(` Server listening on http://localhost:${config.port}             `);
  console.log(` Environment: ${config.nodeEnv}                                 `);
  console.log(` Defense-in-depth security controls active.                       `);
  console.log(`==================================================================`);
});

export default app;
