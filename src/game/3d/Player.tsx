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
  MageModel,
} from './MageModel';
export type { MageSkillAnimContext, MageModelProps } from './MageModel';
export {
  createBlockyHunterMesh,
  createLegacyHunterMesh,
  USE_LEGACY_HUNTER,
  animateHunterWalk,
  HunterModel,
} from './HunterModel';
export type { HunterModelProps } from './HunterModel';

/**
 * Handles character respawn audio sequence:
 * Resets any active boss combat music and restarts Overworld chill music from 0:00
 */
export function handlePlayerDeathAndRespawn() {
  import('../audio').then(({ soundManager }) => {
    soundManager.handlePlayerRespawn();
  });
}
