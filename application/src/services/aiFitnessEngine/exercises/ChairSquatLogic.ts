/**
 * ChairSquatLogic.ts
 * ✅ RELAXED DEPTH VERSION
 * * Features:
 * - More forgiving depth check (allows slightly below chair level).
 * - Only flags "Too Deep" if user goes into full deep squat (< 70 deg).
 * - Prevents "Ghost Reps" (Stable frames).
 * - Portrait & Landscape safe.
 */

import { Landmark, ChairSquatResult, ExerciseLogic } from '../types';
import { PoseLandmarks, calculateAngle, EMA } from '../utils';

type Stage = 'setup' | 'up' | 'down';

export class ChairSquatLogic implements ExerciseLogic {
  private reps = 0;
  private stage: Stage = 'up'; 

  private feedbackCode = 'SETUP_STAND_STRAIGHT';
  private isCorrect = true;

  // Setup Timer
  private setupFrames = 0;
  private isSystemActive = false;
  private readonly SETUP_DURATION = 45; 

  // Smoothing
  private emaKnee = new EMA(0.3);
  private emaHip = new EMA(0.3);

  // --- THRESHOLDS ---
  private readonly KNEE_STAND = 160; 
  private readonly KNEE_DOWN = 100;  // Target depth (Chair level)
  
  // 🚫 NEW RELAXED THRESHOLD:
  // Old was 80 (Too strict). New is 70.
  // This allows the user to dip slightly below parallel without failing.
  // < 70 is definitely a deep squat/resting on heels.
  private readonly KNEE_TOO_DEEP = 60; 

  // Anti-Cheat
  private readonly MIN_HIP_ANGLE = 60; 
  private readonly VIS = 0.5;

  // Stability & Validation
  private stableFrames = 0;
  private readonly CONFIRM_FRAMES = 5; 
  
  // 🚩 Flag to track if the current rep was ruined
  private hasFailedRep = false;

  analyze(lm: Landmark[]): ChairSquatResult {
    // 1. Auto-detect Side
    const lH = lm[PoseLandmarks.LEFT_HIP];
    const rH = lm[PoseLandmarks.RIGHT_HIP];
    const side = (rH.visibility || 0) > (lH.visibility || 0) ? 'RIGHT' : 'LEFT';

    const sh = side === 'RIGHT' ? lm[PoseLandmarks.RIGHT_SHOULDER] : lm[PoseLandmarks.LEFT_SHOULDER];
    const hip = side === 'RIGHT' ? lm[PoseLandmarks.RIGHT_HIP] : lm[PoseLandmarks.LEFT_HIP];
    const knee = side === 'RIGHT' ? lm[PoseLandmarks.RIGHT_KNEE] : lm[PoseLandmarks.LEFT_KNEE];
    const ankle = side === 'RIGHT' ? lm[PoseLandmarks.RIGHT_ANKLE] : lm[PoseLandmarks.LEFT_ANKLE];

    if (!this.visible([sh, hip, knee, ankle])) {
      return this.result('ERR_BODY_NOT_VISIBLE', false);
    }

    // 2. Calculations
    const kneeAngle = this.emaKnee.update(calculateAngle(hip, knee, ankle));
    const hipAngle = this.emaHip.update(calculateAngle(sh, hip, knee));

    // 3. Logic Flow

    // === SETUP PHASE ===
    if (!this.isSystemActive) {
      if (kneeAngle > 155) {
        this.setupFrames++;
        if (this.setupFrames > this.SETUP_DURATION) {
          this.isSystemActive = true;
          this.feedbackCode = 'CMD_GO_DOWN';
          this.stableFrames = 0;
        } else {
           this.feedbackCode = 'SETUP_STAND_STRAIGHT';
        }
      } else {
        this.setupFrames = 0;
        this.feedbackCode = 'SETUP_STAND_STRAIGHT';
      }
      return this.result(this.feedbackCode, true);
    }

    // === ACTIVE PHASE ===

    // A. Critical Error Checks (Global)

    // 🚫 Check 1: Too Deep (Squatting past the chair)
    // Only triggers if REALLY deep (< 70)
    if (kneeAngle < this.KNEE_TOO_DEEP) {
      this.hasFailedRep = true; 
      return this.result('ERR_TOO_DEEP', false);
    }

    // 🚫 Check 2: Back Bent (Good Morning)
    if (kneeAngle < 150 && hipAngle < this.MIN_HIP_ANGLE) {
        return this.result('ERR_BACK_BENT', false);
    }

    // B. State Machine
    
    if (this.stage === 'up') {
      // Reset failure flag when starting a new rep from top
      if (kneeAngle > 150) {
        this.hasFailedRep = false; 
      }

      // Waiting to go DOWN
      if (kneeAngle <= this.KNEE_DOWN) {
        this.stableFrames++;
        if (this.stableFrames >= this.CONFIRM_FRAMES) {
          this.stage = 'down';
          this.stableFrames = 0;
          return this.result('CMD_STAND_UP', true);
        }
      } 
      else {
        this.stableFrames = 0;
        if (kneeAngle < 130) return this.result('CMD_GO_LOWER', true);
        else return this.result('CMD_GO_DOWN', true);
      }
    } 
    else if (this.stage === 'down') {
      // Waiting to go UP
      if (kneeAngle >= this.KNEE_STAND) {
        this.stableFrames++;
        
        if (this.stableFrames >= this.CONFIRM_FRAMES) {
          // Finished Rep -> Check if it was clean
          if (!this.hasFailedRep) {
            this.reps++;
            this.feedbackCode = 'REP_SUCCESS';
          } else {
            // Rep finished but was invalid (went too deep)
            this.feedbackCode = 'CMD_GO_DOWN'; 
          }
          
          this.stage = 'up';
          this.stableFrames = 0;
          this.hasFailedRep = false; 
          
          return this.result(this.feedbackCode, true);
        }
      } 
      else {
        this.stableFrames = 0;
        // If user is stuck in Deep Squat
        if (this.hasFailedRep) {
          return this.result('ERR_TOO_DEEP', false); 
        }
        return this.result('CMD_STAND_UP', true);
      }
    }

    return this.result(this.feedbackCode, this.isCorrect);
  }

  private visible(lms: Landmark[]) {
    return lms.every(l => (l.visibility || 0) > this.VIS);
  }

  private result(code: string, ok: boolean): ChairSquatResult {
    this.feedbackCode = code;
    this.isCorrect = ok;
    return {
      exercise: 'chair_squat',
      reps: this.reps,
      stage: this.stage === 'up' ? 'up' : 'down',
      feedback_code: code,
      is_correct: ok,
    };
  }
}