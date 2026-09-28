import { Router } from 'express';
import {
  submitManuscript, getManuscripts, getManuscriptById,
  updateManuscriptStatus, getManuscriptFileUrl, uploadCoverImage,
} from '../controllers/manuscriptController';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { formLimiter } from '../middleware/rateLimiter';
import { uploadManuscript, uploadImage } from '../middleware/upload';
import { submitManuscriptSchema, updateManuscriptStatusSchema } from '../validators/manuscriptValidators';

const router = Router();

router.post('/', formLimiter, uploadManuscript, validate(submitManuscriptSchema), submitManuscript);

router.get('/', protect, restrictTo('admin', 'superadmin'), getManuscripts);
router.get('/:id', protect, restrictTo('admin', 'superadmin'), getManuscriptById);
router.patch('/:id/status', protect, restrictTo('admin', 'superadmin'), validate(updateManuscriptStatusSchema), updateManuscriptStatus);
router.get('/:id/file-url', protect, restrictTo('admin', 'superadmin'), getManuscriptFileUrl);

// Generic image upload used by admin book/author forms (cover art, headshots)
router.post('/uploads/image', protect, restrictTo('admin', 'superadmin'), uploadImage, uploadCoverImage);

export default router;
