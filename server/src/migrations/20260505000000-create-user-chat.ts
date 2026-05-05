import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('chat_conversations', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    is_group: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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

  await queryInterface.createTable('chat_participants', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'chat_conversations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
    role: {
      type: DataTypes.ENUM('member', 'admin'),
      allowNull: false,
      defaultValue: 'member',
    },
    last_read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    left_at: {
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

  await queryInterface.createTable('chat_messages', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'chat_conversations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    edited_at: {
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

  await queryInterface.addConstraint('chat_participants', {
    fields: ['conversation_id', 'user_id'],
    type: 'unique',
    name: 'chat_participants_conversation_user_unique',
  });

  await queryInterface.addIndex('chat_conversations', ['created_by'], {
    name: 'chat_conversations_created_by_idx',
  });

  await queryInterface.addIndex('chat_conversations', ['updated_at'], {
    name: 'chat_conversations_updated_at_idx',
  });

  await queryInterface.addIndex('chat_participants', ['conversation_id'], {
    name: 'chat_participants_conversation_id_idx',
  });

  await queryInterface.addIndex('chat_participants', ['user_id'], {
    name: 'chat_participants_user_id_idx',
  });

  await queryInterface.addIndex('chat_messages', ['conversation_id'], {
    name: 'chat_messages_conversation_id_idx',
  });

  await queryInterface.addIndex('chat_messages', ['sender_id'], {
    name: 'chat_messages_sender_id_idx',
  });

  await queryInterface.addIndex('chat_messages', ['created_at'], {
    name: 'chat_messages_created_at_idx',
  });

  await queryInterface.addIndex('chat_messages', ['conversation_id', 'created_at'], {
    name: 'chat_messages_conversation_created_at_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('chat_messages', 'chat_messages_conversation_created_at_idx');
  await queryInterface.removeIndex('chat_messages', 'chat_messages_created_at_idx');
  await queryInterface.removeIndex('chat_messages', 'chat_messages_sender_id_idx');
  await queryInterface.removeIndex('chat_messages', 'chat_messages_conversation_id_idx');
  await queryInterface.removeIndex('chat_participants', 'chat_participants_user_id_idx');
  await queryInterface.removeIndex('chat_participants', 'chat_participants_conversation_id_idx');
  await queryInterface.removeIndex('chat_conversations', 'chat_conversations_updated_at_idx');
  await queryInterface.removeIndex('chat_conversations', 'chat_conversations_created_by_idx');

  await queryInterface.dropTable('chat_messages');
  await queryInterface.dropTable('chat_participants');
  await queryInterface.dropTable('chat_conversations');

  await queryInterface.sequelize?.query('DROP TYPE IF EXISTS "enum_chat_participants_role";');
}
