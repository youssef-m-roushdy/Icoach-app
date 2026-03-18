import { query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Progress History Query Validation
 */
export const validateProgressHistoryQuery = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
    .toInt(), // Convert to integer
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      // Check if it's a valid date format
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid start date');
      }
      return true;
    }),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid end date');
      }
      return true;
    })
    .custom((value, { req }) => {
      // If both startDate and endDate are provided, ensure startDate <= endDate
      if (req.query?.startDate) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(value);
        if (startDate > endDate) {
          throw new Error('Start date must be before or equal to end date');
        }
      }
      return true;
    }),
  
  query('metrics')
    .optional()
    .isString()
    .withMessage('Metrics must be a comma-separated string')
    .custom((value) => {
      if (typeof value !== 'string') return true;
      
      const validMetrics = [
        'fitnessScore', 'strength', 'endurance', 'consistency', 
        'volume', 'progress', 'habits'
      ];
      
      const requestedMetrics = value.split(',').map(m => m.trim());
      
      for (const metric of requestedMetrics) {
        if (!validMetrics.includes(metric)) {
          throw new Error(`Invalid metric: ${metric}. Valid metrics are: ${validMetrics.join(', ')}`);
        }
      }
      return true;
    })
    .optional(),
  
  query('format')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Format must be daily, weekly, or monthly'),
  
  handleValidationErrors,
];

/**
 * Progress Dashboard Query Validation (if you add filters later)
 */
export const validateProgressDashboardQuery = [
  query('includeHistory')
    .optional()
    .isBoolean()
    .withMessage('includeHistory must be a boolean')
    .toBoolean(),
  
  query('historyDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('History days must be between 1 and 365')
    .toInt(),
  
  handleValidationErrors,
];