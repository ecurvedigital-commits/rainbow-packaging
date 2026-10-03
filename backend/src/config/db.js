import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

// Configure DNS fallback for MongoDB Atlas SRV lookup on local/Windows environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom DNS cannot be set
}

/**
 * Connect to MongoDB Atlas.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDb() {
  try {
    // Configure DNS fallback for MongoDB Atlas SRV lookup on Windows/local environments
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (dnsErr) {
      // Ignore if custom DNS cannot be set
    }

    mongoose.set('strictQuery', true);
    mongoose.set('autoIndex', env.NODE_ENV !== 'production');

    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
    });

    const dbMode = env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
    const activeDbName = conn.connection.db ? conn.connection.db.databaseName : env.MONGODB_DB_NAME;

    logger.info(
      { dbEnvironment: dbMode, dbName: activeDbName },
      `Database environment: ${dbMode} | Connected to database: "${activeDbName}"`
    );
    return conn;
  } catch (error) {
    logger.error({ reason: error.message }, 'Failed to connect to MongoDB Atlas');
    throw error;
  }
}

/**
 * Disconnect from MongoDB Atlas cleanly.
 * @returns {Promise<void>}
 */
export async function disconnectDb() {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB Atlas');
  } catch (error) {
    logger.error({ reason: error.message }, 'Error disconnecting from MongoDB Atlas');
  }
}

/**
 * Get current database connection status.
 * @returns {'connected' | 'disconnected'}
 */
export function getDbStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

/**
 * Executes a callback within a MongoDB transaction.
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
