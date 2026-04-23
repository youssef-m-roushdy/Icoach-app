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

// Helper function to format date for DATEONLY field
function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to convert date to string safely
function dateToString(date: string | Date): string {
  if (typeof date === 'string') {
    return date;
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

// Helper function to convert to Date object
function toDateObject(date: string | Date): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

// DailyActivity attributes interface - Updated to allow string for date
interface DailyActivityAttributes {
  id: number;
  userId: number;
  date: string | Date;
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
  declare date: string | Date;
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

  // Get formatted date string - FIXED
  getFormattedDate(): string {
    return dateToString(this.date);
  }

  // Get date as Date object
  getDateObject(): Date {
    return toDateObject(this.date);
  }

  // Get status message
  getStatusMessage(): string {
    if (this.isCompleted) {
      return `✅ Goal achieved! ${this.stepCount.toLocaleString()}/${this.goal.toLocaleString()} steps`;
    }
    return `📅 Progress: ${this.stepCount.toLocaleString()}/${this.goal.toLocaleString()} steps (${this.getProgressPercentage()}%)`;
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
  
  // Find activity by user and date - FIXED
  static async findByUserAndDate(userId: number, date: Date | string): Promise<DailyActivity | null> {
    const dateStr = typeof date === 'string' ? date : formatDateForDB(date);
    
    return this.findOne({
      where: {
        userId,
        date: dateStr
      }
    });
  }

  // Get user's activities for a date range - FIXED
  static async getUserActivities(
    userId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<DailyActivity[]> {
    const startStr = typeof startDate === 'string' ? startDate : formatDateForDB(startDate);
    const endStr = typeof endDate === 'string' ? endDate : formatDateForDB(endDate);
    
    return this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startStr, endStr]
        }
      },
      order: [['date', 'ASC']]
    });
  }

  // Get user's current streak - FIXED
  static async getUserStreak(userId: number): Promise<number> {
    const activities = await this.findAll({
      where: {
        userId,
        isCompleted: true
      },
      order: [['date', 'DESC']]
    });

    let streak = 0;
    const todayStr = formatDateForDB(new Date());

    for (const activity of activities) {
      const activityDateStr = dateToString(activity.date);
      const daysDiff = Math.floor(
        (new Date(todayStr).getTime() - new Date(activityDateStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // Get user's longest streak - FIXED
  static async getUserLongestStreak(userId: number): Promise<number> {
    const activities = await this.findAll({
      where: {
        userId,
        isCompleted: true
      },
      order: [['date', 'ASC']]
    });

    let longestStreak = 0;
    let currentStreak = 0;
    let lastDateStr: string | null = null;

    for (const activity of activities) {
      const activityDateStr = dateToString(activity.date);

      if (lastDateStr) {
        const lastDate = new Date(lastDateStr);
        const currentDate = new Date(activityDateStr);
        const daysDiff = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      longestStreak = Math.max(longestStreak, currentStreak);
      lastDateStr = activityDateStr;
    }

    return longestStreak;
  }

  // Update goal - FIXED
  static async updateGoal(
    userId: number, 
    newGoal: number, 
    date?: Date | string
  ): Promise<DailyActivity> {
    const targetDateStr = date 
      ? (typeof date === 'string' ? date : formatDateForDB(date))
      : formatDateForDB(new Date());
    
    const [activity] = await this.findOrCreate({
      where: {
        userId,
        date: targetDateStr
      },
      defaults: {
        userId,
        date: targetDateStr,
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

  // Get user's goal setting - FIXED
  static async getUserGoal(userId: number): Promise<number> {
    const todayStr = formatDateForDB(new Date());
    
    const activity = await this.findOne({
      where: {
        userId,
        date: todayStr
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

  // Get weekly summary for user - FIXED
  static async getWeeklySummary(userId: number, date: Date | string): Promise<{
    totalSteps: number;
    completedDays: number;
    averageSteps: number;
  }> {
    const inputDate = toDateObject(date);
    const startOfWeek = new Date(inputDate);
    startOfWeek.setDate(inputDate.getDate() - inputDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startStr = formatDateForDB(startOfWeek);
    const endStr = formatDateForDB(endOfWeek);

    const activities = await this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startStr, endStr]
        }
      }
    });

    const totalSteps = activities.reduce((sum, act) => sum + act.stepCount, 0);
    const completedDays = activities.filter(act => act.isCompleted).length;
    const averageSteps = activities.length > 0 ? Math.round(totalSteps / activities.length) : 0;

    return { totalSteps, completedDays, averageSteps };
  }

  // Get total steps for user - FIXED
  static async getUserTotalSteps(userId: number): Promise<number> {
    const result = await this.sum('stepCount', {
      where: { userId }
    });
    return result || 0;
  }

  // Get total days completed - FIXED
  static async getUserTotalDaysCompleted(userId: number): Promise<number> {
    return this.count({
      where: { userId, isCompleted: true }
    });
  }
}

// Initialize the model - Updated date field
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
        isValidDate(value: string) {
          if (!value || typeof value !== 'string') {
            throw new Error('Invalid date format');
          }
          const regex = /^\d{4}-\d{2}-\d{2}$/;
          if (!regex.test(value)) {
            throw new Error('Date must be in YYYY-MM-DD format');
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
    underscored: true,
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