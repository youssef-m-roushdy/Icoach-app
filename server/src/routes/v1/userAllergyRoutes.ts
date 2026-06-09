import { Router } from 'express';
import {
  addUserAllergy,
  getUserAllergies,
  getUserAllergyById,
  deleteUserAllergy,
  checkUserAllergy,
  bulkAddUserAllergies,
  getUserAllergyStatistics,
  getFoodsWithUserAllergens,
  updateUserAllergy,
} from '../../controllers/UserAllergyController.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  validateCreateUserAllergy,
  validateUpdateUserAllergy,
  validateDeleteUserAllergy,
  validateGetUserAllergyById,
  validateCheckUserAllergy,
  validateBulkCreateUserAllergies,
  validateGetUserAllergies,
  validateGetUserAllergyStatistics,
  validateGetFoodsWithUserAllergens,
} from '../../middleware/validations/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: User Allergies
 *   description: User allergy tracking and management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserAllergy:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: User allergy record ID
 *           example: 1
 *         userId:
 *           type: integer
 *           description: User ID
 *           example: 42
 *         allergenId:
 *           type: integer
 *           description: Allergen ID
 *           example: 1
 *         severity:
 *           type: string
 *           enum: [mild, moderate, severe, life_threatening]
 *           description: Severity of the allergy
 *           example: "moderate"
 *         reaction:
 *           type: string
 *           nullable: true
 *           description: Typical reaction symptoms
 *           example: "Hives, swelling, difficulty breathing"
 *         diagnosisDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Date of diagnosis
 *           example: "2020-01-15"
 *         diagnosedBy:
 *           type: string
 *           nullable: true
 *           description: Healthcare provider who diagnosed
 *           example: "Dr. Smith"
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes about the allergy
 *           example: "Requires epinephrine pen"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         allergen:
 *           $ref: '#/components/schemas/Allergen'
 *     
 *     Allergen:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/user-allergies:
 *   get:
 *     tags:
 *       - User Allergies
 *     summary: Get all allergies for the authenticated user
 *     description: |
 *       Retrieve a paginated list of the user's allergies with optional filtering.
 *       **Authentication required** - Users must be signed in to access their allergy data.
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
 *         description: Number of allergies per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, medication, environmental]
 *         description: Filter by allergen category
 *         example: "food"
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [mild, moderate, severe, life_threatening]
 *         description: Filter by allergy severity
 *         example: "moderate"
 *     responses:
 *       200:
 *         description: User allergies retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/', validateGetUserAllergies, asyncHandler(getUserAllergies));

/**
 * @swagger
 * /api/v1/user-allergies/statistics:
 *   get:
 *     tags:
 *       - User Allergies
 *     summary: Get user allergy statistics
 *     description: |
 *       Retrieve aggregated statistics about the user's allergies.
 *       Returns breakdown by category and severity.
 *       **Authentication required** - Users must be signed in to access their allergy data.
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
 *                     byCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
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
 *                     allergens:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/statistics', validateGetUserAllergyStatistics, asyncHandler(getUserAllergyStatistics));

/**
 * @swagger
 * /api/v1/user-allergies/foods-with-allergens:
 *   get:
 *     tags:
 *       - User Allergies
 *     summary: Get foods that contain user's allergens
 *     description: |
 *       Retrieve all foods that contain any of the user's allergens.
 *       Useful for allergy warnings and dietary recommendations.
 *       **Authentication required** - Users must be signed in to access their allergy data.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Foods retrieved successfully
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
 *                     hasAllergies:
 *                       type: boolean
 *                     totalFoods:
 *                       type: integer
 *                     foods:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           food:
 *                             $ref: '#/components/schemas/Food'
 *                           allergens:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Allergen'
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/foods-with-allergens', validateGetFoodsWithUserAllergens, asyncHandler(getFoodsWithUserAllergens));

/**
 * @swagger
 * /api/v1/user-allergies/check/{allergenId}:
 *   get:
 *     tags:
 *       - User Allergies
 *     summary: Check if user has a specific allergy
 *     description: |
 *       Quick check endpoint to verify if the authenticated user has a particular allergy.
 *       Returns a boolean indicating presence and the record ID if found.
 *       **Authentication required** - Users must be signed in.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: allergenId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID to check
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
 *                     hasAllergy:
 *                       type: boolean
 *                     userAllergyId:
 *                       type: integer
 *                       nullable: true
 *                     allergenId:
 *                       type: integer
 *       400:
 *         description: Invalid allergen ID
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/check/:allergenId', validateCheckUserAllergy, asyncHandler(checkUserAllergy));

/**
 * @swagger
 * /api/v1/user-allergies/{id}:
 *   get:
 *     tags:
 *       - User Allergies
 *     summary: Get a user allergy record by ID
 *     description: |
 *       Retrieve detailed information about a specific user allergy record.
 *       **Authentication required** - Users can only access their own allergy records.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User allergy record ID
 *     responses:
 *       200:
 *         description: User allergy retrieved successfully
 *       400:
 *         description: Invalid record ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User allergy record not found
 */
