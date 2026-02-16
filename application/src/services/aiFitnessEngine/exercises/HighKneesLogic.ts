/**
 * HighKneesLogic.ts
 *
 * FAST + STABLE VERSION ✅ (Front view, 30fps, phone around belt/belly height)
 *
 * - Counting based on HIP FLEXION ANGLE (x,y,z)
 * - No stuck reps: Alternation pairing (LEFT then RIGHT or RIGHT then LEFT)
 * - Portrait safe: posture is SEVERE-only and checked ONLY when both legs are DOWN
 * - STRICTER: Small lifts no longer count
 *
 * PATCH (Feedback Only ✅):
 * - REP_SUCCESS shown for a short time then auto returns to dynamic feedback
 * - Idle detection: if user stands still -> START_MOVING
 * - If moving but not enough -> CMD_KNEES_HIGHER
 *
 * PATCH (Fast reps ✅):
 * - Allow faster rep rate (MIN_REP_INTERVAL_FRAMES lowered)
 * - Do NOT discard a completed pair if interval blocks counting; wait and count as soon as allowed
 */

import { Landmark, HighKneesResult, ExerciseLogic } from '../types';
import { PoseLandmarks, EMA } from '../utils';

type Leg = 'LEFT' | 'RIGHT';

export class HighKneesLogic implements ExerciseLogic {
  private reps = 0;
  private stage: 'neutral' | 'active' = 'neutral';
  private feedbackCode = 'SETUP_STAND_STILL';
  private isCorrect = true;

  // Calibration
  private calibrationFrames = 0;
  private isCalibrated = false;

  // Posture baseline (2D torso length) for portrait safety
  private baselineTorsoLen2D = 0;
  private emaTorsoLen2D = new EMA(0.45);

  // Hip angle baselines (standing)
  private baselineLeftHipAngle = 170;
  private baselineRightHipAngle = 170;
  private sumLeftHipAngle = 0;
  private sumRightHipAngle = 0;

  // Smooth angles
  private emaLeftHipAngle = new EMA(0.45);
  private emaRightHipAngle = new EMA(0.45);

  // Visibility
  private readonly MIN_VISIBILITY = 0.6;

  // ---------- STRICTNESS / SPEED KNOBS (tuned for 30fps) ----------
  private readonly UP_ANGLE_DELTA = 25;
  private readonly DOWN_ANGLE_DELTA = 12;
  private readonly PEAK_EXTRA_DELTA = 8;

  private readonly STABLE_FRAMES = 3;
  private readonly MIN_UP_HOLD_FRAMES = 2;

  // ✅ was 8 (too restrictive for fast pace). Now allows fast reps.
  private readonly MIN_REP_INTERVAL_FRAMES = 3; // ~0.10s @30fps

  // Pair window so it won't get stuck
  private readonly PAIR_WINDOW_FRAMES = 90;

  // Posture (SEVERE only)
  private readonly SEVERE_POSTURE_TOLERANCE = 0.66;
  private severePostureStreak = 0;
  private readonly SEVERE_POSTURE_FRAMES = 10;

  // Reframe adaptation for portrait changes
  private reframeStreak = 0;
  private readonly REFRAME_FRAMES = 10;

  // Debounce streaks
  private leftUpStreak = 0;
  private leftDownStreak = 0;
  private rightUpStreak = 0;
  private rightDownStreak = 0;

  // FSM states
  private leftLegState: 'DOWN' | 'UP' = 'DOWN';
  private rightLegState: 'DOWN' | 'UP' = 'DOWN';

  // UP hold + peak tracking
  private leftUpHold = 0;
  private rightUpHold = 0;
  private leftMinAngle = 999;
  private rightMinAngle = 999;

  // Pairing (alternation)
  private firstLegInPair: Leg | null = null;
  private pairStartFrame = 0;

  // Frame counters
  private frameCount = 0;
  private lastRepFrame = -999999;

  // =========================
  // ✅ FEEDBACK FIX
  // =========================
  private repSuccessFramesLeft = 0;
  private readonly REP_SUCCESS_DISPLAY_FRAMES = 12; // ~0.4s @30fps

