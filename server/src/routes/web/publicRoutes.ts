// server/src/routes/web/publicRoutes.ts
import { Router } from 'express';
import { viewController } from '../../controllers/viewController.js';

const router = Router();

// ============= PASSWORD RESET ROUTES =============
// GET /reset-password/:token - Render reset form (from email link)
// Example: https://yourapp.com/reset-password/abc123token
router.get('/reset-password/:token', viewController.renderResetPassword);

// POST /reset-password/:token - Handle password reset submission
router.post('/reset-password/:token', viewController.handleResetPassword);

// ============= EMAIL VERIFICATION ROUTES =============
// GET /verify-email/:token - For email verification links
// Example: https://yourapp.com/verify-email/xyz789token
router.get('/verify-email/:token', viewController.renderEmailVerification);

export default router;