// models/sql/WorkoutSession.ts
import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type HasManyGetAssociationsMixin,
  type HasManyAddAssociationMixin,
  type HasManyCountAssociationsMixin,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../../config/database.js';
import WorkoutSessionSet from './WorkoutSessionSet.js';

export interface WorkoutSessionAttributes {
  id: number;
  userId: number;
  workoutId: number;
  duration: number; // in minutes
  totalVolume: number; // sum of all set volumes
  totalSets: number; // count of sets
  totalReps: number; // sum of all reps
  maxWeight: number; // max weight used in any set
  completedAt: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutSessionCreationAttributes
  extends Optional<
    WorkoutSessionAttributes,
    | 'id'
    | 'totalVolume'
    | 'totalSets'
    | 'totalReps'
    | 'maxWeight'
    | 'notes'
    | 'createdAt'
    | 'updatedAt'
  > {}

class WorkoutSession extends Model<
  InferAttributes<WorkoutSession>,
  InferCreationAttributes<WorkoutSession>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare workoutId: number;
  declare duration: number;
  declare totalVolume: CreationOptional<number>;
  declare totalSets: CreationOptional<number>;
  declare totalReps: CreationOptional<number>;
  declare maxWeight: CreationOptional<number>;
  declare completedAt: Date;
  declare notes: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Association methods
  declare getSets: HasManyGetAssociationsMixin<WorkoutSessionSet>;
  declare addSet: HasManyAddAssociationMixin<WorkoutSessionSet, number>;
  declare countSets: HasManyCountAssociationsMixin;

  // Sets association
  declare sets?: NonAttribute<WorkoutSessionSet[]>;

  // Instance methods
  async recalculateTotals(): Promise<void> {
    const sets = await this.getSets();
    
    this.totalSets = sets.length;
    this.totalReps = sets.reduce((sum, set) => sum + set.reps, 0);
    this.totalVolume = sets.reduce((sum, set) => sum + set.getVolume(), 0);
    this.maxWeight = sets.length > 0 
      ? Math.max(...sets.map(set => set.weight || 0)) 
      : 0;
    
    await this.save();
  }

  // Get formatted summary
  getSummary(): string {
    return `${this.totalSets} sets, ${this.totalReps} reps, ${this.totalVolume}kg volume`;
  }

  // Check if bodyweight only workout
  async isBodyweightOnly(): Promise<boolean> {
    const sets = await this.getSets();
    return sets.every(set => set.weight === 0);
  }

  // Static methods
  static async getUserSessions(
    userId: number,
    limit: number = 20
  ): Promise<WorkoutSession[]> {
    return this.findAll({
      where: { userId },
      order: [['completedAt', 'DESC']],
      limit,
    });
  }

  static async getPersonalBest(
    userId: number,
    workoutId: number
  ): Promise<{ maxWeight: number; maxVolume: number } | null> {
    const sessions = await this.findAll({
      where: { userId, workoutId },
      order: [['completedAt', 'DESC']],
      limit: 50,
    });

    if (sessions.length === 0) return null;

    return {
      maxWeight: Math.max(...sessions.map(s => s.maxWeight || 0)),
      maxVolume: Math.max(...sessions.map(s => s.totalVolume || 0)),
    };
  }
}

WorkoutSession.init(
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
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'duration',
      validate: {
        min: {
          args: [1],
          msg: 'Duration must be at least 1 minute',
        },
      },
    },
    totalVolume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_volume',
    },
    totalSets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_sets',
    },
    totalReps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_reps',
    },
    maxWeight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'max_weight',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'completed_at',
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
    tableName: 'workout_sessions',
    modelName: 'WorkoutSession',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
        name: 'workout_sessions_user_id_idx',
      },
      {
        fields: ['workout_id'],
        name: 'workout_sessions_workout_id_idx',
      },
      {
        fields: ['completed_at'],
        name: 'workout_sessions_completed_at_idx',
      },
      {
        fields: ['user_id', 'completed_at'],
        name: 'workout_sessions_user_completed_idx',
      },
    ],
  }
);

export default WorkoutSession;