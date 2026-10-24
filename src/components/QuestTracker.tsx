import React, { useState } from 'react';
import { Compass, Gift, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { Quest } from '../types/game';

export interface QuestTrackerProps {
  activeQuest?: Quest | null;
  onOpenQuests: () => void;
}

export const QuestTracker: React.FC<QuestTrackerProps> = ({ activeQuest, onOpenQuests }) => {
  // Mobile defaults to collapsed so analog zone remains 100% unobstructed
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  if (!activeQuest) return null;

  const isCompleted = activeQuest.completed;
  const isClaimed = activeQuest.claimed;

  return (
    <div
      id="hud-quest-tracker-container"
      className="quest-tracker-container pointer-events-none fixed z-30"
    >
      {isCollapsed ? (
        /* Collapsed pill: compact, minimal, taps header to expand */
        <div
          onClick={() => setIsCollapsed(false)}
          role="button"
          tabIndex={0}
          aria-label="Buka Misi Petualangan"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsCollapsed(false);
            }
          }}
          className="quest-tracker-card pointer-events-auto flex items-center gap-1.5 bg-stone-900/90 hover:bg-stone-800/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-amber-500/50 shadow-xl cursor-pointer text-[11px] font-bold text-amber-300 transition-all active:scale-95 select-none w-fit max-w-[200px]"
          title="Klik header untuk membuka detail Misi Petualangan"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
          <span className="truncate text-[11px] font-semibold text-stone-200">
            Misi Petualangan
          </span>
          <span
            className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
              isCompleted
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            {isCompleted ? '✓' : `${activeQuest.currentCount}/${activeQuest.targetCount}`}
          </span>
          <ChevronRight className="w-3 h-3 text-stone-400 flex-shrink-0 ml-0.5" />
        </div>
      ) : (
        /* Expanded quest card: compact and clean */
        <div
          className="quest-tracker-card pointer-events-auto bg-stone-900/90 hover:bg-stone-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-stone-700/80 hover:border-amber-500/60 shadow-2xl transition-all duration-200 select-none w-48 sm:w-52 md:w-68 max-w-[200px] md:max-w-[280px] group text-[11px]"
        >
          {/* Header row: Clicking title/chevron folds card */}
          <div
            onClick={() => setIsCollapsed(true)}
            role="button"
            tabIndex={0}
            aria-label="Tutup / Lipat Misi"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsCollapsed(true);
              }
            }}
            className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-stone-800/80 cursor-pointer"
            title="Klik header untuk melipat Misi"
          >
            <div className="flex items-center gap-1 flex-1">
              <Compass className="w-3 h-3 text-amber-400 group-hover:rotate-45 transition-transform flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-amber-400 group-hover:text-amber-300 truncate">
                Misi Petualangan
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  isCompleted
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {isCompleted ? 'Selesai!' : `${activeQuest.currentCount}/${activeQuest.targetCount}`}
              </span>

              <div
                className="p-0.5 text-stone-400 hover:text-stone-200 rounded cursor-pointer"
                title="Lipat Misi"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Quest Content: Clicking opens full Quest Modal (L) */}
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
            className="cursor-pointer pt-0.5"
            title="Klik untuk membuka Buku Misi Lengkap (L)"
          >
            <h4 className="text-[11px] sm:text-xs font-bold text-stone-100 group-hover:text-amber-200 transition-colors line-clamp-1">
              {activeQuest.titleId}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-stone-400 line-clamp-2 mt-0.5 leading-tight">
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
              className="mt-1.5 text-center text-[10px] font-bold text-emerald-300 bg-emerald-950/80 py-1 px-1.5 rounded-xl border border-emerald-500/50 flex items-center justify-center gap-1 animate-pulse shadow-md cursor-pointer hover:bg-emerald-900/80 transition"
            >
              <Gift className="w-3 h-3 text-emerald-400" />
              <span>Klaim Hadiah Misi!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestTracker;
