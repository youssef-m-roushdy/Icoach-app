import type { Request, Response, NextFunction } from 'express';
import { WorkoutSession, Workout, WorkoutSessionSet } from '../models/sql/index.js';
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
      sessionWhere.totalVolume = { [Op.gte]: parseFloat(minVolume as string) };
    }

    // Build filter conditions for Workout (through include)
    const workoutWhere: any = {};

    if (bodyPart) {
      workoutWhere.body_part = { [Op.iLike]: `%${bodyPart}%` };
    }

    if (targetArea) {
      workoutWhere.target_area = { [Op.iLike]: `%${targetArea}%` };
    }

    if (workoutName) {
      workoutWhere.name = { [Op.iLike]: `%${workoutName}%` };
    }

    const include: any = [
      {
        model: Workout,
        as: 'workout',
        attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link', 'equipment', 'level'],
      },
      {
        model: WorkoutSessionSet,
        as: 'sets',
        attributes: ['id', 'setNumber', 'reps', 'weight', 'isCompleted', 'completedAt', 'restTimeSeconds'],
        separate: true,
        order: [['setNumber', 'ASC']],
      },
    ];

    // Only add where clause to include if there are text filters
    if (Object.keys(workoutWhere).length > 0) {
      include[0].where = workoutWhere;
    }

    const { count, rows } = await WorkoutSession.findAndCountAll({
      where: sessionWhere,
      include,
      limit: limitNum,
      offset,
      order: [['completedAt', 'DESC']],
      distinct: true,
    });

    // Format response with sets
    const formattedRows = rows.map(session => ({
      ...session.toJSON(),
      total_sets: session.sets?.length || 0,
    }));

    res.status(200).json({
      success: true,
      data: formattedRows,
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
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link', 'equipment', 'level', 'description'],
        },
        {
          model: WorkoutSessionSet,
          as: 'sets',
          attributes: ['id', 'setNumber', 'reps', 'weight', 'isCompleted', 'completedAt', 'restTimeSeconds', 'notes'],
          order: [['setNumber', 'ASC']],
        },
      ],
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    // Calculate additional stats
    const sets = workoutSession.sets || [];
    const completedSets = sets.filter(s => s.isCompleted).length;
    const isBodyweightOnly = sets.every(s => Number(s.weight) === 0);

    res.status(200).json({
      success: true,
      data: {
        ...workoutSession.toJSON(),
        stats: {
          totalSets: sets.length,
          completedSets,
          isBodyweightOnly,
          maxWeight: workoutSession.maxWeight,
          averageWeight: sets.length > 0 
            ? sets.reduce((sum, s) => sum + Number(s.weight), 0) / sets.length 
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new workout session with sets
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
      completedAt,
      notes,
      sets, // Array of { reps, weight, completed_at, rest_time_seconds, notes }
    } = req.body;

    // Verify workout exists
    const workout = await Workout.findByPk(workoutId);
    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    // Validate sets
    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      throw new AppError('At least one set is required', 400);
    }

    // Create workout session
    const workoutSession = await WorkoutSession.create({
      userId: user.id,
      workoutId,
      duration,
      completedAt: completedAt || new Date(),
      notes,
    });

    // Create sets
    const setRecords = await WorkoutSessionSet.bulkCreate(
      sets.map((set, index) => ({
        sessionId: workoutSession.id,
        setNumber: index + 1,
        reps: set.reps,
        weight: set.weight || 0,
        isCompleted: set.is_completed ?? true,
        completedAt: set.completed_at || (set.is_completed !== false ? new Date() : null),
        restTimeSeconds: set.rest_time_seconds,
        notes: set.notes,
      }))
    );

    // Recalculate session totals
    await workoutSession.recalculateTotals();

    // Fetch created session with all details
    const sessionWithDetails = await WorkoutSession.findByPk(workoutSession.id, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
        },
        {
          model: WorkoutSessionSet,
          as: 'sets',
          order: [['setNumber', 'ASC']],
        },
      ],
    });

    // Update user metrics in the background
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
      completedAt,
      notes,
      sets, // Optional - if provided, replaces all sets
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

    // Update session basic info
    await workoutSession.update({
      workoutId: workoutId || workoutSession.workoutId,
      duration: duration || workoutSession.duration,
      completedAt: completedAt || workoutSession.completedAt,
      notes: notes !== undefined ? notes : workoutSession.notes,
    });

    // Update sets if provided
    if (sets && Array.isArray(sets)) {
      // Delete existing sets
      await WorkoutSessionSet.destroy({
        where: { sessionId: workoutSession.id },
      });

      // Create new sets
      await WorkoutSessionSet.bulkCreate(
        sets.map((set, index) => ({
          sessionId: workoutSession.id,
          setNumber: index + 1,
          reps: set.reps,
          weight: set.weight || 0,
          isCompleted: set.is_completed ?? true,
          completedAt: set.completed_at || (set.is_completed !== false ? new Date() : null),
          restTimeSeconds: set.rest_time_seconds,
          notes: set.notes,
        }))
      );

      // Recalculate session totals
      await workoutSession.recalculateTotals();
    }

    // Fetch updated session with all details
    const updatedSession = await WorkoutSession.findByPk(id, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
        },
        {
          model: WorkoutSessionSet,
          as: 'sets',
          order: [['setNumber', 'ASC']],
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
 * Add a set to an existing workout session
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

    const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reps, weight, is_completed, rest_time_seconds, notes } = req.body;

    const workoutSession = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    // Get next set number
    const nextSetNumber = await WorkoutSessionSet.getNextSetNumber(workoutSession.id);

    // Create new set
    const newSet = await WorkoutSessionSet.create({
      sessionId: workoutSession.id,
      setNumber: nextSetNumber,
      reps,
      weight: weight || 0,
      isCompleted: is_completed ?? true,
      completedAt: is_completed !== false ? new Date() : null,
      restTimeSeconds: rest_time_seconds,
      notes,
    });

    // Recalculate session totals
    await workoutSession.recalculateTotals();

    // Fetch updated session
    const updatedSession = await WorkoutSession.findByPk(sessionId, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
        },
        {
          model: WorkoutSessionSet,
          as: 'sets',
          order: [['setNumber', 'ASC']],
        },
      ],
    });

    // Update user metrics
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(201).json({
      success: true,
      message: `Set ${nextSetNumber} added successfully`,
      data: updatedSession,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a specific set in a workout session
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

    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const setId = Array.isArray(req.params.setId) ? req.params.setId[0] : req.params.setId;
    const { reps, weight, is_completed, rest_time_seconds, notes } = req.body;

    // Verify session belongs to user
    const workoutSession = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    // Find the set
    const set = await WorkoutSessionSet.findOne({
      where: { id: setId, sessionId },
    });

    if (!set) {
      throw new NotFoundError('Set not found');
    }

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
    await workoutSession.recalculateTotals();

    // Fetch updated session
    const updatedSession = await WorkoutSession.findByPk(sessionId, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
        },
        {
          model: WorkoutSessionSet,
          as: 'sets',
          order: [['setNumber', 'ASC']],
        },
      ],
    });

    // Update user metrics
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: 'Set updated successfully',
      data: updatedSession,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific set from a workout session
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

    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const setId = Array.isArray(req.params.setId) ? req.params.setId[0] : req.params.setId;

    // Verify session belongs to user
    const workoutSession = await WorkoutSession.findOne({
      where: { id: sessionId, userId: user.id },
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    // Find and delete the set
    const set = await WorkoutSessionSet.findOne({
      where: { id: setId, sessionId },
    });

    if (!set) {
      throw new NotFoundError('Set not found');
    }

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
    await workoutSession.recalculateTotals();

    // Fetch updated session
    const updatedSession = await WorkoutSession.findByPk(sessionId, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link'],
        },
        {
          model: WorkoutSessionSet,
          as: 'sets',
          order: [['setNumber', 'ASC']],
        },
      ],
    });

    // Update user metrics
    MetricsCalculationService.updateUserMetrics(user.id).catch(error => {
      console.error('Failed to update user metrics:', error);
    });

    res.status(200).json({
      success: true,
      message: 'Set deleted successfully',
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

    // Sets will be automatically deleted due to CASCADE
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
      attributes: ['completedAt', 'duration', 'totalVolume', 'totalSets', 'totalReps', 'maxWeight'],
      order: [['completedAt', 'ASC']],
      include: [
        {
          model: WorkoutSessionSet,
          as: 'sets',
          attributes: ['reps', 'weight'],
        },
      ],
    });

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalVolume = sessions.reduce((sum, s) => sum + Number(s.totalVolume), 0);
    const totalSets = sessions.reduce((sum, s) => sum + (s.totalSets || 0), 0);
    const totalReps = sessions.reduce((sum, s) => sum + (s.totalReps || 0), 0);
    
    // Find max weight across all sessions
    const maxWeight = sessions.length > 0 
      ? Math.max(...sessions.map(s => Number(s.maxWeight) || 0))
      : 0;

    // Group by date for chart data
    const chartData = sessions.reduce((acc: Record<string, any>, session) => {
      if (!session.completedAt) return acc;

      const date = new Date(session.completedAt).toISOString().substring(0, 10);
      
      if (!acc[date]) {
        acc[date] = {
          date,
          sessions: 0,
          duration: 0,
          volume: 0,
          sets: 0,
          reps: 0,
        };
      }
      acc[date].sessions += 1;
      acc[date].duration += session.duration;
      acc[date].volume += Number(session.totalVolume) || 0;
      acc[date].sets += session.totalSets || 0;
      acc[date].reps += session.totalReps || 0;
      return acc;
    }, {});

    // Workout type distribution - FIXED: Include Workout association
    const workoutTypes = await WorkoutSession.findAll({
      where: {
        userId: user.id,
        completedAt: { [Op.gte]: startDate },
      },
      attributes: ['id'],
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part'],
          required: true, // Only include sessions with valid workout
        },
      ],
    });

    const typeDistribution = workoutTypes.reduce((acc: Record<string, any>, session) => {
      // Access the included workout through the association
      const workout = (session as any).workout;
      if (workout) {
        const key = workout.body_part || 'Other';
        if (!acc[key]) {
          acc[key] = { type: key, count: 0 };
        }
        acc[key].count += 1;
      }
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSessions,
          totalDuration,
          totalVolume,
          totalSets,
          totalReps,
          maxWeight,
          averageDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
          averageVolume: totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0,
          averageSets: totalSessions > 0 ? Math.round(totalSets / totalSessions) : 0,
          averageReps: totalSessions > 0 ? Math.round(totalReps / totalSessions) : 0,
        },
        chartData: Object.values(chartData),
        typeDistribution: Object.values(typeDistribution),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH - Update only notes and duration for a workout session
 * This is a lightweight update that doesn't affect sets or totals
 */
export const patchWorkoutSessionDetails = async (
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
    const { notes, duration } = req.body;

    // Validate that at least one field is provided
    if (notes === undefined && duration === undefined) {
      throw new AppError('At least one field (notes or duration) is required', 400);
    }

    // Validate duration if provided
    if (duration !== undefined) {
      const durationNum = parseInt(duration, 10);
      if (isNaN(durationNum) || durationNum < 0) {
        throw new AppError('Duration must be a positive number (in seconds)', 400);
      }
    }

    const workoutSession = await WorkoutSession.findOne({
      where: { id, userId: user.id },
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    // Build update object with only provided fields
    const updateData: Partial<{
      notes: string | null;
      duration: number;
    }> = {};

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (duration !== undefined) {
      updateData.duration = parseInt(duration, 10);
    }

    // Perform the lightweight update
    await workoutSession.update(updateData);

    // Fetch the updated session with relations for the response
    const updatedSession = await WorkoutSession.findByPk(id, {
      include: [
        {
          model: Workout,
          as: 'workout',
          attributes: ['id', 'name', 'body_part', 'target_area', 'gif_link', 'equipment', 'level'],
        },
        {
          model: WorkoutSessionSet,
          as: 'sets',
          attributes: ['id', 'setNumber', 'reps', 'weight', 'isCompleted', 'completedAt', 'restTimeSeconds'],
          order: [['setNumber', 'ASC']],
        },
      ],
    });

    // Note: We don't need to update user metrics since duration doesn't affect strength/volume metrics
    // Only notes and duration changed, not actual workout performance data

    res.status(200).json({
      success: true,
      message: 'Workout session details updated successfully',
      data: updatedSession,
    });
  } catch (error) {
    next(error);
  }
};