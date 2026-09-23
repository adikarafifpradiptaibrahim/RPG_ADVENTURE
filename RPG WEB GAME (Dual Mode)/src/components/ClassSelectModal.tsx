import React from 'react';
import { CharacterClass } from '../types/game';
import { Shield, Sparkles, Zap, Play } from 'lucide-react';
import { soundManager } from '../game/audio';

interface ClassSelectModalProps {
  isOpen: boolean;
  selectedClass: CharacterClass;
  onSelectClass: (c: CharacterClass) => void;
  onStartGame: () => void;
}

export const ClassSelectModal: React.FC<ClassSelectModalProps> = ({
  isOpen,
  selectedClass,
  onSelectClass,
  onStartGame,
}) => {
  if (!isOpen) return null;

  const classes: {
    id: CharacterClass;
    name: string;
    subtitle: string;
    icon: string;
    desc: string;
    stats: { hp: string; atk: string; spd: string; diff: string };
    skills: string[];
    color: string;
  }[] = [
    {
      id: 'warrior',
      name: 'Ksatria (Warrior)',
      subtitle: 'Ahli Pedang & Perisai Baja',
      icon: '⚔️',
      desc: 'Pertahanan tinggi, HP tebal, dan serangan pedang tebasan mematikan. Sangat tangguh dalam pertarungan jarak dekat.',
      stats: { hp: 'Sangat Tinggi', atk: 'Tinggi', spd: 'Sedang', diff: 'Mudah' },
      skills: ['Tebasan Pedang Baja', 'Pusaran Pedang (Whirlwind)', 'Perisai Baja'],
      color: 'border-blue-500 bg-blue-950/20 text-blue-300',
    },
    {
      id: 'mage',
      name: 'Penyihir (Mage)',
      subtitle: 'Penguasa Energi Kristal',
      icon: '🔮',
      desc: 'Menguasai sihir kuno, kapasitas Mana melimpah, serta kemampuan pemulihan suci yang dahsyat.',
      stats: { hp: 'Sedang', atk: 'Tinggi (Sihir)', spd: 'Sedang', diff: 'Menengah' },
      skills: ['Ledakan Kristal', 'Penyembuhan Suci (Holy Sanctuary)', 'Gelombang Arcane'],
      color: 'border-purple-500 bg-purple-950/20 text-purple-300',
    },
    {
      id: 'rogue',
      name: 'Pemburu (Rogue)',
      subtitle: 'Bayangan Angin & Belati Cepat',
      icon: '🏹',
      desc: 'Kecepatan gerak kilat, serangan kritis mematikan, dan kemampuan dash menghindar yang sangat lincah.',
      stats: { hp: 'Sedang', atk: 'Kritis Tinggi', spd: 'Sangat Cepat', diff: 'Ahli' },
      skills: ['Tikaman Belati Ganda', 'Langkah Kilat (Swift Dash)', 'Tebasan Bayangan'],
      color: 'border-emerald-500 bg-emerald-950/20 text-emerald-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl bg-stone-950/95 border-2 border-amber-500/50 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            ✨ Petualangan Lembah Kuno 3D
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-100 tracking-wide">
            Pilih Kelas Petualang
          </h1>
          <p className="text-xs md:text-sm text-stone-400 mt-1 max-w-md mx-auto">
            Tentukan jalan takdir pahlawanmu sebelum melangkah ke dunia Eldoria
          </p>
        </div>

        {/* Class Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {classes.map((cls) => {
            const isSelected = selectedClass === cls.id;
            return (
              <div
                key={cls.id}
                onClick={() => {
                  soundManager.playChestOpen();
                  onSelectClass(cls.id);
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/30 scale-[1.02] shadow-xl'
                    : 'border-stone-800 bg-stone-900/50 hover:bg-stone-900/80 hover:border-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">{cls.icon}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full">
                        Terpilih
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-stone-100">{cls.name}</h3>
                  <div className="text-[11px] font-semibold text-amber-400/90 mb-2">
                    {cls.subtitle}
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed mb-3">
                    {cls.desc}
                  </p>
                </div>

                <div className="border-t border-stone-800/80 pt-2.5 text-[11px] space-y-1 text-stone-400">
                  <div className="flex justify-between">
                    <span>Darah (HP):</span>
                    <span className="font-semibold text-stone-200">{cls.stats.hp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Keahlian:</span>
                    <span className="font-semibold text-stone-200">{cls.stats.atk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kecepatan:</span>
                    <span className="font-semibold text-stone-200">{cls.stats.spd}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Start Game Action */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              soundManager.playLevelUp();
              soundManager.toggleAmbientMusic(true);
              onStartGame();
            }}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-sm md:text-base shadow-2xl cursor-pointer transition transform hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-stone-950" />
            <span>Mulai Petualangan 3D</span>
          </button>
        </div>
      </div>
    </div>
  );
};
