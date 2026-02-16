/**
 * AI Fitness Engine - Utility Functions
 * Math and geometry helpers for exercise analysis
 */

import { Landmark } from './types';

/**
 * Calculate the angle between three points (in degrees)
 * Supports both [x,y] arrays AND Landmark objects directly.
 * Formula: B is the center point (vertex).
 */
export function calculateAngle(
  a: Landmark | number[], 
  b: Landmark | number[], 
  c: Landmark | number[]
): number {
  // Extract coordinates dynamically
  const ax = 'x' in a ? a.x : a[0];
  const ay = 'y' in a ? a.y : a[1];

  const bx = 'x' in b ? b.x : b[0];
  const by = 'y' in b ? b.y : b[1];

  const cx = 'x' in c ? c.x : c[0];
  const cy = 'y' in c ? c.y : c[1];

  const radians = Math.atan2(cy - by, cx - bx) - Math.atan2(ay - by, ax - bx);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return angle;
}

/**
 * Calculate Euclidean distance between two points (2D)
 */
export function calculateDistance(
  a: Landmark | number[],
  b: Landmark | number[]
): number {
  const ax = 'x' in a ? a.x : a[0];
  const ay = 'y' in a ? a.y : a[1];

  const bx = 'x' in b ? b.x : b[0];
  const by = 'y' in b ? b.y : b[1];

  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Midpoint between two points
 * Useful for finding body center (e.g., between shoulders)
 */
export function midpoint(
  a: Landmark | number[],
  b: Landmark | number[]
): { x: number; y: number } {
  const ax = 'x' in a ? a.x : a[0];
  const ay = 'y' in a ? a.y : a[1];

  const bx = 'x' in b ? b.x : b[0];
  const by = 'y' in b ? b.y : b[1];

  return {
    x: (ax + bx) / 2,
    y: (ay + by) / 2
  };
}

/**
 * Extract [x, y, z] coordinates from a Landmark object
 */
export function toPoint(landmark: Landmark): number[] {
  return [landmark.x, landmark.y, landmark.z || 0];
}

/**
 * Exponential Moving Average (EMA) class for smoothing values
 * Helps reduce jitter in pose detection
 */
export class EMA {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }

  update(x: number): number {
    if (this.value === null) {
      this.value = x;
    } else {
      this.value = this.alpha * x + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  // القديمة (سيبناها عشان لو كود تاني بيستخدمها)
  getValue(): number | null {
    return this.value;
  }

  // ✅ الجديدة (عشان KneeTapLogic بيستخدم .get)
  get(): number {
    return this.value ?? 0;
  }

  reset(): void {
    this.value = null;
  }
}

/**
 * MediaPipe Pose Landmark indices
 */
export const PoseLandmarks = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Get current timestamp in seconds
 */
export function getCurrentTime(): number {
  return Date.now() / 1000;
}