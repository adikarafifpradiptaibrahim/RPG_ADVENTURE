/**
 * CameraControls Helper & Integration
 * 
 * Provides utility calculations and constants for 3D camera orbit,
 * touch look zone delta mapping, and zoom constraints.
 */

export interface CameraOrbitState {
  angleH: number;
  angleV: number;
  distance: number;
}

export const CAMERA_CONFIG = {
  MIN_DISTANCE: 3.5,
  MAX_DISTANCE: 14.0,
  MIN_PITCH: 0.08,
  MAX_PITCH: Math.PI / 2.15,
  TOUCH_LOOK_SENSITIVITY_H: 0.0065,
  TOUCH_LOOK_SENSITIVITY_V: 0.005,
  MOUSE_LOOK_SENSITIVITY_H: 0.007,
  MOUSE_LOOK_SENSITIVITY_V: 0.005,
  PINCH_ZOOM_SENSITIVITY: 0.02,
};

export function clampCameraPitch(pitch: number): number {
  return Math.max(CAMERA_CONFIG.MIN_PITCH, Math.min(CAMERA_CONFIG.MAX_PITCH, pitch));
}

export function clampCameraDistance(dist: number): number {
  return Math.max(CAMERA_CONFIG.MIN_DISTANCE, Math.min(CAMERA_CONFIG.MAX_DISTANCE, dist));
}

export function normalizeCameraYaw(yaw: number): number {
  while (yaw > Math.PI * 2) yaw -= Math.PI * 2;
  while (yaw < -Math.PI * 2) yaw += Math.PI * 2;
  return yaw;
}
