import { ExerciseLogic, ToeTouchResult, Landmark } from '../types';

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  // 🟢 مسافة اللمس (زودناها شوية عشان اللمسة الخفيفة تحسب فورًا)
  TOUCH_DISTANCE: 0.20,

  // 🟢 ارتفاع واقعي (الرجل لازم ترفع لمستوى منتصف الفخذ أو أعلى)
  // لو رفعت حتة صغيرة → KICK_HIGHER
  KICK_TOLERANCE: 0.15,

  // 🟢 وقت الـ cooldown (سريع جدًا)
  COOLDOWN_FRAMES: 6,
} as const;

export class ToeTouchLogic implements ExerciseLogic {
  private state: 'waiting' | 'cooldown' = 'waiting';
  private reps: number = 0;
  private feedback_code: string = 'STAND_TALL';
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

  analyze(landmarks: Landmark[]): ToeTouchResult {
    // 1. استخراج النقاط
    const lSh = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
    const rSh = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
    const lw = landmarks[LANDMARK_INDICES.LEFT_WRIST];
    const rw = landmarks[LANDMARK_INDICES.RIGHT_WRIST];
    const la = landmarks[LANDMARK_INDICES.LEFT_ANKLE];
    const ra = landmarks[LANDMARK_INDICES.RIGHT_ANKLE];
    const lHip = landmarks[LANDMARK_INDICES.LEFT_HIP];
    const rHip = landmarks[LANDMARK_INDICES.RIGHT_HIP];

    // التأكد من الرؤية
    const minVisibility = Math.min(
      lSh?.visibility ?? 0, rSh?.visibility ?? 0,
      lw?.visibility ?? 0, rw?.visibility ?? 0,
      la?.visibility ?? 0, ra?.visibility ?? 0,
      lHip?.visibility ?? 0, rHip?.visibility ?? 0
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

    // حساب مركز الجسم
    const bodyCenterX = (lHip.x + rHip.x) / 2;

    // مسافات اللمس للأصابع فقط
    const distRightHandToLeftToes = this.getDistance(rw, la);
    const distLeftHandToRightToes = this.getDistance(lw, ra);

    // 3. المنطق
    if (this.state === 'waiting') {
      this.feedback_code = 'KICK_AND_TOUCH';
      this.is_correct = true;

      // --- الجانب الأول: إيد يمين + رجل شمال ---
      if (
        distRightHandToLeftToes < THRESHOLDS.TOUCH_DISTANCE &&
        rw.x < bodyCenterX + 0.08 &&                    // opposite hand مع تسامح بسيط
        la.y < (lHip.y + THRESHOLDS.KICK_TOLERANCE)     // الارتفاع الصحيح (مصحح)
      ) {
        this.reps++;
        this.state = 'cooldown';
        this.cooldownTimer = 0;
        this.activeSide = 'right_hand_left_leg';
        this.feedback_code = 'GOOD_REP';
        this.is_correct = true;
      }

      // --- الجانب الثاني: إيد شمال + رجل يمين ---
      if (
        this.state === 'waiting' &&
        distLeftHandToRightToes < THRESHOLDS.TOUCH_DISTANCE &&
        lw.x > bodyCenterX - 0.08 &&                    // opposite hand مع تسامح بسيط
        ra.y < (rHip.y + THRESHOLDS.KICK_TOLERANCE)
      ) {
        this.reps++;
        this.state = 'cooldown';
        this.cooldownTimer = 0;
        this.activeSide = 'left_hand_right_leg';
        this.feedback_code = 'GOOD_REP';
        this.is_correct = true;
      }

      // لو قربت تلمس بس الرجل مش مرفوعة كفاية
      if (this.feedback_code === 'KICK_AND_TOUCH') {
        if (distRightHandToLeftToes < THRESHOLDS.TOUCH_DISTANCE + 0.08 ||
            distLeftHandToRightToes < THRESHOLDS.TOUCH_DISTANCE + 0.08) {
          this.feedback_code = 'KICK_HIGHER';
          this.is_correct = false;
        }
      }
    } 
    
    // حالة الراحة
    else if (this.state === 'cooldown') {
      this.cooldownTimer++;

      if (this.cooldownTimer > THRESHOLDS.COOLDOWN_FRAMES) {
        this.state = 'waiting';
        this.activeSide = null;
        this.feedback_code = 'KICK_AND_TOUCH';
      } else if (this.is_correct) {
        this.feedback_code = 'GOOD_REP';
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