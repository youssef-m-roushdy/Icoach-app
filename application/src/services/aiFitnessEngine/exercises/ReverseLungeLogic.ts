import {
  ExerciseLogic,
  Landmark,
  ReverseLungeResult,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  STRIDE_OPEN: 0.25,
  STRIDE_CLOSE: 0.15,
  SQUATGUARDSTRIDE: 0.2,

  // Front knee needs decent depth
  DEPTHKNEEANGLE: 75,

  // Optional light check for back knee bending enough
  BACK_KNEE_BEND_MAX: 130,

  STRAIGHTKNEEUP: 155,
  SQUATGUARDKNEE_BEND: 135,
  MINBODYHEIGHT: 0.2,
} as const;

const STABLE_THRESHOLD = 5;
const EMA_ALPHA = 0.4;

export class ReverseLungeLogic implements ExerciseLogic {
  private state: 'stand' | 'lunge' | 'returning' = 'stand';
  private activeSide: 'LEFT' | 'RIGHT' | 'NONE' = 'NONE';
  private reps = 0;
  private anchorX: number | null = null;
  private stableFrames = 0;
  private depthStableFrames = 0;
  private hasReachedDepth = false;
  private smoothedLeftKneeAngle = 170;
  private smoothedRightKneeAngle = 170;

  reset(): void {
    this.state = 'stand';
    this.activeSide = 'NONE';
    this.reps = 0;
    this.anchorX = null;
    this.stableFrames = 0;
    this.depthStableFrames = 0;
    this.hasReachedDepth = false;
    this.smoothedLeftKneeAngle = 170;
    this.smoothedRightKneeAngle = 170;
  }

