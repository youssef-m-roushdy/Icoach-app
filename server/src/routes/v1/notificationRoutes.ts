import { Router } from 'express';
import {
  registerExpoToken,
  getUserExpoTokens,
  removeExpoToken,
  updateExpoToken,
} from '../../controllers/expoTokenController.js';
import {
  getUserNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createNotification,
  getNotificationsByType,
  sendTestNotification,
} from '../../controllers/notificationController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  validateRegisterExpoToken,
  validateRemoveExpoToken,
  validateUpdateExpoToken,
  validateCreateNotification,
  validateGetUserNotifications,
  validateGetNotificationById,
  validateMarkAsRead,
  validateDeleteNotification,
  validateGetNotificationsByType,
  validateSendTestNotification,
  validateMarkAllAsRead,
  validateDeleteReadNotifications,
  validateGetUnreadCount,
} from '../../middleware/validations/index.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Push notification token management and in-app notifications
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
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 123
 *         type:
 *           type: string
 *           enum: [like, comment, follow, system, reminder, achievement, workout_reminder, meal_reminder, friend_request, friend_accept, mention, share, badge_earned, level_up, personal_best, workout_completed, plan_recommendation]
 *           example: "system"
 *         title:
 *           type: string
 *           example: "Welcome to the app!"
 *         content:
 *           type: string
 *           nullable: true
 *           example: "We're excited to have you on board"
 *         data:
 *           type: object
 *           nullable: true
 *         isRead:
 *           type: boolean
 *           default: false
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         formattedTime:
 *           type: string
 *           example: "2 hours ago"
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
 */

// ============================================
// EXPO TOKEN MANAGEMENT ROUTES
// ============================================

/**
 * @swagger
 * /api/v1/notifications/expo-tokens:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Register or update Expo push token
 *     description: |
 *       Register a new Expo push token for the authenticated user.
 *       Called when user logs in or when a new token is generated.
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
 *       200:
 *         description: Token updated successfully
 *       400:
 *         description: Validation error
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tokens retrieved successfully
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
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expoPushToken
 *         required: true
 *         schema:
 *           type: string
 *         description: The Expo push token string (URL-encoded)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceType:
 *                 type: string
 *                 enum: [ios, android, web]
 *     responses:
 *       200:
 *         description: Token updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized
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
 *       Remove a specific Expo push token. Called when user logs out.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expoPushToken
 *         required: true
 *         schema:
 *           type: string
 *         description: The Expo push token string (URL-encoded)
 *     responses:
 *       200:
 *         description: Token removed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized
 *       404:
 *         description: Token not found
 */
router.delete('/expo-tokens/:expoPushToken', validateRemoveExpoToken, removeExpoToken);

// ============================================
// IN-APP NOTIFICATION ROUTES
// ============================================

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get all notifications for authenticated user
 *     description: |
 *       Retrieve paginated list of user notifications with optional filters.
 *       Returns unread count in response for badge display.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Show only unread notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/', validateGetUserNotifications, asyncHandler(getUserNotifications));

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get unread notification count
 *     description: |
 *       Get the number of unread notifications for the authenticated user.
 *       Used for displaying the red badge on the notification icon.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/unread-count', validateGetUnreadCount, asyncHandler(getUnreadCount));

/**
 * @swagger
 * /api/v1/notifications/type/{type}:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notifications by type
 *     description: |
 *       Retrieve notifications filtered by type.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Invalid notification type
 */
router.get('/type/:type', validateGetNotificationsByType, asyncHandler(getNotificationsByType));

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notification by ID
 *     description: |
 *       Retrieve a specific notification by its ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Notification not found
 */
router.get('/:id', validateGetNotificationById, asyncHandler(getNotificationById));

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark a notification as read
 *     description: |
 *       Mark a specific notification as read.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', validateMarkAsRead, asyncHandler(markAsRead));

/**
 * @swagger
 * /api/v1/notifications/mark-all-read:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark all notifications as read
 *     description: |
 *       Mark all unread notifications for the authenticated user as read.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
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
 *                     updatedCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.patch('/mark-all-read', validateMarkAllAsRead, asyncHandler(markAllAsRead));

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     tags:
 *       - Notifications
 *     summary: Delete a notification (soft delete)
 *     description: |
 *       Soft delete a specific notification.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Notification not found
 */
router.delete('/:id', validateDeleteNotification, asyncHandler(deleteNotification));

/**
 * @swagger
 * /api/v1/notifications/delete-read:
 *   delete:
 *     tags:
 *       - Notifications
 *     summary: Delete all read notifications
 *     description: |
 *       Permanently delete all read notifications for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Read notifications deleted successfully
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
 *                     deletedCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.delete('/delete-read', validateDeleteReadNotifications, asyncHandler(deleteReadNotifications));

// ============================================
// ADMIN ONLY ROUTES
// ============================================

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Create a new notification (Admin only)
 *     description: |
 *       Create a new notification for a user. Sends push notification if user has registered tokens.
 *       **Admin authentication required** - Only admin users can create notifications.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *               - title
 *             properties:
 *               userId:
 *                 type: integer
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 */
router.post('/', authenticate, authorize('admin'), validateCreateNotification, asyncHandler(createNotification));

/**
 * @swagger
 * /api/v1/notifications/test:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Send test notification (Admin only)
 *     description: |
 *       Send a test notification to the authenticated user for debugging.
 *       **Admin authentication required** - Only admin users can send test notifications.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 default: "Test Notification"
 *               body:
 *                 type: string
 *                 default: "This is a test notification"
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post('/test', authenticate, authorize('admin'), validateSendTestNotification, asyncHandler(sendTestNotification));

export default router;