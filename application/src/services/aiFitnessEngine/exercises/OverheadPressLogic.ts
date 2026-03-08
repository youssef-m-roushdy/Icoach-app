/**
 * OverheadPressLogic.ts
 * * BALANCED VERSION
 * * Tuned: Easier to count reps, but still requires good form.
 * * Fixes: "Portrait/Landscape" back arch bug.
 */

import { Landmark, OverheadPressResult, ExerciseLogic } from '../types';
import { PoseLandmarks } from '../utils';

// --- Helper: Exponential Moving Average (Smoothing) ---
class EMA {
  private alpha: number;
  private currentValue: number | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }

  update(newValue: number): number {
    if (this.currentValue === null) {
      this.currentValue = newValue;
    } else {
      this.currentValue = this.alpha * newValue + (1 - this.alpha) * this.currentValue;
    }
    return this.currentValue;
  }

  reset() {
    this.currentValue = null;
  }
}

export class OverheadPressLogic implements ExerciseLogic {
  // State Tracking
  private reps: number = 0;
  private stage: 'down' | 'up' = 'down';
  private feedbackCode: string = 'SETUP_POSITION';
  private isCorrect: boolean = true;

  // Timing
  private lastRepTime: number = 0;
  private topStableStart: number = 0;
  private bottomStableStart = 0;

  // Smoothing
  private emaElbowL = new EMA(0.3);
  private emaElbowR = new EMA(0.3);

  // --- BALANCED CONSTANTS (The Sweet Spot) ---
  
  private readonly ANGLES = {
    // ✅ الزوايا الجديدة (أسهل في العد)
    TOP_THRESHOLD: 150,      // 150 درجة كافية جداً لاعتبار الدراع مفرود
    TOP_WARNING: 120,        // لو بين 120 و 150 هيقولك ارفع كمان
    BOTTOM_THRESHOLD: 110,   // النزول لحد مستوى الاذن تقريباً كافي
    SYNC_TOLERANCE: 30       // زودنا السماحية في فرق التزامن لـ 30 درجة
  };

  private readonly TIME = {
    STABILITY_WINDOW: 150,   // لازم تثبت جزء من الثانية (عشان يمنع الرعشة)
    MIN_REP_TIME: 800        // زمن العدة المنطقي
  };

