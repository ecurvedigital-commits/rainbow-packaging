import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Sends an email notification to the specified recipient(s).
 * @param {{ to: string|string[], subject: string, text?: string, html?: string }} options
 * @returns {Promise<{ delivered: boolean, messageId?: string, simulated?: boolean }>}
 */
export async function sendMail({ to, subject, text = '', html = '' }) {
  const recipients = Array.isArray(to) ? to : [to];

  if (!recipients.length) {
    logger.warn('No recipients specified for email delivery');
    return { delivered: false, simulated: true };
  }

  // If SMTP is not fully configured, simulate email sending and log payload
  if (!env.SMTP_HOST) {
    logger.info(
      {
        recipients,
        subject,
        from: env.EMAIL_FROM,
        simulated: true,
      },
      `[Email Service Simulated] Email to ${recipients.join(', ')}: "${subject}"`
    );
    return { delivered: true, simulated: true, messageId: `sim_${Date.now()}` };
  }

  try {
    // Attempt dynamic import of nodemailer if available
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });

    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: recipients.join(', '),
      subject,
      text,
      html,
    });

    logger.info({ messageId: info.messageId, recipients }, 'Email delivered successfully via SMTP');
    return { delivered: true, messageId: info.messageId, simulated: false };
  } catch (error) {
    logger.error(
      { error: error.message, recipients, subject },
      'Failed to send email via SMTP, fallback to simulated delivery log'
    );
    return { delivered: false, error: error.message };
  }
}
