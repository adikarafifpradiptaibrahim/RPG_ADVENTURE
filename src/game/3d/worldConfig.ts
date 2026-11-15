/**
 * WORLD_CONFIG - Single Source of Truth for World Dimensions, Boundaries,
 * Precision Landmarks, Rivers, Roads, and Projections.
 * 100% synchronized with illustrated reference map 1c0c5afc-239a-45a4-b086-037637bd88af.png
 */

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WORLD_BOUNDS: WorldBounds = {
  minX: -500,
  maxX: 500,
  minZ: -550,
  maxZ: 350,
};

export interface LandmarkConfig {
  id: string;
  name: string;
  nameId: string;
  x: number;
  z: number;
  pctX: number; // percentage left on reference map (0..100)
  pctY: number; // percentage top on reference map (0..100)
  level: number;
  isBoss?: boolean;
  desc: string;
  color: string;
  icon: string;
  waypointId?: string;
}

export const WORLD_LANDMARKS: LandmarkConfig[] = [
  {
    id: 'danau_titan',
    name: 'Ancient Titan Lake Valley',
    nameId: 'Lembah Danau Titan Kuno',
    x: -260,
    z: -420,
    pctX: 24.0,
    pctY: 15.0,
    level: 8,
    desc: 'Danau air biru purba dikelilingi pegunungan es/salju di barat laut, hulu utama aliran sungai Eldoria.',
    color: '#38bdf8',
    icon: '🏔️',
    waypointId: 'wp_titan',
  },
  {
    id: 'astraea',
    name: 'Imperial Capital Astraea & Sun Palace',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    x: -250,
    z: -210,
    pctX: 23.5,
    pctY: 37.5,
    level: 5,
    desc: 'Kompleks benteng kastil besar berpilar emas putih dan tahta Kaisar Aurelius di selatan danau.',
    color: '#fbbf24',
    icon: '👑',
    waypointId: 'wp_astraea',
  },
  {
    id: 'canyon',
    name: 'Ancient Canyon',
    nameId: 'Kanyon Kuno',
    x: 110,
    z: -490,
    pctX: 62.0,
    pctY: 8.0,
    level: 9,
    desc: 'Tebing batu merah bertingkat dan ngarai cadas terjal di utara tengah perbatasan benua.',
    color: '#ea580c',
    icon: '🏜️',
    waypointId: 'wp_canyon',
  },
  {
    id: 'pyramid',
    name: 'Solaria Golden Pyramid',
    nameId: 'Piramida Emas Solaria',
    x: 10,
    z: -340,
    pctX: 52.0,
    pctY: 24.0,
    level: 6,
    desc: 'Dua monumen piramida emas kuno peninggalan peradaban firaun matahari di bukit pasir gurun tengah.',
    color: '#eab308',
    icon: '🏜️',
    waypointId: 'wp_pyramid',
  },
  {
    id: 'oasis',
    name: 'Hidden Solaria Oasis',
    nameId: 'Oase Solaria',
    x: 55,
    z: -250,
    pctX: 55.0,
    pctY: 33.0,
    level: 5,
    desc: 'Kolam mata air tawar jernih alami dinaungi rumpun pohon palem kurma di tengah padang gurun.',
    color: '#14b8a6',
    icon: '🌴',
    waypointId: 'wp_oasis',
  },
  {
    id: 'kawah_boss',
    name: 'Ancient Sandworm Sinkhole',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    x: 225,
    z: -380,
    pctX: 73.5,
    pctY: 20.0,
    level: 10,
    isBoss: true,
    desc: 'Cekungan kawah pasir hisap raksasa berpagar batu, arena pertarungan World Boss Cacing Purba Jarrus.',
    color: '#ea580c',
    icon: '🪱',
    waypointId: 'wp_boss_crater',
  },
  {
    id: 'sultan_palace',
    name: 'Sultan Malik Grand Palace',
    nameId: 'Istana Sultan Malik',
    x: 355,
    z: -440,
    pctX: 85.0,
    pctY: 12.0,
    level: 7,
    desc: 'Kompleks istana megah kubah emas penguasa Gurun Pasir Solaria di pojok timur laut benua.',
    color: '#d97706',
    icon: '🕌',
    waypointId: 'wp_sultan_palace',
  },
  {
    id: 'mist_forest',
    name: 'Eldoria Mist Forest',
    nameId: 'Hutan Kabut Eldoria',
    x: 335,
    z: -140,
    pctX: 84.0,
    pctY: 43.0,
    level: 4,
    desc: 'Hutan pohon pinus & oak raksasa gelap yang senantiasa diselimuti kabut atmosfer rendah misterius.',
    color: '#15803d',
    icon: '🌲',
    waypointId: 'wp_mist_forest',
  },
  {
    id: 'abandoned_castle',
    name: 'Abandoned Castle Ruins',
    nameId: 'Puing Kastil Terbengkalai',
    x: 225,
    z: -35,
    pctX: 72.0,
    pctY: 53.0,
    level: 5,
    desc: 'Reruntuhan tembok benteng kastil masa lalu, menara patah, dan pilar batu roboh.',
    color: '#64748b',
    icon: '🏰',
    waypointId: 'wp_abandoned_castle',
  },
  {
    id: 'valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    x: 315,
    z: 95,
    pctX: 82.0,
    pctY: 67.5,
    level: 4,
    desc: 'Desa berpagar benteng kayu runcing & tembok batu slate dengan rumah atap merah di tenggara.',
    color: '#3b82f6',
    icon: '🛡️',
    waypointId: 'wp_valkragor',
  },
  {
    id: 'moss_valley',
    name: 'Moss Rock Valley',
    nameId: 'Lembah Batu Lumut',
    x: 455,
    z: 35,
    pctX: 93.0,
    pctY: 57.0,
    level: 5,
    desc: 'Lembah hijau terisolasi di ujung timur, dipagari pegunungan hijau di timur dan sungai di barat, penuh batu megalit berlumut.',
    color: '#65a30d',
    icon: '🪨',
    waypointId: 'wp_moss_valley',
  },
  {
    id: 'village',
    name: 'Sanctuary Village & Central Plains',
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    x: 25,
    z: 135,
    pctX: 52.5,
    pctY: 70.0,
    level: 1,
    desc: 'Pemukiman sentral awal para petualang di padang rumput pesisir selatan Eldoria dengan rumah, kebun, & jalan.',
    color: '#65a30d',
    icon: '🏡',
    waypointId: 'wp_village',
  },
  {
    id: 'harbor',
    name: 'Sanctuary Harbor',
    nameId: 'Pelabuhan Sanctuary',
    x: -135,
    z: 145,
    pctX: 33.0,
    pctY: 75.0,
    level: 1,
    desc: 'Dermaga kayu pelabuhan menjorok ke Samudra Azure di pesisir barat daya.',
    color: '#06b6d4',
    icon: '⛵',
    waypointId: 'wp_harbor',
  },
  {
    id: 'caldera',
    name: 'Dragonfang Caldera',
    nameId: 'Kaldera Sarang Naga',
    x: -85,
    z: 265,
    pctX: 41.0,
    pctY: 88.0,
    level: 10,
    isBoss: true,
    desc: 'Pulau vulkanik lahar merah di laut selatan, terhubung jembatan panjang dari daratan, sarang Naga Purba Ignis.',
    color: '#dc2626',
    icon: '🐉',
    waypointId: 'wp_caldera',
  },
];

