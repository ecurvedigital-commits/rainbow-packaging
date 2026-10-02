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
    reel_id: n.reel_id.toString(),
    reel_no: n.reel_no,
    event_id: n.event_id.toString(),
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
 * Get unread notification count for user (docs/routes/notifications.md).
 * @param {{ actor: object }} args
 * @returns {Promise<{ unread: number }>}
 */
export async function getUnreadCount({ actor }) {
  const unread = await Notification.countDocuments({ user_id: actor.id, is_read: false });
  return { unread };
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
    reel_id: notification.reel_id.toString(),
    reel_no: notification.reel_no,
    event_id: notification.event_id.toString(),
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
