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

const DEFAULT_MOUSE_H = 0.007;
const DEFAULT_MOUSE_V = 0.005;

let currentSensitivityMult = (() => {
  if (typeof window === 'undefined') return 1.0;
  try {
    const saved = localStorage.getItem('eldoria_mouse_sensitivity');
    if (saved) return Math.max(0.2, Math.min(3.0, parseFloat(saved)));
  } catch {}
  return 1.0;
})();

export const CAMERA_CONFIG = {
  MIN_DISTANCE: 3.5,
  MAX_DISTANCE: 14.0,
  MIN_PITCH: 0.08,
  MAX_PITCH: Math.PI / 2.15,
  TOUCH_LOOK_SENSITIVITY_H: 0.0065,
  TOUCH_LOOK_SENSITIVITY_V: 0.005,
  MOUSE_LOOK_SENSITIVITY_H: DEFAULT_MOUSE_H * currentSensitivityMult,
  MOUSE_LOOK_SENSITIVITY_V: DEFAULT_MOUSE_V * currentSensitivityMult,
  PINCH_ZOOM_SENSITIVITY: 0.02,
};

export function getMouseSensitivityMultiplier(): number {
  return currentSensitivityMult;
}

export function setMouseSensitivityMultiplier(mult: number): void {
  currentSensitivityMult = Math.max(0.2, Math.min(3.0, mult));
  try {
    localStorage.setItem('eldoria_mouse_sensitivity', currentSensitivityMult.toString());
  } catch {}
  CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_H = DEFAULT_MOUSE_H * currentSensitivityMult;
  CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_V = DEFAULT_MOUSE_V * currentSensitivityMult;
}

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

/**
 * Spectator / Freecam Mode (F3) Dynamic Flight Speed Config
 * Variable Speed Flight:
 * - Hold [Shift] for Sprint Fly (3.0x speed multiplier)
 * - Hold [Ctrl] or [Alt] for Slow Precision Fly (0.3x speed multiplier)
 * - Scroll Wheel up/down to dynamically tune base flight speed (2.0 to 180.0 m/s)
 */
export const SPECTATOR_CONFIG = {
  DEFAULT_SPEED: 22.0,
  MIN_SPEED: 2.0,
  MAX_SPEED: 180.0,
  SPRINT_MULTIPLIER: 3.0,
  SLOW_MULTIPLIER: 0.3,
  SCROLL_STEP: 4.0,
};

export type SpectatorSpeedMode = 'sprint' | 'slow' | 'normal';

export interface SpectatorSpeedResult {
  speed: number;
  multiplier: number;
  mode: SpectatorSpeedMode;
}

export function clampSpectatorSpeed(speed: number): number {
  return Math.max(SPECTATOR_CONFIG.MIN_SPEED, Math.min(SPECTATOR_CONFIG.MAX_SPEED, speed));
}

export function calculateSpectatorSpeed(
  baseSpeed: number,
  isSprint: boolean,
  isSlow: boolean
): SpectatorSpeedResult {
  let multiplier = 1.0;
  let mode: SpectatorSpeedMode = 'normal';

  if (isSprint) {
    multiplier = SPECTATOR_CONFIG.SPRINT_MULTIPLIER;
    mode = 'sprint';
  } else if (isSlow) {
    multiplier = SPECTATOR_CONFIG.SLOW_MULTIPLIER;
    mode = 'slow';
  }

  return {
    speed: baseSpeed * multiplier,
    multiplier,
    mode,
  };
}
