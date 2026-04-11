// server/src/db/migrations/20260411120000-create-water-intakes-table.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('💧 Creating water_intakes table...');

  await queryInterface.createTable('water_intakes', {
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
    amount_in_liters: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    goal_in_liters: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.0,
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
  await queryInterface.addConstraint('water_intakes', {
    fields: ['user_id', 'date'],
    type: 'unique',
    name: 'water_intakes_user_id_date_unique',
  });

  // Add indexes for better query performance
  await queryInterface.addIndex('water_intakes', ['user_id', 'date'], {
    name: 'water_intakes_user_id_date_idx',
  });
  
  await queryInterface.addIndex('water_intakes', ['user_id', 'is_completed'], {
    name: 'water_intakes_user_completed_idx',
  });
  
  await queryInterface.addIndex('water_intakes', ['date'], {
    name: 'water_intakes_date_idx',
  });

  // Additional index for amount queries
  await queryInterface.addIndex('water_intakes', ['user_id', 'date', 'is_completed'], {
    name: 'water_intakes_user_date_completed_idx',
  });

  console.log('✅ Water intakes table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping water_intakes table...');
  await queryInterface.dropTable('water_intakes');
  console.log('✅ Water intakes table dropped');
}