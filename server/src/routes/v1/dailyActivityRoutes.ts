import { Router } from 'express';
import {
  syncDailyActivity,
  getDailyActivityStats,
  getDailyActivityHistory,
  getTodayActivity,
  getWeeklySummary,
  getUserTotalPoints,
  getUserStreak,
  updateDailyGoal,
  getDailyGoal,
} from '../../controllers/dailyActivityController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateSyncDailyActivity,
  validateUpdateDailyGoal,
  validateDailyActivityHistory,
  validateWeeklySummary,
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/daily-active/sync:
 *   post:
 *     tags:
 *       - Daily Activity
 *     summary: Sync daily steps
 *     description: Sync the current step count for the day. Creates or updates the daily activity record, awards points if goal is achieved, and updates the streak.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - steps
 *               - date
 *             properties:
 *               steps:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100000
 *                 description: Current step count for the day
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Steps synced successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post(
  '/sync',
  validateSyncDailyActivity,
  syncDailyActivity
);

/**
 * @swagger
 * /api/v1/daily-active/stats:
 *   get:
 *     tags:
 *       - Daily Activity
 *     summary: Get activity stats
 *     description: Retrieve comprehensive statistics including today's activity, current and longest streaks, total steps, and weekly/monthly chart data.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/stats',
  getDailyActivityStats
);

/**
 * @swagger
 * /api/v1/daily-active/today:
 *   get:
 *     tags:
 *       - Daily Activity
 *     summary: Get today's activity
 *     description: Retrieve today's daily activity record. Returns null if no activity has been synced today.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's activity retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/today',
  getTodayActivity
);

/**
 * @swagger
 * /api/v1/daily-active/weekly-summary:
 *   get:
 *     tags:
 *       - Daily Activity
 *     summary: Get weekly summary
 *     description: Retrieve aggregated weekly summary including total steps, completed days, and average steps for the week containing the given date.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Any date within the target week (YYYY-MM-DD). Defaults to today.
 *     responses:
 *       200:
 *         description: Weekly summary retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/weekly-summary',
  validateWeeklySummary,
  getWeeklySummary
);

/**
 * @swagger
 * /api/v1/daily-active/points:
 *   get:
 *     tags:
 *       - Daily Activity
 *     summary: Get total points
 *     description: Retrieve the total points earned by the user across all daily activities.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total points retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/points',
  getUserTotalPoints
);

/**
 * @swagger
 * /api/v1/daily-active/streak:
 *   get:
 *     tags:
 *       - Daily Activity
 *     summary: Get current streak
 *     description: Retrieve the user's current consecutive days streak of hitting their step goal.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Streak retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/streak',
  getUserStreak
);

/**
 * @swagger
 * /api/v1/daily-active/history:
 *   get:
 *     tags:
 *       - Daily Activity
 *     summary: Get activity history
 *     description: Retrieve historical daily activity data for a date range. Useful for charts and calendar views. Maximum 90 days per request.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 90
 *         description: Maximum number of days to return (max 90)
 *     responses:
 *       200:
 *         description: Activity history retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/history',
  validateDailyActivityHistory,
  getDailyActivityHistory
);

/**
 * @swagger
 * /api/v1/daily-active/goal:
 *   put:
 *     tags:
 *       - Daily Activity
 *     summary: Update daily step goal
 *     description: Update the daily step goal for the current user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goal
 *             properties:
 *               goal:
 *                 type: integer
 *                 minimum: 1000
 *                 maximum: 50000
 *                 description: New daily step goal
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional date to update goal for (defaults to today)
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.put(
  '/goal',
  validateUpdateDailyGoal,
  updateDailyGoal
);

/**
 * @swagger
 * /api/v1/daily-active/goal:
 *   get:
 *     tags:
 *       - Daily Activity
 *     summary: Get current step goal
 *     description: Retrieve the user's current daily step goal.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Goal retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/goal',
  getDailyGoal
);

export default router;