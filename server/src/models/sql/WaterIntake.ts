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

// WaterIntake attributes interface - Updated to allow string for date
interface WaterIntakeAttributes {
  id: number;
  userId: number;
  date: string;
  amountInLiters: number;
  goalInLiters: number;
  isCompleted: boolean;
  completedAt: Date | null;
  streakDays: number;
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface WaterIntakeCreationAttributes
  extends Optional<
    WaterIntakeAttributes,
    | 'id'
    | 'amountInLiters'
    | 'goalInLiters'
    | 'isCompleted'
    | 'completedAt'
    | 'streakDays'
    | 'createdAt'
    | 'updatedAt'
  > { }

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

// WaterIntake model class
class WaterIntake extends Model<
  InferAttributes<WaterIntake>,
  InferCreationAttributes<WaterIntake>
> {
  // Attributes
  declare id: CreationOptional<number>;
  declare userId: number;
  declare date: string;
  declare amountInLiters: CreationOptional<number>;
  declare goalInLiters: CreationOptional<number>;
  declare isCompleted: CreationOptional<boolean>;
  declare completedAt: CreationOptional<Date | null>;
  declare streakDays: CreationOptional<number>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Instance methods

  // Check if goal is achieved
  isGoalAchieved(): boolean {
    return this.amountInLiters >= this.goalInLiters;
  }

  // Get progress percentage
  getProgressPercentage(): number {
    return Math.min(Math.round((this.amountInLiters / this.goalInLiters) * 100), 100);
  }

  // Get remaining amount to goal (in liters)
  getRemainingLiters(): number {
    return Math.max(this.goalInLiters - this.amountInLiters, 0);
  }

  // Get remaining amount to goal (in milliliters)
  getRemainingML(): number {
    return this.getRemainingLiters() * 1000;
  }

  // Get amount in milliliters
  getAmountInML(): number {
    return this.amountInLiters * 1000;
  }

  // Get goal in milliliters
  getGoalInML(): number {
    return this.goalInLiters * 1000;
  }

  // Get formatted date string
  getFormattedDate(): string {
    return this.date;
  }

  // Get date as Date object
  getDateObject(): Date {
    return new Date(this.date);
  }

  // Get status message
  getStatusMessage(): string {
    if (this.isCompleted) {
      return `✅ Hydration goal achieved! ${this.amountInLiters.toFixed(1)}/${this.goalInLiters.toFixed(1)}L`;
    }
    return `💧 Progress: ${this.amountInLiters.toFixed(1)}/${this.goalInLiters.toFixed(1)}L (${this.getProgressPercentage()}%)`;
  }

  // Get display string for cups (assuming 1 cup = 250ml)
  getCupsAmount(): number {
    return Math.round(this.getAmountInML() / 250);
  }

  // Get display string for goal in cups
  getCupsGoal(): number {
    return Math.round(this.getGoalInML() / 250);
  }

  // Add water amount (supports both L and ML input)
  addWater(amount: number, unit: 'L' | 'ML' = 'L'): number {
    const amountInLiters = unit === 'L' ? amount : amount / 1000;
    this.amountInLiters = Math.min(this.amountInLiters + amountInLiters, 10); // Cap at 10L

    // Check if goal is achieved
    if (!this.isCompleted && this.amountInLiters >= this.goalInLiters) {
      this.isCompleted = true;
      this.completedAt = new Date();
    }

    return this.amountInLiters;
  }

  // Static methods

  // Find activity by user and date
  static async findByUserAndDate(userId: number, date: Date | string): Promise<WaterIntake | null> {
    const dateStr = typeof date === 'string' ? date : formatDateForDB(date);
    
    return this.findOne({
      where: {
        userId,
        date: dateStr
      }
    });
  }

  // Get or create today's activity - FIXED
  static async getOrCreateToday(userId: number): Promise<WaterIntake> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStr = formatDateForDB(today);
    
    const [activity] = await this.findOrCreate({
      where: {
        userId,
        date: todayStr
      },
      defaults: {
        userId,
        date: todayStr,
        amountInLiters: 0,
        goalInLiters: 2.0,
        isCompleted: false,
        streakDays: 0
      }
    });
    
    return activity;
  }

