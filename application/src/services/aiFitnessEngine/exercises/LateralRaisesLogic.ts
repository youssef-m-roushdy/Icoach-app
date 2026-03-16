/**
 * Lateral Raises Logic - Smart Coach (Strict ROM Window + No overlap cues + Anti-cheat)
 * - يقول "ارفع أكتر" لو الرفع أقل من مستوى الكتف
 * - يقول "افرد دراعك" لو الكوع متني
 * - لو رفع أعلى من مستوى الكتف: العدة تتلغى ولا تُحسب
 * - يمنع العد العشوائي (stability + cooldown + invalidation flags)
 * - يقلّل تداخل الصوت (feedback throttling)
 */

import { Landmark, LateralRaisesResult, ExerciseLogic, FeedbackSignal } from '../types';
import { PoseLandmarks } from '../utils';

// ============================================================================
// 1) EMA (Smoothing)
// ============================================================================
class EMA {
  private alpha: number;
  private value: number | null = null;
  constructor(alpha: number = 0.3) { this.alpha = alpha; }

  update(x: number): number {
    if (this.value === null) this.value = x;
    else this.value = this.alpha * x + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset() { this.value = null; }
}

export class LateralRaisesLogic implements ExerciseLogic {
  private counter = 0;
  private stage: 'down' | 'up' = 'down';
  private feedbackCode: FeedbackSignal = 'CMD_RAISE_ARMS';

  // --- Anti-random counting / stability ---
  private lastRepTime = 0;
  private lastStageChangeTime = 0;
  private peakStableStart = 0;

  // --- Prevent "cheat rep" ---
  private repInvalidated = false;
  private repInvalidReason: FeedbackSignal | null = null;

  // --- Feedback throttling (reduce audio overlap) ---
  private lastFeedbackEmitTime = 0;
  private lastFeedbackEmitted: FeedbackSignal = 'CMD_RAISE_ARMS';
  private readonly FEEDBACK_COOLDOWN_MS = 900; // يمنع تغيير التعليمات بسرعة

  // Smoothing
  private emaLift = new EMA(0.28);
  private emaStraightness = new EMA(0.28);

  // =========================================================
  // ⚙️ Constants (Balanced: a bit strict but not annoying)
  // =========================================================

  // 1) Elbow: لازم قريب من straight
  private readonly ELBOW_MIN_ANGLE = 145; // كان 140، خليناه أدق شوية ضد الغش
  private readonly ELBOW_FAIL_ANGLE = 138; // hysteresis: لو كان صح وبدأ يضعف

  // 2) Sync
  private readonly SYNC_TOLERANCE = 28; // شوية أوسع من 25 لتسهيل بسيط

  // 3) Shoulder-level ROM window (لا أقل ولا أكثر)
  // لازم توصل للمنطقة دي عشان تتسجل "UP" صحيحة
  private readonly SHOULDER_WIN_MIN = 78;  // أقل من كده => "ارفع أكتر"
  private readonly SHOULDER_WIN_MAX = 98;  // أعلى من كده => "عالي قوي" وتبطل العدة

  // 4) Reset (الرجوع لتحت) عشان نعد
  private readonly RESET_TARGET = 30;

  // 5) "Low but moving": لو بين ده وبين win min => نقول ارفع أكتر
  private readonly LOW_RAISE_HINT = 55;

  // 6) Timing locks
  private readonly PEAK_STABLE_MS = 180;
  private readonly REP_COOLDOWN_MS = 850;
  private readonly MIN_STAGE_HOLD_MS = 180;

  /**
   * Calculate angle between 3 points
   */
  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) -
      Math.atan2(a.y - b.y, a.x - b.x);

    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  /**
   * Visibility check
   */
  private checkVisibility(landmarks: Landmark[]): boolean {
    const indices = [
      PoseLandmarks.LEFT_SHOULDER, PoseLandmarks.RIGHT_SHOULDER,
      PoseLandmarks.LEFT_ELBOW, PoseLandmarks.RIGHT_ELBOW,
      PoseLandmarks.LEFT_WRIST, PoseLandmarks.RIGHT_WRIST,
      PoseLandmarks.LEFT_HIP, PoseLandmarks.RIGHT_HIP,
    ];
    return indices.every(idx => (landmarks[idx]?.visibility || 0) > 0.5);
  }

