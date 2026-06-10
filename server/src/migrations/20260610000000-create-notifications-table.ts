import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔔 Creating notifications table...');

  await queryInterface.createTable('notifications', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
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
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for performance
  await queryInterface.addIndex('notifications', ['userId', 'isRead', 'createdAt'], {
    name: 'notifications_user_read_idx',
  });

  await queryInterface.addIndex('notifications', ['userId', 'createdAt'], {
    name: 'notifications_user_created_idx',
  });

  await queryInterface.addIndex('notifications', ['userId', 'isDeleted', 'createdAt'], {
    name: 'notifications_user_deleted_idx',
  });

  await queryInterface.addIndex('notifications', ['type'], {
    name: 'notifications_type_idx',
  });

  await queryInterface.addIndex('notifications', ['createdAt'], {
    name: 'notifications_created_at_idx',
  });

  console.log('✅ Notifications table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping notifications table...');
  await queryInterface.dropTable('notifications');
  console.log('✅ Notifications table dropped');
}