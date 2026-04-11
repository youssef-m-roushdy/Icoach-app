import type { Request, Response, NextFunction } from 'express';
import { DailyActivity } from '../models/sql/index.js';
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
 * Sync or create daily activity for the current user
 */
export const syncDailyActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { steps, date } = req.body;

    if (steps === undefined || !date) {
      throw new AppError('Steps and date are required', 400);
    }

    let dailyActivity = await DailyActivity.findOne({
      where: { userId: user.id, date },
    });

    const goal = 10000;
    const isCompleted = steps >= goal;

    const completedAt: Date | null =
      isCompleted && !dailyActivity?.isCompleted
        ? new Date()
        : dailyActivity?.completedAt ?? null;

    // 1 point per 100 steps, capped at 100 per day
    const pointsEarned = Math.min(Math.floor(steps / 100), 100);

    // Calculate streak
    let streakDays = dailyActivity?.streakDays ?? 0;
    if (isCompleted && (!dailyActivity || !dailyActivity.isCompleted)) {
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0] ?? '';

      const yesterdayActivity = await DailyActivity.findOne({
        where: { userId: user.id, date: yesterdayStr, isCompleted: true },
      });

      streakDays = yesterdayActivity ? (dailyActivity?.streakDays ?? 0) + 1 : 1;
    }

    if (dailyActivity) {
      await dailyActivity.update({
        stepCount: steps,
        isCompleted,
        completedAt,
        pointsEarned,
        streakDays,
      });
    } else {
      dailyActivity = await DailyActivity.create({
        userId: user.id,
        date,
        stepCount: steps,
        goal,
        isCompleted,
        completedAt,
        pointsEarned,
        streakDays,
      });
    }

    const newTotalPoints = await DailyActivity.getUserTotalPoints(user.id);

    res.status(200).json({
      success: true,
      message: isCompleted ? 'Goal achieved! 🎉' : 'Steps synced successfully',
      data: {
        dailyActive: dailyActivity,
        pointsAdded: pointsEarned,
        newTotalPoints,
        streakMaintained: streakDays > 0,
        goalAchieved: isCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily activity stats for the current user
 */
export const getDailyActivityStats = async (
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

    const todayActivity = await DailyActivity.findOne({
      where: { userId: user.id, date: todayStr },
    });

    const currentStreak = await DailyActivity.getUserStreak(user.id);

    // Longest streak — single query, in-memory iteration
    const allActivities = await DailyActivity.findAll({
      where: { userId: user.id, isCompleted: true },
      order: [['date', 'ASC']],
    });

    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const activity of allActivities) {
      const activityDate = new Date(activity.date);
      if (lastDate) {
        const daysDiff = Math.floor(
          (activityDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        tempStreak = daysDiff === 1 ? tempStreak + 1 : 1;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
      lastDate = activityDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    const totalDaysCompleted = await DailyActivity.count({
      where: { userId: user.id, isCompleted: true },
    });

    const totalSteps =
      (await DailyActivity.sum('stepCount', { where: { userId: user.id } })) || 0;

    const averageDailySteps =
      totalDaysCompleted > 0 ? Math.round(totalSteps / totalDaysCompleted) : 0;

    // Weekly data — 1 bulk query + Map, no N+1
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weekActivities = await DailyActivity.getUserActivities(user.id, sevenDaysAgo, new Date());
    const weekMap = new Map(weekActivities.map((a) => [a.getFormattedDate(), a]));

    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0] ?? '';
      const activity = weekMap.get(dateStr);
      return {
        date: dateStr,
        steps: activity?.stepCount ?? 0,
        completed: activity?.isCompleted ?? false,
      };
    });

    // Monthly data — 1 bulk query + Map, no N+1
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const monthActivities = await DailyActivity.getUserActivities(user.id, thirtyDaysAgo, new Date());
    const monthMap = new Map(monthActivities.map((a) => [a.getFormattedDate(), a]));

    const monthlyData = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0] ?? '';
      const activity = monthMap.get(dateStr);
      return {
        date: dateStr,
        steps: activity?.stepCount ?? 0,
        completed: activity?.isCompleted ?? false,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        today: todayActivity ?? null,
        currentStreak,
        longestStreak,
        totalDaysCompleted,
        totalSteps,
        averageDailySteps,
        weeklyData,
        monthlyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily activity history for a date range
 */
export const getDailyActivityHistory = async (
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

    const activities = await DailyActivity.findAll({
      where,
      order: [['date', 'DESC']],
      limit: limitNum,
    });

    const totalDays = activities.length;
    const startDateStr = (startDate as string) || activities[activities.length - 1]?.getFormattedDate() || '';
    const endDateStr   = (endDate   as string) || activities[0]?.getFormattedDate() || '';

    res.status(200).json({
      success: true,
      data: activities,
      meta: { totalDays, startDate: startDateStr, endDate: endDateStr },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get today's activity for the current user
 */
export const getTodayActivity = async (
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

    const activity = await DailyActivity.findOne({
      where: { userId: user.id, date: todayStr },
    });

    res.status(200).json({
      success: true,
      data: activity ?? null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly summary for the current user
 */
export const getWeeklySummary = async (
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
    const summary = await DailyActivity.getWeeklySummary(user.id, targetDate);

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's total points
 */
export const getUserTotalPoints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const totalPoints = await DailyActivity.getUserTotalPoints(user.id);

    res.status(200).json({ success: true, data: { totalPoints } });
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

    const currentStreak = await DailyActivity.getUserStreak(user.id);

    res.status(200).json({ success: true, data: { currentStreak } });
  } catch (error) {
    next(error);
  }
};

export const updateDailyGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { goal } = req.body;
    const { date } = req.query;

    if (!goal || goal < 1000 || goal > 50000) {
      throw new AppError('Goal must be between 1,000 and 50,000 steps', 400);
    }

    const targetDate = date ? new Date(date as string) : undefined;
    
    const activity = await DailyActivity.updateGoal(
      user.id, 
      goal, 
      targetDate
    );

    const wasJustCompleted = activity.isCompleted && 
      activity.updatedAt.getTime() === activity.completedAt?.getTime();

    res.status(200).json({
      success: true,
      message: wasJustCompleted 
        ? 'Goal updated and achieved! 🎉' 
        : 'Daily step goal updated successfully',
      data: {
        dailyActive: {
          ...activity.toJSON(),
          progress: activity.getProgressPercentage(),
          remaining: activity.getRemainingSteps(),
        },
        newGoal: goal,
        goalAchieved: activity.isCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's current step goal
 */
export const getDailyGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const goal = await DailyActivity.getUserGoal(user.id);

    res.status(200).json({
      success: true,
      data: { goal },
    });
  } catch (error) {
    next(error);
  }
};