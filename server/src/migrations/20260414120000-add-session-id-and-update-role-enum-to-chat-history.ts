'use strict';

import type { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Check if session_id column exists before adding it
    const tableDescription = await queryInterface.describeTable('chat_history');
    
    // Step 1: Add session_id column only if it doesn't exist
    if (!tableDescription.session_id) {
        await queryInterface.addColumn('chat_history', 'session_id', {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            allowNull: false,
        });
        console.log('Added session_id column');
    } else {
        console.log('session_id column already exists, skipping...');
    }

    // Step 2: Update the role enum type to include 'tool' (for PostgreSQL)
    try {
        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_chat_history_role" ADD VALUE IF NOT EXISTS 'tool'
        `);
        console.log('Added "tool" to role enum');
    } catch (error) {
        const err = error as Error;
        console.log('Role enum update skipped (might already exist or not applicable):', err.message);
    }

    // Step 3: Add index on session_id if it doesn't exist
    try {
        await queryInterface.addIndex('chat_history', ['session_id'], {
            name: 'chat_history_session_id_idx',
        });
        console.log('Added session_id index');
    } catch (error) {
        const err = error as Error;
        console.log('Session_id index might already exist:', err.message);
    }

    // Step 4: Add composite index for userId and session_id if it doesn't exist
    try {
        await queryInterface.addIndex('chat_history', ['user_id', 'session_id'], {
            name: 'chat_history_user_session_idx',
        });
        console.log('Added composite index user_id + session_id');
    } catch (error) {
        const err = error as Error;
        console.log('Composite index might already exist:', err.message);
    }

    // Step 5: If id is still UUID, consider migrating to INTEGER (optional - create new migration)
    if (tableDescription.id && tableDescription.id.type === 'UUID') {
        console.warn('⚠️  Warning: id column is still UUID type. Consider creating a separate migration to convert to INTEGER with auto-increment.');
    }
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Step 1: Remove indexes if they exist
    try {
        await queryInterface.removeIndex('chat_history', 'chat_history_user_session_idx');
        console.log('Removed composite index');
    } catch (error) {
        const err = error as Error;
        console.log('Composite index not found, skipping...', err.message);
    }

    try {
        await queryInterface.removeIndex('chat_history', 'chat_history_session_id_idx');
        console.log('Removed session_id index');
    } catch (error) {
        const err = error as Error;
        console.log('Session_id index not found, skipping...', err.message);
    }

    // Step 2: Remove session_id column if it exists
    const tableDescription = await queryInterface.describeTable('chat_history');
    if (tableDescription.session_id) {
        await queryInterface.removeColumn('chat_history', 'session_id');
        console.log('Removed session_id column');
    }

    // Step 3: Revert enum change - remove 'tool' from enum (PostgreSQL only)
    try {
        await queryInterface.sequelize.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_chat_history_role') THEN
                    CREATE TYPE "enum_chat_history_role_new" AS ENUM ('user', 'assistant', 'system');
                    
                    ALTER TABLE "chat_history" 
                    ALTER COLUMN "role" TYPE "enum_chat_history_role_new" 
                    USING ("role"::text::"enum_chat_history_role_new");
                    
                    DROP TYPE "enum_chat_history_role";
                    
                    ALTER TYPE "enum_chat_history_role_new" RENAME TO "enum_chat_history_role";
                END IF;
            END $$;
        `);
        console.log('Removed "tool" from role enum');
    } catch (error) {
        const err = error as Error;
        console.log('Role enum reversion skipped:', err.message);
    }
}