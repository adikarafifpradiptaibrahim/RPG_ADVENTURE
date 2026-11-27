import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Shield,
  Zap,
  Flame,
  TimerOff,
  Eye,
  Activity,
  Navigation,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  DevTestingSettings,
  getDefaultDevTestingSettings,
  getDevTestingSettings,
  saveDevTestingSettings,
  subscribeDevTestingSettings,
  updateDevTestingSettings,
} from '../game/storage/devTestingManager';

export type DevTeleportPreset = 'ignis' | 'jarrus' | 'titan' | 'village';

export interface DeveloperSettingsSectionProps {
  isInGameplay?: boolean;
  onForceBossPhase2?: () => { ok: boolean; message: string };
  onResetBoss?: () => { ok: boolean; message: string };
  onTeleportPreset?: (preset: DevTeleportPreset) => { ok: boolean; label: string } | void;
  onToggleSpectator?: (next: boolean) => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  accentClass?: string;
  icon: React.ReactNode;
  onChange: (next: boolean) => void;
}

const DevToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  disabled = false,
  accentClass = 'bg-amber-500 border-amber-300',
  icon,
  onChange,
}) => (
  <div
    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition ${
      disabled
        ? 'opacity-45 bg-stone-950/40 border-stone-800/70'
        : checked
        ? 'bg-stone-800/90 border-amber-500/40'
        : 'bg-stone-900/70 border-stone-800 hover:border-stone-700'
    }`}
  >
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="mt-0.5 shrink-0 text-amber-300">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs sm:text-sm font-semibold text-stone-100 leading-tight">{label}</div>
        <div className="text-[11px] text-stone-400 leading-snug mt-0.5">{description}</div>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
        checked ? accentClass : 'bg-stone-700 border-stone-600'
      } ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export const DeveloperSettingsSection: React.FC<DeveloperSettingsSectionProps> = ({
  isInGameplay = false,
  onForceBossPhase2,
  onResetBoss,
  onTeleportPreset,
  onToggleSpectator,
}) => {
  const [settings, setSettings] = useState<DevTestingSettings>(() => getDevTestingSettings());
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setSettings(getDevTestingSettings());
    return subscribeDevTestingSettings((next) => {
      setSettings(next);
    });
  }, []);

  const showTempFeedback = (ok: boolean, text: string) => {
    setFeedback({ ok, text });
  };

  const handleToggle = (key: keyof DevTestingSettings, nextVal: boolean) => {
    const updated = updateDevTestingSettings({ [key]: nextVal });
    setSettings(updated);
    if (key === 'spectatorMode' && updated.enabled && isInGameplay) {
      onToggleSpectator?.(nextVal);
    }
    if (key === 'enabled' && !nextVal && isInGameplay && updated.spectatorMode) {
      onToggleSpectator?.(false);
    }
  };

  const handleResetAll = () => {
    const defaults = saveDevTestingSettings(getDefaultDevTestingSettings());
    setSettings(defaults);
    if (isInGameplay) {
      onToggleSpectator?.(false);
    }
    showTempFeedback(true, 'Seluruh opsi Mode Developer direset ke NONAKTIF (Default).');
  };

  const controlsDisabled = !settings.enabled;
  const actionsDisabled = !settings.enabled || !isInGameplay;

  return (
    <div className="space-y-4">
      {/* Local-Only Privacy Notice + Master Switch */}
      <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/35 via-stone-900/90 to-stone-950 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Alat Pengujian Developer (Testing Tools)
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-800/90 border border-stone-600/80 px-2.5 py-0.5 text-[10px] font-semibold text-stone-300">
            <Lock className="w-3 h-3 text-emerald-400" />
            100% Lokal Browser • Anti Cloud-Sync
          </span>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed mb-3">
          Default selalu <span className="text-rose-300 font-semibold">MATI (OFF)</span> bagi semua pemain dan hanya
          disimpan di <code className="text-amber-300">localStorage</code> perangkat ini (tidak pernah disinkronkan ke
          Cloud Save).
        </p>

        <DevToggleRow
          label="Aktifkan Mode Developer (Master Switch)"
          description="Menghidupkan atau mematikan seluruh fitur pengujian & cheat di bawah secara seketika."
          checked={settings.enabled}
          accentClass="bg-emerald-500 border-emerald-300"
          icon={<Wrench className="w-4 h-4 text-emerald-300" />}
          onChange={(val) => handleToggle('enabled', val)}
        />
      </div>

      {/* Combat & Movement Sub-toggles */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1">
          Status & Pertempuran (Combat Modifiers)
        </div>

        <DevToggleRow
          label="God Mode (Kebal Damage & Maut)"
          description="HP tidak berkurang akibat serangan monster/boss maupun bahaya lingkungan."
          checked={settings.godMode}
          disabled={controlsDisabled}
          accentClass="bg-sky-500 border-sky-300"
          icon={<Shield className="w-4 h-4 text-sky-300" />}
          onChange={(val) => handleToggle('godMode', val)}
        />

        <DevToggleRow
          label="Kebal Efek Kontrol (CC Immune)"
          description="Kebal terhadap Stun, Knockback, Knockup Meteor Dive, Slow, dan Pusaran Hisap Cacing."
          checked={settings.ccImmune}
          disabled={controlsDisabled}
          accentClass="bg-cyan-500 border-cyan-300"
          icon={<Sparkles className="w-4 h-4 text-cyan-300" />}
          onChange={(val) => handleToggle('ccImmune', val)}
        />

        <DevToggleRow
          label="Infinite MP / Aura & Stamina"
          description="MP, Aura Prajurit, dan Stamina selalu terjaga penuh 100% tanpa biaya skill."
          checked={settings.infiniteEnergy}
          disabled={controlsDisabled}
          accentClass="bg-indigo-500 border-indigo-300"
          icon={<Zap className="w-4 h-4 text-indigo-300" />}
          onChange={(val) => handleToggle('infiniteEnergy', val)}
        />

        <DevToggleRow
          label="Super Damage (10× ATK)"
          description="Kalikan seluruh damage serangan & skill sebesar 10× untuk uji cepat fase boss."
          checked={settings.superDamage}
          disabled={controlsDisabled}
          accentClass="bg-orange-500 border-orange-300"
          icon={<Flame className="w-4 h-4 text-orange-400" />}
          onChange={(val) => handleToggle('superDamage', val)}
        />

        <DevToggleRow
          label="Tanpa Cooldown (0 Cooldown Skill)"
          description="Hilangkan seluruh cooldown skill, ultimate, dan dash untuk spam pengujian VFX."
          checked={settings.zeroCooldown}
          disabled={controlsDisabled}
          accentClass="bg-purple-500 border-purple-300"
          icon={<TimerOff className="w-4 h-4 text-purple-300" />}
          onChange={(val) => handleToggle('zeroCooldown', val)}
        />

        <DevToggleRow
          label="Spectator Mode (Freecam Terbang F3)"
          description="Lepas gravitasi dan terbang bebas memeriksa animasi boss dari segala sudut kamera."
          checked={settings.spectatorMode}
          disabled={controlsDisabled}
          accentClass="bg-teal-500 border-teal-300"
          icon={<Eye className="w-4 h-4 text-teal-300" />}
          onChange={(val) => handleToggle('spectatorMode', val)}
        />

        <DevToggleRow
          label="Dev Debug Overlay (FPS, XYZ & State Boss)"
          description="Tampilkan telemetry real-time FPS, koordinat pemain, status AI & fase boss di sudut layar."
          checked={settings.showDebugOverlay}
          disabled={controlsDisabled}
          accentClass="bg-emerald-500 border-emerald-300"
          icon={<Activity className="w-4 h-4 text-emerald-300" />}
          onChange={(val) => handleToggle('showDebugOverlay', val)}
        />
      </div>

      {/* Boss Control & Quick Teleports */}
      <div className="rounded-xl border border-stone-700/80 bg-stone-900/80 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Kontrol Boss & Teleport Cepat Arena
          </span>
          {!isInGameplay && (
            <span className="text-[10px] text-stone-400 italic">Aktif saat berada di dunia 3D</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={actionsDisabled || !onForceBossPhase2}
            onClick={() => {
              const res = onForceBossPhase2?.();
              if (res) showTempFeedback(res.ok, res.message);
            }}
            className="flex items-center justify-center gap-2 rounded-lg border border-orange-500/50 bg-orange-950/60 hover:bg-orange-900/70 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-xs font-bold text-orange-200 transition cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Paksa Boss Fase 2 (50% HP)
          </button>

          <button
            type="button"
            disabled={actionsDisabled || !onResetBoss}
            onClick={() => {
              const res = onResetBoss?.();
              if (res) showTempFeedback(res.ok, res.message);
            }}
            className="flex items-center justify-center gap-2 rounded-lg border border-sky-500/50 bg-sky-950/60 hover:bg-sky-900/70 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-xs font-bold text-sky-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            Reset Boss Terdekat (100% HP)
          </button>
        </div>

        <div className="pt-1">
          <div className="text-[11px] font-semibold text-stone-400 mb-2 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-amber-400" />
            Teleport Cepat Lokasi Testing
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={actionsDisabled || !onTeleportPreset}
              onClick={() => {
                const res = onTeleportPreset?.('ignis');
                showTempFeedback(true, res ? `Teleport ke ${res.label}` : 'Teleport ke Gerbang Jembatan Kaldera Naga [40, 738]');
              }}
              className="rounded-lg border border-red-500/40 bg-red-950/45 hover:bg-red-900/60 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-2 text-xs font-semibold text-red-200 transition cursor-pointer text-left"
            >
              🐉 Naga Ignis <span className="block text-[10px] text-red-300/75 font-mono">[40, 738]</span>
            </button>

            <button
              type="button"
              disabled={actionsDisabled || !onTeleportPreset}
              onClick={() => {
                const res = onTeleportPreset?.('jarrus');
                showTempFeedback(true, res ? `Teleport ke ${res.label}` : 'Teleport ke Kawah Jarrus [-840, -205]');
              }}
              className="rounded-lg border border-amber-500/40 bg-amber-950/45 hover:bg-amber-900/60 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-2 text-xs font-semibold text-amber-200 transition cursor-pointer text-left"
            >
              🪱 Cacing Jarrus <span className="block text-[10px] text-amber-300/75 font-mono">[-840, -205]</span>
            </button>

            <button
              type="button"
              disabled={actionsDisabled || !onTeleportPreset}
              onClick={() => {
                const res = onTeleportPreset?.('titan');
                showTempFeedback(true, res ? `Teleport ke ${res.label}` : 'Teleport ke Arena Titan Kuno');
              }}
              className="rounded-lg border border-emerald-500/40 bg-emerald-950/45 hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-2 text-xs font-semibold text-emerald-200 transition cursor-pointer text-left"
            >
              🗿 Titan Kuno <span className="block text-[10px] text-emerald-300/75 font-mono">Altar Hutan</span>
            </button>

            <button
              type="button"
              disabled={actionsDisabled || !onTeleportPreset}
              onClick={() => {
                const res = onTeleportPreset?.('village');
                showTempFeedback(true, res ? `Teleport ke ${res.label}` : 'Teleport ke Desa Eldoria');
              }}
              className="rounded-lg border border-stone-500/40 bg-stone-800/75 hover:bg-stone-700/80 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-2 text-xs font-semibold text-stone-200 transition cursor-pointer text-left"
            >
              🏘️ Desa Eldoria <span className="block text-[10px] text-stone-400 font-mono">Titik Aman</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              feedback.ok
                ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/50 text-rose-200'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* Footer Reset Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-300 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Matikan Semua Opsi Developer
        </button>
      </div>
    </div>
  );
};
