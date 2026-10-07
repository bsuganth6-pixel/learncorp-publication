import { Router } from 'express';
import {
  getPublishedTestimonials, getAllTestimonials, createTestimonial,
  updateTestimonial, deleteTestimonial,
} from '../controllers/testimonialController';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTestimonialSchema, updateTestimonialSchema } from '../validators/testimonialValidators';

const router = Router();

router.get('/', getPublishedTestimonials);

router.get('/admin/all', protect, restrictTo('admin', 'superadmin'), getAllTestimonials);
router.post('/', protect, restrictTo('admin', 'superadmin'), validate(createTestimonialSchema), createTestimonial);
router.patch('/:id', protect, restrictTo('admin', 'superadmin'), validate(updateTestimonialSchema), updateTestimonial);
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), deleteTestimonial);

export default router;
