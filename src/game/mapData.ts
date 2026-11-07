import { RegionInfo, MapMarker } from '../types/game';

export const REGIONS: RegionInfo[] = [
  {
    id: 'desa_eldoria',
    name: 'Sanctuary Village & Central Plains',
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    icon: '🏡',
    description: 'A thriving coastal settlement with wooden cottages, busy harbor docks, merchant galleons, and wide open grassland plains.',
    descriptionId: 'Pusat desa damai dan padang rumput hijau luas Eldoria dengan rumah panggung kayu, pelabuhan kapal dagang, bengkel tempa, serta perbukitan landai terbuka di pesisir selatan.',
    color: '#65a30d',
    bounds: { minX: -500, maxX: 500, minZ: -60, maxZ: 220 },
    center: [0, 180],
    recommendedLevel: 1,
  },
  {
    id: 'pantai_azure',
    name: 'Azure Coast & South Ocean',
    nameId: 'Laut Biru & Samudra Azure',
    icon: '🌊',
    description: 'Sandy shores with gentle sea breezes, wooden docks, and shimmering ocean waves separating the mainland from the volcanic island.',
    descriptionId: 'Hamparan pasir pantai keemasan, dermaga kayu nelayan, perahu kayu, dan deburan ombak samudra biru luas yang memisahkan daratan utara dengan pulau vulkanik selatan.',
    color: '#0284c7',
    bounds: { minX: -580, maxX: 680, minZ: 220, maxZ: 460 },
    center: [0, 250],
    recommendedLevel: 2,
  },
  {
    id: 'desa_valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    icon: '🏰',
    description: 'A heavily fortified stronghold with stone ramparts, corner watchtowers, garrison keep, and spiked defense barricades situated in the open eastern plains.',
    descriptionId: 'Desa benteng pertahanan mandiri di padang rumput timur yang lapang! Dilengkapi tembok slate kokoh, menara pengawas, barikade runcing, dan markas Komandan Brann.',
    color: '#64748b',
    bounds: { minX: 340, maxX: 420, minZ: 40, maxZ: 120 },
    center: [380, 80],
    recommendedLevel: 4,
  },
  {
    id: 'kerajaan_astraea',
    name: 'Grand Imperial Kingdom of Astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    icon: '👑',
    description: 'A colossal imperial metropolis situated across the peaceful north-west plains, featuring the grand Sun Palace, towering marble colonnades, royal bazaar, and the Fountain of Immortality.',
    descriptionId: 'Ibukota kerajaan emas megah di dataran padang rumput barat laut yang damai! Gerbang Barat megah menghadap ke barat, Istana Kaisar Aurelius, dan alun-alun marmer putih berair mancur abadi.',
    color: '#fbbf24',
    bounds: { minX: -390, maxX: -290, minZ: -260, maxZ: -180 },
    center: [-340, -220],
    recommendedLevel: 5,
  },
  {
    id: 'kawah_obsidian',
    name: 'Ancient Titan Sanctuary Basin',
    nameId: 'Lembah Danau Cekungan Titan Kuno',
    icon: '🏛️',
    description: 'A circular ancient valley lake basin surrounded by rune-carved megaliths, home to the Ancient Obsidian Titan.',
    descriptionId: 'Cekungan danau lembah purba melingkar di padang rumput barat terpencil dikelilingi 8 megalit rune dan arena pertarungan Boss Sang Titan Kuno Obsidian.',
    color: '#0284c7',
    bounds: { minX: -290, maxX: -230, minZ: -50, maxZ: 10 },
    center: [-260, -20],
    recommendedLevel: 4,
  },
  {
    id: 'puncak_halilintar',
    name: 'Thunderpeak Spire & Mage Tower',
    nameId: 'Mage Tower Puncak Halilintar',
    icon: '⚡',
    description: 'A grand multi-floor Mage Tower sanctuary situated atop an elevated grassy hill in the east-central plains.',
    descriptionId: 'Menara penyihir megah bertingkat tiga di bukit padang rumput timur tengah, tempat dewan penyihir mengkaji astrologi dan ilmu sihir purba.',
    color: '#483d8b',
    bounds: { minX: 150, maxX: 210, minZ: 30, maxZ: 90 },
    center: [180, 60],
    recommendedLevel: 3,
  },
  {
    id: 'hutan_berbisik',
    name: 'Whispering Mystic Forest & Gorge',
    nameId: 'Hutan Pinus Mistis & Ngarai',
    icon: '🌲',
    description: 'Dense wilderness with towering pines, glowing mana crystals, and a suspension bridge over a misty chasm.',
    descriptionId: 'Hutan lebat dengan pohon pinus raksasa dan jembatan gantung kayu yang membentang di atas ngarai berkabut.',
    color: '#2e7d32',
    bounds: { minX: -90, maxX: -30, minZ: 70, maxZ: 150 },
    center: [-60, 110],
    recommendedLevel: 2,
  },
  {
    id: 'gurun_solaria',
    name: 'Solaria Golden Desert & Palace',
    nameId: 'Gurun Emas Solaria, Desa & Istana Sultan',
    icon: '🕌',
    description: 'Endless rolling golden sand dunes, the bustling mud-brick Desert Village of Solaria, the Grand Palace of Sultan Malik, and the ancient pharaoh pyramid.',
    descriptionId: 'Hamparan padang pasir emas di wilayah utara dan timur benua! Menampung Desa Bazaar Tanah Liat, Istana Megah Sultan Malik, piramida kuno pharaoh, dan oase tersembunyi.',
    color: '#eab308',
    bounds: { minX: -20, maxX: 560, minZ: -420, maxZ: -60 },
    center: [250, -280],
    recommendedLevel: 5,
  },
  {
    id: 'kaldera_naga_api',
    name: 'Dragonfang Caldera & Volcano Island',
    nameId: 'Kaldera Sarang Naga & Pulau Vulkanik',
    icon: '🐉',
    description: 'A blistering volcanic hellscape across the southern ocean featuring smoking magma pools, scorched basalt arches, and the primal dragon nest.',
    descriptionId: 'Wilayah pulau vulkanik berbahaya di seberang laut selatan! Aliran lahar pijar mendidih, kawah melingkar obsidian, dan arena pertarungan Boss Naga Purba Ignis.',
    color: '#dc2626',
    bounds: { minX: -80, maxX: 240, minZ: 275, maxZ: 445 },
    center: [80, 360],
    recommendedLevel: 7,
  },
  {
    id: 'kawah_cacing_purba',
    name: 'Lair of The Ancient Sandworm Jarrus',
    nameId: 'Sarang Sang Cacing Purba Solaria (Lv. 10)',
    icon: '🪱',
    description: 'A colossal sinkhole depression in the eastern desert dunes, domain of the legendary Devourer Sandworm Jarrus.',
    descriptionId: 'Kawah pusaran pasir raksasa yang curam di pedalaman timur Gurun Solaria, sarang predator purba pemangsa cacing raksasa Jarrus.',
    color: '#ea580c',
    bounds: { minX: 450, maxX: 540, minZ: -407, maxZ: -317 },
    center: [495, -362],
    recommendedLevel: 10,
  },
];

