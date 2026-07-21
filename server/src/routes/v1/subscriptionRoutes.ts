import { Router } from 'express';
import { SubscriptionController } from '../../controllers/subscriptionController.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validateCreateSubscription } from '../../middleware/validations/index.js';

const router = Router();

// ============================================
// SUBSCRIPTION ROUTES - Authentication required
// ============================================

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     tags:
 *       - Subscriptions
 *     summary: Start a new subscription checkout
 *     description: |
 *       Creates a new app or coach subscription checkout session via PaymentService.
 *       **Authentication required** - Users must be signed in to subscribe.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *               - gateway
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [AppMonthly, AppYearly, CoachMonthly, CoachYearly]
 *                 example: "AppMonthly"
 *               gateway:
 *                 type: string
 *                 enum: [Stripe, Paymob, PayPal]
 *                 example: "Stripe"
 *               coachId:
 *                 type: integer
 *                 nullable: true
 *                 description: Required when planType is CoachMonthly or CoachYearly
 *                 example: 42
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: string
 *                     checkoutUrl:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       502:
 *         description: PaymentService request failed
 */
router.post('/', authenticate, validateCreateSubscription, asyncHandler(SubscriptionController.subscribeToApp));

/**
 * @swagger
 * /api/v1/subscriptions/{subscriptionId}:
 *   delete:
 *     tags:
 *       - Subscriptions
 *     summary: Cancel a subscription
 *     description: |
 *       Cancels an existing subscription via PaymentService.
 *       **Authentication required** - Users must be signed in to cancel a subscription.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription GUID (as returned by PaymentService)
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Subscription not found
 *       502:
 *         description: PaymentService request failed
 */
router.delete('/:subscriptionId', authenticate, asyncHandler(SubscriptionController.cancelSubscription));

/**
 * @swagger
 * /api/v1/subscriptions/me:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Get my subscription status
 *     description: |
 *       Retrieve the authenticated user's current subscription status directly from PaymentService.
 *       **Authentication required** - Users must be signed in to check their subscription.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isActive:
 *                       type: boolean
 *                     planType:
 *                       type: string
 *                     currentPeriodEnd:
 *                       type: string
 *                       format: date-time
 *                     coachId:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: No active subscription found
 *       502:
 *         description: PaymentService request failed
 */
router.get('/me', authenticate, asyncHandler(SubscriptionController.getMySubscriptionStatus));

export default router;