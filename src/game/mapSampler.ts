/**
 * Unified Continent Map Sampler
 * Provides procedural elevation, biome classification, and topographic relief colors
 * for the expanded open world (X: -650..750, Z: -500..500).
 * Used by world.ts, Minimap.tsx, and WorldMapModal.tsx.
 */

export interface BiomeSample {
  height: number;
  color: [number, number, number]; // RGB 0..255
  biomeId: string;
  isWater: boolean;
  isPath: boolean;
  slope: number; // 0..1
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
 * Procedural height function across the vast expanded world
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

  // 2. Second Village: Desa Benteng Val-Kragor Relocated East Plateau (x: 125..195, z: -48..15)
  // Spacious flat fortress interior centered at (158, -16) well clear of suspension bridge
  const distValKragor = Math.hypot(x - 158, z - -16);
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
  // Flat landing at x: 87..92 at y = 2.00, then smoothly ascends to fortress plateau y = 3.20 at x = 132
  if (x >= 87 && x <= 134 && z >= -34 && z <= 2) {
    const roadDistZ = Math.abs(z - -16);
    let roadElev = 2.0;
    if (x > 92) {
      const tX = clamp((x - 92) / 40, 0, 1);
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

  // 4. Frostpeak Mountain Biome & Grand Imperial Kingdom of Astraea (North-East: x: 45..520, z: -34..-480)
  if (x >= 45 && z <= -34 && (x >= 70 || z <= -45)) {
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
    const tWest = clamp((x - 45) / 103, 0, 1);
    const sWest = smoothstep(0, 1, tWest);
    const westBaseElev = 1.8 + sWest * 4.2;

    // Southern slope descent towards Val-Kragor
    const tSouth = clamp((-z - 35) / 197, 0, 1);
    const sSouth = smoothstep(0, 1, tSouth);
    const southBaseElev = 3.2 + sSouth * 2.8;

    let baseRegionalElev = 6.0;
    if (x < astraeaMinX && z > astraeaMaxZ) {
      const weightX = (astraeaMinX - x) / (astraeaMinX - 45);
      const weightZ = (z - astraeaMaxZ) / (-35 - astraeaMaxZ);
      baseRegionalElev = (weightX * westBaseElev + weightZ * southBaseElev) / (weightX + weightZ + 0.001);
    } else if (x < astraeaMinX) {
      baseRegionalElev = westBaseElev;
    } else if (z > astraeaMaxZ) {
      baseRegionalElev = southBaseElev;
    }

    // Soft rolling snow mounds with natural gentle slopes (anti-tebing curam)
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
    return outerElevation;
  }

  // 5. Solaria Golden Dunes, Village, Palace & Secret Palm Oasis (South-West: x < -95 && z > 35)
  if (x < -95 && z > 35) {
        // 5.1 Solaria Desert Village Bazaar & Taj Mahal Palace Plateau
    const inSolariaMetropolis = x >= -445 && x <= -345 && Math.abs(z - 350) <= 32;
    if (inSolariaMetropolis) return 2.4;

    const distPalace = Math.hypot(x - -415, z - 350);
    if (distPalace < 32) return 2.4;

    const distVillage = Math.hypot(x - -375, z - 350);
    if (distVillage < 38) {
      if (distVillage < 28) return 2.4;
      const tv = (distVillage - 28) / 10;
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

    // 5.3 Sunken Pharaoh Pyramid at [-165, 110]
    const distPyramid = Math.hypot(x - -165, z - 110);
    if (distPyramid < 25) {
      if (distPyramid < 17) return 1.4;
      const t = (distPyramid - 17) / 8;
      const dunes = Math.sin(x * 0.04 + z * 0.035) * 2.2 + Math.cos(x * 0.03 - z * 0.04) * 1.4;
      return (1 - t) * 1.4 + t * Math.max(1.4, 1.4 + dunes);
    }

    // 5.4 Tiered undulating rolling sand dunes
    const dunes =
      Math.sin(x * 0.035 + z * 0.028) * 3.4 +
      Math.cos(x * 0.024 - z * 0.032) * 2.6 +
      Math.sin((x + z) * 0.018) * 1.8;
    return Math.max(0.6, 2.2 + dunes);
  }

  // 6. Dragonfang Caldera & Primal Dragon Core (Far North: z < -85 && x >= -120 && x <= 140)
  if (z < -85 && x >= -120 && x <= 140) {
    const distCore = Math.hypot(x - 35, z - -280);
    if (distCore < 36) {
      if (distCore < 18) return -0.4 + Math.sin(x * 0.15) * 0.3;
      const tc = (distCore - 18) / 18;
      return (1 - tc) * -0.4 + tc * 3.5;
    }

    const distDragonCaldera = Math.hypot(x - 20, z - -145);
    if (distDragonCaldera < 24) {
      if (distDragonCaldera < 16) return 0.2;
      const t = (distDragonCaldera - 16) / 8;
      const ridge = 2.2 + Math.sin(x * 0.1) * 1.5;
      return (1 - t) * 0.2 + t * ridge;
    }

    const volcanicNoise = Math.sin(x * 0.06) * 3.2 + Math.cos(z * 0.07) * 2.8;
    return 2.5 + volcanicNoise;
  }

  // 7. Thunderpeak Lightning Spire Sanctuary (Far North-West: x < -70 && z < -70)
  if (x < -70 && z < -70) {
    const distAltar = Math.hypot(x - -155, z - -135);
    if (distAltar < 22) {
      if (distAltar < 15) return 5.5;
      const t = (distAltar - 15) / 7;
      const crag = 4.0 + Math.sin(x * 0.08) * 2.0;
      return (1 - t) * 5.5 + t * crag;
    }
    return 3.8 + Math.sin(x * 0.07) * 2.4 + Math.cos(z * 0.06) * 2.0;
  }

  // 8. Shadowfen Gloom Marsh (Far West: x < -65 && z > -75 && z < 140)
  if (x < -65 && z > -75 && z < 140) {
    const distGrotto = Math.hypot(x - -300, z - 25);
    if (distGrotto < 35) {
      if (distGrotto < 16) return -0.35;
      const tg = (distGrotto - 16) / 19;
      return (1 - tg) * -0.35 + tg * 0.4;
    }
    // Tiered marsh knolls & winding water channels
    const swampWater = Math.sin(x * 0.08) * 0.5 + Math.cos(z * 0.07) * 0.4 + Math.sin(x * 0.03 + z * 0.04) * 1.2;
    return Math.max(-0.25, 0.35 + swampWater);
  }

  // 9. Jade Bamboo Grove & Celestial Pagoda (Far South-East: x > 105 && z > 35)
  if (x > 105 && z > 35) {
    const distOuterPavilion = Math.hypot(x - 310, z - 210);
    if (distOuterPavilion < 28) {
      if (distOuterPavilion < 15) return 3.4;
      const tp = (distOuterPavilion - 15) / 13;
      return (1 - tp) * 3.4 + tp * 2.0;
    }

    const distPagoda = Math.hypot(x - 165, z - 115);
    if (distPagoda < 24) {
      if (distPagoda < 16) return 2.5;
      const t = (distPagoda - 16) / 8;
      const hills = 1.6 + Math.sin(x * 0.06) * 1.4;
      return (1 - t) * 2.5 + t * hills;
    }
    return 1.8 + Math.sin(x * 0.05) * 1.6 + Math.cos(z * 0.05) * 1.4;
  }

  // 10. Coral Cove & South Ocean (z > 20)
  if (z > 20 && x > 40 && x <= 220) {
    const coveDist = z - 20;
    const beachSlope = coveDist * 0.12;
    const seaWave = Math.sin(x * 0.08) * 0.35;
    const height = 0.2 - beachSlope + seaWave;
    if (height < -0.3) return Math.max(-5.0, -0.3 - (z - 30) * 0.18);
    return height;
  }

  // 11. Azure Coast & Open South Sea (z > 18)
  if (z > 18 && x <= 40 && x >= -95) {
    const beachSlope = (z - 18) * 0.12;
    const waveNoise = Math.sin(x * 0.1) * 0.35;
    const height = 0.1 - beachSlope + waveNoise;
    if (height < -0.4) return Math.max(-5.0, -0.4 - (z - 28) * 0.2);
    return height;
  }

  // 12. General rolling meadow terrain across Eldoria
  let h =
    Math.sin(x * 0.06) * 1.5 +
    Math.cos(z * 0.05) * 1.3 +
    Math.sin(x * 0.12 + z * 0.12) * 0.6;

  // Outer Perimeter mountain wall (Encircles the expanded world)
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

  // Approximate slope by sampling nearby points
  const delta = 1.8;
  const yRight = getProceduralContinentHeight(x + delta, z);
  const yDown = getProceduralContinentHeight(x, z + delta);
  const slope = clamp(Math.hypot(yRight - y, yDown - y) / delta, 0, 1);

  const distCenter = Math.hypot(x, z);
  const distValKragor = Math.hypot(x - 158, z - -16);

  // 0. Expanded Coastal Naval Harbor (Seamless Beach Connection, 2 Tiers of Berthing Wings & Pier Head)
  // Beach shoreline boardwalk apron (resting firmly on sand y = terrainHeight)
  if (Math.abs(x) <= 7.0 && z >= 14.5 && z <= 18.0) {
    return { height: y, color: [141, 110, 99], biomeId: 'harbor_boardwalk', isWater: false, isPath: true, slope: 0 };
  }
  // Beach ramp, wide main straight pier, 2-tier berthing wings, and seaward pier head
  if (
    (Math.abs(x) <= 2.6 && z >= 18.0 && z <= 58.0) ||
    (Math.abs(x) <= 7.0 && z >= 58.0 && z <= 64.0) ||
    (Math.abs(z - 34.0) <= 2.2 && Math.abs(x) <= 16.0) ||
    (Math.abs(z - 48.0) <= 2.2 && Math.abs(x) <= 14.0)
  ) {
    return { height: 1.85, color: [141, 110, 99], biomeId: 'harbor_pier', isWater: false, isPath: true, slope: 0 };
  }

  // Moored Main Ships (1 Galleon at East Wing, 1 Warship at West Wing, 1 Rowboat at Pier Head)
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
    if (z > 18) {
      const depth = clamp(-y / 4.0, 0, 1);
      const r = Math.round(14 + (1 - depth) * 40);
      const g = Math.round(116 + (1 - depth) * 70);
      const b = Math.round(180 + (1 - depth) * 60);
      return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
    }
    return { height: y, color: [30, 58, 62], biomeId: 'swamp_water', isWater: true, isPath: false, slope };
  }

  // 2. Relocated Imperial Capital Astraea (North Frostpeak: Center [180, -260])
  if (x >= 148 && x <= 212 && z <= -232 && z >= -288) {
    // Grand Circular Stone Plaza & Ringroad around Celestial Fountain at [164, -260]
    const distPlaza = Math.hypot(x - 164, z - -260);
    if (distPlaza <= 11.5 && distPlaza >= 4.8) {
      return { height: y, color: [248, 250, 252], biomeId: 'astraea_plaza', isWater: false, isPath: true, slope };
    }
    // Main Imperial Golden Highway & Grand Esplanade (West Gate to Palace)
    if (Math.abs(z - -260) <= 3.2 && x >= 148 && x <= 195) {
      return { height: y, color: [250, 204, 21], biomeId: 'astraea_gold_road', isWater: false, isPath: true, slope };
    }
    // North and South Bazaar Market Promenades
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
  // North-South Promenade (from North Gate z: -24 down to Shoreline Quay z: 19)
  if (Math.abs(x) <= 3.2 && z >= -24 && z <= 19) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }
  // Central Plaza Circle around Fountain (at [0, -4])
  if (Math.hypot(x, z - -4) <= 7.5) {
    return { height: y, color: [226, 218, 214], biomeId: 'eldoria_plaza', isWater: false, isPath: true, slope: 0 };
  }
  // West Residential Street (along x = -19, connecting houses)
  if (Math.abs(x - -19) <= 2.2 && z >= -16 && z <= 12) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }
  // East Residential Street (along x = 19, connecting houses)
  if (Math.abs(x - 19) <= 2.2 && z >= -16 && z <= 12) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }
  // Cross Street (connecting West & East across central plaza at z = -4)
  if (Math.abs(z - -4) <= 2.2 && Math.abs(x) <= 25) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }
  // South Cross Street (connecting Blacksmith & Shops to Residential Wards at z = 7)
  if (Math.abs(z - 7) <= 2.2 && Math.abs(x) <= 25) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope: 0 };
  }

  // 3c. Inter-regional Highway Network (Jaringan Jalan Utama Antar-Wilayah)
  // Highway 1: Desa Utama -> Jembatan Gantung -> Benteng Val-Kragor (Timur)
  if (
    (Math.abs(z - -15) <= 2.8 && x >= 16 && x <= 88) ||
    (Math.abs(z - -16) <= 2.8 && x >= 88 && x <= 132)
  ) {
    return { height: y, color: [175, 155, 135], biomeId: 'valkragor_road', isWater: false, isPath: true, slope: 0 };
  }

  // Highway 2: Desa Utama -> Rawa Shadowfen (Barat)
  if (x >= -180 && x <= -16) {
    const roadZ = -4 + clamp((-x - 16) / 164, 0, 1) * 29;
    if (Math.abs(z - roadZ) <= 2.8) {
      return { height: y, color: [160, 145, 130], biomeId: 'shadowfen_road', isWater: false, isPath: true, slope: 0 };
    }
  }

  // Highway 3: Benteng Val-Kragor -> Puncak Salju Frostpeak & Kerajaan Astraea (Utara)
  if (z <= -40 && z >= -260) {
    const roadX = 158 - clamp((-z - 40) / 220, 0, 1) * 10;
    if (Math.abs(x - roadX) <= 2.8) {
      return { height: y, color: [210, 218, 226], biomeId: 'frostpeak_highway', isWater: false, isPath: true, slope: 0 };
    }
  }

  // Internal Val-Kragor Streets: Main thoroughfare and north/south barracks branches
  if (
    (Math.abs(z - -16) <= 2.4 && x >= 132 && x <= 180) ||
    (Math.abs(x - 154) <= 2.2 && z >= -34 && z <= 0)
  ) {
    return { height: y, color: [148, 163, 184], biomeId: 'valkragor_street', isWater: false, isPath: true, slope: 0 };
  }

  // 3b. Ancient Sunken Ruins of Vael Granite Flagstone Terrace (x: -140..-95, z: 15..60)
  if (x <= -95 && x >= -140 && z >= 15 && z <= 60) {
    return { height: y, color: [120, 113, 108], biomeId: 'ancient_ruins', isWater: false, isPath: false, slope };
  }

  // 4. Val-Kragor Fortress Slate
  if (distValKragor < 30) {
    return { height: y, color: [71, 85, 105], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope };
  }

  // 5. Frostpeak Mountain Glacier (Salju & Es Glasial)
  if (x >= 45 && z <= -28 && !(z < -95 && x <= 75)) {
    // Frozen chasm blue ice floor
    if (z <= -300 && z >= -340 && x >= 120 && x <= 245) {
      if (Math.abs(x - 180) <= 6) {
        return { height: y, color: [147, 197, 253], biomeId: 'ice_bridge', isWater: false, isPath: true, slope };
      }
      return { height: y, color: [56, 189, 248], biomeId: 'frozen_chasm', isWater: false, isPath: false, slope };
    }

    const pX = clamp((x - 45) / 45, 0, 1);
    const pZ = clamp((-z - 28) / 47, 0, 1);
    const noise = Math.sin(x * 0.12) * 0.12 + Math.cos(z * 0.1) * 0.12;
    const frost = clamp(pX * pZ + noise, 0, 1);

    if (frost > 0.0) {
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
  }

  // 6. Solaria Golden Dunes
  if (x < -95 && z > 35) {
    const duneWave = Math.sin(x * 0.035 + z * 0.028);
    const r = Math.round(234 + duneWave * 15);
    const g = Math.round(179 + duneWave * 20);
    const b = Math.round(8 + duneWave * 12);
    return { height: y, color: [r, g, b], biomeId: 'solaria_desert', isWater: false, isPath: false, slope };
  }

  // 7. Dragonfang Caldera & Volcano (North)
  if (z < -85 && x >= -120 && x <= 140) {
    if (y < 0.5) {
      return { height: y, color: [239, 68, 68], biomeId: 'dragon_magma', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [45, 30, 30], biomeId: 'dragon_basalt', isWater: false, isPath: false, slope };
  }

  // 8. Thunderpeak Lightning Plateau
  if (x < -70 && z < -70) {
    return { height: y, color: [30, 27, 75], biomeId: 'thunderpeak', isWater: false, isPath: false, slope };
  }

  // 9. Shadowfen Gloom Marsh
  if (x < -65 && z > -75 && z < 140) {
    return { height: y, color: [46, 56, 31], biomeId: 'shadowfen_marsh', isWater: false, isPath: false, slope };
  }

  // 10. Jade Bamboo Grove
  if (x > 105 && z > 35) {
    return { height: y, color: [16, 185, 129], biomeId: 'jade_bamboo', isWater: false, isPath: false, slope };
  }

  // 11. Beach sand
  if (z > 16 && y < 1.0) {
    return { height: y, color: [254, 215, 170], biomeId: 'beach_sand', isWater: false, isPath: false, slope };
  }

  // 12. Temperate Meadow / Forest Grass (Default)
  const grassShade = (Math.sin(x * 0.15) + Math.cos(z * 0.15)) * 12;
  const gr = Math.round(clamp(104 + grassShade, 80, 130));
  const gg = Math.round(clamp(159 + grassShade, 135, 185));
  const gb = Math.round(clamp(56 + grassShade * 0.6, 40, 75));
  return { height: y, color: [gr, gg, gb], biomeId: 'meadow', isWater: false, isPath: false, slope };
}