  /**
   * Throttled feedback setter to reduce audio overlap
   * - العدّ (COUNT_) لازم يطلع فوراً
   * - الأخطاء الحرجة ممكن تطلع فوراً (force)
   */
  private setFeedback(code: FeedbackSignal, nowMs: number, force = false) {
    const isCount = code.startsWith('COUNT_');
    const isForceImportant =
      force ||
      isCount ||
      code === 'ERR_BODY_NOT_VISIBLE' ||
      code === 'STRAIGHTEN_ARMS' ||
      code === 'ERR_TOO_HIGH';

    if (isForceImportant) {
      this.feedbackCode = code;
      this.lastFeedbackEmitted = code;
      this.lastFeedbackEmitTime = nowMs;
      return;
    }

    // لو نفس الرسالة سيبها
    if (code === this.lastFeedbackEmitted) {
      this.feedbackCode = code;
      return;
    }

    // throttle: ما تغيّرش الرسالة بسرعة
    if (nowMs - this.lastFeedbackEmitTime >= this.FEEDBACK_COOLDOWN_MS) {
      this.feedbackCode = code;
      this.lastFeedbackEmitted = code;
      this.lastFeedbackEmitTime = nowMs;
    } else {
      // احتفظ بالقديمة لتجنب تداخل الصوت
      this.feedbackCode = this.lastFeedbackEmitted || this.feedbackCode;
    }
  }

