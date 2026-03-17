// server/src/db/migrations/20260317120006-fix-workout-session-columns.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔄 Fixing WorkoutSession table columns...');

  const tableInfo = await queryInterface.describeTable('workout_sessions');
  
  // Rename columns if they exist in camelCase
  if (tableInfo['userId']) {
    await queryInterface.renameColumn('workout_sessions', 'userId', 'user_id');
    console.log('✅ Renamed userId → user_id');
  }
  
  if (tableInfo['workoutId']) {
    await queryInterface.renameColumn('workout_sessions', 'workoutId', 'workout_id');
    console.log('✅ Renamed workoutId → workout_id');
  }
  
  if (tableInfo['completedAt']) {
    await queryInterface.renameColumn('workout_sessions', 'completedAt', 'completed_at');
    console.log('✅ Renamed completedAt → completed_at');
  }
  
  if (tableInfo['createdAt']) {
    await queryInterface.renameColumn('workout_sessions', 'createdAt', 'created_at');
    console.log('✅ Renamed createdAt → created_at');
  }
  
  if (tableInfo['updatedAt']) {
    await queryInterface.renameColumn('workout_sessions', 'updatedAt', 'updated_at');
    console.log('✅ Renamed updatedAt → updated_at');
  }

  // Recreate indexes
  try {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "workout_sessions_user_id";
      DROP INDEX IF EXISTS "workout_sessions_workout_id";
      DROP INDEX IF EXISTS "workout_sessions_completed_at";
    `);

    await queryInterface.addIndex('workout_sessions', ['user_id'], {
      name: 'workout_sessions_user_id',
    });
    await queryInterface.addIndex('workout_sessions', ['workout_id'], {
      name: 'workout_sessions_workout_id',
    });
    await queryInterface.addIndex('workout_sessions', ['completed_at'], {
      name: 'workout_sessions_completed_at',
    });

    console.log('✅ Indexes recreated');
  } catch (error) {
    console.log('⚠️ Index recreation issue:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert if needed
  const tableInfo = await queryInterface.describeTable('workout_sessions');
  
  if (tableInfo['user_id']) {
    await queryInterface.renameColumn('workout_sessions', 'user_id', 'userId');
  }
  if (tableInfo['workout_id']) {
    await queryInterface.renameColumn('workout_sessions', 'workout_id', 'workoutId');
  }
  if (tableInfo['completed_at']) {
    await queryInterface.renameColumn('workout_sessions', 'completed_at', 'completedAt');
  }
}