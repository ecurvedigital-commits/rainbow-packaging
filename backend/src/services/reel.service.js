import { Reel } from '../models/reel.model.js';
import { ReelEvent } from '../models/reelEvent.model.js';
import { FieldDefinition } from '../models/fieldDefinition.model.js';
import { MasterCode } from '../models/masterCode.model.js';
import { Counter } from '../models/counter.model.js';
import { MasterProduct } from '../models/masterProduct.model.js';
import { ROLES } from '../constants/roles.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { RECORD_STATUS } from '../constants/reelStatus.js';
import { STATIONS } from '../constants/stations.js';
import { deriveReelStatus } from '../utils/reelStatus.js';
import { generateMasterKey } from '../utils/masterKeyGenerator.js';
import { buildReelFilter } from '../utils/buildReelFilter.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { getNextSequence } from './counter.service.js';
import { appendEvent } from './eventLog.service.js';
import { resolveMasterProduct } from './masterProduct.service.js';
import { withTransaction } from '../config/db.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Helper to match a reel's physical properties to a MasterCode bucket.
 */
export function matchReelToMasterCode(reel, mc) {
  if (!mc) return false;
  if (reel.master_code && (String(reel.master_code) === String(mc.master_code) || String(reel.master_code) === `Master Code ${mc.master_code}`)) {
    return true;
  }
  if (reel.master_code_id && String(reel.master_code_id) === String(mc._id || mc.id || mc.master_code_id)) {
    return true;
  }

  const reelQ = String(reel.quality || '').trim().toUpperCase();
  const mcQ = String(mc.quality || '').trim().toUpperCase();
  const mcBf = String(mc.bf || '').trim().toUpperCase();
  const mcName = String(mc.master_code_name || '').trim().toUpperCase();

  let qualityMatches = false;
  if (mcQ === 'DUPLEX' || !mcQ) {
    if (mcBf === 'ULTRA' || mcName.includes('ULTRA')) {
      qualityMatches = reelQ === 'ULTRA' || reelQ === 'DUPLEX';
    } else if (mcBf === 'DCB' || mcName.includes('DCB')) {
      qualityMatches = reelQ === 'DCB' || reelQ === 'DUPLEX';
    } else if (mcBf === 'SPECTRA' || mcName.includes('SPECTRA')) {
      qualityMatches = reelQ === 'SPECTRA' || reelQ === 'DUPLEX';
    } else {
      qualityMatches = reelQ === 'DUPLEX' || reelQ === 'DCB' || reelQ === 'ULTRA' || reelQ === 'SPECTRA';
    }
  } else if (mcQ === 'IMPORT KRAFT' || mcQ === 'IMPORTANT') {
    qualityMatches = reelQ === 'IMPORT KRAFT' || reelQ === 'IMPORTANT';
  } else {
    qualityMatches = reelQ === mcQ;
  }

  if (!qualityMatches) return false;

  const numericMcBf = Number(mc.bf);
  if (!isNaN(numericMcBf) && numericMcBf > 0) {
    if (Number(reel.bf) !== numericMcBf) return false;
  }

  const mcGsmStr = String(mc.gsm || '').trim();
  const reelGsm = Number(reel.gsm);
  if (mcGsmStr) {
    if (mcGsmStr.includes('/')) {
      const parts = mcGsmStr.split('/').map((p) => Number(p.trim())).filter((n) => !isNaN(n));
      if (!parts.includes(reelGsm)) return false;
    } else if (mcGsmStr.endsWith('+')) {
      const minGsm = Number(mcGsmStr.replace('+', '').trim());
      if (reelGsm < minGsm) return false;
    } else if (!isNaN(Number(mcGsmStr)) && Number(mcGsmStr) > 0) {
      if (reelGsm !== Number(mcGsmStr)) return false;
    }
  }

  const numericMcSize = Number(mc.size);
  if (!isNaN(numericMcSize) && numericMcSize > 0) {
    if (Number(reel.size) !== numericMcSize) return false;
  }

  return true;
}

