import React from 'react';
import { Map, Navigation } from 'lucide-react';
import { MapMarker, RegionInfo } from '../types/game';

interface MiniMapProps {
  playerPos: { x: number; z: number; rotationY: number };
  currentRegion: RegionInfo;
  markers: MapMarker[];
  onOpenFullMap: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerPos,
  currentRegion,
  markers,
  onOpenFullMap,
}) => {
  // Radar radius in world units
  const radarRadius = 38;

  return (
    <div className="flex flex-col items-end gap-1 select-none pointer-events-none">
      {/* Current Region Badge */}
      <div
        onClick={onOpenFullMap}
        className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-stone-900/90 border border-stone-700/80 rounded-full shadow-lg backdrop-blur-md cursor-pointer hover:border-amber-400/70 transition-all group max-w-[125px] sm:max-w-none truncate"
        title="Klik untuk membuka Peta Dunia (M)"
      >
        <span className="text-xs sm:text-sm">{currentRegion.icon}</span>
        <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-amber-200 group-hover:text-amber-300 truncate">
          {currentRegion.nameId}
        </span>
        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 sm:py-0.5 bg-stone-800 text-stone-300 rounded font-mono flex-shrink-0">
          Lv.{currentRegion.recommendedLevel}
        </span>
      </div>

      {/* Circular Radar Canvas: 110px on mobile (15% reduction from 130px), 130px on desktop */}
      <div
        onClick={onOpenFullMap}
        className="pointer-events-auto relative w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-full overflow-hidden border-2 border-stone-700/90 bg-stone-950/85 shadow-2xl backdrop-blur-md cursor-pointer group hover:border-amber-500/80 transition-all flex-shrink-0"
        title="Klik untuk membuka Peta Lengkap (M)"
      >
        {/* Terrain Background Tint based on region */}
        <div
          className="absolute inset-0 opacity-25 transition-colors duration-700"
          style={{ backgroundColor: currentRegion.color }}
        />

        {/* Radar concentric rings */}
        <div className="absolute inset-0 rounded-full border border-stone-700/40" />
        <div className="absolute inset-3 sm:inset-4 rounded-full border border-stone-700/30" />
        <div className="absolute inset-6 sm:inset-8 rounded-full border border-stone-700/20" />

        {/* Cardinal directions */}
        <span className="absolute top-0.5 sm:top-1 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold text-amber-400/90">
          N
        </span>
        <span className="absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold text-stone-400">
          S
        </span>
        <span className="absolute left-1 sm:left-1.5 top-1/2 -translate-y-1/2 text-[8px] sm:text-[9px] font-bold text-stone-400">
          W
        </span>
        <span className="absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-[8px] sm:text-[9px] font-bold text-stone-400">
          E
        </span>

        {/* Crosshairs */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-stone-700/30 -translate-x-1/2" />
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-stone-700/30 -translate-y-1/2" />

        {/* Markers around player - Percentage based scaling */}
        {markers.map((marker) => {
          const relX = marker.x - playerPos.x;
          const relZ = marker.z - playerPos.z;
          const dist = Math.hypot(relX, relZ);

          if (dist > radarRadius) return null;

          const percentX = 50 + (relX / radarRadius) * 42;
          const percentY = 50 + (relZ / radarRadius) * 42;

          return (
            <div
              key={marker.id}
              className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full shadow-sm flex items-center justify-center transition-all"
              style={{
                left: `${percentX}%`,
                top: `${percentY}%`,
                backgroundColor: marker.color || '#fff',
              }}
              title={marker.title}
            >
              {marker.type === 'boss' && (
                <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-red-500 animate-ping opacity-75" />
              )}
            </div>
          );
        })}

        {/* Player Indicator in Center */}
        <div
          className="absolute left-1/2 top-1/2 -ml-2 -mt-2 w-4 h-4 flex items-center justify-center pointer-events-none"
          style={{
            transform: `rotate(${(playerPos.rotationY * 180) / Math.PI + 180}deg)`,
          }}
        >
          <Navigation className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400 fill-amber-400 drop-shadow-md" />
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-amber-200">
          <Map className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5" />
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Buka Peta (M)</span>
        </div>
      </div>

      {/* Coordinate & Hotkey readout */}
      <div className="flex items-center justify-between w-[110px] sm:w-[130px] px-1.5 sm:px-2 py-0.5 bg-stone-900/80 border border-stone-800 rounded text-[9px] sm:text-[10px] text-stone-400 font-mono">
        <span className="truncate">
          X:{Math.round(playerPos.x)} Z:{Math.round(playerPos.z)}
        </span>
        <button
          onClick={onOpenFullMap}
          className="text-amber-400 font-bold hover:text-amber-300 ml-1"
        >
          [M]
        </button>
      </div>
    </div>
  );
};

export default MiniMap;
