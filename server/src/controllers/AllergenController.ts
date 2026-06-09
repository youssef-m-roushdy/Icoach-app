import type { Request, Response, NextFunction } from 'express';
import { Allergen, FoodAllergen, Food, UserAllergy } from '../models/sql/index.js';
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

interface FoodWithAllergens extends FoodData {
  allergens?: AllergenData[];
}

interface AllergenData {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

interface FoodAllergenWithDetails {
  id: number;
  foodId: number;
  allergenId: number;
  contains: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  food?: FoodData;
  allergen?: AllergenData;
}

export class AllergenController {
  /**
   * Get all allergens with optional filters and pagination
   */
  static async getAllAllergens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Optional filters
      const search = (req.query.search as string)?.toLowerCase().trim();
      const category = req.query.category as string;

      // Build where clause
      const where: any = {};

      if (search) {
        where.name = {
          [Op.like]: `%${search}%`
        };
      }

      if (category) {
        where.category = category;
      }

      // Query database
      const { count, rows: allergens } = await Allergen.findAndCountAll({
        where,
        limit,
        offset,
        order: [['name', 'ASC']],
      });

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        message: 'Allergens retrieved successfully',
        data: allergens,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get allergen by ID
   */
  static async getAllergenById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      if (isNaN(id)) {
        throw new AppError('Valid allergen ID is required', 400);
      }

      const allergen = await Allergen.findByPk(id);

      if (!allergen) {
        throw new NotFoundError('Allergen not found');
      }

