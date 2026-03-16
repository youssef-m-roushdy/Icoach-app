/**
 * Elbow Plank Logic - TypeScript Implementation (Easy Mode Supported)
 */

import { Landmark, ElbowPlankResult, ExerciseLogic, FeedbackSignal } from '../types';
import {
  calculateAngle,
  calculateDistance,
  toPoint,
  getCurrentTime,
  PoseLandmarks,
} from '../utils';

type Difficulty = 'easy' | 'normal';

export class ElbowPlankLogic implements ExerciseLogic {
  private timerVal: number = 0;
  private lastTime: number = 0;
  private feedbackCode: FeedbackSignal = 'SETUP_POSITION';
  private isCorrect: boolean = false;

  // stability window
  private correctStableStart: number = 0;

  // --------- Configurable constants (NOT readonly) ---------
  private HIP_CLEARANCE_RATIO!: number;
  private KNEE_CLEARANCE_RATIO!: number;
  private ELBOW_MAX_ANGLE!: number;
  private ELBOW_MIN_ANGLE!: number;
  private BACK_ANGLE_MIN!: number;
  private BACK_ANGLE_MAX!: number;

  private ANGLE_HYS!: number;
  private RATIO_HYS!: number;
  private CORRECT_STABLE_MS!: number;

  // horizontal tolerance multiplier
  private HORIZONTAL_MULT!: number;

  constructor(private difficulty: Difficulty = 'easy') {
    this.applyDifficulty(this.difficulty);
  }

  private applyDifficulty(level: Difficulty) {
    if (level === 'easy') {
      // ✅ Easy: forgiving thresholds
      this.HIP_CLEARANCE_RATIO = 0.08;
      this.KNEE_CLEARANCE_RATIO = 0.02;

      this.ELBOW_MAX_ANGLE = 165;
      this.ELBOW_MIN_ANGLE = 55;

      this.BACK_ANGLE_MIN = 135;
      this.BACK_ANGLE_MAX = 220;

      this.ANGLE_HYS = 6;
      this.RATIO_HYS = 0.03;

      this.CORRECT_STABLE_MS = 150;

      this.HORIZONTAL_MULT = 0.65;
    } else {
      // ✅ Normal: قريب من إعداداتك الحالية (لكن ممكن تعدّلها)
      this.HIP_CLEARANCE_RATIO = 0.12;
      this.KNEE_CLEARANCE_RATIO = 0.04;

      this.ELBOW_MAX_ANGLE = 150;
      this.ELBOW_MIN_ANGLE = 70;

      this.BACK_ANGLE_MIN = 150;
      this.BACK_ANGLE_MAX = 205;

      this.ANGLE_HYS = 4;
      this.RATIO_HYS = 0.02;

      this.CORRECT_STABLE_MS = 300;

      this.HORIZONTAL_MULT = 0.85;
    }
  }

