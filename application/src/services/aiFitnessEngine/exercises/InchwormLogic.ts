import {
  ExerciseLogic,
  InchwormResult,
  Landmark,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  // 🟢 الوقوف
  STANDING_ANGLE_ENTER: 38,
  STANDING_ANGLE_EXIT: 30,

  // 🟢 البلانك
  PLANK_TORSO_ANGLE: 62,
  PLANK_BODY_LINE: 165,
  PLANK_HIP_SHOULDER_DY: 0.18,
  PLANK_HIP_ANKLE_DY_MAX: 0.28,
  PLANK_WRIST_ANKLE_DIST: 0.33,
  PLANK_WRIST_ANKLE_DX: 0.22,
  PLANK_SHOULDER_WRIST_DX: 0.22,

  // 🟡 الخروج من البلانك
  EXIT_PLANK_TORSO: 55,
  EXIT_PLANK_BODYLINE: 150,
  EXIT_PLANK_HIP_SHOULDER_DY: 0.25,
  EXIT_PLANK_HIP_ANKLE_DY: 0.34,

  // 🔥 منع الغش بالركبة
  KNEE_TOUCH_VIS: 0.45,
  KNEE_ANKLE_DY_NEAR: 0.085,
  KNEE_ANKLE_DIST_NEAR: 0.14,
  KNEE_BENT_ANGLE_MAX: 158,

  STABLE_FRAMES: 4,
} as const;

const EMA_ALPHA = 0.5;

type State = 'standing' | 'walking_out' | 'plank' | 'walking_back';

export class InchwormLogic implements ExerciseLogic {
  private state: State = 'standing';
  private reps = 0;
  private feedback_code: FeedbackSignal = 'SETUP_POSITION';
  private is_correct = true;

  private standStableFrames = 0;
  private plankStableFrames = 0;

  private smTorsoAngle = 0;
  private smBodyLine = 180;

  /**
   * True if any knee touched the floor during the current cycle.
   * This invalidates the whole rep.
   */
  private kneeTouchedDuringRep = false;

  /**
   * Once a rep is aborted, the user must return to standing
   * before starting a new cycle.
   */
  private repAborted = false;

  private xScale = 1;

  public setAspectRatio(width: number, height: number): void {
    if (!width || !height) return;
    this.xScale = Math.max(0.3, Math.min(3, width / height));
  }

  reset(): void {
    this.state = 'standing';
    this.reps = 0;
    this.feedback_code = 'SETUP_POSITION';
    this.is_correct = true;
    this.standStableFrames = 0;
    this.plankStableFrames = 0;
    this.smTorsoAngle = 0;
    this.smBodyLine = 180;
    this.kneeTouchedDuringRep = false;
    this.repAborted = false;
    this.xScale = 1;
  }

