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

/**
 * 3. JARINGAN JALAN RAYA & JEMBATAN (ROAD_SPLINES & BRIDGE_CONFIGS)
 */
export interface RoadSplineDef {
  id: string;
  name: string;
  width: number;
  points: [number, number][];
}

export const ROAD_SPLINES: RoadSplineDef[] = [
  // A. Jalan Poros Barat: Desa Utama (-35, 135) -> Astraea (-250, -210)
  {
    id: 'road_west',
    name: 'Jalan Poros Barat: Desa - Astraea',
    width: 3.2,
    points: [
      [-35, 135],
      [-75, 135],   // Gerbang Barat Desa
      [-120, 120],
      [-180, 120],
      [-220, 40],
      [-245, -60],
      [-250, -140],
      [-250, -210], // Ujung jalan tepat di Gerbang Selatan Astraea
    ],
  },
  // B. Jalan Poros Selatan / Pelabuhan: Desa Utama (-35, 135) -> Pelabuhan Sanctuary (-20, 185)
  {
    id: 'road_harbor',
    name: 'Jalan Poros Selatan: Desa - Pelabuhan Sanctuary',
    width: 3.4,
    points: [
      [-35, 135],
      [-25, 155],
      [-20, 170],
      [-20, 185],   // Menghubungkan langsung alun-alun desa ke dermaga kayu Pelabuhan
    ],
  },
  // C. Jalan Poros Utara: Desa Utama (-35, 135) -> Persimpangan Titik Temu Tengah (-35, 45)
  {
    id: 'road_north',
    name: 'Jalan Poros Utara: Desa - Persimpangan Sungai',
    width: 3.0,
    points: [
      [-35, 135],
      [-35, 105],   // Gerbang Utara Desa
      [-35, 75],
      [-35, 45],    // Titik Temu Confluence
    ],
  },
  // D. Jalan Poros Timur: Desa Utama (-35, 135) -> Jembatan Gantung (15, 110) -> Val-Kragor (284, 115)
  {
    id: 'road_east',
    name: 'Jalan Poros Timur: Desa - Jembatan - Benteng Val-Kragor',
    width: 3.2,
    points: [
      [-35, 135],
      [-10, 130],
      [0, 120],
      [15, 110],   // Menyeberang Jembatan Gantung Sungai Selatan
      [60, 70],
      [110, 35],   // Pertigaan Menara Puncak Halilintar
      [180, 50],
      [240, 70],
      [260, 95],
      [284, 115],  // Tepat menyambung ke Gerbang Barat Benteng Val-Kragor
    ],
  },
  // E. Akses Lembah Batu Lumut: Val-Kragor (336, 115) -> Jembatan (380, 35) -> Lembah (465, 35)
  {
    id: 'road_moss_valley',
    name: 'Jalan Setapak Akses Lembah Batu Lumut',
    width: 2.6,
    points: [
      [336, 115],  // Keluar dari sisi timur Val-Kragor
      [360, 75],
      [380, 35],   // Titik Penyeberangan Jembatan Sungai Timur
      [420, 35],
      [465, 35],   // Glade Alami Lembah Batu Lumut
    ],
  },
  // F. Jalur Kafilah Gurun Solaria
  {
    id: 'road_desert_caravan',
    name: 'Jalur Kafilah Pasir Gurun Solaria',
    width: 4.0,
    points: [
      [110, 35],    // Cabang dari Pertigaan Menara
      [85, -230],   // Oase Solaria
      [30, -350],   // Piramida Emas
      [140, -370],  // Jalur Pasir Gurun Terbuka
      [340, -425],  // Timur Kawah (Bebas Halangan)
      [430, -460],  // Istana Sultan Malik
    ],
  },
];

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
    rotationY: 0,
    length: 22,
    width: 4.8,
    type: 'suspension',
  },
  {
    id: 'bridge_moss_valley',
    name: 'Moss Rock Valley River Bridge',
    nameId: 'Jembatan 3: Jembatan Sungai Lembah Lumut',
    x: 380,
    z: 35,
    rotationY: 0,
    length: 24,
    width: 4.8,
    type: 'wood',
  },
];

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
    x: -20,
    z: 185,
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

  // A. Palung Sungai (Carve deep riverbed Y = -2.5 secara kontinu, tanpa urugan tanah!)
  const distRiver = getDistanceToRiver(x, z);
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
  // 1. Desa Utama Sanctuary [-35, 135] (Dataran rata aman)
  const distVillage = Math.hypot(x - -35, z - 135);
  if (distVillage <= 40) return 0.25;

  // 2. Pelabuhan Sanctuary [-20, 185]
  if (Math.hypot(x - -20, z - 185) <= 25) return 0.35;

  // 3. Ibukota Kerajaan Emas Astraea [-250, -240] (Smoothstep blend ke luar tembok)
  const distAstraea = Math.hypot(x - -250, z - -240);
  if (distAstraea <= 50) return 2.00;
  if (distAstraea <= 85) {
    const t = smoothstepBlend(50, 85, distAstraea);
    return lerpVal(2.00, basePlainsHeight, t);
  }

  // 4. Desa Benteng Val-Kragor [310, 115] (Smoothstep blend ke luar benteng)
  const distValKragor = Math.hypot(x - 310, z - 115);
  if (distValKragor <= 45) return 2.00;
  if (distValKragor <= 80) {
    const t = smoothstepBlend(45, 80, distValKragor);
    return lerpVal(2.00, basePlainsHeight, t);
  }

  // 5. Puing Kastil Terbengkalai [220, -30]
  if (Math.hypot(x - 220, z - -30) <= 35) return 1.40;

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

  // 10. Jalan Raya Utama
  if (isPointOnRoad(x, z, 2.5)) {
    return 0.35;
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
