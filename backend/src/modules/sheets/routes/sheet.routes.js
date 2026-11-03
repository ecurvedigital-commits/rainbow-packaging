import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../../core/middleware/authorizeRoles.js';
import { validate } from '../../../core/middleware/validate.js';
import { ROLES } from '../../../core/constants/roles.js';

import * as sheetController from '../controllers/sheet.controller.js';
import * as sheetValidator from '../validators/sheet.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// 1. Dashboard, Metadata & Aggregations
router.get('/summary', sheetController.handleGetSheetSummary);
router.get('/filters/options', sheetController.handleGetFilterOptions);

// 2. Approvals Queue & Actions
router.get(
  '/approvals/pending',
  authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN),
  sheetController.handleListPendingApprovals
);
router.post(
  '/approvals/:id/confirm',
  authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN),
  sheetController.handleConfirmApproval
);
router.post(
  '/approvals/:id/decline',
  authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN),
  sheetController.handleDeclineApproval
);

// 3. Excel Batch Import (Admin only)
router.post(
  '/import-excel',
  authorizeRoles(ROLES.ADMIN),
  validate(sheetValidator.importExcelSchema),
  sheetController.handleImportExcel
);

// 4. Collection CRUD & Inventory
router.get(
  '/history',
  validate(sheetValidator.listSheetHistoryQuerySchema),
  sheetController.handleListSheetHistory
);

router.get(
  '/',
  validate(sheetValidator.listSheetsQuerySchema),
  sheetController.handleListSheets
);

router.post(
  '/',
  authorizeRoles(ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.ADMIN),
  validate(sheetValidator.createSheetSchema),
  sheetController.handleCreateSheet
);

// 5. Individual Lot Operations
router.get('/:id', sheetController.handleGetSheet);
router.get('/:id/journey', sheetController.handleGetSheetJourney);

router.patch(
  '/:id',
  authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN),
  validate(sheetValidator.updateSheetSchema),
  sheetController.handleUpdateSheet
);

router.post(
  '/:id/usage',
  authorizeRoles(ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.ADMIN),
  validate(sheetValidator.recordSheetUsageSchema),
  sheetController.handleRecordSheetUsage
);

router.post(
  '/:id/adjustment',
  authorizeRoles(ROLES.SUPERVISOR, ROLES.ADMIN),
  validate(sheetValidator.adjustSheetStockSchema),
  sheetController.handleAdjustSheetStock
);

router.post(
  '/:id/return',
  authorizeRoles(ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.ADMIN),
  validate(sheetValidator.returnSheetStockSchema),
  sheetController.handleReturnSheetStock
);

router.post(
  '/:id/void',
  authorizeRoles(ROLES.ADMIN),
  validate(sheetValidator.voidSheetSchema),
  sheetController.handleVoidSheet
);

export default router;
