import type { Request, Response, NextFunction } from 'express';
import { PersonalBest, Workout } from '../models/sql/index.js';
import { AppError, NotFoundError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * GET /api/personal-bests
 * All personal bests for the authenticated user
 */
export const getAllPersonalBests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const pbs = await PersonalBest.findAll({
      where: { userId: user.id },
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link', 'equipment', 'level'],
        },
      ],
      order: [['achievedAt', 'DESC']],
    });

    const formatted = pbs.map(pb => {
      const workout = (pb as any).workout;
      return {
        id: pb.id,
        workoutId: pb.workoutId,
        exerciseName: workout?.name || pb.exerciseName,
        bodyPart: workout?.body_part || null,
        targetArea: workout?.target_area || null,
        gifLink: workout?.gif_link || null,
        equipment: workout?.equipment || null,
        level: workout?.level || null,
        weight: pb.weight,
        reps: pb.reps,
        isBodyweight: pb.isBodyweight(),
        displayValue: pb.getDisplayValue(),
        achievedAt: pb.achievedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/personal-bests/:workoutId
 * Personal best for a specific workout
 */
export const getPersonalBestByWorkout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const workoutId = parseInt(req.params.workoutId as string, 10);
    if (isNaN(workoutId)) {
      throw new AppError('Invalid workout ID', 400);
    }

    // Verify workout exists
    const workout = await Workout.findByPk(workoutId, {
      attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link', 'equipment', 'level'],
    });

    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    const pb = await PersonalBest.findOne({
      where: { userId: user.id, workoutId },
    });

    // No PB yet for this workout — not an error, just no data
    if (!pb) {
      res.status(200).json({
        success: true,
        data: null,
        message: 'No personal best recorded yet for this workout',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: pb.id,
        workoutId: pb.workoutId,
        exerciseName: workout.name || pb.exerciseName,
        bodyPart: workout.body_part || null,
        targetArea: workout.target_area || null,
        gifLink: workout.gif_link || null,
        equipment: workout.equipment || null,
        level: workout.level || null,
        weight: pb.weight,
        reps: pb.reps,
        isBodyweight: pb.isBodyweight(),
        displayValue: pb.getDisplayValue(),
        achievedAt: pb.achievedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};