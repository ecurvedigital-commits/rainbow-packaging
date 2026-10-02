import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { RefreshToken } from '../src/models/refreshToken.model.js';
import { Reel } from '../src/models/reel.model.js';
import { ReelEvent } from '../src/models/reelEvent.model.js';
import { FieldDefinition } from '../src/models/fieldDefinition.model.js';
import { Notification } from '../src/models/notification.model.js';
import { Counter } from '../src/models/counter.model.js';
import { DigestLog } from '../src/models/digestLog.model.js';
import { Setting } from '../src/models/setting.model.js';
import { MasterProduct } from '../src/models/masterProduct.model.js';
import { logger } from '../src/config/logger.js';

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
