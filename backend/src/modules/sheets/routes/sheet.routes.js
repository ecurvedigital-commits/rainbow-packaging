import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { handleListSheets } from '../controllers/sheet.controller.js';

const router = Router();

router.use(authenticate);

// Placeholder endpoint
router.get('/', handleListSheets);

export default router;
