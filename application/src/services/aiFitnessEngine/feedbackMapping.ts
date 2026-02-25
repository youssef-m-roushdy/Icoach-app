/**
 * AI Fitness Engine - Feedback Mapping
 * Maps feedback codes to voice/UI messages.
 * * Based STRICTLY on the provided Excel Documentation.
 * Columns used: Feedback Code (Python) -> UI Message (Text to Display)
 */

export interface FeedbackInfo {
  message: string; // الكلام اللي هيظهر على الشاشة (طويل وتفصيلي)
  voice?: string;  // الكلام اللي هيتقال صوتي (قصير ومختصر)
}

/**
 * 1. GENERAL / DEFAULT MAPPING
 * الرسائل الأساسية التي تنطبق على معظم التمارين
 */
export const FeedbackMapping: Record<string, FeedbackInfo> = {
  // --- SQUAT ---
  ERR_BODY_NOT_VISIBLE: { message: 'Step back to show full body' },
  SETUP_STAND_STRAIGHT: { message: 'Stand straight & hold still' },
  CMD_GO_DOWN: { message: 'Go Down' },
  FIX_LOWER_HIPS: { message: 'Lower your hips more' },

  // --- SUPERMAN ---
  ERR_NOT_LYING_FLAT: { message: 'Lie on your stomach' },
  HOLD_STABILIZE: { message: 'Hold...' },
  ERR_LIFT_LEGS: { message: 'Lift your legs too' },
  ERR_LIFT_ARMS: { message: 'Lift your arms too' },
  ERR_RESET_FULL: { message: 'Rest fully on the floor' },

  // --- LEG RAISES ---
  START_POSITION: { message: 'Lie on your back' },
  ERR_LEGS_SYNC: { message: 'Keep feet together' },
  CMD_RAISE_LEGS: { message: 'Raise your legs' },
  CMD_LOWER_SLOWLY: { message: 'Lower slowly' },

  // --- PLANK ---
  SETUP_POSITION: { message: 'Get into plank position' },
  ERR_HIPS_TOO_LOW: { message: 'Raise your hips' },
  ERR_HIPS_TOO_HIGH: { message: 'Lower your hips' },
  ERR_BENT_ELBOWS: { message: 'Straighten your arms' },
  ERR_KNEES_TOUCHING: { message: 'Knees off the floor' },
  HOLD_FIXED: { message: 'Hold steady...' },
  ERR_BACK_SAG: { message: 'Straighten your back' },
  ERR_ARMS_TOO_STRAIGHT: { message: 'Rest on your elbows' },

  // ✅ (جديد) لو الكوع وضعه مش مريح أو غلط
  ERR_BAD_ELBOW_POSITION: { message: 'Align elbows under shoulders', voice: 'Fix elbows' },

  // 3. الثبات والنجاح
  HOLD_STEADY: { message: 'Stabilizing...', voice: 'Steady' },

  // --- CRUNCH ---
  ERR_HANDS_POSITION: { message: 'Keep hands behind head' },

  // --- JUMPING JACKS (Defaults) ---
  FIX_POSTURE: { message: 'Adjust posture / Camera' },
  CMD_JUMP_OPEN: { message: 'Jump & Open!' },
  CMD_JUMP_CLOSE: { message: 'Jump & Close!' },
  ERR_LEGS_WIDTH: { message: 'Wider legs!' },
  ERR_ARMS_LAZY: { message: 'Arms higher!' },

  // --- GENERIC Defaults ---
  SYSTEM_READY_GO: { message: 'GO!' },
  REP_SUCCESS: { message: 'Perfect!' },
  ERR_BENT_KNEES: { message: 'Straighten your legs' },
  CMD_GO_UP: { message: 'Fly Up (Arms & Legs)' },
};

/**
 * 2. EXERCISE SPECIFIC OVERRIDES
 * الاستثناءات الخاصة بكل تمرين
 */
