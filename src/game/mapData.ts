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
    bounds: { minX: -90, maxX: 10, minZ: 100, maxZ: 180 },
    center: [-40, 145],
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
    bounds: { minX: 270, maxX: 350, minZ: 80, maxZ: 150 },
    center: [310, 115],
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
    bounds: { minX: -300, maxX: -220, minZ: -270, maxZ: -190 },
    center: [-260, -230],
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
    bounds: { minX: -370, maxX: -250, minZ: -540, maxZ: -420 },
    center: [-310, -480],
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
    bounds: { minX: 100, maxX: 220, minZ: -590, maxZ: -490 },
    center: [160, -540],
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
    bounds: { minX: 330, maxX: 430, minZ: -210, maxZ: -110 },
    center: [380, -160],
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
    bounds: { minX: 180, maxX: 260, minZ: -60, maxZ: 0 },
    center: [220, -30],
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
    bounds: { minX: 420, maxX: 510, minZ: 0, maxZ: 70 },
    center: [465, 35],
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
    bounds: { minX: -60, maxX: 560, minZ: -540, maxZ: -100 },
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
    bounds: { minX: -100, maxX: 20, minZ: 280, maxZ: 400 },
    center: [-40, 340],
    recommendedLevel: 10,
  },
  {
    id: 'kawah_cacing_purba',
    name: 'Colosseum of Titan Kuno',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    icon: '🗿',
    description: 'A colossal ancient colosseum arena in the northern desert, domain of the legendary Boss Titan Kuno.',
    descriptionId: 'Arena reruntuhan colosseum kuno megah di utara Gurun Solaria, arena World Boss Titan Kuno.',
    color: '#ea580c',
    bounds: { minX: 180, maxX: 290, minZ: -430, maxZ: -330 },
    center: [235, -380],
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
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    regionId: 'desa_eldoria',
    icon: '🏡',
    pos: [-35, 135],
    desc: 'Pusat pemukiman awal di pesisir selatan padang rumput Eldoria',
  },
  {
    id: 'wp_harbor',
    nameId: 'Pelabuhan Sanctuary',
    regionId: 'desa_eldoria',
    icon: '⛵',
    pos: [-20, 185],
    desc: 'Pelabuhan pesisir selatan menghadap langsung ke Samudra Azure terbuka',
  },
  {
    id: 'wp_titan',
    nameId: 'Lembah Danau Titan Kuno',
    regionId: 'danau_titan',
    icon: '🏔️',
    pos: [-310, -480],
    desc: 'Danau purba berair jernih di ketinggian pegunungan salju barat laut',
  },
  {
    id: 'wp_astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    regionId: 'kerajaan_astraea',
    icon: '👑',
    pos: [-250, -240],
    desc: 'Ibukota megah berdinding marmer emas dan tahta Kaisar Aurelius',
  },
  {
    id: 'wp_canyon',
    nameId: 'Kanyon Kuno',
    regionId: 'ancient_canyon',
    icon: '🏜️',
    pos: [160, -540],
    desc: 'Tebing bebatuan cadas merah terjal bertingkat di perbatasan utara gurun',
  },
  {
    id: 'wp_pyramid',
    nameId: 'Piramida Emas Solaria',
    regionId: 'gurun_solaria',
    icon: '🏛️',
    pos: [30, -350],
    desc: 'Monumen piramida emas kuno di tengah bukit pasir emas Solaria',
  },
  {
    id: 'wp_oasis',
    nameId: 'Oase Solaria',
    regionId: 'gurun_solaria',
    icon: '🌴',
    pos: [85, -230],
    desc: 'Sumber mata air tawar pirus segar dinaungi pohon kurma di gurun tengah',
  },
  {
    id: 'wp_boss_crater',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    regionId: 'kawah_cacing_purba',
    icon: '🗿',
    pos: [235, -380],
    desc: 'Arena reruntuhan colosseum kuno megah kediaman World Boss Titan Kuno',
  },
  {
    id: 'wp_sandworm',
    nameId: 'Sarang Cacing Purba Gurun',
    regionId: 'gurun_solaria',
    icon: '🪱',
    pos: [-30, -220],
    desc: 'Arena terbuka pusaran pasir habitat Cacing Raksasa Gurun di barat daya',
  },
  {
    id: 'wp_solaria_village',
    nameId: 'Desa Gurun & Bazaar Solaria',
    regionId: 'gurun_solaria',
    icon: '🏘️',
    pos: [135, -245],
    desc: 'Pemukiman rumah tanah liat dan pasar kafilah sutra & rempah dekat Oase Solaria',
  },
  {
    id: 'wp_sultan_palace',
    nameId: 'Istana Sultan Malik',
    regionId: 'gurun_solaria',
    icon: '🕌',
    pos: [410, -470],
    desc: 'Kompleks istana kubah marmer emas megah di pojok timur laut benua',
  },
  {
    id: 'wp_mist_forest',
    nameId: 'Hutan Kabut Eldoria',
    regionId: 'hutan_kabut',
    icon: '🌲',
    pos: [380, -160],
    desc: 'Hutan pinus lebat berkabut tebal misterius di perbukitan timur',
  },
  {
    id: 'wp_abandoned_castle',
    nameId: 'Puing Kastil Terbengkalai',
    regionId: 'puing_kastil',
    icon: '🏰',
    pos: [220, -30],
    desc: 'Reruntuhan benteng kastil masa lalu dengan pilar batu slate runtuh',
  },
  {
    id: 'wp_valkragor',
    nameId: 'Desa Benteng Val-Kragor',
    regionId: 'desa_valkragor',
    icon: '🛡️',
    pos: [310, 115],
    desc: 'Benteng pertahanan tangguh di perbatasan padang rumput tenggara',
  },
  {
    id: 'wp_moss_valley',
    nameId: 'Lembah Batu Lumut',
    regionId: 'lembah_batu_lumut',
    icon: '🪨',
    pos: [465, 35],
    desc: 'Lembah tersembunyi penuh gugusan batu purba berlumut di timur dekat sungai',
  },
  {
    id: 'wp_thunderpeak',
    nameId: 'Mage Tower Puncak Halilintar',
    regionId: 'desa_eldoria',
    icon: '⚡',
    pos: [110, -10],
    desc: 'Menara penyihir megah di perbukitan padang rumput dekat persimpangan jalan',
  },
  {
    id: 'wp_dragoncaldera',
    nameId: 'Kaldera Sarang Naga',
    regionId: 'kaldera_naga_api',
    icon: '🐉',
    pos: [-40, 340],
    desc: 'Pulau kawah lava vulkanik di seberang laut selatan dan sarang Boss Naga',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // 1. Dragonfang Caldera & Volcano Island
  if (Math.hypot(x - -40, z - 340) <= 65) {
    return REGIONS.find((r) => r.id === 'kaldera_naga_api') || REGIONS[10];
  }

  // 2. Kawah Cacat World Boss Titan Kuno [235, -380]
  if (Math.hypot(x - 235, z - -380) <= 55) {
    return REGIONS.find((r) => r.id === 'kawah_cacing_purba') || REGIONS[11];
  }

  // 3. Danau Titan Kuno [-310, -480]
  if (Math.hypot(x - -310, z - -480) <= 85) {
    return REGIONS.find((r) => r.id === 'danau_titan') || REGIONS[4];
  }

  // 4. Astraea [-260, -230]
  if (Math.hypot(x - -260, z - -230) <= 65) {
    return REGIONS.find((r) => r.id === 'kerajaan_astraea') || REGIONS[3];
  }

  // 5. Kanyon Kuno [160, -540]
  if (Math.hypot(x - 160, z - -540) <= 80) {
    return REGIONS.find((r) => r.id === 'ancient_canyon') || REGIONS[5];
  }

  // 6. Hutan Kabut Eldoria [380, -160]
  if (Math.hypot(x - 380, z - -160) <= 65) {
    return REGIONS.find((r) => r.id === 'hutan_kabut') || REGIONS[6];
  }

  // 7. Puing Kastil Terbengkalai [220, -30]
  if (Math.hypot(x - 220, z - -30) <= 45) {
    return REGIONS.find((r) => r.id === 'puing_kastil') || REGIONS[7];
  }

  // 8. Benteng Val-Kragor [310, 115]
  if (Math.hypot(x - 310, z - 115) <= 50) {
    return REGIONS.find((r) => r.id === 'desa_valkragor') || REGIONS[2];
  }

  // 9. Lembah Batu Lumut [465, 35]
  if (Math.hypot(x - 465, z - 35) <= 50) {
    return REGIONS.find((r) => r.id === 'lembah_batu_lumut') || REGIONS[8];
  }

  // 10. South & East Ocean
  if (z > 215 || x < -520 || (x > 550 && z > -50)) {
    return REGIONS[1];
  }

  // 11. Solaria Golden Desert
  if (isDesertBiome(x, z)) {
    return REGIONS.find((r) => r.id === 'gurun_solaria') || REGIONS[9];
  }

  // Default: Desa Utama & Padang Rumput Eldoria
  return REGIONS[0];
}
