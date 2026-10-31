import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

/**
 * Global Multi-Document Transaction Utility
 *
 * Executes a unit of work inside an active MongoDB ClientSession transaction.
 * Automatically handles commit, abort, and session lifecycle.
 *
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withTransaction(work) {
  const session = await mongoose.startSession();
  let originalError = null;
  try {
    let result;
    await session.withTransaction(async () => {
      try {
        result = await work(session);
      } catch (err) {
        originalError = err;
        throw err;
      }
    });
    return result;
  } catch (err) {
    logger.warn({ error: err.message }, 'MongoDB transaction aborted and rolled back');
    if (originalError) {
      throw originalError;
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

