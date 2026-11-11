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
  if (xw < 40) {
    const dx = xw - 40;
    return -115 + 1.15 * dx;
  } else if (xw <= 240) {
    const t = (xw - 40) / 200;
    return -115 - 95 * t * t; // Curves from -115 down to -210
  } else {
    return -210 - Math.min(65, (xw - 240) * 0.28); // Slopes to -275 in east
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
  if (xw <= -95) return false;
  return zw < getDesertBoundaryZ(xw);
}

/**
 * SISTEM ALIRAN 4 CABANG SUNGAI BERKELOK ALAMI (MEANDERING SPLINES)
 * Sesuai denah referensi target peta:
 * 1. Hulu 1 (Barat Laut / NW): Keluar dari danau Titan [-260, -415], berkelok melewati timur Astraea [-260, -240] (Jembatan 1 di [-195, -210]), menuju titik temu [35, -5].
 * 2. Hulu 2 (Cabang Gurun/Utara): Bercabang dari titik temu [35, -5] ke timur laut melintasi selatan Piramida & Oase, membelok ke utara di barat Kawah Boss [210, -360] ke kaki Kanyon [50, -520].
 * 3. Hulu 3 (Cabang Timur): Dari titik temu [35, -5] berkelok ke timur melewati utara Puing Kastil [230, -60] (Jembatan 4), utara Val-Kragor [330, 90] (Jembatan 3), lalu belok naik ke utara di timur Hutan Kabut [380, -140].
 * 4. Hilir (Selatan): Dari titik temu [35, -5] (Jembatan 2 / Suspension di [38, 22]), berkelok ke selatan melewati barat kuil torii [70, 110], bermuara di timur Pelabuhan [20, 130].
 */
export const RIVER_NW_BRANCH: [number, number][] = [
  [-260, -415], // Danau Titan Kuno South Shore
  [-245, -365],
  [-225, -315],
  [-210, -260],
  [-195, -210], // Jembatan 1 - Astraea Highway
  [-175, -165],
  [-145, -125],
  [-110, -90],
  [-70, -60],
  [-25, -35],
  [10, -18],
  [35, -5],     // Confluence
];

export const RIVER_DESERT_BRANCH: [number, number][] = [
  [35, -5],     // Confluence
  [55, -45],
  [75, -95],
  [95, -145],
  [115, -195],  // South of Pyramid [-20, -320] & Oasis [20, -240]
  [125, -245],
  [130, -295],
  [125, -345],  // West of World Boss Crater [210, -360]
  [110, -395],
  [90, -445],
  [70, -490],
  [50, -520],   // Kaki Kanyon Kuno
];

export const RIVER_EAST_BRANCH: [number, number][] = [
  [35, -5],     // Confluence
  [85, 10],
  [140, 20],
  [190, 15],    // Jembatan 4 - Puing Kastil Access
  [240, 5],
  [290, 18],
  [335, 38],    // Jembatan 3 - Val-Kragor Access
  [385, 45],
  [430, 25],    // Jembatan 5 - Lembah Batu Lumut Access
  [455, -15],   // Belok ke utara di sebelah timur Hutan Kabut [380, -140]
  [450, -75],
  [440, -135],
  [435, -195],
  [440, -255],  // Pegunungan Timur Laut
];

