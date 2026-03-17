// server/src/db/migrations/20260317120008-fix-personal-best-columns.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔄 Fixing PersonalBest table columns...');

  const tableInfo = await queryInterface.describeTable('personal_bests');
  
  // Rename columns if they exist in camelCase
  const columnMappings = [
    { from: 'userId', to: 'user_id' },
    { from: 'workoutId', to: 'workout_id' },
    { from: 'exerciseName', to: 'exercise_name' },
    { from: 'achievedAt', to: 'achieved_at' },
    { from: 'createdAt', to: 'created_at' },
    { from: 'updatedAt', to: 'updated_at' },
  ];

  for (const mapping of columnMappings) {
    if (tableInfo[mapping.from]) {
      try {
        await queryInterface.renameColumn('personal_bests', mapping.from, mapping.to);
        console.log(`✅ Renamed ${mapping.from} → ${mapping.to}`);
      } catch (error) {
        console.log(`⚠️ Could not rename ${mapping.from}:`, error);
      }
    }
  }

  // Recreate indexes with snake_case
  try {
    // Drop existing indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "personal_bests_user_id_workout_id";
      DROP INDEX IF EXISTS "personal_bests_user_id";
    `);

    // Create new indexes with snake_case
    await queryInterface.addIndex('personal_bests', ['user_id', 'workout_id'], {
      unique: true,
      name: 'personal_bests_user_id_workout_id',
    });

    await queryInterface.addIndex('personal_bests', ['user_id'], {
      name: 'personal_bests_user_id',
    });

    console.log('✅ Indexes recreated');
  } catch (error) {
    console.log('⚠️ Index recreation issue:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert if needed
  const tableInfo = await queryInterface.describeTable('personal_bests');
  
  const revertMappings = [
    { from: 'user_id', to: 'userId' },
    { from: 'workout_id', to: 'workoutId' },
    { from: 'exercise_name', to: 'exerciseName' },
    { from: 'achieved_at', to: 'achievedAt' },
  ];

  for (const mapping of revertMappings) {
    if (tableInfo[mapping.from]) {
      await queryInterface.renameColumn('personal_bests', mapping.from, mapping.to);
    }
  }
}