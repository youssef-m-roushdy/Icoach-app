import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface PersonalBestAttributes {
  id: number;
  userId: number;
  workoutId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalBestCreationAttributes
  extends Optional<
    PersonalBestAttributes,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
  > {}

class PersonalBest extends Model<
  InferAttributes<PersonalBest>,
  InferCreationAttributes<PersonalBest>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare workoutId: number;
  declare exerciseName: string;
  declare weight: number;
  declare reps: number;
  declare achievedAt: Date;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Format for display
  getDisplayValue(): string {
    return `${this.weight} kg${this.reps > 1 ? ` × ${this.reps}` : ''}`;
  }
}

PersonalBest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id', // ADD THIS
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    workoutId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'workout_id', // ADD THIS
      references: {
        model: 'workouts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    exerciseName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'exercise_name', // ADD THIS
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'weight',
      validate: {
        min: 0,
      },
    },
    reps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reps',
      validate: {
        min: 1,
      },
    },
    achievedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'achieved_at', // ADD THIS
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at', // ADD THIS
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at', // ADD THIS
    },
  },
  {
    sequelize,
    tableName: 'personal_bests',
    modelName: 'PersonalBest',
    timestamps: true,
    underscored: true, // ADD THIS
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'workout_id'], // Change to snake_case
      },
      {
        fields: ['user_id'], // Change to snake_case
      },
    ],
  }
);

export default PersonalBest;