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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:p-8 bg-black/50 backdrop-blur-xs font-sans pointer-events-auto">
      <div className="relative w-full max-w-2xl bg-stone-950/95 border-2 border-amber-500/40 rounded-3xl p-5 md:p-6 shadow-2xl animate-fade-in flex flex-col gap-4">
        {/* Header Speaker Info */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 border border-purple-400 flex items-center justify-center text-2xl shadow-inner">
              {dialogue.avatarIcon}
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-amber-300">
                {dialogue.speaker}
              </h3>
              <p className="text-xs text-stone-400 font-medium">
                {dialogue.speakerTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
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
