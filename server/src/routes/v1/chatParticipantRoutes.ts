import { Router } from 'express';
import {
  getChatParticipants,
  getChatParticipantById,
  createChatParticipant,
  updateChatParticipant,
  removeChatParticipant,
  deleteChatParticipant,
  updateLastRead,
  getParticipantsByConversation,
  bulkAddParticipants,
  getConversationParticipantStats,
  transferOwnership,
} from '../../controllers/chatParticipantController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateGetChatParticipants,
  validateGetChatParticipantById,
  validateCreateParticipantFull,
  validateUpdateChatParticipant,
  validateRemoveChatParticipant,
  validateDeleteChatParticipant,
  validateUpdateLastRead,
  validateGetParticipantsByConversation,
  validateBulkAddParticipantsFull,
  validateGetConversationParticipantStats,
  validateTransferOwnership,
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Chat Participants
 *   description: Chat participant management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatParticipant:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         conversationId:
 *           type: integer
 *           example: 5
 *         userId:
 *           type: integer
 *           example: 42
 *         role:
 *           type: string
 *           enum: [member, admin, owner]
 *           example: member
 *         lastReadAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         leftAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             avatarUrl:
 *               type: string
 *         conversation:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             type:
 *               type: string
 *               enum: [direct, group]
 *             isArchived:
 *               type: boolean
 */

/**
 * @swagger
 * /api/v1/chat-participants:
 *   get:
 *     tags:
 *       - Chat Participants
 *     summary: Get all chat participants
 *     description: Retrieve a paginated list of chat participants with filtering options
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
 *         name: conversationId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [member, admin, owner]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat participants retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/', validateGetChatParticipants, getChatParticipants);

/**
 * @swagger
 * /api/v1/chat-participants/{id}:
 *   get:
 *     tags:
 *       - Chat Participants
 *     summary: Get a chat participant by ID
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
 *         description: Chat participant retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Chat participant not found
 */
router.get('/:id', validateGetChatParticipantById, getChatParticipantById);

/**
 * @swagger
 * /api/v1/chat-participants:
 *   post:
 *     tags:
 *       - Chat Participants
 *     summary: Add a participant to a conversation
 *     description: Admin can add members, Owner can add members and admins
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - userId
 *             properties:
 *               conversationId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 *                 enum: [member, admin]
 *                 default: member
 *     responses:
 *       201:
 *         description: Participant added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: You do not have permission to add participants
 *       404:
 *         description: Conversation or user not found
 *       409:
 *         description: User is already a participant
 */
router.post('/', validateCreateParticipantFull, createChatParticipant);

/**
 * @swagger
 * /api/v1/chat-participants/{id}:
 *   put:
 *     tags:
 *       - Chat Participants
 *     summary: Update a chat participant
 *     description: Only Owner can change roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [member, admin, owner]
 *               lastReadAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Participant updated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: You do not have permission to change roles
 *       404:
 *         description: Participant not found
 */
router.put('/:id', validateUpdateChatParticipant, updateChatParticipant);

/**
 * @swagger
 * /api/v1/chat-participants/{id}/leave:
 *   patch:
 *     tags:
 *       - Chat Participants
 *     summary: Leave a conversation (soft delete)
 *     description: |
 *       Members can leave themselves.
 *       Admins can remove members.
 *       Owners can remove anyone (except the only owner).
 *       If owner leaves, ownership transfers to next admin or oldest member.
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
 *         description: Participant removed successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: You do not have permission to remove this participant
 *       404:
 *         description: Participant not found
 */
router.patch('/:id/leave', validateRemoveChatParticipant, removeChatParticipant);

/**
 * @swagger
 * /api/v1/chat-participants/{id}:
 *   delete:
 *     tags:
 *       - Chat Participants
 *     summary: Permanently delete a participant
 *     description: Only Owner can permanently delete participants
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
 *         description: Participant permanently deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only conversation owners can permanently delete participants
 *       404:
 *         description: Participant not found
 */
router.delete('/:id', validateDeleteChatParticipant, deleteChatParticipant);

/**
 * @swagger
 * /api/v1/chat-participants/conversations/{conversationId}/read:
 *   patch:
 *     tags:
 *       - Chat Participants
 *     summary: Update last read timestamp
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Last read timestamp updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: You are not a participant in this conversation
 */
router.patch(
  '/conversations/:conversationId/read',
  validateUpdateLastRead,
  updateLastRead
);

/**
 * @swagger
 * /api/v1/chat-participants/conversations/{conversationId}:
 *   get:
 *     tags:
 *       - Chat Participants
 *     summary: Get participants by conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [member, admin, owner]
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Participants retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: You are not a participant in this conversation
 */
router.get(
  '/conversations/:conversationId',
  validateGetParticipantsByConversation,
  getParticipantsByConversation
);

/**
 * @swagger
 * /api/v1/chat-participants/bulk:
 *   post:
 *     tags:
 *       - Chat Participants
 *     summary: Bulk add participants to a conversation
 *     description: Admin can add members, Owner can add members and admins. Max 50 users per request.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - userIds
 *             properties:
 *               conversationId:
 *                 type: integer
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *                 maxItems: 50
 *               role:
 *                 type: string
 *                 enum: [member, admin]
 *                 default: member
 *     responses:
 *       201:
 *         description: Bulk participant operation completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: You do not have permission to add participants
 *       404:
 *         description: Conversation or one or more users not found
 */
router.post('/bulk', validateBulkAddParticipantsFull, bulkAddParticipants);

/**
 * @swagger
 * /api/v1/chat-participants/conversations/{conversationId}/stats:
 *   get:
 *     tags:
 *       - Chat Participants
 *     summary: Get conversation participant statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: You are not a participant in this conversation
 */
router.get(
  '/conversations/:conversationId/stats',
  validateGetConversationParticipantStats,
  getConversationParticipantStats
);

/**
 * @swagger
 * /api/v1/chat-participants/conversations/{conversationId}/transfer-ownership:
 *   post:
 *     tags:
 *       - Chat Participants
 *     summary: Transfer conversation ownership
 *     description: Only Owner can transfer ownership. New owner must be an active participant.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOwnerId
 *             properties:
 *               newOwnerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only the conversation owner can transfer ownership
 *       404:
 *         description: Conversation or new owner not found
 */
router.post(
  '/conversations/:conversationId/transfer-ownership',
  validateTransferOwnership,
  transferOwnership
);

export default router;