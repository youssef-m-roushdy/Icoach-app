'use strict';

import type { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  // Step 1: First, ensure no NULL values exist by setting them to 0 temporarily
  await queryInterface.sequelize.query(`
    UPDATE workout_session_sets 
    SET weight = 0 
    WHERE weight IS NULL
  `);

  // Step 2: Change weight column to allow NULL and set default to NULL
  await queryInterface.changeColumn('workout_session_sets', 'weight', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  });

  // Step 3: Now update any existing 0 weight values to NULL for consistency
  await queryInterface.sequelize.query(`
    UPDATE workout_session_sets 
    SET weight = NULL 
    WHERE weight = 0
  `);

  // Step 4: Add a comment to clarify the column's purpose (PostgreSQL only)
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN workout_session_sets.weight IS 'Weight in kg. NULL for bodyweight exercises'
    `);
  }

  // Step 5: Add an index for querying weighted sets
  await queryInterface.addIndex('workout_session_sets', ['session_id', 'weight'], {
    name: 'workout_session_sets_session_weight_idx',
  });

  console.log('✅ Migration completed: workout_session_sets.weight is now nullable with NULL default');
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  // Step 1: Remove the index first
  await queryInterface.removeIndex('workout_session_sets', 'workout_session_sets_session_weight_idx');

  // Step 2: Convert NULL values back to 0
  await queryInterface.sequelize.query(`
    UPDATE workout_session_sets 
    SET weight = 0 
    WHERE weight IS NULL
  `);

  // Step 3: Change weight column back to NOT NULL with default 0
  await queryInterface.changeColumn('workout_session_sets', 'weight', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // Step 4: Remove the column comment (PostgreSQL only)
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN workout_session_sets.weight IS NULL
    `);
  }

  console.log('✅ Rollback completed: workout_session_sets.weight reverted to NOT NULL with 0 default');
}