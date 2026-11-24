import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Zap,
  Sliders,
  Check,
  X,
  Volume2,
  VolumeX,
  Music,
  Gamepad2,
  Disc,
  Crosshair,
  Keyboard,
  User,
  Trash2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Edit2,
  Save,
  Cloud,
  LogOut,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import {
  GraphicsSettings,
  GRAPHICS_PRESETS,
  saveGraphicsSettings,
} from '../game/graphicsSettings';
import { soundManager } from '../game/audio';
import {
  TouchControlMode,
  getSavedControlMode,
  setSavedControlMode,
} from './VirtualJoystick';
import {
  getMouseSensitivityMultiplier,
  setMouseSensitivityMultiplier,
} from '../game/CameraControls';
import {
  getGuestSaveData,
  updateGuestProfile,
  updateDeviceSettings,
  resetAllGuestData,
  getRoleSave,
  GuestProfile,
} from '../game/storage/guestSaveManager';
import {
  cloudSyncManager,
  CloudSyncStatus,
  CloudUser,
} from '../game/storage/cloudSyncManager';

interface GraphicsSettingsModalProps {
  isOpen: boolean;
  currentSettings: GraphicsSettings;
  onApply: (settings: GraphicsSettings) => void;
  onClose: () => void;
  onResetGuest?: () => void;
  onOpenAuth?: () => void;
}

