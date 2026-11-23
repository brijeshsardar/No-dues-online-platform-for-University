import { prisma } from '../prisma/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Role } from '../types/index.js';

async function runAuthIsolationTests() {
  console.log('========================================================================');
  console.log(' STARTING ROLE-BASED LOGIN & SESSION ISOLATION TEST SUITE               ');
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

  // Test 1: Student 1 Login with Email
  const res1 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul.sharma@ctuniversity.edu', password: 'Password123!', expectedRole: 'STUDENT' }),
  });
  const data1: any = await res1.json();
  if (!res1.ok) {
    console.log('Login failed with status', res1.status, data1);
  }
  assert(res1.ok && data1.success && data1.user.role === 'STUDENT', 'Student 1 logs in successfully with email');
  assert(data1.user.fullName === 'Rahul Sharma', 'Student 1 receives Rahul Sharma authenticated identity');

  // Test 2: Student 1 Login with Student ID (CT-2026-1042)
  const res2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'CT-2026-1042', password: 'Password123!', expectedRole: 'STUDENT' }),
  });
  const data2: any = await res2.json();
  assert(res2.ok && data2.success && data2.user.email === 'rahul.sharma@ctuniversity.edu', 'Student 1 logs in using institutional Student ID');

  // Test 3: Student 2 Login (Priya Patel - Pending Fee)
  const res3 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.patel@ctuniversity.edu', password: 'Password123!', expectedRole: 'STUDENT' }),
  });
  const data3: any = await res3.json();
  assert(res3.ok && data3.user.fullName === 'Priya Patel', 'Student 2 logs in with Priya Patel isolated identity');

  // Test 4: Session Isolation - Priya's token queries fee details
  const resPriyaFee = await fetch(`${BASE_URL}/student/fee-details`, {
    headers: { Authorization: `Bearer ${data3.token}` },
  });
  const priyaFeeData: any = await resPriyaFee.json();
  assert(resPriyaFee.ok && priyaFeeData.feeRecord && priyaFeeData.feeRecord.student?.user?.fullName === 'Priya Patel', 'Student 2 session strictly isolated: accesses only Priya Patel fee records');

  // Test 5: Session Isolation - Rahul's token queries fee details
  const resRahulFee = await fetch(`${BASE_URL}/student/fee-details`, {
    headers: { Authorization: `Bearer ${data1.token}` },
  });
  const rahulFeeData: any = await resRahulFee.json();
  assert(resRahulFee.ok && rahulFeeData.feeRecord.outstandingBalance === 0, 'Student 1 session strictly isolated: sees $0.00 clean fee balance');

  // Test 6: Cross-Portal Defense - Student attempting Admin Login
  const resStudentToAdmin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul.sharma@ctuniversity.edu', password: 'Password123!', expectedRole: 'ADMIN' }),
  });
  assert(resStudentToAdmin.status === 403, 'Backend strictly blocks Student from logging into Admin portal (403)');

  // Test 7: Cross-Portal Defense - Student attempting Faculty Login
  const resStudentToFaculty = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul.sharma@ctuniversity.edu', password: 'Password123!', expectedRole: 'FACULTY' }),
  });
  assert(resStudentToFaculty.status === 403, 'Backend strictly blocks Student from logging into Faculty portal (403)');

  // Test 8: Cross-Portal Defense - Admin attempting Student Login
  const resAdminToStudent = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ctuniversity.edu', password: 'Password123!', expectedRole: 'STUDENT' }),
  });
  assert(resAdminToStudent.status === 403, 'Backend strictly blocks Admin from logging into Student portal (403)');

  // Test 9: Cross-Portal Defense - IT Department attempting Exam Controller Login
  const resItToExam = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'itdept@ctuniversity.edu', password: 'Password123!', expectedRole: 'EXAMINATION_CONTROLLER' }),
  });
  assert(resItToExam.status === 403, 'Backend strictly blocks IT Department from logging into Exam Controller portal (403)');

  // Test 10: Faculty / Coordinator Login & API Access
  const resCoord = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coordinator@ctuniversity.edu', password: 'Password123!', expectedRole: 'FACULTY' }),
  });
  const dataCoord: any = await resCoord.json();
  assert(resCoord.ok && dataCoord.user.role === 'CLASS_COORDINATOR', 'Class Coordinator logs into Faculty Portal successfully');

  // Test 11: Faculty API Access
  const resFacultyStudents = await fetch(`${BASE_URL}/faculty/students`, {
    headers: { Authorization: `Bearer ${dataCoord.token}` },
  });
  const dataFacultyStudents: any = await resFacultyStudents.json();
  assert(resFacultyStudents.ok && dataFacultyStudents.students.length > 0, 'Coordinator accesses faculty students roster');

  // Test 12: RBAC Protection - Student cannot access Faculty API
  const resStudentFacultyAccess = await fetch(`${BASE_URL}/faculty/students`, {
    headers: { Authorization: `Bearer ${data1.token}` },
  });
  assert(resStudentFacultyAccess.status === 403, 'Backend RBAC strictly blocks student token from /api/faculty/students');

  // Test 13: Forgot Password Endpoint
  const resForgot = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CT-2026-1042' }),
  });
  const dataForgot: any = await resForgot.json();
  assert(resForgot.ok && dataForgot.success, 'Forgot password handles student ID and dispatches reset instructions');

  console.log(`\n========================================================================`);
  console.log(` ALL ${passed}/${total} AUTHENTICATION & ROLE ISOLATION TESTS PASSED! `);
  console.log(`========================================================================`);
}

runAuthIsolationTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
