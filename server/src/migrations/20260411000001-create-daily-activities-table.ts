// server/src/db/migrations/20260411000001-create-daily-activities-table.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('📊 Creating daily_activities table...');

  await queryInterface.createTable('daily_activities', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    step_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    goal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10000,
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    points_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    streak_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add unique constraint for user_id and date
  await queryInterface.addConstraint('daily_activities', {
    fields: ['user_id', 'date'],
    type: 'unique',
    name: 'daily_activities_user_id_date_unique',
  });

  // Add indexes for better query performance
  await queryInterface.addIndex('daily_activities', ['user_id', 'date'], {
    name: 'daily_activities_user_id_date_idx',
  });
  
  await queryInterface.addIndex('daily_activities', ['user_id', 'is_completed'], {
    name: 'daily_activities_user_completed_idx',
  });
  
  await queryInterface.addIndex('daily_activities', ['date'], {
    name: 'daily_activities_date_idx',
  });

  console.log('✅ Daily activities table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping daily_activities table...');
  await queryInterface.dropTable('daily_activities');
  console.log('✅ Daily activities table dropped');
}