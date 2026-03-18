import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface UserInjuryAttributes {
  id: number;
  userId: number;
  injuryId: number;
  createdAt: Date;
}

export interface UserInjuryCreationAttributes
  extends Optional<
    UserInjuryAttributes,
    | 'id'
    | 'createdAt'
  > {}

class UserInjury extends Model<InferAttributes<UserInjury>, InferCreationAttributes<UserInjury>> {
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

export default UserInjury;
