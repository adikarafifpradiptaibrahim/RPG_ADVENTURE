/**
 * Monster & Enemy Spawn Configurations
 * Manages monster placement across world biomes, including Frostpeak wilderness wolves.
 */

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
 * Frostpeak Glacier Frostfang Wolves (Lv. 5)
 * Positioned in the snowy mountain wilderness outside the walls of Ibukota Astraea
 * (roaming the mountain trails between Val-Kragor and Astraea, and the eastern crags).
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
    pos: [102, -58],
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
    pos: [128, -62],
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
    pos: [142, -72],
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
    pos: [84, -76],
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
    pos: [86, -100],
    patrolRadius: 12,
    aggroRange: 14,
  },
];
