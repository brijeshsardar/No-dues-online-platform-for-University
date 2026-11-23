import { prisma } from '../prisma/client.js';

async function runStudentSectionTests() {
  console.log('========================================================================');
  console.log(' STARTING STUDENT SECTION: ROLE, LOGIN, REGISTRATION & DASHBOARD TESTS  ');
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

  // 1. Authenticate as Student Section Officer
  console.log('\n--- 1. AUTHENTICATION & ROLE SEPARATION ---');
  const resLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'studentsection@ctuniversity.edu',
      password: 'Password123!',
      expectedRole: 'STUDENT_SECTION',
    }),
  });
  const dataLogin: any = await resLogin.json();
  assert(resLogin.status === 200, 'Student Section credentials authenticate with 200 OK');
  assert(dataLogin.user.role === 'STUDENT_SECTION', 'Returned user role is strictly STUDENT_SECTION');
  const studentSectionToken = dataLogin.token;

  // 2. Reject unauthorized role on Student Section Login portal
  const resStudentBlocked = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rahul.sharma@ctuniversity.edu',
      password: 'Password123!',
      expectedRole: 'STUDENT_SECTION',
    }),
  });
  assert(resStudentBlocked.status === 403, 'Student account blocked from Student Section login terminal (403)');

  // 3. Reject faculty role on Student Section Login portal
  const resFacultyBlocked = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'coordinator@ctuniversity.edu',
      password: 'Password123!',
      expectedRole: 'STUDENT_SECTION',
    }),
  });
  assert(resFacultyBlocked.status === 403, 'Faculty account blocked from Student Section login terminal (403)');

  // 4. Test Student Section Stats Overview
  console.log('\n--- 2. STUDENT SECTION DASHBOARD METRICS ---');
  const resStats = await fetch(`${BASE_URL}/student-section/stats`, {
    headers: { Authorization: `Bearer ${studentSectionToken}` },
  });
  const dataStats: any = await resStats.json();
  assert(resStats.status === 200, 'Student Section dashboard stats retrieved with 200 OK');
  assert(typeof dataStats.stats.totalStudents === 'number', 'Stats contains totalStudents count');
  assert(typeof dataStats.stats.activeStudents === 'number', 'Stats contains activeStudents count');

  // 5. Fetch Courses and Semesters
  console.log('\n--- 3. ACADEMIC STRUCTURE ---');
  const resCourses = await fetch(`${BASE_URL}/student-section/courses`, {
    headers: { Authorization: `Bearer ${studentSectionToken}` },
  });
  const dataCourses: any = await resCourses.json();
  assert(resCourses.status === 200, 'Courses list retrieved with 200 OK');
  assert(dataCourses.courses.length > 0, 'At least 1 course program is available');
  const courseId = dataCourses.courses[0].id;

  const resSemesters = await fetch(`${BASE_URL}/student-section/semesters`, {
    headers: { Authorization: `Bearer ${studentSectionToken}` },
  });
  const dataSemesters: any = await resSemesters.json();
  assert(resSemesters.status === 200, 'Semesters list retrieved with 200 OK');
  assert(dataSemesters.semesters.length > 0, 'Semesters list populated');
  const semesterId = dataSemesters.semesters[0].id;

  // 6. Register a New Student via Student Section
  console.log('\n--- 4. STUDENT REGISTRATION & ACCOUNT GENERATION ---');
  const randNum = Date.now().toString().slice(-4);
  const testStudentId = `CT-2026-REG-${randNum}`;
  const testEmail = `student.sec.${randNum}@ctuniversity.edu`;

  const resRegister = await fetch(`${BASE_URL}/student-section/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentSectionToken}`,
    },
    body: JSON.stringify({
      fullName: `Harsh Vardhan ${randNum}`,
      fatherName: 'Rajendra Vardhan',
      motherName: 'Kavita Vardhan',
      dob: '2004-08-14',
      gender: 'Male',
      phone: `+91-987654${randNum}`,
      email: testEmail,
      address: 'Hostel Block D, Room 302',
      studentId: testStudentId,
      rollNumber: `EN2026${randNum}`,
      admissionNumber: `ADM2026${randNum}`,
      courseId,
      semesterId,
      academicSession: '2025-2026',
      enrollmentStatus: 'ACTIVE',
      password: 'StudentPass123!',
    }),
  });
  const dataRegister: any = await resRegister.json();
  assert(resRegister.status === 201, `New student registered with 201 Created (got ${resRegister.status})`);
  assert(dataRegister.student.studentId === testStudentId, 'Registration number saved correctly');
  assert(dataRegister.student.user.email === testEmail, 'Student user email generated correctly');
  const studentDbId = dataRegister.student.id;

  // 7. Prevent Duplicate Registration
  console.log('\n--- 5. DUPLICATE ENROLLMENT PREVENTION ---');
  const resDuplicate = await fetch(`${BASE_URL}/student-section/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentSectionToken}`,
    },
    body: JSON.stringify({
      fullName: 'Duplicate Student',
      email: testEmail, // duplicate email
      studentId: testStudentId, // duplicate student ID
      courseId,
      semesterId,
    }),
  });
  assert(resDuplicate.status === 400, 'Duplicate student registration blocked with 400 Bad Request');

  // 8. Log In with Newly Created Student Credentials
  console.log('\n--- 6. VERIFY NEW STUDENT AUTHENTICATED SESSION ---');
  const resNewStudentLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'StudentPass123!',
      expectedRole: 'STUDENT',
    }),
  });
  const dataNewStudentLogin: any = await resNewStudentLogin.json();
  assert(resNewStudentLogin.status === 200, 'New student logs in successfully with generated credentials');
  assert(dataNewStudentLogin.user.role === 'STUDENT', 'New user authenticated strictly with STUDENT role');

  // 9. Update Student Profile via Student Section
  console.log('\n--- 7. PROFILE & ACADEMIC UPDATES ---');
  const resUpdate = await fetch(`${BASE_URL}/student-section/students/${studentDbId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentSectionToken}`,
    },
    body: JSON.stringify({
      fullName: `Harsh Vardhan ${randNum} (Updated)`,
      address: 'City Residence, Model Town',
    }),
  });
  const dataUpdate: any = await resUpdate.json();
  assert(resUpdate.status === 200, 'Student details updated with 200 OK');
  assert(dataUpdate.student.user.fullName.includes('(Updated)'), 'Updated full name persisted in database');

  // 10. Toggle Student Status (Suspend Account)
  console.log('\n--- 8. ACCOUNT ACTIVATION / SUSPENSION ---');
  const resSuspend = await fetch(`${BASE_URL}/student-section/students/${studentDbId}/toggle-status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${studentSectionToken}` },
  });
  const dataSuspend: any = await resSuspend.json();
  assert(resSuspend.status === 200, 'Student account suspended with 200 OK');
  assert(dataSuspend.isActive === false, 'Account isActive set to false');
  assert(dataSuspend.enrollmentStatus === 'SUSPENDED', 'Enrollment status set to SUSPENDED');

  // Verify suspended student is blocked from login
  const resSuspendedLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'StudentPass123!',
      expectedRole: 'STUDENT',
    }),
  });
  assert(resSuspendedLogin.status === 403, 'Suspended student is blocked from logging in with 403 Forbidden');

  // Reactivate student account
  const resReactivate = await fetch(`${BASE_URL}/student-section/students/${studentDbId}/toggle-status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${studentSectionToken}` },
  });
  const dataReactivate: any = await resReactivate.json();
  assert(dataReactivate.isActive === true, 'Student account reactivated successfully');

  // 11. Reset Student Password
  console.log('\n--- 9. PASSWORD RESET ---');
  const resReset = await fetch(`${BASE_URL}/student-section/students/${studentDbId}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentSectionToken}`,
    },
    body: JSON.stringify({ newPassword: 'UpdatedPassword789!' }),
  });
  assert(resReset.status === 200, 'Student password reset successfully with 200 OK');

  // Verify new password works
  const resNewPassLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'UpdatedPassword789!',
      expectedRole: 'STUDENT',
    }),
  });
  assert(resNewPassLogin.status === 200, 'Student logs in successfully using reset password');

  // 12. Clearance Queue Inspection
  console.log('\n--- 10. CLEARANCE PIPELINE VERIFICATION ---');
  const resQueue = await fetch(`${BASE_URL}/student-section/clearance-queue`, {
    headers: { Authorization: `Bearer ${studentSectionToken}` },
  });
  const dataQueue: any = await resQueue.json();
  assert(resQueue.status === 200, 'Clearance queue accessed with 200 OK');
  assert(Array.isArray(dataQueue.requests), 'Queue returns array of clearance requests');

  console.log('\n========================================================================');
  console.log(` RESULTS: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
  console.log('========================================================================\n');
  process.exit(0);
}

runStudentSectionTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
