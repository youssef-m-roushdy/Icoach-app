import { Router } from 'express';
import {
  getInjuries,
  getInjuryById,
  getWorkoutsByInjuryId,
  getInjuriesByWorkoutId,
  createInjury,
  updateInjury,
  deleteInjury,
  associateInjuryWithWorkout,
  dissociateInjuryFromWorkout,
  getInjuryFilters,
  getInjuryStatistics,
} from '../../controllers/injuryController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import {
  validateCreateInjury,
  validateUpdateInjury,
  validateInjuryQuery,
  validateInjuryId,
  validateGetWorkoutsByInjuryId,
  validateGetInjuriesByWorkoutId,
  validateAssociateInjuryWithWorkout,
  validateDissociateInjuryFromWorkout,
  validateGetInjuryFilters,
  validateGetInjuryStatistics,
} from '../../middleware/validations/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/injuries:
 *   get:
 *     tags:
 *       - Injuries
 *     summary: Get all injuries with filtering and pagination
 *     description: |
 *       Retrieve a paginated list of workout-related injuries with optional filters for body part and severity.
 *       **Authentication required** - Users must be signed in to access injury data.
 *       Results are ordered by injury ID in ascending order.
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
 *         description: Number of injuries per page (max 100)
 *       - in: query
 *         name: bodyPart
 *         schema:
 *           type: string
 *           enum: [chest, back, shoulder, arms, legs, abs, neck, cardio]
 *         description: Filter by body part
 *         example: "shoulder"
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [mild, moderate, severe]
 *         description: Filter by injury severity level
 *         example: "moderate"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search injuries by name or description (partial match)
 *         example: "rotator cuff"
 *     responses:
 *       200:
 *         description: Injuries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Rotator Cuff Tendinopathy"
 *                       bodyPart:
 *                         type: string
 *                         example: "shoulder"
 *                       severity:
 *                         type: string
 *                         example: "mild"
 *                       description:
 *                         type: string
 *                         example: "Overuse injury from repetitive overhead pressing"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 39
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/', authenticate, validateInjuryQuery, getInjuries);

/**
 * @swagger
 * /api/v1/injuries/filters:
 *   get:
 *     tags:
 *       - Injuries
 *     summary: Get available filter options for injuries
 *     description: |
 *       Retrieve all unique values for injury filters to populate dropdown menus or filter options.
 *       Returns lists of all available body parts and severity levels.
 *       **Authentication required** - Users must be signed in to access this data.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Filter options retrieved successfully
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
 *                     bodyParts:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["chest", "back", "shoulder", "arms", "legs", "abs", "neck", "cardio"]
 *                     severities:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["mild", "moderate", "severe"]
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/filters', authenticate, validateGetInjuryFilters, getInjuryFilters);

/**
 * @swagger
 * /api/v1/injuries/statistics:
 *   get:
 *     tags:
 *       - Injuries
 *     summary: Get injury statistics
 *     description: |
 *       Retrieve statistical breakdown of injuries by body part and severity level.
 *       **Authentication required** - Users must be signed in to access this data.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     byBodyPart:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bodyPart:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     bySeverity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           severity:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     total:
 *                       type: integer
 *                       example: 39
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/statistics', authenticate, validateGetInjuryStatistics, getInjuryStatistics);

/**
 * @swagger
 * /api/v1/injuries/{id}:
 *   get:
 *     tags:
 *       - Injuries
 *     summary: Get an injury by ID
 *     description: |
 *       Retrieve detailed information about a specific injury by its ID.
 *       **Authentication required** - Users must be signed in to access injury data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique injury ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Injury retrieved successfully
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Rotator Cuff Tendinopathy"
 *                     bodyPart:
 *                       type: string
 *                       example: "shoulder"
 *                     severity:
 *                       type: string
 *                       example: "mild"
 *                     description:
 *                       type: string
 *                       example: "Overuse injury from repetitive overhead pressing"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Injury not found
 */
router.get('/:id', authenticate, validateInjuryId, getInjuryById);

/**
 * @swagger
 * /api/v1/injuries/{id}/workouts:
 *   get:
 *     tags:
 *       - Injuries
 *     summary: Get all workouts that can cause a specific injury
 *     description: |
 *       Retrieve a list of all workouts that are associated with a specific injury.
 *       This helps users understand which exercises might lead to this injury.
 *       **Authentication required** - Users must be signed in to access this data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Injury ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Workouts retrieved successfully
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
 *                     injury:
 *                       type: object
 *                     workouts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Injury not found
 */
router.get('/:id/workouts', authenticate, validateGetWorkoutsByInjuryId, getWorkoutsByInjuryId);

