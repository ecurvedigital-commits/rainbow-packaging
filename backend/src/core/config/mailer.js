import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Creates and returns an active email transport if SMTP is configured.
 * @returns {object|null}
 */
export function getMailerTransport() {
  if (!env.SMTP_HOST) {
    return null;
  }

  try {
    // Dynamic import if nodemailer is installed
    return {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    };
  } catch (error) {
    logger.warn({ error: error.message }, 'Failed to initialize mailer transport');
    return null;
  }
}
