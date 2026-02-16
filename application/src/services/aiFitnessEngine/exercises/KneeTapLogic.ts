/**
 * KneeTapLogic.ts
 * STRICT VERSION - Front Camera Optimized (TORSO HEIGHT POSTURE)
 *
 * Fixes:
 * - "Bending down / leaning forward" cheat: BLOCK rep if smoothed torso height indicates upper body lowering
 * - "Touching thigh or shin" cheat: strictly enforces touch on knee top area only (tight zone + vertical bias)
 * - Requirement: Knee MUST be lifted to approximately stomach level, back MUST stay upright,
 *   opposite hand palm touch on knee top
 *
 * FIX (TAP STUCK ISSUE):
 * - TAP -> NEUTRAL reset is now "release-based" and pair-specific (last touched pair only)
 * - Uses RAW distances for release (EMA can lag)
 * - Adds hysteresis + requires a few consecutive release frames
 *
 * STABLE FEEDBACK:
 * - Smooth torso height with EMA
 * - Debounce bad posture (require N consecutive bad frames)
 * - Hysteresis to clear posture
 * - Hold warning briefly to avoid flicker
 */

import { Landmark, KneeTapResult, ExerciseLogic } from '../types';
import { PoseLandmarks, calculateDistance, EMA } from '../utils';

type TapPair = 'RL' | 'LR' | null; // RL = Right hand -> Left knee, LR = Left hand -> Right knee

export class KneeTapLogic implements ExerciseLogic {
  private reps = 0;
  private stage: 'neutral' | 'tap' = 'neutral';
  private feedbackCode = 'SETUP_POSITION';
  private isCorrect = true;

  // Track which pair caused the last successful tap (for pair-specific release)
  private lastTapPair: TapPair = null;

  // Release counter: require a few consecutive frames of "released" before going neutral
  private releaseFrames = 0;

  // Smoothing for distances (ENTRY)
  private emaDistRL = new EMA(0.3);
  private emaDistLR = new EMA(0.3);

  // ✅ Smoothing for torso height (better forward-bend detection in front camera)
  private emaTorsoHeight = new EMA(0.25);

  // ✅ Posture state stabilization (debounce + hysteresis + hold)
  private postureBadFrames = 0;
  private postureGoodFrames = 0;
  private postureHoldFrames = 0;
  private postureBlocked = false;

  // --- THRESHOLDS ---

  // Touch distance (strict)
  private readonly TOUCH_THRESHOLD = 0.10;

  /**
   * ✅ NEW: Release threshold (hysteresis)
   * Must be > TOUCH_THRESHOLD so "tap" doesn't stick due to small jitter
   * and user doesn't need to step back from the camera.
   */
  private readonly RELEASE_THRESHOLD = 0.16;

  /**
   * ✅ NEW: How many consecutive "released" frames are required to exit TAP.
   * Small number keeps fast reps possible but avoids flicker.
   */
  private readonly RELEASE_FRAMES_TO_RESET = 2;

  // Knee lift requirement (approx stomach level)
  private readonly KNEE_LIFT_REQUIRED = 0.18;

  // Very high knee to relax foot lift requirement
  private readonly VERY_HIGH_KNEE = 0.12;

  // Ankle lift requirement
  private readonly ANKLE_LIFT_MIN = 0.04;

  // ✅ Torso height posture threshold (STRICT)
  private readonly MIN_TORSO_HEIGHT = 0.16;
  private readonly CLEAR_TORSO_HEIGHT = 0.18;

  // ✅ Debounce / hysteresis counts
  private readonly BAD_FRAMES_TO_TRIGGER = 3;
  private readonly GOOD_FRAMES_TO_CLEAR = 6;

  // ✅ Hold duration for warning
  private readonly WARNING_HOLD_FRAMES = 15; // ~0.5s at 30fps

  // Visibility
  private readonly MIN_VISIBILITY = 0.5;

