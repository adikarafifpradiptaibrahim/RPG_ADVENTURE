/**
 * Unified Continent Map Sampler - Simplified 3-Biome + South Ocean Architecture
 * Scale: X: -580..680, Z: -460..460
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

  // C. GURUN PASIR EMAS SOLARIA ('desert' - EKSPANSI UTARA & TIMUR BEBAS TANPA PEMBATAS KANAN)
  const desertCurveZ = -20 
    + Math.sin((x + 100) * 0.008) * 110 
    + Math.cos(x * 0.02) * 25;

  const desertCurveX = -60 
    + Math.sin((z + 100) * 0.012) * 50;

  // Jika posisi berada di dalam lekukan gurun (timur laut):
  if (x >= desertCurveX && z <= desertCurveZ) {
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
    // 3c. Pharaoh Pyramid [20, -220]
    if (Math.hypot(x - 20, z - -220) <= 28) return 1.50;
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

    // Rolling golden dunes
    const duneWave = Math.sin(x * 0.035 + z * 0.028) * 1.1 + Math.cos(x * 0.02 - z * 0.03) * 0.5;
    return clamp(1.4 + duneWave, 0.5, 3.5);
  }

  // 4. ZONA PLAINS: Padang Rumput Eldoria (Daratan Utama)
  // 4a. Sanctuary Village [0, 180]
  if (Math.hypot(x - 0, z - 180) <= 36) return 0.25;
  // 4b. Sanctuary Coastal Harbor [0, 205..220]
  if (Math.abs(x) <= 12 && z >= 195 && z <= 220) return 0.35;
  // 4c. Fortress Val-Kragor [380, 80]
  if (Math.hypot(x - 380, z - 80) <= 38) return 2.50;
  // 4d. Imperial Capital Astraea [-340, -220]
  if (Math.hypot(x - -340, z - -220) <= 46) return 2.00;
  // 4e. Ancient Titan Basin [-196, -254] (Perluasan Skala: Danau Radius 40 unit, Platform Diameter 16 unit)
  const distTitan = Math.hypot(x - -196, z - -254);
  if (distTitan <= 8.0) return 0.55; // Granit platform (diameter 16 unit)
  if (distTitan <= 40.0) return 0.05; // Shallow lake basin (diameter 80 unit)
  if (distTitan <= 44.0) return 0.8; // Rim megalit bibir danau
  // 4f. Mage Tower Hill [180, 60]
  const distMage = Math.hypot(x - 180, z - 60);
  if (distMage <= 18) return 4.50;
  if (distMage <= 32) {
    const t = (distMage - 18) / 14;
    return 4.50 - t * 3.5;
  }
  // 4g. Suspension Bridge Gorge [135..155, 47]
  if (x >= 135 && x <= 155 && Math.abs(z - 47) <= 12) {
    const t = 1 - Math.abs(x - 145) / 10;
    return Math.max(-1.5, 0.5 - t * 2.2);
  }

  // 4h. Absolute Flat Zone: Area Desa & Pemukiman (Pertahankan Datar 0 agar bangunan tidak amblas/melayang)
  const distToVillage = Math.hypot(x - 10, z - 110);
  if (distToVillage < 50) {
    return 0;
  }

  // 4i. Flattened road paths di luar desa (jalan setapak batu tetap rata agar tidak ada objek melayang)
  if (isPointOnRoad(x, z)) {
    return 0.35;
  }

  // 3. Blending halus di batas pinggiran desa
  const villageBlend = Math.min(1, Math.max(0, (distToVillage - 50) / 25));

  // 4. Perlin / Multi-frequency Sinusoidal Noise (Kontur Lembut & Landai, Tidak Terlalu Tinggi)
  const baseNoise =
    Math.sin(x * 0.015 + z * 0.010) * 1.1 +
    Math.cos(x * 0.008 - z * 0.014) * 0.9 +
    Math.sin((x + z) * 0.025) * 0.5;

  // Ketinggian bukit landai berkisar antara 0 hingga 2.2 unit (puncak bukit 1.2 s.d 2.2)
  const perlinElevation = clamp(Math.max(0.0, baseNoise * villageBlend * 1.6), 0.0, 2.2);

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

  // 2. Air Samudra / Laut Lepas
  if (y < 0.0) {
    if (zone.id === 'desert' && Math.hypot(x - 150, z - -360) < 18) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    if (zone.id === 'plains' && Math.hypot(x - -196, z - -254) < 40) {
      return { height: y, color: [38, 145, 185], biomeId: 'titan_lake', isWater: true, isPath: false, slope };
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

  // 4. Desert Zone (Solaria)
  if (zone.id === 'desert') {
    // Road Network in Desert (Packed Caravan Sand Trail #d9be8b)
    if (isPointOnRoad(x, z)) {
      return { height: y, color: [217, 190, 139], biomeId: 'solaria_road', isWater: false, isPath: true, slope: 0 };
    }
    // Paved Avenue between Bazaar [238, -280] & Palace [330, -280]
    if (x >= 238 && x <= 330 && Math.abs(z - -280) <= 3.5) {
      return { height: y, color: [217, 190, 139], biomeId: 'solaria_road', isWater: false, isPath: true, slope: 0 };
    }
    // Pyramid
    if (Math.hypot(x - 20, z - -220) <= 24) {
      return { height: y, color: [220, 160, 40], biomeId: 'solaria_pyramid', isWater: false, isPath: false, slope };
    }
    // The Great Solaria Sinkhole - Sandworm Arena [495, -362]
    const distSinkhole = Math.hypot(x - 495, z - -362);
    if (distSinkhole <= 45) {
      const t = distSinkhole / 45;
      // Concentric swirling sand tones from amber rim to deep golden shadow pit
      const swirl = Math.sin(Math.atan2(z - -362, x - 495) * 4 + distSinkhole * 0.5);
      const r = Math.round(180 + t * 50 + swirl * 10);
      const g = Math.round(110 + t * 65 + swirl * 8);
      const b = Math.round(30 + t * 50);
      return { height: y, color: [r, g, b], biomeId: 'solaria_sinkhole', isWater: false, isPath: false, slope };
    }
    // Rolling desert
    const duneWave = Math.sin(x * 0.035 + z * 0.028);
    const r = Math.round(234 + duneWave * 12);
    const g = Math.round(179 + duneWave * 15);
    const b = Math.round(8 + duneWave * 8);
    return { height: y, color: [r, g, b], biomeId: 'solaria_desert', isWater: false, isPath: false, slope };
  }

  // 5. Plains Zone (Padang Rumput Eldoria)
  // Road Network in Plains (Medieval Cobblestone Dirt Trail #8c7a65)
  if (isPointOnRoad(x, z)) {
    return { height: y, color: [140, 122, 101], biomeId: 'eldoria_road', isWater: false, isPath: true, slope: 0 };
  }
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
  // Titan Platform
  if (Math.hypot(x - -196, z - -254) <= 8.0) {
    return { height: y, color: [140, 138, 134], biomeId: 'titan_platform', isWater: false, isPath: true, slope: 0 };
  }
  // Mage Tower Hill
  if (Math.hypot(x - 180, z - 60) <= 16) {
    return { height: y, color: [88, 128, 80], biomeId: 'thunderpeak_hill', isWater: false, isPath: false, slope };
  }
  // Pine Forest
  if (x >= -80 && x <= -40 && z >= 80 && z <= 140) {
    return { height: y, color: [34, 105, 45], biomeId: 'forest_pines', isWater: false, isPath: false, slope };
  }

  // Beach sand fringe along natural south and west coastlines
  const southCoastZ = 190 + Math.sin(x * 0.012) * 20 + Math.cos(x * 0.035) * 8;
  const westCoastX = -460 + Math.sin(z * 0.015) * 35 + Math.cos(z * 0.04) * 15;
  const isNearCoast = (z >= southCoastZ - 8 && z <= southCoastZ + 3 && x >= westCoastX) ||
                      (x >= westCoastX - 3 && x <= westCoastX + 10 && z <= southCoastZ);
  if (isNearCoast && !sampleIsPath(x, z)) {
    return { height: y, color: [254, 215, 170], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // Default green grass
  return { height: y, color: [101, 163, 13], biomeId: 'plains_grass', isWater: false, isPath: false, slope };
}

function sampleIsPath(x: number, z: number): boolean {
  if (Math.abs(x) <= 3.2 && z >= 195 && z <= 235) return true;
  if (Math.hypot(x, z - 180) <= 18) return true;
  return isPointOnRoad(x, z);
}
