import React, { useState, useEffect, useCallback } from 'react';
import { HardDrive, Zap, Trash2 } from 'lucide-react';
import { soundManager } from '../game/audio';
import {
  isWorldCacheEnabled,
  setWorldCacheEnabled,
  clearWorldCache,
  getWorldCacheInfo,
  WorldCacheInfo,
} from '../game/storage/worldCacheManager';

interface BrowserCacheSettingsSectionProps {
  isOpen?: boolean;
}

export const BrowserCacheSettingsSection: React.FC<BrowserCacheSettingsSectionProps> = ({
  isOpen = true,
}) => {
  const [cacheEnabled, setCacheEnabled] = useState<boolean>(() => isWorldCacheEnabled());
  const [cacheInfo, setCacheInfo] = useState<WorldCacheInfo>({
    exists: false,
    sizeMB: '0',
    savedAt: null,
  });
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setCacheEnabled(isWorldCacheEnabled());
    const info = await getWorldCacheInfo();
    setCacheInfo(info);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void refreshStatus();
    }
  }, [isOpen, refreshStatus]);

  useEffect(() => {
    const onCacheChange = () => {
      void refreshStatus();
    };
    window.addEventListener('eldoria_world_cache_changed', onCacheChange);
    window.addEventListener('eldoria_world_cache_saved', onCacheChange);
    return () => {
      window.removeEventListener('eldoria_world_cache_changed', onCacheChange);
      window.removeEventListener('eldoria_world_cache_saved', onCacheChange);
    };
  }, [refreshStatus]);

  const handleToggleCache = async () => {
    if (isBusy) return;
    setIsBusy(true);
    soundManager.playMenuClick();
    const next = !cacheEnabled;
    setCacheEnabled(next);
    await setWorldCacheEnabled(next);
    await refreshStatus();
    setIsBusy(false);

    if (!next) {
      setStatusFeedback('Cache lokal dinonaktifkan & penyimpanan dibersihkan.');
      setTimeout(() => setStatusFeedback(null), 2600);
    }
  };

  const handleClearCache = async () => {
    if (isBusy) return;
    setIsBusy(true);
    soundManager.playMenuClick();
    await clearWorldCache();
    await refreshStatus();
    setIsBusy(false);
    setStatusFeedback('Cache dunia berhasil dihapus (0 MB).');
    setTimeout(() => setStatusFeedback(null), 2600);
  };

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/75 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          Performa &amp; Cache Browser
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-stone-400">
          Khusus Perangkat Ini
        </span>
      </div>

      {/* Toggle Switch Simpan Cache Dunia */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-200">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Simpan Cache Dunia (Loading Cepat)</span>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Menyimpan data medan dan peta di browser perangkat ini agar loading berikutnya jauh lebih cepat. Pengaturan dan cache ini tidak disinkronkan ke browser atau perangkat lain.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={cacheEnabled}
          disabled={isBusy}
          onClick={handleToggleCache}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
            cacheEnabled
              ? 'bg-cyan-600 border-cyan-400'
              : 'bg-stone-800 border-stone-700'
          }`}
          title={cacheEnabled ? 'Nonaktifkan Cache Dunia' : 'Aktifkan Cache Dunia'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              cacheEnabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Info Status & Tombol Hapus Cache */}
      <div className="pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-[11px] font-mono">
          {cacheInfo.exists ? (
            <span className="text-emerald-300 font-semibold">
              Status: Tersimpan (~{cacheInfo.sizeMB} MB di browser ini)
            </span>
          ) : (
            <span className="text-stone-400">
              Status: Belum ada cache tersimpan (0 MB)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleClearCache}
          disabled={!cacheInfo.exists || isBusy}
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-800/60 text-red-200 text-[11px] font-bold transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>🗑️ Hapus Cache Dunia</span>
        </button>
      </div>

      {statusFeedback && (
        <p className="text-[11px] text-cyan-300 font-semibold animate-fade-in">
          {statusFeedback}
        </p>
      )}
    </div>
  );
};
