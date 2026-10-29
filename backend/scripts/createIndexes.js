import { connectDb, disconnectDb } from '../src/core/database/db.js';
import { User } from '../src/modules/users/models/user.model.js';
import { RefreshToken } from '../src/modules/auth/models/refreshToken.model.js';
import { Reel } from '../src/modules/reels/models/reel.model.js';
import { ReelEvent } from '../src/modules/reels/models/reelEvent.model.js';
import { FieldDefinition } from '../src/modules/settings/models/fieldDefinition.model.js';
import { Notification } from '../src/modules/notifications/models/notification.model.js';
import { Counter } from '../src/core/database/counter.model.js';
import { DigestLog } from '../src/modules/digest/models/digestLog.model.js';
import { Setting } from '../src/modules/settings/models/setting.model.js';
import { MasterProduct } from '../src/modules/reels/models/masterProduct.model.js';
import { logger } from '../src/core/config/logger.js';

const models = [
  User,
  RefreshToken,
  Reel,
  MasterProduct,
  ReelEvent,
  FieldDefinition,
  Notification,
  Counter,
  DigestLog,
  Setting,
];

async function run() {
  try {
    await connectDb();
    logger.info('Syncing indexes for all 9 collections...');

    for (const model of models) {
      await model.syncIndexes();
      const indexes = await model.collection.indexes();
      const indexNames = indexes.map((idx) => idx.name).join(', ');
      console.log(`[${model.collection.name}] indexes: ${indexNames}`);
    }

    logger.info('All collection indexes synced successfully.');
    await disconnectDb();
    process.exit(0);
  } catch (error) {
    logger.error({ reason: error.message }, 'Failed to sync database indexes');
    await disconnectDb();
    process.exit(1);
  }
}

run();
