import type { Request, Response, NextFunction } from 'express';
import { SavedWorkout, Workout } from '../models/sql/index.js';
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}


  export const saveWorkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { workoutId } = req.body;

      // Check if workout exists
      const workout = await Workout.findByPk(workoutId);
      if (!workout) {
        throw new NotFoundError('Workout not found');
      }

      // Check if already saved
      const existing = await SavedWorkout.findOne({
        where: {
          userId: user.id,
          workoutId: workoutId,
        },
      });

      if (existing) {
        throw new ConflictError('Workout already saved');
      }

      // Create saved workout
      const savedWorkout = await SavedWorkout.create({
        userId: user.id,
        workoutId: workoutId,
      });

      // Fetch with workout details
      const result = await SavedWorkout.findByPk(savedWorkout.id, {
        include: [
          {
            model: Workout,
            as: 'workout',
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: 'Workout saved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all saved workouts for the authenticated user
   */
  export const getSavedWorkouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { page = 1, limit = 20, bodyPart, level } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause for workout filtering
      const workoutWhere: any = {};
      if (bodyPart) workoutWhere.body_part = bodyPart;
      if (level) workoutWhere.level = level;

      const { count, rows } = await SavedWorkout.findAndCountAll({
        where: { userId: user.id },
        include: [
          {
            model: Workout,
            as: 'workout',
            where: Object.keys(workoutWhere).length > 0 ? workoutWhere : undefined,
          },
        ],
        limit: Number(limit),
        offset: offset,
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        success: true,
        message: 'Saved workouts retrieved successfully',
        data: {
          savedWorkouts: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single saved workout by ID
   */
  export const getSavedWorkoutById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;

      const savedWorkout = await SavedWorkout.findOne({
        where: {
          id: id,
          userId: user.id,
        },
        include: [
          {
            model: Workout,
            as: 'workout',
          },
        ],
      });

      if (!savedWorkout) {
        throw new NotFoundError('Saved workout not found');
      }

      res.status(200).json({
        success: true,
        message: 'Saved workout retrieved successfully',
        data: savedWorkout,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a saved workout (unsave)
   */
  export const deleteSavedWorkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;

      const savedWorkout = await SavedWorkout.findOne({
        where: {
          id: id,
          userId: user.id,
        },
      });

      if (!savedWorkout) {
        throw new NotFoundError('Saved workout not found');
      }

      await savedWorkout.destroy();

      res.status(200).json({
        success: true,
        message: 'Workout removed from saved list',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if a workout is saved by the user
   */
  export const checkIfSaved = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { workoutId } = req.params;

      const savedWorkout = await SavedWorkout.findOne({
        where: {
          userId: user.id,
          workoutId: workoutId,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          isSaved: !!savedWorkout,
          savedWorkoutId: savedWorkout?.id || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
