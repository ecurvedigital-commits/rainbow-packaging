import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { updateSettingsSchema } from '../validators/setting.validator.js';
import { getSettings, updateSettings } from '../controllers/setting.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange, authorizeRoles(ROLES.ADMIN));

router.get('/', getSettings);
router.patch('/', validate(updateSettingsSchema), updateSettings);

export const settingRoutes = router;
