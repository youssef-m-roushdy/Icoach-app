import type { Request, Response, NextFunction } from 'express';
import { Injury, WorkoutInjury, Workout } from '../models/sql/index.js';
import { Op } from 'sequelize';
import { AppError } from '../utils/errors.js';
import { sequelize } from '../config/database.js'; // Add this import

/**
 * Get all injuries with optional filtering and pagination
 */
export const getInjuries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      bodyPart,
      severity,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where: any = {};

    if (bodyPart) {
      where.bodyPart = bodyPart;
    }

    if (severity) {
      where.severity = severity;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Injury.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['id', 'ASC']],
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
 * Get a single injury by ID
 */
export const getInjuryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const injury = await Injury.findByPk(id);

    if (!injury) {
      res.status(404).json({
        success: false,
        message: 'Injury not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: injury,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all workouts related to a specific injury
 */
export const getWorkoutsByInjuryId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const injuryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Check if injury exists
    const injury = await Injury.findByPk(injuryId);
    if (!injury) {
      res.status(404).json({
        success: false,
        message: 'Injury not found',
      });
      return;
    }

    // Get all workout IDs associated with this injury
    const workoutInjuries = await WorkoutInjury.findAll({
      where: { injuryId },
      attributes: ['workoutId'],
    });

    const workoutIds = workoutInjuries.map(wi => wi.workoutId);

    if (workoutIds.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
        message: 'No workouts found for this injury',
      });
      return;
    }

    // Get the actual workout details
    const workouts = await Workout.findAll({
      where: {
        id: {
          [Op.in]: workoutIds,
        },
      },
      order: [['id', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: {
        injury,
        workouts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all injuries related to a specific workout
 * This is the POST endpoint you requested - takes workout ID and returns related injuries
 */
export const getInjuriesByWorkoutId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workoutId } = req.body;

    if (!workoutId) {
      res.status(400).json({
        success: false,
        message: 'workoutId is required in the request body',
      });
      return;
    }

    // Check if workout exists
    const workout = await Workout.findByPk(workoutId);
    if (!workout) {
      res.status(404).json({
        success: false,
        message: 'Workout not found',
      });
      return;
    }

    // Get all injury IDs associated with this workout
    const workoutInjuries = await WorkoutInjury.findAll({
      where: { workoutId },
      attributes: ['injuryId'],
    });

    const injuryIds = workoutInjuries.map(wi => wi.injuryId);

    if (injuryIds.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          workout,
          injuries: [],
        },
        message: 'No injuries found for this workout',
      });
      return;
    }

    // Get the actual injury details
    const injuries = await Injury.findAll({
      where: {
        id: {
          [Op.in]: injuryIds,
        },
      },
      order: [['severity', 'DESC']], // Show severe injuries first
    });

    res.status(200).json({
      success: true,
      data: {
        workout,
        injuries,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new injury
 */
export const createInjury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      bodyPart,
      severity,
      description,
    } = req.body;

    // Validate required fields
    if (!name || !bodyPart || !severity) {
      throw new AppError('Name, bodyPart, and severity are required', 400);
    }

    // Validate severity enum
    const validSeverities = ['mild', 'moderate', 'severe'];
    if (!validSeverities.includes(severity)) {
      throw new AppError('Severity must be mild, moderate, or severe', 400);
    }

    // Check if injury with same name already exists
    const existingInjury = await Injury.findOne({
      where: { name: { [Op.iLike]: name } },
    });

    if (existingInjury) {
      throw new AppError('Injury with this name already exists', 409);
    }

    const injury = await Injury.create({
      name,
      bodyPart,
      severity,
      description: description || null,
    });

    res.status(201).json({
      success: true,
      message: 'Injury created successfully',
      data: injury,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an injury by ID
 */
export const updateInjury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const {
      name,
      bodyPart,
      severity,
      description,
    } = req.body;

    const injury = await Injury.findByPk(id);

    if (!injury) {
      res.status(404).json({
        success: false,
        message: 'Injury not found',
      });
      return;
    }

    // Validate severity if provided
    if (severity) {
      const validSeverities = ['mild', 'moderate', 'severe'];
      if (!validSeverities.includes(severity)) {
        throw new AppError('Severity must be mild, moderate, or severe', 400);
      }
    }

    // Check if name already exists (excluding current injury)
    if (name && name !== injury.name) {
      const existingInjury = await Injury.findOne({
        where: {
          name: { [Op.iLike]: name },
          id: { [Op.ne]: id },
        },
      });

      if (existingInjury) {
        throw new AppError('Injury with this name already exists', 409);
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (bodyPart) updateData.bodyPart = bodyPart;
    if (severity) updateData.severity = severity;
    if (description !== undefined) updateData.description = description;

    await injury.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Injury updated successfully',
      data: injury,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an injury by ID
 * Also removes all associations with workouts
 */
export const deleteInjury = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const injury = await Injury.findByPk(id);

    if (!injury) {
      res.status(404).json({
        success: false,
        message: 'Injury not found',
      });
      return;
    }

    // The associations will be automatically deleted due to CASCADE on the foreign key
    await injury.destroy();

    res.status(200).json({
      success: true,
      message: 'Injury deleted successfully along with its workout associations',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Associate an injury with a workout (create mapping)
 */
export const associateInjuryWithWorkout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workoutId, injuryId } = req.body;

    if (!workoutId || !injuryId) {
      throw new AppError('workoutId and injuryId are required', 400);
    }

    // Check if workout exists
    const workout = await Workout.findByPk(workoutId);
    if (!workout) {
      throw new AppError('Workout not found', 404);
    }

    // Check if injury exists
    const injury = await Injury.findByPk(injuryId);
    if (!injury) {
      throw new AppError('Injury not found', 404);
    }

    // Check if association already exists
    const existingAssociation = await WorkoutInjury.findOne({
      where: { workoutId, injuryId },
    });

    if (existingAssociation) {
      throw new AppError('This injury is already associated with this workout', 409);
    }

    // Create association
    const association = await WorkoutInjury.create({
      workoutId,
      injuryId,
    });

    res.status(201).json({
      success: true,
      message: 'Injury successfully associated with workout',
      data: association,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove association between injury and workout
 */
export const dissociateInjuryFromWorkout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workoutId, injuryId } = req.body;

    if (!workoutId || !injuryId) {
      throw new AppError('workoutId and injuryId are required', 400);
    }

    const association = await WorkoutInjury.findOne({
      where: { workoutId, injuryId },
    });

    if (!association) {
      res.status(404).json({
        success: false,
        message: 'Association not found',
      });
      return;
    }

    await association.destroy();

    res.status(200).json({
      success: true,
      message: 'Injury successfully dissociated from workout',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unique values for injury filtering
 */
export const getInjuryFilters = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [bodyParts, severities] = await Promise.all([
      Injury.findAll({
        attributes: ['bodyPart'],
        group: ['bodyPart'],
        raw: true,
      }),
      Injury.findAll({
        attributes: ['severity'],
        group: ['severity'],
        raw: true,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        bodyParts: bodyParts.map((item: any) => item.bodyPart),
        severities: severities.map((item: any) => item.severity),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get injury statistics (count by body part and severity)
 */
export const getInjuryStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [byBodyPart, bySeverity] = await Promise.all([
      Injury.findAll({
        attributes: [
          'bodyPart',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['bodyPart'],
        raw: true,
      }),
      Injury.findAll({
        attributes: [
          'severity',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['severity'],
        raw: true,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        byBodyPart,
        bySeverity,
        total: await Injury.count(),
      },
    });
  } catch (error) {
    next(error);
  }
};