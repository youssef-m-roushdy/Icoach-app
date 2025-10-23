import { Router } from 'express';
import userRoutes from './userRoutes.js';

const router = Router();

// API Routes
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API info
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to iCoach API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      health: '/api/health',
    },
    documentation: '/api/docs', // Future implementation
  });
});

export default router;