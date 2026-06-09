import { Router } from 'express';
import {
  getAllPersonalBests,
  getPersonalBestByWorkout,
} from '../../controllers/personalBestController.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/v1/personal-bests:
 *   get:
 *     tags:
 *       - Personal Bests
 *     summary: Get all personal bests for the authenticated user
 *     description: |
 *       Retrieve all personal best records for the currently authenticated user across all workouts.
 *       Personal bests are automatically recorded and updated whenever a user completes a workout session
 *       with a higher weight or more reps than their previous best for that exercise.
 *       Results are ordered by most recently achieved first.
 *       **Authentication required** - Users must be signed in to access personal bests.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal bests retrieved successfully
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
 *                       workoutId:
 *                         type: integer
 *                         example: 12
 *                       exerciseName:
 *                         type: string
 *                         example: "Incline Barbell Press"
 *                       bodyPart:
 *                         type: string
 *                         example: "chest"
 *                         nullable: true
 *                       targetArea:
 *                         type: string
 *                         example: "upper chest"
 *                         nullable: true
 *                       gifLink:
 *                         type: string
 *                         example: "https://your-bucket.s3.amazonaws.com/workouts/exercise.gif"
 *                         nullable: true
 *                       equipment:
 *                         type: string
 *                         example: "barbell"
 *                         nullable: true
 *                       level:
 *                         type: string
 *                         example: "intermediate"
 *                         nullable: true
 *                       weight:
 *                         type: number
 *                         format: float
 *                         example: 100.0
 *                         nullable: true
 *                         description: Weight in kg. Null for bodyweight exercises.
 *                       reps:
 *                         type: integer
 *                         example: 8
 *                         description: Number of reps performed at the best weight. For bodyweight exercises, this is the highest rep count achieved.
 *                       isBodyweight:
 *                         type: boolean
 *                         example: false
 *                         description: True if this personal best was achieved without added weight.
 *                       displayValue:
 *                         type: string
 *                         example: "100 kg × 8"
 *                         description: Human-readable formatted value. e.g. "100 kg × 8" or "Bodyweight × 15".
 *                       achievedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-03-15T10:30:00.000Z"
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
router.get('/', authenticate, getAllPersonalBests);

/**
 * @swagger
 * /api/v1/personal-bests/{workoutId}:
 *   get:
 *     tags:
 *       - Personal Bests
 *     summary: Get personal best for a specific workout
 *     description: |
 *       Retrieve the personal best record for a specific workout exercise for the authenticated user.
 *       Returns `null` in the data field if the user has not yet completed any session for this workout —
 *       this is a valid state and should be handled on the client as an empty/no-record state rather than an error.
 *       **Authentication required** - Users must be signed in to access personal bests.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workoutId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique workout ID to get the personal best for
 *         example: 12
 *     responses:
 *       200:
 *         description: Personal best retrieved successfully (or null if no record exists yet)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   nullable: true
 *                   description: Personal best record, or null if no sessions have been completed for this workout yet.
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     workoutId:
 *                       type: integer
 *                       example: 12
 *                     exerciseName:
 *                       type: string
 *                       example: "Incline Barbell Press"
 *                     bodyPart:
 *                       type: string
 *                       example: "chest"
 *                       nullable: true
 *                     targetArea:
 *                       type: string
 *                       example: "upper chest"
 *                       nullable: true
 *                     gifLink:
 *                       type: string
 *                       example: "https://your-bucket.s3.amazonaws.com/workouts/exercise.gif"
 *                       nullable: true
 *                     equipment:
 *                       type: string
 *                       example: "barbell"
 *                       nullable: true
 *                     level:
 *                       type: string
 *                       example: "intermediate"
 *                       nullable: true
 *                     weight:
 *                       type: number
 *                       format: float
 *                       example: 100.0
 *                       nullable: true
 *                       description: Weight in kg. Null for bodyweight exercises.
 *                     reps:
 *                       type: integer
 *                       example: 8
 *                       description: Number of reps performed at the best weight. For bodyweight exercises, this is the highest rep count achieved.
 *                     isBodyweight:
 *                       type: boolean
 *                       example: false
 *                       description: True if this personal best was achieved without added weight.
 *                     displayValue:
 *                       type: string
 *                       example: "100 kg × 8"
 *                       description: Human-readable formatted value. e.g. "100 kg × 8" or "Bodyweight × 15".
 *                     achievedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-03-15T10:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "No personal best recorded yet for this workout"
 *                   description: Only present when data is null.
 *       400:
 *         description: Bad request - Invalid workout ID format
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
 *                   example: "Invalid workout ID"
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
router.get('/:workoutId', authenticate, getPersonalBestByWorkout);

export default router;