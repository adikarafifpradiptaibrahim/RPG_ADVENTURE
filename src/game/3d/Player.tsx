export * from '../player';
export * from '../skills';
export { soundManager } from '../audio';
export { createHeroicKnightMesh, createLegacyKnightMesh, USE_LEGACY_KNIGHT, animateKnightWalk } from './KnightModel';
export {
  createHeroicMageMesh,
  createLegacyMageMesh,
  USE_LEGACY_MAGE,
  animateMageWalk,
  animateMageSkillPose,
} from './MageModel';
export type { MageSkillAnimContext } from './MageModel';

/**
 * Handles character respawn audio sequence:
 * Resets any active boss combat music and restarts Overworld chill music from 0:00
 */
export function handlePlayerDeathAndRespawn() {
  import('../audio').then(({ soundManager }) => {
    soundManager.handlePlayerRespawn();
  });
}
