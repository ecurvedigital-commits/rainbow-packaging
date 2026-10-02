import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  listPendingApprovalsSchema,
  listMyEntriesSchema,
  confirmEntrySchema,
  declineEntrySchema,
} from '../validators/approval.validator.js';
import {
  listPendingApprovals,
  listMyEntries,
  confirmEntry,
  declineEntry,
} from '../controllers/approval.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

router.get('/pending', authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN), validate(listPendingApprovalsSchema), listPendingApprovals);
router.get('/mine', authorizeRoles(ROLES.OPERATOR, ROLES.ADMIN), validate(listMyEntriesSchema), listMyEntries);
router.post('/:eventId/confirm', authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN), validate(confirmEntrySchema), confirmEntry);
router.post('/:eventId/decline', authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN), validate(declineEntrySchema), declineEntry);

export const approvalRoutes = router;
