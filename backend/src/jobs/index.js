import { logger } from '../config/logger.js';
import { ensureSettings } from '../services/setting.service.js';
import { runDailyDigestJob } from './dailyDigest.job.js';

let cronTask = null;

/**
 * Parses time string (e.g. "20:00") into cron expression "00 20 * * *"
 * @param {string} timeStr
 * @returns {string}
 */
function timeToCron(timeStr) {
  if (!timeStr || !timeStr.includes(':')) {
    return '0 20 * * *';
  }
  const [hours, minutes] = timeStr.split(':').map((s) => s.trim());
  return `${minutes || '0'} ${hours || '20'} * * *`;
}

/**
 * Initializes or reschedules the background cron tasks according to settings.
 */
export async function initJobs() {
  try {
    const settings = await ensureSettings();
    const digestConfig = settings.digest || { enabled: true, time: '20:00', timezone: 'Asia/Kolkata' };

    if (cronTask && typeof cronTask.stop === 'function') {
      cronTask.stop();
      cronTask = null;
    }

    if (!digestConfig.enabled) {
      logger.info('Daily digest scheduler is disabled by settings');
      return;
    }

    const cronPattern = timeToCron(digestConfig.time);
    logger.info(
      { pattern: cronPattern, timezone: digestConfig.timezone },
      'Registering daily digest cron job schedule'
    );

    try {
      const cron = await import('node-cron');
      cronTask = cron.schedule(
        cronPattern,
        async () => {
          await runDailyDigestJob();
        },
        {
          timezone: digestConfig.timezone || 'Asia/Kolkata',
        }
      );
    } catch {
      logger.info('node-cron not installed, background scheduling handled on-demand');
    }
  } catch (error) {
    logger.warn({ error: error.message }, 'Failed to initialize background cron jobs');
  }
}
