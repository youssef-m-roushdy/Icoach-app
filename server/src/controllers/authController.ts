import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';
import type { UserAttributes } from '../models/index.js';

export class AuthController {
  /**
   * Handle Google OAuth callback
   */
  static async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as UserAttributes;
      
      if (!user) {
        // Return JSON error for testing
        res.status(401).json({
          success: false,
          message: 'Authentication failed'
        });
        return;
      }

      // Generate tokens
      const result = await UserService.handleGoogleOAuth(user);
      
      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Return JSON with token for testing (you can change this to redirect later)
      res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        }
      });

      // OPTIONAL: Uncomment below to redirect to frontend instead
      // const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      // const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}`;
      // res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Google OAuth failure
   */
  static async googleFailure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/error?message=Google authentication failed`);
    } catch (error) {
      next(error);
    }
  }
}
