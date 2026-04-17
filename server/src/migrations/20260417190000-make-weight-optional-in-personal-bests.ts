'use strict';

import type { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  // Step 1: Update any existing 0 weight values to NULL for consistency
  await queryInterface.sequelize.query(`
    UPDATE personal_bests 
    SET weight = NULL 
    WHERE weight = 0
  `);

  // Step 2: Change weight column to allow NULL and set default to NULL
  await queryInterface.changeColumn('personal_bests', 'weight', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  });

  // Step 3: Add a comment to clarify the column's purpose (PostgreSQL only)
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN personal_bests.weight IS 'Weight in kg. NULL for bodyweight personal bests'
    `);
  }

  // Step 4: Add an index for querying weighted personal bests
  await queryInterface.addIndex('personal_bests', ['weight'], {
    name: 'personal_bests_weight_idx',
  });

  console.log('✅ Migration completed: personal_bests.weight is now nullable with NULL default');
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
  // Step 1: Remove the index first
  await queryInterface.removeIndex('personal_bests', 'personal_bests_weight_idx');

  // Step 2: Convert NULL values back to 0
  await queryInterface.sequelize.query(`
    UPDATE personal_bests 
    SET weight = 0 
    WHERE weight IS NULL
  `);

  // Step 3: Change weight column back to NOT NULL with default 0
  await queryInterface.changeColumn('personal_bests', 'weight', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // Step 4: Remove the column comment (PostgreSQL only)
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN personal_bests.weight IS NULL
    `);
  }

  console.log('✅ Rollback completed: personal_bests.weight reverted to NOT NULL with 0 default');
}