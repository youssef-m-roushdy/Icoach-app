/**
 * AI Fitness Engine - Type Definitions
 * On-Device Exercise Analysis Engine
 *
 * Improvements:
 * - Better scalability for supported exercise names
 * - Shared feedback/result metadata
 * - Backward compatible with existing exercise logic
 * - Ready for richer UI / analytics / debugging
 */

// =====================================================
// 1) Core Landmark Type
// =====================================================

/**
 * MediaPipe Pose Landmark structure
 */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Optional frame-level analysis context.
 * This keeps the API backward compatible because `analyze(landmarks)`
 * still works, while allowing richer context in the future.
 */
export interface ExerciseAnalysisContext {
  timestamp_ms?: number;
  frame_width?: number;
  frame_height?: number;
  is_mirrored?: boolean;
  camera_facing?: 'front' | 'back' | 'unknown';
  debug?: boolean;
}

// =====================================================
// 2) Supported Exercise Names
// =====================================================

/**
 * Central source of truth for all supported exercise names.
 * Easier to maintain than a long manual union.
 */
export const SupportedExercises = [
  'squat',
  'superman',
  'leg_raises',
  'high_plank',
  'elbow_plank',
  'crunch',
  'jumping_jacks',
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
  'straight_leg_dip',
  'classic_push_up',
  'knee_push_up',
  'toe_touch',
  'inchworm',
  'side_lying_leg_raise',
  'knee_tucks',
  'donkey_kick',
] as const;

export type ExerciseName = (typeof SupportedExercises)[number];

// =====================================================
// 3) Shared Feedback / Result Metadata
// =====================================================

export type FeedbackSeverity = 'info' | 'warning' | 'success' | 'critical';

/**
 * Preferred quality model for new logic files.
 * Keep `is_correct` as optional backward-compatible field.
 */
export type ExerciseQuality =
  | 'unknown'
  | 'setup'
  | 'correct'
  | 'warning'
  | 'invalid';

export type ActiveSide = 'LEFT' | 'RIGHT' | 'NONE';
export type ExerciseStage = string | null;

// =====================================================
// 4) Feedback Codes
// =====================================================

/**
 * Static feedback codes used by UI + voice mapping.
 * Dynamic codes like COUNT_1 and SETUP_HOLD_3 are typed below.
 */
