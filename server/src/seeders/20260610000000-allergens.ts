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
    // Read the allergens data JSON file (in data directory)
    const jsonFilePath = path.join(__dirname, '..', '..', 'data', 'allergens.json');
    const allergensData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Check if allergens table already has data
    const existingAllergens = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM allergens',
      {
        type: QueryTypes.SELECT
      }
    );

    const count = (existingAllergens[0] as any).count;
    
    if (count > 0) {
      console.log(`ℹ️  Allergens table already has ${count} records, skipping seeding.`);
      console.log(`💡 To re-seed, first run: npm run db:seed:undo`);
      return;
    }

    console.log(`🚀 Starting to seed ${allergensData.length} allergen items...`);

    // Transform the JSON data to match the Allergen model
    const allergenRecords = allergensData.map((allergen: any) => ({
      id: allergen.id,
      name: allergen.name,
      category: allergen.category,
      description: allergen.description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all allergen records
    await queryInterface.bulkInsert('allergens', allergenRecords, {});

    console.log(`\n✅ Successfully seeded ${allergenRecords.length} allergens!`);
    console.log(`📊 Allergens table now contains ${allergenRecords.length} common allergens.`);
    console.log(`📋 Categories: food, medication, environmental`);
  } catch (error) {
    console.error('❌ Error seeding allergens data:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Remove all allergen records
    await queryInterface.bulkDelete('allergens', {}, {});
    
    console.log('🗑️  All allergen records removed successfully!');
  } catch (error) {
    console.error('❌ Error removing allergen records:', error);
    throw error;
  }
}