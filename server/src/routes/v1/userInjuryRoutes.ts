import { Router } from 'express';
import {
  addUserInjury,
  getUserInjuries,
  getUserInjuryById,
  removeUserInjury,
  checkUserInjury,
  bulkAddUserInjuries,
  getUserInjuryStatistics,
  getAggravatingWorkouts,
} from '../../controllers/userInjuryController.js';
import { authenticate } from '../../middleware/auth.js';
import {
  validateCreateUserInjury,
  validateDeleteUserInjury,
  validateGetUserInjuryById,
  validateCheckUserInjury,
  validateBulkCreateUserInjuries,
  validateGetUserInjuries,
  validateGetUserInjuryStatistics,
  validateGetAggravatingWorkouts,
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: User Injuries
 *   description: User injury tracking and management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Injury:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Rotator Cuff Tendinopathy"
 *         bodyPart:
 *           type: string
 *           enum: [chest, back, shoulder, arms, legs, abs, neck, cardio]
 *           example: "shoulder"
 *         severity:
 *           type: string
 *           enum: [mild, moderate, severe]
 *           example: "mild"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Overuse injury from repetitive overhead pressing"
 *     
 *     UserInjury:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 42
 *         injuryId:
 *           type: integer
 *           example: 5
 *         createdAt:
 *           type: string
 *           format: date-time
 *         injury:
 *           $ref: '#/components/schemas/Injury'
 *     
 *     AggravatingWorkout:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Flat Barbell Bench Press"
 *         body_part:
 *           type: string
 *           example: "chest"
 *         target_area:
 *           type: string
 *           example: "Middle Chest"
 *         equipment:
 *           type: string
 *           example: "Barbell"
 *         level:
 *           type: string
 *           example: "Intermediate"
 *         relatedInjuries:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               severity:
 *                 type: string
 */

/**
 * @swagger
 * /api/v1/user-injuries:
 *   get:
 *     tags:
 *       - User Injuries
 *     summary: Get all injuries for the authenticated user
 *     description: |
 *       Retrieve a paginated list of the user's injuries with advanced filtering options.
 *       Includes injury details and optionally the workouts that cause them.
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
 *         description: Number of injuries per page
 *       - in: query
 *         name: bodyPart
 *         schema:
 *           type: string
 *           enum: [chest, back, shoulder, arms, legs, abs, neck, cardio]
 *         description: Filter injuries by body part
 *         example: "shoulder"
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [mild, moderate, severe]
 *         description: Filter injuries by severity level
 *         example: "moderate"
 *       - in: query
 *         name: includeWorkouts
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include workouts that can cause these injuries
 *         example: "true"
 *     responses:
 *       200:
 *         description: User injuries retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/', validateGetUserInjuries, getUserInjuries);

/**
 * @swagger
 * /api/v1/user-injuries/statistics:
 *   get:
 *     tags:
 *       - User Injuries
 *     summary: Get user injury statistics
 *     description: |
 *       Retrieve aggregated statistics about the user's injuries including breakdown by body part and severity.
 *       Useful for dashboards and health insights.
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
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
 *       401:
 *         description: Authentication required
 */
router.get('/statistics', validateGetUserInjuryStatistics, getUserInjuryStatistics);

/**
 * @swagger
 * /api/v1/user-injuries/aggravating-workouts:
 *   get:
 *     tags:
 *       - User Injuries
 *     summary: Get workouts that may aggravate user's injuries
 *     description: |
 *       Retrieve a list of workouts that are associated with the user's injuries.
 *       Each workout includes which specific injuries it may aggravate.
 *       Useful for injury prevention and workout recommendations.
 *     security:
 *       - bearerAuth: []
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalWorkouts:
 *                       type: integer
 *                     workouts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AggravatingWorkout'
 *       401:
 *         description: Authentication required
 */
router.get('/aggravating-workouts', validateGetAggravatingWorkouts, getAggravatingWorkouts);

/**
 * @swagger
 * /api/v1/user-injuries/check/{injuryId}:
 *   get:
 *     tags:
 *       - User Injuries
 *     summary: Check if user has a specific injury
 *     description: |
 *       Quick check endpoint to verify if the authenticated user has a particular injury.
 *       Returns a boolean indicating presence and the record ID if found.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: injuryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Injury ID to check
 *         example: 1
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
 *                     hasInjury:
 *                       type: boolean
 *                     userInjuryId:
 *                       type: integer
 *                       nullable: true
 *                     injuryId:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Injury not found
 */
router.get('/check/:injuryId', validateCheckUserInjury, checkUserInjury);

/**
 * @swagger
 * /api/v1/user-injuries/{id}:
 *   get:
 *     tags:
 *       - User Injuries
 *     summary: Get a user injury record by ID
 *     description: Retrieve detailed information about a specific user injury record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User injury record ID
 *     responses:
 *       200:
 *         description: User injury retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User injury record not found
 */
router.get('/:id', validateGetUserInjuryById, getUserInjuryById);

/**
 * @swagger
 * /api/v1/user-injuries:
 *   post:
 *     tags:
 *       - User Injuries
 *     summary: Add an injury to the user
 *     description: |
 *       Add a new injury record for the authenticated user.
 *       Prevents duplicate injuries from being added.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - injuryId
 *             properties:
 *               injuryId:
 *                 type: integer
 *                 description: ID of the injury to add
 *                 example: 1
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Injury added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Injury not found
 *       409:
 *         description: User already has this injury
 */
router.post('/', validateCreateUserInjury, addUserInjury);

/**
 * @swagger
 * /api/v1/user-injuries/bulk:
 *   post:
 *     tags:
 *       - User Injuries
 *     summary: Add multiple injuries to the user
 *     description: |
 *       Add multiple injury records for the authenticated user in a single request.
 *       Skips any injuries that the user already has.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - injuryIds
 *             properties:
 *               injuryIds:
 *                 type: array
 *                 description: Array of injury IDs to add
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *                 minItems: 1
 *     responses:
 *       201:
 *         description: Injuries added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: One or more injuries not found
 *       409:
 *         description: All specified injuries already exist
 */
router.post('/bulk', validateBulkCreateUserInjuries, bulkAddUserInjuries);

/**
 * @swagger
 * /api/v1/user-injuries/{injuryId}:
 *   delete:
 *     tags:
 *       - User Injuries
 *     summary: Remove an injury from the user
 *     description: |
 *       Removes an injury from the authenticated user's injury list.
 *       This is a hard delete from the junction table.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: injuryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Injury ID to remove
 *         example: 1
 *     responses:
 *       200:
 *         description: Injury removed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User injury record not found
 */
router.delete('/:injuryId', validateDeleteUserInjury, removeUserInjury);

export default router;