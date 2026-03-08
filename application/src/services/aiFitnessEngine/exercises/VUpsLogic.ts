/**
 * VUpsLogic.ts
 * * Exercise: Double Leg V-Ups (Jackknife)
 * * Logic: Simultaneous lift of Torso and Legs to form a "V" shape.
 * * Key Cheats Prevented: 
 * 1. Knee Bending (Tucking) -> Enforced by Knee Angle.
 * 2. Partial ROM -> Enforced by Hand-to-Foot distance + Hip Angle.
 * * * NOTE: 'VUpsResult' is imported from types to avoid export conflicts.
 */

import { Landmark, ExerciseLogic, VUpsResult } from '../types'; // 👈 Import Result from types
import { PoseLandmarks, calculateAngle, calculateDistance, EMA } from '../utils';

export class VUpsLogic implements ExerciseLogic {
  private reps = 0;
  private stage: 'down' | 'up' = 'down';
  private feedbackCode = 'SETUP_LIE_DOWN';
  private isCorrect = true;

  // Smoothing
  private emaHipAngle = new EMA(0.3);
  private emaKneeAngle = new EMA(0.3);

  // --- THRESHOLDS ---

  // 1. استقامة الرجل (Anti-Cheat)
  // لازم الزاوية تكون أكبر من 150 (مفرودة). لو قلت عن كده يبقى بيثني ركبته.
  private readonly MIN_KNEE_ANGLE = 150;

  // 2. زاوية الـ V (قمة الحركة)
  // الجسم المفرود 180. عشان تعمل V لازم الزاوية بين (كتف-حوض-ركبة) تقل عن 85.
  private readonly PEAK_HIP_ANGLE = 85; 

  // 3. العودة للبداية (Reset)
  // لازم يرجع يفرد جسمه تاني (زاوية أكبر من 150).
  private readonly RESET_HIP_ANGLE = 150;

  // 4. التلامس (Touch)
  // المسافة بين الإيد والرجل في قمة الحركة (0.18 تسمح بلمس القصبة/Shin مش لازم الصوابع بالظبط)
  private readonly TOUCH_THRESHOLD = 0.18;

  // 5. Visibility
  private readonly MIN_VISIBILITY = 0.5;

  analyze(landmarks: Landmark[]): VUpsResult {
    // 1. Get Landmarks (Using Midpoints for better accuracy in double leg)
    const lShoulder = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rShoulder = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];
    const lKnee = landmarks[PoseLandmarks.LEFT_KNEE];
    const rKnee = landmarks[PoseLandmarks.RIGHT_KNEE];
    const lAnkle = landmarks[PoseLandmarks.LEFT_ANKLE];
    const rAnkle = landmarks[PoseLandmarks.RIGHT_ANKLE];
    const lHand = landmarks[PoseLandmarks.LEFT_INDEX]; // Finger tip
    const rHand = landmarks[PoseLandmarks.RIGHT_INDEX];

    // Visibility Check
    if (!this.checkVisibility([lShoulder, rShoulder, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle])) {
      return this.createResult('ERR_BODY_NOT_VISIBLE', false);
    }

    // 2. Calculations
    // بناخد متوسط الجانبين عشان الدقة (Double Leg)
    
    // A. Knee Angle (Are legs straight?)
    const leftKneeAngle = calculateAngle(lHip, lKnee, lAnkle);
    const rightKneeAngle = calculateAngle(rHip, rKnee, rAnkle);
    const avgKneeAngle = this.emaKneeAngle.update((leftKneeAngle + rightKneeAngle) / 2);

    // B. Hip Angle (Are we in V-Shape?)
    const leftHipAngle = calculateAngle(lShoulder, lHip, lKnee);
    const rightHipAngle = calculateAngle(rShoulder, rHip, rKnee);
    const avgHipAngle = this.emaHipAngle.update((leftHipAngle + rightHipAngle) / 2);

    // C. Hand to Foot Distance (Did we touch?)
    const distLeft = calculateDistance(lHand, lAnkle);
    const distRight = calculateDistance(rHand, rAnkle);
    const avgDist = (distLeft + distRight) / 2;

    // 3. Logic Flow

    // 🔥 Anti-Cheat: Knee Bending
    if (avgKneeAngle < this.MIN_KNEE_ANGLE) {
      this.feedbackCode = 'ERR_KNEES_BENT'; // "افرد ركبتك!"
      this.isCorrect = false;
      return this.createResult(this.feedbackCode, false);
    }

    // State Machine
    if (this.stage === 'down') {
      // مستني يطلع لفوق ويعمل شكل V
      // الشرط: زاوية الحوض قفلت + الإيد قربت من الرجل
      const isVShape = avgHipAngle < this.PEAK_HIP_ANGLE;
      const isTouching = avgDist < this.TOUCH_THRESHOLD;

      if (isVShape && isTouching) {
        this.reps++;
        this.stage = 'up'; // هو دلوقتي فوق
        this.feedbackCode = 'REP_SUCCESS'; // "عاش!"
        this.isCorrect = true;
      } else {
        // توجيهات وهو طالع
        if (avgHipAngle < 120 && !isTouching) {
          this.feedbackCode = 'CMD_REACH_TOES'; // "المس مشط رجلك"
        } else {
          this.feedbackCode = 'CMD_UP_V'; // "اطلع شكل V"
        }
        this.isCorrect = true;
      }
    } 
    else if (this.stage === 'up') {
      // مستني ينزل تاني (Reset)
      if (avgHipAngle > this.RESET_HIP_ANGLE) {
        this.stage = 'down';
        this.feedbackCode = 'CMD_UP_V';
        this.isCorrect = true;
      } else {
        // لسه فوق أو بينزل
        this.feedbackCode = 'CMD_GO_DOWN'; // "انزل وافرد جسمك"
        this.isCorrect = true;
      }
    }

    return this.createResult(this.feedbackCode, this.isCorrect);
  }

  private checkVisibility(lms: Landmark[]): boolean {
    return lms.every(lm => (lm.visibility || 0) > this.MIN_VISIBILITY);
  }

  private createResult(feedback: string, isCorrect: boolean): VUpsResult {
    return {
      exercise: 'v_ups',
      reps: this.reps,
      stage: this.stage,
      feedback_code: feedback,
      is_correct: isCorrect,
    };
  }
}