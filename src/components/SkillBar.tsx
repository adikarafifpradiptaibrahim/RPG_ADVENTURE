import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats } from '../types/game';
import {
  HudCooldownSlotName,
  HudSkillCooldownMap,
  HudSkillCooldownSlotState,
} from '../game/skillCooldownManager';
import { useMobileViewport } from '../game/utils/mobileViewport';

export type MobileAimSlot = 'basic' | 'skill1' | 'dash' | 'ult';

export interface SkillBarProps {
  stats: PlayerStats;
  hunterWeaponMode?: 'dagger' | 'bow';
  isWeaponDrawn?: boolean;
  stealthActive?: boolean;
  isVisible?: boolean;
  isMobileUi?: boolean;
  onPerformAttack: () => void;
  onAttackStart?: () => void;
  onAttackEnd?: () => void;
  onCastSkill: (slot: 1 | 2 | 3 | 4) => void;
  onAimSkillStart?: (slot: 1 | 2 | 3 | 4) => void;
  onAimSkillMove?: (slot: 1 | 2 | 3 | 4, delta: { x: number; y: number }, aimAngleRad: number) => void;
  onAimSkillEnd?: (slot: 1 | 2 | 3 | 4, isCancelled: boolean) => void;
  onMobileAimStart?: (slot: MobileAimSlot) => void;
  onMobileAimMove?: (slot: MobileAimSlot, nx: number, ny: number, isOverCancel: boolean) => void;
  onMobileAimEnd?: (slot: MobileAimSlot, isCancelled: boolean, isQuickTap: boolean) => void;
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

interface MobileAimVisualState {
  slot: MobileAimSlot;
  padCenterX: number;
  padCenterY: number;
  knobX: number;
  knobY: number;
  overCancel: boolean;
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
  isVisible = true,
  isMobileUi: isMobileProp,
  onPerformAttack,
  onAttackStart,
  onAttackEnd,
  onCastSkill,
  onAimSkillStart,
  onAimSkillEnd,
  onMobileAimStart,
  onMobileAimMove,
  onMobileAimEnd,
  onJump,
  onDash,
  onSwitchHunterWeapon,
  onToggleWeaponDrawn,
  getSkillCooldowns,
  subscribeSkillCooldowns,
  getStealthState,
}) => {
  const viewport = useMobileViewport();
  const isMobile = isMobileProp !== undefined ? isMobileProp : viewport.isMobileUi;

  // Unified multi-touch pointer tracking for Mobile Drag-to-Aim + X BATAL zone
  const [aimVisual, setAimVisual] = useState<MobileAimVisualState | null>(null);
  const cancelZoneRef = useRef<HTMLDivElement | null>(null);
  const lastTouchPointerTsRef = useRef<number>(0);
  const basicHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAimRef = useRef<{
    pointerId: number;
    slot: MobileAimSlot;
    startX: number;
    startY: number;
    padCenterX: number;
    padCenterY: number;
    startTime: number;
    maxDrag: number;
    overCancel: boolean;
    didHapticLock: boolean;
    overlayShown: boolean;
  } | null>(null);

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

  // Failsafe global pointer listener while aiming (guarantees release / cancel never sticks if finger leaves button)
  const cancelZoneRef2Ready = true;
  useEffect(() => {
    void cancelZoneRef2Ready;
    const handleGlobalPointerMove = (e: PointerEvent) => {
      const cur = activeAimRef.current;
      if (!cur || cur.pointerId !== e.pointerId) return;
      const rawDx = e.clientX - cur.startX;
      const rawDy = e.clientY - cur.startY;
      const dist = Math.hypot(rawDx, rawDy);
      cur.maxDrag = Math.max(cur.maxDrag, dist);
      if (!cur.overlayShown && cur.maxDrag >= 8) {
        cur.overlayShown = true;
        if (basicHoldTimerRef.current) {
          clearTimeout(basicHoldTimerRef.current);
          basicHoldTimerRef.current = null;
        }
      }
      const maxRadius = 38;
      const clampedDist = Math.min(dist, maxRadius);
      const kx = dist > 0 ? (rawDx / dist) * clampedDist : 0;
      const ky = dist > 0 ? (rawDy / dist) * clampedDist : 0;
      const cancelEl = cancelZoneRef.current || document.getElementById('moba-cancel-zone');
      let inCancel = false;
      if (cur.overlayShown && cancelEl) {
        const rect = cancelEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        inCancel = Math.hypot(e.clientX - cx, e.clientY - cy) <= Math.max(rect.width, rect.height) * 0.5 + 16;
      }
      cur.overCancel = inCancel;
      if (cur.overlayShown) {
        setAimVisual({
          slot: cur.slot,
          padCenterX: cur.padCenterX,
          padCenterY: cur.padCenterY,
          knobX: kx,
          knobY: ky,
          overCancel: inCancel,
        });
      }
      onMobileAimMove?.(cur.slot, kx / maxRadius, ky / maxRadius, inCancel);
    };

    const handleGlobalPointerEnd = (e: PointerEvent) => {
      const cur = activeAimRef.current;
      if (!cur || cur.pointerId !== e.pointerId) return;
      if (basicHoldTimerRef.current) {
        clearTimeout(basicHoldTimerRef.current);
        basicHoldTimerRef.current = null;
      }
      const forceCancel = e.type === 'pointercancel';
      const holdMs = performance.now() - cur.startTime;
      const isQuickTap = !forceCancel && !cur.overCancel && cur.maxDrag < 12 && holdMs < 240;
      const isCancelled = forceCancel || cur.overCancel;
      const slot = cur.slot;
      activeAimRef.current = null;
      setAimVisual(null);
      onMobileAimEnd?.(slot, isCancelled, isQuickTap);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerEnd, { passive: true });
    window.addEventListener('pointercancel', handleGlobalPointerEnd, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
    };
  }, [onMobileAimMove, onMobileAimEnd]);

  // Cancel any dangling mobile aim if SkillBar hides cleanly
  useEffect(() => {
    if (!isVisible && activeAimRef.current) {
      if (basicHoldTimerRef.current) {
        clearTimeout(basicHoldTimerRef.current);
        basicHoldTimerRef.current = null;
      }
      const slot = activeAimRef.current.slot;
      activeAimRef.current = null;
      setAimVisual(null);
      onMobileAimEnd?.(slot, true, false);
    }
  }, [isVisible, onMobileAimEnd]);

  // 60fps Swipe-Down Cooldown & Stealth Banner loop (zero React re-renders per frame)
  useEffect(() => {
    if (!isVisible) return;
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
      const isPartialRecharging =
        state.maxCharges > 1 && state.charges > 0 && state.charges < state.maxCharges && state.remaining > 0;

      // 2. Swipe-Down Curtain Overlay
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

      // 3. Center Countdown Timer
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

      // 4. Bottom-Left Partial Charge Recharge Countdown
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

      // 5. Dimmed State & Ready Flash Ring
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

    ensureLoop();
    const unsub = subscribeSkillCooldowns?.(() => {
      ensureLoop();
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      unsub?.();
    };
  }, [
    isVisible,
    stats.characterClass,
    hunterWeaponMode,
    stealthActive,
    getSkillCooldowns,
    subscribeSkillCooldowns,
    getStealthState,
  ]);

  if (!isVisible) return null;

  const getClassSkills = () => {
    switch (stats.characterClass) {
      case 'warrior':
        return {
          basic: { label: 'Tebas / Charge', shortMobile: 'Tebas', icon: '⚔️' },
          skill1: { name: 'Triple Crescent', shortMobile: 'Sabit', icon: '🌙', cost: '20 Au', key: 'Q', color: 'border-amber-500/75 text-amber-300 bg-amber-950/55' },
          skill2: { name: 'Cataclysmic', shortMobile: 'Ulti', icon: '💥', cost: '30 Au', key: 'F', color: 'border-2 border-amber-400/90 text-amber-200 bg-gradient-to-b from-red-900/90 via-amber-950/90 to-stone-950 ring-1 ring-amber-400/60' },
          skill3: { name: 'Aegis Shield', shortMobile: 'Perisai', icon: '🛡️', cost: '25 Au', key: 'R', color: 'border-orange-500/75 text-orange-300 bg-orange-950/55' },
        };
      case 'mage':
        return {
          basic: { label: 'Arcane Beam', shortMobile: 'Laser', icon: '🔮' },
          skill1: { name: 'Glacial', shortMobile: 'Glacial', icon: '💠', cost: '18 MP', key: 'Q', color: 'border-sky-400/80 text-sky-200 bg-sky-950/55 shadow-sky-500/40' },
          skill2: { name: 'Blink', shortMobile: 'Blink', icon: '🌌', cost: '15 Stm', key: 'E', color: 'border-cyan-500/75 text-cyan-300 bg-cyan-950/55' },
          skill3: { name: 'Cahaya Suci', shortMobile: 'Cahaya', icon: '✨', cost: '25 MP', key: 'R', color: 'border-blue-500/75 text-blue-300 bg-blue-950/55' },
          skill4: { name: 'Apocalypse', shortMobile: 'Meteor', icon: '☄️', cost: '45 MP', key: 'F', color: 'border-2 border-amber-400/90 text-amber-200 bg-gradient-to-b from-purple-900/90 via-purple-950/90 to-amber-950/80 shadow-purple-500/50 ring-1 ring-purple-400/60' },
        };
      case 'rogue':
        if (hunterWeaponMode === 'bow') {
          return {
            basic: { label: 'Tarik Busur', shortMobile: 'Panah', icon: '🏹' },
            skill1: { name: 'Rajawali', shortMobile: 'Elang', icon: '🦅', cost: '20 MP', key: 'Q', color: 'border-cyan-400/80 text-cyan-200 bg-cyan-950/55 shadow-cyan-500/30' },
            skill2: { name: 'Bayangan', shortMobile: 'Dash', icon: '👥', cost: '12 Stm', key: 'E', color: 'border-cyan-500/75 text-cyan-200 bg-cyan-950/55' },
            skill3: { name: 'Bom Asap', shortMobile: 'Asap', icon: '💨', cost: '20 MP', key: 'R', color: 'border-slate-400/75 text-slate-200 bg-slate-900/75' },
            skill4: { name: 'Badai Panah', shortMobile: 'Badai', icon: '⛈️', cost: '45 MP', key: 'F', color: 'border-2 border-amber-400/90 text-amber-200 bg-gradient-to-b from-cyan-900/90 via-sky-950/90 to-amber-950/80 shadow-cyan-500/50 ring-1 ring-cyan-400/60' },
          };
        } else {
          return {
            basic: { label: 'Belati 360°', shortMobile: 'Belati', icon: '🗡️' },
            skill1: { name: 'Tarian Belati', shortMobile: 'Tarian', icon: '⚡', cost: '15 MP', key: 'Q', color: 'border-emerald-500/75 text-emerald-300 bg-emerald-950/55' },
            skill2: { name: 'Bayangan', shortMobile: 'Dash', icon: '👥', cost: '12 Stm', key: 'E', color: 'border-cyan-500/75 text-cyan-200 bg-cyan-950/55' },
            skill3: { name: 'Bom Asap', shortMobile: 'Asap', icon: '💨', cost: '20 MP', key: 'R', color: 'border-slate-400/75 text-slate-200 bg-slate-900/75' },
            skill4: { name: 'Eksekusi', shortMobile: 'Ulti', icon: '🌙', cost: '0 MP', key: 'F', color: 'border-2 border-emerald-400/90 text-emerald-200 bg-emerald-950/75 shadow-emerald-500/40 ring-1 ring-emerald-400/60' },
          };
        }
    }
  };

  const classSkills = getClassSkills();
  const isBowMode = stats.characterClass === 'rogue' && hunterWeaponMode === 'bow';
  const isDesktopAimableSkill1 = stats.characterClass === 'mage' || isBowMode;

  const checkPointInCancelZone = (clientX: number, clientY: number): boolean => {
    const cancelEl = cancelZoneRef.current || document.getElementById('moba-cancel-zone');
    if (!cancelEl) return false;
    const rect = cancelEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.hypot(clientX - cx, clientY - cy) <= rect.width / 2 + 16;
  };

  const startMobileAimPointer = (e: React.PointerEvent<HTMLButtonElement>, slot: MobileAimSlot) => {
    if (!isMobile && e.pointerType === 'mouse') return;
    if (e.pointerType !== 'mouse') {
      lastTouchPointerTsRef.current = performance.now();
    }
    if (activeAimRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = e.currentTarget.getBoundingClientRect();
    const padCenterX = rect.left + rect.width / 2;
    const padCenterY = rect.top + rect.height / 2;
    const showImmediately = slot !== 'basic';

    if (basicHoldTimerRef.current) {
      clearTimeout(basicHoldTimerRef.current);
      basicHoldTimerRef.current = null;
    }

    activeAimRef.current = {
      pointerId: e.pointerId,
      slot,
      startX: e.clientX,
      startY: e.clientY,
      padCenterX,
      padCenterY,
      startTime: performance.now(),
      maxDrag: 0,
      overCancel: false,
      didHapticLock: false,
      overlayShown: showImmediately,
    };

    if (showImmediately) {
      setAimVisual({
        slot,
        padCenterX,
        padCenterY,
        knobX: 0,
        knobY: 0,
        overCancel: false,
      });
    } else {
      basicHoldTimerRef.current = setTimeout(() => {
        const cur = activeAimRef.current;
        if (cur && cur.slot === 'basic' && !cur.overlayShown) {
          cur.overlayShown = true;
          setAimVisual({
            slot: 'basic',
            padCenterX: cur.padCenterX,
            padCenterY: cur.padCenterY,
            knobX: 0,
            knobY: 0,
            overCancel: false,
          });
        }
      }, 160);
    }

    onMobileAimStart?.(slot);
  };

  const moveMobileAimPointer = (e: React.PointerEvent<HTMLButtonElement>, slot: MobileAimSlot) => {
    const cur = activeAimRef.current;
    if (!cur || cur.pointerId !== e.pointerId || cur.slot !== slot) return;
    e.preventDefault();
    e.stopPropagation();

    const rawDx = e.clientX - cur.startX;
    const rawDy = e.clientY - cur.startY;
    const dist = Math.hypot(rawDx, rawDy);
    cur.maxDrag = Math.max(cur.maxDrag, dist);

    if (!cur.overlayShown && cur.maxDrag >= 8) {
      cur.overlayShown = true;
      if (basicHoldTimerRef.current) {
        clearTimeout(basicHoldTimerRef.current);
        basicHoldTimerRef.current = null;
      }
    }

    const maxRadius = 38;
    const clampedDist = Math.min(dist, maxRadius);
    const kx = dist > 0 ? (rawDx / dist) * clampedDist : 0;
    const ky = dist > 0 ? (rawDy / dist) * clampedDist : 0;

    const inCancel = cur.overlayShown && checkPointInCancelZone(e.clientX, e.clientY);
    if (inCancel && !cur.overCancel) {
      try {
        navigator.vibrate?.(15);
      } catch {}
    } else if (!inCancel && !cur.didHapticLock && cur.maxDrag >= 14) {
      cur.didHapticLock = true;
      try {
        navigator.vibrate?.(10);
      } catch {}
    }
    cur.overCancel = inCancel;

    const nx = kx / maxRadius;
    const ny = ky / maxRadius;

    if (cur.overlayShown) {
      setAimVisual({
        slot,
        padCenterX: cur.padCenterX,
        padCenterY: cur.padCenterY,
        knobX: kx,
        knobY: ky,
        overCancel: inCancel,
      });
    }

    onMobileAimMove?.(slot, nx, ny, inCancel);
  };

  const endMobileAimPointer = (e: React.PointerEvent<HTMLButtonElement>, slot: MobileAimSlot, forceCancel = false) => {
    const cur = activeAimRef.current;
    if (!cur || cur.pointerId !== e.pointerId || cur.slot !== slot) return;
    e.preventDefault();
    e.stopPropagation();
    if (basicHoldTimerRef.current) {
      clearTimeout(basicHoldTimerRef.current);
      basicHoldTimerRef.current = null;
    }
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const holdMs = performance.now() - cur.startTime;
    const isQuickTap = !forceCancel && !cur.overCancel && cur.maxDrag < 12 && holdMs < 240;
    const isCancelled = forceCancel || cur.overCancel;

    activeAimRef.current = null;
    setAimVisual(null);
    onMobileAimEnd?.(slot, isCancelled, isQuickTap);
  };

  const renderSlotOverlays = (slotName: HudCooldownSlotName, isChargeSkill: boolean) => (
    <>
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-10">
        <div
          ref={(el) => {
            slotRefs.current[slotName].curtain = el;
          }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '0%', opacity: 0 }}
        />
      </div>

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

      {isChargeSkill && (
        <span
          ref={(el) => {
            slotRefs.current[slotName].chargeBadge = el;
          }}
          style={{ display: 'flex' }}
          className="absolute -top-1 -right-1 z-30 min-w-[16px] h-[16px] items-center justify-center rounded-full border text-[9px] font-mono font-black leading-none px-1 shadow-md pointer-events-none"
        />
      )}

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

  // Mobile Arc Role Slot Mapping:
  // Order along ergonomic thumb arc: Q -> Dash -> R -> Ultimate
  const skill2ArcClass = isMobile
    ? stats.characterClass === 'warrior'
      ? 'skill-arc-ult'
      : 'skill-arc-dash'
    : 'skill-btn-2';
  const dashArcClass = isMobile ? 'skill-arc-dash' : 'skill-btn-dash';
  const skill4ArcClass = isMobile ? 'skill-arc-ult' : 'skill-btn-4';

  const getAimPadTheme = (slot: MobileAimSlot) => {
    if (aimVisual?.overCancel) {
      return {
        ring: 'border-red-500 bg-red-950/60 shadow-[0_0_24px_rgba(239,68,68,0.65)]',
        knob: 'bg-red-500 border-white text-white',
        icon: '✕',
      };
    }
    if (slot === 'ult') {
      return {
        ring: 'border-amber-400 bg-amber-950/55 shadow-[0_0_24px_rgba(251,191,36,0.55)]',
        knob: 'bg-amber-400 border-amber-100 text-stone-950',
        icon: stats.characterClass === 'mage' ? '☄️' : isBowMode ? '⛈️' : '💥',
      };
    }
    if (slot === 'dash') {
      return {
        ring: 'border-cyan-400 bg-cyan-950/55 shadow-[0_0_22px_rgba(34,211,238,0.5)]',
        knob: 'bg-cyan-400 border-cyan-100 text-stone-950',
        icon: stats.characterClass === 'mage' ? '🌌' : stats.characterClass === 'warrior' ? '🛡️' : '👥',
      };
    }
    if (slot === 'basic') {
      return {
        ring: 'border-emerald-400 bg-emerald-950/55 shadow-[0_0_22px_rgba(16,185,129,0.5)]',
        knob: 'bg-emerald-400 border-emerald-100 text-stone-950',
        icon: '🏹',
      };
    }
    return {
      ring: 'border-sky-400 bg-sky-950/55 shadow-[0_0_24px_rgba(56,189,248,0.55)]',
      knob: 'bg-sky-400 border-sky-100 text-stone-950',
      icon: classSkills.skill1.icon,
    };
  };

  const activePadTheme = aimVisual ? getAimPadTheme(aimVisual.slot) : null;

  return (
    <>
      {/* Stealth Active Pill Indicator */}
      <div
        ref={stealthPillRef}
        style={{ display: 'none' }}
        className={`fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none flex-col items-center gap-1 rounded-full border border-slate-400/70 bg-slate-950/90 px-3 py-1 shadow-[0_0_18px_rgba(148,163,184,0.45)] backdrop-blur-sm ${
          isMobile ? 'bottom-3.5' : 'bottom-[76px]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs">💨</span>
          <span ref={stealthTextRef} className="font-mono text-[10.5px] font-black tracking-wider text-slate-100">
            STEALTH (3.0s)
          </span>
          <span className="text-[9px] font-bold text-cyan-300">+20% SPD</span>
        </div>
        <div className="w-28 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            ref={stealthBarRef}
            style={{ width: '100%' }}
            className="h-full bg-gradient-to-r from-slate-300 via-cyan-300 to-slate-200"
          />
        </div>
      </div>

      {/* Floating 96px Translucent Skill Aim Thumbstick Overlay (Centered over held skill button) */}
      {isMobile && aimVisual && activePadTheme && (
        <div
          style={{
            left: `${aimVisual.padCenterX - 48}px`,
            top: `${aimVisual.padCenterY - 48}px`,
            width: '96px',
            height: '96px',
            touchAction: 'none',
          }}
          className={`fixed z-50 rounded-full border-2 backdrop-blur-sm pointer-events-none flex items-center justify-center transition-colors ${activePadTheme.ring}`}
        >
          <div className="absolute inset-3 rounded-full border border-dashed border-white/25 pointer-events-none" />
          <div
            style={{
              transform: `translate(${aimVisual.knobX}px, ${aimVisual.knobY}px)`,
            }}
            className={`w-9 h-9 rounded-full border-2 shadow-xl flex items-center justify-center text-sm font-black ${activePadTheme.knob}`}
          >
            {activePadTheme.icon}
          </div>
        </div>
      )}

      {/* Collision-Free Floating X BATAL Zone (68px diameter at top: 98px, right: 18px below compact minimap) */}
      {isMobile && aimVisual && (
        <div
          id="moba-cancel-zone"
          ref={cancelZoneRef}
          style={{
            top: 'calc(98px + env(safe-area-inset-top, 0px))',
            right: 'max(18px, env(safe-area-inset-right, 0px))',
            width: '68px',
            height: '68px',
            zIndex: 9998,
          }}
          className={`fixed flex flex-col items-center justify-center rounded-full border-2 transition-transform duration-150 pointer-events-none select-none ${
            aimVisual.overCancel
              ? 'bg-red-600/95 border-white text-white scale-115 shadow-[0_0_28px_#ef4444] ring-4 ring-red-400/80'
              : 'bg-red-950/85 border-red-400/85 text-red-100 scale-100 shadow-xl'
          }`}
        >
          <span className="text-xl font-black leading-none">✕</span>
          <span className="text-[9px] font-black tracking-wider uppercase mt-0.5 leading-none">
            BATAL
          </span>
        </div>
      )}

      <div
        id="hud-action-cluster"
        className={`hud-action-cluster touch-control-layer select-none ${
          isMobile ? 'hud-action-cluster-mobile' : 'hud-action-cluster-desktop'
        }`}
      >
        {/* Hunter Dual Toggles: Mode Santai/Siaga & Switch Weapon Busur/Belati */}
        {stats.characterClass === 'rogue' && onToggleWeaponDrawn && (
          <button
            type="button"
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse') {
                lastTouchPointerTsRef.current = performance.now();
                e.preventDefault();
                e.stopPropagation();
                onToggleWeaponDrawn();
              }
            }}
            onClick={() => {
              if (performance.now() - lastTouchPointerTsRef.current < 450) return;
              onToggleWeaponDrawn();
            }}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className={`skill-btn skill-btn-sheathe touch-control-btn group relative flex flex-col items-center justify-center border shadow cursor-pointer active:scale-90 transition-all select-none ${
              isWeaponDrawn
                ? 'bg-gradient-to-b from-cyan-950 to-stone-950 hover:from-cyan-900 text-cyan-300 border-cyan-400/80 shadow-cyan-500/20'
                : 'bg-gradient-to-b from-stone-800 to-stone-950 hover:from-stone-700 text-stone-300 border-stone-500/80'
            }`}
            title={`Tarik / Sarungkan Senjata (X) — ${isWeaponDrawn ? 'Siaga' : 'Santai'}`}
          >
            <span className={isMobile ? 'text-sm leading-none' : 'text-xs sm:text-sm md:text-base'}>
              {isWeaponDrawn ? '⚡' : '🕊️'}
            </span>
            <span className={`${isMobile ? 'text-[7px] leading-none mt-0.5 font-bold whitespace-nowrap' : 'hidden md:block text-[8px] font-bold truncate max-w-full px-0.5'}`}>
              {isWeaponDrawn ? 'Siaga' : 'Santai'}
            </span>
            {!isMobile && (
              <span className="absolute -top-1.5 -left-1 z-20 bg-stone-700 text-cyan-200 text-[7px] font-mono px-1 rounded border border-cyan-400/60">
                X
              </span>
            )}
          </button>
        )}

        {stats.characterClass === 'rogue' && onSwitchHunterWeapon && (
          <button
            type="button"
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse') {
                lastTouchPointerTsRef.current = performance.now();
                e.preventDefault();
                e.stopPropagation();
                onSwitchHunterWeapon();
              }
            }}
            onClick={() => {
              if (performance.now() - lastTouchPointerTsRef.current < 450) return;
              onSwitchHunterWeapon();
            }}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className="skill-btn skill-btn-switch touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950 to-stone-950 hover:from-emerald-900 hover:to-stone-900 text-emerald-300 border border-emerald-500/80 shadow cursor-pointer active:scale-90 transition-all select-none"
            title={`Ganti Senjata: ${hunterWeaponMode === 'bow' ? 'Belati' : 'Busur'} (T)`}
          >
            <span className={isMobile ? 'text-sm leading-none' : 'text-xs sm:text-sm md:text-base'}>
              {hunterWeaponMode === 'bow' ? '🏹' : '🗡️'}
            </span>
            <span className={`${isMobile ? 'text-[7px] leading-none mt-0.5 font-bold text-emerald-200 whitespace-nowrap' : 'hidden md:block text-[8px] font-bold text-emerald-200 truncate max-w-full px-0.5'}`}>
              {hunterWeaponMode === 'bow' ? 'Busur' : 'Belati'}
            </span>
            {!isMobile && (
              <span className="absolute -top-1.5 -left-1 z-20 bg-emerald-700 text-white text-[7px] font-mono px-1 rounded border border-emerald-400">
                T
              </span>
            )}
          </button>
        )}

        {/* Main Attack Button (66px mobile corner; supports Hold Bow Aim on Mobile + Desktop) */}
        <button
          type="button"
          onPointerDown={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              if (isBowMode && onMobileAimStart) {
                startMobileAimPointer(e, 'basic');
              } else {
                e.preventDefault();
                e.stopPropagation();
                if (onAttackStart) onAttackStart();
                else onPerformAttack();
              }
              return;
            }
            if (onAttackStart) onAttackStart();
          }}
          onPointerMove={(e) => {
            if ((isMobile || e.pointerType !== 'mouse') && isBowMode && onMobileAimMove) {
              moveMobileAimPointer(e, 'basic');
            }
          }}
          onPointerUp={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              if (isBowMode && onMobileAimEnd) {
                endMobileAimPointer(e, 'basic', false);
              } else {
                e.preventDefault();
                e.stopPropagation();
                if (onAttackEnd) onAttackEnd();
              }
              return;
            }
            if (onAttackEnd) onAttackEnd();
          }}
          onPointerCancel={(e) => {
            if ((isMobile || e.pointerType !== 'mouse') && isBowMode && onMobileAimEnd) {
              endMobileAimPointer(e, 'basic', true);
            }
          }}
          onClick={() => {
            if (!isMobile && !onAttackStart && !onAttackEnd) onPerformAttack();
          }}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="skill-btn skill-btn-attack touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-amber-600 via-stone-800 to-stone-950 hover:from-amber-500 hover:to-stone-900 text-stone-100 border-2 border-amber-400/90 shadow-2xl cursor-pointer active:scale-90 transition-all select-none"
          title={`${classSkills.basic.label}`}
        >
          <span className={isMobile ? 'text-2xl leading-none drop-shadow' : 'text-xl sm:text-2xl md:text-xl drop-shadow'}>
            {classSkills.basic.icon}
          </span>
          <span className={isMobile ? 'text-[8px] font-black text-amber-200 whitespace-nowrap leading-none mt-0.5' : 'hidden md:block text-[8px] font-bold text-stone-300 truncate max-w-full px-0.5'}>
            {isMobile ? classSkills.basic.shortMobile : classSkills.basic.label}
          </span>
          {!isMobile && (
            <span className="absolute -top-1.5 -left-1 z-20 bg-amber-600 text-stone-950 font-black text-[7px] font-mono px-1 rounded-full border border-amber-300">
              LMB
            </span>
          )}
        </button>

        {/* Skill 1 (Q: Crescent / Glacial / Rajawali / Tarian Belati) */}
        <button
          ref={(el) => {
            slotRefs.current.skill1.button = el;
          }}
          type="button"
          onPointerDown={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              startMobileAimPointer(e, 'skill1');
              return;
            }
            if (isDesktopAimableSkill1 && onAimSkillStart && e.button === 0) {
              onAimSkillStart(1);
            }
          }}
          onPointerMove={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              moveMobileAimPointer(e, 'skill1');
            }
          }}
          onPointerUp={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              endMobileAimPointer(e, 'skill1', false);
              return;
            }
            if (isDesktopAimableSkill1 && onAimSkillEnd && e.button === 0) {
              onAimSkillEnd(1, false);
            }
          }}
          onPointerCancel={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              endMobileAimPointer(e, 'skill1', true);
            }
          }}
          onContextMenu={(e) => {
            if (!isMobile && isDesktopAimableSkill1) {
              e.preventDefault();
              e.stopPropagation();
              onAimSkillEnd?.(1, true);
            }
          }}
          onClick={() => {
            if (!isMobile && !isDesktopAimableSkill1) {
              onCastSkill(1);
            }
          }}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className={`skill-btn ${isMobile ? 'skill-arc-q' : 'skill-btn-1'} touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 hover:brightness-110 border shadow-lg cursor-pointer active:scale-90 transition-all select-none ${classSkills.skill1.color} ${
            aimVisual?.slot === 'skill1' ? 'ring-2 ring-sky-400 scale-105' : ''
          }`}
          title={`${classSkills.skill1.name} (${classSkills.skill1.key})`}
        >
          <span className={isMobile ? 'text-base leading-none' : 'text-sm sm:text-base md:text-base'}>
            {classSkills.skill1.icon}
          </span>
          <span className={isMobile ? 'text-[7.5px] font-bold leading-none whitespace-nowrap mt-0.5' : 'hidden md:block text-[8px] font-bold leading-tight truncate max-w-full px-0.5'}>
            {isMobile ? classSkills.skill1.shortMobile : classSkills.skill1.name}
          </span>
          {!isMobile && (
            <>
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

        {/* Skill 2 (Dash/Blink for Mage & Rogue, Cataclysmic Ultimate for Knight) */}
        <button
          ref={(el) => {
            slotRefs.current.skill2.button = el;
          }}
          type="button"
          onPointerDown={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              const aimSlot: MobileAimSlot = stats.characterClass === 'warrior' ? 'ult' : 'dash';
              startMobileAimPointer(e, aimSlot);
            }
          }}
          onPointerMove={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              const aimSlot: MobileAimSlot = stats.characterClass === 'warrior' ? 'ult' : 'dash';
              moveMobileAimPointer(e, aimSlot);
            }
          }}
          onPointerUp={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              const aimSlot: MobileAimSlot = stats.characterClass === 'warrior' ? 'ult' : 'dash';
              endMobileAimPointer(e, aimSlot, false);
            }
          }}
          onPointerCancel={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              const aimSlot: MobileAimSlot = stats.characterClass === 'warrior' ? 'ult' : 'dash';
              endMobileAimPointer(e, aimSlot, true);
            }
          }}
          onClick={() => {
            if (!isMobile) onCastSkill(2);
          }}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className={`skill-btn ${skill2ArcClass} touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 hover:brightness-110 border shadow-lg cursor-pointer active:scale-90 transition-all select-none ${classSkills.skill2.color}`}
          title={`${classSkills.skill2.name} (${classSkills.skill2.key})`}
        >
          <span className={isMobile ? 'text-base leading-none' : 'text-sm sm:text-base md:text-base'}>
            {classSkills.skill2.icon}
          </span>
          <span className={isMobile ? 'text-[7.5px] font-bold leading-none whitespace-nowrap mt-0.5' : 'hidden md:block text-[8px] font-bold truncate max-w-full px-0.5'}>
            {isMobile ? classSkills.skill2.shortMobile : classSkills.skill2.name}
          </span>
          {!isMobile && (
            <>
              <span className="absolute -top-1.5 -left-1 z-20 bg-stone-800 text-white text-[7px] font-mono px-1 rounded border border-stone-600">
                {classSkills.skill2.key}
              </span>
              <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-stone-300 font-mono font-bold bg-stone-900/95 px-0.5 rounded">
                {classSkills.skill2.cost}
              </span>
            </>
          )}
          {renderSlotOverlays('skill2', isSkill2Charge)}
        </button>

        {/* Skill 3 (R: Cahaya Suci / Aegis / Bom Asap) */}
        <button
          ref={(el) => {
            slotRefs.current.skill3.button = el;
          }}
          type="button"
          onPointerDown={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              if (e.pointerType !== 'mouse') lastTouchPointerTsRef.current = performance.now();
              e.preventDefault();
              e.stopPropagation();
              onCastSkill(3);
            }
          }}
          onClick={() => {
            if (performance.now() - lastTouchPointerTsRef.current < 450) return;
            if (!isMobile) onCastSkill(3);
          }}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className={`skill-btn ${isMobile ? 'skill-arc-r' : 'skill-btn-3'} touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 hover:brightness-110 border shadow-lg cursor-pointer active:scale-90 transition-all select-none ${classSkills.skill3.color}`}
          title={`${classSkills.skill3.name} (R)`}
        >
          <span className={isMobile ? 'text-base leading-none' : 'text-sm sm:text-base md:text-base'}>
            {classSkills.skill3.icon}
          </span>
          <span className={isMobile ? 'text-[7.5px] font-bold leading-none whitespace-nowrap mt-0.5' : 'hidden md:block text-[8px] font-bold truncate max-w-full px-0.5'}>
            {isMobile ? classSkills.skill3.shortMobile : classSkills.skill3.name}
          </span>
          {!isMobile && (
            <>
              <span className="absolute -top-1.5 -left-1 z-20 bg-stone-800 text-white text-[7px] font-mono px-1 rounded border border-stone-600">
                {classSkills.skill3.key}
              </span>
              <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-stone-300 font-mono font-bold bg-stone-900/95 px-0.5 rounded">
                {classSkills.skill3.cost}
              </span>
            </>
          )}
          {renderSlotOverlays('skill3', false)}
        </button>

        {/* Slot 4 (Ultimate for Mage & Rogue) / Shield Dash for Knight */}
        {stats.characterClass === 'mage' ? (
          <button
            ref={(el) => {
              slotRefs.current.skill4.button = el;
            }}
            type="button"
            onPointerDown={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                startMobileAimPointer(e, 'ult');
              }
            }}
            onPointerMove={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                moveMobileAimPointer(e, 'ult');
              }
            }}
            onPointerUp={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                endMobileAimPointer(e, 'ult', false);
              }
            }}
            onPointerCancel={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                endMobileAimPointer(e, 'ult', true);
              }
            }}
            onClick={() => {
              if (!isMobile) onCastSkill(4);
            }}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className={`skill-btn ${skill4ArcClass} touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-purple-900/90 via-purple-950/90 to-amber-950/80 text-amber-200 border-2 border-amber-400/90 ring-1 ring-purple-400/60 shadow-lg shadow-purple-900/50 cursor-pointer active:scale-90 transition-all select-none`}
            title="Celestial Apocalypse (F - Ultimate)"
          >
            <span className={isMobile ? 'text-base leading-none' : 'text-sm sm:text-base md:text-base'}>☄️</span>
            <span className={isMobile ? 'text-[7.5px] font-black text-amber-200 whitespace-nowrap leading-none mt-0.5' : 'hidden md:block text-[8px] font-bold text-amber-300 truncate max-w-full px-0.5'}>
              {isMobile ? 'Meteor' : 'Apocalypse'}
            </span>
            {!isMobile && (
              <>
                <span className="absolute -top-1.5 -left-1 z-20 bg-amber-600 text-stone-950 font-black text-[7px] font-mono px-1 rounded-full border border-amber-300 shadow">
                  F
                </span>
                <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-amber-300 font-mono font-bold bg-purple-950/95 px-0.5 rounded border border-amber-500/40">
                  45 MP
                </span>
              </>
            )}
            {renderSlotOverlays('skill4', false)}
          </button>
        ) : stats.characterClass === 'rogue' ? (
          <button
            ref={(el) => {
              slotRefs.current.skill4.button = el;
            }}
            type="button"
            onPointerDown={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                startMobileAimPointer(e, 'ult');
                return;
              }
              if (hunterWeaponMode === 'bow' && onAimSkillStart && e.button === 0) {
                onAimSkillStart(4);
              }
            }}
            onPointerMove={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                moveMobileAimPointer(e, 'ult');
              }
            }}
            onPointerUp={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                endMobileAimPointer(e, 'ult', false);
                return;
              }
              if (hunterWeaponMode === 'bow' && onAimSkillEnd && e.button === 0) {
                onAimSkillEnd(4, false);
              }
            }}
            onPointerCancel={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                endMobileAimPointer(e, 'ult', true);
              }
            }}
            onContextMenu={(e) => {
              if (!isMobile && hunterWeaponMode === 'bow' && onAimSkillEnd) {
                e.preventDefault();
                e.stopPropagation();
                onAimSkillEnd(4, true);
              }
            }}
            onClick={() => {
              if (!isMobile && (hunterWeaponMode !== 'bow' || !onAimSkillStart)) {
                onCastSkill(4);
              }
            }}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className={`skill-btn ${skill4ArcClass} touch-control-btn group relative flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all select-none shadow-lg ${
              hunterWeaponMode === 'bow'
                ? 'bg-gradient-to-b from-cyan-900/90 via-sky-950/90 to-amber-950/80 text-amber-200 border-2 border-amber-400/90 ring-1 ring-cyan-400/70 shadow-cyan-500/40'
                : 'bg-gradient-to-b from-emerald-900/90 via-emerald-950/90 to-teal-950/80 text-emerald-200 border-2 border-emerald-400/90 ring-1 ring-emerald-400/60 shadow-emerald-900/50'
            }`}
            title={`${classSkills.skill4?.name || 'Ultimate'} (F - Ultimate)`}
          >
            <span className={isMobile ? 'text-base leading-none' : 'text-sm sm:text-base md:text-base'}>
              {classSkills.skill4?.icon || '⛈️'}
            </span>
            <span
              className={`${
                isMobile
                  ? 'text-[7.5px] font-black whitespace-nowrap leading-none mt-0.5'
                  : 'hidden md:block text-[8px] font-bold leading-tight truncate max-w-full px-0.5'
              } ${hunterWeaponMode === 'bow' ? 'text-amber-200' : 'text-emerald-300'}`}
            >
              {isMobile ? classSkills.skill4?.shortMobile || 'Ulti' : classSkills.skill4?.name || 'Ultimate'}
            </span>
            {!isMobile && (
              <>
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
              </>
            )}
            {renderSlotOverlays('skill4', false)}
          </button>
        ) : (
          <button
            ref={(el) => {
              slotRefs.current.dash.button = el;
            }}
            type="button"
            onPointerDown={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                startMobileAimPointer(e, 'dash');
              }
            }}
            onPointerMove={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                moveMobileAimPointer(e, 'dash');
              }
            }}
            onPointerUp={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                endMobileAimPointer(e, 'dash', false);
              }
            }}
            onPointerCancel={(e) => {
              if (isMobile || e.pointerType !== 'mouse') {
                endMobileAimPointer(e, 'dash', true);
              }
            }}
            onClick={() => {
              if (!isMobile && onDash) onDash();
            }}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className={`skill-btn ${dashArcClass} touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 shadow-lg cursor-pointer active:scale-90 transition-all select-none text-amber-200 border border-amber-600/70`}
            title="Shield Dash [E]"
          >
            <span className={isMobile ? 'text-base leading-none' : 'text-sm sm:text-base md:text-base'}>🛡️</span>
            <span className={isMobile ? 'text-[7.5px] font-bold text-amber-200 whitespace-nowrap leading-none mt-0.5' : 'hidden md:block text-[8px] font-bold text-amber-300 truncate max-w-full px-0.5'}>
              Dash
            </span>
            {!isMobile && (
              <>
                <span className="absolute -top-1.5 -left-1 z-20 bg-amber-700 text-white text-[7px] font-mono px-1 rounded border border-amber-500">
                  E
                </span>
                <span className="hidden md:inline absolute -bottom-1.5 right-0.5 z-20 text-[6px] text-amber-200 font-mono font-bold bg-stone-900/95 px-0.5 rounded">
                  15 Stm
                </span>
              </>
            )}
            {renderSlotOverlays('dash', false)}
          </button>
        )}

        {/* Jump Button (44px bottom-left beside Skill Q on Mobile) */}
        <button
          type="button"
          onPointerDown={(e) => {
            if (isMobile || e.pointerType !== 'mouse') {
              if (e.pointerType !== 'mouse') lastTouchPointerTsRef.current = performance.now();
              e.preventDefault();
              e.stopPropagation();
              onJump();
            }
          }}
          onClick={() => {
            if (performance.now() - lastTouchPointerTsRef.current < 450) return;
            if (!isMobile) onJump();
          }}
          style={{ touchAction: 'none', userSelect: 'none' }}
          className="skill-btn skill-btn-jump touch-control-btn group relative flex flex-col items-center justify-center bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 text-stone-200 border border-stone-600 shadow-lg cursor-pointer active:scale-90 transition-all select-none"
          title="Lompat [Spasi]"
        >
          <span className={isMobile ? 'text-base leading-none' : 'text-sm sm:text-base md:text-base'}>🦘</span>
          <span className={isMobile ? 'text-[7px] font-bold text-stone-300 whitespace-nowrap leading-none mt-0.5' : 'hidden md:block text-[8px] font-bold text-stone-400'}>
            Lompat
          </span>
          {!isMobile && (
            <span className="absolute -top-1.5 -left-1 z-20 bg-stone-700 text-stone-300 text-[7px] font-mono px-1 rounded border border-stone-500">
              Spasi
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export const ActionBar = SkillBar;
export default SkillBar;
