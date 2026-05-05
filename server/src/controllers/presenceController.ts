import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { socketService } from '../services/socketService.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const getPresence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const rawIds = req.query.userIds;
    if (!rawIds) {
      throw new AppError('userIds query parameter is required', 400);
    }

    const idsString = Array.isArray(rawIds) ? rawIds.join(',') : String(rawIds);
    const userIds = idsString
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (userIds.length === 0) {
      throw new AppError('At least one userId is required', 400);
    }

    const presence = socketService.getPresence(userIds);

    res.status(200).json({
      success: true,
      message: 'Presence retrieved successfully',
      data: presence,
    });
  } catch (error) {
    next(error);
  }
};
