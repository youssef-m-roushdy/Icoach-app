import { DataTypes, Model, type CreationOptional } from 'sequelize';
import { sequelize } from '../../config/database.js';
import User from './User.js';

class ChatHistory extends Model {
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

// العلاقات
ChatHistory.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ChatHistory, { foreignKey: 'userId' });

export default ChatHistory;