import * as THREE from 'three';
import { EnemyData } from '../types/game';
import { BossSkill } from './monsters';

export interface BossArenaZone {
  id: 'boss_titan' | 'boss_dragonfang' | 'boss_jarrus';
  nameId: string;
  bossType: 'titan' | 'dragon' | 'worm';
  center: { x: number; z: number };
  radius: number;
  aggroRange: number;
}

export const SPAWN_NAGA: [number, number] = [80, 360];
export const NAGA_CALDERA_RADIUS = 48;
export const STATE_FLYING_PURSUIT = 'STATE_FLYING_PURSUIT';

export const BOSS_ARENA_ZONES: Record<string, BossArenaZone> = {
  boss_titan: {
    id: 'boss_titan',
    nameId: 'Sang Titan Kuno Obsidian',
    bossType: 'titan',
    center: { x: -196, z: -254 },
    radius: 42,
    aggroRange: 42,
  },
  boss_dragonfang: {
    id: 'boss_dragonfang',
    nameId: 'Ignis, Sang Naga Purba',
    bossType: 'dragon',
    center: { x: 80, z: 360 },
    radius: 48,
    aggroRange: 48,
  },
  boss_jarrus: {
    id: 'boss_jarrus',
    nameId: 'Jarrus, Sang Cacing Purba Solaria',
    bossType: 'worm',
    center: { x: 495, z: -362 },
    radius: 48,
    aggroRange: 48,
  },
};

/**
 * Checks if a world position is within any active Boss Arena bounding zone
 */
export function getActiveBossZoneForPosition(
  x: number,
  z: number
): { zone: BossArenaZone; distToCenter: number } | null {
  for (const zone of Object.values(BOSS_ARENA_ZONES)) {
    const distToCenter = Math.hypot(x - zone.center.x, z - zone.center.z);
    if (distToCenter <= zone.radius) {
      return { zone, distToCenter };
    }
  }
  return null;
}

/**
 * Combat Decision Matrix for Boss AI rotations
 */
export class MonsterCombatAI {
  /**
   * Evaluates the best available skill for Titan Kuno Obsidian (Lv. 8)
   */
  public static selectTitanSkill(
    distToPlayer: number,
    cdMap: Map<string, number>
  ): string | null {
    const slamCd = cdMap.get('seismic_slam') ?? cdMap.get('earthquake_slam') ?? 0;
    const fissureCd = cdMap.get('earth_fissure') ?? 0;
    const boulderCd = cdMap.get('boulder_hurl') ?? cdMap.get('rock_throw') ?? 0;
    const punchCd = cdMap.get('heavy_punch') ?? 0;

    // Out of arena engagement range: do not trigger any skills
    if (distToPlayer > 42.0) {
      return null;
    }

    // 1. High-Priority AOE: Seismic Ground Slam (Semua jarak, Cooldown 14s)
    if (slamCd <= 0 && distToPlayer <= 25) {
      return 'seismic_slam';
    }

    // 2. Long-Range Gap Threat: Boulder Hurl (Jarak > 8 unit, Cooldown 6s)
    if (distToPlayer > 8.0 && distToPlayer <= 42.0 && boulderCd <= 0) {
      return 'boulder_hurl';
    }

    // 3. Mid/Long Ground Wave: Earth Fissure Strike (Jarak > 6 unit, Cooldown 8s)
    if (distToPlayer > 6.0 && distToPlayer <= 42.0 && fissureCd <= 0) {
      return 'earth_fissure';
    }

    // 4. Close Melee Threat: Heavy Melee Fist (Jarak <= 4 unit, Cooldown 2s)
    if (distToPlayer <= 4.2 && punchCd <= 0) {
      return 'heavy_punch';
    }

    return null;
  }

  /**
   * Evaluates if Naga Ignis should initiate Meteor Dive / Sky Crash
   */
  public static shouldTriggerMeteorDive(
    nagaPos: { x: number; z: number },
    playerPos: { x: number; z: number },
    meteorDiveCooldown: number
  ): boolean {
    const distToCenter = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
    const distToPlayer = Math.hypot(playerPos.x - nagaPos.x, playerPos.z - nagaPos.z);
    return distToCenter <= NAGA_CALDERA_RADIUS && distToPlayer >= 8.0 && distToPlayer <= 30.0 && meteorDiveCooldown <= 0;
  }

