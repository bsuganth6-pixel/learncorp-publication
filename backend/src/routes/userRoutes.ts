import { Router } from 'express';
import { listUsers, getUser, updateUserStatus, revokeUserSessions } from '../controllers/userController';
import { adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParamSchema, userQuerySchema, updateUserStatusSchema } from '../validators/userValidators';

const router = Router();

router.use(adminOnly);
router.get('/', validate(userQuerySchema, 'query'), listUsers);
router.get('/:id', validate(idParamSchema, 'params'), getUser);
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateUserStatusSchema), updateUserStatus);
router.post('/:id/revoke-sessions', validate(idParamSchema, 'params'), revokeUserSessions);

export default router;
