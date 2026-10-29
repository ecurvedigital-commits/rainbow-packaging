import { Router } from 'express';
import { authenticate } from '../../../core/middleware/authenticate.js';
import { requirePasswordChange } from '../../../core/middleware/requirePasswordChange.js';
import { validate } from '../../../core/middleware/validate.js';
import { listNotificationsSchema, markReadSchema, getNotificationSchema } from '../validators/notification.validator.js';
import {
  listNotifications,
  getNotification,
  getUnreadCount,
  markAllRead,
  markRead,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChange);

// Specific routes registered before /:id
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.get('/', validate(listNotificationsSchema), listNotifications);
router.get('/:id', validate(getNotificationSchema), getNotification);
router.patch('/:id/read', validate(markReadSchema), markRead);

export const notificationRoutes = router;

