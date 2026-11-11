import { RegionInfo, MapMarker } from '../types/game';
import { isDesertBiome } from './mapSampler';

export const REGIONS: RegionInfo[] = [
  {
    id: 'desa_eldoria',
    name: 'Sanctuary Village & Central Plains',
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    icon: '🏡',
    description: 'A thriving coastal settlement with wooden cottages, busy harbor docks, merchant galleons, and wide open grassland plains.',
    descriptionId: 'Pusat desa damai dan padang rumput hijau luas Eldoria dengan rumah panggung kayu, pelabuhan kapal dagang, bengkel tempa, serta perbukitan landai terbuka di pesisir selatan.',
    color: '#65a30d',
    bounds: { minX: -60, maxX: 100, minZ: 70, maxZ: 170 },
    center: [20, 130],
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
    bounds: { minX: -580, maxX: 680, minZ: 185, maxZ: 460 },
    center: [20, 220],
    recommendedLevel: 2,
  },
  {
    id: 'desa_valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    icon: '🛡️',
    description: 'A heavily fortified stronghold with stone ramparts, corner watchtowers, garrison keep, and spiked defense barricades situated in the open eastern plains.',
    descriptionId: 'Desa benteng pertahanan mandiri di padang rumput tenggara yang lapang! Dilengkapi tembok slate kokoh, menara pengawas, barikade runcing, dan markas Komandan Brann.',
    color: '#64748b',
    bounds: { minX: 290, maxX: 370, minZ: 50, maxZ: 130 },
    center: [330, 90],
    recommendedLevel: 4,
  },
  {
    id: 'kerajaan_astraea',
    name: 'Grand Imperial Kingdom of Astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    icon: '👑',
    description: 'A colossal imperial metropolis situated across the peaceful north-west plains, featuring the grand Sun Palace, towering marble colonnades, royal bazaar, and the Fountain of Immortality.',
    descriptionId: 'Ibukota kerajaan emas megah di dataran padang rumput barat laut yang damai! Gerbang Barat megah, Istana Kaisar Aurelius, dan alun-alun marmer putih berair mancur abadi.',
    color: '#fbbf24',
    bounds: { minX: -310, maxX: -210, minZ: -280, maxZ: -200 },
    center: [-260, -240],
    recommendedLevel: 5,
  },
  {
    id: 'danau_titan',
    name: 'Ancient Titan Lake Valley',
    nameId: 'Lembah Danau Titan Kuno',
    icon: '🏔️',
    description: 'A crystalline glacial mountain lake surrounded by snow-capped peaks in the far northwest, headwaters of the Eldorian rivers.',
    descriptionId: 'Danau purba berair biru jernih di kaki pegunungan salju barat laut, hulu utama aliran sungai Eldoria.',
    color: '#38bdf8',
    bounds: { minX: -320, maxX: -200, minZ: -520, maxZ: -380 },
    center: [-260, -450],
    recommendedLevel: 8,
  },
  {
    id: 'ancient_canyon',
    name: 'Ancient Canyon',
    nameId: 'Kanyon Kuno',
    icon: '🏜️',
    description: 'Sheer towering terracotta canyon cliffs and sandstone mesas in the far northern reaches.',
    descriptionId: 'Jurang bebatuan cadas merah terjal dan tebing sandstone di perbatasan gurun paling utara benua.',
    color: '#ea580c',
    bounds: { minX: 0, maxX: 120, minZ: -560, maxZ: -480 },
    center: [50, -520],
    recommendedLevel: 9,
  },
  {
    id: 'hutan_kabut',
    name: 'Eldoria Mist Forest',
    nameId: 'Hutan Kabut Eldoria',
    icon: '🌲',
    description: 'Dense dark spruce wilderness draped in perpetual mysterious fog in the eastern hills.',
    descriptionId: 'Hutan pinus lebat yang senantiasa diselimuti kabut tebal misterius di perbukitan timur.',
    color: '#15803d',
    bounds: { minX: 340, maxX: 430, minZ: -190, maxZ: -90 },
    center: [380, -140],
    recommendedLevel: 4,
  },
  {
    id: 'puing_kastil',
    name: 'Abandoned Castle Ruins',
    nameId: 'Puing Kastil Terbengkalai',
    icon: '🏰',
    description: 'Ancient dilapidated castle walls, broken watchtowers, and weathered slate courtyards.',
    descriptionId: 'Reruntuhan kastil megah masa lalu dengan benteng runtuh dan pilar batu kuno berlumut.',
    color: '#64748b',
    bounds: { minX: 190, maxX: 270, minZ: -90, maxZ: -30 },
    center: [230, -60],
    recommendedLevel: 5,
  },
  {
    id: 'lembah_batu_lumut',
    name: 'Moss Rock Valley',
    nameId: 'Lembah Batu Lumut',
    icon: '🪨',
    description: 'A secluded sanctuary of giant mossy megaliths, blooming glade flora, and glowing spores.',
    descriptionId: 'Lembah tersembunyi penuh gugusan batu purba berlumut dan pendar spora mistis.',
    color: '#65a30d',
    bounds: { minX: 440, maxX: 520, minZ: -10, maxZ: 50 },
    center: [480, 20],
    recommendedLevel: 5,
  },
  {
    id: 'gurun_solaria',
    name: 'Solaria Golden Desert & Palace',
    nameId: 'Gurun Emas Solaria, Piramida & Istana Sultan',
    icon: '🕌',
    description: 'Endless rolling golden sand dunes, the bustling mud-brick Desert Village of Solaria, the Grand Palace of Sultan Malik, and the ancient pharaoh pyramid.',
    descriptionId: 'Hamparan padang pasir emas di wilayah utara dan timur benua! Menampung Piramida Emas, Oase Solaria, dan Istana Megah Sultan Malik.',
    color: '#eab308',
    bounds: { minX: -80, maxX: 560, minZ: -540, maxZ: -100 },
    center: [160, -280],
    recommendedLevel: 6,
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
    recommendedLevel: 10,
  },
  {
    id: 'kawah_cacing_purba',
    name: 'Lair of The Ancient Sandworm Jarrus',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    icon: '🪱',
    description: 'A colossal sinkhole depression in the eastern desert dunes, domain of the legendary Devourer Sandworm Jarrus.',
    descriptionId: 'Kawah pusaran pasir raksasa yang curam di pedalaman timur laut Gurun Solaria, arena World Boss Cacing Purba Jarrus.',
    color: '#ea580c',
    bounds: { minX: 170, maxX: 250, minZ: -400, maxZ: -320 },
    center: [210, -360],
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
    nameId: 'Desa Utama Sanctuary Eldoria',
    regionId: 'desa_eldoria',
    icon: '🏡',
    pos: [20, 130],
    desc: 'Pusat pemukiman awal di pesisir selatan padang rumput Eldoria',
  },
  {
    id: 'wp_harbor',
    nameId: 'Dermaga & Pelabuhan Sanctuary',
    regionId: 'desa_eldoria',
    icon: '⛵',
    pos: [20, 180],
    desc: 'Pelabuhan pesisir selatan menghadap langsung ke Samudra Azure terbuka',
  },
  {
    id: 'wp_titan',
    nameId: 'Lembah Danau Titan Kuno',
    regionId: 'danau_titan',
    icon: '🏔️',
    pos: [-260, -450],
    desc: 'Danau purba berair jernih di kaki pegunungan salju barat laut',
  },
  {
    id: 'wp_astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea',
    regionId: 'kerajaan_astraea',
    icon: '👑',
    pos: [-260, -240],
    desc: 'Ibukota megah berdinding marmer emas dan tahta Kaisar Aurelius',
  },
  {
    id: 'wp_canyon',
    nameId: 'Kanyon Kuno',
    regionId: 'ancient_canyon',
    icon: '🏜️',
    pos: [50, -520],
    desc: 'Tebing cadas merah dan jurang sandstone terjal di utara',
  },
  {
    id: 'wp_pyramid',
    nameId: 'Piramida Emas Solaria',
    regionId: 'gurun_solaria',
    icon: '🏜️',
    pos: [-20, -320],
    desc: 'Monumen piramida batu pasir kuno di tengah bukit pasir emas Solaria',
  },
  {
    id: 'wp_oasis',
    nameId: 'Oase Solaria',
    regionId: 'gurun_solaria',
    icon: '🌴',
    pos: [20, -240],
    desc: 'Sumber mata air tawar pirus segar dinaungi pohon kurma di gurun tengah',
  },
  {
    id: 'wp_boss_crater',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    regionId: 'kawah_cacing_purba',
    icon: '🪱',
    pos: [210, -360],
    desc: 'Arena kawah pasir hisap raksasa World Boss Cacing Purba Jarrus',
  },
  {
    id: 'wp_sultan_palace',
    nameId: 'Istana Sultan Malik',
    regionId: 'gurun_solaria',
    icon: '🕌',
    pos: [360, -440],
    desc: 'Kompleks istana kubah marmer emas megah di pojok timur laut benua',
  },
  {
    id: 'wp_mist_forest',
    nameId: 'Hutan Kabut Eldoria',
    regionId: 'hutan_kabut',
    icon: '🌲',
    pos: [380, -140],
    desc: 'Hutan pinus lebat berkabut tebal misterius di perbukitan timur',
  },
  {
    id: 'wp_abandoned_castle',
    nameId: 'Puing Kastil Terbengkalai',
    regionId: 'puing_kastil',
    icon: '🏰',
    pos: [230, -60],
    desc: 'Reruntuhan benteng kastil masa lalu dengan pilar batu slate runtuh',
  },
  {
    id: 'wp_valkragor',
    nameId: 'Desa Benteng Val-Kragor',
    regionId: 'desa_valkragor',
    icon: '🛡️',
    pos: [330, 90],
    desc: 'Benteng pertahanan tangguh di perbatasan padang rumput tenggara',
  },
  {
    id: 'wp_moss_valley',
    nameId: 'Lembah Batu Lumut',
    regionId: 'lembah_batu_lumut',
    icon: '🪨',
    pos: [480, 20],
    desc: 'Lembah tersembunyi penuh gugusan batu purba berlumut di timur dekat sungai',
  },
  {
    id: 'wp_thunderpeak',
    nameId: 'Mage Tower Puncak Halilintar',
    regionId: 'desa_eldoria',
    icon: '⚡',
    pos: [70, 20],
    desc: 'Menara penyihir megah di bukit padang rumput timur tengah dekat sungai',
  },
  {
    id: 'wp_dragoncaldera',
    nameId: 'Kaldera Sarang Naga Purba',
    regionId: 'kaldera_naga_api',
    icon: '🐉',
    pos: [80, 360],
    desc: 'Pulau kawah lava vulkanik di seberang laut selatan dan sarang Boss Naga Ignis',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // 1. Dragonfang Caldera & Volcano Island
  if (Math.hypot(x - 80, z - 360) <= 85) {
    return REGIONS.find((r) => r.id === 'kaldera_naga_api') || REGIONS[10];
  }

  // 2. Kawah Cacat World Boss [210, -360]
  if (Math.hypot(x - 210, z - -360) <= 45) {
    return REGIONS.find((r) => r.id === 'kawah_cacing_purba') || REGIONS[11];
  }

  // 3. Danau Titan Kuno [-260, -450]
  if (Math.hypot(x - -260, z - -450) <= 75) {
    return REGIONS.find((r) => r.id === 'danau_titan') || REGIONS[4];
  }

  // 4. Astraea [-260, -240]
  if (Math.hypot(x - -260, z - -240) <= 50) {
    return REGIONS.find((r) => r.id === 'kerajaan_astraea') || REGIONS[3];
  }

  // 5. Kanyon Kuno [50, -520]
  if (Math.hypot(x - 50, z - -520) <= 70) {
    return REGIONS.find((r) => r.id === 'ancient_canyon') || REGIONS[5];
  }

  // 6. Hutan Kabut Eldoria [380, -140]
  if (Math.hypot(x - 380, z - -140) <= 55) {
    return REGIONS.find((r) => r.id === 'hutan_kabut') || REGIONS[6];
  }

  // 7. Puing Kastil Terbengkalai [230, -60]
  if (Math.hypot(x - 230, z - -60) <= 38) {
    return REGIONS.find((r) => r.id === 'puing_kastil') || REGIONS[7];
  }

  // 8. Benteng Val-Kragor [330, 90]
  if (Math.hypot(x - 330, z - 90) <= 45) {
    return REGIONS.find((r) => r.id === 'desa_valkragor') || REGIONS[2];
  }

  // 9. Lembah Batu Lumut [480, 20]
  if (Math.hypot(x - 480, z - 20) <= 45) {
    return REGIONS.find((r) => r.id === 'lembah_batu_lumut') || REGIONS[8];
  }

  // 10. South & East Ocean
  if (z > 200 || x < -450 || (x > 495 && z > -50)) {
    return REGIONS[1];
  }

  // 11. Solaria Golden Desert
  if (isDesertBiome(x, z)) {
    return REGIONS.find((r) => r.id === 'gurun_solaria') || REGIONS[9];
  }

  // Default: Desa Utama & Padang Rumput Eldoria
  return REGIONS[0];
}
