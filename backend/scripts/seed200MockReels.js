import { connectDb, disconnectDb } from '../src/config/db.js';
import { Reel } from '../src/models/reel.model.js';
import { ReelEvent } from '../src/models/reelEvent.model.js';
import { User } from '../src/models/user.model.js';
import { Notification } from '../src/models/notification.model.js';
import { getNextSequence } from '../src/services/counter.service.js';
import { resolveMasterProduct } from '../src/services/masterProduct.service.js';
import { QUALITIES } from '../src/constants/qualities.js';
import { REEL_STATUS, RECORD_STATUS } from '../src/constants/reelStatus.js';
import { EVENT_TYPES } from '../src/constants/eventTypes.js';
import { APPROVAL_STATUS } from '../src/constants/approvalStatus.js';
import { ROLES } from '../src/constants/roles.js';
import { hashPassword } from '../src/utils/password.js';

const STATIONS = ['Corrugator Line 1', 'Corrugator Line 2', 'Slitter Rewinder 3', 'Lamination Unit A', 'Printing Press B'];
const SUPPLIERS = ['ITC Limited', 'Century Pulp & Paper', 'JK Paper Ltd', 'Bhalladtaria Papers', 'Bilt Graphic Paper'];
const GSMS = [80, 100, 120, 150, 180, 200, 250];
const BFS = [16, 18, 20, 24, 28];
const SIZES = [28, 32, 40, 45.5, 50, 60, 70];

