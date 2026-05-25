import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Food Validation
 */
export const validateCreateFood = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating a food'),

  body('name')
    .notEmpty()
    .withMessage('Food name is required')
    .trim(),

  body('calories')
    .notEmpty()
    .withMessage('Calories is required')
    .isFloat({ min: 0 })
    .withMessage('Calories must be a positive number'),

  body('protein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein must be a positive number'),

  // Fixed: Changed from 'carbs' to 'carbohydrate' to match controller
  body('carbohydrate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Carbohydrate must be a positive number'),

  // Fixed: Changed from 'fats' to 'fat' to match controller
  body('fat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fat must be a positive number'),

  // Removed 'fiber' as it's not in the controller
  // Removed 'serving_size' as it's not in the controller
  // Removed 'category' as it's not in the controller  
  // Removed 'description' as it's not in the controller
  // Removed 'image_url' as controller uses file upload, not URL

  body('sugar')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sugar must be a positive number'),

  handleValidationErrors,
];

/**
 * Update Food Validation
 */
export const validateUpdateFood = [
  // Added ID validation for update operations
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid food ID is required'),

  body('name')
    .optional()
    .notEmpty()
    .withMessage('Food name cannot be empty')
    .trim(),

  body('calories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Calories must be a positive number'),

  body('protein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein must be a positive number'),

  // Fixed: Changed from 'carbs' to 'carbohydrate' to match controller
  body('carbohydrate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Carbohydrate must be a positive number'),

  // Fixed: Changed from 'fats' to 'fat' to match controller
  body('fat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fat must be a positive number'),

  // Removed fields not in controller
  body('sugar')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sugar must be a positive number'),

  handleValidationErrors,
];

/**
 * Delete Food Validation
 */
export const validateDeleteFood = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid food ID is required'),

  handleValidationErrors,
];

/**
 * Get Food By ID Validation
 */
export const validateGetFoodById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid food ID is required'),

  handleValidationErrors,
];

/**
 * Food Query Validation
 */
export const validateFoodQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim(),

  query('minCalories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum calories must be a positive number'),

  query('maxCalories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum calories must be a positive number'),

  query('minProtein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum protein must be a positive number'),

  // Removed 'category' as it's not implemented in the controller's getAllFoods method

  handleValidationErrors,
];

/**
 * Search Foods Validation
 */
export const validateSearchFoods = [
  query('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isString()
    .withMessage('Search query must be a string'),

  handleValidationErrors,
];

/**
 * Get High Protein Foods Validation
 */
export const validateGetHighProteinFoods = [
  query('minProtein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum protein must be a positive number'),

  handleValidationErrors,
];

/**
 * Get Low Calorie Foods Validation
 */
export const validateGetLowCalorieFoods = [
  query('maxCalories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum calories must be a positive number'),

  handleValidationErrors,
];