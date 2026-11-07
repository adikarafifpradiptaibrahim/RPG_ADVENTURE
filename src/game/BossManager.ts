import * as THREE from 'three';
import { EnemyData, PlayerStats } from '../types/game';
import { soundManager } from './audio';
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
  enemy?: { mesh: THREE.Group };
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
  onPlayerDeath?: () => void;
  onDamageAbsorb?: (rawDmg: number) => number;
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
  private bossStates: Map<string, 'idle' | 'chase' | 'telegraph' | 'executing' | 'recovery'> = new Map();
  private stateTimers: Map<string, number> = new Map();
  private activeTelegraphMap: Map<string, ActiveTelegraph> = new Map();

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
    isPlayerDashing: boolean
  ) {
    // 1. Update Player Status Debuffs (Stun & Burn DoT)
    this.updatePlayerDebuffs(delta);

    // 2. Update and advance Active Telegraph Indicators
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
          const pullDirX = (tel.center.x - playerPos.x) / distToCenter;
          const pullDirZ = (tel.center.z - playerPos.z) / distToCenter;
          const pullSpeed = 5.2 * delta; // Sedotan pusaran pasir ke arah tengah kawah
          playerPos.x += pullDirX * pullSpeed;
          playerPos.z += pullDirZ * pullSpeed;
          // Perputaran spiral pusaran pasir
          playerPos.x += -pullDirZ * (2.4 * delta);
          playerPos.z += pullDirX * (2.4 * delta);

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
    },
    playerPos: THREE.Vector3,
    delta: number
  ): boolean {
    const bossId = enemy.data.id;
    const isIgnis = bossId === 'boss_dragonfang';
    const isTitan = bossId === 'boss_titan';
    const isWorm = bossId === 'boss_jarrus';
    if (!isIgnis && !isTitan && !isWorm) return false;

    if (enemy.data.hp <= 0) {
      if (soundManager.getCurrentBossMusic()) {
        const config = isIgnis ? IGNIS_DRAGON_BOSS_CONFIG : (isWorm ? JARRUS_WORM_BOSS_CONFIG : ANCIENT_TITAN_BOSS_CONFIG);
        soundManager.playBossVictory(config.nameId || config.name);
      }
      return false;
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
        if (skillId === 'earthquake_slam') {
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

    if (currentState === 'recovery') {
      if (stateTimer >= 0.6) {
        this.bossStates.set(bossId, 'chase');
        this.stateTimers.set(bossId, 0);
      }
      return true;
    }

    // Evaluate Boss Skills
    const ePos = enemy.mesh.position;
    const distToPlayer = Math.hypot(playerPos.x - ePos.x, playerPos.z - ePos.z);
    const cdMap = this.skillCooldowns.get(bossId)!;

    if (isIgnis) {
      // 1. Tail Swipe: Check if player is BEHIND Ignis within 7.5 units
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), enemy.mesh.rotation.y);
      const toPlayer = new THREE.Vector3(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
      const dot = fwd.dot(toPlayer); // dot < -0.35 means player is behind the dragon
      const tailSwipeCd = cdMap.get('tail_swipe') || 0;

      if (distToPlayer <= 7.5 && dot < -0.35 && tailSwipeCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'tail_swipe')!;
        this.startTelegraphCircle(bossId, enemy, ePos, 6.5, skill);
        cdMap.set('tail_swipe', skill.cooldown);
        return true;
      }

      // 2. Meteor Strike (Long range or mid-combat: dist 6..28)
      const meteorCd = cdMap.get('meteor_strike') || 0;
      if (distToPlayer >= 5 && distToPlayer <= 28 && meteorCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'meteor_strike')!;
        // Target player current location
        const targetPos = new THREE.Vector3(playerPos.x, this.getTerrainHeight(playerPos.x, playerPos.z), playerPos.z);
        this.startTelegraphCircle(bossId, enemy, targetPos, 5.0, skill);
        soundManager.playDragonRoar();
        cdMap.set('meteor_strike', skill.cooldown);
        return true;
      }

      // 3. Fire Breath Cone AOE (Mid-range forward: dist 3..14, dot > 0.4)
      const breathCd = cdMap.get('fire_breath') || 0;
      if (distToPlayer <= 14 && dot > 0.25 && breathCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'fire_breath')!;
        this.startTelegraphCone(bossId, enemy, ePos, fwd, 14, Math.PI / 3, skill);
        soundManager.playDragonFireBreath();
        cdMap.set('fire_breath', skill.cooldown);
        return true;
      }
    } else if (isTitan) {
      const slamCd = cdMap.get('earthquake_slam') || 0;
      const punchCd = cdMap.get('heavy_punch') || 0;
      const rockCd = cdMap.get('rock_throw') || 0;

      // 1. Earthquake Slam (Large Ground AOE with Stun & Knockback: dist <= 7.5)
      if (distToPlayer <= 7.5 && slamCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'earthquake_slam')!;
        this.startTelegraphCircle(bossId, enemy, ePos, 8.0, skill);
        cdMap.set('earthquake_slam', skill.cooldown);
        return true;
      }

      // 2. Basic Heavy Punch (Close range single forward punch: dist <= 4.8)
      if (distToPlayer <= 4.8 && punchCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'heavy_punch')!;
        const toPlayer = new THREE.Vector3(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
        const punchPos = ePos.clone().addScaledVector(toPlayer, 2.5);
        this.startTelegraphCircle(bossId, enemy, punchPos, 4.2, skill);
        cdMap.set('heavy_punch', skill.cooldown);
        return true;
      }

      // 3. Rock Boulder Throw (Medium/Long range: dist 7..26)
      if (distToPlayer >= 6.5 && distToPlayer <= 26.0 && rockCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'rock_throw')!;
        const toPlayer = new THREE.Vector3(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
        this.startTelegraphLine(bossId, enemy, ePos, toPlayer, 22.0, 3.8, skill);
        cdMap.set('rock_throw', skill.cooldown);
        return true;
      }
    } else if (isWorm) {
      const burrowCd = cdMap.get('burrow_burst') || 0;
      const spikeCd = cdMap.get('sand_spike_barrage') || 0;
      const whirlpoolCd = cdMap.get('sand_whirlpool') || 0;
      const tailCd = cdMap.get('tail_slam') || 0;
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), enemy.mesh.rotation.y);

      // 1. SKILL 3 — DESERT SAND WHIRLPOOL (Ketika HP < 50%, cacing berdiam di tengah & ciptakan pusaran)
      if (enemy.data.hp < enemy.data.maxHp * 0.5 && whirlpoolCd <= 0 && distToPlayer <= 42) {
        const skill = config.skills.find((s) => s.id === 'sand_whirlpool');
        if (skill) {
          const centerPos = new THREE.Vector3(495, this.getTerrainHeight(495, -362), -362);
          this.startTelegraphCircle(bossId, enemy, centerPos, 36.0, skill);
          soundManager.playTitanGroundSlam();
          this.callbacks.onAddFloatingText('🌪️ SANG CACING MEMICU PUSARAN PASIR RAKSASA!', '#f59e0b', 'crit');
          cdMap.set('sand_whirlpool', skill.cooldown);
          return true;
        }
      }

      // 2. SKILL 1 — BURROW & ERUPTION (Menyelam & Muncul di bawah kaki pemain)
      if (distToPlayer <= 38 && burrowCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'burrow_burst')!;
        this.startTelegraphCircle(bossId, enemy, playerPos.clone(), 4.5, skill);
        soundManager.playWormBurrow();
        this.callbacks.onAddFloatingText('⚠️ Cacing Purba Menyelam ke Bawah Pasir!', '#ef4444', 'info');
        // Fase Bawah Tanah: sembunyikan atau tenggelamkan mesh cacing
        if (enemy.mesh) {
          enemy.mesh.position.y -= 14.0;
        }
        cdMap.set('burrow_burst', skill.cooldown);
        return true;
      }

      // 3. SKILL 2 — SAND SPIKE BARRAGE (5-8 Duri Pasir Tajam Menusuk Area Beruntun)
      if (distToPlayer <= 28 && spikeCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'sand_spike_barrage');
        if (skill) {
          // Spawn 6 sequential spike telegraphs around player with small radius
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
      }

      // 4. SKILL 4 — TAIL SLAM / SWEEP (Sapuan Ekor 180 Derajat Jarak Dekat)
      if (distToPlayer <= 7.0 && tailCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'tail_slam');
        if (skill) {
          this.startTelegraphCone(bossId, enemy, ePos, fwd, 7.5, Math.PI, skill);
          soundManager.playHit(true);
          cdMap.set('tail_slam', skill.cooldown);
          return true;
        }
      }
    }

    return false;
  }

  // ==========================================
  // Visual Telegraph 3D Mesh Builders
  // ==========================================

  private startTelegraphCircle(
    bossId: string,
    enemy: { mesh: THREE.Group },
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
    enemy: { mesh: THREE.Group },
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
    enemy: { mesh: THREE.Group },
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
    if (tel.skill.id === 'meteor_strike') {
      soundManager.playMeteorImpact();
      this.callbacks.onCameraShake(0.85);
    } else if (tel.skill.id === 'earthquake_slam' || tel.skill.id === 'ground_slam') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(0.95);
    } else if (tel.skill.id === 'rock_throw') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(0.7);
      // Spawn flying 3D stone boulder projectile towards player
      this.callbacks.onSpawnBoulderProjectile?.(
        tel.center.clone().add(new THREE.Vector3(0, 3.5, 0)),
        playerPos.clone(),
        tel.skill.damage
      );
      this.bossStates.set(tel.bossId, 'recovery');
      this.stateTimers.set(tel.bossId, 0);
      return;
    } else if (tel.skill.id === 'heavy_punch') {
      soundManager.playHit(true);
      this.callbacks.onCameraShake(0.5);
    } else if (tel.skill.id === 'fire_breath') {
      soundManager.playDragonFireBreath();
      this.callbacks.onCameraShake(0.4);
    } else if (tel.skill.id === 'burrow_burst') {
      soundManager.playWormBurstOut();
      this.callbacks.onCameraShake(1.25);
      if (tel.enemy?.mesh) {
        const gY = this.getTerrainHeight(tel.center.x, tel.center.z);
        tel.enemy.mesh.position.set(tel.center.x, gY, tel.center.z);
      }
      this.callbacks.onSpawnShockwave?.(tel.center, 0xd97706, 6.5, 0.8);
    } else if (tel.skill.id === 'sand_spike_barrage') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(0.5);
      // Spawn pilar duri batu pasir tajam yang mencuat dari dalam tanah
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
      this.callbacks.onCameraShake(1.0);
      this.callbacks.onSpawnShockwave?.(tel.center, 0xb45309, 36.0, 2.5);
    } else if (tel.skill.id === 'tail_slam') {
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

    // Apply Specific Status Debuffs
    if (skill.effect === 'stun') {
      this.applyStun(skill.effectDuration || 1.5, playerVel);
    } else if (skill.effect === 'burn') {
      this.applyBurn(skill.effectDuration || 4.0);
    } else if (skill.effect === 'knockback') {
      this.applyKnockback(tel.center, playerPos, playerVel);
    } else if (skill.effect === 'knockup') {
      this.applyKnockup(tel.center, playerPos, playerVel);
    } else if (skill.effect === 'slow') {
      this.applySlow(skill.effectDuration || 3.0);
    }

    this.bossStates.set(tel.bossId, 'recovery');
    this.stateTimers.set(tel.bossId, 0);
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
    this.callbacks.onAddFloatingText('💫 TERKENA STUN! (1.5 detik)', '#ffd600', 'crit');
  }

  private applyBurn(duration: number) {
    this.playerDebuffs.isBurned = true;
    this.playerDebuffs.burnTimer = duration;
    this.playerDebuffs.burnTickTimer = 0.6;
    this.callbacks.onAddFloatingText('🔥 TERBAKAR! (DoT)', '#ff3d00', 'damage');
  }

  private applyKnockback(from: THREE.Vector3, playerPos: THREE.Vector3, playerVel: THREE.Vector3) {
    const dir = new THREE.Vector3(playerPos.x - from.x, 0, playerPos.z - from.z).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    playerVel.x += dir.x * 16.0;
    playerVel.z += dir.z * 16.0;
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

