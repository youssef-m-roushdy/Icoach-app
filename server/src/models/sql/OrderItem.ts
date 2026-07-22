import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface OrderItemAttributes {
  id: number;
  orderId: number;
  productId: number;
  productName: string; // snapshot — survives product renames/deletion
  unitPrice: number; // snapshot — survives later price changes
  quantity: number;
  subtotal: number; // unitPrice * quantity, stored for fast reads
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemCreationAttributes
  extends Optional<OrderItemAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class OrderItem extends Model<InferAttributes<OrderItem>, InferCreationAttributes<OrderItem>> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare productId: number;
  declare productName: string;
  declare unitPrice: number;
  declare quantity: number;
  declare subtotal: number;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: { model: 'store_products', key: 'id' },
      onDelete: 'RESTRICT',
    },
    productName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'product_name',
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'unit_price',
      validate: {
        min: { args: [0], msg: 'Unit price must be 0 or greater' },
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'quantity',
      validate: {
        min: { args: [1], msg: 'Quantity must be at least 1' },
      },
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'subtotal',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'order_items',
    modelName: 'OrderItem',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['order_id'], name: 'order_items_order_id_idx' },
      { fields: ['product_id'], name: 'order_items_product_id_idx' },
    ],
  }
);

export default OrderItem;