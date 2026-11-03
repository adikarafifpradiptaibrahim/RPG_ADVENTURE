import { EnemyData } from '../types/game';

export interface MonsterSpawnConfig {
  id: string;
  name: string;
  nameId: string;
  type: EnemyData['type'];
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  expReward: number;
  goldReward: number;
  pos: [number, number]; // [x, z]
  patrolRadius: number;
  aggroRange: number;
}

/**
 * Checks if a world coordinate (x, z) is inside the Sanctuary Village & Harbor Safe Zone.
 * Radius: 55 units around village plaza + coastal harbor dock corridor (x: -45..45, z: 15..65).
 */
export function isInsideSanctuarySafeZone(x: number, z: number): boolean {
  if (Math.hypot(x, z) < 55) return true;
  if (Math.abs(x) <= 45 && z >= 15 && z <= 65) return true;
  return false;
}

export function isInsideValKragorSafeZone(x: number, z: number): boolean {
  return x >= 125 && x <= 190 && z >= -45 && z <= 15;
}

export function isInsideAstraeaSafeZone(x: number, z: number): boolean {
  return x >= 144 && x <= 214 && z >= -290 && z <= -230;
}

/**
 * Global combined check for all inhabited civilization safe zones.
 * Ensures monsters do not harass players inside Sanctuary, Val-Kragor, or Astraea Capital.
 */
export function isInsideSafeZone(x: number, z: number): boolean {
  return isInsideSanctuarySafeZone(x, z) || isInsideValKragorSafeZone(x, z) || isInsideAstraeaSafeZone(x, z);
}


/**
 * 1. Meadow Slimes (Lv. 1)
 * Relocated to the Eastern Plains & Outer Meadows (> 85 units east from Sanctuary)
 */
export const MEADOW_SLIME_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'slime_0',
    name: 'Meadow Slime',
    nameId: 'Slime Lembah Hijau',
    type: 'slime',
    level: 1,
    hp: 45,
    maxHp: 45,
    attack: 7,
    defense: 2,
    expReward: 25,
    goldReward: 12,
    pos: [85, 24],
    patrolRadius: 8,
    aggroRange: 12,
  },
  {
    id: 'slime_1',
    name: 'Meadow Slime',
    nameId: 'Slime Lembah Hijau',
    type: 'slime',
    level: 1,
    hp: 45,
    maxHp: 45,
    attack: 7,
    defense: 2,
    expReward: 25,
    goldReward: 12,
    pos: [92, 32],
    patrolRadius: 9,
    aggroRange: 12,
  },
  {
    id: 'slime_2',
    name: 'Meadow Slime',
    nameId: 'Slime Lembah Hijau',
    type: 'slime',
    level: 1,
    hp: 45,
    maxHp: 45,
    attack: 7,
    defense: 2,
    expReward: 25,
    goldReward: 12,
    pos: [88, 16],
    patrolRadius: 8,
    aggroRange: 12,
  },
  {
    id: 'slime_3',
    name: 'Meadow Slime',
    nameId: 'Slime Lembah Hijau',
    type: 'slime',
    level: 1,
    hp: 45,
    maxHp: 45,
    attack: 7,
    defense: 2,
    expReward: 25,
    goldReward: 12,
    pos: [98, 28],
    patrolRadius: 10,
    aggroRange: 12,
  },
  {
    id: 'slime_4',
    name: 'Meadow Slime',
    nameId: 'Slime Lembah Hijau',
    type: 'slime',
    level: 1,
    hp: 45,
    maxHp: 45,
    attack: 7,
    defense: 2,
    expReward: 25,
    goldReward: 12,
    pos: [104, 38],
    patrolRadius: 10,
    aggroRange: 12,
  },
];

/**
 * 2. Northern Caldera Magma Slimes (Lv. 3)
 * Relocated deep into northern volcanic crags (> 85 units north from village)
 */
export const MAGMA_SLIME_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'magma_slime_0',
    name: 'Magma Slime',
    nameId: 'Slime Lava Pijar',
    type: 'magma_slime',
    level: 3,
    hp: 95,
    maxHp: 95,
    attack: 16,
    defense: 6,
    expReward: 65,
    goldReward: 35,
    pos: [-14, -86],
    patrolRadius: 8,
    aggroRange: 14,
  },
  {
    id: 'magma_slime_1',
    name: 'Magma Slime',
    nameId: 'Slime Lava Pijar',
    type: 'magma_slime',
    level: 3,
    hp: 95,
    maxHp: 95,
    attack: 16,
    defense: 6,
    expReward: 65,
    goldReward: 35,
    pos: [16, -88],
    patrolRadius: 8,
    aggroRange: 14,
  },
  {
    id: 'magma_slime_2',
    name: 'Magma Slime',
    nameId: 'Slime Lava Pijar',
    type: 'magma_slime',
    level: 3,
    hp: 95,
    maxHp: 95,
    attack: 16,
    defense: 6,
    expReward: 65,
    goldReward: 35,
    pos: [-8, -98],
    patrolRadius: 9,
    aggroRange: 14,
  },
  {
    id: 'magma_slime_3',
    name: 'Magma Slime',
    nameId: 'Slime Lava Pijar',
    type: 'magma_slime',
    level: 3,
    hp: 95,
    maxHp: 95,
    attack: 16,
    defense: 6,
    expReward: 65,
    goldReward: 35,
    pos: [12, -104],
    patrolRadius: 9,
    aggroRange: 14,
  },
];

