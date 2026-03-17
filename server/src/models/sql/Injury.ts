import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface InjuryAttributes {
  id: number;
  name: string;
  bodyPart: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InjuryCreationAttributes
  extends Optional<
    InjuryAttributes,
    | 'id'
    | 'description'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Injury extends Model<InferAttributes<Injury>, InferCreationAttributes<Injury>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare bodyPart: string;
  declare severity: 'mild' | 'moderate' | 'severe';
  declare description: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

Injury.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    bodyPart: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('mild', 'moderate', 'severe'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: 'injuries',
    modelName: 'Injury',
    timestamps: true,
  }
);

export default Injury
