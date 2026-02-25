import { ExerciseLogic, RepExerciseResult, Landmark } from '../types';

export interface SideLyingLegRaiseResult extends RepExerciseResult {
  exercise: 'side_lying_leg_raise';
  activeSide: 'LEFT' | 'RIGHT' | 'NONE'; // الرجل اللي فوق (اللي بتترفع)
}

const L = {
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
} as const;

const TH = {
  VIS: 0.55,

  // Separation angle thresholds
  DOWN_MAX: 12,           // تحت ده → الرجلين فوق بعض
  UP_ENTER_MIN: 50,       // بداية الـ UP
  UP_COUNT_MIN: 65,       // القمة المطلوبة عشان العدة تتحسب (كان 42)
  UP_PARTIAL_MIN: 55,     // لو تحت ده → "ارفع أعلى"

  // Knee straightness with hysteresis
  KNEE_STRAIGHT_ON: 162,  // فوق ده → مفرود
  KNEE_BENT_OFF: 150,     // تحت ده → متني

  // Stability frames
  SETUP_STABLE: 8,
  UP_STABLE: 4,
  DOWN_STABLE: 4,

  // Smoothing
  EMA_ALPHA: 0.35,
  MIN_DELTA: 0.25,
} as const;

type State = 'setup' | 'down' | 'up';
type KneeState = 'straight' | 'bent';

export class SideLyingLegRaiseLogic implements ExerciseLogic {
  private state: State = 'setup';
  private reps = 0;

  private feedback_code = 'SETUP_POSITION';
  private is_correct = false;

  private activeSide: 'LEFT' | 'RIGHT' | 'NONE' = 'NONE';

  private stableFrames = 0;

  private smoothedSepAngle = 0;
  private lastSepAngle = 0;
  private peakSepAngle = 0;

  // ───────────── الجديد المهم ─────────────
  private wasEverBentDuringRep = false;   // لو اتنت ولو للحظة أثناء الrep → مش هتتحسب
  private kneeState: KneeState = 'straight';

  reset(): void {
    this.state = 'setup';
    this.reps = 0;
    this.feedback_code = 'SETUP_POSITION';
    this.is_correct = false;
    this.activeSide = 'NONE';

    this.stableFrames = 0;

    this.smoothedSepAngle = 0;
    this.lastSepAngle = 0;
    this.peakSepAngle = 0;

    this.wasEverBentDuringRep = false;
    this.kneeState = 'straight';
  }

  private ema(prev: number, curr: number): number {
    return TH.EMA_ALPHA * curr + (1 - TH.EMA_ALPHA) * prev;
  }

  private isVisible(landmarks: Landmark[], idx: number): boolean {
    return (landmarks[idx]?.visibility ?? 0) >= TH.VIS;
  }

  private angleBetweenVectors(ax: number, ay: number, bx: number, by: number): number {
    const dot = ax * bx + ay * by;
    const magA = Math.hypot(ax, ay);
    const magB = Math.hypot(bx, by);
    if (magA < 1e-6 || magB < 1e-6) return 0;

    let cos = dot / (magA * magB);
    cos = Math.max(-1, Math.min(1, cos));
    return Math.acos(cos) * 180 / Math.PI;
  }

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  analyze(landmarks: Landmark[]): SideLyingLegRaiseResult {
    const needed = [
      L.LEFT_HIP, L.RIGHT_HIP,
      L.LEFT_KNEE, L.RIGHT_KNEE,
      L.LEFT_ANKLE, L.RIGHT_ANKLE,
    ];

    const allVisible = needed.every(i => this.isVisible(landmarks, i));
    if (!allVisible) {
      return {
        exercise: 'side_lying_leg_raise',
        reps: this.reps,
        stage: (this.state === 'up' ? 'up' : 'down'),
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
        activeSide: this.activeSide,
      };
    }

    const lh = landmarks[L.LEFT_HIP];
    const rh = landmarks[L.RIGHT_HIP];
    const lk = landmarks[L.LEFT_KNEE];
    const rk = landmarks[L.RIGHT_KNEE];
    const la = landmarks[L.LEFT_ANKLE];
    const ra = landmarks[L.RIGHT_ANKLE];

    const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 } as Landmark;

    // تحديد الجانب النشط (الرجل اللي فوق = y أصغر)
    const currentActive = (la.y < ra.y) ? 'LEFT' : 'RIGHT';
    if (this.activeSide === 'NONE' || this.state === 'setup') {
      this.activeSide = currentActive;
    }

    // زاوية الفصل بين الرجلين
    const vLx = la.x - midHip.x;
    const vLy = la.y - midHip.y;
    const vRx = ra.x - midHip.x;
    const vRy = ra.y - midHip.y;

    const rawSepAngle = this.angleBetweenVectors(vLx, vLy, vRx, vRy);
    this.smoothedSepAngle = this.ema(this.smoothedSepAngle, rawSepAngle);

