import React from 'react';
import { PlayerStats } from '../types/game';
import { X, Plus, Shield, Zap, Sparkles, User, Award } from 'lucide-react';
import { soundManager } from '../game/audio';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onAllocatePoint: (stat: 'strength' | 'agility' | 'intelligence') => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onAllocatePoint,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-stone-950/95 border border-stone-800 rounded-3xl p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="text-xl font-black text-stone-100 tracking-wide">
                Status Karakter
              </h2>
              <p className="text-xs text-stone-400">
                Tingkatkan kekuatan dan keahlian petualang Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level & Points Banner */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-900/40 border border-stone-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold text-xl">
              {stats.level}
            </div>
            <div>
              <div className="text-sm font-bold text-stone-200">Tingkat Karakter</div>
              <div className="text-xs text-stone-400">
                EXP: {stats.exp} / {stats.maxExp}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-400 block font-medium">Poin Status</span>
            <span className="text-2xl font-black text-amber-400">
              {stats.statPoints}
            </span>
          </div>
        </div>

        {/* Core Attributes */}
        <div className="space-y-3 mb-5">
          {/* Strength */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-center text-lg">
                💪
              </div>
              <div>
                <div className="text-sm font-bold text-stone-200">Kekuatan (Strength)</div>
                <div className="text-xs text-stone-400">
                  Meningkatkan Serangan Fisik (+1.5 ATK) & Daya Tahan
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-stone-200">{stats.strength}</span>
              <button
                disabled={stats.statPoints <= 0}
                onClick={() => {
                  soundManager.playChestOpen();
                  onAllocatePoint('strength');
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-stone-950 transition cursor-pointer ${
                  stats.statPoints > 0
                    ? 'bg-amber-400 hover:bg-amber-300 active:scale-90 shadow-md'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Agility */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-lg">
                ⚡
              </div>
              <div>
                <div className="text-sm font-bold text-stone-200">Kelincahan (Agility)</div>
                <div className="text-xs text-stone-400">
                  Meningkatkan Kecepatan Gerak & Peluang Serangan Kritis (+1% Crit)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-stone-200">{stats.agility}</span>
              <button
                disabled={stats.statPoints <= 0}
                onClick={() => {
                  soundManager.playChestOpen();
                  onAllocatePoint('agility');
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-stone-950 transition cursor-pointer ${
                  stats.statPoints > 0
                    ? 'bg-amber-400 hover:bg-amber-300 active:scale-90 shadow-md'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Intelligence */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-center text-lg">
                🔮
              </div>
              <div>
                <div className="text-sm font-bold text-stone-200">Kecerdasan (Intelligence)</div>
                <div className="text-xs text-stone-400">
                  Meningkatkan Daya Sihir (+4 HP Heal) & Maksimal Mana
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-stone-200">{stats.intelligence}</span>
              <button
                disabled={stats.statPoints <= 0}
                onClick={() => {
                  soundManager.playChestOpen();
                  onAllocatePoint('intelligence');
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-stone-950 transition cursor-pointer ${
                  stats.statPoints > 0
                    ? 'bg-amber-400 hover:bg-amber-300 active:scale-90 shadow-md'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Combat Stats Overview */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-900/30 border border-stone-800 text-xs">
          <div className="flex justify-between text-stone-400">
            <span>Daya Serang (ATK):</span>
            <span className="font-bold text-red-400">{Math.round(stats.baseAttack + stats.strength * 1.5)}</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>Pertahanan (DEF):</span>
            <span className="font-bold text-blue-400">{stats.baseDefense}</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>Maksimal Darah (HP):</span>
            <span className="font-bold text-emerald-400">{stats.maxHp}</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>Maksimal Mana (MP):</span>
            <span className="font-bold text-cyan-400">{stats.maxMp}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
