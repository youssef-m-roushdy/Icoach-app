import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('user_injuries', {
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
      onDelete: 'CASCADE',
    },
    injuryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'injuries',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Index عشان تجيب إصابات اليوزر بسرعة
  await queryInterface.addIndex('user_injuries', ['userId', 'injuryId']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('user_injuries', ['userId', 'injuryId']);
  await queryInterface.dropTable('user_injuries');
}