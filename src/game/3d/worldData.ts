/**
 * WORLD_DATA - Single Source of Truth for Chronicles of Eldoria
 * Batas Dunia: X: [-600, 600], Z: [-600, 350] (Skala 1200 x 950 Unit)
 *
 * Mengontrol secara mutlak:
 * 1. Definisi Bioma & Garis Pantai (getBiomeAt)
 * 2. Elevasi Medan 3D (getProceduralContinentHeight)
 * 3. Alur 4 Cabang Sungai (RIVER_SPLINES)
 * 4. Jaringan Jalan Raya & Jembatan (ROAD_SPLINES & BRIDGE_CONFIGS)
 * 5. 14 Landmark & Wilayah Interaktif (WORLD_LANDMARKS)
 * 6. Proyeksi Peta 2D (worldToMapPercent, mapPercentToWorld)
 */

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WORLD_BOUNDS: WorldBounds = {
  minX: -600,
  maxX: 600,
  minZ: -600,
  maxZ: 350,
};

export const WORLD_WIDTH = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX; // 1200
export const WORLD_HEIGHT = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ; // 950

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
 * 1. FUNGSI PENENTU BIOME & GARIS PANTAI (getBiomeAt)
 * Menggunakan kurva matematika mulus terkalibrasi pada skala 1200 x 950:
 * - volcano: Kaldera Sarang Naga di laut selatan (hypot(x - (-70), z - 300) < 65)
 * - lake: Danau Titan Kuno (hypot(x - (-310), z - (-480)) < 55)
 * - snow: Pegunungan salju barat laut yang melingkari Danau Titan (x < -140 && z < -340)
 * - desert: Gurun Solaria & Kanyon (z < -130 + sin(x*0.009)*45 && x > -140)
 * - ocean: Barat (x < -440 + sin(z*0.015)*35 && z > -340), Selatan (z > 210 + cos(x*0.012)*25), Teluk Tenggara (x > 440 && z > 130)
 * - grassland: Padang Rumput Eldoria (seluruh daratan utama)
 */
export function getBiomeAt(x: number, z: number): BiomeType {
  // A. Pulau Kaldera Sarang Naga di Laut Selatan Jauh [-40, 340]
  if (Math.hypot(x - (-40), z - 340) < 55) {
    return 'volcano';
  }

  // B. Samudra & Garis Pantai (Pesisir Selatan di Z = 185)
  const isWestOcean = x < -440 + Math.sin(z * 0.015) * 35 && z > -340;
  const isSouthOcean = z > 185 + Math.cos(x * 0.012) * 20;
  const isSoutheastBay = x > 440 && z > 130;

  if (isWestOcean || isSouthOcean || isSoutheastBay) {
    return 'ocean';
  }

  // C. Danau Air Tawar Titan Kuno
  if (Math.hypot(x - (-310), z - (-480)) < 55) {
    return 'lake';
  }

  // D. Pegunungan Salju Barat Laut
  if (x < -140 && z < -340) {
    return 'snow';
  }

  // E. Gurun Pasir Emas Solaria & Kanyon Kuno
  if (z < -130 + Math.sin(x * 0.009) * 45 && x > -140) {
    return 'desert';
  }

  // F. Padang Rumput Eldoria (Daratan Utama)
  return 'grassland';
}

/**
 * 2. SISTEM 4 CABANG SUNGAI BERKELOK UTUH (RIVER_SPLINES)
 * Sesuai denah referensi target peta:
 * 1. Sungai Barat Laut: Danau Titan (-310, -430) -> timur Astraea (-190, -230) -> Titik Temu Tengah (-35, 45)
 * 2. Sungai Gurun Utara: Titik Temu Tengah (-35, 45) -> selatan Oase (110, -140) -> barat Kawah Boss (215, -390) -> Kanyon (220, -520)
 * 3. Sungai Timur: Titik Temu Tengah (-35, 45) -> Val-Kragor (290, 65) -> antara Hutan Kabut & Lembah Lumut (465, -80) -> lereng timur laut (485, -310) [MENYAMBUNG UTUH]
 * 4. Sungai Hilir Selatan: Titik Temu Tengah (-35, 45) -> pantai selatan (-25, 220)
 */
export interface RiverSplineDef {
  id: string;
  name: string;
  points: [number, number][];
}

