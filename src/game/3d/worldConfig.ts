/**
 * WORLD_CONFIG - Single Source of Truth Wrapper
 * Re-exports 100% synchronized data from src/game/3d/worldData.ts
 */

import {
  WORLD_BOUNDS as WB,
  WORLD_WIDTH as WW,
  WORLD_HEIGHT as WH,
  WORLD_LANDMARKS as WL,
  worldToMapPercent as WToMP,
  mapPercentToWorld as MPToW,
  WorldBounds,
  LandmarkDef,
  getBiomeAt,
  getProceduralContinentHeight,
  RIVER_SPLINES,
  ROAD_SPLINES,
  BRIDGE_CONFIGS,
} from './worldData';

export type { WorldBounds, LandmarkDef };
export const WORLD_BOUNDS = WB;
export const WORLD_WIDTH = WW;
export const WORLD_HEIGHT = WH;
export {
  getBiomeAt,
  getProceduralContinentHeight,
  RIVER_SPLINES,
  ROAD_SPLINES,
  BRIDGE_CONFIGS,
};

export interface LandmarkConfig {
  id: string;
  name: string;
  nameId: string;
  x: number;
  z: number;
  pctX: number; // percentage left on reference map (0..100)
  pctY: number; // percentage top on reference map (0..100)
  level: number;
  isBoss?: boolean;
  desc: string;
  color: string;
  icon: string;
  waypointId?: string;
}

export const WORLD_LANDMARKS: LandmarkConfig[] = WL.map((lm) => {
  const { xPercent, yPercent } = WToMP(lm.x, lm.z);
  return {
    id: lm.id,
    name: lm.name,
    nameId: lm.nameId,
    x: lm.x,
    z: lm.z,
    pctX: xPercent,
    pctY: yPercent,
    level: lm.level,
    isBoss: lm.isBoss,
    desc: lm.descriptionId || lm.description,
    color: lm.color,
    icon: lm.icon,
    waypointId: lm.waypointId,
  };
});

export const worldToMapPercent = WToMP;
export const mapPercentToWorld = MPToW;
