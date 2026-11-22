import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats } from '../types/game';
import { SKILL_COOLDOWNS } from '../game/skills';

// TODO: Kembalikan cooldown normal setelah pengujian selesai (semua skill cooldown diset ke 0 untuk stress-testing)

export interface SkillBarProps {
  stats: PlayerStats;
  hunterWeaponMode?: 'dagger' | 'bow';
  onPerformAttack: () => void;
  onAttackStart?: () => void;
  onAttackEnd?: () => void;
  onCastSkill: (slot: 1 | 2 | 3 | 4) => void;
  onAimSkillStart?: (slot: 1 | 2 | 3 | 4) => void;
  onAimSkillMove?: (slot: 1 | 2 | 3 | 4, delta: { x: number; y: number }, aimAngleRad: number) => void;
  onAimSkillEnd?: (slot: 1 | 2 | 3 | 4, isCancelled: boolean) => void;
  onJump: () => void;
  onDash?: () => void;
  onSwitchHunterWeapon?: () => void;
}

export const SkillBar: React.FC<SkillBarProps> = ({
  stats,
  hunterWeaponMode = 'dagger',
  onPerformAttack,
  onAttackStart,
  onAttackEnd,
  onCastSkill,
  onAimSkillStart,
  onAimSkillMove,
  onAimSkillEnd,
  onJump,
  onDash,
  onSwitchHunterWeapon,
}) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || ('ontouchstart' in window);
  });

  // Mobile MOBA Drag-to-Aim & Cancel state for Mage Glacial Barrage (Slot 1)
  const [isAimingGlacial, setIsAimingGlacial] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isOverCancel, setIsOverCancel] = useState(false);
  const touchIdRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cancelZoneRef = useRef<HTMLDivElement | null>(null);

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
          basic: { label: 'Tebas / Charge', icon: '⚔️', hint: 'Klik / Tahan / J' },
          skill1: { name: 'Triple Crescent', icon: '🌙', cost: '20 Aura', key: 'Q', color: 'border-amber-500/70 text-amber-300 bg-amber-950/40' },
          skill2: { name: 'Cataclysmic Leap', icon: '💥', cost: '30 Aura', key: 'F', color: 'border-yellow-500/70 text-yellow-300 bg-yellow-950/40' },
          skill3: { name: 'Aegis Retribution', icon: '🛡️', cost: '25 Au/15 St', key: 'R', color: 'border-orange-500/70 text-orange-300 bg-orange-950/40' },
        };
      case 'mage':
        return {
          basic: { label: 'Arcane Beam', icon: '🔮', hint: 'Klik / J' },
          skill1: { name: 'Glacial Barrage', icon: '💠', cost: '18 MP', key: 'Q', color: 'border-sky-400/80 text-sky-200 bg-sky-950/50 shadow-sky-500/40' },
          skill2: { name: 'Arcane Blink', icon: '🌌', cost: '15 Stm', key: 'E', color: 'border-cyan-500/70 text-cyan-300 bg-cyan-950/40' },
          skill3: { name: 'Cahaya Suci', icon: '✨', cost: '25 MP', key: 'R', color: 'border-blue-500/70 text-blue-300 bg-blue-950/40' },
          skill4: { name: 'Celestial Apocalypse', icon: '☄️', cost: '45 MP', key: 'F', color: 'border-2 border-amber-400/90 text-amber-200 bg-gradient-to-b from-purple-900/90 via-purple-950/90 to-amber-950/80 shadow-purple-500/50 ring-1 ring-purple-400/60' },
        };
      case 'rogue':
        if (hunterWeaponMode === 'bow') {
          return {
            basic: { label: 'Tarik Busur', icon: '🏹', hint: 'Tahan / Tap' },
            skill1: { name: 'Skyward Volley', icon: '🏹', cost: '15 MP', key: 'Q', color: 'border-emerald-500/70 text-emerald-300 bg-emerald-950/40' },
            skill2: { name: 'Gale Vault', icon: '🦅', cost: '15 Stm', key: 'E', color: 'border-teal-500/70 text-teal-300 bg-teal-950/40' },
            skill3: { name: 'Panah Racun', icon: '💣', cost: '25 MP', key: 'R', color: 'border-green-500/70 text-green-300 bg-green-950/40' },
            skill4: { name: 'Ultimate', icon: '🦅', cost: 'TBD', key: 'F', color: 'border-emerald-500/80 text-emerald-200 bg-emerald-950/60 shadow-emerald-500/30' },
          };
        } else {
          return {
            basic: { label: 'Belati 360°', icon: '🗡️', hint: 'Klik / J' },
            skill1: { name: '1000 Belati', icon: '⚡', cost: '15 MP', key: 'Q', color: 'border-emerald-500/70 text-emerald-300 bg-emerald-950/40' },
            skill2: { name: 'Shadow Step', icon: '💨', cost: '15 Stm', key: 'E', color: 'border-teal-500/70 text-teal-300 bg-teal-950/40' },
            skill3: { name: 'Bom Asap', icon: '🧪', cost: '25 MP', key: 'R', color: 'border-green-500/70 text-green-300 bg-green-950/40' },
            skill4: { name: 'Ultimate', icon: '🗡️', cost: 'TBD', key: 'F', color: 'border-emerald-500/80 text-emerald-200 bg-emerald-950/60 shadow-emerald-500/30' },
          };
        }
    }
  };

  const classSkills = getClassSkills();
  const isAimableSkill1 =
    stats.characterClass === 'mage' ||
    (stats.characterClass === 'rogue' && hunterWeaponMode === 'bow');

  return (
    <div
      id="hud-action-cluster"
      className={`hud-action-cluster touch-control-layer select-none ${
        isMobile ? 'hud-action-cluster-mobile' : 'hud-action-cluster-desktop'
      }`}
    >
      {/* MOBA Cancel Zone (Muncul saat jari menahan skill Glacial Barrage di mobile) */}
      {isAimingGlacial && (
        <div
          id="moba-cancel-zone"
          ref={cancelZoneRef}
          className={`fixed top-12 right-6 sm:top-16 sm:right-12 z-50 flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 transition-all duration-150 pointer-events-none select-none ${
            isOverCancel
              ? 'bg-red-600/95 border-white text-white scale-125 shadow-[0_0_35px_#ef4444] animate-pulse ring-4 ring-red-400'
              : 'bg-red-950/85 border-red-500/80 text-red-200 scale-100 shadow-xl shadow-red-950/80'
          }`}
        >
          <span className="text-2xl sm:text-3xl font-black">✕</span>
          <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase mt-0.5">
            {isOverCancel ? 'Lepas Batal' : 'Batal'}
          </span>
          <span className="text-[7px] text-red-300 font-mono mt-0.5">
            {isOverCancel ? 'BATALKAN SKILL' : 'Geser ke sini'}
          </span>
        </div>
      )}

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
        onMouseDown={() => {
          if (onAttackStart) onAttackStart();
        }}
        onMouseUp={() => {
          if (onAttackEnd) onAttackEnd();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onAttackStart) onAttackStart();
          else onPerformAttack();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onAttackEnd) onAttackEnd();
        }}
        onClick={() => {
          if (!onAttackStart && !onAttackEnd) onPerformAttack();
        }}
        style={{ touchAction: 'none', userSelect: 'none' }}
        className="skill-btn skill-btn-attack touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-amber-600 via-stone-800 to-stone-950 hover:from-amber-500 hover:to-stone-900 text-stone-100 border-2 border-amber-400/90 shadow-2xl cursor-pointer active:scale-90 transition-all select-none"
        title={`${classSkills.basic.label} (${stats.characterClass === 'mage' ? 'Klik Kiri / J' : 'Klik Kiri / Tahan / J'})`}
      >
        <span className="text-xl sm:text-2xl md:text-xl drop-shadow">{classSkills.basic.icon}</span>
        <span className="hidden md:inline text-[8px] font-bold text-stone-300 line-clamp-1">{classSkills.basic.label}</span>
        <span className="absolute -top-1 -right-1 bg-amber-600 text-stone-950 font-black text-[7px] md:text-[7px] font-mono px-1 rounded-full border border-amber-300">
          {stats.characterClass === 'mage' ? 'Klik / J' : 'J'}
        </span>
      </button>

      {/* Skill 1 (Glacial Barrage / Skyward Volley / Triple Crescent / 1000 Belati) */}
      <button
        type="button"
        onMouseDown={(e) => {
          if (isAimableSkill1 && onAimSkillStart) {
            if (e.button === 0) onAimSkillStart(1);
          }
        }}
        onMouseUp={(e) => {
          if (isAimableSkill1 && onAimSkillEnd) {
            if (e.button === 0) onAimSkillEnd(1, false);
          }
        }}
        onContextMenu={(e) => {
          if (isAimableSkill1) {
            e.preventDefault();
            e.stopPropagation();
            onAimSkillEnd?.(1, true);
          }
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isAimableSkill1 && onAimSkillStart) {
            const t = e.changedTouches[0];
            touchIdRef.current = t.identifier;
            touchStartRef.current = { x: t.clientX, y: t.clientY };
            setKnobPos({ x: 0, y: 0 });
            setIsOverCancel(false);
            setIsAimingGlacial(true);
            onAimSkillStart(1);
          } else {
            onCastSkill(1);
          }
        }}
        onTouchMove={(e) => {
          if (!isAimableSkill1 || !isAimingGlacial) return;
          e.preventDefault();
          e.stopPropagation();
          let curTouch: React.Touch | null = null;
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchIdRef.current) {
              curTouch = e.changedTouches[i];
              break;
            }
          }
          if (!curTouch) return;

          const dx = curTouch.clientX - touchStartRef.current.x;
          const dy = curTouch.clientY - touchStartRef.current.y;
          const dist = Math.hypot(dx, dy);
          const maxR = 36;
          const clamped = Math.min(dist, maxR);
          const kx = dist > 0 ? (dx / dist) * clamped : 0;
          const ky = dist > 0 ? (dy / dist) * clamped : 0;
          setKnobPos({ x: kx, y: ky });

          // Cek apakah jari masuk ke radius tombol "✕ Batal"
          const cancelEl = document.getElementById('moba-cancel-zone');
          if (cancelEl) {
            const rect = cancelEl.getBoundingClientRect();
            const inCancel =
              curTouch.clientX >= rect.left - 20 &&
              curTouch.clientX <= rect.right + 20 &&
              curTouch.clientY >= rect.top - 20 &&
              curTouch.clientY <= rect.bottom + 20;
            setIsOverCancel(inCancel);
          }

          if (!isOverCancel) {
            const aimAngle = Math.atan2(dx, -dy);
            onAimSkillMove?.(1, { x: dx, y: dy }, aimAngle);
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isAimableSkill1 && isAimingGlacial) {
            if (isOverCancel) {
              onAimSkillEnd?.(1, true); // Dibatalkan tanpa membuang MP & cooldown
            } else {
              onAimSkillEnd?.(1, false); // Ditembakkan
            }
            setIsAimingGlacial(false);
            setKnobPos({ x: 0, y: 0 });
            setIsOverCancel(false);
            touchIdRef.current = null;
          } else if (!isAimableSkill1) {
            onCastSkill(1);
          }
        }}
        onTouchCancel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isAimableSkill1 && isAimingGlacial) {
            onAimSkillEnd?.(1, true);
            setIsAimingGlacial(false);
            setKnobPos({ x: 0, y: 0 });
            setIsOverCancel(false);
            touchIdRef.current = null;
          }
        }}
        onClick={() => {
          if (!isAimableSkill1) {
            onCastSkill(1);
          }
        }}
        style={{ touchAction: 'none', userSelect: 'none' }}
        className={`skill-btn skill-btn-1 touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 hover:brightness-110 border shadow-lg cursor-pointer active:scale-90 transition-all select-none ${classSkills.skill1.color} ${
          isAimingGlacial ? (stats.characterClass === 'mage' ? 'ring-2 ring-sky-400 scale-105' : 'ring-2 ring-emerald-400 scale-105') : ''
        }`}
        title={`${classSkills.skill1.name} (${classSkills.skill1.key})`}
      >
        {isAimingGlacial ? (
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            {/* Outer Mini Analog Ring */}
            <div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
                isOverCancel
                  ? 'border-red-500 bg-red-950/80 shadow-[0_0_15px_#ef4444]'
                  : stats.characterClass === 'mage'
                  ? 'border-sky-400 bg-sky-950/80 shadow-[0_0_15px_#38bdf8]'
                  : 'border-emerald-400 bg-emerald-950/80 shadow-[0_0_15px_#10b981]'
              }`}
            >
              {/* Draggable knob */}
              <div
                style={{
                  transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                  transition: knobPos.x === 0 && knobPos.y === 0 ? 'transform 0.15s ease' : 'none',
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border ${
                  isOverCancel
                    ? 'bg-red-500 border-white text-white'
                    : stats.characterClass === 'mage'
                    ? 'bg-sky-400 border-sky-200 text-stone-950'
                    : 'bg-emerald-400 border-emerald-200 text-stone-950'
                }`}
              >
                <span className="text-[10px]">{stats.characterClass === 'mage' ? '💠' : '🏹'}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <span className="text-sm sm:text-base md:text-base">{classSkills.skill1.icon}</span>
            <span className="hidden md:inline text-[8px] font-bold line-clamp-1">{classSkills.skill1.name}</span>
            <span className="absolute -top-1 -right-1 bg-stone-800 text-white text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-stone-600">
              {classSkills.skill1.key}
            </span>
            <span className="hidden md:inline absolute -bottom-1 text-[6px] text-stone-400 font-mono font-bold bg-stone-900/90 px-0.5 rounded">
              {classSkills.skill1.cost}
            </span>
          </>
        )}
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
        title={`${classSkills.skill2.name} (${classSkills.skill2.key})`}
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

      {/* Slot 4 (Ultimate) untuk Mage atau Rogue, atau Dash Button untuk Warrior */}
      {stats.characterClass === 'mage' ? (
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCastSkill(4);
          }}
          onClick={() => onCastSkill(4)}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="skill-btn skill-btn-4 touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-purple-900/90 via-purple-950/90 to-amber-950/80 text-amber-200 border-2 border-amber-400/90 ring-1 ring-purple-400/60 shadow-lg shadow-purple-900/50 cursor-pointer active:scale-90 transition-all select-none"
          title="Celestial Apocalypse (F - Ultimate)"
        >
          <span className="text-sm sm:text-base md:text-base animate-pulse">☄️</span>
          <span className="hidden md:inline text-[8px] font-bold text-amber-300 line-clamp-1">
            Apocalypse
          </span>
          <span className="absolute -top-1 -right-1 bg-amber-600 text-stone-950 font-black text-[6px] md:text-[7px] font-mono px-1 rounded-full border border-amber-300 shadow">
            F
          </span>
          <span className="hidden md:inline absolute -bottom-1 text-[6px] text-amber-300 font-mono font-bold bg-purple-950/90 px-0.5 rounded border border-amber-500/40">
            45 MP
          </span>
        </button>
      ) : stats.characterClass === 'rogue' ? (
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCastSkill(4);
          }}
          onClick={() => onCastSkill(4)}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="skill-btn skill-btn-4 touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-emerald-900/90 via-emerald-950/90 to-teal-950/80 text-emerald-200 border-2 border-emerald-400/90 ring-1 ring-emerald-400/60 shadow-lg shadow-emerald-900/50 cursor-pointer active:scale-90 transition-all select-none"
          title={`${classSkills.skill4?.name || 'Ultimate'} (F - Ultimate)`}
        >
          <span className="text-sm sm:text-base md:text-base">{classSkills.skill4?.icon || '🏹'}</span>
          <span className="hidden md:inline text-[8px] font-bold text-emerald-300 line-clamp-1">
            {classSkills.skill4?.name || 'Ultimate'}
          </span>
          <span className="absolute -top-1 -right-1 bg-emerald-600 text-stone-950 font-black text-[6px] md:text-[7px] font-mono px-1 rounded-full border border-emerald-300 shadow">
            F
          </span>
          <span className="hidden md:inline absolute -bottom-1 text-[6px] text-emerald-300 font-mono font-bold bg-emerald-950/90 px-0.5 rounded border border-emerald-500/40">
            {classSkills.skill4?.cost || 'TBD'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onDash) onDash();
          }}
          onClick={() => {
            if (onDash) onDash();
          }}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="skill-btn skill-btn-dash touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 shadow-lg cursor-pointer active:scale-90 transition-all select-none text-amber-200 border border-amber-600/70"
          title="Shield Dash [Shift]"
        >
          <span className="text-sm sm:text-base md:text-base">🛡️</span>
          <span className="hidden md:inline text-[8px] font-bold text-amber-300">
            Dash
          </span>
          <span className="absolute -top-1 -right-1 bg-amber-700 text-white text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-amber-500">
            Shift
          </span>
        </button>
      )}

      {/* Jump Button (Spasi) */}
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
        title="Lompat [Spasi]"
      >
        <span className="text-sm sm:text-base md:text-base">🦘</span>
        <span className="hidden md:inline text-[8px] font-bold text-stone-400">
          Lompat
        </span>
        <span className="absolute -top-1 -right-1 bg-stone-700 text-stone-300 text-[6px] md:text-[7px] font-mono px-0.5 rounded border border-stone-500">
          Spasi
        </span>
      </button>
    </div>
  );
};

export const ActionBar = SkillBar;
export default SkillBar;
