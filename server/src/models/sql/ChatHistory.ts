import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface ChatHistoryAttributes {
  id: number;
  userId: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
}

export interface ChatHistoryCreationAttributes
  extends Optional<
    ChatHistoryAttributes,
    | 'id'
    | 'createdAt'
    | 'session_id'
  > { }

class ChatHistory extends Model<InferAttributes<ChatHistory>, InferCreationAttributes<ChatHistory>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare session_id: string;
  declare role: 'user' | 'assistant' | 'system' | 'tool';
  declare content: string;
  declare readonly createdAt: CreationOptional<Date>;

  // Instance methods
  getPreview(maxLength: number = 100): string {
    return this.content.length > maxLength 
      ? this.content.substring(0, maxLength) + '...' 
      : this.content;
  }

  isUserMessage(): boolean {
    return this.role === 'user';
  }

  isAssistantMessage(): boolean {
    return this.role === 'assistant';
  }

  // Static methods
  static async getMessagesBySession(sessionId: string): Promise<ChatHistory[]> {
    return this.findAll({
      where: { session_id: sessionId },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'role', 'content', 'createdAt', 'userId'],
    });
  }

  static async getMessagesByUser(userId: number, limit: number = 50): Promise<ChatHistory[]> {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  static async getSessionCount(userId: number): Promise<number> {
    const sessions = await this.findAll({
      where: { userId },
      attributes: ['session_id'],
      group: ['session_id'],
    });
    return sessions.length;
  }

  static async deleteSession(sessionId: string, userId: number): Promise<number> {
    return this.destroy({
      where: { 
        session_id: sessionId,
        userId 
      },
    });
  }
}

ChatHistory.init(
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
    session_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      field: 'session_id',
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system', 'tool'),
      allowNull: false,
      field: 'role',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'content',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'chat_history',
    modelName: 'ChatHistory',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
        name: 'chat_history_user_id_idx',
      },
      {
        fields: ['session_id'],
        name: 'chat_history_session_id_idx',
      },
      {
        fields: ['created_at'],
        name: 'chat_history_created_at_idx',
      },
      {
        fields: ['user_id', 'session_id'],
        name: 'chat_history_user_session_idx',
      },
      {
        fields: ['role'],
        name: 'chat_history_role_idx',
      },
    ],
    hooks: {
      beforeCreate: async (chat: ChatHistory) => {
        // Validate content is not empty
        if (!chat.content || chat.content.trim().length === 0) {
          throw new Error('Content cannot be empty');
        }
        
        // Validate role
        const validRoles = ['user', 'assistant', 'system', 'tool'];
        if (!validRoles.includes(chat.role)) {
          throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
      },
      afterCreate: async (chat: ChatHistory) => {
        // Optional: Add any post-creation logic here
        // e.g., update user's last activity, trigger notifications, etc.
        console.log(`Chat message created: ${chat.id} for session ${chat.session_id}`);
      },
    },
  }
);

export default ChatHistory;