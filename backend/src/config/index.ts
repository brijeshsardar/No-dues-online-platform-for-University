import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_dev_mode_ct_uni',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  sessionSecret: process.env.SESSION_SECRET || 'fallback_session_secret_ct',
  cookieSecret: process.env.COOKIE_SECRET || 'fallback_cookie_secret_ct',
  mfaAppName: process.env.MFA_APP_NAME || 'CT University Clearance',
  verifyBaseUrl: process.env.VERIFY_BASE_URL || 'http://localhost:5173/verify',
  isProduction: process.env.NODE_ENV === 'production',
};
