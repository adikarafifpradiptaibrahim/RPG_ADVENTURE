import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, Sparkles, Maximize2 } from 'lucide-react';
import { GameEngine } from './game/3d/gameEngine';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { StatsModal } from './components/StatsModal';
import { QuestModal } from './components/QuestModal';
import { DialogueModal } from './components/DialogueModal';
import { HelpModal } from './components/HelpModal';
import { WorldMapModal } from './components/WorldMapModal';
import { ShopModal } from './components/ShopModal';
import { MainMenu, MultiplayerStartOptions, SaveSlotData } from './components/MainMenu';
import { PauseModal } from './components/PauseModal';
import { LoadingScreen } from './components/LoadingScreen';
import { GraphicsSettingsModal } from './components/GraphicsSettingsModal';
import { MultiplayerChat } from './components/MultiplayerChat';
import { VirtualJoystick } from './components/TouchControls';
import { CameraControls } from './components/CameraControls';
import { soundManager } from './game/audio';
import { multiplayerClient, RemotePlayerData, ChatMessage } from './game/multiplayer';
import { GraphicsSettings, loadGraphicsSettings } from './game/graphicsSettings';
import {
  CharacterClass,
  DialogueNode,
  FloatingText,
  Item,
  MapMarker,
  PlayerStats,
  Quest,
  RegionInfo,
} from './types/game';
import { DIALOGUES, INITIAL_ITEMS, INITIAL_QUESTS } from './game/data';
import { REGIONS } from './game/mapData';
import { ShopId } from './game/shopData';
import {
  getGuestSaveData,
  saveRoleProgress,
  getRoleSave,
  getDeviceSettings,
  updateDeviceSettings,
  applyDeviceSettings,
  resetAllGuestData,
  RoleSaveData,
  EldoriaGuestSaveData,
} from './game/storage/guestSaveManager';
import { AuthModal } from './components/AuthModal';
import {
  cloudSyncManager,
  MigrationDialogData,
} from './game/storage/cloudSyncManager';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Cloud Auth & Migration State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [migrationDialogData, setMigrationDialogData] = useState<MigrationDialogData | null>(null);

  // Game Start & Mode State
  const [hasStarted, setHasStarted] = useState(false);
  const [gameMode, setGameMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
  const [characterClass, setCharacterClass] = useState<CharacterClass>('warrior');
  const [previewRole, setPreviewRole] = useState<'warrior' | 'mage' | 'rogue'>('warrior');
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerStartOptions | null>(null);
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<Record<string, RemotePlayerData>>({});
  const [multiplayerMessages, setMultiplayerMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Player Stats State
  const [stats, setStats] = useState<PlayerStats>({
    level: 1,
    exp: 0,
    maxExp: 100,
    hp: 120,
    maxHp: 120,
    mp: 60,
    maxMp: 60,
    stamina: 100,
    maxStamina: 100,
    gold: 50,
    statPoints: 3,
    strength: 5,
    agility: 5,
    intelligence: 5,
    baseAttack: 12,
    baseDefense: 8,
    characterClass: 'warrior',
  });

  const statsRef = useRef(stats);
  statsRef.current = stats;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;

  // Items & Quests
  const [inventory, setInventory] = useState<Item[]>(INITIAL_ITEMS);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);

  // Modals & UI States
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [shopState, setShopState] = useState<{
    isOpen: boolean;
    shopId: ShopId;
  }>({
    isOpen: false,
    shopId: 'blacksmith',
  });
  const [dialogueState, setDialogueState] = useState<{
    isOpen: boolean;
    node: DialogueNode | null;
  }>({
    isOpen: false,
    node: null,
  });

  // Regional Checkpoints & Waypoint Teleportation State
  const [unlockedCheckpoints, setUnlockedCheckpoints] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eldoria_unlocked_checkpoints');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['wp_village'];
  });

  // Spectator Mode State & Cinematic UI Toggle
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);
  const [spectatorSpeed, setSpectatorSpeed] = useState(22);
  const [isUIVisible, setIsUIVisible] = useState(true);

  // World Map & Minimap Live Position State
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, z: 4, rotationY: 0 });
  const [currentRegion, setCurrentRegion] = useState<RegionInfo>(REGIONS[0]);
  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;
  const questsRef = useRef(quests);
  questsRef.current = quests;
  const playerPosRef = useRef(playerPos);
  playerPosRef.current = playerPos;
  const currentRegionRef = useRef(currentRegion);
  currentRegionRef.current = currentRegion;
  const playTimeRef = useRef(0);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [hunterWeaponMode, setHunterWeaponMode] = useState<'dagger' | 'bow'>('dagger');
  const [castingState, setCastingState] = useState<{ isCasting: boolean; progress: number; text: string } | null>(null);
  const [isGlacialAiming, setIsGlacialAiming] = useState(false);
  const [glacialTarget, setGlacialTarget] = useState<{ name: string; hp: number; maxHp: number; isBoss?: boolean } | null>(null);
  const [isBowAiming, setIsBowAiming] = useState(false);
  const [isArrowVolleyAiming, setIsArrowVolleyAiming] = useState(false);
  const [bowChargeRatio, setBowChargeRatio] = useState(0);

  // Pause Menu State
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);

  // Loading Screen & Shader Precompilation State
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingGameplay, setIsLoadingGameplay] = useState(false);
  const [isLoadingFadeOut, setIsLoadingFadeOut] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Memuat Dunia & Mengompilasi Shader...');

  // Graphics Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(() => loadGraphicsSettings());

  // Touch Controls State (Default OFF on PC, ON on Mobile/Touchscreen)
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('eldoria_touch_controls');
      if (saved !== null) {
        return saved === 'true';
      }
      if (typeof window !== 'undefined') {
        return (
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(pointer: coarse)').matches
        );
      }
    } catch {}
    return false;
  });

  const handleToggleTouchControls = () => {
    setShowTouchControls((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('eldoria_touch_controls', String(next));
      } catch {}
      return next;
    });
  };

  // Apply saved device settings automatically on initial launch
  useEffect(() => {
    const devSettings = getDeviceSettings();
    applyDeviceSettings(devSettings);
    if (devSettings.graphics) {
      setGraphicsSettings(devSettings.graphics);
    }
    if (typeof devSettings.controls?.showTouchControls === 'boolean') {
      setShowTouchControls(devSettings.controls.showTouchControls);
    }
    if (devSettings.audio) {
      if (typeof devSettings.audio.isMuted === 'boolean') {
        setIsMuted(devSettings.audio.isMuted);
      }
    }
  }, []);

  // Helper: Request Landscape Screen Orientation Lock (Paksa Landscape pada HP)
  const lockLandscapeOrientation = useCallback(async () => {
    try {
      if (screen?.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      } else if ((screen as any)?.mozLockOrientation) {
        (screen as any).mozLockOrientation('landscape');
      } else if ((screen as any)?.msLockOrientation) {
        (screen as any).msLockOrientation('landscape');
      }
    } catch {
      // Browser may require fullscreen or user gesture first; handled gracefully
    }
  }, []);

  // Portrait Detection State (Layar HP dalam posisi tegak / @media (orientation: portrait))
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isPortraitMedia = window.matchMedia?.('(orientation: portrait)')?.matches ?? false;
    return (isPortraitMedia || window.innerHeight > window.innerWidth) && window.innerWidth <= 1024;
  });
  const [bypassPortrait, setBypassPortrait] = useState<boolean>(false);

  useEffect(() => {
    const mql = window.matchMedia?.('(orientation: portrait)');
    const checkOrientation = () => {
      const isPortraitMedia = mql?.matches ?? (window.innerHeight > window.innerWidth);
      const portrait = isPortraitMedia && window.innerWidth <= 1024;
      setIsPortrait(portrait);
      if (!portrait) {
        lockLandscapeOrientation();
      }
    };

    checkOrientation();
    mql?.addEventListener?.('change', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Kunci landscape saat interaksi sentuhan pertama kali
    const handleFirstTouch = () => {
      lockLandscapeOrientation();
      window.removeEventListener('pointerdown', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
    window.addEventListener('pointerdown', handleFirstTouch);
    window.addEventListener('touchstart', handleFirstTouch);

    return () => {
      mql?.removeEventListener?.('change', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('pointerdown', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, [lockLandscapeOrientation]);

  // Disable right-click context menu & long-press inspect globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Fullscreen Support for Mobile & Desktop
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Main Menu BGM initialization
  useEffect(() => {
    soundManager.playMenuBGM(1.5);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        lockLandscapeOrientation();
      }).catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isAnyModalOpen =
    !hasStarted ||
    isPauseMenuOpen ||
    isSettingsOpen ||
    isInventoryOpen ||
    isStatsOpen ||
    isQuestsOpen ||
    isHelpOpen ||
    isMapOpen ||
    dialogueState.isOpen ||
    shopState.isOpen;

  useEffect(() => {
    engineRef.current?.setControlsLocked(isAnyModalOpen);
  }, [isAnyModalOpen]);

  // Synchronize pause state with 3D engine:
  // - Single Player: Hentikan loop animasi Three.js & pergerakan monster AI
  // - Multiplayer: Jangan hentikan loop karena server Socket.io berjalan real-time
  useEffect(() => {
    if (!engineRef.current) return;
    if (isPauseMenuOpen && gameMode === 'singleplayer') {
      engineRef.current.setPaused(true);
    } else {
      engineRef.current.setPaused(false);
    }
  }, [isPauseMenuOpen, gameMode]);

  // Floating Combat & Notification Texts
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Nearby Interactive Prompts (NPC, Chest)
  const [nearbyPrompt, setNearbyPrompt] = useState<string | null>(null);
  const promptActionRef = useRef<(() => void) | undefined>(undefined);

  // Boss Combat Bar
  const [bossState, setBossState] = useState<{
    active: boolean;
    name?: string;
    hp?: number;
    maxHp?: number;
  }>({
    active: false,
  });
  const [bossVictoryName, setBossVictoryName] = useState<string | null>(null);

  // Sound Settings
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [worldCacheToast, setWorldCacheToast] = useState<string | null>(null);

  useEffect(() => {
    let timerId: number | null = null;
    const onWorldCacheSaved = (e: Event) => {
      const msg =
        (e as CustomEvent<{ message?: string }>).detail?.message ||
        '⚡ Cache dunia disimpan di browser ini untuk loading berikutnya';
      setWorldCacheToast(msg);
      if (timerId !== null) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        setWorldCacheToast(null);
        timerId = null;
      }, 4000);
    };
    window.addEventListener('eldoria_world_cache_saved', onWorldCacheSaved);
    return () => {
      window.removeEventListener('eldoria_world_cache_saved', onWorldCacheSaved);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  // Add floating combat text helper (streamlined to max 3 items to avoid screen clutter)
  const addFloatingText = useCallback(
    (text: string, color: string, type: FloatingText['type']) => {
      const id = `${Date.now()}_${Math.random()}`;
      const newText: FloatingText = {
        id,
        text,
        x: 48 + (Math.random() - 0.5) * 8,
        y: 42 + (Math.random() - 0.5) * 6,
        color,
        type,
        createdAt: Date.now(),
      };
      setFloatingTexts((prev) => [...prev.slice(-2), newText]);

      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((ft) => ft.id !== id));
      }, 950);
    },
    []
  );

  // Helper to initialize class base stats
  const applyClassStats = (cls: CharacterClass) => {
    setCharacterClass(cls);
    setStats((prev) => {
      let hp = 130;
      let mp = 50;
      let str = 7;
      let agi = 4;
      let int = 3;
      let atk = 14;
      let def = 10;

      if (cls === 'mage') {
        hp = 100;
        mp = 110;
        str = 3;
        agi = 4;
        int = 9;
        atk = 16;
        def = 6;
      } else if (cls === 'rogue') {
        hp = 110;
        mp = 60;
        str = 5;
        agi = 9;
        int = 3;
        atk = 13;
        def = 7;
      }

      return {
        ...prev,
        characterClass: cls,
        hp,
        maxHp: hp,
        mp,
        maxMp: mp,
        strength: str,
        agility: agi,
        intelligence: int,
        baseAttack: atk,
        baseDefense: def,
      };
    });
  };

  // Resume game from Pause Modal
  const handleResumeGame = () => {
    setIsPauseMenuOpen(false);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
    }
  };

  // Play time tracker for active gameplay
  useEffect(() => {
    if (!hasStarted || gameMode !== 'singleplayer') return;
    const timer = setInterval(() => {
      playTimeRef.current += 1;
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, gameMode]);

  // Register Cloud Migration Handler & Cloud Save Listener
  useEffect(() => {
    cloudSyncManager.setMigrationHandler((data) => {
      setMigrationDialogData(data);
      setIsAuthModalOpen(true);
    });

    const handleCloudSaveLoaded = (e: Event) => {
      const customEvt = e as CustomEvent<EldoriaGuestSaveData>;
      const cloudData = customEvt.detail;
      if (!cloudData) return;
      const currentRole = statsRef.current.characterClass;
      if (cloudData.roleSaves && cloudData.roleSaves[currentRole]) {
        const rData = cloudData.roleSaves[currentRole]!;
        if (rData.stats) setStats({ ...rData.stats });
        if (rData.inventory) setInventory([...rData.inventory]);
        if (rData.quests) setQuests([...rData.quests]);
      }
      addFloatingText('☁️ Save Data Cloud Berhasil Dimuat!', '#38bdf8', 'info');
    };

    window.addEventListener('eldoria_cloud_save_loaded', handleCloudSaveLoaded);
    return () => window.removeEventListener('eldoria_cloud_save_loaded', handleCloudSaveLoaded);
  }, [addFloatingText]);

  // Centralized save function for the current active role
  const handleSaveRoleProgress = useCallback(
    (isManual = false, milestoneReason?: string) => {
      if (!hasStarted || gameModeRef.current !== 'singleplayer') return;
      const currentStats = statsRef.current;
      const role = currentStats.characterClass || characterClass;
      const pos = playerPosRef.current;
      const regionName = currentRegionRef.current?.nameId || currentRegionRef.current?.name || 'Desa Sanctuary';

      const roleData: RoleSaveData = {
        stats: { ...currentStats },
        inventory: [...inventoryRef.current],
        quests: [...questsRef.current],
        lastPosition: { x: pos.x, y: 0, z: pos.z },
        lastRegion: regionName,
        savedAt: Date.now(),
        playTimeSeconds: playTimeRef.current,
      };

      const success = saveRoleProgress(role, roleData);
      if (isManual) {
        if (success) {
          addFloatingText('💾 Game Berhasil Disimpan!', '#38bdf8', 'info');
          soundManager.playLevelUp();
          cloudSyncManager.syncLocalToCloud(true);
        } else {
          addFloatingText('Gagal menyimpan game!', '#ef4444', 'crit');
        }
      } else if (milestoneReason) {
        cloudSyncManager.triggerMilestoneSync(milestoneReason);
      } else {
        cloudSyncManager.markDirty();
      }
    },
    [hasStarted, characterClass, addFloatingText]
  );

  // Background auto-save every 10 seconds in single player
  useEffect(() => {
    if (!hasStarted || gameMode !== 'singleplayer') return;
    const timer = setInterval(() => {
      handleSaveRoleProgress(false);
    }, 10000);
    return () => clearInterval(timer);
  }, [hasStarted, gameMode, handleSaveRoleProgress]);

  // Auto-save on page refresh / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasStarted && gameModeRef.current === 'singleplayer') {
        handleSaveRoleProgress(false);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [hasStarted, handleSaveRoleProgress]);

  // Start Single Player Mode (100% Client-Side offline, no server/WebSocket connection)
  const handleStartSinglePlayer = async (
    selectedClass: CharacterClass,
    slotData?: SaveSlotData,
    continueRole = false
  ) => {
    setIsPauseMenuOpen(false);
    setGameMode('singleplayer');
    multiplayerClient.disconnect();

    const savedRole = getRoleSave(selectedClass);
    if (continueRole && savedRole && savedRole.stats) {
      setCharacterClass(selectedClass);
      setStats(savedRole.stats);
      statsRef.current = savedRole.stats;
      if (Array.isArray(savedRole.inventory) && savedRole.inventory.length > 0) {
        setInventory(savedRole.inventory);
        inventoryRef.current = savedRole.inventory;
      }
      if (Array.isArray(savedRole.quests) && savedRole.quests.length > 0) {
        setQuests(savedRole.quests);
        questsRef.current = savedRole.quests;
      }
      playTimeRef.current = savedRole.playTimeSeconds || 0;
    } else {
      applyClassStats(selectedClass);
      setInventory(INITIAL_ITEMS);
      inventoryRef.current = INITIAL_ITEMS;
      setQuests(INITIAL_QUESTS);
      questsRef.current = INITIAL_QUESTS;
      playTimeRef.current = 0;

      if (slotData && !slotData.isEmpty && slotData.level) {
        setStats((prev) => ({
          ...prev,
          level: slotData.level || 1,
          hp: slotData.hp || prev.hp,
          maxHp: slotData.maxHp || prev.maxHp,
          mp: slotData.mp || prev.mp,
          maxMp: slotData.maxMp || prev.maxMp,
          gold: slotData.gold || prev.gold,
        }));
      }
    }

    setHasStarted(true);

    // Time-Sliced Async World Loading Pipeline (Anti-Freeze 15% -> 100%)
    setIsLoadingGameplay(true);
    setIsLoadingFadeOut(false);
    setLoadingProgress(5);
    setLoadingMessage('Mempersiapkan Benua Eldoria...');

    if (engineRef.current) {
      engineRef.current.setPaused(true);
      await engineRef.current.initFullWorldAsync((percent, text) => {
        setLoadingProgress(percent);
        setLoadingMessage(text);
      });
      engineRef.current.setGameMode('singleplayer', 'Pahlawan');
      engineRef.current.setCharacterClass(selectedClass);
      engineRef.current.clearRemotePlayers();
      engineRef.current.setMenuMode('gameplay');

      // Teleport to saved position if continuing
      if (continueRole && savedRole?.lastPosition) {
        const { x, z } = savedRole.lastPosition;
        if (typeof x === 'number' && typeof z === 'number' && !isNaN(x) && !isNaN(z)) {
          engineRef.current.teleportTo(x, z);
          setTimeout(() => {
            addFloatingText(`Melanjutkan petualangan Lv. ${savedRole.stats.level}!`, '#38bdf8', 'info');
          }, 300);
        }
      }
    }

    soundManager.playOverworldBGM(1.5);
    setIsMusicPlaying(true);
    setIsLoadingFadeOut(true);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
    }
    setTimeout(() => {
      setIsLoadingGameplay(false);
      setIsLoadingFadeOut(false);
    }, 500);
  };

  // Start Multiplayer Mode (Socket.io client-server synchronization)
  const handleStartMultiplayer = async (options: MultiplayerStartOptions) => {
    setIsPauseMenuOpen(false);
    setGameMode('multiplayer');
    setMultiplayerConfig(options);
    applyClassStats(options.charClass);
    setHasStarted(true);

    // Time-Sliced Async World Loading Pipeline (Anti-Freeze 15% -> 100%)
    setIsLoadingGameplay(true);
    setIsLoadingFadeOut(false);
    setLoadingProgress(5);
    setLoadingMessage('Menghubungkan ke Server & Mempersiapkan Dunia...');

    if (engineRef.current) {
      engineRef.current.setPaused(true);
      await engineRef.current.initFullWorldAsync((percent, text) => {
        setLoadingProgress(percent);
        setLoadingMessage(text);
      });
      engineRef.current.setGameMode('multiplayer', options.playerName);
      engineRef.current.setCharacterClass(options.charClass);
      engineRef.current.setMenuMode('gameplay');
    }

    soundManager.playOverworldBGM(1.5);
    setIsMusicPlaying(true);
    setIsLoadingFadeOut(true);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
    }
    setTimeout(() => {
      setIsLoadingGameplay(false);
      setIsLoadingFadeOut(false);
    }, 500);
  };

  // Return to Main Menu from Single Player
  const handleReturnToMainMenu = () => {
    if (hasStarted && gameMode === 'singleplayer') {
      handleSaveRoleProgress(false);
    }
    setIsPauseMenuOpen(false);
    setHasStarted(false);
    soundManager.playMenuBGM(1.5);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      engineRef.current.clearCombatState();
      engineRef.current.setGameMode('singleplayer');
      engineRef.current.clearRemotePlayers();
      engineRef.current.setMenuMode('main_menu');
    }
    setMultiplayerPlayers({});
    setIsChatOpen(false);
    setFloatingTexts([]);
  };

  // Disconnect & Return to Main Menu from Multiplayer (Disconnects Socket.io client)
  const handleDisconnectAndReturnToMainMenu = () => {
    setIsPauseMenuOpen(false);
    multiplayerClient.disconnect();
    setHasStarted(false);
    soundManager.playMenuBGM(1.5);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      engineRef.current.clearCombatState();
      engineRef.current.setGameMode('singleplayer');
      engineRef.current.clearRemotePlayers();
      engineRef.current.setMenuMode('main_menu');
    }
    setMultiplayerPlayers({});
    setIsChatOpen(false);
    setFloatingTexts([]);
    addFloatingText('Terputus dari server. Kembali ke Menu Utama.', '#f59e0b', 'info');
  };

  const handleToggleSpectator = useCallback((landAtCamera = false) => {
    if (!engineRef.current) return;
    const nextState = engineRef.current.toggleSpectatorMode(undefined, landAtCamera);
    setIsSpectatorMode(nextState);
    if (nextState) {
      setSpectatorSpeed(engineRef.current.getSpectatorSpeed());
    } else {
      setIsUIVisible(true);
    }
  }, []);

  // Initialize Three.js engine when canvas container mounts
  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;

    const engine = new GameEngine(containerRef.current, characterClass, {
      onUpdateStats: (updater) => {
        setStats((prev) => {
          const next = updater(prev);
          engine.syncPlayerStats(next);
          if (next.level > prev.level || next.statPoints !== prev.statPoints) {
            setTimeout(() => handleSaveRoleProgress(false, 'level_up'), 50);
          }
          return next;
        });
      },
      onUpdateQuests: (updater) => {
        setQuests((prev) => {
          const next = updater(prev);
          setTimeout(() => handleSaveRoleProgress(false, 'quest_update'), 50);
          return next;
        });
      },
      onAddItem: (item) => {
        setInventory((prev) => {
          const next = [...prev, item];
          setTimeout(() => handleSaveRoleProgress(false, 'item_added'), 50);
          return next;
        });
      },
      onAddFloatingText: addFloatingText,
      onInteractNPC: (dialogueIdOrNpcId) => {
        const dlg = DIALOGUES[dialogueIdOrNpcId] || DIALOGUES['elder_intro'];
        if (dlg) {
          setDialogueState({
            isOpen: true,
            node: dlg,
          });
        }
      },
      onNearbyPrompt: (prompt, action) => {
        setNearbyPrompt(prompt);
        promptActionRef.current = action;
      },
      onEnemyStatsUpdate: () => {},
      onBossEncounter: (active, name, hp, maxHp) => {
        setBossState({ active, name, hp, maxHp });
        if (active) {
          const lower = (name || '').toLowerCase();
          if (lower.includes('ignis') || lower.includes('dragon')) {
            soundManager.playBossMusic('dragon');
          } else if (lower.includes('jarrus') || lower.includes('cacing') || lower.includes('worm')) {
            soundManager.playBossMusic('worm');
          } else {
            soundManager.playBossMusic('titan');
          }
        } else if (soundManager.getCurrentBossMusic()) {
          soundManager.evadeBossMusic(2.5);
        }
      },
      onBossDefeated: (name) => {
        setBossVictoryName(name || 'SANG TITAN KUNO OBSIDIAN');
        setTimeout(() => {
          setBossVictoryName(null);
        }, 4500);
      },
      onSpectatorModeChange: (active) => {
        setIsSpectatorMode(active);
        if (engineRef.current) {
          setSpectatorSpeed(engineRef.current.getSpectatorSpeed());
        }
      },
      onPlayerPositionUpdate: (posData) => {
        setPlayerPos((prev) => {
          if (
            Math.abs(prev.x - posData.x) < 0.08 &&
            Math.abs(prev.z - posData.z) < 0.08 &&
            Math.abs((prev.y ?? 0) - (posData.y ?? 0)) < 0.08 &&
            Math.abs(prev.rotationY - posData.rotationY) < 0.05
          ) {
            return prev;
          }
          return { x: posData.x, y: posData.y ?? 0, z: posData.z, rotationY: posData.rotationY };
        });
        setCurrentRegion((prev) => (prev.id === posData.region.id ? prev : posData.region));
        setMapMarkers((prev) => (prev.length === posData.markers.length ? prev : posData.markers));
      },
      onHunterWeaponSwitch: (mode) => {
        setHunterWeaponMode(mode);
      },
      onGlacialAimChange: (aiming, targetInfo) => {
        setIsGlacialAiming(aiming);
        setGlacialTarget(targetInfo || null);
      },
      onBowAimChange: (aiming, ratio) => {
        setIsBowAiming(aiming);
        setBowChargeRatio(ratio);
      },
      onArrowVolleyAimChange: (aiming) => {
        setIsArrowVolleyAiming(aiming);
      },
      onCastingUpdate: (casting) => {
        setCastingState(casting);
      },
      onPreviewRoleSelected: (role) => {
        setPreviewRole(role);
      },
      onCheckpointUnlocked: (id, nameId) => {
        setUnlockedCheckpoints((prev) => {
          if (prev.includes(id)) return prev;
          const next = [...prev, id];
          try {
            localStorage.setItem('eldoria_unlocked_checkpoints', JSON.stringify(next));
          } catch {}
          return next;
        });
      },
      onLocalPlayerMove: (moveData) => {
        if (gameModeRef.current === 'multiplayer') {
          multiplayerClient.sendMove({
            ...moveData,
            hp: statsRef.current.hp,
            maxHp: statsRef.current.maxHp,
            level: statsRef.current.level,
          });
        }
      },
      onLocalPlayerAttack: (attackData) => {
        if (gameModeRef.current === 'multiplayer') {
          multiplayerClient.sendAttack(attackData);
        }
      },
      onLocalMonsterHit: (hitData) => {
        if (gameModeRef.current === 'multiplayer') {
          multiplayerClient.sendMonsterHit(hitData);
        }
      },
    });

    if (hasStarted) {
      engine.initFullWorld();
      if (gameMode === 'multiplayer' && multiplayerConfig) {
        engine.setGameMode('multiplayer', multiplayerConfig.playerName);
      } else {
        engine.setGameMode('singleplayer', 'Pahlawan');
      }
      engine.setMenuMode('gameplay');
    } else {
      engine.setMenuMode('main_menu');
    }

    // Asynchronous Staggered Loading (Anti-Freeze Main Thread)
    let isCancelled = false;
    const runStaggeredInit = async () => {
      // Step 1: Pre-decode all Mage skill SFX audio buffers into AudioBuffer memory
      await soundManager.preloadMageAudioBuffers();
      if (isCancelled) return;

      // Yield main thread
      await new Promise((r) => requestAnimationFrame(r));
      if (isCancelled) return;

      // Step 2: If starting directly in gameplay, prewarm & compile shaders
      if (hasStarted) {
        engine.prewarmMageShadersInFrustum();
        engine.compileAllShaders();
        if (isCancelled) return;
        await new Promise((r) => requestAnimationFrame(r));
        if (isCancelled) return;
      }

      // Step 3: Wait for 3 stable render frames before dismissing initial loading screen
      let frameCount = 0;
      const countFrames = () => {
        frameCount++;
        if (frameCount >= 3) {
          if (!isCancelled) {
            setIsInitialLoading(false);
          }
        } else {
          requestAnimationFrame(countFrames);
        }
      };
      requestAnimationFrame(countFrames);
    };

    runStaggeredInit();

    engineRef.current = engine;
    engine.syncPlayerStats(stats);

    return () => {
      isCancelled = true;
      engine.destroy();
      engineRef.current = null;
    };
  }, [addFloatingText]);

  // Synchronize player stats with 3D engine mirror for zero-lag combat logic
  useEffect(() => {
    if (engineRef.current && stats) {
      engineRef.current.syncPlayerStats(stats);
    }
  }, [stats]);

  // Synchronize player character class model if changed dynamically
  useEffect(() => {
    if (engineRef.current && hasStarted) {
      engineRef.current.setCharacterClass(characterClass);
    }
  }, [characterClass, hasStarted]);

  // Connect to Socket.io when entering Multiplayer Mode
  useEffect(() => {
    if (!hasStarted || gameMode !== 'multiplayer' || !multiplayerConfig) return;

    multiplayerClient.connect(
      {
        serverUrl: multiplayerConfig.serverUrl,
        roomName: multiplayerConfig.roomName,
        playerName: multiplayerConfig.playerName,
        charClass: multiplayerConfig.charClass,
        level: stats.level,
        hp: stats.hp,
        maxHp: stats.maxHp,
        initialPos: { x: playerPos.x, y: 0.5, z: playerPos.z, rotationY: playerPos.rotationY },
      },
      {
        onConnected: () => {
          addFloatingText(`Online! Terhubung ke room: ${multiplayerConfig.roomName}`, '#4ade80', 'crit');
          soundManager.playLevelUp();
        },
        onConnectError: (err) => {
          addFloatingText(`Koneksi Gagal: ${err}`, '#ef4444', 'damage');
        },
        onDisconnected: (reason) => {
          addFloatingText(`Terputus dari server: ${reason}`, '#f87171', 'damage');
        },
        onCurrentPlayers: (players) => {
          setMultiplayerPlayers(players);
          Object.values(players).forEach((p) => {
            if (p.name !== multiplayerConfig.playerName) {
              engineRef.current?.addOrUpdateRemotePlayer(p);
            }
          });
        },
        onPlayerJoined: (player) => {
          setMultiplayerPlayers((prev) => ({ ...prev, [player.id]: player }));
          if (player.name !== multiplayerConfig.playerName) {
            engineRef.current?.addOrUpdateRemotePlayer(player);
            addFloatingText(`Player "${player.name}" bergabung!`, '#38bdf8', 'info');
          }
        },
        onPlayerMoved: (data) => {
          engineRef.current?.addOrUpdateRemotePlayer(data as any);
        },
        onRemotePlayerAttack: (data) => {
          engineRef.current?.triggerRemotePlayerAttack(data);
        },
        onMonsterDamaged: (data) => {
          engineRef.current?.applyRemoteMonsterDamage(data);
        },
        onMonstersSync: (monsters) => {
          engineRef.current?.applyRemoteMonsterPositions(monsters);
        },
        onPlayerLeft: (id) => {
          setMultiplayerPlayers((prev) => {
            const next = { ...prev };
            const leftPlayer = next[id];
            if (leftPlayer) {
              addFloatingText(`Player "${leftPlayer.name}" meninggalkan room.`, '#94a3b8', 'info');
            }
            delete next[id];
            return next;
          });
          engineRef.current?.removeRemotePlayer(id);
        },
        onChatReceived: (msg) => {
          setMultiplayerMessages((prev) => [...prev, msg]);
          if (!isChatOpen) {
            setUnreadChatCount((prev) => prev + 1);
          }
        },
      }
    );

    return () => {
      multiplayerClient.disconnect();
    };
  }, [hasStarted, gameMode, multiplayerConfig]);

  // Synchronize player level with 3D engine (for visual tier evolutions)
  useEffect(() => {
    if (engineRef.current && stats.level) {
      engineRef.current.setPlayerLevel(stats.level);
    }
  }, [stats.level]);

  // Recalculate stats when gear is equipped/unequipped
  const recalculateGearStats = (items: Item[]) => {
    let bonusAtk = 0;
    let bonusDef = 0;
    let bonusHp = 0;
    let bonusMp = 0;

    items.forEach((it) => {
      if (it.equipped && it.stats) {
        if (it.stats.attack) bonusAtk += it.stats.attack;
        if (it.stats.defense) bonusDef += it.stats.defense;
        if (it.stats.hp) bonusHp += it.stats.hp;
        if (it.stats.mp) bonusMp += it.stats.mp;
      }
    });

    setStats((prev) => {
      const baseAtk = prev.strength * 1.5 + bonusAtk;
      const baseDef = 8 + bonusDef;
      return {
        ...prev,
        baseAttack: baseAtk,
        baseDefense: baseDef,
      };
    });
  };

  const handleEquipItem = (item: Item) => {
    soundManager.playChestOpen();
    setInventory((prev) => {
      const updated = prev.map((it) => {
        // Toggle if same item
        if (it.id === item.id) {
          return { ...it, equipped: !it.equipped };
        }
        // Unequip previous item of same type
        if (it.type === item.type && !item.equipped) {
          return { ...it, equipped: false };
        }
        return it;
      });

      recalculateGearStats(updated);
      return updated;
    });
  };

  const handleUseConsumable = (item: Item) => {
    if (!item.consumableEffect) return;

    setStats((prev) => {
      const newHp = Math.min(prev.maxHp, prev.hp + (item.consumableEffect?.hpRestore || 0));
      const newMp = Math.min(prev.maxMp, prev.mp + (item.consumableEffect?.mpRestore || 0));
      return { ...prev, hp: newHp, mp: newMp };
    });

    if (item.consumableEffect.hpRestore) {
      addFloatingText(`+${item.consumableEffect.hpRestore} HP`, '#66bb6a', 'heal');
    }
    if (item.consumableEffect.mpRestore) {
      addFloatingText(`+${item.consumableEffect.mpRestore} MP`, '#4fc3f7', 'heal');
    }

    // Remove single used potion from inventory
    setInventory((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      return prev;
    });
  };

  const handleAllocateStatPoint = (stat: 'strength' | 'agility' | 'intelligence') => {
    setStats((prev) => {
      if (prev.statPoints <= 0) return prev;
      const next = {
        ...prev,
        statPoints: prev.statPoints - 1,
        [stat]: prev[stat] + 1,
      };

      if (stat === 'strength') {
        next.baseAttack += 1.5;
        next.maxHp += 5;
        next.hp = Math.min(next.maxHp, next.hp + 5);
      } else if (stat === 'intelligence') {
        next.maxMp += 8;
        next.mp = Math.min(next.maxMp, next.mp + 8);
      }

      return next;
    });
  };

  const handleClaimQuestReward = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === questId && q.completed && !q.claimed) {
          // Grant rewards
          setStats((st) => ({
            ...st,
            exp: st.exp + q.rewardExp,
            gold: st.gold + q.rewardGold,
          }));

          if (q.rewardItem) {
            setInventory((inv) => [...inv, q.rewardItem!]);
            addFloatingText(`Dapat: ${q.rewardItem.nameId}!`, '#ffd700', 'info');
          }

          addFloatingText(`+${q.rewardExp} EXP!`, '#42a5f5', 'exp');
          addFloatingText(`+${q.rewardGold} Gold!`, '#ffca28', 'exp');
          setTimeout(() => handleSaveRoleProgress(false, 'quest_claimed'), 50);

          return { ...q, claimed: true };
        }
        return q;
      })
    );
  };

  const handleBuyItem = (item: Item, totalCost: number, quantity: number) => {
    if (stats.gold < totalCost) {
      addFloatingText('Emas tidak cukup!', '#ef4444', 'crit');
      return;
    }
    setStats((prev) => ({ ...prev, gold: prev.gold - totalCost }));
    setInventory((prev) => {
      const newItems: Item[] = [];
      for (let i = 0; i < quantity; i++) {
        newItems.push({
          ...item,
          id: `${item.id}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          equipped: false,
        });
      }
      return [...prev, ...newItems];
    });
    soundManager.playChestOpen();
    addFloatingText(`Beli: ${item.nameId} (${quantity}x)`, '#ffd700', 'info');
    setTimeout(() => handleSaveRoleProgress(false, 'shop_purchase'), 50);
  };

  const handleSellItem = (item: Item, sellPrice: number) => {
    setStats((prev) => ({ ...prev, gold: prev.gold + sellPrice }));
    setInventory((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx === -1) return prev;
      const updated = [...prev];
      const [removed] = updated.splice(idx, 1);
      if (removed.equipped) {
        recalculateGearStats(updated);
      }
      return updated;
    });
    soundManager.playLevelUp();
    addFloatingText(`+${sellPrice} Gold (Terjual: ${item.nameId})`, '#4caf50', 'exp');
    setTimeout(() => handleSaveRoleProgress(false, 'shop_sell'), 50);
  };

  const handleEnhanceItem = (item: Item, cost: number, upgradedItem: Item) => {
    if (stats.gold < cost) {
      addFloatingText('Emas tidak cukup untuk menempa!', '#ef4444', 'crit');
      return;
    }
    setStats((prev) => ({ ...prev, gold: prev.gold - cost }));
    setInventory((prev) => {
      const updated = prev.map((it) => (it.id === item.id ? upgradedItem : it));
      if (item.equipped) {
        recalculateGearStats(updated);
      }
      return updated;
    });
    soundManager.playLevelUp();
    addFloatingText(
      `Tempa Berhasil! ${upgradedItem.nameId} (+${upgradedItem.enhancementLevel || 1})`,
      '#f59e0b',
      'crit'
    );
    setTimeout(() => handleSaveRoleProgress(false, 'item_enhanced'), 50);
  };

  const handleDialogueOption = (option: DialogueNode['options'][0]) => {
    if (option.action === 'close') {
      setDialogueState({ isOpen: false, node: null });
    } else if (option.action === 'openShop') {
      setDialogueState({ isOpen: false, node: null });
      setShopState({
        isOpen: true,
        shopId: option.shopType || 'blacksmith',
      });
    } else if (option.action === 'heal') {
      setStats((prev) => ({ ...prev, hp: prev.maxHp, mp: prev.maxMp }));
      addFloatingText('Sembuh Sepenuhnya!', '#66bb6a', 'heal');
      setDialogueState({ isOpen: true, node: DIALOGUES['healed_blessing'] });
    } else if (option.action === 'acceptQuest') {
      if (option.questId) {
        setQuests((prev) =>
          prev.map((q) => (q.id === option.questId ? { ...q, currentCount: 1, completed: true } : q))
        );
        addFloatingText('Misi Selesai: Panggilan Lembah Kuno!', '#69f0ae', 'crit');
      }
      setDialogueState({ isOpen: false, node: null });
    } else if (option.nextId && DIALOGUES[option.nextId]) {
      setDialogueState({ isOpen: true, node: DIALOGUES[option.nextId] });
    }
  };

  // Keyboard shortcut listener for UI toggles
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // 1. Cek apakah user sedang mengetik di input box / chat / text field
      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = (activeElement?.tagName || '').toLowerCase();
      const isTyping =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        Boolean(activeElement?.isContentEditable);

      if (isTyping) {
        if (e.key === 'Escape') {
          activeElement?.blur();
        }
        return;
      }

      // 2. Escape key handling
      if (e.key === 'Escape') {
        if (!hasStarted) return;

        // If settings modal is open, close it
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }

        // If UI was hidden, restore it first on Escape
        if (!isUIVisible) {
          setIsUIVisible(true);
          engineRef.current?.setHudHidden(false);
          return;
        }

        // If any sub-modal is open, close that first
        if (
          isInventoryOpen ||
          isStatsOpen ||
          isQuestsOpen ||
          isHelpOpen ||
          isMapOpen ||
          shopState.isOpen ||
          dialogueState.isOpen
        ) {
          setIsInventoryOpen(false);
          setIsStatsOpen(false);
          setIsQuestsOpen(false);
          setIsHelpOpen(false);
          setIsMapOpen(false);
          setShopState((prev) => ({ ...prev, isOpen: false }));
          setDialogueState({ isOpen: false, node: null });
          return;
        }

        // Toggle Pause Menu:
        // - Single Player: Hentikan loop animasi Three.js & monster
        // - Multiplayer: Tampilkan menu tanpa menghentikan waktu/loop game
        setIsPauseMenuOpen((prev) => !prev);
        return;
      }

      // 3. Jika game belum dimulai, atau sedang di Pause menu / Settings / Dialog, jangan picu shortcut game
      if (!hasStarted || isPauseMenuOpen || isSettingsOpen || dialogueState.isOpen) {
        return;
      }

      // 4. Shortcut toggles
      if (e.key === 'F3' || e.code === 'F3') {
        e.preventDefault();
        handleToggleSpectator(false);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'i') {
        setIsInventoryOpen((prev) => !prev);
      } else if (key === 'b') {
        setShopState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
      } else if (key === 'c') {
        setIsStatsOpen((prev) => !prev);
      } else if (key === 'l') {
        setIsQuestsOpen((prev) => !prev);
      } else if (key === 'h') {
        if (isSpectatorMode || !isUIVisible) {
          e.preventDefault();
          setIsUIVisible((prev) => {
            const next = !prev;
            engineRef.current?.setHudHidden(!next);
            return next;
          });
        } else {
          setIsHelpOpen((prev) => !prev);
        }
      } else if (key === 'm') {
        setIsMapOpen((prev) => !prev);
      } else if (key === 'k') {
        handleToggleTouchControls();
        addFloatingText(showTouchControls ? 'Kontroler Layar: Disembunyikan (Off)' : 'Kontroler Layar: Ditampilkan (On)', '#f59e0b', 'info');
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [
    hasStarted,
    isPauseMenuOpen,
    isSettingsOpen,
    isInventoryOpen,
    isStatsOpen,
    isQuestsOpen,
    isHelpOpen,
    isMapOpen,
    shopState.isOpen,
    dialogueState.isOpen,
    showTouchControls,
    isSpectatorMode,
    isUIVisible,
    handleToggleSpectator,
  ]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-stone-950 select-none">
      {/* 3D WebGL Canvas Viewport - Strictly isolated at base layer (z-index: 0) */}
      <div
        ref={containerRef}
        id="webgl-canvas-container"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          opacity: 1,
          visibility: 'visible',
          zIndex: 0,
          pointerEvents: 'auto',
        }}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0 pointer-events-auto"
      />

      {/* Main Menu Overlay (Single Player & Multiplayer Mode Selection) */}
      <MainMenu
        isOpen={!hasStarted}
        onStartSinglePlayer={handleStartSinglePlayer}
        onStartMultiplayer={handleStartMultiplayer}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onMenuModeChange={(mode) => engineRef.current?.setMenuMode(mode)}
        onPlayRoleAction={(role) => engineRef.current?.playRoleSelectAction(role)}
        onSelectPreviewRole={(role) => {
          setPreviewRole(role);
          engineRef.current?.setSelectedPreviewRole(role);
        }}
        selectedPreviewRole={previewRole}
      />

      {/* Initial Website Pre-Render & Gameplay Transition Loading Screen Overlay */}
      <LoadingScreen
        isLoading={isInitialLoading || isLoadingGameplay}
        isFadingOut={isLoadingFadeOut}
        progress={isInitialLoading ? undefined : loadingProgress}
        message={isInitialLoading ? "Menyiapkan Dunia & Mengompilasi Shader Tiga Dimensi..." : loadingMessage}
      />

      {/* Primary In-Game HUD Overlay */}
      {hasStarted && (
        <>
          <HUD
            stats={stats}
            quests={quests}
            floatingTexts={floatingTexts}
            nearbyPrompt={nearbyPrompt}
            onPromptClick={() => {
              if (promptActionRef.current) {
                promptActionRef.current();
              }
            }}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenShop={() => setShopState((prev) => ({ ...prev, isOpen: true }))}
            onOpenStats={() => setIsStatsOpen(true)}
            onOpenQuests={() => setIsQuestsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            onPerformAttack={() => engineRef.current?.performBasicAttack()}
            onAttackStart={() => engineRef.current?.startBasicAttack()}
            onAttackEnd={() => engineRef.current?.releaseBasicAttack()}
            onCastSkill={(slot) => engineRef.current?.castSkill(slot)}
            onAimSkillStart={(slot) => {
              if (slot === 1) {
                if (characterClass === 'mage') {
                  engineRef.current?.startAimGlacialBarrage();
                } else if (characterClass === 'rogue' && hunterWeaponMode === 'bow') {
                  engineRef.current?.startAimArrowVolley();
                }
              }
            }}
            onAimSkillMove={(slot, delta) => {
              if (slot === 1) {
                if (characterClass === 'mage') {
                  engineRef.current?.updateAimGlacialBarrage(delta.x, delta.y);
                } else if (characterClass === 'rogue' && hunterWeaponMode === 'bow') {
                  engineRef.current?.updateAimArrowVolley(delta.x, delta.y);
                }
              }
            }}
            onAimSkillEnd={(slot, isCancelled) => {
              if (slot === 1) {
                if (characterClass === 'mage') {
                  engineRef.current?.releaseAimGlacialBarrage(isCancelled);
                } else if (characterClass === 'rogue' && hunterWeaponMode === 'bow') {
                  engineRef.current?.releaseAimArrowVolley(isCancelled);
                }
              }
            }}
            isGlacialAiming={isGlacialAiming}
            glacialTarget={glacialTarget}
            isBowAiming={isBowAiming}
            bowChargeRatio={bowChargeRatio}
            isArrowVolleyAiming={isArrowVolleyAiming}
            onJump={() => engineRef.current?.jump()}
            onDash={() => engineRef.current?.performDash()}
            onRotateCamera={(dx, dy) => engineRef.current?.rotateCameraByDelta(dx, dy)}
            onZoomCamera={(dz) => engineRef.current?.zoomCameraByDelta(dz)}
            bossState={bossState}
            bossVictoryName={bossVictoryName}
            isMuted={isMuted}
            onToggleMute={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              soundManager.setMuted(nextMuted);
              updateDeviceSettings({
                audio: {
                  isMuted: nextMuted,
                  bgmVolume: soundManager.getBgmVolume(),
                  sfxVolume: soundManager.getSfxVolume(),
                },
              });
            }}
            isMusicPlaying={isMusicPlaying}
            onToggleMusic={() => {
              const active = soundManager.toggleBGM();
              setIsMusicPlaying(active);
            }}
            playerPos={playerPos}
            currentRegion={currentRegion}
            mapMarkers={mapMarkers}
            hunterWeaponMode={hunterWeaponMode}
            onSwitchHunterWeapon={() => engineRef.current?.switchHunterWeapon()}
            isSpectatorMode={isSpectatorMode}
            isUIVisible={isUIVisible}
            onToggleSpectator={() => handleToggleSpectator(false)}
            onLandSpectator={() => handleToggleSpectator(true)}
            castingState={castingState}
            gameMode={gameMode}
            multiplayerInfo={
              gameMode === 'multiplayer' && multiplayerConfig
                ? {
                    isConnected: multiplayerClient.isConnectedStatus(),
                    roomName: multiplayerConfig.roomName,
                    onlineCount: Object.keys(multiplayerPlayers).length + 1,
                    playerName: multiplayerConfig.playerName,
                  }
                : undefined
            }
            onToggleChat={() => {
              setIsChatOpen((prev) => !prev);
              setUnreadChatCount(0);
            }}
            unreadChatCount={unreadChatCount}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenMenu={() => setIsPauseMenuOpen(true)}
            onSaveGame={() => handleSaveRoleProgress(true)}
            showTouchControls={showTouchControls}
            onToggleTouchControls={handleToggleTouchControls}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />

          {/* Spectator Freecam HUD & Speed Controls Overlay */}
          <CameraControls
            isSpectatorMode={isSpectatorMode}
            spectatorSpeed={spectatorSpeed}
            isUIVisible={isUIVisible}
            playerPos={playerPos}
            currentRegion={currentRegion}
            onToggleUIVisibility={() => {
              setIsUIVisible((prev) => {
                const next = !prev;
                engineRef.current?.setHudHidden(!next);
                return next;
              });
            }}
            onToggleSpectator={() => handleToggleSpectator(false)}
            onLandSpectator={() => handleToggleSpectator(true)}
            onAdjustSpeed={(delta) => {
              engineRef.current?.adjustSpectatorSpeed(delta);
              if (engineRef.current) {
                setSpectatorSpeed(engineRef.current.getSpectatorSpeed());
              }
            }}
            gameEngine={engineRef.current}
          />

          {/* Multiplayer In-Game Chat Box */}
          {gameMode === 'multiplayer' && (
            <div className={`transition-opacity duration-200 ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <MultiplayerChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                messages={multiplayerMessages}
                onSendMessage={(text) => {
                  multiplayerClient.sendChat(text);
                }}
                localPlayerName={multiplayerConfig?.playerName || 'Pahlawan'}
                roomName={multiplayerConfig?.roomName || 'World-1'}
                onlineCount={Object.keys(multiplayerPlayers).length + 1}
              />
            </div>
          )}

          {/* Virtual Joystick for Touch / Mobile devices (Hidden in spectator mode or when UI is hidden) */}
          {!isAnyModalOpen && !isSpectatorMode && showTouchControls && (
            <div className={`transition-opacity duration-200 ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <VirtualJoystick
                onMove={(vec) => {
                  if (engineRef.current) {
                    engineRef.current.joystickVector = vec;
                  }
                }}
                onHide={handleToggleTouchControls}
              />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventory={inventory}
        stats={stats}
        onEquipItem={handleEquipItem}
        onUseConsumable={handleUseConsumable}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        onAllocatePoint={handleAllocateStatPoint}
      />

      <QuestModal
        isOpen={isQuestsOpen}
        onClose={() => setIsQuestsOpen(false)}
        quests={quests}
        onClaimReward={handleClaimQuestReward}
      />

      <WorldMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        playerPos={playerPos}
        currentRegion={currentRegion}
        markers={mapMarkers}
        unlockedCheckpoints={unlockedCheckpoints}
        onFastTravel={(x, z) => {
          engineRef.current?.teleportTo(x, z);
          addFloatingText('Teleportasi Berhasil!', '#00e5ff', 'crit');
        }}
      />

      <DialogueModal
        isOpen={dialogueState.isOpen}
        dialogue={dialogueState.node}
        onSelectOption={handleDialogueOption}
        onClose={() => setDialogueState({ isOpen: false, node: null })}
      />

      {/* RPG Shops & Blacksmith Enhancement Modal */}
      <ShopModal
        isOpen={shopState.isOpen}
        initialShopId={shopState.shopId}
        playerGold={stats.gold}
        playerLevel={stats.level}
        playerClass={stats.characterClass}
        inventory={inventory}
        onClose={() => setShopState((prev) => ({ ...prev, isOpen: false }))}
        onBuyItem={handleBuyItem}
        onSellItem={handleSellItem}
        onEnhanceItem={handleEnhanceItem}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Pause Menu Modal (Triggered by Esc or Top Menu Button) */}
      <PauseModal
        isOpen={hasStarted && isPauseMenuOpen}
        gameMode={gameMode}
        multiplayerRoom={multiplayerConfig?.roomName}
        playerName={multiplayerConfig?.playerName || 'Pahlawan'}
        connectedPlayersCount={Object.keys(multiplayerPlayers).length + 1}
        showTouchControls={showTouchControls}
        onToggleTouchControls={handleToggleTouchControls}
        graphicsSettings={graphicsSettings}
        onApplyGraphicsSettings={(newSettings) => {
          setGraphicsSettings(newSettings);
          engineRef.current?.applyGraphicsSettings(newSettings);
          addFloatingText('Pengaturan Diterapkan! ⚙️', '#38bdf8', 'info');
        }}
        onResume={handleResumeGame}
        onReturnToMainMenu={handleReturnToMainMenu}
        onDisconnectAndReturnToMainMenu={handleDisconnectAndReturnToMainMenu}
        onSaveGame={() => handleSaveRoleProgress(true)}
      />

      {/* Graphics & Performance Settings Modal (Optimization for Low-End PCs) */}
      <GraphicsSettingsModal
        isOpen={isSettingsOpen}
        currentSettings={graphicsSettings}
        onApply={(newSettings) => {
          setGraphicsSettings(newSettings);
          engineRef.current?.applyGraphicsSettings(newSettings);
          addFloatingText('Pengaturan Grafis Diterapkan! âš™ï¸', '#38bdf8', 'info');
        }}
        onClose={() => setIsSettingsOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onResetGuest={() => {
          handleReturnToMainMenu();
          addFloatingText('Data Guest Lokal Direset!', '#ef4444', 'crit');
        }}
      />

      {/* Cloud Authentication & Cross-Device Account Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setMigrationDialogData(null);
        }}
        migrationData={migrationDialogData}
        onResolveMigration={() => setMigrationDialogData(null)}
        onSuccess={() => {
          addFloatingText('☁️ Terhubung ke Akun Cloud!', '#38bdf8', 'info');
        }}
      />

      {worldCacheToast && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-xl bg-stone-950/90 border border-cyan-500/60 text-cyan-200 text-xs font-bold shadow-xl backdrop-blur-md animate-in fade-in duration-200">
          {worldCacheToast}
        </div>
      )}

      {/* ============================================================== */}
      {/* PORTRAIT WARNING OVERLAY: PERINGATAN PUTAR HP KE LANDSCAPE     */}
      {/* Muncul otomatis jika pengguna membuka game di HP dalam mode    */}
      {/* portrait untuk memastikan kenyamanan kontrol sentuh dua jempol */}
      {/* ============================================================== */}
      {isPortrait && !bypassPortrait && (
        <div
          style={{ zIndex: 100000 }}
          className="portrait-orientation-warning fixed inset-0 z-[100000] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-stone-950 via-stone-900 to-black text-center backdrop-blur-2xl animate-fade-in font-sans select-none"
        >
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center shadow-2xl shadow-amber-500/20">
              <Smartphone className="w-12 h-12 text-amber-400 animate-rotate-phone" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-black text-xs shadow-lg">
              â†»
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Mode Landscape Diperlukan</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-amber-100 mb-2 max-w-sm tracking-wide">
            Harap Putar HP Anda ke Posisi Miring (Landscape) untuk Memulai Permainan
          </h2>

          <p className="text-xs sm:text-sm text-stone-400 max-w-sm mb-6 leading-relaxed">
            Untuk kenyamanan kontrol sentuh dua jempol tangan dan pandangan dunia 3D Eldoria yang luas, silakan putar perangkat Anda ke posisi horizontal (Landscape).
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                  }
                  await lockLandscapeOrientation();
                } catch {}
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black text-sm shadow-xl active:scale-95 transition cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Layar Penuh (Landscape)</span>
            </button>

            <button
              type="button"
              onClick={() => setBypassPortrait(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-xs font-semibold transition cursor-pointer"
            >
              Tetap Lanjut (Abaikan)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
