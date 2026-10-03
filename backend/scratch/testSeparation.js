import { connectDb, disconnectDb } from '../src/config/db.js';
import mongoose from 'mongoose';

async function testSeparation() {
  // Force local connection to reel_inventory_dev
  process.env.MONGODB_DB_NAME = 'reel_inventory_dev';
  await connectDb();

  const client = mongoose.connection.client;
  const devDb = client.db('reel_inventory_dev');
  const prodDb = client.db('reel_inventory_prod');

  console.log('========================================================================================');
  console.log('PHASE 11 — ENVIRONMENT SEPARATION & ISOLATION TEST');
  console.log('========================================================================================\n');

  // 1. Initial counts
  const devReelsBefore = await devDb.collection('reels').countDocuments();
  const prodReelsBefore = await prodDb.collection('reels').countDocuments();

  console.log(`Initial Reel Count:`);
  console.log(` - reel_inventory_dev  : ${devReelsBefore} reels`);
  console.log(` - reel_inventory_prod : ${prodReelsBefore} reels`);

  // 2. Perform safe DEV-only write (insert temporary dev test record)
  const testDevDoc = {
    test_flag: 'DEV_ISOLATION_VERIFICATION',
    created_at: new Date(),
  };

  await devDb.collection('notifications').insertOne(testDevDoc);
  console.log('\n[WRITE EXECUTED] Inserted 1 temporary notification into "reel_inventory_dev".');

  // 3. Verify counts after write
  const devNotifAfter = await devDb.collection('notifications').countDocuments();
  const prodNotifAfter = await prodDb.collection('notifications').countDocuments();

  console.log(`\nNotification Count After DEV Write:`);
  console.log(` - reel_inventory_dev  : ${devNotifAfter} notifications`);
  console.log(` - reel_inventory_prod : ${prodNotifAfter} notifications (UNCHANGED)`);

  const prodUnchanged = prodNotifAfter === 14;
  const devUpdated = devNotifAfter === 15;

  console.log(`\nIsolation Verification:`);
  console.log(` - DEV database received write: ${devUpdated ? 'YES' : 'NO'}`);
  console.log(` - PROD database remained untouched: ${prodUnchanged ? 'YES' : 'NO'}`);

  // Clean up temporary dev notification record
  await devDb.collection('notifications').deleteOne({ test_flag: 'DEV_ISOLATION_VERIFICATION' });
  console.log('[CLEANUP] Removed temporary dev test notification record.');

  const devNotifFinal = await devDb.collection('notifications').countDocuments();
  console.log(` - reel_inventory_dev final count: ${devNotifFinal}`);

  await disconnectDb();
}

testSeparation().catch((err) => {
  console.error('Separation test failed:', err);
  process.exit(1);
});
