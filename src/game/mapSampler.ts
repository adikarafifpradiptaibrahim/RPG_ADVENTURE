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
export function isDesertBiome(x: number, z: number): boolean {
  const { wx, wz } = getOrganicWarp(x, z);
  const xw = x + wx;
  const zw = z + wz;
  if (xw <= -85) return false;
  return zw < getDesertBoundaryZ(xw);
}

/**
 * SISTEM ALIRAN 4 CABANG SUNGAI BERKELOK ALAMI (MEANDERING SPLINES)
 * Sesuai denah referensi target peta (100% sinkron dengan worldConfig.ts):
 * 1. Hulu Barat Laut (NW): Dari selatan Danau Titan [-250, -360] -> timur Astraea [-160, -210] (Jembatan 1) -> Confluence [-35, 35].
 * 2. Cabang Gurun/Utara: Dari Confluence [-35, 35] -> selatan Oase [80, -130] -> barat Kawah Boss [175, -350] -> Kanyon [110, -490].
 * 3. Cabang Timur: Dari Confluence [-35, 35] -> antara Puing Kastil & Val-Kragor [250, 45] -> barat Lembah Batu Lumut [395, 25] (Jembatan 5) & timur Hutan Kabut [395, -50] -> lereng timur laut [415, -240].
 * 4. Hilir (Muara Selatan): Dari Confluence [-35, 35] -> melintasi Jembatan Tengah [-30, 55] -> lurus ke selatan ke laut [-25, 165].
 */
export const RIVER_NW_BRANCH: [number, number][] = [
  [-250, -360], // Danau Titan Kuno South Shore Outlet
  [-220, -310],
  [-190, -260],
  [-160, -210], // Jembatan 1 - Astraea Highway River Crossing
  [-130, -150],
  [-95, -95],
  [-65, -45],
  [-45, -5],
  [-35, 35],    // Confluence Sentral
];

export const RIVER_DESERT_BRANCH: [number, number][] = [
  [-35, 35],    // Confluence
  [0, -15],
  [40, -70],
  [80, -130],   // Selatan Oase Solaria
  [125, -200],
  [155, -275],
  [175, -350],  // Barat Kawah World Boss [225, -380]
  [165, -420],
  [140, -460],
  [110, -490],  // Kanyon Kuno
];

export const RIVER_EAST_BRANCH: [number, number][] = [
  [-35, 35],    // Confluence
  [35, 38],
  [105, 42],
  [175, 44],
  [210, 45],    // Jembatan 4 - Puing Kastil
  [250, 45],    // Antara Puing Kastil [225, -35] & Val-Kragor [315, 95]
  [270, 50],    // Jembatan 3 - Val-Kragor
  [335, 42],
  [395, 25],    // Jembatan 5 - Akses Barat Lembah Batu Lumut
  [405, -10],
  [395, -50],   // Timur Hutan Kabut [335, -140]
  [390, -115],
  [400, -180],
  [415, -240],  // Lereng Pegunungan Timur Laut
];

