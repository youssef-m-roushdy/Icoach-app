import type { Request, Response, NextFunction } from 'express';
import { FoodAllergen, Food, Allergen } from '../models/sql/index.js';
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

export class FoodAllergenController {
  /**
   * Get all food-allergen relationships with pagination and filtering
   */
  static async getAllFoodAllergens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { foodId, allergenId, contains } = req.query;

      // Build where clause
      const where: any = {};
      if (foodId) where.foodId = parseInt(foodId as string);
      if (allergenId) where.allergenId = parseInt(allergenId as string);
      if (contains !== undefined) where.contains = contains === 'true';

      const { count, rows } = await FoodAllergen.findAndCountAll({
        where,
        include: [
          {
            model: Food,
            as: 'food',
            attributes: ['id', 'name', 'calories', 'protein', 'carbohydrate', 'fat', 'sugar', 'pic'],
          },
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['id', 'name', 'category', 'description'],
          },
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        message: 'Food-allergen relationships retrieved successfully',
        data: rows,
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
   * Get food-allergen relationship by ID
   */
  static async getFoodAllergenById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid relationship ID is required', 400);
      }

      const foodAllergen = await FoodAllergen.findByPk(parseInt(id), {
        include: [
          {
            model: Food,
            as: 'food',
            attributes: ['id', 'name', 'calories', 'protein', 'carbohydrate', 'fat', 'sugar', 'pic'],
          },
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['id', 'name', 'category', 'description'],
          },
        ],
      });

      if (!foodAllergen) {
        throw new NotFoundError('Food-allergen relationship not found');
      }

