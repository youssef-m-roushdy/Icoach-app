'use strict';

import { QueryInterface, DataTypes, QueryTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('sequelize-cli').Migration} */
export async function up (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Read the food nutrition data JSON file (in data directory)
    const jsonFilePath = path.join(__dirname, '..', '..', 'data', 'food_nutrition_data.json');
    const foodData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Check if foods table already has data
    const existingFoods = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM foods',
      {
        type: QueryTypes.SELECT
      }
    );

    const count = (existingFoods[0] as any).count;
    
    if (count > 0) {
      console.log(`ℹ️  Foods table already has ${count} records, skipping seeding.`);
      console.log(`💡 To re-seed with images, first run: npm run db:seed:undo`);
      return;
    }

    console.log(`🚀 Starting to seed ${foodData.length} food items...`);


    // Transform the JSON data - images are already uploaded to Cloudinary
    const foodRecords = foodData.map((food: any) => ({
      id: food.id,
      name: food.name,
      calories: food.per_100g.calories_kcal,
      protein: food.per_100g.protein_g,
      carbohydrate: food.per_100g.carbohydrate_g,
      fat: food.per_100g.fat_g,
      sugar: food.per_100g.sugar_g || 0.0,
      pic: food.pic_link, // Use the Cloudinary URL directly from JSON
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all food records
    await queryInterface.bulkInsert('foods', foodRecords, {});

    console.log(`\n✅ Successfully seeded ${foodRecords.length} food items!`);
    console.log(`📊 Foods table now contains nutrition data with Cloudinary images for ${foodRecords.length} items.`);
  } catch (error) {
    console.error('❌ Error seeding food nutrition data:', error);
    throw error;
  }
}

export async function down (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Remove all food records
    await queryInterface.bulkDelete('foods', {}, {});
    
    console.log('🗑️  All food records removed successfully!');
  } catch (error) {
    console.error('❌ Error removing food records:', error);
    throw error;
  }
}
