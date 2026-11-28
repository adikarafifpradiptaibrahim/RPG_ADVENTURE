/**
 * WORLD_DATA - Single Source of Truth for Chronicles of Eldoria
 * Batas Dunia Diperluas: X: [-1650, 1450], Z: [-1450, 1200] (Skala 3100 x 2650 Unit)
 *
 * Mengontrol secara mutlak:
 * 1. Definisi Bioma & Garis Pantai Benua Utama 360° Lautan (getBiomeAt, isMainContinentLand)
 * 2. Elevasi Medan 3D (getProceduralContinentHeight)
 * 3. Alur 4 Cabang Sungai (RIVER_SPLINES)
 * 4. Jaringan Jalan Raya & Jembatan (ROAD_SPLINES & BRIDGE_CONFIGS)
 * 5. 14 Landmark & Wilayah Interaktif (WORLD_LANDMARKS)
 * 6. Proyeksi Peta 2D (worldToMapPercent, mapPercentToWorld)
 */

import { WORLD_LAYOUT_CONFIG, WorldLandmarkLayout, WorldBridgeLayout } from './worldLayoutConfig';
export { WORLD_LAYOUT_CONFIG };

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WORLD_BOUNDS: WorldBounds = {
  minX: -1650,
  maxX: 1450,
  minZ: -1450,
  maxZ: 1200,
};

export const WORLD_WIDTH = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX; // 3100
export const WORLD_HEIGHT = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ; // 2650

export type BiomeType = 'ocean' | 'volcano' | 'snow' | 'desert' | 'grassland' | 'lake';

export interface BiomeInfo {
  id: BiomeType;
  name: string;
  nameId: string;
  colorHex: string;
  colorRgb: [number, number, number];
}

export const BIOMES: Record<BiomeType, BiomeInfo> = {
  ocean: {
    id: 'ocean',
    name: 'Azure Ocean',
    nameId: 'Samudra & Laut Azure',
    colorHex: '#0284c7',
    colorRgb: [2, 132, 199],
  },
  volcano: {
    id: 'volcano',
    name: 'Dragonfang Volcano Island',
    nameId: 'Pulau Kaldera Sarang Naga',
    colorHex: '#dc2626',
    colorRgb: [220, 38, 38],
  },
  snow: {
    id: 'snow',
    name: 'Ancient Titan Snow Mountains',
    nameId: 'Pegunungan Salju Danau Titan',
    colorHex: '#e2e8f0',
    colorRgb: [226, 232, 240],
  },
  lake: {
    id: 'lake',
    name: 'Titan Glacial Lake',
    nameId: 'Danau Air Tawar Titan',
    colorHex: '#38bdf8',
    colorRgb: [56, 189, 248],
  },
  desert: {
    id: 'desert',
    name: 'Solaria Golden Desert',
    nameId: 'Gurun Pasir Emas Solaria',
    colorHex: '#eab308',
    colorRgb: [234, 179, 8],
  },
  grassland: {
    id: 'grassland',
    name: 'Eldoria Central Grasslands',
    nameId: 'Padang Rumput Eldoria',
    colorHex: '#559e48',
    colorRgb: [85, 158, 72],
  },
};

/**
 * Bentuk Garis Pantai Polar Organik Benua Utama Eldoria.
 * Pusat: (X: 0, Z: -320). Dikelilingi lautan luas 360°.
 * Menghasilkan teluk melengkung dalam & tanjung/semenanjung runcing alami.
 */
export const SEA_BED_HEIGHT = -6.0;

/**
 * Fast O(1) bounding check to detect deep ocean waters far from any landmass.
 * Skips all expensive Domain-Warped FBM noise, spline evaluation, and road checks.
 */
export function isFarOcean(x: number, z: number): boolean {
  // 1. Fast check for main continent (center [0, -320], max radius 1250 mencakup ekspansi gurun barat)
  const cdx = x;
  const cdz = z - (-320);
  if (cdx * cdx + cdz * cdz <= 1562500) {
    return false;
  }

  // 2. Dragon Caldera Archipelago [40, 840] (expanded volcanic ring + satellite islands radius 245)
  const ddx = x - 40;
  const ddz = z - 840;
  if (ddx * ddx + ddz * ddz <= 60025) {
    return false;
  }

  // 3. Lighthouse Island [-220, 460] (radius 75)
  const lhx = x - (-220);
  const lhz = z - 460;
  if (lhx * lhx + lhz * lhz <= 5625) {
    return false;
  }

  // 4. Pirate Island [-520, 620] (radius 85)
  const pix = x - (-520);
  const piz = z - 620;
  if (pix * pix + piz * piz <= 7225) {
    return false;
  }

  // 5. Rocky Reef [-780, 280] (radius 80)
  const rrx = x - (-780);
  const rrz = z - 280;
  if (rrx * rrx + rrz * rrz <= 6400) {
    return false;
  }

  return true;
}

function wrapAngleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function getContinentCoastRadius(angle: number, x: number, z: number): number {
  let r = 480;

  // 1. Barat Laut: Semenanjung Menjorok Melengkung ke Barat-Utara (Istana Sultan [-540, -540] & Kanyon [-280, -760])
  const nwCape = Math.exp(-Math.pow((angle - (-2.60)) / 0.38, 2)) * 320;

  // 1b. Ekspansi Pedalaman Gurun Barat (-X): memperluas gurun hingga X ~ -1080 agar Kawah Pusaran Solaria [-840, -260] jauh dari pantai (> 90+ unit)
  const westDesertExpansion = Math.exp(-Math.pow(wrapAngleDiff(angle, 3.04) / 0.44, 2)) * 560;

  // 2. Barat Daya: Tanjung Gurun Meruncing ke Laut Selatan (Desa Gurun [-560, -110])
  const swCape = Math.exp(-Math.pow((angle - 2.75) / 0.32, 2)) * 190;

  // 3. Barat Daya: Teluk Melengkung Dalam antara semenanjung gurun dan pelabuhan (angle ~ 2.15, inward delta -220)
  const swDeepBay = Math.exp(-Math.pow((angle - 2.15) / 0.28, 2)) * -220;

  // 4. Selatan: Teluk & Garis Pantai Pelabuhan Sanctuary [20, 20] (angle ~ 1.52)
  // Menghasilkan garis pantai di Z ~ 20 (jarak ~340 unit dari pusat benua [0, -320])
  const sHarbor = Math.exp(-Math.pow((angle - 1.52) / 0.24, 2)) * -140;

  // 5. Tenggara: Semenanjung Benteng Val-Kragor [580, 130] (angle ~ 0.62)
  const seCape = Math.exp(-Math.pow((angle - 0.62) / 0.45, 2)) * 380;

  // 6. Timur: Hubungan Daratan Halus Val-Kragor ke Hutan Kabut (tidak ada teluk cekung tajam yang menenggelamkan daratan timur)
  const eastBay = 0;

  // 7. Timur: Tanjung Hutan Kabut [760, -280] (angle ~ -0.08)
  const eastMistCape = Math.exp(-Math.pow((angle - (-0.08)) / 0.22, 2)) * 330;

  // 8. Timur Laut: Semenanjung Kembar Runcing & Tanjung Kekaisaran Astraea [575, -495]
  const neAstraeaCape = Math.exp(-Math.pow((angle - (-0.33)) / 0.26, 2)) * 310;
  const neSpire1 = Math.exp(-Math.pow((angle - (-0.60)) / 0.17, 2)) * 270;
  const neInlet = Math.exp(-Math.pow((angle - (-0.78)) / 0.12, 2)) * -120;
  const neSpire2 = Math.exp(-Math.pow((angle - (-0.95)) / 0.16, 2)) * 265;

  // 9. Utara: Teluk Cekung halus antara Timur Laut dan Pegunungan Titan (angle ~ -1.14)
  const northBay = Math.exp(-Math.pow((angle - (-1.14)) / 0.16, 2)) * -55;

  // 10. Utara: Pesisir Pegunungan Salju Titan Lebar (mengitari Danau Titan di Utara, Barat Laut, & Timur Laut)
  const northTitan = Math.exp(-Math.pow((angle - (-1.54)) / 0.48, 2)) * 300;

  // 11. Barat Laut: Teluk Cekung sebelum Tanjung Barat Laut (angle ~ -2.05)
  const nwBay = Math.exp(-Math.pow((angle - (-2.05)) / 0.22, 2)) * -170;

  r += nwCape + westDesertExpansion + swCape + swDeepBay + sHarbor + seCape + eastBay + eastMistCape + neAstraeaCape + neSpire1 + neInlet + neSpire2 + northBay + northTitan + nwBay;

  // Domain-Warped Multi-Octave FBM Noise
  const warpX = Math.sin(x * 0.007 + z * 0.005) * 36 + Math.cos(z * 0.014) * 18;
  const warpZ = Math.cos(x * 0.006 - z * 0.008) * 36 + Math.sin(x * 0.012) * 18;
  const fbm1 = Math.sin((x + warpX) * 0.015 + (z + warpZ) * 0.012) * 28;
  const fbm2 = Math.cos((x - warpX) * 0.030 - (z + warpZ) * 0.026) * 16;
  const fbm3 = Math.sin(x * 0.060 + z * 0.060) * 8;

  return r + fbm1 + fbm2 + fbm3;
}

