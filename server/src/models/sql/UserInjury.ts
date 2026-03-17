import { DataTypes, Model, type CreationOptional } from 'sequelize';
import { sequelize } from '../../config/database.js';
import User from './User.js';
import Injury from './injury.js';

class UserInjury extends Model {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare injuryId: number;
  declare readonly createdAt: CreationOptional<Date>;
}

UserInjury.init(
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
    injuryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'injuries',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_injuries',
    modelName: 'UserInjury',
    timestamps: true,
    updatedAt: false,
  }
);

// العلاقات
User.belongsToMany(Injury, { through: UserInjury, foreignKey: 'userId' });
Injury.belongsToMany(User, { through: UserInjury, foreignKey: 'injuryId' });

export default UserInjury;
