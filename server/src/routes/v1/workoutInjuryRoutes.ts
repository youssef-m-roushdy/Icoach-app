import { Router } from 'express';
import {
  getWorkoutInjuries,
  getWorkoutInjuryById,
  createWorkoutInjury,
  deleteWorkoutInjury,
  getInjuriesByWorkout,
  getWorkoutsByInjury,
  bulkCreateWorkoutInjuries,
  checkWorkoutInjuryExists,
} from '../../controllers/WorkoutInjuryController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  validateCreateWorkoutInjury,
  validateDeleteWorkoutInjury,
  validateGetWorkoutInjuryById,
  validateWorkoutInjuryQuery,
  validateGetInjuriesByWorkout,
  validateGetWorkoutsByInjury,
  validateBulkCreateWorkoutInjuries,
  validateCheckWorkoutInjuryExists,
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Workout Injuries
 *   description: Workout and injury relationship management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkoutInjury:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Relationship ID
 *           example: 1
 *         workoutId:
 *           type: integer
 *           description: Workout ID
 *           example: 5
 *         injuryId:
 *           type: integer
 *           description: Injury ID
 *           example: 3
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         workout:
 *           $ref: '#/components/schemas/Workout'
 *         injury:
 *           $ref: '#/components/schemas/Injury'
 *     
 *     Workout:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         body_part:
 *           type: string
 *         target_area:
 *           type: string
 *         level:
 *           type: string
 *         equipment:
 *           type: string
 *         gif_link:
 *           type: string
 *     
 *     Injury:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         bodyPart:
 *           type: string
 *         severity:
 *           type: string
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/workout-injuries:
 *   get:
 *     tags:
 *       - Workout Injuries
 *     summary: Get all workout-injury relationships
 *     description: |
 *       Retrieve a paginated list of all workout-injury relationships.
 *       **Authentication required** - Users must be signed in.
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
 *         description: Number of relationships per page
 *       - in: query
 *         name: workoutId
 *         schema:
 *           type: integer
 *         description: Filter by workout ID
 *       - in: query
 *         name: injuryId
 *         schema:
 *           type: integer
 *         description: Filter by injury ID
 *     responses:
 *       200:
 *         description: Relationships retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/', validateWorkoutInjuryQuery, asyncHandler(getWorkoutInjuries));

/**
 * @swagger
 * /api/v1/workout-injuries/workout/{workoutId}:
 *   get:
 *     tags:
 *       - Workout Injuries
 *     summary: Get all injuries for a specific workout
 *     description: |
 *       Retrieve all injuries that can be caused by a specific workout.
 *       **Authentication required** - Users must be signed in.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workoutId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout ID
 *     responses:
 *       200:
 *         description: Injuries retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Workout not found
 */
router.get('/workout/:workoutId', validateGetInjuriesByWorkout, asyncHandler(getInjuriesByWorkout));

/**
 * @swagger
 * /api/v1/workout-injuries/injury/{injuryId}:
 *   get:
 *     tags:
 *       - Workout Injuries
 *     summary: Get all workouts for a specific injury
 *     description: |
 *       Retrieve all workouts that can cause a specific injury.
 *       **Authentication required** - Users must be signed in.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: injuryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Injury ID
 *     responses:
 *       200:
 *         description: Workouts retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Injury not found
 */
router.get('/injury/:injuryId', validateGetWorkoutsByInjury, asyncHandler(getWorkoutsByInjury));

/**
 * @swagger
 * /api/v1/workout-injuries/check/{workoutId}/{injuryId}:
 *   get:
 *     tags:
 *       - Workout Injuries
 *     summary: Check if a workout-injury relationship exists
 *     description: |
 *       Check if a specific relationship between a workout and an injury exists.
 *       **Authentication required** - Users must be signed in.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workoutId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout ID
 *       - in: path
 *         name: injuryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Injury ID
 *     responses:
 *       200:
 *         description: Check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                     relationshipId:
 *                       type: integer
 *                       nullable: true
 *                     workoutId:
 *                       type: integer
 *                     injuryId:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/check/:workoutId/:injuryId', validateCheckWorkoutInjuryExists, asyncHandler(checkWorkoutInjuryExists));

/**
 * @swagger
 * /api/v1/workout-injuries/{id}:
 *   get:
 *     tags:
 *       - Workout Injuries
 *     summary: Get workout-injury relationship by ID
 *     description: |
 *       Retrieve a specific workout-injury relationship by its ID.
 *       **Authentication required** - Users must be signed in.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Relationship ID
 *     responses:
 *       200:
 *         description: Relationship retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Relationship not found
 */
router.get('/:id', validateGetWorkoutInjuryById, asyncHandler(getWorkoutInjuryById));

/**
 * @swagger
 * /api/v1/workout-injuries:
 *   post:
 *     tags:
 *       - Workout Injuries
 *     summary: Create a new workout-injury relationship (Admin only)
 *     description: |
 *       Create a new relationship between a workout and an injury.
 *       **Admin authentication required** - Only admin users can create relationships.
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
 *               - injuryId
 *             properties:
 *               workoutId:
 *                 type: integer
 *                 description: ID of the workout
 *                 example: 5
 *               injuryId:
 *                 type: integer
 *                 description: ID of the injury
 *                 example: 3
 *     responses:
 *       201:
 *         description: Relationship created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Workout or injury not found
 *       409:
 *         description: Relationship already exists
 */
router.post('/', authenticate, authorize('admin'), validateCreateWorkoutInjury, asyncHandler(createWorkoutInjury));

/**
 * @swagger
 * /api/v1/workout-injuries/bulk:
 *   post:
 *     tags:
 *       - Workout Injuries
 *     summary: Bulk create workout-injury relationships (Admin only)
 *     description: |
 *       Create multiple workout-injury relationships in a single request.
 *       **Admin authentication required** - Only admin users can create relationships.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - relationships
 *             properties:
 *               relationships:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - workoutId
 *                     - injuryId
 *                   properties:
 *                     workoutId:
 *                       type: integer
 *                     injuryId:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Relationships created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: One or more workouts/injuries not found
 */
router.post('/bulk', authenticate, authorize('admin'), validateBulkCreateWorkoutInjuries, asyncHandler(bulkCreateWorkoutInjuries));

/**
 * @swagger
 * /api/v1/workout-injuries/{id}:
 *   delete:
 *     tags:
 *       - Workout Injuries
 *     summary: Delete a workout-injury relationship (Admin only)
 *     description: |
 *       Delete a workout-injury relationship.
 *       **Admin authentication required** - Only admin users can delete relationships.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Relationship ID
 *     responses:
 *       200:
 *         description: Relationship deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Relationship not found
 */
router.delete('/:id', authenticate, authorize('admin'), validateDeleteWorkoutInjury, asyncHandler(deleteWorkoutInjury));

export default router;