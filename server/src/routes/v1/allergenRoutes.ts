import { Router } from 'express';
import { AllergenController } from '../../controllers/AllergenController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  validateCreateAllergen,
  validateUpdateAllergen,
  validateAllergenQuery,
  validateGetAllergenById,
  validateDeleteAllergen,
  validateSearchAllergens,
  validateGetAllergensByCategory,
  validateGetFoodsByAllergen,
  validateGetAllergensByFood,
  validateCheckFoodAllergensForUser,
  validateBulkCreateAllergens,
} from '../../middleware/validations/index.js';

const router = Router();

// ============================================
// PUBLIC ROUTES - Authentication required for GET operations
// ============================================

/**
 * @swagger
 * /api/v1/allergens:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: Get all allergens
 *     description: |
 *       Retrieve a paginated list of all allergens with optional filters.
 *       **Authentication required** - Users must be signed in to access allergen data.
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
 *         description: Number of allergens per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search allergens by name (partial match)
 *         example: "nut"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, medication, environmental]
 *         description: Filter by category
 *         example: "food"
 *     responses:
 *       200:
 *         description: Allergens retrieved successfully
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
 *                     $ref: '#/components/schemas/Allergen'
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
router.get('/', authenticate, validateAllergenQuery, asyncHandler(AllergenController.getAllAllergens));

/**
 * @swagger
 * /api/v1/allergens/search:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: Search allergens by name
 *     description: |
 *       Search for allergens by name with partial matching.
 *       **Authentication required** - Users must be signed in to search allergens.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for allergen name
 *         example: "nut"
 *     responses:
 *       200:
 *         description: Search completed successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Allergen'
 *                 count:
 *                   type: integer
 *       400:
 *         description: Search query is required
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/search', authenticate, validateSearchAllergens, asyncHandler(AllergenController.searchAllergens));

/**
 * @swagger
 * /api/v1/allergens/food:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: Get food allergens only
 *     description: |
 *       Retrieve allergens that belong to the 'food' category.
 *       **Authentication required** - Users must be signed in to access allergen data.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Food allergens retrieved successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Allergen'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/food', authenticate, asyncHandler(AllergenController.getFoodAllergens));

/**
 * @swagger
 * /api/v1/allergens/category/{category}:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: Get allergens by category
 *     description: |
 *       Retrieve allergens filtered by category.
 *       **Authentication required** - Users must be signed in to access allergen data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [food, medication, environmental]
 *         description: Category to filter by
 *         example: "food"
 *     responses:
 *       200:
 *         description: Allergens retrieved successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Allergen'
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid category
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/category/:category', authenticate, validateGetAllergensByCategory, asyncHandler(AllergenController.getAllergensByCategory));

/**
 * @swagger
 * /api/v1/allergens/{id}:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: Get allergen by ID
 *     description: |
 *       Retrieve a specific allergen by its ID.
 *       **Authentication required** - Users must be signed in to access allergen data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID
 *     responses:
 *       200:
 *         description: Allergen retrieved successfully
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
 *                   $ref: '#/components/schemas/Allergen'
 *       400:
 *         description: Invalid allergen ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Allergen not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, validateGetAllergenById, asyncHandler(AllergenController.getAllergenById));

/**
 * @swagger
 * /api/v1/allergens/{id}/foods:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: Get all foods containing a specific allergen
 *     description: |
 *       Retrieve all foods that contain the specified allergen.
 *       **Authentication required** - Users must be signed in to access this data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     allergen:
 *                       $ref: '#/components/schemas/Allergen'
 *                     foods:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Food'
 *                     count:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Allergen not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/foods', authenticate, validateGetFoodsByAllergen, asyncHandler(AllergenController.getFoodsByAllergen));

/**
 * @swagger
 * /api/v1/allergens/food/{foodId}:
 *   get:
 *     tags:
 *       - Allergens
 *     summary: Get all allergens for a specific food
 *     description: |
 *       Retrieve all allergens that are present in a specific food.
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
 *         description: Allergens retrieved successfully
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
 *                     allergens:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Allergen'
 *                     count:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Food not found
 *       500:
 *         description: Internal server error
 */
router.get('/food/:foodId', authenticate, validateGetAllergensByFood, asyncHandler(AllergenController.getAllergensByFood));

