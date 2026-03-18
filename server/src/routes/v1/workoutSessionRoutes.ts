import { Router } from 'express';
import {
  getWorkoutSessions,
  getWorkoutSessionById,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
  getWorkoutSessionStats,
} from '../../controllers/workoutSessionController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateCreateWorkoutSession,
  validateUpdateWorkoutSession,
  validateWorkoutSessionQuery,
  validateWorkoutSessionId,
} from '../../middleware/validations/index.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Workout Sessions
 *   description: Workout session tracking and management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkoutSession:
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
 *         duration:
 *           type: integer
 *           description: Duration in minutes
 *           example: 45
 *         volume:
 *           type: number
 *           description: Total volume lifted (weight * reps * sets) in kg
 *           example: 1815.5
 *         sets:
 *           type: integer
 *           example: 3
 *         reps:
 *           type: integer
 *           example: 10
 *         weight:
 *           type: number
 *           description: Weight per set in kg
 *           example: 60.5
 *         completedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-03-17T14:30:00Z"
 *         notes:
 *           type: string
 *           example: "Felt strong today, increased weight"
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
 *             gif_link:
 *               type: string
 *     
 *     WorkoutSessionStats:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             totalSessions:
 *               type: integer
 *             totalDuration:
 *               type: integer
 *             totalVolume:
 *               type: number
 *             averageDuration:
 *               type: integer
 *             averageVolume:
 *               type: number
 *         chartData:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               sessions:
 *                 type: integer
 *               duration:
 *                 type: integer
 *               volume:
 *                 type: number
 */

/**
 * @swagger
 * /api/v1/workout-sessions:
 *   get:
 *     tags:
 *       - Workout Sessions
 *     summary: Get all workout sessions for the authenticated user
 *     description: |
 *       Retrieve a paginated list of the user's workout sessions with advanced filtering options.
 *       
 *       **Features:**
 *       - Pagination with page and limit parameters
 *       - Filter by date range (startDate/endDate)
 *       - Text search on workout details (bodyPart, targetArea, workoutName)
 *       - Filter by minimum duration or volume
 *       - Includes workout details in response
 *       - Sorted by most recent first
 *       
 *       **Authentication required** - Users can only access their own workout sessions.
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
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of sessions per page (max 100)
 *         example: 20
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sessions from this date (YYYY-MM-DD)
 *         example: "2026-03-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sessions until this date (YYYY-MM-DD)
 *         example: "2026-03-17"
 *       - in: query
 *         name: bodyPart
 *         schema:
 *           type: string
 *         description: Filter by body part (partial match, case-insensitive)
 *         example: "chest"
 *       - in: query
 *         name: targetArea
 *         schema:
 *           type: string
 *         description: Filter by target area (partial match, case-insensitive)
 *         example: "upper chest"
 *       - in: query
 *         name: workoutName
 *         schema:
 *           type: string
 *         description: Filter by workout name (partial match, case-insensitive)
 *         example: "press"
 *       - in: query
 *         name: minDuration
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Minimum session duration in minutes
 *         example: 30
 *       - in: query
 *         name: minVolume
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum total volume lifted (kg)
 *         example: 1000
 *     responses:
 *       200:
 *         description: Workout sessions retrieved successfully
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
 *                     $ref: '#/components/schemas/WorkoutSession'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 45
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Validation error - Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 */
router.get('/', authenticate, validateWorkoutSessionQuery, getWorkoutSessions);

/**
 * @swagger
 * /api/v1/workout-sessions/stats:
 *   get:
 *     tags:
 *       - Workout Sessions
 *     summary: Get workout session statistics
 *     description: |
 *       Retrieve aggregated statistics about the user's workout sessions over a specified time period.
 *       
 *       **Returns:**
 *       - Summary statistics (total sessions, duration, volume, averages)
 *       - Chart data grouped by date for visualizations
 *       
 *       **Authentication required** - Users can only access their own statistics.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to include in statistics (max 365)
 *         example: 30
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
 *                   $ref: '#/components/schemas/WorkoutSessionStats'
 *       400:
 *         description: Validation error - Invalid days parameter
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/stats', authenticate, getWorkoutSessionStats);

/**
 * @swagger
 * /api/v1/workout-sessions/{id}:
 *   get:
 *     tags:
 *       - Workout Sessions
 *     summary: Get a workout session by ID
 *     description: |
 *       Retrieve detailed information about a specific workout session including the associated workout details.
 *       
 *       **Authentication required** - Users can only access their own sessions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Workout session retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WorkoutSession'
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Workout session not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Workout session not found"
 */
