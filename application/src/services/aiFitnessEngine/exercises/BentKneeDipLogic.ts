import {
  ExerciseLogic,
  RepExerciseResult,
  Landmark,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';

export interface BentKneeDipResult extends RepExerciseResult {
  exercise: 'bent_knee_dip';
}

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11,  RIGHT_SHOULDER: 12,
  LEFT_ELBOW:    13,  RIGHT_ELBOW:    14,
  LEFT_WRIST:    15,  RIGHT_WRIST:    16,
  LEFT_HIP:      23,  RIGHT_HIP:      24,
  LEFT_KNEE:     25,  RIGHT_KNEE:     26,
  LEFT_ANKLE:    27,  RIGHT_ANKLE:    28,
} as const;

const T = {
  // ✅ أوسع شوية — العضلة مش هتخليك تفضل على 150 كل الوقت
  ELBOW_UP_ANGLE:   140,
  ELBOW_DOWN_ANGLE: 105,

  // ✅ الركبة في setup: قريب من 90° (±30°)
  KNEE_SETUP_MIN: 60,
  KNEE_SETUP_MAX: 120,

  // ✅ أثناء الحركة: نطاق أوسع (الركبة هتتحرك طبيعياً ±35°)
  KNEE_ACTIVE_MIN: 55,
  KNEE_ACTIVE_MAX: 130,

  // ✅ هيسترسيس — مينفعش ترجع "ok" إلا لو دخلت في نطاق أضيق
  KNEE_RECOVER_MIN: 65,
  KNEE_RECOVER_MAX: 120,

  STABLE_FRAMES:          3,
  SETUP_HOLD_TIME:       15,
  KNEE_GRACE_FRAMES:      4,   // تحذير بس
  KNEE_INVALIDATE_FRAMES: 9,   // إبطال العدة
} as const;

// ✅ alpha أصغر = تنعيم أقوى = استقرار أكتر
const EMA_ALPHA = 0.3;
const VIS_MIN   = 0.4;

export class BentKneeDipLogic implements ExerciseLogic {
  // الحالات:
  // setup: بنظبط القعدة
  // up: فوق
  // down: تحت
  private state: 'setup' | 'up' | 'down' = 'setup';

  private reps: number = 0;
  private feedback_code: FeedbackSignal = 'SETUP_POSITION';
  private is_correct: boolean = false;

  private stableFrames: number = 0;
  private setupTimer: number = 0;

  // المتغير ده هو "الحارس". لو لمست الأرض بيبقى true، ولما تيجي تضم مش هيحسب العدة
  private repInvalidated: boolean = false;
  private kneeBadFrames: number = 0;
  private kneeRecovered: boolean = true; // ✅ هيسترسيس

  private smLeftElbow: number = 180;
  private smRightElbow: number = 180;
  private smKneeAngle: number = 90;   // متوسط الركبتين
  private initialized: boolean = false; // ✅ cold start

  reset(): void {
    this.state           = 'setup';
    this.reps            = 0;
    this.feedback_code   = 'SETUP_POSITION';
    this.is_correct      = false;
    this.stableFrames    = 0;
    this.setupTimer      = 0;
    this.repInvalidated  = false;
    this.kneeBadFrames   = 0;
    this.kneeRecovered   = true;
    this.smLeftElbow     = 180;
    this.smRightElbow    = 180;
    this.smKneeAngle     = 90;
    this.initialized     = false;
  }

  private calcAngle(a: Landmark, b: Landmark, c: Landmark): number {
    if (!a || !b || !c) return 180;
    let angle = Math.abs(
      (Math.atan2(c.y - b.y, c.x - b.x) -
       Math.atan2(a.y - b.y, a.x - b.x)) *
      (180 / Math.PI)
    );
    return angle > 180 ? 360 - angle : angle;
  }

  private ema(prev: number, curr: number): number {
    return EMA_ALPHA * curr + (1 - EMA_ALPHA) * prev;
  }

