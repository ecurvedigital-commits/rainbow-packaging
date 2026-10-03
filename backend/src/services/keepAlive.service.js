import https from 'https';
import http from 'http';
import { logger } from '../config/logger.js';

let keepAliveInterval = null;

/**
 * Starts a background timer that pings the server's health endpoint
 * every 5 minutes so Render web service does not sleep on the free tier.
 */
export function startKeepAlive() {
  const appUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;

  if (!appUrl) {
    logger.info('Keep-alive ping service disabled (RENDER_EXTERNAL_URL or APP_URL not provided)');
    return;
  }

  const healthEndpoint = `${appUrl.replace(/\/$/, '')}/api/v1/health`;
  const intervalMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES, 10) || 5;
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info(`Starting Keep-Alive ping service targeting ${healthEndpoint} every ${intervalMinutes} minutes`);

  keepAliveInterval = setInterval(() => {
    const client = healthEndpoint.startsWith('https') ? https : http;
    client
      .get(healthEndpoint, (res) => {
        logger.info({ statusCode: res.statusCode }, 'Keep-alive ping sent successfully');
      })
      .on('error', (err) => {
        logger.warn({ error: err.message }, 'Keep-alive ping encountered an error');
      });
  }, intervalMs);
}

/**
 * Stops the keep-alive timer cleanly on server shutdown.
 */
export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    logger.info('Keep-alive ping service stopped');
  }
}
