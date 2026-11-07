/**
 * Unified Continent Map Sampler
 * Provides procedural elevation, biome classification, and topographic relief colors
 * for the expanded open world (X: -580..680, Z: -460..460).
 * Used by world.ts, Minimap.tsx, and WorldMapModal.tsx.
 *
 * Implements the mathematical partition matrix:
 * 1. South Ocean / Ocean Fill: X < -120 && Z > 20 (old desert), X: -120..300 && Z > 20, and default outside land.
 * 2. Shadowfen (Top-Left): X < -150 && Z < -150.
 * 3. Solaria Desert (West-Central): X < -120 && Z: -150..20.
 * 4. Dragon Caldera (North Strip): X: -150..180 && Z < -120.
 * 5. Central Plains (Massive Central): X: -120..180 && Z: -120..20.
 * 6. Highlands (Val-Kragor & Thunderpeak): X: 180..300 && Z: -150..20.
 * 7. Frostpeak (Top-Right): X > 300 && Z < -150.
 * 8. Jade Bamboo (Bottom-Right): X > 300 && Z > 20.
 */

export interface BiomeSample {
  height: number;
  color: [number, number, number]; // RGB 0..255
  biomeId: string;
  isWater: boolean;
  isPath: boolean;
  slope: number; // 0..1
}

export type BiomeZoneId =
  | 'central_plains'
  | 'south_ocean'
  | 'north_volcanic'
  | 'west_swamp'
  | 'southwest_desert'
  | 'east_frostpeak'
  | 'east_highlands'
  | 'southeast_bamboo';

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

// Smoothstep helper
function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

/**
 * 1. STRUKTUR MATRIKS BIOMA MATEMATIS (getBiomeAt(x, z))
 * Evaluasi zona proporsional, bersih, dan menyatu sesuai pembagian baru.
 */
export function getBiomeAt(x: number, z: number): BiomeZoneInfo {
  // 1. RUMPUN BAMBU GIOK (POJOK KANAN BAWAH - MENGECIL KE TIMUR)
  // X > 300 && Z > 20
  if (x > 300 && z > 20) {
    return {
      id: 'southeast_bamboo',
      name: 'Jade Bamboo Grove & Celestial Pagoda',
      nameId: 'Rumpun Bambu Giok',
      minY: 0.5,
      maxY: 2.0,
      color: [5, 150, 105], // #059669
    };
  }

  // 2. PUNCAK SALJU FROSTPEAK (POJOK KANAN ATAS - MENGECIL KE TIMUR)
  // X > 300 && Z < -150
  if (x > 300 && z < -150) {
    return {
      id: 'east_frostpeak',
      name: 'Frostpeak Glaciers & Royal Citadel',
      nameId: 'Puncak Salju Abadi Frostpeak',
      minY: 3.0,
      maxY: 8.5,
      color: [224, 242, 254], // #e0f2fe
    };
  }

  // 3. PEGUNUNGAN / HIGHLANDS (VAL-KRAGOR & THUNDERPEAK)
  // Koridor tengah timur: X > 180 && X <= 300 && Z >= -150 && Z <= 20
  if (x > 180 && x <= 300 && z >= -150 && z <= 20) {
    return {
      id: 'east_highlands',
      name: 'Val-Kragor Highlands & Thunderpeak',
      nameId: 'Dataran Tinggi Val-Kragor & Puncak Halilintar',
      minY: 2.5,
      maxY: 6.0,
      color: [100, 116, 139], // #64748b
    };
  }

  // 4. PADANG RUMPUT ELDORIA (CENTRAL PLAINS - EKSPANSI KE TIMUR)
  // Pusat daratan utama: X >= -120 && X <= 180 && Z >= -120 && Z <= 20
  if (x >= -120 && x <= 180 && z >= -120 && z <= 20) {
    return {
      id: 'central_plains',
      name: 'Eldoria Central Plains Buffer Zone',
      nameId: 'Padang Rumput Eldoria (Daratan Utama)',
      minY: 0.0,
      maxY: 2.0,
      color: [101, 163, 13], // #65a30d
    };
  }

  // 5. KAWAH VULKANIK & SARANG NAGA (EKSPANSI KE TIMUR)
  // Membentang di jalur utara: X >= -150 && X <= 180 && Z < -120
  if (x >= -150 && x <= 180 && z < -120) {
    return {
      id: 'north_volcanic',
      name: 'Dragonfang Caldera & Inferno Volcanic Zone',
      nameId: 'Kaldera Sarang Naga Purba',
      minY: 1.5,
      maxY: 6.5,
      color: [28, 25, 23], // #1c1917 / #dc2626
    };
  }

  // 6. RAWA BAYANGAN PURBA (SHADOWFEN - POJOK KIRI ATAS)
  // Hanya menempati sudut kiri atas: X < -150 && Z < -150
  if (x < -150 && z < -150) {
    return {
      id: 'west_swamp',
      name: 'Shadowfen Gloom Marsh & Ancient Ruins',
      nameId: 'Rawa Bayangan Purba',
      minY: 0.0,
      maxY: 0.6,
      color: [71, 85, 105], // #475569 / #581c87
    };
  }

  // 7. GURUN PASIR EMAS SOLARIA (BARAT TENGAH)
  // Mengisi area barat tengah: X < -120 && Z >= -150 && Z <= 20
  if (x < -120 && z >= -150 && z <= 20) {
    return {
      id: 'southwest_desert',
      name: 'Solaria Golden Desert & Palace',
      nameId: 'Gurun Pasir Emas Solaria',
      minY: 0.5,
      maxY: 3.5,
      color: [234, 179, 8], // #eab308
    };
  }

  // 8. LAUT LEPAS (OCEAN - DEFAULT FILLER & WILAYAH SELATAN)
  // - Bekas area gurun lama di barat daya (X < -120 && Z > 20): JADIKAN LAUT
  // - Area selatan tengah (X antara -120 dan 300 && Z > 20): JADIKAN LAUT
  // - Seluruh area di luar batas daratan otomatis menjadi ocean
  return {
    id: 'south_ocean',
    name: 'Azure Coast & South Ocean',
    nameId: 'Pesisir & Samudra Azure',
    minY: -10.0,
    maxY: 0.0,
    color: [2, 132, 199], // #0284c7
  };
}

