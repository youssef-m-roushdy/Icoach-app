import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type ForeignKey,
} from 'sequelize';
import { sequelize } from '../../config/database.js';
import User from './User.js';

class UserSubscription extends Model<InferAttributes<UserSubscription>, InferCreationAttributes<UserSubscription>> {
  declare id: CreationOptional<number>;
  declare subscriptionId: string; // Guid from PaymentService, source of truth
  declare userId: ForeignKey<User['id']>;
  declare coachId: ForeignKey<User['id']> | null;
  declare planType: 'AppMonthly' | 'AppYearly' | 'CoachMonthly' | 'CoachYearly';
  declare status: 'Trialing' | 'Active' | 'Canceled' | 'Expired' | 'PastDue';
  declare gateway: 'Stripe' | 'Paymob' | 'PayPal';
  declare currentPeriodStart: Date;
  declare currentPeriodEnd: Date;
  declare autoRenew: CreationOptional<boolean>;
  declare canceledAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  isActive(): boolean {
    return (
      (this.status === 'Active' || this.status === 'Trialing') &&
      this.currentPeriodEnd > new Date()
    );
  }

  isCoachPlan(): boolean {
    return this.planType === 'CoachMonthly' || this.planType === 'CoachYearly';
  }
}

UserSubscription.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    subscriptionId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
    },
    planType: {
      type: DataTypes.ENUM('AppMonthly', 'AppYearly', 'CoachMonthly', 'CoachYearly'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Trialing', 'Active', 'Canceled', 'Expired', 'PastDue'),
      allowNull: false,
    },
    gateway: {
      type: DataTypes.ENUM('Stripe', 'Paymob', 'PayPal'),
      allowNull: false,
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    canceledAt: {
      type: DataTypes.DATE,
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
  },
  {
    sequelize,
    tableName: 'user_subscriptions',
    modelName: 'UserSubscription',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['subscriptionId'] },
      { fields: ['userId', 'status'] },
      { fields: ['coachId'] },
    ],
  }
);

export default UserSubscription;