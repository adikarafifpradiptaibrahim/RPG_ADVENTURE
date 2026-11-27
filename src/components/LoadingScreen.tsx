import React from 'react';
import { Sparkles } from 'lucide-react';
import { useMobileViewport } from '../game/utils/mobileViewport';

interface LoadingScreenProps {
  isLoading: boolean;
  isFadingOut?: boolean;
  message?: string;
  progress?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading,
  isFadingOut = false,
  message = 'Memuat Dunia & Mengompilasi Shader...',
  progress,
}) => {
  const { isMobileLandscape } = useMobileViewport();
  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 h-[100dvh] flex flex-col items-center justify-center bg-black/95 select-none transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundImage: 'radial-gradient(circle at center, rgba(30, 20, 10, 0.7) 0%, rgba(5, 5, 8, 0.98) 75%)',
      }}
    >
      {/* Ancient's Quest Logo & Title */}
      <div className={`text-center animate-pulse ${isMobileLandscape ? 'mb-3' : 'mb-8'}`}>
        <h1
          className={`${isMobileLandscape ? 'text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'} font-black tracking-widest uppercase font-serif`}
          style={{
            color: '#fbbf24',
            textShadow: '0 3px 0 #92400e, 0 6px 16px rgba(0,0,0,0.9), 0 0 25px rgba(245,158,11,0.5)',
          }}
        >
          ANCIENT'S QUEST
        </h1>
        <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-amber-200/70 mt-1">
          Petualangan Dunia 3D Eldoria
        </p>
      </div>

      {/* Rotating Magic Circle Spinner */}
      <div className={`relative flex items-center justify-center ${isMobileLandscape ? 'w-16 h-16 my-2' : 'w-24 h-24 sm:w-28 sm:h-28 my-4'}`}>
        {/* Outer Rune Ring (Slow Clockwise) */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/60 animate-spin"
          style={{ animationDuration: '8s' }}
        />
        {/* Middle Cyan Energy Ring (Counter-Clockwise) */}
        <div
          className="absolute inset-2 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-cyan-500 border-l-transparent animate-spin"
          style={{ animationDuration: '3s', animationDirection: 'reverse' }}
        />
        {/* Inner Golden Ring */}
        <div
          className="absolute inset-5 rounded-full border border-amber-300/80 animate-ping opacity-30"
          style={{ animationDuration: '2s' }}
        />
        {/* Central Glowing Sparkle */}
        <Sparkles className="w-8 h-8 text-amber-300 animate-pulse drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
      </div>

      {/* Loading Status Message & Percentage Progress Bar */}
      <div className={`${isMobileLandscape ? 'mt-3 gap-1.5' : 'mt-6 gap-2.5'} flex flex-col items-center text-center px-4 w-full max-w-sm sm:max-w-md`}>
        <span className="text-sm sm:text-base font-bold text-amber-100 tracking-wide min-h-[1.5rem]">
          {message}
        </span>
        <div className="w-full h-2.5 bg-stone-900/90 rounded-full overflow-hidden border border-amber-500/30 p-[1px] shadow-[0_0_12px_rgba(245,158,11,0.2)]">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-300 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(progress !== undefined ? progress : 100, 5))}%` }}
          />
        </div>
        {progress !== undefined && (
          <span className="text-xs font-mono font-bold tracking-widest text-amber-300/80">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
};

