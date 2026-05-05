import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

export const validateCreateConversation = [
  body('participantId')
    .isInt({ min: 1 })
    .withMessage('Valid participantId is required')
    .toInt(),

  handleValidationErrors,
];

export const validateGetConversations = [
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

  handleValidationErrors,
];

export const validateConversationIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid conversation id is required')
    .toInt(),

  handleValidationErrors,
];

export const validateGetConversationMessages = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('before')
    .optional()
    .isISO8601()
    .withMessage('before must be a valid ISO 8601 date'),

  handleValidationErrors,
];

export const validateSendConversationMessage = [
  body('content')
    .isString()
    .withMessage('Content must be a string')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters'),

  handleValidationErrors,
];

export const validateMarkConversationRead = [
  body('lastReadAt')
    .optional()
    .isISO8601()
    .withMessage('lastReadAt must be a valid ISO 8601 date'),

  handleValidationErrors,
];

export const validatePresenceQuery = [
  query('userIds')
    .notEmpty()
    .withMessage('userIds query parameter is required')
    .isString()
    .withMessage('userIds must be a comma-separated string'),

  handleValidationErrors,
];
