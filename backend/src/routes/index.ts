import { Router } from 'express';
import authRoutes from './authRoutes';
import bookRoutes from './bookRoutes';
import authorRoutes from './authorRoutes';
import manuscriptRoutes from './manuscriptRoutes';
import contactRoutes from './contactRoutes';
import testimonialRoutes from './testimonialRoutes';
import dashboardRoutes from './dashboardRoutes';
import statsRoutes from './statsRoutes';
import userRoutes from './userRoutes';
import auditRoutes from './auditRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/authors', authorRoutes);
router.use('/manuscripts', manuscriptRoutes);
router.use('/contact', contactRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/stats', statsRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationRoutes);

export default router;
