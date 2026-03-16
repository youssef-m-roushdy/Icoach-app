import {
  Landmark,
  BirdDogResult,
  ExerciseLogic,
  FeedbackSignal,
  ExerciseAnalysisContext,
} from '../types';
import { PoseLandmarks, calculateAngle, EMA } from '../utils';

type Stage = 'setup' | 'neutral' | 'extended';
type Side  = 'LEFT' | 'RIGHT' | 'NONE';

export class BirdDogLogic implements ExerciseLogic {
  private reps  = 0;
  private stage: Stage = 'setup';

  private displayedFeedback: FeedbackSignal = 'SETUP_ALL_FOURS' as FeedbackSignal;
  private isCorrect = true;

  private activeSide: Side = 'NONE';

  private pendingFeedback: FeedbackSignal | null = null;
  private pendingFrames = 0;
  private readonly FEEDBACK_DELAY = 4;

  private postureBadFrames = 0;
  private setupFrames  = 0;
  private stableFrames = 0;

  private readonly SETUP_CONFIRM = 3;
  private readonly CONFIRM       = 2;

  private emaHip   = new EMA(0.35);
  private emaKnee  = new EMA(0.35);
  private emaTorso = new EMA(0.28);

  // ----------------------------------------
  // Thresholds
  // ----------------------------------------
  private readonly EXTENSION     = 145;
  private readonly KNEE_STRAIGHT = 138;
  private readonly RETURN        = 145;
  private readonly MAX_TORSO     = 45;
  private readonly VIS           = 0.40;

  private readonly KNEE_DOWN_MARGIN            = 0.010;
  private readonly WRIST_BELOW_SHOULDER_MARGIN = 0.025;
  private readonly WRIST_SHOULDER_X_TOL        = 0.22;
  private readonly LEG_LIFT_MARGIN             = 0.16;

  // ✅ للأيدي: threshold خفيف جداً للـ feedback فقط (مش للعد)
  private readonly ARM_LIFT_MARGIN  = 0.20;
  private readonly WRIST_VIS_SOFT   = 0.15;

