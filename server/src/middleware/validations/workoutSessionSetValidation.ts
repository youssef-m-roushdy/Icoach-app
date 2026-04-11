import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

// ============================================================================
// Workout Session Set Validations
// ============================================================================

/**
 * Add Set to Workout Session Validation
 */
export const validateAddSetToWorkoutSession = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  body('reps')
    .notEmpty()
    .withMessage('Reps is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Reps must be between 1 and 100'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weight must be between 0 and 1000 kg'),
  
  body('is_completed')
    .optional()
    .isBoolean()
    .withMessage('is_completed must be a boolean'),
  
  body('completed_at')
    .optional()
    .isISO8601()
    .withMessage('completed_at must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('completed_at cannot be in the future');
      }
      return true;
    }),
  
  body('rest_time_seconds')
    .optional()
    .isInt({ min: 0, max: 600 })
    .withMessage('Rest time must be between 0 and 600 seconds (10 minutes)'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes must be less than 200 characters'),
  
  handleValidationErrors,
];

/**
 * Update Workout Session Set Validation
 */
export const validateUpdateWorkoutSessionSet = [
  param('sessionId')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  param('setId')
    .isInt({ min: 1 })
    .withMessage('Invalid set ID'),
  
  body('reps')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Reps must be between 1 and 100'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weight must be between 0 and 1000 kg'),
  
  body('is_completed')
    .optional()
    .isBoolean()
    .withMessage('is_completed must be a boolean'),
  
  body('rest_time_seconds')
    .optional()
    .isInt({ min: 0, max: 600 })
    .withMessage('Rest time must be between 0 and 600 seconds'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes must be less than 200 characters'),
  
  handleValidationErrors,
];

/**
 * Delete Workout Session Set Validation
 */
export const validateDeleteWorkoutSessionSet = [
  param('sessionId')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  param('setId')
    .isInt({ min: 1 })
    .withMessage('Invalid set ID'),
  
  handleValidationErrors,
];

/**
 * Get Single Set Validation
 */
export const validateGetWorkoutSessionSet = [
  param('sessionId')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  param('setId')
    .isInt({ min: 1 })
    .withMessage('Invalid set ID'),
  
  handleValidationErrors,
];

/**
 * Get Sets for Session Validation
 */
export const validateGetSessionSets = [
  param('sessionId')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  query('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean')
    .toBoolean(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Bulk Add Sets to Workout Session Validation
 */
export const validateBulkAddSetsToWorkoutSession = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  body('sets')
    .isArray({ min: 1, max: 20 })
    .withMessage('Sets must be an array with 1-20 items'),
  
  body('sets.*.reps')
    .notEmpty()
    .withMessage('Reps is required for each set')
    .isInt({ min: 1, max: 100 })
    .withMessage('Reps must be between 1 and 100'),
  
  body('sets.*.weight')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weight must be between 0 and 1000 kg'),
  
  body('sets.*.is_completed')
    .optional()
    .isBoolean()
    .withMessage('is_completed must be a boolean'),
  
  body('sets.*.completed_at')
    .optional()
    .isISO8601()
    .withMessage('completed_at must be a valid date'),
  
  body('sets.*.rest_time_seconds')
    .optional()
    .isInt({ min: 0, max: 600 })
    .withMessage('Rest time must be between 0 and 600 seconds'),
  
  body('sets.*.notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes must be less than 200 characters'),
  
  handleValidationErrors,
];

/**
 * Bulk Update Sets Validation
 */
export const validateBulkUpdateSets = [
  param('sessionId')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  body('sets')
    .isArray({ min: 1, max: 20 })
    .withMessage('Sets must be an array with 1-20 items'),
  
  body('sets.*.id')
    .notEmpty()
    .withMessage('Set ID is required for updates')
    .isInt({ min: 1 })
    .withMessage('Set ID must be a positive integer'),
  
  body('sets.*.reps')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Reps must be between 1 and 100'),
  
  body('sets.*.weight')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weight must be between 0 and 1000 kg'),
  
  body('sets.*.is_completed')
    .optional()
    .isBoolean()
    .withMessage('is_completed must be a boolean'),
  
  body('sets.*.rest_time_seconds')
    .optional()
    .isInt({ min: 0, max: 600 })
    .withMessage('Rest time must be between 0 and 600 seconds'),
  
  body('sets.*.notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes must be less than 200 characters'),
  
  handleValidationErrors,
];

/**
 * Reorder Sets Validation
 */
export const validateReorderSets = [
  param('sessionId')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  body('setOrder')
    .isArray({ min: 1 })
    .withMessage('setOrder must be an array of set IDs'),
  
  body('setOrder.*')
    .isInt({ min: 1 })
    .withMessage('Each item in setOrder must be a valid set ID'),
  
  handleValidationErrors,
];

/**
 * Mark Set as Completed Validation
 */
export const validateMarkSetCompleted = [
  param('sessionId')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  param('setId')
    .isInt({ min: 1 })
    .withMessage('Invalid set ID'),
  
  body('completed_at')
    .optional()
    .isISO8601()
    .withMessage('completed_at must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('completed_at cannot be in the future');
      }
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Set Query Validation
 */
export const validateSetQuery = [
  query('minWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minWeight must be a positive number')
    .toFloat(),
  
  query('maxWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxWeight must be a positive number')
    .toFloat()
    .custom((value, { req }) => {
      if (req.query?.minWeight && value) {
        const minWeight = parseFloat(req.query.minWeight as string);
        const maxWeight = parseFloat(value);
        if (minWeight > maxWeight) {
          throw new Error('minWeight must be less than or equal to maxWeight');
        }
      }
      return true;
    }),
  
  query('minReps')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minReps must be a positive integer')
    .toInt(),
  
  query('maxReps')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxReps must be a positive integer')
    .toInt(),
  
  query('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean')
    .toBoolean(),
  
  handleValidationErrors,
];