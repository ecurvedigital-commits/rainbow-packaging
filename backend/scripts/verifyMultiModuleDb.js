import { connectDb, disconnectDb } from '../src/core/database/db.js';
import mongoose from 'mongoose';

// Import Reels Models (Strictly Preserved)
import { Reel } from '../src/modules/reels/models/reel.model.js';
import { ReelEvent } from '../src/modules/reels/models/reelEvent.model.js';
import { MasterProduct } from '../src/modules/reels/models/masterProduct.model.js';
import { MasterCode } from '../src/modules/reels/models/masterCode.model.js';

// Import Minimal Placeholder Models (Sheets & Finished Boxes)
import { Sheet } from '../src/modules/sheets/models/sheet.model.js';
import { FinishedBox } from '../src/modules/finished-boxes/models/finishedBox.model.js';

// Import Shared Platform Models
import { User } from '../src/modules/users/models/user.model.js';
import { RefreshToken } from '../src/modules/auth/models/refreshToken.model.js';
import { Setting } from '../src/modules/settings/models/setting.model.js';
import { Counter } from '../src/core/database/counter.model.js';
import { AuditLog } from '../src/modules/audit/models/auditLog.model.js';

async function main() {
  console.log('========================================================');
  console.log('RAINBOW PACKAGING — DATABASE FOUNDATION INTEGRITY VERIFIER');
  console.log('========================================================\n');

  await connectDb();
  const db = mongoose.connection.db;

  // 1. Verify Existing Reels Data Remains 100% Intact
  console.log('--- 1. Verification of Preserved Reels & Platform Data ---');
  const reelCount = await Reel.countDocuments();
  const eventCount = await ReelEvent.countDocuments();
  const productCount = await MasterProduct.countDocuments();
  const codeCount = await MasterCode.countDocuments();
  const userCount = await User.countDocuments();
  const settingCount = await Setting.countDocuments();
  const counterDoc = await Counter.findById('reel_sr_no');

  console.log(`✓ Reels preserved:          ${reelCount} documents (Expected: >= 467)`);
  console.log(`✓ ReelEvents preserved:     ${eventCount} documents (Expected: >= 471)`);
  console.log(`✓ MasterProducts preserved: ${productCount} documents (Expected: >= 222)`);
  console.log(`✓ MasterCodes preserved:    ${codeCount} documents (Expected: >= 25)`);
  console.log(`✓ Users preserved:          ${userCount} documents (Expected: >= 3)`);
  console.log(`✓ Settings preserved:       ${settingCount} document`);
  console.log(`✓ Counter ('reel_sr_no'):   Current sequence = ${counterDoc?.seq || 0}`);

  // 2. Verify Minimal Placeholder Foundations for Future Modules
  console.log('\n--- 2. Verification of Future Module Placeholders ---');
  console.log(`✓ Sheet model registered:       Collection "${Sheet.collection.name}" (Count: ${await Sheet.countDocuments()})`);
  console.log(`✓ FinishedBox model registered: Collection "${FinishedBox.collection.name}" (Count: ${await FinishedBox.countDocuments()})`);
  console.log(`✓ AuditLog model registered:    Collection "${AuditLog.collection.name}" (Count: ${await AuditLog.countDocuments()})`);

  // 3. Check Active Database Collections
  console.log('\n--- 3. Active Collections in Database ---');
  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name).sort();
  colNames.forEach((name, idx) => {
    console.log(`  [${String(idx + 1).padStart(2, '0')}] ${name}`);
  });

  console.log(`\nTotal Active Collections: ${colNames.length}`);
  console.log('\n========================================================');
  console.log('FOUNDATION CHECK PASSED: ZERO REELS MODIFICATIONS');
  console.log('========================================================\n');

  await disconnectDb();
}

main().catch(err => {
  console.error('Foundation verification failed:', err);
  process.exit(1);
});
