import type { Request, Response, NextFunction } from 'express';
import { Food } from '../models/sql/index.js';
import { ImageService } from '../services/imageService.js';
import { AppError } from '../utils/errors.js';
import { Op } from 'sequelize';

export class FoodController {
  /**
   * Get all foods with optional filters and pagination
   */
  static async getAllFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Optional filters
      const search = (req.query.search as string)?.toLowerCase().trim();
      const minCalories = req.query.minCalories ? parseFloat(req.query.minCalories as string) : undefined;
      const maxCalories = req.query.maxCalories ? parseFloat(req.query.maxCalories as string) : undefined;
      const minProtein = req.query.minProtein ? parseFloat(req.query.minProtein as string) : undefined;

      // Build where clause
      const where: any = {};

      if (search) {
        where.name = {
          [Op.like]: `%${search}%`
        };
      }

      if (minCalories !== undefined || maxCalories !== undefined) {
        where.calories = {};
        if (minCalories !== undefined) where.calories[Op.gte] = minCalories;
        if (maxCalories !== undefined) where.calories[Op.lte] = maxCalories;
      }

      if (minProtein !== undefined) {
        where.protein = {
          [Op.gte]: minProtein
        };
      }

      // Query database
      const { count, rows: foods } = await Food.findAndCountAll({
        where,
        limit,
        offset,
        order: [['name', 'ASC']],
      });

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        message: 'Foods retrieved successfully',
        data: foods,
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
   * Get food by ID
   */
  static async getFoodById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid food ID is required', 400);
      }

      const food = await Food.findByPk(parseInt(id));

      if (!food) {
        throw new AppError('Food not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Food retrieved successfully',
        data: food,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new food with optional image (Admin only)
   */
  static async createFood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, calories, protein, carbohydrate, fat, sugar } = req.body;

      // Check if food with same name already exists
      const existingFood = await Food.findOne({ where: { name: name.toLowerCase().trim() } });
      if (existingFood) {
        throw new AppError('Food with this name already exists', 409);
      }

      let imageUrl = null;

      // Upload image to Cloudinary if provided
      if (req.file) {
        try {
          const uploadResult = await ImageService.uploadFoodImage(req.file.buffer, name.toLowerCase().trim());
          imageUrl = uploadResult.secureUrl;
        } catch (error) {
          console.error('Image upload failed:', error);
          // Continue creating food even if image upload fails
        }
      }

      const food = await Food.create({
        name,
        calories,
        protein,
        carbohydrate,
        fat,
        sugar: sugar || 0,
        pic: imageUrl,
      });

      res.status(201).json({
        success: true,
        message: 'Food created successfully',
        data: food,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update food by ID with optional image (Admin only)
   */
  static async updateFood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid food ID is required', 400);
      }

      const food = await Food.findByPk(parseInt(id));

      if (!food) {
        throw new AppError('Food not found', 404);
      }

      const { name, calories, protein, carbohydrate, fat, sugar } = req.body;

      // If name is being changed, check if new name is already taken
      if (name && name.toLowerCase().trim() !== food.name) {
        const existingFood = await Food.findOne({ where: { name: name.toLowerCase().trim() } });
        if (existingFood) {
          throw new AppError('Food with this name already exists', 409);
        }
      }

      let imageUrl = food.pic; // Keep existing image by default

      // Handle image upload if new image is provided
      if (req.file) {
        // Delete old image from Cloudinary if exists
        if (food.pic) {
          try {
            await ImageService.deleteImageByUrl(food.pic);
          } catch (error) {
            console.warn('Failed to delete old image from Cloudinary:', error);
          }
        }

        // Upload new image
        try {
          const uploadResult = await ImageService.uploadFoodImage(
            req.file.buffer, 
            id
          );
          imageUrl = uploadResult.secureUrl;
        } catch (error) {
          console.error('Image upload failed:', error);
          throw new AppError('Failed to upload image', 500);
        }
      }

      // Update food
      await food.update({
        name: name !== undefined ? name : food.name,
        calories: calories !== undefined ? calories : food.calories,
        protein: protein !== undefined ? protein : food.protein,
        carbohydrate: carbohydrate !== undefined ? carbohydrate : food.carbohydrate,
        fat: fat !== undefined ? fat : food.fat,
        sugar: sugar !== undefined ? sugar : food.sugar,
        pic: imageUrl,
      });

      res.status(200).json({
        success: true,
        message: 'Food updated successfully',
        data: food,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete food by ID with automatic image cleanup (Admin only)
   */
  static async deleteFood(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid food ID is required', 400);
      }

      const food = await Food.findByPk(parseInt(id));

      if (!food) {
        throw new AppError('Food not found', 404);
      }

      // Delete image from Cloudinary if exists
      if (food.pic) {
        try {
          await ImageService.deleteImageByUrl(food.pic);
        } catch (error) {
          console.warn('Failed to delete image from Cloudinary:', error);
          // Continue with deletion even if image deletion fails
        }
      }

      await food.destroy();

      res.status(200).json({
        success: true,
        message: 'Food deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search foods by name
   */
  static async searchFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const foods = await Food.findByName(query);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: foods,
        count: foods.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get high protein foods
   */
  static async getHighProteinFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const minProtein = req.query.minProtein ? parseFloat(req.query.minProtein as string) : 20;

      const foods = await Food.findHighProteinFoods(minProtein);

      res.status(200).json({
        success: true,
        message: 'High protein foods retrieved successfully',
        data: foods,
        count: foods.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get low calorie foods
   */
  static async getLowCalorieFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maxCalories = req.query.maxCalories ? parseFloat(req.query.maxCalories as string) : 50;

      const foods = await Food.findLowCalorieFoods(maxCalories);

      res.status(200).json({
        success: true,
        message: 'Low calorie foods retrieved successfully',
        data: foods,
        count: foods.length,
      });
    } catch (error) {
      next(error);
    }
  }
}