      res.status(200).json({
        success: true,
        message: 'Food-allergen relationship retrieved successfully',
        data: foodAllergen,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new food-allergen relationship (Admin only)
   */
  static async createFoodAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { foodId, allergenId, contains, notes } = req.body;

      // Check if food exists
      const food = await Food.findByPk(foodId);
      if (!food) {
        throw new NotFoundError('Food not found');
      }

      // Check if allergen exists
      const allergen = await Allergen.findByPk(allergenId);
      if (!allergen) {
        throw new NotFoundError('Allergen not found');
      }

      // Check if relationship already exists
      const existing = await FoodAllergen.findOne({
        where: {
          foodId,
          allergenId,
        },
      });

      if (existing) {
        throw new ConflictError('This food-allergen relationship already exists');
      }

      const foodAllergen = await FoodAllergen.create({
        foodId,
        allergenId,
        contains: contains !== undefined ? contains : true,
        notes: notes || null,
      });

      // Fetch with details
      const result = await FoodAllergen.findByPk(foodAllergen.id, {
        include: [
          {
            model: Food,
            as: 'food',
            attributes: ['id', 'name'],
          },
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['id', 'name'],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: 'Food-allergen relationship created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a food-allergen relationship (Admin only)
   */
  static async updateFoodAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid relationship ID is required', 400);
      }

      const foodAllergen = await FoodAllergen.findByPk(parseInt(id));

      if (!foodAllergen) {
        throw new NotFoundError('Food-allergen relationship not found');
      }

      const { contains, notes } = req.body;

      await foodAllergen.update({
        contains: contains !== undefined ? contains : foodAllergen.contains,
        notes: notes !== undefined ? notes : foodAllergen.notes,
      });

      // Fetch updated record with details
      const result = await FoodAllergen.findByPk(parseInt(id), {
        include: [
          {
            model: Food,
            as: 'food',
            attributes: ['id', 'name'],
          },
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['id', 'name'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        message: 'Food-allergen relationship updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a food-allergen relationship (Admin only)
   */
  static async deleteFoodAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid relationship ID is required', 400);
      }

      const foodAllergen = await FoodAllergen.findByPk(parseInt(id));

      if (!foodAllergen) {
        throw new NotFoundError('Food-allergen relationship not found');
      }

      await foodAllergen.destroy();

      res.status(200).json({
        success: true,
        message: 'Food-allergen relationship deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk create food-allergen relationships (Admin only)
   */
  static async bulkCreateFoodAllergens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { relationships } = req.body;

      if (!relationships || !Array.isArray(relationships) || relationships.length === 0) {
        throw new AppError('relationships array is required with at least 1 item', 400);
      }

      const created = [];
      const errors = [];

      for (const rel of relationships) {
        try {
          const { foodId, allergenId, contains, notes } = rel;

          // Check if food exists
          const food = await Food.findByPk(foodId);
          if (!food) {
            errors.push({ foodId, allergenId, error: 'Food not found' });
            continue;
          }

          // Check if allergen exists
          const allergen = await Allergen.findByPk(allergenId);
          if (!allergen) {
            errors.push({ foodId, allergenId, error: 'Allergen not found' });
            continue;
          }

          // Check if relationship already exists
          const existing = await FoodAllergen.findOne({
            where: { foodId, allergenId },
          });

          if (existing) {
            errors.push({ foodId, allergenId, error: 'Relationship already exists' });
            continue;
          }

          const foodAllergen = await FoodAllergen.create({
            foodId,
            allergenId,
            contains: contains !== undefined ? contains : true,
            notes: notes || null,
          });

          created.push(foodAllergen);
        } catch (error) {
          errors.push({ ...rel, error: (error as Error).message });
        }
      }

      res.status(201).json({
        success: true,
        message: `${created.length} food-allergen relationships created successfully`,
        data: {
          created,
          errors: errors.length > 0 ? errors : undefined,
          totalRequested: relationships.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all relationships for a specific food
   */
  static async getRelationshipsByFood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const foodId = req.params.foodId as string;
      
      if (!foodId || isNaN(parseInt(foodId))) {
        throw new AppError('Valid food ID is required', 400);
      }

      const foodIdNum = parseInt(foodId, 10);
      
      const food = await Food.findByPk(foodIdNum);
      if (!food) {
        throw new NotFoundError('Food not found');
      }

      const relationships = await FoodAllergen.findAll({
        where: { foodId: foodIdNum },
        include: [
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['id', 'name', 'category', 'description'],
          },
        ],
        order: [['contains', 'DESC']],
      });

      res.status(200).json({
        success: true,
        message: `Allergen relationships for ${food.name} retrieved successfully`,
        data: {
          food,
          relationships,
          count: relationships.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all relationships for a specific allergen
   */
  static async getRelationshipsByAllergen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allergenId = req.params.allergenId as string;
      
      if (!allergenId || isNaN(parseInt(allergenId))) {
        throw new AppError('Valid allergen ID is required', 400);
      }

      const allergenIdNum = parseInt(allergenId, 10);
      
      const allergen = await Allergen.findByPk(allergenIdNum);
      if (!allergen) {
        throw new NotFoundError('Allergen not found');
      }

      const relationships = await FoodAllergen.findAll({
        where: { allergenId: allergenIdNum },
        include: [
          {
            model: Food,
            as: 'food',
            attributes: ['id', 'name', 'calories', 'protein', 'carbohydrate', 'fat', 'sugar', 'pic'],
          },
        ],
        order: [['contains', 'DESC']],
      });

      res.status(200).json({
        success: true,
        message: `Food relationships for ${allergen.name} retrieved successfully`,
        data: {
          allergen,
          relationships,
          count: relationships.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contains status for a specific food-allergen pair (toggle contains)
   */
  static async toggleContains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const foodId = req.params.foodId as string;
      const allergenId = req.params.allergenId as string;

      if (!foodId || isNaN(parseInt(foodId))) {
        throw new AppError('Valid food ID is required', 400);
      }
      
      if (!allergenId || isNaN(parseInt(allergenId))) {
        throw new AppError('Valid allergen ID is required', 400);
      }

      const foodIdNum = parseInt(foodId, 10);
      const allergenIdNum = parseInt(allergenId, 10);

      // Find the relationship
      let foodAllergen = await FoodAllergen.findOne({
        where: {
          foodId: foodIdNum,
          allergenId: allergenIdNum,
        },
      });

      if (!foodAllergen) {
        // Create if doesn't exist
        foodAllergen = await FoodAllergen.create({
          foodId: foodIdNum,
          allergenId: allergenIdNum,
          contains: true,
        });
      } else {
        // Toggle contains
        await foodAllergen.update({
          contains: !foodAllergen.contains,
        });
      }

      // Fetch updated record
      const result = await FoodAllergen.findByPk(foodAllergen.id, {
        include: [
          {
            model: Food,
            as: 'food',
            attributes: ['id', 'name'],
          },
          {
            model: Allergen,
            as: 'allergen',
            attributes: ['id', 'name'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        message: `Food-allergen relationship ${foodAllergen.contains ? 'marked as containing' : 'marked as not containing'} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}