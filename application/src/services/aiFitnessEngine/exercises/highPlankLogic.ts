/**
 * High Plank Logic - TypeScript Implementation
 * Tuned: slightly less strict + more stable
 *
 * Improvements:
 * - Uses milliseconds instead of legacy seconds timing
 * - Adds visibility debounce
 * - Uses richer result metadata from updated types.ts
 * - Replaces broken BACK_ANGLE_MAX logic with hip-vs-body-line analysis
 * - Slightly relaxed thresholds for a better user experience
 * - More robust timer accumulation
 */

import type {
  Landmark,
  HighPlankResult,
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
  getCurrentTimeMs,
  PoseLandmarks,
  hasVisibility,
} from '../utils';

type Stage = 'setup' | 'holding';

export class HighPlankLogic implements ExerciseLogic {
  private timerVal = 0;
  private feedbackCode: FeedbackSignal = 'SETUP_POSITION';
  private isCorrect = false;
  private stage: Stage = 'setup';

  /**
   * Stability window:
   * user must stay correct briefly before timer starts
   */
  private correctStableStartMs = 0;

  /**
   * Timer accumulation
   */
  private accumulatedHoldMs = 0;
  private lastCorrectFrameMs = 0;

  /**
   * Visibility debounce
   */
  private bodyMissingStart: number | null = null;

  /**
   * Last frame metadata
   */
  private lastTimestampMs = 0;
  private lastBodyVisible = false;

  // -------------------- Tuned Constants (Less strict but still meaningful) --------------------

  /**
   * Hip clearance in plank:
   * was strict in the old version, now slightly easier
   */
  private readonly HIP_CLEARANCE_RATIO = 0.24;

  /**
   * Knee clearance:
   * slightly more forgiving
   */
  private readonly KNEE_CLEARANCE_RATIO = 0.10;

  /**
   * Straight-arm requirement:
   * relaxed slightly
   */
  private readonly ELBOW_MIN_ANGLE = 150;

  /**
   * Hip deviation from shoulder->ankle line
   * Positive => hips too low / sagging
   * Negative => hips too high / piking
   */
  private readonly HIP_LINE_TOLERANCE_RATIO = 0.08;

  /**
   * Hysteresis margins (to prevent rapid toggling)
   */
  private readonly ANGLE_HYS = 5;
  private readonly RATIO_HYS = 0.025;

  /**
   * Stability time before starting timer
   */
  private readonly CORRECT_STABLE_MS = 280;

  /**
   * Horizontal body check
   * Lower multiplier = easier to accept near-horizontal posture
   */
  private readonly HORIZONTAL_MULT = 0.72;

  /**
   * Visibility debounce
   */
  private readonly VISIBILITY_THRESHOLD = 0.5;
  private readonly BODY_LOST_TOLERANCE_MS = 250;

  // -------------------------------------------------
  // Visibility Helpers
  // -------------------------------------------------
  private hasRequiredLandmarks(landmarks: Landmark[]): boolean {
    const required = [
      PoseLandmarks.LEFT_SHOULDER,
      PoseLandmarks.RIGHT_SHOULDER,
      PoseLandmarks.LEFT_ELBOW,
      PoseLandmarks.RIGHT_ELBOW,
      PoseLandmarks.LEFT_WRIST,
      PoseLandmarks.RIGHT_WRIST,
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
      code === 'HOLD_FIXED' ||
      code === 'HOLD_STEADY'
    ) {
      return {
        is_correct: this.isCorrect,
        quality: this.isCorrect ? 'correct' : 'setup',
        severity: this.isCorrect ? 'success' : 'info',
      };
    }

    return {
      is_correct: this.isCorrect,
      quality: this.isCorrect ? 'correct' : 'setup',
      severity: this.isCorrect ? 'success' : 'info',
    };
  }

