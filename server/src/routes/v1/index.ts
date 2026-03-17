import { Router } from 'express';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import foodRoutes from './foodRoutes.js';
import workoutRoutes from './workoutRoutes.js';
import savedWorkoutRoutes from './savedWorkoutRoutes.js';
import workoutSessionRoutes from './workoutSessionRoutes.js';

const router = Router();

// Version 1 API Routes
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/foods', foodRoutes);
router.use('/workouts', workoutRoutes);
router.use('/saved-workouts', savedWorkoutRoutes);
router.use('/workout-sessions', workoutSessionRoutes); // Add this

export default router;