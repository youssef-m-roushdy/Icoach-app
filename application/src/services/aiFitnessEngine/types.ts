/**
 * AI Fitness Engine - Type Definitions
 * On-Device Exercise Analysis Engine
 */

// MediaPipe Pose Landmark structure
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

// Base result interface for all exercises
export interface BaseExerciseResult {
  exercise: string;
  feedback_code: string;
  is_correct?: boolean;
}

// Result for rep-based exercises (squat, crunch, leg raises, etc.)
export interface RepExerciseResult extends BaseExerciseResult {
  reps: number;
  stage: string | null;
}

// Result for timer-based exercises (planks)
export interface TimerExerciseResult extends BaseExerciseResult {
  timer: number;
  is_correct: boolean;
}

// --- Specific Exercise Results ---

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

// 🔥 New Exercises Results 🔥
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


// --- NEW EXERCISES RESULTS ---
export interface HighKneesResult extends RepExerciseResult { exercise: 'high_knees'; }
export interface KneeTapResult extends RepExerciseResult { exercise: 'knee_tap'; }
export interface PikePushupResult extends RepExerciseResult { exercise: 'pike_pushup'; }
export interface StaticSplitSquatResult extends RepExerciseResult { exercise: 'static_split_squat'; } // Rep-counting squat exercise
export interface ChairSquatResult extends RepExerciseResult { exercise: 'chair_squat'; }
export interface GluteBridgeResult extends RepExerciseResult { exercise: 'glute_bridge'; }
export interface BirdDogResult extends RepExerciseResult { exercise: 'bird_dog'; }
export interface ReverseLungeResult extends RepExerciseResult { 
  exercise: 'reverse_lunge'; 
  activeSide: 'LEFT' | 'RIGHT' | 'NONE'; // To show which leg is working
}
export interface VUpsResult extends RepExerciseResult { exercise: 'v_ups'; }

// Union type for all possible results
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
  | VUpsResult;

// Exercise logic interface
export interface ExerciseLogic {
  analyze(landmarks: Landmark[]): ExerciseResult;
  reset?(): void;
}

// Supported exercise names
export type ExerciseName =
  | 'squat'
  | 'superman'
  | 'leg_raises'
  | 'high_plank'
  | 'elbow_plank'
  | 'crunch'
  | 'jumping_jacks'
  | 'lateral_raises'
  | 'front_raises'
  | 'standing_overhead_press'
  | 'high_knees'
  | 'knee_tap'
  | 'pike_pushup'
  | 'static_split_squat'
  | 'chair_squat'
  | 'glute_bridge'
  | 'bird_dog'
  | 'reverse_lunge'
  | 'v_ups';