  analyze(lm: Landmark[], _context?: ExerciseAnalysisContext): BirdDogResult {
    const lS = lm[PoseLandmarks.LEFT_SHOULDER];
    const rS = lm[PoseLandmarks.RIGHT_SHOULDER];
    const lH = lm[PoseLandmarks.LEFT_HIP];
    const rH = lm[PoseLandmarks.RIGHT_HIP];
    const lK = lm[PoseLandmarks.LEFT_KNEE];
    const rK = lm[PoseLandmarks.RIGHT_KNEE];
    const lA = lm[PoseLandmarks.LEFT_ANKLE];
    const rA = lm[PoseLandmarks.RIGHT_ANKLE];
    const lW = lm[PoseLandmarks.LEFT_WRIST];
    const rW = lm[PoseLandmarks.RIGHT_WRIST];
    const lE = lm[PoseLandmarks.LEFT_ELBOW];
    const rE = lm[PoseLandmarks.RIGHT_ELBOW];

    // ----------------------------------------
    // 1) Visibility — جسم أساسي فقط بدون رسغين
    // ----------------------------------------
    if (!this.visible([lS, rS, lH, rH, lK, rK, lA, rA])) {
      this.stage       = 'setup';
      this.activeSide  = 'NONE';
      this.stableFrames = 0;
      this.setupFrames  = 0;
      return this.commit('ERR_BODY_NOT_VISIBLE' as FeedbackSignal, false, true);
    }

    // ----------------------------------------
    // 2) Setup / all-fours detection
    // ----------------------------------------
    const leftKneeDown  = lK.y > lH.y + this.KNEE_DOWN_MARGIN;
    const rightKneeDown = rK.y > rH.y + this.KNEE_DOWN_MARGIN;

    // ✅ Wrist placement: رسغ أو مرفق كـ fallback
    const leftWristPlaced  = this.isHandPlaced(lW, lE, lS);
    const rightWristPlaced = this.isHandPlaced(rW, rE, rS);

    const allFoursReady =
      leftKneeDown && rightKneeDown && leftWristPlaced && rightWristPlaced;

    if (this.stage === 'setup') {
      if (allFoursReady) {
        this.setupFrames++;
        if (this.setupFrames >= this.SETUP_CONFIRM) {
          this.stage       = 'neutral';
          this.setupFrames = 0;
          this.activeSide  = 'NONE';
          return this.commit('CMD_EXTEND' as FeedbackSignal, true, true);
        }
        return this.commit('SETUP_ALL_FOURS' as FeedbackSignal, true);
      }
      this.setupFrames = 0;
      return this.commit('SETUP_ALL_FOURS' as FeedbackSignal, true);
    }

    // ----------------------------------------
    // 3) Detect active leg
    // ----------------------------------------
    const leftLegUp  = lA.y < lH.y + this.LEG_LIFT_MARGIN;
    const rightLegUp = rA.y < rH.y + this.LEG_LIFT_MARGIN;

    if ((leftLegUp && rightLegUp) || (!leftLegUp && !rightLegUp)) {
      this.stage        = 'neutral';
      this.activeSide   = 'NONE';
      this.stableFrames = 0;
      return this.commit('CMD_EXTEND' as FeedbackSignal, true);
    }

    const activeLeg: Side = leftLegUp ? 'LEFT' : 'RIGHT';
    this.activeSide = activeLeg;

    // ----------------------------------------
    // 4) ✅ Arm feedback فقط — مش بيأثر على العد
    //    لو الأيدي ظاهرة وشايف غلطة نقول للمستخدم بس مانوقفش العد
    // ----------------------------------------
    const leftArmUp  = this.isArmRaised(lW, lE, lS);
    const rightArmUp = this.isArmRaised(rW, rE, rS);

    // لو شايف نفس الجانب مرفوع (غلطة واضحة ومتأكد منها)
    const sameArmVisible =
      activeLeg === 'LEFT'
        ? (lW?.visibility || 0) > 0.35
        : (rW?.visibility || 0) > 0.35;

    if (sameArmVisible) {
      const sameArmUp = activeLeg === 'LEFT' ? leftArmUp : rightArmUp;
      if (sameArmUp) {
        this.stableFrames = 0;
        return this.commit('ERR_OPPOSITE_LIMBS' as FeedbackSignal, false, true);
      }
    }

    // ----------------------------------------
    // 5) Working joints
    // ----------------------------------------
    const hip   = activeLeg === 'LEFT' ? lH : rH;
    const knee  = activeLeg === 'LEFT' ? lK : rK;
    const ankle = activeLeg === 'LEFT' ? lA : rA;
    const oppSh = activeLeg === 'LEFT' ? rS : lS;

    // ----------------------------------------
    // 6) Angles
    // ----------------------------------------
    const hipAngle  = this.emaHip.update(calculateAngle(oppSh, hip, knee));
    const kneeAngle = this.emaKnee.update(calculateAngle(hip, knee, ankle));

    // ----------------------------------------
    // 7) Torso check
    // ----------------------------------------
    const midShoulderX = (lS.x + rS.x) / 2;
    const midShoulderY = (lS.y + rS.y) / 2;
    const midHipX      = (lH.x + rH.x) / 2;
    const midHipY      = (lH.y + rH.y) / 2;

    const torso = this.emaTorso.update(
      Math.atan2(
        Math.abs(midShoulderY - midHipY),
        Math.abs(midShoulderX - midHipX) + 1e-6
      ) * (180 / Math.PI)
    );

    if (torso > this.MAX_TORSO) {
      this.stableFrames = 0;
      return this.commit('ERR_FLATTEN_BACK' as FeedbackSignal, false);
    }

    // ----------------------------------------
    // 8) ✅ State machine — بيعتمد على الرجل فقط
    // ----------------------------------------
    if (this.stage === 'neutral') {
      const isHipGood  = hipAngle  > this.EXTENSION;
      const isKneeGood = kneeAngle > this.KNEE_STRAIGHT;

      if (isHipGood && isKneeGood) {
        this.stableFrames++;
        if (this.stableFrames >= this.CONFIRM) {
          this.reps++;
          this.stage        = 'extended';
          this.stableFrames = 0;
          return this.commit(`COUNT_${this.reps}` as FeedbackSignal, true, true);
        }
      } else {
        this.stableFrames = 0;
        if (!isKneeGood) return this.commit('ERR_STRAIGHTEN_LEG'  as FeedbackSignal, false);
        if (!isHipGood)  return this.commit('CMD_EXTEND_FULLY'    as FeedbackSignal, false);
      }

      // ✅ لو شايف الأيدي المعاكسة مش مرفوعة، نقول له يرفعها (feedback بس مش بلوكر)
      const oppositeArmUp = activeLeg === 'LEFT' ? rightArmUp : leftArmUp;
      const oppositeVisible =
        activeLeg === 'LEFT'
          ? (rW?.visibility || 0) > this.WRIST_VIS_SOFT || (rE?.visibility || 0) > 0.25
          : (lW?.visibility || 0) > this.WRIST_VIS_SOFT || (lE?.visibility || 0) > 0.25;

      if (oppositeVisible && !oppositeArmUp) {
        return this.commit('CMD_RAISE_OPPOSITE_ARM' as FeedbackSignal, true);
      }

      return this.commit('CMD_EXTEND' as FeedbackSignal, true);
    }

    if (this.stage === 'extended') {
      if (hipAngle < this.RETURN) {
        this.stage        = 'neutral';
        this.activeSide   = 'NONE';
        this.stableFrames = 0;
        return this.commit('CMD_EXTEND' as FeedbackSignal, true);
      }
      return this.commit('HOLD_EXTENSION' as FeedbackSignal, true);
    }

    return this.commit(this.displayedFeedback, this.isCorrect);
  }

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  /** هل اليد موضوعة على الأرض؟ (رسغ أو مرفق كـ fallback) */
  private isHandPlaced(
    wrist: Landmark | undefined,
    elbow: Landmark | undefined,
    shoulder: Landmark
  ): boolean {
    if ((wrist?.visibility || 0) > 0.20) {
      return (
        wrist!.y > shoulder.y - this.WRIST_BELOW_SHOULDER_MARGIN &&
        Math.abs(wrist!.x - shoulder.x) < this.WRIST_SHOULDER_X_TOL
      );
    }
    if ((elbow?.visibility || 0) > 0.30) {
      return elbow!.y > shoulder.y - 0.05;
    }
    return true; // مش شايف → افترض موضوعة عشان متمنعش الـ setup
  }

