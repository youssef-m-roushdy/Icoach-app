import { Router } from 'express';
import v1Routes from './v1/index.js';

const router = Router();

// API Versioning
router.use('/v1', v1Routes);

export default router;