  analyze(landmarks: Landmark[]): ElbowPlankResult {
    const currentTime = getCurrentTime();
    const nowMs = Date.now();

    // ---------- Extract points ----------
    const lSh = toPoint(landmarks[PoseLandmarks.LEFT_SHOULDER]);
    const lEl = toPoint(landmarks[PoseLandmarks.LEFT_ELBOW]);
    const lWr = toPoint(landmarks[PoseLandmarks.LEFT_WRIST]);
    const lHip = toPoint(landmarks[PoseLandmarks.LEFT_HIP]);
    const lKnee = toPoint(landmarks[PoseLandmarks.LEFT_KNEE]);
    const lAnk = toPoint(landmarks[PoseLandmarks.LEFT_ANKLE]);

    const rSh = toPoint(landmarks[PoseLandmarks.RIGHT_SHOULDER]);
    const rEl = toPoint(landmarks[PoseLandmarks.RIGHT_ELBOW]);
    const rWr = toPoint(landmarks[PoseLandmarks.RIGHT_WRIST]);
    const rHip = toPoint(landmarks[PoseLandmarks.RIGHT_HIP]);
    const rKnee = toPoint(landmarks[PoseLandmarks.RIGHT_KNEE]);
    const rAnk = toPoint(landmarks[PoseLandmarks.RIGHT_ANKLE]);

    // ---------- Angles ----------
    const elbowAngleL = calculateAngle(lSh, lEl, lWr);
    const elbowAngleR = calculateAngle(rSh, rEl, rWr);
    const elbowAngle = (elbowAngleL + elbowAngleR) / 2;

    const hipAngleL = calculateAngle(lSh, lHip, lKnee);
    const hipAngleR = calculateAngle(rSh, rHip, rKnee);
    const hipAngle = (hipAngleL + hipAngleR) / 2;

    // ---------- Size & clearance ----------
    const torsoSizeL = calculateDistance(lSh, lHip);
    const torsoSizeR = calculateDistance(rSh, rHip);
    const torsoSize = (torsoSizeL + torsoSizeR) / 2;

    const groundY = (lAnk[1] + rAnk[1]) / 2;
    const hipY = (lHip[1] + rHip[1]) / 2;
    const kneeY = (lKnee[1] + rKnee[1]) / 2;

    const hipClearance = groundY - hipY;
    const kneeClearance = groundY - kneeY;

    // ---------- Horizontal check ----------
    const shX = (lSh[0] + rSh[0]) / 2;
    const ankX = (lAnk[0] + rAnk[0]) / 2;
    const shY = (lSh[1] + rSh[1]) / 2;
    const ankY = (lAnk[1] + rAnk[1]) / 2;

    const bodyWidthX = Math.abs(shX - ankX);
    const bodyHeightY = Math.abs(shY - ankY);

    const isHorizontal = bodyWidthX > bodyHeightY * this.HORIZONTAL_MULT;

    // -------------------- Decision --------------------
    let wantCorrect = false;

    const hipEnter = this.HIP_CLEARANCE_RATIO * torsoSize;
    const hipExit = (this.HIP_CLEARANCE_RATIO - this.RATIO_HYS) * torsoSize;

    const kneeEnter = this.KNEE_CLEARANCE_RATIO * torsoSize;
    const kneeExit = (this.KNEE_CLEARANCE_RATIO - this.RATIO_HYS) * torsoSize;

    const elbowMaxEnter = this.ELBOW_MAX_ANGLE;
    const elbowMaxExit = this.ELBOW_MAX_ANGLE + this.ANGLE_HYS;

    const elbowMinEnter = this.ELBOW_MIN_ANGLE;
    const elbowMinExit = this.ELBOW_MIN_ANGLE - this.ANGLE_HYS;

    const backMinEnter = this.BACK_ANGLE_MIN;
    const backMinExit = this.BACK_ANGLE_MIN - this.ANGLE_HYS;

    const backMaxEnter = this.BACK_ANGLE_MAX;
    const backMaxExit = this.BACK_ANGLE_MAX + this.ANGLE_HYS;

    if (!isHorizontal) {
      this.feedbackCode = 'SETUP_POSITION';
      wantCorrect = false;
    } else {
      const hipOk = this.isCorrect ? (hipClearance >= hipExit) : (hipClearance >= hipEnter);
      if (!hipOk) {
        this.feedbackCode = 'ERR_HIPS_TOO_LOW';
        wantCorrect = false;
      } else {
        const kneeOk = this.isCorrect ? (kneeClearance >= kneeExit) : (kneeClearance >= kneeEnter);
        if (!kneeOk) {
          this.feedbackCode = 'ERR_KNEES_TOUCHING';
          wantCorrect = false;
        } else {
          const elbowNotTooStraight = this.isCorrect ? (elbowAngle <= elbowMaxExit) : (elbowAngle <= elbowMaxEnter);
          if (!elbowNotTooStraight) {
            this.feedbackCode = 'ERR_ARMS_TOO_STRAIGHT';
            wantCorrect = false;
          } else {
            const elbowNotTooBent = this.isCorrect ? (elbowAngle >= elbowMinExit) : (elbowAngle >= elbowMinEnter);
            if (!elbowNotTooBent) {
              this.feedbackCode = 'ERR_BAD_ELBOW_POSITION';
              wantCorrect = false;
            } else {
              const backOkMin = this.isCorrect ? (hipAngle >= backMinExit) : (hipAngle >= backMinEnter);
              if (!backOkMin) {
                this.feedbackCode = 'ERR_BACK_SAG';
                wantCorrect = false;
              } else {
                const backOkMax = this.isCorrect ? (hipAngle <= backMaxExit) : (hipAngle <= backMaxEnter);
                if (!backOkMax) {
                  this.feedbackCode = 'ERR_HIPS_TOO_HIGH';
                  wantCorrect = false;
                } else {
                  this.feedbackCode = 'HOLD_FIXED';
                  wantCorrect = true;
                }
              }
            }
          }
        }
      }
    }

    // -------------------- Stability Gate --------------------
    if (wantCorrect) {
      if (this.correctStableStart === 0) this.correctStableStart = nowMs;

      const stableFor = nowMs - this.correctStableStart;
      this.isCorrect = stableFor >= this.CORRECT_STABLE_MS;

      if (!this.isCorrect) this.feedbackCode = 'HOLD_STEADY';
    } else {
      this.correctStableStart = 0;
      this.isCorrect = false;
    }

    // -------------------- Timer Logic --------------------
// -------------------- Timer Logic --------------------
    if (this.isCorrect) {
      if (this.lastTime === 0) this.lastTime = currentTime;

      if (currentTime - this.lastTime >= 1.0) {
        this.timerVal += 1;
        this.lastTime = currentTime;
        // ✅ التعديل هنا: نبعت كود COUNT_ مع رقم الثانية الحالي عشان ينطقها
        this.feedbackCode = `COUNT_${this.timerVal}`; 
      }
    } else {
      this.lastTime = 0;
    }

    return {
      exercise: 'elbow_plank',
      timer: this.timerVal,
      feedback_code: this.feedbackCode,
      is_correct: this.isCorrect,
    };
  }

  reset(): void {
    this.timerVal = 0;
    this.lastTime = 0;
    this.feedbackCode = 'SETUP_POSITION';
    this.isCorrect = false;
    this.correctStableStart = 0;
  }
}