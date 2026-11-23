# SECURITY ARCHITECTURE & THREAT MODEL (SECURITY.md)

**CT UNIVERSITY - SECURE DIGITAL NO-DUES & EXAMINATION ELIGIBILITY CLEARANCE SYSTEM**  
**Document Version:** 1.0.0 (Enterprise Production Security Specification)  
**Standard Compliance Reference:** OWASP Top 10:2021, OWASP Application Security Verification Standard (ASVS v4.0.3), NIST SP 800-63B.

---

## 1. Executive Security Statement

This system replaces vulnerable physical paper signatures with an online clearance workflow. In academic institutions, no-dues clearance and examination hall ticket authorization represent high-value operational targets for tampering, grade bypass, fee evasion, and unauthorized credential issuance.

Therefore, **Defense-in-Depth** and **Zero-Trust Backend Verification** govern every transaction. The frontend UI operates strictly as an untrusted presentation layer. Every sensitive state transition, financial assertion, and clearance approval is authenticated, role-verified, stage-locked, and cryptographically signed on the backend.

---

## 2. Threat Modeling & OWASP Top 10 Mitigation Matrix

| OWASP Vulnerability | Potential Risk in Clearance System | Real Implemented Countermeasure |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Student approving their own request; Staff approving out-of-order; Student accessing other students' dossiers (IDOR). | Backend `requireRole` middleware; IDOR ownership validation on `/api/student/requests/:id`; `WorkflowEngine.processDepartmentApproval` rejects any request where `currentStage !== departmentCode`. |
| **A02: Cryptographic Failures** | Hardcoded secrets; forged PDF clearance certificates; guessable verification tokens. | RSA-2048 asymmetric cryptographic signing for certificates; SHA-256 integrity hashing; high-entropy tokens via `crypto.randomBytes(24)`; environment-based secret separation. |
| **A03: Injection** | SQL/NoSQL injection via student search or request parameters. | Prisma ORM parameterized queries; strict type assertion; zero raw string interpolation in SQL. |
| **A04: Insecure Design** | Examination Controller approving student without verified fee settlement. | Strict double-validation rule: Controller authorization endpoint independently re-queries `FeeRecord` and rejects if `outstandingBalance > 0`. |
| **A05: Security Misconfiguration** | Clickjacking; missing HTTP security headers; permissive CORS. | `helmet` configured with Content Security Policy (CSP), HSTS, X-Content-Type-Options: nosniff, Frameguard deny, strict CORS whitelisting origin. |
| **A06: Vulnerable & Outdated Components** | Obsolete NPM packages with known CVEs. | Pinned modern packages (Express 4.21, Prisma 5.22, Bcryptjs 2.4, Otplib 12, PDFKit 0.16); zero deprecated dependencies. |
| **A07: Identification & Auth Failures** | Credential stuffing; brute-force login; lack of multi-factor authentication for privileged roles. | Rate limiting (`express-rate-limit` 10 tries / 15 min); automatic 15-minute account lockout after 5 consecutive failures; TOTP MFA (RFC 6238) for privileged roles. |
| **A08: Software & Data Integrity Failures** | Manipulating client-side payload to bypass department stages. | Backend state machine in `WorkflowEngine`: stage transitions cannot be forced or skipped. Department staff can only approve their specific stage. |
| **A09: Security Logging & Monitoring Failures** | Unaudited approvals, silent tampering attempts, untracked access. | Dual logging architecture: `AuditLog` records every administrative and workflow change; `SecurityEvent` monitors failed logins, brute-force attempts, and tampering. |
| **A10: Server-Side Request Forgery (SSRF)** | Exploitation of QR verification links. | QR code encodes only relative token / configured domain endpoint; verification endpoint queries only internal database records. |

---

## 3. Cryptographic Certificate Architecture

Each Certificate represents an authoritative legal and academic declaration: **"NO-DUES CLEARANCE AND EXAMINATION ELIGIBILITY AUTHORIZATION"**.

### 3.1 Unpredictable Verification Token
- Generated using Node.js Cryptographically Secure Pseudo-Random Number Generator:
  $$\text{Token} = \text{crypto.randomBytes}(24).\text{toString}('hex')$$
  Entropy: $24 \times 8 = 192\text{ bits}$. Attackers cannot brute-force or guess certificate tokens.

### 3.2 Asymmetric RSA Digital Signature
- The university server maintains an RSA-2048 keypair (`secrets/university_private_key.pem` and `secrets/university_public_key.pem`).
- The canonical certificate payload is structured as follows:
  ```json
  {
    "institution": "CT UNIVERSITY",
    "certificateId": "CT-NDC-EX-2026-1042",
    "requestId": "ND-2026-10001",
    "studentId": "CT-2026-1042",
    "studentName": "Rahul Sharma",
    "course": "B.Tech in Computer Science & Engineering",
    "semester": "5th Semester",
    "academicYear": "2025-2026",
    "examEligibility": "AUTHORIZED",
    "examSession": "Spring 2026 Regular End-Semester Examinations",
    "issuedAt": "2026-11-23T15:48:00.000Z",
    "verificationToken": "8a3f912c4b8e71d60f5a9e2c"
  }
  ```
