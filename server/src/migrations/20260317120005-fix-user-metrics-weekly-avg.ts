// server/src/db/migrations/20260317120005-fix-user-metrics-weekly-avg.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔄 Fixing UserMetrics weekly_avg column...');

  // Check if weeklyAvg column exists and rename it
  const tableInfo = await queryInterface.describeTable('user_metrics');
  
  if (tableInfo['weeklyAvg']) {
    await queryInterface.renameColumn('user_metrics', 'weeklyAvg', 'weekly_avg');
    console.log('✅ Renamed weeklyAvg → weekly_avg');
  }
  
  if (tableInfo['currentStreak']) {
    await queryInterface.renameColumn('user_metrics', 'currentStreak', 'current_streak');
    console.log('✅ Renamed currentStreak → current_streak');
  }
  
  if (tableInfo['longestStreak']) {
    await queryInterface.renameColumn('user_metrics', 'longestStreak', 'longest_streak');
    console.log('✅ Renamed longestStreak → longest_streak');
  }
  
  if (tableInfo['totalVolume']) {
    await queryInterface.renameColumn('user_metrics', 'totalVolume', 'total_volume');
    console.log('✅ Renamed totalVolume → total_volume');
  }
  
  if (tableInfo['badgeLevel']) {
    await queryInterface.renameColumn('user_metrics', 'badgeLevel', 'badge_level');
    console.log('✅ Renamed badgeLevel → badge_level');
  }
  
  if (tableInfo['createdAt']) {
    await queryInterface.renameColumn('user_metrics', 'createdAt', 'created_at');
    console.log('✅ Renamed createdAt → created_at');
  }
  
  if (tableInfo['updatedAt']) {
    await queryInterface.renameColumn('user_metrics', 'updatedAt', 'updated_at');
    console.log('✅ Renamed updatedAt → updated_at');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert if needed
  const tableInfo = await queryInterface.describeTable('user_metrics');
  
  if (tableInfo['weekly_avg']) {
    await queryInterface.renameColumn('user_metrics', 'weekly_avg', 'weeklyAvg');
  }
  // Add other reverts as needed
}