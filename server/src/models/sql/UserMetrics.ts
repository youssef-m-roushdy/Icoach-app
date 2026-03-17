import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface UserMetricsAttributes {
  id: number;
  userId: number;
  date: Date;
  fitnessScore: number;
  strength: number; // 0-10
  endurance: number; // 0-10
  consistency: number; // 0-10
  volume: number; // 0-10
  progress: number; // 0-10
  habits: number; // 0-10
  totalWorkouts: number;
  weeklyAvg: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number; // lifetime kg
  points: number;
  badgeLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMetricsCreationAttributes
  extends Optional<
    UserMetricsAttributes,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
  > {}

class UserMetrics extends Model<
  InferAttributes<UserMetrics>,
  InferCreationAttributes<UserMetrics>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare date: Date;
  declare fitnessScore: number;
  declare strength: number;
  declare endurance: number;
  declare consistency: number;
  declare volume: number;
  declare progress: number;
  declare habits: number;
  declare totalWorkouts: number;
  declare weeklyAvg: number;
  declare currentStreak: number;
  declare longestStreak: number;
  declare totalVolume: number;
  declare points: number;
  declare badgeLevel: number;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

UserMetrics.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fitnessScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    strength: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    endurance: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    consistency: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    volume: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    progress: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    habits: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    totalWorkouts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    weeklyAvg: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0,
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalVolume: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    badgeLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    tableName: 'user_metrics',
    modelName: 'UserMetrics',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'date'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['date'],
      },
    ],
  }
);

export default UserMetrics;