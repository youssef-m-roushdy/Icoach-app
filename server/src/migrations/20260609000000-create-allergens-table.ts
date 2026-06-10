// server/src/db/migrations/20260609000000-create-allergens-table.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🌾 Creating allergens table...');

  await queryInterface.createTable('allergens', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.ENUM('food', 'medication', 'environmental'),
      allowNull: false,
    },
    description: {
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

  // Add indexes
  await queryInterface.addIndex('allergens', ['name'], {
    name: 'allergens_name_idx',
  });

  await queryInterface.addIndex('allergens', ['category'], {
    name: 'allergens_category_idx',
  });

  console.log('✅ Allergens table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping allergens table...');
  await queryInterface.dropTable('allergens');
  console.log('✅ Allergens table dropped');
}