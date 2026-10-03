import { MasterProduct } from '../models/masterProduct.model.js';
import { MasterCode } from '../models/masterCode.model.js';
import { Reel } from '../models/reel.model.js';
import { RECORD_STATUS } from '../constants/reelStatus.js';
import { generateMasterKey } from '../utils/masterKeyGenerator.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Resolves or creates a MasterProduct document atomically.
 * Concurrency-safe for parallel reel creations.
 * @param {{ quality: string, gsm: number, bf: number, size: number, master_code?: string, master_code_id?: string, actor?: object, session?: object }} args
 * @returns {Promise<object>} MasterProduct document
 */
export async function resolveMasterProduct({ quality, gsm, bf, size, master_code, master_code_id, actor, session }) {
  const generated = generateMasterKey({ quality, gsm, bf, size });

  let resolvedCodeDoc = null;
  if (master_code_id) {
    resolvedCodeDoc = await MasterCode.findById(master_code_id).session(session);
  } else if (master_code) {
    resolvedCodeDoc = await MasterCode.findOne({ master_code: String(master_code).trim() }).session(session);
  }

  let masterProduct = await MasterProduct.findOne({ master_key: generated.master_key }).session(session);

  if (!masterProduct) {
    try {
      const docs = await MasterProduct.create(
        [
          {
            master_key: generated.master_key,
            master_code_id: resolvedCodeDoc ? resolvedCodeDoc._id : null,
            master_code: resolvedCodeDoc ? resolvedCodeDoc.master_code : (master_code || null),
            name: generated.name,
            quality: generated.quality,
            gsm: generated.gsm,
            bf: generated.bf,
            size: generated.size,
            parameter_codes: generated.parameter_codes,
            is_active: true,
            created_by: actor ? actor.id : null,
          },
        ],
        { session }
      );
      masterProduct = docs[0];
    } catch (err) {
      // Handle race condition where another process created it concurrently
      if (err.code === 11000) {
        masterProduct = await MasterProduct.findOne({ master_key: generated.master_key }).session(session);
      } else {
        throw err;
      }
    }
  } else if (resolvedCodeDoc && (!masterProduct.master_code_id || masterProduct.master_code !== resolvedCodeDoc.master_code)) {
    masterProduct.master_code_id = resolvedCodeDoc._id;
    masterProduct.master_code = resolvedCodeDoc.master_code;
    await masterProduct.save({ session });
  }

  return masterProduct;
}

