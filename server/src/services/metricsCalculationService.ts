import { WorkoutSession, PersonalBest, User, UserMetrics } from '../models/sql/index.js';
import { Op, Sequelize } from 'sequelize';

interface MetricsResult {
  fitnessScore: number;
  strength: number;
  endurance: number;
  consistency: number;
  volume: number;
  progress: number;
  habits: number;
  totalWorkouts: number;
  weeklyAvg: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
  points: number;
  badgeLevel: number;
}

export class MetricsCalculationService {
  
  /**
   * Calculate all metrics for a user
   */
  static async calculateAllMetrics(userId: number): Promise<MetricsResult> {
    const [
      totalWorkouts,
      weeklyWorkouts,
      totalVolume,
      personalBests,
      streaks,
      userData
    ] = await Promise.all([
      this.getTotalWorkouts(userId),
      this.getWeeklyWorkouts(userId),
      this.getTotalVolume(userId),
      this.getPersonalBests(userId),
      this.calculateStreaks(userId),
      User.findByPk(userId, {
        attributes: ['height', 'weight', 'activityLevel', 'fitnessGoal']
      })
    ]);

    const weeklyAvg = this.calculateWeeklyAverage(weeklyWorkouts);
    const userWeight = userData?.weight ? Number(userData.weight) : 70;
    const strength = await this.calculateStrengthScore(userId, userWeight);
    const endurance = await this.calculateEnduranceScore(userId);
    const consistency = this.calculateConsistencyScore(weeklyWorkouts, streaks.currentStreak);
    const volume = this.calculateVolumeScore(totalVolume);
    const progress = await this.calculateProgressScore(userId);
    const habits = this.calculateHabitsScore(userData);

    const fitnessScore = this.calculateFitnessScore({
      strength, endurance, consistency, volume, progress, habits
    });

    const points = this.calculatePoints(fitnessScore, totalWorkouts, personalBests.length);
    const badgeLevel = this.calculateBadgeLevel(points);

    return {
      fitnessScore,
      strength,
      endurance,
      consistency,
      volume,
      progress,
      habits,
      totalWorkouts,
      weeklyAvg,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      totalVolume,
      points,
      badgeLevel,
    };
  }

  /**
   * Get total workouts count
   */
  private static async getTotalWorkouts(userId: number): Promise<number> {
    return await WorkoutSession.count({
      where: { userId }
    });
  }

