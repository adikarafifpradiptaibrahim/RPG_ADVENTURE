import React from 'react';
import {
  Play,
  LogOut,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  ShieldAlert,
  Gamepad2,
  Users,
  Compass,
} from 'lucide-react';
import { soundManager } from '../game/audio';

interface PauseModalProps {
  isOpen: boolean;
  gameMode: 'singleplayer' | 'multiplayer';
  multiplayerRoom?: string;
  playerName?: string;
  connectedPlayersCount?: number;
  onResume: () => void;
  onReturnToMainMenu: () => void;
  onDisconnectAndReturnToMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  gameMode,
  multiplayerRoom = 'Eldoria-Global',
  playerName = 'Pahlawan',
  connectedPlayersCount = 1,
  onResume,
  onReturnToMainMenu,
  onDisconnectAndReturnToMainMenu,
}) => {
  const [isMuted, setIsMuted] = React.useState(soundManager.getMuted());

  if (!isOpen) return null;

  const toggleMute = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  const isSingle = gameMode === 'singleplayer';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pause Menu"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-stone-900 via-stone-950 to-black p-6 shadow-2xl shadow-black/90">
        {/* Glow ambient background */}
        <div
          className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-20 ${
            isSingle ? 'bg-amber-400' : 'bg-cyan-400'
          }`}
        />

        {/* Header Status */}
        <div className="relative text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase border mb-3 ${
              isSingle
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
            }`}
          >
            {isSingle ? (
              <>
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Single Player Mode</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>Multiplayer Online</span>
              </>
            )}
          </div>

          <h2 className="text-2xl font-black text-amber-100 tracking-wide font-serif">
            {isSingle ? '⏸️ PERMAINAN DIHENTIKAN' : '🌐 MENU MULTIPLAYER'}
          </h2>

          <p className="mt-1 text-xs text-stone-400">
            {isSingle
              ? 'Waktu permainan, monster AI, dan pergerakan karakter dihentikan sementara.'
              : 'Dunia online dan server Socket.io tetap berjalan secara real-time.'}
          </p>
        </div>

        {/* Multiplayer Real-time Alert */}
        {!isSingle && (
          <div className="relative mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-300">Peringatan Real-time:</span>
                <p className="mt-0.5 text-red-300/80 leading-relaxed">
                  Permainan <strong>tidak berhenti</strong> saat menu ini terbuka karena terhubung ke server Ubuntu. Monster dan pemain lain tetap dapat berinteraksi secara langsung.
                </p>
              </div>
            </div>

            {/* Room Info */}
            <div className="mt-3 grid grid-cols-2 gap-2 pt-2.5 border-t border-red-500/20 text-[11px]">
              <div className="flex items-center gap-1.5 text-stone-300">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Room: <strong className="text-white">{multiplayerRoom}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-300">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online: <strong className="text-white">{connectedPlayersCount} Player</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Single Player Info Box */}
        {isSingle && (
          <div className="relative mt-4 rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-center text-xs text-stone-300">
            <p className="text-stone-400">
              Tekan <kbd className="rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">Esc</kbd> kapan saja untuk langsung melanjutkan permainan.
            </p>
          </div>
        )}

        {/* Audio Quick Control */}
        <div className="relative mt-4 flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-2.5 text-xs">
          <span className="text-stone-300 flex items-center gap-2">
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            Audio Efek & Musik
          </span>
          <button
            onClick={toggleMute}
            className={`rounded-lg px-2.5 py-1 font-semibold transition text-xs ${
              isMuted
                ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                : 'bg-amber-600/30 text-amber-300 border border-amber-500/50 hover:bg-amber-600/40'
            }`}
          >
            {isMuted ? 'Muted (Bisu)' : 'Aktif'}
          </button>
        </div>

        {/* Menu Buttons */}
        <div className="relative mt-5 flex flex-col gap-2.5">
          {/* Resume Button */}
          <button
            onClick={onResume}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 px-4 py-3 font-bold text-white shadow-lg shadow-amber-900/30 transition active:scale-98"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Lanjutkan Permainan (Resume)</span>
            <span className="ml-auto rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
              ESC
            </span>
          </button>

          {/* Action button based on mode */}
          {isSingle ? (
            /* Single Player: Return to Main Menu */
            <button
              onClick={onReturnToMainMenu}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-900/80 hover:bg-stone-800 px-4 py-3 font-semibold text-stone-200 hover:text-white transition active:scale-98"
            >
              <LogOut className="w-4 h-4 text-stone-400" />
              <span>Return to Main Menu</span>
            </button>
          ) : (
            /* Multiplayer: Disconnect & Return to Main Menu */
            <button
              onClick={onDisconnectAndReturnToMainMenu}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 px-4 py-3 font-bold text-red-100 hover:text-white shadow-lg shadow-red-950/40 transition active:scale-98"
            >
              <WifiOff className="w-4 h-4 text-red-400" />
              <span>Disconnect & Return to Main Menu</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
