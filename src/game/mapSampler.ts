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
  // 1. ZONA SELATAN SEBERANG LAUT — KAWAH VULKANIK & SARANG NAGA ('volcano')
  // Berada di seberang laut selatan jauh pada rentang z >= 300 dan x >= -150 && x <= 250
  if (z >= 300 && x >= -150 && x <= 250) {
    return {
      id: 'volcano',
      name: 'Dragonfang Caldera & Volcano Island',
      nameId: 'Kawah Vulkanik & Sarang Naga Purba',
      minY: 2.0,
      maxY: 7.0,
      color: [28, 25, 23], // #1c1917 / #dc2626
    };
  }

  // 2. ZONA SELATAN — SAMUDRA & LAUT LEPAS AZURE ('ocean')
  // Batas: z > 220 (di luar pulau vulkanik di atas) atau di luar batas terluar benua
  if (z > 220 || x < -550 || x > 650 || z < -450) {
    return {
      id: 'ocean',
      name: 'Azure Coast & South Ocean',
      nameId: 'Samudra & Laut Lepas Azure',
      minY: -10.0,
      maxY: 0.0,
      color: [2, 132, 199], // #0284c7
    };
  }

  // 3. ZONA UTARA & TIMUR — GURUN PASIR EMAS SOLARIA ('desert')
  // Garis batas barat gurun: x >= -115. Wilayah utara-timur: x >= -115 s/d 550 dan z >= -420 s/d -60.
  if (x >= -115 && x <= 550 && z >= -420 && z <= -60) {
    return {
      id: 'desert',
      name: 'Solaria Golden Desert',
      nameId: 'Gurun Pasir Emas Solaria',
      minY: 0.5,
      maxY: 3.5,
      color: [234, 179, 8], // #eab308
    };
  }

  // 4. ZONA PUSAT, BARAT & SELATAN DARATAN — PADANG RUMPUT ELDORIA ('plains')
  // - Seluruh area barat: x < -115 (termasuk Astraea di [-340, -220] dan Titan di [-260, -20])
  // - Seluruh koridor tengah dan pesisir pantai: z > -60 s/d 220 (termasuk Desa [0, 180], Val-Kragor [380, 80], Mage Tower [180, 60])
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

  // 1. ZONA VOLCANO: Pulau Kawah Vulkanik Seberang Laut Selatan
  if (zone.id === 'volcano') {
    const distCenter = Math.hypot(x - 50, z - 360);
    // Landing ramp at north entrance [50, 310]
    if (Math.hypot(x - 50, z - 310) < 16) {
      return 2.0;
    }
    // Caldera crater floor
    if (distCenter <= 22) {
      return 2.50;
    }
    // Crater rim ridge
    if (distCenter <= 34) {
      const t = (distCenter - 22) / 12;
      return 2.50 + Math.sin(t * Math.PI) * 4.2;
    }
    // Island outer slope down to sea
    if (distCenter <= 48) {
      const t = (distCenter - 34) / 14;
      return Math.max(0.2, 3.5 * (1 - t));
    }
    return 1.2;
  }

  // 2. ZONA OCEAN: Samudra Selatan (Z > 220)
  if (zone.id === 'ocean') {
    // Coastal beach slope transition along Z: 220..230
    if (z >= 220 && z <= 235 && x >= -500 && x <= 500) {
      const t = (z - 220) / 15;
      return 0.2 - t * 2.8;
    }
    return -3.5;
  }

  // 3. ZONA DESERT: Gurun Pasir Emas Solaria (X >= -115 && Z: -420..-60)
  if (zone.id === 'desert') {
    // 3a. Golden Bazaar Village [280, -280]
    if (Math.hypot(x - 280, z - -280) <= 32) return 1.80;
    // 3b. Sultan Taj Mahal Palace [340, -280]
    if (Math.hypot(x - 340, z - -280) <= 32) return 2.00;
    // Paved avenue connecting Bazaar & Palace
    if (x >= 280 && x <= 340 && Math.abs(z - -280) <= 5.5) return 1.90;
    // 3c. Pharaoh Pyramid [20, -220]
    if (Math.hypot(x - 20, z - -220) <= 28) return 1.50;
    // 3d. Hidden Oasis Lake [150, -360]
    const distOasis = Math.hypot(x - 150, z - -360);
    if (distOasis < 16) return -0.4; // Water depression
    if (distOasis < 26) return 0.6;

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
  // 4e. Ancient Titan Basin [-260, -20]
  const distTitan = Math.hypot(x - -260, z - -20);
  if (distTitan <= 6.0) return 0.35; // Granit platform
  if (distTitan <= 18.0) return -0.05; // Shallow lake basin
  if (distTitan <= 24.0) return 0.8; // Rim
  // 4f. Mage Tower Hill [180, 60]
  const distMage = Math.hypot(x - 180, z - 60);
  if (distMage <= 18) return 4.50;
  if (distMage <= 32) {
    const t = (distMage - 18) / 14;
    return 4.50 - t * 3.5;
  }
  // 4g. Suspension Bridge Gorge [120..150, 70]
  if (x >= 120 && x <= 150 && Math.abs(z - 70) <= 14) {
    const t = 1 - Math.abs(x - 135) / 15;
    return Math.max(-1.5, 0.5 - t * 2.2);
  }

  // Rolling lush grasslands
  const hillWave = Math.sin(x * 0.032) * Math.cos(z * 0.032) * 0.65;
  return clamp(0.6 + hillWave, 0.1, 2.0);
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
    if (zone.id === 'plains' && Math.hypot(x - -260, z - -20) < 18) {
      return { height: y, color: [38, 145, 185], biomeId: 'titan_lake', isWater: true, isPath: false, slope };
    }
    const depth = clamp(-y / 4.0, 0, 1);
    const r = Math.round(2 + (1 - depth) * 15);
    const g = Math.round(132 + (1 - depth) * 20);
    const b = Math.round(199 + (1 - depth) * 20);
    return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
  }

  // 3. Volcanic Zone (Dragonfang Caldera)
  if (zone.id === 'volcano') {
    const distCaldera = Math.hypot(x - 50, z - 360);
    if (distCaldera <= 14) {
      return { height: y, color: [220, 38, 38], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
    }
    if (distCaldera <= 22) {
      return { height: y, color: [28, 25, 23], biomeId: 'dragon_arena', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [40, 36, 34], biomeId: 'dragon_basalt', isWater: false, isPath: false, slope };
  }

  // 4. Desert Zone (Solaria)
  if (zone.id === 'desert') {
    // Paved Avenue between Bazaar [280, -280] & Palace [340, -280]
    if (x >= 270 && x <= 350 && Math.abs(z - -280) <= 6) {
      return { height: y, color: [210, 180, 140], biomeId: 'solaria_road', isWater: false, isPath: true, slope: 0 };
    }
    // Pyramid
    if (Math.hypot(x - 20, z - -220) <= 24) {
      return { height: y, color: [220, 160, 40], biomeId: 'solaria_pyramid', isWater: false, isPath: false, slope };
    }
    // Rolling desert
    const duneWave = Math.sin(x * 0.035 + z * 0.028);
    const r = Math.round(234 + duneWave * 12);
    const g = Math.round(179 + duneWave * 15);
    const b = Math.round(8 + duneWave * 8);
    return { height: y, color: [r, g, b], biomeId: 'solaria_desert', isWater: false, isPath: false, slope };
  }

  // 5. Plains Zone (Padang Rumput Eldoria)
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
  if (Math.hypot(x - -260, z - -20) <= 6.5) {
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

  // Beach sand fringe along Z: 215..222
  if (z >= 215 && z <= 222 && x >= -500 && x <= 500 && !sampleIsPath(x, z)) {
    return { height: y, color: [254, 215, 170], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // Default green grass
  return { height: y, color: [101, 163, 13], biomeId: 'plains_grass', isWater: false, isPath: false, slope };
}

function sampleIsPath(x: number, z: number): boolean {
  if (Math.abs(x) <= 3.2 && z >= 195 && z <= 235) return true;
  if (Math.hypot(x, z - 180) <= 18) return true;
  return false;
}