export const WAYPOINTS: {
  id: string;
  nameId: string;
  regionId: string;
  icon: string;
  pos: [number, number]; // [x, z]
  desc: string;
}[] = [
  {
    id: 'wp_village',
    nameId: 'Alun-Alun Desa Sanctuary Eldoria',
    regionId: 'desa_eldoria',
    icon: '⛲',
    pos: [0, 180],
    desc: 'Pusat desa awal di pesisir selatan padang rumput, dekat Tetua Vaelen dan air mancur suci',
  },
  {
    id: 'wp_harbor',
    nameId: 'Dermaga & Pelabuhan Sanctuary',
    regionId: 'desa_eldoria',
    icon: '⛵',
    pos: [0, 205],
    desc: 'Pelabuhan pesisir selatan menghadap langsung ke Samudra Azure terbuka',
  },
  {
    id: 'wp_titan',
    nameId: 'Lembah Danau Cekungan Titan Kuno',
    regionId: 'kawah_obsidian',
    icon: '🏛️',
    pos: [-260, -20],
    desc: 'Cekungan danau purba di padang rumput barat terpencil dan arena Titan Kuno',
  },
  {
    id: 'wp_astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea',
    regionId: 'kerajaan_astraea',
    icon: '👑',
    pos: [-340, -220],
    desc: 'Ibukota kerajaan megah di dataran padang rumput barat laut damai dan Istana Kaisar Aurelius',
  },
  {
    id: 'wp_valkragor',
    nameId: 'Alun-Alun Benteng Val-Kragor',
    regionId: 'desa_valkragor',
    icon: '🏰',
    pos: [380, 80],
    desc: 'Benteng pertahanan tangguh di padang rumput timur yang lapang dan markas Komandan Brann',
  },
  {
    id: 'wp_thunderpeak',
    nameId: 'Mage Tower Puncak Halilintar',
    regionId: 'puncak_halilintar',
    icon: '🧙‍♂️',
    pos: [180, 60],
    desc: 'Menara penyihir megah bertingkat tiga di bukit padang rumput timur tengah',
  },
  {
    id: 'wp_solaria_village',
    nameId: 'Desa Bazaar Gurun Solaria',
    regionId: 'gurun_solaria',
    icon: '🎪',
    pos: [250, -280],
    desc: 'Pemukiman tanah liat dan bazaar rempah eksotis di gurun utara-timur',
  },
  {
    id: 'wp_solaria_palace',
    nameId: 'Istana Taj Mahal Sultan Solaria',
    regionId: 'gurun_solaria',
    icon: '🕌',
    pos: [340, -280],
    desc: 'Kemegahan marmer putih arsitektur Taj Mahal dan Ruang Takhta Sultan Malik',
  },
  {
    id: 'wp_solaria',
    nameId: 'Piramida Emas Gurun Solaria',
    regionId: 'gurun_solaria',
    icon: '🏜️',
    pos: [20, -220],
    desc: 'Piramida kuno megah di gurun barat dan obelisk berukir hieroglif',
  },
  {
    id: 'wp_solaria_oasis',
    nameId: 'Oase Tersembunyi Solaria',
    regionId: 'gurun_solaria',
    icon: '🌴',
    pos: [150, -360],
    desc: 'Telaga mata air alami pirus segar dinaungi pohon palem kurma di gurun utara',
  },
  {
    id: 'wp_dragoncaldera',
    nameId: 'Kaldera Sarang Naga Purba',
    regionId: 'kaldera_naga_api',
    icon: '🐉',
    pos: [80, 360],
    desc: 'Pulau kawah lava vulkanik di seberang laut selatan dan sarang Boss Naga Ignis',
  },
  {
    id: 'wp_sandworm',
    nameId: 'Kawah Pusaran Sang Cacing Purba Jarrus',
    regionId: 'kawah_cacing_purba',
    icon: '🪱',
    pos: [495, -362],
    desc: 'Kawah pusaran pasir raksasa di pedalaman gurun timur tempat bersemayamnya World Boss Cacing Purba Jarrus (Lv. 10)',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // 0. Sandworm Lair Sinkhole (radius 45 unit from [495, -362])
  if (Math.hypot(x - 495, z - -362) <= 45) {
    return REGIONS.find((r) => r.id === 'kawah_cacing_purba') || REGIONS[7];
  }
  // 1. Dragonfang Caldera & Volcano Island (Curved Ellipse: cx = 80, cz = 360, rx = 160, rz = 85)
  const cx = 80;
  const cz = 360;
  const rx = 160;
  const rz = 85;
  const edgeNoise = Math.sin(x * 0.06) * 10 + Math.cos(z * 0.07) * 7;
  const distSq = Math.pow((x - cx) / (rx + edgeNoise), 2) + Math.pow((z - cz) / (rz + edgeNoise), 2);
  if (distSq <= 1.0) {
    return REGIONS[8];
  }

  // 2. Azure Ocean (Natural Wavy Coastline: z > southCoastZ || x < westCoastX)
  const southCoastZ = 190 + Math.sin(x * 0.012) * 20 + Math.cos(x * 0.035) * 8;
  const westCoastX = -460 + Math.sin(z * 0.015) * 35 + Math.cos(z * 0.04) * 15;
  if (z > southCoastZ || x < westCoastX) {
    return REGIONS[1];
  }

  // 3. Imperial Capital Astraea (North-West Plains: around [-340, -220])
  if (Math.hypot(x - -340, z - -220) <= 50) {
    return REGIONS[3];
  }

  // 4. Ancient Titan Basin (West Plains: around [-260, -20])
  if (Math.hypot(x - -260, z - -20) <= 30) {
    return REGIONS[4];
  }

  // 5. Benteng Val-Kragor (East Plains: around [380, 80])
  if (Math.hypot(x - 380, z - 80) <= 45) {
    return REGIONS[2];
  }

  // 6. Mage Tower Puncak Halilintar (East-Central Plains: around [180, 60])
  if (Math.hypot(x - 180, z - 60) <= 30) {
    return REGIONS[5];
  }

  // 7. Mystic Forest & Gorge
  if (x >= -90 && x <= -30 && z >= 70 && z <= 150) {
    return REGIONS[6];
  }

  // 8. Solaria Golden Desert (Continuous Boundary Curve without eastern cutoff)
  const desertCurveZ = -20 
    + Math.sin((x + 100) * 0.008) * 110 
    + Math.cos(x * 0.02) * 25;

  const desertCurveX = -60 
    + Math.sin((z + 100) * 0.012) * 50;

  if (x >= desertCurveX && z <= desertCurveZ) {
    return REGIONS[7];
  }

  // Default: Desa Sanctuary & Padang Rumput Eldoria
  return REGIONS[0];
}