export const FeedbackCodes = {
  // -------------------------------------------------
  // General / System
  // -------------------------------------------------
  SYSTEM_READY_GO: 'SYSTEM_READY_GO',
  START_POSITION: 'START_POSITION',
  START_MOVING: 'START_MOVING',

  SETUP_POSITION: 'SETUP_POSITION',
  SETUP_STAND_STRAIGHT: 'SETUP_STAND_STRAIGHT',
  SETUP_STAND_STILL: 'SETUP_STAND_STILL',
  SETUP_HOLD: 'SETUP_HOLD',
  SETUP_LIE_DOWN: 'SETUP_LIE_DOWN',
  SETUP_ALL_FOURS: 'SETUP_ALL_FOURS',
  SETUP_V_SHAPE: 'SETUP_V_SHAPE',
  SETUP_SPLIT_STANCE: 'SETUP_SPLIT_STANCE',
  SETUP_FEET_TOGETHER: 'SETUP_FEET_TOGETHER',
  SETUP_FULL_BODY_VISIBLE: 'SETUP_FULL_BODY_VISIBLE',

  STEP_BACK: 'STEP_BACK',
  CMD_STEP_BACK: 'CMD_STEP_BACK',

  ERR_CAMERA_VIEW: 'ERR_CAMERA_VIEW',
  ERR_BODY_NOT_VISIBLE: 'ERR_BODY_NOT_VISIBLE',

  FIX_POSTURE: 'FIX_POSTURE',

  // -------------------------------------------------
  // General Commands / Flow
  // -------------------------------------------------
  CMD_GO_DOWN: 'CMD_GO_DOWN',
  CMD_GO_UP: 'CMD_GO_UP',
  CMD_GO_LOWER: 'CMD_GO_LOWER',
  CMD_STAND_UP: 'CMD_STAND_UP',
  CMD_STAND_UP_FULLY: 'CMD_STAND_UP_FULLY',
  CMD_RETURN_START: 'CMD_RETURN_START',
  CMD_FEET_TOGETHER: 'CMD_FEET_TOGETHER',
  CMD_HOLD: 'CMD_HOLD',
  CMD_SIT_BACK: 'CMD_SIT_BACK',

  // Legacy / extra generic codes still used by some exercise logic
  GO_DOWN: 'GO_DOWN',
  STAND_UP: 'STAND_UP',
  STAND_TALL: 'STAND_TALL',

  // -------------------------------------------------
  // Hold / Stability / Success
  // -------------------------------------------------
  REP_SUCCESS: 'REP_SUCCESS',
  GOOD_REP: 'GOOD_REP',
  PERFECT: 'PERFECT',
  PERFECT_LEVEL: 'PERFECT_LEVEL',
  PERFECT_LOCKOUT: 'PERFECT_LOCKOUT',

  HOLD_FIXED: 'HOLD_FIXED',
  HOLD_STABILIZE: 'HOLD_STABILIZE',
  HOLD_STEADY: 'HOLD_STEADY',
  HOLD_POSITION: 'HOLD_POSITION',
  HOLD_BRIDGE: 'HOLD_BRIDGE',
  HOLD_EXTENSION: 'HOLD_EXTENSION',
  HOLD_STANCE: 'HOLD_STANCE',
  HOLD_BOTTOM: 'HOLD_BOTTOM',
  HOLD_TOP: 'HOLD_TOP',
  HOLD_SPLIT: 'HOLD_SPLIT',
  HOLD_PLANK: 'HOLD_PLANK',

  // -------------------------------------------------
  // Squat / Lower Body Basics
  // -------------------------------------------------
  FIX_LOWER_HIPS: 'FIX_LOWER_HIPS',
  ERR_KNEES_FORWARD: 'ERR_KNEES_FORWARD',
  ERR_BACK_BENT: 'ERR_BACK_BENT',
  ERR_TOO_DEEP: 'ERR_TOO_DEEP',

  // -------------------------------------------------
  // Plank Specific
  // -------------------------------------------------
  ERR_HIPS_TOO_LOW: 'ERR_HIPS_TOO_LOW',
  ERR_HIPS_TOO_HIGH: 'ERR_HIPS_TOO_HIGH',
  ERR_BACK_SAG: 'ERR_BACK_SAG',
  ERR_KNEES_TOUCHING: 'ERR_KNEES_TOUCHING',
  ERR_BENT_ELBOWS: 'ERR_BENT_ELBOWS',
  ERR_ARMS_TOO_STRAIGHT: 'ERR_ARMS_TOO_STRAIGHT',
  ERR_BAD_ELBOW_POSITION: 'ERR_BAD_ELBOW_POSITION',

  // -------------------------------------------------
  // Leg Raises / Core / Jumping Jacks
  // -------------------------------------------------
  CMD_RAISE_LEGS: 'CMD_RAISE_LEGS',
  CMD_LOWER_SLOWLY: 'CMD_LOWER_SLOWLY',
  ERR_BENT_KNEES: 'ERR_BENT_KNEES',
  ERR_KNEES_BENT: 'ERR_KNEES_BENT',
  ERR_LEGS_SYNC: 'ERR_LEGS_SYNC',
  ERR_LEGS_WIDTH: 'ERR_LEGS_WIDTH',

  CMD_JUMP_OPEN: 'CMD_JUMP_OPEN',
  CMD_JUMP_CLOSE: 'CMD_JUMP_CLOSE',
  CMD_OPEN_LEGS_AND_RAISE_ARMS: 'CMD_OPEN_LEGS_AND_RAISE_ARMS',
  CMD_CLOSE_LEGS_AND_LOWER_ARMS: 'CMD_CLOSE_LEGS_AND_LOWER_ARMS',
  ERR_RAISE_ARMS: 'ERR_RAISE_ARMS',
  CMD_LOWER_ARMS: 'CMD_LOWER_ARMS',
  ERR_ARMS_LAZY: 'ERR_ARMS_LAZY',

  // -------------------------------------------------
  // Superman
  // -------------------------------------------------
  ERR_NOT_LYING_FLAT: 'ERR_NOT_LYING_FLAT',
  ERR_LIFT_LEGS: 'ERR_LIFT_LEGS',
  ERR_LIFT_ARMS: 'ERR_LIFT_ARMS',
  ERR_RESET_FULL: 'ERR_RESET_FULL',

  // -------------------------------------------------
  // Crunch
  // -------------------------------------------------
  ERR_HANDS_POSITION: 'ERR_HANDS_POSITION',

  // -------------------------------------------------
  // Upper Body (Lateral / Front / Overhead)
  // -------------------------------------------------
  CMD_RAISE_ARMS: 'CMD_RAISE_ARMS',
  CMD_RAISE_FRONT: 'CMD_RAISE_FRONT',
  CMD_RAISE_HIGHER: 'CMD_RAISE_HIGHER',
  CMD_PUSH_HIGHER: 'CMD_PUSH_HIGHER',

  PUSH_UP: 'PUSH_UP',
  LOWER_SLOWLY: 'LOWER_SLOWLY',

  STRAIGHTEN_ARMS: 'STRAIGHTEN_ARMS',
  ERR_TOO_HIGH: 'ERR_TOO_HIGH',
  ERR_SWINGING: 'ERR_SWINGING',
  RAISE_YOUR_ARM: 'RAISE_YOUR_ARM',
  ERR_ARCHED_BACK: 'ERR_ARCHED_BACK',
  ERR_LOW_ARMS: 'ERR_LOW_ARMS',
  ERR_ARMS_UNSYNC: 'ERR_ARMS_UNSYNC',
  CONTINUE_RAISING: 'CONTINUE_RAISING',

  REP_INVALID_BENT_ELBOW: 'REP_INVALID_BENT_ELBOW',
  REP_INVALID_TOO_HIGH: 'REP_INVALID_TOO_HIGH',
  REP_INVALID_UNSYNC: 'REP_INVALID_UNSYNC',
  REP_INVALID_ARCHED_BACK: 'REP_INVALID_ARCHED_BACK',
  REP_INVALID_LOW_ARMS: 'REP_INVALID_LOW_ARMS',

  // -------------------------------------------------
  // High Knees / Knee Tap
  // -------------------------------------------------
  CMD_KNEES_HIGHER: 'CMD_KNEES_HIGHER',
  ERR_STAND_TALL: 'ERR_STAND_TALL',

  CMD_TOUCH_KNEE: 'CMD_TOUCH_KNEE',
  CMD_TOUCH_KNEE_NOT_THIGH: 'CMD_TOUCH_KNEE_NOT_THIGH',
  CMD_STRAIGHTEN_BACK: 'CMD_STRAIGHTEN_BACK',
  ERR_TOUCH_KNEE_NOT_THIGH: 'ERR_TOUCH_KNEE_NOT_THIGH',
  ERR_BACK_BENT_CHEATING: 'ERR_BACK_BENT_CHEATING',

  // -------------------------------------------------
  // Pike Pushup
  // -------------------------------------------------
  FIX_KNEES: 'FIX_KNEES',

  // -------------------------------------------------
  // Glute Bridge
  // -------------------------------------------------
  CMD_LIFT_HIPS: 'CMD_LIFT_HIPS',
  CMD_PUSH_HIPS: 'CMD_PUSH_HIPS',
  ERR_ARCHING_BACK: 'ERR_ARCHING_BACK',

  // -------------------------------------------------
  // Bird Dog
  // -------------------------------------------------
  CMD_EXTEND: 'CMD_EXTEND',
  CMD_LIFT_ARM: 'CMD_LIFT_ARM',
  CMD_RAISE_OPPOSITE_ARM: 'CMD_RAISE_OPPOSITE_ARM',
  CMD_EXTEND_FULLY: 'CMD_EXTEND_FULLY',

  ERR_FLATTEN_BACK: 'ERR_FLATTEN_BACK',
  ERR_STRAIGHTEN_LEG: 'ERR_STRAIGHTEN_LEG',
  ERR_LOWER_LEG: 'ERR_LOWER_LEG',
  ERR_OPPOSITE_LIMBS: 'ERR_OPPOSITE_LIMBS',

  // -------------------------------------------------
  // V-Ups
  // -------------------------------------------------
  CMD_UP_V: 'CMD_UP_V',
  CMD_REACH_TOES: 'CMD_REACH_TOES',

  // -------------------------------------------------
  // Static Split Squat / Reverse Lunge
  // -------------------------------------------------
  ERR_KEEP_FEET_FIXED: 'ERR_KEEP_FEET_FIXED',
  KEEP_SPLIT_STANCE: 'KEEP_SPLIT_STANCE',
  WARN_KEEP_FEET_FIXED: 'WARN_KEEP_FEET_FIXED',
  ERR_STEP_FURTHER_BACK: 'ERR_STEP_FURTHER_BACK',

  // -------------------------------------------------
  // Push Ups
  // -------------------------------------------------
  ERR_FIX_BACK: 'ERR_FIX_BACK',
  ERR_KNEES_DROP: 'ERR_KNEES_DROP',
  ERR_HIPS_BACK: 'ERR_HIPS_BACK',
  ERR_LIFT_FEET: 'ERR_LIFT_FEET',

  // -------------------------------------------------
  // Dips
  // -------------------------------------------------
  ERR_BEND_KNEES: 'ERR_BEND_KNEES',
  ERR_STRAIGHTEN_LEGS: 'ERR_STRAIGHTEN_LEGS',

  // -------------------------------------------------
  // Toe Touch
  // -------------------------------------------------
  ERR_BEND_STANDING_LEG: 'ERR_BEND_STANDING_LEG',
  ERR_STRAIGHTEN_KICK_LEG: 'ERR_STRAIGHTEN_KICK_LEG',
  ERR_KEEP_TORSO_STRAIGHT: 'ERR_KEEP_TORSO_STRAIGHT',
  KICK_HIGH: 'KICK_HIGH',
  KICK_HIGHER: 'KICK_HIGHER',
  KICK_AND_TOUCH: 'KICK_AND_TOUCH',

  // -------------------------------------------------
  // Inchworm
  // -------------------------------------------------
  START_WALKING: 'START_WALKING',
  WALK_OUT: 'WALK_OUT',
  WALK_BACK: 'WALK_BACK',
  ERR_FIX_HIPS: 'ERR_FIX_HIPS',
  ERR_LOWER_HIPS: 'ERR_LOWER_HIPS',
  ERR_LIFT_HIPS: 'ERR_LIFT_HIPS',

  // -------------------------------------------------
  // Side Lying Leg Raise
  // -------------------------------------------------
  LIFT_LEG: 'LIFT_LEG',
  CMD_LIFT_HIGHER: 'CMD_LIFT_HIGHER',

  // -------------------------------------------------
  // Knee Tucks
  // -------------------------------------------------
  TUCK_IN: 'TUCK_IN',
  EXTEND_LEGS: 'EXTEND_LEGS',
  SQUEEZE_ABS: 'SQUEEZE_ABS',
  ERR_EXTEND_FULLY: 'ERR_EXTEND_FULLY',
  ERR_KEEP_FEET_UP: 'ERR_KEEP_FEET_UP',

  // -------------------------------------------------
  // Donkey Kick
  // -------------------------------------------------
  ERR_KEEP_KNEE_BENT: 'ERR_KEEP_KNEE_BENT',
  SQUEEZE_GLUTES: 'SQUEEZE_GLUTES',
} as const;

