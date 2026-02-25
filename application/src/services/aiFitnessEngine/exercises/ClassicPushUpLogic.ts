import { ExerciseLogic, RepExerciseResult, Landmark ,  } from '../types';

export interface ClassicPushUpResult extends RepExerciseResult {
  exercise: 'classic_push_up';
}

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

const THRESHOLDS = {
  ELBOW_UP_ANGLE: 160,    // الذراع مفرود
  ELBOW_DOWN_ANGLE: 95,   // (زودناها شوية عشان يبقى أسهل يلقط النزول)
  BODY_STRAIGHT_MIN: 155, // تسامح بسيط في استقامة الجسم
  KNEE_DROP_TOLERANCE: 0.1,
} as const;

// 🟢 التعديل الأول: زودنا الرقم ده لـ 5 فريمات عشان الكود يبقى "أهدي" وميخطفش العدة
const STABLE_THRESHOLD = 5; 
const EMA_ALPHA = 0.5; // معامل التنعيم (كل ما يقل، القراءة تبقى أبطأ وأنعم)

export class ClassicPushUpLogic implements ExerciseLogic {
  // 🟢 التعديل الثاني: ضفنا حالة 'setup' في البداية
  private state: 'setup' | 'up' | 'down' = 'setup';
  private reps: number = 0;
  private feedback_code: string = 'SETUP_POSITION';
  private is_correct: boolean = false;
  
  private stableFrames: number = 0;
  
  // متغيرات للتنعيم (Smoothing)
  private smoothedElbowAngle: number = 180;
  private smoothedBodyAngle: number = 180;

  reset(): void {
    this.state = 'setup'; // نرجع لوضع الاستعداد
    this.reps = 0;
    this.feedback_code = 'SETUP_POSITION';
    this.is_correct = false;
    this.stableFrames = 0;
    this.smoothedElbowAngle = 180;
  }

  // دالة حساب الزاوية
  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    if (!a || !b || !c) return 180;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  // دالة التنعيم (Exponential Moving Average)
  private ema(prev: number, curr: number): number {
    return EMA_ALPHA * curr + (1 - EMA_ALPHA) * prev;
  }

  analyze(landmarks: Landmark[]): ClassicPushUpResult {
    // 1. تحديد الجانب الأوضح
    const leftVis = landmarks[LANDMARK_INDICES.LEFT_SHOULDER]?.visibility ?? 0;
    const rightVis = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER]?.visibility ?? 0;
    const isLeft = leftVis > rightVis;

    const indices = isLeft ? {
      sh: LANDMARK_INDICES.LEFT_SHOULDER,
      el: LANDMARK_INDICES.LEFT_ELBOW,
      wr: LANDMARK_INDICES.LEFT_WRIST,
      hip: LANDMARK_INDICES.LEFT_HIP,
      knee: LANDMARK_INDICES.LEFT_KNEE,
      ank: LANDMARK_INDICES.LEFT_ANKLE
    } : {
      sh: LANDMARK_INDICES.RIGHT_SHOULDER,
      el: LANDMARK_INDICES.RIGHT_ELBOW,
      wr: LANDMARK_INDICES.RIGHT_WRIST,
      hip: LANDMARK_INDICES.RIGHT_HIP,
      knee: LANDMARK_INDICES.RIGHT_KNEE,
      ank: LANDMARK_INDICES.RIGHT_ANKLE
    };

    // التأكد من رؤية الجسم
    const isVisible = [indices.sh, indices.el, indices.wr, indices.hip, indices.knee, indices.ank]
      .every(idx => (landmarks[idx]?.visibility ?? 0) > 0.5);

    if (!isVisible) {
      return {
        exercise: 'classic_push_up',
        reps: this.reps,
        stage: this.state === 'setup' ? 'up' : this.state, // عشان الـ UI ميتلخبطش
        feedback_code: 'ERR_CAMERA_VIEW',
        is_correct: false,
      };
    }

    // 2. حساب الزوايا وتنعيمها
    const sh = landmarks[indices.sh];
    const el = landmarks[indices.el];
    const wr = landmarks[indices.wr];
    const hip = landmarks[indices.hip];
    const knee = landmarks[indices.knee];
    const ank = landmarks[indices.ank];

