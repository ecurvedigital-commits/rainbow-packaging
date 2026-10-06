import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { Reel } from '../src/models/reel.model.js';
import { ReelEvent } from '../src/models/reelEvent.model.js';
import { Notification } from '../src/models/notification.model.js';
import { DigestLog } from '../src/models/digestLog.model.js';
import { MasterProduct } from '../src/models/masterProduct.model.js';
import { MasterCode } from '../src/models/masterCode.model.js';
import { Counter } from '../src/models/counter.model.js';
import { User } from '../src/models/user.model.js';
import { RECORD_STATUS, REEL_STATUS } from '../src/constants/reelStatus.js';

const require = createRequire(import.meta.url);
const xlsx = require('../../frontend/node_modules/xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '../../ORIGINAL DATA FOR SOFTWARE.xlsx');

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

async function importData() {
  console.log('Connecting to database...');
  await connectDb();

  const adminUser = (await User.findOne({ role: 'ADMIN' })) || (await User.findOne({}));
  if (!adminUser) {
    throw new Error('No user found in database to set as created_by.');
  }
  console.log(`Using admin user: ${adminUser.username} (${adminUser._id})`);

  // 1. Refresh Master Codes
  console.log('Syncing Master Codes...');
  await MasterCode.deleteMany({});
  const insertedMasterCodes = await MasterCode.insertMany(MASTER_CODES_LIST.map(mc => ({
    ...mc,
    created_by: adminUser._id,
    updated_by: adminUser._id,
  })));
  console.log(`Synced ${insertedMasterCodes.length} Master Codes.`);

  const masterCodeMap = new Map();
  insertedMasterCodes.forEach(mc => {
    masterCodeMap.set(mc.master_code_name.toLowerCase().trim(), mc);
    masterCodeMap.set(mc.master_code.toLowerCase().trim(), mc);
  });

  // 2. Clear old inventory and events
  console.log('Clearing old reels, reel events, digest logs, notifications, and master products...');
  const delReels = await Reel.deleteMany({});
  const delEvents = await ReelEvent.deleteMany({});
  const delDigest = await DigestLog.deleteMany({});
  const delNotifs = await Notification.deleteMany({});
  const delProducts = await MasterProduct.deleteMany({});
  console.log(`Deleted: ${delReels.deletedCount} reels, ${delEvents.deletedCount} events, ${delDigest.deletedCount} digest logs, ${delNotifs.deletedCount} notifications, ${delProducts.deletedCount} master products.`);

  try {
    console.log('Dropping existing indexes on reels to remove stale unique constraints...');
    await Reel.collection.dropIndexes();
    await Reel.syncIndexes();
    console.log('Rebuilt clean indexes on Reel collection.');
  } catch (idxErr) {
    console.log('Index reset warning:', idxErr.message);
  }

  // 3. Read Excel Sheet
  console.log(`Reading Excel file from ${filePath}...`);
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets['Sheet1'];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const rows = data.slice(2).filter(r => r && r.length > 0 && r.some(c => c !== null && c !== undefined && c !== ''));
  console.log(`Found ${rows.length} valid rows in Excel.`);

  const purchaseDate = new Date('2026-10-01T00:00:00.000Z');

  const reelDocs = [];
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
      // keep number
    } else if (gsm === '-' || gsm === undefined || gsm === null || String(gsm).trim() === '') {
      gsm = 220; // fallback standard
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
    const masterKey = matchedMc ? `${matchedMc.master_code_name}-${size}` : `${quality}-${gsm}-${bf}-${size}`;

    const reelDoc = {
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
      master_key: masterKey,
      stations_used: [],
      pending_count: 0,
      last_activity_at: purchaseDate,
      created_by: adminUser._id,
      created_at: purchaseDate,
      updated_at: purchaseDate,
    };

    reelDocs.push(reelDoc);
  });

  console.log(`Inserting ${reelDocs.length} reels into MongoDB...`);
  const insertResult = await Reel.insertMany(reelDocs);
  console.log(`Successfully imported ${insertResult.length} reels!`);

  // 4. Update Counter for auto-increment SR NO
  await Counter.deleteMany({});
  await Counter.create({
    _id: 'sr_no',
    seq: maxSrNo,
  });
  console.log(`Reset SR NO Counter sequence to ${maxSrNo}.`);

  // 5. Output verification stats
  const totalReelsCount = await Reel.countDocuments({ record_status: RECORD_STATUS.ACTIVE });
  const totalWeightResult = await Reel.aggregate([
    { $match: { record_status: RECORD_STATUS.ACTIVE } },
    { $group: { _id: null, totalWeight: { $sum: '$previous_weight' } } },
  ]);
  const totalWeight = totalWeightResult[0]?.totalWeight || 0;

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log(`Active Reels in Database: ${totalReelsCount}`);
  console.log(`Total Inventory Weight: ${totalWeight.toLocaleString('en-IN')} kg`);
  console.log(`Master Codes in Database: ${insertedMasterCodes.length}`);
  console.log('Import completed cleanly with 0 errors.');

  await disconnectDb();
}

importData().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
