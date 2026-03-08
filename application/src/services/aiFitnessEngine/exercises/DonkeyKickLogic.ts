import { ExerciseLogic, RepExerciseResult, Landmark } from '../types';

export interface DonkeyKickResult extends RepExerciseResult {
  exercise: 'donkey_kick';
  activeSide: 'LEFT' | 'RIGHT' | 'NONE';
}

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  // زوايا الحوض
  HIP_EXTENSION_TARGET: 145,
  HIP_RETURN_THRESHOLD: 110,
  
  // زوايا الركبة
  KNEE_BEND_MIN: 70,
  KNEE_BEND_MAX: 135,
  
  // استقامة الظهر
  BACK_ARCH_LIMIT: 175, 

  // الثبات (زودنا الأرقام دي عشان الكود يتقل وميخطفش العدات)
  STABLE_FRAMES: 8,     // كان 5
  SETUP_FRAMES: 15,     // كان 10
  
  // 🟢 جديد: عدد فريمات ثبات الرسالة قبل عرضها (عشان الكلام ميرعش)
  FEEDBACK_DELAY: 10,   
} as const;

// 🟢 قللنا الرقم ده عشان القراءات تكون ناعمة جداً
const EMA_ALPHA = 0.2; 

export class DonkeyKickLogic implements ExerciseLogic {
  private state: 'setup' | 'down' | 'up' = 'setup';
  private reps: number = 0;
  private feedback_code: string = 'SETUP_POSITION';
  private is_correct: boolean = false;
  
  private activeSide: 'LEFT' | 'RIGHT' | 'NONE' = 'NONE';
  private stableFrames: number = 0;
  
  // متغيرات التنعيم
  private smHipAngle: number = 90;
  private smKneeAngle: number = 90;

  // 🟢 متغيرات جديدة لتهدئة سرعة الرسائل (Debounce)
  private feedbackTimer: number = 0;
  private lastCandidateFeedback: string = '';

