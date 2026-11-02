import { Router } from 'express';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notificationController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParamSchema, notificationQuerySchema } from '../validators/userValidators';

const router = Router();

router.use(protect);
router.get('/', validate(notificationQuerySchema, 'query'), listNotifications);
router.post('/read-all', markAllNotificationsRead);
router.patch('/:id/read', validate(idParamSchema, 'params'), markNotificationRead);

export default router;
