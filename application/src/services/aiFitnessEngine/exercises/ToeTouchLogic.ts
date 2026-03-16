import {
  ExerciseLogic,
  ToeTouchResult,
  Landmark,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

const THRESHOLDS = {
  TOUCH_DISTANCE: 0.22,
  BACK_ANGLE_WARNING: 155,
  BACK_CHEAT_ANGLE: 145,
  KNEE_ANGLE_WARNING: 150,
  MIN_LEG_LIFT: -0.15,
  COOLDOWN_FRAMES: 5,

  // لو الكتف اتحرك للأمام بأكتر من 4% من عرض الإطار أمام الورك → غش
  SHOULDER_FORWARD_LIMIT: 0.04,
} as const;

function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  if (!a || !b || !c) return 180;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

export class ToeTouchLogic implements ExerciseLogic {
  private state: 'waiting' | 'cooldown' = 'waiting';
  private reps: number = 0;
  private feedback_code: FeedbackSignal = 'STAND_TALL';
  private is_correct: boolean = false;
  private cooldownTimer: number = 0;
  private activeSide: 'right_hand_left_leg' | 'left_hand_right_leg' | null = null;

  reset(): void {
    this.state = 'waiting';
    this.reps = 0;
    this.feedback_code = 'STAND_TALL';
    this.is_correct = false;
    this.cooldownTimer = 0;
    this.activeSide = null;
  }

  private getDistance(a: Landmark, b: Landmark): number {
    if (!a || !b) return 100;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  analyze(
    landmarks: Landmark[],
    _context?: ExerciseAnalysisContext
  ): ToeTouchResult {
    const lSh   = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
    const rSh   = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const lw    = landmarks[LANDMARK_INDICES.LEFT_WRIST];
    const rw    = landmarks[LANDMARK_INDICES.RIGHT_WRIST];
    const lHip  = landmarks[LANDMARK_INDICES.LEFT_HIP];
    const rHip  = landmarks[LANDMARK_INDICES.RIGHT_HIP];
    const lKnee = landmarks[LANDMARK_INDICES.LEFT_KNEE];
    const rKnee = landmarks[LANDMARK_INDICES.RIGHT_KNEE];
    const lFoot = landmarks[LANDMARK_INDICES.LEFT_FOOT_INDEX];
    const rFoot = landmarks[LANDMARK_INDICES.RIGHT_FOOT_INDEX];

    const minVisibility = Math.min(
      lSh?.visibility  ?? 0, rSh?.visibility  ?? 0,
      lw?.visibility   ?? 0, rw?.visibility   ?? 0,
      lHip?.visibility ?? 0, rHip?.visibility ?? 0,
      lKnee?.visibility ?? 0, rKnee?.visibility ?? 0,
      lFoot?.visibility ?? 0, rFoot?.visibility ?? 0
    );

    if (minVisibility < 0.5) {
      return {
        exercise: 'toe_touch',
        reps: this.reps,
        stage: this.state === 'waiting' ? 'waiting' : 'touched',
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
      };
    }

    const bodyCenterX = (lHip.x + rHip.x) / 2;

    const distRightHandToLeftFoot = this.getDistance(rw, lFoot);
    const distLeftHandToRightFoot = this.getDistance(lw, rFoot);

    const backAngleLeft  = calculateAngle(lSh, lHip, lKnee);
    const backAngleRight = calculateAngle(rSh, rHip, rKnee);
    const avgBackAngle   = (backAngleLeft + backAngleRight) / 2;

    // ✅ فحص إضافي: هل الكتف اتحرك للأمام أمام الورك؟
    const avgShoulderX = (lSh.x + rSh.x) / 2;
    const avgHipX      = (lHip.x + rHip.x) / 2;
    const shoulderForward = avgHipX - avgShoulderX > THRESHOLDS.SHOULDER_FORWARD_LIMIT;

    const backWarning = avgBackAngle < THRESHOLDS.BACK_ANGLE_WARNING;

    // زاوية كبيرة (انحناء واضح) أو كتف متحرك للأمام = غش
    const backCheat = avgBackAngle < THRESHOLDS.BACK_CHEAT_ANGLE || shoulderForward;

    const kneeAngleLeft  = calculateAngle(lHip, lKnee, lFoot);
    const kneeAngleRight = calculateAngle(rHip, rKnee, rFoot);

    const leftKneeWarning  = kneeAngleLeft  < THRESHOLDS.KNEE_ANGLE_WARNING;
    const rightKneeWarning = kneeAngleRight < THRESHOLDS.KNEE_ANGLE_WARNING;
    const legLiftedWarningLeft  = lFoot.y < lHip.y - THRESHOLDS.MIN_LEG_LIFT;
    const legLiftedWarningRight = rFoot.y < rHip.y - THRESHOLDS.MIN_LEG_LIFT;

    if (this.state === 'waiting') {
      this.feedback_code = 'KICK_AND_TOUCH';
      this.is_correct = true;

      const rightHandLeftFootTouch = distRightHandToLeftFoot < THRESHOLDS.TOUCH_DISTANCE;
      const leftHandRightFootTouch = distLeftHandToRightFoot < THRESHOLDS.TOUCH_DISTANCE;
      const rightHandOpposite = rw.x < bodyCenterX + 0.1;
      const leftHandOpposite  = lw.x > bodyCenterX - 0.1;

      if (rightHandLeftFootTouch && rightHandOpposite) {
        if (backCheat) {
          this.feedback_code = 'ERR_KEEP_TORSO_STRAIGHT' as FeedbackSignal;
          this.is_correct = false;
        } else {
          this.reps++;
          this.state = 'cooldown';
          this.cooldownTimer = 0;
          this.activeSide = 'right_hand_left_leg';
          this.feedback_code = 'GOOD_REP';
          this.is_correct = true;
        }
      } else if (leftHandRightFootTouch && leftHandOpposite) {
        if (backCheat) {
          this.feedback_code = 'ERR_KEEP_TORSO_STRAIGHT' as FeedbackSignal;
          this.is_correct = false;
        } else {
          this.reps++;
          this.state = 'cooldown';
          this.cooldownTimer = 0;
          this.activeSide = 'left_hand_right_leg';
          this.feedback_code = 'GOOD_REP';
          this.is_correct = true;
        }
      } else {
        if (backWarning) {
          this.feedback_code = 'STRAIGHTEN_BACK' as FeedbackSignal;
          this.is_correct = false;
        } else if (
          (rightHandLeftFootTouch && !rightHandOpposite) ||
          (leftHandRightFootTouch && !leftHandOpposite)
        ) {
          this.feedback_code = 'OPPOSITE_HAND' as FeedbackSignal;
          this.is_correct = false;
        } else if (rightHandLeftFootTouch || leftHandRightFootTouch) {
          if (
            (rightHandLeftFootTouch && !legLiftedWarningLeft) ||
            (leftHandRightFootTouch && !legLiftedWarningRight)
          ) {
            this.feedback_code = 'KICK_HIGHER';
            this.is_correct = false;
          } else if (
            (rightHandLeftFootTouch && rightKneeWarning) ||
            (leftHandRightFootTouch && leftKneeWarning)
          ) {
            this.feedback_code = 'STRAIGHTEN_LEG' as FeedbackSignal;
            this.is_correct = false;
          } else {
            this.feedback_code = 'KICK_AND_TOUCH';
          }
        } else {
          this.feedback_code = 'KICK_AND_TOUCH';
        }
      }
    } else if (this.state === 'cooldown') {
      this.cooldownTimer++;
      if (this.cooldownTimer > THRESHOLDS.COOLDOWN_FRAMES) {
        this.state = 'waiting';
        this.activeSide = null;
        this.feedback_code = 'KICK_AND_TOUCH';
      } else {
        this.feedback_code = `COUNT_${this.reps}` as FeedbackSignal;
      }
    }

    return {
      exercise: 'toe_touch',
      reps: this.reps,
      stage: this.state === 'waiting' ? 'waiting' : 'touched',
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
    };
  }
}