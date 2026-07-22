import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
} as const;

export type OrderStatusValue = typeof OrderStatus[keyof typeof OrderStatus];

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  governorate?: string;
  postalCode?: string;
  country: string;
  phone: string;
}

export interface OrderAttributes {
  id: number;
  orderNumber: string; // public-facing string ID, sent as order_id in the PaymentService gRPC call
  userId: number;
  storeId: number;
  status: OrderStatusValue;
  totalAmount: number;
  currency: string;
  paymentId: string | null; // PaymentService's Payment Guid, set once CreatePayment succeeds
  shippingAddress: ShippingAddress | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderCreationAttributes
  extends Optional<
    OrderAttributes,
    | 'id'
    | 'status'
    | 'paymentId'
    | 'shippingAddress'
    | 'notes'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<number>;
  declare orderNumber: string;
  declare userId: number;
  declare storeId: number;
  declare status: CreationOptional<OrderStatusValue>;
  declare totalAmount: number;
  declare currency: string;
  declare paymentId: string | null;
  declare shippingAddress: ShippingAddress | null;
  declare notes: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  isPaid(): boolean {
    return this.status === OrderStatus.PAID || this.status === OrderStatus.SHIPPED || this.status === OrderStatus.DELIVERED;
  }
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'order_number',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'store_id',
      references: { model: 'stores', key: 'id' },
      onDelete: 'RESTRICT',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OrderStatus)),
      allowNull: false,
      defaultValue: OrderStatus.PENDING,
      field: 'status',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'total_amount',
      validate: {
        min: { args: [0], msg: 'Total amount must be 0 or greater' },
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      field: 'currency',
    },
    paymentId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'payment_id',
    },
    shippingAddress: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'shipping_address',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'notes',
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
    tableName: 'orders',
    modelName: 'Order',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['order_number'], name: 'orders_order_number_unique_idx' },
      { fields: ['user_id', 'status'], name: 'orders_user_id_status_idx' },
      { fields: ['store_id'], name: 'orders_store_id_idx' },
      { fields: ['payment_id'], name: 'orders_payment_id_idx' },
    ],
  }
);

export default Order;