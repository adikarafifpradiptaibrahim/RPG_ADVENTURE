import React from 'react';
import { Quest } from '../types/game';
import { X, CheckCircle2, Circle, Gift, Compass, Coins, Sparkles } from 'lucide-react';
import { soundManager } from '../game/audio';

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
  onClaimReward: (questId: string) => void;
}

export const QuestModal: React.FC<QuestModalProps> = ({
  isOpen,
  onClose,
  quests,
  onClaimReward,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-stone-950/95 border border-stone-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📜</span>
            <div>
              <h2 className="text-xl font-black text-stone-100 tracking-wide">
                Buku Misi & Petualangan
              </h2>
              <p className="text-xs text-stone-400">
                Selesaikan tugas untuk menyelamatkan Eldoria dan raih hadiah epik
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

        {/* Quest List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className={`p-4 rounded-2xl border transition-all ${
                quest.claimed
                  ? 'bg-stone-900/30 border-stone-800 opacity-60'
                  : quest.completed
                  ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg'
                  : 'bg-stone-900/60 border-stone-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-lg">
                    {quest.claimed ? (
                      <CheckCircle2 className="w-5 h-5 text-stone-500" />
                    ) : quest.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                    ) : (
                      <Circle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-100">{quest.titleId}</h3>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      {quest.descriptionId}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            quest.completed ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{
                            width: `${Math.min(100, (quest.currentCount / quest.targetCount) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-stone-300">
                        {quest.currentCount} / {quest.targetCount}
                      </span>
                    </div>

                    {/* Rewards Info */}
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> +{quest.rewardExp} EXP
                      </span>
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" /> +{quest.rewardGold} Gold
                      </span>
                      {quest.rewardItem && (
                        <span className="text-purple-300 font-semibold flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" /> {quest.rewardItem.nameId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Claim Button */}
                {quest.completed && !quest.claimed && (
                  <button
                    onClick={() => {
                      soundManager.playChestOpen();
                      onClaimReward(quest.id);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-bold text-xs shadow-lg cursor-pointer transition active:scale-95 whitespace-nowrap animate-pulse"
                  >
                    Klaim Hadiah
                  </button>
                )}

                {quest.claimed && (
                  <span className="text-[11px] font-bold text-stone-500 bg-stone-800/80 px-2.5 py-1 rounded-lg">
                    Selesai
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
