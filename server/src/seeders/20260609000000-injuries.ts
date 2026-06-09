'use strict';

import { QueryInterface, DataTypes, QueryTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InjuryData {
  id: number;
  name: string;
  bodyPart: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string | null;
}

export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Read the injuries data JSON file
    const jsonFilePath = path.join(__dirname, '..', '..', 'data', 'injuries.json');
    const injuriesData: InjuryData[] = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Check if injuries table already has data
    const existingInjuries = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM injuries',
      {
        type: QueryTypes.SELECT
      }
    );

    const count = (existingInjuries[0] as any).count;
    
    if (count > 0) {
      console.log(`ℹ️  Injuries table already has ${count} records, skipping seeding.`);
      console.log(`💡 To re-seed, first run: npm run db:seed:undo`);
      return;
    }

    console.log(`🚀 Starting to seed ${injuriesData.length} injury items...`);

    // Transform the JSON data to match the Injury model
    const injuryRecords = injuriesData.map((injury: InjuryData) => ({
      id: injury.id,
      name: injury.name,
      bodyPart: injury.bodyPart,
      severity: injury.severity,
      description: injury.description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all injury records
    await queryInterface.bulkInsert('injuries', injuryRecords, {});

    console.log(`\n✅ Successfully seeded ${injuryRecords.length} injuries!`);
    console.log(`📊 Injuries table now contains ${injuryRecords.length} common workout-related injuries.`);
    console.log(`📋 Body parts covered: chest, back, shoulder, arms, legs, abs, neck`);
  } catch (error) {
    console.error('❌ Error seeding injuries data:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Remove all injury records
    await queryInterface.bulkDelete('injuries', {}, {});
    
    console.log('🗑️  All injury records removed successfully!');
  } catch (error) {
    console.error('❌ Error removing injury records:', error);
    throw error;
  }
}