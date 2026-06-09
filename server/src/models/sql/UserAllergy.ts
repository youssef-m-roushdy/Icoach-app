import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface UserAllergyAttributes {
  id: number;
  userId: number;
  allergenId: number;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reaction: string | null;
  diagnosisDate: Date | null;
  diagnosedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAllergyCreationAttributes
  extends Optional<
    UserAllergyAttributes,
    | 'id'
    | 'reaction'
    | 'diagnosisDate'
    | 'diagnosedBy'
    | 'notes'
    | 'createdAt'
    | 'updatedAt'
  > {}

class UserAllergy extends Model<InferAttributes<UserAllergy>, InferCreationAttributes<UserAllergy>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare allergenId: number;
  declare severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  declare reaction: string | null;
  declare diagnosisDate: Date | null;
  declare diagnosedBy: string | null;
  declare notes: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

UserAllergy.init(
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
    allergenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'allergens',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    severity: {
      type: DataTypes.ENUM('mild', 'moderate', 'severe', 'life_threatening'),
      allowNull: false,
      defaultValue: 'moderate',
    },
    reaction: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diagnosisDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    diagnosedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
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
    tableName: 'user_allergies',
    modelName: 'UserAllergy',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'allergenId'],
      },
    ],
  }
);

export default UserAllergy;