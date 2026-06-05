import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createConversation,
  listConversations,
  getMessages,
  sendMessage,
  markConversationRead,
} from '../../controllers/conversationController.js';
import {
  validateCreateConversation,
  validateGetConversations,
  validateConversationIdParam,
  validateGetConversationMessages,
  validateSendConversationMessage,
  validateMarkConversationRead,
} from '../../middleware/validations/index.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: List user conversations
 *     description: Retrieve paginated list of conversations for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Items per page (max 100)
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Conversation ID
 *                       participantId:
 *                         type: integer
 *                         description: ID of the other participant
 *                       lastMessage:
 *                         type: string
 *                         description: Last message content
 *                       lastMessageAt:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp of last message
 *                       unreadCount:
 *                         type: integer
 *                         description: Number of unread messages
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/', validateGetConversations, listConversations);

/**
 * @swagger
 * /api/v1/conversations:
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Create a new conversation
 *     description: Start a new conversation with another user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *             properties:
 *               participantId:
 *                 type: integer
 *                 minimum: 1
 *                 description: ID of the user to start conversation with
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: Conversation ID
 *                 participantId:
 *                   type: integer
 *                   description: ID of the other participant
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid participant ID
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conversation already exists with this user
 */
router.post('/', validateCreateConversation, createConversation);

/**
 * @swagger
 * /api/v1/conversations/{id}/messages:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get conversation messages
 *     description: Retrieve messages from a specific conversation with pagination support
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Conversation ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of messages to retrieve (max 100)
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp (for pagination)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Message ID
 *                       conversationId:
 *                         type: integer
 *                         description: Conversation ID
 *                       senderId:
 *                         type: integer
 *                         description: ID of the message sender
 *                       content:
 *                         type: string
 *                         description: Message content
 *                       isRead:
 *                         type: boolean
 *                         description: Whether message has been read
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 hasMore:
 *                   type: boolean
 *                   description: Whether there are more messages
 *                 nextBefore:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp for next page
 *       400:
 *         description: Invalid conversation ID or query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this conversation
 *       404:
 *         description: Conversation not found
 */
router.get('/:id/messages', validateConversationIdParam, validateGetConversationMessages, getMessages);

/**
 * @swagger
 * /api/v1/conversations/{id}/messages:
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Send a message
 *     description: Send a new message in an existing conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Message content
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: Message ID
 *                 conversationId:
 *                   type: integer
 *                 senderId:
 *                   type: integer
 *                 content:
 *                   type: string
 *                 isRead:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid conversation ID or message content
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this conversation
 *       404:
 *         description: Conversation not found
 */
router.post('/:id/messages', validateConversationIdParam, validateSendConversationMessage, sendMessage);

/**
 * @swagger
 * /api/v1/conversations/{id}/read:
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Mark conversation as read
 *     description: Mark all messages in a conversation as read or specify a custom last read timestamp
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Conversation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lastReadAt:
 *                 type: string
 *                 format: date-time
 *                 description: Custom timestamp to mark messages as read up to this point
 *     responses:
 *       200:
 *         description: Conversation marked as read successfully
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
 *                   example: Conversation marked as read
 *                 conversationId:
 *                   type: integer
 *                 lastReadAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid conversation ID or lastReadAt format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this conversation
 *       404:
 *         description: Conversation not found
 */
router.post('/:id/read', validateConversationIdParam, validateMarkConversationRead, markConversationRead);

export default router;