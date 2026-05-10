import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('expo_tokens', {
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
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    device_type: {
      type: DataTypes.STRING(50),
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

  // Adding indexes for faster lookup during notification dispatch
  await queryInterface.addIndex('expo_tokens', ['user_id'], {
    name: 'expo_tokens_user_id_idx',
  });

  await queryInterface.addIndex('expo_tokens', ['token'], {
    name: 'expo_tokens_token_unique_idx',
    unique: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('expo_tokens', 'expo_tokens_token_unique_idx');
  await queryInterface.removeIndex('expo_tokens', 'expo_tokens_user_id_idx');
  await queryInterface.dropTable('expo_tokens');
}