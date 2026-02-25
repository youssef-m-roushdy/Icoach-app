/**
 * AI Fitness Engine - Main Entry Point
 * On-Device Exercise Analysis for React Native
 *
 * This is the TypeScript port of the Python AI Fitness Engine.
 * All processing happens on-device (no server required).
 */

import {
  SquatLogic,
  HighPlankLogic,
  ElbowPlankLogic,
  CrunchLogic,
  LegRaisesLogic,
  SupermanLogic,
  JumpingJacksLogic,
  // New Exercises
  LateralRaisesLogic,
  FrontRaisesLogic,
  OverheadPressLogic, 
  /////////////////////////
  HighKneesLogic,
  KneeTapLogic,
  PikePushupLogic,
  StaticSplitSquatLogic,
  ChairSquatLogic,
  GluteBridgeLogic,
  BirdDogLogic,
  ReverseLungeLogic,
  VUpsLogic,
  /////////////////////////

  BentKneeDipLogic,
  ClassicPushUpLogic,
  KneePushUpLogic,
  StraightLegDipLogic,
  ToeTouchLogic,
  InchwormLogic,
  SideLyingLegRaiseLogic,
  KneeTucksLogic,
  DonkeyKickLogic

} from './exercises';

import { ExerciseLogic, ExerciseName } from './types';

/**
 * AI Fitness Engine - Factory Class
 * The main entry point for developers to create exercise trainers.
 */
export class AIFitnessEngine {
  /**
   * Returns the logic instance for a specific exercise.
   *
   * @param exerciseName - The ID/Name of the exercise (e.g., 'squat', 'crunch')
   * @returns The logic class instance for that exercise
   * @throws Error if the exercise name is not supported
   */
  static getTrainer(exerciseName: string): ExerciseLogic {
    // Normalize the input (lowercase and trim)
    const key = exerciseName.toLowerCase().trim() as ExerciseName;

    switch (key) {
      // --- ORIGINAL EXERCISES ---
      case 'squat':
        return new SquatLogic();

      case 'superman':
        return new SupermanLogic();

      case 'leg_raises':
        return new LegRaisesLogic();

      case 'high_plank':
        return new HighPlankLogic();

      case 'elbow_plank':
        return new ElbowPlankLogic();

      case 'crunch':
        return new CrunchLogic();

      case 'jumping_jacks':
        return new JumpingJacksLogic();

      // --- NEW EXERCISES ---
      case 'lateral_raises':
        return new LateralRaisesLogic();

      case 'front_raises':
        return new FrontRaisesLogic();

      case 'standing_overhead_press':
        return new OverheadPressLogic();
      // --- ADDITIONAL EXERCISES ---

        // ...
      case 'high_knees': 
        return new HighKneesLogic();

      case 'knee_tap':
        return new KneeTapLogic();

      case 'pike_pushup':
        return new PikePushupLogic();

      case 'static_split_squat':
        return new StaticSplitSquatLogic();

      case 'chair_squat':
        return new ChairSquatLogic();

      case 'glute_bridge':
        return new GluteBridgeLogic();

      case 'bird_dog':
        return new BirdDogLogic();

      case 'reverse_lunge':
        return new ReverseLungeLogic();
      
      case 'v_ups':
        return new VUpsLogic();

      
      case 'bent_knee_dip':
        return new BentKneeDipLogic();
      
      case 'knee_push_up':
        return new KneePushUpLogic();

      case 'classic_push_up':
        return new ClassicPushUpLogic();

      case 'straight_leg_dip':
        return new StraightLegDipLogic();

      case 'toe_touch':
        return new ToeTouchLogic();

      case 'inchworm':
        return new InchwormLogic();

      case 'side_lying_leg_raise':
        return new SideLyingLegRaiseLogic();

      case 'knee_tucks':
        return new KneeTucksLogic();

      case 'donkey_kick':
        return new DonkeyKickLogic();



      default:
        throw new Error(
          `⚠️ Exercise '${exerciseName}' is not supported yet. ` +
            `Available: squat, superman, leg_raises, high_plank, elbow_plank, crunch, jumping_jacks, lateral_raises, front_raises, standing_overhead_press`
        );
    }
  }

  /**
   * Get list of all supported exercises
   *
   * @returns Array of supported exercise names
   */
  static getSupportedExercises(): ExerciseName[] {
    return [
      'squat',
      'superman',
      'leg_raises',
      'high_plank',
      'elbow_plank',
      'crunch',
      'jumping_jacks',
      // New additions
      'lateral_raises',
      'front_raises',
      'standing_overhead_press',
      'high_knees',
      'knee_tap',
      'pike_pushup',
      'static_split_squat',
      'chair_squat',
      'glute_bridge',
      'bird_dog',
      'reverse_lunge',
      'v_ups',
      'bent_knee_dip',
      'knee_push_up',
      'classic_push_up',
      'straight_leg_dip',
      'toe_touch',
      'inchworm',
      'side_lying_leg_raise',
      'knee_tucks',
      'donkey_kick',
    ];
  }

  /**
   * Check if an exercise is supported
   *
   * @param exerciseName - The exercise name to check
   * @returns true if supported, false otherwise
   */
  static isExerciseSupported(exerciseName: string): boolean {
    const key = exerciseName.toLowerCase().trim();
    return this.getSupportedExercises().includes(key as ExerciseName);
  }
}

// Re-export types and utils for convenience
export * from './types';
export * from './utils';
export * from './exercises';
export * from './feedbackMapping';
export * from './voiceFeedback';