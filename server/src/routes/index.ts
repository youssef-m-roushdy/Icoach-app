import { Router } from 'express';
import v1Routes from './v1/index.js';

const router = Router();

// API Versioning
router.use('/v1', v1Routes);

// Default to latest version (v1 for now)
router.use('/', v1Routes);

export default router;