async function seed() {
  console.log('====================================================');
  console.log('SEEDING 200 MOCK REELS WITH FULL TRACKING & JOURNEYS');
  console.log('====================================================\n');

  await connectDb();

  // 1. Ensure Admin, Supervisor, and Operator users exist
  let admin = await User.findOne({ role: ROLES.ADMIN });
  if (!admin) {
    const pwHash = await hashPassword('Admin@12345');
    admin = await User.create({
      name: 'Super Admin',
      username: 'admin',
      email: 'admin@rainbowpackages.com',
      password_hash: pwHash,
      role: ROLES.ADMIN,
      is_active: true,
    });
  }

  let supervisor = await User.findOne({ role: ROLES.SUPERVISOR });
  if (!supervisor) {
    const pwHash = await hashPassword('Supervisor@12345');
    supervisor = await User.create({
      name: 'Rajesh Sharma (Supervisor)',
      username: 'supervisor',
      email: 'supervisor@rainbowpackages.com',
      password_hash: pwHash,
      role: ROLES.SUPERVISOR,
      is_active: true,
    });
  }

  let operator = await User.findOne({ role: ROLES.OPERATOR });
  if (!operator) {
    const pwHash = await hashPassword('Operator@12345');
    operator = await User.create({
      name: 'Amit Kumar (Operator)',
      username: 'operator',
      email: 'operator@rainbowpackages.com',
      password_hash: pwHash,
      role: ROLES.OPERATOR,
      is_active: true,
    });
  }

  const actors = [admin, supervisor, operator];

  console.log('Cleaning up existing mock reels created by previous test scripts (if any)...');
  await Reel.deleteMany({ reel_no: new RegExp('^R-2') });
  await ReelEvent.deleteMany({ reel_no: new RegExp('^R-2') });

  console.log('Generating 200 physical paper reels (~2000 kg each)...');

  const totalReels = 200;
  const startSeq = await getNextSequence('reel_sr_no');

  let reelsCreated = 0;
  let eventsCreated = 0;

  for (let i = 0; i < totalReels; i++) {
    const reelNo = `R-${2001 + i}`;
    const quality = QUALITIES[i % QUALITIES.length];
    const gsm = GSMS[i % GSMS.length];
    const bf = BFS[i % BFS.length];
    const size = SIZES[i % SIZES.length];
    const supplier_name = SUPPLIERS[i % SUPPLIERS.length];

    // Nominal 2000 kg weight with slight natural variation (1850 kg - 2150 kg)
    const baseWeight = 1850 + (i % 31) * 10;
    const max_weight = Math.round(baseWeight * 100) / 100;

    // Resolve MasterProduct
    const masterProduct = await resolveMasterProduct({
      quality,
      gsm,
      bf,
      size,
      actor: admin,
    });

    // Purchase date spread over last 60 days
    const daysAgo = (i % 60) + 1;
    const purchaseDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Determine inventory state distribution:
    // 40% full (REEL), 45% partially used (CUT), 15% fully used (NILL)
    let category = 'REEL';
    if (i % 10 < 4) category = 'REEL';
    else if (i % 10 < 8.5) category = 'CUT';
    else category = 'NILL';

    let prevWeight = max_weight;
    let stationsUsed = [];
    let pendingCount = 0;

    const reelId = new (await import('mongoose')).default.Types.ObjectId();
    const reelEvents = [];

    // 1. Initial CREATED Event
    const creator = i % 2 === 0 ? operator : admin;
    const isPendingCreation = creator.role === ROLES.OPERATOR && i % 15 === 0;

    const createApprovalStatus = isPendingCreation ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;
    if (isPendingCreation) pendingCount++;

    const createEventId = new (await import('mongoose')).default.Types.ObjectId();
    reelEvents.push({
      _id: createEventId,
      reel_id: reelId,
      reel_no: reelNo,
      event_type: EVENT_TYPES.CREATED,
      approval_status: createApprovalStatus,
      performed_by: creator._id,
      performed_by_name: creator.name,
      performed_by_role: creator.role,
      performed_at: purchaseDate,
      approved_by: isPendingCreation ? null : (creator.role === ROLES.ADMIN ? creator._id : supervisor._id),
      approved_by_name: isPendingCreation ? null : (creator.role === ROLES.ADMIN ? creator.name : supervisor.name),
      approved_at: isPendingCreation ? null : purchaseDate,
      payload: {
        max_weight,
        fields: {
          reel_no: reelNo,
          quality,
          bf,
          gsm,
          size,
          supplier_name,
          purchase_date: purchaseDate,
        },
      },
    });

    // 2. Add realistic usage history events if CUT or NILL
    let lastActivity = purchaseDate;

    if (category === 'CUT' || category === 'NILL') {
      const usageCount = category === 'CUT' ? (i % 3) + 1 : (i % 2) + 3;
      let currentBal = max_weight;

      for (let u = 0; u < usageCount; u++) {
        const station = STATIONS[(i + u) % STATIONS.length];
        if (!stationsUsed.includes(station)) stationsUsed.push(station);

        const usedAmount = category === 'NILL' && u === usageCount - 1
          ? currentBal
          : Math.min(currentBal - 50, Math.round((250 + (u * 150) + (i % 5) * 40) * 100) / 100);

        const newBal = Math.max(0, Math.round((currentBal - usedAmount) * 100) / 100);
        const eventTime = new Date(purchaseDate.getTime() + (u + 1) * 12 * 60 * 60 * 1000);
        lastActivity = eventTime;

        // Last usage entry might be pending approval for operator entries
        const isUsagePending = u === usageCount - 1 && i % 8 === 0;
        const usageApprovalStatus = isUsagePending ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;

        if (isUsagePending) pendingCount++;

        const usageEventId = new (await import('mongoose')).default.Types.ObjectId();
        reelEvents.push({
          _id: usageEventId,
          reel_id: reelId,
          reel_no: reelNo,
          event_type: EVENT_TYPES.USAGE_LOGGED,
          approval_status: usageApprovalStatus,
          performed_by: operator._id,
          performed_by_name: operator.name,
          performed_by_role: operator.role,
          performed_at: eventTime,
          approved_by: isUsagePending ? null : supervisor._id,
          approved_by_name: isUsagePending ? null : supervisor.name,
          approved_at: isUsagePending ? null : new Date(eventTime.getTime() + 15 * 60 * 1000),
          payload: {
            station,
            previous_weight: currentBal,
            current_weight_entered: newBal,
            used_this_time: Math.round((currentBal - newBal) * 100) / 100,
          },
        });

        currentBal = newBal;
      }
      prevWeight = currentBal;
    }

    // Determine derived reel status
    const status = prevWeight === max_weight ? REEL_STATUS.REEL : prevWeight > 0 ? REEL_STATUS.CUT : REEL_STATUS.NILL;

    await Reel.create({
      _id: reelId,
      sr_no: startSeq + i,
      reel_no: reelNo,
      master_product_id: masterProduct._id,
      master_key: masterProduct.master_key,
      quality,
      bf,
      gsm,
      size,
      supplier_name,
      max_weight,
      previous_weight: prevWeight,
      status,
      purchase_date: purchaseDate,
      stations_used: stationsUsed,
      pending_count: pendingCount,
      record_status: RECORD_STATUS.ACTIVE,
      created_by: creator._id,
      last_activity_at: lastActivity,
    });

    await ReelEvent.insertMany(reelEvents);
    reelsCreated++;
    eventsCreated += reelEvents.length;
  }

  console.log(`\nSuccessfully created ${reelsCreated} reels with 2000 kg average weight!`);
  console.log(`Successfully generated ${eventsCreated} timeline events across all reels.`);

  // Create notifications for pending items so notification drawer is populated
  const pendingEvents = await ReelEvent.find({ approval_status: APPROVAL_STATUS.PENDING }).limit(10);
  const notifDocs = pendingEvents.map((pe) => ({
    user_id: supervisor._id,
    type: 'ENTRY_DECLINED',
    title: `Pending Approval for Reel #${pe.reel_no}`,
    message: `${pe.performed_by_name} logged ${pe.event_type} on Reel ${pe.reel_no}. Needs sign-off.`,
    event_id: pe._id,
    reel_id: pe.reel_id,
    reel_no: pe.reel_no,
    is_read: false,
    created_at: pe.performed_at,
  }));
  if (notifDocs.length > 0) {
    await Notification.insertMany(notifDocs);
    console.log(`Seeded ${notifDocs.length} pending approval notifications.`);
  }

  await disconnectDb();
  console.log('\nSeeding complete! You can now log into the frontend and explore the dashboard.');
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
