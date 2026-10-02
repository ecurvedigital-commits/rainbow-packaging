import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, ERROR_CODES.RATE_LIMITED, 'Too many login attempts. Please try again after 15 minutes.');
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, ERROR_CODES.RATE_LIMITED, 'Too many requests. Please slow down.');
  },
});