  /**
   * Get workouts from last 7 days
   */
  private static async getWeeklyWorkouts(userId: number): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await WorkoutSession.count({
      where: {
        userId,
        completedAt: { [Op.gte]: sevenDaysAgo }
      }
    });
  }

  /**
   * Get total volume lifted
   */
  private static async getTotalVolume(userId: number): Promise<number> {
    const result = await WorkoutSession.findAll({
      where: { userId },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('volume')), 'totalVolume']
      ],
      raw: true
    });

    const totalVolume = (result[0] as any)?.totalVolume;
    return totalVolume ? Number(totalVolume) : 0;
  }

  /**
   * Get personal bests
   */
  private static async getPersonalBests(userId: number): Promise<PersonalBest[]> {
    return await PersonalBest.findAll({
      where: { userId }
    });
  }

  /**
   * Calculate current and longest streaks
   */
  private static async calculateStreaks(userId: number): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    const sessions = await WorkoutSession.findAll({
      where: { userId },
      attributes: ['completedAt'],
      order: [['completedAt', 'DESC']],
    });

    if (!sessions || sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 1;
    let longestStreak = 1;
    let streak = 1;

    // Safe check for sessions length
    if (sessions.length > 1) {
      for (let i = 0; i < sessions.length - 1; i++) {
        const current = sessions[i]?.completedAt;
        const next = sessions[i + 1]?.completedAt;
        
        if (!current || !next) continue;
        
        const currentDate = new Date(current);
        const nextDate = new Date(next);
        
        // Reset hours to compare dates only
        currentDate.setHours(0, 0, 0, 0);
        nextDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak++;
          longestStreak = Math.max(longestStreak, streak);
        } else if (diffDays > 1) {
          streak = 1;
        }
      }
    }

    // Check if current streak is still active
    const lastWorkout = sessions[0]?.completedAt;
    if (lastWorkout) {
      const lastWorkoutDate = new Date(lastWorkout);
      const today = new Date();
      
      lastWorkoutDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const daysSinceLastWorkout = Math.floor((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
      
      currentStreak = daysSinceLastWorkout <= 1 ? streak : 0;
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Calculate weekly average
   */
  private static calculateWeeklyAverage(weeklyWorkouts: number): number {
    return Number((weeklyWorkouts / 7).toFixed(1));
  }

  /**
   * Calculate strength score (0-10)
   */
  private static async calculateStrengthScore(userId: number, bodyWeight: number): Promise<number> {
    const personalBests = await PersonalBest.findAll({
      where: { userId },
      order: [['weight', 'DESC']],
      limit: 5
    });

    if (!personalBests || personalBests.length === 0) return 0;

    let totalRatio = 0;
    for (const pb of personalBests) {
      const weight = Number(pb.weight);
      const ratio = weight / bodyWeight;
      totalRatio += Math.min(ratio * 2, 10);
    }

    return Number((totalRatio / personalBests.length).toFixed(1));
  }

  /**
   * Calculate endurance score (0-10)
   */
  private static async calculateEnduranceScore(userId: number): Promise<number> {
    const recentSessions = await WorkoutSession.findAll({
      where: { userId },
      order: [['completedAt', 'DESC']],
      limit: 10
    });

    if (!recentSessions || recentSessions.length === 0) return 0;

    let totalReps = 0;
    let totalSets = 0;
    
    for (const session of recentSessions) {
      totalReps += session.reps;
      totalSets += session.sets;
    }
    
    const avgReps = totalReps / recentSessions.length;
    const avgSets = totalSets / recentSessions.length;
    
    const endurance = (avgReps * avgSets) / 15;
    return Number(Math.min(endurance, 10).toFixed(1));
  }

  /**
   * Calculate consistency score (0-10)
   */
  private static calculateConsistencyScore(weeklyWorkouts: number, currentStreak: number): number {
    const consistency = (weeklyWorkouts / 5) * 5 + (currentStreak / 30) * 5;
    return Number(Math.min(consistency, 10).toFixed(1));
  }

  /**
   * Calculate volume score (0-10)
   */
  private static calculateVolumeScore(totalVolume: number): number {
    const volumeScore = (totalVolume / 100000) * 10;
    return Number(Math.min(volumeScore, 10).toFixed(1));
  }

  /**
   * Calculate progress score (0-10)
   */
  private static async calculateProgressScore(userId: number): Promise<number> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentSessions = await WorkoutSession.findAll({
      where: {
        userId,
        completedAt: { [Op.gte]: oneMonthAgo }
      },
      order: [['completedAt', 'ASC']]
    });

    if (!recentSessions || recentSessions.length < 2) return 5;

    const firstVolume = Number(recentSessions[0]?.volume || 0);
    const lastVolume = Number(recentSessions[recentSessions.length - 1]?.volume || 0);
    
    if (firstVolume === 0) return 5;
    
    const improvement = ((lastVolume - firstVolume) / firstVolume) * 10;
    return Number(Math.max(0, Math.min(improvement + 5, 10)).toFixed(1));
  }

  /**
   * Calculate habits score (0-10)
   */
  private static calculateHabitsScore(userData: any): number {
    if (!userData) return 0;

    let score = 5;

    if (userData.fitnessGoal) score += 1;
    if (userData.height && userData.weight) score += 2;
    
    const activityBonus: Record<string, number> = {
      'sedentary': 0,
      'lightly_active': 1,
      'moderately_active': 2,
      'very_active': 3
    };
    
    if (userData.activityLevel) {
      score += activityBonus[userData.activityLevel] || 0;
    }

    return Number(Math.min(score, 10).toFixed(1));
  }

  /**
   * Calculate overall fitness score (0-5000)
   */
  private static calculateFitnessScore(metrics: {
    strength: number;
    endurance: number;
    consistency: number;
    volume: number;
    progress: number;
    habits: number;
  }): number {
    const weights = {
      strength: 0.25,
      endurance: 0.20,
      consistency: 0.20,
      volume: 0.15,
      progress: 0.12,
      habits: 0.08,
    };

    const maxScore = 5000;
    let total = 0;
    
    total += (metrics.strength / 10) * weights.strength;
    total += (metrics.endurance / 10) * weights.endurance;
    total += (metrics.consistency / 10) * weights.consistency;
    total += (metrics.volume / 10) * weights.volume;
    total += (metrics.progress / 10) * weights.progress;
    total += (metrics.habits / 10) * weights.habits;

    return Math.round(total * maxScore);
  }

  /**
   * Calculate points based on activity
   */
  private static calculatePoints(
    fitnessScore: number,
    totalWorkouts: number,
    personalBestsCount: number
  ): number {
    return Math.round(
      fitnessScore * 0.6 +
      totalWorkouts * 10 +
      personalBestsCount * 50
    );
  }

  /**
   * Calculate badge level based on points
   */
  private static calculateBadgeLevel(points: number): number {
    if (points < 1000) return 1;
    if (points < 2500) return 2;
    if (points < 5000) return 3;
    if (points < 10000) return 4;
    return 5;
  }

  /**
   * Update user metrics (to be called after each workout)
   */
  static async updateUserMetrics(userId: number): Promise<void> {
    const metrics = await this.calculateAllMetrics(userId);
    
    const today = new Date().toISOString().split('T')[0]; // This is a string "YYYY-MM-DD"
    
    // We need to cast since the model declares date as Date but DB expects string
    await UserMetrics.upsert({
      userId,
      date: today as any, // Temporary cast - better to fix the model
      fitnessScore: metrics.fitnessScore,
      strength: metrics.strength,
      endurance: metrics.endurance,
      consistency: metrics.consistency,
      volume: metrics.volume,
      progress: metrics.progress,
      habits: metrics.habits,
      totalWorkouts: metrics.totalWorkouts,
      weeklyAvg: metrics.weeklyAvg,
      currentStreak: metrics.currentStreak,
      longestStreak: metrics.longestStreak,
      totalVolume: metrics.totalVolume,
      points: metrics.points,
      badgeLevel: metrics.badgeLevel
    });
  }
}