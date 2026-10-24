import React from 'react';
import { Compass, Gift } from 'lucide-react';
import { Quest } from '../types/game';

export interface QuestTrackerProps {
  activeQuest?: Quest | null;
  onOpenQuests: () => void;
}

export const QuestTracker: React.FC<QuestTrackerProps> = ({ activeQuest, onOpenQuests }) => {
  if (!activeQuest) return null;

  const isCompleted = activeQuest.completed;
  const isClaimed = activeQuest.claimed;

  return (
    <div
      id="hud-quest-tracker-container"
      className="quest-tracker-container pointer-events-none fixed z-30"
    >
      <div
        onClick={onOpenQuests}
        role="button"
        tabIndex={0}
        aria-label="Buka Buku Misi"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenQuests();
          }
        }}
        className="quest-tracker-card pointer-events-auto bg-stone-900/85 hover:bg-stone-900/95 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-stone-700/80 hover:border-amber-500/60 shadow-2xl cursor-pointer transition-all duration-200 select-none w-56 sm:w-64 md:w-72 group"
        title="Klik untuk membuka Buku Misi (L)"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1 group-hover:text-amber-300">
            <Compass className="w-3 h-3 text-amber-400 group-hover:rotate-45 transition-transform" />
            <span>Misi Petualangan</span>
          </span>
          <span
            className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
              isCompleted
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            {isCompleted ? 'Selesai!' : `${activeQuest.currentCount}/${activeQuest.targetCount}`}
          </span>
        </div>

        <h4 className="text-xs sm:text-sm font-bold text-stone-100 group-hover:text-amber-200 transition-colors line-clamp-1">
          {activeQuest.titleId}
        </h4>
        <p className="text-[11px] sm:text-xs text-stone-400 line-clamp-2 mt-0.5 leading-snug">
          {activeQuest.descriptionId}
        </p>

        {isCompleted && !isClaimed && (
          <div className="mt-2 text-center text-[10px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/80 py-1 px-2 rounded-xl border border-emerald-500/50 flex items-center justify-center gap-1.5 animate-pulse shadow-md">
            <Gift className="w-3.5 h-3.5 text-emerald-400" />
            <span>Klik untuk Klaim Hadiah!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestTracker;
