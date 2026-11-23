import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { config } from '../config/index.js';

// Configure TOTP window for clock skew tolerance (allow 1 step before/after = 30s)
authenticator.options = {
  window: 1,
};

export class MfaService {
  /**
   * Generates a new Base32 secret for TOTP MFA
   */
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generates otpauth URI compatible with Google Authenticator, Microsoft Authenticator, FreeOTP
   */
  static generateOtpAuthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, config.mfaAppName, secret);
  }

  /**
   * Generates a Data URL QR Code image for scanning in mobile authenticator apps
   */
  static async generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250,
      color: {
        dark: '#0f2c59',
        light: '#ffffff',
      },
    });
  }

  /**
   * Validates a 6-digit TOTP token against stored secret
   */
  static verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({
        token: token.trim(),
        secret,
      });
    } catch {
      return false;
    }
  }
}
