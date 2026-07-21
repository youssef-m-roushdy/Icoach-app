import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('user_subscriptions', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    subscriptionId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    planType: {
      type: DataTypes.ENUM('AppMonthly', 'AppYearly', 'CoachMonthly', 'CoachYearly'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Trialing', 'Active', 'Canceled', 'Expired', 'PastDue'),
      allowNull: false,
    },
    gateway: {
      type: DataTypes.ENUM('Stripe', 'Paymob', 'PayPal'),
      allowNull: false,
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    canceledAt: {
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

  await queryInterface.addIndex('user_subscriptions', ['subscriptionId'], {
    unique: true,
    name: 'user_subscriptions_subscription_id_unique_idx',
  });
  await queryInterface.addIndex('user_subscriptions', ['userId', 'status'], {
    name: 'user_subscriptions_user_id_status_idx',
  });
  await queryInterface.addIndex('user_subscriptions', ['coachId'], {
    name: 'user_subscriptions_coach_id_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('user_subscriptions');

  // Clean up the ENUM types Postgres creates automatically for Sequelize ENUM columns.
  // Without this, re-running the migration after a rollback fails with "type already exists".
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_subscriptions_planType";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_subscriptions_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_subscriptions_gateway";');
}