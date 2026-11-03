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
 * Procedural height function across the vast 2.5x - 3x expanded world
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  const distCenter = Math.hypot(x, z);

  // 1. Starting Village: Desa Eldoria Center (x: -24..24, z: -24..24) -> Smooth flat plateau
  if (distCenter < 24) {
    if (distCenter < 17) return 0.15;
    const t = (distCenter - 17) / 7;
    const meadow = Math.sin(x * 0.08) * 1.6 + Math.cos(z * 0.07) * 1.4;
    return (1 - t) * 0.15 + t * meadow;
  }

  // 2. Second Village: Desa Benteng Val-Kragor (x: 95..140, z: -38..5)
  const distValKragor = Math.hypot(x - 116, z - -17);
  if (distValKragor < 28) {
    if (distValKragor < 23) return 3.2;
    const t = (distValKragor - 23) / 5;
    const baseMeadow = 1.8 + Math.sin(x * 0.08) * 0.8;
    return (1 - t) * 3.2 + t * baseMeadow;
  }
  // Fortress western ramp / approach slope
  if (x >= 86 && x <= 98 && z >= -24 && z <= -10) {
    const t = (x - 86) / 12;
    return 2.0 + t * 1.2;
  }

  // 3. Misty Chasm & Wooden Suspension Bridge (x: 63..87, z: -30..0)
  if (x >= 63 && x <= 87 && z >= -34 && z <= 2) {
    const chasmCenter = 75;
    const chasmDepth = Math.max(0, 1 - Math.abs(x - chasmCenter) / 12);
    return 1.2 - chasmDepth * 5.2;
  }

  // 4. Frostpeak Mountain Biome & Grand Imperial Kingdom of Astraea (North-East: x: 45..520, z: -34..-480)
  if (x >= 45 && z <= -34 && (x >= 70 || z <= -45)) {
    // Astraea City Core (Flat y = 6.0)
    const astraeaMinX = 104;
    const astraeaMaxX = 166;
    const astraeaMinZ = -136;
    const astraeaMaxZ = -84;

    const dX = Math.max(0, astraeaMinX - x, x - astraeaMaxX);
    const dZ = Math.max(0, astraeaMinZ - z, z - astraeaMaxZ);
    const distToCity = Math.hypot(dX, dZ);

    // Western slope descent
    const tWest = clamp((x - 45) / 59, 0, 1);
    const sWest = smoothstep(0, 1, tWest);
    const westBaseElev = 1.8 + sWest * 4.2;

    // Southern slope descent towards Val-Kragor
    const tSouth = clamp((-z - 35) / 49, 0, 1);
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

    // Soft rolling snow mounds (bukit tumpul)
    const bluntHills =
      Math.sin(x * 0.055) * 0.65 +
      Math.cos(z * 0.048) * 0.55 +
      Math.sin(x * 0.026 + z * 0.034) * 0.45;

    const hillInfluence = smoothstep(6, 22, distToCity);

    // Expanded Far-North & Far-East Frostpeak Glacier & Frozen Crags
    let outerGlacier = 0;
    if (x > 170 || z < -140) {
      const distOuter = Math.hypot(Math.max(0, x - 170), Math.max(0, -140 - z));
      // Outer Frost Watchtower Plateau at [240, -220]
      const distGlacierPlat = Math.hypot(x - 240, z - -220);
      if (distGlacierPlat < 32) {
        if (distGlacierPlat < 18) return 8.5;
        const tp = (distGlacierPlat - 18) / 14;
        return (1 - tp) * 8.5 + tp * (7.0 + Math.sin(x * 0.05) * 1.5);
      }
      outerGlacier = Math.min(18, distOuter * 0.045 + Math.sin(x * 0.06 + z * 0.05) * 3.2);
    }

    const outerElevation = baseRegionalElev + bluntHills * hillInfluence + outerGlacier;

    if (distToCity === 0) return 6.0;
    if (distToCity < 12) {
      const sCity = smoothstep(0, 12, distToCity);
      return (1 - sCity) * 6.0 + sCity * outerElevation;
    }
    return outerElevation;
  }

  // 5. Solaria Golden Dunes & Secret Palm Oasis (South-West: x < -95 && z > 35)
  if (x < -95 && z > 35) {
    // Secret Palm Oasis at [-340, 260]
    const distOasis = Math.hypot(x - -340, z - 260);
    if (distOasis < 45) {
      if (distOasis < 18) {
        // Oasis turquoise pool surface & shoreline
        const poolFloor = -0.4 + Math.sin(x * 0.2) * 0.15;
        return poolFloor;
      }
      const tO = (distOasis - 18) / 27;
      return (1 - tO) * 0.2 + tO * 3.8;
    }

    // Sunken Pharaoh Pyramid at [-165, 110]
    const distPyramid = Math.hypot(x - -165, z - 110);
    if (distPyramid < 25) {
      if (distPyramid < 17) return 1.4;
      const t = (distPyramid - 17) / 8;
      const dunes = Math.sin(x * 0.04 + z * 0.035) * 2.2 + Math.cos(x * 0.03 - z * 0.04) * 1.4;
      return (1 - t) * 1.4 + t * Math.max(1.4, 1.4 + dunes);
    }

    // Vast rolling golden sand dunes across expanded territory
    const dunes =
      Math.sin(x * 0.035 + z * 0.028) * 3.4 +
      Math.cos(x * 0.024 - z * 0.032) * 2.6 +
      Math.sin((x + z) * 0.018) * 1.8;
    return Math.max(0.6, 2.2 + dunes);
  }

  // 6. Dragonfang Caldera & Primal Dragon Core (Far North: z < -85 && x >= -120 && x <= 140)
  if (z < -85 && x >= -120 && x <= 140) {
    // Primal Dragon Volcano Core at [35, -280]
    const distCore = Math.hypot(x - 35, z - -280);
    if (distCore < 36) {
      if (distCore < 18) return -0.4 + Math.sin(x * 0.15) * 0.3; // Magma caldera lake
      const tc = (distCore - 18) / 18;
      return (1 - tc) * -0.4 + tc * 3.5;
    }

    // Dragonfang Caldera Central Platform at [20, -145]
    const distDragonCaldera = Math.hypot(x - 20, z - -145);
    if (distDragonCaldera < 24) {
      if (distDragonCaldera < 16) return 0.2;
      const t = (distDragonCaldera - 16) / 8;
      const ridge = 2.2 + Math.sin(x * 0.1) * 1.5;
      return (1 - t) * 0.2 + t * ridge;
    }

    // Jagged volcanic rim
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
    // Deep Sunken Grotto at [-300, 25]
    const distGrotto = Math.hypot(x - -300, z - 25);
    if (distGrotto < 35) {
      if (distGrotto < 16) return -0.35;
      const tg = (distGrotto - 16) / 19;
      return (1 - tg) * -0.35 + tg * 0.4;
    }
    const swampWater = Math.sin(x * 0.08) * 0.6 + Math.cos(z * 0.07) * 0.5;
    return Math.max(-0.25, 0.25 + swampWater);
  }

  // 9. Jade Bamboo Grove & Celestial Pagoda (Far South-East: x > 105 && z > 35)
  if (x > 105 && z > 35) {
    // Outer Celestial Pavilion at [310, 210]
    const distOuterPavilion = Math.hypot(x - 310, z - 210);
    if (distOuterPavilion < 28) {
      if (distOuterPavilion < 15) return 3.4;
      const tp = (distOuterPavilion - 15) / 13;
      return (1 - tp) * 3.4 + tp * 2.0;
    }

    // Main Pagoda at [165, 115]
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

  // Outer Perimeter mountain wall (Encircles the 2.5x expanded world)
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
  const distValKragor = Math.hypot(x - 116, z - -17);

  // 1. Water Bodies
  if (y < 0.0) {
    // Solaria Oasis pool
    if (x < -95 && z > 35 && Math.hypot(x - -340, z - 260) < 22) {
      return { height: y, color: [6, 182, 212], biomeId: 'solaria_oasis', isWater: true, isPath: false, slope };
    }
    // Ocean / Coast
    if (z > 18) {
      const depth = clamp(-y / 4.0, 0, 1);
      const r = Math.round(14 + (1 - depth) * 40);
      const g = Math.round(116 + (1 - depth) * 70);
      const b = Math.round(180 + (1 - depth) * 60);
      return { height: y, color: [r, g, b], biomeId: 'ocean', isWater: true, isPath: false, slope };
    }
    // Marsh pool / lake
    return { height: y, color: [30, 58, 62], biomeId: 'swamp_water', isWater: true, isPath: false, slope };
  }

  // 2. Imperial Capital Astraea (Palace, Marble, Gold Road)
  if (x >= 104 && x <= 166 && z <= -84 && z >= -136) {
    if (Math.abs(z - -110) <= 3.2 && x >= 104 && x <= 148) {
      return { height: y, color: [250, 204, 21], biomeId: 'astraea_gold_road', isWater: false, isPath: true, slope };
    }
    const distPalace = Math.hypot(x - 148, z - -110);
    const distPlaza = Math.hypot(x - 125, z - -110);
    if (distPalace < 18 || distPlaza < 14) {
      return { height: y, color: [241, 245, 249], biomeId: 'astraea_marble', isWater: false, isPath: false, slope };
    }
    return { height: y, color: [226, 232, 240], biomeId: 'astraea_city', isWater: false, isPath: false, slope };
  }

  // Astraea Western Avenue
  if (x >= 70 && x < 104 && Math.abs(z - -110) <= 3.5) {
    return { height: y, color: [250, 204, 21], biomeId: 'astraea_road', isWater: false, isPath: true, slope };
  }

  // 3. Desa Eldoria Village Cobblestone
  if (distCenter < 14) {
    return { height: y, color: [215, 204, 200], biomeId: 'eldoria_path', isWater: false, isPath: true, slope };
  }

  // 4. Val-Kragor Fortress Slate
  if (distValKragor < 18) {
    return { height: y, color: [71, 85, 105], biomeId: 'valkragor_slate', isWater: false, isPath: true, slope };
  }

  // 5. Frostpeak Mountain Glacier (Salju & Es Glasial)
  if (x >= 45 && z <= -28 && !(z < -95 && x <= 75)) {
    const pX = clamp((x - 45) / 45, 0, 1);
    const pZ = clamp((-z - 28) / 47, 0, 1);
    const noise = Math.sin(x * 0.12) * 0.12 + Math.cos(z * 0.1) * 0.12;
    const frost = clamp(pX * pZ + noise, 0, 1);

    if (frost > 0.0) {
      if (frost < 0.32) {
        // Thawed tundra / lelehan es
        return { height: y, color: [107, 124, 98], biomeId: 'frost_tundra', isWater: false, isPath: false, slope };
      } else if (frost < 0.68) {
        // Frosted gravel / pasir bersalju
        return { height: y, color: [195, 212, 222], biomeId: 'frost_gravel', isWater: false, isPath: false, slope };
      } else {
        // Pure alpine snow & glacial ice
        if (y > 7.0 || z < -140) {
          return { height: y, color: [186, 230, 253], biomeId: 'frost_ice', isWater: false, isPath: false, slope };
        }
        return { height: y, color: [248, 250, 252], biomeId: 'frost_snow', isWater: false, isPath: false, slope };
      }
    }
  }

  // 6. Solaria Golden Dunes
  if (x < -95 && z > 35) {
    // Dune ridge color variation
    const duneWave = Math.sin(x * 0.035 + z * 0.028);
    const r = Math.round(234 + duneWave * 15);
    const g = Math.round(179 + duneWave * 20);
    const b = Math.round(8 + duneWave * 12);
    return { height: y, color: [r, g, b], biomeId: 'solaria_desert', isWater: false, isPath: false, slope };
  }

  // 7. Dragonfang Caldera & Volcano (North)
  if (z < -85 && x >= -120 && x <= 140) {
    if (y < 0.5) {
      // Magma river / caldera core
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

