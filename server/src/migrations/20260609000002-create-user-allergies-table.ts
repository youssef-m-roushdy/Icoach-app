// server/src/db/migrations/20260609000002-create-user-allergies-table.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('👤 Creating user_allergies table...');

  await queryInterface.createTable('user_allergies', {
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
    allergen_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'allergens',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    severity: {
      type: DataTypes.ENUM('mild', 'moderate', 'severe', 'life_threatening'),
      allowNull: false,
      defaultValue: 'moderate',
    },
    reaction: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diagnosis_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    diagnosed_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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

  // Add unique constraint for user_id and allergen_id
  await queryInterface.addConstraint('user_allergies', {
    fields: ['user_id', 'allergen_id'],
    type: 'unique',
    name: 'user_allergies_user_allergen_unique',
  });

  // Add indexes
  await queryInterface.addIndex('user_allergies', ['user_id'], {
    name: 'user_allergies_user_id_idx',
  });

  await queryInterface.addIndex('user_allergies', ['allergen_id'], {
    name: 'user_allergies_allergen_id_idx',
  });

  await queryInterface.addIndex('user_allergies', ['severity'], {
    name: 'user_allergies_severity_idx',
  });

  console.log('✅ User_allergies table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping user_allergies table...');
  await queryInterface.dropTable('user_allergies');
  console.log('✅ User_allergies table dropped');
}