  reset(): void {
    this.state = 'setup';
    this.reps = 0;
    this.feedback_code = 'SETUP_POSITION';
    this.is_correct = false;
    this.activeSide = 'NONE';
    this.stableFrames = 0;
    this.smHipAngle = 90;
    this.smKneeAngle = 90;
    
    this.feedbackTimer = 0;
    this.lastCandidateFeedback = '';
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

  // 🟢 دالة جديدة: مش بتغير الرسالة فوراً إلا لو تكررت لفترة
  // ما عدا رسائل النجاح (GOOD_REP) والأخطاء الخطيرة بنعرضها فوراً
  private setFeedback(code: string) {
    // 1. لو الرسالة هي هي المعروضة، صفر العداد واخرج
    if (code === this.feedback_code) {
      this.feedbackTimer = 0;
      return;
    }

    // 2. رسائل النجاح والأخطاء تظهر فوراً بدون تأخير
    if (code === 'GOOD_REP' || code.startsWith('ERR_') || code === 'SQUEEZE_GLUTES') {
        this.feedback_code = code;
        this.feedbackTimer = 0;
        return;
    }

    // 3. باقي التعليمات (ارفع، نزل، استعد) لازم تثبت شوية
    if (code === this.lastCandidateFeedback) {
      this.feedbackTimer++;
      if (this.feedbackTimer > THRESHOLDS.FEEDBACK_DELAY) {
        this.feedback_code = code;
        this.feedbackTimer = 0;
      }
    } else {
      // لو الرسالة اتغيرت فجأة، نبدأ نعدلها من الأول
      this.lastCandidateFeedback = code;
      this.feedbackTimer = 0;
    }
  }

  analyze(landmarks: Landmark[]): DonkeyKickResult {
    // 1. تحديد الجانب النشط
    const leftKneeY = landmarks[LANDMARK_INDICES.LEFT_KNEE]?.y ?? 0;
    const rightKneeY = landmarks[LANDMARK_INDICES.RIGHT_KNEE]?.y ?? 0;
    const LIFT_THRESHOLD = 0.05;

    let currentActive: 'LEFT' | 'RIGHT' | 'NONE' = 'NONE';
    if (leftKneeY < rightKneeY - LIFT_THRESHOLD) currentActive = 'LEFT';
    else if (rightKneeY < leftKneeY - LIFT_THRESHOLD) currentActive = 'RIGHT';
    else currentActive = 'NONE';

    if (this.activeSide === 'NONE' && currentActive !== 'NONE') {
        this.activeSide = currentActive;
    } else if (currentActive === 'NONE' && this.state === 'down') {
        this.activeSide = 'NONE';
    }

    const workingSide = this.activeSide !== 'NONE' ? this.activeSide : (currentActive !== 'NONE' ? currentActive : 'LEFT');

    const indices = workingSide === 'LEFT' ? {
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
        exercise: 'donkey_kick',
        reps: this.reps,
        stage: this.state === 'setup' ? 'down' : this.state as 'down' | 'up',
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
        activeSide: this.activeSide
      };
    }

    // 2. حساب الزوايا وتنعيمها
    const sh = landmarks[indices.sh];
    const hip = landmarks[indices.hip];
    const knee = landmarks[indices.knee];
    const ank = landmarks[indices.ank];

    const rawHipAngle = this.calculateAngle(sh, hip, knee);
    const rawKneeAngle = this.calculateAngle(hip, knee, ank);

    this.smHipAngle = this.ema(this.smHipAngle, rawHipAngle);
    this.smKneeAngle = this.ema(this.smKneeAngle, rawKneeAngle);

    // 3. المنطق (Logic)
    let targetFeedback = this.feedback_code; // المتغير اللي هنقرر فيه الرسالة

    // 🟢 Phase 1: Setup
    if (this.state === 'setup') {
        const isReadyPos = this.smHipAngle < 110 && this.smKneeAngle < 110;

        if (isReadyPos) {
            this.stableFrames++;
            if (this.stableFrames > THRESHOLDS.SETUP_FRAMES) {
                this.state = 'down';
                this.stableFrames = 0;
                targetFeedback = 'LIFT_LEG';
            } else {
                targetFeedback = 'SETUP_POSITION';
            }
        } else {
            this.stableFrames = 0;
            targetFeedback = 'SETUP_POSITION';
        }
        
        this.setFeedback(targetFeedback); // تطبيق الفلتر

        return {
            exercise: 'donkey_kick',
            reps: this.reps,
            stage: 'down',
            feedback_code: this.feedback_code,
            is_correct: true,
            activeSide: this.activeSide
        };
    }

    // 🟢 Phase 2: Active Exercise

    if (this.activeSide === 'NONE') {
        targetFeedback = 'LIFT_LEG';
        this.is_correct = true;
        if (this.state === 'up') this.state = 'down';
        
        this.setFeedback(targetFeedback);

        return {
             exercise: 'donkey_kick',
             reps: this.reps,
             stage: 'down',
             feedback_code: this.feedback_code,
             is_correct: true,
             activeSide: this.activeSide
        };
    }

    // Anti-Cheat
    if (this.smKneeAngle > THRESHOLDS.KNEE_BEND_MAX) {
        targetFeedback = 'ERR_KEEP_KNEE_BENT';
        this.is_correct = false;
    } 
    else if (this.smHipAngle > THRESHOLDS.BACK_ARCH_LIMIT) {
        targetFeedback = 'ERR_ARCHED_BACK';
        this.is_correct = false;
    }
    else {
        this.is_correct = true;

        if (this.state === 'down') {
            if (this.smHipAngle > THRESHOLDS.HIP_EXTENSION_TARGET) {
                this.stableFrames++;
                if (this.stableFrames >= THRESHOLDS.STABLE_FRAMES) {
                    this.state = 'up';
                    this.stableFrames = 0;
                    targetFeedback = 'SQUEEZE_GLUTES';
                }
            } 
            else {
                targetFeedback = 'LIFT_LEG';
                this.stableFrames = 0;
            }
        } 
        else if (this.state === 'up') {
            if (this.smHipAngle < THRESHOLDS.HIP_RETURN_THRESHOLD) {
                this.stableFrames++;
                if (this.stableFrames >= THRESHOLDS.STABLE_FRAMES) {
                    this.reps++;
                    this.state = 'down';
                    this.stableFrames = 0;
                    targetFeedback = 'GOOD_REP';
                }
            } else {
                targetFeedback = 'LOWER_SLOWLY';
                this.stableFrames = 0;
            }
        }
    }

    this.setFeedback(targetFeedback); // تطبيق الفلتر النهائي

    return {
      exercise: 'donkey_kick',
      reps: this.reps,
      stage: this.state as 'down' | 'up',
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
      activeSide: this.activeSide
    };
  }
}