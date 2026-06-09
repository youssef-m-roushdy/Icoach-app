import { Router } from 'express';
import { FoodAllergenController } from '../../controllers/FoodAllergenController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  validateCreateFoodAllergen,
  validateUpdateFoodAllergen,
  validateFoodAllergenQuery,
  validateGetFoodAllergenById,
  validateDeleteFoodAllergen,
  validateBulkCreateFoodAllergens,
  validateGetRelationshipsByFood,
  validateGetRelationshipsByAllergen,
  validateToggleContains,
} from '../../middleware/validations/index.js';

const router = Router();

// ============================================
// PUBLIC ROUTES - Authentication required for GET operations
// ============================================

/**
 * @swagger
 * /api/v1/food-allergens:
 *   get:
 *     tags:
 *       - Food Allergens
 *     summary: Get all food-allergen relationships
 *     description: |
 *       Retrieve a paginated list of all food-allergen relationships with optional filters.
 *       **Authentication required** - Users must be signed in to access this data.
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
 *         description: Number of relationships per page
 *       - in: query
 *         name: foodId
 *         schema:
 *           type: integer
 *         description: Filter by food ID
 *         example: 1
 *       - in: query
 *         name: allergenId
 *         schema:
 *           type: integer
 *         description: Filter by allergen ID
 *         example: 1
 *       - in: query
 *         name: contains
 *         schema:
 *           type: boolean
 *         description: Filter by contains status
 *         example: true
 *     responses:
 *       200:
 *         description: Food-allergen relationships retrieved successfully
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FoodAllergen'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, validateFoodAllergenQuery, asyncHandler(FoodAllergenController.getAllFoodAllergens));

/**
 * @swagger
 * /api/v1/food-allergens/food/{foodId}:
 *   get:
 *     tags:
 *       - Food Allergens
 *     summary: Get all relationships for a specific food
 *     description: |
 *       Retrieve all allergen relationships for a specific food.
 *       **Authentication required** - Users must be signed in to access this data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Food ID
 *     responses:
 *       200:
 *         description: Relationships retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     food:
 *                       $ref: '#/components/schemas/Food'
 *                     relationships:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FoodAllergen'
 *                     count:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Food not found
 *       500:
 *         description: Internal server error
 */
router.get('/food/:foodId', authenticate, validateGetRelationshipsByFood, asyncHandler(FoodAllergenController.getRelationshipsByFood));

/**
 * @swagger
 * /api/v1/food-allergens/allergen/{allergenId}:
 *   get:
 *     tags:
 *       - Food Allergens
 *     summary: Get all relationships for a specific allergen
 *     description: |
 *       Retrieve all food relationships for a specific allergen.
 *       **Authentication required** - Users must be signed in to access this data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: allergenId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID
 *     responses:
 *       200:
 *         description: Relationships retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     allergen:
 *                       $ref: '#/components/schemas/Allergen'
 *                     relationships:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FoodAllergen'
 *                     count:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Allergen not found
 *       500:
 *         description: Internal server error
 */
router.get('/allergen/:allergenId', authenticate, validateGetRelationshipsByAllergen, asyncHandler(FoodAllergenController.getRelationshipsByAllergen));

