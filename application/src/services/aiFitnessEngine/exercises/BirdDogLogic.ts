/**
 * BirdDogLogic.ts
 * ✅ STRICT & FAST VERSION
 * - Stricter angles (Must fully extend)
 * - Specific feedback for partial reps (Bent knee / Low hip)
 * - Faster feedback response (Reduced delay)
 * - Keeps Arm Latching & Side-View safety
 */

import { Landmark, BirdDogResult, ExerciseLogic } from '../types';
import { PoseLandmarks, calculateAngle, EMA } from '../utils';

type Stage = 'setup' | 'neutral' | 'extended';

export class BirdDogLogic implements ExerciseLogic {
  private reps = 0;
  private stage: Stage = 'setup';

  private displayedFeedback = 'SETUP_ALL_FOURS';
  private isCorrect = true;

  // 🧠 Arm latch logic
  private oppositeArmLatched = false;

  // ⏳ Feedback debounce (Updated for Speed)
  private pendingFeedback: string | null = null;
  private pendingFrames = 0;
  // قللناه لـ 10 عشان يكون سريع بس ماسك نفسه (حوالي 0.3 ثانية)
  private readonly FEEDBACK_DELAY = 10; 

  // ─── SMOOTHING ─────────────────────────────
  private emaHip = new EMA(0.3);
  private emaKnee = new EMA(0.3);
  private emaTorso = new EMA(0.3);

  // ─── STRICTER THRESHOLDS ───────────────────
  // علينا الزاوية لـ 160 عشان نضمن الفرد الكامل
  private readonly EXTENSION = 160; 
  // علينا استقامة الركبة لـ 155 (ممنوع الركبة المتنية)
  private readonly KNEE_STRAIGHT = 155; 
  
  private readonly RETURN = 130;
  private readonly MAX_TORSO = 30;
  private readonly VIS = 0.5;

  // ─── REP CONFIRMATION ──────────────────────
  private stableFrames = 0;
  private readonly CONFIRM = 5; // زودنا فريم واحد للثبات عشان الصرامة

