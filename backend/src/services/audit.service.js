import { ReelEvent } from '../models/reelEvent.model.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Query and filter system audit events log (docs/routes/audit-and-digest.md).
 * @param {{ filters: { date?: string, from?: string, to?: string, startDate?: string, endDate?: string, event_type?: string, action?: string, approval_status?: string, performed_by?: string, user?: string, reel_no?: string, page?: number, limit?: number }, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listAuditEvents({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = {};

  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    query.performed_at = { $gte: start, $lte: end };
  } else if (filters.from || filters.to || filters.startDate || filters.endDate) {
    query.performed_at = {};
    const fromVal = filters.from || filters.startDate;
    const toVal = filters.to || filters.endDate;
    if (fromVal) {
      query.performed_at.$gte = new Date(fromVal);
    }
    if (toVal) {
      const end = new Date(toVal);
      end.setHours(23, 59, 59, 999);
      query.performed_at.$lte = end;
    }
  }

  const eventTypeVal = filters.event_type || filters.action;
  if (eventTypeVal) {
    const types = eventTypeVal.split(',').map((t) => t.trim()).filter(Boolean);
    if (types.length === 1) {
      query.event_type = new RegExp(types[0], 'i');
    } else if (types.length > 1) {
      query.event_type = { $in: types.map((t) => t.toUpperCase()) };
    }
  }

  if (filters.approval_status) {
    query.approval_status = filters.approval_status.toUpperCase();
  }

  const userSearch = filters.performed_by || filters.user;
  if (userSearch) {
    query.performed_by_name = new RegExp(userSearch.trim(), 'i');
  }

  if (filters.reel_no) {
    query.reel_no = new RegExp(filters.reel_no.trim(), 'i');
  }

  const [rawEvents, total] = await Promise.all([
    ReelEvent.find(query).sort({ performed_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    ReelEvent.countDocuments(query),
  ]);

  const items = rawEvents.map((e) => ({
    id: e._id.toString(),
    event_type: e.event_type,
    approval_status: e.approval_status,
    reel_id: e.reel_id ? e.reel_id.toString() : null,
    reel_no: e.reel_no,
    performed_by_name: e.performed_by_name,
    performed_by_role: e.performed_by_role,
    performed_at: e.performed_at,
    approved_by_name: e.approved_by_name || null,
    approved_at: e.approved_at || null,
    decline_reason: e.decline_reason || null,
    ref_event_id: e.ref_event_id ? e.ref_event_id.toString() : null,
    cascaded_from_event_id: e.cascaded_from_event_id ? e.cascaded_from_event_id.toString() : null,
    payload: e.payload || {},
  }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Get single audit event details by ID.
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function getAuditEventById({ id, actor }) {
  const e = await ReelEvent.findById(id).lean();
  if (!e) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, `Audit event with ID ${id} not found.`);
  }

  return {
    id: e._id.toString(),
    event_type: e.event_type,
    approval_status: e.approval_status,
    reel_id: e.reel_id ? e.reel_id.toString() : null,
    reel_no: e.reel_no,
    performed_by: e.performed_by ? e.performed_by.toString() : null,
    performed_by_name: e.performed_by_name,
    performed_by_role: e.performed_by_role,
    performed_at: e.performed_at,
    approved_by: e.approved_by ? e.approved_by.toString() : null,
    approved_by_name: e.approved_by_name || null,
    approved_at: e.approved_at || null,
    decline_reason: e.decline_reason || null,
    ref_event_id: e.ref_event_id ? e.ref_event_id.toString() : null,
    cascaded_from_event_id: e.cascaded_from_event_id ? e.cascaded_from_event_id.toString() : null,
    payload: e.payload || {},
  };
}
