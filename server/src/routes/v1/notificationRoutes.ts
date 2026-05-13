// routes/notificationRoutes.ts
import { Router } from 'express';
import {
  registerExpoToken,
  getUserExpoTokens,
  removeExpoToken,
  updateExpoToken,
} from '../../controllers/notificationController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateRegisterExpoToken,
  validateRemoveExpoToken,
  validateUpdateExpoToken,
} from '../../middleware/validations/index.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Push notification token management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpoToken:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 123
 *         token:
 *           type: string
 *           example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *         provider:
 *           type: string
 *           enum: [expo, fcm]
 *           example: "expo"
 *         deviceType:
 *           type: string
 *           enum: [ios, android, web]
 *           example: "ios"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-09T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-09T10:30:00.000Z"
 *     
 *     RegisterExpoTokenRequest:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Expo push notification token from device
 *           example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *         provider:
 *           type: string
 *           enum: [expo, fcm]
 *           description: Token provider (Expo or FCM)
 *           example: "expo"
 *         deviceType:
 *           type: string
 *           enum: [ios, android, web]
 *           description: Device platform type
 *           example: "ios"
 *     
 *     UpdateExpoTokenRequest:
 *       type: object
 *       properties:
 *         deviceType:
 *           type: string
 *           enum: [ios, android, web]
 *           description: Updated device platform type
 *           example: "android"
 */

/**
 * @swagger
 * /api/v1/notifications/expo-tokens:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Register or update Expo push token
 *     description: |
 *       Register a new Expo push token for the authenticated user, or update
 *       an existing token's device type. This endpoint is called:
 *       - When user logs in
 *       - When Expo generates a new push token
 *       - When device type changes
 *       
 *       **Behavior:**
 *       - If token exists for current user → update device type
 *       - If token exists for different user → reassign to current user
 *       - If token doesn't exist → create new record
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterExpoTokenRequest'
 *     responses:
 *       201:
 *         description: Token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ExpoToken'
 *                 message:
 *                   type: string
 *                   example: "Token registered successfully"
 *       200:
 *         description: Token updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ExpoToken'
 *                 message:
 *                   type: string
 *                   example: "Token updated successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.post('/expo-tokens', validateRegisterExpoToken, registerExpoToken);

/**
 * @swagger
 * /api/v1/notifications/expo-tokens:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get all Expo push tokens for authenticated user
 *     description: |
 *       Retrieve all registered Expo push tokens for the currently authenticated user.
 *       Useful for:
 *       - Viewing which devices are registered
 *       - Managing multiple device tokens
 *       - Cleanup operations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tokens retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExpoToken'
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/expo-tokens', getUserExpoTokens);

/**
 * @swagger
 * /api/v1/notifications/expo-tokens/{expoPushToken}:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: Update Expo push token device type
 *     description: |
 *       Update the device type for a specific Expo push token.
 *       Only the token owner can update it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expoPushToken
 *         required: true
 *         schema:
 *           type: string
 *         description: The Expo push token string (URL-encoded)
 *         example: "ExponentPushToken%5Bxxxxxxxxxxxxxxxxxxxxxx%5D"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateExpoTokenRequest'
 *     responses:
 *       200:
 *         description: Token updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ExpoToken'
 *                 message:
 *                   type: string
 *                   example: "Token updated successfully"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Not authorized to update this token
 *       404:
 *         description: Token not found
 */
router.put('/expo-tokens/:expoPushToken', validateUpdateExpoToken, updateExpoToken);

/**
 * @swagger
 * /api/v1/notifications/expo-tokens/{expoPushToken}:
 *   delete:
 *     tags:
 *       - Notifications
 *     summary: Remove an Expo push token
 *     description: |
 *       Remove a specific Expo push token. This is called when:
 *       - User logs out
 *       - User uninstalls the app
 *       - User switches accounts
 *       
 *       Only the token owner can remove it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expoPushToken
 *         required: true
 *         schema:
 *           type: string
 *         description: The Expo push token string (URL-encoded)
 *         example: "ExponentPushToken%5Bxxxxxxxxxxxxxxxxxxxxxx%5D"
 *     responses:
 *       200:
 *         description: Token removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token removed successfully"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Not authorized to remove this token
 *       404:
 *         description: Token not found
 */
router.delete('/expo-tokens/:expoPushToken', validateRemoveExpoToken, removeExpoToken);

export default router;