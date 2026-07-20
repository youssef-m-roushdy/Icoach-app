import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('post_likes', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'posts', key: 'id' },
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

  await queryInterface.addIndex('post_likes', ['post_id'], { name: 'post_likes_post_id_idx' });
  await queryInterface.addIndex('post_likes', ['user_id'], { name: 'post_likes_user_id_idx' });
  await queryInterface.addIndex('post_likes', ['post_id', 'user_id'], {
    unique: true,
    name: 'post_likes_unique_idx',
  });
  await queryInterface.addIndex('post_likes', ['created_at'], {
    name: 'post_likes_created_at_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('post_likes');
}