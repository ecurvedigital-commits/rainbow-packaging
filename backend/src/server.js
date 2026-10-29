import { env } from './core/config/env.js';
import { logger } from './core/config/logger.js';
import { connectDb, disconnectDb } from './core/database/db.js';
import { ensureSettings } from './modules/settings/services/setting.service.js';
import { ensureAdmin } from './modules/users/services/user.service.js';
import { initJobs } from './jobs/index.js';
import { createApp } from './app.js';
import { startKeepAlive, stopKeepAlive } from './core/services/keepAlive.service.js';

let server;

async function bootstrap() {
  try {
    await connectDb();
    await ensureSettings();
    await ensureAdmin();
    await initJobs();

    const app = createApp();

    server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, `Server is running on http://localhost:${env.PORT}`);
      startKeepAlive();
    });

    const shutdown = async (signal) => {
      logger.info({ signal }, 'Received shutdown signal, closing server cleanly...');
      stopKeepAlive();
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed');
          await disconnectDb();
          process.exit(0);
        });
      } else {
        await disconnectDb();
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ reason: error.message }, 'Server failed to start');
    process.exit(1);
  }
}

bootstrap();
// Backend server entrypoint for Rainbow Packages Reel Inventory

