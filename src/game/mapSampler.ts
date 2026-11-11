/**
 * Unified Continent Map Sampler - Simplified 3-Biome + South Ocean Architecture
 * Scale: X: -580..680, Z: -580..460
 *
 * 1. South Ocean / Samudra Azure ('ocean'): Z > 220 (except volcano island), and outer bounds.
 * 2. South Volcanic Island / Sarang Naga ('volcano'): Z >= 300 && X >= -150 && X <= 250.
 * 3. North & East Desert / Gurun Pasir Emas Solaria ('desert'): X >= -115 && X <= 550 && Z >= -420 && Z <= -60.
 * 4. Central, West & Coast Plains / Padang Rumput Eldoria ('plains'): All remaining land (X < -115, Z: -60..220).
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
 * Kalkulasi sumbu Z kurva batas selatan Gurun Solaria berdasarkan koordinat X (Garis Kuning).
 * Batas ditarik lebih ke selatan:
 * - Barat ke tengah: melengkung dari (-120, -380) -> (0, -216) -> (80, -130)
 * - Koridor tengah: melengkung ke selatan mencapai puncak di (180, -75) lalu ke (280, -150)
 * - Timur: melandai ke Z: -160 s.d -175 (mengunci Val-Kragor di Z: 80 dan Mage Tower di Z: 10 murni Eldoria).
 * Nilai Z di utara garis ini (Z < zBoundary) adalah Gurun Solaria.
 */
export function getDesertBoundaryZ(x: number): number {
  if (x < 80) {
    const dx = x - 80;
    return -130 + 1.25 * dx + 0.0022 * dx * dx;
  } else if (x <= 280) {
    const t = (x - 180) / 100;
    if (x < 180) {
      return -75 - 55 * t * t;
    } else {
      return -75 - 75 * t * t;
    }
  } else {
    return -150 - Math.min(25, (x - 280) * 0.12);
  }
}

/**
 * DEFINISI BATAS BIOME PRESISI (SINGLE SOURCE OF TRUTH)
 * Kurva matematis batas selatan Gurun Solaria vs Padang Rumput Eldoria (Garis Kuning)
 * Di sebelah utara garis ini (z < zBoundary) dan x > -120 adalah Gurun Solaria.
 * Di sebelah selatannya (z >= zBoundary) adalah Padang Rumput Eldoria.
 * Menjamin Mage Tower (140, 10), Val-Kragor (380, 80) murni Padang Rumput Eldoria.
 */
export function isDesertBiome(x: number, z: number): boolean {
  if (x <= -120) return false;
  return z < getDesertBoundaryZ(x);
}

/**
 * SISTEM ALIRAN SUNGAI BERCABANG (RIVER NETWORK)
 * Sesuai denah garis biru pada peta (Blueprint Map V7.0):
 * 1. Cabang A (Barat Laut / Northwest): Mengalir dari laut barat laut [-460, -310]
 *    melewati utara Astraea, memotong jalan raya barat (Jembatan 1 di [-368, -185]),
 *    melengkung ke tenggara melewati selatan Mata Air Suci, lalu ke Titik Temu [110, 35].
 * 2. Cabang B (Timur / East): Mengalir dari Titik Temu [110, 35], memotong jalan raya Val-Kragor
 *    (Jembatan 3 di [255, 60]), melewati utara benteng Val-Kragor [380, 46], hingga batas timur [670, 72].
 * 3. Cabang C (Selatan / Hilir Utama): Mengalir dari Titik Temu [110, 35], melewati tepat di bawah
 *    Jembatan Gantung (Jembatan 2 di [145, 47]), mengalir lurus ke selatan di timur gerbang Torii
 *    (X: 160 s.d 188), jauh di timur desa (> 130 unit dari kebun), bermuara di Samudra Selatan [188, 300].
 */
export const RIVER_NORTHWEST_BRANCH: [number, number][] = [
  [-220, -460], // Hulu Danau Titan Kuno (Northwest Mountain Lake)
  [-245, -390],
  [-290, -320],
  [-335, -250],
  [-368, -185], // Jembatan 1 - Astraea Highway
  [-320, -155],
  [-260, -130],
  [-190, -95],
  [-120, -65],
  [-50, -30],
  [10, -5],
  [65, 15],
  [110, 35],    // Titik Temu (Confluence)
];

