import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('story_views', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    story_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'stories', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('story_views', ['story_id'], {
    name: 'story_views_story_id_idx',
  });
  await queryInterface.addIndex('story_views', ['user_id'], {
    name: 'story_views_user_id_idx',
  });
  await queryInterface.addIndex('story_views', ['story_id', 'user_id'], {
    unique: true,
    name: 'story_views_unique_idx',
  });
  await queryInterface.addIndex('story_views', ['created_at'], {
    name: 'story_views_created_at_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('story_views');
}