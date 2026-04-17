import type { Request, Response, NextFunction } from 'express';
import { WorkoutSession, WorkoutSessionSet, Workout } from '../models/sql/index.js';
import { Op, Sequelize } from 'sequelize';
import { MetricsCalculationService } from '../services/metricsCalculationService.js';
import { AppError, NotFoundError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Get all sets for a workout session
 */
export const getSessionSets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;
    
    const { completed, limit } = req.query;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Build where conditions
    const where: any = { sessionId };
    
    if (completed !== undefined) {
      where.isCompleted = completed === 'true';
    }

    // Build query options
    const queryOptions: any = {
      where,
      order: [['setNumber', 'ASC']],
    };

    if (limit) {
      queryOptions.limit = parseInt(limit as string, 10);
    }

    const sets = await WorkoutSessionSet.findAll(queryOptions);

    // Calculate summary
    const totalSets = sets.length;
    const completedSets = sets.filter(s => s.isCompleted).length;
    const totalVolume = sets.reduce((sum, s) => sum + s.getVolume(), 0);
    const maxWeight = (() => {
  const weights = sets
    .filter(s => s.weight !== null)
    .map(s => Number(s.weight));
  return weights.length > 0 ? Math.max(...weights) : null;
})();
    const avgReps = sets.length > 0
      ? sets.reduce((sum, s) => sum + s.reps, 0) / sets.length
      : 0;

    res.status(200).json({
      success: true,
      data: sets,
      summary: {
        totalSets,
        completedSets,
        totalVolume,
        maxWeight,
        averageReps: Math.round(avgReps * 10) / 10,
        completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single set by ID
 */
export const getSetById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;
    const setId = Array.isArray(req.params.setId) 
      ? req.params.setId[0] 
      : req.params.setId;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    const set = await WorkoutSessionSet.findOne({
      where: { id: setId, sessionId },
    });

    if (!set) {
      throw new NotFoundError('Set not found');
    }

    // Get previous set for comparison
    const previousSet = await WorkoutSessionSet.findOne({
      where: {
        sessionId,
        setNumber: { [Op.lt]: set.setNumber },
      },
      order: [['setNumber', 'DESC']],
    });

    // Get next set
    const nextSet = await WorkoutSessionSet.findOne({
      where: {
        sessionId,
        setNumber: { [Op.gt]: set.setNumber },
      },
      order: [['setNumber', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: {
        ...set.toJSON(),
        volume: set.getVolume(),
        displayString: set.getDisplayString(),
        previousSet: previousSet ? {
          id: previousSet.id,
          setNumber: previousSet.setNumber,
          reps: previousSet.reps,
          weight: previousSet.weight,
        } : null,
        nextSet: nextSet ? {
          id: nextSet.id,
          setNumber: nextSet.setNumber,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a set to a workout session
 */
export const addSetToWorkoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.id) 
      ? req.params.id[0] 
      : req.params.id;
    
    const { 
      reps, 
      weight, 
      is_completed, 
      completed_at, 
      rest_time_seconds, 
      notes 
    } = req.body;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Get next set number
    const nextSetNumber = await WorkoutSessionSet.getNextSetNumber(session.id);

    // Create new set
    const newSet = await WorkoutSessionSet.create({
      sessionId: session.id,
      setNumber: nextSetNumber,
      reps,
      weight: weight !== undefined ? weight : null,
      isCompleted: is_completed ?? true,
      completedAt: completed_at || (is_completed !== false ? new Date() : null),
      restTimeSeconds: rest_time_seconds,
      notes,
    });

    // Recalculate session totals
    await session.recalculateTotals();

    // Get all sets for response
    const allSets = await WorkoutSessionSet.findAll({
      where: { sessionId: session.id },
      order: [['setNumber', 'ASC']],
    });

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(201).json({
      success: true,
      message: `Set ${nextSetNumber} added successfully`,
      data: {
        set: {
          ...newSet.toJSON(),
          volume: newSet.getVolume(),
          displayString: newSet.getDisplayString(),
        },
        session: {
          id: session.id,
          totalSets: session.totalSets,
          totalReps: session.totalReps,
          totalVolume: session.totalVolume,
          maxWeight: session.maxWeight,
        },
        allSets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add sets to a workout session
 */
export const bulkAddSetsToWorkoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.id) 
      ? req.params.id[0] 
      : req.params.id;
    
    const { sets } = req.body;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Get next set number
    const startSetNumber = await WorkoutSessionSet.getNextSetNumber(session.id);

    // Create sets
    const createdSets = await WorkoutSessionSet.bulkCreate(
      sets.map((set: any, index: number) => ({
        sessionId: session.id,
        setNumber: startSetNumber + index,
        reps: set.reps,
        weight: set.weight !== undefined ? set.weight : null,
        isCompleted: set.is_completed ?? true,
        completedAt: set.completed_at || (set.is_completed !== false ? new Date() : null),
        restTimeSeconds: set.rest_time_seconds,
        notes: set.notes,
      }))
    );

    // Recalculate session totals
    await session.recalculateTotals();

    // Get all sets for response
    const allSets = await WorkoutSessionSet.findAll({
      where: { sessionId: session.id },
      order: [['setNumber', 'ASC']],
    });

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(201).json({
      success: true,
      message: `${createdSets.length} sets added successfully`,
      data: {
        sets: createdSets.map(s => ({
          ...s.toJSON(),
          volume: s.getVolume(),
        })),
        session: {
          id: session.id,
          totalSets: session.totalSets,
          totalReps: session.totalReps,
          totalVolume: session.totalVolume,
          maxWeight: session.maxWeight,
        },
        allSets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a specific set
 */
export const updateWorkoutSessionSet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;
    const setId = Array.isArray(req.params.setId) 
      ? req.params.setId[0] 
      : req.params.setId;
    
    const { 
      reps, 
      weight, 
      is_completed, 
      rest_time_seconds, 
      notes 
    } = req.body;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Find the set
    const set = await WorkoutSessionSet.findOne({
      where: { id: setId, sessionId },
    });

    if (!set) {
      throw new NotFoundError('Set not found');
    }

    // Track changes for response
    const changes: string[] = [];
    if (reps !== undefined && reps !== set.reps) changes.push('reps');
    if (weight !== undefined && weight !== set.weight) changes.push('weight');
    if (is_completed !== undefined && is_completed !== set.isCompleted) changes.push('completion status');

    // Update set
    await set.update({
      reps: reps ?? set.reps,
      weight: weight !== undefined ? weight : set.weight,
      isCompleted: is_completed ?? set.isCompleted,
      completedAt: is_completed === true && !set.isCompleted ? new Date() : set.completedAt,
      restTimeSeconds: rest_time_seconds !== undefined ? rest_time_seconds : set.restTimeSeconds,
      notes: notes !== undefined ? notes : set.notes,
    });

    // Recalculate session totals
    await session.recalculateTotals();

    // Get all sets for response
    const allSets = await WorkoutSessionSet.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: `Set ${set.setNumber} updated successfully`,
      data: {
        set: {
          ...set.toJSON(),
          volume: set.getVolume(),
          displayString: set.getDisplayString(),
        },
        session: {
          id: session.id,
          totalSets: session.totalSets,
          totalReps: session.totalReps,
          totalVolume: session.totalVolume,
          maxWeight: session.maxWeight,
        },
        changes: changes.length > 0 ? changes : undefined,
        allSets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a set as completed
 */
export const markSetCompleted = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;
    const setId = Array.isArray(req.params.setId) 
      ? req.params.setId[0] 
      : req.params.setId;
    
    const { completed_at } = req.body;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Find the set
    const set = await WorkoutSessionSet.findOne({
      where: { id: setId, sessionId },
    });

    if (!set) {
      throw new NotFoundError('Set not found');
    }

    if (set.isCompleted) {
      throw new AppError('Set is already completed', 400);
    }

    // Mark as completed
    set.markCompleted();
    if (completed_at) {
      set.completedAt = new Date(completed_at);
    }
    await set.save();

    // Check if all sets are completed
    const allSets = await WorkoutSessionSet.findAll({
      where: { sessionId },
    });
    const allCompleted = allSets.every(s => s.isCompleted);

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: `Set ${set.setNumber} marked as completed`,
      data: {
        set: {
          ...set.toJSON(),
          volume: set.getVolume(),
        },
        sessionCompleted: allCompleted,
        nextSet: allSets.find(s => !s.isCompleted)?.setNumber || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update sets
 */
export const bulkUpdateSets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;
    
    const { sets } = req.body;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    const updatedSets: WorkoutSessionSet[] = [];
    const errors: any[] = [];

    for (const setData of sets) {
      try {
        const set = await WorkoutSessionSet.findOne({
          where: { id: setData.id, sessionId },
        });

        if (set) {
          await set.update({
            reps: setData.reps ?? set.reps,
            weight: setData.weight !== undefined ? setData.weight : set.weight,
            isCompleted: setData.is_completed ?? set.isCompleted,
            completedAt: setData.is_completed === true && !set.isCompleted ? new Date() : set.completedAt,
            restTimeSeconds: setData.rest_time_seconds !== undefined ? setData.rest_time_seconds : set.restTimeSeconds,
            notes: setData.notes !== undefined ? setData.notes : set.notes,
          });
          updatedSets.push(set);
        } else {
          errors.push({ id: setData.id, error: 'Set not found' });
        }
      } catch (err) {
        errors.push({ id: setData.id, error: (err as Error).message });
      }
    }

    // Recalculate session totals
    await session.recalculateTotals();

    // Get all sets for response
    const allSets = await WorkoutSessionSet.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: `${updatedSets.length} sets updated successfully`,
      data: {
        updatedSets: updatedSets.map(s => ({
          ...s.toJSON(),
          volume: s.getVolume(),
        })),
        session: {
          id: session.id,
          totalSets: session.totalSets,
          totalReps: session.totalReps,
          totalVolume: session.totalVolume,
          maxWeight: session.maxWeight,
        },
        errors: errors.length > 0 ? errors : undefined,
        allSets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific set
 */
export const deleteWorkoutSessionSet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;
    const setId = Array.isArray(req.params.setId) 
      ? req.params.setId[0] 
      : req.params.setId;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Find the set
    const set = await WorkoutSessionSet.findOne({
      where: { id: setId, sessionId },
    });

    if (!set) {
      throw new NotFoundError('Set not found');
    }

    const deletedSetNumber = set.setNumber;

    // Delete the set
    await set.destroy();

    // Renumber remaining sets
    const remainingSets = await WorkoutSessionSet.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });

    for (let i = 0; i < remainingSets.length; i++) {
      const currentSet = remainingSets[i];
      if (currentSet) {
        await currentSet.update({ setNumber: i + 1 });
      }
    }

    // Recalculate session totals
    await session.recalculateTotals();

    // Get all sets for response
    const allSets = await WorkoutSessionSet.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });

    // Update user metrics in the background
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: `Set ${deletedSetNumber} deleted successfully`,
      data: {
        session: {
          id: session.id,
          totalSets: session.totalSets,
          totalReps: session.totalReps,
          totalVolume: session.totalVolume,
          maxWeight: session.maxWeight,
        },
        allSets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder sets in a session
 */
export const reorderSets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;
    
    const { setOrder } = req.body;

    // Verify session belongs to user
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Verify all sets belong to this session
    const existingSets = await WorkoutSessionSet.findAll({
      where: { sessionId },
    });

    const existingSetIds = existingSets.map(s => s.id);
    const allSetsExist = setOrder.every((id: number) => existingSetIds.includes(id));

    if (!allSetsExist) {
      throw new AppError('Some sets do not belong to this session', 400);
    }

    if (setOrder.length !== existingSets.length) {
      throw new AppError('setOrder must include all sets in the session', 400);
    }

    // Update set numbers
    for (let i = 0; i < setOrder.length; i++) {
      await WorkoutSessionSet.update(
        { setNumber: i + 1 },
        { where: { id: setOrder[i], sessionId } }
      );
    }

    // Get updated sets
    const updatedSets = await WorkoutSessionSet.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });

    res.status(200).json({
      success: true,
      message: 'Sets reordered successfully',
      data: {
        sets: updatedSets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get set statistics for a session
 */
export const getSetStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const sessionId = Array.isArray(req.params.sessionId) 
      ? req.params.sessionId[0] 
      : req.params.sessionId;

    // Verify session belongs to user and include workout
    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area'],
        },
      ],
    });

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    const sets = await WorkoutSessionSet.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });

    // Access workout through type assertion or optional chaining
    const workoutData = (session as any).workout;

    // Calculate detailed statistics
    const totalSets = sets.length;
    const completedSets = sets.filter(s => s.isCompleted).length;
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
    const totalVolume = sets.reduce((sum, s) => sum + s.getVolume(), 0);
    
    // Weight statistics
    const weights = sets
  .filter(s => s.weight !== null && Number(s.weight) > 0)
  .map(s => Number(s.weight));
const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
const minWeight = weights.length > 0 ? Math.min(...weights) : null;
const avgWeight = weights.length > 0 
  ? weights.reduce((sum, w) => sum + w, 0) / weights.length 
  : null;

    // Rep statistics
    const reps = sets.map(s => s.reps);
    const maxReps = reps.length > 0 ? Math.max(...reps) : 0;
    const minReps = reps.length > 0 ? Math.min(...reps) : 0;
    const avgReps = reps.length > 0 
      ? reps.reduce((sum, r) => sum + r, 0) / reps.length 
      : 0;

    // Volume per set
    const volumePerSet = sets.map(s => ({
      setNumber: s.setNumber,
      volume: s.getVolume(),
      reps: s.reps,
      weight: s.weight,
    }));

    // Find best set (highest volume)
    const bestSet = sets.length > 0
      ? sets.reduce((best, s) => s.getVolume() > best.getVolume() ? s : best)
      : null;

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          workout: workoutData || null,
          duration: session.duration,
          completedAt: session.completedAt,
        },
        summary: {
          totalSets,
          completedSets,
          totalReps,
          totalVolume,
          completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
        },
        weightStats: {
  max: maxWeight,
  min: minWeight,
  average: avgWeight !== null ? Math.round(avgWeight * 10) / 10 : null,
  bodyweightOnly: weights.length === 0,
},
        repStats: {
          max: maxReps,
          min: minReps,
          average: Math.round(avgReps * 10) / 10,
        },
        volumePerSet,
        bestSet: bestSet ? {
          setNumber: bestSet.setNumber,
          reps: bestSet.reps,
          weight: Number(bestSet.weight),
          volume: bestSet.getVolume(),
        } : null,
        restTimeStats: {
          average: sets.length > 0
            ? Math.round(sets.reduce((sum, s) => sum + (s.restTimeSeconds || 0), 0) / sets.length)
            : 0,
          total: sets.reduce((sum, s) => sum + (s.restTimeSeconds || 0), 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};