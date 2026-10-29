import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { requirePasswordChange } from '../../../core/middleware/requirePasswordChange.js';
import { authorizeRoles } from '../../../core/middleware/authorizeRoles.js';
import { validate } from '../../../core/middleware/validate.js';
import { ROLES } from '../../../core/constants/roles.js';
import { listAuditEventsSchema, getAuditEventByIdSchema } from '../validators/audit.validator.js';
import { listAuditEvents, getAuditEventById } from '../controllers/audit.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange, authorizeRoles(ROLES.ADMIN));

router.get('/events', validate(listAuditEventsSchema), listAuditEvents);
router.get('/events/:id', validate(getAuditEventByIdSchema), getAuditEventById);

export const auditRoutes = router;
