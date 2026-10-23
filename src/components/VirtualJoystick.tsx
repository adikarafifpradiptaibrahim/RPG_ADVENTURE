import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Disc, Crosshair, EyeOff } from 'lucide-react';

export type TouchControlMode = 'joystick' | 'dpad';

const CONTROL_MODE_STORAGE_KEY = 'eldoria_touch_control_mode';

export function getSavedControlMode(): TouchControlMode {
  if (typeof window === 'undefined') return 'joystick';
  try {
    const saved = localStorage.getItem(CONTROL_MODE_STORAGE_KEY);
    if (saved === 'joystick' || saved === 'dpad') return saved;
  } catch {}
  return 'joystick';
}

export function setSavedControlMode(mode: TouchControlMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONTROL_MODE_STORAGE_KEY, mode);
  } catch {}
}

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onHide?: () => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onHide }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [controlMode, setControlMode] = useState<TouchControlMode>(() => getSavedControlMode());
  const activePointerIdRef = useRef<number | null>(null);

  // D-Pad active keys state
  const dpadPressedRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const [dpadVisual, setDpadVisual] = useState({ up: false, down: false, left: false, right: false });

  const maxRadius = 46;
  const DEADZONE = 8; // minimum pixel movement to register

  // Dispatch current vector safely to parent
  const sendMove = useCallback(
    (vec: { x: number; y: number }) => {
      onMove(vec);
    },
    [onMove]
  );

  // Force stop all movement
  const stopAllMovement = useCallback(() => {
    activePointerIdRef.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    dpadPressedRef.current = { up: false, down: false, left: false, right: false };
    setDpadVisual({ up: false, down: false, left: false, right: false });
    sendMove({ x: 0, y: 0 });
  }, [sendMove]);

  // Window global safety net: when finger or mouse lifts ANYWHERE in the window or window blurs
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (
        active ||
        dpadPressedRef.current.up ||
        dpadPressedRef.current.down ||
        dpadPressedRef.current.left ||
        dpadPressedRef.current.right
      ) {
        stopAllMovement();
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);
    document.addEventListener('visibilitychange', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
      document.removeEventListener('visibilitychange', handleGlobalRelease);
      stopAllMovement();
    };
  }, [active, stopAllMovement]);

  // JOYSTICK: Touch/Pointer calculation
  const updateKnob = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      // Deadzone: prevent accidental micro-movements
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

      // Normalize output (-1 to 1) with subtle linear-quadratic response for precision
      const normDist = (clampedDist - DEADZONE) / (maxRadius - DEADZONE);
      sendMove({
        x: Math.cos(angle) * normDist,
        y: Math.sin(angle) * normDist,
      });
    },
    [sendMove]
  );

  // Native non-passive touch event listeners for instant touch response without browser scroll
  useEffect(() => {
    const el = baseRef.current;
    if (!el || controlMode !== 'joystick') return;

    let touchIdentifier: number | null = null;

    const handleNativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0 && touchIdentifier === null) {
        const touch = e.touches[0];
        touchIdentifier = touch.identifier;
        setActive(true);
        updateKnob(touch.clientX, touch.clientY);
      }
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (touchIdentifier === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdentifier) {
          updateKnob(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    };

    const handleNativeTouchEnd = (e: TouchEvent) => {
      if (touchIdentifier === null) return;
      let stillPresent = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdentifier) {
          stillPresent = true;
          break;
        }
      }
      if (!stillPresent) {
        touchIdentifier = null;
        stopAllMovement();
      }
    };

    el.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    window.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    window.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleNativeTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleNativeTouchStart);
      window.removeEventListener('touchmove', handleNativeTouchMove);
      window.removeEventListener('touchend', handleNativeTouchEnd);
      window.removeEventListener('touchcancel', handleNativeTouchEnd);
    };
  }, [controlMode, updateKnob, stopAllMovement]);

  // Pointer events fallback for Desktop Mouse / Stylus
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return; // Handled by native touch listener
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    activePointerIdRef.current = e.pointerId;
    setActive(true);
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (!active || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (activePointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      stopAllMovement();
    }
  };

  // DPAD: Button Handlers
  const handleDpadButton = (dir: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => {
    dpadPressedRef.current[dir] = isPressed;
    setDpadVisual({ ...dpadPressedRef.current });

    let x = 0;
    let y = 0;
    if (dpadPressedRef.current.left) x -= 1;
    if (dpadPressedRef.current.right) x += 1;
    if (dpadPressedRef.current.up) y -= 1;
    if (dpadPressedRef.current.down) y += 1;

    // Normalize diagonal D-pad movement
    if (x !== 0 && y !== 0) {
      const mag = Math.SQRT2;
      x /= mag;
      y /= mag;
    }

    sendMove({ x, y });
  };

  const switchMode = (mode: TouchControlMode) => {
    stopAllMovement();
    setControlMode(mode);
    setSavedControlMode(mode);
  };

  return (
    <div
      style={{ touchAction: 'none', pointerEvents: 'auto', zIndex: 9999 }}
      className="touch-control-layer virtual-joystick-root fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[9999] select-none flex flex-col items-start gap-1.5"
    >
      {/* Mode Switcher pill */}
      <div className="flex items-center gap-1 bg-stone-950/90 backdrop-blur-md px-2 py-1 rounded-full border border-stone-800 text-[10px] text-stone-300 shadow-lg mb-1">
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            switchMode('joystick');
          }}
          onClick={() => switchMode('joystick')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full transition-all cursor-pointer font-bold ${
            controlMode === 'joystick'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Disc className="w-3 h-3" />
          <span>Analog</span>
        </button>
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            switchMode('dpad');
          }}
          onClick={() => switchMode('dpad')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full transition-all cursor-pointer font-bold ${
            controlMode === 'dpad'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Crosshair className="w-3 h-3" />
          <span>D-Pad</span>
        </button>
        {onHide && (
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              stopAllMovement();
              onHide();
            }}
            onClick={() => {
              stopAllMovement();
              onHide();
            }}
            title="Sembunyikan kontroler analog/D-pad"
            className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700 transition cursor-pointer"
          >
            <EyeOff className="w-3 h-3 text-stone-300" />
            <span className="text-[9px]">Sembunyikan</span>
          </button>
        )}
      </div>

      {controlMode === 'joystick' ? (
        /* Virtual Analog Stick */
        <div
          ref={baseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className={`relative w-36 h-36 rounded-full backdrop-blur-md border-2 shadow-2xl flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing select-none ${
            active
              ? 'bg-amber-950/50 border-amber-500/90 shadow-amber-500/30'
              : 'bg-stone-900/70 border-stone-700/80'
          }`}
        >
          {/* Directional Accent Guides */}
          <div className="absolute top-2 w-2 h-2 rounded-full bg-amber-500/60" />
          <div className="absolute bottom-2 w-2 h-2 rounded-full bg-amber-500/60" />
          <div className="absolute left-2 w-2 h-2 rounded-full bg-amber-500/60" />
          <div className="absolute right-2 w-2 h-2 rounded-full bg-amber-500/60" />

          {/* Central Deadzone Ring */}
          <div className="absolute w-10 h-10 rounded-full border border-dashed border-stone-600/50 pointer-events-none" />

          {/* Joystick Knob */}
          <div
            className={`w-14 h-14 rounded-full border-2 shadow-xl flex items-center justify-center pointer-events-none transition-shadow ${
              active
                ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-amber-200 shadow-amber-500/60 scale-105'
                : 'bg-gradient-to-b from-stone-750 via-stone-800 to-stone-900 border-stone-500 shadow-black'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: active ? 'none' : 'transform 0.14s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            <div className="w-5 h-5 rounded-full bg-white/50 shadow-inner" />
          </div>
        </div>
      ) : (
        /* Discrete 4-Way D-Pad */
        <div
          style={{ touchAction: 'none' }}
          className="relative w-36 h-36 bg-stone-900/80 backdrop-blur-md rounded-2xl border-2 border-stone-700/80 p-1 flex items-center justify-center shadow-2xl select-none"
        >
          {/* UP Button */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('up', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('up', false);
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              handleDpadButton('up', false);
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('up', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
              handleDpadButton('up', false);
            }}
            onPointerCancel={() => handleDpadButton('up', false)}
            style={{ touchAction: 'none' }}
            className={`absolute top-2 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              dpadVisual.up
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600 hover:bg-stone-700'
            }`}
            title="Maju (W / Atas)"
          >
            <ArrowUp className="w-6 h-6" />
          </button>

          {/* DOWN Button */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('down', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('down', false);
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              handleDpadButton('down', false);
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('down', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
              handleDpadButton('down', false);
            }}
            onPointerCancel={() => handleDpadButton('down', false)}
            style={{ touchAction: 'none' }}
            className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              dpadVisual.down
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600 hover:bg-stone-700'
            }`}
            title="Mundur (S / Bawah)"
          >
            <ArrowDown className="w-6 h-6" />
          </button>

          {/* LEFT Button */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('left', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('left', false);
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              handleDpadButton('left', false);
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('left', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
              handleDpadButton('left', false);
            }}
            onPointerCancel={() => handleDpadButton('left', false)}
            style={{ touchAction: 'none' }}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              dpadVisual.left
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600 hover:bg-stone-700'
            }`}
            title="Kiri (A)"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* RIGHT Button */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('right', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDpadButton('right', false);
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              handleDpadButton('right', false);
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('right', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
              handleDpadButton('right', false);
            }}
            onPointerCancel={() => handleDpadButton('right', false)}
            style={{ touchAction: 'none' }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              dpadVisual.right
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-200 border-stone-600 hover:bg-stone-700'
            }`}
            title="Kanan (D)"
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          {/* Center Pivot Indicator */}
          <div className="w-4 h-4 rounded-full bg-stone-700/80 border border-stone-500/50" />
        </div>
      )}
    </div>
  );
};
