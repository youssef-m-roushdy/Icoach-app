import { Landmark, SquatResult } from '../types';

// ============================================================================
// 1) Helper Class: EMA (Exponential Moving Average for Smoothing)
// ============================================================================
class EMA {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }

  update(x: number): number {
    if (this.value === null) {
      this.value = x;
    } else {
      this.value = this.alpha * x + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

// ============================================================================
// 2) Squat Logic Class (Strict Lock System with Anti-Cheat)
// ============================================================================
export class SquatLogic {
  // --- Counters & State ---
  private counter: number = 0;
  private feedbackCode: string = 'STEP_BACK';
  private stage: 'up' | 'down' | 'unknown' = 'unknown';

  // --- The Lock System (Crucial for Anti-Cheat) ---
  // true = Rep already counted, must stand up to unlock
  // false = Unlocked, ready to count next rep
  private repLocked: boolean = false;

  // --- System Activation ---
  private isSystemActive: boolean = false;
  private standStableStart: number | null = null;

  // --- Feedback Throttling ---
  private lastFeedbackTime: number = 0;
  private lastFixLowerHipsTime: number = 0; // Separate tracker for guidance feedback

  // --- Smoothing ---
  private emaLeftKnee = new EMA(0.3);
  private emaRightKnee = new EMA(0.3);

  // --- Constants (Strict Rules) ---
  private readonly STAND_STABLE_MS = 600;
  private readonly FEEDBACK_COOLDOWN_MS = 1000;

  // Angle thresholds
  private readonly ANGLE_STAND_THRESHOLD = 160; // Must stand straight to unlock
  private readonly ANGLE_SQUAT_DEPTH = 85;      // Must squat deep to count
  private readonly ANGLE_WARNING_ZONE = 130;    // Guidance zone upper bound

  // --- MediaPipe Pose Landmarks Indices ---
  private readonly IDX = {
    NOSE: 0,
    L_HIP: 23,
    R_HIP: 24,
    L_KNEE: 25,
    R_KNEE: 26,
    L_ANKLE: 27,
    R_ANKLE: 28,
  };

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Calculates the angle (in degrees) between three points.
   * Points are expected to have x, y coordinates.
   */
  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) -
      Math.atan2(a.y - b.y, a.x - b.x);
    
    let angle = Math.abs((radians * 180.0) / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  }

  /**
   * Safely extracts visibility value from a landmark.
   * Defaults to 1 (fully visible) if visibility is not defined.
   */
  private getVis(lm: Landmark | undefined): number {
    if (!lm) return 0;
    return typeof lm.visibility === 'number' ? lm.visibility : 1;
  }

  /**
   * Checks if all required body parts (hips, knees, ankles) are sufficiently visible.
   */
  private checkVisibility(landmarks: Landmark[]): boolean {
    const visThreshold = 0.6;
    const requiredIndices = [
      this.IDX.L_HIP,
      this.IDX.R_HIP,
      this.IDX.L_KNEE,
      this.IDX.R_KNEE,
      this.IDX.L_ANKLE,
      this.IDX.R_ANKLE,
    ];

    return requiredIndices.every((idx) => this.getVis(landmarks[idx]) > visThreshold);
  }

  /**
   * Determines the smoothed knee angle using EMA on both legs.
   */
  private getSmoothedKneeAngle(landmarks: Landmark[]): number {
    const lHip = landmarks[this.IDX.L_HIP];
    const rHip = landmarks[this.IDX.R_HIP];
    const lKnee = landmarks[this.IDX.L_KNEE];
    const rKnee = landmarks[this.IDX.R_KNEE];
    const lAnk = landmarks[this.IDX.L_ANKLE];
    const rAnk = landmarks[this.IDX.R_ANKLE];

    // Calculate raw angles
    const rawAngleL = this.calculateAngle(lHip, lKnee, lAnk);
    const rawAngleR = this.calculateAngle(rHip, rKnee, rAnk);

    // Apply smoothing
    const smoothAngleL = this.emaLeftKnee.update(rawAngleL);
    const smoothAngleR = this.emaRightKnee.update(rawAngleR);

    // Return average of both knees
    return (smoothAngleL + smoothAngleR) / 2;
  }

  /**
   * Builds the result object with current state.
   */
  private buildResult(): SquatResult {
    return {
      exercise: 'squat',
      reps: this.counter,
      stage: this.stage,
      feedback_code: this.feedbackCode,
      is_correct: true,
      is_system_active: this.isSystemActive,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Main analysis entry point.
   * Processes MediaPipe landmarks and determines squat state, reps, and feedback.
   */
  analyze(landmarks: Landmark[]): SquatResult {
    const now = Date.now();

    // Step 1: Visibility Check
    if (!this.checkVisibility(landmarks)) {
      this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
      this.standStableStart = null;
      this.stage = 'unknown';
      return this.buildResult();
    }

    // Step 2: Calculate smoothed knee angle
    const kneeAngle = this.getSmoothedKneeAngle(landmarks);

    // ==========================================
    // Setup Phase (System Calibration)
    // ==========================================
    if (!this.isSystemActive) {
      if (kneeAngle >= this.ANGLE_STAND_THRESHOLD) {
        // User is standing straight, start/continue stability timer
        if (this.standStableStart === null) {
          this.standStableStart = now;
        }

        const elapsed = now - this.standStableStart;
        
        if (elapsed >= this.STAND_STABLE_MS) {
          // Activation successful!
          this.isSystemActive = true;
          this.feedbackCode = 'SYSTEM_READY_GO';
          this.repLocked = false; // Ensure unlocked on start
          this.stage = 'up';
        } else {
          // Still waiting for stability
          this.feedbackCode = 'SETUP_STAND_STILL';
        }
      } else {
        // Not standing straight, reset timer
        this.standStableStart = null;
        this.feedbackCode = 'SETUP_STAND_STRAIGHT';
      }

      return this.buildResult();
    }

    // ==========================================
    // Active Exercise Logic (The Lock Mechanism)
    // ==========================================

    // --- State 1: Standing Straight (Unlock / Reset) ---
    if (kneeAngle >= this.ANGLE_STAND_THRESHOLD) {
      this.repLocked = false; // 🔓 UNLOCK: Ready for next rep
      this.stage = 'up';
      this.feedbackCode = 'CMD_GO_DOWN';
    }

    // --- State 2: Deep Squat (Count / Lock) ---
    else if (kneeAngle <= this.ANGLE_SQUAT_DEPTH) {
      this.stage = 'down';

      if (!this.repLocked) {
        // 🎉 New Rep Counted!
        this.counter++;
        this.repLocked = true; // 🔒 LOCK: Prevent double counting
        this.feedbackCode = `REP_NUMBER_${this.counter}`;
        
        // Log the rep number feedback time separately if needed
        this.lastFeedbackTime = now;
      } else {
        // Already counted this rep, encourage going up
        this.feedbackCode = 'CMD_GO_UP';
      }
    }

    // --- State 3: Descending / Guidance Zone ---
    else if (kneeAngle < this.ANGLE_WARNING_ZONE && kneeAngle > this.ANGLE_SQUAT_DEPTH) {
      // User is in the "warning zone" - not deep enough yet
      this.stage = 'down';

      if (!this.repLocked) {
        // Only give guidance feedback once per cooldown to avoid spam
        if (now - this.lastFixLowerHipsTime > this.FEEDBACK_COOLDOWN_MS) {
          this.feedbackCode = 'FIX_LOWER_HIPS'; // "Go Deeper"
          this.lastFixLowerHipsTime = now;
        }
        // Else: Keep previous feedback code to avoid UI flicker
      } else {
        // Coming back up but still in zone
        this.feedbackCode = 'CMD_GO_UP';
      }
    }

    // --- State 4: Between Warning and Standing (Transition Zone) ---
    else {
      // Angle is between 130 and 160 degrees
      // This is the "up" phase but not fully standing yet
      
      if (this.repLocked) {
        this.stage = 'up';
        this.feedbackCode = 'CMD_GO_UP'; // Encourage full extension
      } else {
        // Unlocked but not fully standing - edge case
        this.stage = 'up';
        this.feedbackCode = 'CMD_GO_DOWN';
      }
    }

    return this.buildResult();
  }

  /**
   * Resets all counters and state to initial values.
   * Call this when starting a new set or resetting the exercise.
   */
  reset(): void {
    this.counter = 0;
    this.feedbackCode = 'STEP_BACK';
    this.stage = 'unknown';
    
    // Lock system reset
    this.repLocked = false;
    
    // System activation reset
    this.isSystemActive = false;
    this.standStableStart = null;
    
    // Feedback timers reset
    this.lastFeedbackTime = 0;
    this.lastFixLowerHipsTime = 0;
    
    // Smoothing filters reset
    this.emaLeftKnee.reset();
    this.emaRightKnee.reset();
  }

  /**
   * Returns current rep count without processing frames.
   * Useful for UI display.
   */
  getRepCount(): number {
    return this.counter;
  }

  /**
   * Returns whether the system is currently active (past setup phase).
   */
  isActive(): boolean {
    return this.isSystemActive;
  }
}