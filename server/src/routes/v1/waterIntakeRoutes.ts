import { Router } from 'express';
import {
  syncWaterIntake,
  addWaterIntake,
  getWaterIntakeStats,
  getWaterIntakeHistory,
  getTodayWaterIntake,
  getWeeklyWaterSummary,
  getMonthlyWaterSummary,
  getUserTotalIntake,
  getUserStreak,
  updateWaterGoal,
} from '../../controllers/waterIntakeController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateSyncWaterIntake,
  validateAddWaterIntake,
  validateUpdateWaterGoal,
  validateWaterIntakeHistory,
  validateWeeklyWaterSummary,
  validateMonthlyWaterSummary,
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/water-intake/sync:
 *   post:
 *     tags:
 *       - Water Intake
 *     summary: Sync water intake
 *     description: Sync the current water intake for the day. Creates or updates the water intake record, updates streak if goal is achieved.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - unit
 *               - date
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *                 description: Amount of water consumed
 *               unit:
 *                 type: string
 *                 enum: [L, ML]
 *                 description: Unit of measurement (L for Liters, ML for Milliliters)
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date in YYYY-MM-DD format
 *               goalInLiters:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 10
 *                 description: Optional custom daily goal in liters (default 2.0)
 *     responses:
 *       200:
 *         description: Water intake synced successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post(
  '/sync',
  validateSyncWaterIntake,
  syncWaterIntake
);

/**
 * @swagger
 * /api/v1/water-intake/add:
 *   post:
 *     tags:
 *       - Water Intake
 *     summary: Add water intake
 *     description: Incrementally add water to today's intake. Creates today's record if it doesn't exist.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - unit
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.001
 *                 maximum: 10
 *                 description: Amount of water to add
 *               unit:
 *                 type: string
 *                 enum: [L, ML]
 *                 description: Unit of measurement (L for Liters, ML for Milliliters)
 *     responses:
 *       200:
 *         description: Water added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post(
  '/add',
  validateAddWaterIntake,
  addWaterIntake
);

/**
 * @swagger
 * /api/v1/water-intake/stats:
 *   get:
 *     tags:
 *       - Water Intake
 *     summary: Get water intake stats
 *     description: Retrieve comprehensive statistics including today's intake, current and longest streaks, total intake, and weekly/monthly chart data.
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
  getWaterIntakeStats
);

/**
 * @swagger
 * /api/v1/water-intake/today:
 *   get:
 *     tags:
 *       - Water Intake
 *     summary: Get today's water intake
 *     description: Retrieve today's water intake record. Returns default values if no intake has been recorded today.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's water intake retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/today',
  getTodayWaterIntake
);

/**
 * @swagger
 * /api/v1/water-intake/weekly-summary:
 *   get:
 *     tags:
 *       - Water Intake
 *     summary: Get weekly summary
 *     description: Retrieve aggregated weekly summary including total intake, completed days, average intake, and best day for the week containing the given date.
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
  validateWeeklyWaterSummary,
  getWeeklyWaterSummary
);

/**
 * @swagger
 * /api/v1/water-intake/monthly-summary:
 *   get:
 *     tags:
 *       - Water Intake
 *     summary: Get monthly summary
 *     description: Retrieve aggregated monthly summary including total intake, completed days, average daily intake, and days with intake.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year (defaults to current year)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month (1-12, defaults to current month)
 *     responses:
 *       200:
 *         description: Monthly summary retrieved successfully
 *       400:
 *         description: Invalid month parameter
 *       401:
 *         description: Authentication required
 */
router.get(
  '/monthly-summary',
  validateMonthlyWaterSummary,
  getMonthlyWaterSummary
);

/**
 * @swagger
 * /api/v1/water-intake/total:
 *   get:
 *     tags:
 *       - Water Intake
 *     summary: Get total water intake
 *     description: Retrieve the total water intake and average daily intake across all time.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total intake retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/total',
  getUserTotalIntake
);

/**
 * @swagger
 * /api/v1/water-intake/streak:
 *   get:
 *     tags:
 *       - Water Intake
 *     summary: Get current streak
 *     description: Retrieve the user's current consecutive days streak of hitting their water intake goal, along with longest streak.
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
 * /api/v1/water-intake/history:
 *   get:
 *     tags:
 *       - Water Intake
 *     summary: Get water intake history
 *     description: Retrieve historical water intake data for a date range. Useful for charts and calendar views. Maximum 90 days per request.
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
 *         description: Intake history retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/history',
  validateWaterIntakeHistory,
  getWaterIntakeHistory
);

/**
 * @swagger
 * /api/v1/water-intake/goal:
 *   put:
 *     tags:
 *       - Water Intake
 *     summary: Update water intake goal
 *     description: Update the daily water intake goal for the current user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goalInLiters
 *             properties:
 *               goalInLiters:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 10
 *                 description: New daily water goal in liters
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
  validateUpdateWaterGoal,
  updateWaterGoal
);

export default router;