      res.status(200).json({
        success: true,
        message: 'Allergen retrieved successfully',
        data: allergen,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new allergen (Admin only)
   */
  static async createAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, category, description } = req.body;

      // Check if allergen with same name already exists
      const existingAllergen = await Allergen.findOne({ 
        where: { name: name.trim() } 
      });
      
      if (existingAllergen) {
        throw new ConflictError('Allergen with this name already exists');
      }

      const allergen = await Allergen.create({
        name: name.trim(),
        category,
        description: description || null,
      });

      res.status(201).json({
        success: true,
        message: 'Allergen created successfully',
        data: allergen,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update allergen by ID (Admin only)
   */
  static async updateAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      if (isNaN(id)) {
        throw new AppError('Valid allergen ID is required', 400);
      }

      const allergen = await Allergen.findByPk(id);

      if (!allergen) {
        throw new NotFoundError('Allergen not found');
      }

      const { name, category, description } = req.body;

      // If name is being changed, check if new name is already taken
      if (name && name.trim() !== allergen.name) {
        const existingAllergen = await Allergen.findOne({ 
          where: { name: name.trim() } 
        });
        if (existingAllergen) {
          throw new ConflictError('Allergen with this name already exists');
        }
      }

      // Update allergen
      await allergen.update({
        name: name !== undefined ? name.trim() : allergen.name,
        category: category !== undefined ? category : allergen.category,
        description: description !== undefined ? description : allergen.description,
      });

      res.status(200).json({
        success: true,
        message: 'Allergen updated successfully',
        data: allergen,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete allergen by ID (Admin only)
   */
  static async deleteAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      if (isNaN(id)) {
        throw new AppError('Valid allergen ID is required', 400);
      }

      const allergen = await Allergen.findByPk(id);

      if (!allergen) {
        throw new NotFoundError('Allergen not found');
      }

      await allergen.destroy();

      res.status(200).json({
        success: true,
        message: 'Allergen deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search allergens by name
   */
  static async searchAllergens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const allergens = await Allergen.searchByName(query);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: allergens,
        count: allergens.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get allergens by category
   */
  static async getAllergensByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.params;

      if (!category) {
        throw new AppError('Category is required', 400);
      }

      const allergens = await Allergen.findByCategory(category);

      res.status(200).json({
        success: true,
        message: `Allergens in category '${category}' retrieved successfully`,
        data: allergens,
        count: allergens.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get food allergens only
   */
  static async getFoodAllergens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allergens = await Allergen.getFoodAllergens();

      res.status(200).json({
        success: true,
        message: 'Food allergens retrieved successfully',
        data: allergens,
        count: allergens.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all foods containing a specific allergen
   */
  static async getFoodsByAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      if (isNaN(id)) {
        throw new AppError('Valid allergen ID is required', 400);
      }

      // Check if allergen exists
      const allergen = await Allergen.findByPk(id);
      if (!allergen) {
        throw new NotFoundError('Allergen not found');
      }

      // Find all food-allergen mappings with include
      const foodAllergens = await FoodAllergen.findAll({
        where: {
          allergenId: id,
          contains: true,
        },
        include: [
          {
            model: Food,
            as: 'food',
          },
        ],
      }) as unknown as FoodAllergenWithDetails[];

      const foods = foodAllergens.map(fa => fa.food).filter(f => f !== undefined);

      res.status(200).json({
        success: true,
        message: `Foods containing ${allergen.name} retrieved successfully`,
        data: {
          allergen,
          foods,
          count: foods.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all allergens for a specific food
   */
  static async getAllergensByFood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const foodId = parseInt(req.params.foodId as string, 10);

      if (isNaN(foodId)) {
        throw new AppError('Valid food ID is required', 400);
      }

      // Check if food exists
      const food = await Food.findByPk(foodId);
      if (!food) {
        throw new NotFoundError('Food not found');
      }

      // Find all food-allergen mappings with include
      const foodAllergens = await FoodAllergen.findAll({
        where: {
          foodId: foodId,
          contains: true,
        },
        include: [
          {
            model: Allergen,
            as: 'allergen',
          },
        ],
      }) as unknown as FoodAllergenWithDetails[];

      const allergens = foodAllergens.map(fa => fa.allergen).filter(a => a !== undefined);

      res.status(200).json({
        success: true,
        message: `Allergens for ${food.name} retrieved successfully`,
        data: {
          food,
          allergens,
          count: allergens.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if a food contains specific allergens for a user
   * (Useful for allergy warnings)
   */
  static async checkFoodAllergensForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { foodId } = req.params;

      if (!foodId || isNaN(parseInt(foodId))) {
        throw new AppError('Valid food ID is required', 400);
      }

      // Get user's allergies
      const userAllergies = await UserAllergy.findAll({
        where: { userId: user.id },
        include: [
          {
            model: Allergen,
            as: 'allergen',
          },
        ],
      }) as unknown as Array<{ allergen?: AllergenData }>;

      const userAllergenIds = userAllergies.map(ua => (ua as any).allergenId);

      if (userAllergenIds.length === 0) {
        res.status(200).json({
          success: true,
          message: 'User has no known allergies',
          data: {
            hasAllergens: false,
            allergensFound: [],
          },
        });
        return;
      }

      // Check if food contains any of user's allergens
      const foodAllergens = await FoodAllergen.findAll({
        where: {
          foodId: parseInt(foodId),
          allergenId: { [Op.in]: userAllergenIds },
          contains: true,
        },
        include: [
          {
            model: Allergen,
            as: 'allergen',
          },
        ],
      }) as unknown as FoodAllergenWithDetails[];

      const matchedAllergens = foodAllergens.map(fa => fa.allergen).filter(a => a !== undefined);

      res.status(200).json({
        success: true,
        data: {
          hasAllergens: matchedAllergens.length > 0,
          allergensFound: matchedAllergens,
          warning: matchedAllergens.length > 0 
            ? `This food contains ${matchedAllergens.map(a => a?.name).join(', ')} which you are allergic to`
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
	 * Bulk create allergens (Admin only)
		*/
	static async bulkCreateAllergens(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { allergens } = req.body;

			if (!allergens || !Array.isArray(allergens) || allergens.length === 0) {
				throw new AppError('allergens array is required with at least 1 item', 400);
			}

			const createdAllergens = [];
			const errors = [];

			for (const allergen of allergens) {
				try {
					// Check if allergen already exists
					const existing = await Allergen.findOne({
						where: { name: allergen.name.trim() }
					});

					if (existing) {
						errors.push({ name: allergen.name, error: 'Allergen with this name already exists' });
						continue;
					}

					const newAllergen = await Allergen.create({
						name: allergen.name.trim(),
						category: allergen.category,
						description: allergen.description || null,
					});

					createdAllergens.push(newAllergen);
				} catch (error) {
					errors.push({ name: allergen.name, error: (error as Error).message });
				}
			}

			res.status(201).json({
				success: true,
				message: `${createdAllergens.length} allergens created successfully`,
				data: {
					created: createdAllergens,
					errors: errors.length > 0 ? errors : undefined,
					totalRequested: allergens.length,
				},
			});
		} catch (error) {
			next(error);
		}
	}
}