  private buildResult(debug?: Record<string, unknown>): HighPlankResult {
    const { is_correct, quality, severity } = this.resolveQualityAndSeverity();

    return {
      exercise: 'high_plank',
      timer: this.timerVal,
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

  private setFeedback(code: FeedbackSignal): void {
    this.feedbackCode = code;
  }

  private markBodyNotVisible(): HighPlankResult {
    this.stage = 'setup';
    this.isCorrect = false;
    this.setFeedback('ERR_CAMERA_VIEW');
    return this.buildResult({
      reason: 'body_not_visible',
    });
  }

  /**
   * Compute expected body-line Y at hip X using shoulder->ankle line.
   * Positive delta => hips are below the line (sagging)
   * Negative delta => hips are above the line (piking)
   */
  private getHipLineDelta(
    shoulderMid: { x: number; y: number },
    hipMid: { x: number; y: number },
    ankleMid: { x: number; y: number }
  ): number {
    const dx = ankleMid.x - shoulderMid.x;

    if (Math.abs(dx) < 1e-6) {
      return 0;
    }

    const expectedHipY =
      shoulderMid.y +
      ((ankleMid.y - shoulderMid.y) * (hipMid.x - shoulderMid.x)) / dx;

    return hipMid.y - expectedHipY;
  }

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------
  analyze(
    landmarks: Landmark[],
    context?: ExerciseAnalysisContext
  ): HighPlankResult {
    const nowMs = context?.timestamp_ms ?? getCurrentTimeMs();
    this.lastTimestampMs = nowMs;

    // -------------------- Visibility --------------------
    const bodyVisibleStable = this.isBodyVisibleStable(landmarks, nowMs);
    this.lastBodyVisible = bodyVisibleStable;

    if (!bodyVisibleStable) {
      return this.markBodyNotVisible();
    }

    // During tolerated brief visibility loss, keep last stable result
    if (!this.hasRequiredLandmarks(landmarks)) {
      return this.buildResult({
        phase: 'visibility_tolerance',
      });
    }

    // -------------------- Extract landmarks --------------------
    const lSh = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const lEl = landmarks[PoseLandmarks.LEFT_ELBOW];
    const lWr = landmarks[PoseLandmarks.LEFT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];
    const lAnk = landmarks[PoseLandmarks.LEFT_ANKLE];

    const rSh = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const rEl = landmarks[PoseLandmarks.RIGHT_ELBOW];
    const rWr = landmarks[PoseLandmarks.RIGHT_WRIST];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];
    const rAnk = landmarks[PoseLandmarks.RIGHT_ANKLE];

    const shoulderMid = midpoint(lSh, rSh);
    const hipMid = midpoint(lHip, rHip);
    const kneeMid = midpoint(lKnee, rKnee);
    const ankleMid = midpoint(lAnk, rAnk);

    // -------------------- Angles --------------------
    const elbowAngleL = calculateAngle(lSh, lEl, lWr);
    const elbowAngleR = calculateAngle(rSh, rEl, rWr);
    const elbowAngle = (elbowAngleL + elbowAngleR) / 2;

    const hipAngleL = calculateAngle(lSh, lHip, lKnee);
    const hipAngleR = calculateAngle(rSh, rHip, rKnee);
    const hipAngle = (hipAngleL + hipAngleR) / 2;

    // -------------------- Size & clearance --------------------
    const torsoSizeL = calculateDistance(lSh, lHip);
    const torsoSizeR = calculateDistance(rSh, rHip);
    const torsoSize = (torsoSizeL + torsoSizeR) / 2;

    const groundY = ankleMid.y;
    const hipY = hipMid.y;
    const kneeY = kneeMid.y;

    const hipClearance = groundY - hipY;
    const kneeClearance = groundY - kneeY;

    // -------------------- Horizontal check --------------------
    const bodyWidthX = Math.abs(shoulderMid.x - ankleMid.x);
    const bodyHeightY = Math.abs(shoulderMid.y - ankleMid.y);
    const isHorizontal = bodyWidthX > bodyHeightY * this.HORIZONTAL_MULT;

    // -------------------- Body-line hip deviation --------------------
    const hipLineDelta = this.getHipLineDelta(shoulderMid, hipMid, ankleMid);
    const hipLineTolerance = this.HIP_LINE_TOLERANCE_RATIO * torsoSize;

    // -------------------- Hysteresis thresholds --------------------
    const elbowEnter = this.ELBOW_MIN_ANGLE;
    const elbowExit = Math.max(0, this.ELBOW_MIN_ANGLE - this.ANGLE_HYS);

    const hipClrEnter = this.HIP_CLEARANCE_RATIO * torsoSize;
    const hipClrExit = Math.max(
      0,
      (this.HIP_CLEARANCE_RATIO - this.RATIO_HYS) * torsoSize
    );

    const kneeClrEnter = this.KNEE_CLEARANCE_RATIO * torsoSize;
    const kneeClrExit = Math.max(
      0,
      (this.KNEE_CLEARANCE_RATIO - this.RATIO_HYS) * torsoSize
    );

    // -------------------- Decision Logic --------------------
    let wantCorrect = false;
    this.stage = 'setup';

    if (!isHorizontal) {
      this.setFeedback('SETUP_POSITION');
      wantCorrect = false;
    } else {
      const elbowOk = this.isCorrect
        ? elbowAngle >= elbowExit
        : elbowAngle >= elbowEnter;

      if (!elbowOk) {
        this.setFeedback('ERR_BENT_ELBOWS');
        wantCorrect = false;
      } else {
        const hipOk = this.isCorrect
          ? hipClearance >= hipClrExit
          : hipClearance >= hipClrEnter;

        if (!hipOk) {
          this.setFeedback('ERR_HIPS_TOO_LOW');
          wantCorrect = false;
        } else {
          const kneeOk = this.isCorrect
            ? kneeClearance >= kneeClrExit
            : kneeClearance >= kneeClrEnter;

          if (!kneeOk) {
            this.setFeedback('ERR_KNEES_TOUCHING');
            wantCorrect = false;
          } else {
            // More reliable than broken BACK_ANGLE_MAX logic
            if (hipLineDelta > hipLineTolerance) {
              this.setFeedback('ERR_BACK_SAG');
              wantCorrect = false;
            } else if (hipLineDelta < -hipLineTolerance) {
              this.setFeedback('ERR_HIPS_TOO_HIGH');
              wantCorrect = false;
            } else {
              this.setFeedback('HOLD_FIXED');
              wantCorrect = true;
            }
          }
        }
      }
    }

    // -------------------- Stability Gate --------------------
    if (wantCorrect) {
      if (this.correctStableStartMs === 0) {
        this.correctStableStartMs = nowMs;
      }

      const stableFor = nowMs - this.correctStableStartMs;
      this.isCorrect = stableFor >= this.CORRECT_STABLE_MS;

      if (!this.isCorrect) {
        this.setFeedback('HOLD_STEADY');
      } else {
        this.stage = 'holding';
      }
    } else {
      this.correctStableStartMs = 0;
      this.isCorrect = false;
      this.stage = 'setup';
    }

    // -------------------- Timer Logic --------------------
    if (this.isCorrect) {
      if (this.lastCorrectFrameMs === 0) {
        this.lastCorrectFrameMs = nowMs;
      } else {
        const deltaMs = Math.min(nowMs - this.lastCorrectFrameMs, 250);
        this.accumulatedHoldMs += Math.max(0, deltaMs);
        this.lastCorrectFrameMs = nowMs;

        while (this.accumulatedHoldMs >= 1000) {
          this.timerVal += 1;
          this.accumulatedHoldMs -= 1000;
          this.setFeedback(`COUNT_${this.timerVal}`);
        }
      }
    } else {
      this.lastCorrectFrameMs = 0;
      this.accumulatedHoldMs = 0;
    }

    return this.buildResult({
      elbowAngle,
      hipAngle,
      hipClearance,
      kneeClearance,
      hipLineDelta,
      hipLineTolerance,
      isHorizontal,
      isCorrect: this.isCorrect,
    });
  }

  reset(): void {
    this.timerVal = 0;
    this.feedbackCode = 'SETUP_POSITION';
    this.isCorrect = false;
    this.stage = 'setup';

    this.correctStableStartMs = 0;
    this.accumulatedHoldMs = 0;
    this.lastCorrectFrameMs = 0;

    this.bodyMissingStart = null;

    this.lastTimestampMs = 0;
    this.lastBodyVisible = false;
  }
}