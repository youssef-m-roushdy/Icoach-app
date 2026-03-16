/**
 * AI Fitness Engine - Feedback Mapping
 * Maps feedback codes to user-facing UI and voice messages.
 *
 * Design goals:
 * - Short, natural voice prompts
 * - Clear and consistent on-screen coaching
 * - Exercise-specific overrides where the same code means different things
 * - Safe fallbacks for unknown / future feedback codes
 * - Backward compatible with existing engine usage
 * - Ready for future localization / i18n integration
 */
import type { FeedbackSeverity } from './types';

export type FeedbackSource =
  | 'dynamic_count'
  | 'dynamic_setup'
  | 'exercise_override'
  | 'default'
  | 'fallback';

export interface FeedbackInfo {
  /**
   * Text shown on screen
   */
  message: string;

  /**
   * Short spoken prompt
   */
  voice?: string;

  /**
   * Optional metadata for UI / analytics / voice prioritization
   */
  severity?: FeedbackSeverity;
  priority?: number;

  /**
   * Optional i18n keys
   * These are auto-generated in getFeedbackForCode if not explicitly provided.
   */
  messageKey?: string;
  voiceKey?: string;

  /**
   * Diagnostic metadata
   */
  source?: FeedbackSource;
  code?: string;
}

type FeedbackTemplate = Omit<FeedbackInfo, 'source' | 'code' | 'messageKey' | 'voiceKey'>;

export interface FeedbackResolveOptions {
  /**
   * Optional translator function (e.g. from i18next)
   * Example:
   *   translate: (key, fallback, params) => i18n.t(key, { defaultValue: fallback, ...params })
   */
  translate?: (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ) => string;

  /**
   * Unknown-code fallback mode:
   * - safe: user-friendly generic prompt
   * - humanized: converts code into readable text
   */
  fallbackMode?: 'safe' | 'humanized';
}

/**
 * Small helper to keep message/voice declarations consistent.
 */
const fb = (
  message: string,
  voice?: string,
  meta: Omit<FeedbackTemplate, 'message' | 'voice'> = {}
): FeedbackTemplate => ({
  message,
  voice,
  severity: meta.severity ?? 'info',
  priority: meta.priority ?? 50,
});

/**
 * 1) GENERAL / DEFAULT MAPPING
 * Default messages shared across most exercises.
 */