export const ExerciseSpecificFeedback: Record<string, Record<string, FeedbackInfo>> = {
  squat: {
    // ✅ Squat Specific Fixes
    FIX_LOWER_HIPS: { message: 'Go Deeper!', voice: 'Lower' }, // تشجيع للنزول
    CMD_GO_UP: { message: 'Stand Up', voice: 'Up' },           // أمر الصعود
    CMD_GO_DOWN: { message: 'Squat Down', voice: 'Down' },     // أمر النزول
  },

  superman: {
    // 1. التجهيز
    ERR_NOT_LYING_FLAT: { message: 'Lie flat on your stomach', voice: 'Lie down' },
    SYSTEM_READY_GO: { message: 'Ready... Fly!', voice: 'Ready' },
    
    // 2. التوجيه
    CMD_GO_UP: { message: 'Lift arms & legs together', voice: 'Up' },
    
    // 3. الأخطاء
    ERR_LIFT_LEGS: { message: 'Lift your legs too!', voice: 'Legs up' },
    ERR_LIFT_ARMS: { message: 'Lift your arms too!', voice: 'Arms up' },
    ERR_RESET_FULL: { message: 'Lower fully to reset', voice: 'Down' },
    
    // 4. الثبات والنجاح
    HOLD_STABILIZE: { message: 'Hold...', voice: 'Hold' },
    REP_SUCCESS: { message: 'Good job!', voice: 'Good' },
  },

  leg_raises: {
    // 1. التجهيز
    START_POSITION: { message: 'Lie flat, legs straight', voice: 'Get ready' },
    
    // 2. الأخطاء
    ERR_BENT_KNEES: { message: 'Keep legs straight!', voice: 'Straighten legs' },
    ERR_LEGS_SYNC: { message: 'Keep feet together!', voice: 'Feet together' },
    
    // 3. التوجيه
    CMD_RAISE_LEGS: { message: 'Lift legs up high', voice: 'Up' },
    CMD_LOWER_SLOWLY: { message: 'Lower slowly...', voice: 'Down slow' },
    
    // 4. العد
    REP_SUCCESS: { message: 'Good!', voice: 'Good' },
  },

  crunch: {
    // 1. التجهيز
    START_POSITION: { message: 'Lie down, knees bent', voice: 'Start position' },
    
    // 2. التوجيه
    CMD_GO_UP: { message: 'Crunch up!', voice: 'Up' },
    CMD_GO_DOWN: { message: 'Lower down', voice: 'Down' },
    
    // 3. الأخطاء
    // ⚠️ لاحظ هنا عكسنا الرسالة عن تمرين الرجل
    ERR_BENT_KNEES: { message: 'Bend your knees!', voice: 'Bend knees' }, 
    
    // كود جديد
    ERR_HANDS_POSITION: { message: 'Don’t pull your neck!', voice: 'Fix hands' },
    
    // مستخدم من قبل
    ERR_LEGS_SYNC: { message: 'Keep feet together', voice: 'Feet together' },
    
    // 4. العد
    REP_SUCCESS: { message: 'Good!', voice: 'One' },
  },

  jumping_jacks: {
    // ... القديم (SYSTEM_READY_GO, REP_SUCCESS)

    // ✅ التوجيه المزدوج (عشان هو Strict لازم يعمل الاتنين)
    CMD_OPEN_LEGS_AND_RAISE_ARMS: { message: 'Jump! Open Legs & Arms', voice: 'Jump Open' },
    CMD_CLOSE_LEGS_AND_LOWER_ARMS: { message: 'Jump! Close Legs & Arms', voice: 'Jump Close' },

    // ✅ تصحيح الأخطاء الفردية
    ERR_RAISE_ARMS: { message: 'Arms Up High!', voice: 'Arms Up' },
    CMD_LOWER_ARMS: { message: 'Arms Down!', voice: 'Arms Down' },
    
    // ✅ القديم خليه زي ما هو احتياطي
    CMD_JUMP_OPEN: { message: 'Open Legs!', voice: 'Open' },
    CMD_JUMP_CLOSE: { message: 'Close Legs!', voice: 'Close' },
  },
  
  high_plank: {
    SETUP_POSITION: { message: 'High Plank: Straight arms', voice: 'High Plank' },
    
    // الأخطاء
    ERR_BENT_ELBOWS: { message: 'Straighten your arms!', voice: 'Straighten arms' },
    ERR_HIPS_TOO_LOW: { message: 'Lift hips slightly', voice: 'Hips up' },
    ERR_BACK_SAG: { message: 'Engage core, lift hips', voice: 'Fix back' },
    ERR_HIPS_TOO_HIGH: { message: 'Lower hips slightly', voice: 'Lower hips' },
    ERR_KNEES_TOUCHING: { message: 'Knees off the floor', voice: 'Knees up' },
    
    // النجاح
    HOLD_STEADY: { message: 'Stabilizing...', voice: 'Steady' },
    HOLD_FIXED: { message: 'Perfect! Hold', voice: 'Hold' },
  },

  elbow_plank: {
    // Elbow plank specific logic if needed
    ERR_ARMS_TOO_STRAIGHT: { message: 'Lower down to your elbows!', voice: 'Down on elbows' },
  },

  // ========================================================
  // 🔥 NEW EXERCISES ADDED (With Short Voice Feedback) 🔥
  // ========================================================

  lateral_raises: {
    ERR_BODY_NOT_VISIBLE: { message: 'Stand facing camera, full body', voice: 'Show body' },
    CMD_RAISE_ARMS: { message: 'Raise arms to sides', voice: 'Arms up' },
    
    // ✅ الأكواد الجديدة
    CMD_RAISE_HIGHER: { message: 'Higher! Reach shoulder level', voice: 'Higher' },
    PERFECT_LEVEL: { message: 'Perfect! Hold...', voice: 'Hold' },
    HOLD_STEADY: { message: 'Stabilize...', voice: 'Steady' },
    
    // ✅ الأخطاء والتصحيح
    STRAIGHTEN_ARMS: { message: 'Keep arms straight!', voice: 'Straighten arms' },
    ERR_TOO_HIGH: { message: 'Too high! Lower slightly', voice: 'Too high' },
    FIX_POSTURE: { message: 'Move arms together', voice: 'Sync arms' },

    // ✅ رسائل إلغاء العدة (بتظهر لما ينزل وهو كان عامل غلطة)
    REP_INVALID_BENT_ELBOW: { message: 'Rep missed: Bent elbows', voice: 'Keep straight' },
    REP_INVALID_TOO_HIGH: { message: 'Rep missed: Went too high', voice: 'Shoulder level only' },
    REP_INVALID_UNSYNC: { message: 'Rep missed: Arms not synced', voice: 'Move together' },
    
    REP_SUCCESS: { message: 'Lower slowly...', voice: 'Down slow' },
  },

  // 2. Front Raises (Updated)
  front_raises: {
    ERR_BODY_NOT_VISIBLE: { message: 'Stand facing the camera', voice: 'Face camera' }, // عدلتها عشان نوضح إننا عايزين وش الكاميرا
    CMD_RAISE_FRONT: { message: 'Raise arms in front', voice: 'Raise front' },
    
    // ✅ الإضافات الناقصة
    STRAIGHTEN_ARMS: { message: 'Keep elbows straight', voice: 'Straighten arms' },
    ERR_TOO_HIGH: { message: "Shoulder level only", voice: 'Too high' },
    
    // ✅ تعديل رسالة التزامن (عشان اللوجيك بيستخدمها لما الدراعين ميكونوش ماشيين مع بعض)
    ERR_SWINGING: { message: 'Move arms together', voice: 'Sync arms' }, 

    RAISE_YOUR_ARM: { message: 'Raise higher to chest', voice: 'Higher' },
    GOOD_REP: { message: 'Control...', voice: 'Good' },
    REP_SUCCESS: { message: 'Nice Work!', voice: 'Great' },

    HOLD_POSITION: { message: 'Hold briefly', voice: 'Hold' },
    CONTINUE_RAISING: { message: 'Keep going up', voice: '' }, // ممكن تخليه ساكت هنا
    CMD_LOWER_SLOWLY: { message: 'Lower slowly', voice: 'Down slow' },
  },

  standing_overhead_press: {
    SETUP_POSITION: { message: 'Ready', voice: 'Ready' },
    
    // التوجيهات
    PUSH_UP: { message: 'Push Up!', voice: 'Push' },
    PERFECT_LOCKOUT: { message: 'Hold...', voice: 'Good' },
    CMD_PUSH_HIGHER: { message: 'Push Higher! Lock elbows', voice: 'Higher' },
    LOWER_SLOWLY: { message: 'Lower slowly', voice: 'Slow down' },
    
    // الأخطاء
    ERR_ARMS_UNSYNC: { message: 'Push evenly with both arms', voice: 'Even push' },
    ERR_ARCHED_BACK: { message: 'Straighten your back!', voice: 'Fix back' },
    
    // النجاح
    REP_SUCCESS: { message: 'Good Rep!', voice: 'Good' },
  },

  ///////////////////////////////////////////////////////////////////////////////////////////

  // --- NEW 8 EXERCISES ---

high_knees: {
    SETUP_POSITION: { message: 'Stand tall, run in place', voice: 'High Knees' },
    SETUP_STAND_STILL: { message: 'Stand still to calibrate...', voice: 'Stand Still' }, // الرسالة الجديدة
    
    START_MOVING: { message: 'Lift knees high!', voice: 'Go' },
    CMD_KNEES_HIGHER: { message: 'Keep Going!', voice: 'Keep Going' },
    
    ERR_STAND_TALL: { message: 'Don\'t hunch! Chest UP', voice: 'Chest Up' },
    
    REP_SUCCESS: { message: 'Good Pace!', voice: 'Good' },
  },

knee_tap: {
    SETUP_POSITION: { message: 'Stand straight, tap opposite knee', voice: 'Knee Tap' },
    
    // التوجيه
    CMD_TOUCH_KNEE: { message: 'Touch opposite knee', voice: 'Tap Knee' },
    CMD_KNEES_HIGHER: { message: 'Lift knee higher!', voice: 'Higher' },
    
    // الأخطاء (الغش)
    ERR_TOUCH_KNEE_NOT_THIGH: { message: 'Aim lower! Touch the KNEE', voice: 'Touch Knee' },
    ERR_BACK_BENT_CHEATING: { message: 'Don\'t bend back! Stand TALL', voice: 'Stand Straight' }, // دي الرسالة اللي هتظهر لو وطيت
    
    // النجاح
    REP_SUCCESS: { message: 'Good!', voice: 'Good' },
  },
pike_pushup: {
    SETUP_POSITION: { message: 'Get into V-Shape (Pike)', voice: 'Pike Position' },
    
    // الأخطاء والتوجيهات
    SETUP_V_SHAPE: { message: 'Hips UP! Make a V shape', voice: 'Hips Up' },
    FIX_KNEES: { message: 'Straighten your legs!', voice: 'Straighten Legs' },
    
    CMD_GO_DOWN: { message: 'Lower head to floor', voice: 'Down' },
    PUSH_UP: { message: 'Push back up!', voice: 'Push' },
    
    REP_SUCCESS: { message: 'Strong Shoulders!', voice: 'Good' },
  },

static_split_squat: {
    // وضع الاستعداد
    SETUP_POSITION: { message: 'One foot forward, one back', voice: 'Split Squat' },
    SETUP_SPLIT_STANCE: { message: 'Take a wide step back', voice: 'Step Back' },
    KEEP_SPLIT_STANCE: { message: 'Keep feet apart!', voice: 'Keep Stance' },
    
    // الأوامر الحركية
    CMD_GO_DOWN: { message: 'Lower back knee to floor', voice: 'Down' },
    CMD_GO_LOWER: { message: 'Go Lower!', voice: 'Lower' },
    CMD_HOLD: { message: 'Almost there, hold...', voice: 'Hold' },
    CMD_STAND_UP: { message: 'Push Up!', voice: 'Up' },
    
    // حالات التثبيت (عشان المستخدم ميتخضش لما الكود يستنى)
    HOLD_BOTTOM: { message: 'Steady...', voice: 'Steady' },
    HOLD_TOP: { message: 'Wait...', voice: 'Wait' },
    
    // التحذيرات
    WARN_KEEP_FEET_FIXED: { message: 'Keep feet glued to floor!', voice: 'Fix Feet' },
    
    // النجاح
    REP_SUCCESS: { message: 'Good Rep!', voice: 'Good' },
  },
chair_squat: {
    // ...
    // Error for going too deep
    ERR_TOO_DEEP: { message: 'Too Deep! Just touch the chair', voice: 'Too Low' },
    
    // ... باقي الرسايل
    CMD_GO_DOWN: { message: 'Sit back onto chair', voice: 'Sit Back' },
    CMD_GO_LOWER: { message: 'Touch the chair!', voice: 'Lower' },
    CMD_STAND_UP: { message: 'Stand up fully!', voice: 'Up' },
    ERR_BACK_BENT: { message: 'Keep chest UP!', voice: 'Chest Up' },
    REP_SUCCESS: { message: 'Good!', voice: 'Good' },
  },
glute_bridge: {
    SETUP_POSITION: { message: 'Lie down, knees bent', voice: 'Glute Bridge' },
    SETUP_LIE_DOWN: { message: 'Lie on back, feet flat', voice: 'Setup' },
    
    CMD_PUSH_HIPS: { message: 'Push hips to ceiling', voice: 'Up' },
    CMD_PUSH_HIGHER: { message: 'Squeeze Glutes! Higher!', voice: 'Higher' },
    HOLD_BRIDGE: { message: 'Hold... Squeeze!', voice: 'Hold' },
    
    // Anti-Cheat
    ERR_ARCHING_BACK: { message: 'Don\'t arch back! Ribs down', voice: 'Fix Back' },
    
    REP_SUCCESS: { message: 'Good Squeeze!', voice: 'Good' },
  },
bird_dog: {
    SETUP_POSITION: { message: 'Hands & knees, back flat', voice: 'Bird Dog' },
    SETUP_ALL_FOURS: { message: 'Tabletop position', voice: 'Ready' },
    
    CMD_EXTEND: { message: 'Extend Arm & Leg', voice: 'Extend' },
    CMD_RAISE_OPPOSITE_ARM: { message: 'Raise Opposite Arm!', voice: 'Raise Arm' },
    
    // ✅ (NEW) رسالة التحفيز للاكتمال
    CMD_EXTEND_FULLY: { message: 'Kick Higher! Extend Fully', voice: 'Extend More' },
    
    ERR_OPPOSITE_LIMBS: { message: 'Wrong! Use Opposite Sides', voice: 'Opposite Sides' },
    ERR_FLATTEN_BACK: { message: 'Flatten your back!', voice: 'Flat Back' },
    ERR_STRAIGHTEN_LEG: { message: 'Straighten your knee!', voice: 'Straighten Knee' },
    
    HOLD_EXTENSION: { message: 'Hold...', voice: 'Hold' },
    REP_SUCCESS: { message: 'Great Balance!', voice: 'Good' },
  },
// في ملف feedbackMapping.ts

  reverse_lunge: {
    // وضع الاستعداد
SETUP_POSITION: { message: 'Stand tall, feet together', voice: 'Reverse Lunge' },
    SETUP_STAND_STRAIGHT: { message: 'Stand tall, feet together', voice: 'Stand Tall' },
    SETUP_FULL_BODY_VISIBLE: { message: 'Step back to show full body', voice: 'Show Body' },
    ERR_BODY_NOT_VISIBLE: { message: 'Body not visible', voice: 'Check Camera' },

    // أثناء الحركة (النزول)
    CMD_GO_LOWER: { message: 'Step back & drop knee', voice: 'Lunge Down' },
    
    // أثناء الحركة (الرجوع)
    CMD_RETURN_START: { message: 'Push back to start', voice: 'Push Back' },
    CMD_STAND_UP: { message: 'Stand up fully', voice: 'Up' },
    CMD_FEET_TOGETHER: { message: 'Bring feet together!', voice: 'Feet Together' },

    // تصحيح الأخطاء (Anti-Cheat)
    ERR_STEP_FURTHER_BACK: { message: 'Take a bigger step back!', voice: 'Bigger Step' },

    // النجاح
    REP_SUCCESS: { message: 'Good Lunge!', voice: 'Good' },
  },


  v_ups: {
    SETUP_POSITION: { message: 'Lie flat, arms overhead', voice: 'Lie Down' },
    
    // التوجيهات
    CMD_UP_V: { message: 'Lift Legs & Torso (V-Shape)', voice: 'Up' },
    CMD_REACH_TOES: { message: 'Reach for your toes!', voice: 'Reach' },
    CMD_GO_DOWN: { message: 'Lower down slowly', voice: 'Down' },
    
    // منع الغش
    ERR_KNEES_BENT: { message: 'Keep Legs STRAIGHT!', voice: 'Straight Legs' },
    
    // النجاح
    REP_SUCCESS: { message: 'Perfect V!', voice: 'Good' },
  },

  ///////////////////////////////////////////////////////////////////////////////



  // 1. Bent Knee Dip
bent_knee_dip: {
    SETUP_POSITION: { message: 'Sit on edge, knees at 90°', voice: 'Setup' },
    ERR_CAMERA_VIEW: { message: 'Show full body side view', voice: 'Check Camera' },
    
    // تصحيح الركبة
    ERR_BEND_KNEES: { message: 'Keep knees bent at 90°!', voice: 'Fix Knees' },
    
    GO_DOWN: { message: 'Lower your body', voice: 'Down' },
    PUSH_UP: { message: 'Push back up', voice: 'Up' },
    GOOD_REP: { message: 'Good Dip!', voice: 'Good' },
    CMD_GO_LOWER: { message: 'Go Lower! Bend elbows more', voice: 'Lower' },
  },

  // 2. Classic Push Up
classic_push_up: {
    // التعليمات الأولية
    SETUP_POSITION: { message: 'Plank position, arms straight', voice: 'Plank Position' },
    ERR_CAMERA_VIEW: { message: 'Show full body side view', voice: 'Check Camera' },

    // تصحيح الأخطاء (Anti-Cheat)
    ERR_FIX_BACK: { message: "Don't sag! Keep back straight", voice: 'Fix Back' },
    ERR_KNEES_DROP: { message: 'Keep knees OFF the floor!', voice: 'Knees Up' },

    // التوجيه أثناء الحركة
    GO_DOWN: { message: 'Lower your chest', voice: 'Down' },
    CMD_GO_LOWER: { message: 'Go Lower! Hit 90°', voice: 'Lower' }, // لو نزل نص نزلة
    PUSH_UP: { message: 'Push back up', voice: 'Push Up' },

    // النجاح
    GOOD_REP: { message: 'Strong Rep!', voice: 'Good' },
  },

knee_push_up: {
   SETUP_POSITION: { message: 'Knees on floor, body straight', voice: 'Setup' },
   ERR_CAMERA_VIEW: { message: 'Show full body side view', voice: 'Check Camera' },

   // رسائل الأخطاء
   ERR_HIPS_BACK: { message: "Don't stick your hips back!", voice: 'Hips Forward' }, // أهم واحدة

   // رسائل الحركة
   GO_DOWN: { message: 'Lower your chest', voice: 'Down' },
   CMD_GO_LOWER: { message: 'Go Lower! Chest to floor', voice: 'Lower' }, // لو نزل نص نزلة
   PUSH_UP: { message: 'Push back up', voice: 'Push Up' },

   GOOD_REP: { message: 'Perfect!', voice: 'Perfect' },

   ERR_LIFT_FEET: { message: 'Lift your feet off the floor!', voice: 'Feet Up' }, // دي الجديدة
},

  // 4. Straight Leg Dip
  straight_leg_dip: {
    SETUP_POSITION: { message: 'Hands on chair, legs straight', voice: 'Setup' },
    ERR_CAMERA_VIEW: { message: 'Show full body side view', voice: 'Check Camera' },
    
    GO_DOWN: { message: 'Dip down', voice: 'Down' },
    PUSH_UP: { message: 'Push back up', voice: 'Up' },
    
    // الخطأ الخاص بالتمرين ده
    STRAIGHTEN_LEGS: { message: 'Keep legs fully straight!', voice: 'Straighten Legs' },
    
    GOOD_REP: { message: 'Strong Dip!', voice: 'Good' },
  },

  // 5. Toe Touch
toe_touch: {
    ERR_CAMERA_VIEW: { message: 'Show full body', voice: 'Camera' },
    STAND_TALL: { message: 'Stand tall to start', voice: 'Ready' },
    KICK_AND_TOUCH: { message: 'Kick & Touch Toes!', voice: 'Kick' },
    
    // الأخطاء
    KICK_HIGHER: { message: 'Kick Higher!', voice: 'Kick Higher' },
    
    // النجاح
    GOOD_REP: { message: 'Nice Touch!', voice: 'Good' },
  },

  // 6. Inchworm
inchworm: {
    SETUP_POSITION: { message: 'Stand tall, feet together', voice: 'Stand Tall' },
    ERR_CAMERA_VIEW: { message: 'Show full body side view', voice: 'Check Camera' },
    
    // المراحل
    WALK_OUT: { message: 'Walk hands out to Plank', voice: 'Walk Out' },
    HOLD_PLANK: { message: 'Hold Plank position...', voice: 'Hold' },
    WALK_BACK: { message: 'Walk hands back to feet', voice: 'Walk Back' },
    STAND_UP: { message: 'Stand up fully to finish', voice: 'Stand Up' },
    
    // الأخطاء (في البلانك)
    ERR_LOWER_HIPS: { message: 'Lower hips! Body straight', voice: 'Lower Hips' },
    ERR_LIFT_HIPS: { message: 'Lift hips! Don\'t sag', voice: 'Lift Hips' },
    
    GOOD_REP: { message: 'Good Job!', voice: 'Great' },
  },

  // 7. Side Lying Leg Raise
side_lying_leg_raise: {
    SETUP_POSITION: { message: 'Lie on side, legs straight', voice: 'Lie Down' },
    ERR_CAMERA_VIEW: { message: 'Full body must be visible', voice: 'Check Camera' },
    
    // أوامر الحركة
    LIFT_LEG: { message: 'Lift your top leg', voice: 'Lift' },
    CMD_LIFT_HIGHER: { message: 'Higher! Squeeze glutes', voice: 'Higher' },
    LOWER_SLOWLY: { message: 'Lower leg slowly', voice: 'Lower' },
    
    // الأخطاء
    ERR_STRAIGHTEN_LEG: { message: 'Keep knee straight!', voice: 'Straighten Leg' },
    
    GOOD_REP: { message: 'Good Lift!', voice: 'Good' },
  },

  // 8. Knee Tucks
 knee_tucks: {
    SETUP_POSITION: { message: 'Sit, lean back, lift legs', voice: 'Setup' },
    ERR_CAMERA_VIEW: { message: 'Show full side view', voice: 'Check Camera' },
    
    // الأوامر
    TUCK_IN: { message: 'Pull knees to chest', voice: 'Tuck' },
    EXTEND_LEGS: { message: 'Extend legs out', voice: 'Extend' },
    SQUEEZE_ABS: { message: 'Squeeze abs!', voice: 'Squeeze' },
    
    // الأخطاء
    ERR_EXTEND_FULLY: { message: 'Straighten legs fully!', voice: 'Extend Fully' },
    ERR_KEEP_FEET_UP: { message: "Don't let heels touch floor!", voice: 'Feet Up' },
    
    GOOD_REP: { message: 'Good Tuck!', voice: 'Good' },
  },

  // 9. Donkey Kick
donkey_kick: {
    SETUP_POSITION: { message: 'Get on all fours', voice: 'Setup' },
    ERR_CAMERA_VIEW: { message: 'Show full side view', voice: 'Check Camera' },
    
    // الأخطاء
    ERR_KEEP_KNEE_BENT: { message: 'Keep knee bent at 90°!', voice: 'Bend Knee' },
    ERR_ARCHED_BACK: { message: "Don't arch your back!", voice: 'Fix Back' },
    
    // الحركة
    LIFT_LEG: { message: 'Kick leg back & up', voice: 'Lift' },
    SQUEEZE_GLUTES: { message: 'Squeeze at top!', voice: 'Squeeze' },
    LOWER_SLOWLY: { message: 'Lower knee to floor', voice: 'Lower' },
    
    GOOD_REP: { message: 'Good Kick!', voice: 'Good' },
  },


////////////////////////////////////////////////////////////////



};