export const RIVER_NW_BRANCH: [number, number][] = [
  [-310, -430], // Outlet Danau Titan Kuno
  [-270, -360],
  [-225, -290],
  [-190, -230], // Timur Ibukota Astraea (Jembatan 1)
  [-140, -160],
  [-95, -80],
  [-60, -15],
  [-35, 45],    // Titik Temu Tengah (Confluence)
];

export const RIVER_DESERT_BRANCH: [number, number][] = [
  [-35, 45],    // Titik Temu Tengah
  [15, -10],
  [60, -70],
  [110, -140],  // Selatan Oase Solaria
  [155, -220],
  [185, -310],
  [190, -390],  // Jauh di barat Kawah Colosseum (235, -380) - Bebas Banjir
  [195, -460],
  [200, -520],  // Hulu Mata Air Kanyon Kuno
];

export const RIVER_EAST_BRANCH: [number, number][] = [
  [-35, 45],    // Titik Temu Tengah
  [50, 48],
  [130, 52],
  [220, 58],
  [310, 60],    // Mengalir bersih di utara Benteng Val-Kragor (Z = 60 vs Val-Kragor di Z = 115)
  [360, 50],
  [400, 35],    // Titik Penyeberangan Jembatan Jalan Lembah Batu Lumut
  [435, 0],
  [450, -60],
  [465, -140],
  [475, -220],
  [485, -290],  // Hulu Pegunungan Timur Laut
];

export const RIVER_SOUTH_BRANCH: [number, number][] = [
  [-35, 45],    // Titik Temu Tengah
  [0, 80],
  [15, 110],    // Penyeberangan Jembatan Jalan Raya Timur
  [15, 150],    // Mengalir di timur Desa Utama (Desa di X: -65..-15, jarak > 30 unit kering!)
  [10, 185],    // Garis Pantai Selatan
  [5, 220],     // Muara Samudra Selatan
];

