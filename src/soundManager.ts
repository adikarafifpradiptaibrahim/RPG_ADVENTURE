/**
 * Root soundManager & Audio Asset Re-export
 */
import whereTheRiverBendsUrl from './assets/audio/Where_the_River_Bends.mp3';
import theQuietArchiveUrl from './assets/audio/The_Quiet_Archive.mp3';
import titanBossBgmUrl from './assets/audio/Titan_s_Heavy_Tread.mp3';
import ironMawWormBgmUrl from './assets/audio/The_Iron_Maw.mp3';
import basaltDragonBgmUrl from './assets/audio/Basalt_and_Brimstone.mp3';
import { soundManager } from './game/audio';

export {
  whereTheRiverBendsUrl,
  theQuietArchiveUrl,
  titanBossBgmUrl,
  ironMawWormBgmUrl,
  basaltDragonBgmUrl,
  whereTheRiverBendsUrl as relaxBgmUrl,
  whereTheRiverBendsUrl as overworldBgmUrl,
  titanBossBgmUrl as bossTitanBgmUrl,
};
export * from './game/audio';
export { soundManager };
export default soundManager;
