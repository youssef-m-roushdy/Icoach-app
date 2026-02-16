import { Router } from 'express';
import { UserController } from '../../controllers/userController.js';
import { 
  authenticate, 
  authorize, 
  authorizeOwnerOrAdmin,
  optionalAuthenticate 
} from '../../middleware/auth.js';
import {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validateBodyInformation,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateIdParam,
  validateTokenParam,
  validatePagination,
  validateResendVerification,
} from '../../middleware/validations/index.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { uploadProfilePicture, handleMulterError } from '../../middleware/upload.js';

const router = Router();

// Public routes (no authentication required)

/**
 * @swagger
 * /api/v1/users/register:
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
 * /api/v1/users/login:
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
 * /api/v1/users/refresh-token:
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
 * /api/v1/users/logout:
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
 * /api/v1/users/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: |
 *       Generate password reset token and send email with link to reset password page.
 *       The email contains a link to: https://backend.com/reset-password/{token}
 *       which renders an EJS form for the user to reset their password.
 *       
 *       In development mode, the token and full URL are also returned in the response for testing purposes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
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
 *                     resetUrl:
 *                       type: string
 *                       description: Full reset URL (only in development)
 *             example:
 *               success: true
 *               message: "Password reset email sent. Please check your inbox."
 *               resetToken: "abc123..."
 *               resetUrl: "http://localhost:5000/reset-password/abc123..."
 *       404:
 *         description: User not found (returns success for security)
 *       500:
 *         description: Internal server error
 */
router.post('/forgot-password', 
  validatePasswordResetRequest,
  asyncHandler(UserController.requestPasswordReset)
);

/**
 * @swagger
 * /api/v1/users/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password with token (API endpoint for mobile)
 *     description: |
 *       Reset user password using the token from forgot-password endpoint.
 *       This is the API version for mobile apps.
 *       
 *       Web users should use the web form at GET/POST /reset-password/:token
 *       which is handled by the viewController.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordReset'
 *           example:
 *             token: "abc123def456..."
 *             newPassword: "NewSecurePass123!"
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
 *       500:
 *         description: Internal server error
 */
router.post('/reset-password', 
  validatePasswordReset,
  asyncHandler(UserController.resetPasswordAPI)
);

/**
 * @swagger
 * /api/v1/users/verify-email/{token}:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Verify email address (redirects to web page)
 *     description: |
 *       Verify user email using the token sent during registration.
 *       This endpoint redirects to the frontend with success/error message.
 *       
 *       For API-based verification (mobile apps), use POST /api/v1/users/verify-email
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       302:
 *         description: Redirects to frontend with verification result
 *       400:
 *         description: Invalid verification token
 *       500:
 *         description: Internal server error
 */
router.get('/verify-email/:token', 
  validateTokenParam,
  asyncHandler(UserController.verifyEmail)
);

