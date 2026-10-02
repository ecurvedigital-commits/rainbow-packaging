import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Signs an access token JWT for an active user.
 * @param {{ id: string, role: string, username: string }} user
 * @returns {string}
 */
export function signAccessToken(user) {
  const payload = {
    sub: user.id || user._id.toString(),
    role: user.role,
    username: user.username,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * Verifies an access token JWT.
 * @param {string} token
 * @returns {{ sub: string, role: string, username: string }}
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createApiError(401, ERROR_CODES.TOKEN_EXPIRED, 'Access token has expired');
    }
    throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Invalid access token');
  }
}

/**
 * Generates a SHA-256 hash of a raw token.
 * @param {string} raw
 * @returns {string}
 */
export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Creates and persists a new refresh token document in MongoDB.
 * @param {{ userId: string | import('mongoose').Types.ObjectId, ip?: string, userAgent?: string }} params
 * @returns {Promise<{ token: string, expires_at: Date }>}
 */
export async function createRefreshToken({ userId, ip, userAgent }) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const token_hash = hashToken(rawToken);
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    user_id: userId,
    token_hash,
    expires_at,
    ip: ip || null,
    user_agent: userAgent || null,
    created_at: new Date(),
  });

  return { token: rawToken, expires_at };
}
