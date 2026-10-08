import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  listReelsSchema,
  searchReelsSchema,
  getReelSchema,
  getReelJourneySchema,
  createReelSchema,
  bulkCreateReelSchema,
  recordUsageSchema,
  updateReelSchema,
  voidReelSchema,
  updateReelEventSchema,
} from '../validators/reel.validator.js';
import {
  listReels,
  searchReels,
  getReel,
  getReelJourney,
  createReel,
  bulkCreateReels,
  recordUsage,
  updateReel,
  voidReel,
  getNextReelNumber,
  getFilterOptions,
  listUsageLogs,
  updateReelEvent,
} from '../controllers/reel.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

// Search & static routes must be registered before /:id
router.get('/search', validate(searchReelsSchema), searchReels);
router.get('/next-number', getNextReelNumber);
router.get('/filter-options', getFilterOptions);
router.get('/usage/logs', listUsageLogs);
router.patch('/events/:eventId', authorizeRoles(ROLES.ADMIN), validate(updateReelEventSchema), updateReelEvent);
router.get('/', validate(listReelsSchema), listReels);
router.get('/:id', validate(getReelSchema), getReel);
router.get('/:id/journey', validate(getReelJourneySchema), getReelJourney);

router.post('/', authorizeRoles(ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.ADMIN), validate(createReelSchema), createReel);
router.post('/bulk', authorizeRoles(ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.ADMIN), validate(bulkCreateReelSchema), bulkCreateReels);
router.post('/:id/usage', authorizeRoles(ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.ADMIN), validate(recordUsageSchema), recordUsage);
router.patch('/:id', authorizeRoles(ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.ADMIN), validate(updateReelSchema), updateReel);
router.post('/:id/void', authorizeRoles(ROLES.ADMIN), validate(voidReelSchema), voidReel);

export const reelRoutes = router;
