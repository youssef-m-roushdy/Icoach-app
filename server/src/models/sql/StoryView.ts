import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export interface StoryViewAttributes {
  id: number;
  storyId: number;
  userId: number;
  createdAt: Date;
}

export interface StoryViewCreationAttributes
  extends Optional<StoryViewAttributes, 'id' | 'createdAt'> {}

class StoryView extends Model<
  InferAttributes<StoryView>,
  InferCreationAttributes<StoryView>
> {
  declare id: CreationOptional<number>;
  declare storyId: number;
  declare userId: number;
  declare readonly createdAt: CreationOptional<Date>;
}

StoryView.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    storyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'story_id',
      references: { model: 'stories', key: 'id' },
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
    tableName: 'story_views',
    modelName: 'StoryView',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['story_id'], name: 'story_views_story_id_idx' },
      { fields: ['user_id'], name: 'story_views_user_id_idx' },
      { fields: ['story_id', 'user_id'], unique: true, name: 'story_views_unique_idx' },
      { fields: ['created_at'], name: 'story_views_created_at_idx' },
    ],
  }
);

export default StoryView;
