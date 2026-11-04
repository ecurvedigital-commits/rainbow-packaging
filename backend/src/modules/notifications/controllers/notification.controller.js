import * as notificationService from '../services/notification.service.js';
import * as fcmService from '../services/fcm.service.js';
import { sendSuccess } from '../../../core/utils/apiResponse.js';

export async function listNotifications(req, res) {
  const { query } = req.validated;
  const { items, meta } = await notificationService.listNotifications({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function getUnreadCount(req, res) {
  const result = await notificationService.getUnreadCount({ actor: req.user });
  return sendSuccess(res, result);
}

export const getNotification = async (req, res) => {
  const { params } = req.validated;
  const result = await notificationService.getNotification({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
};

export async function markRead(req, res) {
  const { params } = req.validated;
  const result = await notificationService.markRead({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}

export async function markAllRead(req, res) {
  const result = await notificationService.markAllRead({ actor: req.user });
  return sendSuccess(res, result);
}

export async function registerDeviceToken(req, res) {
  const { token, device_name } = req.body;
  const result = await fcmService.registerDeviceToken({
    userId: req.user.id,
    token,
    deviceName: device_name,
  });
  return sendSuccess(res, result);
}

export async function unregisterDeviceToken(req, res) {
  const { token } = req.body;
  const result = await fcmService.unregisterDeviceToken({
    userId: req.user.id,
    token,
  });
  return sendSuccess(res, result);
}

export async function testPushNotification(req, res) {
  await fcmService.notifyPendingStock({
    stockType: 'REEL',
    itemLabel: 'Reel #TEST-999',
    category: 'Duplex Board 250 GSM',
    quantity: '750 kg',
    requestedByName: req.user.name,
    detailsUrl: '/approvals',
  });
  return sendSuccess(res, { message: 'Test pending stock notification dispatched' });
}

