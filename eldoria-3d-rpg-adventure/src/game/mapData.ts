import { RegionInfo, MapMarker } from '../types/game';

export const REGIONS: RegionInfo[] = [
  {
    id: 'desa_eldoria',
    name: 'Sanctuary Village',
    nameId: 'Pedesaan & Desa Sanctuary',
    icon: '🏡',
    description: 'A peaceful settlement with cottages, stone plazas, and a blessed rejuvenation fountain.',
    descriptionId: 'Pedesaan damai dengan rumah bertingkat kayu, lumbung hasil panen, dan air mancur suci pemulih tenaga.',
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
    descriptionId: 'Hamparan pasir pantai keemasan, dermaga kayu nelayan, perahu kayu, dan deburan ombak laut biru membentang ke selatan.',
    color: '#00b4d8',
    bounds: { minX: -30, maxX: 45, minZ: 14, maxZ: 75 },
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
    bounds: { minX: 16, maxX: 65, minZ: -30, maxZ: 25 },
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
    bounds: { minX: -45, maxX: 45, minZ: -75, maxZ: -32 },
    center: [0, -52],
    recommendedLevel: 4,
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
    nameId: 'Air Mancur Desa Sanctuary',
    regionId: 'desa_eldoria',
    icon: '⛲',
    pos: [0, -3],
    desc: 'Pusat desa, dekat Tetua Vaelen dan air mancur suci',
  },
  {
    id: 'wp_beach',
    nameId: 'Dermaga Pantai Azure',
    regionId: 'pantai_azure',
    icon: '⚓',
    pos: [4, 36],
    desc: 'Dermaga kayu menghadap ke laut lepas biru',
  },
  {
    id: 'wp_ruins',
    nameId: 'Gerbang Reruntuhan Kuno',
    regionId: 'reruntuhan_kuno',
    icon: '🏛️',
    pos: [-28, 20],
    desc: 'Kuil batu kuno penuh misteri dan peti harta',
  },
  {
    id: 'wp_forest',
    nameId: 'Monolit Kristal Hutan',
    regionId: 'hutan_berbisik',
    icon: '🔮',
    pos: [28, 6],
    desc: 'Monolit kristal bercahaya di tengah hutan pinus',
  },
  {
    id: 'wp_volcano',
    nameId: 'Gerbang Kawah Titan',
    regionId: 'kawah_obsidian',
    icon: '🌋',
    pos: [0, -36],
    desc: 'Pintu masuk menuju kawah vulkanik tempat bersemayamnya Titan',
  },
];

export function getCurrentRegion(x: number, z: number): RegionInfo {
  // Check specific zones first
  if (z <= -32) {
    return REGIONS[4]; // Kawah Vulkanik
  }
  if (z >= 18 && (x > -15 || z >= 28)) {
    return REGIONS[1]; // Pantai & Laut Azure
  }
  if (x <= -16 && z >= -15 && z <= 35) {
    return REGIONS[2]; // Reruntuhan Kuno
  }
  if (x >= 16 && z >= -30 && z <= 25) {
    return REGIONS[3]; // Hutan Mistis
  }
  return REGIONS[0]; // Desa Eldoria
}