/**
 * Mengonversi koordinat dunia 3D (x, z) ke persentase koordinat gambar worldMapTexture (0..100%).
 * Menggunakan proyeksi affine dasar yang diperhalus dengan Inverse Distance Weighting (IDW)
 * pada 14 titik jangkar untuk memastikan 100% presisi identik pada setiap landmark utama.
 */
export function worldToMapPercent(x: number, z: number): {
  xPercent: number;
  yPercent: number;
  left: string;
  top: string;
} {
  const basePX = 0.1010 * x - 0.0025 * z + 49.15;
  const basePY = -0.0051 * x + 0.1024 * z + 58.42;

  let wSum = 0;
  let rXSum = 0;
  let rYSum = 0;
  const p = 2;

  for (const a of WORLD_LANDMARKS) {
    const d = Math.hypot(x - a.x, z - a.z);
    if (d < 1e-4) {
      return {
        xPercent: a.pctX,
        yPercent: a.pctY,
        left: `${a.pctX.toFixed(2)}%`,
        top: `${a.pctY.toFixed(2)}%`,
      };
    }
    const aBasePX = 0.1010 * a.x - 0.0025 * a.z + 49.15;
    const aBasePY = -0.0051 * a.x + 0.1024 * a.z + 58.42;
    const resX = a.pctX - aBasePX;
    const resY = a.pctY - aBasePY;
    const w = 1 / Math.pow(d + 32, p);
    wSum += w;
    rXSum += w * resX;
    rYSum += w * resY;
  }

  const xPercent = Math.max(0, Math.min(100, basePX + rXSum / wSum));
  const yPercent = Math.max(0, Math.min(100, basePY + rYSum / wSum));

  return {
    xPercent,
    yPercent,
    left: `${xPercent.toFixed(2)}%`,
    top: `${yPercent.toFixed(2)}%`,
  };
}

/**
 * Konversi terbalik dari persentase peta (0..100) ke koordinat dunia 3D (x, z) untuk fast travel.
 */
export function mapPercentToWorld(pctX: number, pctY: number): { x: number; z: number } {
  const match = WORLD_LANDMARKS.find(
    (a) => Math.hypot(pctX - a.pctX, pctY - a.pctY) < 0.8
  );
  if (match) {
    return { x: match.x, z: match.z };
  }

  const x = (pctX - 49.15) / 0.1010;
  const z = (pctY - 58.42) / 0.1024;
  return { x, z };
}
