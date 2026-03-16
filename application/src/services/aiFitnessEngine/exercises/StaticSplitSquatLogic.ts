import {
  Landmark,
  StaticSplitSquatResult,
  ExerciseLogic,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';
import { PoseLandmarks, calculateAngle, EMA } from '../utils';

type Stage = 'setup' | 'up' | 'down';

export class StaticSplitSquatLogic implements ExerciseLogic {
  private reps = 0;
  private stage: Stage = 'setup';

  private feedbackCode: FeedbackSignal = 'SETUP_SPLIT_STANCE';
  private isCorrect = true;

  // ---- Feedback Debounce State ----
  private candidateCode: FeedbackSignal = 'SETUP_SPLIT_STANCE';
  private candidateOk = true;
  private candidateFrames = 0;

  private readonly FEEDBACK_DELAY_OK = 5;
  private readonly FEEDBACK_DELAY_BAD = 15;

  // ---- Stance ----
  private isStanceLocked = false;
  private refLeft = { x: 0, z: 0 };
  private refRight = { x: 0, z: 0 };

  // ---- Stability / debounce ----
  private stableFrames = 0;
  private setupStableFrames = 0;
  private stanceLostFrames = 0;

  private readonly CONFIRM_FRAMES = 4;
  private readonly SETUP_CONFIRM_FRAMES = 10;
  private readonly STANCE_LOST_FRAMES = 3;

  // ---- Knee thresholds ----
  private readonly KNEE_UP = 154;
  private readonly KNEE_DOWN = 85;
  private readonly MIN_ROM_DEG = 45;

  private readonly LOWER_HINT_RATIO = 0.60;

  // ---- Stance thresholds ----
  private readonly SPLIT_RATIO_LOCK = 0.90;
  private readonly SPLIT_RATIO_RESET = 0.70;

  /**
   * ✅ NEW:
   * لازم يكون فيه فرق "قدّام/ورا" واضح بين الرجلين
   * relative to hip width
   *
   * تقريبًا بيمثل إن رجل تكون سابقة التانية بوضوح،
   * مش مجرد فتحة جانبية زي السكوات.
   */
  private readonly FRONT_BACK_RATIO_LOCK = 0.28;
  private readonly FRONT_BACK_RATIO_RESET = 0.20;

  // ---- Feet movement ----
  private readonly FOOT_MOVE_TOL_RATIO = 0.40;
  private readonly FOOT_WARN_COOLDOWN_FRAMES = 15;
  private footWarnCooldown = 0;
  private pendingFeetWarn = false;

  // ---- Smoothing ----
  private emaActiveKnee = new EMA(0.35);

  private topAngleRef = 165;
  private topAngleFrames = 0;

  reset(): void {
    this.reps = 0;
    this.stage = 'setup';

    this.feedbackCode = 'SETUP_SPLIT_STANCE';
    this.isCorrect = true;

    this.candidateCode = 'SETUP_SPLIT_STANCE';
    this.candidateOk = true;
    this.candidateFrames = 0;

    this.isStanceLocked = false;
    this.refLeft = { x: 0, z: 0 };
    this.refRight = { x: 0, z: 0 };

    this.stableFrames = 0;
    this.setupStableFrames = 0;
    this.stanceLostFrames = 0;

    this.footWarnCooldown = 0;
    this.pendingFeetWarn = false;

    this.topAngleRef = 165;
    this.topAngleFrames = 0;

    this.emaActiveKnee.reset();
  }

  analyze(
    lm: Landmark[],
    _context?: ExerciseAnalysisContext
  ): StaticSplitSquatResult {
    const lH = lm[PoseLandmarks.LEFT_HIP];
    const rH = lm[PoseLandmarks.RIGHT_HIP];
    const lK = lm[PoseLandmarks.LEFT_KNEE];
    const rK = lm[PoseLandmarks.RIGHT_KNEE];
    const lA = lm[PoseLandmarks.LEFT_ANKLE];
    const rA = lm[PoseLandmarks.RIGHT_ANKLE];

    // 1) Visibility & Frame Edge Check
    if (!this.isVisibleAndCentered([lH, rH, lK, rK, lA, rA])) {
      if (this.isStanceLocked) {
        this.isStanceLocked = false;
        this.stage = 'setup';
      }
      return this.emit('ERR_BODY_NOT_VISIBLE', false, true);
    }

    // 2) Scales (relative)
    const hipWidth = Math.max(Math.abs(lH.x - rH.x), 0.08);

    // 3) Split measures
    const dx = Math.abs(lA.x - rA.x);
    const dz = Math.abs((lA.z ?? 0) - (rA.z ?? 0));

    // Old overall split score
    const splitScore = Math.sqrt(dx * dx + (dz * 0.4) * (dz * 0.4));
    const splitRatio = splitScore / hipWidth;

    // ✅ NEW: front/back requirement
    const frontBackRatio = dz / hipWidth;

    // رجل قدام ورجل ورا فعلًا؟
    const hasRealSplitStance =
      splitRatio >= this.SPLIT_RATIO_LOCK &&
      frontBackRatio >= this.FRONT_BACK_RATIO_LOCK;

    // فقدان وضع split الحقيقي
    const lostRealSplitStance =
      splitRatio < this.SPLIT_RATIO_RESET ||
      frontBackRatio < this.FRONT_BACK_RATIO_RESET;

    // 4) Angles
    const lAng = calculateAngle(lH, lK, lA);
    const rAng = calculateAngle(rH, rK, rA);
    const rawActiveAngle = Math.min(lAng, rAng);
    const activeAngle = this.emaActiveKnee.update(rawActiveAngle);

    // ---------------- CRITICAL CHECK: Not really split anymore ----------------
    if (this.isStanceLocked && lostRealSplitStance) {
      this.stanceLostFrames++;
      if (this.stanceLostFrames >= this.STANCE_LOST_FRAMES) {
        this.isStanceLocked = false;
        this.stage = 'setup';
        this.stableFrames = 0;
        this.depthStableFramesReset();
        this.stanceLostFrames = 0;
        return this.emit('ERR_STEP_FURTHER_BACK', false, true);
      }
    } else {
      this.stanceLostFrames = 0;
    }

    // ---------------- SETUP / LOCK ----------------
    if (!this.isStanceLocked) {
      if (hasRealSplitStance) {
        this.setupStableFrames++;
        if (this.setupStableFrames >= this.SETUP_CONFIRM_FRAMES) {
          this.isStanceLocked = true;
          this.stage = 'up';
          this.stableFrames = 0;
          this.stanceLostFrames = 0;

          this.refLeft = { x: lA.x, z: lA.z ?? 0 };
          this.refRight = { x: rA.x, z: rA.z ?? 0 };
          this.topAngleRef = Math.max(150, Math.min(175, activeAngle));
          this.topAngleFrames = 0;

          return this.emit('CMD_GO_DOWN', true, true);
        }
        return this.emit('SETUP_SPLIT_STANCE', true);
      } else {
        this.setupStableFrames = 0;

        // ✅ لو فيه فتح جانبي لكن مفيش رجل قدام/ورا → قول له رجع رجل لورا
        if (splitRatio >= this.SPLIT_RATIO_RESET && frontBackRatio < this.FRONT_BACK_RATIO_LOCK) {
          return this.emit('ERR_STEP_FURTHER_BACK', false, true);
        }

        return this.emit('SETUP_SPLIT_STANCE', true);
      }
    }

    // --------------- Feet movement warning ---------------
    const footTol = hipWidth * this.FOOT_MOVE_TOL_RATIO;
    const leftMove = Math.sqrt(Math.pow(lA.x - this.refLeft.x, 2));
    const rightMove = Math.sqrt(Math.pow(rA.x - this.refRight.x, 2));

    if (this.footWarnCooldown > 0) this.footWarnCooldown--;

    if ((leftMove > footTol || rightMove > footTol) && this.footWarnCooldown === 0) {
      this.footWarnCooldown = this.FOOT_WARN_COOLDOWN_FRAMES;
      this.pendingFeetWarn = true;
    }

    // --------------- Update top reference ---------------
    if (this.stage === 'up') {
      if (activeAngle > this.topAngleRef) {
        this.topAngleRef = Math.min(175, activeAngle);
      } else if (activeAngle >= this.KNEE_UP - 3) {
        this.topAngleFrames++;
        if (this.topAngleFrames > 10) {
          this.topAngleRef = Math.max(this.topAngleRef, activeAngle);
        }
      }
    } else {
      this.topAngleFrames = 0;
    }

    // --------------- REP LOGIC ---------------
    const romDelta = this.topAngleRef - activeAngle;
    const downOk = (activeAngle <= this.KNEE_DOWN) && (romDelta >= this.MIN_ROM_DEG);
    const upOk = (activeAngle >= this.KNEE_UP) || (activeAngle >= (this.topAngleRef - 4));

    if (this.stage === 'up') {
      if (downOk) {
        this.stableFrames++;
        if (this.stableFrames >= this.CONFIRM_FRAMES) {
          this.stage = 'down';
          this.stableFrames = 0;
          return this.emit('CMD_STAND_UP', true, true);
        }
        return this.emit('HOLD_BOTTOM', true);
      }

      this.stableFrames = 0;
      const lowerHintThreshold = this.MIN_ROM_DEG * this.LOWER_HINT_RATIO;

      if (romDelta < lowerHintThreshold) {
        return this.emit(this.pickFeetWarnOr('CMD_GO_DOWN', true));
      }
      if (!downOk) {
        return this.emit(this.pickFeetWarnOr('CMD_GO_LOWER', true));
      }
      return this.emit(this.pickFeetWarnOr('CMD_GO_DOWN', true));
    }

    if (this.stage === 'down') {
      // ✅ قبل ما نعد لازم نتأكد إن وضع split الحقيقي لسه موجود
      if (!hasRealSplitStance) {
        this.isStanceLocked = false;
        this.stage = 'setup';
        this.stableFrames = 0;
        this.depthStableFramesReset();
        return this.emit('ERR_STEP_FURTHER_BACK', false, true);
      }

      if (upOk) {
        this.stableFrames++;
        if (this.stableFrames >= this.CONFIRM_FRAMES) {
          this.reps++;
          this.stage = 'up';
          this.stableFrames = 0;
          return this.emit(`COUNT_${this.reps}` as FeedbackSignal, true, true);
        }
        return this.emit(this.pickFeetWarnOr('HOLD_TOP', true));
      }

      this.stableFrames = 0;
      return this.emit(this.pickFeetWarnOr('CMD_STAND_UP', true));
    }

    return this.emit(this.pickFeetWarnOr(this.feedbackCode, this.isCorrect));
  }

  // Helper to keep reset logic tidy
  private depthStableFramesReset() {
    this.topAngleFrames = 0;
  }

  // ✅ Checks visibility AND ensures user isn't too close to edges
  private isVisibleAndCentered(lms: Landmark[]) {
    const EDGE_MARGIN = 0.02;
    return lms.every((l) => {
      const vis = (l.visibility ?? 0) > 0.6;
      const inFrame =
        l.x > EDGE_MARGIN && l.x < (1 - EDGE_MARGIN) &&
        l.y > EDGE_MARGIN && l.y < (1 - EDGE_MARGIN);
      return vis && inFrame;
    });
  }

  // Backward compatibility wrapper if needed
  private visible(lms: Landmark[]) {
    return this.isVisibleAndCentered(lms);
  }

  private pickFeetWarnOr(code: FeedbackSignal, ok: boolean): [FeedbackSignal, boolean] {
    if (this.pendingFeetWarn) {
      this.pendingFeetWarn = false;
      return ['WARN_KEEP_FEET_FIXED', false];
    }
    return [code, ok];
  }

  private emit(
    codeOrTuple: FeedbackSignal | [FeedbackSignal, boolean],
    ok?: boolean,
    immediate = false
  ): StaticSplitSquatResult {
    const code = Array.isArray(codeOrTuple) ? codeOrTuple[0] : codeOrTuple;
    const isOk = Array.isArray(codeOrTuple) ? codeOrTuple[1] : (ok ?? true);

    if (immediate) {
      this.feedbackCode = code;
      this.isCorrect = isOk;
      this.candidateCode = code;
      this.candidateOk = isOk;
      this.candidateFrames = 0;
      return this.buildResult(this.feedbackCode, this.isCorrect);
    }

    const neededFrames = isOk ? this.FEEDBACK_DELAY_OK : this.FEEDBACK_DELAY_BAD;

    if (code === this.candidateCode && isOk === this.candidateOk) {
      this.candidateFrames++;
    } else {
      this.candidateCode = code;
      this.candidateOk = isOk;
      this.candidateFrames = 1;
    }

    if (this.candidateFrames >= neededFrames) {
      this.feedbackCode = this.candidateCode;
      this.isCorrect = this.candidateOk;
      this.candidateFrames = 0;
    }

    return this.buildResult(this.feedbackCode, this.isCorrect);
  }

  private buildResult(code: FeedbackSignal, ok: boolean): StaticSplitSquatResult {
    return {
      exercise: 'static_split_squat',
      reps: this.reps,
      stage: this.stage === 'down' ? 'down' : 'up',
      feedback_code: code,
      is_correct: ok,
    };
  }
}