import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create User Metrics Validation
 */
export const validateCreateUserMetrics = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating user metrics'),
  
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid date'),
  
  body('fitnessScore')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Fitness score must be a positive integer'),
  
  body('strength')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Strength must be between 0 and 10'),
  
  body('endurance')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Endurance must be between 0 and 10'),
  
  body('consistency')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Consistency must be between 0 and 10'),
  
  body('volume')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Volume must be between 0 and 10'),
  
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Progress must be between 0 and 10'),
  
  body('habits')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Habits must be between 0 and 10'),
  
  body('totalWorkouts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total workouts must be a positive integer'),
  
  body('weeklyAvg')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weekly average must be a positive number'),
  
  body('currentStreak')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current streak must be a positive integer'),
  
  body('longestStreak')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Longest streak must be a positive integer'),
  
  body('totalVolume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total volume must be a positive number'),
  
  body('points')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Points must be a positive integer'),
  
  body('badgeLevel')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Badge level must be at least 1'),
  
  handleValidationErrors,
];

/**
 * Update User Metrics Validation
 */
export const validateUpdateUserMetrics = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid metrics ID'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date'),
  
  body('fitnessScore')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Fitness score must be a positive integer'),
  
  body('strength')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Strength must be between 0 and 10'),
  
  body('endurance')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Endurance must be between 0 and 10'),
  
  body('consistency')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Consistency must be between 0 and 10'),
  
  body('volume')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Volume must be between 0 and 10'),
  
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Progress must be between 0 and 10'),
  
  body('habits')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Habits must be between 0 and 10'),
  
  body('totalWorkouts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total workouts must be a positive integer'),
  
  body('weeklyAvg')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weekly average must be a positive number'),
  
  body('currentStreak')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current streak must be a positive integer'),
  
  body('longestStreak')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Longest streak must be a positive integer'),
  
  body('totalVolume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total volume must be a positive number'),
  
  body('points')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Points must be a positive integer'),
  
  body('badgeLevel')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Badge level must be at least 1'),
  
  handleValidationErrors,
];

/**
 * User Metrics Query Validation
 */
export const validateUserMetricsQuery = [
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
  
  query('latest')
    .optional()
    .isBoolean()
    .withMessage('Latest must be a boolean'),
  
  handleValidationErrors,
];

/**
 * User Metrics ID Param Validation
 */
export const validateUserMetricsId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid metrics ID'),
  
  handleValidationErrors,
];