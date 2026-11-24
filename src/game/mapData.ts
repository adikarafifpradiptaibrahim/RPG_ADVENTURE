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
    bounds: { minX: -20, maxX: 100, minZ: -80, maxZ: 10 },
    center: [40, -40],
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
    description: 'A heavily fortified stronghold with stone ramparts, corner watchtowers, garrison keep, and spiked defense barricades situated in the open eastern plains.',
    descriptionId: 'Desa benteng pertahanan mandiri di padang rumput tenggara yang lapang! Dilengkapi tembok slate kokoh, menara pengawas, barikade runcing, dan markas Komandan Brann.',
    color: '#64748b',
    bounds: { minX: 470, maxX: 570, minZ: -30, maxZ: 50 },
    center: [520, 10],
    recommendedLevel: 4,
  },
  {
    id: 'kerajaan_astraea',
    name: 'Grand Imperial Kingdom of Astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    icon: '👑',
    description: 'A colossal imperial metropolis situated across the peaceful north-east plains, featuring the grand Sun Palace, towering marble colonnades, royal bazaar, and the Fountain of Immortality.',
    descriptionId: 'Ibukota kerajaan emas megah di dataran padang rumput timur laut yang damai! Gerbang Barat megah, Istana Kaisar Aurelius, dan alun-alun marmer putih berair mancur abadi.',
    color: '#fbbf24',
    bounds: { minX: 260, maxX: 380, minZ: -320, maxZ: -200 },
    center: [320, -260],
    recommendedLevel: 5,
  },
  {
    id: 'danau_titan',
    name: 'Ancient Titan Lake Valley',
    nameId: 'Lembah Danau Titan Kuno',
    icon: '🏔️',
    description: 'A crystalline glacial mountain lake surrounded by snow-capped peaks in the far north-central highlands, headwaters of the Eldorian rivers.',
    descriptionId: 'Danau purba berair biru jernih di kaki pegunungan salju utara tengah, hulu utama aliran sungai Eldoria.',
    color: '#38bdf8',
    bounds: { minX: 10, maxX: 150, minZ: -840, maxZ: -680 },
    center: [80, -760],
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
    bounds: { minX: -340, maxX: -180, minZ: -860, maxZ: -700 },
    center: [-260, -780],
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
    bounds: { minX: 580, maxX: 700, minZ: -400, maxZ: -280 },
    center: [640, -340],
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
    bounds: { minX: 370, maxX: 470, minZ: -190, maxZ: -90 },
    center: [420, -140],
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
    bounds: { minX: 540, maxX: 660, minZ: -170, maxZ: -70 },
    center: [600, -120],
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
    bounds: { minX: -650, maxX: -150, minZ: -750, maxZ: -120 },
    center: [-400, -400],
    recommendedLevel: 6,
  },
  {
    id: 'kaldera_naga_api',
    name: 'Dragonfang Caldera Archipelago',
    nameId: 'Kepulauan Kaldera Naga (Lv. 12)',
    icon: '🐉',
    description: 'A colossal volcanic archipelago across the south sea featuring 3 organic volcanic islands, smoking magma pools, charred docks, basalt spires, and the primal dragon altar.',
    descriptionId: 'Gugusan 3 pulau vulkanik berbahaya di seberang samudra selatan! Aliran lahar pijar mendidih, jembatan batu rantai, pilar basal heksagonal, dan Altar Rune World Boss Naga Purba Ignis.',
    color: '#dc2626',
    bounds: { minX: -120, maxX: 160, minZ: 720, maxZ: 960 },
    center: [40, 840],
    recommendedLevel: 12,
  },
  {
    id: 'kawah_cacing_purba',
    name: 'Colosseum of Titan Kuno',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    icon: '🗿',
    description: 'A colossal ancient colosseum arena in the western desert, domain of the legendary Boss Titan Kuno.',
    descriptionId: 'Arena reruntuhan colosseum kuno megah di Gurun Solaria barat, arena World Boss Titan Kuno.',
    color: '#ea580c',
    bounds: { minX: -540, maxX: -420, minZ: -540, maxZ: -420 },
    center: [-480, -480],
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
    pos: [40, -40],
    desc: 'Pusat pemukiman awal di pesisir selatan padang rumput Eldoria',
  },
  {
    id: 'wp_harbor',
    nameId: 'Pelabuhan Sanctuary',
    regionId: 'desa_eldoria',
    icon: '⛵',
    pos: [40, 85],
    desc: 'Pelabuhan pesisir selatan menghadap langsung ke Samudra Azure terbuka',
  },
  {
    id: 'wp_titan',
    nameId: 'Lembah Danau Titan Kuno',
    regionId: 'danau_titan',
    icon: '🏔️',
    pos: [80, -760],
    desc: 'Danau purba berair jernih di ketinggian pegunungan salju utara tengah',
  },
  {
    id: 'wp_astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    regionId: 'kerajaan_astraea',
    icon: '👑',
    pos: [320, -260],
    desc: 'Ibukota megah berdinding marmer emas dan tahta Kaisar Aurelius',
  },
  {
    id: 'wp_canyon',
    nameId: 'Kanyon Kuno',
    regionId: 'ancient_canyon',
    icon: '🏜️',
    pos: [-260, -780],
    desc: 'Tebing bebatuan cadas merah terjal bertingkat di perbatasan utara gurun barat',
  },
  {
    id: 'wp_pyramid',
    nameId: 'Piramida Emas Solaria',
    regionId: 'gurun_solaria',
    icon: '🏛️',
    pos: [-320, -560],
    desc: 'Monumen piramida emas kuno di tengah bukit pasir emas Solaria barat',
  },
  {
    id: 'wp_oasis',
    nameId: 'Oase Solaria',
    regionId: 'gurun_solaria',
    icon: '🌴',
    pos: [-340, -340],
    desc: 'Sumber mata air tawar pirus segar dinaungi pohon kurma di gurun barat',
  },
  {
    id: 'wp_boss_crater',
    nameId: 'Kawah Cacat World Boss (Lv. 10)',
    regionId: 'kawah_cacing_purba',
    icon: '🗿',
    pos: [-480, -480],
    desc: 'Arena reruntuhan colosseum kuno megah kediaman World Boss Titan Kuno di gurun barat',
  },
  {
    id: 'wp_sandworm',
    nameId: 'Sarang Cacing Purba Gurun',
    regionId: 'gurun_solaria',
    icon: '🪱',
    pos: [-420, -420],
    desc: 'Arena terbuka pusaran pasir habitat Cacing Raksasa Gurun di gurun barat',
  },
  {
    id: 'wp_solaria_village',
    nameId: 'Desa Gurun & Bazaar Solaria',
    regionId: 'gurun_solaria',
    icon: '🏘️',
    pos: [-460, -260],
    desc: 'Pemukiman rumah tanah liat dan pasar kafilah sutra & rempah di Gurun Solaria barat',
  },
  {
    id: 'wp_sultan_palace',
    nameId: 'Istana Sultan Malik',
    regionId: 'gurun_solaria',
    icon: '🕌',
    pos: [-540, -640],
    desc: 'Kompleks istana kubah marmer emas megah di barat laut gurun',
  },
  {
    id: 'wp_mist_forest',
    nameId: 'Hutan Kabut Eldoria',
    regionId: 'hutan_kabut',
    icon: '🌲',
    pos: [640, -340],
    desc: 'Hutan pinus lebat berkabut tebal misterius di perbukitan timur',
  },
  {
    id: 'wp_abandoned_castle',
    nameId: 'Puing Kastil Terbengkalai',
    regionId: 'puing_kastil',
    icon: '🏰',
    pos: [420, -140],
    desc: 'Reruntuhan benteng kastil masa lalu dengan pilar batu slate runtuh',
  },
  {
    id: 'wp_valkragor',
    nameId: 'Desa Benteng Val-Kragor',
    regionId: 'desa_valkragor',
    icon: '🛡️',
    pos: [520, 10],
    desc: 'Benteng pertahanan tangguh di perbatasan padang rumput tenggara',
  },
  {
    id: 'wp_moss_valley',
    nameId: 'Lembah Batu Lumut',
    regionId: 'lembah_batu_lumut',
    icon: '🪨',
    pos: [600, -120],
    desc: 'Lembah tersembunyi penuh gugusan batu purba berlumut di timur dekat sungai',
  },
  {
    id: 'wp_thunderpeak',
    nameId: 'Mage Tower Puncak Halilintar',
    regionId: 'desa_eldoria',
    icon: '⚡',
    pos: [220, -110],
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
  // 1. Dragonfang Caldera Archipelago (3 Organic Volcanic Islands [40, 840])
  const distDragonMain = Math.hypot(x - 40, z - 840);
  const distDragonSW = Math.hypot(x - -75, z - 875);
  const distDragonNW = Math.hypot(x - -65, z - 775);
  if (distDragonMain <= 115 || distDragonSW <= 55 || distDragonNW <= 50) {
    return REGIONS.find((r) => r.id === 'kaldera_naga_api') || REGIONS[10];
  }

  // 2. Kawah Cacat World Boss Titan Kuno [-480, -480]
  if (Math.hypot(x - -480, z - -480) <= 55) {
    return REGIONS.find((r) => r.id === 'kawah_cacing_purba') || REGIONS[11];
  }

  // 3. Danau Titan Kuno [80, -760]
  if (Math.hypot(x - 80, z - -760) <= 85) {
    return REGIONS.find((r) => r.id === 'danau_titan') || REGIONS[4];
  }

  // 4. Astraea [320, -260]
  if (Math.hypot(x - 320, z - -260) <= 65) {
    return REGIONS.find((r) => r.id === 'kerajaan_astraea') || REGIONS[3];
  }

  // 5. Kanyon Kuno [-260, -780]
  if (Math.hypot(x - -260, z - -780) <= 80) {
    return REGIONS.find((r) => r.id === 'ancient_canyon') || REGIONS[5];
  }

  // 6. Hutan Kabut Eldoria [640, -340]
  if (Math.hypot(x - 640, z - -340) <= 65) {
    return REGIONS.find((r) => r.id === 'hutan_kabut') || REGIONS[6];
  }

  // 7. Puing Kastil Terbengkalai [420, -140]
  if (Math.hypot(x - 420, z - -140) <= 45) {
    return REGIONS.find((r) => r.id === 'puing_kastil') || REGIONS[7];
  }

  // 8. Benteng Val-Kragor [520, 10]
  if (Math.hypot(x - 520, z - 10) <= 50) {
    return REGIONS.find((r) => r.id === 'desa_valkragor') || REGIONS[2];
  }

  // 9. Lembah Batu Lumut [600, -120]
  if (Math.hypot(x - 600, z - -120) <= 50) {
    return REGIONS.find((r) => r.id === 'lembah_batu_lumut') || REGIONS[8];
  }

  // 10. South & Surrounding Ocean
  if (z > 215 || x < -700 || x > 750 || z < -900) {
    return REGIONS[1];
  }

  // 11. Solaria Golden Desert
  if (isDesertBiome(x, z)) {
    return REGIONS.find((r) => r.id === 'gurun_solaria') || REGIONS[9];
  }

  // Default: Desa Utama & Padang Rumput Eldoria
  return REGIONS[0];
}
