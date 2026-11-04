import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { requirePasswordChange } from '../../../core/middleware/requirePasswordChange.js';
import { authorizeRoles } from '../../../core/middleware/authorizeRoles.js';
import { validate } from '../../../core/middleware/validate.js';
import { sensitiveActionLimiter } from '../../../core/middleware/rateLimiter.js';
import { ROLES } from '../../../core/constants/roles.js';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  rejectPurchaseOrderSchema,
  cancelPurchaseOrderSchema,
  getPurchaseOrderSchema,
  listPurchaseOrdersSchema,
} from '../validators/purchaseOrder.validator.js';
import {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  submitPurchaseOrderForApproval,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderFilterOptions,
} from '../controllers/purchaseOrder.controller.js';

const router = Router();

// All PO operations require valid authenticated session
router.use(authenticate, requirePasswordChange);

// Filter autocompletion options (Distinct suppliers, clients, jobs)
router.get('/filters/options', getPurchaseOrderFilterOptions);

// List Purchase Orders with pagination, search, and filters
router.get('/', validate(listPurchaseOrdersSchema), listPurchaseOrders);

// Get single Purchase Order details
router.get('/:id', validate(getPurchaseOrderSchema), getPurchaseOrderById);

// Create new Purchase Order in DRAFT status
router.post(
  '/',
  sensitiveActionLimiter,
  validate(createPurchaseOrderSchema),
  createPurchaseOrder
);

// Update DRAFT or REJECTED Purchase Order
router.patch(
  '/:id',
  sensitiveActionLimiter,
  validate(updatePurchaseOrderSchema),
  updatePurchaseOrder
);

// Submit Purchase Order for Authorization
router.post(
  '/:id/submit',
  sensitiveActionLimiter,
  validate(getPurchaseOrderSchema),
  submitPurchaseOrderForApproval
);

// Approve Purchase Order (Supervisor / Admin only)
router.post(
  '/:id/approve',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPERVISOR),
  sensitiveActionLimiter,
  validate(getPurchaseOrderSchema),
  approvePurchaseOrder
);

// Reject Purchase Order with reason (Supervisor / Admin only)
router.post(
  '/:id/reject',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPERVISOR),
  sensitiveActionLimiter,
  validate(rejectPurchaseOrderSchema),
  rejectPurchaseOrder
);

// Cancel Purchase Order
router.post(
  '/:id/cancel',
  sensitiveActionLimiter,
  validate(cancelPurchaseOrderSchema),
  cancelPurchaseOrder
);

export const purchaseOrderRoutes = router;