  analyze(landmarks: Landmark[]): KneeTapResult {
    // 1) Get Landmarks
    const rHand = landmarks[PoseLandmarks.RIGHT_INDEX];
    const lHand = landmarks[PoseLandmarks.LEFT_INDEX];

    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];

    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];

    const rShoulder = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lShoulder = landmarks[PoseLandmarks.LEFT_SHOULDER];

    const rAnkle = landmarks[PoseLandmarks.RIGHT_ANKLE];
    const lAnkle = landmarks[PoseLandmarks.LEFT_ANKLE];

    // 2) Visibility Check
    if (
      !this.checkVisibility([
        rHand, lHand,
        rKnee, lKnee,
        rHip, lHip,
        rShoulder, lShoulder,
        rAnkle, lAnkle,
      ])
    ) {
      return this.createResult('ERR_BODY_NOT_VISIBLE', false);
    }

    // ==========================
    // ✅ PRIORITY #1: UPRIGHT POSTURE CHECK (torso height)
    // ==========================
    const midShoulderY = (lShoulder.y + rShoulder.y) / 2;
    const midHipY = (lHip.y + rHip.y) / 2;
    const rawTorsoHeight = midHipY - midShoulderY;

    // Safety guard (rare bad detection)
    const torsoHeight =
      rawTorsoHeight > 0 ? this.emaTorsoHeight.update(rawTorsoHeight) : this.emaTorsoHeight.get();

    // Update posture state machine
    this.updatePostureState(torsoHeight);

    // Block everything if posture bad
    if (this.postureBlocked) {
      // Important: reset stage so it doesn't "carry" a tap while cheating
      this.stage = 'neutral';
      this.lastTapPair = null;
      this.releaseFrames = 0;
      return this.createResult('ERR_BACK_BENT_CHEATING', false);
    }

    // ==========================
    // Continue only if back is upright
    // ==========================

    // 3) Calculate Touch Distances (RAW + EMA)
    const rawDistRL = calculateDistance(rHand, lKnee); // Right hand to Left knee
    const rawDistLR = calculateDistance(lHand, rKnee); // Left hand to Right knee

    // EMA for stable "touch entry"
    const distRL = this.emaDistRL.update(rawDistRL);
    const distLR = this.emaDistLR.update(rawDistLR);

    // 4) Knee lift (vertical position relative to hip)
    const leftKneeVertical = lKnee.y - lHip.y;
    const rightKneeVertical = rKnee.y - rHip.y;

    const isLeftKneeUp = leftKneeVertical < this.KNEE_LIFT_REQUIRED;
    const isRightKneeUp = rightKneeVertical < this.KNEE_LIFT_REQUIRED;

    // 5) Ankle lift
    const leftAnkleToHip = Math.abs(lAnkle.y - lHip.y);
    const rightAnkleToHip = Math.abs(rAnkle.y - rHip.y);

    const isLeftFootLifted = leftAnkleToHip < rightAnkleToHip - this.ANKLE_LIFT_MIN;
    const isRightFootLifted = rightAnkleToHip < leftAnkleToHip - this.ANKLE_LIFT_MIN;

    // 6) STRICT knee top touch ONLY (tight zone + bias against shin)
    const isTouchingRightKneeArea =
      distRL < this.TOUCH_THRESHOLD && this.isHandInKneeZone(rHand, lKnee);

    const isTouchingLeftKneeArea =
      distLR < this.TOUCH_THRESHOLD && this.isHandInKneeZone(lHand, rKnee);

    const isTouchingRight = isTouchingRightKneeArea; // RH -> LK
    const isTouchingLeft = isTouchingLeftKneeArea;   // LH -> RK

    // ==========================
    // ✅ FIX: TAP -> NEUTRAL release logic (pair-specific)
    // ==========================
    if (this.stage === 'tap') {
      const released =
        this.lastTapPair === 'RL'
          ? rawDistRL > this.RELEASE_THRESHOLD
          : this.lastTapPair === 'LR'
            ? rawDistLR > this.RELEASE_THRESHOLD
            : true; // if unknown, allow reset

      if (released) {
        this.releaseFrames++;
      } else {
        this.releaseFrames = 0;
      }

      // As soon as released for a few consecutive frames -> back to neutral
      if (this.releaseFrames >= this.RELEASE_FRAMES_TO_RESET) {
        this.stage = 'neutral';
        this.feedbackCode = 'CMD_TOUCH_KNEE';
        this.isCorrect = true;
        this.lastTapPair = null;
        this.releaseFrames = 0;
        return this.createResult(this.feedbackCode, this.isCorrect);
      }

      // Still in tap until release condition satisfied
      this.feedbackCode = 'REP_SUCCESS';
      this.isCorrect = true;
      return this.createResult(this.feedbackCode, this.isCorrect);
    }

    // ==========================
    // NEUTRAL logic
    // ==========================
    if (this.stage === 'neutral') {
      // Cheat detection: touching thigh (hand significantly above knee)
      if (distRL < this.TOUCH_THRESHOLD && !isTouchingRight && this.isTouchingThigh(rHand, lKnee)) {
        return this.createResult('ERR_TOUCH_KNEE_NOT_THIGH', false);
      }
      if (distLR < this.TOUCH_THRESHOLD && !isTouchingLeft && this.isTouchingThigh(lHand, rKnee)) {
        return this.createResult('ERR_TOUCH_KNEE_NOT_THIGH', false);
      }

      // Correct opposite-hand touch
      if (isTouchingRight) {
        const veryHighKnee = leftKneeVertical < this.VERY_HIGH_KNEE;
        const kneeHighEnough = isLeftKneeUp;
        const footLifted = isLeftFootLifted || veryHighKnee;

        if (kneeHighEnough && footLifted) {
          this.reps++;
          this.stage = 'tap';
          this.lastTapPair = 'RL';
          this.releaseFrames = 0;
          this.feedbackCode = 'REP_SUCCESS';
          this.isCorrect = true;
        } else {
          this.feedbackCode = 'CMD_KNEES_HIGHER';
          this.isCorrect = false;
        }
      } else if (isTouchingLeft) {
        const veryHighKnee = rightKneeVertical < this.VERY_HIGH_KNEE;
        const kneeHighEnough = isRightKneeUp;
        const footLifted = isRightFootLifted || veryHighKnee;

        if (kneeHighEnough && footLifted) {
          this.reps++;
          this.stage = 'tap';
          this.lastTapPair = 'LR';
          this.releaseFrames = 0;
          this.feedbackCode = 'REP_SUCCESS';
          this.isCorrect = true;
        } else {
          this.feedbackCode = 'CMD_KNEES_HIGHER';
          this.isCorrect = false;
        }
      } else {
        this.feedbackCode = 'CMD_TOUCH_KNEE';
        this.isCorrect = true;
      }
    }

    return this.createResult(this.feedbackCode, this.isCorrect);
  }

  /**
   * ✅ Stabilize posture warnings
   * Bad = torsoHeight < MIN_TORSO_HEIGHT
   * Good = torsoHeight > CLEAR_TORSO_HEIGHT
   */
  private updatePostureState(torsoHeight: number): void {
    if (this.postureHoldFrames > 0) {
      this.postureHoldFrames--;
      this.postureBlocked = true;

      if (torsoHeight > this.CLEAR_TORSO_HEIGHT) {
        this.postureGoodFrames++;
      } else {
        this.postureGoodFrames = 0;
      }

      if (this.postureGoodFrames >= this.GOOD_FRAMES_TO_CLEAR) {
        this.postureBlocked = false;
        this.postureHoldFrames = 0;
        this.postureBadFrames = 0;
        this.postureGoodFrames = 0;
      }
      return;
    }

    if (torsoHeight < this.MIN_TORSO_HEIGHT) {
      this.postureBadFrames++;
      this.postureGoodFrames = 0;
    } else if (torsoHeight > this.CLEAR_TORSO_HEIGHT) {
      this.postureGoodFrames++;
      this.postureBadFrames = 0;
    } else {
      this.postureBadFrames = 0;
      this.postureGoodFrames = 0;
    }

    if (this.postureBadFrames >= this.BAD_FRAMES_TO_TRIGGER) {
      this.postureBlocked = true;
      this.postureHoldFrames = this.WARNING_HOLD_FRAMES;
      this.postureBadFrames = 0;
      this.postureGoodFrames = 0;
      return;
    }

    if (this.postureBlocked && this.postureGoodFrames >= this.GOOD_FRAMES_TO_CLEAR) {
      this.postureBlocked = false;
      this.postureBadFrames = 0;
      this.postureGoodFrames = 0;
    }
  }

  /**
   * Tight knee-zone + bias toward top of knee (prevents shin touch)
   */
  private isHandInKneeZone(hand: Landmark, knee: Landmark): boolean {
    const dx = Math.abs(hand.x - knee.x);
    const dy = Math.abs(hand.y - knee.y);
    const verticalOffset = hand.y - knee.y; // positive = hand lower than knee
    return dx < 0.09 && dy < 0.06 && verticalOffset < 0.04;
  }

  /**
   * Thigh touch detection (hand significantly above knee)
   */
  private isTouchingThigh(hand: Landmark, knee: Landmark): boolean {
    return (knee.y - hand.y) > 0.09;
  }

  private checkVisibility(lms: Landmark[]): boolean {
    return lms.every(lm => (lm.visibility || 0) > this.MIN_VISIBILITY);
  }

  private createResult(feedback: string, isCorrect: boolean): KneeTapResult {
    return {
      exercise: 'knee_tap',
      reps: this.reps,
      stage: this.stage,
      feedback_code: feedback,
      is_correct: isCorrect,
    };
  }

  reset(): void {
    this.reps = 0;
    this.stage = 'neutral';
    this.feedbackCode = 'SETUP_POSITION';
    this.isCorrect = true;

    this.postureBadFrames = 0;
    this.postureGoodFrames = 0;
    this.postureHoldFrames = 0;
    this.postureBlocked = false;

    this.lastTapPair = null;
    this.releaseFrames = 0;
  }
}