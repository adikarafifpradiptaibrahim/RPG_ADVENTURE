import { RegionInfo, MapMarker } from '../types/game';
import { isDesertBiome } from './mapSampler';
import { isMainContinentLand } from './3d/worldData';

export const REGIONS: RegionInfo[] = [
  {
    id: 'desa_eldoria',
    name: 'Sanctuary Village & Central Plains',
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    icon: '🏡',
    description: 'A thriving coastal settlement with wooden cottages, busy harbor docks, merchant galleons, and wide open grassland plains.',
    descriptionId: 'Pusat desa damai dan padang rumput hijau luas Eldoria dengan rumah panggung kayu, pelabuhan kapal dagang, bengkel tempa, serta perbukitan landai terbuka di pesisir selatan.',
    color: '#65a30d',
    bounds: { minX: -40, maxX: 80, minZ: -100, maxZ: 60 },
    center: [20, -50],
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
    bounds: { minX: -600, maxX: 700, minZ: 50, maxZ: 700 },
    center: [0, 300],
    recommendedLevel: 2,
  },
  {
    id: 'desa_valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    icon: '🛡️',
    description: 'A heavily fortified 110x110 stronghold with stone ramparts, integrated corner watchtowers, barracks, combat training yard, blacksmith, and commander keep.',
    descriptionId: 'Desa benteng megah 110x110 di tenggara! Dilengkapi 4 menara sudut kokoh, barak prajurit, lapangan latihan, bengkel tempa, rumah warga, serta Aula Komandan & Pandai Besi yang dapat dimasuki.',
    color: '#64748b',
    bounds: { minX: 520, maxX: 640, minZ: 70, maxZ: 190 },
    center: [580, 130],
    recommendedLevel: 4,
  },
  {
    id: 'kerajaan_astraea',
    name: 'Grand Imperial Kingdom of Astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    icon: '👑',
    description: 'A colossal 170x170 imperial metropolis featuring Grand Marble Plaza, medieval districts, bazaar shops & tavern, and Emperor Aurelius 2x Grand Sun Palace with twin-stair balconies.',
    descriptionId: 'Ibukota kerajaan medieval raksasa (~170x170) dengan Alun-Alun Utama marmer, distrik pasar & tavern, serta Istana Kaisar Aurelius 2x lebih megah lengkap dengan balkon Lantai 2!',
    color: '#fbbf24',
    bounds: { minX: 375, maxX: 545, minZ: -505, maxZ: -335 },
    center: [460, -420],
    recommendedLevel: 5,
  },
  {
    id: 'danau_titan',
    name: 'Ancient Titan Lake Valley',
    nameId: 'Lembah Danau Titan Kuno & Pegunungan Salju',
    icon: '🏔️',
    description: 'A crystalline glacial mountain lake surrounded by snow-capped peaks in the far north-central highlands, headwaters of the Eldorian rivers.',
    descriptionId: 'Danau purba berair biru jernih di kaki pegunungan salju utara tengah, hulu utama aliran sungai Eldoria.',
    color: '#38bdf8',
    bounds: { minX: -180, maxX: 260, minZ: -950, maxZ: -640 },
    center: [60, -820],
    recommendedLevel: 8,
  },
  {
    id: 'ancient_canyon',
    name: 'Ancient Canyon',
    nameId: 'Kanyon Kuno',
    icon: '🏜️',
    description: 'Sheer towering terracotta canyon cliffs and sandstone mesas in the far northern reaches of the west desert.',
    descriptionId: 'Jurang bebatuan cadas merah terjal dan tebing sandstone di perbatasan gurun paling utara benua.',
    color: '#ea580c',
    bounds: { minX: -460, maxX: -300, minZ: -720, maxZ: -560 },
    center: [-380, -640],
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
    bounds: { minX: 680, maxX: 840, minZ: -360, maxZ: -200 },
    center: [760, -280],
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
    bounds: { minX: 520, maxX: 640, minZ: -110, maxZ: -10 },
    center: [580, -60],
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
    bounds: { minX: 520, maxX: 640, minZ: -170, maxZ: -70 },
    center: [580, -120],
    recommendedLevel: 5,
  },
  {
    id: 'gurun_solaria',
    name: 'Solaria Golden Desert & Palace',
    nameId: 'Gurun Emas Solaria, Piramida & Istana Sultan',
    icon: '🕌',
    description: 'Endless rolling golden sand dunes, the bustling mud-brick Desert Village of Solaria, the Grand Palace of Sultan Malik, and the ancient pharaoh pyramid.',
    descriptionId: 'Hamparan padang pasir emas di wilayah barat benua! Menampung Piramida Emas, Oase Solaria, dan Istana Megah Sultan Malik.',
    color: '#eab308',
    bounds: { minX: -1150, maxX: -240, minZ: -750, maxZ: 150 },
    center: [-500, -420],
    recommendedLevel: 6,
  },
  {
    id: 'kaldera_naga_api',
    name: 'Dragonfang Caldera Archipelago',
    nameId: 'Kepulauan Kaldera Naga (Lv. 12)',
    icon: '🐉',
    description: 'A colossal volcanic caldera across the south sea featuring an enlarged obsidian arena island ringed by a blazing lava lake, crossed via a grand north obsidian bridge.',
    descriptionId: 'Kaldera vulkanik megah di samudra selatan dengan pulau altar basalt-obsidian luas dikelilingi danau lahar pijar, dihubungkan jembatan batu obsidian kolosal menuju sarang Naga Purba Ignis.',
    color: '#dc2626',
    bounds: { minX: -195, maxX: 195, minZ: 700, maxZ: 995 },
    center: [40, 840],
    recommendedLevel: 12,
  },
  {
    id: 'kawah_cacing_purba',
    name: 'Ancient Titan Colosseum Arena',
    nameId: 'Arena Colosseum Titan Kuno (Lv. 10)',
    icon: '🗿',
    description: 'A colossal ancient colosseum arena in the north rocky mountains, domain of the legendary Boss Titan Kuno.',
    descriptionId: 'Arena reruntuhan colosseum kuno megah di dataran tinggi pegunungan timur-utara, arena World Boss Titan Kuno.',
    color: '#ea580c',
    bounds: { minX: 120, maxX: 240, minZ: -620, maxZ: -500 },
    center: [180, -560],
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
    pos: [20, -60],
    desc: 'Pusat pemukiman awal di pesisir selatan padang rumput Eldoria',
  },
  {
    id: 'wp_harbor',
    nameId: 'Pelabuhan Sanctuary',
    regionId: 'desa_eldoria',
    icon: '⛵',
    pos: [20, 20],
    desc: 'Pelabuhan pesisir selatan menghadap langsung ke Samudra Azure terbuka',
  },
  {
    id: 'wp_titan',
    nameId: 'Lembah Danau Titan Kuno',
    regionId: 'danau_titan',
    icon: '🏔️',
    pos: [60, -820],
    desc: 'Danau purba berair jernih di ketinggian pegunungan salju utara tengah',
  },
  {
    id: 'wp_astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    regionId: 'kerajaan_astraea',
    icon: '👑',
    pos: [460, -420],
    desc: 'Ibukota megah berdinding marmer emas dan tahta Kaisar Aurelius',
  },
  {
    id: 'wp_canyon',
    nameId: 'Kanyon Kuno',
    regionId: 'ancient_canyon',
    icon: '🏜️',
    pos: [-380, -640],
    desc: 'Tebing bebatuan cadas merah terjal bertingkat di perbatasan utara gurun barat',
  },
  {
    id: 'wp_pyramid',
    nameId: 'Piramida Emas Solaria',
    regionId: 'gurun_solaria',
    icon: '🏛️',
    pos: [-360, -520],
    desc: 'Monumen piramida emas kuno di tengah bukit pasir emas Solaria barat',
  },
  {
    id: 'wp_oasis',
    nameId: 'Oase Solaria',
    regionId: 'gurun_solaria',
    icon: '🌴',
    pos: [-420, -350],
    desc: 'Sumber mata air tawar pirus segar dinaungi pohon kurma di gurun barat',
  },
  {
    id: 'wp_boss_crater',
    nameId: 'Arena Colosseum Titan Kuno (Lv. 10)',
    regionId: 'kawah_cacing_purba',
    icon: '🗿',
    pos: [180, -560],
    desc: 'Arena reruntuhan colosseum kuno megah kediaman World Boss Titan Kuno di dataran terbuka utara',
  },
  {
    id: 'wp_sandworm',
    nameId: 'Kawah Pusaran Solaria (Jarrus)',
    regionId: 'gurun_solaria',
    icon: '🪱',
    pos: [-840, -260],
    desc: 'Cekungan kawah pasir raksasa sarang World Boss Jarrus di pedalaman gurun barat',
  },
  {
    id: 'wp_solaria_village',
    nameId: 'Desa Gurun & Bazaar Solaria',
    regionId: 'gurun_solaria',
    icon: '🏘️',
    pos: [-540, -420],
    desc: 'Pemukiman rumah tanah liat dan pasar kafilah sutra & rempah di Gurun Solaria barat',
  },
  {
    id: 'wp_sultan_palace',
    nameId: 'Istana Sultan Malik',
    regionId: 'gurun_solaria',
    icon: '🕌',
    pos: [-540, -540],
    desc: 'Kompleks istana kubah marmer emas megah di barat laut gurun',
  },
  {
    id: 'wp_mist_forest',
    nameId: 'Hutan Kabut Eldoria',
    regionId: 'hutan_kabut',
    icon: '🌲',
    pos: [760, -280],
    desc: 'Hutan pinus lebat berkabut tebal misterius di perbukitan timur',
  },
  {
    id: 'wp_abandoned_castle',
    nameId: 'Puing Kastil Terbengkalai',
    regionId: 'puing_kastil',
    icon: '🏰',
    pos: [580, -60],
    desc: 'Reruntuhan benteng kastil masa lalu dengan pilar batu slate runtuh',
  },
  {
    id: 'wp_valkragor',
    nameId: 'Desa Benteng Val-Kragor',
    regionId: 'desa_valkragor',
    icon: '🛡️',
    pos: [580, 130],
    desc: 'Benteng pertahanan tangguh di perbatasan padang rumput tenggara',
  },
  {
    id: 'wp_moss_valley',
    nameId: 'Lembah Batu Lumut',
    regionId: 'lembah_batu_lumut',
    icon: '🪨',
    pos: [580, -120],
    desc: 'Lembah tersembunyi penuh gugusan batu purba berlumut di timur dekat sungai',
  },
  {
    id: 'wp_thunderpeak',
    nameId: 'Mage Tower Puncak Halilintar',
    regionId: 'desa_eldoria',
    icon: '⚡',
    pos: [270, -260],
    desc: 'Menara penyihir megah di perbukitan padang rumput dekat persimpangan jalan',
  },
  {
    id: 'wp_dragoncaldera',
    nameId: 'Kepulauan Kaldera Naga (Lv. 12)',
    regionId: 'kaldera_naga_api',
    icon: '🐉',
    pos: [40, 840],
    desc: 'Gugusan 3 pulau kawah lava vulkanik di laut selatan jauh, sarang World Boss Ignis',
  },
  {
    id: 'wp_lighthouse_island',
    nameId: 'Pulau Mercusuar & Karang Pelaut',
    regionId: 'pantai_azure',
    icon: '🗼',
    pos: [-220, 460],
    desc: 'Pulau berbukit hijau dengan mercusuar pemandu kapal di Samudra Selatan',
  },
  {
    id: 'wp_pirate_island',
    nameId: 'Pulau Reruntuhan Bajak Laut',
    regionId: 'pantai_azure',
    icon: '🏴‍☠️',
    pos: [-520, 620],
    desc: 'Pulau bulan sabit dengan bangkai kapal karam dan sarang bajak laut',
  },
  {
    id: 'wp_rocky_reef',
    nameId: 'Pulau Karang Terjal',
    regionId: 'pantai_azure',
    icon: '🪨',
    pos: [-780, 280],
    desc: 'Gugusan batu karang terjal dan gerbang alami di Samudra Barat',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // 1. Dragonfang Caldera Archipelago (Expanded Caldera + Lava Moat + Satellites [40, 840])
  const distDragonMain = Math.hypot(x - 40, z - 840);
  const distDragonSW = Math.hypot(x - -138, z - 892);
  const distDragonNW = Math.hypot(x - -128, z - 772);
  if (distDragonMain <= 148 || distDragonSW <= 55 || distDragonNW <= 50) {
    return REGIONS.find((r) => r.id === 'kaldera_naga_api') || REGIONS[10];
  }

  // 2. Arena Colosseum World Boss Titan Kuno [180, -560]
  if (Math.hypot(x - 180, z - -560) <= 78) {
    return REGIONS.find((r) => r.id === 'kawah_cacing_purba') || REGIONS[11];
  }

  // 3. Kanyon Batu Merah Kuno [-380, -640]
  if (Math.hypot(x - -380, z - -640) <= 85) {
    return REGIONS.find((r) => r.id === 'ancient_canyon') || REGIONS[5];
  }

  // 4. Lembah Danau Titan Kuno & Pegunungan Salju Utara (Z < -640 dan -180 < X < 260)
  if ((z < -640 && x > -180 && x < 260) || Math.hypot(x - 60, z - -820) <= 120) {
    return REGIONS.find((r) => r.id === 'danau_titan') || REGIONS[4];
  }

  // 5. Kerajaan Emas Astraea [460, -420]
  if (Math.hypot(x - 460, z - -420) <= 105) {
    return REGIONS.find((r) => r.id === 'kerajaan_astraea') || REGIONS[3];
  }

  // 6. Hutan Kabut Eldoria [760, -280]
  if (Math.hypot(x - 760, z - -280) <= 85) {
    return REGIONS.find((r) => r.id === 'hutan_kabut') || REGIONS[6];
  }

  // 7. Puing Kastil Terbengkalai [580, -60]
  if (Math.hypot(x - 580, z - -60) <= 60) {
    return REGIONS.find((r) => r.id === 'puing_kastil') || REGIONS[7];
  }

  // 8. Benteng Val-Kragor [580, 130]
  if (Math.hypot(x - 580, z - 130) <= 85) {
    return REGIONS.find((r) => r.id === 'desa_valkragor') || REGIONS[2];
  }

  // 9. Lembah Batu Lumut [580, -120]
  if (Math.hypot(x - 580, z - -120) <= 65) {
    return REGIONS.find((r) => r.id === 'lembah_batu_lumut') || REGIONS[8];
  }

  // 10. Gurun Pasir Emas Solaria (Barat Benua)
  if (isDesertBiome(x, z)) {
    return REGIONS.find((r) => r.id === 'gurun_solaria') || REGIONS[9];
  }

  // 11. Samudra & Laut Lepas 360° yang mengelilingi Benua Utama
  if (!isMainContinentLand(x, z)) {
    return REGIONS[1]; // Azure Coast & South Ocean
  }

  // Default: Desa Utama & Padang Rumput Eldoria
  return REGIONS[0];
}