router.get('/:id', validateGetUserAllergyById, asyncHandler(getUserAllergyById));

/**
 * @swagger
 * /api/v1/user-allergies:
 *   post:
 *     tags:
 *       - User Allergies
 *     summary: Add an allergy to the user
 *     description: |
 *       Add a new allergy record for the authenticated user.
 *       Prevents duplicate allergies from being added.
 *       **Authentication required** - Users can only add allergies to their own profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - allergenId
 *             properties:
 *               allergenId:
 *                 type: integer
 *                 description: ID of the allergen to add
 *                 example: 1
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe, life_threatening]
 *                 description: Severity of the allergy
 *                 default: moderate
 *               reaction:
 *                 type: string
 *                 description: Typical reaction symptoms
 *                 example: "Hives, swelling"
 *               diagnosisDate:
 *                 type: string
 *                 format: date
 *                 description: Date of diagnosis
 *               diagnosedBy:
 *                 type: string
 *                 description: Healthcare provider who diagnosed
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Allergy added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Allergen not found
 *       409:
 *         description: User already has this allergy
 */
router.post('/', validateCreateUserAllergy, asyncHandler(addUserAllergy));

/**
 * @swagger
 * /api/v1/user-allergies/bulk:
 *   post:
 *     tags:
 *       - User Allergies
 *     summary: Add multiple allergies to the user
 *     description: |
 *       Add multiple allergy records for the authenticated user in a single request.
 *       Skips any allergies that the user already has.
 *       **Authentication required** - Users can only add allergies to their own profile.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - allergies
 *             properties:
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - allergenId
 *                   properties:
 *                     allergenId:
 *                       type: integer
 *                     severity:
 *                       type: string
 *                     reaction:
 *                       type: string
 *                     diagnosisDate:
 *                       type: string
 *                     diagnosedBy:
 *                       type: string
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Allergies added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: One or more allergens not found
 */
router.post('/bulk', validateBulkCreateUserAllergies, asyncHandler(bulkAddUserAllergies));

/**
 * @swagger
 * /api/v1/user-allergies/{id}:
 *   put:
 *     tags:
 *       - User Allergies
 *     summary: Update a user allergy record
 *     description: |
 *       Update an existing user allergy record.
 *       **Authentication required** - Users can only update their own allergy records.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User allergy record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe, life_threatening]
 *               reaction:
 *                 type: string
 *               diagnosisDate:
 *                 type: string
 *                 format: date
 *               diagnosedBy:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: User allergy updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User allergy not found
 */
router.put('/:id', validateUpdateUserAllergy, asyncHandler(updateUserAllergy));

/**
 * @swagger
 * /api/v1/user-allergies/{allergenId}:
 *   delete:
 *     tags:
 *       - User Allergies
 *     summary: Remove an allergy from the user
 *     description: |
 *       Remove an allergy from the authenticated user's allergy list.
 *       **Authentication required** - Users can only remove allergies from their own profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: allergenId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID to remove
 *         example: 1
 *     responses:
 *       200:
 *         description: Allergy removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Allergy removed from user successfully"
 *       400:
 *         description: Invalid allergen ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User allergy not found
 */
router.delete('/:allergenId', validateDeleteUserAllergy, asyncHandler(deleteUserAllergy));

export default router;