// controllers/notificationController.ts
import type { Request, Response, NextFunction } from 'express';
import { ExpoToken } from '../models/sql/index.js';
import { AppError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ========================================================================
// Expo Push Tokens
// ========================================================================

/**
 * Register or update an Expo push token
 * POST /api/v1/notifications/expo-tokens
 */
export const registerExpoToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { token, deviceType } = req.body;

    if (!token) {
      throw new AppError('Expo push token is required', 400);
    }

    // Check if token already exists
    const existingToken = await ExpoToken.findOne({
      where: { token }
    });

    if (existingToken) {
      // Update existing token - reassign to current user if needed
      await existingToken.update({
        userId: user.id,
        deviceType: deviceType || existingToken.deviceType,
        updatedAt: new Date()
      });

      res.status(200).json({
        success: true,
        data: existingToken,
        message: 'Token updated successfully',
      });
      return;
    }

    // Create new token
    const newToken = await ExpoToken.create({
      userId: user.id,
      token,
      deviceType,
    });

    res.status(201).json({
      success: true,
      data: newToken,
      message: 'Token registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Expo tokens for authenticated user
 * GET /api/v1/notifications/expo-tokens
 */
export const getUserExpoTokens = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const tokens = await ExpoToken.findByUserId(user.id);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a specific Expo token
 * DELETE /api/v1/notifications/expo-tokens/:expoPushToken
 */
export const removeExpoToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    // Fix: Extract and validate before decodeURIComponent
    const rawToken = req.params.expoPushToken;
    if (!rawToken) {
      throw new AppError('Expo push token is required', 400);
    }
    const expoPushToken = decodeURIComponent(rawToken);

    // Find the token
    const token = await ExpoToken.findOne({
      where: { token: expoPushToken }
    });

    if (!token) {
      res.status(404).json({
        success: false,
        message: 'Token not found',
      });
      return;
    }

    // Only allow users to remove their own tokens
    if (token.userId !== user.id) {
      throw new AppError('Not authorized to remove this token', 403);
    }

    // Remove the token using the model's static method
    await ExpoToken.removeToken(expoPushToken);

    res.status(200).json({
      success: true,
      message: 'Token removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an Expo token's device type
 * PUT /api/v1/notifications/expo-tokens/:expoPushToken
 */
export const updateExpoToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    // Fix: Extract and validate before decodeURIComponent
    const rawToken = req.params.expoPushToken;
    if (!rawToken) {
      throw new AppError('Expo push token is required', 400);
    }
    const expoPushToken = decodeURIComponent(rawToken);
    const { deviceType } = req.body;

    const token = await ExpoToken.findOne({
      where: { token: expoPushToken }
    });

    if (!token) {
      res.status(404).json({
        success: false,
        message: 'Token not found',
      });
      return;
    }

    if (token.userId !== user.id) {
      throw new AppError('Not authorized to update this token', 403);
    }

    await token.update({
      deviceType: deviceType || token.deviceType,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      data: token,
      message: 'Token updated successfully',
    });
  } catch (error) {
    next(error);
  }
};