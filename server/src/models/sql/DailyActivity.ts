import {
  DataTypes,
  Model,
  Op,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

// DailyActivity attributes interface
interface DailyActivityAttributes {
  id: number;
  userId: number;
  date: Date;
  stepCount: number;
  goal: number;
  isCompleted: boolean;
  completedAt: Date | null;
  pointsEarned: number;
  streakDays: number;
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface DailyActivityCreationAttributes
  extends Optional<
    DailyActivityAttributes,
    | 'id'
    | 'stepCount'
    | 'goal'
    | 'isCompleted'
    | 'completedAt'
    | 'pointsEarned'
    | 'streakDays'
    | 'createdAt'
    | 'updatedAt'
  > {}

// DailyActivity model class
class DailyActivity extends Model<
  InferAttributes<DailyActivity>,
  InferCreationAttributes<DailyActivity>
> {
  // Attributes
  declare id: CreationOptional<number>;
  declare userId: number;
  declare date: Date;
  declare stepCount: CreationOptional<number>;
  declare goal: CreationOptional<number>;
  declare isCompleted: CreationOptional<boolean>;
  declare completedAt: CreationOptional<Date | null>;
  declare pointsEarned: CreationOptional<number>;
  declare streakDays: CreationOptional<number>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Instance methods
  
  // Check if goal is achieved
  isGoalAchieved(): boolean {
    return this.stepCount >= this.goal;
  }

  // Get progress percentage
  getProgressPercentage(): number {
    return Math.min(Math.round((this.stepCount / this.goal) * 100), 100);
  }

  // Get remaining steps to goal
  getRemainingSteps(): number {
    return Math.max(this.goal - this.stepCount, 0);
  }

  // Get formatted date string
  getFormattedDate(): string {
    return this.date.toISOString().split('T')[0] ?? '';
  }

  // Get status message
  getStatusMessage(): string {
    if (this.isCompleted) {
      return `✅ Goal achieved! ${this.stepCount}/${this.goal} steps`;
    }
    return `📅 Progress: ${this.stepCount}/${this.goal} steps (${this.getProgressPercentage()}%)`;
  }

  // Get points earned for this activity
  getPointsForActivity(): number {
    if (this.isCompleted && this.pointsEarned === 0) {
      // Calculate points based on steps if not already set
      return Math.floor(this.stepCount / 100); // 1 point per 100 steps
    }
    return this.pointsEarned;
  }

  // Static methods
  
  // Find activity by user and date
  static async findByUserAndDate(userId: number, date: Date): Promise<DailyActivity | null> {
    return this.findOne({
      where: {
        userId,
        date: {
          [Op.eq]: date
        }
      }
    });
  }

  // Get user's activities for a date range
  static async getUserActivities(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<DailyActivity[]> {
    return this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });
  }

  // Get user's current streak
  static async getUserStreak(userId: number): Promise<number> {
    const activities = await this.findAll({
      where: {
        userId,
        isCompleted: true
      },
      order: [['date', 'DESC']]
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const activity of activities) {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  static async updateGoal(
    userId: number, 
    newGoal: number, 
    date?: Date
  ): Promise<DailyActivity> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const [activity] = await this.findOrCreate({
      where: {
        userId,
        date: targetDate
      },
      defaults: {
        userId,
        date: targetDate,
        stepCount: 0,
        goal: newGoal,
        isCompleted: false,
        pointsEarned: 0,
        streakDays: 0
      }
    });

    if (activity.goal !== newGoal) {
      const wasCompleted = activity.isCompleted;
      const isNowCompleted = activity.stepCount >= newGoal;
      
      await activity.update({
        goal: newGoal,
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted && !wasCompleted ? new Date() : activity.completedAt
      });
    }

    return activity;
  }

  // Get user's goal setting
  static async getUserGoal(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activity = await this.findOne({
      where: {
        userId,
        date: today
      }
    });

    return activity?.goal || 10000; // Default goal
  }

  // Get total points earned by user
  static async getUserTotalPoints(userId: number): Promise<number> {
    const result = await this.sum('pointsEarned', {
      where: { userId }
    });
    return result || 0;
  }

  // Get weekly summary for user
  static async getWeeklySummary(userId: number, date: Date): Promise<{
    totalSteps: number;
    completedDays: number;
    averageSteps: number;
  }> {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const activities = await this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startOfWeek, endOfWeek]
        }
      }
    });

    const totalSteps = activities.reduce((sum, act) => sum + act.stepCount, 0);
    const completedDays = activities.filter(act => act.isCompleted).length;
    const averageSteps = activities.length > 0 ? Math.round(totalSteps / activities.length) : 0;

    return { totalSteps, completedDays, averageSteps };
  }
}

// Initialize the model
DailyActivity.init(
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: {
          msg: 'User ID is required',
        },
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date',
      validate: {
        notNull: {
          msg: 'Date is required',
        },
        isValidDate(value: Date) {
          if (isNaN(new Date(value).getTime())) {
            throw new Error('Invalid date format');
          }
        },
      },
    },
    stepCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'step_count',
      validate: {
        min: {
          args: [0],
          msg: 'Step count must be at least 0',
        },
        max: {
          args: [100000],
          msg: 'Step count must be less than 100,000',
        },
      },
    },
    goal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10000,
      field: 'goal',
      validate: {
        min: {
          args: [1],
          msg: 'Goal must be at least 1 step',
        },
        max: {
          args: [100000],
          msg: 'Goal must be less than 100,000 steps',
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
      validate: {
        isDate: {
          msg: 'Invalid completion date format',
          args: true,
        },
      },
    },
    pointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'points_earned',
      validate: {
        min: {
          args: [0],
          msg: 'Points earned must be at least 0',
        },
      },
    },
    streakDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'streak_days',
      validate: {
        min: {
          args: [0],
          msg: 'Streak days must be at least 0',
        },
      },
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
    tableName: 'daily_activities',
    modelName: 'DailyActivity',
    timestamps: true,
    paranoid: false,
    underscored: true, // Automatically convert camelCase to snake_case in queries
    indexes: [
      {
        unique: true,
        fields: ['userId', 'date'],
        name: 'daily_activities_user_date_unique',
      },
      {
        fields: ['userId'],
        name: 'daily_activities_user_id_idx',
      },
      {
        fields: ['date'],
        name: 'daily_activities_date_idx',
      },
      {
        fields: ['userId', 'isCompleted'],
        name: 'daily_activities_user_completed_idx',
      },
    ],
  }
);

export default DailyActivity;
export type { DailyActivityAttributes, DailyActivityCreationAttributes };