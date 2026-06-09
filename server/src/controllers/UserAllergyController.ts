import type { Request, Response, NextFunction } from 'express';
import { UserAllergy, Allergen, Food, FoodAllergen } from '../models/sql/index.js';
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';
import { Op } from 'sequelize';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Association interfaces for plain object shapes
interface AllergenData {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

interface FoodData {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  sugar: number;
  pic: string | null;
}

interface FoodAllergenWithDetails {
  id: number;
  foodId: number;
  allergenId: number;
  contains: boolean;
  notes: string | null;
  food?: FoodData;
  allergen?: AllergenData;
}

interface UserAllergyForStats {
  id: number;
  userId: number;
  allergenId: number;
  severity: string;
  reaction: string | null;
  diagnosisDate: Date | null;
  diagnosedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  allergen?: Pick<AllergenData, 'category' | 'name'>;
}

interface UserAllergyWithAllergen {
  id: number;
  userId: number;
  allergenId: number;
  severity: string;
  reaction: string | null;
  diagnosisDate: Date | null;
  diagnosedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  allergen?: AllergenData;
}

/**
 * Add an allergy to the authenticated user
 */
export const addUserAllergy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { allergenId, severity, reaction, diagnosisDate, diagnosedBy, notes } = req.body;

    // Check if allergen exists
    const allergen = await Allergen.findByPk(allergenId);
    if (!allergen) {
      throw new NotFoundError('Allergen not found');
    }

    // Check if user already has this allergy
    const existing = await UserAllergy.findOne({
      where: {
        userId: user.id,
        allergenId: allergenId,
      },
    });

    if (existing) {
      throw new ConflictError('User already has this allergy');
    }

    // Create user allergy
    const userAllergy = await UserAllergy.create({
      userId: user.id,
      allergenId: allergenId,
      severity: severity || 'moderate',
      reaction: reaction || null,
      diagnosisDate: diagnosisDate || null,
      diagnosedBy: diagnosedBy || null,
      notes: notes || null,
    });