/**
 * Helper function to resolve the correct message
 */
export function getFeedbackForCode(
  feedbackCode: string,
  exerciseName?: string
): FeedbackInfo {
  // 1. Handle Dynamic Codes (SETUP_HOLD_{N})
  if (feedbackCode.startsWith('SETUP_HOLD_')) {
    const seconds = feedbackCode.replace('SETUP_HOLD_', '');
    return {
      message: `Hold Still... ${seconds}`,
      voice: `Hold ${seconds}`
    };
  }

  // 2. Check Exercise Specific Overrides First
  if (exerciseName) {
    const normalizedName = exerciseName.toLowerCase().replace(/ /g, '_');
    const exerciseOverrides = ExerciseSpecificFeedback[normalizedName];
    
    if (exerciseOverrides && exerciseOverrides[feedbackCode]) {
      return exerciseOverrides[feedbackCode];
    }
  }

  // 3. Fallback to General Mapping
  return (
    FeedbackMapping[feedbackCode] || {
      message: feedbackCode.replace(/_/g, ' '),
    }
  );
}

// For testing purposes
export function getAllFeedbackMessages(): string[] {
  const messages = new Set<string>();
  Object.values(FeedbackMapping).forEach((info) => messages.add(info.message));
  Object.values(ExerciseSpecificFeedback).forEach((overrides) => {
    Object.values(overrides).forEach((info) => messages.add(info.message));
  });
  return Array.from(messages);
}