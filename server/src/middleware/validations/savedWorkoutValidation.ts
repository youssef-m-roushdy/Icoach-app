import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Validation for creating a saved workout
 * POST /api/v1/saved-workouts
 */
export const validateCreateSavedWorkout = [
  body('workoutId')
    .isInt({ min: 1 })
    .withMessage('Valid workout ID is required')
    .toInt(),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('customName')
    .optional()
    .isString()
    .withMessage('Custom name must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Custom name must be between 1 and 100 characters'),
  
  handleValidationErrors,
];

/**
 * Validation for getting saved workouts with filters
 * GET /api/v1/saved-workouts
 */
export const validateGetSavedWorkouts = [
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
    .isString()
    .withMessage('Body part must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Body part cannot exceed 50 characters'),
  
  query('targetArea')
    .optional()
    .isString()
    .withMessage('Target area must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Target area cannot exceed 50 characters'),
  
  query('equipment')
    .optional()
    .isString()
    .withMessage('Equipment must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Equipment cannot exceed 50 characters'),
  
  query('level')
    .optional()
    .isString()
    .withMessage('Level must be a string')
    .trim()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level must be beginner, intermediate, or advanced'),
  
  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  
  query('sortBy')
    .optional()
    .isString()
    .withMessage('Sort field must be a string')
    .trim()
    .isIn(['createdAt', 'updatedAt', 'workout.name', 'workout.body_part', 'workout.level'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isString()
    .withMessage('Sort order must be a string')
    .trim()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Sort order must be ASC or DESC'),
  
  handleValidationErrors,
];

/**
 * Validation for getting a saved workout by ID
 * GET /api/v1/saved-workouts/:id
 */
export const validateGetSavedWorkoutById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid saved workout ID is required')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Validation for deleting a saved workout
 * DELETE /api/v1/saved-workouts/:id
 */
export const validateDeleteSavedWorkout = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid saved workout ID is required')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Validation for checking if a workout is saved
 * GET /api/v1/saved-workouts/check/:workoutId
 */
export const validateCheckIfSaved = [
  param('workoutId')
    .isInt({ min: 1 })
    .withMessage('Valid workout ID is required')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Validation for bulk operations on saved workouts
 * POST /api/v1/saved-workouts/bulk
 */
export const validateBulkSavedWorkouts = [
  body('operation')
    .isString()
    .withMessage('Operation type is required')
    .isIn(['delete', 'favorite', 'unfavorite', 'tag'])
    .withMessage('Operation must be delete, favorite, unfavorite, or tag'),
  
  body('ids')
    .isArray({ min: 1 })
    .withMessage('At least one saved workout ID is required')
    .custom((ids: any[]) => {
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All IDs must be positive integers');
      }
      if (ids.length > 50) {
        throw new Error('Maximum 50 IDs allowed per bulk operation');
      }
      return true;
    }),
  
  body('tags')
    .if(body('operation').equals('tag'))
    .isArray({ min: 1 })
    .withMessage('Tags array is required for tag operation')
    .custom((tags: any[]) => {
      if (!tags.every(tag => typeof tag === 'string' && tag.trim().length > 0)) {
        throw new Error('All tags must be non-empty strings');
      }
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    }),
  
  handleValidationErrors,
];