import { ExerciseLogic, RepExerciseResult, Landmark } from '../types';

export interface KneePushUpResult extends RepExerciseResult {
  exercise: 'knee_push_up';
}

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  ELBOW_UP_ANGLE: 155,       // أسهل شوية في الصعود
  ELBOW_DOWN_ANGLE: 110,     // مش لازم يوصل 90° بالظبط
  ELBOW_PARTIAL_ANGLE: 130,  // تنبيه "انزل أكتر" من 130 بدل 135
  HIP_ALIGNMENT_MIN: 140,    // أقل صرامة في استقامة الوسط
  FEET_LIFT_OFFSET: 0.025,   // شوية أقل حساسية
} as const;

const STABLE_THRESHOLD = 8;       // أعلى → أقل حساسية للعد الوهمي
const SETUP_FRAMES = 20;          // ~0.67 ثانية بدل ثانية
const FEEDBACK_HOLD_FRAMES = 12;  // الرسالة تتغير كل ~0.4 ثانية تقريباً
const EMA_ALPHA = 0.3;            // تسوية أكتر (أقل تقلب)

export class KneePushUpLogic implements ExerciseLogic {
  private state: 'setup' | 'up' | 'down' = 'setup';
  private reps: number = 0;
  private feedback_code: string = 'SETUP_POSITION';
  private is_correct: boolean = false;
  private stableFrames: number = 0;
  private setupTimer: number = 0;
  private feedbackHoldCounter: number = 0;
  private lastFeedback: string = 'SETUP_POSITION';

  private smoothedElbowAngle: number = 180;
  private smoothedHipAngle: number = 180;