  analyze(
    landmarks: Landmark[],
    _context?: ExerciseAnalysisContext
  ): BentKneeDipResult {
    const L = LANDMARK_INDICES;

    // ─── Visibility check ────────────────────────────────────────────────
    const needed = [
      L.LEFT_SHOULDER, L.RIGHT_SHOULDER,
      L.LEFT_ELBOW,    L.RIGHT_ELBOW,
      L.LEFT_WRIST,    L.RIGHT_WRIST,
      L.LEFT_HIP,      L.RIGHT_HIP,
      L.LEFT_KNEE,     L.RIGHT_KNEE,
      L.LEFT_ANKLE,    L.RIGHT_ANKLE,
    ];
    const allVisible = needed.every(
      i => (landmarks[i]?.visibility ?? 0) > VIS_MIN
    );

    if (!allVisible) {
      return {
        exercise: 'bent_knee_dip',
        reps: this.reps,
        stage: this.state === 'setup' ? 'up' : (this.state as 'up' | 'down'),
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
      };
    }

    // ─── Raw angles ───────────────────────────────────────────────────────
    const rawLeftElbow = this.calcAngle(
      landmarks[L.LEFT_SHOULDER],
      landmarks[L.LEFT_ELBOW],
      landmarks[L.LEFT_WRIST]
    );

    const rawRightElbow = this.calcAngle(
      landmarks[L.RIGHT_SHOULDER],
      landmarks[L.RIGHT_ELBOW],
      landmarks[L.RIGHT_WRIST]
    );

    const rawLeftKnee = this.calcAngle(
      landmarks[L.LEFT_HIP],
      landmarks[L.LEFT_KNEE],
      landmarks[L.LEFT_ANKLE]
    );

    const rawRightKnee = this.calcAngle(
      landmarks[L.RIGHT_HIP],
      landmarks[L.RIGHT_KNEE],
      landmarks[L.RIGHT_ANKLE]
    );

    // ✅ متوسط الركبتين — أستقر بكتير من اختيار جانب واحد
    const rawKneeAvg = (rawLeftKnee + rawRightKnee) / 2;

    // ✅ Cold start: initialize EMA من أول فريم مش من قيمة وهمية
    if (!this.initialized) {
      this.smLeftElbow  = rawLeftElbow;
      this.smRightElbow = rawRightElbow;
      this.smKneeAngle  = rawKneeAvg;
      this.initialized  = true;
    } else {
      this.smLeftElbow  = this.ema(this.smLeftElbow, rawLeftElbow);
      this.smRightElbow = this.ema(this.smRightElbow, rawRightElbow);
      this.smKneeAngle  = this.ema(this.smKneeAngle, rawKneeAvg);
    }

    // ✅ أفضل مرفق: اللي أكتر انثناء (الأصغر) — بيعكس الحركة الحقيقية
    const smElbow = Math.min(this.smLeftElbow, this.smRightElbow);

    // ─── Knee validity helpers ────────────────────────────────────────────
    const isKneeOkSetup =
      this.smKneeAngle >= T.KNEE_SETUP_MIN &&
      this.smKneeAngle <= T.KNEE_SETUP_MAX;

    const isKneeOkActive =
      this.smKneeAngle >= T.KNEE_ACTIVE_MIN &&
      this.smKneeAngle <= T.KNEE_ACTIVE_MAX;

    const isKneeRecovered =
      this.smKneeAngle >= T.KNEE_RECOVER_MIN &&
      this.smKneeAngle <= T.KNEE_RECOVER_MAX;

    // ✅ اختار نوع الخطأ: مفرود ولا مطوي أوي؟
    const kneeError = (): FeedbackSignal =>
  (
    this.smKneeAngle > T.KNEE_ACTIVE_MAX
      ? 'BEND_KNEE_90'
      : 'DONT_OVERBEND_KNEE'
  ) as FeedbackSignal;

    // ════════════════════════════════════════════════════════════════════
    // 🟡 SETUP
    // ════════════════════════════════════════════════════════════════════
    if (this.state === 'setup') {
      const armsOk = smElbow > T.ELBOW_UP_ANGLE;

      if (armsOk && isKneeOkSetup) {
        this.setupTimer++;
        if (this.setupTimer > T.SETUP_HOLD_TIME) {
          this.state          = 'up';
          this.setupTimer     = 0;
          this.repInvalidated = false;
          this.kneeBadFrames  = 0;
          this.kneeRecovered  = true;
          this.feedback_code  = 'GO_DOWN';
          this.is_correct     = true;
        } else {
          this.feedback_code = 'SETUP_POSITION';
          this.is_correct    = true;
        }
      } else {
        this.setupTimer    = 0;
        // ✅ is_correct: false لما في خطأ
        this.is_correct    = false;
        this.feedback_code = !isKneeOkSetup ? kneeError() : 'SETUP_POSITION';
      }

      return {
        exercise: 'bent_knee_dip',
        reps: this.reps,
        stage: 'up',
        feedback_code: this.feedback_code,
        is_correct: this.is_correct,
      };
    }

    // ════════════════════════════════════════════════════════════════════
    // 🔵 ACTIVE (up / down)
    // ════════════════════════════════════════════════════════════════════

    // ── Knee tracking with hysteresis ─────────────────────────────────
    if (!isKneeOkActive) {
      this.kneeBadFrames++;
      this.kneeRecovered = false;

      if (this.kneeBadFrames >= T.KNEE_GRACE_FRAMES) {
        this.feedback_code = kneeError();
        this.is_correct    = false;
      }
      if (this.kneeBadFrames >= T.KNEE_INVALIDATE_FRAMES) {
        this.repInvalidated = true;
      }
    } else {
      // ✅ هيسترسيس: مش هيعتبرك "رجعت" إلا لو دخلت في النطاق الأضيق
      if (!this.kneeRecovered && isKneeRecovered) {
        this.kneeRecovered = true;
        this.kneeBadFrames = 0;
      }

      if (this.repInvalidated) {
        // العدة اتبوظت — استنى نهايتها
        this.feedback_code = kneeError();
        this.is_correct    = false;
      } else if (this.kneeRecovered) {
        this.kneeBadFrames = 0;
        this.is_correct    = true;
        // feedback_code هيتحدد من الـ state machine تحت
      }
    }

    // ── State machine ──────────────────────────────────────────────────
    const kneeIssue = this.kneeBadFrames >= T.KNEE_GRACE_FRAMES || this.repInvalidated;

    if (this.state === 'up') {
      if (!kneeIssue) this.feedback_code = 'GO_DOWN';

      if (smElbow < T.ELBOW_DOWN_ANGLE) {
        this.stableFrames++;
        if (this.stableFrames >= T.STABLE_FRAMES) {
          this.state = 'down';
          this.stableFrames = 0;
          if (!kneeIssue) this.feedback_code = 'PUSH_UP';
        }
      } else {
        this.stableFrames = 0;
      }

    } else { // down
      if (!kneeIssue) this.feedback_code = 'PUSH_UP';

      if (smElbow > T.ELBOW_UP_ANGLE) {
        this.stableFrames++;
        if (this.stableFrames >= T.STABLE_FRAMES) {
          if (!this.repInvalidated) {
            this.reps++;
            this.feedback_code = `COUNT_${this.reps}` as FeedbackSignal;
            this.is_correct    = true;
          } else {
            this.feedback_code = kneeError();
            this.is_correct    = false;
          }

          // ✅ reset للعدة الجاية
          this.state          = 'up';
          this.stableFrames   = 0;
          this.repInvalidated = false;
          this.kneeBadFrames  = 0;
          this.kneeRecovered  = true;
        }
      } else {
        this.stableFrames = 0;
      }
    }

    return {
      exercise: 'bent_knee_dip',
      reps: this.reps,
      stage: this.state as 'up' | 'down',
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
    };
  }
}