  analyze(landmarks: Landmark[]): LateralRaisesResult {
    const nowMs = Date.now();

    // 1) Visibility
    if (!this.checkVisibility(landmarks)) {
      this.repInvalidated = false;
      this.repInvalidReason = null;
      this.peakStableStart = 0;
      this.setFeedback('ERR_BODY_NOT_VISIBLE', nowMs, true);
      return this.createResult(this.feedbackCode);
    }

    // 2) Extract points
    const lSh = landmarks[PoseLandmarks.LEFT_SHOULDER];
    const rSh = landmarks[PoseLandmarks.RIGHT_SHOULDER];
    const lEl = landmarks[PoseLandmarks.LEFT_ELBOW];
    const rEl = landmarks[PoseLandmarks.RIGHT_ELBOW];
    const lWr = landmarks[PoseLandmarks.LEFT_WRIST];
    const rWr = landmarks[PoseLandmarks.RIGHT_WRIST];
    const lHip = landmarks[PoseLandmarks.LEFT_HIP];
    const rHip = landmarks[PoseLandmarks.RIGHT_HIP];

    // 3) Lift angle (Hip -> Shoulder -> Elbow)
    const lLift = this.calculateAngle(lHip, lSh, lEl);
    const rLift = this.calculateAngle(rHip, rSh, rEl);
    const avgLift = this.emaLift.update((lLift + rLift) / 2);

    // 4) Elbow straightness (Shoulder -> Elbow -> Wrist)
    const lStraight = this.calculateAngle(lSh, lEl, lWr);
    const rStraight = this.calculateAngle(rSh, rEl, rWr);
    const minStraight = this.emaStraightness.update(Math.min(lStraight, rStraight));

    // 5) Sync diff (raw better)
    const syncDiff = Math.abs(lLift - rLift);

    const canChangeStage = (nowMs - this.lastStageChangeTime) >= this.MIN_STAGE_HOLD_MS;
    const repReady = (nowMs - this.lastRepTime) >= this.REP_COOLDOWN_MS;

    // =========================================================
    // 🧠 Coach Logic
    // =========================================================

    // ---- A) Anti-cheat / errors that should invalidate current rep ----

    // 1) Elbows bent
    const elbowsOk = (this.stage === 'up')
      ? (minStraight >= this.ELBOW_FAIL_ANGLE) // hysteresis: في up نسمح أقل سنة بدون flip مزعج
      : (minStraight >= this.ELBOW_MIN_ANGLE);

    if (!elbowsOk) {
      // لو داخل عدة، ابطلها
      if (this.stage === 'up') {
        this.repInvalidated = true;
        this.repInvalidReason = 'REP_INVALID_BENT_ELBOW';
      }
      this.peakStableStart = 0;
      this.setFeedback('STRAIGHTEN_ARMS', nowMs, true);
      return this.createResult(this.feedbackCode);
    }

    // 2) Too high (above shoulder window)
    if (avgLift > this.SHOULDER_WIN_MAX) {
      if (this.stage === 'up') {
        this.repInvalidated = true;
        this.repInvalidReason = 'REP_INVALID_TOO_HIGH';
      }
      this.peakStableStart = 0;
      this.setFeedback('ERR_TOO_HIGH', nowMs, true);
      return this.createResult(this.feedbackCode);
    }

    // 3) Unsync (only when arms are raised enough to matter)
    if (syncDiff > this.SYNC_TOLERANCE && avgLift > 45) {
      if (this.stage === 'up') {
        this.repInvalidated = true;
        this.repInvalidReason = 'REP_INVALID_UNSYNC';
      }
      this.peakStableStart = 0;
      this.setFeedback('FIX_POSTURE', nowMs);
      return this.createResult(this.feedbackCode);
    }

    // ---- B) Range guidance: "raise higher" if still low ----
    // لو بيحاول يرفع (أعلى من LOW_RAISE_HINT) لكنه لم يصل لمستوى الكتف
    if (this.stage === 'down' && avgLift >= this.LOW_RAISE_HINT && avgLift < this.SHOULDER_WIN_MIN) {
      this.peakStableStart = 0;
      this.setFeedback('CMD_RAISE_HIGHER', nowMs);
      return this.createResult(this.feedbackCode);
    }

    // ---- C) Valid peak (must be within shoulder window) ----
    const inShoulderWindow = avgLift >= this.SHOULDER_WIN_MIN && avgLift <= this.SHOULDER_WIN_MAX;

    if (inShoulderWindow) {
      if (this.peakStableStart === 0) this.peakStableStart = nowMs;
      const stableFor = nowMs - this.peakStableStart;

      if (stableFor >= this.PEAK_STABLE_MS) {
        if (this.stage === 'down' && canChangeStage) {
          // starting a new rep attempt
          this.stage = 'up';
          this.lastStageChangeTime = nowMs;
          this.repInvalidated = false;
          this.repInvalidReason = null;

          this.setFeedback('PERFECT_LEVEL', nowMs, true); // important feedback
        } else {
          this.setFeedback('PERFECT_LEVEL', nowMs);
        }
      } else {
        this.setFeedback('HOLD_STEADY', nowMs);
      }

      return this.createResult(this.feedbackCode);
    } else {
      // not in window => reset stability
      this.peakStableStart = 0;
    }

    // ---- D) Down phase & Count (only if rep not invalidated) ----
    if (avgLift <= this.RESET_TARGET) {
      if (this.stage === 'up' && repReady && canChangeStage) {
        this.stage = 'down';
        this.lastStageChangeTime = nowMs;
        this.lastRepTime = nowMs;

        if (this.repInvalidated) {
          // ❌ do not count
          const reason = this.repInvalidReason || 'HOLD_POSITION';
          // رجّع كود واحد ثابت أو حسب السبب
          this.setFeedback(reason, nowMs, true);

          // reset rep invalidation at bottom
          this.repInvalidated = false;
          this.repInvalidReason = null;

          return this.createResult(this.feedbackCode);
        }

        // ✅ count
        this.counter++;
        this.setFeedback(`COUNT_${this.counter}`, nowMs, true);
        return this.createResult(this.feedbackCode);
      }

      // resting at bottom
      this.repInvalidated = false;
      this.repInvalidReason = null;
      this.setFeedback('CMD_RAISE_ARMS', nowMs);
      return this.createResult(this.feedbackCode);
    }

    // ---- E) Transition cues (middle zone) ----
    if (this.stage === 'up') {
      this.setFeedback('REP_SUCCESS', nowMs); // "انزل بهدوء"
    } else {
      this.setFeedback('CMD_RAISE_ARMS', nowMs);
    }

    return this.createResult(this.feedbackCode);
  }

  private createResult(feedback: FeedbackSignal): LateralRaisesResult {
    return {
      exercise: 'lateral_raises',
      reps: this.counter,
      stage: this.stage,
      feedback_code: feedback,
      is_correct: true,
    };
  }

  reset(): void {
    this.counter = 0;
    this.stage = 'down';
    this.feedbackCode = 'CMD_RAISE_ARMS';

    this.lastRepTime = 0;
    this.lastStageChangeTime = 0;
    this.peakStableStart = 0;

    this.repInvalidated = false;
    this.repInvalidReason = null;

    this.lastFeedbackEmitTime = 0;
    this.lastFeedbackEmitted = 'CMD_RAISE_ARMS';

    this.emaLift.reset();
    this.emaStraightness.reset();
  }
}