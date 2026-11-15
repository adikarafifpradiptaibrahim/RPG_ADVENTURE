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
 * Faktor bobot blend transisi alami sempit selebar 5 unit di perbatasan Gurun Solaria vs Padang Rumput Eldoria.
 */
export function getDesertWeight(x: number, z: number): number {
  const { wx, wz } = getOrganicWarp(x, z);
  const xw = x + wx;
  const zw = z + wz;
  if (xw <= -100) return 0.0;
  const xBlend = Math.max(0.0, Math.min(1.0, (xw - -100) / 6.0));
  const zBoundary = getDesertBoundaryZ(xw);
  const diffZ = zw - zBoundary;
  const s = Math.max(0.0, Math.min(1.0, 0.5 - diffZ / 6.0));
  const zFactor = s * s * (3.0 - 2.0 * s);
  return zFactor * xBlend;
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
  const y = getProceduralContinentHeight(x, z);
  const zone = getBiomeAt(x, z);
  const { wx, wz } = getOrganicWarp(x, z);
  const xw = x + wx;
  const zw = z + wz;

  const delta = 2.0;
  const yRight = getProceduralContinentHeight(x + delta, z);
  const yDown = getProceduralContinentHeight(x, z + delta);
  const slope = clamp(Math.hypot(yRight - y, yDown - y) / delta, 0, 1);

  // 1. Pelabuhan Sanctuary & Boardwalk Pier [-20, 185]
  if (Math.abs(x - -20) <= 8 && z >= 180 && z <= 215) {
    return { height: 1.85, color: [141, 110, 99], biomeId: 'harbor_pier', isWater: false, isPath: true, slope: 0 };
  }

  // 1a. Lembah Danau Titan Kuno [-260, -420] (Danau Air Biru Luas di Pegunungan)
  const distTitanLake = Math.hypot(x - -260, z - -420);
  if (distTitanLake <= 58) {
    return { height: y, color: [2, 132, 199], biomeId: 'titan_lake', isWater: true, isPath: false, slope: 0 };
  }
  if (distTitanLake <= 72) {
    return { height: y, color: [175, 190, 200], biomeId: 'titan_shore', isWater: false, isPath: false, slope };
  }

  // 1b. Gugusan Pegunungan Bersalju (Snowy Mountain Ridges dari barat hingga Kanyon Kuno)
  const isSnowMountainZone =
    (distTitanLake > 60 && distTitanLake <= 165 && (xw < -50 || zw < -320)) ||
    (xw >= -180 && xw <= 50 && zw < -440);
  if (isSnowMountainZone && y >= 12.0) {
    return { height: y, color: [250, 252, 255], biomeId: 'snowy_peak', isWater: false, isPath: false, slope };
  }
  if (isSnowMountainZone && y >= 8.0) {
    return { height: y, color: [115, 125, 135], biomeId: 'mountain_rock', isWater: false, isPath: false, slope };
  }

  // 1b-2. Ibukota Kerajaan Emas Astraea [-250, -240] (Kastil megah batu abu-abu strictly di dalam tembok)
  if (Math.abs(x - -250) <= 24 && Math.abs(z - -240) <= 30) {
    return { height: y, color: [100, 116, 139], biomeId: 'astraea_castle', isWater: false, isPath: false, slope };
  }

  // 1c. Alur Palung 4 Cabang Sungai (NW, Desert, East, South)
  const distRiverSample = getDistanceToRiver(x, z);
  if (distRiverSample < 4.2 && y <= 0.0) {
    return { height: y, color: [45, 165, 205], biomeId: 'river_water', isWater: true, isPath: false, slope };
  }
  if (distRiverSample < 6.0) {
    return { height: y, color: [136, 122, 102], biomeId: 'river_bank', isWater: false, isPath: false, slope };
  }

  // 1d. Kanyon Kuno [110, -490] (Tebing Cadas Merah & Sandstone)
  if (Math.hypot(x - 110, z - -490) <= 75) {
    return { height: y, color: [175, 85, 45], biomeId: 'ancient_canyon', isWater: false, isPath: false, slope };
  }

  // 1e. Hutan Kabut Eldoria [335, -140] (Hijau Pinus Gelap Kabut)
  if (Math.hypot(x - 335, z - -140) <= 60) {
    return { height: y, color: [35, 95, 40], biomeId: 'mist_forest', isWater: false, isPath: false, slope };
  }

  // 1f. Puing Kastil Terbengkalai [225, -35] (Batu Slate Reruntuhan)
  if (Math.hypot(x - 225, z - -35) <= 32) {
    return { height: y, color: [115, 125, 135], biomeId: 'abandoned_castle', isWater: false, isPath: false, slope };
  }

  // 1g. Lembah Batu Lumut [455, 35] (Lembah Hijau Berlumut)
  if (Math.hypot(x - 455, z - 35) <= 42) {
    return { height: y, color: [75, 135, 60], biomeId: 'moss_valley', isWater: false, isPath: false, slope };
  }

  // 2. Air Samudra / Laut Lepas
  if (y < 0.0) {
    if (zone.id === 'desert' && Math.hypot(x - 55, z - -250) < 18) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    const depth = clamp(-y / 4.0, 0, 1);
    const r = Math.round(2 + (1 - depth) * 15);
    const g = Math.round(132 + (1 - depth) * 20);
    const b = Math.round(199 + (1 - depth) * 20);
    return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
  }

  // 3. Volcanic Zone (Dragonfang Caldera & Volcano Island [-85, 265])
  if (zone.id === 'volcano') {
    const cx = -85;
    const cz = 265;
    const rx = 110;
    const rz = 65;
    const edgeNoise = Math.sin(x * 0.06) * 8 + Math.cos(z * 0.07) * 6;
    const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);

    if (distSq <= 0.35 || Math.hypot(x - -85, z - 265) <= 16) {
      return { height: y, color: [220, 38, 38], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
    }
    if (Math.hypot(x - -85, z - 265) <= 24) {
      return { height: y, color: [28, 25, 23], biomeId: 'dragon_arena', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [40, 36, 34], biomeId: 'dragon_basalt', isWater: false, isPath: false, slope };
  }

  // 4. Special Roads & Paved Trails
  if (isPointOnRoad(x, z)) {
    if (isDesertBiome(x, z)) {
      return { height: y, color: [217, 190, 139], biomeId: 'solaria_road', isWater: false, isPath: true, slope: 0 };
    }
    return { height: y, color: [140, 122, 101], biomeId: 'eldoria_road', isWater: false, isPath: true, slope: 0 };
  }

  // Piramida Emas Solaria [10, -340]
  if (Math.hypot(x - 10, z - -340) <= 24) {
    return { height: y, color: [220, 160, 40], biomeId: 'solaria_pyramid', isWater: false, isPath: false, slope };
  }

  // Kawah Cacat World Boss [225, -380]
  const distSinkhole = Math.hypot(x - 225, z - -380);
  if (distSinkhole <= 45) {
    const t = distSinkhole / 45;
    const swirl = Math.sin(Math.atan2(z - -380, x - 225) * 4 + distSinkhole * 0.5);
    const r = Math.round(180 + t * 50 + swirl * 10);
    const g = Math.round(110 + t * 65 + swirl * 8);
    const b = Math.round(30 + t * 50);
    return { height: y, color: [r, g, b], biomeId: 'solaria_sinkhole', isWater: false, isPath: false, slope };
  }

  // 5. Special Plains Landmarks
  // Desa Utama Plaza [-35, 135]
  if (Math.hypot(x - -35, z - 135) <= 12) {
    return { height: y, color: [226, 218, 214], biomeId: 'eldoria_plaza', isWater: false, isPath: true, slope: 0 };
  }
  // Astraea Marble Capital [-250, -240] (strictly inside walls)
  if (Math.abs(x - -250) <= 24 && Math.abs(z - -240) <= 30) {
    return { height: y, color: [248, 250, 252], biomeId: 'astraea_marble', isWater: false, isPath: true, slope: 0 };
  }
  // Val-Kragor Slate [286..334, 95..135] (strictly inside fort walls)
  if (x >= 286 && x <= 334 && z >= 95 && z <= 135) {
    return { height: y, color: [100, 116, 139], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope: 0 };
  }
  // Mage Tower Hill [70, 20]
  if (Math.hypot(x - 70, z - 20) <= 16) {
    return { height: y, color: [88, 128, 80], biomeId: 'thunderpeak_hill', isWater: false, isPath: false, slope };
  }

  // Beach sand fringe along natural south and west coastlines
  const distToVillage = Math.hypot(x - -35, z - 135);
  const cape = Math.max(0, 1.0 - distToVillage / 85) * 26;
  const southCoastZ = 185 + Math.sin(xw * 0.015) * 16 + Math.cos(xw * 0.04) * 8 + cape;
  const westCoastX = -460 + Math.sin(zw * 0.018) * 30 + Math.cos(zw * 0.045) * 12;
  const isNearCoast = (z >= southCoastZ - 8 && z <= southCoastZ + 3 && x >= westCoastX) ||
                      (x >= westCoastX - 3 && x <= westCoastX + 10 && z <= southCoastZ);
  if (isNearCoast && !sampleIsPath(x, z)) {
    return { height: y, color: [254, 215, 170], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // ==========================================================================
  // PEWARNAAN PERMUKAAN TANAH (VERTEX COLORING / TEXTURE BLEND)
  // Kuning Pasir Emas Solaria (#e2b448) vs Hijau Segar Padang Rumput Eldoria (#559e48 / #5da84e)
  // ==========================================================================
  const desertWeight = getDesertWeight(x, z);

  const duneNoise = 0.5 + 0.5 * Math.sin(xw * 0.035 + zw * 0.028);
  const desertR = 226 + (236 - 226) * duneNoise;
  const desertG = 180 + (192 - 180) * duneNoise;
  const desertB = 72 + (84 - 72) * duneNoise;

  // Single fresh vibrant grassland palette (#559e48 -> RGB [85, 158, 72] to #5da84e -> RGB [93, 168, 78])
  const grassNoise = 0.5 + 0.5 * Math.sin(xw * 0.025 - zw * 0.03);
  const grassR = 85 + (93 - 85) * grassNoise;
  const grassG = 158 + (168 - 158) * grassNoise;
  const grassB = 72 + (78 - 72) * grassNoise;

  const r = Math.round(grassR * (1.0 - desertWeight) + desertR * desertWeight);
  const g = Math.round(grassG * (1.0 - desertWeight) + desertG * desertWeight);
  const b = Math.round(grassB * (1.0 - desertWeight) + desertB * desertWeight);

  // Graded Rock Slope Material on High Mountain Ridges (Eliminates monolithic green cliff walls)
  if (y > 3.0 && desertWeight < 0.3) {
    const slopeFactor = clamp((slope - 0.22) / 0.40, 0, 1);
    const heightFactor = clamp((y - 3.2) / 5.5, 0, 1);
    const rockBlend = Math.max(slopeFactor * 0.85, heightFactor * 0.75);
    if (rockBlend > 0.05) {
      const rockR = 115;
      const rockG = 125;
      const rockB = 135;
      const finalR = Math.round(r * (1 - rockBlend) + rockR * rockBlend);
      const finalG = Math.round(g * (1 - rockBlend) + rockG * rockBlend);
      const finalB = Math.round(b * (1 - rockBlend) + rockB * rockBlend);
      return { height: y, color: [finalR, finalG, finalB], biomeId: 'mountain_rock_slope', isWater: false, isPath: false, slope };
    }
  }

  const biomeId = desertWeight > 0.5 ? 'solaria_desert' : 'plains_grass';
  return { height: y, color: [r, g, b], biomeId, isWater: false, isPath: false, slope };
}

function sampleIsPath(x: number, z: number): boolean {
  if (Math.abs(x - -20) <= 3.5 && z >= 170 && z <= 215) return true;
  if (Math.hypot(x - -35, z - 135) <= 12) return true;
  return isPointOnRoad(x, z);
}
