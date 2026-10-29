import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../../core/middleware/authorizeRoles.js';
import { validate } from '../../../core/middleware/validate.js';
import { ROLES } from '../../../core/constants/roles.js';
import {
  handleListMasterProducts,
  handleGetMasterProduct,
  handleGetMasterProductReels,
  handlePreviewMasterKey,
  handleUpdateMasterProductStatus,
} from '../controllers/masterProduct.controller.js';
import {
  listMasterProductsSchema,
  previewMasterKeySchema,
  updateMasterProductStatusSchema,
} from '../validators/masterProduct.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listMasterProductsSchema), handleListMasterProducts);
router.post('/preview-key', validate(previewMasterKeySchema), handlePreviewMasterKey);
router.get('/:id', handleGetMasterProduct);
router.get('/:id/reels', handleGetMasterProductReels);
router.patch(
  '/:id/status',
  authorizeRoles(ROLES.ADMIN),
  validate(updateMasterProductStatusSchema),
  handleUpdateMasterProductStatus
);

export default router;
