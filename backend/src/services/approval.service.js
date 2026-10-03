import { ReelEvent } from '../models/reelEvent.model.js';
import { Reel } from '../models/reel.model.js';
import { Notification } from '../models/notification.model.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { RECORD_STATUS } from '../constants/reelStatus.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { deriveReelStatus } from '../utils/reelStatus.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { withTransaction } from '../config/db.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * List pending entries waiting for approval (docs/routes/approvals.md).
 * @param {{ filters: { event_type?: string, performed_by?: string, q?: string, page?: number, limit?: number }, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listPendingApprovals({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = { approval_status: APPROVAL_STATUS.PENDING };

  if (filters.event_type) {
    query.event_type = filters.event_type.toUpperCase();
  }

  if (filters.performed_by) {
    query.performed_by = filters.performed_by;
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

    const searchConditions = [
      { reel_no: regex },
      { performed_by_name: regex },
      { event_type: regex },
      { reel_id: { $in: matchingReelIds } },
    ];

    if (isObjectId) {
      searchConditions.push({ _id: qTrim }, { reel_id: qTrim });
    }

    query.$or = searchConditions;
  }

  // Sort: default to newest first (-1) so newly submitted reels appear immediately at the top
  const sortDir = filters.sort === 'oldest' || filters.sort === 'performed_at' ? 1 : -1;

  const [rawEvents, total] = await Promise.all([
    ReelEvent.find(query).sort({ performed_at: sortDir, _id: sortDir }).skip(skip).limit(limit).lean(),
    ReelEvent.countDocuments(query),
  ]);

  if (rawEvents.length === 0) {
    return {
      items: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  // Fetch associated reels
  const reelIds = [...new Set(rawEvents.map((e) => e.reel_id.toString()))];
  const reels = await Reel.find({ _id: { $in: reelIds } }).lean();
  const reelMap = new Map(reels.map((r) => [r._id.toString(), r]));

  // Check FIFO ordering per reel
  const now = Date.now();
  let oldest_waiting_hours = 0;

  const items = await Promise.all(
    rawEvents.map(async (event) => {
      const performedAtTime = new Date(event.performed_at).getTime();
      const waiting_hours = Math.max(0, Math.floor((now - performedAtTime) / (1000 * 60 * 60)));
      if (waiting_hours > oldest_waiting_hours) {
        oldest_waiting_hours = waiting_hours;
      }

      // Check if an older pending event exists on the same reel
      const olderPendingCount = await ReelEvent.countDocuments({
        reel_id: event.reel_id,
        approval_status: APPROVAL_STATUS.PENDING,
        performed_at: { $lt: event.performed_at },
      });

      const can_confirm = olderPendingCount === 0;
      const reelObj = reelMap.get(event.reel_id.toString());

      return {
        id: event._id.toString(),
        reel_id: event.reel_id ? event.reel_id.toString() : null,
        event_type: event.event_type,
        reel: reelObj
          ? {
              id: reelObj._id.toString(),
              reel_no: reelObj.reel_no,
              quality: reelObj.quality,
              supplier_name: reelObj.supplier_name,
              master_key: reelObj.master_key,
              previous_weight: reelObj.previous_weight,
            }
          : { id: event.reel_id.toString(), reel_no: event.reel_no },
        performed_by_name: event.performed_by_name,
        performed_at: event.performed_at,
        waiting_hours,
        can_confirm,
        payload: event.payload || {},
      };
    })
  );

  const meta = buildPaginationMeta({ page, limit, total });
  meta.oldest_waiting_hours = oldest_waiting_hours;

  return { items, meta };
}

/**
 * List operator's own submitted entries (docs/routes/approvals.md).
 * @param {{ filters: { status?: string, page?: number, limit?: number }, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listMyEntries({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = { performed_by: actor.id };

  if (filters.status) {
    query.approval_status = filters.status.toUpperCase();
  } else {
    query.approval_status = { $ne: null };
  }

  if (filters.event_type) {
    query.event_type = filters.event_type.toUpperCase();
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

    const searchConditions = [
      { reel_no: regex },
      { performed_by_name: regex },
      { event_type: regex },
      { reel_id: { $in: matchingReelIds } },
    ];

    if (isObjectId) {
      searchConditions.push({ _id: qTrim }, { reel_id: qTrim });
    }

    query.$or = searchConditions;
  }

  const sortDir = filters.sort === 'oldest' || filters.sort === 'performed_at' ? 1 : -1;

  const [rawEvents, total, pendingCount, confirmedCount, declinedCount] = await Promise.all([
    ReelEvent.find(query).sort({ performed_at: sortDir, _id: sortDir }).skip(skip).limit(limit).lean(),
    ReelEvent.countDocuments(query),
    ReelEvent.countDocuments(query),
    ReelEvent.countDocuments({ performed_by: actor.id, approval_status: APPROVAL_STATUS.PENDING }),
    ReelEvent.countDocuments({ performed_by: actor.id, approval_status: APPROVAL_STATUS.CONFIRMED }),
    ReelEvent.countDocuments({ performed_by: actor.id, approval_status: APPROVAL_STATUS.DECLINED }),
  ]);

  const items = rawEvents.map((event) => {
    const reelIdStr = event.reel_id ? event.reel_id.toString() : null;
    const item = {
      id: event._id.toString(),
      reel_id: reelIdStr,
      event_type: event.event_type,
      approval_status: event.approval_status,
      reel_no: event.reel_no,
      reel: {
        id: reelIdStr,
        reel_no: event.reel_no,
      },
      performed_at: event.performed_at,
      payload: event.payload || {},
      decision: event.approved_by_name
        ? {
            by_name: event.approved_by_name,
            at: event.approved_at,
            reason: event.decline_reason || null,
          }
        : null,
    };

    if (event.approval_status === APPROVAL_STATUS.DECLINED && event.payload) {
      item.reverted_from = event.payload.current_weight_entered;
      item.reverted_to = event.payload.previous_weight;
    }

    return item;
  });

  const meta = buildPaginationMeta({ page, limit, total });
  meta.counts = {
    pending: pendingCount,
    confirmed: confirmedCount,
    declined: declinedCount,
  };

  return { items, meta };
}

/**
 * Confirm pending entry (docs/routes/approvals.md).
 * @param {{ eventId: string, actor: object }} args
 * @returns {Promise<{ event: object }>}
 */
export async function confirmEntry({ eventId, actor }) {
  return withTransaction(async (session) => {
    const event = await ReelEvent.findById(eventId).session(session);

    if (!event) {
      const isReel = await Reel.findById(eventId).session(session);
      if (isReel) {
        throw createApiError(
          404,
          ERROR_CODES.NOT_FOUND,
          `Invalid approval ID: "${eventId}" is a Reel ID. Please provide the pending approval Event ID instead (available from GET /approvals/pending).`
        );
      }
      throw createApiError(
        404,
        ERROR_CODES.NOT_FOUND,
        `Approval entry not found for ID "${eventId}". Please check that the approval ID is correct and exists in the pending approval queue.`
      );
    }

    if (event.performed_by.toString() === actor.id) {
      throw createApiError(403, ERROR_CODES.SELF_APPROVAL_NOT_ALLOWED, 'You cannot confirm your own entry.');
    }

    if (event.approval_status !== APPROVAL_STATUS.PENDING) {
      throw createApiError(409, ERROR_CODES.ALREADY_DECIDED, 'This entry has already been decided.');
    }

    // Check FIFO: no older pending event may exist on the same reel
    const olderPending = await ReelEvent.findOne({
      reel_id: event.reel_id,
      approval_status: APPROVAL_STATUS.PENDING,
      performed_at: { $lt: event.performed_at },
    }).session(session);

    if (olderPending) {
      throw createApiError(
        409,
        ERROR_CODES.OUT_OF_ORDER_APPROVAL,
        'An older pending entry exists on this reel. Entries must be confirmed in chronological order.'
      );
    }

    // Confirm target event
    event.approval_status = APPROVAL_STATUS.CONFIRMED;
    event.approved_by = actor.id;
    event.approved_by_name = actor.name;
    event.approved_at = new Date();
    await event.save({ session });

    // Decrement reel pending_count
    const reel = await Reel.findById(event.reel_id).session(session);
    if (reel) {
      reel.pending_count = Math.max(0, reel.pending_count - 1);
      await reel.save({ session });
    }

    // Append CONFIRMED decision event
    await ReelEvent.create(
      [
        {
          reel_id: event.reel_id,
          reel_no: event.reel_no,
          event_type: EVENT_TYPES.CONFIRMED,
          approval_status: null,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          ref_event_id: event._id,
          payload: {},
        },
      ],
      { session }
    );

    return {
      event: {
        id: event._id.toString(),
        approval_status: event.approval_status,
        approved_by_name: event.approved_by_name,
        approved_at: event.approved_at,
      },
    };
  });
}

/**
 * Decline pending entry and cascade revert (docs/routes/approvals.md).
 * @param {{ eventId: string, input: { reason?: string }, actor: object }} args
 * @returns {Promise<{ declined_event_ids: Array<string>, cascaded_event_ids: Array<string>, reverted: object, reel: object }>}
 */
export async function declineEntry({ eventId, input = {}, actor }) {
  return withTransaction(async (session) => {
    const targetEvent = await ReelEvent.findById(eventId).session(session);

    if (!targetEvent) {
      const isReel = await Reel.findById(eventId).session(session);
      if (isReel) {
        throw createApiError(
          404,
          ERROR_CODES.NOT_FOUND,
          `Invalid approval ID: "${eventId}" is a Reel ID. Please provide the pending approval Event ID instead (available from GET /approvals/pending).`
        );
      }
      throw createApiError(
        404,
        ERROR_CODES.NOT_FOUND,
        `Approval entry not found for ID "${eventId}". Please check that the approval ID is correct and exists in the pending approval queue.`
      );
    }

    if (targetEvent.performed_by.toString() === actor.id) {
      throw createApiError(403, ERROR_CODES.SELF_APPROVAL_NOT_ALLOWED, 'You cannot decline your own entry.');
    }

    if (targetEvent.approval_status !== APPROVAL_STATUS.PENDING) {
      throw createApiError(409, ERROR_CODES.ALREADY_DECIDED, 'This entry has already been decided.');
    }

    // Find target event AND all later PENDING events on the same reel
    const pendingEventsToDecline = await ReelEvent.find({
      reel_id: targetEvent.reel_id,
      approval_status: APPROVAL_STATUS.PENDING,
      performed_at: { $gte: targetEvent.performed_at },
    })
      .sort({ performed_at: 1 })
      .session(session);

    const reel = await Reel.findById(targetEvent.reel_id).session(session);
    if (!reel) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Associated reel not found.');
    }

    const declined_event_ids = [];
    const cascaded_event_ids = [];
    const declineReason = input.reason ? input.reason.trim().substring(0, 300) : null;
    const now = new Date();

    let revertedFrom = reel.previous_weight;
    let revertedTo = reel.previous_weight;

    const isCreatedDeclined = targetEvent.event_type === EVENT_TYPES.CREATED;

    if (isCreatedDeclined) {
      reel.record_status = RECORD_STATUS.VOIDED;
      reel.pending_count = 0;
      revertedFrom = reel.previous_weight;
      revertedTo = 0;
    } else if (targetEvent.payload && targetEvent.payload.previous_weight !== undefined) {
      revertedFrom = reel.previous_weight;
      revertedTo = targetEvent.payload.previous_weight;

      reel.previous_weight = revertedTo;
      reel.status = deriveReelStatus({ previous_weight: reel.previous_weight, max_weight: reel.max_weight });
    }

    for (const event of pendingEventsToDecline) {
      const isPrimary = event._id.toString() === targetEvent._id.toString();

      event.approval_status = APPROVAL_STATUS.DECLINED;
      event.approved_by = actor.id;
      event.approved_by_name = actor.name;
      event.approved_at = now;
      event.decline_reason = declineReason;

      if (!isPrimary) {
        event.cascaded_from_event_id = targetEvent._id;
        cascaded_event_ids.push(event._id.toString());
      }

      declined_event_ids.push(event._id.toString());
      await event.save({ session });

      await ReelEvent.create(
        [
          {
            reel_id: reel._id,
            reel_no: reel.reel_no,
            event_type: EVENT_TYPES.DECLINED_REVERTED,
            approval_status: null,
            performed_by: actor.id,
            performed_by_name: actor.name,
            performed_by_role: actor.role,
            performed_at: now,
            ref_event_id: event._id,
            cascaded_from_event_id: isPrimary ? null : targetEvent._id,
            payload: {
              reverted_from: revertedFrom,
              reverted_to: revertedTo,
              reel_voided: isCreatedDeclined,
            },
          },
        ],
        { session }
      );

      const notificationMsg = 'Your ' + event.event_type + ' entry for reel #' + reel.reel_no + ' was declined by ' + actor.name + (declineReason ? '. Reason: ' + declineReason : '');

      await Notification.create(
        [
          {
            user_id: event.performed_by,
            type: NOTIFICATION_TYPES.ENTRY_DECLINED,
            title: isPrimary ? 'Entry declined' : 'Entry cascaded decline',
            message: notificationMsg,
            event_id: event._id,
            reel_id: reel._id,
            reel_no: reel.reel_no,
            data: {
              reverted_from: revertedFrom,
              reverted_to: revertedTo,
              reason: declineReason,
              declined_by_name: actor.name,
            },
            is_read: false,
          },
        ],
        { session }
      );
    }

    if (!isCreatedDeclined) {
      const remainingPendingCount = await ReelEvent.countDocuments({
        reel_id: reel._id,
        approval_status: APPROVAL_STATUS.PENDING,
      }).session(session);

      reel.pending_count = remainingPendingCount;
    }

    await reel.save({ session });

    return {
      declined_event_ids,
      cascaded_event_ids,
      reverted: {
        from: revertedFrom,
        to: revertedTo,
      },
      reel: reel.toJSON(),
    };
  });
}
