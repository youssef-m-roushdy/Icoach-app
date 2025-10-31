import type { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes): Promise<void> {
  // Add authProvider column
  await queryInterface.addColumn('users', 'authProvider', {
    type: Sequelize.ENUM('regular', 'google'),
    allowNull: false,
    defaultValue: 'regular',
  });

  // Make password nullable for OAuth users
  await queryInterface.changeColumn('users', 'password', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes): Promise<void> {
  // Remove authProvider column
  await queryInterface.removeColumn('users', 'authProvider');

  // Make password required again
  await queryInterface.changeColumn('users', 'password', {
    type: Sequelize.STRING(255),
    allowNull: false,
  });
}
