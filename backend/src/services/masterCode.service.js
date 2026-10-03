import { MasterCode } from '../models/masterCode.model.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const INITIAL_MASTER_CODES = [
  { master_code: '1', master_code_name: 'VK 120 GSM / 18 BF Standard', quality: 'VK', gsm: 120, bf: 18, size: 100, description: 'Standard VK Packaging Reel' },
  { master_code: '2', master_code_name: 'VK 150 GSM / 18 BF Heavy', quality: 'VK', gsm: 150, bf: 18, size: 100, description: 'Heavy Duty VK Packaging Reel' },
  { master_code: '3', master_code_name: 'SPECTRA Premium 140 GSM', quality: 'SPECTRA', gsm: 140, bf: 20, size: 110, description: 'Premium Smooth Craft Paper' },
  { master_code: '4', master_code_name: 'ULTRA High BF 180 GSM', quality: 'ULTRA', gsm: 180, bf: 24, size: 120, description: 'Ultra Bursting Factor Board' },
  { master_code: '5', master_code_name: 'SK Craft Paper 150 GSM', quality: 'SK', gsm: 150, bf: 18, size: 90, description: 'SK Grade Corrugation Paper' },
  { master_code: '6', master_code_name: 'IMPORTANT Board 200 GSM', quality: 'IMPORTANT', gsm: 200, bf: 28, size: 105, description: 'High Grade Heavy Board' },
  { master_code: '7', master_code_name: 'SBS Solid Bleached Sulfate', quality: 'SBS', gsm: 230, bf: 30, size: 115, description: 'Solid Bleached Pure Virgin Pulp' },
  { master_code: '8', master_code_name: 'FBB Folding Box Board', quality: 'FBB', gsm: 250, bf: 32, size: 125, description: 'Folding Box Packaging Board' },
  { master_code: '9', master_code_name: 'DCB Duplex Card Board', quality: 'DCB', gsm: 220, bf: 20, size: 100, description: 'Duplex Kraft Card Board' },
  { master_code: '10', master_code_name: 'VK 180 GSM Heavy Reel', quality: 'VK', gsm: 180, bf: 20, size: 105, description: 'Heavy Weight VK Paper' },
  { master_code: '11', master_code_name: 'SPECTRA 160 GSM Medium', quality: 'SPECTRA', gsm: 160, bf: 22, size: 95, description: 'Spectra Medium Grade Reel' },
  { master_code: '12', master_code_name: 'ULTRA 220 GSM Heavy', quality: 'ULTRA', gsm: 220, bf: 28, size: 130, description: 'Ultra High Strength Reel' },
  { master_code: '13', master_code_name: 'SK Lightweight Craft', quality: 'SK', gsm: 120, bf: 16, size: 85, description: 'Lightweight SK Corrugation' },
  { master_code: '14', master_code_name: 'IMPORTANT Extra Heavy', quality: 'IMPORTANT', gsm: 250, bf: 30, size: 140, description: 'Important Grade Packaging Board' },
  { master_code: '15', master_code_name: 'SBS Premium 300 GSM', quality: 'SBS', gsm: 300, bf: 35, size: 150, description: 'Premium Bleached Board 300 GSM' },
  { master_code: '16', master_code_name: 'FBB Heavy Packaging', quality: 'FBB', gsm: 280, bf: 34, size: 135, description: 'Folding Box Heavy Duty' },
  { master_code: '17', master_code_name: 'DCB Duplex Heavy', quality: 'DCB', gsm: 240, bf: 22, size: 105, description: 'Duplex Card Board 240 GSM' },
  { master_code: '18', master_code_name: 'VK Super Strength 200 GSM', quality: 'VK', gsm: 200, bf: 22, size: 110, description: 'VK Super Strength Reel' },
  { master_code: '19', master_code_name: 'DCB Special Master Code 19', quality: 'DCB', gsm: 250, bf: 25, size: 115, description: 'DCB Special Custom Grade' },
];

/**
 * Ensures initial Master Codes 1 to 19 exist in database.
 */
export async function ensureInitialMasterCodes() {
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
    quality,
    gsm: Number(gsm),
    bf: Number(bf),
    size: Number(size),
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
  if (data.quality !== undefined) doc.quality = data.quality;
  if (data.gsm !== undefined) doc.gsm = Number(data.gsm);
  if (data.bf !== undefined) doc.bf = Number(data.bf);
  if (data.size !== undefined) doc.size = Number(data.size);
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
