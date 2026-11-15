import { WorldMapModal } from '../../components/WorldMapModal';

export { WorldMapModal as WorldMap, WorldMapModal } from '../../components/WorldMapModal';
export type { MapLandmark, WorldHotspot } from '../../components/WorldMapModal';
export { LANDMARKS, WORLD_HOTSPOTS } from '../../components/WorldMapModal';
export {
  WORLD_BOUNDS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  worldToMapPercent,
  mapPercentToWorld,
  getBiomeAt,
  getProceduralContinentHeight,
  RIVER_SPLINES,
  ROAD_SPLINES,
  BRIDGE_CONFIGS,
} from '../3d/worldData';
export { renderIllustratedMap } from '../mapIllustratedRenderer';
export default WorldMapModal;
