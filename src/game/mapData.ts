import { RegionInfo, MapMarker } from '../types/game';

export const REGIONS: RegionInfo[] = [
  {
    id: 'desa_eldoria',
    name: 'Sanctuary Village & Central Plains',
    nameId: 'Desa Utama & Padang Rumput Eldoria',
    icon: '🏡',
    description: 'A thriving coastal settlement with wooden cottages, busy harbor docks, merchant galleons, and wide open grassland plains.',
    descriptionId: 'Pusat desa damai dan padang rumput hijau luas Eldoria dengan rumah panggung kayu, pelabuhan kapal dagang, bengkel tempa, serta perbukitan landai terbuka.',
    color: '#65a30d',
    bounds: { minX: -120, maxX: 180, minZ: -120, maxZ: 20 },
    center: [0, -4],
    recommendedLevel: 1,
  },
  {
    id: 'pantai_azure',
    name: 'Azure Coast & Ocean',
    nameId: 'Laut Biru & Pantai Pasir Azure',
    icon: '🌊',
    description: 'Sandy shores with gentle sea breezes, wooden docks, and shimmering ocean waves.',
    descriptionId: 'Hamparan pasir pantai keemasan, dermaga kayu nelayan Pak Joko, perahu kayu, dan deburan ombak laut biru luas di selatan.',
    color: '#0284c7',
    bounds: { minX: -580, maxX: 300, minZ: 20, maxZ: 460 },
    center: [0, 80],
    recommendedLevel: 2,
  },
  {
    id: 'reruntuhan_kuno',
    name: 'Ancient Sunken Ruins',
    nameId: 'Reruntuhan Kuno Vael',
    icon: '🏛️',
    description: 'Forgotten stone monoliths, archways, and rune altars guarded by restless skeletons.',
    descriptionId: 'Pilar-pilar batu megah peradaban kuno di hulu rawa barat laut, gerbang rune misterius, dan peti pusaka yang dijaga pasukan tengkorak terkutuk.',
    color: '#90a4ae',
    bounds: { minX: -210, maxX: -150, minZ: -210, maxZ: -150 },
    center: [-180, -180],
    recommendedLevel: 3,
  },
  {
    id: 'hutan_berbisik',
    name: 'Whispering Mystic Forest',
    nameId: 'Hutan Pinus & Lembah Mistis',
    icon: '🌲',
    description: 'Dense wilderness with towering pines, glowing mana crystals, and meadow slimes.',
    descriptionId: 'Hutan lebat dengan pohon pinus raksasa, kristal mana mengambang, serta monster lendir padang rumput di timur desa.',
    color: '#2e7d32',
    bounds: { minX: 16, maxX: 62, minZ: -30, maxZ: 25 },
    center: [35, 2],
    recommendedLevel: 2,
  },
  {
    id: 'kawah_obsidian',
    name: 'Ancient Titan Sanctuary Basin',
    nameId: 'Lembah Danau Cekungan Titan Kuno',
    icon: '🏛️',
    description: 'A circular ancient valley lake basin surrounded by rune-carved megaliths, home to the Ancient Obsidian Titan.',
    descriptionId: 'Cekungan danau lembah purba melingkar di perbatasan barat laut dikelilingi megalit rune dan arena pertarungan Boss Sang Titan Kuno Obsidian.',
    color: '#0284c7',
    bounds: { minX: -190, maxX: -130, minZ: -190, maxZ: -130 },
    center: [-160, -160],
    recommendedLevel: 4,
  },
  {
    id: 'ngarai_kabut',
    name: 'Misty Chasm & Suspension Bridge',
    nameId: 'Ngarai Kabut & Jembatan Gantung',
    icon: '🌉',
    description: 'A dizzying gorge splitting the continent, spanned by an enormous suspension rope bridge.',
    descriptionId: 'Jurang ngarai terjal dengan kabut tebal di bawahnya, dihubungkan oleh jembatan gantung kayu raksasa menuju koridor pegunungan.',
    color: '#78716c',
    bounds: { minX: 62, maxX: 95, minZ: -35, maxZ: 10 },
    center: [75, -15],
    recommendedLevel: 3,
  },
  {
    id: 'desa_valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    icon: '🏰',
    description: 'A heavily fortified highland stronghold with stone ramparts, corner watchtowers, garrison keep, and spiked defense barricades.',
    descriptionId: 'Desa benteng pertahanan koridor pegunungan timur! Dilengkapi tembok slate kokoh, menara pengawas, barikade runcing, dan markas Komandan Brann.',
    color: '#64748b',
    bounds: { minX: 180, maxX: 300, minZ: -150, maxZ: 20 },
    center: [220, -20],
    recommendedLevel: 4,
  },
  {
    id: 'puncak_frostpeak',
    name: 'Frostpeak Glacier & Frozen Chasm',
    nameId: 'Puncak Salju Abadi Frostpeak',
    icon: '❄️',
    description: 'Perpetually snow-covered mountain peaks with crystalline ice spires, vast glaciers, and an ancient frozen sanctuary.',
    descriptionId: 'Pegunungan es luas bersalju abadi di sudut timur laut jauh, dihuni Serigala Frostfang, jurang gletser beku, dan menara pertahanan es terluar.',
    color: '#e0f2fe',
    bounds: { minX: 300, maxX: 680, minZ: -460, maxZ: -150 },
    center: [360, -220],
    recommendedLevel: 5,
  },
  {
    id: 'rawa_bayangan',
    name: 'Shadowfen Gloom Marsh',
    nameId: 'Rawa Bayangan Purba Shadowfen',
    icon: '🍄',
    description: 'A murky twilight wetland filled with giant luminescent mushrooms, toxic waters, and hidden smuggler caches.',
    descriptionId: 'Rawa-rawa berkabut gelap di sudut kiri atas terjauh! Dihuni monster rawa dan dihiasi jamur raksasa bercahaya ungu serta hijau neon.',
    color: '#475569',
    bounds: { minX: -580, maxX: -150, minZ: -460, maxZ: -150 },
    center: [-220, -200],
    recommendedLevel: 4,
  },
  {
    id: 'teluk_karang',
    name: 'Coral Cove & Pirate Shipwreck',
    nameId: 'Teluk Karang & Bangkai Kapal Bajak Laut',
    icon: '🏴‍☠️',
    description: 'A tropical extension of the southern sea featuring sea rocks, a ruined pirate galleon, and buried sunken gold.',
    descriptionId: 'Pesisir karang tropis di tenggara dengan reruntuhan kapal bajak laut yang karam di atas karang laut serta peti emas tersembunyi.',
    color: '#f59e0b',
    bounds: { minX: 52, maxX: 220, minZ: 22, maxZ: 220 },
    center: [110, 85],
    recommendedLevel: 3,
  },
  {
    id: 'gurun_solaria',
    name: 'Solaria Golden Desert & Palace',
    nameId: 'Gurun Emas Solaria, Desa & Istana Sultan',
    icon: '🕌',
    description: 'Endless rolling golden sand dunes, the bustling mud-brick Desert Village of Solaria, the Grand Palace of Sultan Malik, and the ancient pharaoh pyramid.',
    descriptionId: 'Hamparan padang pasir emas di area barat tengah! Menampung Desa Bazaar Tanah Liat, Istana Sultan Malik, oase tersembunyi, dan piramida pharaoh kuno.',
    color: '#eab308',
    bounds: { minX: -580, maxX: -120, minZ: -150, maxZ: 20 },
    center: [-260, -30],
    recommendedLevel: 5,
  },
  {
    id: 'puncak_halilintar',
    name: 'Thunderpeak Spire & Mage Tower Highlands',
    nameId: 'Puncak Halilintar & Menara Mage Tower',
    icon: '⚡',
    description: 'A storm-wracked mountain highland in the northeast where the grand multi-floor Mage Tower sanctuary stands proud.',
    descriptionId: 'Dataran tinggi tebing pegunungan timur berselimut petir abadi, tempat berdirinya Mage Tower bertingkat tiga dan observatorium langit.',
    color: '#483d8b',
    bounds: { minX: 200, maxX: 280, minZ: -150, maxZ: -90 },
    center: [240, -120],
    recommendedLevel: 6,
  },
  {
    id: 'hutan_pagoda_giok',
    name: 'Jade Bamboo Grove & Celestial Pagoda',
    nameId: 'Rumpun Bambu Giok & Kuil Pagoda Kuno',
    icon: '⛩️',
    description: 'A serene eastern sanctuary shaded by towering bamboo stalks, vermilion Torii gates, and a 3-tier celestial pagoda.',
    descriptionId: 'Kawasan suci ketenangan di sudut kanan bawah tenggara! Dihiasi gerbang Torii megah berwarna merah tua, rumpun bambu zamrud luas, dan pagoda langit.',
    color: '#059669',
    bounds: { minX: 300, maxX: 680, minZ: 20, maxZ: 460 },
    center: [350, 100],
    recommendedLevel: 5,
  },
  {
    id: 'kaldera_naga_api',
    name: 'Dragonfang Caldera & Inferno Archipelago',
    nameId: 'Kaldera Sarang Naga & Kepulauan Api',
    icon: '🐉',
    description: 'A blistering volcanic hellscape of smoking magma pools, scorched arches, and monumental dragon fossil ribcages.',
    descriptionId: 'Wilayah vulkanik paling berbahaya di jalur utara! Aliran lahar pijar mendidih, kawah inti naga purba Ignis, serta kuburan fosil naga legendaris.',
    color: '#dc2626',
    bounds: { minX: -150, maxX: 180, minZ: -460, maxZ: -120 },
    center: [0, -300],
    recommendedLevel: 7,
  },
  {
    id: 'kerajaan_astraea',
    name: 'Grand Imperial Kingdom of Astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    icon: '👑',
    description: 'A colossal imperial metropolis situated atop the eternal north snow plateau of Frostpeak, featuring the grand Sun Palace, towering marble colonnades, royal bazaar, and the Fountain of Immortality.',
    descriptionId: 'Ibukota kerajaan emas megah di Puncak Salju Abadi Frostpeak! Gerbang Barat menghadap lurus ke Barat (270°), Istana Kaisar Aurelius, dan jurang es purba di utara.',
    color: '#fbbf24',
    bounds: { minX: 320, maxX: 420, minZ: -310, maxZ: -220 },
    center: [360, -260],
    recommendedLevel: 5,
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
    nameId: 'Air Mancur Desa Sanctuary Eldoria',
    regionId: 'desa_eldoria',
    icon: '⛲',
    pos: [0, -4],
    desc: 'Pusat desa awal, dekat Tetua Vaelen dan air mancur suci',
  },
  {
    id: 'wp_harbor',
    nameId: 'Dermaga & Pelabuhan Kapal Sanctuary',
    regionId: 'desa_eldoria',
    icon: '⛵',
    pos: [0, 21],
    desc: 'Gerbang titian pelabuhan bibir pantai dengan dermaga rapi dan kapal berlabuh',
  },
  {
    id: 'wp_beach',
    nameId: 'Anjungan Dermaga Utama Laut Lepas',
    regionId: 'pantai_azure',
    icon: '⚓',
    pos: [0, 72],
    desc: 'Anjungan ujung dermaga utama membentang ke laut lepas dengan pemandangan kapal perang dan kapal dagang',
  },
  {
    id: 'wp_ruins',
    nameId: 'Gerbang Reruntuhan Kuno Vael',
    regionId: 'reruntuhan_kuno',
    icon: '🏛️',
    pos: [-180, -180],
    desc: 'Kuil pilar batu kuno Vael di hulu rawa barat laut, jauh dari pemukiman desa',
  },
  {
    id: 'wp_forest',
    nameId: 'Monolit Kristal Hutan',
    regionId: 'hutan_berbisik',
    icon: '🔮',
    pos: [35, 2],
    desc: 'Monolit kristal bercahaya di tengah hutan pinus mistis',
  },
  {
    id: 'wp_volcano',
    nameId: 'Lembah Danau Cekungan Titan Kuno',
    regionId: 'kawah_obsidian',
    icon: '🏛️',
    pos: [-160, -160],
    desc: 'Cekungan danau lembah purba dan platform batu tempat bersemayamnya Titan Kuno',
  },
  {
    id: 'wp_bridge',
    nameId: 'Jembatan Gantung Ngarai Kabut',
    regionId: 'ngarai_kabut',
    icon: '🌉',
    pos: [75, -15],
    desc: 'Jembatan gantung kayu raksasa yang membentang di atas ngarai berkabut',
  },
  {
    id: 'wp_valkragor',
    nameId: 'Alun-Alun Benteng Val-Kragor',
    regionId: 'desa_valkragor',
    icon: '🏰',
    pos: [220, -20],
    desc: 'Desa benteng pertahanan di koridor dataran tinggi timur, dekat Komandan Brann & pandai besi Goran',
  },
  {
    id: 'wp_frostpeak',
    nameId: 'Kuil Es Puncak Frostpeak',
    regionId: 'puncak_frostpeak',
    icon: '❄️',
    pos: [340, -180],
    desc: 'Altar puncak beku bersalju abadi dan peti kristal es legendaris',
  },
  {
    id: 'wp_frostpeak_glacier',
    nameId: 'Dataran Gletser Beku Frostpeak Luar',
    regionId: 'puncak_frostpeak',
    icon: '🏔️',
    pos: [380, -200],
    desc: 'Dataran tinggi es gletser abadi di timur laut jauh luar Astraea',
  },
  {
    id: 'wp_shadowfen',
    nameId: 'Pusat Rawa Bayangan Purba',
    regionId: 'rawa_bayangan',
    icon: '🍄',
    pos: [-200, -200],
    desc: 'Gugusan jamur raksasa bercahaya di tengah rawa berkabut gelap kiri atas',
  },
  {
    id: 'wp_shadowfen_deep',
    nameId: 'Lembah Jamur Abadi Shadowfen',
    regionId: 'rawa_bayangan',
    icon: '✨',
    pos: [-260, -220],
    desc: 'Grotto rahasia rawa terdalam dengan perairan luminesens ungu',
  },
  {
    id: 'wp_coralcove',
    nameId: 'Bangkai Kapal Teluk Karang',
    regionId: 'teluk_karang',
    icon: '🏴‍☠️',
    pos: [88, 55],
    desc: 'Karamnya kapal bajak laut di pesisir karang eksotis tenggara',
  },
  {
    id: 'wp_solaria_village',
    nameId: 'Desa Bazaar Gurun Solaria',
    regionId: 'gurun_solaria',
    icon: '🎪',
    pos: [-260, -30],
    desc: 'Pemukiman megah tanah liat, bazaar rempah eksotis, peristirahatan unta, dan sumur oase Solaria',
  },
  {
    id: 'wp_solaria_palace',
    nameId: 'Istana Taj Mahal Sultan Solaria',
    regionId: 'gurun_solaria',
    icon: '🕌',
    pos: [-320, -30],
    desc: 'Kemegahan marmer putih arsitektur Taj Mahal, menara minaret, dan Ruang Takhta Sultan Malik',
  },
  {
    id: 'wp_solaria',
    nameId: 'Piramida Emas Gurun Solaria',
    regionId: 'gurun_solaria',
    icon: '🏜️',
    pos: [-200, -50],
    desc: 'Piramida kuno megah di perbatasan bukit pasir emas barat tengah',
  },
  {
    id: 'wp_solaria_oasis',
    nameId: 'Oase Tersembunyi Solaria',
    regionId: 'gurun_solaria',
    icon: '🌴',
    pos: [-240, -80],
    desc: 'Oase rahasia berair jernih pirus dan pepohonan palem di gurun barat tengah',
  },
  {
    id: 'wp_thunderpeak',
    nameId: 'Mage Tower Puncak Halilintar',
    regionId: 'puncak_halilintar',
    icon: '🧙‍♂️',
    pos: [240, -120],
    desc: 'Menara penyihir megah di koridor pegunungan dengan interior bertingkat dan observatorium',
  },
  {
    id: 'wp_jadepagoda',
    nameId: 'Kuil Pagoda Giok & Gerbang Torii',
    regionId: 'hutan_pagoda_giok',
    icon: '⛩️',
    pos: [350, 100],
    desc: 'Pagoda megah tiga tingkat beratap giok di tengah rumpun bambu kanan bawah',
  },
  {
    id: 'wp_jade_sanctuary',
    nameId: 'Paviliun Langit Bambu Surgawi',
    regionId: 'hutan_pagoda_giok',
    icon: '🪷',
    pos: [400, 140],
    desc: 'Kuil paviliun terbuka di perbukitan bambu tenggara terjauh',
  },
  {
    id: 'wp_dragoncaldera',
    nameId: 'Altar Kaldera Sarang Naga Purba',
    regionId: 'kaldera_naga_api',
    icon: '🐉',
    pos: [0, -300],
    desc: 'Kaldera kawah lava hitam dan kuburan fosil naga raksasa di jalur utara',
  },
  {
    id: 'wp_dragon_core',
    nameId: 'Inti Kawah Gunung Berapi Naga Purba',
    regionId: 'kaldera_naga_api',
    icon: '🔥',
    pos: [25, -285],
    desc: 'Kawah lava terdalam di jantung kaldera utara bersuhu ekstrem',
  },
  {
    id: 'wp_astraea',
    nameId: 'Gerbang Barat Kerajaan Emas Astraea & Istana Kaisar',
    regionId: 'kerajaan_astraea',
    icon: '👑',
    pos: [348, -260],
    desc: 'Gerbang Barat Ibukota Kerajaan Emas Astraea di utara Frostpeak, menghadap lurus ke arah barat (270°)',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // 0. Grand Imperial Kingdom of Astraea (North-East Snow Metropolis: x >= 320 && x <= 420 && z <= -220 && z >= -310)
  if (x >= 320 && x <= 420 && z <= -220 && z >= -310) {
    return REGIONS[14];
  }

  // 1. Dragonfang Caldera & Inferno Core (North strip: Math.hypot(x - 0, z - -300) < 55 || (x >= -150 && x <= 180 && z < -120))
  if (Math.hypot(x - 0, z - -300) < 55 || (x >= -150 && x <= 180 && z < -120)) {
    return REGIONS[13];
  }

  // 2. Ancient Titan Sanctuary Basin Arena (Northwest border: within 32m of [-160, -160])
  if (Math.hypot(x - -160, z - -160) < 32) {
    return REGIONS[4];
  }

  // 3. Ancient Sunken Ruins of Vael (Swamp / Ruin sector: within 32m of [-180, -180])
  if (Math.hypot(x - -180, z - -180) < 32) {
    return REGIONS[2];
  }

  // 4. Thunderpeak Lightning Spire & Mage Tower Highlands (Highlands: within 35m of [240, -120])
  if (Math.hypot(x - 240, z - -120) < 35) {
    return REGIONS[11];
  }

  // 5. Jade Bamboo Grove & Pagoda (Bottom-Right: x > 300 && z > 20)
  if (x > 300 && z > 20) {
    return REGIONS[12];
  }

  // 6. Frostpeak Summit & Mountain Glacier (Top-Right: x > 300 && z < -150)
  if (x > 300 && z < -150) {
    return REGIONS[7];
  }

  // 7. Fortress Village Val-Kragor & Highlands Corridor (East-Central: x > 180 && x <= 300 && z >= -150 && z <= 20)
  if (x > 180 && x <= 300 && z >= -150 && z <= 20) {
    return REGIONS[6];
  }

  // 8. Solaria Golden Dunes & Oasis (West-Central: x < -120 && z >= -150 && z <= 20)
  if (x < -120 && z >= -150 && z <= 20) {
    return REGIONS[10];
  }

  // 9. Shadowfen Gloom Marsh (Top-Left: x < -150 && z < -150)
  if (x < -150 && z < -150) {
    return REGIONS[8];
  }

  // 10. Misty Chasm & Suspension Bridge (Plains east edge: x: 62..95, z: -35..10)
  if (x >= 62 && x < 95 && z >= -35 && z <= 10) {
    return REGIONS[5];
  }

  // 11. Whispering Mystic Forest (Central Plains east: x: 16..62, z: -30..20)
  if (x >= 16 && x < 62 && z >= -30 && z <= 20) {
    return REGIONS[3];
  }

  // 12. Azure Coast & South Ocean (All south ocean: z > 20 && x <= 300, or x < -120 && z > 20)
  if (z > 20 && !(x > 300)) {
    return REGIONS[1];
  }

  // Default: Desa Utama & Padang Rumput Eldoria (Central Plains: x: -120..180, z: -120..20)
  return REGIONS[0];
}
