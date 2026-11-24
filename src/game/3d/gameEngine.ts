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
import { isPointOnRoad, getProceduralContinentHeight, isDesertBiome } from '../mapSampler';
export { isDesertBiome };
import {
  createEnemyMesh,
  createPlayerMesh,
  createArrowMesh,
  PlayerMeshObjects,
  USE_LEGACY_KNIGHT,
  animateKnightWalk,
  animateKnightCombatPose,
  setKnightBladeGlow,
  resetKnightBladeGlow,
  USE_LEGACY_MAGE,
  animateMageWalk,
  animateMageSkillPose,
  USE_LEGACY_HUNTER,
  updateHunterWeaponStance,
  animateHunterWalk,
  animateHunterBowAim,
} from './models';
export { USE_LEGACY_KNIGHT, USE_LEGACY_MAGE, USE_LEGACY_HUNTER };
import { buildWorld, buildWorldAsync, WorldObjects, WorldCheckpoint, getTerrainHeight as getProceduralTerrainHeight } from './world';
import {
  buildWorldEnvironment,
  buildWorldEnvironmentAsync,
  WorldEnvironmentResult,
  getExactMeshGroundHeight,
} from './worldEnvironment';
import { BossManager } from '../BossManager';
import { BOSS_ARENA_ZONES, BossArenaZone } from '../monsterAI';
import { RemotePlayerData } from '../multiplayer';
import { GraphicsSettings, loadGraphicsSettings } from '../graphicsSettings';
import {
  isInsideSafeZone,
  SPAWN_SANDWORM,
  SPAWN_TITAN,
  MEADOW_SLIME_SPAWNS,
  MAGMA_SLIME_SPAWNS,
  SKELETON_SENTINEL_SPAWNS,
  SKELETON_MAGE_SPAWNS,
  BEACH_GOBLIN_SPAWNS,
  FOREST_GOLEM_SPAWNS,
  FOREST_SPIDER_SPAWNS,
  FROST_WOLF_SPAWNS,
  BEAST_LAIR_SPAWNS,
  BANDIT_OUTPOST_SPAWNS,
  SAVANNA_HILL_SPAWNS,
  COASTAL_BEACH_SPAWNS,
  PLAINS_WOLF_SPAWNS,
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
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  WORLD_LAYOUT_CONFIG,
  WorldLandmarkLayout,
  WorldBridgeLayout,
  WorldLayoutConfig,
} from './worldLayoutConfig';
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
  createGlacialBarrageVfx,
  GlacialBarrageResourcePool,
  GlacialBarrageVfxInstance,
  preloadStarfallPool,
  preloadMageVfxPool,
  preloadMageVfxPoolAsync,
  StarfallCastingCircleInstance,
  StarfallResourcePool,
  ArcaneBeamResourcePool,
  CelestialHealResourcePool,
  CelestialHealVfxInstance,
  MageBlinkResourcePool,
  MageBlinkVfxInstance,
  SkywardArrowVolleyResourcePool,
  SkywardArrowVolleyVfxInstance,
  createSkywardArrowVolleyVfx,
  getGaleMagicCircleTexture,
  SKILL_COOLDOWNS,
} from '../skills';
import { DayNightSystem, getSharedDayNightSystem } from './dayNightSystem';
import { yieldToMainThread, yieldIfBudgetExceeded, yieldToChrome, cooperativeYield } from './frameBudget';
export { yieldToMainThread, yieldIfBudgetExceeded, yieldToChrome, cooperativeYield };

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
  nameTag?: THREE.Sprite;
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
  onGlacialAimChange?: (isAiming: boolean, targetInfo?: { name: string; hp: number; maxHp: number; isBoss?: boolean } | null) => void;
  onBowAimChange?: (isAiming: boolean, chargeRatio: number) => void;
  onArrowVolleyAimChange?: (isAiming: boolean) => void;
  onCastingUpdate?: (casting: { isCasting: boolean; progress: number; text: string } | null) => void;
  onCheckpointUnlocked?: (id: string, nameId: string, pos: [number, number]) => void;
  onPreviewRoleSelected?: (role: 'warrior' | 'mage' | 'rogue') => void;
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

/**
 * Kalkulasi elevasi ketinggian tanah perlin noise landai (kontur lembut bukit padang rumput)
 * Pengecualian desa (datar 0) dan padang gurun
 */
export function getTerrainHeight(x: number, z: number): number {
  return getExactMeshGroundHeight(x, z);
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
    x: 25,
    z: 135,
    radius: 45,
    respawnX: 25,
    respawnZ: 138,
  },
  {
    id: 'town_valkragor',
    waypointId: 'wp_valkragor',
    name: 'Benteng Val-Kragor',
    x: 315,
    z: 95,
    radius: 45,
    respawnX: 315,
    respawnZ: 95,
  },
  {
    id: 'town_astraea',
    waypointId: 'wp_astraea',
    name: 'Ibukota Kerajaan Emas Astraea',
    x: -250,
    z: -210,
    radius: 50,
    respawnX: -248,
    respawnZ: -210,
  },
  {
    id: 'town_solaria',
    waypointId: 'wp_solaria_village',
    name: 'Desa & Istana Gurun Solaria',
    x: 355,
    z: -440,
    radius: 65,
    respawnX: 355,
    respawnZ: -435,
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

interface PooledHunterArrow {
  root: THREE.Group;
  shaft: THREE.Mesh;
  tip: THREE.Mesh;
  normalTrail: THREE.Mesh;
  piercingTrail: THREE.Mesh;
  piercingVortex: THREE.Group;
  inUse: boolean;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private callbacks: GameEngineCallbacks;
  private bossManager: BossManager;
  // Dynamic Boss Aerial Camera & Airborne tracking
  private isDragonAirborne = false;
  private cameraTargetOffsetY = 0;
  private cameraAerialZoom = 0;
  private playerStamina = 100;
  // Zone-Based Boss Combat & BGM System
  private currentBossZone: BossArenaZone | null = null;
  private activeBossEnemyData: EnemyData | null = null;
  private exitBossZoneTimer = 0;
  private inBossCombatZone = false;
  private unlockedCheckpoints: Set<string> = new Set();
  private lastVisitedTownPos: { id: string; x: number; y: number; z: number; name: string } = (() => {
    try {
      const saved = localStorage.getItem('eldoria_last_visited_town');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number') return parsed;
      }
    } catch { }
    return { id: 'wp_village', x: 0, y: 0.5, z: 184, name: 'Desa Utama Sanctuary' };
  })();
  private scenePointLights: THREE.PointLight[] = [];
  private frameCount: number = 0;
  private currentParticleCount = 0;
  public dayNightSystem: DayNightSystem;

  // World and Player (Deferred / Lazy World Loading for instant 60 FPS Main Menu)
  public isWorldLoaded = false;
  private world!: WorldObjects;
  private worldEnvironment?: WorldEnvironmentResult;
  private characterSelectStudioGroup: THREE.Group | null = null;
  private playerMesh: PlayerMeshObjects;
  private playerPos = new THREE.Vector3(-40, 0, 148);
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
    | 'warrior_combo_1'
    | 'warrior_combo_2'
    | 'warrior_combo_3_shield'
    | 'warrior_combo_4_thrust'
    | 'warrior_charge_release_quick'
    | 'warrior_charge_release_tier1'
    | 'warrior_charge_release_tier2'
    | 'warrior_charge_release_tier3'
    | 'warrior_crescent_1'
    | 'warrior_crescent_2'
    | 'warrior_crescent_3'
    | 'cataclysmic_leap'
    | 'cataclysmic_slam'
    | 'aegis_retribution'
    | 'shield_dash'
    | 'mage_aim_glacial'
    | 'hunter_aim_volley'
    | 'hunter_volley_release'
    | 'hunter_gale_vault'
    | 'hunter_phantom_decoy'
    | null = null;
  public isCasting = false;
  private castingTimer = 0;
  private castingDuration = 1.0;
  private castingSkillName = '';
  private castingCircleInstance: StarfallCastingCircleInstance | null = null;
  // TODO: Kembalikan cooldown normal setelah pengujian selesai
  private mageUltimateCooldownTimer = 0;
  private mageGlacialBarrageCooldownTimer = 0;
  private mageBlinkCooldownTimer = 0;
  private mageCahayaSuciCooldownTimer = 0;
  private hunterArrowVolleyCooldownTimer = 0;
  private hunterMobilityCooldownTimer = 0;
  // Hunter Gale Vault & Snipe state
  private isGaleVaulting = false;
  private galeVaultTimer = 0;
  private galeVaultShotFired = false;
  // Hunter Phantom Decoy Step state
  public phantomAmbushReady = false;
  private phantomAmbushTimer = 0;
  private shadowDecoyPool: THREE.Group[] = [];
  private activeShadowDecoy: {
    group: THREE.Group;
    pos: THREE.Vector3;
    timer: number;
    active: boolean;
    damage: number;
  } | null = null;
  // Hunter Bow Skyward Arrow Volley: Hold-to-Aim & Ground Decal state
  public isAimingArrowVolley = false;
  private isHoldingArrowVolleyKey = false;
  private arrowVolleyKeyDownTime = 0;
  private arrowVolleyAimTimer: number | null = null;
  private arrowVolleyTargetPoint = new THREE.Vector3();
  private arrowVolleyIndicatorGroup: THREE.Group | null = null;
  private arrowVolleyDecalSubgroup: THREE.Group | null = null;
  private arrowVolleyGroundDecal: THREE.Mesh | null = null;
  private arrowVolleyOuterRing: THREE.Mesh | null = null;
  private arrowVolleyTrajectoryLine: THREE.Line | null = null;
  // Mage Glacial Crystal Barrage: Hold-to-Aim & Over-the-Shoulder camera state
  private isAimGlacialActive = false;
  private aimGlacialCancelled = false;
  private isHoldingGlacialKey = false;
  private glacialKeyDownTime = 0;
  private glacialAimTimer: number | null = null;
  private activeGlacialVfx: GlacialBarrageVfxInstance | null = null;
  private aimIndicatorGroup: THREE.Group | null = null;
  private aimIndicatorGroundRing: THREE.Mesh | null = null;
  private aimIndicatorInnerRing: THREE.Mesh | null = null;
  private aimTrajectoryLine: THREE.Line | null = null;
  private aimTargetPoint = new THREE.Vector3();
  private lastGlacialTargetId: string | null = null;
  private cameraCurrentLookAt = new THREE.Vector3();
  private activeScorchedCraters: {
    center: THREE.Vector3;
    radius: number;
    timer: number;
    dps: number;
    tickTimer: number;
  }[] = [];
  private isDashing = false;
  private dashTimer = 0;
  private isInvulnerable = false;
  private invulnerableTimer = 0;
  private cameraFovPunch = 0;
  private charClass: CharacterClass = 'warrior';
  public isMoving = false;

  // Static Player Skill PointLight (Zero-Allocation & Zero Shader Invalidation)
  public skillVfxLight!: THREE.PointLight;

  // Reusable Class Scratch Vectors (Zero Garbage Collection during Skills)
  private readonly _scratchVec1 = new THREE.Vector3();
  private readonly _scratchVec2 = new THREE.Vector3();
  private readonly _scratchVec3 = new THREE.Vector3();
  private readonly _scratchForward = new THREE.Vector3();
  private readonly _scratchOrigin = new THREE.Vector3();
  private readonly _scratchTarget = new THREE.Vector3();
  private readonly _scratchUp = new THREE.Vector3(0, 1, 0);
  private readonly _scratchToEnemy = new THREE.Vector3();
  private readonly _scratchClosestPoint = new THREE.Vector3();
  private readonly _scratchHitPos = new THREE.Vector3();

  // Static Ring Buffer Particle Pool for Sparks & Mage VFX (Zero Dynamic Allocations)
  private sparkInstancedMesh!: THREE.InstancedMesh;
  private sparkDummy = new THREE.Object3D();
  private readonly SPARK_MAX_COUNT = 120;
  private sparkPool: Array<{
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    color: THREE.Color;
    gravityScale?: number;
  }> = [];
  private sparkNextIndex = 0;

  // Reusable Static Pools for Shockwave Rings & Starbursts
  private shockwavePool: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
    maxRadius: number;
  }> = [];
  private shockwaveNextIndex = 0;

  private starburstPool: Array<{
    group: THREE.Group;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
    scale: number;
  }> = [];
  private starburstNextIndex = 0;
  public get currentRole(): string {
    return this.charClass === 'rogue' ? 'assassin' : this.charClass;
  }
  public set currentRole(role: string) {
    if (role === 'assassin') this.charClass = 'rogue';
    else if (role === 'knight') this.charClass = 'warrior';
    else if (role === 'warrior' || role === 'mage' || role === 'rogue') this.charClass = role;
  }
  private playerTier = 1;
  private playerLevel = 1;
  private footstepTimer = 0;
  private speedBuffTimer = 0;
  private regenTimer = 0;
  public arcaneShieldHp = 0;
  public arcaneShieldTimer = 0;

  // Warrior Overhaul: Shield, Resources & Charge Attack
  public playerShield = 0;
  public playerMaxShield = 0;
  public playerShieldTimer = 0;
  public aegisRetributionTimer = 0;
  private isSprinting = false;
  private isChargingAttack = false;
  private chargeTimer = 0;
  private warriorComboIndex = 0;
  private chargeParticleTimer = 0;
  private cataclysmicLeaping = false;
  private cataclysmicLanded = false;
  private sprintDrainAccum = 0;
  private staminaRegenAccum = 0;
  private auraRegenAccum = 0;
  private chargeDrainAccum = 0;

  private hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  // Hunter Ninja Sprint Auto-Sheathe & Shadow Afterimages state
  private isHunterSheathed = false;
  private hunterAfterimagePool: {
    group: THREE.Group;
    materials: THREE.MeshBasicMaterial[];
    active: boolean;
    timer: number;
    maxDuration: number;
  }[] = [];
  private hunterAfterimageSpawnTimer = 0;
  private attackComboIndex = 0;
  private mageLandingCrouchTimer = 0;
  private mageHoverOffsetY = 0;
  private magePitchX = 0;
  private mageBankingRoll = 0;
  private mageGlideParticleTimer = 0;
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
  // Hunter Bow Progressive Aim & Tap-or-Hold State Machine
  private isHoldingBowAttack = false;
  private bowPressStartTime = 0;
  public isAimingBow = false;
  public bowChargeRatio = 0;
  private hunterArrowPool: PooledHunterArrow[] = [];
  private hunterArrowPoolGeometries: THREE.BufferGeometry[] = [];
  private hunterArrowPoolMaterials: THREE.Material[] = [];

  private activeProjectiles: {
    object: THREE.Object3D;
    direction: THREE.Vector3;
    speed: number;
    lifetime: number;
    damage: number;
    isCrit: boolean;
    vfxType: 'arcane_bolt' | 'hunter_arrow' | 'hunter_arrow_rain' | 'titan_boulder' | 'dragon_fireball';
    isHostile?: boolean;
    blastRadius?: number;
    rotationAxis?: THREE.Vector3;
    isPiercing?: boolean;
    hitEnemyIds?: Set<string>;
    distanceTraveled?: number;
    pooledArrow?: PooledHunterArrow;
    isCripplingSlow?: boolean;
  }[] = [];

  // Spectator / Freecam Mode (Minecraft-Style Fly Cam)
  public isSpectatorMode = false;
  public isHudHidden = false;
  private spectatorPos = new THREE.Vector3();
  private spectatorYaw = 0;
  private spectatorPitch = 0;
  private spectatorSpeed = 22.0; // units/sec, adjustable 4.0 to 90.0 via scroll wheel
  private savedPlayerPos = new THREE.Vector3();

  // Visual World Editor (Dev Mode Only)
  public isWorldEditorActive = false;
  public isDraggingGizmo = false;
  private transformControls: TransformControls | null = null;
  private transformHelper: THREE.Object3D | null = null;
  private editorAnchors: Map<string, THREE.Group> = new Map();
  public activeEditorTargetId: string | null = null;
  public editorGizmoMode: 'translate' | 'rotate' | 'scale' = 'translate';
  public onWorldEditorTransformChange?: (
    targetId: string,
    transform: { x: number; y: number; z: number; rotationY: number; scale: number }
  ) => void;

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

  // Main Menu & 3D Character Selection Scene State
  public menuMode: 'main_menu' | 'character_select' | 'gameplay' = 'main_menu';
  public selectedPreviewRole: 'warrior' | 'mage' | 'rogue' = 'warrior';
  private knightPreview: PlayerMeshObjects | null = null;
  private magePreview: PlayerMeshObjects | null = null;
  private assassinPreview: PlayerMeshObjects | null = null;
  private selectionPedestal: THREE.Mesh | null = null;
  private selectionPedestalMat: THREE.MeshBasicMaterial | null = null;
  private previewActionTimer = 0;
  private previewActionRole: 'warrior' | 'mage' | 'rogue' | null = null;
  private isDraggingPreview = false;
  private prevPreviewMouseX = 0;

  public setSelectedPreviewRole(role: 'warrior' | 'mage' | 'rogue') {
    this.selectedPreviewRole = role;
  }

  public triggerSkillVfxLight(pos: THREE.Vector3, color: number, intensity: number, distance: number) {
    if (!this.skillVfxLight) return;
    this.skillVfxLight.position.copy(pos);
    this.skillVfxLight.color.setHex(color);
    this.skillVfxLight.intensity = intensity;
    this.skillVfxLight.distance = distance;
  }

  public extinguishSkillVfxLight() {
    if (!this.skillVfxLight) return;
    this.skillVfxLight.intensity = 0;
  }

  public prewarmMageShadersInFrustum(): void {
    if (this.scene && this.renderer && this.camera) {
      preloadMageVfxPool(this.scene, this.renderer, this.camera);
      this.prewarmHunterShadersInFrustum();
    }
  }

  public setMenuMode(mode: 'main_menu' | 'character_select' | 'gameplay') {
    this.menuMode = mode;
    if (mode === 'main_menu') {
      this.clearCharacterSelectScene();
      if (this.playerMesh?.group) {
        this.playerMesh.group.visible = false;
      }
      if (this.renderer) {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.clear();
      }
      if (this.camera) {
        this.camera.far = 160;
        this.camera.updateProjectionMatrix();
      }
      // Zero-lag Main Menu: hide instanced vegetation, distant chunks, and all monsters
      this.worldEnvironment?.setVegetationVisible(false);
      this.enemies.forEach((e) => { e.mesh.visible = false; });
      this.setControlsLocked(true);
    } else if (mode === 'character_select') {
      if (this.playerMesh?.group) {
        this.playerMesh.group.visible = false;
      }
      if (this.renderer) {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.autoUpdate = false;
      }
      if (this.camera) {
        this.camera.far = 160;
        this.camera.updateProjectionMatrix();
      }
      this.worldEnvironment?.setVegetationVisible(false);
      this.enemies.forEach((e) => { e.mesh.visible = false; });
      this.setupCharacterSelectScene();
      this.setControlsLocked(true);
    } else if (mode === 'gameplay') {
      if (!this.isWorldLoaded) {
        this.initFullWorld();
      }
      this.clearCharacterSelectScene();
      if (this.playerMesh?.group) {
        this.playerMesh.group.visible = true;
      }
      if (this.renderer) {
        const isMobileOrLowEnd = typeof navigator !== 'undefined' && (
          navigator.hardwareConcurrency <= 4 || /Android|iPhone|iPad/i.test(navigator.userAgent)
        );
        this.renderer.setPixelRatio(this.graphicsSettings.renderScale * Math.min(window.devicePixelRatio, isMobileOrLowEnd ? 1.0 : 1.5));
        this.renderer.shadowMap.enabled = this.graphicsSettings.shadows;
        this.renderer.shadowMap.autoUpdate = false;
        if (this.graphicsSettings.shadows) {
          this.renderer.shadowMap.needsUpdate = true;
        }
      }
      if (this.camera) {
        this.camera.far = 1200;
        this.camera.updateProjectionMatrix();
      }
      // Restore vegetation & alive monster meshes for gameplay
      this.worldEnvironment?.setVegetationVisible(true);
      this.enemies.forEach((e) => {
        if (!e.data.isDead) e.mesh.visible = true;
      });
      this.setControlsLocked(false);
      this.teleportGraceTimer = 0.5;
    }
  }

  /**
   * Compiles all shaders and materials in the current scene to eliminate runtime stutter
   */
  public compileAllShaders(): void {
    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.compile(this.scene, this.camera);
      } catch (e) {
        console.warn('[GameEngine] Shader compile warning:', e);
      }
    }
  }

  public setupCharacterSelectScene() {
    this.clearCharacterSelectScene();

    // Isolated Mini-Stage Studio Group centered at (0, 0, 0)
    this.characterSelectStudioGroup = new THREE.Group();

    // 1. Isolated Round Stone Platform Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(2.7, 2.9, 0.36, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.set(0, 0.18, 0);
    this.characterSelectStudioGroup.add(pedestalMesh);

    // Stone Top Trim
    const trimGeo = new THREE.CylinderGeometry(2.55, 2.7, 0.08, 48);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x333b47,
      roughness: 0.65,
      metalness: 0.35,
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.set(0, 0.39, 0);
    this.characterSelectStudioGroup.add(trimMesh);

    // Golden Rune Ornamental Rim
    const goldRimGeo = new THREE.TorusGeometry(2.62, 0.035, 12, 48);
    goldRimGeo.rotateX(Math.PI / 2);
    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.85,
    });
    const goldRimMesh = new THREE.Mesh(goldRimGeo, goldRimMat);
    goldRimMesh.position.set(0, 0.43, 0);
    this.characterSelectStudioGroup.add(goldRimMesh);

    // Soft Studio Drop Shadow
    const shadowGeo = new THREE.CircleGeometry(3.2, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, 0.01, 0);
    this.characterSelectStudioGroup.add(shadowMesh);

    // 2. Studio Lighting connected with Day/Night cycle
    const dnState = this.dayNightSystem.getState();
    const isNight = dnState.phase === 'night';
    const isSunset = dnState.phase === 'sunset';
    const isDawn = dnState.phase === 'dawn';

    const ambColor = isNight ? 0x64748b : isSunset ? 0xfdba74 : isDawn ? 0xfbcfe8 : 0xe2e8f0;
    const keyColor = isNight ? 0xe0e7ff : isSunset ? 0xf97316 : isDawn ? 0xfdba74 : 0xfff7ed;
    const fillCol = isNight ? 0x818cf8 : isSunset ? 0xa855f7 : isDawn ? 0xc084fc : 0x93c5fd;
    const rimCol = isNight ? 0x38bdf8 : isSunset ? 0xfbbf24 : isDawn ? 0xf472b6 : 0xfef08a;

    const ambientLight = new THREE.AmbientLight(ambColor, 0.85);
    this.characterSelectStudioGroup.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(keyColor, 1.4);
    keyLight.position.set(2.5, 5, 4);
    this.characterSelectStudioGroup.add(keyLight);

    const fillLight = new THREE.DirectionalLight(fillCol, 0.65);
    fillLight.position.set(-3.5, 3, 2.5);
    this.characterSelectStudioGroup.add(fillLight);

    const rimLight = new THREE.DirectionalLight(rimCol, 0.8);
    rimLight.position.set(0, 4, -3.5);
    this.characterSelectStudioGroup.add(rimLight);

    this.scene.add(this.characterSelectStudioGroup);

    // 3. Isolated Character Preview Meshes on Studio Platform (Y = 0.43, Z = 0)
    const targetY = 0.43;
    const targetZ = 0;

    // Knight Preview (Left: X: -1.8)
    this.knightPreview = createPlayerMesh('warrior', 1);
    this.knightPreview.group.position.set(-1.8, targetY, targetZ);
    this.knightPreview.group.rotation.set(0, 0, 0);
    this.preparePreviewMaterials(this.knightPreview.group);
    this.scene.add(this.knightPreview.group);

    // Mage Preview (Center: X: 0)
    this.magePreview = createPlayerMesh('mage', 1);
    this.magePreview.group.position.set(0, targetY, targetZ);
    this.magePreview.group.rotation.set(0, 0, 0);
    this.preparePreviewMaterials(this.magePreview.group);
    this.scene.add(this.magePreview.group);

    // Assassin / Rogue Preview (Right: X: 1.8)
    this.assassinPreview = createPlayerMesh('rogue', 1);
    this.assassinPreview.group.position.set(1.8, targetY, targetZ);
    this.assassinPreview.group.rotation.set(0, 0, 0);
    this.preparePreviewMaterials(this.assassinPreview.group);
    this.scene.add(this.assassinPreview.group);

    const initialOffset = this.selectedPreviewRole === 'warrior' ? -1.8 : this.selectedPreviewRole === 'mage' ? 0 : 1.8;

    // Magic Rune Pedestal Ring (di bawah kaki karakter pada permukaan platform)
    const ringGeo = new THREE.RingGeometry(0.85, 1.05, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.selectionPedestalMat = new THREE.MeshBasicMaterial({
      color:
        this.selectedPreviewRole === 'warrior'
          ? 0x3b82f6 // Knight: Biru Terang
          : this.selectedPreviewRole === 'mage'
            ? 0xa855f7 // Mage: Ungu Arcane
            : 0x06b6d4, // Assassin: Cyan Neon
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.selectionPedestal = new THREE.Mesh(ringGeo, this.selectionPedestalMat);
    this.selectionPedestal.position.set(initialOffset, targetY + 0.015, targetZ);
    this.scene.add(this.selectionPedestal);

    // Setup camera position framing
    this.camera.position.set(0, 1.55, 4.8);
    this.camera.lookAt(0, 1.1, 0);
  }

  public clearCharacterSelectScene() {
    if (this.characterSelectStudioGroup) {
      this.scene.remove(this.characterSelectStudioGroup);
      this.characterSelectStudioGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else if (m.material) {
            m.material.dispose();
          }
        }
      });
      this.characterSelectStudioGroup = null;
    }
    if (this.knightPreview?.group) {
      this.disposePreviewGroup(this.knightPreview.group);
      this.knightPreview = null;
    }
    if (this.magePreview?.group) {
      this.disposePreviewGroup(this.magePreview.group);
      this.magePreview = null;
    }
    if (this.assassinPreview?.group) {
      this.disposePreviewGroup(this.assassinPreview.group);
      this.assassinPreview = null;
    }
    if (this.selectionPedestal) {
      this.scene.remove(this.selectionPedestal);
      this.selectionPedestal.geometry.dispose();
      if (this.selectionPedestalMat) {
        this.selectionPedestalMat.dispose();
        this.selectionPedestalMat = null;
      }
      this.selectionPedestal = null;
    }
    this.previewActionRole = null;
    this.previewActionTimer = 0;
    this.isDraggingPreview = false;
  }

  private preparePreviewMaterials(group: THREE.Group) {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const clone = m.clone();
            (clone as any).__origColor = (clone as any).color ? (clone as any).color.clone() : new THREE.Color(0xffffff);
            (clone as any).__origEmissive = (clone as any).emissive ? (clone as any).emissive.clone() : null;
            clone.transparent = true;
            return clone;
          });
        } else if (mesh.material) {
          const clone = mesh.material.clone();
          (clone as any).__origColor = (clone as any).color ? (clone as any).color.clone() : new THREE.Color(0xffffff);
          (clone as any).__origEmissive = (clone as any).emissive ? (clone as any).emissive.clone() : null;
          clone.transparent = true;
          mesh.material = clone;
        }
      }
    });
  }

  private updatePreviewDimming(group: THREE.Group | null, isSelected: boolean, delta: number) {
    if (!group) return;
    const targetOpacity = isSelected ? 1.0 : 0.58;
    const targetBrightness = isSelected ? 1.0 : 0.55;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          mat.transparent = true;
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 10.0);

          if ((mat as any).__origColor && (mat as any).color) {
            const origColor: THREE.Color = (mat as any).__origColor;
            const targetColor = origColor.clone().multiplyScalar(targetBrightness);
            (mat as any).color.lerp(targetColor, delta * 10.0);
          }
          if ((mat as any).__origEmissive && (mat as any).emissive) {
            const origEmissive: THREE.Color = (mat as any).__origEmissive;
            const targetEmissive = origEmissive.clone().multiplyScalar(targetBrightness);
            (mat as any).emissive.lerp(targetEmissive, delta * 10.0);
          }
        }
      }
    });
  }

  private disposePreviewGroup(group: THREE.Group | null) {
    if (!group) return;
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
    this.scene.remove(group);
  }

  public playRoleSelectAction(role: 'warrior' | 'mage' | 'rogue') {
    this.selectedPreviewRole = role;
    this.previewActionRole = role;
    this.previewActionTimer = 1.0;

    if (role === 'warrior') {
      soundManager.playWarriorCleave(1);
    } else if (role === 'mage') {
      soundManager.playStarfallImpact(true, 0);
    } else if (role === 'rogue') {
      soundManager.playRogueShadowFlurry();
    }
  }

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
    staggerTimer?: number;
    velocity?: THREE.Vector3;
    stunTimer?: number;
    slowTimer?: number;
    slowFactor?: number;
    brittleTimer?: number;
    armorBreakTimer?: number;
    armorBreakBonus?: number;
  }[] = [];

  // Active 3D Physical Loot Pickups (Materials & Items dropped by defeated monsters)
  private activeLootPickups: LootPickup[] = [];

  // Graphics & Performance settings
  private graphicsSettings: GraphicsSettings = loadGraphicsSettings();
  private lastFrameTime = 0;

  // Animation clocks
  private clock = new THREE.Clock();
  private walkTime = 0;
  private walkCycle = 0;
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
    const isMobileOrLowEnd = typeof navigator !== 'undefined' && (
      navigator.hardwareConcurrency <= 4 || /Android|iPhone|iPad/i.test(navigator.userAgent)
    );
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(this.graphicsSettings.renderScale * Math.min(dpr, isMobileOrLowEnd ? 1.0 : 1.5));
    this.renderer.shadowMap.enabled = this.graphicsSettings.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.id = 'webgl-canvas-3d';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.userSelect = 'none';
    (this.renderer.domElement.style as any).webkitUserSelect = 'none';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '0';
    this.renderer.domElement.style.opacity = '1';
    this.renderer.domElement.style.visibility = 'visible';
    container.appendChild(this.renderer.domElement);

    // 3. Atmosphere & Day-Night System
    this.dayNightSystem = getSharedDayNightSystem();

    // Static Player Skill PointLight (always in scene with 0 default intensity)
    this.skillVfxLight = new THREE.PointLight(0x00f0ff, 0, 15);
    this.skillVfxLight.name = 'PlayerSkill_StaticLight';
    this.scene.add(this.skillVfxLight);

    // Initialize Zero-Allocation Object Pools for Sparks and Combat VFX
    this.initSparksPool();
    this.initCombatVfxPools();
    this.initHunterArrowPool();

    // Initialize World Editor in Dev Mode
    if (import.meta.env.DEV) {
      this.initWorldEditor();
    }

    // 4. Create Player Mesh (initially hidden in main menu)
    this.playerMesh = createPlayerMesh(charClass);
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.visible = false;
    this.scene.add(this.playerMesh.group);
    this.setControlsLocked(true);

    // 5. Setup Listeners
    this.setupEventListeners();

    // 6. Start Loop
    this.isRunning = true;
    this.animate();
  }

  /**
   * Deferred Full World Initialization:
   * Generates terrain (1200x950), water, instanced vegetation, boss manager, colliders, and enemies
   * inside the gameplay loading screen after character or save slot selection.
   */
  public initFullWorld(): void {
    if (this.isWorldLoaded) return;

    // 1. Build 3D World (terrain, ocean, structures, colliders, lights, props)
    this.world = buildWorld(this.scene);

    // 2. Build 4 Environmental Thematic Zones & Natural Instanced Vegetation
    this.worldEnvironment = buildWorldEnvironment(
      this.scene,
      (x, z) => this.world.getTerrainHeight(x, z),
      this.world.colliders
    );

    // 3. Connect Day-Night lights
    if (this.world?.hemiLight && this.world?.dirLight) {
      this.dayNightSystem.applyOutdoorLighting(this.scene, this.world.hemiLight, this.world.dirLight, this.playerPos);
    }

    // 4. Warm-up & pre-compile all Mage shaders, geometries, and object pools in frustum
    preloadMageVfxPool(this.scene, this.renderer, this.camera);

    // 5. Initialize Boss Manager
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
        onSpawnFireballProjectile: (fromPos, toPos, damage) => {
          this.spawnIgnisFireballProjectile(fromPos, toPos, damage);
        },
        onPlayerDeath: () => {
          this.respawnPlayerAtLastVisitedTown();
        },
        onDamageAbsorb: (rawDmg) => this.absorbDamageWithShield(rawDmg).remainingDamage,
        onAirborneChange: (isAirborne: boolean) => {
          this.isDragonAirborne = isAirborne;
        },
      }
    );

    // 6. Dynamic PointLights cache for distance-based lighting optimization
    this.scenePointLights = this.world.pointLights || [];

    // 7. Initialize Checkpoints from saved state
    try {
      const saved = localStorage.getItem('eldoria_unlocked_checkpoints');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          list.forEach((id: string) => this.unlockedCheckpoints.add(id));
        }
      }
    } catch { }
    this.unlockedCheckpoints.add('wp_village');

    if (this.world.checkpoints) {
      this.world.checkpoints.forEach((cp) => {
        if (this.unlockedCheckpoints.has(cp.id)) {
          cp.unlocked = true;
          if (cp.setUnlocked) cp.setUnlocked(true);
        }
      });
    }

    // 8. Apply shadow & distance culling settings
    this.applyGraphicsSettings(this.graphicsSettings);

    // 9. Position player mesh on terrain
    const startY = getExactMeshGroundHeight(this.playerPos.x, this.playerPos.z);
    this.playerPos.y = startY;
    if (this.playerMesh?.group) {
      this.playerMesh.group.position.copy(this.playerPos);
    }

    // 10. Spawn Enemies
    this.spawnEnemies();

    this.isWorldLoaded = true;
  }

  /**
   * Time-Sliced Asynchronous World Initialization:
   * Splits terrain generation (1200x950), water bodies, instanced vegetation, boss arena,
   * shader precompilation and in-frustum Mage warm-up across 8 distinct stages.
   * Yields 1 frame (16ms) to main thread at each interval to guarantee 0% UI freeze
   * and eliminate browser "Page Unresponsive" warnings.
   */
  public async initFullWorldAsync(
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<void> {
    if (this.isWorldLoaded) {
      onProgress?.(100, 'Dunia Eldoria Siap!');
      return;
    }

    // Tahap 1: 15% Membangun Geometri & Heightmap Benua Eldoria
    onProgress?.(15, 'Membangun Geometri & Heightmap Benua Eldoria...');
    await yieldToMainThread();

    // 1. Build 3D World (terrain, ocean, structures, colliders, lights, props) with time-sliced async generation
    this.world = await buildWorldAsync(this.scene, onProgress);

    // Connect Day-Night outdoor lighting and dynamic PointLights
    if (this.world?.hemiLight && this.world?.dirLight) {
      this.dayNightSystem.applyOutdoorLighting(this.scene, this.world.hemiLight, this.world.dirLight, this.playerPos);
    }
    this.scenePointLights = this.world.pointLights || [];

    // Tahap 3b: 48.5% Menginisialisasi Boss Arena, Checkpoints, & Sistem Cahaya
    onProgress?.(48.5, 'Menginisialisasi Boss Arena, Checkpoints, & Sistem Cahaya...');
    await cooperativeYield(4);

    // Initialize Boss Manager
    this.bossManager = new BossManager(
      this.scene,
      (x, z) => this.world.getTerrainHeight(x, z),
      {
        onAddFloatingText: (text, color, type) => this.callbacks.onAddFloatingText(text, color, type),
        onUpdateStats: (updater) => this.callbacks.onUpdateStats(updater),
        onCameraShake: (amount) => {
          this.cameraShake = Math.max(this.cameraShake, amount);
        },
        onSpawnShockwave: (pos, color, maxRadius, duration) => {
          this.spawnShockwaveRing(pos, color, maxRadius, duration);
        },
        onSpawnSparks: (pos, color, count, speed) => {
          this.spawnSparks(pos, color, count, speed);
        },
        onSpawnBoulderProjectile: (fromPos, toPos, damage) => {
          this.spawnTitanBoulderProjectile(fromPos, toPos, damage);
        },
        onSpawnFireballProjectile: (fromPos, toPos, damage) => {
          this.spawnIgnisFireballProjectile(fromPos, toPos, damage);
        },
        onPlayerDeath: () => {
          this.respawnPlayerAtLastVisitedTown();
        },
        onDamageAbsorb: (rawDmg) => this.absorbDamageWithShield(rawDmg).remainingDamage,
        onAirborneChange: (isAirborne: boolean) => {
          this.isDragonAirborne = isAirborne;
        },
      }
    );

    // Initialize Checkpoints from saved state
    try {
      const saved = localStorage.getItem('eldoria_unlocked_checkpoints');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          list.forEach((id: string) => this.unlockedCheckpoints.add(id));
        }
      }
    } catch { }
    this.unlockedCheckpoints.add('wp_village');

    if (this.world.checkpoints) {
      this.world.checkpoints.forEach((cp) => {
        if (this.unlockedCheckpoints.has(cp.id)) {
          cp.unlocked = true;
          if (cp.setUnlocked) cp.setUnlocked(true);
        }
      });
    }

    // Tahap 3c: 48.5% - 50% Membangkitkan World Boss & Menempatkan Populasi Monster Time-Sliced
    await this.spawnEnemiesAsync(onProgress);

    // Tahap 4: 51% - 72% Populasi Vegetasi & Bebatuan (InstancedMesh) Time-Sliced
    onProgress?.(51, 'Populasi Vegetasi & Bebatuan (InstancedMesh)...');
    await cooperativeYield(4);

    // 2. Build 4 Environmental Thematic Zones & Natural Instanced Vegetation with TypedArray spatial lookup
    this.worldEnvironment = await buildWorldEnvironmentAsync(
      this.scene,
      (x, z) => this.world.getTerrainHeight(x, z),
      this.world.colliders,
      onProgress
    );

    // Position player mesh on terrain
    const startY = getExactMeshGroundHeight(this.playerPos.x, this.playerPos.z);
    this.playerPos.y = startY;
    if (this.playerMesh?.group) {
      this.playerMesh.group.position.copy(this.playerPos);
    }

    // Tahap 5: 75% Pre-Alokasi Pool VFX Karakter & Skill Mage
    onProgress?.(75, 'Pre-Alokasi Pool VFX Karakter & Skill Mage (75%)...');
    await cooperativeYield(4);

    // Pre-decode audio buffers
    await soundManager.preloadMageAudioBuffers();

    // Pre-allocate Skill Resource Pools
    StarfallResourcePool.get();
    ArcaneBeamResourcePool.get();
    CelestialHealResourcePool.get();
    MageBlinkResourcePool.get();
    GlacialBarrageResourcePool.get();

    // Apply shadow & distance culling settings
    this.applyGraphicsSettings(this.graphicsSettings);
    await cooperativeYield(4);

    // Tahap 6: 85% Mengompilasi Shader GPU Global (renderer.compile / compileAsync)
    onProgress?.(85, 'Mengompilasi Shader GPU Global (85%)...');
    await cooperativeYield(4);

    if (this.renderer && this.scene && this.camera) {
      try {
        if (typeof (this.renderer as any).compileAsync === 'function') {
          await (this.renderer as any).compileAsync(this.scene, this.camera);
        } else {
          this.renderer.compile(this.scene, this.camera);
        }
      } catch (e) {
        console.warn('[Engine] Shader compilation warning:', e);
      }
    }
    await cooperativeYield(4);

    // Tahap 7a: 90% In-Frustum GPU Shader Warm-Up Khusus Mage
    onProgress?.(90, 'Kompilasi Shader Pool Sihir Mage (90%)...');
    await cooperativeYield(4);

    if (this.scene && this.renderer && this.camera) {
      await preloadMageVfxPoolAsync(this.scene, this.renderer, this.camera, async () => {
        await cooperativeYield(4);
      });
    }
    await cooperativeYield(4);

    // Tahap 7b: 95% In-Frustum GPU Shader Warm-Up Khusus Pemburu & Assassin
    onProgress?.(95, 'Kompilasi Shader Pool Panah & Bayangan Pemburu (95%)...');
    await cooperativeYield(4);

    if (this.scene && this.renderer && this.camera) {
      await this.prewarmHunterShadersInFrustumAsync();
    }
    await cooperativeYield(4);

    // Tahap 7c: 98% Warm-Up Shader Boss Telegraph & Efek Tempur
    onProgress?.(98, 'Kompilasi Shader Boss Telegraph & Efek Tempur (98%)...');
    await cooperativeYield(4);
    if (this.bossManager && this.renderer && this.scene && this.camera) {
      try {
        if (typeof (this.renderer as any).compileAsync === 'function') {
          await (this.renderer as any).compileAsync(this.scene, this.camera);
        }
      } catch (e) {
        console.warn('[Engine] Boss shader warm-up compile warning:', e);
      }
    }
    await cooperativeYield(4);

    this.isWorldLoaded = true;

    // Tahap 8: 100% Membuka tirai loading secara halus
    onProgress?.(100, 'Dunia Eldoria Siap! Menyerahkan Kontrol...');
    await cooperativeYield(4);
  }

  public clearCombatState(): void {
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
    this.isAttacking = false;
    this.attackTimer = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.mageUltimateCooldownTimer = 0;
    this.mageGlacialBarrageCooldownTimer = 0;
    this.mageBlinkCooldownTimer = 0;
    this.mageCahayaSuciCooldownTimer = 0;
    this.hunterArrowVolleyCooldownTimer = 0;
    this.hunterMobilityCooldownTimer = 0;
    this.isGaleVaulting = false;
    this.galeVaultTimer = 0;
    this.phantomAmbushReady = false;
    this.phantomAmbushTimer = 0;
    if (this.activeShadowDecoy) {
      this.activeShadowDecoy.active = false;
      this.activeShadowDecoy.group.visible = false;
      this.activeShadowDecoy = null;
    }
    if (this.isHunterSheathed) {
      this.unsheatheHunterWeapon();
    }
    this.hunterAfterimagePool.forEach((item) => {
      item.active = false;
      item.group.visible = false;
      for (const m of item.materials) {
        m.opacity = 0;
      }
    });
    this.hunterAfterimageSpawnTimer = 0;
    if (this.isAimingArrowVolley) {
      this.cancelArrowVolleyAim();
    }
    this.activeScorchedCraters = [];
    this.arcaneShieldTimer = 0;
    this.arcaneShieldHp = 0;
    this.bossManager?.clearDebuffs();
  }

  public getTerrainHeight(x: number, z: number): number {
    return getExactMeshGroundHeight(x, z);
  }

  public setCharacterClass(newClass: CharacterClass) {
    this.charClass = newClass;
    this.rebuildPlayerMesh();
  }

  public applyGraphicsSettings(settings: GraphicsSettings) {
    this.graphicsSettings = settings;

    // 1. Resolution / Pixel ratio scaling (Great for Potato PCs)
    const isMobileOrLowEnd = typeof navigator !== 'undefined' && (
      navigator.hardwareConcurrency <= 4 || /Android|iPhone|iPad/i.test(navigator.userAgent)
    );
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(settings.renderScale * Math.min(dpr, isMobileOrLowEnd ? 1.0 : 1.5));

    // 2. Shadows on/off (halves draw calls on low spec)
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.shadowMap.autoUpdate = false;
    if (settings.shadows) {
      this.renderer.shadowMap.needsUpdate = true;
    }
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
        if (existing.nameTag) {
          existing.meshObj.group.add(existing.nameTag);
        }
        this.scene.add(existing.meshObj.group);
      }
    } else {
      const meshObj = createPlayerMesh(data.charClass, data.tier || 1);
      meshObj.group.position.set(data.x, data.y, data.z);
      meshObj.group.rotation.y = data.rotationY;

      // Lazy on-proximity nameplate: only instantiate when within 35 meters
      let nameTag: THREE.Sprite | undefined = undefined;
      const initialDist = this.playerPos.distanceTo(new THREE.Vector3(data.x, data.y, data.z));
      if (initialDist <= 35) {
        nameTag = this.createNameTagSprite(
          data.name,
          data.level || 1,
          data.charClass,
          data.hp || 120,
          data.maxHp || 120
        );
        meshObj.group.add(nameTag);
      }
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
      if (existing.nameTag) {
        existing.meshObj.group.remove(existing.nameTag);
        if (existing.nameTag.material.map) existing.nameTag.material.map.dispose();
        existing.nameTag.material.dispose();
      }
      this.scene.remove(existing.meshObj.group);
      this.remotePlayers.delete(id);
      this.callbacks.onAddFloatingText(`${existing.data.name} meninggalkan dunia.`, '#94a3b8', 'damage');
    }
  }

  public clearRemotePlayers() {
    this.remotePlayers.forEach((rp) => {
      if (rp.nameTag) {
        rp.meshObj.group.remove(rp.nameTag);
        if (rp.nameTag.material.map) rp.nameTag.material.map.dispose();
        rp.nameTag.material.dispose();
      }
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
        this.spawnShockwaveRing(atkPos, 0xfacc15, 13.5, 0.65);
        this.spawnHitStarburst(atkPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfde047, 3.5);
        this.spawnCataclysmicRockSpikesVfx(atkPos);
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
        this.spawnShockwaveRing(atkPos, 0xfacc15, 13.5, 0.65);
        this.spawnHitStarburst(atkPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfde047, 3.5);
        this.spawnCataclysmicRockSpikesVfx(atkPos);
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

  private async spawnEnemiesAsync(onProgress?: (percent: number, statusText: string) => void): Promise<void> {
    const spawnGroupAsync = async <T>(
      list: T[],
      spawner: (item: T, index: number) => void
    ) => {
      for (let i = 0; i < list.length; i++) {
        spawner(list[i], i);
        if (i % 2 === 1) {
          await cooperativeYield(4);
        }
      }
    };

    onProgress?.(50, 'Menempatkan Populasi Monster & Peti Harta Karun (50%)...');
    await cooperativeYield(4);

    // 1. Meadow Slimes (Lv. 1) - Relocated to Eastern Plains (> 85 units east from Sanctuary)
    await spawnGroupAsync(MEADOW_SLIME_SPAWNS, (sp) => {
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
    await spawnGroupAsync(MAGMA_SLIME_SPAWNS, (sp) => {
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
    await spawnGroupAsync(SKELETON_SENTINEL_SPAWNS, (sp) => {
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
    await spawnGroupAsync(SKELETON_MAGE_SPAWNS, (sp) => {
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
    await spawnGroupAsync(BEACH_GOBLIN_SPAWNS, (sp) => {
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
    await spawnGroupAsync(FOREST_GOLEM_SPAWNS, (sp) => {
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
    await spawnGroupAsync(FOREST_SPIDER_SPAWNS, (sp) => {
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

    // 8. Ancient Obsidian Titan Golem Boss in North Crater Arena (X: -220, Z: -400)
    onProgress?.(48.5, 'Membangkitkan World Boss: Sang Titan Kuno Obsidian (48.5%)...');
    const bossPos: [number, number] = [SPAWN_TITAN.x, SPAWN_TITAN.z];
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
      detectRange: 42,
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
    await cooperativeYield(4);

    // 9. Frostpeak Glacier Frostfang Wolves (Spawned from src/game/monsters.ts)
    await spawnGroupAsync(FROST_WOLF_SPAWNS, (spawn, idx) => {
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
    await spawnGroupAsync(swampPositions, (pos, idx) => {
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
      [180, -250],
      [210, -240],
      [170, -270],
      [200, -285],
    ];
    await spawnGroupAsync(solariaPositions, (pos, idx) => {
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
    await spawnGroupAsync(thunderPositions, (pos, idx) => {
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
    await spawnGroupAsync(jadePositions, (pos, idx) => {
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

    // 14. Kaldera Naga Api: Magma Drakes & Ancient Dragon Titan Guardian (Dragonfang Caldera Archipelago [40, 840])
    const dragonPositions: [number, number][] = [
      [22, 825],  // Pulau Utama (Dekat celah masuk utara)
      [58, 832],  // Pulau Utama (Lereng timur kawah)
      [-75, 875], // Pulau Satelit Barat Daya
      [-65, 775], // Pulau Satelit Barat Laut
    ];
    await spawnGroupAsync(dragonPositions, (pos, idx) => {
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

    // 15. Gurun Solaria: Kalajengking Raksasa & Pasukan Pasir Pharaoh (Eastern Solaria Dunes [420, -320])
    const desertPositions: [number, number][] = [
      [390, -310],
      [420, -325],
      [440, -345],
      [465, -330],
    ];
    await spawnGroupAsync(desertPositions, (pos, idx) => {
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

    // Dragonfang Super Boss: Ignis, Sang Naga Purba (Colossal Winged Dragon: [40, 840] - Pusat Altar Kaldera Naga)
    onProgress?.(48.5, 'Membangkitkan World Boss: Ignis, Sang Naga Purba (48.5%)...');
    const wyrmPos: [number, number] = [40, 840];
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
      detectRange: 48,
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
    await cooperativeYield(4);

    // Solaria Desert Colossal Super Boss: Jarrus, Sang Cacing Purba (Segmented Burrowing Sandworm: [495, -362])
    onProgress?.(48.5, 'Membangkitkan World Boss: Jarrus, Sang Cacing Purba (48.5%)...');
    const wormY = this.world.getTerrainHeight(SPAWN_SANDWORM.x, SPAWN_SANDWORM.z);
    const { group: wormGroup, parts: wormParts } = createEnemyMesh('worm');
    wormGroup.position.set(SPAWN_SANDWORM.x, wormY, SPAWN_SANDWORM.z);
    this.scene.add(wormGroup);

    const wormData: EnemyData = {
      id: 'boss_jarrus',
      name: 'Jarrus, The Ancient Sandworm',
      nameId: 'Jarrus, Sang Cacing Purba Solaria',
      type: 'boss',
      level: 10,
      hp: 1450,
      maxHp: 1450,
      attack: 48,
      defense: 22,
      expReward: 1650,
      goldReward: 1200,
      speed: 2.8,
      attackRange: 6.5,
      detectRange: SPAWN_SANDWORM.leashRadius,
      position: [SPAWN_SANDWORM.x, wormY, SPAWN_SANDWORM.z],
      isDead: false,
      dropItems: [
        { item: CHEST_LOOT_POOL[0], chance: 1.0 },
        { item: CHEST_LOOT_POOL[2], chance: 1.0 },
        { item: CHEST_LOOT_POOL[4], chance: 1.0 },
      ],
    };

    this.enemies.push({
      data: wormData,
      mesh: wormGroup,
      parts: wormParts,
      baseY: wormY,
      attackCooldown: 0,
      walkCycle: 0,
      spawnPos: new THREE.Vector3(SPAWN_SANDWORM.homeX, wormY, SPAWN_SANDWORM.homeZ),
      leashRadius: SPAWN_SANDWORM.leashRadius,
      isReturning: false,
      deathTimer: 0,
    });
    await cooperativeYield(4);

    // 18. Beast Lair (Zone C: X -170..-230, Z 70..130) - Serigala & monster buas level 2-4
    await spawnGroupAsync(BEAST_LAIR_SPAWNS, (sp) => {
      const { group, parts } = createEnemyMesh(sp.type);
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
        attackRange: 2.2,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[2], chance: 0.35 },
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
        spawnPos: new THREE.Vector3(sp.pos[0], ey, sp.pos[1]),
        leashRadius: 22,
        isReturning: false,
        deathTimer: 0,
      });
    });

    // 19. Enemy Outpost (Zone A: X -220..-280, Z -10..-60) - Pasukan bandit bersenjata level 3-5
    await spawnGroupAsync(BANDIT_OUTPOST_SPAWNS, (sp) => {
      const { group, parts } = createEnemyMesh(sp.type);
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
        speed: 3.2,
        attackRange: 2.4,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[0], chance: 0.45 },
          { item: CHEST_LOOT_POOL[1], chance: 0.3 },
          { item: CHEST_LOOT_POOL[4], chance: 0.4 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
        spawnPos: new THREE.Vector3(sp.pos[0], ey, sp.pos[1]),
        leashRadius: 24,
        isReturning: false,
        deathTimer: 0,
      });
    });

    // 20. Sabana & Lereng Bukit Padang Rumput (Zone B: X -290..-350, Z 80..150) - Serigala Liar & Boar Level 2-3
    await spawnGroupAsync(SAVANNA_HILL_SPAWNS, (sp) => {
      const { group, parts } = createEnemyMesh(sp.type);
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
        speed: 3.4,
        attackRange: 2.2,
        detectRange: sp.aggroRange,
        position: [sp.pos[0], ey, sp.pos[1]],
        isDead: false,
        dropItems: [
          { item: CHEST_LOOT_POOL[0], chance: 0.4 },
          { item: CHEST_LOOT_POOL[1], chance: 0.25 },
        ],
      };

      this.enemies.push({
        data: enemyData,
        mesh: group,
        parts,
        baseY: ey,
        attackCooldown: 0,
        walkCycle: Math.random() * 10,
        spawnPos: new THREE.Vector3(sp.pos[0], ey, sp.pos[1]),
        leashRadius: 24,
        isReturning: false,
        deathTimer: 0,
      });
    });

    // 21. Wilayah Pesisir Barat & Tebing Pantai (Zone C: X -400..-450, Z -50..-240) - Kepiting Pantai & Hewan Pesisir Level 1-3
    await spawnGroupAsync(COASTAL_BEACH_SPAWNS, (sp) => {
      const { group, parts } = createEnemyMesh(sp.type);
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
          { item: CHEST_LOOT_POOL[0], chance: 0.35 },
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
        spawnPos: new THREE.Vector3(sp.pos[0], ey, sp.pos[1]),
        leashRadius: 22,
        isReturning: false,
        deathTimer: 0,
      });
    });

    // 22. Cekungan Monster Liar Padang Rumput Utara (Zone G: X -80..-110, Z -50..-80) - Serigala Belantara Level 3-4 (> 190 unit dari desa)
    await spawnGroupAsync(PLAINS_WOLF_SPAWNS, (sp) => {
      const { group, parts } = createEnemyMesh(sp.type);
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
          { item: CHEST_LOOT_POOL[0], chance: 0.4 },
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
        spawnPos: new THREE.Vector3(sp.pos[0], ey, sp.pos[1]),
        leashRadius: 22,
        isReturning: false,
        deathTimer: 0,
      });
    });

    // Initialize territory origin points and leash parameters for all monsters
    this.enemies.forEach((e) => {
      if (!e.spawnPos) {
        e.spawnPos = e.mesh.position.clone();
      }
      e.isReturning = false;
      e.deathTimer = 0;
      e.leashRadius = e.data.id === 'boss_dragonfang' ? 48 : (e.data.id === 'boss_titan' ? 42 : (e.data.id === 'boss_jarrus' ? 48 : (e.data.type === 'boss' ? 38 : 22)));
    });
    await cooperativeYield(4);
  }

  private spawnEnemies(): void {
    void this.spawnEnemiesAsync();
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
    } catch { }
    soundManager.playCheckpointUnlock();
    this.callbacks.onAddFloatingText(`🌟 Wilayah Terbuka: ${cp.nameId}!`, '#00e5ff', 'crit');
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

    // Character Selection 360° Drag & Touch Pointer listeners
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    window.addEventListener('pointerdown', this.handlePointerDown);

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

  private handleContextMenu = (e: MouseEvent) => {
    if (this.isAimGlacialActive) {
      e.preventDefault();
      this.cancelGlacialAim();
      return;
    }
    if (this.isAimingArrowVolley) {
      e.preventDefault();
      this.cancelArrowVolleyAim();
      return;
    }
    if (this.isAimingBow || this.isHoldingBowAttack) {
      e.preventDefault();
      this.cancelBowAim();
      return;
    }
    // If context menu opens, release all keys immediately so player does not walk by itself
    this.resetKeys();
  };

  private handleBlur = () => {
    if (this.isAimGlacialActive) {
      this.cancelGlacialAim();
    }
    if (this.isAimingArrowVolley) {
      this.cancelArrowVolleyAim();
    }
    if (this.isAimingBow || this.isHoldingBowAttack) {
      this.cancelBowAim();
    }
    this.resetKeys();
  };

  private handleFocus = () => {
    // Regaining focus: flush keys in case keyup was missed while out of focus
    this.resetKeys();
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      if (this.isAimGlacialActive) {
        this.cancelGlacialAim();
      }
      if (this.isAimingArrowVolley) {
        this.cancelArrowVolleyAim();
      }
      if (this.isAimingBow || this.isHoldingBowAttack) {
        this.cancelBowAim();
      }
      this.resetKeys();
    }
  };

  public resetKeys() {
    this.keys = {};
    this.joystickVector = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.playerVel.x = 0;
    this.playerVel.z = 0;
    if (this.isChargingAttack) {
      this.isChargingAttack = false;
      this.chargeTimer = 0;
      if (this.playerMesh) resetKnightBladeGlow(this.playerMesh);
    }
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
      if (this.camera?.position && !isNaN(this.camera.position.x)) {
        this.spectatorPos.copy(this.camera.position);
      } else {
        this.spectatorPos.set(this.playerPos.x, this.playerPos.y + 3.0, this.playerPos.z + 5.0);
      }
      this.spectatorYaw = !isNaN(this.cameraAngleH) ? this.cameraAngleH : 0;
      this.spectatorPitch = !isNaN(this.cameraAngleV) ? -this.cameraAngleV : 0;
      if (this.playerMesh?.group) {
        this.playerMesh.group.visible = false;
      }

      this.callbacks.onAddFloatingText(
        'Mode Spektator Aktif (WASD / Space / Shift / Scroll Speed)',
        '#38bdf8',
        'info'
      );
    } else {
      if (landAtCamera) {
        this.playerPos.x = this.spectatorPos.x;
        this.playerPos.z = this.spectatorPos.z;
        this.playerPos.y = getExactMeshGroundHeight(this.spectatorPos.x, this.spectatorPos.z);
        this.playerVel.set(0, 0, 0);
        this.isGrounded = true;
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

    if (!this.isSpectatorMode && this.isWorldEditorActive) {
      this.toggleWorldEditor(false);
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

    // Clamp spectator camera to calibrated world scale (1200 x 950)
    this.spectatorPos.x = Math.max(-600, Math.min(600, this.spectatorPos.x));
    this.spectatorPos.z = Math.max(-600, Math.min(350, this.spectatorPos.z));
    this.spectatorPos.y = Math.max(-5, Math.min(300, this.spectatorPos.y));

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

    if (key === 'escape' || code === 'escape') {
      if (this.isAimGlacialActive) {
        this.cancelGlacialAim();
        return;
      }
      if (this.isAimingArrowVolley) {
        this.cancelArrowVolleyAim();
        return;
      }
      if (this.isAimingBow || this.isHoldingBowAttack) {
        this.cancelBowAim();
        return;
      }
    }

    if (key === 'f' || code === 'keyf') {
      const didInteract = this.checkInteract();
      if (!didInteract) {
        if (this.charClass === 'mage') {
          // Mage: Tombol [F] (Slot 4 - ULTIMATE): Celestial Apocalypse / Starfall Ultimate
          this.startStarfallCasting();
        } else if (this.charClass === 'rogue') {
          // Rogue: Tombol [F] (Slot 4 - ULTIMATE placeholder)
          this.unsheatheHunterWeapon();
          this.castSkill(4);
        } else {
          // Knight: Cataclysmic Leap Slam
          this.castSkill(2);
        }
      }
    } else if (key === 'j' || code === 'keyj') {
      if (!this.isChargingAttack && !this.isHoldingBowAttack) {
        if (this.charClass === 'rogue') {
          this.unsheatheHunterWeapon();
        }
        this.startBasicAttack();
      }
    } else if (key === ' ' || code === 'space') {
      this.jump();
    } else if (key === 'c' || code === 'keyc') {
      // Tombol [C] khusus Character Status modal (Dash dihilangkan dari C)
    } else if (key === 'q' || code === 'keyq') {
      // Slot 1 (Q): Mage Glacial Crystal Barrage / Hunter Bow Skyward Arrow Volley / Warrior Triple Crescent / Rogue 1000 Belati
      if (this.charClass === 'rogue') {
        this.unsheatheHunterWeapon();
      }
      if (this.charClass === 'mage') {
        if (!e.repeat) {
          this.isHoldingGlacialKey = true;
          this.glacialKeyDownTime = performance.now();
          if (this.glacialAimTimer) {
            clearTimeout(this.glacialAimTimer);
          }
          this.glacialAimTimer = window.setTimeout(() => {
            if (this.isHoldingGlacialKey && !this.isAimGlacialActive) {
              this.startAimGlacialBarrage();
            }
          }, 180);
        }
      } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        if (!e.repeat) {
          this.isHoldingArrowVolleyKey = true;
          this.arrowVolleyKeyDownTime = performance.now();
          if (this.arrowVolleyAimTimer) {
            clearTimeout(this.arrowVolleyAimTimer);
          }
          this.arrowVolleyAimTimer = window.setTimeout(() => {
            if (this.isHoldingArrowVolleyKey && !this.isAimingArrowVolley) {
              this.startAimArrowVolley();
            }
          }, 180);
        }
      } else {
        this.castSkill(1);
      }
    } else if (key === 'e' || code === 'keye') {
      // Slot 2 (E):
      // Mage Slot 2 (E): Arcane Blink [E] (Teleportasi instan menembus musuh dengan iFrame 0.2s)
      // Rogue: Skill 2 Mobilitas Khusus Pemburu (Gale Vault / Phantom Decoy Step)
      // Warrior: Dash [E]
      if (this.charClass === 'rogue') {
        this.unsheatheHunterWeapon();
      }
      if (this.charClass === 'mage') {
        this.castArcaneBlink();
      } else if (this.charClass === 'rogue') {
        this.castSkill(2);
      } else {
        this.performDash();
      }
    } else if (key === 'shift' || code === 'shiftleft' || code === 'shiftright') {
      // Tombol [Shift] (Sprint / Terbang Cepat):
      // HAPUS pemanggilan performDash() dari tombol Shift!
      // Saat tombol Shift ditahan sambil bergerak, mode Lari Cepat (Sprint) aktif di updateMovement()
    } else if (key === 'r' || code === 'keyr') {
      // Slot 3 (R):
      // Mage Slot 3 (R): Cahaya Suci / Sanctuary [R] (Heal, Cleanse, Overheal Shield, & +30 MP)
      // Knight: Aegis Retribution [R] / Rogue: Bom Asap [R]
      if (this.charClass === 'rogue') {
        this.unsheatheHunterWeapon();
      }
      if (this.charClass === 'mage') {
        this.castCahayaSuci();
      } else {
        this.castSkill(3);
      }
    } else if (key === 'x' || code === 'keyx' || key === 't' || code === 'keyt') {
      this.switchHunterWeapon();
    }
  };

  public switchHunterWeapon(targetMode?: 'dagger' | 'bow') {
    if (this.charClass !== 'rogue') return;
    this.unsheatheHunterWeapon();
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

    if (key === 'j' || code === 'keyj') {
      this.releaseBasicAttack();
    }
    if (key === 'q' || code === 'keyq') {
      if (this.charClass === 'mage') {
        const pressDuration = performance.now() - this.glacialKeyDownTime;
        if (this.glacialAimTimer) {
          clearTimeout(this.glacialAimTimer);
          this.glacialAimTimer = null;
        }
        this.isHoldingGlacialKey = false;
        this.executeGlacialCrystalBarrage();
      } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        const pressDuration = performance.now() - this.arrowVolleyKeyDownTime;
        if (this.arrowVolleyAimTimer) {
          clearTimeout(this.arrowVolleyAimTimer);
          this.arrowVolleyAimTimer = null;
        }
        this.isHoldingArrowVolleyKey = false;
        if (this.isAimingArrowVolley) {
          this.fireArrowVolley();
        } else if (pressDuration < 180) {
          this.quickCastArrowVolley();
        }
      }
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

  private handlePointerDown = (e: PointerEvent) => {
    if (this.menuMode !== 'character_select') return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'BUTTON' || target.closest('button'))) return;

    if (e.button === 0 || e.pointerType === 'touch') {
      this.isDraggingPreview = true;
      this.prevPreviewMouseX = e.clientX;

      // Detect if clicked directly on one of the character columns in the viewport
      const normalizedX = e.clientX / window.innerWidth;
      if (normalizedX < 0.38) {
        this.setSelectedPreviewRole('warrior');
        this.callbacks.onPreviewRoleSelected?.('warrior');
      } else if (normalizedX > 0.62) {
        this.setSelectedPreviewRole('rogue');
        this.callbacks.onPreviewRoleSelected?.('rogue');
      } else {
        this.setSelectedPreviewRole('mage');
        this.callbacks.onPreviewRoleSelected?.('mage');
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.menuMode !== 'character_select') return;
    if (!this.isDraggingPreview) return;

    const deltaX = e.clientX - this.prevPreviewMouseX;
    this.prevPreviewMouseX = e.clientX;

    const activeMesh =
      this.selectedPreviewRole === 'warrior'
        ? this.knightPreview
        : this.selectedPreviewRole === 'mage'
          ? this.magePreview
          : this.assassinPreview;
    if (activeMesh?.group) {
      activeMesh.group.rotation.y += deltaX * 0.015;
    }
  };

  private handlePointerUp = () => {
    if (this.menuMode === 'character_select') {
      this.isDraggingPreview = false;
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.menuMode === 'character_select') {
      return;
    }

    if (this.isControlsLocked || this.menuMode !== 'gameplay') return;

    if (e.button === 2) {
      if (this.isAimGlacialActive) {
        e.preventDefault();
        this.cancelGlacialAim();
        return;
      }
      if (this.isAimingArrowVolley) {
        e.preventDefault();
        this.cancelArrowVolleyAim();
        return;
      }
      if (this.isAimingBow || this.isHoldingBowAttack) {
        e.preventDefault();
        this.cancelBowAim();
        return;
      }
    }

    this.isMouseDown = true;
    this.isDraggingCamera = false;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    if (e.button === 0 && !this.isSpectatorMode) {
      if (this.charClass === 'mage' && this.isAimGlacialActive) {
        this.executeGlacialCrystalBarrage();
        return;
      }
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' && this.isAimingArrowVolley) {
        this.fireArrowVolley();
        return;
      }
      this.startBasicAttack();
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.menuMode === 'character_select') {
      if (this.isDraggingPreview) {
        const deltaX = e.clientX - this.prevPreviewMouseX;
        this.prevPreviewMouseX = e.clientX;
        const activeMesh = this.selectedPreviewRole === 'warrior'
          ? this.knightPreview
          : this.selectedPreviewRole === 'mage'
            ? this.magePreview
            : this.assassinPreview;
        if (activeMesh?.group) {
          activeMesh.group.rotation.y += deltaX * 0.015;
        }
      }
      return;
    }

    if (this.menuMode !== 'gameplay') return;

    // Freely control aiming yaw & pitch while holding Q (Glacial Barrage / Arrow Volley) or aiming Bow
    if (this.isAimGlacialActive || this.isAimingBow || this.isAimingArrowVolley) {
      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.cameraAngleH = normalizeCameraYaw(
        this.cameraAngleH - deltaX * CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_H
      );
      this.cameraAngleV = THREE.MathUtils.clamp(
        this.cameraAngleV + deltaY * CAMERA_CONFIG.MOUSE_LOOK_SENSITIVITY_V,
        -0.45,
        0.65
      );
      return;
    }

    if (!this.isMouseDown) return;
    const deltaX = e.clientX - this.prevMouseX;
    const deltaY = e.clientY - this.prevMouseY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      this.isDraggingCamera = true;
      if (this.isChargingAttack) {
        this.isChargingAttack = false;
        this.chargeTimer = 0;
        if (this.playerMesh) resetKnightBladeGlow(this.playerMesh);
      }
    }

    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    if (this.isSpectatorMode) {
      if (this.isDraggingGizmo) return;
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
    if (this.menuMode === 'character_select') {
      this.isDraggingPreview = false;
      return;
    }

    if (this.isSpectatorMode) {
      this.isMouseDown = false;
      this.isDraggingCamera = false;
      return;
    }
    if (this.isMouseDown && !this.isDraggingCamera && e.button === 0) {
      this.releaseBasicAttack();
    } else if (this.isChargingAttack) {
      this.isChargingAttack = false;
      this.chargeTimer = 0;
      if (this.playerMesh) resetKnightBladeGlow(this.playerMesh);
    } else if (this.isHoldingBowAttack) {
      this.releaseBasicAttack();
    }
    this.isMouseDown = false;
    this.isDraggingCamera = false;
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.menuMode !== 'gameplay') return;
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

  public setHudHidden(hidden: boolean) {
    this.isHudHidden = hidden;
  }

  /**
   * ============================================================================
   * IN-GAME VISUAL WORLD EDITOR (DEV MODE ONLY)
   * Integrasi TransformControls Three.js & Live Save ke worldLayoutConfig.ts
   * ============================================================================
   */
  public initWorldEditor() {
    if (!import.meta.env.DEV) return;
    if (this.transformControls) return;

    try {
      const tc = new TransformControls(this.camera, this.renderer.domElement);
      (tc as any).size = 1.0;
      const helper = tc.getHelper();
      helper.visible = false;
      this.scene.add(helper);
      this.transformControls = tc;
      this.transformHelper = helper;

      tc.addEventListener('dragging-changed', (event: any) => {
        this.isDraggingGizmo = !!event.value;
      });

      tc.addEventListener('change', () => {
        if (!this.activeEditorTargetId) return;
        const targetObj = this.editorAnchors.get(this.activeEditorTargetId);
        if (!targetObj) return;

        const x = Number(targetObj.position.x.toFixed(2));
        const y = Number(targetObj.position.y.toFixed(2));
        const z = Number(targetObj.position.z.toFixed(2));
        const rotationY = Number(targetObj.rotation.y.toFixed(4));
        const scale = Number(targetObj.scale.x.toFixed(2));

        if (WORLD_LAYOUT_CONFIG.landmarks[this.activeEditorTargetId]) {
          const lm = WORLD_LAYOUT_CONFIG.landmarks[this.activeEditorTargetId];
          lm.x = x;
          lm.y = y;
          lm.z = z;
          lm.rotationY = rotationY;
          lm.scale = scale;
        } else if (WORLD_LAYOUT_CONFIG.bridges[this.activeEditorTargetId]) {
          const br = WORLD_LAYOUT_CONFIG.bridges[this.activeEditorTargetId];
          br.x = x;
          br.y = y;
          br.z = z;
          br.rotationY = rotationY;
          br.scale = scale;
        }

        if (this.onWorldEditorTransformChange) {
          this.onWorldEditorTransformChange(this.activeEditorTargetId, {
            x,
            y,
            z,
            rotationY,
            scale,
          });
        }
      });

      this.refreshWorldEditorAnchors();
    } catch (err) {
      console.warn('[WorldEditor] Gagal inisialisasi TransformControls:', err);
    }
  }

  public refreshWorldEditorAnchors() {
    if (!import.meta.env.DEV) return;

    // 1. Anchors untuk seluruh Landmark
    for (const [id, lm] of Object.entries(WORLD_LAYOUT_CONFIG.landmarks)) {
      let anchor = this.editorAnchors.get(id);
      if (!anchor) {
        anchor = new THREE.Group();
        anchor.name = `editor_anchor_${id}`;

        const markerGeo = new THREE.OctahedronGeometry(1.6, 0);
        const markerMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0891b2,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          metalness: 0.2,
          transparent: true,
          opacity: 0.85,
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.y = 4.0;
        marker.name = 'editor_marker';
        anchor.add(marker);

        this.scene.add(anchor);
        this.editorAnchors.set(id, anchor);
      }
      anchor.position.set(lm.x, lm.y, lm.z);
      anchor.rotation.y = lm.rotationY;
      anchor.scale.setScalar(lm.scale || 1.0);
      anchor.visible = this.isWorldEditorActive;
    }

    // 2. Anchors untuk seluruh Jembatan
    for (const [id, br] of Object.entries(WORLD_LAYOUT_CONFIG.bridges)) {
      let anchor = this.editorAnchors.get(id);
      if (!anchor) {
        anchor = new THREE.Group();
        anchor.name = `editor_anchor_${id}`;

        const markerGeo = new THREE.OctahedronGeometry(1.2, 0);
        const markerMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          metalness: 0.2,
          transparent: true,
          opacity: 0.85,
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.y = 3.0;
        marker.name = 'editor_marker';
        anchor.add(marker);

        this.scene.add(anchor);
        this.editorAnchors.set(id, anchor);
      }
      anchor.position.set(br.x, br.y, br.z);
      anchor.rotation.y = br.rotationY;
      anchor.scale.setScalar(br.scale || 1.0);
      anchor.visible = this.isWorldEditorActive;
    }
  }

  public toggleWorldEditor(active?: boolean): boolean {
    if (!import.meta.env.DEV) return false;
    const next = active !== undefined ? active : !this.isWorldEditorActive;
    this.isWorldEditorActive = next;

    for (const anchor of this.editorAnchors.values()) {
      anchor.visible = next;
    }

    if (next) {
      if (!this.activeEditorTargetId) {
        this.selectEditorTarget('village');
      } else {
        this.selectEditorTarget(this.activeEditorTargetId);
      }
    } else {
      if (this.transformControls) {
        this.transformControls.detach();
      }
      if (this.transformHelper) {
        this.transformHelper.visible = false;
      }
    }

    return this.isWorldEditorActive;
  }

  public selectEditorTarget(id: string): void {
    if (!import.meta.env.DEV) return;
    this.activeEditorTargetId = id;
    const anchor = this.editorAnchors.get(id);
    if (anchor && this.transformControls && this.transformHelper) {
      this.transformControls.attach(anchor);
      this.transformControls.setMode(this.editorGizmoMode);
      this.transformHelper.visible = this.isWorldEditorActive;
    }
  }

  public setEditorGizmoMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.editorGizmoMode = mode;
    if (this.transformControls) {
      this.transformControls.setMode(mode);
    }
  }

  public getEditorGizmoMode(): 'translate' | 'rotate' | 'scale' {
    return this.editorGizmoMode;
  }

  public getEditorTargetTransform(id: string) {
    const anchor = this.editorAnchors.get(id);
    if (!anchor) return null;
    return {
      x: Number(anchor.position.x.toFixed(2)),
      y: Number(anchor.position.y.toFixed(2)),
      z: Number(anchor.position.z.toFixed(2)),
      rotationY: Number(anchor.rotation.y.toFixed(4)),
      scale: Number(anchor.scale.x.toFixed(2)),
    };
  }

  public updateEditorTargetTransform(
    id: string,
    update: {
      x?: number;
      y?: number;
      z?: number;
      rotationY?: number;
      scale?: number;
      flattenRadius?: number;
    }
  ): void {
    const anchor = this.editorAnchors.get(id);
    if (anchor) {
      if (update.x !== undefined) anchor.position.x = update.x;
      if (update.y !== undefined) anchor.position.y = update.y;
      if (update.z !== undefined) anchor.position.z = update.z;
      if (update.rotationY !== undefined) anchor.rotation.y = update.rotationY;
      if (update.scale !== undefined) anchor.scale.setScalar(update.scale);
    }
    if (WORLD_LAYOUT_CONFIG.landmarks[id]) {
      const lm = WORLD_LAYOUT_CONFIG.landmarks[id];
      if (update.x !== undefined) lm.x = update.x;
      if (update.y !== undefined) lm.y = update.y;
      if (update.z !== undefined) lm.z = update.z;
      if (update.rotationY !== undefined) lm.rotationY = update.rotationY;
      if (update.scale !== undefined) lm.scale = update.scale;
      if (update.flattenRadius !== undefined) lm.flattenRadius = update.flattenRadius;
    } else if (WORLD_LAYOUT_CONFIG.bridges[id]) {
      const br = WORLD_LAYOUT_CONFIG.bridges[id];
      if (update.x !== undefined) br.x = update.x;
      if (update.y !== undefined) br.y = update.y;
      if (update.z !== undefined) br.z = update.z;
      if (update.rotationY !== undefined) br.rotationY = update.rotationY;
      if (update.scale !== undefined) br.scale = update.scale;
    }
  }

  public focusCameraOnTarget(id: string): void {
    const anchor = this.editorAnchors.get(id);
    if (!anchor) return;
    const targetX = anchor.position.x;
    const targetY = anchor.position.y;
    const targetZ = anchor.position.z;

    if (this.isSpectatorMode) {
      this.spectatorPos.set(targetX, targetY + 16, targetZ + 26);
      this.camera.position.copy(this.spectatorPos);
      this.spectatorYaw = 0;
      this.spectatorPitch = -0.52;
      this.camera.rotation.set(this.spectatorPitch, this.spectatorYaw, 0, 'YXZ');
    } else {
      this.camera.position.set(targetX, targetY + 16, targetZ + 26);
      this.camera.lookAt(targetX, targetY + 2, targetZ);
    }
    this.callbacks.onAddFloatingText(`Fokus Editor: ${id}`, '#38bdf8', 'info');
  }

  public async saveWorldLayoutToFile(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/__api/save-world-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: WORLD_LAYOUT_CONFIG }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
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
      ? 'Lantai 3: Anjungan Puncak Observatorium 🌌'
      : targetFloor === 2
        ? 'Lantai 2: Laboratorium Alkimia & Kristal Petir 🧪'
        : 'Lantai 1: Perpustakaan Kitab Kuno & Altar 📜';
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
    if (this.menuMode === 'character_select') {
      if (e.touches.length > 0) {
        this.isDraggingPreview = true;
        this.prevPreviewMouseX = e.touches[0].clientX;
        const normalizedX = e.touches[0].clientX / window.innerWidth;
        if (normalizedX < 0.38) {
          this.setSelectedPreviewRole('warrior');
          this.callbacks.onPreviewRoleSelected?.('warrior');
        } else if (normalizedX > 0.62) {
          this.setSelectedPreviewRole('rogue');
          this.callbacks.onPreviewRoleSelected?.('rogue');
        } else {
          this.setSelectedPreviewRole('mage');
          this.callbacks.onPreviewRoleSelected?.('mage');
        }
      }
      return;
    }

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
    if (this.menuMode === 'character_select') {
      if (this.isDraggingPreview && e.touches.length > 0) {
        const deltaX = e.touches[0].clientX - this.prevPreviewMouseX;
        this.prevPreviewMouseX = e.touches[0].clientX;
        const activeMesh = this.selectedPreviewRole === 'warrior'
          ? this.knightPreview
          : this.selectedPreviewRole === 'mage'
            ? this.magePreview
            : this.assassinPreview;
        if (activeMesh?.group) {
          activeMesh.group.rotation.y += deltaX * 0.015;
        }
      }
      return;
    }

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
    if (this.menuMode === 'character_select') {
      this.isDraggingPreview = false;
      return;
    }

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
    if (this.menuMode === 'character_select') {
      const activeMesh = this.selectedPreviewRole === 'warrior'
        ? this.knightPreview
        : this.selectedPreviewRole === 'mage'
          ? this.magePreview
          : this.assassinPreview;
      if (activeMesh?.group) {
        activeMesh.group.rotation.y += deltaX * 0.015;
      }
      return;
    }
    if (this.isSpectatorMode) {
      if (this.isDraggingGizmo) return;
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
  public triggerCameraShake(intensity = 0.2, duration?: number) {
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
          } catch { }
        }
      }
    }
    this.scene.add(object);
    this.activeVfx.push({ object, update, cleanup, isPriority });
  }

  // ============================================================================
  // ZERO-ALLOCATION COMBAT VFX OBJECT POOLS (Sparks, Starbursts, Shockwaves)
  // ============================================================================
  private initSparksPool() {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 });
    this.sparkInstancedMesh = new THREE.InstancedMesh(geo, mat, this.SPARK_MAX_COUNT);
    this.sparkInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparkInstancedMesh.frustumCulled = false;

    this.sparkDummy.position.set(0, -999, 0);
    this.sparkDummy.scale.set(0, 0, 0);
    this.sparkDummy.updateMatrix();

    for (let i = 0; i < this.SPARK_MAX_COUNT; i++) {
      this.sparkInstancedMesh.setMatrixAt(i, this.sparkDummy.matrix);
      this.sparkInstancedMesh.setColorAt(i, new THREE.Color(0xffffff));
      this.sparkPool.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.35,
        gravityScale: 1.0,
        color: new THREE.Color(0xffffff),
      });
    }
    this.sparkInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkInstancedMesh.instanceColor) {
      this.sparkInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.sparkInstancedMesh);
  }

  private updateSparks(delta: number) {
    let hasActive = false;
    for (let i = 0; i < this.SPARK_MAX_COUNT; i++) {
      const p = this.sparkPool[i];
      if (!p.active) continue;
      hasActive = true;
      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        this.sparkDummy.position.set(0, -999, 0);
        this.sparkDummy.scale.set(0, 0, 0);
        this.sparkDummy.updateMatrix();
        this.sparkInstancedMesh.setMatrixAt(i, this.sparkDummy.matrix);
        continue;
      }

      p.vy -= (p.gravityScale ?? 1.0) * 12 * delta; // Gravity with scale
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      const progress = p.life / p.maxLife;
      const scale = progress * 1.1;
      this.sparkDummy.position.set(p.x, p.y, p.z);
      this.sparkDummy.scale.set(scale, scale, scale);
      this.sparkDummy.rotation.x += delta * 6;
      this.sparkDummy.rotation.y += delta * 6;
      this.sparkDummy.updateMatrix();
      this.sparkInstancedMesh.setMatrixAt(i, this.sparkDummy.matrix);
    }

    if (hasActive) {
      this.sparkInstancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private initCombatVfxPools() {
    // 1. Shockwave Rings Pool (8 pre-allocated meshes)
    for (let i = 0; i < 8; i++) {
      const geom = new THREE.RingGeometry(0.3, 0.65, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geom, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.scene.add(ring);
      this.shockwavePool.push({
        mesh: ring,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.4,
        maxRadius: 4.5,
      });
    }

    // 2. Starburst Cross Pool (8 pre-allocated groups)
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const beamV = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.4), mat);
      const beamH = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.12), mat);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      group.add(beamV, beamH, core);
      group.visible = false;
      this.scene.add(group);
      this.starburstPool.push({
        group,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.2,
        scale: 1.0,
      });
    }
  }

  private updateCombatVfxPools(delta: number) {
    // Update active shockwaves
    for (let i = 0; i < this.shockwavePool.length; i++) {
      const item = this.shockwavePool[i];
      if (!item.active) continue;
      item.elapsed += delta;
      if (item.elapsed >= item.duration) {
        item.active = false;
        item.mesh.visible = false;
        continue;
      }
      const progress = item.elapsed / item.duration;
      const s = 1 + progress * (item.maxRadius / 0.65);
      item.mesh.scale.set(s, s, s);
      item.mat.opacity = (1 - progress) * 0.9;
    }

    // Update active starbursts
    for (let i = 0; i < this.starburstPool.length; i++) {
      const item = this.starburstPool[i];
      if (!item.active) continue;
      item.elapsed += delta;
      if (item.elapsed >= item.duration) {
        item.active = false;
        item.group.visible = false;
        continue;
      }
      const progress = item.elapsed / item.duration;
      const s = (0.5 + progress * 0.85) * item.scale;
      item.group.scale.set(s, s, s);
      item.mat.opacity = (1 - progress) * 0.95;
      item.group.quaternion.copy(this.camera.quaternion);
    }
  }

  // Pre-allocated Zero-Allocation Radiant 4-pointed Starburst Cross
  private spawnHitStarburst(position: THREE.Vector3, color: number, scale = 1.0) {
    const item = this.starburstPool[this.starburstNextIndex];
    this.starburstNextIndex = (this.starburstNextIndex + 1) % this.starburstPool.length;
    item.group.position.copy(position);
    item.group.quaternion.copy(this.camera.quaternion);
    item.group.scale.set(0.5 * scale, 0.5 * scale, 0.5 * scale);
    item.mat.color.setHex(color);
    item.mat.opacity = 0.95;
    item.scale = scale;
    item.elapsed = 0;
    item.duration = 0.2;
    item.active = true;
    item.group.visible = true;
  }

  // ============================================================================
  // ZERO-FREEZE OBJECT POOLING & GPU WARM-UP KHUSUS PANAH PEMBURU (HUNTER ARROW POOL)
  // ============================================================================
  private initHunterArrowPool() {
    if (this.hunterArrowPool.length > 0 || !this.scene) return;

    // Shared Geometries & Materials (Zero dynamic runtime allocations!)
    const shaftGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.95, 5);
    const tipGeom = new THREE.ConeGeometry(0.05, 0.2, 4);
    const fletch1Geom = new THREE.BoxGeometry(0.08, 0.16, 0.01);
    const fletch2Geom = new THREE.BoxGeometry(0.01, 0.16, 0.08);
    const normalTrailGeom = new THREE.CylinderGeometry(0.04, 0.01, 1.2, 8);
    // Ekor angin Wind-Piercer Full Charge yang lebih panjang dan tebal
    const piercingTrailGeom = new THREE.CylinderGeometry(0.14, 0.02, 2.8, 8);
    const vortexRingOuterGeom = new THREE.RingGeometry(0.08, 0.28, 16);
    const vortexRingInnerGeom = new THREE.RingGeometry(0.04, 0.14, 12);
    const vortexFlareGeom = new THREE.PlaneGeometry(0.42, 0.05);

    this.hunterArrowPoolGeometries.push(
      shaftGeom,
      tipGeom,
      fletch1Geom,
      fletch2Geom,
      normalTrailGeom,
      piercingTrailGeom,
      vortexRingOuterGeom,
      vortexRingInnerGeom,
      vortexFlareGeom
    );

    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.85, roughness: 0.2 });
    const fletchMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const normalTrailMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.8 });
    const piercingTrailMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 });
    const piercingVortexOuterMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const piercingVortexInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    this.hunterArrowPoolMaterials.push(
      shaftMat,
      tipMat,
      fletchMat,
      normalTrailMat,
      piercingTrailMat,
      piercingVortexOuterMat,
      piercingVortexInnerMat
    );

    for (let i = 0; i < 24; i++) {
      const arrow = new THREE.Group();
      arrow.name = `PooledHunterArrow_${i}`;
      arrow.visible = false;
      arrow.frustumCulled = false;

      const shaft = new THREE.Mesh(shaftGeom, shaftMat);
      shaft.rotation.x = Math.PI / 2;
      arrow.add(shaft);

      const tip = new THREE.Mesh(tipGeom, tipMat);
      tip.position.set(0, 0, 0.52);
      tip.rotation.x = Math.PI / 2;
      arrow.add(tip);

      const f1 = new THREE.Mesh(fletch1Geom, fletchMat);
      f1.position.set(0, 0, -0.36);
      const f2 = new THREE.Mesh(fletch2Geom, fletchMat);
      f2.position.set(0, 0, -0.36);
      arrow.add(f1, f2);

      // Normal trail
      const normalTrail = new THREE.Mesh(normalTrailGeom, normalTrailMat);
      normalTrail.rotation.x = Math.PI / 2;
      normalTrail.position.z = -0.6;
      normalTrail.visible = false;
      arrow.add(normalTrail);

      // Full-charge piercing wind trail
      const piercingTrail = new THREE.Mesh(piercingTrailGeom, piercingTrailMat);
      piercingTrail.rotation.x = Math.PI / 2;
      piercingTrail.position.z = -1.4;
      piercingTrail.visible = false;
      arrow.add(piercingTrail);

      // Full-charge piercing wind vortex head
      const piercingVortex = new THREE.Group();
      piercingVortex.position.set(0, 0, 0.58);
      const vOuter = new THREE.Mesh(vortexRingOuterGeom, piercingVortexOuterMat);
      const vInner = new THREE.Mesh(vortexRingInnerGeom, piercingVortexInnerMat);
      vInner.position.z = 0.01;
      const fFlare1 = new THREE.Mesh(vortexFlareGeom, piercingVortexInnerMat);
      const fFlare2 = new THREE.Mesh(vortexFlareGeom, piercingVortexInnerMat);
      fFlare2.rotation.z = Math.PI / 2;
      piercingVortex.add(vOuter, vInner, fFlare1, fFlare2);
      piercingVortex.visible = false;
      arrow.add(piercingVortex);

      this.scene.add(arrow);
      this.hunterArrowPool.push({
        root: arrow,
        shaft,
        tip,
        normalTrail,
        piercingTrail,
        piercingVortex,
        inUse: false,
      });
    }
  }

  private acquirePooledArrow(isPiercing: boolean): PooledHunterArrow {
    if (this.hunterArrowPool.length === 0) {
      this.initHunterArrowPool();
    }
    let item = this.hunterArrowPool.find((a) => !a.inUse);
    if (!item) {
      item = this.hunterArrowPool[0];
    }
    item.inUse = true;
    item.root.visible = true;
    item.normalTrail.visible = !isPiercing;
    item.piercingTrail.visible = isPiercing;
    item.piercingVortex.visible = isPiercing;
    return item;
  }

  private releasePooledArrow(object: THREE.Object3D) {
    const item = this.hunterArrowPool.find((a) => a.root === object);
    if (item) {
      item.inUse = false;
      item.root.visible = false;
      item.normalTrail.visible = false;
      item.piercingTrail.visible = false;
      item.piercingVortex.visible = false;
    }
  }

  public async prewarmHunterShadersInFrustumAsync(): Promise<void> {
    if (!this.scene || !this.renderer || !this.camera) return;
    this.initHunterArrowPool();
    this.initShadowDecoyPool();
    this.initHunterAfterimagePool();

    if (this.hunterArrowPool.length > 0) {
      const sample = this.hunterArrowPool[0];
      const prevPos = sample.root.position.clone();
      const prevVis = sample.root.visible;
      const prevNV = sample.normalTrail.visible;
      const prevPV = sample.piercingTrail.visible;
      const prevVV = sample.piercingVortex.visible;

      // Tempatkan sampel panah di depan kamera untuk kompilasi shader GPU secara langsung
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      sample.root.position.copy(this.camera.position).addScaledVector(fwd, 3.0);
      sample.root.visible = true;
      sample.normalTrail.visible = true;
      sample.piercingTrail.visible = true;
      sample.piercingVortex.visible = true;

      try {
        if ('compileAsync' in this.renderer && typeof (this.renderer as any).compileAsync === 'function') {
          await (this.renderer as any).compileAsync(this.scene, this.camera);
        } else {
          this.renderer.compile(this.scene, this.camera);
        }
      } catch (e) {
        console.warn('[Engine] Hunter arrow shader warm-up compile warning:', e);
      }

      sample.root.position.copy(prevPos);
      sample.root.visible = prevVis;
      sample.normalTrail.visible = prevNV;
      sample.piercingTrail.visible = prevPV;
      sample.piercingVortex.visible = prevVV;
      await cooperativeYield(4);
    }
    if (this.shadowDecoyPool.length > 0) {
      const sampleDecoy = this.shadowDecoyPool[0];
      const prevPos = sampleDecoy.position.clone();
      const prevVis = sampleDecoy.visible;
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      sampleDecoy.position.copy(this.camera.position).addScaledVector(fwd, 3.2);
      sampleDecoy.visible = true;
      try {
        if ('compileAsync' in this.renderer && typeof (this.renderer as any).compileAsync === 'function') {
          await (this.renderer as any).compileAsync(this.scene, this.camera);
        } else {
          this.renderer.compile(this.scene, this.camera);
        }
      } catch (e) {
        console.warn('[Engine] Hunter shadow decoy shader warm-up compile warning:', e);
      }
      sampleDecoy.position.copy(prevPos);
      sampleDecoy.visible = prevVis;
      await cooperativeYield(4);
    }
    if (this.hunterAfterimagePool.length > 0) {
      const sampleAfterimage = this.hunterAfterimagePool[0];
      const prevPos = sampleAfterimage.group.position.clone();
      const prevVis = sampleAfterimage.group.visible;
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      sampleAfterimage.group.position.copy(this.camera.position).addScaledVector(fwd, 2.8);
      sampleAfterimage.group.visible = true;
      for (const m of sampleAfterimage.materials) {
        m.opacity = 0.45;
      }
      try {
        if ('compileAsync' in this.renderer && typeof (this.renderer as any).compileAsync === 'function') {
          await (this.renderer as any).compileAsync(this.scene, this.camera);
        } else {
          this.renderer.compile(this.scene, this.camera);
        }
      } catch (e) {
        console.warn('[Engine] Hunter afterimage shader warm-up compile warning:', e);
      }
      sampleAfterimage.group.position.copy(prevPos);
      sampleAfterimage.group.visible = prevVis;
      for (const m of sampleAfterimage.materials) {
        m.opacity = 0;
      }
      await cooperativeYield(4);
    }
    try {
      SkywardArrowVolleyResourcePool.get().prewarm(this.scene, this.renderer, this.camera);
    } catch (e) {
      console.warn('[Engine] Skyward arrow volley prewarm warning:', e);
    }
    await cooperativeYield(4);
  }

  public prewarmHunterShadersInFrustum(): void {
    void this.prewarmHunterShadersInFrustumAsync();
  }

  public resetHunterBowStance() {
    this.isHoldingBowAttack = false;
    this.isAimingBow = false;
    this.bowChargeRatio = 0;
    this.callbacks.onBowAimChange?.(false, 0);

    if (this.playerMesh && this.charClass === 'rogue') {
      const bowArrow = this.playerMesh.group?.getObjectByName('BowArrow');
      if (bowArrow) {
        bowArrow.visible = false;
        bowArrow.position.set(0, 0, 0.02);
        bowArrow.rotation.set(Math.PI / 2, 0, 0);
      }
      const vortex = this.playerMesh.group?.getObjectByName('ArrowVortex');
      if (vortex) vortex.visible = false;

      if (this.playerMesh.leftArm) this.playerMesh.leftArm.rotation.set(0, 0, 0);
      if (this.playerMesh.rightArm) this.playerMesh.rightArm.rotation.set(0, 0, 0);
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.head) this.playerMesh.head.rotation.set(0, 0, 0);

      const leftArmPose = this.playerMesh.group?.getObjectByName('LeftArmPose');
      if (leftArmPose) {
        leftArmPose.rotation.set(0.04, 0.02, -0.10);
      }
      const rightArmPose = this.playerMesh.group?.getObjectByName('RightArmPose');
      if (rightArmPose) {
        rightArmPose.rotation.set(0, 0, 0);
      }

      const handBow = this.playerMesh.group?.getObjectByName('HandBow');
      if (handBow) {
        handBow.visible = this.hunterWeaponMode === 'bow' && !this.isHunterSheathed;
        handBow.rotation.set(-Math.PI / 2, 0, 0);
      }

      if (this.playerMesh.group) {
        updateHunterWeaponStance(this.playerMesh.group, this.hunterWeaponMode, this.isHunterSheathed);
      }
    }
  }

  public cancelBowAim() {
    this.resetHunterBowStance();
  }

  public fireQuickBowArrow() {
    const camFwdX = -Math.sin(this.cameraAngleH);
    const camFwdZ = -Math.cos(this.cameraAngleH);
    const camFwdY = -Math.sin(this.cameraAngleV);
    const camDirXZ = Math.cos(this.cameraAngleV);
    const aimDir = new THREE.Vector3(camFwdX * camDirXZ, camFwdY, camFwdZ * camDirXZ).normalize();

    soundManager.playBowShoot(false);
    this.spawnHunterArrow(aimDir, false, 1.0, undefined, false, 30.0, false);
    this.resetHunterBowStance();
  }

  public fireChargedBowArrow(chargeRatio: number) {
    const camFwdX = -Math.sin(this.cameraAngleH);
    const camFwdZ = -Math.cos(this.cameraAngleH);
    const camFwdY = -Math.sin(this.cameraAngleV);
    const camDirXZ = Math.cos(this.cameraAngleV);
    const aimDir = new THREE.Vector3(camFwdX * camDirXZ, camFwdY, camFwdZ * camDirXZ).normalize();

    const isFullCharge = chargeRatio >= 0.85;
    const speed = THREE.MathUtils.lerp(32, 54, chargeRatio);
    const dmgMultiplier = THREE.MathUtils.lerp(1.15, 2.15, chargeRatio);

    soundManager.playBowShoot(isFullCharge);
    this.spawnHunterArrow(aimDir, isFullCharge, dmgMultiplier, undefined, false, speed, isFullCharge);

    if (isFullCharge) {
      this.callbacks.onAddFloatingText?.('🏹 PENETRATING WIND-PIERCER!', '#fef08a', 'crit');
      this.triggerCameraShake(0.18);
    }

    this.resetHunterBowStance();
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

    const segments = 32;
    const outerPos: number[] = [];
    const outerIndices: number[] = [];
    const innerPos: number[] = [];
    const innerIndices: number[] = [];

    const maxW = radius * 0.28;
    const maxZ = radius * 0.18;
    const maxY = radius * 0.22;

    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * 2 - 1; // -1 to 1
      const x = u * radius;
      const taper = Math.max(0, 1 - u * u);
      const y = taper * maxY;
      const z = taper * maxZ;
      const w = maxW * Math.sqrt(taper);

      // Tangent derivative: dx = radius, dy = -2 * u * maxY
      const dx = radius;
      const dy = -2 * u * maxY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      // Outer ribbon vertices
      outerPos.push(x + nx * (w * 0.5), y + ny * (w * 0.5), z);
      outerPos.push(x - nx * (w * 0.5), y - ny * (w * 0.5), z);

      // Inner incandescent core vertices (slimmer center strip)
      const coreW = w * 0.35;
      innerPos.push(x + nx * (coreW * 0.5), y + ny * (coreW * 0.5), z + 0.005);
      innerPos.push(x - nx * (coreW * 0.5), y - ny * (coreW * 0.5), z + 0.005);

      if (i < segments) {
        const v0 = i * 2;
        const v1 = i * 2 + 1;
        const v2 = (i + 1) * 2;
        const v3 = (i + 1) * 2 + 1;
        outerIndices.push(v0, v1, v2, v2, v1, v3);
        innerIndices.push(v0, v1, v2, v2, v1, v3);
      }
    }

    const outerGeom = new THREE.BufferGeometry();
    outerGeom.setAttribute('position', new THREE.Float32BufferAttribute(outerPos, 3));
    outerGeom.setIndex(outerIndices);
    outerGeom.computeVertexNormals();

    const outerMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    group.add(outerMesh);

    const innerGeom = new THREE.BufferGeometry();
    innerGeom.setAttribute('position', new THREE.Float32BufferAttribute(innerPos, 3));
    innerGeom.setIndex(innerIndices);
    innerGeom.computeVertexNormals();

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    group.add(innerMesh);

    let life = 0.22;
    const maxLife = 0.22;
    this.addVfx(group, (delta) => {
      life -= delta;
      if (life <= 0) {
        this.scene.remove(group);
        outerGeom.dispose();
        outerMat.dispose();
        innerGeom.dispose();
        innerMat.dispose();
        return false;
      }
      const progress = 1 - life / maxLife;
      const scale = 0.75 + progress * 0.65;
      group.scale.set(scale, scale, scale);
      outerMat.opacity = (life / maxLife) * 0.92;
      innerMat.opacity = (life / maxLife) * 0.98;
      group.position.addScaledVector(direction, delta * 2.8);
      return true;
    });
  }

  // Pre-allocated Zero-Allocation Fixed-Size Ring Buffer Spark Particles
  private spawnSparks(
    position: THREE.Vector3,
    color: number,
    count = 8,
    speed = 4,
    biasVel?: THREE.Vector3,
    lifeTime = 0.35,
    gravityScale = 1.0
  ) {
    const actualCount = Math.min(count, 24);
    for (let i = 0; i < actualCount; i++) {
      const p = this.sparkPool[this.sparkNextIndex];
      const idx = this.sparkNextIndex;
      this.sparkNextIndex = (this.sparkNextIndex + 1) % this.SPARK_MAX_COUNT;

      p.active = true;
      p.x = position.x + (Math.random() - 0.5) * 0.12;
      p.y = position.y + (Math.random() - 0.5) * 0.12;
      p.z = position.z + (Math.random() - 0.5) * 0.12;
      p.vx = (Math.random() - 0.5) * speed + (biasVel ? biasVel.x : 0);
      p.vy = ((Math.random() - 0.2) * speed * 0.8 + 0.6) * (gravityScale < 0.5 ? 0.3 : 1.0) + (biasVel ? biasVel.y : 0);
      p.vz = (Math.random() - 0.5) * speed + (biasVel ? biasVel.z : 0);
      p.life = lifeTime;
      p.maxLife = lifeTime;
      p.gravityScale = gravityScale;
      p.color.setHex(color);
      this.sparkInstancedMesh.setColorAt(idx, p.color);
    }
    if (this.sparkInstancedMesh.instanceColor) {
      this.sparkInstancedMesh.instanceColor.needsUpdate = true;
    }
  }

  // Pre-allocated Zero-Allocation Shockwave Ring
  private spawnShockwaveRing(position: THREE.Vector3, color: number, maxRadius = 4.5, duration = 0.4) {
    const item = this.shockwavePool[this.shockwaveNextIndex];
    this.shockwaveNextIndex = (this.shockwaveNextIndex + 1) % this.shockwavePool.length;
    item.mesh.position.copy(position);
    item.mesh.position.y += 0.08;
    item.mesh.scale.set(1, 1, 1);
    item.mat.color.setHex(color);
    item.mat.opacity = 0.9;
    item.maxRadius = maxRadius;
    item.duration = duration;
    item.elapsed = 0;
    item.active = true;
    item.mesh.visible = true;
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

  // Astral Glide Energy & Windstream Particle Spawner (Zero Memory Allocation)
  private spawnMageAstralGlideStream() {
    this.mageGlideParticleTimer = (this.mageGlideParticleTimer || 0) + 1;
    // Emit soft cyan & lavender particles trailing backward
    const backDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const backwardVel = backDir.clone().multiplyScalar(4.0);
    backwardVel.y += 0.2;

    const isCyan = (this.mageGlideParticleTimer % 2 === 0);
    const color = isCyan ? 0x38bdf8 : 0xc084fc;

    // 1. Aliran partikel dari ujung jubah bawah / kaki (trailing backward)
    const feetPos = this.playerPos.clone();
    feetPos.y += 0.25;
    feetPos.addScaledVector(backDir, 0.45);
    this.spawnSparks(feetPos, color, 2, 1.2, backwardVel, 0.40, 0.15);

    // 2. Aliran partikel dari ujung kristal bola sihir tongkat
    if (this.playerMesh?.orbMesh) {
      const orbPos = new THREE.Vector3();
      this.playerMesh.orbMesh.getWorldPosition(orbPos);
      const orbColor = isCyan ? 0xc084fc : 0x38bdf8;
      this.spawnSparks(orbPos, orbColor, 1, 0.8, backwardVel, 0.35, 0.1);
    }
  }

  // --- Role-Specific Attack VFX Spawners ---

  // 1. Warrior Basic Slash VFX (Dynamic angles, layered glowing arcs, and ground dust)
  private spawnWarriorSlashVfx(comboIndex = 0) {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const spawnPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(0.7)).add(new THREE.Vector3(0, 1.2, 0));

    if (comboIndex === 0) {
      // Hit 1: Tebasan diagonal miring turun (Kanan-Atas ke Kiri-Bawah, -35° / -0.61 rad)
      this.spawnCrescentSlash(spawnPos, fwd, -0.61, 0xfbbf24, 1.5, Math.PI * 0.88);
      this.spawnSparks(spawnPos, 0xf59e0b, 8, 3.8);
      this.spawnSparks(spawnPos, 0xffffff, 4, 3.0);
    } else {
      // Hit 2: Tebasan balik diagonal naik (Kiri-Bawah ke Kanan-Atas, +35° / +0.61 rad, membentuk pola silang X)
      this.spawnCrescentSlash(spawnPos, fwd, 0.61, 0xf59e0b, 1.5, Math.PI * 0.88);
      this.spawnSparks(spawnPos, 0xfbbf24, 10, 4.2);
      this.spawnSparks(spawnPos, 0xffedd5, 4, 3.5);
    }

    // Ground shock dust
    this.spawnShockwaveRing(this.playerPos.clone().add(fwd.clone().multiplyScalar(0.7)), 0xfbbf24, 1.6, 0.25);
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

  // 4b. Warrior Thrust Pierce VFX (Hit 4 Finisher - High-velocity straight spear of light)
  private spawnWarriorThrustVfx(fwd: THREE.Vector3) {
    const origin = this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)).add(fwd.clone().multiplyScalar(0.4));
    const length = 4.2;
    const geom = new THREE.CylinderGeometry(0.06, 0.22, length, 6);
    geom.rotateX(Math.PI / 2);
    geom.translate(0, 0, length / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(origin);
    mesh.rotation.y = Math.atan2(fwd.x, fwd.z);
    this.scene.add(mesh);

    let elapsed = 0;
    this.activeVfx.push({
      object: mesh,
      update: (delta) => {
        elapsed += delta;
        mesh.scale.set(1.0 + elapsed * 3, 1.0 + elapsed * 3, 1.0);
        mat.opacity = Math.max(0, 0.95 - elapsed * 3.8);
        return elapsed < 0.25;
      },
      cleanup: () => {
        geom.dispose();
        mat.dispose();
      },
    });
  }

  // 4c. Warrior Glowing Lightning Fissure VFX (Charge Attack Floor Cracks with 75° Fan Sector Jagged Lightning Arcs & Debris)
  private spawnWarriorFissureVfx(origin: THREE.Vector3, fwd: THREE.Vector3, length: number, tier: 1 | 2 | 3) {
    const group = new THREE.Group();
    const groundY = this.world.getTerrainHeight(origin.x, origin.z);
    group.position.set(origin.x, groundY + 0.02, origin.z);

    const fwdAngle = Math.atan2(fwd.x, fwd.z);
    group.rotation.y = fwdAngle;

    // Fan angle parameters:
    // Tier 1: ~36° cone (spread ±18° / ±0.31 rad)
    // Tier 2: ~54° cone (spread ±27° / ±0.47 rad)
    // Tier 3: 75° full cone (spread ±37.5° / ±0.654 rad)
    const maxSpreadRad = tier === 3 ? (37.5 * Math.PI) / 180 : tier === 2 ? (27.0 * Math.PI) / 180 : (18.0 * Math.PI) / 180;

    // Waypoints for each jagged vein
    interface VeinDef {
      points: THREE.Vector3[];
      width: number;
    }
    const veins: VeinDef[] = [];

    // 1. Central Trunk: starts narrow at (0, 0, 0), shoots forward to Z = length with sharp jagged zigzags
    const trunkSegs = 18;
    const trunkPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= trunkSegs; i++) {
      const t = i / trunkSegs;
      const z = t * length;
      // Sharp jagged displacements on X, zero at the start and end
      const jaggedX = (i === 0 || i === trunkSegs) ? 0 : (Math.sin(i * 3.7) * 0.45 + Math.sin(i * 7.9) * 0.25) * Math.sin(t * Math.PI);
      trunkPoints.push(new THREE.Vector3(jaggedX, 0, z));
    }
    veins.push({ points: trunkPoints, width: 0.36 + tier * 0.08 });

    // 2. Branching Jagged Lightning Arcs filling the fan sector
    // Tier 1: 2 branches, Tier 2: 4 branches, Tier 3: 8 branches
    const branchConfigs: { startFrac: number; angle: number; endFrac: number; width: number }[] = [];
    if (tier === 1) {
      branchConfigs.push(
        { startFrac: 0.22, angle: -maxSpreadRad * 0.9, endFrac: 0.85, width: 0.22 },
        { startFrac: 0.28, angle: maxSpreadRad * 0.9, endFrac: 0.90, width: 0.22 }
      );
    } else if (tier === 2) {
      branchConfigs.push(
        { startFrac: 0.18, angle: -maxSpreadRad * 0.95, endFrac: 0.88, width: 0.24 },
        { startFrac: 0.22, angle: maxSpreadRad * 0.95, endFrac: 0.88, width: 0.24 },
        { startFrac: 0.42, angle: -maxSpreadRad * 0.50, endFrac: 0.96, width: 0.20 },
        { startFrac: 0.45, angle: maxSpreadRad * 0.50, endFrac: 0.96, width: 0.20 }
      );
    } else {
      // Tier 3: 8 branching lightning veins covering ±37.5°
      branchConfigs.push(
        { startFrac: 0.12, angle: -maxSpreadRad * 0.95, endFrac: 0.82, width: 0.28 },
        { startFrac: 0.15, angle: maxSpreadRad * 0.95, endFrac: 0.82, width: 0.28 },
        { startFrac: 0.28, angle: -maxSpreadRad * 0.65, endFrac: 0.92, width: 0.25 },
        { startFrac: 0.32, angle: maxSpreadRad * 0.65, endFrac: 0.92, width: 0.25 },
        { startFrac: 0.45, angle: -maxSpreadRad * 1.00, endFrac: 1.00, width: 0.22 },
        { startFrac: 0.48, angle: maxSpreadRad * 1.00, endFrac: 1.00, width: 0.22 },
        { startFrac: 0.62, angle: -maxSpreadRad * 0.38, endFrac: 1.00, width: 0.20 },
        { startFrac: 0.65, angle: maxSpreadRad * 0.38, endFrac: 1.00, width: 0.20 }
      );
    }

    branchConfigs.forEach((cfg, bIdx) => {
      const startIdx = Math.floor(cfg.startFrac * trunkSegs);
      const rootPos = trunkPoints[startIdx] || trunkPoints[0];
      const branchSegs = 10;
      const bPoints: THREE.Vector3[] = [];
      const endDist = cfg.endFrac * length;
      const targetX = Math.sin(cfg.angle) * endDist;
      const targetZ = Math.cos(cfg.angle) * endDist;

      for (let s = 0; s <= branchSegs; s++) {
        const bt = s / branchSegs;
        const lx = THREE.MathUtils.lerp(rootPos.x, targetX, bt);
        const lz = THREE.MathUtils.lerp(rootPos.z, targetZ, bt);
        // Add sharp lightning zigzags perpendicular to ray
        const jag = (s === 0 || s === branchSegs) ? 0 : (Math.sin((bIdx + 1) * 4.3 + s * 2.8) * 0.42) * Math.sin(bt * Math.PI);
        const perpX = -Math.cos(cfg.angle) * jag;
        const perpZ = Math.sin(cfg.angle) * jag;
        bPoints.push(new THREE.Vector3(lx + perpX, 0, lz + perpZ));
      }
      veins.push({ points: bPoints, width: cfg.width });
    });

    // Build consolidated ribbon geometry for all lightning veins:
    // Outer intense fiery gold glow & Inner hot-white electric core
    const outerPos: number[] = [];
    const outerIdx: number[] = [];
    const innerPos: number[] = [];
    const innerIdx: number[] = [];

    let outerVCount = 0;
    let innerVCount = 0;

    veins.forEach((vein) => {
      const pts = vein.points;
      const w0 = vein.width;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        let dirX = 0;
        let dirZ = 1;
        if (i < pts.length - 1) {
          dirX = pts[i + 1].x - p.x;
          dirZ = pts[i + 1].z - p.z;
        } else if (i > 0) {
          dirX = p.x - pts[i - 1].x;
          dirZ = p.z - pts[i - 1].z;
        }
        const len = Math.hypot(dirX, dirZ) || 1;
        const normX = -dirZ / len;
        const normZ = dirX / len;

        const taper = 1.0 - 0.5 * (i / (pts.length - 1));
        const curW = w0 * taper;

        // Outer vertices
        outerPos.push(p.x + normX * curW, 0.002, p.z + normZ * curW);
        outerPos.push(p.x - normX * curW, 0.002, p.z - normZ * curW);

        // Inner core vertices
        const coreW = curW * 0.35;
        innerPos.push(p.x + normX * coreW, 0.006, p.z + normZ * coreW);
        innerPos.push(p.x - normX * coreW, 0.006, p.z - normZ * coreW);

        if (i < pts.length - 1) {
          const o0 = outerVCount + i * 2;
          const o1 = o0 + 1;
          const o2 = o0 + 2;
          const o3 = o0 + 3;
          outerIdx.push(o0, o1, o2, o2, o1, o3);

          const in0 = innerVCount + i * 2;
          const in1 = in0 + 1;
          const in2 = in0 + 2;
          const in3 = in0 + 3;
          innerIdx.push(in0, in1, in2, in2, in1, in3);
        }
      }
      outerVCount += pts.length * 2;
      innerVCount += pts.length * 2;
    });

    const outerGeom = new THREE.BufferGeometry();
    outerGeom.setAttribute('position', new THREE.Float32BufferAttribute(outerPos, 3));
    outerGeom.setIndex(outerIdx);
    outerGeom.computeVertexNormals();

    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff9900,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    group.add(outerMesh);

    const innerGeom = new THREE.BufferGeometry();
    innerGeom.setAttribute('position', new THREE.Float32BufferAttribute(innerPos, 3));
    innerGeom.setIndex(innerIdx);
    innerGeom.computeVertexNormals();

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    group.add(innerMesh);

    // Semburan partikel batu, bara api, dan debu mengikuti jalur zigzag petir
    interface JaggedParticle {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotSpeed: THREE.Vector3;
      basePos: THREE.Vector3;
      geom: THREE.BufferGeometry;
      mat: THREE.Material;
    }
    const debrisList: JaggedParticle[] = [];

    // Choose 16-24 nodes along the veins to spawn popping rock fragments and glowing fire embers
    const sampleNodes: THREE.Vector3[] = [];
    veins.forEach((v) => {
      for (let s = 1; s < v.points.length; s += 2) {
        sampleNodes.push(v.points[s]);
      }
    });

    const debrisCount = Math.min(sampleNodes.length, tier === 3 ? 24 : tier === 2 ? 16 : 10);
    for (let d = 0; d < debrisCount; d++) {
      const node = sampleNodes[Math.floor(Math.random() * sampleNodes.length)] || new THREE.Vector3(0, 0, length * 0.5);
      const isEmber = Math.random() < 0.45;

      const pGeom = isEmber
        ? new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4)
        : new THREE.BoxGeometry(0.12 + Math.random() * 0.14, 0.10 + Math.random() * 0.12, 0.12 + Math.random() * 0.14);

      const pMat = isEmber
        ? new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
        })
        : new THREE.MeshStandardMaterial({
          color: 0x4a4540,
          roughness: 0.85,
          metalness: 0.2,
          flatShading: true,
        });

      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.position.set(
        node.x + (Math.random() - 0.5) * 0.25,
        0.05,
        node.z + (Math.random() - 0.5) * 0.25
      );
      group.add(pMesh);

      debrisList.push({
        mesh: pMesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          2.0 + Math.random() * 3.5,
          (Math.random() - 0.5) * 1.5
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
        basePos: pMesh.position.clone(),
        geom: pGeom,
        mat: pMat,
      });
    }

    this.scene.add(group);

    let elapsed = 0;
    const totalDuration = 1.45; // 0.15s expansion + 1.3s vibrating magma pulse & fade out

    this.activeVfx.push({
      object: group,
      update: (delta: number) => {
        elapsed += delta;
        if (elapsed < 0.15) {
          // Rapid forward surge / lightning propagation in 0.15s
          const p = elapsed / 0.15;
          group.scale.set(1 + p * 0.15, 1, Math.max(0.01, p));
          outerMat.opacity = 0.95;
          innerMat.opacity = 0.98;
        } else {
          group.scale.set(1.15, 1, 1);
          const fadeProgress = (elapsed - 0.15) / 1.30;
          const pulse = 1.0 + Math.sin(elapsed * 26) * 0.12;
          const baseOpacity = Math.max(0, (1 - fadeProgress) * 0.95);
          outerMat.opacity = Math.min(1.0, baseOpacity * pulse);
          innerMat.opacity = Math.min(1.0, baseOpacity * 0.85 * pulse);
        }

        // Animate popping rock fragments and glowing embers
        debrisList.forEach((deb) => {
          deb.vel.y -= delta * 9.8; // gravity
          deb.mesh.position.addScaledVector(deb.vel, delta);
          deb.mesh.rotation.x += deb.rotSpeed.x * delta;
          deb.mesh.rotation.y += deb.rotSpeed.y * delta;
          if (deb.mesh.position.y < 0.02) {
            deb.mesh.position.y = 0.02;
            deb.vel.set(0, 0, 0);
          }
        });

        return elapsed < totalDuration;
      },
      cleanup: () => {
        outerGeom.dispose();
        outerMat.dispose();
        innerGeom.dispose();
        innerMat.dispose();
        debrisList.forEach((d) => {
          d.geom.dispose();
          d.mat.dispose();
        });
      },
    });
  }

  // 4d. Warrior Charge Gathering Particles (Gold energy sucked strictly into the raised blade)
  private spawnChargeGatherParticles() {
    if (!this.playerMesh || !this.playerMesh.weapon) return;
    const bladeWorld = new THREE.Vector3();
    this.playerMesh.weapon.localToWorld(bladeWorld.set(0, 0.85, 0));

    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.35 + Math.random() * 0.45; // Mengambang rapat di sekitar bilah pedang
      const heightOffset = (Math.random() - 0.5) * 0.6;
      const startPos = new THREE.Vector3(
        bladeWorld.x + Math.cos(angle) * radius,
        bladeWorld.y + heightOffset,
        bladeWorld.z + Math.sin(angle) * radius
      );

      const pGeom = new THREE.SphereGeometry(0.035, 4, 4);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.position.copy(startPos);
      this.scene.add(pMesh);

      let life = 0;
      const maxLife = 0.24;
      this.activeVfx.push({
        object: pMesh,
        update: (delta) => {
          life += delta;
          const t = Math.min(1.0, life / maxLife);
          const curBlade = new THREE.Vector3();
          this.playerMesh?.weapon.localToWorld(curBlade.set(0, 0.85, 0));
          pMesh.position.lerpVectors(startPos, curBlade, t * t);
          pMesh.scale.setScalar(1.0 - t * 0.75);
          pMat.opacity = 0.9 * (1.0 - t * 0.5);
          return life < maxLife;
        },
        cleanup: () => {
          pGeom.dispose();
          pMat.dispose();
        },
      });
    }
  }

  // 4e. Warrior Triple Crescent Gale Projectile (14m range razor-sharp wind blade)
  private spawnCrescentProjectile(forward: THREE.Vector3, tiltAngle: number, dmgMult: number, waveIndex: number) {
    const origin = this.playerPos.clone().add(new THREE.Vector3(0, 1.25, 0)).add(forward.clone().multiplyScalar(1.0));
    const crescentGroup = new THREE.Group();
    crescentGroup.position.copy(origin);
    crescentGroup.rotation.y = Math.atan2(forward.x, forward.z);

    // Build razor-sharp aerodynamic crescent blade geometry:
    // Convex outer cutting edge faces forward (+Z), sharp tips curve backward (-Z)
    const radius = waveIndex === 3 ? 1.95 : 1.35;
    const maxHalfAngle = Math.PI * 0.40; // ~72 degrees
    const maxChord = waveIndex === 3 ? 0.58 : 0.40;
    const segments = 32;

    const positions: number[] = [];
    const indices: number[] = [];
    const innerPositions: number[] = [];
    const innerIndices: number[] = [];

    // Outer convex cutting edge leads forward (+Z)
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * 2 - 1; // -1 to 1
      const theta = t * maxHalfAngle;
      const taper = 1 - t * t; // 0 at tips, 1 at center
      const chord = maxChord * taper;

      // Outer curve: leading apex at Z = 0, tips trail back at Z < 0
      const xOut = radius * Math.sin(theta);
      const zOut = radius * (Math.cos(theta) - 1);

      // Inner trailing curve: even further back in -Z, tapering to 0 width at tips
      const xIn = (radius - chord * 0.25) * Math.sin(theta);
      const zIn = zOut - chord;

      // Outer mesh vertices (left and right edges of the blade)
      positions.push(xOut, 0, zOut); // outer leading edge
      positions.push(xIn, 0, zIn);   // inner trailing edge

      // Core razor line vertices (slimmer strip along the leading edge)
      const coreChord = chord * 0.35;
      const xCore = (radius - coreChord * 0.2) * Math.sin(theta);
      const zCore = zOut - coreChord;
      innerPositions.push(xOut, 0.005, zOut);
      innerPositions.push(xCore, 0.005, zCore);

      if (i < segments) {
        const v0 = i * 2;
        const v1 = i * 2 + 1;
        const v2 = (i + 1) * 2;
        const v3 = (i + 1) * 2 + 1;
        // Two triangles for quad
        indices.push(v0, v1, v2);
        indices.push(v2, v1, v3);
        innerIndices.push(v0, v1, v2);
        innerIndices.push(v2, v1, v3);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: waveIndex === 3 ? 0xffea00 : 0xfff8e1, // Wave 3: radiant sun gold, Waves 1&2: brilliant wind aura
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const crescentMesh = new THREE.Mesh(geom, mat);

    // Inner bright white cutting edge core
    const coreGeom = new THREE.BufferGeometry();
    coreGeom.setAttribute('position', new THREE.Float32BufferAttribute(innerPositions, 3));
    coreGeom.setIndex(innerIndices);
    coreGeom.computeVertexNormals();
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    crescentMesh.add(coreMesh);

    // Roll angle around flight axis (Z)
    // Projectile 1: -45° (tilt left), Projectile 2: +45° (tilt right, X-slash), Projectile 3: 0° (horizontal sweeping finisher)
    crescentMesh.rotation.z = tiltAngle;
    crescentGroup.add(crescentMesh);
    this.scene.add(crescentGroup);

    const speed = 24.0;
    const maxDist = 14.0;
    let traveled = 0;
    const hitEnemies = new Set<string>();

    this.activeVfx.push({
      object: crescentGroup,
      update: (delta) => {
        const step = speed * delta;
        traveled += step;
        crescentGroup.position.add(forward.clone().multiplyScalar(step));

        this.enemies.forEach((enemy) => {
          if (enemy.data.isDead || hitEnemies.has(enemy.mesh.uuid)) return;
          if (crescentGroup.position.distanceTo(enemy.mesh.position) <= radius + 0.6) {
            hitEnemies.add(enemy.mesh.uuid);
            this.callbacks.onUpdateStats((stats) => {
              const baseDmg = stats.baseAttack + stats.strength * 1.8;
              const finalDmg = Math.round(baseDmg * dmgMult);
              this.damageEnemy(enemy, finalDmg, waveIndex === 3, waveIndex === 3 ? 1.8 : 0.6);
              return stats;
            });
            this.spawnHitStarburst(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfff59d, 2.2);
          }
        });

        if (traveled > maxDist * 0.8) {
          const fade = Math.max(0, 1.0 - (traveled - maxDist * 0.8) / (maxDist * 0.2));
          mat.opacity = fade * 0.95;
          coreMat.opacity = fade * 0.98;
        }

        return traveled < maxDist;
      },
      cleanup: () => {
        geom.dispose();
        mat.dispose();
        coreGeom.dispose();
        coreMat.dispose();
      },
    });
  }

  // 4f. Warrior Cataclysmic Leap Slam - 3D Rock Spikes & Center Crater VFX
  private spawnCataclysmicRockSpikesVfx(impactPos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(impactPos);

    interface RockInstance {
      mesh: THREE.Mesh;
      targetY: number;
      initY: number;
      basePos: THREE.Vector3;
      geom: THREE.BufferGeometry;
      mat: THREE.Material;
    }

    const rocks: RockInstance[] = [];

    // 1. Center Rock Spikes (8 sharp rocks directly in the center crater radius: 0.4 - 2.5m, eliminating empty center)
    const centerCount = 8;
    for (let i = 0; i < centerCount; i++) {
      const angle = (i / centerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 0.5 + Math.random() * 2.0;
      const height = 1.4 + Math.random() * 0.9;
      const width = 0.38 + Math.random() * 0.22;

      const geom = new THREE.ConeGeometry(width, height, 5);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3d3a37,
        roughness: 0.85,
        metalness: 0.3,
        emissive: 0xff6600,
        emissiveIntensity: 0.55,
        flatShading: true,
      });
      const rockMesh = new THREE.Mesh(geom, mat);
      rockMesh.castShadow = true;

      const lx = Math.cos(angle) * dist;
      const lz = Math.sin(angle) * dist;
      const groundY = this.world.getTerrainHeight(impactPos.x + lx, impactPos.z + lz) - impactPos.y;

      const basePos = new THREE.Vector3(lx, groundY, lz);
      const initY = groundY - 0.7;
      const targetY = groundY + height * 0.45;

      rockMesh.position.set(lx, initY, lz);
      // Tilt outwards from the center impact point
      const tiltX = (lx / dist) * 0.32 + (Math.random() - 0.5) * 0.15;
      const tiltZ = (lz / dist) * 0.32 + (Math.random() - 0.5) * 0.15;
      rockMesh.rotation.set(tiltX, Math.random() * Math.PI * 2, tiltZ);
      group.add(rockMesh);

      rocks.push({ mesh: rockMesh, targetY, initY, basePos, geom, mat });
    }

    // 2. Outer Ring Formations (12 taller rock monoliths around radius: 4.5 - 7.8m)
    const outerCount = 12;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const dist = 4.5 + Math.random() * 2.8;
      const height = 1.6 + Math.random() * 1.1;
      const width = 0.50 + Math.random() * 0.25;

      const geom = new THREE.ConeGeometry(width, height, 5);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4a4744,
        roughness: 0.85,
        metalness: 0.25,
        emissive: 0xffaa00,
        emissiveIntensity: 0.35,
        flatShading: true,
      });
      const rockMesh = new THREE.Mesh(geom, mat);
      rockMesh.castShadow = true;

      const lx = Math.cos(angle) * dist;
      const lz = Math.sin(angle) * dist;
      const groundY = this.world.getTerrainHeight(impactPos.x + lx, impactPos.z + lz) - impactPos.y;

      const basePos = new THREE.Vector3(lx, groundY, lz);
      const initY = groundY - 0.8;
      const targetY = groundY + height * 0.5;

      rockMesh.position.set(lx, initY, lz);
      rockMesh.rotation.set((Math.random() - 0.5) * 0.35, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.35);
      group.add(rockMesh);

      rocks.push({ mesh: rockMesh, targetY, initY, basePos, geom, mat });
    }

    // 3. Center Crater Ground Fracture Decal (radial molten crack veins)
    const craterGeom = new THREE.RingGeometry(0.1, 3.8, 16);
    craterGeom.rotateX(-Math.PI / 2);
    const craterMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const craterMesh = new THREE.Mesh(craterGeom, craterMat);
    craterMesh.position.set(0, 0.02, 0);
    group.add(craterMesh);

    this.scene.add(group);

    let elapsed = 0;
    this.activeVfx.push({
      object: group,
      update: (delta) => {
        elapsed += delta;

        if (elapsed <= 0.18) {
          // Fase 1: Erupsi Cepat Menghujam Keluar Tanah (0.0s - 0.18s)
          const p = elapsed / 0.18;
          const easeOut = Math.sin((p * Math.PI) / 2);
          rocks.forEach((r) => {
            r.mesh.position.y = THREE.MathUtils.lerp(r.initY, r.targetY, easeOut);
          });
          craterMesh.scale.set(p, 1, p);
        } else if (elapsed <= 0.72) {
          // Fase 2: Diam, Bergetar Hebat & Pendaran Magma Pusat Kawah (0.18s - 0.72s)
          const shakeFactor = Math.sin(elapsed * 48) * 0.04;
          rocks.forEach((r) => {
            r.mesh.position.y = r.targetY;
            r.mesh.position.x = r.basePos.x + shakeFactor;
          });
          craterMat.opacity = 0.85 + Math.sin(elapsed * 24) * 0.12;
        } else if (elapsed <= 1.25) {
          // Fase 3: Tenggelam Kembali & Hancur (0.72s - 1.25s)
          const p = (elapsed - 0.72) / 0.53;
          const s = Math.max(0, 1.0 - p);
          rocks.forEach((r) => {
            r.mesh.position.y = THREE.MathUtils.lerp(r.targetY, r.initY - 0.4, p);
            r.mesh.scale.set(s, s, s);
          });
          craterMat.opacity = Math.max(0, (1 - p) * 0.85);
        }

        return elapsed < 1.25;
      },
      cleanup: () => {
        rocks.forEach((r) => {
          r.geom.dispose();
          r.mat.dispose();
        });
        craterGeom.dispose();
        craterMat.dispose();
      },
    });
  }

  // 4g. Warrior Aegis Retribution Barrier VFX (Radiant Projected Shield Crest & Subtle Ground Halo - NO opaque yellow cylinder)
  private spawnAegisRetributionBarrierVfx() {
    const origin = this.playerPos.clone();
    const barrierGroup = new THREE.Group();
    barrierGroup.position.copy(origin);

    // 1. Radiant Projected Shield Crest di depan perisai
    const crestGroup = new THREE.Group();
    crestGroup.position.set(0.25, 1.35, 0.65); // Tepat melayang di depan perisai kiri karakter

    // Bentuk perisai layang-layang (Kite Shield Crest) halus bercahaya
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, -0.65);
    shieldShape.lineTo(-0.45, 0.05);
    shieldShape.lineTo(-0.40, 0.55);
    shieldShape.lineTo(0, 0.65);
    shieldShape.lineTo(0.40, 0.55);
    shieldShape.lineTo(0.45, 0.05);
    shieldShape.closePath();

    const crestGeom = new THREE.ShapeGeometry(shieldShape);
    const crestMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const crestMesh = new THREE.Mesh(crestGeom, crestMat);
    crestGroup.add(crestMesh);

    // Garis bingkai perisai emas
    const rimGeom = new THREE.EdgesGeometry(crestGeom);
    const rimMat = new THREE.LineBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const rimLine = new THREE.LineSegments(rimGeom, rimMat);
    crestGroup.add(rimLine);

    // Salib suci emas di tengah crest
    const crossGeom = new THREE.PlaneGeometry(0.12, 0.65);
    const crossGeom2 = new THREE.PlaneGeometry(0.45, 0.12);
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const crossMesh1 = new THREE.Mesh(crossGeom, crossMat);
    crossMesh1.position.z = 0.01;
    const crossMesh2 = new THREE.Mesh(crossGeom2, crossMat);
    crossMesh2.position.set(0, 0.12, 0.01);
    crestGroup.add(crossMesh1, crossMesh2);

    barrierGroup.add(crestGroup);

    // 2. Lingkaran Runic Halus di Tanah (Tanpa silinder pekat)
    const ringGeom = new THREE.RingGeometry(1.2, 1.45, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.y = 0.03;
    barrierGroup.add(ringMesh);

    this.scene.add(barrierGroup);

    let elapsed = 0;
    this.activeVfx.push({
      object: barrierGroup,
      update: (delta) => {
        elapsed += delta;
        barrierGroup.position.copy(this.playerPos);
        barrierGroup.rotation.y = this.playerRotationY; // Selalu menghadap searah karakter
        const pulse = 0.30 + Math.sin(elapsed * 5) * 0.10;
        crestMat.opacity = pulse;
        rimMat.opacity = pulse + 0.35;
        ringMat.opacity = pulse * 0.9;
        crestGroup.position.y = 1.35 + Math.sin(elapsed * 3) * 0.04;
        return elapsed < 5.0 && this.aegisRetributionTimer > 0;
      },
      cleanup: () => {
        crestGeom.dispose();
        crestMat.dispose();
        rimGeom.dispose();
        rimMat.dispose();
        crossGeom.dispose();
        crossGeom2.dispose();
        crossMat.dispose();
        ringGeom.dispose();
        ringMat.dispose();
      },
    });
  }

  // 5. Mage Arcane Laser Beam & 3D Magic Circle (1.0s Channel with continuous raycast hit detection)
  private spawnMageArcaneLaserBeam(customFwd?: THREE.Vector3, customSpawnPos?: THREE.Vector3, isRemote = false) {
    const fwd = customFwd
      ? this._scratchForward.copy(customFwd).normalize()
      : this._scratchForward.set(0, 0, 1).applyAxisAngle(this._scratchUp, this.playerRotationY);

    const origin = this._scratchOrigin;
    let getOriginCb: (() => { origin: THREE.Vector3; direction?: THREE.Vector3 }) | undefined;

    if (customSpawnPos) {
      origin.copy(customSpawnPos).addScaledVector(fwd, 0.7);
      origin.y += 1.45;
    } else if (this.playerMesh && this.playerMesh.orbMesh) {
      this.playerMesh.group.updateMatrixWorld(true);
      this.playerMesh.orbMesh.updateMatrixWorld(true);
      this.playerMesh.orbMesh.getWorldPosition(origin);

      getOriginCb = () => {
        if (!this.playerMesh?.orbMesh) return { origin, direction: fwd };
        this.playerMesh.group.updateMatrixWorld(true);
        this.playerMesh.orbMesh.updateMatrixWorld(true);
        this.playerMesh.orbMesh.getWorldPosition(this._scratchVec2);
        this._scratchVec3.set(0, 0, 1).applyAxisAngle(this._scratchUp, this.playerRotationY);
        return {
          origin: this._scratchVec2,
          direction: this._scratchVec3,
        };
      };
    } else {
      origin.copy(this.playerPos).addScaledVector(fwd, 1.1);
      origin.y += 1.5;
    }

    const beamLength = 34.0;

    // Trigger Static Player Skill Light (No scene.add/remove)
    this.triggerSkillVfxLight(origin, 0xe879f9, 4.2, 18.0);

    // Helper for raycast hitbox damage against all enemies (mobs and bosses) - Zero Dynamic Vector Allocations
    const checkLaserHit = (isContinuousTick: boolean) => {
      if (isRemote || !this.isRunning) return;

      this.callbacks.onUpdateStats((stats) => {
        const isCrit = Math.random() < 0.22 + stats.intelligence * 0.015;
        const tierMult = 1 + (this.playerTier - 1) * 0.25;
        const fullSpellDmg = (stats.baseAttack + stats.intelligence * 2.4) * tierMult;

        const rawDmg = isContinuousTick ? fullSpellDmg * 0.28 : fullSpellDmg * 0.52;
        const finalDmg = Math.max(4, Math.round(isCrit ? rawDmg * 1.85 : rawDmg));

        this.enemies.forEach((enemy) => {
          if (enemy.data.isDead) return;

          const enemyPos = enemy.mesh.position;
          this._scratchToEnemy.subVectors(enemyPos, origin);
          const projDist = this._scratchToEnemy.dot(fwd);

          if (projDist >= 0.2 && projDist <= beamLength + 1.2) {
            this._scratchClosestPoint.copy(origin).addScaledVector(fwd, projDist);
            const distToBeam = enemyPos.distanceTo(this._scratchClosestPoint);

            const isBoss = enemy.data.type === 'boss' || enemy.data.id.includes('boss');
            const hitRadius = isBoss ? 4.8 : 2.2;

            if (distToBeam <= hitRadius) {
              this.damageEnemy(enemy, finalDmg, isCrit, isContinuousTick ? 0.05 : 0.35);

              this._scratchHitPos.copy(enemyPos);
              this._scratchHitPos.y += 1.2;
              this.spawnSparks(this._scratchHitPos, 0x00f0ff, isContinuousTick ? 6 : 14, 4.0);
              this.spawnSparks(this._scratchHitPos, 0xffffff, isContinuousTick ? 3 : 8, 3.2);

              if (!isContinuousTick) {
                this.spawnHitStarburst(this._scratchHitPos, 0x00f0ff, 1.3);
                this.spawnShockwaveRing(this._scratchHitPos, 0x38bdf8, 2.4, 0.25);
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
      duration: 0.8,
      getOrigin: getOriginCb,
      onHitTick: (isTick) => {
        checkLaserHit(isTick);
      },
      onSpawnSparks: (pos, color, count, speed) => {
        this.spawnSparks(pos, color, count, speed);
      },
    });

    this.addVfx(
      vfx.group,
      (delta) => {
        const keepGoing = vfx.update(delta);
        if (keepGoing) {
          this.triggerSkillVfxLight(origin, 0xe879f9, 3.5, 18.0);
        }
        return keepGoing;
      },
      () => {
        vfx.cleanup();
        this.extinguishSkillVfxLight();
      },
      true
    );

    // Initial cast sparks at the magic circle aperture
    this.spawnSparks(origin, 0x00f0ff, 12, 4.2);
    this.spawnSparks(origin, 0xffffff, 8, 3.0);
  }

  // Backward-compatible alias for Arcane skill projectile calls
  private spawnMageArcaneBolt(customFwd?: THREE.Vector3, customSpawnPos?: THREE.Vector3, isRemote = false) {
    this.spawnMageArcaneLaserBeam(customFwd, customSpawnPos, isRemote);
  }

  // --- MAGE CELESTIAL APOCALYPSE (ULTIMATE: 0.8s Cast Time, 14.5 Radius Runic Circle, 14 Glacial Crystals, Giant Magma Meteor & Scorched Crater) ---
  private startCelestialApocalypseCasting() {
    this.isCasting = true;
    this.castingTimer = 0;
    this.castingDuration = 0.8;
    this.castingSkillName = 'Celestial Apocalypse';
    this.playerVel.set(0, 0, 0);

    // Audio: 0.8s swelling runic charging hum
    soundManager.playStarfallCharge(0.8);

    // Static Player Skill Light
    this.triggerSkillVfxLight(this.playerPos, 0x38bdf8, 3.0, 16.0);

    // 3D Magic Circle at feet (y = terrainHeight + 0.05)
    this.castingCircleInstance = createStarfallCastingCircleVfx({
      playerPos: this.playerPos,
      duration: 0.8,
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
        this.extinguishSkillVfxLight();
        if (this.castingCircleInstance === circle) {
          this.castingCircleInstance = null;
        }
      },
      true // Priority VFX: never prune during casting
    );

    // Calculate target impact area in front of character (18 units ahead: radius 14.5)
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    let targetPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(18.0));
    let terrainH = this.world.getTerrainHeight(targetPos.x, targetPos.z);
    if (isNaN(terrainH) || terrainH < -20 || isNaN(targetPos.x) || isNaN(targetPos.z)) {
      targetPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(18.0));
      terrainH = this.world.getTerrainHeight(targetPos.x, targetPos.z);
    }
    targetPos.y = Math.max(isNaN(terrainH) ? 0 : terrainH, 0);

    // Spawn 14.5 unit radius Glacial Hailstorm & Giant Meteor Barrage at targetPos
    this.spawnCelestialApocalypseBarrage(targetPos);

    // Notify UI: Display casting progress bar ("Celestial Apocalypse... 0.8s")
    this.callbacks.onCastingUpdate?.({
      isCasting: true,
      progress: 0,
      text: 'Celestial Apocalypse... 0.8s',
    });
  }

  // Slot 4 - ULTIMATE: Celestial Apocalypse / Starfall
  public startStarfallCasting() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass !== 'mage') return;

    if (this.mageUltimateCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Celestial Apocalypse Cooldown (${this.mageUltimateCooldownTimer.toFixed(1)}s)!`,
        '#a855f7',
        'info'
      );
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 45) {
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 45 MP)!', '#e57373', 'info');
        return stats;
      }

      // TODO: Kembalikan cooldown normal setelah pengujian selesai (Normal: 18.0s)
      this.mageUltimateCooldownTimer = SKILL_COOLDOWNS.CELESTIAL_APOCALYPSE;
      this.startCelestialApocalypseCasting();
      return { ...stats, mp: Math.max(0, stats.mp - 45) };
    });
  }

  private completeCelestialApocalypseCasting() {
    this.isCasting = false;
    this.callbacks.onCastingUpdate?.(null);

    // Downward staff cast gesture pose (0.2s)
    this.isAttacking = true;
    this.attackType = 'starfall';
    this.attackDuration = 0.20;
    this.attackTimer = 0.20;

    soundManager.stopStarfallCharge();
  }

  // Backward-compatible alias
  private completeStarfallCasting() {
    this.completeCelestialApocalypseCasting();
  }

  private spawnCelestialApocalypseBarrage(targetCenter: THREE.Vector3, isRemote = false) {
    const safeTargetCenter = targetCenter.clone();
    safeTargetCenter.y = Math.max(safeTargetCenter.y, 0);

    const vfx = createStarfallMeteorBarrageVfx({
      targetCenter: safeTargetCenter,
      onImpact: (impactPos, isLast, idx) => {
        if (!isLast) {
          // Phase 2: Glacial Hailstorm (14 Ice Crystals)
          soundManager.playStarfallImpact(false, idx);
          this.triggerCameraShake(0.12);

          if (!isRemote && this.isRunning) {
            this.callbacks.onUpdateStats((stats) => {
              const tierMult = 1 + (this.playerTier - 1) * 0.25;
              const isCrit = Math.random() < 0.20 + stats.intelligence * 0.015;
              // 22% Spell Power per glacial chunk hit
              const baseDmg = (stats.baseAttack + stats.intelligence * 2.8) * tierMult * 0.22;
              const finalDmg = Math.max(3, Math.round(isCrit ? baseDmg * 1.85 : baseDmg));

              this.enemies.forEach((enemy) => {
                if (enemy.data.isDead) return;
                const dist = enemy.mesh.position.distanceTo(impactPos);
                if (dist <= 3.8) {
                  this.damageEnemy(enemy, finalDmg, isCrit, 0.2);
                  // Frostbite Slow: -55% Movement Speed for 3 seconds
                  enemy.slowTimer = 3.0;
                  enemy.slowFactor = 0.55;
                  // Brittle: +20% Damage Taken for 3 seconds
                  enemy.brittleTimer = 3.0;
                  this.spawnHitStarburst(enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x38bdf8, 1.4);
                }
              });
              return stats;
            });
          }
        } else {
          // Phase 3: Cataclysmic Giant Meteor (Impact at 3.2s) - Meteor_Boom.wav at full volume 1.0
          soundManager.playMeteorBoom(1.0);
          soundManager.playStarfallImpact(true, 13);
          this.triggerCameraShake(0.55); // Dramatic Camera Shake

          if (!isRemote && this.isRunning) {
            this.callbacks.onUpdateStats((stats) => {
              const tierMult = 1 + (this.playerTier - 1) * 0.25;
              const isCrit = Math.random() < 0.30 + stats.intelligence * 0.015;
              // 240% Spell Power across full 14.5 unit radius
              const baseDmg = (stats.baseAttack + stats.intelligence * 2.8) * tierMult * 2.40;
              const finalDmg = Math.max(10, Math.round(isCrit ? baseDmg * 1.85 : baseDmg));

              this.enemies.forEach((enemy) => {
                if (enemy.data.isDead) return;
                const dist = enemy.mesh.position.distanceTo(safeTargetCenter);
                if (dist <= 14.5) {
                  // Damage enemy (damageEnemy applies +20% if enemy has Brittle debuff)
                  this.damageEnemy(enemy, finalDmg, isCrit, 0.6);

                  // Crowd Control Differentiation (Normal Mob vs Boss)
                  const isBoss = enemy.data.type === 'boss' || enemy.data.id.startsWith('boss_');
                  if (isBoss) {
                    // Boss is immune to knock-up to prevent awkward flight, replaced with 1.2s Stun
                    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 1.2);
                    this.callbacks.onAddFloatingText('⚡ BOSS STUNNED!', '#fbbf24', 'crit');
                  } else {
                    // Normal mob launched vertically (Knock-Up) and pushed radially
                    if (!enemy.velocity) enemy.velocity = new THREE.Vector3();
                    enemy.velocity.y = 11.5;
                    const pushDir = new THREE.Vector3().subVectors(enemy.mesh.position, safeTargetCenter);
                    pushDir.y = 0;
                    if (pushDir.lengthSq() < 0.01) {
                      pushDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
                    }
                    pushDir.normalize();
                    enemy.velocity.x += pushDir.x * 7.5;
                    enemy.velocity.z += pushDir.z * 7.5;
                    enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.8);
                  }
                }
              });

              // Scorched Crater (3s Burning Ground DoT: 15% Spell Power / sec)
              const craterDps = Math.max(2, Math.round((stats.baseAttack + stats.intelligence * 2.8) * tierMult * 0.15));
              this.activeScorchedCraters.push({
                center: safeTargetCenter.clone(),
                radius: 6.0,
                timer: 3.0,
                dps: craterDps,
                tickTimer: 0.5,
              });

              return stats;
            });

            this.callbacks.onAddFloatingText('☄️ CELESTIAL APOCALYPSE!', '#fbbf24', 'crit');
          }
        }
      },
      onSpawnSparks: (pos, color, count, speed) => {
        this.spawnSparks(pos, color, count, speed);
      },
    });

    this.addVfx(vfx.group, vfx.update, vfx.cleanup, true);
  }

  // Backward-compatible alias
  private spawnStarfallMeteorBarrage(targetCenter: THREE.Vector3, isRemote = false) {
    this.spawnCelestialApocalypseBarrage(targetCenter, isRemote);
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
    this.triggerSkillVfxLight(endPos, 0x38bdf8, 3.2, 12.0);
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

          // 2. Dual-color neon spark bursts (Cyan & Magenta) at character's feet using scratch vector
          this._scratchVec1.copy(endPos);
          this._scratchVec1.y += 0.4;
          this.spawnSparks(this._scratchVec1, 0x38bdf8, 16, 5.2);
          this.spawnSparks(this._scratchVec1, 0xd946ef, 14, 4.8);

          // 3. Camera FOV Punch (+4 FOV) and visceral Camera Shake
          this.triggerCameraFovPunch(4.0, 0.18);
          this.triggerCameraShake(0.20);
        });
      },
      () => {
        vfx.cleanup();
        this.extinguishSkillVfxLight();
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
    this.triggerSkillVfxLight(this.playerPos, 0x67e8f9, 2.5, 10.0);
    const vfx = CelestialHealResourcePool.get().acquire(this.playerPos);
    if (!this.scene.children.includes(vfx.group)) {
      this.scene.add(vfx.group);
    }
    this.addVfx(
      vfx.group,
      (delta) => {
        const terrainH = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
        return vfx.update(delta, this.playerPos, terrainH);
      },
      () => {
        this.extinguishSkillVfxLight();
      }
    );
    this.triggerCameraShake(0.18);
  }

  // 9. Glacial Crystal Barrage (Mage Skill 1 [Q] - Hold-to-Aim, Over-the-Shoulder Camera & MOBA Drag-Aim)
  private initAimIndicator() {
    if (this.aimIndicatorGroup) return;

    this.aimIndicatorGroup = new THREE.Group();
    this.aimIndicatorGroup.name = 'GlacialAimIndicator';
    this.aimIndicatorGroup.visible = false;

    // Ground Target Decal Ring (Radius: 2.2 units)
    // Outer magical ice ring
    const outerRingGeom = new THREE.RingGeometry(1.95, 2.25, 48);
    outerRingGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.aimIndicatorGroundRing = new THREE.Mesh(outerRingGeom, ringMat);
    this.aimIndicatorGroup.add(this.aimIndicatorGroundRing);

    // Inner rune accent ring (Radius: 0.85 units)
    const innerRingGeom = new THREE.RingGeometry(0.65, 0.85, 32);
    innerRingGeom.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.aimIndicatorInnerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
    this.aimIndicatorGroup.add(this.aimIndicatorInnerRing);

    // Arched energy trajectory line from hovering crystals above shoulders to target point
    const TRAJECTORY_SEGMENTS = 36;
    const trajectoryGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAJECTORY_SEGMENTS * 3);
    trajectoryGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const trajectoryMat = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.aimTrajectoryLine = new THREE.Line(trajectoryGeom, trajectoryMat);
    this.aimIndicatorGroup.add(this.aimTrajectoryLine);

    this.scene.add(this.aimIndicatorGroup);
  }

  public startAimGlacialBarrage() {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'mage') return;
    if (this.isAimGlacialActive) return;

    if (this.mageGlacialBarrageCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Glacial Barrage Cooldown (${this.mageGlacialBarrageCooldownTimer.toFixed(1)}s)!`,
        '#94a3b8',
        'info'
      );
      return;
    }

    let hasEnoughMp = true;
    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 18) {
        hasEnoughMp = false;
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 18 MP)!', '#ef4444', 'info');
      }
      return stats;
    });
    if (!hasEnoughMp) return;

    this.isAimGlacialActive = true;
    this.aimGlacialCancelled = false;
    this.lastGlacialTargetId = null;

    // Hitung sudut arah hadap maju dari vektor arah pandang kamera
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const horizForward = cameraForward.clone();
    horizForward.y = 0;
    if (horizForward.lengthSq() > 0.001) {
      horizForward.normalize();
      this.playerRotationY = Math.atan2(horizForward.x, horizForward.z);
      if (this.playerMesh?.group) {
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }
    }

    // Mage Combat Aiming Pose
    this.isAttacking = true;
    this.attackType = 'mage_aim_glacial';
    this.attackTimer = 999;
    if (this.playerMesh) {
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.rightArm) this.playerMesh.rightArm.rotation.set(-Math.PI * 0.45, 0.1, 0.15);
      if (this.playerMesh.weapon) this.playerMesh.weapon.rotation.set(Math.PI * 0.35, 0, 0);
      if (this.playerMesh.leftArm) this.playerMesh.leftArm.rotation.set(-Math.PI * 0.35, -0.2, -0.3);
      if (this.playerMesh.head) this.playerMesh.head.rotation.set(0, 0, 0);
    }

    this.triggerSkillVfxLight(this.playerPos, 0x38bdf8, 2.8, 14.0);

    // Inisialisasi garis bidik & target reticle di dunia 3D
    this.initAimIndicator();
    if (this.aimIndicatorGroup) {
      this.aimIndicatorGroup.visible = true;
    }

    // Acquire ke-12 bilah kristal es di udara di atas & belakang Mage dalam mode Hold-to-Aim
    this.activeGlacialVfx = GlacialBarrageResourcePool.get().acquire(
      this.playerPos,
      this.playerRotationY,
      (shardIndex: number) => soundManager.playIceShardLaunch(shardIndex),
      (targetEnemy: (typeof this.enemies)[0], hitPos: THREE.Vector3) => {
        const isBoss = targetEnemy.data.type === 'boss' || targetEnemy.data.id?.startsWith('boss_');
        soundManager.playIceShatter(isBoss);
        this.triggerCameraShake(0.12);
        this.spawnHitStarburst(hitPos, 0x38bdf8, 1.3);

        if (this.isRunning) {
          this.callbacks.onUpdateStats((stats) => {
            const tierMult = 1 + (this.playerTier - 1) * 0.25;
            const isCrit = Math.random() < 0.20 + stats.intelligence * 0.015;
            const baseDmg = (stats.baseAttack + stats.intelligence * 2.5) * tierMult * 0.24;
            const finalDmg = Math.max(3, Math.round(isCrit ? baseDmg * 1.85 : baseDmg));
            this.damageEnemy(targetEnemy, finalDmg, isCrit, 0.25);

            if (!targetEnemy.slowFactor || !targetEnemy.slowTimer || targetEnemy.slowTimer <= 0) {
              targetEnemy.slowFactor = 0.30;
            } else {
              targetEnemy.slowFactor = Math.min(0.60, targetEnemy.slowFactor + 0.30);
            }
            targetEnemy.slowTimer = 2.5;
            return stats;
          });
        }
      },
      (hitPos: THREE.Vector3) => {
        soundManager.playIceShatter(false);
        this.spawnHitStarburst(hitPos, 0x7dd3fc, 0.9);
      },
      true // isHoldToAim
    );

    const vfxInstance = this.activeGlacialVfx;
    if (!this.scene.children.includes(vfxInstance.group)) {
      this.scene.add(vfxInstance.group);
    }

    this.addVfx(
      vfxInstance.group,
      (delta: number) => {
        return vfxInstance.update(
          delta,
          this.playerPos,
          this.playerRotationY,
          this.aimTargetPoint,
          this.enemies,
          (x, z) => this.world.getTerrainHeight(x, z)
        );
      },
      () => {
        vfxInstance.cleanup();
        if (this.activeGlacialVfx === vfxInstance) {
          this.activeGlacialVfx = null;
          this.extinguishSkillVfxLight();
        }
      },
      true
    );

    this.callbacks.onGlacialAimChange?.(true, null);
  }

  public updateAimGlacialBarrage(deltaX: number, deltaY: number) {
    if (!this.isAimGlacialActive) return;
    this.cameraAngleH = normalizeCameraYaw(this.cameraAngleH - deltaX * 0.015);
    this.cameraAngleV = THREE.MathUtils.clamp(this.cameraAngleV + deltaY * 0.015, -0.45, 0.65);
  }

  public executeGlacialCrystalBarrage() {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'mage') return;

    if (this.mageGlacialBarrageCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Glacial Barrage Cooldown (${this.mageGlacialBarrageCooldownTimer.toFixed(1)}s)!`,
        '#94a3b8',
        'info'
      );
      if (this.isAimGlacialActive) {
        this.cancelGlacialAim();
      }
      return;
    }

    // Pemotongan 18 MP HANYA dilakukan di sini saat kristal es benar-benar diluncurkan!
    let hasEnoughMp = false;
    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 18) {
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 18 MP)!', '#ef4444', 'info');
        return stats;
      }
      hasEnoughMp = true;
      return { ...stats, mp: Math.max(0, stats.mp - 18) };
    });

    if (!hasEnoughMp) {
      if (this.isAimGlacialActive) {
        this.cancelGlacialAim();
      }
      return;
    }

    // Set cooldown (0 untuk stress-testing)
    this.mageGlacialBarrageCooldownTimer = SKILL_COOLDOWNS.GLACIAL_BARRAGE;

    if (this.isAimGlacialActive) {
      this.releaseAimGlacialBarrage(false);
    } else {
      this.castGlacialCrystalBarrage();
    }
  }

  public releaseAimGlacialBarrage(isCancelled = false) {
    if (this.glacialAimTimer) {
      clearTimeout(this.glacialAimTimer);
      this.glacialAimTimer = null;
    }
    this.isHoldingGlacialKey = false;

    if (!this.isAimGlacialActive) return;

    if (isCancelled) {
      this.cancelAimGlacialBarrage();
      return;
    }

    this.callbacks.onAddFloatingText('💠 GLACIAL CRYSTAL BARRAGE!', '#38bdf8', 'crit');

    // Sembunyikan garis bidik
    if (this.aimIndicatorGroup) {
      this.aimIndicatorGroup.visible = false;
    }

    // Luncurkan ke-12 kristal es secara bertubi-tubi menuju target bidikan terakhir
    if (this.activeGlacialVfx) {
      this.activeGlacialVfx.releaseFire(this.aimTargetPoint.clone());
    }

    this.isAimGlacialActive = false;
    this.lastGlacialTargetId = null;
    this.callbacks.onGlacialAimChange?.(false, null);

    // Kembalikan pose karakter setelah selesai menembak
    setTimeout(() => {
      if (!this.isRunning) return;
      this.isAttacking = false;
      this.attackType = null;
      this.attackTimer = 0;
      if (this.playerMesh?.body) {
        this.playerMesh.body.rotation.set(0, 0, 0);
        this.playerMesh.weapon?.rotation.set(0.32, 0.10, 0.05);
        this.playerMesh.leftArm?.rotation.set(0, 0, 0);
        this.playerMesh.rightArm?.rotation.set(0, 0, 0);
      }
    }, 900);
  }

  public cancelAimGlacialBarrage() {
    if (this.glacialAimTimer) {
      clearTimeout(this.glacialAimTimer);
      this.glacialAimTimer = null;
    }
    this.isHoldingGlacialKey = false;

    if (!this.isAimGlacialActive) return;

    this.isAimGlacialActive = false;
    this.aimGlacialCancelled = true;
    this.lastGlacialTargetId = null;

    // Sembunyikan garis bidik dan kristal tanpa mengurangi MP maupun memicu cooldown
    if (this.aimIndicatorGroup) {
      this.aimIndicatorGroup.visible = false;
    }

    if (this.activeGlacialVfx) {
      this.activeGlacialVfx.cleanup();
      this.activeGlacialVfx = null;
      this.extinguishSkillVfxLight();
    }

    this.isAttacking = false;
    this.attackType = null;
    this.attackTimer = 0;
    if (this.playerMesh?.body) {
      this.playerMesh.body.rotation.set(0, 0, 0);
      this.playerMesh.weapon?.rotation.set(0.32, 0.10, 0.05);
      this.playerMesh.leftArm?.rotation.set(0, 0, 0);
      this.playerMesh.rightArm?.rotation.set(0, 0, 0);
    }

    this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
    this.callbacks.onGlacialAimChange?.(false, null);
  }

  public fireGlacialBarrage = () => {
    this.executeGlacialCrystalBarrage();
  };

  public cancelGlacialAim = () => {
    this.cancelAimGlacialBarrage();
  };

  public quickCastGlacialBarrage() {
    this.executeGlacialCrystalBarrage();
  }

  public updateGlacialAimFrame(delta: number) {
    if (!this.isAimGlacialActive) return;

    // Karakter SELALU menghadap searah pandangan kamera ke depan
    const camFwdX = -Math.sin(this.cameraAngleH);
    const camFwdZ = -Math.cos(this.cameraAngleH);
    this.playerRotationY = Math.atan2(camFwdX, camFwdZ);
    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }

    // Mage Combat Aiming Pose
    if (this.playerMesh) {
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.rightArm) this.playerMesh.rightArm.rotation.set(-Math.PI * 0.45, 0.1, 0.15);
      if (this.playerMesh.weapon) this.playerMesh.weapon.rotation.set(Math.PI * 0.35, 0, 0);
      if (this.playerMesh.leftArm) this.playerMesh.leftArm.rotation.set(-Math.PI * 0.35, -0.2, -0.3);
      if (this.playerMesh.head) this.playerMesh.head.rotation.set(0, 0, 0);
    }

    // Arah bidikan 3D (pitch & yaw)
    const camFwdY = -Math.sin(this.cameraAngleV);
    const camDirXZ = Math.cos(this.cameraAngleV);
    const aimDir = new THREE.Vector3(camFwdX * camDirXZ, camFwdY, camFwdZ * camDirXZ).normalize();

    // Raycast / step against terrain ground
    let foundGround = false;
    for (let d = 4.0; d <= 36.0; d += 1.0) {
      const tx = this.playerPos.x + aimDir.x * d;
      const tz = this.playerPos.z + aimDir.z * d;
      const ty = this.playerPos.y + 1.5 + aimDir.y * d;
      const gy = this.world.getTerrainHeight(tx, tz);
      if (ty <= gy + 0.35) {
        this.aimTargetPoint.set(tx, gy, tz);
        foundGround = true;
        break;
      }
    }
    if (!foundGround) {
      this.aimTargetPoint.copy(this.playerPos).add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(aimDir, 28.0);
      const gy = this.world.getTerrainHeight(this.aimTargetPoint.x, this.aimTargetPoint.z);
      this.aimTargetPoint.y = Math.max(this.aimTargetPoint.y, gy);
    }

    // Soft-lock terdekat di jalur bidik kursor
    let bestEnemy: (typeof this.enemies)[0] | null = null;
    let bestDot = 0.65;
    for (let e = 0; e < this.enemies.length; e++) {
      const enemy = this.enemies[e];
      if (enemy.data?.isDead) continue;
      const toE = enemy.mesh.position.clone().sub(this.playerPos);
      const dist = toE.length();
      if (dist > 32.0) continue;
      toE.normalize();
      const dot = aimDir.dot(toE);
      if (dot > bestDot) {
        bestDot = dot;
        bestEnemy = enemy;
      }
    }

    const isLocked = !!bestEnemy;
    if (bestEnemy) {
      this.aimTargetPoint.copy(bestEnemy.mesh.position);
      const targetId = bestEnemy.data?.id || bestEnemy.data?.name || 'enemy';
      if (this.lastGlacialTargetId !== targetId) {
        this.lastGlacialTargetId = targetId;
        this.callbacks.onGlacialAimChange?.(true, {
          name: bestEnemy.data.name || 'Musuh',
          hp: Math.max(0, bestEnemy.data.hp || 0),
          maxHp: bestEnemy.data.maxHp || 100,
          isBoss: bestEnemy.data.type === 'boss' || bestEnemy.data.id?.startsWith('boss_'),
        });
      }
    } else {
      if (this.lastGlacialTargetId !== null) {
        this.lastGlacialTargetId = null;
        this.callbacks.onGlacialAimChange?.(true, null);
      }
    }

    // Update 3D Ground Ring and Curved Trajectory Line
    if (this.aimIndicatorGroup && this.aimIndicatorGroup.visible) {
      const groundY = this.world.getTerrainHeight(this.aimTargetPoint.x, this.aimTargetPoint.z);
      const ringY = Math.max(this.aimTargetPoint.y, groundY) + 0.08;
      const time = this.clock.getElapsedTime();
      const pulse = 1.0 + Math.sin(time * 6.0) * 0.06;

      if (this.aimIndicatorGroundRing) {
        this.aimIndicatorGroundRing.position.set(this.aimTargetPoint.x, ringY, this.aimTargetPoint.z);
        this.aimIndicatorGroundRing.rotation.z = time * 0.8;
        this.aimIndicatorGroundRing.scale.set(pulse, pulse, pulse);
        const ringMat = this.aimIndicatorGroundRing.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(isLocked ? 0xfbbf24 : 0x38bdf8); // Cyan-Gold when locked
      }

      if (this.aimIndicatorInnerRing) {
        this.aimIndicatorInnerRing.position.set(this.aimTargetPoint.x, ringY + 0.01, this.aimTargetPoint.z);
        this.aimIndicatorInnerRing.rotation.z = -time * 1.2;
        this.aimIndicatorInnerRing.scale.set(pulse, pulse, pulse);
        const innerMat = this.aimIndicatorInnerRing.material as THREE.MeshBasicMaterial;
        innerMat.color.setHex(isLocked ? 0xfde047 : 0xbae6fd);
      }

      // Curved Trajectory Line from crystals above Mage shoulders down to target point
      if (this.aimTrajectoryLine) {
        const lineMat = this.aimTrajectoryLine.material as THREE.LineBasicMaterial;
        lineMat.color.setHex(isLocked ? 0xfbbf24 : 0x7dd3fc);

        const startPos = this.playerPos.clone().add(new THREE.Vector3(0, 2.6, 0));
        const endPos = this.aimTargetPoint.clone();
        const dist = startPos.distanceTo(endPos);
        const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        midPoint.y += Math.min(6.0, Math.max(1.8, dist * 0.15));

        const geom = this.aimTrajectoryLine.geometry as THREE.BufferGeometry;
        const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const oneMinusT = 1 - t;
          const x = oneMinusT * oneMinusT * startPos.x + 2 * oneMinusT * t * midPoint.x + t * t * endPos.x;
          const y = oneMinusT * oneMinusT * startPos.y + 2 * oneMinusT * t * midPoint.y + t * t * endPos.y;
          const z = oneMinusT * oneMinusT * startPos.z + 2 * oneMinusT * t * midPoint.z + t * t * endPos.z;
          posAttr.setXYZ(i, x, y, z);
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  public castGlacialCrystalBarrage(isRemote = false) {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'mage') return;

    // Phase 1: Casting Pose & Aimable Arc Curtain Formation (0.0s - 0.45s)
    this.isCasting = true;
    this.castingTimer = 0;
    this.castingDuration = 0.45;
    this.castingSkillName = 'Glacial Crystal Barrage';
    this.playerVel.set(0, 0, 0);

    // Initial orientation towards camera forward (NOT facing camera)
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const horizForward = cameraForward.clone();
    horizForward.y = 0;
    if (horizForward.lengthSq() > 0.001) {
      horizForward.normalize();
      this.playerRotationY = Math.atan2(horizForward.x, horizForward.z);
      if (this.playerMesh?.group) {
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }
    }

    // Floating combat text
    this.callbacks.onAddFloatingText('💠 GLACIAL CRYSTAL BARRAGE!', '#38bdf8', 'crit');

    // Trigger pre-allocated Skill VFX light
    this.triggerSkillVfxLight(this.playerPos, 0x38bdf8, 2.8, 14.0);

    // Spawn pooled barrage VFX
    this.spawnGlacialCrystalBarrageVfx(isRemote);
  }

  private completeGlacialCrystalBarrageCasting() {
    this.isCasting = false;
    this.castingSkillName = '';
    this.callbacks.onCastingUpdate?.(null);

    // After 0.45s cast, return staff to combat pose and allow full player movement
    this.isAttacking = false;
    this.attackType = null;
    this.attackTimer = 0;

    if (this.playerMesh?.body) {
      this.playerMesh.body.rotation.set(0, 0, 0);
      this.playerMesh.weapon?.rotation.set(0.32, 0.10, 0.05);
      this.playerMesh.leftArm?.rotation.set(0, 0, 0);
      this.playerMesh.rightArm?.rotation.set(0, 0, 0);
    }
  }

  private spawnGlacialCrystalBarrageVfx(isRemote = false) {
    const vfx = GlacialBarrageResourcePool.get().acquire(
      this.playerPos,
      this.playerRotationY,
      // onShardLaunch callback
      (shardIndex: number) => {
        soundManager.playIceShardLaunch(shardIndex);
      },
      // onShardHit callback (mob or boss)
      (targetEnemy: (typeof this.enemies)[0], hitPos: THREE.Vector3) => {
        const isBoss = targetEnemy.data.type === 'boss' || targetEnemy.data.id?.startsWith('boss_');
        soundManager.playIceShatter(isBoss);
        this.triggerCameraShake(0.12);
        this.spawnHitStarburst(hitPos, 0x38bdf8, 1.3);

        if (!isRemote && this.isRunning) {
          this.callbacks.onUpdateStats((stats) => {
            const tierMult = 1 + (this.playerTier - 1) * 0.25;
            const isCrit = Math.random() < 0.20 + stats.intelligence * 0.015;
            // 24% Spell Power: ((Base ATK + INT * 2.5) * TierMultiplier * 0.24)
            const baseDmg = (stats.baseAttack + stats.intelligence * 2.5) * tierMult * 0.24;
            const finalDmg = Math.max(3, Math.round(isCrit ? baseDmg * 1.85 : baseDmg));

            this.damageEnemy(targetEnemy, finalDmg, isCrit, 0.25);

            // Frostbite Slow (-30% movement speed for 2.5s, stacks up to -60%)
            if (!targetEnemy.slowFactor || !targetEnemy.slowTimer || targetEnemy.slowTimer <= 0) {
              targetEnemy.slowFactor = 0.30;
            } else {
              targetEnemy.slowFactor = Math.min(0.60, targetEnemy.slowFactor + 0.30);
            }
            targetEnemy.slowTimer = 2.5;

            return stats;
          });
        }
      },
      // onShardGroundHit callback
      (hitPos: THREE.Vector3) => {
        soundManager.playIceShatter(false);
        this.spawnHitStarburst(hitPos, 0x7dd3fc, 0.9);
      }
    );

    if (!this.scene.children.includes(vfx.group)) {
      this.scene.add(vfx.group);
    }

    this.addVfx(
      vfx.group,
      (delta: number) => {
        // Calculate dynamic aimTargetPoint (22 units ahead or closest enemy near aim line)
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
        let aimTargetPoint = this.playerPos.clone().addScaledVector(forward, 22.0);
        aimTargetPoint.y += 1.2;

        let closestDist = 26.0;
        for (let e = 0; e < this.enemies.length; e++) {
          const enemy = this.enemies[e];
          if (enemy.data?.isDead) continue;
          const toE = enemy.mesh.position.clone().sub(this.playerPos);
          const dist = toE.length();
          if (dist > 28) continue;
          toE.normalize();
          const dot = forward.dot(toE);
          if (dot > 0.55 && dist < closestDist) {
            closestDist = dist;
            aimTargetPoint.copy(enemy.mesh.position);
            aimTargetPoint.y += (enemy.data.type === 'boss' || enemy.data.id?.startsWith('boss_')) ? 2.5 : 1.0;
          }
        }

        return vfx.update(
          delta,
          this.playerPos,
          this.playerRotationY,
          aimTargetPoint,
          this.enemies,
          (x, z) => this.world.getTerrainHeight(x, z)
        );
      },
      () => {
        vfx.cleanup();
        this.extinguishSkillVfxLight();
      },
      true
    );
  }

  // 10. Skyward Arrow Volley (Hunter Skill 1 [Q] Mode Busur - Tap-or-Hold Ground Target Area Radius 5.5)
  private initArrowVolleyIndicator() {
    if (this.arrowVolleyIndicatorGroup) return;

    this.arrowVolleyIndicatorGroup = new THREE.Group();
    this.arrowVolleyIndicatorGroup.name = 'SkywardArrowVolleyIndicator';
    this.arrowVolleyIndicatorGroup.visible = false;

    // Subgroup placed at target ground point that rotates the compass
    this.arrowVolleyDecalSubgroup = new THREE.Group();
    this.arrowVolleyIndicatorGroup.add(this.arrowVolleyDecalSubgroup);

    // 1. Wind compass magic circle plane with procedural texture (Radius: 5.5 units, Width/Height: 11)
    const circleGeom = new THREE.PlaneGeometry(11, 11);
    circleGeom.rotateX(-Math.PI / 2);
    const circleTex = getGaleMagicCircleTexture();
    const circleMat = new THREE.MeshBasicMaterial({
      map: circleTex,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.arrowVolleyGroundDecal = new THREE.Mesh(circleGeom, circleMat);
    this.arrowVolleyDecalSubgroup.add(this.arrowVolleyGroundDecal);

    // 2. Outer glowing perimeter ring (Radius: 5.35 to 5.5 units)
    const outerRingGeom = new THREE.RingGeometry(5.35, 5.5, 64);
    outerRingGeom.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.arrowVolleyOuterRing = new THREE.Mesh(outerRingGeom, outerRingMat);
    this.arrowVolleyDecalSubgroup.add(this.arrowVolleyOuterRing);

    // 3. Arched parabolic trajectory line from Hunter bow to ground target point
    const TRAJECTORY_SEGMENTS = 36;
    const trajectoryGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAJECTORY_SEGMENTS * 3);
    trajectoryGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const trajectoryMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.arrowVolleyTrajectoryLine = new THREE.Line(trajectoryGeom, trajectoryMat);
    this.arrowVolleyIndicatorGroup.add(this.arrowVolleyTrajectoryLine);

    this.scene.add(this.arrowVolleyIndicatorGroup);
  }

  public startAimArrowVolley() {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'rogue' || this.hunterWeaponMode !== 'bow') return;
    if (this.isAimingArrowVolley) return;
    this.unsheatheHunterWeapon();

    if (this.hunterArrowVolleyCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Skyward Volley Cooldown (${this.hunterArrowVolleyCooldownTimer.toFixed(1)}s)!`,
        '#94a3b8',
        'info'
      );
      return;
    }

    let hasEnoughMp = true;
    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 15) {
        hasEnoughMp = false;
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 15 MP)!', '#ef4444', 'info');
      }
      return stats;
    });
    if (!hasEnoughMp) return;

    this.isAimingArrowVolley = true;

    // Face forward along camera direction
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const horizForward = cameraForward.clone();
    horizForward.y = 0;
    if (horizForward.lengthSq() > 0.001) {
      horizForward.normalize();
      this.playerRotationY = Math.atan2(horizForward.x, horizForward.z);
      if (this.playerMesh?.group) {
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }
    }

    // Hunter Combat Aiming Pose: drawing bow, feet planted on ground (zero jump)
    this.isAttacking = true;
    this.attackType = 'hunter_aim_volley';
    this.attackTimer = 999;
    if (this.playerMesh) {
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.rightArm) this.playerMesh.rightArm.rotation.set(-Math.PI * 0.45, -0.2, 0);
      if (this.playerMesh.leftArm) this.playerMesh.leftArm.rotation.set(-Math.PI * 0.4, 0.25, 0);
      if (this.playerMesh.weapon) this.playerMesh.weapon.rotation.set(Math.PI * 0.4, 0, 0);
    }

    soundManager.playBowDraw();
    this.triggerSkillVfxLight(this.playerPos, 0x10b981, 2.8, 14.0);

    this.initArrowVolleyIndicator();
    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.visible = true;
    }

    this.callbacks.onArrowVolleyAimChange?.(true);
  }

  public updateAimArrowVolley(deltaX: number, deltaY: number) {
    if (!this.isAimingArrowVolley) return;
    this.cameraAngleH = normalizeCameraYaw(this.cameraAngleH - deltaX * 0.015);
    this.cameraAngleV = clampCameraPitch(this.cameraAngleV + deltaY * 0.015);
  }

  public updateAimArrowVolleyFrame(delta: number) {
    if (!this.isAimingArrowVolley) return;

    // Karakter SELALU menghadap searah pandangan kamera ke depan
    const camFwdX = -Math.sin(this.cameraAngleH);
    const camFwdZ = -Math.cos(this.cameraAngleH);
    this.playerRotationY = Math.atan2(camFwdX, camFwdZ);
    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }

    // Pose Pemburu menarik busur siap meluncurkan suar ke angkasa
    if (this.playerMesh) {
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.rightArm) this.playerMesh.rightArm.rotation.set(-Math.PI * 0.45, -0.2, 0);
      if (this.playerMesh.leftArm) this.playerMesh.leftArm.rotation.set(-Math.PI * 0.4, 0.25, 0);
      if (this.playerMesh.weapon) this.playerMesh.weapon.rotation.set(Math.PI * 0.4, 0, 0);
    }

    // Raycast / step terrain ground along camera aim direction
    const camFwdY = -Math.sin(this.cameraAngleV);
    const camDirXZ = Math.cos(this.cameraAngleV);
    const aimDir = new THREE.Vector3(camFwdX * camDirXZ, camFwdY, camFwdZ * camDirXZ).normalize();

    let foundGround = false;
    for (let d = 4.0; d <= 36.0; d += 1.0) {
      const tx = this.playerPos.x + aimDir.x * d;
      const tz = this.playerPos.z + aimDir.z * d;
      const ty = this.playerPos.y + 1.5 + aimDir.y * d;
      const gy = this.world.getTerrainHeight(tx, tz);
      if (ty <= gy + 0.35) {
        this.arrowVolleyTargetPoint.set(tx, gy + 0.08, tz);
        foundGround = true;
        break;
      }
    }
    if (!foundGround) {
      this.arrowVolleyTargetPoint.copy(this.playerPos).add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(aimDir, 24.0);
      const gy = this.world.getTerrainHeight(this.arrowVolleyTargetPoint.x, this.arrowVolleyTargetPoint.z);
      this.arrowVolleyTargetPoint.y = gy + 0.08;
    }

    // Soft-lock terdekat di jalur bidik kursor
    let bestEnemy: (typeof this.enemies)[0] | null = null;
    let bestDot = 0.72;
    for (let e = 0; e < this.enemies.length; e++) {
      const enemy = this.enemies[e];
      if (enemy.data?.isDead) continue;
      const toE = enemy.mesh.position.clone().sub(this.playerPos);
      const dist = toE.length();
      if (dist > 32.0) continue;
      toE.normalize();
      const dot = aimDir.dot(toE);
      if (dot > bestDot) {
        bestDot = dot;
        bestEnemy = enemy;
      }
    }
    if (bestEnemy) {
      const ey = this.world.getTerrainHeight(bestEnemy.mesh.position.x, bestEnemy.mesh.position.z);
      this.arrowVolleyTargetPoint.set(bestEnemy.mesh.position.x, ey + 0.08, bestEnemy.mesh.position.z);
    }

    // Update 3D Ground Ring and Rotating Wind Compass
    if (this.arrowVolleyDecalSubgroup) {
      this.arrowVolleyDecalSubgroup.position.copy(this.arrowVolleyTargetPoint);
      this.arrowVolleyDecalSubgroup.rotation.y += delta * 2.0;
    }

    // Update arched trajectory curve from Hunter bow to ground target point
    if (this.arrowVolleyTrajectoryLine) {
      const posAttr = this.arrowVolleyTrajectoryLine.geometry.attributes.position as THREE.BufferAttribute;
      const startX = this.playerPos.x;
      const startY = this.playerPos.y + 1.2;
      const startZ = this.playerPos.z;
      const endX = this.arrowVolleyTargetPoint.x;
      const endY = this.arrowVolleyTargetPoint.y;
      const endZ = this.arrowVolleyTargetPoint.z;
      const dist = this.playerPos.distanceTo(this.arrowVolleyTargetPoint);
      const arcHeight = Math.max(3.5, dist * 0.35);

      for (let i = 0; i < 36; i++) {
        const t = i / 35;
        const px = startX + (endX - startX) * t;
        const pz = startZ + (endZ - startZ) * t;
        const py = startY + (endY - startY) * t + Math.sin(t * Math.PI) * arcHeight;
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;
    }
  }

  public releaseAimArrowVolley(isCancelled = false) {
    if (this.arrowVolleyAimTimer) {
      clearTimeout(this.arrowVolleyAimTimer);
      this.arrowVolleyAimTimer = null;
    }
    this.isHoldingArrowVolleyKey = false;

    if (!this.isAimingArrowVolley) return;

    if (isCancelled) {
      this.cancelArrowVolleyAim();
      return;
    }

    let fired = false;
    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 15) {
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 15 MP)!', '#ef4444', 'info');
        return stats;
      }
      fired = true;
      return { ...stats, mp: Math.max(0, stats.mp - 15) };
    });

    if (!fired) {
      this.cancelArrowVolleyAim();
      return;
    }

    // TODO: Kembalikan cooldown 8s setelah pengujian selesai (Normal: 8.0s)
    this.hunterArrowVolleyCooldownTimer = SKILL_COOLDOWNS.SKYWARD_VOLLEY;
    this.callbacks.onAddFloatingText('🌧️ SKYWARD ARROW VOLLEY!', '#34d399', 'crit');
    soundManager.playBowShoot();

    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.visible = false;
    }

    this.executeSkywardArrowVolley(this.playerPos.clone(), this.arrowVolleyTargetPoint.clone());

    this.isAimingArrowVolley = false;
    this.callbacks.onArrowVolleyAimChange?.(false);

    // Reset pose after brief flare release animation
    setTimeout(() => {
      if (!this.isRunning) return;
      this.isAttacking = false;
      this.attackType = null;
      this.attackTimer = 0;
      if (this.playerMesh?.body) {
        this.playerMesh.body.rotation.set(0, 0, 0);
        this.playerMesh.weapon?.rotation.set(0.32, 0.10, 0.05);
        this.playerMesh.leftArm?.rotation.set(0, 0, 0);
        this.playerMesh.rightArm?.rotation.set(0, 0, 0);
      }
    }, 350);
  }

  public cancelArrowVolleyAim() {
    if (this.arrowVolleyAimTimer) {
      clearTimeout(this.arrowVolleyAimTimer);
      this.arrowVolleyAimTimer = null;
    }
    this.isHoldingArrowVolleyKey = false;

    if (!this.isAimingArrowVolley) return;

    this.isAimingArrowVolley = false;

    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.visible = false;
    }

    this.isAttacking = false;
    this.attackType = null;
    this.attackTimer = 0;
    if (this.playerMesh?.body) {
      this.playerMesh.body.rotation.set(0, 0, 0);
      this.playerMesh.weapon?.rotation.set(0.32, 0.10, 0.05);
      this.playerMesh.leftArm?.rotation.set(0, 0, 0);
      this.playerMesh.rightArm?.rotation.set(0, 0, 0);
    }

    this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
    this.callbacks.onArrowVolleyAimChange?.(false);
  }

  public fireArrowVolley = () => {
    this.releaseAimArrowVolley(false);
  };

  public quickCastArrowVolley() {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'rogue' || this.hunterWeaponMode !== 'bow') return;
    if (this.isAimingArrowVolley) return;
    this.unsheatheHunterWeapon();

    if (this.hunterArrowVolleyCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Skyward Volley Cooldown (${this.hunterArrowVolleyCooldownTimer.toFixed(1)}s)!`,
        '#94a3b8',
        'info'
      );
      return;
    }

    let hasEnoughMp = false;
    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 15) {
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 15 MP)!', '#ef4444', 'info');
        return stats;
      }
      hasEnoughMp = true;
      return { ...stats, mp: Math.max(0, stats.mp - 15) };
    });
    if (!hasEnoughMp) return;

    // TODO: Kembalikan cooldown 8s setelah pengujian selesai (Normal: 8.0s)
    this.hunterArrowVolleyCooldownTimer = SKILL_COOLDOWNS.SKYWARD_VOLLEY;
    this.callbacks.onAddFloatingText('🌧️ SKYWARD ARROW VOLLEY!', '#34d399', 'crit');
    soundManager.playBowShoot();

    // Pick closest enemy in camera forward within 24 units, or ground 14 units ahead
    const camFwdX = -Math.sin(this.cameraAngleH);
    const camFwdZ = -Math.cos(this.cameraAngleH);
    const camFwd = new THREE.Vector3(camFwdX, 0, camFwdZ).normalize();

    let bestEnemy: (typeof this.enemies)[0] | null = null;
    let bestDot = 0.55;
    for (let e = 0; e < this.enemies.length; e++) {
      const enemy = this.enemies[e];
      if (enemy.data?.isDead) continue;
      const toE = enemy.mesh.position.clone().sub(this.playerPos);
      toE.y = 0;
      const dist = toE.length();
      if (dist > 24.0) continue;
      toE.normalize();
      const dot = camFwd.dot(toE);
      if (dot > bestDot) {
        bestDot = dot;
        bestEnemy = enemy;
      }
    }

    let targetPos: THREE.Vector3;
    if (bestEnemy) {
      const ey = this.world.getTerrainHeight(bestEnemy.mesh.position.x, bestEnemy.mesh.position.z);
      targetPos = new THREE.Vector3(bestEnemy.mesh.position.x, ey + 0.08, bestEnemy.mesh.position.z);
    } else {
      const tx = this.playerPos.x + camFwd.x * 14.0;
      const tz = this.playerPos.z + camFwd.z * 14.0;
      const ty = this.world.getTerrainHeight(tx, tz) + 0.08;
      targetPos = new THREE.Vector3(tx, ty, tz);
    }

    // Align player facing towards target
    const toTarget = targetPos.clone().sub(this.playerPos);
    toTarget.y = 0;
    if (toTarget.lengthSq() > 0.01) {
      toTarget.normalize();
      this.playerRotationY = Math.atan2(toTarget.x, toTarget.z);
      if (this.playerMesh?.group) {
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }
    }

    // Feet planted on ground, zero jump animation
    this.isAttacking = true;
    this.attackType = 'hunter_volley_release';
    this.attackTimer = 0.35;
    if (this.playerMesh) {
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.rightArm) this.playerMesh.rightArm.rotation.set(-Math.PI * 0.45, -0.2, 0);
      if (this.playerMesh.leftArm) this.playerMesh.leftArm.rotation.set(-Math.PI * 0.4, 0.25, 0);
      if (this.playerMesh.weapon) this.playerMesh.weapon.rotation.set(Math.PI * 0.4, 0, 0);
    }

    this.executeSkywardArrowVolley(this.playerPos.clone(), targetPos);

    setTimeout(() => {
      if (!this.isRunning) return;
      this.isAttacking = false;
      this.attackType = null;
      this.attackTimer = 0;
      if (this.playerMesh?.body) {
        this.playerMesh.body.rotation.set(0, 0, 0);
        this.playerMesh.weapon?.rotation.set(0.32, 0.10, 0.05);
        this.playerMesh.leftArm?.rotation.set(0, 0, 0);
        this.playerMesh.rightArm?.rotation.set(0, 0, 0);
      }
    }, 350);
  }

  public executeSkywardArrowVolley(casterPos: THREE.Vector3, targetPos: THREE.Vector3) {
    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalPlayerAttack?.({
        attackType: 'skill_1_bow_volley',
        skillSlot: 1,
        charClass: this.charClass,
        hunterWeaponMode: this.hunterWeaponMode,
        x: Math.round(targetPos.x * 100) / 100,
        y: Math.round(targetPos.y * 100) / 100,
        z: Math.round(targetPos.z * 100) / 100,
        rotationY: Math.round(this.playerRotationY * 100) / 100,
      });
    }

    const vfxInstance = createSkywardArrowVolleyVfx({
      casterPos,
      targetPos,
      onFlareLaunch: () => {
        this.triggerSkillVfxLight(casterPos, 0x10b981, 2.8, 14.0);
      },
      onArrowImpact: (impactPos, _arrowIndex) => {
        soundManager.playBowShoot();
        this.spawnHitStarburst(impactPos, 0x34d399, 0.8);
        this.triggerSkillVfxLight(impactPos, 0x34d399, 1.2, 5.0);
      },
      onFinisherImpact: (impactPos) => {
        soundManager.playBowShoot();
        this.triggerCameraShake(0.25);
        this.spawnHitStarburst(impactPos, 0x10b981, 2.5);
        this.triggerSkillVfxLight(impactPos, 0x6ee7b7, 3.5, 18.0);
      },
    });

    if (!this.scene.children.includes(vfxInstance.group)) {
      this.scene.add(vfxInstance.group);
    }

    this.addVfx(
      vfxInstance.group,
      (delta: number) => {
        return vfxInstance.update(
          delta,
          this.enemies,
          // Arrow impact damage callback: 20% Bow Power + Gale Slow & Armor Break
          (hitEnemy, _impactPos) => {
            if (!this.isRunning) return;
            this.callbacks.onUpdateStats((stats) => {
              const tierMult = 1 + (this.playerTier - 1) * 0.25;
              const isCrit = Math.random() < 0.20 + stats.agility * 0.02;
              const baseDmg = (stats.baseAttack + stats.agility * 2.2) * tierMult * 0.20;
              const finalDmg = Math.max(3, Math.round(isCrit ? baseDmg * 1.85 : baseDmg));
              this.damageEnemy(hitEnemy, finalDmg, isCrit, 0.15);

              // Gale Slow: -45% movement speed for 3s
              hitEnemy.slowFactor = 0.45;
              hitEnemy.slowTimer = 3.0;

              // Armor Break: +15% damage taken for 3s
              hitEnemy.armorBreakBonus = 0.15;
              hitEnemy.armorBreakTimer = 3.0;

              return stats;
            });
          },
          // Finisher impact damage callback: 85% Bow Power + Gale Slow & Armor Break
          (hitEnemies, _impactPos) => {
            if (!this.isRunning) return;
            this.callbacks.onUpdateStats((stats) => {
              const tierMult = 1 + (this.playerTier - 1) * 0.25;
              const isCrit = Math.random() < 0.25 + stats.agility * 0.02;
              const baseDmg = (stats.baseAttack + stats.agility * 2.2) * tierMult * 0.85;
              const finalDmg = Math.max(8, Math.round(isCrit ? baseDmg * 1.9 : baseDmg));
              for (const enemy of hitEnemies) {
                this.damageEnemy(enemy, finalDmg, isCrit, 0.4);
                enemy.slowFactor = 0.45;
                enemy.slowTimer = 3.0;
                enemy.armorBreakBonus = 0.15;
                enemy.armorBreakTimer = 3.0;
              }
              return stats;
            });
          }
        );
      },
      () => {
        vfxInstance.cleanup();
      },
      true
    );
  }

  /**
   * Absorbs incoming damage using active Warrior Aegis Shield & Mage Arcane Shield
   */
  public absorbDamageWithShield(
    rawDamage: number,
    attackerEnemy?: (typeof this.enemies)[0]
  ): { remainingDamage: number; absorbed: number } {
    if (this.isInvulnerable) {
      return { remainingDamage: 0, absorbed: 0 };
    }

    let dmg = rawDamage;
    let totalAbsorbed = 0;

    // 1. Aegis Retribution: 35% passive Damage Reduction + 20% Counter-Reflect
    if (this.aegisRetributionTimer > 0) {
      const reflectAmt = Math.max(1, Math.round(rawDamage * 0.20));
      dmg = Math.round(rawDamage * 0.65); // 35% passive Damage Reduction

      if (attackerEnemy && !attackerEnemy.data.isDead) {
        attackerEnemy.data.hp -= reflectAmt;
        this.spawnHitStarburst(attackerEnemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffea00, 2.5);
        this.callbacks.onAddFloatingText(`⚡ ${reflectAmt} Pantulan Suci!`, '#ffd700', 'crit');
      }
    }

    // 2. Warrior Absorption Shield
    if (this.playerShield > 0 && this.playerShieldTimer > 0) {
      if (this.playerShield >= dmg) {
        this.playerShield -= dmg;
        totalAbsorbed += dmg;
        this.callbacks.onAddFloatingText(`🛡️ Perisai Menyerap ${dmg} Dmg!`, '#facc15', 'info');
        dmg = 0;
      } else {
        totalAbsorbed += this.playerShield;
        dmg -= this.playerShield;
        this.callbacks.onAddFloatingText(`🛡️ Perisai Menyerap ${this.playerShield} Dmg (Habis)!`, '#facc15', 'info');
        this.playerShield = 0;
        this.playerShieldTimer = 0;
      }

      this.callbacks.onUpdateStats((s) => ({
        ...s,
        shield: this.playerShield,
        maxShield: this.playerMaxShield,
      }));

      if (dmg <= 0) {
        return { remainingDamage: 0, absorbed: totalAbsorbed };
      }
    }

    // 3. Mage Arcane Shield
    if (this.arcaneShieldHp > 0 && this.arcaneShieldTimer > 0) {
      if (this.arcaneShieldHp >= dmg) {
        this.arcaneShieldHp -= dmg;
        totalAbsorbed += dmg;
        this.callbacks.onAddFloatingText(`🛡️ Perisai Menyerap ${dmg} Dmg!`, '#38bdf8', 'info');
        if (this.arcaneShieldHp <= 0) {
          this.arcaneShieldHp = 0;
          this.arcaneShieldTimer = 0;
          this.callbacks.onAddFloatingText('Perisai Sihir Habis!', '#f59e0b', 'info');
        }
        return { remainingDamage: 0, absorbed: totalAbsorbed };
      } else {
        const absorbed = this.arcaneShieldHp;
        dmg -= this.arcaneShieldHp;
        totalAbsorbed += absorbed;
        this.arcaneShieldHp = 0;
        this.arcaneShieldTimer = 0;
        this.callbacks.onAddFloatingText(`🛡️ Perisai Menyerap ${absorbed} Dmg (Hancur)!`, '#38bdf8', 'info');
        return { remainingDamage: dmg, absorbed: totalAbsorbed };
      }
    }

    return { remainingDamage: dmg, absorbed: totalAbsorbed };
  }

  // 9. Rogue X-Slash VFX (Dual crossing cyan & shadow blades with intersection starburst)
  private spawnRogueXSlashVfx() {
    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    const spawnPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(1.05)).add(new THREE.Vector3(0, 1.2, 0));

    // Blade 1: Glowing Cyan razor arc tilted +40°
    this.spawnCrescentSlash(spawnPos, fwd, 0.7, 0x00f5ff, 1.35, Math.PI * 0.75);
    // Blade 2: Electric Cyan-Azure razor arc tilted -40°
    this.spawnCrescentSlash(spawnPos, fwd, -0.7, 0x38bdf8, 1.35, Math.PI * 0.75);

    // Focal intersection starburst
    this.spawnHitStarburst(spawnPos, 0x00f5ff, 0.9);
    this.spawnSparks(spawnPos, 0x00f5ff, 14, 4.2);
    this.spawnSparks(spawnPos, 0x38bdf8, 10, 3.5);
    this.triggerCameraShake(0.15);
  }

  // 10. Rogue Shadow Flurry VFX (Rapid multi-strike phantom daggers & cyan shadow arcs)
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

        const color = i % 3 === 0 ? 0x00f5ff : i % 3 === 1 ? 0x38bdf8 : 0x00e5ff;
        this.spawnCrescentSlash(spawnPos, offsetFwd, (Math.random() - 0.5) * 1.6, color, 1.2, Math.PI * 0.7);
        this.spawnSparks(spawnPos, color, 7, 3.8);
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
  private spawnHunterArrow(
    aimDirection?: THREE.Vector3,
    isSkill = false,
    bonusDmgMult = 1.0,
    customSpawnPos?: THREE.Vector3,
    isRemote = false,
    customSpeed?: number,
    isPiercing = false,
    isCripplingSlow = false
  ) {
    const fwd = aimDirection
      ? aimDirection.clone().normalize()
      : new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    const spawnPos = customSpawnPos
      ? customSpawnPos.clone().add(fwd.clone().multiplyScalar(0.6)).add(new THREE.Vector3(0, 1.4, 0))
      : this.playerPos.clone().add(fwd.clone().multiplyScalar(1.0)).add(new THREE.Vector3(0, 1.4, 0));

    const speed = customSpeed || (isSkill ? 32.0 : 28.0);
    const pooled = this.acquirePooledArrow(isPiercing);
    const arrowObj = pooled.root;
    arrowObj.position.copy(spawnPos);
    arrowObj.rotation.y = Math.atan2(fwd.x, fwd.z);
    arrowObj.rotation.x = -Math.atan2(fwd.y, Math.hypot(fwd.x, fwd.z));

    if (isRemote) {
      this.activeProjectiles.push({
        object: arrowObj,
        direction: fwd,
        speed,
        lifetime: isPiercing ? 1.5 : 1.1,
        damage: 0,
        isCrit: false,
        vfxType: isSkill ? 'hunter_arrow_rain' : 'hunter_arrow',
        isPiercing,
        hitEnemyIds: isPiercing ? new Set<string>() : undefined,
        distanceTraveled: 0,
        pooledArrow: pooled,
        isCripplingSlow,
      });
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      // Wind-Piercer Full Charge grants +25% Bonus Critical Chance
      const critChance = (isPiercing ? 0.47 : 0.22) + stats.agility * 0.015;
      const isCrit = Math.random() < critChance;
      const tierMult = 1 + (this.playerTier - 1) * 0.25;
      const baseDmg = (stats.baseAttack + stats.agility * 2.2) * tierMult * bonusDmgMult;
      const finalDmg = Math.round(isCrit ? baseDmg * 1.85 : baseDmg);

      this.activeProjectiles.push({
        object: arrowObj,
        direction: fwd,
        speed,
        lifetime: isPiercing ? 1.5 : 1.1,
        damage: finalDmg,
        isCrit,
        vfxType: isSkill ? 'hunter_arrow_rain' : 'hunter_arrow',
        isPiercing,
        hitEnemyIds: isPiercing ? new Set<string>() : undefined,
        distanceTraveled: 0,
        pooledArrow: pooled,
        isCripplingSlow,
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
    microStagger?: number;
    isKnockUp?: boolean;
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
            if (params.microStagger) {
              enemy.attackCooldown = Math.max(enemy.attackCooldown, params.microStagger);
              enemy.staggerTimer = params.microStagger;
            }
            if (params.isKnockUp) {
              enemy.mesh.position.y += 1.8;
            }
            this.spawnSparks(enemyPos.clone().add(new THREE.Vector3(0, 1.2, 0)), isCrit ? 0xfacc15 : 0xff5252, 6, 3);
          }
        }
      });

      return stats;
    });
  }

  // --- Warrior & Hunter Combat Actions & Skills ---
  public startBasicAttack() {
    if (this.isControlsLocked || this.isAttacking || this.isCasting) return;
    if (this.charClass === 'rogue') {
      this.unsheatheHunterWeapon();
    }
    this.alignPlayerOrientationToInputOrTarget(this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' ? 22 : 16);

    // Pemburu (Hunter) Bow Tap-or-Hold Charge Handler
    if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
      this.isHoldingBowAttack = true;
      this.bowPressStartTime = performance.now();
      this.isAimingBow = false;
      this.bowChargeRatio = 0;
      soundManager.playBowDraw();
      return;
    }

    if (this.charClass !== 'warrior') {
      this.performBasicAttack();
      return;
    }

    this.isChargingAttack = true;
    this.chargeTimer = 0;
    this.chargeParticleTimer = 0;
  }

  public releaseBasicAttack() {
    // Pemburu (Hunter) Bow Release Attack Handler
    if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
      if (!this.isHoldingBowAttack && !this.isAimingBow) return;
      const holdDuration = (performance.now() - this.bowPressStartTime) / 1000;
      const wasAiming = this.isAimingBow || holdDuration >= 0.20;
      const ratio = this.bowChargeRatio;

      // Tap Cepat (< 0.20s — Quick Shot) vs Tahan (>= 0.20s — Charged Wind-Piercer):
      if (!wasAiming || holdDuration < 0.20) {
        this.fireQuickBowArrow();
      } else {
        this.fireChargedBowArrow(ratio);
      }
      return;
    }

    if (this.charClass !== 'warrior') {
      return;
    }
    if (!this.isChargingAttack) {
      return;
    }

    const holdTime = this.chargeTimer;
    this.isChargingAttack = false;
    this.chargeTimer = 0;
    if (this.playerMesh) {
      resetKnightBladeGlow(this.playerMesh);
    }

    if (holdTime < 1.0) {
      this.performWarriorComboAttack();
    } else {
      this.executeWarriorChargeCleave(holdTime);
    }
  }

  public performWarriorComboAttack() {
    if (this.isControlsLocked || this.isAttacking || this.isCasting) return;
    this.alignPlayerOrientationToInputOrTarget(16);

    const now = performance.now();
    if (now - this.lastAttackTime > 1000) {
      this.warriorComboIndex = 0;
    }
    this.lastAttackTime = now;
    const currentCombo = this.warriorComboIndex;
    this.warriorComboIndex = (this.warriorComboIndex + 1) % 4;

    this.isAttacking = true;

    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalPlayerAttack?.({
        attackType: `warrior_combo_${currentCombo + 1}`,
        charClass: this.charClass,
        x: Math.round(this.playerPos.x * 100) / 100,
        y: Math.round(this.playerPos.y * 100) / 100,
        z: Math.round(this.playerPos.z * 100) / 100,
        rotationY: Math.round(this.playerRotationY * 100) / 100,
      });
    }

    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    if (currentCombo === 0) {
      // Hit 1: Tebasan pedang diagonal kanan-ke-kiri (jangkauan 3.2m)
      this.attackType = 'warrior_combo_1';
      this.attackDuration = 0.32;
      this.attackTimer = 0.32;
      soundManager.playWarriorCleave(1);
      this.spawnWarriorSlashVfx(0);
      this.executeMeleeAttack({
        range: 3.2,
        coneAngle: -0.35,
        dmgMultiplier: 1.25,
        critBonus: 0.05,
        knockback: 0.4,
      });
      this.callbacks.onAddFloatingText('Tebasan 1! ⚔️', '#fbbf24', 'info');
    } else if (currentCombo === 1) {
      // Hit 2: Tebasan pedang diagonal kiri-ke-kanan (jangkauan 3.2m)
      this.attackType = 'warrior_combo_2';
      this.attackDuration = 0.32;
      this.attackTimer = 0.32;
      soundManager.playWarriorCleave(2);
      this.spawnWarriorSlashVfx(1);
      this.executeMeleeAttack({
        range: 3.2,
        coneAngle: -0.35,
        dmgMultiplier: 1.45,
        critBonus: 0.10,
        knockback: 0.45,
      });
      this.callbacks.onAddFloatingText('Tebasan 2! ⚔️', '#fbbf24', 'info');
    } else if (currentCombo === 2) {
      // Hit 3 (Shield Bash): Mendorong perisai ke depan dengan langkah maju pendek (micro-stagger 0.2s)
      this.attackType = 'warrior_combo_3_shield';
      this.attackDuration = 0.35;
      this.attackTimer = 0.35;
      soundManager.playWarriorShieldSlam();
      this.playerVel.add(forward.clone().multiplyScalar(5.5));
      this.spawnShockwaveRing(this.playerPos.clone().add(forward.clone().multiplyScalar(0.8)), 0xf59e0b, 2.8, 0.3);
      this.spawnSparks(this.playerPos.clone().add(forward.clone().multiplyScalar(1.2)).add(new THREE.Vector3(0, 1.2, 0)), 0xfbbf24, 12, 3.5);
      this.executeMeleeAttack({
        range: 2.8,
        coneAngle: 0.0,
        dmgMultiplier: 1.5,
        critBonus: 0.12,
        knockback: 0.8,
        microStagger: 0.2,
      });
      this.callbacks.onAddFloatingText('Shield Bash! 🛡️ (Stagger 0.2s)', '#f59e0b', 'crit');
    } else {
      // Hit 4 (Thrust Pierce Finisher): Tusukan pedang lurus ke depan (jangkauan 4.2m, garis lurus, bonus crit tinggi)
      this.attackType = 'warrior_combo_4_thrust';
      this.attackDuration = 0.40;
      this.attackTimer = 0.40;
      soundManager.playWarriorCleave(3);
      this.spawnWarriorThrustVfx(forward);
      this.executeMeleeAttack({
        range: 4.2,
        coneAngle: 0.65,
        dmgMultiplier: 2.2,
        critBonus: 0.40,
        knockback: 1.2,
      });
      this.callbacks.onAddFloatingText('Thrust Pierce Finisher! ⚡', '#ffd700', 'crit');
    }
  }

  private executeWarriorChargeCleave(holdTime: number) {
    if (this.isControlsLocked || this.isAttacking || this.isCasting) return;
    this.alignPlayerOrientationToInputOrTarget(16);

    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
    this.isAttacking = true;

    if (holdTime < 1.0) {
      this.attackType = 'warrior_charge_release_quick';
      this.attackDuration = 0.32;
      this.attackTimer = 0.32;
      soundManager.playWarriorCleave(1);
      this.spawnWarriorSlashVfx(0);
      this.executeMeleeAttack({
        range: 3.2,
        dmgMultiplier: 1.0,
        critBonus: 0.05,
        knockback: 0.4,
      });
      this.callbacks.onAddFloatingText('Tebas Cepat!', '#fbbf24', 'info');
    } else if (holdTime < 2.5) {
      // Tier 1: Tebasan vertikal, damage 1.8x, Retakan Petir 8.75m (2.5x lipat), Kipas ~36°
      this.attackType = 'warrior_charge_release_tier1';
      this.attackDuration = 0.42;
      this.attackTimer = 0.42;
      soundManager.playWarriorCleave(2);
      this.spawnWarriorFissureVfx(this.playerPos.clone(), fwd, 8.75, 1);
      this.executeMeleeAttack({
        range: 8.75,
        coneAngle: 0.88,
        dmgMultiplier: 1.8,
        critBonus: 0.15,
        knockback: 0.6,
      });
      this.triggerCameraShake(0.14, 0.14);
      this.callbacks.onAddFloatingText('Tebasan Retakan Petir Tier 1 (8.75m)! 🔥', '#f59e0b', 'crit');
    } else if (holdTime < 5.0) {
      // Tier 2: Tebasan bertenaga, damage 2.8x, knockback sedang, Retakan Kipas Petir 15.0m (2.5x lipat), Kipas ~54°
      this.attackType = 'warrior_charge_release_tier2';
      this.attackDuration = 0.48;
      this.attackTimer = 0.48;
      soundManager.playWarriorCleave(3);
      soundManager.playWarriorShieldSlam();
      this.spawnWarriorFissureVfx(this.playerPos.clone(), fwd, 15.0, 2);
      this.spawnSparks(this.playerPos.clone().add(fwd.clone().multiplyScalar(6.0)), 0xffaa00, 24, 5.0);
      this.executeMeleeAttack({
        range: 15.0,
        coneAngle: 0.82,
        dmgMultiplier: 2.8,
        critBonus: 0.25,
        knockback: 1.1,
      });
      this.triggerCameraShake(0.24, 0.22);
      this.callbacks.onAddFloatingText('Tebasan Retakan Kipas Petir Tier 2 (15.0m)! 💥', '#ff9800', 'crit');
    } else {
      // Tier 3 Maksimal (>= 5.0s): Tebasan membelah tanah masif, damage 4.2x, efek knock-up, camera shake kuat, Retakan Kipas Petir 23.75m (2.5x lipat), Kipas 75° full cone
      this.attackType = 'warrior_charge_release_tier3';
      this.attackDuration = 0.55;
      this.attackTimer = 0.55;
      soundManager.playWarriorCleave(3);
      soundManager.playWarriorShieldSlam();
      this.spawnWarriorFissureVfx(this.playerPos.clone(), fwd, 23.75, 3);
      this.spawnSparks(this.playerPos.clone().add(fwd.clone().multiplyScalar(10.0)), 0xffaa00, 40, 7.0);
      this.spawnShockwaveRing(this.playerPos.clone().add(fwd.clone().multiplyScalar(4.0)), 0xffaa00, 8.0, 0.45);
      this.executeMeleeAttack({
        range: 23.75,
        coneAngle: 0.79,
        dmgMultiplier: 4.2,
        critBonus: 0.45,
        knockback: 2.5,
        isKnockUp: true,
      });
      this.triggerCameraShake(0.45, 0.45);
      this.callbacks.onAddFloatingText('RETISAN KIPAS PETIR MEMBELAH TANAH TIER 3 (23.75m)! ⚡⚔️', '#ffd700', 'crit');
    }
  }

  public performShieldDash() {
    if (this.isControlsLocked || this.isDashing || this.isCasting) return;
    this.callbacks.onUpdateStats((stats) => {
      if (stats.stamina < 15) {
        this.callbacks.onAddFloatingText('Stamina Tidak Cukup!', '#ffb74d', 'info');
        return stats;
      }

      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

      soundManager.playSkillTerjang();
      this.isDashing = true;
      this.dashTimer = 0.25;
      this.isAttacking = true;
      this.attackType = 'shield_dash';
      this.attackDuration = 0.25;
      this.attackTimer = 0.25;

      // 4.5m forward in 0.25s: velocity = 18 m/s
      this.playerVel.x = forward.x * 18;
      this.playerVel.z = forward.z * 18;

      this.spawnWarriorShieldChargeVfx();

      setTimeout(() => {
        if (!this.isRunning) return;
        this.enemies.forEach((enemy) => {
          if (enemy.data.isDead) return;
          if (this.playerPos.distanceTo(enemy.mesh.position) <= 3.2) {
            const dmg = Math.round(stats.baseAttack * 0.75 + stats.baseDefense * 0.8);
            this.damageEnemy(enemy, dmg, false, 1.2);
            this.spawnSparks(enemy.mesh.position, 0xfbbf24, 8, 3.5);
          }
        });
      }, 100);

      this.callbacks.onAddFloatingText('Shield Dash! 🛡️', '#fbbf24', 'info');
      return { ...stats, stamina: Math.max(0, stats.stamina - 15) };
    });
  }

  private castWarriorTripleCrescentGale() {
    this.alignPlayerOrientationToInputOrTarget(16);
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    this.isAttacking = true;
    this.attackDuration = 0.65;
    this.attackTimer = 0.65;

    // Swing 1 (0ms): Cross Left (-45° roll)
    this.attackType = 'warrior_crescent_1';
    soundManager.playWarriorCleave(1);
    this.spawnCrescentProjectile(forward, -Math.PI / 4, 1.25, 1);

    // Swing 2 (140ms): Cross Right (+45° roll, forming X-Cross Slash with swing 1)
    setTimeout(() => {
      if (!this.isRunning) return;
      this.attackType = 'warrior_crescent_2';
      soundManager.playWarriorCleave(2);
      const curFwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
      this.spawnCrescentProjectile(curFwd, Math.PI / 4, 1.45, 2);
    }, 140);

    // Swing 3 (280ms): Horizontal Sweeping Finisher (0° mendatar rata sejajar tanah)
    setTimeout(() => {
      if (!this.isRunning) return;
      this.attackType = 'warrior_crescent_3';
      soundManager.playWarriorCleave(3);
      soundManager.playSkillTebas360();
      const curFwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
      this.spawnCrescentProjectile(curFwd, 0.0, 2.4, 3);
      this.callbacks.onAddFloatingText('Triple Crescent Gale Finisher! 🌙⚡', '#ffd700', 'crit');
    }, 280);
  }

  private triggerCataclysmicLandingImpact() {
    if (!this.isRunning || this.cataclysmicLanded) return;
    this.cataclysmicLanded = true;
    this.cataclysmicLeaping = false;

    // Hentikan dorongan horizontal saat mendarat
    this.playerVel.x = 0;
    this.playerVel.z = 0;

    // Pose tebasan vertikal ke bawah saat pedang menghantam tanah
    this.attackType = 'cataclysmic_slam';
    this.attackDuration = 0.5;
    this.attackTimer = 0.5;
    this.isAttacking = true;

    const impactPos = this.playerPos.clone();
    soundManager.playWarriorShieldSlam();
    this.triggerCameraShake(0.65, 0.50);

    // Area of Effect (AoE) diperluas 1.8x lipat dari 7.5m menjadi 13.5m
    const aoeRadius = 13.5;
    this.callbacks.onUpdateStats((stats) => {
      const baseDmg = stats.baseAttack + stats.strength * 2.8;
      const finalDmg = Math.round(baseDmg * 2.2);

      this.enemies.forEach((enemy) => {
        if (enemy.data.isDead) return;
        if (impactPos.distanceTo(enemy.mesh.position) <= aoeRadius) {
          this.damageEnemy(enemy, finalDmg, true, 2.2);
          this.spawnSparks(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffaa00, 16, 4.8);
        }
      });
      return stats;
    });

    // Lingkaran cincin guncangan & retakan tanah berlapis dari titik pusat kawah
    this.spawnShockwaveRing(impactPos, 0xfbbf24, aoeRadius, 0.65);
    this.spawnShockwaveRing(impactPos, 0xff7700, aoeRadius * 0.65, 0.50);
    this.spawnShockwaveRing(impactPos, 0xffffff, 4.5, 0.35);
    this.spawnSparks(impactPos, 0xffd700, 48, 7.5);
    this.spawnSparks(impactPos, 0xffffff, 20, 5.0);
    this.spawnCataclysmicRockSpikesVfx(impactPos);
    this.callbacks.onAddFloatingText('Cataclysmic Leap Slam! 💥⛰️', '#ffd700', 'crit');
  }

  private castWarriorCataclysmicLeap() {
    this.alignPlayerOrientationToInputOrTarget(20);
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);

    soundManager.playSkillLompat();
    this.isAttacking = true;
    this.attackType = 'cataclysmic_leap';
    this.attackDuration = 1.6;
    this.attackTimer = 1.6;
    this.isGrounded = false;
    this.cataclysmicLeaping = true;
    this.cataclysmicLanded = false;

    // Parabolic leap diperjauh 1.65x (~23-25m forward, vy = 14.5, durasi terbang ~1.25s, forward vel = 19.5 m/s)
    this.playerVel.y = 14.5;
    this.playerVel.x = forward.x * 19.5;
    this.playerVel.z = forward.z * 19.5;

    // Fallback safety timeout jika karakter melompat ke dataran rendah / lembah
    setTimeout(() => {
      if (this.cataclysmicLeaping && !this.cataclysmicLanded) {
        this.triggerCataclysmicLandingImpact();
      }
    }, 1400);
  }

  private castWarriorAegisRetribution() {
    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 25 || stats.stamina < 15) {
        this.callbacks.onAddFloatingText('Aura / Stamina Tidak Cukup (25 Aura + 15 Stm)!', '#e57373', 'info');
        return stats;
      }

      soundManager.playSkillBenteng();
      this.isAttacking = true;
      this.attackType = 'aegis_retribution';
      this.attackDuration = 0.6;
      this.attackTimer = 0.6;

      this.aegisRetributionTimer = 5.0;
      const shieldVal = Math.round(stats.maxHp * 0.25 + stats.baseDefense * 2.0);
      this.playerShield = shieldVal;
      this.playerMaxShield = shieldVal;
      this.playerShieldTimer = 5.0;

      this.spawnAegisRetributionBarrierVfx();
      this.callbacks.onAddFloatingText(`Aegis Retribution (+${shieldVal} Shield | 35% Redux | 20% Reflect)! 🛡️✨`, '#ffd700', 'heal');

      return {
        ...stats,
        mp: Math.max(0, stats.mp - 25),
        stamina: Math.max(0, stats.stamina - 15),
        shield: shieldVal,
        maxShield: shieldVal,
        shieldDuration: 5.0,
      };
    });
  }

  // --- Role-Specific Combat Skills & Combos ---
  public performBasicAttack() {
    if (this.isControlsLocked || this.isAttacking || this.isCasting) return;
    if (this.charClass === 'rogue') {
      this.unsheatheHunterWeapon();
    }

    if (this.charClass === 'warrior') {
      this.performWarriorComboAttack();
      return;
    }

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

    if (this.charClass === 'mage') {
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
        soundManager.playBowShoot(false);
        this.spawnHunterArrow(undefined, false, 1.0, undefined, false, 30.0, false);
      } else {
        // Hunter Daggers Melee Combat
        const isAmbushCrit = this.phantomAmbushReady;
        if (isAmbushCrit) {
          this.phantomAmbushReady = false;
          this.phantomAmbushTimer = 0;
          soundManager.playRogueShadowFlurry();
          this.spawnSparks(this.playerPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0x064e3b, 22, 5.0);
          this.spawnHitStarburst(this.playerPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0x10b981, 1.8);
          this.callbacks.onAddFloatingText('Phantom Ambush Critical! 🗡️💥', '#10b981', 'crit');
        }

        if (currentCombo === 2) {
          // Combo 3 Finisher: 360° Shadow Blade Whirlwind Cutter (Depan, Belakang, Kiri, Kanan!)
          this.attackType = 'basic_spin_360';
          this.attackDuration = 0.32;
          this.attackTimer = 0.32;
          soundManager.playRogueDoubleSlash();
          this.spawn360BladeSpinVfx(0x00f5ff, 3.4);
          this.executeMeleeAttack({
            range: 3.4,
            is360: true,
            dmgMultiplier: 1.75,
            critBonus: isAmbushCrit ? 2.0 : 0.45,
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
            critBonus: isAmbushCrit ? 2.0 : 0.35,
            knockback: 0.25,
          });
        }
      }
    }
  }

  public castSkill(skillSlot: 1 | 2 | 3 | 4) {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass === 'rogue') {
      this.unsheatheHunterWeapon();
    }

    // Dynamically align facing to movement or closest 360° enemy
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
      if (this.charClass === 'warrior') {
        this.callbacks.onUpdateStats((stats) => {
          if (stats.mp < 20) {
            this.callbacks.onAddFloatingText('Aura Tidak Cukup (Butuh 20)!', '#e57373', 'info');
            return stats;
          }
          this.castWarriorTripleCrescentGale();
          return { ...stats, mp: Math.max(0, stats.mp - 20) };
        });
        return;
      }

      if (this.charClass === 'mage') {
        // Mage Slot 1 (Q): Glacial Crystal Barrage
        this.executeGlacialCrystalBarrage();
        return;
      }

      // Rogue Skill 1 (Cost: 15 MP)
      if (this.charClass === 'rogue') {
        if (this.hunterWeaponMode === 'bow') {
          // Hunter Bow Skill 1 (Q): Skyward Arrow Volley (Tap-or-Hold Ground Targeting)
          if (!this.isAimingArrowVolley) {
            this.quickCastArrowVolley();
          } else {
            this.fireArrowVolley();
          }
          return;
        }

        this.callbacks.onUpdateStats((stats) => {
          if (stats.mp < 15) {
            this.callbacks.onAddFloatingText('MP Tidak Cukup!', '#e57373', 'info');
            return stats;
          }

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
          return { ...stats, mp: stats.mp - 15 };
        });
        return;
      }
    } else if (skillSlot === 2) {
      if (this.charClass === 'warrior') {
        this.callbacks.onUpdateStats((stats) => {
          if (stats.mp < 30) {
            this.callbacks.onAddFloatingText('Aura Tidak Cukup (Butuh 30)!', '#e57373', 'info');
            return stats;
          }
          this.castWarriorCataclysmicLeap();
          return { ...stats, mp: Math.max(0, stats.mp - 30) };
        });
        return;
      }

      if (this.charClass === 'mage') {
        // Mage Slot 2 (E): Arcane Blink (Teleportasi instan menembus musuh dengan iFrame 0.2s)
        this.castArcaneBlink();
        return;
      }

      if (this.charClass === 'rogue') {
        if (this.hunterWeaponMode === 'bow') {
          this.performHunterGaleVault();
        } else {
          this.performHunterPhantomDecoyStep();
        }
        return;
      }
    } else if (skillSlot === 3) {
      if (this.charClass === 'warrior') {
        this.castWarriorAegisRetribution();
        return;
      }

      if (this.charClass === 'mage') {
        // Mage Slot 3 (R): Cahaya Suci / Sanctuary (Heal, Cleanse, Overheal Shield, & +30 MP)
        this.castCahayaSuci();
        return;
      }

      // Rogue Skill 3 (Cost: 25 MP)
      this.callbacks.onUpdateStats((stats) => {
        if (stats.mp < 25) {
          this.callbacks.onAddFloatingText('MP Tidak Cukup!', '#e57373', 'info');
          return stats;
        }

        if (this.charClass === 'rogue') {
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
    } else if (skillSlot === 4) {
      if (this.charClass === 'mage') {
        // Mage Slot 4 (F - ULTIMATE): Celestial Apocalypse / Starfall Ultimate
        this.startStarfallCasting();
        return;
      } else if (this.charClass === 'rogue') {
        this.callbacks.onAddFloatingText('Skill Ultimate Pemburu Segera Hadir! 🏹✨', '#34d399', 'info');
        return;
      }
    }
  }

  // ============================================================================
  // HUNTER NINJA SPRINT: AUTO-SHEATHE & SHADOW AFTERIMAGE POOL
  // ============================================================================
  public unsheatheHunterWeapon(): void {
    if (this.charClass !== 'rogue') return;
    this.isHunterSheathed = false;
    if (this.playerMesh) {
      if (this.playerMesh.setHunterSheathed) {
        this.playerMesh.setHunterSheathed(false);
      } else if (this.playerMesh.group) {
        updateHunterWeaponStance(this.playerMesh.group, this.hunterWeaponMode, false);
      }
    }
  }

  private initHunterAfterimagePool() {
    if (this.hunterAfterimagePool.length > 0) return;
    for (let i = 0; i < 5; i++) {
      const { group, materials } = this.createHunterAfterimageMesh();
      group.visible = false;
      group.frustumCulled = false;
      this.scene.add(group);
      this.hunterAfterimagePool.push({
        group,
        materials,
        active: false,
        timer: 0,
        maxDuration: 0.35,
      });
    }
  }

  private createHunterAfterimageMesh(): { group: THREE.Group; materials: THREE.MeshBasicMaterial[] } {
    const group = new THREE.Group();
    group.name = 'HunterNinjaAfterimage';

    // Translucent emerald green (#064e3b / #10b981)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const materials = [mat];

    // Siluet Tubuh Pemburu Pose Lari Cepat (Shinobi Run Silhouette):
    // 1. Torso condong ke depan 0.56 rad (32 derajat)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.32), mat);
    torso.position.set(0, 1.18, 0);
    torso.rotation.x = 0.56;
    group.add(torso);

    // 2. Kepala dengan cowl/tudung menatap lurus ke depan (-0.476 rad)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.42), mat);
    head.position.set(0, 1.45, 0.16);
    head.rotation.x = -0.476;
    group.add(head);

    // 3. Jubah melayang ke belakang tertiup angin
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.95, 0.04), mat);
    cape.position.set(0, 1.48, -0.20);
    cape.rotation.x = 0.78;
    group.add(cape);

    // 4. Kaki kiri & kanan membelah langkah cepat
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.20), mat);
    legL.position.set(-0.15, 0.38, 0.12);
    legL.rotation.x = 0.45;
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.20), mat);
    legR.position.set(0.15, 0.38, -0.12);
    legR.rotation.x = -0.45;
    group.add(legL, legR);

    // 5. Kedua lengan membentang lurus ke belakang melewati pinggul (Shinobi Arm Sweep)
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.12), mat);
    armL.position.set(-0.44, 1.40, 0.10);
    armL.rotation.set(1.05, 0.05, -0.22);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.12), mat);
    armR.position.set(0.44, 1.40, 0.10);
    armR.rotation.set(1.05, -0.05, 0.22);
    group.add(armL, armR);

    return { group, materials };
  }

  private spawnHunterAfterimage() {
    this.initHunterAfterimagePool();
    // Cari slot yang tidak aktif atau dengan timer tersisa paling sedikit
    let candidate = this.hunterAfterimagePool.find((item) => !item.active);
    if (!candidate) {
      candidate = this.hunterAfterimagePool.reduce((prev, curr) => (curr.timer < prev.timer ? curr : prev));
    }
    if (!candidate) return;

    candidate.group.position.copy(this.playerPos);
    candidate.group.rotation.y = this.playerRotationY;
    candidate.active = true;
    candidate.timer = 0.35;
    candidate.maxDuration = 0.35;
    candidate.group.visible = true;
    for (const m of candidate.materials) {
      m.opacity = 0.45;
    }
  }

  private updateHunterAfterimages(delta: number) {
    if (this.hunterAfterimagePool.length === 0) return;
    for (let i = 0; i < this.hunterAfterimagePool.length; i++) {
      const item = this.hunterAfterimagePool[i];
      if (!item.active) continue;
      item.timer -= delta;
      if (item.timer <= 0) {
        item.active = false;
        item.group.visible = false;
        for (const m of item.materials) {
          m.opacity = 0;
        }
      } else {
        const progress = Math.max(0, item.timer / item.maxDuration);
        for (const m of item.materials) {
          m.opacity = 0.45 * progress;
        }
      }
    }
  }

  // ============================================================================
  // HUNTER MOBILITY REVAMP: GALE VAULT (BOW) & PHANTOM DECOY STEP (DAGGER)
  // ============================================================================
  private initShadowDecoyPool() {
    if (this.shadowDecoyPool.length > 0) return;
    for (let i = 0; i < 3; i++) {
      const decoyGroup = this.createShadowDecoyMesh();
      decoyGroup.visible = false;
      this.scene.add(decoyGroup);
      this.shadowDecoyPool.push(decoyGroup);
    }
  }

  private createShadowDecoyMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HunterShadowDecoy';

    // Dark silhouette material (dark green / deep shadow)
    const shadowMat = new THREE.MeshLambertMaterial({
      color: 0x022c22,
      transparent: true,
      opacity: 0.82,
    });
    // Wireframe emerald glow
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
    });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), shadowMat);
    torso.position.y = 1.30;
    const torsoWire = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.66, 0.29), wireMat);
    torso.add(torsoWire);
    group.add(torso);

    // Head & Hood
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.32, 0.30), shadowMat);
    head.position.y = 1.82;
    const headWire = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.33, 0.31), wireMat);
    head.add(headWire);
    group.add(head);

    // Cape
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.85, 0.05), shadowMat);
    cape.position.set(0, 1.25, -0.16);
    cape.rotation.x = 0.20;
    group.add(cape);

    // Left & Right Arms
    const armGeom = new THREE.BoxGeometry(0.14, 0.48, 0.14);
    const leftArm = new THREE.Mesh(armGeom, shadowMat);
    leftArm.position.set(0.32, 1.30, 0);
    leftArm.rotation.set(-0.3, 0, 0.2);
    const rightArm = new THREE.Mesh(armGeom, shadowMat);
    rightArm.position.set(-0.32, 1.30, 0);
    rightArm.rotation.set(-0.3, 0, -0.2);
    group.add(leftArm, rightArm);

    // Dual Daggers in arms
    const daggerGeom = new THREE.BoxGeometry(0.04, 0.42, 0.02);
    const daggerMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const leftDagger = new THREE.Mesh(daggerGeom, daggerMat);
    leftDagger.position.set(0, -0.25, 0.12);
    leftDagger.rotation.x = Math.PI / 3;
    leftArm.add(leftDagger);

    const rightDagger = new THREE.Mesh(daggerGeom, daggerMat);
    rightDagger.position.set(0, -0.25, 0.12);
    rightDagger.rotation.x = Math.PI / 3;
    rightArm.add(rightDagger);

    // Left & Right Legs
    const legGeom = new THREE.BoxGeometry(0.18, 0.58, 0.18);
    const leftLeg = new THREE.Mesh(legGeom, shadowMat);
    leftLeg.position.set(0.14, 0.60, 0);
    const rightLeg = new THREE.Mesh(legGeom, shadowMat);
    rightLeg.position.set(-0.14, 0.60, 0);
    group.add(leftLeg, rightLeg);

    // Ground Rune Circle
    const groundRingGeom = new THREE.RingGeometry(0.4, 0.9, 24);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(groundRingGeom, groundRingMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.05;
    group.add(groundRing);

    return group;
  }

  private spawnShadowDecoy(pos: THREE.Vector3, rotY: number) {
    this.initShadowDecoyPool();

    // If an existing decoy is active, explode it first
    if (this.activeShadowDecoy && this.activeShadowDecoy.active) {
      this.explodeActiveShadowDecoy();
    }

    const group = this.shadowDecoyPool.find((g) => !g.visible) || this.shadowDecoyPool[0];
    group.position.copy(pos);
    group.rotation.set(0, rotY, 0);
    group.visible = true;

    // Calculate 110% Dagger Power AoE damage
    let damage = 40;
    this.callbacks.onUpdateStats((stats) => {
      const tierMult = 1 + (this.playerTier - 1) * 0.25;
      damage = Math.round((stats.baseAttack + stats.agility * 2.5) * tierMult * 1.10);
      return stats;
    });

    this.activeShadowDecoy = {
      group,
      pos: pos.clone(),
      timer: 2.0,
      active: true,
      damage,
    };
  }

  private explodeActiveShadowDecoy() {
    if (!this.activeShadowDecoy || !this.activeShadowDecoy.active) return;
    const decoyPos = this.activeShadowDecoy.pos;
    const damage = this.activeShadowDecoy.damage;

    this.activeShadowDecoy.active = false;
    this.activeShadowDecoy.group.visible = false;

    soundManager.playRogueSmoke();
    soundManager.playHit();

    // Emerald mist explosion VFX
    this.spawnShockwaveRing(decoyPos, 0x10b981, 5.0, 0.45);
    this.spawnSparks(decoyPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0x10b981, 28, 6.0);
    this.spawnSparks(decoyPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0x064e3b, 20, 5.0);
    this.spawnSparks(decoyPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xa7f3d0, 14, 4.0);
    this.spawnHitStarburst(decoyPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0x34d399, 2.5);
    this.callbacks.onAddFloatingText('Ledakan Bayangan Zamrud! 💥', '#10b981', 'info');

    // AoE damage within radius 5.0
    this.enemies.forEach((enemy) => {
      if (enemy.data.isDead) return;
      if (enemy.mesh.position.distanceTo(decoyPos) <= 5.0) {
        this.damageEnemy(enemy, damage, false, 1.2);
        this.spawnHitStarburst(enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x10b981, 1.2);
      }
    });

    this.activeShadowDecoy = null;
  }

  public performHunterGaleVault() {
    if (this.isControlsLocked || this.isCasting || this.isGaleVaulting) return;

    if (this.hunterMobilityCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Gale Vault Cooldown (${this.hunterMobilityCooldownTimer.toFixed(1)}s)!`,
        '#34d399',
        'info'
      );
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      if (stats.stamina < 15) {
        this.callbacks.onAddFloatingText('Stamina Habis (Butuh 15)!', '#ffb74d', 'info');
        return stats;
      }

      this.executeHunterGaleVault();
      return { ...stats, stamina: Math.max(0, stats.stamina - 15) };
    });
  }

  private executeHunterGaleVault() {
    // TODO: Kembalikan cooldown 6s setelah pengujian selesai
    this.hunterMobilityCooldownTimer = SKILL_COOLDOWNS.HUNTER_MOBILITY ?? 0;

    soundManager.playDash();

    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.playerRotationY
    );
    const startPos = this.playerPos.clone();

    // Invulnerability (0.35s in mid-air)
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.35;

    // Leap backwards 9.5 units (velocity.y = 7.8, horizontal thrust -19.5 away from facing)
    this.isGrounded = false;
    this.playerVel.y = 7.8;
    this.playerVel.x = -forward.x * 19.5;
    this.playerVel.z = -forward.z * 19.5;

    this.isGaleVaulting = true;
    this.galeVaultTimer = 0.45;
    this.galeVaultShotFired = false;
    this.attackType = 'hunter_gale_vault';
    this.attackDuration = 0.45;
    this.attackTimer = 0.45;

    // Emerald wind recoil shockwave ring at launch origin
    this.spawnShockwaveRing(startPos, 0x10b981, 3.4, 0.4);
    this.spawnSparks(startPos.clone().add(new THREE.Vector3(0, 0.2, 0)), 0x34d399, 16, 4.5);
    this.spawnSparks(startPos.clone().add(new THREE.Vector3(0, 0.2, 0)), 0xa7f3d0, 10, 3.5);

    this.callbacks.onAddFloatingText('Gale Vault & Snipe! 🦅💨', '#34d399', 'info');
  }

  public performHunterPhantomDecoyStep() {
    if (this.isControlsLocked || this.isCasting || this.isDashing) return;

    if (this.hunterMobilityCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Phantom Decoy Cooldown (${this.hunterMobilityCooldownTimer.toFixed(1)}s)!`,
        '#10b981',
        'info'
      );
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      if (stats.stamina < 15) {
        this.callbacks.onAddFloatingText('Stamina Habis (Butuh 15)!', '#ffb74d', 'info');
        return stats;
      }

      this.executeHunterPhantomDecoyStep();
      return { ...stats, stamina: Math.max(0, stats.stamina - 15) };
    });
  }

  private executeHunterPhantomDecoyStep() {
    // TODO: Kembalikan cooldown 6s setelah pengujian selesai
    this.hunterMobilityCooldownTimer = SKILL_COOLDOWNS.HUNTER_MOBILITY ?? 0;

    soundManager.playDash();
    soundManager.playRogueSmoke();

    const dashDir = this.getPlayerMovementDirection();
    const startPos = this.playerPos.clone();

    // 10.5 units dash with raycasting against solid environment (penetrable through mobs/bosses)
    let maxDist = 10.5;
    const inInterior = this.playerPos.y < -10;
    for (const col of this.world.colliders) {
      const isInteriorCollider = col.maxY !== undefined && col.maxY < 0;
      if (inInterior !== isInteriorCollider) continue;

      if (col.type === 'box' && col.minX !== undefined && col.maxX !== undefined && col.minZ !== undefined && col.maxZ !== undefined) {
        const hit = this.intersectRayAABB2D(startPos.x, startPos.z, dashDir.x, dashDir.z, col.minX, col.maxX, col.minZ, col.maxZ);
        if (hit !== null && hit > 0 && hit < maxDist) {
          maxDist = Math.min(maxDist, Math.max(0.6, hit - 0.7));
        }
      } else if (col.type === 'circle' && col.x !== undefined && col.z !== undefined && col.radius !== undefined) {
        const hit = this.intersectRayCircle2D(startPos.x, startPos.z, dashDir.x, dashDir.z, col.x, col.z, col.radius);
        if (hit !== null && hit > 0 && hit < maxDist) {
          maxDist = Math.min(maxDist, Math.max(0.6, hit - 0.7));
        }
      }
    }

    let targetX = startPos.x + dashDir.x * maxDist;
    let targetZ = startPos.z + dashDir.z * maxDist;
    targetX = Math.max(-595, Math.min(595, targetX));
    targetZ = Math.max(-595, Math.min(345, targetZ));

    const resolved = this.resolveCollisions(targetX, targetZ);
    const targetPos = new THREE.Vector3(
      resolved.x,
      this.world.getTerrainHeight(resolved.x, resolved.z),
      resolved.z
    );

    // Invulnerability (iFrame 0.35s)
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.35;
    this.isDashing = true;
    this.dashTimer = 0.30;
    this.attackType = 'hunter_phantom_decoy';
    this.attackDuration = 0.30;
    this.attackTimer = 0.30;

    // Spawn Shadow Decoy at start position
    this.spawnShadowDecoy(startPos, this.playerRotationY);

    // Teleport player swiftly to target
    this.playerPos.copy(targetPos);
    this.playerMesh.group.position.copy(targetPos);
    this.playerRotationY = Math.atan2(dashDir.x, dashDir.z);
    this.playerMesh.group.rotation.set(0, this.playerRotationY, 0);
    this.playerVel.set(0, 0, 0);

    // VFX
    this.spawnRogueShadowStepVfx(startPos, targetPos);
    this.spawnShockwaveRing(targetPos, 0x10b981, 2.8, 0.3);
    this.spawnSparks(targetPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x064e3b, 16, 4.0);
    this.spawnSparks(targetPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x10b981, 16, 4.5);

    // Follow-up buff: phantomAmbushReady for 2.5s -> guaranteed 100% crit on next basic dagger attack
    this.phantomAmbushReady = true;
    this.phantomAmbushTimer = 2.5;

    this.callbacks.onAddFloatingText('Phantom Decoy & Ambush Ready! 🗡️💨', '#10b981', 'info');
  }

  // --- MAGE MOBILITY: ARCANE BLINK (Shift) ---
  public performMageBlink() {
    if (this.isControlsLocked || this.isCasting || this.isDashing) return;

    if (this.mageBlinkCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Arcane Blink Cooldown (${this.mageBlinkCooldownTimer.toFixed(1)}s)!`,
        '#06b6d4',
        'info'
      );
      return;
    }

    if (this.playerStamina < 15) {
      this.callbacks.onAddFloatingText('Stamina Habis (Butuh 15)!', '#ffb74d', 'info');
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      if (stats.stamina < 15) return stats;
      return { ...stats, stamina: Math.max(0, stats.stamina - 15) };
    });

    // Mage: Langkah Dimensi (Instant Blink Teleport with Dual Runic Circles, Afterimages & Enemy Penetration)
    soundManager.playMageBlink();
    const startPos = this._scratchOrigin.copy(this.playerPos);
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

    // Clamp to expanded world boundaries (-595..595, -595..345)
    let targetX = startPos.x + blinkDir.x * maxDist;
    let targetZ = startPos.z + blinkDir.z * maxDist;
    targetX = Math.max(-595, Math.min(595, targetX));
    targetZ = Math.max(-595, Math.min(345, targetZ));

    // Resolve collisions so player never blinks inside walls or buildings
    const resolved = this.resolveCollisions(targetX, targetZ);
    const targetPos = this._scratchTarget.set(
      resolved.x,
      this.world.getTerrainHeight(resolved.x, resolved.z),
      resolved.z
    );

    // Invulnerability (iFrame) during dimension shift (0.2s)
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.2;
    this.isDashing = true;
    this.dashTimer = 0.2;
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
    // TODO: Kembalikan cooldown normal setelah pengujian selesai (Normal: 2.0s)
    this.mageBlinkCooldownTimer = SKILL_COOLDOWNS.ARCANE_BLINK;
    this.callbacks.onAddFloatingText('Langkah Dimensi!', '#38bdf8', 'info');
  }

  public castArcaneBlink() {
    this.performMageBlink();
  }

  // Slot 3 (R): Cahaya Suci / Sanctuary (Heal, Cleanse, Overheal Shield, & +30 MP)
  public castCahayaSuci() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass !== 'mage') return;

    if (this.mageCahayaSuciCooldownTimer > 0) {
      this.callbacks.onAddFloatingText(
        `Cahaya Suci Cooldown (${this.mageCahayaSuciCooldownTimer.toFixed(1)}s)!`,
        '#38bdf8',
        'info'
      );
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      if (stats.mp < 25) {
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 25 MP)!', '#e57373', 'info');
        return stats;
      }

      soundManager.playMageCelestialHeal();
      this.spawnMageCelestialHealVfx();
      // TODO: Kembalikan cooldown normal setelah pengujian selesai (Normal: 12.0s)
      this.mageCahayaSuciCooldownTimer = SKILL_COOLDOWNS.CAHAYA_SUCI;
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
    });
  }

  public startArcaneBeam() {
    this.startBasicAttack();
  }

  public jump() {
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

  public performDash() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass === 'warrior') {
      this.performShieldDash();
    } else if (this.charClass === 'mage') {
      this.performMageBlink();
    } else {
      this.castSkill(2);
    }
  }

  public jumpOrDodge() {
    this.jump();
  }

  private damageEnemy(enemy: (typeof this.enemies)[0], rawDamage: number, isCrit: boolean, knockback = 0.4) {
    const defense = enemy.data.defense;
    let actualDamage = Math.max(3, rawDamage - defense);
    if (enemy.brittleTimer && enemy.brittleTimer > 0) {
      actualDamage = Math.round(actualDamage * 1.20); // Brittle: +20% Damage Taken
    }
    if (enemy.armorBreakTimer && enemy.armorBreakTimer > 0) {
      actualDamage = Math.round(actualDamage * (1 + (enemy.armorBreakBonus || 0.15))); // Armor Break: +15% Damage Taken
    }
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
        this.callbacks.onAddFloatingText(`📦 +1 ${pickup.item.nameId}`, '#facc15', 'info');
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
      if (enemy.parts.teeth) {
        enemy.parts.teeth.rotation.z += delta * 2.4;
      }
      for (let i = 1; i < 10; i++) {
        const seg = enemy.parts[`segment_${i}`];
        if (seg) {
          seg.rotation.y = Math.sin(enemy.walkCycle * 2.5 - i * 0.45) * 0.22;
          seg.rotation.z = Math.cos(enemy.walkCycle * 2.0 - i * 0.4) * 0.12;
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
    const s = enemy.data.id === 'boss_dragonfang' ? 4.2 : (enemy.data.id === 'boss_jarrus' ? 1.0 : (enemy.data.type === 'boss' ? 3.5 : (enemy.data.type === 'golem' ? 1.35 : 1.0)));
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
    const s = enemy.data.id === 'boss_dragonfang' ? 4.2 : (enemy.data.id === 'boss_jarrus' ? 1.0 : (enemy.data.type === 'boss' ? 3.5 : (enemy.data.type === 'golem' ? 1.35 : 1.0)));
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
      this.callbacks.onAddFloatingText(`🔥 [BOSS RESPAWN] ${enemy.data.nameId} telah bangkit kembali!`, '#ef4444', 'crit');
    }
  }

  private checkInteract(): boolean {
    // Execute nearby active prompt action (doors, portals, altars, NPCs, chests) immediately upon [F] key press
    if (this.currentPromptAction) {
      this.currentPromptAction();
      return true;
    }

    // Check all NPCs in the village and world
    if (this.world.npcs && this.world.npcs.length > 0) {
      for (const npc of this.world.npcs) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...npc.position));
        if (dist < 4.0) {
          this.callbacks.onInteractNPC(npc.dialogueId || npc.id);
          return true;
        }
      }
    } else if (this.world.npc) {
      const distToNpc = this.playerPos.distanceTo(
        new THREE.Vector3(...this.world.npc.position)
      );
      if (distToNpc < 4.0) {
        this.callbacks.onInteractNPC(this.world.npc.id);
        return true;
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
          return true;
        }
      }
    }

    return false;
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

    // Mage Glacial Barrage: Hold-to-Aim interactive aiming frame & strafe walk
    if (this.isAimGlacialActive) {
      if (!this.isHoldingGlacialKey && !this.isMouseDown && !this.activeGlacialVfx) {
        this.cancelGlacialAim();
      } else {
        this.updateGlacialAimFrame(delta);
      }
    }

    // Hunter Bow: Hold-to-Aim progressive bow charge (>= 0.20s)
    if (this.isHoldingBowAttack && this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
      const holdDuration = (performance.now() - this.bowPressStartTime) / 1000;
      if (holdDuration >= 0.20) {
        this.isAimingBow = true;
        this.bowChargeRatio = Math.min(1.0, (holdDuration - 0.20) / 0.65);
        this.callbacks.onBowAimChange?.(true, this.bowChargeRatio);
      }
    }

    // Hunter Bow: Hold-to-Aim interactive Skyward Arrow Volley frame
    if (this.isAimingArrowVolley) {
      this.updateAimArrowVolleyFrame(delta);
    }

    // Casting State Handling (Movement Lock & Starfall Channeling - image_68.png)
    // Casting State Handling (Movement Lock & Starfall Channeling)
    if (this.isCasting) {
      this.castingTimer += delta;
      const progress = Math.min(1.0, this.castingTimer / this.castingDuration);
      this.callbacks.onCastingUpdate?.({
        isCasting: true,
        progress,
        text: `${this.castingSkillName || 'Casting'}... ${this.castingDuration.toFixed(1)}s`,
      });

      // Strict movement lock: velocity is 0, player strictly grounded to terrain
      this.playerVel.x = 0;
      this.playerVel.y = 0;
      this.playerVel.z = 0;
      const groundY = getExactMeshGroundHeight(this.playerPos.x, this.playerPos.z);
      this.playerPos.y = groundY;
      this.isGrounded = true;
      this.playerMesh.group.position.copy(this.playerPos);

      // Aimable tracking: allow player to steer facing direction during Glacial Barrage 0.45s cast
      if (this.castingSkillName === 'Glacial Crystal Barrage') {
        const inputForward = (this.isKeyPressed('w', 'arrowup') ? 1 : 0) - (this.isKeyPressed('s', 'arrowdown') ? 1 : 0) + (this.joystickVector?.y || 0);
        const inputRight = (this.isKeyPressed('d', 'arrowright') ? 1 : 0) - (this.isKeyPressed('a', 'arrowleft') ? 1 : 0) + (this.joystickVector?.x || 0);
        const camFwdX = -Math.sin(this.cameraAngleH);
        const camFwdZ = -Math.cos(this.cameraAngleH);
        const camRightX = Math.cos(this.cameraAngleH);
        const camRightZ = -Math.sin(this.cameraAngleH);
        const aimDirX = camFwdX * inputForward + camRightX * inputRight;
        const aimDirZ = camFwdZ * inputForward + camRightZ * inputRight;
        if (Math.hypot(aimDirX, aimDirZ) > 0.08) {
          const targetAngle = Math.atan2(aimDirX, aimDirZ);
          let diff = targetAngle - this.playerRotationY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.playerRotationY += diff * 16 * delta;
        } else {
          // If no directional input, smoothly follow camera facing forward direction
          const camFacingAngle = Math.atan2(camFwdX, camFwdZ);
          let diff = camFacingAngle - this.playerRotationY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.playerRotationY += diff * 12 * delta;
        }
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }

      // Celestial Apocalypse / Starfall Casting pose:
      // Kaki berdiri tegak, badan condong mantap, dan kedua tangan mengangkat tongkat ke atas
      if (this.charClass === 'mage' && this.playerMesh) {
        this.playerMesh.leftLeg.rotation.set(0, 0, 0);
        this.playerMesh.rightLeg.rotation.set(0, 0, 0);
        this.playerMesh.body.rotation.set(-0.06, 0, 0);
        // Lengan Kanan & Kiri: Mengangkat tongkat sihir ke langit menyalurkan energi kosmis
        this.playerMesh.rightArm.rotation.set(-Math.PI * 0.85, -0.15, -0.20);
        this.playerMesh.leftArm.rotation.set(-Math.PI * 0.70, 0.15, 0.20);
        // Orientasi Tongkat: Bagian kristal dan cincin menunjuk tegak ke langit
        this.playerMesh.weapon.rotation.set(Math.PI, 0, 0);
        this.playerMesh.head.rotation.x = -0.35;
      }

      if (this.castingTimer >= this.castingDuration) {
        if (this.castingSkillName === 'Glacial Crystal Barrage') {
          this.completeGlacialCrystalBarrageCasting();
        } else {
          this.completeCelestialApocalypseCasting();
        }
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
      let groundY = getExactMeshGroundHeight(this.playerPos.x, this.playerPos.z);
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
    this.isMoving = isMoving;

    let baseSpeed = 7.0;
    if (this.charClass === 'warrior') baseSpeed = 6.8;
    else if (this.charClass === 'mage') baseSpeed = 7.3;
    else if (this.charClass === 'rogue') baseSpeed = 8.8;

    if (this.speedBuffTimer > 0) {
      this.speedBuffTimer -= delta;
      baseSpeed += 3.2;
    }

    // Sprint detection for Warrior, Rogue (Ninja/Assassin), and Mage (Floating Sprint)
    const isShiftPressed = this.isKeyPressed('shift', 'shiftleft', 'shiftright');
    const joyDist = Math.hypot(this.joystickVector.x, this.joystickVector.y);
    const isJoySprint = joyDist > 0.80;
    const hasStamina = this.playerStamina > 0;

    if (
      !this.isAimGlacialActive &&
      !this.isAimingBow &&
      !this.isAimingArrowVolley &&
      (this.charClass === 'warrior' || this.charClass === 'rogue' || this.charClass === 'mage') &&
      isMoving &&
      (isShiftPressed || isJoySprint) &&
      hasStamina &&
      !this.isDashing &&
      !this.isChargingAttack
    ) {
      this.isSprinting = true;
      this.sprintDrainAccum += delta * 12;
      if (this.sprintDrainAccum >= 1.0) {
        const drain = Math.floor(this.sprintDrainAccum);
        this.sprintDrainAccum -= drain;
        this.callbacks.onUpdateStats((s) => ({
          ...s,
          stamina: Math.max(0, s.stamina - drain),
        }));
      }

      // Spawning Mage Astral Glide Magical Energy & Wind Stream
      if (this.charClass === 'mage') {
        this.spawnMageAstralGlideStream();
      }
    } else {
      this.isSprinting = false;
      this.sprintDrainAccum = 0;
    }

    // Auto-Sheathe saat Ninja Sprint & Auto-Unsheathe saat kembali ke mode tempur
    if (this.charClass === 'rogue') {
      const shouldSheathe =
        this.isSprinting &&
        isMoving &&
        hasStamina &&
        !this.isAttacking &&
        !this.isAimingBow &&
        !this.isAimingArrowVolley &&
        !this.isGaleVaulting;

      if (shouldSheathe) {
        if (!this.isHunterSheathed) {
          this.isHunterSheathed = true;
          if (this.playerMesh?.setHunterSheathed) {
            this.playerMesh.setHunterSheathed(true);
          } else if (this.playerMesh?.group) {
            updateHunterWeaponStance(this.playerMesh.group, this.hunterWeaponMode, true);
          }
        }
      } else {
        if (this.isHunterSheathed) {
          this.unsheatheHunterWeapon();
        }
      }
    }

    let targetSpeed = baseSpeed;
    if (this.isAimGlacialActive) {
      targetSpeed = baseSpeed * 0.55; // 55% normal movement speed while aiming Glacial Barrage
    } else if (this.isAimingBow) {
      targetSpeed = baseSpeed * 0.65; // Strafe walk 65% speed while aiming Hunter Bow
    } else if (this.isAimingArrowVolley) {
      targetSpeed = baseSpeed * 0.65; // Strafe walk 65% speed while aiming Skyward Arrow Volley
    } else {
      if (this.bossManager?.playerDebuffs?.isSlowed) {
        targetSpeed *= 0.5; // Efek Slow -50% pergerakan dari Boss / Sand Spikes
      }
      if (this.isDashing) {
        targetSpeed = this.charClass === 'rogue' ? 24.0 : this.charClass === 'warrior' ? 19.0 : 16.0;
      } else {
        if (this.isSprinting) {
          targetSpeed *= (this.charClass === 'mage' ? 1.65 : 1.45); // Mage: Kecepatan gerak meningkat 1.65x lipat saat Terbang Cepat (Astral Glide)
        }
        if (isPointOnRoad(this.playerPos.x, this.playerPos.z)) {
          // Buff Pergerakan Jalur Jalan (Movement Speed +15% saat berlari di atas jalan raya/setapak)
          targetSpeed *= 1.15;
        }
      }
    }

    if (this.cataclysmicLeaping || this.isGaleVaulting) {
      // Pertahankan momentum dorongan horizontal lompatan parabola Cataclysmic Leap / Gale Vault tanpa ditimpa input WASD / rapid stop
    } else if (isMoving) {
      // Normalize movement direction
      moveDirX /= inputMagnitude;
      moveDirZ /= inputMagnitude;

      this.playerVel.x = moveDirX * targetSpeed;
      this.playerVel.z = moveDirZ * targetSpeed;

      // Rotate player mesh smoothly to facing direction
      if (this.isAimGlacialActive || this.isAimingBow || this.isAimingArrowVolley) {
        // Karakter menghadap searah pandangan kamera (strafe movement)
        const camFwdX = -Math.sin(this.cameraAngleH);
        const camFwdZ = -Math.cos(this.cameraAngleH);
        this.playerRotationY = Math.atan2(camFwdX, camFwdZ);
        if (this.playerMesh?.group) {
          this.playerMesh.group.rotation.y = this.playerRotationY;
        }
        if (this.isAimGlacialActive) {
          this.mageBankingRoll = THREE.MathUtils.lerp(this.mageBankingRoll, 0, Math.min(1.0, delta * 8.0));
        }
      } else {
        // Player mesh front faces +Z (0, 0, 1), so angle is Math.atan2(moveDirX, moveDirZ)
        const targetAngle = Math.atan2(moveDirX, moveDirZ);
        let angleDiff = targetAngle - this.playerRotationY;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.playerRotationY += angleDiff * 16 * delta;

        // Kemiringan samping (banking roll) saat berbelok di udara bagi Mage
        if (this.charClass === 'mage' && this.isSprinting) {
          const desiredRoll = Math.max(-0.25, Math.min(0.25, angleDiff * 0.7));
          this.mageBankingRoll = THREE.MathUtils.lerp(this.mageBankingRoll, desiredRoll, Math.min(1.0, delta * 10.0));
        } else {
          this.mageBankingRoll = THREE.MathUtils.lerp(this.mageBankingRoll, 0, Math.min(1.0, delta * 8.0));
        }
      }

      // Spawn movement footsteps
      if (this.isGrounded) {
        this.footstepTimer -= delta;
        if (this.footstepTimer <= 0) {
          this.footstepTimer = this.charClass === 'rogue' ? 0.22 : 0.32;
          this.spawnFootstepVfx(this.charClass === 'mage' ? 'arcane' : this.charClass === 'rogue' ? 'shadow' : 'dust');
        }
      }
    } else {
      // Rapid stop: clamp velocity to 0 immediately when no movement input is active (kecuali Gale Vault)
      if (!this.isGaleVaulting) {
        this.playerVel.x *= 0.4;
        this.playerVel.z *= 0.4;
        if (Math.abs(this.playerVel.x) < 0.04) this.playerVel.x = 0;
        if (Math.abs(this.playerVel.z) < 0.04) this.playerVel.z = 0;
      }
      if (this.isAimGlacialActive || this.isAimingBow || this.isAimingArrowVolley) {
        const camFwdX = -Math.sin(this.cameraAngleH);
        const camFwdZ = -Math.cos(this.cameraAngleH);
        this.playerRotationY = Math.atan2(camFwdX, camFwdZ);
        if (this.playerMesh?.group) {
          this.playerMesh.group.rotation.y = this.playerRotationY;
        }
      }
      this.mageBankingRoll = THREE.MathUtils.lerp(this.mageBankingRoll, 0, Math.min(1.0, delta * 8.0));
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

    // Expanded World boundary constraints (Spans all biomes from X[-600..600] and Z[-600..350])
    if (nextX < -595) nextX = -595;
    if (nextX > 595) nextX = 595;
    if (nextZ < -595) nextZ = -595;
    if (nextZ > 345) nextZ = 345;

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

    // Check quest discovery for Grand Imperial Kingdom of Astraea (Northwest Plains)
    if (Math.hypot(nextX - -250, nextZ - -210) <= 65) {
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
      const groundY = getExactMeshGroundHeight(this.playerPos.x, this.playerPos.z);
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

    // Absolute ground floor clamp: prevent sinking into terrain during delta spike or steep slope descents
    if (!inThroneRoom && !inMageTower) {
      const minFloorY = getExactMeshGroundHeight(this.playerPos.x, this.playerPos.z);
      if (this.playerPos.y < minFloorY) {
        this.playerPos.y = minFloorY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
    }

    // Cataclysmic Leap Slam: Deteksi pendaratan presisi saat menyentuh tanah
    if (this.cataclysmicLeaping && this.isGrounded && !this.cataclysmicLanded) {
      this.triggerCataclysmicLandingImpact();
    }

    // Update mesh position and rotation (KUNCI MUTLAK: X=0, Z=0 kecuali Astral Glide Mage dan Gale Vault Pemburu)
    this.playerMesh.group.position.copy(this.playerPos);
    if (this.charClass !== 'mage') {
      if (this.isGaleVaulting) {
        const progress = THREE.MathUtils.clamp((0.45 - this.galeVaultTimer) / 0.45, 0, 1);
        const flipAngle = -Math.PI * 2 * progress;
        this.playerMesh.group.rotation.set(flipAngle, this.playerRotationY, 0);
      } else {
        this.playerMesh.group.rotation.set(0, this.playerRotationY, 0);
      }
    }
    if (this.playerMesh.rotation) {
      if (this.isGaleVaulting) {
        const progress = THREE.MathUtils.clamp((0.45 - this.galeVaultTimer) / 0.45, 0, 1);
        const flipAngle = -Math.PI * 2 * progress;
        this.playerMesh.rotation.set(flipAngle, this.playerRotationY, 0);
      } else {
        this.playerMesh.rotation.set(0, this.playerRotationY, 0);
      }
    }

    // Role-specific posture offsets
    if (this.charClass === 'mage') {
      this.playerMesh.group.rotation.order = 'YXZ';
      const isAstralGlide = this.isSprinting && isMoving && this.playerStamina > 0;
      const targetHover = isAstralGlide ? 0.45 + Math.sin(this.walkTime * 7.0) * 0.08 : 0.0;
      this.mageHoverOffsetY = THREE.MathUtils.lerp(this.mageHoverOffsetY, targetHover, Math.min(1.0, delta * 8.0));
      this.playerMesh.group.position.y += this.mageHoverOffsetY;

      if (this.mageLandingCrouchTimer > 0) {
        this.mageLandingCrouchTimer = Math.max(0, this.mageLandingCrouchTimer - delta);
        const crouchRatio = this.mageLandingCrouchTimer / 0.15;
        this.playerMesh.group.position.y -= 0.10 * crouchRatio;
      }

      // Kemiringan badan dikendalikan di animateMageWalk (body.rotation.x = 0.42 rad)
      this.playerMesh.group.rotation.y = this.playerRotationY;
      this.playerMesh.group.rotation.x = 0;
      const targetRoll = isAstralGlide ? this.mageBankingRoll : 0.0;
      this.playerMesh.group.rotation.z = THREE.MathUtils.lerp(this.playerMesh.group.rotation.z, targetRoll, Math.min(1.0, delta * 8.0));
    } else if (this.charClass === 'rogue') {
      // Kunci mutlak postur tegak Assassin tanpa forward prowl crouch di sumbu X agar tidak miring saat drag mouse
      if (!this.isGaleVaulting) {
        this.playerMesh.group.rotation.x = 0;
        this.playerMesh.group.rotation.z = 0;
      }
      if (this.playerMesh.body) {
        this.playerMesh.body.rotation.x = (this.isSprinting && isMoving && this.playerStamina > 0) ? 0.32 : 0;
        this.playerMesh.body.rotation.z = 0;
      }
    } else if (this.charClass === 'warrior') {
      // Requirement 5: Stabilitas postur tegak lurus tanpa tilt/roll goyang saat bergerak, lari, maupun berputar
      this.playerMesh.group.rotation.x = 0;
      this.playerMesh.group.rotation.z = 0;
      this.playerMesh.body.rotation.x = 0;
      this.playerMesh.body.rotation.z = 0;
    } else {
      this.playerMesh.group.rotation.x = 0;
      this.playerMesh.group.rotation.z = 0;
    }

    // Limb animations
    if (isMoving) {
      const walkFreq = this.charClass === 'rogue' ? 15 : this.charClass === 'mage' ? 8 : 10;
      this.walkTime += delta * walkFreq;

      if (this.charClass === 'warrior') {
        // Penghalusan Animasi Berjalan Ksatria (Smooth Knight Walk):
        const kWalkFreq = this.isSprinting ? 9 : 6;
        const walkTime = this.clock.getElapsedTime() * kWalkFreq;
        animateKnightWalk(this.playerMesh, walkTime, this.playerPos.y, this.isAttacking || this.isChargingAttack);
        this.playerMesh.body.position.y = 1.48;
        this.playerMesh.body.rotation.z = 0;
        if (!this.isAttacking) {
          this.playerMesh.body.rotation.y = 0;
        }
        this.playerMesh.cape.rotation.x = (this.isSprinting ? 0.60 : 0.30) + Math.sin(walkTime * 0.5) * 0.15;
      } else if (this.charClass === 'mage') {
        // Heroic Blocky Low-Poly Mage Walk Cycle & Floating Sprint Locomotion
        const isAstralGlide = this.isSprinting && this.playerStamina > 0;
        const walkTime = this.clock.getElapsedTime();
        animateMageWalk(this.playerMesh, walkTime, this.playerPos.y + this.mageHoverOffsetY, true, this.isAttacking, isAstralGlide);
      } else if (this.charClass === 'rogue') {
        if (this.isAimingBow) {
          this.walkCycle = (this.walkCycle || 0) + delta * 8.5;
          animateHunterBowAim(
            this.playerMesh,
            this.bowChargeRatio,
            true,
            this.walkCycle,
            delta
          );
        } else {
          const isHunterSprint = this.isSprinting && isMoving && this.playerStamina > 0;
          const moveSpeed = this.isSprinting ? 1.75 : 1.0;
          // Frekuensi dinaikkan 1.45x saat lari cepat agar tapakan kaki lincah membelah angin
          const stepFrequency = this.isSprinting ? 19.5 : 13.5;
          this.walkCycle = (this.walkCycle || 0) + delta * stepFrequency * moveSpeed;

          // Ayunan kaki kiri & kanan
          const legSwing = Math.sin(this.walkCycle);
          const armSwing = Math.cos(this.walkCycle);

          if (isHunterSprint) {
            // ========================================================================
            // POSTUR & ANIMASI LARI ALA NINJA (SHINOBI RUN POSE)
            // ========================================================================
            // 1. Langkah Kaki Cepat & Dinamis: tekukan lutut lebih tinggi
            this.playerMesh.leftLeg.rotation.x = legSwing * 0.95;
            this.playerMesh.rightLeg.rotation.x = -legSwing * 0.95;
            if (this.playerMesh.leftKnee) {
              this.playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.85 : 0.15;
            }
            if (this.playerMesh.rightKnee) {
              this.playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.85 : 0.15;
            }

            // 2. Kedua Lengan Terbentang ke Belakang (Shinobi Arm Sweep)
            if (!this.isAttacking) {
              const armWindSway = Math.sin(this.walkCycle * 2.0) * 0.06;
              const backSweep = 1.05; // 60 derajat ke belakang tubuh melewati pinggul
              this.playerMesh.leftArm.rotation.set(backSweep + armWindSway, 0.05, -0.22);
              this.playerMesh.rightArm.rotation.set(backSweep - armWindSway, -0.05, 0.22);
              this.playerMesh.leftArm.position.set(-0.44, 1.40, 0.10);
              this.playerMesh.rightArm.position.set(0.44, 1.40, 0.10);
            }

            // 3. Kemiringan Tubuh Rendah 32 derajat (0.56 rad)
            if (this.playerMesh.body) {
              this.playerMesh.body.rotation.reorder('YXZ');
              this.playerMesh.body.rotation.x = 0.56;
            }
            // 4. Balas sudut pada kepala agar mata tetap menatap lurus ke depan
            if (this.playerMesh.head) {
              this.playerMesh.head.rotation.x = -0.476; // -0.56 * 0.85
              this.playerMesh.head.position.set(0, 1.45, 0.16);
            }

            if (this.playerMesh.cape) {
              this.playerMesh.cape.rotation.x = 0.78 + Math.abs(Math.sin(this.walkCycle * 0.5)) * 0.25;
            }

            // Efek Jejak Bayangan (Shadow Afterimage Pool) setiap 0.09s & Hembusan Angin Zamrud
            this.hunterAfterimageSpawnTimer -= delta;
            if (this.hunterAfterimageSpawnTimer <= 0) {
              this.hunterAfterimageSpawnTimer = 0.09;
              this.spawnHunterAfterimage();
            }
            if (Math.random() < 0.50) {
              this.spawnSparks(
                this.playerPos.clone().add(
                  new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.08, (Math.random() - 0.5) * 0.4)
                ),
                0x10b981,
                2,
                1.2
              );
            }
          } else {
            // Normal Walking
            this.hunterAfterimageSpawnTimer = 0;
            this.playerMesh.leftLeg.rotation.x = legSwing * 0.75;
            this.playerMesh.rightLeg.rotation.x = -legSwing * 0.75;
            if (this.playerMesh.leftKnee) {
              this.playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.4 : 0;
            }
            if (this.playerMesh.rightKnee) {
              this.playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.4 : 0;
            }

            if (!this.isAttacking) {
              this.playerMesh.leftArm.position.set(-0.44, 1.44, 0.02);
              this.playerMesh.rightArm.position.set(0.44, 1.44, 0.02);
              if (this.hunterWeaponMode === 'bow') {
                this.playerMesh.leftArm.rotation.set(0.04, 0.02, -0.10);
                this.playerMesh.rightArm.rotation.x = -0.4 - armSwing * 0.45;
              } else {
                this.playerMesh.leftArm.rotation.x = -0.4 + armSwing * 0.45;
                this.playerMesh.rightArm.rotation.x = -0.4 - armSwing * 0.45;
              }
            }

            if (this.playerMesh.body) {
              this.playerMesh.body.rotation.x = 0;
            }
            if (this.playerMesh.head) {
              this.playerMesh.head.rotation.set(0, 0, 0);
              this.playerMesh.head.position.set(0, 1.50, 0);
            }
            if (this.playerMesh.cape) {
              this.playerMesh.cape.rotation.x = 0.15 + Math.abs(Math.sin(this.walkCycle * 0.5)) * 0.25;
            }
          }

          if (!this.isGaleVaulting) {
            this.playerMesh.group.rotation.x = 0;
            this.playerMesh.group.rotation.z = 0;
          }
        }
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
        this.playerMesh.group.rotation.z = 0;

        // Breathing cycle halus saat diam
        const breathe = Math.sin(this.clock.getElapsedTime() * 2.0) * 0.015;
        this.playerMesh.body.position.y = THREE.MathUtils.lerp(this.playerMesh.body.position.y, 1.48 + breathe, 0.15);
        if (!this.isAttacking) {
          this.playerMesh.body.rotation.set(0, 0, 0);
        }

        if (!this.isAttacking && !this.isChargingAttack) {
          // Lengan Kiri (Perisai): Tergenggam mantap di samping pinggang/dada luar
          this.playerMesh.leftArm.rotation.set(-0.30, 0.20, 0.15);
          this.playerMesh.leftArm.position.set(0.46, 1.68, 0);

          // Lengan Kanan (Pedang): Rileks di samping pinggang (Requirement 2)
          this.playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(
            this.playerMesh.rightArm.rotation.x,
            -0.28 + breathe * 0.1,
            0.15
          );
          this.playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(
            this.playerMesh.rightArm.rotation.y,
            -0.15,
            0.15
          );
          this.playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(
            this.playerMesh.rightArm.rotation.z,
            -0.22,
            0.15
          );
          this.playerMesh.rightArm.position.set(-0.46, 1.68, 0);
          this.playerMesh.leftArm.position.set(0.46, 1.68, 0);
          this.playerMesh.weapon.position.set(0, -0.04, 0.04);
          this.playerMesh.weapon.rotation.set(1.75, 0.2, 0.1);
        }
      } else if (this.charClass === 'mage') {
        // Heroic Blocky Low-Poly Mage Idle State (Subtle Breathing & Relaxed Staff/Grimoire Pose)
        const walkTime = this.clock.getElapsedTime();
        animateMageWalk(this.playerMesh, walkTime, this.playerPos.y + this.mageHoverOffsetY, false, this.isAttacking);
      } else if (this.charClass === 'rogue') {
        if (this.isAimingBow) {
          animateHunterBowAim(
            this.playerMesh,
            this.bowChargeRatio,
            false,
            0,
            delta
          );
        } else {
          // Saat pemain melepas tombol arah (!this.isMoving):
          // Lakukan lerp cepat (kecepatan 0.25) pada rotation.x kaki dan tangan kembali ke sudut 0 (posisi berdiri netral).
          // Reset atau jeda walkCycle agar langkah tidak berhenti di pose kaki terbelah canggung.
          this.walkCycle = 0;
          this.hunterAfterimageSpawnTimer = 0;
          if (this.playerMesh.leftArm) {
            this.playerMesh.leftArm.position.set(-0.44, 1.44, 0.02);
          }
          if (this.playerMesh.rightArm) {
            this.playerMesh.rightArm.position.set(0.44, 1.44, 0.02);
          }
          if (this.playerMesh.head) {
            this.playerMesh.head.rotation.set(0, 0, 0);
            this.playerMesh.head.position.set(0, 1.50, 0);
          }
          if (this.playerMesh.body) {
            this.playerMesh.body.rotation.set(0, 0, 0);
          }

          if (this.playerMesh.leftLeg) {
            this.playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftLeg.rotation.x, 0, 0.25);
            this.playerMesh.leftLeg.rotation.y = 0;
            this.playerMesh.leftLeg.rotation.z = 0;
          }
          if (this.playerMesh.rightLeg) {
            this.playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightLeg.rotation.x, 0, 0.25);
            this.playerMesh.rightLeg.rotation.y = 0;
            this.playerMesh.rightLeg.rotation.z = 0;
          }
          if (this.playerMesh.leftKnee) {
            this.playerMesh.leftKnee.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftKnee.rotation.x, 0, 0.25);
          }
          if (this.playerMesh.rightKnee) {
            this.playerMesh.rightKnee.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightKnee.rotation.x, 0, 0.25);
          }

          if (!this.isAttacking) {
            if (this.hunterWeaponMode === 'bow') {
              if (this.playerMesh.leftArm) {
                this.playerMesh.leftArm.rotation.set(0.04, 0.02, -0.10);
              }
              if (this.playerMesh.rightArm) {
                this.playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.x, 0, 0.25);
                this.playerMesh.rightArm.rotation.y = 0;
                this.playerMesh.rightArm.rotation.z = 0;
              }
            } else {
              if (this.playerMesh.leftArm) {
                this.playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.x, 0, 0.25);
                this.playerMesh.leftArm.rotation.y = 0;
                this.playerMesh.leftArm.rotation.z = 0;
              }
              if (this.playerMesh.rightArm) {
                this.playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.x, 0, 0.25);
                this.playerMesh.rightArm.rotation.y = 0;
                this.playerMesh.rightArm.rotation.z = 0;
              }
            }
          }

          if (this.playerMesh.cape) {
            this.playerMesh.cape.rotation.x = THREE.MathUtils.lerp(this.playerMesh.cape.rotation.x, 0.12, 0.25);
          }

          if (!this.isGaleVaulting) {
            this.playerMesh.group.rotation.x = 0;
            this.playerMesh.group.rotation.z = 0;
          }
        }
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

    // Kunci mutlak agar badan selalu tegak lurus sempurna di setiap frame (di loop update karakter):
    if (this.playerMesh) {
      const isMageGliding =
        this.charClass === 'mage' &&
        this.isSprinting &&
        isMoving &&
        this.playerStamina > 0;
      if (!isMageGliding && !this.isGaleVaulting) {
        this.playerMesh.group.rotation.x = 0;
        this.playerMesh.group.rotation.z = 0;
        if (this.playerMesh.rotation) {
          this.playerMesh.rotation.x = 0;
          this.playerMesh.rotation.z = 0;
        }
        const isHunterSprint = this.charClass === 'rogue' && this.isSprinting && isMoving && this.playerStamina > 0;
        if (this.playerMesh.body) {
          this.playerMesh.body.rotation.reorder('YXZ');
          this.playerMesh.body.rotation.x = isHunterSprint ? 0.56 : 0;
          this.playerMesh.body.rotation.z = 0; // KUNCI MUTLAK: DILARANG MIRING
        }
        this.playerMesh.group.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
            if (
              child.name.toLowerCase().includes('body') ||
              child.name.toLowerCase().includes('torso') ||
              child.name.toLowerCase().includes('chest') ||
              child === (this.playerMesh as any).body
            ) {
              child.rotation.x = isHunterSprint ? 0.56 : 0;
              child.rotation.z = 0;
            }
          }
        });
        if (this.playerMesh.head) {
          this.playerMesh.head.rotation.x = isHunterSprint ? -0.476 : 0;
          this.playerMesh.head.position.set(0, isHunterSprint ? 1.45 : 1.50, isHunterSprint ? 0.16 : 0);
        }
      }
      if (!this.isAttacking) {
        if (this.playerMesh.body && !isMageGliding) {
          this.playerMesh.body.rotation.y = THREE.MathUtils.lerp(this.playerMesh.body.rotation.y || 0, 0, 0.2);
          if (Math.abs(this.playerMesh.body.rotation.y) < 0.001) {
            this.playerMesh.body.rotation.y = 0;
          }
        }
      }
    }

    // Warrior Dynamic Charge Attack Stance & Resource Loop
    if (this.charClass === 'warrior' && this.isChargingAttack) {
      this.chargeTimer += delta;

      if (this.chargeTimer < 1.0) {
        // Detik 0.0 - 1.0 (Mengangkat): Lengan kanan mengayunkan pedang melengkung dari depan-bawah, naik vertikal ke atas kepala, lalu bertumpu ke belakang kepala
        const p = this.chargeTimer / 1.0;
        const ease = p * p * (3 - 2 * p);
        this.playerMesh.rightArm.rotation.set(
          THREE.MathUtils.lerp(-0.55, -2.85, ease),
          THREE.MathUtils.lerp(-0.10, 0.10, ease),
          THREE.MathUtils.lerp(-0.20, -0.20, ease)
        );
        this.playerMesh.rightArm.position.set(-0.46, 1.68, 0);
        this.playerMesh.weapon.position.set(0, -0.04, 0.04);
        this.playerMesh.weapon.rotation.set(
          THREE.MathUtils.lerp(2.35, 1.57, ease),
          0,
          THREE.MathUtils.lerp(0.15, 0, ease)
        );
        this.playerMesh.leftArm.rotation.set(-0.25, 0.20, 0.18);
        this.playerMesh.leftArm.position.set(0.46, 1.68, 0);
        this.playerMesh.body.rotation.set(0, 0, 0);
        setKnightBladeGlow(this.playerMesh, 0.3 * ease, 0xffd700);
      } else if (this.chargeTimer <= 5.0) {
        // Detik 1.0 - 5.0 (Menahan & Penyerapan Energi): Mengonsumsi 10 stamina/detik saat ditahan
        this.playerMesh.rightArm.rotation.set(-2.85, 0.10, -0.20);
        this.playerMesh.rightArm.position.set(-0.46, 1.68, 0);
        this.playerMesh.weapon.position.set(0, -0.04, 0.04);
        this.playerMesh.weapon.rotation.set(1.57, 0, 0);
        this.playerMesh.leftArm.rotation.set(-0.25, 0.20, 0.18);
        this.playerMesh.leftArm.position.set(0.46, 1.68, 0);
        this.playerMesh.body.rotation.set(0, 0, 0);

        this.chargeDrainAccum += delta * 10;
        if (this.chargeDrainAccum >= 1.0) {
          const drain = Math.floor(this.chargeDrainAccum);
          this.chargeDrainAccum -= drain;
          this.callbacks.onUpdateStats((s) => ({
            ...s,
            stamina: Math.max(0, s.stamina - drain),
          }));
        }

        // Partikel energi emas terserap masuk ke bilah pedang
        this.chargeParticleTimer -= delta;
        if (this.chargeParticleTimer <= 0) {
          this.chargeParticleTimer = 0.06;
          this.spawnChargeGatherParticles();
        }

        // Emisi cahaya pedang menguat bertahap dari redup hingga berpendar kuat di detik ke-5
        const glowRatio = (this.chargeTimer - 1.0) / 4.0;
        setKnightBladeGlow(this.playerMesh, 0.4 + glowRatio * 2.2, 0xffd700);
      } else {
        // Detik > 5.0: Karakter tetap mempertahankan pose siap tebas (tidak mengonsumsi stamina tambahan, tidak menambah damage lagi)
        this.playerMesh.rightArm.rotation.set(-2.85, 0.10, -0.20);
        this.playerMesh.rightArm.position.set(-0.46, 1.68, 0);
        this.playerMesh.weapon.position.set(0, -0.04, 0.04);
        this.playerMesh.weapon.rotation.set(1.57, 0, 0);
        this.playerMesh.leftArm.rotation.set(-0.25, 0.20, 0.18);
        this.playerMesh.leftArm.position.set(0.46, 1.68, 0);
        this.playerMesh.body.rotation.set(0, 0, 0);
        setKnightBladeGlow(this.playerMesh, 2.6, 0xffd700);
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
        animateKnightCombatPose(this.playerMesh, {
          attackType: this.attackType,
          progress,
          attackDuration: this.attackDuration || 0.35,
          attackTimer: this.attackTimer,
          delta,
        });
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
        if (this.attackType === 'hunter_gale_vault') {
          // Acrobatic backflip pose: legs tucked slightly, arms braced
          this.playerMesh.leftArm.rotation.set(-1.4, 0.1, -0.2);
          this.playerMesh.rightArm.rotation.set(-1.4, -0.1, 0.2);
          if (this.playerMesh.leftLeg) this.playerMesh.leftLeg.rotation.x = 0.5;
          if (this.playerMesh.rightLeg) this.playerMesh.rightLeg.rotation.x = 0.5;
        } else if (this.attackType === 'hunter_phantom_decoy') {
          // Low forward dash pose
          this.playerMesh.leftArm.rotation.set(0.6, 0, 0.5);
          this.playerMesh.rightArm.rotation.set(0.6, 0, -0.5);
        } else if (this.attackType === 'flurry') {
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
        if (this.charClass === 'warrior' && this.playerMesh) {
          this.playerMesh.body.rotation.set(0, 0, 0);
          this.playerMesh.leftArm.position.set(0.46, 1.68, 0);
          this.playerMesh.rightArm.position.set(-0.46, 1.68, 0);
          this.playerMesh.leftArm.rotation.set(-0.30, 0.20, 0.15);
          this.playerMesh.rightArm.rotation.set(-0.28, -0.15, -0.22);
          this.playerMesh.weapon.position.set(0, -0.04, 0.04);
          this.playerMesh.weapon.rotation.set(1.75, 0.2, 0.1);
          resetKnightBladeGlow(this.playerMesh);
        } else if (this.charClass === 'mage' && this.playerMesh?.body) {
          this.playerMesh.body.rotation.set(0, 0, 0);
          this.playerMesh.body.position.y = 1.35;
          this.playerMesh.weapon.rotation.set(0.32, 0.10, 0.05);
          if (this.playerMesh.grimoire) {
            this.playerMesh.grimoire.position.set(-0.08, 0.08, 0.02);
            this.playerMesh.grimoire.rotation.set(0.20, 0, 0);
          }
          this.playerMesh.leftArm.rotation.set(0, 0, 0);
          this.playerMesh.rightArm.rotation.set(0, 0, 0);
        } else if (this.charClass === 'rogue' && this.playerMesh?.body) {
          this.playerMesh.body.rotation.set(0, 0, 0);
          this.playerMesh.leftArm.rotation.set(0, 0, 0);
          this.playerMesh.rightArm.rotation.set(0, 0, 0);
        } else if (this.playerMesh) {
          this.playerMesh.leftArm.rotation.set(0, 0, 0);
          this.playerMesh.rightArm.rotation.set(0, 0, 0);
        }
      }
    }

    // Shield and Aegis Retribution timers
    if (this.aegisRetributionTimer > 0) {
      this.aegisRetributionTimer = Math.max(0, this.aegisRetributionTimer - delta);
    }
    if (this.playerShieldTimer > 0) {
      this.playerShieldTimer = Math.max(0, this.playerShieldTimer - delta);
      if (this.playerShieldTimer <= 0 && this.playerShield > 0) {
        this.playerShield = 0;
        this.playerMaxShield = 0;
        this.callbacks.onUpdateStats((s) => ({
          ...s,
          shield: 0,
          maxShield: 0,
          shieldDuration: 0,
        }));
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

    // Fountain Healing area in village plaza [-40, 145]
    const distFountain = this.playerPos.distanceTo(new THREE.Vector3(-40, 0, 145));
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

    // Resource regeneration
    if (this.charClass === 'warrior') {
      // HP has NO natural passive regeneration for Warrior (only items/potions/fountain)

      // Aura passive regen (+5 pts/s up to maxMp)
      this.auraRegenAccum += delta * 5;
      let auraGain = 0;
      if (this.auraRegenAccum >= 1.0) {
        auraGain = Math.floor(this.auraRegenAccum);
        this.auraRegenAccum -= auraGain;
      }

      // Stamina fast passive regen (+25 pts/s when not dashing, sprinting, or charging)
      let staminaGain = 0;
      if (!this.isDashing && !this.isSprinting && !this.isChargingAttack) {
        this.staminaRegenAccum += delta * 25;
        if (this.staminaRegenAccum >= 1.0) {
          staminaGain = Math.floor(this.staminaRegenAccum);
          this.staminaRegenAccum -= staminaGain;
        }
      } else {
        this.staminaRegenAccum = 0;
      }

      if (auraGain > 0 || staminaGain > 0) {
        this.callbacks.onUpdateStats((stats) => {
          let updated = stats;
          if (auraGain > 0 && stats.mp < stats.maxMp) {
            updated = { ...updated, mp: Math.min(stats.maxMp, stats.mp + auraGain) };
          }
          if (staminaGain > 0 && stats.stamina < stats.maxStamina) {
            updated = { ...updated, stamina: Math.min(stats.maxStamina, stats.stamina + staminaGain) };
          }
          return updated;
        });
      }
    } else {
      // Stamina regeneration for other classes
      this.callbacks.onUpdateStats((stats) => {
        if (stats.stamina < stats.maxStamina) {
          return { ...stats, stamina: Math.min(stats.maxStamina, stats.stamina + delta * 8) };
        }
        return stats;
      });
    }

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

    // Kunci mutlak sanitasi rotasi karakter Assassin & semua class di akhir updatePlayer
    if (this.playerMesh) {
      this.playerMesh.group.rotation.x = 0;
      this.playerMesh.group.rotation.z = 0;
      if (this.playerMesh.rotation) {
        this.playerMesh.rotation.x = 0;
        this.playerMesh.rotation.z = 0;
      }
      this.playerMesh.group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
          if (
            child.name.toLowerCase().includes('body') ||
            child.name.toLowerCase().includes('torso') ||
            child.name.toLowerCase().includes('chest') ||
            child === (this.playerMesh as any).body
          ) {
            child.rotation.x = 0;
            child.rotation.z = 0;
          }
        }
      });
    }

    // Check nearby prompts (NPC / Chest)
    this.updateNearbyPrompts();
  }

  private updateNearbyPrompts() {
    // 0a. Check Taj Mahal Palace Entrance (Overworld -> Throne Room)
    const distToPalaceGate = Math.hypot(this.playerPos.x - -396, this.playerPos.z - 350);
    if (distToPalaceGate < 4.5 && this.playerPos.y > -10) {
      this.setNearbyPrompt('Tekan [F] / Sentuh untuk Masuk Istana Sultan Solaria 🕌', () => {
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
      this.setNearbyPrompt('Tekan [F] / Sentuh untuk Keluar ke Pelataran Istana 🚪', () => {
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
            prompt = `Tekan [F] / Sentuh: Toko Senjata & Tempa Master Torvald 🔨`;
          } else if (npc.id === 'alchemist_anya') {
            prompt = `Tekan [F] / Sentuh: Toko Ramuan Alkimia Anya 🧪`;
          } else if (npc.id === 'villager_maya') {
            prompt = `Tekan [F] / Sentuh: Toko Zirah & Perlengkapan Maya 🛡️`;
          } else if (npc.id === 'fisherman_joko') {
            prompt = `Tekan [F] / Sentuh: Kios Hasil Laut & Bekal Pak Joko 🐟`;
          } else if (npc.id === 'villager_kael') {
            prompt = `Tekan [F] / Sentuh: Pasar Gelap Artefak Kael 🗣️`;
          } else if (npc.id === 'commander_brann') {
            prompt = `Tekan [F] / Sentuh: Komandan Brann (Panglima Benteng Val-Kragor) 🏰`;
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
          } else if (npc.id === 'sultan_malik') {
            prompt = `Tekan [F] / Sentuh: Paduka Sultan Malik al-Solaria (Istana Kubah Emas) 👑`;
          } else if (npc.id === 'merchant_tariq') {
            prompt = `Tekan [F] / Sentuh: Toko Rempah & Sutra Saudagar Tariq 👳‍♂️`;
          } else if (npc.id === 'oasis_amina') {
            prompt = `Tekan [F] / Sentuh: Amina Gadis Pembawa Air Oase 🧕`;
          } else if (npc.id === 'weaver_zahra') {
            prompt = `Tekan [F] / Sentuh: Kios Karpet & Sutra Pengrajin Zahra 🧕`;
          } else if (npc.id === 'guard_solaria' || npc.id === 'guard_throne_1' || npc.id === 'guard_throne_2') {
            prompt = `Tekan [F] / Sentuh: Prajurit Pengawal Gurun Solaria 🛡️`;
          } else if (npc.id === 'grand_mage_eldrin') {
            prompt = `Tekan [F] / Sentuh: Grand Mage Eldrin (Penjaga Kitab Halilintar) 🧙‍♂️`;
          } else if (npc.id === 'archmage_pyro') {
            prompt = `Tekan [F] / Sentuh: Archmage Pyro (Ahli Alkimia Api) 🔥`;
          } else if (npc.id === 'sorceress_maya') {
            prompt = `Tekan [F] / Sentuh: Sorceress Maya (Pengkaji Kitab Kuno) ✨`;
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
    // Optimization: Skip all monster AI, pathfinding and distant updates in main menu and role selection
    if (this.menuMode !== 'gameplay') return;

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
    this.bossManager.update(delta, this.playerPos, this.playerVel, this.isDashing || this.isInvulnerable, !this.isGrounded);

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

      // Boss Titan, Dragon & Worm permanent scale lock on update loop
      if (enemy.data.id === 'boss_dragonfang') {
        enemy.mesh.scale.set(4.2, 4.2, 4.2);
      } else if (enemy.data.id === 'boss_jarrus') {
        enemy.mesh.scale.set(1.0, 1.0, 1.0);
      } else if (enemy.data.type === 'boss') {
        enemy.mesh.scale.set(3.5, 3.5, 3.5);
      } else if (enemy.data.type === 'golem') {
        enemy.mesh.scale.set(1.35, 1.35, 1.35);
      }

      const ePos = enemy.mesh.position;
      const spawnPos = enemy.spawnPos || new THREE.Vector3(...enemy.data.position);
      const distFromSpawn = Math.hypot(ePos.x - spawnPos.x, ePos.z - spawnPos.z);
      const distToPlayer = this.playerPos.distanceTo(ePos);

      // Physics: Vertical knock-up and radial velocity
      if (enemy.velocity && (Math.abs(enemy.velocity.x) > 0.01 || Math.abs(enemy.velocity.y) > 0.01 || Math.abs(enemy.velocity.z) > 0.01)) {
        ePos.x += enemy.velocity.x * delta;
        ePos.z += enemy.velocity.z * delta;
        ePos.y += enemy.velocity.y * delta;
        enemy.velocity.y -= 26.0 * delta; // Gravity
        enemy.velocity.x *= Math.max(0, 1 - 4.0 * delta); // Friction
        enemy.velocity.z *= Math.max(0, 1 - 4.0 * delta);
        const groundH = this.world.getTerrainHeight(ePos.x, ePos.z);
        if (ePos.y <= groundH) {
          ePos.y = groundH;
          enemy.velocity.set(0, 0, 0);
        }
      }

      // Status Effects: Stun, Slow, Brittle
      if (enemy.slowTimer && enemy.slowTimer > 0) {
        enemy.slowTimer -= delta;
      }
      if (enemy.brittleTimer && enemy.brittleTimer > 0) {
        enemy.brittleTimer -= delta;
      }
      if (enemy.armorBreakTimer && enemy.armorBreakTimer > 0) {
        enemy.armorBreakTimer -= delta;
      }
      if (enemy.stunTimer && enemy.stunTimer > 0) {
        enemy.stunTimer -= delta;
        return; // Stunned: skip movement and attacks
      }

      const slowMult = (enemy.slowTimer && enemy.slowTimer > 0) ? (1 - (enemy.slowFactor || 0.55)) : 1.0;
      const territoryRadius =
        enemy.leashRadius ||
        (enemy.data.id === 'boss_dragonfang'
          ? 48
          : enemy.data.id === 'boss_titan'
            ? 42
            : enemy.data.id === 'boss_jarrus'
              ? 48
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
          const returnSpeed = enemy.data.speed * slowMult * delta;
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
        } else {
          // Monster berada di sarang dan pemain di luar jangkauan: tetap tenang/idle di sarang
          return;
        }
      }

      // STATE 2.5: Boss Specialized Attack Skills & Ground Telegraph Danger Zones (Hanya jika pemain dalam jangkauan & boss di arena)
      if (enemy.data.type === 'boss' && distToPlayer <= enemy.data.detectRange && distFromSpawn <= territoryRadius) {
        const isCasting = this.bossManager.updateBossBehavior(enemy, this.playerPos, delta, !this.isGrounded, this.playerVel);
        if (isCasting) {
          return;
        }
      }

      // Check if Hunter Shadow Decoy is active and within 8.0 units of this enemy
      const distToDecoy = this.activeShadowDecoy && this.activeShadowDecoy.active
        ? ePos.distanceTo(this.activeShadowDecoy.pos)
        : Infinity;
      const isTauntedByDecoy = distToDecoy <= 8.0;

      const currentTargetPos = isTauntedByDecoy ? this.activeShadowDecoy!.pos : this.playerPos;
      const distToCurrentTarget = isTauntedByDecoy ? distToDecoy : distToPlayer;

      // STATE 3: Jika target dalam jarak deteksi dan monster masih di dalam wilayahnya -> kejar & serang
      if ((isTauntedByDecoy || distToPlayer <= enemy.data.detectRange) && distFromSpawn <= territoryRadius) {
        const toTarget = new THREE.Vector3().subVectors(currentTargetPos, ePos).normalize();
        const targetRotY = Math.atan2(toTarget.x, toTarget.z);
        enemy.mesh.rotation.y = targetRotY;

        if (distToCurrentTarget > enemy.data.attackRange) {
          const baseSpeed = enemy.data.id === 'boss_dragonfang' ? 5.8 : enemy.data.speed;
          const moveSpeed = baseSpeed * slowMult * delta;
          ePos.x += toTarget.x * moveSpeed;
          ePos.z += toTarget.z * moveSpeed;
          ePos.y = this.world.getTerrainHeight(ePos.x, ePos.z);

          enemy.walkCycle += delta * (enemy.data.id === 'boss_dragonfang' ? 9.5 : 6);
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
          // Serang target sesuai cooldown (1.5 detik untuk monster biasa)
          enemy.attackCooldown -= delta;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1.5;
            enemy.attackAnimTimer = 0.35; // Trigger monster attack swing / lunge
            if (isTauntedByDecoy) {
              // Menyerang Shadow Decoy (animasi serang tanpa melukai player)
              soundManager.playHit();
              this.spawnSparks(this.activeShadowDecoy!.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x064e3b, 8, 3.0);
            } else {
              this.enemyAttackPlayer(enemy);
            }
          }
        }
      } else if (distFromSpawn > 1.2) {
        // Player tidak di sekitar dan monster tidak di titik asal -> kembali pulang
        enemy.isReturning = true;
      }
    });

    this.updateBossCombatZoneAndMusic(delta);
  }

  /**
   * Zone-Based Combat Trigger & Boss Bar / Music Persistence System
   * 1. Bounding arena radius: Titan: 42m, Naga: 48m, Sandworm: 48m.
   * 2. When player distance to boss arena center <= arenaRadius:
   *    - inBossZone = true
   *    - Boss Bar remains active and visible regardless of distance from 3D model
   *    - Play Boss BGM
   *    - exitBossZoneTimer = 0
   * 3. When player steps out (> arenaRadius):
   *    - Countdown exitBossZoneTimer for 5.0 seconds
   *    - If player re-enters before 5.0s, timer resets to 0 and boss bar/music persist
   *    - If after 5.0s player stays outside:
   *      - Fade-out boss bar
   *      - Cross-fade audio (2.0s) back to chill overworld BGM
   *      - Boss returns / leashes back to spawn
   */
  private updateBossCombatZoneAndMusic(delta: number) {
    let playerInsideZone: BossArenaZone | null = null;
    for (const zone of Object.values(BOSS_ARENA_ZONES)) {
      const dist = Math.hypot(this.playerPos.x - zone.center.x, this.playerPos.z - zone.center.z);
      if (dist <= zone.radius) {
        playerInsideZone = zone;
        break;
      }
    }

    if (playerInsideZone) {
      const boss = this.enemies.find((e) => e.data.id === playerInsideZone!.id);
      if (boss && !boss.data.isDead && (boss.data.hp ?? 0) > 0) {
        this.inBossCombatZone = true;
        this.currentBossZone = playerInsideZone;
        this.activeBossEnemyData = boss.data;
        this.exitBossZoneTimer = 0; // Reset countdown while in arena
      } else {
        // Boss is dead
        this.inBossCombatZone = false;
        this.currentBossZone = null;
        this.activeBossEnemyData = null;
        this.exitBossZoneTimer = 0;
      }
    } else if (this.inBossCombatZone && this.currentBossZone) {
      // Player stepped outside the arena radius: start countdown 5.0 seconds!
      this.exitBossZoneTimer += delta;
      const boss = this.enemies.find((e) => e.data.id === this.currentBossZone!.id);
      if (boss) {
        this.activeBossEnemyData = boss.data;
      }
      if (this.exitBossZoneTimer >= 5.0 || !boss || boss.data.isDead || (boss.data.hp ?? 0) <= 0) {
        // 5 seconds elapsed outside: fade out boss bar & crossfade music to chill overworld!
        this.inBossCombatZone = false;
        this.currentBossZone = null;
        this.activeBossEnemyData = null;
        this.exitBossZoneTimer = 0;
        soundManager.evadeBossMusic(2.0);
        if (boss && !boss.data.isDead) {
          boss.isReturning = true;
        }
      }
    }

    const isBossActive =
      this.inBossCombatZone &&
      this.activeBossEnemyData !== null &&
      (this.activeBossEnemyData.hp ?? 0) > 0;

    this.callbacks.onBossEncounter(
      isBossActive,
      this.activeBossEnemyData ? this.activeBossEnemyData.nameId : undefined,
      this.activeBossEnemyData ? this.activeBossEnemyData.hp : undefined,
      this.activeBossEnemyData ? this.activeBossEnemyData.maxHp : undefined
    );

    if (isBossActive && this.currentBossZone) {
      soundManager.playBossMusic(this.currentBossZone.bossType);
    } else if (!this.inBossCombatZone && soundManager.getCurrentBossMusic()) {
      soundManager.evadeBossMusic(2.0);
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

      // Boss Titan, Dragon & Worm permanent scale lock in multiplayer loop
      if (enemy.data.id === 'boss_dragonfang') {
        enemy.mesh.scale.set(4.2, 4.2, 4.2);
      } else if (enemy.data.id === 'boss_jarrus') {
        enemy.mesh.scale.set(1.0, 1.0, 1.0);
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

    this.updateBossCombatZoneAndMusic(delta);
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
          } catch { }
          this.callbacks.onAddFloatingText(`📍 Titik Respawn Disimpan: ${town.name}`, '#38bdf8', 'info');
        }

        // Auto-unlock waypoint for fast travel on map
        if (!this.unlockedCheckpoints.has(town.waypointId)) {
          this.unlockedCheckpoints.add(town.waypointId);
          try {
            localStorage.setItem(
              'eldoria_unlocked_checkpoints',
              JSON.stringify(Array.from(this.unlockedCheckpoints))
            );
          } catch { }
          soundManager.playCheckpointUnlock();
          this.callbacks.onAddFloatingText(`🌟 Wilayah Terbuka: ${town.name}!`, '#00e5ff', 'crit');
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

  // Spawn flying magma fireball projectile for Ignis Fireball Barrage skill
  private spawnIgnisFireballProjectile(origin: THREE.Vector3, target: THREE.Vector3, damage = 42) {
    const group = new THREE.Group();
    group.position.copy(origin);

    const fireballGeo = new THREE.SphereGeometry(0.85, 12, 12);
    const fireballMat = new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      emissive: 0xff1744,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    group.add(new THREE.Mesh(fireballGeo, fireballMat));

    const coronaGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    group.add(new THREE.Mesh(coronaGeo, coronaMat));

    const light = new THREE.PointLight(0xff3d00, 2.8, 8.0);
    group.add(light);

    this.scene.add(group);

    const dir = new THREE.Vector3().subVectors(target, origin).normalize();
    this.activeProjectiles.push({
      object: group,
      direction: dir,
      speed: 26.0,
      lifetime: 3.0,
      damage,
      isCrit: false,
      vfxType: 'dragon_fireball',
      isHostile: true,
      blastRadius: 3.0,
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
      const { remainingDamage } = this.absorbDamageWithShield(finalDmg, enemy);
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

    // Cinematic Menu Camera (image_30.png)
    if (this.menuMode === 'main_menu') {
      const time = this.clock.getElapsedTime();
      this.camera.position.set(
        Math.sin(time * 0.05) * 8 + 2,
        3,
        Math.cos(time * 0.05) * 8 + 180
      );
      this.camera.lookAt(0, 1.5, 176);
      return;
    }

    // 3D Character Selection Framing Camera (Isolated Mini-Stage Platform at 0, 0, 0)
    if (this.menuMode === 'character_select') {
      this.camera.position.lerp(new THREE.Vector3(0, 1.55, 4.8), 0.1);
      this.camera.lookAt(0, 1.1, 0);
      return;
    }

    // Dynamic Boss Aerial Camera lerping
    if (this.isDragonAirborne) {
      this.cameraTargetOffsetY = THREE.MathUtils.lerp(this.cameraTargetOffsetY, 4.5, delta * 3.0);
      this.cameraAerialZoom = THREE.MathUtils.lerp(this.cameraAerialZoom, 3.5, delta * 3.0);
    } else {
      this.cameraTargetOffsetY = THREE.MathUtils.lerp(this.cameraTargetOffsetY, 0, delta * 4.0);
      this.cameraAerialZoom = THREE.MathUtils.lerp(this.cameraAerialZoom, 0, delta * 4.0);
    }

    // Over-the-Shoulder Zoom Camera saat Merapal Glacial Barrage / Membidik Busur Pemburu (Bahu Kanan)
    if (this.isAimGlacialActive || this.isAimingBow) {
      // 1. Batasi sudut pitch vertikal saat mode membidik pada rentang aman: [-0.45, 0.65] radian
      this.cameraAngleV = THREE.MathUtils.clamp(this.cameraAngleV, -0.45, 0.65);

      // 2. Hitung posisi kamera berdasarkan rotasi yaw horizontal karakter terlebih dahulu
      const camFwdX = -Math.sin(this.cameraAngleH);
      const camFwdZ = -Math.cos(this.cameraAngleH);
      const horizForward = new THREE.Vector3(camFwdX, 0, camFwdZ).normalize();
      const right = new THREE.Vector3(Math.cos(this.cameraAngleH), 0, -Math.sin(this.cameraAngleH)).normalize();

      // Jarak mundur horizontal minimal 2.8 unit di belakang bahu kanan (right: +1.15, back: -2.85, up: 1.95)
      const shoulderCamPos = this.playerPos.clone()
        .addScaledVector(right, 1.15)
        .add(new THREE.Vector3(0, 1.95, 0))
        .addScaledVector(horizForward, -2.85);

      // Menjaga tinggi minimal kamera: camera.position.y >= player.position.y + 1.45
      shoulderCamPos.y = Math.max(shoulderCamPos.y, this.playerPos.y + 1.45);

      // 3. Terapkan pitch hanya pada arah pandangan (camera.lookAt)
      const camDirY = -Math.sin(this.cameraAngleV);
      const camDirXZ = Math.cos(this.cameraAngleV);
      const cameraForward = new THREE.Vector3(camFwdX * camDirXZ, camDirY, camFwdZ * camDirXZ).normalize();

      const targetCamLookAt = shoulderCamPos.clone().addScaledVector(cameraForward, 35.0);

      const lerpSpeed = Math.min(1.0, delta * 14.0); // Cepat 0.15s
      this.camera.position.lerp(shoulderCamPos, lerpSpeed);
      this.cameraCurrentLookAt.lerp(targetCamLookAt, lerpSpeed);
      this.camera.lookAt(this.cameraCurrentLookAt);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 48.0, lerpSpeed);
      this.camera.updateProjectionMatrix();
      return;
    }

    // Restore standard camera FOV smoothly when not aiming
    if (Math.abs(this.camera.fov - 60.0) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 60.0, Math.min(1.0, delta * 8.0));
      this.camera.updateProjectionMatrix();
    }

    // Orbit camera calculation with aerial zoom adjustment
    const effectiveDist = this.cameraDistance + this.cameraAerialZoom;
    const offsetX = Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * effectiveDist;
    const offsetZ = Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * effectiveDist;
    const offsetY = Math.sin(this.cameraAngleV) * effectiveDist + 1.2;

    const targetPos = new THREE.Vector3(
      this.playerPos.x + offsetX,
      this.playerPos.y + offsetY,
      this.playerPos.z + offsetZ
    );

    // Instant snap without lerp during interior teleport grace period (eliminates black screen / void clipping)
    if (this.teleportGraceTimer > 0) {
      this.camera.position.copy(targetPos);
      this.cameraCurrentLookAt.set(this.playerPos.x, this.playerPos.y + 1.4 + this.cameraTargetOffsetY, this.playerPos.z);
      this.camera.lookAt(this.cameraCurrentLookAt);
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
    } else if (Math.abs(this.camera.fov - 60.0) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 60.0, Math.min(1.0, delta * 10.0));
      this.camera.updateProjectionMatrix();
    }

    const normalLookAt = new THREE.Vector3(this.playerPos.x, this.playerPos.y + 1.4 + this.cameraTargetOffsetY, this.playerPos.z);
    this.cameraCurrentLookAt.lerp(normalLookAt, Math.min(1.0, delta * 12.0));
    this.camera.position.lerp(targetPos, 0.15);
    this.camera.lookAt(this.cameraCurrentLookAt);
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

      // Lazy On-Proximity Nameplate (Radius 35 meter) - 0% memory overhead di luar jangkauan
      const distToPlayer = rp.currentPos.distanceTo(this.playerPos);
      if (distToPlayer <= 35) {
        if (!rp.nameTag) {
          rp.nameTag = this.createNameTagSprite(
            rp.data.name,
            rp.data.level || 1,
            rp.data.charClass,
            rp.data.hp || 120,
            rp.data.maxHp || 120
          );
          rp.meshObj.group.add(rp.nameTag);
        }
      } else if (distToPlayer > 42 && rp.nameTag) {
        rp.meshObj.group.remove(rp.nameTag);
        if (rp.nameTag.material.map) rp.nameTag.material.map.dispose();
        rp.nameTag.material.dispose();
        rp.nameTag = undefined;
      }
    });
  }

  private updateCharacterSelectPreviews(delta: number) {
    const t = this.clock.getElapsedTime();
    const breathe = Math.sin(t * 3.0) * 0.025;
    const targetZ = 0;
    const targetY = 0.43;

    const activePreview =
      this.selectedPreviewRole === 'warrior'
        ? this.knightPreview
        : this.selectedPreviewRole === 'mage'
          ? this.magePreview
          : this.assassinPreview;

    // 1. Update Magic Rune Pedestal Ring (di bawah kaki karakter yang aktif dipilih)
    if (this.selectionPedestal && activePreview?.group) {
      // Posisikan ring tepat di bawah koordinat X dan Z karakter yang sedang aktif dipilih
      this.selectionPedestal.position.x = THREE.MathUtils.lerp(
        this.selectionPedestal.position.x,
        activePreview.group.position.x,
        0.2
      );
      this.selectionPedestal.position.z = activePreview.group.position.z;
      // Berikan rotasi perlahan pada sumbu Y
      this.selectionPedestal.rotation.y += 0.02;

      // Berikan efek denyut cahaya halus & sesuaikan warna ring dengan tema role
      if (this.selectionPedestalMat) {
        this.selectionPedestalMat.opacity = 0.65 + Math.sin(t * 3.5) * 0.25;

        const targetColorHex =
          this.selectedPreviewRole === 'warrior'
            ? 0x3b82f6 // Knight: 0x3b82f6 (Biru Terang / Emas)
            : this.selectedPreviewRole === 'mage'
              ? 0xa855f7 // Mage: 0xa855f7 (Ungu Arcane)
              : 0x06b6d4; // Assassin: 0x06b6d4 (Cyan Neon)
        this.selectionPedestalMat.color.lerp(new THREE.Color(targetColorHex), 0.15);
      }
    }

    // 2. Efek Dimming & Highlight: Karakter terpilih 100% cerah, karakter lain redup (~0.55 - 0.6)
    this.updatePreviewDimming(this.knightPreview?.group ?? null, this.selectedPreviewRole === 'warrior', delta);
    this.updatePreviewDimming(this.magePreview?.group ?? null, this.selectedPreviewRole === 'mage', delta);
    this.updatePreviewDimming(this.assassinPreview?.group ?? null, this.selectedPreviewRole === 'rogue', delta);

    if (this.previewActionTimer > 0) {
      this.previewActionTimer -= delta;
      const progress = 1.0 - Math.max(0, this.previewActionTimer);

      if (this.previewActionRole === 'warrior' && this.knightPreview) {
        // Vigorous downward slash pose
        const slashPhase = Math.sin(progress * Math.PI);
        this.knightPreview.rightArm.rotation.set(-1.6 + slashPhase * 2.0, 0.4 - slashPhase * 1.2, 0.2);
        this.knightPreview.body.rotation.set(0, -slashPhase * 0.4, 0);
      } else if (this.previewActionRole === 'mage' && this.magePreview) {
        // Raise glowing staff into the air
        this.magePreview.rightArm.rotation.set(-Math.PI * 0.85, -0.15, -0.20);
        this.magePreview.body.position.y = 1.35;
      } else if (this.previewActionRole === 'rogue' && this.assassinPreview) {
        // Scissor blades cross slash
        const crossPhase = Math.sin(progress * Math.PI * 2);
        this.assassinPreview.leftArm.rotation.set(-1.2 + crossPhase * 0.4, 0.5, 0.4);
        this.assassinPreview.rightArm.rotation.set(-1.2 - crossPhase * 0.4, -0.5, -0.4);
      }
    } else {
      // Natural idle breathing & relaxed standby pose - STATIC GROUND LEVEL & LOCKED Z (NO Z-STEP)
      if (this.knightPreview?.group) {
        this.knightPreview.group.position.y = targetY;
        this.knightPreview.group.position.z = targetZ;
      }
      if (this.magePreview?.group) {
        this.magePreview.group.position.y = targetY;
        this.magePreview.group.position.z = targetZ;
      }
      if (this.assassinPreview?.group) {
        this.assassinPreview.group.position.y = targetY;
        this.assassinPreview.group.position.z = targetZ;
      }

      if (this.knightPreview?.body) {
        this.knightPreview.body.position.y = 1.48; // Constant, no vertical bobbing
        this.knightPreview.body.rotation.set(0, 0, 0);
        this.knightPreview.body.scale.set(1 + breathe * 0.02, 1, 1 + breathe * 0.02);
        this.knightPreview.rightArm.rotation.set(-0.28 + breathe * 0.06, -0.15, -0.22);
        this.knightPreview.leftArm.rotation.set(-0.30, 0.20, 0.15);
      }
      if (this.magePreview?.body) {
        this.magePreview.body.position.y = 1.35; // Constant, no vertical bobbing
        this.magePreview.body.rotation.set(0, 0, 0);
        this.magePreview.body.scale.set(1 + breathe * 0.02, 1, 1 + breathe * 0.02);
        this.magePreview.rightArm.rotation.set(-0.20 + breathe * 0.05, -0.10, -0.15);
        this.magePreview.leftArm.rotation.set(0.06, 0.10, 0.12);
      }
      if (this.assassinPreview?.body) {
        this.assassinPreview.body.position.y = 1.18; // Constant, correct height, no vertical bobbing
        this.assassinPreview.body.rotation.set(0, 0, 0);
        this.assassinPreview.body.scale.set(1 + breathe * 0.02, 1, 1 + breathe * 0.02);
        this.assassinPreview.rightArm.rotation.set(-0.30 + breathe * 0.05, 0, -0.25);
        this.assassinPreview.leftArm.rotation.set(-0.30 - breathe * 0.05, 0, 0.25);
      }
    }
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
    this.frameCount++;
    if (this.renderer?.shadowMap.enabled && this.frameCount % 3 === 0) {
      this.renderer.shadowMap.needsUpdate = true;
    }

    // Single Player Pause: Hentikan sementara loop animasi Three.js dan logika monster
    if (this.isPaused && !this.isMultiplayer) {
      // Render frame yang sedang diam tanpa kalkulasi fisika, monster AI, atau delta waktu
      // Traversal Sanitization Lock mutlak tepat sebelum frame dirender ke canvas
      if (this.playerMesh) {
        this.playerMesh.group.rotation.x = 0;
        this.playerMesh.group.rotation.z = 0;
        if (this.playerMesh.rotation) {
          this.playerMesh.rotation.x = 0;
          this.playerMesh.rotation.z = 0;
        }
        this.playerMesh.group.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
            if (
              child.name.toLowerCase().includes('body') ||
              child.name.toLowerCase().includes('torso') ||
              child.name.toLowerCase().includes('chest') ||
              child === (this.playerMesh as any).body
            ) {
              child.rotation.x = 0;
              child.rotation.z = 0;
            }
          }
        });
      }

      this.renderer.render(this.scene, this.camera);
      return;
    }

    const delta = Math.min(this.clock.getDelta(), 0.05);

    // Update 24-minute real-time Day-Night Cycle & Celestial Atmosphere
    this.dayNightSystem.update(delta);
    if (this.world?.hemiLight && this.world?.dirLight) {
      this.dayNightSystem.applyOutdoorLighting(
        this.scene,
        this.world.hemiLight,
        this.world.dirLight,
        this.menuMode === 'gameplay' ? (this.isSpectatorMode ? this.spectatorPos : this.playerPos) : undefined
      );
    }

    // Menu States (Main Menu & 3D Character Selection)
    if (this.menuMode !== 'gameplay') {
      if (this.menuMode === 'character_select') {
        this.updateCharacterSelectPreviews(delta);
        this.updateCamera(delta);
        this.renderer.render(this.scene, this.camera);
        return;
      }
      if (this.menuMode === 'main_menu') {
        // Zero-lag 60 FPS: Do NOT render 3D scene in main menu (0% GPU)
        return;
      }
      return;
    }

    // Lazy load world guarantee if entering gameplay
    if (!this.isWorldLoaded) {
      this.initFullWorld();
    }

    // Update Player & World Physics
    this.updatePlayer(delta);
    this.updateMonster(delta);
    this.updateLootPickups(delta);
    this.updateCamera(delta);
    this.updateRemotePlayers(delta);
    this.worldEnvironment?.update(delta, this.clock.getElapsedTime());
    this.updateSparks(delta);
    this.updateCombatVfxPools(delta);

    // Update Mage Arcane Shield Timer
    if (this.arcaneShieldTimer > 0) {
      this.arcaneShieldTimer -= delta;
      if (this.arcaneShieldTimer <= 0) {
        this.arcaneShieldTimer = 0;
        this.arcaneShieldHp = 0;
        this.callbacks.onAddFloatingText('Perisai Sihir Berakhir', '#94a3b8', 'info');
      }
    }

    // Mage Ultimate Cooldown Timer
    if (this.mageUltimateCooldownTimer > 0) {
      this.mageUltimateCooldownTimer = Math.max(0, this.mageUltimateCooldownTimer - delta);
    }

    // Mage Glacial Barrage Cooldown Timer
    if (this.mageGlacialBarrageCooldownTimer > 0) {
      this.mageGlacialBarrageCooldownTimer = Math.max(0, this.mageGlacialBarrageCooldownTimer - delta);
    }

    // Mage Blink Cooldown Timer
    if (this.mageBlinkCooldownTimer > 0) {
      this.mageBlinkCooldownTimer = Math.max(0, this.mageBlinkCooldownTimer - delta);
    }

    // Mage Cahaya Suci Cooldown Timer
    if (this.mageCahayaSuciCooldownTimer > 0) {
      this.mageCahayaSuciCooldownTimer = Math.max(0, this.mageCahayaSuciCooldownTimer - delta);
    }

    // Hunter Skyward Arrow Volley Cooldown Timer
    if (this.hunterArrowVolleyCooldownTimer > 0) {
      this.hunterArrowVolleyCooldownTimer = Math.max(0, this.hunterArrowVolleyCooldownTimer - delta);
    }

    // Hunter Mobility Skill 2 Cooldown Timer (Gale Vault / Phantom Decoy Step)
    if (this.hunterMobilityCooldownTimer > 0) {
      this.hunterMobilityCooldownTimer = Math.max(0, this.hunterMobilityCooldownTimer - delta);
    }

    // Hunter Phantom Ambush Buff Timer (guaranteed 100% crit on next basic attack)
    if (this.phantomAmbushReady) {
      this.phantomAmbushTimer -= delta;
      if (this.phantomAmbushTimer <= 0) {
        this.phantomAmbushReady = false;
      }
    }

    // Hunter Active Shadow Decoy
    if (this.activeShadowDecoy && this.activeShadowDecoy.active) {
      this.activeShadowDecoy.timer -= delta;
      if (Math.random() < 0.25) {
        this.spawnSparks(
          this.activeShadowDecoy.pos.clone().add(new THREE.Vector3(0, 0.8, 0)),
          0x064e3b,
          2,
          1.5
        );
      }
      if (this.activeShadowDecoy.timer <= 0) {
        this.explodeActiveShadowDecoy();
      }
    }

    // Hunter Shadow Afterimages update
    this.updateHunterAfterimages(delta);

    // Hunter Gale Vault update
    if (this.isGaleVaulting) {
      this.galeVaultTimer -= delta;

      // Spiraling emerald wind ribbon trail around Hunter's body
      const spiralT = (0.45 - this.galeVaultTimer) * 24.0;
      const sx = Math.cos(spiralT) * 0.75;
      const sz = Math.sin(spiralT) * 0.75;
      const sy = 0.6 + Math.sin(spiralT * 0.5) * 0.4;
      this.spawnSparks(this.playerPos.clone().add(new THREE.Vector3(sx, sy, sz)), 0x34d399, 2, 1.8);
      this.spawnSparks(this.playerPos.clone().add(new THREE.Vector3(-sx, sy, -sz)), 0xa7f3d0, 1, 1.2);

      // Counter-shot at apex (detik ke-0.15 saat di udara)
      if (!this.galeVaultShotFired && (0.45 - this.galeVaultTimer) >= 0.15) {
        this.galeVaultShotFired = true;
        soundManager.playBowShoot();
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.playerRotationY
        );
        this.spawnHunterArrow(forward, true, 1.85, undefined, false, 42.0, true, true);
      }

      if (this.galeVaultTimer <= 0) {
        this.isGaleVaulting = false;
        this.galeVaultTimer = 0;
        this.playerMesh.group.rotation.set(0, this.playerRotationY, 0);
      }
    }

    // Scorched Crater (Ground Fire DoT: 15% Spell Power / sec)
    if (this.activeScorchedCraters.length > 0) {
      for (let i = this.activeScorchedCraters.length - 1; i >= 0; i--) {
        const crater = this.activeScorchedCraters[i];
        crater.timer -= delta;
        crater.tickTimer -= delta;
        if (crater.tickTimer <= 0) {
          crater.tickTimer = 0.5; // Tick twice per second
          const tickDmg = Math.max(1, Math.round(crater.dps * 0.5));
          this.enemies.forEach((enemy) => {
            if (enemy.data.isDead) return;
            const dist = enemy.mesh.position.distanceTo(crater.center);
            if (dist <= crater.radius) {
              this.damageEnemy(enemy, tickDmg, false, 0);
              this.spawnHitStarburst(enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xff5722, 1.2);
            }
          });
        }
        if (crater.timer <= 0) {
          this.activeScorchedCraters.splice(i, 1);
        }
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
          } catch { }
        }
        this.activeVfx.splice(i, 1);
      }
    }

    // Update active projectiles (e.g. Mage Arcane Bolt, Hunter Arrows, & Titan Rock Boulder)
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const proj = this.activeProjectiles[i];
      proj.lifetime -= delta;
      const moveDistance = proj.speed * delta;
      proj.object.position.addScaledVector(proj.direction, moveDistance);
      if (proj.distanceTraveled !== undefined) {
        proj.distanceTraveled += moveDistance;
      }

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
          const isFireball = proj.vfxType === 'dragon_fireball';
          this.spawnShockwaveRing(hitPos, isFireball ? 0xff3d00 : 0xff5722, isFireball ? 4.0 : 4.5, 0.4);
          this.spawnSparks(hitPos, isFireball ? 0xff3d00 : 0x44403c, 16, 5.0);
          this.spawnSparks(hitPos, 0xff7a00, 14, 4.5);
          if (isFireball) {
            soundManager.playMeteorImpact();
            this.triggerCameraShake(0.65);
          } else {
            soundManager.playTitanGroundSlam();
            this.triggerCameraShake(0.75);
          }

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
                  this.callbacks.onAddFloatingText(
                    `-${finalDmg} HP (${isFireball ? 'Bola Api Magma' : 'Bongkahan Batu'})`,
                    '#ff1744',
                    'damage'
                  );
                }
                if (isFireball) {
                  this.bossManager.applyBurnDebuff(3.0);
                } else {
                  this.bossManager.applyStunDebuff(0.8, this.playerVel);
                }
                if (nextHp <= 0) {
                  this.respawnPlayerAtLastVisitedTown();
                  return { ...stats, hp: stats.maxHp, mp: stats.maxMp, gold: Math.max(0, stats.gold - 10) };
                }
                return { ...stats, hp: nextHp };
              });
              const knockDir = new THREE.Vector3(this.playerPos.x - hitPos.x, 0, this.playerPos.z - hitPos.z).normalize();
              this.playerVel.x += knockDir.x * (isFireball ? 8.0 : 14.0);
              this.playerVel.z += knockDir.z * (isFireball ? 8.0 : 14.0);
              this.callbacks.onAddFloatingText('💨 TERPENTAL (KNOCKBACK)!', '#ff9100', 'info');
            }
          }

          if (proj.pooledArrow) {
            this.releasePooledArrow(proj.object);
          } else {
            this.scene.remove(proj.object);
          }
          this.activeProjectiles.splice(i, 1);
          continue;
        }
      }

      // Check collision against enemies (Player projectiles)
      let hit = false;
      for (const enemy of this.enemies) {
        if (enemy.data.isDead) continue;
        const hitRadius = proj.isPiercing ? 2.0 : 1.6;
        if (proj.object.position.distanceTo(enemy.mesh.position) <= hitRadius) {
          if (proj.isPiercing && proj.hitEnemyIds) {
            const enemyId = enemy.data.id || String(enemy.mesh.id);
            if (!proj.hitEnemyIds.has(enemyId)) {
              proj.hitEnemyIds.add(enemyId);
              // Crippling Slow: -40% Movement Speed for 2.5s (Gale Piercing Arrow)
              if (proj.isCripplingSlow) {
                enemy.slowFactor = 0.40;
                enemy.slowTimer = 2.5;
                this.callbacks.onAddFloatingText('Crippling Slow -40%! ❄️💨', '#34d399', 'info');
              }
              // Full Charge Wind-Piercer / Gale Piercing Arrow: Menembus banyak musuh di jalur lurus + knockback kuat (1.6)
              this.damageEnemy(enemy, proj.damage, proj.isCrit, 1.6);
              soundManager.playArrowHit(proj.isCrit);
              this.spawnHitStarburst(proj.object.position, 0xfef08a, 1.4);
              this.spawnSparks(proj.object.position, 0x10b981, 16, 5.0);
              this.spawnSparks(proj.object.position, 0xffffff, 8, 4.0);
              this.spawnShockwaveRing(proj.object.position, 0x10b981, 2.4, 0.25);
            }
            // Panah penembus TIDAK hancur saat mengenai musuh pertama; terus melesat!
          } else {
            if (proj.isCripplingSlow) {
              enemy.slowFactor = 0.40;
              enemy.slowTimer = 2.5;
              this.callbacks.onAddFloatingText('Crippling Slow -40%! ❄️💨', '#34d399', 'info');
            }
            if (proj.vfxType === 'hunter_arrow' || proj.vfxType === 'hunter_arrow_rain') {
              this.damageEnemy(enemy, proj.damage, proj.isCrit, 0.55);
              soundManager.playArrowHit(proj.isCrit);
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
      }

      const reachedMaxPiercingDist = Boolean(proj.isPiercing && proj.distanceTraveled !== undefined && proj.distanceTraveled >= 42.0);

      if (hit || reachedMaxPiercingDist || proj.lifetime <= 0) {
        if (proj.pooledArrow) {
          this.releasePooledArrow(proj.object);
        } else {
          this.scene.remove(proj.object);
        }
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

    // Optimization 1: Dynamic PointLights (Keep only 4 closest lights active, village lanterns active only at night 18:00 - 05:30)
    if (this.posUpdateThrottle % 8 === 0 && this.scenePointLights.length > 0) {
      const pX = this.playerPos.x;
      const pZ = this.playerPos.z;
      const isLanternTime = this.dayNightSystem.isVillageLanternTime();
      this.scenePointLights.sort((a, b) => {
        const da = (a.position.x - pX) ** 2 + (a.position.z - pZ) ** 2;
        const db = (b.position.x - pX) ** 2 + (b.position.z - pZ) ** 2;
        return da - db;
      });
      for (let i = 0; i < this.scenePointLights.length; i++) {
        const light = this.scenePointLights[i];
        const hex = light.color.getHex();
        const isStreetOrVillageLamp = hex === 0xffecb3 || hex === 0xffd600 || hex === 0xf59e0b;
        if (isStreetOrVillageLamp) {
          light.visible = (i < 4) && isLanternTime;
        } else {
          light.visible = i < 4;
        }
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
          elder: '🧙‍♂️',
          guard: '🛡️',
          alchemist: '🧪',
          blacksmith: '🔨',
          bard: '🎵',
          fisherman: '🐟',
          villager: '🛒',
          commander: '⚔️',
          seer: '🔮',
          frostsmith: '🔨',
          emperor: '👑',
          marshal: '⚔️',
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
            customIcon = '🗣️';
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
        x: -40,
        z: 145,
        icon: '⛲',
        color: '#29b6f6',
        description: 'Memulihkan HP & MP Seketika',
      });

      // Pier
      markers.push({
        id: 'pier_dock',
        title: 'Pelabuhan Sanctuary',
        type: 'pier',
        x: -140,
        z: 185,
        icon: '⛵',
        color: '#00b4d8',
        description: 'Dermaga Kayu & Kapal Layar',
      });

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

    // Traversal Sanitization Lock mutlak tepat sebelum frame dirender ke canvas
    if (this.playerMesh) {
      this.playerMesh.group.rotation.x = 0;
      this.playerMesh.group.rotation.z = 0;
      if (this.playerMesh.rotation) {
        this.playerMesh.rotation.x = 0;
        this.playerMesh.rotation.z = 0;
      }
      this.playerMesh.group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
          if (
            child.name.toLowerCase().includes('body') ||
            child.name.toLowerCase().includes('torso') ||
            child.name.toLowerCase().includes('chest') ||
            child === (this.playerMesh as any).body
          ) {
            child.rotation.x = 0;
            child.rotation.z = 0;
          }
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    this.isRunning = false;
    this.clearCharacterSelectScene();
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
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('pointerdown', this.handlePointerDown);

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
    if (this.aimIndicatorGroup) {
      this.scene.remove(this.aimIndicatorGroup);
      this.aimIndicatorGroup = null;
    }
    this.activeVfx.forEach((v) => {
      this.scene.remove(v.object);
      if (v.cleanup) {
        try {
          v.cleanup();
        } catch { }
      }
    });
    this.activeVfx = [];
    this.activeProjectiles.forEach((p) => this.scene.remove(p.object));
    this.activeProjectiles = [];

    // Clean up Hunter Arrow Pool
    this.hunterArrowPool.forEach((p) => this.scene.remove(p.root));
    this.hunterArrowPool = [];
    this.hunterArrowPoolGeometries.forEach((g) => g.dispose());
    this.hunterArrowPoolGeometries = [];
    this.hunterArrowPoolMaterials.forEach((m) => m.dispose());
    this.hunterArrowPoolMaterials = [];

    // Clean up Hunter Shadow Decoys
    this.shadowDecoyPool.forEach((d) => this.scene.remove(d));
    this.shadowDecoyPool = [];
    this.activeShadowDecoy = null;

    // Clean up Hunter Shadow Afterimages
    this.hunterAfterimagePool.forEach((item) => {
      this.scene.remove(item.group);
      item.materials.forEach((m) => m.dispose());
      item.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
        }
      });
    });
    this.hunterAfterimagePool = [];

    // Clean up remote players
    this.clearRemotePlayers();

    // Clean up World Editor
    if (this.transformControls) {
      this.transformControls.dispose();
      this.transformControls = null;
    }
    this.editorAnchors.forEach((a) => this.scene.remove(a));
    this.editorAnchors.clear();

    if (dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
    this.renderer.dispose();
  }
}
