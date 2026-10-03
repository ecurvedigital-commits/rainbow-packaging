import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';
import { reelRoutes } from './reel.routes.js';
import { approvalRoutes } from './approval.routes.js';
import { notificationRoutes } from './notification.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { fieldDefinitionRoutes } from './fieldDefinition.routes.js';
import { auditRoutes } from './audit.routes.js';
import { digestRoutes } from './digest.routes.js';
import { settingRoutes } from './setting.routes.js';
import masterProductRoutes from './masterProduct.routes.js';
import masterCodeRoutes from './masterCode.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/reels', reelRoutes);
router.use('/master-products', masterProductRoutes);
router.use('/master-codes', masterCodeRoutes);
router.use('/approvals', approvalRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/field-definitions', fieldDefinitionRoutes);
router.use('/audit', auditRoutes);
router.use('/digest', digestRoutes);
router.use('/settings', settingRoutes);

export const apiRouter = router;
