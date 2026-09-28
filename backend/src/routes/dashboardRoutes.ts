import { Router } from 'express';
import { getStats } from '../controllers/dashboardController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

router.get('/stats', protect, restrictTo('admin', 'superadmin'), getStats);

export default router;
