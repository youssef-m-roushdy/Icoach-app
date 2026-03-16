/**
 * Superman Logic - TypeScript Implementation
 * On-Device Exercise Analysis
 *
 * Improvements:
 * - Uses milliseconds instead of legacy seconds timing
 * - Adds visibility debounce
 * - Uses tracked visible side instead of hard-coded left side only
 * - Uses smoothed lift margins for better stability
 * - Returns hold_timer as elapsed hold duration (seconds), not raw timestamp
 * - Adds richer result metadata from updated types.ts
 */

import type {
  Landmark,
  SupermanResult,
  ExerciseLogic,
  FeedbackSignal,
  ExerciseAnalysisContext,
  ExerciseQuality,
  FeedbackSeverity,
} from '../types';

import {
  EMA,
  getCurrentTimeMs,
  PoseLandmarks,
  hasVisibility,
} from '../utils';

type Stage = 'setup' | 'down' | 'up';
type TrackedSide = 'LEFT' | 'RIGHT';

export class SupermanLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private counter = 0;
  private stage: Stage = 'setup';
  private feedbackCode: FeedbackSignal = 'ERR_NOT_LYING_FLAT';
  private isCorrect = false;

  /**
   * Activation / start flow
   */
  private hasStarted = false;
  private setupStableStartMs: number | null = null;

  /**
   * Hold state
   */
  private holdTimerStartMs: number | null = null;
  private lastRepTimeMs = 0;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Smoothing: positive value means lifted
   */
  private armLiftEMA = new EMA(0.3);
  private legLiftEMA = new EMA(0.3);

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Constants
  // -------------------------------------------------

  /**
   * Required hold at top before rep is counted
   */
  private readonly HOLD_DURATION_MS = 300;

  /**
   * Required lift margin
   * Smaller Y means visually higher on screen
   */
  private readonly LIFT_THRESHOLD = 0.04;

  /**
   * Minimum delay between reps to avoid bounce-counting
   */
  private readonly MIN_TIME_BETWEEN_REPS_MS = 500;

  /**
   * Start / setup stability
   */
  private readonly SETUP_STABLE_MS = 350;

  /**
   * Horizontal lying tolerance:
   * torso should be more horizontal than vertical
   */
  private readonly LYING_HORIZONTAL_MULT = 0.8;

  /**
   * Visibility
   */
  private readonly VISIBILITY_THRESHOLD = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  private pickTrackedSide(landmarks: Landmark[]): {
    side: TrackedSide;
    shoulder: Landmark;
    wrist: Landmark;
    hip: Landmark;
    ankle: Landmark;
  } | null {
    const lShoulder = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const lWrist = landmarks[PoseLandmarks.LEFT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const lAnkle = landmarks[PoseLandmarks.LEFT_ANKLE];

    const rShoulder = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const rWrist = landmarks[PoseLandmarks.RIGHT_WRIST];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const rAnkle = landmarks[PoseLandmarks.RIGHT_ANKLE];

    const leftVisible =
      hasVisibility(lShoulder, this.VISIBILITY_THRESHOLD) &&
      hasVisibility(lWrist, this.VISIBILITY_THRESHOLD) &&
      hasVisibility(lHip, this.VISIBILITY_THRESHOLD) &&
      hasVisibility(lAnkle, this.VISIBILITY_THRESHOLD);

    const rightVisible =
      hasVisibility(rShoulder, this.VISIBILITY_THRESHOLD) &&
      hasVisibility(rWrist, this.VISIBILITY_THRESHOLD) &&
      hasVisibility(rHip, this.VISIBILITY_THRESHOLD) &&
      hasVisibility(rAnkle, this.VISIBILITY_THRESHOLD);

    if (!leftVisible && !rightVisible) {
      return null;
    }

    const leftScore =
      (lShoulder?.visibility ?? 0) +
      (lWrist?.visibility ?? 0) +
      (lHip?.visibility ?? 0) +
      (lAnkle?.visibility ?? 0);

    const rightScore =
      (rShoulder?.visibility ?? 0) +
      (rWrist?.visibility ?? 0) +
      (rHip?.visibility ?? 0) +
      (rAnkle?.visibility ?? 0);

    if (rightVisible && (!leftVisible || rightScore >= leftScore)) {
      return {
        side: 'RIGHT',
        shoulder: rShoulder!,
        wrist: rWrist!,
        hip: rHip!,
        ankle: rAnkle!,
      };
    }

    return {
      side: 'LEFT',
      shoulder: lShoulder!,
      wrist: lWrist!,
      hip: lHip!,
      ankle: lAnkle!,
    };
  }

  private isBodyVisibleStable(visibleNow: boolean, nowMs: number): boolean {
    if (visibleNow) {
      this.bodyMissingStart = null;
      return true;
    }

    if (this.bodyMissingStart === null) {
      this.bodyMissingStart = nowMs;
      return true; // tolerate brief flicker
    }

    return nowMs - this.bodyMissingStart < this.BODY_LOST_TOLERANCE_MS;
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
      code === 'ERR_NOT_LYING_FLAT' ||
      code.startsWith('SETUP_') ||
      code === 'START_POSITION'
    ) {
      return {
        is_correct: false,
        quality: 'setup',
        severity: 'info',
      };
    }

    if (
      code.startsWith('ERR_') ||
      code.startsWith('FIX_') ||
      code.startsWith('WARN_')
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
      code === 'HOLD_STABILIZE' ||
      code === 'GOOD_REP' ||
      code === 'REP_SUCCESS'
    ) {
      return {
        is_correct: true,
        quality: 'correct',
        severity: 'success',
      };
    }

    return {
      is_correct: this.lastBodyVisible && this.hasStarted,
      quality: this.hasStarted ? 'correct' : 'setup',
      severity: 'info',
    };
  }

  private getCurrentHoldSeconds(nowMs: number): number {
    if (this.holdTimerStartMs === null) return 0;
    return Math.max(0, (nowMs - this.holdTimerStartMs) / 1000);
  }

  private createResult(debug?: Record<string, unknown>): SupermanResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    /**
     * Keep backward compatibility:
     * expose 'down' during setup for older UIs,
     * while keeping the true internal state in debug.
     */
    const stageForUi = this.stage === 'up' ? 'up' : 'down';

    return {
      exercise: 'superman',
      reps: this.counter,
      stage: stageForUi,
      feedback_code: this.feedbackCode,
      hold_timer: this.getCurrentHoldSeconds(this.lastTimestampMs),
      is_correct,
      quality,
      severity,
      timestamp_ms: this.lastTimestampMs,
      is_body_visible: this.lastBodyVisible,
      debug: {
        rawState: this.stage,
        ...debug,
      },
    };
  }

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------
  analyze(
    landmarks: Landmark[],
    context?: ExerciseAnalysisContext
  ): SupermanResult {
    const nowMs = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = nowMs;

    // 1) Pick visible side
    const tracked = this.pickTrackedSide(landmarks);
    const visibleNow = tracked !== null;

    // 2) Visibility debounce
    const visibleStable = this.isBodyVisibleStable(visibleNow, nowMs);
    this.lastBodyVisible = visibleStable;

    if (!visibleStable) {
      this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
      this.hasStarted = false;
      this.holdTimerStartMs = null;
      this.stage = 'setup';

      return this.createResult({
        reason: 'body_not_visible',
      });
    }

    // During tolerated visibility loss, keep last stable state
    if (!tracked) {
      return this.createResult({
        phase: 'visibility_tolerance',
      });
    }

    const { side, shoulder, wrist, hip, ankle } = tracked;

    // 3) Lying position check
    const torsoDx = Math.abs(shoulder.x - hip.x);
    const torsoDy = Math.abs(shoulder.y - hip.y);
    const isLyingFlat = torsoDx > torsoDy * this.LYING_HORIZONTAL_MULT;

    // 4) Smoothed lift margins
    // Positive = raised
    const rawArmLift = shoulder.y - wrist.y;
    const rawLegLift = hip.y - ankle.y;

    const armLift = this.armLiftEMA.update(rawArmLift);
    const legLift = this.legLiftEMA.update(rawLegLift);

    const handsUp = armLift > this.LIFT_THRESHOLD;
    const legsUp = legLift > this.LIFT_THRESHOLD;

    // ==========================================
    // A) Start / Setup Verification
    // ==========================================
    if (!isLyingFlat) {
      this.stage = 'setup';
      this.feedbackCode = 'ERR_NOT_LYING_FLAT';
      this.hasStarted = false;
      this.holdTimerStartMs = null;
      this.setupStableStartMs = null;

      return this.createResult({
        phase: 'not_lying_flat',
        side,
        torsoDx,
        torsoDy,
        armLift,
        legLift,
      });
    }

    if (!this.hasStarted) {
      this.stage = 'setup';

      if (this.setupStableStartMs === null) {
        this.setupStableStartMs = nowMs;
      }

      const stableMs = nowMs - this.setupStableStartMs;

      if (stableMs >= this.SETUP_STABLE_MS) {
        this.hasStarted = true;
        this.stage = 'down';
        this.feedbackCode = 'SYSTEM_READY_GO';
      } else {
        this.feedbackCode = 'SYSTEM_READY_GO';
      }

      return this.createResult({
        phase: 'setup_hold',
        side,
        stableMs,
        torsoDx,
        torsoDy,
        armLift,
        legLift,
      });
    }

    // ==========================================
    // B) Main Logic
    // ==========================================

    // --- Case 1: Both arms and legs up ---
    if (handsUp && legsUp) {
      if (this.holdTimerStartMs === null) {
        this.holdTimerStartMs = nowMs;
      }

      const holdDurationMs = nowMs - this.holdTimerStartMs;

      if (holdDurationMs >= this.HOLD_DURATION_MS) {
        if (
          this.stage === 'down' &&
          nowMs - this.lastRepTimeMs >= this.MIN_TIME_BETWEEN_REPS_MS
        ) {
          this.stage = 'up';
          this.counter += 1;
          this.lastRepTimeMs = nowMs;
          this.feedbackCode = `COUNT_${this.counter}`;
        } else {
          this.feedbackCode = 'HOLD_STABILIZE';
        }
      } else {
        this.feedbackCode = 'HOLD_STABILIZE';
      }

      return this.createResult({
        phase: 'holding_top',
        side,
        holdDurationMs,
        armLift,
        legLift,
      });
    }

    // --- Case 2: Fully reset down ---
    if (!handsUp && !legsUp) {
      this.stage = 'down';
      this.feedbackCode = 'CMD_GO_UP';
      this.holdTimerStartMs = null;

      return this.createResult({
        phase: 'fully_reset',
        side,
        armLift,
        legLift,
      });
    }

    // --- Case 3: Mixed / partial errors ---
    this.holdTimerStartMs = null;

    if (this.stage === 'down') {
      if (handsUp && !legsUp) {
        this.feedbackCode = 'ERR_LIFT_LEGS';
      } else if (!handsUp && legsUp) {
        this.feedbackCode = 'ERR_LIFT_ARMS';
      }
    } else {
      this.feedbackCode = 'ERR_RESET_FULL';
    }

    return this.createResult({
      phase: 'mixed_error',
      side,
      armLift,
      legLift,
      handsUp,
      legsUp,
    });
  }

  /**
   * Reset the logic state for a new session
   */
  reset(): void {
    this.counter = 0;
    this.stage = 'setup';
    this.feedbackCode = 'ERR_NOT_LYING_FLAT';
    this.isCorrect = false;

    this.hasStarted = false;
    this.setupStableStartMs = null;
    this.holdTimerStartMs = null;
    this.lastRepTimeMs = 0;

    this.bodyMissingStart = null;
    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.armLiftEMA.reset();
    this.legLiftEMA.reset();
  }
}