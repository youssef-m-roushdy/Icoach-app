// server/src/controllers/viewController.ts
import type { Request, Response } from 'express';
import { UserService } from '../services/userService.js';

interface PasswordResetResult {
  success: boolean;
  message?: string;
}

interface EmailVerificationResult {
  success: boolean;
  message?: string;
}

export const viewController = {
  /**
   * GET /reset-password/:token
   * Render password reset form (accessed from email link)
   */
  renderResetPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      
      if (!token || typeof token !== 'string') {
        res.status(400).render('auth/reset-error', {
          error: 'Invalid or missing reset token',
          appName: 'iCoach'
        });
        return;
      }
      
      // Validate token with your userService
      try {
        const isValid = await UserService.validatePasswordResetToken(token);
        
        if (!isValid) {
          res.status(400).render('auth/reset-token-expired', {
            message: 'This password reset link has expired or is invalid.',
            appName: 'iCoach'
          });
          return;
        }
      } catch (error) {
        res.status(400).render('auth/reset-token-expired', {
          message: 'This password reset link has expired or is invalid.',
          appName: 'iCoach'
        });
        return;
      }
      
      // Token is valid, render the reset form
      res.render('auth/reset-password', {
        token,
        error: null,
        message: null,
        appName: 'iCoach',
        csrfToken: 'dummy-csrf-token' // Add proper CSRF if needed
      });
      
    } catch (error) {
      console.error('Reset password render error:', error);
      res.status(500).render('auth/reset-error', {
        error: 'An error occurred. Please try again.',
        appName: 'iCoach'
      });
    }
  },
  
  /**
   * POST /reset-password/:token
   * Handle password reset form submission
   */
  handleResetPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      const { newPassword, confirmPassword } = req.body;
      
      // Validation
      if (!token) {
        res.status(400).render('auth/reset-error', {
          error: 'Invalid reset token',
          appName: 'iCoach'
        });
        return;
      }
      
      if (!newPassword || !confirmPassword) {
        res.render('auth/reset-password', {
          token,
          error: 'All fields are required',
          message: null,
          appName: 'iCoach',
          csrfToken: 'dummy-csrf-token'
        });
        return;
      }
      
      if (newPassword !== confirmPassword) {
        res.render('auth/reset-password', {
          token,
          error: 'Passwords do not match',
          message: null,
          appName: 'iCoach',
          csrfToken: 'dummy-csrf-token'
        });
        return;
      }
      
      // Password strength validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        res.render('auth/reset-password', {
          token,
          error: 'Password must be at least 8 characters with uppercase, lowercase, and number',
          message: null,
          appName: 'iCoach',
          csrfToken: 'dummy-csrf-token'
        });
        return;
      }
      
      // Reset password using token
      try {
        await UserService.resetPassword(token, newPassword);
        
        // Success - render success page
        res.render('auth/reset-success', {
          message: 'Your password has been reset successfully! You can now sign in with your new password.',
          appName: 'iCoach',
          loginUrl: process.env.FRONTEND_URL 
            ? `${process.env.FRONTEND_URL}/login` 
            : 'http://localhost:3000/login'
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
        res.render('auth/reset-password', {
          token,
          error: errorMessage,
          message: null,
          appName: 'iCoach',
          csrfToken: 'dummy-csrf-token'
        });
      }
      
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).render('auth/reset-error', {
        error: 'An error occurred while resetting your password.',
        appName: 'iCoach'
      });
    }
  },
  
  /**
   * GET /verify-email/:token
   * Handle email verification from link
   */
  renderEmailVerification: async (req: Request, res: Response): Promise<void> => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      
      if (!token || typeof token !== 'string') {
        res.status(400).render('auth/email-verification-error', {
          error: 'Invalid verification link',
          appName: 'iCoach'
        });
        return;
      }
      
      // Verify email token
      try {
        await UserService.verifyEmail(token);
        
        res.render('auth/email-verified', {
          message: 'Your email has been verified successfully!',
          appName: 'iCoach',
          loginUrl: process.env.FRONTEND_URL 
            ? `${process.env.FRONTEND_URL}/login` 
            : 'http://localhost:3000/login'
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
        res.status(400).render('auth/email-verification-error', {
          error: errorMessage,
          appName: 'iCoach'
        });
      }
      
    } catch (error) {
      console.error('Email verification render error:', error);
      res.status(500).render('auth/email-verification-error', {
        error: 'An error occurred while verifying your email.',
        appName: 'iCoach'
      });
    }
  }
};