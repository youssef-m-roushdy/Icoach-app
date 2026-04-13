'use strict';

import type { QueryInterface, DataTypes } from 'sequelize';
import { Sequelize as SequelizeInstance } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export async function up (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Step 1: Add session_id column to chat_history table
    await queryInterface.addColumn('chat_history', 'session_id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
    });

    // Step 2: Update the role enum type to include 'tool' (for PostgreSQL)
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_chat_history_role" ADD VALUE IF NOT EXISTS 'tool'
    `);

    // Step 3: Add index on session_id for better query performance
    await queryInterface.addIndex('chat_history', ['session_id'], {
      name: 'chat_history_session_id_idx',
    });

    // Step 4: Add composite index for userId and session_id (common query pattern)
    await queryInterface.addIndex('chat_history', ['userId', 'session_id'], {
      name: 'chat_history_user_session_idx',
    });
}

export async function down (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Step 1: Remove indexes
    await queryInterface.removeIndex('chat_history', 'chat_history_user_session_idx');
    await queryInterface.removeIndex('chat_history', 'chat_history_session_id_idx');

    // Step 2: Remove session_id column
    await queryInterface.removeColumn('chat_history', 'session_id');

    // Step 3: Revert enum change - remove 'tool' from enum (PostgreSQL only)
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_chat_history_role_new" AS ENUM ('user', 'assistant', 'system');
      
      ALTER TABLE "chat_history" 
      ALTER COLUMN "role" TYPE "enum_chat_history_role_new" 
      USING ("role"::text::"enum_chat_history_role_new");
      
      DROP TYPE "enum_chat_history_role";
      
      ALTER TYPE "enum_chat_history_role_new" RENAME TO "enum_chat_history_role";
    `);
}