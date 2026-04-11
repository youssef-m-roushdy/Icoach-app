import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Sync Water Intake Validation
 */
export const validateSyncWaterIntake = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0, max: 10 })
    .withMessage('Amount must be a number between 0 and 10'),
  
  body('unit')
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(['L', 'ML'])
    .withMessage('Unit must be either "L" or "ML"'),
  
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
  
  body('goalInLiters')
    .optional()
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Goal must be between 0.5 and 10 liters'),
  
  handleValidationErrors,
];

/**
 * Add Water Intake Validation
 */
export const validateAddWaterIntake = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.001, max: 10 })
    .withMessage('Amount must be greater than 0 and less than or equal to 10'),
  
  body('unit')
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(['L', 'ML'])
    .withMessage('Unit must be either "L" or "ML"'),
  
  handleValidationErrors,
];

/**
 * Update Water Goal Validation
 */
export const validateUpdateWaterGoal = [
  body('goalInLiters')
    .notEmpty()
    .withMessage('Goal is required')
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Goal must be between 0.5 and 10 liters'),
  
  handleValidationErrors,
];

/**
 * Water Intake History Query Validation
 */
export const validateWaterIntakeHistory = [
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
        
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 90) {
          throw new Error('Date range cannot exceed 90 days');
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
 * Weekly Water Summary Query Validation
 */
export const validateWeeklyWaterSummary = [
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
 * Monthly Water Summary Query Validation
 */
export const validateMonthlyWaterSummary = [
  query('year')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Year must be between 2000 and 2100')
    .toInt(),
  
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12')
    .toInt()
    .custom((value, { req }) => {
      if (req.query?.year && value) {
        const year = parseInt(req.query.year as string);
        const month = parseInt(value);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        if (year === currentYear && month > currentMonth) {
          throw new Error('Month cannot be in the future for the current year');
        }
      }
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Get Water Intake By Date Validation
 */
export const validateGetWaterIntakeByDate = [
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
 * Bulk Add Water Intake Validation
 */
export const validateBulkAddWaterIntake = [
  body('intakes')
    .isArray({ min: 1, max: 24 })
    .withMessage('Intakes must be an array with 1-24 items'),
  
  body('intakes.*.amount')
    .notEmpty()
    .withMessage('Amount is required for each intake')
    .isFloat({ min: 0.001, max: 10 })
    .withMessage('Amount must be between 0.001 and 10'),
  
  body('intakes.*.unit')
    .notEmpty()
    .withMessage('Unit is required for each intake')
    .isIn(['L', 'ML'])
    .withMessage('Unit must be either "L" or "ML"'),
  
  body('intakes.*.timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO8601 datetime'),
  
  handleValidationErrors,
];

/**
 * Stats Query Validation
 */
export const validateWaterStatsQuery = [
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
 * Date Range Validation (Reusable for Water Intake)
 */
export const validateWaterDateRange = [
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