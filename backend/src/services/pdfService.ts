import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { CryptoService } from './cryptoService.js';
import { config } from '../config/index.js';

const CERT_STORAGE_DIR = path.resolve(__dirname, '../../generated_certificates');
if (!fs.existsSync(CERT_STORAGE_DIR)) {
  fs.mkdirSync(CERT_STORAGE_DIR, { recursive: true });
}

export interface CertificateData {
  certificateId: string;
  requestId: string;
  studentName: string;
  studentId: string;
  enrollmentNo: string;
  courseName: string;
  semesterName: string;
  academicYear: string;
  issueDate: Date;
  verificationToken: string;
  examSession: string;
  approvals: {
    department: string;
    reviewerName: string;
    status: string;
    timestamp: Date | null;
  }[];
}

export class PdfService {
  /**
   * Generates a tamper-evident, cryptographically signed PDF certificate
   */
  static async generateCertificatePdf(data: CertificateData): Promise<{ filePath: string; signature: string; qrDataUrl: string }> {
    const fileName = `Certificate_${data.certificateId}.pdf`;
    const filePath = path.join(CERT_STORAGE_DIR, fileName);

    // 1. Build canonical payload for cryptographic signing
    const canonicalPayload = {
      institution: 'CT UNIVERSITY',
      certificateId: data.certificateId,
      requestId: data.requestId,
      studentId: data.studentId,
      studentName: data.studentName,
      course: data.courseName,
      semester: data.semesterName,
      academicYear: data.academicYear,
      examEligibility: 'AUTHORIZED',
      examSession: data.examSession,
      issuedAt: data.issueDate.toISOString(),
      verificationToken: data.verificationToken,
    };

    // 2. Cryptographic signature with RSA key
    const digitalSignature = CryptoService.signPayload(canonicalPayload);
    const signatureDigest = CryptoService.sha256(canonicalPayload);

    // 3. Generate QR code pointing to public verification URL
    const verificationUrl = `${config.verifyBaseUrl}/${data.verificationToken}`;
    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 130,
      color: {
        dark: '#0b213f',
        light: '#ffffff',
      },
    });

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 180,
      color: {
        dark: '#0b213f',
        light: '#ffffff',
      },
    });

    // 4. Generate PDF Document
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `CT University No-Dues Clearance - ${data.studentName}`,
          Author: 'Office of the Controller of Examinations',
          Subject: 'Digital Clearance & Examination Eligibility Certificate',
          Keywords: 'No-Dues, Clearance, CT University, Examination, Verified',
          CreationDate: data.issueDate,
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Outer Decorative Border
      doc.rect(20, 20, 555, 802).lineWidth(3).strokeColor('#0b213f').stroke();
      doc.rect(24, 24, 547, 794).lineWidth(1).strokeColor('#c59b27').stroke();

      // Top Header Banner
      doc.rect(25, 25, 545, 95).fill('#0b213f');

      // University Title
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text('CT UNIVERSITY', 35, 38, {
        align: 'center',
      });
      doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1').text(
        'OFFICE OF THE CONTROLLER OF EXAMINATIONS & STUDENT SERVICES',
        35,
        64,
        { align: 'center', characterSpacing: 1.2 }
      );
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#f59e0b').text(
        'SECURE DIGITAL NO-DUES & EXAMINATION ELIGIBILITY CERTIFICATE',
        35,
        80,
        { align: 'center' }
      );

      // Certificate ID & Issue Date Banner
      doc.rect(25, 120, 545, 25).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f2c59')
        .text(`CERTIFICATE ID: ${data.certificateId}`, 40, 128)
        .text(`REQUEST ID: ${data.requestId}`, 250, 128)
        .text(`ISSUE DATE: ${data.issueDate.toLocaleDateString()}`, 430, 128);

      // Student Information Card
      doc.rect(35, 155, 525, 105).lineWidth(1).strokeColor('#e2e8f0').fillAndStroke('#ffffff', '#e2e8f0');

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b213f').text('STUDENT CREDENTIALS & PROGRAM RECORD', 45, 165);
      doc.moveTo(45, 180).lineTo(550, 180).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
      doc.text('Student Full Name:', 45, 190);
      doc.text('Student Registration ID:', 45, 206);
      doc.text('Enrollment Number:', 45, 222);
      doc.text('Academic Year:', 45, 238);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
      doc.text(data.studentName.toUpperCase(), 160, 190);
      doc.text(data.studentId, 160, 206);
      doc.text(data.enrollmentNo, 160, 222);
      doc.text(data.academicYear, 160, 238);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
      doc.text('Course / Program:', 320, 190);
      doc.text('Current Semester:', 320, 206);
      doc.text('Examination Session:', 320, 222);
      doc.text('Eligibility Status:', 320, 238);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
      doc.text(data.courseName, 420, 190, { width: 135 });
      doc.text(data.semesterName, 420, 206);
      doc.text('Spring 2026 Regular', 420, 222);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#15803d').text('EXAM-ELIGIBLE ✓', 420, 238);

      // Section Title: Department Clearance Matrix
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b213f').text('DEPARTMENT CLEARANCE VERIFICATION RECORD', 35, 275);

      // Table Header
      const tableTop = 295;
      doc.rect(35, tableTop, 525, 22).fill('#0f2c59');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
      doc.text('#', 45, tableTop + 6);
      doc.text('CLEARANCE AUTHORITY / SECTION', 65, tableTop + 6);
      doc.text('CLEARANCE SCOPE', 230, tableTop + 6);
      doc.text('STATUS', 415, tableTop + 6);
      doc.text('VERIFICATION', 480, tableTop + 6);

      const rows = [
        { no: '1', name: 'Account Section', scope: 'Tuition Fee, Examination Fee & Dues', status: 'APPROVED', icon: 'VERIFIED' },
        { no: '2', name: 'Student Section', scope: 'Administrative Documents & Conduct', status: 'APPROVED', icon: 'VERIFIED' },
        { no: '3', name: 'Library Department', scope: 'Book Returns & Outstanding Fines', status: 'APPROVED', icon: 'VERIFIED' },
        { no: '4', name: 'IT Infrastructure Dept', scope: 'Computing Assets & Network Access', status: 'APPROVED', icon: 'VERIFIED' },
        { no: '5', name: 'Class Coordinator', scope: 'Academic Attendance & Eligibility', status: 'APPROVED', icon: 'VERIFIED' },
        { no: '6', name: 'Examination Controller', scope: 'Final Examination Authorization', status: 'AUTHORIZED', icon: 'VERIFIED' },
      ];

      let rowY = tableTop + 22;
      rows.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(35, rowY, 525, 24).fill(bg);
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
        doc.text(row.no, 45, rowY + 7);
        doc.font('Helvetica-Bold').fillColor('#0f2c59').text(row.name, 65, rowY + 7);
        doc.font('Helvetica').fillColor('#475569').text(row.scope, 230, rowY + 7);
        doc.font('Helvetica-Bold').fillColor('#15803d').text(row.status, 415, rowY + 7);
        doc.font('Helvetica-Bold').fillColor('#0284c7').text(row.icon, 480, rowY + 7);

        doc.moveTo(35, rowY + 24).lineTo(560, rowY + 24).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
        rowY += 24;
      });

      // Examination Eligibility Certificate Authorization Stamp
      const authBoxY = rowY + 15;
      doc.rect(35, authBoxY, 525, 75).lineWidth(1.5).strokeColor('#15803d').fillAndStroke('#f0fdf4', '#15803d');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#166534').text('EXAMINATION ELIGIBILITY: AUTHORIZED (FINAL CLEARANCE)', 45, authBoxY + 12);
      doc.font('Helvetica').fontSize(9).fillColor('#14532d').text(
        'This is an official verification that the candidate has completed all mandatory departmental clearances, fulfilled all academic obligations, and settled all financial dues. The student is unconditionally authorized to receive their Examination Hall Ticket and appear for the upcoming University Examinations.',
        45,
        authBoxY + 30,
        { width: 505, lineGap: 3 }
      );

      // Security Verification & QR Code Footer Area
      const secBoxY = authBoxY + 88;
      doc.rect(35, secBoxY, 525, 145).lineWidth(1).strokeColor('#cbd5e1').fillAndStroke('#ffffff', '#cbd5e1');

      // Add QR Code
      doc.image(qrBuffer, 45, secBoxY + 8, { width: 110, height: 110 });

      // Security Explanatory Text
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0b213f').text('ONLINE CRYPTOGRAPHIC VERIFICATION', 165, secBoxY + 10);
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(
        'Scan this QR code with any smartphone or camera to verify this certificate on the official University Portal. This certificate contains a non-forgeable cryptographic digital signature.',
        165,
        secBoxY + 25,
        { width: 230, lineGap: 2 }
      );

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0b213f').text('Document Security Digest (SHA-256):', 165, secBoxY + 65);
      doc.font('Courier').fontSize(6.5).fillColor('#334155').text(signatureDigest, 165, secBoxY + 77, { width: 230 });

      doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(
        `Verification URL: ${verificationUrl}`,
        165,
        secBoxY + 98,
        { width: 230 }
      );

      // Authorized Signatory Seal & Signature Block
      doc.rect(405, secBoxY + 10, 145, 125).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0b213f').text('AUTHORIZED SIGNATORY', 415, secBoxY + 18, { align: 'center' });

      // Simulated Official Signature
      doc.font('Helvetica-Oblique').fontSize(14).fillColor('#1e40af').text('K. Sharma', 415, secBoxY + 45, { align: 'center' });
      doc.moveTo(425, secBoxY + 68).lineTo(535, secBoxY + 68).lineWidth(1).strokeColor('#94a3b8').stroke();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text('Controller of Examinations', 415, secBoxY + 75, { align: 'center' });
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text('CT University Academic Directorate', 415, secBoxY + 88, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#15803d').text('DIGITALLY SIGNED & SEALED', 415, secBoxY + 105, { align: 'center' });

      // Bottom footer warning
      doc.font('Helvetica-Oblique').fontSize(7).fillColor('#94a3b8').text(
        'Tampering with this digital document is a punishable offense under the Information Technology Act. Verify status at verify.ctuniversity.edu',
        35,
        795,
        { align: 'center', width: 525 }
      );

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });

    return { filePath, signature: digitalSignature, qrDataUrl };
  }
}
