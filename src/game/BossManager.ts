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
  enemy?: { mesh: THREE.Group; spawnPos?: THREE.Vector3; leashRadius?: number };
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
  private dragonOrbitRadius: number = 26.0;
  private dragonTakeoffStartPos: THREE.Vector3 = new THREE.Vector3();
  private dragonDiveStagePos: THREE.Vector3 = new THREE.Vector3();
  private orbitFireball1Fired: boolean = false;
  private orbitFireball2Fired: boolean = false;
  private elapsedTime: number = 0;

  // Dragon Phase 2 Enrage & Caldera Storm Weather
  public dragonPhase: 1 | 2 = 1;
  public extremeWeatherFactor: number = 0;
  private ignisLastKnownAlive: boolean = true;
  private ignisMaterialsUpdatedPhase: 1 | 2 = 1;

  // Developer Testing Flags (synced from devTestingManager, default false)
  private devGodMode: boolean = false;
  private devCcImmune: boolean = false;

  // Zero-allocation Scratch Math Objects
  private readonly _scratchV1 = new THREE.Vector3();
  private readonly _scratchV2 = new THREE.Vector3();
  private readonly _scratchV3 = new THREE.Vector3();
  private readonly _upAxis = new THREE.Vector3(0, 1, 0);
  private readonly _lavaColA = new THREE.Color(0xff3d00);
  private readonly _lavaColB = new THREE.Color(0xff9100);
  private readonly _lavaColBlend = new THREE.Color();

  // Pre-allocated Seismic Shockwave Pool (Zero Runtime Allocation / Shader Recompile)
  private seismicShockwavePool: Array<{
    active: boolean;
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
  private seismicPoolCursor = 0;

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
    this.initSeismicShockwavePool();
  }

  private initSeismicShockwavePool() {
    if (this.seismicShockwavePool.length > 0) return;
    const baseGeom = new THREE.RingGeometry(1.55, 2.45, 48);
    baseGeom.rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff3d00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(baseGeom, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.seismicShockwavePool.push({
        active: false,
        center: new THREE.Vector3(),
        mesh,
        mat,
        currentRadius: 2.0,
        maxRadius: 16.0,
        speed: 10.0,
        damage: 35,
        innerSafeRadius: 6.5,
        hasHitPlayer: false,
      });
    }
  }

  public setDevFlags(godMode: boolean, ccImmune: boolean) {
    this.devGodMode = godMode;
    this.devCcImmune = ccImmune;
    if (ccImmune) {
      this.playerDebuffs.isStunned = false;
      this.playerDebuffs.stunTimer = 0;
      this.playerDebuffs.isSlowed = false;
      this.playerDebuffs.slowTimer = 0;
    }
  }

  public notifyPlayerRespawn() {
    this.clearDebuffs();
    // Mulai pemulihan cuaca kaldera secara perlahan saat pemain respawn
    this.ignisLastKnownAlive = false;
  }

  public getBossDebugState(bossId: string): {
    state: string;
    phase: number;
    stormFactor: number;
    activeSkillId?: string;
  } {
    const state = this.bossStates.get(bossId) || 'idle';
    const timer = this.stateTimers.get(bossId) || 0;
    let stateLabel: string = state;
    if (bossId === 'boss_dragonfang') {
      if (state === 'meteor_dive') {
        if (timer < 1.0) stateLabel = 'meteor_dive (1/4 Takeoff)';
        else if (timer < 8.0) {
          const lap = timer - 1.0 < 3.5 ? '1/2' : '2/2';
          stateLabel = `meteor_dive (2/4 Orbit ${lap})`;
        } else if (timer < 9.3) stateLabel = 'meteor_dive (3/4 Lock)';
        else stateLabel = 'meteor_dive (4/4 Dive)';
      } else if (state === 'flying_pursuit') {
        stateLabel = timer < 0.7 ? 'flying_pursuit (Takeoff)' : 'flying_pursuit (Glide)';
      }
    }
    const activeTel = this.activeTelegraphMap.get(bossId);
    if (state === 'telegraph' && activeTel?.skill?.id) {
      stateLabel = `telegraph (${activeTel.skill.id})`;
    }
    return {
      state: stateLabel,
      phase: bossId === 'boss_dragonfang' ? this.dragonPhase : 1,
      stormFactor: this.extremeWeatherFactor,
      activeSkillId: activeTel?.skill?.id,
    };
  }

  /**
   * Resets a specific boss's AI state, cooldowns, telegraphs, and Phase 1 visuals cleanly.
   */
  public resetBoss(
    bossId: string,
    enemy?: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
    }
  ) {
    // Remove any active telegraphs belonging to this boss
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      if (this.telegraphs[i].bossId === bossId) {
        this.removeTelegraph(this.telegraphs[i]);
        this.telegraphs.splice(i, 1);
      }
    }
    this.activeTelegraphMap.delete(bossId);

    const config =
      bossId === 'boss_dragonfang'
        ? IGNIS_DRAGON_BOSS_CONFIG
        : bossId === 'boss_jarrus'
          ? JARRUS_WORM_BOSS_CONFIG
          : ANCIENT_TITAN_BOSS_CONFIG;

    this.registerBoss(bossId, config);
    this.bossStates.set(bossId, 'chase');
    this.stateTimers.set(bossId, 0);

    if (bossId === 'boss_dragonfang') {
      this.dragonPhase = 1;
      this.ignisLastKnownAlive = true;
      this.isDragonAirborne = false;
      this.callbacks.onAirborneChange?.(false);
      this.removeMeteorDiveIndicator();
      this.meteorDiveTarget = null;
      this.orbitFireball1Fired = false;
      this.orbitFireball2Fired = false;
      if (enemy) {
        enemy.mesh.rotation.order = 'XYZ';
        enemy.mesh.rotation.x = 0;
        enemy.mesh.rotation.z = 0;
        this.resetDragonPhase1Visuals(enemy);
      }
    }
  }

  /**
   * Forces Ignis (or nearby boss) visual & phase state cleanly
   */
  public resetDragonPhase1Visuals(enemy: {
    mesh: THREE.Group;
    parts: Record<string, any>;
  }) {
    const mats = enemy.parts?.mats;
    if (mats) {
      if (mats.scale) {
        mats.scale.color.setHex(0x141212);
        mats.scale.emissive.setHex(0x000000);
        mats.scale.emissiveIntensity = 0;
        mats.scale.roughness = 0.72;
      }
      if (mats.lava) {
        mats.lava.color.setHex(0xd32f2f);
        mats.lava.emissive.setHex(0xff3d00);
        mats.lava.emissiveIntensity = 1.6;
      }
      if (mats.horn) {
        mats.horn.color.setHex(0x1f0c0c);
        mats.horn.emissive.setHex(0xaa2200);
        mats.horn.emissiveIntensity = 0.45;
      }
      if (mats.claw) {
        mats.claw.color.setHex(0x1c1414);
        mats.claw.emissive.setHex(0x450a0a);
        mats.claw.emissiveIntensity = 0.25;
      }
      if (mats.eye) {
        mats.eye.color.setHex(0xff5722);
        mats.eye.emissive.setHex(0xff3d00);
        mats.eye.emissiveIntensity = 2.0;
      }
      if (mats.wingOuter) {
        mats.wingOuter.color.setHex(0x260909);
        mats.wingOuter.emissive.setHex(0x1a0404);
        mats.wingOuter.emissiveIntensity = 0.3;
        mats.wingOuter.roughness = 0.72;
      }
      if (mats.wingVein) {
        mats.wingVein.color.setHex(0x991b1b);
        mats.wingVein.emissive.setHex(0xff4500);
        mats.wingVein.emissiveIntensity = 0.95;
      }
    }
    this.ignisMaterialsUpdatedPhase = 1;
  }

  private updateDragonPhase2Visuals(enemy: {
    parts: Record<string, any>;
  }) {
    const mats = enemy.parts?.mats;
    if (!mats) return;

    if (this.ignisMaterialsUpdatedPhase !== 2) {
      // Charred volcanic obsidian main scales (dark charred body contrast)
      if (mats.scale) {
        mats.scale.color.setHex(0x161214);
        mats.scale.emissive.setHex(0x1f0500);
        mats.scale.emissiveIntensity = 0.25;
        mats.scale.roughness = 0.78;
      }
      if (mats.wingOuter) {
        mats.wingOuter.color.setHex(0x161214);
        mats.wingOuter.emissive.setHex(0x1f0500);
        mats.wingOuter.emissiveIntensity = 0.22;
        mats.wingOuter.roughness = 0.78;
      }
      this.ignisMaterialsUpdatedPhase = 2;
    }

    // Dynamic molten pulse ONLY on magma cracks, eyes, inner jaw/maw, horns, dorsal spines, claws, & inner wing veins
    const pulse01 = 0.5 + 0.5 * Math.sin(this.elapsedTime * 6.0);
    const moltenIntensity = 1.8 + pulse01 * 1.0; // 1.8 - 2.8
    this._lavaColBlend.copy(this._lavaColA).lerp(this._lavaColB, pulse01);

    if (mats.lava) {
      mats.lava.color.copy(this._lavaColBlend);
      mats.lava.emissive.copy(this._lavaColBlend);
      mats.lava.emissiveIntensity = moltenIntensity;
    }
    if (mats.horn) {
      mats.horn.color.setHex(0x2a0e0a);
      mats.horn.emissive.copy(this._lavaColBlend);
      mats.horn.emissiveIntensity = moltenIntensity;
    }
    if (mats.claw) {
      mats.claw.color.setHex(0x2d100a);
      mats.claw.emissive.copy(this._lavaColBlend);
      mats.claw.emissiveIntensity = moltenIntensity;
    }
    if (mats.eye) {
      mats.eye.color.copy(this._lavaColBlend);
      mats.eye.emissive.copy(this._lavaColBlend);
      mats.eye.emissiveIntensity = moltenIntensity;
    }
    if (mats.wingVein) {
      mats.wingVein.color.copy(this._lavaColBlend);
      mats.wingVein.emissive.copy(this._lavaColBlend);
      mats.wingVein.emissiveIntensity = moltenIntensity;
    }
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
    this.elapsedTime += delta;

    // 0. Update Caldera Storm Weather Factor (smooth 2.5s build-up, 4.5s recovery)
    const distToCaldera = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
    if (this.ignisLastKnownAlive && this.dragonPhase === 2) {
      if (distToCaldera <= 68.0) {
        this.extremeWeatherFactor = Math.min(1.0, this.extremeWeatherFactor + delta / 2.5);
      } else if (distToCaldera > 72.0) {
        this.extremeWeatherFactor = Math.max(0.0, this.extremeWeatherFactor - delta / 4.5);
      }
    } else if (this.extremeWeatherFactor > 0) {
      this.extremeWeatherFactor = Math.max(0.0, this.extremeWeatherFactor - delta / 4.5);
    }

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

      // Inward vortex suction & DoT for Desert Sand Whirlpool
      if (tel.skill.id === 'sand_whirlpool') {
        const distToCenter = Math.hypot(playerPos.x - tel.center.x, playerPos.z - tel.center.z);
        if (distToCenter < (tel.radius || 36.0) && distToCenter > 1.2) {
          if (!this.devCcImmune) {
            const pullDirX = (tel.center.x - playerPos.x) / distToCenter;
            const pullDirZ = (tel.center.z - playerPos.z) / distToCenter;
            const pullSpeed = 5.2 * delta; // Sedotan pusaran pasir ke arah tengah kawah
            playerPos.x += pullDirX * pullSpeed;
            playerPos.z += pullDirZ * pullSpeed;
            // Perputaran spiral pusaran pasir
            playerPos.x += -pullDirZ * (2.4 * delta);
            playerPos.z += pullDirX * (2.4 * delta);
          }

          // Efek debu pasir abrasif berkala saat tersedot
          if (!this.devGodMode && Math.random() < 0.08) {
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

      // Detonate attack when telegraph timer finishes
      if (tel.timer >= tel.duration) {
        this.executeTelegraphAttack(tel, playerPos, playerVel, isPlayerDashing);
        this.removeTelegraph(tel);
        this.telegraphs.splice(i, 1);
        this.activeTelegraphMap.delete(tel.bossId);
      }
    }

    // 4. Decrement Boss Skill Cooldowns
    this.skillCooldowns.forEach((cdMap) => {
      cdMap.forEach((time, skillId) => {
        if (time > 0) {
          cdMap.set(skillId, Math.max(0, time - delta));
        }
      });
    });
  }

  public notifyBossDefeated(bossId: string) {
    if (bossId === 'boss_dragonfang') {
      this.ignisLastKnownAlive = false;
      if (this.isDragonAirborne) {
        this.isDragonAirborne = false;
        this.callbacks.onAirborneChange?.(false);
        this.removeMeteorDiveIndicator();
        this.meteorDiveTarget = null;
      }
    }
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
      if (isIgnis) {
        this.ignisLastKnownAlive = false;
      }
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

    // Dragon Phase 2 (Volcanic Berserk) & Dynamic Pulsing Lava Cracks
    if (isIgnis) {
      this.ignisLastKnownAlive = true;
      if (enemy.data.hp <= enemy.data.maxHp * 0.5 && this.dragonPhase === 1) {
        this.dragonPhase = 2;
        soundManager.playDragonRoar();
        this.callbacks.onCameraShake(1.2);
        this.callbacks.onAddFloatingText('🔥 IGNIS MERAUNG! FASE 2: VOLCANIC BERSERK AKTIF!', '#ff3d00', 'crit');
      }

      if (this.dragonPhase === 2) {
        this.updateDragonPhase2Visuals(enemy);
      } else if (this.ignisMaterialsUpdatedPhase !== 1) {
        this.resetDragonPhase1Visuals(enemy);
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
          // Ancang-ancang menekuk lutut selama 0.8 detik (knee-bend wind-up)
          if (enemy.parts?.leftLeg && enemy.parts?.rightLeg) {
            enemy.parts.leftLeg.rotation.x = 0.55;
            enemy.parts.rightLeg.rotation.x = 0.55;
          }
          if (enemy.parts?.torso) {
            enemy.parts.torso.position.y = 1.35 - 0.5;
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
    const homeX = enemy.spawnPos ? enemy.spawnPos.x : (isWorm ? -660 : (isTitan ? 320 : 40));
    const homeZ = enemy.spawnPos ? enemy.spawnPos.z : (isWorm ? -160 : (isTitan ? -640 : 840));
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
        this.dragonTakeoffStartPos.copy(ePos);
        this.dragonOrbitStartAngle = Math.atan2(ePos.z - SPAWN_NAGA[1], ePos.x - SPAWN_NAGA[0]);
        this.dragonOrbitRadius = 26.0;
        this.orbitFireball1Fired = false;
        this.orbitFireball2Fired = false;
        this.meteorDiveTarget = null;
        this.isDragonAirborne = true;
        this.callbacks.onAirborneChange?.(true);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('☄️ IGNIS MENGANGKASA: ORBIT KALDERA & METEOR DIVE!', '#ff3d00', 'crit');
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

      const fwd = this._scratchV1.set(0, 0, 1).applyAxisAngle(this._upAxis, enemy.mesh.rotation.y);
      const toPlayer = this._scratchV2.set(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
      const dot = fwd.dot(toPlayer);

      const selected = MonsterCombatAI.selectDragonSkill(distToPlayer, dot, cdMap, distToCenter);
      if (selected === 'meteor_dive') {
        this.bossStates.set(bossId, 'meteor_dive');
        this.stateTimers.set(bossId, 0);
        this.dragonTakeoffStartPos.copy(ePos);
        this.dragonOrbitStartAngle = Math.atan2(ePos.z - SPAWN_NAGA[1], ePos.x - SPAWN_NAGA[0]);
        this.dragonOrbitRadius = 26.0;
        this.orbitFireball1Fired = false;
        this.orbitFireball2Fired = false;
        this.meteorDiveTarget = null;
        this.isDragonAirborne = true;
        this.callbacks.onAirborneChange?.(true);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('☄️ IGNIS MENGANGKASA: ORBIT KALDERA & METEOR DIVE!', '#ff3d00', 'crit');
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
        this.startTelegraphCone(bossId, enemy, ePos, fwd, 14, Math.PI / 3, skill);
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
      if (selected === 'seismic_slam') {
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
          const centerPos = new THREE.Vector3(-30, this.getTerrainHeight(-30, -220), -220);
          this.startTelegraphCircle(bossId, enemy, centerPos, 36.0, skill);
          soundManager.playTitanGroundSlam();
          this.callbacks.onAddFloatingText('🌪️ SANG CACING MEMICU PUSARAN PASIR RAKSASA!', '#f59e0b', 'crit');
          cdMap.set('sand_whirlpool', skill.cooldown);
          return true;
        }
      } else if (selected === 'burrow_burst') {
        const skill = config.skills.find((s) => s.id === 'burrow_burst')!;
        const targetPos = playerPos.clone();
        // Leash territory safeguard: Cacing tidak boleh burrow keluar dari arena kawah pasir
        const homePos = enemy.spawnPos || new THREE.Vector3(-30, 0, -220);
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
    const targetFlightY = groundY + 5.5;
    const distToPlayer = Math.hypot(playerPos.x - nagaPos.x, playerPos.z - nagaPos.z);

    // ==========================================
    // 1. FASE TAKE-OFF (Lepas Landas ~ 0.7s mulus)
    // ==========================================
    if (stateTimer < 0.7) {
      nagaPos.y = THREE.MathUtils.lerp(nagaPos.y, targetFlightY, Math.min(1.0, delta * 5.2));
      naga.rotation.order = 'XYZ';
      naga.rotation.x = THREE.MathUtils.lerp(naga.rotation.x, -0.18, delta * 6.0);
      naga.rotation.z = 0;

      // Animasi rotasi sayap mengepak lebar & kuat:
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 20.0) * 0.6;
        enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 20.0) * 0.6;
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

      // Hadap ke arah pemain (zero alloc)
      const toP = this._scratchV1.set(playerPos.x - nagaPos.x, 0, playerPos.z - nagaPos.z);
      if (toP.lengthSq() > 0.001) {
        naga.rotation.y = Math.atan2(toP.x, toP.z);
      }
      return true;
    }

    // ==========================================
    // 3. FASE LANDING SLAM (Mendarat di Dekat Pemain)
    // ==========================================
    if (distToPlayer <= 4.8 || stateTimer >= 4.2) {
      // Naga mendarat ke tanah:
      nagaPos.y = groundY;
      naga.rotation.order = 'XYZ';
      naga.rotation.x = 0;
      naga.rotation.z = 0;

      // Hasilkan efek benturan tanah (ground slam)
      this.callbacks.onCameraShake(0.65);
      soundManager.playMeteorImpact();
      this.callbacks.onSpawnShockwave?.(this._scratchV1.copy(nagaPos), 0xff3d00, 7.5, 0.5);
      this.callbacks.onSpawnSparks?.(this._scratchV2.set(nagaPos.x, nagaPos.y + 0.6, nagaPos.z), 0xdc2626, 18, 5.5);
      this.callbacks.onAddFloatingText('💥 IGNIS MENDARAT MENUKIK (GROUND SLAM)!', '#ef4444', 'crit');

      // Serangan benturan landing slam jika pemain berada di area benturan (hormati God Mode):
      if (distToPlayer <= 5.5 && !this.devGodMode) {
        this.callbacks.onUpdateStats((stats) => {
          const absorbed = this.callbacks.onDamageAbsorb ? this.callbacks.onDamageAbsorb(45) : 45;
          const actualDmg = absorbed <= 0 ? 0 : Math.max(5, absorbed - Math.round(stats.baseDefense * 0.4));
          const nextHp = Math.max(0, stats.hp - actualDmg);
          if (actualDmg > 0) {
            this.callbacks.onAddFloatingText(`-${actualDmg} HP (Ignis Slam!)`, '#ef4444', 'damage');
          }
          if (nextHp <= 0) this.callbacks.onPlayerDeath?.();
          return { ...stats, hp: nextHp };
        });
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
        const fwd = this._scratchV1.set(0, 0, 1).applyAxisAngle(this._upAxis, naga.rotation.y);
        this.startTelegraphCircle(bossId, enemy, this._scratchV2.copy(nagaPos).addScaledVector(fwd, 2.5), 4.5, skill);
        soundManager.playHit(true);
        cdMap.set('dragon_claw', skill.cooldown);
        return true;
      } else if (breathCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'flame_breath') || config.skills.find((s) => s.id === 'fire_breath')!;
        const fwd = this._scratchV1.set(0, 0, 1).applyAxisAngle(this._upAxis, naga.rotation.y);
        this.startTelegraphCone(bossId, enemy, nagaPos, fwd, 14, Math.PI / 3, skill);
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
    // 2. FASE GLIDE / DIVE RUSH (Kecepatan terukur 13.0 m/s)
    // ==========================================
    const playerGroundY = this.getTerrainHeight(playerPos.x, playerPos.z);
    const targetY = THREE.MathUtils.lerp(targetFlightY, playerGroundY + 1.4, 0.45);
    const targetPos = this._scratchV1.set(playerPos.x, targetY, playerPos.z);

    // Pergerakan linear terukur 13.0 m/s (menggantikan lerp + addScaledVector ganda sebelumnya)
    const toTarget = this._scratchV2.subVectors(targetPos, nagaPos);
    const distRem = toTarget.length();
    if (distRem > 0.01) {
      toTarget.divideScalar(distRem);
      const flySpeed = 13.0 * delta;
      nagaPos.addScaledVector(toTarget, Math.min(flySpeed, distRem));
      naga.rotation.order = 'YXZ';
      naga.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      const horiz = Math.hypot(toTarget.x, toTarget.z);
      naga.rotation.x = Math.atan2(-toTarget.y, Math.max(0.001, horiz));
      naga.rotation.z = 0;
    }

    // Sayap mengepak kuat meluncur:
    if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
      enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 14.0) * 0.45;
      enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 14.0) * 0.45;
    }
    if (enemy.parts?.tail) {
      enemy.parts.tail.rotation.y = Math.sin(stateTimer * 8.0) * 0.35;
    }

    return true;
  }

  /**
   * STATE_METEOR_DIVE (Boss Naga Purba Ignis)
   * Eksekusi skill Meteor Dive / Sky Crash dalam 4 Fase Sinematik:
   * Fase 1 (0.0s - 1.0s): Lepas landas mulus ke ketinggian +16m dan merapat ke radius orbit ~26u
   * Fase 2 (1.0s - 8.0s): Mengitari arena kaldera tepat 2 putaran penuh (4*PI rad / 7.0s ~1.8 rad/s) dengan banking roll & semburan bola api pooled
   * Fase 3 (8.0s - 9.3s): Penguncian Target & Telegraph merah 1.3s di atas target
   * Fase 4 (9.3s+): Tukikan terukur kecepatan 35-38 u/s (~0.5s ke tanah) -> Direct Crash 85 dmg + Seismic Shockwave Ring
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
    const centerX = SPAWN_NAGA[0];
    const centerZ = SPAWN_NAGA[1];
    const distPlayerToCenter = Math.hypot(playerPos.x - centerX, playerPos.z - centerZ);
    const distNagaToCenter = Math.hypot(nagaPos.x - centerX, nagaPos.z - centerZ);

    // Safety leash check: if player exits caldera or boss drifts far outside bounds
    if (distPlayerToCenter > NAGA_CALDERA_RADIUS + 6.0 || distNagaToCenter > NAGA_CALDERA_RADIUS + 14.0) {
      this.bossStates.set(bossId, 'chase');
      this.stateTimers.set(bossId, 0);
      this.isDragonAirborne = false;
      this.callbacks.onAirborneChange?.(false);
      this.removeMeteorDiveIndicator();
      this.meteorDiveTarget = null;
      cdMap.set('meteor_dive', 12.0);
      enemy.isReturning = true;

      nagaPos.y = this.getTerrainHeight(nagaPos.x, nagaPos.z);
      naga.rotation.order = 'XYZ';
      naga.rotation.x = 0;
      naga.rotation.z = 0;
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.set(0, 0, 0);
        enemy.parts.rightWing.rotation.set(0, 0, 0);
      }
      return false;
    }

    const arenaCenterGroundY = this.getTerrainHeight(centerX, centerZ);
    const orbitAltY = arenaCenterGroundY + 16.0;
    const orbitR = this.dragonOrbitRadius; // 26.0 units (within 24 - 28u)

    // ==========================================
    // FASE 1: LEPAS LANDAS (0.0s - 1.0s)
    // ==========================================
    if (stateTimer < 1.0) {
      if (!this.isDragonAirborne) {
        this.isDragonAirborne = true;
        this.callbacks.onAirborneChange?.(true);
      }

      const rawT = Math.min(1.0, stateTimer / 1.0);
      const easeT = rawT * rawT * (3.0 - 2.0 * rawT); // smoothstep

      const entryX = centerX + Math.cos(this.dragonOrbitStartAngle) * orbitR;
      const entryZ = centerZ + Math.sin(this.dragonOrbitStartAngle) * orbitR;

      nagaPos.x = THREE.MathUtils.lerp(this.dragonTakeoffStartPos.x, entryX, easeT);
      nagaPos.z = THREE.MathUtils.lerp(this.dragonTakeoffStartPos.z, entryZ, easeT);
      nagaPos.y = THREE.MathUtils.lerp(this.dragonTakeoffStartPos.y, orbitAltY, easeT);

      // Arahkan tubuh naga menghadap garis singgung lintasan orbit
      const tangX = -Math.sin(this.dragonOrbitStartAngle);
      const tangZ = Math.cos(this.dragonOrbitStartAngle);
      naga.rotation.order = 'YXZ';
      naga.rotation.y = Math.atan2(tangX, tangZ);
      naga.rotation.x = -0.28 * (1.0 - easeT * 0.5); // Hidung sedikit mendongak naik
      naga.rotation.z = THREE.MathUtils.lerp(0, 0.28, easeT); // Mulai miring masuk orbit

      // Kepakan sayap lebar bertenaga
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 18.0) * 0.72;
        enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 18.0) * 0.72;
      }
      if (enemy.parts?.neck) {
        enemy.parts.neck.rotation.x = -0.35 + Math.sin(stateTimer * 10.0) * 0.12;
      }
      if (enemy.parts?.frontLeftLeg && enemy.parts?.frontRightLeg) {
        enemy.parts.frontLeftLeg.rotation.x = -0.45;
        enemy.parts.frontRightLeg.rotation.x = -0.45;
      }
      if (enemy.parts?.leftLeg && enemy.parts?.rightLeg) {
        enemy.parts.leftLeg.rotation.x = 0.45;
        enemy.parts.rightLeg.rotation.x = 0.45;
      }

      // Percikan bara api di belakang sayap (pooled)
      if (Math.random() < 0.35) {
        this._scratchV1.set(
          nagaPos.x + (Math.random() - 0.5) * 4.5,
          nagaPos.y - 0.5,
          nagaPos.z + (Math.random() - 0.5) * 4.5
        );
        this.callbacks.onSpawnSparks?.(this._scratchV1, 0xff5722, 3, 2.5);
      }
      return true;
    }

    // ==========================================
    // FASE 2: MENGITARI ARENA KALDERA 2 PUTARAN PENUH (1.0s - 8.0s, durasi 7.0 detik)
    // ==========================================
    if (stateTimer < 8.0) {
      const orbitTime = stateTimer - 1.0;
      const orbitProgress = Math.min(1.0, orbitTime / 7.0);
      // Tepat 2 putaran penuh (4 * Math.PI radian selama 7.0 detik -> ~1.795 rad/s)
      const angle = this.dragonOrbitStartAngle + 4 * Math.PI * orbitProgress;

      nagaPos.x = centerX + Math.cos(angle) * orbitR;
      nagaPos.z = centerZ + Math.sin(angle) * orbitR;
      nagaPos.y = orbitAltY + Math.sin(orbitTime * 2.2) * 0.55;

      // Arah tangen gerak melingkar
      const tangX = -Math.sin(angle);
      const tangZ = Math.cos(angle);
      naga.rotation.order = 'YXZ';
      naga.rotation.y = Math.atan2(tangX, tangZ);
      naga.rotation.x = Math.cos(orbitTime * 2.2) * 0.06;

      // Miringkan tubuh ke dalam lintasan (banking roll ~27.5 deg = 0.48 rad), mulus di awal/akhir
      const bankFadeIn = Math.min(1.0, orbitTime / 0.5);
      const bankFadeOut = Math.min(1.0, (7.0 - orbitTime) / 0.5);
      naga.rotation.z = 0.48 * Math.min(bankFadeIn, bankFadeOut);

      // Kepakan sayap ritmis & gerakan ekor
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = Math.sin(orbitTime * 11.0) * 0.52;
        enemy.parts.rightWing.rotation.z = -Math.sin(orbitTime * 11.0) * 0.52;
      }
      if (enemy.parts?.neck) {
        enemy.parts.neck.rotation.x = -0.18 + Math.sin(orbitTime * 5.0) * 0.1;
      }
      if (enemy.parts?.tail) {
        enemy.parts.tail.rotation.y = Math.sin(orbitTime * 5.5) * 0.28;
      }

      // Sedikit percikan bara api dari sayap (pooled)
      if (Math.random() < 0.4) {
        const rightX = Math.cos(angle);
        const rightZ = Math.sin(angle);
        const wingSign = Math.random() > 0.5 ? 1 : -1;
        this._scratchV1.set(
          nagaPos.x + rightX * wingSign * 4.2,
          nagaPos.y + wingSign * 1.4,
          nagaPos.z + rightZ * wingSign * 4.2
        );
        this.callbacks.onSpawnSparks?.(this._scratchV1, 0xff4500, 2, 2.2);
      }

      // Serangan bola api ringan (pooled, tanpa PointLight) di Putaran ke-1 & Putaran ke-2 agar pemain aktif menghindar
      if (!this.orbitFireball1Fired && orbitTime >= 2.1) {
        this.orbitFireball1Fired = true;
        this._scratchV2.set(nagaPos.x, nagaPos.y - 0.5, nagaPos.z);
        this.callbacks.onSpawnFireballProjectile?.(this._scratchV2, this._scratchV3.copy(playerPos), 28);
        soundManager.playDragonFireBreath();
      } else if (!this.orbitFireball2Fired && orbitTime >= 5.3) {
        this.orbitFireball2Fired = true;
        this._scratchV2.set(nagaPos.x, nagaPos.y - 0.5, nagaPos.z);
        this.callbacks.onSpawnFireballProjectile?.(this._scratchV2, this._scratchV3.copy(playerPos), 28);
        soundManager.playDragonFireBreath();
      }

      return true;
    }

    // ==========================================
    // FASE 3: PENGUNCIAN TARGET / TELEGRAPH (8.0s - 9.3s, durasi 1.3 detik)
    // ==========================================
    if (stateTimer < 9.3) {
      if (!this.meteorDiveTarget) {
        // Kunci koordinat jatuh di posisi pemain (dijaga di dalam radius arena)
        let tx = playerPos.x;
        let tz = playerPos.z;
        const tDist = Math.hypot(tx - centerX, tz - centerZ);
        if (tDist > NAGA_CALDERA_RADIUS - 4.0) {
          const r = (NAGA_CALDERA_RADIUS - 4.0) / tDist;
          tx = centerX + (tx - centerX) * r;
          tz = centerZ + (tz - centerZ) * r;
        }
        const diveGroundY = this.getTerrainHeight(tx, tz);
        this.meteorDiveTarget = new THREE.Vector3(tx, diveGroundY, tz);
        this.spawnMeteorDiveIndicator(this.meteorDiveTarget, 6.5);
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('⚠️ TARGET TERKUNCI! HINDARI ZONA MERAH!', '#ff1744', 'crit');

        // Hitung titik staging di udara (~11 unit menyamping dari target & +15m vertikal) agar tukikan terukur ~0.5 detik
        const fromTarget = this._scratchV1.set(nagaPos.x - tx, 0, nagaPos.z - tz);
        if (fromTarget.lengthSq() < 0.01) fromTarget.set(1, 0, 0);
        else fromTarget.normalize();
        this.dragonDiveStagePos.set(tx + fromTarget.x * 11.0, diveGroundY + 15.0, tz + fromTarget.z * 11.0);
      }

      // Melayang mulus menuju posisi staging di atas target sambil meluruskan roll
      nagaPos.lerp(this.dragonDiveStagePos, Math.min(1.0, delta * 3.8));

      const toTarget = this._scratchV1.subVectors(this.meteorDiveTarget, nagaPos);
      const horiz = Math.hypot(toTarget.x, toTarget.z);
      naga.rotation.order = 'YXZ';
      if (horiz > 0.001) {
        naga.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
      naga.rotation.x = Math.atan2(-toTarget.y, Math.max(0.001, horiz)) * 0.65;
      naga.rotation.z = THREE.MathUtils.lerp(naga.rotation.z, 0, Math.min(1.0, delta * 7.0));

      // Kepakan sayap stabil bersiap menukik
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 12.0) * 0.45;
        enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 12.0) * 0.45;
      }

      const phase3Timer = stateTimer - 8.0;
      this.updateMeteorDiveIndicator(phase3Timer);

      if (Math.random() < 0.45) {
        this._scratchV2.set(
          this.meteorDiveTarget.x + (Math.random() - 0.5) * 6.5,
          this.meteorDiveTarget.y + 4.0 + Math.random() * 3.0,
          this.meteorDiveTarget.z + (Math.random() - 0.5) * 6.5
        );
        this.callbacks.onSpawnSparks?.(this._scratchV2, 0xff2200, 2, 2.0);
      }
      return true;
    }

    // ==========================================
    // FASE 4: TUKIKAN TERUKUR (Controlled Dive Impact ~34 - 38 unit/detik)
    // ==========================================
    const diveTarget = this.meteorDiveTarget || this._scratchV3.set(
      playerPos.x,
      this.getTerrainHeight(playerPos.x, playerPos.z),
      playerPos.z
    );
    const diveElapsed = stateTimer - 9.3;
    const toDive = this._scratchV1.subVectors(diveTarget, nagaPos);
    const distRemaining = toDive.length();

    // Kecepatan terukur 34.5 -> 38.0 unit/detik (menempuh jarak ~18u dalam ~0.50 detik)
    const controlledDiveSpeed = Math.min(38.0, 34.5 + diveElapsed * 7.0);
    const step = controlledDiveSpeed * delta;

    if (distRemaining > step + 0.2 && diveElapsed < 1.35) {
      toDive.divideScalar(distRemaining);
      nagaPos.addScaledVector(toDive, step);

      naga.rotation.order = 'YXZ';
      const horiz = Math.hypot(toDive.x, toDive.z);
      if (horiz > 0.001) {
        naga.rotation.y = Math.atan2(toDive.x, toDive.z);
      }
      naga.rotation.x = Math.atan2(-toDive.y, Math.max(0.001, horiz));
      naga.rotation.z = 0;

      // Pose sayap melipat aerodinamis saat menukik
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        enemy.parts.leftWing.rotation.z = 0.88;
        enemy.parts.rightWing.rotation.z = -0.88;
      }
      if (enemy.parts?.neck) {
        enemy.parts.neck.rotation.x = 0.25;
      }

      // Ekor bara api menukik (pooled)
      this.callbacks.onSpawnSparks?.(nagaPos, 0xff3d00, 4, 4.5);
      return true;
    }

    // Benturan Tanah (Ground Impact Moment)
    const impactPos = this._scratchV2.copy(diveTarget);
    impactPos.y = this.getTerrainHeight(impactPos.x, impactPos.z);
    nagaPos.copy(impactPos);

    // Reset postur naga tegak di tanah
    naga.rotation.order = 'XYZ';
    naga.rotation.x = 0;
    naga.rotation.z = 0;
    const toPlayer = this._scratchV1.set(playerPos.x - nagaPos.x, 0, playerPos.z - nagaPos.z);
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
      if (!this.devGodMode) {
        this.callbacks.onUpdateStats((stats) => {
          const rawDmg = 85;
          const absorbed = this.callbacks.onDamageAbsorb ? this.callbacks.onDamageAbsorb(rawDmg) : rawDmg;
          const actualDmg = absorbed <= 0 ? 0 : Math.max(12, absorbed - Math.round(stats.baseDefense * 0.4));
          const nextHp = Math.max(0, stats.hp - actualDmg);
          if (actualDmg > 0) {
            this.callbacks.onAddFloatingText(`-${actualDmg} HP (CRASH!)`, '#ef4444', 'crit');
          }
          if (nextHp <= 0) this.callbacks.onPlayerDeath?.();
          return { ...stats, hp: nextHp };
        });
      } else {
        this.callbacks.onAddFloatingText('🛡️ KEBAL (GOD MODE)!', '#38bdf8', 'info');
      }
      this.applyKnockup(impactPos, playerPos, playerVel || this._scratchV3.set(0, 0, 0));
    }

    // 2. Gelombang Kejut Seismik (Seismic Shockwave Ring): radius 2.0 -> 16.0 at 10 unit/s, 35 damage + knockback (dodge via lompat)
    this.spawnSeismicShockwave(impactPos, 2.0, 16.0, 10.0, 35);

    // 3. Efek Visual & Audio Ledakan Benturan (zero alloc)
    soundManager.playMeteorImpact();
    this.callbacks.onCameraShake(0.5);
    this.callbacks.onSpawnShockwave?.(impactPos, 0xff2200, 12.0, 0.7);
    this._scratchV1.set(impactPos.x, impactPos.y + 0.6, impactPos.z);
    this.callbacks.onSpawnSparks?.(this._scratchV1, 0xff3d00, 24, 9.0);
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
    if (this.seismicShockwavePool.length === 0) {
      this.initSeismicShockwavePool();
    }
    const sw = this.seismicShockwavePool[this.seismicPoolCursor];
    this.seismicPoolCursor = (this.seismicPoolCursor + 1) % this.seismicShockwavePool.length;

    sw.center.copy(center);
    sw.mesh.position.set(center.x, center.y + 0.15, center.z);
    const scale = startRadius / 2.0;
    sw.mesh.scale.set(scale, 1, scale);
    sw.mat.opacity = 0.85;
    sw.mesh.visible = true;
    sw.active = true;
    sw.currentRadius = startRadius;
    sw.maxRadius = maxRadius;
    sw.speed = speed;
    sw.damage = damage;
    sw.innerSafeRadius = 6.5;
    sw.hasHitPlayer = false;
  }

  public updateSeismicShockwaves(
    delta: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isPlayerJumping: boolean
  ) {
    for (let i = 0; i < this.seismicShockwavePool.length; i++) {
      const sw = this.seismicShockwavePool[i];
      if (!sw.active) continue;

      sw.currentRadius += sw.speed * delta;

      // Expand ring mesh scale
      const scale = sw.currentRadius / 2.0;
      sw.mesh.scale.set(scale, 1, scale);

      // Fade out opacity as it expands
      const progress = Math.min(1.0, (sw.currentRadius - 2.0) / Math.max(1.0, sw.maxRadius - 2.0));
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
            if (!this.devGodMode) {
              // Player grounded -> takes 35 damage and knockback
              this.callbacks.onUpdateStats((stats) => {
                const rawDmg = sw.damage;
                const absorbed = this.callbacks.onDamageAbsorb ? this.callbacks.onDamageAbsorb(rawDmg) : rawDmg;
                const actualDmg = absorbed <= 0 ? 0 : Math.max(8, absorbed - Math.round(stats.baseDefense * 0.35));
                const nextHp = Math.max(0, stats.hp - actualDmg);
                if (actualDmg > 0) {
                  this.callbacks.onAddFloatingText(`-${actualDmg} HP (Gelombang Kejut)`, '#ff3d00', 'damage');
                }
                if (nextHp <= 0) this.callbacks.onPlayerDeath?.();
                return { ...stats, hp: nextHp };
              });
            }
            this.applyKnockback(sw.center, playerPos, playerVel, 14.0);
          }
        }
      }

      // Expire shockwave back to pool (never dispose geometry mid-fight)
      if (sw.currentRadius >= sw.maxRadius) {
        sw.active = false;
        sw.mesh.visible = false;
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
    } else if (tel.skill.id === 'sand_whirlpool') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(1.1);
      this.callbacks.onSpawnShockwave?.(tel.center, 0xb45309, 36.0, 2.5);
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
    if (!this.devGodMode) {
      this.callbacks.onUpdateStats((stats) => {
        let finalDmg = Math.max(5, skill.damage - Math.round(stats.baseDefense * 0.5));
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
    } else {
      this.callbacks.onAddFloatingText('🛡️ KEBAL (GOD MODE)!', '#38bdf8', 'info');
    }

    // Apply Specific Status Debuffs (respecting Dev CC Immunity & God Mode)
    if (skill.effect === 'stun') {
      this.applyStun(skill.effectDuration || 1.5, playerVel);
    } else if (skill.effect === 'burn') {
      if (!this.devGodMode) {
        this.applyBurn(skill.effectDuration || 4.0);
      }
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
    if (this.devGodMode) return;
    this.applyBurn(duration);
  }

  public applyStunDebuff(duration: number, playerVel?: THREE.Vector3) {
    this.applyStun(duration, playerVel || this._scratchV1.set(0, 0, 0));
  }

  public applySlowDebuff(duration: number) {
    this.applySlow(duration);
  }

  private applyKnockup(from: THREE.Vector3, playerPos: THREE.Vector3, playerVel: THREE.Vector3) {
    if (this.devCcImmune) return;
    const dir = this._scratchV1.set(playerPos.x - from.x, 0, playerPos.z - from.z).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    playerVel.x += dir.x * 6.5;
    playerVel.z += dir.z * 6.5;
    playerVel.y = 11.5; // Terlempar tinggi ke udara
    this.callbacks.onAddFloatingText('🌪️ TERLEMPAR KE UDARA (KNOCKUP)!', '#ff5252', 'crit');
  }

  private applySlow(duration: number) {
    if (this.devCcImmune) return;
    this.playerDebuffs.isSlowed = true;
    this.playerDebuffs.slowTimer = Math.max(this.playerDebuffs.slowTimer || 0, duration);
    this.callbacks.onAddFloatingText('⏳ TERKENA SLOW! (Kecepatan -50%)', '#f59e0b', 'info');
  }

  private applyStun(duration: number, playerVel: THREE.Vector3) {
    if (this.devCcImmune) return;
    this.playerDebuffs.isStunned = true;
    this.playerDebuffs.stunTimer = duration;
    playerVel.set(0, 0, 0); // Lock movement
    this.callbacks.onAddFloatingText(`💫 TERKENA STUN! (${duration.toFixed(1)} detik)`, '#ffd600', 'crit');
  }

  private applyBurn(duration: number) {
    if (this.devGodMode) return;
    this.playerDebuffs.isBurned = true;
    this.playerDebuffs.burnTimer = duration;
    this.playerDebuffs.burnTickTimer = 0.6;
    this.callbacks.onAddFloatingText('🔥 TERBAKAR! (DoT)', '#ff3d00', 'damage');
  }

  private applyKnockback(from: THREE.Vector3, playerPos: THREE.Vector3, playerVel: THREE.Vector3, force = 16.0) {
    if (this.devCcImmune) return;
    const dir = this._scratchV1.set(playerPos.x - from.x, 0, playerPos.z - from.z).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    playerVel.x += dir.x * force;
    playerVel.z += dir.z * force;
    this.callbacks.onAddFloatingText('💨 TERPENTAL (KNOCKBACK)!', '#ff9100', 'info');
  }

  private updatePlayerDebuffs(delta: number) {
    // 1. Stun Countdown
    if (this.playerDebuffs.isStunned) {
      this.playerDebuffs.stunTimer -= delta;
      if (this.playerDebuffs.stunTimer <= 0 || this.devCcImmune) {
        this.playerDebuffs.isStunned = false;
        this.playerDebuffs.stunTimer = 0;
        if (!this.devCcImmune) {
          this.callbacks.onAddFloatingText('Pulih dari Stun!', '#76ff03', 'info');
        }
      }
    }

    // 2. Slow Countdown
    if (this.playerDebuffs.isSlowed) {
      this.playerDebuffs.slowTimer = (this.playerDebuffs.slowTimer || 0) - delta;
      if (this.playerDebuffs.slowTimer <= 0 || this.devCcImmune) {
        this.playerDebuffs.isSlowed = false;
        this.playerDebuffs.slowTimer = 0;
        if (!this.devCcImmune) {
          this.callbacks.onAddFloatingText('Efek Slow Berakhir!', '#76ff03', 'info');
        }
      }
    }

    // 3. Burn DoT Tick
    if (this.playerDebuffs.isBurned) {
      this.playerDebuffs.burnTimer -= delta;
      this.playerDebuffs.burnTickTimer -= delta;

      if (this.playerDebuffs.burnTickTimer <= 0) {
        this.playerDebuffs.burnTickTimer = 0.7;
        if (!this.devGodMode) {
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
      }

      if (this.playerDebuffs.burnTimer <= 0 || this.devGodMode) {
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
    this.seismicShockwavePool.forEach((sw, idx) => {
      this.scene.remove(sw.mesh);
      if (idx === 0) sw.mesh.geometry.dispose();
      sw.mat.dispose();
    });
    this.seismicShockwavePool = [];
    this.extremeWeatherFactor = 0;
    this.dragonPhase = 1;
    this.ignisLastKnownAlive = true;
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