/**
 * @swagger
 * /api/v1/users/verify-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify email address (API endpoint for mobile)
 *     description: |
 *       Verify user email using the token sent during registration.
 *       This is the API version for mobile apps that returns JSON.
 *       
 *       Web users clicking email links will use GET /verify-email/:token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *                 example: "abc123def456..."
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
router.post('/verify-email',
  asyncHandler(UserController.verifyEmailAPI)
);

/**
 * @swagger
 * /api/v1/users/resend-verification:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Resend email verification
 *     description: |
 *       Request a new verification email. This allows users who skipped verification during registration 
 *       or lost their verification email to receive a fresh verification token.
 *       
 *       The new token will replace any previously generated token for the account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send verification to
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Verification email sent successfully. Please check your inbox."
 *             example:
 *               success: true
 *               message: "Verification email sent successfully. Please check your inbox."
 *       400:
 *         description: Email is already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email is already verified"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "User not found"
 *       500:
 *         description: Internal server error or email sending failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/resend-verification', 
  validateResendVerification,
  asyncHandler(UserController.resendVerificationEmail)
);

// Protected routes (authentication required)

/**
 * @swagger
 * /api/v1/users/profile:
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
 * /api/v1/users/profile:
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
 * /api/v1/users/body-information:
 *   put:
 *     tags:
 *       - User Profile
 *     summary: Update body information and fitness profile
 *     description: |
 *       Update user's body measurements and fitness data after registration.
 *       This endpoint is designed for completing fitness profiles post-registration.
 *       Returns calculated metrics including BMI category, recommended calories, and profile completeness percentage.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: User's biological sex
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: User's date of birth (ISO 8601 format)
 *                 example: "1990-01-15"
 *               height:
 *                 type: number
 *                 format: float
 *                 minimum: 50
 *                 maximum: 300
 *                 description: Height in centimeters
 *                 example: 175.5
 *               weight:
 *                 type: number
 *                 format: float
 *                 minimum: 20
 *                 maximum: 500
 *                 description: Weight in kilograms
 *                 example: 70.2
 *               fitnessGoal:
 *                 type: string
 *                 enum: [weight_loss, muscle_gain, maintenance]
 *                 description: Primary fitness objective
 *               activityLevel:
 *                 type: string
 *                 enum: [sedentary, lightly_active, moderately_active, very_active, extra_active]
 *                 description: Daily activity level
 *               bodyFatPercentage:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Body fat percentage
 *                 example: 18.5
 *           examples:
 *             complete:
 *               summary: Complete body information
 *               value:
 *                 gender: "male"
 *                 dateOfBirth: "1990-06-15"
 *                 height: 180
 *                 weight: 75
 *                 fitnessGoal: "muscle_gain"
 *                 activityLevel: "moderately_active"
 *                 bodyFatPercentage: 15.5
 *             partial:
 *               summary: Partial update
 *               value:
 *                 height: 182
 *                 weight: 78
 *                 fitnessGoal: "weight_loss"
 *     responses:
 *       200:
 *         description: Body information updated successfully with calculated metrics
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
 *                   example: "Body information updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     bmiCategory:
 *                       type: string
 *                       enum: [Underweight, Normal, Overweight, Obese]
 *                       description: Calculated BMI category
 *                       example: "Normal"
 *                     recommendedCalories:
 *                       type: number
 *                       description: Daily recommended caloric intake
 *                       example: 2450
 *                     profileCompleteness:
 *                       type: number
 *                       format: float
 *                       minimum: 0
 *                       maximum: 100
 *                       description: Fitness profile completion percentage
 *                       example: 85.5
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
router.put('/body-information', 
  authenticate,
  validateBodyInformation,
  asyncHandler(UserController.updateBodyInformation)
);

/**
 * @swagger
 * /api/v1/users/change-password:
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

/**
 * @swagger
 * /api/v1/users/profile/avatar:
 *   post:
 *     tags:
 *       - User Profile
 *     summary: Upload profile picture
 *     description: |
 *       Upload a new profile picture for the authenticated user. 
 *       If a profile picture already exists, use PUT method to replace it.
 *       The image will be automatically resized to 500x500 and optimized for web delivery.
 *       Supported formats: JPEG, PNG, GIF, WebP.
 *       Maximum file size: 3MB.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
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
 *                   example: "Profile picture uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     image:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           description: Secure HTTPS URL of the uploaded image
 *                           example: "https://res.cloudinary.com/demo/image/upload/v1234567890/icoach/profiles/user_1.jpg"
 *                         publicId:
 *                           type: string
 *                           description: Cloudinary public ID
 *                           example: "icoach/profiles/user_1"
 *       400:
 *         description: No image uploaded or invalid file type
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/profile/avatar', 
  authenticate,
  uploadProfilePicture,
  handleMulterError,
  asyncHandler(UserController.uploadAvatar)
);

/**
 * @swagger
 * /api/v1/users/profile/avatar:
 *   put:
 *     tags:
 *       - User Profile
 *     summary: Update/Replace profile picture
 *     description: |
 *       Replace the existing profile picture with a new one.
 *       The old image will be automatically deleted from Cloudinary.
 *       If no profile picture exists, this will upload a new one.
 *       The image will be automatically resized to 500x500 and optimized for web delivery.
 *       Supported formats: JPEG, PNG, GIF, WebP.
 *       Maximum file size: 3MB.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: New profile picture image file
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
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
 *                   example: "Profile picture updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     image:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           description: Secure HTTPS URL of the new uploaded image
 *                           example: "https://res.cloudinary.com/demo/image/upload/v1234567890/icoach/profiles/user_1.jpg"
 *                         publicId:
 *                           type: string
 *                           description: Cloudinary public ID
 *                           example: "icoach/profiles/user_1"
 *                         oldImageDeleted:
 *                           type: boolean
 *                           description: Whether the old image was deleted
 *                           example: true
 *       400:
 *         description: No image uploaded or invalid file type
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile/avatar', 
  authenticate,
  uploadProfilePicture,
  handleMulterError,
  asyncHandler(UserController.updateAvatar)
);

/**
 * @swagger
 * /api/v1/users/profile/avatar:
 *   delete:
 *     tags:
 *       - User Profile
 *     summary: Delete profile picture
 *     description: Remove the current user's profile picture from both Cloudinary and the database
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
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
 *                         user:
 *                           $ref: '#/components/schemas/User'
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
router.delete('/profile/avatar', 
  authenticate,
  asyncHandler(UserController.deleteAvatar)
);

// Admin routes

/**
 * @swagger
 * /api/v1/users:
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
 * /api/v1/users/{id}:
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
 * /api/v1/users/{id}:
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
 * /api/v1/users/{id}:
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