export const RIVER_SOUTH_BRANCH: [number, number][] = [
  [35, -5],     // Confluence
  [38, 22],     // Jembatan 2 - Central Suspension Bridge
  [42, 55],
  [45, 90],     // Barat Kuil Torii
  [46, 125],
  [48, 160],
  [50, 195],    // Muara Samudra Selatan
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
  // A. KALDERA SARANG NAGA & PULAU VULKANIK [80, 360]
  const cx = 80;
  const cz = 360;
  const rx = 160;
  const rz = 85;
  const edgeNoise = Math.sin(x * 0.06) * 10 + Math.cos(z * 0.07) * 7;
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

  // Cape/Tanjung di selatan Desa Utama [20, 130]
  const distToVillage = Math.hypot(x - 20, z - 130);
  const cape = Math.max(0, 1.0 - distToVillage / 85) * 26;
  const southCoastZ = 185 + Math.sin(xw * 0.015) * 16 + Math.cos(xw * 0.04) * 8 + cape;
  const westCoastX = -460 + Math.sin(zw * 0.018) * 30 + Math.cos(zw * 0.045) * 12;

  // Teluk Samudra Timur melengkung naik di tenggara membatasi Val-Kragor & Batu Lumut
  const isEastOcean = x > 495 && (z > -50 + Math.sin(xw * 0.02) * 16);

  if (x < westCoastX || z > southCoastZ || isEastOcean) {
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

  // 1. ZONA VOLCANO: Pulau Kawah Vulkanik Seberang Laut Selatan [80, 360]
  if (zone.id === 'volcano') {
    const cx = 80;
    const cz = 360;
    const rx = 160;
    const rz = 85;
    const edgeNoise = Math.sin(x * 0.06) * 10 + Math.cos(z * 0.07) * 7;
    const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);

    if (Math.hypot(x - 80, z - 310) < 16) return 2.0;
    const distCenter = Math.hypot(x - 80, z - 360);
    if (distCenter <= 45) return 2.50;
    if (distCenter <= 56) {
      const t = (distCenter - 45) / 11;
      return 2.50 + Math.sin(t * Math.PI) * 6.0;
    }
    if (distSq > 0.70) {
      const t = (distSq - 0.70) / 0.30;
      return Math.max(0.2, 3.5 * (1 - t));
    }
    return 1.8;
  }

  // 2. ZONA OCEAN: Samudra & Laut Lepas Azure
  if (zone.id === 'ocean') {
    const distToVillage = Math.hypot(x - 20, z - 130);
    const cape = Math.max(0, 1.0 - distToVillage / 85) * 26;
    const southCoastZ = 185 + Math.sin(xw * 0.015) * 16 + Math.cos(xw * 0.04) * 8 + cape;
    if (z >= southCoastZ && z <= southCoastZ + 15) {
      const t = (z - southCoastZ) / 15;
      return 0.2 - t * 2.8;
    }
    return -3.5;
  }

  // 3. ZONA DESERT: Gurun Pasir Emas Solaria
  if (zone.id === 'desert') {
    // 3a. Kanyon Kuno [50, -520] (Northern Red Canyon Mesas & Cliffs)
    const distCanyon = Math.hypot(x - 50, z - -520);
    if (distCanyon <= 75) {
      const canyonNoise = Math.sin(x * 0.035) * Math.cos(z * 0.03) * 5.0 + Math.sin(x * 0.08) * 2.0;
      return clamp(12.0 + canyonNoise, 8.0, 20.0);
    }

    // 3b. Istana Sultan Malik [360, -440]
    if (Math.hypot(x - 360, z - -440) <= 36) return 2.00;

    // 3c. Kawah Cacat World Boss (Lv. 10) [210, -360]
    const distSinkhole = Math.hypot(x - 210, z - -360);
    if (distSinkhole <= 45) {
      const t = distSinkhole / 45;
      const bowl = Math.pow(t, 1.8) * 2.5 - 2.5; // -2.5 unit di tengah, 0 di bibir
      const swirlRipple = Math.sin(Math.atan2(z - -360, x - 210) * 3 + distSinkhole * 0.4) * 0.18;
      return 1.80 + bowl + swirlRipple;
    }

    // 3d. Piramida Emas Solaria [-20, -320]
    if (Math.hypot(x - -20, z - -320) <= 32) return 1.50;

    // 3e. Oase Solaria [20, -240]
    const distOasis = Math.hypot(x - 20, z - -240);
    if (distOasis < 16) return -0.4;
    if (distOasis < 26) return 0.6;

    // Rolling golden dunes
    const duneWave = Math.sin(xw * 0.035 + zw * 0.028) * 1.1 + Math.cos(xw * 0.02 - zw * 0.03) * 0.5;
    return clamp(1.4 + duneWave, 0.5, 3.5);
  }

  // 4. ZONA PLAINS: Padang Rumput Eldoria (Daratan Utama)
  // 4a. Desa Utama & Padang Rumput Eldoria [20, 130]
  const distVillage = Math.hypot(x - 20, z - 130);
  if (distVillage <= 42) return 0.25;

  // 4b. Pelabuhan Sanctuary [20, 175..200]
  if (Math.abs(x - 20) <= 12 && z >= 165 && z <= 200) return 0.35;

  // 4c. Lembah Danau Titan Kuno [-260, -450] (Depresi Danau Y = -2.8, permukaan air di Y = -0.35)
  const distTitanLake = Math.hypot(x - -260, z - -450);
  if (distTitanLake <= 40) {
    return -2.80; // Dasar danau
  }
  if (distTitanLake <= 52) {
    const t = (distTitanLake - 40) / 12;
    return -2.80 + t * 4.0; // Lereng tepian danau naik
  }

  // 4d. Pegunungan Salju Barat Laut (Mengelilingi Danau Titan Secara Organik)
  const isSnowMountainZone = distTitanLake > 52 && distTitanLake <= 130 && (x + wx) < -110 && (z + wz) < -300;
  if (isSnowMountainZone) {
    const rimNoise = Math.sin(xw * 0.02) * Math.cos(zw * 0.02) * 6.5 + Math.sin((xw + zw) * 0.035) * 3.0;
    return clamp(13.0 + rimNoise, 8.0, 22.0);
  }

  // 4e. Ibukota Kerajaan Emas Astraea & Istana Kaisar [-260, -240]
  if (Math.hypot(x - -260, z - -240) <= 46) return 2.00;

  // 4f. Hutan Kabut Eldoria [380, -140]
  const distMistForest = Math.hypot(x - 380, z - -140);
  if (distMistForest <= 55) {
    const hillWave = Math.sin(x * 0.035 + z * 0.03) * 2.0 + 3.2;
    return hillWave;
  }

  // 4g. Puing Kastil Terbengkalai [230, -60]
  if (Math.hypot(x - 230, z - -60) <= 32) return 1.20;

  // 4h. Desa Benteng Val-Kragor [330, 90]
  if (Math.hypot(x - 330, z - 90) <= 38) return 2.00;

  // 4i. Lembah Batu Lumut [480, 20]
  if (Math.hypot(x - 480, z - 20) <= 38) return 0.50;

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
    const eastHills = Math.sin(xw * 0.015) * Math.cos(zw * 0.012) * 5.0 + Math.sin(zw * 0.025) * 2.0;
    return Math.max(0.8, Math.min(18.0, 3.5 + eastHills));
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

  // 1. Pelabuhan Sanctuary & Boardwalk Pier [20, 175..215]
  if (Math.abs(x - 20) <= 3.2 && z >= 170 && z <= 215) {
    return { height: 1.85, color: [141, 110, 99], biomeId: 'harbor_pier', isWater: false, isPath: true, slope: 0 };
  }

  // 1a. Lembah Danau Titan Kuno [-260, -450] (Danau Biru Jernih Pegunungan & Tepian)
  const distTitanLake = Math.hypot(x - -260, z - -450);
  if (distTitanLake <= 40) {
    return { height: y, color: [45, 165, 205], biomeId: 'titan_lake', isWater: true, isPath: false, slope: 0 };
  }
  if (distTitanLake <= 52) {
    return { height: y, color: [160, 175, 185], biomeId: 'titan_shore', isWater: false, isPath: false, slope };
  }

  // 1b. Puncak Pegunungan Bersalju Organik (Mengelilingi Danau Titan)
  const isSnowMountainZone = distTitanLake > 52 && distTitanLake <= 130 && (x + wx) < -110 && (z + wz) < -300;
  if (isSnowMountainZone && y >= 11.5) {
    return { height: y, color: [245, 248, 252], biomeId: 'snowy_peak', isWater: false, isPath: false, slope };
  }
  if (isSnowMountainZone && y >= 7.5) {
    return { height: y, color: [120, 130, 140], biomeId: 'mountain_rock', isWater: false, isPath: false, slope };
  }

  // 1c. Alur Palung 4 Cabang Sungai (NW, Desert, East, South)
  const distRiverSample = getDistanceToRiver(x, z);
  if (distRiverSample < 4.2 && y <= 0.0) {
    return { height: y, color: [45, 165, 205], biomeId: 'river_water', isWater: true, isPath: false, slope };
  }
  if (distRiverSample < 6.0) {
    return { height: y, color: [136, 122, 102], biomeId: 'river_bank', isWater: false, isPath: false, slope };
  }

  // 1d. Kanyon Kuno [50, -520] (Tebing Cadas Merah & Sandstone)
  if (Math.hypot(x - 50, z - -520) <= 75) {
    return { height: y, color: [175, 85, 45], biomeId: 'ancient_canyon', isWater: false, isPath: false, slope };
  }

  // 1e. Hutan Kabut Eldoria [380, -140] (Hijau Pinus Gelap Kabut)
  if (Math.hypot(x - 380, z - -140) <= 60) {
    return { height: y, color: [35, 95, 40], biomeId: 'mist_forest', isWater: false, isPath: false, slope };
  }

  // 1f. Puing Kastil Terbengkalai [230, -60] (Batu Slate Reruntuhan)
  if (Math.hypot(x - 230, z - -60) <= 32) {
    return { height: y, color: [115, 125, 135], biomeId: 'abandoned_castle', isWater: false, isPath: false, slope };
  }

  // 1g. Lembah Batu Lumut [480, 20] (Lembah Hijau Berlumut)
  if (Math.hypot(x - 480, z - 20) <= 42) {
    return { height: y, color: [75, 135, 60], biomeId: 'moss_valley', isWater: false, isPath: false, slope };
  }

  // 2. Air Samudra / Laut Lepas
  if (y < 0.0) {
    if (zone.id === 'desert' && Math.hypot(x - 20, z - -240) < 18) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    const depth = clamp(-y / 4.0, 0, 1);
    const r = Math.round(2 + (1 - depth) * 15);
    const g = Math.round(132 + (1 - depth) * 20);
    const b = Math.round(199 + (1 - depth) * 20);
    return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
  }

  // 3. Volcanic Zone (Dragonfang Caldera & Volcano Island [80, 360])
  if (zone.id === 'volcano') {
    const cx = 80;
    const cz = 360;
    const rx = 160;
    const rz = 85;
    const edgeNoise = Math.sin(x * 0.06) * 10 + Math.cos(z * 0.07) * 7;
    const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);

    if (distSq <= 0.35 || Math.hypot(x - 80, z - 360) <= 16) {
      return { height: y, color: [220, 38, 38], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
    }
    if (Math.hypot(x - 80, z - 360) <= 24) {
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

  // Piramida Emas Solaria [-20, -320]
  if (Math.hypot(x - -20, z - -320) <= 24) {
    return { height: y, color: [220, 160, 40], biomeId: 'solaria_pyramid', isWater: false, isPath: false, slope };
  }

  // Kawah Cacat World Boss [210, -360]
  const distSinkhole = Math.hypot(x - 210, z - -360);
  if (distSinkhole <= 45) {
    const t = distSinkhole / 45;
    const swirl = Math.sin(Math.atan2(z - -360, x - 210) * 4 + distSinkhole * 0.5);
    const r = Math.round(180 + t * 50 + swirl * 10);
    const g = Math.round(110 + t * 65 + swirl * 8);
    const b = Math.round(30 + t * 50);
    return { height: y, color: [r, g, b], biomeId: 'solaria_sinkhole', isWater: false, isPath: false, slope };
  }

  // 5. Special Plains Landmarks
  // Desa Utama Plaza [20, 130]
  if (Math.hypot(x - 20, z - 130) <= 18) {
    return { height: y, color: [226, 218, 214], biomeId: 'eldoria_plaza', isWater: false, isPath: true, slope: 0 };
  }
  // Astraea Marble Capital [-260, -240]
  if (Math.hypot(x - -260, z - -240) <= 32) {
    return { height: y, color: [248, 250, 252], biomeId: 'astraea_marble', isWater: false, isPath: true, slope: 0 };
  }
  // Val-Kragor Slate [330, 90]
  if (Math.hypot(x - 330, z - 90) <= 28) {
    return { height: y, color: [100, 116, 139], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope: 0 };
  }
  // Mage Tower Hill [70, 20]
  if (Math.hypot(x - 70, z - 20) <= 16) {
    return { height: y, color: [88, 128, 80], biomeId: 'thunderpeak_hill', isWater: false, isPath: false, slope };
  }

  // Beach sand fringe along natural south and west coastlines
  const distToVillage = Math.hypot(x - 20, z - 130);
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

  const biomeId = desertWeight > 0.5 ? 'solaria_desert' : 'plains_grass';
  return { height: y, color: [r, g, b], biomeId, isWater: false, isPath: false, slope };
}

function sampleIsPath(x: number, z: number): boolean {
  if (Math.abs(x - 20) <= 3.2 && z >= 170 && z <= 215) return true;
  if (Math.hypot(x - 20, z - 130) <= 18) return true;
  return isPointOnRoad(x, z);
}
