import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { validate } from '../middleware/validate.js';
import {
  sendMessageSchema,
  listMessagesSchema,
  getMessageSchema,
} from '../validators/message.validator.js';
import {
  sendMessage,
  listMessages,
  getMessage,
} from '../controllers/message.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

router.post('/', validate(sendMessageSchema), sendMessage);
router.get('/', validate(listMessagesSchema), listMessages);
router.get('/:id', validate(getMessageSchema), getMessage);

export const messageRoutes = router;
