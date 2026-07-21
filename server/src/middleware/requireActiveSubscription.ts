// src/middleware/requireActiveSubscription.ts
import type { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import UserSubscription from '../models/sql/UserSubscription.js';

// req.user المفروض متظبطة أصلاً من الـ JWT auth middleware عندك
declare global {
  namespace Express {
    interface Request {
      subscription?: UserSubscription;
    }
  }
}

interface RequireSubscriptionOptions {
  planTypes?: Array<'AppMonthly' | 'AppYearly' | 'CoachMonthly' | 'CoachYearly'>;
}

export function requireActiveSubscription(options: RequireSubscriptionOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const whereClause: any = {
      userId,
      status: { [Op.in]: ['Active', 'Trialing'] },
      currentPeriodEnd: { [Op.gt]: new Date() },
    };

    if (options.planTypes?.length) {
      whereClause.planType = { [Op.in]: options.planTypes };
    }

    const subscription = await UserSubscription.findOne({
      where: whereClause,
      order: [['currentPeriodEnd', 'DESC']],
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    req.subscription = subscription;
    next();
  };
}