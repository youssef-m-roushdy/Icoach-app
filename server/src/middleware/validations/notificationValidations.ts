// middleware/validations/notificationValidations.ts
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Register/Update Expo Push Token Validation
 * POST /api/v1/notifications/expo-tokens
 */
export const validateRegisterExpoToken = [
  body('token')
    .notEmpty()
    .withMessage('Expo push token is required')
    .isString()
    .withMessage('Token must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Token must be between 1 and 255 characters'),
  
  body('deviceType')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Device type must be one of: ios, android, web'),

  body('provider')
    .optional()
    .isIn(['expo', 'fcm'])
    .withMessage('Provider must be one of: expo, fcm'),
  
  handleValidationErrors,
];

/**
 * Validate Expo Push Token Parameter
 * Used for routes that have :expoPushToken in the URL
 */
export const validateRemoveExpoToken = [
  param('expoPushToken')
    .notEmpty()
    .withMessage('Expo push token parameter is required')
    .isString()
    .withMessage('Token parameter must be a string')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Token parameter must be between 1 and 500 characters'),
  
  handleValidationErrors,
];

/**
 * Update Expo Push Token Validation
 * PUT /api/v1/notifications/expo-tokens/:expoPushToken
 */
export const validateUpdateExpoToken = [
  param('expoPushToken')
    .notEmpty()
    .withMessage('Expo push token parameter is required')
    .isString()
    .withMessage('Token parameter must be a string')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Token parameter must be between 1 and 500 characters'),
  
  body('deviceType')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Device type must be one of: ios, android, web'),
  
  handleValidationErrors,
];