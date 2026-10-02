import { DigestLog } from '../models/digestLog.model.js';
import { ReelEvent } from '../models/reelEvent.model.js';
import { User } from '../models/user.model.js';
import { ROLES } from '../constants/roles.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { env } from '../config/env.js';
import { renderDailyDigest } from '../templates/dailyDigest.template.js';
import { sendMail } from './email.service.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Generate preview of daily digest email (docs/routes/audit-and-digest.md).
 * @param {{ query: { date?: string }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function previewDigest({ query = {}, actor }) {
  const dateStr = query.date || new Date().toISOString().split('T')[0];
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const [
    created,
    usage,
    confirmed,
    declined,
    admin_corrected,
    still_pending,
    oldestPending,
    admins,
    usageAggregation,
    depletedCount,
  ] = await Promise.all([
    ReelEvent.countDocuments({ event_type: EVENT_TYPES.CREATED, performed_at: { $gte: start, $lte: end } }),
    ReelEvent.countDocuments({ event_type: EVENT_TYPES.USAGE_LOGGED, performed_at: { $gte: start, $lte: end } }),
    ReelEvent.countDocuments({ event_type: EVENT_TYPES.CONFIRMED, performed_at: { $gte: start, $lte: end } }),
    ReelEvent.countDocuments({ event_type: EVENT_TYPES.DECLINED_REVERTED, performed_at: { $gte: start, $lte: end } }),
    ReelEvent.countDocuments({ event_type: EVENT_TYPES.ADMIN_CORRECTED, performed_at: { $gte: start, $lte: end } }),
    ReelEvent.countDocuments({ approval_status: APPROVAL_STATUS.PENDING }),
    ReelEvent.findOne({ approval_status: APPROVAL_STATUS.PENDING }).sort({ performed_at: 1, _id: 1 }).select('performed_at').lean(),
    User.find({ role: ROLES.ADMIN, is_active: true, email: { $ne: null } }).select('email').lean(),
    ReelEvent.aggregate([
      {
        $match: {
          event_type: EVENT_TYPES.USAGE_LOGGED,
          performed_at: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: 'reels',
          localField: 'reel_id',
          foreignField: '_id',
          as: 'reel',
        },
      },
      { $unwind: { path: '$reel', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            quality: '$reel.quality',
            bf: '$reel.bf',
            gsm: '$reel.gsm',
          },
          total_weight: { $sum: '$payload.used_this_time' },
        },
      },
    ]),
    ReelEvent.countDocuments({
      event_type: EVENT_TYPES.USAGE_LOGGED,
      performed_at: { $gte: start, $lte: end },
      'payload.current_weight_entered': 0,
    }),
  ]);

  let oldest_pending_hours = 0;
  if (oldestPending && oldestPending.performed_at) {
    const oldestTime = new Date(oldestPending.performed_at).getTime();
    oldest_pending_hours = Math.max(0, Math.floor((Date.now() - oldestTime) / (1000 * 60 * 60)));
  }

  const quality_breakdown = {};
  let total_weight_consumed_kg = 0;

  for (const item of usageAggregation) {
    const q = item._id?.quality || 'Standard Quality';
    const bf = item._id?.bf ? `${item._id.bf} BF` : '';
    const gsm = item._id?.gsm ? `${item._id.gsm} GSM` : '';
    const labelParts = [q, bf, gsm].filter(Boolean);
    const label = labelParts.join(' ');
    const weight = Math.round((item.total_weight || 0) * 100) / 100;

    quality_breakdown[label] = Math.round(((quality_breakdown[label] || 0) + weight) * 100) / 100;
    total_weight_consumed_kg += weight;
  }

  const recipients = admins.map((a) => a.email).filter(Boolean);
  const deep_link = `${env.FRONTEND_URL}/admin/audit?date=${dateStr}`;

  return {
    date: dateStr,
    total_weight_consumed_kg: Math.round(total_weight_consumed_kg * 100) / 100,
    reels_created_count: created,
    reels_depleted_count: depletedCount,
    quality_breakdown,
    counts: {
      created,
      usage,
      confirmed,
      declined,
      admin_corrected,
      still_pending,
    },
    oldest_pending_hours,
    deep_link,
    recipients,
  };
}

/**
 * Manually trigger sending of daily digest (docs/routes/audit-and-digest.md).
 * @param {{ input: { date?: string, force?: boolean }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function sendDigest({ input = {}, actor }) {
  const dateStr = input.date || new Date().toISOString().split('T')[0];
  const force = Boolean(input.force);

  const existingLog = await DigestLog.findOne({ date: dateStr, type: 'DAILY' });
  if (existingLog && (existingLog.status === 'SENT' || existingLog.status === 'SENDING') && !force) {
    throw createApiError(409, ERROR_CODES.DIGEST_ALREADY_SENT, `Daily digest for ${dateStr} has already been sent.`);
  }

  const preview = await previewDigest({ query: { date: dateStr }, actor });

  let emailError = null;
  if (preview.recipients && preview.recipients.length > 0) {
    try {
      const template = renderDailyDigest(preview);
      const mailResult = await sendMail({
        to: preview.recipients,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      if (mailResult && mailResult.error) {
        emailError = mailResult.error;
      }
    } catch (err) {
      emailError = err.message;
    }
  }

  const logDoc = await DigestLog.findOneAndUpdate(
    { date: dateStr, type: 'DAILY' },
    {
      $set: {
        status: emailError ? 'FAILED' : 'SENT',
        recipients: preview.recipients,
        counts: preview.counts,
        deep_link: preview.deep_link,
        triggered_by: actor ? actor.id : 'CRON',
        sent_at: new Date(),
        error: emailError,
      },
    },
    { upsert: true, new: true }
  );

  return logDoc.toJSON();
}

/**
 * List daily digest execution logs (docs/routes/audit-and-digest.md).
 * @param {{ filters: { page?: number, limit?: number }, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listDigestLogs({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);

  const [rawLogs, total] = await Promise.all([
    DigestLog.find().sort({ created_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    DigestLog.countDocuments(),
  ]);

  const items = rawLogs.map((l) => ({
    id: l._id.toString(),
    date: l.date,
    type: l.type,
    status: l.status,
    recipients: l.recipients || [],
    counts: l.counts || {},
    deep_link: l.deep_link || null,
    triggered_by: l.triggered_by,
    error: l.error || null,
    sent_at: l.sent_at || null,
    created_at: l.created_at,
  }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
