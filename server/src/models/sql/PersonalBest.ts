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
  weight: number | null; // ✅ CHANGED: Allow null for bodyweight exercises
  reps: number;
  achievedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalBestCreationAttributes
  extends Optional<
    PersonalBestAttributes,
    | 'id'
    | 'weight' // ✅ CHANGED: weight is now optional on creation
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
  declare weight: CreationOptional<number | null>; // ✅ CHANGED: Allow null
  declare reps: number;
  declare achievedAt: Date;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Format for display
  getDisplayValue(): string {
    if (this.weight === null || this.weight === 0) {
      return `Bodyweight${this.reps > 1 ? ` × ${this.reps}` : ''}`;
    }
    return `${this.weight} kg${this.reps > 1 ? ` × ${this.reps}` : ''}`;
  }

  // Helper method to check if this is a bodyweight personal best
  isBodyweight(): boolean {
    return this.weight === null || this.weight === 0;
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
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    workoutId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'workout_id',
      references: {
        model: 'workouts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    exerciseName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'exercise_name',
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // ✅ CHANGED: Allow null for bodyweight
      defaultValue: null, // ✅ CHANGED: Default to null
      field: 'weight',
      validate: {
        isWeightValid(value: number | null) {
          if (value !== null && value < 0) {
            throw new Error('Weight cannot be negative');
          }
        },
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
      field: 'achieved_at',
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
    tableName: 'personal_bests',
    modelName: 'PersonalBest',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'workout_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['weight'], // ✅ ADDED: Index for querying weighted PBs
        name: 'personal_bests_weight_idx',
      },
    ],
    hooks: {
      beforeCreate: async (pb: PersonalBest) => {
        // Convert 0 weight to null for consistency
        if (pb.weight === 0) {
          pb.weight = null;
        }
      },
      beforeUpdate: async (pb: PersonalBest) => {
        // Convert 0 weight to null for consistency
        if (pb.weight === 0) {
          pb.weight = null;
        }
      },
    },
  }
);

export default PersonalBest;