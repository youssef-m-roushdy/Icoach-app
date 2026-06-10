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
    foodId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'foods',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    allergenId: {
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add unique constraint for foodId and allergenId
  await queryInterface.addConstraint('food_allergens', {
    fields: ['foodId', 'allergenId'],
    type: 'unique',
    name: 'food_allergens_food_allergen_unique',
  });

  // Add indexes
  await queryInterface.addIndex('food_allergens', ['foodId'], {
    name: 'food_allergens_food_id_idx',
  });

  await queryInterface.addIndex('food_allergens', ['allergenId'], {
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