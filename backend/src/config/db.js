import { execSync } from 'child_process';
import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Configure DNS servers dynamically for Node on Windows
 */
function configureDns() {
  if (process.platform === 'win32') {
    try {
      const output = execSync('powershell -NoProfile -Command "(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses"', { encoding: 'utf8' });
      const ips = output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      dns.setServers(Array.from(new Set([...ips, '8.8.8.8', '1.1.1.1', '8.8.4.4'])));
    } catch {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    }
  }
}

/**
 * Connect to MongoDB Atlas.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDb() {
  try {
    configureDns();

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
