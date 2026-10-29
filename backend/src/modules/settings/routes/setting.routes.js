import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { requirePasswordChange } from '../../../core/middleware/requirePasswordChange.js';
import { authorizeRoles } from '../../../core/middleware/authorizeRoles.js';
import { validate } from '../../../core/middleware/validate.js';
import { ROLES } from '../../../core/constants/roles.js';
import { updateSettingsSchema } from '../validators/setting.validator.js';
import { getSettings, updateSettings } from '../controllers/setting.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange, authorizeRoles(ROLES.ADMIN));

router.get('/', getSettings);
router.patch('/', validate(updateSettingsSchema), updateSettings);

export const settingRoutes = router;
