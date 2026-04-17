import { Router } from 'express';
import {
  getWorkoutSessions,
  getWorkoutSessionById,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
  getWorkoutSessionStats,
  addSetToWorkoutSession,
  updateWorkoutSessionSet,
  deleteWorkoutSessionSet,
  patchWorkoutSessionDetails
} from '../../controllers/workoutSessionController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateCreateWorkoutSession,
  validateUpdateWorkoutSession,
  validateWorkoutSessionQuery,
  validateWorkoutSessionId,
  validateWorkoutSessionStats,
  validatePatchWorkoutSessionDetails
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

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
 *     WorkoutSessionSet:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         sessionId:
 *           type: integer
 *           example: 1
 *         setNumber:
 *           type: integer
 *           example: 1
 *         reps:
 *           type: integer
 *           example: 15
 *         weight:
 *           type: number
 *           nullable: true
 *           description: Weight in kg. null for bodyweight exercises
 *           example: 20.5
 *         isCompleted:
 *           type: boolean
 *           example: true
 *         completedAt:
 *           type: string
 *           format: date-time
 *         restTimeSeconds:
 *           type: integer
 *           example: 60
 *         notes:
 *           type: string
 *           example: "Felt easy"
 *     
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
 *         totalVolume:
 *           type: number
 *           description: Total volume lifted (sum of weight * reps for all sets)
 *           example: 1815.5
 *         totalSets:
 *           type: integer
 *           example: 3
 *         totalReps:
 *           type: integer
 *           example: 33
 *         maxWeight:
 *           type: number
 *           nullable: true
 *           description: Maximum weight used in any set. null for bodyweight-only workouts
 *           example: 30
 *         completedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-11T14:30:00Z"
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
 *             equipment:
 *               type: string
 *             level:
 *               type: string
 *         sets:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WorkoutSessionSet'
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
 *       Includes workout details and all sets for each session.
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
 *         description: Number of sessions per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sessions from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sessions until this date (YYYY-MM-DD)
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
 *         name: workoutName
 *         schema:
 *           type: string
 *         description: Filter by workout name
 *       - in: query
 *         name: minDuration
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Minimum session duration in minutes
 *       - in: query
 *         name: minVolume
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum total volume
 *       - in: query
 *         name: minSets
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Minimum number of sets
 *     responses:
 *       200:
 *         description: Workout sessions retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/', validateWorkoutSessionQuery, getWorkoutSessions);

/**
 * @swagger
 * /api/v1/workout-sessions/stats:
 *   get:
 *     tags:
 *       - Workout Sessions
 *     summary: Get workout session statistics
 *     description: Retrieve aggregated statistics about the user's workout sessions
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
 *         description: Number of days to include
 *       - in: query
 *         name: includeDistribution
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include workout type distribution
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/stats', validateWorkoutSessionStats, getWorkoutSessionStats);

/**
 * @swagger
 * /api/v1/workout-sessions/{id}:
 *   get:
 *     tags:
 *       - Workout Sessions
 *     summary: Get a workout session by ID
 *     description: Retrieve detailed information including all sets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *     responses:
 *       200:
 *         description: Workout session retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout session not found
 */
router.get('/:id', validateWorkoutSessionId, getWorkoutSessionById);

/**
 * @swagger
 * /api/v1/workout-sessions:
 *   post:
 *     tags:
 *       - Workout Sessions
 *     summary: Create a new workout session with sets
 *     description: |
 *       Log a new workout session with multiple sets.
 *       Each set can have different weight and reps.
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
 *             properties:
 *               workoutId:
 *                 type: integer
 *                 example: 5
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 example: 45
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               sets:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - reps
 *                   properties:
 *                     reps:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 100
 *                       example: 15
 *                     weight:
 *                       type: number
 *                       nullable: true
 *                       minimum: 0
 *                       maximum: 1000
 *                       description: Weight in kg. Set to null for bodyweight exercises
 *                       example: 20
 *                     is_completed:
 *                       type: boolean
 *                       default: true
 *                     completed_at:
 *                       type: string
 *                       format: date-time
 *                     rest_time_seconds:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 600
 *                     notes:
 *                       type: string
 *                       maxLength: 200
 *     responses:
 *       201:
 *         description: Workout session created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout not found
 */