/**
 * Pemeriksaan apakah titik (x, z) berada di dalam daratan Benua Utama Eldoria.
 */
export function isMainContinentLand(x: number, z: number): boolean {
  // Guaranteed continent land around all expanded capitals, fortresses, palaces & eastern landmarks
  if (
    Math.hypot(x - 580, z - 130) < 155 ||
    Math.hypot(x - 600, z - -50) < 150 ||
    Math.hypot(x - 575, z - -495) < 165 ||
    Math.hypot(x - -540, z - -505) < 145
  ) {
    return true;
  }

  const dx = x;
  const dz = z - (-320);
  const distSq = dx * dx + dz * dz;
  if (distSq > 1562500) return false; // > 1250 units: definitely ocean
  if (distSq < 90000) return true;    // < 300 units: definitely continent core
  const dist = Math.sqrt(distSq);
  const angle = Math.atan2(dz, dx);
  const coastR = getContinentCoastRadius(angle, x, z);
  return dist < coastR;
}

/**
 * Faktor salju organik domain-warped (0..1) mengikuti lekukan punggungan pegunungan utara.
 * - Tidak pernah membentuk garis lurus/kotak.
 * - Memberi pemisahan lembah berbatu >= 48 unit dari dinding utara Colosseum Titan [180, -560].
 */
export function getSnowWeight(x: number, z: number): number {
  if (!isMainContinentLand(x, z)) return 0;

  const wX = x + Math.sin(z * 0.011 + x * 0.005) * 44 + Math.cos(z * 0.024 - x * 0.008) * 18;
  const wZ = z + Math.sin(x * 0.015 + z * 0.007) * 28 + Math.cos(x * 0.031 - z * 0.012) * 14;

  const dxNorm = Math.abs(wX - 25) / 265;
  if (dxNorm >= 1.12) return 0;

  // Batas selatan melengkung organik utara Colosseum Titan [180, -560]
  const southArch = -682 + 24 * Math.cos((wX - 25) * 0.0065) - 38 * dxNorm * dxNorm;
  const zMargin = southArch - wZ;
  const xMargin = (1.0 - dxNorm) * 240;

  // Jaga lembah penyangga >= 48-55 unit dari dinding utara Colosseum Titan (radius arena ~65 -> min 118 unit dari pusat)
  const distTitan = Math.hypot(x - 180, z - -560);
  const titanClearance = (distTitan - 118) * 1.35;

  const signedDist = Math.min(zMargin, xMargin, titanClearance);
  if (signedDist <= 0) return 0;
  return smoothstepBlend(0, 62, signedDist);
}

export function isSnowBiome(x: number, z: number): boolean {
  return getSnowWeight(x, z) >= 0.45;
}

/**
 * Validator Bioma Gurun Solaria:
 * Organik, bergelombang sinusoidal + noise alami, memisahkan daratan pasir di Barat dari daratan hijau di Timur.
 */
export function isDesertBiome(x: number, z: number): boolean {
  if (!isMainContinentLand(x, z)) return false;
  // Dilarang mengklaim wilayah pegunungan salju utara
  if (getSnowWeight(x, z) > 0.22) return false;
  // Perbatasan digeser ke Barat sebesar ~80 unit (dari -160 menjadi -240)
  const wave = Math.sin(z * 0.006) * 110 + Math.cos(z * 0.015) * 35;
  const warp = Math.sin(x * 0.01 + z * 0.012) * 45;
  // 100% seluruh daratan benua di barat perbatasan ini (sampai pesisir barat daya) adalah Gurun Solaria
  return (x + wave + warp < -240) && (z < 180);
}

/**
 * 1. FUNGSI PENENTU BIOME (getBiomeAt)
 * 100% Organik, Benua Utama dikelilingi lautan 360°, Gurun Solaria di sisi Barat!
 */
export function getBiomeAt(x: number, z: number): BiomeType {
  // Fast ocean check: skip all checks if point is in far ocean
  if (isFarOcean(x, z)) {
    return 'ocean';
  }

  // A. Gugusan 3 Pulau Vulkanik Kaldera Naga di Laut Selatan Jauh [Pusat: 40, 840]
  const distDragonMain = Math.hypot(x - 40, z - 840);
  const distDragonSW = Math.hypot(x - -138, z - 892);
  const distDragonNW = Math.hypot(x - -128, z - 772);
  if (distDragonMain < 148 || distDragonSW < 55 || distDragonNW < 50) {
    return 'volcano';
  }

  // B. Kepulauan Perantara di Selatan & Barat (Archipelago)
  // 1. Pulau Mercusuar & Karang Pelaut [-220, 460]
  if (Math.hypot(x - -220, z - 460) < 58) {
    return 'grassland';
  }
  // 2. Pulau Reruntuhan Bajak Laut [-520, 620]
  if (Math.hypot(x - -520, z - 620) < 70) {
    return 'grassland';
  }
  // 3. Pulau Karang Terjal [-780, 280]
  if (Math.hypot(x - -780, z - 280) < 65) {
    return 'grassland';
  }

  // C. Samudra & Laut Lepas 360° yang mengelilingi Benua Utama
  if (!isMainContinentLand(x, z)) {
    return 'ocean';
  }

  // D. Danau Air Tawar Titan Kuno di Bagian Utara-Tengah [60, -820]
  if (Math.hypot(x - 60, z - -820) < 55) {
    return 'lake';
  }

  // E. Pegunungan Salju Utara di Sekitar Danau Titan (Organik & domain-warped)
  if (getSnowWeight(x, z) >= 0.45) {
    return 'snow';
  }

  // F. Bioma Gurun Emas Solaria di Sisi Barat (Kiri) Benua Utama (100% Pasir Emas tanpa Hijau Nyempil)
  if (isDesertBiome(x, z)) {
    return 'desert';
  }

  // G. Padang Rumput Hijau Eldoria (Sisi Tengah, Timur, dan Selatan Benua)
  return 'grassland';
}

/**
 * 2. SISTEM 4 CABANG SUNGAI BERKELOK (RIVER_SPLINES)
 * Mengalir berkelok alami dari Danau Titan Kuno ke Samudra Selatan, Estuari Timur, dan Teluk Barat Daya tanpa ujung buntu.
 */
export interface RiverSplineDef {
  id: string;
  name: string;
  points: [number, number][];
}

export const RIVER_NW_BRANCH: [number, number][] = [
  [60, -820],   // Outlet Danau Titan Kuno
  [42, -735],
  [15, -645],
  [48, -545],   // Berkelok lembut menjauhi barat Colosseum Titan [180, -560]
  [-10, -440],
  [-45, -335],
  [-15, -225],
  [25, -110],   // Titik Temu Tengah (Confluence)
];

export const RIVER_DESERT_BRANCH: [number, number][] = [
  [25, -110],   // Titik Temu Tengah
  [-50, -140],
  [-120, -170], // Lokasi Jembatan 1 Penyeberangan Gurun Solaria
  [-200, -208],
  [-268, -220], // Mengalir membelok ke selatan gurun
  [-310, -175],
  [-295, -105],
  [-265, -45],  // Bermuara mulus ke Teluk Dalam Barat Daya (0% ujung buntu)
];

export const RIVER_EAST_BRANCH: [number, number][] = [
  [25, -110],   // Titik Temu Tengah
  [85, -142],
  [155, -162],
  [200, -168],  // Lokasi Jembatan 3 Menara Sihir Timur
  [290, -182],
  [380, -190],  // Lokasi Jembatan 4 Benteng Val-Kragor
  [465, -222],
  [555, -275],  // Mengalir di antara Ibukota Astraea [575,-495] dan Hutan Kabut [760,-280]
  [635, -345],
  [725, -395],
  [835, -395],
  [915, -365],  // Bermuara mulus ke Pesisir Laut Timur (0% ujung buntu)
];

export const RIVER_SOUTH_BRANCH: [number, number][] = [
  [25, -110],   // Titik Temu Tengah (Confluence)
  [72, -92],
  [95, -60],    // Lokasi Jembatan 2 Poros Timur Astraea
  [92, -25],
  [84, 15],
  [72, 65],     // Muara Samudra Selatan
];

export const RIVER_SPLINES: RiverSplineDef[] = [
  { id: 'river_nw', name: 'Sungai Titan Hulu', points: RIVER_NW_BRANCH },
  { id: 'river_desert', name: 'Sungai Gurun Barat', points: RIVER_DESERT_BRANCH },
  { id: 'river_east', name: 'Sungai Kerajaan Timur', points: RIVER_EAST_BRANCH },
  { id: 'river_south', name: 'Sungai Hilir Muara', points: RIVER_SOUTH_BRANCH },
];

