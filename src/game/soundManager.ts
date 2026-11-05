/**
 * Direct Audio Bundling & soundManager Re-export
 */
import relaxBgmUrl from '../assets/audio/Where_the_River_Bends.mp3';
import bossTitanBgmUrl from '../assets/audio/Titan_s_Heavy_Tread.mp3';
import { soundManager } from './audio';

export { relaxBgmUrl, bossTitanBgmUrl };
export * from './audio';
export { soundManager };
export default soundManager;
