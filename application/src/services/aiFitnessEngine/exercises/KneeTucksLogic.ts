import { ExerciseLogic, RepExerciseResult, Landmark, FeedbackSignal } from '../types';

export interface KneeTucksResult extends RepExerciseResult {
  exercise: 'knee_tucks';
}

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  // زوايا الحركة
  KNEE_EXTENDED_MIN: 140, // زاوية الفرد
  KNEE_TUCKED_MAX: 105,   // زاوية الضم (نقطة احتساب العدة)
  HIP_TUCK_MAX: 110,      // زاوية الحوض عند الضم
  
  // التوقيت
  STABLE_FRAMES: 5,        // ثبات للتأكد من الحركة
  SETUP_HOLD_TIME: 20,     // ثبات طويل في البداية (تقريباً ثانية) لمنع العد الوهمي
  
  // حد لمس الأرض (بقيمة صغيرة جداً لكشف أي لمسة خفيفة)
  // كل ما الرقم قل، كل ما صار الكشف أكثر حساسية. 0.02 يعني ارتفاع بسيط جداً (أقل من سم الإصبع)
  FLOOR_TOUCH_THRESHOLD: 0.02,
} as const;

const EMA_ALPHA = 0.4;

export class KneeTucksLogic implements ExerciseLogic {
  // الحالات:
  // setup: بنظبط القعدة
  // extended: الرجل مفرودة (وهنا بنراقب لمس الأرض)
  // tucked: الرجل مضمومة (وهنا بنحسب العدة)
  private state: 'setup' | 'extended' | 'tucked' = 'setup';
  
  private reps: number = 0;
  private feedback_code: FeedbackSignal = 'SETUP_POSITION';
  private is_correct: boolean = false;
  
  private stableFrames: number = 0;
  private setupTimer: number = 0;
  
  // المتغير ده هو "الحارس". لو لمست الأرض بيبقى true، ولما تيجي تضم مش هيحسب العدة
  private repInvalidated: boolean = false; 

  private smKneeAngle: number = 180;
  private smHipAngle: number = 180;

  reset(): void {
    this.state = 'setup';
    this.reps = 0;
    this.feedback_code = 'SETUP_POSITION';
    this.is_correct = false;
    this.stableFrames = 0;
    this.setupTimer = 0;
    this.repInvalidated = false;
    
    this.smKneeAngle = 180;
    this.smHipAngle = 180;
  }

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    if (!a || !b || !c) return 180;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  private ema(prev: number, curr: number): number {
    return EMA_ALPHA * curr + (1 - EMA_ALPHA) * prev;
  }

  analyze(landmarks: Landmark[]): KneeTucksResult {
    // 1. تحديد الجانب والرؤية
    const leftVis = landmarks[LANDMARK_INDICES.LEFT_SHOULDER]?.visibility ?? 0;
    const rightVis = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER]?.visibility ?? 0;
    const isLeft = leftVis > rightVis;

    const indices = isLeft ? {
      sh: LANDMARK_INDICES.LEFT_SHOULDER,
      hip: LANDMARK_INDICES.LEFT_HIP,
      knee: LANDMARK_INDICES.LEFT_KNEE,
      ank: LANDMARK_INDICES.LEFT_ANKLE
    } : {
      sh: LANDMARK_INDICES.RIGHT_SHOULDER,
      hip: LANDMARK_INDICES.RIGHT_HIP,
      knee: LANDMARK_INDICES.RIGHT_KNEE,
      ank: LANDMARK_INDICES.RIGHT_ANKLE
    };

    const isVisible = [indices.sh, indices.hip, indices.knee, indices.ank]
      .every(idx => (landmarks[idx]?.visibility ?? 0) > 0.4);

    if (!isVisible) {
      return {
        exercise: 'knee_tucks',
        reps: this.reps,
        stage: this.state === 'setup' ? 'extended' : this.state as 'extended' | 'tucked',
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
      };
    }

    // 2. حساب الزوايا
    const sh = landmarks[indices.sh];
    const hip = landmarks[indices.hip];
    const knee = landmarks[indices.knee];
    const ank = landmarks[indices.ank];

    const rawKneeAngle = this.calculateAngle(hip, knee, ank);
    const rawHipAngle = this.calculateAngle(sh, hip, knee);

    this.smKneeAngle = this.ema(this.smKneeAngle, rawKneeAngle);
    this.smHipAngle = this.ema(this.smHipAngle, rawHipAngle);

    // 3. المنطق (Logic)

