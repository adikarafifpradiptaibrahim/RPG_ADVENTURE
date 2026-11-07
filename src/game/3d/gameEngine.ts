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
import { CHEST_LOOT_POOL, MONSTER_MATERIALS } from '../data';
import { getCurrentRegion } from '../mapData';
import {
  createEnemyMesh,
  createPlayerMesh,
  createArrowMesh,
  PlayerMeshObjects,
  USE_LEGACY_KNIGHT,
  animateKnightWalk,
  USE_LEGACY_MAGE,
  animateMageWalk,
  animateMageSkillPose,
} from './models';
export { USE_LEGACY_KNIGHT, USE_LEGACY_MAGE };
import { buildWorld, WorldObjects, WorldCheckpoint } from './world';
import { BossManager } from '../BossManager';
import { RemotePlayerData } from '../multiplayer';
import { GraphicsSettings, loadGraphicsSettings } from '../graphicsSettings';
import {
  isInsideSafeZone,
  MEADOW_SLIME_SPAWNS,
  MAGMA_SLIME_SPAWNS,
  SKELETON_SENTINEL_SPAWNS,
  SKELETON_MAGE_SPAWNS,
  BEACH_GOBLIN_SPAWNS,
  FOREST_GOLEM_SPAWNS,
  FOREST_SPIDER_SPAWNS,
  FROST_WOLF_SPAWNS,
} from '../monsters';
import {
  clampCameraPitch,
  clampCameraDistance,
  normalizeCameraYaw,
  CAMERA_CONFIG,
  SPECTATOR_CONFIG,
  calculateSpectatorSpeed,
  clampSpectatorSpeed,
} from '../CameraControls';
import {
  MAGE_TOWER_CONFIG,
  isInsideMageTowerInterior,
  getMageTowerFloorHeight,
  constrainToMageTowerInterior,
  validateTeleportCoordinates,
  getSafeInteriorSpawn,
  getSafeExteriorSpawn,
} from './MageTower';
import {
  createMageArcaneLaserBeamVfx,
  createStarfallCastingCircleVfx,
  createStarfallMeteorBarrageVfx,
  createMageCelestialHealVfx,
  createMageBlinkVfx,
  preloadStarfallPool,
  StarfallCastingCircleInstance,
  CelestialHealResourcePool,
  CelestialHealVfxInstance,
  MageBlinkResourcePool,
  MageBlinkVfxInstance,
} from '../skills';

export interface LootPickup {
  mesh: THREE.Group;
  item: Item;
  pos: THREE.Vector3;
  creationTime: number;
  collected: boolean;
}

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
  onBossDefeated?: (bossName?: string) => void;
  onSpectatorModeChange?: (active: boolean) => void;
  onHunterWeaponSwitch?: (mode: 'dagger' | 'bow') => void;
  onCastingUpdate?: (casting: { isCasting: boolean; progress: number; text: string } | null) => void;
  onCheckpointUnlocked?: (id: string, nameId: string, pos: [number, number]) => void;
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
    charClass?: string;
    hunterWeaponMode?: string;
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

interface TownZoneTrigger {
  id: string;
  waypointId: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  respawnX: number;
  respawnZ: number;
}

