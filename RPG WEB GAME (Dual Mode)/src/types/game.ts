export type CharacterClass = 'warrior' | 'mage' | 'rogue';

export interface PlayerStats {
  level: number;
  exp: number;
  maxExp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  statPoints: number;
  strength: number;     // boosts physical attack & max HP
  agility: number;      // boosts movement speed, stamina, crit chance
  intelligence: number; // boosts magic attack, max MP, skill cooldowns
  baseAttack: number;
  baseDefense: number;
  characterClass: CharacterClass;
}

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'quest';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name: string;
  nameId: string; // Indonesian name
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  descriptionId: string;
  icon: string;
  value: number;
  stats?: {
    attack?: number;
    defense?: number;
    hp?: number;
    mp?: number;
    speed?: number;
  };
  consumableEffect?: {
    hpRestore?: number;
    mpRestore?: number;
  };
  equipped?: boolean;
  enhancementLevel?: number;
}

export interface Quest {
  id: string;
  title: string;
  titleId: string;
  description: string;
  descriptionId: string;
  targetType: 'kill' | 'collect' | 'talk' | 'boss';
  targetEnemy?: string;
  targetCount: number;
  currentCount: number;
  rewardExp: number;
  rewardGold: number;
  rewardItem?: Item;
  completed: boolean;
  claimed: boolean;
  requiredLevel: number;
}

export interface EnemyData {
  id: string;
  name: string;
  nameId: string;
  type: 'slime' | 'magma_slime' | 'skeleton' | 'skeleton_mage' | 'goblin' | 'golem' | 'spider' | 'frost_wolf' | 'swamp_crawler' | 'boss';
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  expReward: number;
  goldReward: number;
  speed: number;
  attackRange: number;
  detectRange: number;
  position: [number, number, number];
  isDead: boolean;
  dropItems: { item: Item; chance: number }[];
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  type: 'damage' | 'heal' | 'exp' | 'crit' | 'info';
  createdAt: number;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  speakerTitle: string;
  text: string;
  textId: string;
  avatarIcon: string;
  options: {
    label: string;
    labelId: string;
    nextId?: string;
    action?: 'acceptQuest' | 'openShop' | 'close' | 'heal';
    questId?: string;
    shopType?: 'blacksmith' | 'potions' | 'equipment' | 'general' | 'mystic';
  }[];
}

export interface RegionInfo {
  id: string;
  name: string;
  nameId: string;
  icon: string;
  description: string;
  descriptionId: string;
  color: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  center: [number, number]; // [x, z]
  recommendedLevel: number;
}

export interface MapMarker {
  id: string;
  title: string;
  type: 'player' | 'npc' | 'enemy' | 'boss' | 'chest' | 'waypoint' | 'fountain' | 'pier';
  x: number;
  z: number;
  icon?: string;
  color?: string;
  description?: string;
}