    // 🔴 Phase 1: Setup (البوابة الصارمة جداً)
    if (this.state === 'setup') {
        // لازم الرجل تكون مفرودة والحوض مفتوح (يعني ممدد جسمك)
        const isLegsExtended = this.smKneeAngle > 140;
        const isLeaningBack = this.smHipAngle > 100;

        if (isLegsExtended && isLeaningBack) {
            this.setupTimer++;
            // لازم تثبت فترة كافية (20 فريم) عشان نضمن إنك مش بتبدل رجلك أو بتقوم
            if (this.setupTimer > THRESHOLDS.SETUP_HOLD_TIME) {
                this.state = 'extended';
                this.setupTimer = 0;
                this.feedback_code = 'TUCK_IN';
            } else {
                this.feedback_code = 'SETUP_POSITION'; // "اثبت..."
            }
        } else {
            this.setupTimer = 0;
            this.feedback_code = 'SETUP_POSITION';
        }

        return {
            exercise: 'knee_tucks',
            reps: this.reps,
            stage: 'extended',
            feedback_code: this.feedback_code,
            is_correct: true
        };
    }

    // 🔴 Phase 2: Active Exercise

    // فحص لمس الأرض المستمر - تم تعديل العتبة لتصبح أكثر حساسية (0.02)
    // الشرط: الكاحل أصبح أقل من الحوض بمقدار 0.02 على الأقل (أي نزل لتحت) يعني لمس الأرض
    const touchingFloor = ank.y > hip.y + THRESHOLDS.FLOOR_TOUCH_THRESHOLD;

    // المنطق:
    // إحنا دلوقتي في وضع EXTENDED (الرجل مفرودة).
    // طول ما إحنا هنا، بنراقب هل لمس الأرض ولا لأ.
    if (this.state === 'extended') {
        
        // لو لمس الأرض في أي لحظة وهو مفرود -> العدة باظت
        if (touchingFloor) {
            this.repInvalidated = true;
            this.feedback_code = 'ERR_KEEP_FEET_UP';
            this.is_correct = false;
        } 
        else {
            this.is_correct = true;
            
            // لو العدة باظت، فكره يرفع رجله، غير كده قوله يضم
            if (this.repInvalidated) {
                 this.feedback_code = 'ERR_KEEP_FEET_UP';
            } else {
                 this.feedback_code = 'TUCK_IN';
            }
            
            // الانتقال لوضع الضم (TUCKED) -> وهنا بنحسب العدة
            if (this.smKneeAngle < THRESHOLDS.KNEE_TUCKED_MAX && 
                this.smHipAngle < THRESHOLDS.HIP_TUCK_MAX) {
                
                this.stableFrames++;
                if (this.stableFrames >= THRESHOLDS.STABLE_FRAMES) {
                    
                    // ⭐️ لحظة الحقيقة: هل نحسب العدة؟
                    if (!this.repInvalidated) {
                        this.reps++;
                        this.feedback_code = `COUNT_${this.reps}` as FeedbackSignal;
                    } else {
                        // لو كانت بايظة، مش هنحسب، وهنقوله "ارفع رجلك المرة الجاية"
                        this.feedback_code = 'ERR_KEEP_FEET_UP';
                    }

                    this.state = 'tucked';
                    this.stableFrames = 0;
                    
                    // بمجرد ما ضمينا، بننسى إنها كانت بايظة، ونبدأ صفحة جديدة للعدة الجاية
                    this.repInvalidated = false;
                }
            } 
            else if (this.smKneeAngle < 125) {
                 // في الطريق للضم
                 if (!this.repInvalidated) this.feedback_code = 'SQUEEZE_ABS';
                 this.stableFrames = 0;
            }
        }
    } 
    // إحنا دلوقتي في وضع TUCKED (مضمومين)
    else if (this.state === 'tucked') {
        // المطلوب: افرد رجلك تاني (EXTEND)
        
        if (this.smKneeAngle > THRESHOLDS.KNEE_EXTENDED_MIN) {
            this.stableFrames++;
            if (this.stableFrames >= THRESHOLDS.STABLE_FRAMES) {
                this.state = 'extended';
                this.stableFrames = 0;
                this.feedback_code = 'TUCK_IN';
            }
        } 
        else if (this.smKneeAngle > 115) {
            this.feedback_code = 'ERR_EXTEND_FULLY';
            this.stableFrames = 0;
        }
        else {
            this.feedback_code = 'EXTEND_LEGS';
            this.stableFrames = 0;
        }
    }

    return {
      exercise: 'knee_tucks',
      reps: this.reps,
      stage: this.state as 'extended' | 'tucked',
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
    };
  }
}