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

// WaterIntake attributes interface
interface WaterIntakeAttributes {
  id: number;
  userId: number;
  date: Date;
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
  > {}

// WaterIntake model class
class WaterIntake extends Model<
  InferAttributes<WaterIntake>,
  InferCreationAttributes<WaterIntake>
> {
  // Attributes
  declare id: CreationOptional<number>;
  declare userId: number;
  declare date: Date;
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
    return this.date.toISOString().split('T')[0] ?? '';
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
  static async findByUserAndDate(userId: number, date: Date): Promise<WaterIntake | null> {
    return this.findOne({
      where: {
        userId,
        date: {
          [Op.eq]: date
        }
      }
    });
  }

  // Get or create today's activity
  static async getOrCreateToday(userId: number): Promise<WaterIntake> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [activity] = await this.findOrCreate({
      where: {
        userId,
        date: today
      },
      defaults: {
        userId,
        date: today,
        amountInLiters: 0,
        goalInLiters: 2.0,
        isCompleted: false
      }
    });
    
    return activity;
  }

  // Get user's activities for a date range
  static async getUserActivities(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<WaterIntake[]> {
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
      order: [['date', 'DESC']],
      limit: 365
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
    let lastDate: Date | null = null;

    for (const activity of activities) {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      
      if (lastDate) {
        const daysDiff = Math.floor(
          (activityDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
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
      lastDate = activityDate;
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
  static async getWeeklySummary(userId: number, date: Date): Promise<{
    totalLiters: number;
    totalML: number;
    completedDays: number;
    averageDailyLiters: number;
    bestDay: { date: string; amount: number } | null;
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

    const activities = await this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startOfMonth, endOfMonth]
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
    startDate: Date,
    endDate: Date
  ): Promise<{
    activities: WaterIntake[];
    totalLiters: number;
    completedDays: number;
    completionRate: number;
  }> {
    const activities = await this.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate]
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
        isValidDate(value: Date) {
          if (isNaN(new Date(value).getTime())) {
            throw new Error('Invalid date format');
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
    underscored: true, // Automatically convert camelCase to snake_case in queries
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