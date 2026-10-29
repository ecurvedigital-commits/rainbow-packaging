import { Router } from 'express';
import { healthRoutes } from './health.routes.js';

// Platform Feature Modules
import { authRoutes } from '../modules/auth/index.js';
import { userRoutes } from '../modules/users/index.js';
import { approvalRoutes, correctionRoutes } from '../modules/approvals/index.js';
import { notificationRoutes, messageRoutes } from '../modules/notifications/index.js';
import { settingRoutes, fieldDefinitionRoutes } from '../modules/settings/index.js';
import { dashboardRoutes } from '../modules/dashboard/index.js';
import { auditRoutes } from '../modules/audit/index.js';
import { digestRoutes } from '../modules/digest/index.js';

// Inventory Domain Modules
import { reelRoutes, masterCodeRoutes, masterProductRoutes } from '../modules/reels/index.js';
import { sheetRoutes } from '../modules/sheets/index.js';
import { boxRoutes } from '../modules/finished-boxes/index.js';

const router = Router();

// 1. Health & Platform Modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/approvals', approvalRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/corrections', correctionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/field-definitions', fieldDefinitionRoutes);
router.use('/audit', auditRoutes);
router.use('/digest', digestRoutes);
router.use('/settings', settingRoutes);

// 2. Inventory Domain Modules
router.use('/reels', reelRoutes);
router.use('/master-products', masterProductRoutes);
router.use('/master-codes', masterCodeRoutes);
router.use('/sheets', sheetRoutes);
router.use('/finished-boxes', boxRoutes);

export const apiRouter = router;
