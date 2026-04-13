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
  session_id: string; // ✨ تم الإضافة لربط المحادثات
  role: 'user' | 'assistant' | 'system' | 'tool'; // ✨ تم التحديث ليشمل tool
  content: string;
  createdAt: Date;
}

export interface ChatHistoryCreationAttributes
  extends Optional<
    ChatHistoryAttributes,
    | 'id'
    | 'createdAt'
    | 'session_id' // اختياري وقت الإنشاء لأننا حاطين Default
  > { }

class ChatHistory extends Model<InferAttributes<ChatHistory>, InferCreationAttributes<ChatHistory>> {
  declare id: CreationOptional<string>;
  declare userId: number;
  declare session_id: string; // ✨ تم الإضافة
  declare role: 'user' | 'assistant' | 'system' | 'tool'; // ✨ تم التحديث
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
    // ✨ العمود الجديد لتمييز جلسات الدردشة
    session_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    // ✨ تحديث النوع ليشمل 'tool' وهو ضروري لنتائج البحث
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system', 'tool'),
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