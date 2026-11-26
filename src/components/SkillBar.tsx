import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats } from '../types/game';
import {
  HudCooldownSlotName,
  HudSkillCooldownMap,
  HudSkillCooldownSlotState,
} from '../game/skillCooldownManager';

export interface SkillBarProps {
  stats: PlayerStats;
  hunterWeaponMode?: 'dagger' | 'bow';
  isWeaponDrawn?: boolean;
  stealthActive?: boolean;
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
  onToggleWeaponDrawn?: () => void;
  getSkillCooldowns?: () => HudSkillCooldownMap | null;
  subscribeSkillCooldowns?: (listener: () => void) => () => void;
  getStealthState?: () => { active: boolean; remaining: number } | null;
}

interface SlotDomRefs {
  button: HTMLButtonElement | null;
  curtain: HTMLDivElement | null;
  centerText: HTMLSpanElement | null;
  rechargeText: HTMLSpanElement | null;
  chargeBadge: HTMLSpanElement | null;
}

function formatCooldownText(rem: number): string {
  if (rem <= 0) return '';
  if (rem >= 1.0) return String(Math.ceil(rem));
  return rem.toFixed(1);
}

export const SkillBar: React.FC<SkillBarProps> = ({
  stats,
  hunterWeaponMode = 'dagger',
  isWeaponDrawn = false,
  stealthActive = false,
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
  onToggleWeaponDrawn,
  getSkillCooldowns,
  subscribeSkillCooldowns,
  getStealthState,
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

  // 60fps direct-DOM refs for Swipe-Down cooldown overlays, countdown texts, charge counters, & stealth timer
  const slotRefs = useRef<Record<HudCooldownSlotName, SlotDomRefs>>({
    skill1: { button: null, curtain: null, centerText: null, rechargeText: null, chargeBadge: null },
    skill2: { button: null, curtain: null, centerText: null, rechargeText: null, chargeBadge: null },
    skill3: { button: null, curtain: null, centerText: null, rechargeText: null, chargeBadge: null },
    skill4: { button: null, curtain: null, centerText: null, rechargeText: null, chargeBadge: null },
    dash: { button: null, curtain: null, centerText: null, rechargeText: null, chargeBadge: null },
  });
  const stealthPillRef = useRef<HTMLDivElement | null>(null);
  const stealthTextRef = useRef<HTMLSpanElement | null>(null);
  const stealthBarRef = useRef<HTMLDivElement | null>(null);
  const prevCenterText = useRef<Record<string, string>>({});
  const prevRechargeText = useRef<Record<string, string>>({});
  const prevChargeText = useRef<Record<string, string>>({});

  useEffect(() => {
    const handleCheckMobile = () => {
      setIsMobile(window.innerWidth <= 768 || ('ontouchstart' in window));
    };
    handleCheckMobile();
    window.addEventListener('resize', handleCheckMobile);
    return () => window.removeEventListener('resize', handleCheckMobile);
  }, []);

  // 60fps Swipe-Down Cooldown & Stealth Banner loop (zero React re-renders per frame)
  useEffect(() => {
    let rafId = 0;
    let isLooping = false;

    const applySlotVisuals = (slotName: HudCooldownSlotName, state: HudSkillCooldownSlotState | undefined) => {
      const refs = slotRefs.current[slotName];
      if (!refs) return;

      const { button, curtain, centerText, rechargeText, chargeBadge } = refs;

      // 1. Charge Counter Badge (Top-Right, only on multi-charge skills like Knight Q 3x & Assassin Dash 2x)
      if (chargeBadge) {
        if (state && state.maxCharges > 1) {
          chargeBadge.style.display = 'flex';
          const cStr = String(state.charges);
          if (prevChargeText.current[slotName] !== cStr) {
            prevChargeText.current[slotName] = cStr;
            chargeBadge.textContent = cStr;
          }
          if (state.charges === 0) {
            chargeBadge.style.backgroundColor = '#7f1d1d';
            chargeBadge.style.borderColor = '#ef4444';
            chargeBadge.style.color = '#fecaca';
          } else if (state.charges < state.maxCharges) {
            chargeBadge.style.backgroundColor = '#78350f';
            chargeBadge.style.borderColor = '#fbbf24';
            chargeBadge.style.color = '#fef3c7';
          } else {
            chargeBadge.style.backgroundColor = '#064e3b';
            chargeBadge.style.borderColor = '#34d399';
            chargeBadge.style.color = '#d1fae5';
          }
        } else {
          chargeBadge.style.display = 'none';
        }
      }

      if (!state) {
        if (curtain) curtain.style.height = '0%';
        if (centerText) centerText.style.display = 'none';
        if (rechargeText) rechargeText.style.display = 'none';
        return;
      }

      const isFullyDepletedOnCd = state.charges === 0 && state.remaining > 0;
      const isPartialRecharging = state.maxCharges > 1 && state.charges > 0 && state.charges < state.maxCharges && state.remaining > 0;

      // 2. Swipe-Down Curtain Overlay (bottom-anchored shrinking downward from 100% -> 0%)
      if (curtain) {
        if (isFullyDepletedOnCd) {
          const ratio = Math.min(1, Math.max(0, state.remaining / Math.max(0.01, state.maxCooldown)));
          curtain.style.height = `${(ratio * 100).toFixed(2)}%`;
          curtain.style.backgroundColor = 'rgba(0, 0, 0, 0.72)';
          curtain.style.borderTop = '1.5px solid rgba(255, 255, 255, 0.65)';
          curtain.style.opacity = '1';
        } else if (isPartialRecharging) {
          const ratio = Math.min(1, Math.max(0, state.remaining / Math.max(0.01, state.maxCooldown)));
          curtain.style.height = `${(ratio * 100).toFixed(2)}%`;
          curtain.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
          curtain.style.borderTop = '1.5px solid rgba(103, 232, 249, 0.55)';
          curtain.style.opacity = '1';
        } else {
          curtain.style.height = '0%';
          curtain.style.borderTop = 'none';
          curtain.style.opacity = '0';
        }
      }

      // 3. Center Countdown Timer (when normal CD or charges === 0)
      if (centerText) {
        if (isFullyDepletedOnCd) {
          const formatted = formatCooldownText(state.remaining);
          centerText.style.display = 'flex';
          if (prevCenterText.current[slotName] !== formatted) {
            prevCenterText.current[slotName] = formatted;
            centerText.textContent = formatted;
          }
        } else {
          centerText.style.display = 'none';
          prevCenterText.current[slotName] = '';
        }
      }

      // 4. Bottom-Left Partial Charge Recharge Countdown (0 < charges < maxCharges)
      if (rechargeText) {
        if (isPartialRecharging) {
          const formatted = formatCooldownText(state.remaining);
          rechargeText.style.display = 'block';
          if (prevRechargeText.current[slotName] !== formatted) {
            prevRechargeText.current[slotName] = formatted;
            rechargeText.textContent = formatted;
          }
        } else {
          rechargeText.style.display = 'none';
          prevRechargeText.current[slotName] = '';
        }
      }

      // 5. Button Dimmed State & Ready Flash Ring (0.25s)
      if (button) {
        if (isFullyDepletedOnCd) {
          button.style.filter = 'brightness(0.75) saturate(0.75)';
        } else if (state.readyFlash) {
          button.style.filter = 'brightness(1.35)';
        } else {
          button.style.filter = '';
        }

        if (state.readyFlash) {
          button.style.boxShadow = '0 0 16px rgba(103, 232, 249, 0.95), inset 0 0 10px rgba(255, 255, 255, 0.5)';
        } else {
          button.style.boxShadow = '';
        }
      }
    };

    const tick = () => {
      const cdMap = getSkillCooldowns?.() || null;
      const slots: HudCooldownSlotName[] = ['skill1', 'skill2', 'skill3', 'skill4', 'dash'];
      let keepRunning = false;

      for (const s of slots) {
        const st = cdMap?.[s];
        applySlotVisuals(s, st);
        if (st && (st.remaining > 0 || st.internalRemaining > 0 || st.charges < st.maxCharges || st.readyFlash)) {
          keepRunning = true;
        }
      }

      // Update Stealth indicator above hotbar cleanly at 60fps
      const stealth = getStealthState?.();
      if (stealthPillRef.current && stealthTextRef.current && stealthBarRef.current) {
        if (stealth && stealth.active && stealth.remaining > 0) {
          stealthPillRef.current.style.display = 'flex';
          stealthTextRef.current.textContent = `STEALTH (${stealth.remaining.toFixed(1)}s)`;
          const pct = Math.min(100, Math.max(0, (stealth.remaining / 3.0) * 100));
          stealthBarRef.current.style.width = `${pct.toFixed(1)}%`;
          keepRunning = true;
        } else {
          stealthPillRef.current.style.display = 'none';
        }
      }

      if (keepRunning) {
        rafId = requestAnimationFrame(tick);
      } else {
        isLooping = false;
      }
    };

    const ensureLoop = () => {
      if (!isLooping) {
        isLooping = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    // Sinkronisasi awal saat class/weapon berubah & subscribe ke perubahan cooldown
    ensureLoop();
    const unsub = subscribeSkillCooldowns?.(() => {
      ensureLoop();
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      unsub?.();
    };
  }, [
    stats.characterClass,
    hunterWeaponMode,
    stealthActive,
    getSkillCooldowns,
    subscribeSkillCooldowns,
    getStealthState,
  ]);

  const getClassSkills = () => {
    switch (stats.characterClass) {
      case 'warrior':
        return {
          basic: { label: 'Tebas / Charge', icon: '⚔️', hint: 'Klik / Tahan / J' },
          skill1: { name: 'Triple Crescent', icon: '🌙', cost: '20 Aura', key: 'Q', color: 'border-amber-500/70 text-amber-300 bg-amber-950/40' },
          skill2: { name: 'Cataclysmic', icon: '💥', cost: '30 Aura', key: 'F', color: 'border-yellow-500/70 text-yellow-300 bg-yellow-950/40' },
          skill3: { name: 'Aegis Shield', icon: '🛡️', cost: '25 Au', key: 'R', color: 'border-orange-500/70 text-orange-300 bg-orange-950/40' },
        };
      case 'mage':
        return {
          basic: { label: 'Arcane Beam', icon: '🔮', hint: 'Klik / J' },
          skill1: { name: 'Glacial', icon: '💠', cost: '18 MP', key: 'Q', color: 'border-sky-400/80 text-sky-200 bg-sky-950/50 shadow-sky-500/40' },
          skill2: { name: 'Blink', icon: '🌌', cost: '15 Stm', key: 'E', color: 'border-cyan-500/70 text-cyan-300 bg-cyan-950/40' },
          skill3: { name: 'Cahaya Suci', icon: '✨', cost: '25 MP', key: 'R', color: 'border-blue-500/70 text-blue-300 bg-blue-950/40' },
          skill4: { name: 'Apocalypse', icon: '☄️', cost: '45 MP', key: 'F', color: 'border-2 border-amber-400/90 text-amber-200 bg-gradient-to-b from-purple-900/90 via-purple-950/90 to-amber-950/80 shadow-purple-500/50 ring-1 ring-purple-400/60' },
        };
      case 'rogue':
        if (hunterWeaponMode === 'bow') {
          return {
            basic: { label: 'Tarik Busur', icon: '🏹', hint: 'Klik / Tahan' },
            skill1: { name: 'Rajawali', icon: '🦅', cost: '20 MP', key: 'Q', color: 'border-cyan-400/80 text-cyan-200 bg-cyan-950/50 shadow-cyan-500/30' },
            skill2: { name: 'Bayangan', icon: '👥', cost: '12 Stm', key: 'E', color: 'border-cyan-500/75 text-cyan-200 bg-cyan-950/45' },
            skill3: { name: 'Bom Asap', icon: '💨', cost: '20 MP', key: 'R', color: 'border-slate-400/75 text-slate-200 bg-slate-900/70' },
            skill4: { name: 'Badai Panah', icon: '⛈️', cost: '45 MP', key: 'F', color: 'border-2 border-amber-400/90 text-amber-200 bg-gradient-to-b from-cyan-900/90 via-sky-950/90 to-amber-950/80 shadow-cyan-500/50 ring-1 ring-cyan-400/60' },
          };
        } else {
          return {
            basic: { label: 'Belati 360°', icon: '🗡️', hint: 'Klik / J' },
            skill1: { name: 'Tarian Belati', icon: '⚡', cost: '15 MP', key: 'Q', color: 'border-emerald-500/70 text-emerald-300 bg-emerald-950/40' },
            skill2: { name: 'Bayangan', icon: '👥', cost: '12 Stm', key: 'E', color: 'border-cyan-500/75 text-cyan-200 bg-cyan-950/45' },
            skill3: { name: 'Bom Asap', icon: '💨', cost: '20 MP', key: 'R', color: 'border-slate-400/75 text-slate-200 bg-slate-900/70' },
            skill4: { name: 'Eksekusi', icon: '🌙', cost: '0 MP', key: 'F', color: 'border-emerald-500/80 text-emerald-200 bg-emerald-950/60 shadow-emerald-500/30' },
          };
        }
    }
  };

  const classSkills = getClassSkills();
  const isAimableSkill1 =
    stats.characterClass === 'mage' ||
    (stats.characterClass === 'rogue' && hunterWeaponMode === 'bow');

  const renderSlotOverlays = (slotName: HudCooldownSlotName, isChargeSkill: boolean) => (
    <>
      {/* Swipe-Down Dark Cooldown Curtain */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-10">
        <div
          ref={(el) => {
            slotRefs.current[slotName].curtain = el;
          }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '0%', opacity: 0 }}
        />
      </div>

      {/* Centered Countdown Text */}
      <span
        ref={(el) => {
          slotRefs.current[slotName].centerText = el;
        }}
        style={{
          display: 'none',
          textShadow: '0 1px 3px #000, 0 0 6px #000, 0 0 10px rgba(0,0,0,0.9)',
        }}
        className="absolute inset-0 z-20 items-center justify-center font-mono text-sm sm:text-base font-black text-white pointer-events-none"
      />

      {/* Top-Right Charge Count Badge (only when maxCharges > 1) */}
      {isChargeSkill && (
        <span
          ref={(el) => {
            slotRefs.current[slotName].chargeBadge = el;
          }}
          style={{ display: 'flex' }}
          className="absolute -top-1.5 -right-1 z-30 min-w-[15px] h-[15px] items-center justify-center rounded-full border text-[9px] font-mono font-black leading-none px-1 shadow-md pointer-events-none"
        />
      )}

      {/* Bottom-Left Partial Charge Recharge Countdown */}
      {isChargeSkill && (
        <span
          ref={(el) => {
            slotRefs.current[slotName].rechargeText = el;
          }}
          style={{
            display: 'none',
            textShadow: '0 1px 2px #000',
          }}
          className="absolute bottom-0.5 left-0.5 z-30 rounded bg-stone-950/90 border border-cyan-400/50 px-1 py-[1px] text-[8px] font-mono font-bold text-cyan-200 leading-none pointer-events-none"
        />
      )}
    </>
  );

  const isSkill1Charge = stats.characterClass === 'warrior';
  const isSkill2Charge = stats.characterClass === 'rogue';

  return (
    <>
      {/* Stealth Active Pill Indicator above Hotbar */}
      <div
        ref={stealthPillRef}
        style={{ display: 'none' }}
        className="fixed bottom-[74px] md:bottom-[76px] left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none flex-col items-center gap-1 rounded-full border border-slate-400/70 bg-slate-950/90 px-3.5 py-1 shadow-[0_0_18px_rgba(148,163,184,0.45)] backdrop-blur-sm"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs">💨</span>
          <span
            ref={stealthTextRef}
            className="font-mono text-[11px] font-black tracking-wider text-slate-100"
          >
            STEALTH (3.0s)
          </span>
          <span className="text-[9px] font-bold text-cyan-300">+20% SPD</span>
        </div>
        <div className="w-32 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            ref={stealthBarRef}
            style={{ width: '100%' }}
            className="h-full bg-gradient-to-r from-slate-300 via-cyan-300 to-slate-200"
          />
        </div>
      </div>

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

        {/* Hunter Mode Toggle: Siaga vs Santai (X) & Switch Weapon Busur <-> Belati (T) */}
        {stats.characterClass === 'rogue' && onToggleWeaponDrawn && (
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWeaponDrawn();
            }}
            onClick={onToggleWeaponDrawn}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className={`skill-btn skill-btn-sheathe touch-control-btn group relative flex flex-col items-center justify-center border shadow cursor-pointer active:scale-90 transition-all select-none ${
              isWeaponDrawn
                ? 'bg-gradient-to-b from-cyan-950 to-stone-950 hover:from-cyan-900 text-cyan-300 border-cyan-400/80 shadow-cyan-500/20'
                : 'bg-gradient-to-b from-stone-800 to-stone-950 hover:from-stone-700 text-stone-300 border-stone-500/80'
            }`}
            title={`Tarik / Sarungkan Senjata (X) — Status: ${isWeaponDrawn ? 'Siaga (Senjata Terhunus)' : 'Santai (Tangan Kosong)'}`}
          >
            <span className="text-xs sm:text-sm md:text-base">{isWeaponDrawn ? '⚡' : '🕊️'}</span>
            <span className="hidden md:block text-[8px] font-bold truncate max-w-full px-0.5">
              {isWeaponDrawn ? 'Siaga' : 'Santai'}
            </span>
            <span className="absolute -top-1.5 -left-1 z-20 bg-stone-700 text-cyan-200 text-[7px] font-mono px-1 rounded border border-cyan-400/60">
              X
            </span>
          </button>
        )}
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
            title={`Ganti Senjata: ${hunterWeaponMode === 'bow' ? 'Belati' : 'Busur'} (T)`}
          >
            <span className="text-xs sm:text-sm md:text-base">{hunterWeaponMode === 'bow' ? '🏹' : '🗡️'}</span>
            <span className="hidden md:block text-[8px] font-bold text-emerald-200 truncate max-w-full px-0.5">
              {hunterWeaponMode === 'bow' ? 'Busur' : 'Belati'}
            </span>
            <span className="absolute -top-1.5 -left-1 z-20 bg-emerald-700 text-white text-[7px] font-mono px-1 rounded border border-emerald-400">
              T
            </span>
          </button>
        )}

        {/* Main Attack Button (0s Cooldown Across All Roles) */}
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
          <span className="hidden md:block text-[8px] font-bold text-stone-300 truncate max-w-full px-0.5">
            {classSkills.basic.label}
          </span>
          <span className="absolute -top-1.5 -left-1 z-20 bg-amber-600 text-stone-950 font-black text-[7px] font-mono px-1 rounded-full border border-amber-300">
            LMB
          </span>
        </button>

        {/* Skill 1 (Q: Knight 3-Charge Crescent / Mage Glacial / Hunter Dagger vs Bow) */}
        <button
          ref={(el) => {
            slotRefs.current.skill1.button = el;
          }}
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
                onAimSkillEnd?.(1, true);
              } else {
                onAimSkillEnd?.(1, false);
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
              <div
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isOverCancel
                    ? 'border-red-500 bg-red-950/80 shadow-[0_0_15px_#ef4444]'
                    : stats.characterClass === 'mage'
                    ? 'border-sky-400 bg-sky-950/80 shadow-[0_0_15px_#38bdf8]'
                    : 'border-emerald-400 bg-emerald-950/80 shadow-[0_0_15px_#10b981]'
                }`}
              >
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
              <span className="hidden md:block text-[8px] font-bold leading-tight truncate max-w-full px-0.5">
                {classSkills.skill1.name}
              </span>
              <span className="absolute -top-1.5 -left-1 z-20 bg-stone-800 text-white text-[7px] font-mono px-1 rounded border border-stone-600">
                {classSkills.skill1.key}
              </span>
              <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-stone-300 font-mono font-bold bg-stone-900/95 px-0.5 rounded">
                {classSkills.skill1.cost}
              </span>
            </>
          )}
          {renderSlotOverlays('skill1', isSkill1Charge)}
        </button>

        {/* Skill 2 (Mage Blink E / Knight Ultimate Cataclysmic F / Hunter Dual-Mode Shadow Decoy Dash E) */}
        <button
          ref={(el) => {
            slotRefs.current.skill2.button = el;
          }}
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
          <span className="hidden md:block text-[8px] font-bold truncate max-w-full px-0.5">
            {classSkills.skill2.name}
          </span>
          <span className="absolute -top-1.5 -left-1 z-20 bg-stone-800 text-white text-[7px] font-mono px-1 rounded border border-stone-600">
            {classSkills.skill2.key}
          </span>
          <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-stone-300 font-mono font-bold bg-stone-900/95 px-0.5 rounded">
            {classSkills.skill2.cost}
          </span>
          {renderSlotOverlays('skill2', isSkill2Charge)}
        </button>

        {/* Skill 3 (R: Cahaya Suci / Aegis / Hunter Dual-Mode Bom Asap Stealth 3s) */}
        <button
          ref={(el) => {
            slotRefs.current.skill3.button = el;
          }}
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
          <span className="hidden md:block text-[8px] font-bold truncate max-w-full px-0.5">
            {classSkills.skill3.name}
          </span>
          <span className="absolute -top-1.5 -left-1 z-20 bg-stone-800 text-white text-[7px] font-mono px-1 rounded border border-stone-600">
            {classSkills.skill3.key}
          </span>
          <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-stone-300 font-mono font-bold bg-stone-900/95 px-0.5 rounded">
            {classSkills.skill3.cost}
          </span>
          {renderSlotOverlays('skill3', false)}
        </button>

        {/* Slot 4 (Ultimate) untuk Mage/Rogue, atau Shield Dash untuk Knight */}
        {stats.characterClass === 'mage' ? (
          <button
            ref={(el) => {
              slotRefs.current.skill4.button = el;
            }}
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
            <span className="text-sm sm:text-base md:text-base">☄️</span>
            <span className="hidden md:block text-[8px] font-bold text-amber-300 truncate max-w-full px-0.5">
              Apocalypse
            </span>
            <span className="absolute -top-1.5 -left-1 z-20 bg-amber-600 text-stone-950 font-black text-[7px] font-mono px-1 rounded-full border border-amber-300 shadow">
              F
            </span>
            <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-amber-300 font-mono font-bold bg-purple-950/95 px-0.5 rounded border border-amber-500/40">
              45 MP
            </span>
            {renderSlotOverlays('skill4', false)}
          </button>
        ) : stats.characterClass === 'rogue' ? (
          <button
            ref={(el) => {
              slotRefs.current.skill4.button = el;
            }}
            type="button"
            onMouseDown={(e) => {
              if (hunterWeaponMode === 'bow' && onAimSkillStart && e.button === 0) {
                onAimSkillStart(4);
              }
            }}
            onMouseUp={(e) => {
              if (hunterWeaponMode === 'bow' && onAimSkillEnd && e.button === 0) {
                onAimSkillEnd(4, false);
              }
            }}
            onContextMenu={(e) => {
              if (hunterWeaponMode === 'bow' && onAimSkillEnd) {
                e.preventDefault();
                e.stopPropagation();
                onAimSkillEnd(4, true);
              }
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (hunterWeaponMode === 'bow' && onAimSkillStart) {
                onAimSkillStart(4);
              } else {
                onCastSkill(4);
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (hunterWeaponMode === 'bow' && onAimSkillEnd) {
                onAimSkillEnd(4, false);
              }
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (hunterWeaponMode === 'bow' && onAimSkillEnd) {
                onAimSkillEnd(4, true);
              }
            }}
            onClick={() => {
              if (hunterWeaponMode !== 'bow' || !onAimSkillStart) {
                onCastSkill(4);
              }
            }}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className={`skill-btn skill-btn-4 touch-control-btn group relative flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all select-none shadow-lg ${
              hunterWeaponMode === 'bow'
                ? 'bg-gradient-to-b from-cyan-900/90 via-sky-950/90 to-amber-950/80 text-amber-200 border-2 border-amber-400/90 ring-1 ring-cyan-400/70 shadow-cyan-500/40'
                : 'bg-gradient-to-b from-emerald-900/90 via-emerald-950/90 to-teal-950/80 text-emerald-200 border-2 border-emerald-400/90 ring-1 ring-emerald-400/60 shadow-emerald-900/50'
            }`}
            title={`${classSkills.skill4?.name || 'Ultimate'} (F - Ultimate)`}
          >
            <span className="text-sm sm:text-base md:text-base">
              {classSkills.skill4?.icon || '⛈️'}
            </span>
            <span
              className={`hidden md:block text-[8px] font-bold leading-tight truncate max-w-full px-0.5 ${
                hunterWeaponMode === 'bow' ? 'text-amber-200' : 'text-emerald-300'
              }`}
            >
              {classSkills.skill4?.name || 'Ultimate'}
            </span>
            <span
              className={`absolute -top-1.5 -left-1 z-20 font-black text-[7px] font-mono px-1 rounded-full border shadow ${
                hunterWeaponMode === 'bow'
                  ? 'bg-amber-500 text-stone-950 border-amber-200'
                  : 'bg-emerald-600 text-stone-950 border-emerald-300'
              }`}
            >
              F
            </span>
            <span
              className={`hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] font-mono font-bold px-0.5 rounded border ${
                hunterWeaponMode === 'bow'
                  ? 'text-cyan-200 bg-sky-950/95 border-amber-400/50'
                  : 'text-emerald-300 bg-emerald-950/95 border-emerald-500/40'
              }`}
            >
              {classSkills.skill4?.cost || '45 MP'}
            </span>
            {renderSlotOverlays('skill4', false)}
          </button>
        ) : (
          <button
            ref={(el) => {
              slotRefs.current.dash.button = el;
            }}
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
            title="Shield Dash [E]"
          >
            <span className="text-sm sm:text-base md:text-base">🛡️</span>
            <span className="hidden md:block text-[8px] font-bold text-amber-300 truncate max-w-full px-0.5">
              Dash
            </span>
            <span className="absolute -top-1.5 -left-1 z-20 bg-amber-700 text-white text-[7px] font-mono px-1 rounded border border-amber-500">
              E
            </span>
            <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-amber-200 font-mono font-bold bg-stone-900/95 px-0.5 rounded">
              15 Stm
            </span>
            {renderSlotOverlays('dash', false)}
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
          <span className="hidden md:block text-[8px] font-bold text-stone-400">
            Lompat
          </span>
          <span className="absolute -top-1.5 -left-1 z-20 bg-stone-700 text-stone-300 text-[7px] font-mono px-1 rounded border border-stone-500">
            Spasi
          </span>
        </button>
      </div>
    </>
  );
};

export const ActionBar = SkillBar;
export default SkillBar;
