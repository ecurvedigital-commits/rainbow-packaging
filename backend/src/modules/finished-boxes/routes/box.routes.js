import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { handleListBoxes } from '../controllers/box.controller.js';

const router = Router();

router.use(authenticate);

// Placeholder endpoint
router.get('/', handleListBoxes);

export default router;
