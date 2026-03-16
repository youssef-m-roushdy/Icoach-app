/**
 * GluteBridgeLogic.ts
 *
 * Flexible but robust glute bridge logic.
 *
 * Strategy:
 * - Main driver = Hip angle (Shoulder-Hip-Knee)
 * - UP: body becomes relatively straight
 * - DOWN: hips drop and angle closes
 * - Setup: knees must be bent
 *
 * Improvements:
 * - Uses updated engine types and metadata
 * - Adds visibility debounce
 * - Adds stability windows + rep cooldown
 * - Fixes impossible hyperextension check (>195 on a 0..180 angle)
 * - Uses line-deviation check to detect arching / overextension
 */

import type {
  Landmark,
  GluteBridgeResult,
  ExerciseLogic,
  FeedbackSignal,
  ExerciseAnalysisContext,
  ExerciseQuality,
  FeedbackSeverity,
} from '../types';

import {
  PoseLandmarks,
  calculateAngle,
  EMA,
  getCurrentTimeMs,
  hasVisibility,
  calculateDistance,
} from '../utils';

type Stage = 'setup' | 'down' | 'up';
type TrackedSide = 'LEFT' | 'RIGHT';

export class GluteBridgeLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private reps = 0;
  private stage: Stage = 'setup';
  private feedbackCode: FeedbackSignal = 'SETUP_LIE_DOWN';
  private isCorrect = false;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Stability / timing
   */
  private setupStableStart: number | null = null;
  private upStableStart: number | null = null;
  private downStableStart: number | null = null;
  private lastRepTime = 0;

  /**
   * Smoothing
   */
  private emaHipAngle = new EMA(0.3);   // Shoulder-Hip-Knee
  private emaKneeAngle = new EMA(0.3);  // Hip-Knee-Ankle

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Thresholds
  // -------------------------------------------------

  /**
   * Bridge top:
   * body almost straight
   */
  private readonly HIP_ANGLE_UP = 152;

  /**
   * Bridge bottom:
   * hips dropped enough
   */
  private readonly HIP_ANGLE_DOWN = 140;

  /**
   * Setup:
   * knees must be bent enough
   */
  private readonly MAX_KNEE_ANGLE_SETUP = 135;

  /**
   * Arch detection:
   * if hip rises noticeably above the shoulder-knee line,
   * it likely indicates overextension / arching.
   */
  private readonly ARCH_TOLERANCE_RATIO = 0.07;

  /**
   * Visibility
   */
  private readonly MIN_VISIBILITY = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  /**
   * Timing
   */
  private readonly SETUP_STABLE_MS = 400;
  private readonly UP_CONFIRM_MS = 140;
  private readonly DOWN_CONFIRM_MS = 140;
  private readonly MIN_TIME_BETWEEN_REPS_MS = 450;

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  private checkVisibility(lms: Array<Landmark | undefined>): boolean {
    return lms.every((lm) => hasVisibility(lm, this.MIN_VISIBILITY));
  }

  private isBodyVisibleStable(
    visibleNow: boolean,
    now: number
  ): boolean {
    if (visibleNow) {
      this.bodyMissingStart = null;
      return true;
    }

    if (this.bodyMissingStart === null) {
      this.bodyMissingStart = now;
      return true; // tolerate brief flicker
    }

    return now - this.bodyMissingStart < this.BODY_LOST_TOLERANCE_MS;
  }

  private pickTrackedSide(landmarks: Landmark[]): {
    side: TrackedSide;
    shoulder: Landmark;
    hip: Landmark;
    knee: Landmark;
    ankle: Landmark;
  } | null {
    const lShoulder = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];
    const lAnkle = landmarks[PoseLandmarks.LEFT_ANKLE];

    const rShoulder = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];
    const rAnkle = landmarks[PoseLandmarks.RIGHT_ANKLE];

    const leftVisible = this.checkVisibility([lShoulder, lHip, lKnee, lAnkle]);
    const rightVisible = this.checkVisibility([rShoulder, rHip, rKnee, rAnkle]);

    if (!leftVisible && !rightVisible) {
      return null;
    }

    const leftScore =
      (lShoulder?.visibility ?? 0) +
      (lHip?.visibility ?? 0) +
      (lKnee?.visibility ?? 0) +
      (lAnkle?.visibility ?? 0);

    const rightScore =
      (rShoulder?.visibility ?? 0) +
      (rHip?.visibility ?? 0) +
      (rKnee?.visibility ?? 0) +
      (rAnkle?.visibility ?? 0);

    if (rightVisible && (!leftVisible || rightScore >= leftScore)) {
      return {
        side: 'RIGHT',
        shoulder: rShoulder!,
        hip: rHip!,
        knee: rKnee!,
        ankle: rAnkle!,
      };
    }

    return {
      side: 'LEFT',
      shoulder: lShoulder!,
      hip: lHip!,
      knee: lKnee!,
      ankle: lAnkle!,
    };
  }

  /**
   * Positive delta means hip is ABOVE the shoulder-knee line
   * (smaller Y on screen = higher in image coordinates).
   */
  private getHipAboveLineAmount(
    shoulder: Landmark,
    hip: Landmark,
    knee: Landmark
  ): number {
    const dx = knee.x - shoulder.x;
    if (Math.abs(dx) < 1e-6) return 0;

    const expectedHipY =
      shoulder.y +
      ((knee.y - shoulder.y) * (hip.x - shoulder.x)) / dx;

    return expectedHipY - hip.y;
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
      code.startsWith('SETUP_') ||
      code === 'SETUP_POSITION' ||
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
      code === 'GOOD_REP' ||
      code === 'REP_SUCCESS' ||
      code === 'HOLD_BRIDGE'
    ) {
      return {
        is_correct: true,
        quality: 'correct',
        severity: 'success',
      };
    }

    return {
      is_correct: this.lastBodyVisible && this.stage !== 'setup',
      quality: this.stage === 'setup' ? 'setup' : 'correct',
      severity: 'info',
    };
  }

  private createResult(debug?: Record<string, unknown>): GluteBridgeResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    /**
     * Keep backward compatibility:
     * some UIs expect up/down only.
     * During setup, expose "down" and keep raw state in debug.
     */
    const stageForUi: 'up' | 'down' =
      this.stage === 'up' ? 'up' : 'down';

    return {
      exercise: 'glute_bridge',
      reps: this.reps,
      stage: stageForUi,
      feedback_code: this.feedbackCode,
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
  ): GluteBridgeResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Side tracking + visibility
    const tracked = this.pickTrackedSide(landmarks);
    const visibleNow = tracked !== null;

    const visibleStable = this.isBodyVisibleStable(visibleNow, now);
    this.lastBodyVisible = visibleStable;

    if (!visibleStable) {
      this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
      return this.createResult({
        reason: 'body_not_visible',
      });
    }

    // During tolerated flicker, keep last stable state
    if (!tracked) {
      return this.createResult({
        phase: 'visibility_tolerance',
      });
    }

    const { side, shoulder, hip, knee, ankle } = tracked;

    // 2) Angles
    const rawHipAngle = calculateAngle(shoulder, hip, knee);
    const hipAngle = this.emaHipAngle.update(rawHipAngle);

    const rawKneeAngle = calculateAngle(hip, knee, ankle);
    const kneeAngle = this.emaKneeAngle.update(rawKneeAngle);

    const torsoSize = calculateDistance(shoulder, hip);
    const hipAboveLine = this.getHipAboveLineAmount(shoulder, hip, knee);
    const archTolerance = torsoSize * this.ARCH_TOLERANCE_RATIO;

    // -------------------------------------------------
    // SETUP CHECK
    // -------------------------------------------------
    if (kneeAngle > this.MAX_KNEE_ANGLE_SETUP) {
      this.stage = 'setup';
      this.setupStableStart = null;
      this.upStableStart = null;
      this.downStableStart = null;
      this.feedbackCode = 'SETUP_POSITION';

      return this.createResult({
        phase: 'setup_knees_not_bent',
        side,
        hipAngle,
        kneeAngle,
        hipAboveLine,
        archTolerance,
      });
    }

    if (this.stage === 'setup') {
      if (this.setupStableStart === null) {
        this.setupStableStart = now;
      }

      const stableMs = now - this.setupStableStart;

      if (stableMs >= this.SETUP_STABLE_MS) {
        this.stage = 'down';
        this.feedbackCode = 'CMD_PUSH_HIPS';
      } else {
        this.feedbackCode = 'SETUP_LIE_DOWN';
      }

      return this.createResult({
        phase: 'setup_hold',
        side,
        hipAngle,
        kneeAngle,
        stableMs,
        hipAboveLine,
        archTolerance,
      });
    }

    // -------------------------------------------------
    // ACTIVE PHASE
    // -------------------------------------------------

    // Detect arching / overextension while at top
    if (this.stage === 'up' && hipAboveLine > archTolerance) {
      this.feedbackCode = 'ERR_ARCHING_BACK';

      return this.createResult({
        phase: 'arch_detected',
        side,
        hipAngle,
        kneeAngle,
        hipAboveLine,
        archTolerance,
      });
    }

    // -------------------------
    // DOWN -> waiting to go UP
    // -------------------------
    if (this.stage === 'down') {
      if (hipAngle >= this.HIP_ANGLE_UP) {
        if (this.upStableStart === null) {
          this.upStableStart = now;
        }

        const stableMs = now - this.upStableStart;

        if (
          stableMs >= this.UP_CONFIRM_MS &&
          now - this.lastRepTime >= this.MIN_TIME_BETWEEN_REPS_MS
        ) {
          this.reps += 1;
          this.stage = 'up';
          this.lastRepTime = now;
          this.upStableStart = null;
          this.downStableStart = null;
          this.feedbackCode = `COUNT_${this.reps}`;
        } else {
          this.feedbackCode = 'HOLD_BRIDGE';
        }

        return this.createResult({
          phase: 'up_confirm',
          side,
          hipAngle,
          kneeAngle,
          stableMs,
          hipAboveLine,
          archTolerance,
        });
      }

      // Still down or rising
      this.upStableStart = null;

      if (hipAngle > 142) {
        this.feedbackCode = 'CMD_PUSH_HIGHER';
      } else {
        this.feedbackCode = 'CMD_PUSH_HIPS';
      }

      return this.createResult({
        phase: 'down_or_rising',
        side,
        hipAngle,
        kneeAngle,
        hipAboveLine,
        archTolerance,
      });
    }

    // -------------------------
    // UP -> waiting to go DOWN
    // -------------------------
    if (hipAngle <= this.HIP_ANGLE_DOWN) {
      if (this.downStableStart === null) {
        this.downStableStart = now;
      }

      const stableMs = now - this.downStableStart;

      if (stableMs >= this.DOWN_CONFIRM_MS) {
        this.stage = 'down';
        this.downStableStart = null;
        this.upStableStart = null;
        this.feedbackCode = 'CMD_PUSH_HIPS';
      } else {
        this.feedbackCode = 'CMD_PUSH_HIPS';
      }

      return this.createResult({
        phase: 'down_confirm',
        side,
        hipAngle,
        kneeAngle,
        stableMs,
        hipAboveLine,
        archTolerance,
      });
    }

    // Still up / holding top
    this.downStableStart = null;
    this.feedbackCode = 'HOLD_BRIDGE';

    return this.createResult({
      phase: 'holding_top',
      side,
      hipAngle,
      kneeAngle,
      hipAboveLine,
      archTolerance,
    });
  }

  reset(): void {
    this.reps = 0;
    this.stage = 'setup';
    this.feedbackCode = 'SETUP_LIE_DOWN';
    this.isCorrect = false;

    this.bodyMissingStart = null;

    this.setupStableStart = null;
    this.upStableStart = null;
    this.downStableStart = null;
    this.lastRepTime = 0;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.emaHipAngle.reset();
    this.emaKneeAngle.reset();
  }
}