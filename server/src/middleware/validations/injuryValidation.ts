import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Injury Validation
 */
export const validateCreateInjury = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating an injury'),
  
  body('name')
    .notEmpty()
    .withMessage('Injury name is required')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Injury name must be between 3 and 100 characters'),
  
  body('bodyPart')
    .notEmpty()
    .withMessage('Body part is required')
    .trim()
    .isIn(['chest', 'back', 'shoulder', 'arms', 'legs', 'abs', 'neck', 'cardio'])
    .withMessage('Body part must be one of: chest, back, shoulder, arms, legs, abs, neck, cardio'),
  
  body('severity')
    .notEmpty()
    .withMessage('Severity is required')
    .trim()
    .isIn(['mild', 'moderate', 'severe'])
    .withMessage('Severity must be one of: mild, moderate, severe'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  handleValidationErrors,
];

/**
 * Update Injury Validation
 */
export const validateUpdateInjury = [
  param('id')
    .notEmpty()
    .withMessage('Injury ID is required')
    .isInt({ min: 1 })
    .withMessage('Injury ID must be a positive integer'),
  
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Injury name cannot be empty')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Injury name must be between 3 and 100 characters'),
  
  body('bodyPart')
    .optional()
    .notEmpty()
    .withMessage('Body part cannot be empty')
    .trim()
    .isIn(['chest', 'back', 'shoulder', 'arms', 'legs', 'abs', 'neck', 'cardio'])
    .withMessage('Body part must be one of: chest, back, shoulder, arms, legs, abs, neck, cardio'),
  
  body('severity')
    .optional()
    .notEmpty()
    .withMessage('Severity cannot be empty')
    .trim()
    .isIn(['mild', 'moderate', 'severe'])
    .withMessage('Severity must be one of: mild, moderate, severe'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  handleValidationErrors,
];

/**
 * Injury Query Validation (for GET /api/injuries)
 */
export const validateInjuryQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('bodyPart')
    .optional()
    .trim()
    .isIn(['chest', 'back', 'shoulder', 'arms', 'legs', 'abs', 'neck', 'cardio'])
    .withMessage('Body part must be one of: chest, back, shoulder, arms, legs, abs, neck, cardio'),
  
  query('severity')
    .optional()
    .trim()
    .isIn(['mild', 'moderate', 'severe'])
    .withMessage('Severity must be one of: mild, moderate, severe'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search term must be at least 2 characters'),
  
  handleValidationErrors,
];

/**
 * Injury ID Param Validation
 */
export const validateInjuryId = [
  param('id')
    .notEmpty()
    .withMessage('Injury ID is required')
    .isInt({ min: 1 })
    .withMessage('Injury ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Get Workouts by Injury ID Validation
 */
export const validateGetWorkoutsByInjuryId = [
  param('id')
    .notEmpty()
    .withMessage('Injury ID is required')
    .isInt({ min: 1 })
    .withMessage('Injury ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Get Injuries by Workout ID Validation (POST endpoint)
 */
export const validateGetInjuriesByWorkoutId = [
  body('workoutId')
    .notEmpty()
    .withMessage('workoutId is required')
    .isInt({ min: 1 })
    .withMessage('workoutId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Associate Injury with Workout Validation
 */
export const validateAssociateInjuryWithWorkout = [
  body('workoutId')
    .notEmpty()
    .withMessage('workoutId is required')
    .isInt({ min: 1 })
    .withMessage('workoutId must be a positive integer'),
  
  body('injuryId')
    .notEmpty()
    .withMessage('injuryId is required')
    .isInt({ min: 1 })
    .withMessage('injuryId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Dissociate Injury from Workout Validation
 */
export const validateDissociateInjuryFromWorkout = [
  body('workoutId')
    .notEmpty()
    .withMessage('workoutId is required')
    .isInt({ min: 1 })
    .withMessage('workoutId must be a positive integer'),
  
  body('injuryId')
    .notEmpty()
    .withMessage('injuryId is required')
    .isInt({ min: 1 })
    .withMessage('injuryId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Get Injury Statistics Validation (no additional validation needed)
 */
export const validateGetInjuryStatistics = [
  handleValidationErrors,
];

/**
 * Get Injury Filters Validation (no additional validation needed)
 */
export const validateGetInjuryFilters = [
  handleValidationErrors,
];