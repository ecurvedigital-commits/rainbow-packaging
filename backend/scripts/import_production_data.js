import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dns from 'dns';
import { execSync } from 'child_process';
import { Reel } from '../src/models/reel.model.js';
import { ReelEvent } from '../src/models/reelEvent.model.js';
import { DigestLog } from '../src/models/digestLog.model.js';
import { Notification } from '../src/models/notification.model.js';
import { MasterProduct } from '../src/models/masterProduct.model.js';
import { MasterCode } from '../src/models/masterCode.model.js';
import { Counter } from '../src/models/counter.model.js';
import { User } from '../src/models/user.model.js';
import { RECORD_STATUS, REEL_STATUS } from '../src/constants/reelStatus.js';
import { ROLES } from '../src/constants/roles.js';
import { hashPassword } from '../src/utils/password.js';

const require = createRequire(import.meta.url);
const xlsx = require('../../frontend/node_modules/xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '../../ORIGINAL DATA FOR SOFTWARE.xlsx');

function configureDns() {
  if (process.platform === 'win32') {
    try {
      const output = execSync('powershell -NoProfile -Command "(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses"', { encoding: 'utf8' });
      const ips = output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      dns.setServers(Array.from(new Set([...ips, '8.8.8.8', '1.1.1.1', '8.8.4.4'])));
    } catch {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    }
  }
}

const MASTER_CODES_LIST = [
  { master_code: '1', master_code_name: 'Duplex ultra 220', quality: 'duplex', bf: 'ultra', gsm: 220, size: '', description: 'Duplex ultra 220' },
  { master_code: '2', master_code_name: 'Duplex Ultra230/240', quality: 'duplex', bf: 'ultra', gsm: '230/240', size: '', description: 'Duplex Ultra 230/240' },
  { master_code: '3', master_code_name: 'Duplex Ultra 250+', quality: 'duplex', bf: 'ultra', gsm: '250+', size: '', description: 'Duplex Ultra 250+' },
  { master_code: '4', master_code_name: 'Duplex DCB', quality: 'duplex', bf: 'dcb', gsm: '', size: '', description: 'Duplex DCB' },
  { master_code: '5', master_code_name: 'Duplex Spectra', quality: 'duplex', bf: 'spectra', gsm: '', size: '', description: 'Duplex Spectra' },
  { master_code: '6', master_code_name: 'SK-16-100', quality: 'sk', bf: 16, gsm: 100, size: '', description: 'SK 16 100' },
  { master_code: '7', master_code_name: 'SK-18-180', quality: 'sk', bf: 18, gsm: 180, size: '', description: 'SK 18 180' },
  { master_code: '8', master_code_name: 'SK-18-140', quality: 'sk', bf: 18, gsm: 140, size: '', description: 'SK 18 140' },
  { master_code: '9', master_code_name: 'SK-18-180 (Special)', quality: 'sk', bf: 18, gsm: 180, size: '', description: 'SK 18 180 Special' },
  { master_code: '10', master_code_name: 'SK-22-140', quality: 'sk', bf: 22, gsm: 140, size: '', description: 'SK 22 140' },
  { master_code: '11', master_code_name: 'VK-18-140', quality: 'vk', bf: 18, gsm: 140, size: '', description: 'VK 18 140' },
  { master_code: '12', master_code_name: 'VK-18-180', quality: 'vk', bf: 18, gsm: 180, size: '', description: 'VK 18 180' },
  { master_code: '13', master_code_name: 'VK-22-180', quality: 'vk', bf: 22, gsm: 180, size: '', description: 'VK 22 180' },
  { master_code: '14', master_code_name: 'VK-25-180', quality: 'vk', bf: 25, gsm: 180, size: '', description: 'VK 25 180' },
  { master_code: '15', master_code_name: 'VK-25-220', quality: 'vk', bf: 25, gsm: 220, size: '', description: 'VK 25 220' },
  { master_code: '16', master_code_name: 'Import Kraft', quality: 'import kraft', bf: '', gsm: '', size: '', description: 'Import Kraft' },
  { master_code: '17', master_code_name: 'FBB', quality: 'fbb', bf: '', gsm: '', size: '', description: 'FBB' },
  { master_code: '18', master_code_name: 'SBS', quality: 'sbs', bf: '', gsm: '', size: '', description: 'SBS' },
  { master_code: '19', master_code_name: 'VK-22-220', quality: 'vk', bf: 22, gsm: 220, size: '', description: 'VK 22 220' },
  { master_code: '20', master_code_name: 'SK-25-220', quality: 'sk', bf: 25, gsm: 220, size: '', description: 'SK 25 220' },
  { master_code: '21', master_code_name: 'SK-18-120', quality: 'sk', bf: 18, gsm: 120, size: '', description: 'SK 18 120' },
  { master_code: '22', master_code_name: 'SK-25-230', quality: 'sk', bf: 25, gsm: 230, size: '', description: 'SK 25 230' },
  { master_code: '23', master_code_name: 'VK-25-150', quality: 'vk', bf: 25, gsm: 150, size: '', description: 'VK 25 150' },
  { master_code: '24', master_code_name: 'VK-25-230', quality: 'vk', bf: 25, gsm: 230, size: '', description: 'VK 25 230' },
  { master_code: '25', master_code_name: 'SK-22-230', quality: 'sk', bf: 22, gsm: 230, size: '', description: 'SK 22 230' },
];

function getSupplierAndMill(quality, head) {
  const qUpper = String(quality || '').toUpperCase().trim();
  const hUpper = String(head || '').toUpperCase().trim();

  if (qUpper.includes('ULTRA') || hUpper.includes('ULTRA')) {
    return { supplier_name: 'Century Paper', mill_name: 'Century Paper Mill' };
  }
  if (qUpper.includes('VK') || hUpper.includes('VK')) {
    return { supplier_name: 'Vishal Kraft', mill_name: 'VK Mill' };
  }
  if (qUpper.includes('SK') || hUpper.includes('SK')) {
    return { supplier_name: 'Shree Krishna', mill_name: 'SK Paper Mill' };
  }
  if (qUpper.includes('DCB') || hUpper.includes('DCB')) {
    return { supplier_name: 'Duplex Board Mills', mill_name: 'DCB Mill' };
  }
  if (qUpper.includes('FBB') || hUpper.includes('FBB')) {
    return { supplier_name: 'ITC Limited', mill_name: 'ITC Bhadrachalam' };
  }
  if (qUpper.includes('SPECTRA') || hUpper.includes('SPECTRA')) {
    return { supplier_name: 'Spectra Board', mill_name: 'Spectra Mill' };
  }
  if (qUpper.includes('SBS') || hUpper.includes('SBS')) {
    return { supplier_name: 'ITC Limited', mill_name: 'ITC Bhadrachalam' };
  }
  if (qUpper.includes('IMPORT') || qUpper.includes('A1') || hUpper.includes('IMPORT')) {
    return { supplier_name: 'International Papers', mill_name: 'Import Mill' };
  }
  return { supplier_name: 'Rainbow Stock', mill_name: 'Rainbow Mills' };
}

function normalizeHead(quality, bf, gsm, head) {
  let h = String(head || '').trim();
  if (h) {
    if (h.toLowerCase() === 'dcb') return 'Duplex DCB';
    if (h.toLowerCase() === 'fbb') return 'FBB';
    return h;
  }
  const qUpper = String(quality || '').toUpperCase().trim();
  const bfStr = String(bf || '').replace(/[^\d]/g, '');
  const gsmStr = String(gsm || '').replace(/[^\d]/g, '');

  if (qUpper === 'VK' && bfStr && gsmStr) return `VK-${bfStr}-${gsmStr}`;
  if (qUpper === 'SK' && bfStr && gsmStr) return `SK-${bfStr}-${gsmStr}`;
  if (qUpper === 'ULTRA') return 'Duplex ultra 220';
  if (qUpper === 'SPECTRA') return 'Duplex Spectra';
  if (qUpper === 'FBB') return 'FBB';
  if (qUpper === 'SBS') return 'SBS';
  return `${quality || 'Reel'}`;
}

async function runProductionImport() {
  configureDns();

  const uri = process.env.MONGODB_URI || 'mongodb+srv://ecurvedigital_db_user:OrQFmOfRJabWdrwB@rainbow-packaging.1yudmqh.mongodb.net/?retryWrites=true&w=majority';
  const prodDbName = process.env.PROD_DB_NAME || 'reel_inventory_prod';

  console.log(`\n========================================`);
  console.log(`Connecting to PRODUCTION database: "${prodDbName}"`);
  console.log(`URI: ${uri.replace(/:([^:@]+)@/, ':****@')}`);
  console.log(`========================================\n`);

  await mongoose.connect(uri, {
    dbName: prodDbName,
    serverSelectionTimeoutMS: 20000,
  });

  console.log(`Connected successfully to database: ${prodDbName}`);

  // 1. Ensure Admin User exists in production
  let adminUser = await User.findOne({ role: ROLES.ADMIN, is_active: true });
  if (!adminUser) {
    console.log('No Admin user found in production DB. Creating Super Admin...');
    const password_hash = await hashPassword('Admin@12345');
    adminUser = await User.create({
      name: 'Super Admin',
      username: 'admin',
      email: 'admin@rainbowpackages.com',
      password_hash,
      role: ROLES.ADMIN,
      is_active: true,
      must_change_password: false,
    });
    console.log(`Created Super Admin in production: ${adminUser.username} (${adminUser._id})`);
  } else {
    console.log(`Found existing production admin: ${adminUser.username} (${adminUser._id})`);
  }

  // 2. Sync Master Codes
  console.log('\nSyncing Master Codes in production...');
  await MasterCode.deleteMany({});
  const insertedMasterCodes = await MasterCode.insertMany(
    MASTER_CODES_LIST.map((mc) => ({
      ...mc,
      created_by: adminUser._id,
      updated_by: adminUser._id,
    }))
  );
  console.log(`Synced ${insertedMasterCodes.length} Master Codes.`);

  const masterCodeMap = new Map();
  insertedMasterCodes.forEach((mc) => {
    masterCodeMap.set(mc.master_code_name.toLowerCase().trim(), mc);
    masterCodeMap.set(mc.master_code.toLowerCase().trim(), mc);
  });

  // 3. Clear old inventory in production
  console.log('\nClearing existing reels and events in production...');
  const delReels = await Reel.deleteMany({});
  const delEvents = await ReelEvent.deleteMany({});
  const delDigest = await DigestLog.deleteMany({});
  const delNotifs = await Notification.deleteMany({});
  const delProducts = await MasterProduct.deleteMany({});
  console.log(`Cleared: ${delReels.deletedCount} reels, ${delEvents.deletedCount} events, ${delDigest.deletedCount} digest logs, ${delNotifs.deletedCount} notifications.`);

  try {
    console.log('Resetting indexes on Reel collection...');
    await Reel.collection.dropIndexes();
    await Reel.syncIndexes();
    console.log('Clean indexes established on Reel collection.');
  } catch (idxErr) {
    console.log('Index note:', idxErr.message);
  }

  // 4. Read Excel Sheet
  console.log(`\nReading Excel data from ${filePath}...`);
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const rows = data.slice(2).filter((r) => r && r.length > 0 && r.some((c) => c !== null && c !== undefined && c !== ''));
  console.log(`Parsed ${rows.length} rows from Excel sheet.`);

  const purchaseDate = new Date('2026-10-01T00:00:00.000Z');
  const reelDocs = [];
  const eventDocs = [];
  let maxSrNo = 0;

  rows.forEach((r, idx) => {
    const rawSrNo = Number(r[0]);
    const srNo = Number.isFinite(rawSrNo) && rawSrNo > 0 ? rawSrNo : idx + 1;
    if (srNo > maxSrNo) maxSrNo = srNo;

    const rawReelNo = r[1];
    const reelNo = rawReelNo !== undefined && rawReelNo !== null && String(rawReelNo).trim() !== ''
      ? String(rawReelNo).trim()
      : `R-${srNo}`;

    const quality = String(r[2] || 'KRAFT').trim();
    const size = typeof r[3] === 'number' ? r[3] : parseFloat(String(r[3] || '0').replace(/[^\d.]/g, '')) || 0;
    const weight = typeof r[4] === 'number' ? r[4] : parseFloat(String(r[4] || '0').replace(/[^\d.]/g, '')) || 0;

    let gsm = r[5];
    if (typeof gsm === 'number') {
      // numeric
    } else if (gsm === '-' || gsm === undefined || gsm === null || String(gsm).trim() === '') {
      gsm = 220;
    } else {
      const numGsm = parseFloat(String(gsm).replace(/[^\d.]/g, ''));
      gsm = Number.isFinite(numGsm) ? numGsm : String(gsm).trim();
    }

    const rawBf = r[6];
    let bf = rawBf !== undefined && rawBf !== null ? String(rawBf).trim() : '18BF';

    const rawHead = r[7];
    const normalizedHeadName = normalizeHead(quality, bf, gsm, rawHead);

    const matchedMc = masterCodeMap.get(normalizedHeadName.toLowerCase().trim()) ||
                      masterCodeMap.get(String(rawHead || '').toLowerCase().trim());

    const { supplier_name, mill_name } = getSupplierAndMill(quality, normalizedHeadName);

    const masterCodeStr = matchedMc ? matchedMc.master_code : null;
    const masterCodeId = matchedMc ? matchedMc._id : null;

    const reelDoc = {
      _id: new mongoose.Types.ObjectId(),
      sr_no: srNo,
      reel_no: reelNo,
      quality: quality,
      bf: bf,
      purchase_date: purchaseDate,
      supplier_name: supplier_name,
      mill_name: mill_name,
      size: size,
      gsm: gsm,
      rate_per_kg: 55,
      max_weight: weight,
      previous_weight: weight,
      status: REEL_STATUS.REEL,
      record_status: RECORD_STATUS.ACTIVE,
      custom_fields: {
        head: normalizedHeadName,
        original_head: rawHead || '',
      },
      master_code_id: masterCodeId,
      master_code: masterCodeStr,
      stations_used: [],
      pending_count: 0,
      last_activity_at: purchaseDate,
      created_by: adminUser._id,
      created_at: purchaseDate,
      updated_at: purchaseDate,
    };

    reelDocs.push(reelDoc);

    eventDocs.push({
      reel_id: reelDoc._id,
      reel_no: reelNo,
      event_type: 'CREATED',
      approval_status: 'CONFIRMED',
      performed_by: adminUser._id,
      performed_by_name: adminUser.name,
      performed_by_role: adminUser.role,
      performed_at: purchaseDate,
      approved_by: adminUser._id,
      approved_by_name: adminUser.name,
      approved_at: purchaseDate,
      payload: {
        max_weight: weight,
        rate_per_kg: 55,
        fields: {
          reel_no: reelNo,
          quality,
          bf,
          gsm,
          size,
          rate_per_kg: 55,
          supplier_name,
          mill_name,
          purchase_date: purchaseDate,
          master_code: masterCodeStr,
        },
      },
      created_at: purchaseDate,
    });
  });

  console.log(`\nInserting ${reelDocs.length} reels and audit events into "${prodDbName}"...`);
  const insertedReels = await Reel.insertMany(reelDocs);
  await ReelEvent.insertMany(eventDocs);
  console.log(`Successfully inserted ${insertedReels.length} reels into PRODUCTION!`);

  // 5. Reset Counter for SR NO
  await Counter.deleteMany({});
  await Counter.create({
    _id: 'reel_sr_no',
    seq: maxSrNo,
  });
  await Counter.create({
    _id: 'sr_no',
    seq: maxSrNo,
  });
  console.log(`Set sequence counters to ${maxSrNo}.`);

  // 6. Verification
  const totalReelsCount = await Reel.countDocuments({ record_status: RECORD_STATUS.ACTIVE });
  const totalWeightAgg = await Reel.aggregate([
    { $match: { record_status: RECORD_STATUS.ACTIVE } },
    { $group: { _id: null, totalWeight: { $sum: '$previous_weight' } } },
  ]);
  const totalWeight = totalWeightAgg[0]?.totalWeight || 0;

  console.log(`\n========================================`);
  console.log(`  PRODUCTION DATABASE IMPORT SUMMARY   `);
  console.log(`========================================`);
  console.log(`Target Database:         ${prodDbName}`);
  console.log(`Total Active Reels:      ${totalReelsCount}`);
  console.log(`Total Inventory Weight:  ${totalWeight.toLocaleString('en-IN')} kg`);
  console.log(`Master Codes in DB:      ${insertedMasterCodes.length}`);
  console.log(`Sequence Max SR NO:      ${maxSrNo}`);
  console.log(`Status:                  SUCCESS (0 ERRORS)`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
}

runProductionImport().catch((err) => {
  console.error('\nProduction import failed:', err);
  process.exit(1);
});
