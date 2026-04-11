// server/src/db/migrations/20260411140200-alter-workout-sessions-table.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔧 Altering workout_sessions table...');

  // Add new columns
  await queryInterface.addColumn('workout_sessions', 'total_volume', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  await queryInterface.addColumn('workout_sessions', 'total_sets', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await queryInterface.addColumn('workout_sessions', 'total_reps', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await queryInterface.addColumn('workout_sessions', 'max_weight', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // Migrate data from old columns to new columns
  console.log('📦 Migrating data to new columns...');
  await queryInterface.sequelize.query(`
    UPDATE workout_sessions 
    SET 
      total_volume = COALESCE(volume, 0),
      total_sets = COALESCE(sets, 0),
      total_reps = COALESCE(reps, 0) * COALESCE(sets, 0),
      max_weight = COALESCE(weight, 0)
  `);

  // Drop old columns
  console.log('🗑️ Dropping old columns...');
  await queryInterface.removeColumn('workout_sessions', 'volume');
  await queryInterface.removeColumn('workout_sessions', 'sets');
  await queryInterface.removeColumn('workout_sessions', 'reps');
  await queryInterface.removeColumn('workout_sessions', 'weight');

  // Add new indexes
  await queryInterface.addIndex('workout_sessions', ['user_id', 'workout_id'], {
    name: 'workout_sessions_user_workout_idx',
  });

  console.log('✅ Workout sessions table altered successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🔧 Reverting workout_sessions table alterations...');

  // Add back old columns
  await queryInterface.addColumn('workout_sessions', 'volume', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  await queryInterface.addColumn('workout_sessions', 'sets', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  });

  await queryInterface.addColumn('workout_sessions', 'reps', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  });

  await queryInterface.addColumn('workout_sessions', 'weight', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // Restore data from new columns to old columns
  await queryInterface.sequelize.query(`
    UPDATE workout_sessions 
    SET 
      volume = total_volume,
      sets = total_sets,
      reps = CASE WHEN total_sets > 0 THEN total_reps / total_sets ELSE 0 END,
      weight = max_weight
  `);

  // Remove index
  await queryInterface.removeIndex('workout_sessions', 'workout_sessions_user_workout_idx');

  // Drop new columns
  await queryInterface.removeColumn('workout_sessions', 'total_volume');
  await queryInterface.removeColumn('workout_sessions', 'total_sets');
  await queryInterface.removeColumn('workout_sessions', 'total_reps');
  await queryInterface.removeColumn('workout_sessions', 'max_weight');

  console.log('✅ Workout sessions table reverted successfully');
}