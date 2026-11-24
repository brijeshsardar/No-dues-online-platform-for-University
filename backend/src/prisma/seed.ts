import bcrypt from 'bcryptjs';
import { prisma } from './client.js';
import { CryptoService } from '../services/cryptoService.js';
import { PdfService } from '../services/pdfService.js';
import { Role, RequestStatus, ApprovalStatus } from '../types/index.js';

export async function ensureDatabasePopulated() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return;
    }
    console.log('[Database] Fresh database detected. Initializing default university records...');
    await runSeedInserts();
  } catch (err: any) {
    console.warn('[Database] Initial population notice:', err.message);
  }
}

export async function seedDatabase() {
  console.log('Seeding CT University Database with realistic test records...');

  // 1. Clean existing records safely in relational order
  await prisma.reapplicationRecord.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.feeModificationLog.deleteMany({});
  await prisma.certificateVerification.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.examinationEligibility.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.clearanceRequest.deleteMany({});
  await prisma.feeRecord.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.securityEvent.deleteMany({});
  await prisma.faculty.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.academicYear.deleteMany({});

  await runSeedInserts();
}

async function runSeedInserts() {

  // 2. Academic Years
  const ayCurrent = await prisma.academicYear.create({
    data: { yearString: '2025-2026', isCurrent: true },
  });
  await prisma.academicYear.create({
    data: { yearString: '2024-2025', isCurrent: false },
  });

  // 3. Semesters
  const semesters = [];
  for (let i = 1; i <= 8; i++) {
    const sem = await prisma.semester.create({
      data: {
        number: i,
        code: `SEM-${i}`,
        name: `${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Semester`,
      },
    });
    semesters.push(sem);
  }
  const sem5 = semesters[4]; // SEM-5
  const sem3 = semesters[2]; // SEM-3

  // 4. Courses
  const btechCse = await prisma.course.create({
    data: {
      code: 'BTECH_CSE',
      name: 'B.Tech in Computer Science & Engineering',
      departmentName: 'School of Engineering and Technology',
      durationYears: 4,
    },
  });

  const mba = await prisma.course.create({
    data: {
      code: 'MBA',
      name: 'Master of Business Administration',
      departmentName: 'School of Management Studies',
      durationYears: 2,
    },
  });

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 5. Initial Departments (as requested: Student Section, Account Section, IT Department, Library, Coordinator, Exam Controller, + Academic CSE)
  const deptStudentSection = await prisma.department.create({
    data: {
      code: 'STUDENT_SECTION',
      name: 'Student Section',
      type: 'CLEARANCE',
      description: 'Student Affairs, Conduct Verification & Administrative Documentation',
      permissions: JSON.stringify(['VIEW_STUDENT_DOSSIER', 'VERIFY_CONDUCT', 'ISSUE_BONAFIDE']),
    },
  });

  const deptAccount = await prisma.department.create({
    data: {
      code: 'ACCOUNT',
      name: 'Account Section',
      type: 'CLEARANCE',
      description: 'University Bursar Office, Tuition Fee Collection & Ledger Audit',
      permissions: JSON.stringify(['VIEW_FEE_LEDGER', 'RECORD_PAYMENT', 'EDIT_TOTAL_FEE', 'APPROVE_FEE_CLEARANCE']),
    },
  });

  const deptIT = await prisma.department.create({
    data: {
      code: 'IT',
      name: 'IT Department',
      type: 'CLEARANCE',
      description: 'Campus Network Operations, Computing Assets & Lab Hardware Clearance',
      permissions: JSON.stringify(['VERIFY_LAB_HARDWARE', 'DEACTIVATE_COMPUTING_ACCOUNTS', 'APPROVE_IT_CLEARANCE']),
    },
  });

  const deptLibrary = await prisma.department.create({
    data: {
      code: 'LIBRARY',
      name: 'Library',
      type: 'CLEARANCE',
      description: 'Central Campus Reference Library, Book Return Audit & Fines Settlement',
      permissions: JSON.stringify(['VERIFY_BOOK_RETURNS', 'ASSESS_FINES', 'APPROVE_LIBRARY_CLEARANCE']),
    },
  });

  const deptCoordinator = await prisma.department.create({
    data: {
      code: 'CLASS_COORDINATOR',
      name: 'Coordinator',
      type: 'ACADEMIC',
      description: 'Academic Faculty Coordination, Attendance Review (>= 75%) & Coursework',
      permissions: JSON.stringify(['VERIFY_ATTENDANCE', 'REVIEW_DEPARTMENT_DOSSIERS', 'FORWARD_TO_EXAM_CONTROLLER']),
    },
  });

  const deptExamController = await prisma.department.create({
    data: {
      code: 'EXAM_CONTROLLER',
      name: 'Exam Controller',
      type: 'ADMINISTRATIVE',
      description: 'Office of the Controller of Examinations, Hall Ticket Authorization & Certificate Issuance',
      permissions: JSON.stringify(['AUTHORIZE_EXAMINATION_ELIGIBILITY', 'ISSUE_DIGITAL_CERTIFICATES', 'REVOKE_CERTIFICATES']),
    },
  });

  const deptCSE = await prisma.department.create({
    data: {
      code: 'CSE',
      name: 'Department of Computer Science & Engineering',
      type: 'ACADEMIC',
      description: 'Undergraduate and postgraduate computer science academic programs',
      permissions: JSON.stringify(['MANAGE_CURRICULUM', 'ASSIGN_FACULTY', 'TRACK_ACADEMIC_PERFORMANCE']),
    },
  });

  // 6. Create Staff & Admin Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Chief University Administrator',
      role: Role.ADMIN,
      phone: '+91-9876543210',
    },
  });

  const accountOfficer = await prisma.user.create({
    data: {
      email: 'account@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Vikram Mehta (Chief Accounts Officer)',
      role: Role.ACCOUNT_SECTION,
      departmentCode: 'ACCOUNT',
      departmentId: deptAccount.id,
      phone: '+91-9876543211',
    },
  });

  const studentSectionOfficer = await prisma.user.create({
    data: {
      email: 'studentsection@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Anita Roy (Student Affairs Registrar)',
      role: Role.STUDENT_SECTION,
      departmentCode: 'STUDENT_SECTION',
      departmentId: deptStudentSection.id,
      phone: '+91-9876543212',
    },
  });

  const libraryHead = await prisma.user.create({
    data: {
      email: 'library@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. S. Nair (Chief Librarian)',
      role: Role.LIBRARY,
      departmentCode: 'LIBRARY',
      departmentId: deptLibrary.id,
      phone: '+91-9876543213',
    },
  });

  const itOfficer = await prisma.user.create({
    data: {
      email: 'itdept@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Rajesh Kumar (Senior Systems Engineer)',
      role: Role.IT_DEPARTMENT,
      departmentCode: 'IT',
      departmentId: deptIT.id,
      phone: '+91-9876543214',
    },
  });

  const coordinator = await prisma.user.create({
    data: {
      email: 'coordinator@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Prof. Arun Gupta (CSE Class Coordinator)',
      role: Role.CLASS_COORDINATOR,
      departmentCode: 'CLASS_COORDINATOR',
      departmentId: deptCoordinator.id,
      phone: '+91-9876543215',
    },
  });

  const examController = await prisma.user.create({
    data: {
      email: 'examcontroller@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. K. Sharma (Controller of Examinations)',
      role: Role.EXAMINATION_CONTROLLER,
      departmentCode: 'EXAM_CONTROLLER',
      departmentId: deptExamController.id,
      phone: '+91-9876543216',
    },
  });

  // Assign department heads
  await prisma.department.update({ where: { id: deptAccount.id }, data: { headUserId: accountOfficer.id } });
  await prisma.department.update({ where: { id: deptStudentSection.id }, data: { headUserId: studentSectionOfficer.id } });
  await prisma.department.update({ where: { id: deptLibrary.id }, data: { headUserId: libraryHead.id } });
  await prisma.department.update({ where: { id: deptIT.id }, data: { headUserId: itOfficer.id } });
  await prisma.department.update({ where: { id: deptCoordinator.id }, data: { headUserId: coordinator.id } });
  await prisma.department.update({ where: { id: deptExamController.id }, data: { headUserId: examController.id } });

  // 7. Initial Faculty Profiles
  await prisma.faculty.create({
    data: {
      userId: coordinator.id,
      employeeId: 'FAC-2026-001',
      fatherName: 'Late S. K. Gupta',
      dob: '1980-04-12',
      gender: 'Male',
      address: 'Staff Quarters Type IV, Campus West, CT University',
      departmentId: deptCSE.id,
      designation: 'Professor & Class Coordinator',
      specialization: 'Distributed Computing & Algorithms',
      assignedCourses: 'B.Tech CSE, M.Tech Data Science',
      assignedClasses: 'SEM-5 Section A, SEM-7 Section B',
      joiningDate: '2016-07-15',
      employmentStatus: 'ACTIVE',
    },
  });

  const faculty2User = await prisma.user.create({
    data: {
      email: 'sunita.rao@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Sunita Rao',
      role: 'CLASS_COORDINATOR',
      departmentCode: 'CSE',
      departmentId: deptCSE.id,
      phone: '+91-9876543299',
    },
  });

  await prisma.faculty.create({
    data: {
      userId: faculty2User.id,
      employeeId: 'FAC-2026-002',
      fatherName: 'V. K. Rao',
      dob: '1985-08-22',
      gender: 'Female',
      address: 'Green Park Enclave, Ludhiana, Punjab',
      departmentId: deptCSE.id,
      designation: 'Associate Professor',
      specialization: 'Network Security & Cryptography',
      assignedCourses: 'B.Tech CSE',
      assignedClasses: 'SEM-5 Section B',
      joiningDate: '2019-01-10',
      employmentStatus: 'ACTIVE',
    },
  });

  // 8. Create Student Users & Profiles
  // Student 1: Rahul Sharma (All fees cleared -> Ready for testing end-to-end clearance)
  const student1User = await prisma.user.create({
    data: {
      email: 'rahul.sharma@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Rahul Sharma',
      role: Role.STUDENT,
      phone: '+91-9812345678',
      departmentId: deptCSE.id,
    },
  });

  const student1 = await prisma.student.create({
    data: {
      userId: student1User.id,
      studentId: 'CT-2026-1042',
      enrollmentNo: 'EN202609812',
      admissionNumber: 'ADM-2023-1042',
      fatherName: 'Ramesh Sharma',
      motherName: 'Sunita Sharma',
      dob: '2004-03-15',
      gender: 'Male',
      address: 'House No. 142, Model Town, Ludhiana, Punjab',
      admissionDate: '2023-08-01',
      enrollmentStatus: 'ACTIVE',
      courseId: btechCse.id,
      departmentId: deptCSE.id,
      semesterId: sem5.id,
      academicYearId: ayCurrent.id,
      section: 'A',
      batchYear: '2023-2027',
    },
  });

  await prisma.feeRecord.create({
    data: {
      studentId: student1.id,
      semesterId: sem5.id,
      academicYearId: ayCurrent.id,
      totalFee: 4500.0,
      paidAmount: 4500.0,
      outstandingBalance: 0.0,
      paymentStatus: 'PAID',
      paymentReference: 'CT-TXN-2026-9812',
      verifiedByUserId: accountOfficer.id,
      verifiedAt: new Date(),
      remarks: 'Full semester fee verified and reconciled with university bank portal.',
    },
  });

  // Student 2: Priya Patel (Has pending balance $1,500 -> Demonstrates financial block)
  const student2User = await prisma.user.create({
    data: {
      email: 'priya.patel@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Priya Patel',
      role: Role.STUDENT,
      phone: '+91-9812345679',
      departmentId: deptCSE.id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: student2User.id,
      studentId: 'CT-2026-1043',
      enrollmentNo: 'EN202609813',
      admissionNumber: 'ADM-2023-1043',
      fatherName: 'Mahesh Patel',
      motherName: 'Geeta Patel',
      dob: '2004-07-20',
      gender: 'Female',
      address: 'Flat 302, Royal Residency, Jalandhar, Punjab',
      admissionDate: '2023-08-01',
      enrollmentStatus: 'ACTIVE',
      courseId: btechCse.id,
      departmentId: deptCSE.id,
      semesterId: sem5.id,
      academicYearId: ayCurrent.id,
      section: 'B',
      batchYear: '2023-2027',
    },
  });

  await prisma.feeRecord.create({
    data: {
      studentId: student2.id,
      semesterId: sem5.id,
      academicYearId: ayCurrent.id,
      totalFee: 4500.0,
      paidAmount: 3000.0,
      outstandingBalance: 1500.0,
      paymentStatus: 'PARTIAL',
      paymentReference: 'CT-TXN-2026-4401',
      remarks: 'Partial tuition installment received. Balance remaining: ₹1,500.',
    },
  });

  // Student 3: Amit Verma (Completed clearance with Certificate already issued -> Instant demo of Certificate & Verification!)
  const student3User = await prisma.user.create({
    data: {
      email: 'amit.verma@ctuniversity.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Amit Verma',
      role: Role.STUDENT,
      phone: '+91-9812345680',
      departmentId: deptCSE.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      userId: student3User.id,
      studentId: 'CT-2026-1044',
      enrollmentNo: 'EN202609814',
      admissionNumber: 'ADM-2024-1044',
      fatherName: 'Harish Verma',
      motherName: 'Anita Verma',
      dob: '2002-11-10',
      gender: 'Male',
      address: 'Sector 17, Chandigarh',
      admissionDate: '2024-07-15',
      enrollmentStatus: 'ACTIVE',
      courseId: mba.id,
      semesterId: sem3.id,
      academicYearId: ayCurrent.id,
      section: 'A',
      batchYear: '2024-2026',
    },
  });

  await prisma.feeRecord.create({
    data: {
      studentId: student3.id,
      semesterId: sem3.id,
      academicYearId: ayCurrent.id,
      totalFee: 5200.0,
      paidAmount: 5200.0,
      outstandingBalance: 0.0,
      paymentStatus: 'PAID',
      paymentReference: 'CT-TXN-2026-8891',
      verifiedByUserId: accountOfficer.id,
      verifiedAt: new Date(),
      remarks: 'All MBA semester dues verified and settled.',
    },
  });

  // Create Completed Request for Amit Verma with all approvals + Certificate
  const reqAmit = await prisma.clearanceRequest.create({
    data: {
      requestId: 'ND-2026-10245',
      studentId: student3.id,
      semesterId: sem3.id,
      academicYearId: ayCurrent.id,
      overallStatus: RequestStatus.CERTIFICATE_ISSUED,
      currentStage: 'COMPLETED',
      submissionRemarks: 'Requesting clearance for Spring 2026 End-Semester Examinations.',
      completedAt: new Date(),
    },
  });

  const completedStages = [
    { code: 'ACCOUNT', reviewer: accountOfficer.id, remarks: 'Tuition and exam fees settled in full. Zero dues.' },
    { code: 'STUDENT_SECTION', reviewer: studentSectionOfficer.id, remarks: 'Administrative records verified. Conduct satisfactory.' },
    { code: 'LIBRARY', reviewer: libraryHead.id, remarks: 'All 4 library books returned. No fine pending.' },
    { code: 'IT', reviewer: itOfficer.id, remarks: 'Campus lab accounts cleared. No hardware due.' },
    { code: 'CLASS_COORDINATOR', reviewer: coordinator.id, remarks: 'Attendance 87.5%. Coursework complete. Approved.' },
    { code: 'EXAM_CONTROLLER', reviewer: examController.id, remarks: 'Dossier fully verified. Examination eligibility confirmed and authorized.' },
  ];

  for (const stg of completedStages) {
    await prisma.approval.create({
      data: {
        clearanceRequestId: reqAmit.id,
        departmentCode: stg.code,
        status: ApprovalStatus.APPROVED,
        reviewedByUserId: stg.reviewer,
        remarks: stg.remarks,
        digitalSignatureHash: CryptoService.sha256({ reqId: reqAmit.id, stage: stg.code, approvedAt: new Date().toISOString() }),
        actionTimestamp: new Date(),
      },
    });
  }

  const certIdAmit = 'CT-NDC-EX-2026-1044';
  const tokenAmit = '8a3f912c4b8e71d60f5a9e2c'; // High-entropy known token for instant verification
  const certDateAmit = new Date();

  // Create Examination Eligibility
  await prisma.examinationEligibility.create({
    data: {
      clearanceRequestId: reqAmit.id,
      studentId: student3.id,
      authorizedByUserId: examController.id,
      examinationSession: 'Spring 2026 Regular End-Semester Examinations',
      hallTicketAllowed: true,
      verifiedFeeAmount: 5200.0,
      status: 'AUTHORIZED',
      remarks: 'Student has cleared all departmental obligations. Hall ticket download approved.',
      authorizedAt: certDateAmit,
    },
  });

  // Generate Digital Certificate
  const pdfResult = await PdfService.generateCertificatePdf({
    certificateId: certIdAmit,
    requestId: reqAmit.requestId,
    studentName: student3User.fullName,
    studentId: student3.studentId,
    enrollmentNo: student3.enrollmentNo,
    courseName: mba.name,
    semesterName: sem3.name,
    academicYear: ayCurrent.yearString,
    issueDate: certDateAmit,
    verificationToken: tokenAmit,
    examSession: 'Spring 2026 Regular End-Semester Examinations',
    approvals: completedStages.map((s) => ({
      department: s.code,
      reviewerName: 'Authorized University Officer',
      status: 'APPROVED',
      timestamp: certDateAmit,
    })),
  });

  await prisma.certificate.create({
    data: {
      certificateId: certIdAmit,
      clearanceRequestId: reqAmit.id,
      studentId: student3.id,
      verificationToken: tokenAmit,
      qrCodeDataUrl: pdfResult.qrDataUrl,
      digitalSignature: pdfResult.signature,
      pdfFilePath: pdfResult.filePath,
      issuedAt: certDateAmit,
      status: 'VALID',
    },
  });

  console.log('✅ Seeding complete successfully!');
  console.log('Users created:');
  console.log('  - Student 1 (Clean fees, ready to submit): rahul.sharma@ctuniversity.edu / Password123!');
  console.log('  - Student 2 (Pending fees): priya.patel@ctuniversity.edu / Password123!');
  console.log('  - Student 3 (Fully cleared + Certificate): amit.verma@ctuniversity.edu / Password123!');
  console.log('  - Account Section: account@ctuniversity.edu / Password123!');
  console.log('  - Student Section: studentsection@ctuniversity.edu / Password123!');
  console.log('  - Library: library@ctuniversity.edu / Password123!');
  console.log('  - IT Dept: itdept@ctuniversity.edu / Password123!');
  console.log('  - Coordinator: coordinator@ctuniversity.edu / Password123!');
  console.log('  - Exam Controller: examcontroller@ctuniversity.edu / Password123!');
  console.log('  - Admin: admin@ctuniversity.edu / Password123!');
  console.log(`Sample Certificate Token: ${tokenAmit}`);
}

if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  seedDatabase()
    .catch((e) => {
      console.error('Error during database seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