- The private key signs the canonical payload using SHA-256:
  $$\text{Digital Signature} = \text{Sign}_{\text{RSA-2048}}(\text{SHA-256}(\text{CanonicalPayload}))$$
- Any tampering with the student name, semester, or eligibility invalidates the signature immediately.

### 3.3 Online Real-Time Verification
- Anyone scanning the embedded QR code is directed to `/verify/:token`.
- The public verification service validates the digital signature and displays:
  - Valid: Green university seal with minimal safe verification data.
  - Revoked: Red alert showing revocation timestamp and administrative reason.
  - Not Found: Amber alert for non-existent or forged tokens.
- **Privacy Shield Guarantee:** In compliance with student data privacy standards, the public verification screen never exposes tuition fee records, outstanding balances, internal staff notes, or residential addresses.

---

## 4. Multi-Factor Authentication (MFA) Specification

- **Algorithm:** RFC 6238 Time-Based One-Time Password (TOTP).
- **Time Window Tolerance:** 30 seconds ($T_0 = 0$, $X = 30$, $\pm 1$ step tolerance for clock skew).
- **Mandatory Enforcement:** Required for high-privilege roles:
  1. `ADMIN`
  2. `ACCOUNT_SECTION`
  3. `CLASS_COORDINATOR`
  4. `EXAMINATION_CONTROLLER`
- **Session Protection:** When MFA is enabled, primary password login issues a short-lived `MFA_PENDING` ticket (5 min expiry). The full session token is issued only upon successful TOTP verification.

---

## 5. Sequential Workflow Engine & Tamper Prevention

The workflow is strictly sequential:
$$\text{Student} \longrightarrow \text{Account} \longrightarrow \text{Student Section} \longrightarrow \text{Library} \longrightarrow \text{IT} \longrightarrow \text{Coordinator} \longrightarrow \text{Exam Controller} \longrightarrow \text{Certificate}$$

### Inviolable Workflow Rules Enforced by Backend:
1. **No Skipping:** Library cannot approve while the request is in Account or Student Section stage.
2. **Authoritative Fee Source:** Only Account Section and Admin can update fee records. If `outstandingBalance > 0`, Account Section approval is rejected.
3. **Double Controller Gate:** Even if all previous departments approve, the Examination Controller approval independently checks `feeRecord.outstandingBalance <= 0`.
4. **Certificate Immutability:** A certificate can only be generated once by the Examination Controller. Once issued, status locks to `COMPLETED`.
5. **No Self-Approval:** Student role tokens cannot invoke department approval endpoints.

---

## 6. Audit Logging & Security Monitoring

### Immutable Audit Logs (`AuditLog` Table):
Records every state transition:
- `userId` (Actor)
- `userRole`
- `action` (e.g., `APPROVE_ACCOUNT`, `AUTHORIZE_EXAMINATION_ELIGIBILITY`, `REVOKE_CERTIFICATE`)
- `entityType` & `entityId`
- `previousStateJson` vs `newStateJson`
- `ipAddress` & `userAgent`
- `timestamp`

### Threat Detection (`SecurityEvent` Table):
Logs and flags:
- `FAILED_LOGIN_UNKNOWN_USER`
- `BRUTE_FORCE_LOCKOUT`
- `WORKFLOW_TAMPER_ATTEMPT`
- `UNAUTHORIZED_ACCESS_ATTEMPT`
- `INVALID_MFA_TOKEN`

---

## 7. Remaining Production Deployment Risks & Hardening Checklist

| Security Area | Current Development Configuration | Required Production Hardening |
| :--- | :--- | :--- |
| **TLS / HTTPS** | Plain HTTP during localhost dev. | Enforce HTTPS with valid TLS 1.3 certificates via reverse proxy (Nginx / Cloudflare). |
| **Database Network** | Local SQLite (`dev.db`). | Deploy PostgreSQL 16 on private VPC subnet with no public IP; TLS connection strings. |
| **Secrets Management** | `.env` file on local filesystem. | Move `JWT_SECRET`, RSA private keys, and `DATABASE_URL` to AWS Secrets Manager, HashiCorp Vault, or Google Secret Manager. |
| **Backup Encryption** | Local filesystem file. | Automated daily PostgreSQL WAL-E/pg_dump backups with AES-256 client-side encryption stored in S3/GCS with Object Lock. |
| **WAF / DDoS** | Node.js rate limiters. | Place Cloudflare / AWS WAF in front of web servers to block volumetric DDoS and automated vulnerability scanners. |
| **Malware Scanning** | Text-based metadata verification. | If file upload attachments are enabled in production, run ClamAV daemon scan before writing to object storage. |
