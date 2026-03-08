import { Landmark, FrontRaisesResult, ExerciseLogic } from '../types';
import { PoseLandmarks } from '../utils';

// ============================================================================
// 1. Helper Class: EMA (Exponential Moving Average for Smoothing)
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
// 2. Front Raises Logic Class (Strict Symmetrical Form)
// ============================================================================
export class FrontRaisesLogic implements ExerciseLogic {
  // --- Counters & State ---
  private counter: number = 0;
  private feedbackCode: string = 'CMD_RAISE_FRONT';
  private stage: 'up' | 'down' | 'unknown' = 'down';

  // --- The Lock System (Prevents Double Counting) ---
  // true = Rep already counted, must lower arms to unlock
  // false = Unlocked, ready to count next rep
  private repLocked: boolean = false;

  // --- Smoothing Tools ---
  // Separate EMA for each arm to maintain independent smoothing
  private emaLiftL = new EMA(0.3);
  private emaLiftR = new EMA(0.3);
  private emaLeftElbow = new EMA(0.3);
  private emaRightElbow = new EMA(0.3);

  // --- Last Feedback Tracking (for throttling if needed) ---
  private lastFeedbackTime: number = 0;
  private readonly FEEDBACK_COOLDOWN_MS = 500;

  // =========================================================
  // ⚙️ Strict Constants
  // =========================================================

  // Form Requirements
  private readonly ELBOW_MIN_ANGLE = 145; // Must be nearly straight
  
  // Height Thresholds (Angles relative to torso)
  private readonly ANGLE_START_RESET = 25;  // Arms must lower here to unlock
  private readonly ANGLE_GUIDANCE_START = 45; // Start checking form
  private readonly ANGLE_TARGET_MIN = 80;   // Shoulder level (minimum to count)
  private readonly ANGLE_TARGET_MAX = 115;  // Eye level (maximum safe height)
  
  // Symmetry Requirements
  private readonly SYNC_TOLERANCE = 20; // Max allowed difference between arms

  // =========================================================
  // Private Helper Methods
  // =========================================================

  /**
   * Calculates the angle (in degrees) between three points.
   * Returns the smaller angle (0-180 degrees).
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
   * Returns 0 if landmark is undefined or visibility is not set.
   */
  private getVisibility(lm: Landmark | undefined): number {
    if (!lm) return 0;
    return typeof lm.visibility === 'number' ? lm.visibility : 0;
  }

  /**
   * Validates that all required landmarks are sufficiently visible.
   * Checks shoulders, elbows, and wrists for both arms.
   */
  private checkVisibility(landmarks: Landmark[]): boolean {
    const requiredIndices = [
      PoseLandmarks.LEFT_SHOULDER,
      PoseLandmarks.RIGHT_SHOULDER,
      PoseLandmarks.LEFT_ELBOW,
      PoseLandmarks.RIGHT_ELBOW,
      PoseLandmarks.LEFT_WRIST,
      PoseLandmarks.RIGHT_WRIST,
      PoseLandmarks.LEFT_HIP,
      PoseLandmarks.RIGHT_HIP,
    ];

    return requiredIndices.every(
      (idx) => this.getVisibility(landmarks[idx]) > 0.6
    );
  }

  /**
   * Determines if we should throttle feedback to avoid UI spam.
   */
  private shouldThrottleFeedback(now: number): boolean {
    return now - this.lastFeedbackTime < this.FEEDBACK_COOLDOWN_MS;
  }

  /**
   * Updates feedback code with throttling check.
   * Returns true if feedback was updated, false if throttled.
   */
  private updateFeedback(code: string, now: number, force: boolean = false): boolean {
    if (!force && this.shouldThrottleFeedback(now)) {
      return false;
    }
    this.feedbackCode = code;
    this.lastFeedbackTime = now;
    return true;
  }

  /**
   * Builds the result object with current state.
   */
  private createResult(): FrontRaisesResult {
    return {
      exercise: 'front_raises',
      reps: this.counter,
      stage: this.stage,
      feedback_code: this.feedbackCode,
      is_correct: true,
    };
  }

  // =========================================================
  // Public API
  // =========================================================

