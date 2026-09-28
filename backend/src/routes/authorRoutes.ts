import { Router } from 'express';
import {
  getAuthors, getAuthorBySlug, createAuthor, updateAuthor, deleteAuthor,
} from '../controllers/authorController';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAuthorSchema, updateAuthorSchema } from '../validators/authorValidators';

const router = Router();

router.get('/', getAuthors);
router.get('/:slug', getAuthorBySlug);

router.post('/', protect, restrictTo('admin', 'superadmin'), validate(createAuthorSchema), createAuthor);
router.patch('/:id', protect, restrictTo('admin', 'superadmin'), validate(updateAuthorSchema), updateAuthor);
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), deleteAuthor);

export default router;
