import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppError } from '../utils/errors.js';
import { createPayment, getPayment, getPaymentStatus, refundPayment } from '../grpc/paymentGrpcClient.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export class PaymentController {
  /**
   * Create a one-off payment checkout (e.g. protein, gym accessories)
   */
  static async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { orderId, amount, currency, gateway } = req.body;

      const result = await createPayment({
        userId: user.id,
        orderId,
        amount,
        currency,
        gateway,
        idempotencyKey: randomUUID(), // fresh key per checkout attempt
      });

      res.status(200).json({
        success: true,
        message: 'Payment checkout created successfully',
        data: {
          paymentId: result.paymentId,
          checkoutUrl: result.checkoutUrl,
          status: result.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get full details of a payment
   */
  static async getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { paymentId } = req.params;
      const result = await getPayment(paymentId as string);

      res.status(200).json({
        success: true,
        message: 'Payment retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get only the status of a payment (lighter-weight polling endpoint)
   */
  static async getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { paymentId } = req.params;
      const result = await getPaymentStatus(paymentId as string);

      res.status(200).json({
        success: true,
        message: 'Payment status retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request a refund for a payment
   */
  static async refundPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { paymentId } = req.params;
      const result = await refundPayment(paymentId as string);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { success: result.success },
      });
    } catch (error) {
      next(error);
    }
  }
}