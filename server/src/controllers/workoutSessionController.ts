import type { Request, Response, NextFunction } from 'express';
import { WorkoutSession, Workout } from '../models/sql/index.js';
import { Op, Sequelize } from 'sequelize';
import { MetricsCalculationService } from '../services/metricsCalculationService.js';
import { UserMetrics } from '../models/sql/index.js';
import { AppError, NotFoundError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Get all workout sessions for the authenticated user with optional filtering and pagination
 * Supports filtering by:
 * - Date range (startDate, endDate)
 * - Text search on workout name, body part, target area (bodyPart, targetArea, workoutName)
 * - Numeric filters (minDuration, minVolume)
 */
export const getWorkoutSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      minDuration,
      minVolume,
      bodyPart,
      targetArea,
      workoutName,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions for WorkoutSession
    const sessionWhere: any = { userId: user.id };

    // Date range filter
    if (startDate || endDate) {
      sessionWhere.completedAt = {};
      if (startDate) {
        sessionWhere.completedAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        sessionWhere.completedAt[Op.lte] = new Date(endDate as string);
      }
    }

    // Numeric filters
    if (minDuration) {
      sessionWhere.duration = { [Op.gte]: parseInt(minDuration as string, 10) };
    }

    if (minVolume) {
      sessionWhere.volume = { [Op.gte]: parseFloat(minVolume as string) };
    }

    // Build filter conditions for Workout (through include)
    const workoutWhere: any = {};

    // Text search filters
    if (bodyPart) {
      workoutWhere.body_part = { [Op.iLike]: `%${bodyPart}%` };
    }

    if (targetArea) {
      workoutWhere.target_area = { [Op.iLike]: `%${targetArea}%` };
    }

    if (workoutName) {
      workoutWhere.name = { [Op.iLike]: `%${workoutName}%` };
    }

    // Build include with where conditions if any text filters are applied
    const include: any = {
      model: Workout,
      as: 'workout',
      attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
    };

    // Only add where clause to include if there are text filters
    if (Object.keys(workoutWhere).length > 0) {
      include.where = workoutWhere;
    }

    const { count, rows } = await WorkoutSession.findAndCountAll({
      where: sessionWhere,
      include: [include],
      limit: limitNum,
      offset,
      order: [['completedAt', 'DESC']],
      distinct: true, // Important for correct count when using include with where
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single workout session by ID
 */
export const getWorkoutSessionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const workoutSession = await WorkoutSession.findOne({
      where: { id, userId: user.id },
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link', 'equipment', 'level'],
        },
      ],
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    res.status(200).json({
      success: true,
      data: workoutSession,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new workout session
 */
export const createWorkoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const {
      workoutId,
      duration,
      sets,
      reps,
      weight,
      volume,
      completedAt,
      notes,
    } = req.body;

    // Verify workout exists
    const workout = await Workout.findByPk(workoutId);
    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    // Calculate volume if not provided
    const calculatedVolume = volume || (weight * reps * sets);

    // Create workout session
    const workoutSession = await WorkoutSession.create({
      userId: user.id,
      workoutId,
      duration,
      sets,
      reps,
      weight,
      volume: calculatedVolume,
      completedAt: completedAt || new Date(),
      notes,
    });

    // Fetch created session with workout details
    const sessionWithDetails = await WorkoutSession.findByPk(workoutSession.id, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
        },
      ],
    });

    // Update user metrics in the background (don't await)
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Workout session created successfully',
      data: sessionWithDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a workout session by ID
 */
export const updateWorkoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const {
      workoutId,
      duration,
      sets,
      reps,
      weight,
      volume,
      completedAt,
      notes,
    } = req.body;

    const workoutSession = await WorkoutSession.findOne({
      where: { id, userId: user.id },
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    // If workoutId is being updated, verify new workout exists
    if (workoutId && workoutId !== workoutSession.workoutId) {
      const workout = await Workout.findByPk(workoutId);
      if (!workout) {
        throw new NotFoundError('Workout not found');
      }
    }

    // Prepare update data
    const updateData: any = {
      workoutId,
      duration,
      sets,
      reps,
      weight,
      completedAt,
      notes,
    };

    // Calculate volume if weight, reps, or sets changed and volume not provided
    if ((weight || reps || sets) && !volume) {
      const newWeight = weight || workoutSession.weight;
      const newReps = reps || workoutSession.reps;
      const newSets = sets || workoutSession.sets;
      updateData.volume = newWeight * newReps * newSets;
    } else if (volume) {
      updateData.volume = volume;
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await workoutSession.update(updateData);

    // Fetch updated session with workout details
    const updatedSession = await WorkoutSession.findByPk(id, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
        },
      ],
    });

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: 'Workout session updated successfully',
      data: updatedSession,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a workout session by ID
 */
export const deleteWorkoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const workoutSession = await WorkoutSession.findOne({
      where: { id, userId: user.id },
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    await workoutSession.destroy();

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: 'Workout session deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get workout session statistics for the user
 */
export const getWorkoutSessionStats = async (
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

    const sessions = await WorkoutSession.findAll({
      where: {
        userId: user.id,
        completedAt: { [Op.gte]: startDate },
      },
      attributes: ['completedAt', 'duration', 'volume'],
      order: [['completedAt', 'ASC']],
    });

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalVolume = sessions.reduce((sum, s) => sum + Number(s.volume), 0);
    
    // Group by date for chart data
    const chartData = sessions.reduce((acc: Record<string, any>, session) => {
      // Safety check in case completedAt is missing/null to prevent runtime errors
      if (!session.completedAt) return acc;

      // FIX: Use substring(0, 10) to guarantee a string type
      const date = new Date(session.completedAt).toISOString().substring(0, 10);
      
      if (!acc[date]) {
        acc[date] = {
          date,
          sessions: 0,
          duration: 0,
          volume: 0,
        };
      }
      acc[date].sessions += 1;
      acc[date].duration += session.duration;
      acc[date].volume += Number(session.volume);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSessions,
          totalDuration,
          totalVolume,
          averageDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
          averageVolume: totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0,
        },
        chartData: Object.values(chartData),
      },
    });
  } catch (error) {
    next(error);
  }
};