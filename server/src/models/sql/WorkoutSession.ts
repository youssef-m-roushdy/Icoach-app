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
  maxWeight: number | null; // max weight used in any set, null for bodyweight-only
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
  declare maxWeight: CreationOptional<number | null>;
  declare completedAt: Date;
  declare notes: CreationOptional<string | null>;
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
    
    const completedSets = sets.filter(s => s.isCompleted);
    
    this.totalSets = sets.length;
    this.totalReps = completedSets.reduce((sum, set) => sum + set.reps, 0);
    this.totalVolume = completedSets.reduce((sum, set) => sum + set.getVolume(), 0);
    
    // Calculate max weight from weighted sets only
    const weightedSets = completedSets.filter(s => s.weight !== null && s.weight > 0);
    const weights = weightedSets.map(s => Number(s.weight));
    
    this.maxWeight = weights.length > 0 ? Math.max(...weights) : null;
    
    await this.save();
  }

  // Get formatted summary
  getSummary(): string {
    const weightDisplay = this.maxWeight !== null 
      ? `Max weight: ${this.maxWeight}kg`
      : 'Bodyweight only';
    
    return `${this.totalSets} sets, ${this.totalReps} reps, ${this.totalVolume}kg volume, ${weightDisplay}`;
  }

  // Check if bodyweight only workout
  async isBodyweightOnly(): Promise<boolean> {
    const sets = await this.getSets();
    const completedSets = sets.filter(s => s.isCompleted);
    return completedSets.length > 0 && completedSets.every(set => set.weight === null || set.weight === 0);
  }

  // Check if any weighted sets
  hasWeightedSets(): boolean {
    return this.maxWeight !== null;
  }

  // Get formatted duration
  getFormattedDuration(): string {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
  ): Promise<{ maxWeight: number | null; maxVolume: number } | null> {
    const sessions = await this.findAll({
      where: { userId, workoutId },
      order: [['completedAt', 'DESC']],
      limit: 50,
    });

    if (sessions.length === 0) return null;

    const weightedSessions = sessions.filter(s => s.maxWeight !== null);
    const weights = weightedSessions.map(s => s.maxWeight as number);

    return {
      maxWeight: weights.length > 0 ? Math.max(...weights) : null,
      maxVolume: Math.max(...sessions.map(s => s.totalVolume || 0)),
    };
  }

  static async getBodyweightStats(
    userId: number,
    workoutId?: number
  ): Promise<{
    totalBodyweightSessions: number;
    totalWeightedSessions: number;
    percentageBodyweight: number;
  }> {
    const where: any = { userId };
    if (workoutId) {
      where.workoutId = workoutId;
    }

    const sessions = await this.findAll({ where });
    
    const bodyweightSessions = sessions.filter(s => s.maxWeight === null).length;
    const weightedSessions = sessions.filter(s => s.maxWeight !== null).length;
    const total = sessions.length;

    return {
      totalBodyweightSessions: bodyweightSessions,
      totalWeightedSessions: weightedSessions,
      percentageBodyweight: total > 0 ? Math.round((bodyweightSessions / total) * 100) : 0,
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
      allowNull: true, // Nullable for bodyweight-only workouts
      defaultValue: null, // Default to null instead of 0
      field: 'max_weight',
      validate: {
        min: {
          args: [0],
          msg: 'Max weight cannot be negative',
        },
      },
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
      {
        fields: ['max_weight'],
        name: 'workout_sessions_max_weight_idx',
      },
    ],
    hooks: {
      beforeCreate: async (session: WorkoutSession) => {
        // Convert 0 maxWeight to null for consistency
        if (session.maxWeight === 0) {
          session.maxWeight = null;
        }
      },
      beforeUpdate: async (session: WorkoutSession) => {
        // Convert 0 maxWeight to null for consistency
        if (session.maxWeight === 0) {
          session.maxWeight = null;
        }
      },
    },
  }
);

export default WorkoutSession;