import * as THREE from 'three';
import { EnemyData, PlayerStats } from '../types/game';
import { soundManager } from './audio';
import {
  BOSS_ARENA_ZONES,
  MonsterCombatAI,
  SPAWN_NAGA,
  NAGA_CALDERA_RADIUS,
  resolveEnemyTarget,
  ShadowDecoyTargetInfo,
} from './monsterAI';
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
  onPlayerDamaged?: (actualDamage: number) => void;
  onDecoyHit?: () => void;
  onAirborneChange?: (isAirborne: boolean) => void;
  onCameraFocusBoss?: (bossPos: THREE.Vector3, weight: number) => void;
  onIgnisVisualReset?: () => void;
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
  private stormFactorTarget: number = 0;
  private ignisHasTriggeredPhase2: boolean = false;
  private ignisIsEnraged: boolean = false;
  private ignisPhase2AuraActive: boolean = false;
  private ignisIsCombatActive: boolean = false;
  private ignisLastKnownAlive: boolean = false;
  private ignisMaterialsUpdatedPhase: 1 | 2 = 1;

  // Developer Testing Flags (synced from devTestingManager, default false)
  private devGodMode: boolean = false;
  private devCcImmune: boolean = false;

  // Player Stealth & Shadow Decoy AI Redirection State
  private isPlayerStealthed: boolean = false;
  private activeDecoy: ShadowDecoyTargetInfo | null = null;
  private flyingPursuitLockedTarget: THREE.Vector3 | null = null;

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

  // Jarrus Follow-the-Leader 10-Segment Spine Kinematics & Zero-Allocation VFX Pools
  private lastIsPlayerDashing = false;
  private readonly WORM_HISTORY_CAP = 104;
  private readonly WORM_SEG_COUNT = 10;
  private readonly WORM_SEG_SPACING = 2.65;
  private readonly WORM_SAMPLE_STEP = 0.45;
  private jarrusSpineHistory: Array<{ pos: THREE.Vector3; quat: THREE.Quaternion }> = [];
  private jarrusSpineHeadIdx = 0;
  private jarrusSpineCount = 0;
  private jarrusStandbyTime = 0;
  private jarrusSandDustTimer = 0;

  private readonly _wormCurDir = new THREE.Vector3(0, 0, 1);
  private readonly _wormUp = new THREE.Vector3(0, 1, 0);
  private readonly _wormPrevUp = new THREE.Vector3(0, 1, 0);
  private readonly _wormRight = new THREE.Vector3(1, 0, 0);
  private readonly _wormRotMat = new THREE.Matrix4();
  private readonly _wormQuat = new THREE.Quaternion();
  private readonly _wormTargetPos = new THREE.Vector3();
  private readonly _wormScratchPos = new THREE.Vector3();
  private readonly _wormScratchQuat = new THREE.Quaternion();
  private readonly _wormPartDummy = new THREE.Object3D();

  // Pooled Instanced Sand Particles (frustumCulled = false)
  private readonly SAND_PARTICLE_CAP = 72;
  private sandParticleMesh: THREE.InstancedMesh | null = null;
  private sandParticles: Array<{
    active: boolean;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
    baseScale: number;
    rotY: number;
    rotX: number;
  }> = [];
  private sandParticleCursor = 0;

  // Pooled Sand Mounds / Surface Ripples (frustumCulled = false)
  private sandMoundPool: Array<{
    group: THREE.Group;
    rings: THREE.Mesh[];
    active: boolean;
    timer: number;
  }> = [];

  // Pooled Sand Spikes + Warning Rings for Sand Spike Barrage (frustumCulled = false)
  private sandSpikePool: Array<{
    active: boolean;
    phase: 'warning' | 'emerging' | 'active' | 'retracting';
    x: number;
    z: number;
    groundY: number;
    timer: number;
    delay: number;
    warningDuration: number;
    hitChecked: boolean;
    spikeMesh: THREE.Mesh;
    warningMesh: THREE.Mesh;
    warningMat: THREE.MeshBasicMaterial;
  }> = [];

  // Pre-allocated Action Telegraphs for Jarrus (Zero Runtime Allocation)
  private jarrusTakeoffRing: { group: THREE.Group; inner: THREE.Mesh; innerMat: THREE.MeshBasicMaterial } | null = null;
  private jarrusLandingRing: { group: THREE.Group; inner: THREE.Mesh; innerMat: THREE.MeshBasicMaterial } | null = null;
  private jarrusSlamLineGroup: { group: THREE.Group; fill: THREE.Mesh; fillMat: THREE.MeshBasicMaterial } | null = null;
  private jarrusTailConeGroup: { group: THREE.Group; fill: THREE.Mesh; fillMat: THREE.MeshBasicMaterial } | null = null;

  // Pre-allocated Quicksand Vortex (r=38) & Sand Bomb Eruption (r=36, 34u pillar)
  private jarrusVortexGroup: {
    group: THREE.Group;
    swirlRings: THREE.Mesh[];
  } | null = null;
  private jarrusSandBombGroup: {
    group: THREE.Group;
    warningRing: THREE.Mesh;
    warningRingMat: THREE.MeshBasicMaterial;
    warningFill: THREE.Mesh;
    warningFillMat: THREE.MeshBasicMaterial;
    pillarMesh: THREE.Mesh;
    pillarMat: THREE.MeshBasicMaterial;
    coreMesh: THREE.Mesh;
    coreMat: THREE.MeshBasicMaterial;
    shockwaveRing: THREE.Mesh;
    shockwaveMat: THREE.MeshBasicMaterial;
    blastActive: boolean;
    blastTimer: number;
  } | null = null;

  // Jarrus Combat State Machine
  private jarrusAction: {
    mode:
      | 'swim'
      | 'dolphin_breach'
      | 'towering_slam'
      | 'tail_whip'
      | 'spike_cast'
      | 'whirlpool_suction'
      | 'whirlpool_warning'
      | 'whirlpool_erupting'
      | 'exposed_recovery';
    timer: number;
    flankPhase: number;
    flankSign: number;
    breachChainRemaining: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    dir: THREE.Vector3;
    anchorYaw: number;
    hitApplied: boolean;
    suctionTickTimer: number;
    suctionWarnCooldown: number;
  } = {
    mode: 'swim',
    timer: 0,
    flankPhase: 0,
    flankSign: 1,
    breachChainRemaining: 0,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    dir: new THREE.Vector3(0, 0, 1),
    anchorYaw: 0,
    hitApplied: false,
    suctionTickTimer: 0,
    suctionWarnCooldown: 0,
  };

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
    this.initJarrusPools();
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
    this.isPlayerStealthed = false;
    this.activeDecoy = null;
    this.flyingPursuitLockedTarget = null;
    // Mulai pemulihan cuaca kaldera secara perlahan saat pemain respawn
    this.ignisLastKnownAlive = false;
  }

  public setStealthAndDecoyState(isStealthed: boolean, decoy: ShadowDecoyTargetInfo | null) {
    this.isPlayerStealthed = isStealthed;
    this.activeDecoy = decoy && decoy.active ? decoy : null;
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

  public setBossCombatActive(bossId: string, active: boolean) {
    if (bossId === 'boss_dragonfang') {
      this.ignisIsCombatActive = active;
    }
  }

  /**
   * Hard-resets all Ignis joints & transforms to standby ground posture (0 twisted / tilted limbs)
   */
  public resetDragonSkeletonPose(enemy: {
    mesh: THREE.Group;
    parts?: Record<string, any>;
  }) {
    if (!enemy?.mesh) return;
    enemy.mesh.quaternion.identity();
    enemy.mesh.rotation.order = 'XYZ';
    enemy.mesh.rotation.set(0, 0, 0);
    enemy.mesh.scale.set(4.2, 4.2, 4.2);

    const p = enemy.parts;
    if (!p) return;
    if (p.torso) {
      p.torso.position.set(0, 1.44, 0.05);
      p.torso.rotation.set(0, 0, 0);
    }
    if (p.neck) p.neck.rotation.set(0, 0, 0);
    if (p.head) p.head.rotation.set(0, 0, 0);
    if (p.jaw) p.jaw.rotation.set(0, 0, 0);
    if (p.leftWing) p.leftWing.rotation.set(-0.14, 0.16, 0);
    if (p.rightWing) p.rightWing.rotation.set(-0.14, -0.16, 0);
    if (p.leftElbow) p.leftElbow.rotation.set(0, 0, 0);
    if (p.rightElbow) p.rightElbow.rotation.set(0, 0, 0);
    if (p.frontLeftLeg) p.frontLeftLeg.rotation.set(0, 0, 0);
    if (p.frontRightLeg) p.frontRightLeg.rotation.set(0, 0, 0);
    if (p.leftLeg) p.leftLeg.rotation.set(0, 0, 0);
    if (p.rightLeg) p.rightLeg.rotation.set(0, 0, 0);
    if (p.tail) p.tail.rotation.set(0, 0, 0);
    if (Array.isArray(p.tailSegments)) {
      const restPitches = [-0.26, -0.18, 0.08, 0.14, 0.10];
      for (let i = 0; i < p.tailSegments.length; i++) {
        const seg = p.tailSegments[i];
        if (seg?.rotation) {
          seg.rotation.set(restPitches[i] ?? 0, 0, 0);
        }
      }
    }
  }

  /**
   * Resets a specific boss's AI state, cooldowns, telegraphs, skeleton joints, and Phase 1 visuals cleanly.
   */
  public resetBoss(
    bossId: string,
    enemy?: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
      spawnPos?: THREE.Vector3;
      spawnRotY?: number;
      isReturning?: boolean;
      deathTimer?: number;
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
    this.bossStates.set(bossId, 'idle');
    this.stateTimers.set(bossId, 0);

    if (bossId === 'boss_dragonfang') {
      this.dragonPhase = 1;
      this.ignisHasTriggeredPhase2 = false;
      this.ignisIsEnraged = false;
      this.ignisPhase2AuraActive = false;
      this.ignisIsCombatActive = false;
      this.ignisLastKnownAlive = !(enemy?.data?.isDead);
      this.extremeWeatherFactor = 0;
      this.stormFactorTarget = 0;
      this.isDragonAirborne = false;
      this.callbacks.onAirborneChange?.(false);
      this.removeMeteorDiveIndicator();
      this.meteorDiveTarget = null;
      this.flyingPursuitLockedTarget = null;
      this.orbitFireball1Fired = false;
      this.orbitFireball2Fired = false;
      if (enemy?.mesh) {
        this.resetDragonSkeletonPose(enemy);
        enemy.mesh.rotation.y = enemy.spawnRotY ?? Math.PI;
        enemy.mesh.visible = true;
        this.applyDragonVisualPhase(enemy, 1);
      }
      this.callbacks.onIgnisVisualReset?.();
    } else if (bossId === 'boss_jarrus') {
      this.resetJarrusState(enemy);
    } else if (enemy?.mesh) {
      // Hard-reset Ancient Titan transforms & joints cleanly as well
      enemy.mesh.quaternion.identity();
      enemy.mesh.rotation.order = 'XYZ';
      enemy.mesh.rotation.set(0, enemy.spawnRotY ?? 0, 0);
      enemy.mesh.scale.set(3.5, 3.5, 3.5);
      enemy.mesh.visible = true;
      if (enemy.parts?.torso) {
        enemy.parts.torso.position.y = 1.35;
        enemy.parts.torso.rotation.set(0, 0, 0);
      }
      if (enemy.parts?.leftArm) enemy.parts.leftArm.rotation.set(0, 0, 0);
      if (enemy.parts?.rightArm) enemy.parts.rightArm.rotation.set(0, 0, 0);
      if (enemy.parts?.leftLeg) enemy.parts.leftLeg.rotation.set(0, 0, 0);
      if (enemy.parts?.rightLeg) enemy.parts.rightLeg.rotation.set(0, 0, 0);
    }
  }

  /**
   * Switches all Ignis materials between Phase 1 (Primal Crimson) and Phase 2 (Volcanic Obsidian Magma).
   * 100% zero-allocation and 100% reversible upon respawn/reset.
   */
  public applyDragonVisualPhase(
    enemy: {
      mesh: THREE.Group;
      parts: Record<string, any>;
    },
    phase: 1 | 2
  ) {
    if (phase === 1) {
      this.resetDragonPhase1Visuals(enemy);
    } else {
      this.updateDragonPhase2Visuals(enemy);
    }
  }

  /**
   * Forces Ignis materials back to 100% normal Phase 1 Primal Crimson Dragon palette
   */
  public resetDragonPhase1Visuals(enemy: {
    mesh: THREE.Group;
    parts: Record<string, any>;
  }) {
    const mats = enemy.parts?.mats;
    if (mats) {
      if (mats.scale) {
        mats.scale.color.setHex(0x3b1518);
        mats.scale.emissive.setHex(0x000000);
        mats.scale.emissiveIntensity = 0;
        mats.scale.roughness = 0.68;
      }
      if (mats.scaleSecondary) {
        mats.scaleSecondary.color.setHex(0x25181c);
        mats.scaleSecondary.emissive.setHex(0x000000);
        mats.scaleSecondary.emissiveIntensity = 0;
        mats.scaleSecondary.roughness = 0.72;
      }
      if (mats.underbelly) {
        mats.underbelly.color.setHex(0x6b3424);
        mats.underbelly.emissive.setHex(0x1a0804);
        mats.underbelly.emissiveIntensity = 0.12;
      }
      if (mats.spine) {
        mats.spine.color.setHex(0x331c1d);
        mats.spine.emissive.setHex(0x000000);
        mats.spine.emissiveIntensity = 0;
      }
      if (mats.lava) {
        mats.lava.color.setHex(0xf59e0b);
        mats.lava.emissive.setHex(0xf59e0b);
        mats.lava.emissiveIntensity = 1.2;
      }
      if (mats.horn) {
        mats.horn.color.setHex(0x2d2626);
        mats.horn.emissive.setHex(0x000000);
        mats.horn.emissiveIntensity = 0;
      }
      if (mats.hornTip) {
        mats.hornTip.color.setHex(0x2d2626);
        mats.hornTip.emissive.setHex(0x000000);
        mats.hornTip.emissiveIntensity = 0;
      }
      if (mats.claw) {
        mats.claw.color.setHex(0x262020);
        mats.claw.emissive.setHex(0x000000);
        mats.claw.emissiveIntensity = 0;
      }
      if (mats.eye) {
        mats.eye.color.setHex(0xf59e0b);
        mats.eye.emissive.setHex(0xf59e0b);
        mats.eye.emissiveIntensity = 1.2;
      }
      if (mats.mawGlow) {
        mats.mawGlow.color.setHex(0xb45309);
        mats.mawGlow.emissive.setHex(0xea580c);
        mats.mawGlow.emissiveIntensity = 0.8;
      }
      if (mats.wingOuter) {
        mats.wingOuter.color.setHex(0x4a181c);
        mats.wingOuter.emissive.setHex(0x160506);
        mats.wingOuter.emissiveIntensity = 0.15;
        mats.wingOuter.roughness = 0.74;
      }
      if (mats.wingVein) {
        mats.wingVein.color.setHex(0x5c2024);
        mats.wingVein.emissive.setHex(0x3b0f12);
        mats.wingVein.emissiveIntensity = 0.22;
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
      // Charred volcanic obsidian primary & secondary scales
      if (mats.scale) {
        mats.scale.color.setHex(0x161114);
        mats.scale.emissive.setHex(0x1f0500);
        mats.scale.emissiveIntensity = 0.22;
        mats.scale.roughness = 0.78;
      }
      if (mats.scaleSecondary) {
        mats.scaleSecondary.color.setHex(0x1c1416);
        mats.scaleSecondary.emissive.setHex(0x220400);
        mats.scaleSecondary.emissiveIntensity = 0.20;
        mats.scaleSecondary.roughness = 0.78;
      }
      if (mats.underbelly) {
        mats.underbelly.color.setHex(0x3a1610);
        mats.underbelly.emissive.setHex(0x450a0a);
        mats.underbelly.emissiveIntensity = 0.45;
      }
      if (mats.wingOuter) {
        mats.wingOuter.color.setHex(0x1e1216);
        mats.wingOuter.emissive.setHex(0x1a0404);
        mats.wingOuter.emissiveIntensity = 0.22;
        mats.wingOuter.roughness = 0.78;
      }
      this.ignisMaterialsUpdatedPhase = 2;
    }

    // Dynamic molten pulse ONLY on eyes, inner jaw/maw, chest magma cracks, dorsal spines, horn tips, claws, & wing membrane veins
    const pulse01 = 0.5 + 0.5 * Math.sin(this.elapsedTime * 6.0);
    const moltenIntensity = 1.8 + pulse01 * 0.8; // 1.8 - 2.6
    this._lavaColBlend.copy(this._lavaColA).lerp(this._lavaColB, pulse01);

    if (mats.lava) {
      mats.lava.color.copy(this._lavaColBlend);
      mats.lava.emissive.copy(this._lavaColBlend);
      mats.lava.emissiveIntensity = moltenIntensity;
    }
    if (mats.spine) {
      mats.spine.color.setHex(0x2d0e0a);
      mats.spine.emissive.copy(this._lavaColBlend);
      mats.spine.emissiveIntensity = moltenIntensity;
    }
    if (mats.horn) {
      mats.horn.color.setHex(0x221010);
      mats.horn.emissive.setHex(0x661200);
      mats.horn.emissiveIntensity = 0.4;
    }
    if (mats.hornTip) {
      mats.hornTip.color.setHex(0x3a1008);
      mats.hornTip.emissive.copy(this._lavaColBlend);
      mats.hornTip.emissiveIntensity = moltenIntensity;
    }
    if (mats.claw) {
      mats.claw.color.setHex(0x2d100a);
      mats.claw.emissive.copy(this._lavaColBlend);
      mats.claw.emissiveIntensity = moltenIntensity * 0.75;
    }
    if (mats.eye) {
      mats.eye.color.copy(this._lavaColBlend);
      mats.eye.emissive.copy(this._lavaColBlend);
      mats.eye.emissiveIntensity = moltenIntensity;
    }
    if (mats.mawGlow) {
      mats.mawGlow.color.copy(this._lavaColBlend);
      mats.mawGlow.emissive.copy(this._lavaColBlend);
      mats.mawGlow.emissiveIntensity = moltenIntensity;
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
    this.lastIsPlayerDashing = isPlayerDashing;

    // 0. Update Caldera Storm Weather Factor (smooth 2.5s build-up, 4.5s recovery, strictly 0 in Phase 1 / dead)
    const distToCaldera = Math.hypot(playerPos.x - SPAWN_NAGA[0], playerPos.z - SPAWN_NAGA[1]);
    if (
      this.ignisLastKnownAlive &&
      this.dragonPhase === 2 &&
      this.ignisHasTriggeredPhase2 &&
      distToCaldera <= 95.0
    ) {
      this.stormFactorTarget = 1.0;
    } else if (!this.ignisLastKnownAlive || this.dragonPhase === 1 || distToCaldera > 98.0) {
      this.stormFactorTarget = 0.0;
    }
    if (this.extremeWeatherFactor < this.stormFactorTarget) {
      this.extremeWeatherFactor = Math.min(this.stormFactorTarget, this.extremeWeatherFactor + delta / 2.5);
    } else if (this.extremeWeatherFactor > this.stormFactorTarget) {
      this.extremeWeatherFactor = Math.max(this.stormFactorTarget, this.extremeWeatherFactor - delta / 4.5);
    }

    // 1. Update Player Status Debuffs (Stun & Burn DoT)
    this.updatePlayerDebuffs(delta);

    // 2. Update active seismic shockwaves & Jarrus pooled sand VFX
    this.updateSeismicShockwaves(delta, playerPos, playerVel, isPlayerJumping);
    this.updateJarrusPools(delta, playerPos, playerVel, isPlayerDashing);

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
    } else if (bossId === 'boss_jarrus') {
      this.resetJarrusState();
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

    // Dragon Phase 2 (Volcanic Berserk) — strictly requires alive, combatActive, not yet triggered, and HP <= 50%
    if (isIgnis) {
      this.ignisLastKnownAlive = !enemy.data.isDead && enemy.data.hp > 0;
      if (
        !enemy.data.isDead &&
        enemy.data.hp > 0 &&
        enemy.data.hp <= enemy.data.maxHp * 0.5 &&
        this.dragonPhase === 1 &&
        !this.ignisHasTriggeredPhase2 &&
        this.ignisIsCombatActive
      ) {
        this.dragonPhase = 2;
        this.ignisHasTriggeredPhase2 = true;
        this.ignisIsEnraged = true;
        this.ignisPhase2AuraActive = true;
        soundManager.playDragonRoar();
        this.callbacks.onCameraShake(1.2);
        this.callbacks.onAddFloatingText('🔥 IGNIS MERAUNG! FASE 2: VOLCANIC BERSERK AKTIF!', '#ff3d00', 'crit');
      }

      if (this.dragonPhase === 2 && this.ignisHasTriggeredPhase2) {
        this.applyDragonVisualPhase(enemy, 2);
      } else if (this.ignisMaterialsUpdatedPhase !== 1) {
        this.applyDragonVisualPhase(enemy, 1);
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
        // Flap wings & elbow joints, arch neck, and open hinged jaw roaring during wind-up
        if (enemy.parts?.neck) {
          enemy.parts.neck.rotation.x = -0.3 + Math.sin(stateTimer * 8) * 0.15;
        }
        if (enemy.parts?.jaw) {
          enemy.parts.jaw.rotation.x = 0.34 + Math.sin(stateTimer * 10) * 0.12;
        }
        if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
          const flap = Math.sin(stateTimer * 10);
          enemy.parts.leftWing.rotation.z = flap * 0.32;
          enemy.parts.rightWing.rotation.z = -flap * 0.32;
          if (enemy.parts.leftElbow && enemy.parts.rightElbow) {
            enemy.parts.leftElbow.rotation.z = flap * 0.25;
            enemy.parts.rightElbow.rotation.z = -flap * 0.25;
          }
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

    // Evaluate Boss Skills using shared Decoy priority & Stealth aggro-drop resolver
    if (enemy.isReturning) {
      return false;
    }
    const ePos = enemy.mesh.position;
    const resolved = resolveEnemyTarget(ePos, playerPos, this.isPlayerStealthed, this.activeDecoy);
    if (!resolved.targetPos) {
      // Pemain berada dalam Stealth Bom Asap dan tidak ada Decoy: Boss kehilangan kunci target
      return true;
    }
    const aimPos = resolved.targetPos;
    const distToPlayer = resolved.dist;
    if (distToPlayer > enemy.data.detectRange) {
      return false; // Out of detection range, do not cast boss skills
    }
    const homeX = enemy.spawnPos ? enemy.spawnPos.x : (isWorm ? -840 : (isTitan ? 180 : 40));
    const homeZ = enemy.spawnPos ? enemy.spawnPos.z : (isWorm ? -260 : (isTitan ? -560 : 840));
    const distFromHome = Math.hypot(ePos.x - homeX, ePos.z - homeZ);
    const maxLeash = enemy.leashRadius || 64;
    if (distFromHome > maxLeash) {
      return false; // Beyond leash territory
    }
    const cdMap = this.skillCooldowns.get(bossId)!;

    if (isIgnis) {
      const distToCenter = Math.hypot(aimPos.x - SPAWN_NAGA[0], aimPos.z - SPAWN_NAGA[1]);
      const meteorDiveCd = cdMap.get('meteor_dive') ?? 0;
      const flyingCooldown = cdMap.get('flying_dash') ?? cdMap.get('flying_pursuit') ?? 0;

      // 1. SUPREME BOSS SKILL: Meteor Dive / Sky Crash (Jarak 8 - 38 unit di arena kaldera, Cooldown 18s)
      if (distToCenter <= NAGA_CALDERA_RADIUS && distToPlayer >= 8.0 && distToPlayer <= 38.0 && meteorDiveCd <= 0) {
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

      // 2. GAP CLOSER: Flying Dive / Dash Pursuit (Jarak > 12 unit, jika target di kaldera & Cooldown <= 0)
      if (distToCenter <= NAGA_CALDERA_RADIUS && distToPlayer > 12.0 && flyingCooldown <= 0) {
        this.bossStates.set(bossId, 'flying_pursuit');
        this.stateTimers.set(bossId, 0);
        this.flyingPursuitLockedTarget = aimPos.clone();
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('🦅 IGNIS TERBANG MENUKIK MENGEJAR!', '#f97316', 'crit');
        return this.updateDragonFlyingPursuit(enemy, playerPos, delta, cdMap);
      }

      const fwd = this._scratchV1.set(0, 0, 1).applyAxisAngle(this._upAxis, enemy.mesh.rotation.y);
      const toPlayer = this._scratchV2.set(aimPos.x - ePos.x, 0, aimPos.z - ePos.z).normalize();
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
        this.flyingPursuitLockedTarget = aimPos.clone();
        soundManager.playDragonRoar();
        this.callbacks.onAddFloatingText('🦅 IGNIS TERBANG MENUKIK MENGEJAR!', '#f97316', 'crit');
        return this.updateDragonFlyingPursuit(enemy, playerPos, delta, cdMap);
      } else if (selected === 'fireball_barrage') {
        const skill = config.skills.find((s) => s.id === 'fireball_barrage')!;
        this.startTelegraphCircle(bossId, enemy, aimPos.clone(), 3.0, skill);
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
        this.startTelegraphCircle(bossId, enemy, aimPos.clone(), 2.0, skill);
        soundManager.playTitanGroundSlam();
        this.callbacks.onAddFloatingText('🪨 TITAN MELEMPAR BONGKAHAN BATU RAKSASA!', '#f59e0b', 'info');
        cdMap.set('boulder_hurl', skill.cooldown);
        return true;
      } else if (selected === 'earth_fissure') {
        const skill = config.skills.find((s) => s.id === 'earth_fissure')!;
        const toPlayer = new THREE.Vector3(aimPos.x - ePos.x, 0, aimPos.z - ePos.z).normalize();
        this.startTelegraphLine(bossId, enemy, ePos, toPlayer, Math.min(36, distToPlayer + 6), 4.0, skill);
        soundManager.playTitanGroundSlam();
        this.callbacks.onAddFloatingText('⚡ GUNCANGAN RETAKAN BUMI MERAMBAT!', '#38bdf8', 'info');
        cdMap.set('earth_fissure', skill.cooldown);
        return true;
      } else if (selected === 'heavy_punch') {
        const skill = config.skills.find((s) => s.id === 'heavy_punch')!;
        const toPlayer = new THREE.Vector3(aimPos.x - ePos.x, 0, aimPos.z - ePos.z).normalize();
        const punchPos = ePos.clone().addScaledVector(toPlayer, 2.5);
        this.startTelegraphCircle(bossId, enemy, punchPos, 3.8, skill);
        cdMap.set('heavy_punch', skill.cooldown);
        return true;
      }
    } else if (isWorm) {
      return this.updateJarrusCombat(
        enemy,
        playerPos,
        delta,
        this.lastIsPlayerDashing,
        playerVel,
        config,
        this.skillCooldowns.get(bossId)!
      );
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
      // Pastikan naga TIDAK TERBANG keluar dari radius kaldera aman
      if (distPlayerToCenter > NAGA_CALDERA_RADIUS + 4.0 || distNagaToCenter > NAGA_CALDERA_RADIUS + 8.0) {
        this.bossStates.set(bossId, 'chase');
        this.stateTimers.set(bossId, 0);
        cdMap.set('flying_dash', 9.0);
        cdMap.set('flying_pursuit', 9.0);
        enemy.isReturning = true;

        // Pendaratan darurat ke tanah
        nagaPos.y = this.getTerrainHeight(nagaPos.x, nagaPos.z);
        this.resetDragonSkeletonPose(enemy);
        return false;
      }

    const groundY = this.getTerrainHeight(nagaPos.x, nagaPos.z);
    const targetFlightY = groundY + 5.5;
    const resolvedFly = resolveEnemyTarget(nagaPos, playerPos, this.isPlayerStealthed, this.activeDecoy);
    if (resolvedFly.targetPos) {
      if (!this.flyingPursuitLockedTarget) {
        this.flyingPursuitLockedTarget = resolvedFly.targetPos.clone();
      } else {
        this.flyingPursuitLockedTarget.copy(resolvedFly.targetPos);
      }
    }
    const navTarget = this.flyingPursuitLockedTarget || playerPos;
    const distToNavTarget = Math.hypot(navTarget.x - nagaPos.x, navTarget.z - nagaPos.z);
    const distToPlayer = Math.hypot(playerPos.x - nagaPos.x, playerPos.z - nagaPos.z);

    // ==========================================
    // 1. FASE TAKE-OFF (Lepas Landas ~ 0.7s mulus)
    // ==========================================
    if (stateTimer < 0.7) {
      nagaPos.y = THREE.MathUtils.lerp(nagaPos.y, targetFlightY, Math.min(1.0, delta * 5.2));
      naga.rotation.order = 'XYZ';
      naga.rotation.x = THREE.MathUtils.lerp(naga.rotation.x, -0.18, delta * 6.0);
      naga.rotation.z = 0;

      // Animasi rotasi sayap + siku mengepak lebar & kuat:
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        const wingSwing = Math.sin(stateTimer * 20.0);
        enemy.parts.leftWing.rotation.z = wingSwing * 0.6;
        enemy.parts.rightWing.rotation.z = -wingSwing * 0.6;
        if (enemy.parts.leftElbow && enemy.parts.rightElbow) {
          enemy.parts.leftElbow.rotation.z = Math.sin(stateTimer * 20.0 - 0.5) * 0.35;
          enemy.parts.rightElbow.rotation.z = -Math.sin(stateTimer * 20.0 - 0.5) * 0.35;
        }
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

      // Hadap ke arah target (zero alloc)
      const toP = this._scratchV1.set(navTarget.x - nagaPos.x, 0, navTarget.z - nagaPos.z);
      if (toP.lengthSq() > 0.001) {
        naga.rotation.y = Math.atan2(toP.x, toP.z);
      }
      return true;
    }

    // ==========================================
    // 3. FASE LANDING SLAM (Mendarat di Dekat Target)
    // ==========================================
    if (distToNavTarget <= 4.8 || stateTimer >= 4.2) {
      // Naga mendarat ke tanah:
      nagaPos.y = groundY;
      this.resetDragonSkeletonPose(enemy);
      this.flyingPursuitLockedTarget = null;

      // Hasilkan efek benturan tanah (ground slam)
      this.callbacks.onCameraShake(0.65);
      soundManager.playMeteorImpact();
      this.callbacks.onSpawnShockwave?.(this._scratchV1.copy(nagaPos), 0xff3d00, 7.5, 0.5);
      this.callbacks.onSpawnSparks?.(this._scratchV2.set(nagaPos.x, nagaPos.y + 0.6, nagaPos.z), 0xdc2626, 18, 5.5);
      this.callbacks.onAddFloatingText('💥 IGNIS MENDARAT MENUKIK (GROUND SLAM)!', '#ef4444', 'crit');

      // Hancurkan Shadow Decoy jika masuk radius pendaratan
      if (this.activeDecoy?.active) {
        const distDecoy = Math.hypot(this.activeDecoy.position.x - nagaPos.x, this.activeDecoy.position.z - nagaPos.z);
        if (distDecoy <= 5.5) {
          this.callbacks.onDecoyHit?.();
        }
      }

      // Serangan benturan landing slam jika pemain berada di area benturan (hormati God Mode):
      if (distToPlayer <= 5.5 && !this.devGodMode) {
        this.callbacks.onUpdateStats((stats) => {
          const absorbed = this.callbacks.onDamageAbsorb ? this.callbacks.onDamageAbsorb(45) : 45;
          const actualDmg = absorbed <= 0 ? 0 : Math.max(5, absorbed - Math.round(stats.baseDefense * 0.4));
          const nextHp = Math.max(0, stats.hp - actualDmg);
          if (actualDmg > 0) {
            this.callbacks.onAddFloatingText(`-${actualDmg} HP (Ignis Slam!)`, '#ef4444', 'damage');
            this.callbacks.onPlayerDamaged?.(actualDmg);
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

      // Hanya rantai serangan lanjutan jika target masih terdeteksi
      const afterLand = resolveEnemyTarget(nagaPos, playerPos, this.isPlayerStealthed, this.activeDecoy);
      if (!afterLand.targetPos) {
        this.bossStates.set(bossId, 'recovery');
        this.stateTimers.set(bossId, 0);
        return true;
      }

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
    const navGroundY = this.getTerrainHeight(navTarget.x, navTarget.z);
    const targetY = THREE.MathUtils.lerp(targetFlightY, navGroundY + 1.4, 0.45);
    const targetPos = this._scratchV1.set(navTarget.x, targetY, navTarget.z);

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

      // Sayap + siku mengepak kuat meluncur:
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        const flap = Math.sin(stateTimer * 14.0);
        enemy.parts.leftWing.rotation.z = flap * 0.45;
        enemy.parts.rightWing.rotation.z = -flap * 0.45;
        if (enemy.parts.leftElbow && enemy.parts.rightElbow) {
          enemy.parts.leftElbow.rotation.z = Math.sin(stateTimer * 14.0 - 0.4) * 0.28;
          enemy.parts.rightElbow.rotation.z = -Math.sin(stateTimer * 14.0 - 0.4) * 0.28;
        }
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

      // Kepakan sayap lebar bertenaga (terhubung bahu & siku)
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        const wingSwing = Math.sin(stateTimer * 18.0);
        enemy.parts.leftWing.rotation.z = wingSwing * 0.68;
        enemy.parts.rightWing.rotation.z = -wingSwing * 0.68;
        if (enemy.parts.leftElbow && enemy.parts.rightElbow) {
          enemy.parts.leftElbow.rotation.z = Math.sin(stateTimer * 18.0 - 0.55) * 0.42;
          enemy.parts.rightElbow.rotation.z = -Math.sin(stateTimer * 18.0 - 0.55) * 0.42;
        }
      }
      if (enemy.parts?.jaw) enemy.parts.jaw.rotation.x = 0.32;
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

      // Kepakan sayap ritmis & gerakan siku/ekor luwes
      if (enemy.parts?.leftWing && enemy.parts?.rightWing) {
        const flap = Math.sin(orbitTime * 11.0);
        enemy.parts.leftWing.rotation.z = flap * 0.52;
        enemy.parts.rightWing.rotation.z = -flap * 0.52;
        if (enemy.parts.leftElbow && enemy.parts.rightElbow) {
          enemy.parts.leftElbow.rotation.z = Math.sin(orbitTime * 11.0 - 0.5) * 0.34;
          enemy.parts.rightElbow.rotation.z = -Math.sin(orbitTime * 11.0 - 0.5) * 0.34;
        }
      }
      if (enemy.parts?.jaw) enemy.parts.jaw.rotation.x = 0.18 + Math.sin(orbitTime * 5.0) * 0.10;
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
        const orbitAim = resolveEnemyTarget(nagaPos, playerPos, this.isPlayerStealthed, this.activeDecoy);
        if (orbitAim.targetPos) {
          this._scratchV3.copy(orbitAim.targetPos);
        } else {
          this._scratchV3.set(centerX + (Math.random() - 0.5) * 10, arenaCenterGroundY, centerZ + (Math.random() - 0.5) * 10);
        }
        this.callbacks.onSpawnFireballProjectile?.(this._scratchV2, this._scratchV3, 28);
        soundManager.playDragonFireBreath();
      } else if (!this.orbitFireball2Fired && orbitTime >= 5.3) {
        this.orbitFireball2Fired = true;
        this._scratchV2.set(nagaPos.x, nagaPos.y - 0.5, nagaPos.z);
        const orbitAim = resolveEnemyTarget(nagaPos, playerPos, this.isPlayerStealthed, this.activeDecoy);
        if (orbitAim.targetPos) {
          this._scratchV3.copy(orbitAim.targetPos);
        } else {
          this._scratchV3.set(centerX + (Math.random() - 0.5) * 10, arenaCenterGroundY, centerZ + (Math.random() - 0.5) * 10);
        }
        this.callbacks.onSpawnFireballProjectile?.(this._scratchV2, this._scratchV3, 28);
        soundManager.playDragonFireBreath();
      }

      return true;
    }

    // ==========================================
    // FASE 3: PENGUNCIAN TARGET / TELEGRAPH (8.0s - 9.3s, durasi 1.3 detik)
    // ==========================================
    if (stateTimer < 9.3) {
      if (!this.meteorDiveTarget) {
        const lockAim = resolveEnemyTarget(nagaPos, playerPos, this.isPlayerStealthed, this.activeDecoy);
        let tx = lockAim.targetPos ? lockAim.targetPos.x : centerX + (Math.random() - 0.5) * 10;
        let tz = lockAim.targetPos ? lockAim.targetPos.z : centerZ + (Math.random() - 0.5) * 10;
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

    this.resetDragonSkeletonPose(enemy);
    const toPlayer = this._scratchV1.set(playerPos.x - nagaPos.x, 0, playerPos.z - nagaPos.z);
    if (toPlayer.lengthSq() > 0.001) {
      naga.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }

    // 1. Direct Impact Damage (Radius 6.5 unit): 85 damage + High Knockup
    if (this.activeDecoy?.active) {
      const distDecoyImpact = Math.hypot(this.activeDecoy.position.x - impactPos.x, this.activeDecoy.position.z - impactPos.z);
      if (distDecoyImpact <= 6.5) {
        this.callbacks.onDecoyHit?.();
      }
    }
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
            this.callbacks.onPlayerDamaged?.(actualDmg);
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

      // Check Decoy hit by wavefront
      if (this.activeDecoy?.active) {
        const distDecoy = Math.hypot(this.activeDecoy.position.x - sw.center.x, this.activeDecoy.position.z - sw.center.z);
        if (Math.abs(distDecoy - sw.currentRadius) <= 1.5) {
          this.callbacks.onDecoyHit?.();
        }
      }

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
                  this.callbacks.onPlayerDamaged?.(actualDmg);
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

  private isPointInTelegraphZone(tel: ActiveTelegraph, point: THREE.Vector3): boolean {
    const pX = point.x;
    const pZ = point.z;

    if (tel.type === 'circle') {
      return Math.hypot(pX - tel.center.x, pZ - tel.center.z) <= (tel.radius || 5.0);
    }
    if (tel.type === 'cone' && tel.direction) {
      const toPt = this._scratchV1.set(pX - tel.center.x, 0, pZ - tel.center.z);
      const dist = toPt.length();
      if (dist <= (tel.radius || 12)) {
        if (dist < 0.001) return true;
        toPt.divideScalar(dist);
        const angleBetween = Math.acos(Math.max(-1, Math.min(1, toPt.dot(tel.direction))));
        return angleBetween <= (tel.coneAngle || Math.PI / 3) / 2;
      }
      return false;
    }
    if (tel.type === 'line' && tel.direction) {
      const toPt = this._scratchV1.set(pX - tel.center.x, 0, pZ - tel.center.z);
      const projDist = toPt.dot(tel.direction);
      if (projDist >= 0 && projDist <= (tel.length || 18)) {
        const perp = this._scratchV2.copy(toPt).addScaledVector(tel.direction, -projDist);
        return perp.length() <= (tel.width || 4) / 2;
      }
    }
    return false;
  }

  private executeTelegraphAttack(
    tel: ActiveTelegraph,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isPlayerDashing: boolean
  ) {
    const isInsideDangerZone = this.isPointInTelegraphZone(tel, playerPos);

    // Check if an active Shadow Decoy is inside the danger zone and absorb the hit
    if (this.activeDecoy?.active && this.isPointInTelegraphZone(tel, this.activeDecoy.position)) {
      this.callbacks.onDecoyHit?.();
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
      // Hormati Stealth: jika pemain bersembunyi setelah telegraph dikunci, tembak tetap menuju koordinat kunci lama (tel.center) atau Decoy
      const boulderTarget =
        this.activeDecoy?.active && (this.isPlayerStealthed || this.activeDecoy.position.distanceTo(tel.center) < playerPos.distanceTo(tel.center))
          ? this.activeDecoy.position.clone()
          : this.isPlayerStealthed
            ? tel.center.clone()
            : playerPos.clone();
      this.callbacks.onSpawnBoulderProjectile?.(
        tel.center.clone().add(new THREE.Vector3(0, 3.5, 0)),
        boulderTarget,
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
      const fbTarget =
        this.activeDecoy?.active && (this.isPlayerStealthed || this.activeDecoy.position.distanceTo(tel.center) < playerPos.distanceTo(tel.center))
          ? this.activeDecoy.position.clone()
          : this.isPlayerStealthed
            ? tel.center.clone()
            : playerPos.clone();
      // Spawn 2 magma fireballs towards locked coordinate / target
      this.callbacks.onSpawnFireballProjectile?.(
        tel.center.clone().add(new THREE.Vector3(-1.5, 3.5, 0)),
        fbTarget.clone(),
        tel.skill.damage
      );
      setTimeout(() => {
        this.callbacks.onSpawnFireballProjectile?.(
          tel.center.clone().add(new THREE.Vector3(1.5, 3.5, 0)),
          fbTarget.clone(),
          tel.skill.damage
        );
      }, 150);
      this.bossStates.set(tel.bossId, 'recovery');
      this.stateTimers.set(tel.bossId, 0);
      return;
    } else if (tel.skill.id === 'flame_breath' || tel.skill.id === 'fire_breath') {
      soundManager.playDragonFireBreath();
      this.callbacks.onCameraShake(0.5);
    } else if (tel.skill.id === 'tail_swipe') {
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
          this.callbacks.onPlayerDamaged?.(finalDmg);
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
              this.callbacks.onPlayerDamaged?.(burnDmg);
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

  // =========================================================================
  // Jarrus Pre-Allocated Object Pools, Spine Kinematics & Agile Combat AI
  // Zero Runtime Allocations & Zero Runtime PointLights
  // =========================================================================

  private markAllNoCull(obj: THREE.Object3D) {
    obj.traverse((child) => {
      child.frustumCulled = false;
    });
  }

  private initJarrusPools() {
    this.jarrusSpineHistory = [];
    for (let i = 0; i < this.WORM_HISTORY_CAP; i++) {
      this.jarrusSpineHistory.push({
        pos: new THREE.Vector3(-840, 0.5, -260 - i * 0.45),
        quat: new THREE.Quaternion(),
      });
    }
    this.jarrusSpineHeadIdx = 0;
    this.jarrusSpineCount = this.WORM_HISTORY_CAP;

    // 1. Pooled Instanced Sand Dust & Debris Particles (72 instances)
    const pGeo = new THREE.DodecahedronGeometry(0.42, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xd9a05b,
      roughness: 0.92,
      flatShading: true,
    });
    const instMesh = new THREE.InstancedMesh(pGeo, pMat, this.SAND_PARTICLE_CAP);
    instMesh.frustumCulled = false;
    instMesh.castShadow = false;
    instMesh.receiveShadow = false;
    this.sandParticles = [];
    this._wormPartDummy.scale.set(0, 0, 0);
    this._wormPartDummy.position.set(0, -999, 0);
    this._wormPartDummy.updateMatrix();
    for (let i = 0; i < this.SAND_PARTICLE_CAP; i++) {
      this.sandParticles.push({
        active: false,
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        baseScale: 1,
        rotY: 0,
        rotX: 0,
      });
      instMesh.setMatrixAt(i, this._wormPartDummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(instMesh);
    this.sandParticleMesh = instMesh;

    // 2. Pooled Moving Sand Mound & Wake Ripples
    const moundGeo = new THREE.SphereGeometry(2.35, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    moundGeo.scale(1.1, 0.48, 1.35);
    const moundMat = new THREE.MeshStandardMaterial({
      color: 0xc28e5c,
      roughness: 0.96,
      flatShading: true,
    });
    const rippleGeo = new THREE.RingGeometry(2.2, 2.75, 22);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xe6be8a,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.sandMoundPool = [];
    for (let m = 0; m < 3; m++) {
      const group = new THREE.Group();
      const dome = new THREE.Mesh(moundGeo, moundMat);
      group.add(dome);
      const rings: THREE.Mesh[] = [];
      for (let r = 0; r < 2; r++) {
        const ring = new THREE.Mesh(rippleGeo, rippleMat);
        ring.position.y = 0.06 + r * 0.02;
        group.add(ring);
        rings.push(ring);
      }
      group.visible = false;
      this.markAllNoCull(group);
      this.scene.add(group);
      this.sandMoundPool.push({ group, rings, active: false, timer: 0 });
    }

    // 3. Pooled Jagged Sandstone Spikes + Individual Warning Rings (8 slots)
    const spikeGeo = new THREE.ConeGeometry(0.68, 4.1, 6);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xc49a6c,
      roughness: 0.88,
      flatShading: true,
    });
    const spikeWarnGeo = new THREE.RingGeometry(1.7, 2.15, 20);
    spikeWarnGeo.rotateX(-Math.PI / 2);
    this.sandSpikePool = [];
    for (let s = 0; s < 8; s++) {
      const spikeMesh = new THREE.Mesh(spikeGeo, spikeMat);
      spikeMesh.visible = false;
      spikeMesh.castShadow = true;
      spikeMesh.frustumCulled = false;
      this.scene.add(spikeMesh);

      const warningMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const warningMesh = new THREE.Mesh(spikeWarnGeo, warningMat);
      warningMesh.visible = false;
      warningMesh.frustumCulled = false;
      this.scene.add(warningMesh);

      this.sandSpikePool.push({
        active: false,
        phase: 'warning',
        x: 0,
        z: 0,
        groundY: 0.5,
        timer: 0,
        delay: 0,
        warningDuration: 0.8,
        hitChecked: false,
        spikeMesh,
        warningMesh,
        warningMat,
      });
    }

    // 4. Pre-Allocated Action Telegraphs (Takeoff, Landing, Line Slam, Tail Cone)
    const makeRingTel = (radius: number, borderColor: number, fillColor: number) => {
      const g = new THREE.Group();
      const bMat = new THREE.MeshBasicMaterial({
        color: borderColor,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const border = new THREE.Mesh(new THREE.RingGeometry(radius * 0.9, radius, 32), bMat);
      border.rotation.x = -Math.PI / 2;
      g.add(border);

      const innerMat = new THREE.MeshBasicMaterial({
        color: fillColor,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const inner = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), innerMat);
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.01;
      g.add(inner);

      g.visible = false;
      this.markAllNoCull(g);
      this.scene.add(g);
      return { group: g, inner, innerMat };
    };
    this.jarrusTakeoffRing = makeRingTel(4.2, 0xf59e0b, 0xf97316);
    this.jarrusLandingRing = makeRingTel(5.5, 0xef4444, 0xff3d00);

    // Line slam telegraph (length 26, width 5.4)
    {
      const g = new THREE.Group();
      const len = 26.0;
      const w = 5.4;
      const border = new THREE.Mesh(
        new THREE.PlaneGeometry(w, len),
        new THREE.MeshBasicMaterial({
          color: 0xff1744,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      border.rotation.x = -Math.PI / 2;
      border.position.set(0, 0.02, len * 0.5);
      g.add(border);

      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xff5722,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, len), fillMat);
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(0, 0.04, len * 0.5);
      g.add(fill);

      g.visible = false;
      this.markAllNoCull(g);
      this.scene.add(g);
      this.jarrusSlamLineGroup = { group: g, fill, fillMat };
    }

    // Tail whip 250-deg cone telegraph (radius 11.5)
    {
      const arcRad = (250 * Math.PI) / 180;
      const rMax = 11.5;
      const g = new THREE.Group();
      const border = new THREE.Mesh(
        new THREE.RingGeometry(rMax * 0.92, rMax, 32, 1, -arcRad * 0.5, arcRad),
        new THREE.MeshBasicMaterial({
          color: 0xff3d00,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      border.rotation.x = -Math.PI / 2;
      border.rotation.z = -Math.PI / 2;
      g.add(border);

      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xff9100,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fill = new THREE.Mesh(
        new THREE.RingGeometry(0.8, rMax, 32, 1, -arcRad * 0.5, arcRad),
        fillMat
      );
      fill.rotation.x = -Math.PI / 2;
      fill.rotation.z = -Math.PI / 2;
      fill.position.y = 0.02;
      g.add(fill);

      g.visible = false;
      this.markAllNoCull(g);
      this.scene.add(g);
      this.jarrusTailConeGroup = { group: g, fill, fillMat };
    }

    // 5. Quicksand Vortex Funnel Visual Group (Radius 38 outer, Radius 8 core)
    {
      const g = new THREE.Group();
      const swirlRings: THREE.Mesh[] = [];
      const ringSpecs = [
        { inR: 36.8, outR: 38.0, color: 0xf59e0b, op: 0.72 },
        { inR: 25.5, outR: 28.0, color: 0xd97706, op: 0.55 },
        { inR: 16.0, outR: 19.0, color: 0xfb923c, op: 0.65 },
        { inR: 7.4, outR: 8.6, color: 0xef4444, op: 0.82 },
        { inR: 1.5, outR: 5.5, color: 0xfde047, op: 0.65 },
      ];
      for (const spec of ringSpecs) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(spec.inR, spec.outR, 44, 1, 0, spec.inR > 35 ? Math.PI * 2 : Math.PI * 1.65),
          new THREE.MeshBasicMaterial({
            color: spec.color,
            transparent: true,
            opacity: spec.op,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08 + swirlRings.length * 0.04;
        g.add(ring);
        swirlRings.push(ring);
      }
      g.visible = false;
      this.markAllNoCull(g);
      this.scene.add(g);
      this.jarrusVortexGroup = { group: g, swirlRings };
    }

    // 6. Sand Bomb Intense +0.5s Warning + Towering Eruption Pillar (Radius 36)
    {
      const g = new THREE.Group();
      const warningRingMat = new THREE.MeshBasicMaterial({
        color: 0xff2a00,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const warningRing = new THREE.Mesh(new THREE.RingGeometry(34.2, 36.0, 48), warningRingMat);
      warningRing.rotation.x = -Math.PI / 2;
      warningRing.position.y = 0.12;
      warningRing.visible = false;
      g.add(warningRing);

      const warningFillMat = new THREE.MeshBasicMaterial({
        color: 0xff6d00,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const warningFill = new THREE.Mesh(new THREE.CircleGeometry(36.0, 48), warningFillMat);
      warningFill.rotation.x = -Math.PI / 2;
      warningFill.position.y = 0.06;
      warningFill.visible = false;
      g.add(warningFill);

      const pillarMat = new THREE.MeshBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pillarMesh = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 7.6, 34.0, 18, 1, true), pillarMat);
      pillarMesh.position.y = 17.0;
      pillarMesh.visible = false;
      g.add(pillarMesh);

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 4.0, 34.0, 14, 1, true), coreMat);
      coreMesh.position.y = 17.0;
      coreMesh.visible = false;
      g.add(coreMesh);

      const shockwaveMat = new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(0.84, 1.0, 44), shockwaveMat);
      shockwaveRing.rotation.x = -Math.PI / 2;
      shockwaveRing.position.y = 0.25;
      shockwaveRing.visible = false;
      g.add(shockwaveRing);

      g.visible = false;
      this.markAllNoCull(g);
      this.scene.add(g);
      this.jarrusSandBombGroup = {
        group: g,
        warningRing,
        warningRingMat,
        warningFill,
        warningFillMat,
        pillarMesh,
        pillarMat,
        coreMesh,
        coreMat,
        shockwaveRing,
        shockwaveMat,
        blastActive: false,
        blastTimer: 0,
      };
    }
  }

  private spawnSandBurst(center: THREE.Vector3, count: number, speedScale: number) {
    if (!this.sandParticleMesh) return;
    for (let c = 0; c < count; c++) {
      const slot = this.sandParticles[this.sandParticleCursor];
      this.sandParticleCursor = (this.sandParticleCursor + 1) % this.SAND_PARTICLE_CAP;
      const angle = Math.random() * Math.PI * 2;
      const hSpeed = (0.35 + Math.random() * 0.85) * speedScale;
      slot.active = true;
      slot.pos.set(
        center.x + (Math.random() - 0.5) * 2.2,
        Math.max(this.getTerrainHeight(center.x, center.z) + 0.15, center.y),
        center.z + (Math.random() - 0.5) * 2.2
      );
      slot.vel.set(
        Math.cos(angle) * hSpeed,
        (0.55 + Math.random() * 0.85) * speedScale,
        Math.sin(angle) * hSpeed
      );
      slot.life = 0;
      slot.maxLife = 0.55 + Math.random() * 0.45;
      slot.baseScale = 0.7 + Math.random() * 1.1;
      slot.rotY = Math.random() * Math.PI * 2;
      slot.rotX = Math.random() * Math.PI;
    }
  }

  private updateJarrusPools(
    delta: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isPlayerDashing: boolean
  ) {
    // 1. Update Instanced Sand Particles
    if (this.sandParticleMesh) {
      let dirty = false;
      for (let i = 0; i < this.SAND_PARTICLE_CAP; i++) {
        const p = this.sandParticles[i];
        if (!p.active) continue;
        dirty = true;
        p.life += delta;
        if (p.life >= p.maxLife) {
          p.active = false;
          this._wormPartDummy.scale.set(0, 0, 0);
          this._wormPartDummy.position.set(0, -999, 0);
          this._wormPartDummy.updateMatrix();
          this.sandParticleMesh.setMatrixAt(i, this._wormPartDummy.matrix);
          continue;
        }
        p.vel.y -= 22.0 * delta;
        p.pos.addScaledVector(p.vel, delta);
        const t = p.life / p.maxLife;
        const sc = p.baseScale * Math.sin((1 - t * 0.7) * Math.PI * 0.5) * (1 - t);
        this._wormPartDummy.position.copy(p.pos);
        this._wormPartDummy.rotation.set(p.rotX + p.life * 4, p.rotY + p.life * 5, 0);
        this._wormPartDummy.scale.set(sc, sc, sc);
        this._wormPartDummy.updateMatrix();
        this.sandParticleMesh.setMatrixAt(i, this._wormPartDummy.matrix);
      }
      if (dirty) {
        this.sandParticleMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 2. Update Active Sand Mounds (wake ripples)
    for (let m = 0; m < this.sandMoundPool.length; m++) {
      const mound = this.sandMoundPool[m];
      if (!mound.active) {
        if (mound.group.visible) mound.group.visible = false;
        continue;
      }
      mound.timer += delta;
      mound.group.visible = true;
      for (let r = 0; r < mound.rings.length; r++) {
        const phase = (mound.timer * 1.9 + r * 0.5) % 1.0;
        const s = 0.75 + phase * 1.1;
        mound.rings[r].scale.set(s, s, 1);
      }
      mound.active = false; // Must be refreshed every frame while swimming
    }

    // 3. Update Pooled Sand Spikes (Sand Spike Barrage)
    for (let i = 0; i < this.sandSpikePool.length; i++) {
      const sp = this.sandSpikePool[i];
      if (!sp.active) continue;
      sp.timer += delta;

      if (sp.phase === 'warning') {
        const warnAt = sp.delay;
        if (sp.timer >= warnAt) {
          sp.warningMesh.visible = true;
          const u = Math.min(1, (sp.timer - warnAt) / sp.warningDuration);
          sp.warningMesh.scale.setScalar(0.55 + u * 0.45);
          sp.warningMat.opacity = 0.45 + Math.sin(sp.timer * 20) * 0.35;
        }
        if (sp.timer >= sp.delay + sp.warningDuration) {
          sp.phase = 'emerging';
          sp.timer = 0;
          sp.warningMesh.visible = false;
          sp.spikeMesh.visible = true;
          sp.spikeMesh.position.set(sp.x, sp.groundY - 2.1, sp.z);
          soundManager.playHit();
          this._wormScratchPos.set(sp.x, sp.groundY + 0.3, sp.z);
          this.spawnSandBurst(this._wormScratchPos, 6, 4.5);

          if (!sp.hitChecked) {
            sp.hitChecked = true;
            if (
              this.activeDecoy?.active &&
              Math.hypot(this.activeDecoy.position.x - sp.x, this.activeDecoy.position.z - sp.z) <= 2.4
            ) {
              this.callbacks.onDecoyHit?.();
            }
            const pDist = Math.hypot(playerPos.x - sp.x, playerPos.z - sp.z);
            if (pDist <= 2.35) {
              this.applyJarrusDamage(
                32,
                'Hujan Duri Pasir',
                'slow',
                2.5,
                this._wormScratchPos,
                playerPos,
                playerVel,
                isPlayerDashing
              );
            }
          }
        }
      } else if (sp.phase === 'emerging') {
        const u = Math.min(1, sp.timer / 0.14);
        sp.spikeMesh.position.y = sp.groundY - 2.1 + u * 3.85;
        if (u >= 1) {
          sp.phase = 'active';
          sp.timer = 0;
        }
      } else if (sp.phase === 'active') {
        if (sp.timer >= 1.55) {
          sp.phase = 'retracting';
          sp.timer = 0;
        }
      } else if (sp.phase === 'retracting') {
        const u = Math.min(1, sp.timer / 0.35);
        sp.spikeMesh.position.y = sp.groundY + 1.75 - u * 4.1;
        if (u >= 1) {
          sp.active = false;
          sp.spikeMesh.visible = false;
          sp.warningMesh.visible = false;
        }
      }
    }

    // 4. Update Sand Bomb Eruption Pillar & Shockwave
    const bomb = this.jarrusSandBombGroup;
    if (bomb && bomb.blastActive) {
      bomb.blastTimer += delta;
      const u = Math.min(1, bomb.blastTimer / 1.35);
      bomb.group.visible = true;
      bomb.pillarMesh.visible = true;
      bomb.coreMesh.visible = true;
      bomb.shockwaveRing.visible = true;

      const radScale = 1.0 + u * 0.9;
      bomb.pillarMesh.scale.set(radScale, 0.55 + Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5) * 0.65, radScale);
      bomb.pillarMat.opacity = Math.max(0, 0.85 * (1 - u));
      bomb.coreMesh.scale.set(1.0 + u * 0.5, bomb.pillarMesh.scale.y, 1.0 + u * 0.5);
      bomb.coreMat.opacity = Math.max(0, 0.92 * (1 - u * 1.15));

      const swR = 4.0 + u * 32.0; // expands right out to radius 36
      bomb.shockwaveRing.scale.set(swR, swR, 1);
      bomb.shockwaveMat.opacity = Math.max(0, 0.9 * (1 - u));

      if (u >= 1) {
        bomb.blastActive = false;
        bomb.pillarMesh.visible = false;
        bomb.coreMesh.visible = false;
        bomb.shockwaveRing.visible = false;
        bomb.group.visible = false;
      }
    }
  }

  private applyJarrusDamage(
    rawDamage: number,
    skillLabel: string,
    effect: BossSkill['effect'] | 'none',
    effectDuration: number,
    originPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    isPlayerDashing: boolean,
    knockbackForce = 16.0
  ) {
    if (isPlayerDashing) {
      this.callbacks.onAddFloatingText('DODGE / TERHINDAR!', '#00e5ff', 'info');
      return;
    }

    if (!this.devGodMode && rawDamage > 0) {
      this.callbacks.onUpdateStats((stats) => {
        let finalDmg = Math.max(5, rawDamage - Math.round(stats.baseDefense * 0.5));
        if (this.callbacks.onDamageAbsorb) {
          finalDmg = this.callbacks.onDamageAbsorb(finalDmg);
        }
        const nextHp = Math.max(0, stats.hp - finalDmg);
        if (finalDmg > 0) {
          this.callbacks.onAddFloatingText(`-${finalDmg} HP (${skillLabel})`, '#ff1744', 'damage');
          this.callbacks.onPlayerDamaged?.(finalDmg);
        }
        if (nextHp <= 0) {
          this.callbacks.onPlayerDeath?.();
        }
        return { ...stats, hp: nextHp };
      });
    } else if (this.devGodMode && rawDamage > 0) {
      this.callbacks.onAddFloatingText('🛡️ KEBAL (GOD MODE)!', '#38bdf8', 'info');
    }

    if (effect === 'stun') {
      this.applyStun(effectDuration, playerVel);
    } else if (effect === 'knockback') {
      this.applyKnockback(originPos, playerPos, playerVel, knockbackForce);
    } else if (effect === 'knockup') {
      this.applyKnockup(originPos, playerPos, playerVel);
    } else if (effect === 'slow') {
      this.applySlow(effectDuration);
    }
  }

  private hideJarrusTelegraphs() {
    if (this.jarrusTakeoffRing) this.jarrusTakeoffRing.group.visible = false;
    if (this.jarrusLandingRing) this.jarrusLandingRing.group.visible = false;
    if (this.jarrusSlamLineGroup) this.jarrusSlamLineGroup.group.visible = false;
    if (this.jarrusTailConeGroup) this.jarrusTailConeGroup.group.visible = false;
    if (this.jarrusVortexGroup) this.jarrusVortexGroup.group.visible = false;
    if (this.jarrusSandBombGroup) {
      this.jarrusSandBombGroup.warningRing.visible = false;
      this.jarrusSandBombGroup.warningFill.visible = false;
      if (!this.jarrusSandBombGroup.blastActive) {
        this.jarrusSandBombGroup.group.visible = false;
      }
    }
  }

  private computeParallelQuat(dir: THREE.Vector3, outQuat: THREE.Quaternion) {
    this._wormCurDir.copy(dir);
    if (this._wormCurDir.lengthSq() < 1e-6) {
      this._wormCurDir.set(0, 0, 1);
    } else {
      this._wormCurDir.normalize();
    }

    // Parallel-transport previous Up orthogonal to tangent to eliminate zenith gimbal flip
    const dot = this._wormPrevUp.dot(this._wormCurDir);
    this._wormUp.copy(this._wormPrevUp).addScaledVector(this._wormCurDir, -dot);
    if (this._wormUp.lengthSq() < 0.0025) {
      // Degenerate only if initializing strictly straight up/down
      if (Math.hypot(this._wormCurDir.x, this._wormCurDir.z) > 0.05) {
        this._wormUp.set(-this._wormCurDir.z, 0, this._wormCurDir.x).normalize();
      } else {
        this._wormUp.set(0, 0, 1);
      }
    } else {
      this._wormUp.normalize();
    }

    this._wormRight.crossVectors(this._wormUp, this._wormCurDir).normalize();
    this._wormUp.crossVectors(this._wormCurDir, this._wormRight).normalize();
    this._wormPrevUp.copy(this._wormUp);

    this._wormRotMat.makeBasis(this._wormRight, this._wormUp, this._wormCurDir);
    outQuat.setFromRotationMatrix(this._wormRotMat);
  }

  private seedJarrusSpine(headPos: THREE.Vector3, forwardDir: THREE.Vector3) {
    this._wormPrevUp.set(0, 1, 0);
    this.computeParallelQuat(forwardDir, this._wormQuat);
    const backDir = this._wormCurDir;
    for (let i = 0; i < this.WORM_HISTORY_CAP; i++) {
      this.jarrusSpineHistory[i].pos.set(
        headPos.x - backDir.x * (i * this.WORM_SAMPLE_STEP),
        headPos.y - backDir.y * (i * this.WORM_SAMPLE_STEP),
        headPos.z - backDir.z * (i * this.WORM_SAMPLE_STEP)
      );
      this.jarrusSpineHistory[i].quat.copy(this._wormQuat);
    }
    this.jarrusSpineHeadIdx = 0;
    this.jarrusSpineCount = this.WORM_HISTORY_CAP;
  }

  private applyJarrusSpineFromHistory(
    enemy: { mesh: THREE.Group; parts: Record<string, any> },
    delta: number,
    headPos: THREE.Vector3,
    forwardDir: THREE.Vector3,
    serpentWiggle = 1.0
  ) {
    this.computeParallelQuat(forwardDir, this._wormQuat);
    if (enemy.mesh.rotation.x !== 0 || enemy.mesh.rotation.y !== 0 || enemy.mesh.rotation.z !== 0) {
      enemy.mesh.rotation.set(0, 0, 0);
    }

    if (this.jarrusSpineCount === 0) {
      this.seedJarrusSpine(headPos, forwardDir);
    }

    // Push intermediate ring-buffer points along path if head moved >= step (jump-proof)
    const curHeadSample = this.jarrusSpineHistory[this.jarrusSpineHeadIdx];
    const distFromLast = curHeadSample.pos.distanceTo(headPos);
    if (distFromLast > 18.0) {
      this.seedJarrusSpine(headPos, forwardDir);
    } else if (distFromLast >= this.WORM_SAMPLE_STEP) {
      const subSteps = Math.min(8, Math.floor(distFromLast / this.WORM_SAMPLE_STEP));
      const startPos = curHeadSample.pos.clone();
      const startQuat = curHeadSample.quat.clone();
      for (let st = 1; st <= subSteps; st++) {
        const u = st / subSteps;
        this.jarrusSpineHeadIdx = (this.jarrusSpineHeadIdx - 1 + this.WORM_HISTORY_CAP) % this.WORM_HISTORY_CAP;
        const entry = this.jarrusSpineHistory[this.jarrusSpineHeadIdx];
        entry.pos.lerpVectors(startPos, headPos, u);
        entry.quat.slerpQuaternions(startQuat, this._wormQuat, u);
      }
    } else {
      curHeadSample.pos.copy(headPos);
      curHeadSample.quat.copy(this._wormQuat);
    }

    // Walk backward through history for Follow-the-Leader segment_0..9
    let prevPos = headPos;
    let prevQuat = this._wormQuat;
    let accum = 0;
    let histCursor = 0;
    let segIdx = 0;

    while (segIdx < this.WORM_SEG_COUNT && histCursor < this.WORM_HISTORY_CAP - 1) {
      const targetArc = segIdx * this.WORM_SEG_SPACING;
      if (targetArc <= accum + 0.0001) {
        const seg = enemy.parts?.[`segment_${segIdx}`];
        if (seg) {
          seg.position.set(prevPos.x - headPos.x, prevPos.y - headPos.y, prevPos.z - headPos.z);
          seg.quaternion.copy(prevQuat);
        }
        segIdx++;
        continue;
      }

      histCursor++;
      const idx = (this.jarrusSpineHeadIdx + histCursor) % this.WORM_HISTORY_CAP;
      const sample = this.jarrusSpineHistory[idx];
      const stepDist = prevPos.distanceTo(sample.pos);
      if (stepDist > 0.0001) {
        while (segIdx < this.WORM_SEG_COUNT && accum + stepDist >= segIdx * this.WORM_SEG_SPACING) {
          const needed = segIdx * this.WORM_SEG_SPACING;
          const alpha = Math.max(0, Math.min(1, (needed - accum) / stepDist));
          this._wormScratchPos.lerpVectors(prevPos, sample.pos, alpha);
          this._wormScratchQuat.slerpQuaternions(prevQuat, sample.quat, alpha);

          // Gentle sinusoidal lateral swim wave
          if (serpentWiggle > 0 && segIdx > 0) {
            const sideAmp = Math.sin(this.elapsedTime * 5.2 - segIdx * 0.65) * 0.28 * serpentWiggle;
            this._wormRight.set(1, 0, 0).applyQuaternion(this._wormScratchQuat);
            this._wormScratchPos.addScaledVector(this._wormRight, sideAmp);
          }

          const seg = enemy.parts?.[`segment_${segIdx}`];
          if (seg) {
            seg.position.set(
              this._wormScratchPos.x - headPos.x,
              this._wormScratchPos.y - headPos.y,
              this._wormScratchPos.z - headPos.z
            );
            seg.quaternion.copy(this._wormScratchQuat);
          }
          segIdx++;
        }
        accum += stepDist;
      }
      prevPos = sample.pos;
      prevQuat = sample.quat;
    }

    if (enemy.parts?.teeth) {
      enemy.parts.teeth.rotation.z += delta * 2.8;
    }
  }

  public resetJarrusState(enemy?: {
    data: EnemyData;
    mesh: THREE.Group;
    parts: Record<string, any>;
    spawnPos?: THREE.Vector3;
  }) {
    const zone = BOSS_ARENA_ZONES.boss_jarrus;
    const cx = zone?.center.x ?? -840;
    const cz = zone?.center.z ?? -260;
    const gy = this.getTerrainHeight(cx, cz);

    this.hideJarrusTelegraphs();
    for (let i = 0; i < this.sandSpikePool.length; i++) {
      this.sandSpikePool[i].active = false;
      this.sandSpikePool[i].spikeMesh.visible = false;
      this.sandSpikePool[i].warningMesh.visible = false;
    }
    for (let m = 0; m < this.sandMoundPool.length; m++) {
      this.sandMoundPool[m].active = false;
      this.sandMoundPool[m].group.visible = false;
    }
    this.jarrusAction.mode = 'swim';
    this.jarrusAction.timer = 0;
    this.jarrusAction.breachChainRemaining = 0;
    this.jarrusAction.hitApplied = false;
    this.jarrusAction.suctionTickTimer = 0;
    this.bossStates.set('boss_jarrus', 'idle');

    if (enemy?.mesh) {
      enemy.mesh.rotation.set(0, 0, 0);
      enemy.mesh.position.set(cx, gy - 1.1, cz);
      this._wormCurDir.set(0, 0, 1);
      this.seedJarrusSpine(enemy.mesh.position, this._wormCurDir);
      this.applyJarrusSpineFromHistory(enemy, 0.016, enemy.mesh.position, this._wormCurDir, 0);
    }
  }

  public updateJarrusStandby(
    enemy: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
    },
    delta: number,
    distToPlayer: number
  ) {
    this.hideJarrusTelegraphs();
    if (enemy.data.isDead || enemy.data.hp <= 0) return;

    const zone = BOSS_ARENA_ZONES.boss_jarrus;
    const cx = zone?.center.x ?? -840;
    const cz = zone?.center.z ?? -260;

    // Smooth figure-8 patrol under Solaria crater dunes + periodic 2s cautious head peek
    this.jarrusStandbyTime += delta;
    const omega = 0.28;
    const t = this.jarrusStandbyTime * omega;
    const targetX = cx + Math.sin(t) * 22.0;
    const targetZ = cz + Math.sin(t * 2.0) * 14.0;
    const gy = this.getTerrainHeight(targetX, targetZ);

    const peekCycle = this.jarrusStandbyTime % 11.0;
    let targetY = gy - 1.2 + Math.sin(this.jarrusStandbyTime * 2.2) * 0.45;
    if (peekCycle < 2.0) {
      const peekU = peekCycle / 2.0;
      targetY += Math.sin(peekU * Math.PI) * 2.85; // Rises cautiously up to groundY + 1.65!
    }

    const ePos = enemy.mesh.position;
    const prevX = ePos.x;
    const prevY = ePos.y;
    const prevZ = ePos.z;
    const toX = targetX - prevX;
    const toZ = targetZ - prevZ;
    const distXZ = Math.hypot(toX, toZ);
    if (distXZ > 14.0) {
      // Smooth swim back to standby patrol curve if previously fighting elsewhere
      const step = Math.min(distXZ, 14.0 * delta);
      ePos.x += (toX / distXZ) * step;
      ePos.z += (toZ / distXZ) * step;
      const curGY = this.getTerrainHeight(ePos.x, ePos.z);
      ePos.y = THREE.MathUtils.lerp(prevY, curGY - 1.15, Math.min(1, delta * 5.0));
    } else {
      ePos.set(targetX, targetY, targetZ);
    }

    this._wormCurDir.set(ePos.x - prevX, ePos.y - prevY, ePos.z - prevZ);
    if (this._wormCurDir.lengthSq() < 1e-6) {
      this._wormCurDir.set(Math.cos(t) * 22.0, 0, Math.cos(t * 2.0) * 28.0);
    }
    this._wormCurDir.normalize();

    this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 1.0);

    // Pooled sand mound + wake dust when player is close enough to witness the Submerged Sand Stalker
    if (distToPlayer < 105.0 && this.sandMoundPool.length > 0) {
      const mound = this.sandMoundPool[0];
      const groundH = this.getTerrainHeight(ePos.x, ePos.z);
      mound.group.position.set(ePos.x, groundH + 0.05, ePos.z);
      mound.group.rotation.y = Math.atan2(this._wormCurDir.x, this._wormCurDir.z);
      mound.active = true;

      this.jarrusSandDustTimer += delta;
      if (this.jarrusSandDustTimer >= 0.16) {
        this.jarrusSandDustTimer = 0;
        this._wormScratchPos.set(ePos.x, groundH + 0.25, ePos.z);
        this.spawnSandBurst(this._wormScratchPos, 2, 2.8);
      }
    }
  }

  public updateJarrusReturnToCenter(
    enemy: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
    },
    delta: number
  ) {
    this.hideJarrusTelegraphs();
    const zone = BOSS_ARENA_ZONES.boss_jarrus;
    const cx = zone?.center.x ?? -840;
    const cz = zone?.center.z ?? -260;
    const ePos = enemy.mesh.position;
    const dx = cx - ePos.x;
    const dz = cz - ePos.z;
    const d = Math.hypot(dx, dz);
    if (d > 1.5) {
      const move = Math.min(d, 15.0 * delta);
      const nx = dx / d;
      const nz = dz / d;
      ePos.x += nx * move;
      ePos.z += nz * move;
      const gy = this.getTerrainHeight(ePos.x, ePos.z);
      ePos.y = gy - 1.0 + Math.sin(this.elapsedTime * 3.5) * 0.35;
      this._wormCurDir.set(nx, 0, nz);
      this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 1.0);
      if (this.sandMoundPool.length > 0) {
        const mound = this.sandMoundPool[0];
        mound.group.position.set(ePos.x, gy + 0.06, ePos.z);
        mound.group.rotation.y = Math.atan2(nx, nz);
        mound.active = true;
      }
    } else {
      this.updateJarrusStandby(enemy, delta, 0);
    }
  }

  public updateJarrusRemoteSpine(
    enemy: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
    },
    delta: number
  ) {
    if (enemy.data.isDead || enemy.data.hp <= 0) return;
    const yaw = enemy.mesh.rotation.y;
    this._wormCurDir.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    this.applyJarrusSpineFromHistory(enemy, delta, enemy.mesh.position, this._wormCurDir, 0.85);
  }

  private clampPointInsideCrater(pos: THREE.Vector3, maxRadius: number) {
    const zone = BOSS_ARENA_ZONES.boss_jarrus;
    const cx = zone?.center.x ?? -840;
    const cz = zone?.center.z ?? -260;
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d = Math.hypot(dx, dz);
    if (d > maxRadius && d > 0.001) {
      const ratio = maxRadius / d;
      pos.x = cx + dx * ratio;
      pos.z = cz + dz * ratio;
    }
    pos.y = this.getTerrainHeight(pos.x, pos.z);
  }

  private updateJarrusCombat(
    enemy: {
      data: EnemyData;
      mesh: THREE.Group;
      parts: Record<string, any>;
    },
    playerPos: THREE.Vector3,
    delta: number,
    isPlayerDashing: boolean,
    playerVel: THREE.Vector3 | undefined,
    config: BossConfig,
    cdMap: Map<string, number>
  ): boolean {
    const zone = BOSS_ARENA_ZONES.boss_jarrus;
    const cx = zone?.center.x ?? -840;
    const cz = zone?.center.z ?? -260;
    const ePos = enemy.mesh.position;
    const safeVel = playerVel || this._wormScratchPos.set(0, 0, 0);

    const resolvedTarget = resolveEnemyTarget(
      ePos,
      playerPos,
      this.isPlayerStealthed,
      this.activeDecoy
    );
    const aimPos = resolvedTarget.targetPos || playerPos;
    const act = this.jarrusAction;
    act.timer += delta;

    // ---------------------------------------------------------
    // MODE A: AGILE SAND-SWIMMING (14.5 - 16.0 u/s) + SKILL PICKER
    // ---------------------------------------------------------
    if (act.mode === 'swim') {
      this.hideJarrusTelegraphs();

      // Skill check when player/decoy target is visible
      if (resolvedTarget.targetPos) {
        const dist = resolvedTarget.dist;
        const selected = MonsterCombatAI.selectSandwormSkill(
          dist,
          enemy.data.hp,
          enemy.data.maxHp,
          cdMap
        );

        if (selected === 'sand_whirlpool') {
          const skill = config.skills.find((s) => s.id === 'sand_whirlpool')!;
          cdMap.set('sand_whirlpool', skill.cooldown);
          act.mode = 'whirlpool_suction';
          act.timer = 0;
          act.hitApplied = false;
          act.suctionTickTimer = 0;
          act.suctionWarnCooldown = 0;
          act.targetPos.set(cx, this.getTerrainHeight(cx, cz), cz);
          soundManager.playTitanGroundSlam();
          this.callbacks.onAddFloatingText('🌪️ JARRUS MENYELAM! PUSARAN PASIR HISAP RAKSASA!', '#f59e0b', 'crit');
          return true;
        }

        if (selected === 'dolphin_breach') {
          const skill = config.skills.find((s) => s.id === 'dolphin_breach')!;
          cdMap.set('dolphin_breach', skill.cooldown);
          act.mode = 'dolphin_breach';
          act.timer = 0;
          act.hitApplied = false;
          act.breachChainRemaining = enemy.data.hp <= enemy.data.maxHp * 0.5 ? 1 : 0;

          act.startPos.set(ePos.x, this.getTerrainHeight(ePos.x, ePos.z), ePos.z);
          this.clampPointInsideCrater(act.startPos, 56);

          const dx = aimPos.x - act.startPos.x;
          const dz = aimPos.z - act.startPos.z;
          const d = Math.hypot(dx, dz);
          const nx = d > 0.1 ? dx / d : 0;
          const nz = d > 0.1 ? dz / d : 1;
          const leapSpan = Math.min(32.0, Math.max(26.0, d));
          act.targetPos.set(act.startPos.x + nx * leapSpan, 0, act.startPos.z + nz * leapSpan);
          this.clampPointInsideCrater(act.targetPos, 56);

          soundManager.playWormBurrow();
          this.callbacks.onAddFloatingText(
            act.breachChainRemaining > 0
              ? '⚠️ FASE 2: JARRUS MELONCAT BERUNTUN (2x)!'
              : '⚠️ Jarrus Bersiap Meloncat dari Pasir!',
            '#f97316',
            'info'
          );
          return true;
        }

        if (selected === 'towering_body_slam') {
          const skill = config.skills.find((s) => s.id === 'towering_body_slam')!;
          cdMap.set('towering_body_slam', skill.cooldown);
          act.mode = 'towering_slam';
          act.timer = 0;
          act.hitApplied = false;
          act.startPos.set(ePos.x, this.getTerrainHeight(ePos.x, ePos.z), ePos.z);
          this.clampPointInsideCrater(act.startPos, 48);
          const dx = aimPos.x - act.startPos.x;
          const dz = aimPos.z - act.startPos.z;
          const d = Math.hypot(dx, dz) || 1;
          act.dir.set(dx / d, 0, dz / d);
          soundManager.playWormBurstOut();
          this.callbacks.onAddFloatingText('⚠️ JARRUS MENJULANG KE LANGIT — WASPADA HANTAMAN!', '#ef4444', 'crit');
          return true;
        }

        if (selected === 'tail_whip') {
          const skill = config.skills.find((s) => s.id === 'tail_whip')!;
          cdMap.set('tail_whip', skill.cooldown);
          act.mode = 'tail_whip';
          act.timer = 0;
          act.hitApplied = false;
          act.startPos.set(ePos.x, this.getTerrainHeight(ePos.x, ePos.z), ePos.z);
          const dx = aimPos.x - act.startPos.x;
          const dz = aimPos.z - act.startPos.z;
          const d = Math.hypot(dx, dz) || 1;
          act.dir.set(dx / d, 0, dz / d);
          act.anchorYaw = Math.atan2(act.dir.x, act.dir.z);
          soundManager.playWormBurrow();
          this.callbacks.onAddFloatingText('⚠️ Jarrus Memutar Ekor Cambuk Pasir (250°)!', '#f97316', 'info');
          return true;
        }

        if (selected === 'sand_spike_barrage') {
          const skill = config.skills.find((s) => s.id === 'sand_spike_barrage')!;
          cdMap.set('sand_spike_barrage', skill.cooldown);
          act.mode = 'spike_cast';
          act.timer = 0;
          act.startPos.copy(ePos);

          // Arm 6 pre-allocated jagged sandstone spikes around aimPos
          let armed = 0;
          for (let s = 0; s < this.sandSpikePool.length && armed < 6; s++) {
            const slot = this.sandSpikePool[s];
            if (slot.active) continue;
            const ang = (armed / 6) * Math.PI * 2 + Math.random() * 0.45;
            const r = 1.4 + Math.random() * 4.4;
            this._wormScratchPos.set(aimPos.x + Math.cos(ang) * r, 0, aimPos.z + Math.sin(ang) * r);
            this.clampPointInsideCrater(this._wormScratchPos, 56);

            slot.active = true;
            slot.phase = 'warning';
            slot.x = this._wormScratchPos.x;
            slot.z = this._wormScratchPos.z;
            slot.groundY = this._wormScratchPos.y;
            slot.timer = 0;
            slot.delay = armed * 0.1;
            slot.warningDuration = 0.8;
            slot.hitChecked = false;
            slot.warningMesh.position.set(slot.x, slot.groundY + 0.08, slot.z);
            slot.warningMesh.visible = armed === 0;
            armed++;
          }
          soundManager.playWormBurrow();
          this.callbacks.onAddFloatingText('⚠️ DURI PASIR MENUSUK BERUNTUN!', '#f97316', 'info');
          return true;
        }
      }

      // Flanking Sand-Swim movement (14.5 - 16.0 u/s)
      act.flankPhase += delta * 0.9;
      const swimSpeed = enemy.data.hp <= enemy.data.maxHp * 0.5 ? 16.0 : 14.8;
      if (resolvedTarget.targetPos) {
        const toX = aimPos.x - ePos.x;
        const toZ = aimPos.z - ePos.z;
        const d = Math.hypot(toX, toZ) || 1;
        const nx = toX / d;
        const nz = toZ / d;
        // Weave tangentially so movement looks agile & fluid rather than rigid straight line
        const weaveWeight = d > 12 ? 0.48 * Math.sin(act.flankPhase * 1.4) : 0.72 * act.flankSign;
        if (d < 5.5) act.flankSign = Math.sin(act.flankPhase) >= 0 ? 1 : -1;
        this._wormTargetPos.set(nx - nz * weaveWeight, 0, nz + nx * weaveWeight).normalize();
      } else {
        // Stealthed (no Decoy): prowl fast circular patrol inside crater
        const orbitAng = this.elapsedTime * 0.7;
        const ox = cx + Math.cos(orbitAng) * 20.0;
        const oz = cz + Math.sin(orbitAng) * 20.0;
        this._wormTargetPos.set(ox - ePos.x, 0, oz - ePos.z).normalize();
      }

      ePos.x += this._wormTargetPos.x * swimSpeed * delta;
      ePos.z += this._wormTargetPos.z * swimSpeed * delta;
      this._wormScratchPos.copy(ePos);
      this.clampPointInsideCrater(this._wormScratchPos, 60);
      ePos.x = this._wormScratchPos.x;
      ePos.z = this._wormScratchPos.z;
      const gy = this._wormScratchPos.y;
      const prevY = ePos.y;
      ePos.y = gy - 0.95 + Math.sin(this.elapsedTime * 3.8) * 0.42;

      this._wormCurDir.set(this._wormTargetPos.x, (ePos.y - prevY) * 0.25, this._wormTargetPos.z).normalize();
      this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 1.0);

      if (this.sandMoundPool.length > 0) {
        const mound = this.sandMoundPool[0];
        mound.group.position.set(ePos.x, gy + 0.06, ePos.z);
        mound.group.rotation.y = Math.atan2(this._wormCurDir.x, this._wormCurDir.z);
        mound.active = true;
      }
      this.jarrusSandDustTimer += delta;
      if (this.jarrusSandDustTimer >= 0.08) {
        this.jarrusSandDustTimer = 0;
        this._wormScratchPos.set(ePos.x, gy + 0.25, ePos.z);
        this.spawnSandBurst(this._wormScratchPos, 3, 4.2);
      }
      return true;
    }

    // ---------------------------------------------------------
    // MODE B: DOLPHIN SAND-BREACH (0.9s Telegraph + Parabolic Arc 15u + Chain in P2)
    // ---------------------------------------------------------
    if (act.mode === 'dolphin_breach') {
      const takeoffDuration = 0.42;
      const airDuration = 0.90;
      const totalLeap = takeoffDuration + airDuration; // 1.32s

      if (this.jarrusTakeoffRing) {
        this.jarrusTakeoffRing.group.position.set(act.startPos.x, act.startPos.y + 0.09, act.startPos.z);
        this.jarrusTakeoffRing.group.visible = act.timer < takeoffDuration + 0.25;
        this.jarrusTakeoffRing.innerMat.opacity = 0.35 + Math.sin(act.timer * 18) * 0.25;
      }
      if (this.jarrusLandingRing) {
        this.jarrusLandingRing.group.position.set(act.targetPos.x, act.targetPos.y + 0.09, act.targetPos.z);
        this.jarrusLandingRing.group.visible = act.timer < totalLeap;
        const fillU = Math.min(1, act.timer / totalLeap);
        this.jarrusLandingRing.inner.scale.setScalar(0.2 + fillU * 0.8);
        this.jarrusLandingRing.innerMat.opacity = 0.35 + Math.sin(act.timer * 18) * 0.25;
      }

      if (act.timer < takeoffDuration) {
        // Coil underground before bursting out
        const u = act.timer / takeoffDuration;
        ePos.set(
          act.startPos.x,
          act.startPos.y - 1.5 - Math.sin(u * Math.PI * 0.5) * 1.4,
          act.startPos.z
        );
        this._wormCurDir.set(
          act.targetPos.x - act.startPos.x,
          14.0,
          act.targetPos.z - act.startPos.z
        ).normalize();
        this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.2);
        return true;
      }

      if (act.timer - delta < takeoffDuration && act.timer >= takeoffDuration) {
        soundManager.playWormBurstOut();
        this.callbacks.onCameraShake(0.6);
        this.spawnSandBurst(act.startPos, 18, 9.0);
      }

      const u = Math.min(1.0, (act.timer - takeoffDuration) / airDuration);
      const prevX = ePos.x;
      const prevY = ePos.y;
      const prevZ = ePos.z;
      const nx = THREE.MathUtils.lerp(act.startPos.x, act.targetPos.x, u);
      const nz = THREE.MathUtils.lerp(act.startPos.z, act.targetPos.z, u);
      const baseLineY = THREE.MathUtils.lerp(act.startPos.y, act.targetPos.y, u);
      const ny = baseLineY - 0.6 + Math.sin(u * Math.PI) * 15.6; // Apex ~+15u!
      ePos.set(nx, ny, nz);

      this._wormCurDir.set(nx - prevX, ny - prevY, nz - prevZ);
      if (this._wormCurDir.lengthSq() < 1e-6) {
        this._wormCurDir.set(act.targetPos.x - act.startPos.x, 0, act.targetPos.z - act.startPos.z);
      }
      this._wormCurDir.normalize();
      this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.15);

      if (act.timer >= totalLeap && !act.hitApplied) {
        act.hitApplied = true;
        if (this.jarrusTakeoffRing) this.jarrusTakeoffRing.group.visible = false;
        if (this.jarrusLandingRing) this.jarrusLandingRing.group.visible = false;
        soundManager.playWormBurrow();
        this.callbacks.onCameraShake(1.05);
        this.callbacks.onSpawnShockwave?.(act.targetPos, 0xd97706, 6.2, 0.75);
        this.spawnSandBurst(act.targetPos, 22, 10.5);

        if (
          this.activeDecoy?.active &&
          Math.hypot(this.activeDecoy.position.x - act.targetPos.x, this.activeDecoy.position.z - act.targetPos.z) <= 5.6
        ) {
          this.callbacks.onDecoyHit?.();
        }
        const pDist = Math.hypot(playerPos.x - act.targetPos.x, playerPos.z - act.targetPos.z);
        if (pDist <= 5.6) {
          this.applyJarrusDamage(
            55,
            'Lompatan Lumba-Lumba Pasir',
            'knockup',
            0.9,
            act.targetPos,
            playerPos,
            safeVel,
            isPlayerDashing
          );
        }

        // Phase 2 (HP <= 50%): Chain a second Dolphin Sand-Breach!
        if (act.breachChainRemaining > 0 && enemy.data.hp <= enemy.data.maxHp * 0.5) {
          act.breachChainRemaining--;
          act.startPos.copy(act.targetPos);
          const liveTarget = resolveEnemyTarget(ePos, playerPos, this.isPlayerStealthed, this.activeDecoy);
          const nextAim = liveTarget.targetPos || playerPos;
          const dx = nextAim.x - act.startPos.x;
          const dz = nextAim.z - act.startPos.z;
          const d = Math.hypot(dx, dz);
          const dirX = d > 0.1 ? dx / d : 0;
          const dirZ = d > 0.1 ? dz / d : 1;
          const leapSpan = Math.min(32.0, Math.max(26.0, d));
          act.targetPos.set(act.startPos.x + dirX * leapSpan, 0, act.startPos.z + dirZ * leapSpan);
          this.clampPointInsideCrater(act.targetPos, 56);
          act.timer = 0.08;
          act.hitApplied = false;
          return true;
        }

        act.mode = 'swim';
        act.timer = 0;
      }
      return true;
    }

    // ---------------------------------------------------------
    // MODE C: TOWERING COIL & BODY SLAM (1.1s Line -> 14u Slam -> 1.6s Exposed)
    // ---------------------------------------------------------
    if (act.mode === 'towering_slam') {
      const windup = 1.1;
      const slamEnd = 1.34;
      const exposedEnd = 2.95; // ~1.6s exposed window!
      const yaw = Math.atan2(act.dir.x, act.dir.z);

      if (this.jarrusSlamLineGroup) {
        this.jarrusSlamLineGroup.group.visible = act.timer < slamEnd;
        this.jarrusSlamLineGroup.group.position.set(act.startPos.x, act.startPos.y + 0.07, act.startPos.z);
        this.jarrusSlamLineGroup.group.rotation.y = yaw;
        const u = Math.min(1, act.timer / windup);
        this.jarrusSlamLineGroup.fill.scale.set(0.55 + u * 0.45, u, 1);
        this.jarrusSlamLineGroup.fillMat.opacity = 0.35 + Math.sin(act.timer * 18) * 0.25;
      }

      if (act.timer < windup) {
        // Rise skyward to +14u looming over player
        const u = act.timer / windup;
        const ease = 1 - Math.pow(1 - u, 3);
        ePos.set(
          act.startPos.x + act.dir.x * (u * 2.2),
          act.startPos.y + 1.2 + ease * 13.0,
          act.startPos.z + act.dir.z * (u * 2.2)
        );
        this._wormCurDir.set(act.dir.x * (0.25 + u * 0.35), 1.0, act.dir.z * (0.25 + u * 0.35)).normalize();
        this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.1);

        this.jarrusSandDustTimer += delta;
        if (this.jarrusSandDustTimer >= 0.12) {
          this.jarrusSandDustTimer = 0;
          this.spawnSandBurst(act.startPos, 4, 4.5);
        }
        return true;
      }

      if (act.timer < slamEnd) {
        // Sweep colossal head in giant downward slam arc onto path
        const u = (act.timer - windup) / (slamEnd - windup);
        const theta = (1 - u) * (Math.PI * 0.48); // pi/2 -> 0
        const arcR = 16.5;
        const nx = act.startPos.x + act.dir.x * Math.cos(theta) * arcR;
        const nz = act.startPos.z + act.dir.z * Math.cos(theta) * arcR;
        const groundAtN = this.getTerrainHeight(nx, nz);
        const ny = groundAtN + 1.15 + Math.sin(theta) * 14.0;
        const prevX = ePos.x;
        const prevY = ePos.y;
        const prevZ = ePos.z;
        ePos.set(nx, ny, nz);
        this._wormCurDir.set(nx - prevX, ny - prevY, nz - prevZ).normalize();
        this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.05);
        return true;
      }

      if (!act.hitApplied) {
        act.hitApplied = true;
        if (this.jarrusSlamLineGroup) this.jarrusSlamLineGroup.group.visible = false;
        soundManager.playTitanGroundSlam();
        this.callbacks.onCameraShake(1.25);
        const midX = act.startPos.x + act.dir.x * 13.0;
        const midZ = act.startPos.z + act.dir.z * 13.0;
        this._wormScratchPos.set(midX, this.getTerrainHeight(midX, midZ) + 0.3, midZ);
        this.spawnSandBurst(this._wormScratchPos, 24, 9.5);
        this.callbacks.onSpawnShockwave?.(this._wormScratchPos, 0xd97706, 9.0, 0.85);

        const checkLineHit = (pt: THREE.Vector3) => {
          const rx = pt.x - act.startPos.x;
          const rz = pt.z - act.startPos.z;
          const proj = rx * act.dir.x + rz * act.dir.z;
          if (proj < -1.5 || proj > 26.5) return false;
          const perp = Math.abs(rx * act.dir.z - rz * act.dir.x);
          return perp <= 3.1;
        };

        if (this.activeDecoy?.active && checkLineHit(this.activeDecoy.position)) {
          this.callbacks.onDecoyHit?.();
        }
        if (checkLineHit(playerPos)) {
          this.applyJarrusDamage(
            65,
            'Hantaman Tubuh Menjulang',
            'stun',
            0.6,
            act.startPos,
            playerPos,
            safeVel,
            isPlayerDashing,
            18.0
          );
          if (!isPlayerDashing) {
            this.applyKnockback(act.startPos, playerPos, safeVel, 18.0);
          }
        }
      }

      // Exposed vulnerability window (~1.6s resting flat on crater floor!)
      if (act.timer < exposedEnd) {
        const landX = act.startPos.x + act.dir.x * 16.5;
        const landZ = act.startPos.z + act.dir.z * 16.5;
        const gy = this.getTerrainHeight(landX, landZ);
        ePos.set(landX, gy + 1.05 + Math.sin(act.timer * 10) * 0.08, landZ);
        this._wormCurDir.set(act.dir.x, -0.05, act.dir.z).normalize();
        this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.25);
        return true;
      }

      act.mode = 'swim';
      act.timer = 0;
      return true;
    }

    // ---------------------------------------------------------
    // MODE D: SAND-WHIP TAIL THRASH (0.85s Fan 250° Telegraph -> Whip 45 dmg)
    // ---------------------------------------------------------
    if (act.mode === 'tail_whip') {
      const windup = 0.85;
      const swingEnd = 1.18;
      const halfArc = ((250 * Math.PI) / 180) * 0.5;

      if (this.jarrusTailConeGroup) {
        this.jarrusTailConeGroup.group.visible = act.timer < windup;
        this.jarrusTailConeGroup.group.position.set(act.startPos.x, act.startPos.y + 0.08, act.startPos.z);
        this.jarrusTailConeGroup.group.rotation.y = act.anchorYaw;
        const u = Math.min(1, act.timer / windup);
        this.jarrusTailConeGroup.fill.scale.setScalar(0.35 + u * 0.65);
        this.jarrusTailConeGroup.fillMat.opacity = 0.35 + Math.sin(act.timer * 18) * 0.25;
      }

      let sweepYawOffset = -halfArc;
      if (act.timer < windup) {
        const u = act.timer / windup;
        sweepYawOffset = -halfArc * (0.65 + u * 0.35);
      } else {
        const u = Math.min(1, (act.timer - windup) / (swingEnd - windup));
        sweepYawOffset = -halfArc + u * (halfArc * 2.0);
      }

      // Anchor front (segments 0..2) near ground and whip tail (segments 3..9) continuously across 250°
      const gy = this.getTerrainHeight(act.startPos.x, act.startPos.z);
      ePos.set(act.startPos.x, gy + 0.75, act.startPos.z);
      enemy.mesh.rotation.set(0, 0, 0);

      const fx = Math.sin(act.anchorYaw);
      const fz = Math.cos(act.anchorYaw);
      const tailBaseX = -fx * 5.0;
      const tailBaseZ = -fz * 5.0;
      let prevSegX = tailBaseX;
      let prevSegZ = tailBaseZ;

      for (let i = 0; i < this.WORM_SEG_COUNT; i++) {
        const seg = enemy.parts?.[`segment_${i}`];
        if (!seg) continue;
        if (i < 3) {
          const dBack = -i * this.WORM_SEG_SPACING;
          this._wormCurDir.set(fx, 0, fz).normalize();
          this.computeParallelQuat(this._wormCurDir, this._wormQuat);
          seg.position.set(fx * dBack, 0, fz * dBack);
          seg.quaternion.copy(this._wormQuat);
        } else {
          const frac = (i - 2) / 7;
          const segAngle = act.anchorYaw + sweepYawOffset * (0.35 + 0.65 * frac);
          const sweepReach = (i - 2) * 1.75;
          const sx = THREE.MathUtils.lerp(tailBaseX, Math.sin(segAngle) * sweepReach, 0.25 + 0.75 * frac);
          const sz = THREE.MathUtils.lerp(tailBaseZ, Math.cos(segAngle) * sweepReach, 0.25 + 0.75 * frac);
          const sy = Math.sin(frac * Math.PI) * 0.65;
          // Tangent points back from current segment toward previous segment along body curve
          this._wormCurDir.set(prevSegX - sx, 0, prevSegZ - sz);
          if (this._wormCurDir.lengthSq() < 1e-5) this._wormCurDir.set(fx, 0, fz);
          this._wormCurDir.normalize();
          this.computeParallelQuat(this._wormCurDir, this._wormQuat);
          seg.position.set(sx, sy, sz);
          seg.quaternion.copy(this._wormQuat);
          prevSegX = sx;
          prevSegZ = sz;
        }
      }
      if (enemy.parts?.teeth) enemy.parts.teeth.rotation.z += delta * 2.8;

      if (act.timer >= windup && !act.hitApplied) {
        act.hitApplied = true;
        if (this.jarrusTailConeGroup) this.jarrusTailConeGroup.group.visible = false;
        soundManager.playHit(true);
        this.callbacks.onCameraShake(0.85);
        this.spawnSandBurst(ePos, 20, 9.5);

        const inFan = (pt: THREE.Vector3) => {
          const dx = pt.x - ePos.x;
          const dz = pt.z - ePos.z;
          const d = Math.hypot(dx, dz);
          if (d > 11.5) return false;
          if (d < 1.5) return true;
          const dot = (dx * act.dir.x + dz * act.dir.z) / d;
          return Math.acos(Math.max(-1, Math.min(1, dot))) <= halfArc;
        };

        if (this.activeDecoy?.active && inFan(this.activeDecoy.position)) {
          this.callbacks.onDecoyHit?.();
        }
        if (inFan(playerPos)) {
          this.applyJarrusDamage(
            45,
            'Sabetan Ekor Badai Pasir',
            'knockback',
            0.7,
            ePos,
            playerPos,
            safeVel,
            isPlayerDashing,
            20.0
          );
        }
      }

      if (act.timer >= swingEnd) {
        this._wormCurDir.copy(act.dir).normalize();
        this.seedJarrusSpine(ePos, this._wormCurDir);
        act.mode = 'swim';
        act.timer = 0;
      }
      return true;
    }

    // ---------------------------------------------------------
    // MODE E: SAND SPIKE BARRAGE CHIN-SLAM WINDUP (Spikes managed by Pool!)
    // ---------------------------------------------------------
    if (act.mode === 'spike_cast') {
      const u = Math.min(1, act.timer / 0.48);
      const gy = this.getTerrainHeight(act.startPos.x, act.startPos.z);
      ePos.set(act.startPos.x, gy + Math.sin(u * Math.PI) * 2.8 - 0.5, act.startPos.z);
      const dx = aimPos.x - ePos.x;
      const dz = aimPos.z - ePos.z;
      this._wormCurDir.set(dx, Math.cos(u * Math.PI) * 8.0, dz).normalize();
      this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.35);

      if (act.timer >= 0.48) {
        this.spawnSandBurst(act.startPos, 10, 6.0);
        act.mode = 'swim';
        act.timer = 0;
      }
      return true;
    }

    // ---------------------------------------------------------
    // MODE F: ULTIMATE QUICKSAND VORTEX (4.5s) -> +0.5s WARNING -> SAND BOMB (r=36)
    // ---------------------------------------------------------
    if (act.mode === 'whirlpool_suction') {
      const center = act.targetPos;
      if (this.jarrusVortexGroup) {
        this.jarrusVortexGroup.group.visible = true;
        this.jarrusVortexGroup.group.position.set(center.x, center.y + 0.08, center.z);
        for (let r = 0; r < this.jarrusVortexGroup.swirlRings.length; r++) {
          const dirSign = r % 2 === 0 ? 1 : -1;
          this.jarrusVortexGroup.swirlRings[r].rotation.z += delta * (1.4 + r * 0.9) * dirSign;
        }
      }

      // Circle aggressively beneath crater floor around center
      const spinAng = act.timer * 2.6;
      const orbitR = 9.0;
      ePos.set(
        center.x + Math.cos(spinAng) * orbitR,
        center.y - 1.45,
        center.z + Math.sin(spinAng) * orbitR
      );
      this._wormCurDir.set(-Math.sin(spinAng), 0, Math.cos(spinAng)).normalize();
      this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.9);
      if (this.sandMoundPool.length > 0) {
        const mound = this.sandMoundPool[0];
        mound.group.position.set(ePos.x, center.y + 0.08, ePos.z);
        mound.group.rotation.y = Math.atan2(this._wormCurDir.x, this._wormCurDir.z);
        mound.active = true;
      }
      this.jarrusSandDustTimer += delta;
      if (this.jarrusSandDustTimer >= 0.1) {
        this.jarrusSandDustTimer = 0;
        this._wormScratchPos.set(
          center.x + (Math.random() - 0.5) * 14,
          center.y + 0.4,
          center.z + (Math.random() - 0.5) * 14
        );
        this.spawnSandBurst(this._wormScratchPos, 3, 5.5);
      }

      // Pull player inward inside radius 38; tick 12 dmg every 0.45s inside core <= 8u
      const distToCenter = Math.hypot(playerPos.x - center.x, playerPos.z - center.z);
      if (distToCenter <= 38.0) {
        if (!this.devCcImmune && distToCenter > 1.0) {
          const pullDirX = (center.x - playerPos.x) / distToCenter;
          const pullDirZ = (center.z - playerPos.z) / distToCenter;
          const pullSpeed = (5.4 + (1 - distToCenter / 38.0) * 3.0) * delta;
          playerPos.x += pullDirX * pullSpeed - pullDirZ * (2.6 * delta);
          playerPos.z += pullDirZ * pullSpeed + pullDirX * (2.6 * delta);
        }

        act.suctionWarnCooldown = Math.max(0, act.suctionWarnCooldown - delta);
        if (distToCenter <= 8.0) {
          act.suctionTickTimer += delta;
          if (act.suctionTickTimer >= 0.45) {
            act.suctionTickTimer -= 0.45;
            if (act.suctionWarnCooldown <= 0) {
              act.suctionWarnCooldown = 0.9;
              this.callbacks.onAddFloatingText('⚠️ TERHISAP PUSARAN!', '#fbbf24', 'crit');
            }
            this.applyJarrusDamage(
              12,
              'Pusaran Pasir',
              'none',
              0,
              center,
              playerPos,
              safeVel,
              false // Core vortex hazard ticks cleanly even if jogging around center
            );
          }
        }
      }

      if (act.timer >= 4.5) {
        act.mode = 'whirlpool_warning';
        act.timer = 0;
        if (this.jarrusVortexGroup) this.jarrusVortexGroup.group.visible = false;
        this.callbacks.onAddFloatingText('💥 AWAS! BOM PASIR RAKSASA AKAN MELEDAK! MENJAUH!', '#ff2a00', 'crit');
      }
      return true;
    }

    if (act.mode === 'whirlpool_warning') {
      const center = act.targetPos;
      // Intense +0.5s warning pause at radius 36 before bomb detonates
      if (this.jarrusSandBombGroup) {
        const b = this.jarrusSandBombGroup;
        b.group.visible = true;
        b.group.position.copy(center);
        b.warningRing.visible = true;
        b.warningFill.visible = true;
        const pulse = 0.55 + Math.sin(act.timer * 32) * 0.45;
        b.warningRingMat.opacity = 0.65 + pulse * 0.35;
        b.warningFillMat.opacity = 0.18 + pulse * 0.25;
      }

      // Sink coiled vertically directly under center ready to rocket upward
      ePos.set(center.x, center.y - 3.0, center.z);
      this._wormCurDir.set(0, 1, 0);
      this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0);

      if (act.timer >= 0.5) {
        // DETONATE DISTANCE-SCALED SAND BOMB!
        if (this.jarrusSandBombGroup) {
          const b = this.jarrusSandBombGroup;
          b.warningRing.visible = false;
          b.warningFill.visible = false;
          b.blastActive = true;
          b.blastTimer = 0;
        }
        soundManager.playMeteorBoom();
        soundManager.playWormBurstOut();
        this.callbacks.onCameraShake(1.35);
        this.spawnSandBurst(center, 36, 14.0);

        if (
          this.activeDecoy?.active &&
          Math.hypot(this.activeDecoy.position.x - center.x, this.activeDecoy.position.z - center.z) <= 36.0
        ) {
          this.callbacks.onDecoyHit?.();
        }

        const d = Math.hypot(playerPos.x - center.x, playerPos.z - center.z);
        if (d <= 36.0) {
          const rawBombDmg =
            d <= 8.0
              ? 115
              : Math.round(20 + (1 - (d - 8.0) / 28.0) * 85);
          this.applyJarrusDamage(
            rawBombDmg,
            'Ledakan Bom Pasir',
            'knockup',
            1.0,
            center,
            playerPos,
            safeVel,
            isPlayerDashing
          );
        }

        act.mode = 'whirlpool_erupting';
        act.timer = 0;
      }
      return true;
    }

    if (act.mode === 'whirlpool_erupting') {
      const center = act.targetPos;
      const u = Math.min(1, act.timer / 0.9);
      const prevX = ePos.x;
      const prevY = ePos.y;
      const prevZ = ePos.z;
      const nx = center.x + Math.sin(u * Math.PI * 0.5) * 14.0;
      const nz = center.z;
      const ny = center.y - 1.0 + Math.sin(u * Math.PI) * 22.0; // Erupts +21u high then dives back!
      ePos.set(nx, ny, nz);
      this._wormCurDir.set(nx - prevX, ny - prevY, nz - prevZ).normalize();
      this.applyJarrusSpineFromHistory(enemy, delta, ePos, this._wormCurDir, 0.15);

      if (u >= 1) {
        act.mode = 'swim';
        act.timer = 0;
      }
      return true;
    }

    act.mode = 'swim';
    act.timer = 0;
    return true;
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

    if (this.sandParticleMesh) {
      this.scene.remove(this.sandParticleMesh);
      this.sandParticleMesh.geometry.dispose();
      (this.sandParticleMesh.material as THREE.Material).dispose();
      this.sandParticleMesh = null;
    }
    this.sandMoundPool.forEach((m, idx) => {
      this.scene.remove(m.group);
      if (idx === 0) {
        m.group.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) (mesh.material as THREE.Material).dispose();
        });
      }
    });
    this.sandMoundPool = [];

    this.sandSpikePool.forEach((sp, idx) => {
      this.scene.remove(sp.spikeMesh);
      this.scene.remove(sp.warningMesh);
      if (idx === 0) {
        sp.spikeMesh.geometry.dispose();
        (sp.spikeMesh.material as THREE.Material).dispose();
        sp.warningMesh.geometry.dispose();
      }
      sp.warningMat.dispose();
    });
    this.sandSpikePool = [];

    const disposeSimpleGroup = (g: THREE.Group | null | undefined) => {
      if (!g) return;
      this.scene.remove(g);
      g.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
    };
    disposeSimpleGroup(this.jarrusTakeoffRing?.group);
    disposeSimpleGroup(this.jarrusLandingRing?.group);
    disposeSimpleGroup(this.jarrusSlamLineGroup?.group);
    disposeSimpleGroup(this.jarrusTailConeGroup?.group);
    disposeSimpleGroup(this.jarrusVortexGroup?.group);
    disposeSimpleGroup(this.jarrusSandBombGroup?.group);
    this.jarrusTakeoffRing = null;
    this.jarrusLandingRing = null;
    this.jarrusSlamLineGroup = null;
    this.jarrusTailConeGroup = null;
    this.jarrusVortexGroup = null;
    this.jarrusSandBombGroup = null;
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

