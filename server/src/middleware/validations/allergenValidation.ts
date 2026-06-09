import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Allergen Validation
 */
export const validateCreateAllergen = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when creating an allergen'),

  body('name')
    .notEmpty()
    .withMessage('Allergen name is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Allergen name must be between 1 and 100 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['food', 'medication', 'environmental'])
    .withMessage('Category must be food, medication, or environmental'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  handleValidationErrors,
];

/**
 * Update Allergen Validation
 */
export const validateUpdateAllergen = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  body('name')
    .optional()
    .notEmpty()
    .withMessage('Allergen name cannot be empty')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Allergen name must be between 1 and 100 characters'),

  body('category')
    .optional()
    .isIn(['food', 'medication', 'environmental'])
    .withMessage('Category must be food, medication, or environmental'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  handleValidationErrors,
];

/**
 * Delete Allergen Validation
 */
export const validateDeleteAllergen = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  handleValidationErrors,
];

/**
 * Get Allergen By ID Validation
 */
export const validateGetAllergenById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  handleValidationErrors,
];

/**
 * Allergen Query Validation
 */
export const validateAllergenQuery = [
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
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search term must be at least 2 characters'),

  query('category')
    .optional()
    .isIn(['food', 'medication', 'environmental'])
    .withMessage('Category must be food, medication, or environmental'),

  handleValidationErrors,
];

/**
 * Search Allergens Validation
 */
export const validateSearchAllergens = [
  query('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),

  handleValidationErrors,
];

/**
 * Get Allergens By Category Validation
 */
export const validateGetAllergensByCategory = [
  param('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['food', 'medication', 'environmental'])
    .withMessage('Category must be food, medication, or environmental'),

  handleValidationErrors,
];

/**
 * Get Food Allergens Validation (no parameters needed)
 */
export const validateGetFoodAllergens = [
  handleValidationErrors,
];

/**
 * Get Foods By Allergen Validation
 */
export const validateGetFoodsByAllergen = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  handleValidationErrors,
];

/**
 * Get Allergens By Food Validation
 */
export const validateGetAllergensByFood = [
  param('foodId')
    .isInt({ min: 1 })
    .withMessage('Valid food ID is required'),

  handleValidationErrors,
];

/**
 * Check Food Allergens For User Validation
 */
export const validateCheckFoodAllergensForUser = [
  param('foodId')
    .isInt({ min: 1 })
    .withMessage('Valid food ID is required'),

  handleValidationErrors,
];

/**
 * Bulk Create Allergens Validation (Admin only)
 */
export const validateBulkCreateAllergens = [
  body('allergens')
    .isArray({ min: 1 })
    .withMessage('allergens array is required with at least 1 item'),

  body('allergens.*.name')
    .notEmpty()
    .withMessage('Each allergen must have a name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Allergen name must be between 1 and 100 characters'),

  body('allergens.*.category')
    .notEmpty()
    .withMessage('Each allergen must have a category')
    .isIn(['food', 'medication', 'environmental'])
    .withMessage('Category must be food, medication, or environmental'),

  body('allergens.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  handleValidationErrors,
];