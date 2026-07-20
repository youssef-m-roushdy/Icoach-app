import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface StoryMedia {
  url: string;
  publicId?: string;
  type?: 'image' | 'video';
  width?: number;
  height?: number;
}

export interface StoryAttributes {
  id: number;
  userId: number;
  media: StoryMedia;
  caption: string | null;
  backgroundColor: string | null;
  duration: number;
  expiresAt: Date;
  viewCount: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryCreationAttributes
  extends Optional<
    StoryAttributes,
    | 'id'
    | 'caption'
    | 'backgroundColor'
    | 'duration'
    | 'expiresAt'
    | 'viewCount'
    | 'isDeleted'
    | 'deletedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Story extends Model<
  InferAttributes<Story>,
  InferCreationAttributes<Story>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare media: StoryMedia;
  declare caption: string | null;
  declare backgroundColor: string | null;
  declare duration: CreationOptional<number>;
  declare expiresAt: CreationOptional<Date>;
  declare viewCount: CreationOptional<number>;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

const STORY_LIFETIME_HOURS = 24;

Story.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'media',
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'caption',
    },
    backgroundColor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'background_color',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      field: 'duration',
      validate: {
        min: { args: [1], msg: 'Duration must be at least 1 second' },
        max: { args: [60], msg: 'Duration cannot exceed 60 seconds' },
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'view_count',
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
    tableName: 'stories',
    modelName: 'Story',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'], name: 'stories_user_id_idx' },
      { fields: ['expires_at'], name: 'stories_expires_at_idx' },
      { fields: ['is_deleted'], name: 'stories_is_deleted_idx' },
      { fields: ['user_id', 'expires_at'], name: 'stories_user_expires_idx' },
    ],
    hooks: {
      beforeValidate: (story: Story) => {
        if (!story.expiresAt) {
          const expires = new Date();
          expires.setHours(expires.getHours() + STORY_LIFETIME_HOURS);
          story.expiresAt = expires;
        }
      },
    },
  }
);

export default Story;