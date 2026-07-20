import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('stores', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    cover: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
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

  await queryInterface.addIndex('stores', ['owner_id'], { name: 'stores_owner_id_idx' });
  await queryInterface.addIndex('stores', ['slug'], {
    unique: true,
    name: 'stores_slug_unique_idx',
  });
  await queryInterface.addIndex('stores', ['status'], { name: 'stores_status_idx' });
  await queryInterface.addIndex('stores', ['is_deleted'], { name: 'stores_is_deleted_idx' });
  await queryInterface.addIndex('stores', ['created_at'], { name: 'stores_created_at_idx' });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('stores');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stores_status";');
}