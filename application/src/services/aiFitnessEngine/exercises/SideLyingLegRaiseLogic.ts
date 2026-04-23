import {
  ExerciseLogic,
  SideLyingLegRaiseResult,
  Landmark,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';

const L = {
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
} as const;

const TH = {
  VIS: 0.55,

  // Separation angle thresholds
  DOWN_MAX: 12,           // Below this → legs are on top of each other
  UP_ENTER_MIN: 50,       // Start of the UP phase
  UP_COUNT_MIN: 65,       // Minimum peak angle required for a rep to count
  UP_PARTIAL_MIN: 55,     // Below this → "lift higher"

  // Knee straightness with hysteresis
  KNEE_STRAIGHT_ON: 162,  // Above this → straight
  KNEE_BENT_OFF: 150,     // Below this → bent

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

  private feedback_code: FeedbackSignal = 'SETUP_POSITION';
  private is_correct = false;

  private activeSide: 'LEFT' | 'RIGHT' | 'NONE' = 'NONE';

  private stableFrames = 0;

  private smoothedSepAngle = 0;
  private lastSepAngle = 0;
  private peakSepAngle = 0;

  // If the knee was bent at any moment during the rep → this rep won't count
  private wasEverBentDuringRep = false;
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
    return (Math.acos(cos) * 180) / Math.PI;
  }

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) -
      Math.atan2(a.y - b.y, a.x - b.x);

    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  analyze(
    landmarks: Landmark[],
    _context?: ExerciseAnalysisContext
  ): SideLyingLegRaiseResult {
    const needed = [
      L.LEFT_HIP, L.RIGHT_HIP,
      L.LEFT_KNEE, L.RIGHT_KNEE,
      L.LEFT_ANKLE, L.RIGHT_ANKLE,
    ];

    const allVisible = needed.every((i) => this.isVisible(landmarks, i));
    if (!allVisible) {
      return {
        exercise: 'side_lying_leg_raise',
        reps: this.reps,
        stage: this.state === 'up' ? 'up' : 'down',
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

    const midHip = {
      x: (lh.x + rh.x) / 2,
      y: (lh.y + rh.y) / 2,
    } as Landmark;

    // Determine the active side (the leg on top = smaller y)
    const currentActive = la.y < ra.y ? 'LEFT' : 'RIGHT';
    if (this.activeSide === 'NONE' || this.state === 'setup') {
      this.activeSide = currentActive;
    }

    // Separation angle between the legs
    const vLx = la.x - midHip.x;
    const vLy = la.y - midHip.y;
    const vRx = ra.x - midHip.x;
    const vRy = ra.y - midHip.y;

    const rawSepAngle = this.angleBetweenVectors(vLx, vLy, vRx, vRy);
    this.smoothedSepAngle = this.ema(this.smoothedSepAngle, rawSepAngle);

    // Filter out small noise
    const delta = Math.abs(this.smoothedSepAngle - this.lastSepAngle);
    if (delta < TH.MIN_DELTA) {
      this.smoothedSepAngle = this.lastSepAngle;
    }
    this.lastSepAngle = this.smoothedSepAngle;

    // Knee angle for the active leg
    const activeKneeAngle =
      this.activeSide === 'LEFT'
        ? this.calculateAngle(lh, lk, la)
        : this.calculateAngle(rh, rk, ra);

    // Update knee state (hysteresis)
    if (this.kneeState === 'straight') {
      if (activeKneeAngle <= TH.KNEE_BENT_OFF) {
        this.kneeState = 'bent';
      }
    } else {
      if (activeKneeAngle >= TH.KNEE_STRAIGHT_ON) {
        this.kneeState = 'straight';
      }
    }

    const kneeOkNow = this.kneeState === 'straight';

    // If we returned to down position and knee is straight → reset everything before a new rep
    if (this.state === 'down' && this.smoothedSepAngle <= TH.DOWN_MAX + 1 && kneeOkNow) {
      this.wasEverBentDuringRep = false;
      this.peakSepAngle = 0;
    }

    // If at any stage the knee bends → this rep is invalidated
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

    // Default: correct unless the knee is currently bent
    this.is_correct = kneeOkNow;

    if (!kneeOkNow) {
      this.feedback_code = 'ERR_STRAIGHTEN_LEG';
      this.stableFrames = 0; // Prevent state transition while knee is bent
    }

    // ───────────── Counting logic ─────────────
    if (this.state === 'down') {
      if (kneeOkNow && this.smoothedSepAngle >= TH.UP_ENTER_MIN) {
        this.stableFrames++;

        if (this.smoothedSepAngle < TH.UP_PARTIAL_MIN) {
          this.feedback_code = 'CMD_LIFT_HIGHER';
        } else if (this.smoothedSepAngle < TH.UP_COUNT_MIN) {
          this.feedback_code = 'HOLD_TOP';
        } else {
          this.feedback_code = 'LOWER_SLOWLY';
        }

        if (this.stableFrames >= TH.UP_STABLE) {
          this.state = 'up';
          this.stableFrames = 0;
          this.peakSepAngle = this.smoothedSepAngle;
          this.feedback_code = 'LOWER_SLOWLY';
        }
      } else {
        if (kneeOkNow) {
          this.feedback_code = 'LIFT_LEG';
        }
        this.stableFrames = 0;
      }
    }

    else if (this.state === 'up') {
      // Track the highest angle reached
      this.peakSepAngle = Math.max(this.peakSepAngle, this.smoothedSepAngle);

      if (kneeOkNow && this.smoothedSepAngle <= TH.DOWN_MAX) {
        this.stableFrames++;

        if (this.stableFrames >= TH.DOWN_STABLE) {
          const reachedHighEnough = this.peakSepAngle >= TH.UP_COUNT_MIN;
          const repWasClean = !this.wasEverBentDuringRep;

          if (repWasClean && reachedHighEnough) {
            this.reps++;
            this.feedback_code = `COUNT_${this.reps}` as FeedbackSignal;
          } else {
            if (!repWasClean) {
              this.feedback_code = 'ERR_STRAIGHTEN_LEG';
            } else {
              this.feedback_code = 'CMD_LIFT_HIGHER';
            }
          }

          // Reset for the next rep
          this.state = 'down';
          this.stableFrames = 0;
          this.wasEverBentDuringRep = false;
          this.peakSepAngle = 0;
        } else {
          this.feedback_code = 'LOWER_SLOWLY';
        }
      } else {
        if (kneeOkNow) {
          this.feedback_code = 'LOWER_SLOWLY';
        }
        this.stableFrames = 0;
      }
    }

    return {
      exercise: 'side_lying_leg_raise',
      reps: this.reps,
      stage: this.state === 'up' ? 'up' : 'down',
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
      activeSide: this.activeSide,
    };
  }
}