import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/3d/gameEngine';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { StatsModal } from './components/StatsModal';
import { QuestModal } from './components/QuestModal';
import { DialogueModal } from './components/DialogueModal';
import { HelpModal } from './components/HelpModal';
import { WorldMapModal } from './components/WorldMapModal';
import { ShopModal } from './components/ShopModal';
import { MainMenuModal, MultiplayerStartOptions } from './components/MainMenuModal';
import { PauseModal } from './components/PauseModal';
import { MultiplayerChat } from './components/MultiplayerChat';
import { VirtualJoystick } from './components/VirtualJoystick';
import { soundManager } from './game/audio';
import { multiplayerClient, RemotePlayerData, ChatMessage } from './game/multiplayer';
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

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game Start & Mode State
  const [hasStarted, setHasStarted] = useState(false);
  const [gameMode, setGameMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
  const [characterClass, setCharacterClass] = useState<CharacterClass>('warrior');
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

  // World Map & Minimap Live Position State
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 4, rotationY: 0 });
  const [currentRegion, setCurrentRegion] = useState<RegionInfo>(REGIONS[0]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [hunterWeaponMode, setHunterWeaponMode] = useState<'dagger' | 'bow'>('dagger');

  // Pause Menu State
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);

  const isAnyModalOpen =
    !hasStarted ||
    isPauseMenuOpen ||
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

  // Sound Settings
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Add floating combat text helper
  const addFloatingText = useCallback(
    (text: string, color: string, type: FloatingText['type']) => {
      const id = `${Date.now()}_${Math.random()}`;
      const newText: FloatingText = {
        id,
        text,
        x: 46 + (Math.random() - 0.5) * 16,
        y: 42 + (Math.random() - 0.5) * 12,
        color,
        type,
        createdAt: Date.now(),
      };
      setFloatingTexts((prev) => [...prev, newText]);

      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((ft) => ft.id !== id));
      }, 1100);
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

  // Start Single Player Mode (100% Client-Side offline, no server/WebSocket connection)
  const handleStartSinglePlayer = (selectedClass: CharacterClass) => {
    setIsPauseMenuOpen(false);
    setGameMode('singleplayer');
    multiplayerClient.disconnect();
    applyClassStats(selectedClass);
    setHasStarted(true);

    if (engineRef.current) {
      engineRef.current.setPaused(false);
      engineRef.current.setGameMode('singleplayer', 'Pahlawan');
      engineRef.current.setCharacterClass(selectedClass);
      engineRef.current.clearRemotePlayers();
    }
  };

  // Start Multiplayer Mode (Socket.io client-server synchronization)
  const handleStartMultiplayer = (options: MultiplayerStartOptions) => {
    setIsPauseMenuOpen(false);
    setGameMode('multiplayer');
    setMultiplayerConfig(options);
    applyClassStats(options.charClass);
    setHasStarted(true);

    if (engineRef.current) {
      engineRef.current.setPaused(false);
      engineRef.current.setGameMode('multiplayer', options.playerName);
      engineRef.current.setCharacterClass(options.charClass);
    }
  };

  // Return to Main Menu from Single Player
  const handleReturnToMainMenu = () => {
    setIsPauseMenuOpen(false);
    setHasStarted(false);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      engineRef.current.setGameMode('singleplayer');
      engineRef.current.clearRemotePlayers();
    }
    setMultiplayerPlayers({});
    setIsChatOpen(false);
  };

  // Disconnect & Return to Main Menu from Multiplayer (Disconnects Socket.io client)
  const handleDisconnectAndReturnToMainMenu = () => {
    setIsPauseMenuOpen(false);
    multiplayerClient.disconnect();
    setHasStarted(false);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      engineRef.current.setGameMode('singleplayer');
      engineRef.current.clearRemotePlayers();
    }
    setMultiplayerPlayers({});
    setIsChatOpen(false);
    addFloatingText('Terputus dari server. Kembali ke Menu Utama.', '#f59e0b', 'info');
  };

  // Initialize Three.js engine when canvas container mounts
  useEffect(() => {
    if (!hasStarted || !containerRef.current) return;

    const engine = new GameEngine(containerRef.current, characterClass, {
      onUpdateStats: (updater) => setStats(updater),
      onUpdateQuests: (updater) => setQuests(updater),
      onAddItem: (item) => {
        setInventory((prev) => [...prev, item]);
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
      },
      onPlayerPositionUpdate: (posData) => {
        setPlayerPos({ x: posData.x, z: posData.z, rotationY: posData.rotationY });
        setCurrentRegion(posData.region);
        setMapMarkers(posData.markers);
      },
      onHunterWeaponSwitch: (mode) => {
        setHunterWeaponMode(mode);
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

    if (gameMode === 'multiplayer' && multiplayerConfig) {
      engine.setGameMode('multiplayer', multiplayerConfig.playerName);
    } else {
      engine.setGameMode('singleplayer', 'Pahlawan');
    }

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [hasStarted, characterClass, addFloatingText]);

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
        setIsHelpOpen((prev) => !prev);
      } else if (key === 'm') {
        setIsMapOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (!hasStarted) return;

        // If an input element is active, unfocus it
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          (document.activeElement as HTMLElement)?.blur();
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
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [
    hasStarted,
    isInventoryOpen,
    isStatsOpen,
    isQuestsOpen,
    isHelpOpen,
    isMapOpen,
    shopState.isOpen,
    dialogueState.isOpen,
  ]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-stone-950 select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Main Menu Overlay (Single Player & Multiplayer Mode Selection) */}
      <MainMenuModal
        isOpen={!hasStarted}
        onStartSinglePlayer={handleStartSinglePlayer}
        onStartMultiplayer={handleStartMultiplayer}
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
            onCastSkill={(slot) => engineRef.current?.castSkill(slot)}
            onJump={() => engineRef.current?.jumpOrDodge()}
            bossState={bossState}
            isMuted={isMuted}
            onToggleMute={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              soundManager.setMuted(nextMuted);
            }}
            isMusicPlaying={isMusicPlaying}
            onToggleMusic={() => {
              soundManager.toggleAmbientMusic();
              setIsMusicPlaying(soundManager.getMusicPlaying());
            }}
            playerPos={playerPos}
            currentRegion={currentRegion}
            mapMarkers={mapMarkers}
            hunterWeaponMode={hunterWeaponMode}
            onSwitchHunterWeapon={() => engineRef.current?.switchHunterWeapon()}
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
            onOpenMenu={() => setIsPauseMenuOpen(true)}
          />

          {/* Multiplayer In-Game Chat Box */}
          {gameMode === 'multiplayer' && (
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
          )}

          {/* Virtual Joystick for Touch / Mobile devices */}
          <VirtualJoystick
            onMove={(vec) => {
              if (engineRef.current) {
                engineRef.current.joystickVector = vec;
              }
            }}
          />
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
        onResume={handleResumeGame}
        onReturnToMainMenu={handleReturnToMainMenu}
        onDisconnectAndReturnToMainMenu={handleDisconnectAndReturnToMainMenu}
      />
    </div>
  );
}
