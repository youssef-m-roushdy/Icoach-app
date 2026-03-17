import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface WorkoutSessionAttributes {
  id: number;
  userId: number;
  workoutId: number;
  duration: number; // in minutes
  volume: number; // total weight lifted (kg) - (weight * reps * sets)
  sets: number;
  reps: number;
  weight: number; // weight used per set (kg)
  completedAt: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutSessionCreationAttributes
  extends Optional<
    WorkoutSessionAttributes,
    | 'id'
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
  declare volume: number;
  declare sets: number;
  declare reps: number;
  declare weight: number;
  declare completedAt: Date;
  declare notes: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Calculate volume helper
  calculateVolume(): number {
    return this.weight * this.reps * this.sets;
  }
}

WorkoutSession.init(
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
    workoutId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'workouts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Duration must be at least 1 minute',
        },
      },
    },
    volume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    sets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Sets must be at least 1',
        },
      },
    },
    reps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Reps must be at least 1',
        },
      },
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Weight cannot be negative',
        },
      },
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'workout_sessions',
    modelName: 'WorkoutSession',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['workoutId'],
      },
      {
        fields: ['completedAt'],
      },
    ],
    hooks: {
      beforeCreate: async (session: WorkoutSession) => {
        // Auto-calculate volume if not set
        if (!session.volume) {
          session.volume = session.weight * session.reps * session.sets;
        }
      },
      beforeUpdate: async (session: WorkoutSession) => {
        // Recalculate volume if weight, reps, or sets changed
        if (session.changed('weight') || session.changed('reps') || session.changed('sets')) {
          session.volume = session.weight * session.reps * session.sets;
        }
      },
    },
  }
);

export default WorkoutSession;