'use strict';

import { QueryInterface, DataTypes, QueryTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WorkoutInjuryMapping {
  workoutId: number;
  injuryId: number;
}

export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Read the workout injuries mapping JSON file
    const jsonFilePath = path.join(__dirname, '..', '..', 'data', 'workout_injuries.json');
    const mappingsData: WorkoutInjuryMapping[] = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Check if workout_injuries table already has data
    const existingMappings = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM workout_injuries',
      {
        type: QueryTypes.SELECT
      }
    );

    const count = (existingMappings[0] as any).count;
    
    if (count > 0) {
      console.log(`ℹ️  Workout injuries table already has ${count} records, skipping seeding.`);
      console.log(`💡 To re-seed, first run: npm run db:seed:undo`);
      return;
    }

    console.log(`🚀 Starting to seed ${mappingsData.length} workout-injury mappings...`);

    // Transform the JSON data to match the WorkoutInjury model
    const mappingRecords = mappingsData.map((mapping: WorkoutInjuryMapping) => ({
      workoutId: mapping.workoutId,
      injuryId: mapping.injuryId,
      createdAt: new Date()
    }));

    // Insert all mapping records
    await queryInterface.bulkInsert('workout_injuries', mappingRecords, {});

    console.log(`\n✅ Successfully seeded ${mappingRecords.length} workout-injury mappings!`);
    console.log(`📊 Workout injuries table now links workouts to their potential injuries.`);
    console.log(`🔗 Statistics: ${mappingRecords.length} total mappings created.`);
  } catch (error) {
    console.error('❌ Error seeding workout injuries mappings:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  try {
    // Remove all workout injury mappings
    await queryInterface.bulkDelete('workout_injuries', {}, {});
    
    console.log('🗑️  All workout injury mappings removed successfully!');
  } catch (error) {
    console.error('❌ Error removing workout injury mappings:', error);
    throw error;
  }
}