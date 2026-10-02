import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  previewDigestSchema,
  sendDigestSchema,
  listDigestLogsSchema,
} from '../validators/digest.validator.js';
import {
  previewDigest,
  sendDigest,
  listDigestLogs,
} from '../controllers/digest.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange, authorizeRoles(ROLES.ADMIN));

router.get('/preview', validate(previewDigestSchema), previewDigest);
router.post('/send', validate(sendDigestSchema), sendDigest);
router.get('/logs', validate(listDigestLogsSchema), listDigestLogs);

export const digestRoutes = router;
