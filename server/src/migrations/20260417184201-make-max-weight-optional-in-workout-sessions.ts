'use strict';

import type { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  // Step 1: First, ensure no NULL values exist by setting them to 0 temporarily
  await queryInterface.sequelize.query(`
    UPDATE workout_sessions 
    SET max_weight = 0 
    WHERE max_weight IS NULL
  `);

  // Step 2: Change max_weight column to allow NULL and set default to NULL
  await queryInterface.changeColumn('workout_sessions', 'max_weight', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  });

  // Step 3: Now update any existing 0 max_weight values to NULL for consistency
  await queryInterface.sequelize.query(`
    UPDATE workout_sessions 
    SET max_weight = NULL 
    WHERE max_weight = 0
  `);

  // Step 4: Add a comment to clarify the column's purpose (PostgreSQL only)
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN workout_sessions.max_weight IS 'Maximum weight used in the session. NULL for bodyweight-only workouts'
    `);
  }

  // Step 5: Add an index for efficient querying of weighted sessions
  await queryInterface.addIndex('workout_sessions', ['max_weight'], {
    name: 'workout_sessions_max_weight_idx',
  });

  console.log('✅ Migration completed: workout_sessions.max_weight is now nullable with NULL default');
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  // Step 1: Remove the index first
  await queryInterface.removeIndex('workout_sessions', 'workout_sessions_max_weight_idx');

  // Step 2: Convert NULL values back to 0
  await queryInterface.sequelize.query(`
    UPDATE workout_sessions 
    SET max_weight = 0 
    WHERE max_weight IS NULL
  `);

  // Step 3: Change max_weight column back to NOT NULL with default 0
  await queryInterface.changeColumn('workout_sessions', 'max_weight', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // Step 4: Remove the column comment (PostgreSQL only)
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN workout_sessions.max_weight IS NULL
    `);
  }

  console.log('✅ Rollback completed: workout_sessions.max_weight reverted to NOT NULL with 0 default');
}