export const RIVER_EAST_BRANCH: [number, number][] = [
  [110, 35],    // Titik Temu (Confluence)
  [150, 30],
  [185, 24],
  [220, 38],
  [255, 60],    // Jembatan 3 - Val-Kragor Highway
  [310, 52],
  [380, 46],    // Melewati utara Benteng Val-Kragor
  [460, 48],
  [530, 55],
  [600, 62],
  [670, 72],    // Batas timur peta
];

export const RIVER_MAIN_DOWNSTREAM: [number, number][] = [
  [110, 35],    // Titik Temu (Confluence)
  [128, 41],
  [145, 47],    // Jembatan 2 - Mage Tower Suspension Bridge
  [158, 70],
  [168, 105],
  [176, 145],
  [182, 185],
  [184, 225],
  [186, 265],
  [188, 300],   // Muara Samudra Selatan
];

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
  // 1. Northwest branch
  for (let i = 0; i < RIVER_NORTHWEST_BRANCH.length - 1; i++) {
    const d = distToSegment(
      px,
      pz,
      RIVER_NORTHWEST_BRANCH[i][0],
      RIVER_NORTHWEST_BRANCH[i][1],
      RIVER_NORTHWEST_BRANCH[i + 1][0],
      RIVER_NORTHWEST_BRANCH[i + 1][1]
    );
    if (d < minDist) minDist = d;
  }
  // 2. East branch
  for (let i = 0; i < RIVER_EAST_BRANCH.length - 1; i++) {
    const d = distToSegment(
      px,
      pz,
      RIVER_EAST_BRANCH[i][0],
      RIVER_EAST_BRANCH[i][1],
      RIVER_EAST_BRANCH[i + 1][0],
      RIVER_EAST_BRANCH[i + 1][1]
    );
    if (d < minDist) minDist = d;
  }
  // 3. Main downstream branch
  for (let i = 0; i < RIVER_MAIN_DOWNSTREAM.length - 1; i++) {
    const d = distToSegment(
      px,
      pz,
      RIVER_MAIN_DOWNSTREAM[i][0],
      RIVER_MAIN_DOWNSTREAM[i][1],
      RIVER_MAIN_DOWNSTREAM[i + 1][0],
      RIVER_MAIN_DOWNSTREAM[i + 1][1]
    );
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Faktor bobot blend transisi alami sempit selebar 5 unit (4-6 unit) di perbatasan Gurun Solaria vs Padang Rumput Eldoria.
 * Return 1.0 = 100% Pasir Emas Solaria, 0.0 = 100% Hijau Segar Eldoria, 0.0..1.0 = Transisi halus (smoothstep).
 */
export function getDesertWeight(x: number, z: number): number {
  if (x <= -125) return 0.0;
  const xBlend = Math.max(0.0, Math.min(1.0, (x - -125) / 5.0));
  const zBoundary = getDesertBoundaryZ(x);
  const diffZ = z - zBoundary;
  const s = Math.max(0.0, Math.min(1.0, 0.5 - diffZ / 5.0));
  const zFactor = s * s * (3.0 - 2.0 * s);
  return zFactor * xBlend;
}

/**
 * 1. RESTRUKTURISASI MATRIKS 3 BIOMA & LAUT
 * Evaluasi zona matematis deterministik proporsional dan bersih
 */
export function getBiomeAt(x: number, z: number): BiomeZoneInfo {
  // A. KALDERA SARANG NAGA & PULAU VULKANIK ('volcano' - BENTUK ELIPS ORGANIK [80, 360])
  const cx = 80;
  const cz = 360;
  const rx = 160;
  const rz = 85;
  const edgeNoise = Math.sin(x * 0.06) * 10 + Math.cos(z * 0.07) * 7;
  const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);
  const isVolcanoIsland = distSq <= 1.0;

  if (isVolcanoIsland) {
    return {
      id: 'volcano',
      name: 'Dragonfang Caldera & Volcano Island',
      nameId: 'Kawah Vulkanik & Sarang Naga Purba',
      minY: 2.0,
      maxY: 7.0,
      color: [28, 25, 23], // #1c1917 / #dc2626
    };
  }

  // B. SAMUDRA & LAUT LEPAS AZURE ('ocean' - LAUT BARAT & LAUT SELATAN)
  const southCoastZ = 190 + Math.sin(x * 0.012) * 20 + Math.cos(x * 0.035) * 8;
  const westCoastX = -460 + Math.sin(z * 0.015) * 35 + Math.cos(z * 0.04) * 15;

  if (x < westCoastX || z > southCoastZ) {
    return {
      id: 'ocean',
      name: 'Azure Coast & South Ocean',
      nameId: 'Samudra & Laut Lepas Azure',
      minY: -10.0,
      maxY: 0.0,
      color: [2, 132, 199], // #0284c7
    };
  }

  // C. GURUN PASIR EMAS SOLARIA ('desert' - DI SISI UTARA/TIMUR LAUT SESUAI IS_DESERT_BIOME)
  if (isDesertBiome(x, z)) {
    return {
      id: 'desert',
      name: 'Solaria Golden Desert',
      nameId: 'Gurun Pasir Emas Solaria',
      minY: 0.5,
      maxY: 3.5,
      color: [234, 179, 8], // #eab308
    };
  }

  // D. PADANG RUMPUT ELDORIA ('plains' - BUFFER ZONA DOMINAN TENGAH & BARAT)
  return {
    id: 'plains',
    name: 'Eldoria Central Plains',
    nameId: 'Padang Rumput Eldoria',
    minY: 0.0,
    maxY: 2.0,
    color: [101, 163, 13], // #65a30d
  };
}

