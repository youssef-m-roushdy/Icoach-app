import { ExerciseLogic, RepExerciseResult, Landmark } from '../types';

export interface BentKneeDipResult extends RepExerciseResult {
  exercise: 'bent_knee_dip';
}

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  ELBOW_UP_ANGLE: 145,
  ELBOW_DOWN_ANGLE: 110,

  // ✅ Bent Knee Dip
  // setup لازم تكون قريب من 90° (نطاق أضيق)
  KNEE_SETUP_MIN_ANGLE: 65,
  KNEE_SETUP_MAX_ANGLE: 120,

  // ✅ أثناء الحركة بنوسع النطاق عشان الطبيعي إن الزاوية تتغير شوية
  KNEE_ACTIVE_MIN_ANGLE: 55,
  KNEE_ACTIVE_MAX_ANGLE: 135,

  // ✅ Grace frames (ما تبوظش العدة من أول فريم)
  KNEE_WARN_FRAMES: 2,         // بعد كام فريم نبدأ نقول BEND_KNEE_90
  KNEE_INVALIDATE_FRAMES: 6,   // بعد كام فريم متتالي خارج النطاق نبوّظ العدة

  STABLE_FRAMES: 3,
  SETUP_HOLD_TIME: 15,
} as const;

const EMA_ALPHA = 0.4;

export class BentKneeDipLogic implements ExerciseLogic {
  private state: 'setup' | 'up' | 'down' = 'setup';
  private reps: number = 0;
  private feedback_code: string = 'SETUP_POSITION';
  private is_correct: boolean = false;

  private stableFrames: number = 0;
  private setupTimer: number = 0;
  private repInvalidated: boolean = false;

  private smElbowAngle: number = 180;
  private smKneeAngle: number = 90;

  // ✅ NEW: عدّاد خروج الركبة عن النطاق أثناء العدة
  private kneeBadFrames: number = 0;

