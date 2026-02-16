import type { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Update activityLevel ENUM
 * 
 * This migration updates the activityLevel ENUM to remove 'extra_active' value
 * to match the application's input options:
 * - sedentary
 * - lightly_active
 * - moderately_active
 * - very_active
 * 
 * Note: fitnessGoal ENUM already has the correct values (weight_loss, muscle_gain, maintenance)
 */
export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes): Promise<void> {
  // For PostgreSQL: Update the ENUM type for activityLevel
  // First, update any existing 'extra_active' values to 'very_active' (closest equivalent)
  await queryInterface.sequelize.query(`
    UPDATE users 
    SET "activityLevel" = 'very_active' 
    WHERE "activityLevel" = 'extra_active'
  `);

  // PostgreSQL requires recreating the ENUM type
  // Step 1: Create a new ENUM type
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_users_activityLevel_new" AS ENUM (
      'sedentary', 
      'lightly_active', 
      'moderately_active', 
      'very_active'
    )
  `);

  // Step 2: Change the column to use the new ENUM type
  await queryInterface.sequelize.query(`
    ALTER TABLE users 
    ALTER COLUMN "activityLevel" TYPE "enum_users_activityLevel_new" 
    USING "activityLevel"::text::"enum_users_activityLevel_new"
  `);

  // Step 3: Drop the old ENUM type
  await queryInterface.sequelize.query(`
    DROP TYPE IF EXISTS "enum_users_activityLevel"
  `);

  // Step 4: Rename the new ENUM type to the original name
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_users_activityLevel_new" RENAME TO "enum_users_activityLevel"
  `);
}

export async function down(queryInterface: QueryInterface, Sequelize: typeof DataTypes): Promise<void> {
  // Revert: Add back 'extra_active' to the ENUM
  
  // Step 1: Create the old ENUM type with extra_active
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_users_activityLevel_old" AS ENUM (
      'sedentary', 
      'lightly_active', 
      'moderately_active', 
      'very_active',
      'extra_active'
    )
  `);

  // Step 2: Change the column to use the old ENUM type
  await queryInterface.sequelize.query(`
    ALTER TABLE users 
    ALTER COLUMN "activityLevel" TYPE "enum_users_activityLevel_old" 
    USING "activityLevel"::text::"enum_users_activityLevel_old"
  `);

  // Step 3: Drop the current ENUM type
  await queryInterface.sequelize.query(`
    DROP TYPE IF EXISTS "enum_users_activityLevel"
  `);

  // Step 4: Rename the old ENUM type to the original name
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_users_activityLevel_old" RENAME TO "enum_users_activityLevel"
  `);
}
