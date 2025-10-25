import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { 
  authenticate, 
  authorize, 
  authorizeOwnerOrAdmin,
  optionalAuthenticate 
} from '../middleware/auth.js';
import {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateIdParam,
  validateTokenParam,
  validatePagination,
} from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Public routes (no authentication required)

/**
 * @swagger
 * /users/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account with email verification. Supports comprehensive profile data including fitness metrics.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           examples:
 *             basic:
 *               summary: Basic registration
 *               value:
 *                 email: "john.doe@example.com"
 *                 username: "johndoe"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 password: "SecurePass123!"
 *             complete:
 *               summary: Complete registration with body data
 *               value:
 *                 email: "jane.smith@example.com"
 *                 username: "janesmith"
 *                 firstName: "Jane"
 *                 lastName: "Smith"
 *                 password: "SecurePass123!"
 *                 gender: "female"
 *                 height: 165.5
 *                 weight: 60.2
 *                 dateOfBirth: "1992-05-15"
 *                 fitnessGoal: "weight_loss"
 *                 activityLevel: "moderately_active"
 *                 bodyFatPercentage: 22.5
 *                 bio: "Fitness enthusiast looking to get in shape"
 *                 phone: "+1234567890"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', 
  validateUserRegistration,
  asyncHandler(UserController.register)
);

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate user and return access token. Sets refresh token as HTTP-only cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           examples:
 *             email:
 *               summary: Login with email
 *               value:
 *                 emailOrUsername: "john.doe@example.com"
 *                 password: "SecurePass123!"
 *             username:
 *               summary: Login with username
 *               value:
 *                 emailOrUsername: "johndoe"
 *                 password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token (HTTP-only)
 *             schema:
 *               type: string
 *               example: refreshToken=abc123...; HttpOnly; Secure; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials or account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', 
  validateUserLogin,
  asyncHandler(UserController.login)
);

/**
 * @swagger
 * /users/refresh-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Generate new access token using refresh token from cookies
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             description: New refresh token (HTTP-only)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           description: New JWT access token
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh-token', 
  asyncHandler(UserController.refreshToken)
);

/**
 * @swagger
 * /users/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User logout
 *     description: Clear refresh token cookie to log out user
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description: Cleared refresh token cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', 
  asyncHandler(UserController.logout)
);

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: Generate password reset token and send via email (in development, token is returned in response)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *     responses:
 *       200:
 *         description: Password reset token generated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: Reset token (only in development)
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', 
  validatePasswordResetRequest,
  asyncHandler(UserController.requestPasswordReset)
);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password with token
 *     description: Reset user password using the token from forgot-password endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordReset'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', 
  validatePasswordReset,
  asyncHandler(UserController.resetPassword)
);

/**
 * @swagger
 * /users/verify-email/{token}:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Verify email address
 *     description: Verify user email using the token sent during registration
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid verification token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/verify-email/:token', 
  validateTokenParam,
  asyncHandler(UserController.verifyEmail)
);

// Protected routes (authentication required)

/**
 * @swagger
 * /users/profile:
 *   get:
 *     tags:
 *       - User Profile
 *     summary: Get current user profile
 *     description: Retrieve the complete profile of the authenticated user including body metrics and fitness data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', 
  authenticate,
  asyncHandler(UserController.getProfile)
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     tags:
 *       - User Profile
 *     summary: Update current user profile
 *     description: Update user profile including body metrics, fitness goals, and personal information. BMI is calculated automatically when height/weight are updated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *           examples:
 *             personal_info:
 *               summary: Update personal information
 *               value:
 *                 firstName: "John"
 *                 lastName: "Smith"
 *                 bio: "Updated bio description"
 *                 phone: "+1987654321"
 *             body_metrics:
 *               summary: Update body metrics
 *               value:
 *                 height: 182.0
 *                 weight: 78.5
 *                 bodyFatPercentage: 14.2
 *                 fitnessGoal: "muscle_gain"
 *                 activityLevel: "very_active"
 *             complete_update:
 *               summary: Complete profile update
 *               value:
 *                 firstName: "Jane"
 *                 lastName: "Johnson"
 *                 bio: "Marathon runner and fitness coach"
 *                 height: 168.0
 *                 weight: 58.5
 *                 bodyFatPercentage: 18.5
 *                 fitnessGoal: "maintenance"
 *                 activityLevel: "very_active"
 *                 preferences:
 *                   theme: "dark"
 *                   notifications: true
 *                   units: "metric"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', 
  authenticate,
  validateProfileUpdate,
  asyncHandler(UserController.updateProfile)
);

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     tags:
 *       - User Profile
 *     summary: Change user password
 *     description: Change the current user's password (requires current password verification)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePassword'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Current password is incorrect or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/change-password', 
  authenticate,
  validatePasswordChange,
  asyncHandler(UserController.changePassword)
);

// Admin routes

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Admin - User Management
 *     summary: Get all users (Admin only)
 *     description: Retrieve a paginated list of all users with optional filters
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
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, coach, admin]
 *         description: Filter by user role
 *       - in: query
 *         name: isEmailVerified
 *         schema:
 *           type: boolean
 *         description: Filter by email verification status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', 
  authenticate,
  authorize('admin'),
  validatePagination,
  asyncHandler(UserController.getAllUsers)
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags:
 *       - Admin - User Management
 *     summary: Get user by ID
 *     description: Retrieve a specific user by ID (accessible by admin or the user themselves)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Can only access own profile or admin required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', 
  authenticate,
  validateIdParam,
  authorizeOwnerOrAdmin,
  asyncHandler(UserController.getUserById)
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags:
 *       - Admin - User Management
 *     summary: Update user by ID (Admin only)
 *     description: Update any user's profile including sensitive fields like role and email verification status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/UserUpdate'
 *               - type: object
 *                 properties:
 *                   role:
 *                     type: string
 *                     enum: [user, coach, admin]
 *                     description: User role (admin only)
 *                   isEmailVerified:
 *                     type: boolean
 *                     description: Email verification status (admin only)
 *                   isActive:
 *                     type: boolean
 *                     description: Account active status (admin only)
 *           examples:
 *             role_change:
 *               summary: Change user role
 *               value:
 *                 role: "coach"
 *             verify_email:
 *               summary: Verify user email
 *               value:
 *                 isEmailVerified: true
 *             deactivate_user:
 *               summary: Deactivate user account
 *               value:
 *                 isActive: false
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', 
  authenticate,
  authorize('admin'),
  validateIdParam,
  validateProfileUpdate,
  asyncHandler(UserController.updateUser)
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags:
 *       - Admin - User Management
 *     summary: Delete user by ID (Admin only)
 *     description: Soft delete a user by setting isActive to false. This preserves data while deactivating the account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', 
  authenticate,
  authorize('admin'),
  validateIdParam,
  asyncHandler(UserController.deleteUser)
);

export default router;