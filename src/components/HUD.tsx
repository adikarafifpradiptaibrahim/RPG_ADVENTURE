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
  Smartphone,
} from 'lucide-react';
import { MiniMap } from './MiniMap';
import { SkillBar } from './SkillBar';
import { QuestTracker } from './QuestTracker';

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
  onCastSkill: (slot: 1 | 2 | 3) => void;
  onJump: () => void;
  onRotateCamera?: (deltaX: number, deltaY: number) => void;
  onZoomCamera?: (deltaZoom: number) => void;
  bossState: {
    active: boolean;
    name?: string;
    hp?: number;
    maxHp?: number;
  };
  isMuted: boolean;
  onToggleMute: () => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  playerPos: { x: number; z: number; rotationY: number };
  currentRegion: RegionInfo;
  mapMarkers: MapMarker[];
  hunterWeaponMode?: 'dagger' | 'bow';
  onSwitchHunterWeapon?: () => void;
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
  onCastSkill,
  onJump,
  onRotateCamera,
  onZoomCamera,
  bossState,
  isMuted,
  onToggleMute,
  isMusicPlaying,
  onToggleMusic,
  playerPos,
  currentRegion,
  mapMarkers,
  hunterWeaponMode = 'dagger',
  onSwitchHunterWeapon,
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
}) => {
  const [dismissMobileTip, setDismissMobileTip] = useState(false);

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
    <div id="ui-root" className="hud-container pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* 3D Floating Numbers / Combat Text (Clean & Compact) */}
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

      {/* Top Left: Player Status Orb & Bars */}
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
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                <Heart className="w-2.5 h-2.5 inline mr-1 text-red-300" />
                {Math.round(stats.hp)} / {stats.maxHp} HP
              </span>
            </div>

            {/* MP Bar */}
            <div className="relative w-full h-3.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
                style={{ width: `${mpPercent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                <Sparkles className="w-2 h-2 inline mr-1 text-cyan-300" />
                {Math.round(stats.mp)} / {stats.maxMp} MP
              </span>
            </div>

            {/* Stamina Bar */}
            <div className="relative w-full h-2.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-150"
                style={{ width: `${staminaPercent}%` }}
              />
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

      {/* Top Right: MiniMap / Compass / Quest Tracker / Audio Controls */}
      <div className="hud-minimap-cluster pointer-events-none absolute top-4 right-4 flex flex-col items-end gap-2.5 max-w-xs z-30">
        {/* Audio & Settings Buttons - container pointer-events-none, buttons pointer-events-auto */}
        <div className="pointer-events-none flex items-center gap-1.5 flex-wrap justify-end">
          {/* Game Mode Badge */}
          {gameMode === 'singleplayer' ? (
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
          )}

          {/* Pause / Menu Button (Esc) */}
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              title={gameMode === 'singleplayer' ? 'Pause Permainan (Esc)' : 'Menu Multiplayer (Esc)'}
              className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow active:scale-95"
            >
              {gameMode === 'singleplayer' ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Pause (Esc)</span>
                </>
              ) : (
                <>
                  <Home className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Menu (Esc)</span>
                </>
              )}
            </button>
          )}

          {onToggleTouchControls && (
            <button
              onClick={onToggleTouchControls}
              title={
                showTouchControls
                  ? 'Sembunyikan Kontroler Layar (Analog/D-Pad)'
                  : 'Tampilkan Kontroler Layar (Analog/D-Pad untuk HP/Sentuh)'
              }
              className={`pointer-events-auto px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow active:scale-95 ${
                showTouchControls
                  ? 'bg-amber-600/80 border-amber-400 text-white shadow-amber-900/30'
                  : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">
                {showTouchControls ? 'Kontrol: ON' : 'Kontrol: OFF'}
              </span>
            </button>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Fullscreen untuk HP)'}
              className={`pointer-events-auto p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow active:scale-95 ${
                isFullscreen
                  ? 'bg-emerald-600/80 border-emerald-400 text-white'
                  : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:text-white'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onOpenMap}
            title="Buka Peta Dunia (M)"
            className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow cursor-pointer transition-all"
          >
            <Map className="w-4 h-4" />
            <span>Peta (M)</span>
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Pengaturan Grafis & Performa (PC Rendah / Kentang)"
              className="pointer-events-auto p-2 rounded-xl backdrop-blur-md border border-cyan-500/40 bg-stone-900/80 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleMusic}
            title="Toggle Fantasy Music"
            className={`pointer-events-auto p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow ${
              isMusicPlaying
                ? 'bg-amber-600/80 border-amber-400 text-white'
                : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleMute}
            title="Toggle Sound Effects"
            className={`pointer-events-auto p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow ${
              !isMuted
                ? 'bg-blue-600/80 border-blue-400 text-white'
                : 'bg-stone-900/80 border-stone-700 text-stone-400 hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenHelp}
            title="Bantuan Kontrol (H)"
            className="pointer-events-auto p-2 rounded-xl bg-stone-900/80 backdrop-blur-md border border-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer shadow"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* 3D MiniMap Radar */}
        <MiniMap
          playerPos={playerPos}
          currentRegion={currentRegion}
          markers={mapMarkers}
          onOpenFullMap={onOpenMap}
        />
      </div>

      {/* Independent Quest Tracker: Positioned safely at right-middle (top: 35%; right: 12px) */}
      <QuestTracker activeQuest={activeQuest} onOpenQuests={onOpenQuests} />

      {/* Mobile Landscape Orientation Recommendation Banner */}
      {!dismissMobileTip && (
        <div className="md:hidden pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-stone-950/95 border border-amber-500/50 rounded-xl p-2.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2 z-40 animate-fade-in text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400 rotate-90 flex-shrink-0 animate-pulse" />
            <span className="text-[11px] leading-snug">
              Bermain di HP? Putar ke <b>Landscape</b> & klik tombol <b>Layar Penuh</b> di pojok kanan atas untuk grafik maksimal!
            </span>
          </div>
          <button
            onClick={() => setDismissMobileTip(true)}
            className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800/60 cursor-pointer flex-shrink-0"
            title="Tutup Saran"
          >
            ✕
          </button>
        </div>
      )}

      {/* Center Top: Boss Health Bar when engaged */}
      {bossState.active && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-80 md:w-96 flex flex-col items-center gap-1 z-20 pointer-events-none">
          <div className="text-sm font-black tracking-widest text-red-400 uppercase drop-shadow flex items-center gap-1.5">
            💀 {bossState.name || 'Ancient Titan Golem'}
          </div>
          <div className="w-full h-5 bg-stone-950/90 rounded-full border-2 border-red-600/80 p-0.5 shadow-2xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 rounded-full transition-all duration-200"
              style={{
                width: `${bossState.hp && bossState.maxHp ? (bossState.hp / bossState.maxHp) * 100 : 100}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-stone-300 font-mono">
            {bossState.hp} / {bossState.maxHp} HP
          </span>
        </div>
      )}

      {/* Center Interactive Prompt (NPC / Chest) - Compact & Raised */}
      {nearbyPrompt && (
        <div
          style={{ touchAction: 'none' }}
          className="pointer-events-none fixed bottom-36 sm:bottom-40 md:bottom-32 left-1/2 -translate-x-1/2 flex items-center justify-center z-50 select-none"
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
            className="pointer-events-auto flex items-center gap-1.5 bg-gradient-to-r from-amber-600/95 to-yellow-600/95 text-stone-950 font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-xl border border-amber-300 text-[11px] sm:text-xs cursor-pointer animate-pulse hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-stone-950 flex-shrink-0" />
            <span className="tracking-wide">{nearbyPrompt}</span>
          </button>
        </div>
      )}


      {/* Mobile Compact Menu Strip (Tas, Toko, Status, Misi, Peta) - Centered neatly above Skill Bar */}
      <div
        id="hud-mobile-nav-bar"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'auto',
          width: 'fit-content',
        }}
        className="hud-mobile-nav-bar pointer-events-auto fixed bottom-[56px] sm:bottom-[60px] left-1/2 -translate-x-1/2 md:hidden w-fit inline-flex items-center gap-1 bg-stone-950/85 backdrop-blur-md px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-xl border border-stone-800/70 shadow-xl z-35 select-none"
      >
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenInventory();
          }}
          onClick={onOpenInventory}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="touch-control-btn flex flex-col items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 bg-stone-900/90 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 active:scale-90 transition cursor-pointer"
          title="Tas (I)"
        >
          <Backpack className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
        </button>

        {onOpenShop && (
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenShop();
            }}
            onClick={onOpenShop}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className="touch-control-btn flex flex-col items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 bg-stone-900/90 hover:bg-stone-800 text-amber-300 rounded-xl border border-amber-500/60 active:scale-90 transition cursor-pointer"
            title="Toko (B)"
          >
            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
          </button>
        )}

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenStats();
          }}
          onClick={onOpenStats}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="touch-control-btn relative flex flex-col items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 bg-stone-900/90 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 active:scale-90 transition cursor-pointer"
          title="Status (C)"
        >
          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
          {stats.statPoints > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-stone-900 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenQuests();
          }}
          onClick={onOpenQuests}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="touch-control-btn flex flex-col items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 bg-stone-900/90 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 active:scale-90 transition cursor-pointer"
          title="Misi (L)"
        >
          <Scroll className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenMap();
          }}
          onClick={onOpenMap}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="touch-control-btn flex flex-col items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 bg-stone-900/90 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700 active:scale-90 transition cursor-pointer"
          title="Peta (M)"
        >
          <Map className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
        </button>
      </div>

      {/* Primary Skill Bar (Responsive: Mobile Arc at bottom-right vs Desktop Horizontal at bottom-center) */}
      <SkillBar
        stats={stats}
        hunterWeaponMode={hunterWeaponMode}
        onPerformAttack={onPerformAttack}
        onCastSkill={onCastSkill}
        onJump={onJump}
        onSwitchHunterWeapon={onSwitchHunterWeapon}
      />

      {/* Desktop Bottom Right: Full Menu Navigation Buttons */}
      <div className="hud-desktop-hotbar pointer-events-auto absolute bottom-5 right-4 hidden md:flex items-center gap-2">
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

      {/* Bottom Left: EXP Bar across viewport */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-950 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300"
          style={{ width: `${expPercent}%` }}
        />
      </div>
    </div>
  );
};
