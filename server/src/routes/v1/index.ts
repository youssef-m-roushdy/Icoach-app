import { Router } from 'express';
import userRoutes from './userRoutes.js';

const router = Router();

// Version 1 API Routes
router.use('/users', userRoutes);

export default router;