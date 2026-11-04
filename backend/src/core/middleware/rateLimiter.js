import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Standard 429 response handler using application API response format
 */
function createRateLimitHandler(message) {
  return (_req, res) => {
    sendError(res, 429, ERROR_CODES.RATE_LIMITED, message);
  };
}

/**
 * 1. Strict Auth / Login Rate Limiter (Brute-force protection)
 * Throttles failed attempts per IP + username to stop credential spraying
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : isDev ? 150 : 10, // 10 attempts per 15 min in prod
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';
    return rawUsername ? `${clientIp}_${rawUsername}` : clientIp;
  },
  handler: createRateLimitHandler('Too many login attempts. Please try again after 15 minutes.'),
});

// Alias for authRateLimiter
export const authRateLimiter = loginRateLimiter;

/**
 * 2. Refresh Token Limiter
 * Prevents session refresh churning and token reuse spam
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : isDev ? 300 : 60, // 60 refreshes per 15 min in prod
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: createRateLimitHandler('Too many session refresh attempts. Please slow down.'),
});

/**
 * 3. Sensitive Actions Limiter
 * Protects password changes, user unlocks, password resets, and role assignments
 */
export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : isDev ? 150 : 25, // 25 sensitive actions per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: createRateLimitHandler('Too many sensitive requests. Please wait a few minutes before trying again.'),
});

/**
 * 4. Stock & Inventory Mutations Limiter
 * Guards against bulk automated inventory injections or spam writes
 */
export const stockActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : isDev ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: createRateLimitHandler('Stock action rate limit exceeded. Please try again shortly.'),
});

/**
 * 5. General API Rate Limiter
 * Guards general endpoints while exempting polling endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 50000 : isDev ? 10000 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isTest) return true;
    if (req.path.includes('/notifications/unread-count') || req.path === '/health') return true;
    return false;
  },
  handler: createRateLimitHandler('Too many requests. Please slow down.'),
});

