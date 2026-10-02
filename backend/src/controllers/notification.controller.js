import * as notificationService from '../services/notification.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function listNotifications(req, res) {
  const { query } = req.validated;
  const { items, meta } = await notificationService.listNotifications({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function getUnreadCount(req, res) {
  const result = await notificationService.getUnreadCount({ actor: req.user });
  return sendSuccess(res, result);
}

export async function markRead(req, res) {
  const { params } = req.validated;
  const result = await notificationService.markRead({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}

export async function markAllRead(req, res) {
  const result = await notificationService.markAllRead({ actor: req.user });
  return sendSuccess(res, result);
}
