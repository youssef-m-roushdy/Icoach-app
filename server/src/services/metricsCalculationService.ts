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

    if (totalWorkouts === 0) {
      return {
        fitnessScore: 0, strength: 0, endurance: 0, consistency: 0,
        volume: 0, progress: 0, habits: 0, totalWorkouts: 0, weeklyAvg: 0,
        currentStreak: 0, longestStreak: 0, totalVolume: 0, points: 0, badgeLevel: 1,
      };
    }

    const weeklyAvg = await this.calculateWeeklyAverage(userId);
    const userWeight = userData?.weight ? Number(userData.weight) : 70;

    const strength    = await this.calculateStrengthScore(userId, userWeight);
    const endurance   = await this.calculateEnduranceScore(userId);
    const consistency = this.calculateConsistencyScore(weeklyWorkouts, streaks.currentStreak, weeklyAvg);
    const volume      = this.calculateVolumeScore(totalVolume);
    const progress    = await this.calculateProgressScore(userId);
    const habits      = await this.calculateHabitsScoreEMA(userId);

    const fitnessScore = this.calculateFitnessScore({ strength, endurance, consistency, volume, progress, habits });
    const points       = this.calculatePoints(fitnessScore, totalWorkouts, personalBests.length);
    const badgeLevel   = this.calculateBadgeLevel(points);

    return {
      fitnessScore, strength, endurance, consistency, volume, progress, habits,
      totalWorkouts, weeklyAvg, currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak, totalVolume, points, badgeLevel,
    };
  }

  // ---------------------------------------------------------------------------
  // Data fetchers
  // ---------------------------------------------------------------------------

  private static async getTotalWorkouts(userId: number): Promise<number> {
    return WorkoutSession.count({ where: { userId } });
  }

  private static async getWeeklyWorkouts(userId: number): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return WorkoutSession.count({
      where: { userId, completedAt: { [Op.gte]: sevenDaysAgo } }
    });
  }

  private static async getTotalVolume(userId: number): Promise<number> {
    const result = await WorkoutSession.findAll({
      where: { userId },
      attributes: [[Sequelize.fn('SUM', Sequelize.col('volume')), 'totalVolume']],
      raw: true
    });
    const v = (result[0] as any)?.totalVolume;
    return v ? Number(v) : 0;
  }

  private static async getPersonalBests(userId: number): Promise<PersonalBest[]> {
    return PersonalBest.findAll({ where: { userId } });
  }

  // ---------------------------------------------------------------------------
  // FIX #3 — Weekly average based on *active weeks*, not a flat /7
  // ---------------------------------------------------------------------------
  /**
   * Returns average workouts per week across all weeks since the user's first workout.
   * This prevents a brand-new user who did 2 sessions today from showing weeklyAvg=0.28
   * (which is meaningless) — instead they correctly show 2.0 for their first week.
   */
  private static async calculateWeeklyAverage(userId: number): Promise<number> {
    const firstSession = await WorkoutSession.findOne({
      where: { userId },
      order: [['completedAt', 'ASC']],
      attributes: ['completedAt'],
    });

    if (!firstSession?.completedAt) return 0;

    const totalWorkouts = await this.getTotalWorkouts(userId);
    const firstDate = new Date(firstSession.completedAt as Date);
    const now = new Date();

    // Number of full weeks since first workout (minimum 1 to avoid division by zero)
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.max(1, (now.getTime() - firstDate.getTime()) / msPerWeek);

    return Number((totalWorkouts / weeksSinceStart).toFixed(1));
  }

  // ---------------------------------------------------------------------------
  // Streak calculation (unchanged — this was correct)
  // ---------------------------------------------------------------------------
  private static async calculateStreaks(userId: number): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    const sessions = await WorkoutSession.findAll({
      where: { userId },
      attributes: ['completedAt'],
      order: [['completedAt', 'DESC']],
    });

    if (!sessions || sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let longestStreak = 1;
    let streak = 1;

    if (sessions.length > 1) {
      for (let i = 0; i < sessions.length - 1; i++) {
        const current = sessions[i]?.completedAt;
        const next    = sessions[i + 1]?.completedAt;
        if (!current || !next) continue;

        const a = new Date(current); a.setHours(0, 0, 0, 0);
        const b = new Date(next);    b.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((a.getTime() - b.getTime()) / 86_400_000);

        if (diffDays === 1) {
          streak++;
          longestStreak = Math.max(longestStreak, streak);
        } else if (diffDays > 1) {
          streak = 1;
        }
      }
    }

    const lastWorkout = sessions[0]?.completedAt;
    let currentStreak = 0;
    if (lastWorkout) {
      const last  = new Date(lastWorkout as Date); last.setHours(0, 0, 0, 0);
      const today = new Date();                    today.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
      currentStreak = daysSince <= 1 ? streak : 0;
    }

    return { currentStreak, longestStreak };
  }

  // ---------------------------------------------------------------------------
  // Strength score (unchanged — correct)
  // ---------------------------------------------------------------------------
  private static async calculateStrengthScore(userId: number, bodyWeight: number): Promise<number> {
    const pbs = await PersonalBest.findAll({
      where: { userId }, order: [['weight', 'DESC']], limit: 5
    });
    if (!pbs || pbs.length === 0) return 0;

    let totalRatio = 0;
    for (const pb of pbs) {
      totalRatio += Math.min((Number(pb.weight) / bodyWeight) * 2, 10);
    }
    return Number((totalRatio / pbs.length).toFixed(1));
  }

  // ---------------------------------------------------------------------------
  // Endurance score (unchanged — correct)
  // ---------------------------------------------------------------------------
  private static async calculateEnduranceScore(userId: number): Promise<number> {
    const sessions = await WorkoutSession.findAll({
      where: { userId }, order: [['completedAt', 'DESC']], limit: 10
    });
    if (!sessions || sessions.length === 0) return 0;

    let totalReps = 0, totalSets = 0;
    for (const s of sessions) { totalReps += s.reps; totalSets += s.sets; }

    const avgReps = totalReps / sessions.length;
    const avgSets = totalSets / sessions.length;
    return Number(Math.min((avgReps * avgSets) / 15, 10).toFixed(1));
  }

  // ---------------------------------------------------------------------------
  // FIX #4 — Consistency: penalise inactivity this week, require sustained effort
  // ---------------------------------------------------------------------------
  /**
   * Consistency score (0–10).
   *
   * Combines three signals:
   *  1. workoutsThisWeek  — are you active right now?       (weight 40%)
   *  2. weeklyAvg         — sustained habit over all time?  (weight 40%)
   *  3. currentStreak     — days-in-a-row bonus             (weight 20%)
   *
   * Target for a "perfect 10": 5 workouts/week, weeklyAvg ≥ 4, streak ≥ 14 days.
   * A user inactive for a week immediately gets a low score here because
   * workoutsThisWeek=0 contributes 0 to 40% of the total.
   */
  private static calculateConsistencyScore(
    workoutsThisWeek: number,
    currentStreak: number,
    weeklyAvg: number,
  ): number {
    const TARGET_WEEKLY   = 5;  // workouts/week considered "perfect"
    const TARGET_AVG      = 4;  // avg workouts/week for full avg score
    const TARGET_STREAK   = 14; // 2-week streak = full streak score

    const weeklyPart  = Math.min(workoutsThisWeek / TARGET_WEEKLY, 1) * 4;  // 0–4
    const avgPart     = Math.min(weeklyAvg / TARGET_AVG, 1) * 4;            // 0–4
    const streakPart  = Math.min(currentStreak / TARGET_STREAK, 1) * 2;     // 0–2

    return Number((weeklyPart + avgPart + streakPart).toFixed(1)); // 0–10
  }

  // ---------------------------------------------------------------------------
  // Volume score (unchanged — correct)
  // ---------------------------------------------------------------------------
  private static calculateVolumeScore(totalVolume: number): number {
    return Number(Math.min((totalVolume / 100_000) * 10, 10).toFixed(1));
  }

  // ---------------------------------------------------------------------------
  // FIX #1 & #2 — Progress score: no false +5 baseline, inactivity penalised
  // ---------------------------------------------------------------------------
  /**
   * Progress score (0–10).
   *
   * What went wrong before:
   *  - `improvement + 5` gave a 5/10 floor to everyone with ≥2 sessions,
   *    and any volume bump (even 1 extra rep) pushed it to 9+.
   *  - There was no penalty for doing nothing after those 2 sessions.
   *
   * New design:
   *  1. Require sessions spread across at least MIN_DAY_SPREAD different calendar
   *     days — two sessions in one day don't count as "progress over time".
   *  2. Map improvement onto 0–10 with NO artificial offset:
   *       0% change  → 5.0   (neutral — you maintained)
   *      +50% change → 10.0  (excellent)
   *      -50% change → 0.0   (regressing)
   *  3. Apply an inactivity penalty: for every day since your last workout
   *     beyond a 3-day grace period, subtract 0.5 (floored at 0).
   *     A week of inactivity = 4 extra days × 0.5 = −2 points.
   */
  private static async calculateProgressScore(userId: number): Promise<number> {
    const MIN_DAY_SPREAD = 3; // sessions must span at least 3 different days

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const sessions = await WorkoutSession.findAll({
      where: { userId, completedAt: { [Op.gte]: oneMonthAgo } },
      order: [['completedAt', 'ASC']],
      attributes: ['completedAt', 'volume'],
    });

    if (!sessions || sessions.length < 2) return 0;

    // Deduplicate by calendar day — keep highest volume per day
    const dayMap = new Map<string, number>();
    for (const s of sessions) {
      const day = new Date(s.completedAt as Date).toISOString().substring(0, 10);
      const vol = Number(s.volume || 0);
      dayMap.set(day, Math.max(dayMap.get(day) ?? 0, vol));
    }

    if (dayMap.size < MIN_DAY_SPREAD) return 0; // not enough distinct training days

    const days = [...dayMap.keys()].sort();
    const firstDayKey = days[0];
    const lastDayKey  = days[days.length - 1];

    // Both keys are guaranteed to exist since dayMap.size >= MIN_DAY_SPREAD
    const firstVol = dayMap.get(firstDayKey as string) ?? 0;
    const lastVol  = dayMap.get(lastDayKey  as string) ?? 0;

    if (firstVol === 0) return 0;

    // Map improvement % onto 0–10 centred at 5 for 0% change
    // ±50% improvement maps to ±5 points from the 5.0 midpoint
    const improvementPct = (lastVol - firstVol) / firstVol; // e.g. 0.10 = 10%
    const baseScore = Math.max(0, Math.min(5 + improvementPct * 10, 10));

    // Inactivity penalty: deduct 0.5 per day inactive beyond a 3-day grace period
    const lastSession = sessions[sessions.length - 1];
    if (!lastSession?.completedAt) return Number(baseScore.toFixed(1));
    const lastDate = new Date(lastSession.completedAt as Date);
    lastDate.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / 86_400_000);
    const GRACE_DAYS    = 3;
    const PENALTY_RATE  = 0.5; // per day beyond grace period
    const penalty = Math.max(0, (daysSinceLast - GRACE_DAYS) * PENALTY_RATE);

    return Number(Math.max(0, baseScore - penalty).toFixed(1));
  }

  // ---------------------------------------------------------------------------
  // Habits score — EMA (unchanged — this was already correct)
  // ---------------------------------------------------------------------------
  /**
   * Habits score (0–10) using Exponential Moving Average.
   * Based on the Loop Habit Tracker algorithm.
   * α=0.05 rise, β=0.03 decay — new users start near 0, can't spike instantly.
   */
  private static async calculateHabitsScoreEMA(userId: number): Promise<number> {
    const sessions = await WorkoutSession.findAll({
      where: { userId },
      attributes: ['completedAt'],
      order: [['completedAt', 'ASC']],
    });

    if (!sessions || sessions.length === 0) return 0;

    const workoutDays = new Set<string>();
    for (const s of sessions) {
      const d = s.completedAt as Date | null | undefined;
      if (d != null) workoutDays.add(new Date(d).toISOString().substring(0, 10));
    }
    if (workoutDays.size === 0) return 0;

    const ALPHA = 0.05;
    const BETA  = 0.03;

    const firstCompletedAt = (sessions.find(s => s.completedAt != null)?.completedAt) as Date | undefined;
    if (firstCompletedAt == null) return 0;

    const firstDate = new Date(firstCompletedAt); firstDate.setHours(0, 0, 0, 0);
    const today = new Date();                      today.setHours(0, 0, 0, 0);

    let score = 0;
    const cursor = new Date(firstDate);
    while (cursor <= today) {
      const dayKey = cursor.toISOString().substring(0, 10);
      score = workoutDays.has(dayKey)
        ? (1 - ALPHA) * score + ALPHA
        : (1 - BETA)  * score;
      cursor.setDate(cursor.getDate() + 1);
    }

    return Number((score * 10).toFixed(1));
  }

  // ---------------------------------------------------------------------------
  // Composite scores (unchanged)
  // ---------------------------------------------------------------------------

  private static calculateFitnessScore(metrics: {
    strength: number; endurance: number; consistency: number;
    volume: number; progress: number; habits: number;
  }): number {
    const weights = { strength: 0.25, endurance: 0.20, consistency: 0.20,
                      volume: 0.15, progress: 0.12, habits: 0.08 };
    const total =
      (metrics.strength    / 10) * weights.strength    +
      (metrics.endurance   / 10) * weights.endurance   +
      (metrics.consistency / 10) * weights.consistency +
      (metrics.volume      / 10) * weights.volume      +
      (metrics.progress    / 10) * weights.progress    +
      (metrics.habits      / 10) * weights.habits;
    return Math.round(total * 5000);
  }

  private static calculatePoints(fitnessScore: number, totalWorkouts: number, pbs: number): number {
    return Math.round(fitnessScore * 0.6 + totalWorkouts * 10 + pbs * 50);
  }

  private static calculateBadgeLevel(points: number): number {
    if (points < 1000)  return 1;
    if (points < 2500)  return 2;
    if (points < 5000)  return 3;
    if (points < 10000) return 4;
    return 5;
  }

  /**
   * Update user metrics in DB (call after each workout)
   */
  static async updateUserMetrics(userId: number): Promise<void> {
    const metrics = await this.calculateAllMetrics(userId);
    const today   = new Date().toISOString().substring(0, 10);
    await UserMetrics.upsert({
      userId, date: today as any,
      fitnessScore: metrics.fitnessScore,
      strength:     metrics.strength,
      endurance:    metrics.endurance,
      consistency:  metrics.consistency,
      volume:       metrics.volume,
      progress:     metrics.progress,
      habits:       metrics.habits,
      totalWorkouts: metrics.totalWorkouts,
      weeklyAvg:    metrics.weeklyAvg,
      currentStreak:  metrics.currentStreak,
      longestStreak:  metrics.longestStreak,
      totalVolume:  metrics.totalVolume,
      points:       metrics.points,
      badgeLevel:   metrics.badgeLevel,
    });
  }
}