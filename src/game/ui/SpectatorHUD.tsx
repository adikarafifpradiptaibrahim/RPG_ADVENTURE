import React, { useState, useEffect, useRef } from 'react';
import { Camera, Zap, Gauge, ChevronUp, ChevronDown, CheckCircle2, Eye, EyeOff, Sliders } from 'lucide-react';
import {
  SPECTATOR_CONFIG,
  calculateSpectatorSpeed,
} from '../CameraControls';
import { getCurrentRegion } from '../mapData';
import { WorldEditorPanel } from './WorldEditorPanel';

export interface SpectatorHUDProps {
  isSpectatorMode?: boolean;
  spectatorSpeed?: number;
  isUIVisible?: boolean;
  playerPos?: { x: number; y?: number; z: number; rotationY?: number };
  currentRegion?: any;
  gameEngine?: any;
  onToggleUIVisibility?: () => void;
  onToggleSpectator?: () => void;
  onLandSpectator?: () => void;
  onAdjustSpeed?: (delta: number) => void;
  onRotateCamera?: (deltaX: number, deltaY: number) => void;
  onZoomCamera?: (deltaZoom: number) => void;
}

/**
 * SpectatorHUD Component / Spectator Freecam Interface
 * 
 * Provides unified camera configuration and interactive HUD overlay
 * for Variable Speed Spectator Freecam (F3):
 * - Sprint Fly (3x Speed) when holding [Shift]
 * - Slow Precision Fly (0.3x Speed) when holding [Ctrl] or [Alt]
 * - Scroll Wheel Mouse / On-screen steppers to tune base flight speed
 * - Hide UI / Cinematic Photo Mode toggle (H)
 * - Safe & semi-transparent restore button on user activity (mouse/touch)
 */
