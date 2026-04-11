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
  weight: number; // 0 for bodyweight exercises
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
  declare weight: CreationOptional<number>;
  declare isCompleted: CreationOptional<boolean>;
  declare completedAt: CreationOptional<Date | null>;
  declare restTimeSeconds: number | null;
  declare notes: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Instance methods
  getVolume(): number {
    return this.reps * (this.weight || 0);
  }

  getDisplayString(): string {
    if (this.weight && this.weight > 0) {
      return `Set ${this.setNumber}: ${this.reps} reps @ ${this.weight}kg`;
    }
    return `Set ${this.setNumber}: ${this.reps} reps (bodyweight)`;
  }

  markCompleted(): void {
    this.isCompleted = true;
    this.completedAt = new Date();
  }

  // Static methods
  static async getSetsForSession(sessionId: number): Promise<WorkoutSessionSet[]> {
    return this.findAll({
      where: { sessionId },
      order: [['setNumber', 'ASC']],
    });
  }

  static async getNextSetNumber(sessionId: number): Promise<number> {
    const count = await this.count({ where: { sessionId } });
    return count + 1;
  }

  static async getTotalVolume(sessionId: number): Promise<number> {
    const sets = await this.findAll({ where: { sessionId } });
    return sets.reduce((sum, set) => sum + set.getVolume(), 0);
  }
}

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
      allowNull: false,
      defaultValue: 0,
      field: 'weight',
      validate: {
        min: {
          args: [0],
          msg: 'Weight cannot be negative',
        },
        max: {
          args: [1000],
          msg: 'Weight cannot exceed 1000kg',
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
        if (set.isCompleted && !set.completedAt) {
          set.completedAt = new Date();
        }
      },
      beforeUpdate: async (set: WorkoutSessionSet) => {
        if (set.changed('isCompleted') && set.isCompleted && !set.completedAt) {
          set.completedAt = new Date();
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