import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { validate } from '../middleware/validate.js';
import {
  getStatusBoardSchema,
  getBreakdownSchema,
  getAgingSchema,
} from '../validators/dashboard.validator.js';
import {
  getSummary,
  getStatusBoard,
  getBreakdown,
  getAging,
} from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

router.get('/summary', getSummary);
router.get('/status-board', validate(getStatusBoardSchema), getStatusBoard);
router.get('/breakdown', validate(getBreakdownSchema), getBreakdown);
router.get('/aging', validate(getAgingSchema), getAging);

export const dashboardRoutes = router;
