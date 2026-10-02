import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { loginSchema, refreshSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { login, refreshSession, logout, logoutAll, getMe, changePassword } from '../controllers/auth.controller.js';

const router = Router();

// Public routes
router.post('/login', loginRateLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refreshSession);

// Signed-in routes (exempt from password change check)
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export const authRoutes = router;
