import { RegionInfo, MapMarker } from '../types/game';

export const REGIONS: RegionInfo[] = [
  {
    id: 'desa_eldoria',
    name: 'Sanctuary Village',
    nameId: 'Desa Utama Sanctuary Eldoria',
    icon: '🏡',
    description: 'A peaceful settlement with cottages, stone plazas, and a blessed rejuvenation fountain.',
    descriptionId: 'Pusat desa damai dengan rumah bertingkat kayu, air mancur pemulih suci, bengkel tempa Torvald, dan kedai.',
    color: '#4caf50',
    bounds: { minX: -16, maxX: 16, minZ: -18, maxZ: 14 },
    center: [0, -2],
    recommendedLevel: 1,
  },
  {
    id: 'pantai_azure',
    name: 'Azure Coast & Ocean',
    nameId: 'Laut Biru & Pantai Pasir Azure',
    icon: '🌊',
    description: 'Sandy shores with gentle sea breezes, wooden docks, and shimmering ocean waves.',
    descriptionId: 'Hamparan pasir pantai keemasan, dermaga kayu nelayan Pak Joko, perahu kayu, dan deburan ombak laut biru.',
    color: '#00b4d8',
    bounds: { minX: -30, maxX: 50, minZ: 14, maxZ: 85 },
    center: [6, 42],
    recommendedLevel: 2,
  },
  {
    id: 'reruntuhan_kuno',
    name: 'Ancient Sunken Ruins',
    nameId: 'Reruntuhan Kuno Vael',
    icon: '🏛️',
    description: 'Forgotten stone monoliths, archways, and rune altars guarded by restless skeletons.',
    descriptionId: 'Pilar-pilar batu megah peradaban kuno, gerbang rune misterius, dan peti pusaka yang dijaga pasukan tengkorak terkutuk.',
    color: '#90a4ae',
    bounds: { minX: -65, maxX: -16, minZ: -15, maxZ: 45 },
    center: [-34, 18],
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
    bounds: { minX: 62, maxX: 92, minZ: -35, maxZ: 10 },
    center: [75, -15],
    recommendedLevel: 3,
  },
  {
    id: 'desa_valkragor',
    name: 'Fortress Village Val-Kragor',
    nameId: 'Desa Benteng Val-Kragor',
    icon: '🏰',
    description: 'A fortified highland village with stone ramparts, watchtowers, garrison keep, and elite smithies.',
    descriptionId: 'Desa benteng dataran tinggi megah yang berjarak jauh di timur! Dilengkapi gerbang pertahanan kokoh, menara pengawas, kedai serigala, perapian hangat, dan markas Komandan Brann.',
    color: '#3b82f6',
    bounds: { minX: 95, maxX: 145, minZ: -42, maxZ: 10 },
    center: [115, -18],
    recommendedLevel: 4,
  },
  {
    id: 'puncak_frostpeak',
    name: 'Frostpeak Glacier & Cryo Altar',
    nameId: 'Puncak Salju Abadi Frostpeak',
    icon: '❄️',
    description: 'Perpetually snow-covered mountain peaks with crystalline ice spires and an ancient frozen sanctuary.',
    descriptionId: 'Puncak gunung bersalju abadi di utara-timur jauh, dihuni Serigala Frostfang dan pilar kristal es bercahaya dengan altar kuno.',
    color: '#38bdf8',
    bounds: { minX: 88, maxX: 155, minZ: -130, maxZ: -45 },
    center: [122, -85],
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
    bounds: { minX: -145, maxX: -65, minZ: -25, maxZ: 45 },
    center: [-105, 12],
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
    bounds: { minX: 52, maxX: 140, minZ: 25, maxZ: 85 },
    center: [88, 55],
    recommendedLevel: 3,
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
    pos: [0, -3],
    desc: 'Pusat desa awal, dekat Tetua Vaelen dan air mancur suci',
  },
  {
    id: 'wp_beach',
    nameId: 'Dermaga Pantai Azure',
    regionId: 'pantai_azure',
    icon: '⚓',
    pos: [4, 34],
    desc: 'Dermaga kayu nelayan menghadap ke laut lepas selatan',
  },
  {
    id: 'wp_ruins',
    nameId: 'Gerbang Reruntuhan Kuno',
    regionId: 'reruntuhan_kuno',
    icon: '🏛️',
    pos: [-28, 20],
    desc: 'Kuil batu kuno penuh misteri dan peti harta karun',
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
    pos: [115, -18],
    desc: 'Desa kedua di dataran tinggi timur, dekat Komandan Brann & pandai besi Goran',
  },
  {
    id: 'wp_frostpeak',
    nameId: 'Kuil Es Puncak Frostpeak',
    regionId: 'puncak_frostpeak',
    icon: '❄️',
    pos: [122, -85],
    desc: 'Altar puncak beku bersalju abadi dan peti kristal es legendaris',
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
    id: 'wp_coralcove',
    nameId: 'Bangkai Kapal Teluk Karang',
    regionId: 'teluk_karang',
    icon: '🏴‍☠️',
    pos: [88, 55],
    desc: 'Karamnya kapal bajak laut di pesisir karang eksotis tenggara',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // 1. Frostpeak Summit (Far North-East)
  if (x >= 85 && z <= -45) {
    return REGIONS[7];
  }
  // 2. Obsidian Volcanic Caldera (North)
  if (z <= -32 && Math.abs(x) < 85) {
    return REGIONS[4];
  }
  // 3. Shadowfen Gloom Marsh (Far West)
  if (x <= -65) {
    return REGIONS[8];
  }
  // 4. Fortress Village Val-Kragor (Far East Highland)
  if (x >= 95 && z >= -45 && z <= 12) {
    return REGIONS[6];
  }
  // 5. Misty Chasm & Suspension Bridge (Mid East)
  if (x >= 62 && x < 95 && z >= -35 && z <= 12) {
    return REGIONS[5];
  }
  // 6. Coral Cove (Far South East Coast)
  if (x >= 52 && z >= 22) {
    return REGIONS[9];
  }
  // 7. Azure Coast & Ocean (South)
  if (z >= 18) {
    return REGIONS[1];
  }
  // 8. Ancient Sunken Ruins (West)
  if (x <= -16 && z >= -15 && z <= 35) {
    return REGIONS[2];
  }
  // 9. Whispering Mystic Forest (East)
  if (x >= 16 && x < 62 && z >= -30 && z <= 25) {
    return REGIONS[3];
  }
  // Default: Desa Sanctuary Eldoria (Center)
  return REGIONS[0];
}
