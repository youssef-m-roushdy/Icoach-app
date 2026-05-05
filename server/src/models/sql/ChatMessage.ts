import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface ChatMessageAttributes {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageCreationAttributes
  extends Optional<
    ChatMessageAttributes,
    | 'id'
    | 'editedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class ChatMessage extends Model<
  InferAttributes<ChatMessage>,
  InferCreationAttributes<ChatMessage>
> {
  declare id: CreationOptional<number>;
  declare conversationId: number;
  declare senderId: number;
  declare content: string;
  declare editedAt: CreationOptional<Date | null>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  getPreview(maxLength: number = 100): string {
    return this.content.length > maxLength
      ? this.content.substring(0, maxLength) + '...'
      : this.content;
  }
}

ChatMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'id',
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'conversation_id',
      references: {
        model: 'chat_conversations',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sender_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'content',
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'edited_at',
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
    tableName: 'chat_messages',
    modelName: 'ChatMessage',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['conversation_id'],
        name: 'chat_messages_conversation_id_idx',
      },
      {
        fields: ['sender_id'],
        name: 'chat_messages_sender_id_idx',
      },
      {
        fields: ['created_at'],
        name: 'chat_messages_created_at_idx',
      },
      {
        fields: ['conversation_id', 'created_at'],
        name: 'chat_messages_conversation_created_at_idx',
      },
    ],
  }
);

export default ChatMessage;
