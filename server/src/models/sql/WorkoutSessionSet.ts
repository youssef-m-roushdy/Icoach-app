// models/sql/WorkoutSessionSet.ts
import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';
import WorkoutSession from './WorkoutSession.js';

export interface WorkoutSessionSetAttributes {
  id: number;
  sessionId: number;
  setNumber: number; // 1, 2, 3, etc.
  reps: number;
  weight: number | null; // null for bodyweight exercises
  isCompleted: boolean;
  completedAt: Date | null;
  restTimeSeconds?: number | null; // rest time after this set
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutSessionSetCreationAttributes
  extends Optional<
    WorkoutSessionSetAttributes,
    | 'id'
    | 'weight'
    | 'isCompleted'
    | 'completedAt'
    | 'restTimeSeconds'
    | 'notes'
    | 'createdAt'
    | 'updatedAt'
  > {}

class WorkoutSessionSet extends Model<
  InferAttributes<WorkoutSessionSet>,
  InferCreationAttributes<WorkoutSessionSet>
> {
  declare id: CreationOptional<number>;
  declare sessionId: number;
  declare setNumber: number;
  declare reps: number;
  declare weight: CreationOptional<number | null>;
  declare isCompleted: CreationOptional<boolean>;
  declare completedAt: CreationOptional<Date | null>;
  declare restTimeSeconds: CreationOptional<number | null>;
  declare notes: CreationOptional<string | null>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Instance methods
  getVolume(): number {
    // For bodyweight exercises (weight = null), volume is 0
    if (this.weight === null) {
      return 0;
    }
    return this.reps * Number(this.weight);
  }

  getDisplayString(): string {
    if (this.weight !== null && this.weight > 0) {
      return `Set ${this.setNumber}: ${this.reps} reps @ ${this.weight}kg`;
    }
    return `Set ${this.setNumber}: ${this.reps} reps (bodyweight)`;
  }

  markCompleted(): void {
    this.isCompleted = true;
    this.completedAt = new Date();
  }

  isBodyweight(): boolean {
    return this.weight === null;
  }

  hasWeight(): boolean {
    return this.weight !== null && this.weight > 0;
  }

  // Static methods
  static async getSetsForSession(sessionId: number): Promise<WorkoutSessionSet[]> {
    return this.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });
  }

  static async getNextSetNumber(sessionId: number): Promise<number> {
    const lastSet = await this.findOne({
      where: { sessionId },
      order: [['setNumber', 'DESC']],
    });
    return lastSet ? lastSet.setNumber + 1 : 1;
  }

  static async getTotalVolume(sessionId: number): Promise<number> {
    const sets = await this.findAll({ where: { sessionId } });
    return sets.reduce((sum, set) => sum + set.getVolume(), 0);
  }

  static async getMaxWeight(sessionId: number): Promise<number | null> {
    const result = await this.findOne({
      where: { 
        sessionId,
        weight: { [Op.ne]: null } // Exclude null weights
      },
      order: [['weight', 'DESC']],
      attributes: ['weight'],
    });
    
    return result?.weight ? Number(result.weight) : null;
  }

  static async getSessionStats(sessionId: number): Promise<{
    totalSets: number;
    completedSets: number;
    totalReps: number;
    totalVolume: number;
    maxWeight: number | null;
    bodyweightSets: number;
    weightedSets: number;
  }> {
    const sets = await this.findAll({ where: { sessionId } });
    
    const totalSets = sets.length;
    const completedSets = sets.filter(s => s.isCompleted).length;
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
    const totalVolume = sets.reduce((sum, s) => sum + s.getVolume(), 0);
    
    const weightedSets = sets.filter(s => s.weight !== null && s.weight > 0);
    const bodyweightSets = sets.filter(s => s.weight === null);
    
    const weights = weightedSets.map(s => Number(s.weight));
    const maxWeight = weights.length > 0 ? Math.max(...weights) : null;

    return {
      totalSets,
      completedSets,
      totalReps,
      totalVolume,
      maxWeight,
      bodyweightSets: bodyweightSets.length,
      weightedSets: weightedSets.length,
    };
  }
}

// Import Op for the static method
import { Op } from 'sequelize';

WorkoutSessionSet.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'id',
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'session_id',
      references: {
        model: 'workout_sessions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    setNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'set_number',
      validate: {
        min: {
          args: [1],
          msg: 'Set number must be at least 1',
        },
      },
    },
    reps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reps',
      validate: {
        min: {
          args: [1],
          msg: 'Reps must be at least 1',
        },
        max: {
          args: [100],
          msg: 'Reps cannot exceed 100',
        },
      },
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null, // CHANGED: Now defaults to null for bodyweight
      field: 'weight',
      validate: {
        isWeightValid(value: number | null) {
          if (value !== null) {
            if (value < 0) {
              throw new Error('Weight cannot be negative');
            }
            if (value > 1000) {
              throw new Error('Weight cannot exceed 1000kg');
            }
          }
        },
      },
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_completed',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    restTimeSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'rest_time_seconds',
      validate: {
        min: {
          args: [0],
          msg: 'Rest time cannot be negative',
        },
        max: {
          args: [600],
          msg: 'Rest time cannot exceed 10 minutes',
        },
      },
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
    tableName: 'workout_session_sets',
    modelName: 'WorkoutSessionSet',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['session_id'],
        name: 'workout_session_sets_session_id_idx',
      },
      {
        unique: true,
        fields: ['session_id', 'set_number'],
        name: 'workout_session_sets_session_set_unique',
      },
      {
        fields: ['is_completed'],
        name: 'workout_session_sets_completed_idx',
      },
    ],
    hooks: {
      beforeCreate: async (set: WorkoutSessionSet) => {
        // Convert 0 weight to null for consistency
        if (set.weight === 0) {
          set.weight = null;
        }
        
        if (set.isCompleted && !set.completedAt) {
          set.completedAt = new Date();
        }
      },
      beforeUpdate: async (set: WorkoutSessionSet) => {
        // Convert 0 weight to null for consistency
        if (set.weight === 0) {
          set.weight = null;
        }
        
        if (set.changed('isCompleted') && set.isCompleted && !set.completedAt) {
          set.completedAt = new Date();
        }
        
        // Clear completedAt if marking as incomplete
        if (set.changed('isCompleted') && !set.isCompleted) {
          set.completedAt = null;
        }
      },
      afterCreate: async (set: WorkoutSessionSet) => {
        // Update session totals
        const session = await WorkoutSession.findByPk(set.sessionId);
        if (session) {
          await session.recalculateTotals();
        }
      },
      afterUpdate: async (set: WorkoutSessionSet) => {
        // Update session totals if relevant fields changed
        if (set.changed('reps') || set.changed('weight') || set.changed('isCompleted')) {
          const session = await WorkoutSession.findByPk(set.sessionId);
          if (session) {
            await session.recalculateTotals();
          }
        }
      },
      afterDestroy: async (set: WorkoutSessionSet) => {
        // Update session totals after set deletion
        const session = await WorkoutSession.findByPk(set.sessionId);
        if (session) {
          await session.recalculateTotals();
        }
      },
    },
  }
);

export default WorkoutSessionSet;