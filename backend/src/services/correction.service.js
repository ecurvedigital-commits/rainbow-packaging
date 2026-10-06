import mongoose from 'mongoose';
import { CorrectionRequest } from '../models/correctionRequest.model.js';
import { Reel } from '../models/reel.model.js';
import { User } from '../models/user.model.js';
import { MasterCode } from '../models/masterCode.model.js';
import { Notification } from '../models/notification.model.js';
import { Message } from '../models/message.model.js';
import { NOTIFICATION_TYPES, CORRECTION_STATUS } from '../constants/notificationTypes.js';
import { ROLES } from '../constants/roles.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { updateReel } from './reel.service.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Submit a correction request on a reel.
 */
export async function createCorrectionRequest({ input, actor }) {
  const { reel_id, reel_no, category = 'OTHER', message, requested_changes = {} } = input;

  let reel = null;
  if (reel_id) {
    reel = await Reel.findById(reel_id).lean();
  }
  if (!reel && reel_no) {
    reel = await Reel.findOne({ reel_no: reel_no.trim(), record_status: 'ACTIVE' }).lean();
  }

  if (!reel) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Reel not found for correction request.');
  }

  // Resolve Master Code info
  const masterCodes = await MasterCode.find({ status: 'ACTIVE' }).lean();
  let masterCodeId = requested_changes.master_code_id || reel.master_code_id || null;
  let masterCode = requested_changes.master_code || reel.master_code || null;
  let masterCodeName = requested_changes.master_code_name || null;

  if (masterCodeId) {
    const mc = masterCodes.find((m) => String(m._id) === String(masterCodeId));
    if (mc) {
      masterCode = mc.master_code;
      masterCodeName = mc.master_code_name;
    }
  } else if (masterCode) {
    const mc = masterCodes.find((m) => m.master_code === masterCode);
    if (mc) {
      masterCodeId = mc._id.toString();
      masterCodeName = mc.master_code_name;
    }
  }

  const currentSnapshot = {
    reel_no: reel.reel_no,
    quality: reel.quality,
    gsm: reel.gsm,
    bf: reel.bf,
    size: reel.size,
    supplier_name: reel.supplier_name,
    mill_name: reel.mill_name || '',
    previous_weight: reel.previous_weight,
    max_weight: reel.max_weight,
    master_code: reel.master_code,
    master_code_id: reel.master_code_id ? reel.master_code_id.toString() : null,
    master_key: reel.master_key,
    status: reel.status,
  };

  const correctionDoc = await CorrectionRequest.create({
    reel_id: reel._id,
    reel_no: reel.reel_no,
    master_code_id: masterCodeId,
    master_code: masterCode,
    master_code_name: masterCodeName,
    requested_by: actor.id,
    requested_by_name: actor.name,
    requested_by_role: actor.role,
    category,
    message: message.trim(),
    requested_changes: {
      ...requested_changes,
      master_code: masterCode,
      master_code_id: masterCodeId,
      master_code_name: masterCodeName,
    },
    current_snapshot: currentSnapshot,
    status: CORRECTION_STATUS.PENDING,
  });

  // Find all Supervisors and Admins to notify
  const supervisorsAndAdmins = await User.find({
    role: { $in: [ROLES.SUPERVISOR, ROLES.ADMIN] },
    is_active: true,
  }).lean();

  const notifRecipients = supervisorsAndAdmins.map((u) => ({
    user_id: u._id,
    name: u.name,
    username: u.username,
    role: u.role,
  }));

  // Create linked message entry
  const messageDoc = await Message.create({
    sender_id: actor.id,
    sender_name: actor.name,
    sender_role: actor.role,
    recipients: notifRecipients,
    subject: `Correction Request for Reel #${reel.reel_no} (${category.replace(/_/g, ' ')})`,
    body: message.trim(),
    reels: [
      {
        reel_id: reel._id,
        reel_no: reel.reel_no,
        master_code_id: masterCodeId,
        master_code: masterCode,
        master_code_name: masterCodeName,
        quality: requested_changes.quality || reel.quality,
        gsm: requested_changes.gsm || reel.gsm,
        bf: requested_changes.bf || reel.bf,
        size: requested_changes.size || reel.size,
      },
    ],
    kind: 'CORRECTION',
    correction_request_id: correctionDoc._id,
  });

  correctionDoc.message_id = messageDoc._id;
  await correctionDoc.save();

  // Create notifications for supervisors and admins
  const notificationsToCreate = supervisorsAndAdmins.map((u) => ({
    user_id: u._id,
    type: NOTIFICATION_TYPES.CORRECTION_REQUESTED,
    title: `Correction Request: Reel #${reel.reel_no}`,
    message: `${actor.name} requested correction: ${message.trim().substring(0, 100)}`,
    reel_id: reel._id,
    reel_no: reel.reel_no,
    message_id: messageDoc._id,
    correction_request_id: correctionDoc._id,
    sender_id: actor.id,
    sender_name: actor.name,
    sender_role: actor.role,
    data: {
      correction_request_id: correctionDoc._id.toString(),
      category,
      reel_no: reel.reel_no,
      requested_changes,
      current_snapshot: currentSnapshot,
    },
    is_read: false,
  }));

  if (notificationsToCreate.length > 0) {
    await Notification.insertMany(notificationsToCreate);
  }

  return {
    id: correctionDoc._id.toString(),
    reel_id: correctionDoc.reel_id.toString(),
    reel_no: correctionDoc.reel_no,
    master_code: correctionDoc.master_code,
    master_code_name: correctionDoc.master_code_name,
    category: correctionDoc.category,
    message: correctionDoc.message,
    requested_changes: correctionDoc.requested_changes,
    current_snapshot: correctionDoc.current_snapshot,
    status: correctionDoc.status,
    requested_by_name: correctionDoc.requested_by_name,
    created_at: correctionDoc.created_at,
  };
}

