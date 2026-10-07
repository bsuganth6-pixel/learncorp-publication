import { Router } from 'express';
import authRoutes from './authRoutes';
import bookRoutes from './bookRoutes';
import authorRoutes from './authorRoutes';
import manuscriptRoutes from './manuscriptRoutes';
import contactRoutes from './contactRoutes';
import testimonialRoutes from './testimonialRoutes';
import dashboardRoutes from './dashboardRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/authors', authorRoutes);
router.use('/manuscripts', manuscriptRoutes);
router.use('/contact', contactRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
