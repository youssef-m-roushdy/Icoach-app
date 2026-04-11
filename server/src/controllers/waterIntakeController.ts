import type { Request, Response, NextFunction } from 'express';
import { WaterIntake } from '../models/sql/index.js';
import { Op } from 'sequelize';
import { AppError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Sync or create water intake for the current user
 * Accepts amount in L or ML, converts to L for storage
 */
export const syncWaterIntake = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { amount, unit, date, goalInLiters } = req.body;

    if (amount === undefined || !unit || !date) {
      throw new AppError('Amount, unit, and date are required', 400);
    }

    // Convert to liters based on unit
    let amountInLiters: number;
    if (unit === 'L') {
      amountInLiters = parseFloat(amount);
    } else if (unit === 'ML') {
      amountInLiters = parseFloat(amount) / 1000;
    } else {
      throw new AppError('Unit must be either "L" or "ML"', 400);
    }

    if (amountInLiters < 0) {
      throw new AppError('Amount cannot be negative', 400);
    }

    let waterIntake = await WaterIntake.findOne({
      where: { userId: user.id, date },
    });

    const goal = goalInLiters || 2.0;
    const isCompleted = amountInLiters >= goal;

    const completedAt: Date | null =
      isCompleted && !waterIntake?.isCompleted
        ? new Date()
        : waterIntake?.completedAt ?? null;

    // Calculate streak
    let streakDays = waterIntake?.streakDays ?? 0;
    if (isCompleted && (!waterIntake || !waterIntake.isCompleted)) {
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0] ?? '';

      const yesterdayActivity = await WaterIntake.findOne({
        where: { userId: user.id, date: yesterdayStr, isCompleted: true },
      });

      streakDays = yesterdayActivity ? (waterIntake?.streakDays ?? 0) + 1 : 1;
    }

    if (waterIntake) {
      await waterIntake.update({
        amountInLiters,
        goalInLiters: goal,
        isCompleted,
        completedAt,
        streakDays,
      });
    } else {
      waterIntake = await WaterIntake.create({
        userId: user.id,
        date,
        amountInLiters,
        goalInLiters: goal,
        isCompleted,
        completedAt,
        streakDays,
      });
    }

    const totalIntake = await WaterIntake.getUserTotalIntake(user.id);
    const amountInML = amountInLiters * 1000;
    const remainingLiters = Math.max(goal - amountInLiters, 0);

    res.status(200).json({
      success: true,
      message: isCompleted ? 'Hydration goal achieved! 💧🎉' : 'Water intake synced successfully',
      data: {
        waterIntake: {
          ...waterIntake.toJSON(),
          amountInML,
          progress: waterIntake.getProgressPercentage(),
        },
        amountAdded: amountInLiters,
        amountAddedML: amountInML,
        totalIntakeLiters: totalIntake.totalLiters,
        totalIntakeML: totalIntake.totalML,
        remainingLiters,
        remainingML: remainingLiters * 1000,
        streakMaintained: streakDays > 0,
        goalAchieved: isCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add incremental water intake
 */
export const addWaterIntake = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { amount, unit } = req.body;

    if (amount === undefined || !unit) {
      throw new AppError('Amount and unit are required', 400);
    }

    // Convert to liters
    let amountInLiters: number;
    if (unit === 'L') {
      amountInLiters = parseFloat(amount);
    } else if (unit === 'ML') {
      amountInLiters = parseFloat(amount) / 1000;
    } else {
      throw new AppError('Unit must be either "L" or "ML"', 400);
    }

    if (amountInLiters <= 0) {
      throw new AppError('Amount must be greater than 0', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let waterIntake = await WaterIntake.findOne({
      where: { userId: user.id, date: today },
    });

    const newAmount = (waterIntake?.amountInLiters || 0) + amountInLiters;
    const goal = waterIntake?.goalInLiters || 2.0;
    const isCompleted = newAmount >= goal;

    const completedAt: Date | null =
      isCompleted && !waterIntake?.isCompleted
        ? new Date()
        : waterIntake?.completedAt ?? null;

    // Calculate streak for new completion
    let streakDays = waterIntake?.streakDays ?? 0;
    if (isCompleted && (!waterIntake || !waterIntake.isCompleted)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayActivity = await WaterIntake.findOne({
        where: { userId: user.id, date: yesterday, isCompleted: true },
      });

      streakDays = yesterdayActivity ? (waterIntake?.streakDays ?? 0) + 1 : 1;
    }

    if (waterIntake) {
      await waterIntake.update({
        amountInLiters: newAmount,
        isCompleted,
        completedAt,
        streakDays,
      });
    } else {
      waterIntake = await WaterIntake.create({
        userId: user.id,
        date: today, // ✅ Use Date object
        amountInLiters: newAmount,
        goalInLiters: goal,
        isCompleted,
        completedAt,
        streakDays,
      });
    }

    const remainingLiters = Math.max(goal - newAmount, 0);

    res.status(200).json({
      success: true,
      message: `Added ${amount}${unit} of water`,
      data: {
        waterIntake: {
          ...waterIntake.toJSON(),
          amountInML: waterIntake.getAmountInML(),
          progress: waterIntake.getProgressPercentage(),
        },
        addedAmount: amountInLiters,
        addedAmountML: amountInLiters * 1000,
        currentAmount: newAmount,
        currentAmountML: newAmount * 1000,
        remainingLiters,
        remainingML: remainingLiters * 1000,
        goalAchieved: isCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get water intake stats for the current user
 */
export const getWaterIntakeStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0] ?? '';

    const todayActivity = await WaterIntake.findOne({
      where: { userId: user.id, date: todayStr },
    });

    const currentStreak = await WaterIntake.getUserStreak(user.id);
    const longestStreak = await WaterIntake.getUserLongestStreak(user.id);

    const totalDaysCompleted = await WaterIntake.count({
      where: { userId: user.id, isCompleted: true },
    });

    const totalIntake = await WaterIntake.getUserTotalIntake(user.id);

    // Weekly data — 1 bulk query + Map, no N+1
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weekActivities = await WaterIntake.getUserActivities(user.id, sevenDaysAgo, new Date());
    const weekMap = new Map(weekActivities.map((a: WaterIntake) => [a.getFormattedDate(), a]));

    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0] ?? '';
      const activity: WaterIntake | undefined = weekMap.get(dateStr);
      return {
        date: dateStr,
        amount: activity?.amountInLiters ?? 0,
        amountML: (activity?.amountInLiters ?? 0) * 1000,
        goal: activity?.goalInLiters ?? 2.0,
        completed: activity?.isCompleted ?? false,
      };
    });

    // Monthly data — 1 bulk query + Map, no N+1
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const monthActivities = await WaterIntake.getUserActivities(user.id, thirtyDaysAgo, new Date());
    const monthMap = new Map(monthActivities.map((a: WaterIntake) => [a.getFormattedDate(), a]));

    const monthlyData = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0] ?? '';
      const activity: WaterIntake | undefined = monthMap.get(dateStr);
      return {
        date: dateStr,
        amount: activity?.amountInLiters ?? 0,
        amountML: (activity?.amountInLiters ?? 0) * 1000,
        goal: activity?.goalInLiters ?? 2.0,
        completed: activity?.isCompleted ?? false,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        today: todayActivity ? {
          ...todayActivity.toJSON(),
          amountInML: todayActivity.getAmountInML(),
          progress: todayActivity.getProgressPercentage(),
          remainingLiters: todayActivity.getRemainingLiters(),
          remainingML: todayActivity.getRemainingML(),
        } : {
          amountInLiters: 0,
          amountInML: 0,
          goalInLiters: 2.0,
          goalInML: 2000,
          isCompleted: false,
          progress: 0,
          remainingLiters: 2.0,
          remainingML: 2000,
        },
        currentStreak,
        longestStreak,
        totalDaysCompleted,
        totalLiters: totalIntake.totalLiters,
        totalML: totalIntake.totalML,
        averageDailyLiters: totalIntake.averageDailyLiters,
        averageDailyML: totalIntake.averageDailyLiters * 1000,
        weeklyData,
        monthlyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get water intake history for a date range
 */
export const getWaterIntakeHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { startDate, endDate, limit = 30 } = req.query;

    const where: any = { userId: user.id };

    if (startDate) where.date = { [Op.gte]: startDate };
    if (endDate) where.date = { ...where.date, [Op.lte]: endDate };

    const limitNum = Math.min(parseInt(limit as string, 10), 90);

    const activities = await WaterIntake.findAll({
      where,
      order: [['date', 'DESC']],
      limit: limitNum,
    });

    const activitiesWithML = activities.map(activity => ({
      ...activity.toJSON(),
      amountInML: activity.getAmountInML(),
      goalInML: activity.getGoalInML(),
      progress: activity.getProgressPercentage(),
      remainingML: activity.getRemainingML(),
    }));

    const totalDays = activities.length;
    const startDateStr = (startDate as string) || activities[activities.length - 1]?.getFormattedDate() || '';
    const endDateStr = (endDate as string) || activities[0]?.getFormattedDate() || '';

    res.status(200).json({
      success: true,
      data: activitiesWithML,
      meta: { totalDays, startDate: startDateStr, endDate: endDateStr },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get today's water intake for the current user
 */
export const getTodayWaterIntake = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0] ?? '';

    const activity = await WaterIntake.findOne({
      where: { userId: user.id, date: todayStr },
    });

    const response = activity ? {
      ...activity.toJSON(),
      amountInML: activity.getAmountInML(),
      goalInML: activity.getGoalInML(),
      progress: activity.getProgressPercentage(),
      remainingLiters: activity.getRemainingLiters(),
      remainingML: activity.getRemainingML(),
      cupsAmount: activity.getCupsAmount(),
      cupsGoal: activity.getCupsGoal(),
    } : {
      date: todayStr,
      amountInLiters: 0,
      amountInML: 0,
      goalInLiters: 2.0,
      goalInML: 2000,
      isCompleted: false,
      completedAt: null,
      streakDays: 0,
      progress: 0,
      remainingLiters: 2.0,
      remainingML: 2000,
      cupsAmount: 0,
      cupsGoal: 8,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly summary for the current user
 */
export const getWeeklyWaterSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const summary = await WaterIntake.getWeeklySummary(user.id, targetDate);

    res.status(200).json({ 
      success: true, 
      data: {
        ...summary,
        averageDailyML: summary.averageDailyLiters * 1000,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update water intake goal
 */
export const updateWaterGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { goalInLiters } = req.body;

    if (!goalInLiters || goalInLiters < 0.5 || goalInLiters > 10) {
      throw new AppError('Goal must be between 0.5 and 10 liters', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0] ?? '';

    let waterIntake = await WaterIntake.findOne({
      where: { userId: user.id, date: today },
    });

    if (waterIntake) {
      const isCompleted = waterIntake.amountInLiters >= goalInLiters;
      const completedAt = isCompleted && !waterIntake.isCompleted 
        ? new Date() 
        : waterIntake.completedAt;

      await waterIntake.update({
        goalInLiters,
        isCompleted,
        completedAt,
      });
    } else {
      waterIntake = await WaterIntake.create({
        userId: user.id,
        date: today, // ✅ Use Date object, not string
        amountInLiters: 0,
        goalInLiters,
        isCompleted: false,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Water goal updated successfully',
      data: {
        goalInLiters,
        goalInML: goalInLiters * 1000,
        cupsGoal: Math.round((goalInLiters * 1000) / 250),
        waterIntake: {
          ...waterIntake.toJSON(),
          amountInML: waterIntake.getAmountInML(),
          progress: waterIntake.getProgressPercentage(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's total water intake statistics
 */
export const getUserTotalIntake = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const totalIntake = await WaterIntake.getUserTotalIntake(user.id);

    res.status(200).json({ 
      success: true, 
      data: {
        totalLiters: totalIntake.totalLiters,
        totalML: totalIntake.totalML,
        averageDailyLiters: totalIntake.averageDailyLiters,
        averageDailyML: totalIntake.averageDailyLiters * 1000,
        averageDailyCups: Math.round((totalIntake.averageDailyLiters * 1000) / 250),
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's streak information
 */
export const getUserStreak = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const currentStreak = await WaterIntake.getUserStreak(user.id);
    const longestStreak = await WaterIntake.getUserLongestStreak(user.id);

    res.status(200).json({ 
      success: true, 
      data: { 
        currentStreak,
        longestStreak,
      } 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly summary for the current user
 */
export const getMonthlyWaterSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { year, month } = req.query;
    
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    if (targetMonth < 1 || targetMonth > 12) {
      throw new AppError('Month must be between 1 and 12', 400);
    }

    const summary = await WaterIntake.getMonthlySummary(user.id, targetYear, targetMonth);

    res.status(200).json({ 
      success: true, 
      data: {
        ...summary,
        totalML: summary.totalLiters * 1000,
        averageDailyML: summary.averageDailyLiters * 1000,
      }
    });
  } catch (error) {
    next(error);
  }
};