import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

// ============================================================================
// Chat Participant Validations (Normalized Schema)
// ============================================================================

/**
 * Create Chat Participant Validation (Add Member)
 * Permission: Only Admin & Owner can add members
 */
export const validateCreateChatParticipant = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating a chat participant'),
  
  body('conversationId')
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isInt({ min: 1 })
    .withMessage('Conversation ID must be a positive integer')
    .toInt(),
  
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt(),
  
  body('role')
    .optional()
    .isIn(['member', 'admin', 'owner'])
    .withMessage('Role must be one of: member, admin, owner')
    .custom((value) => {
      if (value === 'owner') {
        throw new Error('Cannot assign owner role directly. Use transfer ownership endpoint');
      }
      return true;
    }),
];

/**
 * Update Chat Participant Validation
 * Permission: Only Owner can change roles
 */
export const validateUpdateChatParticipant = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID')
    .toInt(),
  
  body('role')
    .optional()
    .isIn(['member', 'admin', 'owner'])
    .withMessage('Role must be one of: member, admin, owner'),
  
  body('lastReadAt')
    .optional()
    .isISO8601()
    .withMessage('lastReadAt must be a valid date')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        if (date > now) {
          throw new Error('lastReadAt cannot be in the future');
        }
      }
      return true;
    }),
];

/**
 * Remove Chat Participant Validation (Leave Group)
 * Permission: Members can remove themselves, Admin can remove members, Owner can remove anyone
 */
export const validateRemoveChatParticipant = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID')
    .toInt(),
];

/**
 * Delete Chat Participant Validation (Hard Delete)
 * Permission: Only Owner
 */
export const validateDeleteChatParticipant = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID')
    .toInt(),
];

/**
 * Get Chat Participant By ID Validation
 */
export const validateGetChatParticipantById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID')
    .toInt(),
];

/**
 * Chat Participant Query Validation
 * Supports filtering by:
 * - Conversation ID
 * - Role
 * - Active status
 * - Search by user
 */
export const validateGetChatParticipants = [
  // Pagination
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  // Filters
  query('conversationId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Conversation ID must be a positive integer')
    .toInt(),
  
  query('role')
    .optional()
    .isIn(['member', 'admin', 'owner'])
    .withMessage('Role must be one of: member, admin, owner'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean(),
  
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
];

/**
 * Update Last Read Validation
 */
export const validateUpdateLastRead = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),
];

/**
 * Get Participants By Conversation Validation
 */
export const validateGetParticipantsByConversation = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),
  
  query('role')
    .optional()
    .isIn(['member', 'admin', 'owner'])
    .withMessage('Role must be one of: member, admin, owner'),
  
  query('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean')
    .toBoolean(),
];

/**
 * Bulk Add Participants Validation
 */
export const validateBulkAddParticipants = [
  body('conversationId')
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isInt({ min: 1 })
    .withMessage('Conversation ID must be a positive integer')
    .toInt(),
  
  body('userIds')
    .notEmpty()
    .withMessage('User IDs array is required')
    .isArray({ min: 1, max: 50 })
    .withMessage('User IDs must be an array with 1-50 items'),
  
  body('userIds.*')
    .isInt({ min: 1 })
    .withMessage('Each user ID must be a positive integer')
    .toInt(),
  
  body('role')
    .optional()
    .isIn(['member', 'admin'])
    .withMessage('Role must be member or admin')
    .custom((value) => {
      if (value === 'owner') {
        throw new Error('Cannot assign owner role in bulk operation. Use transfer ownership endpoint');
      }
      return true;
    }),
];

/**
 * Get Conversation Participant Stats Validation
 */
export const validateGetConversationParticipantStats = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),
  
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
    .toInt(),
];

/**
 * Transfer Ownership Validation
 */
export const validateTransferOwnership = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),
  
  body('newOwnerId')
    .notEmpty()
    .withMessage('New owner ID is required')
    .isInt({ min: 1 })
    .withMessage('New owner ID must be a positive integer')
    .toInt()
    .custom((value, { req }) => {
      const user = (req as any).user;
      if (user && user.id === value) {
        throw new Error('Cannot transfer ownership to yourself');
      }
      return true;
    }),
];

// ============================================================================
// Reusable Validations
// ============================================================================

/**
 * Participant ID Param Validation (Reusable)
 */
export const validateParticipantId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID')
    .toInt(),
];

/**
 * Conversation ID Param Validation (Reusable)
 */
export const validateConversationId = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),
];

/**
 * Validate that user is not adding themselves
 */
export const validateNotSelfAdd = [
  body('userId')
    .custom((value, { req }) => {
      const user = (req as any).user;
      if (user && user.id === value) {
        throw new Error('You cannot add yourself as a participant');
      }
      return true;
    }),
];

// ============================================================================
// Combined Validations for Common Operations
// ============================================================================

/**
 * Complete validation for creating a participant with all checks
 * FLATTENED - using spread operator to combine arrays
 */
export const validateCreateParticipantFull = [
  ...validateCreateChatParticipant,
  ...validateNotSelfAdd,
  handleValidationErrors,
];

/**
 * Complete validation for bulk adding participants with all checks
 * FLATTENED - using spread operator to combine arrays
 */
export const validateBulkAddParticipantsFull = [
  ...validateBulkAddParticipants,
  body('userIds')
    .custom((value, { req }) => {
      const user = (req as any).user;
      if (user && value.includes(user.id)) {
        throw new Error('You cannot add yourself as a participant');
      }
      return true;
    }),
  handleValidationErrors,
];

// ============================================================================
// Individual validations with error handling
// ============================================================================

export const validateGetChatParticipantsWithErrors = [
  ...validateGetChatParticipants,
  handleValidationErrors,
];

export const validateGetChatParticipantByIdWithErrors = [
  ...validateGetChatParticipantById,
  handleValidationErrors,
];

export const validateUpdateChatParticipantWithErrors = [
  ...validateUpdateChatParticipant,
  handleValidationErrors,
];

export const validateRemoveChatParticipantWithErrors = [
  ...validateRemoveChatParticipant,
  handleValidationErrors,
];

export const validateDeleteChatParticipantWithErrors = [
  ...validateDeleteChatParticipant,
  handleValidationErrors,
];

export const validateUpdateLastReadWithErrors = [
  ...validateUpdateLastRead,
  handleValidationErrors,
];

export const validateGetParticipantsByConversationWithErrors = [
  ...validateGetParticipantsByConversation,
  handleValidationErrors,
];

export const validateGetConversationParticipantStatsWithErrors = [
  ...validateGetConversationParticipantStats,
  handleValidationErrors,
];

export const validateTransferOwnershipWithErrors = [
  ...validateTransferOwnership,
  handleValidationErrors,
];