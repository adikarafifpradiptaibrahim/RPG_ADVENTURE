import React from 'react';
import { DialogueNode } from '../types/game';
import { X, Sparkles, MessageSquare } from 'lucide-react';
import { soundManager } from '../game/audio';

interface DialogueModalProps {
  isOpen: boolean;
  dialogue: DialogueNode | null;
  onSelectOption: (option: DialogueNode['options'][0]) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  isOpen,
  dialogue,
  onSelectOption,
  onClose,
}) => {
  if (!isOpen || !dialogue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 md:p-8 bg-black/60 backdrop-blur-xs font-sans pointer-events-auto">
      <div className="game-modal-card relative w-full max-w-2xl max-h-[85vh] overflow-y-auto modal-scroll-area bg-stone-950/95 border-2 border-amber-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl animate-fade-in flex flex-col gap-3">
        {/* Header Speaker Info */}
        <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between border-b border-stone-800 pb-2.5 bg-stone-950/95">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 border border-purple-400 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0">
              {dialogue.avatarIcon}
            </div>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-black text-amber-300">
                {dialogue.speaker}
              </h3>
              <p className="text-[10px] sm:text-xs text-stone-400 font-medium">
                {dialogue.speakerTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 sm:p-2 rounded-xl bg-stone-900 hover:bg-red-950/80 text-stone-300 hover:text-red-300 border border-stone-700 hover:border-red-500/50 text-xs font-bold transition cursor-pointer active:scale-95"
            title="Tutup Percakapan (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="sm:hidden">Exit</span>
          </button>
        </div>

        {/* Dialogue Text Content */}
        <div className="py-2 text-stone-200 text-sm md:text-base leading-relaxed tracking-wide font-normal">
          &ldquo;{dialogue.textId}&rdquo;
        </div>

        {/* Options / Choices */}
        <div className="flex flex-col gap-2.5 pt-2">
          {dialogue.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => {
                soundManager.playChestOpen();
                onSelectOption(opt);
              }}
              className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-stone-900/80 hover:bg-gradient-to-r hover:from-amber-600 hover:to-yellow-600 text-stone-200 hover:text-stone-950 font-semibold text-xs md:text-sm border border-stone-800 hover:border-amber-300 transition-all cursor-pointer shadow active:scale-[0.99] group text-left"
            >
              <span>{opt.labelId}</span>
              <span className="text-stone-500 group-hover:text-stone-900 text-xs font-mono">
                ▶
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
