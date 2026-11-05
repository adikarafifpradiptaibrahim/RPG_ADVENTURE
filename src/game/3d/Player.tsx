export * from '../player';
export * from '../skills';
export { soundManager } from '../audio';

/**
 * Handles character respawn audio sequence:
 * Resets any active boss combat music and restarts Overworld chill music from 0:00
 */
export function handlePlayerDeathAndRespawn() {
  import('../audio').then(({ soundManager }) => {
    soundManager.handlePlayerRespawn();
  });
}
