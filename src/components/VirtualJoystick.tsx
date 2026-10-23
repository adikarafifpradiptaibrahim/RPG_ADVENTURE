import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Disc, Crosshair, EyeOff } from 'lucide-react';

export type TouchControlMode = 'joystick' | 'dpad';

const CONTROL_MODE_STORAGE_KEY = 'eldoria_touch_control_mode';

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
  } catch { }
}

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onHide?: () => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onHide }) => {
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

  // Ergonomic touch dimensions (Enlarged for mobile thumb comfort)
  const maxRadius = 52;
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

  // Global Touch Listeners with ID Tracking (Prevents touch dropping when dragging outside bounds)
  useEffect(() => {
    const activeRef = joystickBaseRef.current || dpadBaseRef.current;
    if (!activeRef) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Find touch inside current control element
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const target = touch.target as Node | null;
        if (activeRef.contains(target) && activeTouchIdRef.current === null) {
          e.preventDefault();
          e.stopPropagation();
          activeTouchIdRef.current = touch.identifier;
          setActive(true);

          if (controlMode === 'joystick') {
            updateKnob(touch.clientX, touch.clientY);
          } else {
            updateDpadFromCoords(touch.clientX, touch.clientY);
          }
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (activeTouchIdRef.current === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === activeTouchIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          if (controlMode === 'joystick') {
            updateKnob(touch.clientX, touch.clientY);
          } else {
            updateDpadFromCoords(touch.clientX, touch.clientY);
          }
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          stopAllMovement();
          break;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [controlMode, updateKnob, updateDpadFromCoords, stopAllMovement]);

  // Pointer Events Fallback for PC Mouse / Stylus
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return; // Handled by Touch Events
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { }
    activePointerIdRef.current = e.pointerId;
    setActive(true);

    if (controlMode === 'joystick') {
      updateKnob(e.clientX, e.clientY);
    } else {
      updateDpadFromCoords(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
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
    if (e.pointerType === 'touch') return;
    if (activePointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { }
      stopAllMovement();
    }
  };

  const switchMode = (mode: TouchControlMode) => {
    stopAllMovement();
    setControlMode(mode);
    setSavedControlMode(mode);
  };

  return (
    <div
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'auto',
      }}
      className="touch-control-layer virtual-joystick-root fixed bottom-4 left-4 z-[9999] select-none flex flex-col items-start gap-1"
    >
      {/* Mode Switcher pill */}
      <div className="flex items-center gap-1 bg-stone-950/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-stone-800 text-[9px] text-stone-300 shadow-lg pointer-events-auto">
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            switchMode('joystick');
          }}
          onClick={() => switchMode('joystick')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all cursor-pointer font-bold ${controlMode === 'joystick'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
            }`}
        >
          <Disc className="w-2.5 h-2.5" />
          <span>Analog</span>
        </button>
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            switchMode('dpad');
          }}
          onClick={() => switchMode('dpad')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all cursor-pointer font-bold ${controlMode === 'dpad'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
            }`}
        >
          <Crosshair className="w-2.5 h-2.5" />
          <span>D-Pad</span>
        </button>
        {onHide && (
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopAllMovement();
              onHide();
            }}
            onClick={() => {
              stopAllMovement();
              onHide();
            }}
            title="Sembunyikan kontroler layar"
            className="flex items-center gap-0.5 ml-0.5 px-1 py-0.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700 transition cursor-pointer"
          >
            <EyeOff className="w-2.5 h-2.5 text-stone-300" />
            <span className="text-[8px]">Tutup</span>
          </button>
        )}
      </div>

      {controlMode === 'joystick' ? (
        /* Virtual Analog Stick Base (Enlarged w-36 h-36 to w-40 h-40) */
        <div
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full backdrop-blur-md border-2 shadow-2xl flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing select-none pointer-events-auto ${active
              ? 'bg-amber-950/60 border-amber-500/90 shadow-amber-500/40'
              : 'bg-stone-900/70 border-stone-700/80'
            }`}
        >
          {/* Cardinal direction indicators */}
          <div className="absolute top-2 w-2 h-2 rounded-full bg-amber-500/60" />
          <div className="absolute bottom-2 w-2 h-2 rounded-full bg-amber-500/60" />
          <div className="absolute left-2 w-2 h-2 rounded-full bg-amber-500/60" />
          <div className="absolute right-2 w-2 h-2 rounded-full bg-amber-500/60" />

          {/* Inner motion guide dashed circle */}
          <div className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-dashed border-stone-600/50 pointer-events-none" />

          {/* Joystick Knob (Enlarged w-14 h-14 to w-16 h-16) */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 shadow-2xl flex items-center justify-center pointer-events-none ${active
                ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-amber-200 shadow-amber-500/70 scale-105'
                : 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-stone-500 shadow-black'
              }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: active ? 'none' : 'transform 0.12s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            <div className="w-5 h-5 rounded-full bg-white/50 shadow-inner" />
          </div>
        </div>
      ) : (
        /* D-Pad Base (Enlarged w-36 h-36 to w-40 h-40 with w-11 h-11 buttons) */
        <div
          ref={dpadBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          className="relative w-36 h-36 sm:w-40 sm:h-40 bg-stone-900/80 backdrop-blur-md rounded-3xl border-2 border-stone-700/80 p-2 flex items-center justify-center shadow-2xl select-none pointer-events-auto"
        >
          <div
            className={`absolute top-2 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.up
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowUp className="w-6 h-6" />
          </div>

          <div
            className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.down
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowDown className="w-6 h-6" />
          </div>

          <div
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.left
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowLeft className="w-6 h-6" />
          </div>

          <div
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all pointer-events-none ${dpadVisual.right
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600'
              }`}
          >
            <ArrowRight className="w-6 h-6" />
          </div>

          <div className="w-4 h-4 rounded-full bg-stone-700/80 border border-stone-500/50 pointer-events-none" />
        </div>
      )}
    </div>
  );
};