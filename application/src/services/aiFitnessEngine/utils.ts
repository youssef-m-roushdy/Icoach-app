/**
 * AI Fitness Engine - Utility Functions
 * Math and geometry helpers for exercise analysis
 *
 * Improvements:
 * - Shared point extraction helper to reduce duplication
 * - Safer numeric guards for invalid / partial inputs
 * - Consistent time helpers in milliseconds
 * - Stronger typing for point conversion
 * - EMA validation and clearer API
 */

import type { Landmark } from './types';

// =====================================================
// Shared Point Types
// =====================================================

export type PointLike = Landmark | ReadonlyArray<number>;

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

// =====================================================
// Internal Helpers
// =====================================================

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toXY(point: PointLike): Point2D {
  if ('x' in point) {
    return {
      x: isFiniteNumber(point.x) ? point.x : 0,
      y: isFiniteNumber(point.y) ? point.y : 0,
    };
  }

  return {
    x: isFiniteNumber(point[0]) ? point[0] : 0,
    y: isFiniteNumber(point[1]) ? point[1] : 0,
  };
}

function toXYZ(point: PointLike): Point3D {
  if ('x' in point) {
    return {
      x: isFiniteNumber(point.x) ? point.x : 0,
      y: isFiniteNumber(point.y) ? point.y : 0,
      z: isFiniteNumber(point.z) ? point.z : 0,
    };
  }

  return {
    x: isFiniteNumber(point[0]) ? point[0] : 0,
    y: isFiniteNumber(point[1]) ? point[1] : 0,
    z: isFiniteNumber(point[2]) ? point[2] : 0,
  };
}

// =====================================================
// Geometry Utilities
// =====================================================

/**
 * Calculate the angle between three points (in degrees).
 * Point B is the center point (vertex).
 *
 * Supports:
 * - Landmark objects
 * - [x, y]
 * - [x, y, z]
 * - generic numeric arrays
 *
 * Returns a value between 0 and 180.
 */
export function calculateAngle(
  a: PointLike,
  b: PointLike,
  c: PointLike
): number {
  const { x: ax, y: ay } = toXY(a);
  const { x: bx, y: by } = toXY(b);
  const { x: cx, y: cy } = toXY(c);

  const radians =
    Math.atan2(cy - by, cx - bx) -
    Math.atan2(ay - by, ax - bx);

  let angle = Math.abs((radians * 180) / Math.PI);

  if (!Number.isFinite(angle)) {
    return 0;
  }

  if (angle > 180) {
    angle = 360 - angle;
  }

  return angle;
}

/**
 * Calculate Euclidean distance between two points (2D).
 */
export function calculateDistance(
  a: PointLike,
  b: PointLike
): number {
  const { x: ax, y: ay } = toXY(a);
  const { x: bx, y: by } = toXY(b);

  const dx = ax - bx;
  const dy = ay - by;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return Number.isFinite(distance) ? distance : 0;
}

/**
 * Calculate Euclidean distance between two points (3D).
 * Useful when z is available and depth-aware logic is needed.
 */
export function calculateDistance3D(
  a: PointLike,
  b: PointLike
): number {
  const { x: ax, y: ay, z: az } = toXYZ(a);
  const { x: bx, y: by, z: bz } = toXYZ(b);

  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return Number.isFinite(distance) ? distance : 0;
}

/**
 * Calculate midpoint between two points (2D).
 * Useful for finding body center (e.g. between shoulders).
 */
export function midpoint(
  a: PointLike,
  b: PointLike
): Point2D {
  const { x: ax, y: ay } = toXY(a);
  const { x: bx, y: by } = toXY(b);

  return {
    x: (ax + bx) / 2,
    y: (ay + by) / 2,
  };
}

/**
 * Calculate midpoint between two points (3D).
 */
export function midpoint3D(
  a: PointLike,
  b: PointLike
): Point3D {
  const { x: ax, y: ay, z: az } = toXYZ(a);
  const { x: bx, y: by, z: bz } = toXYZ(b);

  return {
    x: (ax + bx) / 2,
    y: (ay + by) / 2,
    z: (az + bz) / 2,
  };
}

/**
 * Extract [x, y, z] coordinates from a Landmark object.
 */
export function toPoint(landmark: Landmark): [number, number, number] {
  return [
    isFiniteNumber(landmark.x) ? landmark.x : 0,
    isFiniteNumber(landmark.y) ? landmark.y : 0,
    isFiniteNumber(landmark.z) ? landmark.z : 0,
  ];
}

/**
 * Return true if a landmark is considered visible enough.
 */
export function hasVisibility(
  landmark: Landmark | undefined,
  threshold = 0.5
): boolean {
  if (!landmark) return false;

  if (!isFiniteNumber(landmark.visibility)) {
    // If visibility is absent, assume visible for backward compatibility
    return true;
  }

  return landmark.visibility >= threshold;
}

/**
 * Clamp a number to a range.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

// =====================================================
// Smoothing
// =====================================================

/**
 * Exponential Moving Average (EMA) for smoothing values.
 * Helps reduce jitter in pose detection.
 */
export class EMA {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = clamp(alpha, 0, 1);
  }

  /**
   * Update the EMA with a new value.
   */
  update(x: number): number {
    if (!Number.isFinite(x)) {
      return this.value ?? 0;
    }

    if (this.value === null) {
      this.value = x;
    } else {
      this.value = this.alpha * x + (1 - this.alpha) * this.value;
    }

    return this.value;
  }

  /**
   * Legacy accessor kept for backward compatibility.
   */
  getValue(): number | null {
    return this.value;
  }

  /**
   * Preferred accessor for current smoothed value.
   */
  get(): number {
    return this.value ?? 0;
  }

  /**
   * Reset internal EMA state.
   */
  reset(): void {
    this.value = null;
  }

  /**
   * Change smoothing factor at runtime.
   */
  setAlpha(alpha: number): void {
    this.alpha = clamp(alpha, 0, 1);
  }
}

// =====================================================
// MediaPipe Pose Landmark Indices
// =====================================================

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

// =====================================================
// Time Helpers
// =====================================================

/**
 * Get current timestamp in milliseconds.
 * This should be the primary time unit used across the engine.
 */
export function getCurrentTimeMs(): number {
  return Date.now();
}

/**
 * Get current timestamp in seconds.
 * Use only when you explicitly need seconds.
 */
export function getCurrentTimeSeconds(): number {
  return Date.now() / 1000;
}

/**
 * Legacy helper kept for backward compatibility.
 * Historically this returned seconds.
 *
 * Prefer:
 * - getCurrentTimeMs()
 * - getCurrentTimeSeconds()
 */
export function getCurrentTime(): number {
  return getCurrentTimeSeconds();
}