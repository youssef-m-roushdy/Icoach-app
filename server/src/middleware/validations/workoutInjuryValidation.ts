import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Workout Injury Validation
 */
export const validateCreateWorkoutInjury = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating a workout-injury relationship'),
  
  body('workoutId')
    .notEmpty()
    .withMessage('Workout ID is required')
    .isInt({ min: 1 })
    .withMessage('Workout ID must be a positive integer'),
  
  body('injuryId')
    .notEmpty()
    .withMessage('Injury ID is required')
    .isInt({ min: 1 })
    .withMessage('Injury ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Delete Workout Injury Validation
 */
export const validateDeleteWorkoutInjury = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid relationship ID is required'),
  
  handleValidationErrors,
];

/**
 * Get Workout Injury By ID Validation
 */
export const validateGetWorkoutInjuryById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid relationship ID is required'),
  
  handleValidationErrors,
];

/**
 * Workout Injury Query Validation
 */
export const validateWorkoutInjuryQuery = [
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
  
  query('injuryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Injury ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Get Injuries By Workout Validation
 */
export const validateGetInjuriesByWorkout = [
  param('workoutId')
    .isInt({ min: 1 })
    .withMessage('Valid workout ID is required'),
  
  handleValidationErrors,
];

/**
 * Get Workouts By Injury Validation
 */
export const validateGetWorkoutsByInjury = [
  param('injuryId')
    .isInt({ min: 1 })
    .withMessage('Valid injury ID is required'),
  
  handleValidationErrors,
];

/**
 * Bulk Create Workout Injuries Validation
 */
export const validateBulkCreateWorkoutInjuries = [
  body('relationships')
    .isArray({ min: 1 })
    .withMessage('relationships array is required with at least 1 item'),
  
  body('relationships.*.workoutId')
    .notEmpty()
    .withMessage('Each relationship must have a workoutId')
    .isInt({ min: 1 })
    .withMessage('workoutId must be a positive integer'),
  
  body('relationships.*.injuryId')
    .notEmpty()
    .withMessage('Each relationship must have an injuryId')
    .isInt({ min: 1 })
    .withMessage('injuryId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Check Workout Injury Exists Validation
 */
export const validateCheckWorkoutInjuryExists = [
  param('workoutId')
    .isInt({ min: 1 })
    .withMessage('Valid workout ID is required'),
  
  param('injuryId')
    .isInt({ min: 1 })
    .withMessage('Valid injury ID is required'),
  
  handleValidationErrors,
];