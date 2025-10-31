'use strict';

import type { QueryInterface, DataTypes } from 'sequelize';
import { Sequelize as SequelizeInstance } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export async function up (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      firstName: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      avatar: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true,
      },
      height: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      weight: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      fitnessGoal: {
        type: Sequelize.ENUM('weight_loss', 'muscle_gain', 'maintenance'),
        allowNull: true,
      },
      activityLevel: {
        type: Sequelize.ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'),
        allowNull: true,
      },
      bodyFatPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      bmi: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      emailVerificationToken: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      passwordResetToken: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      passwordResetExpires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      role: {
        type: Sequelize.ENUM('user', 'coach', 'admin'),
        allowNull: false,
        defaultValue: 'user',
      },
      preferences: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      socialProfiles: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: SequelizeInstance.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: SequelizeInstance.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes for better performance
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_unique_idx',
    });

    await queryInterface.addIndex('users', ['username'], {
      unique: true,
      name: 'users_username_unique_idx',
    });

    await queryInterface.addIndex('users', ['role'], {
      name: 'users_role_idx',
    });

    await queryInterface.addIndex('users', ['isActive'], {
      name: 'users_is_active_idx',
    });

    await queryInterface.addIndex('users', ['createdAt'], {
      name: 'users_created_at_idx',
    });
}

export async function down (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Drop indexes first
    await queryInterface.removeIndex('users', 'users_created_at_idx');
    await queryInterface.removeIndex('users', 'users_is_active_idx');
    await queryInterface.removeIndex('users', 'users_role_idx');
    await queryInterface.removeIndex('users', 'users_username_unique_idx');
    await queryInterface.removeIndex('users', 'users_email_unique_idx');

    // Drop the users table
    await queryInterface.dropTable('users');
}
