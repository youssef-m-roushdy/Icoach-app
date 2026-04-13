'use strict';

import type { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Add medicalNotes column to users table
    await queryInterface.addColumn('users', 'medicalNotes', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: "Coach's quick notes about user injuries and medical conditions (Active Context Snapshot)",
    });

    // Add GIN index for JSONB queries on medicalNotes
    await queryInterface.addIndex('users', ['medicalNotes'], {
        name: 'users_medical_notes_gin_idx',
        using: 'gin',
    });
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Remove GIN index first
    await queryInterface.removeIndex('users', 'users_medical_notes_gin_idx');
    
    // Remove medicalNotes column
    await queryInterface.removeColumn('users', 'medicalNotes');
}