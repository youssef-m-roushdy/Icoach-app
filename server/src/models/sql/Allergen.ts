import {
  DataTypes,
  Model,
  Op,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

// Allergen attributes interface
interface AllergenAttributes {
  id: number;
  name: string;
  category: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface AllergenCreationAttributes
  extends Optional<
    AllergenAttributes,
    | 'id'
    | 'description'
    | 'createdAt'
    | 'updatedAt'
  > {}

// Allergen model class
class Allergen extends Model<
  InferAttributes<Allergen>,
  InferCreationAttributes<Allergen>
> {
  // Attributes
  declare id: CreationOptional<number>;
  declare name: string;
  declare category: string;
  declare description: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Instance methods
  
  // Get formatted allergen info
  getInfo(): string {
    return `${this.name} (${this.category})`;
  }

  // Check if allergen is food category
  isFoodAllergen(): boolean {
    return this.category === 'food';
  }

  // Check if allergen is medication
  isMedicationAllergen(): boolean {
    return this.category === 'medication';
  }

  // Check if allergen is environmental
  isEnvironmentalAllergen(): boolean {
    return this.category === 'environmental';
  }

  // Static methods
  
  // Find allergens by category
  static async findByCategory(category: string): Promise<Allergen[]> {
    return this.findAll({
      where: {
        category: {
          [Op.eq]: category
        }
      },
      order: [['name', 'ASC']]
    });
  }

  // Search allergens by name (partial match)
  static async searchByName(searchTerm: string): Promise<Allergen[]> {
    return this.findAll({
      where: {
        name: {
          [Op.like]: `%${searchTerm}%`
        }
      },
      order: [['name', 'ASC']]
    });
  }

  // Get allergen by name (case insensitive)
  static async findByName(name: string): Promise<Allergen | null> {
    return this.findOne({
      where: {
        name: {
          [Op.iLike]: name
        }
      }
    });
  }

  // Get all food allergens only
  static async getFoodAllergens(): Promise<Allergen[]> {
    return this.findAll({
      where: {
        category: 'food'
      },
      order: [['name', 'ASC']]
    });
  }
}

// Initialize the model
Allergen.init(
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
      validate: {
        notEmpty: {
          msg: 'Allergen name is required',
        },
        len: {
          args: [1, 100],
          msg: 'Allergen name must be between 1 and 100 characters',
        },
      },
      set(value: string) {
        this.setDataValue('name', value.trim());
      },
    },
    category: {
      type: DataTypes.ENUM('food', 'medication', 'environmental'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['food', 'medication', 'environmental']],
          msg: 'Category must be food, medication, or environmental',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Description must be less than 500 characters',
        },
      },
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
    tableName: 'allergens',
    modelName: 'Allergen',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
      {
        fields: ['category'],
      },
    ],
  }
);

export default Allergen;
export type { AllergenAttributes, AllergenCreationAttributes };