  /**
   * Main analysis entry point.
   * Processes MediaPipe landmarks and determines front raise state, reps, and feedback.
   */
  analyze(landmarks: Landmark[]): FrontRaisesResult {
    const now = Date.now();

    // 1. Visibility Check
    if (!this.checkVisibility(landmarks)) {
      this.feedbackCode = 'ERR_BODY_NOT_VISIBLE';
      return this.createResult();
    }

    // 2. Extract Points
    const lSh = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rSh = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lElbow = landmarks[PoseLandmarks.LEFT_ELBOW];
    const rElbow = landmarks[PoseLandmarks.RIGHT_ELBOW];
    const lWr = landmarks[PoseLandmarks.LEFT_WRIST];
    const rWr = landmarks[PoseLandmarks.RIGHT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];

    // 3. Calculate Raw Angles
    
    // A. Shoulder Flexion (Lift Angles)
    // Measured between Hip-Shoulder-Elbow to track arm elevation
    const lLiftRaw = this.calculateAngle(lHip, lSh, lElbow);
    const rLiftRaw = this.calculateAngle(rHip, rSh, rElbow);
    
    // B. Elbow Straightness
    // Measured between Shoulder-Elbow-Wrist
    const lElbowRaw = this.calculateAngle(lSh, lElbow, lWr);
    const rElbowRaw = this.calculateAngle(rSh, rElbow, rWr);

    // 4. Apply Smoothing (EMA)
    const lLift = this.emaLiftL.update(lLiftRaw);
    const rLift = this.emaLiftR.update(rLiftRaw);
    const lElbowSmoothed = this.emaLeftElbow.update(lElbowRaw);
    const rElbowSmoothed = this.emaRightElbow.update(rElbowRaw);

    // 5. Calculate Derived Metrics
    const avgLift = (lLift + rLift) / 2;
    const minElbow = Math.min(lElbowSmoothed, rElbowSmoothed);
    const armDiff = Math.abs(lLift - rLift);

    // =========================================================
    // 🧠 LOGIC FLOW (Priority Order - Strict to Lenient)
    // =========================================================

    // Priority 1: Elbow Form (Fatal Error)
    // Arms must be straight throughout the movement
    if (minElbow < this.ELBOW_MIN_ANGLE) {
      this.feedbackCode = 'STRAIGHTEN_ARMS';
      // Even if they're in the success zone, don't count if elbows are bent
      return this.createResult();
    }

    // Priority 2: Sync Check (Symmetry Error)
    // Only check when arms are actually lifting (above guidance threshold)
    if (armDiff > this.SYNC_TOLERANCE && avgLift > this.ANGLE_GUIDANCE_START) {
      this.feedbackCode = 'ERR_SWINGING';
      return this.createResult();
    }

    // Priority 3: Height Safety (Too High)
    // Prevent shoulder impingement
    if (avgLift > this.ANGLE_TARGET_MAX) {
      this.feedbackCode = 'ERR_TOO_HIGH';
      return this.createResult();
    }

    // =========================================================
    // 🔒 The Lock & Key Counting Mechanism
    // =========================================================

    // Phase A: RESET / UNLOCK (Arms fully lowered)
    // User must return to starting position to enable next rep
    if (avgLift < this.ANGLE_START_RESET) {
      this.repLocked = false; // 🔓 UNLOCK: Ready for next rep
      this.stage = 'down';
      this.feedbackCode = 'CMD_RAISE_FRONT';
      return this.createResult();
    }

    // Phase B: GUIDANCE (Ascending but not at target)
    // Arms are lifting but haven't reached minimum height yet
    if (avgLift >= this.ANGLE_GUIDANCE_START && avgLift < this.ANGLE_TARGET_MIN) {
      this.stage = 'up';
      
      // Only give guidance if we're not locked and not throttled
      if (!this.repLocked) {
        this.updateFeedback('RAISE_YOUR_ARM', now);
      } else {
        // Coming back down through this zone
        this.feedbackCode = 'CMD_LOWER_SLOWLY';
      }
      return this.createResult();
    }

    // Phase C: SUCCESS ZONE (Target Height Reached)
    // Arms are at shoulder to eye level (85° - 115°)
    if (avgLift >= this.ANGLE_TARGET_MIN && avgLift <= this.ANGLE_TARGET_MAX) {
      this.stage = 'up';

      if (!this.repLocked) {
        // ✅ SUCCESS: All conditions met, count the rep!
        this.counter++;
        this.repLocked = true; // 🔒 LOCK: Prevent double counting
        
        // Immediate feedback with rep number
        this.feedbackCode = `COUNT_${this.counter}`;
        this.lastFeedbackTime = now;
      } else {
        // Already counted this rep, encourage hold/lower
        this.feedbackCode = 'HOLD_POSITION';
      }
      return this.createResult();
    }

    // Phase D: Between Reset and Guidance (Transition zone: 25° - 45°)
    // Arms are moving but not yet in active range
    this.stage = 'up';
    if (!this.repLocked) {
      this.feedbackCode = 'CONTINUE_RAISING';
    } else {
      this.feedbackCode = 'CMD_LOWER_SLOWLY';
    }

    return this.createResult();
  }

  /**
   * Resets all counters and state to initial values.
   * Call this when starting a new set or resetting the exercise.
   */
  reset(): void {
    this.counter = 0;
    this.repLocked = false;
    this.feedbackCode = 'CMD_RAISE_FRONT';
    this.stage = 'down';
    this.lastFeedbackTime = 0;

    // Reset all EMA filters
    this.emaLiftL.reset();
    this.emaLiftR.reset();
    this.emaLeftElbow.reset();
    this.emaRightElbow.reset();
  }

  /**
   * Returns current rep count without processing frames.
   * Useful for UI display or testing.
   */
  getRepCount(): number {
    return this.counter;
  }

  /**
   * Returns whether a rep is currently locked (in 'up' position).
   * Useful for UI state indicators.
   */
  isRepLocked(): boolean {
    return this.repLocked;
  }
}