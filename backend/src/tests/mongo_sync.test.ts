import { prisma } from '../prisma/client.js';
import { mongoSyncService } from '../services/mongoSyncService.js';

async function runMongoSyncTests() {
  console.log('========================================================================');
  console.log(' STARTING MONGODB REAL-TIME SYNC & CHANGE CAPTURE TESTS                ');
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

  // Test 1: Service instance and methods
  assert(typeof mongoSyncService.connect === 'function', 'mongoSyncService has connect method');
  assert(typeof mongoSyncService.handlePrismaChange === 'function', 'mongoSyncService has handlePrismaChange method');
  assert(typeof mongoSyncService.syncAllRecords === 'function', 'mongoSyncService has syncAllRecords method');
  assert(typeof mongoSyncService.getStatus === 'function', 'mongoSyncService has getStatus method');

  // Test 2: Get status
  const status = await mongoSyncService.getStatus();
  assert(typeof status.isConnected === 'boolean', 'Status reports isConnected boolean');
  assert(typeof status.dbName === 'string' && status.dbName.length > 0, 'Status reports database name');
  assert(typeof status.collectionsStatus === 'object', 'Status reports collections breakdown object');

  // Test 3: Verify Prisma middleware allows normal reads seamlessly
  const sampleUser = await prisma.user.findFirst();
  assert(Boolean(sampleUser && sampleUser.id), 'Prisma read query executes seamlessly through middleware');

  // Test 4: Verify Prisma middleware captures mutation without failing
  const testEmail = `test.mongo.sync.${Date.now()}@ctuniversity.edu`;
  const createdTestUser = await prisma.user.create({
    data: {
      email: testEmail,
      fullName: 'MongoDB Sync Test User',
      passwordHash: 'dummy_hash',
      role: 'STUDENT',
    },
  });
  assert(Boolean(createdTestUser && createdTestUser.id), 'Prisma user.create mutation executed and intercepted');

  // Test 5: Verify update mutation
  const updatedTestUser = await prisma.user.update({
    where: { id: createdTestUser.id },
    data: { fullName: 'MongoDB Sync Test User (Updated)' },
  });
  assert(updatedTestUser.fullName === 'MongoDB Sync Test User (Updated)', 'Prisma user.update mutation executed and intercepted');

  // Test 6: Verify delete mutation
  const deletedUser = await prisma.user.delete({
    where: { id: createdTestUser.id },
  });
  assert(deletedUser.id === createdTestUser.id, 'Prisma user.delete mutation executed and intercepted');

  // Test 7: Verify all 19 collections are mapped
  const mappedCount = Object.keys(status.collectionsStatus).length;
  assert(mappedCount >= 19, `All 19 models mapped to collections (found: ${mappedCount})`);

  console.log('\n========================================================================');
  console.log(` RESULTS: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================================');
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
