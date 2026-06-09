import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create User Injury Validation (Add injury to user)
 */
export const validateCreateUserInjury = [
  body('injuryId')
    .notEmpty()
    .withMessage('injuryId is required')
    .isInt({ min: 1 })
    .withMessage('injuryId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Delete User Injury Validation (Remove injury from user)
 */
export const validateDeleteUserInjury = [
  param('injuryId')
    .notEmpty()
    .withMessage('injuryId is required')
    .isInt({ min: 1 })
    .withMessage('injuryId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Get User Injury by ID Validation
 */
export const validateGetUserInjuryById = [
  param('id')
    .notEmpty()
    .withMessage('User injury record ID is required')
    .isInt({ min: 1 })
    .withMessage('User injury record ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Check User Injury Validation (Check if user has specific injury)
 */
export const validateCheckUserInjury = [
  param('injuryId')
    .notEmpty()
    .withMessage('injuryId is required')
    .isInt({ min: 1 })
    .withMessage('injuryId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Bulk Create User Injuries Validation
 */
export const validateBulkCreateUserInjuries = [
  body('injuryIds')
    .isArray({ min: 1 })
    .withMessage('injuryIds must be a non-empty array')
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      // Check if every element is a positive integer
      return value.every((id: any) => Number.isInteger(id) && id > 0);
    })
    .withMessage('Each injuryId must be a positive integer'),
  
  body('injuryIds.*')
    .isInt({ min: 1 })
    .withMessage('Each injuryId must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Get User Injuries Query Validation
 */
export const validateGetUserInjuries = [
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
  
  query('includeWorkouts')
    .optional()
    .isBoolean()
    .withMessage('includeWorkouts must be a boolean (true/false)')
    .toBoolean(),
  
  handleValidationErrors,
];

/**
 * Get User Injury Statistics Validation (no additional validation needed)
 */
export const validateGetUserInjuryStatistics = [
  handleValidationErrors,
];

/**
 * Get Aggravating Workouts Validation (no additional validation needed)
 */
export const validateGetAggravatingWorkouts = [
  handleValidationErrors,
];