  /**
   * Evaluates if Naga Ignis should initiate Flying Pursuit (Gap Closer)
   */
  public static shouldTriggerFlyingPursuit(
    nagaPos: { x: number; z: number },
    playerPos: { x: number; z: number },
    flyingCooldown: number
  ): boolean {
    const distToCenter = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
    const distToPlayer = Math.hypot(playerPos.x - nagaPos.x, playerPos.z - nagaPos.z);

    // Rule:
    // 1. Pemain masih di dalam arena kaldera (jarak ke pusat <= 48 unit)
    // 2. Jarak pemain ke naga menjauh (distToPlayer > 12 unit)
    // 3. Skill terbang tidak sedang cooldown (flyingCooldown <= 0)
    return distToCenter <= NAGA_CALDERA_RADIUS && distToPlayer > 12.0 && flyingCooldown <= 0;
  }

  /**
   * Evaluates the best available skill for Naga Purba Ignis (Lv. 12)
   */
  public static selectDragonSkill(
    distToPlayer: number,
    dotWithPlayer: number, // dot product with forward facing vector
    cdMap: Map<string, number>,
    playerDistToCenter?: number
  ): string | null {
    // Out of arena engagement range: do not trigger any skills
    if (distToPlayer > 48.0) {
      return null;
    }

    const meteorDiveCd = cdMap.get('meteor_dive') ?? 0;
    const dashCd = cdMap.get('flying_dash') ?? cdMap.get('flying_pursuit') ?? 0;
    const fireballCd = cdMap.get('fireball_barrage') ?? 0;
    const breathCd = cdMap.get('flame_breath') ?? cdMap.get('fire_breath') ?? 0;
    const clawCd = cdMap.get('dragon_claw') ?? cdMap.get('tail_swipe') ?? 0;

    const inArena = playerDistToCenter !== undefined ? playerDistToCenter <= NAGA_CALDERA_RADIUS : true;

    // 1. SUPREME BOSS SKILL: Meteor Dive / Sky Crash (Jarak 8 - 30 unit, Cooldown 18s)
    if (inArena && distToPlayer >= 8.0 && distToPlayer <= 30.0 && meteorDiveCd <= 0) {
      return 'meteor_dive';
    }

    // 2. GAP CLOSER: Flying Dive / Dash Pursuit (Jarak > 12 unit, jika pemain di kaldera & Cooldown <= 0)
    if (inArena && distToPlayer > 12.0 && distToPlayer <= 48.0 && dashCd <= 0) {
      return 'flying_dash';
    }

    // 2. Ranged Bombardment: Fireball Barrage (Jarak > 8 unit, Cooldown 5s)
    if (distToPlayer > 8.0 && distToPlayer <= 48.0 && fireballCd <= 0) {
      return 'fireball_barrage';
    }

    // 3. Flame Breath / Semburan Kipas (Jarak <= 14 unit, Cooldown 10s)
    if (distToPlayer <= 14.0 && dotWithPlayer > 0.15 && breathCd <= 0) {
      return 'flame_breath';
    }

    // 4. Dragon Claw Strike (Jarak <= 5 unit, Cooldown 2.5s)
    if (distToPlayer <= 5.2 && clawCd <= 0) {
      return 'dragon_claw';
    }

    return null;
  }

  /**
   * Evaluates the best available skill for Cacing Purba Jarrus (Lv. 10)
   */
  public static selectSandwormSkill(
    distToPlayer: number,
    currentHp: number,
    maxHp: number,
    cdMap: Map<string, number>
  ): string | null {
    // Out of arena engagement range: do not trigger any skills
    if (distToPlayer > 48.0) {
      return null;
    }

    const whirlpoolCd = cdMap.get('sand_whirlpool') ?? 0;
    const burrowCd = cdMap.get('burrow_burst') ?? 0;
    const spikeCd = cdMap.get('sand_spike_barrage') ?? 0;
    const tailCd = cdMap.get('tail_slam') ?? 0;

    // 1. Desperation Mechanic: Sand Whirlpool (HP < 50%, Cooldown 18s)
    if (currentHp < maxHp * 0.5 && whirlpoolCd <= 0 && distToPlayer <= 45.0) {
      return 'sand_whirlpool';
    }

    // 2. Long Distance Eruption: Burrow & Surface Eruption (Jarak > 12 unit, Cooldown 6.5s)
    if (distToPlayer > 12.0 && distToPlayer <= 48.0 && burrowCd <= 0) {
      return 'burrow_burst';
    }

    // 3. Area Hazard: Sand Spike Barrage (Semua Jarak/Jauh, Cooldown 7s)
    if (distToPlayer <= 45.0 && spikeCd <= 0) {
      return 'sand_spike_barrage';
    }

    // 4. Close Range Defense: Tail Swipe (Jarak <= 6 unit, Cooldown 3s)
    if (distToPlayer <= 6.2 && tailCd <= 0) {
      return 'tail_slam';
    }

    return null;
  }
}

