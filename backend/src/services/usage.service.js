import { Reel } from '../models/reel.model.js';
import { ReelEvent } from '../models/reelEvent.model.js';
import { ROLES } from '../constants/roles.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { RECORD_STATUS } from '../constants/reelStatus.js';
import { deriveReelStatus } from '../utils/reelStatus.js';
import { appendEvent } from './eventLog.service.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { withTransaction } from '../config/db.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Record weight usage on a reel (docs/routes/reels.md).
 * @param {{ id: string, input: { station: string, current_weight_entered: number, expected_previous_weight?: number }, actor: object }} args
 * @returns {Promise<{ reel: object, event: object }>}
 */
export async function recordUsage({ id, input, actor }) {
  return withTransaction(async (session) => {
    const reel = await Reel.findById(id).session(session);

    if (!reel || reel.record_status === RECORD_STATUS.VOIDED) {
      throw createApiError(422, ERROR_CODES.REEL_NOT_ACTIVE, 'Reel is not active or has been voided.');
    }

    if (reel.previous_weight <= 0) {
      throw createApiError(422, ERROR_CODES.REEL_ALREADY_EMPTY, 'Reel is already fully used (NILL balance).');
    }

    if (input.expected_previous_weight !== undefined && Math.abs(reel.previous_weight - input.expected_previous_weight) > 0.01) {
      throw createApiError(
        409,
        ERROR_CODES.STALE_WEIGHT,
        'Reel weight balance has changed since it was loaded. Please refresh the screen.'
      );
    }

    if (actor.role === ROLES.ADMIN && reel.pending_count > 0) {
      throw createApiError(
        409,
        ERROR_CODES.REEL_HAS_PENDING_EVENTS,
        'Cannot record Admin usage while entries are pending confirmation on this reel.'
      );
    }

    if (input.current_weight_entered < 0 || input.current_weight_entered >= reel.previous_weight) {
      throw createApiError(
        422,
        ERROR_CODES.VALIDATION_ERROR,
        `Current weight entered (${input.current_weight_entered} kg) must be less than previous balance (${reel.previous_weight} kg) and at least 0.`
      );
    }

    const previous_weight = reel.previous_weight;
    const current_weight_entered = Math.round(input.current_weight_entered * 100) / 100;
    const used_this_time = Math.round((previous_weight - current_weight_entered) * 100) / 100;

    // Apply change immediately
    reel.previous_weight = current_weight_entered;
    reel.status = deriveReelStatus({ previous_weight: reel.previous_weight, max_weight: reel.max_weight });

    if (!reel.stations_used.includes(input.station)) {
      reel.stations_used.push(input.station);
    }
    reel.last_activity_at = new Date();

    const isOperator = actor.role === ROLES.OPERATOR;
    const eventApprovalStatus = isOperator ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;

    if (isOperator) {
      reel.pending_count += 1;
    }

    await reel.save({ session });

    const event = await appendEvent({
      reel_id: reel._id,
      reel_no: reel.reel_no,
      event_type: EVENT_TYPES.USAGE_LOGGED,
      approval_status: eventApprovalStatus,
      performed_by: actor,
      approved_by: isOperator ? null : actor,
      payload: {
        station: input.station,
        previous_weight,
        current_weight_entered,
        used_this_time,
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
 * List all reel usage logs with search, status filtering, and pagination.
 * @param {{ filters: object, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listUsageLogs({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = { event_type: EVENT_TYPES.USAGE_LOGGED };

  if (filters.approval_status) {
    query.approval_status = filters.approval_status.toUpperCase();
  }

  if (filters.station) {
    query['payload.station'] = filters.station;
  }

  if (filters.q && filters.q.trim()) {
    const qTrim = filters.q.trim();
    const regex = new RegExp(qTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(qTrim);

    const matchingReels = await Reel.find({
      $or: [
        { reel_no: regex },
        { supplier_name: regex },
        { master_key: regex },
        { quality: regex },
        ...(isObjectId ? [{ _id: qTrim }] : []),
      ],
    }).select('_id').lean();

    const matchingReelIds = matchingReels.map((r) => r._id);

    query.$or = [
      { reel_no: regex },
      { performed_by_name: regex },
      { 'payload.station': regex },
      { reel_id: { $in: matchingReelIds } },
      ...(isObjectId ? [{ _id: qTrim }, { reel_id: qTrim }] : []),
    ];
  }

  const sortDir = filters.sort === 'oldest' ? 1 : -1;

  const [rawEvents, total] = await Promise.all([
    ReelEvent.find(query).sort({ performed_at: sortDir, _id: sortDir }).skip(skip).limit(limit).lean(),
    ReelEvent.countDocuments(query),
  ]);

  const reelIds = [...new Set(rawEvents.map((e) => e.reel_id.toString()))];
  const reels = await Reel.find({ _id: { $in: reelIds } }).lean();
  const reelMap = new Map(reels.map((r) => [r._id.toString(), r]));

  const items = rawEvents.map((event) => {
    const reelObj = reelMap.get(event.reel_id.toString());
    return {
      id: event._id.toString(),
      event_type: event.event_type,
      approval_status: event.approval_status,
      reel_id: event.reel_id.toString(),
      reel_no: event.reel_no,
      quality: reelObj?.quality || null,
      master_key: reelObj?.master_key || null,
      supplier_name: reelObj?.supplier_name || null,
      performed_by_name: event.performed_by_name,
      performed_by_role: event.performed_by_role,
      performed_at: event.performed_at,
      approved_by_name: event.approved_by_name,
      approved_at: event.approved_at,
      decline_reason: event.decline_reason || null,
      station: event.payload?.station || 'E-Flute',
      previous_weight: event.payload?.previous_weight,
      current_weight_entered: event.payload?.current_weight_entered,
      used_this_time: event.payload?.used_this_time,
    };
  });

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