  private idleStreak = 0;
  private readonly IDLE_FRAMES = 20; // ~0.66s @30fps

  analyze(landmarks: Landmark[]): HighKneesResult {
    this.frameCount++;

    const lShoulder = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rShoulder = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];
    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];

    // Visibility
    if (!this.checkVisibility([lShoulder, rShoulder, lHip, rHip, lKnee, rKnee])) {
      return this.createResult('ERR_BODY_NOT_VISIBLE', false);
    }

    // Midpoints for posture
    const midShoulderX = (lShoulder.x + rShoulder.x) / 2;
    const midShoulderY = (lShoulder.y + rShoulder.y) / 2;
    const midHipX = (lHip.x + rHip.x) / 2;
    const midHipY = (lHip.y + rHip.y) / 2;

    // Torso 2D length (posture)
    const rawTorsoLen2D = Math.hypot(midHipX - midShoulderX, midHipY - midShoulderY);
    const torsoLen2D = this.emaTorsoLen2D.update(rawTorsoLen2D);
    const safeTorsoLen2D = Math.max(torsoLen2D, 1e-6);

    // Hip flexion angles
    const leftHipAngleRaw = this.angleAtHip(lShoulder, lHip, lKnee);
    const rightHipAngleRaw = this.angleAtHip(rShoulder, rHip, rKnee);

    const leftHipAngle = this.emaLeftHipAngle.update(leftHipAngleRaw);
    const rightHipAngle = this.emaRightHipAngle.update(rightHipAngleRaw);

    // ---------------- Calibration ----------------
    if (!this.isCalibrated) {
      this.calibrationFrames++;
      this.sumLeftHipAngle += leftHipAngle;
      this.sumRightHipAngle += rightHipAngle;

      if (this.calibrationFrames < 30) {
        this.feedbackCode = 'SETUP_STAND_STILL';
        return this.createResult(this.feedbackCode, true);
      }

      this.baselineTorsoLen2D = safeTorsoLen2D;
      this.baselineLeftHipAngle = this.sumLeftHipAngle / this.calibrationFrames;
      this.baselineRightHipAngle = this.sumRightHipAngle / this.calibrationFrames;

      this.isCalibrated = true;
      this.feedbackCode = 'START_MOVING';
    }

    // Down angles (standing-ish)
    const LEFT_DOWN_ANGLE = this.baselineLeftHipAngle - this.DOWN_ANGLE_DELTA;
    const RIGHT_DOWN_ANGLE = this.baselineRightHipAngle - this.DOWN_ANGLE_DELTA;

    // Consider legs down if both angles are above down threshold
    const legsAreDown = leftHipAngle > LEFT_DOWN_ANGLE && rightHipAngle > RIGHT_DOWN_ANGLE;

    // ---------------- Posture (SEVERE only, only when legs are DOWN) ----------------
    const severePostureBad =
      safeTorsoLen2D < (this.baselineTorsoLen2D * this.SEVERE_POSTURE_TOLERANCE);

    if (legsAreDown && severePostureBad) {
      this.reframeStreak++;
      if (this.reframeStreak >= this.REFRAME_FRAMES) {
        this.baselineTorsoLen2D = safeTorsoLen2D;
        this.severePostureStreak = 0;
        this.reframeStreak = 0;
      }
    } else {
      this.reframeStreak = 0;
      if (legsAreDown && severePostureBad) this.severePostureStreak++;
      else this.severePostureStreak = 0;
    }

    if (this.severePostureStreak >= this.SEVERE_POSTURE_FRAMES) {
      this.feedbackCode = 'ERR_STAND_TALL';
      this.isCorrect = false;
      this.forceResetStates();
      this.stage = 'neutral';
      return this.createResult(this.feedbackCode, false);
    }

    // ---------------- Thresholds ----------------
    const LEFT_UP_ANGLE = this.baselineLeftHipAngle - this.UP_ANGLE_DELTA;
    const RIGHT_UP_ANGLE = this.baselineRightHipAngle - this.UP_ANGLE_DELTA;

    const LEFT_COMPLETE_ANGLE =
      this.baselineLeftHipAngle - (this.UP_ANGLE_DELTA + this.PEAK_EXTRA_DELTA);
    const RIGHT_COMPLETE_ANGLE =
      this.baselineRightHipAngle - (this.UP_ANGLE_DELTA + this.PEAK_EXTRA_DELTA);

    // ---------------- LEFT FSM ----------------
    if (this.leftLegState === 'DOWN') {
      if (leftHipAngle < LEFT_UP_ANGLE) {
        this.leftUpStreak++;
        if (this.leftUpStreak >= this.STABLE_FRAMES) {
          this.leftLegState = 'UP';
          this.leftUpStreak = 0;
          this.leftDownStreak = 0;
          this.leftUpHold = 0;
          this.leftMinAngle = leftHipAngle;
        }
      } else {
        this.leftUpStreak = 0;
      }
    } else {
      this.leftUpHold++;
      this.leftMinAngle = Math.min(this.leftMinAngle, leftHipAngle);

      if (this.leftUpHold >= this.MIN_UP_HOLD_FRAMES) {
        if (leftHipAngle > LEFT_DOWN_ANGLE) {
          this.leftDownStreak++;
          if (this.leftDownStreak >= this.STABLE_FRAMES) {
            this.leftLegState = 'DOWN';
            this.leftDownStreak = 0;

            if (this.leftMinAngle < LEFT_COMPLETE_ANGLE) {
              this.onLegComplete('LEFT');
            }
            this.leftMinAngle = 999;
          }
        } else {
          this.leftDownStreak = 0;
        }
      } else {
        this.leftDownStreak = 0;
      }
    }

    // ---------------- RIGHT FSM ----------------
    if (this.rightLegState === 'DOWN') {
      if (rightHipAngle < RIGHT_UP_ANGLE) {
        this.rightUpStreak++;
        if (this.rightUpStreak >= this.STABLE_FRAMES) {
          this.rightLegState = 'UP';
          this.rightUpStreak = 0;
          this.rightDownStreak = 0;
          this.rightUpHold = 0;
          this.rightMinAngle = rightHipAngle;
        }
      } else {
        this.rightUpStreak = 0;
      }
    } else {
      this.rightUpHold++;
      this.rightMinAngle = Math.min(this.rightMinAngle, rightHipAngle);

      if (this.rightUpHold >= this.MIN_UP_HOLD_FRAMES) {
        if (rightHipAngle > RIGHT_DOWN_ANGLE) {
          this.rightDownStreak++;
          if (this.rightDownStreak >= this.STABLE_FRAMES) {
            this.rightLegState = 'DOWN';
            this.rightDownStreak = 0;

            if (this.rightMinAngle < RIGHT_COMPLETE_ANGLE) {
              this.onLegComplete('RIGHT');
            }
            this.rightMinAngle = 999;
          }
        } else {
          this.rightDownStreak = 0;
        }
      } else {
        this.rightDownStreak = 0;
      }
    }

    // Stage
    this.stage =
      this.leftLegState === 'UP' || this.rightLegState === 'UP' || this.reps > 0
        ? 'active'
        : 'neutral';

    // If pair started but too long, reset
    if (this.firstLegInPair && (this.frameCount - this.pairStartFrame > this.PAIR_WINDOW_FRAMES)) {
      this.firstLegInPair = null;
      this.pairStartFrame = 0;
    }

    // ---------------- Feedback logic ----------------
    if (this.repSuccessFramesLeft > 0) {
      this.repSuccessFramesLeft--;
      return this.createResult(this.feedbackCode, true);
    }

    if (legsAreDown && !this.firstLegInPair) this.idleStreak++;
    else this.idleStreak = 0;

    if (this.idleStreak >= this.IDLE_FRAMES) this.feedbackCode = 'START_MOVING';
    else if (this.firstLegInPair) this.feedbackCode = 'CMD_KNEES_HIGHER';
    else this.feedbackCode = legsAreDown ? 'START_MOVING' : 'CMD_KNEES_HIGHER';

    this.isCorrect = true;
    return this.createResult(this.feedbackCode, this.isCorrect);
  }

  // Called when a leg completes a valid high knee
  private onLegComplete(leg: Leg) {
    // Start pair
    if (!this.firstLegInPair) {
      this.firstLegInPair = leg;
      this.pairStartFrame = this.frameCount;
      return;
    }

    // Same leg again -> restart pair
    if (this.firstLegInPair === leg) {
      this.firstLegInPair = leg;
      this.pairStartFrame = this.frameCount;
      return;
    }

    // Different leg -> pair completed
    // ✅ IMPORTANT: if interval blocks, DO NOT discard the pair; wait until allowed.
    if (this.frameCount - this.lastRepFrame >= this.MIN_REP_INTERVAL_FRAMES) {
      this.reps++;
      this.lastRepFrame = this.frameCount;

      this.feedbackCode = 'REP_SUCCESS';
      this.repSuccessFramesLeft = this.REP_SUCCESS_DISPLAY_FRAMES;

      // Reset pair only when counted
      this.firstLegInPair = null;
      this.pairStartFrame = 0;
    } else {
      // Keep pair so it can be counted on next eligible completion
      // (prevents "only last rep counted" when going very fast)
    }
  }

  private angleAtHip(shoulder: Landmark, hip: Landmark, knee: Landmark): number {
    const sx = shoulder.x - hip.x;
    const sy = shoulder.y - hip.y;
    const sz = ((shoulder as any).z ?? 0) - ((hip as any).z ?? 0);

    const kx = knee.x - hip.x;
    const ky = knee.y - hip.y;
    const kz = ((knee as any).z ?? 0) - ((hip as any).z ?? 0);

    const dot = sx * kx + sy * ky + sz * kz;
    const ns = Math.hypot(sx, sy, sz);
    const nk = Math.hypot(kx, ky, kz);

    if (ns < 1e-6 || nk < 1e-6) return 180;

    let c = dot / (ns * nk);
    c = Math.max(-1, Math.min(1, c));
    return (Math.acos(c) * 180) / Math.PI;
  }

  private forceResetStates() {
    this.leftLegState = 'DOWN';
    this.rightLegState = 'DOWN';

    this.leftUpStreak = 0;
    this.leftDownStreak = 0;
    this.rightUpStreak = 0;
    this.rightDownStreak = 0;

    this.leftUpHold = 0;
    this.rightUpHold = 0;

    this.leftMinAngle = 999;
    this.rightMinAngle = 999;

    this.firstLegInPair = null;
    this.pairStartFrame = 0;

    this.repSuccessFramesLeft = 0;
    this.idleStreak = 0;
  }

  private checkVisibility(lms: Landmark[]): boolean {
    return lms.every(lm => (lm.visibility || 0) > this.MIN_VISIBILITY);
  }

  private createResult(feedback: string, isCorrect: boolean): HighKneesResult {
    return {
      exercise: 'high_knees',
      reps: this.reps,
      stage: this.stage,
      feedback_code: feedback,
      is_correct: isCorrect,
    };
  }

  reset(): void {
    this.reps = 0;
    this.stage = 'neutral';
    this.feedbackCode = 'SETUP_STAND_STILL';
    this.isCorrect = true;

    this.isCalibrated = false;
    this.calibrationFrames = 0;

    this.baselineTorsoLen2D = 0;

    this.baselineLeftHipAngle = 170;
    this.baselineRightHipAngle = 170;
    this.sumLeftHipAngle = 0;
    this.sumRightHipAngle = 0;

    this.leftLegState = 'DOWN';
    this.rightLegState = 'DOWN';

    this.leftUpStreak = 0;
    this.leftDownStreak = 0;
    this.rightUpStreak = 0;
    this.rightDownStreak = 0;

    this.leftUpHold = 0;
    this.rightUpHold = 0;

    this.leftMinAngle = 999;
    this.rightMinAngle = 999;

    this.frameCount = 0;
    this.lastRepFrame = -999999;

    this.severePostureStreak = 0;
    this.reframeStreak = 0;

    this.firstLegInPair = null;
    this.pairStartFrame = 0;

    this.repSuccessFramesLeft = 0;
    this.idleStreak = 0;
  }
}