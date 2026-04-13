import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('chat_history', {
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
      onDelete: 'CASCADE',
    },
    session_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system', 'tool'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for better query performance
  await queryInterface.addIndex('chat_history', ['user_id'], {
    name: 'chat_history_user_id_idx',
  });
  
  await queryInterface.addIndex('chat_history', ['session_id'], {
    name: 'chat_history_session_id_idx',
  });
  
  await queryInterface.addIndex('chat_history', ['created_at'], {
    name: 'chat_history_created_at_idx',
  });
  
  await queryInterface.addIndex('chat_history', ['user_id', 'session_id'], {
    name: 'chat_history_user_session_idx',
  });
  
  await queryInterface.addIndex('chat_history', ['role'], {
    name: 'chat_history_role_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove indexes in reverse order
  await queryInterface.removeIndex('chat_history', 'chat_history_role_idx');
  await queryInterface.removeIndex('chat_history', 'chat_history_user_session_idx');
  await queryInterface.removeIndex('chat_history', 'chat_history_created_at_idx');
  await queryInterface.removeIndex('chat_history', 'chat_history_session_id_idx');
  await queryInterface.removeIndex('chat_history', 'chat_history_user_id_idx');
  
  // Drop the ENUM type
  await queryInterface.sequelize?.query('DROP TYPE IF EXISTS "enum_chat_history_role";');
  
  // Drop the table
  await queryInterface.dropTable('chat_history');
}