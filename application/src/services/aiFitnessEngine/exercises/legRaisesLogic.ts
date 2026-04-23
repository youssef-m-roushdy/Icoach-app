/**
 * Leg Raises Logic - Stable Version
 *
 * Improvements:
 * - Uses shared EMA from utils.ts
 * - Adds setup phase and visibility debounce
 * - Adds rep invalidation for bent knees / unsynced legs
 * - Counts only on full repetition completion (down return)
 * - Uses richer result metadata from updated types.ts
 *
 * FIX:
 * - If an error happens before stage becomes "up" officially,
 *   the invalidation flag is now cleared properly when user returns
 *   to the bottom cleanly, so the very next rep can count normally.
 */

import type {
  Landmark,
  LegRaisesResult,
  ExerciseLogic,
  FeedbackSignal,
  ExerciseAnalysisContext,
  ExerciseQuality,
  FeedbackSeverity,
} from '../types';

import {
  calculateAngle,
  EMA,
  getCurrentTimeMs,
  PoseLandmarks,
  hasVisibility,
} from '../utils';

type Stage = 'setup' | 'down' | 'up';

export class LegRaisesLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private counter = 0;
  private stage: Stage = 'setup';
  private feedbackCode: FeedbackSignal = 'START_POSITION';
  private isCorrect = false;

  /**
   * Current rep validity:
   * if form breaks during current rep, do not count it.
   */
  private repInvalidated = false;
  private currentInvalidCode: Extract<
    FeedbackSignal,
    'ERR_BENT_KNEES' | 'ERR_LEGS_SYNC'
  > | null = null;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Timing / stability
   */
  private setupStableStart: number | null = null;
  private upStableStart: number | null = null;
  private downStableStart: number | null = null;
  private lastRepTime = 0;

  /**
   * Smoothing
   */
  private emaAvgHipAngle = new EMA(0.22);
  private emaKneeAngle = new EMA(0.3);

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Constants
  // -------------------------------------------------

  /**
   * Knees should stay extended
   */
  private readonly KNEE_MIN_ANGLE = 150;

  /**
   * Difference allowed between left/right hip lift angles
   */
  private readonly LEGS_SYNC_DIFF = 30;

  /**
   * Up / down thresholds
   * Lower hip angle => legs raised more
   */
  private readonly HIP_ANGLE_UP = 112;
  private readonly HIP_ANGLE_DOWN = 158;

  /**
   * Visibility
   */
  private readonly VISIBILITY_THRESHOLD = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  /**
   * Timing
   */
  private readonly SETUP_STABLE_MS = 350;
  private readonly UP_CONFIRM_MS = 140;
  private readonly DOWN_CONFIRM_MS = 140;
  private readonly MIN_TIME_BETWEEN_REPS_MS = 450;

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  private hasRequiredLandmarks(landmarks: Landmark[]): boolean {
    const required = [
      PoseLandmarks.LEFT_SHOULDER,
      PoseLandmarks.RIGHT_SHOULDER,
      PoseLandmarks.LEFT_HIP,
      PoseLandmarks.RIGHT_HIP,
      PoseLandmarks.LEFT_KNEE,
      PoseLandmarks.RIGHT_KNEE,
      PoseLandmarks.LEFT_ANKLE,
      PoseLandmarks.RIGHT_ANKLE,
    ];

    return required.every((idx) =>
      hasVisibility(landmarks[idx], this.VISIBILITY_THRESHOLD)
    );
  }

  private isBodyVisibleStable(landmarks: Landmark[], now: number): boolean {
    const visible = this.hasRequiredLandmarks(landmarks);

    if (visible) {
      this.bodyMissingStart = null;
      return true;
    }

    if (this.bodyMissingStart === null) {
      this.bodyMissingStart = now;
      return true; // tolerate brief flicker
    }

    return now - this.bodyMissingStart < this.BODY_LOST_TOLERANCE_MS;
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
      code === 'REP_SUCCESS'
    ) {
      return {
        is_correct: true,
        quality: 'correct',
        severity: 'success',
      };
    }

    return {
      is_correct: this.lastBodyVisible && this.stage !== 'setup' && !this.repInvalidated,
      quality: this.stage === 'setup' ? 'setup' : (this.repInvalidated ? 'warning' : 'correct'),
      severity: 'info',
    };
  }

  private createResult(debug?: Record<string, unknown>): LegRaisesResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    /**
     * Keep UI backward-compatible:
     * during setup expose "down"
     */
    const stageForUi: 'up' | 'down' =
      this.stage === 'up' ? 'up' : 'down';

    return {
      exercise: 'leg_raises',
      reps: this.counter,
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
  ): LegRaisesResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Visibility handling
    const bodyVisibleStable = this.isBodyVisibleStable(landmarks, now);
    this.lastBodyVisible = bodyVisibleStable;

    if (!bodyVisibleStable) {
      this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
      this.stage = 'setup';
      this.repInvalidated = false;
      this.currentInvalidCode = null;

      return this.createResult({
        reason: 'body_not_visible',
      });
    }

    // During tolerated flicker, keep previous stable state
    if (!this.hasRequiredLandmarks(landmarks)) {
      return this.createResult({
        phase: 'visibility_tolerance',
      });
    }

    // 2) Extract landmarks
    const lSh = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rSh = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];
    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];
    const lAnk = landmarks[PoseLandmarks.LEFT_ANKLE];
    const rAnk = landmarks[PoseLandmarks.RIGHT_ANKLE];

    // 3) Raw angles
    const lHipAngleRaw = calculateAngle(lSh, lHip, lKnee);
    const rHipAngleRaw = calculateAngle(rSh, rHip, rKnee);
    const avgHipAngleRaw = (lHipAngleRaw + rHipAngleRaw) / 2;

    const lKneeAngleRaw = calculateAngle(lHip, lKnee, lAnk);
    const rKneeAngleRaw = calculateAngle(rHip, rKnee, rAnk);
    const minKneeAngleRaw = Math.min(lKneeAngleRaw, rKneeAngleRaw);

    // 4) Smoothed angles
    const avgHipAngle = this.emaAvgHipAngle.update(avgHipAngleRaw);
    const minKneeAngle = this.emaKneeAngle.update(minKneeAngleRaw);

    // 5) Sync / form
    const legsUnsynced =
      Math.abs(lHipAngleRaw - rHipAngleRaw) > this.LEGS_SYNC_DIFF;

    const kneesBent = minKneeAngle < this.KNEE_MIN_ANGLE;

    // -------------------------------------------------
    // SETUP PHASE
    // -------------------------------------------------
    if (this.stage === 'setup') {
      const setupReady =
        avgHipAngle >= this.HIP_ANGLE_DOWN &&
        !kneesBent &&
        !legsUnsynced;

      if (setupReady) {
        if (this.setupStableStart === null) {
          this.setupStableStart = now;
        }

        const stableMs = now - this.setupStableStart;

        if (stableMs >= this.SETUP_STABLE_MS) {
          this.stage = 'down';
          this.feedbackCode = 'CMD_RAISE_LEGS';
        } else {
          this.feedbackCode = 'START_POSITION';
        }

        return this.createResult({
          phase: 'setup_hold',
          lHipAngleRaw,
          rHipAngleRaw,
          avgHipAngle,
          minKneeAngle,
          stableMs,
        });
      }

      this.setupStableStart = null;

      if (kneesBent) {
        this.feedbackCode = 'ERR_BENT_KNEES';
      } else if (legsUnsynced) {
        this.feedbackCode = 'ERR_LEGS_SYNC';
      } else {
        this.feedbackCode = 'START_POSITION';
      }

      return this.createResult({
        phase: 'setup',
        lHipAngleRaw,
        rHipAngleRaw,
        avgHipAngle,
        minKneeAngle,
      });
    }

    // -------------------------------------------------
    // ACTIVE INVALIDATION CHECKS
    // -------------------------------------------------
    if (kneesBent) {
      this.repInvalidated = true;
      this.currentInvalidCode = 'ERR_BENT_KNEES';
      this.feedbackCode = 'ERR_BENT_KNEES';

      return this.createResult({
        phase: 'invalid_knees',
        lHipAngleRaw,
        rHipAngleRaw,
        avgHipAngle,
        minKneeAngle,
      });
    }

    if (legsUnsynced) {
      this.repInvalidated = true;
      this.currentInvalidCode = 'ERR_LEGS_SYNC';
      this.feedbackCode = 'ERR_LEGS_SYNC';

      return this.createResult({
        phase: 'invalid_sync',
        lHipAngleRaw,
        rHipAngleRaw,
        avgHipAngle,
        minKneeAngle,
      });
    }

    // -------------------------------------------------
    // STATE MACHINE
    // -------------------------------------------------

    // --- CASE 1: Reached UP position ---
    if (avgHipAngle <= this.HIP_ANGLE_UP) {
      if (this.upStableStart === null) {
        this.upStableStart = now;
      }

      const stableMs = now - this.upStableStart;

      if (stableMs >= this.UP_CONFIRM_MS) {
        this.stage = 'up';
        this.feedbackCode = 'CMD_LOWER_SLOWLY';
      } else {
        this.feedbackCode = 'CMD_LOWER_SLOWLY';
      }

      this.downStableStart = null;

      return this.createResult({
        phase: 'up_position',
        lHipAngleRaw,
        rHipAngleRaw,
        avgHipAngle,
        minKneeAngle,
        stableMs,
      });
    }

    // --- CASE 2: Returned to DOWN position (rep completion) ---
    if (avgHipAngle >= this.HIP_ANGLE_DOWN) {
      if (this.downStableStart === null) {
        this.downStableStart = now;
      }

      const stableMs = now - this.downStableStart;

      if (stableMs >= this.DOWN_CONFIRM_MS) {
        if (
          this.stage === 'up' &&
          now - this.lastRepTime >= this.MIN_TIME_BETWEEN_REPS_MS
        ) {
          if (!this.repInvalidated) {
            this.counter += 1;
            this.feedbackCode = `COUNT_${this.counter}`;
            this.lastRepTime = now;
          } else {
            this.feedbackCode = this.currentInvalidCode ?? 'CMD_RAISE_LEGS';
          }

          this.stage = 'down';
          this.repInvalidated = false;
          this.currentInvalidCode = null;
        } else {
          this.stage = 'down';
          this.feedbackCode = 'CMD_RAISE_LEGS';

          // ✅ FIX:
          // If the user returned to the bottom cleanly but was not in stage === 'up',
          // this is a clean reset — clear any old invalidation
          // so the first rep after the error counts normally.
          this.repInvalidated = false;
          this.currentInvalidCode = null;
        }
      }

      this.upStableStart = null;

      return this.createResult({
        phase: 'down_position',
        lHipAngleRaw,
        rHipAngleRaw,
        avgHipAngle,
        minKneeAngle,
        stableMs,
      });
    }

    // --- CASE 3: Middle zone ---
    this.upStableStart = null;
    this.downStableStart = null;

    if (this.stage === 'up') {
      this.feedbackCode = 'CMD_LOWER_SLOWLY';
    } else {
      this.feedbackCode = 'CMD_RAISE_LEGS';
    }

    return this.createResult({
      phase: 'transition',
      lHipAngleRaw,
      rHipAngleRaw,
      avgHipAngle,
      minKneeAngle,
      repInvalidated: this.repInvalidated,
      repInvalidReason: this.currentInvalidCode,
    });
  }

  reset(): void {
    this.counter = 0;
    this.stage = 'setup';
    this.feedbackCode = 'START_POSITION';
    this.isCorrect = false;

    this.repInvalidated = false;
    this.currentInvalidCode = null;

    this.bodyMissingStart = null;

    this.setupStableStart = null;
    this.upStableStart = null;
    this.downStableStart = null;
    this.lastRepTime = 0;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.emaAvgHipAngle.reset();
    this.emaKneeAngle.reset();
  }
}