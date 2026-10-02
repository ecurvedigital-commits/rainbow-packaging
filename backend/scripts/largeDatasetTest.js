import { connectDb, disconnectDb } from '../src/config/db.js';
import { Reel } from '../src/models/reel.model.js';
import { ReelEvent } from '../src/models/reelEvent.model.js';
import { Notification } from '../src/models/notification.model.js';
import { User } from '../src/models/user.model.js';
import { getNextSequence } from '../src/services/counter.service.js';
import { QUALITIES } from '../src/constants/qualities.js';
import { REEL_STATUS, RECORD_STATUS } from '../src/constants/reelStatus.js';
import { EVENT_TYPES } from '../src/constants/eventTypes.js';
import { APPROVAL_STATUS } from '../src/constants/approvalStatus.js';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:5000/api/v1';

async function run() {
  console.log('====================================================');
  console.log('PHASE 3, 4, 5, 8 & 9 — LARGE DATASET & EXPLAIN AUDIT');
  console.log('====================================================\n');

  await connectDb();

  // 1. Fetch admin user
  const adminUser = await User.findOne({ role: 'ADMIN' });
  if (!adminUser) {
    console.error('No admin user found');
    process.exit(1);
  }

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@12345' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token;

  console.log('--- Step 1: Bulk Seeding 10,000 Identifiable Test Reels ---');
  const totalToSeed = 10000;
  const batchSize = 2000;
  const prefix = `TEST-PAGINATION-${Date.now().toString().slice(-4)}`;

  const suppliers = ['ITC Limited', 'Bhalladtaria Papers', 'Century Pulp', 'JK Paper'];

  const reelDocs = [];
  const eventDocs = [];

  const startSeq = await getNextSequence('reel_sr_no');

  for (let i = 0; i < totalToSeed; i++) {
    const reelNo = `${prefix}-${String(i + 1).padStart(5, '0')}`;
    const quality = QUALITIES[i % QUALITIES.length];
    const supplier = suppliers[i % suppliers.length];
    const status = i % 3 === 0 ? REEL_STATUS.REEL : i % 3 === 1 ? REEL_STATUS.CUT : REEL_STATUS.NILL;
    const maxWeight = 1000;
    const prevWeight = status === REEL_STATUS.REEL ? 1000 : status === REEL_STATUS.CUT ? 500 : 0;
    const purchaseDate = new Date(Date.now() - (i % 90) * 24 * 60 * 60 * 1000);

    const reelId = new (await import('mongoose')).default.Types.ObjectId();

    reelDocs.push({
      _id: reelId,
      sr_no: startSeq + i + 1,
      reel_no: reelNo,
      quality,
      bf: 18,
      purchase_date: purchaseDate,
      supplier_name: supplier,
      size: 45.5,
      gsm: 120 + (i % 5) * 10,
      max_weight: maxWeight,
      previous_weight: prevWeight,
      status,
      custom_fields: {},
      pending_count: i % 10 === 0 ? 1 : 0,
      record_status: RECORD_STATUS.ACTIVE,
      created_by: adminUser._id,
      last_activity_at: purchaseDate,
      created_at: purchaseDate,
      updated_at: purchaseDate,
    });

    if (i % 10 === 0) {
      eventDocs.push({
        reel_id: reelId,
        reel_no: reelNo,
        event_type: EVENT_TYPES.CREATED,
        approval_status: APPROVAL_STATUS.PENDING,
        performed_by: adminUser._id,
        performed_by_name: adminUser.name,
        performed_by_role: adminUser.role,
        performed_at: purchaseDate,
        payload: { max_weight: maxWeight },
      });
    }
  }

  console.log(`Inserting ${reelDocs.length} test reels in batches...`);
  for (let i = 0; i < reelDocs.length; i += batchSize) {
    const batch = reelDocs.slice(i, i + batchSize);
    await Reel.insertMany(batch);
  }
  if (eventDocs.length > 0) {
    await ReelEvent.insertMany(eventDocs);
  }
  console.log(`Successfully seeded ${totalToSeed} test reels and ${eventDocs.length} events!`);

  // ----------------------------------------------------
  // STEP 2: EXPLAIN("executionStats") FOR REPRESENTATIVE QUERIES
  // ----------------------------------------------------
  console.log('\n--- Step 2: Running MongoDB explain("executionStats") on Major Queries ---');

  const explainResults = [];

  // Query 1: Reels list with filtering and sorting
  const q1Query = { record_status: 'ACTIVE', status: 'CUT', quality: 'SPECTRA' };
  const q1Sort = { purchase_date: -1, _id: -1 };
  const q1Explain = await Reel.find(q1Query).sort(q1Sort).skip(0).limit(25).explain('executionStats');
  const q1Stats = q1Explain.executionStats;
  const q1WinningPlan = q1Explain.queryPlanner.winningPlan;
  explainResults.push({
    query: 'Reels List (status=CUT & quality=SPECTRA sorted by purchase_date desc)',
    indexUsed: JSON.stringify(q1WinningPlan.inputStage?.indexName || q1WinningPlan.indexName || 'COLLSCAN'),
    winningPlanStage: q1WinningPlan.stage || q1WinningPlan.inputStage?.stage,
    executionTimeMs: q1Stats.executionTimeMillis,
    nReturned: q1Stats.nReturned,
    totalDocsExamined: q1Stats.totalDocsExamined,
    totalKeysExamined: q1Stats.totalKeysExamined,
    assessment: q1Stats.totalDocsExamined <= q1Stats.nReturned + 25 ? 'GOOD (Indexed)' : 'COLLSCAN / Unindexed Sort',
  });

  // Query 2: Reel Search by reel_no prefix
  const q2Query = { record_status: 'ACTIVE', reel_no: new RegExp(`^${prefix}`, 'i') };
  const q2Explain = await Reel.find(q2Query).limit(10).explain('executionStats');
  const q2Stats = q2Explain.executionStats;
  const q2WinningPlan = q2Explain.queryPlanner.winningPlan;
  explainResults.push({
    query: 'Reel Search by reel_no prefix (regex)',
    indexUsed: JSON.stringify(q2WinningPlan.inputStage?.indexName || q2WinningPlan.indexName || 'COLLSCAN'),
    winningPlanStage: q2WinningPlan.stage || q2WinningPlan.inputStage?.stage,
    executionTimeMs: q2Stats.executionTimeMillis,
    nReturned: q2Stats.nReturned,
    totalDocsExamined: q2Stats.totalDocsExamined,
    totalKeysExamined: q2Stats.totalKeysExamined,
    assessment: q2Stats.totalDocsExamined <= q2Stats.nReturned + 25 ? 'GOOD (Indexed)' : 'COLLSCAN / Unindexed',
  });

  // Query 3: Approval Queue (pending status + performed_at sorting)
  const q3Query = { approval_status: 'PENDING' };
  const q3Sort = { performed_at: 1, _id: 1 };
  const q3Explain = await ReelEvent.find(q3Query).sort(q3Sort).skip(0).limit(25).explain('executionStats');
  const q3Stats = q3Explain.executionStats;
  const q3WinningPlan = q3Explain.queryPlanner.winningPlan;
  explainResults.push({
    query: 'Approval Queue (approval_status=PENDING sorted by performed_at asc)',
    indexUsed: JSON.stringify(q3WinningPlan.inputStage?.indexName || q3WinningPlan.indexName || 'COLLSCAN'),
    winningPlanStage: q3WinningPlan.stage || q3WinningPlan.inputStage?.stage,
    executionTimeMs: q3Stats.executionTimeMillis,
    nReturned: q3Stats.nReturned,
    totalDocsExamined: q3Stats.totalDocsExamined,
    totalKeysExamined: q3Stats.totalKeysExamined,
    assessment: q3Stats.totalDocsExamined <= q3Stats.nReturned + 25 ? 'GOOD (Indexed)' : 'COLLSCAN / Unindexed',
  });

  // Query 4: Audit Events (event_type=CREATED sorted by performed_at desc)
  const q4Query = { event_type: 'CREATED' };
  const q4Sort = { performed_at: -1, _id: -1 };
  const q4Explain = await ReelEvent.find(q4Query).sort(q4Sort).skip(0).limit(25).explain('executionStats');
  const q4Stats = q4Explain.executionStats;
  const q4WinningPlan = q4Explain.queryPlanner.winningPlan;
  explainResults.push({
    query: 'Audit Events (event_type=CREATED sorted by performed_at desc)',
    indexUsed: JSON.stringify(q4WinningPlan.inputStage?.indexName || q4WinningPlan.indexName || 'COLLSCAN'),
    winningPlanStage: q4WinningPlan.stage || q4WinningPlan.inputStage?.stage,
    executionTimeMs: q4Stats.executionTimeMillis,
    nReturned: q4Stats.nReturned,
    totalDocsExamined: q4Stats.totalDocsExamined,
    totalKeysExamined: q4Stats.totalKeysExamined,
    assessment: q4Stats.totalDocsExamined <= q4Stats.nReturned + 25 ? 'GOOD (Indexed)' : 'COLLSCAN / Unindexed',
  });

  // Query 5: Notifications (user_id + is_read + created_at)
  const q5Query = { user_id: adminUser._id, is_read: false };
  const q5Sort = { created_at: -1 };
  const q5Explain = await Notification.find(q5Query).sort(q5Sort).skip(0).limit(25).explain('executionStats');
  const q5Stats = q5Explain.executionStats;
  const q5WinningPlan = q5Explain.queryPlanner.winningPlan;
  explainResults.push({
    query: 'Notifications (user_id + is_read sorted by created_at desc)',
    indexUsed: JSON.stringify(q5WinningPlan.inputStage?.indexName || q5WinningPlan.indexName || 'COLLSCAN'),
    winningPlanStage: q5WinningPlan.stage || q5WinningPlan.inputStage?.stage,
    executionTimeMs: q5Stats.executionTimeMillis,
    nReturned: q5Stats.nReturned,
    totalDocsExamined: q5Stats.totalDocsExamined,
    totalKeysExamined: q5Stats.totalKeysExamined,
    assessment: q5Stats.totalDocsExamined <= q5Stats.nReturned + 25 ? 'GOOD (Indexed)' : 'COLLSCAN / Unindexed',
  });

  console.table(explainResults);

  // ----------------------------------------------------
  // STEP 3: DEEP PAGINATION TESTING ON 10,000 REELS DATASET
  // ----------------------------------------------------
  console.log('\n--- Step 3: Deep Pagination Response Times & Accuracy Across 10,000 Records ---');
  const deepPagesToTest = [1, 2, 10, 100, 300, 400, 9999];
  const deepPagResults = [];

  for (const p of deepPagesToTest) {
    const start = performance.now();
    const res = await fetch(`${BASE_URL}/reels?page=${p}&limit=25`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const timeMs = Math.round((performance.now() - start) * 100) / 100;
    const body = await res.json();
    deepPagResults.push({
      page: p,
      limit: 25,
      status: res.status,
      timeMs,
      total: body.meta?.total,
      totalPages: body.meta?.totalPages,
      itemsReturned: body.data?.length,
      hasNextPage: body.meta?.hasNextPage,
      hasPreviousPage: body.meta?.hasPreviousPage,
    });
  }
  console.table(deepPagResults);

  // ----------------------------------------------------
  // STEP 4: CLEANUP TEST DATASET
  // ----------------------------------------------------
  console.log('\n--- Step 4: Cleaning up 10,000 Seeded Test Records ---');
  const reelDelRes = await Reel.deleteMany({ reel_no: new RegExp(`^${prefix}`) });
  const eventDelRes = await ReelEvent.deleteMany({ reel_no: new RegExp(`^${prefix}`) });
  console.log(`Cleaned up ${reelDelRes.deletedCount} test reels and ${eventDelRes.deletedCount} test events.`);

  await disconnectDb();

  fs.mkdirSync('scratch', { recursive: true });
  fs.writeFileSync(
    'scratch/large_dataset_report.json',
    JSON.stringify({ explainResults, deepPagResults, totalTestReelsSeeded: totalToSeed }, null, 2)
  );
  console.log('\nLarge dataset & explain audit report saved to scratch/large_dataset_report.json');
}

run().catch((err) => {
  console.error('Large dataset test error:', err);
  process.exit(1);
});
