import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('store_products', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'stores', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'out_of_stock'),
      allowNull: false,
      defaultValue: 'active',
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
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

  await queryInterface.addIndex('store_products', ['store_id'], {
    name: 'store_products_store_id_idx',
  });
  await queryInterface.addIndex('store_products', ['status'], {
    name: 'store_products_status_idx',
  });
  await queryInterface.addIndex('store_products', ['category'], {
    name: 'store_products_category_idx',
  });
  await queryInterface.addIndex('store_products', ['is_deleted'], {
    name: 'store_products_is_deleted_idx',
  });
  await queryInterface.addIndex('store_products', ['price'], {
    name: 'store_products_price_idx',
  });
  await queryInterface.addIndex('store_products', ['created_at'], {
    name: 'store_products_created_at_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('store_products');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_store_products_status";');
}