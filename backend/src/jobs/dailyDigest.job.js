import { sendDigest } from '../services/digest.service.js';
import { logger } from '../config/logger.js';

/**
 * Runs the daily digest email job.
 * Called either by the cron scheduler or manual trigger.
 */
export async function runDailyDigestJob() {
  const dateStr = new Date().toISOString().split('T')[0];
  logger.info({ date: dateStr }, 'Starting scheduled daily digest job...');

  try {
    const result = await sendDigest({
      input: { date: dateStr, force: false },
      actor: null,
    });
    logger.info({ result }, 'Scheduled daily digest job completed successfully');
    return result;
  } catch (error) {
    logger.error({ error: error.message }, 'Scheduled daily digest job encountered an error');
    return null;
  }
}
