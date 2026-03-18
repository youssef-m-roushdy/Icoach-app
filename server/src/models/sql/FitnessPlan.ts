import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface FitnessPlanAttributes {
  id: string;
  userId: number;
  planType: 'workout' | 'diet';
  planData: object;
  status: 'active' | 'expired';
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FitnessPlanCreationAttributes
  extends Optional<
    FitnessPlanAttributes,
    | 'id'
    | 'status'
    | 'expiresAt'
    | 'createdAt'
    | 'updatedAt'
  > { }

class FitnessPlan extends Model<InferAttributes<FitnessPlan>, InferCreationAttributes<FitnessPlan>> {
  declare id: CreationOptional<string>;
  declare userId: number;
  declare planType: 'workout' | 'diet';
  declare planData: object;
  declare status: 'active' | 'expired';
  declare expiresAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }
}
FitnessPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    planType: {
      type: DataTypes.ENUM('workout', 'diet'),
      allowNull: false,
    },
    planData: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'expired'),
      allowNull: false,
      defaultValue: 'active',
    },
    expiresAt: {
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
    tableName: 'fitness_plans',
    modelName: 'FitnessPlan',
    timestamps: true,
  }
);

export default FitnessPlan;
