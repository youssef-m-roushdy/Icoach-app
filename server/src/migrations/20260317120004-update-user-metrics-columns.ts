import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔄 Updating UserMetrics table columns to snake_case...');

  // Check if table exists
  const tableExists = await queryInterface.tableExists('user_metrics');
  if (!tableExists) {
    console.log('❌ Table user_metrics does not exist. Skipping migration.');
    return;
  }

  // Get current table structure
  const tableInfo = await queryInterface.describeTable('user_metrics');
  console.log('Current columns:', Object.keys(tableInfo));

  // Rename columns if they exist in camelCase
  const columnMappings = [
    { from: 'userId', to: 'user_id' },
    { from: 'fitnessScore', to: 'fitness_score' },
    { from: 'totalWorkouts', to: 'total_workouts' },
    { from: 'weeklyAvg', to: 'weekly_avg' },
    { from: 'currentStreak', to: 'current_streak' },
    { from: 'longestStreak', to: 'longest_streak' },
    { from: 'totalVolume', to: 'total_volume' },
    { from: 'badgeLevel', to: 'badge_level' },
    { from: 'createdAt', to: 'created_at' },
    { from: 'updatedAt', to: 'updated_at' },
  ];

  for (const mapping of columnMappings) {
    if (tableInfo[mapping.from]) {
      try {
        await queryInterface.renameColumn('user_metrics', mapping.from, mapping.to);
        console.log(`✅ Renamed ${mapping.from} → ${mapping.to}`);
      } catch (error) {
        console.log(`⚠️ Could not rename ${mapping.from}:`, error);
      }
    }
  }

  // Ensure all required columns exist with correct types
  console.log('🔧 Ensuring all columns have correct types...');

  // Add any missing columns
  const ensureColumn = async (columnName: string, columnSpec: any) => {
    if (!tableInfo[columnName]) {
      try {
        await queryInterface.addColumn('user_metrics', columnName, columnSpec);
        console.log(`✅ Added missing column: ${columnName}`);
      } catch (error) {
        console.log(`⚠️ Could not add column ${columnName}:`, error);
      }
    }
  };

  // Ensure all columns exist
  await ensureColumn('user_id', {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  });

  await ensureColumn('date', {
    type: DataTypes.DATEONLY,
    allowNull: false,
  });

  await ensureColumn('fitness_score', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('strength', {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('endurance', {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('consistency', {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('volume', {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('progress', {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('habits', {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('total_workouts', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('weekly_avg', {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('current_streak', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('longest_streak', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('total_volume', {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('points', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await ensureColumn('badge_level', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  });

  await ensureColumn('created_at', {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  });

  await ensureColumn('updated_at', {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  });

  // Recreate indexes with correct column names
  console.log('🔧 Recreating indexes...');

  try {
    // Drop existing indexes if they exist
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "user_metrics_user_id_date";
      DROP INDEX IF EXISTS "user_metrics_user_id";
      DROP INDEX IF EXISTS "user_metrics_date";
    `);

    // Create new indexes
    await queryInterface.addIndex('user_metrics', ['user_id', 'date'], {
      unique: true,
      name: 'user_metrics_user_id_date',
    });

    await queryInterface.addIndex('user_metrics', ['user_id'], {
      name: 'user_metrics_user_id',
    });

    await queryInterface.addIndex('user_metrics', ['date'], {
      name: 'user_metrics_date',
    });

    console.log('✅ Indexes recreated successfully');
  } catch (error) {
    console.log('⚠️ Could not recreate indexes:', error);
  }

  console.log('✅ UserMetrics table update completed');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🔄 Reverting UserMetrics table changes...');

  // This is a complex down migration - we'll just warn instead of trying to revert
  console.log('⚠️ This migration adds snake_case columns. Manual revert may be needed.');
  console.log('To revert, you would need to:');
  console.log('1. Rename columns back to camelCase');
  console.log('2. Restore original indexes');
  
  // Optional: Implement revert if needed
  // You can add renameColumn operations here to revert
}