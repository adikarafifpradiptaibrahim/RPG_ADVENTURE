/**
 * ============================================================================
 * PLAYER MODEL FACADE & EXPORTS
 * ============================================================================
 * Menyediakan referensi dan re-export terpadu untuk model 3D Pemburu (The Hunter)
 * serta integrasi dengan mesh pemain lainnya di Chronicles of Eldoria.
 */

export * from './HunterModel';
export {
  createBlockyHunterMesh,
  createLegacyHunterMesh,
  USE_LEGACY_HUNTER,
  animateHunterWalk,
  HunterModel,
} from './HunterModel';

export {
  createPlayerMesh,
  type PlayerMeshObjects,
} from './models';
