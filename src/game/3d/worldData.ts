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
  // 1. Fast check for main continent (center [0, -320], max radius 800)
  const cdx = x;
  const cdz = z - (-320);
  if (cdx * cdx + cdz * cdz <= 640000) {
    return false;
  }

  // 2. Dragon Caldera Archipelago [40, 840] (radius 165)
  const ddx = x - 40;
  const ddz = z - 840;
  if (ddx * ddx + ddz * ddz <= 27225) {
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

export function getContinentCoastRadius(angle: number, x: number, z: number): number {
  let r = 450;

  // 1. Barat Laut: Semenanjung Gurun Melengkung Menjorok ke Laut (angle ~ -2.4 s.d. -2.7)
  const nwPeninsula = Math.exp(-Math.pow((angle - (-2.55)) / 0.42, 2)) * 210;

  // 2. Barat Daya: Teluk Melengkung Dalam (angle ~ 2.30 s.d. 2.45)
  const swBay = Math.exp(-Math.pow((angle - 2.35) / 0.38, 2)) * -145;

  // 3. Selatan: Teluk Terlindung Pelabuhan Sanctuary (angle ~ 1.55)
  const sHarbor = Math.exp(-Math.pow((angle - 1.55) / 0.28, 2)) * 35;

  // 4. Tenggara: Semenanjung Benteng Val-Kragor (angle ~ 0.58)
  const sePeninsula = Math.exp(-Math.pow((angle - 0.58) / 0.36, 2)) * 195;

  // 5. Timur: Tanjung Hutan Kabut (angle ~ -0.05)
  const eastCape = Math.exp(-Math.pow(angle / 0.30, 2)) * 250;

  // 6. Timur Laut: Semenanjung Runcing Menjorok ke Laut (angle ~ -0.78)
  const nePeninsula = Math.exp(-Math.pow((angle - (-0.78)) / 0.32, 2)) * 190;

  // 7. Utara: Pesisir Pegunungan Titan & Kanyon (angle ~ -1.57)
  const northHills = Math.exp(-Math.pow((angle - (-1.57)) / 0.40, 2)) * 140;

  r += nwPeninsula + swBay + sHarbor + sePeninsula + eastCape + nePeninsula + northHills;

  // Domain-Warped Multi-Octave FBM Noise
  const warpX = Math.sin(x * 0.007 + z * 0.005) * 32 + Math.cos(z * 0.014) * 16;
  const warpZ = Math.cos(x * 0.006 - z * 0.008) * 32 + Math.sin(x * 0.012) * 16;
  const fbm1 = Math.sin((x + warpX) * 0.016 + (z + warpZ) * 0.012) * 26;
  const fbm2 = Math.cos((x - warpX) * 0.032 - (z + warpZ) * 0.028) * 14;
  const fbm3 = Math.sin(x * 0.065 + z * 0.065) * 6;

  return r + fbm1 + fbm2 + fbm3;
}

/**
 * Pemeriksaan apakah titik (x, z) berada di dalam daratan Benua Utama Eldoria.
 */
export function isMainContinentLand(x: number, z: number): boolean {
  const dx = x;
  const dz = z - (-320);
  const distSq = dx * dx + dz * dz;
  if (distSq > 577600) return false; // > 760 units: definitely ocean
  if (distSq < 90000) return true;   // < 300 units: definitely continent core
  const dist = Math.sqrt(distSq);
  const angle = Math.atan2(dz, dx);
  const coastR = getContinentCoastRadius(angle, x, z);
  return dist < coastR;
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
  const distDragonSW = Math.hypot(x - -75, z - 875);
  const distDragonNW = Math.hypot(x - -65, z - 775);
  if (distDragonMain < 115 || distDragonSW < 55 || distDragonNW < 50) {
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

  // D. Danau Air Tawar Titan Kuno di Bagian Utara-Tengah [80, -760]
  if (Math.hypot(x - 80, z - -760) < 55) {
    return 'lake';
  }

  // E. Pegunungan Salju Utara di Sekitar Danau Titan
  if (x > -30 && x < 240 && z < -670) {
    return 'snow';
  }

  // F. Bioma Gurun Emas Solaria di Sisi Barat (Kiri) Benua Utama (X: -650 s.d. -140, Z: -780 s.d. -120)
  // Dengan batas organik sinusoidal yang memisahkan daratan pasir dan rumput hijau
  const desertBoundaryX = -130 + Math.sin(z * 0.014) * 35 + Math.cos(z * 0.03) * 15;
  if (x < desertBoundaryX && z < -110 && z > -820) {
    return 'desert';
  }

  // G. Padang Rumput Hijau Eldoria (Sisi Tengah, Timur, dan Selatan Benua)
  return 'grassland';
}

/**
 * 2. SISTEM 4 CABANG SUNGAI BERKELOK (RIVER_SPLINES)
 * Hulu dari Danau Titan Kuno [80, -760] mengalir ke Selatan melewati tengah benua menuju Pelabuhan Sanctuary [40, 85].
 */
export interface RiverSplineDef {
  id: string;
  name: string;
  points: [number, number][];
}

export const RIVER_NW_BRANCH: [number, number][] = [
  [80, -760],   // Outlet Danau Titan Kuno
  [75, -670],
  [70, -570],
  [60, -470],
  [55, -370],
  [50, -270],
  [45, -180],
  [40, -110],   // Titik Temu Tengah (Confluence)
];

export const RIVER_DESERT_BRANCH: [number, number][] = [
  [40, -110],   // Titik Temu Tengah
  [-25, -140],
  [-95, -160],  // Lokasi Jembatan 1 Penyeberangan Gurun Solaria
  [-170, -210],
  [-250, -270],
  [-320, -320], // Selatan Oase Solaria [-340, -340]
];

export const RIVER_EAST_BRANCH: [number, number][] = [
  [40, -110],   // Titik Temu Tengah
  [100, -145],
  [160, -175],  // Lokasi Jembatan 3 Astraea East
  [240, -200],  // Mengalir di selatan Ibukota Astraea [320, -260]
  [330, -210],
  [440, -220],
  [520, -240],  // Hulu Lembah Hijau Timur
];

export const RIVER_SOUTH_BRANCH: [number, number][] = [
  [40, -110],   // Titik Temu Tengah
  [25, -70],
  [15, -20],    // Barat Desa Utama [40, -40]
  [18, 25],
  [22, 35],     // Lokasi Jembatan 2 Muara Pelabuhan
  [30, 65],
  [38, 95],     // Muara Teluk Samudra Pelabuhan Sanctuary [40, 85]
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
  // Perairan Danau Titan Kuno [80, -760]
  if (Math.hypot(x - 80, z - -760) < 58) return false;
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
  // 1. POROS SELATAN: Desa Utama [40, -40] -> Pelabuhan Sanctuary [40, 85]
  {
    id: 'road_village_harbor',
    name: 'Jalan Poros Selatan: Desa - Pelabuhan',
    width: 3.4,
    points: [
      [40, -40],   // Alun-Alun Air Mancur Desa Utama
      [40, -10],
      [40, 25],
      [40, 55],
      [40, 75],    // Menuju Pelataran Dermaga Pelabuhan
    ],
  },

  // 2. POROS TIMUR: Desa Utama [40, -40] -> Mage Tower [220, -110] -> Ibukota Astraea [320, -260]
  {
    id: 'road_village_astraea',
    name: 'Jalan Poros Timur: Desa - Mage Tower - Astraea',
    width: 3.4,
    points: [
      [40, -40],   // Gerbang Timur Desa Utama
      [90, -60],
      [150, -85],
      [220, -110], // Alun-Alun Mage Tower Puncak Halilintar
      [270, -180],
      [320, -210], // Gerbang Selatan Ibukota Astraea
    ],
  },

  // 3. POROS UTARA: Ibukota Astraea [320, -260] -> Danau Titan [80, -760]
  {
    id: 'road_astraea_titan',
    name: 'Jalan Ziarah Pegunungan Salju: Astraea - Danau Titan',
    width: 3.2,
    points: [
      [320, -260], // Gerbang Barat Laut Astraea
      [280, -350],
      [220, -460],
      [170, -570],
      [120, -670],
      [80, -710],  // Menuju Tepi Danau Titan Kuno
    ],
  },

  // 4. POROS TENGGARA: Mage Tower [220, -110] -> Puing Kastil [420, -140] -> Benteng Val-Kragor [520, 10]
  {
    id: 'road_mage_valkragor',
    name: 'Jalan Poros Tenggara: Mage Tower - Puing Kastil - Val-Kragor',
    width: 3.0,
    points: [
      [220, -110], // Simpang Mage Tower
      [320, -125],
      [420, -140], // Gerbang Puing Kastil Terbengkalai
      [440, -60],  // Menyeberang Jembatan Benteng Val-Kragor
      [480, -20],
      [520, 10],   // Gerbang Benteng Val-Kragor
    ],
  },

  // 4B. CABANG HUTAN KABUT: Puing Kastil [420, -140] -> Hutan Kabut & Lembah Lumut [640, -340]
  {
    id: 'road_puing_mist_forest',
    name: 'Jalan Setapak Puing Kastil - Hutan Kabut',
    width: 2.8,
    points: [
      [420, -140], // Puing Kastil
      [500, -200],
      [570, -270],
      [640, -340], // Glade Hutan Kabut Eldoria
    ],
  },

  // 5. POROS BARAT: Desa Utama [40, -40] -> Jembatan 1 [-95, -160] -> Oase [-340, -340] -> Desa Gurun [-460, -260]
  {
    id: 'road_plains_desert',
    name: 'Jalan Poros Kafilah: Desa Utama - Oase - Desa Gurun Solaria',
    width: 3.6,
    points: [
      [40, -40],   // Gerbang Barat Desa Utama
      [0, -70],
      [-50, -115],
      [-95, -160], // Menyeberang Jembatan Gurun Solaria
      [-160, -210],
      [-240, -270],
      [-340, -340], // Oase Solaria
      [-400, -300],
      [-460, -260], // Bazaar Desa Gurun Solaria
    ],
  },

  // 6. CABANG ARENA BOSS: Oase [-340, -340] -> Kawah Boss Titan [-480, -480] (Berhenti DI LUAR Gerbang)
  {
    id: 'road_desert_boss',
    name: 'Jalan Akses Kawah Colosseum Boss',
    width: 3.0,
    points: [
      [-340, -340], // Oase
      [-410, -400],
      [-480, -445], // Berhenti tepat di luar Gerbang Kawah Boss (Buffer Zone Aman)
    ],
  },

  // 7. POROS UTARA GURUN: Oase [-340, -340] -> Piramida [-320, -560] -> Istana Sultan [-540, -640] -> Kanyon [-260, -780]
  {
    id: 'road_desert_north',
    name: 'Jalan Kafilah Pasir Emas: Piramida - Istana Sultan - Kanyon',
    width: 3.4,
    points: [
      [-340, -340], // Oase
      [-330, -450],
      [-320, -560], // Piramida Emas Solaria
      [-430, -600],
      [-540, -640], // Gerbang Utama Istana Sultan Malik
      [-400, -720],
      [-260, -780], // Kanyon Kuno
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

export function isPointOnBridgeDeck(px: number, pz: number, margin = 0): boolean {
  for (const b of BRIDGE_CONFIGS) {
    const dx = px - b.x;
    const dz = pz - b.z;
    const cos = Math.cos(-b.rotationY);
    const sin = Math.sin(-b.rotationY);
    const lx = cos * dx - sin * dz;
    const lz = sin * dx + cos * dz;
    const halfLen = b.length * 0.44 + margin;
    const halfWid = b.width * 0.55 + margin;
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
    x: 80,
    z: -760,
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
    x: -260,
    z: -780,
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
    nameId: 'Istana Sultan Malik',
    x: -540,
    z: -640,
    level: 8,
    type: 'palace',
    icon: '🕌',
    color: '#d97706',
    description: 'The opulent white marble and golden domed desert palace of Sultan Malik al-Solaria in the west dunes.',
    descriptionId: 'Kompleks istana megah kubah marmer emas penguasa Gurun Pasir Solaria di barat benua.',
    waypointId: 'wp_sultan_palace',
    labelPosition: 'below',
  },
  {
    id: 'pyramid',
    name: 'Solaria Golden Pyramid',
    nameId: 'Piramida Emas Solaria',
    x: -320,
    z: -560,
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
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    x: -480,
    z: -480,
    level: 10,
    type: 'boss',
    icon: '🗿',
    color: '#ea580c',
    description: 'A colossal ancient colosseum ruins arena in the dry crater, domain of World Boss Titan Kuno.',
    descriptionId: 'Arena reruntuhan Colosseum Kuno megah berpagar tebing batu di kawah kering gurun barat, arena pertempuran World Boss Titan Kuno.',
    isBoss: true,
    waypointId: 'wp_boss_crater',
    labelPosition: 'below',
  },
  {
    id: 'oasis',
    name: 'Hidden Solaria Oasis',
    nameId: 'Oase Solaria',
    x: -340,
    z: -340,
    level: 5,
    type: 'oasis',
    icon: '🌴',
    color: '#14b8a6',
    description: 'A natural freshwater turquoise spring shaded by date palms providing sanctuary in the western desert.',
    descriptionId: 'Kolam mata air tawar pirus jernih dinaungi rumpun pohon palem kurma di tengah gurun barat.',
    waypointId: 'wp_oasis',
    labelPosition: 'below',
  },
  {
    id: 'desert_village',
    name: 'Solaria Desert Village & Bazaar',
    nameId: 'Desa Gurun & Bazaar Solaria',
    x: -460,
    z: -260,
    level: 7,
    type: 'village',
    icon: '🏘️',
    color: '#f59e0b',
    description: 'The bustling mud-brick merchant crossroads and silk bazaar of Solaria in the western desert.',
    descriptionId: 'Pemukiman rumah tanah liat dan pasar kafilah sutra & rempah di selatan gurun barat.',
    isSafeZone: true,
    waypointId: 'wp_solaria_village',
    labelPosition: 'below',
  },
  {
    id: 'desert_sandworm',
    name: 'Ancient Sandworm Lair',
    nameId: 'Sarang Sandworm Gurun',
    x: -420,
    z: -420,
    level: 9,
    type: 'boss',
    icon: '🪱',
    color: '#ea580c',
    description: 'Wide open sandy wilderness where the colossal Sandworm burrows freely.',
    descriptionId: 'Gurun pasir terbuka di barat daya tanpa halangan, sarang perburuan Cacing Raksasa Gurun.',
    isBoss: true,
    waypointId: 'wp_sandworm',
    labelPosition: 'below',
  },
  {
    id: 'astraea',
    name: 'Imperial Capital Astraea & Sun Palace',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    x: 320,
    z: -260,
    level: 5,
    type: 'capital',
    icon: '👑',
    color: '#fbbf24',
    description: 'The monumental golden capital of Emperor Aurelius with grand stone walls, white marble arcades, and imperial guards.',
    descriptionId: 'Kompleks benteng kastil megah berpilar emas putih dan tahta Kaisar Aurelius di daratan hijau timur-tengah.',
    isSafeZone: true,
    waypointId: 'wp_astraea',
    labelPosition: 'below',
  },
  {
    id: 'mage_tower',
    name: 'Thunderpeak Mage Tower',
    nameId: 'Mage Tower Puncak Halilintar',
    x: 220,
    z: -110,
    level: 4,
    type: 'tower',
    icon: '⚡',
    color: '#8b5cf6',
    description: 'A grand magical arcane spire on a grassy hill, center of arcane learning and teleportation.',
    descriptionId: 'Menara penyihir megah di perbukitan timur-tengah, pusat studi sihir dan teleportasi.',
    waypointId: 'wp_thunderpeak',
    labelPosition: 'below',
  },
  {
    id: 'abandoned_castle',
    name: 'Abandoned Castle Ruins',
    nameId: 'Puing Kastil Terbengkalai',
    x: 420,
    z: -140,
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
    x: 520,
    z: 10,
    level: 3,
    type: 'fortress',
    icon: '🛡️',
    color: '#3b82f6',
    description: 'A fortified highland village with wooden palisades, corner watchtowers, blacksmith, and red-roofed cottages.',
    descriptionId: 'Desa berpagar benteng kayu runcing & tembok batu slate di semenanjung tenggara.',
    waypointId: 'wp_valkragor',
    labelPosition: 'below',
  },
  {
    id: 'mist_forest',
    name: 'Eldoria Mist Forest',
    nameId: 'Hutan Kabut Eldoria',
    x: 640,
    z: -340,
    level: 5,
    type: 'forest',
    icon: '🌲',
    color: '#15803d',
    description: 'Ancient dark spruce and oak wilderness draped in thick atmospheric low ground mist on the eastern cape.',
    descriptionId: 'Hutan pinus & oak raksasa lebat yang senantiasa diselimuti kabut misterius di semenanjung timur.',
    waypointId: 'wp_mist_forest',
    labelPosition: 'below',
  },
  {
    id: 'moss_valley',
    name: 'Moss Rock Valley',
    nameId: 'Lembah Batu Lumut',
    x: 600,
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
    x: 40,
    z: -40,
    level: 1,
    type: 'village',
    icon: '🏡',
    color: '#65a30d',
    description: 'The peaceful starting settlement of adventurers on the lush southern plains with wooden houses and windmills.',
    descriptionId: 'Pemukiman sentral awal para petualang di padang rumput hijau Eldoria.',
    isSafeZone: true,
    waypointId: 'wp_village',
    labelPosition: 'below',
  },
  {
    id: 'harbor',
    name: 'Sanctuary Harbor',
    nameId: 'Pelabuhan Sanctuary',
    x: 40,
    z: 85,
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

function smoothstepBlend(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerpVal(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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

  // A. Palung Sungai & Area Bawah Jembatan
  const distRiver = getDistanceToRiver(x, z);

  for (const b of BRIDGE_CONFIGS) {
    const distB = Math.hypot(x - b.x, z - b.z);
    if (distB < 18) {
      const dx = x - b.x;
      const dz = z - b.z;
      const cos = Math.cos(-b.rotationY);
      const sin = Math.sin(-b.rotationY);
      const lx = cos * dx - sin * dz;
      const lz = sin * dx + cos * dz;

      // Area tepat di bawah dek jembatan: palung sungai Y = -2.50
      if (Math.abs(lx) <= b.length * 0.42 && Math.abs(lz) <= b.width * 0.65) {
        return -2.50;
      }
      if (distRiver < 7.0) {
        const edge = distRiver / 7.0;
        return -2.50 * Math.cos(edge * (Math.PI / 2));
      }
      return Math.min(b.y - 0.05, 0.40);
    }
  }

  // Palung Sungai Reguler
  if (distRiver < 6.5) {
    const edge = distRiver / 6.5;
    return -2.5 * Math.cos(edge * (Math.PI / 2));
  }

  // B. Gugusan 3 Pulau Vulkanik Kaldera Naga di Laut Selatan Jauh [Pusat: 40, 840]
  if (biome === 'volcano') {
    const dBridge1 = distToSegment(x, z, -38, 858, -8, 848);
    if (dBridge1 <= 3.8) return 2.40;
    const dBridge2 = distToSegment(x, z, -34, 792, -4, 808);
    if (dBridge2 <= 3.8) return 2.40;

    const distSW = Math.hypot(x - (lm.caldera_sw_satellite?.x ?? -75), z - (lm.caldera_sw_satellite?.z ?? 875)) + Math.sin(x * 0.06 - z * 0.05) * 3.2;
    if (distSW <= 48) {
      if (distSW <= 18) return lm.caldera_sw_satellite?.y ?? 6.50;
      if (distSW <= 36) {
        const t = smoothstepBlend(18, 36, distSW);
        return lerpVal(lm.caldera_sw_satellite?.y ?? 6.50, 0.35, t);
      }
      const t = smoothstepBlend(36, 48, distSW);
      return lerpVal(0.35, -4.50, t);
    }

    const distNW = Math.hypot(x - (lm.caldera_nw_satellite?.x ?? -65), z - (lm.caldera_nw_satellite?.z ?? 775)) + Math.cos(x * 0.05 + z * 0.06) * 3.0;
    if (distNW <= 44) {
      if (distNW <= 16) return lm.caldera_nw_satellite?.y ?? 5.50;
      if (distNW <= 32) {
        const t = smoothstepBlend(16, 32, distNW);
        return lerpVal(lm.caldera_nw_satellite?.y ?? 5.50, 0.35, t);
      }
      const t = smoothstepBlend(32, 44, distNW);
      return lerpVal(0.35, -4.50, t);
    }

    const fbmMain = Math.sin(x * 0.045 + z * 0.035) * 6.5 + Math.cos(x * 0.09 - z * 0.07) * 3.5;
    const distMain = Math.hypot(x - (lm.caldera?.x ?? 40), z - (lm.caldera?.z ?? 840)) + fbmMain;

    const inNorthGorge = x >= 26 && x <= 54 && z >= 745 && z <= 838;
    if (inNorthGorge) {
      const gorgeT = smoothstepBlend(745, 825, z);
      return lerpVal(0.50, 2.50, gorgeT);
    }

    if (distMain <= 36) return 2.50;
    if (distMain <= 80) {
      const ridgeT = (distMain - 36) / 44;
      const ridgeH = 2.50 + Math.sin(ridgeT * Math.PI) * 14.5 + Math.sin((x + z) * 0.06) * 2.5;
      return Math.max(2.50, ridgeH);
    }
    if (distMain <= 98) {
      const t = smoothstepBlend(80, 98, distMain);
      return lerpVal(4.20, 0.35, t);
    }
    if (distMain <= 118) {
      const t = smoothstepBlend(98, 118, distMain);
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
    const dCoast = distCenter - coastR;
    if (dCoast <= 18) {
      return 0.35 - (dCoast / 18) * 4.85; // Garis pantai pasir landai ke laut
    }
    return -4.50; // Kedalaman samudra terbuka
  }

  // Kontur dasar daratan benua
  const gentleNoise =
    Math.sin(x * 0.012 + z * 0.01) * 1.4 +
    Math.cos(x * 0.008 - z * 0.01) * 1.0 +
    Math.sin((x + z) * 0.018) * 0.35;
  const basePlainsHeight = Math.max(0.2, Math.min(2.2, 0.55 + gentleNoise));

  // Transisi tepi pantai pasir jika dekat garis pantai luar benua
  const inCoast = coastR - distCenter;
  if (inCoast < 16) {
    const tBeach = smoothstepBlend(0, 16, inCoast);
    return lerpVal(0.35, basePlainsHeight, tBeach);
  }

  // D. Danau Air Tawar Titan Kuno [80, -760]
  if (biome === 'lake') {
    const distLake = Math.hypot(x - (lm.danau_titan?.x ?? 80), z - (lm.danau_titan?.z ?? -760));
    if (distLake <= 40) return lm.danau_titan?.y ?? -2.50;
    const t = (distLake - 40) / 15;
    return (lm.danau_titan?.y ?? -2.50) + t * 3.5;
  }

  // E. Pegunungan Salju Utara (Sekitar Danau Titan)
  if (biome === 'snow') {
    const distLake = Math.hypot(x - (lm.danau_titan?.x ?? 80), z - (lm.danau_titan?.z ?? -760));
    const mountainWave = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 8.5 + Math.sin((x + z) * 0.035) * 4.0;
    const targetMountainH = distLake > 52 ? Math.max(10.0, Math.min(28.0, 16.0 + mountainWave)) : (3.5 + mountainWave * 0.5);
    const snowDist = Math.hypot(x - 80, z - -760);
    const blendT = smoothstepBlend(45, 110, snowDist);
    return lerpVal(targetMountainH, basePlainsHeight, 1 - blendT);
  }

  // F. Gurun Pasir Emas Solaria (Sisi Barat Benua)
  if (biome === 'desert') {
    // 1. Kanyon Kuno [-260, -780]
    const distCanyon = Math.hypot(x - (lm.canyon?.x ?? -260), z - (lm.canyon?.z ?? -780));
    if (distCanyon <= 95) {
      const canyonNoise = Math.sin(x * 0.04) * Math.cos(z * 0.035) * 4.5;
      const mesaHeight = Math.max(8.5, Math.min(19.0, (lm.canyon?.y ?? 13.0) + canyonNoise));
      if (distCanyon <= (lm.canyon?.flattenRadius ?? 50)) return mesaHeight;
      const blendT = smoothstepBlend(lm.canyon?.flattenRadius ?? 50, 95, distCanyon);
      return lerpVal(mesaHeight, 1.6, blendT);
    }

    // 2. Istana Sultan Malik [-540, -640]
    const distPalace = Math.hypot(x - (lm.sultan_palace?.x ?? -540), z - (lm.sultan_palace?.z ?? -640));
    const palaceRadius = lm.sultan_palace?.flattenRadius ?? 40;
    if (distPalace <= palaceRadius) return lm.sultan_palace?.y ?? 2.00;
    if (distPalace <= palaceRadius + 12) {
      const t = smoothstepBlend(palaceRadius, palaceRadius + 12, distPalace);
      return lerpVal(lm.sultan_palace?.y ?? 2.00, 1.80, t);
    }

    // 3. Piramida Emas Solaria [-320, -560]
    if (Math.hypot(x - (lm.pyramid?.x ?? -320), z - (lm.pyramid?.z ?? -560)) <= (lm.pyramid?.flattenRadius ?? 35)) {
      return lm.pyramid?.y ?? 1.50;
    }

    // 4. Kawah Colosseum World Boss Titan [-480, -480]
    const distCrater = Math.hypot(x - (lm.kawah_boss?.x ?? -480), z - (lm.kawah_boss?.z ?? -480));
    if (distCrater <= (lm.kawah_boss?.flattenRadius ?? 50)) {
      return lm.kawah_boss?.y ?? 1.80;
    }

    // 5. Oase Solaria [-340, -340]
    const distOasis = Math.hypot(x - (lm.oasis?.x ?? -340), z - (lm.oasis?.z ?? -340));
    if (distOasis < 18) return -0.4;
    if (distOasis < 28) return 0.6;

    // 6. Desa Gurun & Bazaar [-460, -260]
    const distDesertVillage = Math.hypot(x - (lm.desert_village?.x ?? -460), z - (lm.desert_village?.z ?? -260));
    const desertVillageRadius = lm.desert_village?.flattenRadius ?? 35;
    if (distDesertVillage <= desertVillageRadius) return lm.desert_village?.y ?? 1.80;
    if (distDesertVillage <= desertVillageRadius + 10) {
      const t = smoothstepBlend(desertVillageRadius, desertVillageRadius + 10, distDesertVillage);
      return lerpVal(lm.desert_village?.y ?? 1.80, 1.60, t);
    }

    // Bukit Pasir Bergulung Alami
    const duneWave = Math.sin(x * 0.025 + z * 0.02) * 1.3 + Math.cos(x * 0.015 - z * 0.02) * 0.6;
    return Math.max(0.5, Math.min(3.8, 1.6 + duneWave));
  }

  // G. Padang Rumput Hijau Eldoria (Sisi Tengah & Timur)
  // 1. Desa Utama Sanctuary [40, -40]
  const distVillage = Math.hypot(x - (lm.village?.x ?? 40), z - (lm.village?.z ?? -40));
  const villageRadius = lm.village?.flattenRadius ?? 40;
  if (distVillage <= villageRadius) return lm.village?.y ?? 0.25;
  if (distVillage <= villageRadius + 8) {
    const t = smoothstepBlend(villageRadius, villageRadius + 8, distVillage);
    return lerpVal(lm.village?.y ?? 0.25, basePlainsHeight, t);
  }

  // 2. Pelabuhan Sanctuary [40, 85]
  const distHarbor = Math.hypot(x - (lm.harbor?.x ?? 40), z - (lm.harbor?.z ?? 85));
  const harborRadius = lm.harbor?.flattenRadius ?? 25;
  if (distHarbor <= harborRadius) return lm.harbor?.y ?? 0.35;
  if (distHarbor <= harborRadius + 8) {
    const t = smoothstepBlend(harborRadius, harborRadius + 8, distHarbor);
    return lerpVal(lm.harbor?.y ?? 0.35, basePlainsHeight, t);
  }

  // 3. Ibukota Kerajaan Emas Astraea [320, -260]
  const distAstraea = Math.hypot(x - (lm.astraea?.x ?? 320), z - (lm.astraea?.z ?? -260));
  const astraeaRadius = lm.astraea?.flattenRadius ?? 50;
  if (distAstraea <= astraeaRadius) return lm.astraea?.y ?? 2.00;
  if (distAstraea <= astraeaRadius + 8) {
    const t = smoothstepBlend(astraeaRadius, astraeaRadius + 8, distAstraea);
    return lerpVal(lm.astraea?.y ?? 2.00, basePlainsHeight, t);
  }

  // 4. Desa Benteng Val-Kragor [520, 10]
  const distValKragor = Math.hypot(x - (lm.valkragor?.x ?? 520), z - (lm.valkragor?.z ?? 10));
  const valkragorRadius = lm.valkragor?.flattenRadius ?? 45;
  if (distValKragor <= valkragorRadius) return lm.valkragor?.y ?? 2.00;
  if (distValKragor <= valkragorRadius + 8) {
    const t = smoothstepBlend(valkragorRadius, valkragorRadius + 8, distValKragor);
    return lerpVal(lm.valkragor?.y ?? 2.00, basePlainsHeight, t);
  }

  // 5. Puing Kastil Terbengkalai [420, -140]
  const distRuins = Math.hypot(x - (lm.abandoned_castle?.x ?? 420), z - (lm.abandoned_castle?.z ?? -140));
  const ruinsRadius = lm.abandoned_castle?.flattenRadius ?? 35;
  if (distRuins <= ruinsRadius) return lm.abandoned_castle?.y ?? 1.40;
  if (distRuins <= ruinsRadius + 8) {
    const t = smoothstepBlend(ruinsRadius, ruinsRadius + 8, distRuins);
    return lerpVal(lm.abandoned_castle?.y ?? 1.40, basePlainsHeight, t);
  }

  // 6. Mage Tower Puncak Halilintar [220, -110]
  if (Math.hypot(x - (lm.mage_tower?.x ?? 220), z - (lm.mage_tower?.z ?? -110)) <= (lm.mage_tower?.flattenRadius ?? 20)) {
    return lm.mage_tower?.y ?? 4.50;
  }

  // 7. Hutan Kabut Eldoria [640, -340]
  const distMist = Math.hypot(x - (lm.mist_forest?.x ?? 640), z - (lm.mist_forest?.z ?? -340));
  if (distMist <= 65) {
    const mistWave = Math.sin(x * 0.035 + z * 0.03) * 1.8 + 3.2;
    return mistWave;
  }

  // 8. Lembah Batu Lumut [600, -120]
  const distMoss = Math.hypot(x - (lm.moss_valley?.x ?? 600), z - (lm.moss_valley?.z ?? -120));
  if (distMoss <= 95) {
    if (distMoss <= (lm.moss_valley?.flattenRadius ?? 25)) return lm.moss_valley?.y ?? 0.35;
    const surroundingHills = Math.max(9.5, Math.min(13.5, 11.0 + Math.sin(x * 0.04) * 1.8));
    if (distMoss <= 55) {
      const t = smoothstepBlend(lm.moss_valley?.flattenRadius ?? 25, 55, distMoss);
      return lerpVal(lm.moss_valley?.y ?? 0.35, surroundingHills, t);
    }
    const tDown = smoothstepBlend(55, 95, distMoss);
    return lerpVal(surroundingHills, basePlainsHeight, tDown);
  }

  // 9. Perataan Koridor Jalan Raya (< 5.5 unit)
  const distRoad = getDistanceToRoad(x, z);
  if (distRoad < 5.5) {
    let targetRoadH = 0.35;
    if (x > 250 && z < -200) targetRoadH = 2.00; // Koridor Astraea
    else if (x > 450) targetRoadH = 2.00; // Koridor Val-Kragor
    else if (x > 350 && z < -100) targetRoadH = 1.40; // Koridor Puing Kastil
    else if (x < -150) targetRoadH = 1.60; // Koridor Gurun Solaria

    const t = smoothstepBlend(0, 5.5, distRoad);
    return lerpVal(targetRoadH, basePlainsHeight, t);
  }

  return basePlainsHeight;
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