    const rawElbowAngle = this.calculateAngle(sh, el, wr);
    const rawBodyAngle = this.calculateAngle(sh, hip, ank);

    // تطبيق التنعيم (عشان الأرقام ماترعش وتغير الرسائل بسرعة)
    this.smoothedElbowAngle = this.ema(this.smoothedElbowAngle, rawElbowAngle);
    this.smoothedBodyAngle = this.ema(this.smoothedBodyAngle, rawBodyAngle);

    // 3. المنطق (Logic)

    // 🟢 المرحلة الأولى: التجهيز (Setup)
    // الكود مش هيخرج من هنا غير لما تثبت في وضع البلانك
    if (this.state === 'setup') {
        const isArmsStraight = this.smoothedElbowAngle > 150;
        const isBodyStraight = this.smoothedBodyAngle > 150;

        if (isArmsStraight && isBodyStraight) {
            this.stableFrames++;
            // لازم تثبت 10 فريمات (حوالي ثلث ثانية) عشان يبدأ
            if (this.stableFrames > 10) {
                this.state = 'up';
                this.stableFrames = 0;
                this.feedback_code = 'GO_DOWN';
            } else {
                this.feedback_code = 'SETUP_POSITION'; // "Hold still..."
            }
        } else {
            this.stableFrames = 0;
            this.feedback_code = 'SETUP_POSITION';
        }
        
        // نرجع بدري عشان منعدش بالغلط
        return {
            exercise: 'classic_push_up',
            reps: this.reps,
            stage: 'up',
            feedback_code: this.feedback_code,
            is_correct: true
        };
    }

    // 🟢 المرحلة الثانية: التمرين الفعلي
    
    // Anti-Cheat Checks
    if (this.smoothedBodyAngle < THRESHOLDS.BODY_STRAIGHT_MIN) {
      this.feedback_code = 'ERR_FIX_BACK';
      this.is_correct = false;
      if (this.state === 'down') this.state = 'up'; // Reset لو الوضع باظ
    }
    else if (knee.y > ank.y + THRESHOLDS.KNEE_DROP_TOLERANCE) {
       this.feedback_code = 'ERR_KNEES_DROP';
       this.is_correct = false;
       if (this.state === 'down') this.state = 'up';
    }
    else {
      // Form is Good
      this.is_correct = true;

      if (this.state === 'up') {
        // بنراقب النزول
        if (this.smoothedElbowAngle < THRESHOLDS.ELBOW_DOWN_ANGLE) {
           this.stableFrames++;
           // لازم يثبت تحت 5 فريمات عشان نحسب النزلة (يمنع الخطف)
           if (this.stableFrames >= STABLE_THRESHOLD) {
             this.state = 'down';
             this.stableFrames = 0;
             this.feedback_code = 'PUSH_UP';
           }
        } 
        else if (this.smoothedElbowAngle < 120) {
           // نزل بس مش كفاية
           this.feedback_code = 'CMD_GO_LOWER'; 
           this.stableFrames = 0;
        } 
        else {
           // لسه فوق
           this.feedback_code = 'GO_DOWN';
           this.stableFrames = 0;
        }
      } 
      else if (this.state === 'down') {
        // بنراقب الطلوع
        if (this.smoothedElbowAngle > THRESHOLDS.ELBOW_UP_ANGLE) {
           this.stableFrames++;
           // لازم يثبت فوق 5 فريمات عشان نحسب العدة
           if (this.stableFrames >= STABLE_THRESHOLD) {
             this.reps++;
             this.state = 'up';
             this.stableFrames = 0;
             this.feedback_code = 'GOOD_REP';
           }
        } else {
           this.stableFrames = 0;
           this.feedback_code = 'PUSH_UP';
        }
      }
    }

return {
      exercise: 'classic_push_up',
      reps: this.reps,
      // 🔴 التعديل هنا: شيلنا الشرط واستخدمنا as عشان نريح الـ TypeScript
      stage: this.state as 'up' | 'down', 
      feedback_code: this.feedback_code,
      is_correct: this.is_correct,
    };
  }
}