  private calculateVerticalInclination(shoulder: Landmark, hip: Landmark): number {
    if (!shoulder || !hip) return 0;
    const dx = Math.abs(shoulder.x - hip.x) * this.xScale;
    const dy = Math.abs(shoulder.y - hip.y);
    if (dy === 0) return 90;
    const radians = Math.atan(dx / dy);
    return radians * (180 / Math.PI);
  }

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    if (!a || !b || !c) return 180;
    const ax = a.x * this.xScale, ay = a.y;
    const bx = b.x * this.xScale, by = b.y;
    const cx = c.x * this.xScale, cy = c.y;
    const radians =
      Math.atan2(cy - by, cx - bx) -
      Math.atan2(ay - by, ax - bx);

    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  private distance2D(a: Landmark, b: Landmark): number {
    const dx = ((a?.x ?? 0) - (b?.x ?? 0)) * this.xScale;
    const dy = (a?.y ?? 0) - (b?.y ?? 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  private ema(prev: number, curr: number): number {
    return EMA_ALPHA * curr + (1 - EMA_ALPHA) * prev;
  }

  /**
   * Detect knee touch on a specific side.
   */
  private detectKneeTouchForSide(landmarks: Landmark[], isLeft: boolean): boolean {
    const hipIdx = isLeft ? LANDMARK_INDICES.LEFT_HIP : LANDMARK_INDICES.RIGHT_HIP;
    const kneeIdx = isLeft ? LANDMARK_INDICES.LEFT_KNEE : LANDMARK_INDICES.RIGHT_KNEE;
    const ankleIdx = isLeft ? LANDMARK_INDICES.LEFT_ANKLE : LANDMARK_INDICES.RIGHT_ANKLE;

    const hip = landmarks[hipIdx];
    const knee = landmarks[kneeIdx];
    const ankle = landmarks[ankleIdx];

    if (!hip || !knee || !ankle) return false;

    const kneeVis = knee.visibility ?? 0;
    const ankleVis = ankle.visibility ?? 0;
    if (
      kneeVis < THRESHOLDS.KNEE_TOUCH_VIS ||
      ankleVis < THRESHOLDS.KNEE_TOUCH_VIS
    ) {
      return false;
    }

    const kneeAnkleDY = Math.abs(knee.y - ankle.y);
    const kneeAnkleDist = this.distance2D(knee, ankle);
    const kneeAngle = this.calculateAngle(hip, knee, ankle);

    return (
      kneeAnkleDY < THRESHOLDS.KNEE_ANKLE_DY_NEAR &&
      kneeAnkleDist < THRESHOLDS.KNEE_ANKLE_DIST_NEAR &&
      kneeAngle < THRESHOLDS.KNEE_BENT_ANGLE_MAX
    );
  }

  /**
   * Detect knee touch on ANY leg.
   */
  private detectAnyKneeTouch(landmarks: Landmark[]): boolean {
    return (
      this.detectKneeTouchForSide(landmarks, true) ||
      this.detectKneeTouchForSide(landmarks, false)
    );
  }

  analyze(
    landmarks: Landmark[],
    context?: ExerciseAnalysisContext
  ): InchwormResult {
    // استفد من context لو موجود
    if (context?.frame_width && context?.frame_height) {
      this.setAspectRatio(context.frame_width, context.frame_height);
    }

    const lSh = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
    const rSh = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const leftVis = lSh?.visibility ?? 0;
    const rightVis = rSh?.visibility ?? 0;

    const isLeft = leftVis > rightVis;

    const idx = isLeft
      ? {
          sh: LANDMARK_INDICES.LEFT_SHOULDER,
          wrist: LANDMARK_INDICES.LEFT_WRIST,
          hip: LANDMARK_INDICES.LEFT_HIP,
          ankle: LANDMARK_INDICES.LEFT_ANKLE,
        }
      : {
          sh: LANDMARK_INDICES.RIGHT_SHOULDER,
          wrist: LANDMARK_INDICES.RIGHT_WRIST,
          hip: LANDMARK_INDICES.RIGHT_HIP,
          ankle: LANDMARK_INDICES.RIGHT_ANKLE,
        };

    const shVis = landmarks[idx.sh]?.visibility ?? 0;
    const hipVis = landmarks[idx.hip]?.visibility ?? 0;
    if (shVis <= 0.4 || hipVis <= 0.4) {
      return {
        exercise: 'inchworm',
        reps: this.reps,
        stage: this.state,
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
      };
    }

    const sh = landmarks[idx.sh];
    const hip = landmarks[idx.hip];
    const ankle = landmarks[idx.ankle];
    const wrist = landmarks[idx.wrist];

    const rawTorsoAngle = this.calculateVerticalInclination(sh, hip);
    const rawBodyLine = this.calculateAngle(sh, hip, ankle);

    this.smTorsoAngle = this.ema(this.smTorsoAngle, rawTorsoAngle);
    this.smBodyLine = this.ema(this.smBodyLine, rawBodyLine);

    // ✅ كشف الركبة: أي ركبة أثناء أي جزء من الدورة
    const kneeTouchNow =
      this.state === 'walking_out' ||
      this.state === 'plank' ||
      this.state === 'walking_back'
        ? this.detectAnyKneeTouch(landmarks)
        : false;

    if (kneeTouchNow) {
      this.kneeTouchedDuringRep = true;
      this.repAborted = true;
      this.is_correct = false;

      // أول ما الركبة تلمس الأرض أثناء الدورة، نعتبر إننا لازم نرجع نقف
      if (this.state !== 'standing') {
        this.state = 'walking_back';
      }
    }

    // لو اللفة اتلغت، لازم يرجع يقف بالكامل قبل ما يبدأ من جديد
    if (this.repAborted) {
      this.plankStableFrames = 0;

      if (kneeTouchNow) {
        this.feedback_code = 'ERR_KNEES_TOUCHING';
      } else {
        this.feedback_code = 'STAND_UP';
      }

      if (this.smTorsoAngle < THRESHOLDS.STANDING_ANGLE_EXIT) {
        this.standStableFrames++;
        if (this.standStableFrames >= THRESHOLDS.STABLE_FRAMES) {
          // ✅ رجع وقف تمامًا → ابدأ دورة جديدة من الصفر بدون عد
          this.state = 'standing';
          this.feedback_code = 'SETUP_POSITION';
          this.is_correct = true;
          this.kneeTouchedDuringRep = false;
          this.repAborted = false;
          this.standStableFrames = 0;
          this.plankStableFrames = 0;
        }
      } else {
        this.standStableFrames = 0;
      }

      return {
        exercise: 'inchworm',
        reps: this.reps,
        stage: this.state,
        feedback_code: this.feedback_code,
        is_correct: false,
      };
    }

    // بوابة البلانك
    const wristVis = wrist?.visibility ?? 0;
    const ankleVis = ankle?.visibility ?? 0;
    const hipShoulderDY = Math.abs((hip?.y ?? 0) - (sh?.y ?? 0));
    const hipAnkleDY = Math.abs((hip?.y ?? 0) - (ankle?.y ?? 0));
    const wristAnkleDist = wrist && ankle ? this.distance2D(wrist, ankle) : 0;
    const wristAnkleDX = wrist && ankle ? Math.abs((wrist.x ?? 0) - (ankle.x ?? 0)) : 0;
    const shoulderWristDX = wrist && sh ? Math.abs((sh.x - wrist.x) * this.xScale) : 999;

    const hasPlankVisibility = wristVis > 0.45 && ankleVis > 0.45;

    const isPlankPose =
      hasPlankVisibility &&
      this.smTorsoAngle > THRESHOLDS.PLANK_TORSO_ANGLE &&
      this.smBodyLine > THRESHOLDS.PLANK_BODY_LINE &&
      hipShoulderDY < THRESHOLDS.PLANK_HIP_SHOULDER_DY &&
      hipAnkleDY < THRESHOLDS.PLANK_HIP_ANKLE_DY_MAX &&
      wristAnkleDist > THRESHOLDS.PLANK_WRIST_ANKLE_DIST &&
      wristAnkleDX > THRESHOLDS.PLANK_WRIST_ANKLE_DX &&
      shoulderWristDX < THRESHOLDS.PLANK_SHOULDER_WRIST_DX;

    const isExitPlank =
      this.smTorsoAngle < THRESHOLDS.EXIT_PLANK_TORSO ||
      this.smBodyLine < THRESHOLDS.EXIT_PLANK_BODYLINE ||
      hipShoulderDY > THRESHOLDS.EXIT_PLANK_HIP_SHOULDER_DY ||
      hipAnkleDY > THRESHOLDS.EXIT_PLANK_HIP_ANKLE_DY;

    const resetStandStable = () => (this.standStableFrames = 0);
    const resetPlankStable = () => (this.plankStableFrames = 0);

    // ==================== STATE MACHINE ====================
    if (this.state === 'standing') {
      resetStandStable();
      resetPlankStable();
      this.kneeTouchedDuringRep = false;
      this.repAborted = false;
      this.is_correct = true;

      if (this.smTorsoAngle > THRESHOLDS.STANDING_ANGLE_ENTER) {
        this.state = 'walking_out';
        this.feedback_code = 'WALK_OUT';
      } else {
        this.feedback_code = 'SETUP_POSITION';
      }
    }

    else if (this.state === 'walking_out') {
      resetStandStable();

      if (isPlankPose) {
        this.plankStableFrames++;
        this.feedback_code = 'HOLD_PLANK';

        if (this.plankStableFrames >= THRESHOLDS.STABLE_FRAMES) {
          this.state = 'plank';
          this.feedback_code = 'WALK_BACK';
          resetPlankStable();
        }
      } else {
        resetPlankStable();

        if (this.smTorsoAngle < THRESHOLDS.STANDING_ANGLE_EXIT) {
          this.state = 'standing';
          this.feedback_code = 'SETUP_POSITION';
        } else {
          this.feedback_code = 'WALK_OUT';
        }
      }
    }

    else if (this.state === 'plank') {
      this.feedback_code = 'WALK_BACK';
      if (isExitPlank) {
        this.state = 'walking_back';
        resetStandStable();
      }
    }

    else if (this.state === 'walking_back') {
      this.feedback_code = 'STAND_UP';

      if (this.smTorsoAngle < THRESHOLDS.STANDING_ANGLE_EXIT) {
        this.standStableFrames++;
        if (this.standStableFrames >= THRESHOLDS.STABLE_FRAMES) {
          this.reps++;
          this.feedback_code = `COUNT_${this.reps}` as FeedbackSignal;

          this.state = 'standing';
          resetStandStable();
          resetPlankStable();
          this.kneeTouchedDuringRep = false;
          this.repAborted = false;
          this.is_correct = true;
        }
      } else {
        resetStandStable();
      }
    }

    return {
      exercise: 'inchworm',
      reps: this.reps,
      stage: this.state,
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
    };
  }
}