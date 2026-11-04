import { RegionInfo, MapMarker } from '../types/game';

export const REGIONS: RegionInfo[] = [
  {
    id: 'desa_eldoria',
    name: 'Sanctuary Village & Harbor',
    nameId: 'Desa Utama & Pelabuhan Sanctuary',
    icon: '🏡',
    description: 'A thriving coastal settlement with wooden cottages, busy harbor docks, merchant galleons, and rejuvenation fountain.',
    descriptionId: 'Pusat desa damai dengan rumah panggung kayu, pelabuhan kapal dagang dan kapal perang, bengkel tempa, serta air mancur suci.',
    color: '#4caf50',
    bounds: { minX: -55, maxX: 55, minZ: -32, maxZ: 62 },
    center: [0, -4],
    recommendedLevel: 1,
  },
  {
    id: 'pantai_azure',
    name: 'Azure Coast & Ocean',
    nameId: 'Laut Biru & Pantai Pasir Azure',
    icon: '🌊',
    description: 'Sandy shores with gentle sea breezes, wooden docks, and shimmering ocean waves.',
    descriptionId: 'Hamparan pasir pantai keemasan, dermaga kayu nelayan Pak Joko, perahu kayu, dan deburan ombak laut biru luas.',
    color: '#00b4d8',
    bounds: { minX: -95, maxX: 50, minZ: 14, maxZ: 440 },
    center: [6, 42],
    recommendedLevel: 2,
  },
  {
    id: 'reruntuhan_kuno',
    name: 'Ancient Sunken Ruins',
    nameId: 'Reruntuhan Kuno Vael',
    icon: '🏛️',
    description: 'Forgotten stone monoliths, archways, and rune altars guarded by restless skeletons.',
    descriptionId: 'Pilar-pilar batu megah peradaban kuno di hulu barat, gerbang rune misterius, dan peti pusaka yang dijaga pasukan tengkorak terkutuk.',
    color: '#90a4ae',
    bounds: { minX: -145, maxX: -85, minZ: 12, maxZ: 65 },
    center: [-118, 36],
    recommendedLevel: 3,
  },
  {
    id: 'hutan_berbisik',
    name: 'Whispering Mystic Forest',
    nameId: 'Hutan Pinus & Lembah Mistis',
    icon: '🌲',
    description: 'Dense wilderness with towering pines, glowing mana crystals, and meadow slimes.',
    descriptionId: 'Hutan lebat dengan pohon pinus raksasa, kristal mana mengambang, serta monster lendir padang rumput.',
    color: '#2e7d32',
    bounds: { minX: 16, maxX: 62, minZ: -30, maxZ: 25 },
    center: [35, 2],
    recommendedLevel: 2,
  },
  {
    id: 'kawah_obsidian',
    name: 'Obsidian Volcanic Crag',
    nameId: 'Kawah Vulkanik & Arena Sang Titan',
    icon: '🌋',
    description: 'A perilous volcanic domain of dark basalt rock and glowing magma, home to the Obsidian Titan.',
    descriptionId: 'Zona berbahaya bebatuan hitam basalt, celah lava pijar menyala, dan arena pertarungan Boss Raksasa Obsidian Titan.',
    color: '#ff3d00',
    bounds: { minX: -45, maxX: 45, minZ: -90, maxZ: -32 },
    center: [0, -52],
    recommendedLevel: 4,
  },
  {
    id: 'ngarai_kabut',
    name: 'Misty Chasm & Suspension Bridge',
    nameId: 'Ngarai Kabut & Jembatan Gantung',
    icon: '🌉',
    description: 'A dizzying gorge splitting the continent, spanned by an enormous suspension rope bridge.',
    descriptionId: 'Jurang ngarai terjal dengan kabut tebal di bawahnya, dihubungkan oleh jembatan gantung kayu raksasa yang menantang.',
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
    descriptionId: 'Desa benteng pertahanan dataran tinggi timur! Dilengkapi tembok slate kokoh, menara pengawas baru, barikade runcing, dan markas Komandan Brann.',
    color: '#3b82f6',
    bounds: { minX: 125, maxX: 195, minZ: -48, maxZ: 18 },
    center: [158, -16],
    recommendedLevel: 4,
  },
  {
    id: 'puncak_frostpeak',
    name: 'Frostpeak Glacier & Frozen Chasm',
    nameId: 'Puncak Salju Abadi Frostpeak',
    icon: '❄️',
    description: 'Perpetually snow-covered mountain peaks with crystalline ice spires, vast glaciers, and an ancient frozen sanctuary.',
    descriptionId: 'Pegunungan es luas bersalju abadi di utara-timur jauh, dihuni Serigala Frostfang, jurang gletser beku, dan menara pertahanan es terluar.',
    color: '#38bdf8',
    bounds: { minX: 45, maxX: 520, minZ: -480, maxZ: -34 },
    center: [180, -180],
    recommendedLevel: 5,
  },
  {
    id: 'rawa_bayangan',
    name: 'Shadowfen Gloom Marsh',
    nameId: 'Rawa Bayangan Purba Shadowfen',
    icon: '🍄',
    description: 'A murky twilight wetland filled with giant luminescent mushrooms, toxic waters, and hidden smuggler caches.',
    descriptionId: 'Rawa-rawa berkabut gelap di ujung barat terjauh! Dihuni monster rawa dan dihiasi jamur raksasa bercahaya ungu serta hijau neon.',
    color: '#a855f7',
    bounds: { minX: -550, maxX: -65, minZ: -75, maxZ: 140 },
    center: [-240, 25],
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
    descriptionId: 'Hamparan padang pasir emas mahaluas di barat daya! Menampung Desa Tanah Liat yang ramai, Istana Megah Berkubah Emas Sultan Malik, bazaar rempah eksotis, dan reruntuhan piramida pharaoh kuno.',
    color: '#eab308',
    bounds: { minX: -550, maxX: -95, minZ: 35, maxZ: 460 },
    center: [-260, 200],
    recommendedLevel: 5,
  },
  {
    id: 'puncak_halilintar',
    name: 'Thunderpeak Lightning Spire Sanctuary',
    nameId: 'Puncak Halilintar & Altar Petir Purba',
    icon: '⚡',
    description: 'A storm-wracked basalt plateau where perpetual lightning strikes ancient floating magnetic spires.',
    descriptionId: 'Dataran tinggi tebing basalt hitam di barat laut jauh! Diselimuti badai petir abadi, cincin batu magnetik melayang, dan menara kristal halilintar ungu menyala.',
    color: '#a855f7',
    bounds: { minX: -550, maxX: -70, minZ: -460, maxZ: -80 },
    center: [-240, -180],
    recommendedLevel: 6,
  },
  {
    id: 'hutan_pagoda_giok',
    name: 'Jade Bamboo Grove & Celestial Pagoda',
    nameId: 'Rumpun Bambu Giok & Kuil Pagoda Kuno',
    icon: '⛩️',
    description: 'A serene eastern sanctuary shaded by towering bamboo stalks, vermilion Torii gates, and a 3-tier celestial pagoda.',
    descriptionId: 'Kawasan suci ketenangan di tenggara terjauh! Dihiasi gerbang Torii megah berwarna merah tua, rumpun bambu zamrud luas, jembatan dan paviliun langit.',
    color: '#10b981',
    bounds: { minX: 105, maxX: 520, minZ: 35, maxZ: 460 },
    center: [240, 160],
    recommendedLevel: 5,
  },
  {
    id: 'kaldera_naga_api',
    name: 'Dragonfang Caldera & Inferno Archipelago',
    nameId: 'Kaldera Sarang Naga & Kepulauan Api',
    icon: '🐉',
    description: 'A blistering volcanic hellscape of smoking magma pools, scorched arches, and monumental dragon fossil ribcages.',
    descriptionId: 'Wilayah vulkanik paling berbahaya di utara terjauh! Aliran lahar pijar mendidih, kawah inti naga purba, serta kuburan fosil naga legendaris.',
    color: '#ef4444',
    bounds: { minX: -120, maxX: 140, minZ: -480, maxZ: -85 },
    center: [20, -220],
    recommendedLevel: 7,
  },
  {
    id: 'kerajaan_astraea',
    name: 'Grand Imperial Kingdom of Astraea',
    nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
    icon: '👑',
    description: 'A colossal imperial metropolis situated atop the eternal north snow plateau of Frostpeak, featuring the grand Sun Palace, towering marble colonnades, royal bazaar, and the Fountain of Immortality.',
    descriptionId: 'Ibukota kerajaan emas megah di ujung utara Puncak Salju Abadi Frostpeak, terpisah jauh dari Val-Kragor! Gerbang Utama menghadap lurus ke Barat (270°), Istana Kaisar Aurelius, dan jurang es purba di utara.',
    color: '#fbbf24',
    bounds: { minX: 140, maxX: 220, minZ: -295, maxZ: -225 },
    center: [180, -260],
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
    nameId: 'Gerbang Reruntuhan Kuno',
    regionId: 'reruntuhan_kuno',
    icon: '🏛️',
    pos: [-105, 32],
    desc: 'Kuil pilar batu kuno Vael di hulu barat, jauh dari pemukiman desa',
  },
  {
    id: 'wp_forest',
    nameId: 'Monolit Kristal Hutan',
    regionId: 'hutan_berbisik',
    icon: '🔮',
    pos: [28, 6],
    desc: 'Monolit kristal bercahaya di tengah hutan pinus mistis',
  },
  {
    id: 'wp_volcano',
    nameId: 'Gerbang Kawah Titan',
    regionId: 'kawah_obsidian',
    icon: '🌋',
    pos: [0, -36],
    desc: 'Pintu masuk menuju kawah vulkanik tempat bersemayamnya Titan',
  },
  {
    id: 'wp_bridge',
    nameId: 'Jembatan Gantung Ngarai Kabut',
    regionId: 'ngarai_kabut',
    icon: '🌉',
    pos: [75, -15],
    desc: 'Jembatan gantung kayu raksasa yang membentang di atas jurang jurang',
  },
  {
    id: 'wp_valkragor',
    nameId: 'Alun-Alun Benteng Val-Kragor',
    regionId: 'desa_valkragor',
    icon: '🏰',
    pos: [156, -16],
    desc: 'Desa benteng pertahanan di dataran tinggi timur, dekat Komandan Brann & pandai besi Goran',
  },
  {
    id: 'wp_frostpeak',
    nameId: 'Kuil Es Puncak Frostpeak',
    regionId: 'puncak_frostpeak',
    icon: '❄️',
    pos: [115, -65],
    desc: 'Altar puncak beku bersalju abadi dan peti kristal es legendaris',
  },
  {
    id: 'wp_frostpeak_glacier',
    nameId: 'Dataran Gletser Beku Frostpeak Luar',
    regionId: 'puncak_frostpeak',
    icon: '🏔️',
    pos: [240, -220],
    desc: 'Dataran tinggi es gletser abadi di utara-timur jauh luar Astraea',
  },
  {
    id: 'wp_shadowfen',
    nameId: 'Pusat Rawa Bayangan Purba',
    regionId: 'rawa_bayangan',
    icon: '🍄',
    pos: [-105, 12],
    desc: 'Gugusan jamur raksasa bercahaya di tengah rawa berkabut gelap barat',
  },
  {
    id: 'wp_shadowfen_deep',
    nameId: 'Lembah Jamur Abadi Shadowfen',
    regionId: 'rawa_bayangan',
    icon: '✨',
    pos: [-300, 25],
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
    pos: [-375, 350],
    desc: 'Pemukiman megah tanah liat, bazaar rempah eksotis, dan sumur oase Solaria',
  },
  {
    id: 'wp_solaria_palace',
    nameId: 'Istana Taj Mahal Sultan Solaria',
    regionId: 'gurun_solaria',
    icon: '🕌',
    pos: [-415, 350],
    desc: 'Kemegahan marmer putih arsitektur Taj Mahal, menara minaret, dan Ruang Takhta Sultan Malik',
  },
  {
    id: 'wp_solaria',
    nameId: 'Piramida Emas Gurun Solaria',
    regionId: 'gurun_solaria',
    icon: '🏜️',
    pos: [-165, 110],
    desc: 'Piramida kuno megah di tengah hamparan bukit pasir emas barat daya',
  },
  {
    id: 'wp_solaria_oasis',
    nameId: 'Oase Tersembunyi Solaria',
    regionId: 'gurun_solaria',
    icon: '🌴',
    pos: [-340, 260],
    desc: 'Oase rahasia berair jernih pirus dan pepohonan palem di pedalaman gurun luas',
  },
  {
    id: 'wp_thunderpeak',
    nameId: 'Altar Menara Puncak Halilintar',
    regionId: 'puncak_halilintar',
    icon: '⚡',
    pos: [-155, -135],
    desc: 'Tebing basalt petir berkilau di barat laut dengan kristal energi abadi',
  },
  {
    id: 'wp_jadepagoda',
    nameId: 'Kuil Pagoda Giok & Gerbang Torii',
    regionId: 'hutan_pagoda_giok',
    icon: '⛩️',
    pos: [165, 115],
    desc: 'Pagoda megah tiga tingkat beratap giok di tengah rumpun bambu tenggara',
  },
  {
    id: 'wp_jade_sanctuary',
    nameId: 'Paviliun Langit Bambu Surgawi',
    regionId: 'hutan_pagoda_giok',
    icon: '🪷',
    pos: [310, 210],
    desc: 'Kuil paviliun terbuka di perbukitan bambu timur terjauh',
  },
  {
    id: 'wp_dragoncaldera',
    nameId: 'Altar Kaldera Sarang Naga Purba',
    regionId: 'kaldera_naga_api',
    icon: '🐉',
    pos: [20, -145],
    desc: 'Lembah lava dan kuburan fosil naga raksasa di utara terjauh',
  },
  {
    id: 'wp_dragon_core',
    nameId: 'Inti Kawah Gunung Berapi Naga Purba',
    regionId: 'kaldera_naga_api',
    icon: '🔥',
    pos: [35, -280],
    desc: 'Kawah lava terdalam di jantung kaldera utara bersuhu ekstrem',
  },
  {
    id: 'wp_astraea',
    nameId: 'Gerbang Barat Kerajaan Emas Astraea & Istana Kaisar',
    regionId: 'kerajaan_astraea',
    icon: '👑',
    pos: [148, -260],
    desc: 'Gerbang Barat Ibukota Kerajaan Emas Astraea di utara Frostpeak, menghadap lurus ke arah barat (270°)',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // 0. Grand Imperial Kingdom of Astraea (North Frostpeak Citadel: x between 140 and 220, z between -295 and -225)
  if (x >= 140 && x <= 220 && z <= -225 && z >= -295) {
    return REGIONS[14];
  }
  // 1. Dragonfang Caldera & Inferno Core (Far North: z <= -85 && x between -120 and 140)
  if (z <= -85 && x >= -120 && x <= 140) {
    return REGIONS[13];
  }
  // 2. Thunderpeak Lightning Spire (Far North-West: x <= -70 && z <= -70)
  if (x <= -70 && z <= -70) {
    return REGIONS[11];
  }
  // 3. Solaria Golden Dunes & Oasis (Far South-West: x <= -95 && z >= 35)
  if (x <= -95 && z >= 35) {
    return REGIONS[10];
  }
  // 4. Jade Bamboo Grove & Sanctuary (Far South-East: x >= 105 && z >= 35)
  if (x >= 105 && z >= 35) {
    return REGIONS[12];
  }
  // 5. Frostpeak Summit & Mountain Glacier (Expanded Far North-East: x >= 45 && z <= -34)
  if (x >= 45 && z <= -34 && (x >= 70 || z <= -45)) {
    return REGIONS[7];
  }
  // 6. Obsidian Volcanic Caldera (North)
  if (z <= -32 && Math.abs(x) < 85) {
    return REGIONS[4];
  }
  // 7. Shadowfen Gloom Marsh (Mid-Far West: x <= -65 && z between -75 and 140)
  if (x <= -65 && z >= -75 && z <= 140) {
    return REGIONS[8];
  }
  // 8. Fortress Village Val-Kragor (Far East Highland)
  if (x >= 85 && x <= 155 && z >= -48 && z <= 18) {
    return REGIONS[6];
  }
  // 9. Misty Chasm & Suspension Bridge (Mid East)
  if (x >= 62 && x < 85 && z >= -35 && z <= 12) {
    return REGIONS[5];
  }
  // 10. Coral Cove (South-East Coast)
  if (x >= 52 && z >= 22) {
    return REGIONS[9];
  }
  // 11. Azure Coast & Ocean (South)
  if (z >= 18) {
    return REGIONS[1];
  }
  // 12. Ancient Sunken Ruins (Far-West Outskirts: x: -145..-85, z: 12..65)
  if (x <= -85 && x >= -145 && z >= 12 && z <= 65) {
    return REGIONS[2];
  }
  // Sanctuary Village & Harbor Safe Zone
  if (Math.hypot(x, z) < 55 || (Math.abs(x) <= 32 && z >= 15 && z <= 58)) {
    return REGIONS[0];
  }
  // 13. Whispering Mystic Forest (East)
  if (x >= 16 && x < 62 && z >= -30 && z <= 25) {
    return REGIONS[3];
  }
  // Default: Desa Sanctuary Eldoria (Center)
  return REGIONS[0];
}
