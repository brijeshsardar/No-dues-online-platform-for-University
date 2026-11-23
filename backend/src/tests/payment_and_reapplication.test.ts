import { prisma } from '../prisma/client.js';
import { WorkflowEngine } from '../services/workflowEngine.js';
import { Role, RequestStatus, ApprovalStatus } from '../types/index.js';

async function runPaymentAndReapplicationTests() {
  console.log('========================================================================');
  console.log(' STARTING PAYMENT MANAGEMENT & CRITICAL REAPPLICATION TEST SUITE        ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] #${total}: ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] #${total}: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  const BASE_URL = 'http://localhost:5000/api';

  // 1. Authenticate Account Officer
  const resAccLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'account@ctuniversity.edu', password: 'Password123!', expectedRole: 'ACCOUNT_SECTION' }),
  });
  const dataAcc: any = await resAccLogin.json();
  assert(resAccLogin.ok && !!dataAcc.token, 'Account Section officer logs in');

  // 2. Authenticate Student 2 (Priya Patel: priya.patel@ctuniversity.edu / CT-2026-1043)
  const resStuLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.patel@ctuniversity.edu', password: 'Password123!', expectedRole: 'STUDENT' }),
  });
  const dataStu: any = await resStuLogin.json();
  assert(resStuLogin.ok && !!dataStu.token, 'Student 2 (Priya Patel) logs in');

  // 3. Authenticate IT Department
  const resItLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'itdept@ctuniversity.edu', password: 'Password123!', expectedRole: 'IT_DEPARTMENT' }),
  });
  const dataIt: any = await resItLogin.json();
  assert(resItLogin.ok && !!dataIt.token, 'IT Department officer logs in');

  // 4. Authenticate Library
  const resLibLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'library@ctuniversity.edu', password: 'Password123!', expectedRole: 'LIBRARY' }),
  });
  const dataLib: any = await resLibLogin.json();
  assert(resLibLogin.ok && !!dataLib.token, 'Library officer logs in');

  // 5. Authenticate Student Section
  const resStuSecLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'studentsection@ctuniversity.edu', password: 'Password123!', expectedRole: 'STUDENT_SECTION' }),
  });
  const dataStuSec: any = await resStuSecLogin.json();
  assert(resStuSecLogin.ok && !!dataStuSec.token, 'Student Section officer logs in');

  // 6. Authenticate Coordinator
  const resCoordLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coordinator@ctuniversity.edu', password: 'Password123!', expectedRole: 'FACULTY' }),
  });
  const dataCoord: any = await resCoordLogin.json();
  assert(resCoordLogin.ok && !!dataCoord.token, 'Coordinator logs in');

  // 7. Authenticate Exam Controller
  const resExamLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'examcontroller@ctuniversity.edu', password: 'Password123!', expectedRole: 'EXAMINATION_CONTROLLER' }),
  });
  const dataExam: any = await resExamLogin.json();
  assert(resExamLogin.ok && !!dataExam.token, 'Exam Controller logs in');

  console.log('\n--- SECTION 1: ACCOUNT SECTION PAYMENT & FEE MANAGEMENT ---');

  // Find Student 2's Fee Record
  const student2 = await prisma.student.findFirst({
    where: { studentId: 'CT-2026-1043' },
    include: { feeRecords: true },
  });
  const feeRecord = student2!.feeRecords[0];
  assert(!!feeRecord, 'Student 2 fee record located in database');

  // Test 1.1: Edit Total Fee Amount with Audit Log
  const resEditFee = await fetch(`${BASE_URL}/fees/update-total-fee`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAcc.token}` },
    body: JSON.stringify({
      feeRecordId: feeRecord.id,
      newTotalFee: 10000,
      reason: 'Standard semester fee structure update for testing',
    }),
  });
  const dataEditFee: any = await resEditFee.json();
  assert(resEditFee.ok && dataEditFee.feeRecord.totalFee === 10000, 'Total fee updated to ₹10,000 by Account Section');
  assert(dataEditFee.feeRecord.outstandingBalance === 10000 - feeRecord.paidAmount, 'Remaining balance updated accordingly');

  // Reset paid amount to 0 for clean demonstration of the prompt workflow:
  // Prompt example: Total Fee = 10,000, Paid = 5,000, Balance = 5,000. Then pays 3,000 -> Total Paid = 8,000, Balance = 2,000.
  await prisma.feeRecord.update({
    where: { id: feeRecord.id },
    data: { paidAmount: 0, outstandingBalance: 10000, paymentStatus: 'PENDING' },
  });
  await prisma.paymentTransaction.deleteMany({ where: { feeRecordId: feeRecord.id } });

  // Test 1.2: Record Initial Payment: ₹5,000
  const resPay1 = await fetch(`${BASE_URL}/fees/record-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAcc.token}` },
    body: JSON.stringify({
      feeRecordId: feeRecord.id,
      amount: 5000,
      paymentMode: 'NET_BANKING',
      transactionRef: 'NB-2026-001',
      remarks: 'First installment payment',
    }),
  });
  const dataPay1: any = await resPay1.json();
  assert(resPay1.ok && dataPay1.success, 'First payment of ₹5,000 recorded');
  assert(dataPay1.transaction.previousTotalPaid === 0, 'Previous paid was ₹0');
  assert(dataPay1.transaction.newTotalPaid === 5000, 'New total paid is ₹5,000');
  assert(dataPay1.transaction.remainingBalance === 5000, 'Remaining balance is ₹5,000');
  assert(dataPay1.feeRecord.paymentStatus === 'PARTIAL', 'Status updated to PARTIAL');
  assert(dataPay1.transaction.receiptNumber.startsWith('RCPT-'), 'Receipt number formatted as RCPT-YYYY-XXXXX');

  const receipt1 = dataPay1.transaction.receiptNumber;

  // Test 1.3: Record Second Payment: ₹3,000 (Exact prompt example)
  const resPay2 = await fetch(`${BASE_URL}/fees/record-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAcc.token}` },
    body: JSON.stringify({
      feeRecordId: feeRecord.id,
      amount: 3000,
      paymentMode: 'UPI',
      transactionRef: 'UPI-2026-9812',
      remarks: 'Second installment payment',
    }),
  });
  const dataPay2: any = await resPay2.json();
  assert(resPay2.ok && dataPay2.success, 'Second payment of ₹3,000 recorded');
  assert(dataPay2.transaction.previousTotalPaid === 5000, 'Previous payment was ₹5,000');
  assert(dataPay2.transaction.newTotalPaid === 8000, 'Total paid automatically calculated as ₹8,000');
  assert(dataPay2.transaction.remainingBalance === 2000, 'Remaining balance automatically calculated as ₹2,000');
  assert(dataPay2.feeRecord.paymentStatus === 'PARTIAL', 'Status remains PARTIAL');

  // Test 1.4: Student Dashboard verifies updated payment information
  const resStuFee = await fetch(`${BASE_URL}/student/fee-details`, {
    headers: { Authorization: `Bearer ${dataStu.token}` },
  });
  const dataStuFee: any = await resStuFee.json();
  assert(resStuFee.ok && dataStuFee.feeRecord.totalFee === 10000, 'Student sees Total Fee ₹10,000');
  assert(dataStuFee.feeRecord.paidAmount === 8000, 'Student sees Total Paid ₹8,000');
  assert(dataStuFee.feeRecord.outstandingBalance === 2000, 'Student sees Remaining Balance ₹2,000');
  assert(dataStuFee.feeRecord.transactions.length === 2, 'Student sees complete history of 2 transactions');

  // Test 1.5: Final Payment: ₹2,000 to achieve zero balance
  const resPay3 = await fetch(`${BASE_URL}/fees/record-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAcc.token}` },
    body: JSON.stringify({
      feeRecordId: feeRecord.id,
      amount: 2000,
      paymentMode: 'CASH',
      transactionRef: 'CASH-REC-1043',
      remarks: 'Final balance clearance',
    }),
  });
  const dataPay3: any = await resPay3.json();
  assert(resPay3.ok && dataPay3.feeRecord.outstandingBalance === 0, 'Final payment clears balance to ₹0.00');
  assert(dataPay3.feeRecord.paymentStatus === 'PAID', 'Fee status automatically updated to PAID');

  // Test 1.6: Fetch official receipt endpoint
  const resGetRcpt = await fetch(`${BASE_URL}/fees/receipts/${receipt1}`, {
    headers: { Authorization: `Bearer ${dataStu.token}` },
  });
  const dataGetRcpt: any = await resGetRcpt.json();
  assert(resGetRcpt.ok && dataGetRcpt.transaction.receiptNumber === receipt1, 'Official receipt retrieved by receipt number');

  console.log('\n--- SECTION 2: DEPARTMENT-WISE CLEARANCE & CRITICAL REAPPLICATION ---');

  // Clean any existing request for student 2 so we can submit a fresh one
  await prisma.clearanceRequest.deleteMany({ where: { studentId: student2!.id } });

  // Test 2.1: Student submits clearance request
  const resSubmit = await fetch(`${BASE_URL}/student/requests/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataStu.token}` },
    body: JSON.stringify({ remarks: 'Clearance request for Priya Patel' }),
  });
  const dataSubmit: any = await resSubmit.json();
  assert(resSubmit.ok && dataSubmit.success, 'Student submits clearance request');
  const reqId = dataSubmit.request.id;

  // Test 2.2: Account Section approves (balance is 0)
  const resAccApprove = await fetch(`${BASE_URL}/clearance/${reqId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAcc.token}` },
    body: JSON.stringify({ remarks: 'Fee records verified. ₹0 balance.' }),
  });
  assert(resAccApprove.ok, 'Account Section approves clearance');

  // Test 2.3: Student Section approves
  const resStuSecApprove = await fetch(`${BASE_URL}/clearance/${reqId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataStuSec.token}` },
    body: JSON.stringify({ remarks: 'Student affairs cleared.' }),
  });
  assert(resStuSecApprove.ok, 'Student Section approves clearance');

  // Test 2.4: Library approves
  const resLibApprove = await fetch(`${BASE_URL}/clearance/${reqId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataLib.token}` },
    body: JSON.stringify({ remarks: 'All textbooks returned. ₹0 library dues.' }),
  });
  assert(resLibApprove.ok, 'Library approves clearance');

  // Test 2.5: IT Department REJECTS (with reason)
  const resItReject = await fetch(`${BASE_URL}/clearance/${reqId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataIt.token}` },
    body: JSON.stringify({
      remarks: 'Student has unreturned IoT lab microcontrollers and sensor kit',
      reason: 'Student has unreturned IoT lab microcontrollers and sensor kit',
    }),
  });
  const dataItReject: any = await resItReject.json();
  assert(resItReject.ok && dataItReject.success, 'IT Department rejects request with specific reason');

  // Test 2.6: CRITICAL VERIFICATION - Only IT is rejected; Account, Student Section, and Library remain APPROVED!
  const reqDbCheck1 = await prisma.clearanceRequest.findUnique({
    where: { id: reqId },
    include: { approvals: true },
  });
  assert(reqDbCheck1?.overallStatus === 'REJECTED', 'Clearance overallStatus is REJECTED');

  const accApp = reqDbCheck1?.approvals.find((a) => a.departmentCode === 'ACCOUNT');
  const stuSecApp = reqDbCheck1?.approvals.find((a) => a.departmentCode === 'STUDENT_SECTION');
  const libApp = reqDbCheck1?.approvals.find((a) => a.departmentCode === 'LIBRARY');
  const itApp = reqDbCheck1?.approvals.find((a) => a.departmentCode === 'IT');

  assert(accApp?.status === 'APPROVED', 'CRITICAL: Account Section approval REMAINS APPROVED');
  assert(stuSecApp?.status === 'APPROVED', 'CRITICAL: Student Section approval REMAINS APPROVED');
  assert(libApp?.status === 'APPROVED', 'CRITICAL: Library approval REMAINS APPROVED');
  assert(itApp?.status === 'REJECTED', 'IT Department status is REJECTED');
  assert(Boolean(itApp?.rejectionReason?.includes('unreturned IoT')), 'IT Department rejection reason preserved');

  // Test 2.7: Student reapplies ONLY to IT Department
  const resReapply = await fetch(`${BASE_URL}/student/requests/${reqId}/reapply/IT`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataStu.token}` },
    body: JSON.stringify({
      remarks: 'Returned all IoT sensor kits to Lab Engineer Mr. Verma today morning (Lab 304).',
    }),
  });
  const dataReapply: any = await resReapply.json();
  assert(resReapply.ok && dataReapply.success, 'Student submits reapplication specifically to IT Department');

  // Test 2.8: Verify reapplication state
  const reqDbCheck2 = await prisma.clearanceRequest.findUnique({
    where: { id: reqId },
    include: { approvals: true },
  });
  const itAppAfterReapply = reqDbCheck2?.approvals.find((a) => a.departmentCode === 'IT');
  assert(itAppAfterReapply?.status === 'REAPPLICATION_SUBMITTED', 'IT status transitioned to REAPPLICATION_SUBMITTED');
  assert(Boolean(itAppAfterReapply?.reapplicationRemarks?.includes('Returned all IoT sensor kits')), 'Student reapplication response recorded');
  assert(reqDbCheck2?.approvals.find((a) => a.departmentCode === 'ACCOUNT')?.status === 'APPROVED', 'Account approval still APPROVED');
  assert(reqDbCheck2?.approvals.find((a) => a.departmentCode === 'LIBRARY')?.status === 'APPROVED', 'Library approval still APPROVED');

  // Test 2.9: IT Officer reviews reapplication queue and approves IT
  const resItReApprove = await fetch(`${BASE_URL}/clearance/${reqId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataIt.token}` },
    body: JSON.stringify({
      remarks: 'Reapplication approved: Hardware return confirmed with Lab 304 staff.',
    }),
  });
  const dataItReApprove: any = await resItReApprove.json();
  assert(resItReApprove.ok && dataItReApprove.success, 'IT Officer re-approves request after verifying student response');

  // Test 2.10: Verify workflow progressed to Class Coordinator without restarting Account or Library
  const reqDbCheck3 = await prisma.clearanceRequest.findUnique({
    where: { id: reqId },
    include: { approvals: true },
  });
  assert(reqDbCheck3?.overallStatus === 'PENDING_CLASS_COORDINATOR', 'Overall status seamlessly advanced to PENDING_CLASS_COORDINATOR');
  assert(reqDbCheck3?.currentStage === 'CLASS_COORDINATOR', 'Current stage advanced to CLASS_COORDINATOR');

  // Test 2.11: Class Coordinator approves
  const resCoordApprove = await fetch(`${BASE_URL}/clearance/${reqId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataCoord.token}` },
    body: JSON.stringify({
      departmentCode: 'CLASS_COORDINATOR',
      remarks: 'All 4 prior departments cleared. Academic standing verified.',
    }),
  });
  assert(resCoordApprove.ok, 'Class Coordinator approves clearance');

  // Test 2.12: Exam Controller final authorization & certificate issuance
  const resExamAuth = await fetch(`${BASE_URL}/exam-controller/${reqId}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataExam.token}` },
    body: JSON.stringify({
      examSession: 'Spring 2026 Regular End-Semester Examinations',
      remarks: 'All prerequisite clearances verified. Digital certificate granted.',
    }),
  });
  const dataExamAuth: any = await resExamAuth.json();
  assert(resExamAuth.ok && dataExamAuth.success, 'Controller of Examinations grants final authorization');
  assert(!!dataExamAuth.certificateId, 'Official clearance certificate issued to student');

  // Test 2.13: Final Certificate Status in Database
  const finalCert = await prisma.certificate.findFirst({
    where: { clearanceRequestId: reqId },
  });
  assert(!!finalCert && finalCert.status === 'VALID', 'Certificate valid and cryptographically active in database');

  console.log(`\n========================================================================`);
  console.log(` ALL ${passed}/${total} PAYMENT & REAPPLICATION TESTS PASSED! `);
  console.log(`========================================================================\n`);
}

runPaymentAndReapplicationTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
