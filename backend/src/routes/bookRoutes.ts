import { Router } from 'express';
import {
  getBooks, getAdminBooks, getBookBySlug, getAdminBookById,
  createBook, updateBook, deleteBook, addReview, deleteReview,
} from '../controllers/bookController';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBookSchema, updateBookSchema, bookQuerySchema } from '../validators/bookValidators';
import { z } from 'zod';

const router = Router();

// Public
router.get('/', validate(bookQuerySchema, 'query'), getBooks);
router.get('/:slug', getBookBySlug);

// Admin
router.get('/admin/all', protect, restrictTo('admin', 'superadmin'), validate(bookQuerySchema, 'query'), getAdminBooks);
router.get('/admin/:id', protect, restrictTo('admin', 'superadmin'), getAdminBookById);
router.post('/', protect, restrictTo('admin', 'superadmin'), validate(createBookSchema), createBook);
router.patch('/:id', protect, restrictTo('admin', 'superadmin'), validate(updateBookSchema), updateBook);
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), deleteBook);
router.post(
  '/:id/reviews',
  protect,
  restrictTo('admin', 'superadmin'),
  validate(z.object({ name: z.string().min(1), rating: z.coerce.number().min(1).max(5), comment: z.string().min(1) })),
  addReview
);
router.delete('/:id/reviews/:reviewIndex', protect, restrictTo('admin', 'superadmin'), deleteReview);

export default router;
