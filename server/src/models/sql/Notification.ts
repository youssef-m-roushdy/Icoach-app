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

// Notification attributes interface
interface NotificationAttributes {
  id: number;
  userId: number;
  type: string;
  title: string;
  content: string | null;
  data: any | null; // JSONB field for flexible payload
  isRead: boolean;
  readAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface NotificationCreationAttributes
  extends Optional<
    NotificationAttributes,
    | 'id'
    | 'content'
    | 'data'
    | 'isRead'
    | 'readAt'
    | 'isDeleted'
    | 'deletedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

// Notification types as const object
export const NotificationTypes = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  SYSTEM: 'system',
  REMINDER: 'reminder',
  ACHIEVEMENT: 'achievement',
  WORKOUT_REMINDER: 'workout_reminder',
  MEAL_REMINDER: 'meal_reminder',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPT: 'friend_accept',
  MENTION: 'mention',
  SHARE: 'share',
  BADGE_EARNED: 'badge_earned',
  LEVEL_UP: 'level_up',
  PERSONAL_BEST: 'personal_best',
  WORKOUT_COMPLETED: 'workout_completed',
  PLAN_RECOMMENDATION: 'plan_recommendation',
} as const;

// Type for notification types (using typeof)
export type NotificationTypeValue = typeof NotificationTypes[keyof typeof NotificationTypes];

// Notification model class
class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  // Attributes
  declare id: CreationOptional<number>;
  declare userId: number;
  declare type: string;
  declare title: string;
  declare content: string | null;
  declare data: any | null;
  declare isRead: CreationOptional<boolean>;
  declare readAt: Date | null;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Instance methods
  
  // Mark notification as read
  async markAsRead(): Promise<void> {
    if (!this.isRead) {
      await this.update({
        isRead: true,
        readAt: new Date(),
      });
    }
  }

  // Mark notification as unread
  async markAsUnread(): Promise<void> {
    if (this.isRead) {
      await this.update({
        isRead: false,
        readAt: null,
      });
    }
  }

  // Soft delete notification
  async softDelete(): Promise<void> {
    if (!this.isDeleted) {
      await this.update({
        isDeleted: true,
        deletedAt: new Date(),
      });
    }
  }

  // Restore soft deleted notification
  async restore(): Promise<void> {
    if (this.isDeleted) {
      await this.update({
        isDeleted: false,
        deletedAt: null,
      });
    }
  }

  // Get notification age (how many seconds ago)
  getAgeInSeconds(): number {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    return Math.floor(diff / 1000);
  }

  // Get formatted time string (like "2 hours ago", "yesterday")
  getFormattedTime(): string {
    const seconds = this.getAgeInSeconds();
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }

  // Get notification data as parsed object
  getData<T = any>(): T | null {
    if (!this.data) return null;
    return this.data as T;
  }

  // Static methods
  
  // Get unread count for a user
  static async getUnreadCount(userId: number): Promise<number> {
    return this.count({
      where: {
        userId,
        isRead: false,
        isDeleted: false,
      },
    });
  }

  // Get recent notifications for a user
  static async getRecentNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ rows: Notification[]; count: number }> {
    return this.findAndCountAll({
      where: {
        userId,
        isDeleted: false,
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
  }

  // Get unread notifications only
  static async getUnreadNotifications(
    userId: number,
    limit: number = 20
  ): Promise<Notification[]> {
    return this.findAll({
      where: {
        userId,
        isRead: false,
        isDeleted: false,
      },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: number): Promise<number> {
    const [affectedCount] = await this.update(
      {
        isRead: true,
        readAt: new Date(),
      },
      {
        where: {
          userId,
          isRead: false,
          isDeleted: false,
        },
      }
    );
    return affectedCount;
  }

  // Delete all read notifications for a user (soft delete)
  static async deleteAllRead(userId: number): Promise<number> {
    const [affectedCount] = await this.update(
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      {
        where: {
          userId,
          isRead: true,
          isDeleted: false,
        },
      }
    );
    return affectedCount;
  }

  // Create a notification with type validation
  static async createNotification(
    userId: number,
    type: string,
    title: string,
    data?: any,
    content?: string
  ): Promise<Notification> {
    return this.create({
      userId,
      type,
      title,
      content: content || null,
      data: data || null,
    });
  }

  // Get notifications by type
  static async getByType(
    userId: number,
    type: string,
    limit: number = 20
  ): Promise<Notification[]> {
    return this.findAll({
      where: {
        userId,
        type,
        isDeleted: false,
      },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  // Get notifications older than date (for cleanup)
  static async getOlderThan(days: number, limit: number = 1000): Promise<Notification[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.findAll({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
        isDeleted: false,
      },
      limit,
    });
  }
}

// Initialize the model
Notification.init(
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
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(NotificationTypes)],
          msg: `Type must be one of: ${Object.values(NotificationTypes).join(', ')}`,
        },
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Title is required',
        },
        len: {
          args: [1, 255],
          msg: 'Title must be between 1 and 255 characters',
        },
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'Content must be less than 1000 characters',
        },
      },
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Flexible JSON payload for notification context (postId, userId, etc.)',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
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
    tableName: 'notifications',
    modelName: 'Notification',
    timestamps: true,
    paranoid: false, // Using custom soft delete with isDeleted
    indexes: [
      {
        fields: ['userId', 'isRead', 'createdAt'],
        name: 'notifications_user_read_idx',
      },
      {
        fields: ['userId', 'createdAt'],
        name: 'notifications_user_created_idx',
      },
      {
        fields: ['userId', 'isDeleted', 'createdAt'],
        name: 'notifications_user_deleted_idx',
      },
      {
        fields: ['type'],
        name: 'notifications_type_idx',
      },
      {
        fields: ['createdAt'],
        name: 'notifications_created_at_idx',
      },
    ],
  }
);

export default Notification;
export type { NotificationAttributes, NotificationCreationAttributes };