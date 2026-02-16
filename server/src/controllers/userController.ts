import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';
import { ImageService } from '../services/imageService.js';
import { AppError } from '../utils/errors.js';
import { cookieConfig } from '../config/jwt.js';
import EmailService from '../services/emailService.js';

export class UserController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = req.body;
      const user = await UserService.createUser(userData);
      
      // Auto-login: Generate tokens for the new user
      const accessToken = UserService.generateAccessToken(user.id, user.email, user.role || 'user');
      const refreshToken = UserService.generateRefreshToken(user.id);
      
      // Set refresh token as HTTP-only cookie (for web clients)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieConfig.maxAge,
      });
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user,
          accessToken,
          refreshToken, // Also return in body for mobile clients
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { emailOrUsername, password } = req.body;
      const result = await UserService.authenticateUser(emailOrUsername, password);
      
      // Set refresh token as HTTP-only cookie (for web clients)
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieConfig.maxAge,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken, // Also return in body for mobile clients
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Support both cookie-based (web) and body-based (mobile) refresh tokens
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        throw new AppError('Refresh token not provided', 401);
      }

      const result = await UserService.refreshAccessToken(refreshToken);
      
      // Set new refresh token cookie (for web clients)
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieConfig.maxAge,
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken, // Also return in body for mobile clients
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('refreshToken');
      
      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const user = await UserService.getUserById(userId);
      
      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const updateData = req.body;
      
      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.password;
      delete updateData.role;
      delete updateData.isEmailVerified;
      delete updateData.emailVerificationToken;
      
      const user = await UserService.updateUser(userId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user body information and fitness profile
   */
  static async updateBodyInformation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const bodyData = req.body;
      
      const result = await UserService.updateBodyInformation(userId, bodyData);
      
      res.status(200).json({
        success: true,
        message: 'Body information updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;
      
      await UserService.changePassword(userId, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

   /**
   * Request password reset (API endpoint)
   * POST /api/v1/users/forgot-password
   */
  static async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw new AppError('Email is required', 400);
      }
      
      // Get user info for personalized email
      const user = await UserService.getUserByEmail(email);
      
      // Generate reset token
      const token = await UserService.requestPasswordReset(email);
      
      // Send password reset email with the token link
      // The link will be: https://yourbackend.com/reset-password/{token}
      await EmailService.sendPasswordResetEmail(
        email,                              // to
        user?.firstName || user?.username,  // firstName  
        token                               // resetToken
      );
      
      res.status(200).json({
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
        // Never expose token in production
        ...(process.env.NODE_ENV === 'development' && { 
          resetToken: token,
          resetUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/reset-password/${token}`
        }),
      });
    } catch (error) {
      // For security, always return success even if email doesn't exist
      if (error instanceof AppError && error.message.includes('not found')) {
        res.status(200).json({
          success: true,
          message: 'If that email exists, a password reset link has been sent.',
        });
        return;
      }
      next(error);
    }
  }

   /**
   * Reset password via API (for mobile app - optional)
   * POST /api/v1/users/reset-password
   * Note: The web version is handled by viewController
   */
  static async resetPasswordAPI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        throw new AppError('Token and new password are required', 400);
      }
      
      const user = await UserService.resetPassword(token, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

 

   /**
   * Verify email via API (alternative to web view)
   * This is for mobile apps that want to handle verification in-app
   * POST /api/v1/users/verify-email
   */
  static async verifyEmailAPI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      
      if (!token) {
        throw new AppError('Token is required', 400);
      }
      
      const user = await UserService.verifyEmail(token);
      
      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email via web link (redirects to web view)
   * GET /verify-email/:token
   * This is now handled by viewController.renderEmailVerification
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      if (!token) {
        throw new AppError('Token is required', 400);
      }
      const user = await UserService.verifyEmail(token);
      
      // Redirect to frontend with success message
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/verify-success?message=Email verified successfully`);
      
    } catch (error) {
      // Redirect to frontend with error message
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
      res.redirect(`${frontendUrl}/auth/verify-error?message=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * Resend email verification
   */
  static async resendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw new AppError('Email is required', 400);
      }

      await UserService.resendVerificationEmail(email);
      
      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new AppError('User ID is required', 400);
      }
      const user = await UserService.getUserById(parseInt(id));
      
      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        role: req.query.role as string,
        isEmailVerified: req.query.isEmailVerified === 'true' ? true : 
                        req.query.isEmailVerified === 'false' ? false : undefined,
      };
      
      const result = await UserService.getAllUsers(page, limit, filters);
      
      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user by ID (admin only)
   */
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new AppError('User ID is required', 400);
      }
      const updateData = req.body;
      
      const user = await UserService.updateUser(parseInt(id), updateData);
      
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user by ID (admin only)
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        throw new AppError('User ID is required', 400);
      }
      await UserService.deleteUser(parseInt(id));
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload user profile picture
   */
  static async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!req.file) {
        throw new AppError('Please upload an image', 400);
      }

      // Upload to Cloudinary
      const uploadResult = await ImageService.uploadProfilePicture(req.file.buffer, userId);

      // Update user avatar URL in database
      const updatedUser = await UserService.updateUser(userId, {
        avatar: uploadResult.secureUrl,
      });

      res.status(200).json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          user: updatedUser,
          image: {
            url: uploadResult.secureUrl,
            publicId: uploadResult.publicId,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update/Replace user profile picture
   */
  static async updateAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!req.file) {
        throw new AppError('Please upload an image', 400);
      }

      // Get current user to check for existing avatar
      const currentUser = await UserService.getUserById(userId);
      let oldImageDeleted = false;

      // Delete old avatar from Cloudinary if exists
      if (currentUser?.avatar) {
        try {
          await ImageService.deleteImageByUrl(currentUser.avatar);
          oldImageDeleted = true;
        } catch (error) {
          console.warn('Failed to delete old avatar from Cloudinary:', error);
        }
      }

      // Upload new avatar to Cloudinary
      const uploadResult = await ImageService.uploadProfilePicture(req.file.buffer, userId);

      // Update user avatar URL in database
      const updatedUser = await UserService.updateUser(userId, {
        avatar: uploadResult.secureUrl,
      });

      res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully',
        data: {
          user: updatedUser,
          image: {
            url: uploadResult.secureUrl,
            publicId: uploadResult.publicId,
            oldImageDeleted,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = (req as any).user;
      const userId = authUser?.id;
      
      console.log('Deleting avatar for user ID:', userId);
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await UserService.getUserById(userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }

      console.log('Current user avatar:', user.avatar);
      
      // Delete from Cloudinary if exists
      if (user.avatar) {
        try {
          console.log('Deleting from Cloudinary:', user.avatar);
          await ImageService.deleteImageByUrl(user.avatar);
          console.log('Cloudinary deletion successful');
        } catch (error) {
          console.warn('Failed to delete image from Cloudinary:', error);
        }
      }

      // Remove avatar URL from database
      console.log('Updating user with avatar set to null');
      const updatedUser = await UserService.updateUser(userId, {
        avatar: null, // Or undefined
      });

      console.log('User updated successfully:', updatedUser.id);
      
      res.status(200).json({
        success: true,
        message: 'Profile picture deleted successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      console.error('Error in deleteAvatar:', error);
      next(error);
    }
  }
}