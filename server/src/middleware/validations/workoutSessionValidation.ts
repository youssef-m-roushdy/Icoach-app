import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Workout Session Validation
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
    .withMessage('Sets is required')
    .isInt({ min: 1 })
    .withMessage('Sets must be at least 1'),
  
  body('reps')
    .notEmpty()
    .withMessage('Reps is required')
    .isInt({ min: 1 })
    .withMessage('Reps must be at least 1'),
  
  body('weight')
    .notEmpty()
    .withMessage('Weight is required')
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('volume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Volume must be a positive number'),
  
  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('Completed at must be a valid date'),
  
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
    .isInt({ min: 1 })
    .withMessage('Sets must be at least 1'),
  
  body('reps')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reps must be at least 1'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('volume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Volume must be a positive number'),
  
  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('Completed at must be a valid date'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  handleValidationErrors,
];

/**
 * Workout Session Query Validation
 */
export const validateWorkoutSessionQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  query('workoutId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  query('minDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum duration must be a positive integer'),
  
  query('minVolume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum volume must be a positive number'),
  
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