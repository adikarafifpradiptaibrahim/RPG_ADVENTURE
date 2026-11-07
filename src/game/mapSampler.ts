/**
 * Unified Continent Map Sampler
 * Provides procedural elevation, biome classification, and topographic relief colors
 * for the expanded open world (X: -580..680, Z: -460..460).
 * Used by world.ts, Minimap.tsx, and WorldMapModal.tsx.
 *
 * Implements the mathematical partition matrix from:
 * "WORLD MAP DEVELOPER BLUEPRINT - Chronicles of Eldoria REV. 2.4"
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
 * Evaluasi koordinat deterministik berbasis zona sesuai Blueprint REV 2.4
 */
export function getBiomeAt(x: number, z: number): BiomeZoneInfo {
  // 1. ZONA SELATAN — PESISIR & SAMUDRA AZURE (COAST & OCEAN)
  // Batas Area: Z > 20 di tengah, menyempit ke pesisir diagonal X: -180 s/d +380
  const isSouthOcean =
    (Math.abs(x) <= 45 && z > 20) ||
    (x < -45 && x >= -220 && z > 20 + (-x - 45) * 1.95) ||
    (x > 45 && x <= 420 && z > 20 + (x - 45) * 1.15);

  if (isSouthOcean) {
    return {
      id: 'south_ocean',
      name: 'Azure Coast & South Ocean',
      nameId: 'Pesisir & Samudra Azure',
      minY: -10.0,
      maxY: 0.0,
      color: [24, 110, 190],
    };
  }

  // 2. ZONA UTARA JAUH — KALDERA SARANG NAGA PURBA (VOLCANIC / DRAGON CRATER)
  // Batas Area: Z < -200 (fokus utama X: -210 s/d 110, Kaldera Pusat di [-29, -337])
  if (z < -200 && x <= 110 && x >= -220) {
    return {
      id: 'north_volcanic',
      name: 'Dragonfang Caldera & Inferno Volcanic Zone',
      nameId: 'Kaldera Sarang Naga Purba',
      minY: 1.5,
      maxY: 6.5,
      color: [42, 28, 30],
    };
  }
  if (Math.hypot(x - -29, z - -337) < 65) {
    return {
      id: 'north_volcanic',
      name: 'Dragonfang Caldera & Inferno Volcanic Zone',
      nameId: 'Kaldera Sarang Naga Purba',
      minY: 1.5,
      maxY: 6.5,
      color: [42, 28, 30],
    };
  }

  // 3. ZONA BARAT — RAWA BAYANGAN PURBA (SWAMP / SHADOWFEN)
  // Batas Area: X < -120, Z: -200 s/d 120, serta kantong Cekungan Titan Kuno di [-95, -75]
  const distTitan = Math.hypot(x - -95, z - -75);
  if (distTitan < 28 || (x < -120 && z >= -200 && z <= 120)) {
    return {
      id: 'west_swamp',
      name: 'Shadowfen Gloom Marsh & Ancient Titan Basin',
      nameId: 'Rawa Bayangan Purba & Cekungan Titan',
      minY: 0.0,
      maxY: 0.6,
      color: [46, 37, 64],
    };
  }

  // 4. ZONA BARAT DAYA — GURUN PASIR EMAS SOLARIA (SOUTHWEST - DESERT ZONE)
  // Batas Area: X < -120, Z > 120 (melebar hingga Z: 460)
  if (x < -120 && z > 120) {
    return {
      id: 'southwest_desert',
      name: 'Solaria Golden Desert & Palace',
      nameId: 'Gurun Pasir Emas Solaria',
      minY: 0.5,
      maxY: 3.5,
      color: [234, 179, 35],
    };
  }

  // 5. ZONA TIMUR & TIMUR LAUT — FROSTPEAK & THUNDERPEAK (EAST & NORTHEAST - SNOW & HIGHLAND ZONE)
  // Batas Area: X > 110, Z: -460 s/d 20
  if (x > 110 && z <= 20) {
    return {
      id: 'east_frostpeak',
      name: 'Frostpeak Glaciers, Thunderpeak & Royal Citadel',
      nameId: 'Frostpeak, Puncak Halilintar & Benteng Val-Kragor',
      minY: 3.0,
      maxY: 8.5,
      color: [240, 246, 252],
    };
  }

  // 6. ZONA TENGGARA — RUMPUN BAMBU GIOK (SOUTHEAST - BAMBOO ZONE)
  // Batas Area: X > 120, Z > 20 (melebar hingga Z: 460)
  if (x > 120 && z > 20) {
    return {
      id: 'southeast_bamboo',
      name: 'Jade Bamboo Grove & Celestial Pagoda',
      nameId: 'Rumpun Bambu Giok',
      minY: 0.5,
      maxY: 2.0,
      color: [16, 185, 129],
    };
  }

  // 7. ZONA PUSAT — PADANG RUMPUT ELDORIA (CENTRAL PLAINS BUFFER ZONE)
  // Batas Area: X: -120 s/d 110, Z: -200 s/d 20
  return {
    id: 'central_plains',
    name: 'Eldoria Central Plains Buffer Zone',
    nameId: 'Padang Rumput Eldoria (Zona Penyangga Tengah)',
    minY: 0.0,
    maxY: 2.0,
    color: [115, 185, 75],
  };
}

