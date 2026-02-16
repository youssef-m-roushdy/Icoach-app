import { Router } from 'express';
import v1Routes from './v1/index.js';
import authRoutes from './web/authRoutes.js';

const router = Router();

// API Versioning
router.use('/v1', v1Routes);
router.use('/', authRoutes);


export default router;