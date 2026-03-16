/**
 * Crunch Logic - TypeScript Implementation
 * On-Device Exercise Analysis
 *
 * Improvements:
 * - Uses updated engine types and result metadata
 * - Visibility debounce to reduce camera flicker issues
 * - Uses smoothed angles for better stability
 * - Uses body midpoints instead of left side only
 * - Prevents bounce / accidental double counting
 * - Keeps backward compatibility with existing UI
 */

import type {
  Landmark,
  CrunchResult,
  ExerciseLogic,
  FeedbackSignal,
  ExerciseAnalysisContext,
  ExerciseQuality,
  FeedbackSeverity,
} from '../types';

import {
  calculateAngle,
  calculateDistance,
  midpoint,
  PoseLandmarks,
  EMA,
  getCurrentTimeMs,
  hasVisibility,
} from '../utils';

type Stage = 'setup' | 'down' | 'up';

export class CrunchLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private counter = 0;
  private stage: Stage = 'setup';
  private feedbackCode: FeedbackSignal = 'START_POSITION';
  private isCorrect = false;

  /**
   * Current rep validity:
   * if form breaks during the current rep, it should not count.
   */
  private hasFailedRep = false;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Setup / timing
   */
  private setupStableStart: number | null = null;
  private lastRepTimestampMs = 0;

  /**
   * Smoothing
   */
  private torsoEMA = new EMA(0.35);
  private leftKneeEMA = new EMA(0.3);
  private rightKneeEMA = new EMA(0.3);

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Constants / Tuning
  // -------------------------------------------------
  private readonly VISIBILITY_THRESHOLD = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  private readonly SETUP_STABLE_MS = 450;
  private readonly MIN_TIME_BETWEEN_REPS_MS = 450;

  /**
   * Max allowed knee extension angle.
   * If either knee is too straight, user should bend knees more.
   */
  private readonly STRICT_KNEE_LIMIT = 145;

  /**
   * Feet spread vs torso length.
   * Larger spread means ankles are too far apart.
   */
  private readonly FEET_SPLIT_RATIO = 0.4;

  /**
   * Wrist too low relative to shoulder = likely assisting with hands / bad hand position.
   */
  private readonly HAND_OFFSET_TOLERANCE = 0.1;

  /**
   * Torso movement thresholds
   */
  private readonly TORSO_DOWN_ANGLE = 105;
  private readonly TORSO_UP_ANGLE = 55;
  private readonly TORSO_RETURN_DOWN_HINT = 60;

  // -------------------------------------------------
  // Visibility Helpers
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
      PoseLandmarks.LEFT_WRIST,
      PoseLandmarks.RIGHT_WRIST,
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
      return true; // tolerate a brief miss
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
      code === 'START_POSITION' ||
      code === 'STEP_BACK'
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
      code === 'PERFECT'
    ) {
      return {
        is_correct: true,
        quality: 'correct',
        severity: 'success',
      };
    }

    return {
      is_correct: this.stage !== 'setup' && this.lastBodyVisible && !this.hasFailedRep,
      quality: this.stage !== 'setup' ? 'correct' : 'setup',
      severity: 'info',
    };
  }

  private buildResult(debug?: Record<string, unknown>): CrunchResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    /**
     * Keep backward compatibility:
     * many UIs may expect crunch stage to be "up" or "down".
     * During setup, we expose "down" while keeping raw state in debug.
     */
    const stageForUi: 'up' | 'down' =
      this.stage === 'up' ? 'up' : 'down';

    return {
      exercise: 'crunch',
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

  private setFeedback(code: FeedbackSignal): void {
    this.feedbackCode = code;
  }

  private markBodyNotVisible(): CrunchResult {
    this.setFeedback('ERR_BODY_NOT_VISIBLE');
    return this.buildResult({
      reason: 'body_not_visible',
    });
  }

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------
  analyze(
    landmarks: Landmark[],
    context?: ExerciseAnalysisContext
  ): CrunchResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Visibility handling
    const bodyVisibleStable = this.isBodyVisibleStable(landmarks, now);
    this.lastBodyVisible = bodyVisibleStable;

    if (!bodyVisibleStable) {
      return this.markBodyNotVisible();
    }

    // During tolerated visibility loss, return previous stable state
    if (!this.hasRequiredLandmarks(landmarks)) {
      return this.buildResult({
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

    const lWr = landmarks[PoseLandmarks.LEFT_WRIST];
    const rWr = landmarks[PoseLandmarks.RIGHT_WRIST];

    // 3) Use midpoints for more stable torso reading
    const shouldersMid = midpoint(lSh, rSh);
    const hipsMid = midpoint(lHip, rHip);
    const kneesMid = midpoint(lKnee, rKnee);

    // 4) Smoothed calculations
    const rawLeftKneeAngle = calculateAngle(lHip, lKnee, lAnk);
    const rawRightKneeAngle = calculateAngle(rHip, rKnee, rAnk);
    const rawTorsoAngle = calculateAngle(shouldersMid, hipsMid, kneesMid);

    const leftKneeAngle = this.leftKneeEMA.update(rawLeftKneeAngle);
    const rightKneeAngle = this.rightKneeEMA.update(rawRightKneeAngle);
    const torsoAngle = this.torsoEMA.update(rawTorsoAngle);

    // 5) Form checks
    const lHandCheat = lWr.y > lSh.y + this.HAND_OFFSET_TOLERANCE;
    const rHandCheat = rWr.y > rSh.y + this.HAND_OFFSET_TOLERANCE;
    const isHandsCheating = lHandCheat || rHandCheat;

    const torsoLength = calculateDistance(shouldersMid, hipsMid);
    const ankleDistance = calculateDistance(lAnk, rAnk);
    const feetAreSplit = ankleDistance > torsoLength * this.FEET_SPLIT_RATIO;

    const kneesAreStraight =
      leftKneeAngle > this.STRICT_KNEE_LIMIT ||
      rightKneeAngle > this.STRICT_KNEE_LIMIT;

    // -------------------------------------------------
    // SETUP PHASE
    // -------------------------------------------------
    if (this.stage === 'setup') {
      const setupReady =
        torsoAngle > this.TORSO_DOWN_ANGLE &&
        !kneesAreStraight &&
        !feetAreSplit;

      if (setupReady) {
        if (this.setupStableStart === null) {
          this.setupStableStart = now;
        }

        const stableMs = now - this.setupStableStart;

        if (stableMs >= this.SETUP_STABLE_MS) {
          this.stage = 'down';
          this.hasFailedRep = false;
          this.setFeedback('CMD_GO_UP');
        } else {
          this.setFeedback('START_POSITION');
        }

        return this.buildResult({
          phase: 'setup_hold',
          torsoAngle,
          leftKneeAngle,
          rightKneeAngle,
          handsCheating: isHandsCheating,
          feetAreSplit,
          stableMs,
        });
      }

      this.setupStableStart = null;

      if (kneesAreStraight) {
        this.setFeedback('ERR_BENT_KNEES');
      } else if (feetAreSplit) {
        this.setFeedback('ERR_LEGS_SYNC');
      } else {
        this.setFeedback('START_POSITION');
      }

      return this.buildResult({
        phase: 'setup',
        torsoAngle,
        leftKneeAngle,
        rightKneeAngle,
        handsCheating: isHandsCheating,
        feetAreSplit,
      });
    }

    // -------------------------------------------------
    // ACTIVE PHASE
    // -------------------------------------------------

    // Any form break invalidates the current rep
    if (kneesAreStraight) {
      this.hasFailedRep = true;
      this.setFeedback('ERR_BENT_KNEES');

      return this.buildResult({
        phase: 'active_invalid',
        torsoAngle,
        leftKneeAngle,
        rightKneeAngle,
        handsCheating: isHandsCheating,
        feetAreSplit,
        invalidReason: 'knees_straight',
      });
    }

    if (feetAreSplit) {
      this.hasFailedRep = true;
      this.setFeedback('ERR_LEGS_SYNC');

      return this.buildResult({
        phase: 'active_invalid',
        torsoAngle,
        leftKneeAngle,
        rightKneeAngle,
        handsCheating: isHandsCheating,
        feetAreSplit,
        invalidReason: 'feet_split',
      });
    }

    if (isHandsCheating) {
      this.hasFailedRep = true;
      this.setFeedback('ERR_HANDS_POSITION');

      return this.buildResult({
        phase: 'active_invalid',
        torsoAngle,
        leftKneeAngle,
        rightKneeAngle,
        handsCheating: isHandsCheating,
        feetAreSplit,
        invalidReason: 'hands_position',
      });
    }

    // Valid posture => rep state machine
    if (torsoAngle > this.TORSO_DOWN_ANGLE) {
      // Back to down position
      this.stage = 'down';
      this.hasFailedRep = false;
      this.setFeedback('CMD_GO_UP');

      return this.buildResult({
        phase: 'down_position',
        torsoAngle,
        leftKneeAngle,
        rightKneeAngle,
      });
    }

    if (
      torsoAngle < this.TORSO_UP_ANGLE &&
      this.stage === 'down' &&
      now - this.lastRepTimestampMs >= this.MIN_TIME_BETWEEN_REPS_MS
    ) {
      // Reached crunch top
      this.stage = 'up';

      if (!this.hasFailedRep) {
        this.counter += 1;
        this.lastRepTimestampMs = now;
        this.setFeedback(`COUNT_${this.counter}`);
      } else {
        this.setFeedback('CMD_GO_DOWN');
      }

      return this.buildResult({
        phase: 'up_position',
        torsoAngle,
        leftKneeAngle,
        rightKneeAngle,
      });
    }

    if (this.stage === 'up' && torsoAngle > this.TORSO_RETURN_DOWN_HINT) {
      this.setFeedback('CMD_GO_DOWN');
    } else if (this.stage === 'down') {
      this.setFeedback('CMD_GO_UP');
    }

    return this.buildResult({
      phase: 'transition',
      torsoAngle,
      leftKneeAngle,
      rightKneeAngle,
      handsCheating: isHandsCheating,
      feetAreSplit,
    });
  }

  /**
   * Reset the logic state for a new session
   */
  reset(): void {
    this.counter = 0;
    this.stage = 'setup';
    this.feedbackCode = 'START_POSITION';
    this.isCorrect = false;

    this.hasFailedRep = false;
    this.bodyMissingStart = null;
    this.setupStableStart = null;
    this.lastRepTimestampMs = 0;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.torsoEMA.reset();
    this.leftKneeEMA.reset();
    this.rightKneeEMA.reset();
  }
}