  // Get user's activities for a date range
  static async getUserActivities(
    userId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<WaterIntake[]> {
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

  // Get user's current streak
  static async getUserStreak(userId: number): Promise<number> {
    const activities = await this.findAll({
      where: {
        userId,
        isCompleted: true
      },
      order: [['date', 'DESC']],
      limit: 365
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateForDB(today);

    for (const activity of activities) {
      const daysDiff = Math.floor(
        (new Date(todayStr).getTime() - new Date(activity.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // Get user's longest streak
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
      const activityDateStr = activity.date;

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

  // Get total water intake for user (all time)
  static async getUserTotalIntake(userId: number): Promise<{
    totalLiters: number;
    totalML: number;
    averageDailyLiters: number;
  }> {
    const result = await this.sum('amountInLiters', {
      where: { userId }
    });

    const totalDays = await this.count({
      where: { userId }
    });

    const totalLiters = result || 0;
    const averageDailyLiters = totalDays > 0 ? totalLiters / totalDays : 0;

    return {
      totalLiters,
      totalML: totalLiters * 1000,
      averageDailyLiters
    };
  }

  // Get weekly summary for user
  static async getWeeklySummary(userId: number, date: Date | string): Promise<{
    totalLiters: number;
    totalML: number;
    completedDays: number;
    averageDailyLiters: number;
    bestDay: { date: string; amount: number } | null;
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

    const totalLiters = activities.reduce((sum, act) => sum + act.amountInLiters, 0);
    const completedDays = activities.filter(act => act.isCompleted).length;
    const averageDailyLiters = activities.length > 0 ? totalLiters / activities.length : 0;

    let bestDay = null;
    if (activities.length > 0) {
      const best = activities.reduce((max, act) =>
        act.amountInLiters > max.amountInLiters ? act : max
      );
      bestDay = {
        date: best.getFormattedDate(),
        amount: best.amountInLiters
      };
    }

    return {
      totalLiters,
      totalML: totalLiters * 1000,
      completedDays,
      averageDailyLiters,
      bestDay
    };
  }

  // Get monthly summary for user
  static async getMonthlySummary(userId: number, year: number, month: number): Promise<{
    totalLiters: number;
    totalML: number;
    completedDays: number;
    averageDailyLiters: number;
    daysWithIntake: number;
  }> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const startStr = formatDateForDB(startOfMonth);
    const endStr = formatDateForDB(endOfMonth);

    const activities = await this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startStr, endStr]
        }
      }
    });

    const totalLiters = activities.reduce((sum, act) => sum + act.amountInLiters, 0);
    const completedDays = activities.filter(act => act.isCompleted).length;
    const daysWithIntake = activities.filter(act => act.amountInLiters > 0).length;
    const averageDailyLiters = daysWithIntake > 0 ? totalLiters / daysWithIntake : 0;

    return {
      totalLiters,
      totalML: totalLiters * 1000,
      completedDays,
      averageDailyLiters,
      daysWithIntake
    };
  }

  // Get stats for a specific date range
  static async getStatsForDateRange(
    userId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<{
    activities: WaterIntake[];
    totalLiters: number;
    completedDays: number;
    completionRate: number;
  }> {
    const startStr = typeof startDate === 'string' ? startDate : formatDateForDB(startDate);
    const endStr = typeof endDate === 'string' ? endDate : formatDateForDB(endDate);

    const activities = await this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startStr, endStr]
        }
      },
      order: [['date', 'ASC']]
    });

    const totalLiters = activities.reduce((sum, act) => sum + act.amountInLiters, 0);
    const completedDays = activities.filter(act => act.isCompleted).length;
    const completionRate = activities.length > 0 ? (completedDays / activities.length) * 100 : 0;

    return {
      activities,
      totalLiters,
      completedDays,
      completionRate
    };
  }
}

// Initialize the model
WaterIntake.init(
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
    amountInLiters: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      field: 'amount_in_liters',
      validate: {
        min: {
          args: [0],
          msg: 'Amount must be at least 0 liters',
        },
        max: {
          args: [10],
          msg: 'Amount cannot exceed 10 liters per day',
        },
      },
    },
    goalInLiters: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.0,
      field: 'goal_in_liters',
      validate: {
        min: {
          args: [0.5],
          msg: 'Goal must be at least 0.5 liters',
        },
        max: {
          args: [10],
          msg: 'Goal cannot exceed 10 liters',
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
    tableName: 'water_intakes',
    modelName: 'WaterIntake',
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'date'],
        name: 'water_intakes_user_date_unique',
      },
      {
        fields: ['userId'],
        name: 'water_intakes_user_id_idx',
      },
      {
        fields: ['date'],
        name: 'water_intakes_date_idx',
      },
      {
        fields: ['userId', 'isCompleted'],
        name: 'water_intakes_user_completed_idx',
      },
      {
        fields: ['userId', 'date', 'isCompleted'],
        name: 'water_intakes_user_date_completed_idx',
      },
    ],
  }
);

export default WaterIntake;
export type { WaterIntakeAttributes, WaterIntakeCreationAttributes };