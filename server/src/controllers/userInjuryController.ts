import type { Request, Response, NextFunction } from 'express';
import { UserInjury, Injury, Workout, User } from '../models/sql/index.js';
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';
import { Op } from 'sequelize';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ---------------------------------------------------------------------------
// Association interfaces — plain object shapes returned by Sequelize includes.
// These do NOT extend the UserInjury Model class because the model declares
// no association properties (no NonAttribute<Injury> on the class).
// ---------------------------------------------------------------------------

interface InjuryData {
  id: number;
  name: string;
  bodyPart: string;
  severity: string;
  description?: string | null;
}

interface WorkoutData {
  id: number;
  name: string;
  body_part: string;
  target_area: string;
  equipment: string | null;
  level: string;
  description: string | null;
  gif_link: string;
  toJSON(): any;
}

interface InjuryWithWorkouts extends InjuryData {
  workouts?: WorkoutData[];
}

// Shape used in getUserInjuryStatistics (only bodyPart + severity fetched)
interface UserInjuryForStats {
  id: number;
  userId: number;
  injuryId: number;
  createdAt: Date;
  injury?: Pick<InjuryData, 'bodyPart' | 'severity'>;
}

// Shape used in getAggravatingWorkouts (full injury + workouts fetched)
interface UserInjuryWithWorkouts {
  id: number;
  userId: number;
  injuryId: number;
  createdAt: Date;
  injury?: InjuryWithWorkouts;
}

/**
 * Add an injury to the authenticated user
 */
