// server/src/db/migrations/20260609000001-create-food-allergens-table.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🍽️ Creating food_allergens table...');

  await queryInterface.createTable('food_allergens', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    food_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'foods',
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
    contains: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  // Add unique constraint for food_id and allergen_id
  await queryInterface.addConstraint('food_allergens', {
    fields: ['food_id', 'allergen_id'],
    type: 'unique',
    name: 'food_allergens_food_allergen_unique',
  });

  // Add indexes
  await queryInterface.addIndex('food_allergens', ['food_id'], {
    name: 'food_allergens_food_id_idx',
  });

  await queryInterface.addIndex('food_allergens', ['allergen_id'], {
    name: 'food_allergens_allergen_id_idx',
  });

  await queryInterface.addIndex('food_allergens', ['contains'], {
    name: 'food_allergens_contains_idx',
  });

  console.log('✅ Food_allergens table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping food_allergens table...');
  await queryInterface.dropTable('food_allergens');
  console.log('✅ Food_allergens table dropped');
}