/**
 * Lists Master Products with inventory aggregation metrics and pagination.
 * @param {{ filters: object, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listMasterProducts({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = {};

  if (filters.q) {
    const searchStr = filters.q.trim();
    const regex = new RegExp(searchStr, 'i');
    query.$or = [{ master_key: regex }, { name: regex }];
  }

  if (filters.quality) {
    const qualities = Array.isArray(filters.quality)
      ? filters.quality
      : String(filters.quality).split(',').map((q) => q.trim().toUpperCase()).filter(Boolean);
    if (qualities.length === 1) query.quality = qualities[0];
    else if (qualities.length > 1) query.quality = { $in: qualities };
  }

  if (filters.is_active !== undefined) {
    query.is_active = filters.is_active === 'true' || filters.is_active === true;
  }

  const sortOption = { created_at: -1, _id: -1 };

  const [masterProducts, total] = await Promise.all([
    MasterProduct.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
    MasterProduct.countDocuments(query),
  ]);

  if (masterProducts.length === 0) {
    return {
      items: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  const masterKeys = masterProducts.map((mp) => mp.master_key);

  // Aggregate inventory totals per master_key across active reels
  const aggregations = await Reel.aggregate([
    {
      $match: {
        record_status: RECORD_STATUS.ACTIVE,
        master_key: { $in: masterKeys },
      },
    },
    {
      $group: {
        _id: '$master_key',
        reel_count: { $sum: 1 },
        total_max_weight: { $sum: '$max_weight' },
        total_available_weight: { $sum: '$previous_weight' },
        reel_status_counts: {
          $push: '$status',
        },
      },
    },
  ]);

  const aggMap = new Map(aggregations.map((a) => [a._id, a]));

  const items = masterProducts.map((mp) => {
    const stats = aggMap.get(mp.master_key) || {
      reel_count: 0,
      total_max_weight: 0,
      total_available_weight: 0,
      reel_status_counts: [],
    };

    const statusCounts = (stats.reel_status_counts || []).reduce((acc, st) => {
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    return {
      id: mp._id.toString(),
      master_key: mp.master_key,
      name: mp.name,
      quality: mp.quality,
      gsm: mp.gsm,
      bf: mp.bf,
      size: mp.size,
      parameter_codes: mp.parameter_codes,
      is_active: mp.is_active,
      metrics: {
        reel_count: stats.reel_count,
        total_max_weight: Math.round(stats.total_max_weight * 100) / 100,
        total_available_weight: Math.round(stats.total_available_weight * 100) / 100,
        consumed_weight: Math.round((stats.total_max_weight - stats.total_available_weight) * 100) / 100,
        reel_status_counts: statusCounts,
      },
      created_at: mp.created_at,
    };
  });

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Gets detailed MasterProduct by ID with aggregated inventory metrics.
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function getMasterProduct({ id, actor }) {
  const mp = await MasterProduct.findById(id).lean();
  if (!mp) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Master product not found.');
  }

  const aggregations = await Reel.aggregate([
    {
      $match: {
        record_status: RECORD_STATUS.ACTIVE,
        master_key: mp.master_key,
      },
    },
    {
      $group: {
        _id: '$master_key',
        reel_count: { $sum: 1 },
        total_max_weight: { $sum: '$max_weight' },
        total_available_weight: { $sum: '$previous_weight' },
        suppliers: { $addToSet: '$supplier_name' },
      },
    },
  ]);

  const stats = aggregations[0] || {
    reel_count: 0,
    total_max_weight: 0,
    total_available_weight: 0,
    suppliers: [],
  };

  return {
    id: mp._id.toString(),
    master_key: mp.master_key,
    name: mp.name,
    quality: mp.quality,
    gsm: mp.gsm,
    bf: mp.bf,
    size: mp.size,
    parameter_codes: mp.parameter_codes,
    is_active: mp.is_active,
    metrics: {
      reel_count: stats.reel_count,
      total_max_weight: Math.round(stats.total_max_weight * 100) / 100,
      total_available_weight: Math.round(stats.total_available_weight * 100) / 100,
      consumed_weight: Math.round((stats.total_max_weight - stats.total_available_weight) * 100) / 100,
      suppliers: stats.suppliers,
    },
    created_at: mp.created_at,
  };
}

/**
 * Lists reels belonging to a specific Master Product.
 * @param {{ id: string, query?: object, actor: object }} args
 * @returns {Promise<{ master_product: object, items: Array<object>, meta: object }>}
 */
export async function getMasterProductReels({ id, query = {}, actor }) {
  const mp = await MasterProduct.findById(id).lean();
  if (!mp) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Master product not found.');
  }

  const { page, limit, skip } = parsePagination(query);

  const filter = {
    record_status: RECORD_STATUS.ACTIVE,
    master_key: mp.master_key,
  };

  const [reels, total] = await Promise.all([
    Reel.find(filter).sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Reel.countDocuments(filter),
  ]);

  const items = reels.map((reel) => ({
    id: reel._id.toString(),
    sr_no: reel.sr_no,
    reel_no: reel.reel_no,
    quality: reel.quality,
    bf: reel.bf,
    gsm: reel.gsm,
    size: reel.size,
    supplier_name: reel.supplier_name,
    max_weight: reel.max_weight,
    previous_weight: reel.previous_weight,
    status: reel.status,
    purchase_date: reel.purchase_date,
    last_activity_at: reel.last_activity_at,
    created_at: reel.created_at,
  }));

  return {
    master_product: {
      id: mp._id.toString(),
      master_key: mp.master_key,
      name: mp.name,
    },
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Previews generated master key for given parameters.
 * @param {{ quality: string, gsm: number, bf: number, size: number }} input
 * @returns {object}
 */
export function previewMasterKey(input) {
  return generateMasterKey(input);
}

/**
 * Updates status of a Master Product (Admin only).
 * @param {{ id: string, is_active: boolean, actor: object }} args
 * @returns {Promise<object>}
 */
export async function updateMasterProductStatus({ id, is_active, actor }) {
  const mp = await MasterProduct.findById(id);
  if (!mp) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Master product not found.');
  }
  mp.is_active = is_active;
  await mp.save();

  return {
    id: mp._id.toString(),
    master_key: mp.master_key,
    is_active: mp.is_active,
  };
}
