import { Router } from 'express';
import {
  submitContactMessage, getContactMessages, markMessageRead, deleteContactMessage,
} from '../controllers/contactController';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { formLimiter } from '../middleware/rateLimiter';
import { contactMessageSchema } from '../validators/contactValidators';

const router = Router();

router.post('/', formLimiter, validate(contactMessageSchema), submitContactMessage);

router.get('/', protect, restrictTo('admin', 'superadmin'), getContactMessages);
router.patch('/:id/read', protect, restrictTo('admin', 'superadmin'), markMessageRead);
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), deleteContactMessage);

export default router;