router.post('/', validateCreateWorkoutSession, createWorkoutSession);

/**
 * @swagger
 * /api/v1/workout-sessions/{id}:
 *   put:
 *     tags:
 *       - Workout Sessions
 *     summary: Update a workout session
 *     description: Update session details. Optionally replace all sets.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workoutId:
 *                 type: integer
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               sets:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     reps:
 *                       type: integer
 *                       minimum: 1
 *                     weight:
 *                       type: number
 *                       nullable: true
 *                       minimum: 0
 *                       description: Weight in kg. Set to null for bodyweight exercises
 *                     is_completed:
 *                       type: boolean
 *                     rest_time_seconds:
 *                       type: integer
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Workout session updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout session not found
 */
router.put('/:id', validateUpdateWorkoutSession, updateWorkoutSession);

/**
 * @swagger
 * /api/v1/workout-sessions/{id}:
 *   delete:
 *     tags:
 *       - Workout Sessions
 *     summary: Delete a workout session
 *     description: Permanently delete a workout session and all its sets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *     responses:
 *       200:
 *         description: Workout session deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout session not found
 */
router.delete('/:id', validateWorkoutSessionId, deleteWorkoutSession);

// ============================================================================
// Nested Set Routes (Alternative approach - or use separate router)
// ============================================================================

/**
 * @swagger
 * /api/v1/workout-sessions/{id}/sets:
 *   post:
 *     tags:
 *       - Workout Sessions
 *     summary: Add a set to an existing workout session
 *     description: Add a single set to a workout session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reps
 *             properties:
 *               reps:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *               weight:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *                 description: Weight in kg. Set to null for bodyweight exercises
 *               is_completed:
 *                 type: boolean
 *                 default: true
 *               rest_time_seconds:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 600
 *               notes:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       201:
 *         description: Set added successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout session not found
 */
router.post('/:id/sets', 
  validateWorkoutSessionId, 
  addSetToWorkoutSession
);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/{setId}:
 *   put:
 *     tags:
 *       - Workout Sessions
 *     summary: Update a specific set
 *     description: Update a set within a workout session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reps:
 *                 type: integer
 *                 minimum: 1
 *               weight:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *                 description: Weight in kg. Set to null for bodyweight exercises
 *               is_completed:
 *                 type: boolean
 *               rest_time_seconds:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Set updated successfully
 *       404:
 *         description: Session or set not found
 */
router.put('/:sessionId/sets/:setId', updateWorkoutSessionSet);

/**
 * @swagger
 * /api/v1/workout-sessions/{id}/details:
 *   patch:
 *     tags:
 *       - Workout Sessions
 *     summary: Update only notes and duration (lightweight patch)
 *     description: |
 *       Partially update a workout session's metadata without affecting sets.
 *       This is a lightweight endpoint for quick updates to notes and duration only.
 *       For updating sets, use the dedicated set endpoints.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Session notes or observations
 *                 example: "Felt strong today, increased energy levels"
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 description: Session duration in seconds
 *                 example: 2700
 *           minProperties: 1
 *     responses:
 *       200:
 *         description: Workout session details updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout session not found
 */
router.patch(
  '/:id/details',
  validatePatchWorkoutSessionDetails,
  patchWorkoutSessionDetails
);


/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/{setId}:
 *   delete:
 *     tags:
 *       - Workout Sessions
 *     summary: Delete a specific set
 *     description: Delete a set from a workout session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Set deleted successfully
 *       404:
 *         description: Session or set not found
 */
router.delete('/:sessionId/sets/:setId', deleteWorkoutSessionSet);

export default router;