/**
 * OverheadPressLogic.ts
 *
 * Balanced version:
 * - Easier to count reps, but still requires decent form
 * - More robust against portrait/landscape camera differences
 * - Tracks invalid reps so bad lockouts / bad posture do not count
 *
 * Improvements:
 * - Uses shared EMA from utils.ts
 * - Uses updated types.ts result metadata
 * - Adds visibility debounce
 * - Uses proper FeedbackSignal typing
 * - Uses normalized torso lean for side-view back-arch detection
 * - Adds setup stability and rep invalidation tracking
 */

import type {
  Landmark,
  OverheadPressResult,
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
  calculateDistance,
  getCurrentTimeMs,
  hasVisibility,
} from '../utils';

type Stage = 'setup' | 'down' | 'up';

export class OverheadPressLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private reps = 0;
  private stage: Stage = 'setup';
  private feedbackCode: FeedbackSignal = 'SETUP_POSITION';
  private isCorrect = false;

  /**
   * Current rep validity:
   * if form breaks during the rep, do not count it.
   */
  private repInvalidated = false;
  private currentInvalidCode: Extract<
    FeedbackSignal,
    'ERR_ARMS_UNSYNC' | 'ERR_ARCHED_BACK'
  > | null = null;

  /**
   * Timing
   */
  private lastRepTime = 0;
  private topStableStart = 0;
  private bottomStableStart = 0;
  private setupStableStart = 0;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Smoothing
   */
  private emaElbowL = new EMA(0.3);
  private emaElbowR = new EMA(0.3);

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Tuned Constants
  // -------------------------------------------------

  private readonly ANGLES = {
    TOP_THRESHOLD: 150,
    TOP_WARNING: 120,
    BOTTOM_THRESHOLD: 110,
    SYNC_TOLERANCE: 30,
  };

  private readonly TIME = {
    SETUP_STABLE_MS: 350,
    STABILITY_WINDOW_MS: 150,
    MIN_REP_TIME_MS: 800,
  };

  /**
   * Wrist must be clearly above shoulder to count as overhead.
   * Lower than the old 0.2 so it becomes less annoying.
   */
  private readonly WRIST_OVERHEAD_OFFSET = 0.14;

  /**
   * Side-view back-arch detection (normalized).
   * We only check this if the user is not facing the camera.
   */
  private readonly FRONT_VIEW_SHOULDER_WIDTH_RATIO = 0.55;
  private readonly SIDE_TORSO_LEAN_MAX_RATIO = 0.28;

  /**
   * Visibility
   */
  private readonly VISIBILITY_THRESHOLD = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  private checkMandatoryVisibility(lms: Array<Landmark | undefined>): boolean {
    return lms.every((lm) => hasVisibility(lm, this.VISIBILITY_THRESHOLD));
  }

  private isBodyVisibleStable(
    visibleNow: boolean,
    nowMs: number
  ): boolean {
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
      code === 'PERFECT_LOCKOUT' ||
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

  private createResult(debug?: Record<string, unknown>): OverheadPressResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    /**
     * Keep UI backward-compatible:
     * expose down during setup if old screens expect up/down only.
     */
    const stageForUi: 'up' | 'down' =
      this.stage === 'up' ? 'up' : 'down';

    return {
      exercise: 'standing_overhead_press',
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
  ): OverheadPressResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Extract points
    const lSh = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rSh = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lEl = landmarks[PoseLandmarks.LEFT_ELBOW];
    const rEl = landmarks[PoseLandmarks.RIGHT_ELBOW];
    const lWr = landmarks[PoseLandmarks.LEFT_WRIST];
    const rWr = landmarks[PoseLandmarks.RIGHT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];

    const mandatoryVisible = this.checkMandatoryVisibility([
      lSh,
      rSh,
      lEl,
      rEl,
      lWr,
      rWr,
    ]);

    const visibleStable = this.isBodyVisibleStable(mandatoryVisible, now);
    this.lastBodyVisible = visibleStable;

    if (!visibleStable) {
      this.feedbackCode = 'ERR_CAMERA_VIEW';
      this.stage = 'setup';
      this.repInvalidated = false;
      this.currentInvalidCode = null;

      return this.createResult({
        reason: 'body_not_visible',
      });
    }

    // During tolerated flicker, keep previous stable state
    if (!mandatoryVisible) {
      return this.createResult({
        phase: 'visibility_tolerance',
      });
    }

    // 2) Calculate elbow angles (smoothed)
    const rawLeft = calculateAngle(lSh, lEl, lWr);
    const rawRight = calculateAngle(rSh, rEl, rWr);

    const angleL = this.emaElbowL.update(rawLeft);
    const angleR = this.emaElbowR.update(rawRight);

    const minAngle = Math.min(angleL, angleR);
    const angleDiff = Math.abs(angleL - angleR);

    // 3) Height / overhead check
    const shoulderY = (lSh.y + rSh.y) / 2;
    const wristY = (lWr.y + rWr.y) / 2;
    const isClearlyOverhead = wristY < shoulderY - this.WRIST_OVERHEAD_OFFSET;

    // 4) Back-arch detection (side-view only, normalized)
    let isFrontView = true;
    let torsoLeanRatio = 0;

    if (lHip && rHip) {
      const shoulderWidth = Math.abs(lSh.x - rSh.x);
      const torsoSize =
        (calculateDistance(lSh, lHip) + calculateDistance(rSh, rHip)) / 2;

      if (torsoSize > 0) {
        isFrontView = shoulderWidth > torsoSize * this.FRONT_VIEW_SHOULDER_WIDTH_RATIO;

        if (!isFrontView) {
          const shoulderMidX = (lSh.x + rSh.x) / 2;
          const hipMidX = (lHip.x + rHip.x) / 2;
          const lean = Math.abs(shoulderMidX - hipMidX);
          torsoLeanRatio = lean / torsoSize;
        }
      }
    }

    const hasBackArch =
      !isFrontView &&
      lHip &&
      rHip &&
      hasVisibility(lHip, this.VISIBILITY_THRESHOLD) &&
      hasVisibility(rHip, this.VISIBILITY_THRESHOLD) &&
      torsoLeanRatio > this.SIDE_TORSO_LEAN_MAX_RATIO;

    // -------------------------------------------------
    // SETUP PHASE
    // -------------------------------------------------
    if (this.stage === 'setup') {
      const setupReady = minAngle <= this.ANGLES.BOTTOM_THRESHOLD + 15;

      if (setupReady) {
        if (this.setupStableStart === 0) {
          this.setupStableStart = now;
        }

        const stableMs = now - this.setupStableStart;

        if (stableMs >= this.TIME.SETUP_STABLE_MS) {
          this.stage = 'down';
          this.feedbackCode = 'PUSH_UP';
        } else {
          this.feedbackCode = 'SETUP_POSITION';
        }

        return this.createResult({
          phase: 'setup_hold',
          angleL,
          angleR,
          minAngle,
          angleDiff,
          isClearlyOverhead,
          isFrontView,
          torsoLeanRatio,
          stableMs,
        });
      }

      this.setupStableStart = 0;
      this.feedbackCode = 'SETUP_POSITION';

      return this.createResult({
        phase: 'setup',
        angleL,
        angleR,
        minAngle,
        angleDiff,
        isClearlyOverhead,
        isFrontView,
        torsoLeanRatio,
      });
    }

    // -------------------------------------------------
    // ACTIVE INVALIDATION CHECKS
    // -------------------------------------------------

    // Unsync only matters when moving into meaningful press range
    if (angleDiff > this.ANGLES.SYNC_TOLERANCE && minAngle > this.ANGLES.TOP_WARNING) {
      this.repInvalidated = true;
      this.currentInvalidCode = 'ERR_ARMS_UNSYNC';
      this.feedbackCode = 'ERR_ARMS_UNSYNC';

      return this.createResult({
        phase: 'invalid_unsync',
        angleL,
        angleR,
        minAngle,
        angleDiff,
        isClearlyOverhead,
        isFrontView,
        torsoLeanRatio,
      });
    }

    if (hasBackArch) {
      this.repInvalidated = true;
      this.currentInvalidCode = 'ERR_ARCHED_BACK';
      this.feedbackCode = 'ERR_ARCHED_BACK';

      return this.createResult({
        phase: 'invalid_back_arch',
        angleL,
        angleR,
        minAngle,
        angleDiff,
        isClearlyOverhead,
        isFrontView,
        torsoLeanRatio,
      });
    }

    // =========================================================
    // STATE MACHINE
    // =========================================================

    // --- CASE 1: Top / Lockout Position ---
    if (minAngle >= this.ANGLES.TOP_THRESHOLD && isClearlyOverhead) {
      if (this.topStableStart === 0) {
        this.topStableStart = now;
      }

      if (now - this.topStableStart >= this.TIME.STABILITY_WINDOW_MS) {
        if (this.stage === 'down') {
          this.stage = 'up';
          this.feedbackCode = 'PERFECT_LOCKOUT';
        } else {
          this.feedbackCode = 'PERFECT_LOCKOUT';
        }
      } else {
        this.feedbackCode = 'PERFECT_LOCKOUT';
      }

      this.bottomStableStart = 0;

      return this.createResult({
        phase: 'top_lockout',
        angleL,
        angleR,
        minAngle,
        angleDiff,
        isClearlyOverhead,
        isFrontView,
        torsoLeanRatio,
      });
    }

    // --- CASE 2: Bottom Position ---
    if (minAngle <= this.ANGLES.BOTTOM_THRESHOLD) {
      if (this.bottomStableStart === 0) {
        this.bottomStableStart = now;
      }

      if (now - this.bottomStableStart >= this.TIME.STABILITY_WINDOW_MS) {
        if (this.stage === 'up') {
          if (now - this.lastRepTime < this.TIME.MIN_REP_TIME_MS && this.reps > 0) {
            this.feedbackCode = 'LOWER_SLOWLY';
          } else if (this.repInvalidated) {
            this.feedbackCode = this.currentInvalidCode ?? 'LOWER_SLOWLY';
          } else {
            this.reps += 1;
            this.feedbackCode = `COUNT_${this.reps}`;
            this.lastRepTime = now;
          }

          this.stage = 'down';
          this.repInvalidated = false;
          this.currentInvalidCode = null;
        } else {
          this.feedbackCode = 'PUSH_UP';
        }
      }

      this.topStableStart = 0;

      return this.createResult({
        phase: 'bottom_position',
        angleL,
        angleR,
        minAngle,
        angleDiff,
        isClearlyOverhead,
        isFrontView,
        torsoLeanRatio,
      });
    }

    // --- CASE 3: Transition ---
    this.topStableStart = 0;
    this.bottomStableStart = 0;

    if (this.stage === 'down') {
      if (minAngle >= this.ANGLES.TOP_WARNING) {
        this.feedbackCode = 'CMD_PUSH_HIGHER';
      } else {
        this.feedbackCode = 'PUSH_UP';
      }
    } else {
      this.feedbackCode = 'LOWER_SLOWLY';
    }

    return this.createResult({
      phase: 'transition',
      angleL,
      angleR,
      minAngle,
      angleDiff,
      isClearlyOverhead,
      isFrontView,
      torsoLeanRatio,
      repInvalidated: this.repInvalidated,
      repInvalidReason: this.currentInvalidCode,
    });
  }

  reset(): void {
    this.reps = 0;
    this.stage = 'setup';
    this.feedbackCode = 'SETUP_POSITION';
    this.isCorrect = false;

    this.repInvalidated = false;
    this.currentInvalidCode = null;

    this.lastRepTime = 0;
    this.topStableStart = 0;
    this.bottomStableStart = 0;
    this.setupStableStart = 0;

    this.bodyMissingStart = null;
    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.emaElbowL.reset();
    this.emaElbowR.reset();
  }
}