// Feedback codes (for UI mapping)
export const FeedbackCodes = {
  // 1. General & System
  SYSTEM_READY_GO: 'SYSTEM_READY_GO',
  START_POSITION: 'START_POSITION',
  SETUP_POSITION: 'SETUP_POSITION',
  SETUP_STAND_STRAIGHT: 'SETUP_STAND_STRAIGHT',
  SETUP_HOLD: 'SETUP_HOLD',
  STEP_BACK: 'STEP_BACK',
  ERR_CAMERA_VIEW: 'ERR_CAMERA_VIEW',
  ERR_BODY_NOT_VISIBLE: 'ERR_BODY_NOT_VISIBLE',
  FIX_POSTURE: 'FIX_POSTURE',

  // 2. Commands (General)
  CMD_GO_DOWN: 'CMD_GO_DOWN',
  CMD_GO_UP: 'CMD_GO_UP',
  REP_SUCCESS: 'REP_SUCCESS',
  GOOD_REP: 'GOOD_REP',
  PERFECT: 'PERFECT',
  HOLD_FIXED: 'HOLD_FIXED',
  HOLD_STABILIZE: 'HOLD_STABILIZE',
  HOLD_STEADY: 'HOLD_STEADY',
  HOLD_POSITION: 'HOLD_POSITION',

  // 3. Squat Specific
  FIX_LOWER_HIPS: 'FIX_LOWER_HIPS',

  // 4. Plank Specific (High & Elbow)
  ERR_HIPS_TOO_LOW: 'ERR_HIPS_TOO_LOW',
  ERR_HIPS_TOO_HIGH: 'ERR_HIPS_TOO_HIGH',
  ERR_BACK_SAG: 'ERR_BACK_SAG',
  ERR_KNEES_TOUCHING: 'ERR_KNEES_TOUCHING',
  ERR_BENT_ELBOWS: 'ERR_BENT_ELBOWS',         // High Plank Error
  ERR_ARMS_TOO_STRAIGHT: 'ERR_ARMS_TOO_STRAIGHT', // Elbow Plank Error
  ERR_BAD_ELBOW_POSITION: 'ERR_BAD_ELBOW_POSITION',

  // 5. Leg Exercises (Leg Raises & Jumping Jacks)
  CMD_RAISE_LEGS: 'CMD_RAISE_LEGS',
  CMD_LOWER_SLOWLY: 'CMD_LOWER_SLOWLY', // Used in multiple
  ERR_BENT_KNEES: 'ERR_BENT_KNEES',
  ERR_LEGS_SYNC: 'ERR_LEGS_SYNC',
  ERR_LEGS_WIDTH: 'ERR_LEGS_WIDTH',
  
  // Jumping Jacks Specific
  CMD_JUMP_OPEN: 'CMD_JUMP_OPEN',
  CMD_JUMP_CLOSE: 'CMD_JUMP_CLOSE',
  CMD_OPEN_LEGS_AND_RAISE_ARMS: 'CMD_OPEN_LEGS_AND_RAISE_ARMS',
  CMD_CLOSE_LEGS_AND_LOWER_ARMS: 'CMD_CLOSE_LEGS_AND_LOWER_ARMS',
  ERR_RAISE_ARMS: 'ERR_RAISE_ARMS',
  CMD_LOWER_ARMS: 'CMD_LOWER_ARMS',
  ERR_ARMS_LAZY: 'ERR_ARMS_LAZY',

  // 6. Superman Specific
  ERR_NOT_LYING_FLAT: 'ERR_NOT_LYING_FLAT',
  ERR_LIFT_LEGS: 'ERR_LIFT_LEGS',
  ERR_LIFT_ARMS: 'ERR_LIFT_ARMS',
  ERR_RESET_FULL: 'ERR_RESET_FULL',

  // 7. Crunch Specific
  ERR_HANDS_POSITION: 'ERR_HANDS_POSITION',

  // 8. Upper Body (Lateral, Front, Overhead)
  CMD_RAISE_ARMS: 'CMD_RAISE_ARMS',
  CMD_RAISE_FRONT: 'CMD_RAISE_FRONT',
  PUSH_UP: 'PUSH_UP',
  LOWER_SLOWLY: 'LOWER_SLOWLY', // New generalized slow down command
  
  // Errors - Upper Body
  STRAIGHTEN_ARMS: 'STRAIGHTEN_ARMS',
  ERR_TOO_HIGH: 'ERR_TOO_HIGH',
  ERR_SWINGING: 'ERR_SWINGING',
  RAISE_YOUR_ARM: 'RAISE_YOUR_ARM',
  ERR_ARCHED_BACK: 'ERR_ARCHED_BACK',
  ERR_LOW_ARMS: 'ERR_LOW_ARMS',
  ERR_ARMS_UNSYNC: 'ERR_ARMS_UNSYNC',

  // 9. Commands - New Arm Exercises
  CMD_RAISE_HIGHER: 'CMD_RAISE_HIGHER',
  PERFECT_LEVEL: 'PERFECT_LEVEL',
  CMD_PUSH_HIGHER: 'CMD_PUSH_HIGHER',
  PERFECT_LOCKOUT: 'PERFECT_LOCKOUT',
  CONTINUE_RAISING: 'CONTINUE_RAISING',

  // 10. Anti-Cheat / Invalid Rep Codes
  REP_INVALID_BENT_ELBOW: 'REP_INVALID_BENT_ELBOW',
  REP_INVALID_TOO_HIGH: 'REP_INVALID_TOO_HIGH',
  REP_INVALID_UNSYNC: 'REP_INVALID_UNSYNC',
  REP_INVALID_ARCHED_BACK: 'REP_INVALID_ARCHED_BACK',
  REP_INVALID_LOW_ARMS: 'REP_INVALID_LOW_ARMS',

  //////////////////////////////////////////////////////////////////////////

  // High Knees
  CMD_KNEES_HIGHER: 'CMD_KNEES_HIGHER',
  START_MOVING: 'START_MOVING',   // ابدأ الحركة
  ERR_STAND_TALL: 'ERR_STAND_TALL', // افرد ضهرك (Anti-Cheat)
  SETUP_STAND_STILL: 'SETUP_STAND_STILL', // جديد: عشان المعايرة

  // Knee Tap
  CMD_TOUCH_KNEE: 'CMD_TOUCH_KNEE',
  CMD_TOUCH_KNEE_NOT_THIGH: 'CMD_TOUCH_KNEE_NOT_THIGH', // لما يلمس الفخد
  CMD_STRAIGHTEN_BACK: 'CMD_STRAIGHTEN_BACK',           // لما يوطي بضهره
  ERR_TOUCH_KNEE_NOT_THIGH: 'ERR_TOUCH_KNEE_NOT_THIGH', // المس الركبة مش الفخد
  ERR_BACK_BENT_CHEATING: 'ERR_BACK_BENT_CHEATING',     // افرد ضهرك (غش)
  
  // Success

  // Pike Pushup
  SETUP_V_SHAPE: 'SETUP_V_SHAPE',   // وضعية البداية غلط
  FIX_KNEES: 'FIX_KNEES',           // الركبة متنية

  // Glute Bridge
  CMD_LIFT_HIPS: 'CMD_LIFT_HIPS',
  CMD_PUSH_HIPS: 'CMD_PUSH_HIPS',     // ابدأ الرفع
  HOLD_BRIDGE: 'HOLD_BRIDGE',         // اثبت فوق
  
  ERR_ARCHING_BACK: 'ERR_ARCHING_BACK', // متقوسش ضهرك (Anti-Cheat)

// Bird Dog Specific
  SETUP_ALL_FOURS: 'SETUP_ALL_FOURS', // وضعية القطة
  CMD_EXTEND: 'CMD_EXTEND',           // افرد
  HOLD_EXTENSION: 'HOLD_EXTENSION',   // اثبت
  
  ERR_FLATTEN_BACK: 'ERR_FLATTEN_BACK', // ضهرك مش مفرود
  ERR_STRAIGHTEN_LEG: 'ERR_STRAIGHTEN_LEG', // ركبتك متنية
  ERR_LOWER_LEG: 'ERR_LOWER_LEG',       // رجلك عالية أوي (قوست ضهرك)
  ERR_OPPOSITE_LIMBS: 'ERR_OPPOSITE_LIMBS', // خطأ استخدام نفس الجانب
  CMD_LIFT_ARM: 'CMD_LIFT_ARM', // "ارفع الايد العكسية"
  CMD_EXTEND_FULLY: 'CMD_EXTEND_FULLY',

  // V-Ups Specific
  SETUP_LIE_DOWN: 'SETUP_LIE_DOWN', // نام على ضهرك
  CMD_UP_V: 'CMD_UP_V',             // اطلع لفوق V
  CMD_REACH_TOES: 'CMD_REACH_TOES', // حاول تلمس رجلك
  ERR_KNEES_BENT: 'ERR_KNEES_BENT', // متتنيش ركبتك (الغش)

  // Chair Squat
  // SETUP_HOLD_1, SETUP_HOLD_2... handled dynamically in UI usually, or add codes
  
  CMD_GO_LOWER: 'CMD_GO_LOWER', // انزل كمان (لمستوى الكرسي)
  CMD_STAND_UP: 'CMD_STAND_UP', // اقف
  
  ERR_KNEES_FORWARD: 'ERR_KNEES_FORWARD', // ركبك سابقة مشط رجلك
  ERR_BACK_BENT: 'ERR_BACK_BENT',         // ضهرك مائل (صدرك واقع)
  ERR_TOO_DEEP: 'ERR_TOO_DEEP', // نزلت زيادة عن اللزوم


 SETUP_SPLIT_STANCE: 'SETUP_SPLIT_STANCE', // "Take a split stance"
 ERR_KEEP_FEET_FIXED: 'ERR_KEEP_FEET_FIXED', // "Don't move your feet!"

 HOLD_STANCE: 'HOLD_STANCE',                 // "اثبت..."
  // ...
CMD_STAND_UP_FULLY: 'CMD_STAND_UP_FULLY',


 KEEP_SPLIT_STANCE: 'KEEP_SPLIT_STANCE',   // لما يقرب يضم رجلك بس لسه ملمسوش
 WARN_KEEP_FEET_FIXED: 'WARN_KEEP_FEET_FIXED',
  
 CMD_HOLD: 'CMD_HOLD',           // لما تكون قربت من العمق بس لسه موصلتش
  
  HOLD_BOTTOM: 'HOLD_BOTTOM',     // تثبيت تحت (Debounce)
  HOLD_TOP: 'HOLD_TOP',           // تثبيت فوق (Debounce)




  // Reverse Lunge
  SETUP_FEET_TOGETHER: 'SETUP_FEET_TOGETHER', // "Start with feet together"
  ERR_STEP_FURTHER_BACK: 'ERR_STEP_FURTHER_BACK', // "Take a bigger step"
  CMD_RETURN_START: 'CMD_RETURN_START', // "Push back to start"
  CMD_FEET_TOGETHER: 'CMD_FEET_TOGETHER', // "Bring feet together"
  SETUP_FULL_BODY_VISIBLE: 'SETUP_FULL_BODY_VISIBLE',



  // General New Commands
  CMD_STEP_BACK: 'CMD_STEP_BACK',       // Reverse Lunge
  CMD_SIT_BACK: 'CMD_SIT_BACK',         // Chair Squat
  HOLD_SPLIT: 'HOLD_SPLIT',             // Static Split Squat

  ///////////////////////////////////////////////////////////////////////////
} as const;

export type FeedbackCode = (typeof FeedbackCodes)[keyof typeof FeedbackCodes];