/**
 * Procedural height function across the vast simplified continent
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  const zone = getBiomeAt(x, z);

  // 1. ZONA VOLCANO: Pulau Kawah Vulkanik Seberang Laut Selatan (Bentuk Elips Organik [80, 360])
  if (zone.id === 'volcano') {
    const cx = 80;
    const cz = 360;
    const rx = 160;
    const rz = 85;
    const edgeNoise = Math.sin(x * 0.06) * 10 + Math.cos(z * 0.07) * 7;
    const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);

    // Landing ramp at north entrance [80, 310]
    if (Math.hypot(x - 80, z - 310) < 16) {
      return 2.0;
    }
    // Caldera crater floor around dragon arena [80, 360] (radius 45 unit)
    const distCenter = Math.hypot(x - 80, z - 360);
    if (distCenter <= 45) {
      return 2.50;
    }
    // Crater rim ridge
    if (distCenter <= 56) {
      const t = (distCenter - 45) / 11;
      return 2.50 + Math.sin(t * Math.PI) * 6.0;
    }
    // Island outer slope down to sea
    if (distSq > 0.70) {
      const t = (distSq - 0.70) / 0.30;
      return Math.max(0.2, 3.5 * (1 - t));
    }
    return 1.8;
  }

  // 2. ZONA OCEAN: Samudra & Laut Lepas Azure (Garis Pantai Selatan & Barat)
  if (zone.id === 'ocean') {
    const southCoastZ = 190 + Math.sin(x * 0.012) * 20 + Math.cos(x * 0.035) * 8;
    const westCoastX = -460 + Math.sin(z * 0.015) * 35 + Math.cos(z * 0.04) * 15;

    // Coastal beach slope transition along south coast
    if (z >= southCoastZ && z <= southCoastZ + 15 && x >= westCoastX) {
      const t = (z - southCoastZ) / 15;
      return 0.2 - t * 2.8;
    }
    // Coastal beach slope transition along west coast
    if (x <= westCoastX && x >= westCoastX - 20) {
      const t = (westCoastX - x) / 20;
      return 0.2 - t * 2.8;
    }
    return -3.5;
  }

  // 3. ZONA DESERT: Gurun Pasir Emas Solaria (Ekspansi Utara & Timur)
  if (zone.id === 'desert') {
    // 3a. Golden Bazaar Village [250, -280]
    if (Math.hypot(x - 250, z - -280) <= 32) return 1.80;
    // 3b. Sultan Taj Mahal Palace [340, -280]
    if (Math.hypot(x - 340, z - -280) <= 32) return 2.00;
    // Paved avenue connecting Bazaar & Palace
    if (x >= 250 && x <= 340 && Math.abs(z - -280) <= 5.5) return 1.90;
    // 3c. Pharaoh Pyramid [120, -280]
    if (Math.hypot(x - 120, z - -280) <= 28) return 1.50;
    // 3d. Hidden Oasis Lake [150, -360]
    const distOasis = Math.hypot(x - 150, z - -360);
    if (distOasis < 16) return -0.4; // Water depression
    if (distOasis < 26) return 0.6;

    // 3e. The Great Solaria Sinkhole - Sandworm Arena [495, -362]
    // Radius 45 unit, cekungan bukit pasir melingkar yang menurun landai ke arah tengah (-2.5 unit)
    const distSinkhole = Math.hypot(x - 495, z - -362);
    if (distSinkhole <= 45) {
      const t = distSinkhole / 45;
      const bowl = Math.pow(t, 1.8) * 2.5 - 2.5; // -2.5 unit di tengah, 0 di bibir
      const swirlRipple = Math.sin(Math.atan2(z - -362, x - 495) * 3 + distSinkhole * 0.4) * 0.18;
      return 1.80 + bowl + swirlRipple;
    }

    // 3f. Kanyon Kuno [50, -550] (Northern Canyon Mesas & Cliffs)
    const distCanyon = Math.hypot(x - 50, z - -550);
    if (distCanyon <= 75) {
      const canyonNoise = Math.sin(x * 0.035) * Math.cos(z * 0.03) * 5.0 + Math.sin(x * 0.08) * 2.0;
      return clamp(12.0 + canyonNoise, 8.0, 20.0);
    }

    // Rolling golden dunes
    const duneWave = Math.sin(x * 0.035 + z * 0.028) * 1.1 + Math.cos(x * 0.02 - z * 0.03) * 0.5;
    return clamp(1.4 + duneWave, 0.5, 3.5);
  }

  // 4. ZONA PLAINS: Padang Rumput Eldoria (Daratan Utama)
  // 4a. Sanctuary Village [0, 180]
  if (Math.hypot(x - 0, z - 180) <= 36) return 0.25;
  // 4b. Sanctuary Coastal Harbor [0, 205..220]
  if (Math.abs(x) <= 12 && z >= 195 && z <= 220) return 0.35;
  // 4c. Fortress Val-Kragor [390, 100] (Diposisikan sesuai denah V8)
  if (Math.hypot(x - 390, z - 100) <= 38) return 2.00;
  if (Math.hypot(x - 380, z - 80) <= 38) return 2.00;
  // 4d. Imperial Capital Astraea [-340, -220]
  if (Math.hypot(x - -340, z - -220) <= 46) return 2.00;
  // 4e. Mata Air Suci & Taman Bunga Eldoria [-144, -270]
  const distSpring = Math.hypot(x - -144, z - -270);
  if (distSpring <= 5.5) return -0.45; // Kolam air tawar melingkar
  if (distSpring <= 7.5) return 0.25; // Tepian batu kali halus berlumut

  // 4f. Mage Tower Hill [180, 60]
  const distMage = Math.hypot(x - 180, z - 60);
  if (distMage <= 18) return 4.50;
  if (distMage <= 32) {
    const t = (distMage - 18) / 14;
    return 4.50 - t * 3.5;
  }

  // 4g. Reruntuhan Colosseum Kuno (Ancient Colosseum Arena) (X: -224, Z: -435, Radius 54)
  const distColosseum = Math.hypot(x - -224, z - -435);
  if (distColosseum <= 48) return -0.20; // Hamparan lantai pasir arena
  if (distColosseum <= 56) return 0.60; // Pondasi dinding melingkar colosseum

  // 4h. Perbukitan Kincir Angin & Pondok Gembala [288, 137]
  const distWindmillHill = Math.hypot(x - 288, z - 137);
  if (distWindmillHill <= 38) {
    const t = distWindmillHill / 38;
    return 2.2 * Math.cos(t * (Math.PI / 2));
  }

  // 4i. Lembah Danau Titan Kuno [-220, -500] (Depresi Danau Y = -2.8, bibir danau naik ke pegunungan)
  const distTitanLake = Math.hypot(x - -220, z - -500);
  if (distTitanLake <= 42) {
    return -2.80; // Kolam danau
  }
  if (distTitanLake <= 54) {
    const t = (distTitanLake - 42) / 12;
    return -2.80 + t * 4.0; // Lereng tepian danau naik
  }

  // 4j. Puing Kastil Terbengkalai [350, -15] (Fondasi dataran batu)
  if (Math.hypot(x - 350, z - -15) <= 32) return 1.20;

  // 4k. Lembah Batu Lumut [540, 0] (Lembah datar terlindung di timur)
  if (Math.hypot(x - 540, z - 0) <= 38) return 0.50;

  // 4l. Hutan Kabut Eldoria [400, 0] (Bukit bergelombang kabut di timur)
  const distMistForest = Math.hypot(x - 400, z - 0);
  if (distMistForest <= 55) {
    const hillWave = Math.sin(x * 0.04 + z * 0.035) * 1.8 + 2.5;
    return hillWave;
  }

  // 4m. Alur Palung Sungai Bercabang Tiga Jalur (Northwest, East -> Confluence [110, 35] -> South Ocean)
  const distRiver = getDistanceToRiver(x, z);
  if (distRiver < 6.0) {
    const edge = distRiver / 6.0;
    const riverBedDrop = -2.2 * Math.cos(edge * (Math.PI / 2));
    return riverBedDrop;
  }

  // 4n. Zona Pemukiman Desa (Wajib Datar 0 agar bangunan tidak amblas/melayang)
  const distToVillage = Math.hypot(x - 10, z - 110);
  if (distToVillage < 55) {
    return 0;
  }

  // 4o. Flattened road paths di luar desa (jalan setapak batu tetap rata)
  if (isPointOnRoad(x, z)) {
    return 0.35;
  }

  // 4p. Zonal Mountains & Natural Rolling Hills (Sesuai Syarat Prompt 10)
  // 1. Pegunungan Utara & Northwest (Lembah Danau Titan Kuno & Lereng Salju, Z < -350)
  if (z < -350) {
    const hillNoise = Math.sin(x * 0.012) * Math.cos(z * 0.009) * 8.0 + Math.sin((x + z) * 0.02) * 3.0;
    const peakHeight = Math.max(2.0, Math.min(22.0, 7.0 + hillNoise));
    return peakHeight;
  }

  // 2. Pegunungan & Perbukitan Timur (Hutan Kabut Eldoria & Punggungan Lembah Batu Lumut, X > 250)
  if (x > 250) {
    const eastHills = Math.sin(x * 0.015) * Math.cos(z * 0.012) * 5.5 + Math.sin(z * 0.025) * 2.0;
    const eastHeight = Math.max(1.0, Math.min(18.0, 4.0 + eastHills));
    return eastHeight;
  }

  // 3. Bukit Padang Rumput Eldoria Umum (Z < 200, X <= 250)
  const blend = Math.min(1, Math.max(0, (distToVillage - 55) / 25));
  const gentleNoise =
    Math.sin(x * 0.015 + z * 0.011) * 2.0 +
    Math.cos(x * 0.007 - z * 0.012) * 1.5 +
    Math.sin((x + z) * 0.022) * 0.4;

  const perlinElevation = clamp(Math.max(0.0, gentleNoise * blend * 1.4), 0.0, 2.2);

  // Smooth blending at road borders (buffer 2.0 unit)
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

  const delta = 2.0;
  const yRight = getProceduralContinentHeight(x + delta, z);
  const yDown = getProceduralContinentHeight(x, z + delta);
  const slope = clamp(Math.hypot(yRight - y, yDown - y) / delta, 0, 1);

  // 1. Pelabuhan Sanctuary & Boardwalk Pier (Z: 200..235, X: ~0)
  if (Math.abs(x) <= 3.2 && z >= 195 && z <= 235) {
    return { height: 1.85, color: [141, 110, 99], biomeId: 'harbor_pier', isWater: false, isPath: true, slope: 0 };
  }

  // 1a. Lembah Danau Titan Kuno [-220, -500] (Danau Biru Jernih Pegunungan & Tepian)
  const distTitanLake = Math.hypot(x - -220, z - -500);
  if (distTitanLake <= 42) {
    return { height: y, color: [45, 165, 205], biomeId: 'titan_lake', isWater: true, isPath: false, slope: 0 };
  }
  if (distTitanLake <= 52) {
    return { height: y, color: [160, 175, 185], biomeId: 'titan_shore', isWater: false, isPath: false, slope };
  }

  // 1b. Alur Palung Sungai Bercabang (Northwest, East -> Confluence -> Bridge -> South Ocean)
  const distRiverSample = getDistanceToRiver(x, z);
  if (distRiverSample < 4.2 && y <= 0.0) {
    return { height: y, color: [45, 165, 205], biomeId: 'river_water', isWater: true, isPath: false, slope };
  }
  if (distRiverSample < 6.0) {
    return { height: y, color: [136, 122, 102], biomeId: 'river_bank', isWater: false, isPath: false, slope };
  }

  // 1c. Puncak Pegunungan Bersalju & Batuan Granit (Utara Z < -360, X < -100)
  if (z < -360 && x < -100 && y >= 11.5) {
    return { height: y, color: [245, 248, 252], biomeId: 'snowy_peak', isWater: false, isPath: false, slope };
  }
  if (z < -360 && x < -100 && y >= 7.5) {
    return { height: y, color: [120, 130, 140], biomeId: 'mountain_rock', isWater: false, isPath: false, slope };
  }

  // 1d. Kanyon Kuno [50, -550] (Tebing Cadas Merah & Sandstone)
  if (z < -460 && x >= -20 && x <= 140) {
    return { height: y, color: [175, 85, 45], biomeId: 'ancient_canyon', isWater: false, isPath: false, slope };
  }

  // 1e. Hutan Kabut Eldoria [400, 0] (Hijau Pinus Gelap Kabut)
  if (Math.hypot(x - 400, z - 0) <= 60) {
    return { height: y, color: [35, 95, 40], biomeId: 'mist_forest', isWater: false, isPath: false, slope };
  }

  // 1f. Puing Kastil Terbengkalai [350, -15] (Batu Slate Reruntuhan)
  if (Math.hypot(x - 350, z - -15) <= 32) {
    return { height: y, color: [115, 125, 135], biomeId: 'abandoned_castle', isWater: false, isPath: false, slope };
  }

  // 1g. Lembah Batu Lumut [540, 0] (Lembah Hijau Berlumut)
  if (Math.hypot(x - 540, z - 0) <= 42) {
    return { height: y, color: [75, 135, 60], biomeId: 'moss_valley', isWater: false, isPath: false, slope };
  }

  // 1c. Reruntuhan Colosseum Kuno (Ancient Colosseum Arena) [-224, -435] (Skala 2.5x Boss Arena)
  if (Math.hypot(x - -224, z - -435) <= 52) {
    return { height: y, color: [194, 178, 153], biomeId: 'colosseum_arena', isWater: false, isPath: false, slope };
  }

  // 1d. Mata Air Suci & Taman Bunga Eldoria [-144, -270] (Kolam Air Tawar Jernih)
  if (Math.hypot(x - -144, z - -270) <= 5.5) {
    return { height: y, color: [56, 189, 248], biomeId: 'sacred_spring', isWater: true, isPath: false, slope: 0 };
  }

  // 2. Air Samudra / Laut Lepas
  if (y < 0.0) {
    if (zone.id === 'desert' && Math.hypot(x - 150, z - -360) < 18) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    const depth = clamp(-y / 4.0, 0, 1);
    const r = Math.round(2 + (1 - depth) * 15);
    const g = Math.round(132 + (1 - depth) * 20);
    const b = Math.round(199 + (1 - depth) * 20);
    return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
  }

  // 3. Volcanic Zone (Dragonfang Caldera & Volcano Island)
  if (zone.id === 'volcano') {
    const cx = 80;
    const cz = 360;
    const rx = 160;
    const rz = 85;
    const edgeNoise = Math.sin(x * 0.06) * 10 + Math.cos(z * 0.07) * 7;
    const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);

    // Inti kawah terdalam (lava aktif): distSq <= 0.35 atau di sekeliling arena naga [80, 360]
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
  // Paved Avenue between Bazaar [238, -280] & Palace [330, -280]
  if (x >= 238 && x <= 330 && Math.abs(z - -280) <= 3.5) {
    return { height: y, color: [217, 190, 139], biomeId: 'solaria_road', isWater: false, isPath: true, slope: 0 };
  }
  // Pyramid [120, -280]
  if (Math.hypot(x - 120, z - -280) <= 24) {
    return { height: y, color: [220, 160, 40], biomeId: 'solaria_pyramid', isWater: false, isPath: false, slope };
  }
  // The Great Solaria Sinkhole - Sandworm Arena [495, -362]
  const distSinkhole = Math.hypot(x - 495, z - -362);
  if (distSinkhole <= 45) {
    const t = distSinkhole / 45;
    const swirl = Math.sin(Math.atan2(z - -362, x - 495) * 4 + distSinkhole * 0.5);
    const r = Math.round(180 + t * 50 + swirl * 10);
    const g = Math.round(110 + t * 65 + swirl * 8);
    const b = Math.round(30 + t * 50);
    return { height: y, color: [r, g, b], biomeId: 'solaria_sinkhole', isWater: false, isPath: false, slope };
  }

  // 5. Special Plains Landmarks
  // Sanctuary Village Plaza
  if (Math.hypot(x, z - 180) <= 18) {
    return { height: y, color: [226, 218, 214], biomeId: 'eldoria_plaza', isWater: false, isPath: true, slope: 0 };
  }
  // Astraea Marble Capital
  if (Math.hypot(x - -340, z - -220) <= 32) {
    return { height: y, color: [248, 250, 252], biomeId: 'astraea_marble', isWater: false, isPath: true, slope: 0 };
  }
  // Val-Kragor Slate
  if (Math.hypot(x - 380, z - 80) <= 28) {
    return { height: y, color: [100, 116, 139], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope: 0 };
  }
  // Mage Tower Hill
  if (Math.hypot(x - 180, z - 60) <= 16) {
    return { height: y, color: [88, 128, 80], biomeId: 'thunderpeak_hill', isWater: false, isPath: false, slope };
  }
  // Beach sand fringe along natural south and west coastlines
  const southCoastZ = 190 + Math.sin(x * 0.012) * 20 + Math.cos(x * 0.035) * 8;
  const westCoastX = -460 + Math.sin(z * 0.015) * 35 + Math.cos(z * 0.04) * 15;
  const isNearCoast = (z >= southCoastZ - 8 && z <= southCoastZ + 3 && x >= westCoastX) ||
                      (x >= westCoastX - 3 && x <= westCoastX + 10 && z <= southCoastZ);
  if (isNearCoast && !sampleIsPath(x, z)) {
    return { height: y, color: [254, 215, 170], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // ==========================================================================
  // PEWARNAAN PERMUKAAN TANAH (VERTEX COLORING / TEXTURE BLEND)
  // Kuning Pasir Emas Solaria (#d4af37 / #e2b448) vs Hijau Segar Padang Rumput Eldoria (#7ba038 / #6b8e23)
  // Transisi tepi sempit selebar 5 unit (4-6 unit) di garis perbatasan
  // ==========================================================================
  const desertWeight = getDesertWeight(x, z);

  // Palet Kuning Pasir Emas Solaria:
  // Base #d4af37 = [212, 175, 55], Highlight #e2b448 = [226, 180, 72]
  const duneNoise = 0.5 + 0.5 * Math.sin(x * 0.035 + z * 0.028);
  const desertR = 212 + (226 - 212) * duneNoise;
  const desertG = 175 + (180 - 175) * duneNoise;
  const desertB = 55 + (72 - 55) * duneNoise;

  // Palet Hijau Segar Padang Rumput Eldoria:
  // Base #7ba038 = [123, 160, 56], Deep/Olive #6b8e23 = [107, 142, 35]
  const grassNoise = 0.5 + 0.5 * Math.sin(x * 0.025 - z * 0.03);
  const grassR = 123 + (107 - 123) * grassNoise;
  const grassG = 160 + (142 - 160) * grassNoise;
  const grassB = 56 + (35 - 56) * grassNoise;

  // Blend tegas dan natural sempit selebar 5 unit di garis perbatasan
  const r = Math.round(grassR * (1.0 - desertWeight) + desertR * desertWeight);
  const g = Math.round(grassG * (1.0 - desertWeight) + desertG * desertWeight);
  const b = Math.round(grassB * (1.0 - desertWeight) + desertB * desertWeight);

  const biomeId = desertWeight > 0.5 ? 'solaria_desert' : 'plains_grass';
  return { height: y, color: [r, g, b], biomeId, isWater: false, isPath: false, slope };
}

function sampleIsPath(x: number, z: number): boolean {
  if (Math.abs(x) <= 3.2 && z >= 195 && z <= 235) return true;
  if (Math.hypot(x, z - 180) <= 18) return true;
  return isPointOnRoad(x, z);
}
