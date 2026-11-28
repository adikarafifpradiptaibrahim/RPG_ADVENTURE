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
  animateHunterSkyVolley,
} from './models';
export { USE_LEGACY_KNIGHT, USE_LEGACY_MAGE, USE_LEGACY_HUNTER };
import { buildWorld, buildWorldAsync, WorldObjects, WorldCheckpoint, getTerrainHeight as getProceduralTerrainHeight } from './world';
import { InteriorPortalDef, InteriorRoomInfoPayload } from './interiorSystem';
import { createTrainingDummyMesh } from './models';
import {
  buildWorldEnvironment,
  buildWorldEnvironmentAsync,
  WorldEnvironmentResult,
  getExactMeshGroundHeight,
} from './worldEnvironment';
import { getSolidGroundHeight } from './walkableSurfaceSystem';
import { getBiomeAt } from './worldData';
import { BossManager } from '../BossManager';
import { BOSS_ARENA_ZONES, BossArenaZone, SPAWN_NAGA, resolveEnemyTarget } from '../monsterAI';
import { createHunterModel } from './playerModel';
import {
  SkillCooldownManager,
  HudSkillCooldownMap,
} from '../skillCooldownManager';
import {
  DevTestingSettings,
  getDefaultDevTestingSettings,
  getEffectiveDevTestingSettings,
  subscribeDevTestingSettings,
} from '../storage/devTestingManager';
import { RemotePlayerData } from '../multiplayer';
import { GraphicsSettings, isMobileRenderDevice, loadGraphicsSettings } from '../graphicsSettings';
import {
  ANCIENT_TITAN_BOSS_CONFIG,
  IGNIS_DRAGON_BOSS_CONFIG,
  JARRUS_WORM_BOSS_CONFIG,
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
  getLandmarkLayout,
  SAFE_ZONES,
} from './worldLayoutConfig';
import { WORLD_BOUNDS, isPointOnBridgeDeck } from './worldData';
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
import { yieldToMainThread, yieldIfBudgetExceeded, yieldToChrome, cooperativeYield, yieldIfNeeded, hardYield } from './frameBudget';
import { getDeviceProfile } from '../utils/deviceProfiler';
import { SmoothLoadScheduler } from '../utils/asyncLoader';
import {
  isWorldCacheEnabled,
  loadModularWorldCache,
  saveAllModularCaches,
  saveModularCache,
  registerActiveWorldSnapshotProvider,
  ModularWorldCacheLoadResult,
  WorldCachePayload,
  ActiveWorldSnapshot,
} from '../storage/worldCacheManager';
import { TERRAIN_GRID, getMeshGroundHeights } from './worldEnvironment';
import { SpatialLookupGrid } from './spatialGrid';
import {
  exportWorldMapRasterToBlob,
  hydrateWorldMapRasterFromBlob,
} from '../mapIllustratedRenderer';
export { yieldToMainThread, yieldIfBudgetExceeded, yieldToChrome, cooperativeYield, yieldIfNeeded, hardYield };

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
  onBossEncounter: (
    bossActive: boolean,
    bossName?: string,
    bossHp?: number,
    bossMaxHp?: number,
    bossTitle?: string,
    combatActive?: boolean
  ) => void;
  onBossDefeated?: (bossName?: string) => void;
  onSpectatorModeChange?: (active: boolean) => void;
  onHunterWeaponSwitch?: (mode: 'dagger' | 'bow') => void;
  onWeaponDrawnChange?: (drawn: boolean) => void;
  onStealthChange?: (active: boolean, remaining: number) => void;
  onGlacialAimChange?: (isAiming: boolean, targetInfo?: { name: string; hp: number; maxHp: number; isBoss?: boolean } | null) => void;
  onBowAimChange?: (isAiming: boolean, chargeRatio: number) => void;
  onArrowVolleyAimChange?: (isAiming: boolean) => void;
  onCastingUpdate?: (casting: { isCasting: boolean; progress: number; text: string } | null) => void;
  onCheckpointUnlocked?: (id: string, nameId: string, pos: [number, number]) => void;
  onInteriorFadeChange?: (fadingOut: boolean) => void;
  onInteriorPortalState?: (portalInfo: { label: string; kind: 'enter' | 'exit' | 'floor'; promptText: string } | null) => void;
  onInteriorRoomChange?: (roomInfo: InteriorRoomInfoPayload | null) => void;
  onPreviewRoleSelected?: (role: 'warrior' | 'mage' | 'rogue') => void;
  onPlayerPositionUpdate?: (data: {
    x: number;
    y?: number;
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
export function getTerrainHeight(x: number, z: number, currentY?: number): number {
  return getSolidGroundHeight(x, z, currentY);
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

const TOWN_ZONES: TownZoneTrigger[] = SAFE_ZONES.map((sz) => ({
  id: sz.id,
  waypointId: sz.waypointId,
  name: sz.nameId,
  x: sz.x,
  z: sz.z,
  radius: sz.radius,
  respawnX: sz.respawnX,
  respawnZ: sz.respawnZ,
}));

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
  // Zone-Based Boss Territory, Combat Aggro, Bar & BGM State Machine
  private bossCombatStates: Map<string, { combatActive: boolean; disengageTimer: number }> = new Map();
  private activeBossZoneId: string | null = null;
  private activeBossEnemyData: EnemyData | null = null;
  private lavaDamageTimer = 0;
  private unlockedCheckpoints: Set<string> = new Set();
  private lastVisitedTownPos: { id: string; x: number; y: number; z: number; name: string } = (() => {
    try {
      const saved = localStorage.getItem('eldoria_last_visited_town');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number') return parsed;
      }
    } catch { }
    return { id: 'town_sanctuary', x: 20, y: 0.5, z: -50, name: 'Desa Utama Eldoria' };
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
  private playerPos = new THREE.Vector3(20, 0, -50);
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
  // Global Centralized Skill Cooldown & Charge Manager
  private skillCooldownsManager = new SkillCooldownManager();
  private mageUltimateCooldownTimer = 0;
  private mageGlacialBarrageCooldownTimer = 0;
  private mageBlinkCooldownTimer = 0;
  private mageCahayaSuciCooldownTimer = 0;
  private hunterMobilityCooldownTimer = 0;
  // Hunter Bow Skill 1 (Q): Panah Rajawali Astral (6s CD, 20 MP)
  public isChargingAstralEagle = false;
  public astralEagleChargeRatio = 0;
  public astralEagleAimState = {
    isCharging: false,
    pressStartTime: 0,
    cancelled: false,
  };
  // Hunter Stealth (Smoke Veil) & Shadow Decoy Dash state
  private isGaleVaulting = false;
  private galeVaultTimer = 0;
  private galeVaultShotFired = false;
  public phantomAmbushReady = false;
  private phantomAmbushTimer = 0;
  public isPlayerStealthed = false;
  private stealthTimer = 0;
  private playerMatSnapshots: Array<{
    mat: THREE.Material;
    opacity: number;
    transparent: boolean;
    colorHex?: number;
  }> = [];
  private shadowDecoyPool: THREE.Group[] = [];
  private shadowDecoyCursor = 0;
  private shadowDecoySharedMats: THREE.Material[] = [];
  private activeShadowDecoy: {
    group: THREE.Group;
    pos: THREE.Vector3;
    timer: number;
    active: boolean;
  } | null = null;
  // Hunter Bow Ultimate (F): Badai Panah Agung (0 CD, 45 MP, Tap vs Hold AoE Radius 13)
  public isAimingArrowVolley = false;
  public arrowVolleyAimState = {
    isCharging: false,
    pressStartTime: 0,
    cancelled: false,
  };
  private isHoldingArrowVolleyKey = false;
  private arrowVolleyAimTimer: number | null = null;
  private arrowVolleyTargetPoint = new THREE.Vector3();
  private arrowVolleyIndicatorGroup: THREE.Group | null = null;
  private arrowVolleyDecalSubgroup: THREE.Group | null = null;
  private arrowVolleyGroundDecal: THREE.Mesh | null = null;
  private arrowVolleyOuterRing: THREE.Mesh | null = null;
  private arrowVolleyTrajectoryLine: THREE.Line | null = null;
  // Mage Glacial Crystal Barrage: Clean Input Aim State
  public glacialAimState = {
    isCharging: false,
    pressStartTime: 0,
    cancelled: false,
  };
  private isAimGlacialActive = false;
  public get isAimingGlacial(): boolean {
    return this.glacialAimState.isCharging || this.isAimGlacialActive;
  }
  public set isAimingGlacial(val: boolean) {
    this.glacialAimState.isCharging = val;
    this.isAimGlacialActive = val;
  }
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

  // Player stats mirror for synchronous, zero-lag combat resource verification
  public currentStats: PlayerStats = {
    level: 1,
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    stamina: 100,
    maxStamina: 100,
    gold: 0,
    exp: 0,
    maxExp: 100,
    strength: 10,
    agility: 10,
    intelligence: 10,
    statPoints: 0,
    baseAttack: 15,
    baseDefense: 5,
    characterClass: 'warrior',
  };

  public syncPlayerStats(stats: Partial<PlayerStats>) {
    Object.assign(this.currentStats, stats);
  }

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

  // Pre-allocated Object Pools for Assassin & Melee Slash/Step/Smoke VFX (Zero Runtime Allocations)
  private crescentSlashPool: Array<{
    group: THREE.Group;
    outerMat: THREE.MeshBasicMaterial;
    innerMat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
    baseRadius: number;
    dirX: number;
    dirY: number;
    dirZ: number;
  }> = [];
  private crescentSlashNextIndex = 0;

  private shadowStepPool: Array<{
    group: THREE.Group;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
  }> = [];
  private shadowStepNextIndex = 0;

  private smokePuffPool: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
    baseOpacity: number;
    riseSpeed: number;
    growRate: number;
    vx: number;
    vz: number;
  }> = [];
  private smokePuffNextIndex = 0;

  private bladeSpin360Pool: Array<{
    group: THREE.Group;
    ringOuter: THREE.Mesh;
    ringInner: THREE.Mesh;
    matOuter: THREE.MeshBasicMaterial;
    matInner: THREE.MeshBasicMaterial;
    spokeMat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
    baseRadius: number;
  }> = [];
  private bladeSpin360NextIndex = 0;

  // Sleek Thin Wind Streaks Pool for Agile Assassin Sprint (Zero Torso Clipping & Zero GC)
  private sprintWindStreakPool: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
    baseOpacity: number;
    vx: number;
    vy: number;
    vz: number;
  }> = [];
  private sprintWindStreakNextIndex = 0;
  private sprintStreakTimer = 0;
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
  // Open-World Weapon State: Mode Siaga (isWeaponDrawn = true) vs Mode Santai / Handless (isWeaponDrawn = false)
  public isWeaponDrawn = false;
  private combatIdleTimer = 0;
  private weaponDrawTransitionTimer = 0;
  private isHunterSheathed = true;
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
  private bowCombatStanceTimer = 0;
  private bowShotCooldownTimer = 0;
  private hunterArrowPool: PooledHunterArrow[] = [];
  private hunterArrowPoolGeometries: THREE.BufferGeometry[] = [];
  private hunterArrowPoolMaterials: THREE.Material[] = [];

  // Multi-Instance Pools for Panah Rajawali Astral (6 projectiles + 24 shockwaves)
  private astralEaglePool: Array<{
    root: THREE.Group;
    coreMat: THREE.MeshBasicMaterial;
    wingMat: THREE.MeshBasicMaterial;
    trailMat: THREE.MeshBasicMaterial;
    active: boolean;
    direction: THREE.Vector3;
    speed: number;
    traveled: number;
    maxRange: number;
    shockwaveAccum: number;
    damage: number;
    isCrit: boolean;
    knockback: number;
    hitEnemyIds: Set<string>;
  }> = [];
  private astralEagleCursor = 0;
  private astralShockwavePool: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
  }> = [];
  private astralShockwaveCursor = 0;

  // Multi-Instance Pools for Ultimate Badai Panah Agung (max 3 simultaneous storms, 90 rain arrows, 36 impacts, 3 sky portals & Tombak Rajawali finishers)
  private arrowRainPool: Array<{
    root: THREE.Group;
    trail: THREE.Mesh;
    trailMat: THREE.MeshBasicMaterial;
    shaftMat: THREE.MeshStandardMaterial;
    active: boolean;
    phase: 'falling' | 'stuck';
    vx: number;
    vy: number;
    vz: number;
    groundY: number;
    stickElapsed: number;
  }> = [];
  private arrowRainPoolCursor = 0;
  private arrowRainImpactPool: Array<{
    group: THREE.Group;
    ringMat: THREE.MeshBasicMaterial;
    sparkMat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
  }> = [];
  private arrowRainImpactCursor = 0;
  private stormCasterAuraPool: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
  }> = [];
  private stormFlareArrowPool: Array<{
    root: THREE.Group;
    trailMat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
    startY: number;
  }> = [];
  private stormSkyPortalPool: Array<{
    group: THREE.Group;
    outerRing: THREE.Mesh;
    innerRing: THREE.Mesh;
    outerMat: THREE.MeshBasicMaterial;
    innerMat: THREE.MeshBasicMaterial;
    coreMat: THREE.MeshBasicMaterial;
    active: boolean;
  }> = [];
  private stormGroundMagicCirclePool: Array<{
    group: THREE.Group;
    outerRing: THREE.Mesh;
    innerRing: THREE.Mesh;
    discMesh: THREE.Mesh;
    windStreaks: THREE.Mesh[];
    outerMat: THREE.MeshBasicMaterial;
    innerMat: THREE.MeshBasicMaterial;
    discMat: THREE.MeshBasicMaterial;
    windMat: THREE.MeshBasicMaterial;
    active: boolean;
  }> = [];
  private stormTombakPool: Array<{
    root: THREE.Group;
    wingMat: THREE.MeshBasicMaterial;
    coreMat: THREE.MeshBasicMaterial;
    active: boolean;
  }> = [];
  private stormFinisherBlastPool: Array<{
    group: THREE.Group;
    ringMesh: THREE.Mesh;
    pillarMesh: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    pillarMat: THREE.MeshBasicMaterial;
    active: boolean;
    elapsed: number;
    duration: number;
  }> = [];
  private activeArrowStorms: Array<{
    targetPos: THREE.Vector3;
    groundY: number;
    radius: number;
    elapsed: number;
    rainDuration: number;
    spawnAccum: number;
    tickAccum: number;
    portalIdx: number;
    groundIdx: number;
    tombakIdx: number;
    flareIdx: number;
    spawnWaveIndex: number;
    portalOpened: boolean;
    tombakLaunched: boolean;
    finisherImpacted: boolean;
    ambushMult: number;
  }> = [];
  private arrowRainSharedGeometries: THREE.BufferGeometry[] = [];
  private arrowRainSharedMaterials: THREE.Material[] = [];
  private readonly arrowRainUpAxisScratch = new THREE.Vector3(0, 1, 0);
  private readonly arrowRainDirScratch = new THREE.Vector3();
  private readonly astralForwardAxisScratch = new THREE.Vector3(0, 0, 1);
  private mobileAimActiveSlot: 'basic' | 'skill1' | 'dash' | 'ult' | null = null;
  private mobileAimNormalized = { x: 0, y: 0, active: false };
  private mobileAimOverCancel = false;
  private mobileStarfallAimGroup: THREE.Group | null = null;
  private mobileStarfallOuterRing: THREE.Mesh | null = null;
  private mobileStarfallInnerRing: THREE.Mesh | null = null;
  private mobileStarfallTargetPoint = new THREE.Vector3();
  private mobileDashAimGroup: THREE.Group | null = null;
  private mobileDashRingMesh: THREE.Mesh | null = null;
  private mobileDashLineMesh: THREE.Line | null = null;
  private mobileDashTargetPoint = new THREE.Vector3();
  private mobileBowAimGroup: THREE.Group | null = null;
  private mobileBowAimRingMesh: THREE.Mesh | null = null;
  private mobileBowAimLineMesh: THREE.Line | null = null;
  private readonly mobileAimWorldDir = new THREE.Vector3();

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
    pooledHostileType?: 'titan_boulder' | 'dragon_fireball';
    pooledHostileIndex?: number;
    velocity?: THREE.Vector3;
    gravity?: number;
  }[] = [];

  // Developer Testing State & FPS Telemetry (browser-only, default OFF)
  private devSettings: DevTestingSettings = getEffectiveDevTestingSettings();
  private unsubDevSettings: (() => void) | null = null;
  private currentFps = 60;
  private fpsFrameAccum = 0;
  private fpsTimeAccum = 0;
  private cachedIgnisEnemy: (typeof this.enemies)[0] | null = null;

  // Pre-allocated Boss Projectile Pools (ZERO PointLight, additive halo glow)
  private titanBoulderPool: Array<{ active: boolean; group: THREE.Group }> = [];
  private titanBoulderPoolGeos: THREE.BufferGeometry[] = [];
  private titanBoulderPoolMats: THREE.Material[] = [];
  private titanBoulderCursor = 0;

  private ignisFireballPool: Array<{ active: boolean; group: THREE.Group }> = [];
  private ignisFireballPoolGeos: THREE.BufferGeometry[] = [];
  private ignisFireballPoolMats: THREE.Material[] = [];
  private ignisFireballCursor = 0;

  // Pre-allocated Caldera Storm, Clouds, Branched Lightning, & Ignis Phase 2 Volcanic Berserk Aura Pools
  private calderaCloudGroup: THREE.Group | null = null;
  private calderaCloudMats: THREE.MeshBasicMaterial[] = [];
  private calderaCloudGeo: THREE.BufferGeometry | null = null;

  private calderaStormPoints: THREE.Points | null = null;
  private calderaStormPositions = new Float32Array(220 * 3);
  private calderaStormColors = new Float32Array(220 * 3);
  private calderaStormVelocities = new Float32Array(220 * 3);
  private calderaStormMat: THREE.PointsMaterial | null = null;

  // Pooled Biome-Locked Weather System (Snow ONLY in northern snow biome, clear day in Desa Utama, warm dust in Desert)
  private readonly BIOME_WEATHER_COUNT = 240;
  private biomeWeatherPoints: THREE.Points | null = null;
  private biomeWeatherPositions = new Float32Array(240 * 3);
  private biomeWeatherColors = new Float32Array(240 * 3);
  private biomeWeatherVelocities = new Float32Array(240 * 3);
  private biomeWeatherPhases = new Float32Array(240);
  private biomeWeatherMat: THREE.PointsMaterial | null = null;
  private biomeWeatherTex: THREE.CanvasTexture | null = null;
  private biomeWeatherOpacity = 0;
  private biomeWeatherActiveCount = 0;
  private lastBiomeWeatherMode: 'none' | 'snow' | 'desert' | 'fireflies' = 'none';
  private readonly CALDERA_STORM_PARTICLE_COUNT = 220;

  private ignisAuraPoints: THREE.Points | null = null;
  private ignisAuraPositions = new Float32Array(180 * 3);
  private ignisAuraColors = new Float32Array(180 * 3);
  private ignisAuraVelocities = new Float32Array(180 * 3);
  private ignisAuraLifes = new Float32Array(180);
  private ignisAuraMaxLifes = new Float32Array(180);
  private ignisAuraMat: THREE.PointsMaterial | null = null;
  private ignisAuraCursor = 0;
  private readonly IGNIS_AURA_PARTICLE_COUNT = 180;

  private calderaLightningPool: Array<{
    active: boolean;
    timer: number;
    duration: number;
    group: THREE.Group;
    outerLines: THREE.LineSegments;
    outerPos: Float32Array;
    outerMat: THREE.LineBasicMaterial;
    coreLines: THREE.LineSegments;
    corePos: Float32Array;
    coreMat: THREE.LineBasicMaterial;
  }> = [];
  private calderaLightningNextTimer = 2.2;
  private calderaLightningFlashTimer = 0;
  private calderaLightningFlashDuration = 0.24;

  // Pre-allocated Scratch Math Objects for Storm Lighting & Weather Blending (Zero per-frame Color alloc)
  private readonly _stormBgColor = new THREE.Color(0x1a171f);
  private readonly _stormFogColor = new THREE.Color(0x2e181c);
  private readonly _stormFlashBgColor = new THREE.Color(0x5b6478);
  private readonly _stormLightTint = new THREE.Color(0x8c7b88);
  private readonly _scratchColorWork = new THREE.Color();

  // Spectator / Freecam Mode (Minecraft-Style Fly Cam)
  public isSpectatorMode = false;
  public isHudHidden = false;
  public spectatorPos = new THREE.Vector3();
  public getSpectatorPos(): THREE.Vector3 {
    return this.spectatorPos;
  }
  private savedCameraFar?: number;
  private savedFogFar?: number;
  private savedFogNear?: number;
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
  public activeInteriorPortal: InteriorPortalDef | null = null;
  private interiorAutoDwellTimer = 0;
  private interiorTransitionCooldown = 0;
  private interiorRearmLocked = false;
  private isTransitioningInterior = false;
  private interiorFadeTimers: ReturnType<typeof setTimeout>[] = [];
  private activeExteriorReturnPos: { x: number; z: number } | null = null;
  private interiorAmbientLight: THREE.AmbientLight | null = null;
  private savedExteriorFog: THREE.Fog | THREE.FogExp2 | null = null;
  private savedExteriorBg: THREE.Color | THREE.Texture | THREE.CubeTexture | null = null;
  private lastInteriorRoomSig = '';
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
      this.applyGraphicsSettings(this.graphicsSettings);
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

    const ambColor = isNight ? 0x64748b : isSunset ? 0xfdba74 : isDawn ? 0xfed7aa : 0xe2e8f0;
    const keyColor = isNight ? 0xe0e7ff : isSunset ? 0xffbe76 : isDawn ? 0xfdba74 : 0xfff7ed;
    const fillCol = isNight ? 0x818cf8 : isSunset ? 0xf29e5a : isDawn ? 0xfed7aa : 0x93c5fd;
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
    isIndoorDummy?: boolean;
    interiorId?: string;
    mesh: THREE.Group;
    parts: Record<string, any>;
    baseY: number;
    attackCooldown: number;
    walkCycle: number;
    spawnPos?: THREE.Vector3;
    spawnRotY?: number;
    respawnTimer?: number;
    isReturning?: boolean;
    isAttacking?: boolean;
    deathTimer?: number;
    leashRadius?: number;
    attackAnimTimer?: number;
    staggerTimer?: number;
    lastStepSign?: number;
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
    // Root scene ambient light dedicated cleanly for interior rendering (intensity=0 outdoors)
    this.interiorAmbientLight = new THREE.AmbientLight(0xfef3c7, 0);
    this.scene.add(this.interiorAmbientLight);
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
    const profile = getDeviceProfile();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(this.graphicsSettings.renderScale * Math.min(dpr, profile.maxPixelRatio));
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

    // Initialize Zero-Allocation Object Pools for Sparks, Combat VFX, Boss Projectiles & Caldera Storm
    this.initSparksPool();
    this.initCombatVfxPools();
    this.initHunterArrowPool();
    this.initBossProjectilePools();
    this.initCalderaStormPools();
    this.initBiomeWeatherPool();

    // Sync local-only Developer & Testing settings (default OFF)
    this.devSettings = getEffectiveDevTestingSettings();
    this.unsubDevSettings = subscribeDevTestingSettings(() => {
      this.devSettings = getEffectiveDevTestingSettings();
      this.bossManager?.setDevFlags(this.devSettings.godMode, this.devSettings.ccImmune);
      if (this.devSettings.zeroCooldown) {
        this.mageUltimateCooldownTimer = 0;
        this.mageGlacialBarrageCooldownTimer = 0;
        this.mageBlinkCooldownTimer = 0;
        this.mageCahayaSuciCooldownTimer = 0;
        this.hunterMobilityCooldownTimer = 0;
        this.bowShotCooldownTimer = 0;
        this.skillCooldownsManager.forceZeroAll();
      }
      if (this.devSettings.enabled && this.devSettings.spectatorMode !== this.isSpectatorMode) {
        this.toggleSpectatorMode(this.devSettings.spectatorMode, false);
      } else if (!this.devSettings.enabled && this.isSpectatorMode && !this.savedCameraFar) {
        // Keep F3 standalone behavior safe; no override when dev disabled
      }
    });

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

    // 2. Build 4 Environmental Thematic Zones & Natural Instanced Vegetation (menggunakan heightmap terrain dasar)
    this.worldEnvironment = buildWorldEnvironment(
      this.scene,
      (x, z) => getExactMeshGroundHeight(x, z),
      this.world.colliders
    );
    if (this.world?.exteriorWorldGroup && this.worldEnvironment?.group) {
      this.world.exteriorWorldGroup.add(this.worldEnvironment.group);
    }

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
          if (this.devSettings.godMode) return;
          this.respawnPlayerAtLastVisitedTown();
        },
        onDamageAbsorb: (rawDmg) => this.absorbDamageWithShield(rawDmg).remainingDamage,
        onPlayerDamaged: (actualDamage) => this.handlePlayerTookDamage(actualDamage),
        onDecoyHit: () => this.dismissActiveShadowDecoy(false),
        onAirborneChange: (isAirborne: boolean) => {
          this.isDragonAirborne = isAirborne;
        },
        onIgnisVisualReset: () => this.clearIgnisPhase2AuraParticles(),
      }
    );
    this.bossManager.setDevFlags(this.devSettings.godMode, this.devSettings.ccImmune);

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

    // 9. Position player mesh on solid ground surface
    const startY = getSolidGroundHeight(this.playerPos.x, this.playerPos.z);
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

    const useCache = isWorldCacheEnabled();
    const terrainGridSpec = {
      minX: TERRAIN_GRID.minX,
      maxX: TERRAIN_GRID.maxX,
      minZ: TERRAIN_GRID.minZ,
      maxZ: TERRAIN_GRID.maxZ,
      segmentsX: TERRAIN_GRID.segmentsX,
      segmentsZ: TERRAIN_GRID.segmentsZ,
    };
    let modularCache: ModularWorldCacheLoadResult | null = null;
    let cachedWorld: WorldCachePayload | null = null;

    if (useCache) {
      onProgress?.(12, 'Memeriksa Modular Smart Cache Browser...');
      modularCache = await loadModularWorldCache(terrainGridSpec);
      cachedWorld = modularCache.payload;
      if (modularCache.hitCount > 0) {
        onProgress?.(
          15,
          `Memuat dunia dari Cache Browser (${modularCache.hitCount}/3 modul cocok)...`
        );
      }
    }

    if (!modularCache?.terrain) {
      // Tahap 1: 15% Membangun Geometri & Heightmap Benua Eldoria
      onProgress?.(15, 'Membangun Geometri & Heightmap Benua Eldoria...');
      await yieldToMainThread();
    }

    // 1. Build 3D World (terrain, ocean, structures, colliders, lights, props) with time-sliced async / cache fast-path
    this.world = await buildWorldAsync(this.scene, onProgress, cachedWorld);

    if (modularCache?.worldMap?.worldMapBlob) {
      onProgress?.(46, 'Memuat Peta & Minimap dari Cache Browser...');
      await hydrateWorldMapRasterFromBlob(modularCache.worldMap.worldMapBlob);
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => resolve());
        } else {
          setTimeout(resolve, 0);
        }
      });
    }

    // Connect Day-Night outdoor lighting and dynamic PointLights
    if (this.world?.hemiLight && this.world?.dirLight) {
      this.dayNightSystem.applyOutdoorLighting(this.scene, this.world.hemiLight, this.world.dirLight, this.playerPos);
    }
    this.scenePointLights = this.world.pointLights || [];

    // Tahap 3b: 61% Menginisialisasi Boss Arena, Checkpoints, & Sistem Cahaya
    onProgress?.(61, 'Menginisialisasi Boss Arena, Checkpoints, & Sistem Cahaya (61%)...');
    await cooperativeYield(6);

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
          if (this.devSettings.godMode) return;
          this.respawnPlayerAtLastVisitedTown();
        },
        onDamageAbsorb: (rawDmg) => this.absorbDamageWithShield(rawDmg).remainingDamage,
        onPlayerDamaged: (actualDamage) => this.handlePlayerTookDamage(actualDamage),
        onDecoyHit: () => this.dismissActiveShadowDecoy(false),
        onAirborneChange: (isAirborne: boolean) => {
          this.isDragonAirborne = isAirborne;
        },
        onIgnisVisualReset: () => this.clearIgnisPhase2AuraParticles(),
      }
    );
    this.bossManager.setDevFlags(this.devSettings.godMode, this.devSettings.ccImmune);

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

    // Tahap 4: 64% - 80% Populasi Vegetasi & Bebatuan (InstancedMesh) Time-Sliced / Cache Fast-Path
    onProgress?.(
      64,
      modularCache?.props
        ? 'Memuat Vegetasi dari Cache Browser (Mode Cepat)...'
        : 'Populasi Vegetasi & Tata Ruang Wilayah (64%)...'
    );
    await cooperativeYield(6);

    // 2. Build 4 Environmental Thematic Zones & Natural Instanced Vegetation with TypedArray spatial lookup
    this.worldEnvironment = await buildWorldEnvironmentAsync(
      this.scene,
      (x, z) => getExactMeshGroundHeight(x, z),
      this.world.colliders,
      onProgress,
      cachedWorld,
      true
    );
    if (this.world?.exteriorWorldGroup && this.worldEnvironment?.group) {
      this.world.exteriorWorldGroup.add(this.worldEnvironment.group);
    }

    // Position player mesh on solid ground surface
    const startY = getSolidGroundHeight(this.playerPos.x, this.playerPos.z);
    this.playerPos.y = startY;
    if (this.playerMesh?.group) {
      this.playerMesh.group.position.copy(this.playerPos);
    }

    // Tahap 5: 82% Pre-Alokasi Pool VFX Karakter & Skill Mage
    onProgress?.(82, 'Pre-Alokasi Pool VFX Karakter & Skill Mage (82%)...');
    await cooperativeYield(6);

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
    await cooperativeYield(6);

    // Tahap 6: 86% Mengompilasi Shader GPU Global (renderer.compile / compileAsync)
    onProgress?.(86, 'Mengompilasi Shader GPU Global (86%)...');
    await cooperativeYield(6);

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
    await cooperativeYield(6);

    // Tahap 7a: 90% In-Frustum GPU Shader Warm-Up Khusus Mage
    onProgress?.(90, 'Kompilasi Shader Pool Sihir Mage (90%)...');
    await cooperativeYield(6);

    if (this.scene && this.renderer && this.camera) {
      await preloadMageVfxPoolAsync(this.scene, this.renderer, this.camera, async () => {
        await cooperativeYield(6);
      });
    }
    await cooperativeYield(6);

    // Tahap 7b: 94% In-Frustum GPU Shader Warm-Up Khusus Pemburu & Assassin
    onProgress?.(94, 'Kompilasi Shader Pool Panah & Bayangan Pemburu (94%)...');
    await cooperativeYield(6);

    if (this.scene && this.renderer && this.camera) {
      await this.prewarmHunterShadersInFrustumAsync();
    }
    await cooperativeYield(6);

    // Tahap 7c: 98% Warm-Up Shader Boss Telegraph & Efek Tempur
    onProgress?.(98, 'Kompilasi Shader Boss Telegraph & Efek Tempur (98%)...');
    await cooperativeYield(6);
    if (this.bossManager && this.renderer && this.scene && this.camera) {
      try {
        if (typeof (this.renderer as any).compileAsync === 'function') {
          await (this.renderer as any).compileAsync(this.scene, this.camera);
        }
      } catch (e) {
        console.warn('[Engine] Boss shader warm-up compile warning:', e);
      }
    }
    await cooperativeYield(6);

    this.isWorldLoaded = true;

    // Daftarkan provider snapshot aktif agar toggle "Simpan Cache Dunia" di Pengaturan langsung menyimpan instan!
    registerActiveWorldSnapshotProvider(() => this.captureCurrentWorldSnapshot(terrainGridSpec));

    // Tahap 8: 100% Membuka tirai loading secara halus
    onProgress?.(100, 'Dunia Eldoria Siap! Menyerahkan Kontrol...');

    // HANYA jika cache lokal aktif & ada modul yang miss/stale (Partial Invalidation), simpan modul yang kurang di background
    if (
      useCache &&
      (!modularCache?.terrain || !modularCache?.worldMap || !modularCache?.props)
    ) {
      void this.persistWorldCacheInBackground(modularCache, terrainGridSpec);
    }
  }

  private captureCurrentWorldSnapshot(terrainGridSpec: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    segmentsX: number;
    segmentsZ: number;
  }): ActiveWorldSnapshot | null {
    const terrainGeo = this.world?.terrainMesh?.geometry;
    const posAttr = terrainGeo?.attributes?.position?.array as Float32Array | undefined;
    const colAttr = terrainGeo?.attributes?.color?.array as Float32Array | undefined;
    const normAttr = terrainGeo?.attributes?.normal?.array as Float32Array | undefined;
    const heightLookup = getMeshGroundHeights();
    if (!posAttr || !colAttr || !normAttr || !heightLookup) {
      return null;
    }

    const spatial = SpatialLookupGrid.get();
    return {
      terrainPositions: posAttr,
      terrainColors: colAttr,
      terrainNormals: normAttr,
      heightLookupGrid: heightLookup,
      propMatrices: this.worldEnvironment?.propMatrices,
      spatialHeightGrid: spatial.isBuilt ? spatial.heightGrid : undefined,
      spatialFlagsGrid: spatial.isBuilt ? spatial.flagsGrid : undefined,
      terrainGridSpec,
    };
  }

  private async persistWorldCacheInBackground(
    modularCache: ModularWorldCacheLoadResult | null,
    terrainGridSpec: {
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      segmentsX: number;
      segmentsZ: number;
    }
  ): Promise<void> {
    if (!isWorldCacheEnabled()) return;

    try {
      await cooperativeYield(6);
      const snapshot = this.captureCurrentWorldSnapshot(terrainGridSpec);
      if (!snapshot) return;

      const hashes = modularCache?.hashes;
      let savedAny = false;

      if (!modularCache?.terrain && hashes) {
        const ok = await saveModularCache(hashes.terrainKey, hashes.terrainHash, {
          terrainPositions: new Float32Array(snapshot.terrainPositions),
          terrainColors: new Float32Array(snapshot.terrainColors),
          terrainNormals: new Float32Array(snapshot.terrainNormals),
          heightLookupGrid: new Float32Array(snapshot.heightLookupGrid),
          spatialHeightGrid: snapshot.spatialHeightGrid
            ? new Float32Array(snapshot.spatialHeightGrid)
            : undefined,
          spatialFlagsGrid: snapshot.spatialFlagsGrid
            ? new Uint8Array(snapshot.spatialFlagsGrid)
            : undefined,
        });
        if (ok) savedAny = true;
      }

      if (!modularCache?.worldMap && hashes && isWorldCacheEnabled()) {
        const worldMapBlob = await exportWorldMapRasterToBlob();
        if (worldMapBlob && isWorldCacheEnabled()) {
          const ok = await saveModularCache(hashes.worldMapKey, hashes.worldMapHash, {
            worldMapBlob,
          });
          if (ok) savedAny = true;
        }
      }

      if (!modularCache?.props && snapshot.propMatrices && hashes && isWorldCacheEnabled()) {
        const clonedProps: Record<string, Float32Array> = {};
        for (const key of Object.keys(snapshot.propMatrices)) {
          clonedProps[key] = new Float32Array(snapshot.propMatrices[key]);
        }
        const ok = await saveModularCache(hashes.propsKey, hashes.propsHash, {
          propMatrices: clonedProps,
        });
        if (ok) savedAny = true;
      }

      if (!hashes) {
        snapshot.worldMapBlob = await exportWorldMapRasterToBlob();
        const ok = await saveAllModularCaches(snapshot);
        if (ok) savedAny = true;
      }

      if (savedAny && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('eldoria_world_cache_saved', {
            detail: { message: '⚡ Modular Smart Cache disimpan di browser ini untuk loading berikutnya' },
          })
        );
      }
    } catch (err) {
      console.warn('[Engine] Penyimpanan background cache dunia dilewati:', err);
    }
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
    this.hunterMobilityCooldownTimer = 0;
    this.skillCooldownsManager.resetAll();
    this.isGaleVaulting = false;
    this.galeVaultTimer = 0;
    this.phantomAmbushReady = false;
    this.phantomAmbushTimer = 0;
    this.endPlayerStealth('reset');
    this.dismissActiveShadowDecoy(true);
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
    if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
      this.cancelAstralEagleAim(false);
    }
    if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
      this.cancelArrowVolleyAim(false);
    }
    this.clearActiveBowSkillPools();
    this.activeScorchedCraters = [];
    this.arcaneShieldTimer = 0;
    this.arcaneShieldHp = 0;
    this.bossManager?.clearDebuffs();
  }

  public getTerrainHeight(x: number, z: number, currentY?: number): number {
    return getSolidGroundHeight(x, z, currentY);
  }

  public setCharacterClass(newClass: CharacterClass) {
    this.endPlayerStealth('reset');
    this.dismissActiveShadowDecoy(true);
    this.skillCooldownsManager.resetAll();
    this.charClass = newClass;
    this.rebuildPlayerMesh();
  }

  public applyGraphicsSettings(settings: GraphicsSettings) {
    this.graphicsSettings = settings;

    const isMobile = isMobileRenderDevice();
    const profile = getDeviceProfile();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // 1. Resolution / Pixel Ratio Scaling
    if (isMobile) {
      let targetRatio = Math.min(dpr, 1.0);
      if (settings.preset === 'low') {
        targetRatio = Math.min(dpr, 0.75);
      } else if (settings.preset === 'high') {
        targetRatio = Math.min(dpr, 1.5);
      } else if (settings.preset === 'custom') {
        targetRatio = Math.min(dpr * settings.renderScale, 1.5);
      } else {
        targetRatio = Math.min(dpr, 1.0);
      }
      this.renderer.setPixelRatio(Math.max(0.5, targetRatio));
    } else {
      this.renderer.setPixelRatio(settings.renderScale * Math.min(dpr, profile.maxPixelRatio));
    }

    // 2. Real-Time Shadow Profile (Mobile Low: OFF | Mobile Med: 512px Basic | Mobile High: 1024px PCFSoft)
    const shadowsEnabled = isMobile && settings.preset === 'low' ? false : Boolean(settings.shadows);
    this.renderer.shadowMap.enabled = shadowsEnabled;
    this.renderer.shadowMap.autoUpdate = false;

    if (isMobile) {
      if (shadowsEnabled) {
        const useHighShadow = settings.preset === 'high' || settings.shadowQuality === 'high';
        this.renderer.shadowMap.type = useHighShadow ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
        if (this.world?.dirLight) {
          const dl = this.world.dirLight;
          dl.castShadow = true;
          const targetSize = useHighShadow ? 1024 : 512;
          const targetBounds = useHighShadow ? 75 : 40;
          if (dl.shadow.mapSize.width !== targetSize || dl.shadow.mapSize.height !== targetSize) {
            dl.shadow.mapSize.set(targetSize, targetSize);
            if (dl.shadow.map) {
              dl.shadow.map.dispose();
              dl.shadow.map = null;
            }
          }
          dl.shadow.camera.left = -targetBounds;
          dl.shadow.camera.right = targetBounds;
          dl.shadow.camera.top = targetBounds;
          dl.shadow.camera.bottom = -targetBounds;
          dl.shadow.camera.far = useHighShadow ? 300 : 220;
          dl.shadow.camera.updateProjectionMatrix();
        }
        this.renderer.shadowMap.needsUpdate = true;
      } else if (this.world?.dirLight) {
        this.world.dirLight.castShadow = false;
      }
    } else {
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      if (this.world?.dirLight) {
        this.world.dirLight.castShadow = shadowsEnabled;
      }
      if (shadowsEnabled) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }

    if (this.scene) {
      this.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = shadowsEnabled;
          mesh.receiveShadow = shadowsEnabled;
          if (isMobile && !mesh.userData?.pooledVfx && !mesh.name?.includes('Aim') && !mesh.name?.includes('Eagle')) {
            mesh.frustumCulled = true;
          }
        }
      });
    }

    // 3. 3D Instanced Grass Density & Non-Essential Ambient Particles
    if (isMobile) {
      const grassScale =
        settings.preset === 'low' || settings.enableGrass === false
          ? 0
          : settings.preset === 'medium'
          ? 0.35
          : settings.preset === 'high'
          ? 0.75
          : 0.5;
      this.worldEnvironment?.setGrassDensity?.(grassScale);

      const particlesOn = settings.preset !== 'low' && settings.enableParticles !== false;
      if (this.world?.particles) {
        this.world.particles.visible = particlesOn;
      }
      this.worldEnvironment?.setAmbientEffectsVisible?.(particlesOn);
    } else {
      this.worldEnvironment?.setGrassDensity?.(settings.enableGrass === false ? 0 : 1.0);
      const particlesOn = settings.enableParticles !== false;
      if (this.world?.particles) {
        this.world.particles.visible = particlesOn;
      }
      this.worldEnvironment?.setAmbientEffectsVisible?.(particlesOn);
    }

    // 4. Camera Far & Atmospheric Fog Culling (Do not override menu preview camera or spectator mode)
    let targetFar = Math.max(50, settings.renderDistance * profile.drawDistanceScale);
    let fogFar = targetFar * 0.92;
    let fogNear = fogFar * 0.35;

    if (isMobile) {
      if (settings.preset === 'low') {
        targetFar = 160;
        fogFar = 145;
        fogNear = 50;
      } else if (settings.preset === 'medium') {
        targetFar = 260;
        fogFar = 240;
        fogNear = 84;
      } else if (settings.preset === 'high') {
        targetFar = 420;
        fogFar = 390;
        fogNear = 135;
      } else {
        targetFar = Math.max(120, Math.min(450, settings.renderDistance));
        fogFar = targetFar * 0.92;
        fogNear = fogFar * 0.35;
      }
    }

    if (this.menuMode === 'gameplay' && !this.isSpectatorMode) {
      this.camera.far = targetFar;
      this.camera.updateProjectionMatrix();

      if (this.scene.fog) {
        if (isMobile) {
          const curColor = this.scene.fog.color.clone();
          if (!(this.scene.fog instanceof THREE.Fog)) {
            this.scene.fog = new THREE.Fog(curColor, fogNear, fogFar);
          } else {
            this.scene.fog.near = fogNear;
            this.scene.fog.far = fogFar;
          }
        } else if (this.scene.fog instanceof THREE.Fog) {
          this.scene.fog.far = fogFar;
          this.scene.fog.near = fogNear;
        }
      }
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

  private capturePlayerMaterialSnapshots() {
    this.playerMatSnapshots = [];
    if (!this.playerMesh?.group) return;
    const seen = new Set<THREE.Material>();
    this.playerMesh.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const rawMat = (obj as THREE.Mesh).material;
        const mats = Array.isArray(rawMat) ? rawMat : [rawMat];
        for (const m of mats) {
          if (!m || seen.has(m)) continue;
          seen.add(m);
          const colorObj = (m as any).color as THREE.Color | undefined;
          this.playerMatSnapshots.push({
            mat: m,
            opacity: m.opacity,
            transparent: m.transparent,
            colorHex: colorObj ? colorObj.getHex() : undefined,
          });
        }
      }
    });
  }

  public rebuildPlayerMesh() {
    this.endPlayerStealth('reset');
    if (this.playerMesh && this.playerMesh.group) {
      this.scene.remove(this.playerMesh.group);
    }
    this.playerMesh = createPlayerMesh(this.charClass, this.playerTier);
    this.capturePlayerMaterialSnapshots();
    this.playerMesh.group.position.copy(this.playerPos);
    this.playerMesh.group.rotation.y = this.playerRotationY;
    this.scene.add(this.playerMesh.group);
    if (this.charClass === 'rogue') {
      this.isWeaponDrawn = false;
      this.isHunterSheathed = true;
      this.combatIdleTimer = 0;
      this.weaponDrawTransitionTimer = 0;
      this.syncHunterWeaponModel();
      this.callbacks.onWeaponDrawnChange?.(false);
    }
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
    let tLastSpawnYield = performance.now();
    const spawnGroupAsync = async <T>(
      list: T[],
      spawner: (item: T, index: number) => void
    ) => {
      for (let i = 0; i < list.length; i++) {
        spawner(list[i], i);
        if (performance.now() - tLastSpawnYield > 6) {
          await hardYield();
          tLastSpawnYield = performance.now();
        }
      }
    };

    onProgress?.(62, 'Menempatkan Populasi Monster & Penjaga Wilayah (62%)...');
    await cooperativeYield(6);

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

    // 8. Ancient Obsidian Titan Golem Boss in North Crater Arena (X: 340, Z: -560)
    onProgress?.(64, 'Membangkitkan World Boss: Sang Titan Kuno Obsidian (64%)...');
    await cooperativeYield(8);
    const titanLayout = getLandmarkLayout('bossGolem') || getLandmarkLayout('kawah_boss');
    const bossPos: [number, number] = [
      titanLayout?.x ?? SPAWN_TITAN.x,
      titanLayout?.z ?? SPAWN_TITAN.z,
    ];
    const { group: bossGroup, parts: bossParts } = createEnemyMesh('boss');
    const by = this.world.getTerrainHeight(bossPos[0], bossPos[1]);
    bossGroup.position.set(bossPos[0], by, bossPos[1]);
    this.scene.add(bossGroup);

    const bossData: EnemyData = {
      id: 'boss_titan',
      name: 'Obsidian Titan Golem',
      nameId: 'Sang Titan Kuno Obsidian',
      type: 'boss',
      level: 10,
      hp: 1350,
      maxHp: 1350,
      attack: 44,
      defense: 20,
      expReward: 1200,
      goldReward: 850,
      speed: 3.1,
      attackRange: 8.5,
      detectRange: 44,
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
    onProgress?.(66, 'Membangkitkan Penguasa Kaldera & Pasukan Monster Gurun (66%)...');
    await cooperativeYield(4);
    const dragonPositions: [number, number][] = [
      [33, 740],   // Penjaga Kepala Utara Jembatan Obsidian
      [47, 740],   // Penjaga Kepala Utara Jembatan Obsidian
      [-138, 892], // Pulau Satelit Barat Daya
      [-128, 772], // Pulau Satelit Barat Laut
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
    onProgress?.(63, 'Membangkitkan World Boss: Ignis, Sang Naga Purba (63%)...');
    await cooperativeYield(8);
    const wyrmPos: [number, number] = [40, 840];
    const { group: wyrmGroup, parts: wyrmParts } = createEnemyMesh('dragon');
    const wyrmY = this.world.getTerrainHeight(wyrmPos[0], wyrmPos[1]);
    wyrmGroup.position.set(wyrmPos[0], wyrmY, wyrmPos[1]);
    wyrmGroup.rotation.y = Math.PI; // Menghadap Utara menyambut pahlawan di Jembatan Obsidian
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
      detectRange: 64,
      position: [wyrmPos[0], wyrmY, wyrmPos[1]],
      isDead: false,
      dropItems: [
        { item: CHEST_LOOT_POOL[0], chance: 1.0 },
        { item: CHEST_LOOT_POOL[1], chance: 1.0 },
      ],
    };

    const ignisEntry = {
      data: wyrmData,
      mesh: wyrmGroup,
      parts: wyrmParts,
      baseY: wyrmY,
      spawnPos: new THREE.Vector3(wyrmPos[0], wyrmY, wyrmPos[1]),
      spawnRotY: Math.PI,
      leashRadius: 64,
      attackCooldown: 0,
      walkCycle: 0,
    };
    this.enemies.push(ignisEntry);
    this.cachedIgnisEnemy = ignisEntry;
    await cooperativeYield(8);

    // Solaria Desert Colossal Super Boss: Jarrus, Sang Cacing Purba (Segmented Burrowing Sandworm: [495, -362])
    onProgress?.(64, 'Membangkitkan World Boss: Jarrus, Sang Cacing Purba (64%)...');
    await cooperativeYield(8);
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
      speed: 14.5,
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

    // Spawn Mage Tower Level 2 Indoor Energy Training Dummies (Immortal Combat Practice)
    const mtDummySpawns = this.world?.interiorManager?.rooms.get('mage_tower_interior')?.trainingDummySpawns ?? [];
    mtDummySpawns.forEach((ds) => {
      const dummyGroup = createTrainingDummyMesh();
      dummyGroup.position.set(ds.x, ds.y, ds.z);
      dummyGroup.rotation.y = Math.PI;
      dummyGroup.visible = false;
      this.scene.add(dummyGroup);
      this.enemies.push({
        data: {
          id: ds.id,
          name: ds.name,
          nameId: ds.nameId,
          type: 'golem',
          level: 1,
          hp: 99999,
          maxHp: 99999,
          attack: 0,
          defense: 0,
          expReward: 0,
          goldReward: 0,
          speed: 0,
          attackRange: 0,
          detectRange: 0,
          position: [ds.x, ds.y, ds.z],
          isDead: false,
          dropItems: [],
        },
        mesh: dummyGroup,
        parts: { torso: dummyGroup },
        baseY: ds.y,
        attackCooldown: 0,
        walkCycle: 0,
        spawnPos: new THREE.Vector3(ds.x, ds.y, ds.z),
        leashRadius: 0,
        isReturning: false,
        deathTimer: 0,
        isIndoorDummy: true,
        interiorId: 'mage_tower_interior',
      });
    });

    // Initialize territory origin points and leash parameters for all monsters
    this.enemies.forEach((e) => {
      if (!e.spawnPos) {
        e.spawnPos = e.mesh.position.clone();
      }
      e.isReturning = false;
      e.deathTimer = 0;
      e.leashRadius =
        BOSS_ARENA_ZONES[e.data.id]?.territoryRadius ??
        (e.data.type === 'boss' ? 42 : 22);
    });
    await cooperativeYield(4);
  }

  private spawnEnemies(): void {
    void this.spawnEnemiesAsync();
  }

  // Fast travel / teleport from map

  public respawnPlayerAtLastVisitedTown() {
    if (this.devSettings.godMode) {
      this.callbacks.onUpdateStats((stats) => ({
        ...stats,
        hp: stats.maxHp,
        mp: stats.maxMp,
      }));
      this.callbacks.onAddFloatingText('🛡️ KEBAL KEMATIAN (GOD MODE)!', '#38bdf8', 'info');
      return;
    }
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
    this.endPlayerStealth('reset');
    this.dismissActiveShadowDecoy(true);
    this.cancelAstralEagleAim(false);
    this.cancelArrowVolleyAim(false);
    this.clearActiveBowSkillPools();
    this.bossManager.clearDebuffs();
    this.bossManager.notifyPlayerRespawn();
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
    if (this.world?.interiorManager?.activeRoom) {
      this.world.interiorManager.setActiveRoom(null);
      if (this.world.exteriorWorldGroup) {
        this.world.exteriorWorldGroup.visible = true;
      }
      this.activeExteriorReturnPos = null;
      this.lastInteriorRoomSig = '';
      this.callbacks.onInteriorRoomChange?.(null);
      this.callbacks.onInteriorPortalState?.(null);
      this.restoreExteriorAtmosphereAndLights();
      this.enemies.forEach((e) => {
        if (e.isIndoorDummy) e.mesh.visible = false;
        else e.mesh.visible = !e.data.isDead;
      });
    }
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
    if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
      e.preventDefault();
      this.glacialAimState.isCharging = false;
      this.glacialAimState.cancelled = true;
      this.cancelGlacialAim();
      return;
    }
    if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
      e.preventDefault();
      this.cancelAstralEagleAim(true);
      return;
    }
    if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
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
    if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
      this.glacialAimState.isCharging = false;
      this.cancelGlacialAim();
    }
    if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
      this.cancelAstralEagleAim(false);
    }
    if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
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
      if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
        this.glacialAimState.isCharging = false;
        this.cancelGlacialAim();
      }
      if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
        this.cancelAstralEagleAim(false);
      }
      if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
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
    this.isHoldingBowAttack = false;
    this.isAimingBow = false;
    this.bowChargeRatio = 0;
    this.isChargingAstralEagle = false;
    this.astralEagleChargeRatio = 0;
    this.astralEagleAimState = { isCharging: false, pressStartTime: 0, cancelled: false };
    this.isHoldingArrowVolleyKey = false;
    this.arrowVolleyAimState = { isCharging: false, pressStartTime: 0, cancelled: false };
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

      // Dynamic High-Altitude Visibility: Extend camera.far and fog distance so whole continent is visible
      this.savedCameraFar = this.camera.far;
      if (this.scene.fog instanceof THREE.Fog) {
        this.savedFogFar = this.scene.fog.far;
        this.savedFogNear = this.scene.fog.near;
        this.scene.fog.far = Math.max(this.scene.fog.far, 2500);
        this.scene.fog.near = Math.max(this.scene.fog.near, 900);
      }
      this.camera.far = Math.max(this.camera.far, 2600);
      this.camera.updateProjectionMatrix();

      this.callbacks.onAddFloatingText(
        'Mode Spektator Aktif (WASD / Space / Shift / Scroll Speed)',
        '#38bdf8',
        'info'
      );
    } else {
      // Restore camera.far and fog distance
      if (this.savedCameraFar !== undefined) {
        this.camera.far = this.savedCameraFar;
        this.camera.updateProjectionMatrix();
      }
      if (this.scene.fog instanceof THREE.Fog && this.savedFogFar !== undefined) {
        this.scene.fog.far = this.savedFogFar;
        if (this.savedFogNear !== undefined) {
          this.scene.fog.near = this.savedFogNear;
        }
      }

      if (landAtCamera) {
        this.playerPos.x = this.spectatorPos.x;
        this.playerPos.z = this.spectatorPos.z;
        this.playerPos.y = getSolidGroundHeight(this.spectatorPos.x, this.spectatorPos.z);
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

    // Dynamic Absolute Boundaries for Spectator Freecam (True Noclip across continent & oceans):
    // 1. Horizontal Bounds: Synchronized with latest WORLD_BOUNDS with +/- 20 padding
    const minX = WORLD_BOUNDS.minX - 20;
    const maxX = WORLD_BOUNDS.maxX + 20;
    const minZ = WORLD_BOUNDS.minZ - 20;
    const maxZ = WORLD_BOUNDS.maxZ + 20;

    this.spectatorPos.x = Math.max(minX, Math.min(maxX, this.spectatorPos.x));
    this.spectatorPos.z = Math.max(minZ, Math.min(maxZ, this.spectatorPos.z));

    // 2. Deep Underground Bound: allow subterranean/underwater inspection, clamped to prevent infinite void fall
    const groundY = getSolidGroundHeight(this.spectatorPos.x, this.spectatorPos.z);
    const minY = Math.min(-45, groundY - 40);

    // 3. Dynamic Maximum Altitude based on camera far plane
    const cameraFar = this.camera?.far ?? 2600;
    const maxY = Math.min(480, cameraFar * 0.42);

    this.spectatorPos.y = Math.max(minY, Math.min(maxY, this.spectatorPos.y));

    this.camera.position.copy(this.spectatorPos);
    const lookTarget = this.spectatorPos.clone().add(new THREE.Vector3(fwdX, fwdY, fwdZ));
    this.camera.lookAt(lookTarget);
  }

  public updateSpectatorCamera(delta: number) {
    this.updateSpectatorMovement(delta);
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
      if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
        this.glacialAimState.isCharging = false;
        this.glacialAimState.cancelled = true;
        this.cancelGlacialAim();
        return;
      }
      if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
        this.cancelAstralEagleAim();
        return;
      }
      if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
        this.cancelArrowVolleyAim();
        return;
      }
      if (this.isAimingBow || this.isHoldingBowAttack) {
        this.cancelBowAim();
        return;
      }
    }

    if (key === 'f' || code === 'keyf') {
      const canInteractCheck = !this.isAimingArrowVolley && !this.arrowVolleyAimState.isCharging;
      const didInteract = canInteractCheck ? this.checkInteract() : false;
      if (!didInteract) {
        if (this.charClass === 'mage') {
          // Mage: Tombol [F] (Slot 4 - ULTIMATE): Celestial Apocalypse / Starfall Ultimate
          this.startStarfallCasting();
        } else if (this.charClass === 'rogue') {
          this.unsheatheHunterWeapon();
          if (this.hunterWeaponMode === 'bow') {
            if (!e.repeat) {
              this.startAimArrowVolley();
            }
          } else {
            this.castSkill(4);
          }
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
      // Slot 1 (Q): Mage Glacial Crystal Barrage / Hunter Bow Panah Rajawali Astral / Warrior Triple Crescent / Rogue Tarian Belati
      if (this.charClass === 'rogue') {
        this.unsheatheHunterWeapon();
      }
      if (this.charClass === 'mage') {
        if (!e.repeat) {
          const cdCheck = this.skillCooldownsManager.canUse('mage_q', this.isZeroCd());
          if (!cdCheck.ok) {
            this.callbacks.onAddFloatingText(
              `Glacial Barrage Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
              '#94a3b8',
              'info'
            );
            return;
          }
          if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 18) {
            this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 18 MP)!', '#ef4444', 'info');
            return;
          }
          this.glacialAimState = {
            isCharging: true,
            pressStartTime: performance.now(),
            cancelled: false,
          };
          this.isHoldingGlacialKey = true;
          this.glacialKeyDownTime = this.glacialAimState.pressStartTime;
          if (this.glacialAimTimer) {
            clearTimeout(this.glacialAimTimer);
            this.glacialAimTimer = null;
          }
          this.startAimGlacialBarrage();
        }
      } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        if (!e.repeat) {
          this.startAimAstralEagle();
        }
      } else {
        this.castSkill(1);
      }
    } else if (key === 'e' || code === 'keye') {
      if (this.triggerActiveInteriorPortal()) {
        return;
      }
      // Slot 2 (E):
      // Mage: Arcane Blink [E] / Rogue: Bayangan Pengecoh [E] Dual Mode / Warrior: Shield Dash [E]
      if (this.charClass === 'mage') {
        this.castArcaneBlink();
      } else if (this.charClass === 'rogue') {
        this.castSkill(2);
      } else {
        this.performDash();
      }
    } else if (key === 'shift' || code === 'shiftleft' || code === 'shiftright') {
      // Tombol [Shift] (Sprint / Terbang Cepat)
    } else if (key === 'r' || code === 'keyr') {
      // Slot 3 (R):
      // Mage: Cahaya Suci [R] / Knight: Aegis Retribution [R] / Rogue: Bom Asap Stealth [R] Dual Mode
      if (this.charClass === 'mage') {
        this.castCahayaSuci();
      } else {
        this.castSkill(3);
      }
    } else if (key === 'x' || code === 'keyx') {
      // Manual Toggle Senjata Open-World: Siaga (Terhunus) <-> Santai (Handless / Tersarung)
      if (this.charClass === 'rogue') {
        this.toggleWeaponDrawn();
      }
    } else if (key === 't' || code === 'keyt') {
      this.switchHunterWeapon();
    }
  };

  public switchHunterWeapon(targetMode?: 'dagger' | 'bow') {
    if (this.charClass !== 'rogue') return;
    if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
      this.cancelAstralEagleAim(false);
    }
    if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
      this.cancelArrowVolleyAim(false);
    }
    if (this.isHoldingBowAttack || this.isAimingBow) {
      this.cancelBowAim();
    }
    this.clearActiveBowSkillPools();
    this.bowCombatStanceTimer = 0;
    this.bowShotCooldownTimer = 0;
    this.hunterWeaponMode = targetMode || (this.hunterWeaponMode === 'dagger' ? 'bow' : 'dagger');
    // Saat switch senjata ke Busur/Belati, langsung aktifkan Mode Siaga (terhunus di tangan) & reset timer 7.0s
    this.isWeaponDrawn = true;
    this.isHunterSheathed = false;
    this.combatIdleTimer = 7.0;
    this.weaponDrawTransitionTimer = 0.12;
    if (this.playerMesh.setHunterWeaponMode) {
      this.playerMesh.setHunterWeaponMode(this.hunterWeaponMode);
    }
    this.syncHunterWeaponModel();
    this.callbacks.onWeaponDrawnChange?.(true);
    if (this.hunterWeaponMode === 'bow') {
      soundManager.playBowDraw();
      this.callbacks.onAddFloatingText('Mode Senjata: Busur Pemburu (Siaga) 🏹', '#34d399', 'info');
    } else {
      soundManager.playRogueDoubleSlash();
      this.callbacks.onAddFloatingText('Mode Senjata: Belati Kembar (Siaga) 🗡️', '#10b981', 'info');
    }
    if (this.callbacks.onHunterWeaponSwitch) {
      this.callbacks.onHunterWeaponSwitch(this.hunterWeaponMode);
    }
  }

  public getHunterWeaponMode(): 'dagger' | 'bow' {
    return this.hunterWeaponMode;
  }

  public getHudCooldowns(): HudSkillCooldownMap {
    return this.skillCooldownsManager.getHudMap(this.charClass, this.hunterWeaponMode);
  }

  public hasActiveSkillCooldowns(): boolean {
    return this.skillCooldownsManager.hasAnyActive();
  }

  public subscribeCooldownUpdates(listener: () => void): () => void {
    return this.skillCooldownsManager.subscribe(listener);
  }

  public getStealthState(): { active: boolean; remaining: number } {
    return {
      active: this.isPlayerStealthed,
      remaining: Math.max(0, this.stealthTimer),
    };
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
        if (this.glacialAimTimer) {
          clearTimeout(this.glacialAimTimer);
          this.glacialAimTimer = null;
        }
        this.isHoldingGlacialKey = false;
        if (!this.glacialAimState.isCharging || this.glacialAimState.cancelled) {
          return;
        }
        const holdDuration = performance.now() - this.glacialAimState.pressStartTime;
        // Baik holdDuration < 220 (Tap Cepat) MAUPUN holdDuration >= 220 (Hold & Release):
        this.glacialAimState.isCharging = false;
        // WAJIB PANGGIL executeGlacialBarrage() untuk langsung menembakkan seluruh gelombang kristal es ke titik bidik tengah layar (reticle +)
        this.executeGlacialBarrage();
      } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        if (this.astralEagleAimState.isCharging && !this.astralEagleAimState.cancelled) {
          this.releaseAimAstralEagle(false);
        }
      }
    }
    if (key === 'f' || code === 'keyf') {
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        if (this.arrowVolleyAimTimer) {
          clearTimeout(this.arrowVolleyAimTimer);
          this.arrowVolleyAimTimer = null;
        }
        this.isHoldingArrowVolleyKey = false;
        if (!this.arrowVolleyAimState.isCharging || this.arrowVolleyAimState.cancelled) {
          return;
        }
        const holdDuration = performance.now() - this.arrowVolleyAimState.pressStartTime;
        this.arrowVolleyAimState.isCharging = false;
        if (holdDuration < 220) {
          this.isAimingArrowVolley = false;
          if (this.arrowVolleyIndicatorGroup) {
            this.arrowVolleyIndicatorGroup.visible = false;
          }
          this.callbacks.onArrowVolleyAimChange?.(false);
          this.quickCastArrowVolley();
        } else {
          this.releaseAimArrowVolley(false);
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
      if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
        e.preventDefault();
        this.glacialAimState.isCharging = false;
        this.glacialAimState.cancelled = true;
        this.cancelGlacialAim();
        return;
      }
      if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
        e.preventDefault();
        this.cancelAstralEagleAim();
        return;
      }
      if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
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
      if (this.charClass === 'mage' && (this.isAimGlacialActive || this.glacialAimState.isCharging)) {
        this.glacialAimState.isCharging = false;
        this.executeGlacialBarrage();
        return;
      }
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' && (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging)) {
        this.releaseAimArrowVolley(false);
        return;
      }
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' && (this.isChargingAstralEagle || this.astralEagleAimState.isCharging)) {
        this.releaseAimAstralEagle(false);
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

    // Freely control aiming yaw & pitch while charging Bow Skills or Aiming Bow
    if (
      this.isAimGlacialActive ||
      this.glacialAimState.isCharging ||
      this.isAimingBow ||
      this.isChargingAstralEagle ||
      this.astralEagleAimState.isCharging ||
      this.isAimingArrowVolley ||
      this.arrowVolleyAimState.isCharging
    ) {
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
    if (this.charClass === 'mage' && (this.isAimGlacialActive || this.glacialAimState.isCharging) && e.button === 0) {
      this.glacialAimState.isCharging = false;
      this.executeGlacialBarrage();
      this.isMouseDown = false;
      this.isDraggingCamera = false;
      return;
    }
    if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' && (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) && e.button === 0) {
      this.releaseAimArrowVolley(false);
      this.isMouseDown = false;
      this.isDraggingCamera = false;
      return;
    }
    if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' && (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) && e.button === 0) {
      this.releaseAimAstralEagle(false);
      this.isMouseDown = false;
      this.isDraggingCamera = false;
      return;
    }
    if (e.button === 0 && ((this.isMouseDown && !this.isDraggingCamera) || this.isHoldingBowAttack || this.isAimingBow)) {
      this.releaseBasicAttack();
    } else if (this.isChargingAttack) {
      this.isChargingAttack = false;
      this.chargeTimer = 0;
      if (this.playerMesh) resetKnightBladeGlow(this.playerMesh);
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
  public getActiveGroundHeight(x: number, currentY: number, z: number): number {
    const activeRoom = this.world?.interiorManager?.activeRoom ?? null;
    if (activeRoom) {
      // Strictly raycast only the active room's walkable interior meshes (never mix outdoor terrain/bridges!)
      return activeRoom.getFloorHeight(x, currentY, z);
    }
    return getSolidGroundHeight(x, z, currentY);
  }

  public triggerActiveInteriorPortal(): boolean {
    if (this.isTransitioningInterior || this.interiorTransitionCooldown > 0 || !this.world?.interiorManager) {
      return false;
    }
    const match = this.world.interiorManager.findClosestPortal(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    if (!match) return false;
    this.executePortalTransition(match.portal);
    return true;
  }

  public exitCurrentInterior(): boolean {
    const interiorMgr = this.world?.interiorManager;
    const activeRoom = interiorMgr?.activeRoom ?? null;
    if (!interiorMgr || !activeRoom || this.isTransitioningInterior) {
      return false;
    }
    const exitPortal = interiorMgr.portals.find(
      (p) => p.roomId === activeRoom.id && p.kind === 'exit' && p.targetRoomId === null
    );
    if (exitPortal) {
      this.executePortalTransition(exitPortal);
      return true;
    }
    if (this.activeExteriorReturnPos) {
      const extX = this.activeExteriorReturnPos.x;
      const extZ = this.activeExteriorReturnPos.z;
      const extY = getSolidGroundHeight(extX, extZ) + 0.25;
      this.executePortalTransition({
        id: `${activeRoom.id}_hud_exit`,
        roomId: activeRoom.id,
        kind: 'exit',
        label: `Keluar ke ${activeRoom.exteriorName}`,
        promptText: `Keluar ke ${activeRoom.exteriorName}`,
        toastText: `Kembali ke ${activeRoom.exteriorName}`,
        targetRoomId: null,
        markerPos: { x: 0, y: 0, z: 0 },
        spawnPos: { x: extX, y: extY, z: extZ, rotationY: 0 },
        triggerRadius: 2.8,
        autoRadius: 1.4,
        colorHex: 0x38bdf8,
        markerMesh: new THREE.Group(),
        arrowGroup: new THREE.Group(),
        outerRing: new THREE.Mesh(),
        innerDisc: new THREE.Mesh(),
      });
      return true;
    }
    return false;
  }

  private restoreExteriorAtmosphereAndLights(): void {
    if (this.interiorAmbientLight) {
      this.interiorAmbientLight.intensity = 0;
    }
    if (this.savedExteriorFog) {
      this.scene.fog = this.savedExteriorFog;
      this.savedExteriorFog = null;
    }
    if (this.savedExteriorBg) {
      this.scene.background = this.savedExteriorBg;
      this.savedExteriorBg = null;
    }
    if (this.world?.hemiLight && this.world?.dirLight) {
      this.dayNightSystem.applyOutdoorLighting(this.scene, this.world.hemiLight, this.world.dirLight, this.playerPos);
    }
  }

  private executePortalTransition(portal: InteriorPortalDef): void {
    const interiorMgr = this.world?.interiorManager;
    if (!interiorMgr || this.isTransitioningInterior) return;

    this.isTransitioningInterior = true;
    this.interiorAutoDwellTimer = 0;
    this.activeInteriorPortal = null;
    this.callbacks.onInteriorPortalState?.(null);
    this.callbacks.onInteriorFadeChange?.(true);

    if (portal.kind === 'enter') {
      this.activeExteriorReturnPos = { x: portal.markerPos.x, z: portal.markerPos.z };
    } else if (portal.targetRoomId === null) {
      this.activeExteriorReturnPos = null;
    }

    const tSwap = setTimeout(() => {
      if (!this.world?.interiorManager) {
        this.isTransitioningInterior = false;
        this.callbacks.onInteriorFadeChange?.(false);
        return;
      }

      const wasExterior = this.world.interiorManager.activeRoom === null;
      const room = this.world.interiorManager.setActiveRoom(portal.targetRoomId);
      if (this.world.exteriorWorldGroup) {
        this.world.exteriorWorldGroup.visible = room === null;
      }

      // Toggle monster visibility & indoor dummy isolation cleanly
      this.enemies.forEach((e) => {
        if (e.isIndoorDummy) {
          e.mesh.visible = room !== null && room.id === e.interiorId;
        } else {
          e.mesh.visible = room === null && !e.data.isDead;
        }
      });

      // Switch between isolated root-scene interior lights & saved exterior day/night atmosphere
      if (room) {
        if (wasExterior && !this.savedExteriorFog) {
          this.savedExteriorFog = this.scene.fog;
          this.savedExteriorBg = this.scene.background
            ? (this.scene.background instanceof THREE.Color
                ? this.scene.background.clone()
                : this.scene.background)
            : null;
        }

        if (this.interiorAmbientLight) {
          this.interiorAmbientLight.color.setHex(room.ambientSkyHex);
          this.interiorAmbientLight.intensity = Math.max(0.85, room.ambientIntensity);
        }
        if (this.world.hemiLight) {
          this.world.hemiLight.color.setHex(room.ambientSkyHex);
          this.world.hemiLight.groundColor.setHex(room.ambientGroundHex);
          this.world.hemiLight.intensity = room.hemiIntensity;
        }
        if (this.world.dirLight) {
          this.world.dirLight.color.setHex(0xfffbeb);
          this.world.dirLight.intensity = room.dirIntensity;
          this.world.dirLight.position.set(18, 42, 22);
          if (this.world.dirLight.target) {
            this.world.dirLight.target.position.set(0, 0, 0);
            if (!this.world.dirLight.target.parent) {
              this.scene.add(this.world.dirLight.target);
            }
            this.world.dirLight.target.updateMatrixWorld();
          }
        }
        this.scene.background = new THREE.Color(room.bgHex);
        this.scene.fog = new THREE.Fog(room.fogHex, 65, 180);

        // Clear any outdoor boss encounter banner while inside a building
        this.callbacks.onBossEncounter(false, undefined, undefined, undefined, undefined, false);
        if (soundManager.getCurrentBossMusic()) {
          soundManager.evadeBossMusic(1.5);
        }
      } else {
        this.restoreExteriorAtmosphereAndLights();
      }

      // Apply exact teleportation destination, facing, & 1.2s anti-bounce cooldown
      this.teleportGraceTimer = 0.45;
      this.interiorTransitionCooldown = 1.2;
      this.interiorRearmLocked = true;
      this.playerVel.set(0, 0, 0);
      this.isGrounded = true;
      this.playerPos.set(portal.spawnPos.x, portal.spawnPos.y, portal.spawnPos.z);
      if (portal.spawnPos.rotationY !== undefined) {
        this.playerRotationY = portal.spawnPos.rotationY;
        this.cameraAngleH = portal.spawnPos.rotationY + Math.PI;
      }
      this.cameraAngleV = 0.24;
      if (this.playerMesh?.group) {
        this.playerMesh.group.position.copy(this.playerPos);
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }

      // Instant camera snap capped & wall/ceiling clamped inside the interior
      const snapDist = room ? Math.min(this.cameraDistance, 9.5) : this.cameraDistance;
      const snapCamPos = new THREE.Vector3(
        this.playerPos.x + Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * snapDist,
        this.playerPos.y + Math.sin(this.cameraAngleV) * snapDist + 1.2,
        this.playerPos.z + Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * snapDist
      );
      if (room) {
        room.clampCameraPosition(snapCamPos, this.playerPos.y);
      }
      this.camera.position.copy(snapCamPos);
      this.cameraCurrentLookAt.set(this.playerPos.x, this.playerPos.y + 1.4, this.playerPos.z);
      this.camera.lookAt(this.cameraCurrentLookAt);

      if (room) {
        const floorLabel = room.getFloorLabel(this.playerPos.y);
        const rx = Math.round(this.playerPos.x);
        const rz = Math.round(this.playerPos.z);
        this.lastInteriorRoomSig = `${room.id}:${floorLabel}:${rx}:${rz}`;
        this.callbacks.onInteriorRoomChange?.({
          id: room.id,
          roomName: room.name,
          floorLabel,
          localX: rx,
          localZ: rz,
          canExit: true,
        });
      } else {
        this.lastInteriorRoomSig = '';
        this.callbacks.onInteriorRoomChange?.(null);
      }

      soundManager.playCheckpointUnlock();
      this.callbacks.onAddFloatingText(portal.toastText, room ? '#fbbf24' : '#38bdf8', 'info');

      const tReveal = setTimeout(() => {
        this.isTransitioningInterior = false;
        this.callbacks.onInteriorFadeChange?.(false);
      }, 175);
      this.interiorFadeTimers.push(tReveal);
    }, 175);

    this.interiorFadeTimers.push(tSwap);
  }

  public enterMageTower() {
    const enterPortal = this.world?.interiorManager?.portals.find((p) => p.id === 'mage_tower_interior_enter');
    if (enterPortal) {
      this.executePortalTransition(enterPortal);
      return;
    }
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
  private activeCanvasTouchIds: Set<number> = new Set();
  private initialPinchDist = 0;
  private initialPinchCamDist = 7;

  private getCanvasCameraTouches(touches: TouchList): Touch[] {
    const valid: Touch[] = [];
    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      if (this.activeCanvasTouchIds.has(t.identifier)) {
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

    const h = window.innerHeight;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const inJoystickZone = touch.clientX < 155 && touch.clientY > h - 155;
      const isCanvasTarget =
        touch.target === this.renderer.domElement ||
        (touch.target instanceof HTMLElement && touch.target.id === 'webgl-canvas-container');
      if (!inJoystickZone && isCanvasTarget) {
        this.activeCanvasTouchIds.add(touch.identifier);
      }
    }

    const camTouches = this.getCanvasCameraTouches(e.touches);
    if (camTouches.length > 0 && e.cancelable) {
      e.preventDefault();
    }

    // If 2 touches started cleanly on open 3D canvas area, handle pinch zoom
    if (camTouches.length === 2) {
      const t1 = camTouches[0];
      const t2 = camTouches[1];
      this.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      this.initialPinchCamDist = this.cameraDistance;
      return;
    }

    // Capture primary canvas touch for smooth camera rotation alongside joystick + skill aiming
    if (this.cameraTouchId === null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.activeCanvasTouchIds.has(touch.identifier)) {
          this.cameraTouchId = touch.identifier;
          this.isTouchingCamera = true;
          this.touchStartX = touch.clientX;
          this.touchStartY = touch.clientY;
          break;
        }
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

    for (let i = 0; i < e.changedTouches.length; i++) {
      const id = e.changedTouches[i].identifier;
      this.activeCanvasTouchIds.delete(id);
      if (this.cameraTouchId !== null && id === this.cameraTouchId) {
        this.cameraTouchId = null;
        this.isTouchingCamera = false;
      }
    }
    const camTouches = this.getCanvasCameraTouches(e.touches);
    if (camTouches.length < 2) {
      this.initialPinchDist = 0;
    }
    if (this.cameraTouchId === null && camTouches.length === 1) {
      this.cameraTouchId = camTouches[0].identifier;
      this.isTouchingCamera = true;
      this.touchStartX = camTouches[0].clientX;
      this.touchStartY = camTouches[0].clientY;
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

  private computeMobileWorldAim(maxRange: number, defaultDist: number) {
    const camAngle = this.cameraAngleH;
    const fwdX = -Math.sin(camAngle);
    const fwdZ = -Math.cos(camAngle);
    const rightX = -fwdZ;
    const rightZ = fwdX;
    const nx = this.mobileAimNormalized.x;
    const ny = this.mobileAimNormalized.y;
    const mag = Math.min(1, Math.hypot(nx, ny));
    let dirX = fwdX;
    let dirZ = fwdZ;
    if (mag > 0.08) {
      const rx = fwdX * (-ny) + rightX * nx;
      const rz = fwdZ * (-ny) + rightZ * nx;
      const len = Math.hypot(rx, rz) || 1;
      dirX = rx / len;
      dirZ = rz / len;
    }
    const dist = mag > 0.08 ? THREE.MathUtils.lerp(4.0, maxRange, mag) : defaultDist;
    const targetX = this.playerPos.x + dirX * dist;
    const targetZ = this.playerPos.z + dirZ * dist;
    const targetY = getSolidGroundHeight(targetX, targetZ, this.playerPos.y);
    this.mobileAimWorldDir.set(dirX, 0, dirZ);
    return { dirX, dirZ, mag, targetX, targetY, targetZ };
  }

  private ensureMobileStarfallIndicator() {
    if (this.mobileStarfallAimGroup) return;
    const group = new THREE.Group();
    group.name = 'MobileStarfallAimIndicator';
    group.visible = false;
    group.frustumCulled = false;

    const outerGeom = new THREE.RingGeometry(14.0, 14.5, 56);
    outerGeom.rotateX(-Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outer = new THREE.Mesh(outerGeom, outerMat);
    outer.frustumCulled = false;
    group.add(outer);

    const innerGeom = new THREE.RingGeometry(1.8, 2.3, 36);
    innerGeom.rotateX(-Math.PI / 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.frustumCulled = false;
    group.add(inner);

    this.scene.add(group);
    this.mobileStarfallAimGroup = group;
    this.mobileStarfallOuterRing = outer;
    this.mobileStarfallInnerRing = inner;
  }

  private ensureMobileDashIndicator() {
    if (this.mobileDashAimGroup) return;
    const group = new THREE.Group();
    group.name = 'MobileDashAimIndicator';
    group.visible = false;
    group.frustumCulled = false;

    const ringGeom = new THREE.RingGeometry(0.85, 1.15, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.frustumCulled = false;
    group.add(ring);

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(lineGeom, lineMat);
    line.frustumCulled = false;
    group.add(line);

    this.scene.add(group);
    this.mobileDashAimGroup = group;
    this.mobileDashRingMesh = ring;
    this.mobileDashLineMesh = line;
  }

  private ensureMobileBowIndicator() {
    if (this.mobileBowAimGroup) return;
    const group = new THREE.Group();
    group.name = 'MobileBowAimIndicator';
    group.visible = false;
    group.frustumCulled = false;

    const ringGeom = new THREE.RingGeometry(0.75, 1.05, 28);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.frustumCulled = false;
    group.add(ring);

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(lineGeom, lineMat);
    line.frustumCulled = false;
    group.add(line);

    this.scene.add(group);
    this.mobileBowAimGroup = group;
    this.mobileBowAimRingMesh = ring;
    this.mobileBowAimLineMesh = line;
  }

  private updateMobileBowAimFrame(maxRange: number, accentHex: number) {
    this.ensureMobileBowIndicator();
    if (!this.mobileBowAimGroup) return;
    const aim = this.computeMobileWorldAim(maxRange, 18.0);
    this.playerRotationY = Math.atan2(aim.dirX, aim.dirZ);
    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }
    const endX = this.playerPos.x + aim.dirX * maxRange;
    const endZ = this.playerPos.z + aim.dirZ * maxRange;
    const endY = getSolidGroundHeight(endX, endZ, this.playerPos.y);
    this.mobileBowAimGroup.visible = true;
    if (this.mobileBowAimRingMesh) {
      this.mobileBowAimRingMesh.position.set(aim.targetX, aim.targetY + 0.12, aim.targetZ);
      const m = this.mobileBowAimRingMesh.material as THREE.MeshBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xef4444 : accentHex);
      m.opacity = this.mobileAimOverCancel ? 0.5 : 0.88;
    }
    if (this.mobileBowAimLineMesh) {
      const attr = this.mobileBowAimLineMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(0, this.playerPos.x, this.playerPos.y + 1.35, this.playerPos.z);
      attr.setXYZ(1, endX, endY + 0.65, endZ);
      attr.needsUpdate = true;
      const m = this.mobileBowAimLineMesh.material as THREE.LineBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xef4444 : accentHex);
    }
  }

  private hideMobileAimPreviews() {
    if (this.mobileStarfallAimGroup) this.mobileStarfallAimGroup.visible = false;
    if (this.mobileDashAimGroup) this.mobileDashAimGroup.visible = false;
    if (this.mobileBowAimGroup) this.mobileBowAimGroup.visible = false;
  }

  private updateMobileStarfallAimFrame() {
    this.ensureMobileStarfallIndicator();
    if (!this.mobileStarfallAimGroup) return;
    const aim = this.computeMobileWorldAim(24.0, 18.0);
    this.playerRotationY = Math.atan2(aim.dirX, aim.dirZ);
    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }
    this.mobileStarfallTargetPoint.set(aim.targetX, aim.targetY + 0.08, aim.targetZ);
    this.mobileStarfallAimGroup.visible = true;
    this.mobileStarfallAimGroup.position.copy(this.mobileStarfallTargetPoint);
    if (this.mobileStarfallOuterRing) {
      const m = this.mobileStarfallOuterRing.material as THREE.MeshBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xef4444 : 0xa855f7);
      m.opacity = this.mobileAimOverCancel ? 0.45 : 0.78;
    }
    if (this.mobileStarfallInnerRing) {
      const m = this.mobileStarfallInnerRing.material as THREE.MeshBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xf87171 : 0xfde047);
      m.opacity = this.mobileAimOverCancel ? 0.45 : 0.85;
    }
  }

  private updateMobileDashAimFrame(maxRange: number) {
    this.ensureMobileDashIndicator();
    if (!this.mobileDashAimGroup) return;
    const aim = this.computeMobileWorldAim(maxRange, maxRange);
    const targetY = getSolidGroundHeight(
      this.playerPos.x + aim.dirX * maxRange,
      this.playerPos.z + aim.dirZ * maxRange,
      this.playerPos.y
    );
    const endX = this.playerPos.x + aim.dirX * maxRange;
    const endZ = this.playerPos.z + aim.dirZ * maxRange;
    if (this.mobileAimNormalized.active) {
      this.playerRotationY = Math.atan2(aim.dirX, aim.dirZ);
      if (this.playerMesh?.group) {
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }
    }
    this.mobileDashTargetPoint.set(endX, targetY + 0.08, endZ);
    this.mobileDashAimGroup.visible = true;
    if (this.mobileDashRingMesh) {
      this.mobileDashRingMesh.position.copy(this.mobileDashTargetPoint);
      const m = this.mobileDashRingMesh.material as THREE.MeshBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xef4444 : 0x38bdf8);
      m.opacity = this.mobileAimOverCancel ? 0.45 : 0.85;
    }
    if (this.mobileDashLineMesh) {
      const attr = this.mobileDashLineMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(0, this.playerPos.x, this.playerPos.y + 0.25, this.playerPos.z);
      attr.setXYZ(1, endX, targetY + 0.15, endZ);
      attr.needsUpdate = true;
      const m = this.mobileDashLineMesh.material as THREE.LineBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xef4444 : 0x67e8f9);
    }
  }

  public startMobileSkillAim(slot: 'basic' | 'skill1' | 'dash' | 'ult') {
    if (this.isControlsLocked) return;
    this.mobileAimActiveSlot = slot;
    this.mobileAimNormalized = { x: 0, y: 0, active: false };
    this.mobileAimOverCancel = false;

    if (slot === 'basic') {
      this.startBasicAttack();
    } else if (slot === 'skill1') {
      if (this.charClass === 'mage') {
        this.startAimGlacialBarrage();
      } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        this.startAimAstralEagle();
      } else if (this.charClass === 'warrior') {
        this.updateMobileDashAimFrame(11.0);
      }
    } else if (slot === 'dash') {
      const dashDist = this.charClass === 'mage' ? 12.0 : this.charClass === 'rogue' ? 9.5 : 4.5;
      this.updateMobileDashAimFrame(dashDist);
    } else if (slot === 'ult') {
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        this.startAimArrowVolley();
      } else if (this.charClass === 'mage') {
        this.updateMobileStarfallAimFrame();
      } else if (this.charClass === 'warrior') {
        this.updateMobileDashAimFrame(22.0);
      }
    }
  }

  public updateMobileSkillAim(
    slot: 'basic' | 'skill1' | 'dash' | 'ult',
    nx: number,
    ny: number,
    isOverCancel: boolean
  ) {
    if (this.mobileAimActiveSlot !== slot) return;
    this.mobileAimOverCancel = isOverCancel;
    const mag = Math.hypot(nx, ny);
    this.mobileAimNormalized = { x: nx, y: ny, active: mag > 0.12 };

    if (slot === 'basic') {
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' && this.mobileAimNormalized.active) {
        this.updateMobileBowAimFrame(32.0, 0xfbbf24);
      } else if (this.mobileBowAimGroup) {
        this.mobileBowAimGroup.visible = false;
      }
    } else if (slot === 'skill1') {
      if (this.charClass === 'mage') {
        this.updateGlacialAimFrame(0);
      } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        if (this.mobileAimNormalized.active) {
          this.updateMobileBowAimFrame(36.0, 0x38bdf8);
        } else if (this.mobileBowAimGroup) {
          this.mobileBowAimGroup.visible = false;
        }
      } else if (this.charClass === 'warrior') {
        this.updateMobileDashAimFrame(11.0);
      }
    } else if (slot === 'dash') {
      const dashDist = this.charClass === 'mage' ? 12.0 : this.charClass === 'rogue' ? 9.5 : 4.5;
      this.updateMobileDashAimFrame(dashDist);
    } else if (slot === 'ult') {
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        this.updateAimArrowVolleyFrame(0);
      } else if (this.charClass === 'mage') {
        this.updateMobileStarfallAimFrame();
      } else if (this.charClass === 'warrior') {
        this.updateMobileDashAimFrame(22.0);
      }
    }
  }

  public releaseMobileSkillAim(
    slot: 'basic' | 'skill1' | 'dash' | 'ult',
    isCancelled: boolean,
    isQuickTap: boolean
  ) {
    this.hideMobileAimPreviews();
    this.mobileAimOverCancel = false;

    if (isCancelled) {
      if (slot === 'basic') {
        this.cancelBowAim();
        this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
      } else if (slot === 'skill1') {
        if (this.charClass === 'mage') {
          this.cancelAimGlacialBarrage();
        } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
          this.cancelAstralEagleAim(true);
        } else {
          this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
        }
      } else if (slot === 'ult') {
        if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
          this.cancelArrowVolleyAim(true);
        } else {
          this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
        }
      } else if (slot === 'dash') {
        this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
      }
      this.mobileAimActiveSlot = null;
      this.mobileAimNormalized = { x: 0, y: 0, active: false };
      return;
    }

    if (isQuickTap) {
      this.mobileAimNormalized = { x: 0, y: 0, active: false };
    }

    if (slot === 'basic') {
      this.releaseBasicAttack();
    } else if (slot === 'skill1') {
      if (this.charClass === 'mage') {
        this.releaseAimGlacialBarrage(false);
      } else if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        if (isQuickTap) {
          this.astralEagleAimState.isCharging = false;
          this.isChargingAstralEagle = false;
          this.callbacks.onBowAimChange?.(false, 0);
          this.quickCastAstralEagle();
        } else {
          this.releaseAimAstralEagle(false);
        }
      } else {
        if (!isQuickTap && this.mobileAimNormalized.active) {
          const aim = this.computeMobileWorldAim(11.0, 11.0);
          this.playerRotationY = Math.atan2(aim.dirX, aim.dirZ);
          if (this.playerMesh?.group) this.playerMesh.group.rotation.y = this.playerRotationY;
        }
        this.castSkill(1);
      }
    } else if (slot === 'dash') {
      this.performDash();
    } else if (slot === 'ult') {
      if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        if (isQuickTap) {
          this.isAimingArrowVolley = false;
          this.arrowVolleyAimState.isCharging = false;
          if (this.arrowVolleyIndicatorGroup) this.arrowVolleyIndicatorGroup.visible = false;
          this.callbacks.onArrowVolleyAimChange?.(false);
          this.quickCastArrowVolley();
        } else {
          this.releaseAimArrowVolley(false);
        }
      } else if (this.charClass === 'mage') {
        const starTarget =
          !isQuickTap && this.mobileAimNormalized.active
            ? this.mobileStarfallTargetPoint.clone()
            : undefined;
        this.startStarfallCasting(starTarget);
      } else if (this.charClass === 'warrior') {
        if (!isQuickTap && this.mobileAimNormalized.active) {
          const aim = this.computeMobileWorldAim(22.0, 22.0);
          this.playerRotationY = Math.atan2(aim.dirX, aim.dirZ);
          if (this.playerMesh?.group) this.playerMesh.group.rotation.y = this.playerRotationY;
        }
        this.castSkill(2);
      } else {
        this.castSkill(4);
      }
    }

    this.mobileAimActiveSlot = null;
    this.mobileAimNormalized = { x: 0, y: 0, active: false };
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
  // POOLED BOSS PROJECTILES, CALDERA STORM WEATHER, LIGHTNING, & IGNIS AURA
  // ============================================================================
  private initBossProjectilePools() {
    if (this.titanBoulderPool.length === 0) {
      const rockGeo = new THREE.DodecahedronGeometry(1.42, 1);
      const coreGeo = new THREE.IcosahedronGeometry(1.08, 1);
      const haloGeo = new THREE.SphereGeometry(2.05, 10, 10);

      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x292524,
        emissive: 0x2c0e06,
        emissiveIntensity: 0.45,
        roughness: 0.9,
        metalness: 0.1,
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff6d00,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.85,
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xff5722,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.35,
      });

      this.titanBoulderPoolGeos.push(rockGeo, coreGeo, haloGeo);
      this.titanBoulderPoolMats.push(rockMat, coreMat, haloMat);

      for (let i = 0; i < 6; i++) {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(rockGeo, rockMat));
        group.add(new THREE.Mesh(coreGeo, coreMat));
        group.add(new THREE.Mesh(haloGeo, haloMat));
        group.visible = false;
        group.frustumCulled = false;
        group.traverse((c) => { c.frustumCulled = false; });
        this.scene.add(group);
        this.titanBoulderPool.push({ active: false, group });
      }
    }

    if (this.ignisFireballPool.length === 0) {
      const fbGeo = new THREE.SphereGeometry(0.85, 10, 10);
      const coronaGeo = new THREE.IcosahedronGeometry(1.18, 1);
      const haloGeo = new THREE.SphereGeometry(1.65, 10, 10);

      const fbMat = new THREE.MeshStandardMaterial({
        color: 0xff3d00,
        emissive: 0xff1744,
        emissiveIntensity: 2.2,
        roughness: 0.2,
      });
      const coronaMat = new THREE.MeshBasicMaterial({
        color: 0xffeb3b,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xff6d00,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      this.ignisFireballPoolGeos.push(fbGeo, coronaGeo, haloGeo);
      this.ignisFireballPoolMats.push(fbMat, coronaMat, haloMat);

      for (let i = 0; i < 12; i++) {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(fbGeo, fbMat));
        group.add(new THREE.Mesh(coronaGeo, coronaMat));
        group.add(new THREE.Mesh(haloGeo, haloMat));
        group.visible = false;
        group.frustumCulled = false;
        group.traverse((c) => { c.frustumCulled = false; });
        this.scene.add(group);
        this.ignisFireballPool.push({ active: false, group });
      }
    }
  }

  private initBiomeWeatherPool() {
    if (this.biomeWeatherPoints) return;

    // Generate soft circular radial sprite texture once so flakes are soft circles, never sharp squares
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.78)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    this.biomeWeatherTex = tex;

    for (let i = 0; i < this.BIOME_WEATHER_COUNT; i++) {
      const i3 = i * 3;
      this.biomeWeatherPositions[i3] = (Math.random() - 0.5) * 56;
      this.biomeWeatherPositions[i3 + 1] = 1 + Math.random() * 22;
      this.biomeWeatherPositions[i3 + 2] = (Math.random() - 0.5) * 56;
      this.biomeWeatherVelocities[i3] = (Math.random() - 0.5) * 1.5;
      this.biomeWeatherVelocities[i3 + 1] = -(3.4 + Math.random() * 1.8);
      this.biomeWeatherVelocities[i3 + 2] = (Math.random() - 0.5) * 1.2;
      this.biomeWeatherPhases[i] = Math.random() * Math.PI * 2;
      this.biomeWeatherColors[i3] = 0.95;
      this.biomeWeatherColors[i3 + 1] = 0.98;
      this.biomeWeatherColors[i3 + 2] = 1.0;
    }

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this.biomeWeatherPositions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(this.biomeWeatherColors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('color', colAttr);

    const mat = new THREE.PointsMaterial({
      size: 0.42,
      map: tex,
      alphaTest: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    points.frustumCulled = false;
    this.scene.add(points);
    this.biomeWeatherPoints = points;
    this.biomeWeatherMat = mat;
  }

  private updateBiomeWeather(delta: number, elapsed: number) {
    if (!this.biomeWeatherPoints || !this.biomeWeatherMat || !this.world) return;

    const particlesEnabled =
      this.graphicsSettings.enableParticles !== false &&
      !(isMobileRenderDevice() && this.graphicsSettings.preset === 'low');

    if (!particlesEnabled || this.menuMode !== 'gameplay' || (this.world?.interiorManager?.activeRoom ?? null) !== null) {
      this.biomeWeatherOpacity = Math.max(0, this.biomeWeatherOpacity - delta * 3.0);
      this.biomeWeatherMat.opacity = this.biomeWeatherOpacity;
      this.biomeWeatherPoints.visible = this.biomeWeatherOpacity > 0.02;
      return;
    }

    const px = this.playerPos.x;
    const pz = this.playerPos.z;
    const py = this.playerPos.y;
    const biome = getBiomeAt(px, pz);
    const isNightOrDusk = this.dayNightSystem.isVillageLanternTime();

    let targetMode: 'none' | 'snow' | 'desert' | 'fireflies' = 'none';
    let targetOpacity = 0;
    let targetCount = 0;

    if (biome === 'snow') {
      targetMode = 'snow';
      targetOpacity = 0.85;
      targetCount = this.BIOME_WEATHER_COUNT;
    } else if (biome === 'desert') {
      targetMode = 'desert';
      targetOpacity = 0.36;
      targetCount = 110;
    } else if ((biome === 'grassland' || biome === 'lake') && isNightOrDusk) {
      targetMode = 'fireflies';
      targetOpacity = 0.42;
      targetCount = 60;
    }

    // Reseed colors and initial heights immediately when changing weather mode
    if (targetMode !== 'none' && targetMode !== this.lastBiomeWeatherMode) {
      this.lastBiomeWeatherMode = targetMode;
      this.biomeWeatherActiveCount = targetCount;
      this.biomeWeatherPoints.geometry.setDrawRange(0, targetCount);

      for (let i = 0; i < this.BIOME_WEATHER_COUNT; i++) {
        const i3 = i * 3;
        this.biomeWeatherPositions[i3] = px + (Math.random() - 0.5) * 54;
        this.biomeWeatherPositions[i3 + 2] = pz + (Math.random() - 0.5) * 54;

        if (targetMode === 'snow') {
          this.biomeWeatherPositions[i3 + 1] = py + Math.random() * 20;
          this.biomeWeatherVelocities[i3] = 2.6 + (Math.random() - 0.3) * 2.2;
          this.biomeWeatherVelocities[i3 + 1] = -(3.4 + Math.random() * 1.8);
          this.biomeWeatherVelocities[i3 + 2] = 0.8 + (Math.random() - 0.5) * 1.4;
          this.biomeWeatherColors[i3] = 0.95;
          this.biomeWeatherColors[i3 + 1] = 0.98;
          this.biomeWeatherColors[i3 + 2] = 1.0;
        } else if (targetMode === 'desert') {
          this.biomeWeatherPositions[i3 + 1] = py + 0.5 + Math.random() * 7.5;
          this.biomeWeatherVelocities[i3] = 5.2 + Math.random() * 2.4;
          this.biomeWeatherVelocities[i3 + 1] = -(0.2 + Math.random() * 0.4);
          this.biomeWeatherVelocities[i3 + 2] = 1.4 + (Math.random() - 0.5) * 1.5;
          this.biomeWeatherColors[i3] = 0.95;
          this.biomeWeatherColors[i3 + 1] = 0.74;
          this.biomeWeatherColors[i3 + 2] = 0.38;
        } else {
          this.biomeWeatherPositions[i3 + 1] = py + 0.8 + Math.random() * 5.0;
          this.biomeWeatherVelocities[i3] = (Math.random() - 0.5) * 0.9;
          this.biomeWeatherVelocities[i3 + 1] = (Math.random() - 0.5) * 0.35;
          this.biomeWeatherVelocities[i3 + 2] = (Math.random() - 0.5) * 0.9;
          this.biomeWeatherColors[i3] = 1.0;
          this.biomeWeatherColors[i3 + 1] = 0.91;
          this.biomeWeatherColors[i3 + 2] = 0.52;
        }
      }
      this.biomeWeatherMat.size = targetMode === 'snow' ? 0.42 : targetMode === 'desert' ? 0.28 : 0.32;
      (this.biomeWeatherPoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (this.biomeWeatherPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    const fadeRate = targetOpacity > this.biomeWeatherOpacity ? 1.8 : 2.8;
    this.biomeWeatherOpacity += (targetOpacity - this.biomeWeatherOpacity) * Math.min(1, delta * fadeRate);
    this.biomeWeatherMat.opacity = this.biomeWeatherOpacity;

    if (this.biomeWeatherOpacity <= 0.015) {
      this.biomeWeatherPoints.visible = false;
      if (targetMode === 'none') {
        this.lastBiomeWeatherMode = 'none';
      }
      return;
    }

    this.biomeWeatherPoints.visible = true;
    const count = this.biomeWeatherActiveCount || targetCount || this.BIOME_WEATHER_COUNT;
    const halfSpan = 28;
    const activeMode = targetMode !== 'none' ? targetMode : this.lastBiomeWeatherMode;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = this.biomeWeatherPhases[i];

      if (activeMode === 'snow') {
        this.biomeWeatherPositions[i3] += (this.biomeWeatherVelocities[i3] + Math.sin(elapsed * 1.3 + phase) * 0.85) * delta;
        this.biomeWeatherPositions[i3 + 1] += this.biomeWeatherVelocities[i3 + 1] * delta;
        this.biomeWeatherPositions[i3 + 2] += (this.biomeWeatherVelocities[i3 + 2] + Math.cos(elapsed * 1.1 + phase) * 0.65) * delta;
        if (this.biomeWeatherPositions[i3 + 1] < py - 1.5) {
          this.biomeWeatherPositions[i3 + 1] = py + 17 + Math.random() * 5;
        }
      } else if (activeMode === 'desert') {
        this.biomeWeatherPositions[i3] += this.biomeWeatherVelocities[i3] * delta;
        this.biomeWeatherPositions[i3 + 1] += (this.biomeWeatherVelocities[i3 + 1] + Math.sin(elapsed * 2.0 + phase) * 0.25) * delta;
        this.biomeWeatherPositions[i3 + 2] += this.biomeWeatherVelocities[i3 + 2] * delta;
        if (this.biomeWeatherPositions[i3 + 1] < py + 0.2 || this.biomeWeatherPositions[i3 + 1] > py + 9.0) {
          this.biomeWeatherPositions[i3 + 1] = py + 0.8 + Math.random() * 6.5;
        }
      } else {
        this.biomeWeatherPositions[i3] += (this.biomeWeatherVelocities[i3] + Math.sin(elapsed * 0.9 + phase) * 0.35) * delta;
        this.biomeWeatherPositions[i3 + 1] += Math.sin(elapsed * 1.6 + phase) * 0.45 * delta;
        this.biomeWeatherPositions[i3 + 2] += (this.biomeWeatherVelocities[i3 + 2] + Math.cos(elapsed * 0.8 + phase) * 0.35) * delta;
      }

      // Wrap seamlessly horizontally around player position
      const dx = this.biomeWeatherPositions[i3] - px;
      if (dx > halfSpan) this.biomeWeatherPositions[i3] -= halfSpan * 2;
      else if (dx < -halfSpan) this.biomeWeatherPositions[i3] += halfSpan * 2;

      const dz = this.biomeWeatherPositions[i3 + 2] - pz;
      if (dz > halfSpan) this.biomeWeatherPositions[i3 + 2] -= halfSpan * 2;
      else if (dz < -halfSpan) this.biomeWeatherPositions[i3 + 2] += halfSpan * 2;
    }

    (this.biomeWeatherPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private initCalderaStormPools() {
    if (this.calderaCloudGroup) return;
    const centerX = SPAWN_NAGA[0];
    const centerZ = SPAWN_NAGA[1];
    const baseGroundY = 2.5;

    // 1. Dark Low Overcast Storm Cloud Layer above Dragon Caldera
    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(centerX, baseGroundY + 38.0, centerZ);
    const cloudGeo = new THREE.DodecahedronGeometry(1.0, 1);
    cloudGeo.scale(1.0, 0.22, 0.75);
    this.calderaCloudGeo = cloudGeo;

    const ringConfigs = [
      { count: 6, rMin: 12, rMax: 24, yMin: -2, yMax: 2, scale: 22, color: 0x16121b },
      { count: 8, rMin: 30, rMax: 52, yMin: -3, yMax: 4, scale: 28, color: 0x22151a },
    ];
    for (const cfg of ringConfigs) {
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i / cfg.count) * Math.PI * 2 + (cfg.rMin * 0.13);
        const r = THREE.MathUtils.lerp(cfg.rMin, cfg.rMax, ((i * 37) % 10) / 10);
        const mat = new THREE.MeshBasicMaterial({
          color: cfg.color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        this.calderaCloudMats.push(mat);
        const cloud = new THREE.Mesh(cloudGeo, mat);
        cloud.position.set(
          Math.cos(angle) * r,
          THREE.MathUtils.lerp(cfg.yMin, cfg.yMax, ((i * 23) % 10) / 10),
          Math.sin(angle) * r
        );
        const s = cfg.scale + (i % 3) * 5;
        cloud.scale.set(s, s * 0.75, s);
        cloud.rotation.y = angle + 0.5;
        cloud.frustumCulled = false;
        cloudGroup.add(cloud);
      }
    }
    cloudGroup.visible = false;
    cloudGroup.frustumCulled = false;
    this.scene.add(cloudGroup);
    this.calderaCloudGroup = cloudGroup;

    // 2. Pooled Caldera Volcanic Storm Ash & Ember Rain (THREE.Points with fixed Float32Array)
    const stormGeo = new THREE.BufferGeometry();
    for (let i = 0; i < this.CALDERA_STORM_PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 54;
      this.calderaStormPositions[i3] = centerX + Math.cos(a) * r;
      this.calderaStormPositions[i3 + 1] = baseGroundY + 1 + Math.random() * 34;
      this.calderaStormPositions[i3 + 2] = centerZ + Math.sin(a) * r;

      this.calderaStormVelocities[i3] = (Math.random() - 0.5) * 4.5;
      this.calderaStormVelocities[i3 + 1] = -(2.2 + Math.random() * 3.8);
      this.calderaStormVelocities[i3 + 2] = (Math.random() - 0.5) * 4.5;

      const isEmber = i % 3 === 0;
      this.calderaStormColors[i3] = isEmber ? 1.0 : 0.35;
      this.calderaStormColors[i3 + 1] = isEmber ? 0.38 : 0.30;
      this.calderaStormColors[i3 + 2] = isEmber ? 0.08 : 0.34;
    }
    const stormPosAttr = new THREE.BufferAttribute(this.calderaStormPositions, 3);
    stormPosAttr.setUsage(THREE.DynamicDrawUsage);
    stormGeo.setAttribute('position', stormPosAttr);
    stormGeo.setAttribute('color', new THREE.BufferAttribute(this.calderaStormColors, 3));

    const stormMat = new THREE.PointsMaterial({
      size: 0.42,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const stormPoints = new THREE.Points(stormGeo, stormMat);
    stormPoints.visible = false;
    stormPoints.frustumCulled = false;
    this.scene.add(stormPoints);
    this.calderaStormPoints = stormPoints;
    this.calderaStormMat = stormMat;

    // 3. Pooled Ignis Phase 2 Volcanic Berserk Smoke & Magma Embers Aura (THREE.Points with fixed Float32Array)
    const auraGeo = new THREE.BufferGeometry();
    for (let i = 0; i < this.IGNIS_AURA_PARTICLE_COUNT; i++) {
      this.ignisAuraPositions[i * 3] = 0;
      this.ignisAuraPositions[i * 3 + 1] = -999;
      this.ignisAuraPositions[i * 3 + 2] = 0;
      this.ignisAuraLifes[i] = 0;
      this.ignisAuraMaxLifes[i] = 1.0;
    }
    const auraPosAttr = new THREE.BufferAttribute(this.ignisAuraPositions, 3);
    auraPosAttr.setUsage(THREE.DynamicDrawUsage);
    const auraColAttr = new THREE.BufferAttribute(this.ignisAuraColors, 3);
    auraColAttr.setUsage(THREE.DynamicDrawUsage);
    auraGeo.setAttribute('position', auraPosAttr);
    auraGeo.setAttribute('color', auraColAttr);

    const auraMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const auraPoints = new THREE.Points(auraGeo, auraMat);
    auraPoints.visible = false;
    auraPoints.frustumCulled = false;
    this.scene.add(auraPoints);
    this.ignisAuraPoints = auraPoints;
    this.ignisAuraMat = auraMat;

    // 4. Pre-allocated Pool of 3 Branched 3D Lightning Bolts (16 line segments each = 32 vertices * 3 floats)
    const SEGMENTS_PER_BOLT = 18;
    for (let i = 0; i < 3; i++) {
      const boltGroup = new THREE.Group();
      const outerPos = new Float32Array(SEGMENTS_PER_BOLT * 2 * 3);
      const corePos = new Float32Array(SEGMENTS_PER_BOLT * 2 * 3);

      const outerGeo = new THREE.BufferGeometry();
      const outerAttr = new THREE.BufferAttribute(outerPos, 3);
      outerAttr.setUsage(THREE.DynamicDrawUsage);
      outerGeo.setAttribute('position', outerAttr);

      const coreGeo = new THREE.BufferGeometry();
      const coreAttr = new THREE.BufferAttribute(corePos, 3);
      coreAttr.setUsage(THREE.DynamicDrawUsage);
      coreGeo.setAttribute('position', coreAttr);

      const outerMat = new THREE.LineBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const coreMat = new THREE.LineBasicMaterial({
        color: 0xfed7aa,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const outerLines = new THREE.LineSegments(outerGeo, outerMat);
      const coreLines = new THREE.LineSegments(coreGeo, coreMat);
      outerLines.frustumCulled = false;
      coreLines.frustumCulled = false;

      boltGroup.add(outerLines, coreLines);
      boltGroup.visible = false;
      boltGroup.frustumCulled = false;
      this.scene.add(boltGroup);

      this.calderaLightningPool.push({
        active: false,
        timer: 0,
        duration: 0.24,
        group: boltGroup,
        outerLines,
        outerPos,
        outerMat,
        coreLines,
        corePos,
        coreMat,
      });
    }
  }

  private spawnCalderaLightningBolt(bolt: (typeof this.calderaLightningPool)[0], x: number, z: number) {
    const groundY = this.world ? this.world.getTerrainHeight(x, z) : 2.5;
    const topY = groundY + 40.0;
    const mainSteps = 10;

    let curX = x + (Math.random() - 0.5) * 4.0;
    let curY = topY;
    let curZ = z + (Math.random() - 0.5) * 4.0;

    let segIdx = 0;
    const writeSegment = (
      ax: number, ay: number, az: number,
      bx: number, by: number, bz: number,
      jitter: number
    ) => {
      if (segIdx >= 18) return;
      const idx = segIdx * 6;
      bolt.outerPos[idx] = ax;
      bolt.outerPos[idx + 1] = ay;
      bolt.outerPos[idx + 2] = az;
      bolt.outerPos[idx + 3] = bx;
      bolt.outerPos[idx + 4] = by;
      bolt.outerPos[idx + 5] = bz;

      bolt.corePos[idx] = ax + jitter;
      bolt.corePos[idx + 1] = ay;
      bolt.corePos[idx + 2] = az - jitter;
      bolt.corePos[idx + 3] = bx + jitter;
      bolt.corePos[idx + 4] = by;
      bolt.corePos[idx + 5] = bz - jitter;
      segIdx++;
    };

    const branchSeeds: Array<{ x: number; y: number; z: number }> = [];
    for (let s = 1; s <= mainSteps; s++) {
      const t = s / mainSteps;
      const nextX = s === mainSteps ? x : THREE.MathUtils.lerp(curX, x, 0.35) + (Math.random() - 0.5) * 4.2;
      const nextY = THREE.MathUtils.lerp(topY, groundY, t);
      const nextZ = s === mainSteps ? z : THREE.MathUtils.lerp(curZ, z, 0.35) + (Math.random() - 0.5) * 4.2;
      writeSegment(curX, curY, curZ, nextX, nextY, nextZ, 0.14);

      if (s === 3 || s === 6 || s === 8) {
        branchSeeds.push({ x: nextX, y: nextY, z: nextZ });
      }
      curX = nextX;
      curY = nextY;
      curZ = nextZ;
    }

    // Add 3 jagged side branches across remaining segments
    for (let b = 0; b < branchSeeds.length && segIdx < 16; b++) {
      const seed = branchSeeds[b];
      const bx1 = seed.x + (Math.random() - 0.5) * 6.5;
      const by1 = seed.y - 4.0 - Math.random() * 3.0;
      const bz1 = seed.z + (Math.random() - 0.5) * 6.5;
      writeSegment(seed.x, seed.y, seed.z, bx1, by1, bz1, 0.08);

      const bx2 = bx1 + (Math.random() - 0.5) * 5.0;
      const by2 = by1 - 3.5 - Math.random() * 2.5;
      const bz2 = bz1 + (Math.random() - 0.5) * 5.0;
      writeSegment(bx1, by1, bz1, bx2, by2, bz2, 0.06);
    }

    // Zero any unused trailing segments cleanly
    while (segIdx < 18) {
      writeSegment(0, -999, 0, 0, -999, 0, 0);
    }

    (bolt.outerLines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (bolt.coreLines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    bolt.active = true;
    bolt.timer = 0;
    bolt.duration = 0.18 + Math.random() * 0.10; // 0.18 - 0.28s
    bolt.outerMat.opacity = 1.0;
    bolt.coreMat.opacity = 1.0;
    bolt.group.visible = true;
  }

  private clearIgnisPhase2AuraParticles() {
    if (this.ignisAuraPoints) {
      for (let i = 0; i < this.IGNIS_AURA_PARTICLE_COUNT; i++) {
        this.ignisAuraLifes[i] = 0;
        this.ignisAuraPositions[i * 3] = 0;
        this.ignisAuraPositions[i * 3 + 1] = -999;
        this.ignisAuraPositions[i * 3 + 2] = 0;
      }
      this.ignisAuraPoints.visible = false;
      (this.ignisAuraPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  private updateCalderaStormAndAura(delta: number, elapsed: number) {
    if (this.world?.interiorManager?.activeRoom) {
      if (this.ignisAuraPoints) this.ignisAuraPoints.visible = false;
      if (this.calderaCloudGroup) this.calderaCloudGroup.visible = false;
      return;
    }
    const stormFactor = this.bossManager?.extremeWeatherFactor || 0;
    const ignis = this.cachedIgnisEnemy;
    const isIgnisAlivePhase2 = Boolean(
      ignis &&
      !ignis.data.isDead &&
      ignis.data.hp > 0 &&
      this.bossManager?.dragonPhase === 2
    );
    const distPlayerToCaldera = Math.hypot(this.playerPos.x - SPAWN_NAGA[0], this.playerPos.z - SPAWN_NAGA[1]);

    // 0. Pulse Lava Lake emissive & animate rising caldera lava embers (0 dynamic PointLight)
    if (this.world?.lavaSurfaceMat) {
      this.world.lavaSurfaceMat.emissiveIntensity = 1.72 + Math.sin(elapsed * 2.4) * 0.28;
    }
    if (this.world?.lavaEmbers) {
      const showEmbers = distPlayerToCaldera <= 175.0;
      this.world.lavaEmbers.visible = showEmbers;
      if (showEmbers) {
        const posAttr = this.world.lavaEmbers.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const count = posAttr.count;
        for (let i = 0; i < count; i++) {
          const idxY = i * 3 + 1;
          arr[idxY] += delta * (1.2 + (i % 5) * 0.28);
          if (arr[idxY] > 5.8) {
            arr[idxY] = 0.2;
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    // 1. Update Ignis Phase 2 Volcanic Berserk Aura Particles (Smoke & Magma Embers)
    if (this.ignisAuraPoints && this.ignisAuraMat) {
      if (isIgnisAlivePhase2 && distPlayerToCaldera <= 95.0 && ignis) {
        const iPos = ignis.mesh.position;
        const spawnsPerFrame = 3;
        for (let s = 0; s < spawnsPerFrame; s++) {
          const idx = this.ignisAuraCursor;
          this.ignisAuraCursor = (this.ignisAuraCursor + 1) % this.IGNIS_AURA_PARTICLE_COUNT;
          const i3 = idx * 3;
          const spawnChoice = idx % 3; // back, wingtips, jaw
          let ox = (Math.random() - 0.5) * 4.5;
          let oy = 4.2 + Math.random() * 2.2;
          let oz = (Math.random() - 0.5) * 4.5;
          if (spawnChoice === 1) {
            ox = (Math.random() > 0.5 ? 1 : -1) * (4.5 + Math.random() * 4.5);
            oy = 5.5 + Math.random() * 2.5;
          } else if (spawnChoice === 2) {
            const sinY = Math.sin(ignis.mesh.rotation.y);
            const cosY = Math.cos(ignis.mesh.rotation.y);
            ox = sinY * 5.2 + (Math.random() - 0.5) * 1.4;
            oz = cosY * 5.2 + (Math.random() - 0.5) * 1.4;
            oy = 6.2 + Math.random() * 1.2;
          }

          this.ignisAuraPositions[i3] = iPos.x + ox;
          this.ignisAuraPositions[i3 + 1] = iPos.y + oy;
          this.ignisAuraPositions[i3 + 2] = iPos.z + oz;

          this.ignisAuraVelocities[i3] = (Math.random() - 0.5) * 2.8;
          this.ignisAuraVelocities[i3 + 1] = 2.6 + Math.random() * 3.6;
          this.ignisAuraVelocities[i3 + 2] = (Math.random() - 0.5) * 2.8;

          const isEmber = idx % 2 === 0;
          this.ignisAuraColors[i3] = isEmber ? 1.0 : 0.16;
          this.ignisAuraColors[i3 + 1] = isEmber ? (0.25 + Math.random() * 0.35) : 0.13;
          this.ignisAuraColors[i3 + 2] = isEmber ? 0.04 : 0.15;

          const maxL = 0.65 + Math.random() * 0.55;
          this.ignisAuraLifes[idx] = maxL;
          this.ignisAuraMaxLifes[idx] = maxL;
        }
      }

      let anyAuraActive = false;
      for (let i = 0; i < this.IGNIS_AURA_PARTICLE_COUNT; i++) {
        if (this.ignisAuraLifes[i] > 0) {
          this.ignisAuraLifes[i] -= delta;
          const i3 = i * 3;
          if (this.ignisAuraLifes[i] <= 0) {
            this.ignisAuraPositions[i3 + 1] = -999;
          } else {
            anyAuraActive = true;
            this.ignisAuraPositions[i3] += this.ignisAuraVelocities[i3] * delta;
            this.ignisAuraPositions[i3 + 1] += this.ignisAuraVelocities[i3 + 1] * delta;
            this.ignisAuraPositions[i3 + 2] += this.ignisAuraVelocities[i3 + 2] * delta;
          }
        }
      }
      this.ignisAuraPoints.visible = anyAuraActive;
      if (anyAuraActive) {
        (this.ignisAuraPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (this.ignisAuraPoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // 2. Dark Overcast Storm Clouds above Caldera
    if (this.calderaCloudGroup) {
      const showClouds = stormFactor > 0.05 && distPlayerToCaldera <= 140.0;
      this.calderaCloudGroup.visible = showClouds;
      if (showClouds) {
        this.calderaCloudGroup.rotation.y = elapsed * 0.06;
        const targetOp = Math.min(0.86, stormFactor * 0.86);
        for (let i = 0; i < this.calderaCloudMats.length; i++) {
          this.calderaCloudMats[i].opacity = targetOp;
        }
      }
    }

    // 3. Swirling Storm Ash & Cinder Particles
    if (this.calderaStormPoints && this.calderaStormMat) {
      const showStormAsh = stormFactor > 0.05 && distPlayerToCaldera <= 110.0;
      this.calderaStormPoints.visible = showStormAsh;
      if (showStormAsh) {
        this.calderaStormMat.opacity = Math.min(0.88, stormFactor * 0.88);
        const cx = SPAWN_NAGA[0];
        const cz = SPAWN_NAGA[1];
        for (let i = 0; i < this.CALDERA_STORM_PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          this.calderaStormPositions[i3] += (this.calderaStormVelocities[i3] + Math.sin(elapsed + i) * 0.8) * delta;
          this.calderaStormPositions[i3 + 1] += this.calderaStormVelocities[i3 + 1] * delta;
          this.calderaStormPositions[i3 + 2] += (this.calderaStormVelocities[i3 + 2] + Math.cos(elapsed + i) * 0.8) * delta;

          if (this.calderaStormPositions[i3 + 1] < 2.2) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 52;
            this.calderaStormPositions[i3] = cx + Math.cos(a) * r;
            this.calderaStormPositions[i3 + 1] = 35.0 + Math.random() * 5.0;
            this.calderaStormPositions[i3 + 2] = cz + Math.sin(a) * r;
          }
        }
        (this.calderaStormPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // 4. Pooled Lightning Strikes & Thunder (only when stormFactor > 0.6 && Ignis alive in combat radius <= 72)
    if (stormFactor > 0.6 && isIgnisAlivePhase2 && distPlayerToCaldera <= 72.0) {
      this.calderaLightningNextTimer -= delta;
      if (this.calderaLightningNextTimer <= 0) {
        this.calderaLightningNextTimer = 3.5 + Math.random() * 3.0; // 3.5 - 6.5s
        const strikeCount = Math.random() < 0.38 ? 2 : 1;
        let triggered = 0;
        for (let b = 0; b < this.calderaLightningPool.length && triggered < strikeCount; b++) {
          const bolt = this.calderaLightningPool[b];
          if (!bolt.active) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 22.0 + Math.random() * 24.0;
            const sx = SPAWN_NAGA[0] + Math.cos(ang) * rad;
            const sz = SPAWN_NAGA[1] + Math.sin(ang) * rad;
            this.spawnCalderaLightningBolt(bolt, sx, sz);
            this.calderaLightningFlashDuration = bolt.duration;
            this.calderaLightningFlashTimer = bolt.duration;
            triggered++;
          }
        }
        if (triggered > 0) {
          soundManager.playThunderCrack();
        }
      }
    } else {
      // Hentikan petir baru seketika saat Ignis mati atau pemain kabur > 72u
      this.calderaLightningNextTimer = 1.5;
    }

    // Advance active lightning bolts & compute double-flicker flash boost
    let flashBoost = 0;
    for (let i = 0; i < this.calderaLightningPool.length; i++) {
      const bolt = this.calderaLightningPool[i];
      if (!bolt.active) continue;
      bolt.timer += delta;
      if (bolt.timer >= bolt.duration) {
        bolt.active = false;
        bolt.group.visible = false;
        continue;
      }
      const p = bolt.timer / bolt.duration;
      // Double flicker curve: spike at t~0.15 and t~0.58 then fade cleanly
      const flicker = p < 0.35
        ? Math.sin((p / 0.35) * Math.PI)
        : p < 0.48
          ? 0.15
          : Math.max(0, Math.sin(((p - 0.48) / 0.52) * Math.PI) * 0.9);
      bolt.outerMat.opacity = Math.min(1, flicker * 1.1);
      bolt.coreMat.opacity = Math.min(1, flicker * 1.25);
      flashBoost = Math.max(flashBoost, flicker);
    }

    if (this.calderaLightningFlashTimer > 0) {
      this.calderaLightningFlashTimer = Math.max(0, this.calderaLightningFlashTimer - delta);
    }

    // 5. Atmosphere, Fog & Existing Light Dimming / Lightning Flash (ZERO PointLight creation, ZERO Color allocation)
    if (stormFactor > 0.001) {
      const darkT = Math.min(1.0, stormFactor * 0.94);

      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(this._stormBgColor, darkT);
        if (flashBoost > 0.01) {
          this.scene.background.lerp(this._stormFlashBgColor, Math.min(0.65, flashBoost * 0.55));
        }
      }

      if (this.scene.fog) {
        this.scene.fog.color.lerp(this._stormFogColor, darkT);
        if (flashBoost > 0.01) {
          this.scene.fog.color.lerp(this._stormFlashBgColor, Math.min(0.55, flashBoost * 0.45));
        }
        if ('density' in this.scene.fog) {
          (this.scene.fog as THREE.FogExp2).density *= (1.0 + stormFactor * 1.45);
        } else if (this.scene.fog instanceof THREE.Fog) {
          this.scene.fog.far *= (1.0 - stormFactor * 0.52);
          this.scene.fog.near *= (1.0 - stormFactor * 0.55);
        }
      }

      if (this.world?.dirLight && this.world?.hemiLight) {
        const dimMult = 1.0 - stormFactor * 0.45;
        this.world.dirLight.intensity = this.world.dirLight.intensity * dimMult + flashBoost * 1.65;
        this.world.hemiLight.intensity = this.world.hemiLight.intensity * dimMult + flashBoost * 0.95;
        this.world.dirLight.color.lerp(this._stormLightTint, stormFactor * 0.55);
      }
    }
  }

  // ============================================================================
  // DEVELOPER & TESTING UTILITIES (Active only when Master Dev Mode is ON)
  // ============================================================================
  public devForceNearestBossPhase2(): { ok: boolean; message: string } {
    if (!this.isWorldLoaded) {
      return { ok: false, message: 'Masuki dunia permainan terlebih dahulu.' };
    }
    let nearest: (typeof this.enemies)[0] | null = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemies) {
      const isBoss =
        enemy.data.type === 'boss' ||
        enemy.data.id === 'boss_dragonfang' ||
        enemy.data.id === 'boss_jarrus' ||
        enemy.data.id === 'boss_titan';
      if (!isBoss || enemy.data.isDead || enemy.data.hp <= 0) continue;
      const d = this.playerPos.distanceTo(enemy.mesh.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }
    if (!nearest) {
      return { ok: false, message: 'Tidak ada Boss hidup ditemukan di dunia.' };
    }
    // Set ke tepat di bawah ambang 50% (misal 49.5%) agar Fase 2 Ignis & Whirlpool Jarrus langsung aktif
    const phase2Hp = Math.max(1, Math.floor(nearest.data.maxHp * 0.5) - 1);
    nearest.data.hp = Math.min(nearest.data.hp, phase2Hp);
    this.bossCombatStates.set(nearest.data.id, { combatActive: true, disengageTimer: 0 });
    this.bossManager?.setBossCombatActive(nearest.data.id, true);
    nearest.isReturning = false;
    const bossName = nearest.data.nameId || nearest.data.name;
    this.callbacks.onAddFloatingText(`⚡ [DEV] ${bossName} dipaksa ke Fase 2 (${nearest.data.hp}/${nearest.data.maxHp} HP)!`, '#f59e0b', 'crit');
    return { ok: true, message: `${bossName} diatur ke Fase 2 (${nearest.data.hp} HP).` };
  }

  public devResetNearestBoss(): { ok: boolean; message: string } {
    if (!this.isWorldLoaded) {
      return { ok: false, message: 'Masuki dunia permainan terlebih dahulu.' };
    }
    let nearest: (typeof this.enemies)[0] | null = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemies) {
      const isBoss =
        enemy.data.type === 'boss' ||
        enemy.data.id === 'boss_dragonfang' ||
        enemy.data.id === 'boss_jarrus' ||
        enemy.data.id === 'boss_titan';
      if (!isBoss) continue;
      const d = this.playerPos.distanceTo(enemy.mesh.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }
    if (!nearest) {
      return { ok: false, message: 'Data Boss tidak ditemukan.' };
    }
    nearest.data.isDead = false;
    nearest.data.hp = nearest.data.maxHp;
    nearest.respawnTimer = 0;
    nearest.deathTimer = 0;
    nearest.isReturning = false;
    nearest.attackCooldown = 0;
    nearest.stunTimer = 0;
    nearest.slowTimer = 0;
    nearest.brittleTimer = 0;
    nearest.armorBreakTimer = 0;
    nearest.velocity?.set(0, 0, 0);

    const sx = nearest.spawnPos?.x ?? nearest.data.position[0];
    const sz = nearest.spawnPos?.z ?? nearest.data.position[2];
    const sy = this.world.getTerrainHeight(sx, sz);
    nearest.mesh.position.set(sx, sy, sz);
    nearest.mesh.visible = true;
    const scale =
      nearest.data.id === 'boss_dragonfang' ? 4.2 :
      (nearest.data.id === 'boss_jarrus' || nearest.data.id === 'boss_titan') ? 1.0 : 3.5;
    nearest.mesh.scale.set(scale, scale, scale);
    nearest.mesh.quaternion.identity();
    nearest.mesh.rotation.order = 'XYZ';
    nearest.mesh.rotation.set(0, nearest.spawnRotY ?? 0, 0);
    this.bossCombatStates.delete(nearest.data.id);
    this.resetEnemyPose(nearest);
    this.bossManager?.resetBoss(nearest.data.id, nearest);
    if (nearest.data.id === 'boss_dragonfang') {
      this.clearIgnisPhase2AuraParticles();
    }

    const bossName = nearest.data.nameId || nearest.data.name;
    this.callbacks.onAddFloatingText(`🔄 [DEV] ${bossName} direset ke HP penuh (Fase 1)!`, '#38bdf8', 'crit');
    return { ok: true, message: `${bossName} berhasil direset (${nearest.data.maxHp} HP).` };
  }

  public devTeleportToPreset(preset: 'ignis' | 'jarrus' | 'titan' | 'village'): { ok: boolean; label: string } {
    if (!this.isWorldLoaded) {
      return { ok: false, label: 'Masuki dunia permainan terlebih dahulu.' };
    }
    let tx = 20;
    let tz = -55;
    let label = 'Desa Utama Eldoria';
    if (preset === 'ignis') {
      tx = 40;
      tz = 738;
      label = 'Gerbang Jembatan Obsidian Kaldera [40, 738]';
    } else if (preset === 'jarrus') {
      tx = -840;
      tz = -205;
      label = 'Kawah Pusaran Solaria [-840, -205]';
    } else if (preset === 'titan') {
      const titanEnemy = this.enemies.find((e) => e.data.id === 'boss_titan');
      const gx = titanEnemy?.spawnPos?.x ?? titanEnemy?.data.position[0] ?? SPAWN_TITAN.x;
      const gz = titanEnemy?.spawnPos?.z ?? titanEnemy?.data.position[2] ?? SPAWN_TITAN.z;
      tx = gx;
      tz = gz + 42;
      label = 'Colosseum Titan Kuno';
    }
    this.teleportGraceTimer = 0.25;
    this.teleportTo(tx, tz);
    if (preset === 'ignis') {
      this.playerRotationY = 0; // Menghadap Selatan melintasi Jembatan Obsidian menuju Ignis
      this.cameraAngleH = Math.PI;
    }
    this.callbacks.onAddFloatingText(`🧭 [DEV] Teleportasi: ${label}`, '#22d3ee', 'crit');
    return { ok: true, label };
  }

  public getDevDebugTelemetry(): {
    fps: number;
    x: number;
    y: number;
    z: number;
    nearestBoss: {
      id: string;
      name: string;
      dist: number;
      hp: number;
      maxHp: number;
      isDead: boolean;
      phase: number;
      aiState: string;
      stormFactor: number;
    } | null;
  } {
    let nearest: (typeof this.enemies)[0] | null = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemies) {
      const isBoss =
        enemy.data.type === 'boss' ||
        enemy.data.id === 'boss_dragonfang' ||
        enemy.data.id === 'boss_jarrus' ||
        enemy.data.id === 'boss_titan';
      if (!isBoss) continue;
      const d = this.playerPos.distanceTo(enemy.mesh.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }

    const activePos = this.isSpectatorMode ? this.spectatorPos : this.playerPos;
    let bossInfo = null;
    if (nearest) {
      const dbg = this.bossManager?.getBossDebugState(nearest.data.id);
      bossInfo = {
        id: nearest.data.id,
        name: nearest.data.nameId || nearest.data.name,
        dist: Math.round(nearestDist * 10) / 10,
        hp: Math.max(0, Math.round(nearest.data.hp)),
        maxHp: nearest.data.maxHp,
        isDead: Boolean(nearest.data.isDead),
        phase: dbg?.phase ?? 1,
        aiState: nearest.data.isDead ? 'dead' : (dbg?.state ?? 'chase'),
        stormFactor: dbg?.stormFactor ?? 0,
      };
    }

    return {
      fps: this.currentFps,
      x: Math.round(activePos.x * 10) / 10,
      y: Math.round(activePos.y * 10) / 10,
      z: Math.round(activePos.z * 10) / 10,
      nearestBoss: bossInfo,
    };
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

    // 3. Crescent Slash Pool (14 pre-allocated canonical unit ribbons — zero BufferGeometry/Material GC)
    const CRESCENT_SEGMENTS = 32;
    const cOuterPos: number[] = [];
    const cOuterIdx: number[] = [];
    const cInnerPos: number[] = [];
    const cInnerIdx: number[] = [];
    const cMaxW = 0.28;
    const cMaxZ = 0.18;
    const cMaxY = 0.22;
    for (let i = 0; i <= CRESCENT_SEGMENTS; i++) {
      const u = (i / CRESCENT_SEGMENTS) * 2 - 1;
      const x = u;
      const taper = Math.max(0, 1 - u * u);
      const y = taper * cMaxY;
      const z = taper * cMaxZ;
      const w = cMaxW * Math.sqrt(taper);
      const dx = 1;
      const dy = -2 * u * cMaxY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      cOuterPos.push(x + nx * (w * 0.5), y + ny * (w * 0.5), z);
      cOuterPos.push(x - nx * (w * 0.5), y - ny * (w * 0.5), z);
      const coreW = w * 0.35;
      cInnerPos.push(x + nx * (coreW * 0.5), y + ny * (coreW * 0.5), z + 0.005);
      cInnerPos.push(x - nx * (coreW * 0.5), y - ny * (coreW * 0.5), z + 0.005);
      if (i < CRESCENT_SEGMENTS) {
        const v0 = i * 2;
        const v1 = i * 2 + 1;
        const v2 = (i + 1) * 2;
        const v3 = (i + 1) * 2 + 1;
        cOuterIdx.push(v0, v1, v2, v2, v1, v3);
        cInnerIdx.push(v0, v1, v2, v2, v1, v3);
      }
    }
    const sharedCrescentOuterGeom = new THREE.BufferGeometry();
    sharedCrescentOuterGeom.setAttribute('position', new THREE.Float32BufferAttribute(cOuterPos, 3));
    sharedCrescentOuterGeom.setIndex(cOuterIdx);
    sharedCrescentOuterGeom.computeVertexNormals();
    const sharedCrescentInnerGeom = new THREE.BufferGeometry();
    sharedCrescentInnerGeom.setAttribute('position', new THREE.Float32BufferAttribute(cInnerPos, 3));
    sharedCrescentInnerGeom.setIndex(cInnerIdx);
    sharedCrescentInnerGeom.computeVertexNormals();

    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group();
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      group.add(
        new THREE.Mesh(sharedCrescentOuterGeom, outerMat),
        new THREE.Mesh(sharedCrescentInnerGeom, innerMat)
      );
      group.visible = false;
      this.scene.add(group);
      this.crescentSlashPool.push({
        group,
        outerMat,
        innerMat,
        active: false,
        elapsed: 0,
        duration: 0.22,
        baseRadius: 1.4,
        dirX: 0,
        dirY: 0,
        dirZ: 1,
      });
    }

    // 4. Shadow Step Silhouettes Pool (8 pre-allocated silhouettes)
    const stepTorsoGeom = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    const stepHeadGeom = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        color: 0x064e3b,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const torso = new THREE.Mesh(stepTorsoGeom, mat);
      const head = new THREE.Mesh(stepHeadGeom, mat);
      head.position.y = 0.7;
      group.add(torso, head);
      group.visible = false;
      this.scene.add(group);
      this.shadowStepPool.push({
        group,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.4,
      });
    }

    // 5. Smoke Veil & Shadow Step Puff Pool (44 pre-allocated dodecahedrons, frustumCulled=false)
    const sharedSmokeGeom = new THREE.DodecahedronGeometry(0.85, 1);
    for (let i = 0; i < 44; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x9ca3af : 0x6b7280,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sharedSmokeGeom, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.smokePuffPool.push({
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 3.5,
        baseOpacity: 0.65,
        riseSpeed: 0.5,
        growRate: 0.65,
        vx: 0,
        vz: 0,
      });
    }

    // 6. 360° Blade Spin Pool (4 pre-allocated circular discs + 8 spokes)
    const sharedSpinOuterGeom = new THREE.RingGeometry(0.65, 1.0, 40);
    const sharedSpinInnerGeom = new THREE.RingGeometry(0.82, 1.02, 40);
    const sharedSpinSpokeGeom = new THREE.PlaneGeometry(0.05, 0.9);
    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();
      group.rotation.x = Math.PI / 2;
      const matOuter = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const matInner = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const spokeMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const ringOuter = new THREE.Mesh(sharedSpinOuterGeom, matOuter);
      const ringInner = new THREE.Mesh(sharedSpinInnerGeom, matInner);
      ringInner.position.z = 0.02;
      group.add(ringOuter, ringInner);
      for (let s = 0; s < 8; s++) {
        const angle = (s / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(sharedSpinSpokeGeom, spokeMat);
        spoke.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.45, 0.01);
        spoke.rotation.z = angle + Math.PI / 2;
        group.add(spoke);
      }
      group.visible = false;
      this.scene.add(group);
      this.bladeSpin360Pool.push({
        group,
        ringOuter,
        ringInner,
        matOuter,
        matInner,
        spokeMat,
        active: false,
        elapsed: 0,
        duration: 0.32,
        baseRadius: 3.4,
      });
    }

    // 7. Sleek Sprint Wind Streaks Pool (32 ultra-thin tapered streaks behind Assassin)
    const sharedStreakGeom = new THREE.BoxGeometry(0.016, 0.016, 0.78);
    for (let i = 0; i < 32; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xa5f3fc : 0xe2e8f0,
        transparent: true,
        opacity: 0.30,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(sharedStreakGeom, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sprintWindStreakPool.push({
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.22,
        baseOpacity: 0.30,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }

    // 8. Dedicated Multi-Instance Pools for Panah Rajawali Astral & Ultimate Badai Panah Agung
    this.initBowSkillVfxPools();
  }

  private initBowSkillVfxPools() {
    if (this.astralEaglePool.length > 0 || this.arrowRainPool.length > 0) return;

    const markNoCull = (obj: THREE.Object3D) => {
      obj.frustumCulled = false;
      obj.traverse((child) => {
        child.frustumCulled = false;
      });
      this.scene.add(obj);
    };

    // =========================================================================
    // A. PANAH RAJAWALI ASTRAL POOLS (6 proyektil elang cahaya + 24 cincin shockwave)
    // =========================================================================
    const eagleShaftGeom = new THREE.CylinderGeometry(0.06, 0.08, 2.3, 6);
    eagleShaftGeom.rotateX(Math.PI / 2);
    const eagleHeadGeom = new THREE.ConeGeometry(0.18, 0.58, 6);
    eagleHeadGeom.rotateX(Math.PI / 2);
    const eagleWingGeom = new THREE.PlaneGeometry(1.18, 0.44);
    const eagleTrailGeom = new THREE.CylinderGeometry(0.02, 0.24, 2.8, 6, 1, true);
    eagleTrailGeom.rotateX(Math.PI / 2);

    this.arrowRainSharedGeometries.push(
      eagleShaftGeom,
      eagleHeadGeom,
      eagleWingGeom,
      eagleTrailGeom
    );

    const eagleHeadMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
    });
    this.arrowRainSharedMaterials.push(eagleHeadMat);

    for (let i = 0; i < 6; i++) {
      const root = new THREE.Group();
      root.name = `AstralEagleProjectile_${i}`;

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xa5f3fc,
        transparent: true,
        opacity: 0.95,
      });
      const wingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.80,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const shaft = new THREE.Mesh(eagleShaftGeom, coreMat);
      const head = new THREE.Mesh(eagleHeadGeom, eagleHeadMat);
      head.position.set(0, 0, 1.38);

      // Sepasang sayap geometris miring ke belakang membentuk siluet elang cahaya
      const wingL = new THREE.Mesh(eagleWingGeom, wingMat);
      wingL.position.set(-0.56, 0.02, -0.05);
      wingL.rotation.set(Math.PI / 2, 0.14, 0.55);

      const wingR = new THREE.Mesh(eagleWingGeom, wingMat);
      wingR.position.set(0.56, 0.02, -0.05);
      wingR.rotation.set(Math.PI / 2, -0.14, -0.55);

      const innerWingL = new THREE.Mesh(eagleWingGeom, coreMat);
      innerWingL.scale.set(0.75, 0.45, 1);
      innerWingL.position.set(-0.42, 0.03, 0.08);
      innerWingL.rotation.set(Math.PI / 2, 0.14, 0.55);

      const innerWingR = new THREE.Mesh(eagleWingGeom, coreMat);
      innerWingR.scale.set(0.75, 0.45, 1);
      innerWingR.position.set(0.42, 0.03, 0.08);
      innerWingR.rotation.set(Math.PI / 2, -0.14, -0.55);

      const trail = new THREE.Mesh(eagleTrailGeom, trailMat);
      trail.position.set(0, 0, -1.65);

      root.add(shaft, head, wingL, wingR, innerWingL, innerWingR, trail);
      root.visible = false;
      markNoCull(root);

      this.astralEaglePool.push({
        root,
        coreMat,
        wingMat,
        trailMat,
        active: false,
        direction: new THREE.Vector3(0, 0, 1),
        speed: 56,
        traveled: 0,
        maxRange: 30,
        shockwaveAccum: 0,
        damage: 25,
        isCrit: false,
        knockback: 0.5,
        hitEnemyIds: new Set<string>(),
      });
    }

    const eagleRingGeom = new THREE.RingGeometry(0.45, 0.78, 24);
    this.arrowRainSharedGeometries.push(eagleRingGeom);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x67e8f9 : 0xa5f3fc,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(eagleRingGeom, mat);
      mesh.name = `AstralEagleShockwave_${i}`;
      mesh.visible = false;
      markNoCull(mesh);

      this.astralShockwavePool.push({
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.35,
      });
    }

    // =========================================================================
    // B. ULTIMATE BADAI PANAH AGUNG POOLS (90 Panah Hujan, 36 Impact, 3 Portal, 3 Tombak, dll.)
    // =========================================================================
    const rainShaftGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6);
    const rainHeadGeom = new THREE.ConeGeometry(0.16, 0.45, 6);
    const rainFletchGeom = new THREE.BoxGeometry(0.26, 0.38, 0.03);
    const rainTrailGeom = new THREE.CylinderGeometry(0.22, 0.02, 3.2, 6, 1, true);
    const flareTrailGeom = new THREE.CylinderGeometry(0.48, 0.04, 6.2, 8, 1, true);

    const headMatCyan = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x67e8f9,
      emissiveIntensity: 3.0,
      roughness: 0.15,
      metalness: 0.6,
    });
    const headMatGold = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfde047,
      emissiveIntensity: 2.8,
      roughness: 0.18,
      metalness: 0.65,
    });
    const fletchMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });

    this.arrowRainSharedGeometries.push(
      rainShaftGeom,
      rainHeadGeom,
      rainFletchGeom,
      rainTrailGeom,
      flareTrailGeom
    );
    this.arrowRainSharedMaterials.push(headMatCyan, headMatGold, fletchMat);

    // 1. 90 Panah Hujan (campuran cyan #67e8f9 & aksen emas #fde047)
    for (let i = 0; i < 90; i++) {
      const isGoldAccent = i % 4 === 0;
      const root = new THREE.Group();
      root.name = `BadaiAgungRainArrow_${i}`;

      const shaftMat = new THREE.MeshStandardMaterial({
        color: isGoldAccent ? 0xfef08a : 0x22d3ee,
        emissive: isGoldAccent ? 0xf59e0b : 0x00e5ff,
        emissiveIntensity: 2.2,
        transparent: true,
        opacity: 1.0,
        roughness: 0.2,
        metalness: 0.5,
      });
      const trailMat = new THREE.MeshBasicMaterial({
        color: isGoldAccent ? 0xfde047 : 0x67e8f9,
        transparent: true,
        opacity: isGoldAccent ? 0.82 : 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const shaft = new THREE.Mesh(rainShaftGeom, shaftMat);
      const head = new THREE.Mesh(rainHeadGeom, isGoldAccent ? headMatGold : headMatCyan);
      head.position.set(0, 1.28, 0);

      const fletch1 = new THREE.Mesh(rainFletchGeom, fletchMat);
      fletch1.position.set(0, -0.94, 0);
      const fletch2 = new THREE.Mesh(rainFletchGeom, fletchMat);
      fletch2.position.set(0, -0.94, 0);
      fletch2.rotation.y = Math.PI / 2;

      const trail = new THREE.Mesh(rainTrailGeom, trailMat);
      trail.position.set(0, -2.55, 0);

      root.add(shaft, head, fletch1, fletch2, trail);
      root.visible = false;
      markNoCull(root);

      this.arrowRainPool.push({
        root,
        trail,
        trailMat,
        shaftMat,
        active: false,
        phase: 'falling',
        vx: 0,
        vy: 0,
        vz: 0,
        groundY: 0,
        stickElapsed: 0,
      });
    }

    // 2. Pool 36 Cincin & Percikan Tumbukan Tanah
    const impactRingGeom = new THREE.RingGeometry(0.28, 0.82, 18);
    impactRingGeom.rotateX(-Math.PI / 2);
    const impactSparkGeom = new THREE.ConeGeometry(0.08, 0.55, 4);
    this.arrowRainSharedGeometries.push(impactRingGeom, impactSparkGeom);

    for (let i = 0; i < 36; i++) {
      const group = new THREE.Group();
      group.name = `BadaiAgungImpact_${i}`;
      const isGold = i % 4 === 0;
      const ringMat = new THREE.MeshBasicMaterial({
        color: isGold ? 0xfde047 : 0x67e8f9,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const sparkMat = new THREE.MeshBasicMaterial({
        color: isGold ? 0xfef9c3 : 0xe0f2fe,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(impactRingGeom, ringMat));
      for (let s = 0; s < 4; s++) {
        const ang = (s / 4) * Math.PI * 2 + Math.PI * 0.25;
        const spark = new THREE.Mesh(impactSparkGeom, sparkMat);
        spark.position.set(Math.cos(ang) * 0.26, 0.24, Math.sin(ang) * 0.26);
        spark.rotation.set(Math.sin(ang) * 0.65, 0, -Math.cos(ang) * 0.65);
        group.add(spark);
      }
      group.visible = false;
      markNoCull(group);

      this.arrowRainImpactPool.push({
        group,
        ringMat,
        sparkMat,
        active: false,
        elapsed: 0,
        duration: 0.26,
      });
    }

    // 3. Pool 3 Caster Aura Rings (Cyan-Emas di kaki karakter Fase 1) + 3 Giant Flare Arrows
    const casterAuraGeom = new THREE.RingGeometry(1.1, 1.9, 32);
    casterAuraGeom.rotateX(-Math.PI / 2);
    this.arrowRainSharedGeometries.push(casterAuraGeom);

    for (let i = 0; i < 3; i++) {
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const auraMesh = new THREE.Mesh(casterAuraGeom, auraMat);
      auraMesh.name = `BadaiAgungCasterAura_${i}`;
      auraMesh.visible = false;
      markNoCull(auraMesh);
      this.stormCasterAuraPool.push({
        mesh: auraMesh,
        mat: auraMat,
        active: false,
        elapsed: 0,
        duration: 0.45,
      });

      const flareRoot = new THREE.Group();
      flareRoot.name = `BadaiAgungFlareArrow_${i}`;
      const flareTrailMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const fShaft = new THREE.Mesh(rainShaftGeom, headMatGold);
      fShaft.scale.set(2.2, 1.8, 2.2);
      const fHead = new THREE.Mesh(rainHeadGeom, headMatCyan);
      fHead.scale.set(2.5, 2.4, 2.5);
      fHead.position.set(0, 2.2, 0);
      const fTrail = new THREE.Mesh(flareTrailGeom, flareTrailMat);
      fTrail.position.set(0, -3.5, 0);
      flareRoot.add(fShaft, fHead, fTrail);
      flareRoot.visible = false;
      markNoCull(flareRoot);
      this.stormFlareArrowPool.push({
        root: flareRoot,
        trailMat: flareTrailMat,
        active: false,
        elapsed: 0,
        duration: 0.42,
        startY: 0,
      });
    }

    // 4. Pool 3 Storm Sky Portals (Portal Langit Berputar Radius ~9.5u di atas target)
    const portalOuterGeom = new THREE.RingGeometry(7.2, 9.8, 48);
    portalOuterGeom.rotateX(-Math.PI / 2);
    const portalInnerGeom = new THREE.RingGeometry(3.8, 6.2, 48);
    portalInnerGeom.rotateX(-Math.PI / 2);
    const portalCoreGeom = new THREE.CircleGeometry(8.5, 48);
    portalCoreGeom.rotateX(-Math.PI / 2);
    this.arrowRainSharedGeometries.push(portalOuterGeom, portalInnerGeom, portalCoreGeom);

    const galeCircleTex = getGaleMagicCircleTexture();
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      group.name = `BadaiAgungSkyPortal_${i}`;
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const coreMat = new THREE.MeshBasicMaterial({
        map: galeCircleTex,
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const outerRing = new THREE.Mesh(portalOuterGeom, outerMat);
      const innerRing = new THREE.Mesh(portalInnerGeom, innerMat);
      innerRing.position.y = -0.05;
      const coreDisc = new THREE.Mesh(portalCoreGeom, coreMat);
      coreDisc.position.y = 0.05;
      group.add(outerRing, innerRing, coreDisc);
      group.visible = false;
      markNoCull(group);
      this.stormSkyPortalPool.push({
        group,
        outerRing,
        innerRing,
        outerMat,
        innerMat,
        coreMat,
        active: false,
      });
    }

    // 5. Pool 3 Ground Dual Magic Circles (Radius 13.0) + Garis Angin Naik Vertikal
    const gOuterGeom = new THREE.RingGeometry(12.2, 13.0, 64);
    gOuterGeom.rotateX(-Math.PI / 2);
    const gInnerGeom = new THREE.RingGeometry(7.8, 8.6, 64);
    gInnerGeom.rotateX(-Math.PI / 2);
    const gDiscGeom = new THREE.CircleGeometry(12.6, 64);
    gDiscGeom.rotateX(-Math.PI / 2);
    const gWindLineGeom = new THREE.BoxGeometry(0.08, 3.6, 0.08);
    this.arrowRainSharedGeometries.push(gOuterGeom, gInnerGeom, gDiscGeom, gWindLineGeom);

    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      group.name = `BadaiAgungGroundCircle_${i}`;
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const discMat = new THREE.MeshBasicMaterial({
        map: galeCircleTex,
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const windMat = new THREE.MeshBasicMaterial({
        color: 0xa5f3fc,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const outerRing = new THREE.Mesh(gOuterGeom, outerMat);
      const innerRing = new THREE.Mesh(gInnerGeom, innerMat);
      innerRing.position.y = 0.03;
      const discMesh = new THREE.Mesh(gDiscGeom, discMat);
      discMesh.position.y = 0.01;
      group.add(outerRing, innerRing, discMesh);

      const windStreaks: THREE.Mesh[] = [];
      for (let w = 0; w < 8; w++) {
        const ang = (w / 8) * Math.PI * 2;
        const distR = 9.5 + (w % 2) * 2.4;
        const streak = new THREE.Mesh(gWindLineGeom, windMat);
        streak.position.set(Math.cos(ang) * distR, 1.8 + (w % 3) * 1.1, Math.sin(ang) * distR);
        group.add(streak);
        windStreaks.push(streak);
      }

      group.visible = false;
      markNoCull(group);
      this.stormGroundMagicCirclePool.push({
        group,
        outerRing,
        innerRing,
        discMesh,
        windStreaks,
        outerMat,
        innerMat,
        discMat,
        windMat,
        active: false,
      });
    }

    // 6. Pool 3 Panah Tombak Rajawali Raksasa (~3.5x panah biasa) + 3 Finisher Shockwave & Pilar Cahaya
    const tombakShaftGeom = new THREE.CylinderGeometry(0.24, 0.30, 7.6, 8);
    const tombakHeadGeom = new THREE.ConeGeometry(0.62, 1.9, 8);
    const tombakWingGeom = new THREE.PlaneGeometry(3.6, 1.35);
    const blastRingGeom = new THREE.RingGeometry(0.5, 1.15, 48);
    blastRingGeom.rotateX(-Math.PI / 2);
    const pillarGeom = new THREE.CylinderGeometry(1.1, 2.2, 26, 16, 1, true);
    this.arrowRainSharedGeometries.push(
      tombakShaftGeom,
      tombakHeadGeom,
      tombakWingGeom,
      blastRingGeom,
      pillarGeom
    );

    for (let i = 0; i < 3; i++) {
      const tRoot = new THREE.Group();
      tRoot.name = `TombakRajawali_${i}`;
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.98,
      });
      const wingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const tShaft = new THREE.Mesh(tombakShaftGeom, headMatGold);
      const tHead = new THREE.Mesh(tombakHeadGeom, coreMat);
      // Ujung menunjuk lurus ke BAWAH (-Y) agar menghujam langsung ke pusat AoE
      tHead.rotation.z = Math.PI;
      tHead.position.set(0, -4.75, 0);

      const tWingL = new THREE.Mesh(tombakWingGeom, wingMat);
      tWingL.position.set(-1.95, 1.2, 0);
      tWingL.rotation.z = -0.58;
      const tWingR = new THREE.Mesh(tombakWingGeom, wingMat);
      tWingR.position.set(1.95, 1.2, 0);
      tWingR.rotation.z = 0.58;

      const tWingBack = new THREE.Mesh(tombakWingGeom, wingMat);
      tWingBack.position.set(0, 1.2, -1.95);
      tWingBack.rotation.y = Math.PI / 2;
      tWingBack.rotation.x = 0.58;

      const tWingFront = new THREE.Mesh(tombakWingGeom, wingMat);
      tWingFront.position.set(0, 1.2, 1.95);
      tWingFront.rotation.y = Math.PI / 2;
      tWingFront.rotation.x = -0.58;

      tRoot.add(tShaft, tHead, tWingL, tWingR, tWingBack, tWingFront);
      tRoot.visible = false;
      markNoCull(tRoot);
      this.stormTombakPool.push({
        root: tRoot,
        wingMat,
        coreMat,
        active: false,
      });

      const bGroup = new THREE.Group();
      bGroup.name = `BadaiAgungFinisherBlast_${i}`;
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const pillarMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(blastRingGeom, ringMat);
      const pillarMesh = new THREE.Mesh(pillarGeom, pillarMat);
      pillarMesh.position.y = 13;
      bGroup.add(ringMesh, pillarMesh);
      bGroup.visible = false;
      markNoCull(bGroup);
      this.stormFinisherBlastPool.push({
        group: bGroup,
        ringMesh,
        pillarMesh,
        ringMat,
        pillarMat,
        active: false,
        elapsed: 0,
        duration: 0.35,
      });
    }
  }

  private spawnAstralShockwave(pos: THREE.Vector3, dir: THREE.Vector3) {
    if (this.astralShockwavePool.length === 0) return;
    const slot = this.astralShockwavePool[this.astralShockwaveCursor];
    this.astralShockwaveCursor = (this.astralShockwaveCursor + 1) % this.astralShockwavePool.length;

    slot.active = true;
    slot.elapsed = 0;
    slot.duration = 0.35;
    slot.mat.opacity = 0.92;
    slot.mesh.position.copy(pos);
    slot.mesh.quaternion.setFromUnitVectors(this.astralForwardAxisScratch, dir);
    slot.mesh.scale.set(0.45, 0.45, 0.45);
    slot.mesh.visible = true;
  }

  private spawnAstralEagleProjectile(
    direction: THREE.Vector3,
    speed: number,
    maxRange: number,
    damageMultiplier: number,
    knockback: number,
    forceAmbushCrit = false
  ) {
    if (this.astralEaglePool.length === 0) {
      this.initBowSkillVfxPools();
    }

    let slot = this.astralEaglePool[this.astralEagleCursor];
    for (let i = 0; i < this.astralEaglePool.length; i++) {
      const idx = (this.astralEagleCursor + i) % this.astralEaglePool.length;
      if (!this.astralEaglePool[idx].active) {
        slot = this.astralEaglePool[idx];
        this.astralEagleCursor = (idx + 1) % this.astralEaglePool.length;
        break;
      }
    }
    if (slot === this.astralEaglePool[this.astralEagleCursor]) {
      this.astralEagleCursor = (this.astralEagleCursor + 1) % this.astralEaglePool.length;
    }

    const dir = direction.clone().normalize();
    const stats = this.currentStats;
    const tierMult = 1 + (this.playerTier - 1) * 0.25;
    const isCrit = forceAmbushCrit || Math.random() < 0.28 + stats.agility * 0.025;
    const baseDmg = (stats.baseAttack + stats.agility * 2.5) * tierMult * damageMultiplier;
    const finalDmg = Math.max(8, Math.round(isCrit ? baseDmg * 1.8 : baseDmg));

    slot.active = true;
    slot.direction.copy(dir);
    slot.speed = speed;
    slot.traveled = 0;
    slot.maxRange = maxRange;
    slot.shockwaveAccum = 6.0; // Langsung picu cincin shockwave awal sesaat setelah melesat
    slot.damage = finalDmg;
    slot.isCrit = isCrit;
    slot.knockback = knockback;
    slot.hitEnemyIds.clear();
    slot.coreMat.opacity = 0.96;
    slot.wingMat.opacity = 0.82;
    slot.trailMat.opacity = 0.88;

    slot.root.position.set(
      this.playerPos.x + dir.x * 0.85,
      this.playerPos.y + 1.38 + dir.y * 0.85,
      this.playerPos.z + dir.z * 0.85
    );
    slot.root.quaternion.setFromUnitVectors(this.astralForwardAxisScratch, dir);
    slot.root.scale.set(1, 1, 1);
    slot.root.visible = true;
  }

  public updateAstralEagle(delta: number) {
    if (delta <= 0) return;

    // 1. Update 6 Proyektil Panah Rajawali Astral
    for (let i = 0; i < this.astralEaglePool.length; i++) {
      const proj = this.astralEaglePool[i];
      if (!proj.active) continue;

      const stepDist = proj.speed * delta;
      proj.root.position.addScaledVector(proj.direction, stepDist);
      proj.traveled += stepDist;
      proj.shockwaveAccum += stepDist;

      // Aktifkan cincin shockwave tegak lurus arah terbang setiap ~6 unit
      if (proj.shockwaveAccum >= 6.0) {
        proj.shockwaveAccum -= 6.0;
        this.spawnAstralShockwave(proj.root.position, proj.direction);
      }

      // Piercing Collision: menembus semua musuh & Boss dengan hitEnemyIds independen per tembakan
      for (let e = 0; e < this.enemies.length; e++) {
        const enemy = this.enemies[e];
        if (enemy.data?.isDead) continue;
        const enemyId = enemy.data.id || String(enemy.mesh.id);
        if (proj.hitEnemyIds.has(enemyId)) continue;

        const dx = enemy.mesh.position.x - proj.root.position.x;
        const dy = (enemy.mesh.position.y + 1.0) - proj.root.position.y;
        const dz = enemy.mesh.position.z - proj.root.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq <= 2.35 * 2.35) {
          proj.hitEnemyIds.add(enemyId);
          const kb = enemy.data.type === 'boss' ? 0 : proj.knockback;
          this.damageEnemy(enemy, proj.damage, proj.isCrit, kb);
          soundManager.playArrowHit(proj.isCrit);
          this.spawnHitStarburst(proj.root.position, 0x67e8f9, 1.35);
          this.spawnSparks(proj.root.position, 0x38bdf8, 12, 4.8);
        }
      }

      if (proj.traveled >= proj.maxRange - 4.0) {
        const fadeT = Math.max(0, (proj.maxRange - proj.traveled) / 4.0);
        proj.coreMat.opacity = 0.96 * fadeT;
        proj.wingMat.opacity = 0.82 * fadeT;
        proj.trailMat.opacity = 0.88 * fadeT;
      }

      if (proj.traveled >= proj.maxRange) {
        proj.active = false;
        proj.root.visible = false;
      }
    }

    // 2. Update 24 Cincin Gelombang Kejut (membesar & memudar dalam 0.35s)
    for (let i = 0; i < this.astralShockwavePool.length; i++) {
      const ring = this.astralShockwavePool[i];
      if (!ring.active) continue;
      ring.elapsed += delta;
      if (ring.elapsed >= ring.duration) {
        ring.active = false;
        ring.mesh.visible = false;
        continue;
      }
      const t = ring.elapsed / ring.duration;
      const s = 0.45 + t * 2.35;
      ring.mesh.scale.set(s, s, s);
      ring.mat.opacity = 0.92 * (1.0 - t);
    }
  }

  private releaseArrowStormSlots(storm: (typeof this.activeArrowStorms)[0]) {
    const portal = this.stormSkyPortalPool[storm.portalIdx];
    if (portal) {
      portal.active = false;
      portal.group.visible = false;
    }
    const ground = this.stormGroundMagicCirclePool[storm.groundIdx];
    if (ground) {
      ground.active = false;
      ground.group.visible = false;
    }
    const tombak = this.stormTombakPool[storm.tombakIdx];
    if (tombak) {
      tombak.active = false;
      tombak.root.visible = false;
    }
    const flare = this.stormFlareArrowPool[storm.flareIdx];
    if (flare) {
      flare.active = false;
      flare.root.visible = false;
    }
  }

  private startArrowStormUltimate(casterPos: THREE.Vector3, targetPos: THREE.Vector3, ambushMult = 1.0) {
    if (this.arrowRainPool.length === 0) {
      this.initBowSkillVfxPools();
    }

    // Batasi maksimal 3 Badai Panah Agung aktif bersamaan (daur ulang badai tertua saat cast ke-4)
    while (this.activeArrowStorms.length >= 3) {
      const oldest = this.activeArrowStorms.shift();
      if (oldest) {
        this.releaseArrowStormSlots(oldest);
      }
    }

    const groundY = this.world.getTerrainHeight(targetPos.x, targetPos.z);
    const casterGroundY = this.world.getTerrainHeight(casterPos.x, casterPos.z);

    // Fase 1a: Cincin aura angin cyan-emas di bawah kaki karakter
    let auraSlotIdx = 0;
    for (let i = 0; i < this.stormCasterAuraPool.length; i++) {
      if (!this.stormCasterAuraPool[i].active) {
        auraSlotIdx = i;
        break;
      }
    }
    const aura = this.stormCasterAuraPool[auraSlotIdx];
    if (aura) {
      aura.active = true;
      aura.elapsed = 0;
      aura.duration = 0.45;
      aura.mat.opacity = 0.92;
      aura.mesh.position.set(casterPos.x, casterGroundY + 0.14, casterPos.z);
      aura.mesh.scale.set(0.4, 0.4, 0.4);
      aura.mesh.visible = true;
    }

    // Fase 1b: 1 Panah Suar Raksasa cyan-emas meluncur vertikal ke langit (Y + 30)
    let flareIdx = 0;
    for (let i = 0; i < this.stormFlareArrowPool.length; i++) {
      if (!this.stormFlareArrowPool[i].active) {
        flareIdx = i;
        break;
      }
    }
    const flare = this.stormFlareArrowPool[flareIdx];
    if (flare) {
      flare.active = true;
      flare.elapsed = 0;
      flare.duration = 0.42;
      flare.startY = casterPos.y + 1.85;
      flare.trailMat.opacity = 0.95;
      flare.root.position.set(casterPos.x, flare.startY, casterPos.z);
      flare.root.rotation.set(0, 0, 0);
      flare.root.visible = true;
    }

    // Siapkan slot Portal Langit, Lingkaran Sihir Tanah (Radius 13), & Tombak Rajawali
    const findFreeIdx = <T extends { active: boolean }>(arr: T[]): number => {
      for (let i = 0; i < arr.length; i++) {
        if (!arr[i].active) return i;
      }
      return 0;
    };
    const portalIdx = findFreeIdx(this.stormSkyPortalPool);
    const groundIdx = findFreeIdx(this.stormGroundMagicCirclePool);
    const tombakIdx = findFreeIdx(this.stormTombakPool);

    const portal = this.stormSkyPortalPool[portalIdx];
    if (portal) {
      portal.active = true;
      portal.group.position.set(targetPos.x, groundY + 29.0, targetPos.z);
      portal.group.scale.set(0.05, 0.05, 0.05);
      portal.outerMat.opacity = 0.9;
      portal.innerMat.opacity = 0.85;
      portal.coreMat.opacity = 0.78;
      portal.group.visible = false;
    }

    const ground = this.stormGroundMagicCirclePool[groundIdx];
    if (ground) {
      ground.active = true;
      ground.group.position.set(targetPos.x, groundY + 0.16, targetPos.z);
      ground.group.scale.set(0.15, 0.15, 0.15);
      ground.outerMat.opacity = 0.92;
      ground.innerMat.opacity = 0.88;
      ground.discMat.opacity = 0.72;
      ground.windMat.opacity = 0.65;
      ground.group.visible = true;
    }

    this.activeArrowStorms.push({
      targetPos: targetPos.clone(),
      groundY,
      radius: 13.0,
      elapsed: 0,
      rainDuration: 2.6,
      spawnAccum: 0.07,
      tickAccum: 0,
      portalIdx,
      groundIdx,
      tombakIdx,
      flareIdx,
      spawnWaveIndex: 0,
      portalOpened: false,
      tombakLaunched: false,
      finisherImpacted: false,
      ambushMult,
    });
  }

  private spawnPooledRainArrow(centerX: number, centerZ: number, radius: number, spawnWaveIdx: number) {
    if (this.arrowRainPool.length === 0) return;
    let slot = this.arrowRainPool[this.arrowRainPoolCursor];
    for (let attempt = 0; attempt < this.arrowRainPool.length; attempt++) {
      const idx = (this.arrowRainPoolCursor + attempt) % this.arrowRainPool.length;
      const cand = this.arrowRainPool[idx];
      if (!cand.active || cand.phase === 'stuck') {
        slot = cand;
        this.arrowRainPoolCursor = (idx + 1) % this.arrowRainPool.length;
        break;
      }
    }
    if (slot === this.arrowRainPool[this.arrowRainPoolCursor]) {
      this.arrowRainPoolCursor = (this.arrowRainPoolCursor + 1) % this.arrowRainPool.length;
    }

    const r = Math.sqrt(Math.random()) * (radius * 0.96);
    const theta = Math.random() * Math.PI * 2;
    const hitX = centerX + Math.cos(theta) * r;
    const hitZ = centerZ + Math.sin(theta) * r;
    const hitGroundY = this.world.getTerrainHeight(hitX, hitZ);

    // Jatuh deras dari area portal langit menyebar ke titik acak radius 13
    const startX = centerX + (hitX - centerX) * 0.42 + (Math.random() - 0.5) * 3.2;
    const startZ = centerZ + (hitZ - centerZ) * 0.42 + (Math.random() - 0.5) * 3.2;
    const startY = hitGroundY + 29.0;

    const dir = this.arrowRainDirScratch
      .set(hitX - startX, hitGroundY - startY, hitZ - startZ)
      .normalize();
    const speed = 64.0;

    slot.active = true;
    slot.phase = 'falling';
    slot.vx = dir.x * speed;
    slot.vy = dir.y * speed;
    slot.vz = dir.z * speed;
    slot.groundY = hitGroundY;
    slot.stickElapsed = 0;

    slot.root.position.set(startX, startY, startZ);
    slot.root.quaternion.setFromUnitVectors(this.arrowRainUpAxisScratch, dir);
    slot.root.scale.set(1, 1, 1);
    slot.shaftMat.opacity = 1.0;
    slot.trailMat.opacity = 0.88;
    slot.trail.visible = true;
    slot.root.visible = true;
  }

  private spawnArrowRainImpact(x: number, groundY: number, z: number) {
    if (this.arrowRainImpactPool.length === 0) return;
    const slot = this.arrowRainImpactPool[this.arrowRainImpactCursor];
    this.arrowRainImpactCursor = (this.arrowRainImpactCursor + 1) % this.arrowRainImpactPool.length;

    slot.active = true;
    slot.elapsed = 0;
    slot.duration = 0.26;
    slot.ringMat.opacity = 0.9;
    slot.sparkMat.opacity = 0.95;
    slot.group.position.set(x, groundY + 0.12, z);
    slot.group.rotation.y = Math.random() * Math.PI * 2;
    slot.group.scale.set(0.35, 0.35, 0.35);
    slot.group.visible = true;
  }

  public updateArrowStormUltimate(delta: number) {
    if (delta <= 0) return;

    // 1. Update Aura Angin Kaki Karakter (Fase 1)
    for (let i = 0; i < this.stormCasterAuraPool.length; i++) {
      const aura = this.stormCasterAuraPool[i];
      if (!aura.active) continue;
      aura.elapsed += delta;
      if (aura.elapsed >= aura.duration) {
        aura.active = false;
        aura.mesh.visible = false;
        continue;
      }
      const t = aura.elapsed / aura.duration;
      const s = 0.4 + t * 2.1;
      aura.mesh.scale.set(s, s, s);
      aura.mesh.rotation.y += delta * 5.0;
      aura.mat.opacity = 0.92 * (1.0 - t);
    }

    // 2. Update Panah Suar Raksasa ke Langit (Y + 30)
    for (let i = 0; i < this.stormFlareArrowPool.length; i++) {
      const f = this.stormFlareArrowPool[i];
      if (!f.active) continue;
      f.elapsed += delta;
      if (f.elapsed >= f.duration) {
        f.active = false;
        f.root.visible = false;
        continue;
      }
      const t = f.elapsed / f.duration;
      f.root.position.y = f.startY + t * 30.0;
      f.trailMat.opacity = 0.95 * (1.0 - t * 0.45);
    }

    // 3. Update Seluruh Badai Panah Agung Aktif (maksimal 3 bersamaan)
    const RAIN_START = 0.30;
    const RAIN_END = 2.90; // 2.6 detik hujan penuh
    const TOMBAK_START = 2.82; // Fase 3: 0.4s terakhir
    const TOMBAK_IMPACT = 3.06;
    const TOTAL_END = 3.45;

    for (let i = this.activeArrowStorms.length - 1; i >= 0; i--) {
      const storm = this.activeArrowStorms[i];
      storm.elapsed += delta;

      const portal = this.stormSkyPortalPool[storm.portalIdx];
      const ground = this.stormGroundMagicCirclePool[storm.groundIdx];
      const tombak = this.stormTombakPool[storm.tombakIdx];

      // Buka portal langit saat panah suar mencapai puncak (~0.24s)
      if (!storm.portalOpened && storm.elapsed >= 0.22) {
        storm.portalOpened = true;
        if (portal) portal.group.visible = true;
      }

      if (portal && portal.active && storm.portalOpened) {
        portal.outerRing.rotation.y += delta * 2.2;
        portal.innerRing.rotation.y -= delta * 3.4;
        if (storm.elapsed < 0.55) {
          const openT = Math.min(1.0, (storm.elapsed - 0.22) / 0.33);
          portal.group.scale.setScalar(0.1 + openT * 0.9);
        } else if (storm.elapsed > 3.08) {
          const closeT = Math.max(0.01, 1.0 - (storm.elapsed - 3.08) / 0.37);
          portal.group.scale.setScalar(closeT);
          portal.outerMat.opacity = 0.9 * closeT;
          portal.innerMat.opacity = 0.85 * closeT;
          portal.coreMat.opacity = 0.78 * closeT;
        } else {
          portal.group.scale.setScalar(1.0);
        }
      }

      if (ground && ground.active) {
        ground.outerRing.rotation.y += delta * 1.4;
        ground.innerRing.rotation.y -= delta * 2.2;
        ground.discMesh.rotation.y += delta * 0.9;
        for (let w = 0; w < ground.windStreaks.length; w++) {
          const ws = ground.windStreaks[w];
          ws.position.y += delta * 8.5;
          if (ws.position.y > 5.8) ws.position.y = 0.6;
        }
        if (storm.elapsed < 0.45) {
          const gOpen = storm.elapsed / 0.45;
          ground.group.scale.setScalar(0.15 + gOpen * 0.85);
        } else if (storm.elapsed > 3.08) {
          const closeT = Math.max(0.01, 1.0 - (storm.elapsed - 3.08) / 0.37);
          ground.outerMat.opacity = 0.92 * closeT;
          ground.innerMat.opacity = 0.88 * closeT;
          ground.discMat.opacity = 0.72 * closeT;
          ground.windMat.opacity = 0.65 * closeT;
        } else {
          ground.group.scale.setScalar(1.0);
        }
      }

      // Fase 2: Hujan Panah Masif (2.6 detik penuh, 3-4 panah tiap 0.07s, damage tick tiap 0.35s + Slow 35%)
      if (storm.elapsed >= RAIN_START && storm.elapsed <= RAIN_END) {
        storm.spawnAccum += delta;
        while (storm.spawnAccum >= 0.07) {
          storm.spawnAccum -= 0.07;
          const count = storm.spawnWaveIndex % 2 === 0 ? 4 : 3;
          for (let b = 0; b < count; b++) {
            this.spawnPooledRainArrow(
              storm.targetPos.x,
              storm.targetPos.z,
              storm.radius,
              storm.spawnWaveIndex
            );
          }
          storm.spawnWaveIndex++;
          if (storm.spawnWaveIndex % 4 === 1) {
            soundManager.playBowShoot(false);
          }
        }

        storm.tickAccum += delta;
        if (storm.tickAccum >= 0.35) {
          storm.tickAccum -= 0.35;
          if (this.isRunning) {
            const stats = this.currentStats;
            const tierMult = 1 + (this.playerTier - 1) * 0.25;
            for (let e = 0; e < this.enemies.length; e++) {
              const enemy = this.enemies[e];
              if (enemy.data?.isDead) continue;
              const distXZ = Math.hypot(
                enemy.mesh.position.x - storm.targetPos.x,
                enemy.mesh.position.z - storm.targetPos.z
              );
              if (distXZ <= storm.radius) {
                const isCrit = storm.ambushMult > 1.0 || Math.random() < 0.25 + stats.agility * 0.02;
                const baseDmg = (stats.baseAttack + stats.agility * 2.4) * tierMult * 0.42 * storm.ambushMult;
                const finalDmg = Math.max(6, Math.round(isCrit ? baseDmg * 1.85 : baseDmg));
                this.damageEnemy(enemy, finalDmg, isCrit, 0.15);
                // Slow 35% selama musuh di dalam area badai
                enemy.slowFactor = 0.35;
                enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.65);
                enemy.armorBreakBonus = 0.18;
                enemy.armorBreakTimer = 2.0;
                this.spawnHitStarburst(
                  enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
                  0x38bdf8,
                  1.05
                );
              }
            }
          }
        }
      }

      // Fase 3: Hantaman Penutup "Tombak Rajawali" Raksasa (~3.5x panah biasa)
      if (storm.elapsed >= TOMBAK_START && tombak) {
        if (!storm.tombakLaunched) {
          storm.tombakLaunched = true;
          tombak.active = true;
          tombak.coreMat.opacity = 0.98;
          tombak.wingMat.opacity = 0.88;
          tombak.root.position.set(storm.targetPos.x, storm.groundY + 29.0, storm.targetPos.z);
          tombak.root.scale.set(1, 1, 1);
          tombak.root.visible = true;
        }

        if (storm.elapsed < TOMBAK_IMPACT) {
          const dropT = (storm.elapsed - TOMBAK_START) / (TOMBAK_IMPACT - TOMBAK_START);
          tombak.root.position.y = storm.groundY + 29.0 * (1.0 - dropT) + 2.0 * dropT;
        } else {
          tombak.root.position.y = storm.groundY + 2.0;
          if (!storm.finisherImpacted) {
            storm.finisherImpacted = true;
            soundManager.playMeteorImpact();
            this.triggerCameraShake(0.32);

            // Aktifkan ledakan cincin horizontal (radius 14) + pilar cahaya vertikal singkat (0.35s)
            let bIdx = 0;
            for (let b = 0; b < this.stormFinisherBlastPool.length; b++) {
              if (!this.stormFinisherBlastPool[b].active) {
                bIdx = b;
                break;
              }
            }
            const blast = this.stormFinisherBlastPool[bIdx];
            if (blast) {
              blast.active = true;
              blast.elapsed = 0;
              blast.duration = 0.35;
              blast.ringMat.opacity = 0.95;
              blast.pillarMat.opacity = 0.78;
              blast.group.position.set(storm.targetPos.x, storm.groundY + 0.2, storm.targetPos.z);
              blast.ringMesh.scale.set(1, 1, 1);
              blast.pillarMesh.scale.set(1.2, 1, 1.2);
              blast.group.visible = true;
            }

            // Finale Burst Damage ke semua musuh di dalam lingkaran Badai Panah Agung
            if (this.isRunning) {
              const stats = this.currentStats;
              const tierMult = 1 + (this.playerTier - 1) * 0.25;
              const centerTarget = new THREE.Vector3(
                storm.targetPos.x,
                storm.groundY + 0.5,
                storm.targetPos.z
              );
              this.spawnSparks(centerTarget, 0xfde047, 18, 6.5);
              this.spawnSparks(centerTarget, 0x38bdf8, 18, 6.0);

              for (let e = 0; e < this.enemies.length; e++) {
                const enemy = this.enemies[e];
                if (enemy.data?.isDead) continue;
                const distXZ = Math.hypot(
                  enemy.mesh.position.x - storm.targetPos.x,
                  enemy.mesh.position.z - storm.targetPos.z
                );
                if (distXZ <= storm.radius + 0.5) {
                  const isCrit = storm.ambushMult > 1.0 || Math.random() < 0.35 + stats.agility * 0.025;
                  const baseDmg = (stats.baseAttack + stats.agility * 2.8) * tierMult * 1.95 * storm.ambushMult;
                  const finalDmg = Math.max(18, Math.round(isCrit ? baseDmg * 1.9 : baseDmg));
                  const kb = enemy.data.type === 'boss' ? 0.2 : 1.1;
                  this.damageEnemy(enemy, finalDmg, isCrit, kb);
                  enemy.slowFactor = 0.35;
                  enemy.slowTimer = 2.0;
                  this.spawnHitStarburst(
                    enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                    0xfde047,
                    2.0
                  );
                }
              }
            }
          }

          const fadeT = Math.max(0, 1.0 - (storm.elapsed - TOMBAK_IMPACT) / (TOTAL_END - TOMBAK_IMPACT));
          tombak.coreMat.opacity = 0.98 * fadeT;
          tombak.wingMat.opacity = 0.88 * fadeT;
        }
      }

      if (storm.elapsed >= TOTAL_END) {
        this.releaseArrowStormSlots(storm);
        this.activeArrowStorms.splice(i, 1);
      }
    }

    // 4. Update Ledakan Cincin Horizontal (hingga Radius 14) & Pilar Cahaya Penutup (0.35s)
    for (let i = 0; i < this.stormFinisherBlastPool.length; i++) {
      const blast = this.stormFinisherBlastPool[i];
      if (!blast.active) continue;
      blast.elapsed += delta;
      if (blast.elapsed >= blast.duration) {
        blast.active = false;
        blast.group.visible = false;
        continue;
      }
      const t = blast.elapsed / blast.duration;
      const ringScale = 1.0 + t * (14.0 / 1.15);
      blast.ringMesh.scale.set(ringScale, 1, ringScale);
      blast.ringMat.opacity = 0.95 * (1.0 - t);

      const pillarScaleXZ = 1.2 - t * 0.65;
      blast.pillarMesh.scale.set(pillarScaleXZ, 1.0 + t * 0.35, pillarScaleXZ);
      blast.pillarMat.opacity = 0.78 * (1.0 - t);
    }

    // 5. Update seluruh 90 anak panah hujan di arrowRainPool (jatuh -> menancap 0.4s -> kembali ke pool)
    for (let i = 0; i < this.arrowRainPool.length; i++) {
      const arrow = this.arrowRainPool[i];
      if (!arrow.active) continue;

      if (arrow.phase === 'falling') {
        arrow.root.position.x += arrow.vx * delta;
        arrow.root.position.y += arrow.vy * delta;
        arrow.root.position.z += arrow.vz * delta;

        if (arrow.root.position.y <= arrow.groundY) {
          arrow.root.position.y = arrow.groundY + 0.52;
          arrow.phase = 'stuck';
          arrow.stickElapsed = 0;
          arrow.trail.visible = false;
          this.spawnArrowRainImpact(arrow.root.position.x, arrow.groundY, arrow.root.position.z);
        }
      } else {
        arrow.stickElapsed += delta;
        if (arrow.stickElapsed >= 0.40) {
          arrow.active = false;
          arrow.root.visible = false;
          arrow.shaftMat.opacity = 1.0;
          arrow.root.scale.set(1, 1, 1);
        } else if (arrow.stickElapsed > 0.26) {
          const fadeT = 1.0 - (arrow.stickElapsed - 0.26) / 0.14;
          arrow.shaftMat.opacity = Math.max(0.05, fadeT);
          arrow.root.scale.setScalar(Math.max(0.25, fadeT));
        }
      }
    }

    // 6. Update 36 cincin & percikan tumbukan panah
    for (let i = 0; i < this.arrowRainImpactPool.length; i++) {
      const imp = this.arrowRainImpactPool[i];
      if (!imp.active) continue;
      imp.elapsed += delta;
      if (imp.elapsed >= imp.duration) {
        imp.active = false;
        imp.group.visible = false;
        continue;
      }
      const t = imp.elapsed / imp.duration;
      const scale = 0.35 + t * 1.45;
      imp.group.scale.set(scale, scale, scale);
      imp.ringMat.opacity = 0.9 * (1.0 - t);
      imp.sparkMat.opacity = 0.95 * (1.0 - t);
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

    // Update active crescent slashes
    for (let i = 0; i < this.crescentSlashPool.length; i++) {
      const item = this.crescentSlashPool[i];
      if (!item.active) continue;
      item.elapsed += delta;
      if (item.elapsed >= item.duration) {
        item.active = false;
        item.group.visible = false;
        continue;
      }
      const progress = item.elapsed / item.duration;
      const lifeRatio = 1 - progress;
      const s = (0.75 + progress * 0.65) * item.baseRadius;
      item.group.scale.set(s, s, s);
      item.outerMat.opacity = lifeRatio * 0.92;
      item.innerMat.opacity = lifeRatio * 0.98;
      item.group.position.x += item.dirX * delta * 2.8;
      item.group.position.y += item.dirY * delta * 2.8;
      item.group.position.z += item.dirZ * delta * 2.8;
    }

    // Update active shadow step silhouettes
    for (let i = 0; i < this.shadowStepPool.length; i++) {
      const item = this.shadowStepPool[i];
      if (!item.active) continue;
      item.elapsed += delta;
      if (item.elapsed >= item.duration) {
        item.active = false;
        item.group.visible = false;
        continue;
      }
      const lifeRatio = 1 - item.elapsed / item.duration;
      item.mat.opacity = lifeRatio * 0.75;
      item.group.scale.multiplyScalar(1 + delta * 0.6);
    }

    // Update active smoke & shadow footstep puffs
    for (let i = 0; i < this.smokePuffPool.length; i++) {
      const item = this.smokePuffPool[i];
      if (!item.active) continue;
      item.elapsed += delta;
      if (item.elapsed >= item.duration) {
        item.active = false;
        item.mesh.visible = false;
        continue;
      }
      const lifeRatio = 1 - item.elapsed / item.duration;
      item.mesh.position.x += item.vx * delta;
      item.mesh.position.z += item.vz * delta;
      item.vx *= Math.max(0, 1 - 1.4 * delta);
      item.vz *= Math.max(0, 1 - 1.4 * delta);
      item.mesh.position.y += delta * item.riseSpeed;
      item.mesh.scale.multiplyScalar(1 + delta * item.growRate);
      item.mat.opacity = Math.pow(lifeRatio, 0.85) * item.baseOpacity;
    }

    // Update active 360 blade spins
    for (let i = 0; i < this.bladeSpin360Pool.length; i++) {
      const item = this.bladeSpin360Pool[i];
      if (!item.active) continue;
      item.elapsed += delta;
      if (item.elapsed >= item.duration) {
        item.active = false;
        item.group.visible = false;
        continue;
      }
      const progress = item.elapsed / item.duration;
      const lifeRatio = 1 - progress;
      const s = (0.6 + progress * 0.9) * item.baseRadius;
      item.group.scale.set(s, s, s);
      item.ringOuter.rotation.z += delta * 16;
      item.ringInner.rotation.z -= delta * 18;
      item.matOuter.opacity = lifeRatio * 0.9;
      item.matInner.opacity = lifeRatio * 0.95;
      item.spokeMat.opacity = lifeRatio * 0.85;
    }

    // Update active thin sprint wind streaks
    for (let i = 0; i < this.sprintWindStreakPool.length; i++) {
      const item = this.sprintWindStreakPool[i];
      if (!item.active) continue;
      item.elapsed += delta;
      if (item.elapsed >= item.duration) {
        item.active = false;
        item.mesh.visible = false;
        continue;
      }
      const lifeRatio = 1 - item.elapsed / item.duration;
      item.mesh.position.x += item.vx * delta;
      item.mesh.position.y += item.vy * delta;
      item.mesh.position.z += item.vz * delta;
      item.mesh.scale.z = 0.65 + lifeRatio * 0.65;
      item.mat.opacity = lifeRatio * item.baseOpacity;
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
    this.initArrowVolleyIndicator();
    SkywardArrowVolleyResourcePool.get().attachToScene(this.scene);

    const compileFrustum = async (label: string) => {
      try {
        if ('compileAsync' in this.renderer && typeof (this.renderer as any).compileAsync === 'function') {
          await (this.renderer as any).compileAsync(this.scene, this.camera);
        } else {
          this.renderer.compile(this.scene, this.camera);
        }
      } catch (e) {
        console.warn(`[Engine] ${label} warm-up compile warning:`, e);
      }
    };

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    if (this.hunterArrowPool.length > 0) {
      const sample = this.hunterArrowPool[0];
      const prevPos = sample.root.position.clone();
      const prevVis = sample.root.visible;
      const prevNV = sample.normalTrail.visible;
      const prevPV = sample.piercingTrail.visible;
      const prevVV = sample.piercingVortex.visible;

      // Tempatkan sampel panah di depan kamera untuk kompilasi shader GPU secara langsung
      sample.root.position.copy(this.camera.position).addScaledVector(fwd, 3.0);
      sample.root.visible = true;
      sample.normalTrail.visible = true;
      sample.piercingTrail.visible = true;
      sample.piercingVortex.visible = true;

      await compileFrustum('Hunter arrow shader');

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
      sampleDecoy.position.copy(this.camera.position).addScaledVector(fwd, 3.2);
      sampleDecoy.visible = true;
      await compileFrustum('Hunter shadow decoy shader');
      sampleDecoy.position.copy(prevPos);
      sampleDecoy.visible = prevVis;
      await cooperativeYield(4);
    }
    if (this.hunterAfterimagePool.length > 0) {
      const sampleAfterimage = this.hunterAfterimagePool[0];
      const prevPos = sampleAfterimage.group.position.clone();
      const prevVis = sampleAfterimage.group.visible;
      sampleAfterimage.group.position.copy(this.camera.position).addScaledVector(fwd, 2.8);
      sampleAfterimage.group.visible = true;
      for (const m of sampleAfterimage.materials) {
        m.opacity = 0.45;
      }
      await compileFrustum('Hunter afterimage shader');
      sampleAfterimage.group.position.copy(prevPos);
      sampleAfterimage.group.visible = prevVis;
      for (const m of sampleAfterimage.materials) {
        m.opacity = 0;
      }
      await cooperativeYield(4);
    }

    // Pre-warm Slash/Spin/ShadowStep/Smoke pools & ArrowVolley ground indicator in frustum
    const sampleCrescent = this.crescentSlashPool[0];
    const sampleSpin = this.bladeSpin360Pool[0];
    const sampleStep = this.shadowStepPool[0];
    const sampleSmoke = this.smokePuffPool[0];
    const sampleStreak = this.sprintWindStreakPool[0];
    if (sampleCrescent) {
      sampleCrescent.group.position.copy(this.camera.position).addScaledVector(fwd, 3.0);
      sampleCrescent.group.visible = true;
    }
    if (sampleSpin) {
      sampleSpin.group.position.copy(this.camera.position).addScaledVector(fwd, 3.5);
      sampleSpin.group.visible = true;
    }
    if (sampleStep) {
      sampleStep.group.position.copy(this.camera.position).addScaledVector(fwd, 3.5);
      sampleStep.group.visible = true;
    }
    if (sampleSmoke) {
      sampleSmoke.mesh.position.copy(this.camera.position).addScaledVector(fwd, 3.5);
      sampleSmoke.mesh.visible = true;
    }
    if (sampleStreak) {
      sampleStreak.mesh.position.copy(this.camera.position).addScaledVector(fwd, 3.5);
      sampleStreak.mesh.visible = true;
    }
    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.position.copy(this.camera.position).addScaledVector(fwd, 5.0);
      this.arrowVolleyIndicatorGroup.visible = true;
    }
    const sampleRainArrow = this.arrowRainPool[0];
    const sampleEagle = this.astralEaglePool[0];
    const sampleEagleRing = this.astralShockwavePool[0];
    const sampleFlare = this.stormFlareArrowPool[0];
    const samplePortal = this.stormSkyPortalPool[0];
    const sampleGround = this.stormGroundMagicCirclePool[0];
    const sampleTombak = this.stormTombakPool[0];
    const sampleBlast = this.stormFinisherBlastPool[0];
    const sampleRainImpact = this.arrowRainImpactPool[0];
    const sampleAura = this.stormCasterAuraPool[0];
    if (sampleRainArrow) {
      sampleRainArrow.root.position.copy(this.camera.position).addScaledVector(fwd, 5.0);
      sampleRainArrow.trail.visible = true;
      sampleRainArrow.root.visible = true;
    }
    if (sampleEagle) {
      sampleEagle.root.position.copy(this.camera.position).addScaledVector(fwd, 4.5);
      sampleEagle.root.visible = true;
    }
    if (sampleEagleRing) {
      sampleEagleRing.mesh.position.copy(this.camera.position).addScaledVector(fwd, 4.5);
      sampleEagleRing.mesh.visible = true;
    }
    if (sampleFlare) {
      sampleFlare.root.position.copy(this.camera.position).addScaledVector(fwd, 5.0);
      sampleFlare.root.visible = true;
    }
    if (samplePortal) {
      samplePortal.group.position.copy(this.camera.position).addScaledVector(fwd, 7.0);
      samplePortal.group.visible = true;
    }
    if (sampleGround) {
      sampleGround.group.position.copy(this.camera.position).addScaledVector(fwd, 7.0);
      sampleGround.group.visible = true;
    }
    if (sampleTombak) {
      sampleTombak.root.position.copy(this.camera.position).addScaledVector(fwd, 6.0);
      sampleTombak.root.visible = true;
    }
    if (sampleBlast) {
      sampleBlast.group.position.copy(this.camera.position).addScaledVector(fwd, 6.0);
      sampleBlast.group.visible = true;
    }
    if (sampleAura) {
      sampleAura.mesh.position.copy(this.camera.position).addScaledVector(fwd, 4.0);
      sampleAura.mesh.visible = true;
    }
    if (sampleRainImpact) {
      sampleRainImpact.group.position.copy(this.camera.position).addScaledVector(fwd, 4.5);
      sampleRainImpact.group.visible = true;
    }
    await compileFrustum('Assassin combat VFX pools');
    if (sampleCrescent) sampleCrescent.group.visible = false;
    if (sampleSpin) sampleSpin.group.visible = false;
    if (sampleStep) sampleStep.group.visible = false;
    if (sampleSmoke) sampleSmoke.mesh.visible = false;
    if (sampleStreak) sampleStreak.mesh.visible = false;
    if (sampleRainArrow) sampleRainArrow.root.visible = false;
    if (sampleEagle) sampleEagle.root.visible = false;
    if (sampleEagleRing) sampleEagleRing.mesh.visible = false;
    if (sampleFlare) sampleFlare.root.visible = false;
    if (samplePortal) samplePortal.group.visible = false;
    if (sampleGround) sampleGround.group.visible = false;
    if (sampleTombak) sampleTombak.root.visible = false;
    if (sampleBlast) sampleBlast.group.visible = false;
    if (sampleAura) sampleAura.mesh.visible = false;
    if (sampleRainImpact) sampleRainImpact.group.visible = false;
    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.position.set(0, 0, 0);
      this.arrowVolleyIndicatorGroup.visible = false;
    }
    await cooperativeYield(6);

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
    this.bowCombatStanceTimer = 0;
    this.callbacks.onBowAimChange?.(false, 0);

    if (this.playerMesh && this.charClass === 'rogue') {
      const bowArrow = this.playerMesh.group?.getObjectByName('BowArrow');
      if (bowArrow) {
        bowArrow.visible = false;
        bowArrow.position.set(0, 0, 0);
        bowArrow.rotation.set(0, 0, 0);
      }
      const vortex = this.playerMesh.group?.getObjectByName('ArrowVortex');
      if (vortex) vortex.visible = false;

      if (this.playerMesh.leftArm) {
        this.playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
        this.playerMesh.leftArm.rotation.set(0, 0, 0);
      }
      if (this.playerMesh.rightArm) {
        this.playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
        this.playerMesh.rightArm.rotation.set(0, 0, 0);
      }
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.head) this.playerMesh.head.rotation.set(0, 0, 0);

      this.syncHunterWeaponModel();
    }
  }

  public cancelBowAim() {
    this.resetHunterBowStance();
  }

  private getBowShotDirection(): THREE.Vector3 {
    const hasMobileAim =
      this.mobileAimNormalized.active &&
      (this.mobileAimActiveSlot === 'basic' || this.mobileAimActiveSlot === 'skill1');
    let baseDir: THREE.Vector3;
    let horizFwd: THREE.Vector3;

    if (hasMobileAim) {
      const aim = this.computeMobileWorldAim(32, 18);
      horizFwd = new THREE.Vector3(aim.dirX, 0, aim.dirZ).normalize();
      baseDir = new THREE.Vector3(aim.dirX, -0.02, aim.dirZ).normalize();
    } else {
      const camFwdX = -Math.sin(this.cameraAngleH);
      const camFwdZ = -Math.cos(this.cameraAngleH);
      const camFwdY = -Math.sin(this.cameraAngleV);
      const camDirXZ = Math.cos(this.cameraAngleV);
      baseDir = new THREE.Vector3(camFwdX * camDirXZ, camFwdY, camFwdZ * camDirXZ).normalize();
      horizFwd = new THREE.Vector3(camFwdX, 0, camFwdZ).normalize();
    }

    // Auto-assist mild frontal cone targeting toward nearest living enemy in front (<= 26u)
    let bestEnemy: (typeof this.enemies)[0] | null = null;
    let bestScore = -1;
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.data?.isDead) continue;
      this._scratchToEnemy.subVectors(enemy.mesh.position, this.playerPos);
      const flatDist = Math.hypot(this._scratchToEnemy.x, this._scratchToEnemy.z);
      if (flatDist < 0.8 || flatDist > 26.0) continue;
      const flatDirX = this._scratchToEnemy.x / flatDist;
      const flatDirZ = this._scratchToEnemy.z / flatDist;
      const dot = horizFwd.x * flatDirX + horizFwd.z * flatDirZ;
      const minConeDot = hasMobileAim ? 0.97 : 0.72; // Strict aim corridor (~14 deg) during manual thumb drag vs wide cone on quick-tap
      if (dot < minConeDot) continue;
      const score = dot * 2.0 - flatDist * 0.02;
      if (score > bestScore) {
        bestScore = score;
        bestEnemy = enemy;
      }
    }

    if (bestEnemy) {
      const targetAim = new THREE.Vector3(
        bestEnemy.mesh.position.x - this.playerPos.x,
        (bestEnemy.mesh.position.y + 1.15) - (this.playerPos.y + 1.4),
        bestEnemy.mesh.position.z - this.playerPos.z
      );
      if (targetAim.lengthSq() > 0.01) {
        return targetAim.normalize();
      }
    }
    return baseDir;
  }

  public fireQuickBowArrow() {
    const aimDir = this.getBowShotDirection();

    this.isHoldingBowAttack = false;
    this.isAimingBow = false;
    this.bowChargeRatio = 0;
    this.callbacks.onBowAimChange?.(false, 0);

    // Putarkan karakter ke arah target, aktifkan busur di tangan, & tahan pose follow-through 0.45 detik
    this.ensureWeaponDrawn();
    this.playerRotationY = Math.atan2(aimDir.x, aimDir.z);
    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }
    this.playerMesh?.setHunterBowInHand?.(true);
    this.bowCombatStanceTimer = 0.45;
    this.bowShotCooldownTimer = 0;
    this.isAttacking = true;
    this.attackType = 'bow_shot';
    this.attackDuration = 0.22;
    this.attackTimer = 0.22;

    if (this.playerMesh) {
      animateHunterBowAim(this.playerMesh, 0.35, this.isMoving, this.walkCycle, 0, false);
    }

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

    const isAmbush = this.consumeStealthForAmbush();
    soundManager.playBowShoot(false);
    this.spawnHunterArrow(aimDir, false, isAmbush ? 1.5 : 1.0, undefined, false, 32.0, false, false, isAmbush);
  }

  public fireChargedBowArrow(chargeRatio: number) {
    const aimDir = this.getBowShotDirection();
    const isFullCharge = chargeRatio >= 0.85;
    const speed = THREE.MathUtils.lerp(34, 56, chargeRatio);
    const dmgMultiplier = THREE.MathUtils.lerp(1.2, 2.2, chargeRatio);

    this.isHoldingBowAttack = false;
    this.isAimingBow = false;
    this.bowChargeRatio = 0;
    this.callbacks.onBowAimChange?.(false, 0);

    this.ensureWeaponDrawn();
    this.playerRotationY = Math.atan2(aimDir.x, aimDir.z);
    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }
    this.playerMesh?.setHunterBowInHand?.(true);
    this.bowCombatStanceTimer = 0.45;
    this.bowShotCooldownTimer = 0;
    this.isAttacking = true;
    this.attackType = 'bow_shot';
    this.attackDuration = 0.22;
    this.attackTimer = 0.22;

    if (this.playerMesh) {
      animateHunterBowAim(this.playerMesh, Math.max(0.45, chargeRatio), this.isMoving, this.walkCycle, 0, false);
    }

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

    const isAmbush = this.consumeStealthForAmbush();
    soundManager.playBowShoot(isFullCharge);
    this.spawnHunterArrow(aimDir, isFullCharge, dmgMultiplier * (isAmbush ? 1.5 : 1.0), undefined, false, speed, isFullCharge, false, isAmbush);

    if (isFullCharge) {
      this.callbacks.onAddFloatingText?.('🏹 PENETRATING WIND-PIERCER!', '#fef08a', 'crit');
      this.triggerCameraShake(0.18);
    }
  }

  // Visual layered crescent slash wave (pooled zero-allocation ribbon + incandescent core)
  private spawnCrescentSlash(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    tiltZ: number,
    color: number,
    radius = 1.4,
    _arcAngle = Math.PI * 0.82
  ) {
    if (this.crescentSlashPool.length === 0) return;
    const item = this.crescentSlashPool[this.crescentSlashNextIndex];
    this.crescentSlashNextIndex = (this.crescentSlashNextIndex + 1) % this.crescentSlashPool.length;

    item.group.position.copy(position);
    item.group.rotation.set(0, Math.atan2(direction.x, direction.z), tiltZ);
    item.baseRadius = radius;
    item.group.scale.set(0.75 * radius, 0.75 * radius, 0.75 * radius);
    item.outerMat.color.setHex(color);
    item.outerMat.opacity = 0.92;
    item.innerMat.opacity = 0.98;
    item.dirX = direction.x;
    item.dirY = direction.y;
    item.dirZ = direction.z;
    item.elapsed = 0;
    item.duration = 0.22;
    item.active = true;
    item.group.visible = true;
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
    const solidGroundY = getSolidGroundHeight(position.x, position.z, position.y);
    item.mesh.position.set(position.x, Math.max(position.y, solidGroundY) + 0.08, position.z);
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
      if (this.smokePuffPool.length === 0) return;
      const item = this.smokePuffPool[this.smokePuffNextIndex];
      this.smokePuffNextIndex = (this.smokePuffNextIndex + 1) % this.smokePuffPool.length;
      const backX = -Math.sin(this.playerRotationY);
      const backZ = -Math.cos(this.playerRotationY);
      item.mesh.position.set(footPos.x + backX * 0.36, footPos.y + 0.04, footPos.z + backZ * 0.36);
      item.mesh.scale.set(0.11, 0.09, 0.11);
      item.mat.color.setHex(Math.random() > 0.5 ? 0x1e293b : 0x334155);
      item.baseOpacity = 0.28;
      item.mat.opacity = 0.28;
      item.riseSpeed = 0.35;
      item.growRate = 0.8;
      item.vx = 0;
      item.vz = 0;
      item.elapsed = 0;
      item.duration = 0.25;
      item.active = true;
      item.mesh.visible = true;
    }
  }

  // Sleek thin wind streaks ONLY behind shoulders, back, and heels along -velocity
  private spawnSprintWindStreaks() {
    if (this.sprintWindStreakPool.length === 0) return;
    const speedLen = Math.hypot(this.playerVel.x, this.playerVel.z);
    let fwdX = Math.sin(this.playerRotationY);
    let fwdZ = Math.cos(this.playerRotationY);
    if (speedLen > 0.25) {
      fwdX = this.playerVel.x / speedLen;
      fwdZ = this.playerVel.z / speedLen;
    }
    const backX = -fwdX;
    const backZ = -fwdZ;
    const rightX = -backZ;
    const rightZ = backX;
    const yaw = Math.atan2(fwdX, fwdZ);

    // Spawn 2 streaks per pulse: 1 behind shoulders/back, 1 near heels/feet (never obscuring torso/head!)
    for (let s = 0; s < 2; s++) {
      const item = this.sprintWindStreakPool[this.sprintWindStreakNextIndex];
      this.sprintWindStreakNextIndex = (this.sprintWindStreakNextIndex + 1) % this.sprintWindStreakPool.length;

      const isUpper = s === 0;
      const backOffset = isUpper ? 0.62 + Math.random() * 0.32 : 0.48 + Math.random() * 0.28;
      const sideSign = Math.random() > 0.5 ? 1 : -1;
      const sideOffset = sideSign * (isUpper ? 0.26 + Math.random() * 0.22 : 0.16 + Math.random() * 0.16);
      const heightY = isUpper ? 1.05 + Math.random() * 0.32 : 0.10 + Math.random() * 0.16;

      item.mesh.position.set(
        this.playerPos.x + backX * backOffset + rightX * sideOffset,
        this.playerPos.y + heightY,
        this.playerPos.z + backZ * backOffset + rightZ * sideOffset
      );
      item.mesh.rotation.set(0, yaw, 0);
      item.mesh.scale.set(1, 1, 0.8 + Math.random() * 0.6);
      item.baseOpacity = 0.26 + Math.random() * 0.12;
      item.mat.opacity = item.baseOpacity;
      item.mat.color.setHex(isUpper ? 0xa5f3fc : 0xcbd5e1);
      const trailSpeed = 3.2 + Math.random() * 1.6;
      item.vx = backX * trailSpeed;
      item.vy = isUpper ? (Math.random() - 0.5) * 0.2 : 0.18;
      item.vz = backZ * trailSpeed;
      item.elapsed = 0;
      item.duration = 0.18 + Math.random() * 0.08;
      item.active = true;
      item.mesh.visible = true;
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
          if (this.isPointHittingEnemy(crescentGroup.position, enemy, radius + 0.6)) {
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
            const isBoss = enemy.data.type === 'boss' || enemy.data.id.includes('boss');
            const hitRadius = isBoss ? 4.8 : 2.2;

            if (this.isPointHittingEnemy(this._scratchClosestPoint, enemy, hitRadius)) {
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
  private startCelestialApocalypseCasting(overrideTargetPos?: THREE.Vector3) {
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

    // Calculate target impact area (Mobile drag target or 18 units ahead: radius 14.5 on solid walkable surface)
    let targetPos: THREE.Vector3;
    if (overrideTargetPos) {
      targetPos = overrideTargetPos.clone();
      const solidY = getSolidGroundHeight(targetPos.x, targetPos.z, this.playerPos.y);
      targetPos.y = isNaN(solidY) ? this.playerPos.y : solidY;
    } else {
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
      targetPos = this.playerPos.clone().add(fwd.clone().multiplyScalar(18.0));
      const solidY = getSolidGroundHeight(targetPos.x, targetPos.z, this.playerPos.y);
      targetPos.y = isNaN(solidY) ? this.playerPos.y : solidY;
    }

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
  public startStarfallCasting(overrideTargetPos?: THREE.Vector3) {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass !== 'mage') return;

    const cdCheck = this.skillCooldownsManager.canUse('mage_f', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Celestial Apocalypse Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#a855f7',
        'info'
      );
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      if (!this.devSettings.infiniteEnergy && stats.mp < 45) {
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 45 MP)!', '#e57373', 'info');
        return stats;
      }

      this.skillCooldownsManager.consume('mage_f', this.isZeroCd());
      this.mageUltimateCooldownTimer = this.isZeroCd() ? 0 : SKILL_COOLDOWNS.CELESTIAL_APOCALYPSE;
      this.startCelestialApocalypseCasting(overrideTargetPos);
      if (this.devSettings.infiniteEnergy) return stats;
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
    if (this.isAimGlacialActive && this.activeGlacialVfx) return;

    const cdCheck = this.skillCooldownsManager.canUse('mage_q', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Glacial Barrage Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#94a3b8',
        'info'
      );
      return;
    }

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 18) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 18 MP)!', '#ef4444', 'info');
      return;
    }

    this.glacialAimState.isCharging = true;
    this.glacialAimState.cancelled = false;
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

    // Hitung aimTargetPoint awal segera agar valid bahkan sebelum render frame pertama (krusial untuk Tap Cepat)
    this.updateGlacialAimFrame(0);

    // Bersihkan instance lama jika ada
    if (this.activeGlacialVfx) {
      this.activeGlacialVfx.cleanup();
      this.activeGlacialVfx = null;
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
    if (!this.isAimGlacialActive && !this.glacialAimState.isCharging) return;
    this.cameraAngleH = normalizeCameraYaw(this.cameraAngleH - deltaX * 0.015);
    this.cameraAngleV = THREE.MathUtils.clamp(this.cameraAngleV + deltaY * 0.015, -0.45, 0.65);
  }

  public executeGlacialBarrage = () => {
    this.executeGlacialCrystalBarrage();
  };

  public executeGlacialCrystalBarrage() {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'mage') return;
    if (this.glacialAimState.cancelled) {
      this.cancelGlacialAim();
      return;
    }

    const cdCheck = this.skillCooldownsManager.canUse('mage_q', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Glacial Barrage Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#94a3b8',
        'info'
      );
      this.cancelGlacialAim();
      return;
    }

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 18) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 18 MP)!', '#ef4444', 'info');
      this.cancelGlacialAim();
      return;
    }

    if (!this.devSettings.infiniteEnergy) {
      this.currentStats.mp = Math.max(0, this.currentStats.mp - 18);
      this.callbacks.onUpdateStats((stats) => ({
        ...stats,
        mp: Math.max(0, stats.mp - 18),
      }));
    }

    this.skillCooldownsManager.consume('mage_q', this.isZeroCd());
    this.mageGlacialBarrageCooldownTimer = this.isZeroCd() ? 0 : SKILL_COOLDOWNS.GLACIAL_BARRAGE;
    this.glacialAimState.isCharging = false;

    // Pastikan aimTargetPoint valid sebelum penembakan
    if (this.aimTargetPoint.lengthSq() < 0.1) {
      const aimDir = new THREE.Vector3();
      this.camera.getWorldDirection(aimDir);
      this.aimTargetPoint.copy(this.camera.position).addScaledVector(aimDir, 28.0);
    }

    if (this.activeGlacialVfx) {
      this.fireAimGlacialBarrage();
    } else {
      this.castGlacialCrystalBarrage();
    }
  }

  public releaseGlacialBarrage = () => {
    this.executeGlacialBarrage();
  };

  public releaseAimGlacialBarrage(isCancelled = false) {
    if (this.glacialAimTimer) {
      clearTimeout(this.glacialAimTimer);
      this.glacialAimTimer = null;
    }
    this.isHoldingGlacialKey = false;

    if (isCancelled) {
      this.cancelAimGlacialBarrage();
      return;
    }

    this.executeGlacialBarrage();
  }

  private fireAimGlacialBarrage() {
    if (this.glacialAimTimer) {
      clearTimeout(this.glacialAimTimer);
      this.glacialAimTimer = null;
    }
    this.isHoldingGlacialKey = false;
    this.glacialAimState.isCharging = false;

    this.callbacks.onAddFloatingText('💠 GLACIAL CRYSTAL BARRAGE!', '#38bdf8', 'crit');

    // Sembunyikan garis bidik & reticle
    if (this.aimIndicatorGroup) {
      this.aimIndicatorGroup.visible = false;
    }

    // Pastikan aimTargetPoint valid sebelum penembakan
    if (this.aimTargetPoint.lengthSq() < 0.1) {
      const aimDir = new THREE.Vector3();
      this.camera.getWorldDirection(aimDir);
      this.aimTargetPoint.copy(this.camera.position).addScaledVector(aimDir, 28.0);
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
    this.glacialAimState.isCharging = false;
    this.glacialAimState.cancelled = true;

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
    this.executeGlacialBarrage();
  };

  public cancelGlacialAim = () => {
    this.cancelAimGlacialBarrage();
  };

  public quickCastGlacialBarrage() {
    this.executeGlacialBarrage();
  }

  public updateGlacialAimFrame(delta: number = 0) {
    if (!this.isAimGlacialActive && !this.glacialAimState.isCharging) return;

    const isMobileDragAim =
      this.mobileAimActiveSlot === 'skill1' && this.mobileAimNormalized.active;
    let aimDir: THREE.Vector3;

    if (isMobileDragAim) {
      const mAim = this.computeMobileWorldAim(32.0, 18.0);
      this.playerRotationY = Math.atan2(mAim.dirX, mAim.dirZ);
      this.aimTargetPoint.set(mAim.targetX, mAim.targetY, mAim.targetZ);
      aimDir = new THREE.Vector3(mAim.dirX, 0, mAim.dirZ).normalize();
    } else {
      const camFwdX = -Math.sin(this.cameraAngleH);
      const camFwdZ = -Math.cos(this.cameraAngleH);
      this.playerRotationY = Math.atan2(camFwdX, camFwdZ);

      aimDir = new THREE.Vector3();
      this.camera.getWorldDirection(aimDir);

      let foundGround = false;
      for (let d = 2.0; d <= 42.0; d += 0.8) {
        const rayPos = this.camera.position.clone().addScaledVector(aimDir, d);
        const gy = getSolidGroundHeight(rayPos.x, rayPos.z, this.playerPos.y);
        if (rayPos.y <= gy + 0.35) {
          this.aimTargetPoint.set(rayPos.x, gy, rayPos.z);
          foundGround = true;
          break;
        }
      }
      if (!foundGround) {
        this.aimTargetPoint.copy(this.camera.position).addScaledVector(aimDir, 30.0);
        const gy = getSolidGroundHeight(this.aimTargetPoint.x, this.aimTargetPoint.z, this.playerPos.y);
        this.aimTargetPoint.y = Math.max(this.aimTargetPoint.y, gy);
      }
    }

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

    // Soft-lock terdekat di jalur bidik
    let bestEnemy: (typeof this.enemies)[0] | null = null;
    let bestDot = isMobileDragAim ? 0.82 : 0.70;
    const originPos = isMobileDragAim ? this.playerPos : this.camera.position;
    for (let e = 0; e < this.enemies.length; e++) {
      const enemy = this.enemies[e];
      if (enemy.data?.isDead) continue;
      const toE = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(originPos);
      if (isMobileDragAim) toE.y = 0;
      const dist = toE.length();
      if (dist > 34.0) continue;
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
      const groundY = getSolidGroundHeight(this.aimTargetPoint.x, this.aimTargetPoint.z, this.playerPos.y);
      const ringY = groundY + 0.08;
      const time = this.clock.getElapsedTime();
      const pulse = 1.0 + Math.sin(time * 6.0) * 0.06;
      const cancelRed = this.mobileAimOverCancel;

      if (this.aimIndicatorGroundRing) {
        this.aimIndicatorGroundRing.position.set(this.aimTargetPoint.x, ringY, this.aimTargetPoint.z);
        this.aimIndicatorGroundRing.rotation.z = time * 0.8;
        this.aimIndicatorGroundRing.scale.set(pulse, pulse, pulse);
        const ringMat = this.aimIndicatorGroundRing.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(cancelRed ? 0xef4444 : isLocked ? 0xfbbf24 : 0x38bdf8);
        ringMat.opacity = cancelRed ? 0.55 : 0.85;
      }

      if (this.aimIndicatorInnerRing) {
        this.aimIndicatorInnerRing.position.set(this.aimTargetPoint.x, ringY + 0.01, this.aimTargetPoint.z);
        this.aimIndicatorInnerRing.rotation.z = -time * 1.2;
        this.aimIndicatorInnerRing.scale.set(pulse, pulse, pulse);
        const innerMat = this.aimIndicatorInnerRing.material as THREE.MeshBasicMaterial;
        innerMat.color.setHex(cancelRed ? 0xf87171 : isLocked ? 0xfde047 : 0xbae6fd);
        innerMat.opacity = cancelRed ? 0.45 : 0.65;
      }

      // Curved Trajectory Line from crystals above Mage shoulders down to target point
      if (this.aimTrajectoryLine) {
        const lineMat = this.aimTrajectoryLine.material as THREE.LineBasicMaterial;
        lineMat.color.setHex(cancelRed ? 0xef4444 : isLocked ? 0xfbbf24 : 0x7dd3fc);

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

    // 1. Wind compass magic circle plane with procedural texture (Radius: 13.0 units, Width/Height: 26)
    const circleGeom = new THREE.PlaneGeometry(26, 26);
    circleGeom.rotateX(-Math.PI / 2);
    const circleTex = getGaleMagicCircleTexture();
    const circleMat = new THREE.MeshBasicMaterial({
      map: circleTex,
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.arrowVolleyGroundDecal = new THREE.Mesh(circleGeom, circleMat);
    this.arrowVolleyDecalSubgroup.add(this.arrowVolleyGroundDecal);

    // 2. Outer glowing perimeter ring (Radius: 12.6 to 13.0 units)
    const outerRingGeom = new THREE.RingGeometry(12.6, 13.0, 64);
    outerRingGeom.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
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

  // ============================================================================
  // HUNTER BOW SKILL 1 [Q]: PANAH RAJAWALI ASTRAL (0 CD, 20 MP, Tap vs Hold Charge)
  // ============================================================================
  public clearActiveBowSkillPools() {
    for (let i = 0; i < this.astralEaglePool.length; i++) {
      this.astralEaglePool[i].active = false;
      this.astralEaglePool[i].root.visible = false;
    }
    for (let i = 0; i < this.astralShockwavePool.length; i++) {
      this.astralShockwavePool[i].active = false;
      this.astralShockwavePool[i].mesh.visible = false;
    }
    for (let i = 0; i < this.activeArrowStorms.length; i++) {
      this.releaseArrowStormSlots(this.activeArrowStorms[i]);
    }
    this.activeArrowStorms = [];
    for (let i = 0; i < this.arrowRainPool.length; i++) {
      this.arrowRainPool[i].active = false;
      this.arrowRainPool[i].root.visible = false;
    }
    for (let i = 0; i < this.arrowRainImpactPool.length; i++) {
      this.arrowRainImpactPool[i].active = false;
      this.arrowRainImpactPool[i].group.visible = false;
    }
    for (let i = 0; i < this.stormCasterAuraPool.length; i++) {
      this.stormCasterAuraPool[i].active = false;
      this.stormCasterAuraPool[i].mesh.visible = false;
    }
    for (let i = 0; i < this.stormFlareArrowPool.length; i++) {
      this.stormFlareArrowPool[i].active = false;
      this.stormFlareArrowPool[i].root.visible = false;
    }
    for (let i = 0; i < this.stormFinisherBlastPool.length; i++) {
      this.stormFinisherBlastPool[i].active = false;
      this.stormFinisherBlastPool[i].group.visible = false;
    }
  }

  public startAimAstralEagle() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass !== 'rogue' || this.hunterWeaponMode !== 'bow') return;

    const cdCheck = this.skillCooldownsManager.canUse('rogue_bow_q', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Panah Rajawali Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#38bdf8',
        'info'
      );
      this.astralEagleAimState.isCharging = false;
      return;
    }

    this.unsheatheHunterWeapon();

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 20) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 20 MP)!', '#ef4444', 'info');
      this.astralEagleAimState.isCharging = false;
      return;
    }

    this.astralEagleAimState = {
      isCharging: true,
      pressStartTime: performance.now(),
      cancelled: false,
    };
    this.astralEagleChargeRatio = 0;
    this.bowCombatStanceTimer = Math.max(this.bowCombatStanceTimer, 0.35);
    this.playerMesh?.setHunterBowInHand?.(true);
    soundManager.playBowDraw();
  }

  public updateAstralEagleChargeFrame(delta: number) {
    if (!this.astralEagleAimState.isCharging || this.astralEagleAimState.cancelled) return;
    if (this.mobileAimActiveSlot === 'skill1' && this.mobileAimNormalized.active) {
      this.updateMobileBowAimFrame(36.0, 0x38bdf8);
    }
    const holdMs = performance.now() - this.astralEagleAimState.pressStartTime;
    if (holdMs >= 220) {
      this.isChargingAstralEagle = true;
      this.astralEagleChargeRatio = Math.min(1.0, (holdMs - 220) / 780);
      this.callbacks.onBowAimChange?.(true, Math.max(0.15, this.astralEagleChargeRatio));
      if (this.playerMesh) {
        animateHunterBowAim(
          this.playerMesh,
          this.astralEagleChargeRatio,
          this.isMoving,
          this.walkCycle,
          delta,
          true,
          true
        );
      }
    }
  }

  public cancelAstralEagleAim(showToast = true) {
    this.astralEagleAimState = {
      isCharging: false,
      pressStartTime: 0,
      cancelled: true,
    };
    const wasCharging = this.isChargingAstralEagle;
    this.isChargingAstralEagle = false;
    this.astralEagleChargeRatio = 0;
    this.callbacks.onBowAimChange?.(false, 0);

    if (wasCharging && this.playerMesh) {
      this.playerMesh.body?.rotation.set(0, 0, 0);
      this.playerMesh.head?.rotation.set(0, 0, 0);
      this.playerMesh.leftArm?.position.set(-0.325, 1.42, 0.02);
      this.playerMesh.rightArm?.position.set(0.325, 1.42, 0.02);
      this.playerMesh.leftArm?.rotation.set(0, 0, 0);
      this.playerMesh.rightArm?.rotation.set(0, 0, 0);
      this.syncHunterWeaponModel();
    }

    if (showToast && wasCharging) {
      this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
    }
  }

  public releaseAimAstralEagle(isCancelled = false) {
    if (!this.astralEagleAimState.isCharging && !this.isChargingAstralEagle) return;

    if (isCancelled) {
      this.cancelAstralEagleAim(true);
      return;
    }

    const holdMs =
      this.astralEagleAimState.pressStartTime > 0
        ? performance.now() - this.astralEagleAimState.pressStartTime
        : 0;
    this.astralEagleAimState.isCharging = false;
    this.isChargingAstralEagle = false;
    this.astralEagleChargeRatio = 0;
    this.callbacks.onBowAimChange?.(false, 0);

    const cdCheck = this.skillCooldownsManager.canUse('rogue_bow_q', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Panah Rajawali Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#38bdf8',
        'info'
      );
      this.syncHunterWeaponModel();
      return;
    }

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 20) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 20 MP)!', '#ef4444', 'info');
      this.syncHunterWeaponModel();
      return;
    }

    if (!this.devSettings.infiniteEnergy) {
      this.currentStats.mp = Math.max(0, this.currentStats.mp - 20);
      this.callbacks.onUpdateStats((stats) => ({
        ...stats,
        mp: Math.max(0, stats.mp - 20),
      }));
    }
    this.skillCooldownsManager.consume('rogue_bow_q', this.isZeroCd());

    this.ensureWeaponDrawn();
    this.playerMesh?.setHunterBowInHand?.(true);

    const isCharged = holdMs >= 220;
    const ratio = isCharged ? Math.min(1.0, (holdMs - 220) / 780) : 0;
    const aimDir = this.getBowShotDirection();
    this.playerRotationY = Math.atan2(aimDir.x, aimDir.z);
    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }

    this.bowCombatStanceTimer = 0.45;
    this.isAttacking = true;
    this.attackType = 'bow_shot';
    this.attackDuration = 0.24;
    this.attackTimer = 0.24;

    if (this.playerMesh) {
      animateHunterBowAim(this.playerMesh, isCharged ? Math.max(0.5, ratio) : 0.35, this.isMoving, this.walkCycle, 0, false);
    }

    const speed = isCharged ? THREE.MathUtils.lerp(58.0, 68.0, ratio) : 56.0;
    const range = isCharged ? THREE.MathUtils.lerp(34.0, 40.0, ratio) : 30.0;
    const dmgMultiplier = isCharged ? THREE.MathUtils.lerp(1.5, 1.8, ratio) : 1.5;
    const knockback = isCharged ? THREE.MathUtils.lerp(0.65, 1.25, ratio) : 0.4;

    if (isCharged && ratio >= 0.85) {
      this.callbacks.onAddFloatingText('🦅 PANAH RAJAWALI ASTRAL PENUH!', '#a5f3fc', 'crit');
      this.triggerCameraShake(0.2);
    } else {
      this.callbacks.onAddFloatingText('🦅 PANAH RAJAWALI!', '#38bdf8', 'crit');
    }

    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalPlayerAttack?.({
        attackType: 'skill_1_astral_eagle',
        skillSlot: 1,
        charClass: this.charClass,
        hunterWeaponMode: this.hunterWeaponMode,
        x: Math.round(aimDir.x * 100) / 100,
        y: Math.round(aimDir.y * 100) / 100,
        z: Math.round(aimDir.z * 100) / 100,
        rotationY: Math.round(this.playerRotationY * 100) / 100,
      });
    }

    const isAmbush = this.consumeStealthForAmbush();
    soundManager.playBowShoot(isCharged);
    this.spawnAstralEagleProjectile(
      aimDir,
      speed,
      range,
      dmgMultiplier * (isAmbush ? 1.5 : 1.0),
      knockback,
      isAmbush
    );
  }

  public quickCastAstralEagle() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass !== 'rogue' || this.hunterWeaponMode !== 'bow') return;

    const cdCheck = this.skillCooldownsManager.canUse('rogue_bow_q', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Panah Rajawali Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#38bdf8',
        'info'
      );
      return;
    }

    this.unsheatheHunterWeapon();
    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 20) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 20 MP)!', '#ef4444', 'info');
      return;
    }

    this.astralEagleAimState = {
      isCharging: true,
      pressStartTime: performance.now(),
      cancelled: false,
    };
    this.releaseAimAstralEagle(false);
  }

  // ============================================================================
  // HUNTER BOW ULTIMATE [F]: BADAI PANAH AGUNG (0 CD, 45 MP, Tap vs Hold AoE Radius 13)
  // ============================================================================
  public startAimArrowVolley() {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'rogue' || this.hunterWeaponMode !== 'bow') return;
    if (this.isAimingArrowVolley) return;
    const cdCheck = this.skillCooldownsManager.canUse('rogue_bow_f', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Badai Panah Agung Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#fde047',
        'info'
      );
      this.arrowVolleyAimState.isCharging = false;
      return;
    }
    this.unsheatheHunterWeapon();

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 45) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 45 MP)!', '#ef4444', 'info');
      this.arrowVolleyAimState.isCharging = false;
      return;
    }

    if (!this.arrowVolleyAimState.isCharging) {
      this.arrowVolleyAimState = {
        isCharging: true,
        pressStartTime: performance.now(),
        cancelled: false,
      };
    }

    this.isAimingArrowVolley = true;
    this.bowCombatStanceTimer = Math.max(this.bowCombatStanceTimer, 0.35);
    this.playerMesh?.setHunterBowInHand?.(true);

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

    // Hunter Combat Aiming Pose: Busur terangkat di tangan membidik Badai Panah Agung
    this.isAttacking = true;
    this.attackType = 'hunter_aim_volley';
    this.attackTimer = 999;
    if (this.playerMesh) {
      animateHunterBowAim(this.playerMesh, 0.65, this.isMoving, this.walkCycle, 0, true);
    }

    soundManager.playBowDraw();

    this.initArrowVolleyIndicator();
    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.visible = true;
    }
    this.updateAimArrowVolleyFrame(0);

    this.callbacks.onArrowVolleyAimChange?.(true);
  }

  public updateAimArrowVolley(deltaX: number, deltaY: number) {
    if (!this.isAimingArrowVolley) return;
    this.cameraAngleH = normalizeCameraYaw(this.cameraAngleH - deltaX * 0.015);
    this.cameraAngleV = clampCameraPitch(this.cameraAngleV + deltaY * 0.015);
  }

  public updateAimArrowVolleyFrame(delta: number) {
    if (!this.isAimingArrowVolley) return;

    const isMobileDragAim =
      this.mobileAimActiveSlot === 'ult' && this.mobileAimNormalized.active;

    if (isMobileDragAim) {
      const mAim = this.computeMobileWorldAim(30.0, 14.0);
      this.playerRotationY = Math.atan2(mAim.dirX, mAim.dirZ);
      this.arrowVolleyTargetPoint.set(mAim.targetX, mAim.targetY + 0.08, mAim.targetZ);
    } else {
      const camFwdX = -Math.sin(this.cameraAngleH);
      const camFwdZ = -Math.cos(this.cameraAngleH);
      this.playerRotationY = Math.atan2(camFwdX, camFwdZ);

      const camFwdY = -Math.sin(this.cameraAngleV);
      const camDirXZ = Math.cos(this.cameraAngleV);
      const aimDir = new THREE.Vector3(camFwdX * camDirXZ, camFwdY, camFwdZ * camDirXZ).normalize();

      let foundGround = false;
      for (let d = 4.0; d <= 36.0; d += 1.0) {
        const tx = this.playerPos.x + aimDir.x * d;
        const tz = this.playerPos.z + aimDir.z * d;
        const ty = this.playerPos.y + 1.5 + aimDir.y * d;
        const gy = getSolidGroundHeight(tx, tz, this.playerPos.y);
        if (ty <= gy + 0.35) {
          this.arrowVolleyTargetPoint.set(tx, gy + 0.08, tz);
          foundGround = true;
          break;
        }
      }
      if (!foundGround) {
        this.arrowVolleyTargetPoint.copy(this.playerPos).add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(aimDir, 24.0);
        const gy = getSolidGroundHeight(this.arrowVolleyTargetPoint.x, this.arrowVolleyTargetPoint.z, this.playerPos.y);
        this.arrowVolleyTargetPoint.y = gy + 0.08;
      }

      // Soft-lock terdekat di jalur bidik kamera (untuk desktop / tap tanpa drag manual)
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
        const ey = getSolidGroundHeight(bestEnemy.mesh.position.x, bestEnemy.mesh.position.z, this.playerPos.y);
        this.arrowVolleyTargetPoint.set(bestEnemy.mesh.position.x, ey + 0.08, bestEnemy.mesh.position.z);
      }
    }

    if (this.playerMesh?.group) {
      this.playerMesh.group.rotation.y = this.playerRotationY;
    }

    // Pose Pemburu mengangkat busur membidik Badai Panah
    if (this.playerMesh) {
      animateHunterBowAim(this.playerMesh, 0.65, this.isMoving, this.walkCycle, delta, true);
    }

    // Update 3D Ground Ring, Cancel Tint, & Rotating Wind Compass
    if (this.arrowVolleyDecalSubgroup) {
      this.arrowVolleyDecalSubgroup.position.copy(this.arrowVolleyTargetPoint);
      this.arrowVolleyDecalSubgroup.rotation.y += delta * 2.0;
    }
    if (this.arrowVolleyGroundDecal) {
      const m = this.arrowVolleyGroundDecal.material as THREE.MeshBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xef4444 : 0x67e8f9);
      m.opacity = this.mobileAimOverCancel ? 0.45 : 0.85;
    }
    if (this.arrowVolleyOuterRing) {
      const m = this.arrowVolleyOuterRing.material as THREE.MeshBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xf87171 : 0xfde047);
    }
    if (this.arrowVolleyTrajectoryLine) {
      const m = this.arrowVolleyTrajectoryLine.material as THREE.LineBasicMaterial;
      m.color.setHex(this.mobileAimOverCancel ? 0xef4444 : 0x34d399);
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

    if (!this.isAimingArrowVolley && !this.arrowVolleyAimState.isCharging) return;

    if (isCancelled) {
      this.cancelArrowVolleyAim();
      return;
    }

    const holdDuration =
      this.arrowVolleyAimState.pressStartTime > 0
        ? performance.now() - this.arrowVolleyAimState.pressStartTime
        : 999;

    this.arrowVolleyAimState.isCharging = false;

    // Tap cepat (< 220ms) lewat tombol UI/mouse juga otomatis memakai auto-target cepat
    if (this.arrowVolleyAimState.pressStartTime > 0 && holdDuration < 220) {
      this.isAimingArrowVolley = false;
      if (this.arrowVolleyIndicatorGroup) {
        this.arrowVolleyIndicatorGroup.visible = false;
      }
      this.callbacks.onArrowVolleyAimChange?.(false);
      this.quickCastArrowVolley();
      return;
    }

    const cdCheck = this.skillCooldownsManager.canUse('rogue_bow_f', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Badai Panah Agung Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#fde047',
        'info'
      );
      this.cancelArrowVolleyAim(false);
      return;
    }

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 45) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 45 MP)!', '#ef4444', 'info');
      this.cancelArrowVolleyAim(false);
      return;
    }

    if (!this.devSettings.infiniteEnergy) {
      this.currentStats.mp = Math.max(0, this.currentStats.mp - 45);
      this.callbacks.onUpdateStats((stats) => ({
        ...stats,
        mp: Math.max(0, stats.mp - 45),
      }));
    }
    this.skillCooldownsManager.consume('rogue_bow_f', this.isZeroCd());

    this.callbacks.onAddFloatingText('⛈️ BADAI PANAH AGUNG!', '#fde047', 'crit');
    soundManager.playBowShoot(true);

    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.visible = false;
    }

    this.isAimingArrowVolley = false;
    this.callbacks.onArrowVolleyAimChange?.(false);

    this.bowCombatStanceTimer = 0.45;
    this.ensureWeaponDrawn();
    this.playerMesh?.setHunterBowInHand?.(true);
    this.isAttacking = true;
    this.attackType = 'hunter_volley_release';
    this.attackDuration = 0.45;
    this.attackTimer = 0.45;
    if (this.playerMesh) {
      animateHunterSkyVolley(this.playerMesh, 0, this.isMoving, this.walkCycle, 0);
    }

    this.executeSkywardArrowVolley(this.playerPos.clone(), this.arrowVolleyTargetPoint.clone());
  }

  public cancelArrowVolleyAim(showToast = true) {
    if (this.arrowVolleyAimTimer) {
      clearTimeout(this.arrowVolleyAimTimer);
      this.arrowVolleyAimTimer = null;
    }
    this.isHoldingArrowVolleyKey = false;
    this.arrowVolleyAimState = {
      isCharging: false,
      pressStartTime: 0,
      cancelled: true,
    };

    if (!this.isAimingArrowVolley) return;

    this.isAimingArrowVolley = false;

    if (this.arrowVolleyIndicatorGroup) {
      this.arrowVolleyIndicatorGroup.visible = false;
    }

    this.isAttacking = false;
    this.attackType = null;
    this.attackTimer = 0;
    this.bowCombatStanceTimer = 0;
    if (this.playerMesh?.body) {
      this.playerMesh.body.rotation.set(0, 0, 0);
      this.playerMesh.head?.rotation.set(0, 0, 0);
      this.playerMesh.leftArm?.position.set(-0.325, 1.42, 0.02);
      this.playerMesh.rightArm?.position.set(0.325, 1.42, 0.02);
      this.playerMesh.leftArm?.rotation.set(0, 0, 0);
      this.playerMesh.rightArm?.rotation.set(0, 0, 0);
    }
    this.syncHunterWeaponModel();

    if (showToast) {
      this.callbacks.onAddFloatingText('Dibatalkan', '#94a3b8', 'info');
    }
    this.callbacks.onArrowVolleyAimChange?.(false);
  }

  public fireArrowVolley = () => {
    this.releaseAimArrowVolley(false);
  };

  public quickCastArrowVolley() {
    if (this.isControlsLocked) return;
    if (this.charClass !== 'rogue' || this.hunterWeaponMode !== 'bow') return;
    if (this.isAimingArrowVolley) return;

    const cdCheck = this.skillCooldownsManager.canUse('rogue_bow_f', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Badai Panah Agung Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#fde047',
        'info'
      );
      return;
    }

    this.unsheatheHunterWeapon();

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 45) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 45 MP)!', '#ef4444', 'info');
      return;
    }

    if (!this.devSettings.infiniteEnergy) {
      this.currentStats.mp = Math.max(0, this.currentStats.mp - 45);
      this.callbacks.onUpdateStats((stats) => ({
        ...stats,
        mp: Math.max(0, stats.mp - 45),
      }));
    }
    this.skillCooldownsManager.consume('rogue_bow_f', this.isZeroCd());

    this.callbacks.onAddFloatingText('⛈️ BADAI PANAH AGUNG!', '#fde047', 'crit');
    soundManager.playBowShoot(true);

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
      const ey = getSolidGroundHeight(bestEnemy.mesh.position.x, bestEnemy.mesh.position.z, this.playerPos.y);
      targetPos = new THREE.Vector3(bestEnemy.mesh.position.x, ey + 0.08, bestEnemy.mesh.position.z);
    } else {
      const tx = this.playerPos.x + camFwd.x * 14.0;
      const tz = this.playerPos.z + camFwd.z * 14.0;
      const ty = getSolidGroundHeight(tx, tz, this.playerPos.y) + 0.08;
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

    // Fase 1 Badai Panah: Angkat busur ke langit ~0.45s & pastikan senjata Mode Siaga di tangan
    this.bowCombatStanceTimer = 0.45;
    this.ensureWeaponDrawn();
    this.playerMesh?.setHunterBowInHand?.(true);
    this.isAttacking = true;
    this.attackType = 'hunter_volley_release';
    this.attackDuration = 0.45;
    this.attackTimer = 0.45;
    if (this.playerMesh) {
      animateHunterSkyVolley(this.playerMesh, 0, this.isMoving, this.walkCycle, 0);
    }

    this.executeSkywardArrowVolley(this.playerPos.clone(), targetPos);
  }

  public executeSkywardArrowVolley(casterPos: THREE.Vector3, targetPos: THREE.Vector3) {
    if (this.gameMode === 'multiplayer') {
      this.callbacks.onLocalPlayerAttack?.({
        attackType: 'skill_4_bow_ultimate',
        skillSlot: 4,
        charClass: this.charClass,
        hunterWeaponMode: this.hunterWeaponMode,
        x: Math.round(targetPos.x * 100) / 100,
        y: Math.round(targetPos.y * 100) / 100,
        z: Math.round(targetPos.z * 100) / 100,
        rotationY: Math.round(this.playerRotationY * 100) / 100,
      });
    }

    const isAmbush = this.consumeStealthForAmbush();
    this.startArrowStormUltimate(casterPos, targetPos, isAmbush ? 1.5 : 1.0);
  }

  /**
   * Absorbs incoming damage using active Warrior Aegis Shield & Mage Arcane Shield
   */
  public absorbDamageWithShield(
    rawDamage: number,
    attackerEnemy?: (typeof this.enemies)[0]
  ): { remainingDamage: number; absorbed: number } {
    if (this.isInvulnerable || this.devSettings.godMode) {
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

  // 11. Rogue Shadow Step VFX (Pooled Shadow Decoy Silhouettes with fading smoke trails)
  private spawnRogueShadowStepVfx(startPos: THREE.Vector3, fwd: THREE.Vector3) {
    for (let i = 1; i <= 4; i++) {
      this._scratchVec1.copy(startPos).addScaledVector(fwd, i * 3.0);
      if (this.shadowStepPool.length > 0) {
        const item = this.shadowStepPool[this.shadowStepNextIndex];
        this.shadowStepNextIndex = (this.shadowStepNextIndex + 1) % this.shadowStepPool.length;
        item.group.position.set(this._scratchVec1.x, this._scratchVec1.y + 0.85, this._scratchVec1.z);
        item.group.rotation.set(0, this.playerRotationY, 0);
        item.group.scale.set(1, 1, 1);
        item.mat.opacity = 0.75;
        item.elapsed = 0;
        item.duration = 0.4;
        item.active = true;
        item.group.visible = true;
      }

      this.spawnFootstepVfx('shadow');
      this._scratchVec2.set(this._scratchVec1.x, this._scratchVec1.y + 0.8, this._scratchVec1.z);
      this.spawnSparks(this._scratchVec2, 0x10b981, 4, 2.0);
    }
  }

  // 12. Bom Asap / Smoke Veil VFX (Pooled volumetric gray smoke cloud, radius ~6.5u, duration 3.5s, floor decals stay readable)
  private spawnRogueSmokeCloakVfx(origin: THREE.Vector3 = this.playerPos) {
    const puffCount = Math.min(26, this.smokePuffPool.length);
    for (let i = 0; i < puffCount; i++) {
      const item = this.smokePuffPool[this.smokePuffNextIndex];
      this.smokePuffNextIndex = (this.smokePuffNextIndex + 1) % this.smokePuffPool.length;

      const angle = (i / puffCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const startDist = 0.35 + Math.random() * 1.8;
      const heightOffset = 0.55 + Math.random() * 1.45;
      const puffScale = 0.75 + Math.random() * 0.65;

      item.mesh.position.set(
        origin.x + Math.cos(angle) * startDist,
        origin.y + heightOffset,
        origin.z + Math.sin(angle) * startDist
      );
      item.mesh.scale.set(puffScale, puffScale * 0.85, puffScale);
      item.mat.color.setHex(i % 2 === 0 ? 0x9ca3af : 0x6b7280);
      item.baseOpacity = i < 8 ? 0.55 : 0.66;
      item.mat.opacity = item.baseOpacity;
      item.vx = Math.cos(angle) * (2.6 + Math.random() * 2.2);
      item.vz = Math.sin(angle) * (2.6 + Math.random() * 2.2);
      item.riseSpeed = 0.32 + Math.random() * 0.25;
      item.growRate = 0.52;
      item.elapsed = 0;
      item.duration = 3.5;
      item.active = true;
      item.mesh.visible = true;
    }

    this.spawnShockwaveRing(origin, 0x9ca3af, 6.5, 0.7);
    this._scratchVec1.set(origin.x, origin.y + 0.7, origin.z);
    this.spawnSparks(this._scratchVec1, 0xd1d5db, 14, 3.8);
    this.triggerCameraShake(0.16);
  }

  private spawnShadowDecoyDispelPuffs(pos: THREE.Vector3) {
    const count = Math.min(10, this.smokePuffPool.length);
    for (let i = 0; i < count; i++) {
      const item = this.smokePuffPool[this.smokePuffNextIndex];
      this.smokePuffNextIndex = (this.smokePuffNextIndex + 1) % this.smokePuffPool.length;
      const angle = (i / count) * Math.PI * 2;
      item.mesh.position.set(
        pos.x + Math.cos(angle) * 0.35,
        pos.y + 0.55 + Math.random() * 0.9,
        pos.z + Math.sin(angle) * 0.35
      );
      item.mesh.scale.setScalar(0.5 + Math.random() * 0.35);
      item.mat.color.setHex(i % 3 === 0 ? 0x67e8f9 : i % 2 === 0 ? 0x9ca3af : 0x6b7280);
      item.baseOpacity = 0.56;
      item.mat.opacity = 0.56;
      item.vx = Math.cos(angle) * (1.5 + Math.random() * 1.1);
      item.vz = Math.sin(angle) * (1.5 + Math.random() * 1.1);
      item.riseSpeed = 0.65;
      item.growRate = 0.75;
      item.elapsed = 0;
      item.duration = 0.9;
      item.active = true;
      item.mesh.visible = true;
    }
  }

  // Helper to dynamically align player facing direction to active movement or closest 360Â° enemy
  private alignPlayerOrientationToInputOrTarget(maxTargetRange = 18): void {
    if (this.mobileAimActiveSlot !== null && this.mobileAimNormalized.active && this.mobileAimWorldDir.lengthSq() > 0.01) {
      this.playerRotationY = Math.atan2(this.mobileAimWorldDir.x, this.mobileAimWorldDir.z);
      if (this.playerMesh?.group) {
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }
      return;
    }

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

  // 360-degree blade spin VFX (pooled full circular cutting discs, radial energy spikes & sparks)
  private spawn360BladeSpinVfx(color: number, radius = 3.8, customCenter?: THREE.Vector3) {
    const origin = customCenter || this.playerPos;
    const centerPos = this._scratchVec1.copy(origin);
    centerPos.y += 1.1;

    if (this.bladeSpin360Pool.length > 0) {
      const item = this.bladeSpin360Pool[this.bladeSpin360NextIndex];
      this.bladeSpin360NextIndex = (this.bladeSpin360NextIndex + 1) % this.bladeSpin360Pool.length;
      item.group.position.copy(centerPos);
      item.baseRadius = radius;
      item.group.scale.set(0.6 * radius, 0.6 * radius, 0.6 * radius);
      item.matOuter.color.setHex(color);
      item.spokeMat.color.setHex(color);
      item.matOuter.opacity = 0.9;
      item.matInner.opacity = 0.95;
      item.spokeMat.opacity = 0.85;
      item.elapsed = 0;
      item.duration = 0.32;
      item.active = true;
      item.group.visible = true;
    }

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
    isCripplingSlow = false,
    forceAmbushCrit = false
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

    const stats = this.currentStats;
    // Wind-Piercer Full Charge grants +25% Bonus Critical Chance; Stealth Ambush forces Crit
    const critChance = (isPiercing ? 0.47 : 0.22) + stats.agility * 0.015;
    const isCrit = forceAmbushCrit || Math.random() < critChance;
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
  }

  // Helper to execute melee hit detection with full 360-degree coverage
  private getBossBodyRadiusBonus(enemy: (typeof this.enemies)[0]): number {
    if (enemy.data.id === 'boss_titan') return 3.6;
    if (enemy.data.id === 'boss_dragonfang') return 2.8;
    if (enemy.data.id === 'boss_jarrus') return 2.0;
    return 0;
  }

  private isPointHittingEnemy(
    point: THREE.Vector3,
    enemy: (typeof this.enemies)[0],
    baseRadius: number
  ): boolean {
    const ePos = enemy.mesh.position;
    const maxH =
      enemy.data.id === 'boss_titan'
        ? 21.0
        : enemy.data.id === 'boss_dragonfang'
          ? 14.0
          : enemy.data.id === 'boss_jarrus'
            ? 10.0
            : 4.5;
    const dy = point.y - ePos.y;
    if (dy < -1.5 || dy > maxH) return false;
    return Math.hypot(point.x - ePos.x, point.z - ePos.z) <= baseRadius + this.getBossBodyRadiusBonus(enemy);
  }

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

    const stats = this.currentStats;
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
      const effectiveDist =
        Math.hypot(this.playerPos.x - enemyPos.x, this.playerPos.z - enemyPos.z) -
        this.getBossBodyRadiusBonus(enemy);
      const dy = Math.abs(this.playerPos.y - enemyPos.y);

      if (effectiveDist <= params.range && dy <= (enemy.data.id === 'boss_titan' ? 14.0 : 8.0)) {
        const toEnemy = new THREE.Vector3().subVectors(enemyPos, this.playerPos).normalize();
        const dot = playerForward.dot(toEnemy);

        // 360-degree hit detection:
        // 1. If is360 is true (or combo 3 spin finisher), hits all 360Â° (front, left, right, back!)
        // 2. In close combat radius (<= 2.4m), hits all 360Â° regardless of angle
        // 3. Otherwise for extended reach, covers a wide sweeping ~220Â° arc (dot > -0.35)
        const hit =
          params.is360 ||
          effectiveDist <= 2.4 ||
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
  }

  // --- Warrior & Hunter Combat Actions & Skills ---
  public startBasicAttack() {
    if (this.isControlsLocked || this.isCasting) return;

    // Pemburu (Hunter) Bow Tap-or-Hold Charge Handler (izinkan tembakan cepat tanpa deadlock oleh pose follow-through)
    if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
      if (!this.devSettings.zeroCooldown && this.bowShotCooldownTimer > 0) return;
      this.unsheatheHunterWeapon();
      this.alignPlayerOrientationToInputOrTarget(22);
      this.isHoldingBowAttack = true;
      this.bowPressStartTime = performance.now();
      this.isAimingBow = false;
      this.bowChargeRatio = 0;
      this.bowCombatStanceTimer = Math.max(this.bowCombatStanceTimer, 0.35);
      this.playerMesh?.setHunterBowInHand?.(true);
      soundManager.playBowDraw();
      return;
    }

    if (this.isAttacking) return;
    if (this.charClass === 'rogue') {
      this.unsheatheHunterWeapon();
    }
    this.alignPlayerOrientationToInputOrTarget(16);

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
      const ratio = this.bowChargeRatio;

      // Tap Cepat (< 0.20s — Quick Shot instan) vs Tahan (>= 0.20s — Charged Wind-Piercer):
      if (!this.isAimingBow && holdDuration < 0.20) {
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
    const cdCheck = this.skillCooldownsManager.canUse('warrior_dash', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Shield Dash Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#fbbf24',
        'info'
      );
      return;
    }
    this.callbacks.onUpdateStats((stats) => {
      if (!this.devSettings.infiniteEnergy && stats.stamina < 15) {
        this.callbacks.onAddFloatingText('Stamina Tidak Cukup!', '#ffb74d', 'info');
        return stats;
      }
      this.skillCooldownsManager.consume('warrior_dash', this.isZeroCd());

      const forward =
        this.mobileAimActiveSlot === 'dash' && this.mobileAimNormalized.active
          ? this.mobileAimWorldDir.clone().normalize()
          : new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotationY);
      this.playerRotationY = Math.atan2(forward.x, forward.z);
      if (this.playerMesh?.group) {
        this.playerMesh.group.rotation.y = this.playerRotationY;
      }

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
          if (this.isPointHittingEnemy(this.playerPos, enemy, 3.2)) {
            const dmg = Math.round(stats.baseAttack * 0.75 + stats.baseDefense * 0.8);
            this.damageEnemy(enemy, dmg, false, 1.2);
            this.spawnSparks(enemy.mesh.position, 0xfbbf24, 8, 3.5);
          }
        });
      }, 100);

      this.callbacks.onAddFloatingText('Shield Dash! 🛡️', '#fbbf24', 'info');
      if (this.devSettings.infiniteEnergy) return stats;
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
        if (this.isPointHittingEnemy(impactPos, enemy, aoeRadius)) {
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
    const cdCheck = this.skillCooldownsManager.canUse('warrior_r', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Aegis Retribution Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#f97316',
        'info'
      );
      return;
    }
    this.callbacks.onUpdateStats((stats) => {
      if (!this.devSettings.infiniteEnergy && (stats.mp < 25 || stats.stamina < 15)) {
        this.callbacks.onAddFloatingText('Aura / Stamina Tidak Cukup (25 Aura + 15 Stm)!', '#e57373', 'info');
        return stats;
      }
      this.skillCooldownsManager.consume('warrior_r', this.isZeroCd());

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
        mp: this.devSettings.infiniteEnergy ? stats.mp : Math.max(0, stats.mp - 25),
        stamina: this.devSettings.infiniteEnergy ? stats.stamina : Math.max(0, stats.stamina - 15),
        shield: shieldVal,
        maxShield: shieldVal,
        shieldDuration: 5.0,
      };
    });
  }

  // --- Role-Specific Combat Skills & Combos ---
  public performBasicAttack() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
      if (!this.devSettings.zeroCooldown && this.bowShotCooldownTimer > 0) return;
      this.fireQuickBowArrow();
      return;
    }
    if (this.isAttacking) return;
    if (this.charClass === 'rogue') {
      this.unsheatheHunterWeapon();
    }

    if (this.charClass === 'warrior') {
      this.performWarriorComboAttack();
      return;
    }

    // Align player facing to movement direction or closest 360Â° enemy
    this.alignPlayerOrientationToInputOrTarget(16);

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
      // Hunter Daggers Melee Combat (0s Basic Attack CD)
      const isStealthAmbush = this.consumeStealthForAmbush();
      const ambushMult = isStealthAmbush ? 1.5 : 1.0;

      if (currentCombo === 2) {
        this.attackType = 'basic_spin_360';
        this.attackDuration = 0.32;
        this.attackTimer = 0.32;
        soundManager.playRogueDoubleSlash();
        this.spawn360BladeSpinVfx(0x00f5ff, 3.4);
        this.executeMeleeAttack({
          range: 3.4,
          is360: true,
          dmgMultiplier: 1.75 * ambushMult,
          critBonus: isStealthAmbush ? 5.0 : 0.45,
          knockback: 0.5,
        });
      } else {
        this.attackType = currentCombo === 0 ? 'basic_slash_1' : 'basic_slash_2';
        this.attackDuration = 0.22;
        this.attackTimer = 0.22;
        soundManager.playRogueDoubleSlash();
        this.spawnRogueXSlashVfx();
        this.executeMeleeAttack({
          range: 3.0,
          coneAngle: -0.35,
          dmgMultiplier: 1.35 * ambushMult,
          critBonus: isStealthAmbush ? 5.0 : 0.35,
          knockback: 0.25,
        });
      }
    }
  }

  public castSkill(skillSlot: 1 | 2 | 3 | 4) {
    if (this.isControlsLocked || this.isCasting) return;
    // Hanya Basic Attack, Skill Q (1), & Ultimate F (4) menghunus senjata; Dash (2) & Bom Asap (3) universal Dual Mode + Handless
    if (this.charClass === 'rogue' && (skillSlot === 1 || skillSlot === 4)) {
      this.unsheatheHunterWeapon();
    }

    if (skillSlot === 1 || skillSlot === 4) {
      this.alignPlayerOrientationToInputOrTarget(this.charClass === 'rogue' && this.hunterWeaponMode === 'bow' ? 22 : 16);
    }

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
        const cdCheck = this.skillCooldownsManager.canUse('warrior_q', this.isZeroCd());
        if (!cdCheck.ok) {
          if (cdCheck.reason === 'no_charges') {
            this.callbacks.onAddFloatingText(
              `Triple Crescent Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
              '#fbbf24',
              'info'
            );
          }
          return;
        }
        this.callbacks.onUpdateStats((stats) => {
          if (!this.devSettings.infiniteEnergy && stats.mp < 20) {
            this.callbacks.onAddFloatingText('Aura Tidak Cukup (Butuh 20)!', '#e57373', 'info');
            return stats;
          }
          this.skillCooldownsManager.consume('warrior_q', this.isZeroCd());
          this.castWarriorTripleCrescentGale();
          if (this.devSettings.infiniteEnergy) return stats;
          return { ...stats, mp: Math.max(0, stats.mp - 20) };
        });
        return;
      }

      if (this.charClass === 'mage') {
        this.executeGlacialCrystalBarrage();
        return;
      }

      if (this.charClass === 'rogue') {
        if (this.hunterWeaponMode === 'bow') {
          if (this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
            this.releaseAimAstralEagle(false);
          } else {
            this.quickCastAstralEagle();
          }
          return;
        }

        const cdCheck = this.skillCooldownsManager.canUse('rogue_dagger_q', this.isZeroCd());
        if (!cdCheck.ok) {
          this.callbacks.onAddFloatingText(
            `Tarian Belati Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
            '#34d399',
            'info'
          );
          return;
        }
        if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 15) {
          this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 15 MP)!', '#e57373', 'info');
          return;
        }

        const stats = this.currentStats;
        if (!this.devSettings.infiniteEnergy) {
          this.currentStats.mp = Math.max(0, stats.mp - 15);
          this.callbacks.onUpdateStats((s) => ({ ...s, mp: Math.max(0, s.mp - 15) }));
        }
        this.skillCooldownsManager.consume('rogue_dagger_q', this.isZeroCd());

        const isAmbush = this.consumeStealthForAmbush();
        soundManager.playRogueShadowFlurry();
        this.spawnRogueShadowFlurryVfx();
        this.isAttacking = true;
        this.attackType = 'flurry';
        this.attackDuration = 0.4;
        this.attackTimer = 0.4;

        const skillDmg = Math.round((stats.baseAttack + stats.agility * 2.5) * 1.5 * (isAmbush ? 1.5 : 1.0));
        this.enemies.forEach((enemy) => {
          if (enemy.data.isDead) return;
          if (this.isPointHittingEnemy(this.playerPos, enemy, 4.0)) {
            this.damageEnemy(enemy, skillDmg, true, 0.4);
          }
        });
        this.callbacks.onAddFloatingText('Tarian 1000 Belati 360°!', '#34d399', 'crit');
        return;
      }
    } else if (skillSlot === 2) {
      if (this.charClass === 'warrior') {
        const cdCheck = this.skillCooldownsManager.canUse('warrior_ult', this.isZeroCd());
        if (!cdCheck.ok) {
          this.callbacks.onAddFloatingText(
            `Cataclysmic Leap Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
            '#fbbf24',
            'info'
          );
          return;
        }
        this.callbacks.onUpdateStats((stats) => {
          if (!this.devSettings.infiniteEnergy && stats.mp < 30) {
            this.callbacks.onAddFloatingText('Aura Tidak Cukup (Butuh 30)!', '#e57373', 'info');
            return stats;
          }
          this.skillCooldownsManager.consume('warrior_ult', this.isZeroCd());
          this.castWarriorCataclysmicLeap();
          if (this.devSettings.infiniteEnergy) return stats;
          return { ...stats, mp: Math.max(0, stats.mp - 30) };
        });
        return;
      }

      if (this.charClass === 'mage') {
        this.castArcaneBlink();
        return;
      }

      if (this.charClass === 'rogue') {
        // Universal Dual Mode Dash: Bayangan Pengecoh (Belati / Busur / Santai)
        this.performHunterShadowDecoyDash();
        return;
      }
    } else if (skillSlot === 3) {
      if (this.charClass === 'warrior') {
        this.castWarriorAegisRetribution();
        return;
      }

      if (this.charClass === 'mage') {
        this.castCahayaSuci();
        return;
      }

      if (this.charClass === 'rogue') {
        // Universal Dual Mode Skill R: Bom Asap (Smoke Veil Stealth 3.0s)
        this.performHunterSmokeVeil();
        return;
      }
    } else if (skillSlot === 4) {
      if (this.charClass === 'mage') {
        this.startStarfallCasting();
        return;
      } else if (this.charClass === 'rogue') {
        if (this.hunterWeaponMode === 'bow') {
          if (!this.isAimingArrowVolley) {
            this.quickCastArrowVolley();
          } else {
            this.fireArrowVolley();
          }
          return;
        }
        const cdCheck = this.skillCooldownsManager.canUse('rogue_dagger_f', this.isZeroCd());
        if (!cdCheck.ok) {
          this.callbacks.onAddFloatingText(
            `Ultimate Belati Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
            '#34d399',
            'info'
          );
          return;
        }
        this.skillCooldownsManager.consume('rogue_dagger_f', this.isZeroCd());
        const isAmbush = this.consumeStealthForAmbush();
        soundManager.playRogueShadowFlurry();
        this.spawn360BladeSpinVfx(0x10b981, 4.4);
        this.spawnShockwaveRing(this.playerPos, 0x34d399, 4.8, 0.45);
        this.isAttacking = true;
        this.attackType = 'basic_spin_360';
        this.attackDuration = 0.42;
        this.attackTimer = 0.42;
        this.executeMeleeAttack({
          range: 4.5,
          is360: true,
          dmgMultiplier: 2.35 * (isAmbush ? 1.5 : 1.0),
          critBonus: 5.0,
          knockback: 1.0,
        });
        this.callbacks.onAddFloatingText('🌙 EKSEKUSI BAYANGAN BELATI!', '#34d399', 'crit');
        return;
      }
    }
  }

  // ============================================================================
  // OPEN-WORLD HUNTER WEAPON SYSTEM: SIAGA (DRAWN) VS SANTAI (HANDLESS / SHEATHED)
  // ============================================================================
  private syncHunterWeaponModel(): void {
    if (this.charClass !== 'rogue' || !this.playerMesh) return;
    if (this.playerMesh.setHunterWeaponDrawn) {
      this.playerMesh.setHunterWeaponDrawn(this.isWeaponDrawn);
    } else if (this.playerMesh.setHunterSheathed) {
      this.playerMesh.setHunterSheathed(!this.isWeaponDrawn);
    } else if (this.playerMesh.group) {
      updateHunterWeaponStance(
        this.playerMesh.group,
        this.hunterWeaponMode,
        !this.isWeaponDrawn,
        this.isWeaponDrawn && this.hunterWeaponMode === 'bow' && (this.isAimingBow || this.isHoldingBowAttack || this.bowCombatStanceTimer > 0)
      );
    }
  }

  public ensureWeaponDrawn(): void {
    if (this.charClass !== 'rogue') return;
    this.combatIdleTimer = 7.0;
    if (!this.isWeaponDrawn) {
      this.isWeaponDrawn = true;
      this.isHunterSheathed = false;
      this.weaponDrawTransitionTimer = 0.12;
      if (this.hunterWeaponMode === 'bow') {
        soundManager.playBowDraw();
      } else {
        soundManager.playRogueDoubleSlash();
      }
      this.syncHunterWeaponModel();
      this.callbacks.onWeaponDrawnChange?.(true);
    }
  }

  public toggleWeaponDrawn(forceState?: boolean, silent = false): void {
    if (this.charClass !== 'rogue' || this.isControlsLocked || this.isCasting) return;
    const nextDrawn = forceState !== undefined ? forceState : !this.isWeaponDrawn;
    if (nextDrawn === this.isWeaponDrawn) {
      if (nextDrawn) this.combatIdleTimer = 7.0;
      return;
    }

    if (!nextDrawn) {
      if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
        this.cancelArrowVolleyAim(false);
      }
      if (this.isHoldingBowAttack || this.isAimingBow) {
        this.cancelBowAim();
      }
      this.bowCombatStanceTimer = 0;
      this.weaponDrawTransitionTimer = 0;
      this.combatIdleTimer = 0;
    } else {
      this.combatIdleTimer = 7.0;
      this.weaponDrawTransitionTimer = 0.12;
    }

    this.isWeaponDrawn = nextDrawn;
    this.isHunterSheathed = !nextDrawn;
    this.syncHunterWeaponModel();
    this.callbacks.onWeaponDrawnChange?.(this.isWeaponDrawn);

    if (!nextDrawn && this.playerMesh) {
      if (this.playerMesh.body) this.playerMesh.body.rotation.set(0, 0, 0);
      if (this.playerMesh.head) this.playerMesh.head.rotation.set(0, 0, 0);
      if (this.playerMesh.leftArm) {
        this.playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
        this.playerMesh.leftArm.rotation.set(0, 0, 0);
      }
      if (this.playerMesh.rightArm) {
        this.playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
        this.playerMesh.rightArm.rotation.set(0, 0, 0);
      }
    }

    if (!silent) {
      if (nextDrawn) {
        this.hunterWeaponMode === 'bow' ? soundManager.playBowDraw() : soundManager.playRogueDoubleSlash();
        this.callbacks.onAddFloatingText(
          this.hunterWeaponMode === 'bow' ? 'Mode Siaga: Busur Diangkat 🏹' : 'Mode Siaga: Belati Terhunus 🗡️',
          '#34d399',
          'info'
        );
      } else {
        this.callbacks.onAddFloatingText('Mode Santai: Senjata Disarungkan', '#94a3b8', 'info');
      }
    }
  }

  public unsheatheHunterWeapon(): void {
    this.ensureWeaponDrawn();
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
  // DUAL MODE ASSASSIN: BAYANGAN PENGECOH (DASH 2 CHARGES) & BOM ASAP (STEALTH 3s)
  // ============================================================================
  private isZeroCd(): boolean {
    return Boolean(this.devSettings.enabled && this.devSettings.zeroCooldown);
  }

  private initShadowDecoyPool() {
    if (this.shadowDecoyPool.length > 0) return;

    const decoyBodyMat = new THREE.MeshLambertMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.72,
    });
    const decoyEyeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.65,
    });
    const decoyRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shadowDecoySharedMats.push(decoyBodyMat, decoyEyeMat, decoyRingMat);

    for (let i = 0; i < 2; i++) {
      const decoyGroup = this.createShadowDecoyMesh(decoyBodyMat, decoyEyeMat, decoyRingMat);
      decoyGroup.visible = false;
      decoyGroup.frustumCulled = false;
      decoyGroup.traverse((child) => {
        child.frustumCulled = false;
      });
      this.scene.add(decoyGroup);
      this.shadowDecoyPool.push(decoyGroup);
    }
  }

  private createShadowDecoyMesh(
    bodyMat: THREE.Material,
    eyeMat: THREE.Material,
    ringMat: THREE.Material
  ): THREE.Group {
    const silhouette = createHunterModel();
    silhouette.name = 'HunterShadowDecoy';

    silhouette.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        // Sembunyikan senjata agar klon tampil statis dalam siluet tudung gelap rapi
        if (mesh.name === 'HandDagger' || mesh.parent?.name === 'HandDagger' || mesh.parent?.name === 'SegmentedBow') {
          mesh.visible = false;
        }
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose?.());
        } else {
          mesh.material?.dispose?.();
        }
        mesh.material = bodyMat;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
      }
    });

    // Pastikan tidak ada senjata tersisa di grup decoy
    ['BackBow', 'HandBow', 'HandDaggerL', 'HandDaggerR', 'HipDaggerSheathL', 'HipDaggerSheathR'].forEach((n) => {
      const obj = silhouette.getObjectByName(n);
      if (obj) obj.visible = false;
    });

    // Sorot mata cyan redup tepat di bawah tepi tudung wajah
    const eyeGeo = new THREE.PlaneGeometry(0.068, 0.022);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.052, 1.655, 0.168);
    leftEye.rotation.z = -0.14;
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.052, 1.655, 0.168);
    rightEye.rotation.z = 0.14;
    silhouette.add(leftEye, rightEye);

    const groundRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.85, 24), ringMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.05;
    silhouette.add(groundRing);

    return silhouette;
  }

  private spawnShadowDecoy(pos: THREE.Vector3, rotY: number) {
    this.initShadowDecoyPool();

    if (this.activeShadowDecoy && this.activeShadowDecoy.active) {
      this.dismissActiveShadowDecoy(true);
    }

    const group = this.shadowDecoyPool[this.shadowDecoyCursor];
    this.shadowDecoyCursor = (this.shadowDecoyCursor + 1) % this.shadowDecoyPool.length;
    const solidY = getSolidGroundHeight(pos.x, pos.z, pos.y);
    group.position.set(pos.x, Math.max(pos.y, solidY), pos.z);
    group.rotation.set(0, rotY, 0);
    group.visible = true;

    this.activeShadowDecoy = {
      group,
      pos: group.position.clone(),
      timer: 2.8,
      active: true,
    };
  }

  public dismissActiveShadowDecoy(silent = false) {
    if (!this.activeShadowDecoy || !this.activeShadowDecoy.active) return;
    const decoyPos = this.activeShadowDecoy.pos;

    this.activeShadowDecoy.active = false;
    this.activeShadowDecoy.group.visible = false;

    if (!silent) {
      soundManager.playRogueSmoke();
      this.spawnShadowDecoyDispelPuffs(decoyPos);
      this.spawnSparks(decoyPos.clone().add(new THREE.Vector3(0, 0.9, 0)), 0x67e8f9, 10, 3.2);
    }

    this.activeShadowDecoy = null;
  }

  private applyPlayerStealthMaterials(stealthed: boolean) {
    if (this.playerMatSnapshots.length === 0) {
      this.capturePlayerMaterialSnapshots();
    }
    for (const snap of this.playerMatSnapshots) {
      const m = snap.mat;
      if (stealthed) {
        m.transparent = true;
        m.opacity = 0.35;
        if ((m as any).color && snap.colorHex !== undefined) {
          (m as any).color.setHex(snap.colorHex).multiplyScalar(0.55);
        }
      } else {
        m.transparent = snap.transparent;
        m.opacity = snap.opacity;
        if ((m as any).color && snap.colorHex !== undefined) {
          (m as any).color.setHex(snap.colorHex);
        }
      }
      m.needsUpdate = false;
    }
  }

  private endPlayerStealth(reason: 'expired' | 'ambush' | 'damaged' | 'reset') {
    if (!this.isPlayerStealthed && this.stealthTimer <= 0) return;
    this.isPlayerStealthed = false;
    this.stealthTimer = 0;
    this.applyPlayerStealthMaterials(false);
    this.callbacks.onStealthChange?.(false, 0);

    if (reason === 'damaged') {
      this.callbacks.onAddFloatingText('⚠️ STEALTH TERBONGKAR!', '#ef4444', 'crit');
    }
  }

  private consumeStealthForAmbush(): boolean {
    if (!this.isPlayerStealthed) return false;
    this.endPlayerStealth('ambush');
    soundManager.playRogueShadowFlurry();
    this.spawnHitStarburst(this.playerPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xfde047, 1.6);
    this.callbacks.onAddFloatingText('💥 AMBUSH CRIT!', '#fde047', 'crit');
    return true;
  }

  private handlePlayerTookDamage(actualDamage: number) {
    if (actualDamage > 0 && this.isPlayerStealthed) {
      this.endPlayerStealth('damaged');
    }
  }

  public performHunterSmokeVeil() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass !== 'rogue') return;

    const cdCheck = this.skillCooldownsManager.canUse('rogue_smoke_r', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Bom Asap Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#9ca3af',
        'info'
      );
      return;
    }

    if (!this.devSettings.infiniteEnergy && this.currentStats.mp < 20) {
      this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 20 MP)!', '#e57373', 'info');
      return;
    }

    if (!this.devSettings.infiniteEnergy) {
      this.currentStats.mp = Math.max(0, this.currentStats.mp - 20);
      this.callbacks.onUpdateStats((s) => ({
        ...s,
        mp: Math.max(0, s.mp - 20),
      }));
    }

    this.skillCooldownsManager.consume('rogue_smoke_r', this.isZeroCd());

    soundManager.playRogueSmoke();
    this.spawnRogueSmokeCloakVfx(this.playerPos);

    this.isAttacking = true;
    this.attackType = 'smoke_bomb';
    this.attackDuration = 0.35;
    this.attackTimer = 0.35;

    // Stealth 3.0 detik: transparansi karakter ~0.35, +20% Speed, Aggro Drop total
    this.isPlayerStealthed = true;
    this.stealthTimer = 3.0;
    this.applyPlayerStealthMaterials(true);
    this.callbacks.onStealthChange?.(true, 3.0);
    this.callbacks.onAddFloatingText('💨 BOM ASAP! STEALTH AKTIF (3.0s)', '#d1d5db', 'info');
  }

  public performHunterShadowDecoyDash() {
    if (this.isControlsLocked || this.isCasting || this.isDashing) return;

    const cdCheck = this.skillCooldownsManager.canUse('rogue_dash', this.isZeroCd());
    if (!cdCheck.ok) {
      if (cdCheck.reason === 'no_charges') {
        this.callbacks.onAddFloatingText(
          `Bayangan Pengecoh Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
          '#67e8f9',
          'info'
        );
      }
      return;
    }

    if (!this.devSettings.infiniteEnergy && this.currentStats.stamina < 12) {
      this.callbacks.onAddFloatingText('Stamina Habis (Butuh 12 Stm)!', '#ffb74d', 'info');
      return;
    }

    if (!this.devSettings.infiniteEnergy) {
      this.currentStats.stamina = Math.max(0, this.currentStats.stamina - 12);
      this.callbacks.onUpdateStats((stats) => ({
        ...stats,
        stamina: Math.max(0, stats.stamina - 12),
      }));
    }

    this.skillCooldownsManager.consume('rogue_dash', this.isZeroCd());
    this.executeHunterShadowDecoyDash();
  }

  private executeHunterShadowDecoyDash() {
    soundManager.playDash();
    soundManager.playRogueSmoke();

    const dashDir = this.getPlayerMovementDirection();
    const startPos = this.playerPos.clone();
    const prevRotY = this.playerRotationY;

    // Melesat cepat ~9.5 unit dengan Raycaster / solid collider obstacle check
    let maxDist = 9.5;
    const inInterior = this.playerPos.y < -10;
    for (const col of (this.world?.interiorManager?.activeRoom?.colliders ?? this.world.colliders)) {
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
    const activeDashRoom = this.world?.interiorManager?.activeRoom ?? null;
    if (activeDashRoom) {
      const clampedDash = activeDashRoom.clampInsideWalls(targetX, targetZ, 0.65);
      targetX = clampedDash.x;
      targetZ = clampedDash.z;
    } else {
      targetX = Math.max(WORLD_BOUNDS.minX + 5, Math.min(WORLD_BOUNDS.maxX - 5, targetX));
      targetZ = Math.max(WORLD_BOUNDS.minZ + 5, Math.min(WORLD_BOUNDS.maxZ - 5, targetZ));
    }

    // Jika sedang dalam Boss Arena, cegah dash keluar menembus batas arena
    for (const zone of Object.values(BOSS_ARENA_ZONES)) {
      const startInZone = Math.hypot(startPos.x - zone.center.x, startPos.z - zone.center.z) <= zone.radius - 1.5;
      if (startInZone) {
        const endDist = Math.hypot(targetX - zone.center.x, targetZ - zone.center.z);
        if (endDist > zone.radius - 1.5) {
          const clampRatio = (zone.radius - 1.5) / endDist;
          targetX = zone.center.x + (targetX - zone.center.x) * clampRatio;
          targetZ = zone.center.z + (targetZ - zone.center.z) * clampRatio;
        }
        break;
      }
    }

    const resolved = this.resolveCollisions(targetX, targetZ);
    const targetPos = new THREE.Vector3(
      resolved.x,
      this.getActiveGroundHeight(resolved.x, this.playerPos.y, resolved.z),
      resolved.z
    );

    // 0.3s Invulnerability iFrames
    this.isInvulnerable = true;
    this.invulnerableTimer = 0.30;
    this.isDashing = false;
    this.dashTimer = 0;
    this.isAttacking = true;
    this.attackType = 'hunter_phantom_decoy';
    this.attackDuration = 0.25;
    this.attackTimer = 0.25;

    // Tinggalkan Bayangan Pengecoh statis di titik asal selama 2.8 detik menghadap arah terakhir
    this.spawnShadowDecoy(startPos, prevRotY);

    // Pindahkan pemain ke posisi tujuan dash (9.5u aman)
    this.playerPos.copy(targetPos);
    this.playerMesh.group.position.copy(targetPos);
    this.playerRotationY = Math.atan2(dashDir.x, dashDir.z);
    this.playerMesh.group.rotation.set(0, this.playerRotationY, 0);
    this.playerVel.set(0, 0, 0);

    // VFX jejak bayangan & asap ringan cyan-abu
    this.spawnRogueShadowStepVfx(startPos, targetPos);
    this.spawnShadowDecoyDispelPuffs(startPos);
    this.spawnShockwaveRing(targetPos, 0x38bdf8, 2.6, 0.28);

    this.callbacks.onAddFloatingText('👥 Bayangan Pengecoh!', '#67e8f9', 'info');
  }

  public performHunterGaleVault() {
    this.performHunterShadowDecoyDash();
  }

  public performHunterPhantomDecoyStep() {
    this.performHunterShadowDecoyDash();
  }

  // --- MAGE MOBILITY: ARCANE BLINK (Shift) ---
  public performMageBlink() {
    if (this.isControlsLocked || this.isCasting || this.isDashing) return;

    const cdCheck = this.skillCooldownsManager.canUse('mage_e', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Arcane Blink Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#06b6d4',
        'info'
      );
      return;
    }

    if (!this.devSettings.infiniteEnergy && this.playerStamina < 15) {
      this.callbacks.onAddFloatingText('Stamina Habis (Butuh 15)!', '#ffb74d', 'info');
      return;
    }

    if (!this.devSettings.infiniteEnergy) {
      this.callbacks.onUpdateStats((stats) => {
        if (stats.stamina < 15) return stats;
        return { ...stats, stamina: Math.max(0, stats.stamina - 15) };
      });
    }
    this.skillCooldownsManager.consume('mage_e', this.isZeroCd());

    // Mage: Langkah Dimensi (Instant Blink Teleport with Dual Runic Circles, Afterimages & Enemy Penetration)
    soundManager.playMageBlink();
    const startPos = this._scratchOrigin.copy(this.playerPos);
    const blinkDir = this.getPlayerMovementDirection();

    let maxDist = 12.0;

    // Raycast Layer Mask: ONLY detect solid environment (buildings, walls, rocks, towers)
    // EXCLUDE enemies, monsters, NPCs, and bosses so player can penetrate through enemies
    const inInterior = this.playerPos.y < -10;
    for (const col of (this.world?.interiorManager?.activeRoom?.colliders ?? this.world.colliders)) {
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

    // Clamp to active interior bounds or expanded world boundaries
    let targetX = startPos.x + blinkDir.x * maxDist;
    let targetZ = startPos.z + blinkDir.z * maxDist;
    const activeBlinkRoom = this.world?.interiorManager?.activeRoom ?? null;
    if (activeBlinkRoom) {
      const clampedBlink = activeBlinkRoom.clampInsideWalls(targetX, targetZ, 0.65);
      targetX = clampedBlink.x;
      targetZ = clampedBlink.z;
    } else {
      targetX = Math.max(WORLD_BOUNDS.minX + 5, Math.min(WORLD_BOUNDS.maxX - 5, targetX));
      targetZ = Math.max(WORLD_BOUNDS.minZ + 5, Math.min(WORLD_BOUNDS.maxZ - 5, targetZ));
    }

    // Resolve collisions so player never blinks inside walls or buildings
    const resolved = this.resolveCollisions(targetX, targetZ);
    const targetPos = this._scratchTarget.set(
      resolved.x,
      this.getActiveGroundHeight(resolved.x, this.playerPos.y, resolved.z),
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
    this.mageBlinkCooldownTimer = this.devSettings.zeroCooldown ? 0 : SKILL_COOLDOWNS.ARCANE_BLINK;
    this.callbacks.onAddFloatingText('Langkah Dimensi!', '#38bdf8', 'info');
  }

  public castArcaneBlink() {
    this.performMageBlink();
  }

  // Slot 3 (R): Cahaya Suci / Sanctuary (Heal, Cleanse, Overheal Shield, & +30 MP)
  public castCahayaSuci() {
    if (this.isControlsLocked || this.isCasting) return;
    if (this.charClass !== 'mage') return;

    const cdCheck = this.skillCooldownsManager.canUse('mage_r', this.isZeroCd());
    if (!cdCheck.ok) {
      this.callbacks.onAddFloatingText(
        `Cahaya Suci Cooldown (${cdCheck.remaining.toFixed(1)}s)!`,
        '#38bdf8',
        'info'
      );
      return;
    }

    this.callbacks.onUpdateStats((stats) => {
      if (!this.devSettings.infiniteEnergy && stats.mp < 25) {
        this.callbacks.onAddFloatingText('MP Tidak Cukup (Butuh 25 MP)!', '#e57373', 'info');
        return stats;
      }

      soundManager.playMageCelestialHeal();
      this.spawnMageCelestialHealVfx();
      this.skillCooldownsManager.consume('mage_r', this.isZeroCd());
      this.mageCahayaSuciCooldownTimer = this.isZeroCd() ? 0 : SKILL_COOLDOWNS.CAHAYA_SUCI;
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
      const newMp = this.devSettings.infiniteEnergy ? stats.maxMp : Math.min(stats.maxMp, stats.mp - 25 + 30);

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
    const scaledRawDamage = this.devSettings.superDamage ? rawDamage * 10 : rawDamage;
    const defense = enemy.data.defense;
    let actualDamage = Math.max(3, scaledRawDamage - defense);
    if (enemy.brittleTimer && enemy.brittleTimer > 0) {
      actualDamage = Math.round(actualDamage * 1.20); // Brittle: +20% Damage Taken
    }
    if (enemy.armorBreakTimer && enemy.armorBreakTimer > 0) {
      actualDamage = Math.round(actualDamage * (1 + (enemy.armorBreakBonus || 0.15))); // Armor Break: +15% Damage Taken
    }
    if (enemy.isIndoorDummy) {
      const dummyHitPos = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0));
      this.spawnSparks(dummyHitPos, isCrit ? 0x38bdf8 : 0xfbbf24, isCrit ? 12 : 7, 4.5);
      this.callbacks.onAddFloatingText(
        isCrit ? `⚡ CRIT -${actualDamage}!` : `-${actualDamage}`,
        isCrit ? '#38bdf8' : '#fef08a',
        isCrit ? 'crit' : 'damage'
      );
      soundManager.playHit();
      enemy.data.hp = enemy.data.maxHp;
      enemy.attackAnimTimer = 0.28;
      return;
    }

    enemy.data.hp -= actualDamage;

    if ((enemy.data.type === 'boss' || BOSS_ARENA_ZONES[enemy.data.id]) && enemy.data.hp > 0) {
      this.notifyBossDamaged(enemy.data.id);
    }

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

    // Visual knockback & hurt flash (World Bosses ignore knockback displacement so they never desync from ground/spine)
    const effectiveKnockback = enemy.data.type === 'boss' ? 0 : knockback;
    if (effectiveKnockback > 0) {
      const knockDir = new THREE.Vector3()
        .subVectors(enemy.mesh.position, this.playerPos)
        .normalize();
      enemy.mesh.position.add(knockDir.multiplyScalar(effectiveKnockback));
    }

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
      this.bossManager?.notifyBossDefeated(enemy.data.id);
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
    if (enemy.data.id === 'boss_dragonfang') {
      this.bossCombatStates.delete(enemy.data.id);
      this.bossManager?.setBossCombatActive('boss_dragonfang', false);
      this.clearIgnisPhase2AuraParticles();
    }

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
      // Controlled by BossManager Follow-the-Leader spine kinematics
      return;
    }
    if (enemy.data.id === 'boss_dragonfang') {
      if (enemy.parts.leftWing && enemy.parts.rightWing) {
        const flap = Math.sin(enemy.walkCycle * 2);
        enemy.parts.leftWing.rotation.z = flap * 0.35;
        enemy.parts.rightWing.rotation.z = -flap * 0.35;
        if (enemy.parts.leftElbow && enemy.parts.rightElbow) {
          enemy.parts.leftElbow.rotation.z = Math.sin(enemy.walkCycle * 2 - 0.45) * 0.22;
          enemy.parts.rightElbow.rotation.z = -Math.sin(enemy.walkCycle * 2 - 0.45) * 0.22;
        }
      }
      if (enemy.parts.tail) {
        enemy.parts.tail.rotation.y = Math.sin(enemy.walkCycle * 0.8) * 0.32;
      }
      if (Array.isArray(enemy.parts.tailSegments)) {
        for (let tIdx = 0; tIdx < enemy.parts.tailSegments.length; tIdx++) {
          const seg = enemy.parts.tailSegments[tIdx];
          if (seg?.rotation) {
            seg.rotation.y = Math.sin(enemy.walkCycle * 1.1 - tIdx * 0.45) * 0.14;
          }
        }
      }
      if (enemy.parts.jaw) {
        enemy.parts.jaw.rotation.x = 0.08 + Math.max(0, Math.sin(enemy.walkCycle * 0.9)) * 0.12;
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
    } else if (enemy.data.id === 'boss_titan') {
      const phase = enemy.walkCycle * 0.55;
      const swing = Math.sin(phase);
      if (enemy.parts.leftLeg && enemy.parts.rightLeg) {
        enemy.parts.leftLeg.rotation.x = swing * 0.36;
        enemy.parts.rightLeg.rotation.x = -swing * 0.36;
      }
      if (enemy.parts.leftArm && enemy.parts.rightArm) {
        enemy.parts.leftArm.rotation.x = -swing * 0.34;
        enemy.parts.rightArm.rotation.x = swing * 0.34;
      }
      if (enemy.parts.torso) {
        const baseY = enemy.parts.baseTorsoY ?? 8.4;
        enemy.parts.torso.position.y = baseY + Math.abs(Math.cos(phase)) * 0.35;
        enemy.parts.torso.rotation.y = swing * 0.08;
      }
      const curSign = swing >= 0 ? 1 : -1;
      if (enemy.lastStepSign !== undefined && curSign !== enemy.lastStepSign) {
        const footSideOffset = curSign > 0 ? 1.95 : -1.95;
        const rotY = enemy.mesh.rotation.y;
        const footPos = new THREE.Vector3(
          enemy.mesh.position.x + Math.cos(rotY) * footSideOffset,
          enemy.mesh.position.y + 0.15,
          enemy.mesh.position.z - Math.sin(rotY) * footSideOffset
        );
        this.spawnSparks(footPos, 0x9ca3af, 6, 3.2);
        if (this.playerPos.distanceTo(enemy.mesh.position) <= 44.0) {
          this.triggerCameraShake(0.14);
        }
      }
      enemy.lastStepSign = curSign;
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
    if (enemy.data.id === 'boss_dragonfang' && this.bossManager) {
      this.bossManager.resetDragonSkeletonPose(enemy);
      enemy.mesh.rotation.y = enemy.spawnRotY ?? Math.PI;
      return;
    }
    const s = enemy.data.id === 'boss_dragonfang' ? 4.2 : ((enemy.data.id === 'boss_jarrus' || enemy.data.id === 'boss_titan') ? 1.0 : (enemy.data.type === 'boss' ? 3.5 : (enemy.data.type === 'golem' ? 1.35 : 1.0)));
    enemy.mesh.scale.set(s, s, s);
    if (enemy.parts) {
      if (enemy.data.id === 'boss_titan' && enemy.parts.torso) {
        enemy.parts.torso.position.set(0, enemy.parts.baseTorsoY ?? 8.4, 0);
        enemy.parts.torso.rotation.set(0, 0, 0);
      }
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
    // 1. Reset HP, dead flag, & all combat status flags BEFORE AI runs
    enemy.data.isDead = false;
    enemy.data.hp = explicitHp ?? enemy.data.maxHp;
    enemy.respawnTimer = 0;
    enemy.deathTimer = 0;
    enemy.isReturning = false;
    enemy.isAttacking = false;
    enemy.attackCooldown = 0;
    enemy.stunTimer = 0;
    enemy.slowTimer = 0;
    enemy.brittleTimer = 0;
    enemy.armorBreakTimer = 0;
    enemy.velocity?.set(0, 0, 0);

    // 2. Hard reset root transform & facing orientation (fixes crooked/tilted corpse after Ignis respawn)
    const spawn = enemy.spawnPos || new THREE.Vector3(...enemy.data.position);
    const spawnY = this.world.getTerrainHeight(spawn.x, spawn.z);
    enemy.mesh.position.set(spawn.x, spawnY, spawn.z);
    enemy.mesh.quaternion.identity();
    enemy.mesh.rotation.order = 'XYZ';
    enemy.mesh.rotation.set(0, enemy.spawnRotY ?? 0, 0);
    const s = enemy.data.id === 'boss_dragonfang' ? 4.2 : ((enemy.data.id === 'boss_jarrus' || enemy.data.id === 'boss_titan') ? 1.0 : (enemy.data.type === 'boss' ? 3.5 : (enemy.data.type === 'golem' ? 1.35 : 1.0)));
    enemy.mesh.scale.set(s, s, s);
    enemy.mesh.visible = true;

    // 3. Hard reset skeleton pose, Phase 1 materials, weather, and aura particles for Bosses
    this.resetEnemyPose(enemy);
    const isBoss =
      enemy.data.type === 'boss' ||
      enemy.data.id === 'boss_dragonfang' ||
      enemy.data.id === 'boss_jarrus' ||
      enemy.data.id === 'boss_titan';
    if (isBoss) {
      this.bossCombatStates.delete(enemy.data.id);
      this.bossManager?.resetBoss(enemy.data.id, enemy);
      if (enemy.data.id === 'boss_dragonfang') {
        this.clearIgnisPhase2AuraParticles();
      }
    }

    if (!this.scene.children.includes(enemy.mesh)) {
      this.scene.add(enemy.mesh);
    }

    this.spawnShockwaveRing(new THREE.Vector3(spawn.x, spawnY + 0.1, spawn.z), isBoss ? 0xef4444 : 0x22c55e, isBoss ? 6.5 : 3.2, 0.8);
    this.spawnHitStarburst(new THREE.Vector3(spawn.x, spawnY + 1.2, spawn.z), isBoss ? 0xff4500 : 0x4ade80, 2.2);

    if (isBoss) {
      this.callbacks.onAddFloatingText(`🔥 [BOSS RESPAWN] ${enemy.data.nameId} telah bangkit kembali!`, '#ef4444', 'crit');
    }
  }

  private checkInteract(): boolean {
    if (this.triggerActiveInteriorPortal()) {
      return true;
    }

    // Execute nearby active prompt action (doors, portals, altars, NPCs, chests) immediately upon [F] key press
    if (this.currentPromptAction) {
      this.currentPromptAction();
      return true;
    }

    const activeRoom = this.world?.interiorManager?.activeRoom ?? null;
    if (activeRoom) {
      for (const npc of activeRoom.npcs) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...npc.position));
        if (dist < 4.2) {
          this.callbacks.onInteractNPC(npc.dialogueId || npc.id);
          return true;
        }
      }
      for (const chest of activeRoom.chests) {
        if (!chest.opened) {
          const dist = this.playerPos.distanceTo(new THREE.Vector3(...chest.position));
          if (dist < 3.4) {
            this.openChest(chest);
            return true;
          }
        }
      }
      return false;
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
    if (this.mobileAimActiveSlot === 'dash' && this.mobileAimNormalized.active && this.mobileAimWorldDir.lengthSq() > 0.01) {
      return this.mobileAimWorldDir.clone().normalize();
    }
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
    const activeRoom = this.world?.interiorManager?.activeRoom ?? null;
    if (activeRoom) {
      const playerRadius = 0.65;
      let resX = candidateX;
      let resZ = candidateZ;
      for (let pass = 0; pass < 2; pass++) {
        for (const col of activeRoom.colliders) {
          if (col.minY !== undefined && this.playerPos.y + 1.6 < col.minY) continue;
          if (col.maxY !== undefined && this.playerPos.y > col.maxY) continue;
          if (col.type === 'circle' && col.x !== undefined && col.z !== undefined && col.radius !== undefined) {
            const dx = resX - col.x;
            const dz = resZ - col.z;
            const minDist = col.radius + playerRadius;
            const distSq = dx * dx + dz * dz;
            if (distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq) || 0.001;
              const overlap = minDist - dist;
              resX += (dx / dist) * overlap;
              resZ += (dz / dist) * overlap;
            }
          } else if (
            col.type === 'box' &&
            col.minX !== undefined &&
            col.maxX !== undefined &&
            col.minZ !== undefined &&
            col.maxZ !== undefined
          ) {
            const closestX = Math.max(col.minX, Math.min(resX, col.maxX));
            const closestZ = Math.max(col.minZ, Math.min(resZ, col.maxZ));
            const dx = resX - closestX;
            const dz = resZ - closestZ;
            const distSq = dx * dx + dz * dz;
            if (distSq < playerRadius * playerRadius) {
              const dist = Math.sqrt(distSq);
              if (dist > 0.0001) {
                const overlap = playerRadius - dist;
                resX += (dx / dist) * overlap;
                resZ += (dz / dist) * overlap;
              } else {
                const left = Math.abs(resX - col.minX);
                const right = Math.abs(col.maxX - resX);
                const top = Math.abs(resZ - col.minZ);
                const bottom = Math.abs(col.maxZ - resZ);
                const minEdge = Math.min(left, right, top, bottom);
                if (minEdge === left) resX = col.minX - playerRadius;
                else if (minEdge === right) resX = col.maxX + playerRadius;
                else if (minEdge === top) resZ = col.minZ - playerRadius;
                else resZ = col.maxZ + playerRadius;
              }
            }
          }
        }
        const clamped = activeRoom.clampInsideWalls(resX, resZ, playerRadius);
        resX = clamped.x;
        resZ = clamped.z;
      }
      return { x: resX, z: resZ };
    }

    if (!this.world.colliders || this.world.colliders.length === 0) {
      return { x: candidateX, z: candidateZ };
    }

    const playerRadius = 0.65;
    let resX = candidateX;
    let resZ = candidateZ;

    // Two-pass resolution cleanly eliminates corner catching and penetrating walls
    const inInterior = this.playerPos.y < -10;
    for (let pass = 0; pass < 2; pass++) {
      for (const col of (this.world?.interiorManager?.activeRoom?.colliders ?? this.world.colliders)) {
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
    if (this.interiorTransitionCooldown > 0) {
      this.interiorTransitionCooldown = Math.max(0, this.interiorTransitionCooldown - delta);
    }

    if (this.menuMode === 'gameplay' && !this.isTransitioningInterior && this.world?.interiorManager) {
      const hitPortal = this.world.interiorManager.findClosestPortal(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      if (this.interiorRearmLocked) {
        if (!hitPortal) {
          this.interiorRearmLocked = false;
        }
        this.interiorAutoDwellTimer = 0;
      } else if (this.interiorTransitionCooldown <= 0 && hitPortal && hitPortal.dist <= hitPortal.portal.autoRadius) {
        this.interiorAutoDwellTimer += delta;
        if (this.interiorAutoDwellTimer >= 0.4) {
          this.interiorAutoDwellTimer = 0;
          this.executePortalTransition(hitPortal.portal);
          return;
        }
      } else {
        this.interiorAutoDwellTimer = 0;
      }
    } else {
      this.interiorAutoDwellTimer = 0;
    }

    if (this.teleportGraceTimer > 0) {
      this.teleportGraceTimer -= delta;
      this.playerVel.set(0, 0, 0);
      this.isGrounded = true;
      const activeGraceRoom = this.world?.interiorManager?.activeRoom ?? null;
      if (activeGraceRoom) {
        this.playerPos.y = activeGraceRoom.getFloorHeight(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      } else if (isInsideMageTowerInterior(this.playerPos.x, this.playerPos.y, this.playerPos.z)) {
        this.playerPos.y = getMageTowerFloorHeight(this.playerPos.y);
      }
      this.playerMesh.group.position.copy(this.playerPos);
      return;
    }

    // Mage Glacial Barrage: Hold-to-Aim interactive aiming frame & strafe walk
    if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
      this.updateGlacialAimFrame(delta);
    }

    // Mobile Right-Thumb Drag Aim live per-frame sync (maintains aim while running / turning camera)
    if (this.mobileAimActiveSlot !== null && this.mobileAimNormalized.active) {
      if (this.mobileAimActiveSlot === 'basic' && this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
        this.updateMobileBowAimFrame(32.0, 0xfbbf24);
      } else if (this.mobileAimActiveSlot === 'dash') {
        const dashDist = this.charClass === 'mage' ? 12.0 : this.charClass === 'rogue' ? 9.5 : 4.5;
        this.updateMobileDashAimFrame(dashDist);
      } else if (this.mobileAimActiveSlot === 'ult' && this.charClass === 'mage') {
        this.updateMobileStarfallAimFrame();
      } else if (this.mobileAimActiveSlot === 'skill1' && this.charClass === 'warrior') {
        this.updateMobileDashAimFrame(11.0);
      } else if (this.mobileAimActiveSlot === 'ult' && this.charClass === 'warrior') {
        this.updateMobileDashAimFrame(22.0);
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

    // Hunter Bow Skill 1 (Q): Panah Rajawali Astral hold-to-charge (>= 220ms)
    if (this.astralEagleAimState.isCharging && !this.astralEagleAimState.cancelled && this.charClass === 'rogue' && this.hunterWeaponMode === 'bow') {
      this.updateAstralEagleChargeFrame(delta);
    }

    // Hunter Bow Ultimate (F): Hold-to-Aim interactive Badai Panah Agung frame
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
      const groundY = getSolidGroundHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
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
      const activeRoomLocked = this.world?.interiorManager?.activeRoom ?? null;
      const groundY = activeRoomLocked
        ? this.getActiveGroundHeight(this.playerPos.x, this.playerPos.y, this.playerPos.z)
        : getSolidGroundHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
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
      !this.isChargingAstralEagle &&
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

    // Sinkronkan stance senjata Pemburu (Siaga vs Handless tanpa override Sprint)
    if (this.charClass === 'rogue') {
      this.syncHunterWeaponModel();
    }

    // Cek zona Danau Lahar Kaldera Naga (radius 53.3..89.2 di luar jembatan & koridor masuk utara)
    const distCalderaLava = Math.hypot(this.playerPos.x - 40, this.playerPos.z - 840);
    const onCalderaBridge = isPointOnBridgeDeck(this.playerPos.x, this.playerPos.z, 0.3);
    const inNorthBridgeEntry =
      Math.abs(this.playerPos.x - 40) <= 5.4 && this.playerPos.z >= 742 && this.playerPos.z <= 795;
    const inLavaMoatZone =
      distCalderaLava >= 53.3 &&
      distCalderaLava <= 89.2 &&
      !onCalderaBridge &&
      !inNorthBridgeEntry;
    const isWadingInLava = inLavaMoatZone && this.playerPos.y <= 0.65;

    let targetSpeed = baseSpeed;
    if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
      targetSpeed = baseSpeed * 0.55; // 55% normal movement speed while aiming Glacial Barrage
    } else if (this.isAimingBow || this.isChargingAstralEagle || this.astralEagleAimState.isCharging) {
      targetSpeed = baseSpeed * 0.65; // Strafe walk 65% speed while aiming / charging Hunter Bow
    } else if (this.isAimingArrowVolley || this.arrowVolleyAimState.isCharging) {
      targetSpeed = baseSpeed * 0.65; // Strafe walk 65% speed while aiming Ultimate Badai Panah Agung
    } else {
      if (this.isPlayerStealthed) {
        targetSpeed *= 1.20; // Stealth Bom Asap: +20% Movement Speed
      }
      if (this.bossManager?.playerDebuffs?.isSlowed) {
        targetSpeed *= 0.5; // Efek Slow -50% pergerakan dari Boss / Sand Spikes
      }
      if (isWadingInLava) {
        targetSpeed *= 0.70; // Hambatan gerak lahar kental -30% (tetap bisa lompat/dash keluar)
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

      const isAimingNow =
        this.isAimGlacialActive ||
        this.glacialAimState.isCharging ||
        this.isAimingBow ||
        this.isHoldingBowAttack ||
        this.isChargingAstralEagle ||
        this.astralEagleAimState.isCharging ||
        this.isAimingArrowVolley ||
        this.arrowVolleyAimState.isCharging ||
        (this.mobileAimActiveSlot !== null && this.mobileAimNormalized.active);

      // Rotate player mesh smoothly to facing direction or keep right-thumb drag aim orientation
      if (isAimingNow) {
        if (this.mobileAimActiveSlot !== null && this.mobileAimNormalized.active && this.mobileAimWorldDir.lengthSq() > 0.01) {
          this.playerRotationY = Math.atan2(this.mobileAimWorldDir.x, this.mobileAimWorldDir.z);
        } else {
          const camFwdX = -Math.sin(this.cameraAngleH);
          const camFwdZ = -Math.cos(this.cameraAngleH);
          this.playerRotationY = Math.atan2(camFwdX, camFwdZ);
        }
        if (this.playerMesh?.group) {
          this.playerMesh.group.rotation.y = this.playerRotationY;
        }
        if (this.isAimGlacialActive || this.glacialAimState.isCharging) {
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
      if (
        this.isAimGlacialActive ||
        this.glacialAimState.isCharging ||
        this.isAimingBow ||
        this.isHoldingBowAttack ||
        this.isChargingAstralEagle ||
        this.astralEagleAimState.isCharging ||
        this.isAimingArrowVolley ||
        (this.mobileAimActiveSlot !== null && this.mobileAimNormalized.active)
      ) {
        if (this.mobileAimActiveSlot !== null && this.mobileAimNormalized.active && this.mobileAimWorldDir.lengthSq() > 0.01) {
          this.playerRotationY = Math.atan2(this.mobileAimWorldDir.x, this.mobileAimWorldDir.z);
        } else {
          const camFwdX = -Math.sin(this.cameraAngleH);
          const camFwdZ = -Math.cos(this.cameraAngleH);
          this.playerRotationY = Math.atan2(camFwdX, camFwdZ);
        }
        if (this.playerMesh?.group) {
          this.playerMesh.group.rotation.y = this.playerRotationY;
        }
      }
      this.mageBankingRoll = THREE.MathUtils.lerp(this.mageBankingRoll, 0, Math.min(1.0, delta * 8.0));
    }

    // 4. Calculate movement with building collisions & cliff climbing physics
    const oldX = this.playerPos.x;
    const oldZ = this.playerPos.z;
    const currentGroundY = getSolidGroundHeight(oldX, oldZ, this.playerPos.y);

    let nextX = oldX + this.playerVel.x * delta;
    let nextZ = oldZ + this.playerVel.z * delta;

    // 4a. Resolve building and obstacle colliders (no passing through buildings)
    const resolved = this.resolveCollisions(nextX, nextZ);
    nextX = resolved.x;
    nextZ = resolved.z;

    // 4b. Terrain slope & Cliff climbing physics
    const targetGroundY = this.getActiveGroundHeight(nextX, this.playerPos.y, nextZ);
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
        const hDiffX = this.getActiveGroundHeight(resXOnly.x, this.playerPos.y, oldZ) - currentGroundY;

        const resZOnly = this.resolveCollisions(oldX, oldZ + this.playerVel.z * delta);
        const hDiffZ = this.getActiveGroundHeight(oldX, this.playerPos.y, resZOnly.z) - currentGroundY;

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

    const activeRoom = this.world?.interiorManager?.activeRoom ?? null;

    if (activeRoom) {
      // Interior Physics Isolation: clamp strictly to interior walls & skip outdoor world bounds/zones
      const clampedRoomPos = activeRoom.clampInsideWalls(nextX, nextZ, 0.65);
      this.playerPos.x = clampedRoomPos.x;
      this.playerPos.z = clampedRoomPos.z;
    } else {
      // Expanded World boundary constraints
      if (nextX < WORLD_BOUNDS.minX + 5) nextX = WORLD_BOUNDS.minX + 5;
      if (nextX > WORLD_BOUNDS.maxX - 5) nextX = WORLD_BOUNDS.maxX - 5;
      if (nextZ < WORLD_BOUNDS.minZ + 5) nextZ = WORLD_BOUNDS.minZ + 5;
      if (nextZ > WORLD_BOUNDS.maxZ - 5) nextZ = WORLD_BOUNDS.maxZ - 5;

      this.playerPos.x = nextX;
      this.playerPos.z = nextZ;

      // Check quest discovery for Fortress Village Val-Kragor
      if (Math.hypot(nextX - 520, nextZ - 10) <= 50) {
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

      // Check quest discovery for Grand Imperial Kingdom of Astraea
      if (Math.hypot(nextX - 320, nextZ - -260) <= 65) {
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
    }

    // Gravity
    this.playerVel.y -= 22 * delta;
    this.playerPos.y += this.playerVel.y * delta;

    if (activeRoom) {
      const roomFloorY = this.getActiveGroundHeight(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      if (this.playerPos.y <= roomFloorY + 0.15) {
        this.playerPos.y = roomFloorY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      } else if (this.isGrounded && this.playerPos.y - roomFloorY < 0.78) {
        // Keep downward movement smoothly snapped to interior spiral stairs & ramps
        this.playerPos.y = roomFloorY;
        this.playerVel.y = 0;
      }
      const constrained = activeRoom.clampInsideWalls(this.playerPos.x, this.playerPos.z, 0.65);
      this.playerPos.x = constrained.x;
      this.playerPos.z = constrained.z;
    } else {
      // Solid walkable surface collision (terrain + bridges + docks + altars + stairs) and Ocean/Lava surface
      const rawGroundY = getSolidGroundHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
      const groundY = inLavaMoatZone && rawGroundY < -0.15 ? -0.15 : rawGroundY;
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
        } else if (this.isGrounded && this.playerPos.y - groundY < 0.78) {
          // Snap to ground on gentle slope/stair descents to prevent floating down hills & steps
          this.playerPos.y = groundY;
          this.playerVel.y = 0;
        }
      }
    }

    // Absolute ground floor clamp: prevent sinking into terrain/surfaces during delta spike or steep slope descents
    if (!activeRoom) {
      const rawFloorY = getSolidGroundHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
      const minFloorY = inLavaMoatZone && rawFloorY < -0.15 ? -0.15 : rawFloorY;
      if (this.playerPos.y < minFloorY) {
        this.playerPos.y = minFloorY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
    }

    // Sistem Hazard Damage Danau Lahar Kaldera (-18 HP tiap 0.5 detik, hormati God Mode & permukaan solid jembatan)
    if (!activeRoom && inLavaMoatZone && this.playerPos.y <= 0.65) {
      this.lavaDamageTimer += delta;
      if (this.lavaDamageTimer >= 0.5) {
        this.lavaDamageTimer -= 0.5;
        this.spawnSparks(
          new THREE.Vector3(this.playerPos.x, Math.max(0.15, this.playerPos.y + 0.25), this.playerPos.z),
          0xff5722,
          10,
          4.5
        );
        soundManager.playHit();
        if (!this.devSettings.godMode) {
          this.callbacks.onUpdateStats((stats) => {
            // Mengabaikan sebagian armor (~12% defense) agar lahar terasa mematikan ~18 HP
            const rawLavaDmg = Math.max(12, 18 - Math.round(stats.baseDefense * 0.12));
            const finalLavaDmg = Math.max(0, this.absorbDamageWithShield(rawLavaDmg).remainingDamage);
            const nextHp = Math.max(0, stats.hp - finalLavaDmg);
            if (finalLavaDmg > 0) {
              this.callbacks.onAddFloatingText(`🔥 TERBAKAR LAHAR! -${finalLavaDmg}`, '#ff3d00', 'damage');
              this.handlePlayerTookDamage(finalLavaDmg);
            }
            if (nextHp <= 0) {
              this.respawnPlayerAtLastVisitedTown();
            }
            return { ...stats, hp: nextHp };
          });
        } else {
          this.callbacks.onAddFloatingText('🔥 KEBAL LAHAR (GOD MODE)!', '#38bdf8', 'info');
        }
      }
    } else {
      this.lavaDamageTimer = 0;
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
      // Kunci orientasi root grup datar, sementara torso atas condong ke depan (+Z) saat sprint
      if (!this.isGaleVaulting) {
        this.playerMesh.group.rotation.x = 0;
        this.playerMesh.group.rotation.z = 0;
      }
      if (this.playerMesh.body) {
        const isSprintPosture = this.isSprinting && isMoving && this.playerStamina > 0;
        this.playerMesh.body.rotation.x = isSprintPosture ? 0.36 : 0;
        this.playerMesh.body.rotation.z = 0;
        this.playerMesh.body.position.y = isSprintPosture ? 1.16 : 1.18;
        this.playerMesh.body.position.z = isSprintPosture ? 0.06 : 0;
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
        if (
          this.hunterWeaponMode === 'bow' &&
          !this.isAimingArrowVolley &&
          (this.isChargingAstralEagle || this.astralEagleAimState.isCharging)
        ) {
          this.walkCycle = (this.walkCycle || 0) + delta * 8.5;
          animateHunterBowAim(
            this.playerMesh,
            this.isChargingAstralEagle ? this.astralEagleChargeRatio : 0.25,
            true,
            this.walkCycle,
            delta,
            true,
            true
          );
        } else if (
          this.hunterWeaponMode === 'bow' &&
          !this.isAimingArrowVolley &&
          (this.isAimingBow || this.isHoldingBowAttack || this.bowCombatStanceTimer > 0)
        ) {
          this.walkCycle = (this.walkCycle || 0) + delta * 8.5;
          animateHunterBowAim(
            this.playerMesh,
            this.isAimingBow ? this.bowChargeRatio : this.isHoldingBowAttack ? 0.25 : 0.42,
            true,
            this.walkCycle,
            delta,
            this.isAimingBow || this.isHoldingBowAttack
          );
        } else {
          const isHunterSprint = this.isSprinting && isMoving && this.playerStamina > 0;
          const moveSpeed = this.isSprinting ? 1.75 : 1.0;
          // Frekuensi dinaikkan 1.45x saat lari cepat agar tapakan kaki lincah membelah angin
          const stepFrequency = this.isSprinting ? 19.5 : 13.5;
          this.walkCycle = (this.walkCycle || 0) + delta * stepFrequency * moveSpeed;

          // Ayunan kaki kiri & kanan (phase sin(walkCycle) 180° berlawanan lengan)
          const legSwing = Math.sin(this.walkCycle);
          const armSwing = Math.cos(this.walkCycle);

          const lerpFactor = Math.min(1, delta * 12.0);
          if (isHunterSprint) {
            // ========================================================================
            // POSTUR & ANIMASI LARI CEPAT AGILE ASSASSIN (DYNAMIC FORWARD LEAN & ATHLETIC PUMP)
            // ========================================================================
            // 1. Stride cepat lebar (±0.88 rad) dengan tekukan lutut atletis & pantulan vertikal halus
            this.playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftLeg.rotation.x, legSwing * 0.88, 0.35);
            this.playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightLeg.rotation.x, -legSwing * 0.88, 0.35);
            if (this.playerMesh.leftKnee) {
              this.playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.82 : 0.18;
            }
            if (this.playerMesh.rightKnee) {
              this.playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.82 : 0.18;
            }
            const sprintBob = Math.abs(Math.sin(this.walkCycle)) * 0.06;
            this.playerMesh.group.position.y = this.playerPos.y + sprintBob;

            // 2. Ayunan lengan atletis natural (±0.75 rad, 180° berlawanan kaki, tanpa bias kaku ke belakang!)
            // Catatan koordinat -Y: X negatif mengangkat lengan ke depan (+Z), X positif ke belakang (-Z).
            if (!this.isAttacking) {
              const isBowCarry = this.isWeaponDrawn && this.hunterWeaponMode === 'bow';
              const targetLeftArmX = isBowCarry ? -0.34 - legSwing * 0.14 : -0.14 - legSwing * 0.75;
              const targetRightArmX = isBowCarry ? -0.14 + legSwing * 0.68 : -0.14 + legSwing * 0.75;
              this.playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.x, targetLeftArmX, 0.35);
              this.playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.y, isBowCarry ? 0.16 : 0.10, lerpFactor);
              this.playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.z, isBowCarry ? -0.14 : -0.10, lerpFactor);
              this.playerMesh.leftArm.position.set(-0.325, 1.38, isBowCarry ? 0.14 : 0.13);

              this.playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.x, targetRightArmX, 0.35);
              this.playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.y, -0.10, lerpFactor);
              this.playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.z, 0.10, lerpFactor);
              this.playerMesh.rightArm.position.set(0.325, 1.38, 0.13);
            }

            // 3. Torso benar-benar condong ke DEPAN (+Z ~20.6° / 0.36 rad) & kepala mendongak (-0.22 rad) agar mata cyan lurus ke depan
            if (this.playerMesh.body) {
              this.playerMesh.body.rotation.reorder('YXZ');
              this.playerMesh.body.rotation.x = THREE.MathUtils.lerp(this.playerMesh.body.rotation.x, 0.36, lerpFactor);
              this.playerMesh.body.position.set(
                0,
                THREE.MathUtils.lerp(this.playerMesh.body.position.y, 1.16, lerpFactor),
                THREE.MathUtils.lerp(this.playerMesh.body.position.z, 0.06, lerpFactor)
              );
            }
            if (this.playerMesh.head) {
              this.playerMesh.head.rotation.x = THREE.MathUtils.lerp(this.playerMesh.head.rotation.x, -0.22, lerpFactor);
              this.playerMesh.head.position.set(
                0,
                THREE.MathUtils.lerp(this.playerMesh.head.position.y, 1.47, lerpFactor),
                THREE.MathUtils.lerp(this.playerMesh.head.position.z, 0.12, lerpFactor)
              );
            }

            // 4. Kibaran ekor jubah mengikuti kecepatan
            if (this.playerMesh.cape) {
              const targetCape = 0.48 + Math.abs(Math.sin(this.walkCycle * 0.5)) * 0.14;
              this.playerMesh.cape.rotation.x = THREE.MathUtils.lerp(this.playerMesh.cape.rotation.x, targetCape, lerpFactor);
            }

            // 5. Speed lines angin tipis di belakang bahu, punggung & tumit (bebas kotak partikel pekat!)
            this.hunterAfterimageSpawnTimer = 0;
            this.sprintStreakTimer -= delta;
            if (this.sprintStreakTimer <= 0) {
              this.sprintStreakTimer = 0.045;
              this.spawnSprintWindStreaks();
            }
          } else {
            // Normal Walking (transisi lerp mulus walk <-> sprint <-> idle)
            this.hunterAfterimageSpawnTimer = 0;
            this.sprintStreakTimer = 0;
            this.playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.leftLeg.rotation.x, legSwing * 0.75, 0.35);
            this.playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightLeg.rotation.x, -legSwing * 0.75, 0.35);
            if (this.playerMesh.leftKnee) {
              this.playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.4 : 0;
            }
            if (this.playerMesh.rightKnee) {
              this.playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.4 : 0;
            }

            if (!this.isAttacking) {
              const isBowCarry = this.isWeaponDrawn && this.hunterWeaponMode === 'bow';
              this.playerMesh.leftArm.position.set(-0.325, 1.42, isBowCarry ? 0.05 : 0.02);
              this.playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
              this.playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(
                this.playerMesh.leftArm.rotation.x,
                isBowCarry ? -0.22 + armSwing * 0.12 : -0.32 + armSwing * 0.42,
                0.3
              );
              this.playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.y, isBowCarry ? 0.14 : 0, lerpFactor);
              this.playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.z, isBowCarry ? -0.15 : 0, lerpFactor);
              this.playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.x, -0.32 - armSwing * 0.42, 0.3);
              this.playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.y, 0, lerpFactor);
              this.playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(this.playerMesh.rightArm.rotation.z, 0, lerpFactor);
            }

            if (this.playerMesh.body) {
              this.playerMesh.body.rotation.x = THREE.MathUtils.lerp(this.playerMesh.body.rotation.x, 0, lerpFactor);
              this.playerMesh.body.position.set(
                0,
                THREE.MathUtils.lerp(this.playerMesh.body.position.y, 1.18, lerpFactor),
                THREE.MathUtils.lerp(this.playerMesh.body.position.z, 0, lerpFactor)
              );
            }
            if (this.playerMesh.head) {
              this.playerMesh.head.rotation.set(THREE.MathUtils.lerp(this.playerMesh.head.rotation.x, 0, lerpFactor), 0, 0);
              this.playerMesh.head.position.set(
                0,
                THREE.MathUtils.lerp(this.playerMesh.head.position.y, 1.50, lerpFactor),
                THREE.MathUtils.lerp(this.playerMesh.head.position.z, 0, lerpFactor)
              );
            }
            if (this.playerMesh.cape) {
              this.playerMesh.cape.rotation.x = THREE.MathUtils.lerp(
                this.playerMesh.cape.rotation.x,
                0.12 + Math.abs(Math.sin(this.walkCycle * 0.5)) * 0.08,
                lerpFactor
              );
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
        if (
          this.hunterWeaponMode === 'bow' &&
          !this.isAimingArrowVolley &&
          (this.isChargingAstralEagle || this.astralEagleAimState.isCharging)
        ) {
          animateHunterBowAim(
            this.playerMesh,
            this.isChargingAstralEagle ? this.astralEagleChargeRatio : 0.25,
            false,
            0,
            delta,
            true,
            true
          );
        } else if (
          this.hunterWeaponMode === 'bow' &&
          !this.isAimingArrowVolley &&
          (this.isAimingBow || this.isHoldingBowAttack || this.bowCombatStanceTimer > 0)
        ) {
          animateHunterBowAim(
            this.playerMesh,
            this.isAimingBow ? this.bowChargeRatio : this.isHoldingBowAttack ? 0.25 : 0.42,
            false,
            0,
            delta,
            this.isAimingBow || this.isHoldingBowAttack
          );
        } else {
          // Saat pemain melepas tombol arah (!this.isMoving):
          // Lakukan lerp cepat (kecepatan 0.25) pada rotation.x kaki dan tangan kembali ke sudut 0 (posisi berdiri netral).
          // Reset atau jeda walkCycle agar langkah tidak berhenti di pose kaki terbelah canggung.
          this.walkCycle = 0;
          this.hunterAfterimageSpawnTimer = 0;
          this.sprintStreakTimer = 0;
          const idleLerp = Math.min(1, delta * 12.0);
          if (this.playerMesh.leftArm) {
            this.playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
          }
          if (this.playerMesh.rightArm) {
            this.playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
          }
          if (this.playerMesh.head) {
            this.playerMesh.head.rotation.set(THREE.MathUtils.lerp(this.playerMesh.head.rotation.x, 0, idleLerp), 0, 0);
            this.playerMesh.head.position.set(
              0,
              THREE.MathUtils.lerp(this.playerMesh.head.position.y, 1.50, idleLerp),
              THREE.MathUtils.lerp(this.playerMesh.head.position.z, 0, idleLerp)
            );
          }
          if (this.playerMesh.body) {
            this.playerMesh.body.rotation.set(THREE.MathUtils.lerp(this.playerMesh.body.rotation.x, 0, idleLerp), 0, 0);
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
            const isBowCarry = this.isWeaponDrawn && this.hunterWeaponMode === 'bow';
            const isQuickDraw = this.weaponDrawTransitionTimer > 0;
            if (this.playerMesh.leftArm) {
              this.playerMesh.leftArm.position.set(-0.325, 1.42, isBowCarry ? 0.05 : 0.02);
              this.playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(
                this.playerMesh.leftArm.rotation.x,
                isQuickDraw ? -0.45 : isBowCarry ? -0.22 : 0,
                0.28
              );
              this.playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.y, isBowCarry ? 0.14 : 0, 0.25);
              this.playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(this.playerMesh.leftArm.rotation.z, isBowCarry ? -0.16 : 0, 0.25);
            }
            if (this.playerMesh.rightArm) {
              this.playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
              this.playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(
                this.playerMesh.rightArm.rotation.x,
                isQuickDraw ? 0.42 : 0,
                0.28
              );
              this.playerMesh.rightArm.rotation.y = 0;
              this.playerMesh.rightArm.rotation.z = 0;
            }
          }

          if (this.playerMesh.cape) {
            this.playerMesh.cape.rotation.x = THREE.MathUtils.lerp(this.playerMesh.cape.rotation.x, 0.09, 0.25);
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
        const isHunterSprint =
          this.charClass === 'rogue' &&
          this.isSprinting &&
          isMoving &&
          this.playerStamina > 0 &&
          !this.isAttacking &&
          !this.isAimingBow &&
          !this.isHoldingBowAttack &&
          !this.isChargingAstralEagle &&
          !this.isAimingArrowVolley &&
          this.bowCombatStanceTimer <= 0;
        const lockLerp = Math.min(1, delta * 12.0);
        const targetBodyLeanX = isHunterSprint ? 0.36 : 0;
        if (this.playerMesh.body) {
          this.playerMesh.body.rotation.reorder('YXZ');
          this.playerMesh.body.rotation.x = THREE.MathUtils.lerp(this.playerMesh.body.rotation.x, targetBodyLeanX, lockLerp);
          this.playerMesh.body.rotation.z = 0; // KUNCI MUTLAK: DILARANG MIRING
          if (this.charClass === 'rogue') {
            this.playerMesh.body.position.set(
              0,
              THREE.MathUtils.lerp(this.playerMesh.body.position.y, isHunterSprint ? 1.16 : 1.18, lockLerp),
              THREE.MathUtils.lerp(this.playerMesh.body.position.z, isHunterSprint ? 0.06 : 0, lockLerp)
            );
          }
        }
        if (this.playerMesh.head) {
          if (this.charClass === 'rogue') {
            this.playerMesh.head.rotation.x = THREE.MathUtils.lerp(
              this.playerMesh.head.rotation.x,
              isHunterSprint ? -0.22 : 0,
              lockLerp
            );
            this.playerMesh.head.position.set(
              0,
              THREE.MathUtils.lerp(this.playerMesh.head.position.y, isHunterSprint ? 1.47 : 1.50, lockLerp),
              THREE.MathUtils.lerp(this.playerMesh.head.position.z, isHunterSprint ? 0.12 : 0, lockLerp)
            );
          } else if (this.charClass === 'mage') {
            this.playerMesh.head.position.set(0, 2.08, 0);
          }
        }
      }
      if (
        !this.isAttacking &&
        !this.isAimingBow &&
        !this.isHoldingBowAttack &&
        !this.isChargingAstralEagle &&
        !this.astralEagleAimState.isCharging &&
        !this.isAimingArrowVolley &&
        this.bowCombatStanceTimer <= 0
      ) {
        if (this.playerMesh.body && !isMageGliding) {
          this.playerMesh.body.rotation.y = THREE.MathUtils.lerp(this.playerMesh.body.rotation.y || 0, 0, 0.2);
          if (Math.abs(this.playerMesh.body.rotation.y) < 0.001) {
            this.playerMesh.body.rotation.y = 0;
          }
        }
        if (this.charClass === 'rogue' && this.playerMesh.head) {
          this.playerMesh.head.rotation.y = THREE.MathUtils.lerp(this.playerMesh.head.rotation.y || 0, 0, 0.2);
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
      } else if (this.attackType === 'hunter_volley_release') {
        // Fase 1 Badai Panah: Pose memanah mendongak ke langit (~0.45s) & menembakkan panah pembuka ke atas
        animateHunterSkyVolley(
          this.playerMesh,
          1 - progress,
          isMoving,
          this.walkCycle,
          delta
        );
      } else if (
        this.attackType === 'bow_shot' ||
        this.attackType === 'bow_barrage' ||
        this.attackType === 'hunter_aim_volley'
      ) {
        // Pose memanah bersih selama menembak / membidik Badai Panah (BackBow tersembunyi, HandBow vertikal)
        const isAimingVolleyPose = this.attackType === 'hunter_aim_volley';
        const drawProgress = isAimingVolleyPose ? 0.65 : 0.38 + Math.sin((1 - progress) * Math.PI) * 0.25;
        animateHunterBowAim(
          this.playerMesh,
          drawProgress,
          isMoving,
          this.walkCycle,
          delta,
          isAimingVolleyPose
        );
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
        } else if (this.charClass === 'rogue' && this.playerMesh?.body && this.bowCombatStanceTimer <= 0 && !this.isAimingBow && !this.isHoldingBowAttack) {
          this.playerMesh.body.rotation.set(0, 0, 0);
          this.playerMesh.head?.rotation.set(0, 0, 0);
          this.playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
          this.playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
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
    const interiorMgr = this.world?.interiorManager;
    const activeRoom = interiorMgr?.activeRoom ?? null;

    if (interiorMgr) {
      const match = interiorMgr.findClosestPortal(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      this.activeInteriorPortal = match ? match.portal : null;
      this.callbacks.onInteriorPortalState?.(
        match ? { label: match.portal.label, kind: match.portal.kind, promptText: match.portal.promptText } : null
      );
      if (match) {
        this.setNearbyPrompt(match.portal.promptText, () => {
          this.triggerActiveInteriorPortal();
        });
        return;
      }
    } else {
      this.activeInteriorPortal = null;
    }

    if (activeRoom) {
      for (const npc of activeRoom.npcs) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(...npc.position));
        if (dist < 4.2) {
          this.setNearbyPrompt(`Tekan [F] / Sentuh: ${npc.nameId} (${npc.role})`, () => {
            this.callbacks.onInteractNPC(npc.dialogueId || npc.id);
          });
          return;
        }
      }
      for (const chest of activeRoom.chests) {
        if (!chest.opened) {
          const dist = this.playerPos.distanceTo(new THREE.Vector3(...chest.position));
          if (dist < 3.4) {
            this.setNearbyPrompt('Tekan [F] / Sentuh untuk Buka Peti Harta Karun', () => {
              this.openChest(chest);
            });
            return;
          }
        }
      }
      this.setNearbyPrompt(null);
      return;
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
    const decoyTargetInfo = this.activeShadowDecoy && this.activeShadowDecoy.active
      ? { active: true, position: this.activeShadowDecoy.pos }
      : null;
    this.bossManager.setStealthAndDecoyState(this.isPlayerStealthed, decoyTargetInfo);
    this.bossManager.update(delta, this.playerPos, this.playerVel, this.isDashing || this.isInvulnerable, !this.isGrounded);

    const isMobileLowPerf =
      isMobileRenderDevice() &&
      (this.graphicsSettings.preset === 'low' || this.graphicsSettings.renderDistance <= 160);

    const activeInteriorRoomId = this.world?.interiorManager?.activeRoom?.id ?? null;
    this.enemies.forEach((enemy, enemyIdx) => {
      if (enemy.isIndoorDummy) {
        enemy.mesh.visible = activeInteriorRoomId === enemy.interiorId;
        if (!enemy.mesh.visible) return;
        if (enemy.attackAnimTimer && enemy.attackAnimTimer > 0) {
          enemy.attackAnimTimer = Math.max(0, enemy.attackAnimTimer - delta);
          enemy.mesh.rotation.z = Math.sin(enemy.attackAnimTimer * 28) * 0.14;
        } else {
          enemy.mesh.rotation.z = 0;
        }
        return;
      }
      if (activeInteriorRoomId !== null) {
        enemy.mesh.visible = false;
        return;
      }

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
      } else if (enemy.data.id === 'boss_jarrus' || enemy.data.id === 'boss_titan') {
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
        const groundH = getSolidGroundHeight(ePos.x, ePos.z, ePos.y);
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
      const bossZone = enemy.data.type === 'boss' ? BOSS_ARENA_ZONES[enemy.data.id] : undefined;
      const territoryRadius =
        bossZone?.territoryRadius ||
        enemy.leashRadius ||
        (enemy.data.type === 'boss' ? 42 : 22);

      const playerDistFromArena = bossZone
        ? Math.hypot(this.playerPos.x - bossZone.center.x, this.playerPos.z - bossZone.center.z)
        : distToPlayer;

      // Distance culling & AI/animation throttle (>75u on Mobile Low) berdasarkan pengaturan grafis
      const cullDist = isMobileLowPerf
        ? 75
        : Math.min(85, this.graphicsSettings.renderDistance * 0.9);
      if (
        distToPlayer > cullDist &&
        distFromSpawn > territoryRadius &&
        (!bossZone || playerDistFromArena > territoryRadius + 28)
      ) {
        enemy.mesh.visible = false;
        if (isMobileLowPerf && (this.frameCount + enemyIdx) % 4 !== 0) {
          return;
        }
      } else {
        enemy.mesh.visible = true;
      }

      if (enemy.data.id === 'boss_titan' && this.bossManager) {
        this.bossManager.updateTitanVisualRig(enemy, delta);
      }

      // WORLD BOSS GLOBAL STATE MACHINE DISPATCH (Standby vs Disengaging vs Active Combat)
      if (bossZone) {
        const combatState = this.bossCombatStates.get(enemy.data.id);
        const combatActive = combatState?.combatActive ?? false;
        const isDisengaging = combatActive && (combatState?.disengageTimer ?? 0) > 0;
        this.bossManager.setBossCombatActive(enemy.data.id, combatActive);

        if (!combatActive) {
          enemy.isAttacking = false;
          if (enemy.data.id === 'boss_jarrus') {
            enemy.isReturning = false;
            this.bossManager.updateJarrusStandby(enemy, delta, distToPlayer);
            return;
          }
          // Ignis & Titan idle calmly at arena center until player enters aggroRange or attacks inside territory
          if (distFromSpawn > 1.2) {
            const toSpawnX = spawnPos.x - ePos.x;
            const toSpawnZ = spawnPos.z - ePos.z;
            const dSpawn = Math.hypot(toSpawnX, toSpawnZ) || 1;
            const returnSpeed = enemy.data.speed * slowMult * delta;
            ePos.x += (toSpawnX / dSpawn) * Math.min(dSpawn, returnSpeed);
            ePos.z += (toSpawnZ / dSpawn) * Math.min(dSpawn, returnSpeed);
            ePos.y = getSolidGroundHeight(ePos.x, ePos.z, ePos.y);
            enemy.mesh.rotation.y = Math.atan2(toSpawnX, toSpawnZ);
            enemy.walkCycle += delta * 5.0;
            this.animateEnemyWalk(enemy, delta);
            if (enemy.data.hp < enemy.data.maxHp) {
              enemy.data.hp = Math.min(enemy.data.maxHp, enemy.data.hp + enemy.data.maxHp * 0.12 * delta);
            }
          } else {
            enemy.isReturning = false;
            this.resetEnemyPose(enemy);
          }
          return;
        }

        if (isDisengaging) {
          enemy.isAttacking = false;
          if (enemy.data.id === 'boss_jarrus') {
            this.bossManager.updateJarrusReturnToCenter(enemy, delta);
            return;
          }
          // Within 5s disengage grace period: retreat smoothly toward center without full HP reset yet
          if (distFromSpawn > 1.2) {
            const toSpawnX = spawnPos.x - ePos.x;
            const toSpawnZ = spawnPos.z - ePos.z;
            const dSpawn = Math.hypot(toSpawnX, toSpawnZ) || 1;
            const returnSpeed = enemy.data.speed * slowMult * delta;
            ePos.x += (toSpawnX / dSpawn) * Math.min(dSpawn, returnSpeed);
            ePos.z += (toSpawnZ / dSpawn) * Math.min(dSpawn, returnSpeed);
            ePos.y = getSolidGroundHeight(ePos.x, ePos.z, ePos.y);
            enemy.mesh.rotation.y = Math.atan2(toSpawnX, toSpawnZ);
            enemy.walkCycle += delta * 5.5;
            this.animateEnemyWalk(enemy, delta);
          } else {
            this.resetEnemyPose(enemy);
          }
          return;
        }
      }

      // STATE 1: Monster biasa sedang berjalan kembali ke tempat asalnya (Leash Return & Slow Regen)
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
          ePos.y = getSolidGroundHeight(ePos.x, ePos.z, ePos.y);

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
        enemy.isAttacking = false;
        if (distFromSpawn > 1.2) {
          enemy.isReturning = true;
          return;
        } else {
          return;
        }
      }

      // STATE 2: Deteksi batas wilayah (Monster biasa; World Boss yang sudah combatActive dikawal penuh oleh territoryRadius)
      if (!bossZone && (distFromSpawn > territoryRadius || distToPlayer > enemy.data.detectRange * 1.5)) {
        if (distFromSpawn > 1.2) {
          enemy.isReturning = true;
          return;
        } else {
          // Monster berada di sarang dan pemain di luar jangkauan: tetap tenang/idle di sarang
          return;
        }
      }

      // STATE 2.5: Boss Specialized Attack Skills & Ground Telegraph Danger Zones (Aktif menyeluruh di dalam territoryRadius)
      if (enemy.data.type === 'boss') {
        const bossActiveRadius = bossZone ? territoryRadius + 8 : territoryRadius;
        if (distFromSpawn <= bossActiveRadius && (!bossZone || playerDistFromArena <= territoryRadius)) {
          const isCasting = this.bossManager.updateBossBehavior(enemy, this.playerPos, delta, !this.isGrounded, this.playerVel);
          if (isCasting) {
            return;
          }
        }
      }

      const resolvedTarget = resolveEnemyTarget(
        ePos,
        this.playerPos,
        this.isPlayerStealthed,
        this.activeShadowDecoy && this.activeShadowDecoy.active
          ? { active: true, position: this.activeShadowDecoy.pos }
          : null
      );

      // Stealth Aggro Drop (tanpa Decoy): monster kehilangan kunci target dan diam waspada tanpa reset HP pulang
      if (!resolvedTarget.targetPos) {
        enemy.isAttacking = false;
        return;
      }

      const isTauntedByDecoy = resolvedTarget.isDecoy;
      const currentTargetPos = resolvedTarget.targetPos;
      const distToCurrentTarget = resolvedTarget.dist;

      // STATE 3: Jika target dalam jarak deteksi dan monster masih di dalam wilayahnya -> kejar & serang
      const engageRange = bossZone ? territoryRadius * 2 : enemy.data.detectRange;
      if (distToCurrentTarget <= engageRange && distFromSpawn <= territoryRadius) {
        const toTarget = new THREE.Vector3().subVectors(currentTargetPos, ePos).normalize();
        const targetRotY = Math.atan2(toTarget.x, toTarget.z);
        enemy.mesh.rotation.y = targetRotY;

        if (distToCurrentTarget > enemy.data.attackRange) {
          const baseSpeed =
            enemy.data.id === 'boss_dragonfang'
              ? 5.8
              : enemy.data.id === 'boss_titan' && this.bossManager.titanPhase === 2
                ? enemy.data.speed * 1.28
                : enemy.data.speed;
          const moveSpeed = baseSpeed * slowMult * delta;
          ePos.x += toTarget.x * moveSpeed;
          ePos.z += toTarget.z * moveSpeed;
          ePos.y = getSolidGroundHeight(ePos.x, ePos.z, ePos.y);

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
              // Serangan musuh menghantam Bayangan Pengecoh -> langsung hancur dengan asap abu-cyan
              soundManager.playHit();
              this.dismissActiveShadowDecoy(false);
            } else {
              this.enemyAttackPlayer(enemy);
            }
          }
        }
      } else if (distFromSpawn > 1.2) {
        // Target tidak di sekitar dan monster tidak di titik asal -> kembali pulang
        enemy.isReturning = true;
      }
    });

    this.updateBossCombatZoneAndMusic(delta);
  }

  private getBossDisplayTitle(bossId: string): string | undefined {
    if (bossId === 'boss_jarrus') return JARRUS_WORM_BOSS_CONFIG.titleId || JARRUS_WORM_BOSS_CONFIG.title;
    if (bossId === 'boss_dragonfang') return IGNIS_DRAGON_BOSS_CONFIG.titleId || IGNIS_DRAGON_BOSS_CONFIG.title;
    if (bossId === 'boss_titan') return ANCIENT_TITAN_BOSS_CONFIG.titleId || ANCIENT_TITAN_BOSS_CONFIG.title;
    return undefined;
  }

  public notifyBossDamaged(bossId: string) {
    const zone = BOSS_ARENA_ZONES[bossId];
    if (!zone) return;
    const boss = this.enemies.find((e) => e.data.id === bossId);
    if (!boss || boss.data.isDead || (boss.data.hp ?? 0) <= 0) return;

    const playerDistCenter = Math.hypot(this.playerPos.x - zone.center.x, this.playerPos.z - zone.center.z);
    if (playerDistCenter <= zone.territoryRadius) {
      const prev = this.bossCombatStates.get(bossId);
      if (!prev || !prev.combatActive || prev.disengageTimer > 0) {
        this.bossCombatStates.set(bossId, { combatActive: true, disengageTimer: 0 });
        this.bossManager?.setBossCombatActive(bossId, true);
        boss.isReturning = false;
      }
    }
  }

  /**
   * Global Standardized Boss Zone, Health Bar, Aggro & Music State Machine
   * (Berlaku seragam untuk boss_jarrus [r=68, aggro=36], boss_dragonfang [r=74, aggro=38], boss_titan [r=76, aggro=38])
   * 1. Masuk territoryRadius saat combatActive === false:
   *    - Bar HP Boss (Nama + Gelar + HP) langsung tampil. Boss standby & musik tetap BGM lingkungan.
   * 2. Keluar territoryRadius saat combatActive === false:
   *    - Bar HP Boss langsung menghilang (0 detik), musik lingkungan tidak terputus.
   * 3. Memicu combatActive = true:
   *    - Saat memasuki aggroRadius tubuh Boss ATAU menyerang/melukai Boss dari dalam territoryRadius.
   *    - Bar HP terkunci aktif, musik Boss segera dimainkan, Boss bertarung di seluruh territoryRadius.
   * 4. Keluar territoryRadius saat combatActive === true:
   *    - Mulai disengageTimer 5.0 detik; Boss mundur ke pusat.
   *    - Masuk kembali < 5s -> timer reset 0 & pertarungan berlanjut mulus.
   *    - Melewati 5.0s di luar -> combatActive = false, bar hilang, audio crossfade BGM normal, Boss reset standby.
   */
  private updateBossCombatZoneAndMusic(delta: number) {
    if (this.world?.interiorManager?.activeRoom) {
      if (this.activeBossZoneId !== null) {
        this.activeBossZoneId = null;
        this.activeBossEnemyData = null;
        this.callbacks.onBossEncounter(false, undefined, undefined, undefined, undefined, false);
        if (soundManager.getCurrentBossMusic()) {
          soundManager.evadeBossMusic(1.5);
        }
      }
      return;
    }
    let displayZone: BossArenaZone | null = null;
    let displayBoss: (typeof this.enemies)[0] | null = null;
    let displayCombatActive = false;

    let graceZone: BossArenaZone | null = null;
    let graceBoss: (typeof this.enemies)[0] | null = null;

    for (const zone of Object.values(BOSS_ARENA_ZONES)) {
      const boss = this.enemies.find((e) => e.data.id === zone.id);
      const bossAlive = !!boss && !boss.data.isDead && (boss.data.hp ?? 0) > 0;
      const st = this.bossCombatStates.get(zone.id) || { combatActive: false, disengageTimer: 0 };

      if (!bossAlive) {
        if (st.combatActive || st.disengageTimer > 0) {
          st.combatActive = false;
          st.disengageTimer = 0;
          this.bossCombatStates.set(zone.id, st);
        }
        continue;
      }

      const playerDistCenter = Math.hypot(this.playerPos.x - zone.center.x, this.playerPos.z - zone.center.z);

      if (playerDistCenter <= zone.territoryRadius) {
        if (!st.combatActive) {
          const distToBossBodyXZ = Math.hypot(
            this.playerPos.x - boss!.mesh.position.x,
            this.playerPos.z - boss!.mesh.position.z
          );
          if (
            distToBossBodyXZ <= zone.aggroRange &&
            !this.isPlayerStealthed &&
            !isInsideSafeZone(this.playerPos.x, this.playerPos.z)
          ) {
            st.combatActive = true;
            st.disengageTimer = 0;
          }
        } else {
          st.disengageTimer = 0;
          boss!.isReturning = false;
        }
        displayZone = zone;
        displayBoss = boss!;
        displayCombatActive = st.combatActive;
      } else if (st.combatActive) {
        st.disengageTimer += delta;
        if (st.disengageTimer >= 5.0) {
          st.combatActive = false;
          st.disengageTimer = 0;
          this.bossManager.resetBoss(zone.id, boss);
          if (boss && !boss.data.isDead) {
            boss.data.hp = boss.data.maxHp;
            boss.isReturning = true;
          }
        } else {
          graceZone = zone;
          graceBoss = boss!;
        }
      }

      this.bossCombatStates.set(zone.id, st);
    }

    const chosenZone = displayZone ?? graceZone;
    const chosenBoss = displayBoss ?? graceBoss;
    const chosenCombatActive = displayZone ? displayCombatActive : graceZone !== null;

    if (chosenZone && chosenBoss) {
      this.activeBossZoneId = chosenZone.id;
      this.activeBossEnemyData = chosenBoss.data;
      const title = this.getBossDisplayTitle(chosenZone.id);
      this.callbacks.onBossEncounter(
        true,
        chosenBoss.data.nameId || chosenBoss.data.name,
        chosenBoss.data.hp,
        chosenBoss.data.maxHp,
        title,
        chosenCombatActive
      );

      if (chosenCombatActive) {
        soundManager.playBossMusic(chosenZone.bossType);
      } else if (soundManager.getCurrentBossMusic()) {
        soundManager.evadeBossMusic(1.5);
      }
    } else {
      this.activeBossZoneId = null;
      this.activeBossEnemyData = null;
      this.callbacks.onBossEncounter(false, undefined, undefined, undefined, undefined, false);
      if (soundManager.getCurrentBossMusic()) {
        soundManager.evadeBossMusic(2.0);
      }
    }
  }

  /**
   * Mode Multiplayer:
   * Matikan AI monster lokal di client!
   * Client TIDAK menghitung jarak deteksi dan pergerakan kejar secara mandiri.
   * Client HANYA merender posisi monster berdasarkan koordinat (X, Z) yang dikirimkan oleh server.js via Socket.io.
   */
  private updateMonsterMultiplayer(delta: number) {
    const activeInteriorRoomId = this.world?.interiorManager?.activeRoom?.id ?? null;
    this.enemies.forEach((enemy) => {
      if (enemy.isIndoorDummy) {
        enemy.mesh.visible = activeInteriorRoomId === enemy.interiorId;
        return;
      }
      if (activeInteriorRoomId !== null) {
        enemy.mesh.visible = false;
        return;
      }
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
      } else if (enemy.data.id === 'boss_jarrus' || enemy.data.id === 'boss_titan') {
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
        ePos.y = getSolidGroundHeight(ePos.x, ePos.z, ePos.y);

        // Lerp rotasi Y dari server
        let diffRot = target.rotationY - enemy.mesh.rotation.y;
        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
        enemy.mesh.rotation.y += diffRot * lerpSpeed;

        if (enemy.data.id === 'boss_jarrus') {
          this.bossManager.updateJarrusRemoteSpine(enemy, delta);
        } else {
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

  // Spawn flying 3D stone boulder projectile for Titan's Rock Boulder Throw skill (Pre-allocated Pool, ZERO PointLight)
  private spawnTitanBoulderProjectile(origin: THREE.Vector3, target: THREE.Vector3, damage = 55) {
    if (this.titanBoulderPool.length === 0) {
      this.initBossProjectilePools();
    }
    let idx = this.titanBoulderPool.findIndex((p) => !p.active);
    if (idx === -1) {
      idx = this.titanBoulderCursor;
      this.titanBoulderCursor = (this.titanBoulderCursor + 1) % this.titanBoulderPool.length;
    }
    const slot = this.titanBoulderPool[idx];
    slot.active = true;
    slot.group.position.copy(origin);
    slot.group.rotation.set(0, 0, 0);
    slot.group.visible = true;

    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const horizDist = Math.hypot(dx, dz);
    const flightTime = THREE.MathUtils.clamp(horizDist / 24.0, 0.72, 1.75);
    const gravity = 28.0;
    const targetGroundY = this.world.getTerrainHeight(target.x, target.z);
    const vy = (targetGroundY + 0.6 - origin.y + 0.5 * gravity * flightTime * flightTime) / flightTime;
    const velocity = new THREE.Vector3(dx / flightTime, vy, dz / flightTime);
    const dir = velocity.clone().normalize();
    const rotAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    this.activeProjectiles.push({
      object: slot.group,
      direction: dir,
      speed: velocity.length(),
      velocity,
      gravity,
      lifetime: flightTime + 0.6,
      damage,
      isCrit: false,
      vfxType: 'titan_boulder',
      isHostile: true,
      blastRadius: 4.5,
      rotationAxis: rotAxis,
      pooledHostileType: 'titan_boulder',
      pooledHostileIndex: idx,
    });
  }

  // Spawn flying magma fireball projectile for Ignis Fireball Barrage skill (Pre-allocated Pool, ZERO PointLight)
  private spawnIgnisFireballProjectile(origin: THREE.Vector3, target: THREE.Vector3, damage = 42) {
    if (this.ignisFireballPool.length === 0) {
      this.initBossProjectilePools();
    }
    let idx = this.ignisFireballPool.findIndex((p) => !p.active);
    if (idx === -1) {
      idx = this.ignisFireballCursor;
      this.ignisFireballCursor = (this.ignisFireballCursor + 1) % this.ignisFireballPool.length;
    }
    const slot = this.ignisFireballPool[idx];
    slot.active = true;
    slot.group.position.copy(origin);
    slot.group.rotation.set(0, 0, 0);
    slot.group.visible = true;

    const dir = new THREE.Vector3().subVectors(target, origin).normalize();
    this.activeProjectiles.push({
      object: slot.group,
      direction: dir,
      speed: 26.0,
      lifetime: 3.0,
      damage,
      isCrit: false,
      vfxType: 'dragon_fireball',
      isHostile: true,
      blastRadius: 3.0,
      pooledHostileType: 'dragon_fireball',
      pooledHostileIndex: idx,
    });
  }

  private enemyAttackPlayer(enemy: (typeof this.enemies)[0]) {
    if (this.isInvulnerable || this.devSettings.godMode) {
      this.callbacks.onAddFloatingText(this.devSettings.godMode ? '🛡️ KEBAL (GOD MODE)!' : 'KEBAL / iFrame!', '#38bdf8', 'info');
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
        this.handlePlayerTookDamage(finalDmg);
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
    if (this.isAimGlacialActive || this.glacialAimState.isCharging || this.isAimingBow) {
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

    const activeCamRoom = this.world?.interiorManager?.activeRoom ?? null;
    // Orbit camera calculation with interior zoom cap (<= 9.5) and wall/ceiling clamping
    const effectiveDist = activeCamRoom
      ? Math.min(this.cameraDistance, 9.5)
      : this.cameraDistance + this.cameraAerialZoom;
    const offsetX = Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * effectiveDist;
    const offsetZ = Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * effectiveDist;
    const offsetY = Math.sin(this.cameraAngleV) * effectiveDist + 1.2;

    const targetPos = new THREE.Vector3(
      this.playerPos.x + offsetX,
      this.playerPos.y + offsetY,
      this.playerPos.z + offsetZ
    );
    if (activeCamRoom) {
      activeCamRoom.clampCameraPosition(targetPos, this.playerPos.y);
    }

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
      if (activeCamRoom) {
        activeCamRoom.clampCameraPosition(targetPos, this.playerPos.y);
      }
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
    if (activeCamRoom) {
      activeCamRoom.clampCameraPosition(this.camera.position, this.playerPos.y);
    }
    this.camera.lookAt(this.cameraCurrentLookAt);
  }

  private updateRemotePlayers(delta: number) {
    if (this.gameMode !== 'multiplayer' || this.remotePlayers.size === 0) return;

    this.remotePlayers.forEach((rp) => {
      // Lerp position smoothly
      rp.currentPos.lerp(rp.targetPos, Math.min(1, delta * 14));
      // Ensure remote player feet do not sink below solid walkable ground surface
      const groundY = getSolidGroundHeight(rp.currentPos.x, rp.currentPos.z, rp.currentPos.y);
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

    // Rolling FPS Counter (~0.5s window)
    this.fpsFrameAccum++;
    this.fpsTimeAccum += delta;
    if (this.fpsTimeAccum >= 0.5) {
      this.currentFps = Math.max(1, Math.round(this.fpsFrameAccum / this.fpsTimeAccum));
      this.fpsFrameAccum = 0;
      this.fpsTimeAccum = 0;
    }

    // Update 24-minute real-time Day-Night Cycle & Celestial Atmosphere
    this.dayNightSystem.update(delta);
    if (this.world?.hemiLight && this.world?.dirLight && !this.world.interiorManager?.activeRoom) {
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
    this.updateCalderaStormAndAura(delta, this.clock.getElapsedTime());
    this.updateLootPickups(delta);
    this.updateCamera(delta);
    this.updateRemotePlayers(delta);
    if (!isMobileRenderDevice() || this.graphicsSettings.preset !== 'low' || this.frameCount % 2 === 0) {
      this.worldEnvironment?.update(delta, this.clock.getElapsedTime());
    }
    this.updateSparks(delta);
    this.updateCombatVfxPools(delta);
    this.updateAstralEagle(delta);
    this.updateArrowStormUltimate(delta);

    // Global Skill Cooldown & Charge Manager update + Dev Mode Zero-CD sync
    const zeroCd = this.isZeroCd();
    this.skillCooldownsManager.update(delta, zeroCd);

    // Assassin Bom Asap Stealth 3.0s countdown
    if (this.isPlayerStealthed) {
      this.stealthTimer -= delta;
      if (this.stealthTimer <= 0) {
        this.endPlayerStealth('expired');
      }
    }

    // Dev Mode Testing overrides: Infinite Energy (100% MP & Stamina) + Zero Cooldowns
    if (zeroCd) {
      this.mageUltimateCooldownTimer = 0;
      this.mageGlacialBarrageCooldownTimer = 0;
      this.mageBlinkCooldownTimer = 0;
      this.mageCahayaSuciCooldownTimer = 0;
      this.hunterMobilityCooldownTimer = 0;
      this.bowShotCooldownTimer = 0;
    }
    if (this.devSettings.infiniteEnergy) {
      const targetMaxStam = this.currentStats.maxStamina || 100;
      this.playerStamina = targetMaxStam;
      if (this.currentStats.mp < this.currentStats.maxMp || this.currentStats.stamina < targetMaxStam) {
        this.currentStats.mp = this.currentStats.maxMp;
        this.currentStats.stamina = targetMaxStam;
        this.callbacks.onUpdateStats((s) => ({
          ...s,
          mp: s.maxMp,
          stamina: s.maxStamina,
        }));
      }
    }

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

    // Hunter Bow fire-rate throttle, follow-through stance hold, & Open-World 7.0s auto-sheathe timer
    if (this.weaponDrawTransitionTimer > 0) {
      this.weaponDrawTransitionTimer = Math.max(0, this.weaponDrawTransitionTimer - delta);
    }
    if (this.bowShotCooldownTimer > 0) {
      this.bowShotCooldownTimer = Math.max(0, this.bowShotCooldownTimer - delta);
    }
    if (this.bowCombatStanceTimer > 0) {
      this.bowCombatStanceTimer = Math.max(0, this.bowCombatStanceTimer - delta);
      if (
        this.bowCombatStanceTimer <= 0 &&
        this.charClass === 'rogue' &&
        !this.isHoldingBowAttack &&
        !this.isAimingBow &&
        !this.isChargingAstralEagle &&
        !this.astralEagleAimState.isCharging &&
        !this.isAimingArrowVolley &&
        !this.arrowVolleyAimState.isCharging
      ) {
        if (this.playerMesh?.body) this.playerMesh.body.rotation.set(0, 0, 0);
        if (this.playerMesh?.head) this.playerMesh.head.rotation.set(0, 0, 0);
        if (this.playerMesh?.leftArm) {
          this.playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
          this.playerMesh.leftArm.rotation.set(0, 0, 0);
        }
        if (this.playerMesh?.rightArm) {
          this.playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
          this.playerMesh.rightArm.rotation.set(0, 0, 0);
        }
        this.syncHunterWeaponModel();
      }
    }
    if (this.charClass === 'rogue' && this.isWeaponDrawn) {
      const inActiveCombatPose =
        this.isAttacking ||
        this.isHoldingBowAttack ||
        this.isAimingBow ||
        this.isChargingAstralEagle ||
        this.astralEagleAimState.isCharging ||
        this.isAimingArrowVolley ||
        this.arrowVolleyAimState.isCharging ||
        this.isGaleVaulting ||
        this.isDashing ||
        this.bowCombatStanceTimer > 0;
      if (inActiveCombatPose) {
        this.combatIdleTimer = 7.0;
      } else {
        this.combatIdleTimer -= delta;
        if (this.combatIdleTimer <= 0) {
          this.toggleWeaponDrawn(false, false);
        }
      }
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

    // Hunter Active Shadow Decoy (2.8s statis, lenyap dengan asap abu-cyan saat habis atau terkena serangan)
    if (this.activeShadowDecoy && this.activeShadowDecoy.active) {
      this.activeShadowDecoy.timer -= delta;
      if (Math.random() < 0.2) {
        this.spawnSparks(
          this.activeShadowDecoy.pos.clone().add(new THREE.Vector3(0, 0.85, 0)),
          0x67e8f9,
          1,
          1.2
        );
      }
      if (this.activeShadowDecoy.timer <= 0) {
        this.dismissActiveShadowDecoy(false);
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
      let moveDistance = proj.speed * delta;
      if (proj.velocity && proj.gravity !== undefined) {
        proj.object.position.addScaledVector(proj.velocity, delta);
        proj.velocity.y -= proj.gravity * delta;
        moveDistance = proj.velocity.length() * delta;
      } else {
        proj.object.position.addScaledVector(proj.direction, moveDistance);
      }
      if (proj.distanceTraveled !== undefined) {
        proj.distanceTraveled += moveDistance;
      }

      if (proj.isHostile) {
        if (proj.rotationAxis) {
          proj.object.rotateOnAxis(proj.rotationAxis, delta * 8);
        }
        const distToPlayer = proj.object.position.distanceTo(this.playerPos);
        const distToDecoy =
          this.activeShadowDecoy && this.activeShadowDecoy.active
            ? proj.object.position.distanceTo(this.activeShadowDecoy.pos)
            : Infinity;
        const groundY = this.world.getTerrainHeight(proj.object.position.x, proj.object.position.z);
        const hitGround = proj.object.position.y <= groundY + 0.5;
        const blastR = proj.blastRadius || 2.4;

        if (distToPlayer <= blastR || distToDecoy <= blastR || hitGround || proj.lifetime <= 0) {
          if (distToDecoy <= (proj.blastRadius || 3.2)) {
            this.dismissActiveShadowDecoy(false);
          }
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
            if (this.isInvulnerable || this.devSettings.godMode) {
              this.callbacks.onAddFloatingText(this.devSettings.godMode ? '🛡️ KEBAL (GOD MODE)!' : 'KEBAL / iFrame!', '#38bdf8', 'info');
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
                  this.handlePlayerTookDamage(finalDmg);
                }
                if (isFireball) {
                  this.bossManager.applyBurnDebuff(3.0);
                } else {
                  this.bossManager.applyStunDebuff(0.7, this.playerVel);
                }
                if (nextHp <= 0) {
                  this.respawnPlayerAtLastVisitedTown();
                  return { ...stats, hp: stats.maxHp, mp: stats.maxMp, gold: Math.max(0, stats.gold - 10) };
                }
                return { ...stats, hp: nextHp };
              });
              if (!this.devSettings.ccImmune) {
                const knockDir = new THREE.Vector3(this.playerPos.x - hitPos.x, 0, this.playerPos.z - hitPos.z).normalize();
                this.playerVel.x += knockDir.x * (isFireball ? 8.0 : 14.0);
                this.playerVel.z += knockDir.z * (isFireball ? 8.0 : 14.0);
                this.callbacks.onAddFloatingText('💨 TERPENTAL (KNOCKBACK)!', '#ff9100', 'info');
              }
            }
          }

          if (proj.pooledHostileType === 'titan_boulder' && proj.pooledHostileIndex !== undefined) {
            const slot = this.titanBoulderPool[proj.pooledHostileIndex];
            if (slot) {
              slot.active = false;
              slot.group.visible = false;
            }
          } else if (proj.pooledHostileType === 'dragon_fireball' && proj.pooledHostileIndex !== undefined) {
            const slot = this.ignisFireballPool[proj.pooledHostileIndex];
            if (slot) {
              slot.active = false;
              slot.group.visible = false;
            }
          } else if (proj.pooledArrow) {
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
        if (this.isPointHittingEnemy(proj.object.position, enemy, hitRadius)) {
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



    // Animate InteriorManager portals & interior fixtures
    if (this.world.interiorManager) {
      this.world.interiorManager.updateAnimations(elapsed);
    }

    // Animate monumental exterior rings, apex crystals, & arcane obelisks
    if (this.world.animatedProps && !this.world.interiorManager?.activeRoom) {
      for (const ap of this.world.animatedProps) {
        if (ap.mode === 'bobY') {
          ap.mesh.position.y = (ap.baseY ?? ap.mesh.position.y) + Math.sin(elapsed * ap.speed + (ap.phase ?? 0)) * 0.65;
          ap.mesh.rotation.y = elapsed * 0.65;
        } else {
          ap.mesh.rotation.y = elapsed * ap.speed + (ap.phase ?? 0);
        }
      }
    }

    const isInInterior = (this.world.interiorManager?.activeRoom ?? null) !== null;
    if (!isInInterior) {
      // Floating crystal spin
      this.world.floatingCrystals.forEach((c, idx) => {
        c.rotation.y = elapsed * 0.8 + idx;
        c.position.y = 1.8 + Math.sin(elapsed * 2 + idx) * 0.2;
      });

      // Gentle ocean wave motion
      if (this.world.oceanMesh) {
        this.world.oceanMesh.position.y = -0.25 + Math.sin(elapsed * 1.5) * 0.08;
      }

      // Pooled Biome-Locked Weather (snow only in northern snow biome, clean Desa Utama day, fireflies at dusk/night, desert dust)
      this.updateBiomeWeather(delta, elapsed);
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

    // Optimization 2: Distance LOD for distant background props & NPCs (tighter on Mobile Low)
    if (this.posUpdateThrottle % 16 === 0) {
      const isMobLow = isMobileRenderDevice() && (this.graphicsSettings.preset === 'low' || this.graphicsSettings.renderDistance <= 160);
      const isMobMed = isMobileRenderDevice() && this.graphicsSettings.preset === 'medium';
      const propMaxDist = isMobLow ? 85 : isMobMed ? 130 : 160;
      const pX = this.playerPos.x;
      const pZ = this.playerPos.z;

      if (this.world.decorativeProps && this.world.decorativeProps.length > 0) {
        const maxDistSq = propMaxDist * propMaxDist;
        for (const prop of this.world.decorativeProps) {
          const distSq = (prop.position.x - pX) ** 2 + (prop.position.z - pZ) ** 2;
          prop.visible = distSq <= maxDistSq;
        }
      }

      if (this.world.npcs && this.world.npcs.length > 0) {
        const npcDistSqLimit = isMobLow ? 75 * 75 : 220 * 220;
        for (const npc of this.world.npcs) {
          if (!npc.group) continue;
          const dx = npc.position[0] - pX;
          const dz = npc.position[2] - pZ;
          npc.group.visible = dx * dx + dz * dz <= npcDistSqLimit;
        }
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
      const targetPosY = this.isSpectatorMode ? this.spectatorPos.y : this.playerPos.y;
      const targetRotY = this.isSpectatorMode ? this.spectatorYaw : this.playerRotationY;
      const activeRoomNow = this.world?.interiorManager?.activeRoom ?? null;
      const mapX = activeRoomNow && this.activeExteriorReturnPos ? this.activeExteriorReturnPos.x : targetPosX;
      const mapZ = activeRoomNow && this.activeExteriorReturnPos ? this.activeExteriorReturnPos.z : targetPosZ;
      const baseReg = getCurrentRegion(mapX, mapZ);
      const activeFloorLabel = activeRoomNow ? activeRoomNow.getFloorLabel(targetPosY) : '';
      if (activeRoomNow) {
        const lx = Math.round(targetPosX);
        const lz = Math.round(targetPosZ);
        const sig = `${activeRoomNow.id}:${activeFloorLabel}:${lx}:${lz}`;
        if (sig !== this.lastInteriorRoomSig) {
          this.lastInteriorRoomSig = sig;
          this.callbacks.onInteriorRoomChange?.({
            id: activeRoomNow.id,
            roomName: activeRoomNow.name,
            floorLabel: activeFloorLabel,
            localX: lx,
            localZ: lz,
            canExit: true,
          });
        }
      } else if (this.lastInteriorRoomSig !== '') {
        this.lastInteriorRoomSig = '';
        this.callbacks.onInteriorRoomChange?.(null);
      }

      const currentReg: RegionInfo = activeRoomNow
        ? {
            ...baseReg,
            id: `interior_${activeRoomNow.id}`,
            name: `${activeRoomNow.name} — ${activeFloorLabel}`,
            nameId: `${activeRoomNow.name} — ${activeFloorLabel}`,
            descriptionId: `Interior — ${activeRoomNow.exteriorName}`,
          }
        : baseReg;
      this.callbacks.onPlayerPositionUpdate({
        x: mapX,
        y: targetPosY,
        z: mapZ,
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

    this.unsubDevSettings?.();
    this.unsubDevSettings = null;

    // Clean up Boss Projectile Pools
    this.titanBoulderPool.forEach((p) => this.scene.remove(p.group));
    this.titanBoulderPool = [];
    this.titanBoulderPoolGeos.forEach((g) => g.dispose());
    this.titanBoulderPoolGeos = [];
    this.titanBoulderPoolMats.forEach((m) => m.dispose());
    this.titanBoulderPoolMats = [];

    this.ignisFireballPool.forEach((p) => this.scene.remove(p.group));
    this.ignisFireballPool = [];
    this.ignisFireballPoolGeos.forEach((g) => g.dispose());
    this.ignisFireballPoolGeos = [];
    this.ignisFireballPoolMats.forEach((m) => m.dispose());
    this.ignisFireballPoolMats = [];

    // Clean up Caldera Storm, Clouds, Ash, Aura, & Lightning Pools
    if (this.calderaCloudGroup) {
      this.scene.remove(this.calderaCloudGroup);
      this.calderaCloudGroup = null;
    }
    this.calderaCloudGeo?.dispose();
    this.calderaCloudGeo = null;
    this.calderaCloudMats.forEach((m) => m.dispose());
    this.calderaCloudMats = [];

    if (this.calderaStormPoints) {
      this.scene.remove(this.calderaStormPoints);
      this.calderaStormPoints.geometry.dispose();
      this.calderaStormMat?.dispose();
      this.calderaStormPoints = null;
      this.calderaStormMat = null;
    }

    if (this.biomeWeatherPoints) {
      this.scene.remove(this.biomeWeatherPoints);
      this.biomeWeatherPoints.geometry.dispose();
      this.biomeWeatherMat?.dispose();
      this.biomeWeatherTex?.dispose();
      this.biomeWeatherPoints = null;
      this.biomeWeatherMat = null;
      this.biomeWeatherTex = null;
    }

    if (this.ignisAuraPoints) {
      this.scene.remove(this.ignisAuraPoints);
      this.ignisAuraPoints.geometry.dispose();
      this.ignisAuraMat?.dispose();
      this.ignisAuraPoints = null;
      this.ignisAuraMat = null;
    }

    this.calderaLightningPool.forEach((b) => {
      this.scene.remove(b.group);
      b.outerLines.geometry.dispose();
      b.coreLines.geometry.dispose();
      b.outerMat.dispose();
      b.coreMat.dispose();
    });
    this.calderaLightningPool = [];

    // Clean up active VFX and projectiles
    this.interiorFadeTimers.forEach((id) => clearTimeout(id));
    this.interiorFadeTimers = [];
    this.starfallTimeoutIds.forEach((id) => clearTimeout(id));
    this.starfallTimeoutIds = [];
    if (this.aimIndicatorGroup) {
      this.scene.remove(this.aimIndicatorGroup);
      this.aimIndicatorGroup = null;
    }
    if (this.mobileBowAimGroup) {
      this.scene.remove(this.mobileBowAimGroup);
      this.mobileBowAimGroup = null;
      this.mobileBowAimRingMesh = null;
      this.mobileBowAimLineMesh = null;
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

    // Clean up Panah Rajawali Astral & Badai Panah Agung Pools
    this.activeArrowStorms = [];
    this.astralEaglePool.forEach((p) => {
      this.scene.remove(p.root);
      p.coreMat.dispose();
      p.wingMat.dispose();
      p.trailMat.dispose();
    });
    this.astralEaglePool = [];
    this.astralShockwavePool.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mat.dispose();
    });
    this.astralShockwavePool = [];
    this.arrowRainPool.forEach((p) => {
      this.scene.remove(p.root);
      p.shaftMat.dispose();
      p.trailMat.dispose();
    });
    this.arrowRainPool = [];
    this.arrowRainImpactPool.forEach((p) => {
      this.scene.remove(p.group);
      p.ringMat.dispose();
      p.sparkMat.dispose();
    });
    this.arrowRainImpactPool = [];
    this.stormCasterAuraPool.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mat.dispose();
    });
    this.stormCasterAuraPool = [];
    this.stormFlareArrowPool.forEach((p) => {
      this.scene.remove(p.root);
      p.trailMat.dispose();
    });
    this.stormFlareArrowPool = [];
    this.stormSkyPortalPool.forEach((p) => {
      this.scene.remove(p.group);
      p.outerMat.dispose();
      p.innerMat.dispose();
      p.coreMat.dispose();
    });
    this.stormSkyPortalPool = [];
    this.stormGroundMagicCirclePool.forEach((p) => {
      this.scene.remove(p.group);
      p.outerMat.dispose();
      p.innerMat.dispose();
      p.discMat.dispose();
      p.windMat.dispose();
    });
    this.stormGroundMagicCirclePool = [];
    this.stormTombakPool.forEach((p) => {
      this.scene.remove(p.root);
      p.wingMat.dispose();
      p.coreMat.dispose();
    });
    this.stormTombakPool = [];
    this.stormFinisherBlastPool.forEach((p) => {
      this.scene.remove(p.group);
      p.ringMat.dispose();
      p.pillarMat.dispose();
    });
    this.stormFinisherBlastPool = [];
    this.arrowRainSharedGeometries.forEach((g) => g.dispose());
    this.arrowRainSharedGeometries = [];
    this.arrowRainSharedMaterials.forEach((m) => m.dispose());
    this.arrowRainSharedMaterials = [];
    registerActiveWorldSnapshotProvider(null);

    // Clean up Hunter Shadow Decoys
    this.shadowDecoyPool.forEach((d) => {
      this.scene.remove(d);
      d.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).geometry?.dispose();
        }
      });
    });
    this.shadowDecoyPool = [];
    this.shadowDecoySharedMats.forEach((m) => m.dispose());
    this.shadowDecoySharedMats = [];
    this.activeShadowDecoy = null;
    this.playerMatSnapshots = [];

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