  analyze(lm: Landmark[]): BirdDogResult {
    const lS = lm[PoseLandmarks.LEFT_SHOULDER];
    const rS = lm[PoseLandmarks.RIGHT_SHOULDER];
    const lH = lm[PoseLandmarks.LEFT_HIP];
    const rH = lm[PoseLandmarks.RIGHT_HIP];
    const lK = lm[PoseLandmarks.LEFT_KNEE];
    const rK = lm[PoseLandmarks.RIGHT_KNEE];
    const lA = lm[PoseLandmarks.LEFT_ANKLE];
    const rA = lm[PoseLandmarks.RIGHT_ANKLE];
    const lW = lm[PoseLandmarks.LEFT_WRIST];
    const rW = lm[PoseLandmarks.RIGHT_WRIST];

    if (!this.visible([lH, rH, lK, rK, lA, rA])) {
      return this.commit('ERR_BODY_NOT_VISIBLE', false);
    }

    // ─── LEG DETECTION ───────────────────────
    const leftLegUp = lA.y < lH.y + 0.12;
    const rightLegUp = rA.y < rH.y + 0.12;

    if (!leftLegUp && !rightLegUp) {
      this.stage = 'neutral';
      this.oppositeArmLatched = false;
      this.stableFrames = 0;
      return this.commit('CMD_EXTEND', true);
    }

    const activeLeg: 'LEFT' | 'RIGHT' = leftLegUp ? 'LEFT' : 'RIGHT';

    // ─── ARM DETECTION (SOFT) ─────────────────
    const leftArmUp = (lW.visibility || 0) > 0.4 && lW.y < lS.y + 0.15;
    const rightArmUp = (rW.visibility || 0) > 0.4 && rW.y < rS.y + 0.15;

    // ❌ Same-side arm → Error
    if (
      (activeLeg === 'LEFT' && leftArmUp) ||
      (activeLeg === 'RIGHT' && rightArmUp)
    ) {
      this.oppositeArmLatched = false;
      return this.commit('ERR_OPPOSITE_LIMBS', false);
    }

    // ✅ Latch opposite arm ONCE
    if (!this.oppositeArmLatched) {
      const oppositeArmUp = activeLeg === 'LEFT' ? rightArmUp : leftArmUp;
      if (!oppositeArmUp) {
        return this.commit('CMD_RAISE_OPPOSITE_ARM', true);
      }
      this.oppositeArmLatched = true;
    }

    // ─── SELECT JOINTS ───────────────────────
    const hip = activeLeg === 'LEFT' ? lH : rH;
    const knee = activeLeg === 'LEFT' ? lK : rK;
    const ankle = activeLeg === 'LEFT' ? lA : rA;
    const shoulder = activeLeg === 'LEFT' ? rS : lS;

    // ─── ANGLES ──────────────────────────────
    const hipAngle = this.emaHip.update(calculateAngle(shoulder, hip, knee));
    const kneeAngle = this.emaKnee.update(calculateAngle(hip, knee, ankle));

    // ─── TORSO CHECK ─────────────────────────
    const dx = Math.abs(lS.x - lH.x);
    const dy = Math.abs(lS.y - lH.y);
    const torso = this.emaTorso.update(Math.atan2(dy, dx) * (180 / Math.PI));

    if (torso > this.MAX_TORSO) {
      return this.commit('ERR_FLATTEN_BACK', false);
    }

    // ─── STATE MACHINE (STRICT CHECKING) ──────
    if (this.stage === 'neutral') {
      // Check specific cheat conditions BEFORE counting
      const isHipGood = hipAngle > this.EXTENSION;
      const isKneeGood = kneeAngle > this.KNEE_STRAIGHT;

      if (isHipGood && isKneeGood) {
        this.stableFrames++;
        if (this.stableFrames >= this.CONFIRM) {
          this.reps++;
          this.stage = 'extended';
          this.stableFrames = 0;
          return this.commit('REP_SUCCESS', true, true); // Immediate Success
        }
      } else {
        this.stableFrames = 0;
        // ⚠️ Specific Feedback for partial reps
        if (!isKneeGood) {
           return this.commit('ERR_STRAIGHTEN_LEG', false);
        }
        if (!isHipGood) {
           return this.commit('CMD_EXTEND_FULLY', false); // New Code
        }
      }
      // If moving but not quite there yet
      return this.commit('CMD_EXTEND', true);
    }

    if (this.stage === 'extended') {
      if (hipAngle < this.RETURN) {
        this.stage = 'neutral';
        this.oppositeArmLatched = false;
        return this.commit('CMD_EXTEND', true);
      }
      return this.commit('HOLD_EXTENSION', true);
    }

    return this.commit(this.displayedFeedback, this.isCorrect);
  }

  // ─── FEEDBACK DEBOUNCE ─────────────────────
  private commit(code: string, correct: boolean, immediate = false): BirdDogResult {
    // Immediate overrides (like Success) bypass the delay
    if (immediate) {
      this.displayedFeedback = code;
      this.pendingFeedback = null;
      this.pendingFrames = 0;
      this.isCorrect = correct;
      return this.out();
    }

    // Debounce logic
    if (this.pendingFeedback !== code) {
      this.pendingFeedback = code;
      this.pendingFrames = 0;
    } else {
      this.pendingFrames++;
      if (this.pendingFrames >= this.FEEDBACK_DELAY) {
        this.displayedFeedback = code;
        this.isCorrect = correct;
      }
    }
    return this.out();
  }

  private visible(lms: Landmark[]) {
    return lms.every(l => (l.visibility || 0) > this.VIS);
  }

  private out(): BirdDogResult {
    return {
      exercise: 'bird_dog',
      reps: this.reps,
      stage: this.stage,
      feedback_code: this.displayedFeedback,
      is_correct: this.isCorrect,
    };
  }
}