/**
 * 3. Ancient Ruins Skeleton Sentinels (Lv. 2)
 * Relocated to the upstream outer Ancient Ruins of Vael (> 110 units west from village)
 */
export const SKELETON_SENTINEL_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'skeleton_0',
    name: 'Skeleton Sentinel',
    nameId: 'Prajurit Tengkorak Kuno',
    type: 'skeleton',
    level: 2,
    hp: 85,
    maxHp: 85,
    attack: 14,
    defense: 5,
    expReward: 55,
    goldReward: 30,
    pos: [-108, 28],
    patrolRadius: 10,
    aggroRange: 14,
  },
  {
    id: 'skeleton_1',
    name: 'Skeleton Sentinel',
    nameId: 'Prajurit Tengkorak Kuno',
    type: 'skeleton',
    level: 2,
    hp: 85,
    maxHp: 85,
    attack: 14,
    defense: 5,
    expReward: 55,
    goldReward: 30,
    pos: [-116, 36],
    patrolRadius: 11,
    aggroRange: 14,
  },
  {
    id: 'skeleton_2',
    name: 'Skeleton Sentinel',
    nameId: 'Prajurit Tengkorak Kuno',
    type: 'skeleton',
    level: 2,
    hp: 85,
    maxHp: 85,
    attack: 14,
    defense: 5,
    expReward: 55,
    goldReward: 30,
    pos: [-124, 44],
    patrolRadius: 10,
    aggroRange: 14,
  },
  {
    id: 'skeleton_3',
    name: 'Skeleton Sentinel',
    nameId: 'Prajurit Tengkorak Kuno',
    type: 'skeleton',
    level: 2,
    hp: 85,
    maxHp: 85,
    attack: 14,
    defense: 5,
    expReward: 55,
    goldReward: 30,
    pos: [-112, 50],
    patrolRadius: 10,
    aggroRange: 14,
  },
];

/**
 * 4. Deep Ruins Skeleton Necromancers (Lv. 4)
 * Located deep inside the ancient ruined sanctuary (> 130 units west)
 */
export const SKELETON_MAGE_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'skeleton_mage_0',
    name: 'Necromancer Lich',
    nameId: 'Penyihir Kematian Tengkorak',
    type: 'skeleton_mage',
    level: 4,
    hp: 120,
    maxHp: 120,
    attack: 22,
    defense: 4,
    expReward: 90,
    goldReward: 55,
    pos: [-128, 26],
    patrolRadius: 12,
    aggroRange: 18,
  },
  {
    id: 'skeleton_mage_1',
    name: 'Necromancer Lich',
    nameId: 'Penyihir Kematian Tengkorak',
    type: 'skeleton_mage',
    level: 4,
    hp: 120,
    maxHp: 120,
    attack: 22,
    defense: 4,
    expReward: 90,
    goldReward: 55,
    pos: [-136, 38],
    patrolRadius: 12,
    aggroRange: 18,
  },
  {
    id: 'skeleton_mage_2',
    name: 'Necromancer Lich',
    nameId: 'Penyihir Kematian Tengkorak',
    type: 'skeleton_mage',
    level: 4,
    hp: 120,
    maxHp: 120,
    attack: 22,
    defense: 4,
    expReward: 90,
    goldReward: 55,
    pos: [-132, 52],
    patrolRadius: 12,
    aggroRange: 18,
  },
];

/**
 * 5. Outer Coast Beach Goblins (Lv. 2)
 * Relocated along the distant coral coastline (> 110 units south-east)
 */
