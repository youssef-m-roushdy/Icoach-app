import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

// Define the attributes for the ExpoToken model
interface ExpoTokenAttributes {
  id: number;
  userId: number;
  token: string;
  deviceType?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define which attributes are optional during creation
interface ExpoTokenCreationAttributes
  extends Optional<
    ExpoTokenAttributes,
    'id' | 'deviceType' | 'createdAt' | 'updatedAt'
  > {}

class ExpoToken extends Model<
  InferAttributes<ExpoToken>,
  InferCreationAttributes<ExpoToken>
> {
  // Attributes
  declare id: CreationOptional<number>;
  declare userId: number;
  declare token: string;
  declare deviceType: CreationOptional<string | null>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Static Methods
  
  /**
   * Find all tokens belonging to a specific user
   */
  static async findByUserId(userId: number): Promise<ExpoToken[]> {
    return this.findAll({
      where: { userId }
    });
  }

  /**
   * Remove a specific token (useful for logout)
   */
  static async removeToken(token: string): Promise<number> {
    return this.destroy({
      where: { token }
    });
  }
}

// Initialize the model
ExpoToken.init(
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
        model: 'users', // Ensure this matches your actual User table name
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'user_id' // Mapping camelCase to snake_case in DB
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Token cannot be empty',
        },
      },
    },
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'device_type'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    },
  },
  {
    sequelize,
    tableName: 'expo_tokens',
    modelName: 'ExpoToken',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['token'],
      },
      {
        fields: ['user_id'],
      },
    ],
  }
);

export default ExpoToken;
export { ExpoToken };
export type { ExpoTokenAttributes, ExpoTokenCreationAttributes };