import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface PostLikeAttributes {
  id: number;
  postId: number;
  userId: number;
  createdAt: Date;
}

export interface PostLikeCreationAttributes
  extends Optional<PostLikeAttributes, 'id' | 'createdAt'> {}

class PostLike extends Model<
  InferAttributes<PostLike>,
  InferCreationAttributes<PostLike>
> {
  declare id: CreationOptional<number>;
  declare postId: number;
  declare userId: number;
  declare readonly createdAt: CreationOptional<Date>;
}

PostLike.init(
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'post_likes',
    modelName: 'PostLike',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['post_id'], name: 'post_likes_post_id_idx' },
      { fields: ['user_id'], name: 'post_likes_user_id_idx' },
      { fields: ['post_id', 'user_id'], unique: true, name: 'post_likes_unique_idx' },
      { fields: ['created_at'], name: 'post_likes_created_at_idx' },
    ],
  }
);

export default PostLike;