/**
 * Lists reels with filters, pagination, and sorting (docs/routes/reels.md).
 * @param {{ filters: object, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listReels({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = buildReelFilter(filters, actor);

  const sortOption = {};
  if (filters.sort) {
    const isDesc = filters.sort.startsWith('-');
    const field = isDesc ? filters.sort.substring(1) : filters.sort;
    sortOption[field] = isDesc ? -1 : 1;
    if (field !== '_id') {
      sortOption._id = -1;
    }
  } else {
    sortOption.created_at = -1;
    sortOption._id = -1;
  }

  if (filters.master_code) {
    const rawCodes = String(filters.master_code).split(',').map((c) => c.trim()).filter(Boolean);
    const normalizeCode = (str) => String(str || '').toLowerCase().replace(/^(master\s*code|code|mc)\s*/i, '').trim();
    const targetNormalized = new Set(rawCodes.map(normalizeCode));

    const allMasterCodeDocs = await MasterCode.find({ status: 'ACTIVE' }).lean();

    const matchedMasterCodeDocs = allMasterCodeDocs.filter((mc) => {
      const codeNorm = normalizeCode(mc.master_code);
      const nameNorm = normalizeCode(mc.master_code_name);
      return targetNormalized.has(codeNorm) || targetNormalized.has(nameNorm) || rawCodes.includes(mc.master_code);
    });

    const mcOrConditions = [];

    rawCodes.forEach((c) => {
      const norm = normalizeCode(c);
      mcOrConditions.push({ master_code: c });
      if (norm) {
        mcOrConditions.push({ master_code: norm });
        mcOrConditions.push({ master_code: `Master Code ${norm}` });
      }
      mcOrConditions.push({ master_key: c });
    });

    matchedMasterCodeDocs.forEach((mc) => {
      if (mc._id) mcOrConditions.push({ master_code_id: mc._id });
      if (mc.master_code) {
        mcOrConditions.push({ master_code: mc.master_code });
        mcOrConditions.push({ master_code: `Master Code ${mc.master_code}` });
      }

      const mcQ = String(mc.quality || '').trim().toUpperCase();
      const mcBf = String(mc.bf || '').trim().toUpperCase();
      const mcName = String(mc.master_code_name || '').trim().toUpperCase();
      const cond = {};

      if (mcQ === 'DUPLEX' || !mcQ) {
        if (mcBf === 'ULTRA' || mcName.includes('ULTRA')) {
          cond.quality = { $in: ['ULTRA', 'DUPLEX', 'ultra', 'duplex'] };
        } else if (mcBf === 'DCB' || mcName.includes('DCB')) {
          cond.quality = { $in: ['DCB', 'DUPLEX', 'dcb', 'duplex'] };
        } else if (mcBf === 'SPECTRA' || mcName.includes('SPECTRA')) {
          cond.quality = { $in: ['SPECTRA', 'DUPLEX', 'spectra', 'duplex'] };
        } else {
          cond.quality = { $in: ['DUPLEX', 'DCB', 'ULTRA', 'SPECTRA', 'duplex', 'dcb', 'ultra', 'spectra'] };
        }
      } else if (mcQ === 'IMPORT KRAFT' || mcQ === 'IMPORTANT') {
        cond.quality = { $in: ['IMPORT KRAFT', 'IMPORTANT', 'import kraft', 'important'] };
      } else {
        cond.quality = new RegExp(`^${mc.quality}$`, 'i');
      }

      const numBf = Number(mc.bf);
      if (!isNaN(numBf) && numBf > 0) {
        cond.bf = numBf;
      }

      const gsmStr = String(mc.gsm || '').trim();
      if (gsmStr) {
        if (gsmStr.includes('/')) {
          const parts = gsmStr.split('/').map((p) => Number(p.trim())).filter((n) => !isNaN(n));
          cond.gsm = { $in: parts };
        } else if (gsmStr.endsWith('+')) {
          const minGsm = Number(gsmStr.replace('+', '').trim());
          cond.gsm = { $gte: minGsm };
        } else if (!isNaN(Number(gsmStr)) && Number(gsmStr) > 0) {
          cond.gsm = Number(gsmStr);
        }
      }

      const numSize = Number(mc.size);
      if (!isNaN(numSize) && numSize > 0) {
        cond.size = numSize;
      }

      mcOrConditions.push(cond);
    });

    delete query.master_code;
    delete query.master_key;

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: mcOrConditions }];
      delete query.$or;
    } else {
      query.$or = mcOrConditions;
    }
  }

  console.log('[listReels] Executing Mongoose Reel.find with query:', JSON.stringify(query));

  const [reels, total, masterCodeDocs, masterProductDocs] = await Promise.all([
    Reel.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
    Reel.countDocuments(query),
    MasterCode.find({ status: 'ACTIVE' }).lean(),
    MasterProduct.find({ is_active: true, master_code: { $ne: null } }).select('master_key master_code quality gsm bf size').lean(),
  ]);

  const items = reels.map((reel) => {
    let resolvedMasterCode = null;
    let resolvedMasterCodeName = null;
    let mcDoc = null;
    if (reel.master_code && reel.master_code !== reel.master_key) {
      resolvedMasterCode = reel.master_code;
      mcDoc = masterCodeDocs.find((m) => String(m.master_code) === String(reel.master_code));
    } else if (reel.master_code_id) {
      mcDoc = masterCodeDocs.find((m) => String(m._id) === String(reel.master_code_id));
      if (mcDoc) resolvedMasterCode = mcDoc.master_code;
    }

    if (!resolvedMasterCode && !mcDoc) {
      mcDoc = masterCodeDocs.find((mc) => matchReelToMasterCode(reel, mc));
      if (mcDoc) resolvedMasterCode = mcDoc.master_code;
    }
    if (mcDoc) {
      resolvedMasterCodeName = mcDoc.master_code_name;
    }

    const json = {
      id: reel._id.toString(),
      sr_no: reel.sr_no,
      reel_no: reel.reel_no,
      master_product_id: reel.master_product_id ? reel.master_product_id.toString() : null,
      master_key: reel.master_key || null,
      master_code_id: reel.master_code_id ? reel.master_code_id.toString() : (mcDoc ? mcDoc._id.toString() : null),
      master_code: resolvedMasterCode || null,
      master_code_name: resolvedMasterCodeName || null,
      quality: reel.quality,
      bf: reel.bf,
      purchase_date: reel.purchase_date,
      supplier_name: reel.supplier_name,
      mill_name: reel.mill_name || '',
      size: reel.size,
      gsm: reel.gsm,
      rate_per_kg: reel.rate_per_kg ?? 0,
      total_cost: Math.round(((reel.rate_per_kg || 0) * (reel.previous_weight ?? reel.max_weight)) * 100) / 100,
      max_weight: reel.max_weight,
      previous_weight: reel.previous_weight,
      consumed_weight: Math.round((reel.max_weight - reel.previous_weight) * 100) / 100,
      status: reel.status,
      pending_count: reel.pending_count || 0,
      approval_status: reel.pending_count > 0 ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED,
      custom_fields: reel.custom_fields || {},
      stations_used: reel.stations_used || [],
      record_status: reel.record_status,
      last_activity_at: reel.last_activity_at,
      created_at: reel.created_at,
    };
    return json;
  });

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Quick search lookup for reels by reel_no (docs/routes/reels.md).
 * @param {{ query: { q: string, limit?: number }, actor: object }} args
 * @returns {Promise<Array<object>>}
 */
