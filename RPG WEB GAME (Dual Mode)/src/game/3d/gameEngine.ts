import * as THREE from 'three';
import {
  CharacterClass,
  EnemyData,
  FloatingText,
  Item,
  MapMarker,
  PlayerStats,
  Quest,
  RegionInfo,
} from '../../types/game';
import { soundManager } from '../audio';
import { CHEST_LOOT_POOL } from '../data';
import { getCurrentRegion } from '../mapData';
import { createEnemyMesh, createPlayerMesh, createArrowMesh, PlayerMeshObjects } from './models';
import { buildWorld, WorldObjects } from './world';
import { RemotePlayerData } from '../multiplayer';

export interface RemotePlayerInstance {
  data: RemotePlayerData;
  meshObj: PlayerMeshObjects;
  nameTag: THREE.Sprite;
  targetPos: THREE.Vector3;
  targetRotationY: number;
  currentPos: THREE.Vector3;
  currentRotationY: number;
  isMoving: boolean;
  isRunning: boolean;
  walkTime: number;
  attackTimer: number;
  attackType: string;
}

export interface GameEngineCallbacks {
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onUpdateQuests: (updater: (prev: Quest[]) => Quest[]) => void;
  onAddItem: (item: Item) => void;
  onAddFloatingText: (text: string, color: string, type: FloatingText['type']) => void;
  onInteractNPC: (npcId: string) => void;
  onNearbyPrompt: (prompt: string | null, action?: () => void) => void;
  onEnemyStatsUpdate: (enemies: { id: string; name: string; hp: number; maxHp: number; level: number }[]) => void;
  onBossEncounter: (bossActive: boolean, bossName?: string, bossHp?: number, bossMaxHp?: number) => void;
  onHunterWeaponSwitch?: (mode: 'dagger' | 'bow') => void;
  onPlayerPositionUpdate?: (data: {
    x: number;
    z: number;
    rotationY: number;
    region: RegionInfo;
    markers: MapMarker[];
  }) => void;
  // Optional multiplayer network hooks
  onLocalPlayerMove?: (data: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
    isMoving: boolean;
    isRunning?: boolean;
    tier?: number;
  }) => void;
  onLocalPlayerAttack?: (data: {
    attackType: string;
    skillSlot?: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
  }) => void;
  onLocalMonsterHit?: (data: {
    monsterId: string;
    damage: number;
    isCrit: boolean;
    attackerName: string;
    newHp?: number;
  }) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private callbacks: GameEngineCallbacks;

  // World and Player
  private world: WorldObjects;
  private playerMesh: PlayerMeshObjects;
  private playerPos = new THREE.Vector3(0, 0, 4);
  private playerVel = new THREE.Vector3();
  private playerRotationY = 0;
  private isGrounded = true;
  private isAttacking = false;
  private attackTimer = 0;
  private attackDuration = 0.3;
  private attackType:
    | 'basic'
    | 'basic_slash_1'
    | 'basic_slash_2'
    | 'basic_spin_360'
    | 'bow_shot'
    | 'bow_barrage'
    | 'whirlwind'
    | 'shield_charge'
    | 'iron_fortress'
    | 'supernova'
    | 'blink'
    | 'celestial_heal'
    | 'flurry'
    | 'shadow_step'
    | 'smoke_bomb'
    | null = null;
  private isDashing = false;
  private dashTimer = 0;
  private charClass: CharacterClass = 'warrior';
  private playerTier = 1;
  private playerLevel = 1;
  private footstepTimer = 0;
  private speedBuffTimer = 0;
  private regenTimer = 0;
  private hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  private attackComboIndex = 0;
  private lastAttackTime = 0;

  // Multiplayer Synchronization State (Reusable for both Single Player & Multiplayer)
  public gameMode: 'singleplayer' | 'multiplayer' = 'singleplayer';
  public isMultiplayer: boolean = false;
  public playerName: string = 'Hero';
  private remotePlayers: Map<string, RemotePlayerInstance> = new Map();
  private remoteMonsterTargets: Map<
    string,
    {
      x: number;
      y: number;
      z: number;
      rotationY: number;
      hp: number;
      isDead: boolean;
    }
  > = new Map();
  private multiplayerMoveTimer = 0;

  // Active Combat VFX and Projectiles
  private activeVfx: {
    object: THREE.Object3D;
    update: (delta: number) => boolean;
  }[] = [];
  private activeProjectiles: {
    object: THREE.Object3D;
    direction: THREE.Vector3;
    speed: number;
    lifetime: number;
    damage: number;
    isCrit: boolean;
    vfxType: 'arcane_bolt' | 'hunter_arrow' | 'hunter_arrow_rain';
  }[] = [];

  // Camera Orbit
  private cameraDistance = 7.5;
  private cameraAngleH = 0;
  private cameraAngleV = 0.35;
  private isMouseDown = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private cameraShake = 0;

  // Input state
  public keys: Record<string, boolean> = {};
  public joystickVector = { x: 0, y: 0 };
  public isControlsLocked = false;
  public isPaused = false;

  public setControlsLocked(locked: boolean) {
    this.isControlsLocked = locked;
    if (locked) {
      this.resetKeys();
      this.playerVel.x = 0;
      this.playerVel.z = 0;
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.resetKeys();
      this.playerVel.x = 0;
      this.playerVel.z = 0;
    } else {
      // Flush clock delta so there is no sudden leap after unpausing
      this.clock.getDelta();
    }
  }

  // Enemies
  private posUpdateThrottle = 0;
  private enemies: {
    data: EnemyData;
    mesh: THREE.Group;
    parts: Record<string, any>;
    baseY: number;
    attackCooldown: number;
    walkCycle: number;
  }[] = [];

  // Animation clocks
  private clock = new THREE.Clock();
  private walkTime = 0;
  private isRunning = false;

  constructor(container: HTMLElement, charClass: CharacterClass, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.charClass = charClass;

    // 1. Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      250
    );

    // 2. Setup Renderer (Optimized for high FPS and light GPU load)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Build 3D World
    this.world = buildWorld(this.scene);

    // 4. Create Player Mesh
    this.playerMesh = createPlayerMesh(charClass);
    const startY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
    this.playerPos.y = startY;
    this.playerMesh.group.position.copy(this.playerPos);
    this.scene.add(this.playerMesh.group);

    // 5. Spawn Enemies
    this.spawnEnemies();

    // 6. Setup Listeners
    this.setupEventListeners();

    // 7. Start Game Loop
    this.isRunning = true;
    this.animate();
  }

  public setCharacterClass(newClass: CharacterClass) {
    this.charClass = newClass;
    this.rebuildPlayerMesh();
  }

  public setPlayerLevel(level: number) {
    this.playerLevel = level;
    // 6-Tier Progression requested by user:
    // Level 1-4: Tier 1 (Novice)
    // Level 5-9: Tier 2 (Adept - Mantles, Runes, Spikes, Level 5 Upgrade)
    // Level 10-24: Tier 3 (Master - Golden Armor, Halo, Floating Orbs, Level 10 Upgrade)
    // Level 25-49: Tier 4 (Grandmaster - Quad-Wings, Orbiting Relics, Level 25 Upgrade)
    // Level 50-99: Tier 5 (Demigod - Hexa-Wings, Sacred Cosmic Mandalas, Level 50 Upgrade)
    // Level 100+: Tier 6 (Celestial Deity - Octa-Wings, Dual Halos, Divine Eternity Aura, Level 100 Upgrade)
    const newTier =
      level >= 100 ? 6 :
      level >= 50 ? 5 :
      level >= 25 ? 4 :
      level >= 10 ? 3 :
      level >= 5 ? 2 : 1;

    if (newTier !== this.playerTier) {
      this.playerTier = newTier;
      this.rebuildPlayerMesh();
      const tierTitles: Record<number, string> = {
        2: '✦ EVOLUSI TINGKAT 2 (Level 5)! Zirah & Efek Serangan Diperkuat!',
        3: '✦ EVOLUSI TINGKAT 3 (Level 10)! Mahkota Emas & Gelombang Serangan Ganda!',
        4: '✦ EVOLUSI TINGKAT 4 (Level 25)! Quad-Wings Astral & Skill Meledak Dahsyat!',
        5: '✦ EVOLUSI TINGKAT 5 (Level 50)! Hexa-Wings Kosmik & Mandala Serangan Pamungkas!',
        6: '✦ EVOLUSI DEWATA AGUNG (Level 100)! Octa-Wings Ilahi & Aura Keabadian Tanpa Batas!',
      };
      if (tierTitles[newTier]) {
        this.callbacks.onAddFloatingText(tierTitles[newTier], '#facc15', 'crit');
        this.spawnShockwaveRing(this.playerPos, 0xfacc15, 6.5, 0.9);
        this.spawnSparks(this.playerPos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xfacc15, 30, 6.0);
        soundManager.playLevelUp();
      }
    }
  }

  public rebuildPlayerMesh() {
    if (this.playerMesh && this.playerMesh.group) {
      this.scene.remove(this.playerMesh.group);
    }
    this.playerMesh = createPlayerMesh(this.charClass, this.playerTier);
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.rotation.y = this.playerRotationY;
    this.scene.add(this.playerMesh.group);
  }

  // ==========================================
  // MULTIPLAYER REUSABLE METHODS & SYNC
  // ==========================================
  public setGameMode(mode: 'singleplayer' | 'multiplayer', playerName: string = 'Hero') {
    this.gameMode = mode;
    this.isMultiplayer = mode === 'multiplayer';
    this.playerName = playerName;
    if (mode === 'singleplayer') {
      this.clearRemotePlayers();
      this.remoteMonsterTargets.clear();
    }
  }

  /**
   * Menerima sinkronisasi koordinat (X, Z) dan status monster dari server.js via Socket.io.
   * Hanya aktif dan digunakan pada Mode Multiplayer.
   */
  public applyRemoteMonsterPositions(
    monsters: {
      id: string;
      x: number;
      y?: number;
      z: number;
      rotationY?: number;
      hp?: number;
      isDead?: boolean;
    }[]
  ) {
    if (!this.isMultiplayer) return;

    monsters.forEach((m) => {
      let target = this.remoteMonsterTargets.get(m.id);
      if (!target) {
        target = {
          x: m.x,
          y: m.y ?? 0.5,
          z: m.z,
          rotationY: m.rotationY ?? 0,
          hp: m.hp ?? 100,
          isDead: !!m.isDead,
        };
        this.remoteMonsterTargets.set(m.id, target);
      } else {
        target.x = m.x;
        if (m.y !== undefined) target.y = m.y;
        target.z = m.z;
        if (m.rotationY !== undefined) target.rotationY = m.rotationY;
        if (m.hp !== undefined) target.hp = m.hp;
        if (m.isDead !== undefined) target.isDead = m.isDead;
      }

      if (m.isDead || (m.hp !== undefined && m.hp <= 0)) {
        const enemy = this.enemies.find((e) => e.data.id === m.id);
        if (enemy) {
          enemy.data.isDead = true;
          enemy.data.hp = 0;
          enemy.mesh.visible = false;
        }
      }
    });
  }

  private createNameTagSprite(name: string, level: number, charClass: string, hp: number, maxHp: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(8, 6, 240, 60, 10);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const classLabel = charClass === 'warrior' ? '⚔️ Ksatria' : charClass === 'mage' ? '🔮 Penyihir' : '🏹 Pemburu';
      ctx.fillText(`Lv.${level} ${name}`, 128, 28);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(classLabel, 128, 44);

      // Mini HP bar
      ctx.fillStyle = '#334155';
      ctx.fillRect(36, 50, 184, 8);
      const pct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 1));
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(36, 50, 184 * pct, 8);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.0, 0.85, 1);
    sprite.position.set(0, 2.6, 0);
    return sprite;
  }

  public addOrUpdateRemotePlayer(data: RemotePlayerData) {
    const existing = this.remotePlayers.get(data.id);
    if (existing) {
      existing.targetPos.set(data.x, data.y, data.z);
      existing.targetRotationY = data.rotationY;
      existing.isMoving = data.isMoving;
      existing.isRunning = !!data.isRunning;
      if (data.hp !== undefined) existing.data.hp = data.hp;
      if (data.maxHp !== undefined) existing.data.maxHp = data.maxHp;
      if (data.level !== undefined) existing.data.level = data.level;

      if (data.tier && data.tier !== existing.data.tier) {
        existing.data.tier = data.tier;
        this.scene.remove(existing.meshObj.group);
        existing.meshObj = createPlayerMesh(data.charClass, data.tier);
        existing.meshObj.group.position.copy(existing.currentPos);
        existing.meshObj.group.rotation.y = existing.currentRotationY;
        existing.meshObj.group.add(existing.nameTag);
        this.scene.add(existing.meshObj.group);
      }
    } else {
      const meshObj = createPlayerMesh(data.charClass, data.tier || 1);
      const nameTag = this.createNameTagSprite(
        data.name,
        data.level || 1,
        data.charClass,
        data.hp || 120,
        data.maxHp || 120
      );
      meshObj.group.position.set(data.x, data.y, data.z);
      meshObj.group.rotation.y = data.rotationY;
      meshObj.group.add(nameTag);
      this.scene.add(meshObj.group);

      const instance: RemotePlayerInstance = {
        data,
        meshObj,
        nameTag,
        targetPos: new THREE.Vector3(data.x, data.y, data.z),
        targetRotationY: data.rotationY,
        currentPos: new THREE.Vector3(data.x, data.y, data.z),
        currentRotationY: data.rotationY,
        isMoving: data.isMoving,
        isRunning: !!data.isRunning,
        walkTime: 0,
        attackTimer: 0,
        attackType: '',
      };
      this.remotePlayers.set(data.id, instance);
      this.callbacks.onAddFloatingText(`${data.name} bergabung!`, '#60a5fa', 'crit');
    }
  }

  public removeRemotePlayer(id: string) {
    const existing = this.remotePlayers.get(id);
    if (existing) {
      this.scene.remove(existing.meshObj.group);
      this.remotePlayers.delete(id);
      this.callbacks.onAddFloatingText(`${existing.data.name} meninggalkan dunia.`, '#94a3b8', 'damage');
    }
  }

  public clearRemotePlayers() {
    this.remotePlayers.forEach((rp) => {
      this.scene.remove(rp.meshObj.group);
    });
    this.remotePlayers.clear();
  }

  public triggerRemotePlayerAttack(data: {
    id: string;
    attackType: string;
    skillSlot?: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
  }) {
    const rp = this.remotePlayers.get(data.id);
    if (rp) {
      rp.attackTimer = 0.35;
      rp.attackType = data.attackType;
      rp.currentRotationY = data.rotationY;
      rp.meshObj.group.rotation.y = data.rotationY;

      const atkPos = new THREE.Vector3(data.x, data.y, data.z);
      if (data.attackType.includes('spin') || data.attackType.includes('whirlwind')) {
        this.spawnShockwaveRing(atkPos, 0x3b82f6, 4.0, 0.5);
      } else if (data.attackType.includes('crystal') || data.attackType.includes('nova')) {
        this.spawnHitStarburst(atkPos.clone().add(new THREE.Vector3(0, 1, 0)), 0xa855f7, 2.0);
      } else {
        this.spawnSparks(atkPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xf59e0b, 10, 3.5);
      }
    }
  }

  public applyRemoteMonsterDamage(data: {
    monsterId: string;
    damage: number;
    attackerName: string;
    isCrit: boolean;
    newHp?: number;
  }) {
    const enemy = this.enemies.find((e) => e.data.id === data.monsterId);
    if (enemy && !enemy.data.isDead) {
      if (data.newHp !== undefined) {
        enemy.data.hp = data.newHp;
      } else {
        enemy.data.hp = Math.max(0, enemy.data.hp - data.damage);
      }

      const hitPos = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      this.spawnHitStarburst(hitPos, data.isCrit ? 0xffea00 : 0xff5252, data.isCrit ? 1.2 : 0.7);
      this.spawnSparks(hitPos, data.isCrit ? 0xffea00 : 0xff5252, 8, 3.5);
      this.callbacks.onAddFloatingText(
        `${data.damage} (${data.attackerName})`,
        data.isCrit ? '#ffea00' : '#f87171',
        data.isCrit ? 'crit' : 'damage'
      );

      if (enemy.data.hp <= 0) {
        enemy.data.isDead = true;
        this.handleEnemyDefeat(enemy);
      }
    }
  }

  private spawnEnemies() {
    // 1. Meadow Slimes (Green) (x: 12..28, z: 8..26)
    const slimePositions: [number, number][] = [
      [14, 12],
      [18, 16],
      [22, 10],
      [12, 24],
      [26, 20],
    ];
    slimePositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('slime');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `slime_${idx}`,
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
        speed: 2.2,
        attackRange: 1.8,
        detectRange: 12,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[3], chance: 0.35 }, // Health potion
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 2. Northern Caldera Magma Slimes (Fiery Red) (x: -12..12, z: -30..-44)
    const magmaSlimePositions: [number, number][] = [
      [-10, -32],
      [10, -32],
      [-6, -42],
      [8, -44],
    ];
    magmaSlimePositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('magma_slime');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `magma_slime_${idx}`,
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
        speed: 2.5,
        attackRange: 2.0,
        detectRange: 14,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[4], chance: 0.4 }, // Mana potion
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 3. Ancient Crypt Skeleton Sentinels (x: -18..-34, z: 12..32)
    const skeletonPositions: [number, number][] = [
      [-22, 18],
      [-28, 22],
      [-32, 28],
      [-20, 29],
    ];
    skeletonPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('skeleton');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `skeleton_${idx}`,
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
        speed: 3.0,
        attackRange: 2.2,
        detectRange: 14,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[2], chance: 0.25 }, // Ring of swift wind
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 4. Skeleton Necromancer Mages in Deep Ruins (x: -36..-44, z: 16..30)
    const magePositions: [number, number][] = [
      [-36, 18],
      [-42, 24],
      [-38, 30],
    ];
    magePositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('skeleton_mage');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `skeleton_mage_${idx}`,
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
        speed: 2.3,
        attackRange: 6.0,
        detectRange: 18,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[4], chance: 0.5 },
          { item: CHEST_LOOT_POOL[1], chance: 0.2 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 5. Southern Shore Beach Goblins (x: -12..22, z: 24..34)
    const beachPositions: [number, number][] = [
      [14, 25],
      [22, 30],
      [-12, 28],
      [-4, 32],
    ];
    beachPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('goblin');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `beach_goblin_${idx}`,
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
        speed: 2.8,
        attackRange: 2.0,
        detectRange: 13,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[1], chance: 0.3 }, // Elven Cloak
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 6. Mystic Forest Stone Golems (x: 26..38, z: -8..18)
    const golemPositions: [number, number][] = [
      [28, 2],
      [34, -8],
      [32, 16],
    ];
    golemPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('golem');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `forest_golem_${idx}`,
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
        speed: 1.8,
        attackRange: 2.8,
        detectRange: 15,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[0], chance: 0.2 },
          { item: CHEST_LOOT_POOL[3], chance: 0.5 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 7. Mystic Deep Pine Forest Venomous Spiders (x: 22..38, z: -28..-14)
    const spiderPositions: [number, number][] = [
      [24, -18],
      [32, -22],
      [38, -14],
      [26, -26],
    ];
    spiderPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('spider');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `forest_spider_${idx}`,
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
        speed: 3.5,
        attackRange: 2.2,
        detectRange: 16,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[2], chance: 0.35 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 8. Ancient Obsidian Titan Golem Boss in Northern Arena (x: 0, z: -52)
    const bossPos: [number, number] = [0, -52];
    const { group: bossGroup, parts: bossParts } = createEnemyMesh('boss');
    const by = this.world.getTerrainHeight(bossPos[0], bossPos[1]);
    bossGroup.position.set(bossPos[0], by, bossPos[1]);
    this.scene.add(bossGroup);

    const bossData: EnemyData = {
      id: 'boss_titan',
      name: 'Obsidian Titan Golem',
      nameId: 'Sang Titan Kuno Obsidian',
      type: 'boss',
      level: 6,
      hp: 450,
      maxHp: 450,
      attack: 28,
      defense: 14,
      expReward: 450,
      goldReward: 300,
      speed: 2.4,
      attackRange: 4.5,
      detectRange: 26,
      position: [bossPos[0], by, bossPos[1]],
      isDead: false,
      dropItems: [
        { item: CHEST_LOOT_POOL[0], chance: 1.0 }, // Azure Crystal Claymore
      ],
    };

    this.enemies.push({
      data: bossData,
      mesh: bossGroup,
      parts: bossParts,
      baseY: by,
      attackCooldown: 0,
      walkCycle: 0,
    });

    // 9. Frostpeak Glacier Frostfang Wolves (Far North-East)
    const wolfPositions: [number, number][] = [
      [108, -62],
      [118, -70],
      [125, -78],
      [132, -66],
      [114, -84],
    ];
    wolfPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('frost_wolf');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `frost_wolf_${idx}`,
        name: 'Frostfang Glacier Wolf',
        nameId: 'Serigala Es Frostfang',
        type: 'frost_wolf',
        level: 5,
        hp: 135,
        maxHp: 135,
        attack: 24,
        defense: 7,
        expReward: 105,
        goldReward: 60,
        speed: 3.6,
        attackRange: 2.2,
        detectRange: 16,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[4], chance: 0.4 }, // Mana elixir
          { item: CHEST_LOOT_POOL[2], chance: 0.25 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 10. Shadowfen Gloom Marsh Crawlers (Far West)
    const swampPositions: [number, number][] = [
      [-90, 10],
      [-102, 18],
      [-114, 4],
      [-82, 22],
    ];
    swampPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('swamp_crawler');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `swamp_crawler_${idx}`,
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
        speed: 2.4,
        attackRange: 2.4,
        detectRange: 14,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[3], chance: 0.45 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 11. Gurun Pasir Solaria: Kalajengking Emas & Penjaga Makam
    const solariaPositions: [number, number][] = [
      [-150, 96],
      [-172, 102],
      [-158, 122],
      [-176, 120],
    ];
    solariaPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('spider');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `solaria_scorpion_${idx}`,
        name: 'Solaria Dune Stalker',
        nameId: 'Kalajengking Emas Solaria',
        type: 'spider',
        level: 6,
        hp: 160,
        maxHp: 160,
        attack: 26,
        defense: 9,
        expReward: 130,
        goldReward: 75,
        speed: 3.6,
        attackRange: 2.4,
        detectRange: 16,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[0], chance: 0.15 },
          { item: CHEST_LOOT_POOL[2], chance: 0.3 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 12. Puncak Halilintar: Golem Badai Petir & Serigala Halilintar
    const thunderPositions: [number, number][] = [
      [-145, -128],
      [-162, -140],
      [-140, -145],
    ];
    thunderPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('golem');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `thunder_golem_${idx}`,
        name: 'Stormspire Tempest Golem',
        nameId: 'Golem Badai Halilintar',
        type: 'golem',
        level: 7,
        hp: 240,
        maxHp: 240,
        attack: 32,
        defense: 16,
        expReward: 190,
        goldReward: 110,
        speed: 2.2,
        attackRange: 3.0,
        detectRange: 18,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[0], chance: 0.3 },
          { item: CHEST_LOOT_POOL[1], chance: 0.4 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 13. Hutan Pagoda Giok: Siluman Penjaga Pagoda & Goblin Bambu
    const jadePositions: [number, number][] = [
      [150, 95],
      [175, 105],
      [155, 125],
      [170, 130],
    ];
    jadePositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('goblin');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `jade_stalker_${idx}`,
        name: 'Jade Bamboo Stalker',
        nameId: 'Pendekar Siluman Bambu Giok',
        type: 'goblin',
        level: 6,
        hp: 145,
        maxHp: 145,
        attack: 25,
        defense: 8,
        expReward: 120,
        goldReward: 70,
        speed: 3.3,
        attackRange: 2.2,
        detectRange: 15,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[2], chance: 0.35 },
          { item: CHEST_LOOT_POOL[4], chance: 0.5 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // 14. Kaldera Naga Api: Magma Drakes & Ancient Dragon Titan Guardian
    const dragonPositions: [number, number][] = [
      [10, -135],
      [32, -140],
      [8, -155],
      [28, -152],
    ];
    dragonPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('magma_slime');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `caldera_drake_${idx}`,
        name: 'Infernal Magma Drake',
        nameId: 'Naga Lava Pijar Kaldera',
        type: 'magma_slime',
        level: 7,
        hp: 210,
        maxHp: 210,
        attack: 30,
        defense: 12,
        expReward: 175,
        goldReward: 95,
        speed: 2.8,
        attackRange: 2.6,
        detectRange: 17,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[0], chance: 0.25 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
      });
    });

    // Dragonfang Super Boss: Sang Naga Tulang Neraka (Inferno Bone Wyrm Titan)
    const wyrmPos: [number, number] = [20, -145];
    const { group: wyrmGroup, parts: wyrmParts } = createEnemyMesh('boss');
    const wyrmY = this.world.getTerrainHeight(wyrmPos[0], wyrmPos[1]);
    wyrmGroup.position.set(wyrmPos[0], wyrmY, wyrmPos[1]);
    this.scene.add(wyrmGroup);

    const wyrmData: EnemyData = {
      id: 'boss_dragonfang',
      name: 'Infernal Dragonfang Colossus',
      nameId: 'Raksasa Tulang Naga Neraka',
      type: 'boss',
      level: 8,
      hp: 680,
      maxHp: 680,
      attack: 38,
      defense: 18,
      expReward: 700,
      goldReward: 500,
      speed: 2.6,
      attackRange: 5.0,
      detectRange: 28,
      position: [wyrmPos[0], wyrmY, wyrmPos[1]],
      isDead: false,
      dropItems: [
        { item: CHEST_LOOT_POOL[0], chance: 1.0 },
        { item: CHEST_LOOT_POOL[1], chance: 1.0 },
      ],
    };

    this.enemies.push({
      data: wyrmData,
      mesh: wyrmGroup,
      parts: wyrmParts,
      baseY: wyrmY,
      attackCooldown: 0,
      walkCycle: 0,
    });
  }

  // Fast travel / teleport from map
  public teleportTo(x: number, z: number) {
    const y = Math.max(0.5, this.world.getTerrainHeight(x, z) + 0.5);
    this.playerPos.set(x, y, z);
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;
    this.playerMesh.group.position.copy(this.playerPos);
    this.camera.position.set(x, y + 5.5, z + 7.5);
    this.camera.lookAt(x, y + 1.2, z);
    soundManager.playLevelUp();
    this.callbacks.onAddFloatingText('Teleportasi Berhasil!', '#00e5ff', 'info');
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('blur', this.handleBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.handleMouseDown);
    dom.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    dom.addEventListener('wheel', this.handleWheel, { passive: false });

    // Touch support for camera swipe
    dom.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleBlur = () => {
    this.resetKeys();
  };

  public resetKeys() {
    this.keys = {};
    this.joystickVector = { x: 0, y: 0 };
    this.isMouseDown = false;
  }

  public isKeyPressed(...names: string[]): boolean {
    for (const name of names) {
      const lower = name.toLowerCase();
      if (this.keys[lower] || this.keys[name]) return true;
    }
    return false;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const code = e.code.toLowerCase();

    this.keys[key] = true;
    this.keys[code] = true;

    // Prevent scrolling with arrows or space
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(code) || ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      e.preventDefault();
    }

    if (key === 'f' || code === 'keyf') {
      this.checkInteract();
    } else if (key === 'j' || code === 'keyj') {
      this.performBasicAttack();
    } else if (key === ' ' || code === 'space') {
      this.jumpOrDodge();
    } else if (key === 'q' || code === 'keyq') {
      this.castSkill(1);
    } else if (key === 'e' || code === 'keye') {
      this.castSkill(2);
    } else if (key === 'r' || code === 'keyr') {
      this.castSkill(3);
    } else if (key === 'x' || code === 'keyx' || key === 't' || code === 'keyt') {
      this.switchHunterWeapon();
    }
  };

  public switchHunterWeapon(targetMode?: 'dagger' | 'bow') {
    if (this.charClass !== 'rogue') return;
    this.hunterWeaponMode = targetMode || (this.hunterWeaponMode === 'dagger' ? 'bow' : 'dagger');
    if (this.playerMesh.setHunterWeaponMode) {
      this.playerMesh.setHunterWeaponMode(this.hunterWeaponMode);
    }
    if (this.hunterWeaponMode === 'bow') {
      soundManager.playBowDraw();
      this.callbacks.onAddFloatingText('Mode Senjata: Busur & Panah Pemburu 🏹', '#34d399', 'info');
    } else {
      soundManager.playRogueDoubleSlash();
      this.callbacks.onAddFloatingText('Mode Senjata: Belati Bayangan 🗡️', '#10b981', 'info');
    }
    if (this.callbacks.onHunterWeaponSwitch) {
      this.callbacks.onHunterWeaponSwitch(this.hunterWeaponMode);
    }
  }

  public getHunterWeaponMode(): 'dagger' | 'bow' {
    return this.hunterWeaponMode;
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const code = e.code.toLowerCase();

    this.keys[key] = false;
    this.keys[code] = false;
  };

  private isDraggingCamera = false;

  private handleMouseDown = (e: MouseEvent) => {
    this.isMouseDown = true;
    this.isDraggingCamera = false;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isMouseDown) return;
    const deltaX = e.clientX - this.prevMouseX;
    const deltaY = e.clientY - this.prevMouseY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      this.isDraggingCamera = true;
    }

    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    this.cameraAngleH -= deltaX * 0.007;
    this.cameraAngleV += deltaY * 0.005;
    this.cameraAngleV = Math.max(0.08, Math.min(Math.PI / 2.15, this.cameraAngleV));
  };

  private handleMouseUp = (e: MouseEvent) => {
    // If left-click and user didn't drag the camera, perform normal attack
    if (this.isMouseDown && !this.isDraggingCamera && e.button === 0) {
      this.performBasicAttack();
    }
    this.isMouseDown = false;
    this.isDraggingCamera = false;
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.cameraDistance += e.deltaY * 0.006;
    this.cameraDistance = Math.max(3.5, Math.min(14, this.cameraDistance));
  };

  private touchStartX = 0;
  private touchStartY = 0;
  private isTouchingCamera = false;

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      // Only swipe if on right half of screen
      if (touch.clientX > window.innerWidth * 0.35) {
        this.isTouchingCamera = true;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      }
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.isTouchingCamera || e.touches.length === 0) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;

    this.cameraAngleH -= deltaX * 0.008;
    this.cameraAngleV += deltaY * 0.006;
    this.cameraAngleV = Math.max(0.1, Math.min(Math.PI / 2.2, this.cameraAngleV));
  };

  private handleTouchEnd = () => {
    this.isTouchingCamera = false;
  };

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // --- Combat VFX and Helpers ---
  public triggerCameraShake(intensity = 0.2) {
    this.cameraShake = Math.max(this.cameraShake, intensity);
  }

  private addVfx(object: THREE.Object3D, update: (delta: number) => boolean) {
    // Lightweight rendering optimization: prune oldest VFX if pool exceeds 75 to keep 60 FPS
    if (this.activeVfx.length > 75) {
      const oldest = this.activeVfx.shift();
      if (oldest) {
        this.scene.remove(oldest.object);
      }
    }
    this.scene.add(object);
    this.activeVfx.push({ object, update });
  }

  // Radiant 4-pointed Starburst Cross on Crits and Heavy Impacts
  private spawnHitStarburst(position: THREE.Vector3, color: number, scale = 1.0) {
    const group = new THREE.Group();
    group.position.copy(position);

    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const geomV = new THREE.PlaneGeometry(0.12 * scale, 1.4 * scale);
    const geomH = new THREE.PlaneGeometry(1.4 * scale, 0.12 * scale);
    const beamV = new THREE.Mesh(geomV, mat);
    const beamH = new THREE.Mesh(geomH, mat);
    group.add(beamV, beamH);

    // Glowing core sphere
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 8, 8), coreMat);
    group.add(core);

    // Face camera
    group.quaternion.copy(this.camera.quaternion);

    let life = 0.2;
    const maxLife = 0.2;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      const progress = 1 - life / maxLife;
      const s = 0.5 + progress * 0.85;
      group.scale.set(s, s, s);
      mat.opacity = (life / maxLife) * 0.95;
      return true;
    });
  }

  // Visual layered crescent slash wave (incandescent core + dynamic outer energy ribbon)
  private spawnCrescentSlash(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    tiltZ: number,
    color: number,
    radius = 1.4,
    arcAngle = Math.PI * 0.82
  ) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = Math.atan2(direction.x, direction.z);
    group.rotation.z = tiltZ;
    group.rotation.x = 0.18;

    // Outer colored energy ribbon
    const outerGeom = new THREE.RingGeometry(radius * 0.62, radius, 32, 1, -arcAngle / 2, arcAngle);
    const outerMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    group.add(outerMesh);

    // Inner blazing white incandescent cutting razor edge
    const innerGeom = new THREE.RingGeometry(radius * 0.84, radius * 1.02, 32, 1, -arcAngle / 2, arcAngle);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    innerMesh.position.z = 0.02;
    group.add(innerMesh);

    let life = 0.24;
    const maxLife = 0.24;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      const progress = 1 - life / maxLife;
      const scale = 0.72 + progress * 0.72;
      group.scale.set(scale, scale, scale);
      outerMat.opacity = (life / maxLife) * 0.88;
      innerMat.opacity = (life / maxLife) * 0.95;
      group.position.addScaledVector(direction, delta * 3.2);
      return true;
    });
  }

  // Particle sparks
  private spawnSparks(position: THREE.Vector3, color: number, count = 8, speed = 4) {
    const group = new THREE.Group();
    group.position.copy(position);

    const particles: { mesh: THREE.Mesh; vel: THREE.Vector3 }[] = [];
    const geom = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geom, mat);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 1.0,
        (Math.random() - 0.5) * speed
      );
      group.add(mesh);
      particles.push({ mesh, vel });
    }

    let life = 0.35;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      const opacity = life / 0.35;
      particles.forEach((p) => {
        p.vel.y -= 12 * delta; // gravity
        p.mesh.position.addScaledVector(p.vel, delta);
        p.mesh.rotation.x += delta * 6;
        p.mesh.rotation.y += delta * 6;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      });
      return true;
    });
  }

  // Shockwave Ring on Ground
  private spawnShockwaveRing(position: THREE.Vector3, color: number, maxRadius = 4.5, duration = 0.4) {
    const geom = new THREE.RingGeometry(0.3, 0.65, 32);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geom, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y += 0.08;

    let elapsed = 0;
    this.addVfx(ring, (delta) => {
      elapsed += delta;
      if (elapsed >= duration) {
        this.scene.remove(ring);
        return false;
      }
      const progress = elapsed / duration;
      const scale = 1 + progress * (maxRadius / 0.65);
      ring.scale.set(scale, scale, scale);
      mat.opacity = (1 - progress) * 0.9;
      return true;
    });
  }

  // Footstep VFX
  private spawnFootstepVfx(type: 'dust' | 'arcane' | 'shadow') {
    const footPos = this.playerPos.clone();
    footPos.y += 0.05;

    if (type === 'dust') {
      this.spawnSparks(footPos, 0xd4b483, 3, 1.2);
    } else if (type === 'arcane') {
      const geom = new THREE.RingGeometry(0.08, 0.22, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const rune = new THREE.Mesh(geom, mat);
      rune.rotation.x = -Math.PI / 2;
      rune.position.copy(footPos);

      let life = 0.45;
      this.addVfx(rune, (delta) => {
        life -= delta;
        if (life <= 0) {
          this.scene.remove(rune);
          return false;
        }
        mat.opacity = (life / 0.45) * 0.8;
        rune.scale.multiplyScalar(1 + delta * 0.6);
        return true;
      });
    } else if (type === 'shadow') {
      const geom = new THREE.DodecahedronGeometry(0.18, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x052e16 : 0x18181b,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      const smoke = new THREE.Mesh(geom, mat);
      smoke.position.copy(footPos);

      let life = 0.35;
      this.addVfx(smoke, (delta) => {
        life -= delta;
        if (life <= 0) {
          this.scene.remove(smoke);
          return false;
        }
        smoke.position.y += delta * 0.8;
        smoke.scale.multiplyScalar(1 + delta * 1.5);
        mat.opacity = (life / 0.35) * 0.65;
        return true;
      });
    }
  }

  // --- Role-Specific Attack VFX Spawners ---

  // 1. Warrior Basic Slash VFX (Dynamic angles, layered glowing arcs, and ground dust)
  private spawnWarriorSlashVfx(comboIndex = 0) {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const spawnPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(1.25)).add(new THREE.Vector3(0, 1.25, 0));

    if (comboIndex === 0) {
      // Combo 1: Downward sweeping right-to-left cleave
      this.spawnCrescentSlash(spawnPos, fwd, -0.45, 0xfbbf24, 1.5, Math.PI * 0.88);
      this.spawnSparks(spawnPos, 0xf59e0b, 8, 3.8);
      this.spawnSparks(spawnPos, 0xffffff, 4, 3.0);
    } else {
      // Combo 2: Rising uppercut left-to-right cleave
      this.spawnCrescentSlash(spawnPos, fwd, 0.5, 0xf59e0b, 1.6, Math.PI * 0.9);
      this.spawnSparks(spawnPos, 0xfbbf24, 10, 4.2);
      this.spawnSparks(spawnPos, 0xffedd5, 4, 3.5);
    }

    // Ground shock dust
    this.spawnShockwaveRing(this.playerPos.clone().add(fwd.clone().multiplyScalar(0.8)), 0xfbbf24, 1.8, 0.25);
  }

  // 2. Warrior Whirlwind VFX (Triple-tiered fiery vortex with swirling energy columns & dust)
  private spawnWarriorWhirlwindVfx() {
    const group = new THREE.Group();
    group.position.copy(this.playerPos);

    // 3 Whirlwind rings at different heights
    const ringTiers: { mesh: THREE.Mesh; speed: number }[] = [];
    const heights = [0.6, 1.3, 2.0];
    const radii = [2.4, 2.8, 2.2];

    heights.forEach((h, idx) => {
      const geom = new THREE.TorusGeometry(radii[idx], 0.12, 8, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0xf59e0b : 0xfbbf24,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geom, mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h;
      group.add(ring);
      ringTiers.push({ mesh: ring, speed: (idx % 2 === 0 ? 1 : -1) * (18 + idx * 4) });
    });

    // Swirling vertical energy cylinder with golden bands
    const cylGeom = new THREE.CylinderGeometry(2.6, 2.0, 2.2, 24, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cylinder = new THREE.Mesh(cylGeom, cylMat);
    cylinder.position.y = 1.3;
    group.add(cylinder);

    let life = 0.58;
    const maxLife = 0.58;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      group.position.copy(this.playerPos);
      ringTiers.forEach((t) => {
        t.mesh.rotation.z += delta * t.speed;
      });
      cylinder.rotation.y += delta * 12;

      const progress = 1 - life / maxLife;
      const scale = 1.0 + progress * 1.3;
      group.scale.set(scale, 1, scale);

      const op = life / maxLife;
      ringTiers.forEach((t) => {
        (t.mesh.material as THREE.MeshBasicMaterial).opacity = op * 0.9;
      });
      cylMat.opacity = op * 0.35;
      return true;
    });

    this.spawnShockwaveRing(this.playerPos, 0xfbbf24, 5.2, 0.55);
    this.spawnShockwaveRing(this.playerPos, 0xffffff, 3.8, 0.4);
    this.spawnSparks(this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xf59e0b, 20, 5);
    this.triggerCameraShake(0.28);
  }

  // 3. Warrior Holy Shield Charge VFX (Aegis barrier, supersonic wind streaks, and concussive shockwave)
  private spawnWarriorShieldChargeVfx() {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const shieldGroup = new THREE.Group();

    // Curved golden Aegis shield
    const geom = new THREE.BoxGeometry(2.0, 2.4, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const shield = new THREE.Mesh(geom, mat);
    shieldGroup.add(shield);

    // Glowing Cross Crest
    const crossGeom = new THREE.BoxGeometry(0.5, 1.8, 0.15);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cross1 = new THREE.Mesh(crossGeom, crossMat);
    const cross2 = new THREE.Mesh(crossGeom, crossMat);
    cross2.rotation.z = Math.PI / 2;
    cross2.scale.set(0.65, 0.65, 1);
    cross1.position.z = 0.05;
    cross2.position.z = 0.05;
    shieldGroup.add(cross1, cross2);

    // 4 Supersonic wind trails
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const streak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), streakMat);
      const ox = (i % 2 === 0 ? 1 : -1) * (0.8 + Math.random() * 0.4);
      const oy = i < 2 ? 0.6 : -0.6;
      streak.position.set(ox, oy, -0.6);
      shieldGroup.add(streak);
    }

    shieldGroup.rotation.y = this.playerRotationY;

    let life = 0.42;
    const maxLife = 0.42;
    this.addVfx(shieldGroup, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(shieldGroup);
        return false;
      }
      shieldGroup.position
        .copy(this.playerPos)
        .add(fwd.clone().multiplyScalar(1.3))
        .add(new THREE.Vector3(0, 1.35, 0));
      const op = life / maxLife;
      mat.opacity = op * 0.85;
      streakMat.opacity = op * 0.7;
      return true;
    });

    this.spawnShockwaveRing(this.playerPos, 0xfacc15, 3.2, 0.35);
    this.triggerCameraShake(0.22);
  }

  // 4. Warrior Iron Fortress VFX (Sacred Geodesic Sanctuary Dome, rotating runes & floating aegis shields)
  private spawnWarriorIronFortressVfx() {
    const group = new THREE.Group();
    group.position.copy(this.playerPos);

    // Luminous Geodesic Dome
    const domeGeom = new THREE.SphereGeometry(3.4, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    group.add(dome);

    // Wireframe hexagon grid overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const domeWire = new THREE.Mesh(domeGeom, wireMat);
    group.add(domeWire);

    // Dual concentric holy ground runes
    const rune1Mat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rune1 = new THREE.Mesh(new THREE.RingGeometry(1.4, 3.4, 32), rune1Mat);
    rune1.rotation.x = -Math.PI / 2;
    rune1.position.y = 0.06;

    const rune2Mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rune2 = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.2, 24), rune2Mat);
    rune2.rotation.x = -Math.PI / 2;
    rune2.position.y = 0.08;
    group.add(rune1, rune2);

    // 4 Orbiting Golden Aegis Shields
    const shieldOrbitGroup = new THREE.Group();
    shieldOrbitGroup.position.y = 1.4;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const sh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.0, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      sh.position.set(Math.cos(angle) * 3.1, 0, Math.sin(angle) * 3.1);
      sh.rotation.y = -angle;
      shieldOrbitGroup.add(sh);
    }
    group.add(shieldOrbitGroup);

    let life = 1.8;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      group.position.copy(this.playerPos);
      rune1.rotation.z += delta * 1.2;
      rune2.rotation.z -= delta * 1.8;
      shieldOrbitGroup.rotation.y += delta * 2.2;

      const op = Math.min(1, life / 0.5);
      domeMat.opacity = op * 0.5;
      wireMat.opacity = op * 0.4;
      rune1Mat.opacity = op * 0.85;
      rune2Mat.opacity = op * 0.8;
      return true;
    });

    this.spawnShockwaveRing(this.playerPos, 0xfde047, 4.2, 0.5);
    this.spawnSparks(this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfef08a, 16, 3.5);
    this.triggerCameraShake(0.24);
  }

  // 5. Mage Arcane Bolt (Ranged Projectile with orbiting crystals and starlight core)
  private spawnMageArcaneBolt() {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const spawnPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(1.0)).add(new THREE.Vector3(0, 1.6, 0));

    const group = new THREE.Group();
    group.position.copy(spawnPos);

    // Core glowing white starlight sphere
    const coreGeom = new THREE.SphereGeometry(0.22, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeom, coreMat);
    group.add(core);

    // Inner Arcane cyan aura
    const cyanGeom = new THREE.SphereGeometry(0.36, 12, 12);
    const cyanMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const cyan = new THREE.Mesh(cyanGeom, cyanMat);
    group.add(cyan);

    // Outer Astral violet corona
    const auraGeom = new THREE.SphereGeometry(0.48, 10, 10);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const aura = new THREE.Mesh(auraGeom, auraMat);
    group.add(aura);

    // 3 Orbiting mini mana crystal satellites
    const crystalOrbit = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.1, 0),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
      );
      crystal.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
      crystalOrbit.add(crystal);
    }
    group.add(crystalOrbit);

    this.scene.add(group);

    this.callbacks.onUpdateStats((stats) => {
      const isCrit = Math.random() < 0.2 + stats.intelligence * 0.015;
      const tierMult = 1 + (this.playerTier - 1) * 0.25;
      const baseDmg = (stats.baseAttack + stats.intelligence * 2.2) * tierMult;
      const finalDmg = Math.round(isCrit ? baseDmg * 1.85 : baseDmg);

      this.activeProjectiles.push({
        object: group,
        direction: fwd.clone().normalize(),
        speed: 24.0,
        lifetime: 1.0,
        damage: finalDmg,
        isCrit,
        vfxType: 'arcane_bolt',
      });

      return stats;
    });

    // Muzzle flash burst
    this.spawnSparks(spawnPos, 0x38bdf8, 8, 3.5);
  }

  // 6. Mage Supernova Astral VFX (Celestial Pillar, Concentric Cosmic Shockwaves & Radial Astral Beams)
  private spawnMageNovaVfx() {
    const center = this.playerPos.clone();

    // 1. Concentric shockwaves
    this.spawnShockwaveRing(center, 0xffffff, 3.6, 0.3);
    this.spawnShockwaveRing(center, 0x38bdf8, 5.2, 0.42);
    this.spawnShockwaveRing(center, 0xc084fc, 6.8, 0.55);

    // 2. Vertical celestial light beam descending from the heavens
    const beamGeom = new THREE.CylinderGeometry(0.8, 1.4, 18, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.copy(center);
    beam.position.y += 9;

    let beamLife = 0.45;
    this.addVfx(beam, (delta) => {
      beamLife -= delta;
      if (beamLife <= 0) {
        this.scene.remove(beam);
        return false;
      }
      beam.rotation.y += delta * 6;
      beamMat.opacity = (beamLife / 0.45) * 0.8;
      return true;
    });

    // 3. 8 Radiant Starlight Rays along the ground
    const raysGroup = new THREE.Group();
    raysGroup.position.copy(center);
    raysGroup.position.y += 0.08;
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 5.8), rayMat);
      ray.rotation.x = -Math.PI / 2;
      ray.rotation.z = angle;
      ray.position.set(Math.cos(angle) * 2.9, 0, Math.sin(angle) * 2.9);
      raysGroup.add(ray);
    }

    let rayLife = 0.38;
    this.addVfx(raysGroup, (delta) => {
      rayLife -= delta;
      if (rayLife <= 0) {
        this.scene.remove(raysGroup);
        return false;
      }
      rayMat.opacity = (rayLife / 0.38) * 0.9;
      return true;
    });

    // 4. Copious cosmic stardust particles
    this.spawnSparks(center.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xa855f7, 20, 6);
    this.spawnSparks(center.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x38bdf8, 18, 5.5);
    this.spawnSparks(center.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffffff, 10, 4.5);
    this.triggerCameraShake(0.42);
  }

  // 7. Mage Arcane Blink VFX (Spiral Void Implosion + Prismatic Flash + Ethereal Tracer Streak)
  private spawnMageBlinkVfx(startPos: THREE.Vector3, endPos: THREE.Vector3) {
    // Start burst (imploding void spiral)
    this.spawnShockwaveRing(startPos, 0xa855f7, 2.6, 0.28);
    this.spawnSparks(startPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xa855f7, 14, 4.5);

    // Ethereal tracer beam connecting departure and arrival
    const dist = startPos.distanceTo(endPos);
    const midPos = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    midPos.y += 1.2;

    const tracerGeom = new THREE.CylinderGeometry(0.1, 0.1, dist, 8);
    const tracerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const tracer = new THREE.Mesh(tracerGeom, tracerMat);
    tracer.position.copy(midPos);
    tracer.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3().subVectors(endPos, startPos).normalize()
    );

    let tracerLife = 0.22;
    this.addVfx(tracer, (delta) => {
      tracerLife -= delta;
      if (tracerLife <= 0) {
        this.scene.remove(tracer);
        return false;
      }
      tracerMat.opacity = (tracerLife / 0.22) * 0.9;
      return true;
    });

    // End arrival burst (prismatic starlight bloom)
    this.spawnShockwaveRing(endPos, 0x38bdf8, 3.8, 0.35);
    this.spawnShockwaveRing(endPos, 0xffffff, 2.2, 0.25);
    this.spawnSparks(endPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x38bdf8, 18, 5.5);
    this.spawnSparks(endPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffffff, 8, 4.0);
    this.triggerCameraShake(0.18);
  }

  // 8. Mage Celestial Heal Light Pillar (Angelic Light Pillar, Sacred Astral Rune Rings & Raining Stardust)
  private spawnMageCelestialHealVfx() {
    const center = this.playerPos.clone();
    const group = new THREE.Group();
    group.position.copy(center);

    // Double-layered Cylinder Light Pillar
    const beamGeom = new THREE.CylinderGeometry(1.8, 2.0, 14, 20, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = 7;
    group.add(beam);

    const innerBeamGeom = new THREE.CylinderGeometry(0.8, 0.8, 14, 16, 1, true);
    const innerBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerBeam = new THREE.Mesh(innerBeamGeom, innerBeamMat);
    innerBeam.position.y = 7;
    group.add(innerBeam);

    // 2 Floating rune rings ascending the pillar
    const runeGeom = new THREE.RingGeometry(1.2, 2.2, 24);
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const rune1 = new THREE.Mesh(runeGeom, runeMat);
    rune1.rotation.x = Math.PI / 2;
    rune1.position.y = 1.0;
    const rune2 = new THREE.Mesh(runeGeom, runeMat);
    rune2.rotation.x = Math.PI / 2;
    rune2.position.y = 3.5;
    group.add(rune1, rune2);

    let life = 1.2;
    const maxLife = 1.2;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      group.position.x = this.playerPos.x;
      group.position.z = this.playerPos.z;
      beam.rotation.y += delta * 2.5;
      innerBeam.rotation.y -= delta * 3.5;
      rune1.rotation.z += delta * 3.0;
      rune2.rotation.z -= delta * 3.0;
      rune1.position.y += delta * 2.0;
      rune2.position.y += delta * 2.0;

      const op = life / maxLife;
      beamMat.opacity = op * 0.7;
      innerBeamMat.opacity = op * 0.85;
      runeMat.opacity = op * 0.9;
      return true;
    });

    this.spawnShockwaveRing(center, 0x67e8f9, 4.2, 0.7);
    this.spawnShockwaveRing(center, 0xffffff, 2.5, 0.5);
    this.spawnSparks(center.clone().add(new THREE.Vector3(0, 1.6, 0)), 0x67e8f9, 20, 3.5);
    this.spawnSparks(center.clone().add(new THREE.Vector3(0, 1.6, 0)), 0xffffff, 10, 2.5);
    this.triggerCameraShake(0.18);
  }

  // 9. Rogue X-Slash VFX (Dual crossing emerald & shadow blades with intersection starburst)
  private spawnRogueXSlashVfx() {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const spawnPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(1.05)).add(new THREE.Vector3(0, 1.2, 0));

    // Blade 1: Emerald razor arc tilted +40°
    this.spawnCrescentSlash(spawnPos, fwd, 0.7, 0x10b981, 1.35, Math.PI * 0.75);
    // Blade 2: Shadow-violet razor arc tilted -40°
    this.spawnCrescentSlash(spawnPos, fwd, -0.7, 0x6366f1, 1.35, Math.PI * 0.75);

    // Focal intersection starburst
    this.spawnHitStarburst(spawnPos, 0x34d399, 0.9);
    this.spawnSparks(spawnPos, 0x34d399, 12, 4.0);
    this.spawnSparks(spawnPos, 0x818cf8, 8, 3.2);
    this.triggerCameraShake(0.15);
  }

  // 10. Rogue Shadow Flurry VFX (Rapid multi-strike phantom daggers & shadow arcs)
  private spawnRogueShadowFlurryVfx() {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!this.isRunning) return;
        const offsetFwd = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.65);
        const spawnPos = this.playerPos
          .clone()
          .add(offsetFwd.clone().multiplyScalar(1.0 + Math.random() * 0.6))
          .add(new THREE.Vector3(0, 0.9 + Math.random() * 0.7, 0));

        const color = i % 3 === 0 ? 0x10b981 : i % 3 === 1 ? 0x6366f1 : 0x34d399;
        this.spawnCrescentSlash(spawnPos, offsetFwd, (Math.random() - 0.5) * 1.6, color, 1.2, Math.PI * 0.7);
        this.spawnSparks(spawnPos, color, 6, 3.5);
        this.triggerCameraShake(0.08);
      }, i * 55);
    }
  }

  // 11. Rogue Shadow Step VFX (Shadow Decoy Silhouettes with fading smoke trails)
  private spawnRogueShadowStepVfx(startPos: THREE.Vector3, fwd: THREE.Vector3) {
    for (let i = 1; i <= 4; i++) {
      const decoyPos = startPos.clone().add(fwd.clone().multiplyScalar(i * 3.0));
      const group = new THREE.Group();
      group.position.copy(decoyPos);
      group.position.y += 0.85;
      group.rotation.y = this.playerRotationY;

      // Shadow silhouette
      const mat = new THREE.MeshBasicMaterial({
        color: 0x064e3b,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), mat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mat);
      head.position.y = 0.7;
      group.add(torso, head);

      let life = 0.4;
      this.addVfx(group, (delta) => {
        life -= delta;
        if (life <= 0) {
          this.scene.remove(group);
          return false;
        }
        mat.opacity = (life / 0.4) * 0.75;
        group.scale.multiplyScalar(1 + delta * 0.6);
        return true;
      });

      this.spawnFootstepVfx('shadow');
      this.spawnSparks(decoyPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x10b981, 4, 2.0);
    }
  }

  // 12. Rogue Smoke Cloak VFX (Volumetric expanding toxic ninja smoke screen & spore motes)
  private spawnRogueSmokeCloakVfx() {
    const group = new THREE.Group();
    group.position.copy(this.playerPos);

    for (let i = 0; i < 16; i++) {
      const geom = new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.5, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0x064e3b : i % 3 === 1 ? 0x059669 : 0x18181b,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const puff = new THREE.Mesh(geom, mat);
      puff.position.set(
        (Math.random() - 0.5) * 3.6,
        Math.random() * 1.8 + 0.3,
        (Math.random() - 0.5) * 3.6
      );
      group.add(puff);
    }

    let life = 1.5;
    const maxLife = 1.5;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      group.children.forEach((child) => {
        child.position.y += delta * 0.7;
        child.scale.multiplyScalar(1 + delta * 0.9);
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (life / maxLife) * 0.75;
      });
      return true;
    });

    this.spawnShockwaveRing(this.playerPos, 0x10b981, 4.4, 0.65);
    this.spawnSparks(this.playerPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0x34d399, 16, 3.5);
    this.triggerCameraShake(0.18);
  }

  // Helper to dynamically align player facing direction to active movement or closest 360° enemy
  private alignPlayerOrientationToInputOrTarget(maxTargetRange = 18): void {
    let inputForward = 0;
    let inputRight = 0;
    if (this.isKeyPressed('w', 'arrowup')) inputForward += 1;
    if (this.isKeyPressed('s', 'arrowdown')) inputForward -= 1;
    if (this.isKeyPressed('a', 'arrowleft')) inputRight -= 1;
    if (this.isKeyPressed('d', 'arrowright')) inputRight += 1;

    if (this.joystickVector && (Math.abs(this.joystickVector.x) > 0.05 || Math.abs(this.joystickVector.y) > 0.05)) {
      inputRight += this.joystickVector.x;
      inputForward -= this.joystickVector.y;
    }

    const camFwdX = -Math.sin(this.cameraAngleH);
    const camFwdZ = -Math.cos(this.cameraAngleH);
    const camRightX = Math.cos(this.cameraAngleH);
    const camRightZ = -Math.sin(this.cameraAngleH);

    const moveDirX = camFwdX * inputForward + camRightX * inputRight;
    const moveDirZ = camFwdZ * inputForward + camRightZ * inputRight;
    const inputMag = Math.hypot(moveDirX, moveDirZ);

    if (inputMag > 0.08) {
      // Direct attack to movement direction (depan, belakang, kiri, kanan)
      this.playerRotationY = Math.atan2(moveDirX, moveDirZ);
      this.playerMesh.group.rotation.y = this.playerRotationY;
      return;
    }

    // If standing still, lock onto closest enemy in full 360 degrees
    let closestEnemy: (typeof this.enemies)[0] | null = null;
    let minDistance = maxTargetRange;
    for (const enemy of this.enemies) {
      if (enemy.data.isDead) continue;
      const dist = this.playerPos.distanceTo(enemy.mesh.position);
      if (dist < minDistance) {
        minDistance = dist;
        closestEnemy = enemy;
      }
    }

    if (closestEnemy) {
      const dx = closestEnemy.mesh.position.x - this.playerPos.x;
      const dz = closestEnemy.mesh.position.z - this.playerPos.z;
      this.playerRotationY = Math.atan2(dx, dz);
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }
  }

  // 360-degree blade spin VFX (full circular cutting discs, radial energy spikes & sparks)
  private spawn360BladeSpinVfx(color: number, radius = 3.8) {
    const centerPos = this.playerPos.clone().add(new THREE.Vector3(0, 1.1, 0));
    const group = new THREE.Group();
    group.position.copy(centerPos);
    group.rotation.x = Math.PI / 2;

    // 1. Outer cutting saw ring
    const geomOuter = new THREE.RingGeometry(radius * 0.65, radius, 40);
    const matOuter = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ringOuter = new THREE.Mesh(geomOuter, matOuter);
    group.add(ringOuter);

    // 2. Inner incandescent sharp ring
    const geomInner = new THREE.RingGeometry(radius * 0.82, radius * 1.02, 40);
    const matInner = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const ringInner = new THREE.Mesh(geomInner, matInner);
    ringInner.position.z = 0.02;
    group.add(ringInner);

    // 3. 8 Radiant cutting spokes
    const spokeMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.PlaneGeometry(0.16, radius * 0.9), spokeMat);
      spoke.position.set(Math.cos(angle) * radius * 0.45, Math.sin(angle) * radius * 0.45, 0.01);
      spoke.rotation.z = angle + Math.PI / 2;
      group.add(spoke);
    }

    let life = 0.32;
    const maxLife = 0.32;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        return false;
      }
      const progress = 1 - life / maxLife;
      const scale = 0.6 + progress * 0.9;
      group.scale.set(scale, scale, scale);
      ringOuter.rotation.z += delta * 16;
      ringInner.rotation.z -= delta * 18;
      const op = life / maxLife;
      matOuter.opacity = op * 0.9;
      matInner.opacity = op * 0.95;
      spokeMat.opacity = op * 0.85;
      return true;
    });

    this.spawnShockwaveRing(this.playerPos, color, radius * 1.25, 0.38);
    this.spawnSparks(centerPos, color, 18, 5.5);
    this.spawnSparks(centerPos, 0xffffff, 8, 4.0);
    this.triggerCameraShake(0.24);
  }

  // Hunter Arrow Projectile Spawner (Aerodynamic Wind Spiral and sonic muzzle pop)
  private spawnHunterArrow(aimDirection?: THREE.Vector3, isSkill = false, bonusDmgMult = 1.0) {
    const fwd = aimDirection
      ? aimDirection.clone().normalize()
      : new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    const spawnPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(1.0)).add(new THREE.Vector3(0, 1.4, 0));
    const arrowObj = createArrowMesh();
    arrowObj.position.copy(spawnPos);
    arrowObj.rotation.y = Math.atan2(fwd.x, fwd.z);

    // Aerodynamic wind trail ribbon
    const trailGeom = new THREE.CylinderGeometry(0.04, 0.01, 1.2, 8);
    const trailMat = new THREE.MeshBasicMaterial({
      color: isSkill ? 0x34d399 : 0xa7f3d0,
      transparent: true,
      opacity: 0.8,
    });
    const trail = new THREE.Mesh(trailGeom, trailMat);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = -0.6;
    arrowObj.add(trail);

    this.scene.add(arrowObj);

    this.callbacks.onUpdateStats((stats) => {
      const isCrit = Math.random() < 0.22 + stats.agility * 0.015;
      const tierMult = 1 + (this.playerTier - 1) * 0.25;
      const baseDmg = (stats.baseAttack + stats.agility * 2.2) * tierMult * bonusDmgMult;
      const finalDmg = Math.round(isCrit ? baseDmg * 1.85 : baseDmg);

      this.activeProjectiles.push({
        object: arrowObj,
        direction: fwd,
        speed: isSkill ? 32.0 : 28.0,
        lifetime: 1.1,
        damage: finalDmg,
        isCrit,
        vfxType: isSkill ? 'hunter_arrow_rain' : 'hunter_arrow',
      });

      return stats;
    });
  }

  // Helper to execute melee hit detection with full 360-degree coverage
  private executeMeleeAttack(params: {
    range: number;
    coneAngle?: number;
    is360?: boolean;
    dmgMultiplier: number;
    critBonus: number;
    knockback: number;
  }) {
    const playerForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerRotationY
    );

    this.callbacks.onUpdateStats((stats) => {
      const isCrit = Math.random() < 0.15 + stats.agility * 0.01 + params.critBonus;
      let statScaling = stats.strength * 1.5;
      if (this.charClass === 'rogue') {
        statScaling = stats.agility * 1.4 + stats.strength * 0.6;
      }
      const tierMult = 1 + (this.playerTier - 1) * 0.25;
      const baseDmg = (stats.baseAttack + statScaling) * params.dmgMultiplier * tierMult;
      const finalDmg = Math.round(isCrit ? baseDmg * 1.85 : baseDmg);

      this.enemies.forEach((enemy) => {
        if (enemy.data.isDead) return;
        const enemyPos = enemy.mesh.position;
        const dist = this.playerPos.distanceTo(enemyPos);

        if (dist <= params.range) {
          const toEnemy = new THREE.Vector3().subVectors(enemyPos, this.playerPos).normalize();
          const dot = playerForward.dot(toEnemy);

          // 360-degree hit detection:
          // 1. If is360 is true (or combo 3 spin finisher), hits all 360° (front, left, right, back!)
          // 2. In close combat radius (<= 2.4m), hits all 360° regardless of angle
          // 3. Otherwise for extended reach, covers a wide sweeping ~220° arc (dot > -0.35)
          const hit =
            params.is360 ||
            dist <= 2.4 ||
            (params.coneAngle !== undefined ? dot > params.coneAngle : dot > -0.35);

          if (hit) {
            this.damageEnemy(enemy, finalDmg, isCrit, params.knockback);
            this.spawnSparks(enemyPos.clone().add(new THREE.Vector3(0, 1.2, 0)), isCrit ? 0xfacc15 : 0xff5252, 6, 3);
          }
        }
      });

      return stats;
    });
  }

  // --- Role-Specific Combat Skills & Combos ---
  public performBasicAttack() {
    if (this.isControlsLocked || this.isAttacking) return;

    // Align player facing to movement direction or closest 360° enemy
    this.alignPlayerOrientationToInputOrTarget(this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' ? 22 : 16);

    const now = performance.now();
    if (now - this.lastAttackTime > 1200) {
      this.attackComboIndex = 0;
    }
    this.lastAttackTime = now;
    const currentCombo = this.attackComboIndex;
    this.attackComboIndex = (this.attackComboIndex + 1) % 3;

    this.isAttacking = true;

    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalPlayerAttack?.({
        attackType: 'basic',
        x: Math.round(this.playerPos.x * 100) / 100,
        y: Math.round(this.playerPos.y * 100) / 100,
        z: Math.round(this.playerPos.z * 100) / 100,
        rotationY: Math.round(this.playerRotationY * 100) / 100,
      });
    }

    if (this.charClass === 'warrior') {
      if (currentCombo === 2) {
        // Combo 3 Finisher: Full 360° Spin Cleave (Hits front, left, right, back!)
        this.attackType = 'basic_spin_360';
        this.attackDuration = 0.42;
        this.attackTimer = 0.42;
        soundManager.playWarriorCleave();
        this.spawn360BladeSpinVfx(0xfbbf24, 3.8);
        this.executeMeleeAttack({
          range: 3.8,
          is360: true,
          dmgMultiplier: 1.85,
          critBonus: 0.15,
          knockback: 1.0,
        });
      } else {
        // Combo 1 & 2: Wide sweeping cleaves (front, flanks, and 360° close combat)
        this.attackType = currentCombo === 0 ? 'basic_slash_1' : 'basic_slash_2';
        this.attackDuration = 0.35;
        this.attackTimer = 0.35;
        soundManager.playWarriorCleave();
        this.spawnWarriorSlashVfx(currentCombo);
        this.executeMeleeAttack({
          range: 3.4,
          coneAngle: -0.35,
          dmgMultiplier: 1.5,
          critBonus: 0.08,
          knockback: 0.6,
        });
      }
    } else if (this.charClass === 'mage') {
      this.attackType = 'basic';
      this.attackDuration = 0.32;
      this.attackTimer = 0.32;
      soundManager.playMageBolt();
      this.spawnMageArcaneBolt();
    } else if (this.charClass === 'rogue') {
      if (this.hunterWeaponMode === 'bow') {
        // Hunter Bow & Arrow Ranged Attack
        this.attackType = 'bow_shot';
        this.attackDuration = 0.28;
        this.attackTimer = 0.28;
        soundManager.playBowShoot();
        this.spawnHunterArrow();
      } else {
        // Hunter Daggers Melee Combat
        if (currentCombo === 2) {
          // Combo 3 Finisher: 360° Shadow Blade Whirlwind Cutter (Depan, Belakang, Kiri, Kanan!)
          this.attackType = 'basic_spin_360';
          this.attackDuration = 0.32;
          this.attackTimer = 0.32;
          soundManager.playRogueDoubleSlash();
          this.spawn360BladeSpinVfx(0x10b981, 3.4);
          this.executeMeleeAttack({
            range: 3.4,
            is360: true,
            dmgMultiplier: 1.75,
            critBonus: 0.45,
            knockback: 0.5,
          });
        } else {
          // Rapid dual dagger slashes (covers front, flanks, and close 360°)
          this.attackType = currentCombo === 0 ? 'basic_slash_1' : 'basic_slash_2';
          this.attackDuration = 0.22;
          this.attackTimer = 0.22;
          soundManager.playRogueDoubleSlash();
          this.spawnRogueXSlashVfx();
          this.executeMeleeAttack({
            range: 3.0,
            coneAngle: -0.35,
            dmgMultiplier: 1.35,
            critBonus: 0.35,
            knockback: 0.25,
          });
        }
      }
    }
  }

  public castSkill(skillSlot: 1 | 2 | 3) {
    if (this.isControlsLocked) return;

    // Dynamically align facing to movement or closest 360° enemy
    this.alignPlayerOrientationToInputOrTarget(this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' ? 22 : 16);

    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalPlayerAttack?.({
        attackType: `skill_${skillSlot}`,
        skillSlot,
        x: Math.round(this.playerPos.x * 100) / 100,
        y: Math.round(this.playerPos.y * 100) / 100,
        z: Math.round(this.playerPos.z * 100) / 100,
        rotationY: Math.round(this.playerRotationY * 100) / 100,
      });
    }

    if (skillSlot === 1) {
      // Skill 1 (Cost: 15 MP)
      this.callbacks.onUpdateStats((stats) => {
        if (stats.mp < 15) {
          this.callbacks.onAddFloatingText('MP Tidak Cukup!', '#e57373', 'info');
          return stats;
        }

        if (this.charClass === 'warrior') {
          // Warrior: Pusaran Badai Baja (Full 360° Whirlwind)
          soundManager.playWarriorCleave();
          soundManager.playHeavySkill();
          this.spawnWarriorWhirlwindVfx();
          this.isAttacking = true;
          this.attackType = 'whirlwind';
          this.attackDuration = 0.55;
          this.attackTimer = 0.55;

          const skillDmg = Math.round((stats.baseAttack + stats.strength * 2.2) * 1.6);
          const radius = 4.8;
          this.enemies.forEach((enemy) => {
            if (enemy.data.isDead) return;
            if (this.playerPos.distanceTo(enemy.mesh.position) <= radius) {
              this.damageEnemy(enemy, skillDmg, true, 0.8);
            }
          });
          this.callbacks.onAddFloatingText('Pusaran Badai Baja 360°!', '#fbbf24', 'crit');
        } else if (this.charClass === 'mage') {
          // Mage: Supernova Astral (360° Arcane Nova)
          soundManager.playMageNova();
          this.spawnMageNovaVfx();
          this.isAttacking = true;
          this.attackType = 'supernova';
          this.attackDuration = 0.45;
          this.attackTimer = 0.45;

          const skillDmg = Math.round((stats.baseAttack + stats.intelligence * 2.8) * 1.7);
          const radius = 5.8;
          this.enemies.forEach((enemy) => {
            if (enemy.data.isDead) return;
            if (this.playerPos.distanceTo(enemy.mesh.position) <= radius) {
              this.damageEnemy(enemy, skillDmg, true, 0.4);
            }
          });
          this.callbacks.onAddFloatingText('Supernova Astral 360°!', '#c084fc', 'crit');
        } else if (this.charClass === 'rogue') {
          if (this.hunterWeaponMode === 'bow') {
            // Hunter Bow Skill 1: Hujan Panah Badai (5-Arrow Spread Barrage)
            soundManager.playBowShoot();
            this.isAttacking = true;
            this.attackType = 'bow_barrage';
            this.attackDuration = 0.38;
            this.attackTimer = 0.38;

            const baseFwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
            [-0.32, -0.16, 0, 0.16, 0.32].forEach((angleOffset, idx) => {
              setTimeout(() => {
                if (!this.isRunning) return;
                const arrowDir = baseFwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
                this.spawnHunterArrow(arrowDir, true, 1.45);
              }, idx * 40);
            });
            this.callbacks.onAddFloatingText('Hujan Panah Badai! 🏹', '#34d399', 'crit');
          } else {
            // Hunter Daggers Skill 1: Tarian 1000 Belati (Shadow Flurry 360°)
            soundManager.playRogueShadowFlurry();
            this.spawnRogueShadowFlurryVfx();
            this.isAttacking = true;
            this.attackType = 'flurry';
            this.attackDuration = 0.4;
            this.attackTimer = 0.4;

            const skillDmg = Math.round((stats.baseAttack + stats.agility * 2.5) * 1.5);
            this.enemies.forEach((enemy) => {
              if (enemy.data.isDead) return;
              if (this.playerPos.distanceTo(enemy.mesh.position) <= 4.0) {
                this.damageEnemy(enemy, skillDmg, true, 0.4);
              }
            });
            this.callbacks.onAddFloatingText('Tarian 1000 Belati 360°!', '#34d399', 'crit');
          }
        }

        return { ...stats, mp: stats.mp - 15 };
      });
    } else if (skillSlot === 2) {
      // Skill 2 (Cost: 15 Stamina)
      this.callbacks.onUpdateStats((stats) => {
        if (stats.stamina < 15) {
          this.callbacks.onAddFloatingText('Stamina Habis!', '#ffb74d', 'info');
          return stats;
        }

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.playerRotationY
        );

        if (this.charClass === 'warrior') {
          // Warrior: Terjangan Perisai Suci
          soundManager.playWarriorShieldSlam();
          soundManager.playDash();
          this.isDashing = true;
          this.dashTimer = 0.35;
          this.attackType = 'shield_charge';
          this.spawnWarriorShieldChargeVfx();

          this.playerVel.add(forward.clone().multiplyScalar(22));
          setTimeout(() => {
            if (!this.isRunning) return;
            this.enemies.forEach((enemy) => {
              if (enemy.data.isDead) return;
              if (this.playerPos.distanceTo(enemy.mesh.position) <= 3.2) {
                const dmg = Math.round(stats.baseAttack * 1.2 + stats.baseDefense * 1.5);
                this.damageEnemy(enemy, dmg, false, 1.4);
                this.spawnSparks(enemy.mesh.position, 0xfbbf24, 8, 4);
              }
            });
          }, 150);
          this.callbacks.onAddFloatingText('Terjangan Perisai!', '#fbbf24', 'crit');
        } else if (this.charClass === 'mage') {
          // Mage: Langkah Dimensi (Instant Blink Teleport - Works across the entire expanded world!)
          soundManager.playMageBlink();
          const startPos = this.playerPos.clone();
          const targetPos = this.playerPos.clone().add(forward.clone().multiplyScalar(12));

          // Clamp to full world boundaries (-215..315, -175..165)
          let targetX = Math.max(-215, Math.min(315, targetPos.x));
          let targetZ = Math.max(-175, Math.min(165, targetPos.z));

          // Resolve collisions so player never blinks inside walls or buildings
          const resolved = this.resolveCollisions(targetX, targetZ);
          targetPos.x = resolved.x;
          targetPos.z = resolved.z;
          targetPos.y = this.world.getTerrainHeight(targetPos.x, targetPos.z);

          this.spawnMageBlinkVfx(startPos, targetPos);
          this.playerPos.copy(targetPos);
          this.playerMesh.group.position.copy(targetPos);
          this.playerVel.set(0, 0, 0);

          this.attackType = 'blink';
          this.attackTimer = 0.2;
          this.callbacks.onAddFloatingText('Langkah Dimensi!', '#38bdf8', 'info');
        } else if (this.charClass === 'rogue') {
          if (this.hunterWeaponMode === 'bow') {
            // Hunter Bow Skill 2: Loncat Akrobatik & Tembakan Bayangan (Backflip Evasive Snipe)
            soundManager.playDash();
            soundManager.playBowShoot();
            this.isDashing = true;
            this.dashTimer = 0.3;
            this.attackType = 'bow_shot';
            this.attackDuration = 0.32;
            this.attackTimer = 0.32;

            // Leap backwards smoothly away from enemies
            this.playerVel.add(forward.clone().multiplyScalar(-18));
            this.spawnRogueShadowStepVfx(this.playerPos.clone(), forward.clone().multiplyScalar(-1));

            // Fire high-velocity piercing arrow forward
            setTimeout(() => {
              if (!this.isRunning) return;
              this.spawnHunterArrow(forward, true, 2.0);
            }, 80);

            this.callbacks.onAddFloatingText('Loncat Akrobatik & Tembakan Jitu! 🦅', '#34d399', 'info');
          } else {
            // Hunter Daggers Skill 2: Langkah Siluman Bayangan
            soundManager.playDash();
            soundManager.playRogueSmoke();
            const startPos = this.playerPos.clone();
            this.isDashing = true;
            this.dashTimer = 0.3;
            this.attackType = 'shadow_step';
            this.spawnRogueShadowStepVfx(startPos, forward);

            this.playerVel.add(forward.clone().multiplyScalar(24));
            this.callbacks.onAddFloatingText('Langkah Siluman!', '#34d399', 'info');
          }
        }

        return { ...stats, stamina: stats.stamina - 15 };
      });
    } else if (skillSlot === 3) {
      // Skill 3 (Cost: 25 MP)
      this.callbacks.onUpdateStats((stats) => {
        if (stats.mp < 25) {
          this.callbacks.onAddFloatingText('MP Tidak Cukup!', '#e57373', 'info');
          return stats;
        }

        if (this.charClass === 'warrior') {
          // Warrior: Benteng Besi Suci
          soundManager.playLevelUp();
          soundManager.playWarriorShieldSlam();
          this.spawnWarriorIronFortressVfx();
          this.isAttacking = true;
          this.attackType = 'iron_fortress';
          this.attackDuration = 0.6;
          this.attackTimer = 0.6;

          const healAmt = Math.round(55 + stats.strength * 2.5 + stats.baseDefense * 1.5);
          const newHp = Math.min(stats.maxHp, stats.hp + healAmt);

          this.enemies.forEach((enemy) => {
            if (enemy.data.isDead) return;
            if (this.playerPos.distanceTo(enemy.mesh.position) <= 3.6) {
              const push = new THREE.Vector3().subVectors(enemy.mesh.position, this.playerPos).normalize();
              enemy.mesh.position.add(push.multiplyScalar(2.0));
            }
          });

          this.callbacks.onAddFloatingText(`+${healAmt} HP (Benteng Besi)`, '#facc15', 'heal');
          return { ...stats, mp: stats.mp - 25, hp: newHp };
        } else if (this.charClass === 'mage') {
          // Mage: Hujan Cahaya Astral
          soundManager.playMagic();
          soundManager.playLevelUp();
          this.spawnMageCelestialHealVfx();
          this.isAttacking = true;
          this.attackType = 'celestial_heal';
          this.attackDuration = 0.7;
          this.attackTimer = 0.7;

          const healAmt = Math.round(75 + stats.intelligence * 4.5);
          const newHp = Math.min(stats.maxHp, stats.hp + healAmt);
          const newMp = Math.min(stats.maxMp, stats.mp - 25 + 30);

          this.callbacks.onAddFloatingText(`+${healAmt} HP & +30 Mana Astral`, '#38bdf8', 'heal');
          return { ...stats, mp: newMp, hp: newHp };
        } else if (this.charClass === 'rogue') {
          if (this.hunterWeaponMode === 'bow') {
            // Hunter Bow Skill 3: Panah Bom Racun Siluman
            soundManager.playBowShoot();
            soundManager.playRogueSmoke();
            soundManager.playLevelUp();
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
            this.isAttacking = true;
            this.attackType = 'bow_shot';
            this.attackDuration = 0.4;
            this.attackTimer = 0.4;

            this.spawnHunterArrow(forward, true, 2.4);
            this.spawnRogueSmokeCloakVfx();

            const healAmt = Math.round(50 + stats.agility * 3.0);
            const newHp = Math.min(stats.maxHp, stats.hp + healAmt);
            this.speedBuffTimer = 8.0;

            this.callbacks.onAddFloatingText(`+${healAmt} HP & Panah Bom Racun! 💣`, '#34d399', 'heal');
            return { ...stats, mp: stats.mp - 25, hp: newHp };
          } else {
            // Hunter Daggers Skill 3: Kabut Asap & Eliksir Siluman
            soundManager.playRogueSmoke();
            soundManager.playLevelUp();
            this.spawnRogueSmokeCloakVfx();
            this.isAttacking = true;
            this.attackType = 'smoke_bomb';
            this.attackDuration = 0.45;
            this.attackTimer = 0.45;

            const healAmt = Math.round(50 + stats.agility * 3.0);
            const newHp = Math.min(stats.maxHp, stats.hp + healAmt);
            this.speedBuffTimer = 8.0;

            this.callbacks.onAddFloatingText(`+${healAmt} HP & Kecepatan Bayangan!`, '#34d399', 'heal');
            return { ...stats, mp: stats.mp - 25, hp: newHp };
          }
        }

        return stats;
      });
    }
  }

  public jumpOrDodge() {
    if (this.isControlsLocked) return;
    if (this.isGrounded) {
      if (this.charClass === 'warrior') {
        this.playerVel.y = 8.2;
        this.spawnFootstepVfx('dust');
      } else if (this.charClass === 'mage') {
        this.playerVel.y = 9.2; // Floaty celestial leap
        this.spawnShockwaveRing(this.playerPos, 0x38bdf8, 2.0, 0.35);
      } else if (this.charClass === 'rogue') {
        this.playerVel.y = 9.8; // Acrobatic ninja jump
        this.spawnFootstepVfx('shadow');
        soundManager.playDash();
      }
      this.isGrounded = false;
    }
  }

  private damageEnemy(enemy: (typeof this.enemies)[0], rawDamage: number, isCrit: boolean, knockback = 0.4) {
    const defense = enemy.data.defense;
    const actualDamage = Math.max(3, rawDamage - defense);
    enemy.data.hp -= actualDamage;

    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalMonsterHit?.({
        monsterId: enemy.data.id,
        damage: actualDamage,
        isCrit,
        attackerName: this.playerName,
        newHp: Math.max(0, enemy.data.hp),
      });
    }

    const hitPos = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));

    if (isCrit) {
      soundManager.playHeavySkill();
      this.spawnHitStarburst(hitPos, 0xffea00, 1.2);
      this.spawnSparks(hitPos, 0xffea00, 16, 5.0);
      this.spawnSparks(hitPos, 0xffffff, 8, 4.0);
      this.triggerCameraShake(0.24);
    } else {
      soundManager.playHit();
      this.spawnHitStarburst(hitPos, 0xff5252, 0.7);
      this.spawnSparks(hitPos, 0xff5252, 8, 3.5);
      this.triggerCameraShake(0.06);
    }

    // Visual knockback & hurt flash
    const knockDir = new THREE.Vector3()
      .subVectors(enemy.mesh.position, this.playerPos)
      .normalize();
    enemy.mesh.position.add(knockDir.multiplyScalar(knockback));

    // Floating text
    this.callbacks.onAddFloatingText(
      `${actualDamage}${isCrit ? ' CRIT!' : ''}`,
      isCrit ? '#ffea00' : '#ff5252',
      isCrit ? 'crit' : 'damage'
    );

    // If dead
    if (enemy.data.hp <= 0 && !enemy.data.isDead) {
      enemy.data.isDead = true;
      enemy.data.hp = 0;
      this.handleEnemyDefeat(enemy);
    }
  }

  private handleEnemyDefeat(enemy: (typeof this.enemies)[0]) {
    soundManager.playEnemyDeath();

    // Reward exp and gold
    this.callbacks.onUpdateStats((stats) => {
      let exp = stats.exp + enemy.data.expReward;
      let level = stats.level;
      let maxExp = stats.maxExp;
      let statPoints = stats.statPoints;
      let maxHp = stats.maxHp;
      let maxMp = stats.maxMp;
      let hp = stats.hp;
      let mp = stats.mp;

      // Level up check
      if (exp >= maxExp) {
        level += 1;
        exp -= maxExp;
        maxExp = Math.round(maxExp * 1.5);
        statPoints += 3;
        maxHp += 15;
        maxMp += 10;
        hp = maxHp;
        mp = maxMp;

        soundManager.playLevelUp();
        this.callbacks.onAddFloatingText(`LEVEL UP! Level ${level}`, '#ffd700', 'crit');
      }

      this.callbacks.onAddFloatingText(`+${enemy.data.expReward} EXP`, '#42a5f5', 'exp');
      this.callbacks.onAddFloatingText(`+${enemy.data.goldReward} Gold`, '#ffca28', 'exp');

      return {
        ...stats,
        level,
        exp,
        maxExp,
        statPoints,
        maxHp,
        maxMp,
        hp,
        mp,
        gold: stats.gold + enemy.data.goldReward,
      };
    });

    // Check loot drops
    enemy.data.dropItems.forEach((drop) => {
      if (Math.random() <= drop.chance) {
        this.callbacks.onAddItem(drop.item);
        this.callbacks.onAddFloatingText(`Loot: ${drop.item.name}!`, '#ffd700', 'info');
      }
    });

    // Update quest progress
    this.callbacks.onUpdateQuests((quests) => {
      return quests.map((q) => {
        if (!q.completed && q.targetEnemy === enemy.data.type) {
          const nextCount = q.currentCount + 1;
          const completed = nextCount >= q.targetCount;
          if (completed) {
            this.callbacks.onAddFloatingText(`Quest Done: ${q.title}!`, '#69f0ae', 'crit');
            soundManager.playChestOpen();
          }
          return { ...q, currentCount: nextCount, completed };
        }
        return q;
      });
    });

    // Collapse animation
    let deathFall = 0;
    const collapseInterval = setInterval(() => {
      deathFall += 0.1;
      enemy.mesh.rotation.x += 0.2;
      enemy.mesh.position.y -= 0.08;
      if (deathFall > 1.2) {
        clearInterval(collapseInterval);
        this.scene.remove(enemy.mesh);
      }
    }, 40);
  }

  private checkInteract() {
    // Check all NPCs in the village and world
    if (this.world.npcs && this.world.npcs.length > 0) {
      for (const npc of this.world.npcs) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...npc.position));
        if (dist < 4.0) {
          this.callbacks.onInteractNPC(npc.dialogueId || npc.id);
          return;
        }
      }
    } else if (this.world.npc) {
      const distToNpc = this.playerPos.distanceTo(
        new THREE.Vector3(...this.world.npc.position)
      );
      if (distToNpc < 4.0) {
        this.callbacks.onInteractNPC(this.world.npc.id);
        return;
      }
    }

    // Check Chests distance
    for (const chest of this.world.chests) {
      if (!chest.opened) {
        const dist = this.playerPos.distanceTo(
          new THREE.Vector3(...chest.position)
        );
        if (dist < 3.0) {
          this.openChest(chest);
          return;
        }
      }
    }
  }

  // Prevents player from passing through buildings and obstacles
  private resolveCollisions(candidateX: number, candidateZ: number): { x: number; z: number } {
    if (!this.world.colliders || this.world.colliders.length === 0) {
      return { x: candidateX, z: candidateZ };
    }

    const playerRadius = 0.65;
    let resX = candidateX;
    let resZ = candidateZ;

    // Two-pass resolution cleanly eliminates corner catching and penetrating walls
    for (let pass = 0; pass < 2; pass++) {
      for (const col of this.world.colliders) {
        if (
          col.type === 'box' &&
          col.minX !== undefined &&
          col.maxX !== undefined &&
          col.minZ !== undefined &&
          col.maxZ !== undefined
        ) {
          const bMinX = col.minX - playerRadius;
          const bMaxX = col.maxX + playerRadius;
          const bMinZ = col.minZ - playerRadius;
          const bMaxZ = col.maxZ + playerRadius;

          if (resX >= bMinX && resX <= bMaxX && resZ >= bMinZ && resZ <= bMaxZ) {
            const dLeft = Math.abs(resX - bMinX);
            const dRight = Math.abs(bMaxX - resX);
            const dBottom = Math.abs(resZ - bMinZ);
            const dTop = Math.abs(bMaxZ - resZ);

            const minD = Math.min(dLeft, dRight, dBottom, dTop);
            if (minD === dLeft) resX = bMinX;
            else if (minD === dRight) resX = bMaxX;
            else if (minD === dBottom) resZ = bMinZ;
            else resZ = bMaxZ;
          }
        } else if (
          col.type === 'circle' &&
          col.x !== undefined &&
          col.z !== undefined &&
          col.radius !== undefined
        ) {
          const dx = resX - col.x;
          const dz = resZ - col.z;
          const dist = Math.hypot(dx, dz);
          const minDist = col.radius + playerRadius;

          if (dist < minDist) {
            if (dist > 0.001) {
              resX = col.x + (dx / dist) * minDist;
              resZ = col.z + (dz / dist) * minDist;
            } else {
              resX = col.x + minDist;
            }
          }
        }
      }
    }

    return { x: resX, z: resZ };
  }

  private openChest(chest: WorldObjects['chests'][0]) {
    chest.opened = true;
    soundManager.playChestOpen();

    // Animate lid rotating open
    let rot = 0;
    const lidAnim = setInterval(() => {
      rot += 0.12;
      chest.lid.rotation.x = -rot;
      if (rot >= Math.PI / 1.7) {
        clearInterval(lidAnim);
      }
    }, 30);

    // Pick a random reward from chest pool
    const itemIndex = Math.floor(Math.random() * CHEST_LOOT_POOL.length);
    const rewardItem = CHEST_LOOT_POOL[itemIndex];
    const goldFound = 35 + Math.floor(Math.random() * 50);

    this.callbacks.onAddItem(rewardItem);
    this.callbacks.onUpdateStats((stats) => ({ ...stats, gold: stats.gold + goldFound }));
    this.callbacks.onAddFloatingText(`Peti Terbuka: ${rewardItem.name}!`, '#ffd700', 'crit');
    this.callbacks.onAddFloatingText(`+${goldFound} Gold`, '#ffca28', 'exp');
  }

  private updatePlayer(delta: number) {
    if (this.isControlsLocked) {
      this.playerVel.x = 0;
      this.playerVel.z = 0;
      this.playerVel.y -= 22 * delta;
      this.playerPos.y += this.playerVel.y * delta;
      const groundY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
      if (this.playerPos.y <= groundY) {
        this.playerPos.y = groundY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
      this.playerMesh.group.position.copy(this.playerPos);
      return;
    }

    // 1. Calculate camera horizontal plane vectors
    // Camera forward is from camera position towards player position on XZ plane
    const camFwdX = this.playerPos.x - this.camera.position.x;
    const camFwdZ = this.playerPos.z - this.camera.position.z;
    const camLen = Math.hypot(camFwdX, camFwdZ);
    const fwdX = camLen > 0.001 ? camFwdX / camLen : 0;
    const fwdZ = camLen > 0.001 ? camFwdZ / camLen : -1;

    // Camera right vector is perpendicular in XZ plane (rotate fwd by 90deg clockwise)
    const rightX = -fwdZ;
    const rightZ = fwdX;

    // 2. Read inputs (WASD, Arrow keys, Virtual Joystick)
    let inputForward = 0; // W = forward (+), S = backward (-)
    let inputRight = 0;   // D = right (+), A = left (-)

    if (this.isKeyPressed('w', 'keyw', 'arrowup')) inputForward += 1;
    if (this.isKeyPressed('s', 'keys', 'arrowdown')) inputForward -= 1;
    if (this.isKeyPressed('d', 'keyd', 'arrowright')) inputRight += 1;
    if (this.isKeyPressed('a', 'keya', 'arrowleft')) inputRight -= 1;

    // Add joystick input (up on joystick is negative Y, meaning forward)
    if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
      inputRight += this.joystickVector.x;
      inputForward -= this.joystickVector.y;
    }

    // 3. Compose world-space movement vector
    let moveDirX = fwdX * inputForward + rightX * inputRight;
    let moveDirZ = fwdZ * inputForward + rightZ * inputRight;
    const inputMagnitude = Math.hypot(moveDirX, moveDirZ);
    const isMoving = inputMagnitude > 0.05;

    let baseSpeed = 7.0;
    if (this.charClass === 'warrior') baseSpeed = 6.8;
    else if (this.charClass === 'mage') baseSpeed = 7.3;
    else if (this.charClass === 'rogue') baseSpeed = 8.8;

    if (this.speedBuffTimer > 0) {
      this.speedBuffTimer -= delta;
      baseSpeed += 3.2;
    }

    let targetSpeed = baseSpeed;
    if (this.isDashing) {
      targetSpeed = this.charClass === 'rogue' ? 24.0 : this.charClass === 'warrior' ? 19.0 : 16.0;
    }

    if (isMoving) {
      // Normalize movement direction
      moveDirX /= inputMagnitude;
      moveDirZ /= inputMagnitude;

      this.playerVel.x = moveDirX * targetSpeed;
      this.playerVel.z = moveDirZ * targetSpeed;

      // Rotate player mesh smoothly to facing direction
      // Player mesh front faces +Z (0, 0, 1), so angle is Math.atan2(moveDirX, moveDirZ)
      const targetAngle = Math.atan2(moveDirX, moveDirZ);
      let angleDiff = targetAngle - this.playerRotationY;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.playerRotationY += angleDiff * 16 * delta;

      // Spawn movement footsteps
      if (this.isGrounded) {
        this.footstepTimer -= delta;
        if (this.footstepTimer <= 0) {
          this.footstepTimer = this.charClass === 'rogue' ? 0.22 : 0.32;
          this.spawnFootstepVfx(this.charClass === 'mage' ? 'arcane' : this.charClass === 'rogue' ? 'shadow' : 'dust');
        }
      }
    } else {
      this.playerVel.x *= 0.75;
      this.playerVel.z *= 0.75;
      if (Math.abs(this.playerVel.x) < 0.02) this.playerVel.x = 0;
      if (Math.abs(this.playerVel.z) < 0.02) this.playerVel.z = 0;
    }

    // 4. Calculate movement with building collisions & cliff climbing physics
    const oldX = this.playerPos.x;
    const oldZ = this.playerPos.z;
    const currentGroundY = this.world.getTerrainHeight(oldX, oldZ);

    let nextX = oldX + this.playerVel.x * delta;
    let nextZ = oldZ + this.playerVel.z * delta;

    // 4a. Resolve building and obstacle colliders (no passing through buildings)
    const resolved = this.resolveCollisions(nextX, nextZ);
    nextX = resolved.x;
    nextZ = resolved.z;

    // 4b. Terrain slope & Cliff climbing physics
    const targetGroundY = this.world.getTerrainHeight(nextX, nextZ);
    const heightDiff = targetGroundY - currentGroundY;
    const horizDist = Math.hypot(nextX - oldX, nextZ - oldZ);
    const slope = horizDist > 0.001 ? heightDiff / horizDist : 0;

    // Normal hill slopes and mountain inclines can be traversed smoothly
    if (heightDiff > 1.3 && slope > 3.2) {
      // Sheer cliff wall!
      const canMantle = !this.isGrounded && (this.playerPos.y + 1.4 >= targetGroundY);

      if (!canMantle) {
        // Slide smoothly along the cliff face instead of completely locking up
        const resXOnly = this.resolveCollisions(oldX + this.playerVel.x * delta, oldZ);
        const hDiffX = this.world.getTerrainHeight(resXOnly.x, oldZ) - currentGroundY;

        const resZOnly = this.resolveCollisions(oldX, oldZ + this.playerVel.z * delta);
        const hDiffZ = this.world.getTerrainHeight(oldX, resZOnly.z) - currentGroundY;

        if (hDiffX <= 0.95 && Math.abs(this.playerVel.x) > 0.05) {
          nextX = resXOnly.x;
          nextZ = oldZ;
        } else if (hDiffZ <= 0.95 && Math.abs(this.playerVel.z) > 0.05) {
          nextX = oldX;
          nextZ = resZOnly.z;
        } else {
          // Blocked horizontally against the sheer wall
          nextX = oldX;
          nextZ = oldZ;
          this.playerVel.x *= 0.5;
          this.playerVel.z *= 0.5;
        }
      }
    } else if (heightDiff > 0.18 && slope > 1.5) {
      // Climbing a steep hill: slight realistic incline resistance
      this.playerVel.x *= 0.96;
      this.playerVel.z *= 0.96;
    }

    // Expanded World boundary constraints (Spans all biomes from X[-215..315] and Z[-175..165])
    if (nextX < -215) nextX = -215;
    if (nextX > 315) nextX = 315;
    if (nextZ < -175) nextZ = -175;
    if (nextZ > 165) nextZ = 165;

    this.playerPos.x = nextX;
    this.playerPos.z = nextZ;

    // Check quest discovery for Fortress Village Val-Kragor
    if (nextX >= 96 && Math.abs(nextZ - -17) <= 22) {
      this.callbacks.onUpdateQuests((quests) => {
        return quests.map((q) => {
          if (q.id === 'quest_discover_valkragor' && !q.completed) {
            this.callbacks.onAddFloatingText('Quest Selesai: Menemukan Benteng Val-Kragor!', '#69f0ae', 'crit');
            soundManager.playChestOpen();
            return { ...q, currentCount: 1, completed: true };
          }
          return q;
        });
      });
    }

    // Check quest discovery for Grand Imperial Kingdom of Astraea
    if (nextX >= 195 && Math.abs(nextZ - -15) <= 40) {
      this.callbacks.onUpdateQuests((quests) => {
        return quests.map((q) => {
          if (q.id === 'quest_discover_astraea' && !q.completed) {
            this.callbacks.onAddFloatingText('👑 Wilayah Ditemukan: Ibukota Kerajaan Emas Astraea!', '#facc15', 'crit');
            soundManager.playLevelUp();
            return { ...q, currentCount: 1, completed: true };
          }
          return q;
        });
      });
    }

    // Gravity
    this.playerVel.y -= 22 * delta;
    this.playerPos.y += this.playerVel.y * delta;

    // Terrain ground collision and Ocean water surface
    const groundY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
    if (this.playerPos.z > 22 && this.playerPos.x >= -65 && this.playerPos.x <= 105 && groundY < -0.2) {
      const waterSurfaceY = -0.25;
      if (this.playerPos.y <= waterSurfaceY) {
        this.playerPos.y = waterSurfaceY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
    } else {
      if (this.playerPos.y <= groundY) {
        this.playerPos.y = groundY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      } else if (this.isGrounded && this.playerPos.y - groundY < 0.65) {
        // Snap to ground on gentle slope descents to prevent floating down hills
        this.playerPos.y = groundY;
        this.playerVel.y = 0;
      }
    }

    // Update mesh position and rotation
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.rotation.y = this.playerRotationY;

    // Role-specific posture offsets
    if (this.charClass === 'mage') {
      // Gentle levitation float
      const hover = Math.sin(this.clock.getElapsedTime() * 3.5) * 0.12;
      this.playerMesh.group.position.y += hover;
      this.playerMesh.group.rotation.x = 0;
    } else if (this.charClass === 'rogue') {
      // Forward ninja prowl crouch
      this.playerMesh.group.rotation.x = isMoving ? 0.16 : 0.08;
    } else {
      this.playerMesh.group.rotation.x = 0;
    }

    // Limb animations
    if (isMoving) {
      const walkFreq = this.charClass === 'rogue' ? 15 : this.charClass === 'mage' ? 8 : 11;
      this.walkTime += delta * walkFreq;
      const legSwing = Math.sin(this.walkTime) * (this.charClass === 'mage' ? 0.35 : 0.65);

      this.playerMesh.leftLeg.rotation.x = legSwing;
      this.playerMesh.rightLeg.rotation.x = -legSwing;

      if (!this.isAttacking) {
        if (this.charClass === 'warrior') {
          // Warrior strides holding broadsword steady
          this.playerMesh.leftArm.rotation.x = -legSwing * 0.7;
          this.playerMesh.rightArm.rotation.x = 0.3 + Math.sin(this.walkTime * 0.5) * 0.15;
          this.playerMesh.rightArm.rotation.z = -0.2;
        } else if (this.charClass === 'mage') {
          // Mage glides holding staff aloft
          this.playerMesh.leftArm.rotation.x = -legSwing * 0.3;
          this.playerMesh.rightArm.rotation.x = -0.4 + Math.sin(this.clock.getElapsedTime() * 2) * 0.1;
          this.playerMesh.rightArm.rotation.z = 0;
        } else if (this.charClass === 'rogue') {
          // Rogue low ninja run with arms swept back
          this.playerMesh.leftArm.rotation.x = -0.5 - legSwing * 0.4;
          this.playerMesh.rightArm.rotation.x = -0.5 + legSwing * 0.4;
          this.playerMesh.leftArm.rotation.z = 0.25;
          this.playerMesh.rightArm.rotation.z = -0.25;
        }
      }
      this.playerMesh.cape.rotation.x = 0.35 + Math.sin(this.walkTime * 1.5) * 0.2;
    } else {
      this.playerMesh.leftLeg.rotation.x *= 0.8;
      this.playerMesh.rightLeg.rotation.x *= 0.8;
      if (!this.isAttacking) {
        if (this.charClass === 'warrior') {
          this.playerMesh.leftArm.rotation.set(0, 0, 0);
          this.playerMesh.rightArm.rotation.set(0.15, 0, -0.15);
        } else if (this.charClass === 'mage') {
          const hoverFloat = Math.sin(this.clock.getElapsedTime() * 2) * 0.08;
          this.playerMesh.leftArm.rotation.set(hoverFloat, 0, 0.15);
          this.playerMesh.rightArm.rotation.set(-0.3 + hoverFloat, 0, -0.1);
        } else if (this.charClass === 'rogue') {
          this.playerMesh.leftArm.rotation.set(0.2, 0, 0.2);
          this.playerMesh.rightArm.rotation.set(0.2, 0, -0.2);
        }
      }
      this.playerMesh.cape.rotation.x = 0.1 + Math.sin(this.clock.getElapsedTime() * 2) * 0.05;
    }

    // Role-specific attack animation
    if (this.isAttacking) {
      this.attackTimer -= delta;
      const progress = Math.max(0, this.attackTimer / (this.attackDuration || 0.35));

      if (this.attackType === 'basic_spin_360') {
        // Full 360 degree whirlwind cleave spin
        this.playerMesh.group.rotation.y = this.playerRotationY + (1 - progress) * Math.PI * 2;
        this.playerMesh.rightArm.rotation.set(-1.2, 0, -1.2);
        this.playerMesh.leftArm.rotation.set(-1.2, 0, 1.2);
      } else if (this.attackType === 'bow_shot' || this.attackType === 'bow_barrage') {
        // Hunter Bow draw and release
        this.playerMesh.leftArm.rotation.set(-1.35, 0.3, -0.15);
        const draw = Math.sin((1 - progress) * Math.PI);
        this.playerMesh.rightArm.rotation.set(-1.3, -0.4, 0.4 + draw * 0.35);
      } else if (this.charClass === 'warrior') {
        if (this.attackType === 'whirlwind') {
          // Rapid 360 degree spin
          this.playerMesh.group.rotation.y += delta * 24;
          this.playerMesh.leftArm.rotation.set(0, 0, 1.4);
          this.playerMesh.rightArm.rotation.set(0, 0, -1.4);
        } else if (this.attackType === 'shield_charge') {
          // Guard forward charge
          this.playerMesh.leftArm.rotation.set(-1.4, 0.4, 0.2);
          this.playerMesh.rightArm.rotation.set(0.3, 0, -0.5);
        } else if (this.attackType === 'iron_fortress') {
          // Shield planted down
          this.playerMesh.leftArm.rotation.set(-0.7, 0, 0.3);
          this.playerMesh.rightArm.rotation.set(-0.7, 0, -0.3);
        } else if (this.attackType === 'basic_slash_1') {
          const swing = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.rightArm.rotation.set(0.8 - swing * 2.4, 0, -0.4 + swing * 0.8);
          this.playerMesh.leftArm.rotation.set(swing * 0.4, 0, 0.2);
        } else {
          // Powerful downward cleave swing
          const swing = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.rightArm.rotation.x = 1.0 - swing * 2.8;
          this.playerMesh.leftArm.rotation.x = swing * 0.6;
        }
      } else if (this.charClass === 'mage') {
        if (this.attackType === 'supernova') {
          // Channeling both arms to sky
          this.playerMesh.leftArm.rotation.set(-2.4, 0, 0.5);
          this.playerMesh.rightArm.rotation.set(-2.4, 0, -0.5);
          this.playerMesh.group.position.y += Math.sin((1 - progress) * Math.PI) * 0.4;
        } else if (this.attackType === 'celestial_heal') {
          // Divine invocation pose
          this.playerMesh.leftArm.rotation.set(-2.2, 0, 0.3);
          this.playerMesh.rightArm.rotation.set(-2.2, 0, -0.3);
        } else {
          // Staff thrust forward casting projectile
          const cast = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.rightArm.rotation.x = -1.4 - cast * 0.4;
          this.playerMesh.leftArm.rotation.x = -0.4;
        }
      } else if (this.charClass === 'rogue') {
        if (this.attackType === 'flurry') {
          // Rapid alternating scissor blade thrusts
          const flurryPhase = Math.sin(this.attackTimer * 40);
          this.playerMesh.leftArm.rotation.x = -1.2 + flurryPhase * 0.8;
          this.playerMesh.rightArm.rotation.x = -1.2 - flurryPhase * 0.8;
          this.playerMesh.leftArm.rotation.z = 0.4;
          this.playerMesh.rightArm.rotation.z = -0.4;
        } else if (this.attackType === 'smoke_bomb') {
          // Throw smoke bomb to floor
          const throwSwing = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.rightArm.rotation.x = -2.0 + throwSwing * 2.4;
        } else if (this.attackType === 'basic_slash_1') {
          const slash = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.leftArm.rotation.set(-0.4 - slash * 1.4, 0, 0.6 - slash * 1.0);
          this.playerMesh.rightArm.rotation.set(0.6 - slash * 2.0, 0, -0.4);
        } else {
          // Dual cross scissor slash (X-Slash)
          const slash = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.leftArm.rotation.set(-0.8 - slash * 0.8, 0, 0.6 - slash * 1.0);
          this.playerMesh.rightArm.rotation.set(-0.8 - slash * 0.8, 0, -0.6 + slash * 1.0);
        }
      }

      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.attackType = null;
        this.playerMesh.leftArm.rotation.set(0, 0, 0);
        this.playerMesh.rightArm.rotation.set(0, 0, 0);
      }
    }

    // Dash timer
    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Fountain Healing area
    const distFountain = this.playerPos.distanceTo(new THREE.Vector3(0, 0, -4));
    if (distFountain < 4.2) {
      this.callbacks.onUpdateStats((stats) => {
        if (stats.hp < stats.maxHp || stats.mp < stats.maxMp) {
          const newHp = Math.min(stats.maxHp, stats.hp + 0.25);
          const newMp = Math.min(stats.maxMp, stats.mp + 0.35);
          return { ...stats, hp: newHp, mp: newMp };
        }
        return stats;
      });
    }

    // Stamina regeneration
    this.callbacks.onUpdateStats((stats) => {
      if (stats.stamina < stats.maxStamina) {
        return { ...stats, stamina: Math.min(stats.maxStamina, stats.stamina + delta * 8) };
      }
      return stats;
    });

    // Multiplayer position & transform broadcast
    if (this.gameMode === 'multiplayer') {
      this.multiplayerMoveTimer += delta;
      if (this.multiplayerMoveTimer >= 0.045) {
        this.multiplayerMoveTimer = 0;
        this.callbacks.onLocalPlayerMove?.({
          x: Math.round(this.playerPos.x * 100) / 100,
          y: Math.round(this.playerPos.y * 100) / 100,
          z: Math.round(this.playerPos.z * 100) / 100,
          rotationY: Math.round(this.playerRotationY * 100) / 100,
          isMoving,
          isRunning: this.isRunning,
          tier: this.playerTier,
        });
      }
    }

    // Check nearby prompts (NPC / Chest)
    this.updateNearbyPrompts();
  }

  private updateNearbyPrompts() {
    // Check all village NPCs
    if (this.world.npcs && this.world.npcs.length > 0) {
      for (const npc of this.world.npcs) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...npc.position));
        if (dist < 3.8) {
          let prompt = `Tekan [F] / Sentuh untuk Bicara dengan ${npc.nameId} (${npc.role})`;
          if (npc.id === 'blacksmith_torvald') {
            prompt = `Tekan [F] / Sentuh: Toko Senjata & Tempa Master Torvald 🔨`;
          } else if (npc.id === 'alchemist_anya') {
            prompt = `Tekan [F] / Sentuh: Toko Ramuan Alkimia Anya 🧪`;
          } else if (npc.id === 'villager_maya') {
            prompt = `Tekan [F] / Sentuh: Toko Zirah & Perlengkapan Maya 🛡️`;
          } else if (npc.id === 'fisherman_joko') {
            prompt = `Tekan [F] / Sentuh: Kios Hasil Laut & Bekal Pak Joko 🐟`;
          } else if (npc.id === 'villager_kael') {
            prompt = `Tekan [F] / Sentuh: Pasar Gelap Artefak Kael 🗝️`;
          } else if (npc.id === 'commander_brann') {
            prompt = `Tekan [F] / Sentuh: Komandan Brann (Panglima Benteng Val-Kragor) 🐺`;
          } else if (npc.id === 'seer_elora') {
            prompt = `Tekan [F] / Sentuh: Peramal Elora (Pemulihan & Berkat Bintang) 🔮`;
          } else if (npc.id === 'frostsmith_goran') {
            prompt = `Tekan [F] / Sentuh: Bengkel Senjata Dataran Tinggi Goran 🔨`;
          } else if (npc.id === 'guard_valkragor') {
            prompt = `Tekan [F] / Sentuh: Prajurit Penjaga Gerbang Val-Kragor 🛡️`;
          } else if (npc.id === 'emperor_aurelius') {
            prompt = `Tekan [F] / Sentuh: Paduka Kaisar Aurelius Astraea 👑`;
          } else if (npc.id === 'marshal_vane') {
            prompt = `Tekan [F] / Sentuh: Panglima Perang Vane (Legiun Kekaisaran) ⚔️`;
          } else if (npc.id === 'merchant_lyra') {
            prompt = `Tekan [F] / Sentuh: Saudagar Lyra (Toko Pusaka & Elixir Astraea) 💎`;
          } else if (npc.id === 'guard_astraea') {
            prompt = `Tekan [F] / Sentuh: Penjaga Gerbang Emas Astraea 🛡️`;
          }

          this.callbacks.onNearbyPrompt(prompt, () => {
            this.callbacks.onInteractNPC(npc.dialogueId || npc.id);
          });
          return;
        }
      }
    } else if (this.world.npc) {
      const distToNpc = this.playerPos.distanceTo(new THREE.Vector3(...this.world.npc.position));
      if (distToNpc < 3.8) {
        this.callbacks.onNearbyPrompt('Tekan [F] / Sentuh untuk Bicara dengan Tetua Vaelen', () => {
          this.callbacks.onInteractNPC(this.world.npc.id);
        });
        return;
      }
    }

    for (const chest of this.world.chests) {
      if (!chest.opened) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...chest.position));
        if (dist < 3.0) {
          this.callbacks.onNearbyPrompt('Tekan [F] / Sentuh untuk Buka Peti Harta Karun', () => {
            this.openChest(chest);
          });
          return;
        }
      }
    }

    this.callbacks.onNearbyPrompt(null);
  }

  /**
   * Mengupdate sistem pergerakan dan status monster.
   * Secara otomatis mendeteksi apakah status game saat ini isMultiplayer == true atau false:
   * - isMultiplayer == true: Matikan AI monster lokal di client, dan biarkan client hanya merender posisi monster berdasarkan koordinat (X, Z) yang dikirimkan oleh server.js via Socket.io.
   * - isMultiplayer == false: AI monster lokal berjalan sepenuhnya di client (mengejar player menggunakan loop requestAnimationFrame).
   */
  public updateMonster(delta: number) {
    if (this.isMultiplayer) {
      // Mode Multiplayer: Matikan AI monster lokal di client, biarkan client hanya merender koordinat (X, Z) dari server.js via Socket.io
      this.updateMonsterMultiplayer(delta);
    } else {
      // Mode Single Player: AI monster lokal di client (pergerakan mengejar player menggunakan loop requestAnimationFrame)
      this.updateMonsterSinglePlayer(delta);
    }
  }

  // Alias untuk kompatibilitas fungsi pemanggil sebelumnya
  public updateEnemies(delta: number) {
    this.updateMonster(delta);
  }

  /**
   * Mode Single Player:
   * AI monster lokal berjalan sepenuhnya di client (browser).
   * Menghitung deteksi jarak player, pergerakan mengejar player, dan eksekusi serangan lokal di loop requestAnimationFrame.
   */
  private updateMonsterSinglePlayer(delta: number) {
    let bossInView = false;
    let activeBoss: EnemyData | null = null;

    this.enemies.forEach((enemy) => {
      if (enemy.data.isDead) return;

      const ePos = enemy.mesh.position;
      const dist = this.playerPos.distanceTo(ePos);

      // Distance culling untuk performa
      if (dist > 70) {
        enemy.mesh.visible = false;
        return;
      }
      enemy.mesh.visible = true;

      if (enemy.data.type === 'boss' && dist < 32) {
        bossInView = true;
        activeBoss = enemy.data;
      }

      // AI Lokal: Jika player dalam jarak deteksi, monster mengejar player
      if (dist <= enemy.data.detectRange) {
        // Hadap ke arah player
        const toPlayer = new THREE.Vector3()
          .subVectors(this.playerPos, ePos)
          .normalize();
        const targetRotY = Math.atan2(toPlayer.x, toPlayer.z);
        enemy.mesh.rotation.y = targetRotY;

        // Bergerak mendekat jika di luar attack range
        if (dist > enemy.data.attackRange) {
          const moveSpeed = enemy.data.speed * delta;
          ePos.x += toPlayer.x * moveSpeed;
          ePos.z += toPlayer.z * moveSpeed;
          ePos.y = this.world.getTerrainHeight(ePos.x, ePos.z);

          // Role-specific enemy animations
          enemy.walkCycle += delta * 6;
          if (enemy.data.type === 'slime' || enemy.data.type === 'magma_slime') {
            // Squish and bounce
            ePos.y += Math.abs(Math.sin(enemy.walkCycle)) * 0.45;
            const stretch = 1 + Math.sin(enemy.walkCycle * 2) * 0.15;
            enemy.mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
          } else if (enemy.data.type === 'spider') {
            // 8-legged skitter
            for (let legIdx = 1; legIdx <= 8; legIdx++) {
              const leg = enemy.parts[`leg${legIdx}`];
              if (leg) {
                leg.rotation.x = Math.sin(enemy.walkCycle * 2.2 + legIdx * 0.9) * 0.4;
              }
            }
          } else if (enemy.data.type === 'golem') {
            // Heavy stone lumber
            if (enemy.parts.leftLeg && enemy.parts.rightLeg) {
              enemy.parts.leftLeg.rotation.x = Math.sin(enemy.walkCycle * 0.7) * 0.35;
              enemy.parts.rightLeg.rotation.x = -Math.sin(enemy.walkCycle * 0.7) * 0.35;
            }
            if (enemy.parts.leftArm && enemy.parts.rightArm) {
              enemy.parts.leftArm.rotation.x = -Math.sin(enemy.walkCycle * 0.7) * 0.4;
              enemy.parts.rightArm.rotation.x = Math.sin(enemy.walkCycle * 0.7) * 0.4;
            }
          } else if (enemy.parts.leftLeg && enemy.parts.rightLeg) {
            enemy.parts.leftLeg.rotation.x = Math.sin(enemy.walkCycle) * 0.5;
            enemy.parts.rightLeg.rotation.x = -Math.sin(enemy.walkCycle) * 0.5;
          }
        } else {
          // Inside attack range: attack player on cooldown
          enemy.attackCooldown -= delta;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1.4; // 1.4s attack rate
            this.enemyAttackPlayer(enemy);
          }
        }
      }
    });

    this.callbacks.onBossEncounter(
      bossInView && activeBoss !== null,
      activeBoss ? activeBoss.nameId : undefined,
      activeBoss ? activeBoss.hp : undefined,
      activeBoss ? activeBoss.maxHp : undefined
    );
  }

  /**
   * Mode Multiplayer:
   * Matikan AI monster lokal di client!
   * Client TIDAK menghitung jarak deteksi dan pergerakan kejar secara mandiri.
   * Client HANYA merender posisi monster berdasarkan koordinat (X, Z) yang dikirimkan oleh server.js via Socket.io.
   */
  private updateMonsterMultiplayer(delta: number) {
    let bossInView = false;
    let activeBoss: EnemyData | null = null;

    this.enemies.forEach((enemy) => {
      if (enemy.data.isDead) {
        enemy.mesh.visible = false;
        return;
      }

      const ePos = enemy.mesh.position;
      const dist = this.playerPos.distanceTo(ePos);

      // Distance culling visual
      if (dist > 75) {
        enemy.mesh.visible = false;
        return;
      }
      enemy.mesh.visible = true;

      if (enemy.data.type === 'boss' && dist < 32) {
        bossInView = true;
        activeBoss = enemy.data;
      }

      // Ambil koordinat target (X, Z) yang dikirimkan server.js via Socket.io
      const target = this.remoteMonsterTargets.get(enemy.data.id);
      if (target) {
        if (target.isDead || (target.hp !== undefined && target.hp <= 0)) {
          enemy.data.isDead = true;
          enemy.data.hp = 0;
          enemy.mesh.visible = false;
          return;
        }

        if (target.hp !== undefined && target.hp !== enemy.data.hp) {
          enemy.data.hp = target.hp;
        }

        const prevX = ePos.x;
        const prevZ = ePos.z;

        // Render & lerp posisi halus dari koordinat (X, Z) server
        const lerpSpeed = Math.min(1, delta * 12);
        ePos.x += (target.x - ePos.x) * lerpSpeed;
        ePos.z += (target.z - ePos.z) * lerpSpeed;
        ePos.y = this.world.getTerrainHeight(ePos.x, ePos.z);

        // Lerp rotasi Y dari server
        let diffRot = target.rotationY - enemy.mesh.rotation.y;
        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
        enemy.mesh.rotation.y += diffRot * lerpSpeed;

        // Render animasi procedural berdasarkan pergerakan koordinat
        const movedDist = Math.hypot(ePos.x - prevX, ePos.z - prevZ);
        const isMoving = movedDist > 0.003;

        if (isMoving) {
          enemy.walkCycle += delta * 6;
          if (enemy.data.type === 'slime' || enemy.data.type === 'magma_slime') {
            ePos.y += Math.abs(Math.sin(enemy.walkCycle)) * 0.45;
            const stretch = 1 + Math.sin(enemy.walkCycle * 2) * 0.15;
            enemy.mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
          } else if (enemy.data.type === 'spider') {
            for (let legIdx = 1; legIdx <= 8; legIdx++) {
              const leg = enemy.parts[`leg${legIdx}`];
              if (leg) {
                leg.rotation.x = Math.sin(enemy.walkCycle * 2.2 + legIdx * 0.9) * 0.4;
              }
            }
          } else if (enemy.data.type === 'golem') {
            if (enemy.parts.leftLeg && enemy.parts.rightLeg) {
              enemy.parts.leftLeg.rotation.x = Math.sin(enemy.walkCycle * 0.7) * 0.35;
              enemy.parts.rightLeg.rotation.x = -Math.sin(enemy.walkCycle * 0.7) * 0.35;
            }
            if (enemy.parts.leftArm && enemy.parts.rightArm) {
              enemy.parts.leftArm.rotation.x = -Math.sin(enemy.walkCycle * 0.7) * 0.4;
              enemy.parts.rightArm.rotation.x = Math.sin(enemy.walkCycle * 0.7) * 0.4;
            }
          } else if (enemy.parts.leftLeg && enemy.parts.rightLeg) {
            enemy.parts.leftLeg.rotation.x = Math.sin(enemy.walkCycle) * 0.5;
            enemy.parts.rightLeg.rotation.x = -Math.sin(enemy.walkCycle) * 0.5;
          }
        }
      }
    });

    this.callbacks.onBossEncounter(
      bossInView && activeBoss !== null,
      activeBoss ? activeBoss.nameId : undefined,
      activeBoss ? activeBoss.hp : undefined,
      activeBoss ? activeBoss.maxHp : undefined
    );
  }

  private enemyAttackPlayer(enemy: (typeof this.enemies)[0]) {
    soundManager.playHit();

    this.callbacks.onUpdateStats((stats) => {
      const enemyDmg = enemy.data.attack;
      const finalDmg = Math.max(2, enemyDmg - Math.round(stats.baseDefense * 0.6));
      const nextHp = Math.max(0, stats.hp - finalDmg);

      this.callbacks.onAddFloatingText(`-${finalDmg} HP`, '#ff1744', 'damage');

      if (nextHp <= 0) {
        // Respawn at village center
        this.callbacks.onAddFloatingText('Kamu dikalahkan! Bangkit kembali di kuil.', '#ff5252', 'crit');
        this.playerPos.set(0, 0.5, 4);
        this.playerVel.set(0, 0, 0);
        return {
          ...stats,
          hp: stats.maxHp,
          mp: stats.maxMp,
          gold: Math.max(0, stats.gold - 10),
        };
      }

      return { ...stats, hp: nextHp };
    });
  }

  private updateCamera(delta = 0.016) {
    // Orbit camera calculation
    const offsetX = Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
    const offsetZ = Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
    const offsetY = Math.sin(this.cameraAngleV) * this.cameraDistance + 1.2;

    const targetPos = new THREE.Vector3(
      this.playerPos.x + offsetX,
      this.playerPos.y + offsetY,
      this.playerPos.z + offsetZ
    );

    // Apply procedural camera screen shake for visceral combat feel
    if (this.cameraShake > 0.001) {
      const shakeAmt = this.cameraShake * 0.45;
      targetPos.x += (Math.random() - 0.5) * shakeAmt;
      targetPos.y += (Math.random() - 0.5) * shakeAmt;
      targetPos.z += (Math.random() - 0.5) * shakeAmt;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.8);
    }

    this.camera.position.lerp(targetPos, 0.15);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.4, this.playerPos.z);
  }

  private updateRemotePlayers(delta: number) {
    if (this.gameMode !== 'multiplayer' || this.remotePlayers.size === 0) return;

    this.remotePlayers.forEach((rp) => {
      // Lerp position smoothly
      rp.currentPos.lerp(rp.targetPos, Math.min(1, delta * 14));
      rp.meshObj.group.position.copy(rp.currentPos);

      // Lerp rotation smoothly
      let diff = rp.targetRotationY - rp.currentRotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      rp.currentRotationY += diff * Math.min(1, delta * 14);
      rp.meshObj.group.rotation.y = rp.currentRotationY;

      // Animate limb swinging
      if (rp.isMoving) {
        rp.walkTime += delta * 10;
        const swing = Math.sin(rp.walkTime) * 0.65;
        rp.meshObj.leftLeg.rotation.x = swing;
        rp.meshObj.rightLeg.rotation.x = -swing;
        rp.meshObj.leftArm.rotation.x = -swing * 0.55;
        rp.meshObj.rightArm.rotation.x = swing * 0.55;
      } else {
        rp.meshObj.leftLeg.rotation.x *= 0.85;
        rp.meshObj.rightLeg.rotation.x *= 0.85;
        rp.meshObj.leftArm.rotation.x *= 0.85;
        rp.meshObj.rightArm.rotation.x *= 0.85;
      }

      // Animate remote attack swinging
      if (rp.attackTimer > 0) {
        rp.attackTimer -= delta;
        rp.meshObj.rightArm.rotation.x = -1.4 + Math.sin(rp.attackTimer * 16) * 1.6;
      }
    });
  }

  private animate = () => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Single Player Pause: Hentikan sementara loop animasi Three.js dan logika monster
    if (this.isPaused && !this.isMultiplayer) {
      // Render frame yang sedang diam tanpa kalkulasi fisika, monster AI, atau delta waktu
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update Player & World Physics
    this.updatePlayer(delta);
    this.updateMonster(delta);
    this.updateCamera(delta);
    this.updateRemotePlayers(delta);

    // Passive MP and Stamina slow regeneration
    this.regenTimer += delta;
    if (this.regenTimer >= 0.8) {
      this.regenTimer = 0;
      this.callbacks.onUpdateStats((stats) => {
        if (stats.hp <= 0) return stats;
        let changed = false;

        // MP Regeneration: Mage regens fastest, scaling with Intelligence
        let nextMp = stats.mp;
        if (stats.mp < stats.maxMp) {
          let mpRegen = 2;
          if (this.charClass === 'mage') {
            mpRegen = 4 + Math.floor(stats.intelligence * 0.3);
          } else if (this.charClass === 'rogue') {
            mpRegen = 3 + Math.floor(stats.intelligence * 0.15);
          } else {
            mpRegen = 2 + Math.floor(stats.intelligence * 0.1);
          }
          nextMp = Math.min(stats.maxMp, stats.mp + mpRegen);
          if (nextMp !== stats.mp) changed = true;
        }

        // Stamina Regeneration
        let nextStamina = stats.stamina;
        if (stats.stamina < stats.maxStamina) {
          const stamRegen = 5 + Math.floor(stats.agility * 0.25);
          nextStamina = Math.min(stats.maxStamina, stats.stamina + stamRegen);
          if (nextStamina !== stats.stamina) changed = true;
        }

        if (!changed) return stats;
        return {
          ...stats,
          mp: nextMp,
          stamina: nextStamina,
        };
      });
    }

    // Update active combat visual effects
    for (let i = this.activeVfx.length - 1; i >= 0; i--) {
      const vfx = this.activeVfx[i];
      const alive = vfx.update(delta);
      if (!alive) {
        this.activeVfx.splice(i, 1);
      }
    }

    // Update active projectiles (e.g. Mage Arcane Bolt)
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const proj = this.activeProjectiles[i];
      proj.lifetime -= delta;
      proj.object.position.addScaledVector(proj.direction, proj.speed * delta);

      // Check collision against enemies
      let hit = false;
      for (const enemy of this.enemies) {
        if (enemy.data.isDead) continue;
        if (proj.object.position.distanceTo(enemy.mesh.position) <= 1.6) {
          if (proj.vfxType === 'hunter_arrow' || proj.vfxType === 'hunter_arrow_rain') {
            this.damageEnemy(enemy, proj.damage, proj.isCrit, 0.55);
            soundManager.playArrowHit();
            this.spawnHitStarburst(proj.object.position, 0x10b981, 0.9);
            this.spawnSparks(proj.object.position, 0x10b981, 12, 4.5);
            this.spawnSparks(proj.object.position, 0xffffff, 6, 3.5);
            this.spawnShockwaveRing(proj.object.position, 0x34d399, 1.8, 0.22);
          } else {
            this.damageEnemy(enemy, proj.damage, proj.isCrit, 0.5);
            soundManager.playHit();
            this.spawnHitStarburst(proj.object.position, 0x38bdf8, 1.1);
            this.spawnSparks(proj.object.position, 0x38bdf8, 14, 4.8);
            this.spawnSparks(proj.object.position, 0xc084fc, 8, 3.8);
            this.spawnShockwaveRing(proj.object.position, 0xc084fc, 2.2, 0.28);
          }
          hit = true;
          break;
        }
      }

      if (hit || proj.lifetime <= 0) {
        this.scene.remove(proj.object);
        this.activeProjectiles.splice(i, 1);
      }
    }

    // Floating crystal spin
    const elapsed = this.clock.getElapsedTime();
    this.world.floatingCrystals.forEach((c, idx) => {
      c.rotation.y = elapsed * 0.8 + idx;
      c.position.y = 1.8 + Math.sin(elapsed * 2 + idx) * 0.2;
    });

    // Gentle ocean wave motion
    if (this.world.oceanMesh) {
      this.world.oceanMesh.position.y = -0.25 + Math.sin(elapsed * 1.5) * 0.08;
    }

    // Fireflies / ambient particles slow float
    if (this.world.particles) {
      this.world.particles.rotation.y = elapsed * 0.03;
    }

    // Emit live position for MiniMap & World Map (throttled)
    this.posUpdateThrottle++;
    if (this.posUpdateThrottle % 4 === 0 && this.callbacks.onPlayerPositionUpdate) {
      const markers: MapMarker[] = [];

      // Village NPCs
      if (this.world.npcs && this.world.npcs.length > 0) {
        const roleIcons: Record<string, string> = {
          elder: '🧙‍♂️',
          guard: '🛡️',
          alchemist: '🧪',
          blacksmith: '🔨',
          bard: '🎵',
          fisherman: '🐟',
          villager: '🛒',
        };
        this.world.npcs.forEach((npc) => {
          let customIcon = roleIcons[npc.roleType] || '👤';
          let customColor = '#fbbf24';
          if (npc.id === 'blacksmith_torvald') {
            customIcon = '🔨';
            customColor = '#f97316';
          } else if (npc.id === 'alchemist_anya') {
            customIcon = '🧪';
            customColor = '#10b981';
          } else if (npc.id === 'villager_maya') {
            customIcon = '🛡️';
            customColor = '#3b82f6';
          } else if (npc.id === 'fisherman_joko') {
            customIcon = '🐟';
            customColor = '#06b6d4';
          } else if (npc.id === 'villager_kael') {
            customIcon = '🗝️';
            customColor = '#a855f7';
          }

          markers.push({
            id: npc.id,
            title: npc.nameId,
            type: 'npc',
            x: npc.position[0],
            z: npc.position[2],
            icon: npc.icon || customIcon,
            color: customColor,
            description: `${npc.role} - Desa Eldoria`,
          });
        });
      } else if (this.world.npc) {
        markers.push({
          id: 'npc_elder',
          title: 'Tetua Vaelen',
          type: 'npc',
          x: this.world.npc.position[0],
          z: this.world.npc.position[2],
          icon: '🧙‍♂️',
          color: '#ffb300',
          description: 'Pemberi Misi & Cerita Utama',
        });
      }

      // Fountain
      markers.push({
        id: 'fountain',
        title: 'Air Mancur Suci',
        type: 'fountain',
        x: 0,
        z: -4,
        icon: '⛲',
        color: '#29b6f6',
        description: 'Memulihkan HP & MP Seketika',
      });

      // Pier
      markers.push({
        id: 'pier_dock',
        title: 'Dermaga Pantai',
        type: 'pier',
        x: 6,
        z: 25,
        icon: '⚓',
        color: '#00b4d8',
        description: 'Perahu & Pemandangan Laut',
      });

      // Enemies
      this.enemies.forEach((enemy) => {
        if (!enemy.data.isDead) {
          markers.push({
            id: enemy.data.id,
            title: enemy.data.nameId,
            type: enemy.data.type === 'boss' ? 'boss' : 'enemy',
            x: enemy.mesh.position.x,
            z: enemy.mesh.position.z,
            icon: enemy.data.type === 'boss' ? '💀' : enemy.data.type === 'skeleton' ? '☠️' : '👾',
            color: enemy.data.type === 'boss' ? '#ff1744' : '#f44336',
          });
        }
      });

      // Treasure Chests
      this.world.chests.forEach((chest) => {
        if (!chest.opened) {
          markers.push({
            id: chest.id,
            title: 'Peti Harta Karun',
            type: 'chest',
            x: chest.position[0],
            z: chest.position[2],
            icon: '📦',
            color: '#ffd700',
          });
        }
      });

      const currentReg = getCurrentRegion(this.playerPos.x, this.playerPos.z);
      this.callbacks.onPlayerPositionUpdate({
        x: this.playerPos.x,
        z: this.playerPos.z,
        rotationY: this.playerRotationY,
        region: currentReg,
        markers,
      });
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    dom.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);

    // Clean up active VFX and projectiles
    this.activeVfx.forEach((v) => this.scene.remove(v.object));
    this.activeVfx = [];
    this.activeProjectiles.forEach((p) => this.scene.remove(p.object));
    this.activeProjectiles = [];

    // Clean up remote players
    this.clearRemotePlayers();

    if (dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
    this.renderer.dispose();
  }
}
