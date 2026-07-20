import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('friendships', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    requester_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    addressee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'blocked'),
      allowNull: false,
      defaultValue: 'pending',
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

  await queryInterface.addIndex('friendships', ['requester_id'], {
    name: 'friendships_requester_id_idx',
  });
  await queryInterface.addIndex('friendships', ['addressee_id'], {
    name: 'friendships_addressee_id_idx',
  });
  await queryInterface.addIndex('friendships', ['status'], {
    name: 'friendships_status_idx',
  });
  await queryInterface.addIndex('friendships', ['requester_id', 'addressee_id'], {
    unique: true,
    name: 'friendships_unique_pair_idx',
  });
  await queryInterface.addIndex('friendships', ['created_at'], {
    name: 'friendships_created_at_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('friendships');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_friendships_status";');
}