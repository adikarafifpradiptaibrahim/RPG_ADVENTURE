import React from 'react';
export * from '../game/CameraControls';
import { CAMERA_CONFIG, clampCameraPitch, clampCameraDistance, normalizeCameraYaw } from '../game/CameraControls';

export interface CameraControlsProps {
  onRotateCamera?: (deltaX: number, deltaY: number) => void;
  onZoomCamera?: (deltaZoom: number) => void;
}

/**
 * CameraControls Component / Bridge
 * 
 * Provides unified camera configuration and camera orbit state management
 * directly mapped to the Three.js viewport canvas without blocking DOM overlays.
 */
export const CameraControls: React.FC<CameraControlsProps> = () => {
  return null;
};

export default CameraControls;
