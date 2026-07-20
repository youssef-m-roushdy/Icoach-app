import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface ChatParticipantAttributes {
  id: number;
  conversationId: number;
  userId: number;
  role: 'member' | 'admin' | 'owner';
  lastReadAt?: Date | null;
  leftAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipantCreationAttributes
  extends Optional<
    ChatParticipantAttributes,
    | 'id'
    | 'role'
    | 'lastReadAt'
    | 'leftAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class ChatParticipant extends Model<
  InferAttributes<ChatParticipant>,
  InferCreationAttributes<ChatParticipant>
> {
  declare id: CreationOptional<number>;
  declare conversationId: number;
  declare userId: number;
  declare role: CreationOptional<'member' | 'admin' | 'owner'>;
  declare lastReadAt: CreationOptional<Date | null>;
  declare leftAt: CreationOptional<Date | null>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

ChatParticipant.init(
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
    role: {
      type: DataTypes.ENUM('member', 'admin', 'owner'),
      allowNull: false,
      defaultValue: 'member',
      field: 'role',
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_read_at',
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'left_at',
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
    tableName: 'chat_participants',
    modelName: 'ChatParticipant',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['conversation_id'],
        name: 'chat_participants_conversation_id_idx',
      },
      {
        fields: ['user_id'],
        name: 'chat_participants_user_id_idx',
      },
      {
        unique: true,
        fields: ['conversation_id', 'user_id'],
        name: 'chat_participants_conversation_user_unique',
      },
    ],
  }
);

export default ChatParticipant;
