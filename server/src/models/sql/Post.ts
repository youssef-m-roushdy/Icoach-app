import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export const PostVisibility = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private',
} as const;

export type PostVisibilityValue = typeof PostVisibility[keyof typeof PostVisibility];

export interface PostMedia {
  url: string;
  publicId?: string;
  type?: 'image' | 'video';
  width?: number;
  height?: number;
}

export interface PostAttributes {
  id: number;
  userId: number;
  content: string | null;
  media: PostMedia[];
  visibility: PostVisibilityValue;
  location: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostCreationAttributes
  extends Optional<
    PostAttributes,
    | 'id'
    | 'content'
    | 'media'
    | 'visibility'
    | 'location'
    | 'likeCount'
    | 'commentCount'
    | 'shareCount'
    | 'isDeleted'
    | 'deletedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Post extends Model<
  InferAttributes<Post>,
  InferCreationAttributes<Post>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare content: string | null;
  declare media: CreationOptional<PostMedia[]>;
  declare visibility: CreationOptional<PostVisibilityValue>;
  declare location: string | null;
  declare likeCount: CreationOptional<number>;
  declare commentCount: CreationOptional<number>;
  declare shareCount: CreationOptional<number>;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

Post.init(
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
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'content',
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'media',
    },
    visibility: {
      type: DataTypes.ENUM(...Object.values(PostVisibility)),
      allowNull: false,
      defaultValue: PostVisibility.PUBLIC,
      field: 'visibility',
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'location',
    },
    likeCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'like_count',
    },
    commentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'comment_count',
    },
    shareCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'share_count',
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
    tableName: 'posts',
    modelName: 'Post',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'], name: 'posts_user_id_idx' },
      { fields: ['visibility'], name: 'posts_visibility_idx' },
      { fields: ['is_deleted'], name: 'posts_is_deleted_idx' },
      { fields: ['created_at'], name: 'posts_created_at_idx' },
      { fields: ['user_id', 'created_at'], name: 'posts_user_created_idx' },
    ],
  }
);

export default Post;
