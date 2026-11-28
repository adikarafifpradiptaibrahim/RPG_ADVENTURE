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
  getSnowWeight,
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
 *    - Putih salju cerah bersih (#f2f7fb / [242, 247, 251] s.d. [230, 239, 246]).
 *    - HANYA di Z < -640 dan -180 < X < 260. 0% abu-abu kusam!
 * 2. Wilayah Gurun Solaria (biome === 'desert'):
 *    - 100% Pasir Kuning Emas (#e2be6e s.d. #d4a64c / [226, 190, 110] s.d. [212, 166, 76]).
 *    - 0% rumput hijau nyempil di seluruh daratan gurun barat.
 * 3. Wilayah Padang Rumput & Hutan (biome === 'grassland' | 'forest'):
 *    - Rumput Hijau Segar Alami (#569e46 s.d. #438537 / [86, 158, 70] s.d. [67, 133, 55]).
 * 4. Pasir Pantai Tipis (#e6d296 / [230, 210, 150]):
 *    - HANYA muncul jika height > SEA_LEVEL && height <= SEA_LEVEL + 0.45 (tepat di bibir air laut).
 * 5. Transisi Perbatasan Bioma Halus (smoothstep 30 unit) antara Gurun & Padang Rumput.
 */
export function getTerrainVertexColor(worldX: number, worldZ: number, height: number): [number, number, number] {
  const b = getWorldBiomeAt(worldX, worldZ);
  const SEA_LEVEL = 0.0;

  // 1. Sungai & Air Samudra / Danau
  if (height <= SEA_LEVEL) {
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

  // 3. Warna Dasar Padang Rumput, Gurun, & Gradasi Bioma Salju Organik
  const duneNoise = 0.5 + 0.5 * Math.sin(worldX * 0.035 + worldZ * 0.028);
  const desertColor: [number, number, number] = [
    Math.round(212 + (226 - 212) * duneNoise),
    Math.round(166 + (190 - 166) * duneNoise),
    Math.round(76 + (110 - 76) * duneNoise),
  ];

  const grassNoise = 0.5 + 0.5 * Math.sin(worldX * 0.025 - worldZ * 0.03);
  const hillHighlight = clamp((height - 4.0) / 14.0, 0, 1);
  const grassColor: [number, number, number] = [
    Math.round(67 + (92 - 67) * grassNoise + hillHighlight * 14),
    Math.round(133 + (162 - 133) * grassNoise - hillHighlight * 8),
    Math.round(55 + (74 - 55) * grassNoise + hillHighlight * 6),
  ];

  // Transisi lembut bioma salju utara domain-warped (Rumput -> Tundra Lumut -> Salju Putih)
  const snowWeight = getSnowWeight(worldX, worldZ);

  // 4. Bioma Vulkanik Kaldera Naga di Selatan Jauh
  if (b === 'volcano') {
    if (height < 0.35) {
      return [234, 88, 12]; // Dasar danau lahar membara (#ea580c)
    }
    const rockNoise = 0.5 + 0.5 * Math.sin(worldX * 0.08 + worldZ * 0.07);
    return [
      Math.round(28 + rockNoise * 14),
      Math.round(24 + rockNoise * 10),
      Math.round(24 + rockNoise * 10),
    ]; // Batuan basalt-obsidian gelap berlapis (bebas warna merah-muda polos)
  }

  // 5. Pita Pasir Pantai Tipis (#e6d296 / [230, 210, 150])
  // STRICT: Hanya jika height > SEA_LEVEL && height <= SEA_LEVEL + 0.45 tepat di pinggir air (di luar salju utara)!
  if (height > SEA_LEVEL && height <= SEA_LEVEL + 0.45 && snowWeight < 0.25) {
    return [230, 210, 150]; // #e6d296 Pasir Pantai Tipis
  }

  // 6. Transisi Perbatasan Halus Antara Gurun Solaria & Padang Rumput Eldoria (Lebar 30 Unit)
  const wave = Math.sin(worldZ * 0.006) * 110 + Math.cos(worldZ * 0.015) * 35;
  const warp = Math.sin(worldX * 0.01 + worldZ * 0.012) * 45;
  const boundaryDist = (worldX + wave + warp) - (-240);

  let baseRGB: [number, number, number];
  if (worldZ < 180 && Math.abs(boundaryDist) <= 15 && snowWeight < 0.35) {
    const t = clamp((boundaryDist - -15) / 30, 0, 1);
    const blend = t * t * (3 - 2 * t);
    baseRGB = [
      Math.round(desertColor[0] * (1 - blend) + grassColor[0] * blend),
      Math.round(desertColor[1] * (1 - blend) + grassColor[1] * blend),
      Math.round(desertColor[2] * (1 - blend) + grassColor[2] * blend),
    ];
  } else if (b === 'desert') {
    baseRGB = desertColor;
  } else {
    baseRGB = grassColor;
  }

  if (snowWeight > 0.01) {
    const snowNoise = 0.5 + 0.5 * Math.sin(worldX * 0.04 + worldZ * 0.035);
    const snowRGB: [number, number, number] = [
      Math.round(230 + (242 - 230) * snowNoise),
      Math.round(239 + (247 - 239) * snowNoise),
      Math.round(246 + (251 - 246) * snowNoise),
    ];
    // Lerp mulus: rumput/pasir -> tundra sejuk -> salju terang tanpa tepi kotak!
    const tundraFactor = clamp(snowWeight * 1.4, 0, 1);
    const tundraRGB: [number, number, number] = [
      Math.round(baseRGB[0] * 0.65 + 115 * 0.35),
      Math.round(baseRGB[1] * 0.65 + 132 * 0.35),
      Math.round(baseRGB[2] * 0.65 + 126 * 0.35),
    ];
    if (snowWeight < 0.45) {
      const midT = snowWeight / 0.45;
      return [
        Math.round(baseRGB[0] * (1 - midT) + tundraRGB[0] * midT),
        Math.round(baseRGB[1] * (1 - midT) + tundraRGB[1] * midT),
        Math.round(baseRGB[2] * (1 - midT) + tundraRGB[2] * midT),
      ];
    }
    const pureSnowT = (snowWeight - 0.45) / 0.55;
    const smoothSnow = pureSnowT * pureSnowT * (3 - 2 * pureSnowT);
    const finalMix = tundraFactor * 0.25 + smoothSnow * 0.75;
    return [
      Math.round(tundraRGB[0] * (1 - finalMix) + snowRGB[0] * finalMix),
      Math.round(tundraRGB[1] * (1 - finalMix) + snowRGB[1] * finalMix),
      Math.round(tundraRGB[2] * (1 - finalMix) + snowRGB[2] * finalMix),
    ];
  }

  return baseRGB;
}

export function getContinentBiomeSample(x: number, z: number): BiomeSample {
  const y = getWorldHeight(x, z);
  const b = getWorldBiomeAt(x, z);

  const delta = 2.0;
  const yRight = getWorldHeight(x + delta, z);
  const yDown = getWorldHeight(x, z + delta);
  const slope = clamp(Math.hypot(yRight - y, yDown - y) / delta, 0, 1);

  const color = getTerrainVertexColor(x, z, y);
  const isWater = y <= 0.0;
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