  /**
   * Main Analysis Function
   */
  analyze(landmarks: Landmark[]): OverheadPressResult {
    const now = Date.now();

    // 1. Extract Points
    const lSh = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rSh = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lEl = landmarks[PoseLandmarks.LEFT_ELBOW];
    const rEl = landmarks[PoseLandmarks.RIGHT_ELBOW];
    const lWr = landmarks[PoseLandmarks.LEFT_WRIST];
    const rWr = landmarks[PoseLandmarks.RIGHT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];

    // Visibility Check (Shoulders & Elbows & Wrists are mandatory)
    if (!this.checkVisibility([lSh, rSh, lEl, rEl, lWr, rWr])) {
      return this.createResult('ERR_CAMERA_VIEW', false);
    }

    // 2. Calculate Angles (Smoothed)
    const rawLeft = this.calculateAngle(lSh, lEl, lWr);
    const rawRight = this.calculateAngle(rSh, rEl, rWr);
    
    const angleL = this.emaElbowL.update(rawLeft);
    const angleR = this.emaElbowR.update(rawRight);
    
    const minAngle = Math.min(angleL, angleR);

    // 3. Height Check (Lift)
    // بدل شرط الأنف، بنشوف هل المعصم أعلى من الكتف بمسافة محترمة؟
    // Y بيقل لما نطلع لفوق
    const shoulderY = (lSh.y + rSh.y) / 2;
    const wristY = (lWr.y + rWr.y) / 2;
    // المسافة 0.2 تعني إن الايد طلعت فوق الكتف بوضوح
    const isClearlyOverhead = wristY < (shoulderY - 0.2); 

    // 4. Synchronization
    const angleDiff = Math.abs(angleL - angleR);
    if (this.stage === 'up' && angleDiff > this.ANGLES.SYNC_TOLERANCE) {
      return this.createResult('ERR_ARMS_UNSYNC', false);
    }

    // =========================================================
    // STATE MACHINE
    // =========================================================

    // --- CASE 1: GOING UP (Top Position) ---
    // الشرط: زاوية 150 + الايدين عالين عن الكتف
    if (minAngle > this.ANGLES.TOP_THRESHOLD && isClearlyOverhead) {
      
      if (this.topStableStart === 0) this.topStableStart = now;

      // Stability Check
      if (now - this.topStableStart > this.TIME.STABILITY_WINDOW) {
        if (this.stage === 'down') {
          this.stage = 'up';
          this.feedbackCode = 'PERFECT_LOCKOUT';
        }
      }
      this.bottomStableStart = 0;

    } 
    // --- CASE 2: GOING DOWN (Bottom Position) ---
    else if (minAngle < this.ANGLES.BOTTOM_THRESHOLD) {
       
       if (this.bottomStableStart === 0) this.bottomStableStart = now;

       if (now - this.bottomStableStart > this.TIME.STABILITY_WINDOW) {
         if (this.stage === 'up') {
            // ✅ Finish Rep Logic
            
            // Speed check
            if (now - this.lastRepTime < this.TIME.MIN_REP_TIME && this.reps > 0) {
                this.feedbackCode = 'LOWER_SLOWLY'; 
            } else {
                this.reps++;
                this.feedbackCode = 'REP_SUCCESS'; // Voice logic will handle counting
                this.lastRepTime = now;
            }
            this.stage = 'down';
         } else {
            // Ready for next rep
            this.feedbackCode = 'PUSH_UP'; 
         }
       }
       this.topStableStart = 0;
    } 
    // --- CASE 3: TRANSITION ---
    else {
      this.topStableStart = 0;
      this.bottomStableStart = 0;

      if (this.stage === 'down') {
        // Trying to go up
        if (minAngle > this.ANGLES.TOP_WARNING) {
           // Almost there (e.g. 140 degrees)
           this.feedbackCode = 'CMD_PUSH_HIGHER'; 
        } else {
           this.feedbackCode = 'PUSH_UP';
        }
      } else {
        // Going down
        this.feedbackCode = 'LOWER_SLOWLY';
      }
    }

    // Safety: Back Arch Check (Smart)
    // لو الكتاف قريبة من بعض أفقياً، يبقى ده وضع جانبي (Side View)
    // غير كده بنعتبره أمامي (Front View) وبنتجاهل فحص الظهر عشان ميغلطش
    const shoulderWidth = Math.abs(lSh.x - rSh.x);
    const isFrontView = shoulderWidth > 0.15; // لو عريض يبقى باصص للكاميرا

    if (!isFrontView && lHip && rHip && ((lHip.visibility || 0) > 0.5 && (rHip.visibility || 0) > 0.5)) {
        // فحص الظهر فقط لو باصص بجنبه
        const lean = Math.abs(((lSh.x + rSh.x)/2) - ((lHip.x + rHip.x)/2));
        // سمحنا بميلان أكتر (0.25) عشان ميرخمش
        if (lean > 0.25) { 
            return this.createResult('ERR_ARCHED_BACK', false);
        }
    }

    // Final result
    this.isCorrect = !this.feedbackCode.startsWith('ERR');
    return this.createResult(this.feedbackCode, this.isCorrect);
  }

  // --- Helpers ---

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  private checkVisibility(lms: Landmark[]): boolean {
    return lms.every(lm => !!lm && ((lm.visibility || 0) > 0.5));
  }

  private createResult(feedback: string, isCorrect: boolean): OverheadPressResult {
    return {
      exercise: 'standing_overhead_press',
      reps: this.reps,
      stage: this.stage,
      feedback_code: feedback,
      is_correct: isCorrect,
    };
  }

  reset() {
    this.reps = 0;
    this.stage = 'down';
    this.feedbackCode = 'SETUP_POSITION';
    this.emaElbowL.reset();
    this.emaElbowR.reset();
  }
}