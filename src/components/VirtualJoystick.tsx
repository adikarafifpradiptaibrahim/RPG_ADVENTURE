import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useMobileViewport } from '../game/utils/mobileViewport';

export type TouchControlMode = 'joystick' | 'dpad';

const CONTROL_MODE_STORAGE_KEY = 'eldoria_touch_control_mode';
const CONTROL_MODE_CHANGE_EVENT = 'eldoria_control_mode_changed';

export function getSavedControlMode(): TouchControlMode {
  if (typeof window === 'undefined') return 'joystick';
  try {
    const saved = localStorage.getItem(CONTROL_MODE_STORAGE_KEY);
    if (saved === 'joystick' || saved === 'dpad') return saved;
  } catch { }
  return 'joystick';
}

export function setSavedControlMode(mode: TouchControlMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONTROL_MODE_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent<TouchControlMode>(CONTROL_MODE_CHANGE_EVENT, { detail: mode }));
  } catch { }
}

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  isVisible?: boolean;
  onHide?: () => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  isVisible = true,
}) => {
  const { isMobileUi } = useMobileViewport();
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const dpadBaseRef = useRef<HTMLDivElement>(null);

  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [controlMode, setControlMode] = useState<TouchControlMode>(() => getSavedControlMode());

  const activeTouchIdRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  // D-Pad active states
  const dpadPressedRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const [dpadVisual, setDpadVisual] = useState({ up: false, down: false, left: false, right: false });

  // Sync control mode when changed from Settings -> Kontrol
  useEffect(() => {
    const handleModeChanged = (e: Event) => {
      const custom = e as CustomEvent<TouchControlMode>;
      const next = custom.detail || getSavedControlMode();
      if (next === 'joystick' || next === 'dpad') {
        setControlMode(next);
      }
    };
    window.addEventListener(CONTROL_MODE_CHANGE_EVENT, handleModeChanged);
    return () => window.removeEventListener(CONTROL_MODE_CHANGE_EVENT, handleModeChanged);
  }, []);

  // Ergonomic touch dimensions (~116px mobile diameter, 42px knob travel)
  const maxRadius = isMobileUi ? 42 : 46;
  const DEADZONE = 6;

  const sendMove = useCallback(
    (vec: { x: number; y: number }) => {
      onMove(vec);
    },
    [onMove]
  );

  // Stop all movement and reset states
  const stopAllMovement = useCallback(() => {
    activeTouchIdRef.current = null;
    activePointerIdRef.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    dpadPressedRef.current = { up: false, down: false, left: false, right: false };
    setDpadVisual({ up: false, down: false, left: false, right: false });
    sendMove({ x: 0, y: 0 });
  }, [sendMove]);

  // JOYSTICK: Position calculation relative to center base
  const updateKnob = useCallback(
    (clientX: number, clientY: number) => {
      const baseEl = joystickBaseRef.current;
      if (!baseEl) return;

      const rect = baseEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < DEADZONE) {
        setKnobPos({ x: 0, y: 0 });
        sendMove({ x: 0, y: 0 });
        return;
      }

      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);

      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      setKnobPos({ x: knobX, y: knobY });

      const normDist = (clampedDist - DEADZONE) / (maxRadius - DEADZONE);
      sendMove({
        x: Math.cos(angle) * normDist,
        y: Math.sin(angle) * normDist,
      });
    },
    [sendMove, maxRadius, DEADZONE]
  );

  // DPAD: Continuous touch calculation from position relative to D-Pad center
  const updateDpadFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      const baseEl = dpadBaseRef.current;
      if (!baseEl) return;

      const rect = baseEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        dpadPressedRef.current = { up: false, down: false, left: false, right: false };
        setDpadVisual({ up: false, down: false, left: false, right: false });
        sendMove({ x: 0, y: 0 });
        return;
      }

      const up = dy < -8;
      const down = dy > 8;
      const left = dx < -8;
      const right = dx > 8;

      dpadPressedRef.current = { up, down, left, right };
      setDpadVisual({ up, down, left, right });

      let x = 0;
      let y = 0;
      if (left) x -= 1;
      if (right) x += 1;
      if (up) y -= 1;
      if (down) y += 1;

      if (x !== 0 && y !== 0) {
        x /= Math.SQRT2;
        y /= Math.SQRT2;
      }

      sendMove({ x, y });
    },
    [sendMove]
  );

  // Global Pointer Listeners filtered strictly by movePointerId (isolates left thumb from right-thumb aiming)
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current === null || activePointerIdRef.current !== e.pointerId) return;
      if (e.cancelable) e.preventDefault();
      if (controlMode === 'joystick') {
        updateKnob(e.clientX, e.clientY);
      } else {
        updateDpadFromCoords(e.clientX, e.clientY);
      }
    };

    const handleWindowPointerEnd = (e: PointerEvent) => {
      if (activePointerIdRef.current === null || activePointerIdRef.current !== e.pointerId) return;
      stopAllMovement();
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerEnd, { passive: true });
    window.addEventListener('pointercancel', handleWindowPointerEnd, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, [controlMode, updateKnob, updateDpadFromCoords, stopAllMovement]);

  // Unified Multi-Touch Pointer Handlers (Touch, Stylus, & Mouse via isolated pointerId)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { }
    activePointerIdRef.current = e.pointerId;
    activeTouchIdRef.current = e.pointerId;
    setActive(true);

    if (controlMode === 'joystick') {
      updateKnob(e.clientX, e.clientY);
    } else {
      updateDpadFromCoords(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();

    if (controlMode === 'joystick') {
      updateKnob(e.clientX, e.clientY);
    } else {
      updateDpadFromCoords(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch { }
      stopAllMovement();
    }
  };

  useEffect(() => {
    if (!isVisible) {
      stopAllMovement();
    }
  }, [isVisible, stopAllMovement]);

  if (!isVisible) return null;

  const baseSizeClass = isMobileUi ? 'w-[116px] h-[116px]' : 'w-32 h-32 sm:w-36 sm:h-36';
  const knobSizeClass = isMobileUi ? 'w-11 h-11' : 'w-12 h-12 sm:w-14 sm:h-14';
  const dpadBtnClass = isMobileUi ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10';

  return (
    <div
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'auto',
        bottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
        left: 'max(18px, env(safe-area-inset-left, 0px))',
        zIndex: 9999,
      }}
      className={`touch-control-layer virtual-joystick-root fixed z-[9999] select-none flex flex-col items-start transition-opacity duration-150 ${
        active ? 'opacity-100' : 'opacity-80'
      }`}
    >
      {controlMode === 'joystick' ? (
        /* Virtual Analog Stick Base */
        <div
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          className={`relative ${baseSizeClass} rounded-full backdrop-blur-sm border-2 shadow-2xl flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing select-none pointer-events-auto ${active
              ? 'bg-amber-950/60 border-amber-500/90 shadow-amber-500/40'
              : 'bg-stone-900/55 border-stone-600/65'
            }`}
        >
          {/* Cardinal direction indicators */}
          <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-amber-500/60" />
          <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-amber-500/60" />
          <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-amber-500/60" />
          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-amber-500/60" />

          {/* Inner motion guide dashed circle */}
          <div className={`absolute ${knobSizeClass} rounded-full border border-dashed border-stone-500/50 pointer-events-none`} />

          {/* Joystick Knob */}
          <div
            className={`${knobSizeClass} rounded-full border-2 shadow-2xl flex items-center justify-center pointer-events-none ${active
                ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-amber-200 shadow-amber-500/70 scale-105'
                : 'bg-gradient-to-b from-stone-700/90 via-stone-800/90 to-stone-900/90 border-stone-500/80 shadow-black'
              }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: active ? 'none' : 'transform 0.12s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/50 shadow-inner" />
          </div>
        </div>
      ) : (
        /* D-Pad Base */
        <div
          ref={dpadBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          className={`relative ${baseSizeClass} bg-stone-900/60 backdrop-blur-sm rounded-3xl border-2 border-stone-600/70 p-1.5 flex items-center justify-center shadow-2xl select-none pointer-events-auto`}
        >
          <div
            className={`absolute top-1.5 left-1/2 -translate-x-1/2 ${dpadBtnClass} rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.up
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/85 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowUp className="w-4 h-4" />
          </div>

          <div
            className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 ${dpadBtnClass} rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.down
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/85 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowDown className="w-4 h-4" />
          </div>

          <div
            className={`absolute left-1.5 top-1/2 -translate-y-1/2 ${dpadBtnClass} rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.left
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/85 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </div>

          <div
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${dpadBtnClass} rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.right
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/85 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="w-3 h-3 rounded-full bg-stone-700/80 border border-stone-500/50 pointer-events-none" />
        </div>
      )}
    </div>
  );
};