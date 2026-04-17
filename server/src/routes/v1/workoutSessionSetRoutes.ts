import { Router } from 'express';
import {
  getSessionSets,
  getSetById,
  addSetToWorkoutSession,
  bulkAddSetsToWorkoutSession,
  updateWorkoutSessionSet,
  bulkUpdateSets,
  markSetCompleted,
  deleteWorkoutSessionSet,
  reorderSets,
  getSetStatistics,
} from '../../controllers/workoutSessionSetController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateAddSetToWorkoutSession,
  validateUpdateWorkoutSessionSet,
  validateDeleteWorkoutSessionSet,
  validateGetWorkoutSessionSet,
  validateGetSessionSets,
  validateBulkAddSetsToWorkoutSession,
  validateBulkUpdateSets,
  validateReorderSets,
  validateMarkSetCompleted,
} from '../../middleware/validations/index.js';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Workout Session Sets
 *   description: Individual set management within workout sessions
 */

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets:
 *   get:
 *     tags:
 *       - Workout Session Sets
 *     summary: Get all sets for a workout session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *       - in: query
 *         name: completed
 *         schema:
 *           type: boolean
 *         description: Filter by completion status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Limit number of sets returned
 *     responses:
 *       200:
 *         description: Sets retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout session not found
 */
router.get('/', validateGetSessionSets, getSessionSets);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/stats:
 *   get:
 *     tags:
 *       - Workout Session Sets
 *     summary: Get detailed set statistics for a session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Workout session ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Workout session not found
 */
router.get('/stats', getSetStatistics);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/{setId}:
 *   get:
 *     tags:
 *       - Workout Session Sets
 *     summary: Get a single set by ID
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
 *         description: Set retrieved successfully
 *       404:
 *         description: Session or set not found
 */
router.get('/:setId', validateGetWorkoutSessionSet, getSetById);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets:
 *   post:
 *     tags:
 *       - Workout Session Sets
 *     summary: Add a single set to a workout session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
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
 *                 maximum: 1000
 *                 description: Weight in kg. Set to null for bodyweight exercises
 *               is_completed:
 *                 type: boolean
 *                 default: true
 *               completed_at:
 *                 type: string
 *                 format: date-time
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
 *       404:
 *         description: Workout session not found
 */
router.post('/', validateAddSetToWorkoutSession, addSetToWorkoutSession);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/bulk:
 *   post:
 *     tags:
 *       - Workout Session Sets
 *     summary: Add multiple sets to a workout session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sets
 *             properties:
 *               sets:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   required:
 *                     - reps
 *                   properties:
 *                     reps:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 100
 *                     weight:
 *                       type: number
 *                       nullable: true
 *                       minimum: 0
 *                       description: Weight in kg. Set to null for bodyweight exercises
 *                     is_completed:
 *                       type: boolean
 *                       default: true
 *                     rest_time_seconds:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 600
 *                     notes:
 *                       type: string
 *                       maxLength: 200
 *     responses:
 *       201:
 *         description: Sets added successfully
 *       404:
 *         description: Workout session not found
 */
router.post('/bulk', validateBulkAddSetsToWorkoutSession, bulkAddSetsToWorkoutSession);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/{setId}:
 *   put:
 *     tags:
 *       - Workout Session Sets
 *     summary: Update a specific set
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
 *                 maximum: 100
 *               weight:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *                 description: Weight in kg. Set to null for bodyweight exercises
 *               is_completed:
 *                 type: boolean
 *               rest_time_seconds:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 600
 *               notes:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Set updated successfully
 *       404:
 *         description: Session or set not found
 */
router.put('/:setId', validateUpdateWorkoutSessionSet, updateWorkoutSessionSet);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/{setId}/complete:
 *   patch:
 *     tags:
 *       - Workout Session Sets
 *     summary: Mark a set as completed
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
 *               completed_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Set marked as completed
 *       400:
 *         description: Set already completed
 *       404:
 *         description: Session or set not found
 */
router.patch('/:setId/complete', validateMarkSetCompleted, markSetCompleted);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/bulk:
 *   put:
 *     tags:
 *       - Workout Session Sets
 *     summary: Update multiple sets at once
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sets
 *             properties:
 *               sets:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                   properties:
 *                     id:
 *                       type: integer
 *                     reps:
 *                       type: integer
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
 *         description: Sets updated successfully
 *       404:
 *         description: Workout session not found
 */
router.put('/bulk', validateBulkUpdateSets, bulkUpdateSets);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/reorder:
 *   put:
 *     tags:
 *       - Workout Session Sets
 *     summary: Reorder sets in a session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - setOrder
 *             properties:
 *               setOrder:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: integer
 *                 description: Array of set IDs in desired order
 *     responses:
 *       200:
 *         description: Sets reordered successfully
 *       400:
 *         description: Invalid set order
 *       404:
 *         description: Workout session not found
 */
router.put('/reorder', validateReorderSets, reorderSets);

/**
 * @swagger
 * /api/v1/workout-sessions/{sessionId}/sets/{setId}:
 *   delete:
 *     tags:
 *       - Workout Session Sets
 *     summary: Delete a specific set
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
router.delete('/:setId', validateDeleteWorkoutSessionSet, deleteWorkoutSessionSet);

export default router;