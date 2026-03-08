import { Landmark, StaticSplitSquatResult, ExerciseLogic } from '../types';
import { PoseLandmarks, calculateAngle, EMA } from '../utils';

type Stage = 'setup' | 'up' | 'down';

export class StaticSplitSquatLogic implements ExerciseLogic {
  private reps = 0;
  private stage: Stage = 'setup';

  private feedbackCode = 'SETUP_SPLIT_STANCE';
  private isCorrect = true;

  // ---- Feedback Debounce State ----
  private candidateCode = 'SETUP_SPLIT_STANCE';
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
  private readonly SETUP_CONFIRM_FRAMES = 10; // زودناها عشان ميثبتش غير لما يتأكد
  private readonly STANCE_LOST_FRAMES = 5;    // قللناها عشان يلغي بسرعة لو ضميت رجلك

  // ---- Knee thresholds ----
  private readonly KNEE_UP = 154;
  private readonly KNEE_DOWN = 85; // رفعناها سنة صغيرة عشان نضمن النزول الواضح
  private readonly MIN_ROM_DEG = 45;

  private readonly LOWER_HINT_RATIO = 0.60;

  // ---- Stance thresholds (Strict) ----
  private readonly SPLIT_RATIO_LOCK = 0.90;  // لازم تفتح رجلك جامد عشان يبدأ
  // ⛔ أهم تعديل: رفعنا الرقم ده عشان لو ضميت رجلك (سكوات) يفصل فوراً
  private readonly SPLIT_RATIO_RESET = 0.70; 

  // ---- Feet movement ----
  private readonly FOOT_MOVE_TOL_RATIO = 0.40;
  private readonly FOOT_WARN_COOLDOWN_FRAMES = 15;
  private footWarnCooldown = 0;
  private pendingFeetWarn = false;

  // ---- Smoothing ----
  private emaActiveKnee = new EMA(0.35);

  private topAngleRef = 165;
  private topAngleFrames = 0;

  analyze(lm: Landmark[]): StaticSplitSquatResult {
    const lH = lm[PoseLandmarks.LEFT_HIP];
    const rH = lm[PoseLandmarks.RIGHT_HIP];
    const lK = lm[PoseLandmarks.LEFT_KNEE];
    const rK = lm[PoseLandmarks.RIGHT_KNEE];
    const lA = lm[PoseLandmarks.LEFT_ANKLE];
    const rA = lm[PoseLandmarks.RIGHT_ANKLE];

    // 1) Visibility & Frame Edge Check (منع العد الوهمي عند القرب)
    // لو المفاصل المهمة قريبة جداً من حواف الشاشة (0 أو 1)، نوقف
    if (!this.isVisibleAndCentered([lH, rH, lK, rK, lA, rA])) {
      // لو كنا مثبتين الوضع وخرجنا بره الكادر، نلغي التثبيت للأمان
      if (this.isStanceLocked) {
        this.isStanceLocked = false;
        this.stage = 'setup';
      }
      return this.emit('ERR_BODY_NOT_VISIBLE', false, true);
    }

    // 2) Scales (relative)
    const hipWidth = Math.max(Math.abs(lH.x - rH.x), 0.08);

    // 3) Split measure
    const dx = Math.abs(lA.x - rA.x);
    const dz = Math.abs((lA.z ?? 0) - (rA.z ?? 0));
    // التركيز الأكبر على المسافة الأفقية dx عشان نمنع وضعية السكوات
    const splitScore = Math.sqrt(dx * dx + (dz * 0.4) * (dz * 0.4));
    const splitRatio = splitScore / hipWidth;

    // 4) Angles
    const lAng = calculateAngle(lH, lK, lA);
    const rAng = calculateAngle(rH, rK, rA);
    const rawActiveAngle = Math.min(lAng, rAng);
    const activeAngle = this.emaActiveKnee.update(rawActiveAngle);

    // ---------------- CRITICAL CHECK: Feet Together (Squat Detection) ----------------
    // لو احنا شغالين، ولقينا الرجلين قربوا من بعض (أقل من الحد المسموح)
    // افصل فوراً ومتعدش ولا عدة زيادة
    if (this.isStanceLocked && splitRatio < this.SPLIT_RATIO_RESET) {
       this.stanceLostFrames++;
       if (this.stanceLostFrames > 3) { // 3 فريمات بس للتأكيد
         this.isStanceLocked = false;
         this.stage = 'setup';
         this.stableFrames = 0;
         this.stanceLostFrames = 0;
         return this.emit('SETUP_SPLIT_STANCE', true, true);
       }
    } else {
       this.stanceLostFrames = 0;
    }

    // ---------------- SETUP / LOCK ----------------
    if (!this.isStanceLocked) {
      // لازم تفتح رجلك مسافة محترمة عشان يقبل
      if (splitRatio >= this.SPLIT_RATIO_LOCK) {
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
      if (upOk) {
        this.stableFrames++;
        if (this.stableFrames >= this.CONFIRM_FRAMES) {
          this.reps++;
          this.stage = 'up';
          this.stableFrames = 0;
          return this.emit('REP_SUCCESS', true, true);
        }
        return this.emit(this.pickFeetWarnOr('HOLD_TOP', true));
      }

      this.stableFrames = 0;
      return this.emit(this.pickFeetWarnOr('CMD_STAND_UP', true));
    }

    return this.emit(this.pickFeetWarnOr(this.feedbackCode, this.isCorrect));
  }

  // ✅ New Helper: Checks visibility AND ensures user isn't too close to edges
  private isVisibleAndCentered(lms: Landmark[]) {
    const EDGE_MARGIN = 0.02; // 2% margin from screen edges
    return lms.every(l => {
        const vis = (l.visibility ?? 0) > 0.6; // Strict visibility
        const inFrame = l.x > EDGE_MARGIN && l.x < (1 - EDGE_MARGIN) && 
                        l.y > EDGE_MARGIN && l.y < (1 - EDGE_MARGIN);
        return vis && inFrame;
    });
  }
  
  // Backward compatibility wrapper if needed
  private visible(lms: Landmark[]) {
      return this.isVisibleAndCentered(lms);
  }

  private pickFeetWarnOr(code: string, ok: boolean): [string, boolean] {
    if (this.pendingFeetWarn) {
      this.pendingFeetWarn = false;
      return ['WARN_KEEP_FEET_FIXED', false];
    }
    return [code, ok];
  }

  private emit(codeOrTuple: string | [string, boolean], ok?: boolean, immediate = false): StaticSplitSquatResult {
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

  private buildResult(code: string, ok: boolean): StaticSplitSquatResult {
    return {
      exercise: 'static_split_squat',
      reps: this.reps,
      stage: this.stage === 'down' ? 'down' : 'up',
      feedback_code: code,
      is_correct: ok,
    };
  }
}