router.get('/:id', authenticate, validateWorkoutSessionId, getWorkoutSessionById);

/**
 * @swagger
 * /api/v1/workout-sessions:
 *   post:
 *     tags:
 *       - Workout Sessions
 *     summary: Create a new workout session
 *     description: |
 *       Log a new workout session. This will automatically:
 *       - Calculate total volume if not provided (weight * reps * sets)
 *       - Update the user's fitness metrics and streaks
 *       - Track personal bests if applicable
 *       
 *       **Authentication required** - Users can only create sessions for themselves.
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
 *               - duration
 *               - sets
 *               - reps
 *               - weight
 *             properties:
 *               workoutId:
 *                 type: integer
 *                 description: ID of the workout performed
 *                 example: 5
 *               duration:
 *                 type: integer
 *                 description: Session duration in minutes
 *                 minimum: 1
 *                 example: 45
 *               sets:
 *                 type: integer
 *                 description: Number of sets performed
 *                 minimum: 1
 *                 example: 3
 *               reps:
 *                 type: integer
 *                 description: Number of reps per set
 *                 minimum: 1
 *                 example: 10
 *               weight:
 *                 type: number
 *                 description: Weight used per set in kg
 *                 minimum: 0
 *                 example: 60.5
 *               volume:
 *                 type: number
 *                 description: Optional - Total volume (if not provided, calculated as weight * reps * sets)
 *                 example: 1815
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional - When the session was completed (defaults to now)
 *                 example: "2026-03-17T14:30:00Z"
 *               notes:
 *                 type: string
 *                 description: Optional notes about the session
 *                 maxLength: 500
 *                 example: "Felt strong today, could have done more"
 *     responses:
 *       201:
 *         description: Workout session created successfully
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
 *                   example: "Workout session created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/WorkoutSession'
 *       400:
 *         description: Validation error - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Workout not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Workout not found"
 */
router.post('/', authenticate, validateCreateWorkoutSession, createWorkoutSession);

/**
 * @swagger
 * /api/v1/workout-sessions/{id}:
 *   put:
 *     tags:
 *       - Workout Sessions
 *     summary: Update a workout session
 *     description: |
 *       Update an existing workout session. All fields are optional - only send fields that need to be updated.
 *       
 *       **Automatic updates:**
 *       - Volume will be recalculated if weight, reps, or sets change
 *       - User metrics will be updated in the background
 *       
 *       **Authentication required** - Users can only update their own sessions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID to update
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workoutId:
 *                 type: integer
 *                 description: ID of the workout performed
 *                 example: 5
 *               duration:
 *                 type: integer
 *                 description: Session duration in minutes
 *                 minimum: 1
 *                 example: 45
 *               sets:
 *                 type: integer
 *                 description: Number of sets performed
 *                 minimum: 1
 *                 example: 3
 *               reps:
 *                 type: integer
 *                 description: Number of reps per set
 *                 minimum: 1
 *                 example: 10
 *               weight:
 *                 type: number
 *                 description: Weight used per set in kg
 *                 minimum: 0
 *                 example: 60.5
 *               volume:
 *                 type: number
 *                 description: Total volume (if not provided, auto-calculated)
 *                 example: 1815
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *                 description: When the session was completed
 *                 example: "2026-03-17T14:30:00Z"
 *               notes:
 *                 type: string
 *                 description: Notes about the session
 *                 maxLength: 500
 *                 example: "Updated notes - felt even stronger"
 *     responses:
 *       200:
 *         description: Workout session updated successfully
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
 *                   example: "Workout session updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/WorkoutSession'
 *       400:
 *         description: Validation error - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Workout session not found
 */
router.put('/:id', authenticate, validateUpdateWorkoutSession, updateWorkoutSession);

/**
 * @swagger
 * /api/v1/workout-sessions/{id}:
 *   delete:
 *     tags:
 *       - Workout Sessions
 *     summary: Delete a workout session
 *     description: |
 *       Permanently delete a workout session. This will automatically:
 *       - Remove the session from history
 *       - Recalculate user metrics and streaks
 *       - Update personal bests if affected
 *       
 *       **Authentication required** - Users can only delete their own sessions.
 *       **Note:** This action cannot be undone.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Workout session deleted successfully
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
 *                   example: "Workout session deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Workout session not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Workout session not found"
 */
router.delete('/:id', authenticate, validateWorkoutSessionId, deleteWorkoutSession);

export default router;