import type {
  ExerciseLogic,
  KneePushUpResult,
  Landmark,
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

export class KneePushUpLogic implements ExerciseLogic {
  // -------------------------------------------------
  // State
  // -------------------------------------------------
  private state: Stage = 'setup';
  private reps = 0;
  private feedbackCode: FeedbackSignal = 'SETUP_POSITION';
  private isCorrect = false;

  /**
   * Current rep validity:
   * if form breaks during the rep, it should not count.
   */
  private hasFailedRep = false;
  private currentInvalidCode: Extract<
    FeedbackSignal,
    'ERR_LIFT_FEET' | 'ERR_HIPS_BACK'
  > | null = null;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Time-based stability tracking
   */
  private setupStableStart: number | null = null;
  private downStableStart: number | null = null;
  private upStableStart: number | null = null;

  /**
   * Smoothing
   */
  private elbowEMA = new EMA(0.3);
  private hipEMA = new EMA(0.3);

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------------------------------------
  // Thresholds / Timing
  // -------------------------------------------------
  private readonly VISIBILITY_THRESHOLD = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  private readonly ELBOW_UP_ANGLE = 155;
  private readonly ELBOW_DOWN_ANGLE = 110;
  private readonly ELBOW_PARTIAL_ANGLE = 130;

  /**
   * Hip alignment for knee push-up:
   * if it drops below this too much, hips are moving back / body line breaks.
   */
  private readonly HIP_ALIGNMENT_MIN = 140;

  /**
   * Feet should be lifted behind the knees
   * (based on image Y coordinates where smaller Y is higher on screen).
   */
  private readonly FEET_LIFT_OFFSET = 0.025;

  private readonly SETUP_STABLE_MS = 650;
  private readonly DOWN_CONFIRM_MS = 160;
  private readonly UP_CONFIRM_MS = 160;

  // -------------------------------------------------
  // Visibility / Side Tracking
  // -------------------------------------------------
  private visible(landmarks: Array<Landmark | undefined>): boolean {
    return landmarks.every((lm) =>
      hasVisibility(lm, this.VISIBILITY_THRESHOLD)
    );
  }

  private pickTrackedSide(lm: Landmark[]): {
    side: TrackedSide;
    shoulder: Landmark;
    elbow: Landmark;
    wrist: Landmark;
    hip: Landmark;
    knee: Landmark;
    ankle: Landmark;
  } | null {
    const leftShoulder = lm[PoseLandmarks.LEFT_SHOULDER];
    const leftElbow = lm[PoseLandmarks.LEFT_ELBOW];
    const leftWrist = lm[PoseLandmarks.LEFT_WRIST];
    const leftHip = lm[PoseLandmarks.LEFT_HIP];
    const leftKnee = lm[PoseLandmarks.LEFT_KNEE];
    const leftAnkle = lm[PoseLandmarks.LEFT_ANKLE];

    const rightShoulder = lm[PoseLandmarks.RIGHT_SHOULDER];
    const rightElbow = lm[PoseLandmarks.RIGHT_ELBOW];
    const rightWrist = lm[PoseLandmarks.RIGHT_WRIST];
    const rightHip = lm[PoseLandmarks.RIGHT_HIP];
    const rightKnee = lm[PoseLandmarks.RIGHT_KNEE];
    const rightAnkle = lm[PoseLandmarks.RIGHT_ANKLE];

    const leftVisible = this.visible([
      leftShoulder,
      leftElbow,
      leftWrist,
      leftHip,
      leftKnee,
      leftAnkle,
    ]);

    const rightVisible = this.visible([
      rightShoulder,
      rightElbow,
      rightWrist,
      rightHip,
      rightKnee,
      rightAnkle,
    ]);

    if (!leftVisible && !rightVisible) {
      return null;
    }

    const leftScore =
      (leftShoulder?.visibility ?? 0) +
      (leftElbow?.visibility ?? 0) +
      (leftWrist?.visibility ?? 0) +
      (leftHip?.visibility ?? 0) +
      (leftKnee?.visibility ?? 0) +
      (leftAnkle?.visibility ?? 0);

    const rightScore =
      (rightShoulder?.visibility ?? 0) +
      (rightElbow?.visibility ?? 0) +
      (rightWrist?.visibility ?? 0) +
      (rightHip?.visibility ?? 0) +
      (rightKnee?.visibility ?? 0) +
      (rightAnkle?.visibility ?? 0);

    if (rightVisible && (!leftVisible || rightScore >= leftScore)) {
      return {
        side: 'RIGHT',
        shoulder: rightShoulder!,
        elbow: rightElbow!,
        wrist: rightWrist!,
        hip: rightHip!,
        knee: rightKnee!,
        ankle: rightAnkle!,
      };
    }

    return {
      side: 'LEFT',
      shoulder: leftShoulder!,
      elbow: leftElbow!,
      wrist: leftWrist!,
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
      is_correct: this.state !== 'setup' && this.lastBodyVisible,
      quality: this.state !== 'setup' ? 'correct' : 'setup',
      severity: 'info',
    };
  }

  private buildResult(debug?: Record<string, unknown>): KneePushUpResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();
    this.isCorrect = is_correct;

    /**
     * Keep UI backward-compatible:
     * during setup, return "up" instead of "setup" if some screens
     * still assume only "up" | "down".
     */
    const stageForUi: 'up' | 'down' =
      this.state === 'down' ? 'down' : 'up';

    return {
      exercise: 'knee_push_up',
      reps: this.reps,
      stage: stageForUi,
      feedback_code: this.feedbackCode,
      is_correct,
      quality,
      severity,
      timestamp_ms: this.lastTimestampMs,
      is_body_visible: this.lastBodyVisible,
      debug: {
        rawState: this.state,
        ...debug,
      },
    };
  }

  private setFeedback(code: FeedbackSignal): void {
    this.feedbackCode = code;
  }

  private markBodyNotVisible(): KneePushUpResult {
    this.setFeedback('ERR_CAMERA_VIEW');
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
  ): KneePushUpResult {
    const now = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = now;

    // 1) Pick visible side
    const tracked = this.pickTrackedSide(landmarks);
    const visibleNow = tracked !== null;

    // 2) Visibility debounce
    const visibleStable = this.isBodyVisibleStable(visibleNow, now);
    this.lastBodyVisible = visibleStable;

    if (!visibleStable) {
      return this.markBodyNotVisible();
    }

    // During tolerated brief visibility loss, keep previous stable result
    if (!tracked) {
      return this.buildResult({
        phase: 'visibility_tolerance',
      });
    }

    const { side, shoulder, elbow, wrist, hip, knee, ankle } = tracked;

    // 3) Angles with smoothing
    const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
    const rawHipAngle = calculateAngle(shoulder, hip, knee);

    const elbowAngle = this.elbowEMA.update(rawElbowAngle);
    const hipAngle = this.hipEMA.update(rawHipAngle);

    const isFeetLifted = ankle.y < knee.y - this.FEET_LIFT_OFFSET;
    const hipsBack = hipAngle < this.HIP_ALIGNMENT_MIN;

    // -------------------------------------------------
    // SETUP PHASE
    // -------------------------------------------------
    if (this.state === 'setup') {
      const armsOk = elbowAngle > 145;
      const bodyOk = hipAngle > 138;

      if (armsOk && bodyOk && isFeetLifted) {
        if (this.setupStableStart === null) {
          this.setupStableStart = now;
        }

        const stableMs = now - this.setupStableStart;

        if (stableMs >= this.SETUP_STABLE_MS) {
          this.state = 'up';
          this.downStableStart = null;
          this.upStableStart = null;
          this.hasFailedRep = false;
          this.currentInvalidCode = null;
          this.setFeedback('GO_DOWN');
        } else {
          this.setFeedback('SETUP_POSITION');
        }

        return this.buildResult({
          phase: 'setup_hold',
          side,
          elbowAngle,
          hipAngle,
          isFeetLifted,
          stableMs,
        });
      }

      this.setupStableStart = null;

      if (!isFeetLifted) {
        this.setFeedback('ERR_LIFT_FEET');
      } else if (!bodyOk) {
        this.setFeedback('ERR_HIPS_BACK');
      } else {
        this.setFeedback('SETUP_POSITION');
      }

      return this.buildResult({
        phase: 'setup',
        side,
        elbowAngle,
        hipAngle,
        isFeetLifted,
      });
    }

    // -------------------------------------------------
    // ACTIVE PHASE
    // -------------------------------------------------

    // Any form break invalidates the current rep
    if (!isFeetLifted) {
      this.hasFailedRep = true;
      this.currentInvalidCode = 'ERR_LIFT_FEET';
      this.setFeedback('ERR_LIFT_FEET');

      return this.buildResult({
        phase: 'active_invalid',
        side,
        elbowAngle,
        hipAngle,
        isFeetLifted,
        hasFailedRep: this.hasFailedRep,
        invalidReason: 'feet_not_lifted',
      });
    }

    if (hipsBack) {
      this.hasFailedRep = true;
      this.currentInvalidCode = 'ERR_HIPS_BACK';
      this.setFeedback('ERR_HIPS_BACK');

      return this.buildResult({
        phase: 'active_invalid',
        side,
        elbowAngle,
        hipAngle,
        isFeetLifted,
        hasFailedRep: this.hasFailedRep,
        invalidReason: 'hips_back',
      });
    }

    // -------------------------------------------------
    // State Machine
    // -------------------------------------------------

    if (this.state === 'up') {
      if (elbowAngle <= this.ELBOW_DOWN_ANGLE) {
        if (this.downStableStart === null) {
          this.downStableStart = now;
        }

        const stableMs = now - this.downStableStart;

        if (stableMs >= this.DOWN_CONFIRM_MS) {
          this.state = 'down';
          this.downStableStart = null;
          this.upStableStart = null;
          this.setFeedback('PUSH_UP');
        } else {
          this.setFeedback('PUSH_UP');
        }

        return this.buildResult({
          phase: 'descending_confirm',
          side,
          elbowAngle,
          hipAngle,
          isFeetLifted,
          stableMs,
          hasFailedRep: this.hasFailedRep,
        });
      }

      this.downStableStart = null;

      if (elbowAngle < this.ELBOW_PARTIAL_ANGLE) {
        this.setFeedback('CMD_GO_LOWER');
      } else {
        this.setFeedback('GO_DOWN');
      }

      return this.buildResult({
        phase: 'top_or_descending',
        side,
        elbowAngle,
        hipAngle,
        isFeetLifted,
        hasFailedRep: this.hasFailedRep,
      });
    }

    if (this.state === 'down') {
      if (elbowAngle >= this.ELBOW_UP_ANGLE) {
        if (this.upStableStart === null) {
          this.upStableStart = now;
        }

        const stableMs = now - this.upStableStart;

        if (stableMs >= this.UP_CONFIRM_MS) {
          if (!this.hasFailedRep) {
            this.reps += 1;
            this.setFeedback(`COUNT_${this.reps}`);
          } else {
            // Completed physically, but invalid
            this.setFeedback('GO_DOWN');
          }

          this.state = 'up';
          this.upStableStart = null;
          this.downStableStart = null;
          this.hasFailedRep = false;
          this.currentInvalidCode = null;
        } else {
          this.setFeedback('PUSH_UP');
        }

        return this.buildResult({
          phase: 'ascending_confirm',
          side,
          elbowAngle,
          hipAngle,
          isFeetLifted,
          stableMs,
          hasFailedRep: this.hasFailedRep,
        });
      }

      this.upStableStart = null;

      if (this.hasFailedRep && this.currentInvalidCode) {
        this.setFeedback(this.currentInvalidCode);
      } else {
        this.setFeedback('PUSH_UP');
      }

      return this.buildResult({
        phase: 'bottom_or_rising',
        side,
        elbowAngle,
        hipAngle,
        isFeetLifted,
        hasFailedRep: this.hasFailedRep,
      });
    }

    // Fallback safety
    return this.buildResult({
      phase: 'fallback',
      side,
      elbowAngle,
      hipAngle,
      isFeetLifted,
      hasFailedRep: this.hasFailedRep,
    });
  }

  reset(): void {
    this.state = 'setup';
    this.reps = 0;
    this.feedbackCode = 'SETUP_POSITION';
    this.isCorrect = false;

    this.hasFailedRep = false;
    this.currentInvalidCode = null;

    this.bodyMissingStart = null;

    this.setupStableStart = null;
    this.downStableStart = null;
    this.upStableStart = null;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;

    this.elbowEMA.reset();
    this.hipEMA.reset();
  }
}