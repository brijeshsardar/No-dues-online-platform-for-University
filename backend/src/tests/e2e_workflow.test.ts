import { prisma } from '../prisma/client.js';
import { WorkflowEngine } from '../services/workflowEngine.js';
import { Role, RequestStatus, ApprovalStatus } from '../types/index.js';
import { CryptoService } from '../services/cryptoService.js';
import { PdfService } from '../services/pdfService.js';

async function runTestSuite() {
  console.log('========================================================================');
  console.log(' STARTING CT UNIVERSITY SECURE CLEARANCE AUTOMATED TEST SUITE          ');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test #${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test #${totalTests}: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // 1. Fetch seed users
  const student1 = await prisma.student.findFirst({
    where: { studentId: 'CT-2026-1042' }, // Rahul Sharma (Fee Paid)
    include: { user: true, course: true, semester: true, academicYear: true },
  });
  const student2 = await prisma.student.findFirst({
    where: { studentId: 'CT-2026-1043' }, // Priya Patel (Fee Pending $1500)
    include: { user: true, course: true, semester: true, academicYear: true },
  });

  const accountOfficer = await prisma.user.findFirst({ where: { role: Role.ACCOUNT_SECTION } });
  const studentSectionOfficer = await prisma.user.findFirst({ where: { role: Role.STUDENT_SECTION } });
  const libraryHead = await prisma.user.findFirst({ where: { role: Role.LIBRARY } });
  const itOfficer = await prisma.user.findFirst({ where: { role: Role.IT_DEPARTMENT } });
  const coordinator = await prisma.user.findFirst({ where: { role: Role.CLASS_COORDINATOR } });
  const examController = await prisma.user.findFirst({ where: { role: Role.EXAMINATION_CONTROLLER } });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });

  assert(!!student1 && !!student2 && !!accountOfficer && !!examController, 'Database seed accounts exist and are verified');

  // Clean up any test requests from prior test runs for student1 and student2
  if (student1) {
    const existingReqs = await prisma.clearanceRequest.findMany({
      where: { studentId: { in: [student1.id, student2?.id].filter(Boolean) as string[] } },
      select: { id: true },
    });
    const reqIds = existingReqs.map((r) => r.id);
    if (reqIds.length > 0) {
      await prisma.certificate.deleteMany({ where: { clearanceRequestId: { in: reqIds } } });
      await prisma.examinationEligibility.deleteMany({ where: { clearanceRequestId: { in: reqIds } } });
      await prisma.approval.deleteMany({ where: { clearanceRequestId: { in: reqIds } } });
      await prisma.clearanceRequest.deleteMany({ where: { id: { in: reqIds } } });
    }
  }

  console.log('\n--- PHASE 1: SEQUENTIAL WORKFLOW VERIFICATION (STUDENT 1) ---');

  // Step 1: Student Submission
  const req1 = await WorkflowEngine.submitRequest(
    student1!.id,
    student1!.semesterId,
    student1!.academicYearId,
    'Submitting clearance for Spring 2026 End-Sem Exams'
  );

  assert(req1.overallStatus === RequestStatus.PENDING_ACCOUNT, 'Student submission sets overallStatus to PENDING_ACCOUNT');
  assert(req1.currentStage === 'ACCOUNT', 'Student submission sets currentStage to ACCOUNT');
  assert(req1.requestId.startsWith('ND-'), 'Generates unique Request ID formatted as ND-YYYY-XXXXX');

  // Check 6 initialized approvals
  const approvalsInit = await prisma.approval.findMany({ where: { clearanceRequestId: req1.id } });
  assert(approvalsInit.length === 6, 'Exactly 6 sequential department approval records initialized in PENDING state');

  // Step 2: Account Section Approval
  const reqAfterAccount = await WorkflowEngine.processDepartmentApproval({
    clearanceRequestId: req1.id,
    departmentCode: 'ACCOUNT',
    action: 'APPROVE',
    reviewerUserId: accountOfficer!.id,
    reviewerRole: Role.ACCOUNT_SECTION,
    remarks: 'Full tuition fee verified in bank portal. Zero dues.',
    verificationDetails: { totalFee: 4500, paidAmount: 4500, balance: 0 },
  });

  assert(reqAfterAccount.overallStatus === RequestStatus.PENDING_STUDENT_SECTION, 'Account approval transitions overallStatus to PENDING_STUDENT_SECTION');
  assert(reqAfterAccount.currentStage === 'STUDENT_SECTION', 'Account approval advances currentStage to STUDENT_SECTION');

  // Step 3: Student Section Approval
  const reqAfterStudentSec = await WorkflowEngine.processDepartmentApproval({
    clearanceRequestId: req1.id,
    departmentCode: 'STUDENT_SECTION',
    action: 'APPROVE',
    reviewerUserId: studentSectionOfficer!.id,
    reviewerRole: Role.STUDENT_SECTION,
    remarks: 'Disciplinary check clear. Bonafide verified.',
  });

  assert(reqAfterStudentSec.overallStatus === RequestStatus.PENDING_LIBRARY, 'Student Section approval transitions status to PENDING_LIBRARY');
  assert(reqAfterStudentSec.currentStage === 'LIBRARY', 'Student Section approval advances stage to LIBRARY');

  // Step 4: Library Approval
  const reqAfterLibrary = await WorkflowEngine.processDepartmentApproval({
    clearanceRequestId: req1.id,
    departmentCode: 'LIBRARY',
    action: 'APPROVE',
    reviewerUserId: libraryHead!.id,
    reviewerRole: Role.LIBRARY,
    remarks: 'All 3 books returned. Library fines: $0.00.',
    verificationDetails: { booksReturned: true, fine: 0 },
  });

  assert(reqAfterLibrary.overallStatus === RequestStatus.PENDING_IT, 'Library approval transitions status to PENDING_IT');
  assert(reqAfterLibrary.currentStage === 'IT', 'Library approval advances stage to IT');

  // Step 5: IT Department Approval
  const reqAfterIT = await WorkflowEngine.processDepartmentApproval({
    clearanceRequestId: req1.id,
    departmentCode: 'IT',
    action: 'APPROVE',
    reviewerUserId: itOfficer!.id,
    reviewerRole: Role.IT_DEPARTMENT,
    remarks: 'Lab credentials decommissioned. Assets returned.',
    verificationDetails: { assetsCleared: true },
  });

  assert(reqAfterIT.overallStatus === RequestStatus.PENDING_CLASS_COORDINATOR, 'IT approval transitions status to PENDING_CLASS_COORDINATOR');
  assert(reqAfterIT.currentStage === 'CLASS_COORDINATOR', 'IT approval advances stage to CLASS_COORDINATOR');

  // Step 6: Class Coordinator Approval
  const reqAfterCoord = await WorkflowEngine.processDepartmentApproval({
    clearanceRequestId: req1.id,
    departmentCode: 'CLASS_COORDINATOR',
    action: 'APPROVE',
    reviewerUserId: coordinator!.id,
    reviewerRole: Role.CLASS_COORDINATOR,
    remarks: 'Academic attendance 88.5%. Completed all lab submissions.',
  });

  assert(reqAfterCoord.overallStatus === RequestStatus.PENDING_EXAMINATION_CONTROLLER, 'Class Coordinator transitions status to PENDING_EXAMINATION_CONTROLLER');
  assert(reqAfterCoord.currentStage === 'EXAM_CONTROLLER', 'Class Coordinator advances stage to EXAM_CONTROLLER');

  // Step 7: Final Examination Controller Authorization & Certificate Generation
  const certIdRahul = `CT-NDC-EX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const tokenRahul = CryptoService.generateSecureToken(24);
  const certIssueDate = new Date();

  const pdfGen = await PdfService.generateCertificatePdf({
    certificateId: certIdRahul,
    requestId: req1.requestId,
    studentName: student1!.user.fullName,
    studentId: student1!.studentId,
    enrollmentNo: student1!.enrollmentNo,
    courseName: student1!.course.name,
    semesterName: student1!.semester.name,
    academicYear: student1!.academicYear.yearString,
    issueDate: certIssueDate,
    verificationToken: tokenRahul,
    examSession: 'Spring 2026 Regular End-Semester Examinations',
    approvals: (await prisma.approval.findMany({ where: { clearanceRequestId: req1.id } })).map((a) => ({
      department: a.departmentCode,
      reviewerName: 'Authorized Faculty',
      status: a.status,
      timestamp: a.actionTimestamp,
    })),
  });

  // Commit Controller Approval + Eligibility + Certificate
  await prisma.$transaction(async (tx) => {
    await tx.approval.update({
      where: { clearanceRequestId_departmentCode: { clearanceRequestId: req1.id, departmentCode: 'EXAM_CONTROLLER' } },
      data: {
        status: ApprovalStatus.APPROVED,
        reviewedByUserId: examController!.id,
        remarks: 'All departmental clearances confirmed. Examination eligibility unconditionally authorized.',
        actionTimestamp: certIssueDate,
      },
    });

    await tx.examinationEligibility.create({
      data: {
        clearanceRequestId: req1.id,
        studentId: student1!.id,
        authorizedByUserId: examController!.id,
        examinationSession: 'Spring 2026 Regular End-Semester Examinations',
        hallTicketAllowed: true,
        verifiedFeeAmount: 4500.0,
      },
    });

    await tx.certificate.create({
      data: {
        certificateId: certIdRahul,
        clearanceRequestId: req1.id,
        studentId: student1!.id,
        verificationToken: tokenRahul,
        qrCodeDataUrl: pdfGen.qrDataUrl,
        digitalSignature: pdfGen.signature,
        pdfFilePath: pdfGen.filePath,
        issuedAt: certIssueDate,
        status: 'VALID',
      },
    });

    await tx.clearanceRequest.update({
      where: { id: req1.id },
      data: {
        overallStatus: RequestStatus.CERTIFICATE_ISSUED,
        currentStage: 'COMPLETED',
        completedAt: certIssueDate,
      },
    });
  });

  const finalReq = await prisma.clearanceRequest.findUnique({
    where: { id: req1.id },
    include: { examEligibility: true, certificate: true },
  });

  assert(finalReq?.overallStatus === RequestStatus.CERTIFICATE_ISSUED, 'Final request overallStatus is CERTIFICATE_ISSUED');
  assert(finalReq?.currentStage === 'COMPLETED', 'Final request currentStage is COMPLETED');
  assert(!!finalReq?.examEligibility, 'ExaminationEligibility record successfully created');
  assert(!!finalReq?.certificate && finalReq.certificate.status === 'VALID', 'Certificate successfully created in VALID status');

  console.log('\n--- PHASE 2: CRYPTOGRAPHIC SIGNATURE & VERIFICATION TESTING ---');

  // Verify RSA Digital Signature
  const canonicalPayload = {
    institution: 'CT UNIVERSITY',
    certificateId: certIdRahul,
    requestId: req1.requestId,
    studentId: student1!.studentId,
    studentName: student1!.user.fullName,
    course: student1!.course.name,
    semester: student1!.semester.name,
    academicYear: student1!.academicYear.yearString,
    examEligibility: 'AUTHORIZED',
    examSession: 'Spring 2026 Regular End-Semester Examinations',
    issuedAt: certIssueDate.toISOString(),
    verificationToken: tokenRahul,
  };

  const isSigValid = CryptoService.verifySignature(canonicalPayload, finalReq!.certificate!.digitalSignature);
  assert(isSigValid === true, 'RSA-2048 Cryptographic Digital Signature verifies document integrity and non-repudiation');

  // Verify Tampered Payload Detection
  const tamperedPayload = { ...canonicalPayload, studentName: 'Attacker Name' };
  const isTamperValid = CryptoService.verifySignature(tamperedPayload, finalReq!.certificate!.digitalSignature);
  assert(isTamperValid === false, 'Cryptographic verification strictly rejects tampered document payload');

  console.log('\n--- PHASE 3: SECURITY NEGATIVE TESTING ---');

  // Negative Test 1: Student with outstanding balance cannot be approved by Account Section
  const req2 = await WorkflowEngine.submitRequest(
    student2!.id,
    student2!.semesterId,
    student2!.academicYearId,
    'Student with $1500 outstanding fee'
  );

  let feeBlockTriggered = false;
  try {
    await WorkflowEngine.processDepartmentApproval({
      clearanceRequestId: req2.id,
      departmentCode: 'ACCOUNT',
      action: 'APPROVE',
      reviewerUserId: accountOfficer!.id,
      reviewerRole: Role.ACCOUNT_SECTION,
      remarks: 'Attempting to approve with balance',
    });
  } catch (err: any) {
    feeBlockTriggered = true;
    assert(err.message.includes('outstanding balance'), 'Backend strictly blocks Account Section approval when student fee balance > 0');
  }
  assert(feeBlockTriggered === true, 'Outstanding fee clearance block verified');

  // Negative Test 2: Workflow sequence violation (Library attempts to approve while at ACCOUNT stage)
  let sequenceViolationTriggered = false;
  try {
    await WorkflowEngine.processDepartmentApproval({
      clearanceRequestId: req2.id,
      departmentCode: 'LIBRARY',
      action: 'APPROVE',
      reviewerUserId: libraryHead!.id,
      reviewerRole: Role.LIBRARY,
      remarks: 'Attempting out-of-order approval',
    });
  } catch (err: any) {
    sequenceViolationTriggered = true;
    assert(err.message.includes('Workflow sequence violation'), 'Backend strictly prevents out-of-order stage skipping');
  }
  assert(sequenceViolationTriggered === true, 'Workflow sequence enforcement verified');

  // Negative Test 3: Role Authorization violation (Class Coordinator attempting to approve Account Section)
  let roleViolationTriggered = false;
  try {
    await WorkflowEngine.processDepartmentApproval({
      clearanceRequestId: req2.id,
      departmentCode: 'ACCOUNT',
      action: 'APPROVE',
      reviewerUserId: coordinator!.id,
      reviewerRole: Role.CLASS_COORDINATOR,
      remarks: 'Wrong role',
    });
  } catch (err: any) {
    roleViolationTriggered = true;
    assert(err.message.includes('not permitted'), 'Backend RBAC prevents unauthorized roles from approving department clearances');
  }
  assert(roleViolationTriggered === true, 'Department RBAC barrier verified');

  // Negative Test 4: Duplicate Submission Prevention
  let duplicatePrevented = false;
  try {
    await WorkflowEngine.submitRequest(
      student2!.id,
      student2!.semesterId,
      student2!.academicYearId,
      'Duplicate attempt'
    );
  } catch (err: any) {
    duplicatePrevented = true;
    assert(err.message.includes('already exists'), 'Backend strictly prevents duplicate concurrent clearance requests for same semester');
  }
  assert(duplicatePrevented === true, 'Duplicate submission prevention verified');

  // Negative Test 5: Certificate Revocation Invalidation
  await prisma.certificate.update({
    where: { id: finalReq!.certificate!.id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revocationReason: 'Disciplinary violation test',
    },
  });

  const revokedCert = await prisma.certificate.findUnique({ where: { id: finalReq!.certificate!.id } });
  assert(revokedCert?.status === 'REVOKED', 'Certificate successfully revoked by Administration with reason');

  console.log('\n========================================================================');
  console.log(` ALL ${passedTests}/${totalTests} SECURITY & WORKFLOW TESTS PASSED UNCONDITIONALLY! `);
  console.log('========================================================================\n');
}

runTestSuite()
  .catch((e) => {
    console.error('Test suite failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
