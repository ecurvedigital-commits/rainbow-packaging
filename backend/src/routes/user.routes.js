import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
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

const router = Router();

router.use(authenticate, requirePasswordChange);

// Directory endpoint available to all authenticated users for messaging & mentions
router.get('/directory', listDirectory);

// Admin-only management routes
router.use(authorizeRoles(ROLES.ADMIN));

router.post('/', validate(createUserSchema), createUser);
router.get('/', validate(listUsersSchema), listUsers);
router.get('/:id', validate(getUserSchema), getUser);
router.patch('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', validate(getUserSchema), deleteUser);
router.patch('/:id/status', validate(setUserStatusSchema), setUserStatus);
router.post('/:id/reset-password', validate(resetUserPasswordSchema), resetUserPassword);
router.post('/:id/unlock', validate(unlockUserSchema), unlockUser);

export const userRoutes = router;

