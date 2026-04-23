import {
  Landmark,
  SquatResult,
  FeedbackCode,
  DynamicFeedbackCode,
} from '../types';
import { EMA } from '../utils';

/**
 * Squat Logic
 *
 * UX / stability improvements:
 * - Uses shared EMA from utils
 * - Adds brief visibility tolerance to reduce camera flicker
 * - Adds upright stability before unlock to avoid accidental double counting
 * - Adds minimum delay between reps as an anti-bounce safeguard
 * - Keeps feedback calmer in transition zones
 */
export class SquatLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private counter = 0;
  private feedbackCode: FeedbackCode | DynamicFeedbackCode = 'STEP_BACK';
  private stage: 'up' | 'down' | 'unknown' = 'unknown';

  /**
   * Rep lock:
   * - false => ready to count next rep
   * - true  => current rep already counted; user must return upright to unlock
   */
  private repLocked = false;

  /**
   * Setup / system activation
   */
  private isSystemActive = false;
  private standStableStart: number | null = null;

  /**
   * Upright stability after active phase:
   * used to unlock safely and reduce jitter-based accidental unlocks.
   */
  private uprightStableStart: number | null = null;

  /**
   * Visibility debounce:
   * prevents brief landmark drops from instantly switching to ERR_BODY_NOT_VISIBLE.
   */
  private bodyMissingStart: number | null = null;

  /**
   * Feedback / rep timing
   */
  private lastFixLowerHipsTime = 0;
  private lastRepCountTime = 0;

  /**
   * Smoothing
   */
  private emaLeftKnee = new EMA(0.3);
  private emaRightKnee = new EMA(0.3);

  // -------------------------------------------------
  // Tunable Constants
  // -------------------------------------------------
  private readonly VISIBILITY_THRESHOLD = 0.6;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  private readonly SETUP_STABLE_MS = 650;
  private readonly UNLOCK_STABLE_MS = 180;
  private readonly FEEDBACK_COOLDOWN_MS = 1200;
  private readonly MIN_TIME_BETWEEN_REPS_MS = 550;

  /**
   * Angle thresholds (degrees)
   *
   * Notes:
   * - STAND_THRESHOLD: user is clearly upright
   * - COUNT_DEPTH: user is deep enough to count a valid squat
   * - GUIDANCE_ZONE_MAX: user is descending but still not deep enough
   *
   * Using separated thresholds gives a bit of hysteresis and calmer transitions.
   */
  private readonly ANGLE_STAND_THRESHOLD = 160;

  // ✅ First adjustment:
  // Slightly increased required depth
  // Was 92, now 88 => must go a bit deeper before the rep counts
  private readonly ANGLE_COUNT_DEPTH = 88;

  // ✅ Second adjustment:
  // Made "go lower" feedback appear slightly earlier
  // Was 150, now 158 => guidance starts earlier even with a slight descent
  private readonly ANGLE_GUIDANCE_ZONE_MAX = 158;

  // -------------------------------------------------
  // Landmark indices
  // -------------------------------------------------
  private readonly IDX = {
    L_HIP: 23,
    R_HIP: 24,
    L_KNEE: 25,
    R_KNEE: 26,
    L_ANKLE: 27,
    R_ANKLE: 28,
  } as const;

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) -
      Math.atan2(a.y - b.y, a.x - b.x);

    let angle = Math.abs((radians * 180) / Math.PI);

    if (angle > 180) {
      angle = 360 - angle;
    }

    return angle;
  }

  private getVis(lm: Landmark | undefined): number {
    if (!lm) return 0;
    return typeof lm.visibility === 'number' ? lm.visibility : 1;
  }

  private hasRequiredLandmarks(landmarks: Landmark[]): boolean {
    const requiredIndices = [
      this.IDX.L_HIP,
      this.IDX.R_HIP,
      this.IDX.L_KNEE,
      this.IDX.R_KNEE,
      this.IDX.L_ANKLE,
      this.IDX.R_ANKLE,
    ];

    return requiredIndices.every(
      (idx) => this.getVis(landmarks[idx]) > this.VISIBILITY_THRESHOLD
    );
  }

  /**
   * Visibility debounce:
   * - brief drops are ignored to avoid flicker
   * - if missing persists long enough, we switch to body-not-visible state
   */
  private isBodyVisibleStable(landmarks: Landmark[], now: number): boolean {
    const visible = this.hasRequiredLandmarks(landmarks);

    if (visible) {
      this.bodyMissingStart = null;
      return true;
    }

    if (this.bodyMissingStart === null) {
      this.bodyMissingStart = now;
      return true; // tolerate first brief miss
    }

    return now - this.bodyMissingStart < this.BODY_LOST_TOLERANCE_MS;
  }

  private getSmoothedKneeAngle(landmarks: Landmark[]): number {
    const lHip = landmarks[this.IDX.L_HIP];
    const rHip = landmarks[this.IDX.R_HIP];
    const lKnee = landmarks[this.IDX.L_KNEE];
    const rKnee = landmarks[this.IDX.R_KNEE];
    const lAnkle = landmarks[this.IDX.L_ANKLE];
    const rAnkle = landmarks[this.IDX.R_ANKLE];

    const rawAngleL = this.calculateAngle(lHip, lKnee, lAnkle);
    const rawAngleR = this.calculateAngle(rHip, rKnee, rAnkle);

    const smoothAngleL = this.emaLeftKnee.update(rawAngleL);
    const smoothAngleR = this.emaRightKnee.update(rawAngleR);

    return (smoothAngleL + smoothAngleR) / 2;
  }

  private buildResult(): SquatResult {
    return {
      exercise: 'squat',
      reps: this.counter,
      stage: this.stage,
      feedback_code: this.feedbackCode,
      is_correct: true,
      is_system_active: this.isSystemActive,
    };
  }

  private markUnknownBodyState(): SquatResult {
    this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
    this.stage = 'unknown';
    this.standStableStart = null;
    this.uprightStableStart = null;
    return this.buildResult();
  }

  private handleSetupPhase(now: number, kneeAngle: number): SquatResult {
    if (kneeAngle >= this.ANGLE_STAND_THRESHOLD) {
      if (this.standStableStart === null) {
        this.standStableStart = now;
      }

      const elapsed = now - this.standStableStart;

      if (elapsed >= this.SETUP_STABLE_MS) {
        this.isSystemActive = true;
        this.repLocked = false;
        this.stage = 'up';
        this.feedbackCode = 'SYSTEM_READY_GO';
        this.uprightStableStart = now;
      } else {
        this.stage = 'unknown';
        this.feedbackCode = 'SETUP_STAND_STILL';
      }
    } else {
      this.standStableStart = null;
      this.stage = 'unknown';
      this.feedbackCode = 'SETUP_STAND_STRAIGHT';
    }

    return this.buildResult();
  }

  private handleStandingState(now: number): void {
    this.stage = 'up';

    if (this.uprightStableStart === null) {
      this.uprightStableStart = now;
    }

    if (this.repLocked) {
      const uprightElapsed = now - this.uprightStableStart;

      if (uprightElapsed >= this.UNLOCK_STABLE_MS) {
        this.repLocked = false;
        this.feedbackCode = 'CMD_GO_DOWN';
      } else {
        // still finishing the rep cleanly
        this.feedbackCode = 'CMD_GO_UP';
      }
    } else {
      this.feedbackCode = 'CMD_GO_DOWN';
    }
  }

  private handleDeepSquat(now: number): void {
    this.stage = 'down';
    this.uprightStableStart = null;

    if (
      !this.repLocked &&
      now - this.lastRepCountTime >= this.MIN_TIME_BETWEEN_REPS_MS
    ) {
      this.counter += 1;
      this.repLocked = true;
      this.lastRepCountTime = now;
      this.feedbackCode = `COUNT_${this.counter}`;
      return;
    }

    this.feedbackCode = 'CMD_GO_UP';
  }

  private handleGuidanceZone(now: number): void {
    this.stage = 'down';
    this.uprightStableStart = null;

    if (this.repLocked) {
      this.feedbackCode = 'CMD_GO_UP';
      return;
    }

    if (now - this.lastFixLowerHipsTime >= this.FEEDBACK_COOLDOWN_MS) {
      this.feedbackCode = 'FIX_LOWER_HIPS';
      this.lastFixLowerHipsTime = now;
    }
    // else: keep previous feedback to reduce flicker / spam
  }

  private handleTransitionZone(): void {
    this.uprightStableStart = null;
    this.stage = 'up';

    if (this.repLocked) {
      this.feedbackCode = 'CMD_GO_UP';
    } else {
      this.feedbackCode = 'CMD_GO_DOWN';
    }
  }

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------
  analyze(landmarks: Landmark[]): SquatResult {
    const now = Date.now();

    // 1) Visibility handling with debounce
    if (!this.isBodyVisibleStable(landmarks, now)) {
      return this.markUnknownBodyState();
    }

    // If currently tolerated missing landmarks, don't mutate state aggressively.
    // Just keep returning the latest stable state until tolerance expires.
    if (!this.hasRequiredLandmarks(landmarks)) {
      return this.buildResult();
    }

    // 2) Compute smoothed knee angle
    const kneeAngle = this.getSmoothedKneeAngle(landmarks);

    // 3) Setup / activation phase
    if (!this.isSystemActive) {
      return this.handleSetupPhase(now, kneeAngle);
    }

    // 4) Active squat state machine

    // Fully upright => unlock / prepare next rep
    if (kneeAngle >= this.ANGLE_STAND_THRESHOLD) {
      this.handleStandingState(now);
      return this.buildResult();
    }

    // Deep enough => count if unlocked
    if (kneeAngle <= this.ANGLE_COUNT_DEPTH) {
      this.handleDeepSquat(now);
      return this.buildResult();
    }

    // Descending but not deep enough yet => guidance
    if (
      kneeAngle > this.ANGLE_COUNT_DEPTH &&
      kneeAngle < this.ANGLE_GUIDANCE_ZONE_MAX
    ) {
      this.handleGuidanceZone(now);
      return this.buildResult();
    }

    // Transition zone between guidance and full stand
    this.handleTransitionZone();
    return this.buildResult();
  }

  reset(): void {
    this.counter = 0;
    this.feedbackCode = 'STEP_BACK';
    this.stage = 'unknown';

    this.repLocked = false;
    this.isSystemActive = false;

    this.standStableStart = null;
    this.uprightStableStart = null;
    this.bodyMissingStart = null;

    this.lastFixLowerHipsTime = 0;
    this.lastRepCountTime = 0;

    this.emaLeftKnee.reset();
    this.emaRightKnee.reset();
  }

  getRepCount(): number {
    return this.counter;
  }

  isActive(): boolean {
    return this.isSystemActive;
  }
}