export const addUserInjury = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { injuryId } = req.body;

    // Check if injury exists
    const injury = await Injury.findByPk(injuryId);
    if (!injury) {
      throw new NotFoundError('Injury not found');
    }

    // Check if user already has this injury
    const existing = await UserInjury.findOne({
      where: {
        userId: user.id,
        injuryId: injuryId,
      },
    });

    if (existing) {
      throw new ConflictError('User already has this injury');
    }

    // Create user injury record
    const userInjury = await UserInjury.create({
      userId: user.id,
      injuryId: injuryId,
    });

    // Fetch with injury details using the association
    const result = await UserInjury.findByPk(userInjury.id, {
      include: [
        {
          model: Injury,
          as: 'injury',
          attributes: ['id', 'name', 'bodyPart', 'severity', 'description'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Injury added to user successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all injuries for the authenticated user
 */
export const getUserInjuries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { page = 1, limit = 20, bodyPart, severity, includeWorkouts } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause for injury filtering
    const injuryWhere: any = {};
    if (bodyPart) injuryWhere.bodyPart = bodyPart;
    if (severity) injuryWhere.severity = severity;

    // Build include options
    const includeOptions: any[] = [
      {
        model: Injury,
        as: 'injury',
        where: Object.keys(injuryWhere).length > 0 ? injuryWhere : undefined,
        attributes: ['id', 'name', 'bodyPart', 'severity', 'description'],
      },
    ];

    // Optionally include workouts that cause these injuries
    if (includeWorkouts === 'true') {
      includeOptions[0].include = [
        {
          model: Workout,
          as: 'workouts',
          through: { attributes: [] },
          attributes: ['id', 'name', 'body_part', 'target_area', 'equipment', 'level', 'gif_link'],
        },
      ];
    }

    const { count, rows } = await UserInjury.findAndCountAll({
      where: { userId: user.id },
      include: includeOptions,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']], // ✅ model has createdAt; no updatedAt (updatedAt: false)
    });

    res.status(200).json({
      success: true,
      message: 'User injuries retrieved successfully',
      data: {
        injuries: rows,
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
};

/**
 * Get a single user injury by ID
 */
export const getUserInjuryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // ✅ Parse to number — req.params values are always strings, model field is INTEGER
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid injury record ID', 400);
    }

    const userInjury = await UserInjury.findOne({
      where: {
        id,
        userId: user.id,
      },
      include: [
        {
          model: Injury,
          as: 'injury',
          attributes: ['id', 'name', 'bodyPart', 'severity', 'description'],
        },
      ],
    });

    if (!userInjury) {
      throw new NotFoundError('User injury record not found');
    }

    res.status(200).json({
      success: true,
      message: 'User injury retrieved successfully',
      data: userInjury,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove an injury from the authenticated user
 */
export const removeUserInjury = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // ✅ Parse to number — req.params values are always strings, model field is INTEGER
    const injuryId = parseInt(req.params.injuryId as string, 10);
    if (isNaN(injuryId)) {
      throw new AppError('Invalid injury ID', 400);
    }

    const userInjury = await UserInjury.findOne({
      where: {
        userId: user.id,
        injuryId,
      },
    });

    if (!userInjury) {
      throw new NotFoundError('User injury record not found');
    }

    await userInjury.destroy();

    res.status(200).json({
      success: true,
      message: 'Injury removed from user successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has a specific injury
 */
export const checkUserInjury = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // ✅ Parse to number — req.params values are always strings, model field is INTEGER
    const injuryId = parseInt(req.params.injuryId as string, 10);
    if (isNaN(injuryId)) {
      throw new AppError('Invalid injury ID', 400);
    }

    const userInjury = await UserInjury.findOne({
      where: {
        userId: user.id,
        injuryId,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        hasInjury: !!userInjury,
        userInjuryId: userInjury?.id || null,
        injuryId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add injuries to the authenticated user
 */
export const bulkAddUserInjuries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { injuryIds } = req.body;

    if (!injuryIds || !Array.isArray(injuryIds) || injuryIds.length === 0) {
      throw new AppError('injuryIds array is required', 400);
    }

    // Get existing injuries to avoid duplicates
    const existingUserInjuries = await UserInjury.findAll({
      where: {
        userId: user.id,
        injuryId: { [Op.in]: injuryIds },
      },
      attributes: ['injuryId'],
    });

    const existingIds = new Set(existingUserInjuries.map(ui => ui.injuryId));
    const newInjuryIds = injuryIds.filter((id: number) => !existingIds.has(id));

    if (newInjuryIds.length === 0) {
      throw new ConflictError('All specified injuries already exist for this user');
    }

    // Verify all injury IDs exist
    const injuries = await Injury.findAll({
      where: { id: { [Op.in]: newInjuryIds } },
      attributes: ['id', 'name', 'bodyPart', 'severity'],
    });

    if (injuries.length !== newInjuryIds.length) {
      throw new NotFoundError('One or more injury IDs not found');
    }

    // Create bulk user injuries
    const userInjuries = await UserInjury.bulkCreate(
      newInjuryIds.map((injuryId: number) => ({
        userId: user.id,
        injuryId,
      }))
    );

    // Fetch created records with injury details
    const createdRecords = await UserInjury.findAll({
      where: { id: { [Op.in]: userInjuries.map(ui => ui.id) } },
      include: [
        {
          model: Injury,
          as: 'injury',
          attributes: ['id', 'name', 'bodyPart', 'severity', 'description'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: `${userInjuries.length} injuries added to user successfully`,
      data: {
        added: userInjuries.length,
        skipped: injuryIds.length - newInjuryIds.length,
        injuries: createdRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get injury statistics for the authenticated user
 */
export const getUserInjuryStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // ✅ Cast to UserInjuryForStats[] — plain object interface, not extending Model class.
    // The include only fetches bodyPart and severity so we use the narrower typed interface.
    const userInjuries = (
      await UserInjury.findAll({
        where: { userId: user.id },
        include: [
          {
            model: Injury,
            as: 'injury',
            attributes: ['bodyPart', 'severity'],
          },
        ],
      })
    ) as unknown as UserInjuryForStats[];

    // Count by body part and severity
    const byBodyPart = new Map<string, number>();
    const bySeverity  = new Map<string, number>();

    for (const userInjury of userInjuries) {
      const injury = userInjury.injury;
      if (injury) {
        byBodyPart.set(injury.bodyPart, (byBodyPart.get(injury.bodyPart) || 0) + 1);
        bySeverity.set(injury.severity,  (bySeverity.get(injury.severity)  || 0) + 1);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        total: userInjuries.length,
        byBodyPart: Array.from(byBodyPart.entries()).map(([bodyPart, count]) => ({ bodyPart, count })),
        bySeverity:  Array.from(bySeverity.entries()).map(([severity,  count]) => ({ severity,  count })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get workouts that can aggravate user's injuries
 */
export const getAggravatingWorkouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // ✅ Cast to UserInjuryWithWorkouts[] — plain object interface, not extending Model class.
    // Full injury fields + workouts association are fetched here so we use the wider typed interface.
    const userInjuries = (
      await UserInjury.findAll({
        where: { userId: user.id },
        include: [
          {
            model: Injury,
            as: 'injury',
            include: [
              {
                model: Workout,
                as: 'workouts',
                through: { attributes: [] },
                attributes: ['id', 'name', 'body_part', 'target_area', 'equipment', 'level', 'description', 'gif_link'],
              },
            ],
          },
        ],
      })
    ) as unknown as UserInjuryWithWorkouts[];

    // Collect all unique workouts that can aggravate the user's injuries
    const workoutsMap = new Map<number, WorkoutData & { relatedInjuries: { id: number; name: string; severity: string }[] }>();

    for (const userInjury of userInjuries) {
      const injury = userInjury.injury;
      if (injury?.workouts) {
        for (const workout of injury.workouts) {
          if (!workoutsMap.has(workout.id)) {
            workoutsMap.set(workout.id, {
              ...workout.toJSON(),
              relatedInjuries: [],
            });
          }
          workoutsMap.get(workout.id)!.relatedInjuries.push({
            id: injury.id,
            name: injury.name,
            severity: injury.severity,
          });
        }
      }
    }

    const aggravatingWorkouts = Array.from(workoutsMap.values());

    res.status(200).json({
      success: true,
      data: {
        totalWorkouts: aggravatingWorkouts.length,
        workouts: aggravatingWorkouts,
      },
    });
  } catch (error) {
    next(error);
  }
};