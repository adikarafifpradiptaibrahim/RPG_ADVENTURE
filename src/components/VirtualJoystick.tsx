import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Disc, Crosshair, EyeOff } from 'lucide-react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onHide?: () => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onHide }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [controlMode, setControlMode] = useState<'joystick' | 'dpad'>('joystick');
  const activePointerIdRef = useRef<number | null>(null);

  // D-Pad active keys state
  const dpadPressedRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const [dpadVisual, setDpadVisual] = useState({ up: false, down: false, left: false, right: false });

  const maxRadius = 44;
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
      if (active || dpadPressedRef.current.up || dpadPressedRef.current.down || dpadPressedRef.current.left || dpadPressedRef.current.right) {
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

  // JOYSTICK: Pointer move calculation
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

      // Normalize output (-1 to 1) with quadratic curve for subtle touch precision
      const normDist = (clampedDist - DEADZONE) / (maxRadius - DEADZONE);
      sendMove({
        x: Math.cos(angle) * normDist,
        y: Math.sin(angle) * normDist,
      });
    },
    [sendMove]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore in older browsers
    }
    activePointerIdRef.current = e.pointerId;
    setActive(true);
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
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

  return (
    <div className="pointer-events-auto absolute bottom-24 left-4 sm:left-6 z-30 select-none touch-none flex flex-col items-start gap-1">
      {/* Mode Switcher pill */}
      <div className="flex items-center gap-1 bg-stone-950/85 backdrop-blur-md px-2 py-1 rounded-full border border-stone-800 text-[10px] text-stone-300 shadow mb-1">
        <button
          onClick={() => {
            stopAllMovement();
            setControlMode('joystick');
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all cursor-pointer font-bold ${
            controlMode === 'joystick'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Disc className="w-3 h-3" />
          <span>Analog</span>
        </button>
        <button
          onClick={() => {
            stopAllMovement();
            setControlMode('dpad');
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all cursor-pointer font-bold ${
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
            onClick={() => {
              stopAllMovement();
              onHide();
            }}
            title="Sembunyikan kontroler analog/D-pad (bisa ditampilkan lagi lewat tombol di menu atas)"
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
          className={`relative w-32 h-32 rounded-full backdrop-blur-md border-2 shadow-2xl flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing ${
            active
              ? 'bg-amber-950/40 border-amber-500/80 shadow-amber-500/20'
              : 'bg-stone-900/60 border-stone-700/80'
          }`}
        >
          {/* Directional Accent Guides */}
          <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-stone-600/70" />
          <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-stone-600/70" />
          <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-stone-600/70" />
          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-stone-600/70" />

          {/* Central Deadzone Ring */}
          <div className="absolute w-8 h-8 rounded-full border border-dashed border-stone-700/50 pointer-events-none" />

          {/* Joystick Knob */}
          <div
            className={`w-14 h-14 rounded-full border-2 shadow-lg flex items-center justify-center pointer-events-none transition-shadow ${
              active
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-200 shadow-amber-500/50 scale-105'
                : 'bg-gradient-to-b from-stone-700 to-stone-800 border-stone-500 shadow-black'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: active ? 'none' : 'transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/40 shadow-inner" />
          </div>
        </div>
      ) : (
        /* Discrete 4-Way D-Pad (Cannot stick!) */
        <div className="relative w-32 h-32 bg-stone-900/70 backdrop-blur-md rounded-2xl border-2 border-stone-700/80 p-1 flex items-center justify-center shadow-2xl">
          {/* UP Button */}
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('up', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // Ignore
              }
              handleDpadButton('up', false);
            }}
            onPointerCancel={() => handleDpadButton('up', false)}
            onPointerLeave={() => handleDpadButton('up', false)}
            className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              dpadVisual.up
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-300 border-stone-600 hover:bg-stone-700'
            }`}
            title="Maju (W / Atas)"
          >
            <ArrowUp className="w-5 h-5" />
          </button>

          {/* DOWN Button */}
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('down', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // Ignore
              }
              handleDpadButton('down', false);
            }}
            onPointerCancel={() => handleDpadButton('down', false)}
            onPointerLeave={() => handleDpadButton('down', false)}
            className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              dpadVisual.down
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-300 border-stone-600 hover:bg-stone-700'
            }`}
            title="Mundur (S / Bawah)"
          >
            <ArrowDown className="w-5 h-5" />
          </button>

          {/* LEFT Button */}
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('left', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // Ignore
              }
              handleDpadButton('left', false);
            }}
            onPointerCancel={() => handleDpadButton('left', false)}
            onPointerLeave={() => handleDpadButton('left', false)}
            className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              dpadVisual.left
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-300 border-stone-600 hover:bg-stone-700'
            }`}
            title="Kiri (A)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* RIGHT Button */}
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDpadButton('right', true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // Ignore
              }
              handleDpadButton('right', false);
            }}
            onPointerCancel={() => handleDpadButton('right', false)}
            onPointerLeave={() => handleDpadButton('right', false)}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              dpadVisual.right
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-95'
                : 'bg-stone-800/90 text-stone-300 border-stone-600 hover:bg-stone-700'
            }`}
            title="Kanan (D)"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Center Pivot Indicator */}
          <div className="w-4 h-4 rounded-full bg-stone-700/80 border border-stone-500/50" />
        </div>
      )}
    </div>
  );
};
