import * as THREE from 'three';
import { EnemyData, PlayerStats } from '../types/game';
import { soundManager } from './audio';
import { MonsterCombatAI, SPAWN_NAGA, NAGA_CALDERA_RADIUS } from './monsterAI';
import {
  IGNIS_DRAGON_BOSS_CONFIG,
  ANCIENT_TITAN_BOSS_CONFIG,
  JARRUS_WORM_BOSS_CONFIG,
  BossConfig,
  BossSkill,
} from './monsters';

export interface ActiveTelegraph {
  id: string;
  type: 'cone' | 'circle' | 'line';
  mesh: THREE.Group;
  indicatorMesh: THREE.Mesh;
  borderMesh: THREE.Mesh;
  center: THREE.Vector3;
  direction?: THREE.Vector3;
  radius?: number;
  coneAngle?: number;
  length?: number;
  width?: number;
  timer: number;
  duration: number;
  skill: BossSkill;
  bossId: string;
  enemy?: {
    mesh: THREE.Group;
    parts?: Record<string, any>;
    spawnPos?: THREE.Vector3;
    leashRadius?: number;
  };
}

export interface PlayerStatusDebuffs {
  isStunned: boolean;
  stunTimer: number;
  isBurned: boolean;
  burnTimer: number;
  burnTickTimer: number;
  isSlowed?: boolean;
  slowTimer?: number;
}

export interface BossManagerCallbacks {
  onAddFloatingText: (text: string, color: string, type: 'damage' | 'heal' | 'crit' | 'exp' | 'info') => void;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onCameraShake: (amount: number) => void;
  onSpawnShockwave?: (pos: THREE.Vector3, color: number, maxRadius: number, duration: number) => void;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
  onSpawnBoulderProjectile?: (fromPos: THREE.Vector3, toPos: THREE.Vector3, damage: number) => void;
  onSpawnFireballProjectile?: (fromPos: THREE.Vector3, toPos: THREE.Vector3, damage: number) => void;
  onPlayerDeath?: () => void;
  onDamageAbsorb?: (rawDmg: number) => number;
  onAirborneChange?: (isAirborne: boolean) => void;
  onCameraFocusBoss?: (bossPos: THREE.Vector3, weight: number) => void;
}

/**
 * BossManager
 * Manages specialized boss attack mechanics, visual ground telegraph danger zones,
 * and player status debuffs (Stun, Burn DoT, Knockback).
 */
export class BossManager {
  private scene: THREE.Scene;
  private callbacks: BossManagerCallbacks;
  private telegraphs: ActiveTelegraph[] = [];
  private getTerrainHeight: (x: number, z: number) => number;

  // Boss internal states keyed by boss ID
  private skillCooldowns: Map<string, Map<string, number>> = new Map();
  private bossStates: Map<string, 'idle' | 'chase' | 'telegraph' | 'executing' | 'recovery' | 'flying_pursuit' | 'meteor_dive'> = new Map();
  private stateTimers: Map<string, number> = new Map();
  private activeTelegraphMap: Map<string, ActiveTelegraph> = new Map();

  // Aerial & Meteor Dive state
  public isDragonAirborne: boolean = false;
  private meteorDiveTarget: THREE.Vector3 | null = null;
  private meteorDiveIndicatorGroup: THREE.Group | null = null;
  private dragonOrbitStartAngle: number = 0;

  // Dragon Phase 2 Enrage & Extreme Volcanic Weather
  public dragonPhase: 1 | 2 = 1;
  public extremeWeatherFactor: number = 0;
  private weatherRecoveryDelayTimer: number = 0;
  private activeSeismicShockwaves: Array<{
    center: THREE.Vector3;
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    currentRadius: number;
    maxRadius: number;
    speed: number;
    damage: number;
    innerSafeRadius: number;
    hasHitPlayer: boolean;
  }> = [];

  // Player Debuff State
  public playerDebuffs: PlayerStatusDebuffs = {
    isStunned: false,
    stunTimer: 0,
    isBurned: false,
    burnTimer: 0,
    burnTickTimer: 0,
  };