export const GraphicsSettingsModal: React.FC<GraphicsSettingsModalProps> = ({
  isOpen,
  currentSettings,
  onApply,
  onClose,
  onResetGuest,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'grafik' | 'suara' | 'kontrol' | 'akun'>('grafik');
  const [settings, setSettings] = useState<GraphicsSettings>(currentSettings);

  // Cloud Account State
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(() => cloudSyncManager.getUser());
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => cloudSyncManager.getStatus());
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [manualSyncMsg, setManualSyncMsg] = useState<string | null>(null);

  // Audio State
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());
  const [bgmVolume, setBgmVolumeState] = useState<number>(() => soundManager.getBgmVolume());
  const [sfxVolume, setSfxVolumeState] = useState<number>(() => soundManager.getSfxVolume());

  // Controls State
  const [controlMode, setControlModeState] = useState<TouchControlMode>(() => getSavedControlMode());
  const [mouseSensitivity, setMouseSensitivityState] = useState<number>(() => getMouseSensitivityMultiplier());

  // Guest Account & Storage State
  const [guestProfile, setGuestProfileState] = useState<GuestProfile>(() => getGuestSaveData().guestProfile);
  const [displayNameInput, setDisplayNameInput] = useState<string>(() => guestProfile.displayName);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameSaveFeedback, setNameSaveFeedback] = useState<string | null>(null);

  // 2-Step Reset Confirmation Dialog State: 'none' | 'step1' | 'step2'
  const [resetConfirmStep, setResetConfirmStep] = useState<'none' | 'step1' | 'step2'>('none');
  const [resetSuccessNotice, setResetSuccessNotice] = useState<boolean>(false);

  // Subscribe to Cloud Sync Manager
  useEffect(() => {
    const unsubUser = cloudSyncManager.subscribeUser(setCloudUser);
    const unsubStatus = cloudSyncManager.subscribeStatus(setSyncStatus);
    return () => {
      unsubUser();
      unsubStatus();
    };
  }, []);

  // Sync profile when opened
  useEffect(() => {
    if (isOpen) {
      const data = getGuestSaveData();
      setGuestProfileState(data.guestProfile);
      setDisplayNameInput(data.guestProfile.displayName);
      setResetConfirmStep('none');
      setResetSuccessNotice(false);
      setManualSyncMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Graphics Handlers
  const handleSelectPreset = (preset: 'low' | 'medium' | 'high') => {
    const next = { ...GRAPHICS_PRESETS[preset] };
    setSettings(next);
    saveGraphicsSettings(next);
    updateDeviceSettings({ graphics: next });
    onApply(next);
  };

  const handleUpdateGraphics = (partial: Partial<GraphicsSettings>) => {
    const next: GraphicsSettings = { ...settings, ...partial, preset: 'custom' };
    setSettings(next);
    saveGraphicsSettings(next);
    updateDeviceSettings({ graphics: next });
    onApply(next);
  };

  // Audio Handlers
  const toggleMute = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
    updateDeviceSettings({
      audio: {
        isMuted: next,
        bgmVolume,
        sfxVolume,
      },
    });
  };

  const handleBgmChange = (val: number) => {
    setBgmVolumeState(val);
    soundManager.setBgmVolume(val);
    updateDeviceSettings({
      audio: {
        isMuted,
        bgmVolume: val,
        sfxVolume,
      },
    });
  };

  const handleSfxChange = (val: number) => {
    setSfxVolumeState(val);
    soundManager.setSfxVolume(val);
    updateDeviceSettings({
      audio: {
        isMuted,
        bgmVolume,
        sfxVolume: val,
      },
    });
  };

  // Controls Handlers
  const handleControlModeSwitch = (mode: TouchControlMode) => {
    setControlModeState(mode);
    setSavedControlMode(mode);
    updateDeviceSettings({
      controls: {
        touchControlMode: mode,
        showTouchControls: getGuestSaveData().deviceSettings.controls.showTouchControls,
      },
    });
  };

  const handleSensitivityChange = (val: number) => {
    setMouseSensitivityState(val);
    setMouseSensitivityMultiplier(val);
    updateDeviceSettings({
      cameraSensitivity: val,
    });
  };

  // Guest Profile Handlers
  const handleSaveDisplayName = () => {
    const trimmed = displayNameInput.trim();
    if (!trimmed) return;
    updateGuestProfile({ displayName: trimmed });
    setGuestProfileState((prev) => ({ ...prev, displayName: trimmed }));
    setIsEditingName(false);
    setNameSaveFeedback('Nama tampilan berhasil disimpan!');
    setTimeout(() => setNameSaveFeedback(null), 2500);
  };

  // Reset Data Guest 2-Step Handlers
  const handleExecuteResetAll = () => {
    resetAllGuestData();
    setResetConfirmStep('none');
    setResetSuccessNotice(true);
    const fresh = getGuestSaveData();
    setGuestProfileState(fresh.guestProfile);
    setDisplayNameInput(fresh.guestProfile.displayName);
    setSettings(fresh.deviceSettings.graphics);
    onApply(fresh.deviceSettings.graphics);
    onResetGuest?.();
    setTimeout(() => {
      setResetSuccessNotice(false);
      onClose();
    }, 1800);
  };

  // Role Saves Summary
  const warriorSave = getRoleSave('warrior');
  const mageSave = getRoleSave('mage');
  const rogueSave = getRoleSave('rogue');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Game"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 font-sans"
    >
      <div
        style={{
          maxHeight: '88vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        className="game-modal-card relative w-[94vw] max-w-lg max-h-[88vh] flex flex-col overflow-y-auto modal-scroll-area rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-stone-900 via-stone-950 to-black shadow-2xl shadow-cyan-950/40 text-stone-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-800 bg-stone-950/95">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-amber-100 font-serif">
                  Pengaturan Permainan
                </h2>
                {/* Badge Status Akun Guest */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-300 shadow">
                  <span>👤</span>
                  <span>Akun Guest (Tersimpan di Browser)</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                ID: {guestProfile.guestId} • {guestProfile.displayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-xl bg-stone-900/90 hover:bg-red-950/80 text-stone-300 hover:text-red-300 border border-stone-700 hover:border-red-500/50 text-xs font-bold transition cursor-pointer active:scale-95 shadow-lg"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Sub-Tabs Navigation */}
        <div className="sticky top-[61px] z-15 shrink-0 flex items-center border-b border-stone-800 bg-stone-900/90 backdrop-blur-md px-3 sm:px-6 py-1.5 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('grafik')}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'kontrol'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Kontrol</span>
          </button>

          <button
            onClick={() => setActiveTab('akun')}
            className={`flex-1 min-w-[78px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'akun'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/60 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Akun & Save</span>
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
                        : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs">Low (Ringan)</span>
                      {settings.preset === 'low' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className="text-[10px] text-stone-400 leading-tight">Maksimal FPS untuk HP / GPU terintegrasi</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('medium')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      settings.preset === 'medium'
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow'
                        : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs">Medium</span>
                      {settings.preset === 'medium' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] text-stone-400 leading-tight">Keseimbangan visual dan performa stabil</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('high')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      settings.preset === 'high'
                        ? 'border-amber-500 bg-amber-950/40 text-amber-200 shadow'
                        : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs">Ultra</span>
                      {settings.preset === 'high' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-stone-400 leading-tight">Bayangan tajam & efek partikel penuh</span>
                  </button>
                </div>
              </div>

              {/* Render Scale Slider */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 flex items-center gap-1.5 font-semibold">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Skala Resolusi Render
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{Math.round(settings.renderScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.25"
                  step="0.05"
                  value={settings.renderScale}
                  onChange={(e) => handleUpdateGraphics({ renderScale: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Efek & Visual</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleUpdateGraphics({ enableShadows: !settings.enableShadows })}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      settings.enableShadows
                        ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200'
                        : 'border-stone-800 bg-stone-950/60 text-stone-400'
                    }`}
                  >
                    <span>Bayangan Realtime</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${settings.enableShadows ? 'bg-cyan-500 text-black' : 'bg-stone-800'}`}>
                      {settings.enableShadows && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdateGraphics({ enableGrass: !settings.enableGrass })}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      settings.enableGrass
                        ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200'
                        : 'border-stone-800 bg-stone-950/60 text-stone-400'
                    }`}
                  >
                    <span>Rumput 3D</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${settings.enableGrass ? 'bg-cyan-500 text-black' : 'bg-stone-800'}`}>
                      {settings.enableGrass && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdateGraphics({ enableParticles: !settings.enableParticles })}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      settings.enableParticles
                        ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200'
                        : 'border-stone-800 bg-stone-950/60 text-stone-400'
                    }`}
                  >
                    <span>Partikel Sihir</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${settings.enableParticles ? 'bg-cyan-500 text-black' : 'bg-stone-800'}`}>
                      {settings.enableParticles && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdateGraphics({ enableFog: !settings.enableFog })}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      settings.enableFog
                        ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200'
                        : 'border-stone-800 bg-stone-950/60 text-stone-400'
                    }`}
                  >
                    <span>Kabut Atmosfer</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${settings.enableFog ? 'bg-cyan-500 text-black' : 'bg-stone-800'}`}>
                      {settings.enableFog && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUARA */}
          {activeTab === 'suara' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-amber-400" />}
                  <div>
                    <h4 className="text-xs font-bold text-stone-200">Bungkam Suara (Mute)</h4>
                    <p className="text-[10px] text-stone-400">Matikan seluruh audio game seketika</p>
                  </div>
                </div>
                <button
                  onClick={toggleMute}
                  className={`py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer ${
                    isMuted ? 'bg-red-950/60 border border-red-500/60 text-red-300' : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  {isMuted ? 'Terbungkam' : 'Aktif'}
                </button>
              </div>

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

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 flex items-center gap-2 font-semibold">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
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

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-stone-300 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  Tipe Kontroler Layar HP:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleControlModeSwitch('joystick')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      controlMode === 'joystick'
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                        : 'bg-stone-800/60 text-stone-400 hover:text-white'
                    }`}
                  >
                    <Disc className="w-3.5 h-3.5" />
                    <span>Analog (Joystick)</span>
                  </button>
                  <button
                    onClick={() => handleControlModeSwitch('dpad')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      controlMode === 'dpad'
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                        : 'bg-stone-800/60 text-stone-400 hover:text-white'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>D-Pad</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-stone-300 flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-cyan-400" />
                  Keybindings PC
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
                    <span>Sprint</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">Shift</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Serangan</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">Klik Kiri</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Skill 1-4</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">Q, E, R, F</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Peta Dunia</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">M</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AKUN GUEST & CLOUD STORAGE */}
          {activeTab === 'akun' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Profile Card: Cloud Account or Guest */}
              {cloudUser ? (
                <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-3.5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-400 flex items-center justify-center text-indigo-200 font-bold text-sm shadow-inner">
                        ☁️
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-100 flex items-center gap-2">
                          <span>{cloudUser.displayName || 'Pahlawan Eldoria'}</span>
                          <span className="text-[10px] text-indigo-300 font-mono bg-indigo-900/60 px-1.5 py-0.5 rounded">
                            Akun Cloud
                          </span>
                        </h4>
                        <p className="text-[10.5px] text-stone-300">
                          {cloudUser.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        soundManager.playChestOpen();
                        await cloudSyncManager.logout();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-900/90 hover:bg-red-950/90 border border-stone-700 hover:border-red-600/60 text-stone-300 hover:text-red-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>

                  {/* Real-time Cloud Sync Status */}
                  <div className="p-2.5 rounded-lg bg-stone-950/70 border border-stone-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {syncStatus === 'syncing' || isManualSyncing ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span className="text-cyan-300 font-semibold">Sedang Menyinkronkan ke Cloud...</span>
                        </>
                      ) : syncStatus === 'synced' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-emerald-300 font-bold block leading-tight">Tersimpan di Cloud</span>
                            <span className="text-[10px] text-stone-400">
                              Terakhir sinkron: {cloudSyncManager.getLastSyncedTimeString()}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <div>
                            <span className="text-amber-300 font-bold block leading-tight">Offline - Tersimpan Lokal</span>
                            <span className="text-[10px] text-stone-400">Data aman di cache lokal perangkat</span>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isManualSyncing}
                      onClick={async () => {
                        setIsManualSyncing(true);
                        soundManager.playChestOpen();
                        const ok = await cloudSyncManager.syncLocalToCloud(true);
                        setIsManualSyncing(false);
                        if (ok) {
                          soundManager.playLevelUp();
                          setManualSyncMsg('Sinkronisasi cloud berhasil!');
                          setTimeout(() => setManualSyncMsg(null), 3000);
                        } else {
                          setManualSyncMsg('Gagal menyinkronkan ke cloud.');
                          setTimeout(() => setManualSyncMsg(null), 3000);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Simpan Cloud</span>
                    </button>
                  </div>

                  {manualSyncMsg && (
                    <p className="text-[11px] text-emerald-400 font-semibold animate-fade-in text-center">
                      {manualSyncMsg}
                    </p>
                  )}
                </div>
              ) : (
                /* Mode Guest Card with Prominent Cloud Login Banner */
                <div className="rounded-xl border border-purple-500/40 bg-purple-950/30 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-400 flex items-center justify-center text-purple-300 font-bold text-sm">
                        👤
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-100 flex items-center gap-2">
                          <span>Profil Guest</span>
                          <span className="text-[10px] text-purple-300 font-mono bg-purple-900/60 px-1.5 py-0.5 rounded">
                            {guestProfile.guestId}
                          </span>
                        </h4>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Tersimpan Lokal di Browser Perangkat Ini
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Banner Hubungkan ke Cloud */}
                  <div className="p-3 rounded-lg bg-indigo-950/70 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-xs">
                      <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                        Ingin Main di HP atau Komputer Lain?
                      </span>
                      <p className="text-[10.5px] text-stone-300 pt-0.5">
                        Daftar atau login akun Cloud untuk menyinkronkan progres Anda lintas perangkat.
                      </p>
                    </div>
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playChestOpen();
                          onOpenAuth();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow shrink-0"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Login Akun Cloud</span>
                      </button>
                    )}
                  </div>

                  {/* Edit Display Name */}
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-stone-300 block mb-1">
                      Nama Tampilan Karakter:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={20}
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder="Nama Hero..."
                        className="flex-1 bg-stone-900/90 border border-stone-700 focus:border-purple-400 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-100 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveDisplayName}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan</span>
                      </button>
                    </div>
                    {nameSaveFeedback && (
                      <p className="text-[11px] text-emerald-400 mt-1 font-semibold animate-fade-in">
                        {nameSaveFeedback}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Progres Save Game Per-Role */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3.5 space-y-2.5">
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Progres Tiap Role Tersimpan</span>
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {/* Knight */}
                  <div className="p-2.5 rounded-xl border border-amber-900/40 bg-stone-900/60 flex flex-col items-center text-center">
                    <span className="text-lg">⚔️</span>
                    <span className="font-extrabold text-xs text-amber-300 mt-0.5">Knight</span>
                    {warriorSave ? (
                      <span className="text-[11px] text-emerald-400 font-bold mt-1">
                        Lv. {warriorSave.stats.level}
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-500 italic mt-1">Belum Ada</span>
                    )}
                  </div>

                  {/* Mage */}
                  <div className="p-2.5 rounded-xl border border-blue-900/40 bg-stone-900/60 flex flex-col items-center text-center">
                    <span className="text-lg">🔮</span>
                    <span className="font-extrabold text-xs text-blue-300 mt-0.5">Mage</span>
                    {mageSave ? (
                      <span className="text-[11px] text-emerald-400 font-bold mt-1">
                        Lv. {mageSave.stats.level}
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-500 italic mt-1">Belum Ada</span>
                    )}
                  </div>

                  {/* Assassin */}
                  <div className="p-2.5 rounded-xl border border-emerald-900/40 bg-stone-900/60 flex flex-col items-center text-center">
                    <span className="text-lg">🗡️</span>
                    <span className="font-extrabold text-xs text-emerald-300 mt-0.5">Assassin</span>
                    {rogueSave ? (
                      <span className="text-[11px] text-emerald-400 font-bold mt-1">
                        Lv. {rogueSave.stats.level}
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-500 italic mt-1">Belum Ada</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Catatan Peringatan Cache Browser (Wajib Sesuai Prompt) */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Peringatan Penyimpanan Cache Browser</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed pt-0.5">
                  Progres setiap role dan pengaturan disimpan di cache browser perangkat ini. Menghapus data/cache browser atau berganti perangkat akan mereset seluruh progres.
                </p>
              </div>

              {/* 2-Step Confirmation Reset Section */}
              <div className="rounded-xl border border-red-950 bg-stone-950/80 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      Reset Data Guest Lokal
                    </h5>
                    <p className="text-[10px] text-stone-400">
                      Hapus seluruh progres role, item, dan pengaturan dari browser ini
                    </p>
                  </div>

                  {resetConfirmStep === 'none' && (
                    <button
                      type="button"
                      onClick={() => setResetConfirmStep('step1')}
                      className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 text-xs font-bold transition active:scale-95 cursor-pointer shadow"
                    >
                      Reset Data
                    </button>
                  )}
                </div>

                {/* Konfirmasi Langkah 1 */}
                {resetConfirmStep === 'step1' && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 space-y-2 animate-fade-in">
                    <p className="text-[11px] text-stone-200 font-semibold leading-snug">
                      <span className="text-amber-300 font-bold">Langkah 1 dari 2:</span> Anda yakin ingin menghapus seluruh progres game dan pengaturan di perangkat ini?
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setResetConfirmStep('step2')}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
                      >
                        Ya, Lanjutkan
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetConfirmStep('none')}
                        className="py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition active:scale-95 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {/* Konfirmasi Langkah 2 (Peringatan Kritis Terakhir) */}
                {resetConfirmStep === 'step2' && (
                  <div className="p-3 rounded-lg bg-red-950/80 border-2 border-red-500 space-y-2 animate-fade-in shadow-xl">
                    <div className="flex items-center gap-1.5 text-red-300 font-black text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>PERINGATAN TERAKHIR (Langkah 2 dari 2)</span>
                    </div>
                    <p className="text-[11px] text-red-200 leading-snug">
                      Tindakan ini permanen dan tidak dapat dibatalkan! Semua level, emas, senjata, dan profil guest akan langsung terhapus dari browser.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleExecuteResetAll}
                        className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-wider uppercase transition active:scale-95 cursor-pointer shadow-lg"
                      >
                        HAPUS SEMUA SEKARANG
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetConfirmStep('none')}
                        className="py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition active:scale-95 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {resetSuccessNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-bold text-center animate-fade-in">
                    ✓ Data guest lokal berhasil dibersihkan! Memuat ulang konfigurasi...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 px-4 py-3 font-bold text-white shadow-lg transition active:scale-98 cursor-pointer"
            >
              <span>Simpan & Tutup Pengaturan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
