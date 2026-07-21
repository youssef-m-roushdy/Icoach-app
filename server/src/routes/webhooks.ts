// src/routes/webhooks.ts
import { Router } from 'express';
import { handleSubscriptionWebhook, handlePaymentWebhook } from '../controllers/paymentWebhookController.js';

const router = Router();
router.post('/payment/subscription-updated', handleSubscriptionWebhook);
router.post('/payment/payment-updated', handlePaymentWebhook);

export default router;