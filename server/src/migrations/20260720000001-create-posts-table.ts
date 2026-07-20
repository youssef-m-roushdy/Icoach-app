import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('posts', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    visibility: {
      type: DataTypes.ENUM('public', 'friends', 'private'),
      allowNull: false,
      defaultValue: 'public',
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    like_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    comment_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    share_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('posts', ['user_id'], { name: 'posts_user_id_idx' });
  await queryInterface.addIndex('posts', ['visibility'], { name: 'posts_visibility_idx' });
  await queryInterface.addIndex('posts', ['is_deleted'], { name: 'posts_is_deleted_idx' });
  await queryInterface.addIndex('posts', ['created_at'], { name: 'posts_created_at_idx' });
  await queryInterface.addIndex('posts', ['user_id', 'created_at'], {
    name: 'posts_user_created_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('posts');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_posts_visibility";');
}