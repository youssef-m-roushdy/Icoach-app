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
  id: string;
  userId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface ChatHistoryCreationAttributes
  extends Optional<
    ChatHistoryAttributes,
    | 'id'
    | 'createdAt'
  > { }

class ChatHistory extends Model<InferAttributes<ChatHistory>, InferCreationAttributes<ChatHistory>> {
  declare id: CreationOptional<string>;
  declare userId: number;
  declare role: 'user' | 'assistant' | 'system';
  declare content: string;
  declare readonly createdAt: CreationOptional<Date>;
}

ChatHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'chat_history',
    modelName: 'ChatHistory',
    timestamps: true,
    updatedAt: false,
  }
);

export default ChatHistory;