/**
 * @swagger
 * /api/v1/allergens/check/food/{foodId}:
 *   get:
 *     tags:
 *       - Allergens
 *       - User Allergies
 *     summary: Check if a food contains user's allergens
 *     description: |
 *       Check if a specific food contains any allergens that the authenticated user is allergic to.
 *       This is useful for displaying allergy warnings.
 *       **Authentication required** - Users must be signed in to check their allergies.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Food ID to check
 *     responses:
 *       200:
 *         description: Check completed successfully
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
 *                     hasAllergens:
 *                       type: boolean
 *                     allergensFound:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Allergen'
 *                     warning:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Food not found
 *       500:
 *         description: Internal server error
 */
router.get('/check/food/:foodId', authenticate, validateCheckFoodAllergensForUser, asyncHandler(AllergenController.checkFoodAllergensForUser));

// ============================================
// PROTECTED ROUTES - Admin only (CREATE, UPDATE, DELETE)
// ============================================

/**
 * @swagger
 * /api/v1/allergens:
 *   post:
 *     tags:
 *       - Allergens
 *     summary: Create new allergen (Admin only)
 *     description: |
 *       Create a new allergen in the database.
 *       **Admin authentication required** - Only admin users can create allergens.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Allergen name
 *                 example: "Peanut"
 *               category:
 *                 type: string
 *                 enum: [food, medication, environmental]
 *                 description: Category of the allergen
 *                 example: "food"
 *               description:
 *                 type: string
 *                 description: Description of the allergen
 *                 example: "Found in peanuts, peanut butter, and peanut oil"
 *     responses:
 *       201:
 *         description: Allergen created successfully
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
 *                   $ref: '#/components/schemas/Allergen'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       409:
 *         description: Allergen with this name already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, authorize('admin'), validateCreateAllergen, asyncHandler(AllergenController.createAllergen));

/**
 * @swagger
 * /api/v1/allergens/bulk:
 *   post:
 *     tags:
 *       - Allergens
 *     summary: Bulk create allergens (Admin only)
 *     description: |
 *       Create multiple allergens in a single request.
 *       **Admin authentication required** - Only admin users can create allergens.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - allergens
 *             properties:
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - category
 *                   properties:
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       201:
 *         description: Allergens created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.post('/bulk', authenticate, authorize('admin'), validateBulkCreateAllergens, asyncHandler(AllergenController.bulkCreateAllergens));

/**
 * @swagger
 * /api/v1/allergens/{id}:
 *   put:
 *     tags:
 *       - Allergens
 *     summary: Update allergen (Admin only)
 *     description: |
 *       Update an existing allergen.
 *       **Admin authentication required** - Only admin users can update allergens.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Allergen name
 *               category:
 *                 type: string
 *                 enum: [food, medication, environmental]
 *                 description: Category of the allergen
 *               description:
 *                 type: string
 *                 description: Description of the allergen
 *     responses:
 *       200:
 *         description: Allergen updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Allergen not found
 *       409:
 *         description: Allergen with this name already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, authorize('admin'), validateUpdateAllergen, asyncHandler(AllergenController.updateAllergen));

/**
 * @swagger
 * /api/v1/allergens/{id}:
 *   delete:
 *     tags:
 *       - Allergens
 *     summary: Delete allergen (Admin only)
 *     description: |
 *       Delete an allergen from the database.
 *       **Admin authentication required** - Only admin users can delete allergens.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Allergen ID
 *     responses:
 *       200:
 *         description: Allergen deleted successfully
 *       400:
 *         description: Invalid allergen ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Allergen not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, authorize('admin'), validateDeleteAllergen, asyncHandler(AllergenController.deleteAllergen));

// ============================================
// SWAGGER COMPONENTS
// ============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Allergen:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Allergen ID
 *           example: 1
 *         name:
 *           type: string
 *           description: Allergen name
 *           example: "Peanut"
 *         category:
 *           type: string
 *           enum: [food, medication, environmental]
 *           description: Category of the allergen
 *           example: "food"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Description of the allergen
 *           example: "Found in peanuts, peanut butter, and peanut oil"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     
 *     Food:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         calories:
 *           type: number
 *         protein:
 *           type: number
 *         carbohydrate:
 *           type: number
 *         fat:
 *           type: number
 *         sugar:
 *           type: number
 *         pic:
 *           type: string
 *           nullable: true
 */

export default router;