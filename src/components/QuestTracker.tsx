import React, { useState } from 'react';
import { Compass, Gift, ChevronUp, ChevronRight } from 'lucide-react';
import { Quest } from '../types/game';

export interface QuestTrackerProps {
  activeQuest?: Quest | null;
  onOpenQuests: () => void;
}

export const QuestTracker: React.FC<QuestTrackerProps> = ({ activeQuest, onOpenQuests }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!activeQuest) return null;

  const isCompleted = activeQuest.completed;
  const isClaimed = activeQuest.claimed;

  return (
    <div
      id="hud-quest-tracker-container"
      className="quest-tracker-container pointer-events-none fixed z-30"
    >
      {isCollapsed ? (
        /* Collapsed compact pill (Mobile-friendly, minimal screen real estate) */
        <div
          onClick={() => setIsCollapsed(false)}
          role="button"
          tabIndex={0}
          aria-label="Perbesar Misi"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsCollapsed(false);
            }
          }}
          className="quest-tracker-card pointer-events-auto flex items-center gap-2 bg-stone-900/90 hover:bg-stone-800/95 backdrop-blur-md px-3 py-1.5 sm:py-2 rounded-2xl border border-stone-700/80 hover:border-amber-500/70 shadow-2xl cursor-pointer text-xs font-bold text-amber-300 transition-all active:scale-95 select-none"
          title="Klik untuk memperbesar info Misi"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
          <span className="line-clamp-1 max-w-[130px] sm:max-w-[170px] text-[11px] font-semibold text-stone-200">
            {activeQuest.titleId}
          </span>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
              isCompleted
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            {isCompleted ? '✓' : `${activeQuest.currentCount}/${activeQuest.targetCount}`}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400 ml-0.5 flex-shrink-0" />
        </div>
      ) : (
        /* Expanded quest card on left screen */
        <div
          className="quest-tracker-card pointer-events-auto bg-stone-900/85 hover:bg-stone-900/95 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-stone-700/80 hover:border-amber-500/60 shadow-2xl transition-all duration-200 select-none w-56 sm:w-64 md:w-72 group"
        >
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div
              onClick={onOpenQuests}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenQuests();
                }
              }}
              className="flex items-center gap-1 cursor-pointer flex-1"
              title="Klik untuk membuka Buku Misi (L)"
            >
              <Compass className="w-3 h-3 text-amber-400 group-hover:rotate-45 transition-transform flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-amber-400 group-hover:text-amber-300">
                Misi Petualangan
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span
                onClick={onOpenQuests}
                className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {isCompleted ? 'Selesai!' : `${activeQuest.currentCount}/${activeQuest.targetCount}`}
              </span>

              {/* Mobile collapse / minimize toggle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                }}
                className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 rounded-lg cursor-pointer transition active:scale-90"
                title="Kecilkan Kotak Misi"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            onClick={onOpenQuests}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenQuests();
              }
            }}
            className="cursor-pointer"
            title="Klik untuk membuka Buku Misi (L)"
          >
            <h4 className="text-xs sm:text-sm font-bold text-stone-100 group-hover:text-amber-200 transition-colors line-clamp-1">
              {activeQuest.titleId}
            </h4>
            <p className="text-[11px] sm:text-xs text-stone-400 line-clamp-2 mt-0.5 leading-snug">
              {activeQuest.descriptionId}
            </p>
          </div>

          {isCompleted && !isClaimed && (
            <div
              onClick={onOpenQuests}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenQuests();
                }
              }}
              className="mt-2 text-center text-[10px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/80 py-1 px-2 rounded-xl border border-emerald-500/50 flex items-center justify-center gap-1.5 animate-pulse shadow-md cursor-pointer hover:bg-emerald-900/80 transition"
            >
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span>Klik untuk Klaim Hadiah!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestTracker;
