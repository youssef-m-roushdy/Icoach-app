import { Router } from 'express';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import foodRoutes from './foodRoutes.js';
import workoutRoutes from './workoutRoutes.js';
import savedWorkoutRoutes from './savedWorkoutRoutes.js';
import workoutSessionRoutes from './workoutSessionRoutes.js';
import progressRoutes from './progressRoutes.js';
import dailyActivityRoutes from './dailyActivityRoutes.js';
import waterIntakeRoutes from './waterIntakeRoutes.js';
import workoutSessionSetRoutes from './workoutSessionSetRoutes.js';

const router = Router();

// Version 1 API Routes
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/foods', foodRoutes);
router.use('/workouts', workoutRoutes);
router.use('/saved-workouts', savedWorkoutRoutes);
router.use('/workout-sessions', workoutSessionRoutes);
router.use('/progress', progressRoutes);
router.use('/daily-active', dailyActivityRoutes);
router.use('/water-intake', waterIntakeRoutes);
router.use('/workout-sessions/:sessionId/sets', workoutSessionSetRoutes);

export default router;