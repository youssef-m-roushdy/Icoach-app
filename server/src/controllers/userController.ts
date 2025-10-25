import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';
import { AppError } from '../utils/errors.js';

export class UserController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = req.body;
      const result = await UserService.createUser(userData);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: result,
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
      
      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
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
      const { refreshToken } = req.cookies;
      
      if (!refreshToken) {
        throw new AppError('Refresh token not provided', 401);
      }

      const result = await UserService.refreshAccessToken(refreshToken);
      
      // Set new refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
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
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const token = await UserService.requestPasswordReset(email);
      
      // In production, send email with reset link
      // For now, return token (remove this in production)
      res.status(200).json({
        success: true,
        message: 'Password reset token generated',
        ...(process.env.NODE_ENV === 'development' && { resetToken: token }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
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
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
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
   * Get user by ID (admin only)
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
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
      const { id } = req.params;
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
      const { id } = req.params;
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
}