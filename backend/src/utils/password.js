import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Hashes a plaintext password with bcrypt.
 * @param {string} plain
 * @returns {Promise<string>}
 */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Generates a 10-character human-friendly temporary password without ambiguous characters.
 * @returns {string}
 */
export function generateTempPassword() {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const bytes = crypto.randomBytes(10);
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}