    // Fetch with allergen details
    const result = await UserAllergy.findByPk(userAllergy.id, {
      include: [
        {
          model: Allergen,
          as: 'allergen',
          attributes: ['id', 'name', 'category', 'description'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Allergy added to user successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all allergies for the authenticated user
 */
export const getUserAllergies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { page = 1, limit = 20, category, severity } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause for allergen filtering
    const allergenWhere: any = {};
    if (category) allergenWhere.category = category;

    const { count, rows } = await UserAllergy.findAndCountAll({
      where: { userId: user.id },
      include: [
        {
          model: Allergen,
          as: 'allergen',
          where: Object.keys(allergenWhere).length > 0 ? allergenWhere : undefined,
          attributes: ['id', 'name', 'category', 'description'],
        },
      ],
      limit: Number(limit),
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    // Filter by severity after query if needed (since severity is on UserAllergy, not Allergen)
    let filteredRows = rows;
    if (severity) {
      filteredRows = rows.filter(row => row.severity === severity);
    }

    res.status(200).json({
      success: true,
      message: 'User allergies retrieved successfully',
      data: {
        allergies: filteredRows,
        pagination: {
          total: severity ? filteredRows.length : count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil((severity ? filteredRows.length : count) / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single user allergy by ID
 */
export const getUserAllergyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid allergy record ID', 400);
    }

    const userAllergy = await UserAllergy.findOne({
      where: {
        id,
        userId: user.id,
      },
      include: [
        {
          model: Allergen,
          as: 'allergen',
          attributes: ['id', 'name', 'category', 'description'],
        },
      ],
    });

    if (!userAllergy) {
      throw new NotFoundError('User allergy not found');
    }

    res.status(200).json({
      success: true,
      message: 'User allergy retrieved successfully',
      data: userAllergy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user allergy (remove allergy from user)
 */
export const deleteUserAllergy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const allergenId = parseInt(req.params.allergenId as string, 10);
    if (isNaN(allergenId)) {
      throw new AppError('Invalid allergen ID', 400);
    }

    const userAllergy = await UserAllergy.findOne({
      where: {
        userId: user.id,
        allergenId: allergenId,
      },
    });

    if (!userAllergy) {
      throw new NotFoundError('User allergy not found');
    }

    await userAllergy.destroy();

    res.status(200).json({
      success: true,
      message: 'Allergy removed from user successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has a specific allergy
 */
export const checkUserAllergy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const allergenId = parseInt(req.params.allergenId as string, 10);
    if (isNaN(allergenId)) {
      throw new AppError('Invalid allergen ID', 400);
    }

    const userAllergy = await UserAllergy.findOne({
      where: {
        userId: user.id,
        allergenId: allergenId,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        hasAllergy: !!userAllergy,
        userAllergyId: userAllergy?.id || null,
        allergenId: allergenId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add allergies to the authenticated user
 */
export const bulkAddUserAllergies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { allergies } = req.body;

    if (!allergies || !Array.isArray(allergies) || allergies.length === 0) {
      throw new AppError('allergies array is required', 400);
    }

    const created = [];
    const errors = [];

    for (const allergy of allergies) {
      try {
        const { allergenId, severity, reaction, diagnosisDate, diagnosedBy, notes } = allergy;

        // Check if allergen exists
        const allergen = await Allergen.findByPk(allergenId);
        if (!allergen) {
          errors.push({ allergenId, error: 'Allergen not found' });
          continue;
        }

        // Check if user already has this allergy
        const existing = await UserAllergy.findOne({
          where: {
            userId: user.id,
            allergenId: allergenId,
          },
        });

        if (existing) {
          errors.push({ allergenId, error: 'User already has this allergy' });
          continue;
        }

        const userAllergy = await UserAllergy.create({
          userId: user.id,
          allergenId: allergenId,
          severity: severity || 'moderate',
          reaction: reaction || null,
          diagnosisDate: diagnosisDate || null,
          diagnosedBy: diagnosedBy || null,
          notes: notes || null,
        });

        created.push(userAllergy);
      } catch (error) {
        errors.push({ ...allergy, error: (error as Error).message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${created.length} allergies added to user successfully`,
      data: {
        added: created.length,
        skipped: allergies.length - created.length,
        allergies: created,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user allergy statistics
 */
export const getUserAllergyStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const userAllergies = (
      await UserAllergy.findAll({
        where: { userId: user.id },
        include: [
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['category', 'name'],
          },
        ],
      })
    ) as unknown as UserAllergyForStats[];

    // Count by category
    const byCategory = new Map<string, number>();
    // Count by severity
    const bySeverity = new Map<string, number>();
    // List of allergens
    const allergenList: string[] = [];

    for (const userAllergy of userAllergies) {
      const allergen = userAllergy.allergen;
      if (allergen) {
        // Count by category
        byCategory.set(allergen.category, (byCategory.get(allergen.category) || 0) + 1);
        
        // Count by severity
        bySeverity.set(userAllergy.severity, (bySeverity.get(userAllergy.severity) || 0) + 1);
        
        // Add to list
        allergenList.push(allergen.name);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        total: userAllergies.length,
        byCategory: Array.from(byCategory.entries()).map(([category, count]) => ({ category, count })),
        bySeverity: Array.from(bySeverity.entries()).map(([severity, count]) => ({ severity, count })),
        allergens: allergenList,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get foods that contain user's allergens (for warning purposes)
 */
export const getFoodsWithUserAllergens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // Get user's allergen IDs
    const userAllergies = await UserAllergy.findAll({
      where: { userId: user.id },
      attributes: ['allergenId'],
    });

    const userAllergenIds = userAllergies.map(ua => ua.allergenId);

    if (userAllergenIds.length === 0) {
      res.status(200).json({
        success: true,
        message: 'User has no known allergies',
        data: {
          hasAllergies: false,
          foodsWithAllergens: [],
        },
      });
      return;
    }

    // Find food allergen relationships
    const foodAllergens = (
      await FoodAllergen.findAll({
        where: {
          allergenId: { [Op.in]: userAllergenIds },
          contains: true,
        },
        include: [
          {
            model: Food,
            as: 'food',
            attributes: ['id', 'name', 'calories', 'protein', 'carbohydrate', 'fat', 'sugar', 'pic'],
          },
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['id', 'name', 'category'],
          },
        ],
      })
    ) as unknown as FoodAllergenWithDetails[];

    // Group by food
    const foodMap = new Map();
    for (const fa of foodAllergens) {
      const food = fa.food;
      const allergen = fa.allergen;
      if (food && allergen) {
        if (!foodMap.has(food.id)) {
          foodMap.set(food.id, {
            food,
            allergens: [],
          });
        }
        foodMap.get(food.id).allergens.push(allergen);
      }
    }

    const foodsWithAllergens = Array.from(foodMap.values());

    res.status(200).json({
      success: true,
      data: {
        hasAllergies: true,
        totalFoods: foodsWithAllergens.length,
        foods: foodsWithAllergens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user allergy
 */
export const updateUserAllergy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid allergy record ID', 400);
    }

    const { severity, reaction, diagnosisDate, diagnosedBy, notes } = req.body;

    const userAllergy = await UserAllergy.findOne({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (!userAllergy) {
      throw new NotFoundError('User allergy not found');
    }

    await userAllergy.update({
      severity: severity !== undefined ? severity : userAllergy.severity,
      reaction: reaction !== undefined ? reaction : userAllergy.reaction,
      diagnosisDate: diagnosisDate !== undefined ? diagnosisDate : userAllergy.diagnosisDate,
      diagnosedBy: diagnosedBy !== undefined ? diagnosedBy : userAllergy.diagnosedBy,
      notes: notes !== undefined ? notes : userAllergy.notes,
    });

    // Fetch updated record
    const result = await UserAllergy.findByPk(id, {
      include: [
        {
          model: Allergen,
          as: 'allergen',
          attributes: ['id', 'name', 'category', 'description'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'User allergy updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};