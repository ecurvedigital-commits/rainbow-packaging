import mongoose from 'mongoose';
import { Notification } from '../models/notification.model.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * List notifications for logged in user (docs/routes/notifications.md).
 * @param {{ filters: { unread?: boolean, page?: number, limit?: number }, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listNotifications({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = { user_id: actor.id };

  if (filters.unread === true) {
    query.is_read = false;
  }

  const [rawNotifications, total] = await Promise.all([
    Notification.find(query).sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
  ]);

  const items = rawNotifications.map((n) => ({
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    reel_id: n.reel_id ? n.reel_id.toString() : null,
    reel_no: n.reel_no || null,
    event_id: n.event_id ? n.event_id.toString() : null,
    message_id: n.message_id ? n.message_id.toString() : null,
    correction_request_id: n.correction_request_id ? n.correction_request_id.toString() : null,
    sender_id: n.sender_id ? n.sender_id.toString() : null,
    sender_name: n.sender_name || null,
    sender_role: n.sender_role || null,
    data: n.data || {},
    is_read: n.is_read,
    read_at: n.read_at || null,
    created_at: n.created_at,
  }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Get full notification details by ID (marks as read).
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function getNotification({ id, actor }) {
  const notification = await Notification.findOne({ _id: id, user_id: actor.id });
  if (!notification) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Notification not found.');
  }

  if (!notification.is_read) {
    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();
  }

  const result = {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    reel_id: notification.reel_id ? notification.reel_id.toString() : null,
    reel_no: notification.reel_no || null,
    event_id: notification.event_id ? notification.event_id.toString() : null,
    message_id: notification.message_id ? notification.message_id.toString() : null,
    correction_request_id: notification.correction_request_id ? notification.correction_request_id.toString() : null,
    sender_id: notification.sender_id ? notification.sender_id.toString() : null,
    sender_name: notification.sender_name || null,
    sender_role: notification.sender_role || null,
    data: notification.data || {},
    is_read: notification.is_read,
    read_at: notification.read_at,
    created_at: notification.created_at,
  };

  // Populate linked message if available
  if (notification.message_id) {
    try {
      const messageDoc = await mongoose.model('Message').findById(notification.message_id).lean();
      if (messageDoc) {
        result.message_details = {
          id: messageDoc._id.toString(),
          sender_id: messageDoc.sender_id ? messageDoc.sender_id.toString() : null,
          sender_name: messageDoc.sender_name,
          sender_role: messageDoc.sender_role,
          recipients: messageDoc.recipients || [],
          subject: messageDoc.subject || '',
          body: messageDoc.body,
          reels: messageDoc.reels || [],
          kind: messageDoc.kind,
          created_at: messageDoc.created_at,
        };
      }
    } catch (_err) {
      // Ignore populate errors
    }
  }

  // Populate linked correction request if available
  if (notification.correction_request_id) {
    try {
      const correctionDoc = await mongoose.model('CorrectionRequest').findById(notification.correction_request_id).lean();
      if (correctionDoc) {
        result.correction_request = {
          id: correctionDoc._id.toString(),
          reel_id: correctionDoc.reel_id ? correctionDoc.reel_id.toString() : null,
          reel_no: correctionDoc.reel_no,
          master_code: correctionDoc.master_code,
          master_code_name: correctionDoc.master_code_name,
          category: correctionDoc.category,
          message: correctionDoc.message,
          requested_changes: correctionDoc.requested_changes || {},
          current_snapshot: correctionDoc.current_snapshot || {},
          status: correctionDoc.status,
          requested_by_name: correctionDoc.requested_by_name,
          requested_by_role: correctionDoc.requested_by_role,
          resolved_by_name: correctionDoc.resolved_by_name,
          resolution_note: correctionDoc.resolution_note,
          resolved_at: correctionDoc.resolved_at,
          created_at: correctionDoc.created_at,
        };
      }
    } catch (_err) {
      // Ignore populate errors
    }
  }

  // Populate reel info if reel_id exists
  if (notification.reel_id) {
    try {
      const reelDoc = await mongoose.model('Reel').findById(notification.reel_id).lean();
      if (reelDoc) {
        result.reel_details = {
          id: reelDoc._id.toString(),
          reel_no: reelDoc.reel_no,
          quality: reelDoc.quality,
          gsm: reelDoc.gsm,
          bf: reelDoc.bf,
          size: reelDoc.size,
          supplier_name: reelDoc.supplier_name,
          mill_name: reelDoc.mill_name,
          previous_weight: reelDoc.previous_weight,
          max_weight: reelDoc.max_weight,
          master_code: reelDoc.master_code,
          master_key: reelDoc.master_key,
          status: reelDoc.status,
        };
      }
    } catch (_err) {
      // Ignore populate errors
    }
  }

  return result;
}

/**
 * Get unread notification count for user (docs/routes/notifications.md).
 * @param {{ actor: object }} args
 * @returns {Promise<{ unread: number }>}
 */
export async function getUnreadCount({ actor }) {
  const unread = await Notification.countDocuments({ user_id: actor.id, is_read: false });
  return { unread, unread_count: unread };
}

/**
 * Mark a single notification as read (docs/routes/notifications.md).
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function markRead({ id, actor }) {
  const notification = await Notification.findOne({ _id: id, user_id: actor.id });
  if (!notification) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Notification not found.');
  }

  if (!notification.is_read) {
    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();
  }

  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    reel_id: notification.reel_id ? notification.reel_id.toString() : null,
    reel_no: notification.reel_no || null,
    event_id: notification.event_id ? notification.event_id.toString() : null,
    message_id: notification.message_id ? notification.message_id.toString() : null,
    correction_request_id: notification.correction_request_id ? notification.correction_request_id.toString() : null,
    sender_id: notification.sender_id ? notification.sender_id.toString() : null,
    sender_name: notification.sender_name || null,
    sender_role: notification.sender_role || null,
    data: notification.data || {},
    is_read: notification.is_read,
    read_at: notification.read_at,
    created_at: notification.created_at,
  };
}

/**
 * Mark all notifications as read for user (docs/routes/notifications.md).
 * @param {{ actor: object }} args
 * @returns {Promise<{ updated: number }>}
 */
export async function markAllRead({ actor }) {
  const result = await Notification.updateMany(
    { user_id: actor.id, is_read: false },
    { $set: { is_read: true, read_at: new Date() } }
  );
  return { updated: result.modifiedCount || 0 };
}
