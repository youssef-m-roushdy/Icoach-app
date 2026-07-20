import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface PostCommentAttributes {
  id: number;
  postId: number;
  userId: number;
  content: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostCommentCreationAttributes
  extends Optional<
    PostCommentAttributes,
    'id' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'
  > {}

class PostComment extends Model<
  InferAttributes<PostComment>,
  InferCreationAttributes<PostComment>
> {
  declare id: CreationOptional<number>;
  declare postId: number;
  declare userId: number;
  declare content: string;
  declare isDeleted: CreationOptional<boolean>;
  declare deletedAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

PostComment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'post_id',
      references: { model: 'posts', key: 'id' },
      onDelete: 'CASCADE',
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
      allowNull: false,
      field: 'content',
      validate: {
        notEmpty: { msg: 'Comment content cannot be empty' },
        len: { args: [1, 2000], msg: 'Comment must be between 1 and 2000 characters' },
      },
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
    tableName: 'post_comments',
    modelName: 'PostComment',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['post_id'], name: 'post_comments_post_id_idx' },
      { fields: ['user_id'], name: 'post_comments_user_id_idx' },
      { fields: ['is_deleted'], name: 'post_comments_is_deleted_idx' },
      { fields: ['created_at'], name: 'post_comments_created_at_idx' },
    ],
  }
);

export default PostComment;
