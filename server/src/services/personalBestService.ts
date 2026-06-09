import { PersonalBest, WorkoutSession, WorkoutSessionSet, Workout } from '../models/sql/index.js';
import { Op } from 'sequelize';

export class PersonalBestService {

  /**
   * Called after any session write operation.
   * Checks all completed sets in the session and upserts PB if beaten.
   */
  static async checkAndUpsertPersonalBest(
    userId: number,
    sessionId: number,
    workoutId: number,
  ): Promise<{ isNewPB: boolean; pb: PersonalBest | null }> {
    
    // Get all completed sets from this session
    const sets = await WorkoutSessionSet.findAll({
      where: { sessionId, isCompleted: true },
    });

    if (!sets || sets.length === 0) return { isNewPB: false, pb: null };

    // Get workout name for exerciseName field
    const workout = await Workout.findByPk(workoutId, {
      attributes: ['name'],
    });

    // Find best set in this session
    // For weighted: highest weight (tie-break by reps)
    // For bodyweight: highest reps
    const weightedSets = sets.filter(s => s.weight !== null && Number(s.weight) > 0);
    const bodyweightSets = sets.filter(s => s.weight === null || Number(s.weight) === 0);

    let bestWeight: number | null = null;
    let bestWeightReps = 0;
    let bestBWReps = 0;

    if (weightedSets.length > 0) {
      const top = weightedSets.reduce((best, s) => {
        const w = Number(s.weight);
        if (w > Number(best.weight)) return s;
        if (w === Number(best.weight) && s.reps > best.reps) return s;
        return best;
      });
      bestWeight = Number(top.weight);
      bestWeightReps = top.reps;
    }

    if (bodyweightSets.length > 0) {
      bestBWReps = Math.max(...bodyweightSets.map(s => s.reps));
    }

    // Get existing PB for this user + workout
    const existing = await PersonalBest.findOne({
      where: { userId, workoutId },
    });

    let isNewPB = false;

    // Determine if this session beats the existing PB
    if (!existing) {
      isNewPB = true;
    } else if (existing.weight !== null) {
      // Existing PB is weighted — beat it with higher weight or same weight + more reps
      if (
        bestWeight !== null &&
        (
          bestWeight > Number(existing.weight) ||
          (bestWeight === Number(existing.weight) && bestWeightReps > existing.reps)
        )
      ) {
        isNewPB = true;
      }
    } else {
      // Existing PB is bodyweight — beat it with more reps
      if (bestBWReps > existing.reps) {
        isNewPB = true;
      }
    }

    if (!isNewPB) return { isNewPB: false, pb: existing };

    // Upsert the new PB
    const [pb] = await PersonalBest.upsert({
      userId,
      workoutId,
      exerciseName: workout?.name || 'Unknown Exercise',
      weight: bestWeight,               // null if bodyweight session
      reps: bestWeight ? bestWeightReps : bestBWReps,
      achievedAt: new Date(),
    });

    return { isNewPB: true, pb };
  }

  /**
   * Recalculate PB from scratch for a workout (used after session delete)
   */
  static async recalculatePersonalBest(
    userId: number,
    workoutId: number,
  ): Promise<void> {
    // Get all-time best set for this user + workout across all sessions
    const allSets = await WorkoutSessionSet.findAll({
      where: { isCompleted: true },
      include: [{
        model: WorkoutSession as any,
        as: 'session',
        where: { userId, workoutId },
        attributes: [],
      }],
    });

    if (!allSets || allSets.length === 0) {
      // No sessions left for this workout — delete the PB
      await PersonalBest.destroy({ where: { userId, workoutId } });
      return;
    }

    const workout = await Workout.findByPk(workoutId, { attributes: ['name'] });

    const weightedSets = allSets.filter(s => s.weight !== null && Number(s.weight) > 0);
    const bodyweightSets = allSets.filter(s => s.weight === null || Number(s.weight) === 0);

    let bestWeight: number | null = null;
    let bestReps = 0;

    if (weightedSets.length > 0) {
      const top = weightedSets.reduce((best, s) => {
        const w = Number(s.weight);
        if (w > Number(best.weight)) return s;
        if (w === Number(best.weight) && s.reps > best.reps) return s;
        return best;
      });
      bestWeight = Number(top.weight);
      bestReps = top.reps;
    } else if (bodyweightSets.length > 0) {
      bestReps = Math.max(...bodyweightSets.map(s => s.reps));
    }

    await PersonalBest.upsert({
      userId,
      workoutId,
      exerciseName: workout?.name || 'Unknown Exercise',
      weight: bestWeight,
      reps: bestReps,
      achievedAt: new Date(),
    });
  }
}