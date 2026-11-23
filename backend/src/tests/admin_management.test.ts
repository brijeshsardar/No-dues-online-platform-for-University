import { prisma } from '../prisma/client.js';

async function runAdminManagementTests() {
  console.log('========================================================================');
  console.log(' STARTING ADMIN PANEL: STUDENT, FACULTY & SYSTEM MANAGEMENT TESTS      ');
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

  // 1. Authenticate Admin
  const resAdminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ctuniversity.edu', password: 'Password123!', expectedRole: 'ADMIN' }),
  });
  const dataAdmin: any = await resAdminLogin.json();
  assert(resAdminLogin.ok && !!dataAdmin.token, 'Admin logs in and receives administrative JWT token');

  // 2. RBAC Barrier: Non-admin cannot access admin APIs
  const resStuLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul.sharma@ctuniversity.edu', password: 'Password123!', expectedRole: 'STUDENT' }),
  });
  const dataStu: any = await resStuLogin.json();

  const resForbidden = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${dataStu.token}` },
  });
  assert(resForbidden.status === 403, 'RBAC Defense: Student access to Admin APIs strictly blocked (403)');

  console.log('\n--- PART 1: STUDENT MANAGEMENT (ADMIN PANEL) ---');

  // Test 1.1: Fetch academic metadata (courses, semesters, departments)
  const resMeta = await fetch(`${BASE_URL}/admin/academic-meta`, {
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  const dataMeta: any = await resMeta.json();
  assert(resMeta.ok && dataMeta.courses.length > 0 && dataMeta.semesters.length > 0, 'Admin fetches academic metadata');

  const courseId = dataMeta.courses[0].id;
  const semesterId = dataMeta.semesters[0].id;
  const academicYearId = dataMeta.academicYears[0].id;

  // Clean any test student created earlier
  const testStudentEmail = 'rahul.kumar.test@ctuniversity.edu';
  const existingTestStudent = await prisma.user.findUnique({ where: { email: testStudentEmail } });
  if (existingTestStudent) {
    await prisma.user.delete({ where: { id: existingTestStudent.id } });
  }

  // Test 1.2: Add New Student with Complete Registration Details (Prompt example: Rahul Kumar)
  const resAddStudent = await fetch(`${BASE_URL}/admin/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({
      fullName: 'Rahul Kumar',
      fatherName: 'Anand Kumar',
      motherName: 'Sita Kumar',
      dob: '2004-06-18',
      gender: 'Male',
      phone: '+91-9876501234',
      email: testStudentEmail,
      address: 'Flat 402, Green Avenue, Ludhiana, Punjab',
      studentId: 'CT-2026-9999',
      enrollmentNo: 'EN202699999',
      admissionNumber: 'ADM-2026-9999',
      courseId,
      semesterId,
      academicYearId,
      admissionDate: '2026-08-01',
      enrollmentStatus: 'ACTIVE',
      initialTotalFee: 10000,
      initialPaidAmount: 0,
      password: 'RahulSecurePass123!',
    }),
  });
  const dataAddStudent: any = await resAddStudent.json();
  assert(resAddStudent.ok && dataAddStudent.success, 'Admin registers new student Rahul Kumar');
  assert(dataAddStudent.student.studentId === 'CT-2026-9999', 'Student registration number assigned');
  assert(dataAddStudent.student.fatherName === 'Anand Kumar', 'Student personal information saved');

  const newStudentId = dataAddStudent.student.id;

  // Test 1.3: Verify Rahul Kumar can immediately log into the Student Portal with his credentials
  const resRahulLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudentEmail, password: 'RahulSecurePass123!', expectedRole: 'STUDENT' }),
  });
  const dataRahulLogin: any = await resRahulLogin.json();
  assert(resRahulLogin.ok && dataRahulLogin.user.fullName === 'Rahul Kumar', 'New student Rahul Kumar logs into Student Portal with own credentials');

  // Test 1.4: Search Students in Admin Panel
  const resSearch = await fetch(`${BASE_URL}/admin/students?search=Rahul+Kumar`, {
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  const dataSearch: any = await resSearch.json();
  assert(resSearch.ok && dataSearch.students.some((s: any) => s.studentId === 'CT-2026-9999'), 'Admin searches and locates Rahul Kumar in student directory');

  // Test 1.5: Edit Student Details
  const resEditStudent = await fetch(`${BASE_URL}/admin/students/${newStudentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({
      address: 'Updated Residence: Campus Hostel Block D, Room 204',
      section: 'B',
    }),
  });
  const dataEditStudent: any = await resEditStudent.json();
  assert(resEditStudent.ok && dataEditStudent.student.address.includes('Hostel Block D'), 'Admin updates student personal and academic details');

  // Test 1.6: Toggle Student Account Status (Deactivate / Activate)
  const resDeactivate = await fetch(`${BASE_URL}/admin/students/${newStudentId}/toggle-status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  const dataDeactivate: any = await resDeactivate.json();
  assert(resDeactivate.ok && dataDeactivate.isActive === false, 'Admin deactivates student account');

  // Verify deactivated account cannot log in
  const resBlockedLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudentEmail, password: 'RahulSecurePass123!', expectedRole: 'STUDENT' }),
  });
  assert(resBlockedLogin.status === 403, 'Deactivated student account strictly prevented from logging in (403)');

  // Reactivate student account
  const resReactivate = await fetch(`${BASE_URL}/admin/students/${newStudentId}/toggle-status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  const dataReactivate: any = await resReactivate.json();
  assert(resReactivate.ok && dataReactivate.isActive === true, 'Admin reactivates student account');

  // Test 1.7: Reset Student Password
  const resResetPass = await fetch(`${BASE_URL}/admin/students/${newStudentId}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({ newPassword: 'BrandNewPass2026!' }),
  });
  const dataResetPass: any = await resResetPass.json();
  assert(resResetPass.ok && dataResetPass.success, 'Admin resets student password');

  // Verify login with new password
  const resLoginWithNewPass = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudentEmail, password: 'BrandNewPass2026!', expectedRole: 'STUDENT' }),
  });
  assert(resLoginWithNewPass.ok, 'Student logs in successfully using newly reset password');

  console.log('\n--- PART 2: FACULTY MANAGEMENT (ADMIN PANEL) ---');

  // Clean any test faculty
  const testFacultyEmail = 'amit.sharma.fac@ctuniversity.edu';
  const existingTestFaculty = await prisma.user.findUnique({ where: { email: testFacultyEmail } });
  if (existingTestFaculty) {
    await prisma.user.delete({ where: { id: existingTestFaculty.id } });
  }

  // Test 2.1: Add New Faculty Member (Prompt example: Amit Sharma)
  const resAddFaculty = await fetch(`${BASE_URL}/admin/faculty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({
      fullName: 'Dr. Amit Sharma',
      fatherName: 'P. N. Sharma',
      dob: '1982-09-14',
      gender: 'Male',
      phone: '+91-9876509999',
      email: testFacultyEmail,
      address: 'Professors Colony, Sector 14, Chandigarh',
      employeeId: 'FAC-2026-099',
      designation: 'Professor & Department Coordinator',
      specialization: 'Cloud Computing & Cyber Security',
      assignedCourses: 'B.Tech CSE, MCA',
      assignedClasses: 'SEM-5 Section A',
      joiningDate: '2020-07-01',
      employmentStatus: 'ACTIVE',
      role: 'CLASS_COORDINATOR',
      password: 'FacultySecurePass123!',
    }),
  });
  const dataAddFaculty: any = await resAddFaculty.json();
  assert(resAddFaculty.ok && dataAddFaculty.success, 'Admin adds new faculty member Dr. Amit Sharma');
  assert(dataAddFaculty.faculty.employeeId === 'FAC-2026-099', 'Faculty employee ID assigned');

  const newFacultyId = dataAddFaculty.faculty.id;

  // Test 2.2: Verify Dr. Amit Sharma can log into Faculty Portal with own credentials
  const resAmitFacLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testFacultyEmail, password: 'FacultySecurePass123!', expectedRole: 'FACULTY' }),
  });
  const dataAmitFacLogin: any = await resAmitFacLogin.json();
  assert(resAmitFacLogin.ok && dataAmitFacLogin.user.fullName === 'Dr. Amit Sharma', 'Faculty member Dr. Amit Sharma logs into Faculty Portal');

  // Test 2.3: Edit Faculty Information
  const resEditFaculty = await fetch(`${BASE_URL}/admin/faculty/${newFacultyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({
      designation: 'Senior Professor & Dean of Computing',
      specialization: 'Quantum Cryptography & Cloud Computing',
    }),
  });
  const dataEditFaculty: any = await resEditFaculty.json();
  assert(resEditFaculty.ok && dataEditFaculty.faculty.designation.includes('Dean of Computing'), 'Admin updates faculty designation and responsibilities');

  console.log('\n--- PART 3: DEPARTMENT MANAGEMENT ---');

  // Test 3.1: Verify initial departments exist
  const resDepts = await fetch(`${BASE_URL}/admin/departments`, {
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  const dataDepts: any = await resDepts.json();
  assert(resDepts.ok && dataDepts.departments.length >= 6, 'Initial departments verified (Student Section, Account Section, IT, Library, Coordinator, Exam Controller)');

  // Clean test department if exists
  const existingTestDept = await prisma.department.findUnique({ where: { code: 'MECH' } });
  if (existingTestDept) {
    await prisma.department.delete({ where: { id: existingTestDept.id } });
  }

  // Test 3.2: Admin adds new department
  const resAddDept = await fetch(`${BASE_URL}/admin/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({
      code: 'MECH',
      name: 'Department of Mechanical Engineering',
      type: 'ACADEMIC',
      description: 'Thermal systems, robotics, and CAD/CAM research',
    }),
  });
  const dataAddDept: any = await resAddDept.json();
  assert(resAddDept.ok && dataAddDept.department.code === 'MECH', 'Admin creates new department: Department of Mechanical Engineering');

  const newDeptId = dataAddDept.department.id;

  // Test 3.3: Edit department details
  const resEditDept = await fetch(`${BASE_URL}/admin/departments/${newDeptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({
      name: 'Department of Mechanical & Mechatronics Engineering',
    }),
  });
  const dataEditDept: any = await resEditDept.json();
  assert(resEditDept.ok && dataEditDept.department.name.includes('Mechatronics'), 'Admin edits department title');

  // Test 3.4: Delete department
  const resDelDept = await fetch(`${BASE_URL}/admin/departments/${newDeptId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  assert(resDelDept.ok, 'Admin deletes department with confirmation check');

  console.log('\n--- PART 4: CENTRALIZED ADMIN CONTROLS & AUDIT TRAIL ---');

  // Test 4.1: Dashboard Statistics
  const resStats = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  const dataStats: any = await resStats.json();
  assert(resStats.ok && dataStats.stats.totalStudents > 0, 'Admin accesses centralized institutional KPIs and overview statistics');

  // Test 4.2: Broadcast Notification to Students
  const resBroadcast = await fetch(`${BASE_URL}/admin/notifications/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataAdmin.token}` },
    body: JSON.stringify({
      targetRole: 'STUDENT',
      title: 'Spring 2026 Examination Clearance Reminder',
      message: 'Please complete all departmental dues and library returns before Friday.',
      type: 'WARNING',
    }),
  });
  const dataBroadcast: any = await resBroadcast.json();
  assert(resBroadcast.ok && dataBroadcast.count > 0, 'Admin broadcasts notifications to targeted student population');

  // Test 4.3: Verify immutable audit log recorded administrative actions
  const resAudit = await fetch(`${BASE_URL}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${dataAdmin.token}` },
  });
  const dataAudit: any = await resAudit.json();
  assert(resAudit.ok && dataAudit.logs.some((l: any) => l.action === 'ADMIN_CREATE_STUDENT'), 'Administrative actions immutably recorded in system audit log');
  assert(dataAudit.logs.some((l: any) => l.action === 'ADMIN_CREATE_FACULTY'), 'Faculty creation recorded in system audit log');

  console.log(`\n========================================================================`);
  console.log(` ALL ${passed}/${total} ADMIN PANEL MANAGEMENT TESTS PASSED! `);
  console.log(`========================================================================\n`);
}

runAdminManagementTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
