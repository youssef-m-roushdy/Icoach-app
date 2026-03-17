import { DataTypes, Model, type CreationOptional } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Injury extends Model {
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