export function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
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
  for (const branch of RIVER_SPLINES) {
    const pts = branch.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

export function isRiverZone(px: number, pz: number, margin = 8.5): boolean {
  return getDistanceToRiver(px, pz) < margin;
}

export const WATER_LEVEL = -0.25;

/**
 * Validator ketat penempatan objek darat:
 * Memastikan koordinat bukan di zona laut, bukan di palung sungai/danau, dan berada aman di atas permukaan air.
 */
export function isStrictLandForProps(
  x: number,
  z: number,
  getHeight?: (x: number, z: number) => number
): boolean {
  if (isFarOcean(x, z)) return false;
  const biome = getBiomeAt(x, z);
  if (biome === 'ocean' || biome === 'lake') return false;
  if (isRiverZone(x, z, 8.5)) return false;
  // Perairan Danau Titan Kuno [60, -820]
  if (Math.hypot(x - 60, z - -820) < 58) return false;
  const h = getHeight ? getHeight(x, z) : getProceduralContinentHeight(x, z);
  return h >= WATER_LEVEL + 0.85; // h >= 0.60
}

/**
 * 3. JARINGAN JALAN RAYA & JEMBATAN (ROAD_SPLINES & BRIDGE_CONFIGS)
 * Menghubungkan seluruh lokasi baru di Benua Utama dengan rapi dan logis.
 */
export interface RoadSplineDef {
  id: string;
  name: string;
  width: number;
  points: [number, number][];
}

export const ROAD_SPLINES: RoadSplineDef[] = [
  // 1. POROS SELATAN: Desa Utama [20, -60] -> Pelabuhan Sanctuary [20, 20]
  {
    id: 'road_village_harbor',
    name: 'Jalan Poros Selatan: Desa - Pelabuhan',
    width: 6.8,
    points: [
      [20, -60],   // Alun-Alun Air Mancur Desa Utama
      [20, -40],
      [20, -20],
      [20, 0],
      [20, 20],    // Menuju Dermaga Pelabuhan Pantai Selatan
    ],
  },

  // 2A. POROS TIMUR BAGIAN BARAT: Desa Utama [20, -60] -> Jembatan [95, -60] -> Jembatan [200, -168] -> Jalan Lingkar Mage Tower [247, -237]
  {
    id: 'road_village_astraea',
    name: 'Jalan Poros Timur: Desa - Lingkar Mage Tower',
    width: 7.4,
    points: [
      [20, -60],   // Gerbang Timur Desa Utama
      [76, -60],   // Pangkal Barat Jembatan Poros Timur
      [114, -60],  // Pangkal Timur Jembatan Poros Timur
      [165, -108],
      [200, -148], // Pangkal Selatan Jembatan Menara Sihir Timur
      [200, -188], // Pangkal Utara Jembatan Menara Sihir Timur
      [226, -218],
      [247, -237], // Tersambung mulus ke sisi Barat Daya Jalan Lingkar Bundaran Sihir (radius 32)
    ],
  },

  // 2B. JALAN LINGKAR BUNDARAN SIHIR MAGE TOWER (Circular Arcane Ring Plaza radius 32 mengitari [270, -260])
  {
    id: 'road_mage_plaza_ring',
    name: 'Jalan Lingkar Bundaran Sihir Mage Tower',
    width: 7.5,
    points: [
      [247, -237], // Barat Daya (Sambungan dari Desa)
      [270, -228], // Selatan (Depan Tangga Gerbang Mage Tower)
      [293, -237], // Tenggara (Persimpangan ke Val-Kragor)
      [302, -260], // Timur
      [293, -283], // Timur Laut (Persimpangan ke Astraea)
      [270, -292], // Utara
      [247, -283], // Barat Laut
      [238, -260], // Barat
      [247, -237], // Tutup lingkaran kembali ke Barat Daya
      [260, -230], // Overlap tangent penutup lingkaran mulus
    ],
  },

  // 2C. POROS TIMUR BAGIAN UTARA: Keluar Bundaran Mage Tower [293, -283] -> Perbukitan -> Gerbang Selatan Ibukota Astraea [575, -410]
  {
    id: 'road_mage_astraea',
    name: 'Jalan Poros Kekaisaran: Lingkar Mage Tower - Ibukota Astraea',
    width: 7.8,
    points: [
      [293, -283], // Persimpangan Timur Laut Bundaran Mage Tower
      [355, -320],
      [425, -342],
      [495, -366],
      [554, -392],
      [575, -402],
      [575, -409], // Berhenti Tegak Lurus Tepat di Depan Gerbang Selatan Kota Megah Astraea [575, -495]
    ],
  },

  // 3. POROS TENGGARA: Keluar Bundaran Mage Tower [293, -237] -> Jembatan [380, -190] -> Puing Kastil [535, -45] -> Gerbang Utara Val-Kragor [580, 72]
  {
    id: 'road_mage_valkragor',
    name: 'Jalan Poros Tenggara: Mage Tower - Puing Kastil - Val-Kragor',
    width: 7.2,
    points: [
      [293, -237], // Persimpangan Tenggara Bundaran Mage Tower (bebas badan menara!)
      [355, -222],
      [380, -210], // Pangkal Utara Jembatan Val-Kragor
      [380, -170], // Pangkal Selatan Jembatan Val-Kragor
      [440, -125],
      [535, -45],  // Halaman Depan Puing Kastil Terbengkalai
      [562, 22],
      [580, 72],   // Berhenti Tegak Lurus di Depan Gerbang Besi Utara Benteng Val-Kragor (Z=75)
    ],
  },

  // 4. CABANG HUTAN KABUT: Puing Kastil [535, -45] -> Lembah Lumut [580, -120] -> Hutan Kabut [760, -280]
  {
    id: 'road_puing_mist_forest',
    name: 'Jalan Setapak Puing Kastil - Hutan Kabut',
    width: 5.4,
    points: [
      [535, -45],  // Halaman Depan Puing Kastil
      [560, -80],
      [580, -120], // Lembah Batu Lumut Kering
      [670, -190],
      [760, -280], // Glade Hutan Kabut Eldoria
    ],
  },

  // 5. POROS BARAT: Desa Utama [20, -60] -> Jembatan 1 [-120, -170] -> Mengitari Tepi Kering Oase -> Desa Gurun [-540, -420]
  {
    id: 'road_plains_desert',
    name: 'Jalan Poros Kafilah: Desa Utama - Oase - Desa Gurun Solaria',
    width: 7.6,
    points: [
      [20, -60],        // Gerbang Barat Desa Utama
      [-40, -100],
      [-129.5, -149.5], // Pangkal Selatan Jembatan Gurun Solaria (tegak lurus sungai)
      [-110.5, -190.5], // Pangkal Utara Jembatan Gurun Solaria (tegak lurus sungai)
      [-220, -245],     // Mengitari sisi utara Sungai Gurun Barat (0% menyentuh air)
      [-310, -295],     // Jalur Kafilah Barat
      [-375, -312],     // Mengitari tepi kering timur laut Oase [-420, -350]
      [-428, -312],     // Utaranya Oase (0% menembus kolam air oase)
      [-482, -352],     // Mengitari tepi barat Oase menuju Bazaar
      [-540, -420],     // Alun-Alun Desa Gurun Solaria
    ],
  },

  // 6. POROS UTARA GURUN: Desa Gurun [-540, -420] -> Berhenti di Depan Gerbang Kota Kerajaan Gurun [-540, -434]
  {
    id: 'road_desert_north',
    name: 'Jalan Kafilah Pasir Emas: Desa Gurun - Gerbang Kota & Istana Sultan',
    width: 7.0,
    points: [
      [-540, -420], // Desa Gurun Solaria
      [-540, -428], // Sumbu Lurus Pendekatan dari Selatan
      [-540, -434], // Berhenti di Gerbang Plaza Kerajaan Gurun & Kolam Refleksi Istana Sultan
    ],
  },
];

export const ROAD_NETWORK = ROAD_SPLINES;

export function getDistanceToRoad(px: number, pz: number): number {
  let minDist = Infinity;
  for (const road of ROAD_SPLINES) {
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

export const getDistanceToNearestRoad = getDistanceToRoad;

export function isPointOnRoad(px: number, pz: number, margin = 2.0): boolean {
  return getDistanceToRoad(px, pz) <= margin;
}

export interface BridgeDef {
  id: string;
  name: string;
  nameId: string;
  x: number;
  z: number;
  y: number;
  rotationY: number;
  length: number;
  width: number;
  type: 'stone' | 'suspension' | 'wood';
}

export const BRIDGE_CONFIGS: BridgeDef[] = Object.values(WORLD_LAYOUT_CONFIG.bridges).map((b) => ({
  id: b.id,
  name: b.name,
  nameId: b.nameId,
  get x() { return WORLD_LAYOUT_CONFIG.bridges[b.id]?.x ?? b.x; },
  get y() { return WORLD_LAYOUT_CONFIG.bridges[b.id]?.y ?? b.y; },
  get z() { return WORLD_LAYOUT_CONFIG.bridges[b.id]?.z ?? b.z; },
  get rotationY() { return WORLD_LAYOUT_CONFIG.bridges[b.id]?.rotationY ?? b.rotationY; },
  get length() { return WORLD_LAYOUT_CONFIG.bridges[b.id]?.length ?? b.length; },
  get width() { return WORLD_LAYOUT_CONFIG.bridges[b.id]?.width ?? b.width; },
  type: b.type,
}));

/**
 * Memproyeksikan titik dunia (px, pz) ke koordinat lokal jembatan (lx searah bentang, lz searah lebar).
 * Mengingat rotasi Y Three.js memetakan lokal (+lx, +lz) -> (lx cos θ + lz sin θ, -lx sin θ + lz cos θ),
 * inversinya adalah: lx = dx cos θ - dz sin θ, lz = dx sin θ + dz cos θ.
 */
export function worldToBridgeLocal(
  px: number,
  pz: number,
  b: { x: number; z: number; rotationY: number }
): { lx: number; lz: number } {
  const dx = px - b.x;
  const dz = pz - b.z;
  const cos = Math.cos(b.rotationY);
  const sin = Math.sin(b.rotationY);
  return {
    lx: dx * cos - dz * sin,
    lz: dx * sin + dz * cos,
  };
}

export function isPointOnBridgeDeck(px: number, pz: number, margin = 0): boolean {
  for (const b of BRIDGE_CONFIGS) {
    const { lx, lz } = worldToBridgeLocal(px, pz, b);
    const halfLen = b.length * 0.50 + margin;
    const halfWid = b.width * 0.52 + margin;
    if (Math.abs(lx) <= halfLen && Math.abs(lz) <= halfWid) {
      return true;
    }
  }
  return false;
}

/**
 * 4. DAFTAR 14 WILAYAH & LANDMARK INTERAKTIF (WORLD_LANDMARKS)
 * Posisi Presisi 100% Mengikuti Denah Benua Baru
 */
export interface LandmarkDef {
  id: string;
  name: string;
  nameId: string;
  x: number;
  z: number;
  level: number;
  type:
  | 'lake'
  | 'capital'
  | 'canyon'
  | 'pyramid'
  | 'oasis'
  | 'boss'
  | 'palace'
  | 'forest'
  | 'ruins'
  | 'fortress'
  | 'valley'
  | 'village'
  | 'harbor'
  | 'tower';
  icon: string;
  color: string;
  description: string;
  descriptionId: string;
  isBoss?: boolean;
  isSafeZone?: boolean;
  waypointId?: string;
  labelPosition?: 'above' | 'below';
}

const RAW_WORLD_LANDMARKS: LandmarkDef[] = [
  {
    id: 'danau_titan',
    name: 'Ancient Titan Lake Valley',
    nameId: 'Lembah Danau Titan Kuno',
    x: 60,
    z: -820,
    level: 6,
    type: 'lake',
    icon: '🏔️',
    color: '#38bdf8',
    description: 'A crystalline glacial mountain lake surrounded by snow-capped peaks in the north-central ranges, headwaters of the Eldorian rivers.',
    descriptionId: 'Danau air tawar purba berair jernih di pegunungan es utara-tengah, hulu utama sungai benua Eldoria.',
    waypointId: 'wp_titan',
    labelPosition: 'above',
  },
  {
    id: 'canyon',
    name: 'Ancient Canyon',
    nameId: 'Kanyon Kuno',
    x: -380,
    z: -640,
    level: 8,
    type: 'canyon',
    icon: '🏜️',
    color: '#ea580c',
    description: 'Towering terracotta canyon cliffs and sandstone chasms in the northern reaches of the desert.',
    descriptionId: 'Tebing bebatuan cadas merah terjal bertingkat dan ngarai jurang sandstone di perbatasan utara gurun.',
    waypointId: 'wp_canyon',
    labelPosition: 'above',
  },
  {
    id: 'sultan_palace',
    name: 'Sultan Malik Grand Palace',
    nameId: 'Kota Gurun & Istana Sultan Malik',
    x: -540,
    z: -540,
    level: 8,
    type: 'palace',
    icon: '🕌',
    color: '#d97706',
    description: 'The vast golden desert kingdom and white marble domed palace of Sultan Malik with reflecting pools, silk bazaar, and exotic interiors.',
    descriptionId: 'Kota kerajaan padang pasir Solaria (~150x150 unit) lengkap dengan kolam refleksi air, bazar tenda sutra, rumah kubah, serta Istana Sultan Malik yang megah dan dapat dimasuki.',
    waypointId: 'wp_sultan_palace',
    labelPosition: 'above',
  },
  {
    id: 'pyramid',
    name: 'Solaria Golden Pyramid',
    nameId: 'Piramida Emas Solaria',
    x: -360,
    z: -520,
    level: 7,
    type: 'pyramid',
    icon: '🏛️',
    color: '#eab308',
    description: 'Twin ancient golden sandstone pyramids built by the Sun Pharaohs among rolling west dunes.',
    descriptionId: 'Dua monumen piramida emas kuno peninggalan peradaban matahari di bukit pasir gurun barat.',
    waypointId: 'wp_pyramid',
    labelPosition: 'below',
  },
  {
    id: 'kawah_boss',
    name: 'Ancient Titan Colosseum Arena',
    nameId: 'Arena Colosseum Titan Kuno (Lv. 10)',
    x: 180,
    z: -560,
    level: 10,
    type: 'boss',
    icon: '🗿',
    color: '#ea580c',
    description: 'A colossal ancient colosseum ruins arena in the rocky mountain plateau, domain of World Boss Titan Kuno.',
    descriptionId: 'Arena reruntuhan Colosseum Kuno megah berpagar tebing batu di dataran terbuka terisolasi, arena pertempuran World Boss Titan Kuno.',
    isBoss: true,
    waypointId: 'wp_boss_crater',
    labelPosition: 'below',
  },
  {
    id: 'oasis',
    name: 'Hidden Solaria Oasis',
    nameId: 'Oase Solaria',
    x: -420,
    z: -350,
    level: 5,
    type: 'oasis',
    icon: '🌴',
    color: '#14b8a6',
    description: 'A natural freshwater turquoise spring shaded by date palms providing sanctuary in the western desert.',
    descriptionId: 'Kolam mata air tawar pirus jernih dinaungi rumpun pohon palem kurma di tengah daratan gurun barat.',
    waypointId: 'wp_oasis',
    labelPosition: 'below',
  },
  {
    id: 'desert_village',
    name: 'Solaria Desert Village & Bazaar',
    nameId: 'Desa Gurun & Bazaar Solaria',
    x: -540,
    z: -420,
    level: 7,
    type: 'village',
    icon: '🏘️',
    color: '#f59e0b',
    description: 'The bustling mud-brick merchant crossroads and silk bazaar of Solaria in the western desert.',
    descriptionId: 'Pemukiman rumah tanah liat dan pasar kafilah sutra & rempah di tengah gurun barat.',
    isSafeZone: true,
    waypointId: 'wp_solaria_village',
    labelPosition: 'below',
  },
  {
    id: 'desert_sandworm',
    name: 'Solaria Whirlwind Crater',
    nameId: 'Kawah Pusaran Solaria (Jarrus)',
    x: -840,
    z: -260,
    level: 10,
    type: 'boss',
    icon: '🪱',
    color: '#ea580c',
    description: 'A vast sunken desert crater surrounded by high dunes and colossal ancient ribs in deep western Solaria, lair of World Boss Jarrus.',
    descriptionId: 'Cekungan kawah pasir raksasa berbukit pasir tinggi dan kerangka fosil raksasa di pedalaman gurun barat, sarang World Boss Jarrus Sang Cacing Purba.',
    isBoss: true,
    waypointId: 'wp_sandworm',
    labelPosition: 'above',
  },
  {
    id: 'astraea',
    name: 'Imperial Capital Astraea & Sun Palace',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    x: 575,
    z: -495,
    level: 5,
    type: 'capital',
    icon: '👑',
    color: '#fbbf24',
    description: 'The monumental 170x170 golden imperial city of Emperor Aurelius with Grand Plaza, medieval districts, market tavern, and twin-balcony Sun Palace.',
    descriptionId: 'Kota benteng medieval raksasa (~170x170 unit) dengan Alun-Alun Utama marmer, distrik pasar & tavern, serta Istana Kaisar 2x lebih megah lengkap dengan aula tahta & balkon Lantai 2.',
    isSafeZone: true,
    waypointId: 'wp_astraea',
    labelPosition: 'above',
  },
  {
    id: 'mage_tower',
    name: 'Thunderpeak Mage Tower',
    nameId: 'Mage Tower Puncak Halilintar',
    x: 270,
    z: -260,
    level: 4,
    type: 'tower',
    icon: '⚡',
    color: '#8b5cf6',
    description: 'Colossal arcane spire circled by a smooth ring plaza, outdoor spell training grounds, and a 4-floor multi-zone magical interior.',
    descriptionId: 'Menara penyihir raksasa di tengah bundaran Jalan Lingkar Sihir dengan area pelatihan sihir outdoor serta interior 4 zona bertingkat (Basement, Perpustakaan, Lab Latihan, & Observatorium).',
    waypointId: 'wp_thunderpeak',
    labelPosition: 'below',
  },
  {
    id: 'abandoned_castle',
    name: 'Abandoned Castle Ruins',
    nameId: 'Puing Kastil Terbengkalai',
    x: 580,
    z: -60,
    level: 4,
    type: 'ruins',
    icon: '🏰',
    color: '#64748b',
    description: 'Weathered fortress battlements, broken watchtowers, and collapsed slate pillars from an ancient war.',
    descriptionId: 'Reruntuhan tembok benteng masa lalu, menara patah berlumut, dan pilar batu roboh.',
    waypointId: 'wp_abandoned_castle',
    labelPosition: 'below',
  },
  {
    id: 'valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    x: 580,
    z: 130,
    level: 3,
    type: 'fortress',
    icon: '🛡️',
    color: '#3b82f6',
    description: 'A vast 110x110 fortified highland stronghold with 4 integrated corner watchtowers, barracks, combat yard, command hall, and forge interior.',
    descriptionId: 'Desa benteng megah seluas ~110x110 unit dengan 4 menara sudut menyatu tembok, barak prajurit, lapangan latihan, rumah warga, Aula Komandan, & Bengkel Tempa yang bisa dimasuki.',
    waypointId: 'wp_valkragor',
    labelPosition: 'below',
  },
  {
    id: 'mist_forest',
    name: 'Eldoria Mist Forest',
    nameId: 'Hutan Kabut Eldoria',
    x: 760,
    z: -280,
    level: 5,
    type: 'forest',
    icon: '🌲',
    color: '#15803d',
    description: 'Ancient dark spruce and oak wilderness draped in thick atmospheric low ground mist on the eastern cape.',
    descriptionId: 'Hutan pinus & oak raksasa lebat yang senantiasa diselimuti kabut misterius di semenanjung timur.',
    waypointId: 'wp_mist_forest',
    labelPosition: 'above',
  },
  {
    id: 'moss_valley',
    name: 'Moss Rock Valley',
    nameId: 'Lembah Batu Lumut',
    x: 580,
    z: -120,
    level: 5,
    type: 'valley',
    icon: '🪨',
    color: '#65a30d',
    description: 'A serene secluded valley enclosed by smooth green cliffs, home to giant ancient mossy megaliths.',
    descriptionId: 'Lembah hijau terisolasi di timur, dipagari tebing hijau halus, penuh batu megalit berlumut.',
    waypointId: 'wp_moss_valley',
    labelPosition: 'below',
  },
  {
    id: 'village',
    name: 'Sanctuary Village & Central Plains',
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    x: 20,
    z: -60,
    level: 1,
    type: 'village',
    icon: '🏡',
    color: '#65a30d',
    description: 'The peaceful starting settlement of adventurers on the lush southern plains with wooden houses and windmills.',
    descriptionId: 'Pemukiman sentral awal para petualang di padang rumput hijau Eldoria.',
    isSafeZone: true,
    waypointId: 'wp_village',
    labelPosition: 'above',
  },
  {
    id: 'harbor',
    name: 'Sanctuary Harbor',
    nameId: 'Pelabuhan Sanctuary',
    x: 20,
    z: 20,
    level: 1,
    type: 'harbor',
    icon: '⛵',
    color: '#06b6d4',
    description: 'The bustling coastal wooden boardwalk docks where merchant galleons arrive, facing the southern archipelago.',
    descriptionId: 'Dermaga kayu pelabuhan menjorok ke teluk pantai selatan, menghadap langsung ke Pulau Mercusuar dan Kaldera Naga.',
    waypointId: 'wp_harbor',
    labelPosition: 'below',
  },
  {
    id: 'caldera',
    name: 'Dragonfang Caldera Archipelago',
    nameId: 'Kepulauan Kaldera Naga (Lv. 12)',
    x: 40,
    z: 840,
    level: 12,
    type: 'boss',
    icon: '🐉',
    color: '#dc2626',
    description: 'A colossal volcanic archipelago across the south sea, lair of World Boss Ancient Dragon Ignis.',
    descriptionId: 'Gugusan 3 pulau vulkanik magma lahar merah di laut selatan jauh, sarang bertarung World Boss Ignis Sang Naga Purba.',
    isBoss: true,
    waypointId: 'wp_dragoncaldera',
    labelPosition: 'below',
  },
  {
    id: 'lighthouse_island',
    name: 'Sailor Reef & Lighthouse Island',
    nameId: 'Pulau Mercusuar & Karang Pelaut',
    x: -220,
    z: 460,
    level: 6,
    type: 'tower',
    icon: '🗼',
    color: '#38bdf8',
    description: 'A verdant hilly island with a beacon lighthouse guiding ships through the southern sea passages.',
    descriptionId: 'Pulau berbukit hijau dengan mercusuar pemandu pelayaran kapal dari Pelabuhan Sanctuary ke selatan.',
    waypointId: 'wp_lighthouse_island',
    labelPosition: 'below',
  },
  {
    id: 'pirate_island',
    name: 'Pirate Ruins Island',
    nameId: 'Pulau Reruntuhan Bajak Laut',
    x: -520,
    z: 620,
    level: 8,
    type: 'ruins',
    icon: '🏴‍☠️',
    color: '#f97316',
    description: 'A crescent-shaped island in the southwest ocean, featuring steep cliffs, shipwrecks, and a pirate encampment.',
    descriptionId: 'Pulau bulan sabit dengan tebing curam, bangkai kapal karam di teluk, dan perkemahan bajak laut.',
    waypointId: 'wp_pirate_island',
    labelPosition: 'below',
  },
  {
    id: 'rocky_reef_island',
    name: 'Craggy Reef Stacks',
    nameId: 'Pulau Karang Terjal',
    x: -780,
    z: 280,
    level: 7,
    type: 'ruins',
    icon: '🪨',
    color: '#94a3b8',
    description: 'Jagged rocky sea stacks and natural stone arches rising from the west ocean.',
    descriptionId: 'Gugusan pulau karang terjal dan gerbang batu alami di Samudra Barat.',
    waypointId: 'wp_rocky_reef',
    labelPosition: 'below',
  },
];

export const WORLD_LANDMARKS: LandmarkDef[] = RAW_WORLD_LANDMARKS.map((lm) => {
  const cfg = WORLD_LAYOUT_CONFIG.landmarks[lm.id];
  if (cfg) {
    return {
      ...lm,
      get x() { return WORLD_LAYOUT_CONFIG.landmarks[lm.id]?.x ?? lm.x; },
      get z() { return WORLD_LAYOUT_CONFIG.landmarks[lm.id]?.z ?? lm.z; },
    };
  }
  return lm;
});

export interface NaturalPondSite {
  id: string;
  x: number;
  z: number;
  radius: number;
  biome: 'plains' | 'desert';
  name: string;
}

export const NATURAL_POND_SITES: NaturalPondSite[] = [
  { id: 'pond_nw_meadow', x: -55, z: -295, radius: 13.5, biome: 'plains', name: 'Telaga Lembah Utara-Barat' },
  { id: 'pond_north_glade', x: 350, z: -365, radius: 12.5, biome: 'plains', name: 'Telaga Lembah Timur' },
  { id: 'pond_south_woods', x: 395, z: 48, radius: 14.0, biome: 'plains', name: 'Telaga Hutan Selatan' },
  { id: 'oasis_solaria_main', x: -420, z: -350, radius: 14.5, biome: 'desert', name: 'Oase Solaria Utama' },
  { id: 'oasis_dune_west', x: -665, z: -325, radius: 12.0, biome: 'desert', name: 'Oase Lembah Pasir Barat' },
  { id: 'oasis_dune_east', x: -295, z: -435, radius: 11.5, biome: 'desert', name: 'Oase Bukit Pasir Timur' },
];

function smoothstepBlend(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerpVal(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Kontur Perbukitan Alami Multi-Oktaf (Grassland & Forest: amplitudo +4 s.d. +16 unit)
 */
function sampleGrasslandFbm(x: number, z: number): { rolling: number; slow: number } {
  const wx = Math.sin(z * 0.008) * 28 + Math.cos(x * 0.011) * 16;
  const wz = Math.cos(x * 0.009) * 28 + Math.sin(z * 0.012) * 16;
  const sx = x + wx;
  const sz = z + wz;

  const hill1 = Math.sin(sx * 0.0075 + sz * 0.0055) * 0.5 + 0.5;
  const hill2 = Math.cos(sx * 0.014 - sz * 0.012) * 0.5 + 0.5;
  const slow = 2.25 + hill1 * 7.6 + hill2 * 4.0;

  const ridge = Math.sin(x * 0.025 + z * 0.021) * 2.2 + Math.cos(x * 0.044 - z * 0.037) * 1.05;
  const valleyDip = -Math.sin(x * 0.011 - z * 0.016) * 1.45;
  const rolling = Math.max(2.05, Math.min(18.5, slow + ridge + valleyDip));

  return { rolling, slow: Math.max(2.15, slow) };
}

/**
 * Kontur Bukit Pasir Gurun Solaria Memanjang (Sand Dunes: amplitudo +3 s.d. +12 unit)
 */
function sampleSandDunesFbm(x: number, z: number): { duneH: number; slowDuneH: number } {
  const u = x * 0.78 + z * 0.62 + Math.sin(z * 0.0085 - x * 0.004) * 32;
  const v = -x * 0.62 + z * 0.78;

  const primaryCrest = Math.pow(0.5 + 0.5 * Math.sin(u * 0.023 + Math.sin(v * 0.009) * 1.8), 1.35);
  const secondaryCrest = Math.pow(0.5 + 0.5 * Math.cos(u * 0.041 - v * 0.017), 1.2);
  const broadSwell = 0.5 + 0.5 * Math.sin(v * 0.012 + u * 0.007);

  const slowDuneH = 2.25 + primaryCrest * 6.9 + broadSwell * 2.3;
  const duneH = Math.max(2.05, Math.min(14.5, slowDuneH + secondaryCrest * 2.7));
  return { duneH, slowDuneH };
}

function blendLandmarkPlateau(
  currentH: number,
  x: number,
  z: number,
  cx: number,
  cz: number,
  innerR: number,
  skirtSpan: number,
  targetY: number
): number {
  const d = Math.hypot(x - cx, z - cz);
  if (d <= innerR) return targetY;
  if (d < innerR + skirtSpan) {
    const t = smoothstepBlend(innerR, innerR + skirtSpan, d);
    return lerpVal(targetY, currentH, t);
  }
  return currentH;
}

/**
 * 5. FUNGSI ELEVASI MEDAN 3D KONTINU (getProceduralContinentHeight)
 * Menghasilkan tinggi Y fisik terrain 3D untuk Three.js vertex deformation dan pergerakan karakter.
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  if (isFarOcean(x, z)) {
    return SEA_BED_HEIGHT;
  }
  const biome = getBiomeAt(x, z);
  const lm = WORLD_LAYOUT_CONFIG.landmarks;

  // B. Gugusan 3 Pulau Vulkanik Kaldera Naga di Laut Selatan Jauh [Pusat: 40, 840]
  if (biome === 'volcano') {
    // Tumpuan tebing ujung jembatan rantai SW & NW di lereng tebing barat kaldera -> satelit
    if (
      Math.hypot(x - (-112), z - 878) <= 7.0 ||
      Math.hypot(x - (-82), z - 868) <= 7.0 ||
      Math.hypot(x - (-102), z - 785) <= 7.0 ||
      Math.hypot(x - (-72), z - 795) <= 7.0
    ) {
      return 3.00;
    }

    const distSW = Math.hypot(x - (lm.caldera_sw_satellite?.x ?? -138), z - (lm.caldera_sw_satellite?.z ?? 892)) + Math.sin(x * 0.06 - z * 0.05) * 3.0;
    if (distSW <= 46) {
      if (distSW <= 18) return lm.caldera_sw_satellite?.y ?? 6.50;
      if (distSW <= 34) {
        const t = smoothstepBlend(18, 34, distSW);
        return lerpVal(lm.caldera_sw_satellite?.y ?? 6.50, 0.35, t);
      }
      const t = smoothstepBlend(34, 46, distSW);
      return lerpVal(0.35, -4.50, t);
    }

    const distNW = Math.hypot(x - (lm.caldera_nw_satellite?.x ?? -128), z - (lm.caldera_nw_satellite?.z ?? 772)) + Math.cos(x * 0.05 + z * 0.06) * 2.8;
    if (distNW <= 42) {
      if (distNW <= 16) return lm.caldera_nw_satellite?.y ?? 5.50;
      if (distNW <= 30) {
        const t = smoothstepBlend(16, 30, distNW);
        return lerpVal(lm.caldera_nw_satellite?.y ?? 5.50, 0.35, t);
      }
      const t = smoothstepBlend(30, 42, distNW);
      return lerpVal(0.35, -4.50, t);
    }

    const cx = lm.caldera?.x ?? 40;
    const cz = lm.caldera?.z ?? 840;
    const radialDist = Math.hypot(x - cx, z - cz);

    // Koridor Akses Utara dari Dermaga [40, 716] -> Kepala Jembatan Obsidian Agung [40, 749] -> Pulau Arena [40, 789]
    const inNorthApproachHeadland = Math.abs(x - cx) <= 13.5 && z >= 714 && z <= 753;
    if (inNorthApproachHeadland) {
      if (z >= 730) return 2.50;
      const shoreT = smoothstepBlend(716, 730, z);
      return lerpVal(0.50, 2.50, shoreT);
    }

    // 1. Pulau Utama Arena Kaldera Naga (Radius rata ~54 unit, elevasi datar Y = 2.50)
    if (radialDist <= 53.5) {
      return 2.50;
    }
    if (radialDist <= 56.5) {
      const cliffT = smoothstepBlend(53.5, 56.5, radialDist);
      return lerpVal(2.50, -2.20, cliffT);
    }

    // 2. Dasar Danau / Parit Lahar Lebar Mengelilingi Seluruh Pulau Arena (Radius 56.5 .. 88.0)
    if (radialDist <= 88.0) {
      return -2.20;
    }

    // 3. Dinding Tebing Kawah Vulkanik Tinggi Mengitari Danau Lahar (Radius 88 .. 142)
    const rimNoise = Math.sin(x * 0.055 + z * 0.045) * 4.0 + Math.cos(x * 0.09 - z * 0.08) * 2.2;
    const outerDist = radialDist + rimNoise;
    if (outerDist <= 116) {
      const ridgeT = Math.max(0, Math.min(1, (radialDist - 88) / 28));
      const ridgeH = 2.50 + Math.sin(ridgeT * Math.PI) * 16.5 + Math.sin((x + z) * 0.06) * 2.5;
      return Math.max(2.50, ridgeH);
    }
    if (outerDist <= 130) {
      const t = smoothstepBlend(116, 130, outerDist);
      return lerpVal(4.50, 0.35, t);
    }
    if (outerDist <= 146) {
      const t = smoothstepBlend(130, 146, outerDist);
      return lerpVal(0.35, -4.50, t);
    }
    return -4.50;
  }

  // B2. Kepulauan Perantara di Selatan & Barat
  // 1. Pulau Mercusuar & Karang Pelaut [-220, 460]
  const distLH = Math.hypot(x - (lm.lighthouse_island?.x ?? -220), z - (lm.lighthouse_island?.z ?? 460)) + Math.sin(x * 0.05 + z * 0.04) * 3.0;
  if (distLH <= 56) {
    if (distLH <= 18) return lm.lighthouse_island?.y ?? 6.20;
    if (x > -205) {
      const t = smoothstepBlend(18, 42, distLH);
      return lerpVal(lm.lighthouse_island?.y ?? 6.20, 0.50, t);
    }
    if (distLH <= 44) {
      const t = smoothstepBlend(18, 44, distLH);
      return lerpVal(lm.lighthouse_island?.y ?? 6.20, 0.35, t);
    }
    const tDown = smoothstepBlend(44, 56, distLH);
    return lerpVal(0.35, -4.50, tDown);
  }

  // 2. Pulau Reruntuhan Bajak Laut [-520, 620]
  const distPirate = Math.hypot(x - (lm.pirate_island?.x ?? -520), z - (lm.pirate_island?.z ?? 620)) + Math.cos(x * 0.04 - z * 0.05) * 4.0;
  if (distPirate <= 68) {
    const distCove = Math.hypot(x - ((lm.pirate_island?.x ?? -520) + 25), z - (lm.pirate_island?.z ?? 620));
    if (distCove <= 22) return 0.50;
    if (distPirate <= 26) return 11.5;
    if (distPirate <= 54) {
      const t = smoothstepBlend(26, 54, distPirate);
      return lerpVal(11.5, 0.35, t);
    }
    const tDown = smoothstepBlend(54, 68, distPirate);
    return lerpVal(0.35, -4.50, tDown);
  }

  // 3. Pulau Karang Terjal [-780, 280]
  const distReef = Math.hypot(x - (lm.rocky_reef_island?.x ?? -780), z - (lm.rocky_reef_island?.z ?? 280)) + Math.sin(x * 0.06) * 3.5;
  if (distReef <= 62) {
    const stackNoise = Math.sin(x * 0.12) * Math.cos(z * 0.12) * 4.5;
    const stackH = Math.max(0.40, 7.5 + stackNoise);
    if (distReef <= 28) return stackH;
    if (distReef <= 50) {
      const t = smoothstepBlend(28, 50, distReef);
      return lerpVal(stackH, 0.35, t);
    }
    const tDown = smoothstepBlend(50, 62, distReef);
    return lerpVal(0.35, -4.50, tDown);
  }

  // C. Samudra 360° Mengelilingi Benua Utama
  const dx = x - 0;
  const dz = z - (-320);
  const distCenter = Math.hypot(dx, dz);
  const angleCenter = Math.atan2(dz, dx);
  const coastR = getContinentCoastRadius(angleCenter, x, z);

  if (biome === 'ocean') {
    const edgeFromValOut = Math.hypot(x - 580, z - 130) - 155;
    const edgeFromRuinsOut = Math.hypot(x - 600, z - -50) - 150;
    const edgeFromAstraeaOut = Math.hypot(x - 575, z - -495) - 165;
    const edgeFromSultanOut = Math.hypot(x - -540, z - -505) - 145;
    const dCoast = Math.min(distCenter - coastR, edgeFromValOut, edgeFromRuinsOut, edgeFromAstraeaOut, edgeFromSultanOut);
    if (dCoast <= 18) {
      return lerpVal(0.05, -4.50, Math.max(0, dCoast) / 18); // Garis pantai pasir landai turun ke laut
    }
    return -4.50; // Kedalaman samudra terbuka
  }

  // D. Danau Air Tawar Titan Kuno [60, -820]
  if (biome === 'lake') {
    const distLake = Math.hypot(x - (lm.danau_titan?.x ?? 60), z - (lm.danau_titan?.z ?? -820));
    if (distLake <= 42) return lm.danau_titan?.y ?? -2.50;
    const t = smoothstepBlend(42, 60, distLake);
    return lerpVal(lm.danau_titan?.y ?? -2.50, 2.20, t);
  }

  const grassSample = sampleGrasslandFbm(x, z);
  const duneSample = sampleSandDunesFbm(x, z);
  const basePlainsHeight = grassSample.rolling;
  const smoothRoadPlainsH = grassSample.slow;

  // Hitung elevasi daratan murni (termasuk landmark & jalan) sebelum dipotong tepi pantai & palung sungai halus
  const applySettlementAndRoadHeight = (rawFieldH: number, rawSlowFieldH: number): number => {
    let fieldH = rawFieldH;
    let slowFieldH = rawSlowFieldH;

    const applyPlateau = (cx: number, cz: number, innerR: number, skirtSpan: number, targetY: number) => {
      fieldH = blendLandmarkPlateau(fieldH, x, z, cx, cz, innerR, skirtSpan, targetY);
      slowFieldH = blendLandmarkPlateau(slowFieldH, x, z, cx, cz, innerR, skirtSpan, targetY);
    };

    if (biome === 'desert') {
      const canyonX = lm.canyon?.x ?? -380;
      const canyonZ = lm.canyon?.z ?? -640;
      const distCanyon = Math.hypot(x - canyonX, z - canyonZ);
      if (distCanyon <= 90) {
        const canyonNoise = Math.sin(x * 0.04) * Math.cos(z * 0.035) * 3.5;
        const mesaHeight = Math.max(3.5, Math.min(12.0, (lm.canyon?.y ?? 3.5) + canyonNoise));
        const flatR = lm.canyon?.flattenRadius ?? 50;
        if (distCanyon <= flatR) {
          fieldH = mesaHeight;
        } else {
          fieldH = lerpVal(mesaHeight, fieldH, smoothstepBlend(flatR, 90, distCanyon));
        }
      }

      applyPlateau(lm.sultan_palace?.x ?? -540, lm.sultan_palace?.z ?? -540, lm.sultan_palace?.flattenRadius ?? 42, 24, lm.sultan_palace?.y ?? 2.00);
      applyPlateau(lm.pyramid?.x ?? -360, lm.pyramid?.z ?? -520, lm.pyramid?.flattenRadius ?? 35, 22, lm.pyramid?.y ?? 1.50);
      applyPlateau(lm.desert_village?.x ?? -540, lm.desert_village?.z ?? -420, lm.desert_village?.flattenRadius ?? 38, 22, lm.desert_village?.y ?? 1.80);

      // Oase Solaria & Oase Bukit Pasir cekung lembut
      for (const pond of NATURAL_POND_SITES) {
        if (pond.biome !== 'desert') continue;
        const dP = Math.hypot(x - pond.x, z - pond.z);
        if (dP < pond.radius * 1.45) {
          if (pond.id === 'oasis_solaria_main') {
            if (dP < 12.5) fieldH = 0.65;
            else if (dP < 24) fieldH = lerpVal(0.65, 2.20, smoothstepBlend(12.5, 24, dP));
            else fieldH = lerpVal(2.20, fieldH, smoothstepBlend(24, 34, dP));
          } else {
            const innerP = pond.radius * 0.62;
            const outerP = pond.radius * 1.45;
            if (dP <= innerP) fieldH = -0.82;
            else fieldH = lerpVal(-0.82, fieldH, smoothstepBlend(innerP, outerP, dP));
          }
        }
      }

      // Kawah Pusaran Sandworm Jarrus
      const sandwormX = lm.desert_sandworm?.x ?? -840;
      const sandwormZ = lm.desert_sandworm?.z ?? -260;
      const sandwormFloorRadius = lm.desert_sandworm?.flattenRadius ?? 55;
      const sandwormFloorY = lm.desert_sandworm?.y ?? 0.50;
      const distSandworm = Math.hypot(x - sandwormX, z - sandwormZ);
      if (distSandworm <= sandwormFloorRadius) {
        return sandwormFloorY;
      }
      if (distSandworm <= 98) {
        const angDune = Math.atan2(z - sandwormZ, x - sandwormX);
        const rimCrest = 7.4 + Math.sin(angDune * 5.0) * 0.85;
        if (distSandworm <= 72) {
          return lerpVal(sandwormFloorY, rimCrest, smoothstepBlend(sandwormFloorRadius, 72, distSandworm));
        }
        return lerpVal(rimCrest, fieldH, smoothstepBlend(72, 98, distSandworm));
      }
    } else {
      // Padang Rumput & Lembah Timur/Tengah
      applyPlateau(lm.village?.x ?? 20, lm.village?.z ?? -60, lm.village?.flattenRadius ?? 44, 28, Math.max(2.10, lm.village?.y ?? 2.10));

      // Area pekarangan bertani SW Desa Utama (-66..-20, -48..-10) datar rapi agar pagar tidak miring
      if (x >= -72 && x <= -16 && z >= -52 && z <= -6) {
        const farmPadX = Math.max(0, Math.abs(x - -44) - 24);
        const farmPadZ = Math.max(0, Math.abs(z - -29) - 18);
        const farmDist = Math.hypot(farmPadX, farmPadZ);
        if (farmDist <= 0.1) {
          fieldH = 2.10;
          slowFieldH = 2.10;
        } else if (farmDist < 12) {
          const ft = smoothstepBlend(0, 12, farmDist);
          fieldH = lerpVal(2.10, fieldH, ft);
          slowFieldH = lerpVal(2.10, slowFieldH, ft);
        }
      }

      // Pelabuhan Sanctuary Cove [20, 20]
      applyPlateau(lm.harbor?.x ?? 20, lm.harbor?.z ?? 20, lm.harbor?.flattenRadius ?? 10, 18, lm.harbor?.y ?? 0.25);

      // Ibukota Kerajaan Emas Astraea [575, -495] (terletak di plato tinggi 3.20 berskirt halus)
      applyPlateau(lm.astraea?.x ?? 575, lm.astraea?.z ?? -495, lm.astraea?.flattenRadius ?? 122, 38, lm.astraea?.y ?? 3.20);

      // Arena Colosseum Reruntuhan Boss Titan Kuno [180, -560]
      const titanX = lm.bossGolem?.x ?? lm.kawah_boss?.x ?? 180;
      const titanZ = lm.bossGolem?.z ?? lm.kawah_boss?.z ?? -560;
      const titanR = lm.bossGolem?.flattenRadius ?? lm.kawah_boss?.flattenRadius ?? 68;
      applyPlateau(titanX, titanZ, titanR, 34, 4.50);

      // Benteng Val-Kragor [580, 130]
      applyPlateau(lm.valkragor?.x ?? 580, lm.valkragor?.z ?? 130, lm.valkragor?.flattenRadius ?? 86, 32, Math.max(3.80, lm.valkragor?.y ?? 3.80));

      // Puing Kastil Terbengkalai [580, -60]
      applyPlateau(lm.abandoned_castle?.x ?? 580, lm.abandoned_castle?.z ?? -60, lm.abandoned_castle?.flattenRadius ?? 36, 22, Math.max(2.40, lm.abandoned_castle?.y ?? 2.40));

      // Mage Tower Puncak Halilintar [270, -260] (di puncak bukit halus)
      applyPlateau(lm.mage_tower?.x ?? 270, lm.mage_tower?.z ?? -260, lm.mage_tower?.flattenRadius ?? 42, 30, lm.mage_tower?.y ?? 5.50);

      // Lembah Batu Lumut [580, -120]
      applyPlateau(lm.moss_valley?.x ?? 580, lm.moss_valley?.z ?? -120, lm.moss_valley?.flattenRadius ?? 50, 24, Math.max(3.60, lm.moss_valley?.y ?? 3.60));

      // Hutan Kabut Eldoria [760, -280]
      const distMist = Math.hypot(x - (lm.mist_forest?.x ?? 760), z - (lm.mist_forest?.z ?? -280));
      if (distMist <= 75) {
        const mistHill = 3.2 + Math.sin(x * 0.032 + z * 0.028) * 2.4;
        fieldH = lerpVal(mistHill, fieldH, smoothstepBlend(40, 75, distMist));
      }

      // Telaga alami di cekungan lembah padang rumput
      for (const pond of NATURAL_POND_SITES) {
        if (pond.biome !== 'plains') continue;
        const dP = Math.hypot(x - pond.x, z - pond.z);
        const outerP = pond.radius * 1.45;
        if (dP < outerP) {
          const innerP = pond.radius * 0.62;
          if (dP <= innerP) {
            fieldH = -0.82;
          } else {
            fieldH = lerpVal(-0.82, fieldH, smoothstepBlend(innerP, outerP, dP));
          }
        }
      }
    }

    // Perataan Koridor Jalan Raya mengikuti lekuk bukit lembut (0% parit dalam / gundukan patah)
    const distRoad = getDistanceToRoad(x, z);
    if (distRoad < 10.5) {
      let roadGrade = slowFieldH;
      if (z > -20 && Math.abs(x - 20) < 18) {
        const harborT = smoothstepBlend(-18, 16, z);
        roadGrade = lerpVal(2.10, 0.30, harborT);
      }
      const roadBlend = smoothstepBlend(3.8, 10.5, distRoad);
      fieldH = lerpVal(roadGrade, fieldH, roadBlend);
    }

    return fieldH;
  };

  let rawLandH = biome === 'desert' ? duneSample.duneH : basePlainsHeight;
  let rawSlowH = biome === 'desert' ? duneSample.slowDuneH : smoothRoadPlainsH;
  let landH = applySettlementAndRoadHeight(rawLandH, rawSlowH);

  // E. Pegunungan Salju Utara Domain-Warped (Bebas Kotak & Jauh Utara dari Colosseum Titan)
  const snowMask = getSnowWeight(x, z);
  if (snowMask > 0.001) {
    const distLake = Math.hypot(x - (lm.danau_titan?.x ?? 60), z - (lm.danau_titan?.z ?? -820));
    const peakSum =
      52 * Math.exp(-((x - -145) * (x - -145) + (z - -865) * (z - -865)) / (2 * 64 * 64)) +
      62 * Math.exp(-((x - -90) * (x - -90) + (z - -955) * (z - -955)) / (2 * 70 * 70)) +
      68 * Math.exp(-((x - 45) * (x - 45) + (z - -995) * (z - -995)) / (2 * 78 * 78)) +
      60 * Math.exp(-((x - 155) * (x - 155) + (z - -945) * (z - -945)) / (2 * 68 * 68)) +
      52 * Math.exp(-((x - 210) * (x - 210) + (z - -855) * (z - -855)) / (2 * 62 * 62)) +
      36 * Math.exp(-((x - -150) * (x - -150) + (z - -775) * (z - -775)) / (2 * 54 * 54)) +
      34 * Math.exp(-((x - 185) * (x - 185) + (z - -770) * (z - -770)) / (2 * 52 * 52));

    const ridged1 = (1.0 - Math.abs(Math.sin(x * 0.020 + z * 0.015))) * 10.5;
    const ridged2 = (1.0 - Math.abs(Math.cos(x * 0.036 - z * 0.030))) * 6.5;
    const microDetail = Math.sin((x + z) * 0.055) * 2.2;
    const targetPeakH = Math.max(8.0, Math.min(72.0, peakSum + ridged1 + ridged2 + microDetail));

    let mountainTargetH = targetPeakH;
    if (distLake < 118) {
      const lakeValleyT = smoothstepBlend(58, 118, distLake);
      mountainTargetH = lerpVal(2.35, targetPeakH, lakeValleyT);
    }
    const distTitanArena = Math.hypot(x - (lm.bossGolem?.x ?? 180), z - (lm.bossGolem?.z ?? -560));
    if (distTitanArena < 128) {
      mountainTargetH = lerpVal(4.50, mountainTargetH, smoothstepBlend(68, 128, distTitanArena));
    }

    landH = lerpVal(landH, mountainTargetH, snowMask);
  }

  // Pita pantai tipis di pinggir garis pantai benua (inCoast 0..16 unit dari garis laut)
  const edgeInVal = 155 - Math.hypot(x - 580, z - 130);
  const edgeInRuins = 150 - Math.hypot(x - 600, z - -50);
  const edgeInAst = 165 - Math.hypot(x - 575, z - -495);
  const edgeInSlt = 145 - Math.hypot(x - -540, z - -505);
  const inCoast = Math.max(coastR - distCenter, edgeInVal, edgeInRuins, edgeInAst, edgeInSlt);
  if (inCoast < 16) {
    const tBeach = smoothstepBlend(0, 16, Math.max(0, inCoast));
    landH = lerpVal(0.05, landH, tBeach);
  }

  // A. Palung Sungai Halus & Area Bawah Jembatan (smoothstep bank falloff tanpa gigi gergaji)
  const distRiver = getDistanceToRiver(x, z);

  for (const b of BRIDGE_CONFIGS) {
    const distB = Math.hypot(x - b.x, z - b.z);
    if (distB < b.length * 0.65 + 16.0) {
      const { lx, lz } = worldToBridgeLocal(x, z, b);

      // Area tepat di bawah dek jembatan: palung sungai / selat dalam Y = -2.50
      if (Math.abs(lx) <= b.length * 0.42 && Math.abs(lz) <= b.width * 0.78) {
        return -2.50;
      }
      // Zona tepi pendekatan pangkal & ramp jembatan: landai mulus dari bukit menuju dek
      if (Math.abs(lz) <= b.width * 1.15 && Math.abs(lx) > b.length * 0.42) {
        const approachT = smoothstepBlend(b.length * 0.65 + 16.0, b.length * 0.44, distB);
        return lerpVal(landH, Math.max(2.00, b.y - 0.10), approachT);
      }
      if (distRiver < 11.5) {
        const tBank = smoothstepBlend(2.8, 11.5, distRiver);
        return lerpVal(-2.50, Math.max(2.00, b.y - 0.10), tBank);
      }
      return lerpVal(landH, Math.max(2.00, b.y - 0.10), smoothstepBlend(b.length * 0.65 + 16.0, b.length * 0.50, distB));
    }
  }

  // Palung Sungai Reguler: smoothstep bank falloff dari -2.40 ke elevasi daratan landH (0% cliff atau zig-zag)
  if (distRiver < 11.5) {
    const tBank = smoothstepBlend(2.8, 11.5, distRiver);
    return lerpVal(-2.40, landH, tBank);
  }

  return landH;
}

/**
 * 6. PROYEKSI KOORDINAT PERSENTASE PETA (worldToMapPercent & mapPercentToWorld)
 */
export function worldToMapPercent(x: number, z: number): {
  xPercent: number;
  yPercent: number;
  left: string;
  top: string;
} {
  const normX = (x - WORLD_BOUNDS.minX) / WORLD_WIDTH;
  const normZ = (z - WORLD_BOUNDS.minZ) / WORLD_HEIGHT;
  const pctX = Math.max(0, Math.min(100, normX * 100));
  const pctY = Math.max(0, Math.min(100, normZ * 100));
  return {
    xPercent: pctX,
    yPercent: pctY,
    left: `${pctX.toFixed(2)}%`,
    top: `${pctY.toFixed(2)}%`,
  };
}

export function mapPercentToWorld(pctX: number, pctY: number): { x: number; z: number } {
  const normX = pctX / 100;
  const normZ = pctY / 100;
  const x = WORLD_BOUNDS.minX + normX * WORLD_WIDTH;
  const z = WORLD_BOUNDS.minZ + normZ * WORLD_HEIGHT;
  return { x, z };
}
