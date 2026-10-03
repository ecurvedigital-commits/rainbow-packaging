import { Reel } from '../models/reel.model.js';
import { ReelEvent } from '../models/reelEvent.model.js';
import { FieldDefinition } from '../models/fieldDefinition.model.js';
import { ROLES } from '../constants/roles.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { RECORD_STATUS } from '../constants/reelStatus.js';
import { deriveReelStatus } from '../utils/reelStatus.js';
import { buildReelFilter } from '../utils/buildReelFilter.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { getNextSequence } from './counter.service.js';
import { appendEvent } from './eventLog.service.js';
import { resolveMasterProduct } from './masterProduct.service.js';
import { withTransaction } from '../config/db.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

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

  const [reels, total] = await Promise.all([
    Reel.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
    Reel.countDocuments(query),
  ]);

  const items = reels.map((reel) => {
    const json = {
      id: reel._id.toString(),
      sr_no: reel.sr_no,
      reel_no: reel.reel_no,
      master_product_id: reel.master_product_id ? reel.master_product_id.toString() : null,
      master_key: reel.master_key || null,
      master_code_id: reel.master_code_id ? reel.master_code_id.toString() : null,
      master_code: reel.master_code || null,
      quality: reel.quality,
      bf: reel.bf,
      purchase_date: reel.purchase_date,
      supplier_name: reel.supplier_name,
      size: reel.size,
      gsm: reel.gsm,
      max_weight: reel.max_weight,
      previous_weight: reel.previous_weight,
      consumed_weight: Math.round((reel.max_weight - reel.previous_weight) * 100) / 100,
      status: reel.status,
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
  const maxLimit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * maxLimit;

  const regex = new RegExp(searchStr, 'i');
  const reels = await Reel.find({
    record_status: RECORD_STATUS.ACTIVE,
    reel_no: regex,
  })
    .skip(skip)
    .limit(maxLimit)
    .lean();

  // Sort exact match first
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
    reel_no: reel.reel_no,
    master_key: reel.master_key || null,
    quality: reel.quality,
    supplier_name: reel.supplier_name || null,
    previous_weight: reel.previous_weight,
    max_weight: reel.max_weight,
    status: reel.status,
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

  return {
    id: reel._id.toString(),
    sr_no: reel.sr_no,
    reel_no: reel.reel_no,
    master_product_id: reel.master_product_id ? reel.master_product_id.toString() : null,
    master_key: reel.master_key || null,
    master_code_id: reel.master_code_id ? reel.master_code_id.toString() : null,
    master_code: reel.master_code || null,
    quality: reel.quality,
    bf: reel.bf,
    purchase_date: reel.purchase_date,
    supplier_name: reel.supplier_name,
    size: reel.size,
    gsm: reel.gsm,
    max_weight: reel.max_weight,
    previous_weight: reel.previous_weight,
    consumed_weight: Math.round((reel.max_weight - reel.previous_weight) * 100) / 100,
    status: reel.status,
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
        by_name: event.approved_by_name || 'Admin',
        at: event.approved_at || event.performed_at,
        reason: declineReason,
      };
    }

    return {
      id: event._id.toString(),
      event_type: event.event_type,
      approval_status: event.approval_status,
      performed_by_name: event.performed_by_name,
      performed_at: event.performed_at,
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
    const isOperator = actor.role === ROLES.OPERATOR;
    const initialApprovalStatus = isOperator ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;
    const pendingCount = isOperator ? 1 : 0;
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
          size: input.size,
          gsm: input.gsm,
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
      payload: {
        max_weight: input.max_weight,
        fields: {
          reel_no: reel.reel_no,
          quality: reel.quality,
          bf: reel.bf,
          gsm: reel.gsm,
          size: reel.size,
          supplier_name: reel.supplier_name,
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

    // Re-resolve MasterProduct if specification changed
    const masterProduct = await resolveMasterProduct({
      quality: reel.quality,
      gsm: reel.gsm,
      bf: reel.bf,
      size: reel.size,
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
    masterKeys,
    statuses,
    stations,
    fieldDefs,
  ] = await Promise.all([
    Reel.distinct('quality', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('gsm', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('bf', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('size', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('supplier_name', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('master_key', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('status', { record_status: RECORD_STATUS.ACTIVE }),
    Reel.distinct('stations_used', { record_status: RECORD_STATUS.ACTIVE }),
    FieldDefinition.find({ is_active: true }).lean(),
  ]);

  return {
    qualities: qualities.filter(Boolean).sort(),
    gsms: gsms.filter(Boolean).sort((a, b) => a - b),
    bfs: bfs.filter(Boolean).sort((a, b) => a - b),
    sizes: sizes.filter(Boolean).sort((a, b) => a - b),
    suppliers: suppliers.filter(Boolean).sort(),
    master_keys: masterKeys.filter(Boolean).sort(),
    statuses: statuses.filter(Boolean).sort(),
    stations: stations.filter(Boolean).sort(),
    custom_fields: fieldDefs.map((f) => ({ key: f.key, name: f.name, type: f.field_type, options: f.options || [] })),
  };
}