export const RIVER_SOUTH_BRANCH: [number, number][] = [
  [-35, 35],    // Confluence
  [-30, 55],    // Jembatan 2 - Central Suspension Bridge
  [-28, 90],
  [-26, 125],
  [-25, 165],   // Muara Samudra Selatan
];

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
  // A. KALDERA SARANG NAGA & PULAU VULKANIK [-85, 265]
  const cx = -85;
  const cz = 265;
  const rx = 110;
  const rz = 65;
  const edgeNoise = Math.sin(x * 0.06) * 8 + Math.cos(z * 0.07) * 6;
  const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);
  if (distSq <= 1.0) {
    return {
      id: 'volcano',
      name: 'Dragonfang Caldera & Volcano Island',
      nameId: 'Kawah Vulkanik & Sarang Naga Purba',
      minY: 2.0,
      maxY: 7.0,
      color: [28, 25, 23],
    };
  }

  // B. SAMUDRA & LAUT LEPAS AZURE (ORGANIC COASTLINE & EASTERN BAY)
  const { wx, wz } = getOrganicWarp(x, z);
  const xw = x + wx;
  const zw = z + wz;

  // Cape/Tanjung di selatan Desa Utama [25, 135] & Pelabuhan Sanctuary [-135, 145]
  const distToVillage = Math.hypot(x - 25, z - 135);
  const cape = Math.max(0, 1.0 - distToVillage / 110) * 35;
  const southCoastZ = 195 + Math.sin(xw * 0.015) * 14 + Math.cos(xw * 0.04) * 6 + cape;
  const westCoastX = -460 + Math.sin(zw * 0.018) * 30 + Math.cos(zw * 0.045) * 12;

  // Smooth natural bay curving east of Val-Kragor [315, 95]
  let naturalCoastZ = southCoastZ;
  if (xw > 340) {
    const t = Math.min(1.0, (xw - 340) / 120);
    naturalCoastZ = southCoastZ - t * 45 + Math.sin(xw * 0.025) * 10;
  }
  const isFarEastOcean = xw > 580 + Math.sin(zw * 0.015) * 25;

  if (x < westCoastX || z > naturalCoastZ || isFarEastOcean) {
    return {
      id: 'ocean',
      name: 'Azure Coast & South Ocean',
      nameId: 'Samudra & Laut Lepas Azure',
      minY: -10.0,
      maxY: 0.0,
      color: [2, 132, 199],
    };
  }

  // C. GURUN PASIR EMAS SOLARIA
  if (isDesertBiome(x, z)) {
    return {
      id: 'desert',
      name: 'Solaria Golden Desert',
      nameId: 'Gurun Pasir Emas Solaria',
      minY: 0.5,
      maxY: 3.5,
      color: [234, 179, 8],
    };
  }

  // D. PADANG RUMPUT ELDORIA
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
 * Procedural height function with organic rolling hills and realistic landmarks
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  const zone = getBiomeAt(x, z);
  const { wx, wz } = getOrganicWarp(x, z);
  const xw = x + wx;
  const zw = z + wz;

  // 1. ZONA VOLCANO: Pulau Kawah Vulkanik Seberang Laut Selatan [-85, 265]
  if (zone.id === 'volcano') {
    const cx = -85;
    const cz = 265;
    const rx = 110;
    const rz = 65;
    const edgeNoise = Math.sin(x * 0.06) * 8 + Math.cos(z * 0.07) * 6;
    const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);

    if (Math.hypot(x - -85, z - 225) < 16) return 2.0;
    const distCenter = Math.hypot(x - -85, z - 265);
    if (distCenter <= 38) return 2.50;
    if (distCenter <= 50) {
      const t = (distCenter - 38) / 12;
      return 2.50 + Math.sin(t * Math.PI) * 5.0;
    }
    if (distSq > 0.70) {
      const t = (distSq - 0.70) / 0.30;
      return Math.max(0.2, 3.5 * (1 - t));
    }
    return 1.8;
  }

  // 2. ZONA OCEAN: Samudra & Laut Lepas Azure
  if (zone.id === 'ocean') {
    const distToVillage = Math.hypot(x - 25, z - 135);
    const cape = Math.max(0, 1.0 - distToVillage / 110) * 35;
    const southCoastZ = 195 + Math.sin(xw * 0.015) * 14 + Math.cos(xw * 0.04) * 6 + cape;
    if (z >= southCoastZ && z <= southCoastZ + 15) {
      const t = (z - southCoastZ) / 15;
      return 0.2 - t * 2.8;
    }
    return -3.5;
  }

  // 3. ZONA DESERT: Gurun Pasir Emas Solaria
  if (zone.id === 'desert') {
    // 3a. Kanyon Kuno [110, -490] (Northern Red Canyon Mesas & Cliffs)
    const distCanyon = Math.hypot(x - 110, z - -490);
    if (distCanyon <= 75) {
      const canyonNoise = Math.sin(x * 0.035) * Math.cos(z * 0.03) * 5.0 + Math.sin(x * 0.08) * 2.0;
      return clamp(12.0 + canyonNoise, 8.0, 20.0);
    }

    // 3b. Istana Sultan Malik [355, -440]
    if (Math.hypot(x - 355, z - -440) <= 36) return 2.00;

    // 3c. Kawah Cacat World Boss (Lv. 10) [225, -380]
    const distSinkhole = Math.hypot(x - 225, z - -380);
    if (distSinkhole <= 45) {
      const t = distSinkhole / 45;
      const bowl = Math.pow(t, 1.8) * 2.5 - 2.5; // -2.5 unit di tengah, 0 di bibir
      const swirlRipple = Math.sin(Math.atan2(z - -380, x - 225) * 3 + distSinkhole * 0.4) * 0.18;
      return 1.80 + bowl + swirlRipple;
    }

    // 3d. Piramida Emas Solaria [10, -340]
    if (Math.hypot(x - 10, z - -340) <= 32) return 1.50;

    // 3e. Oase Solaria [55, -250]
    const distOasis = Math.hypot(x - 55, z - -250);
    if (distOasis < 16) return -0.4;
    if (distOasis < 26) return 0.6;

    // Rolling golden dunes
    const duneWave = Math.sin(xw * 0.035 + zw * 0.028) * 1.1 + Math.cos(xw * 0.02 - zw * 0.03) * 0.5;
    return clamp(1.4 + duneWave, 0.5, 3.5);
  }

  // 4. ZONA PLAINS: Padang Rumput Eldoria (Daratan Utama)
  // 4a. Desa Utama & Padang Rumput Eldoria [25, 135] (Daratan luas kering dan aman)
  const distVillage = Math.hypot(x - 25, z - 135);
  if (distVillage <= 55) return 0.25;

  // 4b. Pelabuhan Sanctuary [-135, 145]
  if (Math.hypot(x - -135, z - 145) <= 24) return 0.35;

  // 4c. Lembah Danau Titan Kuno [-260, -420] (Danau Biru Luas di Ketinggian)
  const distTitanLake = Math.hypot(x - -260, z - -420);
  if (distTitanLake <= 58) {
    return -2.80; // Dasar danau air biru luas
  }
  if (distTitanLake <= 72) {
    const t = (distTitanLake - 58) / 14;
    return -2.80 + t * 4.2; // Lereng tepian danau naik
  }

  // 4d. Pegunungan Salju Barat Laut (Mengelilingi Danau Titan dari barat hingga perbatasan Kanyon Kuno)
  const isSnowMountainZone =
    (distTitanLake > 60 && distTitanLake <= 165 && (xw < -50 || zw < -320)) ||
    (xw >= -180 && xw <= 50 && zw < -440);
  if (isSnowMountainZone) {
    const rimNoise = Math.sin(xw * 0.02) * Math.cos(zw * 0.02) * 6.5 + Math.sin((xw + zw) * 0.035) * 3.0;
    return clamp(15.0 + rimNoise, 10.0, 26.0);
  }

  // 4e. Ibukota Kerajaan Emas Astraea & Istana Kaisar [-250, -210] (Kastil megah di lereng selatan salju)
  if (Math.hypot(x - -250, z - -210) <= 48) return 2.20;

  // 4e-2. Hutan Lindung Barat Daya [X: -320 s.d -180, Z: 50 s.d 150] (Cluster hijau rimbun)
  if (x >= -320 && x <= -180 && z >= 50 && z <= 150) {
    const forestWave = Math.sin(x * 0.035) * Math.cos(z * 0.035) * 1.5 + 2.0;
    return forestWave;
  }

  // 4f. Hutan Kabut Eldoria [335, -140]
  const distMistForest = Math.hypot(x - 335, z - -140);
  if (distMistForest <= 55) {
    const hillWave = Math.sin(x * 0.035 + z * 0.03) * 2.0 + 3.2;
    return hillWave;
  }

  // 4g. Puing Kastil Terbengkalai [225, -35]
  if (Math.hypot(x - 225, z - -35) <= 32) return 1.40;

  // 4h. Desa Benteng Val-Kragor [315, 95]
  if (Math.hypot(x - 315, z - 95) <= 38) return 2.00;

  // 4i. Lembah Batu Lumut [455, 35] - Smoothstep Gaussian Bowl to prevent steep prism cliffs
  const distMossValley = Math.hypot(x - 455, z - 35);
  if (distMossValley <= 55) {
    if (distMossValley <= 32) {
      return 0.50; // Lantai lembah rata rendah (Y: 0.5) di radius 32 unit
    }
    // Transisi lereng landai menanjak halus hingga radius 55 unit menyatu ke pegunungan timur (Y: 9 s.d 11)
    const t = (distMossValley - 32) / (55 - 32);
    const s = t * t * (3 - 2 * t);
    const surroundingHills = Math.max(9.0, Math.min(11.5, 9.5 + Math.sin(x * 0.04) * 1.5));
    return 0.50 + s * (surroundingHills - 0.50);
  }

  // 4j. Mage Tower Hill [70, 20]
  const distMage = Math.hypot(x - 70, z - 20);
  if (distMage <= 18) return 4.50;
  if (distMage <= 32) {
    const t = (distMage - 18) / 14;
    return 4.50 - t * 3.5;
  }

  // 4k. Alur Palung 4 Cabang Sungai (NW, Desert, East, South)
  const distRiver = getDistanceToRiver(x, z);
  if (distRiver < 6.0) {
    const edge = distRiver / 6.0;
    return -2.2 * Math.cos(edge * (Math.PI / 2));
  }

  // 4l. Zona Pemukiman Desa Datar Rata
  if (distVillage < 55) {
    return 0;
  }

  // 4m. Flattened road paths di luar desa
  if (isPointOnRoad(x, z)) {
    return 0.35;
  }

  // 4n. Perbukitan Timur Luas
  if (x > 240) {
    const eastHills = Math.sin(xw * 0.015) * Math.cos(zw * 0.012) * 4.5 + Math.sin(zw * 0.025) * 1.8;
    return Math.max(0.8, Math.min(14.0, 3.5 + eastHills));
  }

  // 4o. Bukit Padang Rumput Eldoria Umum
  const blend = Math.min(1, Math.max(0, (distVillage - 55) / 25));
  const gentleNoise =
    Math.sin(xw * 0.015 + zw * 0.011) * 2.0 +
    Math.cos(xw * 0.007 - zw * 0.012) * 1.5 +
    Math.sin((xw + zw) * 0.022) * 0.4;

  const perlinElevation = clamp(Math.max(0.0, gentleNoise * blend * 1.4), 0.0, 2.2);

  if (isPointNearRoad(x, z, 2.0)) {
    return 0.35 * 0.65 + perlinElevation * 0.35;
  }
  return perlinElevation;
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

  // 1. Pelabuhan Sanctuary & Boardwalk Pier [-135, 145]
  if (Math.hypot(x - -135, z - 145) <= 12) {
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

  // 1b-2. Ibukota Kerajaan Emas Astraea [-250, -210] (Kastil megah batu abu-abu)
  if (Math.hypot(x - -250, z - -210) <= 44) {
    return { height: y, color: [100, 116, 139], biomeId: 'astraea_castle', isWater: false, isPath: false, slope };
  }

  // 1b-3. Hutan Lindung Barat Daya [X: -320 s.d -180, Z: 50 s.d 150] (Cluster hijau rimbun)
  if (x >= -320 && x <= -180 && z >= 50 && z <= 150) {
    return { height: y, color: [30, 105, 40], biomeId: 'sw_forest', isWater: false, isPath: false, slope };
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
  // Desa Utama Plaza [25, 135]
  if (Math.hypot(x - 25, z - 135) <= 18) {
    return { height: y, color: [226, 218, 214], biomeId: 'eldoria_plaza', isWater: false, isPath: true, slope: 0 };
  }
  // Astraea Marble Capital [-250, -210]
  if (Math.hypot(x - -250, z - -210) <= 32) {
    return { height: y, color: [248, 250, 252], biomeId: 'astraea_marble', isWater: false, isPath: true, slope: 0 };
  }
  // Val-Kragor Slate [315, 95]
  if (Math.hypot(x - 315, z - 95) <= 28) {
    return { height: y, color: [100, 116, 139], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope: 0 };
  }
  // Mage Tower Hill [70, 20]
  if (Math.hypot(x - 70, z - 20) <= 16) {
    return { height: y, color: [88, 128, 80], biomeId: 'thunderpeak_hill', isWater: false, isPath: false, slope };
  }

  // Beach sand fringe along natural south and west coastlines
  const distToVillage = Math.hypot(x - 25, z - 135);
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
  // Kuning Pasir Emas Solaria vs Hijau Segar Padang Rumput Eldoria
  // ==========================================================================
  const desertWeight = getDesertWeight(x, z);

  const duneNoise = 0.5 + 0.5 * Math.sin(xw * 0.035 + zw * 0.028);
  const desertR = 212 + (226 - 212) * duneNoise;
  const desertG = 175 + (180 - 175) * duneNoise;
  const desertB = 55 + (72 - 55) * duneNoise;

  const grassNoise = 0.5 + 0.5 * Math.sin(xw * 0.025 - zw * 0.03);
  const grassR = 123 + (107 - 123) * grassNoise;
  const grassG = 160 + (142 - 160) * grassNoise;
  const grassB = 56 + (35 - 56) * grassNoise;

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
  if (Math.abs(x - 20) <= 3.2 && z >= 170 && z <= 215) return true;
  if (Math.hypot(x - 20, z - 130) <= 18) return true;
  return isPointOnRoad(x, z);
}
