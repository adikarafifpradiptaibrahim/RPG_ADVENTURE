import React from 'react';
import { Map, Compass, Navigation } from 'lucide-react';
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
  const mapSize = 130;
  const center = mapSize / 2;

  return (
    <div className="flex flex-col items-end gap-1.5 select-none pointer-events-auto">
      {/* Current Region Badge */}
      <div
        onClick={onOpenFullMap}
        className="flex items-center gap-1.5 px-3 py-1 bg-stone-900/90 border border-stone-700/80 rounded-full shadow-lg backdrop-blur-md cursor-pointer hover:border-amber-400/70 transition-all group"
        title="Klik untuk membuka Peta Dunia (M)"
      >
        <span className="text-sm">{currentRegion.icon}</span>
        <span className="text-xs font-semibold tracking-wide text-amber-200 group-hover:text-amber-300">
          {currentRegion.nameId}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-stone-800 text-stone-300 rounded font-mono">
          Lv.{currentRegion.recommendedLevel}
        </span>
      </div>

      {/* Circular Radar Canvas */}
      <div
        onClick={onOpenFullMap}
        className="relative w-[130px] h-[130px] rounded-full overflow-hidden border-2 border-stone-700/90 bg-stone-950/85 shadow-2xl backdrop-blur-md cursor-pointer group hover:border-amber-500/80 transition-all"
        title="Klik untuk membuka Peta Lengkap (M)"
      >
        {/* Terrain Background Tint based on region */}
        <div
          className="absolute inset-0 opacity-25 transition-colors duration-700"
          style={{ backgroundColor: currentRegion.color }}
        />

        {/* Radar concentric rings */}
        <div className="absolute inset-0 rounded-full border border-stone-700/40" />
        <div className="absolute inset-4 rounded-full border border-stone-700/30" />
        <div className="absolute inset-8 rounded-full border border-stone-700/20" />

        {/* Cardinal directions */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-400/90">
          N
        </span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-400">
          S
        </span>
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-stone-400">
          W
        </span>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-stone-400">
          E
        </span>

        {/* Crosshairs */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-stone-700/30 -translate-x-1/2" />
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-stone-700/30 -translate-y-1/2" />

        {/* Markers around player */}
        {markers.map((marker) => {
          // Calculate relative position to player
          // World X is East(+)/West(-), World Z is South(+)/North(-)
          const relX = marker.x - playerPos.x;
          const relZ = marker.z - playerPos.z;
          const dist = Math.hypot(relX, relZ);

          if (dist > radarRadius) return null;

          const screenX = center + (relX / radarRadius) * (center - 8);
          // In 3D: -Z is North (top of map), +Z is South (bottom of map)
          const screenY = center + (relZ / radarRadius) * (center - 8);

          return (
            <div
              key={marker.id}
              className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full shadow-sm flex items-center justify-center transition-all"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                backgroundColor: marker.color || '#fff',
              }}
              title={marker.title}
            >
              {marker.type === 'boss' && (
                <div className="absolute w-4 h-4 rounded-full border border-red-500 animate-ping opacity-75" />
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
          <Navigation className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-md" />
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-amber-200">
          <Map className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Buka Peta (M)</span>
        </div>
      </div>

      {/* Coordinate & Hotkey readout */}
      <div className="flex items-center justify-between w-[130px] px-2 py-0.5 bg-stone-900/80 border border-stone-800 rounded text-[10px] text-stone-400 font-mono">
        <span>
          X:{Math.round(playerPos.x)} Z:{Math.round(playerPos.z)}
        </span>
        <button
          onClick={onOpenFullMap}
          className="text-amber-400 font-bold hover:text-amber-300"
        >
          [M]
        </button>
      </div>
    </div>
  );
};