export const RIVER_SPLINES: RiverSplineDef[] = [
  { id: 'river_nw', name: 'Sungai Barat Laut', points: RIVER_NW_BRANCH },
  { id: 'river_desert', name: 'Sungai Gurun Utara', points: RIVER_DESERT_BRANCH },
  { id: 'river_east', name: 'Sungai Lembah Timur', points: RIVER_EAST_BRANCH },
  { id: 'river_south', name: 'Sungai Muara Selatan', points: RIVER_SOUTH_BRANCH },
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
  for (const branch of RIVER_SPLINES) {
    const pts = branch.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

export const WATER_LEVEL = -0.25;

/**
 * Validator ketat penempatan objek darat:
 * Memastikan koordinat bukan di zona laut dan berada aman di atas permukaan air.
 */
export function isStrictLandForProps(
  x: number,
  z: number,
  getHeight?: (x: number, z: number) => number
): boolean {
  const biome = getBiomeAt(x, z);
  if (biome === 'ocean' || biome === 'lake') return false;
  const h = getHeight ? getHeight(x, z) : getProceduralContinentHeight(x, z);
  return h >= WATER_LEVEL + 0.85; // h >= 0.60
}

/**
 * 3. JARINGAN JALAN RAYA & JEMBATAN (ROAD_SPLINES, ROAD_NETWORK, & BRIDGE_CONFIGS)
 * Dirancang lurus, logis, terhubung langsung ke gerbang setiap lokasi,
 * dan hanya menyeberangi sungai melalui jembatan yang tegak lurus.
 */
export interface RoadSplineDef {
  id: string;
  name: string;
  width: number;
  points: [number, number][];
}

export const ROAD_SPLINES: RoadSplineDef[] = [
  // 1A. RUTE BARAT: Desa Utama (-35, 135) -> Gerbang Selatan Astraea (-250, -204)
  // Berjalan di sisi Barat sungai utama tanpa menyeberang sungai.
  {
    id: 'plains_west_astraea',
    name: 'Jalan Poros Barat: Sanctuary - Astraea',
    width: 3.2,
    points: [
      [-35, 135],   // Alun-Alun Air Mancur Desa Utama
      [-75, 135],   // Gerbang Barat Desa
      [-120, 120],
      [-180, 100],
      [-220, 40],
      [-245, -60],
      [-250, -140],
      [-250, -204], // Tepat 6 unit di depan Pintu Gerbang Selatan Astraea
    ],
  },
  // 1B. RUTE BARAT (LANJUTAN): Gerbang Astraea (-250, -204) -> Lembah Danau Titan (-310, -430)
  {
    id: 'road_astraea_titan',
    name: 'Jalan Akses Ziarah Danau Titan Kuno',
    width: 3.0,
    points: [
      [-250, -204], // Gerbang Selatan Astraea
      [-275, -204],
      [-290, -240], // Memutari sisi barat tembok luar Astraea
      [-295, -310],
      [-305, -380],
      [-310, -430], // Menuju tepian Danau Titan Kuno
    ],
  },
  // 2A. RUTE TIMUR: Desa Utama (-35, 135) -> Jembatan Utama Timur (15, 110) -> Gerbang Val-Kragor (278, 115)
  // Menyeberangi sungai HANYA 1 KALI melalui Jembatan Utama Timur yang tegak lurus.
  {
    id: 'plains_east_valkragor',
    name: 'Jalan Poros Timur: Sanctuary - Jembatan Utama - Benteng Val-Kragor',
    width: 3.2,
    points: [
      [-35, 135],   // Alun-Alun Desa Utama
      [-10, 125],
      [0, 115],
      [4, 110],     // Pangkal Barat Jembatan Utama Hilir Selatan
      [26, 110],    // Pangkal Timur Jembatan Utama Hilir Selatan
      [45, 110],    // Simpang Timur (Crossroads)
      [110, 112],
      [180, 114],
      [240, 115],
      [278, 115],   // Tepat 6 unit di depan Gerbang Barat Benteng Val-Kragor (Gate: [284, 115])
    ],
  },
  // 2B. CABANG TIMUR: Simpang Timur (45, 110) -> Gerbang Puing Kastil (220, -35)
  {
    id: 'road_east_puing_kastil',
    name: 'Jalan Cabang Simpang Timur - Gerbang Puing Kastil',
    width: 3.0,
    points: [
      [45, 110],    // Simpang Timur
      [80, 95],
      [120, 80],
      [155, 54],    // Titik Penyeberangan Jembatan Batu Sungai Timur
      [185, 20],
      [220, -35],   // Tepat di depan Gerbang Puing Kastil Terbengkalai
    ],
  },
  // 2C. CABANG TIMUR: Benteng Val-Kragor (278, 115) -> Jembatan 3 (380, 35) -> Lembah Batu Lumut & Hutan Kabut
  {
    id: 'road_valkragor_mist_moss',
    name: 'Jalan Setapak Benteng Val-Kragor - Lembah Batu Lumut & Hutan Kabut',
    width: 2.8,
    points: [
      [278, 115],   // Di luar Gerbang Barat Val-Kragor
      [310, 80],    // Melintasi jalur luar utara benteng
      [350, 65],
      [380, 35],    // Menyeberang Jembatan Sungai Lembah Lumut
      [420, 35],
      [465, 35],    // Glade Alami Lembah Batu Lumut
      [400, -100],  // Menembus Hutan Kabut Eldoria
    ],
  },
  // 3. RUTE UTARA: Astraea (-250, -204) -> Gurun Solaria -> Oase -> Piramida -> Istana Sultan -> Kanyon
  {
    id: 'road_north_solaria',
    name: 'Jalur Poros Utara: Astraea - Oase - Piramida - Istana Sultan Malik - Kanyon',
    width: 3.8,
    points: [
      [-250, -204], // Gerbang Selatan Astraea
      [-215, -220],
      [-190, -230], // Menyeberang Jembatan Batu 1 Sungai Barat Laut
      [-165, -230],
      [-110, -230], // Masuk Pintu Gerbang Pasir Gurun Solaria
      [85, -230],   // Oase Solaria
      [30, -350],   // Piramida Emas
      [140, -370],  // Jalur Pasir Gurun Terbuka
      [340, -425],  // Timur Kawah Colosseum
      [430, -460],  // Istana Sultan Malik
      [320, -490],
      [220, -520],  // Kanyon Kuno Utara
    ],
  },
  // 4. RUTE SELATAN: Desa Utama (-35, 135) -> Dermaga Pelabuhan Sanctuary (0, 162)
  {
    id: 'plains_south_harbor',
    name: 'Jalan Poros Selatan: Desa - Pelabuhan Sanctuary',
    width: 3.4,
    points: [
      [-35, 135],   // Alun-Alun Desa Utama
      [-15, 148],
      [0, 162],     // Menempel tepat di pangkal tangga dermaga kayu Pelabuhan
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

export const BRIDGE_CONFIGS: BridgeDef[] = [
  {
    id: 'bridge_astraea',
    name: 'Astraea Highway River Crossing',
    nameId: 'Jembatan 1: Penyeberangan Astraea',
    x: -190,
    z: -230,
    y: 0.45,
    rotationY: 0,
    length: 26,
    width: 4.8,
    type: 'stone',
  },
  {
    id: 'bridge_south_chasm',
    name: 'Central South Suspension Bridge',
    nameId: 'Jembatan 2: Jembatan Gantung Hilir Selatan',
    x: 15,
    z: 110,
    y: 1.35,
    rotationY: 0,
    length: 22,
    width: 4.8,
    type: 'suspension',
  },
  {
    id: 'bridge_puing_kastil',
    name: 'Castle Ruins River Crossing',
    nameId: 'Jembatan Penyeberangan Puing Kastil',
    x: 155,
    z: 54,
    y: 0.45,
    rotationY: Math.PI / 2,
    length: 24,
    width: 4.8,
    type: 'stone',
  },
  {
    id: 'bridge_moss_valley',
    name: 'Moss Rock Valley River Bridge',
    nameId: 'Jembatan 3: Jembatan Sungai Lembah Lumut',
    x: 380,
    z: 35,
    y: 0.45,
    rotationY: 0,
    length: 24,
    width: 4.8,
    type: 'wood',
  },
];

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
 * Skala Terkalibrasi [1200 x 950] dengan posisi presisi 100%
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

export const WORLD_LANDMARKS: LandmarkDef[] = [
  {
    id: 'danau_titan',
    name: 'Ancient Titan Lake Valley',
    nameId: 'Lembah Danau Titan Kuno',
    x: -310,
    z: -480,
    level: 6,
    type: 'lake',
    icon: '🏔️',
    color: '#38bdf8',
    description: 'A crystalline glacial mountain lake surrounded by snow-capped peaks in the far northwest, headwaters of the Eldorian rivers.',
    descriptionId: 'Danau air tawar purba berair jernih di ketinggian pegunungan es barat laut, hulu utama sungai benua Eldoria.',
    waypointId: 'wp_titan',
    labelPosition: 'above',
  },
  {
    id: 'astraea',
    name: 'Imperial Capital Astraea & Sun Palace',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    x: -250,
    z: -240,
    level: 5,
    type: 'capital',
    icon: '👑',
    color: '#fbbf24',
    description: 'The monumental golden capital of Emperor Aurelius with grand stone walls, white marble arcades, and imperial guards.',
    descriptionId: 'Kompleks benteng kastil megah berpilar emas putih dan tahta Kaisar Aurelius di lereng selatan pegunungan salju.',
    isSafeZone: true,
    waypointId: 'wp_astraea',
    labelPosition: 'below',
  },
  {
    id: 'canyon',
    name: 'Ancient Canyon',
    nameId: 'Kanyon Kuno',
    x: 160,
    z: -540,
    level: 8,
    type: 'canyon',
    icon: '🏜️',
    color: '#ea580c',
    description: 'Towering terracotta canyon cliffs and sandstone chasms guarding the northernmost border of the continent.',
    descriptionId: 'Tebing bebatuan cadas merah terjal bertingkat dan ngarai jurang sandstone di perbatasan utara gurun.',
    waypointId: 'wp_canyon',
    labelPosition: 'above',
  },
  {
    id: 'pyramid',
    name: 'Solaria Golden Pyramid',
    nameId: 'Piramida Emas Solaria',
    x: 30,
    z: -350,
    level: 7,
    type: 'pyramid',
    icon: '🏛️',
    color: '#eab308',
    description: 'Twin ancient golden sandstone pyramids built by the Sun Pharaohs among rolling dunes.',
    descriptionId: 'Dua monumen piramida emas kuno peninggalan peradaban matahari di tengah hamparan bukit pasir gurun.',
    waypointId: 'wp_pyramid',
    labelPosition: 'below',
  },
  {
    id: 'oasis',
    name: 'Hidden Solaria Oasis',
    nameId: 'Oase Solaria',
    x: 85,
    z: -230,
    level: 5,
    type: 'oasis',
    icon: '🌴',
    color: '#14b8a6',
    description: 'A natural freshwater turquoise spring shaded by date palms providing sanctuary in the harsh desert heat.',
    descriptionId: 'Kolam mata air tawar pirus jernih dinaungi rumpun pohon palem kurma rindang di tengah gurun.',
    waypointId: 'wp_oasis',
    labelPosition: 'below',
  },
  {
    id: 'kawah_boss',
    name: 'Ancient Titan Colosseum Arena',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    x: 235,
    z: -380,
    level: 10,
    type: 'boss',
    icon: '🗿',
    color: '#ea580c',
    description: 'A colossal ancient colosseum ruins arena in the dry crater, lair of the legendary World Boss Titan Kuno.',
    descriptionId: 'Arena reruntuhan Colosseum Kuno megah berpagar tebing batu di kawah kering, arena pertempuran World Boss Titan Kuno.',
    isBoss: true,
    waypointId: 'wp_boss_crater',
    labelPosition: 'below',
  },
  {
    id: 'desert_sandworm',
    name: 'Ancient Sandworm Lair',
    nameId: 'Sarang Sandworm Gurun',
    x: -30,
    z: -220,
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
    id: 'sultan_palace',
    name: 'Sultan Malik Grand Palace',
    nameId: 'Istana Sultan Malik',
    x: 430,
    z: -460,
    level: 8,
    type: 'palace',
    icon: '🕌',
    color: '#d97706',
    description: 'The opulent white marble and golden domed desert palace of Sultan Malik al-Solaria in the northeast corner.',
    descriptionId: 'Kompleks istana megah kubah marmer emas penguasa Gurun Pasir Solaria di pojok timur laut benua.',
    waypointId: 'wp_sultan_palace',
    labelPosition: 'below',
  },
  {
    id: 'mist_forest',
    name: 'Eldoria Mist Forest',
    nameId: 'Hutan Kabut Eldoria',
    x: 380,
    z: -160,
    level: 5,
    type: 'forest',
    icon: '🌲',
    color: '#15803d',
    description: 'Ancient dark spruce and oak wilderness draped in thick atmospheric low ground mist.',
    descriptionId: 'Hutan pohon pinus & oak raksasa lebat yang senantiasa diselimuti kabut atmosferik misterius.',
    waypointId: 'wp_mist_forest',
    labelPosition: 'below',
  },
  {
    id: 'abandoned_castle',
    name: 'Abandoned Castle Ruins',
    nameId: 'Puing Kastil Terbengkalai',
    x: 220,
    z: -30,
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
    id: 'mage_tower',
    name: 'Thunderpeak Mage Tower',
    nameId: 'Mage Tower Puncak Halilintar',
    x: 110,
    z: -10,
    level: 4,
    type: 'tower',
    icon: '⚡',
    color: '#8b5cf6',
    description: 'A grand magical arcane spire on a dry grassy hill, center of arcane learning and teleportation.',
    descriptionId: 'Menara penyihir megah di bukit kering timur tengah, pusat studi sihir dan teleportasi.',
    waypointId: 'wp_thunderpeak',
    labelPosition: 'below',
  },
  {
    id: 'valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    x: 310,
    z: 115,
    level: 3,
    type: 'fortress',
    icon: '🛡️',
    color: '#3b82f6',
    description: 'A fortified highland village with wooden palisades, corner watchtowers, blacksmith, and red-roofed cottages.',
    descriptionId: 'Desa berpagar benteng kayu runcing & tembok batu slate dengan barak, bengkel tempa, dan rumah atap merah.',
    waypointId: 'wp_valkragor',
    labelPosition: 'below',
  },
  {
    id: 'moss_valley',
    name: 'Moss Rock Valley',
    nameId: 'Lembah Batu Lumut',
    x: 465,
    z: 35,
    level: 5,
    type: 'valley',
    icon: '🪨',
    color: '#65a30d',
    description: 'A serene secluded valley enclosed by smooth green cliffs, home to giant ancient mossy megaliths and waterfalls.',
    descriptionId: 'Lembah hijau terisolasi di ujung timur, dipagari tebing hijau halus, penuh batu megalit berlumut dan air terjun timur.',
    waypointId: 'wp_moss_valley',
    labelPosition: 'below',
  },
  {
    id: 'village',
    name: 'Sanctuary Village & Central Plains',
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    x: -35,
    z: 135,
    level: 1,
    type: 'village',
    icon: '🏡',
    color: '#65a30d',
    description: 'The peaceful starting settlement of adventurers on the lush southern coastal plains with wooden houses and windmills.',
    descriptionId: 'Pemukiman sentral awal para petualang di padang rumput pesisir barat daya Eldoria yang kering & aman dari sungai.',
    isSafeZone: true,
    waypointId: 'wp_village',
    labelPosition: 'below',
  },
  {
    id: 'harbor',
    name: 'Sanctuary Harbor',
    nameId: 'Pelabuhan Sanctuary',
    x: 0,
    z: 180,
    level: 1,
    type: 'harbor',
    icon: '⛵',
    color: '#06b6d4',
    description: 'The bustling coastal wooden boardwalk docks where merchant galleons and fishing boats arrive from across the sea.',
    descriptionId: 'Dermaga kayu pelabuhan menjorok ke Samudra Azure di pesisir selatan menempel di Desa Utama.',
    waypointId: 'wp_harbor',
    labelPosition: 'below',
  },
  {
    id: 'caldera',
    name: 'Dragonfang Caldera',
    nameId: 'Kaldera Sarang Naga',
    x: -40,
    z: 340,
    level: 12,
    type: 'boss',
    icon: '🐉',
    color: '#dc2626',
    description: 'A scorching volcanic island across the south sea, rimmed with jagged basalt horns and boiling lava pools, nest of Ancient Dragon Ignis.',
    descriptionId: 'Pulau vulkanik magma lahar merah di laut selatan jauh, sarang bertarung World Boss Ignis Sang Naga Purba.',
    isBoss: true,
    waypointId: 'wp_caldera',
    labelPosition: 'below',
  },
];

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
 * Menggunakan Smoothstep Distance Blending selebar 45 unit untuk melenyapkan seluruh lonjakan tebing vertikal.
 */
export function getProceduralContinentHeight(x: number, z: number): number {
  const biome = getBiomeAt(x, z);

  // A. Palung Sungai & Area Bawah Jembatan
  const distRiver = getDistanceToRiver(x, z);

  // Perataan Khusus Area Pangkal & Bawah Jembatan (Radius 14 unit di sekitar jembatan)
  for (const b of BRIDGE_CONFIGS) {
    const distB = Math.hypot(x - b.x, z - b.z);
    if (distB <= 14) {
      if (distRiver < 6.5) {
        const edge = distRiver / 6.5;
        return -2.5 * Math.cos(edge * (Math.PI / 2));
      }
      // Area tepi daratan di bawah jembatan dibatasi maksimal Y = 1.20 agar tidak pernah menonjol menembus papan jembatan
      return Math.min(1.20, 0.55 + Math.sin(x * 0.012 + z * 0.01) * 0.3);
    }
  }

  // Palung Sungai Reguler (Carve deep riverbed Y = -2.5 secara kontinu, tanpa urugan tanah!)
  if (distRiver < 6.5) {
    const edge = distRiver / 6.5;
    return -2.5 * Math.cos(edge * (Math.PI / 2));
  }

  // B. Kaldera Vulkanik Sarang Naga [-40, 340] (Pulau terisolasi di laut)
  if (biome === 'volcano') {
    const distCenter = Math.hypot(x - -40, z - 340);
    if (distCenter <= 25) return 2.50; // Lantai kawah lahar rata
    if (distCenter <= 45) {
      const t = (distCenter - 25) / 20;
      return 2.50 + Math.sin(t * Math.PI) * 5.0; // Dinding basalt kawah
    }
    const tEdge = (distCenter - 45) / 20;
    return Math.max(0.2, 3.8 * (1.0 - tEdge));
  }

  // C. Samudra & Laut Lepas
  if (biome === 'ocean') {
    const distSouthCoast = z - (185 + Math.cos(x * 0.012) * 20);
    const distWestCoast = (-440 + Math.sin(z * 0.015) * 35) - x;
    const isBay = x > 440 && z > 130;
    const coastDist = Math.max(distSouthCoast, distWestCoast, isBay ? 10 : -10);

    if (coastDist <= 15) {
      return 0.2 - (coastDist / 15) * 3.0; // Transisi pantai pasir basah
    }
    return -4.0; // Kedalaman laut lepas
  }

  // D. Danau Air Tawar Titan Kuno [-310, -480]
  if (biome === 'lake') {
    const distLake = Math.hypot(x - (-310), z - (-480));
    if (distLake <= 40) return -2.50; // Dasar danau air biru
    const t = (distLake - 40) / 15;
    return -2.50 + t * 3.5; // Lereng tepian danau naik ke daratan
  }

  // Kontur dasar padang rumput bergelombang lembut
  const gentleNoise =
    Math.sin(x * 0.012 + z * 0.01) * 1.4 +
    Math.cos(x * 0.008 - z * 0.01) * 1.0 +
    Math.sin((x + z) * 0.018) * 0.35;
  const basePlainsHeight = Math.max(0.2, Math.min(2.2, 0.55 + gentleNoise));

  // E. Pegunungan Salju Barat Laut (Smoothstep Distance Blending selebar 45 unit!)
  // Menghilangkan lonjakan tebing vertikal ekstrem di X < -140 & Z < -340
  if (x < -95 && z < -295) {
    const distLake = Math.hypot(x - (-310), z - (-480));
    const mountainWave = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 7.5 + Math.sin((x + z) * 0.035) * 3.5;
    const targetMountainH = distLake > 52 ? Math.max(9.0, Math.min(25.0, 15.0 + mountainWave)) : (3.0 + mountainWave * 0.5);

    const snowDistX = Math.max(0, -140 - x);
    const snowDistZ = Math.max(0, -340 - z);
    const snowDist = Math.min(snowDistX, snowDistZ);
    const blendT = smoothstepBlend(0, 45, snowDist);
    return lerpVal(basePlainsHeight, targetMountainH, blendT);
  }

  // F. Gurun Pasir Emas Solaria & Kanyon Kuno
  if (biome === 'desert') {
    // Kanyon Kuno [160, -540] (Smoothstep Distance Blending 45 unit)
    const distCanyon = Math.hypot(x - 160, z - -540);
    if (distCanyon <= 95) {
      const canyonNoise = Math.sin(x * 0.04) * Math.cos(z * 0.035) * 4.5;
      const mesaHeight = Math.max(8.5, Math.min(19.0, 13.0 + canyonNoise));
      if (distCanyon <= 50) return mesaHeight;
      const blendT = smoothstepBlend(50, 95, distCanyon);
      return lerpVal(mesaHeight, 1.6, blendT);
    }

    // Istana Sultan Malik [430, -460]
    if (Math.hypot(x - 430, z - -460) <= 40) return 2.00;

    // Piramida Emas Solaria [30, -350]
    if (Math.hypot(x - 30, z - -350) <= 35) return 1.50;

    // Oase Solaria [85, -230]
    const distOasis = Math.hypot(x - 85, z - -230);
    if (distOasis < 18) return -0.4;
    if (distOasis < 28) return 0.6;

    // Kawah World Boss Colosseum Titan Kuno [235, -380] (Kering dan Datar)
    const distSinkhole = Math.hypot(x - 235, z - -380);
    if (distSinkhole <= 45) {
      return 1.80; // Arena Colosseum datar kering
    }

    // Bukit pasir bergulung lembut
    const duneWave = Math.sin(x * 0.025 + z * 0.02) * 1.3 + Math.cos(x * 0.015 - z * 0.02) * 0.6;
    return Math.max(0.5, Math.min(3.8, 1.6 + duneWave));
  }

  // G. Padang Rumput Eldoria (Grassland)
  // 1. Desa Utama Sanctuary [-35, 135] (Dataran rata aman radius bangunan + 8 unit)
  const distVillage = Math.hypot(x - -35, z - 135);
  if (distVillage <= 40) return 0.25;
  if (distVillage <= 48) {
    const t = smoothstepBlend(40, 48, distVillage);
    return lerpVal(0.25, basePlainsHeight, t);
  }

  // 2. Pelabuhan Sanctuary [0, 180]
  const distHarbor = Math.hypot(x - 0, z - 180);
  if (distHarbor <= 25) return 0.35;
  if (distHarbor <= 33) {
    const t = smoothstepBlend(25, 33, distHarbor);
    return lerpVal(0.35, basePlainsHeight, t);
  }

  // 3. Ibukota Kerajaan Emas Astraea [-250, -240] (Smoothstep blend ke luar tembok)
  const distAstraea = Math.hypot(x - -250, z - -240);
  if (distAstraea <= 50) return 2.00;
  if (distAstraea <= 58) {
    const t = smoothstepBlend(50, 58, distAstraea);
    return lerpVal(2.00, basePlainsHeight, t);
  }

  // 4. Desa Benteng Val-Kragor [310, 115] (Smoothstep blend ke luar benteng)
  const distValKragor = Math.hypot(x - 310, z - 115);
  if (distValKragor <= 45) return 2.00;
  if (distValKragor <= 53) {
    const t = smoothstepBlend(45, 53, distValKragor);
    return lerpVal(2.00, basePlainsHeight, t);
  }

  // 5. Puing Kastil Terbengkalai [220, -30]
  const distRuins = Math.hypot(x - 220, z - -30);
  if (distRuins <= 35) return 1.40;
  if (distRuins <= 43) {
    const t = smoothstepBlend(35, 43, distRuins);
    return lerpVal(1.40, basePlainsHeight, t);
  }

  // 6. Mage Tower Puncak Halilintar [110, -10]
  if (Math.hypot(x - 110, z - -10) <= 20) return 4.50;

  // 7. Hutan Kabut Eldoria [380, -160]
  const distMist = Math.hypot(x - 380, z - -160);
  if (distMist <= 60) {
    const mistWave = Math.sin(x * 0.035 + z * 0.03) * 1.8 + 3.2;
    return mistWave;
  }

  // 8. Lembah Batu Lumut [465, 35] (Smoothstep Distance Blending 45 unit - HAPUS TEBING LONJAKAN PATAH!)
  const distMoss = Math.hypot(x - 465, z - 35);
  if (distMoss <= 95) {
    if (distMoss <= 25) return 0.35; // Lantai lembah rata rendah
    const surroundingHills = Math.max(9.5, Math.min(13.5, 11.0 + Math.sin(x * 0.04) * 1.8));
    if (distMoss <= 55) {
      const t = smoothstepBlend(25, 55, distMoss);
      return lerpVal(0.35, surroundingHills, t);
    }
    // Lereng melandai turun ke daratan dari radius 55 ke 95 (lebar 40 unit)
    const tDown = smoothstepBlend(55, 95, distMoss);
    return lerpVal(surroundingHills, basePlainsHeight, tDown);
  }

  // 8b. Pegunungan Hijau Timur (X > 500, Smoothstep blend 45 unit)
  if (x > 500) {
    const eastHills = Math.sin(x * 0.015) * Math.cos(z * 0.012) * 5.5 + Math.sin(z * 0.025) * 2.2;
    const targetH = Math.max(1.0, Math.min(18.0, 5.0 + eastHills));
    const t = smoothstepBlend(500, 545, x);
    return lerpVal(basePlainsHeight, targetH, t);
  }

  // 9. Jembatan (Walkable Deck Height)
  for (const b of BRIDGE_CONFIGS) {
    if (Math.hypot(x - b.x, z - b.z) <= b.length / 2 + 1.2) {
      if (b.type === 'suspension') return 1.35;
      return 0.50;
    }
  }

  // 10. Perataan Koridor Jalan Raya (< 5.5 unit) - Halus & Landai Bebas Tebing
  const distRoad = getDistanceToRoad(x, z);
  if (distRoad < 5.5) {
    let targetRoadH = 0.35;
    if (x < -140 && z < -130) targetRoadH = 2.00; // Koridor Astraea
    else if (x > 200 && z > 50) targetRoadH = 2.00; // Koridor Val-Kragor
    else if (x > 150 && z < 0) targetRoadH = 1.40; // Koridor Puing Kastil
    else if (z < -180) targetRoadH = 1.60; // Koridor Gurun Solaria

    const t = smoothstepBlend(0, 5.5, distRoad);
    return lerpVal(targetRoadH, basePlainsHeight, t);
  }

  return basePlainsHeight;
}

/**
 * 6. PROYEKSI KOORDINAT PERSENTASE PETA (worldToMapPercent & mapPercentToWorld)
 * Pemetaan linear 100% langsung dari WORLD_BOUNDS (1200 x 950)
 * X: -600..600 (1200 unit), Z: -600..350 (950 unit)
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
