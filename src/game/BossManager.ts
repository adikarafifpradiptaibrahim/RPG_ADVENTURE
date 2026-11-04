import * as THREE from 'three';
import { EnemyData, PlayerStats } from '../types/game';
import { soundManager } from './audio';
import {
  IGNIS_DRAGON_BOSS_CONFIG,
  ANCIENT_TITAN_BOSS_CONFIG,
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
}

export interface PlayerStatusDebuffs {
  isStunned: boolean;
  stunTimer: number;
  isBurned: boolean;
  burnTimer: number;
  burnTickTimer: number;
}

export interface BossManagerCallbacks {
  onAddFloatingText: (text: string, color: string, type: 'damage' | 'heal' | 'crit' | 'exp' | 'info') => void;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onCameraShake: (amount: number) => void;
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

      // Pulse telegraph opacity & scale inner warning indicator
      const pulse = 0.5 + Math.sin(tel.timer * 12) * 0.25;
      (tel.indicatorMesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.35;
      tel.indicatorMesh.scale.set(progress, progress, 1);

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
    if (!isIgnis && !isTitan) return false;

    const config = isIgnis ? IGNIS_DRAGON_BOSS_CONFIG : ANCIENT_TITAN_BOSS_CONFIG;
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
        if (enemy.parts.neck) {
          enemy.parts.neck.rotation.x = -0.3 + Math.sin(stateTimer * 8) * 0.15;
        }
        if (enemy.parts.leftWing && enemy.parts.rightWing) {
          enemy.parts.leftWing.rotation.z = Math.sin(stateTimer * 10) * 0.3;
          enemy.parts.rightWing.rotation.z = -Math.sin(stateTimer * 10) * 0.3;
        }
      } else if (isTitan) {
        // Raise stone fists high in wind-up
        if (enemy.parts.leftArm && enemy.parts.rightArm) {
          enemy.parts.leftArm.rotation.x = -Math.PI * 0.7 + Math.sin(stateTimer * 8) * 0.1;
          enemy.parts.rightArm.rotation.x = -Math.PI * 0.7 - Math.sin(stateTimer * 8) * 0.1;
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
        this.callbacks.onAddFloatingText('🔥 IGNIS: HUJAN METEOR!', '#ff3d00', 'crit');
        cdMap.set('meteor_strike', skill.cooldown);
        return true;
      }

      // 3. Fire Breath Cone AOE (Mid-range forward: dist 3..14, dot > 0.4)
      const breathCd = cdMap.get('fire_breath') || 0;
      if (distToPlayer <= 14 && dot > 0.25 && breathCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'fire_breath')!;
        this.startTelegraphCone(bossId, enemy, ePos, fwd, 14, Math.PI / 3, skill);
        soundManager.playDragonFireBreath();
        this.callbacks.onAddFloatingText('🔥 IGNIS: SEMBURAN API!', '#ff5722', 'crit');
        cdMap.set('fire_breath', skill.cooldown);
        return true;
      }
    } else if (isTitan) {
      // 1. Ground Slam (Melee AOE around Titan: dist <= 7.0)
      const slamCd = cdMap.get('ground_slam') || 0;
      if (distToPlayer <= 7.5 && slamCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'ground_slam')!;
        this.startTelegraphCircle(bossId, enemy, ePos, 7.5, skill);
        this.callbacks.onAddFloatingText('⚠️ TITAN: HANTAMAN TANAH GEMPA!', '#ffd600', 'crit');
        cdMap.set('ground_slam', skill.cooldown);
        return true;
      }

      // 2. Charge Attack (Mid/Long range: dist 8..24)
      const chargeCd = cdMap.get('charge_attack') || 0;
      if (distToPlayer >= 8 && distToPlayer <= 24 && chargeCd <= 0) {
        const skill = config.skills.find((s) => s.id === 'charge_attack')!;
        const toPlayer = new THREE.Vector3(playerPos.x - ePos.x, 0, playerPos.z - ePos.z).normalize();
        this.startTelegraphLine(bossId, enemy, ePos, toPlayer, 18, 4.0, skill);
        this.callbacks.onAddFloatingText('⚡ TITAN: TERJANGAN TUBRUK!', '#ff9100', 'crit');
        cdMap.set('charge_attack', skill.cooldown);
        return true;
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

    // Play appropriate SFX
    if (tel.skill.id === 'meteor_strike') {
      soundManager.playMeteorImpact();
      this.callbacks.onCameraShake(0.85);
    } else if (tel.skill.id === 'ground_slam') {
      soundManager.playTitanGroundSlam();
      this.callbacks.onCameraShake(0.9);
    } else if (tel.skill.id === 'fire_breath') {
      soundManager.playDragonFireBreath();
    } else {
      soundManager.playHit();
      this.callbacks.onCameraShake(0.5);
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
      const finalDmg = Math.max(5, skill.damage - Math.round(stats.baseDefense * 0.5));
      const nextHp = Math.max(0, stats.hp - finalDmg);
      this.callbacks.onAddFloatingText(`-${finalDmg} HP (${skill.nameId})`, '#ff1744', 'damage');
      return { ...stats, hp: nextHp };
    });

    // Apply Specific Status Debuffs
    if (skill.effect === 'stun') {
      this.applyStun(skill.effectDuration || 1.5, playerVel);
    } else if (skill.effect === 'burn') {
      this.applyBurn(skill.effectDuration || 4.0);
    } else if (skill.effect === 'knockback') {
      this.applyKnockback(tel.center, playerPos, playerVel);
    }

    this.bossStates.set(tel.bossId, 'recovery');
    this.stateTimers.set(tel.bossId, 0);
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

    // 2. Burn DoT Tick
    if (this.playerDebuffs.isBurned) {
      this.playerDebuffs.burnTimer -= delta;
      this.playerDebuffs.burnTickTimer -= delta;

      if (this.playerDebuffs.burnTickTimer <= 0) {
        this.playerDebuffs.burnTickTimer = 0.7;
        const burnDmg = 8;
        this.callbacks.onUpdateStats((stats) => {
          const nextHp = Math.max(0, stats.hp - burnDmg);
          this.callbacks.onAddFloatingText(`-${burnDmg} HP (Bakar)`, '#ff3d00', 'damage');
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
   * Resets all telegraphs (e.g. when boss dies or player leaves region)
   */
  public cleanup() {
    this.telegraphs.forEach((t) => this.removeTelegraph(t));
    this.telegraphs = [];
    this.activeTelegraphMap.clear();
    this.bossStates.clear();
    this.stateTimers.clear();
    this.skillCooldowns.clear();
    this.playerDebuffs.isStunned = false;
    this.playerDebuffs.isBurned = false;
  }
}
