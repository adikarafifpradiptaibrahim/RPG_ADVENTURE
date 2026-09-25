import React, { useState } from 'react';
import {
  Monitor,
  Zap,
  Sliders,
  Sparkles,
  Eye,
  Check,
  X,
  Gauge,
  Layers,
  Cpu,
} from 'lucide-react';
import {
  GraphicsSettings,
  GRAPHICS_PRESETS,
  saveGraphicsSettings,
} from '../game/graphicsSettings';

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
  const [settings, setSettings] = useState<GraphicsSettings>(currentSettings);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: 'low' | 'medium' | 'high') => {
    const next = { ...GRAPHICS_PRESETS[preset] };
    setSettings(next);
    saveGraphicsSettings(next);
    onApply(next);
  };

  const handleSave = () => {
    saveGraphicsSettings(settings);
    onApply(settings);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Grafis"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-stone-900 via-stone-950 to-black p-6 shadow-2xl shadow-cyan-950/40 text-stone-200">
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-100 font-serif">
                Pengaturan Grafis & Performa
              </h2>
              <p className="text-xs text-stone-400">
                Optimasi FPS, resolusi, dan minimalisir latensi untuk semua jenis PC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Pilihan Profil Cepat (Presets)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Low / Potato */}
            <button
              onClick={() => handleSelectPreset('low')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                settings.preset === 'low'
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 shadow-md shadow-emerald-950/50'
                  : 'border-stone-800 bg-stone-900/60 hover:bg-stone-850 hover:border-stone-700 text-stone-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm">🥔 Rendah</span>
                {settings.preset === 'low' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                Kentang / PC Spek Rendah. FPS maksimal & latency minimal.
              </p>
            </button>

            {/* Medium */}
            <button
              onClick={() => handleSelectPreset('medium')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                settings.preset === 'medium'
                  ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-md shadow-cyan-950/50'
                  : 'border-stone-800 bg-stone-900/60 hover:bg-stone-850 hover:border-stone-700 text-stone-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm">⚖️ Sedang</span>
                {settings.preset === 'medium' && <Check className="w-4 h-4 text-cyan-400" />}
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                Seimbang. Visual tajam dengan performa stabil 60 FPS.
              </p>
            </button>

            {/* High */}
            <button
              onClick={() => handleSelectPreset('high')}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                settings.preset === 'high'
                  ? 'border-amber-500 bg-amber-950/40 text-amber-200 shadow-md shadow-amber-950/50'
                  : 'border-stone-800 bg-stone-900/60 hover:bg-stone-850 hover:border-stone-700 text-stone-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm">✨ Tinggi</span>
                {settings.preset === 'high' && <Check className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                Sinematik. Bayangan halus, efek partikel penuh.
              </p>
            </button>
          </div>
        </div>

        {/* Detailed Options */}
        <div className="mt-4 space-y-3.5 rounded-xl border border-stone-800/80 bg-stone-900/40 p-4">
          {/* Render Scale */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs font-semibold block">Skala Resolusi Render</span>
                <span className="text-[10px] text-stone-400">
                  Semakin rendah, GPU semakin ringan & FPS bertambah drastis
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-stone-800">
              {[
                { label: '65% (Ringan)', val: 0.65 },
                { label: '85%', val: 0.85 },
                { label: '100% (Native)', val: 1.0 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      renderScale: opt.val,
                      preset: 'medium', // custom
                    }))
                  }
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    settings.renderScale === opt.val
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shadows */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-xs font-semibold block">Bayangan Karakter & Monster (Shadows)</span>
                <span className="text-[10px] text-stone-400">
                  Mematikan bayangan mengurangi beban render 3D hingga 50%
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  shadows: !prev.shadows,
                  preset: 'medium',
                }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                settings.shadows
                  ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                  : 'border-red-500/50 bg-red-950/50 text-red-300'
              }`}
            >
              {settings.shadows ? 'AKTIF (On)' : 'NONAKTIF (Off)'}
            </button>
          </div>

          {/* Particle Density */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-xs font-semibold block">Kepadatan Efek Partikel (VFX)</span>
                <span className="text-[10px] text-stone-400">Efek ledakan sihir, debu, dan percikan skill</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-stone-800">
              {(['low', 'medium', 'high'] as const).map((density) => (
                <button
                  key={density}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      particleDensity: density,
                      preset: 'medium',
                    }))
                  }
                  className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition ${
                    settings.particleDensity === density
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {density === 'low' ? 'Hemat' : density === 'medium' ? 'Sedang' : 'Penuh'}
                </button>
              ))}
            </div>
          </div>

          {/* Render Distance */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-xs font-semibold block">Jarak Pandang (Render Distance)</span>
                <span className="text-[10px] text-stone-400">
                  Jarak render pohon dan bukit kejauhan: {settings.renderDistance}m
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-stone-800">
              {[
                { label: '50m (Dekat)', val: 50 },
                { label: '90m (Normal)', val: 90 },
                { label: '150m (Jauh)', val: 150 },
              ].map((dist) => (
                <button
                  key={dist.val}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      renderDistance: dist.val,
                      preset: 'medium',
                    }))
                  }
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    settings.renderDistance === dist.val
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {dist.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target FPS / Frame Limiter */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-semibold block">Batas Frame Rate (FPS Cap)</span>
                <span className="text-[10px] text-stone-400">
                  Batasi frame rate untuk menghemat baterai & mencegah overheat laptop
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-stone-800">
              {[
                { label: '30 FPS', val: 30 },
                { label: '60 FPS', val: 60 },
                { label: 'Max (Uncapped)', val: 0 },
              ].map((fps) => (
                <button
                  key={fps.val}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      targetFps: fps.val,
                      preset: 'medium',
                    }))
                  }
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    settings.targetFps === fps.val
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {fps.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-xs font-bold text-white shadow-lg shadow-cyan-900/40 transition active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
