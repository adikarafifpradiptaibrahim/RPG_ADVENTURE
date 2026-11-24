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
export function getContinentBiomeSample(x: number, z: number): BiomeSample {
  const y = getWorldHeight(x, z);
  const b = getWorldBiomeAt(x, z);

  const delta = 2.0;
  const yRight = getWorldHeight(x + delta, z);
  const yDown = getWorldHeight(x, z + delta);
  const slope = clamp(Math.hypot(yRight - y, yDown - y) / delta, 0, 1);

  // 1. Sungai (River water)
  const distRiverSample = getDistanceToRiver(x, z);
  if (distRiverSample < 4.2 && y <= 0.0) {
    return { height: y, color: [45, 165, 205], biomeId: 'river_water', isWater: true, isPath: false, slope };
  }

  // 2. Air Samudra / Laut Lepas / Danau Titan / Oase
  if (y < 0.0) {
    if (b === 'desert' && Math.hypot(x - -400, z - -290) < 22) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    const depth = clamp(-y / 4.0, 0, 1);
    const r = Math.round(2 + (1 - depth) * 15);
    const g = Math.round(132 + (1 - depth) * 20);
    const bColor = Math.round(199 + (1 - depth) * 20);
    return { height: y, color: [r, g, bColor], biomeId: b === 'lake' ? 'titan_lake' : 'ocean', isWater: true, isPath: false, slope };
  }

  // 3. Jalan Raya & Paved Trails
  if (isPointOnRoad(x, z)) {
    if (b === 'desert') {
      return { height: y, color: [217, 190, 139], biomeId: 'solaria_road', isWater: false, isPath: true, slope: 0 };
    }
    return { height: y, color: [140, 122, 101], biomeId: 'eldoria_road', isWater: false, isPath: true, slope: 0 };
  }

  // 4. Pasir Pantai Tipis (Beach sand fringe) hanya di tepi air (height dekat SEA_LEVEL / y <= 0.85)
  if (y <= 0.85 && b !== 'snow' && b !== 'volcano') {
    return { height: y, color: [235, 220, 178], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // 5. Bioma Gurun Solaria di Sisi Barat: Pasir Emas Cerah (#e2c074 s.d. #d4a955 / [226, 192, 116] s.d. [212, 169, 85])
  if (b === 'desert') {
    const duneNoise = 0.5 + 0.5 * Math.sin(x * 0.035 + z * 0.028);
    const r = Math.round(212 + (226 - 212) * duneNoise);
    const g = Math.round(169 + (192 - 169) * duneNoise);
    const bColor = Math.round(85 + (116 - 85) * duneNoise);
    return { height: y, color: [r, g, bColor], biomeId: 'solaria_desert', isWater: false, isPath: false, slope };
  }

  // 6. Bioma Pegunungan Salju Titan di Utara: Salju Putih Murni & Tebing Batu Abu-Abu
  if (b === 'snow') {
    if (y >= 8.0 && slope < 0.55) {
      return { height: y, color: [245, 248, 252], biomeId: 'snowy_peak', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [115, 125, 135], biomeId: 'mountain_rock', isWater: false, isPath: false, slope };
  }

  // 7. Bioma Vulkanik Kaldera Naga di Laut Selatan
  if (b === 'volcano') {
    if (y < 2.0 || Math.hypot(x - 40, z - 840) < 18) {
      return { height: y, color: [220, 38, 38], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [35, 30, 28], biomeId: 'volcano_basalt', isWater: false, isPath: false, slope };
  }

  // 8. Padang Rumput Hijau Eldoria: Rumput Hijau Segar (#5a9e4b s.d. #46823b / [90, 158, 75] s.d. [70, 130, 59])
  // Tanpa warna tanah kecokelatan di area padang rumput!
  const grassNoise = 0.5 + 0.5 * Math.sin(x * 0.025 - z * 0.03);
  let r = Math.round(70 + (90 - 70) * grassNoise);
  let g = Math.round(130 + (158 - 130) * grassNoise);
  let bColor = Math.round(59 + (75 - 59) * grassNoise);

  // Graded Rock Slope Material hanya pada tebing gunung sangat curam & tinggi (y > 6.0 && slope > 0.5)
  if (y > 6.0 && slope > 0.5) {
    const rockBlend = clamp((slope - 0.5) / 0.35, 0, 1);
    r = Math.round(r * (1 - rockBlend) + 115 * rockBlend);
    g = Math.round(g * (1 - rockBlend) + 125 * rockBlend);
    bColor = Math.round(bColor * (1 - rockBlend) + 135 * rockBlend);
    return { height: y, color: [r, g, bColor], biomeId: 'mountain_rock_slope', isWater: false, isPath: false, slope };
  }

  return { height: y, color: [r, g, bColor], biomeId: 'plains_grass', isWater: false, isPath: false, slope };
}

function sampleIsPath(x: number, z: number): boolean {
  if (Math.abs(x - 20) <= 3.5 && z >= 15 && z <= 30) return true;
  if (Math.hypot(x - 20, z - -60) <= 12) return true;
  return isPointOnRoad(x, z);
}
