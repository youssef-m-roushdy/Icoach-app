import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface CartItemAttributes {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemCreationAttributes
  extends Optional<CartItemAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class CartItem extends Model<InferAttributes<CartItem>, InferCreationAttributes<CartItem>> {
  declare id: CreationOptional<number>;
  declare cartId: number;
  declare productId: number;
  declare quantity: number;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cart_id',
      references: { model: 'carts', key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: { model: 'store_products', key: 'id' },
      onDelete: 'CASCADE',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'quantity',
      validate: {
        min: { args: [1], msg: 'Quantity must be at least 1' },
      },
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
    tableName: 'cart_items',
    modelName: 'CartItem',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['cart_id'], name: 'cart_items_cart_id_idx' },
      { fields: ['product_id'], name: 'cart_items_product_id_idx' },
      { unique: true, fields: ['cart_id', 'product_id'], name: 'cart_items_cart_product_unique_idx' },
    ],
  }
);

export default CartItem;