import { DigestLog } from '../models/digestLog.model.js';
import { ReelEvent } from '../models/reelEvent.model.js';
import { Reel } from '../models/reel.model.js';
import { Setting } from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import { ROLES } from '../constants/roles.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { RECORD_STATUS } from '../constants/reelStatus.js';
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
  const defaultDate = new Date().toISOString().split('T')[0];
  const fromDateStr = query.from_date || query.fromDate || query.date || defaultDate;
  const toDateStr = query.to_date || query.toDate || query.date || fromDateStr;

  const [fromY, fromM, fromD] = fromDateStr.split('-').map(Number);
  const [toY, toM, toD] = toDateStr.split('-').map(Number);

  const localStart = new Date(fromY, fromM - 1, fromD, 0, 0, 0, 0);
  const localEnd = new Date(toY, toM - 1, toD, 23, 59, 59, 999);

  const utcStart = new Date(Date.UTC(fromY, fromM - 1, fromD, 0, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(toY, toM - 1, toD, 23, 59, 59, 999));

  const start = localStart < utcStart ? localStart : utcStart;
  const end = localEnd > utcEnd ? localEnd : utcEnd;

  const displayDateStr = fromDateStr === toDateStr ? fromDateStr : `${fromDateStr} to ${toDateStr}`;

  const [
    createdEvents,
    reelsCreatedCount,
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
    Reel.countDocuments({
      $or: [
        { created_at: { $gte: start, $lte: end } },
        { purchase_date: { $gte: start, $lte: end } },
      ],
      record_status: RECORD_STATUS.ACTIVE,
    }),
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

  const created = Math.max(createdEvents, reelsCreatedCount);

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

  const appSetting = await Setting.findById('app').lean();
  const configuredRecipients = appSetting?.digest?.recipients || [];
  const adminEmails = admins.map((a) => a.email).filter(Boolean);
  const recipients = Array.from(new Set([...configuredRecipients, ...adminEmails]));
  const deep_link = `${env.FRONTEND_URL}/admin/audit?date=${fromDateStr}`;

  // Fetch detailed usage log events for modal breakdown on frontend
  const usageEvents = await ReelEvent.find({
    event_type: EVENT_TYPES.USAGE_LOGGED,
    performed_at: { $gte: start, $lte: end },
  }).populate('reel_id').lean();

  const quality_details = {};
  for (const log of usageEvents) {
    const reel = log.reel_id || {};
    const q = reel.quality || 'Standard Quality';
    const bf = reel.bf ? `${reel.bf} BF` : '';
    const gsm = reel.gsm ? `${reel.gsm} GSM` : '';
    const label = [q, bf, gsm].filter(Boolean).join(' ');

    if (!quality_details[label]) {
      quality_details[label] = {
        label,
        quality: reel.quality || 'N/A',
        bf: reel.bf || null,
        gsm: reel.gsm || null,
        total_weight: 0,
        entries: [],
      };
    }

    const weightUsed = log.payload?.used_this_time || 0;
    quality_details[label].total_weight = Math.round((quality_details[label].total_weight + weightUsed) * 100) / 100;
    quality_details[label].entries.push({
      id: log._id.toString(),
      reel_id: reel._id ? reel._id.toString() : (log.reel_id ? log.reel_id.toString() : null),
      reel_no: reel.reel_no || 'N/A',
      master_code: reel.master_code || reel.master_key || 'N/A',
      supplier_name: reel.supplier_name || 'N/A',
      station: log.payload?.station || 'N/A',
      weight_used: weightUsed,
      previous_weight: log.payload?.previous_weight ?? null,
      current_weight: log.payload?.current_weight_entered ?? null,
      is_depleted: log.payload?.current_weight_entered === 0,
      performed_by: log.performed_by_name || 'Operator',
      performed_at: log.performed_at,
    });
  }

  return {
    date: displayDateStr,
    from_date: fromDateStr,
    to_date: toDateStr,
    total_weight_consumed_kg: Math.round(total_weight_consumed_kg * 100) / 100,
    reels_created_count: created,
    reels_depleted_count: depletedCount,
    quality_breakdown,
    quality_details,
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
