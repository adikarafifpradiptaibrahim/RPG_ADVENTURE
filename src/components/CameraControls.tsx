import React from 'react';
import { Camera, Zap, Gauge, ArrowUp, ArrowDown, ChevronUp, ChevronDown, CheckCircle2, Eye, EyeOff } from 'lucide-react';
export * from '../game/CameraControls';
import {
  CAMERA_CONFIG,
  SPECTATOR_CONFIG,
  clampCameraPitch,
  clampCameraDistance,
  normalizeCameraYaw,
  calculateSpectatorSpeed,
  clampSpectatorSpeed,
} from '../game/CameraControls';

export interface CameraControlsProps {
  isSpectatorMode?: boolean;
  spectatorSpeed?: number;
  isUIVisible?: boolean;
  onToggleUIVisibility?: () => void;
  onToggleSpectator?: () => void;
  onLandSpectator?: () => void;
  onAdjustSpeed?: (delta: number) => void;
  onRotateCamera?: (deltaX: number, deltaY: number) => void;
  onZoomCamera?: (deltaZoom: number) => void;
}

/**
 * CameraControls Component / Spectator Freecam HUD
 * 
 * Provides unified camera configuration and interactive HUD overlay
 * for Variable Speed Spectator Freecam (F3):
 * - Sprint Fly (3x Speed) when holding [Shift]
 * - Slow Precision Fly (0.3x Speed) when holding [Ctrl] or [Alt]
 * - Scroll Wheel Mouse / On-screen steppers to tune base flight speed
 * - Hide UI / Cinematic toggle (H)
 */
export const CameraControls: React.FC<CameraControlsProps> = ({
  isSpectatorMode = false,
  spectatorSpeed = SPECTATOR_CONFIG.DEFAULT_SPEED,
  isUIVisible = true,
  onToggleUIVisibility,
  onToggleSpectator,
  onLandSpectator,
  onAdjustSpeed,
}) => {
  if (!isSpectatorMode) return null;

  // When UI is hidden for cinematic freecam, show only a sleek floating pill in the corner
  if (!isUIVisible) {
    return (
      <div className="pointer-events-none fixed top-4 right-4 z-50 select-none animate-fade-in">
        <button
          type="button"
          onClick={onToggleUIVisibility}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold shadow-2xl transition cursor-pointer active:scale-95 group"
          title="Tampilkan Kembali Seluruh UI (H)"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>👁️ Tampilkan UI (H)</span>
        </button>
      </div>
    );
  }

  const currentSpeed = Math.round(spectatorSpeed);
  const sprintSpeed = Math.round(spectatorSpeed * SPECTATOR_CONFIG.SPRINT_MULTIPLIER);
  const slowSpeed = (spectatorSpeed * SPECTATOR_CONFIG.SLOW_MULTIPLIER).toFixed(1);

  return (
    <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 animate-fade-in select-none">
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
    </div>
  );
};

export default CameraControls;
