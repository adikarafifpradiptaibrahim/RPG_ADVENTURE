import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/3d/gameEngine';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { StatsModal } from './components/StatsModal';
import { QuestModal } from './components/QuestModal';
import { DialogueModal } from './components/DialogueModal';
import { HelpModal } from './components/HelpModal';
import { WorldMapModal } from './components/WorldMapModal';
import { ClassSelectModal } from './components/ClassSelectModal';
import { VirtualJoystick } from './components/VirtualJoystick';
import { soundManager } from './game/audio';
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

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game Start & Class Selection State
  const [hasStarted, setHasStarted] = useState(false);
  const [characterClass, setCharacterClass] = useState<CharacterClass>('warrior');

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

  // Items & Quests
  const [inventory, setInventory] = useState<Item[]>(INITIAL_ITEMS);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);

  // Modals & UI States
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
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

  const isAnyModalOpen =
    !hasStarted ||
    isInventoryOpen ||
    isStatsOpen ||
    isQuestsOpen ||
    isHelpOpen ||
    isMapOpen ||
    dialogueState.isOpen;

  useEffect(() => {
    engineRef.current?.setControlsLocked(isAnyModalOpen);
  }, [isAnyModalOpen]);

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

  // Start 3D Game Engine after class selection
  const startGame = () => {
    setHasStarted(true);

    // Set class base stats adjustments
    setStats((prev) => {
      let hp = 130;
      let mp = 50;
      let str = 7;
      let agi = 4;
      let int = 3;
      let atk = 14;
      let def = 10;

      if (characterClass === 'mage') {
        hp = 100;
        mp = 110;
        str = 3;
        agi = 4;
        int = 9;
        atk = 16;
        def = 6;
      } else if (characterClass === 'rogue') {
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
        characterClass,
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
      onInteractNPC: (npcId) => {
        if (npcId === 'elder_vaelen') {
          setDialogueState({
            isOpen: true,
            node: DIALOGUES['elder_intro'],
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
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [hasStarted, characterClass, addFloatingText]);

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

  const handleDialogueOption = (option: DialogueNode['options'][0]) => {
    if (option.action === 'close') {
      setDialogueState({ isOpen: false, node: null });
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
      } else if (key === 'c') {
        setIsStatsOpen((prev) => !prev);
      } else if (key === 'l') {
        setIsQuestsOpen((prev) => !prev);
      } else if (key === 'h') {
        setIsHelpOpen((prev) => !prev);
      } else if (key === 'm') {
        setIsMapOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsInventoryOpen(false);
        setIsStatsOpen(false);
        setIsQuestsOpen(false);
        setIsHelpOpen(false);
        setIsMapOpen(false);
        setDialogueState({ isOpen: false, node: null });
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-stone-950 select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Class Selection Screen (Start of Game) */}
      <ClassSelectModal
        isOpen={!hasStarted}
        selectedClass={characterClass}
        onSelectClass={setCharacterClass}
        onStartGame={startGame}
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
          />

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

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
