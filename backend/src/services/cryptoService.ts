import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Generate or persist university cryptographic signing keypair for certificate non-repudiation
const KEYS_DIR = path.resolve(__dirname, '../../secrets');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'university_private_key.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'university_public_key.pem');

let privateKey: string;
let publicKey: string;

function initializeKeys() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
    publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');
  } else {
    // Generate RSA 2048-bit keypair
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, priv, { mode: 0o600 });
    fs.writeFileSync(PUBLIC_KEY_PATH, pub, { mode: 0o644 });
    privateKey = priv;
    publicKey = pub;
  }
}

initializeKeys();

export class CryptoService {
  /**
   * Generates a secure, non-guessable verification token
   */
  static generateSecureToken(length = 24): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Computes SHA-256 hash of any arbitrary string or canonical JSON payload
   */
  static sha256(data: string | object): string {
    const input = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Cryptographically signs the certificate payload using university RSA private key
   * Returns base64 signature string
   */
  static signPayload(canonicalPayload: object): string {
    const data = Buffer.from(JSON.stringify(canonicalPayload));
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verifies cryptographic signature using university RSA public key
   */
  static verifySignature(canonicalPayload: object, signatureBase64: string): boolean {
    try {
      const data = Buffer.from(JSON.stringify(canonicalPayload));
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();
      return verify.verify(publicKey, signatureBase64, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * Get public key for external verification
   */
  static getPublicKey(): string {
    return publicKey;
  }
}
