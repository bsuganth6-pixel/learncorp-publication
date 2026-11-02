import { Router } from 'express';
import {
  submitManuscript, getMyManuscripts, getMyManuscript, getMyManuscriptFileUrl, resubmitManuscript,
  getManuscripts, getManuscriptById, updateManuscriptStatus, publishManuscript, getManuscriptFileUrl, uploadCoverImage,
} from '../controllers/manuscriptController';
import { adminOnly, authorOnly, requireVerifiedEmail } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { formLimiter } from '../middleware/rateLimiter';
import { uploadManuscript, uploadImage } from '../middleware/upload';
import {
  submitManuscriptSchema, resubmitManuscriptSchema, updateManuscriptStatusSchema, publishManuscriptSchema,
  manuscriptQuerySchema, fileQuerySchema,
} from '../validators/manuscriptValidators';
import { idParamSchema } from '../validators/userValidators';

const router = Router();
const id = validate(idParamSchema, 'params');

// ---- Authors: their own submissions only. "/mine" is registered before "/:id" so it is never read as an id.
router.post('/', ...authorOnly, requireVerifiedEmail, formLimiter, uploadManuscript, validate(submitManuscriptSchema), submitManuscript);
router.get('/mine', ...authorOnly, validate(manuscriptQuerySchema, 'query'), getMyManuscripts);
router.get('/mine/:id', ...authorOnly, id, getMyManuscript);
router.get('/mine/:id/file-url', ...authorOnly, id, validate(fileQuerySchema, 'query'), getMyManuscriptFileUrl);
router.put('/mine/:id', ...authorOnly, requireVerifiedEmail, formLimiter, uploadManuscript, id, validate(resubmitManuscriptSchema), resubmitManuscript);

// ---- Admins: review, decide, publish
router.get('/', ...adminOnly, validate(manuscriptQuerySchema, 'query'), getManuscripts);
router.get('/:id', ...adminOnly, id, getManuscriptById);
router.patch('/:id/status', ...adminOnly, id, validate(updateManuscriptStatusSchema), updateManuscriptStatus);
router.post('/:id/publish', ...adminOnly, id, validate(publishManuscriptSchema), publishManuscript);
router.get('/:id/file-url', ...adminOnly, id, validate(fileQuerySchema, 'query'), getManuscriptFileUrl);

// Generic image upload used by admin book/author forms (cover art, headshots)
router.post('/uploads/image', ...adminOnly, uploadImage, uploadCoverImage);

export default router;
