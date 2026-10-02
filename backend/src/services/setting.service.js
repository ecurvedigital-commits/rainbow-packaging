import { Setting } from '../models/setting.model.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { initJobs } from '../jobs/index.js';

/**
 * Bootstraps the application settings document from env defaults if not present.
 * @returns {Promise<import('../models/setting.model.js').Setting>}
 */
export async function ensureSettings() {
  try {
    let settings = await Setting.findById('app');
    if (!settings) {
      settings = await Setting.create({
        _id: 'app',
        aging_threshold_days: env.AGING_THRESHOLD_DAYS,
        digest: {
          enabled: env.DIGEST_ENABLED,
          time: env.DIGEST_TIME,
          timezone: env.APP_TIMEZONE,
        },
      });
      logger.info('Created initial application settings document from env defaults');
    }
    return settings;
  } catch (error) {
    logger.error({ reason: error.message }, 'Failed to ensure application settings');
    throw error;
  }
}

/**
 * Retrieves current system settings (docs/routes/settings.md).
 * @param {{ actor: object }} args
 * @returns {Promise<object>}
 */
export async function getSettings({ actor }) {
  const settings = await ensureSettings();
  return {
    aging_threshold_days: settings.aging_threshold_days,
    digest: settings.digest || {
      enabled: true,
      time: '20:00',
      timezone: 'Asia/Kolkata',
    },
    updated_by: settings.updated_by ? settings.updated_by.toString() : null,
    updated_at: settings.updated_at,
  };
}

/**
 * Updates system settings (docs/routes/settings.md).
 * @param {{ input: { aging_threshold_days?: number, digest?: { enabled?: boolean, time?: string, timezone?: string } }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function updateSettings({ input, actor }) {
  const settings = await ensureSettings();

  if (input.aging_threshold_days !== undefined) {
    settings.aging_threshold_days = Number(input.aging_threshold_days);
  }

  if (input.digest) {
    if (!settings.digest) settings.digest = {};
    if (input.digest.enabled !== undefined) settings.digest.enabled = Boolean(input.digest.enabled);
    if (input.digest.time !== undefined) settings.digest.time = input.digest.time.trim();
    if (input.digest.timezone !== undefined) settings.digest.timezone = input.digest.timezone.trim();
  }

  settings.updated_by = actor.id;
  settings.updated_at = new Date();

  await settings.save();

  if (input.digest) {
    initJobs().catch((err) => {
      logger.warn({ error: err.message }, 'Failed to re-register cron jobs after settings change');
    });
  }

  return {
    aging_threshold_days: settings.aging_threshold_days,
    digest: settings.digest,
    updated_by: settings.updated_by.toString(),
    updated_at: settings.updated_at,
  };
}