export type FeedbackCode = (typeof FeedbackCodes)[keyof typeof FeedbackCodes];

/**
 * Dynamic feedback codes emitted at runtime.
 * Examples:
 * - COUNT_1
 * - REP_NUMBER_8
 * - SETUP_HOLD_3
 */
export type DynamicFeedbackCode =
  | `COUNT_${number}`
  | `REP_NUMBER_${number}`
  | `SETUP_HOLD_${number}`;

export type FeedbackSignal = 
  | FeedbackCode
  | DynamicFeedbackCode
  | 'STAND_TALL'
  | 'KICK_AND_TOUCH'
  | 'GOOD_REP'
  | 'KICK_HIGHER'
  | 'USE_OPPOSITE_HAND'    // جديد
  | 'STRAIGHTEN_LEG'       // جديد
  | 'STRAIGHTEN_BACK'      // جديد
  | 'HOLD_IT'              // جديد
  | 'ERR_CAMERA_VIEW'
  | `COUNT_${number}`;

// =====================================================
// 5) Base Result Types
// =====================================================

/**
 * Shared result fields across all exercises.
 *
 * Notes:
 * - `is_correct` is kept for backward compatibility
 * - `quality` is the preferred richer field for new logic
 */
export interface BaseExerciseResult {
  exercise: ExerciseName;
  feedback_code: FeedbackSignal;

