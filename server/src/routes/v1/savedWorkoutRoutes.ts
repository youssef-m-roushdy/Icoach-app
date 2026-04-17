import { Router } from 'express';
import {
  saveWorkout,
  getSavedWorkouts,
  getSavedWorkoutById,
  deleteSavedWorkout,
  checkIfSaved,
} from '../../controllers/savedWorkoutController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateCreateSavedWorkout,
  validateGetSavedWorkouts,
  validateGetSavedWorkoutById,
  validateDeleteSavedWorkout,
  validateCheckIfSaved,
} from '../../middleware/validations/index.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Saved Workouts
 *   description: Saved workout management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SavedWorkout:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 42
 *         workoutId:
 *           type: integer
 *           example: 5
 *         notes:
 *           type: string
 *           example: "Great for chest day"
 *         customName:
 *           type: string
 *           example: "My Favorite Chest Exercise"
 *         isFavorite:
 *           type: boolean
 *           example: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["chest", "strength", "favorite"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         workout:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             body_part:
 *               type: string
 *             target_area:
 *               type: string
 *             equipment:
 *               type: string
 *             level:
 *               type: string
 *             gif_link:
 *               type: string
 */

/**
 * @swagger
 * /api/v1/saved-workouts:
 *   post:
 *     tags:
 *       - Saved Workouts
 *     summary: Save a workout
 *     description: Save a workout to user's saved list with optional custom notes and parameters
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workoutId
 *             properties:
 *               workoutId:
 *                 type: integer
 *                 description: ID of the workout to save
 *                 example: 5
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Personal notes about this workout
 *                 example: "Great for targeting upper chest"
 *               customName:
 *                 type: string
 *                 maxLength: 100
 *                 description: Custom name for this saved workout
 *                 example: "My Chest Builder"
 *     responses:
 *       201:
 *         description: Workout saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Workout already saved
 *       404:
 *         description: Workout not found
 */
router.post(
  '/',
  validateCreateSavedWorkout,
  saveWorkout
);

/**
 * @swagger
 * /api/v1/saved-workouts:
 *   get:
 *     tags:
 *       - Saved Workouts
 *     summary: Get all saved workouts
 *     description: Retrieve all saved workouts for the authenticated user with pagination and filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: bodyPart
 *         schema:
 *           type: string
 *         description: Filter by body part
 *       - in: query
 *         name: targetArea
 *         schema:
 *           type: string
 *         description: Filter by target area
 *       - in: query
 *         name: equipment
 *         schema:
 *           type: string
 *         description: Filter by equipment
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by workout name or notes
 *       - in: query
 *         name: isFavorite
 *         schema:
 *           type: boolean
 *         description: Filter by favorite status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, workout.name, workout.body_part, workout.level]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Saved workouts retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/',
  validateGetSavedWorkouts,
  getSavedWorkouts
);

/**
 * @swagger
 * /api/v1/saved-workouts/check/{workoutId}:
 *   get:
 *     tags:
 *       - Saved Workouts
 *     summary: Check if workout is saved
 *     description: Check if a specific workout is saved by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workoutId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout ID to check
 *     responses:
 *       200:
 *         description: Check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isSaved:
 *                       type: boolean
 *                       example: true
 *                     savedWorkout:
 *                       $ref: '#/components/schemas/SavedWorkout'
 *       401:
 *         description: Authentication required
 */
router.get(
  '/check/:workoutId',
  validateCheckIfSaved,
  checkIfSaved
);

/**
 * @swagger
 * /api/v1/saved-workouts/{id}:
 *   get:
 *     tags:
 *       - Saved Workouts
 *     summary: Get a saved workout by ID
 *     description: Retrieve a specific saved workout with full workout details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Saved workout ID
 *     responses:
 *       200:
 *         description: Saved workout retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Saved workout not found
 */
router.get(
  '/:id',
  validateGetSavedWorkoutById,
  getSavedWorkoutById
);

/**
 * @swagger
 * /api/v1/saved-workouts/{id}:
 *   delete:
 *     tags:
 *       - Saved Workouts
 *     summary: Remove a saved workout
 *     description: Delete a workout from user's saved list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Saved workout ID
 *     responses:
 *       200:
 *         description: Workout removed from saved list successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Saved workout not found
 */
router.delete(
  '/:id',
  validateDeleteSavedWorkout,
  deleteSavedWorkout
);

export default router;