    // فلتر الضوضاء الصغيرة
    const delta = Math.abs(this.smoothedSepAngle - this.lastSepAngle);
    if (delta < TH.MIN_DELTA) this.smoothedSepAngle = this.lastSepAngle;
    this.lastSepAngle = this.smoothedSepAngle;

    // زاوية الركبة للرجل النشط
    const activeKneeAngle = this.activeSide === 'LEFT'
      ? this.calculateAngle(lh, lk, la)
      : this.calculateAngle(rh, rk, ra);

    // تحديث حالة الركبة (hysteresis)
    if (this.kneeState === 'straight') {
      if (activeKneeAngle <= TH.KNEE_BENT_OFF) this.kneeState = 'bent';
    } else {
      if (activeKneeAngle >= TH.KNEE_STRAIGHT_ON) this.kneeState = 'straight';
    }

    const kneeOkNow = this.kneeState === 'straight';

    // ───────────── المنطق الجديد للثني ─────────────
    // لو رجعنا تحت ومفرودين → نرست كل شيء قبل عدة جديدة
    if (this.state === 'down' && this.smoothedSepAngle <= TH.DOWN_MAX + 1 && kneeOkNow) {
      this.wasEverBentDuringRep = false;
      this.peakSepAngle = 0;
    }

    // لو في أي مرحلة (رفع أو نزول) الركبة اتنت → العدة دي تُلغى
    if ((this.state === 'down' || this.state === 'up') && !kneeOkNow) {
      this.wasEverBentDuringRep = true;
    }

    // ───────────── SETUP ─────────────
    if (this.state === 'setup') {
      const isDownPos = this.smoothedSepAngle <= TH.DOWN_MAX;

      if (isDownPos && kneeOkNow) {
        this.stableFrames++;
        this.feedback_code = 'SETUP_POSITION';

        if (this.stableFrames >= TH.SETUP_STABLE) {
          this.state = 'down';
          this.stableFrames = 0;
          this.feedback_code = 'LIFT_LEG';
          this.wasEverBentDuringRep = false;
          this.peakSepAngle = 0;
        }
      } else {
        this.stableFrames = 0;
        this.feedback_code = kneeOkNow ? 'SETUP_POSITION' : 'ERR_STRAIGHTEN_LEG';
      }

      return {
        exercise: 'side_lying_leg_raise',
        reps: this.reps,
        stage: 'down',
        feedback_code: this.feedback_code,
        is_correct: kneeOkNow,
        activeSide: this.activeSide,
      };
    }

    // الافتراضي: الصح إلا لو الركبة متنية دلوقتي
    this.is_correct = kneeOkNow;

    if (!kneeOkNow) {
      this.feedback_code = 'ERR_STRAIGHTEN_LEG';
      this.stableFrames = 0; // نمنع الانتقال أثناء الثني
    }

    // ───────────── منطق العد ─────────────
    if (this.state === 'down') {
      if (kneeOkNow && this.smoothedSepAngle >= TH.UP_ENTER_MIN) {
        this.stableFrames++;

        if (this.smoothedSepAngle < TH.UP_PARTIAL_MIN) {
          this.feedback_code = 'CMD_LIFT_HIGHER';
        } else {
          this.feedback_code = 'HOLD';
        }

        if (this.stableFrames >= TH.UP_STABLE) {
          this.state = 'up';
          this.stableFrames = 0;
          this.peakSepAngle = this.smoothedSepAngle;
          this.feedback_code = 'LOWER_SLOWLY';
        }
      } else {
        if (kneeOkNow) this.feedback_code = 'LIFT_LEG';
        this.stableFrames = 0;
      }
    } 
    else if (this.state === 'up') {
      // تسجيل أعلى زاوية وصلنالها
      this.peakSepAngle = Math.max(this.peakSepAngle, this.smoothedSepAngle);

      if (kneeOkNow && this.smoothedSepAngle <= TH.DOWN_MAX) {
        this.stableFrames++;

        if (this.stableFrames >= TH.DOWN_STABLE) {
          const reachedHighEnough = this.peakSepAngle >= TH.UP_COUNT_MIN;
          const repWasClean = !this.wasEverBentDuringRep;

          if (repWasClean && reachedHighEnough) {
            this.reps++;
            this.feedback_code = 'GOOD_REP';
          } else {
            if (!repWasClean) {
              this.feedback_code = 'REP_NOT_COUNTED_KNEE_BENT';
            } else {
              this.feedback_code = 'REP_TOO_LOW';
            }
          }

          // Reset للعدة الجاية
          this.state = 'down';
          this.stableFrames = 0;
          this.wasEverBentDuringRep = false;
          this.peakSepAngle = 0;
        } else {
          this.feedback_code = 'LOWER_SLOWLY';
        }
      } else {
        if (kneeOkNow) this.feedback_code = 'LOWER_SLOWLY';
        this.stableFrames = 0;
      }
    }

    return {
      exercise: 'side_lying_leg_raise',
      reps: this.reps,
      stage: (this.state === 'up' ? 'up' : 'down'),
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
      activeSide: this.activeSide,
    };
  }
}