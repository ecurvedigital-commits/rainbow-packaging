import { Router } from 'express';
import { getDbStatus } from '../config/db.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

router.get('/', (_req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    db: getDbStatus(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

export const healthRoutes = router;
