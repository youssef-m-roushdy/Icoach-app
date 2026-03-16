/**
 * ChairSquatLogic.ts
 *
 * Chair Squat:
 * - Stand in front of a chair
 * - Lower your hips back and down until you lightly touch the seat
 * - Push through your heels to stand back up
 * - Keep your chest up
 *
 * Improvements:
 * - Time-based setup / stability instead of frame-based logic
 * - Better compatibility with updated types.ts and utils.ts
 * - Visibility debounce to reduce camera flicker
 * - Invalid reps are tracked properly (too deep / back bent)
 * - Richer result metadata (quality, severity, timestamp, visibility, debug)
 * - Keeps backward compatibility with existing UI through is_correct
 */

import type {
  Landmark,
  ChairSquatResult,
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
} from '../utils';

type Stage = 'setup' | 'up' | 'down';

type TrackedSide = 'LEFT' | 'RIGHT';

export class ChairSquatLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private reps = 0;
  private stage: Stage = 'setup';

  private feedbackCode: FeedbackSignal = 'SETUP_STAND_STRAIGHT';
  private isCorrect = false;

  private isSystemActive = false;

  /**
   * A rep becomes invalid if form breaks during the current rep.
   * Example:
   * - goes too deep
   * - bends torso too much
   */
  private hasFailedRep = false;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Stable-time tracking
   */
  private setupStableStart: number | null = null;
  private downStableStart: number | null = null;
  private upStableStart: number | null = null;

  /**
   * Smoothing
   */
  private emaKnee = new EMA(0.3);
  private emaHip = new EMA(0.3);

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Tunable Constants
  // -------------------------------------------------
  private readonly VIS = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  private readonly SETUP_STABLE_MS = 700;
  private readonly DOWN_CONFIRM_MS = 120;
  private readonly UP_CONFIRM_MS = 120;

  /**
   * Thresholds
   */
  private readonly KNEE_STAND = 160;

  /**
   * Chair touch zone:
   * Reaching around this angle is enough to consider the user
   * has gone low enough to "touch the chair".
   */
  private readonly KNEE_DOWN = 100;

  /**
   * Too deep threshold:
   * If user goes significantly deeper than a chair squat,
   * mark the current rep invalid.
   *
   * Relaxed but still meaningful.
   */
  private readonly KNEE_TOO_DEEP = 65;

  /**
   * Chest-up / torso control:
   * Lower values mean the torso is collapsing too much forward.
   */
  private readonly MIN_HIP_ANGLE = 60;

  /**
   * Optional debug threshold for highlighting unstable asymmetry patterns later
   * if you want to add more diagnostics.
   */
  // private readonly ANGLE_BUFFER = 4;

  // -------------------------------------------------
  // Side Selection / Visibility
  // -------------------------------------------------
  private visible(landmarks: Array<Landmark | undefined>): boolean {
    return landmarks.every((lm) => hasVisibility(lm, this.VIS));
  }

  private pickTrackedSide(lm: Landmark[]): {
    side: TrackedSide;
    shoulder: Landmark;
    hip: Landmark;
    knee: Landmark;
    ankle: Landmark;
  } | null {
    const leftShoulder = lm[PoseLandmarks.LEFT_SHOULDER];
    const leftHip = lm[PoseLandmarks.LEFT_HIP];
    const leftKnee = lm[PoseLandmarks.LEFT_KNEE];
    const leftAnkle = lm[PoseLandmarks.LEFT_ANKLE];

    const rightShoulder = lm[PoseLandmarks.RIGHT_SHOULDER];
    const rightHip = lm[PoseLandmarks.RIGHT_HIP];
    const rightKnee = lm[PoseLandmarks.RIGHT_KNEE];
    const rightAnkle = lm[PoseLandmarks.RIGHT_ANKLE];

    const leftVisible = this.visible([
      leftShoulder,
      leftHip,
      leftKnee,
      leftAnkle,
    ]);

    const rightVisible = this.visible([
      rightShoulder,
      rightHip,
      rightKnee,
      rightAnkle,
    ]);

    if (!leftVisible && !rightVisible) {
      return null;
    }

    const leftScore =
      (leftShoulder?.visibility ?? 0) +
      (leftHip?.visibility ?? 0) +
      (leftKnee?.visibility ?? 0) +
      (leftAnkle?.visibility ?? 0);

    const rightScore =
      (rightShoulder?.visibility ?? 0) +
      (rightHip?.visibility ?? 0) +
      (rightKnee?.visibility ?? 0) +
      (rightAnkle?.visibility ?? 0);

    if (rightVisible && (!leftVisible || rightScore >= leftScore)) {
      return {
        side: 'RIGHT',
        shoulder: rightShoulder!,
        hip: rightHip!,
        knee: rightKnee!,
        ankle: rightAnkle!,
      };
    }

    return {
      side: 'LEFT',
      shoulder: leftShoulder!,
      hip: leftHip!,
      knee: leftKnee!,
      ankle: leftAnkle!,
    };
  }

  private isBodyVisibleStable(isVisibleNow: boolean, now: number): boolean {
    if (isVisibleNow) {
      this.bodyMissingStart = null;
      return true;
    }

    if (this.bodyMissingStart === null) {
      this.bodyMissingStart = now;
      return true; // tolerate brief flicker
    }

    return now - this.bodyMissingStart < this.BODY_LOST_TOLERANCE_MS;
  }

  // -------------------------------------------------
  // Result Helpers
  // -------------------------------------------------
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
      code === 'STEP_BACK' ||
      code === 'START_POSITION' ||
      code === 'START_MOVING'
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
      code === 'REP_SUCCESS' ||
      code === 'GOOD_REP' ||
      code === 'PERFECT' ||
      code === 'PERFECT_LEVEL' ||
      code === 'PERFECT_LOCKOUT'
    ) {
      return {
        is_correct: true,
        quality: 'correct',
        severity: 'success',
      };
    }

    return {
      is_correct: this.isSystemActive && this.lastBodyVisible,
      quality: this.isSystemActive ? 'correct' : 'setup',
      severity: 'info',
    };
  }

  private buildResult(debug?: Record<string, unknown>): ChairSquatResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    return {
      exercise: 'chair_squat',
      reps: this.reps,
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

  private markBodyNotVisible(): ChairSquatResult {
    this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
    return this.buildResult({
      reason: 'body_not_visible',
    });
  }

  private setFeedback(code: FeedbackSignal): void {
    this.feedbackCode = code;
  }

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------
  analyze(
    lm: Landmark[],
    context?: ExerciseAnalysisContext
  ): ChairSquatResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Pick visible side
    const tracked = this.pickTrackedSide(lm);
    const visibleNow = tracked !== null;

    // 2) Visibility debounce
    const visibleStable = this.isBodyVisibleStable(visibleNow, now);
    this.lastBodyVisible = visibleStable;

    if (!visibleStable) {
      return this.markBodyNotVisible();
    }

    // During tolerated brief visibility loss, keep the previous stable result
    if (!tracked) {
      return this.buildResult({
        phase: 'visibility_tolerance',
      });
    }

    const { side, shoulder, hip, knee, ankle } = tracked;

    // 3) Angles
    const kneeAngle = this.emaKnee.update(calculateAngle(hip, knee, ankle));
    const hipAngle = this.emaHip.update(calculateAngle(shoulder, hip, knee));

    // -------------------------------------------------
    // SETUP PHASE
    // -------------------------------------------------
    if (!this.isSystemActive) {
      this.stage = 'setup';

      if (kneeAngle >= this.KNEE_STAND) {
        if (this.setupStableStart === null) {
          this.setupStableStart = now;
        }

        const stableMs = now - this.setupStableStart;

        if (stableMs >= this.SETUP_STABLE_MS) {
          this.isSystemActive = true;
          this.stage = 'up';
          this.downStableStart = null;
          this.upStableStart = null;
          this.setFeedback('CMD_GO_DOWN');
        } else {
          this.setFeedback('SETUP_STAND_STRAIGHT');
        }
      } else {
        this.setupStableStart = null;
        this.setFeedback('SETUP_STAND_STRAIGHT');
      }

      return this.buildResult({
        phase: 'setup',
        side,
        kneeAngle,
        hipAngle,
        setupStableMs: this.setupStableStart ? now - this.setupStableStart : 0,
      });
    }

    // -------------------------------------------------
    // ACTIVE PHASE
    // -------------------------------------------------

    // Critical form errors first

    // Too deep: mark rep invalid
    if (kneeAngle < this.KNEE_TOO_DEEP) {
      this.hasFailedRep = true;
      this.setFeedback('ERR_TOO_DEEP');

      return this.buildResult({
        phase: 'active',
        side,
        kneeAngle,
        hipAngle,
        hasFailedRep: this.hasFailedRep,
        reason: 'too_deep',
      });
    }

    // Back bent: also mark current rep invalid
    if (kneeAngle < 150 && hipAngle < this.MIN_HIP_ANGLE) {
      this.hasFailedRep = true;
      this.setFeedback('ERR_BACK_BENT');

      return this.buildResult({
        phase: 'active',
        side,
        kneeAngle,
        hipAngle,
        hasFailedRep: this.hasFailedRep,
        reason: 'back_bent',
      });
    }

    // -------------------------------------------------
    // State Machine
    // -------------------------------------------------

    if (this.stage === 'up') {
      // Reset invalid flag when user is fully back at top
      if (kneeAngle > 150) {
        this.hasFailedRep = false;
      }

      // Going low enough to touch chair
      if (kneeAngle <= this.KNEE_DOWN) {
        if (this.downStableStart === null) {
          this.downStableStart = now;
        }

        const stableMs = now - this.downStableStart;

        if (stableMs >= this.DOWN_CONFIRM_MS) {
          this.stage = 'down';
          this.downStableStart = null;
          this.upStableStart = null;
          this.setFeedback('CMD_STAND_UP');
        } else {
          this.setFeedback('CMD_STAND_UP');
        }

        return this.buildResult({
          phase: 'descending_confirm',
          side,
          kneeAngle,
          hipAngle,
          downStableMs: stableMs,
          hasFailedRep: this.hasFailedRep,
        });
      }

      // Not low enough yet
      this.downStableStart = null;

      if (kneeAngle < 130) {
        this.setFeedback('CMD_GO_LOWER');
      } else {
        this.setFeedback('CMD_GO_DOWN');
      }

      return this.buildResult({
        phase: 'standing_or_descending',
        side,
        kneeAngle,
        hipAngle,
        hasFailedRep: this.hasFailedRep,
      });
    }

    if (this.stage === 'down') {
      // Waiting to stand back up fully
      if (kneeAngle >= this.KNEE_STAND) {
        if (this.upStableStart === null) {
          this.upStableStart = now;
        }

        const stableMs = now - this.upStableStart;

        if (stableMs >= this.UP_CONFIRM_MS) {
          if (!this.hasFailedRep) {
            this.reps += 1;
            this.setFeedback(`COUNT_${this.reps}`);
          } else {
            // Rep completed physically, but was invalid
            this.setFeedback('CMD_GO_DOWN');
          }

          this.stage = 'up';
          this.upStableStart = null;
          this.downStableStart = null;
          this.hasFailedRep = false;
        } else {
          this.setFeedback('CMD_STAND_UP');
        }

        return this.buildResult({
          phase: 'ascending_confirm',
          side,
          kneeAngle,
          hipAngle,
          upStableMs: stableMs,
          hasFailedRep: this.hasFailedRep,
        });
      }

      // Still down / coming up
      this.upStableStart = null;

      if (this.hasFailedRep) {
        // Keep surfacing the most relevant invalid state while stuck down
        this.setFeedback('ERR_TOO_DEEP');
      } else {
        this.setFeedback('CMD_STAND_UP');
      }

      return this.buildResult({
        phase: 'bottom_or_rising',
        side,
        kneeAngle,
        hipAngle,
        hasFailedRep: this.hasFailedRep,
      });
    }

    // Fallback safety
    this.setFeedback(this.feedbackCode);
    return this.buildResult({
      phase: 'fallback',
      side,
      kneeAngle,
      hipAngle,
      hasFailedRep: this.hasFailedRep,
    });
  }

  reset(): void {
    this.reps = 0;
    this.stage = 'setup';

    this.feedbackCode = 'SETUP_STAND_STRAIGHT';
    this.isCorrect = false;

    this.isSystemActive = false;
    this.hasFailedRep = false;

    this.bodyMissingStart = null;

    this.setupStableStart = null;
    this.downStableStart = null;
    this.upStableStart = null;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.emaKnee.reset();
    this.emaHip.reset();
  }
}