  /** هل الأيدي مرفوعة؟ (رسغ أو مرفق كـ fallback) */
  private isArmRaised(
    wrist: Landmark | undefined,
    elbow: Landmark | undefined,
    shoulder: Landmark
  ): boolean {
    if ((wrist?.visibility || 0) > this.WRIST_VIS_SOFT) {
      return wrist!.y < shoulder.y + this.ARM_LIFT_MARGIN;
    }
    if ((elbow?.visibility || 0) > 0.30) {
      return elbow!.y < shoulder.y + 0.08;
    }
    return false;
  }

  private commit(code: FeedbackSignal, correct: boolean, immediate = false): BirdDogResult {
    const isCritical =
      immediate || code.startsWith('COUNT_') || code.startsWith('ERR_');

    if (isCritical) {
      this.displayedFeedback = code;
      this.pendingFeedback   = null;
      this.pendingFrames     = 0;
      this.isCorrect         = correct;
      return this.out();
    }

    if (this.pendingFeedback !== code) {
      this.pendingFeedback = code;
      this.pendingFrames   = 0;
    } else {
      this.pendingFrames++;
      if (this.pendingFrames >= this.FEEDBACK_DELAY) {
        this.displayedFeedback = code;
        this.isCorrect         = correct;
      }
    }

    return this.out();
  }

  private visible(lms: Array<Landmark | undefined>): boolean {
    return lms.every((l) => (l?.visibility || 0) > this.VIS);
  }

  private out(): BirdDogResult {
    return {
      exercise:      'bird_dog',
      reps:          this.reps,
      stage:         this.stage,
      feedback_code: this.displayedFeedback,
      is_correct:    this.isCorrect,
    };
  }

  reset(): void {
    this.reps  = 0;
    this.stage = 'setup';

    this.displayedFeedback = 'SETUP_ALL_FOURS' as FeedbackSignal;
    this.isCorrect         = true;

    this.activeSide       = 'NONE';
    this.pendingFeedback  = null;
    this.pendingFrames    = 0;
    this.setupFrames      = 0;
    this.stableFrames     = 0;
    this.postureBadFrames = 0;

    this.emaHip.reset();
    this.emaKnee.reset();
    this.emaTorso.reset();
  }
}