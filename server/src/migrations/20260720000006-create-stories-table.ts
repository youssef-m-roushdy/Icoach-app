import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('stories', {
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
    media: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    background_color: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      // Backs up the model's beforeValidate hook (which sets this to +24h at the
      // application level) with a DB-level default, so any insert that skips
      // Sequelize hooks — bulkCreate without individualHooks, seeders, raw SQL —
      // still gets a valid value instead of failing the NOT NULL constraint.
      defaultValue: Sequelize.literal("(NOW() + INTERVAL '24 hours')"),
    },
    view_count: {
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

  await queryInterface.addIndex('stories', ['user_id'], { name: 'stories_user_id_idx' });
  await queryInterface.addIndex('stories', ['expires_at'], { name: 'stories_expires_at_idx' });
  await queryInterface.addIndex('stories', ['is_deleted'], { name: 'stories_is_deleted_idx' });
  await queryInterface.addIndex('stories', ['user_id', 'expires_at'], {
    name: 'stories_user_expires_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('stories');
}