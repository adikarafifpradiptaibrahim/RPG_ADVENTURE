/**
 * Unified Continent Map Sampler - Organic Biome Warping & 4-Branch Meandering River
 * Scale: X: -580..680, Z: -580..460
 *
 * 1. South & East Ocean ('ocean'): Dynamic coastline with southern cape and eastern bay.
 * 2. South Volcanic Island ('volcano'): Dragonfang Caldera at [80, 360].
 * 3. Solaria Golden Desert ('desert'): Winding organic boundary across north and northeast.
 * 4. Eldoria Plains & Alpine ('plains'): Central, west, east plains and northwest snowy mountains.
 */

export interface BiomeSample {
  height: number;
  color: [number, number, number]; // RGB 0..255
  biomeId: string;
  isWater: boolean;
  isPath: boolean;
  slope: number; // 0..1
}

import { isPointOnRoad, isPointNearRoad } from './RoadSystem';
export { isPointOnRoad, isPointNearRoad };

export type BiomeZoneId = 'ocean' | 'volcano' | 'desert' | 'plains';

export interface BiomeZoneInfo {
  id: BiomeZoneId;
  name: string;
  nameId: string;
  minY: number;
  maxY: number;
  color: [number, number, number];
}

// Clamp helper
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Multi-frequency Simplex/Perlin Organic Coordinate Warping
 * Injects gentle, continuous organic displacement to completely eliminate straight lines
 */
export function getOrganicWarp(x: number, z: number): { wx: number; wz: number } {
  const wx = Math.sin(z * 0.015) * 28 + Math.cos(z * 0.035) * 12;
  const wz = Math.cos(x * 0.015) * 28 + Math.sin(x * 0.035) * 12;
  return { wx, wz };
}

/**
 * Base mathematical curve for Solaria Desert southern boundary in warped space.
 * Curves from northwest down across center, then curves northeast towards sultan palace.
 */
export function getDesertBoundaryZ(xw: number): number {
  if (xw < -80) {
    return -290;
  } else if (xw < 20) {
    // Slopes down smoothly from -270 at xw=-80 to southernmost crest at Z = -90 between Pyramid & Oasis
    const t = (xw - -80) / 100;
    const s = t * t * (3 - 2 * t);
    return -270 + s * 180; // reaches -90 at xw = 20
  } else if (xw <= 140) {
    // Curves from -90 back to -145 around the river confluence
    const t = (xw - 20) / 120;
    return -90 - t * 55;
  } else if (xw <= 250) {
    // Below World Boss Crater [210, -360], rolling dunes dip south to -125 touching northern river branch
    const t = (xw - 140) / 110;
    const wave = Math.sin(t * Math.PI) * 20;
    return -145 + wave;
  } else {
    // Slopes northeast towards Sultan Palace [360, -440]
    const t = Math.min(1.0, (xw - 250) / 180);
    return -145 - t * 140; // reaches -285
  }
}

/**
 * Organic Single Source of Truth for Solaria Desert vs Eldoria Plains.
 * Coordinates are warped organically so the boundary forms a natural curving frontier.
 */
import {
  getBiomeAt as getWorldBiomeAt,
  getProceduralContinentHeight as getWorldHeight,
  RIVER_NW_BRANCH,
  RIVER_DESERT_BRANCH,
  RIVER_EAST_BRANCH,
  RIVER_SOUTH_BRANCH,
  RIVER_SPLINES,
} from './3d/worldData';

export {
  RIVER_NW_BRANCH,
  RIVER_DESERT_BRANCH,
  RIVER_EAST_BRANCH,
  RIVER_SOUTH_BRANCH,
  RIVER_SPLINES,
};

export function isDesertBiome(x: number, z: number): boolean {
  return getWorldBiomeAt(x, z) === 'desert';
}

