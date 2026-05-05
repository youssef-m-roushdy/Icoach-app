import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getPresence } from '../../controllers/presenceController.js';
import { validatePresenceQuery } from '../../middleware/validations/index.js';

const router = Router();

router.use(authenticate);

router.get('/', validatePresenceQuery, getPresence);

export default router;
