import { Router } from 'express';
import { ChatHistoryController } from '../../controllers/chatHistoryController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateCreateMessage,
  validateChatHistoryQuery,
  validateUpdateMessage,
  validateGetMessageById,
  validateDeleteMessage,
  validateClearHistory,
  validateBatchCreateMessages,
  validateGetConversationContext,
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/chat-history:
 *   post:
 *     tags:
 *       - Chat History
 *     summary: Create a chat message
 *     description: Save a new chat message (user, assistant, or system)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - content
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, assistant, system]
 *                 description: Role of the message sender
 *               content:
 *                 type: string
 *                 description: Message content
 *     responses:
 *       201:
 *         description: Chat message saved successfully
 *       400:
 *         description: Invalid role or missing content
 */
router.post('/', validateCreateMessage, ChatHistoryController.createMessage);

/**
 * @swagger
 * /api/v1/chat-history:
 *   get:
 *     tags:
 *       - Chat History
 *     summary: Get chat history
 *     description: Retrieve paginated chat history with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, assistant, system]
 *         description: Filter by message role
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter messages from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter messages until this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in message content
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 */
router.get('/', validateChatHistoryQuery, ChatHistoryController.getChatHistory);

/**
 * @swagger
 * /api/v1/chat-history/batch:
 *   post:
 *     tags:
 *       - Chat History
 *     summary: Batch create messages
 *     description: Save multiple chat messages at once (useful for saving entire conversations)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - content
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     content:
 *                       type: string
 *     responses:
 *       201:
 *         description: Messages saved successfully
 *       400:
 *         description: Invalid messages array
 */
router.post('/batch', validateBatchCreateMessages, ChatHistoryController.batchCreateMessages);

/**
 * @swagger
 * /api/v1/chat-history/context:
 *   get:
 *     tags:
 *       - Chat History
 *     summary: Get conversation context
 *     description: Get last N messages in chronological order for AI context
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of recent messages to retrieve
 *     responses:
 *       200:
 *         description: Conversation context retrieved successfully
 */
router.get('/context', validateGetConversationContext, ChatHistoryController.getConversationContext);

/**
 * @swagger
 * /api/v1/chat-history/stats:
 *   get:
 *     tags:
 *       - Chat History
 *     summary: Get chat statistics
 *     description: Retrieve chat statistics for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat statistics retrieved successfully
 */
router.get('/stats', ChatHistoryController.getChatStats);

/**
 * @swagger
 * /api/v1/chat-history/{id}:
 *   get:
 *     tags:
 *       - Chat History
 *     summary: Get a chat message by ID
 *     description: Retrieve a specific chat message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Chat message retrieved successfully
 *       404:
 *         description: Chat message not found
 */
router.get('/:id', validateGetMessageById, ChatHistoryController.getMessageById);

/**
 * @swagger
 * /api/v1/chat-history/{id}:
 *   patch:
 *     tags:
 *       - Chat History
 *     summary: Update a chat message
 *     description: Update a user message (assistant and system messages cannot be updated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
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
 *                 description: Updated message content
 *     responses:
 *       200:
 *         description: Chat message updated successfully
 *       403:
 *         description: Only user messages can be updated
 *       404:
 *         description: Chat message not found
 */
router.patch('/:id', validateUpdateMessage, ChatHistoryController.updateMessage);

/**
 * @swagger
 * /api/v1/chat-history/{id}:
 *   delete:
 *     tags:
 *       - Chat History
 *     summary: Delete a chat message
 *     description: Delete a specific chat message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Chat message deleted successfully
 *       404:
 *         description: Chat message not found
 */
router.delete('/:id', validateDeleteMessage, ChatHistoryController.deleteMessage);

/**
 * @swagger
 * /api/v1/chat-history/clear/all:
 *   delete:
 *     tags:
 *       - Chat History
 *     summary: Clear chat history
 *     description: Delete all or partial chat history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: beforeDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Only clear messages before this date
 *     responses:
 *       200:
 *         description: Chat history cleared successfully
 */
router.delete('/clear/all', validateClearHistory, ChatHistoryController.clearHistory);

export default router;