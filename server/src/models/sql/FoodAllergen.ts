import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface FoodAllergenAttributes {
  id: number;
  foodId: number;
  allergenId: number;
  contains: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodAllergenCreationAttributes
  extends Optional<
    FoodAllergenAttributes,
    | 'id'
    | 'notes'
    | 'createdAt'
    | 'updatedAt'
  > {}

class FoodAllergen extends Model<InferAttributes<FoodAllergen>, InferCreationAttributes<FoodAllergen>> {
  declare id: CreationOptional<number>;
  declare foodId: number;
  declare allergenId: number;
  declare contains: CreationOptional<boolean>;
  declare notes: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

FoodAllergen.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    foodId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'foods',
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
    contains: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'food_allergens',
    modelName: 'FoodAllergen',
    timestamps: true,
  }
);

export default FoodAllergen;