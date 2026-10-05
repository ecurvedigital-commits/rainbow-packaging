import { MasterCode } from '../models/masterCode.model.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const INITIAL_MASTER_CODES = [
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
];

/**
 * Ensures initial Master Codes (1 to 18) exist in database.
 */
export async function ensureInitialMasterCodes() {
  const legacyRecord = await MasterCode.findOne({ master_code: '1', master_code_name: /VK 120 GSM/i });
  if (legacyRecord) {
    await MasterCode.deleteMany({});
    await MasterCode.insertMany(INITIAL_MASTER_CODES);
    return;
  }

  const count = await MasterCode.countDocuments();
  if (count === 0) {
    await MasterCode.insertMany(INITIAL_MASTER_CODES);
  }
}

/**
 * Lists all Master Codes with optional filtering.
 */
export async function listMasterCodes({ status, q } = {}) {
  await ensureInitialMasterCodes();
  const query = {};

  if (status) {
    query.status = status;
  }
  if (q) {
    const regex = new RegExp(q.trim(), 'i');
    query.$or = [
      { master_code: regex },
      { master_code_name: regex },
      { quality: regex },
      { description: regex },
    ];
  }

  // Sort numerically if possible by master_code, or by created_at
  const items = await MasterCode.find(query).sort({ created_at: -1 }).lean();

  // Natural numeric sort on master_code if string is digit
  items.sort((a, b) => {
    const numA = Number(a.master_code);
    const numB = Number(b.master_code);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.master_code.localeCompare(b.master_code);
  });

  return items.map((doc) => ({
    master_code_id: doc._id.toString(),
    id: doc._id.toString(),
    master_code: doc.master_code,
    master_code_name: doc.master_code_name,
    quality: doc.quality,
    gsm: doc.gsm,
    bf: doc.bf,
    size: doc.size,
    description: doc.description || '',
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }));
}

/**
 * Creates a new Master Code (Admin / Supervisor).
 */
export async function createMasterCode({ data, actor }) {
  const { master_code, master_code_name, quality, gsm, bf, size, description, status = 'ACTIVE' } = data;

  const existing = await MasterCode.findOne({ master_code: master_code.toString().trim() });
  if (existing) {
    throw createApiError(400, ERROR_CODES.VALIDATION_ERROR, `Master Code '${master_code}' already exists.`);
  }

  const doc = await MasterCode.create({
    master_code: master_code.toString().trim(),
    master_code_name: master_code_name.trim(),
    quality: quality ? String(quality).trim() : '',
    gsm: gsm !== undefined && gsm !== null ? (isNaN(gsm) ? String(gsm).trim() : Number(gsm)) : '',
    bf: bf !== undefined && bf !== null ? (isNaN(bf) ? String(bf).trim() : Number(bf)) : '',
    size: size !== undefined && size !== null ? (isNaN(size) ? String(size).trim() : Number(size)) : '',
    description: description ? description.trim() : '',
    status,
    created_by: actor ? actor.id : null,
    updated_by: actor ? actor.id : null,
  });

  return {
    master_code_id: doc._id.toString(),
    id: doc._id.toString(),
    master_code: doc.master_code,
    master_code_name: doc.master_code_name,
    quality: doc.quality,
    gsm: doc.gsm,
    bf: doc.bf,
    size: doc.size,
    description: doc.description,
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

/**
 * Updates an existing Master Code (Admin / Supervisor).
 */
export async function updateMasterCode({ id, data, actor }) {
  const doc = await MasterCode.findById(id);
  if (!doc) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Master Code not found.');
  }

  if (data.master_code && data.master_code.toString().trim() !== doc.master_code) {
    const existing = await MasterCode.findOne({ master_code: data.master_code.toString().trim() });
    if (existing) {
      throw createApiError(400, ERROR_CODES.VALIDATION_ERROR, `Master Code '${data.master_code}' already exists.`);
    }
    doc.master_code = data.master_code.toString().trim();
  }

  if (data.master_code_name !== undefined) doc.master_code_name = data.master_code_name.trim();
  if (data.quality !== undefined) doc.quality = String(data.quality).trim();
  if (data.gsm !== undefined) doc.gsm = isNaN(data.gsm) ? String(data.gsm).trim() : Number(data.gsm);
  if (data.bf !== undefined) doc.bf = isNaN(data.bf) ? String(data.bf).trim() : Number(data.bf);
  if (data.size !== undefined) doc.size = isNaN(data.size) ? String(data.size).trim() : Number(data.size);
  if (data.description !== undefined) doc.description = data.description.trim();
  if (data.status !== undefined) doc.status = data.status;
  doc.updated_by = actor ? actor.id : null;

  await doc.save();

  return {
    master_code_id: doc._id.toString(),
    id: doc._id.toString(),
    master_code: doc.master_code,
    master_code_name: doc.master_code_name,
    quality: doc.quality,
    gsm: doc.gsm,
    bf: doc.bf,
    size: doc.size,
    description: doc.description,
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

/**
 * Deletes or deactivates a Master Code (Admin / Supervisor).
 */
export async function deleteMasterCode({ id, actor }) {
  const doc = await MasterCode.findById(id);
  if (!doc) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Master Code not found.');
  }

  await doc.deleteOne();
  return { success: true, message: `Master Code '${doc.master_code}' deleted successfully.` };
}