  reset(): void {
    this.state = 'setup';
    this.reps = 0;
    this.feedback_code = 'SETUP_POSITION';
    this.lastFeedback = 'SETUP_POSITION';
    this.is_correct = false;
    this.stableFrames = 0;
    this.setupTimer = 0;
    this.feedbackHoldCounter = 0;
    this.smoothedElbowAngle = 180;
    this.smoothedHipAngle = 180;
  }

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    if (!a || !b || !c) return 180;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }

  private ema(prev: number, curr: number): number {
    return EMA_ALPHA * curr + (1 - EMA_ALPHA) * prev;
  }

  private setFeedback(code: string): void {
    if (code === this.lastFeedback) {
      this.feedbackHoldCounter = 0;
      return;
    }

    if (this.feedbackHoldCounter >= FEEDBACK_HOLD_FRAMES) {
      this.feedback_code = code;
      this.lastFeedback = code;
      this.feedbackHoldCounter = 0;
    } else {
      this.feedbackHoldCounter++;
    }
  }

  analyze(landmarks: Landmark[]): KneePushUpResult {
    // تحديد الجانب
    const leftVis = landmarks[LANDMARK_INDICES.LEFT_SHOULDER]?.visibility ?? 0;
    const rightVis = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER]?.visibility ?? 0;
    const isLeft = leftVis > rightVis;

    const indices = isLeft
      ? {
          sh: LANDMARK_INDICES.LEFT_SHOULDER,
          el: LANDMARK_INDICES.LEFT_ELBOW,
          wr: LANDMARK_INDICES.LEFT_WRIST,
          hip: LANDMARK_INDICES.LEFT_HIP,
          knee: LANDMARK_INDICES.LEFT_KNEE,
          ank: LANDMARK_INDICES.LEFT_ANKLE,
        }
      : {
          sh: LANDMARK_INDICES.RIGHT_SHOULDER,
          el: LANDMARK_INDICES.RIGHT_ELBOW,
          wr: LANDMARK_INDICES.RIGHT_WRIST,
          hip: LANDMARK_INDICES.RIGHT_HIP,
          knee: LANDMARK_INDICES.RIGHT_KNEE,
          ank: LANDMARK_INDICES.RIGHT_ANKLE,
        };

    const required = [indices.sh, indices.el, indices.wr, indices.hip, indices.knee, indices.ank];
    const isVisible = required.every(idx => (landmarks[idx]?.visibility ?? 0) > 0.5);

    if (!isVisible) {
      this.setFeedback('ERR_CAMERA_VIEW');
      return this.buildResult();
    }

    const sh = landmarks[indices.sh];
    const el = landmarks[indices.el];
    const wr = landmarks[indices.wr];
    const hip = landmarks[indices.hip];
    const knee = landmarks[indices.knee];
    const ank = landmarks[indices.ank];

    const rawElbow = this.calculateAngle(sh, el, wr);
    const rawHip = this.calculateAngle(sh, hip, knee);

    this.smoothedElbowAngle = this.ema(this.smoothedElbowAngle, rawElbow);
    this.smoothedHipAngle = this.ema(this.smoothedHipAngle, rawHip);

    const isFeetLifted = ank.y < knee.y - THRESHOLDS.FEET_LIFT_OFFSET;

    // ─────────────────────────────────────────────
    //               SETUP PHASE
    // ─────────────────────────────────────────────
    if (this.state === 'setup') {
      const armsOk = this.smoothedElbowAngle > 145;
      const bodyOk = this.smoothedHipAngle > 138;
      
      if (armsOk && bodyOk && isFeetLifted) {
        this.setupTimer++;
        if (this.setupTimer >= SETUP_FRAMES) {
          this.state = 'up';
          this.setupTimer = 0;
          this.setFeedback('GO_DOWN');
        } else {
          this.setFeedback('SETUP_POSITION');
        }
      } else {
        this.setupTimer = 0;
        if (!isFeetLifted) {
          this.setFeedback('ERR_LIFT_FEET');
        } else if (!bodyOk) {
          this.setFeedback('ERR_HIPS_BACK');
        } else {
          this.setFeedback('SETUP_POSITION');
        }
      }

      return this.buildResult('up', true);
    }

    // ─────────────────────────────────────────────
    //               ACTIVE PHASE
    // ─────────────────────────────────────────────

    // أولوية الـ anti-cheat
    if (!isFeetLifted) {
      this.setFeedback('ERR_LIFT_FEET');
      this.is_correct = false;
      if (this.state === 'down') this.state = 'up';
    } else if (this.smoothedHipAngle < THRESHOLDS.HIP_ALIGNMENT_MIN) {
      this.setFeedback('ERR_HIPS_BACK');
      this.is_correct = false;
      if (this.state === 'down') this.state = 'up';
    } else {
      this.is_correct = true;

      if (this.state === 'up') {
        if (this.smoothedElbowAngle < THRESHOLDS.ELBOW_DOWN_ANGLE) {
          this.stableFrames++;
          if (this.stableFrames >= STABLE_THRESHOLD) {
            this.state = 'down';
            this.stableFrames = 0;
            this.setFeedback('PUSH_UP');
          }
        } else if (this.smoothedElbowAngle < THRESHOLDS.ELBOW_PARTIAL_ANGLE) {
          this.setFeedback('CMD_GO_LOWER');
          this.stableFrames = 0;
        } else {
          this.setFeedback('GO_DOWN');
          this.stableFrames = 0;
        }
      } 
      else if (this.state === 'down') {
        if (this.smoothedElbowAngle > THRESHOLDS.ELBOW_UP_ANGLE) {
          this.stableFrames++;
          if (this.stableFrames >= STABLE_THRESHOLD) {
            this.reps++;
            this.state = 'up';
            this.stableFrames = 0;
            this.setFeedback('GOOD_REP');
          }
        } else {
          this.stableFrames = 0;
          this.setFeedback('PUSH_UP');
        }
      }
    }

    return this.buildResult();
  }

  private buildResult(stageOverride?: 'up' | 'down', forceCorrect?: boolean): KneePushUpResult {
    return {
      exercise: 'knee_push_up',
      reps: this.reps,
      stage: (stageOverride || this.state) as 'up' | 'down',
      feedback_code: this.feedback_code,
      is_correct: forceCorrect !== undefined ? forceCorrect : this.is_correct,
    };
  }
}