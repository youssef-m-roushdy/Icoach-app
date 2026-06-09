import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Notification Validation
 */
export const validateCreateNotification = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating a notification'),
  
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  
  body('type')
    .notEmpty()
    .withMessage('Notification type is required')
    .trim(),
  
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim(),
  
  body('content')
    .optional()
    .trim(),
  
  body('data')
    .optional(),
  
  handleValidationErrors,
];

/**
 * Update Notification Validation (if needed - admin only)
 */
export const validateUpdateNotification = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid notification ID is required'),
  
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .trim(),
  
  body('content')
    .optional()
    .trim(),
  
  body('data')
    .optional(),
  
  handleValidationErrors,
];

/**
 * Get Notifications Query Validation
 */
export const validateGetUserNotifications = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('type')
    .optional()
    .trim(),
  
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean value'),
  
  handleValidationErrors,
];

/**
 * Get Notification By ID Validation
 */
export const validateGetNotificationById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid notification ID is required'),
  
  handleValidationErrors,
];

/**
 * Mark Notification As Read Validation
 */
export const validateMarkAsRead = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid notification ID is required'),
  
  handleValidationErrors,
];

/**
 * Delete Notification Validation
 */
export const validateDeleteNotification = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid notification ID is required'),
  
  handleValidationErrors,
];

/**
 * Get Notifications By Type Validation
 */
export const validateGetNotificationsByType = [
  param('type')
    .notEmpty()
    .withMessage('Notification type is required')
    .trim(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors,
];

/**
 * Send Test Notification Validation
 */
export const validateSendTestNotification = [
  body('title')
    .optional()
    .trim(),
  
  body('body')
    .optional()
    .trim(),
  
  handleValidationErrors,
];

/**
 * Mark All Notifications As Read Validation (no parameters needed)
 */
export const validateMarkAllAsRead = [
  handleValidationErrors,
];

/**
 * Delete Read Notifications Validation (no parameters needed)
 */
export const validateDeleteReadNotifications = [
  handleValidationErrors,
];

/**
 * Get Unread Count Validation (no parameters needed)
 */
export const validateGetUnreadCount = [
  handleValidationErrors,
];