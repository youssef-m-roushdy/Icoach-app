/**
 * GluteBridgeLogic.ts
 * * FLEXIBLE VERSION 🛠️
 * * Fixes: "Stuck on Push Hips" bug.
 * * Strategy: Relies purely on Hip Angle (Shoulder-Hip-Knee) opening and closing.
 * * Logic: 
 * - UP: Body creates a relatively straight line (> 155 degrees).
 * - DOWN: Hips drop, angle closes (< 140 degrees).
 */

import { Landmark, GluteBridgeResult, ExerciseLogic } from '../types';
import { PoseLandmarks, calculateAngle, EMA } from '../utils';

export class GluteBridgeLogic implements ExerciseLogic {
  private reps = 0;
  private stage: 'down' | 'up' = 'down';
  private feedbackCode = 'SETUP_LIE_DOWN';
  private isCorrect = true;

  // Smoothing
  private emaHipAngle = new EMA(0.3); // Shoulder-Hip-Knee
  private emaKneeAngle = new EMA(0.3); // Hip-Knee-Ankle (To ensure knees are bent)

  // --- THRESHOLDS ---

  // 1. زاوية القمة (Bridge Up)
  // الجسم المستقيم = 180. خليناها 155 عشان تبقى سهلة التحقيق لأي حد.
  private readonly HIP_ANGLE_UP = 155; 

  // 2. زاوية القاع (Hips Down)
  // لما بتنزل وسطك، الزاوية بتكسر.
  private readonly HIP_ANGLE_DOWN = 135;

  // 3. وضعية الركبة (Setup)
  // لازم الركبة تكون متنية عشان ده Glute Bridge مش Leg Raise.
  // الزاوية المفروض تكون حول 45-90 درجة. لو 180 يبقى فارد رجله.
  private readonly MAX_KNEE_ANGLE_SETUP = 130;

  // Visibility
  private readonly MIN_VISIBILITY = 0.5;

  analyze(landmarks: Landmark[]): GluteBridgeResult {
    // 1. Auto-detect Side
    const leftHipVis = landmarks[PoseLandmarks.LEFT_HIP].visibility || 0;
    const rightHipVis = landmarks[PoseLandmarks.RIGHT_HIP].visibility || 0;
    const side = rightHipVis > leftHipVis ? 'RIGHT' : 'LEFT';

    const shoulder = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_SHOULDER : PoseLandmarks.LEFT_SHOULDER];
    const hip = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_HIP : PoseLandmarks.LEFT_HIP];
    const knee = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_KNEE : PoseLandmarks.LEFT_KNEE];
    const ankle = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_ANKLE : PoseLandmarks.LEFT_ANKLE];

    // Visibility Check
    if (!this.checkVisibility([shoulder, hip, knee, ankle])) {
      return this.createResult('ERR_BODY_NOT_VISIBLE', false);
    }

    // 2. Calculate Angles
    // A. Hip Angle (Extension check): Shoulder - Hip - Knee
    // This is the main driver. 180 = Straight body.
    const rawHipAngle = calculateAngle(shoulder, hip, knee);
    const hipAngle = this.emaHipAngle.update(rawHipAngle);

    // B. Knee Angle (Setup check): Hip - Knee - Ankle
    const rawKneeAngle = calculateAngle(hip, knee, ankle);
    const kneeAngle = this.emaKneeAngle.update(rawKneeAngle);

    // 3. Logic Flow

    // A. Setup Check: Are knees bent? 
    // If knees are straight (> 140), user is just lying flat.
    if (kneeAngle > this.MAX_KNEE_ANGLE_SETUP) {
      this.feedbackCode = 'SETUP_POSITION'; // "اتني ركبتك"
      this.isCorrect = false;
      return this.createResult(this.feedbackCode, false);
    }

    // B. State Machine (Simple & Robust)
    
    if (this.stage === 'down') {
      // Waiting for UP
      // Condition: Hip angle opens up (becomes straight)
      if (hipAngle > this.HIP_ANGLE_UP) {
        this.reps++;
        this.stage = 'up';
        this.feedbackCode = 'REP_SUCCESS'; // "عاش!"
        this.isCorrect = true;
      } else {
        // Still down or going up
        // If angle is getting close (e.g. > 140), encourage them
        if (hipAngle > 140) {
          this.feedbackCode = 'CMD_PUSH_HIGHER'; // "زق كمان!"
        } else {
          this.feedbackCode = 'CMD_PUSH_HIPS'; // "ارفع وسطك"
        }
        this.isCorrect = true;
      }
    } 
    else if (this.stage === 'up') {
      // Waiting for DOWN
      // Condition: Hip angle closes (hips drop)
      if (hipAngle < this.HIP_ANGLE_DOWN) {
        this.stage = 'down';
        this.feedbackCode = 'CMD_PUSH_HIPS';
        this.isCorrect = true;
      } else {
        // Still UP (Holding)
        // Anti-Cheat: Hyperextension (Arching too much > 195)
        if (hipAngle > 195) {
          this.feedbackCode = 'ERR_ARCHING_BACK'; // "متقوسش ضهرك"
          this.isCorrect = false;
        } else {
          this.feedbackCode = 'HOLD_BRIDGE'; // "اثبت"
          this.isCorrect = true;
        }
      }
    }

    return this.createResult(this.feedbackCode, this.isCorrect);
  }

  private checkVisibility(lms: Landmark[]): boolean {
    return lms.every(lm => (lm.visibility || 0) > this.MIN_VISIBILITY);
  }

  private createResult(feedback: string, isCorrect: boolean): GluteBridgeResult {
    return {
      exercise: 'glute_bridge',
      reps: this.reps,
      stage: this.stage,
      feedback_code: feedback,
      is_correct: isCorrect,
    };
  }
}