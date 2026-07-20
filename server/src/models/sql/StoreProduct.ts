import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface ProductMedia {
  url: string;
  publicId?: string;
  type?: 'image';
  width?: number;
  height?: number;
}

export const ProductStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

export type ProductStatusValue = typeof ProductStatus[keyof typeof ProductStatus];

export interface StoreProductAttributes {
  id: number;
  storeId: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number;
  images: ProductMedia[];
  status: ProductStatusValue;
  category: string | null;
  tags: string[];
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreProductCreationAttributes
  extends Optional<
    StoreProductAttributes,
    | 'id'
    | 'description'
    | 'stock'
    | 'images'
    | 'status'
    | 'category'
    | 'tags'
    | 'isDeleted'
    | 'deletedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class StoreProduct extends Model<
  InferAttributes<StoreProduct>,
  InferCreationAttributes<StoreProduct>
> {
  declare id: CreationOptional<number>;
  declare storeId: number;
  declare name: string;
  declare description: string | null;
  declare price: number;
  declare currency: string;
  declare stock: CreationOptional<number>;
  declare images: CreationOptional<ProductMedia[]>;
  declare status: CreationOptional<ProductStatusValue>;
  declare category: string | null;
  declare tags: CreationOptional<string[]>;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

StoreProduct.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'store_id',
      references: { model: 'stores', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'name',
      validate: {
        notEmpty: { msg: 'Product name is required' },
        len: { args: [1, 200], msg: 'Product name must be between 1 and 200 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description',
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'price',
      validate: {
        min: { args: [0], msg: 'Price must be 0 or greater' },
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      field: 'currency',
      validate: {
        len: { args: [3, 3], msg: 'Currency must be a 3-letter code' },
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'stock',
      validate: {
        min: { args: [0], msg: 'Stock must be 0 or greater' },
      },
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'images',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ProductStatus)),
      allowNull: false,
      defaultValue: ProductStatus.ACTIVE,
      field: 'status',
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'category',
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'tags',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
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
    tableName: 'store_products',
    modelName: 'StoreProduct',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['store_id'], name: 'store_products_store_id_idx' },
      { fields: ['status'], name: 'store_products_status_idx' },
      { fields: ['category'], name: 'store_products_category_idx' },
      { fields: ['is_deleted'], name: 'store_products_is_deleted_idx' },
      { fields: ['price'], name: 'store_products_price_idx' },
      { fields: ['created_at'], name: 'store_products_created_at_idx' },
    ],
  }
);

export default StoreProduct;
