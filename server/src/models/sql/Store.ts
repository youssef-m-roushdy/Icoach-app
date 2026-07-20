import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export const StoreStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export type StoreStatusValue = typeof StoreStatus[keyof typeof StoreStatus];

export interface StoreAttributes {
  id: number;
  ownerId: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  cover: string | null;
  status: StoreStatusValue;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreCreationAttributes
  extends Optional<
    StoreAttributes,
    | 'id'
    | 'description'
    | 'logo'
    | 'cover'
    | 'status'
    | 'contactEmail'
    | 'contactPhone'
    | 'website'
    | 'address'
    | 'isDeleted'
    | 'deletedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Store extends Model<
  InferAttributes<Store>,
  InferCreationAttributes<Store>
> {
  declare id: CreationOptional<number>;
  declare ownerId: number;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare logo: string | null;
  declare cover: string | null;
  declare status: CreationOptional<StoreStatusValue>;
  declare contactEmail: string | null;
  declare contactPhone: string | null;
  declare website: string | null;
  declare address: string | null;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

Store.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'owner_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'name',
      validate: {
        notEmpty: { msg: 'Store name is required' },
        len: { args: [2, 150], msg: 'Store name must be between 2 and 150 characters' },
      },
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      field: 'slug',
      validate: {
        is: {
          args: /^[a-z0-9-]+$/,
          msg: 'Slug can only contain lowercase letters, numbers, and hyphens',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description',
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'logo',
    },
    cover: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'cover',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(StoreStatus)),
      allowNull: false,
      defaultValue: StoreStatus.ACTIVE,
      field: 'status',
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'contact_email',
      validate: { isEmail: { msg: 'Contact email must be valid' } },
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'contact_phone',
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'website',
      validate: { isUrl: { msg: 'Website must be a valid URL' } },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'address',
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
    tableName: 'stores',
    modelName: 'Store',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['owner_id'], name: 'stores_owner_id_idx' },
      { fields: ['slug'], unique: true, name: 'stores_slug_unique_idx' },
      { fields: ['status'], name: 'stores_status_idx' },
      { fields: ['is_deleted'], name: 'stores_is_deleted_idx' },
      { fields: ['created_at'], name: 'stores_created_at_idx' },
    ],
  }
);

export default Store;
