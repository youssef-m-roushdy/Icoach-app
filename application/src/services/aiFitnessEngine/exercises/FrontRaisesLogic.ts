import type {
  Landmark,
  FrontRaisesResult,
  ExerciseLogic,
  FeedbackSignal,
  ExerciseAnalysisContext,
  ExerciseQuality,
  FeedbackSeverity,
} from '../types';

import {
  PoseLandmarks,
  EMA,
  calculateAngle,
  getCurrentTimeMs,
  hasVisibility,
} from '../utils';

type Stage = 'up' | 'down' | 'unknown';

export class FrontRaisesLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private counter = 0;
  private feedbackCode: FeedbackSignal = 'CMD_RAISE_FRONT';
  private stage: Stage = 'down';

  /**
   * Rep lock system:
   * - false => ready to count next rep
   * - true  => current rep already counted (or invalidated), user must lower to reset
   */
  private repLocked = false;

  /**
   * Tracks if current rep has failed due to bad form
   */
  private hasFailedRep = false;
  private currentInvalidCode: Extract<
    FeedbackSignal,
    'REP_INVALID_BENT_ELBOW' | 'REP_INVALID_UNSYNC' | 'REP_INVALID_TOO_HIGH'
  > | null = null;

  /**
   * Smoothing
   */
  private emaLiftL = new EMA(0.3);
  private emaLiftR = new EMA(0.3);
  private emaLeftElbow = new EMA(0.3);
  private emaRightElbow = new EMA(0.3);

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Feedback pacing
   */
  private lastGuidanceFeedbackTime = 0;
  private lastRepCountTime = 0;

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // =========================================================
  // Tuned Constants
  // =========================================================

  /**
   * Form requirements
   */
  private readonly ELBOW_MIN_ANGLE = 140;

  /**
   * Height thresholds (angles relative to torso)
   */
  private readonly ANGLE_START_RESET = 22;
  private readonly ANGLE_GUIDANCE_START = 42;
  private readonly ANGLE_TARGET_MIN = 78;
  private readonly ANGLE_TARGET_MAX = 112;

  /**
   * Symmetry
   */
  private readonly SYNC_TOLERANCE = 18;

  /**
   * Timing
   */
  private readonly FEEDBACK_COOLDOWN_MS = 700;
  private readonly MIN_TIME_BETWEEN_REPS_MS = 450;

  /**
   * Visibility
   */
  private readonly VISIBILITY_THRESHOLD = 0.6;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  // =========================================================
  // Private Helper Methods
  // =========================================================

  private checkVisibility(landmarks: Landmark[]): boolean {
    const requiredIndices = [
      PoseLandmarks.LEFT_SHOULDER,
      PoseLandmarks.RIGHT_SHOULDER,
      PoseLandmarks.LEFT_ELBOW,
      PoseLandmarks.RIGHT_ELBOW,
      PoseLandmarks.LEFT_WRIST,
      PoseLandmarks.RIGHT_WRIST,
      PoseLandmarks.LEFT_HIP,
      PoseLandmarks.RIGHT_HIP,
    ];

    return requiredIndices.every((idx) =>
      hasVisibility(landmarks[idx], this.VISIBILITY_THRESHOLD)
    );
  }

  private isBodyVisibleStable(landmarks: Landmark[], now: number): boolean {
    const visible = this.checkVisibility(landmarks);

    if (visible) {
      this.bodyMissingStart = null;
      return true;
    }

    if (this.bodyMissingStart === null) {
      this.bodyMissingStart = now;
      return true; // tolerate brief miss
    }

    return now - this.bodyMissingStart < this.BODY_LOST_TOLERANCE_MS;
  }

  private shouldThrottleGuidance(now: number): boolean {
    return now - this.lastGuidanceFeedbackTime < this.FEEDBACK_COOLDOWN_MS;
  }

  private setGuidanceFeedback(code: FeedbackSignal, now: number): void {
    if (this.feedbackCode === code) return;

    if (!this.shouldThrottleGuidance(now)) {
      this.feedbackCode = code;
      this.lastGuidanceFeedbackTime = now;
    }
  }

  private setImmediateFeedback(code: FeedbackSignal): void {
    this.feedbackCode = code;
  }

  private resolveQualityAndSeverity(): {
    is_correct: boolean;
    quality: ExerciseQuality;
    severity: FeedbackSeverity;
  } {
    const code = this.feedbackCode;

    if (code === 'ERR_BODY_NOT_VISIBLE' || code === 'ERR_CAMERA_VIEW') {
      return {
        is_correct: false,
        quality: 'invalid',
        severity: 'critical',
      };
    }

    if (
      code.startsWith('ERR_') ||
      code.startsWith('FIX_') ||
      code.startsWith('WARN_') ||
      code.startsWith('REP_INVALID_')
    ) {
      return {
        is_correct: false,
        quality: 'warning',
        severity: 'warning',
      };
    }

    if (
      code.startsWith('COUNT_') ||
      code.startsWith('REP_NUMBER_') ||
      code === 'GOOD_REP' ||
      code === 'REP_SUCCESS' ||
      code === 'PERFECT'
    ) {
      return {
        is_correct: true,
        quality: 'correct',
        severity: 'success',
      };
    }

    return {
      is_correct: this.lastBodyVisible,
      quality: 'correct',
      severity: 'info',
    };
  }

  private createResult(debug?: Record<string, unknown>): FrontRaisesResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();

    return {
      exercise: 'front_raises',
      reps: this.counter,
      stage: this.stage,
      feedback_code: this.feedbackCode,
      is_correct,
      quality,
      severity,
      timestamp_ms: this.lastTimestampMs,
      is_body_visible: this.lastBodyVisible,
      debug,
    };
  }

  private markBodyNotVisible(): FrontRaisesResult {
    this.stage = 'unknown';
    this.setImmediateFeedback('ERR_BODY_NOT_VISIBLE');
    return this.createResult({
      reason: 'body_not_visible',
    });
  }

  // =========================================================
  // Public API
  // =========================================================

  analyze(
    landmarks: Landmark[],
    context?: ExerciseAnalysisContext
  ): FrontRaisesResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Visibility handling
    const bodyVisibleStable = this.isBodyVisibleStable(landmarks, now);
    this.lastBodyVisible = bodyVisibleStable;

    if (!bodyVisibleStable) {
      return this.markBodyNotVisible();
    }

    // During tolerated visibility loss, keep last stable state
    if (!this.checkVisibility(landmarks)) {
      return this.createResult({
        phase: 'visibility_tolerance',
      });
    }

    // 2) Extract landmarks
    const lSh = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rSh = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lElbow = landmarks[PoseLandmarks.LEFT_ELBOW];
    const rElbow = landmarks[PoseLandmarks.RIGHT_ELBOW];
    const lWr = landmarks[PoseLandmarks.LEFT_WRIST];
    const rWr = landmarks[PoseLandmarks.RIGHT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];

    // 3) Raw angles
    const lLiftRaw = calculateAngle(lHip, lSh, lElbow);
    const rLiftRaw = calculateAngle(rHip, rSh, rElbow);

    const lElbowRaw = calculateAngle(lSh, lElbow, lWr);
    const rElbowRaw = calculateAngle(rSh, rElbow, rWr);

    // 4) Smoothing
    const lLift = this.emaLiftL.update(lLiftRaw);
    const rLift = this.emaLiftR.update(rLiftRaw);
    const lElbowSmoothed = this.emaLeftElbow.update(lElbowRaw);
    const rElbowSmoothed = this.emaRightElbow.update(rElbowRaw);

    // 5) Derived metrics
    const avgLift = (lLift + rLift) / 2;
    const minElbow = Math.min(lElbowSmoothed, rElbowSmoothed);
    const armDiff = Math.abs(lLift - rLift);

    // =========================================================
    // Phase A: RESET / UNLOCK
    // =========================================================
    if (avgLift < this.ANGLE_START_RESET) {
      this.repLocked = false;
      this.hasFailedRep = false;
      this.currentInvalidCode = null;
      this.stage = 'down';
      this.setImmediateFeedback('CMD_RAISE_FRONT');

      return this.createResult({
        phase: 'reset_zone',
        leftLift: lLift,
        rightLift: rLift,
        avgLift,
        leftElbowAngle: lElbowSmoothed,
        rightElbowAngle: rElbowSmoothed,
        armDiff,
      });
    }

    // We are moving upward / active range
    this.stage = 'up';

    // =========================================================
    // Priority 1: Elbow Form
    // =========================================================
    if (minElbow < this.ELBOW_MIN_ANGLE && avgLift > this.ANGLE_GUIDANCE_START) {
      this.hasFailedRep = true;
      this.currentInvalidCode = 'REP_INVALID_BENT_ELBOW';
      this.setImmediateFeedback('STRAIGHTEN_ARMS');

      return this.createResult({
        phase: 'invalid_elbow',
        leftLift: lLift,
        rightLift: rLift,
        avgLift,
        leftElbowAngle: lElbowSmoothed,
        rightElbowAngle: rElbowSmoothed,
        armDiff,
      });
    }

    // =========================================================
    // Priority 2: Sync Check
    // =========================================================
    if (armDiff > this.SYNC_TOLERANCE && avgLift > this.ANGLE_GUIDANCE_START) {
      this.hasFailedRep = true;
      this.currentInvalidCode = 'REP_INVALID_UNSYNC';
      this.setImmediateFeedback('ERR_SWINGING');

      return this.createResult({
        phase: 'invalid_sync',
        leftLift: lLift,
        rightLift: rLift,
        avgLift,
        leftElbowAngle: lElbowSmoothed,
        rightElbowAngle: rElbowSmoothed,
        armDiff,
      });
    }

    // =========================================================
    // Priority 3: Too High
    // =========================================================
    if (avgLift > this.ANGLE_TARGET_MAX) {
      this.hasFailedRep = true;
      this.currentInvalidCode = 'REP_INVALID_TOO_HIGH';
      this.setImmediateFeedback('ERR_TOO_HIGH');

      return this.createResult({
        phase: 'invalid_too_high',
        leftLift: lLift,
        rightLift: rLift,
        avgLift,
        leftElbowAngle: lElbowSmoothed,
        rightElbowAngle: rElbowSmoothed,
        armDiff,
      });
    }

    // =========================================================
    // Phase B: Guidance Zone
    // =========================================================
    if (
      avgLift >= this.ANGLE_GUIDANCE_START &&
      avgLift < this.ANGLE_TARGET_MIN
    ) {
      if (!this.repLocked) {
        this.setGuidanceFeedback('RAISE_YOUR_ARM', now);
      } else {
        this.setImmediateFeedback('CMD_LOWER_SLOWLY');
      }

      return this.createResult({
        phase: 'guidance_zone',
        leftLift: lLift,
        rightLift: rLift,
        avgLift,
        leftElbowAngle: lElbowSmoothed,
        rightElbowAngle: rElbowSmoothed,
        armDiff,
      });
    }

    // =========================================================
    // Phase C: Success Zone
    // =========================================================
    if (
      avgLift >= this.ANGLE_TARGET_MIN &&
      avgLift <= this.ANGLE_TARGET_MAX
    ) {
      if (!this.repLocked) {
        if (
          !this.hasFailedRep &&
          now - this.lastRepCountTime >= this.MIN_TIME_BETWEEN_REPS_MS
        ) {
          this.counter += 1;
          this.repLocked = true;
          this.lastRepCountTime = now;
          this.setImmediateFeedback(`COUNT_${this.counter}`);
        } else {
          // Reached target but rep was invalid
          this.repLocked = true;
          this.setImmediateFeedback(this.currentInvalidCode ?? 'CMD_LOWER_SLOWLY');
        }
      } else {
        this.setImmediateFeedback('HOLD_POSITION');
      }

      return this.createResult({
        phase: 'success_zone',
        leftLift: lLift,
        rightLift: rLift,
        avgLift,
        leftElbowAngle: lElbowSmoothed,
        rightElbowAngle: rElbowSmoothed,
        armDiff,
        hasFailedRep: this.hasFailedRep,
      });
    }

    // =========================================================
    // Phase D: Transition Zone (between reset and active guidance)
    // =========================================================
    if (!this.repLocked) {
      this.setGuidanceFeedback('CONTINUE_RAISING', now);
    } else {
      this.setImmediateFeedback('CMD_LOWER_SLOWLY');
    }

    return this.createResult({
      phase: 'transition_zone',
      leftLift: lLift,
      rightLift: rLift,
      avgLift,
      leftElbowAngle: lElbowSmoothed,
      rightElbowAngle: rElbowSmoothed,
      armDiff,
      hasFailedRep: this.hasFailedRep,
    });
  }

  reset(): void {
    this.counter = 0;
    this.repLocked = false;
    this.hasFailedRep = false;
    this.currentInvalidCode = null;

    this.feedbackCode = 'CMD_RAISE_FRONT';
    this.stage = 'down';

    this.lastGuidanceFeedbackTime = 0;
    this.lastRepCountTime = 0;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;
    this.bodyMissingStart = null;

    this.emaLiftL.reset();
    this.emaLiftR.reset();
    this.emaLeftElbow.reset();
    this.emaRightElbow.reset();
  }

  getRepCount(): number {
    return this.counter;
  }

  isRepLocked(): boolean {
    return this.repLocked;
  }
}