export async function searchReels({ query = {}, actor }) {
  const searchStr = query.q ? query.q.trim() : '';
  if (!searchStr) return [];

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const maxLimit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * maxLimit;

  const regex = new RegExp(searchStr, 'i');
  const orConditions = [
    { reel_no: regex },
    { supplier_name: regex },
    { mill_name: regex },
    { master_key: regex },
    { master_code: regex },
    { quality: regex },
  ];

  const numVal = Number(searchStr);
  if (!isNaN(numVal) && numVal > 0) {
    orConditions.push({ gsm: numVal });
    orConditions.push({ bf: numVal });
    orConditions.push({ size: numVal });
    orConditions.push({ previous_weight: numVal });
  }

  const reels = await Reel.find({
    record_status: RECORD_STATUS.ACTIVE,
    $or: orConditions,
  })
    .skip(skip)
    .limit(maxLimit)
    .lean();

  // Sort exact reel_no or supplier match first
  reels.sort((a, b) => {
    const aExact = a.reel_no.toLowerCase() === searchStr.toLowerCase();
    const bExact = b.reel_no.toLowerCase() === searchStr.toLowerCase();
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    const aStarts = a.reel_no.toLowerCase().startsWith(searchStr.toLowerCase());
    const bStarts = b.reel_no.toLowerCase().startsWith(searchStr.toLowerCase());
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  return reels.map((reel) => ({
    id: reel._id.toString(),
    sr_no: reel.sr_no,
    reel_no: reel.reel_no,
    master_key: reel.master_key || null,
    master_code: reel.master_code || null,
    quality: reel.quality,
    gsm: reel.gsm,
    bf: reel.bf,
    size: reel.size,
    supplier_name: reel.supplier_name || null,
    mill_name: reel.mill_name || '',
    previous_weight: reel.previous_weight,
    max_weight: reel.max_weight,
    status: reel.status,
    pending_count: reel.pending_count || 0,
    created_at: reel.created_at || reel.purchase_date,
    approval_status: reel.pending_count > 0 ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED,
  }));
}

/**
 * Get reel details by id (docs/routes/reels.md).
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function getReel({ id, actor }) {
  const reel = await Reel.findById(id).lean();

  if (!reel || (reel.record_status === RECORD_STATUS.VOIDED && actor.role !== ROLES.ADMIN)) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Reel not found.');
  }

  let resolvedMasterCode = reel.master_code || null;
  let resolvedMasterCodeName = null;
  const masterCodeDocs = await MasterCode.find({ status: 'ACTIVE' }).lean();
  let mcDoc = null;
  if (reel.master_code_id) {
    mcDoc = masterCodeDocs.find((m) => String(m._id) === String(reel.master_code_id));
  }
  if (!mcDoc && resolvedMasterCode && resolvedMasterCode !== reel.master_key) {
    mcDoc = masterCodeDocs.find((m) => String(m.master_code) === String(resolvedMasterCode));
  }
  if (!mcDoc) {
    mcDoc = masterCodeDocs.find((mc) => matchReelToMasterCode(reel, mc));
  }
  if (mcDoc) {
    resolvedMasterCode = mcDoc.master_code;
    resolvedMasterCodeName = mcDoc.master_code_name;
  }

  return {
    id: reel._id.toString(),
    sr_no: reel.sr_no,
    reel_no: reel.reel_no,
    master_product_id: reel.master_product_id ? reel.master_product_id.toString() : null,
    master_key: reel.master_key || null,
    master_code_id: reel.master_code_id ? reel.master_code_id.toString() : (mcDoc ? mcDoc._id.toString() : null),
    master_code: resolvedMasterCode || null,
    master_code_name: resolvedMasterCodeName || null,
    quality: reel.quality,
    bf: reel.bf,
    purchase_date: reel.purchase_date,
    supplier_name: reel.supplier_name,
    mill_name: reel.mill_name || '',
    size: reel.size,
    gsm: reel.gsm,
    rate_per_kg: reel.rate_per_kg ?? 0,
    total_cost: Math.round(((reel.rate_per_kg || 0) * (reel.previous_weight ?? reel.max_weight)) * 100) / 100,
    max_weight: reel.max_weight,
    previous_weight: reel.previous_weight,
    consumed_weight: Math.round((reel.max_weight - reel.previous_weight) * 100) / 100,
    status: reel.status,
    pending_count: reel.pending_count || 0,
    approval_status: reel.pending_count > 0 ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED,
    custom_fields: reel.custom_fields || {},
    stations_used: reel.stations_used || [],
    record_status: reel.record_status,
    last_activity_at: reel.last_activity_at,
    created_at: reel.created_at,
  };
}

/**
 * Get reel timeline journey with database-level pagination (docs/routes/reels.md).
 * @param {{ id: string, query?: object, actor: object }} args
 * @returns {Promise<{ reel: object, events: Array<object>, meta: object }>}
 */
export async function getReelJourney({ id, query = {}, actor }) {
  const reelObj = await getReel({ id, actor });
  const { page, limit, skip } = parsePagination(query, 50, 100);

  const primaryTypes = [EVENT_TYPES.CREATED, EVENT_TYPES.USAGE_LOGGED, EVENT_TYPES.ADMIN_CORRECTED];
  const filter = { reel_id: id, event_type: { $in: primaryTypes } };

  const [rawPrimaryEvents, total] = await Promise.all([
    ReelEvent.find(filter).sort({ performed_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    ReelEvent.countDocuments(filter),
  ]);

  if (rawPrimaryEvents.length === 0) {
    return {
      reel: reelObj,
      events: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  const primaryIds = rawPrimaryEvents.map((e) => e._id);
  const decisionEvents = await ReelEvent.find({
    reel_id: id,
    ref_event_id: { $in: primaryIds },
  }).lean();

  const decisionMap = new Map(decisionEvents.map((d) => [d.ref_event_id.toString(), d]));

  const events = rawPrimaryEvents.map((event) => {
    const decisionDoc = decisionMap.get(event._id.toString());
    const declineReason = event.decline_reason || (decisionDoc ? decisionDoc.decline_reason : null);
    let decision = null;

    const approvedByName = event.approved_by_name || (decisionDoc ? decisionDoc.performed_by_name : (event.approval_status === APPROVAL_STATUS.CONFIRMED ? (event.performed_by_name || 'System Admin') : null));
    const approvedAt = event.approved_at || (decisionDoc ? decisionDoc.performed_at : (event.approval_status === APPROVAL_STATUS.CONFIRMED ? (event.performed_at || event.created_at) : null));

    if (decisionDoc) {
      decision = {
        by_name: decisionDoc.performed_by_name,
        at: decisionDoc.performed_at,
        reason: declineReason,
      };
      if (decisionDoc.payload && decisionDoc.payload.reverted_from !== undefined) {
        decision.reverted_from = decisionDoc.payload.reverted_from;
        decision.reverted_to = decisionDoc.payload.reverted_to;
      }
    } else if (event.approval_status === APPROVAL_STATUS.DECLINED) {
      decision = {
        by_name: approvedByName || 'Admin',
        at: approvedAt || event.performed_at,
        reason: declineReason,
      };
    } else if (event.approval_status === APPROVAL_STATUS.CONFIRMED) {
      decision = {
        by_name: approvedByName,
        at: approvedAt,
      };
    }

    return {
      id: event._id.toString(),
      event_type: event.event_type,
      approval_status: event.approval_status,
      performed_by_name: event.performed_by_name,
      performed_at: event.performed_at,
      approved_by_name: approvedByName,
      approved_at: approvedAt,
      decline_reason: declineReason,
      payload: event.payload || {},
      decision,
    };
  });

  return {
    reel: reelObj,
    events,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Bulk Create Reels using insertMany
 */
export const bulkCreateReels = async ({ input, actor }) => withTransaction(async (session) => {
  if (!Array.isArray(input) || input.length === 0) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Input must be a non-empty array of reels.');
  }

  // 1. Duplicate reel numbers inside the batch and against existing active reels
  const seen = new Map();
  const reelNos = input.map((row, idx) => {
    const no = String(row.reel_no).trim();
    if (seen.has(no)) {
      throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, `Row ${idx + 1}: reel number "${no}" is duplicated (also in row ${seen.get(no) + 1}).`);
    }
    seen.set(no, idx);
    return no;
  });

  const existing = await Reel.find({ reel_no: { $in: reelNos }, record_status: RECORD_STATUS.ACTIVE })
    .select('reel_no')
    .session(session)
    .lean();
  if (existing.length) {
    const list = existing.slice(0, 5).map((r) => r.reel_no).join(', ');
    throw createApiError(409, ERROR_CODES.DUPLICATE_REEL_NO, `Reel number(s) already exist: ${list}${existing.length > 5 ? ' …' : ''}`);
  }

  // 2. Resolve master products once per unique spec (sequential: same session)
  const productCache = new Map();
  const resolved = [];
  for (let idx = 0; idx < input.length; idx++) {
    const row = input[idx];
    const cacheKey = [row.quality, row.gsm, row.bf, row.size, row.master_code_id || row.master_code || ''].join('|');
    let product = productCache.get(cacheKey);
    if (!product) {
      try {
        product = await resolveMasterProduct({
          quality: row.quality,
          gsm: row.gsm,
          bf: row.bf,
          size: row.size,
          master_code: row.master_code,
          master_code_id: row.master_code_id,
          actor,
          session,
        });
      } catch (err) {
        throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, `Row ${idx + 1}: ${err.message}`);
      }
      productCache.set(cacheKey, product);
    }
    resolved.push(product);
  }

  // 3. Reserve a contiguous block of sr_no values in one atomic step
  const firstSr = await getNextSequence('reel_sr_no', session);
  if (input.length > 1) {
    await Counter.updateOne({ _id: 'reel_sr_no' }, { $inc: { seq: input.length - 1 } }, { session });
  }

  const now = new Date();
  const isOperator = actor.role === ROLES.OPERATOR;
  const initialApprovalStatus = isOperator ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;
  const reelDocs = input.map((row, idx) => ({
    sr_no: firstSr + idx,
    reel_no: reelNos[idx],
    master_product_id: resolved[idx]._id,
    master_key: resolved[idx].master_key,
    master_code_id: resolved[idx].master_code_id || null,
    master_code: resolved[idx].master_code || row.master_code || null,
    quality: row.quality,
    bf: row.bf,
    purchase_date: row.purchase_date ? new Date(row.purchase_date) : now,
    supplier_name: row.supplier_name.trim(),
    mill_name: row.mill_name ? String(row.mill_name).trim() : '',
    size: row.size,
    gsm: row.gsm,
    rate_per_kg: row.rate_per_kg ?? 0,
    max_weight: row.max_weight,
    previous_weight: row.max_weight,
    status: deriveReelStatus({ previous_weight: row.max_weight, max_weight: row.max_weight }),
    custom_fields: row.custom_fields || {},
    pending_count: isOperator ? 1 : 0,
    record_status: RECORD_STATUS.ACTIVE,
    created_by: actor.id,
    last_activity_at: now,
  }));

  const insertedReels = await Reel.insertMany(reelDocs, { session });

  const eventDocs = insertedReels.map((reel) => ({
    reel_id: reel._id,
    reel_no: reel.reel_no,
    event_type: EVENT_TYPES.CREATED,
    approval_status: initialApprovalStatus,
    performed_by: actor.id,
    performed_by_name: actor.name,
    performed_by_role: actor.role,
    performed_at: now,
    approved_by: isOperator ? null : actor.id,
    approved_by_name: isOperator ? null : actor.name,
    approved_at: isOperator ? null : now,
    payload: {
      max_weight: reel.max_weight,
      rate_per_kg: reel.rate_per_kg,
      fields: {
        reel_no: reel.reel_no,
        quality: reel.quality,
        bf: reel.bf,
        gsm: reel.gsm,
        size: reel.size,
        rate_per_kg: reel.rate_per_kg,
        supplier_name: reel.supplier_name,
        mill_name: reel.mill_name,
        purchase_date: reel.purchase_date,
        custom_fields: reel.custom_fields,
      },
    },
  }));
  await ReelEvent.insertMany(eventDocs, { session });

  return { insertedCount: insertedReels.length, message: `Successfully created ${insertedReels.length} reels in bulk.` };
});

/**
 * Create a new physical reel (docs/routes/reels.md).
 * @param {{ input: object, actor: object }} args
 * @returns {Promise<{ reel: object, event: object }>}
 */
export async function createReel({ input, actor }) {
  return withTransaction(async (session) => {
    const trimmedReelNo = input.reel_no.trim();

    const existing = await Reel.findOne({
      reel_no: trimmedReelNo,
      record_status: RECORD_STATUS.ACTIVE,
    }).session(session);

    if (existing) {
      throw createApiError(409, ERROR_CODES.DUPLICATE_REEL_NO, 'An active reel with this reel number already exists.');
    }

    const sr_no = await getNextSequence('reel_sr_no', session);
    
    // Approval workflow for reel creation: operator-created reels wait for supervisor/admin approval
    const isOperator = actor.role === ROLES.OPERATOR;
    const initialApprovalStatus = isOperator ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;
    const pendingCount = isOperator ? 1 : 0;

    // BYPASS (disabled): reel creation automatically confirmed immediately
    // const initialApprovalStatus = APPROVAL_STATUS.CONFIRMED;
    // const pendingCount = 0;
    const status = deriveReelStatus({ previous_weight: input.max_weight, max_weight: input.max_weight });

    const masterProduct = await resolveMasterProduct({
      quality: input.quality,
      gsm: input.gsm,
      bf: input.bf,
      size: input.size,
      master_code: input.master_code,
      master_code_id: input.master_code_id,
      actor,
      session,
    });

    const [reel] = await Reel.create(
      [
        {
          sr_no,
          reel_no: trimmedReelNo,
          master_product_id: masterProduct._id,
          master_key: masterProduct.master_key,
          master_code_id: masterProduct.master_code_id || null,
          master_code: masterProduct.master_code || input.master_code || null,
          quality: input.quality,
          bf: input.bf,
          purchase_date: input.purchase_date ? new Date(input.purchase_date) : new Date(),
          supplier_name: input.supplier_name.trim(),
          mill_name: input.mill_name ? input.mill_name.trim() : '',
          size: input.size,
          gsm: input.gsm,
          rate_per_kg: input.rate_per_kg !== undefined && input.rate_per_kg !== null ? Number(input.rate_per_kg) : 0,
          max_weight: input.max_weight,
          previous_weight: input.max_weight,
          status,
          custom_fields: input.custom_fields || {},
          pending_count: pendingCount,
          record_status: RECORD_STATUS.ACTIVE,
          created_by: actor.id,
          last_activity_at: new Date(),
        },
      ],
      { session }
    );

    const event = await appendEvent({
      reel_id: reel._id,
      reel_no: reel.reel_no,
      event_type: EVENT_TYPES.CREATED,
      approval_status: initialApprovalStatus,
      performed_by: actor,
      approved_by: isOperator ? null : actor,
      // BYPASS (disabled): approved_by: actor,
      payload: {
        max_weight: input.max_weight,
        rate_per_kg: reel.rate_per_kg,
        fields: {
          reel_no: reel.reel_no,
          quality: reel.quality,
          bf: reel.bf,
          gsm: reel.gsm,
          size: reel.size,
          rate_per_kg: reel.rate_per_kg,
          supplier_name: reel.supplier_name,
          mill_name: reel.mill_name,
          purchase_date: reel.purchase_date,
          custom_fields: reel.custom_fields,
        },
      },
      session,
    });

    return {
      reel: reel.toJSON(),
      event: event.toJSON(),
    };
  });
}

/**
 * Admin edits reel parameters (docs/routes/reels.md).
 * @param {{ id: string, input: object, actor: object }} args
 * @returns {Promise<{ reel: object, event: object }>}
 */
export async function updateReel({ id, input, actor }) {
  return withTransaction(async (session) => {
    const reel = await Reel.findById(id).session(session);
    if (!reel) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Reel not found.');
    }

    const isWeightChange = input.max_weight !== undefined || input.previous_weight !== undefined;
    if (isWeightChange && reel.pending_count > 0) {
      throw createApiError(
        409,
        ERROR_CODES.REEL_HAS_PENDING_EVENTS,
        'Cannot edit weight fields while entries are pending confirmation on this reel.'
      );
    }

    if (input.reel_no && input.reel_no.trim() !== reel.reel_no) {
      const existing = await Reel.findOne({
        reel_no: input.reel_no.trim(),
        record_status: RECORD_STATUS.ACTIVE,
        _id: { $ne: id },
      }).session(session);

      if (existing) {
        throw createApiError(409, ERROR_CODES.DUPLICATE_REEL_NO, 'An active reel with this reel number already exists.');
      }
      reel.reel_no = input.reel_no.trim();
    }

    const changes = [];

    if (input.quality !== undefined && input.quality !== reel.quality) {
      changes.push({ field: 'quality', from: reel.quality, to: input.quality });
      reel.quality = input.quality;
    }
    if (input.supplier_name !== undefined && input.supplier_name.trim() !== reel.supplier_name) {
      changes.push({ field: 'supplier_name', from: reel.supplier_name, to: input.supplier_name.trim() });
      reel.supplier_name = input.supplier_name.trim();
    }
    if (input.mill_name !== undefined && input.mill_name.trim() !== (reel.mill_name || '')) {
      changes.push({ field: 'mill_name', from: reel.mill_name || '', to: input.mill_name.trim() });
      reel.mill_name = input.mill_name.trim();
    }
    if (input.gsm !== undefined && input.gsm !== reel.gsm) {
      changes.push({ field: 'gsm', from: reel.gsm, to: input.gsm });
      reel.gsm = input.gsm;
    }
    if (input.size !== undefined && input.size !== reel.size) {
      changes.push({ field: 'size', from: reel.size, to: input.size });
      reel.size = input.size;
    }
    if (input.bf !== undefined && input.bf !== reel.bf) {
      changes.push({ field: 'bf', from: reel.bf, to: input.bf });
      reel.bf = input.bf;
    }
    if (input.rate_per_kg !== undefined && Number(input.rate_per_kg) !== reel.rate_per_kg) {
      changes.push({ field: 'rate_per_kg', from: reel.rate_per_kg, to: Number(input.rate_per_kg) });
      reel.rate_per_kg = Number(input.rate_per_kg);
    }

    if (input.master_code_id !== undefined || input.master_code !== undefined) {
      let targetCode = input.master_code || null;
      let targetCodeId = input.master_code_id || null;

      if (targetCodeId) {
        const mcDoc = await MasterCode.findById(targetCodeId).session(session);
        if (mcDoc) {
          targetCode = mcDoc.master_code;
        }
      } else if (targetCode) {
        const mcDoc = await MasterCode.findOne({ master_code: targetCode }).session(session);
        if (mcDoc) {
          targetCodeId = mcDoc._id.toString();
        }
      }

      if (targetCode !== reel.master_code) {
        changes.push({ field: 'master_code', from: reel.master_code, to: targetCode });
        reel.master_code = targetCode;
      }
      if (String(targetCodeId || '') !== String(reel.master_code_id || '')) {
        changes.push({ field: 'master_code_id', from: reel.master_code_id, to: targetCodeId });
        reel.master_code_id = targetCodeId;
      }
    }

    // Re-resolve MasterProduct if specification changed
    const masterProduct = await resolveMasterProduct({
      quality: reel.quality,
      gsm: reel.gsm,
      bf: reel.bf,
      size: reel.size,
      master_code: reel.master_code,
      master_code_id: reel.master_code_id,
      actor,
      session,
    });
    reel.master_product_id = masterProduct._id;
    reel.master_key = masterProduct.master_key;

    if (input.max_weight !== undefined && input.max_weight !== reel.max_weight) {
      changes.push({ field: 'max_weight', from: reel.max_weight, to: input.max_weight });
      reel.max_weight = input.max_weight;
    }
    if (input.previous_weight !== undefined && input.previous_weight !== reel.previous_weight) {
      changes.push({ field: 'previous_weight', from: reel.previous_weight, to: input.previous_weight });
      reel.previous_weight = input.previous_weight;
    }
    if (input.custom_fields !== undefined) {
      changes.push({ field: 'custom_fields', from: reel.custom_fields, to: input.custom_fields });
      reel.custom_fields = input.custom_fields;
    }
    if (input.station && input.station.trim()) {
      const stationTrim = input.station.trim();
      if (!reel.stations_used.includes(stationTrim)) {
        reel.stations_used.push(stationTrim);
        changes.push({ field: 'station', from: null, to: stationTrim });
      }
    }

    reel.status = deriveReelStatus({ previous_weight: reel.previous_weight, max_weight: reel.max_weight });
    reel.last_activity_at = new Date();
    await reel.save({ session });

    const event = await appendEvent({
      reel_id: reel._id,
      reel_no: reel.reel_no,
      event_type: EVENT_TYPES.ADMIN_CORRECTED,
      approval_status: APPROVAL_STATUS.CONFIRMED,
      performed_by: actor,
      approved_by: actor,
      payload: {
        action: 'EDIT',
        changes,
        reason: input.reason || null,
      },
      session,
    });

    return {
      reel: reel.toJSON(),
      event: event.toJSON(),
    };
  });
}

/**
 * Admin voids a reel from inventory (docs/routes/reels.md).
 * @param {{ id: string, input: { reason: string }, actor: object }} args
 * @returns {Promise<{ reel: object }>}
 */
export async function voidReel({ id, input, actor }) {
  return withTransaction(async (session) => {
    const reel = await Reel.findById(id).session(session);
    if (!reel) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Reel not found.');
    }

    reel.record_status = RECORD_STATUS.VOIDED;
    reel.pending_count = 0;
    reel.last_activity_at = new Date();
    await reel.save({ session });

    // Decline any pending events on this reel without revert
    await ReelEvent.updateMany(
      { reel_id: id, approval_status: APPROVAL_STATUS.PENDING },
      {
        $set: {
          approval_status: APPROVAL_STATUS.DECLINED,
          approved_by: actor.id,
          approved_by_name: actor.name,
          approved_at: new Date(),
          decline_reason: input.reason || 'Reel voided by Admin',
        },
      },
      { session }
    );

    await appendEvent({
      reel_id: reel._id,
      reel_no: reel.reel_no,
      event_type: EVENT_TYPES.ADMIN_CORRECTED,
      approval_status: APPROVAL_STATUS.CONFIRMED,
      performed_by: actor,
      approved_by: actor,
      payload: {
        action: 'VOID',
        reason: input.reason,
      },
      session,
    });

    return { reel: reel.toJSON() };
  });
}

/**
 * Automatically determine next reel number based on latest active reel in system.
 * @returns {Promise<{ next_reel_no: string }>}
 */
export async function getNextReelNumber() {
  const recentReels = await Reel.find({ record_status: RECORD_STATUS.ACTIVE })
    .sort({ created_at: -1, _id: -1 })
    .limit(100)
    .select('reel_no')
    .lean();

  let prefix = 'R-';
  let maxNum = 1000;
  let maxNumStrLen = 4;

  if (recentReels && recentReels.length > 0) {
    for (const reel of recentReels) {
      if (!reel.reel_no) continue;
      const match = reel.reel_no.match(/^(.*?)(0*(\d+))$/);
      if (match) {
        const p = match[1];
        const numStr = match[2];
        const val = parseInt(match[3], 10);
        if (val > maxNum) {
          maxNum = val;
          prefix = p;
          maxNumStrLen = numStr.length;
        }
      }
    }
  }

  let candidateNum = maxNum + 1;
  let candidateNo = `${prefix}${String(candidateNum).padStart(maxNumStrLen, '0')}`;

  while (await Reel.exists({ reel_no: candidateNo, record_status: RECORD_STATUS.ACTIVE })) {
    candidateNum++;
    candidateNo = `${prefix}${String(candidateNum).padStart(maxNumStrLen, '0')}`;
  }

  return { next_reel_no: candidateNo };
}

/**
 * Retrieves all distinct field values and registered variables across all active reels in the database.
 * @returns {Promise<object>}
 */
export async function getFilterOptions() {
  const [
    qualities,
    gsms,
    bfs,
    sizes,
    suppliers,
    millNames,
    masterKeys,
    reelMasterCodes,
    definedMasterCodesDocs,
    statuses,
    stations,
    fieldDefs,
  ] = await Promise.all([
    Reel.distinct('quality', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('gsm', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('bf', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('size', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('supplier_name', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('mill_name', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('master_key', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('master_code', { record_status: RECORD_STATUS.ACTIVE }),
    MasterCode.find({ status: 'ACTIVE' }).select('master_code').lean(),
    Reel.distinct('status', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('stations_used', { record_status: RECORD_STATUS.ACTIVE }),
    FieldDefinition.find({ is_active: true }).lean(),
  ]);

  const definedCodes = definedMasterCodesDocs.map((mc) => mc.master_code).filter(Boolean);
  const isTechnicalKey = (str) => typeof str === 'string' && /^[A-Z]+-G\d+-BF\d+-S\d+/.test(str);

  const cleanMasterCodes = Array.from(new Set([...definedCodes, ...reelMasterCodes]))
    .filter((code) => Boolean(code) && !isTechnicalKey(code))
    .sort((a, b) => {
      const matchA = String(a).match(/\d+/);
      const matchB = String(b).match(/\d+/);
      if (matchA && matchB) {
        return parseInt(matchA[0], 10) - parseInt(matchB[0], 10);
      }
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });

  return {
    qualities: qualities.filter(Boolean).sort(),
    gsms: gsms.filter(Boolean).sort((a, b) => a - b),
    bfs: bfs.filter(Boolean).sort((a, b) => a - b),
    sizes: sizes.filter(Boolean).sort((a, b) => a - b),
    suppliers: suppliers.filter(Boolean).sort(),
    mill_names: millNames.filter(Boolean).sort(),
    master_keys: masterKeys.filter(Boolean).sort(),
    master_codes: cleanMasterCodes,
    statuses: statuses.filter(Boolean).sort(),
    stations: Array.from(new Set([...STATIONS, ...stations.filter(Boolean)])).sort(),
    custom_fields: fieldDefs.map((f) => ({ key: f.key, name: f.name, type: f.field_type, options: f.options || [] })),
  };
}

