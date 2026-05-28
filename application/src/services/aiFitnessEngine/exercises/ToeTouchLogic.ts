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

// 🚀 التعديلات الهندسية في الـ Thresholds
const THRESHOLDS = {
  TOUCH_RATIO: 0.85,     // مسافة التلامس نسبةً لطول الجذع (عشان تشتغل صح مهما الكاميرا بعدت)
  BACK_MIN_ANGLE: 145,   // أقل زاوية لاستقامة الظهر (تسمح بميل بسيط وتمنع الانحناء الشديد)
  KNEE_MIN_ANGLE: 145,   // أقل زاوية لاستقامة الركبة للرجل المرفوعة
  COOLDOWN_FRAMES: 10,   // زودناها شوية لمنع العد المزدوج السريع
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
    // Euclidean Distance
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

    // 1. حساب طول الجذع (المرجع الديناميكي لقياس المسافات)
    const midShoulderX = (lSh.x + rSh.x) / 2;
    const midShoulderY = (lSh.y + rSh.y) / 2;
    const midHipX = (lHip.x + rHip.x) / 2;
    const midHipY = (lHip.y + rHip.y) / 2;
    const torsoLength = Math.sqrt(Math.pow(midShoulderX - midHipX, 2) + Math.pow(midShoulderY - midHipY, 2));
    const dynamicTouchDist = torsoLength * THRESHOLDS.TOUCH_RATIO;

    // 2. حساب مسافات التلامس الصح (Cross-body)
    const distRightHandToLeftFoot = this.getDistance(rw, lFoot);
    const distLeftHandToRightFoot = this.getDistance(lw, rFoot);

    // 3. حساب مسافات التلامس الغلط (Same-side cheating)
    const distRightHandToRightFoot = this.getDistance(rw, rFoot);
    const distLeftHandToLeftFoot = this.getDistance(lw, lFoot);

    // 4. حساب زوايا الظهر (كل رجل على حدة)
    const backAngleLeftStanding  = calculateAngle(lSh, lHip, lKnee); // لو الرجل الشمال هي اللي عالأرض
    const backAngleRightStanding = calculateAngle(rSh, rHip, rKnee); // لو الرجل اليمين هي اللي عالأرض

    // 5. حساب زوايا الركبة (عشان نضمن إن الرجل المرفوعة مفرودة)
    const kneeAngleLeft  = calculateAngle(lHip, lKnee, lFoot);
    const kneeAngleRight = calculateAngle(rHip, rKnee, rFoot);

    if (this.state === 'waiting') {
      const isRightToLeftTouch = distRightHandToLeftFoot < dynamicTouchDist;
      const isLeftToRightTouch = distLeftHandToRightFoot < dynamicTouchDist;
      const isCheatingRight = distRightHandToRightFoot < dynamicTouchDist;
      const isCheatingLeft  = distLeftHandToLeftFoot < dynamicTouchDist;

      // لو بيحاول يلمس أي حاجة
      if (isRightToLeftTouch || isLeftToRightTouch || isCheatingRight || isCheatingLeft) {
        
        // منع الغش لو بيلمس الرجل بنفس الإيد
        if ((isRightToLeftTouch && isCheatingLeft) || (isLeftToRightTouch && isCheatingRight) || isCheatingRight || isCheatingLeft) {
          this.feedback_code = 'OPPOSITE_HAND' as FeedbackSignal;
          this.is_correct = false;
        } 
        // تحليل حركة (إيد يمين -> رجل شمال)
        else if (isRightToLeftTouch) {
          // الرجل الشمال هي اللي مرفوعة، واليمين عالأرض
          if (kneeAngleLeft < THRESHOLDS.KNEE_MIN_ANGLE) {
            this.feedback_code = 'STRAIGHTEN_LEG' as FeedbackSignal;
            this.is_correct = false;
          } else if (backAngleRightStanding < THRESHOLDS.BACK_MIN_ANGLE) {
            this.feedback_code = 'ERR_KEEP_TORSO_STRAIGHT' as FeedbackSignal;
            this.is_correct = false;
          } else {
            // كل الشروط اتحققت
            this.reps++;
            this.state = 'cooldown';
            this.cooldownTimer = 0;
            this.activeSide = 'right_hand_left_leg';
            this.feedback_code = 'GOOD_REP';
            this.is_correct = true;
          }
        } 
        // تحليل حركة (إيد شمال -> رجل يمين)
        else if (isLeftToRightTouch) {
          // الرجل اليمين هي اللي مرفوعة، والشمال عالأرض
          if (kneeAngleRight < THRESHOLDS.KNEE_MIN_ANGLE) {
            this.feedback_code = 'STRAIGHTEN_LEG' as FeedbackSignal;
            this.is_correct = false;
          } else if (backAngleLeftStanding < THRESHOLDS.BACK_MIN_ANGLE) {
            this.feedback_code = 'ERR_KEEP_TORSO_STRAIGHT' as FeedbackSignal;
            this.is_correct = false;
          } else {
            // كل الشروط اتحققت
            this.reps++;
            this.state = 'cooldown';
            this.cooldownTimer = 0;
            this.activeSide = 'left_hand_right_leg';
            this.feedback_code = 'GOOD_REP';
            this.is_correct = true;
          }
        }
      } else {
        // لسه ملمسش
        this.feedback_code = 'KICK_AND_TOUCH';
        this.is_correct = true;
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