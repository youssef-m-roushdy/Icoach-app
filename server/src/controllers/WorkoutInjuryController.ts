import type { Request, Response, NextFunction } from 'express';
import { WorkoutInjury, Workout, Injury } from '../models/sql/index.js';
import { Op } from 'sequelize';
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Get all workout-injury relationships with optional filtering and pagination
 */
export const getWorkoutInjuries = async (
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
      workoutId,
      injuryId,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where: any = {};

    if (workoutId) {
      where.workoutId = parseInt(workoutId as string, 10);
    }

    if (injuryId) {
      where.injuryId = parseInt(injuryId as string, 10);
    }

    const { count, rows } = await WorkoutInjury.findAndCountAll({
      where,
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'level', 'equipment', 'gif_link'],
        },
        {
          model: Injury,
          as: 'injury',
          attributes: ['id', 'name', 'bodyPart', 'severity', 'description'],
        },
      ],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
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
 * Get a single workout-injury relationship by ID
 */
export const getWorkoutInjuryById = async (
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

    const workoutInjury = await WorkoutInjury.findByPk(id, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'level', 'equipment', 'gif_link'],
        },
        {
          model: Injury,
          as: 'injury',
          attributes: ['id', 'name', 'bodyPart', 'severity', 'description'],
        },
      ],
    });

    if (!workoutInjury) {
      throw new NotFoundError('Workout-injury relationship not found');
    }

    res.status(200).json({
      success: true,
      data: workoutInjury,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new workout-injury relationship (Admin only)
 */
export const createWorkoutInjury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // Admin check
    if (user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { workoutId, injuryId } = req.body;

    // Check if workout exists
    const workout = await Workout.findByPk(workoutId);
    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    // Check if injury exists
    const injury = await Injury.findByPk(injuryId);
    if (!injury) {
      throw new NotFoundError('Injury not found');
    }

    // Check if relationship already exists
    const existing = await WorkoutInjury.findOne({
      where: { workoutId, injuryId },
    });

    if (existing) {
      throw new ConflictError('This workout-injury relationship already exists');
    }

    // Create relationship
    const workoutInjury = await WorkoutInjury.create({
      workoutId,
      injuryId,
    });

    // Fetch with details
    const result = await WorkoutInjury.findByPk(workoutInjury.id, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area'],
        },
        {
          model: Injury,
          as: 'injury',
          attributes: ['id', 'name', 'bodyPart', 'severity'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Workout-injury relationship created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a workout-injury relationship (Admin only)
 */
export const deleteWorkoutInjury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // Admin check
    if (user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const workoutInjury = await WorkoutInjury.findByPk(id);

    if (!workoutInjury) {
      throw new NotFoundError('Workout-injury relationship not found');
    }

    await workoutInjury.destroy();

    res.status(200).json({
      success: true,
      message: 'Workout-injury relationship deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all injuries for a specific workout
 */
export const getInjuriesByWorkout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const workoutId = Array.isArray(req.params.workoutId) ? req.params.workoutId[0] : req.params.workoutId;

    // Check if workout exists
    const workout = await Workout.findByPk(workoutId);
    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    const workoutInjuries = await WorkoutInjury.findAll({
      where: { workoutId },
      include: [
        {
          model: Injury,
          as: 'injury',
          attributes: ['id', 'name', 'bodyPart', 'severity', 'description'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const injuries = workoutInjuries.map(wi => (wi as any).injury);

    res.status(200).json({
      success: true,
      data: {
        workout,
        injuries,
        count: injuries.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all workouts for a specific injury
 */
export const getWorkoutsByInjury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const injuryId = Array.isArray(req.params.injuryId) ? req.params.injuryId[0] : req.params.injuryId;

    // Check if injury exists
    const injury = await Injury.findByPk(injuryId);
    if (!injury) {
      throw new NotFoundError('Injury not found');
    }

    const workoutInjuries = await WorkoutInjury.findAll({
      where: { injuryId },
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'level', 'equipment', 'gif_link'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const workouts = workoutInjuries.map(wi => (wi as any).workout);

    res.status(200).json({
      success: true,
      data: {
        injury,
        workouts,
        count: workouts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create workout-injury relationships (Admin only)
 */
export const bulkCreateWorkoutInjuries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // Admin check
    if (user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const { relationships } = req.body;

    if (!relationships || !Array.isArray(relationships) || relationships.length === 0) {
      throw new AppError('relationships array is required with at least 1 item', 400);
    }

    const created = [];
    const errors = [];

    for (const rel of relationships) {
      try {
        const { workoutId, injuryId } = rel;

        // Check if workout exists
        const workout = await Workout.findByPk(workoutId);
        if (!workout) {
          errors.push({ workoutId, injuryId, error: 'Workout not found' });
          continue;
        }

        // Check if injury exists
        const injury = await Injury.findByPk(injuryId);
        if (!injury) {
          errors.push({ workoutId, injuryId, error: 'Injury not found' });
          continue;
        }

        // Check if relationship already exists
        const existing = await WorkoutInjury.findOne({
          where: { workoutId, injuryId },
        });

        if (existing) {
          errors.push({ workoutId, injuryId, error: 'Relationship already exists' });
          continue;
        }

        const workoutInjury = await WorkoutInjury.create({
          workoutId,
          injuryId,
        });

        created.push(workoutInjury);
      } catch (error) {
        errors.push({ ...rel, error: (error as Error).message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${created.length} workout-injury relationships created successfully`,
      data: {
        created,
        errors: errors.length > 0 ? errors : undefined,
        totalRequested: relationships.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a specific workout-injury relationship exists
 */
export const checkWorkoutInjuryExists = async (
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
    const injuryId = parseInt(req.params.injuryId as string, 10);

    if (isNaN(workoutId) || isNaN(injuryId)) {
      throw new AppError('Valid workoutId and injuryId are required', 400);
    }

    const workoutInjury = await WorkoutInjury.findOne({
      where: { workoutId, injuryId },
    });

    res.status(200).json({
      success: true,
      data: {
        exists: !!workoutInjury,
        relationshipId: workoutInjury?.id || null,
        workoutId,
        injuryId,
      },
    });
  } catch (error) {
    next(error);
  }
};