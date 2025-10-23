'use strict';

import { QueryInterface, DataTypes, QueryTypes } from 'sequelize';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Hash the password for the admin user
    const hashedPassword = await bcrypt.hash('Admin@123!', 12);
    
    // Check if admin user already exists
    const existingAdmin = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email OR username = :username',
      {
        replacements: { 
          email: 'admin@icoach.com', 
          username: 'admin' 
        },
        type: QueryTypes.SELECT
      }
    );

    // Only create admin user if it doesn't exist
    if (existingAdmin.length === 0) {
      await queryInterface.bulkInsert('users', [{
        email: 'admin@icoach.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        avatar: null,
        bio: 'System Administrator',
        dateOfBirth: null,
        phone: null,
        gender: null,
        height: null,
        weight: null,
        fitnessGoal: null,
        activityLevel: null,
        bodyFatPercentage: null,
        bmi: null,
        isActive: true,
        isEmailVerified: true,
        emailVerificationToken: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        lastLogin: null,
        role: 'admin',
        preferences: JSON.stringify({}),
        socialProfiles: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});

      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@icoach.com');
      console.log('🔑 Password: Admin@123!');
      console.log('👤 Username: admin');
      console.log('🛡️  Role: admin');
    } else {
      console.log('ℹ️  Admin user already exists, skipping creation.');
    }
  },

  async down (queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    // Remove the admin user
    await queryInterface.bulkDelete('users', {
      email: 'admin@icoach.com'
    }, {});
    
    console.log('🗑️  Admin user removed successfully!');
  }
};
