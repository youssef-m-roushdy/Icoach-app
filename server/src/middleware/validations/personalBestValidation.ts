import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Personal Best Validation
 */
export const validateCreatePersonalBest = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating a personal best'),
  
  body('workoutId')
    .notEmpty()
    .withMessage('Workout ID is required')
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  body('exerciseName')
    .notEmpty()
    .withMessage('Exercise name is required')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Exercise name must be between 2 and 255 characters'),
  
  body('weight')
    .notEmpty()
    .withMessage('Weight is required')
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('reps')
    .notEmpty()
    .withMessage('Reps is required')
    .isInt({ min: 1 })
    .withMessage('Reps must be at least 1'),
  
  body('achievedAt')
    .optional()
    .isISO8601()
    .withMessage('Achieved at must be a valid date'),
  
  body('workoutSessionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Workout session ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Update Personal Best Validation
 */
export const validateUpdatePersonalBest = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid personal best ID'),
  
  body('workoutId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  body('exerciseName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Exercise name must be between 2 and 255 characters'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('reps')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reps must be at least 1'),
  
  body('achievedAt')
    .optional()
    .isISO8601()
    .withMessage('Achieved at must be a valid date'),
  
  body('workoutSessionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Workout session ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Personal Best Query Validation
 */
export const validatePersonalBestQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('workoutId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  query('exerciseName')
    .optional()
    .trim(),
  
  query('minWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum weight must be a positive number'),
  
  query('maxWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum weight must be a positive number'),
  
  query('minReps')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum reps must be at least 1'),
  
  handleValidationErrors,
];

/**
 * Personal Best ID Param Validation
 */
export const validatePersonalBestId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid personal best ID'),
  
  handleValidationErrors,
];