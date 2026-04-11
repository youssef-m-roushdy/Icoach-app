import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

// ============================================================================
// Workout Session Validations (Normalized Schema)
// ============================================================================

/**
 * Create Workout Session Validation (with sets array)
 */
export const validateCreateWorkoutSession = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating a workout session'),
  
  body('workoutId')
    .notEmpty()
    .withMessage('Workout ID is required')
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  
  body('sets')
    .notEmpty()
    .withMessage('Sets array is required')
    .isArray({ min: 1 })
    .withMessage('At least one set is required'),
  
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
    .withMessage('completed_at must be a valid date')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        if (date > now) {
          throw new Error('completed_at cannot be in the future');
        }
      }
      return true;
    }),
  
  body('sets.*.rest_time_seconds')
    .optional()
    .isInt({ min: 0, max: 600 })
    .withMessage('Rest time must be between 0 and 600 seconds (10 minutes)'),
  
  body('sets.*.notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Set notes must be less than 200 characters'),
  
  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('Completed at must be a valid date')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        if (date > now) {
          throw new Error('completedAt cannot be in the future');
        }
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  handleValidationErrors,
];

/**
 * Update Workout Session Validation
 */
export const validateUpdateWorkoutSession = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  body('workoutId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  
  body('sets')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one set is required when updating sets'),
  
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
  
  body('sets.*.completed_at')
    .optional()
    .isISO8601()
    .withMessage('completed_at must be a valid date')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        if (date > now) {
          throw new Error('completed_at cannot be in the future');
        }
      }
      return true;
    }),
  
  body('sets.*.rest_time_seconds')
    .optional()
    .isInt({ min: 0, max: 600 })
    .withMessage('Rest time must be between 0 and 600 seconds'),
  
  body('sets.*.notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Set notes must be less than 200 characters'),
  
  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('Completed at must be a valid date')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const now = new Date();
        if (date > now) {
          throw new Error('completedAt cannot be in the future');
        }
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  handleValidationErrors,
];

/**
 * Workout Session Query Validation
 * Supports filtering by:
 * - Date range (startDate, endDate)
 * - Text search (bodyPart, targetArea, workoutName)
 * - Numeric filters (minDuration, minVolume)
 */
export const validateWorkoutSessionQuery = [
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
  
  // Date filters
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query?.startDate && value) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(value);
        if (startDate > endDate) {
          throw new Error('Start date must be before or equal to end date');
        }
        // Max 365 days range
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 365) {
          throw new Error('Date range cannot exceed 365 days');
        }
      }
      return true;
    }),
  
  // Text search filters
  query('bodyPart')
    .optional()
    .isString()
    .withMessage('Body part must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Body part must be between 1 and 100 characters'),
  
  query('targetArea')
    .optional()
    .isString()
    .withMessage('Target area must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Target area must be between 1 and 100 characters'),
  
  query('workoutName')
    .optional()
    .isString()
    .withMessage('Workout name must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Workout name must be between 1 and 255 characters'),
  
  // Numeric filters
  query('minDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum duration must be a positive integer')
    .toInt(),
  
  query('minVolume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum volume must be a positive number')
    .toFloat(),
  
  query('minSets')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum sets must be a positive integer')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Workout Session ID Param Validation
 */
export const validateWorkoutSessionId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid session ID'),
  
  handleValidationErrors,
];

/**
 * Workout Session Stats Validation
 */
export const validateWorkoutSessionStats = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
    .toInt(),
  
  query('includeDistribution')
    .optional()
    .isBoolean()
    .withMessage('includeDistribution must be a boolean')
    .toBoolean(),
  
  handleValidationErrors,
];

/**
 * Bulk Create Workout Sessions Validation
 */
export const validateBulkCreateWorkoutSessions = [
  body('sessions')
    .isArray({ min: 1, max: 30 })
    .withMessage('Sessions must be an array with 1-30 items'),
  
  body('sessions.*.workoutId')
    .notEmpty()
    .withMessage('Workout ID is required')
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  body('sessions.*.duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  
  body('sessions.*.sets')
    .notEmpty()
    .withMessage('Sets array is required')
    .isArray({ min: 1 })
    .withMessage('At least one set is required per session'),
  
  body('sessions.*.sets.*.reps')
    .notEmpty()
    .withMessage('Reps is required for each set')
    .isInt({ min: 1, max: 100 })
    .withMessage('Reps must be between 1 and 100'),
  
  body('sessions.*.sets.*.weight')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weight must be between 0 and 1000 kg'),
  
  body('sessions.*.completedAt')
    .optional()
    .isISO8601()
    .withMessage('Completed at must be a valid date'),
  
  body('sessions.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  handleValidationErrors,
];

/**
 * Workout Session Date Range Validation (Reusable)
 */
export const validateWorkoutSessionDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query?.startDate && value) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(value);
        if (startDate > endDate) {
          throw new Error('Start date must be before or equal to end date');
        }
      }
      return true;
    }),
  
  handleValidationErrors,
];