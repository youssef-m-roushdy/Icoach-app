import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔔 Creating notifications table...');

  await queryInterface.createTable('notifications', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
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

  // Add indexes for performance
  await queryInterface.addIndex('notifications', ['user_id', 'is_read', 'created_at'], {
    name: 'notifications_user_read_idx',
  });

  await queryInterface.addIndex('notifications', ['user_id', 'created_at'], {
    name: 'notifications_user_created_idx',
  });

  await queryInterface.addIndex('notifications', ['user_id', 'is_deleted', 'created_at'], {
    name: 'notifications_user_deleted_idx',
  });

  await queryInterface.addIndex('notifications', ['type'], {
    name: 'notifications_type_idx',
  });

  await queryInterface.addIndex('notifications', ['created_at'], {
    name: 'notifications_created_at_idx',
  });

  console.log('✅ Notifications table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping notifications table...');
  await queryInterface.dropTable('notifications');
  console.log('✅ Notifications table dropped');
}