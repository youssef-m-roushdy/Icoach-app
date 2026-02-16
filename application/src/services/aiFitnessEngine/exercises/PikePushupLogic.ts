/**
 * PikePushupLogic.ts
 * * STRICT Version
 * * Target: Shoulders & Upper Chest
 * * Logic: Maintain V-Shape (Pike), bend elbows to head-to-floor, push back up.
 */

import { Landmark, PikePushupResult, ExerciseLogic } from '../types';
import { PoseLandmarks, calculateAngle, EMA } from '../utils';

export class PikePushupLogic implements ExerciseLogic {
  private reps = 0;
  private stage: 'setup' | 'down' | 'up' = 'setup';
  private feedbackCode = 'SETUP_V_SHAPE';
  private isCorrect = true;

  // Smoothing (عشان الرعشة في الزوايا)
  private emaElbow = new EMA(0.3);
  private emaHip = new EMA(0.3);
  private emaKnee = new EMA(0.3);

  // --- THRESHOLDS (صارمة جداً) ---
  
  // 1. شروط وضعية الـ Pike (V-Shape)
  private readonly PIKE_HIP_MIN = 60;  // لو أقل من كده يبقى واقف مش موطي
  private readonly PIKE_HIP_MAX = 120; // لو أكتر من كده يبقى بلانك مش بايك
  
  // 2. شرط استقامة الرجل (Anti-Cheat)
  // عشان ميحركش ركبه ويقلبها تمرين رجل
  private readonly KNEE_STRAIGHT_MIN = 150; 

  // 3. شروط العد (Range of Motion)
  private readonly ELBOW_DOWN_THRESHOLD = 95;  // لازم ينزل لحد زاوية 95 (راسه عند الأرض)
  private readonly ELBOW_UP_THRESHOLD = 160;   // لازم يفرد دراعه للاخر

  // 4. Visibility
  private readonly MIN_VISIBILITY = 0.5;

  analyze(landmarks: Landmark[]): PikePushupResult {
    // 1. Get Landmarks (Right Side usually visible, or dynamically pick visible side)
    // هنا هنفترض الجانب الأيمن كبداية، ولو حابب نخليه ديناميكي زي البايثون ممكن (بس الأيمن كافي في البروفايل)
    // الأفضل نعمل Check مين اللي باين أكتر
    const leftVis = landmarks[PoseLandmarks.LEFT_SHOULDER].visibility || 0;
    const rightVis = landmarks[PoseLandmarks.RIGHT_SHOULDER].visibility || 0;
    const side = rightVis > leftVis ? 'RIGHT' : 'LEFT';

    const shoulder = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_SHOULDER : PoseLandmarks.LEFT_SHOULDER];
    const elbow = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_ELBOW : PoseLandmarks.LEFT_ELBOW];
    const wrist = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_WRIST : PoseLandmarks.LEFT_WRIST];
    const hip = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_HIP : PoseLandmarks.LEFT_HIP];
    const knee = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_KNEE : PoseLandmarks.LEFT_KNEE];
    const ankle = landmarks[side === 'RIGHT' ? PoseLandmarks.RIGHT_ANKLE : PoseLandmarks.LEFT_ANKLE];

    // Visibility Check
    if (!this.checkVisibility([shoulder, elbow, wrist, hip, knee, ankle])) {
      return this.createResult('ERR_BODY_NOT_VISIBLE', false);
    }

    // 2. Calculate Angles
    const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
    const rawHipAngle = calculateAngle(shoulder, hip, knee);
    const rawKneeAngle = calculateAngle(hip, knee, ankle);

    // Smoothing
    const elbowAngle = this.emaElbow.update(rawElbowAngle);
    const hipAngle = this.emaHip.update(rawHipAngle);
    const kneeAngle = this.emaKnee.update(rawKneeAngle);

    // 3. Logic Flow

    // A. Check Setup (Pike Position)
    // لازم الأول نتأكد إنه واخد وضع الـ V ورجله مفرودة
    const isPikeShape = hipAngle >= this.PIKE_HIP_MIN && hipAngle <= this.PIKE_HIP_MAX;
    const isLegStraight = kneeAngle >= this.KNEE_STRAIGHT_MIN;

    if (!isPikeShape) {
      // لو وسطه مفرود أوي (بلانك) أو متني زيادة
      this.feedbackCode = 'SETUP_V_SHAPE'; // "اعمل شكل 8 او V"
      this.isCorrect = false;
      this.stage = 'setup';
      return this.createResult(this.feedbackCode, false);
    }

    if (!isLegStraight) {
      // لو تاني ركبته (غش)
      this.feedbackCode = 'FIX_KNEES'; // "افرد ركبتك"
      this.isCorrect = false;
      return this.createResult(this.feedbackCode, false);
    }

    // B. Rep Counting Logic
    // طالما هو في وضع الـ Pike السليم، نبدأ نشوف كوعه

    if (elbowAngle < this.ELBOW_DOWN_THRESHOLD) {
      // نزل تحت
      this.stage = 'down';
      this.feedbackCode = 'PUSH_UP'; // "اطلع لفوق"
      this.isCorrect = true;
    } 
    else if (elbowAngle > this.ELBOW_UP_THRESHOLD) {
      // طلع فوق
      if (this.stage === 'down') {
        // كان تحت وطلع -> عدة كاملة
        this.reps++;
        this.stage = 'up';
        this.feedbackCode = 'REP_SUCCESS';
        this.isCorrect = true;
      } else {
        // لسه مابدأش النزول
        this.stage = 'up';
        this.feedbackCode = 'CMD_GO_DOWN'; // "انزل براسك للأرض"
        this.isCorrect = true;
      }
    } 
    else {
      // في النص (بين الطلوع والنزول)
      if (this.stage === 'down') {
        this.feedbackCode = 'PUSH_UP';
      } else {
        this.feedbackCode = 'CMD_GO_DOWN';
      }
      this.isCorrect = true;
    }

    return this.createResult(this.feedbackCode, this.isCorrect);
  }

  private checkVisibility(lms: Landmark[]): boolean {
    return lms.every(lm => (lm.visibility || 0) > this.MIN_VISIBILITY);
  }

  private createResult(feedback: string, isCorrect: boolean): PikePushupResult {
    return {
      exercise: 'pike_pushup',
      reps: this.reps,
      stage: this.stage === 'setup' ? 'up' : this.stage, // Mapping setup to up for UI
      feedback_code: feedback,
      is_correct: isCorrect,
    };
  }
}