  /**
   * Backward-compatible boolean used by existing logic/UI.
   * Prefer `quality` for newer logic.
   */
  is_correct?: boolean;

  /**
   * Preferred modern quality model
   */
  quality?: ExerciseQuality;

  /**
   * Optional severity hint for UI / analytics
   */
  severity?: FeedbackSeverity;

  /**
   * Optional metadata
   */
  timestamp_ms?: number;
  is_body_visible?: boolean;
  confidence?: number;
  debug?: Record<string, unknown>;
}

/**
 * Result for rep-based exercises
 * (squat, crunch, leg raises, push-ups, etc.)
 */
export interface RepExerciseResult extends BaseExerciseResult {
  reps: number;
  stage: ExerciseStage;
}

/**
 * Result for timer-based exercises
 * (planks, static holds, etc.)
 */
export interface TimerExerciseResult extends BaseExerciseResult {
  timer: number;
  stage?: ExerciseStage;
}

/**
 * Base result for exercises that need active side metadata
 */
export interface SideAwareExerciseResult extends RepExerciseResult {
  activeSide: ActiveSide;
}

// =====================================================
// 6) Specific Exercise Result Types
// =====================================================

export interface SquatResult extends RepExerciseResult {
  exercise: 'squat';
  is_system_active: boolean;
}

