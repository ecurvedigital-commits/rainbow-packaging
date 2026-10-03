import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { ROLES } from '../constants/roles.js';
import {
  getMasterCodes,
  createMasterCode,
  updateMasterCode,
  deleteMasterCode,
} from '../controllers/masterCode.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getMasterCodes);
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.SUPERVISOR), createMasterCode);
router.put('/:id', authorizeRoles(ROLES.ADMIN, ROLES.SUPERVISOR), updateMasterCode);
router.delete('/:id', authorizeRoles(ROLES.ADMIN, ROLES.SUPERVISOR), deleteMasterCode);

export default router;
