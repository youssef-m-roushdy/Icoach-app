import {
  Landmark,
  JumpingJacksResult,
  ExerciseLogic,
  FeedbackSignal,
} from '../types';
import { calculateAngle, toPoint, EMA, PoseLandmarks } from '../utils';

// ONNX Runtime - loaded dynamically
let InferenceSession: any = null;
let Tensor: any = null;
let onnxAvailable = false;

try {
  const ort = require('onnxruntime-react-native');
  InferenceSession = ort.InferenceSession;
  Tensor = ort.Tensor;
  onnxAvailable = true;
} catch (e) {
  // Fallback to geometry-based detection
}

const ENCODER_CLASSES = ['in', 'lazy', 'out'];

/**
 * Feedback Priority Levels
 */
enum FeedbackPriority {
  LOW = 0,      // General guidance
  MEDIUM = 1,   // Commands (Jump Open/Close)
  HIGH = 2,     // Form Errors
  CRITICAL = 3  // Rep Success / Major Events
}

export class JumpingJacksLogic implements ExerciseLogic {
  private counter: number = 0;
  private stage: 'down' | 'up' = 'down';

  // Feedback State
  private feedbackCode: FeedbackSignal = 'START_POSITION';
  private lastFeedbackTime: number = 0;
  private currentFeedbackPriority: FeedbackPriority = FeedbackPriority.LOW;
  private readonly STICKY_FEEDBACK_MS = 1000; // قللناها لثانية عشان تلحق تشوف التغييرات

  // ONNX Model state
  private model: any = null;
  private modelLoaded: boolean = false;
  private modelLoading: boolean = false;
  private lastArmClass: string | null = null;
  private lastProb: number = 0;

  // Smoothing tools (EMA) - 🔥 Tuned for SPEED (Higher Alpha = Less Lag)
  // زدنا الألفا لتكون أسرع استجابة
  private emaAnkleDist: EMA = new EMA(0.8);
  private emaShoulderDist: EMA = new EMA(0.7);
  private emaHipDist: EMA = new EMA(0.8);
  private emaArmAngle: EMA = new EMA(0.9);
  private emaProb: EMA = new EMA(0.7);

  // Anti-Cheat & Timing
  private lastRepTime: number = 0;
  // 🔥 Cooldown أسرع (150ms) للسماح بمزيد من العدات السريعة
  private readonly REP_COOLDOWN_MS = 150;

  // Confirmation Counters
  private openUpFrames: number = 0;
  private closedDownFrames: number = 0;
  // 🔥 خفضنا لـ1 فريم لعد أسرع
  private readonly CONFIRM_FRAMES = 1;

  // --- THRESHOLDS (MODIFIED TO PREVENT FALSE COUNTS) ---
  // Leg Thresholds (Normalized)
  // خففنا الشروط للإغلاق لمنع الصرامة الزائدة
  private readonly LEGS_OPEN_ENTRY = 1.25; // خفض قليلاً لتسهيل الفتح
  private readonly LEGS_OPEN_EXIT = 1.15;
  private readonly LEGS_CLOSED_ENTRY = 1.20; // زيادة للسماح بإغلاق غير كامل
  private readonly LEGS_CLOSED_EXIT = 1.30;

  // Arm Thresholds (Degrees)
  // خففنا الشروط للخفض لمنع الصرامة
  private readonly ARMS_UP_ENTRY = 135; // خفض لتسهيل الرفع
  private readonly ARMS_UP_EXIT = 120;
  private readonly ARMS_DOWN_ENTRY = 110; // زيادة للسماح بخفض غير كامل
  private readonly ARMS_DOWN_EXIT = 125;

  private readonly STRICT_ARM_PROB = 0.60; // خفضنا لتسهيل

  constructor() {
    this.loadModel();
  }

  async loadModel(): Promise<void> {
    if (!onnxAvailable || this.modelLoading || this.modelLoaded) return;
    this.modelLoading = true;
    try {
      this.modelLoaded = false;
    } catch (error) {
      this.model = null;
      this.modelLoaded = false;
    } finally {
      this.modelLoading = false;
    }
  }

