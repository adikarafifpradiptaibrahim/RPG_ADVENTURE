import React, { useState, useRef, useEffect } from 'react';
import {
  PlayerStats,
  Quest,
  FloatingText,
  MapMarker,
  RegionInfo,
} from '../types/game';
import {
  Shield,
  Zap,
  Heart,
  Coins,
  Backpack,
  User,
  Scroll,
  Volume2,
  VolumeX,
  Music,
  Compass,
  Sparkles,
  HelpCircle,
  Map,
  ShoppingBag,
  Home,
  MessageSquare,
  Users,
  Pause,
  Settings,
  Gamepad2,
  Maximize2,
  Minimize2,
  Camera,
  Smartphone,
  Save,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { MiniMap } from './MiniMap';
import { getSharedDayNightSystem } from '../game/3d/dayNightSystem';
import { SkillBar } from './SkillBar';
import { HudSkillCooldownMap } from '../game/skillCooldownManager';
import { QuestTracker } from './QuestTracker';
import {
  cloudSyncManager,
  CloudUser,
  CloudSyncStatus,
} from '../game/storage/cloudSyncManager';
import { useMobileViewport } from '../game/utils/mobileViewport';
import { MobileAimSlot } from './SkillBar';

interface HUDProps {
  stats: PlayerStats;
  quests: Quest[];
  floatingTexts: FloatingText[];
  nearbyPrompt: string | null;
  onPromptClick?: () => void;
  onOpenInventory: () => void;
  onOpenShop?: () => void;
  onOpenStats: () => void;
  onOpenQuests: () => void;
  onOpenHelp: () => void;
  onOpenMap: () => void;
  onPerformAttack: () => void;
  onAttackStart?: () => void;
  onAttackEnd?: () => void;
  onCastSkill: (slot: 1 | 2 | 3 | 4) => void;
  onAimSkillStart?: (slot: 1 | 2 | 3 | 4) => void;
  onAimSkillMove?: (slot: 1 | 2 | 3 | 4, delta: { x: number; y: number }, aimAngleRad: number) => void;
  onAimSkillEnd?: (slot: 1 | 2 | 3 | 4, isCancelled: boolean) => void;
  onMobileAimStart?: (slot: MobileAimSlot) => void;
  onMobileAimMove?: (slot: MobileAimSlot, nx: number, ny: number, isOverCancel: boolean) => void;
  onMobileAimEnd?: (slot: MobileAimSlot, isCancelled: boolean, isQuickTap: boolean) => void;
  isTouchControlsVisible?: boolean;
  isModalOpen?: boolean;
  onJump: () => void;
  onDash?: () => void;
  onRotateCamera?: (deltaX: number, deltaY: number) => void;
  onZoomCamera?: (deltaZoom: number) => void;
  isGlacialAiming?: boolean;
  glacialTarget?: { name: string; hp: number; maxHp: number; isBoss?: boolean } | null;
  isBowAiming?: boolean;
  bowChargeRatio?: number;
  isArrowVolleyAiming?: boolean;
  bossState: {
    active: boolean;
    name?: string;
    title?: string;
    hp?: number;
    maxHp?: number;
    combatActive?: boolean;
  };
  bossVictoryName?: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  playerPos: { x: number; z: number; rotationY: number };
  currentRegion: RegionInfo;
  mapMarkers: MapMarker[];
  hunterWeaponMode?: 'dagger' | 'bow';
  onSwitchHunterWeapon?: () => void;
  isWeaponDrawn?: boolean;
  onToggleWeaponDrawn?: () => void;
  gameMode?: 'singleplayer' | 'multiplayer';
  multiplayerInfo?: {
    isConnected: boolean;
    roomName: string;
    onlineCount: number;
    playerName: string;
  };
  onToggleChat?: () => void;
  unreadChatCount?: number;
  onOpenMenu?: () => void;
  onOpenSettings?: () => void;
  showTouchControls?: boolean;
  onToggleTouchControls?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isSpectatorMode?: boolean;
  onToggleSpectator?: () => void;
  onLandSpectator?: () => void;
  castingState?: { isCasting: boolean; progress: number; text: string } | null;
  isUIVisible?: boolean;
  onSaveGame?: () => void;
  stealthActive?: boolean;
  getSkillCooldowns?: () => HudSkillCooldownMap | null;
  subscribeSkillCooldowns?: (listener: () => void) => () => void;
  getStealthState?: () => { active: boolean; remaining: number } | null;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  quests,
  floatingTexts,
  nearbyPrompt,
  onPromptClick,
  onOpenInventory,
  onOpenShop,
  onOpenStats,
  onOpenQuests,
  onOpenHelp,
  onOpenMap,
  onPerformAttack,
  onAttackStart,
  onAttackEnd,
  onCastSkill,
  onAimSkillStart,
  onAimSkillMove,
  onAimSkillEnd,
  onMobileAimStart,
  onMobileAimMove,
  onMobileAimEnd,
  isTouchControlsVisible = true,
  isModalOpen = false,
  onJump,
  onDash,
  onRotateCamera,
  onZoomCamera,
  isGlacialAiming,
  glacialTarget,
  isBowAiming,
  bowChargeRatio,
  isArrowVolleyAiming,
  bossState,
  bossVictoryName,
  isMuted,
  onToggleMute,
  isMusicPlaying,
  onToggleMusic,
  playerPos,
  currentRegion,
  mapMarkers,
  hunterWeaponMode = 'dagger',
  onSwitchHunterWeapon,
  isWeaponDrawn = false,
  onToggleWeaponDrawn,
  gameMode = 'singleplayer',
  multiplayerInfo,
  onToggleChat,
  unreadChatCount = 0,
  onOpenMenu,
  onOpenSettings,
  showTouchControls = false,
  onToggleTouchControls,
  isFullscreen = false,
  onToggleFullscreen,
  isSpectatorMode = false,
  onToggleSpectator,
  onLandSpectator,
  castingState,
  isUIVisible = true,
  onSaveGame,
  stealthActive = false,
  getSkillCooldowns,
  subscribeSkillCooldowns,
  getStealthState,
}) => {
  const { isMobileUi } = useMobileViewport();
  const [dayNight, setDayNight] = useState(() => getSharedDayNightSystem().getState());
  const [saveNotice, setSaveNotice] = useState(false);

  // Location Transition Toast (Mobile Landscape): shows for 3.2s ONLY when entering a different region
  const prevRegionIdRef = useRef<string>(currentRegion.id);
  const locationToastTimerRef = useRef<number | null>(null);
  const locationToastClearRef = useRef<number | null>(null);
  const [locationToast, setLocationToast] = useState<{
    nameId: string;
    icon: string;
    recommendedLevel: number;
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    const regionId = currentRegion?.id;
    if (!regionId) return;
    if (prevRegionIdRef.current !== regionId) {
      prevRegionIdRef.current = regionId;
      if (isMobileUi && !isSpectatorMode) {
        if (locationToastTimerRef.current) window.clearTimeout(locationToastTimerRef.current);
        if (locationToastClearRef.current) window.clearTimeout(locationToastClearRef.current);
        setLocationToast({
          nameId: currentRegion.nameId,
          icon: currentRegion.icon,
          recommendedLevel: currentRegion.recommendedLevel,
          visible: true,
        });
        locationToastTimerRef.current = window.setTimeout(() => {
          setLocationToast((prev) => (prev ? { ...prev, visible: false } : null));
        }, 2850);
        locationToastClearRef.current = window.setTimeout(() => {
          setLocationToast(null);
        }, 3250);
      }
    }
  }, [currentRegion?.id, currentRegion?.nameId, currentRegion?.icon, currentRegion?.recommendedLevel, isMobileUi, isSpectatorMode]);

  useEffect(() => {
    return () => {
      if (locationToastTimerRef.current) window.clearTimeout(locationToastTimerRef.current);
      if (locationToastClearRef.current) window.clearTimeout(locationToastClearRef.current);
    };
  }, []);

  // Cloud Account State
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(() => cloudSyncManager.getUser());
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => cloudSyncManager.getStatus());

  useEffect(() => {
    const unsubUser = cloudSyncManager.subscribeUser(setCloudUser);
    const unsubStatus = cloudSyncManager.subscribeStatus(setSyncStatus);
    return () => {
      unsubUser();
      unsubStatus();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDayNight(getSharedDayNightSystem().getState());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeQuest = quests.find((q) => !q.completed) || quests[quests.length - 1];

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const mpPercent = Math.max(0, Math.min(100, (stats.mp / stats.maxMp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stats.stamina / stats.maxStamina) * 100));
  const expPercent = Math.max(0, Math.min(100, (stats.exp / stats.maxExp) * 100));

  const getClassBadge = () => {
    switch (stats.characterClass) {
      case 'warrior':
        return { label: 'Ksatria (Warrior)', icon: '⚔️', color: 'bg-blue-600' };
      case 'mage':
        return { label: 'Penyihir (Mage)', icon: '🔮', color: 'bg-purple-600' };
      case 'rogue':
        return {
          label: hunterWeaponMode === 'bow' ? 'Pemburu (Busur)' : 'Pemburu (Belati)',
          icon: hunterWeaponMode === 'bow' ? '🏹' : '🗡️',
          color: 'bg-emerald-600',
        };
    }
  };

  const classBadge = getClassBadge();

  return (
    <div
      id="ui-root"
      className={`hud-container pointer-events-none absolute inset-0 select-none overflow-hidden font-sans transition-opacity duration-200 ${
        isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 3D Floating Numbers / Combat Text (Clean & Compact) */}
      {!isSpectatorMode && (
        <div className="absolute inset-0 pointer-events-none">
          {floatingTexts.map((ft) => (
            <div
              key={ft.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 font-black tracking-wider transition-all duration-300 drop-shadow-lg"
              style={{
                left: `${ft.x}%`,
                top: `${ft.y}%`,
                color: ft.color,
                textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.6)',
                fontSize: ft.type === 'crit' ? '22px' : '16px',
              }}
            >
              {ft.text}
            </div>
          ))}
        </div>
      )}

      {/* Top Left: Player Status Orb & Bars */}
      {!isSpectatorMode && (
        isMobileUi ? (
          <div
            style={{
              top: 'max(4px, env(safe-area-inset-top, 0px))',
              left: 'max(10px, env(safe-area-inset-left, 0px))',
            }}
            className="pointer-events-none fixed flex flex-col gap-[3px] w-[182px] z-30"
          >
            <div className="pointer-events-auto flex items-center gap-1.5 bg-stone-900/85 backdrop-blur-md p-1 rounded-xl border border-stone-700/70 shadow-xl">
              <div className="relative flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-inner border border-stone-600 ${classBadge.color}`}>
                  {classBadge.icon}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 font-black text-[8px] px-1 py-[1px] rounded shadow border border-amber-300 leading-none">
                  Lv.{stats.level}
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
                {/* HP Bar */}
                <div className="relative w-full h-[11px] bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-200"
                    style={{ width: `${hpPercent}%` }}
                  />
                  {stats.shield !== undefined && stats.shield > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300/80 via-yellow-100/90 to-amber-200/80 border-r border-white transition-all duration-200"
                      style={{ width: `${Math.min(100, (stats.shield / (stats.maxShield || stats.maxHp)) * 100)}%` }}
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-[7.5px] font-bold text-white drop-shadow leading-none">
                    {Math.round(stats.hp)}/{stats.maxHp}
                  </span>
                </div>

                {/* MP / Aura Bar */}
                <div className="relative w-full h-[9px] bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                  <div
                    className={`h-full transition-all duration-200 ${
                      stats.characterClass === 'warrior'
                        ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-300'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                    }`}
                    style={{ width: `${mpPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white drop-shadow leading-none">
                    {Math.round(stats.mp)}/{stats.maxMp} {stats.characterClass === 'warrior' ? 'Au' : 'MP'}
                  </span>
                </div>

                {/* Stamina Bar */}
                <div className="relative w-full h-[9px] bg-stone-800 rounded-full overflow-hidden border border-amber-600/50">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-300 transition-all duration-150"
                    style={{ width: `${staminaPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-stone-950 leading-none">
                    {Math.round(stats.stamina)}/{stats.maxStamina} Stm
                  </span>
                </div>
              </div>
            </div>

            {/* Compact Gold & Stat Points Row */}
            <div className="pointer-events-auto flex items-center gap-1.5 text-[10px]">
              <div className="flex items-center gap-1 bg-stone-900/85 backdrop-blur-md px-2 py-[1px] rounded-lg border border-amber-500/35 text-amber-300 font-bold shadow">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>{stats.gold}</span>
              </div>

              {stats.statPoints > 0 && (
                <button
                  onClick={onOpenStats}
                  className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black px-2 py-[1px] rounded-lg shadow-lg animate-pulse cursor-pointer border border-amber-200"
                >
                  <span>+{stats.statPoints} Poin</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="hud-player-status pointer-events-none absolute top-4 left-4 flex flex-col gap-2 max-w-xs md:max-w-sm z-30">
            <div className="pointer-events-auto flex items-center gap-3 bg-stone-900/80 backdrop-blur-md p-3 rounded-2xl border border-stone-700/60 shadow-xl">
              {/* Avatar / Class Icon */}
              <div className="relative flex-shrink-0">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-stone-600 ${classBadge.color}`}>
                  {classBadge.icon}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 font-bold text-xs px-1.5 py-0.5 rounded-md shadow border border-amber-300">
                  Lv.{stats.level}
                </div>
              </div>

              {/* Vitals Bars */}
              <div className="flex-1 min-w-[170px] flex flex-col gap-1.5">
                {/* HP Bar */}
                <div className="relative w-full h-4 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-200"
                    style={{ width: `${hpPercent}%` }}
                  />
                  {stats.shield !== undefined && stats.shield > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300/80 via-yellow-100/90 to-amber-200/80 border-r-2 border-white shadow-[0_0_8px_rgba(255,215,0,0.8)] transition-all duration-200"
                      style={{ width: `${Math.min(100, (stats.shield / (stats.maxShield || stats.maxHp)) * 100)}%` }}
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                    <Heart className="w-2.5 h-2.5 inline mr-1 text-red-300" />
                    {Math.round(stats.hp)} / {stats.maxHp} HP
                    {stats.shield !== undefined && stats.shield > 0 && (
                      <span className="ml-1 text-yellow-300 drop-shadow font-extrabold">(+{Math.round(stats.shield)})</span>
                    )}
                  </span>
                </div>

                {/* MP / Aura Bar */}
                <div className="relative w-full h-3.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                  <div
                    className={`h-full transition-all duration-200 ${
                      stats.characterClass === 'warrior'
                        ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-300'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                    }`}
                    style={{ width: `${mpPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                    <Sparkles className={`w-2 h-2 inline mr-1 ${stats.characterClass === 'warrior' ? 'text-amber-200' : 'text-cyan-300'}`} />
                    {Math.round(stats.mp)} / {stats.maxMp} {stats.characterClass === 'warrior' ? 'Aura' : 'MP'}
                  </span>
                </div>

                {/* Stamina Bar (Kuning-Emas) */}
                <div className="relative w-full h-3 bg-stone-800 rounded-full overflow-hidden border border-amber-600/50">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-300 transition-all duration-150"
                    style={{ width: `${staminaPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-stone-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    <Zap className="w-2.5 h-2.5 inline mr-1 text-amber-900 fill-current" />
                    {Math.round(stats.stamina)} / {stats.maxStamina} Stamina
                  </span>
                </div>
              </div>
            </div>

            {/* Currency & Stat Points Reminder */}
            <div className="pointer-events-auto flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-stone-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 font-semibold shadow">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{stats.gold} Gold</span>
              </div>

              {stats.statPoints > 0 && (
                <button
                  onClick={onOpenStats}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold px-3 py-1.5 rounded-xl shadow-lg animate-pulse cursor-pointer border border-amber-200"
                >
                  <span>+{stats.statPoints} Poin Status!</span>
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* Top Right: MiniMap & 1-Row Thin Utility Actions */}
      {isMobileUi ? (
        <div
          style={{
            top: 'max(6px, env(safe-area-inset-top, 0px))',
            right: 'max(10px, env(safe-area-inset-right, 0px))',
          }}
          className="pointer-events-none fixed flex items-start gap-1.5 z-30"
        >
          {/* Single Horizontal Thin Utility Strip (height 30px, icons 28px, gap 5px) */}
          {!isSpectatorMode && (
            <div className="pointer-events-auto flex items-center flex-nowrap gap-[5px] h-[30px]">
              <button
                type="button"
                onClick={onOpenInventory}
                className="w-7 h-7 shrink-0 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer"
                title="Tas"
              >
                <Backpack className="w-3.5 h-3.5 text-amber-400" />
              </button>

              {onOpenShop && (
                <button
                  type="button"
                  onClick={onOpenShop}
                  className="w-7 h-7 shrink-0 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-amber-500/60 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer"
                  title="Toko"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-yellow-400" />
                </button>
              )}

              <button
                type="button"
                onClick={onOpenStats}
                className="relative w-7 h-7 shrink-0 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer"
                title="Status"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                {stats.statPoints > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-stone-900 animate-ping" />
                )}
              </button>

              {gameMode === 'singleplayer' && onSaveGame ? (
                <button
                  type="button"
                  onClick={() => {
                    onSaveGame();
                    setSaveNotice(true);
                    setTimeout(() => setSaveNotice(false), 2200);
                  }}
                  className={`w-7 h-7 shrink-0 rounded-lg border flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer ${
                    saveNotice
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300'
                      : cloudUser
                      ? 'bg-indigo-950/90 border-indigo-500/60 text-indigo-300'
                      : 'bg-stone-900/90 border-stone-700/80 text-blue-400'
                  }`}
                  title="Simpan Game"
                >
                  {cloudUser ? (
                    syncStatus === 'syncing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                onToggleChat && (
                  <button
                    type="button"
                    onClick={onToggleChat}
                    className="relative w-7 h-7 shrink-0 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-amber-500/50 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer text-amber-300"
                    title="Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
                )
              )}

              {onToggleSpectator && (
                <button
                  type="button"
                  onClick={onToggleSpectator}
                  className={`w-7 h-7 shrink-0 rounded-lg border flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer ${
                    isSpectatorMode
                      ? 'bg-sky-950/90 border-sky-400 text-sky-300'
                      : 'bg-stone-900/90 border-stone-700/80 text-sky-400'
                  }`}
                  title="Kamera"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}

              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className={`w-7 h-7 shrink-0 rounded-lg border flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer ${
                    isFullscreen
                      ? 'bg-emerald-700/90 border-emerald-400 text-white'
                      : 'bg-stone-900/90 border-stone-700/80 text-stone-300'
                  }`}
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              )}

              {onOpenMenu && (
                <button
                  type="button"
                  onClick={onOpenMenu}
                  className="w-7 h-7 shrink-0 rounded-lg bg-stone-900/95 hover:bg-stone-800 border border-amber-500/50 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer"
                  title="Pause & Pengaturan"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}
            </div>
          )}

          {/* Compact Circular Minimap (78px, tap to open full World Map) */}
          <MiniMap
            playerPos={playerPos}
            currentRegion={currentRegion}
            markers={mapMarkers}
            onOpenFullMap={onOpenMap}
            compactMobile={true}
          />
        </div>
      ) : (
        <div
          style={{ top: '15px', right: '15px' }}
          className="hud-minimap-cluster pointer-events-none absolute flex flex-col items-end gap-1.5 sm:gap-2.5 max-w-xs z-30"
        >
          {/* Desktop System Buttons Row (Visible on PC) */}
          <div className="pointer-events-none flex items-center gap-1.5 flex-wrap justify-end">
            {!isSpectatorMode && (
              gameMode === 'singleplayer' ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[11px] font-bold shadow pointer-events-none">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span>Solo</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 pointer-events-none">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-bold shadow pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <Users className="w-3 h-3 text-amber-400" />
                    <span>{multiplayerInfo?.onlineCount || 1} Online</span>
                  </div>
                  {onToggleChat && (
                    <button
                      onClick={onToggleChat}
                      title="Buka Chat Multiplayer"
                      className="pointer-events-auto relative p-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-amber-500/40 text-amber-300 text-xs font-bold transition shadow cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {unreadChatCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow">
                          {unreadChatCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )
            )}

            {onSaveGame && gameMode === 'singleplayer' && (
              <button
                onClick={() => {
                  onSaveGame();
                  setSaveNotice(true);
                  setTimeout(() => setSaveNotice(false), 2200);
                }}
                title={
                  cloudUser
                    ? 'Simpan Game (Otomatis Sinkron ke Cloud & Cache Lokal)'
                    : 'Simpan Game (Save Game ke Cache Browser)'
                }
                className={`pointer-events-auto px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow active:scale-95 ${
                  saveNotice
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                    : cloudUser
                    ? 'bg-indigo-950/90 hover:bg-indigo-900 border-indigo-500/50 text-indigo-200 hover:text-white'
                    : 'bg-stone-900/90 hover:bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
                }`}
              >
                {cloudUser ? (
                  syncStatus === 'syncing' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  ) : (
                    <Cloud className={`w-3.5 h-3.5 ${saveNotice ? 'text-emerald-400' : 'text-indigo-400'}`} />
                  )
                ) : (
                  <Save className={`w-3.5 h-3.5 ${saveNotice ? 'text-emerald-400' : 'text-blue-400'}`} />
                )}
                <span>
                  {saveNotice
                    ? cloudUser
                      ? 'Cloud Tersimpan!'
                      : 'Tersimpan!'
                    : syncStatus === 'syncing'
                    ? 'Menyinkronkan...'
                    : cloudUser
                    ? 'Simpan Cloud'
                    : 'Simpan'}
                </span>
              </button>
            )}

            {onOpenMenu && (
              <button
                onClick={onOpenMenu}
                title={gameMode === 'singleplayer' ? 'Pause Permainan & Pengaturan (Esc)' : 'Menu Multiplayer (Esc)'}
                className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow active:scale-95"
              >
                {gameMode === 'singleplayer' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pause (Esc)</span>
                  </>
                ) : (
                  <>
                    <Home className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Menu (Esc)</span>
                  </>
                )}
              </button>
            )}

            {onToggleSpectator && (
              <button
                onClick={onToggleSpectator}
                title={
                  isSpectatorMode
                    ? 'Keluar Mode Spektator (F3)'
                    : 'Mode Spektator / Kamera Bebas (F3)'
                }
                className={`pointer-events-auto p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow active:scale-95 ${
                  isSpectatorMode
                    ? 'bg-sky-950/90 border-sky-400 text-sky-300 ring-2 ring-sky-400/50'
                    : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4 text-sky-400" />
              </button>
            )}

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                className={`pointer-events-auto p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow active:scale-95 ${
                  isFullscreen
                    ? 'bg-emerald-600/80 border-emerald-400 text-white'
                    : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:text-white'
                }`}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* 3D MiniMap Radar */}
          <MiniMap
            playerPos={playerPos}
            currentRegion={currentRegion}
            markers={mapMarkers}
            onOpenFullMap={onOpenMap}
            compactMobile={false}
          />
        </div>
      )}

      {/* Independent Quest Tracker */}
      {!isSpectatorMode && (
        <QuestTracker activeQuest={activeQuest} onOpenQuests={onOpenQuests} />
      )}

      {/* Temporary Mobile Location Transition Toast (3.2s slide/fade near top-center below utility strip ONLY on region change) */}
      {isMobileUi && locationToast && !isSpectatorMode && !bossState.active && !bossVictoryName && (
        <div
          style={{
            top: 'calc(40px + env(safe-area-inset-top, 0px))',
            left: '50%',
          }}
          className={`pointer-events-none fixed z-25 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-stone-950/90 border border-amber-500/75 rounded-full shadow-[0_6px_22px_rgba(0,0,0,0.65)] backdrop-blur-md transition-all duration-300 ease-out max-w-[min(240px,calc(100vw-290px))] ${
            locationToast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <span className="text-xs shrink-0">{locationToast.icon}</span>
          <span className="text-[10.5px] font-bold text-amber-200 tracking-wide truncate">{locationToast.nameId}</span>
          <span className="text-[9px] px-1 bg-amber-950/90 text-amber-300 border border-amber-700/60 rounded font-mono font-bold shrink-0">
            Lv.{locationToast.recommendedLevel}
          </span>
        </div>
      )}

      {/* Absolute Victory Banner (Boss Defeated) */}
      {!isSpectatorMode && bossVictoryName && (
        <div
          style={{ top: isMobileUi ? 'calc(40px + env(safe-area-inset-top, 0px))' : undefined }}
          className={`fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 pointer-events-none animate-bounce ${
            isMobileUi ? '' : 'top-10'
          }`}
        >
          <div className={`rounded-2xl bg-gradient-to-r from-amber-600/95 via-yellow-400 to-amber-600/95 border-2 border-yellow-200 shadow-[0_0_50px_rgba(234,179,8,0.7)] text-stone-950 font-black tracking-widest uppercase flex items-center gap-1.5 drop-shadow-2xl ${
            isMobileUi ? 'px-3.5 py-1 text-xs' : 'px-6 py-2.5 text-sm sm:text-base'
          }`}>
            🏆 KEMENANGAN MUTLAK!
          </div>
          <span className={`${isMobileUi ? 'text-[10px]' : 'text-xs sm:text-sm'} font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wider text-center`}>
            {bossVictoryName} Berhasil Ditaklukkan
          </span>
        </div>
      )}

      {/* Center Top: Boss Health Bar */}
      {!isSpectatorMode && bossState.active && (
        <div
          style={
            isMobileUi
              ? { top: 'calc(40px + env(safe-area-inset-top, 0px))' }
              : undefined
          }
          className={`fixed left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-25 pointer-events-none ${
            isMobileUi ? 'w-[min(235px,calc(100vw-296px))] min-w-[168px]' : 'top-5 w-80 md:w-[26rem] gap-1 z-20'
          }`}
        >
          <div className={`font-black tracking-wider text-red-400 uppercase drop-shadow flex items-center gap-1 truncate max-w-full ${
            isMobileUi ? 'text-[10.5px]' : 'text-sm tracking-widest gap-1.5'
          }`}>
            💀 {bossState.name || 'SANG TITAN KUNO OBSIDIAN'}
          </div>
          {!isMobileUi && bossState.title && (
            <div className="text-[11px] font-semibold tracking-wider text-amber-300/90 uppercase drop-shadow -mt-0.5">
              {bossState.title}
            </div>
          )}
          <div
            className={`w-full bg-stone-950/90 rounded-full border-2 p-0.5 shadow-2xl overflow-hidden transition-colors ${
              isMobileUi ? 'h-3' : 'h-5'
            } ${bossState.combatActive ? 'border-red-500 shadow-red-900/50' : 'border-amber-500/70'}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                bossState.combatActive
                  ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400'
                  : 'bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-400'
              }`}
              style={{
                width: `${bossState.hp !== undefined && bossState.maxHp ? Math.max(0, Math.min(100, (bossState.hp / bossState.maxHp) * 100)) : 100}%`,
              }}
            />
          </div>
          <span className={`${isMobileUi ? 'text-[8.5px]' : 'text-[10px]'} text-stone-200 font-mono`}>
            {Math.ceil(bossState.hp ?? 0)} / {bossState.maxHp} HP
          </span>
        </div>
      )}

      {/* Center Interactive Prompt (NPC / Chest) */}
      {!isSpectatorMode && nearbyPrompt && (
        <div
          id="hud-interaction-prompt-container"
          style={{ touchAction: 'none', top: '38%', left: '50%', transform: 'translate(-50%, -50%)' }}
          className="pointer-events-none fixed flex items-center justify-center z-50 select-none max-w-[90vw]"
        >
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPromptClick?.();
            }}
            onClick={onPromptClick}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className="pointer-events-auto flex items-center gap-1.5 bg-gradient-to-r from-amber-600/95 to-yellow-600/95 text-stone-950 font-bold px-3 py-1 rounded-full shadow-xl border border-amber-300 text-[10px] sm:text-[11px] cursor-pointer animate-pulse hover:scale-105 active:scale-95 transition-all truncate"
          >
            <Sparkles className="w-3 h-3 text-stone-950 flex-shrink-0" />
            <span className="tracking-wide truncate">{nearbyPrompt}</span>
          </button>
        </div>
      )}

      {/* Casting Progress Bar */}
      {!isSpectatorMode && castingState && castingState.isCasting && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none animate-in fade-in duration-150 ${
            isMobileUi ? 'bottom-5' : 'bottom-23'
          }`}
        >
          <div className="relative w-52 sm:w-64 h-6 sm:h-7 bg-stone-950/90 rounded-full border border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.5)] overflow-hidden flex items-center px-2.5">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-400 transition-all duration-75 ease-out rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, castingState.progress * 100))}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className="relative z-10 w-full flex items-center justify-between text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <span className="text-amber-300 text-sm animate-pulse">☄️</span>
              <span className="font-mono tracking-wider truncate px-1">{castingState.text}</span>
              <span className="text-[10px] text-amber-200/90 font-mono">
                {Math.round(castingState.progress * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Skill Bar: strictly hidden when modal is open or touch controls hidden on mobile */}
      {!isSpectatorMode && !isModalOpen && (!isMobileUi || isTouchControlsVisible) && (
        <SkillBar
          stats={stats}
          hunterWeaponMode={hunterWeaponMode}
          isWeaponDrawn={isWeaponDrawn}
          stealthActive={stealthActive}
          isVisible={!isSpectatorMode && !isModalOpen && (!isMobileUi || isTouchControlsVisible)}
          isMobileUi={isMobileUi}
          onPerformAttack={onPerformAttack}
          onAttackStart={onAttackStart}
          onAttackEnd={onAttackEnd}
          onCastSkill={onCastSkill}
          onAimSkillStart={onAimSkillStart}
          onAimSkillMove={onAimSkillMove}
          onAimSkillEnd={onAimSkillEnd}
          onMobileAimStart={onMobileAimStart}
          onMobileAimMove={onMobileAimMove}
          onMobileAimEnd={onMobileAimEnd}
          onJump={onJump}
          onDash={onDash}
          onSwitchHunterWeapon={onSwitchHunterWeapon}
          onToggleWeaponDrawn={onToggleWeaponDrawn}
          getSkillCooldowns={getSkillCooldowns}
          subscribeSkillCooldowns={subscribeSkillCooldowns}
          getStealthState={getStealthState}
        />
      )}

      {/* Glacial Barrage Hold-to-Aim Arcane Frost Reticle */}
      {!isModalOpen && isGlacialAiming && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40 select-none animate-fadeIn">
          {/* Locked Enemy Info Badge (floating smoothly above the reticle) */}
          {glacialTarget && (
            <div className="absolute top-[calc(50%-60px)] flex flex-col items-center pointer-events-none transition-all duration-200">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.4)] backdrop-blur-sm">
                {glacialTarget.isBoss && <span className="text-[10px] text-amber-400">👑</span>}
                <span className="text-[10px] font-bold tracking-wide text-amber-300 font-mono">
                  {glacialTarget.name}
                </span>
                <span className="text-[9px] text-amber-200/80 font-mono">
                  {Math.round(glacialTarget.hp)}/{glacialTarget.maxHp}
                </span>
              </div>
              <div className="w-24 h-1 bg-black/60 rounded-full mt-1 overflow-hidden border border-amber-400/40">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-150 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, (glacialTarget.hp / glacialTarget.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Dynamic Arcane Frost Reticle */}
          <div
            className={`relative flex items-center justify-center transition-all duration-200 ${
              glacialTarget ? 'scale-85' : 'scale-100'
            }`}
          >
            {/* Center Core Dot */}
            <div
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                glacialTarget
                  ? 'bg-amber-300 shadow-[0_0_10px_#fbbf24]'
                  : 'bg-sky-200 shadow-[0_0_10px_#38bdf8]'
              }`}
            />

            {/* Rotating Runic Ice Crystal Ring */}
            <div
              className={`absolute w-16 h-16 rounded-full border border-dashed transition-colors duration-200 animate-spin-slow ${
                glacialTarget
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
              }`}
              style={{ animationDuration: '12s' }}
            />

            {/* Inner Runic Ring */}
            <div
              className={`absolute w-11 h-11 rounded-full border border-dotted transition-colors duration-200 ${
                glacialTarget ? 'border-amber-300/80' : 'border-cyan-300/60'
              }`}
            />

            {/* 4 Diamond Ticks (Top, Bottom, Left, Right) */}
            <div
              className={`absolute -top-8 w-2 h-2 rotate-45 border transition-all duration-200 ${
                glacialTarget
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-sky-400/90 border-cyan-200 shadow-[0_0_6px_#38bdf8]'
              }`}
            />
            <div
              className={`absolute -bottom-8 w-2 h-2 rotate-45 border transition-all duration-200 ${
                glacialTarget
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-sky-400/90 border-cyan-200 shadow-[0_0_6px_#38bdf8]'
              }`}
            />
            <div
              className={`absolute -left-8 w-2 h-2 rotate-45 border transition-all duration-200 ${
                glacialTarget
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-sky-400/90 border-cyan-200 shadow-[0_0_6px_#38bdf8]'
              }`}
            />
            <div
              className={`absolute -right-8 w-2 h-2 rotate-45 border transition-all duration-200 ${
                glacialTarget
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-sky-400/90 border-cyan-200 shadow-[0_0_6px_#38bdf8]'
              }`}
            />
          </div>
        </div>
      )}

      {/* Guide Pill Banner (Desktop only — avoids crowding mobile landscape touch UI) */}
      {!isModalOpen && !isMobileUi && isGlacialAiming && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none animate-fadeIn flex items-center justify-center whitespace-nowrap"
          style={{ bottom: '108px' }}
        >
          <div
            className="px-3.5 py-1.5 rounded-full border border-sky-400/70 text-sky-200 font-mono tracking-wider backdrop-blur-md flex items-center gap-2"
            style={{
              fontSize: '11px',
              backgroundColor: 'rgba(10, 15, 28, 0.75)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(56, 189, 248, 0.3)',
            }}
          >
            <span className="text-sky-300">💠</span>
            <span>BIDIK ES • LEPAS [Q] / KLIK KIRI TEMBAK • KLIK KANAN BATAL</span>
          </div>
        </div>
      )}

      {/* Hunter Bow Hold-to-Aim Minecraft Crosshair (+) & Charge Bar */}
      {!isModalOpen && isBowAiming && (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-40 select-none animate-fadeIn">
          {/* Sharp Minecraft-style Plus (+) Crosshair: 20px x 20px */}
          <div
            className={`relative flex items-center justify-center transition-transform duration-100 ${
              (bowChargeRatio ?? 0) >= 0.85 ? 'scale-115' : 'scale-100'
            }`}
            style={{ width: '20px', height: '20px' }}
          >
            {/* Horizontal Line: 20px x 2px with subtle black drop-shadow */}
            <div
              className="absolute bg-white shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
              style={{ width: '20px', height: '2px' }}
            />
            {/* Vertical Line: 2px x 20px with subtle black drop-shadow */}
            <div
              className="absolute bg-white shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
              style={{ width: '2px', height: '20px' }}
            />
          </div>

          {/* Thin Bow Charge Bar directly below crosshair (margin-top: 8px, width: 44px, height: 4px) */}
          <div
            className="bg-black/75 rounded-full overflow-hidden border border-black/90 shadow-[0_2px_5px_rgba(0,0,0,0.85)]"
            style={{ marginTop: '8px', width: '44px', height: '4px' }}
          >
            <div
              className="h-full transition-all duration-75 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, (bowChargeRatio ?? 0) * 100))}%`,
                backgroundColor: (bowChargeRatio ?? 0) >= 0.85 ? '#fef08a' : '#10b981',
                boxShadow:
                  (bowChargeRatio ?? 0) >= 0.85
                    ? '0 0 10px #fef08a, 0 0 4px #ffffff'
                    : '0 0 6px #10b981',
              }}
            />
          </div>
        </div>
      )}

      {/* Hunter Bow Guide Pill Banner (Desktop only) */}
      {!isModalOpen && !isMobileUi && isBowAiming && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none animate-fadeIn flex items-center justify-center whitespace-nowrap"
          style={{ bottom: '108px' }}
        >
          <div
            className="px-3.5 py-1.5 rounded-full border border-emerald-400/70 text-emerald-200 font-mono tracking-wider backdrop-blur-md flex items-center gap-2"
            style={{
              fontSize: '11px',
              backgroundColor: 'rgba(10, 15, 28, 0.75)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <span className="text-emerald-400">🏹</span>
            <span>TAHAN [KLIK KIRI / J] TARIK BUSUR • LEPAS TEMBAK • KLIK KANAN BATAL</span>
          </div>
        </div>
      )}

      {/* Hunter Ultimate Badai Panah Agung Guide Pill Banner (Desktop only) */}
      {!isModalOpen && !isMobileUi && isArrowVolleyAiming && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none animate-fadeIn flex items-center justify-center whitespace-nowrap"
          style={{ bottom: '108px' }}
        >
          <div
            className="px-3.5 py-1.5 rounded-full border border-cyan-400/80 text-cyan-100 font-mono tracking-wider backdrop-blur-md flex items-center gap-2"
            style={{
              fontSize: '11px',
              backgroundColor: 'rgba(10, 15, 28, 0.78)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 14px rgba(34, 211, 238, 0.45)',
            }}
          >
            <span className="text-amber-300">⛈️</span>
            <span>BIDIK BADAI PANAH AGUNG • LEPAS [F] / KLIK KIRI TEMBAK • KLIK KANAN / ESC BATAL</span>
          </div>
        </div>
      )}

      {/* Desktop Bottom Right: Full Menu Navigation Buttons */}
      {!isSpectatorMode && !isMobileUi && (
        <div className="hud-desktop-hotbar pointer-events-auto absolute bottom-5 right-4 flex items-center gap-2">
          <button
            onClick={onOpenInventory}
            className="flex flex-col items-center justify-center w-11 h-11 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 shadow cursor-pointer transition-all active:scale-95"
            title="Tas & Perlengkapan (I)"
          >
            <Backpack className="w-5 h-5 text-amber-400" />
            <span className="text-[8px] font-bold text-stone-400 mt-0.5">Tas</span>
          </button>

          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="flex flex-col items-center justify-center w-11 h-11 bg-gradient-to-b from-amber-950/80 to-stone-900/90 hover:from-amber-900/90 hover:to-stone-800 text-amber-300 rounded-xl border border-amber-500/60 shadow cursor-pointer transition-all active:scale-95"
              title="Toko & Pandai Besi (B)"
            >
              <ShoppingBag className="w-5 h-5 text-yellow-400" />
              <span className="text-[8px] font-bold text-amber-300 mt-0.5">Toko</span>
            </button>
          )}

          <button
            onClick={onOpenStats}
            className="relative flex flex-col items-center justify-center w-11 h-11 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 shadow cursor-pointer transition-all active:scale-95"
            title="Status Karakter (C)"
          >
            <User className="w-5 h-5 text-blue-400" />
            <span className="text-[8px] font-bold text-stone-400 mt-0.5">Status</span>
            {stats.statPoints > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-stone-900" />
            )}
          </button>

          <button
            onClick={onOpenQuests}
            className="flex flex-col items-center justify-center w-11 h-11 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 shadow cursor-pointer transition-all active:scale-95"
            title="Buku Misi (L)"
          >
            <Scroll className="w-5 h-5 text-emerald-400" />
            <span className="text-[8px] font-bold text-stone-400 mt-0.5">Misi</span>
          </button>

          <button
            onClick={onOpenMap}
            className="flex flex-col items-center justify-center w-11 h-11 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 shadow cursor-pointer transition-all active:scale-95"
            title="Peta Dunia (M)"
          >
            <Map className="w-5 h-5 text-cyan-400" />
            <span className="text-[8px] font-bold text-stone-400 mt-0.5">Peta</span>
          </button>
        </div>
      )}

      {/* Bottom Left: EXP Bar across viewport */}
      {!isSpectatorMode && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-950 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300"
            style={{ width: `${expPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
