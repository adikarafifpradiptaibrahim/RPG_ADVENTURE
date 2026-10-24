import React, { useState, useEffect } from 'react';
import { PlayerStats } from '../types/game';

export interface SkillBarProps {
  stats: PlayerStats;
  hunterWeaponMode?: 'dagger' | 'bow';
  onPerformAttack: () => void;
  onCastSkill: (slot: 1 | 2 | 3) => void;
  onJump: () => void;
  onSwitchHunterWeapon?: () => void;
}

export const SkillBar: React.FC<SkillBarProps> = ({
  stats,
  hunterWeaponMode = 'dagger',
  onPerformAttack,
  onCastSkill,
  onJump,
  onSwitchHunterWeapon,
}) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || ('ontouchstart' in window);
  });

  useEffect(() => {
    const handleCheckMobile = () => {
      setIsMobile(window.innerWidth <= 768 || ('ontouchstart' in window));
    };
    handleCheckMobile();
    window.addEventListener('resize', handleCheckMobile);
    return () => window.removeEventListener('resize', handleCheckMobile);
  }, []);

  const getClassSkills = () => {
    switch (stats.characterClass) {
      case 'warrior':
        return {
          basic: { label: 'Tebas 360°', icon: '⚔️', hint: 'Klik / J' },
          skill1: { name: 'Pusaran', icon: '🌪️', cost: '15 MP', key: 'Q', color: 'border-amber-500/70 text-amber-300 bg-amber-950/40' },
          skill2: { name: 'Terjang', icon: '🛡️', cost: '15 Stm', key: 'E', color: 'border-yellow-500/70 text-yellow-300 bg-yellow-950/40' },
          skill3: { name: 'Benteng', icon: '🏰', cost: '25 MP', key: 'R', color: 'border-orange-500/70 text-orange-300 bg-orange-950/40' },
        };
      case 'mage':
        return {
          basic: { label: 'Arcane', icon: '🔮', hint: 'Klik / J' },
          skill1: { name: 'Supernova', icon: '💫', cost: '15 MP', key: 'Q', color: 'border-purple-500/70 text-purple-300 bg-purple-950/40' },
          skill2: { name: 'Blink', icon: '🌌', cost: '15 Stm', key: 'E', color: 'border-cyan-500/70 text-cyan-300 bg-cyan-950/40' },
          skill3: { name: 'Cahaya', icon: '✨', cost: '25 MP', key: 'R', color: 'border-blue-500/70 text-blue-300 bg-blue-950/40' },
        };
      case 'rogue':
        if (hunterWeaponMode === 'bow') {
          return {
            basic: { label: 'Panah', icon: '🏹', hint: 'Klik / J' },
            skill1: { name: 'Badai Panah', icon: '🎯', cost: '15 MP', key: 'Q', color: 'border-emerald-500/70 text-emerald-300 bg-emerald-950/40' },
            skill2: { name: 'Akrobatik', icon: '🦅', cost: '15 Stm', key: 'E', color: 'border-teal-500/70 text-teal-300 bg-teal-950/40' },
            skill3: { name: 'Panah Racun', icon: '💣', cost: '25 MP', key: 'R', color: 'border-green-500/70 text-green-300 bg-green-950/40' },
          };
        } else {
          return {
            basic: { label: 'Belati 360°', icon: '🗡️', hint: 'Klik / J' },
            skill1: { name: '1000 Belati', icon: '⚡', cost: '15 MP', key: 'Q', color: 'border-emerald-500/70 text-emerald-300 bg-emerald-950/40' },
            skill2: { name: 'Siluman', icon: '💨', cost: '15 Stm', key: 'E', color: 'border-teal-500/70 text-teal-300 bg-teal-950/40' },
            skill3: { name: 'Bom Asap', icon: '🧪', cost: '25 MP', key: 'R', color: 'border-green-500/70 text-green-300 bg-green-950/40' },
          };
        }
    }
  };

  const classSkills = getClassSkills();

  return (
    <div
      id="hud-action-cluster"
      className={`hud-action-cluster touch-control-layer select-none ${
        isMobile ? 'hud-action-cluster-mobile' : 'hud-action-cluster-desktop'
      }`}
    >
      {/* Hunter Weapon Switcher (Belati <-> Busur) */}
      {stats.characterClass === 'rogue' && onSwitchHunterWeapon && (
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSwitchHunterWeapon();
          }}
          onClick={onSwitchHunterWeapon}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="skill-btn skill-btn-switch touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950 to-stone-950 hover:from-emerald-900 hover:to-stone-900 text-emerald-300 border border-emerald-500/80 shadow cursor-pointer active:scale-90 transition-all select-none"
          title={`Ganti Senjata: ${hunterWeaponMode === 'bow' ? 'Belati' : 'Busur'} (X)`}
        >
          <span className="text-xs sm:text-sm md:text-base">{hunterWeaponMode === 'bow' ? '🏹' : '🗡️'}</span>
          <span className="hidden md:inline text-[8px] font-bold text-emerald-200 line-clamp-1">
            {hunterWeaponMode === 'bow' ? 'Busur' : 'Belati'}
          </span>
          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-emerald-400">
            X
          </span>
        </button>
      )}

      {/* Main Attack Button (Arcane / Tebas / Panah - Largest in Bottom-Right Corner on Mobile) */}
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPerformAttack();
        }}
        onClick={onPerformAttack}
        style={{ touchAction: 'none', userSelect: 'none' }}
        className="skill-btn skill-btn-attack touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-amber-600 via-stone-800 to-stone-950 hover:from-amber-500 hover:to-stone-900 text-stone-100 border-2 border-amber-400/90 shadow-2xl cursor-pointer active:scale-90 transition-all select-none"
        title={`${classSkills.basic.label} (Klik Kiri / J)`}
      >
        <span className="text-xl sm:text-2xl md:text-xl drop-shadow">{classSkills.basic.icon}</span>
        <span className="hidden md:inline text-[8px] font-bold text-stone-300 line-clamp-1">{classSkills.basic.label}</span>
        <span className="absolute -top-1 -right-1 bg-amber-600 text-stone-950 font-black text-[7px] md:text-[7px] font-mono px-1 rounded-full border border-amber-300">
          J
        </span>
      </button>

      {/* Skill 1 (Supernova / Pusaran / 1000 Belati) */}
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCastSkill(1);
        }}
        onClick={() => onCastSkill(1)}
        style={{ touchAction: 'none', userSelect: 'none' }}
        className={`skill-btn skill-btn-1 touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 hover:brightness-110 border shadow-lg cursor-pointer active:scale-90 transition-all select-none ${classSkills.skill1.color}`}
        title={`${classSkills.skill1.name} (Q)`}
      >
        <span className="text-sm sm:text-base md:text-base">{classSkills.skill1.icon}</span>
        <span className="hidden md:inline text-[8px] font-bold line-clamp-1">{classSkills.skill1.name}</span>
        <span className="absolute -top-1 -right-1 bg-stone-800 text-white text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-stone-600">
          {classSkills.skill1.key}
        </span>
        <span className="hidden md:inline absolute -bottom-1 text-[6px] text-stone-400 font-mono font-bold bg-stone-900/90 px-0.5 rounded">
          {classSkills.skill1.cost}
        </span>
      </button>

      {/* Skill 2 (Blink / Terjang / Siluman) */}
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCastSkill(2);
        }}
        onClick={() => onCastSkill(2)}
        style={{ touchAction: 'none', userSelect: 'none' }}
        className={`skill-btn skill-btn-2 touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 hover:brightness-110 border shadow-lg cursor-pointer active:scale-90 transition-all select-none ${classSkills.skill2.color}`}
        title={`${classSkills.skill2.name} (E)`}
      >
        <span className="text-sm sm:text-base md:text-base">{classSkills.skill2.icon}</span>
        <span className="hidden md:inline text-[8px] font-bold line-clamp-1">{classSkills.skill2.name}</span>
        <span className="absolute -top-1 -right-1 bg-stone-800 text-white text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-stone-600">
          {classSkills.skill2.key}
        </span>
        <span className="hidden md:inline absolute -bottom-1 text-[6px] text-stone-400 font-mono font-bold bg-stone-900/90 px-0.5 rounded">
          {classSkills.skill2.cost}
        </span>
      </button>

      {/* Skill 3 (Cahaya / Benteng / Bom Asap) */}
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCastSkill(3);
        }}
        onClick={() => onCastSkill(3)}
        style={{ touchAction: 'none', userSelect: 'none' }}
        className={`skill-btn skill-btn-3 touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 hover:brightness-110 border shadow-lg cursor-pointer active:scale-90 transition-all select-none ${classSkills.skill3.color}`}
        title={`${classSkills.skill3.name} (R)`}
      >
        <span className="text-sm sm:text-base md:text-base">{classSkills.skill3.icon}</span>
        <span className="hidden md:inline text-[8px] font-bold line-clamp-1">{classSkills.skill3.name}</span>
        <span className="absolute -top-1 -right-1 bg-stone-800 text-white text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-stone-600">
          {classSkills.skill3.key}
        </span>
        <span className="hidden md:inline absolute -bottom-1 text-[6px] text-stone-400 font-mono font-bold bg-stone-900/90 px-0.5 rounded">
          {classSkills.skill3.cost}
        </span>
      </button>

      {/* Jump / Dodge (Spasi) */}
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onJump();
        }}
        onClick={onJump}
        style={{ touchAction: 'none', userSelect: 'none' }}
        className="skill-btn skill-btn-jump touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 text-stone-200 border border-stone-600 shadow-lg cursor-pointer active:scale-90 transition-all select-none"
        title="Lompat / Menghindar (Spasi)"
      >
        <span className="text-sm sm:text-base md:text-base">🦘</span>
        <span className="hidden md:inline text-[8px] font-bold text-stone-400">Lompat</span>
        <span className="absolute -top-1 -right-1 bg-stone-700 text-stone-300 text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-stone-500">
          Spasi
        </span>
      </button>
    </div>
  );
};

export default SkillBar;
