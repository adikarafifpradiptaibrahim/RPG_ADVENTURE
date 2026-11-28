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
  Save,
  Wrench,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import {
  GraphicsSettings,
  SkyQuality,
  getGraphicsPresetForDevice,
  isMobileRenderDevice,
  loadGraphicsSettings,
  saveGraphicsSettings,
} from '../game/graphicsSettings';
import { updateDeviceSettings } from '../game/storage/guestSaveManager';
import {
  TouchControlMode,
  getSavedControlMode,
  setSavedControlMode,
} from './VirtualJoystick';
import {
  getMouseSensitivityMultiplier,
  setMouseSensitivityMultiplier,
} from '../game/CameraControls';
import { BrowserCacheSettingsSection } from './BrowserCacheSettingsSection';
import {
  DeveloperSettingsSection,
  DevTeleportPreset,
} from './DeveloperSettingsSection';
import { useMobileViewport } from '../game/utils/mobileViewport';

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
  onSaveGame?: () => void;
  onForceBossPhase2?: () => { ok: boolean; message: string };
  onResetBoss?: () => { ok: boolean; message: string };
  onTeleportPreset?: (preset: DevTeleportPreset) => { ok: boolean; label: string } | void;
  onToggleSpectator?: (next: boolean) => void;
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
  onSaveGame,
  onForceBossPhase2,
  onResetBoss,
  onTeleportPreset,
  onToggleSpectator,
}) => {
  const { isMobileLandscape } = useMobileViewport();
  const isMobileProfile = isMobileLandscape || isMobileRenderDevice();
  const [activeTab, setActiveTab] = useState<'grafik' | 'suara' | 'kontrol' | 'dev'>('grafik');
  const [pauseView, setPauseView] = useState<'menu' | 'settings'>('menu');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

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

  // Graphics State (isolated per PC vs Mobile profile)
  const [settings, setSettings] = useState<GraphicsSettings>(() => {
    return initialGraphicsSettings || loadGraphicsSettings(isMobileProfile);
  });

  useEffect(() => {
    if (isOpen) {
      setSettings(loadGraphicsSettings(isMobileProfile));
    }
  }, [isOpen, isMobileProfile]);

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
  const handleSelectPreset = (preset: 'low' | 'medium' | 'high' | 'ultra') => {
    const next = getGraphicsPresetForDevice(preset, isMobileProfile);
    setSettings(next);
    saveGraphicsSettings(next, isMobileProfile);
    updateDeviceSettings({ graphics: next });
    onApplyGraphicsSettings?.(next);
  };

  const handleUpdateGraphics = (partial: Partial<GraphicsSettings>) => {
    const next: GraphicsSettings = { ...settings, ...partial, preset: 'custom' };
    setSettings(next);
    saveGraphicsSettings(next, isMobileProfile);
    updateDeviceSettings({ graphics: next });
    onApplyGraphicsSettings?.(next);
  };

  if (pauseView === 'menu') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pause Menu Permainan"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 font-sans"
      >
        <div
          className={`game-modal-card relative w-[94vw] max-w-sm flex flex-col rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-stone-900 via-stone-950 to-black shadow-2xl shadow-black/95 text-stone-200 ${
            isMobileLandscape ? 'max-h-[92dvh] overflow-y-auto modal-scroll-area p-3.5' : 'p-5 sm:p-6'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b border-stone-800 ${isMobileLandscape ? 'pb-2' : 'pb-3.5'}`}>
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
          <div className={`text-center ${isMobileLandscape ? 'my-2' : 'my-5'}`}>
            <h2 className={`${isMobileLandscape ? 'text-lg' : 'text-2xl'} font-black text-amber-300 tracking-wider font-serif uppercase drop-shadow`}>
              PERMAINAN DIJEDA
            </h2>
            {!isMobileLandscape && (
              <p className="text-xs text-stone-400 mt-1">
                {isSingle
                  ? 'Aksi permainan sedang dihentikan sementara'
                  : 'Multiplayer aktif berjalan secara real-time'}
              </p>
            )}
          </div>

          {/* Main Action Buttons */}
          <div className={`flex flex-col ${isMobileLandscape ? 'gap-2 my-1' : 'gap-3 my-2'}`}>
            <button
              onClick={onResume}
              className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 px-4 font-black text-stone-950 text-sm tracking-wide shadow-lg shadow-amber-900/40 transition active:scale-95 cursor-pointer border border-amber-300 ${
                isMobileLandscape ? 'py-2.5' : 'py-3.5'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>LANJUTKAN (RESUME)</span>
              {!isMobileLandscape && (
                <span className="ml-auto rounded bg-black/30 px-2 py-0.5 font-mono text-[10px] text-stone-900 font-bold border border-black/20">
                  ESC
                </span>
              )}
            </button>

            {isSingle && (
              <button
                onClick={() => {
                  onSaveGame?.();
                  setSaveSuccessNotice(true);
                  setTimeout(() => setSaveSuccessNotice(false), 2200);
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 font-bold text-sm tracking-wide transition active:scale-95 cursor-pointer shadow-md ${
                  isMobileLandscape ? 'py-2' : 'py-3'
                } ${
                  saveSuccessNotice
                    ? 'border-emerald-400 bg-emerald-950/80 text-emerald-200'
                    : 'border-blue-500/50 bg-blue-950/60 hover:bg-blue-900/60 hover:border-blue-400 text-blue-100'
                }`}
              >
                <Save className="w-4 h-4 text-blue-400" />
                <span>{saveSuccessNotice ? '✓ TERSIMPAN KE BROWSER!' : 'SIMPAN GAME'}</span>
              </button>
            )}

            <button
              onClick={() => setPauseView('settings')}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-900/90 hover:bg-stone-800 hover:border-amber-500/50 px-4 font-bold text-amber-100 text-sm tracking-wide transition active:scale-95 cursor-pointer shadow-md ${
                isMobileLandscape ? 'py-2' : 'py-3'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>PENGATURAN</span>
            </button>

            <button
              onClick={isSingle ? onReturnToMainMenu : onDisconnectAndReturnToMainMenu}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-stone-950/80 hover:bg-red-950/60 hover:border-red-500/60 px-4 font-bold text-red-300 text-xs tracking-wide transition active:scale-95 cursor-pointer ${
                isMobileLandscape ? 'py-2' : 'py-2.5 mt-1'
              }`}
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>KELUAR KE MENU UTAMA</span>
            </button>
          </div>

          {!isSingle && (
            <div className="mt-2 rounded-xl border border-red-500/40 bg-red-950/40 p-2 text-xs text-red-200">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-300/90 leading-snug">
                  Permainan multiplayer berjalan real-time.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 font-sans"
    >
      <div
        className={`game-modal-card relative flex flex-col rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-stone-900 via-stone-950 to-black shadow-2xl shadow-black/95 text-stone-200 ${
          isMobileLandscape
            ? 'w-[94vw] max-w-[660px] h-[90dvh] max-h-[90dvh] overflow-hidden'
            : 'w-[94vw] max-w-lg max-h-[85vh] overflow-y-auto modal-scroll-area'
        }`}
      >
        {/* Header: Thin 1-row bar in mobile landscape */}
        <div
          className={`shrink-0 flex items-center justify-between border-b border-stone-800 bg-stone-950/95 ${
            isMobileLandscape ? 'px-3 py-2' : 'sticky top-0 z-20 px-4 sm:px-6 py-3'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPauseView('menu')}
              className={`flex items-center gap-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 hover:border-amber-500/50 font-bold transition cursor-pointer active:scale-95 shadow ${
                isMobileLandscape ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
              }`}
              title="Kembali ke Menu Pause"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
            <h2 className={`${isMobileLandscape ? 'text-sm' : 'text-base sm:text-lg'} font-black text-amber-100 tracking-wide font-serif whitespace-nowrap`}>
              Pengaturan
            </h2>
          </div>

          <button
            onClick={onResume}
            className={`flex items-center gap-1 rounded-xl bg-stone-800 hover:bg-red-950/80 text-stone-300 hover:text-red-300 border border-stone-700 hover:border-red-500/50 font-bold transition cursor-pointer active:scale-95 shadow-md ${
              isMobileLandscape ? 'p-1.5 text-xs' : 'px-3 py-1.5 text-xs'
            }`}
            title="Lanjutkan Permainan (Esc)"
          >
            <X className="w-4 h-4" />
            {!isMobileLandscape && <span>Tutup (Esc)</span>}
          </button>
        </div>

        {/* Body Layout: Left Sidebar + Right Content on Mobile Landscape */}
        <div className={isMobileLandscape ? 'flex-1 min-h-0 flex flex-row overflow-hidden' : 'flex flex-col flex-1 min-h-0'}>
          {/* Sub-Tabs Navigation */}
          <div
            className={
              isMobileLandscape
                ? 'w-[116px] shrink-0 border-r border-stone-800 bg-stone-950/90 p-1.5 flex flex-col gap-1 overflow-y-auto modal-scroll-area'
                : 'sticky top-[53px] z-15 shrink-0 flex items-center border-b border-stone-800 bg-stone-900/90 backdrop-blur-md px-3 sm:px-6 py-1.5 gap-2'
            }
          >
            <button
              onClick={() => setActiveTab('grafik')}
              className={`${
                isMobileLandscape ? 'w-full py-2 px-2 justify-start' : 'flex-1 py-2 px-2.5 justify-center'
              } rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'grafik'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/60 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 shrink-0" />
              <span>Grafik</span>
            </button>

            <button
              onClick={() => setActiveTab('suara')}
              className={`${
                isMobileLandscape ? 'w-full py-2 px-2 justify-start' : 'flex-1 py-2 px-2.5 justify-center'
              } rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'suara'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>Suara</span>
            </button>

            <button
              onClick={() => setActiveTab('kontrol')}
              className={`${
                isMobileLandscape ? 'w-full py-2 px-2 justify-start' : 'flex-1 py-2 px-2.5 justify-center'
              } rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'kontrol'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span>Kontrol</span>
            </button>

            <button
              onClick={() => setActiveTab('dev')}
              className={`${
                isMobileLandscape ? 'w-full py-2 px-2 justify-start' : 'flex-1 py-2 px-2.5 justify-center'
              } rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'dev'
                  ? 'bg-orange-600/30 text-orange-300 border border-orange-500/60 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              <span>Dev</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className={`flex-1 min-h-0 overflow-y-auto modal-scroll-area ${isMobileLandscape ? 'p-3 space-y-3' : 'p-4 sm:p-6 space-y-4'}`}>
          {/* TAB 1: GRAFIK */}
          {activeTab === 'grafik' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Device Profile Indicator */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/25 px-3 py-2">
                <span className="text-xs font-bold text-cyan-200">
                  {isMobileProfile ? '📱 Profil Grafik Mobile' : '🖥️ Profil Grafik PC'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {isMobileProfile ? 'graphics_mobile' : 'graphics_pc'}
                </span>
              </div>

              {/* Presets Cepat */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Preset Kualitas ({isMobileProfile ? 'Mobile' : 'PC'})
                </label>
                <div className={`grid ${isMobileProfile ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
                  <button
                    onClick={() => handleSelectPreset('low')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      settings.preset === 'low'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 shadow'
                        : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center justify-between">
                      Low
                      {settings.preset === 'low' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {isMobileProfile ? '0 Shadow • 0.75x • 160m' : '0 Shadow • 1.0x • 320m'}
                    </p>
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
                      Medium
                      {settings.preset === 'medium' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {isMobileProfile ? '512px • 1.0x • 250m' : '1024px • 1.25x • 520m'}
                    </p>
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
                      High
                      {settings.preset === 'high' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {isMobileProfile ? '1024px • 1.4x • 380m' : '1536px • 1.6x • 740m'}
                    </p>
                  </button>

                  {!isMobileProfile && (
                    <button
                      onClick={() => handleSelectPreset('ultra')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        settings.preset === 'ultra'
                          ? 'border-purple-500 bg-purple-950/45 text-purple-200 shadow'
                          : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300'
                      }`}
                    >
                      <span className="font-bold text-xs flex items-center justify-between">
                        Ultra
                        {settings.preset === 'ultra' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </span>
                      <p className="text-[10px] text-stone-400 mt-1">
                        2048px • 2.0x • 950m
                      </p>
                    </button>
                  )}
                </div>
              </div>

              {/* Kualitas Bayangan & Resolusi */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-200">Resolusi Bayangan</span>
                  <span className="text-xs font-bold text-cyan-300 uppercase">
                    {!settings.enableShadows ? 'Mati' : `${settings.shadowResolution ?? 1024}px`}
                  </span>
                </div>
                <div className={`grid ${isMobileProfile ? 'grid-cols-3' : 'grid-cols-4'} gap-1.5 text-xs`}>
                  {(isMobileProfile ? [0, 512, 1024] : [0, 1024, 1536, 2048]).map((res) => {
                    const active = res === 0 ? !settings.enableShadows : Boolean(settings.enableShadows) && (settings.shadowResolution ?? 1024) === res;
                    return (
                      <button
                        key={res}
                        onClick={() =>
                          handleUpdateGraphics(
                            res === 0
                              ? { shadows: false, enableShadows: false, shadowResolution: 0 }
                              : {
                                  shadows: true,
                                  enableShadows: true,
                                  shadowResolution: res,
                                  shadowQuality: res >= 2048 ? 'ultra' : res >= 1024 ? 'high' : 'low',
                                }
                          )
                        }
                        className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer ${
                          active
                            ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/60'
                            : 'bg-stone-800/60 text-stone-400 hover:text-white'
                        }`}
                      >
                        {res === 0 ? 'Mati' : `${res}px`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jarak Render & Kualitas Langit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-semibold">Jarak Render</span>
                    <span className="font-mono text-amber-300 font-bold">{settings.renderDistance}m</span>
                  </div>
                  <input
                    type="range"
                    min={isMobileProfile ? '140' : '320'}
                    max={isMobileProfile ? '380' : '950'}
                    step={isMobileProfile ? '10' : '20'}
                    value={settings.renderDistance}
                    onChange={(e) => handleUpdateGraphics({ renderDistance: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-semibold">Kualitas Langit</span>
                    <span className="text-xs font-mono uppercase text-sky-300 font-bold">{settings.skyQuality || 'medium'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {(['low', 'medium', 'high'] as SkyQuality[]).map((sq) => (
                      <button
                        key={sq}
                        onClick={() => handleUpdateGraphics({ skyQuality: sq })}
                        className={`py-1 rounded font-bold uppercase cursor-pointer ${
                          (settings.skyQuality || 'medium') === sq
                            ? 'bg-sky-600/35 text-sky-200 border border-sky-400/70'
                            : 'bg-stone-800/70 text-stone-400'
                        }`}
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles Rumput, Partikel, Bloom, & Kabut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                  <span className="text-stone-300">Rumput & Bunga</span>
                  <button
                    onClick={() => handleUpdateGraphics({ enableGrass: !settings.enableGrass, grassDensity: !settings.enableGrass ? 0.8 : 0 })}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      settings.enableGrass
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {settings.enableGrass ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                  <span className="text-stone-300">Post-Bloom & Glow</span>
                  <button
                    onClick={() => handleUpdateGraphics({ enableBloomGlow: !settings.enableBloomGlow })}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      settings.enableBloomGlow
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {settings.enableBloomGlow ? 'ON' : 'OFF'}
                  </button>
                </div>

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

                <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                  <span className="text-stone-300">Kabut Atmosfer</span>
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

              {/* Bagian Performa & Cache Browser (Lokal Per Perangkat) */}
              <BrowserCacheSettingsSection isOpen={isOpen && pauseView === 'settings'} />
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

          {/* TAB 4: DEVELOPER & TESTING MODE */}
          {activeTab === 'dev' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <DeveloperSettingsSection
                isInGameplay={true}
                onForceBossPhase2={onForceBossPhase2}
                onResetBoss={onResetBoss}
                onTeleportPreset={onTeleportPreset}
                onToggleSpectator={onToggleSpectator}
              />
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
    </div>
  );
};
