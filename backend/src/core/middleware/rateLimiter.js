import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV;

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevOrTest,
  handler: (_req, res) => {
    sendError(res, 429, ERROR_CODES.RATE_LIMITED, 'Too many login attempts. Please try again after 15 minutes.');
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 10000 : 3000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isDevOrTest) return true;
    if (req.path.includes('/notifications/unread-count')) return true;
    return false;
  },
  handler: (_req, res) => {
    sendError(res, 429, ERROR_CODES.RATE_LIMITED, 'Too many requests. Please slow down.');
  },
});