export const SpectatorHUD: React.FC<SpectatorHUDProps> = ({
  isSpectatorMode = false,
  spectatorSpeed = SPECTATOR_CONFIG.DEFAULT_SPEED,
  isUIVisible = true,
  playerPos,
  currentRegion,
  gameEngine,
  onToggleUIVisibility,
  onToggleSpectator,
  onLandSpectator,
  onAdjustSpeed,
}) => {
  const [isActivityActive, setIsActivityActive] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);

  // Real-time coordinates and current region tracking for minimalist coordinate pill
  const [realtimePos, setRealtimePos] = useState({
    x: playerPos?.x ?? 0,
    y: playerPos?.y ?? 0,
    z: playerPos?.z ?? 0,
  });
  const [realtimeZone, setRealtimeZone] = useState<string>(
    currentRegion?.nameId || currentRegion?.name || ''
  );

  useEffect(() => {
    if (!isSpectatorMode) return;

    let animId: number;
    let lastTime = 0;

    const updateSpectatorCoords = (time: number) => {
      // Throttle update to ~25fps (every 40ms) to ensure smooth display without CPU overhead
      if (time - lastTime > 40) {
        lastTime = time;

        let posX = 0;
        let posY = 0;
        let posZ = 0;

        if (gameEngine?.spectatorPos) {
          posX = gameEngine.spectatorPos.x;
          posY = gameEngine.spectatorPos.y;
          posZ = gameEngine.spectatorPos.z;
        } else if (gameEngine?.getSpectatorPos) {
          const sp = gameEngine.getSpectatorPos();
          posX = sp.x;
          posY = sp.y;
          posZ = sp.z;
        } else if (playerPos) {
          posX = playerPos.x;
          posY = playerPos.y ?? 0;
          posZ = playerPos.z;
        }

        setRealtimePos({ x: posX, y: posY, z: posZ });

        try {
          const reg = getCurrentRegion(posX, posZ);
          if (reg) {
            setRealtimeZone(reg.nameId || reg.name || '');
          }
        } catch {
          if (currentRegion?.nameId || currentRegion?.name) {
            setRealtimeZone(currentRegion.nameId || currentRegion.name);
          }
        }
      }

      animId = requestAnimationFrame(updateSpectatorCoords);
    };

    animId = requestAnimationFrame(updateSpectatorCoords);
    return () => cancelAnimationFrame(animId);
  }, [isSpectatorMode, gameEngine, playerPos, currentRegion]);

  // Monitor mouse movement & touch events to show the sleek restore button when UI is hidden
  useEffect(() => {
    if (isUIVisible || !isSpectatorMode) return;

    const handleUserActivity = () => {
      setIsActivityActive(true);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      fadeTimeoutRef.current = window.setTimeout(() => {
        setIsActivityActive(false);
      }, 3500);
    };

    // Initial timer
    handleUserActivity();

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('pointermove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('pointermove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [isUIVisible, isSpectatorMode]);

  if (!isSpectatorMode) return null;

  const currentSpeed = Math.round(spectatorSpeed);
  const sprintSpeed = Math.round(spectatorSpeed * SPECTATOR_CONFIG.SPRINT_MULTIPLIER);
  const slowSpeed = (spectatorSpeed * SPECTATOR_CONFIG.SLOW_MULTIPLIER).toFixed(1);

  return (
    <>
      {/* 1. Main Spectator Freecam Banner & Controls (Hidden with CSS opacity when isUIVisible is false) */}
      <div
        className={`pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 transition-all duration-300 select-none ${
          isUIVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Top Main Freecam Banner */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-2xl text-white">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs tracking-wider uppercase">
            <Camera className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Mode Spektator (F3)</span>
          </div>

          <div className="h-4 w-px bg-slate-700/80" />

          {/* Dynamic Speed Readout & Steppers */}
          <div className="flex items-center gap-1.5 text-xs">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-semibold text-amber-300">
              {currentSpeed} m/s
            </span>

            {onAdjustSpeed && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => onAdjustSpeed(-SPECTATOR_CONFIG.SCROLL_STEP)}
                  className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Kurangi Kecepatan Dasar Terbang"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustSpeed(SPECTATOR_CONFIG.SCROLL_STEP)}
                  className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Tambah Kecepatan Dasar Terbang"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-700/80" />

          {/* Action Buttons: Hide UI / Land / Exit */}
          <div className="flex items-center gap-1.5">
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen((prev) => {
                    const next = !prev;
                    if (gameEngine?.toggleWorldEditor) {
                      gameEngine.toggleWorldEditor(next);
                    }
                    return next;
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border shadow transition cursor-pointer active:scale-95 ${
                  isEditorOpen
                    ? 'bg-cyan-500 text-white border-cyan-300 shadow-cyan-900/50'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border-cyan-500/40'
                }`}
                title="Buka / Tutup Mode Editor Peta Dunia (Dev Mode Only)"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>🛠️ Mode Editor Peta</span>
              </button>
            )}

            {onToggleUIVisibility && (
              <button
                type="button"
                onClick={onToggleUIVisibility}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-medium border border-slate-700 shadow transition cursor-pointer active:scale-95"
                title="Sembunyikan Seluruh UI untuk Tampilan Sinematik (H)"
              >
                <EyeOff className="w-3 h-3 text-cyan-400" />
                <span>Sembunyikan UI (H)</span>
              </button>
            )}

            {onLandSpectator && (
              <button
                type="button"
                onClick={onLandSpectator}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-emerald-100 text-[11px] font-medium shadow transition cursor-pointer active:scale-95"
                title="Mendaratkan Karakter pada Posisi Kamera Saat Ini"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Mendarat Disini</span>
              </button>
            )}

            {onToggleSpectator && (
              <button
                type="button"
                onClick={onToggleSpectator}
                className="px-2 py-1 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-rose-100 text-[11px] font-medium transition cursor-pointer active:scale-95"
                title="Keluar dari Mode Spektator"
              >
                Tutup (F3)
              </button>
            )}
          </div>
        </div>

        {/* Speed Multiplier & Navigation Legend Pills */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-[10px] text-slate-300 shadow">
          <span className="flex items-center gap-1 text-cyan-300 font-semibold">
            <Zap className="w-3 h-3 text-cyan-400" />
            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono">Shift</kbd> Sprint ({sprintSpeed} m/s)
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-emerald-300 font-semibold">
            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono">Ctrl / Alt</kbd> Presisi ({slowSpeed} m/s)
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-amber-300 font-semibold">
            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono">Scroll</kbd> Atur Kecepatan
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">
            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono">Spasi</kbd> Naik | <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono">Q / E / C</kbd> Turun
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-sky-300 font-semibold">
            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono">H</kbd> Sembunyikan UI
          </span>
        </div>

        {/* World Editor Inspector Panel (Dev Mode Only) */}
        {import.meta.env.DEV && isEditorOpen && isUIVisible && (
          <WorldEditorPanel
            gameEngine={gameEngine}
            onClose={() => {
              setIsEditorOpen(false);
              if (gameEngine?.toggleWorldEditor) {
                gameEngine.toggleWorldEditor(false);
              }
            }}
          />
        )}
      </div>

      {/* 2. Floating Semi-Transparent Restore Button (Visible when UI is hidden) */}
      <div
        className={`pointer-events-none fixed top-4 right-4 z-50 select-none transition-all duration-300 ${
          !isUIVisible
            ? isActivityActive
              ? 'opacity-90 pointer-events-auto scale-100'
              : 'opacity-35 hover:opacity-100 pointer-events-auto scale-100'
            : 'opacity-0 pointer-events-none scale-95'
        }`}
      >
        <button
          type="button"
          onClick={onToggleUIVisibility}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold shadow-2xl transition cursor-pointer active:scale-95 group"
          title="Tampilkan Kembali Seluruh UI (Tekan H / Esc)"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>👁️ Tampilkan UI (H)</span>
        </button>
      </div>

      {/* 3. Floating Quick Hint Toast on Hide UI (Fades out automatically after activity timeout) */}
      <div
        className={`pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-50 select-none transition-all duration-500 ${
          !isUIVisible && isActivityActive
            ? 'opacity-90 translate-y-0'
            : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <div className="px-4 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/35 text-cyan-200 text-xs shadow-2xl flex items-center gap-2 font-medium">
          <span>Mode Sinematik Aktif — Tekan</span>
          <kbd className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-[11px] font-mono text-cyan-300">H</kbd>
          <span>atau klik tombol mata di pojok untuk menampilkan UI</span>
        </div>
      </div>

      {/* 4. Minimalist Real-Time Coordinate Pill on Hide UI (H) in Spectator Mode */}
      {!isUIVisible && (
        <div className="fixed bottom-4 left-4 z-50 pointer-events-none select-none">
          <div className="bg-black/45 backdrop-blur-sm text-white/85 text-xs font-mono px-2.5 py-1 rounded-md pointer-events-none flex items-center gap-2 border border-white/10 shadow-lg">
            <span>
              X: {Math.round(realtimePos.x)}&nbsp;&nbsp;Y: {Math.round(realtimePos.y)}&nbsp;&nbsp;Z: {Math.round(realtimePos.z)}
            </span>
            {realtimeZone && (
              <>
                <span className="text-white/35">•</span>
                <span className="text-cyan-300/90 font-sans font-medium text-[11px] truncate max-w-[240px]">
                  {realtimeZone}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SpectatorHUD;
