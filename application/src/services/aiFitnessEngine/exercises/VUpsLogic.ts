/**
 * VUpsLogic.ts
 *
 * Exercise: Double Leg V-Ups (Jackknife)
 *
 * Logic:
 * - Simultaneous lift of Torso and Legs to form a "V" shape.
 *
 * Key Cheats Prevented:
 * 1. Knee Bending (Tucking) -> Enforced by Knee Angle
 * 2. Partial ROM -> Enforced by Hand-to-Foot distance + Hip Angle
 *
 * Improvements:
 * - Uses FeedbackSignal typing
 * - Includes hand visibility check
 * - Adds touch distance smoothing
 * - Invalidates rep if knees bend at any point during the rep
 * - Adds tiny stability windows for peak / reset to reduce flicker
 */

import {
  Landmark,
  ExerciseLogic,
  VUpsResult,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';

import {
  PoseLandmarks,
  calculateAngle,
  calculateDistance,
  EMA,
} from '../utils';

export class VUpsLogic implements ExerciseLogic {
  private reps = 0;
  private stage: 'down' | 'up' = 'down';
  private feedbackCode: FeedbackSignal = 'SETUP_LIE_DOWN';
  private isCorrect = true;

  // Smoothing
  private emaHipAngle = new EMA(0.3);
  private emaKneeAngle = new EMA(0.3);
  private emaTouchDistance = new EMA(0.25);

  // Rep validity
  private repInvalidated = false;

  // Small stability windows
  private peakStableFrames = 0;
  private resetStableFrames = 0;

  // --- THRESHOLDS ---

  // 1) Knee straightness (Anti-Cheat)
  private readonly MIN_KNEE_ANGLE = 150;

  // 2) V-shape peak
  private readonly PEAK_HIP_ANGLE = 85;

  // 3) Reset to lying down
  private readonly RESET_HIP_ANGLE = 150;

  // 4) Hand-to-foot touch
  private readonly TOUCH_THRESHOLD = 0.18;

  // 5) Visibility
  private readonly MIN_VISIBILITY = 0.5;

  // 6) Stability
  private readonly PEAK_STABLE_FRAMES = 2;
  private readonly RESET_STABLE_FRAMES = 2;

  analyze(
    landmarks: Landmark[],
    _context?: ExerciseAnalysisContext
  ): VUpsResult {
    // 1) Get landmarks
    const lShoulder = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rShoulder = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];
    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];
    const lAnkle = landmarks[PoseLandmarks.LEFT_ANKLE];
    const rAnkle = landmarks[PoseLandmarks.RIGHT_ANKLE];
    const lHand = landmarks[PoseLandmarks.LEFT_INDEX];
    const rHand = landmarks[PoseLandmarks.RIGHT_INDEX];

    // 2) Visibility check
    if (
      !this.checkVisibility([
        lShoulder, rShoulder,
        lHip, rHip,
        lKnee, rKnee,
        lAnkle, rAnkle,
        lHand, rHand,
      ])
    ) {
      return this.createResult('ERR_BODY_NOT_VISIBLE', false);
    }

    // 3) Calculations

    // A) Knee angle (are legs straight?)
    const leftKneeAngle = calculateAngle(lHip, lKnee, lAnkle);
    const rightKneeAngle = calculateAngle(rHip, rKnee, rAnkle);
    const avgKneeAngle = this.emaKneeAngle.update(
      (leftKneeAngle + rightKneeAngle) / 2
    );

    // B) Hip angle (are we in V-shape?)
    const leftHipAngle = calculateAngle(lShoulder, lHip, lKnee);
    const rightHipAngle = calculateAngle(rShoulder, rHip, rKnee);
    const avgHipAngle = this.emaHipAngle.update(
      (leftHipAngle + rightHipAngle) / 2
    );

    // C) Hand-to-foot distance
    const distLeft = calculateDistance(lHand, lAnkle);
    const distRight = calculateDistance(rHand, rAnkle);
    const avgDist = this.emaTouchDistance.update((distLeft + distRight) / 2);

    const kneesStraight = avgKneeAngle >= this.MIN_KNEE_ANGLE;
    const isVShape = avgHipAngle < this.PEAK_HIP_ANGLE;
    const isTouching = avgDist < this.TOUCH_THRESHOLD;
    const fullyReset = avgHipAngle > this.RESET_HIP_ANGLE;

    // 🔥 If knees bend at any point during the rep -> invalidate current rep
    if (!kneesStraight) {
      this.repInvalidated = true;
      this.feedbackCode = 'ERR_KNEES_BENT';
      this.isCorrect = false;
    }

    // -----------------------------
    // Stage: DOWN
    // -----------------------------
    if (this.stage === 'down') {
      // If user is fully reset and knees are straight again,
      // allow a new rep to start cleanly
      if (fullyReset && kneesStraight) {
        this.repInvalidated = false;
      }

      if (kneesStraight && isVShape && isTouching) {
        this.peakStableFrames++;

        if (this.peakStableFrames >= this.PEAK_STABLE_FRAMES) {
          this.stage = 'up';
          this.peakStableFrames = 0;

          if (!this.repInvalidated) {
            this.reps++;
            this.feedbackCode = `COUNT_${this.reps}` as FeedbackSignal;
            this.isCorrect = true;
          } else {
            // Rep reached top, but it was invalid due to bent knees earlier
            this.feedbackCode = 'ERR_KNEES_BENT';
            this.isCorrect = false;
          }
        }
      } else {
        this.peakStableFrames = 0;

        if (!kneesStraight) {
          this.feedbackCode = 'ERR_KNEES_BENT';
          this.isCorrect = false;
        } else if (avgHipAngle < 120 && !isTouching) {
          this.feedbackCode = 'CMD_REACH_TOES';
          this.isCorrect = true;
        } else {
          this.feedbackCode = 'CMD_UP_V';
          this.isCorrect = true;
        }
      }
    }

    // -----------------------------
    // Stage: UP
    // -----------------------------
    else if (this.stage === 'up') {
      if (fullyReset && kneesStraight) {
        this.resetStableFrames++;

        if (this.resetStableFrames >= this.RESET_STABLE_FRAMES) {
          this.stage = 'down';
          this.resetStableFrames = 0;
          this.peakStableFrames = 0;
          this.repInvalidated = false;
          this.feedbackCode = 'CMD_UP_V';
          this.isCorrect = true;
        }
      } else {
        this.resetStableFrames = 0;

        if (!kneesStraight) {
          this.feedbackCode = 'ERR_KNEES_BENT';
          this.isCorrect = false;
        } else {
          this.feedbackCode = 'CMD_GO_DOWN';
          this.isCorrect = true;
        }
      }
    }

    return this.createResult(this.feedbackCode, this.isCorrect);
  }

  private checkVisibility(lms: Array<Landmark | undefined>): boolean {
    return lms.every((lm) => (lm?.visibility || 0) > this.MIN_VISIBILITY);
  }

  private createResult(
    feedback: FeedbackSignal,
    isCorrect: boolean
  ): VUpsResult {
    return {
      exercise: 'v_ups',
      reps: this.reps,
      stage: this.stage,
      feedback_code: feedback,
      is_correct: isCorrect,
    };
  }

  reset(): void {
    this.reps = 0;
    this.stage = 'down';
    this.feedbackCode = 'SETUP_LIE_DOWN';
    this.isCorrect = true;

    this.repInvalidated = false;
    this.peakStableFrames = 0;
    this.resetStableFrames = 0;

    this.emaHipAngle.reset();
    this.emaKneeAngle.reset();
    this.emaTouchDistance.reset();
  }
}