// Backward-compatibility aliases
export const RIVER_NORTHWEST_BRANCH = RIVER_NW_BRANCH;
export const RIVER_MAIN_DOWNSTREAM = RIVER_SOUTH_BRANCH;

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export function getDistanceToRiver(px: number, pz: number): number {
  let minDist = Infinity;
  const branches = [RIVER_NW_BRANCH, RIVER_DESERT_BRANCH, RIVER_EAST_BRANCH, RIVER_SOUTH_BRANCH];

  for (let b = 0; b < branches.length; b++) {
    const branch = branches[b];
    for (let i = 0; i < branch.length - 1; i++) {
      const d = distToSegment(
        px,
        pz,
        branch[i][0],
        branch[i][1],
        branch[i + 1][0],
        branch[i + 1][1]
      );
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

/**
 * Faktor bobot blend transisi alami sempit di perbatasan Gurun Solaria vs Padang Rumput Eldoria.
 */
export function getDesertWeight(x: number, z: number): number {
  return getWorldBiomeAt(x, z) === 'desert' ? 1.0 : 0.0;
}

/**
 * 1. EVALUASI ZONA BIOMA & LAUT SECARA ORGANIK
 */
export function getBiomeAt(x: number, z: number): BiomeZoneInfo {
  const b = getWorldBiomeAt(x, z);
  if (b === 'volcano') {
    return {
      id: 'volcano',
      name: 'Dragonfang Caldera & Volcano Island',
      nameId: 'Kawah Vulkanik & Sarang Naga Purba',
      minY: 2.0,
      maxY: 7.0,
      color: [28, 25, 23],
    };
  }
  if (b === 'ocean' || b === 'lake') {
    return {
      id: 'ocean',
      name: b === 'lake' ? 'Ancient Titan Lake' : 'Azure Coast & South Ocean',
      nameId: b === 'lake' ? 'Danau Titan Kuno' : 'Samudra & Laut Lepas Azure',
      minY: -10.0,
      maxY: 0.0,
      color: [2, 132, 199],
    };
  }
  if (b === 'desert') {
    return {
      id: 'desert',
      name: 'Solaria Golden Desert',
      nameId: 'Gurun Pasir Emas Solaria',
      minY: 0.5,
      maxY: 3.5,
      color: [234, 179, 8],
    };
  }
  return {
    id: 'plains',
    name: 'Eldoria Central Plains',
    nameId: 'Padang Rumput Eldoria',
    minY: 0.0,
    maxY: 2.0,
    color: [101, 163, 13],
  };
}

/**
 * Procedural height function with organic rolling hills and realistic landmarks (Single Source of Truth)
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  return getWorldHeight(x, z);
}

/**
 * Returns realistic RGB (0..255) for the minimap and world map
 */
/**
 * Single Source of Truth untuk Pewarnaan Vertex Terrain 3D:
 * 1. Wilayah Pegunungan & Danau Utara (biome === 'snow'):
 *    - Putih salju cerah bersih (#f3f8fc s.d. #e2edf5 / [243, 248, 252] s.d. [226, 237, 245]).
 *    - HANYA di Z < -640 dan -180 < X < 260. 0% abu-abu kusam!
 * 2. Wilayah Gurun Solaria (biome === 'desert'):
 *    - 100% Pasir Emas Gurun (#e3be6f s.d. #d4a64c / [227, 190, 111] s.d. [212, 166, 76]).
 *    - 0% rumput hijau nyempil di seluruh daratan gurun barat.
 * 3. Wilayah Padang Rumput & Hutan (biome === 'grassland' | 'forest'):
 *    - Rumput Hijau Segar Alami (#58a048 s.d. #428238 / [88, 160, 72] s.d. [66, 130, 56]).
 * 4. Pasir Pantai Tipis (#e6d296 / [230, 210, 150]):
 *    - HANYA muncul tepat di garis pesisir tepi laut (height <= SEA_LEVEL + 1.0 dan distRiver < 4.8 || height <= SEA_LEVEL + 0.45).
 * 5. Transisi Perbatasan Bioma Halus (smoothstep 25-35 unit) hanya antara 2 bioma bertetangga.
 */
export function getTerrainVertexColor(worldX: number, worldZ: number, height: number): [number, number, number] {
  const b = getWorldBiomeAt(worldX, worldZ);
  const SEA_LEVEL = 0.0;

  // 1. Sungai & Air Samudra / Danau
  if (height < SEA_LEVEL) {
    const depth = clamp(-height / 4.0, 0, 1);
    return [
      Math.round(2 + (1 - depth) * 15),
      Math.round(132 + (1 - depth) * 20),
      Math.round(199 + (1 - depth) * 20),
    ];
  }

  // 2. Jalan Raya & Jalur Berbatu
  if (isPointOnRoad(worldX, worldZ)) {
    if (b === 'desert') return [217, 190, 139]; // Solaria paved sand road #d9be8b
    return [140, 122, 101]; // Eldoria dirt paved trail #8c7a65
  }

  // 3. Bioma Salju Pegunungan & Danau Titan Utara (Z < -640 dan -180 < X < 260)
  // Putih salju cerah bersih (#f3f8fc s.d. #e2edf5) — 0% abu-abu kusam!
  if (b === 'snow' && worldZ < -640 && worldX > -180 && worldX < 260) {
    const snowNoise = 0.5 + 0.5 * Math.sin(worldX * 0.04 + worldZ * 0.035);
    // Lerp antara #f3f8fc [243, 248, 252] dan #e2edf5 [226, 237, 245]
    return [
      Math.round(226 + (243 - 226) * snowNoise),
      Math.round(237 + (248 - 237) * snowNoise),
      Math.round(245 + (252 - 245) * snowNoise),
    ];
  }

  // 4. Bioma Vulkanik Kaldera Naga di Selatan Jauh
  if (b === 'volcano') {
    if (height < 2.0 || Math.hypot(worldX - 40, worldZ - 840) < 18) {
      return [220, 38, 38]; // Lava magma membara
    }
    return [35, 30, 28]; // Basalt hitam vulkanik
  }

  // 5. Pasir Pantai (#e6d296 / [230, 210, 150]) HANYA pada pita tipis tepat di pinggir air laut/sungai
  const distRiver = getDistanceToRiver(worldX, worldZ);
  const isCoastEdge = distRiver < 4.8 || height <= SEA_LEVEL + 0.45;
  if (height <= SEA_LEVEL + 1.0 && isCoastEdge) {
    return [230, 210, 150]; // #e6d296 Pasir Pantai Keemasan
  }

  // Warna Dasar Bioma Gurun: Pasir Emas Gurun (#e3be6f s.d. #d4a64c / [227, 190, 111] s.d. [212, 166, 76])
  const duneNoise = 0.5 + 0.5 * Math.sin(worldX * 0.035 + worldZ * 0.028);
  const desertColor: [number, number, number] = [
    Math.round(212 + (227 - 212) * duneNoise),
    Math.round(166 + (190 - 166) * duneNoise),
    Math.round(76 + (111 - 76) * duneNoise),
  ];

  // Warna Dasar Bioma Padang Rumput: Rumput Hijau Segar Alami (#58a048 s.d. #428238 / [88, 160, 72] s.d. [66, 130, 56])
  const grassNoise = 0.5 + 0.5 * Math.sin(worldX * 0.025 - worldZ * 0.03);
  const grassColor: [number, number, number] = [
    Math.round(66 + (88 - 66) * grassNoise),
    Math.round(130 + (160 - 130) * grassNoise),
    Math.round(56 + (72 - 56) * grassNoise),
  ];

  // 6. Transisi Perbatasan Halus Antara Gurun Solaria & Padang Rumput Eldoria (2 Bioma Bertemu, Lebar 30 Unit)
  const wave = Math.sin(worldZ * 0.006) * 110 + Math.cos(worldZ * 0.015) * 35;
  const warp = Math.sin(worldX * 0.01 + worldZ * 0.012) * 45;
  const boundaryDist = (worldX + wave + warp) - (-240);

  if (worldZ < 180 && Math.abs(boundaryDist) <= 15) {
    // Smooth blending hanya antara Gurun dan Padang Rumput
    const t = clamp((boundaryDist - -15) / 30, 0, 1);
    const blend = t * t * (3 - 2 * t);
    return [
      Math.round(desertColor[0] * (1 - blend) + grassColor[0] * blend),
      Math.round(desertColor[1] * (1 - blend) + grassColor[1] * blend),
      Math.round(desertColor[2] * (1 - blend) + grassColor[2] * blend),
    ];
  }

  // 7. Jika di dalam Gurun Solaria murni: 100% Pasir Emas
  if (b === 'desert') {
    return desertColor;
  }

  // 8. Seluruh Dataran Hijau Eldoria: 100% Rumput Hijau Segar
  return grassColor;
}

export function getContinentBiomeSample(x: number, z: number): BiomeSample {
  const y = getWorldHeight(x, z);
  const b = getWorldBiomeAt(x, z);

  const delta = 2.0;
  const yRight = getWorldHeight(x + delta, z);
  const yDown = getWorldHeight(x, z + delta);
  const slope = clamp(Math.hypot(yRight - y, yDown - y) / delta, 0, 1);

  const color = getTerrainVertexColor(x, z, y);
  const isWater = y < 0.0;
  const isPath = isPointOnRoad(x, z);

  let biomeId = 'plains_grass';
  if (isWater) biomeId = b === 'lake' ? 'titan_lake' : 'ocean';
  else if (isPath) biomeId = b === 'desert' ? 'solaria_road' : 'eldoria_road';
  else if (b === 'desert') biomeId = 'solaria_desert';
  else if (b === 'snow') biomeId = 'snowy_peak';
  else if (b === 'volcano') biomeId = 'dragon_volcano';

  return { height: y, color, biomeId, isWater, isPath, slope };
}

function sampleIsPath(x: number, z: number): boolean {
  if (Math.abs(x - 20) <= 3.5 && z >= 15 && z <= 30) return true;
  if (Math.hypot(x - 20, z - -60) <= 12) return true;
  return isPointOnRoad(x, z);
}
