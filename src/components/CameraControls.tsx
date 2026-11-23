import React from 'react';
export * from '../game/CameraControls';
import { SpectatorHUD, SpectatorHUDProps } from '../game/ui/SpectatorHUD';

export type CameraControlsProps = SpectatorHUDProps;

/**
 * CameraControls Component (Aliases SpectatorHUD)
 * Provides unified camera configuration and interactive HUD overlay for Variable Speed Spectator Freecam (F3).
 */
export const CameraControls: React.FC<CameraControlsProps> = (props) => {
  return <SpectatorHUD {...props} />;
};

export default CameraControls;
