import React, { useState, useEffect } from 'react';
import {
  Play,
  LogOut,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  ShieldAlert,
  Gamepad2,
  Users,
  Compass,
  X,
  Monitor,
  Music,
  Sliders,
  Zap,
  Check,
  Disc,
  Crosshair,
  Keyboard,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import {
  GraphicsSettings,
  GRAPHICS_PRESETS,
  saveGraphicsSettings,
} from '../game/graphicsSettings';
import {
  TouchControlMode,
  getSavedControlMode,
  setSavedControlMode,
} from './VirtualJoystick';
import {
  getMouseSensitivityMultiplier,
  setMouseSensitivityMultiplier,
} from '../game/CameraControls';

interface PauseModalProps {
  isOpen: boolean;
  gameMode: 'singleplayer' | 'multiplayer';
  multiplayerRoom?: string;
  playerName?: string;
  connectedPlayersCount?: number;
  showTouchControls?: boolean;
  onToggleTouchControls?: () => void;
  graphicsSettings?: GraphicsSettings;
  onApplyGraphicsSettings?: (settings: GraphicsSettings) => void;
  onResume: () => void;
  onReturnToMainMenu: () => void;
  onDisconnectAndReturnToMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  gameMode,
  multiplayerRoom = 'Eldoria-Global',
  connectedPlayersCount = 1,
  showTouchControls = false,
  onToggleTouchControls,
  graphicsSettings: initialGraphicsSettings,
  onApplyGraphicsSettings,
  onResume,
  onReturnToMainMenu,
  onDisconnectAndReturnToMainMenu,
}) => {
  const [activeTab, setActiveTab] = useState<'grafik' | 'suara' | 'kontrol'>('grafik');
  const [pauseView, setPauseView] = useState<'menu' | 'settings'>('menu');

  // Reset to concise menu view every time pause modal opens
  useEffect(() => {
    if (isOpen) {
      setPauseView('menu');
    }
  }, [isOpen]);

  // Audio State
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());
  const [bgmVolume, setBgmVolumeState] = useState<number>(() => soundManager.getBgmVolume());
  const [sfxVolume, setSfxVolumeState] = useState<number>(() => soundManager.getSfxVolume());

  // Controls State
  const [controlMode, setControlModeState] = useState<TouchControlMode>(() => getSavedControlMode());
  const [mouseSensitivity, setMouseSensitivityState] = useState<number>(() => getMouseSensitivityMultiplier());

  // Graphics State
  const [settings, setSettings] = useState<GraphicsSettings>(() => {
    return (
      initialGraphicsSettings || {
        preset: 'medium',
        renderScale: 1.0,
        enableGrass: true,
        enableShadows: true,
        shadowQuality: 'medium',
        enableParticles: true,
        enablePostProcessing: true,
        enableBloom: false,
        enableVignette: false,
        maxLights: 4,
        targetFps: 60,
        enableFog: true,
      }
    );
  });

  if (!isOpen) return null;

  const isSingle = gameMode === 'singleplayer';

  // Audio Handlers
  const toggleMute = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  const handleBgmChange = (val: number) => {
    setBgmVolumeState(val);
    soundManager.setBgmVolume(val);
  };

  const handleSfxChange = (val: number) => {
    setSfxVolumeState(val);
    soundManager.setSfxVolume(val);
  };

  // Controls Handlers
  const handleControlModeSwitch = (mode: TouchControlMode) => {
    setControlModeState(mode);
    setSavedControlMode(mode);
  };

  const handleSensitivityChange = (val: number) => {
    setMouseSensitivityState(val);
    setMouseSensitivityMultiplier(val);
  };

  // Graphics Handlers
  const handleSelectPreset = (preset: 'low' | 'medium' | 'high') => {
    const next = { ...GRAPHICS_PRESETS[preset] };
    setSettings(next);
    saveGraphicsSettings(next);
    onApplyGraphicsSettings?.(next);
  };

  const handleUpdateGraphics = (partial: Partial<GraphicsSettings>) => {
    const next: GraphicsSettings = { ...settings, ...partial, preset: 'custom' };
    setSettings(next);
    saveGraphicsSettings(next);
    onApplyGraphicsSettings?.(next);
  };

  if (pauseView === 'menu') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pause Menu Permainan"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans"
      >
        <div className="game-modal-card relative w-[94vw] max-w-sm flex flex-col rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-stone-900 via-stone-950 to-black p-5 sm:p-6 shadow-2xl shadow-black/95 text-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${
                isSingle
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
              }`}
            >
              {isSingle ? (
                <>
                  <Gamepad2 className="w-3 h-3" />
                  <span>Solo</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 animate-pulse" />
                  <span>Online</span>
                </>
              )}
            </div>
            <button
              onClick={onResume}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              title="Lanjutkan Permainan (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title */}
          <div className="text-center my-5">
            <h2 className="text-2xl font-black text-amber-300 tracking-wider font-serif uppercase drop-shadow">
              PERMAINAN DIJEDA
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              {isSingle
                ? 'Aksi permainan sedang dihentikan sementara'
                : 'Multiplayer aktif berjalan secara real-time'}
            </p>
          </div>

          {/* 3 Main Action Buttons */}
          <div className="flex flex-col gap-3 my-2">
            {/* Tombol 1: LANJUTKAN (RESUME) */}
            <button
              onClick={onResume}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 px-4 py-3.5 font-black text-stone-950 text-sm tracking-wide shadow-lg shadow-amber-900/40 transition active:scale-95 cursor-pointer border border-amber-300"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>LANJUTKAN (RESUME)</span>
              <span className="ml-auto rounded bg-black/30 px-2 py-0.5 font-mono text-[10px] text-stone-900 font-bold border border-black/20">
                ESC
              </span>
            </button>

            {/* Tombol 2: PENGATURAN (SETTINGS) */}
            <button
              onClick={() => setPauseView('settings')}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-700 bg-stone-900/90 hover:bg-stone-800 hover:border-amber-500/50 px-4 py-3 font-bold text-amber-100 text-sm tracking-wide transition active:scale-95 cursor-pointer shadow-md"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>PENGATURAN (SETTINGS)</span>
            </button>

            {/* Tombol 3: KELUAR KE MENU UTAMA (EXIT) */}
            <button
              onClick={isSingle ? onReturnToMainMenu : onDisconnectAndReturnToMainMenu}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-900/50 bg-stone-950/80 hover:bg-red-950/60 hover:border-red-500/60 px-4 py-2.5 font-bold text-red-300 text-xs tracking-wide transition active:scale-95 cursor-pointer mt-1"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>KELUAR KE MENU UTAMA (EXIT)</span>
            </button>
          </div>

          {!isSingle && (
            <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-200">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-300/90 leading-relaxed">
                  Permainan multiplayer berjalan real-time. Monster dan pemain lain tetap aktif saat menu terbuka.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pause Menu & Pengaturan"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 font-sans"
    >
      <div
        style={{
          maxHeight: '85vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        className="game-modal-card relative w-[94vw] max-w-lg max-h-[85vh] flex flex-col overflow-y-auto modal-scroll-area rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-stone-900 via-stone-950 to-black shadow-2xl shadow-black/95 text-stone-200"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-800 bg-stone-950/95">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setPauseView('menu')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 hover:border-amber-500/50 text-xs font-bold transition cursor-pointer active:scale-95 shadow"
              title="Kembali ke Menu Pause"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
            <h2 className="text-base sm:text-lg font-black text-amber-100 tracking-wide font-serif">
              Pengaturan Sistem
            </h2>
          </div>

          <button
            onClick={onResume}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-red-950/80 text-stone-300 hover:text-red-300 border border-stone-700 hover:border-red-500/50 text-xs font-bold transition cursor-pointer active:scale-95 shadow-md"
            title="Lanjutkan Permainan (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Tutup (Esc)</span>
          </button>
        </div>

        {/* 3 Sub-Tabs Navigation Bar */}
        <div className="sticky top-[53px] z-15 shrink-0 flex items-center border-b border-stone-800 bg-stone-900/90 backdrop-blur-md px-3 sm:px-6 py-1.5 gap-2">
          <button
            onClick={() => setActiveTab('grafik')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'grafik'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/60 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Grafik</span>
          </button>

          <button
            onClick={() => setActiveTab('suara')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'suara'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Suara</span>
          </button>

          <button
            onClick={() => setActiveTab('kontrol')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'kontrol'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Kontrol</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto modal-scroll-area p-4 sm:p-6 space-y-4">
          {/* TAB 1: GRAFIK */}
          {activeTab === 'grafik' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Presets Cepat */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Preset Cepat Kualitas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSelectPreset('low')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      settings.preset === 'low'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 shadow'
                        : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center justify-between">
                      🥔 Rendah
                      {settings.preset === 'low' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">Kentang / HP</p>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('medium')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      settings.preset === 'medium'
                        ? 'border-amber-500 bg-amber-950/40 text-amber-200 shadow'
                        : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center justify-between">
                      ⚡ Standar
                      {settings.preset === 'medium' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">60 FPS Stabil</p>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('high')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      settings.preset === 'high'
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow'
                        : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center justify-between">
                      🌟 Ultra
                      {settings.preset === 'high' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">Grafis Penuh</p>
                  </button>
                </div>
              </div>

              {/* Kualitas Bayangan */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-200">Kualitas Bayangan (Shadows)</span>
                  <span className="text-xs font-bold text-cyan-300 uppercase">
                    {!settings.enableShadows ? 'Mati' : settings.shadowQuality}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    onClick={() => handleUpdateGraphics({ enableShadows: false })}
                    className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer ${
                      !settings.enableShadows
                        ? 'bg-red-600/30 text-red-300 border border-red-500/60'
                        : 'bg-stone-800/60 text-stone-400 hover:text-white'
                    }`}
                  >
                    Mati (Off)
                  </button>
                  <button
                    onClick={() => handleUpdateGraphics({ enableShadows: true, shadowQuality: 'low' })}
                    className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer ${
                      settings.enableShadows && settings.shadowQuality === 'low'
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60'
                        : 'bg-stone-800/60 text-stone-400 hover:text-white'
                    }`}
                  >
                    Rendah
                  </button>
                  <button
                    onClick={() => handleUpdateGraphics({ enableShadows: true, shadowQuality: 'high' })}
                    className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer ${
                      settings.enableShadows && settings.shadowQuality === 'high'
                        ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/60'
                        : 'bg-stone-800/60 text-stone-400 hover:text-white'
                    }`}
                  >
                    Tinggi
                  </button>
                </div>
              </div>

              {/* Resolusi Render */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-200">Resolusi Render</span>
                  <span className="text-xs font-mono font-bold text-amber-300">{settings.renderScale}x</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[0.75, 1.0, 1.25].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => handleUpdateGraphics({ renderScale: scale })}
                      className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer ${
                        settings.renderScale === scale
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60'
                          : 'bg-stone-800/60 text-stone-400 hover:text-white'
                      }`}
                    >
                      {scale}x {scale === 0.75 ? '(Ringan)' : scale === 1.0 ? '(Native)' : '(Tajam)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles Rumput, Partikel, & Kabut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Rumput */}
                <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                  <span className="text-stone-300">Rumput & Vegetasi</span>
                  <button
                    onClick={() => handleUpdateGraphics({ enableGrass: !settings.enableGrass })}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      settings.enableGrass
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {settings.enableGrass ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Partikel */}
                <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                  <span className="text-stone-300">Efek Partikel</span>
                  <button
                    onClick={() => handleUpdateGraphics({ enableParticles: !settings.enableParticles })}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      settings.enableParticles
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {settings.enableParticles ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Efek Kabut */}
                <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3 sm:col-span-2">
                  <span className="text-stone-300">Efek Kabut Atmosfer (Atmospheric Fog)</span>
                  <button
                    onClick={() => handleUpdateGraphics({ enableFog: !settings.enableFog })}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      settings.enableFog
                        ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/60'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {settings.enableFog ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUARA */}
          {activeTab === 'suara' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Tombol Mute Master */}
              <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 text-xs">
                <span className="text-stone-300 flex items-center gap-2 font-semibold">
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  Master Audio
                </span>
                <button
                  onClick={toggleMute}
                  className={`rounded-lg px-3 py-1.5 font-bold transition text-xs cursor-pointer ${
                    isMuted
                      ? 'bg-red-600/30 text-red-300 border border-red-500/60'
                      : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60'
                  }`}
                >
                  {isMuted ? 'Muted (Bisu)' : 'Suara Aktif (ON)'}
                </button>
              </div>

              {/* Slider Volume BGM */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 flex items-center gap-2 font-semibold">
                    <Music className="w-4 h-4 text-amber-400" />
                    Volume Musik Latar (BGM)
                  </span>
                  <span className="font-mono text-amber-300 font-bold">{Math.round(bgmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => handleBgmChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Slider Volume SFX */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 flex items-center gap-2 font-semibold">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Volume Efek Suara (SFX)
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: KONTROL */}
          {activeTab === 'kontrol' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Sensitivitas Mouse */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 flex items-center gap-2 font-semibold">
                    <Crosshair className="w-4 h-4 text-emerald-400" />
                    Sensitivitas Mouse / Kamera
                  </span>
                  <span className="font-mono text-emerald-300 font-bold">{mouseSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={mouseSensitivity}
                  onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Virtual Joystick untuk Mobile */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 flex items-center gap-2 font-semibold">
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    Kontroler Layar Sentuh (Mobile HP)
                  </span>
                  {onToggleTouchControls && (
                    <button
                      onClick={onToggleTouchControls}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                        showTouchControls
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60'
                          : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      {showTouchControls ? 'Tampil (ON)' : 'Sembunyi (OFF)'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-stone-800/80">
                  <span className="text-[11px] text-stone-400">Tipe Kontroler:</span>
                  <div className="flex items-center gap-1.5 ml-auto text-xs">
                    <button
                      onClick={() => handleControlModeSwitch('joystick')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        controlMode === 'joystick'
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                          : 'bg-stone-800/60 text-stone-400 hover:text-white'
                      }`}
                    >
                      <Disc className="w-3 h-3" />
                      <span>Analog</span>
                    </button>
                    <button
                      onClick={() => handleControlModeSwitch('dpad')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        controlMode === 'dpad'
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                          : 'bg-stone-800/60 text-stone-400 hover:text-white'
                      }`}
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>D-Pad</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Keybindings Ringkasan */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-stone-300 flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-cyan-400" />
                  Keybindings (Tombol Keyboard PC)
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400 pt-1">
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Gerak</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">W A S D</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Lompat</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">Spasi</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Sprint (Lari)</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">Shift</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Serang</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">Klik Kiri</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Skill 1 / 2 / 3</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">1, 2, 3</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Peta Dunia</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">M</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Pause Menu</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Kamera Bebas</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">F3</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multiplayer Real-time Alert */}
          {!isSingle && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300/90 leading-relaxed">
                  Permainan multiplayer berjalan real-time. Monster dan pemain lain tetap aktif saat menu terbuka.
                </p>
              </div>
            </div>
          )}

          {/* Bottom Action Buttons in Settings View */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => setPauseView('menu')}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-900 hover:bg-stone-800 px-4 py-2.5 font-bold text-amber-300 text-xs transition active:scale-98 cursor-pointer shadow"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Menu Pause</span>
            </button>

            <button
              onClick={onResume}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 px-4 py-2.5 font-bold text-white text-xs shadow-lg shadow-amber-900/30 transition active:scale-98 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Lanjutkan Permainan (Esc)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