export const BEACH_GOBLIN_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'beach_goblin_0',
    name: 'Coast Crawler Goblin',
    nameId: 'Goblin Penjarah Pantai',
    type: 'goblin',
    level: 2,
    hp: 70,
    maxHp: 70,
    attack: 11,
    defense: 4,
    expReward: 40,
    goldReward: 22,
    pos: [88, 68],
    patrolRadius: 10,
    aggroRange: 13,
  },
  {
    id: 'beach_goblin_1',
    name: 'Coast Crawler Goblin',
    nameId: 'Goblin Penjarah Pantai',
    type: 'goblin',
    level: 2,
    hp: 70,
    maxHp: 70,
    attack: 11,
    defense: 4,
    expReward: 40,
    goldReward: 22,
    pos: [98, 76],
    patrolRadius: 11,
    aggroRange: 13,
  },
  {
    id: 'beach_goblin_2',
    name: 'Coast Crawler Goblin',
    nameId: 'Goblin Penjarah Pantai',
    type: 'goblin',
    level: 2,
    hp: 70,
    maxHp: 70,
    attack: 11,
    defense: 4,
    expReward: 40,
    goldReward: 22,
    pos: [82, 84],
    patrolRadius: 10,
    aggroRange: 13,
  },
  {
    id: 'beach_goblin_3',
    name: 'Coast Crawler Goblin',
    nameId: 'Goblin Penjarah Pantai',
    type: 'goblin',
    level: 2,
    hp: 70,
    maxHp: 70,
    attack: 11,
    defense: 4,
    expReward: 40,
    goldReward: 22,
    pos: [106, 88],
    patrolRadius: 12,
    aggroRange: 13,
  },
];

/**
 * 6. Mystic Forest Stone Golems (Lv. 4)
 * Relocated deep into eastern ancient pine forest (> 95 units east)
 */
export const FOREST_GOLEM_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'forest_golem_0',
    name: 'Ancient Stone Guardian',
    nameId: 'Golem Penjaga Hutan',
    type: 'golem',
    level: 4,
    hp: 175,
    maxHp: 175,
    attack: 20,
    defense: 12,
    expReward: 110,
    goldReward: 65,
    pos: [88, -38],
    patrolRadius: 10,
    aggroRange: 15,
  },
  {
    id: 'forest_golem_1',
    name: 'Ancient Stone Guardian',
    nameId: 'Golem Penjaga Hutan',
    type: 'golem',
    level: 4,
    hp: 175,
    maxHp: 175,
    attack: 20,
    defense: 12,
    expReward: 110,
    goldReward: 65,
    pos: [96, -48],
    patrolRadius: 11,
    aggroRange: 15,
  },
  {
    id: 'forest_golem_2',
    name: 'Ancient Stone Guardian',
    nameId: 'Golem Penjaga Hutan',
    type: 'golem',
    level: 4,
    hp: 175,
    maxHp: 175,
    attack: 20,
    defense: 12,
    expReward: 110,
    goldReward: 65,
    pos: [92, -26],
    patrolRadius: 10,
    aggroRange: 15,
  },
];

/**
 * 7. Deep Pine Canopy Venomous Spiders (Lv. 3)
 * Relocated deep into northern forest hollows (> 105 units north-east)
 */
export const FOREST_SPIDER_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'forest_spider_0',
    name: 'Venomfang Weaver',
    nameId: 'Laba-laba Racun Belantara',
    type: 'spider',
    level: 3,
    hp: 80,
    maxHp: 80,
    attack: 15,
    defense: 3,
    expReward: 60,
    goldReward: 32,
    pos: [82, -72],
    patrolRadius: 10,
    aggroRange: 16,
  },
  {
    id: 'forest_spider_1',
    name: 'Venomfang Weaver',
    nameId: 'Laba-laba Racun Belantara',
    type: 'spider',
    level: 3,
    hp: 80,
    maxHp: 80,
    attack: 15,
    defense: 3,
    expReward: 60,
    goldReward: 32,
    pos: [90, -80],
    patrolRadius: 10,
    aggroRange: 16,
  },
  {
    id: 'forest_spider_2',
    name: 'Venomfang Weaver',
    nameId: 'Laba-laba Racun Belantara',
    type: 'spider',
    level: 3,
    hp: 80,
    maxHp: 80,
    attack: 15,
    defense: 3,
    expReward: 60,
    goldReward: 32,
    pos: [96, -68],
    patrolRadius: 11,
    aggroRange: 16,
  },
  {
    id: 'forest_spider_3',
    name: 'Venomfang Weaver',
    nameId: 'Laba-laba Racun Belantara',
    type: 'spider',
    level: 3,
    hp: 80,
    maxHp: 80,
    attack: 15,
    defense: 3,
    expReward: 60,
    goldReward: 32,
    pos: [84, -88],
    patrolRadius: 10,
    aggroRange: 16,
  },
];

/**
 * 8. Frostpeak Glacier Frostfang Wolves (Lv. 5)
 * Positioned across the snowy mountain wilderness between Val-Kragor
 * and the relocated northern citadel of Astraea.
 */
