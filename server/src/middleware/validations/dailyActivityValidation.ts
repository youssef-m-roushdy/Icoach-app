import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Sync Daily Activity Validation
 */
export const validateSyncDailyActivity = [
  body('steps')
    .notEmpty()
    .withMessage('Steps is required')
    .isInt({ min: 0, max: 100000 })
    .withMessage('Steps must be a number between 0 and 100,000'),
  
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid date in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (date > today) {
        throw new Error('Date cannot be in the future');
      }
      
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 1);
      if (date < minDate) {
        throw new Error('Date cannot be more than 1 year in the past');
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Update Daily Goal Validation
 */
export const validateUpdateDailyGoal = [
  body('goal')
    .notEmpty()
    .withMessage('Goal is required')
    .isInt({ min: 1000, max: 50000 })
    .withMessage('Goal must be between 1,000 and 50,000 steps'),
  
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date in YYYY-MM-DD format')
    .custom((value) => {
      if (!value) return true;
      
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (date > today) {
        throw new Error('Date cannot be in the future');
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Daily Activity History Query Validation
 */
export const validateDailyActivityHistory = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid date in YYYY-MM-DD format')
    .custom((value) => {
      if (!value) return true;
      
      const date = new Date(value);
      const maxPastDate = new Date();
      maxPastDate.setFullYear(maxPastDate.getFullYear() - 1);
      
      if (date < maxPastDate) {
        throw new Error('startDate cannot be more than 1 year in the past');
      }
      
      return true;
    }),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid date in YYYY-MM-DD format')
    .custom((value, { req }) => {
      if (!value) return true;
      
      const endDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (endDate > today) {
        throw new Error('endDate cannot be in the future');
      }
      
      if (req.query?.startDate) {
        const startDate = new Date(req.query.startDate as string);
        if (endDate < startDate) {
          throw new Error('endDate must be after startDate');
        }
      }
      
      return true;
    }),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('limit must be between 1 and 90')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Weekly Summary Query Validation
 */
export const validateWeeklySummary = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date in YYYY-MM-DD format')
    .custom((value) => {
      if (!value) return true;
      
      const date = new Date(value);
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 1);
      
      if (date < minDate) {
        throw new Error('Date cannot be more than 1 year in the past');
      }
      
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 7);
      
      if (date > maxDate) {
        throw new Error('Date cannot be more than 7 days in the future');
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Get Daily Activity By Date Validation
 */
export const validateGetDailyActivityByDate = [
  param('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date in YYYY-MM-DD format')
    .custom((value) => {
      if (!value) return true;
      
      const date = new Date(value);
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 1);
      
      if (date < minDate) {
        throw new Error('Date cannot be more than 1 year in the past');
      }
      
      const maxDate = new Date();
      maxDate.setHours(23, 59, 59, 999);
      
      if (date > maxDate) {
        throw new Error('Date cannot be in the future');
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Date Range Validation (Reusable)
 */
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid date in YYYY-MM-DD format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid date in YYYY-MM-DD format')
    .custom((value, { req }) => {
      if (req.query?.startDate && value) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(value);
        
        if (endDate < startDate) {
          throw new Error('endDate must be after or equal to startDate');
        }
        
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 90) {
          throw new Error('Date range cannot exceed 90 days');
        }
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Bulk Sync Daily Activities Validation
 */
export const validateBulkSyncDailyActivities = [
  body('activities')
    .isArray({ min: 1, max: 30 })
    .withMessage('Activities must be an array with 1-30 items'),
  
  body('activities.*.steps')
    .notEmpty()
    .withMessage('Steps is required for each activity')
    .isInt({ min: 0, max: 100000 })
    .withMessage('Steps must be between 0 and 100,000'),
  
  body('activities.*.date')
    .notEmpty()
    .withMessage('Date is required for each activity')
    .isISO8601()
    .withMessage('Date must be a valid date in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (date > today) {
        throw new Error('Date cannot be in the future');
      }
      
      return true;
    }),
  
  body('activities')
    .custom((activities) => {
      const dates = activities.map((a: any) => a.date);
      const uniqueDates = new Set(dates);
      
      if (dates.length !== uniqueDates.size) {
        throw new Error('Duplicate dates are not allowed in bulk sync');
      }
      
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Stats Query Validation
 */
export const validateStatsQuery = [
  query('includeWeekly')
    .optional()
    .isBoolean()
    .withMessage('includeWeekly must be a boolean')
    .toBoolean(),
  
  query('includeMonthly')
    .optional()
    .isBoolean()
    .withMessage('includeMonthly must be a boolean')
    .toBoolean(),
  
  query('weeks')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('weeks must be between 1 and 12')
    .toInt(),
  
  query('months')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('months must be between 1 and 12')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Points Query Validation
 */
export const validatePointsQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid date in YYYY-MM-DD format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid date in YYYY-MM-DD format'),
  
  handleValidationErrors,
];