/**
 * @swagger
 * /api/v1/food-allergens/{id}:
 *   get:
 *     tags:
 *       - Food Allergens
 *     summary: Get food-allergen relationship by ID
 *     description: |
 *       Retrieve a specific food-allergen relationship by its ID.
 *       **Authentication required** - Users must be signed in to access this data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Relationship ID
 *     responses:
 *       200:
 *         description: Relationship retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/FoodAllergen'
 *       400:
 *         description: Invalid relationship ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Relationship not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, validateGetFoodAllergenById, asyncHandler(FoodAllergenController.getFoodAllergenById));

// ============================================
// PROTECTED ROUTES - Admin only (CREATE, UPDATE, DELETE)
// ============================================

/**
 * @swagger
 * /api/v1/food-allergens:
 *   post:
 *     tags:
 *       - Food Allergens
 *     summary: Create a new food-allergen relationship (Admin only)
 *     description: |
 *       Create a new relationship between a food and an allergen.
 *       **Admin authentication required** - Only admin users can create relationships.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foodId
 *               - allergenId
 *             properties:
 *               foodId:
 *                 type: integer
 *                 description: ID of the food
 *                 example: 1
 *               allergenId:
 *                 type: integer
 *                 description: ID of the allergen
 *                 example: 1
 *               contains:
 *                 type: boolean
 *                 description: Whether the food contains this allergen
 *                 default: true
 *                 example: true
 *               notes:
 *                 type: string
 *                 description: Additional notes about this relationship
 *                 example: "Cross-contamination risk in factory"
 *     responses:
 *       201:
 *         description: Relationship created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/FoodAllergen'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Food or allergen not found
 *       409:
 *         description: Relationship already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, authorize('admin'), validateCreateFoodAllergen, asyncHandler(FoodAllergenController.createFoodAllergen));

/**
 * @swagger
 * /api/v1/food-allergens/bulk:
 *   post:
 *     tags:
 *       - Food Allergens
 *     summary: Bulk create food-allergen relationships (Admin only)
 *     description: |
 *       Create multiple food-allergen relationships in a single request.
 *       **Admin authentication required** - Only admin users can create relationships.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - relationships
 *             properties:
 *               relationships:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - foodId
 *                     - allergenId
 *                   properties:
 *                     foodId:
 *                       type: integer
 *                     allergenId:
 *                       type: integer
 *                     contains:
 *                       type: boolean
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Relationships created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.post('/bulk', authenticate, authorize('admin'), validateBulkCreateFoodAllergens, asyncHandler(FoodAllergenController.bulkCreateFoodAllergens));

/**
 * @swagger
 * /api/v1/food-allergens/toggle/{foodId}/{allergenId}:
 *   patch:
 *     tags:
 *       - Food Allergens
 *     summary: Toggle contains status for a food-allergen pair (Admin only)
 *     description: |
 *       Toggle the 'contains' status for a specific food-allergen pair.
 *       Creates the relationship if it doesn't exist.
 *       **Admin authentication required** - Only admin users can modify relationships.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Food ID
 *       - in: path
 *         name: allergenId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID
 *     responses:
 *       200:
 *         description: Status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/FoodAllergen'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.patch('/toggle/:foodId/:allergenId', authenticate, authorize('admin'), validateToggleContains, asyncHandler(FoodAllergenController.toggleContains));

/**
 * @swagger
 * /api/v1/food-allergens/{id}:
 *   put:
 *     tags:
 *       - Food Allergens
 *     summary: Update a food-allergen relationship (Admin only)
 *     description: |
 *       Update an existing food-allergen relationship.
 *       **Admin authentication required** - Only admin users can update relationships.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Relationship ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contains:
 *                 type: boolean
 *                 description: Whether the food contains this allergen
 *               notes:
 *                 type: string
 *                 description: Additional notes about this relationship
 *     responses:
 *       200:
 *         description: Relationship updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Relationship not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, authorize('admin'), validateUpdateFoodAllergen, asyncHandler(FoodAllergenController.updateFoodAllergen));

/**
 * @swagger
 * /api/v1/food-allergens/{id}:
 *   delete:
 *     tags:
 *       - Food Allergens
 *     summary: Delete a food-allergen relationship (Admin only)
 *     description: |
 *       Delete a food-allergen relationship.
 *       **Admin authentication required** - Only admin users can delete relationships.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Relationship ID
 *     responses:
 *       200:
 *         description: Relationship deleted successfully
 *       400:
 *         description: Invalid relationship ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Relationship not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, authorize('admin'), validateDeleteFoodAllergen, asyncHandler(FoodAllergenController.deleteFoodAllergen));

// ============================================
// SWAGGER COMPONENTS
// ============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     FoodAllergen:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Relationship ID
 *           example: 1
 *         foodId:
 *           type: integer
 *           description: Food ID
 *           example: 1
 *         allergenId:
 *           type: integer
 *           description: Allergen ID
 *           example: 1
 *         contains:
 *           type: boolean
 *           description: Whether the food contains this allergen
 *           example: true
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes
 *           example: "Cross-contamination risk"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         food:
 *           $ref: '#/components/schemas/Food'
 *         allergen:
 *           $ref: '#/components/schemas/Allergen'
 */

export default router;