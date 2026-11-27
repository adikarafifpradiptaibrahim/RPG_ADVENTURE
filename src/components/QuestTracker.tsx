import React, { useState, useEffect } from 'react';
import { Compass, Gift, ChevronUp, ChevronRight } from 'lucide-react';
import { Quest } from '../types/game';
import { useMobileViewport } from '../game/utils/mobileViewport';

export interface QuestTrackerProps {
  activeQuest?: Quest | null;
  onOpenQuests: () => void;
}

export const QuestTracker: React.FC<QuestTrackerProps> = ({ activeQuest, onOpenQuests }) => {
  const { isMobileUi } = useMobileViewport();
  // Mobile starts collapsed to keep left-top extra clean, expandable up to 2 lines
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 960 || window.innerHeight <= 580;
  });

  useEffect(() => {
    if (isMobileUi) {
      setIsCollapsed(true);
    }
  }, [isMobileUi]);

  if (!activeQuest) return null;

  const isCompleted = activeQuest.completed;
  const isClaimed = activeQuest.claimed;

  return (
    <div
      id="hud-quest-tracker-container"
      style={
        isMobileUi
          ? {
              top: 'calc(74px + env(safe-area-inset-top, 0px))',
              left: 'max(10px, env(safe-area-inset-left, 0px))',
              maxWidth: '175px',
            }
          : undefined
      }
      className={`quest-tracker-container pointer-events-none fixed z-30 ${
        isMobileUi ? 'w-[172px] max-w-[175px]' : ''
      }`}
    >
      {isCollapsed ? (
        /* Collapsed pill: 1 compact row with fold/unfold toggle */
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
          className={`quest-tracker-card pointer-events-auto flex items-center gap-1.5 bg-stone-900/90 hover:bg-stone-800/95 backdrop-blur-md rounded-xl border border-amber-500/50 shadow-xl cursor-pointer font-bold text-amber-300 transition-all active:scale-95 select-none w-fit ${
            isMobileUi ? 'px-2 py-1 text-[10px] max-w-[195px]' : 'px-2.5 py-1.5 text-[11px] max-w-[200px]'
          }`}
          title="Ketuk untuk membuka Misi Petualangan"
        >
          <Compass className="w-3 h-3 text-amber-400 animate-pulse flex-shrink-0" />
          <span className="truncate font-semibold text-stone-200">
            {isMobileUi ? activeQuest.titleId : 'Misi Petualangan'}
          </span>
          <span
            className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold flex-shrink-0 ${
              isCompleted
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            {isCompleted ? '✓' : `${activeQuest.currentCount}/${activeQuest.targetCount}`}
          </span>
          <ChevronRight className="w-3 h-3 text-stone-400 flex-shrink-0" />
        </div>
      ) : (
        /* Expanded quest card: compact 2-line chip on mobile, richer card on desktop */
        <div
          className={`quest-tracker-card pointer-events-auto bg-stone-900/90 hover:bg-stone-900/95 backdrop-blur-md border border-stone-700/80 hover:border-amber-500/60 shadow-2xl transition-all duration-200 select-none group ${
            isMobileUi
              ? 'p-1.5 rounded-xl w-[192px] max-w-[195px] text-[10px]'
              : 'p-2.5 sm:p-3 rounded-2xl w-64 max-w-[280px] text-[11px]'
          }`}
        >
          {/* Line 1: Header + Progress + Collapse button */}
          <div className="flex items-center justify-between gap-1 pb-0.5 border-b border-stone-800/80">
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
              className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
              title="Buka Buku Misi Lengkap"
            >
              <Compass className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="text-[9.5px] sm:text-[10.5px] uppercase tracking-wide font-bold text-amber-400 truncate">
                {isMobileUi ? activeQuest.titleId : 'Misi Petualangan'}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                  isCompleted
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {isCompleted ? 'Selesai!' : `${activeQuest.currentCount}/${activeQuest.targetCount}`}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                }}
                aria-label="Lipat Misi"
                className="p-0.5 text-stone-400 hover:text-stone-100 rounded cursor-pointer"
                title="Lipat Misi"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Line 2: Objective */}
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
            className="cursor-pointer pt-1"
            title="Klik untuk membuka Buku Misi Lengkap (L)"
          >
            {!isMobileUi && (
              <h4 className="text-xs font-bold text-stone-100 group-hover:text-amber-200 transition-colors line-clamp-1">
                {activeQuest.titleId}
              </h4>
            )}
            <p className={`text-stone-300 leading-tight ${isMobileUi ? 'text-[9.5px] line-clamp-1' : 'text-[11px] text-stone-400 line-clamp-2 mt-0.5'}`}>
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
              className="mt-1 text-center text-[9.5px] font-bold text-emerald-300 bg-emerald-950/80 py-0.5 px-1.5 rounded-lg border border-emerald-500/50 flex items-center justify-center gap-1 animate-pulse shadow-md cursor-pointer hover:bg-emerald-900/80 transition"
            >
              <Gift className="w-3 h-3 text-emerald-400" />
              <span>Klaim Hadiah!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestTracker;
