/**
 * PikePushupLogic.ts
 *
 * Pike Push-Up:
 * - Start in a downward dog / inverted V-shape
 * - Lower your head toward the floor by bending elbows
 * - Push back up to the V-shape
 * - Targets shoulders and upper chest
 *
 * Improvements:
 * - Uses updated engine types and result metadata
 * - Adds visibility debounce
 * - Adds setup stability + rep stability windows
 * - Adds rep invalidation if V-shape or leg straightness breaks
 * - Uses proper FeedbackSignal typing
 * - Keeps backward compatibility with existing UI behavior
 */

import type {
  Landmark,
  PikePushupResult,
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

type Stage = 'setup' | 'down' | 'up';
type TrackedSide = 'LEFT' | 'RIGHT';

export class PikePushupLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private reps = 0;
  private stage: Stage = 'setup';
  private feedbackCode: FeedbackSignal = 'SETUP_V_SHAPE';
  private isCorrect = false;

  /**
   * Current rep validity:
   * if form breaks during the rep, do not count it.
   */
  private repInvalidated = false;
  private currentInvalidCode: Extract<
    FeedbackSignal,
    'FIX_KNEES' | 'SETUP_V_SHAPE'
  > | null = null;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Stability / timing
   */
  private setupStableStart: number | null = null;
  private downStableStart: number | null = null;
  private upStableStart: number | null = null;
  private lastRepTime = 0;

  /**
   * Smoothing
   */
  private emaElbow = new EMA(0.3);
  private emaHip = new EMA(0.3);
  private emaKnee = new EMA(0.3);

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Thresholds
  // -------------------------------------------------

  /**
   * Pike (V-shape) hip angle:
   * shoulder - hip - knee
   */
  private readonly PIKE_HIP_MIN = 60;
  private readonly PIKE_HIP_MAX = 120;

  /**
   * Leg straightness:
   * hip - knee - ankle
   */
  private readonly KNEE_STRAIGHT_MIN = 150;

  /**
   * Elbow ROM:
   * shoulder - elbow - wrist
   */
  private readonly ELBOW_DOWN_THRESHOLD = 95;
  private readonly ELBOW_UP_THRESHOLD = 160;

  /**
   * Visibility
   */
  private readonly MIN_VISIBILITY = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  /**
   * Timing
   */
  private readonly SETUP_STABLE_MS = 350;
  private readonly DOWN_CONFIRM_MS = 140;
  private readonly UP_CONFIRM_MS = 140;
  private readonly MIN_TIME_BETWEEN_REPS_MS = 500;

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  private checkVisibility(lms: Array<Landmark | undefined>): boolean {
    return lms.every((lm) => hasVisibility(lm, this.MIN_VISIBILITY));
  }

  private pickTrackedSide(landmarks: Landmark[]): {
    side: TrackedSide;
    shoulder: Landmark;
    elbow: Landmark;
    wrist: Landmark;
    hip: Landmark;
    knee: Landmark;
    ankle: Landmark;
  } | null {
    const lShoulder = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const lElbow = landmarks[PoseLandmarks.LEFT_ELBOW];
    const lWrist = landmarks[PoseLandmarks.LEFT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];
    const lAnkle = landmarks[PoseLandmarks.LEFT_ANKLE];

    const rShoulder = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const rElbow = landmarks[PoseLandmarks.RIGHT_ELBOW];
    const rWrist = landmarks[PoseLandmarks.RIGHT_WRIST];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];
    const rAnkle = landmarks[PoseLandmarks.RIGHT_ANKLE];

    const leftVisible = this.checkVisibility([
      lShoulder,
      lElbow,
      lWrist,
      lHip,
      lKnee,
      lAnkle,
    ]);

    const rightVisible = this.checkVisibility([
      rShoulder,
      rElbow,
      rWrist,
      rHip,
      rKnee,
      rAnkle,
    ]);

    if (!leftVisible && !rightVisible) {
      return null;
    }

    const leftScore =
      (lShoulder?.visibility ?? 0) +
      (lElbow?.visibility ?? 0) +
      (lWrist?.visibility ?? 0) +
      (lHip?.visibility ?? 0) +
      (lKnee?.visibility ?? 0) +
      (lAnkle?.visibility ?? 0);

    const rightScore =
      (rShoulder?.visibility ?? 0) +
      (rElbow?.visibility ?? 0) +
      (rWrist?.visibility ?? 0) +
      (rHip?.visibility ?? 0) +
      (rKnee?.visibility ?? 0) +
      (rAnkle?.visibility ?? 0);

    if (rightVisible && (!leftVisible || rightScore >= leftScore)) {
      return {
        side: 'RIGHT',
        shoulder: rShoulder!,
        elbow: rElbow!,
        wrist: rWrist!,
        hip: rHip!,
        knee: rKnee!,
        ankle: rAnkle!,
      };
    }

    return {
      side: 'LEFT',
      shoulder: lShoulder!,
      elbow: lElbow!,
      wrist: lWrist!,
      hip: lHip!,
      knee: lKnee!,
      ankle: lAnkle!,
    };
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

  private createResult(debug?: Record<string, unknown>): PikePushupResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    /**
     * Keep UI backward-compatible:
     * during setup expose "up"
     */
    const stageForUi: 'up' | 'down' =
      this.stage === 'down' ? 'down' : 'up';

    return {
      exercise: 'pike_pushup',
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
  ): PikePushupResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Side tracking + visibility
    const tracked = this.pickTrackedSide(landmarks);
    const visibleNow = tracked !== null;

    const visibleStable = this.isBodyVisibleStable(visibleNow, now);
    this.lastBodyVisible = visibleStable;

    if (!visibleStable) {
      this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
      this.stage = 'setup';
      this.repInvalidated = false;
      this.currentInvalidCode = null;

      return this.createResult({
        reason: 'body_not_visible',
      });
    }

    // During tolerated flicker, keep previous stable state
    if (!tracked) {
      return this.createResult({
        phase: 'visibility_tolerance',
      });
    }

    const { side, shoulder, elbow, wrist, hip, knee, ankle } = tracked;

    // 2) Angles
    const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
    const rawHipAngle = calculateAngle(shoulder, hip, knee);
    const rawKneeAngle = calculateAngle(hip, knee, ankle);

    const elbowAngle = this.emaElbow.update(rawElbowAngle);
    const hipAngle = this.emaHip.update(rawHipAngle);
    const kneeAngle = this.emaKnee.update(rawKneeAngle);

    // 3) Setup / form checks
    const isPikeShape =
      hipAngle >= this.PIKE_HIP_MIN && hipAngle <= this.PIKE_HIP_MAX;
    const isLegStraight = kneeAngle >= this.KNEE_STRAIGHT_MIN;

    // -------------------------------------------------
    // SETUP PHASE
    // -------------------------------------------------
    if (!isPikeShape) {
      this.stage = 'setup';
      this.setupStableStart = null;
      this.downStableStart = null;
      this.upStableStart = null;
      this.feedbackCode = 'SETUP_V_SHAPE';

      return this.createResult({
        phase: 'setup_not_pike',
        side,
        elbowAngle,
        hipAngle,
        kneeAngle,
      });
    }

    if (!isLegStraight) {
      this.stage = 'setup';
      this.setupStableStart = null;
      this.downStableStart = null;
      this.upStableStart = null;
      this.feedbackCode = 'FIX_KNEES';

      return this.createResult({
        phase: 'setup_knees_bent',
        side,
        elbowAngle,
        hipAngle,
        kneeAngle,
      });
    }

    if (this.stage === 'setup') {
      if (this.setupStableStart === null) {
        this.setupStableStart = now;
      }

      const stableMs = now - this.setupStableStart;

      if (stableMs >= this.SETUP_STABLE_MS) {
        this.stage = 'up'; // starting position in pike top
        this.feedbackCode = 'CMD_GO_DOWN';
      } else {
        this.feedbackCode = 'SETUP_V_SHAPE';
      }

      return this.createResult({
        phase: 'setup_hold',
        side,
        elbowAngle,
        hipAngle,
        kneeAngle,
        stableMs,
      });
    }

    // -------------------------------------------------
    // ACTIVE INVALIDATION CHECKS
    // -------------------------------------------------
    if (!isPikeShape) {
      this.repInvalidated = true;
      this.currentInvalidCode = 'SETUP_V_SHAPE';
      this.feedbackCode = 'SETUP_V_SHAPE';

      return this.createResult({
        phase: 'invalid_not_pike',
        side,
        elbowAngle,
        hipAngle,
        kneeAngle,
      });
    }

    if (!isLegStraight) {
      this.repInvalidated = true;
      this.currentInvalidCode = 'FIX_KNEES';
      this.feedbackCode = 'FIX_KNEES';

      return this.createResult({
        phase: 'invalid_knees',
        side,
        elbowAngle,
        hipAngle,
        kneeAngle,
      });
    }

    // -------------------------------------------------
    // STATE MACHINE
    // -------------------------------------------------

    // --- CASE 1: Bottom position (head lowered) ---
    if (elbowAngle <= this.ELBOW_DOWN_THRESHOLD) {
      if (this.downStableStart === null) {
        this.downStableStart = now;
      }

      const stableMs = now - this.downStableStart;

      if (stableMs >= this.DOWN_CONFIRM_MS) {
        this.stage = 'down';
        this.feedbackCode = 'PUSH_UP';
      } else {
        this.feedbackCode = 'PUSH_UP';
      }

      this.upStableStart = null;

      return this.createResult({
        phase: 'down_position',
        side,
        elbowAngle,
        hipAngle,
        kneeAngle,
        stableMs,
      });
    }

    // --- CASE 2: Top position (pushed back up) ---
    if (elbowAngle >= this.ELBOW_UP_THRESHOLD) {
      if (this.upStableStart === null) {
        this.upStableStart = now;
      }

      const stableMs = now - this.upStableStart;

      if (stableMs >= this.UP_CONFIRM_MS) {
        if (
          this.stage === 'down' &&
          now - this.lastRepTime >= this.MIN_TIME_BETWEEN_REPS_MS
        ) {
          if (!this.repInvalidated) {
            this.reps += 1;
            this.feedbackCode = `COUNT_${this.reps}`;
            this.lastRepTime = now;
          } else {
            this.feedbackCode = this.currentInvalidCode ?? 'CMD_GO_DOWN';
          }

          this.stage = 'up';
          this.repInvalidated = false;
          this.currentInvalidCode = null;
        } else {
          this.stage = 'up';
          this.feedbackCode = 'CMD_GO_DOWN';
        }
      }

      this.downStableStart = null;

      return this.createResult({
        phase: 'up_position',
        side,
        elbowAngle,
        hipAngle,
        kneeAngle,
        stableMs,
        repInvalidated: this.repInvalidated,
        repInvalidReason: this.currentInvalidCode,
      });
    }

    // --- CASE 3: Transition ---
    this.downStableStart = null;
    this.upStableStart = null;

    if (this.stage === 'down') {
      this.feedbackCode = 'PUSH_UP';
    } else {
      this.feedbackCode = 'CMD_GO_DOWN';
    }

    return this.createResult({
      phase: 'transition',
      side,
      elbowAngle,
      hipAngle,
      kneeAngle,
      repInvalidated: this.repInvalidated,
      repInvalidReason: this.currentInvalidCode,
    });
  }

  reset(): void {
    this.reps = 0;
    this.stage = 'setup';
    this.feedbackCode = 'SETUP_V_SHAPE';
    this.isCorrect = false;

    this.repInvalidated = false;
    this.currentInvalidCode = null;

    this.bodyMissingStart = null;

    this.setupStableStart = null;
    this.downStableStart = null;
    this.upStableStart = null;
    this.lastRepTime = 0;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.emaElbow.reset();
    this.emaHip.reset();
    this.emaKnee.reset();
  }
}
