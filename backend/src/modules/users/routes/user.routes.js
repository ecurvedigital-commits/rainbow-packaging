import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { requirePasswordChange } from '../../../core/middleware/requirePasswordChange.js';
import { authorizeRoles } from '../../../core/middleware/authorizeRoles.js';
import { validate } from '../../../core/middleware/validate.js';
import { sensitiveActionLimiter } from '../../../core/middleware/rateLimiter.js';
import { ROLES } from '../../../core/constants/roles.js';
import {
  createUserSchema,
  listUsersSchema,
  getUserSchema,
  updateUserSchema,
  setUserStatusSchema,
  resetUserPasswordSchema,
  unlockUserSchema,
} from '../validators/user.validator.js';
import {
  createUser,
  listUsers,
  listDirectory,
  getUser,
  updateUser,
  setUserStatus,
  resetUserPassword,
  unlockUser,
  deleteUser,
} from '../controllers/user.controller.js';
import {
  adminListActiveSessions,
  adminListUserSessions,
  adminRevokeUserSession,
} from '../../auth/controllers/auth.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

// Directory endpoint available to all authenticated users for messaging & mentions
router.get('/directory', listDirectory);

// Admin-only management routes
router.use(authorizeRoles(ROLES.ADMIN));

// System-wide active device logins
router.get('/sessions/active', adminListActiveSessions);

router.post('/', sensitiveActionLimiter, validate(createUserSchema), createUser);
router.get('/', validate(listUsersSchema), listUsers);
router.get('/:id', validate(getUserSchema), getUser);
router.patch('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', sensitiveActionLimiter, validate(getUserSchema), deleteUser);
router.patch('/:id/status', sensitiveActionLimiter, validate(setUserStatusSchema), setUserStatus);
router.post('/:id/reset-password', sensitiveActionLimiter, validate(resetUserPasswordSchema), resetUserPassword);
router.post('/:id/unlock', sensitiveActionLimiter, validate(unlockUserSchema), unlockUser);

// Per-user device sessions tracking & remote termination
router.get('/:id/sessions', adminListUserSessions);
router.post('/:id/sessions/:sessionId/revoke', sensitiveActionLimiter, adminRevokeUserSession);

export const userRoutes = router;