  constructor(
    scene: THREE.Scene,
    getTerrainHeight: (x: number, z: number) => number,
    callbacks: BossManagerCallbacks
  ) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;
    this.callbacks = callbacks;
  }

  /**
   * Initializes tracking for a boss
   */
  public registerBoss(bossId: string, config: BossConfig) {
    const cdMap = new Map<string, number>();
    config.skills.forEach((skill) => {
      cdMap.set(skill.id, Math.random() * 3 + 2); // Initial randomized stagger
    });
    this.skillCooldowns.set(bossId, cdMap);
    this.bossStates.set(bossId, 'chase');
    this.stateTimers.set(bossId, 0);
  }

  /**
   * Main per-frame update for Boss AI and active telegraphs
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isPlayerDashing: boolean,
    isPlayerJumping: boolean = false
  ) {
    // 1. Update Player Status Debuffs (Stun & Burn DoT)
    this.updatePlayerDebuffs(delta);

    // 2. Update active seismic shockwaves
    this.updateSeismicShockwaves(delta, playerPos, playerVel, isPlayerJumping);

    // 3. Update and advance Active Telegraph Indicators
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tel = this.telegraphs[i];
      tel.timer += delta;
      const progress = Math.min(1.0, tel.timer / tel.duration);

      // Pulse telegraph opacity & scale inner molten danger zone
      const pulse = 0.55 + Math.sin(tel.timer * 14) * 0.35;
      (tel.indicatorMesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + pulse * 0.4;
      (tel.borderMesh.material as THREE.MeshBasicMaterial).opacity = 0.75 + pulse * 0.25;
      tel.indicatorMesh.scale.set(progress, progress, 1);

      // Inward vortex suction & DoT for Desert Sand Whirlpool (5s duration)
      if (tel.skill.id === 'sand_whirlpool') {
        const radius = tel.radius || 12.5;
        const distToCenter = Math.hypot(playerPos.x - tel.center.x, playerPos.z - tel.center.z);

        // Detik 1-2: Visual pusaran pasir berputar di sekeliling kawah
        if (Math.random() < 0.7) {
          const swirlAng = Math.random() * Math.PI * 2;
          const swirlR = Math.random() * radius;
          const sPos = new THREE.Vector3(
            tel.center.x + Math.cos(swirlAng) * swirlR,
            this.getTerrainHeight(tel.center.x, tel.center.z) + 0.2,
            tel.center.z + Math.sin(swirlAng) * swirlR
          );
          this.callbacks.onSpawnSparks?.(sPos, 0xd4af37, 2, 2.5);
        }

        // Detik 3-5: Gaya hisap sentripetal kuat menyedot pemain ke arah pusat
        if (tel.timer >= 2.0 && distToCenter < radius && distToCenter > 0.8) {
          const pullDirX = (tel.center.x - playerPos.x) / distToCenter;
          const pullDirZ = (tel.center.z - playerPos.z) / distToCenter;
          const pullSpeed = 7.5 * delta; // Sedotan sentripetal ke arah pusat kawah
          playerPos.x += pullDirX * pullSpeed;
          playerPos.z += pullDirZ * pullSpeed;
          // Perputaran spiral pusaran pasir hisap
          playerPos.x += -pullDirZ * (3.0 * delta);
          playerPos.z += pullDirX * (3.0 * delta);

          // Efek debu pasir abrasif berkala saat tersedot
          if (Math.random() < 0.08) {
            this.callbacks.onUpdateStats((stats) => {
              const sandDmg = 4;
              const nextHp = Math.max(0, stats.hp - sandDmg);
              this.callbacks.onAddFloatingText(`-${sandDmg} HP (Pusaran Pasir)`, '#f59e0b', 'damage');
              if (nextHp <= 0) {
                this.callbacks.onPlayerDeath?.();
              }
              return { ...stats, hp: nextHp };
            });
          }
        }
      }

      // Semburan lidah api kipas beruntun (Flame Breath) selama 2.5 detik
      if (tel.skill.id === 'flame_breath' || tel.skill.id === 'fire_breath') {
        const fwd = tel.direction || new THREE.Vector3(0, 0, 1);
        if (Math.random() < 0.7) {
          const flameDist = 2.0 + Math.random() * (tel.radius || 28.0);
          const spreadAngle = (Math.random() - 0.5) * (tel.coneAngle || (Math.PI / 4));
          const flameDir = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
          const pPos = tel.center.clone().addScaledVector(flameDir, flameDist);
          pPos.y = this.getTerrainHeight(pPos.x, pPos.z) + 0.6 + Math.random() * 1.5;
          this.callbacks.onSpawnSparks?.(pPos, 0xff4500, 4, 4.0);
          if (Math.random() < 0.35) {
            this.callbacks.onSpawnSparks?.(pPos, 0xffd600, 2, 2.5);
          }
        }
        // Burn tick berkala jika pemain terkena semburan lidah api di dalam cone
        const toP = new THREE.Vector3(playerPos.x - tel.center.x, 0, playerPos.z - tel.center.z);
        const pDist = toP.length();
        if (pDist <= (tel.radius || 28.0) && pDist > 1.2) {
          toP.normalize();
          const ang = Math.acos(Math.max(-1, Math.min(1, toP.dot(fwd))));
          if (ang <= (tel.coneAngle || Math.PI / 4) / 2) {
            if (Math.random() < 0.12 && !isPlayerDashing) {
              this.applyBurn(4.0);
              this.callbacks.onUpdateStats((stats) => {
                const dotDmg = 5;
                const nextHp = Math.max(0, stats.hp - dotDmg);
                this.callbacks.onAddFloatingText(`-${dotDmg} HP (Lidah Api)`, '#ff3d00', 'damage');
                if (nextHp <= 0) this.callbacks.onPlayerDeath?.();
                return { ...stats, hp: nextHp };
              });
            }
          }
        }
      }

      // Detonate attack when telegraph timer finishes
      if (tel.timer >= tel.duration) {
        this.executeTelegraphAttack(tel, playerPos, playerVel, isPlayerDashing);
        this.removeTelegraph(tel);
        this.telegraphs.splice(i, 1);
        this.activeTelegraphMap.delete(tel.bossId);
      }
    }

    // 3. Decrement Boss Skill Cooldowns
    this.skillCooldowns.forEach((cdMap) => {
      cdMap.forEach((time, skillId) => {
        if (time > 0) {
          cdMap.set(skillId, Math.max(0, time - delta));
        }
      });
    });
  }

  /**
   * Tries to trigger a boss skill if conditions match
   */
  public updateBossBehavior(
    enemy: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
      spawnPos?: THREE.Vector3;
      leashRadius?: number;
      isReturning?: boolean;
    },
    playerPos: THREE.Vector3,
    delta: number,
    isPlayerJumping: boolean = false,
    playerVel?: THREE.Vector3
  ): boolean {
    const bossId = enemy.data.id;
    const isIgnis = bossId === 'boss_dragonfang';
    const isTitan = bossId === 'boss_titan';
    const isWorm = bossId === 'boss_jarrus';
    if (!isIgnis && !isTitan && !isWorm) return false;

    if (enemy.data.hp <= 0) {
      if (this.isDragonAirborne && isIgnis) {
        this.isDragonAirborne = false;
        this.callbacks.onAirborneChange?.(false);
        this.callbacks.onCameraFocusBoss?.(enemy.mesh.position, 0);
        this.removeMeteorDiveIndicator();
      }
      if (soundManager.getCurrentBossMusic()) {
        const config = isIgnis ? IGNIS_DRAGON_BOSS_CONFIG : (isWorm ? JARRUS_WORM_BOSS_CONFIG : ANCIENT_TITAN_BOSS_CONFIG);
        soundManager.playBossVictory(config.nameId || config.name);
      }
      return false;
    }

    // Dragon Phase 2 & Extreme Caldera Weather Updates
    if (isIgnis) {
      if (enemy.data.hp <= enemy.data.maxHp * 0.5 && this.dragonPhase === 1) {
        this.dragonPhase = 2;
        soundManager.playDragonRoar();
        this.callbacks.onCameraShake(1.2);
        this.callbacks.onAddFloatingText('🔥 IGNIS MERAUNG! FASE 2: ENRAGE MODE AKTIF!', '#ff1744', 'crit');

        // Increase eye and scale emissive glow to blazing crimson
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.emissive) {
              mat.emissive.setHex(0xff1100);
              mat.emissiveIntensity = 2.4;
            }
          }
        });
      }

      const distToCenter = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
      if (this.dragonPhase === 2 && enemy.data.hp > 0 && distToCenter <= 90) {
        this.weatherRecoveryDelayTimer = 0;
        this.extremeWeatherFactor = THREE.MathUtils.lerp(this.extremeWeatherFactor, 1.0, delta * 1.5);
      } else {
        this.weatherRecoveryDelayTimer += delta;
        if (this.weatherRecoveryDelayTimer >= 5.0) {
          this.extremeWeatherFactor = Math.max(0, this.extremeWeatherFactor - delta / 5.0);
        }
      }
    }

    const config = isIgnis ? IGNIS_DRAGON_BOSS_CONFIG : (isWorm ? JARRUS_WORM_BOSS_CONFIG : ANCIENT_TITAN_BOSS_CONFIG);
    if (!this.skillCooldowns.has(bossId)) {
      this.registerBoss(bossId, config);
    }

    const currentState = this.bossStates.get(bossId) || 'chase';
    const stateTimer = (this.stateTimers.get(bossId) || 0) + delta;
    this.stateTimers.set(bossId, stateTimer);

    // If currently telegraphing or executing, boss locks in place and winds up
    if (currentState === 'telegraph' || currentState === 'executing') {
      if (isIgnis) {
        // Flap wings and arch neck back while telegraphing
        if (enemy.parts?.neck) {
          enemy.parts.neck.rotation.x = -0.3 + Math.sin(stateTimer * 8) * 0.15;
        }
        if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
          enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 10) * 0.3;
          enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 10) * 0.3;
        }
      } else if (isTitan) {
        const activeTel = this.activeTelegraphMap.get(bossId);
        const skillId = activeTel?.skill?.id;
        if (skillId === 'titan_leap_slam') {
          if (stateTimer < 0.8) {
            // Ancang-ancang menekuk lutut selama 0.8 detik (knee-bend wind-up)
            if (enemy.parts?.leftLeg && enemy.parts?.rightLeg) {
              enemy.parts.leftLeg.rotation.x = 0.55;
              enemy.parts.rightLeg.rotation.x = 0.55;
            }
            if (enemy.parts?.torso) {
              enemy.parts.torso.position.y = 1.35 - 0.5;
            }
          } else {
            // Melompat ke udara mengarah ke target sebelum mendarat di 1.2s
            const leapProgress = Math.min(1.0, (stateTimer - 0.8) / 0.4);
            const arcY = Math.sin(leapProgress * Math.PI) * 8.0;
            const baseY = this.getTerrainHeight(enemy.mesh.position.x, enemy.mesh.position.z);
            enemy.mesh.position.y = baseY + arcY;
            if (activeTel) {
              enemy.mesh.position.x = THREE.MathUtils.lerp(enemy.mesh.position.x, activeTel.center.x, leapProgress * 0.25);
              enemy.mesh.position.z = THREE.MathUtils.lerp(enemy.mesh.position.z, activeTel.center.z, leapProgress * 0.25);
            }
            if (enemy.parts?.leftArm && enemy.parts?.rightArm) {
              enemy.parts.leftArm.rotation.x = -Math.PI * 0.85;
              enemy.parts.rightArm.rotation.x = -Math.PI * 0.85;
            }
          }
        } else if (skillId === 'earthquake_slam') {
          // Raise both colossal stone fists high overhead
          if (enemy.parts?.leftArm && enemy.parts?.rightArm) {
            enemy.parts.leftArm.rotation.x = -Math.PI * 0.85 + Math.sin(stateTimer * 8) * 0.1;
            enemy.parts.rightArm.rotation.x = -Math.PI * 0.85 - Math.sin(stateTimer * 8) * 0.1;
          }
        } else if (skillId === 'heavy_punch') {
          // Pull right fist back ready for shock punch
          if (enemy.parts?.rightArm) {
            enemy.parts.rightArm.rotation.x = -Math.PI * 0.75 + Math.sin(stateTimer * 10) * 0.15;
          }
          if (enemy.parts?.leftArm) {
            enemy.parts.leftArm.rotation.x = 0.25;
          }
        } else if (skillId === 'rock_throw') {
          // Raise both arms overhead lifting giant stone boulder
          if (enemy.parts?.leftArm && enemy.parts?.rightArm) {
            enemy.parts.leftArm.rotation.x = -Math.PI * 0.9;
            enemy.parts.rightArm.rotation.x = -Math.PI * 0.9;
          }
        } else {
          if (enemy.parts?.leftArm && enemy.parts?.rightArm) {
            enemy.parts.leftArm.rotation.x = -Math.PI * 0.7 + Math.sin(stateTimer * 8) * 0.1;
            enemy.parts.rightArm.rotation.x = -Math.PI * 0.7 - Math.sin(stateTimer * 8) * 0.1;
          }
        }
      }
      return true; // Prevents normal chase/walk movement during skill wind-up
    }

    if (currentState === 'meteor_dive') {
      return this.updateDragonMeteorDive(enemy, playerPos, delta, this.skillCooldowns.get(bossId)!, isPlayerJumping, playerVel);
    }

    if (currentState === 'flying_pursuit') {
      return this.updateDragonFlyingPursuit(enemy, playerPos, delta, this.skillCooldowns.get(bossId)!);
    }

    if (currentState === 'recovery') {
      if (stateTimer >= 0.6) {
        this.bossStates.set(bossId, 'chase');
        this.stateTimers.set(bossId, 0);
      }
      return true;
    }

    // Evaluate Boss Skills
    if (enemy.isReturning) {
      return false;
    }
    const ePos = enemy.mesh.position;
    const distToPlayer = Math.hypot(playerPos.x - ePos.x, playerPos.z - ePos.z);
    if (distToPlayer > enemy.data.detectRange) {
      return false; // Out of detection range, do not cast boss skills
    }
    const homeX = enemy.spawnPos ? enemy.spawnPos.x : (isWorm ? 495 : (isTitan ? -196 : 80));
    const homeZ = enemy.spawnPos ? enemy.spawnPos.z : (isWorm ? -362 : (isTitan ? -254 : 360));
    const distFromHome = Math.hypot(ePos.x - homeX, ePos.z - homeZ);
    const maxLeash = enemy.leashRadius || 48;
    if (distFromHome > maxLeash) {
      return false; // Beyond leash territory
    }
    const cdMap = this.skillCooldowns.get(bossId)!;

    if (isIgnis) {
      const distToCenter = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
      const meteorDiveCd = cdMap.get('meteor_dive') ?? 0;
      const flyingCooldown = cdMap.get('flying_dash') ?? cdMap.get('flying_pursuit') ?? 0;

      // 1. SUPREME BOSS SKILL: Meteor Dive / Sky Crash (Jarak 8 - 30 unit, Cooldown 18s)
      if (distToCenter <= NAGA_CALDERA_RADIUS && distToPlayer >= 8.0 && distToPlayer <= 30.0 && meteorDiveCd <= 0) {
        this.bossStates.set(bossId, 'meteor_dive');
        this.stateTimers.set(bossId, 0);
        this.isDragonAirborne = true;
        this.callbacks.onAirborneChange?.(true);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('☄️ IGNIS TERBANG TINGGI: METEOR DIVE!', '#ff1744', 'crit');
        return this.updateDragonMeteorDive(enemy, playerPos, delta, cdMap, isPlayerJumping, playerVel);
      }

      // 2. GAP CLOSER: Flying Dive / Dash Pursuit (Jarak > 12 unit, jika pemain di kaldera & Cooldown <= 0)
      if (distToCenter <= NAGA_CALDERA_RADIUS && distToPlayer > 12.0 && flyingCooldown <= 0) {
        this.bossStates.set(bossId, 'flying_pursuit');
        this.stateTimers.set(bossId, 0);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('🦅 IGNIS TERBANG MENUKIK MENGEJAR!', '#f97316', 'crit');
        return this.updateDragonFlyingPursuit(enemy, playerPos, delta, cdMap);
      }

      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), enemy.mesh.rotation.y);
      const toPlayer = new THREE.Vector3(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
      const dot = fwd.dot(toPlayer);

      const selected = MonsterCombatAI.selectDragonSkill(distToPlayer, dot, cdMap, distToCenter);
      if (selected === 'meteor_dive') {
        this.bossStates.set(bossId, 'meteor_dive');
        this.stateTimers.set(bossId, 0);
        this.isDragonAirborne = true;
        this.callbacks.onAirborneChange?.(true);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('☄️ IGNIS TERBANG TINGGI: METEOR DIVE!', '#ff1744', 'crit');
        return this.updateDragonMeteorDive(enemy, playerPos, delta, cdMap, isPlayerJumping, playerVel);
      } else if (selected === 'flying_dash') {
        this.bossStates.set(bossId, 'flying_pursuit');
        this.stateTimers.set(bossId, 0);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('🦅 IGNIS TERBANG MENUKIK MENGEJAR!', '#f97316', 'crit');
        return this.updateDragonFlyingPursuit(enemy, playerPos, delta, cdMap);
      } else if (selected === 'fireball_barrage') {
        const skill = config.skills.find((s) => s.id === 'fireball_barrage')!;
        this.startTelegraphCircle(bossId, enemy, playerPos.clone(), 3.0, skill);
        soundManager.playDragonFireBreath();
        this.callbacks.onAddFloatingText('🔥 BOLA API MAGMA BERUNTUN!', '#ef4444', 'info');
        cdMap.set('fireball_barrage', skill.cooldown);
        return true;
      } else if (selected === 'flame_breath') {
        const skill = config.skills.find((s) => s.id === 'flame_breath') || config.skills.find((s) => s.id === 'fire_breath')!;
        this.startTelegraphCone(bossId, enemy, ePos, fwd, 28, Math.PI / 4, skill);
        soundManager.playDragonFireBreath();
        this.callbacks.onAddFloatingText('🔥 SEMBURAN LIDAH API KIPAS!', '#dc2626', 'damage');
        cdMap.set('flame_breath', skill.cooldown);
        return true;
      } else if (selected === 'dragon_claw') {
        const skill = config.skills.find((s) => s.id === 'dragon_claw') || config.skills.find((s) => s.id === 'tail_swipe')!;
        this.startTelegraphCircle(bossId, enemy, ePos.clone().addScaledVector(toPlayer, 2.5), 4.5, skill);
        soundManager.playHit(true);
        cdMap.set('dragon_claw', skill.cooldown);
        return true;
      }
    } else if (isTitan) {
      const selected = MonsterCombatAI.selectTitanSkill(distToPlayer, cdMap);
      if (selected === 'titan_leap_slam') {
        const skill = config.skills.find((s) => s.id === 'titan_leap_slam')!;
        this.startTelegraphCircle(bossId, enemy, playerPos.clone(), 7.5, skill);
        soundManager.playTitanGroundSlam();
        this.callbacks.onAddFloatingText('☄️ TITAN BERSERUAP LOMPAT (LEAP SLAM)!', '#ef4444', 'crit');
        cdMap.set('titan_leap_slam', skill.cooldown);
        return true;
      } else if (selected === 'seismic_slam') {
        const skill = config.skills.find((s) => s.id === 'seismic_slam') || config.skills.find((s) => s.id === 'earthquake_slam')!;
        this.startTelegraphCircle(bossId, enemy, ePos, 15.0, skill);
        soundManager.playTitanGroundSlam();
        this.callbacks.onAddFloatingText('💥 TITAN MENYIAPKAN BOGEM GEMPA BUMI KOLOSAL (AOE)!', '#ef4444', 'crit');
        cdMap.set('seismic_slam', skill.cooldown);
        return true;
      } else if (selected === 'boulder_hurl') {
        const skill = config.skills.find((s) => s.id === 'boulder_hurl') || config.skills.find((s) => s.id === 'rock_throw')!;
        this.startTelegraphCircle(bossId, enemy, playerPos.clone(), 2.0, skill);
        soundManager.playTitanGroundSlam();
        this.callbacks.onAddFloatingText('🪨 TITAN MELEMPAR BONGKAHAN BATU RAKSASA!', '#f59e0b', 'info');
        cdMap.set('boulder_hurl', skill.cooldown);
        return true;
      } else if (selected === 'earth_fissure') {
        const skill = config.skills.find((s) => s.id === 'earth_fissure')!;
        const toPlayer = new THREE.Vector3(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
        this.startTelegraphLine(bossId, enemy, ePos, toPlayer, Math.min(36, distToPlayer + 6), 4.0, skill);
        soundManager.playTitanGroundSlam();
        this.callbacks.onAddFloatingText('⚡ GUNCANGAN RETAKAN BUMI MERAMBAT!', '#38bdf8', 'info');
        cdMap.set('earth_fissure', skill.cooldown);
        return true;
      } else if (selected === 'heavy_punch') {
        const skill = config.skills.find((s) => s.id === 'heavy_punch')!;
        const toPlayer = new THREE.Vector3(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
        const punchPos = ePos.clone().addScaledVector(toPlayer, 2.5);
        this.startTelegraphCircle(bossId, enemy, punchPos, 3.8, skill);
        cdMap.set('heavy_punch', skill.cooldown);
        return true;
      }
    } else if (isWorm) {
      const selected = MonsterCombatAI.selectSandwormSkill(distToPlayer, enemy.data.hp, enemy.data.maxHp, cdMap);
      if (selected === 'sand_whirlpool') {
        const skill = config.skills.find((s) => s.id === 'sand_whirlpool');
        if (skill) {
          const centerPos = new THREE.Vector3(495, this.getTerrainHeight(495, -362), -362);
          this.startTelegraphCircle(bossId, enemy, centerPos, 12.5, skill);
          soundManager.playTitanGroundSlam();
          this.callbacks.onAddFloatingText('🌪️ SANG CACING MEMICU PUSARAN PASIR RAKSASA!', '#f59e0b', 'crit');
          if (enemy.mesh) {
            enemy.mesh.position.y -= 16.0;
          }
          cdMap.set('sand_whirlpool', skill.cooldown);
          return true;
        }
      } else if (selected === 'burrow_burst') {
        const skill = config.skills.find((s) => s.id === 'burrow_burst')!;
        const targetPos = playerPos.clone();
        // Leash territory safeguard: Cacing tidak boleh burrow keluar dari arena kawah pasir
        const homePos = enemy.spawnPos || new THREE.Vector3(495, 0, -362);
        const distFromHome = Math.hypot(targetPos.x - homePos.x, targetPos.z - homePos.z);
        const maxRadius = enemy.leashRadius || 48;
        if (distFromHome > maxRadius) {
          const ratio = (maxRadius - 2.0) / distFromHome;
          targetPos.x = homePos.x + (targetPos.x - homePos.x) * ratio;
          targetPos.z = homePos.z + (targetPos.z - homePos.z) * ratio;
        }
        this.startTelegraphCircle(bossId, enemy, targetPos, 4.5, skill);
        soundManager.playWormBurrow();
        this.callbacks.onAddFloatingText('⚠️ Cacing Purba Menyelam ke Bawah Pasir!', '#ef4444', 'info');
        if (enemy.mesh) {
          enemy.mesh.position.y -= 14.0;
        }
        cdMap.set('burrow_burst', skill.cooldown);
        return true;
      } else if (selected === 'sand_spike_barrage') {
        const skill = config.skills.find((s) => s.id === 'sand_spike_barrage');
        if (skill) {
          for (let sp = 0; sp < 6; sp++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 1.5 + Math.random() * 5.0;
            const spikeCenter = playerPos.clone().add(new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist));
            this.startTelegraphCircle(bossId, enemy, spikeCenter, 2.0, skill);
          }
          soundManager.playWormBurrow();
          this.callbacks.onAddFloatingText('⚠️ DURI PASIR MENUSUK DARI BAWAH TANAH!', '#f97316', 'info');
          cdMap.set('sand_spike_barrage', skill.cooldown);
          return true;
        }
      } else if (selected === 'tail_slam') {
        const skill = config.skills.find((s) => s.id === 'tail_slam');
        if (skill) {
          const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), enemy.mesh.rotation.y);
          this.startTelegraphCone(bossId, enemy, ePos, fwd, 7.5, Math.PI, skill);
          soundManager.playHit(true);
          cdMap.set('tail_slam', skill.cooldown);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * STATE_FLYING_PURSUIT (Boss Naga Purba Ignis)
   * Eksekusi terbang mulus dalam 3 fase: Take-off, Glide/Dive Rush, dan Landing Slam
   */
  public updateDragonFlyingPursuit(
    enemy: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
      spawnPos?: THREE.Vector3;
      leashRadius?: number;
      isReturning?: boolean;
    },
    playerPos: THREE.Vector3,
    delta: number,
    cdMap: Map<string, number>
  ): boolean {
    const bossId = enemy.data.id;
    const stateTimer = (this.stateTimers.get(bossId) || 0) + delta;
    this.stateTimers.set(bossId, stateTimer);

    const naga = enemy.mesh;
    const nagaPos = naga.position;
    const distPlayerToCenter = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
    const distNagaToCenter = Math.hypot(nagaPos.x - SPAWN_NAGA[0], nagaPos.z - SPAWN_NAGA[1]);

    // ==========================================
    // 3. PENGECUALIAN & FALLBACK
    // ==========================================
    // Pastikan naga TIDAK TERBANG keluar dari radius kaldera 48 unit.
    // Jika pemain keluar batas, naga membatalkan terbang dan kembali ke pusat sarang.
    if (distPlayerToCenter > NAGA_CALDERA_RADIUS || distNagaToCenter > NAGA_CALDERA_RADIUS + 2.0) {
      this.bossStates.set(bossId, 'chase');
      this.stateTimers.set(bossId, 0);
      cdMap.set('flying_dash', 9.0);
      cdMap.set('flying_pursuit', 9.0);
      enemy.isReturning = true;

      // Pendaratan darurat ke tanah
      nagaPos.y = this.getTerrainHeight(nagaPos.x, nagaPos.z);
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.set(0, 0, 0);
        enemy.parts.rightWing.rotation.set(0, 0, 0);
      }
      return false;
    }

    const groundY = this.getTerrainHeight(nagaPos.x, nagaPos.z);
    const targetFlightY = groundY + 6.0;
    const distToPlayer = Math.hypot(playerPos.x - nagaPos.x, playerPos.z - nagaPos.z);

    // ==========================================
    // 1. FASE TAKE-OFF (Lepas Landas ~ 0.5s)
    // ==========================================
    if (stateTimer < 0.5) {
      // Mengangkat posisinya ke udara secara halus: targetY = getTerrainHeight + 6.0
      nagaPos.y = THREE.MathUtils.lerp(nagaPos.y, targetFlightY, delta * 8.0);

      // Animasi rotasi sayap mengepak cepat (flapping wings):
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 24.0) * 0.55;
        enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 24.0) * 0.55;
      }
      if (enemy.parts?.neck) {
        enemy.parts.neck.rotation.x = -0.3 + Math.sin(stateTimer * 10.0) * 0.15;
      }
      if (enemy.parts?.frontLeftLeg && enemy.parts?.frontRightLeg) {
        enemy.parts.frontLeftLeg.rotation.x = -0.4;
        enemy.parts.frontRightLeg.rotation.x = -0.4;
      }
      if (enemy.parts?.leftLeg && enemy.parts?.rightLeg) {
        enemy.parts.leftLeg.rotation.x = 0.4;
        enemy.parts.rightLeg.rotation.x = 0.4;
      }

      // Hadap ke arah pemain
      const toP = new THREE.Vector3(playerPos.x - nagaPos.x, 0, playerPos.z - nagaPos.z).normalize();
      if (toP.lengthSq() > 0.001) {
        naga.rotation.y = Math.atan2(toP.x, toP.z);
      }
      return true;
    }

    // ==========================================
    // 3. FASE LANDING SLAM (Mendarat di Dekat Pemain)
    // ==========================================
    // Ketika jarak horizontal ke pemain sudah dekat (distToPlayer <= 5 unit) atau batas durasi terbang tercapai
    if (distToPlayer <= 5.0 || stateTimer >= 3.5) {
      // Naga menukik tajam mendarat ke tanah:
      nagaPos.y = groundY;

      // Hasilkan efek benturan tanah (ground slam): partikel debu/magma meledak kecil dan guncangan layar
      this.callbacks.onCameraShake(0.65);
      soundManager.playMeteorImpact();
      this.callbacks.onSpawnShockwave?.(nagaPos.clone(), 0xff3d00, 7.5, 0.5);
      this.callbacks.onSpawnSparks?.(nagaPos.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xdc2626, 18, 5.5);
      this.callbacks.onAddFloatingText('💥 IGNIS MENDARAT MENUKIK (GROUND SLAM)!', '#ef4444', 'crit');

      // Serangan benturan landing slam jika pemain berada di area benturan:
      if (distToPlayer <= 5.5) {
        this.callbacks.onUpdateStats((stats) => {
          const actualDmg = Math.max(5, 45 - Math.round(stats.baseDefense * 0.4));
          return { ...stats, hp: Math.max(0, stats.hp - actualDmg) };
        });
        this.callbacks.onAddFloatingText('-45 HP (Ignis Slam!)', '#ef4444', 'damage');
      }

      // Berikan jeda Cooldown untuk skill terbang selama 9 detik sebelum bisa digunakan lagi
      cdMap.set('flying_dash', 9.0);
      cdMap.set('flying_pursuit', 9.0);

      // Reset rotasi sayap dan kaki
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.set(0, 0, 0);
        enemy.parts.rightWing.rotation.set(0, 0, 0);
      }
      if (enemy.parts?.frontLeftLeg && enemy.parts?.frontRightLeg) {
        enemy.parts.frontLeftLeg.rotation.set(0, 0, 0);
        enemy.parts.frontRightLeg.rotation.set(0, 0, 0);
      }
      if (enemy.parts?.leftLeg && enemy.parts?.rightLeg) {
        enemy.parts.leftLeg.rotation.set(0, 0, 0);
        enemy.parts.rightLeg.rotation.set(0, 0, 0);
      }

      // Segera transisikan naga ke serangan jarak dekat: Dragon Claw Strike atau Flame Breath
      const clawCd = cdMap.get('dragon_claw') ?? 0;
      const breathCd = cdMap.get('flame_breath') ?? cdMap.get('fire_breath') ?? 0;
      const config = IGNIS_DRAGON_BOSS_CONFIG;

      if (clawCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'dragon_claw')!;
        const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), naga.rotation.y);
        this.startTelegraphCircle(bossId, enemy, nagaPos.clone().addScaledVector(fwd, 2.5), 4.5, skill);
        soundManager.playHit(true);
        cdMap.set('dragon_claw', skill.cooldown);
        return true;
      } else if (breathCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'flame_breath') || config.skills.find((s) => s.id === 'fire_breath')!;
        const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), naga.rotation.y);
        this.startTelegraphCone(bossId, enemy, nagaPos.clone(), fwd, 14, Math.PI / 3, skill);
        soundManager.playDragonFireBreath();
        this.callbacks.onAddFloatingText('🔥 SEMBURAN LIDAH API KIPAS!', '#dc2626', 'damage');
        cdMap.set('flame_breath', skill.cooldown);
        return true;
      } else {
        this.bossStates.set(bossId, 'chase');
        this.stateTimers.set(bossId, 0);
        return true;
      }
    }

    // ==========================================
    // 2. FASE GLIDE / DIVE RUSH (Menukik Mengejar)
    // ==========================================
    // Gerakkan naga meluncur di udara menuju posisi pemain dengan kecepatan tinggi (16 - 20 m/s):
    const playerGroundY = this.getTerrainHeight(playerPos.x, playerPos.z);
    const targetY = THREE.MathUtils.lerp(targetFlightY, playerGroundY + 1.2, 0.45);
    const targetPos = new THREE.Vector3(playerPos.x, targetY, playerPos.z);

    // Lerp naga meluncur:
    naga.position.lerp(targetPos, delta * 4.5);

    // Kecepatan meluncur konstan ~18 m/s:
    const toTarget = new THREE.Vector3().subVectors(targetPos, nagaPos);
    if (toTarget.lengthSq() > 0.01) {
      toTarget.normalize();
      const flySpeed = 18.0 * delta;
      nagaPos.addScaledVector(toTarget, flySpeed);
    }

    // Buat orientasi tubuh naga menghadap lurus ke arah gerak pemain:
    naga.lookAt(playerPos.x, targetY, playerPos.z);

    // Sayap mengepak kuat meluncur:
    if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
      enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 16.0) * 0.45;
      enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 16.0) * 0.45;
    }
    if (enemy.parts?.tail) {
      enemy.parts.tail.rotation.y = Math.sin(stateTimer * 8.0) * 0.35;
    }

    return true;
  }

  /**
   * STATE_METEOR_DIVE (Boss Naga Purba Ignis)
   * Eksekusi skill Meteor Dive / Sky Crash dalam 3 Fase:
   * Fase 1: Ascend & Spiral Hover (1.2 detik) - naga naik vertikal ke +14m
   * Fase 2: Telegraph Warning (1.0 detik) - kunci target, red decal ring 6.5 unit, falling embers
   * Fase 3: Impact & Seismic Shockwave (0.35 detik) - menukik curam ke target, direct 85 dmg + knockup, seismic shockwave 16 unit (35 dmg + knockback, dodge lompat)
   */
  public updateDragonMeteorDive(
    enemy: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
      spawnPos?: THREE.Vector3;
      leashRadius?: number;
      isReturning?: boolean;
    },
    playerPos: THREE.Vector3,
    delta: number,
    cdMap: Map<string, number>,
    isPlayerJumping: boolean = false,
    playerVel?: THREE.Vector3
  ): boolean {
    const bossId = enemy.data.id;
    const stateTimer = (this.stateTimers.get(bossId) || 0) + delta;
    this.stateTimers.set(bossId, stateTimer);

    const naga = enemy.mesh;
    const nagaPos = naga.position;
    const distPlayerToCenter = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
    const distNagaToCenter = Math.hypot(nagaPos.x - SPAWN_NAGA[0], nagaPos.z - SPAWN_NAGA[1]);

    // Safety leash check: if player exits caldera or boss drifts too far
    if (distPlayerToCenter > NAGA_CALDERA_RADIUS + 4.0 || distNagaToCenter > NAGA_CALDERA_RADIUS + 10.0) {
      this.bossStates.set(bossId, 'chase');
      this.stateTimers.set(bossId, 0);
      this.isDragonAirborne = false;
      this.callbacks.onAirborneChange?.(false);
      this.removeMeteorDiveIndicator();
      this.meteorDiveTarget = null;
      cdMap.set('meteor_dive', 12.0);
      enemy.isReturning = true;

      nagaPos.y = this.getTerrainHeight(nagaPos.x, nagaPos.z);
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.set(0, 0, 0);
        enemy.parts.rightWing.rotation.set(0, 0, 0);
      }
      return false;
    }

    const groundY = this.getTerrainHeight(nagaPos.x, nagaPos.z);
    const targetAirborneY = groundY + 16.0;

    // ==========================================
    // FASE 1: ASCEND & ORBIT CALDERA PERIMETER (0 - 2.0 detik)
    // ==========================================
    if (stateTimer < 2.0) {
      if (!this.isDragonAirborne) {
        this.isDragonAirborne = true;
        this.callbacks.onAirborneChange?.(true);
      }

      // Hitung sudut awal rotasi orbit di sekeliling perimeter kaldera (kecepatan 3.14 rad/s)
      if (stateTimer <= delta * 1.5 || !this.dragonOrbitStartAngle) {
        this.dragonOrbitStartAngle = Math.atan2(nagaPos.z - SPAWN_NAGA[1], nagaPos.x - SPAWN_NAGA[0]);
      }
      const orbitAngle = this.dragonOrbitStartAngle + stateTimer * 3.14159;
      const orbitRadius = 24.0; // Perimeter kaldera

      // Naga melayang naik ke Y = 16 dan mengorbit melingkar
      nagaPos.x = SPAWN_NAGA[0] + Math.cos(orbitAngle) * orbitRadius;
      nagaPos.z = SPAWN_NAGA[1] + Math.sin(orbitAngle) * orbitRadius;
      nagaPos.y = THREE.MathUtils.lerp(nagaPos.y, targetAirborneY, delta * 6.5);

      // Naga menghadap searah lintasan tangensial orbit melingkar
      const tangentX = -Math.sin(orbitAngle);
      const tangentZ = Math.cos(orbitAngle);
      naga.rotation.y = Math.atan2(tangentX, tangentZ);

      // Kamera mendongak ke atas melacak posisi naga yang mengudara (camera tilt up tracking)
      this.callbacks.onCameraFocusBoss?.(nagaPos.clone(), 0.5);

      // Animasi kepakan sayap kuat saat mengudara
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 20.0) * 0.65;
        enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 20.0) * 0.65;
      }
      if (enemy.parts?.neck) {
        enemy.parts.neck.rotation.x = -0.4 + Math.sin(stateTimer * 12.0) * 0.15;
      }
      if (enemy.parts?.frontLeftLeg && enemy.parts?.frontRightLeg) {
        enemy.parts.frontLeftLeg.rotation.x = -0.45;
        enemy.parts.frontRightLeg.rotation.x = -0.45;
      }
      if (enemy.parts?.leftLeg && enemy.parts?.rightLeg) {
        enemy.parts.leftLeg.rotation.x = 0.45;
        enemy.parts.rightLeg.rotation.x = 0.45;
      }

      // Percikan bara api dari tubuh naga yang mengudara
      if (Math.random() < 0.45) {
        const sparkPos = nagaPos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 4.5,
          -1.0,
          (Math.random() - 0.5) * 4.5
        ));
        this.callbacks.onSpawnSparks?.(sparkPos, 0xff4500, 3, 3.0);
      }
      return true;
    }

    // ==========================================
    // FASE 2: DIVE BOMB TARGET LOCK (2.0 - 2.45 detik)
    // ==========================================
    if (stateTimer < 2.45) {
      // Kunci koordinat target jatuhnya naga pada posisi pemain saat awal Fase 2
      if (!this.meteorDiveTarget) {
        const diveGroundY = this.getTerrainHeight(playerPos.x, playerPos.z);
        this.meteorDiveTarget = new THREE.Vector3(playerPos.x, diveGroundY, playerPos.z);
        this.spawnMeteorDiveIndicator(this.meteorDiveTarget, 6.5);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('⚠️ TARGET TERKUNCI! HINDARI ZONA MERAH!', '#ff1744', 'crit');
      }

      // Menukik curam meluncur lurus ke diveTarget dengan kecepatan sangat tinggi
      nagaPos.lerp(this.meteorDiveTarget, Math.min(1.0, delta * 24.0));
      naga.lookAt(this.meteorDiveTarget.x, this.meteorDiveTarget.y, this.meteorDiveTarget.z);

      // Pose sayap melipat menukik
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = 0.9;
        enemy.parts.rightWing.rotation.z = -0.9;
      }
      if (enemy.parts?.neck) {
        enemy.parts.neck.rotation.x = 0.3;
      }

      // Ekor bara api menukik
      this.callbacks.onSpawnSparks?.(nagaPos.clone(), 0xff3d00, 5, 5.0);

      // Animasi denyutan indikator merah di tanah
      const phase2Timer = stateTimer - 2.0;
      this.updateMeteorDiveIndicator(phase2Timer);
      return true;
    }

    // ==========================================
    // FASE 3: GROUND IMPACT & RADIAL SHOCKWAVE (stateTimer >= 2.45)
    // ==========================================
    const diveTarget = this.meteorDiveTarget || new THREE.Vector3(playerPos.x, this.getTerrainHeight(playerPos.x, playerPos.z), playerPos.z);
    const impactPos = diveTarget.clone();
    impactPos.y = this.getTerrainHeight(impactPos.x, impactPos.z);
    nagaPos.copy(impactPos);

    // Kembalikan sudut pandang kamera normal (lepas kuncian fokus naga)
    this.callbacks.onCameraFocusBoss?.(nagaPos, 0);

    // Reset postur naga tegak di tanah
    naga.rotation.x = 0;
    naga.rotation.z = 0;
    const toPlayer = new THREE.Vector3(playerPos.x - nagaPos.x, 0, playerPos.z - nagaPos.z).normalize();
    if (toPlayer.lengthSq() > 0.001) {
      naga.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }
    if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
      enemy.parts.leftWing.rotation.set(0, 0, 0);
      enemy.parts.rightWing.rotation.set(0, 0, 0);
    }
    if (enemy.parts?.neck) enemy.parts.neck.rotation.x = 0;
    if (enemy.parts?.frontLeftLeg && enemy.parts?.frontRightLeg) {
      enemy.parts.frontLeftLeg.rotation.set(0, 0, 0);
      enemy.parts.frontRightLeg.rotation.set(0, 0, 0);
    }
    if (enemy.parts?.leftLeg && enemy.parts?.rightLeg) {
      enemy.parts.leftLeg.rotation.set(0, 0, 0);
      enemy.parts.rightLeg.rotation.set(0, 0, 0);
    }

    // 1. Direct Impact Damage (Radius 6.5 unit): 85 damage + High Knockup
    const distToImpact = Math.hypot(playerPos.x - impactPos.x, playerPos.z - impactPos.z);
    if (distToImpact <= 6.5) {
      this.callbacks.onUpdateStats((stats) => {
        const rawDmg = 85;
        const absorbed = this.callbacks.onDamageAbsorb ? this.callbacks.onDamageAbsorb(rawDmg) : rawDmg;
        const actualDmg = Math.max(12, absorbed - Math.round(stats.baseDefense * 0.4));
        const nextHp = Math.max(0, stats.hp - actualDmg);
        this.callbacks.onAddFloatingText(`-${actualDmg} HP (CRASH!)`, '#ef4444', 'crit');
        if (nextHp <= 0) this.callbacks.onPlayerDeath?.();
        return { ...stats, hp: nextHp };
      });
      this.applyKnockup(impactPos, playerPos, playerVel || new THREE.Vector3());
    }

    // 2. Gelombang Kejut Seismik (Seismic Shockwave Ring): radius 2.0 -> 16.0 at 12 unit/s, 35 damage + knockback (dodge via lompat)
    this.spawnSeismicShockwave(impactPos.clone(), 2.0, 16.0, 12.0, 35);

    // 3. Efek Visual & Audio Ledakan Benturan
    soundManager.playMeteorImpact();
    this.callbacks.onCameraShake(1.5); // Visceral camera shake
    this.callbacks.onSpawnShockwave?.(impactPos.clone(), 0xff2200, 16.0, 0.8);
    this.callbacks.onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xff3d00, 45, 10.0);
    this.callbacks.onAddFloatingText('💥 METEOR DIVE IMPACT!', '#ff1744', 'crit');

    // 4. Bersihkan Indikator Visual Decal & kembalikan status Airborne
    this.removeMeteorDiveIndicator();
    this.meteorDiveTarget = null;
    this.isDragonAirborne = false;
    this.callbacks.onAirborneChange?.(false);

    // 5. Cooldown 18.0s & transisi Recovery
    cdMap.set('meteor_dive', 18.0);
    this.bossStates.set(bossId, 'recovery');
    this.stateTimers.set(bossId, 0);

    return true;
  }

  private spawnMeteorDiveIndicator(center: THREE.Vector3, radius = 6.5) {
    this.removeMeteorDiveIndicator();
    const group = new THREE.Group();
    const groundY = this.getTerrainHeight(center.x, center.z) + 0.12;
    group.position.set(center.x, groundY, center.z);
    group.rotation.x = -Math.PI / 2;

    // Cincin luar tebal warna merah menyala
    const ringGeom = new THREE.RingGeometry(radius - 0.4, radius, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff1744,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    group.add(ringMesh);

    // Permukaan zona merah transparan
    const fillGeom = new THREE.CircleGeometry(radius - 0.4, 48);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xd50000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeom, fillMat);
    group.add(fillMesh);

    // Cincin inti bahaya tengah
    const coreGeom = new THREE.RingGeometry(0.2, 2.0, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff9100,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    group.add(coreMesh);

    this.scene.add(group);
    this.meteorDiveIndicatorGroup = group;
  }

  private updateMeteorDiveIndicator(phaseTimer: number) {
    if (!this.meteorDiveIndicatorGroup) return;
    const pulse = 0.5 + Math.sin(phaseTimer * 14.0) * 0.4;
    this.meteorDiveIndicatorGroup.children.forEach((child, idx) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat) {
        if (idx === 0) mat.opacity = 0.7 + pulse * 0.3;
        else if (idx === 1) mat.opacity = 0.25 + pulse * 0.25;
        else if (idx === 2) mat.opacity = 0.5 + pulse * 0.4;
      }
    });
  }

  private removeMeteorDiveIndicator() {
    if (this.meteorDiveIndicatorGroup) {
      this.scene.remove(this.meteorDiveIndicatorGroup);
      this.meteorDiveIndicatorGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      this.meteorDiveIndicatorGroup = null;
    }
  }

  public spawnSeismicShockwave(
    center: THREE.Vector3,
    startRadius = 2.0,
    maxRadius = 16.0,
    speed = 10.0,
    damage = 35
  ) {
    const ringGeom = new THREE.RingGeometry(startRadius - 0.45, startRadius + 0.45, 48);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeom, ringMat);
    mesh.position.set(center.x, center.y + 0.15, center.z);
    this.scene.add(mesh);

    this.activeSeismicShockwaves.push({
      center,
      mesh,
      mat: ringMat,
      currentRadius: startRadius,
      maxRadius,
      speed,
      damage,
      innerSafeRadius: 6.5,
      hasHitPlayer: false,
    });
  }

  public updateSeismicShockwaves(
    delta: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isPlayerJumping: boolean
  ) {
    for (let i = this.activeSeismicShockwaves.length - 1; i >= 0; i--) {
      const sw = this.activeSeismicShockwaves[i];
      sw.currentRadius += sw.speed * delta;

      // Expand ring mesh scale
      const scale = sw.currentRadius / 2.0;
      sw.mesh.scale.set(scale, 1, scale);

      // Fade out opacity as it expands
      const progress = Math.min(1.0, (sw.currentRadius - 2.0) / (sw.maxRadius - 2.0));
      sw.mat.opacity = Math.max(0, (1.0 - progress) * 0.85);

      // Collision check with player
      if (!sw.hasHitPlayer) {
        const distToCenter = Math.hypot(playerPos.x - sw.center.x, playerPos.z - sw.center.z);
        // Wavefront collision window ~1.5 units
        if (Math.abs(distToCenter - sw.currentRadius) <= 1.5) {
          sw.hasHitPlayer = true;
          if (isPlayerJumping) {
            // Player jumped over the seismic wave!
            this.callbacks.onAddFloatingText('✨ TERHINDAR DENGAN LOMPAT!', '#00e676', 'info');
          } else {
            // Player grounded -> takes 35 damage and knockback
            this.callbacks.onUpdateStats((stats) => {
              const rawDmg = sw.damage;
              const absorbed = this.callbacks.onDamageAbsorb ? this.callbacks.onDamageAbsorb(rawDmg) : rawDmg;
              const actualDmg = Math.max(8, absorbed - Math.round(stats.baseDefense * 0.35));
              const nextHp = Math.max(0, stats.hp - actualDmg);
              this.callbacks.onAddFloatingText(`-${actualDmg} HP (Gelombang Kejut)`, '#ff3d00', 'damage');
              if (nextHp <= 0) this.callbacks.onPlayerDeath?.();
              return { ...stats, hp: nextHp };
            });
            this.applyKnockback(sw.center, playerPos, playerVel, 14.0);
          }
        }
      }

      // Expire shockwave
      if (sw.currentRadius >= sw.maxRadius) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mat.dispose();
        this.activeSeismicShockwaves.splice(i, 1);
      }
    }
  }

  // ==========================================
  // Visual Telegraph 3D Mesh Builders
  // ==========================================

  private startTelegraphCircle(
    bossId: string,
    enemy: { mesh: THREE.Group; spawnPos?: THREE.Vector3; leashRadius?: number },
    center: THREE.Vector3,
    radius: number,
    skill: BossSkill
  ) {
    const group = new THREE.Group();
    const groundY = this.getTerrainHeight(center.x, center.z) + 0.08;
    group.position.set(center.x, groundY, center.z);
    group.rotation.x = -Math.PI / 2;

    // Red warning base ring
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xff1744,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const borderMesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.94, radius, 36), borderMat);
    group.add(borderMesh);

    // Inner expanding danger disc
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const indicatorMesh = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.94, 36), indicatorMat);
    group.add(indicatorMesh);

    this.scene.add(group);

    const telegraph: ActiveTelegraph = {
      id: `tel_${Math.random().toString(36).substring(2, 8)}`,
      type: 'circle',
      mesh: group,
      indicatorMesh,
      borderMesh,
      center: center.clone(),
      radius,
      timer: 0,
      duration: skill.telegraphDuration,
      skill,
      bossId,
      enemy,
    };

    this.telegraphs.push(telegraph);
    this.activeTelegraphMap.set(bossId, telegraph);
    this.bossStates.set(bossId, 'telegraph');
    this.stateTimers.set(bossId, 0);
  }

  private startTelegraphCone(
    bossId: string,
    enemy: { mesh: THREE.Group; spawnPos?: THREE.Vector3; leashRadius?: number },
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    coneAngle: number,
    skill: BossSkill
  ) {
    const group = new THREE.Group();
    const groundY = this.getTerrainHeight(origin.x, origin.z) + 0.08;
    group.position.set(origin.x, groundY, origin.z);
    group.rotation.x = -Math.PI / 2;
    group.rotation.z = Math.atan2(direction.x, direction.z) - Math.PI / 2;

    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const borderMesh = new THREE.Mesh(
      new THREE.RingGeometry(length * 0.95, length, 24, 1, -coneAngle / 2, coneAngle),
      borderMat
    );
    group.add(borderMesh);

    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const indicatorMesh = new THREE.Mesh(
      new THREE.CircleGeometry(length * 0.95, 24, -coneAngle / 2, coneAngle),
      indicatorMat
    );
    group.add(indicatorMesh);

    this.scene.add(group);

    const telegraph: ActiveTelegraph = {
      id: `tel_${Math.random().toString(36).substring(2, 8)}`,
      type: 'cone',
      mesh: group,
      indicatorMesh,
      borderMesh,
      center: origin.clone(),
      direction: direction.clone(),
      radius: length,
      coneAngle,
      timer: 0,
      duration: skill.telegraphDuration,
      skill,
      bossId,
      enemy,
    };

    this.telegraphs.push(telegraph);
    this.activeTelegraphMap.set(bossId, telegraph);
    this.bossStates.set(bossId, 'telegraph');
    this.stateTimers.set(bossId, 0);
  }

  private startTelegraphLine(
    bossId: string,
    enemy: { mesh: THREE.Group; spawnPos?: THREE.Vector3; leashRadius?: number },
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    width: number,
    skill: BossSkill
  ) {
    const group = new THREE.Group();
    const groundY = this.getTerrainHeight(origin.x, origin.z) + 0.08;
    group.position.set(origin.x + direction.x * (length / 2), groundY, origin.z + direction.z * (length / 2));
    group.rotation.x = -Math.PI / 2;
    group.rotation.z = Math.atan2(direction.x, direction.z);

    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xff9100,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const borderMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), borderMat);
    group.add(borderMesh);

    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const indicatorMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, length * 0.98), indicatorMat);
    group.add(indicatorMesh);

    this.scene.add(group);

    const telegraph: ActiveTelegraph = {
      id: `tel_${Math.random().toString(36).substring(2, 8)}`,
      type: 'line',
      mesh: group,
      indicatorMesh,
      borderMesh,
      center: origin.clone(),
      direction: direction.clone(),
      length,
      width,
      timer: 0,
      duration: skill.telegraphDuration,
      skill,
      bossId,
      enemy,
    };

    this.telegraphs.push(telegraph);
    this.activeTelegraphMap.set(bossId, telegraph);
    this.bossStates.set(bossId, 'telegraph');
    this.stateTimers.set(bossId, 0);
  }

  // ==========================================
  // Attack Execution & Player Hit Evaluation
  // ==========================================

  private executeTelegraphAttack(
    tel: ActiveTelegraph,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isPlayerDashing: boolean
  ) {
    let isInsideDangerZone = false;
    const pX = playerPos.x;
    const pZ = playerPos.z;

    if (tel.type === 'circle') {
      const dist = Math.hypot(pX - tel.center.x, pZ - tel.center.z);
      if (dist <= (tel.radius || 5.0)) {
        isInsideDangerZone = true;
      }
    } else if (tel.type === 'cone' && tel.direction) {
      const toPlayer = new THREE.Vector3(pX - tel.center.x, 0, pZ - tel.center.z);
      const dist = toPlayer.length();
      if (dist <= (tel.radius || 12)) {
        toPlayer.normalize();
        const angleBetween = Math.acos(Math.max(-1, Math.min(1, toPlayer.dot(tel.direction))));
        if (angleBetween <= (tel.coneAngle || Math.PI / 3) / 2) {
          isInsideDangerZone = true;
        }
      }
    } else if (tel.type === 'line' && tel.direction) {
      const toP = new THREE.Vector3(pX - tel.center.x, 0, pZ - tel.center.z);
      const projDist = toP.dot(tel.direction);
      if (projDist >= 0 && projDist <= (tel.length || 18)) {
        const perp = new THREE.Vector3().subVectors(toP, tel.direction.clone().multiplyScalar(projDist));
        if (perp.length() <= (tel.width || 4) / 2) {
          isInsideDangerZone = true;
        }
      }
    }

    // Determine 3D impact coordinate on ground
    const impactPos = tel.center.clone();
    if (tel.direction && tel.type !== 'circle') {
      impactPos.addScaledVector(tel.direction, (tel.radius || tel.length || 10) * 0.35);
    }
    impactPos.y = this.getTerrainHeight(impactPos.x, impactPos.z) + 0.12;

    // Trigger explosive 3D ground telegraph VFX (Lava explosion, fire sparks, and ground shockwave ring)
    const fxRadius = tel.radius || (tel.length ? tel.length * 0.45 : 7.0);
    this.callbacks.onSpawnSparks?.(impactPos, 0xff3d00, 24, 6.5);
    this.callbacks.onSpawnSparks?.(impactPos, 0xffd600, 16, 5.0);
    this.callbacks.onSpawnShockwave?.(impactPos, 0xff1744, fxRadius, 0.48);

    // Play appropriate SFX & Camera Shake
    if (tel.skill.id === 'seismic_slam' || tel.skill.id === 'earthquake_slam') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(1.2);
      this.callbacks.onSpawnShockwave?.(tel.center, 0xef4444, 15.0, 0.9);
      this.callbacks.onSpawnSparks?.(tel.center, 0xf59e0b, 32, 7.0);
    } else if (tel.skill.id === 'boulder_hurl' || tel.skill.id === 'rock_throw') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(0.8);
      // Spawn flying 3D stone boulder projectile towards player (impact radius 2.0 / diameter 4.0)
      this.callbacks.onSpawnBoulderProjectile?.(
        tel.center.clone().add(new THREE.Vector3(0, 3.5, 0)),
        playerPos.clone(),
        tel.skill.damage
      );
      this.bossStates.set(tel.bossId, 'recovery');
      this.stateTimers.set(tel.bossId, 0);
      return;
    } else if (tel.skill.id === 'earth_fissure') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(1.0);
      // Spawn straight line sequence of stone blocks rupturing from ground
      const fwd = tel.direction || new THREE.Vector3(0, 0, 1);
      const stepCount = 8;
      const stepDist = (tel.length || 24.0) / stepCount;
      for (let s = 1; s <= stepCount; s++) {
        setTimeout(() => {
          const pt = tel.center.clone().addScaledVector(fwd, s * stepDist);
          const py = this.getTerrainHeight(pt.x, pt.z);
          const pGeo = new THREE.BoxGeometry(1.6, 2.5 + Math.random() * 1.5, 1.6);
          const pMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.9, flatShading: true });
          const pMesh = new THREE.Mesh(pGeo, pMat);
          pMesh.position.set(pt.x, py + 1.0, pt.z);
          pMesh.rotation.y = Math.random() * Math.PI;
          this.scene.add(pMesh);
          this.callbacks.onSpawnSparks?.(pt, 0x0284c7, 6, 3.0);
          setTimeout(() => {
            this.scene.remove(pMesh);
            pGeo.dispose();
            pMat.dispose();
          }, 1800);
        }, s * 70);
      }
    } else if (tel.skill.id === 'heavy_punch') {
      soundManager.playHit(true);
      this.callbacks.onCameraShake(0.65);
      this.callbacks.onSpawnShockwave?.(tel.center, 0x0284c7, 4.5, 0.4);
    } else if (tel.skill.id === 'dragon_claw') {
      soundManager.playHit(true);
      this.callbacks.onCameraShake(0.6);
      this.callbacks.onSpawnSparks?.(tel.center, 0xdc2626, 12, 4.5);
    } else if (tel.skill.id === 'flying_dash') {
      soundManager.playMeteorImpact();
      this.callbacks.onCameraShake(0.95);
      this.callbacks.onSpawnShockwave?.(tel.center, 0xff3d00, 8.0, 0.6);
      if (tel.enemy?.mesh) {
        let posX = tel.center.x;
        let posZ = tel.center.z;
        if (tel.enemy.spawnPos && tel.enemy.leashRadius) {
          const dX = posX - tel.enemy.spawnPos.x;
          const dZ = posZ - tel.enemy.spawnPos.z;
          const distH = Math.hypot(dX, dZ);
          if (distH > tel.enemy.leashRadius) {
            const r = (tel.enemy.leashRadius - 2.0) / distH;
            posX = tel.enemy.spawnPos.x + dX * r;
            posZ = tel.enemy.spawnPos.z + dZ * r;
          }
        }
        const destY = this.getTerrainHeight(posX, posZ);
        tel.enemy.mesh.position.set(posX, destY, posZ);
      }
    } else if (tel.skill.id === 'fireball_barrage') {
      soundManager.playDragonFireBreath();
      this.callbacks.onCameraShake(0.7);
      // Spawn 2 magma fireballs towards player
      this.callbacks.onSpawnFireballProjectile?.(
        tel.center.clone().add(new THREE.Vector3(-1.5, 3.5, 0)),
        playerPos.clone(),
        tel.skill.damage
      );
      setTimeout(() => {
        this.callbacks.onSpawnFireballProjectile?.(
          tel.center.clone().add(new THREE.Vector3(1.5, 3.5, 0)),
          playerPos.clone(),
          tel.skill.damage
        );
      }, 150);
      this.bossStates.set(tel.bossId, 'recovery');
      this.stateTimers.set(tel.bossId, 0);
      return;
    } else if (tel.skill.id === 'flame_breath' || tel.skill.id === 'fire_breath') {
      soundManager.playDragonFireBreath();
      this.callbacks.onCameraShake(0.5);
    } else if (tel.skill.id === 'burrow_burst') {
      soundManager.playWormBurstOut();
      this.callbacks.onCameraShake(1.3);
      if (tel.enemy?.mesh) {
        let posX = tel.center.x;
        let posZ = tel.center.z;
        if (tel.enemy.spawnPos && tel.enemy.leashRadius) {
          const dX = posX - tel.enemy.spawnPos.x;
          const dZ = posZ - tel.enemy.spawnPos.z;
          const distH = Math.hypot(dX, dZ);
          if (distH > tel.enemy.leashRadius) {
            const r = (tel.enemy.leashRadius - 2.0) / distH;
            posX = tel.enemy.spawnPos.x + dX * r;
            posZ = tel.enemy.spawnPos.z + dZ * r;
          }
        }
        const gY = this.getTerrainHeight(posX, posZ);
        tel.enemy.mesh.position.set(posX, gY, posZ);
      }
      this.callbacks.onSpawnShockwave?.(tel.center, 0xd97706, 6.5, 0.8);
    } else if (tel.skill.id === 'sand_spike_barrage') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(0.55);
      const spikeGeo = new THREE.ConeGeometry(0.55, 3.5, 5);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0xc49a6c,
        roughness: 0.85,
        flatShading: true,
      });
      const spikeMesh = new THREE.Mesh(spikeGeo, spikeMat);
      const groundY = this.getTerrainHeight(tel.center.x, tel.center.z);
      spikeMesh.position.set(tel.center.x, groundY + 1.7, tel.center.z);
      spikeMesh.castShadow = true;
      this.scene.add(spikeMesh);
      setTimeout(() => {
        this.scene.remove(spikeMesh);
        spikeGeo.dispose();
        spikeMat.dispose();
      }, 2200);
      this.callbacks.onSpawnSparks?.(tel.center, 0xd97706, 8, 4.0);
    } else if (tel.skill.id === 'titan_leap_slam') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(1.4);
      this.callbacks.onSpawnShockwave?.(tel.center, 0xef4444, 7.5, 0.8);
      this.callbacks.onSpawnSparks?.(tel.center, 0xf59e0b, 32, 7.0);
      this.callbacks.onAddFloatingText('💥 TITAN LEAP SLAM IMPACT!', '#ff1744', 'crit');
      if (tel.enemy?.mesh) {
        const destY = this.getTerrainHeight(tel.center.x, tel.center.z);
        tel.enemy.mesh.position.set(tel.center.x, destY, tel.center.z);
        if (tel.enemy.parts?.leftLeg && tel.enemy.parts?.rightLeg) {
          tel.enemy.parts.leftLeg.rotation.x = 0;
          tel.enemy.parts.rightLeg.rotation.x = 0;
        }
        if (tel.enemy.parts?.torso) {
          tel.enemy.parts.torso.position.y = 1.35;
        }
      }
    } else if (tel.skill.id === 'sand_whirlpool') {
      soundManager.playWormBurstOut();
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(1.5);
      this.callbacks.onSpawnShockwave?.(tel.center, 0xd97706, 12.5, 1.2);
      this.callbacks.onSpawnSparks?.(tel.center, 0xd4af37, 50, 12.0);
      this.callbacks.onAddFloatingText('💥 LETUSAN PASIR PURBA DAHYSAT!', '#f59e0b', 'crit');

      // Cacing melompat keluar dari pasir ke udara
      if (tel.enemy?.mesh) {
        const destY = this.getTerrainHeight(tel.center.x, tel.center.z);
        tel.enemy.mesh.position.set(tel.center.x, destY + 6.0, tel.center.z);
        setTimeout(() => {
          if (tel.enemy?.mesh) {
            tel.enemy.mesh.position.y = destY;
          }
        }, 800);
      }
    } else if (tel.skill.id === 'tail_slam' || tel.skill.id === 'tail_swipe') {
      soundManager.playHit(true);
      this.callbacks.onCameraShake(0.7);
    } else {
      soundManager.playHit();
      this.callbacks.onCameraShake(0.55);
    }

    // Check if player evaded (e.g. Dashed/Blinked outside or was never inside)
    if (!isInsideDangerZone || isPlayerDashing) {
      if (isPlayerDashing) {
        this.callbacks.onAddFloatingText('DODGE / TERHINDAR!', '#00e5ff', 'info');
      }
      this.bossStates.set(tel.bossId, 'recovery');
      this.stateTimers.set(tel.bossId, 0);
      return;
    }

    // Player is hit! Apply damage and status effects
    const skill = tel.skill;
    this.callbacks.onUpdateStats((stats) => {
      let baseSkillDmg = skill.damage;
      // Perhitungan damage pusaran pasir hisap: 110 di titik pusat, melandai ke 25 di bibir kawah
      if (skill.id === 'sand_whirlpool') {
        const distFromCenter = Math.hypot(pX - tel.center.x, pZ - tel.center.z);
        const ratio = Math.max(0, Math.min(1, distFromCenter / (tel.radius || 12.5)));
        baseSkillDmg = Math.round(110 - ratio * 85);
      }
      let finalDmg = Math.max(5, baseSkillDmg - Math.round(stats.baseDefense * 0.5));
      if (this.callbacks.onDamageAbsorb) {
        finalDmg = this.callbacks.onDamageAbsorb(finalDmg);
      }
      const nextHp = Math.max(0, stats.hp - finalDmg);
      if (finalDmg > 0) {
        this.callbacks.onAddFloatingText(`-${finalDmg} HP (${skill.nameId})`, '#ff1744', 'damage');
      }
      if (nextHp <= 0) {
        this.callbacks.onPlayerDeath?.();
      }
      return { ...stats, hp: nextHp };
    });

    // Apply Specific Status Debuffs
    if (skill.effect === 'stun') {
      this.applyStun(skill.effectDuration || 1.5, playerVel);
    } else if (skill.effect === 'burn') {
      this.applyBurn(skill.effectDuration || 4.0);
    } else if (skill.effect === 'knockback') {
      const force = skill.id === 'heavy_punch' ? 10.0 : 16.0;
      this.applyKnockback(tel.center, playerPos, playerVel, force);
    } else if (skill.effect === 'knockup') {
      this.applyKnockup(tel.center, playerPos, playerVel);
    } else if (skill.effect === 'slow') {
      this.applySlow(skill.effectDuration || 3.0);
    }

    this.bossStates.set(tel.bossId, 'recovery');
    this.stateTimers.set(tel.bossId, 0);
  }

  public applyBurnDebuff(duration: number) {
    this.applyBurn(duration);
  }

  public applyStunDebuff(duration: number, playerVel?: THREE.Vector3) {
    this.applyStun(duration, playerVel || new THREE.Vector3());
  }

  public applySlowDebuff(duration: number) {
    this.applySlow(duration);
  }

  private applyKnockup(from: THREE.Vector3, playerPos: THREE.Vector3, playerVel: THREE.Vector3) {
    const dir = new THREE.Vector3(playerPos.x - from.x, 0, playerPos.z - from.z).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    playerVel.x += dir.x * 6.5;
    playerVel.z += dir.z * 6.5;
    playerVel.y = 11.5; // Terlempar tinggi ke udara
    this.callbacks.onAddFloatingText('🌪️ TERLEMPAR KE UDARA (KNOCKUP)!', '#ff5252', 'crit');
  }

  private applySlow(duration: number) {
    this.playerDebuffs.isSlowed = true;
    this.playerDebuffs.slowTimer = Math.max(this.playerDebuffs.slowTimer || 0, duration);
    this.callbacks.onAddFloatingText('⏳ TERKENA SLOW! (Kecepatan -50%)', '#f59e0b', 'info');
  }

  private applyStun(duration: number, playerVel: THREE.Vector3) {
    this.playerDebuffs.isStunned = true;
    this.playerDebuffs.stunTimer = duration;
    playerVel.set(0, 0, 0); // Lock movement
    this.callbacks.onAddFloatingText(`💫 TERKENA STUN! (${duration.toFixed(1)} detik)`, '#ffd600', 'crit');
  }

  private applyBurn(duration: number) {
    this.playerDebuffs.isBurned = true;
    this.playerDebuffs.burnTimer = duration;
    this.playerDebuffs.burnTickTimer = 0.6;
    this.callbacks.onAddFloatingText('🔥 TERBAKAR! (DoT)', '#ff3d00', 'damage');
  }

  private applyKnockback(from: THREE.Vector3, playerPos: THREE.Vector3, playerVel: THREE.Vector3, force = 16.0) {
    const dir = new THREE.Vector3(playerPos.x - from.x, 0, playerPos.z - from.z).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    playerVel.x += dir.x * force;
    playerVel.z += dir.z * force;
    this.callbacks.onAddFloatingText('💨 TERPENTAL (KNOCKBACK)!', '#ff9100', 'info');
  }

  private updatePlayerDebuffs(delta: number) {
    // 1. Stun Countdown
    if (this.playerDebuffs.isStunned) {
      this.playerDebuffs.stunTimer -= delta;
      if (this.playerDebuffs.stunTimer <= 0) {
        this.playerDebuffs.isStunned = false;
        this.playerDebuffs.stunTimer = 0;
        this.callbacks.onAddFloatingText('Pulih dari Stun!', '#76ff03', 'info');
      }
    }

    // 2. Slow Countdown
    if (this.playerDebuffs.isSlowed) {
      this.playerDebuffs.slowTimer = (this.playerDebuffs.slowTimer || 0) - delta;
      if (this.playerDebuffs.slowTimer <= 0) {
        this.playerDebuffs.isSlowed = false;
        this.playerDebuffs.slowTimer = 0;
        this.callbacks.onAddFloatingText('Efek Slow Berakhir!', '#76ff03', 'info');
      }
    }

    // 3. Burn DoT Tick
    if (this.playerDebuffs.isBurned) {
      this.playerDebuffs.burnTimer -= delta;
      this.playerDebuffs.burnTickTimer -= delta;

      if (this.playerDebuffs.burnTickTimer <= 0) {
        this.playerDebuffs.burnTickTimer = 0.7;
        let burnDmg = 8;
        if (this.callbacks.onDamageAbsorb) {
          burnDmg = this.callbacks.onDamageAbsorb(burnDmg);
        }
        this.callbacks.onUpdateStats((stats) => {
          const nextHp = Math.max(0, stats.hp - burnDmg);
          if (burnDmg > 0) {
            this.callbacks.onAddFloatingText(`-${burnDmg} HP (Bakar)`, '#ff3d00', 'damage');
          }
          if (nextHp <= 0) {
            this.callbacks.onPlayerDeath?.();
          }
          return { ...stats, hp: nextHp };
        });
      }

      if (this.playerDebuffs.burnTimer <= 0) {
        this.playerDebuffs.isBurned = false;
        this.playerDebuffs.burnTimer = 0;
      }
    }
  }

  private removeTelegraph(tel: ActiveTelegraph) {
    this.scene.remove(tel.mesh);
    tel.mesh.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }

  /**
   * Cleanses 1 active negative status effect (Burn or Stun)
   * Returns the name of the cleansed effect, or null if none active
   */
  public cleanseDebuff(): string | null {
    if (this.playerDebuffs.isBurned) {
      this.playerDebuffs.isBurned = false;
      this.playerDebuffs.burnTimer = 0;
      this.playerDebuffs.burnTickTimer = 0;
      return 'Bakar (Burn)';
    }
    if (this.playerDebuffs.isStunned) {
      this.playerDebuffs.isStunned = false;
      this.playerDebuffs.stunTimer = 0;
      return 'Pusing (Stun)';
    }
    return null;
  }

  /**
   * Resets all telegraphs (e.g. when boss dies or player leaves region)
   */
  public clearDebuffs() {
    this.playerDebuffs.isStunned = false;
    this.playerDebuffs.stunTimer = 0;
    this.playerDebuffs.isBurned = false;
    this.playerDebuffs.burnTimer = 0;
    this.playerDebuffs.burnTickTimer = 0;
    this.playerDebuffs.isSlowed = false;
    this.playerDebuffs.slowTimer = 0;
  }

  public cleanup() {
    this.removeMeteorDiveIndicator();
    this.meteorDiveTarget = null;
    this.activeSeismicShockwaves.forEach((sw) => {
      this.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      sw.mat.dispose();
    });
    this.activeSeismicShockwaves = [];
    if (this.isDragonAirborne) {
      this.isDragonAirborne = false;
      this.callbacks.onAirborneChange?.(false);
    }
    this.telegraphs.forEach((t) => this.removeTelegraph(t));
    this.telegraphs = [];
    this.activeTelegraphMap.clear();
    this.bossStates.clear();
    this.stateTimers.clear();
    this.skillCooldowns.clear();
    this.playerDebuffs.isStunned = false;
    this.playerDebuffs.isBurned = false;
    this.playerDebuffs.isSlowed = false;
    this.playerDebuffs.slowTimer = 0;
    if (soundManager.getCurrentBossMusic()) {
      soundManager.evadeBossMusic();
    }
  }
}