  /**
   * Updates feedback with a priority-based "sticky" mechanism.
   */
  private updateFeedback(newCode: FeedbackSignal, priority: FeedbackPriority): void {
    const now = Date.now();
    const timeSinceLast = now - this.lastFeedbackTime;

    // ✅ التعديل الأول: الأولويات العالية جدًا (زي الأرقام) تكسر التثبيت فورًا وتتنطق في ساعتها
    if (
      priority >= FeedbackPriority.CRITICAL ||
      priority > this.currentFeedbackPriority ||
      timeSinceLast >= this.STICKY_FEEDBACK_MS
    ) {
      this.feedbackCode = newCode;
      this.lastFeedbackTime = now;
      this.currentFeedbackPriority = priority;
    }
  }

  private async predictArmPosition(
    angles: [number, number, number, number]
  ): Promise<void> {
    if (!this.model || !this.modelLoaded) return;
    try {
      const inputTensor = new Tensor('float32', Float32Array.from(angles), [1, 4]);
      const results = await this.model.run({ input: inputTensor });
      const outputKey = Object.keys(results)[0];
      const outputData = results[outputKey].data;
      const predIdx = Number(outputData[0]);

      this.lastArmClass = ENCODER_CLASSES[predIdx] || 'unknown';
      this.lastProb = results.probabilities
        ? results.probabilities.data[predIdx]
        : 0.95;
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Core Analysis Logic
   */
  analyze(landmarks: Landmark[]): JumpingJacksResult {
    const now = Date.now();

    // 1. Extract Points
    const lSh = toPoint(landmarks[PoseLandmarks.LEFT_SHOULDER]);
    const rSh = toPoint(landmarks[PoseLandmarks.RIGHT_SHOULDER]);
    const lElb = toPoint(landmarks[PoseLandmarks.LEFT_ELBOW]);
    const rElb = toPoint(landmarks[PoseLandmarks.RIGHT_ELBOW]);
    const lHip = toPoint(landmarks[PoseLandmarks.LEFT_HIP]);
    const rHip = toPoint(landmarks[PoseLandmarks.RIGHT_HIP]);
    const lKnee = toPoint(landmarks[PoseLandmarks.LEFT_KNEE]);
    const rKnee = toPoint(landmarks[PoseLandmarks.RIGHT_KNEE]);
    const lAnk = toPoint(landmarks[PoseLandmarks.LEFT_ANKLE]);
    const rAnk = toPoint(landmarks[PoseLandmarks.RIGHT_ANKLE]);

    // 2. Angles
    const angLSh = calculateAngle(lElb, lSh, lHip);
    const angRSh = calculateAngle(rElb, rSh, rHip);
    const angLHip = calculateAngle(lSh, lHip, lKnee);
    const angRHip = calculateAngle(rSh, rHip, rKnee);

    const avgShoulderAngle = this.emaArmAngle.update((angLSh + angRSh) / 2);

    // 3. Arm Class (Hybrid)
    if (this.modelLoaded) {
      this.predictArmPosition([angLSh, angRSh, angLHip, angRHip]);
    }
    const probSmooth = this.emaProb.update(this.lastProb);

    // ✅ شروط صارمة: لازم الأيدي والأرجل يكونوا في الوضع المطلوب معاً
    const armsUp =
      avgShoulderAngle >=
      (this.stage === 'down' ? this.ARMS_UP_ENTRY : this.ARMS_UP_EXIT);

    const armsDown =
      avgShoulderAngle <=
      (this.stage === 'up' ? this.ARMS_DOWN_ENTRY : this.ARMS_DOWN_EXIT);

    // 4. Leg Distances
    const ankleDist = this.emaAnkleDist.update(Math.abs(lAnk[0] - rAnk[0]));
    const hipDist = this.emaHipDist.update(Math.abs(lHip[0] - rHip[0]));
    const shoulderDist = this.emaShoulderDist.update(Math.abs(lSh[0] - rSh[0]));
    const baseDist = Math.max(hipDist, shoulderDist * 0.9);

    const legsOpen =
      ankleDist >
      baseDist * (this.stage === 'down' ? this.LEGS_OPEN_ENTRY : this.LEGS_OPEN_EXIT);

    const legsClosed =
      ankleDist <
      baseDist * (this.stage === 'up' ? this.LEGS_CLOSED_ENTRY : this.LEGS_CLOSED_EXIT);

    // 5. State Machine Logic - ✅ التعديل الأساسي هنا
    // لازم يكون الأرجل مفتوحة والأيدي مرفوعة معاً
    const isPoseUp = legsOpen && armsUp;
    // لازم يكون الأرجل مقفولة والأيدي مخفضة معاً
    const isPoseDown = legsClosed && armsDown;

    this.openUpFrames = isPoseUp ? this.openUpFrames + 1 : 0;
    this.closedDownFrames = isPoseDown ? this.closedDownFrames + 1 : 0;

    if (this.stage === 'down') {
      // ✅ لازم يرفع ايديه ويفتح رجليه معاً عشان يتحول لمرحلة "up"
      if (this.openUpFrames >= this.CONFIRM_FRAMES) {
        this.stage = 'up';
        this.updateFeedback('CMD_JUMP_CLOSE', FeedbackPriority.MEDIUM);
      } else {
        // Form Feedback
        if (!legsOpen && !armsUp) {
          this.updateFeedback('CMD_OPEN_LEGS_AND_RAISE_ARMS', FeedbackPriority.LOW);
        } else if (!legsOpen) {
          this.updateFeedback('CMD_JUMP_OPEN', FeedbackPriority.MEDIUM);
        } else if (!armsUp) {
          this.updateFeedback('ERR_RAISE_ARMS', FeedbackPriority.HIGH);
        }
      }
    } else if (this.stage === 'up') {
      // ✅ لازم يقفل رجليه ويخفض ايديه معاً عشان يعد العدة
      if (this.closedDownFrames >= this.CONFIRM_FRAMES) {
        if (now - this.lastRepTime > this.REP_COOLDOWN_MS) {
          this.counter++;
          this.lastRepTime = now;
          this.stage = 'down';
          // ✅ التعديل التاني: نبعت كود العدة بدل REP_SUCCESS
          this.updateFeedback(`COUNT_${this.counter}` as FeedbackSignal, FeedbackPriority.CRITICAL);
        }
      } else {
        // Form Feedback
        if (!legsClosed && !armsDown) {
          this.updateFeedback('CMD_CLOSE_LEGS_AND_LOWER_ARMS', FeedbackPriority.LOW);
        } else if (!legsClosed) {
          this.updateFeedback('CMD_JUMP_CLOSE', FeedbackPriority.MEDIUM);
        } else if (!armsDown) {
          this.updateFeedback('CMD_LOWER_ARMS', FeedbackPriority.MEDIUM);
        }
      }
    }

    return {
      exercise: 'jumping_jacks',
      reps: this.counter,
      stage: this.stage,
      feedback_code: this.feedbackCode,
      debug_class: `SpeedMode: A:${avgShoulderAngle.toFixed(0)} L:${(ankleDist / baseDist).toFixed(2)}`,
    };
  }

  reset(): void {
    this.counter = 0;
    this.stage = 'down';
    this.feedbackCode = 'START_POSITION';
    this.currentFeedbackPriority = FeedbackPriority.LOW;
    this.lastFeedbackTime = 0;
    this.openUpFrames = 0;
    this.closedDownFrames = 0;

    this.emaAnkleDist.reset();
    this.emaShoulderDist.reset();
    this.emaHipDist.reset();
    this.emaArmAngle.reset();
    this.emaProb.reset();
  }

  getRepCount(): number {
    return this.counter;
  }

  isInUpStage(): boolean {
    return this.stage === 'up';
  }

  forceRep(): void {
    this.counter++;
    // ✅ التعديل التالت: تحديث العدة لو اتعملت بشكل يدوي
    this.updateFeedback(`COUNT_${this.counter}` as FeedbackSignal, FeedbackPriority.CRITICAL);
  }
}