export interface SupermanResult extends RepExerciseResult {
  exercise: 'superman';
  hold_timer: number;
}

export interface JumpingJacksResult extends RepExerciseResult {
  exercise: 'jumping_jacks';
  debug_class?: string;
}

export interface HighPlankResult extends TimerExerciseResult {
  exercise: 'high_plank';
}

export interface ElbowPlankResult extends TimerExerciseResult {
  exercise: 'elbow_plank';
}

export interface CrunchResult extends RepExerciseResult {
  exercise: 'crunch';
  is_correct: boolean;
}

export interface LegRaisesResult extends RepExerciseResult {
  exercise: 'leg_raises';
  is_correct: boolean;
}

// --- Upper Body / Newer Exercises ---
export interface LateralRaisesResult extends RepExerciseResult {
  exercise: 'lateral_raises';
}

export interface FrontRaisesResult extends RepExerciseResult {
  exercise: 'front_raises';
}

export interface OverheadPressResult extends RepExerciseResult {
  exercise: 'standing_overhead_press';
}

export interface VUpsResult extends RepExerciseResult {
  exercise: 'v_ups';
}

export interface HighKneesResult extends RepExerciseResult {
  exercise: 'high_knees';
}

export interface KneeTapResult extends RepExerciseResult {
  exercise: 'knee_tap';
}

export interface PikePushupResult extends RepExerciseResult {
  exercise: 'pike_pushup';
}

export interface StaticSplitSquatResult extends RepExerciseResult {
  exercise: 'static_split_squat';
}

export interface ChairSquatResult extends RepExerciseResult {
  exercise: 'chair_squat';
}

export interface GluteBridgeResult extends RepExerciseResult {
  exercise: 'glute_bridge';
}

export interface BirdDogResult extends RepExerciseResult {
  exercise: 'bird_dog';
}

export interface ReverseLungeResult extends SideAwareExerciseResult {
  exercise: 'reverse_lunge';
}

// --- Dips ---
export interface BentKneeDipResult extends RepExerciseResult {
  exercise: 'bent_knee_dip';
}

export interface StraightLegDipResult extends RepExerciseResult {
  exercise: 'straight_leg_dip';
}

// --- Push Ups ---
export interface ClassicPushUpResult extends RepExerciseResult {
  exercise: 'classic_push_up';
}

export interface KneePushUpResult extends RepExerciseResult {
  exercise: 'knee_push_up';
}

// --- Other Additional Exercises ---
export interface ToeTouchResult extends RepExerciseResult {
  exercise: 'toe_touch';
  stage: 'waiting' | 'leg_raised' | 'touched' | 'cooldown';
}

export interface InchwormResult extends RepExerciseResult {
  exercise: 'inchworm';
  stage: 'standing' | 'walking_out' | 'plank' | 'walking_back';
}

export interface SideLyingLegRaiseResult extends SideAwareExerciseResult {
  exercise: 'side_lying_leg_raise';
}

export interface KneeTucksResult extends RepExerciseResult {
  exercise: 'knee_tucks';
}

export interface DonkeyKickResult extends SideAwareExerciseResult {
  exercise: 'donkey_kick';
}

// =====================================================
// 7) Union Type for All Exercise Results
// =====================================================

export type ExerciseResult =
  | SquatResult
  | SupermanResult
  | JumpingJacksResult
  | HighPlankResult
  | ElbowPlankResult
  | CrunchResult
  | LegRaisesResult
  | LateralRaisesResult
  | FrontRaisesResult
  | OverheadPressResult
  | HighKneesResult
  | KneeTapResult
  | PikePushupResult
  | StaticSplitSquatResult
  | ChairSquatResult
  | GluteBridgeResult
  | BirdDogResult
  | ReverseLungeResult
  | VUpsResult
  | BentKneeDipResult
  | StraightLegDipResult
  | ClassicPushUpResult
  | KneePushUpResult
  | ToeTouchResult
  | InchwormResult
  | SideLyingLegRaiseResult
  | KneeTucksResult
  | DonkeyKickResult;

// =====================================================
// 8) Exercise Logic Contract
// =====================================================

export interface ExerciseLogic {
  /**
   * Analyze the current frame landmarks and return a typed exercise result.
   *
   * Backward compatible:
   * - Existing logic can keep using analyze(landmarks)
   * - Newer logic can optionally use analyze(landmarks, context)
   */
  analyze(
    landmarks: Landmark[],
    context?: ExerciseAnalysisContext
  ): ExerciseResult;

  /**
   * Reset internal state (counter, timers, EMA filters, etc.)
   */
  reset?(): void;
}