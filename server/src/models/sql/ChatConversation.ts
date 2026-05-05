import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface ChatConversationAttributes {
  id: number;
  isGroup: boolean;
  title?: string | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatConversationCreationAttributes
  extends Optional<
    ChatConversationAttributes,
    | 'id'
    | 'isGroup'
    | 'title'
    | 'createdAt'
    | 'updatedAt'
  > {}

class ChatConversation extends Model<
  InferAttributes<ChatConversation>,
  InferCreationAttributes<ChatConversation>
> {
  declare id: CreationOptional<number>;
  declare isGroup: CreationOptional<boolean>;
  declare title: CreationOptional<string | null>;
  declare createdBy: number;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

ChatConversation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'id',
    },
    isGroup: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_group',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'title',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    tableName: 'chat_conversations',
    modelName: 'ChatConversation',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['created_by'],
        name: 'chat_conversations_created_by_idx',
      },
      {
        fields: ['updated_at'],
        name: 'chat_conversations_updated_at_idx',
      },
    ],
  }
);

export default ChatConversation;
