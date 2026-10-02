import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { listAuditEventsSchema, getAuditEventByIdSchema } from '../validators/audit.validator.js';
import { listAuditEvents, getAuditEventById } from '../controllers/audit.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange, authorizeRoles(ROLES.ADMIN));

router.get('/events', validate(listAuditEventsSchema), listAuditEvents);
router.get('/events/:id', validate(getAuditEventByIdSchema), getAuditEventById);

export const auditRoutes = router;
