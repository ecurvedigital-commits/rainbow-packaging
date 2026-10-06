import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  createCorrectionSchema,
  listCorrectionsSchema,
  getCorrectionSchema,
  resolveCorrectionSchema,
  rejectCorrectionSchema,
} from '../validators/correction.validator.js';
import {
  createCorrectionRequest,
  listCorrectionRequests,
  getPendingCorrectionCount,
  getCorrectionRequest,
  resolveCorrectionRequest,
  rejectCorrectionRequest,
} from '../controllers/correction.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

// Specific routes before /:id
router.get('/pending-count', getPendingCorrectionCount);

// POST: OPERATOR, SUPERVISOR, ADMIN
router.post('/', validate(createCorrectionSchema), createCorrectionRequest);

// GET: All authenticated
router.get('/', validate(listCorrectionsSchema), listCorrectionRequests);
router.get('/:id', validate(getCorrectionSchema), getCorrectionRequest);

// PATCH: ADMIN ONLY to resolve/apply
router.patch('/:id/resolve', authorizeRoles(ROLES.ADMIN), validate(resolveCorrectionSchema), resolveCorrectionRequest);

// PATCH: ADMIN and SUPERVISOR to reject
router.patch('/:id/reject', authorizeRoles(ROLES.ADMIN, ROLES.SUPERVISOR), validate(rejectCorrectionSchema), rejectCorrectionRequest);

export const correctionRoutes = router;
