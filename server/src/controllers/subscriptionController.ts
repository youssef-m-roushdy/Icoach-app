import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppError } from '../utils/errors.js';
import { createSubscription, cancelSubscription, getSubscriptionStatus } from '../grpc/paymentGrpcClient.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export class SubscriptionController {
  /**
   * Start a new app or coach subscription checkout
   */
  static async subscribeToApp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { planType, gateway, coachId } = req.body;

      const result = await createSubscription({
        userId: user.id,
        planType,
        gateway,
        coachId: coachId ?? null,
        idempotencyKey: randomUUID(), // fresh key per checkout attempt
      });

      res.status(200).json({
        success: true,
        message: 'Subscription checkout created successfully',
        data: {
          subscriptionId: result.subscriptionId,
          checkoutUrl: result.checkoutUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an active subscription
   */
  static async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { subscriptionId } = req.params;

      const result = await cancelSubscription(subscriptionId as string);

      res.status(200).json({
        success: true,
        message: 'Subscription canceled successfully',
        data: {
          success: result.success,
          status: result.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get the authenticated user's current subscription status
   */
  static async getMySubscriptionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const result = await getSubscriptionStatus(user.id);

      res.status(200).json({
        success: true,
        message: 'Subscription status retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}