/**
 * Procedural height function across the vast expanded world
 * Enforces strictly bounded elevations with smooth transitions between zones.
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  const distCenter = Math.hypot(x, z);
  const zone = getBiomeAt(x, z);

  // 1. Starting Village: Desa Eldoria Mainland Foundation (z <= 16, |x| <= 36, z >= -34)
  if (z <= 16 && Math.abs(x) <= 36 && z >= -34) {
    if (Math.abs(x) <= 28 && z >= -26 && z <= 14) return 0.25;
    const edgeX = Math.max(0, Math.abs(x) - 28) / 8;
    const edgeZ = Math.max(0, Math.max(-26 - z, z - 14)) / 8;
    const t = clamp(Math.max(edgeX, edgeZ), 0, 1);
    const meadow = Math.sin(x * 0.08) * 1.5 + Math.cos(z * 0.07) * 1.2;
    return (1 - t) * 0.25 + t * Math.max(0.2, meadow);
  }

  // 1b. Coastal Wooden Harbor Pier & Boardwalk Apron
  if (
    (Math.abs(x) <= 2.6 && z >= 18.0 && z <= 72.0) ||
    (Math.abs(x) <= 5.2 && z >= 69.5 && z <= 75.5) ||
    (Math.abs(z - 37.0) <= 2.2 && Math.abs(x) <= 15.0) ||
    (Math.abs(z - 53.0) <= 2.2 && Math.abs(x) <= 15.0)
  ) {
    return 1.85;
  }

  // 1c. Wilayah Laut Selatan & Default Ocean Filler
  if (zone.id === 'south_ocean') {
    // Shoreline beach slope transition for z near 20 (along Central Plains & Solaria)
    if (z >= 16 && z <= 20 && x >= -120 && x <= 180) {
      const t = (z - 16) / 4.0;
      return 0.25 - t * 0.25;
    }
    const coastDist = Math.max(0, z - 20);
    const waveNoise = Math.sin(x * 0.08) * 0.35;
    return clamp(-1.5 - coastDist * 0.08 + waveNoise, -10.0, -0.4);
  }

  // 2. Gurun Pasir Emas Solaria (Barat Tengah: X < -120 && Z >= -150 && Z <= 20)
  if (zone.id === 'southwest_desert') {
    // Solaria Metropolis & Palace at [-320, -30] & Village Bazaar at [-260, -30]
    const inSolariaMetropolis = x >= -340 && x <= -240 && Math.abs(z - -30) <= 30;
    if (inSolariaMetropolis) return 2.4;

    // Pyramid at [-200, -50]
    const distPyramid = Math.hypot(x - -200, z - -50);
    if (distPyramid < 25) {
      if (distPyramid < 17) return 1.4;
      const t = (distPyramid - 17) / 8;
      const dunes = Math.sin(x * 0.04 + z * 0.035) * 1.5;
      return (1 - t) * 1.4 + t * (1.6 + dunes);
    }

    // Oasis at [-240, -80]
    const distOasis = Math.hypot(x - -240, z - -80);
    if (distOasis < 40) {
      if (distOasis < 18) return -0.4 + Math.sin(x * 0.2) * 0.15;
      const tO = (distOasis - 18) / 22;
      return (1 - tO) * 0.2 + tO * 2.8;
    }

    const dunes =
      Math.sin(x * 0.035 + z * 0.028) * 1.4 +
      Math.cos(x * 0.024 - z * 0.032) * 1.1;
    return clamp(1.8 + dunes, 0.5, 3.5);
  }

  // 3. Rawa Bayangan Purba (Pojok Kiri Atas: X < -150 && Z < -150)
  if (zone.id === 'west_swamp') {
    // Ancient Titan Basin at [-160, -160] (Perbatasan Rawa/Gurun Barat Laut)
    const distTitan = Math.hypot(x - -160, z - -160);
    if (distTitan < 24) {
      if (distTitan < 5.5) return 0.35; // stepping stone platform
      if (distTitan < 16.5) {
        const tLake = (distTitan - 5.5) / 11.0;
        return 0.35 - Math.sin(tLake * Math.PI) * 0.70; // dips to -0.35
      }
      const tRim = clamp((distTitan - 16.5) / 7.5, 0, 1);
      return -0.15 + tRim * 0.75;
    }

    // Ancient Ruins of Vael at [-180, -180]
    const distRuins = Math.hypot(x - -180, z - -180);
    if (distRuins < 22) return 1.6;

    const swampWater = Math.sin(x * 0.08) * 0.18 + Math.cos(z * 0.07) * 0.15;
    return clamp(0.35 + swampWater, 0.0, 0.6);
  }

  // 4. Kawah Vulkanik & Sarang Naga (Ekspansi ke Timur: X >= -150 && X <= 180 && Z < -120)
  if (zone.id === 'north_volcanic') {
    // Dragon Caldera Arena at [0, -300] (Diameter ~45m, Radius 22.5m)
    const distDragonCaldera = Math.hypot(x - 0, z - -300);
    if (distDragonCaldera < 34) {
      if (distDragonCaldera < 18) {
        return 1.25; // scorched arena floor
      } else if (distDragonCaldera <= 25) {
        const tCliff = (distDragonCaldera - 18) / 7.0;
        return 1.25 + smoothstep(0, 1, tCliff) * 4.95; // 1.25 -> 6.20
      } else {
        const tOuter = clamp((distDragonCaldera - 25) / 9.0, 0, 1);
        return (1 - tOuter) * 6.20 + tOuter * 2.8;
      }
    }

    const volcanicNoise = Math.sin(x * 0.06) * 1.6 + Math.cos(z * 0.07) * 1.4;
    return clamp(2.8 + volcanicNoise, 1.5, 6.5);
  }

  // 5. Pegunungan / Highlands (Val-Kragor & Thunderpeak: X > 180 && X <= 300 && Z >= -150 && Z <= 20)
  if (zone.id === 'east_highlands') {
    // Benteng Val-Kragor at [220, -20]
    const distValKragor = Math.hypot(x - 220, z - -20);
    if (distValKragor < 46) {
      if (distValKragor < 34) return 3.2; // flat fortress courtyard
      const t = (distValKragor - 34) / 12;
      return (1 - t) * 3.2 + t * 2.5;
    }

    // Mage Tower Puncak Halilintar at [240, -120]
    const distMageTower = Math.hypot(x - 240, z - -120);
    if (distMageTower < 24) {
      if (distMageTower < 15) return 4.8;
      const tm = (distMageTower - 15) / 9;
      return (1 - tm) * 4.8 + tm * 3.6;
    }

    // Approach slope from Plains to Highlands
    const tSlope = clamp((x - 180) / 40, 0, 1);
    return 2.0 + smoothstep(0, 1, tSlope) * 1.8;
  }

  // 6. Puncak Salju Frostpeak & Astraea (Pojok Kanan Atas: X > 300 && Z < -150)
  if (zone.id === 'east_frostpeak') {
    // Imperial Capital Astraea at [360, -260]
    const distAstraea = Math.hypot(x - 360, z - -260);
    if (distAstraea < 35) return 6.0; // grand palace & plaza

    // Frozen Chasm at [360, -310]
    if (z <= -295 && z >= -325 && x >= 330 && x <= 390) {
      if (Math.abs(x - 360) <= 6) return 4.6; // ice bridge
      return -3.0; // deep chasm
    }

    // Kuil Es at [340, -180]
    const distAltar = Math.hypot(x - 340, z - -180);
    if (distAltar < 20) return 3.8;

    const snowHills = Math.sin(x * 0.04) * 1.5 + Math.cos(z * 0.04) * 1.2;
    return clamp(4.5 + snowHills, 3.0, 8.5);
  }

  // 7. Rumpun Bambu Giok (Pojok Kanan Bawah: X > 300 && Z > 20)
  if (zone.id === 'southeast_bamboo') {
    // Pagoda at [350, 100]
    const distPagoda = Math.hypot(x - 350, z - 100);
    if (distPagoda < 24) {
      if (distPagoda < 16) return 2.5;
      const t = (distPagoda - 16) / 8;
      return (1 - t) * 2.5 + t * 1.8;
    }

    // Celestial Pavilion at [400, 140]
    const distPavilion = Math.hypot(x - 400, z - 140);
    if (distPavilion < 25) return 3.4;

    const hills = Math.sin(x * 0.05) * 0.55 + Math.cos(z * 0.05) * 0.45;
    return clamp(1.2 + hills, 0.5, 2.0);
  }

  // 8. Padang Rumput Eldoria (Central Plains: X: -120..180, Z: -120..20)
  // Dataran rumput hijau subur masif berbukit landai (0.0 s/d 2.0)
  let h = 0.65 + Math.sin(x * 0.05) * 0.45 + Math.cos(z * 0.05) * 0.35;
  h = clamp(h, 0.0, 2.0);

  // Outer Perimeter mountain wall (Encircles the expanded world outside gameplay bounds)
  if (distCenter > 480 || z < -420 || z > 420 || x < -520 || x > 620) {
    const edgeDist = Math.max(
      Math.max(0, distCenter - 480) * 0.35,
      Math.max(0, Math.abs(z) - 420) * 0.4,
      Math.max(0, -x - 520) * 0.4,
      Math.max(0, x - 620) * 0.4
    );
    h += Math.min(26, edgeDist);
  }

  return h;
}

/**
 * Procedural Biome & Landscape Color Sampler
 * Returns realistic RGB (0..255) for the minimap and world map
 */