/**
 * @swagger
 * /api/v1/injuries:
 *   post:
 *     tags:
 *       - Injuries
 *     summary: Create a new injury (Admin only)
 *     description: |
 *       Create a new injury entry in the database.
 *       **Authentication required** - Users must be signed in.
 *       **Admin access only** - Only users with admin role can create injuries.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - bodyPart
 *               - severity
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the injury
 *                 example: "Rotator Cuff Tendinopathy"
 *                 minLength: 3
 *                 maxLength: 100
 *               bodyPart:
 *                 type: string
 *                 enum: [chest, back, shoulder, arms, legs, abs, neck, cardio]
 *                 description: Body part affected by the injury
 *                 example: "shoulder"
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe]
 *                 description: Severity level of the injury
 *                 example: "mild"
 *               description:
 *                 type: string
 *                 description: Detailed description of the injury
 *                 example: "Overuse injury from repetitive overhead pressing"
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Injury created successfully
 *       400:
 *         description: Validation error - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Conflict - Injury with this name already exists
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateCreateInjury,
  createInjury
);

/**
 * @swagger
 * /api/v1/injuries/by-workout:
 *   post:
 *     tags:
 *       - Injuries
 *     summary: Get all injuries related to a specific workout
 *     description: |
 *       Retrieve a list of all injuries that can be caused by a specific workout.
 *       This endpoint takes a workout ID in the request body and returns all associated injuries.
 *       **Authentication required** - Users must be signed in to access this data.
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
 *                 description: ID of the workout to get injuries for
 *                 example: 1
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Injuries retrieved successfully
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
 *                     workout:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                     injuries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           bodyPart:
 *                             type: string
 *                           severity:
 *                             type: string
 *                           description:
 *                             type: string
 *       400:
 *         description: Validation error - workoutId is required
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Workout not found
 */
router.post(
  '/by-workout',
  authenticate,
  validateGetInjuriesByWorkoutId,
  getInjuriesByWorkoutId
);

/**
 * @swagger
 * /api/v1/injuries/associate:
 *   post:
 *     tags:
 *       - Injuries
 *     summary: Associate an injury with a workout (Admin only)
 *     description: |
 *       Create a relationship between an injury and a workout.
 *       This indicates that the workout can potentially cause the injury.
 *       **Authentication required** - Users must be signed in.
 *       **Admin access only** - Only users with admin role can create associations.
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
 *                 example: 1
 *                 minimum: 1
 *               injuryId:
 *                 type: integer
 *                 description: ID of the injury
 *                 example: 1
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Association created successfully
 *       400:
 *         description: Validation error - Invalid IDs
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Workout or injury not found
 *       409:
 *         description: Conflict - Association already exists
 */
router.post(
  '/associate',
  authenticate,
  authorize('admin'),
  validateAssociateInjuryWithWorkout,
  associateInjuryWithWorkout
);

/**
 * @swagger
 * /api/v1/injuries/{id}:
 *   put:
 *     tags:
 *       - Injuries
 *     summary: Update an injury (Admin only)
 *     description: |
 *       Update an existing injury. All fields are optional - only send fields that need to be updated.
 *       **Authentication required** - Users must be signed in.
 *       **Admin access only** - Only users with admin role can update injuries.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique injury ID to update
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the injury
 *                 example: "Rotator Cuff Tendinopathy"
 *                 minLength: 3
 *                 maxLength: 100
 *               bodyPart:
 *                 type: string
 *                 enum: [chest, back, shoulder, arms, legs, abs, neck, cardio]
 *                 description: Body part affected by the injury
 *                 example: "shoulder"
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe]
 *                 description: Severity level of the injury
 *                 example: "moderate"
 *               description:
 *                 type: string
 *                 description: Detailed description of the injury
 *                 example: "Updated description"
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Injury updated successfully
 *       400:
 *         description: Validation error - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Injury not found
 *       409:
 *         description: Conflict - Injury with this name already exists
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validateUpdateInjury,
  updateInjury
);

/**
 * @swagger
 * /api/v1/injuries/{id}:
 *   delete:
 *     tags:
 *       - Injuries
 *     summary: Delete an injury (Admin only)
 *     description: |
 *       Permanently delete an injury from the database.
 *       This will also remove all associations between this injury and workouts.
 *       **Authentication required** - Users must be signed in.
 *       **Admin access only** - Only users with admin role can delete injuries. This action cannot be undone.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique injury ID to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Injury deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Injury deleted successfully along with its workout associations"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Injury not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateInjuryId,
  deleteInjury
);

/**
 * @swagger
 * /api/v1/injuries/associate:
 *   delete:
 *     tags:
 *       - Injuries
 *     summary: Remove association between injury and workout (Admin only)
 *     description: |
 *       Remove an existing relationship between an injury and a workout.
 *       **Authentication required** - Users must be signed in.
 *       **Admin access only** - Only users with admin role can remove associations.
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
 *                 example: 1
 *                 minimum: 1
 *               injuryId:
 *                 type: integer
 *                 description: ID of the injury
 *                 example: 1
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Association removed successfully
 *       400:
 *         description: Validation error - Invalid IDs
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Association not found
 */
router.delete(
  '/associate',
  authenticate,
  authorize('admin'),
  validateDissociateInjuryFromWorkout,
  dissociateInjuryFromWorkout
);

export default router;