export const FeedbackMapping: Record<string, FeedbackTemplate> = {
  // --- General visibility / setup ---
  ERR_BODY_NOT_VISIBLE: fb('Step back so your full body is visible', 'Step back', {
    severity: 'critical',
    priority: 95,
  }),
  ERR_CAMERA_VIEW: fb('Adjust the camera to show your full body', 'Check camera', {
    severity: 'critical',
    priority: 95,
  }),
  SETUP_POSITION: fb('Get into position', 'Get ready', {
    severity: 'info',
    priority: 70,
  }),
  SETUP_STAND_STRAIGHT: fb('Stand tall and hold still', 'Stand tall', {
    severity: 'info',
    priority: 70,
  }),
  SETUP_STAND_STILL: fb('Hold still to calibrate', 'Hold still', {
    severity: 'info',
    priority: 70,
  }),
  SETUP_FULL_BODY_VISIBLE: fb('Step back to show your full body', 'Show body', {
    severity: 'warning',
    priority: 80,
  }),
  SETUP_LIE_DOWN: fb('Lie down and get ready', 'Lie down', {
    severity: 'info',
    priority: 70,
  }),
  SETUP_ALL_FOURS: fb('Get on all fours', 'All fours', {
    severity: 'info',
    priority: 70,
  }),
  SETUP_SPLIT_STANCE: fb('Take a split stance', 'Split stance', {
    severity: 'info',
    priority: 70,
  }),
  SETUP_FEET_TOGETHER: fb('Start with your feet together', 'Feet together', {
    severity: 'info',
    priority: 70,
  }),
  SETUP_V_SHAPE: fb('Raise your hips and make a V shape', 'Hips up', {
    severity: 'info',
    priority: 70,
  }),

  // --- Generic readiness / flow ---
  SYSTEM_READY_GO: fb('Ready... Go!', 'Go', {
    severity: 'success',
    priority: 90,
  }),
  START_POSITION: fb('Move into the start position', 'Start position', {
    severity: 'info',
    priority: 65,
  }),
  START_MOVING: fb('Start moving', 'Go', {
    severity: 'info',
    priority: 65,
  }),
  STEP_BACK: fb('Step back slightly', 'Step back', {
    severity: 'warning',
    priority: 80,
  }),
  FIX_POSTURE: fb('Adjust your posture', 'Fix posture', {
    severity: 'warning',
    priority: 75,
  }),

  // --- General commands ---
  CMD_GO_DOWN: fb('Go down', 'Down', { priority: 60 }),
  CMD_GO_UP: fb('Come back up', 'Up', { priority: 60 }),
  CMD_GO_LOWER: fb('Go a little lower', 'Lower', { priority: 65 }),
  CMD_STAND_UP: fb('Stand up fully', 'Stand up', { priority: 60 }),
  CMD_STAND_UP_FULLY: fb('Stand up fully', 'Stand up', { priority: 60 }),
  CMD_HOLD: fb('Hold this position', 'Hold', { priority: 65 }),
  CMD_RETURN_START: fb('Return to the start position', 'Return', { priority: 60 }),
  CMD_FEET_TOGETHER: fb('Bring your feet together', 'Feet together', { priority: 60 }),
  CMD_STEP_BACK: fb('Step back', 'Step back', { priority: 70 }),
  CMD_SIT_BACK: fb('Sit back', 'Sit back', { priority: 65 }),

  // --- Hold / stabilize ---
  HOLD_FIXED: fb('Hold steady', 'Steady', {
    severity: 'success',
    priority: 68,
  }),
  HOLD_STABILIZE: fb('Hold steady', 'Hold', {
    severity: 'info',
    priority: 68,
  }),
  HOLD_STEADY: fb('Stay steady', 'Steady', {
    severity: 'info',
    priority: 68,
  }),
  HOLD_POSITION: fb('Hold briefly', 'Hold', {
    severity: 'info',
    priority: 68,
  }),
  HOLD_BOTTOM: fb('Hold at the bottom', 'Hold', {
    severity: 'info',
    priority: 68,
  }),
  HOLD_TOP: fb('Hold at the top', 'Hold', {
    severity: 'info',
    priority: 68,
  }),
  HOLD_SPLIT: fb('Hold your split stance', 'Hold', {
    severity: 'info',
    priority: 68,
  }),

  // --- Success / correction ---
  REP_SUCCESS: fb('Good rep!', 'Good', {
    severity: 'success',
    priority: 55,
  }),
  GOOD_REP: fb('Nice rep!', 'Good', {
    severity: 'success',
    priority: 55,
  }),
  PERFECT: fb('Perfect!', 'Perfect', {
    severity: 'success',
    priority: 58,
  }),
  PERFECT_LEVEL: fb('Perfect position, hold', 'Hold', {
    severity: 'success',
    priority: 58,
  }),
  PERFECT_LOCKOUT: fb('Perfect lockout, hold', 'Hold', {
    severity: 'success',
    priority: 58,
  }),

  // --- Generic form errors ---
  ERR_BENT_KNEES: fb('Keep your legs straight', 'Straighten legs', {
    severity: 'warning',
    priority: 75,
  }),
  ERR_KNEES_BENT: fb('Keep your knees slightly bent only if required', 'Fix knees', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_BACK_SAG: fb('Straighten your back', 'Fix back', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_ARCHED_BACK: fb('Keep your back straight', 'Fix back', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_ARCHING_BACK: fb('Do not arch your back', 'Fix back', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_STAND_TALL: fb('Stand tall and keep your chest up', 'Chest up', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_HANDS_POSITION: fb('Keep your hands in the correct position', 'Fix hands', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_BAD_ELBOW_POSITION: fb('Align your elbows under your shoulders', 'Fix elbows', {
    severity: 'warning',
    priority: 76,
  }),
  ERR_ARMS_UNSYNC: fb('Move both arms evenly', 'Move evenly', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_SWINGING: fb('Control the movement and avoid swinging', 'Control it', {
    severity: 'warning',
    priority: 72,
  }),
  STRAIGHTEN_ARMS: fb('Keep your arms straight', 'Straighten arms', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_STRAIGHTEN_LEGS: fb('Keep your legs straight', 'Straighten legs', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_TOO_HIGH: fb('Do not go too high', 'Too high', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_LOW_ARMS: fb('Raise your arms a little higher', 'Arms higher', {
    severity: 'warning',
    priority: 70,
  }),
  ERR_KEEP_FEET_FIXED: fb('Keep your feet in place', 'Keep feet fixed', {
    severity: 'warning',
    priority: 72,
  }),
  WARN_KEEP_FEET_FIXED: fb('Do not move your feet', 'Fix feet', {
    severity: 'warning',
    priority: 72,
  }),

  // --- Plank ---
  ERR_HIPS_TOO_LOW: fb('Raise your hips slightly', 'Hips up', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_HIPS_TOO_HIGH: fb('Lower your hips slightly', 'Lower hips', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_BENT_ELBOWS: fb('Straighten your arms', 'Straighten arms', {
    severity: 'warning',
    priority: 76,
  }),
  ERR_ARMS_TOO_STRAIGHT: fb('Lower onto your elbows', 'On elbows', {
    severity: 'warning',
    priority: 76,
  }),
  ERR_KNEES_TOUCHING: fb('Keep your knees off the floor', 'Knees up', {
    severity: 'warning',
    priority: 78,
  }),

  // --- Leg / lower body ---
  ERR_LEGS_SYNC: fb('Keep your feet together', 'Feet together', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_LEGS_WIDTH: fb('Open your legs a bit wider', 'Wider legs', {
    severity: 'warning',
    priority: 72,
  }),
  FIX_LOWER_HIPS: fb('Lower your hips a little more', 'Go lower', {
    severity: 'warning',
    priority: 74,
  }),
  CMD_RAISE_LEGS: fb('Raise your legs', 'Legs up', { priority: 62 }),
  CMD_LOWER_SLOWLY: fb('Lower slowly', 'Slow down', { priority: 60 }),
  CMD_RAISE_ARMS: fb('Raise your arms', 'Arms up', { priority: 62 }),
  CMD_RAISE_FRONT: fb('Raise your arms in front', 'Raise front', { priority: 62 }),
  CMD_RAISE_HIGHER: fb('Raise a little higher', 'Higher', { priority: 65 }),
  CMD_LIFT_HIGHER: fb('Lift a little higher', 'Higher', { priority: 65 }),
  CMD_PUSH_HIGHER: fb('Push a little higher', 'Higher', { priority: 65 }),
  CMD_TOUCH_KNEE: fb('Touch your opposite knee', 'Touch knee', { priority: 65 }),
  CMD_TOUCH_KNEE_NOT_THIGH: fb('Touch your knee, not your thigh', 'Touch knee', {
    priority: 68,
  }),
  CMD_STRAIGHTEN_BACK: fb('Straighten your back', 'Stand straight', { priority: 68 }),
  CMD_EXTEND: fb('Extend your arm and leg', 'Extend', { priority: 62 }),
  CMD_EXTEND_FULLY: fb('Extend fully', 'Extend more', { priority: 65 }),
  CMD_LIFT_ARM: fb('Lift your opposite arm', 'Lift arm', { priority: 62 }),
  CMD_UP_V: fb('Lift into a V shape', 'Up', { priority: 62 }),
  CMD_REACH_TOES: fb('Reach toward your toes', 'Reach', { priority: 62 }),

  // --- Jumping jacks ---
  CMD_JUMP_OPEN: fb('Jump and open', 'Open', { priority: 62 }),
  CMD_JUMP_CLOSE: fb('Jump and close', 'Close', { priority: 62 }),
  CMD_OPEN_LEGS_AND_RAISE_ARMS: fb(
    'Jump, open your legs, and raise your arms',
    'Jump open',
    { priority: 65 }
  ),
  CMD_CLOSE_LEGS_AND_LOWER_ARMS: fb(
    'Jump, close your legs, and lower your arms',
    'Jump close',
    { priority: 65 }
  ),
  ERR_RAISE_ARMS: fb('Raise your arms higher', 'Arms up', {
    severity: 'warning',
    priority: 72,
  }),
  CMD_LOWER_ARMS: fb('Lower your arms', 'Arms down', { priority: 60 }),
  ERR_ARMS_LAZY: fb('Move your arms higher', 'Arms higher', {
    severity: 'warning',
    priority: 72,
  }),

  // --- Push / dip / upper body generic ---
  PUSH_UP: fb('Push back up', 'Push up', { priority: 60 }),
  LOWER_SLOWLY: fb('Lower slowly', 'Slow down', { priority: 60 }),
  RAISE_YOUR_ARM: fb('Raise your arms a little higher', 'Higher', {
    severity: 'warning',
    priority: 70,
  }),

  // --- Anti-cheat / invalid rep ---
  REP_INVALID_BENT_ELBOW: fb('Rep not counted: keep your arms straight', 'Straight arms', {
    severity: 'warning',
    priority: 82,
  }),
  REP_INVALID_TOO_HIGH: fb(
    'Rep not counted: do not go above shoulder level',
    'Too high',
    {
      severity: 'warning',
      priority: 82,
    }
  ),
  REP_INVALID_UNSYNC: fb('Rep not counted: move both sides together', 'Move together', {
    severity: 'warning',
    priority: 82,
  }),

  // --- Additional general / utility codes used by some exercises ---
  STAND_TALL: fb('Stand tall to start', 'Stand tall', { priority: 65 }),
  STAND_UP: fb('Stand up fully', 'Stand up', { priority: 60 }),
  GO_DOWN: fb('Go down', 'Down', { priority: 60 }),
  WALK_OUT: fb('Walk your hands out', 'Walk out', { priority: 62 }),
  HOLD_PLANK: fb('Hold the plank position', 'Hold', { priority: 66 }),
  WALK_BACK: fb('Walk your hands back', 'Walk back', { priority: 62 }),
  KICK_AND_TOUCH: fb('Kick and touch your toes', 'Kick and touch', { priority: 62 }),
  KICK_HIGH: fb('Kick high', 'Kick high', { priority: 62 }),
  KICK_HIGHER: fb('Kick a little higher', 'Kick higher', {
    severity: 'warning',
    priority: 68,
  }),
  LIFT_LEG: fb('Lift your leg', 'Lift leg', { priority: 62 }),
  TUCK_IN: fb('Pull your knees in', 'Tuck in', { priority: 62 }),
  EXTEND_LEGS: fb('Extend your legs', 'Extend legs', { priority: 62 }),
  SQUEEZE_ABS: fb('Squeeze your abs', 'Squeeze', { priority: 60 }),
  SQUEEZE_GLUTES: fb('Squeeze your glutes', 'Squeeze', { priority: 60 }),
  HOLD_BRIDGE: fb('Hold at the top', 'Hold', { priority: 66 }),
  HOLD_EXTENSION: fb('Hold the extension', 'Hold', { priority: 66 }),
  KEEP_SPLIT_STANCE: fb('Keep your feet apart', 'Keep stance', {
    severity: 'warning',
    priority: 72,
  }),

  // --- Specific form / anti-cheat codes used by extra exercises ---
  ERR_NOT_LYING_FLAT: fb('Lie flat on your stomach', 'Lie down', {
    severity: 'warning',
    priority: 76,
  }),
  ERR_LIFT_LEGS: fb('Lift your legs too', 'Legs up', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_LIFT_ARMS: fb('Lift your arms too', 'Arms up', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_RESET_FULL: fb('Lower fully to reset', 'Reset', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_TOUCH_KNEE_NOT_THIGH: fb('Touch your knee, not your thigh', 'Touch knee', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_BACK_BENT_CHEATING: fb('Do not bend your back, stand tall', 'Stand straight', {
    severity: 'warning',
    priority: 78,
  }),
  FIX_KNEES: fb('Straighten your legs', 'Straighten legs', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_KNEES_FORWARD: fb('Keep your knees behind your toes', 'Knees back', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_BACK_BENT: fb('Keep your chest up and back straight', 'Chest up', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_TOO_DEEP: fb('Do not go too low', 'Too low', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_OPPOSITE_LIMBS: fb('Use opposite arm and leg', 'Opposite sides', {
    severity: 'warning',
    priority: 76,
  }),
  ERR_FLATTEN_BACK: fb('Flatten your back', 'Flat back', {
    severity: 'warning',
    priority: 76,
  }),
  ERR_STRAIGHTEN_LEG: fb('Straighten your leg', 'Straighten leg', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_LOWER_LEG: fb('Lower your leg slightly', 'Lower leg', {
    severity: 'warning',
    priority: 70,
  }),
  ERR_STEP_FURTHER_BACK: fb('Take a bigger step back', 'Bigger step', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_FIX_BACK: fb('Keep your back straight', 'Fix back', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_KNEES_DROP: fb('Keep your knees off the floor', 'Knees up', {
    severity: 'warning',
    priority: 78,
  }),
  ERR_HIPS_BACK: fb('Bring your hips forward', 'Hips forward', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_LIFT_FEET: fb('Lift your feet off the floor', 'Feet up', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_BEND_KNEES: fb('Keep your knees bent at 90 degrees', 'Fix knees', {
    severity: 'warning',
    priority: 72,
  }),
  STRAIGHTEN_LEGS: fb('Keep your legs fully straight', 'Straighten legs', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_BEND_STANDING_LEG: fb('Keep your standing leg soft but stable', 'Fix standing leg', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_STRAIGHTEN_KICK_LEG: fb('Straighten your kicking leg', 'Straighten leg', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_KEEP_TORSO_STRAIGHT: fb('Keep your torso upright', 'Torso straight', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_FIX_HIPS: fb('Keep your hips aligned', 'Fix hips', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_LOWER_HIPS: fb('Lower your hips slightly', 'Lower hips', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_LIFT_HIPS: fb('Lift your hips slightly', 'Lift hips', {
    severity: 'warning',
    priority: 74,
  }),
  ERR_EXTEND_FULLY: fb('Extend your legs fully', 'Extend fully', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_KEEP_FEET_UP: fb('Keep your feet off the floor', 'Feet up', {
    severity: 'warning',
    priority: 72,
  }),
  ERR_KEEP_KNEE_BENT: fb('Keep your knee bent at 90 degrees', 'Bend knee', {
    severity: 'warning',
    priority: 72,
  }),
};

/**
 * 2) EXERCISE-SPECIFIC OVERRIDES
 * Same feedback code, but different wording depending on exercise.
 */
export const ExerciseSpecificFeedback: Record<string, Record<string, FeedbackTemplate>> = {
  squat: {
    STEP_BACK: fb('Step back so your full body is visible', 'Step back', {
      severity: 'critical',
      priority: 95,
    }),
    SETUP_STAND_STRAIGHT: fb('Stand tall and hold still', 'Stand tall', {
      priority: 70,
    }),
    SETUP_STAND_STILL: fb('Hold still to calibrate', 'Hold still', {
      priority: 70,
    }),
    SYSTEM_READY_GO: fb('Ready... squat!', 'Go', {
      severity: 'success',
      priority: 90,
    }),
    CMD_GO_DOWN: fb('Squat down', 'Down', { priority: 62 }),
    FIX_LOWER_HIPS: fb('Go a little deeper', 'Go lower', {
      severity: 'warning',
      priority: 74,
    }),
    CMD_GO_UP: fb('Stand back up', 'Up', { priority: 60 }),
  },

  superman: {
    ERR_NOT_LYING_FLAT: fb('Lie flat on your stomach', 'Lie down', {
      severity: 'warning',
      priority: 76,
    }),
    SYSTEM_READY_GO: fb('Ready... fly!', 'Ready', {
      severity: 'success',
      priority: 90,
    }),
    CMD_GO_UP: fb('Lift your arms and legs together', 'Lift together', {
      priority: 65,
    }),
    ERR_LIFT_LEGS: fb('Lift your legs too', 'Legs up', {
      severity: 'warning',
      priority: 74,
    }),
    ERR_LIFT_ARMS: fb('Lift your arms too', 'Arms up', {
      severity: 'warning',
      priority: 74,
    }),
    ERR_RESET_FULL: fb('Lower fully to reset', 'Reset', {
      severity: 'warning',
      priority: 72,
    }),
    HOLD_STABILIZE: fb('Hold the position', 'Hold', { priority: 66 }),
    REP_SUCCESS: fb('Great rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  leg_raises: {
    START_POSITION: fb('Lie flat with your legs straight', 'Get ready', { priority: 68 }),
    ERR_BENT_KNEES: fb('Keep your legs straight', 'Straighten legs', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_LEGS_SYNC: fb('Keep your feet together', 'Feet together', {
      severity: 'warning',
      priority: 72,
    }),
    CMD_RAISE_LEGS: fb('Lift your legs up', 'Legs up', { priority: 62 }),
    CMD_LOWER_SLOWLY: fb('Lower slowly and with control', 'Slow down', {
      priority: 60,
    }),
    REP_SUCCESS: fb('Nice rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  crunch: {
    START_POSITION: fb('Lie down with your knees bent', 'Start position', { priority: 68 }),
    CMD_GO_UP: fb('Crunch up', 'Up', { priority: 62 }),
    CMD_GO_DOWN: fb('Lower down', 'Down', { priority: 60 }),
    ERR_BENT_KNEES: fb('Bend your knees more', 'Bend knees', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_HANDS_POSITION: fb("Don't pull your neck", 'Fix hands', {
      severity: 'warning',
      priority: 74,
    }),
    ERR_LEGS_SYNC: fb('Keep your feet aligned', 'Feet together', {
      severity: 'warning',
      priority: 72,
    }),
    REP_SUCCESS: fb('Good crunch!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  jumping_jacks: {
    SYSTEM_READY_GO: fb('Ready... jump!', 'Go', {
      severity: 'success',
      priority: 90,
    }),
    CMD_OPEN_LEGS_AND_RAISE_ARMS: fb(
      'Jump, open your legs, and raise your arms',
      'Jump open',
      { priority: 65 }
    ),
    CMD_CLOSE_LEGS_AND_LOWER_ARMS: fb(
      'Jump, close your legs, and lower your arms',
      'Jump close',
      { priority: 65 }
    ),
    ERR_RAISE_ARMS: fb('Raise your arms higher', 'Arms up', {
      severity: 'warning',
      priority: 72,
    }),
    CMD_LOWER_ARMS: fb('Lower your arms', 'Arms down', { priority: 60 }),
    CMD_JUMP_OPEN: fb('Open your legs', 'Open', { priority: 62 }),
    CMD_JUMP_CLOSE: fb('Close your legs', 'Close', { priority: 62 }),
    ERR_LEGS_WIDTH: fb('Open your legs wider', 'Wider legs', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_ARMS_LAZY: fb('Raise your arms higher', 'Arms higher', {
      severity: 'warning',
      priority: 72,
    }),
    REP_SUCCESS: fb('Good pace!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  high_plank: {
    SETUP_POSITION: fb('Get into a high plank with straight arms', 'High plank', {
      priority: 70,
    }),
    ERR_BENT_ELBOWS: fb('Straighten your arms', 'Straighten arms', {
      severity: 'warning',
      priority: 76,
    }),
    ERR_HIPS_TOO_LOW: fb('Lift your hips slightly', 'Hips up', {
      severity: 'warning',
      priority: 78,
    }),
    ERR_BACK_SAG: fb('Tighten your core and straighten your back', 'Fix back', {
      severity: 'warning',
      priority: 78,
    }),
    ERR_HIPS_TOO_HIGH: fb('Lower your hips slightly', 'Lower hips', {
      severity: 'warning',
      priority: 78,
    }),
    ERR_KNEES_TOUCHING: fb('Keep your knees off the floor', 'Knees up', {
      severity: 'warning',
      priority: 78,
    }),
    HOLD_STEADY: fb('Stay steady', 'Steady', { priority: 66 }),
    HOLD_FIXED: fb('Perfect, hold it', 'Hold', {
      severity: 'success',
      priority: 68,
    }),
  },

  elbow_plank: {
    SETUP_POSITION: fb('Get into an elbow plank', 'Elbow plank', {
      priority: 70,
    }),
    ERR_ARMS_TOO_STRAIGHT: fb('Lower down onto your elbows', 'On elbows', {
      severity: 'warning',
      priority: 76,
    }),
    ERR_BAD_ELBOW_POSITION: fb('Place your elbows under your shoulders', 'Fix elbows', {
      severity: 'warning',
      priority: 76,
    }),
    HOLD_FIXED: fb('Perfect, hold it', 'Hold', {
      severity: 'success',
      priority: 68,
    }),
  },

  lateral_raises: {
    ERR_BODY_NOT_VISIBLE: fb('Stand facing the camera with your full body visible', 'Show body', {
      severity: 'critical',
      priority: 95,
    }),
    CMD_RAISE_ARMS: fb('Raise your arms out to the sides', 'Arms up', { priority: 62 }),
    CMD_RAISE_HIGHER: fb('Raise to shoulder level', 'Higher', {
      severity: 'warning',
      priority: 68,
    }),
    PERFECT_LEVEL: fb('Perfect height, hold briefly', 'Hold', {
      severity: 'success',
      priority: 58,
    }),
    HOLD_STEADY: fb('Stay steady', 'Steady', { priority: 66 }),
    STRAIGHTEN_ARMS: fb('Keep your arms straight', 'Straighten arms', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_TOO_HIGH: fb('Do not go above shoulder level', 'Too high', {
      severity: 'warning',
      priority: 72,
    }),
    FIX_POSTURE: fb('Move both arms together', 'Move together', {
      severity: 'warning',
      priority: 74,
    }),
    REP_INVALID_BENT_ELBOW: fb('Rep not counted: keep your arms straight', 'Straight arms', {
      severity: 'warning',
      priority: 82,
    }),
    REP_INVALID_TOO_HIGH: fb('Rep not counted: stop at shoulder level', 'Too high', {
      severity: 'warning',
      priority: 82,
    }),
    REP_INVALID_UNSYNC: fb('Rep not counted: move both arms together', 'Move together', {
      severity: 'warning',
      priority: 82,
    }),
    REP_SUCCESS: fb('Lower slowly', 'Slow down', {
      severity: 'success',
      priority: 55,
    }),
  },

  front_raises: {
    ERR_BODY_NOT_VISIBLE: fb('Stand facing the camera', 'Face camera', {
      severity: 'critical',
      priority: 95,
    }),
    CMD_RAISE_FRONT: fb('Raise your arms in front', 'Raise front', { priority: 62 }),
    STRAIGHTEN_ARMS: fb('Keep your elbows straight', 'Straighten arms', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_TOO_HIGH: fb('Stop at shoulder level', 'Too high', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_SWINGING: fb('Move both arms together', 'Move together', {
      severity: 'warning',
      priority: 74,
    }),
    RAISE_YOUR_ARM: fb('Raise a little higher', 'Higher', {
      severity: 'warning',
      priority: 68,
    }),
    GOOD_REP: fb('Good control', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Nice work!', 'Great', {
      severity: 'success',
      priority: 55,
    }),
    HOLD_POSITION: fb('Hold briefly', 'Hold', { priority: 66 }),
    CONTINUE_RAISING: fb('Keep raising', undefined, { priority: 64 }),
    CMD_LOWER_SLOWLY: fb('Lower slowly', 'Slow down', { priority: 60 }),
  },

  standing_overhead_press: {
    SETUP_POSITION: fb('Get ready to press', 'Ready', { priority: 70 }),
    PUSH_UP: fb('Press up', 'Push up', { priority: 62 }),
    PERFECT_LOCKOUT: fb('Good lockout, hold', 'Hold', {
      severity: 'success',
      priority: 58,
    }),
    CMD_PUSH_HIGHER: fb('Press higher and lock your elbows', 'Higher', {
      severity: 'warning',
      priority: 68,
    }),
    LOWER_SLOWLY: fb('Lower slowly', 'Slow down', { priority: 60 }),
    ERR_ARMS_UNSYNC: fb('Press evenly with both arms', 'Even push', {
      severity: 'warning',
      priority: 74,
    }),
    ERR_ARCHED_BACK: fb('Keep your back straight', 'Fix back', {
      severity: 'warning',
      priority: 78,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  high_knees: {
    SETUP_POSITION: fb('Stand tall and get ready to run in place', 'High knees', {
      priority: 70,
    }),
    SETUP_STAND_STILL: fb('Hold still to calibrate', 'Hold still', {
      priority: 70,
    }),
    START_MOVING: fb('Start moving', 'Go', { priority: 65 }),
    CMD_KNEES_HIGHER: fb('Lift your knees higher', 'Knees higher', {
      severity: 'warning',
      priority: 68,
    }),
    ERR_STAND_TALL: fb('Keep your chest up and stand tall', 'Chest up', {
      severity: 'warning',
      priority: 74,
    }),
    REP_SUCCESS: fb('Good pace!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  knee_tap: {
    SETUP_POSITION: fb('Stand tall and tap your opposite knee', 'Knee tap', {
      priority: 70,
    }),
    CMD_TOUCH_KNEE: fb('Touch your opposite knee', 'Touch knee', { priority: 65 }),
    CMD_KNEES_HIGHER: fb('Lift your knee higher', 'Higher', {
      severity: 'warning',
      priority: 68,
    }),
    ERR_TOUCH_KNEE_NOT_THIGH: fb('Aim lower and touch your knee', 'Touch knee', {
      severity: 'warning',
      priority: 74,
    }),
    ERR_BACK_BENT_CHEATING: fb('Do not bend your back, stand tall', 'Stand straight', {
      severity: 'warning',
      priority: 78,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  pike_pushup: {
    SETUP_POSITION: fb('Get into a pike position', 'Pike position', { priority: 70 }),
    SETUP_V_SHAPE: fb('Raise your hips and make a V shape', 'Hips up', { priority: 70 }),
    FIX_KNEES: fb('Keep your legs straight', 'Straighten legs', {
      severity: 'warning',
      priority: 72,
    }),
    CMD_GO_DOWN: fb('Lower your head toward the floor', 'Down', { priority: 62 }),
    PUSH_UP: fb('Push back up', 'Push', { priority: 60 }),
    REP_SUCCESS: fb('Strong rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  static_split_squat: {
    SETUP_POSITION: fb('Place one foot forward and one foot back', 'Split squat', {
      priority: 70,
    }),
    SETUP_SPLIT_STANCE: fb('Take a wider step back', 'Step back', { priority: 70 }),
    KEEP_SPLIT_STANCE: fb('Keep your feet apart', 'Keep stance', {
      severity: 'warning',
      priority: 72,
    }),
    CMD_GO_DOWN: fb('Lower your back knee toward the floor', 'Down', { priority: 62 }),
    CMD_GO_LOWER: fb('Go a little lower', 'Lower', {
      severity: 'warning',
      priority: 68,
    }),
    CMD_HOLD: fb('Almost there, hold', 'Hold', { priority: 66 }),
    CMD_STAND_UP: fb('Push back up', 'Up', { priority: 60 }),
    HOLD_BOTTOM: fb('Stay steady at the bottom', 'Steady', { priority: 66 }),
    HOLD_TOP: fb('Pause briefly at the top', 'Hold', { priority: 66 }),
    WARN_KEEP_FEET_FIXED: fb('Keep your feet planted', 'Fix feet', {
      severity: 'warning',
      priority: 72,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  chair_squat: {
    SETUP_POSITION: fb('Stand in front of the chair', 'Chair squat', { priority: 70 }),
    ERR_TOO_DEEP: fb('Do not go too low, just touch the chair', 'Too low', {
      severity: 'warning',
      priority: 72,
    }),
    CMD_GO_DOWN: fb('Sit back toward the chair', 'Sit back', { priority: 62 }),
    CMD_GO_LOWER: fb('Go a little lower and touch the chair', 'Go lower', {
      severity: 'warning',
      priority: 68,
    }),
    CMD_STAND_UP: fb('Stand up fully', 'Stand up', { priority: 60 }),
    ERR_BACK_BENT: fb('Keep your chest up', 'Chest up', {
      severity: 'warning',
      priority: 78,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  glute_bridge: {
    SETUP_POSITION: fb('Lie down with your knees bent', 'Glute bridge', {
      priority: 70,
    }),
    SETUP_LIE_DOWN: fb('Lie on your back with your feet flat', 'Setup', {
      priority: 70,
    }),
    CMD_PUSH_HIPS: fb('Drive your hips up', 'Up', { priority: 62 }),
    CMD_PUSH_HIGHER: fb('Squeeze your glutes and lift higher', 'Higher', {
      severity: 'warning',
      priority: 68,
    }),
    HOLD_BRIDGE: fb('Hold at the top and squeeze', 'Hold', { priority: 66 }),
    ERR_ARCHING_BACK: fb('Do not arch your back', 'Fix back', {
      severity: 'warning',
      priority: 78,
    }),
    REP_SUCCESS: fb('Good squeeze!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  bird_dog: {
    SETUP_POSITION: fb('Start on your hands and knees with a flat back', 'Bird dog', {
      priority: 70,
    }),
    SETUP_ALL_FOURS: fb('Get into a tabletop position', 'Ready', {
      priority: 70,
    }),
    CMD_EXTEND: fb('Extend one arm and the opposite leg', 'Extend', {
      priority: 62,
    }),
    CMD_RAISE_OPPOSITE_ARM: fb('Lift the opposite arm', 'Lift arm', {
      priority: 62,
    }),
    CMD_EXTEND_FULLY: fb('Reach farther and extend fully', 'Extend more', {
      severity: 'warning',
      priority: 68,
    }),
    ERR_OPPOSITE_LIMBS: fb('Use opposite arm and leg', 'Opposite sides', {
      severity: 'warning',
      priority: 76,
    }),
    ERR_FLATTEN_BACK: fb('Flatten your back', 'Flat back', {
      severity: 'warning',
      priority: 76,
    }),
    ERR_STRAIGHTEN_LEG: fb('Straighten your leg', 'Straighten leg', {
      severity: 'warning',
      priority: 72,
    }),
    HOLD_EXTENSION: fb('Hold the extension', 'Hold', {
      priority: 66,
    }),
    REP_SUCCESS: fb('Great balance!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  reverse_lunge: {
    SETUP_POSITION: fb('Stand tall with your feet together', 'Reverse lunge', {
      priority: 70,
    }),
    SETUP_STAND_STRAIGHT: fb('Stand tall with your feet together', 'Stand tall', {
      priority: 70,
    }),
    SETUP_FULL_BODY_VISIBLE: fb('Step back so your full body is visible', 'Show body', {
      severity: 'critical',
      priority: 95,
    }),
    ERR_BODY_NOT_VISIBLE: fb('Make sure your full body is visible', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    CMD_GO_LOWER: fb('Step back and drop your knee', 'Lunge down', {
      priority: 65,
    }),
    CMD_RETURN_START: fb('Push back to the start position', 'Push back', {
      priority: 60,
    }),
    CMD_STAND_UP: fb('Stand up fully', 'Up', {
      priority: 60,
    }),
    CMD_FEET_TOGETHER: fb('Bring your feet together', 'Feet together', {
      priority: 60,
    }),
    ERR_STEP_FURTHER_BACK: fb('Take a bigger step back', 'Bigger step', {
      severity: 'warning',
      priority: 74,
    }),
    REP_SUCCESS: fb('Good lunge!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  v_ups: {
    SETUP_POSITION: fb('Lie flat with your arms overhead', 'Lie down', {
      priority: 70,
    }),
    CMD_UP_V: fb('Lift your legs and torso into a V shape', 'Up', {
      priority: 62,
    }),
    CMD_REACH_TOES: fb('Reach toward your toes', 'Reach', {
      priority: 62,
    }),
    CMD_GO_DOWN: fb('Lower down slowly', 'Down', {
      priority: 60,
    }),
    ERR_KNEES_BENT: fb('Keep your legs straight', 'Straight legs', {
      severity: 'warning',
      priority: 72,
    }),
    REP_SUCCESS: fb('Perfect V-up!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  bent_knee_dip: {
    SETUP_POSITION: fb('Sit on the edge with your knees at 90 degrees', 'Setup', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Show your full body from the side', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    ERR_BEND_KNEES: fb('Keep your knees bent at 90 degrees', 'Fix knees', {
      severity: 'warning',
      priority: 72,
    }),
    GO_DOWN: fb('Lower your body', 'Down', {
      priority: 60,
    }),
    PUSH_UP: fb('Push back up', 'Up', {
      priority: 60,
    }),
    GOOD_REP: fb('Good dip!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    CMD_GO_LOWER: fb('Go a little lower and bend your elbows more', 'Go lower', {
      severity: 'warning',
      priority: 68,
    }),
  },

  classic_push_up: {
    SETUP_POSITION: fb('Start in a plank with straight arms', 'Push-up setup', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Show your full body from the side', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    ERR_FIX_BACK: fb("Don't sag, keep your back straight", 'Fix back', {
      severity: 'warning',
      priority: 78,
    }),
    ERR_KNEES_DROP: fb('Keep your knees off the floor', 'Knees up', {
      severity: 'warning',
      priority: 78,
    }),
    GO_DOWN: fb('Lower your chest', 'Down', {
      priority: 60,
    }),
    CMD_GO_LOWER: fb('Go lower until your elbows reach about 90 degrees', 'Go lower', {
      severity: 'warning',
      priority: 68,
    }),
    PUSH_UP: fb('Push back up', 'Push up', {
      priority: 60,
    }),
    GOOD_REP: fb('Strong rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Good push-up!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  knee_push_up: {
    SETUP_POSITION: fb('Start on your knees with a straight body line', 'Setup', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Show your full body from the side', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    ERR_HIPS_BACK: fb("Don't push your hips back", 'Hips forward', {
      severity: 'warning',
      priority: 74,
    }),
    GO_DOWN: fb('Lower your chest', 'Down', {
      priority: 60,
    }),
    CMD_GO_LOWER: fb('Go lower until your chest gets closer to the floor', 'Go lower', {
      severity: 'warning',
      priority: 68,
    }),
    PUSH_UP: fb('Push back up', 'Push up', {
      priority: 60,
    }),
    GOOD_REP: fb('Perfect rep!', 'Perfect', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Good push-up!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    ERR_LIFT_FEET: fb('Lift your feet off the floor', 'Feet up', {
      severity: 'warning',
      priority: 72,
    }),
  },

  straight_leg_dip: {
    SETUP_POSITION: fb('Place your hands on the chair and keep your legs straight', 'Setup', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Show your full body from the side', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    GO_DOWN: fb('Dip down', 'Down', {
      priority: 60,
    }),
    PUSH_UP: fb('Push back up', 'Up', {
      priority: 60,
    }),
    STRAIGHTEN_LEGS: fb('Keep your legs fully straight', 'Straighten legs', {
      severity: 'warning',
      priority: 72,
    }),
    GOOD_REP: fb('Strong dip!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Good dip!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  toe_touch: {
    ERR_CAMERA_VIEW: fb('Show your full body', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    STAND_TALL: fb('Stand tall to start', 'Ready', {
      priority: 65,
    }),
    KICK_AND_TOUCH: fb('Kick up and touch your toes', 'Touch toes', {
      priority: 62,
    }),
    KICK_HIGHER: fb('Kick a little higher', 'Kick higher', {
      severity: 'warning',
      priority: 68,
    }),
    GOOD_REP: fb('Nice touch!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Nice rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  inchworm: {
    SETUP_POSITION: fb('Stand tall with your feet together', 'Stand tall', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Show your full body from the side', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    WALK_OUT: fb('Walk your hands out to a plank', 'Walk out', {
      priority: 62,
    }),
    HOLD_PLANK: fb('Hold the plank briefly', 'Hold', {
      priority: 66,
    }),
    WALK_BACK: fb('Walk your hands back to your feet', 'Walk back', {
      priority: 62,
    }),
    STAND_UP: fb('Stand up fully to finish', 'Stand up', {
      priority: 60,
    }),
    ERR_LOWER_HIPS: fb('Lower your hips slightly and keep a straight line', 'Lower hips', {
      severity: 'warning',
      priority: 74,
    }),
    ERR_LIFT_HIPS: fb('Lift your hips slightly', 'Lift hips', {
      severity: 'warning',
      priority: 74,
    }),
    GOOD_REP: fb('Good job!', 'Great', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  side_lying_leg_raise: {
    SETUP_POSITION: fb('Lie on your side with both legs straight', 'Lie down', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Make sure your full body is visible', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    LIFT_LEG: fb('Lift your top leg', 'Lift leg', {
      priority: 62,
    }),
    CMD_LIFT_HIGHER: fb('Lift a little higher and squeeze your glutes', 'Higher', {
      severity: 'warning',
      priority: 68,
    }),
    LOWER_SLOWLY: fb('Lower your leg slowly', 'Slow down', {
      priority: 60,
    }),
    ERR_STRAIGHTEN_LEG: fb('Keep your leg straight', 'Straighten leg', {
      severity: 'warning',
      priority: 72,
    }),
    GOOD_REP: fb('Good lift!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  knee_tucks: {
    SETUP_POSITION: fb('Sit, lean back, and lift your legs', 'Setup', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Show a full side view', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    TUCK_IN: fb('Pull your knees toward your chest', 'Tuck in', {
      priority: 62,
    }),
    EXTEND_LEGS: fb('Extend your legs out', 'Extend legs', {
      priority: 62,
    }),
    SQUEEZE_ABS: fb('Squeeze your abs', 'Squeeze', {
      priority: 60,
    }),
    ERR_EXTEND_FULLY: fb('Straighten your legs fully', 'Extend fully', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_KEEP_FEET_UP: fb('Keep your feet off the floor', 'Feet up', {
      severity: 'warning',
      priority: 72,
    }),
    GOOD_REP: fb('Good tuck!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },

  donkey_kick: {
    SETUP_POSITION: fb('Start on all fours', 'Setup', {
      priority: 70,
    }),
    ERR_CAMERA_VIEW: fb('Show a full side view', 'Check camera', {
      severity: 'critical',
      priority: 95,
    }),
    ERR_KEEP_KNEE_BENT: fb('Keep your knee bent at 90 degrees', 'Bend knee', {
      severity: 'warning',
      priority: 72,
    }),
    ERR_ARCHED_BACK: fb("Don't arch your back", 'Fix back', {
      severity: 'warning',
      priority: 78,
    }),
    LIFT_LEG: fb('Kick your leg back and up', 'Lift leg', {
      priority: 62,
    }),
    SQUEEZE_GLUTES: fb('Squeeze at the top', 'Squeeze', {
      priority: 60,
    }),
    LOWER_SLOWLY: fb('Lower your knee back down slowly', 'Slow down', {
      priority: 60,
    }),
    GOOD_REP: fb('Good kick!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
    REP_SUCCESS: fb('Good rep!', 'Good', {
      severity: 'success',
      priority: 55,
    }),
  },
};

/**
 * Convert unknown feedback codes to a readable fallback string.
 * Example:
 *   ERR_BODY_NOT_VISIBLE -> "Body Not Visible"
 *   CMD_GO_DOWN          -> "Go Down"
 */
function humanizeFeedbackCode(code: string): string {
  return code
    .replace(/^(ERR|CMD|SETUP|REP|HOLD|WARN)_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize feedback code to a stable internal format.
 */
function normalizeFeedbackCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Normalize exercise names so:
 * - "High Plank" => "high_plank"
 * - "high-plank" => "high_plank"
 * - "  side lying leg raise  " => "side_lying_leg_raise"
 */
function normalizeExerciseName(exerciseName: string): string {
  return exerciseName
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_');
}

function toI18nSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, '')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_');
}

function buildI18nKeys(code: string, exerciseName?: string): {
  messageKey: string;
  voiceKey?: string;
} {
  const codeSegment = toI18nSegment(code);
  const exerciseSegment = exerciseName ? toI18nSegment(exerciseName) : '';

  if (exerciseSegment) {
    return {
      messageKey: `feedback.exercise.${exerciseSegment}.${codeSegment}.message`,
      voiceKey: `feedback.exercise.${exerciseSegment}.${codeSegment}.voice`,
    };
  }

  return {
    messageKey: `feedback.default.${codeSegment}.message`,
    voiceKey: `feedback.default.${codeSegment}.voice`,
  };
}

function translateIfNeeded(
  value: string | undefined,
  key: string | undefined,
  translate?: FeedbackResolveOptions['translate'],
  params?: Record<string, string | number>
): string | undefined {
  if (!value) return undefined;
  if (!translate || !key) return value;
  return translate(key, value, params);
}

function buildResolvedFeedback(
  template: FeedbackTemplate,
  code: string,
  source: FeedbackSource,
  options?: FeedbackResolveOptions,
  exerciseName?: string,
  params?: Record<string, string | number>
): FeedbackInfo {
  const { messageKey, voiceKey } = buildI18nKeys(code, source === 'exercise_override' ? exerciseName : undefined);

  const message = translateIfNeeded(
    template.message,
    messageKey,
    options?.translate,
    params
  ) || template.message;

  const voice = translateIfNeeded(
    template.voice,
    voiceKey,
    options?.translate,
    params
  );

  return {
    ...template,
    message,
    voice,
    messageKey,
    voiceKey: template.voice ? voiceKey : undefined,
    source,
    code,
  };
}

function buildDynamicFeedback(
  code: string,
  source: Extract<FeedbackSource, 'dynamic_count' | 'dynamic_setup'>,
  message: string,
  voice: string | undefined,
  options?: FeedbackResolveOptions,
  params?: Record<string, string | number>
): FeedbackInfo {
  const baseKey =
    source === 'dynamic_count'
      ? 'feedback.dynamic.count'
      : 'feedback.dynamic.setup_hold';

  const resolvedMessage = options?.translate
    ? options.translate(`${baseKey}.message`, message, params)
    : message;

  const resolvedVoice =
    voice && options?.translate
      ? options.translate(`${baseKey}.voice`, voice, params)
      : voice;

  return {
    message: resolvedMessage,
    voice: resolvedVoice,
    severity: source === 'dynamic_count' ? 'success' : 'info',
    priority: source === 'dynamic_count' ? 100 : 70,
    messageKey: `${baseKey}.message`,
    voiceKey: voice ? `${baseKey}.voice` : undefined,
    source,
    code,
  };
}

function buildFallbackFeedback(
  code: string,
  options?: FeedbackResolveOptions
): FeedbackInfo {
  const fallbackMode = options?.fallbackMode ?? 'safe';

  const safeMessage = 'Adjust your form';
  const safeVoice = 'Adjust';

  const message =
    fallbackMode === 'humanized' ? humanizeFeedbackCode(code) : safeMessage;

  const voice =
    fallbackMode === 'humanized' ? undefined : safeVoice;

  const messageKey = 'feedback.fallback.message';
  const voiceKey = voice ? 'feedback.fallback.voice' : undefined;

  return {
    message: options?.translate
      ? options.translate(messageKey, message, { code })
      : message,
    voice:
      voice && options?.translate
        ? options.translate(voiceKey!, voice, { code })
        : voice,
    severity: 'warning',
    priority: 50,
    messageKey,
    voiceKey,
    source: 'fallback',
    code,
  };
}

/**
 * Resolve the correct feedback message for a feedback code.
 */
export function getFeedbackForCode(
  feedbackCode: string,
  exerciseName?: string,
  options: FeedbackResolveOptions = {}
): FeedbackInfo {
  const code = normalizeFeedbackCode(feedbackCode);

  // 1) Dynamic setup hold countdown
  if (code.startsWith('SETUP_HOLD_')) {
    const seconds = code.replace('SETUP_HOLD_', '') || '0';
    return buildDynamicFeedback(
      code,
      'dynamic_setup',
      `Hold still... ${seconds}`,
      `Hold ${seconds}`,
      options,
      { seconds }
    );
  }

  // 2) Dynamic rep counts (UI shows the number; voice service handles pronunciation)
  if (code.startsWith('COUNT_') || code.startsWith('REP_NUMBER_')) {
    const countNumber = code.split('_').pop() || '0';
    return buildDynamicFeedback(
      code,
      'dynamic_count',
      countNumber,
      countNumber,
      options,
      { count: countNumber }
    );
  }

  const normalizedExerciseName = exerciseName
    ? normalizeExerciseName(exerciseName)
    : undefined;

  // 3) Exercise-specific override
  if (normalizedExerciseName) {
    const exerciseOverrides = ExerciseSpecificFeedback[normalizedExerciseName];
    const overrideTemplate = exerciseOverrides?.[code];

    if (overrideTemplate) {
      return buildResolvedFeedback(
        overrideTemplate,
        code,
        'exercise_override',
        options,
        normalizedExerciseName
      );
    }
  }

  // 4) General mapping fallback
  const defaultTemplate = FeedbackMapping[code];
  if (defaultTemplate) {
    return buildResolvedFeedback(
      defaultTemplate,
      code,
      'default',
      options
    );
  }

  // 5) Safe fallback
  return buildFallbackFeedback(code, options);
}

/**
 * Returns all unique UI messages from both default and exercise-specific maps.
 */
export function getAllFeedbackMessages(): string[] {
  const messages = new Set<string>();

  Object.values(FeedbackMapping).forEach((info) => {
    messages.add(info.message);
  });

  Object.values(ExerciseSpecificFeedback).forEach((overrides) => {
    Object.values(overrides).forEach((info) => {
      messages.add(info.message);
    });
  });

  return Array.from(messages).sort();
}

/**
 * Returns all unique voice prompts from both default and exercise-specific maps.
 */
export function getAllVoiceMessages(): string[] {
  const voices = new Set<string>();

  Object.values(FeedbackMapping).forEach((info) => {
    if (info.voice) voices.add(info.voice);
  });

  Object.values(ExerciseSpecificFeedback).forEach((overrides) => {
    Object.values(overrides).forEach((info) => {
      if (info.voice) voices.add(info.voice);
    });
  });

  return Array.from(voices).sort();
}

/**
 * Returns all known feedback codes from both default and exercise-specific maps.
 */
export function getAllFeedbackCodes(): string[] {
  const codes = new Set<string>();

  Object.keys(FeedbackMapping).forEach((code) => codes.add(code));

  Object.values(ExerciseSpecificFeedback).forEach((overrides) => {
    Object.keys(overrides).forEach((code) => codes.add(code));
  });

  return Array.from(codes).sort();
}

/**
 * Check whether a feedback code is explicitly known
 * (excluding dynamic COUNT_* and SETUP_HOLD_* patterns).
 */
export function hasFeedbackCode(
  feedbackCode: string,
  exerciseName?: string
): boolean {
  const code = normalizeFeedbackCode(feedbackCode);

  if (code.startsWith('COUNT_') || code.startsWith('REP_NUMBER_') || code.startsWith('SETUP_HOLD_')) {
    return true;
  }

  const normalizedExerciseName = exerciseName
    ? normalizeExerciseName(exerciseName)
    : undefined;

  if (
    normalizedExerciseName &&
    ExerciseSpecificFeedback[normalizedExerciseName]?.[code]
  ) {
    return true;
  }

  return code in FeedbackMapping;
}