import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('expo_tokens', 'provider', {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'expo',
  });

  await queryInterface.addIndex('expo_tokens', ['provider'], {
    name: 'expo_tokens_provider_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('expo_tokens', 'expo_tokens_provider_idx');
  await queryInterface.removeColumn('expo_tokens', 'provider');
}