/**
 * Procedural height function across the vast expanded world
 * Enforces strictly bounded elevations with smooth transitions between zones.
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  const distCenter = Math.hypot(x, z);

  // 1. Starting Village: Desa Eldoria Mainland Foundation (z <= 16, |x| <= 36)
  // Firm, level, elevated ground safely situated above ocean water
  if (z <= 16 && Math.abs(x) <= 36 && z >= -34) {
    if (Math.abs(x) <= 28 && z >= -26 && z <= 14) return 0.25;
    const edgeX = Math.max(0, Math.abs(x) - 28) / 8;
    const edgeZ = Math.max(0, Math.max(-26 - z, z - 14)) / 8;
    const t = clamp(Math.max(edgeX, edgeZ), 0, 1);
    const meadow = Math.sin(x * 0.08) * 1.5 + Math.cos(z * 0.07) * 1.2;
    return (1 - t) * 0.25 + t * Math.max(0.2, meadow);
  }

  // 1b. Sanctuary Coastal Beach Shoreline & Deep Harbor Water Basin
  // Beach slopes naturally from dry sand (z = 16, y = 0.25) down through the waterline (z = 20, y = 0.0)
  // and into deep ocean waters (z > 24, y = -1.5..-4.2)
  if (z > 16 && Math.abs(x) <= 45) {
    if (z <= 20) {
      const t = (z - 16) / 4;
      return 0.25 - t * 0.23;
    } else if (z <= 26) {
      const t = (z - 20) / 6;
      return 0.02 - t * 1.82;
    } else {
      const depthDist = Math.min(30, z - 26);
      const seaWave = Math.sin(x * 0.08) * 0.3;
      return -1.8 - depthDist * 0.08 + seaWave;
    }
  }

  // 1c. Ancient Sunken Ruins of Vael Terrace (x: -140..-95, z: 15..60)
  if (x <= -95 && x >= -140 && z >= 15 && z <= 60) {
    const distRuins = Math.hypot(x - -118, z - 36);
    if (distRuins < 22) return 1.6;
    const t = clamp((distRuins - 22) / 10, 0, 1);
    return (1 - t) * 1.6 + t * (0.8 + Math.sin(x * 0.08) * 0.5);
  }

  // 2. Second Village: Desa Benteng Val-Kragor Relocated East Plateau (x: 155..225, z: -48..15)
  // Spacious flat fortress interior centered at (188, -16) well clear of suspension bridge
  const distValKragor = Math.hypot(x - 188, z - -16);
  if (distValKragor < 46) {
    if (distValKragor < 34) return 3.2; // Vast flat fortress courtyard
    const t = (distValKragor - 34) / 12;
    const baseMeadow = 1.8 + Math.sin(x * 0.08) * 0.8;
    return (1 - t) * 3.2 + t * baseMeadow;
  }

  // 2b. West Bridgehead Riverbank Plateau & Smooth Flat Approach Path
  // Wide riverbank plateau (x: 40..63, z: -34..2) completely removes any pointy knife-edge or sharp ridge!
  if (x >= 40 && x <= 63 && z >= -34 && z <= 2) {
    const roadDistZ = Math.abs(z - -16);
    // Smooth, gentle ascent from village meadow y = 0.4 up to y = 2.0 at x = 55, then 100% FLAT landing to x = 63
    const tX = clamp((x - 40) / 15, 0, 1);
    const roadElev = 0.4 + smoothstep(0, 1, tX) * 1.6; // Exactly 2.00 at x >= 55..63
    const bankElev = 0.6 + smoothstep(0, 1, clamp((x - 42) / 16, 0, 1)) * 1.4;

    if (roadDistZ <= 6.0) {
      return roadElev; // 12-meter wide flat path
    }
    const lateralT = clamp((roadDistZ - 6.0) / 10.0, 0, 1);
    const sLat = smoothstep(0, 1, lateralT);
    return (1 - sLat) * roadElev + sLat * bankElev;
  }

  // 2c. East Bridgehead Fortress Approach Highway Slope
  // Flat landing at x: 87..92 at y = 2.00, then smoothly ascends to fortress plateau y = 3.20 at x = 162
  if (x >= 87 && x <= 164 && z >= -34 && z <= 2) {
    const roadDistZ = Math.abs(z - -16);
    let roadElev = 2.0;
    if (x > 92) {
      const tX = clamp((x - 92) / 70, 0, 1);
      roadElev = 2.0 + smoothstep(0, 1, tX) * 1.2; // 2.0 -> 3.2
    }
    if (roadDistZ <= 6.0) {
      return roadElev; // 12-meter wide flat path
    }
    const lateralT = clamp((roadDistZ - 6.0) / 10.0, 0, 1);
    const sLat = smoothstep(0, 1, lateralT);
    return (1 - sLat) * roadElev + sLat * 2.2;
  }

  // 3. Misty Chasm & Wooden Suspension Bridge (x: 63..87, z: -30..0)
  if (x >= 63 && x <= 87 && z >= -34 && z <= 2) {
    const chasmCenter = 75;
    const chasmDepth = Math.max(0, 1 - Math.abs(x - chasmCenter) / 12);
    return 1.2 - chasmDepth * 5.2;
  }

  // 4. Frostpeak Mountain Biome, Astraea & Mage Tower Highlands (North-East: x >= 110 && z <= 20)
  if (x >= 110 && z <= 20) {
    // 4.0 Mage Tower Mountain Highlands at [160, -150] (Relocated to North-East Mountain Range)
    const distMageTower = Math.hypot(x - 160, z - -150);
    if (distMageTower < 24) {
      if (distMageTower < 15) return 4.8;
      const tm = (distMageTower - 15) / 9;
      return (1 - tm) * 4.8 + tm * 3.8;
    }

    // 4.1 Frozen Chasm (Jurang Es Terjal di Utara Astraea: z: -300..-340, x: 120..245)
    if (z <= -300 && z >= -340 && x >= 120 && x <= 245) {
      // Natural ice bridge crossing the chasm at x: 174..186
      if (Math.abs(x - 180) <= 6) {
        return 4.6 + Math.sin(z * 0.1) * 0.3;
      }
      const chasmCenterZ = -320;
      const cDepth = Math.max(0, 1 - Math.abs(z - chasmCenterZ) / 20);
      return 2.5 - cDepth * 6.5; // Deep glacial crevasse dropping to y = -4.0
    }

    // 4.2 Relocated Grand Imperial Kingdom of Astraea (Pusat Utara Frostpeak: Center [180, -260])
    const astraeaMinX = 148;
    const astraeaMaxX = 218;
    const astraeaMinZ = -288;
    const astraeaMaxZ = -232;

    const dX = Math.max(0, astraeaMinX - x, x - astraeaMaxX);
    const dZ = Math.max(0, astraeaMinZ - z, z - astraeaMaxZ);
    const distToCity = Math.hypot(dX, dZ);

    // City Core Plateau: Flat y = 6.0 for Astraea walls, palace, and plaza
    if (distToCity === 0) return 6.0;

    // West Gate Royal Highway descending westward towards x = 95
    if (x >= 95 && x < astraeaMinX && Math.abs(z - -260) <= 5.0) {
      const roadT = (x - 95) / (astraeaMinX - 95);
      return 3.5 + roadT * 2.5;
    }

    // Western slope descent towards lower mainland
    const tWest = clamp((x - 110) / 38, 0, 1);
    const sWest = smoothstep(0, 1, tWest);
    const westBaseElev = 1.8 + sWest * 4.2;

    // Southern slope descent towards Val-Kragor
    const tSouth = clamp((-z - 40) / 192, 0, 1);
    const sSouth = smoothstep(0, 1, tSouth);
    const southBaseElev = 3.2 + sSouth * 2.8;

    let baseRegionalElev = 6.0;
    if (x < astraeaMinX && z > astraeaMaxZ) {
      const weightX = (astraeaMinX - x) / (astraeaMinX - 110);
      const weightZ = (z - astraeaMaxZ) / (-40 - astraeaMaxZ);
      baseRegionalElev = (weightX * westBaseElev + weightZ * southBaseElev) / (weightX + weightZ + 0.001);
    } else if (x < astraeaMinX) {
      baseRegionalElev = westBaseElev;
    } else if (z > astraeaMaxZ) {
      baseRegionalElev = southBaseElev;
    }

    // Soft rolling snow mounds with natural gentle slopes
    const bluntHills =
      Math.sin(x * 0.045) * 0.55 +
      Math.cos(z * 0.042) * 0.45 +
      Math.sin(x * 0.022 + z * 0.028) * 0.35;

    const hillInfluence = smoothstep(4, 25, distToCity);

    // Far-North Ancient Ice Crystal Mountain Range & Glaciers (z < -340 or x > 215)
    let outerGlacier = 0;
    if (z < -340 || x > 215) {
      const distOuter = Math.hypot(Math.max(0, x - 215), Math.max(0, -340 - z));
      const sOuter = smoothstep(0, 20, distOuter);
      outerGlacier = sOuter * Math.min(20, distOuter * 0.06 + Math.sin(x * 0.05 + z * 0.04) * 2.8);
    }

    const outerElevation = baseRegionalElev + bluntHills * hillInfluence + outerGlacier;

    if (distToCity < 14) {
      const sCity = smoothstep(0, 14, distToCity);
      return (1 - sCity) * 6.0 + sCity * outerElevation;
    }
    return clamp(outerElevation, 3.0, 8.5);
  }

  // 5. Solaria Golden Dunes, Village, Palace & Sunken Pyramid (South-West: x < -120 && z > 120)
  if (x < -120 && z > 120) {
    // 5.1 Solaria Desert Village Bazaar & Taj Mahal Palace Plateau
    const inSolariaMetropolis = x >= -445 && x <= -250 && Math.abs(z - 350) <= 42;
    if (inSolariaMetropolis) return 2.4;

    const distPalace = Math.hypot(x - -415, z - 350);
    if (distPalace < 35) return 2.4;

    const distVillage = Math.hypot(x - -305, z - 350);
    if (distVillage < 45) {
      if (distVillage < 36) return 2.4;
      const tv = (distVillage - 36) / 9;
      const dunes = Math.sin(x * 0.035 + z * 0.028) * 3.4 + Math.cos(x * 0.024 - z * 0.032) * 2.6;
      return (1 - tv) * 2.4 + tv * Math.max(1.5, 2.2 + dunes);
    }

    // 5.2 Secret Palm Oasis at [-340, 260]
    const distOasis = Math.hypot(x - -340, z - 260);
    if (distOasis < 45) {
      if (distOasis < 18) {
        return -0.4 + Math.sin(x * 0.2) * 0.15;
      }
      const tO = (distOasis - 18) / 27;
      return (1 - tO) * 0.2 + tO * 3.8;
    }

    // 5.3 Sunken Pharaoh Pyramid at [-180, 180] (Relocated to Solaria South-West buffer boundary)
    const distPyramid = Math.hypot(x - -180, z - 180);
    if (distPyramid < 25) {
      if (distPyramid < 17) return 1.4;
      const t = (distPyramid - 17) / 8;
      const dunes = Math.sin(x * 0.04 + z * 0.035) * 2.2 + Math.cos(x * 0.03 - z * 0.04) * 1.4;
      return (1 - t) * 1.4 + t * Math.max(1.4, 1.4 + dunes);
    }

    // 5.4 Tiered undulating rolling sand dunes (0.5..3.5)
    const dunes =
      Math.sin(x * 0.035 + z * 0.028) * 1.4 +
      Math.cos(x * 0.024 - z * 0.032) * 1.1 +
      Math.sin((x + z) * 0.018) * 0.7;
    return clamp(1.8 + dunes, 0.5, 3.5);
  }

  // 6. Dragonfang Caldera & Inferno Archipelago (Far North: z < -200 && x <= 110 && x >= -220)
  if ((z < -200 && x <= 110 && x >= -220) || Math.hypot(x - -29, z - -337) < 65) {
    // 6.1 Dragon Caldera Arena at [-29, -337] (Diameter ~45, Radius 22.5)
    const distDragonCaldera = Math.hypot(x - -29, z - -337);
    if (distDragonCaldera < 34) {
      if (distDragonCaldera < 18) {
        return 1.25; // Flat scorched arena floor
      } else if (distDragonCaldera <= 25) {
        // Steep black obsidian crater cliff edge rising up to y = 6.2
        const tCliff = (distDragonCaldera - 18) / 7.0;
        return 1.25 + smoothstep(0, 1, tCliff) * 4.95; // 1.25 -> 6.20
      } else {
        // Outer crater slope descending to volcanic terrain
        const tOuter = clamp((distDragonCaldera - 25) / 9.0, 0, 1);
        return (1 - tOuter) * 6.20 + tOuter * 2.8;
      }
    }

    // 6.2 Primal Dragon Core at [35, -280]
    const distCore = Math.hypot(x - 35, z - -280);
    if (distCore < 36) {
      if (distCore < 18) return -0.4 + Math.sin(x * 0.15) * 0.3;
      const tc = (distCore - 18) / 18;
      return (1 - tc) * -0.4 + tc * 3.5;
    }

    // Volcanic terrain with smooth southern edge transition towards central plains (z: -180..-220)
    const volcanicNoise = Math.sin(x * 0.06) * 1.6 + Math.cos(z * 0.07) * 1.4;
    const baseVolc = clamp(2.8 + volcanicNoise, 1.5, 6.5);
    if (z > -220) {
      const tPlains = clamp((z - -220) / 40, 0, 1);
      const plainsMeadow = 0.8 + Math.sin(x * 0.05) * 0.4;
      return (1 - tPlains) * baseVolc + tPlains * plainsMeadow;
    }
    return baseVolc;
  }

  // 7. Ancient Titan Sanctuary Basin Arena (North-West: [-95, -75], Diameter 35m)
  const distTitan = Math.hypot(x - -95, z - -75);
  if (distTitan < 24) {
    if (distTitan < 5.5) {
      return 0.35; // Flat central stone stepping platform
    } else if (distTitan < 16.5) {
      // Shallow valley lake basin
      const tLake = (distTitan - 5.5) / 11.0;
      return 0.35 - Math.sin(tLake * Math.PI) * 0.70; // dips smoothly to -0.35
    } else {
      // Gentle basin rim rising to surrounding open meadow
      const tRim = clamp((distTitan - 16.5) / 7.5, 0, 1);
      return -0.15 + tRim * 0.75;
    }
  }

  // 8. Shadowfen Gloom Marsh (Far West: x < -120 && z >= -200 && z <= 120)
  if (x < -120 && z >= -200 && z <= 120) {
    const distGrotto = Math.hypot(x - -300, z - 25);
    if (distGrotto < 35) {
      if (distGrotto < 16) return -0.35;
      const tg = (distGrotto - 16) / 19;
      return (1 - tg) * -0.35 + tg * 0.4;
    }
    // Tiered marsh knolls & winding water channels (0.0..0.6)
    const swampWater = Math.sin(x * 0.08) * 0.18 + Math.cos(z * 0.07) * 0.15;
    const baseSwamp = clamp(0.35 + swampWater, 0.0, 0.6);

    // Smooth transition from central plains between x: -95 and x: -120
    if (x > -140) {
      const tPlains = clamp((x - -140) / 20, 0, 1);
      const plainsMeadow = 0.65 + Math.sin(x * 0.05) * 0.35;
      return (1 - tPlains) * baseSwamp + tPlains * plainsMeadow;
    }
    return baseSwamp;
  }

  // 9. Jade Bamboo Grove & Celestial Pagoda (Far South-East: x > 120 && z > 20)
  if (x > 120 && z > 20) {
    const distOuterPavilion = Math.hypot(x - 310, z - 210);
    if (distOuterPavilion < 28) {
      if (distOuterPavilion < 15) return 3.4;
      const tp = (distOuterPavilion - 15) / 13;
      return (1 - tp) * 3.4 + tp * 2.0;
    }

    // Relocated Jade Pagoda at [170, 160]
    const distPagoda = Math.hypot(x - 170, z - 160);
    if (distPagoda < 24) {
      if (distPagoda < 16) return 2.5;
      const t = (distPagoda - 16) / 8;
      const hills = 1.6 + Math.sin(x * 0.06) * 0.4;
      return (1 - t) * 2.5 + t * hills;
    }
    // Emerald hills (0.5..2.0)
    return clamp(1.2 + Math.sin(x * 0.05) * 0.55 + Math.cos(z * 0.05) * 0.45, 0.5, 2.0);
  }

  // 10. South Ocean Wedge (z > 20 along southern boundary)
  const isSouthOceanWedge =
    (Math.abs(x) <= 45 && z > 20) ||
    (x < -45 && x >= -220 && z > 20 + (-x - 45) * 1.95) ||
    (x > 45 && x <= 420 && z > 20 + (x - 45) * 1.15);

  if (isSouthOceanWedge) {
    // Shoreline beach slope
    const zCoast = Math.abs(x) <= 45 ? 20 : (x < -45 ? 20 + (-x - 45) * 1.95 : 20 + (x - 45) * 1.15);
    const coastDist = z - zCoast;
    if (coastDist <= 4) {
      return 0.15 - (coastDist / 4) * 0.45; // 0.15 -> -0.30
    }
    const waveNoise = Math.sin(x * 0.08) * 0.35;
    return clamp(-1.5 - coastDist * 0.08 + waveNoise, -10.0, -0.4);
  }

  // 11. Central Plains Buffer Zone: Padang Rumput Eldoria (X: -120..110, Z: -200..20)
  // Dataran rumput hijau subur berbukit landai (0.0 s/d 2.0)
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

  const distValKragor = Math.hypot(x - 188, z - -16);

  // 0. Coastal Naval Harbor (Seamless Beach Connection, 2 Tiers of Berthing Wings & Pier Head)
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
    if (x < -95 && z > 35 && Math.hypot(x - -340, z - 260) < 22) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    if (zone.id === 'south_ocean' || z > 18) {
      const depth = clamp(-y / 4.0, 0, 1);
      const r = Math.round(18 + (1 - depth) * 35);
      const g = Math.round(105 + (1 - depth) * 65);
      const b = Math.round(188 + (1 - depth) * 55);
      return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
    }
    return { height: y, color: [30, 58, 62], biomeId: 'swamp_water', isWater: true, isPath: false, slope };
  }

  // 2. Imperial Capital Astraea (North Frostpeak: Center [180, -260])
  if (x >= 148 && x <= 212 && z <= -232 && z >= -288) {
    const distPlaza = Math.hypot(x - 164, z - -260);
    if (distPlaza <= 11.5 && distPlaza >= 4.8) {
      return { height: y, color: [248, 250, 252], biomeId: 'astraea_plaza', isWater: false, isPath: true, slope };
    }
    if (Math.abs(z - -260) <= 3.2 && x >= 148 && x <= 195) {
      return { height: y, color: [250, 204, 21], biomeId: 'astraea_gold_road', isWater: false, isPath: true, slope };
    }
    if ((Math.abs(z - -273) <= 2.2 || Math.abs(z - -247) <= 2.2) && x >= 155 && x <= 178) {
      return { height: y, color: [241, 245, 249], biomeId: 'astraea_bazaar', isWater: false, isPath: true, slope };
    }
    const distPalace = Math.hypot(x - 195, z - -260);
    if (distPalace < 18 || distPlaza < 14) {
      return { height: y, color: [241, 245, 249], biomeId: 'astraea_marble', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [226, 232, 240], biomeId: 'astraea_city', isWater: false, isPath: false, slope };
  }

  // Astraea Western Avenue descending road
  if (x >= 95 && x < 148 && Math.abs(z - -260) <= 3.8) {
    return { height: y, color: [250, 204, 21], biomeId: 'astraea_road', isWater: false, isPath: true, slope };
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
  if (Math.abs(z - 7) <= 2.2 && Math.abs(x) <= 25) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }

  // 3c. Inter-regional Highway Network
  // Highway 1: Desa Utama -> Jembatan Gantung -> Benteng Val-Kragor
  if (
    (Math.abs(z - -15) <= 2.8 && x >= 16 && x <= 88) ||
    (Math.abs(z - -16) <= 2.8 && x >= 88 && x <= 162)
  ) {
    return { height: y, color: [175, 155, 135], biomeId: 'valkragor_road', isWater: false, isPath: true, slope: 0 };
  }

  // Highway 2: Desa Utama -> Rawa Shadowfen
  if (x >= -180 && x <= -16) {
    const roadZ = -4 + clamp((-x - 16) / 164, 0, 1) * 29;
    if (Math.abs(z - roadZ) <= 2.8) {
      return { height: y, color: [160, 145, 130], biomeId: 'shadowfen_road', isWater: false, isPath: true, slope: 0 };
    }
  }

  // Highway 3: Benteng Val-Kragor -> Puncak Salju Frostpeak & Astraea
  if (z <= -40 && z >= -260) {
    const roadX = 188 - clamp((-z - 40) / 220, 0, 1) * 20;
    if (Math.abs(x - roadX) <= 2.8) {
      return { height: y, color: [210, 218, 226], biomeId: 'frostpeak_highway', isWater: false, isPath: true, slope: 0 };
    }
  }

  // Internal Val-Kragor Streets
  if (
    (Math.abs(z - -16) <= 2.4 && x >= 162 && x <= 210) ||
    (Math.abs(x - 184) <= 2.2 && z >= -34 && z <= 0)
  ) {
    return { height: y, color: [148, 163, 184], biomeId: 'valkragor_street', isWater: false, isPath: true, slope: 0 };
  }

  // 3b. Ancient Sunken Ruins of Vael Granite Flagstone Terrace
  if (x <= -95 && x >= -140 && z >= 15 && z <= 60) {
    return { height: y, color: [120, 113, 108], biomeId: 'ancient_ruins', isWater: false, isPath: false, slope };
  }

  // 4. Val-Kragor Fortress Slate
  if (distValKragor < 30) {
    return { height: y, color: [71, 85, 105], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope };
  }

  // 4b. Ancient Titan Sanctuary Basin Arena (North-West Open Grassland: [-95, -75])
  const distTitanSample = Math.hypot(x - -95, z - -75);
  if (distTitanSample < 24) {
    if (distTitanSample < 5.5) {
      return { height: y, color: [140, 138, 134], biomeId: 'titan_platform', isWater: false, isPath: true, slope: 0 };
    } else if (distTitanSample < 16.5) {
      return { height: y, color: [38, 145, 185], biomeId: 'titan_lake', isWater: true, isPath: false, slope };
    } else {
      return { height: y, color: [100, 145, 80], biomeId: 'titan_rim', isWater: false, isPath: false, slope };
    }
  }

  // 4c. Dragon Caldera Arena at [-29, -337] (Far North Volcano)
  const distDragonCalderaSample = Math.hypot(x - -29, z - -337);
  if (distDragonCalderaSample < 34) {
    if (distDragonCalderaSample < 18) {
      if (distDragonCalderaSample >= 14 && Math.sin(x * 0.8 + z * 0.8) > 0.3) {
        return { height: y, color: [245, 80, 20], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
      }
      return { height: y, color: [92, 34, 28], biomeId: 'dragon_arena', isWater: false, isPath: false, slope };
    } else if (distDragonCalderaSample <= 26) {
      return { height: y, color: [28, 24, 28], biomeId: 'dragon_obsidian_cliff', isWater: false, isPath: false, slope };
    }
  }

  // 5. Regional Biome Shading based on getBiomeAt(x, z)
  if (zone.id === 'east_frostpeak') {
    const distMageTower = Math.hypot(x - 160, z - -150);
    if (distMageTower < 20) {
      return { height: y, color: [48, 42, 85], biomeId: 'thunderpeak', isWater: false, isPath: false, slope };
    }

    if (z <= -300 && z >= -340 && x >= 120 && x <= 245) {
      if (Math.abs(x - 180) <= 6) {
        return { height: y, color: [147, 197, 253], biomeId: 'ice_bridge', isWater: false, isPath: true, slope };
      }
      return { height: y, color: [56, 189, 248], biomeId: 'frozen_chasm', isWater: false, isPath: false, slope };
    }

    const pX = clamp((x - 110) / 45, 0, 1);
    const pZ = clamp((-z - 40) / 47, 0, 1);
    const noise = Math.sin(x * 0.12) * 0.12 + Math.cos(z * 0.1) * 0.12;
    const frost = clamp(pX * pZ + noise, 0, 1);

    if (frost < 0.32) {
      return { height: y, color: [107, 124, 98], biomeId: 'frost_tundra', isWater: false, isPath: false, slope };
    } else if (frost < 0.68) {
      return { height: y, color: [195, 212, 222], biomeId: 'frost_gravel', isWater: false, isPath: false, slope };
    } else {
      if (y > 7.0 || z < -300) {
        return { height: y, color: [186, 230, 253], biomeId: 'frost_ice', isWater: false, isPath: false, slope };
      }
      return { height: y, color: [248, 250, 252], biomeId: 'frost_snow', isWater: false, isPath: false, slope };
    }
  }

  if (zone.id === 'southwest_desert') {
    const distPyramid = Math.hypot(x - -180, z - 180);
    if (distPyramid < 22) {
      return { height: y, color: [220, 160, 40], biomeId: 'solaria_pyramid', isWater: false, isPath: false, slope };
    }
    const duneWave = Math.sin(x * 0.035 + z * 0.028);
    const r = Math.round(234 + duneWave * 15);
    const g = Math.round(179 + duneWave * 20);
    const b = Math.round(18 + duneWave * 12);
    return { height: y, color: [r, g, b], biomeId: 'solaria_desert', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'north_volcanic') {
    if (y < 0.5) {
      return { height: y, color: [239, 68, 68], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [45, 30, 30], biomeId: 'dragon_basalt', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'west_swamp') {
    return { height: y, color: [46, 37, 64], biomeId: 'shadowfen_marsh', isWater: false, isPath: false, slope };
  }

  if (zone.id === 'southeast_bamboo') {
    const distPagoda = Math.hypot(x - 170, z - 160);
    if (distPagoda < 20) {
      return { height: y, color: [20, 160, 110], biomeId: 'jade_pagoda', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [16, 185, 129], biomeId: 'jade_bamboo', isWater: false, isPath: false, slope };
  }

  // Beach sand along coastal edge
  if (z > 16 && y < 1.0) {
    return { height: y, color: [254, 215, 170], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // Central Plains Buffer Zone (Padang Rumput Hijau Subur Berbukit Landai)
  const grassShade = (Math.sin(x * 0.15) + Math.cos(z * 0.15)) * 10;
  const gr = Math.round(clamp(115 + grassShade, 95, 140));
  const gg = Math.round(clamp(185 + grassShade, 165, 210));
  const gb = Math.round(clamp(75 + grassShade * 0.5, 55, 95));
  return { height: y, color: [gr, gg, gb], biomeId: 'meadow', isWater: false, isPath: false, slope };
}
