import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create User Allergy Validation (Add allergy to user)
 */
export const validateCreateUserAllergy = [
  body('id')
    .not()
    .exists()
    .withMessage('ID should not be provided when adding an allergy'),

  body('allergenId')
    .notEmpty()
    .withMessage('Allergen ID is required')
    .isInt({ min: 1 })
    .withMessage('Allergen ID must be a positive integer'),

  body('severity')
    .optional()
    .isIn(['mild', 'moderate', 'severe', 'life_threatening'])
    .withMessage('Severity must be mild, moderate, severe, or life_threatening'),

  body('reaction')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reaction description must be less than 500 characters'),

  body('diagnosisDate')
    .optional()
    .isISO8601()
    .withMessage('Diagnosis date must be a valid date')
    .toDate(),

  body('diagnosedBy')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Diagnosed by must be less than 255 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),

  handleValidationErrors,
];

/**
 * Update User Allergy Validation
 */
export const validateUpdateUserAllergy = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid allergy record ID is required'),

  body('severity')
    .optional()
    .isIn(['mild', 'moderate', 'severe', 'life_threatening'])
    .withMessage('Severity must be mild, moderate, severe, or life_threatening'),

  body('reaction')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reaction description must be less than 500 characters'),

  body('diagnosisDate')
    .optional()
    .isISO8601()
    .withMessage('Diagnosis date must be a valid date')
    .toDate(),

  body('diagnosedBy')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Diagnosed by must be less than 255 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),

  handleValidationErrors,
];

/**
 * Delete User Allergy Validation
 */
export const validateDeleteUserAllergy = [
  param('allergenId')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  handleValidationErrors,
];

/**
 * Get User Allergy By ID Validation
 */
export const validateGetUserAllergyById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid allergy record ID is required'),

  handleValidationErrors,
];

/**
 * Check User Allergy Validation (Check if user has specific allergy)
 */
export const validateCheckUserAllergy = [
  param('allergenId')
    .isInt({ min: 1 })
    .withMessage('Valid allergen ID is required'),

  handleValidationErrors,
];

/**
 * Bulk Create User Allergies Validation
 */
export const validateBulkCreateUserAllergies = [
  body('allergies')
    .isArray({ min: 1 })
    .withMessage('allergies array is required with at least 1 item'),

  body('allergies.*.allergenId')
    .notEmpty()
    .withMessage('Each allergy must have an allergenId')
    .isInt({ min: 1 })
    .withMessage('allergenId must be a positive integer'),

  body('allergies.*.severity')
    .optional()
    .isIn(['mild', 'moderate', 'severe', 'life_threatening'])
    .withMessage('Severity must be mild, moderate, severe, or life_threatening'),

  body('allergies.*.reaction')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reaction must be less than 500 characters'),

  body('allergies.*.diagnosisDate')
    .optional()
    .isISO8601()
    .withMessage('Diagnosis date must be a valid date'),

  body('allergies.*.diagnosedBy')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Diagnosed by must be less than 255 characters'),

  body('allergies.*.notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),

  handleValidationErrors,
];

/**
 * Get User Allergies Query Validation
 */
export const validateGetUserAllergies = [
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

  query('category')
    .optional()
    .trim()
    .isIn(['food', 'medication', 'environmental'])
    .withMessage('Category must be food, medication, or environmental'),

  query('severity')
    .optional()
    .isIn(['mild', 'moderate', 'severe', 'life_threatening'])
    .withMessage('Severity must be mild, moderate, severe, or life_threatening'),

  handleValidationErrors,
];

/**
 * Get User Allergy Statistics Validation (no additional validation needed)
 */
export const validateGetUserAllergyStatistics = [
  handleValidationErrors,
];

/**
 * Get Foods With User Allergens Validation (no additional validation needed)
 */
export const validateGetFoodsWithUserAllergens = [
  handleValidationErrors,
];