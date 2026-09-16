import React from 'react';
import { X, Navigation, MousePointer, Shield, Sparkles, Sword } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-stone-950/95 border border-stone-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-xl font-black text-stone-100 tracking-wide">
                Panduan Kontrol & Petualangan
              </h2>
              <p className="text-xs text-stone-400">
                Cara bermain RPG 3D Eldoria
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

        {/* Control Keys Table */}
        <div className="space-y-3 mb-5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            Kontrol Keyboard & Mouse
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Bergerak:</span>
              <span className="font-mono font-bold text-amber-400 bg-stone-800 px-2 py-0.5 rounded">
                W, A, S, D / Panah
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Putar Kamera:</span>
              <span className="font-mono font-bold text-amber-400 bg-stone-800 px-2 py-0.5 rounded">
                Klik Kanan / Tarik
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Serang Senjata:</span>
              <span className="font-mono font-bold text-red-400 bg-stone-800 px-2 py-0.5 rounded">
                Klik Kiri / Tombol
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Lompat / Menghindar:</span>
              <span className="font-mono font-bold text-amber-400 bg-stone-800 px-2 py-0.5 rounded">
                Spasi
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Skill Pusaran Pedang:</span>
              <span className="font-mono font-bold text-cyan-400 bg-stone-800 px-2 py-0.5 rounded">
                Q (15 MP)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Skill Kilat Dash:</span>
              <span className="font-mono font-bold text-emerald-400 bg-stone-800 px-2 py-0.5 rounded">
                E (15 Stamina)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Penyembuhan Suci:</span>
              <span className="font-mono font-bold text-yellow-400 bg-stone-800 px-2 py-0.5 rounded">
                R (25 MP)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-stone-400">Bicara / Buka Peti:</span>
              <span className="font-mono font-bold text-amber-400 bg-stone-800 px-2 py-0.5 rounded">
                F
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 col-span-2">
              <span className="text-stone-400">Buka Peta & Fast Travel:</span>
              <span className="font-mono font-bold text-cyan-400 bg-stone-800 px-2 py-0.5 rounded">
                M
              </span>
            </div>
          </div>
        </div>

        {/* Adventure Tips */}
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-stone-300 space-y-2">
          <div className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4" /> Eksplorasi Wilayah Dunia:
          </div>
          <p>
            1. <strong>Pedesaan Sanctuary</strong>: Desa damai dengan rumah bertingkat dan air mancur suci yang memulihkan HP & MP.
          </p>
          <p>
            2. <strong>Laut Biru & Pantai Azure</strong>: Menuju ke selatan untuk menikmati pesisir pantai pasir keemasan, dermaga kayu, dan perahu nelayan.
          </p>
          <p>
            3. <strong>Reruntuhan Kuno Vael</strong>: Di barat berdiri gerbang rune dan pilar batu kuno yang dijaga prajurit tengkorak dan peti pusaka.
          </p>
          <p>
            4. <strong>Hutan Pinus & Lembah Mistis</strong>: Di timur terdapat hutan lebat dengan kristal mana melayang dan monster slime.
          </p>
          <p>
            5. <strong>Kawah Vulkanik Obsidian</strong>: Di utara terletak arena magma berbahaya tempat bersemayamnya Boss Obsidian Titan!
          </p>
        </div>
      </div>
    </div>
  );
};
