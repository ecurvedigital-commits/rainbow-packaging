import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { requirePasswordChange } from '../../../core/middleware/requirePasswordChange.js';
import { authorizeRoles } from '../../../core/middleware/authorizeRoles.js';
import { validate } from '../../../core/middleware/validate.js';
import { ROLES } from '../../../core/constants/roles.js';
import {
  listFieldDefinitionsSchema,
  createFieldDefinitionSchema,
  updateFieldDefinitionSchema,
} from '../validators/fieldDefinition.validator.js';
import {
  listFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
} from '../controllers/fieldDefinition.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

router.get('/', validate(listFieldDefinitionsSchema), listFieldDefinitions);
router.post('/', authorizeRoles(ROLES.ADMIN), validate(createFieldDefinitionSchema), createFieldDefinition);
router.patch('/:id', authorizeRoles(ROLES.ADMIN), validate(updateFieldDefinitionSchema), updateFieldDefinition);

export const fieldDefinitionRoutes = router;
