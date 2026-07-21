import { Router } from 'express';
import { PaymentController } from '../../controllers/PaymentController.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validateCreatePayment, validatePaymentIdParam } from '../../middleware/validations/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create a one-off payment checkout
 *     description: |
 *       Creates a payment checkout session for a one-off purchase (protein, gym accessories, etc.) via PaymentService.
 *       **Authentication required** - Users must be signed in to make a payment.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *               - currency
 *               - gateway
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "order-999"
 *               amount:
 *                 type: number
 *                 example: 49.99
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               gateway:
 *                 type: string
 *                 enum: [Stripe, Paymob, PayPal]
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       502:
 *         description: PaymentService request failed
 */
router.post('/', authenticate, validateCreatePayment, asyncHandler(PaymentController.createPayment));

/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Payment not found
 */
router.get('/:paymentId', authenticate, validatePaymentIdParam, asyncHandler(PaymentController.getPayment));

/**
 * @swagger
 * /api/v1/payments/{paymentId}/status:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment status only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/:paymentId/status', authenticate, validatePaymentIdParam, asyncHandler(PaymentController.getPaymentStatus));

/**
 * @swagger
 * /api/v1/payments/{paymentId}/refund:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Request a refund
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund processed
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.post('/:paymentId/refund', authenticate, validatePaymentIdParam, asyncHandler(PaymentController.refundPayment));

export default router;