import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Food Allergen Validation
 */
export const validateCreateFoodAllergen = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating a food-allergen relationship'),

  body('foodId')
    .notEmpty()
    .withMessage('Food ID is required')
    .isInt({ min: 1 })
    .withMessage('Food ID must be a positive integer'),

  body('allergenId')
    .notEmpty()
    .withMessage('Allergen ID is required')
    .isInt({ min: 1 })
    .withMessage('Allergen ID must be a positive integer'),

  body('contains')
    .optional()
    .isBoolean()
    .withMessage('Contains must be a boolean value'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),

  handleValidationErrors,
];

/**
 * Update Food Allergen Validation
 */
export const validateUpdateFoodAllergen = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid relationship ID is required'),

  body('contains')
    .optional()
    .isBoolean()
    .withMessage('Contains must be a boolean value'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),

  handleValidationErrors,
];

/**
 * Delete Food Allergen Validation
 */
export const validateDeleteFoodAllergen = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid relationship ID is required'),

  handleValidationErrors,
];

/**
 * Get Food Allergen By ID Validation
 */
export const validateGetFoodAllergenById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid relationship ID is required'),

  handleValidationErrors,
];

/**
 * Food Allergen Query Validation
 */
export const validateFoodAllergenQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('foodId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Food ID must be a positive integer'),

  query('allergenId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Allergen ID must be a positive integer'),

  query('contains')
    .optional()
    .isBoolean()
    .withMessage('Contains must be a boolean value'),

  handleValidationErrors,
];

/**
 * Bulk Create Food Allergens Validation
 */
export const validateBulkCreateFoodAllergens = [
  body('relationships')
    .isArray({ min: 1 })
    .withMessage('relationships array is required with at least 1 item'),

  body('relationships.*.foodId')
    .notEmpty()
    .withMessage('Each relationship must have a foodId')
    .isInt({ min: 1 })
    .withMessage('foodId must be a positive integer'),

  body('relationships.*.allergenId')
    .notEmpty()
    .withMessage('Each relationship must have an allergenId')
    .isInt({ min: 1 })
    .withMessage('allergenId must be a positive integer'),

  body('relationships.*.contains')
    .optional()
    .isBoolean()
    .withMessage('contains must be a boolean value'),

  body('relationships.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('notes must be less than 500 characters'),

  handleValidationErrors,
];

/**
 * Get Relationships By Food Validation
 */
export const validateGetRelationshipsByFood = [
  param('foodId')
    .isInt({ min: 1 })
    .withMessage('Valid food ID is required'),

  handleValidationErrors,
];

/**
 * Get Relationships By Allergen Validation
 */
export const validateGetRelationshipsByAllergen = [
  param('allergenId')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  handleValidationErrors,
];

/**
 * Toggle Contains Validation
 */
export const validateToggleContains = [
  param('foodId')
    .isInt({ min: 1 })
    .withMessage('Valid food ID is required'),

  param('allergenId')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  handleValidationErrors,
];