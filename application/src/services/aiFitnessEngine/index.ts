/**
 * AI Fitness Engine - Main Entry Point
 * On-Device Exercise Analysis for React Native
 *
 * This is the TypeScript port of the Python AI Fitness Engine.
 * All processing happens on-device (no server required).
 *
 * Improvements:
 * - Stronger exercise-name normalization
 * - Uses SupportedExercises as the single source of truth
 * - Cleaner error handling
 * - Safe helper for non-throwing trainer lookup
 * - Better alignment with the updated types.ts
 */

import {
  SquatLogic,
  HighPlankLogic,
  ElbowPlankLogic,
  CrunchLogic,
  LegRaisesLogic,
  SupermanLogic,
  JumpingJacksLogic,

  // New / additional exercises
  LateralRaisesLogic,
  FrontRaisesLogic,
  OverheadPressLogic,
  HighKneesLogic,
  KneeTapLogic,
  PikePushupLogic,
  StaticSplitSquatLogic,
  ChairSquatLogic,
  GluteBridgeLogic,
  BirdDogLogic,
  ReverseLungeLogic,
  VUpsLogic,
  BentKneeDipLogic,
  ClassicPushUpLogic,
  KneePushUpLogic,
  StraightLegDipLogic,
  ToeTouchLogic,
  InchwormLogic,
  SideLyingLegRaiseLogic,
  KneeTucksLogic,
  DonkeyKickLogic,
} from './exercises';

import {
  ExerciseLogic,
  ExerciseName,
  SupportedExercises,
} from './types';

type TrainerConstructor = new () => ExerciseLogic;

/**
 * Single registry for all supported exercises.
 * This makes the engine easier to maintain and extend.
 */
const TRAINER_REGISTRY: Record<ExerciseName, TrainerConstructor> = {
  squat: SquatLogic,
  superman: SupermanLogic,
  leg_raises: LegRaisesLogic,
  high_plank: HighPlankLogic,
  elbow_plank: ElbowPlankLogic,
  crunch: CrunchLogic,
  jumping_jacks: JumpingJacksLogic,

  lateral_raises: LateralRaisesLogic,
  front_raises: FrontRaisesLogic,
  standing_overhead_press: OverheadPressLogic,

  high_knees: HighKneesLogic,
  knee_tap: KneeTapLogic,
  pike_pushup: PikePushupLogic,
  static_split_squat: StaticSplitSquatLogic,
  chair_squat: ChairSquatLogic,
  glute_bridge: GluteBridgeLogic,
  bird_dog: BirdDogLogic,
  reverse_lunge: ReverseLungeLogic,
  v_ups: VUpsLogic,

  bent_knee_dip: BentKneeDipLogic,
  classic_push_up: ClassicPushUpLogic,
  knee_push_up: KneePushUpLogic,
  straight_leg_dip: StraightLegDipLogic,
  toe_touch: ToeTouchLogic,
  inchworm: InchwormLogic,
  side_lying_leg_raise: SideLyingLegRaiseLogic,
  knee_tucks: KneeTucksLogic,
  donkey_kick: DonkeyKickLogic,
};

/**
 * Normalize exercise names so input like:
 * - "High Plank"
 * - " high_plank "
 * - "High   Plank"
 * - "high-plank"
 * all become:
 * - "high_plank"
 */
export function normalizeExerciseName(exerciseName: string): string {
  return exerciseName
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * AI Fitness Engine - Factory Class
 * Main entry point for creating exercise trainers.
 */
export class AIFitnessEngine {
  /**
   * Get logic instance for a specific exercise.
   *
   * @param exerciseName - Exercise name or ID (e.g. "squat", "high plank")
   * @returns A new exercise logic instance
   * @throws Error if the exercise is not supported
   */
  static getTrainer(exerciseName: string): ExerciseLogic {
    const normalized = normalizeExerciseName(exerciseName) as ExerciseName;
    const TrainerClass = TRAINER_REGISTRY[normalized];

    if (!TrainerClass) {
      const available = this.getSupportedExercises().join(', ');
      throw new Error(
        `Exercise '${exerciseName}' is not supported. Normalized name: '${normalized}'. Supported exercises: ${available}`
      );
    }

    return new TrainerClass();
  }

  /**
   * Try to get a trainer without throwing.
   *
   * @param exerciseName - Exercise name or ID
   * @returns A new exercise logic instance, or null if not supported
   */
  static tryGetTrainer(exerciseName: string): ExerciseLogic | null {
    const normalized = normalizeExerciseName(exerciseName) as ExerciseName;
    const TrainerClass = TRAINER_REGISTRY[normalized];
    return TrainerClass ? new TrainerClass() : null;
  }

  /**
   * Get all supported exercise names.
   *
   * @returns Array of supported exercise names
   */
  static getSupportedExercises(): ExerciseName[] {
    return [...SupportedExercises];
  }

  /**
   * Check if an exercise is supported.
   *
   * @param exerciseName - Exercise name to check
   * @returns true if supported, false otherwise
   */
  static isExerciseSupported(exerciseName: string): boolean {
    const normalized = normalizeExerciseName(exerciseName) as ExerciseName;
    return normalized in TRAINER_REGISTRY;
  }
}

// Re-export types and helpers for convenience
export * from './types';
export * from './utils';
export * from './feedbackMapping';
export * from './voiceFeedback';

// Re-export exercise logic classes explicitly to avoid export name collisions
export {
  SquatLogic,
  HighPlankLogic,
  ElbowPlankLogic,
  CrunchLogic,
  LegRaisesLogic,
  SupermanLogic,
  JumpingJacksLogic,
  LateralRaisesLogic,
  FrontRaisesLogic,
  OverheadPressLogic,
  HighKneesLogic,
  KneeTapLogic,
  PikePushupLogic,
  StaticSplitSquatLogic,
  ChairSquatLogic,
  GluteBridgeLogic,
  BirdDogLogic,
  ReverseLungeLogic,
  VUpsLogic,
  BentKneeDipLogic,
  ClassicPushUpLogic,
  KneePushUpLogic,
  StraightLegDipLogic,
  ToeTouchLogic,
  InchwormLogic,
  SideLyingLegRaiseLogic,
  KneeTucksLogic,
  DonkeyKickLogic,
} from './exercises';