import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController';
import { adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditQuerySchema } from '../validators/userValidators';

const router = Router();

router.get('/', adminOnly, validate(auditQuerySchema, 'query'), listAuditLogs);

export default router;