/**
 * List correction requests.
 */
export async function listCorrectionRequests({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = {};

  if (filters.status) {
    query.status = filters.status.toUpperCase();
  }

  if (filters.reel_no) {
    query.reel_no = new RegExp(filters.reel_no.trim(), 'i');
  }

  // Operators see only their own requests unless admin/supervisor
  if (actor.role === ROLES.OPERATOR) {
    query.requested_by = actor.id;
  }

  const [rawRequests, total] = await Promise.all([
    CorrectionRequest.find(query).sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    CorrectionRequest.countDocuments(query),
  ]);

  const items = rawRequests.map((r) => ({
    id: r._id.toString(),
    reel_id: r.reel_id ? r.reel_id.toString() : null,
    reel_no: r.reel_no,
    master_code: r.master_code,
    master_code_name: r.master_code_name,
    requested_by: r.requested_by ? r.requested_by.toString() : null,
    requested_by_name: r.requested_by_name,
    requested_by_role: r.requested_by_role,
    category: r.category,
    message: r.message,
    requested_changes: r.requested_changes || {},
    current_snapshot: r.current_snapshot || {},
    status: r.status,
    resolved_by: r.resolved_by ? r.resolved_by.toString() : null,
    resolved_by_name: r.resolved_by_name,
    resolution_note: r.resolution_note,
    resolved_at: r.resolved_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Get pending correction requests count.
 */
export async function getPendingCorrectionCount() {
  const count = await CorrectionRequest.countDocuments({ status: CORRECTION_STATUS.PENDING });
  return { count };
}

/**
 * Get single correction request details.
 */
export async function getCorrectionRequest({ id, actor }) {
  const request = await CorrectionRequest.findById(id).lean();
  if (!request) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Correction request not found.');
  }

  return {
    id: request._id.toString(),
    reel_id: request.reel_id ? request.reel_id.toString() : null,
    reel_no: request.reel_no,
    master_code: request.master_code,
    master_code_name: request.master_code_name,
    requested_by: request.requested_by ? request.requested_by.toString() : null,
    requested_by_name: request.requested_by_name,
    requested_by_role: request.requested_by_role,
    category: request.category,
    message: request.message,
    requested_changes: request.requested_changes || {},
    current_snapshot: request.current_snapshot || {},
    status: request.status,
    resolved_by: request.resolved_by ? request.resolved_by.toString() : null,
    resolved_by_name: request.resolved_by_name,
    resolution_note: request.resolution_note,
    resolved_at: request.resolved_at,
    created_at: request.created_at,
    updated_at: request.updated_at,
  };
}

/**
 * Resolve (apply) a correction request (ADMIN only).
 */
export async function resolveCorrectionRequest({ id, input = {}, actor }) {
  const request = await CorrectionRequest.findById(id);
  if (!request) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Correction request not found.');
  }

  if (request.status !== CORRECTION_STATUS.PENDING) {
    throw createApiError(409, ERROR_CODES.ALREADY_DECIDED, `Correction request has already been ${request.status.toLowerCase()}.`);
  }

  // Merge changes requested with any admin overrides
  const changesToApply = {
    ...request.requested_changes,
    ...input.changes,
    reason: input.reason || input.resolution_note || request.message || 'Operator Correction Applied',
    correction_reason: input.reason || input.resolution_note || request.message || 'Operator Correction Applied',
  };

  // Execute update on Reel
  const updateResult = await updateReel({
    id: request.reel_id.toString(),
    input: changesToApply,
    actor,
  });

  // Mark request resolved
  request.status = CORRECTION_STATUS.RESOLVED;
  request.resolved_by = actor.id;
  request.resolved_by_name = actor.name;
  request.resolution_note = input.resolution_note || input.reason || 'Correction applied by Admin';
  request.resolved_at = new Date();
  if (updateResult.event?.id) {
    request.reel_event_id = updateResult.event.id;
  }
  await request.save();

  // Notify the requesting operator
  await Notification.create({
    user_id: request.requested_by,
    type: NOTIFICATION_TYPES.CORRECTION_RESOLVED,
    title: `Correction Applied for Reel #${request.reel_no}`,
    message: `Your correction request for Reel #${request.reel_no} was approved and applied by Admin (${actor.name}).`,
    reel_id: request.reel_id,
    reel_no: request.reel_no,
    correction_request_id: request._id,
    sender_id: actor.id,
    sender_name: actor.name,
    sender_role: actor.role,
    data: {
      correction_request_id: request._id.toString(),
      resolution_note: request.resolution_note,
    },
    is_read: false,
  });

  return {
    id: request._id.toString(),
    status: request.status,
    resolved_by_name: request.resolved_by_name,
    resolved_at: request.resolved_at,
    reel: updateResult.reel,
  };
}

/**
 * Reject a correction request (ADMIN & SUPERVISOR).
 */
export async function rejectCorrectionRequest({ id, input = {}, actor }) {
  const request = await CorrectionRequest.findById(id);
  if (!request) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Correction request not found.');
  }

  if (request.status !== CORRECTION_STATUS.PENDING) {
    throw createApiError(409, ERROR_CODES.ALREADY_DECIDED, `Correction request has already been ${request.status.toLowerCase()}.`);
  }

  const reason = input.reason ? input.reason.trim() : 'Declined by reviewer';

  request.status = CORRECTION_STATUS.REJECTED;
  request.resolved_by = actor.id;
  request.resolved_by_name = actor.name;
  request.resolution_note = reason;
  request.resolved_at = new Date();
  await request.save();

  // Notify requesting operator
  await Notification.create({
    user_id: request.requested_by,
    type: NOTIFICATION_TYPES.CORRECTION_REJECTED,
    title: `Correction Declined for Reel #${request.reel_no}`,
    message: `Your correction request for Reel #${request.reel_no} was declined by ${actor.name}. Reason: ${reason}`,
    reel_id: request.reel_id,
    reel_no: request.reel_no,
    correction_request_id: request._id,
    sender_id: actor.id,
    sender_name: actor.name,
    sender_role: actor.role,
    data: {
      correction_request_id: request._id.toString(),
      reason,
    },
    is_read: false,
  });

  return {
    id: request._id.toString(),
    status: request.status,
    resolved_by_name: request.resolved_by_name,
    resolved_at: request.resolved_at,
    resolution_note: reason,
  };
}