  reset(): void {
    this.state = 'setup';
    this.reps = 0;
    this.feedback_code = 'SETUP_POSITION';
    this.is_correct = false;

    this.stableFrames = 0;
    this.setupTimer = 0;
    this.repInvalidated = false;

    this.smElbowAngle = 180;
    this.smKneeAngle = 90;

    this.kneeBadFrames = 0;
  }

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    if (!a || !b || !c) return 180;
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) -
      Math.atan2(a.y - b.y, a.x - b.x);

    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  private ema(prev: number, curr: number): number {
    return EMA_ALPHA * curr + (1 - EMA_ALPHA) * prev;
  }

  private inRange(x: number, min: number, max: number): boolean {
    return x >= min && x <= max;
  }

  analyze(landmarks: Landmark[]): BentKneeDipResult {

    // ✅ 1) تحديد الجانب بشكل ذكي (visibility + x position) - نفس كودك
    const lSh = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
    const rSh = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const leftVis = lSh?.visibility ?? 0;
    const rightVis = rSh?.visibility ?? 0;

    let isLeft: boolean;
    if (Math.abs(leftVis - rightVis) > 0.2) {
      isLeft = leftVis > rightVis;
    } else {
      const lDist = Math.abs((lSh?.x ?? 0.5) - 0.5);
      const rDist = Math.abs((rSh?.x ?? 0.5) - 0.5);
      isLeft = lDist > rDist;
    }

    // ✅ 2) حساب الزوايا من الجانبين واختيار الجانب الصح
    const leftElbowAngle = this.calculateAngle(
      landmarks[LANDMARK_INDICES.LEFT_SHOULDER],
      landmarks[LANDMARK_INDICES.LEFT_ELBOW],
      landmarks[LANDMARK_INDICES.LEFT_WRIST]
    );
    const rightElbowAngle = this.calculateAngle(
      landmarks[LANDMARK_INDICES.RIGHT_SHOULDER],
      landmarks[LANDMARK_INDICES.RIGHT_ELBOW],
      landmarks[LANDMARK_INDICES.RIGHT_WRIST]
    );

    const leftKneeAngle = this.calculateAngle(
      landmarks[LANDMARK_INDICES.LEFT_HIP],
      landmarks[LANDMARK_INDICES.LEFT_KNEE],
      landmarks[LANDMARK_INDICES.LEFT_ANKLE]
    );
    const rightKneeAngle = this.calculateAngle(
      landmarks[LANDMARK_INDICES.RIGHT_HIP],
      landmarks[LANDMARK_INDICES.RIGHT_KNEE],
      landmarks[LANDMARK_INDICES.RIGHT_ANKLE]
    );

    const rawElbowAngle = isLeft ? leftElbowAngle : rightElbowAngle;
    const rawKneeAngle  = isLeft ? leftKneeAngle  : rightKneeAngle;

    // ✅ 3) التحقق من الـ visibility للجانب المختار
    const indices = isLeft ? {
      sh: LANDMARK_INDICES.LEFT_SHOULDER,
      el: LANDMARK_INDICES.LEFT_ELBOW,
      wr: LANDMARK_INDICES.LEFT_WRIST,
      hip: LANDMARK_INDICES.LEFT_HIP,
      knee: LANDMARK_INDICES.LEFT_KNEE,
      ank: LANDMARK_INDICES.LEFT_ANKLE,
    } : {
      sh: LANDMARK_INDICES.RIGHT_SHOULDER,
      el: LANDMARK_INDICES.RIGHT_ELBOW,
      wr: LANDMARK_INDICES.RIGHT_WRIST,
      hip: LANDMARK_INDICES.RIGHT_HIP,
      knee: LANDMARK_INDICES.RIGHT_KNEE,
      ank: LANDMARK_INDICES.RIGHT_ANKLE,
    };

    const isVisible = [indices.sh, indices.el, indices.wr, indices.hip, indices.knee, indices.ank]
      .every(idx => (landmarks[idx]?.visibility ?? 0) > 0.4);

    if (!isVisible) {
      return {
        exercise: 'bent_knee_dip',
        reps: this.reps,
        stage: this.state === 'setup' ? 'up' : (this.state as 'up' | 'down'),
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
      };
    }

    // ✅ 4) التنعيم
    this.smElbowAngle = this.ema(this.smElbowAngle, rawElbowAngle);
    this.smKneeAngle  = this.ema(this.smKneeAngle,  rawKneeAngle);

    // ✅ 5) شروط الركبة: Setup vs Active
    const isKneeOkSetup = this.inRange(
      this.smKneeAngle,
      THRESHOLDS.KNEE_SETUP_MIN_ANGLE,
      THRESHOLDS.KNEE_SETUP_MAX_ANGLE
    );

    const isKneeOkActive = this.inRange(
      this.smKneeAngle,
      THRESHOLDS.KNEE_ACTIVE_MIN_ANGLE,
      THRESHOLDS.KNEE_ACTIVE_MAX_ANGLE
    );

    // 🟢 Phase 1: Setup
    if (this.state === 'setup') {
      const isArmsStraight = this.smElbowAngle > 140;

      // في setup بنستخدم نطاق setup (أضيق)
      if (isArmsStraight && isKneeOkSetup) {
        this.setupTimer++;
        if (this.setupTimer > THRESHOLDS.SETUP_HOLD_TIME) {
          this.state = 'up';
          this.setupTimer = 0;
          this.repInvalidated = false;
          this.kneeBadFrames = 0; // ✅ reset
          this.feedback_code = 'GO_DOWN';
        } else {
          this.feedback_code = 'SETUP_POSITION';
        }
      } else {
        this.setupTimer = 0;
        if (!isKneeOkSetup) this.feedback_code = 'BEND_KNEE_90';
        else this.feedback_code = 'SETUP_POSITION';
      }

      return {
        exercise: 'bent_knee_dip',
        reps: this.reps,
        stage: 'up',
        feedback_code: this.feedback_code,
        is_correct: true,
      };
    }

    // 🟢 Phase 2: Active Exercise
    // ✅ هنا بقى الفرق الكبير: مش هنبوّظ العدة من أول خروج
    if (!isKneeOkActive) {
      this.kneeBadFrames++;

      // التحذير بعد كام فريم (عشان ما يزنش)
      if (this.kneeBadFrames >= THRESHOLDS.KNEE_WARN_FRAMES) {
        this.feedback_code = 'BEND_KNEE_90';
      }

      // إبطال العدة بعد خروج مستمر
      if (this.kneeBadFrames >= THRESHOLDS.KNEE_INVALIDATE_FRAMES) {
        this.repInvalidated = true;
        this.is_correct = false;
      } else {
        // لسه في السماح
        this.is_correct = !this.repInvalidated;
      }
    } else {
      // رجعت للنطاق => صفّر العدّاد
      this.kneeBadFrames = 0;

      if (this.repInvalidated) {
        // لو العدة اتبوظت قبل كده، فضّل التحذير لحد نهاية العدة
        this.feedback_code = 'BEND_KNEE_90';
        this.is_correct = false;
      } else {
        this.is_correct = true;
      }
    }

    // --- State Machine ---
    if (this.state === 'up') {
      if (!this.repInvalidated && this.kneeBadFrames < THRESHOLDS.KNEE_WARN_FRAMES) {
        this.feedback_code = 'GO_DOWN';
      }

      if (this.smElbowAngle < THRESHOLDS.ELBOW_DOWN_ANGLE) {
        this.stableFrames++;
        if (this.stableFrames >= THRESHOLDS.STABLE_FRAMES) {
          this.state = 'down';
          this.stableFrames = 0;
          if (!this.repInvalidated) this.feedback_code = 'PUSH_UP';
        }
      } else {
        this.stableFrames = 0;
      }

    } else if (this.state === 'down') {
      if (!this.repInvalidated && this.kneeBadFrames < THRESHOLDS.KNEE_WARN_FRAMES) {
        this.feedback_code = 'PUSH_UP';
      }

      if (this.smElbowAngle > THRESHOLDS.ELBOW_UP_ANGLE) {
        this.stableFrames++;
        if (this.stableFrames >= THRESHOLDS.STABLE_FRAMES) {

          if (!this.repInvalidated) {
            this.reps++;
            this.feedback_code = 'GOOD_REP';
          } else {
            this.feedback_code = 'BEND_KNEE_90';
          }

          this.state = 'up';
          this.stableFrames = 0;

          // ✅ صفحة جديدة للعدة الجاية
          this.repInvalidated = false;
          this.kneeBadFrames = 0;
        }
      } else {
        this.stableFrames = 0;
      }
    }

    return {
      exercise: 'bent_knee_dip',
      reps: this.reps,
      stage: this.state as 'up' | 'down',
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
    };
  }
}