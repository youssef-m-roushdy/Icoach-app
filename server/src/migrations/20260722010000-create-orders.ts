import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('orders', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'stores', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded', 'shipped', 'delivered'),
      allowNull: false,
      defaultValue: 'pending',
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    payment_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
    },
    shipping_address: {
      type: DataTypes.JSONB,
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

  await queryInterface.addIndex('orders', ['order_number'], {
    unique: true,
    name: 'orders_order_number_unique_idx',
  });
  await queryInterface.addIndex('orders', ['user_id', 'status'], {
    name: 'orders_user_id_status_idx',
  });
  await queryInterface.addIndex('orders', ['store_id'], {
    name: 'orders_store_id_idx',
  });
  await queryInterface.addIndex('orders', ['payment_id'], {
    name: 'orders_payment_id_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('orders');

  // Clean up the ENUM type Postgres creates automatically for the status column.
  // Without this, re-running the migration after a rollback fails with "type already exists".
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
}