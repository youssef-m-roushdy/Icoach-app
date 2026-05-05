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

router.get('/', validateGetConversations, listConversations);
router.post('/', validateCreateConversation, createConversation);
router.get('/:id/messages', validateConversationIdParam, validateGetConversationMessages, getMessages);
router.post('/:id/messages', validateConversationIdParam, validateSendConversationMessage, sendMessage);
router.post('/:id/read', validateConversationIdParam, validateMarkConversationRead, markConversationRead);

export default router;
