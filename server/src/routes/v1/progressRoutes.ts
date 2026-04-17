import { Router } from 'express';
import { getProgressDashboard, getMetricsHistory } from '../../controllers/progressController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateProgressHistoryQuery,
  validateProgressDashboardQuery,
} from '../../middleware/validations/index.js';

const router = Router();

router.use(authenticate)

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: User progress dashboard and metrics endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProgressMetrics:
 *       type: object
 *       properties:
 *         strength:
 *           type: number
 *           example: 8.2
 *         endurance:
 *           type: number
 *           example: 6.5
 *         consistency:
 *           type: number
 *           example: 9.0
 *         volume:
 *           type: number
 *           example: 7.1
 *         progress:
 *           type: number
 *           example: 8.5
 *         habits:
 *           type: number
 *           example: 7.5
 *     
 *     TrainingData:
 *       type: object
 *       properties:
 *         totalWorkouts:
 *           type: integer
 *           example: 48
 *         weeklyAvg:
 *           type: number
 *           example: 4.2
 *         currentStreak:
 *           type: integer
 *           example: 12
 *         longestStreak:
 *           type: integer
 *           example: 21
 *         totalVolume:
 *           type: number
 *           example: 84500
 *         personalBests:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               exercise:
 *                 type: string
 *                 example: "Bench Press"
 *               value:
 *                 type: string
 *                 example: "120 kg"
 *     
 *     ProgressDashboard:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "John"
 *         joinedDate:
 *           type: string
 *           example: "Jan 24"
 *         avatarUrl:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/avatar.jpg"
 *         currentPoints:
 *           type: integer
 *           example: 2840
 *         maxPoints:
 *           type: integer
 *           example: 10000
 *         badgeLevel:
 *           type: integer
 *           example: 2
 *         metrics:
 *           $ref: '#/components/schemas/ProgressMetrics'
 *         trainingData:
 *           $ref: '#/components/schemas/TrainingData'
 *     
 *     MetricsHistory:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-03-17"
 *         fitnessScore:
 *           type: integer
 *           example: 3420
 *         strength:
 *           type: number
 *           example: 8.2
 *         endurance:
 *           type: number
 *           example: 6.5
 *         consistency:
 *           type: number
 *           example: 9.0
 *         volume:
 *           type: number
 *           example: 7.1
 *         progress:
 *           type: number
 *           example: 8.5
 *         habits:
 *           type: number
 *           example: 7.5
 */

/**
 * @swagger
 * /api/v1/progress/dashboard:
 *   get:
 *     tags:
 *       - Progress
 *     summary: Get user progress dashboard data
 *     description: |
 *       Retrieve all data needed for the GymProgressScreen including:
 *       - User profile information
 *       - Current fitness metrics
 *       - Points and badge level
 *       - Training statistics
 *       - Personal bests
 *       
 *       Optional: Include historical data by using query parameters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include historical metrics in the response
 *         example: true
 *       - in: query
 *         name: historyDays
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days of history to include (if includeHistory=true)
 *         example: 30
 *     responses:
 *       200:
 *         description: Progress dashboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProgressDashboard'
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
 *       404:
 *         description: User not found
 */
router.get('/dashboard', validateProgressDashboardQuery, getProgressDashboard);

/**
 * @swagger
 * /api/v1/progress/history:
 *   get:
 *     tags:
 *       - Progress
 *     summary: Get historical metrics for charts
 *     description: |
 *       Retrieve historical fitness metrics for charts and trend analysis.
 *       Returns daily snapshots of all metrics over the specified time period.
 *       
 *       **Features:**
 *       - Filter by date range (startDate/endDate) or number of days
 *       - Select specific metrics to return
 *       - Aggregate by daily, weekly, or monthly format
 *       - Max 365 days of history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days of history to return (alternative to startDate/endDate)
 *         example: 30
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for history range (YYYY-MM-DD)
 *         example: "2026-02-17"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for history range (YYYY-MM-DD, defaults to today)
 *         example: "2026-03-17"
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: string
 *         description: Comma-separated list of metrics to return (fitnessScore,strength,endurance,consistency,volume,progress,habits)
 *         example: "fitnessScore,strength,endurance"
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation format for the data
 *         example: "weekly"
 *     responses:
 *       200:
 *         description: Metrics history retrieved successfully
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
 *                     $ref: '#/components/schemas/MetricsHistory'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalDays:
 *                       type: integer
 *                       example: 30
 *                     metricsIncluded:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["fitnessScore", "strength", "endurance"]
 *                     format:
 *                       type: string
 *                       example: "daily"
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
 */
router.get('/history', validateProgressHistoryQuery, getMetricsHistory);

export default router;