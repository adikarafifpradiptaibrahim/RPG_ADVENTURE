/**
 * Root soundManager & Audio Asset Re-export
 */
import whereTheRiverBendsUrl from './assets/audio/Where_the_River_Bends.mp3';
import theQuietArchiveUrl from './assets/audio/The_Quiet_Archive.mp3';
import titanBossBgmUrl from './assets/audio/Titan_s_Heavy_Tread.mp3';
import ironMawWormBgmUrl from './assets/audio/The_Iron_Maw.mp3';
import basaltDragonBgmUrl from './assets/audio/Basalt_and_Brimstone.mp3';
import arcaneBeamSfxUrl from './assets/sfx/mage/arcane beam/magic_beam.wav';
import starfallCastingSfxUrl from './assets/sfx/mage/starfall/Magic_circle_casting.wav';
import starfallImpactSfxUrl from './assets/sfx/mage/starfall/meteor_fall.wav';
import cahayaSpellSfxUrl from './assets/sfx/mage/cahaya/casting_spell.wav';
import { soundManager } from './game/audio';

export {
  whereTheRiverBendsUrl,
  theQuietArchiveUrl,
  titanBossBgmUrl,
  ironMawWormBgmUrl,
  basaltDragonBgmUrl,
  arcaneBeamSfxUrl,
  starfallCastingSfxUrl,
  starfallImpactSfxUrl,
  cahayaSpellSfxUrl,
  whereTheRiverBendsUrl as relaxBgmUrl,
  whereTheRiverBendsUrl as overworldBgmUrl,
  titanBossBgmUrl as bossTitanBgmUrl,
};
export * from './game/audio';
export { soundManager };
export default soundManager;