export const FROST_WOLF_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'frost_wolf_0',
    name: 'Frostfang Glacier Wolf Alpha',
    nameId: 'Serigala Es Frostfang Alpha',
    type: 'frost_wolf',
    level: 5,
    hp: 150,
    maxHp: 150,
    attack: 24,
    defense: 12,
    expReward: 65,
    goldReward: 35,
    pos: [115, -75],
    patrolRadius: 10,
    aggroRange: 14,
  },
  {
    id: 'frost_wolf_1',
    name: 'Frostfang Glacier Stalker',
    nameId: 'Serigala Es Frostfang Pemburu',
    type: 'frost_wolf',
    level: 5,
    hp: 135,
    maxHp: 135,
    attack: 22,
    defense: 10,
    expReward: 55,
    goldReward: 28,
    pos: [135, -120],
    patrolRadius: 12,
    aggroRange: 14,
  },
  {
    id: 'frost_wolf_2',
    name: 'Frostfang Ridge Wolf',
    nameId: 'Serigala Es Punggung Frostpeak',
    type: 'frost_wolf',
    level: 5,
    hp: 140,
    maxHp: 140,
    attack: 23,
    defense: 11,
    expReward: 58,
    goldReward: 30,
    pos: [142, -170],
    patrolRadius: 11,
    aggroRange: 14,
  },
  {
    id: 'frost_wolf_3',
    name: 'Frostfang Snow Rover',
    nameId: 'Serigala Es Lembah Salju',
    type: 'frost_wolf',
    level: 5,
    hp: 130,
    maxHp: 130,
    attack: 21,
    defense: 10,
    expReward: 52,
    goldReward: 26,
    pos: [122, -220],
    patrolRadius: 10,
    aggroRange: 13,
  },
  {
    id: 'frost_wolf_4',
    name: 'Frostfang Ice Hunter',
    nameId: 'Serigala Es Tebing Beku',
    type: 'frost_wolf',
    level: 5,
    hp: 138,
    maxHp: 138,
    attack: 22,
    defense: 11,
    expReward: 56,
    goldReward: 28,
    pos: [135, -250],
    patrolRadius: 12,
    aggroRange: 14,
  },
];

/**
 * 9. Shadowfen Gloom Marsh Crawlers & Bog Lurkers (Lv. 4 - 6)
 * Positioned across the murky swamp pools and glowing mushroom thickets
 */
export const SWAMP_CRAWLER_SPAWNS: MonsterSpawnConfig[] = [
  {
    id: 'swamp_crawler_0',
    name: 'Toxic Marsh Crawler',
    nameId: 'Monster Lintah Rawa Bayangan',
    type: 'swamp_crawler',
    level: 4,
    hp: 110,
    maxHp: 110,
    attack: 18,
    defense: 6,
    expReward: 85,
    goldReward: 48,
    pos: [-95, 12],
    patrolRadius: 10,
    aggroRange: 14,
  },
  {
    id: 'swamp_crawler_1',
    name: 'Toxic Marsh Crawler',
    nameId: 'Monster Lintah Rawa Bayangan',
    type: 'swamp_crawler',
    level: 4,
    hp: 110,
    maxHp: 110,
    attack: 18,
    defense: 6,
    expReward: 85,
    goldReward: 48,
    pos: [-135, 22],
    patrolRadius: 12,
    aggroRange: 14,
  },
  {
    id: 'swamp_crawler_2',
    name: 'Gloomfen Bog Lurker',
    nameId: 'Pemangsa Rawa Gelap Gloomfen',
    type: 'swamp_crawler',
    level: 5,
    hp: 140,
    maxHp: 140,
    attack: 22,
    defense: 8,
    expReward: 105,
    goldReward: 60,
    pos: [-185, 15],
    patrolRadius: 12,
    aggroRange: 15,
  },
  {
    id: 'swamp_crawler_3',
    name: 'Gloomfen Bog Lurker',
    nameId: 'Pemangsa Rawa Gelap Gloomfen',
    type: 'swamp_crawler',
    level: 5,
    hp: 140,
    maxHp: 140,
    attack: 22,
    defense: 8,
    expReward: 105,
    goldReward: 60,
    pos: [-240, 32],
    patrolRadius: 14,
    aggroRange: 15,
  },
  {
    id: 'swamp_crawler_4',
    name: 'Ancient Abyssal Mire Fiend',
    nameId: 'Iblis Rawa Purba Abyssal',
    type: 'swamp_crawler',
    level: 6,
    hp: 175,
    maxHp: 175,
    attack: 26,
    defense: 10,
    expReward: 135,
    goldReward: 78,
    pos: [-285, 20],
    patrolRadius: 15,
    aggroRange: 16,
  },
];
