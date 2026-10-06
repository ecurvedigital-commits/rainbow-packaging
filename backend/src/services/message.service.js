import mongoose from 'mongoose';
import { Message } from '../models/message.model.js';
import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { Reel } from '../models/reel.model.js';
import { MasterCode } from '../models/masterCode.model.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Send a message to one or multiple recipients with optional linked reels.
 * Creates Message document and dispatches notifications to all recipients.
 */
export async function sendMessage({ input, actor }) {
  const { recipient_ids, subject, body, reels = [], kind = 'MESSAGE', correction_request_id = null, reply_to = null } = input;

  if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'At least one recipient must be selected.');
  }

  // Lookup valid active recipients
  const recipientsDocs = await User.find({
    _id: { $in: recipient_ids },
    is_active: true,
  }).lean();

  if (recipientsDocs.length === 0) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'No valid active recipients found.');
  }

  const recipients = recipientsDocs.map((u) => ({
    user_id: u._id,
    name: u.name,
    username: u.username,
    role: u.role,
  }));

  // Resolve reel references if provided
  const resolvedReels = [];
  if (Array.isArray(reels) && reels.length > 0) {
    const reelIds = reels.map((r) => r.reel_id).filter(Boolean);
    const reelsDocs = await Reel.find({ _id: { $in: reelIds } }).lean();
    const reelsMap = new Map(reelsDocs.map((r) => [r._id.toString(), r]));

    const masterCodes = await MasterCode.find({ status: 'ACTIVE' }).lean();
    const mcMap = new Map(masterCodes.map((m) => [m._id.toString(), m]));

    for (const r of reels) {
      const reelDoc = r.reel_id ? reelsMap.get(String(r.reel_id)) : null;
      let masterCodeName = r.master_code_name || null;
      let masterCode = r.master_code || null;
      let masterCodeId = r.master_code_id || null;

      if (reelDoc) {
        masterCode = masterCode || reelDoc.master_code;
        masterCodeId = masterCodeId || (reelDoc.master_code_id ? reelDoc.master_code_id.toString() : null);
        if (!masterCodeName && reelDoc.master_code_id) {
          const mc = mcMap.get(String(reelDoc.master_code_id));
          if (mc) masterCodeName = mc.master_code_name;
        }
      }

      resolvedReels.push({
        reel_id: reelDoc ? reelDoc._id : r.reel_id,
        reel_no: reelDoc ? reelDoc.reel_no : r.reel_no,
        master_code_id: masterCodeId,
        master_code: masterCode,
        master_code_name: masterCodeName,
        quality: reelDoc ? reelDoc.quality : r.quality,
        gsm: reelDoc ? reelDoc.gsm : r.gsm,
        bf: reelDoc ? reelDoc.bf : r.bf,
        size: reelDoc ? reelDoc.size : r.size,
      });
    }
  }

  // Create Message
  const messageDoc = await Message.create({
    sender_id: actor.id,
    sender_name: actor.name,
    sender_role: actor.role,
    recipients,
    subject: subject ? subject.trim() : '',
    body: body.trim(),
    reels: resolvedReels,
    kind,
    correction_request_id,
    reply_to,
  });

  // Create notifications for each recipient
  const notificationTitle = subject && subject.trim()
    ? `Message from ${actor.name}: ${subject.trim()}`
    : `Message from ${actor.name}`;

  const snippet = body.trim().length > 120
    ? `${body.trim().substring(0, 117)}...`
    : body.trim();

  const firstReel = resolvedReels.length > 0 ? resolvedReels[0] : null;

  const notificationsToInsert = recipients.map((r) => ({
    user_id: r.user_id,
    type: NOTIFICATION_TYPES.MESSAGE,
    title: notificationTitle,
    message: snippet,
    event_id: null,
    reel_id: firstReel ? firstReel.reel_id : null,
    reel_no: firstReel ? firstReel.reel_no : null,
    message_id: messageDoc._id,
    correction_request_id,
    sender_id: actor.id,
    sender_name: actor.name,
    sender_role: actor.role,
    data: {
      message_id: messageDoc._id.toString(),
      subject: messageDoc.subject,
      reels: resolvedReels,
      reply_to,
      kind,
    },
    is_read: false,
  }));

  if (notificationsToInsert.length > 0) {
    await Notification.insertMany(notificationsToInsert);
  }

  return {
    id: messageDoc._id.toString(),
    sender_id: actor.id,
    sender_name: actor.name,
    sender_role: actor.role,
    recipients,
    subject: messageDoc.subject,
    body: messageDoc.body,
    reels: resolvedReels,
    kind: messageDoc.kind,
    created_at: messageDoc.created_at,
  };
}

/**
 * List messages (inbox or sent).
 */
export async function listMessages({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const type = filters.box || 'inbox'; // 'inbox' or 'sent'

  const query = type === 'sent'
    ? { sender_id: actor.id }
    : { 'recipients.user_id': actor.id };

  const [rawMessages, total] = await Promise.all([
    Message.find(query).sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments(query),
  ]);

  const items = rawMessages.map((m) => ({
    id: m._id.toString(),
    sender_id: m.sender_id.toString(),
    sender_name: m.sender_name,
    sender_role: m.sender_role,
    recipients: m.recipients || [],
    subject: m.subject || '',
    body: m.body,
    reels: m.reels || [],
    kind: m.kind,
    correction_request_id: m.correction_request_id ? m.correction_request_id.toString() : null,
    reply_to: m.reply_to ? m.reply_to.toString() : null,
    created_at: m.created_at,
  }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Get message details by ID.
 */
export async function getMessage({ id, actor }) {
  const message = await Message.findById(id).lean();
  if (!message) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Message not found.');
  }

  // Authorization: must be sender or one of recipients
  const isSender = String(message.sender_id) === String(actor.id);
  const isRecipient = message.recipients.some((r) => String(r.user_id) === String(actor.id));
  if (!isSender && !isRecipient && actor.role !== 'ADMIN') {
    throw createApiError(403, ERROR_CODES.FORBIDDEN, 'You do not have permission to view this message.');
  }

  return {
    id: message._id.toString(),
    sender_id: message.sender_id.toString(),
    sender_name: message.sender_name,
    sender_role: message.sender_role,
    recipients: message.recipients || [],
    subject: message.subject || '',
    body: message.body,
    reels: message.reels || [],
    kind: message.kind,
    correction_request_id: message.correction_request_id ? message.correction_request_id.toString() : null,
    reply_to: message.reply_to ? message.reply_to.toString() : null,
    created_at: message.created_at,
  };
}
