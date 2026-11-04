import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { validate } from '../../../core/middleware/validate.js';
import { loginRateLimiter, refreshRateLimiter, sensitiveActionLimiter } from '../../../core/middleware/rateLimiter.js';
import { loginSchema, refreshSchema, changePasswordSchema } from '../validators/auth.validator.js';
import {
  login,
  refreshSession,
  logout,
  logoutAll,
  getMe,
  changePassword,
  getMySessions,
  revokeMySession,
} from '../controllers/auth.controller.js';

const router = Router();

// Public routes
router.post('/login', loginRateLimiter, validate(loginSchema), login);
router.post('/refresh', refreshRateLimiter, validate(refreshSchema), refreshSession);

// Signed-in routes (exempt from password change check)
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, sensitiveActionLimiter, validate(changePasswordSchema), changePassword);

// Device sessions routes
router.get('/sessions', authenticate, getMySessions);
router.post('/sessions/:sessionId/revoke', authenticate, sensitiveActionLimiter, revokeMySession);

export const authRoutes = router;