  private getDistance(idx1: number, idx2: number, landmarks: Landmark[]): number {
    const p1 = landmarks[idx1];
    const p2 = landmarks[idx2];

    if (
      !p1 ||
      !p2 ||
      (p1.visibility ?? 0) < 0.5 ||
      (p2.visibility ?? 0) < 0.5
    ) {
      return 0;
    }

    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  private calculateKneeAngle(
    hipIdx: number,
    kneeIdx: number,
    ankleIdx: number,
    landmarks: Landmark[]
  ): number | null {
    const hip = landmarks[hipIdx];
    const knee = landmarks[kneeIdx];
    const ankle = landmarks[ankleIdx];

    if (
      !hip ||
      !knee ||
      !ankle ||
      (hip.visibility ?? 0) < 0.5 ||
      (knee.visibility ?? 0) < 0.5 ||
      (ankle.visibility ?? 0) < 0.5
    ) {
      return null;
    }

    const vecThigh = { x: hip.x - knee.x, y: hip.y - knee.y };
    const vecShank = { x: ankle.x - knee.x, y: ankle.y - knee.y };

    const magThigh = Math.hypot(vecThigh.x, vecThigh.y);
    const magShank = Math.hypot(vecShank.x, vecShank.y);
    if (magThigh === 0 || magShank === 0) return null;

    const dot = vecThigh.x * vecShank.x + vecThigh.y * vecShank.y;
    const cos = Math.max(-1, Math.min(1, dot / (magThigh * magShank)));
    return Math.acos(cos) * (180 / Math.PI);
  }

  private ema(prev: number, curr: number): number {
    return EMA_ALPHA * curr + (1 - EMA_ALPHA) * prev;
  }

  analyze(
    landmarks: Landmark[],
    _context?: ExerciseAnalysisContext
  ): ReverseLungeResult {
    let feedback_code: FeedbackSignal = 'SETUP_STAND_STRAIGHT';
    let is_correct = true;

    if (!landmarks || landmarks.length < 33) {
      return {
        exercise: 'reverse_lunge',
        activeSide: 'NONE',
        reps: this.reps,
        stage: 'stand',
        feedback_code: 'ERR_BODY_NOT_VISIBLE',
        is_correct: false,
      };
    }

    // Body height normalization
    const leftBodyHeight = this.getDistance(
      LANDMARK_INDICES.LEFT_SHOULDER,
      LANDMARK_INDICES.LEFT_ANKLE,
      landmarks
    );
    const rightBodyHeight = this.getDistance(
      LANDMARK_INDICES.RIGHT_SHOULDER,
      LANDMARK_INDICES.RIGHT_ANKLE,
      landmarks
    );
    const bodyHeight = Math.max(leftBodyHeight, rightBodyHeight);

    if (bodyHeight < THRESHOLDS.MINBODYHEIGHT) {
      return {
        exercise: 'reverse_lunge',
        activeSide: 'NONE',
        reps: this.reps,
        stage: 'stand',
        feedback_code: 'SETUP_FULL_BODY_VISIBLE',
        is_correct: false,
      };
    }

    // Ankle positions & stride
    const leftAnkle = landmarks[LANDMARK_INDICES.LEFT_ANKLE];
    const rightAnkle = landmarks[LANDMARK_INDICES.RIGHT_ANKLE];
    const leftAnkleVis = (leftAnkle?.visibility ?? 0) > 0.5;
    const rightAnkleVis = (rightAnkle?.visibility ?? 0) > 0.5;

    const strideDistance =
      leftAnkleVis && rightAnkleVis
        ? Math.hypot(leftAnkle.x - rightAnkle.x, leftAnkle.y - rightAnkle.y)
        : 0;

    // Knee angles with EMA smoothing
    const leftKneeRaw = this.calculateKneeAngle(
      LANDMARK_INDICES.LEFT_HIP,
      LANDMARK_INDICES.LEFT_KNEE,
      LANDMARK_INDICES.LEFT_ANKLE,
      landmarks
    );
    const rightKneeRaw = this.calculateKneeAngle(
      LANDMARK_INDICES.RIGHT_HIP,
      LANDMARK_INDICES.RIGHT_KNEE,
      LANDMARK_INDICES.RIGHT_ANKLE,
      landmarks
    );

    if (leftKneeRaw !== null) {
      this.smoothedLeftKneeAngle = this.ema(this.smoothedLeftKneeAngle, leftKneeRaw);
    }
    if (rightKneeRaw !== null) {
      this.smoothedRightKneeAngle = this.ema(this.smoothedRightKneeAngle, rightKneeRaw);
    }

    const minKneeAngle = Math.min(this.smoothedLeftKneeAngle, this.smoothedRightKneeAngle);

    // Global squat-guard anti-cheat
    if (
      strideDistance < THRESHOLDS.SQUATGUARDSTRIDE * bodyHeight &&
      minKneeAngle < THRESHOLDS.SQUATGUARDKNEE_BEND
    ) {
      feedback_code = 'ERR_STEP_FURTHER_BACK';
      is_correct = false;
    }

    // -----------------------------
    // State Machine
    // -----------------------------
    if (this.state === 'stand') {
      const feetTogether = strideDistance < THRESHOLDS.STRIDE_CLOSE * bodyHeight;

      if (feetTogether && leftAnkleVis && rightAnkleVis) {
        this.anchorX = (leftAnkle.x + rightAnkle.x) / 2;
      }

      const strideOpen = strideDistance > THRESHOLDS.STRIDE_OPEN * bodyHeight;

      // Detect potential active side
      let potentialActiveSide: 'LEFT' | 'RIGHT' | 'NONE' = 'NONE';
      if (this.anchorX !== null && leftAnkleVis && rightAnkleVis) {
        const leftDev = Math.abs(leftAnkle.x - this.anchorX);
        const rightDev = Math.abs(rightAnkle.x - this.anchorX);
        potentialActiveSide =
          leftDev > rightDev
            ? 'LEFT'
            : rightDev > leftDev
              ? 'RIGHT'
              : 'NONE';
      }

      if (strideOpen) {
        this.stableFrames++;
        if (this.stableFrames >= STABLE_THRESHOLD) {
          this.state = 'lunge';
          this.activeSide =
            potentialActiveSide !== 'NONE' ? potentialActiveSide : 'RIGHT';
          this.stableFrames = 0;
          this.hasReachedDepth = false;
          this.depthStableFrames = 0;
        }
      } else {
        this.stableFrames = 0;
      }

      if (feedback_code === 'SETUP_STAND_STRAIGHT') {
        feedback_code = strideOpen ? 'CMD_GO_LOWER' : 'SETUP_STAND_STRAIGHT';
      }
    }

    else if (this.state === 'lunge') {
      // Fallback active side if still NONE
      if (
        this.activeSide === 'NONE' &&
        this.anchorX !== null &&
        leftAnkleVis &&
        rightAnkleVis
      ) {
        const leftDev = Math.abs(leftAnkle.x - this.anchorX);
        const rightDev = Math.abs(rightAnkle.x - this.anchorX);
        this.activeSide = leftDev > rightDev ? 'LEFT' : 'RIGHT';
      }

      // If activeSide = LEFT, that means LEFT foot stepped back,
      // so RIGHT knee is the front knee and LEFT knee is the back knee.
      const frontKneeAngle =
        this.activeSide === 'LEFT'
          ? this.smoothedRightKneeAngle
          : this.smoothedLeftKneeAngle;

      const backKneeAngle =
        this.activeSide === 'LEFT'
          ? this.smoothedLeftKneeAngle
          : this.smoothedRightKneeAngle;

      const frontDeepEnough = frontKneeAngle <= THRESHOLDS.DEPTHKNEEANGLE;
      const backBentEnough = backKneeAngle <= THRESHOLDS.BACK_KNEE_BEND_MAX;

      if (frontDeepEnough && backBentEnough) {
        this.depthStableFrames++;
        if (this.depthStableFrames >= STABLE_THRESHOLD) {
          this.hasReachedDepth = true;
          this.state = 'returning';
          this.depthStableFrames = 0;
        }
      } else {
        this.depthStableFrames = Math.max(0, this.depthStableFrames - 1);
      }

      if (feedback_code === 'SETUP_STAND_STRAIGHT') {
        feedback_code = this.hasReachedDepth ? 'CMD_RETURN_START' : 'CMD_GO_LOWER';
      }
    }

    else if (this.state === 'returning') {
      const feetTogether = strideDistance < THRESHOLDS.STRIDE_CLOSE * bodyHeight;
      const avgKnee = (this.smoothedLeftKneeAngle + this.smoothedRightKneeAngle) / 2;
      const isStanding = avgKnee > THRESHOLDS.STRAIGHTKNEEUP;

      if (feetTogether && isStanding) {
        this.stableFrames++;
        if (this.stableFrames >= STABLE_THRESHOLD) {
          if (this.hasReachedDepth) {
            this.reps++;
            feedback_code = `COUNT_${this.reps}` as FeedbackSignal;
          }

          this.state = 'stand';
          this.activeSide = 'NONE';
          this.hasReachedDepth = false;
          this.stableFrames = 0;
          this.depthStableFrames = 0;

          if (leftAnkleVis && rightAnkleVis) {
            this.anchorX = (leftAnkle.x + rightAnkle.x) / 2;
          }
        }
      } else {
        this.stableFrames = Math.max(0, this.stableFrames - 1);

        if (feedback_code === 'SETUP_STAND_STRAIGHT') {
          feedback_code = isStanding ? 'CMD_FEET_TOGETHER' : 'CMD_STAND_UP';
        }
      }
    }

    return {
      exercise: 'reverse_lunge',
      activeSide: this.activeSide,
      reps: this.reps,
      stage: this.state === 'stand' ? 'stand' : 'lunge',
      feedback_code,
      is_correct,
    };
  }
}