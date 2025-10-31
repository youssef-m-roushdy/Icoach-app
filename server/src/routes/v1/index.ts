import { Router } from 'express';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';

const router = Router();

// Version 1 API Routes
router.use('/users', userRoutes);
router.use('/auth', authRoutes);

export default router;