export function getContinentBiomeSample(x: number, z: number): BiomeSample {
  const y = getProceduralContinentHeight(x, z);
  const zone = getBiomeAt(x, z);

  // Approximate slope by sampling nearby points
  const delta = 1.8;
  const yRight = getProceduralContinentHeight(x + delta, z);
  const yDown = getProceduralContinentHeight(x, z + delta);
  const slope = clamp(Math.hypot(yRight - y, yDown - y) / delta, 0, 1);

  // 0. Coastal Naval Harbor (Seamless Beach Connection, Pier Head & Wings)
  if (Math.abs(x) <= 7.0 && z >= 14.5 && z <= 18.0) {
    return { height: y, color: [141, 110, 99], biomeId: 'harbor_boardwalk', isWater: false, isPath: true, slope: 0 };
  }
  if (
    (Math.abs(x) <= 2.6 && z >= 18.0 && z <= 58.0) ||
    (Math.abs(x) <= 7.0 && z >= 58.0 && z <= 64.0) ||
    (Math.abs(z - 34.0) <= 2.2 && Math.abs(x) <= 16.0) ||
    (Math.abs(z - 48.0) <= 2.2 && Math.abs(x) <= 14.0)
  ) {
    return { height: 1.85, color: [141, 110, 99], biomeId: 'harbor_pier', isWater: false, isPath: true, slope: 0 };
  }

  // Moored Main Ships
  if (
    (Math.abs(x - 18.5) <= 2.8 && Math.abs(z - 38) <= 7.5) ||
    (Math.abs(x - -18.5) <= 2.8 && Math.abs(z - 38) <= 7.5) ||
    (Math.abs(x) <= 1.5 && Math.abs(z - 55.5) <= 2.8)
  ) {
    return { height: 1.0, color: [84, 53, 31], biomeId: 'ship_deck', isWater: false, isPath: false, slope: 0 };
  }

  // 1. Water Bodies
  if (y < 0.0) {
    if (zone.id === 'southwest_desert' && Math.hypot(x - -240, z - -80) < 22) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    if (zone.id === 'south_ocean' || z > 20) {
      const depth = clamp(-y / 4.0, 0, 1);
      const r = Math.round(2 + (1 - depth) * 15);
      const g = Math.round(132 + (1 - depth) * 20);
      const b = Math.round(199 + (1 - depth) * 20);
      return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
    }
    return { height: y, color: [30, 58, 62], biomeId: 'swamp_water', isWater: true, isPath: false, slope };
  }

  // 2. Imperial Capital Astraea at [360, -260]
  if (Math.hypot(x - 360, z - -260) < 35) {
    const distCenter = Math.hypot(x - 360, z - -260);
    if (distCenter < 12) {
      return { height: y, color: [250, 204, 21], biomeId: 'astraea_gold_road', isWater: false, isPath: true, slope: 0 };
    }
    return { height: y, color: [248, 250, 252], biomeId: 'astraea_city', isWater: false, isPath: false, slope: 0 };
  }

  // 3. Desa Eldoria Village Cobblestones & Organized Street Grid
  if (Math.abs(x) <= 3.2 && z >= -24 && z <= 19) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }
  if (Math.hypot(x, z - -4) <= 7.5) {
    return { height: y, color: [226, 218, 214], biomeId: 'eldoria_plaza', isWater: false, isPath: true, slope: 0 };
  }
  if (Math.abs(x - -19) <= 2.2 && z >= -16 && z <= 12) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }
  if (Math.abs(x - 19) <= 2.2 && z >= -16 && z <= 12) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }
  if (Math.abs(z - -4) <= 2.2 && Math.abs(x) <= 25) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }

  // 3b. Highway to Highlands (Val-Kragor at [220, -20])
  if (Math.abs(z - -20) <= 2.8 && x >= 16 && x <= 220) {
    return { height: y, color: [175, 155, 135], biomeId: 'valkragor_road', isWater: false, isPath: true, slope: 0 };
  }

  // 3c. Highway to Solaria Desert (West)
  if (Math.abs(z - -30) <= 2.8 && x >= -260 && x <= -16) {
    return { height: y, color: [190, 165, 130], biomeId: 'solaria_road', isWater: false, isPath: true, slope: 0 };
  }

  // 4. Val-Kragor Fortress Slate [220, -20]
  if (Math.hypot(x - 220, z - -20) < 30) {
    return { height: y, color: [71, 85, 105], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope: 0 };
  }

  // 4b. Ancient Titan Sanctuary Basin Arena in Northwest: [-160, -160]
  const distTitanSample = Math.hypot(x - -160, z - -160);
  if (distTitanSample < 24) {
    if (distTitanSample < 5.5) {
      return { height: y, color: [140, 138, 134], biomeId: 'titan_platform', isWater: false, isPath: true, slope: 0 };
    } else if (distTitanSample < 16.5) {
      return { height: y, color: [38, 145, 185], biomeId: 'titan_lake', isWater: true, isPath: false, slope };
    } else {
      return { height: y, color: [100, 145, 80], biomeId: 'titan_rim', isWater: false, isPath: false, slope };
    }
  }

  // 4c. Dragon Caldera Arena at [0, -300] (North Volcano)
  const distDragonCalderaSample = Math.hypot(x - 0, z - -300);
  if (distDragonCalderaSample < 34) {
    if (distDragonCalderaSample < 18) {
      if (distDragonCalderaSample >= 14 && Math.sin(x * 0.8 + z * 0.8) > 0.3) {
        return { height: y, color: [220, 38, 38], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
      }
      return { height: y, color: [28, 25, 23], biomeId: 'dragon_arena', isWater: false, isPath: false, slope };
    } else if (distDragonCalderaSample <= 26) {
      return { height: y, color: [20, 18, 18], biomeId: 'dragon_obsidian_cliff', isWater: false, isPath: false, slope };
    }
  }

  // 5. Regional Biome Shading based on getBiomeAt(x, z)
  if (zone.id === 'east_highlands') {
    const distMageTower = Math.hypot(x - 240, z - -120);
    if (distMageTower < 20) {
      return { height: y, color: [48, 42, 85], biomeId: 'thunderpeak', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [100, 116, 139], biomeId: 'valkragor_highlands', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'east_frostpeak') {
    if (z <= -295 && z >= -325 && x >= 330 && x <= 390) {
      if (Math.abs(x - 360) <= 6) {
        return { height: y, color: [147, 197, 253], biomeId: 'ice_bridge', isWater: false, isPath: true, slope };
      }
      return { height: y, color: [56, 189, 248], biomeId: 'frozen_chasm', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [224, 242, 254], biomeId: 'frost_snow', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'southwest_desert') {
    const distPyramid = Math.hypot(x - -200, z - -50);
    if (distPyramid < 22) {
      return { height: y, color: [220, 160, 40], biomeId: 'solaria_pyramid', isWater: false, isPath: false, slope };
    }
    const duneWave = Math.sin(x * 0.035 + z * 0.028);
    const r = Math.round(234 + duneWave * 12);
    const g = Math.round(179 + duneWave * 15);
    const b = Math.round(8 + duneWave * 8);
    return { height: y, color: [r, g, b], biomeId: 'solaria_desert', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'north_volcanic') {
    if (y < 0.5) {
      return { height: y, color: [220, 38, 38], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [28, 25, 23], biomeId: 'dragon_basalt', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'west_swamp') {
    return { height: y, color: [71, 85, 105], biomeId: 'shadowfen_marsh', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'southeast_bamboo') {
    const distPagoda = Math.hypot(x - 350, z - 100);
    if (distPagoda < 20) {
      return { height: y, color: [20, 160, 110], biomeId: 'jade_pagoda', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [5, 150, 105], biomeId: 'jade_bamboo', isWater: false, isPath: false, slope };
  }

  // Beach sand along southern horizontal coastal edge (Z: 16..20 along Central Plains)
  if (z >= 16 && z <= 22 && x >= -120 && x <= 180 && y < 0.8) {
    return { height: y, color: [254, 215, 170], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // Central Plains (Padang Rumput Hijau Subur Masif: #65a30d)
  const grassShade = (Math.sin(x * 0.15) + Math.cos(z * 0.15)) * 8;
  const gr = Math.round(clamp(101 + grassShade, 85, 120));
  const gg = Math.round(clamp(163 + grassShade, 145, 185));
  const gb = Math.round(clamp(13 + grassShade * 0.3, 8, 24));
  return { height: y, color: [gr, gg, gb], biomeId: 'meadow', isWater: false, isPath: false, slope };
}
