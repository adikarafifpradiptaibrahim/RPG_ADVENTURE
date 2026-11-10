import React, { useState } from 'react';
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

interface GraphicsSettingsModalProps {
  isOpen: boolean;
  currentSettings: GraphicsSettings;
  onApply: (settings: GraphicsSettings) => void;
  onClose: () => void;
}

export const GraphicsSettingsModal: React.FC<GraphicsSettingsModalProps> = ({
  isOpen,
  currentSettings,
  onApply,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'grafik' | 'suara' | 'kontrol'>('grafik');
  const [settings, setSettings] = useState<GraphicsSettings>(currentSettings);

  // Audio State
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());
  const [bgmVolume, setBgmVolumeState] = useState<number>(() => soundManager.getBgmVolume());
  const [sfxVolume, setSfxVolumeState] = useState<number>(() => soundManager.getSfxVolume());

  // Controls State
  const [controlMode, setControlModeState] = useState<TouchControlMode>(() => getSavedControlMode());
  const [mouseSensitivity, setMouseSensitivityState] = useState<number>(() => getMouseSensitivityMultiplier());

  if (!isOpen) return null;

  // Graphics Handlers
  const handleSelectPreset = (preset: 'low' | 'medium' | 'high') => {
    const next = { ...GRAPHICS_PRESETS[preset] };
    setSettings(next);
    saveGraphicsSettings(next);
    onApply(next);
  };

  const handleUpdateGraphics = (partial: Partial<GraphicsSettings>) => {
    const next: GraphicsSettings = { ...settings, ...partial, preset: 'custom' };
    setSettings(next);
    saveGraphicsSettings(next);
    onApply(next);
  };

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Game"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 font-sans"
    >
      <div
        style={{
          maxHeight: '85vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        className="game-modal-card relative w-[94vw] max-w-lg max-h-[85vh] flex flex-col overflow-y-auto modal-scroll-area rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-stone-900 via-stone-950 to-black shadow-2xl shadow-cyan-950/40 text-stone-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-800 bg-stone-950/95">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-100 font-serif">
                Pengaturan Permainan
              </h2>
              <p className="text-[11px] text-stone-400">
                Grafik, Audio, dan Kontrol untuk HP & PC
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

        {/* 3 Sub-Tabs Navigation */}
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

        {/* Content */}
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
                  <span className="text-xs font-semibold text-stone-200">Kualitas Bayangan</span>
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

              {/* Toggles Rumput, Partikel & Kabut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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

                <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-3 sm:col-span-2">
                  <span className="text-stone-300">Efek Kabut Atmosfer</span>
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
                    <span>Skill 1-3</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">1, 2, 3</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/60 px-2 py-1 rounded border border-stone-800">
                    <span>Peta Dunia</span>
                    <kbd className="font-mono text-amber-300 bg-stone-800 px-1 rounded">M</kbd>
                  </div>
                </div>
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
