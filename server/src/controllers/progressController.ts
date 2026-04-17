import type { Request, Response, NextFunction } from 'express';
import { User, WorkoutSession, PersonalBest, UserMetrics, Workout } from '../models/sql/index.js';
import { MetricsCalculationService } from '../services/metricsCalculationService.js';
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
 * Get all progress data for GymProgressScreen
 */
export const getProgressDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // Get user data with profile info
    const userData = await User.findByPk(user.id, {
      attributes: ['id', 'firstName', 'username', 'avatar', 'createdAt'],
    });

    if (!userData) {
      throw new AppError('User not found', 404);
    }

    // Get latest metrics from database (or calculate if not exists)
    let latestMetrics = await UserMetrics.findOne({
      where: { userId: user.id },
      order: [['date', 'DESC']],
    });

    // If no metrics exist, calculate them
    if (!latestMetrics) {
      const calculatedMetrics = await MetricsCalculationService.calculateAllMetrics(user.id);
      
      // Create metrics record
      const today = new Date().toISOString().split('T')[0];
      latestMetrics = await UserMetrics.create({
        userId: user.id,
        date: today as any,
        fitnessScore: calculatedMetrics.fitnessScore,
        strength: calculatedMetrics.strength,
        endurance: calculatedMetrics.endurance,
        consistency: calculatedMetrics.consistency,
        volume: calculatedMetrics.volume,
        progress: calculatedMetrics.progress,
        habits: calculatedMetrics.habits,
        totalWorkouts: calculatedMetrics.totalWorkouts,
        weeklyAvg: calculatedMetrics.weeklyAvg,
        currentStreak: calculatedMetrics.currentStreak,
        longestStreak: calculatedMetrics.longestStreak,
        totalVolume: calculatedMetrics.totalVolume,
        points: calculatedMetrics.points,
        badgeLevel: calculatedMetrics.badgeLevel
      });
    }

    // Get personal bests with workout details
    const personalBests = await PersonalBest.findAll({
      where: { userId: user.id },
      include: [{
        model: Workout,
        as: 'workout',
        attributes: ['name']
      }],
      order: [['weight', 'DESC']],
      limit: 5,
    });

    // Format personal bests for the screen with proper null handling
    const formattedPersonalBests = personalBests.map(pb => {
      const workoutName = (pb as any).workout?.name;
      
      // Handle bodyweight personal bests (weight === null or 0)
      let value: string;
      if (pb.weight === null || pb.weight === 0) {
        value = `Bodyweight${pb.reps > 1 ? ` × ${pb.reps}` : ''}`;
      } else {
        value = `${pb.weight} kg${pb.reps > 1 ? ` × ${pb.reps}` : ''}`;
      }
      
      return {
        exercise: workoutName || pb.exerciseName,
        value,
        isBodyweight: pb.weight === null || pb.weight === 0, // Helpful flag for frontend
      };
    });

    // Get total workouts count for training data
    const totalWorkouts = await WorkoutSession.count({
      where: { userId: user.id },
    });

    // Format joined date
    const joinedDate = new Date(userData.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });

    // Format response to match GymProgressScreen interface
    const response = {
      name: userData.firstName || userData.username || 'User',
      joinedDate: joinedDate,
      avatarUrl: userData.avatar,
      currentPoints: latestMetrics?.points || 0,
      maxPoints: 10000,
      badgeLevel: latestMetrics?.badgeLevel || 1,
      metrics: {
        strength: latestMetrics?.strength || 0,
        endurance: latestMetrics?.endurance || 0,
        consistency: latestMetrics?.consistency || 0,
        volume: latestMetrics?.volume || 0,
        progress: latestMetrics?.progress || 0,
        habits: latestMetrics?.habits || 0,
      },
      trainingData: {
        totalWorkouts: latestMetrics?.totalWorkouts || totalWorkouts,
        weeklyAvg: latestMetrics?.weeklyAvg || 0,
        currentStreak: latestMetrics?.currentStreak || 0,
        longestStreak: latestMetrics?.longestStreak || 0,
        totalVolume: latestMetrics?.totalVolume || 0,
        personalBests: formattedPersonalBests,
      },
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
 * Get historical metrics for charts
 */
export const getMetricsHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string, 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const metrics = await UserMetrics.findAll({
      where: {
        userId: user.id,
        date: { [Op.gte]: startDate.toISOString().split('T')[0] },
      },
      order: [['date', 'ASC']],
      attributes: ['date', 'fitnessScore', 'strength', 'endurance', 'consistency', 'volume', 'progress', 'habits'],
    });

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};