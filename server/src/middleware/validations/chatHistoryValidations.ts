import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Chat Message Validation
 */
export const validateCreateMessage = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Role must be user, assistant, or system'),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isString()
    .withMessage('Content must be a string')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),
  
  handleValidationErrors,
];

/**
 * Get Chat History Query Validation
 */
export const validateChatHistoryQuery = [
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
  
  query('role')
    .optional()
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Role must be user, assistant, or system'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .custom((value) => {
      if (!value) return true;
      
      const date = new Date(value);
      const maxPastDate = new Date();
      maxPastDate.setFullYear(maxPastDate.getFullYear() - 1);
      
      if (date < maxPastDate) {
        throw new Error('startDate cannot be more than 1 year in the past');
      }
      
      return true;
    }),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (!value) return true;
      
      const endDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (endDate > today) {
        throw new Error('endDate cannot be in the future');
      }
      
      if (req.query?.startDate) {
        const startDate = new Date(req.query.startDate as string);
        if (endDate < startDate) {
          throw new Error('endDate must be after startDate');
        }
        
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 90) {
          throw new Error('Date range cannot exceed 90 days');
        }
      }
      
      return true;
    }),
  
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),
  
  handleValidationErrors,
];

/**
 * Update Chat Message Validation
 */
export const validateUpdateMessage = [
  param('id')
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID(4)
    .withMessage('Valid message ID (UUID v4) is required'),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isString()
    .withMessage('Content must be a string')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),
  
  handleValidationErrors,
];

/**
 * Get Message By ID Validation
 */
export const validateGetMessageById = [
  param('id')
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID(4)
    .withMessage('Valid message ID (UUID v4) is required'),
  
  handleValidationErrors,
];

/**
 * Delete Message Validation
 */
export const validateDeleteMessage = [
  param('id')
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID(4)
    .withMessage('Valid message ID (UUID v4) is required'),
  
  handleValidationErrors,
];

/**
 * Clear Chat History Validation
 */
export const validateClearHistory = [
  query('beforeDate')
    .optional()
    .isISO8601()
    .withMessage('beforeDate must be a valid ISO 8601 date')
    .custom((value) => {
      if (!value) return true;
      
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (date > today) {
        throw new Error('beforeDate cannot be in the future');
      }
      
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 1);
      
      if (date < minDate) {
        throw new Error('beforeDate cannot be more than 1 year in the past');
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Batch Create Messages Validation
 */
export const validateBatchCreateMessages = [
  body('messages')
    .isArray({ min: 1, max: 100 })
    .withMessage('Messages must be an array with 1-100 items'),
  
  body('messages.*.role')
    .notEmpty()
    .withMessage('Role is required for each message')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Role must be user, assistant, or system'),
  
  body('messages.*.content')
    .notEmpty()
    .withMessage('Content is required for each message')
    .isString()
    .withMessage('Content must be a string')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),
  
  body('messages')
    .custom((messages) => {
      // Check for duplicate consecutive messages from same role
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].role === messages[i - 1].role) {
          throw new Error('Consecutive messages cannot have the same role');
        }
      }
      return true;
    })
    .optional(),
  
  handleValidationErrors,
];

/**
 * Get Conversation Context Validation
 */
export const validateGetConversationContext = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('includeSystem')
    .optional()
    .isBoolean()
    .withMessage('includeSystem must be a boolean')
    .toBoolean(),
  
  handleValidationErrors,
];

/**
 * Message ID Parameter Validation (Reusable)
 */
export const validateMessageIdParam = [
  param('id')
    .notEmpty()
    .withMessage('Message ID is required')
    .isUUID(4)
    .withMessage('Valid message ID (UUID v4) is required'),
  
  handleValidationErrors,
];

/**
 * Date Range Validation (Reusable for Chat History)
 */
export const validateChatDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query?.startDate && value) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(value);
        
        if (endDate < startDate) {
          throw new Error('endDate must be after or equal to startDate');
        }
        
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 90) {
          throw new Error('Date range cannot exceed 90 days');
        }
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Search Messages Validation
 */
export const validateSearchMessages = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
  
  query('role')
    .optional()
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Role must be user, assistant, or system'),
  
  handleValidationErrors,
];

/**
 * Export Chat Validation
 */
export const validateExportChat = [
  query('format')
    .optional()
    .isIn(['json', 'txt', 'csv'])
    .withMessage('Format must be json, txt, or csv'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query?.startDate && value) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(value);
        
        if (endDate < startDate) {
          throw new Error('endDate must be after or equal to startDate');
        }
        
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 365) {
          throw new Error('Export date range cannot exceed 365 days');
        }
      }
      
      return true;
    }),
  
  handleValidationErrors,
];