'use strict';

import { QueryInterface, DataTypes, QueryTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Read the food allergens mapping JSON file
    const jsonFilePath = path.join(__dirname, '..', '..', 'data', 'food_allergens.json');
    const mappingsData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Check if food_allergens table already has data
    const existingMappings = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM food_allergens',
      {
        type: QueryTypes.SELECT
      }
    );

    const count = (existingMappings[0] as any).count;
    
    if (count > 0) {
      console.log(`ℹ️  Food allergens table already has ${count} records, skipping seeding.`);
      console.log(`💡 To re-seed, first run: npm run db:seed:undo`);
      return;
    }

    console.log(`🚀 Starting to seed ${mappingsData.length} food-allergen mappings...`);

    // Transform the JSON data to match the FoodAllergen model
    const mappingRecords = mappingsData.map((mapping: any) => ({
      foodId: mapping.foodId,
      allergenId: mapping.allergenId,
      contains: mapping.contains,
      notes: mapping.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all mapping records
    await queryInterface.bulkInsert('food_allergens', mappingRecords, {});

    console.log(`\n✅ Successfully seeded ${mappingRecords.length} food-allergen mappings!`);
    console.log(`📊 Food allergens table now links foods to their potential allergens.`);
  } catch (error) {
    console.error('❌ Error seeding food allergens mappings:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Remove all food allergen mappings
    await queryInterface.bulkDelete('food_allergens', {}, {});
    
    console.log('🗑️  All food allergen mappings removed successfully!');
  } catch (error) {
    console.error('❌ Error removing food allergen mappings:', error);
    throw error;
  }
}