const TOWN_ZONES: TownZoneTrigger[] = [
  {
    id: 'town_sanctuary',
    waypointId: 'wp_village',
    name: 'Desa Utama Sanctuary',
    x: 0,
    z: 180,
    radius: 45,
    respawnX: 0,
    respawnZ: 184,
  },
  {
    id: 'town_valkragor',
    waypointId: 'wp_valkragor',
    name: 'Benteng Val-Kragor',
    x: 380,
    z: 80,
    radius: 45,
    respawnX: 376,
    respawnZ: 80,
  },
  {
    id: 'town_astraea',
    waypointId: 'wp_astraea',
    name: 'Ibukota Kerajaan Emas Astraea',
    x: -340,
    z: -220,
    radius: 50,
    respawnX: -340,
    respawnZ: -215,
  },
  {
    id: 'town_solaria',
    waypointId: 'wp_solaria_village',
    name: 'Desa & Istana Gurun Solaria',
    x: 280,
    z: -280,
    radius: 65,
    respawnX: 280,
    respawnZ: -275,
  },
  {
    id: 'town_thunderpeak',
    waypointId: 'wp_thunderpeak',
    name: 'Mage Tower Puncak Halilintar',
    x: 180,
    z: 60,
    radius: 45,
    respawnX: 180,
    respawnZ: 68,
  },
];

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private callbacks: GameEngineCallbacks;
  private bossManager: BossManager;
  private unlockedCheckpoints: Set<string> = new Set();
  private lastVisitedTownPos: { id: string; x: number; y: number; z: number; name: string } = (() => {
    try {
      const saved = localStorage.getItem('eldoria_last_visited_town');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number') return parsed;
      }
    } catch {}
    return { id: 'wp_village', x: 0, y: 0.5, z: 184, name: 'Desa Utama Sanctuary' };
  })();
  private scenePointLights: THREE.PointLight[] = [];
  private currentParticleCount = 0;

  // World and Player
  private world: WorldObjects;
  private playerMesh: PlayerMeshObjects;
  private playerPos = new THREE.Vector3(0, 0, 184);
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
    | 'starfall'
    | 'blink'
    | 'celestial_heal'
    | 'flurry'
    | 'shadow_step'
    | 'smoke_bomb'
    | null = null;
  public isCasting = false;
  private castingTimer = 0;
  private castingDuration = 1.0;
  private castingSkillName = '';
  private castingCircleInstance: StarfallCastingCircleInstance | null = null;
  private isDashing = false;
  private dashTimer = 0;
  private isInvulnerable = false;
  private invulnerableTimer = 0;
  private cameraFovPunch = 0;
  private charClass: CharacterClass = 'warrior';
  private playerTier = 1;
  private playerLevel = 1;
  private footstepTimer = 0;
  private speedBuffTimer = 0;
  private regenTimer = 0;
  public arcaneShieldHp = 0;
  public arcaneShieldTimer = 0;
  private hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  private attackComboIndex = 0;
  private mageLandingCrouchTimer = 0;
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
    cleanup?: () => void;
    isPriority?: boolean;
  }[] = [];
  private starfallTimeoutIds: Array<ReturnType<typeof setTimeout>> = [];
  private activeProjectiles: {
    object: THREE.Object3D;
    direction: THREE.Vector3;
    speed: number;
    lifetime: number;
    damage: number;
    isCrit: boolean;
    vfxType: 'arcane_bolt' | 'hunter_arrow' | 'hunter_arrow_rain' | 'titan_boulder';
    isHostile?: boolean;
    blastRadius?: number;
    rotationAxis?: THREE.Vector3;
  }[] = [];

  // Spectator / Freecam Mode (Minecraft-Style Fly Cam)
  public isSpectatorMode = false;
  private spectatorPos = new THREE.Vector3();
  private spectatorYaw = 0;
  private spectatorPitch = 0;
  private spectatorSpeed = 22.0; // units/sec, adjustable 4.0 to 90.0 via scroll wheel
  private savedPlayerPos = new THREE.Vector3();

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
  public teleportGraceTimer = 0;
  public currentPromptAction: (() => void) | null = null;

  private setNearbyPrompt(prompt: string | null, action?: () => void) {
    this.currentPromptAction = prompt && action ? action : null;
    this.callbacks.onNearbyPrompt(prompt, action);
  }

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
    spawnPos?: THREE.Vector3;
    respawnTimer?: number;
    isReturning?: boolean;
    deathTimer?: number;
    leashRadius?: number;
    attackAnimTimer?: number;
  }[] = [];

  // Active 3D Physical Loot Pickups (Materials & Items dropped by defeated monsters)
  private activeLootPickups: LootPickup[] = [];

  // Graphics & Performance settings
  private graphicsSettings: GraphicsSettings = loadGraphicsSettings();
  private lastFrameTime = 0;

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
      Math.max(50, this.graphicsSettings.renderDistance)
    );

    // 2. Setup Renderer (Optimized for high FPS and light GPU load)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(this.graphicsSettings.renderScale * Math.min(dpr, 1.5));
    this.renderer.shadowMap.enabled = this.graphicsSettings.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.userSelect = 'none';
    (this.renderer.domElement.style as any).webkitUserSelect = 'none';
    container.appendChild(this.renderer.domElement);

    // 3. Build 3D World
    this.world = buildWorld(this.scene);

    // Warm-up & pre-compile Starfall shaders, geometries, and object pool
    preloadStarfallPool(this.scene, this.renderer, this.camera);

    // Initialize Boss Manager
    this.bossManager = new BossManager(
      this.scene,
      (x, z) => this.world.getTerrainHeight(x, z),
      {
        onAddFloatingText: (text, color, type) => this.callbacks.onAddFloatingText(text, color, type),
        onUpdateStats: (updater) => this.callbacks.onUpdateStats(updater),
        onCameraShake: (amount) => { this.cameraShake = Math.max(this.cameraShake, amount); },
        onSpawnShockwave: (pos, color, maxRadius, duration) => {
          this.spawnShockwaveRing(pos, color, maxRadius, duration);
        },
        onSpawnSparks: (pos, color, count, speed) => {
          this.spawnSparks(pos, color, count, speed);
        },
        onSpawnBoulderProjectile: (fromPos, toPos, damage) => {
          this.spawnTitanBoulderProjectile(fromPos, toPos, damage);
        },
        onPlayerDeath: () => {
          this.respawnPlayerAtLastVisitedTown();
        },
        onDamageAbsorb: (rawDmg) => this.absorbDamageWithShield(rawDmg).remainingDamage,
      }
    );

    // Dynamic PointLights cache for distance-based lighting optimization
    this.scenePointLights = this.world.pointLights || [];

    // Initialize Checkpoints from saved state
    try {
      const saved = localStorage.getItem('eldoria_unlocked_checkpoints');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          list.forEach((id: string) => this.unlockedCheckpoints.add(id));
        }
      }
    } catch {}
    this.unlockedCheckpoints.add('wp_village');

    if (this.world.checkpoints) {
      this.world.checkpoints.forEach((cp) => {
        if (this.unlockedCheckpoints.has(cp.id)) {
          cp.unlocked = true;
          if (cp.setUnlocked) cp.setUnlocked(true);
        }
      });
    }

    // Apply shadow & distance culling settings
    this.applyGraphicsSettings(this.graphicsSettings);

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

  public applyGraphicsSettings(settings: GraphicsSettings) {
    this.graphicsSettings = settings;

    // 1. Resolution / Pixel ratio scaling (Great for Potato PCs)
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(settings.renderScale * Math.min(dpr, 1.5));

    // 2. Shadows on/off (halves draw calls on low spec)
    this.renderer.shadowMap.enabled = settings.shadows;
    if (this.scene) {
      this.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = settings.shadows;
          (child as THREE.Mesh).receiveShadow = settings.shadows;
        }
      });
    }

    // 3. Render Distance / Camera Far & Fog Culling
    this.camera.far = Math.max(50, settings.renderDistance);
    this.camera.updateProjectionMatrix();

    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.far = settings.renderDistance;
      this.scene.fog.near = settings.renderDistance * 0.35;
    }
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
        2: 'âœ¦ EVOLUSI TINGKAT 2 (Level 5)! Zirah & Efek Serangan Diperkuat!',
        3: 'âœ¦ EVOLUSI TINGKAT 3 (Level 10)! Mahkota Emas & Gelombang Serangan Ganda!',
        4: 'âœ¦ EVOLUSI TINGKAT 4 (Level 25)! Quad-Wings Astral & Skill Meledak Dahsyat!',
        5: 'âœ¦ EVOLUSI TINGKAT 5 (Level 50)! Hexa-Wings Kosmik & Mandala Serangan Pamungkas!',
        6: 'âœ¦ EVOLUSI DEWATA AGUNG (Level 100)! Octa-Wings Ilahi & Aura Keabadian Tanpa Batas!',
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
      const classLabel = charClass === 'warrior' ? 'âš”ï¸ Ksatria' : charClass === 'mage' ? 'ðŸ”® Penyihir' : 'ðŸ¹ Pemburu';
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
    charClass?: string;
    hunterWeaponMode?: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
  }) {
    const rp = this.remotePlayers.get(data.id);
    if (!rp) return;

    rp.attackTimer = 0.45;
    rp.attackType = data.attackType;
    rp.currentRotationY = data.rotationY;
    rp.targetRotationY = data.rotationY;
    rp.meshObj.group.rotation.y = data.rotationY;

    const atkPos = new THREE.Vector3(data.x, data.y, data.z);
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), data.rotationY);
    const charClass = data.charClass || rp.data.charClass || 'warrior';
    const isBow = data.hunterWeaponMode === 'bow' || data.attackType.includes('bow');
    const slot = data.skillSlot;

    if (slot === 1) {
      if (charClass === 'warrior') {
        soundManager.playWarriorCleave();
        this.spawnWarriorWhirlwindVfx(atkPos);
      } else if (charClass === 'mage') {
        const targetPos = atkPos.clone().add(forward.clone().multiplyScalar(13.0));
        targetPos.y = this.world.getTerrainHeight(targetPos.x, targetPos.z);
        this.spawnStarfallMeteorBarrage(targetPos, true);
      } else if (charClass === 'rogue') {
        if (isBow) {
          soundManager.playBowShoot();
          [-0.3, -0.15, 0, 0.15, 0.3].forEach((offset, idx) => {
            setTimeout(() => {
              if (!this.isRunning) return;
              const arrowDir = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), offset);
              this.spawnHunterArrow(arrowDir, true, 1.0, atkPos, true);
            }, idx * 35);
          });
        } else {
          soundManager.playRogueShadowFlurry();
          this.spawn360BladeSpinVfx(0x34d399, 4.0, atkPos);
          this.spawnSparks(atkPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x10b981, 16, 4.5);
        }
      }
    } else if (slot === 2) {
      if (charClass === 'warrior') {
        soundManager.playWarriorShieldSlam();
        this.spawnShockwaveRing(atkPos, 0xf59e0b, 3.8, 0.4);
        this.spawnSparks(atkPos.clone().add(new THREE.Vector3(0, 1, 0)), 0xfbbf24, 14, 4);
      } else if (charClass === 'mage') {
        soundManager.playMageBlink();
        this.spawnHitStarburst(atkPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x38bdf8, 2.8);
        this.spawnShockwaveRing(atkPos, 0x0284c7, 3.2, 0.35);
      } else if (charClass === 'rogue') {
        if (isBow) {
          soundManager.playBowShoot();
          this.spawnHunterArrow(forward, true, 1.0, atkPos, true);
        } else {
          soundManager.playRogueSmoke();
          this.spawnSparks(atkPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x34d399, 16, 3.8);
          this.spawnShockwaveRing(atkPos, 0x10b981, 3.0, 0.35);
        }
      }
    } else if (slot === 3) {
      if (charClass === 'warrior') {
        soundManager.playWarriorShieldSlam();
        this.spawnShockwaveRing(atkPos, 0xfacc15, 4.5, 0.6);
        this.spawnHitStarburst(atkPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfde047, 2.8);
      } else if (charClass === 'mage') {
        soundManager.playMageCelestialHeal();
        this.spawnHitStarburst(atkPos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x67e8f9, 3.4);
        this.spawnShockwaveRing(atkPos, 0x38bdf8, 4.2, 0.6);
      } else if (charClass === 'rogue') {
        soundManager.playRogueSmoke();
        this.spawnHitStarburst(atkPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0x10b981, 2.8);
        this.spawnShockwaveRing(atkPos, 0x059669, 3.8, 0.5);
      }
    } else {
      // Basic Attack
      if (charClass === 'warrior') {
        soundManager.playWarriorCleave();
        if (data.attackType.includes('spin')) {
          this.spawn360BladeSpinVfx(0xfbbf24, 3.6, atkPos);
        } else {
          this.spawnSparks(atkPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xf59e0b, 10, 3.5);
          this.spawnShockwaveRing(atkPos, 0xf59e0b, 2.2, 0.25);
        }
      } else if (charClass === 'mage') {
        soundManager.playArcaneBeam();
        this.spawnMageArcaneLaserBeam(forward, atkPos, true);
      } else if (charClass === 'rogue') {
        if (isBow) {
          soundManager.playBowShoot();
          this.spawnHunterArrow(forward, false, 1.0, atkPos, true);
        } else {
          soundManager.playRogueDoubleSlash();
          if (data.attackType.includes('spin')) {
            this.spawn360BladeSpinVfx(0x10b981, 3.4, atkPos);
          } else {
            this.spawnSparks(atkPos.clone().add(new THREE.Vector3(0, 1.1, 0)), 0x34d399, 10, 3.2);
            this.spawnShockwaveRing(atkPos, 0x34d399, 2.0, 0.25);
          }
        }
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

      if (enemy.data.hp <= 0) {
        enemy.data.isDead = true;
        this.handleEnemyDefeat(enemy);
      }
    }
  }

  private spawnEnemies() {
    // 1. Meadow Slimes (Lv. 1) - Relocated to Eastern Plains (> 85 units east from Sanctuary)
    MEADOW_SLIME_SPAWNS.forEach((sp) => {
      const { group, parts } = createEnemyMesh('slime');
      const ey = this.world.getTerrainHeight(sp.pos[0], sp.pos[1]);
      group.position.set(sp.pos[0], ey, sp.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: sp.id,
        name: sp.name,
        nameId: sp.nameId,
        type: sp.type,
        level: sp.level,
        hp: sp.hp,
        maxHp: sp.maxHp,
        attack: sp.attack,
        defense: sp.defense,
        expReward: sp.expReward,
        goldReward: sp.goldReward,
        speed: 2.2,
        attackRange: 1.8,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
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

    // 2. Northern Caldera Magma Slimes (Lv. 3) - Relocated deep into volcanic crags (> 85 units north)
    MAGMA_SLIME_SPAWNS.forEach((sp) => {
      const { group, parts } = createEnemyMesh('magma_slime');
      const ey = this.world.getTerrainHeight(sp.pos[0], sp.pos[1]);
      group.position.set(sp.pos[0], ey, sp.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: sp.id,
        name: sp.name,
        nameId: sp.nameId,
        type: sp.type,
        level: sp.level,
        hp: sp.hp,
        maxHp: sp.maxHp,
        attack: sp.attack,
        defense: sp.defense,
        expReward: sp.expReward,
        goldReward: sp.goldReward,
        speed: 2.5,
        attackRange: 2.0,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
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

    // 3. Ancient Crypt Skeleton Sentinels (Lv. 2) - Upstream Outer Ruins of Vael (> 110 units west)
    SKELETON_SENTINEL_SPAWNS.forEach((sp) => {
      const { group, parts } = createEnemyMesh('skeleton');
      const ey = this.world.getTerrainHeight(sp.pos[0], sp.pos[1]);
      group.position.set(sp.pos[0], ey, sp.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: sp.id,
        name: sp.name,
        nameId: sp.nameId,
        type: sp.type,
        level: sp.level,
        hp: sp.hp,
        maxHp: sp.maxHp,
        attack: sp.attack,
        defense: sp.defense,
        expReward: sp.expReward,
        goldReward: sp.goldReward,
        speed: 3.0,
        attackRange: 2.2,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
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

    // 4. Skeleton Necromancer Mages in Deep Outer Ruins (Lv. 4) (> 130 units west)
    SKELETON_MAGE_SPAWNS.forEach((sp) => {
      const { group, parts } = createEnemyMesh('skeleton_mage');
      const ey = this.world.getTerrainHeight(sp.pos[0], sp.pos[1]);
      group.position.set(sp.pos[0], ey, sp.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: sp.id,
        name: sp.name,
        nameId: sp.nameId,
        type: sp.type,
        level: sp.level,
        hp: sp.hp,
        maxHp: sp.maxHp,
        attack: sp.attack,
        defense: sp.defense,
        expReward: sp.expReward,
        goldReward: sp.goldReward,
        speed: 2.3,
        attackRange: 6.0,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
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

    // 5. Distant Coast Beach Goblins (Lv. 2) - Far Rocky Coastline (> 110 units south-east)
    BEACH_GOBLIN_SPAWNS.forEach((sp) => {
      const { group, parts } = createEnemyMesh('goblin');
      const ey = this.world.getTerrainHeight(sp.pos[0], sp.pos[1]);
      group.position.set(sp.pos[0], ey, sp.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: sp.id,
        name: sp.name,
        nameId: sp.nameId,
        type: sp.type,
        level: sp.level,
        hp: sp.hp,
        maxHp: sp.maxHp,
        attack: sp.attack,
        defense: sp.defense,
        expReward: sp.expReward,
        goldReward: sp.goldReward,
        speed: 2.8,
        attackRange: 2.0,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
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

    // 6. Mystic Forest Stone Golems (Lv. 4) - Deep Eastern Wilderness (> 95 units east)
    FOREST_GOLEM_SPAWNS.forEach((sp) => {
      const { group, parts } = createEnemyMesh('golem');
      const ey = this.world.getTerrainHeight(sp.pos[0], sp.pos[1]);
      group.position.set(sp.pos[0], ey, sp.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: sp.id,
        name: sp.name,
        nameId: sp.nameId,
        type: sp.type,
        level: sp.level,
        hp: sp.hp,
        maxHp: sp.maxHp,
        attack: sp.attack,
        defense: sp.defense,
        expReward: sp.expReward,
        goldReward: sp.goldReward,
        speed: 1.8,
        attackRange: 2.8,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
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

    // 7. Mystic Forest Venomous Spiders (Lv. 3) - Dark Northern Canopy (> 105 units north-east)
    FOREST_SPIDER_SPAWNS.forEach((sp) => {
      const { group, parts } = createEnemyMesh('spider');
      const ey = this.world.getTerrainHeight(sp.pos[0], sp.pos[1]);
      group.position.set(sp.pos[0], ey, sp.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: sp.id,
        name: sp.name,
        nameId: sp.nameId,
        type: sp.type,
        level: sp.level,
        hp: sp.hp,
        maxHp: sp.maxHp,
        attack: sp.attack,
        defense: sp.defense,
        expReward: sp.expReward,
        goldReward: sp.goldReward,
        speed: 3.5,
        attackRange: 2.2,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
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

    // 8. Ancient Obsidian Titan Golem Boss in Sanctuary Basin Arena (x: -260, z: -20)
    const bossPos: [number, number] = [-260, -20];
    const { group: bossGroup, parts: bossParts } = createEnemyMesh('boss');
    const by = this.world.getTerrainHeight(bossPos[0], bossPos[1]);
    bossGroup.position.set(bossPos[0], by, bossPos[1]);
    this.scene.add(bossGroup);

    const bossData: EnemyData = {
      id: 'boss_titan',
      name: 'Obsidian Titan Golem',
      nameId: 'Sang Titan Kuno Obsidian',
      type: 'boss',
      level: 8,
      hp: 850,
      maxHp: 850,
      attack: 36,
      defense: 18,
      expReward: 800,
      goldReward: 550,
      speed: 2.3,
      attackRange: 4.5,
      detectRange: 20,
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

    // 9. Frostpeak Glacier Frostfang Wolves (Spawned from src/game/monsters.ts)
    FROST_WOLF_SPAWNS.forEach((spawn, idx) => {
      const { group, parts } = createEnemyMesh('frost_wolf');
      const ey = this.world.getTerrainHeight(spawn.pos[0], spawn.pos[1]);
      group.position.set(spawn.pos[0], ey, spawn.pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: spawn.id,
        name: spawn.name,
        nameId: spawn.nameId,
        type: spawn.type,
        level: spawn.level,
        hp: spawn.hp,
        maxHp: spawn.maxHp,
        attack: spawn.attack,
        defense: spawn.defense,
        expReward: spawn.expReward,
        goldReward: spawn.goldReward,
        speed: 3.6,
        attackRange: 2.2,
        detectRange: spawn.aggroRange,
        position: [spawn.pos[0], ey, spawn.pos[1]],
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
      [-20, -320],
      [-40, -325],
      [-15, -345],
      [-38, -350],
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

    // 15. Gurun Solaria: Kalajengking Raksasa & Pasukan Pasir Pharaoh (Outer Pyramid Dunes: [-180, 180])
    const desertPositions: [number, number][] = [
      [-165, 165],
      [-195, 175],
      [-170, 195],
      [-200, 205],
    ];
    desertPositions.forEach((pos, idx) => {
      const { group, parts } = createEnemyMesh('spider');
      const ey = this.world.getTerrainHeight(pos[0], pos[1]);
      group.position.set(pos[0], ey, pos[1]);
      this.scene.add(group);

      const enemyData: EnemyData = {
        id: `solaria_scorpion_${idx}`,
        name: 'Solaria Dune Scorpion',
        nameId: 'Kalajengking Pasir Solaria',
        type: 'spider',
        level: 5,
        hp: 130,
        maxHp: 130,
        attack: 22,
        defense: 10,
        expReward: 105,
        goldReward: 60,
        speed: 2.9,
        attackRange: 2.2,
        detectRange: 16,
        position: [pos[0], ey, pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[0], chance: 0.3 },
          { item: CHEST_LOOT_POOL[3], chance: 0.4 },
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

    // Dragonfang Super Boss: Ignis, Sang Naga Purba (Colossal Winged Dragon: [50, 360])
    const wyrmPos: [number, number] = [50, 360];
    const { group: wyrmGroup, parts: wyrmParts } = createEnemyMesh('dragon');
    const wyrmY = this.world.getTerrainHeight(wyrmPos[0], wyrmPos[1]);
    wyrmGroup.position.set(wyrmPos[0], wyrmY, wyrmPos[1]);
    this.scene.add(wyrmGroup);

    const wyrmData: EnemyData = {
      id: 'boss_dragonfang',
      name: 'Ignis, The Primal Dragon',
      nameId: 'Ignis, Sang Naga Purba',
      type: 'boss',
      level: 12,
      hp: 1200,
      maxHp: 1200,
      attack: 46,
      defense: 22,
      expReward: 1200,
      goldReward: 850,
      speed: 2.8,
      attackRange: 5.5,
      detectRange: 22,
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

    // Solaria Desert Colossal Super Boss: Jarrus, Sang Cacing Purba (Segmented Burrowing Sandworm: [460, -180])
    const wormPos: [number, number] = [460, -180];
    const { group: wormGroup, parts: wormParts } = createEnemyMesh('worm');
    const wormY = this.world.getTerrainHeight(wormPos[0], wormPos[1]);
    wormGroup.position.set(wormPos[0], wormY, wormPos[1]);
    this.scene.add(wormGroup);

    const wormData: EnemyData = {
      id: 'boss_jarrus',
      name: 'Jarrus, The Ancient Sandworm',
      nameId: 'Jarrus, Sang Cacing Purba Solaria',
      type: 'boss',
      level: 10,
      hp: 1050,
      maxHp: 1050,
      attack: 42,
      defense: 20,
      expReward: 1050,
      goldReward: 700,
      speed: 2.6,
      attackRange: 5.0,
      detectRange: 30,
      position: [wormPos[0], wormY, wormPos[1]],
      isDead: false,
      dropItems: [
        { item: CHEST_LOOT_POOL[0], chance: 1.0 },
        { item: CHEST_LOOT_POOL[2], chance: 1.0 },
      ],
    };

    this.enemies.push({
      data: wormData,
      mesh: wormGroup,
      parts: wormParts,
      baseY: wormY,
      attackCooldown: 0,
      walkCycle: 0,
    });

    // Initialize territory origin points and leash parameters for all monsters
    this.enemies.forEach((e) => {
      if (!e.spawnPos) {
        e.spawnPos = e.mesh.position.clone();
      }
      e.isReturning = false;
      e.deathTimer = 0;
      e.leashRadius = e.data.id === 'boss_dragonfang' ? 25 : (e.data.id === 'boss_titan' ? 20 : (e.data.type === 'boss' ? 38 : 22));
    });
  }

  // Fast travel / teleport from map

  public respawnPlayerAtLastVisitedTown() {
    if (this.isCasting) {
      this.isCasting = false;
      this.callbacks.onCastingUpdate?.(null);
      soundManager.stopStarfallCharge();
      if (this.castingCircleInstance) {
        this.scene.remove(this.castingCircleInstance.group);
        this.castingCircleInstance.cleanup();
        this.castingCircleInstance = null;
      }
    }
    this.bossManager.clearDebuffs();
    soundManager.handlePlayerRespawn();
    const targetY = Math.max(0.5, this.world.getTerrainHeight(this.lastVisitedTownPos.x, this.lastVisitedTownPos.z) + 0.5);
    this.playerPos.set(this.lastVisitedTownPos.x, targetY, this.lastVisitedTownPos.z);
    this.playerVel.set(0, 0, 0);
    this.callbacks.onAddFloatingText(
      `Kamu dikalahkan! Bangkit kembali di ${this.lastVisitedTownPos.name}.`,
      '#ff5252',
      'crit'
    );
    soundManager.playLevelUp();
    this.callbacks.onUpdateStats((stats) => ({
      ...stats,
      hp: stats.maxHp,
      mp: stats.maxMp,
      gold: Math.max(0, stats.gold - 10),
    }));
  }

  public unlockCheckpoint(cp: WorldCheckpoint) {
    this.unlockedCheckpoints.add(cp.id);
    cp.unlocked = true;
    if (cp.setUnlocked) cp.setUnlocked(true);
    try {
      localStorage.setItem(
        'eldoria_unlocked_checkpoints',
        JSON.stringify(Array.from(this.unlockedCheckpoints))
      );
    } catch {}
    soundManager.playCheckpointUnlock();
    this.callbacks.onAddFloatingText(`ðŸŒŸ Wilayah Terbuka: ${cp.nameId}!`, '#00e5ff', 'crit');
    if (this.callbacks.onCheckpointUnlocked) {
      this.callbacks.onCheckpointUnlocked(cp.id, cp.nameId, [cp.position[0], cp.position[2]]);
    }
  }

  public getUnlockedCheckpoints(): string[] {
    return Array.from(this.unlockedCheckpoints);
  }

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
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('pagehide', this.handleBlur);
    window.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';
    dom.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    dom.addEventListener('wheel', this.handleWheel, { passive: false });

    // Touch support for camera swipe & pinch zoom with non-passive preventDefault on mobile
    dom.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });
  }

  private handleContextMenu = () => {
    // If context menu opens, release all keys immediately so player does not walk by itself
    this.resetKeys();
  };

  private handleBlur = () => {
    this.resetKeys();
  };

  private handleFocus = () => {
    // Regaining focus: flush keys in case keyup was missed while out of focus
    this.resetKeys();
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.resetKeys();
    }
  };

  public resetKeys() {
    this.keys = {};
    this.joystickVector = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.playerVel.x = 0;
    this.playerVel.z = 0;
  }

  public isKeyPressed(...names: string[]): boolean {
    if (this.isControlsLocked || this.isPaused || this.isCasting) return false;

    // Check if user is currently typing in any input element
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement) {
      const activeTag = (activeElement.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || Boolean(activeElement.isContentEditable)) {
        return false;
      }
    }

    for (const name of names) {
      const lower = name.toLowerCase();
      if (this.keys[lower] || this.keys[name]) return true;
    }
    return false;
  }

  /**
   * Toggle Spectator / Freecam Mode (Minecraft-Style Fly Cam)
   * When enabled, player mesh is invisible, collisions disabled, and camera flies freely via WASD + Space + Shift.
   */
  public toggleSpectatorMode(targetState?: boolean, landAtCamera = false): boolean {
    const nextState = targetState !== undefined ? targetState : !this.isSpectatorMode;
    if (this.isSpectatorMode === nextState) return this.isSpectatorMode;

    this.isSpectatorMode = nextState;

    if (this.isSpectatorMode) {
      this.savedPlayerPos.copy(this.playerPos);
      this.spectatorPos.copy(this.camera.position);
      this.spectatorYaw = this.cameraAngleH;
      this.spectatorPitch = -this.cameraAngleV;
      this.playerMesh.group.visible = false;

      this.callbacks.onAddFloatingText(
        'Mode Spektator Aktif (WASD / Space / Shift / Scroll Speed)',
        '#38bdf8',
        'info'
      );
    } else {
      if (landAtCamera) {
        this.playerPos.x = this.spectatorPos.x;
        this.playerPos.z = this.spectatorPos.z;
        this.playerPos.y = this.world.getTerrainHeight(this.spectatorPos.x, this.spectatorPos.z);
        this.playerVel.set(0, 0, 0);
        this.playerMesh.group.position.copy(this.playerPos);
        this.callbacks.onAddFloatingText('Mendarat di Titik Spektator', '#38bdf8', 'info');
      } else {
        this.playerPos.copy(this.savedPlayerPos);
        this.playerVel.set(0, 0, 0);
        this.playerMesh.group.position.copy(this.playerPos);
        this.callbacks.onAddFloatingText('Kembali ke Posisi Karakter', '#94a3b8', 'info');
      }

      this.playerMesh.group.visible = true;
      this.cameraAngleH = this.spectatorYaw;
      this.cameraAngleV = clampCameraPitch(-this.spectatorPitch);
    }

    if (this.callbacks.onSpectatorModeChange) {
      this.callbacks.onSpectatorModeChange(this.isSpectatorMode);
    }

    return this.isSpectatorMode;
  }

  private updateSpectatorMovement(delta: number) {
    const cosPitch = Math.cos(this.spectatorPitch);
    const sinPitch = Math.sin(this.spectatorPitch);
    const sinYaw = Math.sin(this.spectatorYaw);
    const cosYaw = Math.cos(this.spectatorYaw);

    const fwdX = -sinYaw * cosPitch;
    const fwdY = sinPitch;
    const fwdZ = -cosYaw * cosPitch;

    const rightX = cosYaw;
    const rightY = 0;
    const rightZ = -sinYaw;

    const upX = 0;
    const upY = 1;
    const upZ = 0;

    // Variable Speed Spectator Freecam:
    // - Tahan [Shift] untuk Sprint Fly (3x lipat)
    // - Tahan [Ctrl] atau [Alt] untuk Slow Precision Fly (0.3x lipat)
    const isSprint = this.isKeyPressed('shift', 'shiftleft', 'shiftright');
    const isSlow = this.isKeyPressed('control', 'controlleft', 'controlright', 'alt', 'altleft', 'altright');

    const { speed: currentSpeed } = calculateSpectatorSpeed(this.spectatorSpeed, isSprint, isSlow);
    const moveDist = currentSpeed * delta;
    let moveX = 0;
    let moveY = 0;
    let moveZ = 0;

    const isFwd = this.isKeyPressed('w', 'keyw', 'arrowup');
    const isBack = this.isKeyPressed('s', 'keys', 'arrowdown');
    const isRight = this.isKeyPressed('d', 'keyd', 'arrowright');
    const isLeft = this.isKeyPressed('a', 'keya', 'arrowleft');
    const isUp = this.isKeyPressed(' ', 'space');
    // Descend: Q, E, C
    const isDown = this.isKeyPressed('q', 'keyq', 'e', 'keye', 'c', 'keyc');

    if (isFwd) {
      moveX += fwdX;
      moveY += fwdY;
      moveZ += fwdZ;
    }
    if (isBack) {
      moveX -= fwdX;
      moveY -= fwdY;
      moveZ -= fwdZ;
    }
    if (isRight) {
      moveX += rightX;
      moveY += rightY;
      moveZ += rightZ;
    }
    if (isLeft) {
      moveX -= rightX;
      moveY -= rightY;
      moveZ -= rightZ;
    }
    if (isUp) {
      moveX += upX;
      moveY += upY;
      moveZ += upZ;
    }
    if (isDown) {
      moveX -= upX;
      moveY -= upY;
      moveZ -= upZ;
    }

    const len = Math.hypot(moveX, moveY, moveZ);
    if (len > 0.001) {
      this.spectatorPos.x += (moveX / len) * moveDist;
      this.spectatorPos.y += (moveY / len) * moveDist;
      this.spectatorPos.z += (moveZ / len) * moveDist;
    }

    this.camera.position.copy(this.spectatorPos);
    const lookTarget = this.spectatorPos.clone().add(new THREE.Vector3(fwdX, fwdY, fwdZ));
    this.camera.lookAt(lookTarget);


  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Check if user is typing in an input, textarea, or contentEditable element
    const activeElement = document.activeElement as HTMLElement | null;
    const activeTag = (activeElement?.tagName || '').toLowerCase();
    const isTyping = activeTag === 'input' || activeTag === 'textarea' || Boolean(activeElement?.isContentEditable);

    if (this.isControlsLocked || this.isPaused || isTyping) {
      this.resetKeys();
      return;
    }

    const key = e.key.toLowerCase();
    const code = e.code.toLowerCase();

    this.keys[key] = true;
    this.keys[code] = true;
    if (e.key === 'F3' || e.code === 'F3') {
      e.preventDefault();
      this.toggleSpectatorMode();
      return;
    }

    if (this.isSpectatorMode) {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'shift'].includes(code) || ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key)) {
        e.preventDefault();
      }
      return;
    }


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
      this.callbacks.onAddFloatingText('Mode Senjata: Busur & Panah Pemburu ðŸ¹', '#34d399', 'info');
    } else {
      soundManager.playRogueDoubleSlash();
      this.callbacks.onAddFloatingText('Mode Senjata: Belati Bayangan ðŸ—¡ï¸', '#10b981', 'info');
    }
    if (this.callbacks.onHunterWeaponSwitch) {
      this.callbacks.onHunterWeaponSwitch(this.hunterWeaponMode);
    }
  }

  public getHunterWeaponMode(): 'dagger' | 'bow' {
    return this.hunterWeaponMode;
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key?.toLowerCase();
    const code = e.code?.toLowerCase();

    if (key) {
      delete this.keys[key];
    }
    if (code) {
      delete this.keys[code];
    }
    if (e.key) {
      delete this.keys[e.key];
    }
    if (e.code) {
      delete this.keys[e.code];
    }

    // If no movement keys are currently pressed and joystick is centered, cancel momentum immediately
    if (!this.isKeyPressed('w', 'keyw', 'arrowup', 's', 'keys', 'arrowdown', 'a', 'keya', 'arrowleft', 'd', 'keyd', 'arrowright')) {
      if (Math.abs(this.joystickVector.x) <= 0.08 && Math.abs(this.joystickVector.y) <= 0.08) {
        this.playerVel.x = 0;
        this.playerVel.z = 0;
      }
    }
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

    if (this.isSpectatorMode) {
      this.spectatorYaw = normalizeCameraYaw(
        this.spectatorYaw - deltaX * CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_H
      );
      this.spectatorPitch = Math.max(
        -Math.PI / 2.05,
        Math.min(Math.PI / 2.05, this.spectatorPitch - deltaY * CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_V)
      );
      return;
    }

    this.cameraAngleH = normalizeCameraYaw(
      this.cameraAngleH - deltaX * CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_H
    );
    this.cameraAngleV = clampCameraPitch(
      this.cameraAngleV + deltaY * CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_V
    );
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (this.isSpectatorMode) {
      this.isMouseDown = false;
      this.isDraggingCamera = false;
      return;
    }
    // If left-click and user didn't drag the camera, perform normal attack
    if (this.isMouseDown && !this.isDraggingCamera && e.button === 0) {
      this.performBasicAttack();
    }
    this.isMouseDown = false;
    this.isDraggingCamera = false;
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.isSpectatorMode) {
      const delta = -Math.sign(e.deltaY) * SPECTATOR_CONFIG.SCROLL_STEP;
      this.spectatorSpeed = clampSpectatorSpeed(this.spectatorSpeed + delta);
      this.callbacks.onAddFloatingText(
        `Kecepatan Terbang: ${Math.round(this.spectatorSpeed)} m/s (Shift: ${Math.round(this.spectatorSpeed * SPECTATOR_CONFIG.SPRINT_MULTIPLIER)} | Ctrl: ${(this.spectatorSpeed * SPECTATOR_CONFIG.SLOW_MULTIPLIER).toFixed(1)})`,
        '#38bdf8',
        'info'
      );
      return;
    }
    this.cameraDistance = clampCameraDistance(this.cameraDistance + e.deltaY * 0.006);
  };

  public adjustSpectatorSpeed(delta: number) {
    if (!this.isSpectatorMode) return;
    this.spectatorSpeed = clampSpectatorSpeed(this.spectatorSpeed + delta);
    this.callbacks.onAddFloatingText(
      `Kecepatan Terbang: ${Math.round(this.spectatorSpeed)} m/s`,
      '#38bdf8',
      'info'
    );
  }

  public getSpectatorSpeed(): number {
    return this.spectatorSpeed;
  }

  /**
   * Enter Mage Tower with safe transition:
   * 1. Validates coordinates with fallback protection
   * 2. Freezes character movement (velocity = 0) and pauses gravity for 0.25s grace period
   * 3. Sets character to stand exactly on the interior ground floor (Y = -45.0)
   * 4. Resets 3D camera to behind the shoulder facing into the room without lerping through the void
   */
  public enterMageTower() {
    const safeSpawn = getSafeInteriorSpawn(1);

    if (!validateTeleportCoordinates(safeSpawn)) {
      const fallback = getSafeExteriorSpawn();
      this.playerPos.set(fallback.x, fallback.y, fallback.z);
      this.playerVel.set(0, 0, 0);
      return;
    }

    // Freeze velocity and activate transition grace timer
    this.teleportGraceTimer = MAGE_TOWER_CONFIG.TRANSITION_GRACE_DURATION;
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;

    // Set player position and orientation firmly onto the Level 1 floor (interiorFloorHeight + 1.0 safe clearance)
    this.playerPos.set(safeSpawn.x, safeSpawn.y, safeSpawn.z);
    this.playerRotationY = safeSpawn.rotationY ?? 0;
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.rotation.y = this.playerRotationY;

    // Reset 3D camera behind player shoulder looking into the room
    this.cameraAngleH = MAGE_TOWER_CONFIG.INTERIOR_CAMERA.angleH;
    this.cameraAngleV = MAGE_TOWER_CONFIG.INTERIOR_CAMERA.angleV;
    this.cameraDistance = MAGE_TOWER_CONFIG.INTERIOR_CAMERA.distance;

    const camX = this.playerPos.x;
    const camY = this.playerPos.y + MAGE_TOWER_CONFIG.INTERIOR_CAMERA.offsetY;
    const camZ = this.playerPos.z + this.cameraDistance;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.4, this.playerPos.z - 4.0);

    soundManager.playCheckpointUnlock();
    this.callbacks.onAddFloatingText('Memasuki Mage Tower: Perpustakaan Kitab Kuno (Lantai 1)', '#38bdf8', 'info');
  }

  /**
   * Exit Mage Tower with safe transition back to exterior at Puncak Halilintar
   */
  public exitMageTower() {
    const extBaseY = this.world.getTerrainHeight(
      MAGE_TOWER_CONFIG.EXTERIOR_SAFE_SPAWN.x,
      MAGE_TOWER_CONFIG.EXTERIOR_SAFE_SPAWN.z
    );
    const safeSpawn = getSafeExteriorSpawn(extBaseY);

    this.teleportGraceTimer = MAGE_TOWER_CONFIG.TRANSITION_GRACE_DURATION;
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;

    this.playerPos.set(safeSpawn.x, safeSpawn.y, safeSpawn.z);
    this.playerRotationY = safeSpawn.rotationY;
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.rotation.y = this.playerRotationY;

    // Reset camera behind player looking towards courtyard
    this.cameraAngleH = Math.PI;
    this.cameraAngleV = 0.22;
    this.cameraDistance = 6.0;

    const camX = this.playerPos.x;
    const camY = safeSpawn.y + 2.8;
    const camZ = this.playerPos.z - 6.0;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.playerPos.x, safeSpawn.y + 1.4, this.playerPos.z + 4.0);

    soundManager.playCheckpointUnlock();
    this.callbacks.onAddFloatingText('Kembali ke Pelataran Puncak Halilintar', '#38bdf8', 'info');
  }

  /**
   * Teleports between Mage Tower interior floors (Lantai 1, 2, 3)
   */
  public teleportMageTowerFloor(targetFloor: 1 | 2 | 3) {
    const floorY = targetFloor === 3
      ? MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_3
      : targetFloor === 2
      ? MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_2
      : MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_1;

    this.teleportGraceTimer = MAGE_TOWER_CONFIG.TRANSITION_GRACE_DURATION;
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;

    const spawnZ = targetFloor === 1 ? -129.5 : targetFloor === 2 ? -132.5 : -134.5;
    this.playerPos.set(MAGE_TOWER_CONFIG.INTERIOR_CENTER.x, floorY + 1.0, spawnZ);
    this.playerRotationY = 0;
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.rotation.y = this.playerRotationY;

    this.cameraAngleH = 0;
    this.cameraAngleV = 0.18;
    this.cameraDistance = 5.2;

    const camY = floorY + 2.2;
    this.camera.position.set(this.playerPos.x, camY, this.playerPos.z + this.cameraDistance);
    this.camera.lookAt(this.playerPos.x, floorY + 1.4, this.playerPos.z - 4.0);

    soundManager.playCheckpointUnlock();
    const floorName = targetFloor === 3
      ? 'Lantai 3: Anjungan Puncak Observatorium ðŸŒŒ'
      : targetFloor === 2
      ? 'Lantai 2: Laboratorium Alkimia & Kristal Petir ðŸ§ª'
      : 'Lantai 1: Perpustakaan Kitab Kuno & Altar ðŸ“š';
    this.callbacks.onAddFloatingText(floorName, '#38bdf8', 'info');
  }

  private touchStartX = 0;
  private touchStartY = 0;
  private isTouchingCamera = false;
  private cameraTouchId: number | null = null;
  private initialPinchDist = 0;
  private initialPinchCamDist = 7;

  private getCanvasCameraTouches(touches: TouchList): Touch[] {
    const valid: Touch[] = [];
    const h = window.innerHeight;

    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      // Only exclude the bottom-left joystick area (~160px x 160px)
      const inJoystickZone = t.clientX < 160 && t.clientY > h - 160;

      if (!inJoystickZone) {
        valid.push(t);
      }
    }
    return valid;
  }

  private handleTouchStart = (e: TouchEvent) => {
    const camTouches = this.getCanvasCameraTouches(e.touches);
    if (camTouches.length > 0 && e.cancelable) {
      e.preventDefault();
    }

    // If 2 touches are active on camera area, handle pinch zoom
    if (camTouches.length === 2) {
      const t1 = camTouches[0];
      const t2 = camTouches[1];
      this.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      this.initialPinchCamDist = this.cameraDistance;
      return;
    }

    const h = window.innerHeight;

    // Capture touch for camera rotation: entire right screen and non-joystick areas pass through
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const inJoystickZone = touch.clientX < 160 && touch.clientY > h - 160;

      if (!inJoystickZone && this.cameraTouchId === null) {
        this.cameraTouchId = touch.identifier;
        this.isTouchingCamera = true;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        break;
      }
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    const camTouches = this.getCanvasCameraTouches(e.touches);
    if ((this.isTouchingCamera || camTouches.length === 2) && e.cancelable) {
      e.preventDefault();
    }

    // Pinch-to-zoom handler
    if (camTouches.length === 2 && this.initialPinchDist > 10) {
      const t1 = camTouches[0];
      const t2 = camTouches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const pinchDelta = (this.initialPinchDist - currentDist) * CAMERA_CONFIG.PINCH_ZOOM_SENSITIVITY;
      this.cameraDistance = clampCameraDistance(this.initialPinchCamDist + pinchDelta);
      return;
    }

    if (!this.isTouchingCamera || this.cameraTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.cameraTouchId) {
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;

        this.cameraAngleH = normalizeCameraYaw(
          this.cameraAngleH - deltaX * CAMERA_CONFIG.TOUCH_LOOK_SENSITIVITY_H
        );
        this.cameraAngleV = clampCameraPitch(
          this.cameraAngleV + deltaY * CAMERA_CONFIG.TOUCH_LOOK_SENSITIVITY_V
        );
        break;
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.cameraTouchId !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.cameraTouchId) {
          this.cameraTouchId = null;
          this.isTouchingCamera = false;
          break;
        }
      }
    }
    if (e.touches.length < 2) {
      this.initialPinchDist = 0;
    }
  };

  /**
   * Public camera rotation method used by mobile transparent touch drag area
   */
  public rotateCameraByDelta(deltaX: number, deltaY: number) {
    if (this.isSpectatorMode) {
      this.spectatorYaw = normalizeCameraYaw(
        this.spectatorYaw - deltaX * CAMERA_CONFIG.TOUCH_LOOK_SENSITIVITY_H
      );
      this.spectatorPitch = Math.max(
        -Math.PI / 2.05,
        Math.min(Math.PI / 2.05, this.spectatorPitch - deltaY * CAMERA_CONFIG.TOUCH_LOOK_SENSITIVITY_V)
      );
      return;
    }
    this.cameraAngleH = normalizeCameraYaw(
      this.cameraAngleH - deltaX * CAMERA_CONFIG.TOUCH_LOOK_SENSITIVITY_H
    );
    this.cameraAngleV = clampCameraPitch(
      this.cameraAngleV + deltaY * CAMERA_CONFIG.TOUCH_LOOK_SENSITIVITY_V
    );
  }

  public zoomCameraByDelta(deltaZoom: number) {
    if (this.isSpectatorMode) {
      const delta = -Math.sign(deltaZoom) * 3.0;
      this.spectatorSpeed = Math.max(4.0, Math.min(90.0, this.spectatorSpeed + delta));
      this.callbacks.onAddFloatingText(`Kecepatan Terbang: ${Math.round(this.spectatorSpeed)} m/s`, '#38bdf8', 'info');
      return;
    }
    this.cameraDistance = clampCameraDistance(this.cameraDistance + deltaZoom);
  }

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

  public triggerCameraFovPunch(amount = 4.0, duration = 0.18) {
    this.cameraFovPunch = Math.max(this.cameraFovPunch, amount);
  }

  private addVfx(object: THREE.Object3D, update: (delta: number) => boolean, cleanup?: () => void, isPriority = false) {
    // Lightweight rendering optimization: prune oldest non-priority VFX if pool exceeds 75 to keep 60 FPS
    if (this.activeVfx.length > 75) {
      const indexToPrune = this.activeVfx.findIndex((v) => !v.isPriority);
      if (indexToPrune !== -1) {
        const pruned = this.activeVfx.splice(indexToPrune, 1)[0];
        this.scene.remove(pruned.object);
        if (pruned.cleanup) {
          try {
            pruned.cleanup();
          } catch {}
        }
      }
    }
    this.scene.add(object);
    this.activeVfx.push({ object, update, cleanup, isPriority });
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

  // Particle sparks with active particle limiter (max 150 particles)
  private spawnSparks(position: THREE.Vector3, color: number, count = 8, speed = 4) {
    const maxAllowed = Math.max(0, 150 - this.currentParticleCount);
    const actualCount = Math.min(count, maxAllowed);
    if (actualCount <= 0) return;
    this.currentParticleCount += actualCount;

    const group = new THREE.Group();
    group.position.copy(position);

    const particles: { mesh: THREE.Mesh; vel: THREE.Vector3 }[] = [];
    const geom = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    for (let i = 0; i < actualCount; i++) {
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
        this.currentParticleCount = Math.max(0, this.currentParticleCount - actualCount);
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
  private spawnWarriorWhirlwindVfx(customPos?: THREE.Vector3) {
    const group = new THREE.Group();
    const origin = (customPos || this.playerPos).clone();
    group.position.copy(origin);

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
      group.position.copy(customPos || this.playerPos);
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

    this.spawnShockwaveRing(origin, 0xfbbf24, 5.2, 0.55);
    this.spawnShockwaveRing(origin, 0xffffff, 3.8, 0.4);
    this.spawnSparks(origin.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xf59e0b, 20, 5);
    if (!customPos) {
      this.triggerCameraShake(0.28);
    }
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

  // 5. Mage Arcane Laser Beam & 3D Magic Circle (1.0s Channel with continuous raycast hit detection)
  private spawnMageArcaneLaserBeam(customFwd?: THREE.Vector3, customSpawnPos?: THREE.Vector3, isRemote = false) {
    const fwd = customFwd
      ? customFwd.clone().normalize()
      : new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    // Position Magic Circle right in front of the staff crystal tip (+0.12 unit forward)
    let origin: THREE.Vector3;
    let getOriginCb: (() => { origin: THREE.Vector3; direction?: THREE.Vector3 }) | undefined;

    if (customSpawnPos) {
      origin = customSpawnPos.clone().add(fwd.clone().multiplyScalar(0.7)).add(new THREE.Vector3(0, 1.45, 0));
    } else if (this.playerMesh && this.playerMesh.orbMesh) {
      this.playerMesh.group.updateMatrixWorld(true);
      const crystalWorldPos = new THREE.Vector3();
      this.playerMesh.orbMesh.getWorldPosition(crystalWorldPos);
      origin = crystalWorldPos.clone().add(fwd.clone().multiplyScalar(0.5));

      getOriginCb = () => {
        if (!this.playerMesh?.orbMesh) return { origin, direction: fwd };
        this.playerMesh.group.updateMatrixWorld(true);
        const curCrystalPos = new THREE.Vector3();
        this.playerMesh.orbMesh.getWorldPosition(curCrystalPos);
        const curFwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
        return {
          origin: curCrystalPos.add(curFwd.clone().multiplyScalar(0.5)),
          direction: curFwd,
        };
      };
    } else {
      origin = this.playerPos.clone().add(fwd.clone().multiplyScalar(1.1)).add(new THREE.Vector3(0, 1.5, 0));
    }

    const beamLength = 34.0;

    // Helper for raycast hitbox damage against all enemies (mobs and bosses)
    const checkLaserHit = (isContinuousTick: boolean) => {
      if (isRemote || !this.isRunning) return;

      this.callbacks.onUpdateStats((stats) => {
        const isCrit = Math.random() < 0.22 + stats.intelligence * 0.015;
        const tierMult = 1 + (this.playerTier - 1) * 0.25;
        const fullSpellDmg = (stats.baseAttack + stats.intelligence * 2.4) * tierMult;

        // Initial burst does 52% damage with full impact, ticks do 28% continuous damage (Total ~136% spell power over 1s)
        const rawDmg = isContinuousTick ? fullSpellDmg * 0.28 : fullSpellDmg * 0.52;
        const finalDmg = Math.max(4, Math.round(isCrit ? rawDmg * 1.85 : rawDmg));

        this.enemies.forEach((enemy) => {
          if (enemy.data.isDead) return;

          const enemyPos = enemy.mesh.position;
          const toEnemy = new THREE.Vector3().subVectors(enemyPos, origin);
          const projDist = toEnemy.dot(fwd);

          // Check if enemy lies within beam length forward
          if (projDist >= 0.2 && projDist <= beamLength + 1.2) {
            const closestPoint = origin.clone().addScaledVector(fwd, projDist);
            const distToBeam = enemyPos.distanceTo(closestPoint);

            const isBoss = enemy.data.type === 'boss' || enemy.data.id.includes('boss');
            const hitRadius = isBoss ? 4.8 : 2.2;

            if (distToBeam <= hitRadius) {
              this.damageEnemy(enemy, finalDmg, isCrit, isContinuousTick ? 0.05 : 0.35);

              const hitPos = enemyPos.clone().add(new THREE.Vector3(0, 1.2, 0));
              this.spawnSparks(hitPos, 0xe879f9, isContinuousTick ? 6 : 14, 4.0);
              this.spawnSparks(hitPos, 0xffffff, isContinuousTick ? 3 : 8, 3.2);

              if (!isContinuousTick) {
                this.spawnHitStarburst(hitPos, 0xe879f9, 1.3);
                this.spawnShockwaveRing(hitPos, 0xc084fc, 2.4, 0.25);
              }
            }
          }
        });

        return stats;
      });
    };

    const vfx = createMageArcaneLaserBeamVfx({
      origin,
      direction: fwd,
      beamLength,
      duration: 1.0,
      getOrigin: getOriginCb,
      onHitTick: (isTick) => {
        checkLaserHit(isTick);
      },
      onSpawnSparks: (pos, color, count, speed) => {
        this.spawnSparks(pos, color, count, speed);
      },
    });

    this.addVfx(vfx.group, vfx.update, vfx.cleanup);

    // Initial cast sparks at the magic circle aperture
    this.spawnSparks(origin, 0xe879f9, 12, 4.2);
    this.spawnSparks(origin, 0xffffff, 8, 3.0);
  }

  // Backward-compatible alias for Arcane skill projectile calls
  private spawnMageArcaneBolt(customFwd?: THREE.Vector3, customSpawnPos?: THREE.Vector3, isRemote = false) {
    this.spawnMageArcaneLaserBeam(customFwd, customSpawnPos, isRemote);
  }

  // --- MAGE STARFALL (1.0s Cast Time, Movement Lock, Circuit Stroke Reveal & 10-Meteor Continuous Barrage) ---
  private startStarfallCasting() {
    this.isCasting = true;
    this.castingTimer = 0;
    this.castingDuration = 1.0;
    this.castingSkillName = 'Starfall';
    this.playerVel.set(0, 0, 0);

    // Audio: 1.0s swelling runic charging hum
    soundManager.playStarfallCharge(1.0);

    // 3D Magic Circle at feet (y = terrainHeight + 0.05)
    // Pooled Zero-GC instance with 3.5s total visual lifespan (1.0s casting + 2.0s barrage hold + 0.5s fade-out)
    this.castingCircleInstance = createStarfallCastingCircleVfx({
      playerPos: this.playerPos,
      duration: 1.0,
      onSpawnSparks: (pos, color, count, speed) => {
        this.spawnSparks(pos, color, count, speed);
      },
    });

    const circle = this.castingCircleInstance;
    this.addVfx(
      circle.group,
      (delta) => {
        return circle.update(delta, this.playerPos);
      },
      () => {
        circle.cleanup();
        if (this.castingCircleInstance === circle) {
          this.castingCircleInstance = null;
        }
      },
      true // Priority VFX: never prune during casting
    );

    // Notify UI: Display casting progress bar ("Casting... 1.0s")
    this.callbacks.onCastingUpdate?.({
      isCasting: true,
      progress: 0,
      text: 'Casting... 1.0s',
    });
  }

  private completeStarfallCasting() {
    this.isCasting = false;
    this.callbacks.onCastingUpdate?.(null);

    // Trigger Phase 2 Starfall Slam Gesture (0.2s downward staff strike pose)
    // Karakter mengayunkan tongkat ke depan selama 0.2 detik (Detik 1.0 s/d 1.2),
    // lalu kembali ke IDLE / WALK normal sehingga pemain bebas bergerak saat 10 meteor turun
    this.isAttacking = true;
    this.attackType = 'starfall';
    this.attackDuration = 0.20;
    this.attackTimer = 0.20;

    // Stop casting hum and immediately trigger Phase 2 Meteor Fall Impact SFX (meteor_fall.wav)
    soundManager.stopStarfallCharge();
    soundManager.playStarfallImpact(false, 0);

    // NOTE: Magic Circle is NOT removed here!
    // It remains illuminated on the ground during the full 2.0s meteor shower,
    // then smoothly fades out over 0.5s via this.addVfx and castingCircleInstance.update().

    // Calculate target impact area in front of character (14.5 units ahead: safe 12-15 range)
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    let targetPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(14.5));
    let terrainH = this.world.getTerrainHeight(targetPos.x, targetPos.z);
    if (isNaN(terrainH) || terrainH < -20 || isNaN(targetPos.x) || isNaN(targetPos.z)) {
      targetPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(14.5));
      terrainH = this.world.getTerrainHeight(targetPos.x, targetPos.z);
    }
    targetPos.y = Math.max(isNaN(terrainH) ? 0 : terrainH, 0);

    this.spawnStarfallMeteorBarrage(targetPos);
  }

  private spawnStarfallMeteorBarrage(targetCenter: THREE.Vector3, isRemote = false) {
    const safeTargetCenter = targetCenter.clone();
    safeTargetCenter.y = Math.max(safeTargetCenter.y, 0);

    const vfx = createStarfallMeteorBarrageVfx({
      targetCenter: safeTargetCenter,
      onImpact: (impactPos, isLast, idx) => {
        soundManager.playStarfallImpact(isLast, idx);
        this.triggerCameraShake(isLast ? 0.44 : 0.20);

        if (!isRemote && this.isRunning) {
          this.callbacks.onUpdateStats((stats) => {
            const isCrit = Math.random() < 0.25 + stats.intelligence * 0.015;
            const tierMult = 1 + (this.playerTier - 1) * 0.25;
            // 10 Meteors continuous volley: 9 x ~30% + 1 x ~65% finisher = ~335% spell power!
            const mult = isLast ? 0.65 : 0.30;
            const baseDmg = (stats.baseAttack + stats.intelligence * 2.8) * tierMult * mult;
            const finalDmg = Math.max(5, Math.round(isCrit ? baseDmg * 1.85 : baseDmg));

            this.enemies.forEach((enemy) => {
              if (enemy.data.isDead) return;
              const dist = enemy.mesh.position.distanceTo(impactPos);
              if (dist <= 6.8) {
                // Apply AOE damage and knockback away from impact point
                const knockDir = new THREE.Vector3().subVectors(enemy.mesh.position, impactPos).normalize();
                knockDir.y = 0;
                this.damageEnemy(enemy, finalDmg, isCrit, isLast ? 0.55 : 0.30);
                enemy.mesh.position.addScaledVector(knockDir, isLast ? 0.85 : 0.40);
              }
            });

            return stats;
          });
        }

        if (isLast && !isRemote) {
          this.callbacks.onAddFloatingText('â˜„ï¸ Starfall Celestial Rain!', '#f59e0b', 'crit');
        }
      },
      onSpawnSparks: (pos, color, count, speed) => {
        this.spawnSparks(pos, color, count, speed);
      },
    });

    this.addVfx(vfx.group, vfx.update, vfx.cleanup, true);
  }

  // 6. Mage Supernova Astral VFX (Celestial Pillar, Concentric Cosmic Shockwaves & Radial Astral Beams)
  private spawnMageNovaVfx(customCenter?: THREE.Vector3) {
    const center = (customCenter || this.playerPos).clone();

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
    if (!customCenter) {
      this.triggerCameraShake(0.42);
    }
  }

  // 7. Mage Arcane Blink VFX (Dual Runic Magic Circles + 3 Afterimages + Ethereal Tracer + Landing Burst)
  private spawnMageBlinkVfx(startPos: THREE.Vector3, endPos: THREE.Vector3) {
    const vfx = createMageBlinkVfx({
      startPos,
      targetPos: endPos,
      playerRotationY: this.playerRotationY,
      getTerrainHeight: (x, z) => this.world.getTerrainHeight(x, z),
    });

    if (!this.scene.children.includes(vfx.group)) {
      this.scene.add(vfx.group);
    }

    this.addVfx(
      vfx.group,
      (delta) => {
        return vfx.update(delta, () => {
          // OnArrival landing trigger at 0.18s - 0.20s:
          // 1. Restore player avatar visibility at landing coordinates & trigger crouch landing
          if (this.playerMesh && this.playerMesh.group) {
            this.playerMesh.group.visible = true;
            if (this.charClass === 'mage') {
              this.mageLandingCrouchTimer = 0.15;
              if (this.playerMesh.body) {
                this.playerMesh.body.rotation.x = 0;
              }
            }
          }

          // 2. Dual-color neon spark bursts (Cyan & Magenta) at character's feet
          this.spawnSparks(endPos.clone().add(new THREE.Vector3(0, 0.4, 0)), 0x38bdf8, 16, 5.2);
          this.spawnSparks(endPos.clone().add(new THREE.Vector3(0, 0.4, 0)), 0xd946ef, 14, 4.8);

          // 3. Camera FOV Punch (+4 FOV) and visceral Camera Shake
          this.triggerCameraFovPunch(4.0, 0.18);
          this.triggerCameraShake(0.20);
        });
      },
      () => {
        vfx.cleanup();
        if (this.playerMesh && this.playerMesh.group) {
          this.playerMesh.group.visible = true;
          if (this.charClass === 'mage' && this.playerMesh.body) {
            this.playerMesh.body.rotation.x = 0;
          }
        }
      }
    );
  }

  // 8. Mage Celestial Heal Light Pillar (Zero-Lag Pre-allocated Pool + Circuit Stroke Reveal)
  private spawnMageCelestialHealVfx() {
    const vfx = CelestialHealResourcePool.get().acquire(this.playerPos);
    if (!this.scene.children.includes(vfx.group)) {
      this.scene.add(vfx.group);
    }
    this.addVfx(vfx.group, (delta) => {
      const terrainH = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
      return vfx.update(delta, this.playerPos, terrainH);
    });
    this.triggerCameraShake(0.18);
  }

  /**
   * Absorbs incoming damage using active Mage Arcane Shield
   */
  public absorbDamageWithShield(rawDamage: number): { remainingDamage: number; absorbed: number } {
    if (this.isInvulnerable) {
      return { remainingDamage: 0, absorbed: 0 };
    }
    if (this.arcaneShieldHp <= 0 || this.arcaneShieldTimer <= 0) {
      return { remainingDamage: rawDamage, absorbed: 0 };
    }
    if (this.arcaneShieldHp >= rawDamage) {
      this.arcaneShieldHp -= rawDamage;
      this.callbacks.onAddFloatingText(`🛡️ Perisai Menyerap ${rawDamage} Dmg!`, '#38bdf8', 'info');
      if (this.arcaneShieldHp <= 0) {
        this.arcaneShieldHp = 0;
        this.arcaneShieldTimer = 0;
        this.callbacks.onAddFloatingText('Perisai Sihir Habis!', '#f59e0b', 'info');
      }
      return { remainingDamage: 0, absorbed: rawDamage };
    } else {
      const absorbed = this.arcaneShieldHp;
      const remaining = rawDamage - this.arcaneShieldHp;
      this.arcaneShieldHp = 0;
      this.arcaneShieldTimer = 0;
      this.callbacks.onAddFloatingText(`🛡️ Perisai Menyerap ${absorbed} Dmg (Hancur)!`, '#38bdf8', 'info');
      return { remainingDamage: remaining, absorbed };
    }
  }

  // 9. Rogue X-Slash VFX (Dual crossing emerald & shadow blades with intersection starburst)
  private spawnRogueXSlashVfx() {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const spawnPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(1.05)).add(new THREE.Vector3(0, 1.2, 0));

    // Blade 1: Emerald razor arc tilted +40Â°
    this.spawnCrescentSlash(spawnPos, fwd, 0.7, 0x10b981, 1.35, Math.PI * 0.75);
    // Blade 2: Shadow-violet razor arc tilted -40Â°
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

  // Helper to dynamically align player facing direction to active movement or closest 360Â° enemy
  private alignPlayerOrientationToInputOrTarget(maxTargetRange = 18): void {
    let inputForward = 0;
    let inputRight = 0;
    if (this.isKeyPressed('w', 'arrowup')) inputForward += 1;
    if (this.isKeyPressed('s', 'arrowdown')) inputForward -= 1;
    if (this.isKeyPressed('a', 'arrowleft')) inputRight -= 1;
    if (this.isKeyPressed('d', 'arrowright')) inputRight += 1;

    const joyX = this.joystickVector?.x || 0;
    const joyY = this.joystickVector?.y || 0;
    const joyMag = Math.hypot(joyX, joyY);
    if (joyMag > 0.12) {
      inputRight += joyX;
      inputForward -= joyY;
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
  private spawn360BladeSpinVfx(color: number, radius = 3.8, customCenter?: THREE.Vector3) {
    const origin = customCenter || this.playerPos;
    const centerPos = origin.clone().add(new THREE.Vector3(0, 1.1, 0));
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

    this.spawnShockwaveRing(origin, color, radius * 1.25, 0.38);
    this.spawnSparks(centerPos, color, 18, 5.5);
    this.spawnSparks(centerPos, 0xffffff, 8, 4.0);
    if (!customCenter) {
      this.triggerCameraShake(0.24);
    }
  }

  // Hunter Arrow Projectile Spawner (Aerodynamic Wind Spiral and sonic muzzle pop)
  private spawnHunterArrow(aimDirection?: THREE.Vector3, isSkill = false, bonusDmgMult = 1.0, customSpawnPos?: THREE.Vector3, isRemote = false) {
    const fwd = aimDirection
      ? aimDirection.clone().normalize()
      : new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    const spawnPos = customSpawnPos
      ? customSpawnPos.clone().add(fwd.clone().multiplyScalar(0.6)).add(new THREE.Vector3(0, 1.4, 0))
      : this.playerPos.clone().add(fwd.clone().multiplyScalar(1.0)).add(new THREE.Vector3(0, 1.4, 0));
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

    if (isRemote) {
      this.activeProjectiles.push({
        object: arrowObj,
        direction: fwd,
        speed: isSkill ? 32.0 : 28.0,
        lifetime: 1.1,
        damage: 0,
        isCrit: false,
        vfxType: isSkill ? 'hunter_arrow_rain' : 'hunter_arrow',
      });
      return;
    }

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
          // 1. If is360 is true (or combo 3 spin finisher), hits all 360Â° (front, left, right, back!)
          // 2. In close combat radius (<= 2.4m), hits all 360Â° regardless of angle
          // 3. Otherwise for extended reach, covers a wide sweeping ~220Â° arc (dot > -0.35)
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
    if (this.isControlsLocked || this.isAttacking || this.isCasting) return;

    // Align player facing to movement direction or closest 360Â° enemy
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
        charClass: this.charClass,
        hunterWeaponMode: this.hunterWeaponMode,
        x: Math.round(this.playerPos.x * 100) / 100,
        y: Math.round(this.playerPos.y * 100) / 100,
        z: Math.round(this.playerPos.z * 100) / 100,
        rotationY: Math.round(this.playerRotationY * 100) / 100,
      });
    }

    if (this.charClass === 'warrior') {
      if (currentCombo === 2) {
        // Combo 3 Finisher: Full 360Â° Spin Cleave (Hits front, left, right, back!)
        this.attackType = 'basic_spin_360';
        this.attackDuration = 0.42;
        this.attackTimer = 0.42;
        soundManager.playSkillTebas360();
        this.spawn360BladeSpinVfx(0xfbbf24, 3.8);
        this.executeMeleeAttack({
          range: 3.8,
          is360: true,
          dmgMultiplier: 1.85,
          critBonus: 0.15,
          knockback: 1.0,
        });
      } else {
        // Combo 1 & 2: Wide sweeping cleaves (front, flanks, and 360Â° close combat)
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
      this.attackDuration = 1.0;
      this.attackTimer = 1.0;
      if (this.playerMesh) {
        this.playerMesh.rightArm.rotation.set(-Math.PI / 2, 0, 0);
        this.playerMesh.weapon.rotation.set(Math.PI, 0, 0);
        this.playerMesh.body.rotation.set(0, 0, 0);
        this.playerMesh.group.updateMatrixWorld(true);
      }
      soundManager.playArcaneBeam();
      this.spawnMageArcaneLaserBeam();
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
          // Combo 3 Finisher: 360Â° Shadow Blade Whirlwind Cutter (Depan, Belakang, Kiri, Kanan!)
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
          // Rapid dual dagger slashes (covers front, flanks, and close 360Â°)
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
    if (this.isControlsLocked || this.isCasting) return;

    // Dynamically align facing to movement or closest 360Â° enemy
    this.alignPlayerOrientationToInputOrTarget(this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' ? 22 : 16);

    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalPlayerAttack?.({
        attackType: `skill_${skillSlot}`,
        skillSlot,
        charClass: this.charClass,
        hunterWeaponMode: this.hunterWeaponMode,
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
          // Warrior: Pusaran Badai Baja (Full 360Â° Whirlwind)
          soundManager.playSkillPusaran();
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
          this.callbacks.onAddFloatingText('Pusaran Badai Baja 360Â°!', '#fbbf24', 'crit');
        } else if (this.charClass === 'mage') {
          // Mage: Starfall (Hujan Meteor 10-Meteor Barrage with 1.0s Cast Time, Circuit Magic Circle & Movement Lock)
          this.startStarfallCasting();
          return { ...stats, mp: Math.max(0, stats.mp - 15) };
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
            this.callbacks.onAddFloatingText('Hujan Panah Badai! ðŸ¹', '#34d399', 'crit');
          } else {
            // Hunter Daggers Skill 1: Tarian 1000 Belati (Shadow Flurry 360Â°)
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
            this.callbacks.onAddFloatingText('Tarian 1000 Belati 360Â°!', '#34d399', 'crit');
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
          soundManager.playSkillTerjang();
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
          // Mage: Langkah Dimensi (Instant Blink Teleport with Dual Runic Circles, Afterimages & Enemy Penetration)
          soundManager.playMageBlink();
          const startPos = this.playerPos.clone();
          const blinkDir = this.getPlayerMovementDirection();

          let maxDist = 12.0;

          // Raycast Layer Mask: ONLY detect solid environment (buildings, walls, rocks, towers)
          // EXCLUDE enemies, monsters, NPCs, and bosses so player can penetrate through enemies
          const inInterior = this.playerPos.y < -10;
          for (const col of this.world.colliders) {
            const isInteriorCollider = col.maxY !== undefined && col.maxY < 0;
            if (inInterior !== isInteriorCollider) continue;

            if (col.type === 'box' && col.minX !== undefined && col.maxX !== undefined && col.minZ !== undefined && col.maxZ !== undefined) {
              const hit = this.intersectRayAABB2D(startPos.x, startPos.z, blinkDir.x, blinkDir.z, col.minX, col.maxX, col.minZ, col.maxZ);
              if (hit !== null && hit > 0 && hit < maxDist) {
                maxDist = Math.min(maxDist, Math.max(0.6, hit - 0.7));
              }
            } else if (col.type === 'circle' && col.x !== undefined && col.z !== undefined && col.radius !== undefined) {
              const hit = this.intersectRayCircle2D(startPos.x, startPos.z, blinkDir.x, blinkDir.z, col.x, col.z, col.radius);
              if (hit !== null && hit > 0 && hit < maxDist) {
                maxDist = Math.min(maxDist, Math.max(0.6, hit - 0.7));
              }
            }
          }

          // Clamp to expanded world boundaries (-580..680, -460..460)
          let targetX = startPos.x + blinkDir.x * maxDist;
          let targetZ = startPos.z + blinkDir.z * maxDist;
          targetX = Math.max(-580, Math.min(680, targetX));
          targetZ = Math.max(-460, Math.min(460, targetZ));

          // Resolve collisions so player never blinks inside walls or buildings
          const resolved = this.resolveCollisions(targetX, targetZ);
          const targetPos = new THREE.Vector3(
            resolved.x,
            this.world.getTerrainHeight(resolved.x, resolved.z),
            resolved.z
          );

          // Invulnerability (iFrame) during dimension shift (0.2s)
          this.isInvulnerable = true;
          this.invulnerableTimer = 0.2;
          this.isDashing = true;
          this.dashTimer = 0.2;
          this.isAttacking = true;
          this.attackType = 'blink';
          this.attackDuration = 0.2;
          this.attackTimer = 0.2;

          // Torso leans forward in blink direction
          if (this.playerMesh && this.playerMesh.body) {
            this.playerMesh.body.rotation.x = 0.40;
          }

          // Align rotation to blink direction
          this.playerRotationY = Math.atan2(blinkDir.x, blinkDir.z);
          this.playerMesh.group.rotation.y = this.playerRotationY;

          // Immediately teleport player coordinates
          this.playerPos.copy(targetPos);
          this.playerMesh.group.position.copy(targetPos);
          this.playerVel.set(0, 0, 0);

          // Hide original player mesh during the 0.18s leap so only ethereal afterimages are visible
          this.playerMesh.group.visible = false;

          // Spawn pooled VFX
          this.spawnMageBlinkVfx(startPos, targetPos);
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

            this.callbacks.onAddFloatingText('Loncat Akrobatik & Tembakan Jitu! ðŸ¦…', '#34d399', 'info');
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
          soundManager.playSkillBenteng();
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
          // Mage: Hujan Cahaya Astral (Revamped Zero-Lag Celestial Light Pillar & Arcane Shield)
          soundManager.playMageCelestialHeal();
          this.spawnMageCelestialHealVfx();
          this.isAttacking = true;
          this.attackType = 'celestial_heal';
          this.attackDuration = 0.8;
          this.attackTimer = 0.8;

          // 1. Cleanse Debuff: removes 1 negative status effect (Burn / Stun / Poison / Slow)
          const cleansed = this.bossManager?.cleanseDebuff();
          if (cleansed) {
            this.callbacks.onAddFloatingText(`✨ Debuff [${cleansed}] Dibersihkan!`, '#76ff03', 'info');
          }

          // 2. Heal Formula: round(75 + (stats.intelligence * 4.5))
          const healAmt = Math.round(75 + stats.intelligence * 4.5);
          const currentHp = stats.hp;
          const maxHp = stats.maxHp;
          const potentialHp = currentHp + healAmt;
          const newHp = Math.min(maxHp, potentialHp);

          // 3. Overheal-to-Shield: Convert 50% of overflowing heal into 6-second Arcane Shield
          const overflowHeal = Math.max(0, potentialHp - maxHp);
          let shieldGain = 0;
          if (overflowHeal > 0) {
            shieldGain = Math.round(overflowHeal * 0.5);
            this.arcaneShieldHp = Math.min(Math.round(maxHp * 0.75), this.arcaneShieldHp + shieldGain);
            this.arcaneShieldTimer = 6.0;
          }

          // 4. Mana Battery (+30 MP, net +5 MP after 25 MP cost)
          const newMp = Math.min(stats.maxMp, stats.mp - 25 + 30);

          if (shieldGain > 0 && newHp > currentHp) {
            const actualHealed = newHp - currentHp;
            this.callbacks.onAddFloatingText(`+${actualHealed} HP & +${shieldGain} Perisai Astral (6s)!`, '#38bdf8', 'heal');
          } else if (shieldGain > 0) {
            this.callbacks.onAddFloatingText(`HP Penuh! +${shieldGain} Perisai Astral (6s)`, '#38bdf8', 'heal');
          } else {
            this.callbacks.onAddFloatingText(`+${healAmt} HP & +30 Mana Astral`, '#38bdf8', 'heal');
          }

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

            this.callbacks.onAddFloatingText(`+${healAmt} HP & Panah Bom Racun! ðŸ’£`, '#34d399', 'heal');
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
    if (this.isControlsLocked || this.isCasting) return;
    if (this.isGrounded) {
      if (this.charClass === 'warrior') {
        this.playerVel.y = 8.2;
        this.spawnFootstepVfx('dust');
        soundManager.playSkillLompat();
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
    const isBoss =
      enemy.data.type === 'boss' ||
      enemy.data.id === 'boss_titan' ||
      enemy.data.id === 'boss_dragonfang' ||
      enemy.data.id === 'boss_jarrus';

    if (isBoss) {
      const bossName = enemy.data.nameId || enemy.data.name;
      soundManager.playBossVictory(bossName);
      this.callbacks.onBossDefeated?.(bossName);
    } else {
      soundManager.playEnemyDeath();
    }

    // Reward exp and gold silently to stats without spamming floating text on screen
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

    // Corpse persistence: stays collapsed on ground for ~3.6s, then gently sinks into ground and dissolves
    enemy.isReturning = false;
    enemy.deathTimer = 3.6;
    enemy.mesh.rotation.x = -Math.PI / 2.2;
    enemy.mesh.rotation.z = (Math.random() - 0.5) * 0.4;
    const corpseGroundY = this.world.getTerrainHeight(enemy.mesh.position.x, enemy.mesh.position.z);
    enemy.mesh.position.y = corpseGroundY + 0.12;

    // Drop guaranteed monster crafting material
    const material = MONSTER_MATERIALS[enemy.data.type];
    if (material) {
      this.spawnLootPickup(material, enemy.mesh.position);
    }

    // Additional chance-based loot drops (potions / equipment)
    enemy.data.dropItems.forEach((drop) => {
      if (Math.random() <= drop.chance) {
        this.spawnLootPickup(drop.item, enemy.mesh.position);
      }
    });

    // Update quest progress
    this.callbacks.onUpdateQuests((quests) => {
      return quests.map((q) => {
        if (!q.completed && q.targetEnemy === enemy.data.type) {
          const nextCount = q.currentCount + 1;
          const completed = nextCount >= q.targetCount;
          if (completed) {
            this.callbacks.onAddFloatingText(`Misi Selesai: ${q.titleId}!`, '#69f0ae', 'crit');
            soundManager.playChestOpen();
          }
          return { ...q, currentCount: nextCount, completed };
        }
        return q;
      });
    });

    // Standard monsters respawn in 30 seconds; Bosses respawn in 180 seconds (3 minutes)
    enemy.respawnTimer = enemy.data.type === 'boss' ? 180 : 30;
    if (!enemy.spawnPos) {
      enemy.spawnPos = new THREE.Vector3(...enemy.data.position);
    }
  }

  private createLootPickupMesh(item: Item): THREE.Group {
    const group = new THREE.Group();

    const rarityColor =
      item.rarity === 'legendary' ? 0xf59e0b :
      item.rarity === 'epic' ? 0xa855f7 :
      item.rarity === 'rare' ? 0x38bdf8 :
      item.type === 'material' ? 0x10b981 : 0xd97706;

    // Glowing core crystal
    const gemGeo = new THREE.OctahedronGeometry(0.24, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: rarityColor,
      emissive: rarityColor,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.85,
      flatShading: true,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.y = 0.28;
    group.add(gem);

    // Glowing orbit ring
    const ringGeo = new THREE.TorusGeometry(0.36, 0.03, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: rarityColor,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;
    group.add(ring);

    // Ground projection circle
    const glowGeo = new THREE.CircleGeometry(0.42, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: rarityColor,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.04;
    group.add(glow);

    return group;
  }

  private spawnLootPickup(item: Item, pos: THREE.Vector3) {
    const mesh = this.createLootPickupMesh(item);
    const offsetX = (Math.random() - 0.5) * 1.0;
    const offsetZ = (Math.random() - 0.5) * 1.0;
    const px = pos.x + offsetX;
    const pz = pos.z + offsetZ;
    const py = this.world.getTerrainHeight(px, pz);
    mesh.position.set(px, py, pz);
    this.scene.add(mesh);

    this.activeLootPickups.push({
      mesh,
      item,
      pos: new THREE.Vector3(px, py, pz),
      creationTime: performance.now(),
      collected: false,
    });
  }

  private updateLootPickups(delta: number) {
    if (this.activeLootPickups.length === 0) return;

    const now = performance.now();
    for (let i = this.activeLootPickups.length - 1; i >= 0; i--) {
      const pickup = this.activeLootPickups[i];
      if (pickup.collected) {
        this.scene.remove(pickup.mesh);
        this.activeLootPickups.splice(i, 1);
        continue;
      }

      // Floating bobbing & rotation animation
      pickup.mesh.rotation.y += delta * 2.2;
      const bob = Math.sin((now - pickup.creationTime) * 0.004) * 0.08;
      pickup.mesh.position.y = pickup.pos.y + bob;

      // Distance check to player
      const dist = this.playerPos.distanceTo(pickup.mesh.position);
      if (dist < 2.6) {
        pickup.collected = true;
        this.callbacks.onAddItem(pickup.item);
        soundManager.playChestOpen();
        this.spawnSparks(pickup.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 0xfacc15, 8, 3.2);
        this.callbacks.onAddFloatingText(`ðŸ“¦ +1 ${pickup.item.nameId}`, '#facc15', 'info');
        this.scene.remove(pickup.mesh);
        this.activeLootPickups.splice(i, 1);
      } else if (now - pickup.creationTime > 90000) {
        this.scene.remove(pickup.mesh);
        this.activeLootPickups.splice(i, 1);
      }
    }
  }

  private animateEnemyWalk(enemy: (typeof this.enemies)[0], delta: number) {
    if (enemy.data.id === 'boss_jarrus') {
      for (let i = 1; i <= 8; i++) {
        const seg = enemy.parts[`segment_${i}`];
        if (seg) {
          seg.position.x = Math.sin(enemy.walkCycle * 2.5 - i * 0.5) * 0.35;
          seg.position.y = Math.cos(enemy.walkCycle * 2.0 - i * 0.4) * 0.15;
        }
      }
      return;
    }
    if (enemy.data.id === 'boss_dragonfang') {
      if (enemy.parts.leftWing && enemy.parts.rightWing) {
        enemy.parts.leftWing.rotation.z = Math.sin(enemy.walkCycle * 2) * 0.35;
        enemy.parts.rightWing.rotation.z = -Math.sin(enemy.walkCycle * 2) * 0.35;
      }
      if (enemy.parts.tail) {
        enemy.parts.tail.rotation.y = Math.sin(enemy.walkCycle * 0.8) * 0.4;
      }
      if (enemy.parts.frontLeftLeg && enemy.parts.frontRightLeg) {
        enemy.parts.frontLeftLeg.rotation.x = Math.sin(enemy.walkCycle * 0.8) * 0.35;
        enemy.parts.frontRightLeg.rotation.x = -Math.sin(enemy.walkCycle * 0.8) * 0.35;
      }
      if (enemy.parts.leftLeg && enemy.parts.rightLeg) {
        enemy.parts.leftLeg.rotation.x = -Math.sin(enemy.walkCycle * 0.8) * 0.35;
        enemy.parts.rightLeg.rotation.x = Math.sin(enemy.walkCycle * 0.8) * 0.35;
      }
      if (enemy.parts.neck) {
        enemy.parts.neck.rotation.x = Math.sin(enemy.walkCycle * 0.6) * 0.1;
      }
      return;
    }
    if (enemy.data.type === 'slime' || enemy.data.type === 'magma_slime') {
      enemy.mesh.position.y += Math.abs(Math.sin(enemy.walkCycle)) * 0.45;
      const stretch = 1 + Math.sin(enemy.walkCycle * 2) * 0.15;
      enemy.mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    } else if (enemy.data.type === 'spider') {
      for (let legIdx = 1; legIdx <= 8; legIdx++) {
        const leg = enemy.parts[`leg${legIdx}`];
        if (leg) {
          leg.rotation.x = Math.sin(enemy.walkCycle * 2.2 + legIdx * 0.9) * 0.4;
        }
      }
    } else if (enemy.data.type === 'golem' || enemy.data.type === 'boss') {
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

  private resetEnemyPose(enemy: (typeof this.enemies)[0]) {
    const s = enemy.data.id === 'boss_dragonfang' ? 4.2 : (enemy.data.id === 'boss_jarrus' ? 2.8 : (enemy.data.type === 'boss' ? 3.5 : (enemy.data.type === 'golem' ? 1.35 : 1.0)));
    enemy.mesh.scale.set(s, s, s);
    if (enemy.parts) {
      if (enemy.parts.leftLeg) enemy.parts.leftLeg.rotation.set(0, 0, 0);
      if (enemy.parts.rightLeg) enemy.parts.rightLeg.rotation.set(0, 0, 0);
      if (enemy.parts.leftArm) enemy.parts.leftArm.rotation.set(0, 0, 0);
      if (enemy.parts.rightArm) enemy.parts.rightArm.rotation.set(0, 0, 0);
      for (let i = 1; i <= 8; i++) {
        if (enemy.parts[`leg${i}`]) enemy.parts[`leg${i}`].rotation.set(0, 0, 0);
      }
    }
  }

  public respawnEnemy(enemy: (typeof this.enemies)[0], explicitHp?: number) {
    enemy.data.isDead = false;
    enemy.data.hp = explicitHp ?? enemy.data.maxHp;
    enemy.respawnTimer = 0;
    enemy.deathTimer = 0;
    enemy.isReturning = false;
    enemy.attackCooldown = 0;

    const spawn = enemy.spawnPos || new THREE.Vector3(...enemy.data.position);
    const spawnY = this.world.getTerrainHeight(spawn.x, spawn.z);
    enemy.mesh.position.set(spawn.x, spawnY, spawn.z);
    enemy.mesh.rotation.set(0, 0, 0);
    const s = enemy.data.id === 'boss_dragonfang' ? 4.2 : (enemy.data.id === 'boss_jarrus' ? 2.8 : (enemy.data.type === 'boss' ? 3.5 : (enemy.data.type === 'golem' ? 1.35 : 1.0)));
    enemy.mesh.scale.set(s, s, s);
    enemy.mesh.visible = true;
    this.resetEnemyPose(enemy);

    if (!this.scene.children.includes(enemy.mesh)) {
      this.scene.add(enemy.mesh);
    }

    const isBoss = enemy.data.type === 'boss';
    this.spawnShockwaveRing(new THREE.Vector3(spawn.x, spawnY + 0.1, spawn.z), isBoss ? 0xef4444 : 0x22c55e, isBoss ? 6.5 : 3.2, 0.8);
    this.spawnHitStarburst(new THREE.Vector3(spawn.x, spawnY + 1.2, spawn.z), isBoss ? 0xff4500 : 0x4ade80, 2.2);

    if (isBoss) {
      this.callbacks.onAddFloatingText(`ðŸ”¥ [BOSS RESPAWN] ${enemy.data.nameId} telah bangkit kembali!`, '#ef4444', 'crit');
    }
  }

  private checkInteract() {
    // Execute nearby active prompt action (doors, portals, altars, NPCs, chests) immediately upon [F] key press
    if (this.currentPromptAction) {
      this.currentPromptAction();
      return;
    }

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

  /**
   * Calculates movement vector from WASD/Arrow keys or Virtual Joystick relative to Camera angle.
   * If no input is active, defaults to player's facing direction.
   */
  private getPlayerMovementDirection(): THREE.Vector3 {
    const camAngle = this.cameraAngleH;
    const fwdX = -Math.sin(camAngle);
    const fwdZ = -Math.cos(camAngle);
    const rightX = -fwdZ;
    const rightZ = fwdX;

    let inputForward = 0;
    let inputRight = 0;

    if (this.isKeyPressed('w', 'keyw', 'arrowup')) inputForward += 1;
    if (this.isKeyPressed('s', 'keys', 'arrowdown')) inputForward -= 1;
    if (this.isKeyPressed('d', 'keyd', 'arrowright')) inputRight += 1;
    if (this.isKeyPressed('a', 'keya', 'arrowleft')) inputRight -= 1;

    const joyX = this.joystickVector.x || 0;
    const joyY = this.joystickVector.y || 0;
    const joyMag = Math.hypot(joyX, joyY);
    if (joyMag > 0.12) {
      inputRight += joyX;
      inputForward -= joyY;
    }

    const moveDirX = fwdX * inputForward + rightX * inputRight;
    const moveDirZ = fwdZ * inputForward + rightZ * inputRight;
    const mag = Math.hypot(moveDirX, moveDirZ);

    if (mag > 0.08) {
      return new THREE.Vector3(moveDirX / mag, 0, moveDirZ / mag);
    }

    // Default to player mesh facing direction
    return new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
  }

  /**
   * Ray-AABB continuous intersection test in 2D (XZ plane)
   * Used for Blink Raycast obstacle collision (walls, buildings)
   */
  private intersectRayAABB2D(
    px: number, pz: number,
    dx: number, dz: number,
    minX: number, maxX: number,
    minZ: number, maxZ: number
  ): number | null {
    let tmin = -Infinity;
    let tmax = Infinity;

    if (Math.abs(dx) > 1e-6) {
      const tx1 = (minX - px) / dx;
      const tx2 = (maxX - px) / dx;
      tmin = Math.max(tmin, Math.min(tx1, tx2));
      tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else {
      if (px < minX || px > maxX) return null;
    }

    if (Math.abs(dz) > 1e-6) {
      const tz1 = (minZ - pz) / dz;
      const tz2 = (maxZ - pz) / dz;
      tmin = Math.max(tmin, Math.min(tz1, tz2));
      tmax = Math.min(tmax, Math.max(tz1, tz2));
    } else {
      if (pz < minZ || pz > maxZ) return null;
    }

    if (tmax >= tmin && tmax > 0) {
      return tmin > 0 ? tmin : tmax;
    }
    return null;
  }

  /**
   * Ray-Circle intersection test in 2D (XZ plane)
   * Used for Blink Raycast obstacle collision (pillars, fountain, towers)
   */
  private intersectRayCircle2D(
    px: number, pz: number,
    dx: number, dz: number,
    cx: number, cz: number,
    radius: number
  ): number | null {
    const ox = px - cx;
    const oz = pz - cz;
    const a = dx * dx + dz * dz;
    const b = 2 * (ox * dx + oz * dz);
    const c = ox * ox + oz * oz - radius * radius;
    const discr = b * b - 4 * a * c;
    if (discr < 0) return null;
    const sqrtD = Math.sqrt(discr);
    const t1 = (-b - sqrtD) / (2 * a);
    const t2 = (-b + sqrtD) / (2 * a);
    if (t1 > 0) return t1;
    if (t2 > 0) return t2;
    return null;
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
    const inInterior = this.playerPos.y < -10;
    for (let pass = 0; pass < 2; pass++) {
      for (const col of this.world.colliders) {
        const isInteriorCollider = col.maxY !== undefined && col.maxY < 0;
        if (inInterior !== isInteriorCollider) continue;

        // Check vertical height bounds (prevents collider bleed between stacked interior floors)
        if (col.minY !== undefined && (this.playerPos.y + 1.8) < col.minY) continue;
        if (col.maxY !== undefined && this.playerPos.y > col.maxY) continue;

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

    // Penyelarasan Perimeter Dinding Silinder Interior Mage Tower (Menjamin karakter tidak bisa tembus dinding)
    if (isInsideMageTowerInterior(this.playerPos.x, this.playerPos.y, this.playerPos.z)) {
      const constrained = constrainToMageTowerInterior(resX, resZ, playerRadius);
      resX = constrained.x;
      resZ = constrained.z;
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
    if (this.isSpectatorMode) {
      this.updateSpectatorMovement(delta);
      return;
    }

    // Freeze velocity & gravity during teleport transition grace period (prevents falling through void)
    if (this.teleportGraceTimer > 0) {
      this.teleportGraceTimer -= delta;
      this.playerVel.set(0, 0, 0);
      this.isGrounded = true;
      if (isInsideMageTowerInterior(this.playerPos.x, this.playerPos.y, this.playerPos.z)) {
        this.playerPos.y = getMageTowerFloorHeight(this.playerPos.y);
      }
      this.playerMesh.group.position.copy(this.playerPos);
      return;
    }

    // Casting State Handling (Movement Lock & Starfall Channeling - image_68.png)
    if (this.isCasting) {
      this.castingTimer += delta;
      const progress = Math.min(1.0, this.castingTimer / this.castingDuration);
      this.callbacks.onCastingUpdate?.({
        isCasting: true,
        progress,
        text: 'Casting... 1.0s',
      });

      // Strict movement lock: velocity is 0, ignore input keys/joystick
      this.playerVel.x = 0;
      this.playerVel.z = 0;
      this.playerVel.y -= 22 * delta;
      this.playerPos.y += this.playerVel.y * delta;
      let groundY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
      if (this.playerPos.y <= groundY) {
        this.playerPos.y = groundY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
      this.playerMesh.group.position.copy(this.playerPos);

      // Starfall Casting pose: right arm raised high to sky, left arm holds grimoire at hip, head tilted up
      if (this.charClass === 'mage' && this.playerMesh) {
        this.playerMesh.leftLeg.rotation.x = 0;
        this.playerMesh.rightLeg.rotation.x = 0;
        // Lengan Kanan (Tongkat): Angkat tinggi mengacungkan tongkat ke langit
        this.playerMesh.rightArm.rotation.set(-Math.PI * 0.85, -0.15, -0.20);
        // Orientasi Tongkat: Bagian kristal dan cincin emas menunjuk ke langit
        this.playerMesh.weapon.rotation.set(Math.PI, 0, 0);
        // Lengan Kiri (Buku): TETAP DIAM di samping badan / di pinggul mendekap grimoire
        this.playerMesh.leftArm.rotation.set(0.06, 0.10, 0.12);
        this.playerMesh.head.rotation.x = -0.30;
        this.playerMesh.group.position.y += Math.sin(progress * Math.PI) * 0.15;
      }

      if (this.castingTimer >= this.castingDuration) {
        this.completeStarfallCasting();
      }
      return;
    }

    if (this.isControlsLocked) {
      this.playerVel.x = 0;
      this.playerVel.z = 0;
      this.playerVel.y -= 22 * delta;
      this.playerPos.y += this.playerVel.y * delta;
      const inThroneRoomLocked = this.playerPos.y < -10 && this.playerPos.x >= -435 && this.playerPos.x <= -395 && this.playerPos.z >= 335 && this.playerPos.z <= 365;
      const inMageTowerLocked = isInsideMageTowerInterior(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      let groundY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
      if (inThroneRoomLocked) {
        groundY = (this.playerPos.x <= -424 && Math.abs(this.playerPos.z - 350) <= 6) ? -24.4 : -25.0;
      } else if (inMageTowerLocked) {
        groundY = getMageTowerFloorHeight(this.playerPos.y);
      }
      if (this.playerPos.y <= groundY) {
        if (!this.isGrounded && this.playerVel.y < -3.5 && this.charClass === 'warrior') {
          soundManager.playSkillLompatLand();
          this.spawnFootstepVfx('dust');
        }
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
    // Enforce deadzone so micro-drift never causes walking
    const joyX = this.joystickVector.x || 0;
    const joyY = this.joystickVector.y || 0;
    const joyMag = Math.hypot(joyX, joyY);
    if (joyMag > 0.12) {
      inputRight += joyX;
      inputForward -= joyY;
    }

    // 3. Compose world-space movement vector
    let moveDirX = fwdX * inputForward + rightX * inputRight;
    let moveDirZ = fwdZ * inputForward + rightZ * inputRight;
    if (this.bossManager?.playerDebuffs?.isStunned) {
      this.playerVel.x = 0;
      this.playerVel.z = 0;
      return;
    }

    const inputMagnitude = Math.hypot(moveDirX, moveDirZ);
    const isMoving = inputMagnitude > 0.08;

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
      // Rapid stop: clamp velocity to 0 immediately when no movement input is active
      this.playerVel.x *= 0.4;
      this.playerVel.z *= 0.4;
      if (Math.abs(this.playerVel.x) < 0.04) this.playerVel.x = 0;
      if (Math.abs(this.playerVel.z) < 0.04) this.playerVel.z = 0;
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

    // Expanded World boundary constraints (Spans all biomes from X[-580..680] and Z[-460..460])
    if (nextX < -580) nextX = -580;
    if (nextX > 680) nextX = 680;
    if (nextZ < -460) nextZ = -460;
    if (nextZ > 460) nextZ = 460;

    this.playerPos.x = nextX;
    this.playerPos.z = nextZ;

    // Check quest discovery for Fortress Village Val-Kragor
    if (nextX >= 135 && Math.abs(nextZ - -16) <= 22) {
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

    // Automatic Invisible Town Zone Trigger (Sanctuary, Val-Kragor, Astraea auto-respawn and map waypoint unlock)
    this.checkInvisibleTownZones();

    // Check quest discovery for Grand Imperial Kingdom of Astraea (North Frostpeak)
    if (nextX >= 140 && nextX <= 220 && nextZ <= -225 && nextZ >= -295) {
      this.callbacks.onUpdateQuests((quests) => {
        return quests.map((q) => {
          if (q.id === 'quest_discover_astraea' && !q.completed) {
            this.callbacks.onAddFloatingText('ðŸ‘‘ Wilayah Ditemukan: Ibukota Kerajaan Emas Astraea!', '#facc15', 'crit');
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

    // Check if player is inside an Interior Cell (Solaria Throne Room or Mage Tower)
    const inThroneRoom = this.playerPos.y < -10 && this.playerPos.x >= -435 && this.playerPos.x <= -395 && this.playerPos.z >= 335 && this.playerPos.z <= 365;
    const inMageTower = isInsideMageTowerInterior(this.playerPos.x, this.playerPos.y, this.playerPos.z);

    if (inThroneRoom) {
      const throneFloorY = (this.playerPos.x <= -424 && Math.abs(this.playerPos.z - 350) <= 6) ? -24.4 : -25.0;
      if (this.playerPos.y <= throneFloorY) {
        this.playerPos.y = throneFloorY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
    } else if (inMageTower) {
      // 3-Tier Multi-Floor Solid Interior Floors for Mage Tower
      const mageFloorY = getMageTowerFloorHeight(this.playerPos.y);
      if (this.playerPos.y <= mageFloorY + 0.15) {
        this.playerPos.y = mageFloorY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
    } else {
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
    }

    // Update mesh position and rotation
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.rotation.y = this.playerRotationY;

    // Role-specific posture offsets
    if (this.charClass === 'mage') {
      if (this.mageLandingCrouchTimer > 0) {
        this.mageLandingCrouchTimer = Math.max(0, this.mageLandingCrouchTimer - delta);
        const crouchRatio = this.mageLandingCrouchTimer / 0.15;
        this.playerMesh.group.position.y -= 0.10 * crouchRatio;
      }
      this.playerMesh.group.rotation.x = 0;
    } else if (this.charClass === 'rogue') {
      // Forward ninja prowl crouch
      this.playerMesh.group.rotation.x = isMoving ? 0.16 : 0.08;
    } else if (this.charClass === 'warrior' && this.isAttacking) {
      // Forward lean during combat attacks handled dynamically below
    } else {
      this.playerMesh.group.rotation.x = 0;
    }

    // Limb animations
    if (isMoving) {
      const walkFreq = this.charClass === 'rogue' ? 15 : this.charClass === 'mage' ? 8 : 10;
      this.walkTime += delta * walkFreq;

      if (this.charClass === 'warrior') {
        // Penghalusan Animasi Berjalan Ksatria (Smooth Knight Walk):
        // Frekuensi stabil walkTime = clock.getElapsedTime() * 6
        const walkTime = this.clock.getElapsedTime() * 6;
        animateKnightWalk(this.playerMesh, walkTime, this.playerPos.y, this.isAttacking);
        this.playerMesh.body.position.y = 1.48;
        this.playerMesh.body.rotation.z = 0;
        this.playerMesh.body.rotation.y = 0;
        this.playerMesh.cape.rotation.x = 0.30 + Math.sin(walkTime * 0.5) * 0.15;
      } else if (this.charClass === 'mage') {
        // Heroic Blocky Low-Poly Mage Walk Cycle
        const walkTime = this.clock.getElapsedTime();
        animateMageWalk(this.playerMesh, walkTime, this.playerPos.y, true, this.isAttacking);
      } else {
        const legSwing = Math.sin(this.walkTime) * 0.62;
        this.playerMesh.leftLeg.rotation.x = legSwing;
        this.playerMesh.rightLeg.rotation.x = -legSwing;

        if (!this.isAttacking) {
          this.playerMesh.leftArm.rotation.x = -0.5 - legSwing * 0.4;
          this.playerMesh.rightArm.rotation.x = -0.5 + legSwing * 0.4;
          this.playerMesh.leftArm.rotation.z = 0.25;
          this.playerMesh.rightArm.rotation.z = -0.25;
        }
        this.playerMesh.cape.rotation.x = 0.35 + Math.sin(this.walkTime * 1.5) * 0.20;
      }
    } else {
      if (this.charClass === 'warrior') {
        this.playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftLeg.rotation.x, 0, 0.2);
        this.playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightLeg.rotation.x, 0, 0.2);
        this.playerMesh.group.rotation.z = THREE.MathUtils.lerp(this.playerMesh.group.rotation.z, 0, 0.2);

        // Breathing cycle halus saat diam
        const breathe = Math.sin(this.clock.getElapsedTime() * 2.0) * 0.015;
        this.playerMesh.body.position.y = THREE.MathUtils.lerp(this.playerMesh.body.position.y, 1.48 + breathe, 0.15);
        this.playerMesh.body.rotation.z = THREE.MathUtils.lerp(this.playerMesh.body.rotation.z, 0, 0.15);
        this.playerMesh.body.rotation.y = THREE.MathUtils.lerp(this.playerMesh.body.rotation.y, 0, 0.15);

        if (!this.isAttacking) {
          // Shield raised defensively across left chest, broadsword ready in right hand
          this.playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.x, -0.32 + breathe * 0.4, 0.15);
          this.playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.y, 0.20, 0.15);
          this.playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.z, 0.16, 0.15);

          this.playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.x, 0.22 - breathe * 0.4, 0.15);
          this.playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.z, -0.20, 0.15);
        }
      } else if (this.charClass === 'mage') {
        // Heroic Blocky Low-Poly Mage Idle State (Subtle Breathing & Relaxed Staff/Grimoire Pose)
        const walkTime = this.clock.getElapsedTime();
        animateMageWalk(this.playerMesh, walkTime, this.playerPos.y, false, this.isAttacking);
      } else {
        this.playerMesh.leftLeg.rotation.x *= 0.8;
        this.playerMesh.rightLeg.rotation.x *= 0.8;
        if (!this.isAttacking) {
          this.playerMesh.leftArm.rotation.set(0.2, 0, 0.2);
          this.playerMesh.rightArm.rotation.set(0.2, 0, -0.2);
        }
        this.playerMesh.cape.rotation.x = 0.1 + Math.sin(this.clock.getElapsedTime() * 2) * 0.05;
      }
    }

    // Role-specific attack animation
    if (this.isAttacking) {
      this.attackTimer -= delta;
      const progress = Math.max(0, this.attackTimer / (this.attackDuration || 0.35));

      if (this.attackType === 'basic_spin_360') {
        // Full 360 degree whirlwind cleave spin
        this.playerMesh.group.rotation.y = this.playerRotationY + (1 - progress) * Math.PI * 2;
        this.playerMesh.rightArm.rotation.set(-0.25, 0, -1.45);
        this.playerMesh.leftArm.rotation.set(-0.25, 0, 1.35);
        this.playerMesh.body.rotation.y = 0;
      } else if (this.attackType === 'bow_shot' || this.attackType === 'bow_barrage') {
        // Hunter Bow draw and release
        this.playerMesh.leftArm.rotation.set(-1.35, 0.3, -0.15);
        const draw = Math.sin((1 - progress) * Math.PI);
        this.playerMesh.rightArm.rotation.set(-1.3, -0.4, 0.4 + draw * 0.35);
      } else if (this.charClass === 'warrior') {
        if (this.attackType === 'whirlwind') {
          // Rapid 360 degree spin
          this.playerMesh.group.rotation.y += delta * 24;
          this.playerMesh.leftArm.rotation.set(-0.25, 0, 1.35);
          this.playerMesh.rightArm.rotation.set(-0.25, 0, -1.45);
          this.playerMesh.body.rotation.y = 0;
        } else if (this.attackType === 'shield_charge') {
          // Terjang (Guard forward charge with shield thrust)
          const chargeFactor = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.group.rotation.x = 0.32 * chargeFactor;
          this.playerMesh.leftArm.rotation.set(-1.45, 0.35, 0.12);
          this.playerMesh.rightArm.rotation.set(0.65, -0.2, -0.55);
        } else if (this.attackType === 'iron_fortress') {
          // Benteng (Shield planted down, heavy defensive brace)
          this.playerMesh.group.position.y -= 0.10 * Math.sin((1 - progress) * Math.PI);
          this.playerMesh.leftArm.rotation.set(-1.10, 0.30, 0.0);
          this.playerMesh.rightArm.rotation.set(-0.85, 0, -0.25);
        } else if (this.attackType === 'basic_slash_1' || this.attackType === 'basic_slash_2') {
          // Rapid horizontal sword slash arc (0.35s) with smooth lerp recovery
          const swing = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.group.rotation.x = swing * 0.18;
          this.playerMesh.body.rotation.y = swing * 0.45;
          this.playerMesh.rightArm.rotation.set(-0.2 - swing * 1.85, swing * 0.95, -0.35 + swing * 0.7);
          this.playerMesh.leftArm.rotation.set(-0.35, -swing * 0.3, 0.2);
        } else {
          // Powerful downward cleave swing
          const swing = Math.sin((1 - progress) * Math.PI);
          this.playerMesh.group.rotation.x = swing * 0.22;
          this.playerMesh.body.rotation.y = swing * 0.2;
          this.playerMesh.rightArm.rotation.set(1.1 - swing * 2.9, 0, -0.2);
          this.playerMesh.leftArm.rotation.set(swing * 0.6, 0, 0.15);
        }
      } else if (this.charClass === 'mage') {
        animateMageSkillPose(this.playerMesh, {
          attackType: this.attackType,
          progress,
          isCasting: this.isCasting,
          castingProgress: Math.min(1.0, this.castingTimer / this.castingDuration),
          isBlinking: this.isDashing && this.attackType === 'blink',
          blinkProgress: Math.min(1.0, Math.max(0, 1.0 - (this.dashTimer / 0.2))),
          isCastingLight: this.attackType === 'celestial_heal',
        });
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
        if (this.charClass === 'mage' && this.playerMesh?.body) {
          this.playerMesh.body.rotation.set(0, 0, 0);
          this.playerMesh.body.position.y = 1.35;
          this.playerMesh.weapon.rotation.set(0.32, 0.10, 0.05);
          if (this.playerMesh.grimoire) {
            this.playerMesh.grimoire.position.set(-0.08, 0.08, 0.02);
            this.playerMesh.grimoire.rotation.set(0.20, 0, 0);
          }
        }
        this.playerMesh.leftArm.rotation.set(0, 0, 0);
        this.playerMesh.rightArm.rotation.set(0, 0, 0);
      }
    }

    // Dash timer
    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        if (this.charClass === 'mage' && this.playerMesh?.body) {
          this.playerMesh.body.rotation.x = 0;
          this.playerMesh.body.position.y = 1.35;
        }
      }
    }

    // Invulnerability (iFrame) timer
    if (this.isInvulnerable) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
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
    // 0a. Check Taj Mahal Palace Entrance (Overworld -> Throne Room)
    const distToPalaceGate = Math.hypot(this.playerPos.x - -396, this.playerPos.z - 350);
    if (distToPalaceGate < 4.5 && this.playerPos.y > -10) {
      this.setNearbyPrompt('Tekan [F] / Sentuh untuk Masuk Istana Sultan Solaria ðŸ•Œ', () => {
        this.playerPos.set(-400, -25, 350);
        this.playerVel.set(0, 0, 0);
        this.isGrounded = true;
        this.playerMesh.group.position.copy(this.playerPos);
        this.camera.position.set(-395, -25 + 3.0, 350);
        this.camera.lookAt(-415, -25 + 1.8, 350);
        soundManager.playCheckpointUnlock();
        this.callbacks.onAddFloatingText('Memasuki Ruang Takhta Sultan Solaria', '#fbbf24', 'info');
      });
      return;
    }

    // 0b. Check Throne Room Exit Door (Throne Room -> Overworld)
    const distToThroneExit = Math.hypot(this.playerPos.x - -400, this.playerPos.z - 350);
    if (distToThroneExit < 4.0 && this.playerPos.y < -15) {
      this.setNearbyPrompt('Tekan [F] / Sentuh untuk Keluar ke Pelataran Istana ðŸšª', () => {
        const outY = Math.max(0.5, this.world.getTerrainHeight(-395, 350) + 0.5);
        this.playerPos.set(-395, outY, 350);
        this.playerVel.set(0, 0, 0);
        this.isGrounded = true;
        this.playerMesh.group.position.copy(this.playerPos);
        this.camera.position.set(-390, outY + 3.5, 350);
        this.camera.lookAt(-375, outY + 1.4, 350);
        soundManager.playCheckpointUnlock();
        this.callbacks.onAddFloatingText('Kembali ke Pelataran Istana Solaria', '#fbbf24', 'info');
      });
      return;
    }

    // 0c. Check Mage Tower Entrance (Overworld -> Level 1 Library: [160, -150])
    const distToMageTowerDoor = Math.hypot(this.playerPos.x - 160, this.playerPos.z - -142);
    if (distToMageTowerDoor < 4.5 && this.playerPos.y > -10) {
      this.setNearbyPrompt('Tekan [F] / Sentuh untuk Masuk Mage Tower Puncak Halilintar ⚡', () => {
        this.enterMageTower();
      });
      return;
    }

    // 0d. Check Mage Tower Exit Door (Level 1 Library -> Overworld)
    const distToMageTowerExit = Math.hypot(this.playerPos.x - 160, this.playerPos.z - -143.5);
    if (distToMageTowerExit < 4.0 && this.playerPos.y <= -42 && this.playerPos.y >= -48) {
      this.setNearbyPrompt('Tekan [F] / Sentuh untuk Keluar ke Puncak Halilintar 🚪', () => {
        this.exitMageTower();
      });
      return;
    }

    // 0e. Check Mage Tower Multi-Floor Altar Transits (Lantai 1 <-> Lantai 2 <-> Lantai 3)
    const distToTowerCenter = Math.hypot(this.playerPos.x - 160, this.playerPos.z - -150);
    if (distToTowerCenter < 4.5 && this.playerPos.y < -15) {
      if (this.playerPos.y <= -42) {
        // Lantai 1 -> Naik ke Lantai 2 (Laboratorium)
        this.setNearbyPrompt('Tekan [F] / Sentuh: Naik ke Lantai 2 (Laboratorium Alkimia) 🧪', () => {
          this.teleportMageTowerFloor(2);
        });
        return;
      } else if (this.playerPos.y > -42 && this.playerPos.y <= -34) {
        // Lantai 2: Pilihan naik ke Lantai 3 atau turun ke Lantai 1
        if (this.playerPos.z < -149) {
          this.setNearbyPrompt('Tekan [F] / Sentuh: Naik ke Lantai 3 (Anjungan Observatorium) 🌌', () => {
            this.teleportMageTowerFloor(3);
          });
          return;
        } else {
          this.setNearbyPrompt('Tekan [F] / Sentuh: Turun ke Lantai 1 (Perpustakaan & Altar) 📚', () => {
            this.teleportMageTowerFloor(1);
          });
          return;
        }
      } else if (this.playerPos.y > -34) {
        // Lantai 3 -> Turun ke Lantai 2 (Laboratorium)
        this.setNearbyPrompt('Tekan [F] / Sentuh: Turun ke Lantai 2 (Laboratorium Alkimia) 🧪', () => {
          this.teleportMageTowerFloor(2);
        });
        return;
      }
    }
    // Check all village NPCs
    if (this.world.npcs && this.world.npcs.length > 0) {
      for (const npc of this.world.npcs) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...npc.position));
        if (dist < 3.8) {
          let prompt = `Tekan [F] / Sentuh untuk Bicara dengan ${npc.nameId} (${npc.role})`;
          if (npc.id === 'blacksmith_torvald') {
            prompt = `Tekan [F] / Sentuh: Toko Senjata & Tempa Master Torvald ðŸ”¨`;
          } else if (npc.id === 'alchemist_anya') {
            prompt = `Tekan [F] / Sentuh: Toko Ramuan Alkimia Anya ðŸ§ª`;
          } else if (npc.id === 'villager_maya') {
            prompt = `Tekan [F] / Sentuh: Toko Zirah & Perlengkapan Maya ðŸ›¡ï¸`;
          } else if (npc.id === 'fisherman_joko') {
            prompt = `Tekan [F] / Sentuh: Kios Hasil Laut & Bekal Pak Joko ðŸŸ`;
          } else if (npc.id === 'villager_kael') {
            prompt = `Tekan [F] / Sentuh: Pasar Gelap Artefak Kael ðŸ—ï¸`;
          } else if (npc.id === 'commander_brann') {
            prompt = `Tekan [F] / Sentuh: Komandan Brann (Panglima Benteng Val-Kragor) ðŸº`;
          } else if (npc.id === 'seer_elora') {
            prompt = `Tekan [F] / Sentuh: Peramal Elora (Pemulihan & Berkat Bintang) ðŸ”®`;
          } else if (npc.id === 'frostsmith_goran') {
            prompt = `Tekan [F] / Sentuh: Bengkel Senjata Dataran Tinggi Goran ðŸ”¨`;
          } else if (npc.id === 'guard_valkragor') {
            prompt = `Tekan [F] / Sentuh: Prajurit Penjaga Gerbang Val-Kragor ðŸ›¡ï¸`;
          } else if (npc.id === 'emperor_aurelius') {
            prompt = `Tekan [F] / Sentuh: Paduka Kaisar Aurelius Astraea ðŸ‘‘`;
          } else if (npc.id === 'marshal_vane') {
            prompt = `Tekan [F] / Sentuh: Panglima Perang Vane (Legiun Kekaisaran) âš”ï¸`;
          } else if (npc.id === 'merchant_lyra') {
            prompt = `Tekan [F] / Sentuh: Saudagar Lyra (Toko Pusaka & Elixir Astraea) ðŸ’Ž`;
          } else if (npc.id === 'guard_astraea') {
            prompt = `Tekan [F] / Sentuh: Penjaga Gerbang Emas Astraea ðŸ›¡ï¸`;
          } else if (npc.id === 'sultan_malik') {
            prompt = `Tekan [F] / Sentuh: Paduka Sultan Malik al-Solaria (Istana Kubah Emas) ðŸ‘‘`;
          } else if (npc.id === 'merchant_tariq') {
            prompt = `Tekan [F] / Sentuh: Toko Rempah & Sutra Saudagar Tariq ðŸ‘³â€â™‚ï¸`;
          } else if (npc.id === 'oasis_amina') {
            prompt = `Tekan [F] / Sentuh: Amina Gadis Pembawa Air Oase ðŸ§•`;
          } else if (npc.id === 'weaver_zahra') {
            prompt = `Tekan [F] / Sentuh: Kios Karpet & Sutra Pengrajin Zahra ðŸ§•`;
          } else if (npc.id === 'guard_solaria' || npc.id === 'guard_throne_1' || npc.id === 'guard_throne_2') {
            prompt = `Tekan [F] / Sentuh: Prajurit Pengawal Gurun Solaria ðŸ›¡ï¸`;
          } else if (npc.id === 'grand_mage_eldrin') {
            prompt = `Tekan [F] / Sentuh: Grand Mage Eldrin (Penjaga Kitab Halilintar) ðŸ§™â€â™‚ï¸`;
          } else if (npc.id === 'archmage_pyro') {
            prompt = `Tekan [F] / Sentuh: Archmage Pyro (Ahli Alkimia Api) ðŸ”¥`;
          } else if (npc.id === 'sorceress_maya') {
            prompt = `Tekan [F] / Sentuh: Sorceress Maya (Pengkaji Kitab Kuno) âœ¨`;
          }

          this.setNearbyPrompt(prompt, () => {
            this.callbacks.onInteractNPC(npc.dialogueId || npc.id);
          });
          return;
        }
      }
    } else if (this.world.npc) {
      const distToNpc = this.playerPos.distanceTo(new THREE.Vector3(...this.world.npc.position));
      if (distToNpc < 3.8) {
        this.setNearbyPrompt('Tekan [F] / Sentuh untuk Bicara dengan Tetua Vaelen', () => {
          this.callbacks.onInteractNPC(this.world.npc.id);
        });
        return;
      }
    }

    for (const chest of this.world.chests) {
      if (!chest.opened) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...chest.position));
        if (dist < 3.0) {
          this.setNearbyPrompt('Tekan [F] / Sentuh untuk Buka Peti Harta Karun', () => {
            this.openChest(chest);
          });
          return;
        }
      }
    }

    this.setNearbyPrompt(null);
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
    this.bossManager.update(delta, this.playerPos, this.playerVel, this.isDashing || this.isInvulnerable);

    this.enemies.forEach((enemy) => {
      // 1. Mayat Monster & Hitung Mundur Hilangnya Mayat (Corpse Decay)
      if (enemy.data.isDead) {
        if (enemy.deathTimer !== undefined && enemy.deathTimer > 0) {
          enemy.deathTimer -= delta;
          // Pada 1.2 detik terakhir, mayat perlahan tenggelam ke dalam tanah dan menyusut
          if (enemy.deathTimer <= 1.2) {
            const scale = Math.max(0.001, enemy.deathTimer / 1.2);
            enemy.mesh.scale.set(scale, scale, scale);
            enemy.mesh.position.y -= delta * 0.35;
          }
          if (enemy.deathTimer <= 0) {
            enemy.mesh.visible = false;
          }
        } else {
          enemy.mesh.visible = false;
        }

        // Hitung mundur waktu bangkit kembali (Respawn)
        if (enemy.respawnTimer !== undefined && enemy.respawnTimer > 0) {
          enemy.respawnTimer -= delta;
          if (enemy.respawnTimer <= 0) {
            this.respawnEnemy(enemy);
          }
        }
        return;
      }

      // Boss Titan & Dragon permanent scale lock on update loop
      if (enemy.data.id === 'boss_dragonfang') {
        enemy.mesh.scale.set(4.2, 4.2, 4.2);
      } else if (enemy.data.id === 'boss_jarrus') {
        enemy.mesh.scale.set(2.8, 2.8, 2.8);
      } else if (enemy.data.type === 'boss') {
        enemy.mesh.scale.set(3.5, 3.5, 3.5);
      } else if (enemy.data.type === 'golem') {
        enemy.mesh.scale.set(1.35, 1.35, 1.35);
      }

      const ePos = enemy.mesh.position;
      const spawnPos = enemy.spawnPos || new THREE.Vector3(...enemy.data.position);
      const distFromSpawn = Math.hypot(ePos.x - spawnPos.x, ePos.z - spawnPos.z);
      const distToPlayer = this.playerPos.distanceTo(ePos);
      const territoryRadius =
        enemy.leashRadius ||
        (enemy.data.id === 'boss_dragonfang'
          ? 22
          : enemy.data.id === 'boss_titan'
          ? 18
          : enemy.data.type === 'boss'
          ? 38
          : 22);

      // Distance culling berdasarkan pengaturan grafis untuk performa
      const cullDist = Math.min(85, this.graphicsSettings.renderDistance * 0.9);
      if (distToPlayer > cullDist && distFromSpawn > territoryRadius) {
        enemy.mesh.visible = false;
        return;
      }
      enemy.mesh.visible = true;

      if (enemy.data.type === 'boss' && distToPlayer < 32) {
        bossInView = true;
        activeBoss = enemy.data;
      }

      // STATE 1: Monster sedang berjalan kembali ke tempat asalnya (Leash Return & Slow Regen)
      if (enemy.isReturning) {
        const toSpawnX = spawnPos.x - ePos.x;
        const toSpawnZ = spawnPos.z - ePos.z;
        const distToSpawn = Math.hypot(toSpawnX, toSpawnZ);

        if (distToSpawn > 0.8) {
          // Hadap ke arah sarang/tempat asal
          enemy.mesh.rotation.y = Math.atan2(toSpawnX, toSpawnZ);

          // Berjalan kembali ke tempat asalnya dengan langkah santai
          const returnSpeed = enemy.data.speed * delta;
          ePos.x += (toSpawnX / distToSpawn) * returnSpeed;
          ePos.z += (toSpawnZ / distToSpawn) * returnSpeed;
          ePos.y = this.world.getTerrainHeight(ePos.x, ePos.z);

          // Mainkan animasi berjalan
          enemy.walkCycle += delta * 5.5;
          this.animateEnemyWalk(enemy, delta);

          // Beregenerasi perlahan saat berjalan pulang (12% max HP per detik)
          if (enemy.data.hp < enemy.data.maxHp) {
            enemy.data.hp = Math.min(enemy.data.maxHp, enemy.data.hp + enemy.data.maxHp * 0.12 * delta);
          }
          return;
        } else {
          // Telah tiba kembali di sarang/wilayahnya dengan sempurna
          enemy.isReturning = false;
          enemy.data.hp = enemy.data.maxHp;
          ePos.x = spawnPos.x;
          ePos.z = spawnPos.z;
          ePos.y = this.world.getTerrainHeight(spawnPos.x, spawnPos.z);
          this.resetEnemyPose(enemy);
          return;
        }
      }

      // SAFE ZONE CHECK: Desa Utama, Benteng Val-Kragor & Astraea adalah Zona Aman 100% bebas monster!
      const playerInSafeZone = isInsideSafeZone(this.playerPos.x, this.playerPos.z);
      const enemyInSafeZone = isInsideSafeZone(ePos.x, ePos.z);

      if (playerInSafeZone || enemyInSafeZone) {
        if (distFromSpawn > 1.2) {
          enemy.isReturning = true;
          return;
        }
      }

      // STATE 2: Deteksi batas wilayah (Jika player membawa monster terlalu jauh dari sarangnya)
      if (distFromSpawn > territoryRadius || distToPlayer > enemy.data.detectRange * 1.5) {
        if (distFromSpawn > 1.2) {
          enemy.isReturning = true;
          return;
        }
      }

      // STATE 2.5: Boss Specialized Attack Skills & Ground Telegraph Danger Zones
      if (enemy.data.type === 'boss') {
        const isCasting = this.bossManager.updateBossBehavior(enemy, this.playerPos, delta);
        if (isCasting) {
          return;
        }
      }

      // STATE 3: Jika player dalam jarak deteksi dan monster masih di dalam wilayahnya -> kejar & serang
      if (distToPlayer <= enemy.data.detectRange && distFromSpawn <= territoryRadius) {
        const toPlayer = new THREE.Vector3().subVectors(this.playerPos, ePos).normalize();
        const targetRotY = Math.atan2(toPlayer.x, toPlayer.z);
        enemy.mesh.rotation.y = targetRotY;

        if (distToPlayer > enemy.data.attackRange) {
          const moveSpeed = enemy.data.speed * delta;
          ePos.x += toPlayer.x * moveSpeed;
          ePos.z += toPlayer.z * moveSpeed;
          ePos.y = this.world.getTerrainHeight(ePos.x, ePos.z);

          enemy.walkCycle += delta * 6;
          this.animateEnemyWalk(enemy, delta);

        // Monster attack lunge / arm swing animation
        if (enemy.attackAnimTimer && enemy.attackAnimTimer > 0) {
          enemy.attackAnimTimer -= delta;
          const animProgress = Math.sin((1 - Math.max(0, enemy.attackAnimTimer / 0.35)) * Math.PI);
          if (enemy.parts?.rightArm) {
            enemy.parts.rightArm.rotation.x = -Math.PI * 0.75 * animProgress;
          }
          if (enemy.parts?.leftArm) {
            enemy.parts.leftArm.rotation.x = 0.25 * animProgress;
          }
          if (enemy.data.type === 'slime' || enemy.data.type === 'magma_slime') {
            enemy.mesh.scale.set(1 + animProgress * 0.35, 1 - animProgress * 0.3, 1 + animProgress * 0.35);
          }
        }
        } else {
          // Serang player sesuai cooldown (1.5 detik untuk monster biasa)
          enemy.attackCooldown -= delta;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1.5;
            enemy.attackAnimTimer = 0.35; // Trigger monster attack swing / lunge
            this.enemyAttackPlayer(enemy);
          }
        }
      } else if (distFromSpawn > 1.2) {
        // Player tidak di sekitar dan monster tidak di titik asal -> kembali pulang
        enemy.isReturning = true;
      }
    });

    const isBossActive = bossInView && activeBoss !== null && (activeBoss.hp ?? 1) > 0;
    this.callbacks.onBossEncounter(
      isBossActive,
      activeBoss ? activeBoss.nameId : undefined,
      activeBoss ? activeBoss.hp : undefined,
      activeBoss ? activeBoss.maxHp : undefined
    );

    // Dynamic Boss BGM System: Automatically play Heavy Orchestral BGM for Titan, Worm, or Dragon
    if (isBossActive && activeBoss) {
      const bossType = activeBoss.id === 'boss_dragonfang' ? 'dragon' : (activeBoss.id === 'boss_jarrus' ? 'worm' : 'titan');
      soundManager.playBossMusic(bossType);
    } else if (soundManager.getCurrentBossMusic()) {
      soundManager.evadeBossMusic(2.5);
    }
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
        const target = this.remoteMonsterTargets.get(enemy.data.id);
        if (target && !target.isDead && (target.hp ?? 0) > 0) {
          this.respawnEnemy(enemy, target.hp);
        } else {
          enemy.mesh.visible = false;
          return;
        }
      }

      // Boss Titan & Dragon permanent scale lock in multiplayer loop
      if (enemy.data.id === 'boss_dragonfang') {
        enemy.mesh.scale.set(4.2, 4.2, 4.2);
      } else if (enemy.data.id === 'boss_jarrus') {
        enemy.mesh.scale.set(2.8, 2.8, 2.8);
      } else if (enemy.data.type === 'boss') {
        enemy.mesh.scale.set(3.5, 3.5, 3.5);
      } else if (enemy.data.type === 'golem') {
        enemy.mesh.scale.set(1.35, 1.35, 1.35);
      }

      const ePos = enemy.mesh.position;
      const dist = this.playerPos.distanceTo(ePos);

      // Distance culling visual berdasarkan pengaturan grafis
      const cullDist = Math.min(75, this.graphicsSettings.renderDistance * 0.9);
      if (dist > cullDist) {
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

    const isBossActive = bossInView && activeBoss !== null && (activeBoss.hp ?? 1) > 0;
    this.callbacks.onBossEncounter(
      isBossActive,
      activeBoss ? activeBoss.nameId : undefined,
      activeBoss ? activeBoss.hp : undefined,
      activeBoss ? activeBoss.maxHp : undefined
    );

    if (isBossActive && activeBoss) {
      const bossType = activeBoss.id === 'boss_dragonfang' ? 'dragon' : (activeBoss.id === 'boss_jarrus' ? 'worm' : 'titan');
      soundManager.playBossMusic(bossType);
    } else if (soundManager.getCurrentBossMusic()) {
      soundManager.evadeBossMusic(2.5);
    }
  }

  /**
   * Automatic Invisible Town Zone Trigger
   * When player enters Sanctuary (0,0), Val-Kragor (158,-16), or Astraea (180,-260) radius <= 40-45 units,
   * automatically sets and saves lastVisitedTownPos without requiring physical 3D monuments or interactions.
   * Also unlocks regional fast-travel waypoints on the World Map.
   */
  private checkInvisibleTownZones() {
    const pX = this.playerPos.x;
    const pZ = this.playerPos.z;

    for (const town of TOWN_ZONES) {
      const dist = Math.hypot(pX - town.x, pZ - town.z);
      if (dist <= town.radius) {
        if (this.lastVisitedTownPos.id !== town.id) {
          this.lastVisitedTownPos = {
            id: town.id,
            x: town.respawnX,
            y: Math.max(0.5, this.world.getTerrainHeight(town.respawnX, town.respawnZ) + 0.5),
            z: town.respawnZ,
            name: town.name,
          };
          try {
            localStorage.setItem('eldoria_last_visited_town', JSON.stringify(this.lastVisitedTownPos));
          } catch {}
          this.callbacks.onAddFloatingText(`ðŸ“ Titik Respawn Disimpan: ${town.name}`, '#38bdf8', 'info');
        }

        // Auto-unlock waypoint for fast travel on map
        if (!this.unlockedCheckpoints.has(town.waypointId)) {
          this.unlockedCheckpoints.add(town.waypointId);
          try {
            localStorage.setItem(
              'eldoria_unlocked_checkpoints',
              JSON.stringify(Array.from(this.unlockedCheckpoints))
            );
          } catch {}
          soundManager.playCheckpointUnlock();
          this.callbacks.onAddFloatingText(`ðŸŒŸ Wilayah Terbuka: ${town.name}!`, '#00e5ff', 'crit');
          if (this.callbacks.onCheckpointUnlocked) {
            this.callbacks.onCheckpointUnlocked(town.waypointId, town.name, [town.respawnX, town.respawnZ]);
          }
        }
        break;
      }
    }

    // Also auto-unlock exploration regional waypoints on map when player visits them (dist <= 22)
    if (this.world.checkpoints) {
      for (const cp of this.world.checkpoints) {
        const dist = Math.hypot(pX - cp.position[0], pZ - cp.position[2]);
        if (dist <= 22.0 && !this.unlockedCheckpoints.has(cp.id)) {
          this.unlockCheckpoint(cp);
        }
      }
    }
  }

  // 3D Red and Yellow Arc Line slash visual effect hitting player position
  private spawnEnemySlashVfx(enemyPos: THREE.Vector3, targetPos: THREE.Vector3) {
    const dir = new THREE.Vector3(targetPos.x - enemyPos.x, 0, targetPos.z - enemyPos.z).normalize();
    if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
    const slashPos = new THREE.Vector3(
      targetPos.x - dir.x * 0.35,
      targetPos.y + 0.85,
      targetPos.z - dir.z * 0.35
    );
    // Red razor arc tilted -0.42 rad
    this.spawnCrescentSlash(slashPos, dir, -0.42, 0xff1744, 1.45, Math.PI * 0.85);
    // Yellow secondary incandescent arc tilted +0.38 rad
    this.spawnCrescentSlash(slashPos, dir, 0.38, 0xffd600, 1.25, Math.PI * 0.75);
    // Impact cutting sparks
    this.spawnSparks(slashPos, 0xff1744, 10, 4.2);
    this.spawnSparks(slashPos, 0xffd600, 6, 3.5);
  }

  // Spawn flying 3D stone boulder projectile for Titan's Rock Boulder Throw skill
  private spawnTitanBoulderProjectile(origin: THREE.Vector3, target: THREE.Vector3, damage = 32) {
    const group = new THREE.Group();
    group.position.copy(origin);

    // Irregular rocky boulder mesh
    const rockGeo = new THREE.DodecahedronGeometry(0.9, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.9,
      metalness: 0.1,
    });
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    group.add(rockMesh);

    // Glowing magma core / embers inside the boulder
    const coreGeo = new THREE.IcosahedronGeometry(0.65, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Magma light
    const light = new THREE.PointLight(0xff5722, 1.8, 6.0);
    group.add(light);

    this.scene.add(group);

    // Aim towards target
    const dir = new THREE.Vector3().subVectors(target, origin).normalize();
    const rotAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    this.activeProjectiles.push({
      object: group,
      direction: dir,
      speed: 22.0,
      lifetime: 2.5,
      damage,
      isCrit: false,
      vfxType: 'titan_boulder',
      isHostile: true,
      blastRadius: 3.2,
      rotationAxis: rotAxis,
    });
  }

  private enemyAttackPlayer(enemy: (typeof this.enemies)[0]) {
    if (this.isInvulnerable) {
      this.callbacks.onAddFloatingText('KEBAL / iFrame!', '#38bdf8', 'info');
      return;
    }
    soundManager.playHit();

    this.callbacks.onUpdateStats((stats) => {
      const enemyDmg = enemy.data.attack;
      let finalDmg = Math.max(2, enemyDmg - Math.round(stats.baseDefense * 0.6));
      const { remainingDamage } = this.absorbDamageWithShield(finalDmg);
      finalDmg = remainingDamage;
      const nextHp = Math.max(0, stats.hp - finalDmg);

      if (finalDmg > 0) {
        this.callbacks.onAddFloatingText(`-${finalDmg} HP`, '#ff1744', 'damage');
      }

      if (nextHp <= 0) {
        this.respawnPlayerAtLastVisitedTown();
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
    if (this.isSpectatorMode) return;
    // Orbit camera calculation
    const offsetX = Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
    const offsetZ = Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
    const offsetY = Math.sin(this.cameraAngleV) * this.cameraDistance + 1.2;

    const targetPos = new THREE.Vector3(
      this.playerPos.x + offsetX,
      this.playerPos.y + offsetY,
      this.playerPos.z + offsetZ
    );

    // Instant snap without lerp during interior teleport grace period (eliminates black screen / void clipping)
    if (this.teleportGraceTimer > 0) {
      this.camera.position.copy(targetPos);
      this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.4, this.playerPos.z);
      return;
    }

    // Apply procedural camera screen shake for visceral combat feel
    if (this.cameraShake > 0.001) {
      const shakeAmt = this.cameraShake * 0.45;
      targetPos.x += (Math.random() - 0.5) * shakeAmt;
      targetPos.y += (Math.random() - 0.5) * shakeAmt;
      targetPos.z += (Math.random() - 0.5) * shakeAmt;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.8);
    }

    // Camera FOV Punch (e.g. +4 FOV punch during Blink landing)
    if (this.cameraFovPunch > 0.01) {
      this.camera.fov = 60 + this.cameraFovPunch;
      this.camera.updateProjectionMatrix();
      this.cameraFovPunch = Math.max(0, this.cameraFovPunch - (4.0 / 0.18) * delta);
      if (this.cameraFovPunch <= 0.01) {
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();
      }
    }

    this.camera.position.lerp(targetPos, 0.15);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.4, this.playerPos.z);
  }

  private updateRemotePlayers(delta: number) {
    if (this.gameMode !== 'multiplayer' || this.remotePlayers.size === 0) return;

    this.remotePlayers.forEach((rp) => {
      // Lerp position smoothly
      rp.currentPos.lerp(rp.targetPos, Math.min(1, delta * 14));
      // Ensure remote player feet do not sink below terrain surface
      const groundY = this.world.getTerrainHeight(rp.currentPos.x, rp.currentPos.z);
      if (rp.currentPos.y < groundY) {
        rp.currentPos.y = groundY;
      }
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

    // FPS Cap throttle for low-end PCs / battery saving
    const now = performance.now();
    const targetFps = this.graphicsSettings.targetFps;
    if (typeof targetFps === 'number' && targetFps > 0) {
      const minInterval = 1000 / targetFps;
      if (now - this.lastFrameTime < minInterval - 1.0) {
        return;
      }
    }
    this.lastFrameTime = now;

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
    this.updateLootPickups(delta);
    this.updateCamera(delta);
    this.updateRemotePlayers(delta);

    // Update Mage Arcane Shield Timer
    if (this.arcaneShieldTimer > 0) {
      this.arcaneShieldTimer -= delta;
      if (this.arcaneShieldTimer <= 0) {
        this.arcaneShieldTimer = 0;
        this.arcaneShieldHp = 0;
        this.callbacks.onAddFloatingText('Perisai Sihir Berakhir', '#94a3b8', 'info');
      }
    }

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
        this.scene.remove(vfx.object);
        if (vfx.cleanup) {
          try {
            vfx.cleanup();
          } catch {}
        }
        this.activeVfx.splice(i, 1);
      }
    }

    // Update active projectiles (e.g. Mage Arcane Bolt & Titan Rock Boulder)
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const proj = this.activeProjectiles[i];
      proj.lifetime -= delta;
      proj.object.position.addScaledVector(proj.direction, proj.speed * delta);

      if (proj.isHostile) {
        if (proj.rotationAxis) {
          proj.object.rotateOnAxis(proj.rotationAxis, delta * 8);
        }
        const distToPlayer = proj.object.position.distanceTo(this.playerPos);
        const groundY = this.world.getTerrainHeight(proj.object.position.x, proj.object.position.z);
        const hitGround = proj.object.position.y <= groundY + 0.5;

        if (distToPlayer <= (proj.blastRadius || 2.4) || hitGround || proj.lifetime <= 0) {
          const hitPos = proj.object.position.clone();
          hitPos.y = groundY + 0.15;
          this.spawnShockwaveRing(hitPos, 0xff5722, 4.5, 0.4);
          this.spawnSparks(hitPos, 0x44403c, 16, 5.0);
          this.spawnSparks(hitPos, 0xff7a00, 14, 4.5);
          soundManager.playTitanGroundSlam();
          this.triggerCameraShake(0.75);

          if (distToPlayer <= (proj.blastRadius || 3.2)) {
            if (this.isInvulnerable) {
              this.callbacks.onAddFloatingText('KEBAL / iFrame!', '#38bdf8', 'info');
            } else {
              this.callbacks.onUpdateStats((stats) => {
                let finalDmg = Math.max(5, proj.damage - Math.round(stats.baseDefense * 0.5));
                const { remainingDamage } = this.absorbDamageWithShield(finalDmg);
                finalDmg = remainingDamage;
                const nextHp = Math.max(0, stats.hp - finalDmg);
                if (finalDmg > 0) {
                  this.callbacks.onAddFloatingText(`-${finalDmg} HP (Bongkahan Batu)`, '#ff1744', 'damage');
                }
                if (nextHp <= 0) {
                  this.respawnPlayerAtLastVisitedTown();
                  return { ...stats, hp: stats.maxHp, mp: stats.maxMp, gold: Math.max(0, stats.gold - 10) };
                }
                return { ...stats, hp: nextHp };
              });
              const knockDir = new THREE.Vector3(this.playerPos.x - hitPos.x, 0, this.playerPos.z - hitPos.z).normalize();
              this.playerVel.x += knockDir.x * 14.0;
              this.playerVel.z += knockDir.z * 14.0;
              this.callbacks.onAddFloatingText('💨 TERPENTAL (KNOCKBACK)!', '#ff9100', 'info');
            }
          }

          this.scene.remove(proj.object);
          this.activeProjectiles.splice(i, 1);
          continue;
        }
      }

      // Check collision against enemies (Player projectiles)
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

    // Global animation time for world elements & props
    const elapsed = this.clock.getElapsedTime();



    // Floating crystal spin
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

    // Optimization 1: Dynamic PointLights (Keep only 4 closest lights active)
    if (this.posUpdateThrottle % 8 === 0 && this.scenePointLights.length > 4) {
      const pX = this.playerPos.x;
      const pZ = this.playerPos.z;
      this.scenePointLights.sort((a, b) => {
        const da = (a.position.x - pX) ** 2 + (a.position.z - pZ) ** 2;
        const db = (b.position.x - pX) ** 2 + (b.position.z - pZ) ** 2;
        return da - db;
      });
      for (let i = 0; i < this.scenePointLights.length; i++) {
        this.scenePointLights[i].visible = i < 4;
      }
    }

    // Optimization 2: Distance LOD for distant background props (>160 units)
    if (this.posUpdateThrottle % 16 === 0 && this.world.decorativeProps && this.world.decorativeProps.length > 0) {
      const pX = this.playerPos.x;
      const pZ = this.playerPos.z;
      const maxDistSq = 160 * 160;
      for (const prop of this.world.decorativeProps) {
        const distSq = (prop.position.x - pX) ** 2 + (prop.position.z - pZ) ** 2;
        prop.visible = distSq <= maxDistSq;
      }
    }

    // Emit live position for MiniMap & World Map (throttled)
    this.posUpdateThrottle++;
    if (this.posUpdateThrottle % 4 === 0 && this.callbacks.onPlayerPositionUpdate) {
      const markers: MapMarker[] = [];

      // Village NPCs
      if (this.world.npcs && this.world.npcs.length > 0) {
        const roleIcons: Record<string, string> = {
          elder: 'ðŸ§™â€â™‚ï¸',
          guard: 'ðŸ›¡ï¸',
          alchemist: 'ðŸ§ª',
          blacksmith: 'ðŸ”¨',
          bard: 'ðŸŽµ',
          fisherman: 'ðŸŸ',
          villager: 'ðŸ›’',
        };
        this.world.npcs.forEach((npc) => {
          let customIcon = roleIcons[npc.roleType] || 'ðŸ‘¤';
          let customColor = '#fbbf24';
          if (npc.id === 'blacksmith_torvald') {
            customIcon = 'ðŸ”¨';
            customColor = '#f97316';
          } else if (npc.id === 'alchemist_anya') {
            customIcon = 'ðŸ§ª';
            customColor = '#10b981';
          } else if (npc.id === 'villager_maya') {
            customIcon = 'ðŸ›¡ï¸';
            customColor = '#3b82f6';
          } else if (npc.id === 'fisherman_joko') {
            customIcon = 'ðŸŸ';
            customColor = '#06b6d4';
          } else if (npc.id === 'villager_kael') {
            customIcon = 'ðŸ—ï¸';
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
          icon: 'ðŸ§™â€â™‚ï¸',
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
        icon: 'â›²',
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
        icon: 'âš“',
        color: '#00b4d8',
        description: 'Perahu & Pemandangan Laut',
      });

      // Ibukota Kerajaan Emas Astraea & Istana Kaisar (Ujung Utara Frostpeak)
      markers.push({
        id: 'landmark_astraea_palace',
        title: 'Istana Kaisar Aurelius',
        type: 'boss',
        x: 195,
        z: -260,
        icon: 'ðŸ‘‘',
        color: '#fbbf24',
        description: 'Ibukota Kerajaan Emas Astraea (Utara Frostpeak)',
      });

      // Jurang Es Purba (North of Astraea)
      markers.push({
        id: 'landmark_frozen_chasm',
        title: 'Jurang Es Purba',
        type: 'waypoint',
        x: 180,
        z: -320,
        icon: 'â„ï¸',
        color: '#38bdf8',
        description: 'Jurang Gletser Es Alami Frostpeak',
      });

      // Pelabuhan Kapal Sanctuary
      markers.push({
        id: 'landmark_sanctuary_harbor',
        title: 'Pelabuhan Kapal Sanctuary',
        type: 'pier',
        x: 0,
        z: 21,
        icon: 'â›µ',
        color: '#00b4d8',
        description: 'Dermaga Kayu Utama & Titian Pantai Sanctuary',
      });

      markers.push({
        id: 'landmark_sanctuary_pier_head',
        title: 'Anjungan Dermaga Laut Lepas',
        type: 'pier',
        x: 0,
        z: 52,
        icon: 'âš“',
        color: '#0284c7',
        description: 'Ujung Dermaga Kayu Megah dengan Kapal Perang & Kapal Dagang Berlabuh',
      });

      // Reruntuhan Kuno Vael (Upstream Outskirts)
      markers.push({
        id: 'landmark_vael_ruins',
        title: 'Reruntuhan Kuno Vael',
        type: 'waypoint',
        x: -118,
        z: 36,
        icon: 'ðŸ›ï¸',
        color: '#94a3b8',
        description: 'Pilar Spasial Peradaban Kuno Vael',
      });

      // Benteng Pertahanan Val-Kragor (Highland)
      markers.push({
        id: 'landmark_valkragor_fortress',
        title: 'Benteng Val-Kragor',
        type: 'boss',
        x: 188,
        z: -16,
        icon: 'ðŸ°',
        color: '#3b82f6',
        description: 'Benteng Dataran Tinggi Val-Kragor',
      });

      // Desa Bazaar Gurun Solaria (South-West: Berjarak 87 unit dari Istana)
      markers.push({
        id: 'landmark_solaria_village',
        title: 'Desa Bazaar Gurun Solaria',
        type: 'waypoint',
        x: -305,
        z: 350,
        icon: 'ðŸŽª',
        color: '#f59e0b',
        description: 'Bazaar Ramai, Peristirahatan Unta, Rumah Bertingkat & Sumur Oase Solaria',
      });

      // Ancient Titan Sanctuary Basin Arena (North-West: [-95, -75])
      markers.push({
        id: 'landmark_titan_basin',
        title: 'Lembah Danau Cekungan Titan Kuno',
        type: 'boss',
        x: -95,
        z: -75,
        icon: '🏛️',
        color: '#0284c7',
        description: 'Cekungan Danau Lembah Purba & Arena Pertarungan Sang Titan Kuno Obsidian',
      });

      // Piramida Emas Solaria (South-West: [-180, 180])
      markers.push({
        id: 'landmark_solaria_pyramid',
        title: 'Piramida Emas Solaria',
        type: 'waypoint',
        x: -180,
        z: 180,
        icon: '🏜️',
        color: '#eab308',
        description: 'Piramida Kuno Megah di Perbatasan Bukit Pasir Emas Solaria',
      });

      // Kuil Pagoda Giok & Rumpun Bambu (South-East: [170, 160])
      markers.push({
        id: 'landmark_jadepagoda',
        title: 'Kuil Pagoda Giok & Gerbang Torii',
        type: 'waypoint',
        x: 170,
        z: 160,
        icon: '⛩️',
        color: '#10b981',
        description: 'Pagoda Megah Tiga Tingkat di Tengah Rumpun Bambu Zamrud',
      });

      // Mage Tower Puncak Halilintar (North-East Highlands: [160, -150])
      markers.push({
        id: 'landmark_thunderpeak_magetower',
        title: 'Mage Tower Puncak Halilintar',
        type: 'waypoint',
        x: 160,
        z: -150,
        icon: 'ðŸ§™â€â™‚ï¸',
        color: '#38bdf8',
        description: 'Menara Penyihir Bertingkat, Pustaka Kuno, Laboratorium Alkimia & Observatorium',
      });

      // Istana Taj Mahal Sultan Solaria (West of Village)
      markers.push({
        id: 'landmark_solaria_palace',
        title: 'Istana Taj Mahal Sultan Solaria',
        type: 'waypoint',
        x: -415,
        z: 350,
        icon: 'ðŸ•Œ',
        color: '#fbbf24',
        description: 'Kemegahan Marmer Putih, Menara Minaret, Kolam Pantul & Ruang Takhta',
      });

      // Jarrus, Sang Cacing Purba (Deep South Solaria Dunes)
      markers.push({
        id: 'landmark_boss_jarrus',
        title: 'Sarang Jarrus Sang Cacing Purba',
        type: 'boss',
        x: -240,
        z: 420,
        icon: 'ðŸª±',
        color: '#ea580c',
        description: 'Wilayah Teritorial Cacing Purba Pemangsa Gurun Dalam',
      });

      // Secret Palm Oasis of Solaria (South-West)
      markers.push({
        id: 'landmark_solaria_oasis',
        title: 'Oase Tersembunyi Solaria',
        type: 'waypoint',
        x: -340,
        z: 260,
        icon: 'ðŸŒ´',
        color: '#06b6d4',
        description: 'Oase Kolam Pirus & Palem Gurun',
      });

      // Outer Frostpeak Glacier Expanse (North-East)
      markers.push({
        id: 'landmark_frostpeak_glacier',
        title: 'Gletser Beku Frostpeak',
        type: 'waypoint',
        x: 240,
        z: -220,
        icon: 'ðŸ”ï¸',
        color: '#38bdf8',
        description: 'Menara Pengawas Gletser Terluar',
      });

      // Primal Dragon Caldera Arena (Far North: [-29, -337])
      markers.push({
        id: 'landmark_dragon_core',
        title: 'Kaldera Sarang Naga Purba',
        type: 'boss',
        x: -29,
        z: -337,
        icon: 'ðŸ”¥',
        color: '#ef4444',
        description: 'Sarang Lahar Panas Naga Purba',
      });

      // Shadowfen Deep Hollow (West)
      markers.push({
        id: 'landmark_shadowfen_deep',
        title: 'Lembah Jamur Abadi Shadowfen',
        type: 'waypoint',
        x: -300,
        z: 25,
        icon: 'âœ¨',
        color: '#a855f7',
        description: 'Grotto Rawa Terdalam',
      });

      // Celestial Bamboo Pavilion (South-East)
      markers.push({
        id: 'landmark_jade_sanctuary',
        title: 'Paviliun Bambu Surgawi',
        type: 'waypoint',
        x: 310,
        z: 210,
        icon: 'ðŸª·',
        color: '#10b981',
        description: 'Kuil Pagoda Terluar Tenggara',
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
            icon: enemy.data.type === 'boss' ? 'ðŸ’€' : enemy.data.type === 'skeleton' ? 'â˜ ï¸' : 'ðŸ‘¾',
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
            icon: 'ðŸ“¦',
            color: '#ffd700',
          });
        }
      });

      const targetPosX = this.isSpectatorMode ? this.spectatorPos.x : this.playerPos.x;
      const targetPosZ = this.isSpectatorMode ? this.spectatorPos.z : this.playerPos.z;
      const targetRotY = this.isSpectatorMode ? this.spectatorYaw : this.playerRotationY;
      const currentReg = getCurrentRegion(targetPosX, targetPosZ);
      this.callbacks.onPlayerPositionUpdate({
        x: targetPosX,
        z: targetPosZ,
        rotationY: targetRotY,
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
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('pagehide', this.handleBlur);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    dom.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);

    // Clean up active VFX and projectiles
    this.starfallTimeoutIds.forEach((id) => clearTimeout(id));
    this.starfallTimeoutIds = [];
    this.activeVfx.forEach((v) => {
      this.scene.remove(v.object);
      if (v.cleanup) {
        try {
          v.cleanup();
        } catch {}
      }
    });
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
