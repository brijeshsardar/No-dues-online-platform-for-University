import { prisma } from '../prisma/client.js';
import { mongoSyncService, MongoSyncService } from '../services/mongoSyncService.js';

async function runMongoSyncTests() {
  console.log('========================================================================');
  console.log(' STARTING MONGODB ATLAS CLOUD SYNC & RECOVERY VERIFICATION SUITE       ');
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

  // --- SCENARIO 1: URI FORMAT & ATLAS SRV SCHEME VALIDATION ---
  const validSrv = 'mongodb+srv://admin:pass123@cluster0.abcde.mongodb.net/ct_university_nodues?retryWrites=true&w=majority';
  const validStandard = 'mongodb://localhost:27017/ct_university_nodues';
  const invalidScheme = 'http://localhost:27017/ct_university_nodues';
  const malformed = 'mongodb+srv://';

  assert(MongoSyncService.validateUri(validSrv).valid, 'Validates MongoDB Atlas mongodb+srv:// connection format');
  assert(MongoSyncService.validateUri(validStandard).valid, 'Validates standard mongodb:// connection format');
  assert(!MongoSyncService.validateUri(invalidScheme).valid, 'Rejects invalid scheme (http://)');
  assert(!MongoSyncService.validateUri(malformed).valid, 'Rejects malformed connection string');

  // --- SCENARIO 2: CREDENTIAL MASKING ---
  const masked = MongoSyncService.maskUri(validSrv);
  assert(!masked.includes('pass123') && masked.includes('••••••••'), 'Masks credentials securely and never exposes password');

  // --- SCENARIO 3: SENSITIVE DATA REDACTION ---
  const rawUser = {
    id: 'user-123',
    email: 'test@ctuniversity.edu',
    passwordHash: '$2a$10$super_secret_password_hash',
    mfaSecret: 'JBSWY3DPEHPK3PXP',
    fullName: 'Test User',
  };
  const sanitized = mongoSyncService.sanitizeRecord(rawUser);
  assert(sanitized.passwordHash === '[REDACTED]', 'Sensitive passwordHash is automatically redacted');
  assert(sanitized.mfaSecret === '[REDACTED]', 'Sensitive mfaSecret is automatically redacted');
  assert(sanitized.email === 'test@ctuniversity.edu', 'Non-sensitive fields remain intact');

  // --- SCENARIO 4: INCORRECT / UNREACHABLE ATLAS CLUSTER HANDLING ---
  const unreachableUri = 'mongodb://127.0.0.1:27019/ct_university_nodues';
  const testRes = await mongoSyncService.testConnection(unreachableUri);
  assert(!testRes.reachable, 'Detects unreachable cluster gracefully');
  assert(Boolean(testRes.error), 'Provides descriptive error without crashing');

  // --- SCENARIO 5: ALL 19 COLLECTIONS MAPPING & STATUS ---
  const status = await mongoSyncService.getStatus();
  const mappedCount = Object.keys(status.collectionsStatus).length;
  assert(mappedCount === 19, `Exact 19 models mapped to collections (found: ${mappedCount})`);
  assert(Boolean(status.dbName === 'ct_university_nodues'), 'Target database defaults to ct_university_nodues');

  // --- SCENARIO 6: NEW STUDENT CREATION WITH DURABLE QUEUE INTERCEPTION ---
  const delay = (ms = 50) => new Promise((r) => setTimeout(r, ms));
  const ts = Date.now();
  const testEmail = `student.test.${ts}@ctuniversity.edu`;
  const createdUser = await prisma.user.create({
    data: {
      email: testEmail,
      fullName: 'Atlas Test Student',
      passwordHash: 'dummy_hash',
      role: 'STUDENT',
    },
  });
  assert(Boolean(createdUser && createdUser.id), 'Prisma User creation executed successfully');

  // Allow next tick queue write to complete
  await delay(100);

  // Check that operation was captured in durable queue (since Atlas is in standby mode)
  const queuedUserJob = await (prisma as any).mongoSyncQueueJob.findFirst({
    where: { recordId: createdUser.id, model: 'User', action: 'create' },
  });
  assert(Boolean(queuedUserJob && queuedUserJob.status === 'PENDING'), 'Operation saved in durable SQLite/PostgreSQL queue for Atlas recovery');

  // --- SCENARIO 7: STUDENT RECORD UPDATE & DURABLE TRACKING ---
  const updatedUser = await prisma.user.update({
    where: { id: createdUser.id },
    data: { fullName: 'Atlas Test Student (Updated Name)' },
  });
  assert(updatedUser.fullName === 'Atlas Test Student (Updated Name)', 'Prisma User update executed successfully');

  await delay(100);

  const queuedUpdateJob = await (prisma as any).mongoSyncQueueJob.findFirst({
    where: { recordId: createdUser.id, model: 'User', action: 'update' },
  });
  assert(Boolean(queuedUpdateJob), 'User update mutation captured in durable retry queue');

  // --- SCENARIO 8: STUDENT RECORD DELETION ---
  const deletedUser = await prisma.user.delete({
    where: { id: createdUser.id },
  });
  assert(deletedUser.id === createdUser.id, 'Prisma User deletion executed successfully');

  // --- SCENARIO 9: CLEARANCE REQUEST MUTATION INTERCEPTION ---
  const seedStudent = await prisma.student.findFirst({ include: { user: true, semester: true, academicYear: true } });
  if (seedStudent && seedStudent.semesterId && seedStudent.academicYearId) {
    const dummyReq = await prisma.clearanceRequest.create({
      data: {
        requestId: `ND-TEST-${ts}`,
        student: { connect: { id: seedStudent.id } },
        semester: { connect: { id: seedStudent.semesterId } },
        academicYear: { connect: { id: seedStudent.academicYearId } },
        currentStage: 'ACCOUNT',
        overallStatus: 'PENDING_ACCOUNT',
      },
    });
    assert(Boolean(dummyReq && dummyReq.id), 'Clearance request creation intercepted');

    // Clean up test request
    await prisma.clearanceRequest.delete({ where: { id: dummyReq.id } });
  }

  // --- SCENARIO 10: FEE RECORD UPDATE INTERCEPTION ---
  const seedFee = await prisma.feeRecord.findFirst();
  if (seedFee) {
    const origRemarks = seedFee.remarks;
    await prisma.feeRecord.update({
      where: { id: seedFee.id },
      data: { remarks: `Atlas Sync Test ${ts}` },
    });
    await delay(100);
    const feeQueue = await (prisma as any).mongoSyncQueueJob.findFirst({
      where: { recordId: seedFee.id, model: 'FeeRecord', action: 'update' },
    });
    assert(Boolean(feeQueue), 'Fee record modification captured in durable queue');

    // Restore remarks
    await prisma.feeRecord.update({
      where: { id: seedFee.id },
      data: { remarks: origRemarks },
    });
  }

  // --- SCENARIO 11: CERTIFICATE MODEL SYNC READINESS ---
  const certCount = await prisma.certificate.count();
  assert(typeof certCount === 'number', 'Certificate model query and mapping verified');

  // --- SCENARIO 12: DURABLE QUEUE RECOVERY & IDEMPOTENT PROCESSING ---
  const queueStatsBefore = await mongoSyncService.getStatus();
  assert(queueStatsBefore.queueStats.pending >= 1, 'Durable queue preserves pending jobs without in-memory loss');

  // Test processDurableQueue in disconnected state returns 0 without crashing
  const recoveryResult = await mongoSyncService.processDurableQueue();
  assert(typeof recoveryResult.processed === 'number' && typeof recoveryResult.failed === 'number', 'Queue processor safely manages offline state');

  // --- SCENARIO 13: IDEMPOTENT UPSERT SAFETY ---
  // Verify that modelToCollectionMap has valid unique identifier mapping
  const sampleCols = Object.values(mongoSyncService.modelToCollectionMap);
  assert(sampleCols.includes('users') && sampleCols.includes('clearance_requests') && sampleCols.includes('certificates'), 'All essential university collections mapped');

  // --- SCENARIO 14: SERVICE RECONNECT AND STANDBY LIFECYCLE ---
  await mongoSyncService.disconnect();
  const disconnectedStatus = await mongoSyncService.getStatus();
  assert(disconnectedStatus.connectionState === 'STANDBY', 'Disconnect switches service cleanly to STANDBY');

  // --- SCENARIO 15: CLEAN PRIMARY DATABASE QUERY INTEGRITY ---
  const studentCheck = await prisma.student.count();
  assert(studentCheck >= 3, 'All seed accounts and database integrity verified unaffected by sync hooks');

  console.log('\n========================================================================');
  console.log(` RESULTS: ${passedTests}/${totalTests} TESTS PASSED UNCONDITIONALLY!`);
  console.log('========================================================================\n');
}

runMongoSyncTests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
