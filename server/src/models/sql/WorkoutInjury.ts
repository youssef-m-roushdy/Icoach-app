import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface WorkoutInjuryAttributes {
  id: number;
  workoutId: number;
  injuryId: number;
  createdAt: Date;
}

export interface WorkoutInjuryCreationAttributes
  extends Optional<
    WorkoutInjuryAttributes,
    | 'id'
    | 'createdAt'
  > {}

class WorkoutInjury extends Model<InferAttributes<WorkoutInjury>, InferCreationAttributes<WorkoutInjury>> {
  declare id: CreationOptional<number>;
  declare workoutId: number;
  declare injuryId: number;
  declare readonly createdAt: CreationOptional<Date>;
}

WorkoutInjury.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    workoutId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'workouts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    injuryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'injuries',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'workout_injuries',
    modelName: 'WorkoutInjury',
    timestamps: true,
    updatedAt: false,
  }
);

export default WorkoutInjury;