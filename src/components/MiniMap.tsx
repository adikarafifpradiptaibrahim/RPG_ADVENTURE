import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Map, Navigation } from 'lucide-react';
import { MapMarker, RegionInfo } from '../types/game';
import { getContinentBiomeSample } from '../game/mapSampler';

interface MiniMapProps {
  playerPos: { x: number; z: number; rotationY: number };
  currentRegion: RegionInfo;
  markers: MapMarker[];
  onOpenFullMap: () => void;
}

// Persistent Fog-of-War Discovery Memory
const FOG_KEY = 'eldoria_minimap_fog_v1';
const CHUNK_SIZE = 16; // 16x16 world units per chunk

function getChunkCoord(worldVal: number): number {
  return Math.floor(worldVal / CHUNK_SIZE);
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerPos,
  currentRegion,
  markers,
  onOpenFullMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landscapeCacheRef = useRef<{ imgData: ImageData; px: number; pz: number; radius: number } | null>(null);

  // Fog of war set stored as string "chunkX,chunkZ"
  const [discoveredChunks, setDiscoveredChunks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(FOG_KEY);
      if (saved) {
        const arr = JSON.parse(saved);
        return new Set<string>(arr);
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  // Radar coverage zoom levels: 28 (close detail), 46 (standard), 75 (wide radar)
  const [zoomLevelIdx, setZoomLevelIdx] = useState<number>(1);
  const zoomRadii = [28, 46, 75];
  const radarRadius = zoomRadii[zoomLevelIdx];

  // Update discovered chunks around player
  useEffect(() => {
    const px = playerPos.x;
    const pz = playerPos.z;
    const curChunkX = getChunkCoord(px);
    const curChunkZ = getChunkCoord(pz);
    const radiusChunks = 3;

    let changed = false;
    const updated = new Set(discoveredChunks);

    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
        const key = `${curChunkX + dx},${curChunkZ + dz}`;
        if (!updated.has(key)) {
          updated.add(key);
          changed = true;
        }
      }
    }

    if (changed) {
      setDiscoveredChunks(updated);
      try {
        localStorage.setItem(FOG_KEY, JSON.stringify(Array.from(updated).slice(-1200)));
      } catch {
        // storage quota safety
      }
    }
  }, [Math.floor(playerPos.x / 10), Math.floor(playerPos.z / 10)]);

  // Render dynamic topographical landscape on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width; // 240px
    const halfSize = size / 2;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Circular clip for minimap viewport
    ctx.save();
    ctx.beginPath();
    ctx.arc(halfSize, halfSize, halfSize - 2, 0, Math.PI * 2);
    ctx.clip();

    // Check if cached landscape ImageData can be reused (eliminates recalculations during camera turning)
    let imgData: ImageData;
    const cache = landscapeCacheRef.current;
    if (
      cache &&
      cache.radius === radarRadius &&
      Math.abs(cache.px - playerPos.x) < 0.4 &&
      Math.abs(cache.pz - playerPos.z) < 0.4
    ) {
      imgData = cache.imgData;
    } else {
      imgData = ctx.createImageData(size, size);
      const pixels = imgData.data;

      // Fill background with deep map void
      for (let p = 0; p < pixels.length; p += 4) {
        pixels[p] = 20;
        pixels[p + 1] = 24;
        pixels[p + 2] = 30;
        pixels[p + 3] = 255;
      }

      // Direct pixel buffer rendering
      for (let py = 0; py < size; py += 3) {
        const v = (py / size - 0.5) * 2; // -1 to 1
        for (let px = 0; px < size; px += 3) {
          const u = (px / size - 0.5) * 2; // -1 to 1
          const radDist = Math.hypot(u, v);
          if (radDist > 0.98) continue; // outside circle

          // World coordinates
          const wx = playerPos.x + u * radarRadius;
          const wz = playerPos.z + v * radarRadius;

          // Check fog of war
          const chunkKey = `${getChunkCoord(wx)},${getChunkCoord(wz)}`;
          const isExplored = discoveredChunks.has(chunkKey);

          const sample = getContinentBiomeSample(wx, wz);
          let [r, g, b] = sample.color;

          // Apply hillshading (sun from North-West)
          const sunDot = 1.0 + (sample.slope * 0.45 * (u - v));
          const shade = Math.max(0.65, Math.min(1.35, sunDot));
          r = Math.round(r * shade);
          g = Math.round(g * shade);
          b = Math.round(b * shade);

          // Elevation contour lines (every 2.5 meters)
          if (sample.height > 0.5 && Math.abs(sample.height % 2.5) < 0.22) {
            r = Math.min(255, r + 45);
            g = Math.min(255, g + 45);
            b = Math.min(255, b + 55);
          }

          // Fog of War effect: Unexplored lands shrouded in parchment mist
          if (!isExplored) {
            // Dim into dark ancient map parchment
            r = Math.round(r * 0.22 + 15);
            g = Math.round(g * 0.22 + 20);
            b = Math.round(b * 0.25 + 32);
          }

          // Write 3x3 pixel block
          for (let dy = 0; dy < 3 && py + dy < size; dy++) {
            const rowOff = (py + dy) * size * 4;
            for (let dx = 0; dx < 3 && px + dx < size; dx++) {
              const idx = rowOff + (px + dx) * 4;
              pixels[idx] = r;
              pixels[idx + 1] = g;
              pixels[idx + 2] = b;
              pixels[idx + 3] = 255;
            }
          }
        }
      }

      landscapeCacheRef.current = {
        imgData,
        px: playerPos.x,
        pz: playerPos.z,
        radius: radarRadius,
      };
    }

    ctx.putImageData(imgData, 0, 0);

    // Re-apply circular clip
    ctx.restore();

    // Draw Subtle Topographical Grid & Concentric Distance Rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(halfSize, halfSize, halfSize - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(halfSize, halfSize, halfSize * 0.35, 0, Math.PI * 2);
    ctx.arc(halfSize, halfSize, halfSize * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(halfSize, 12);
    ctx.lineTo(halfSize, size - 12);
    ctx.moveTo(12, halfSize);
    ctx.lineTo(size - 12, halfSize);
    ctx.stroke();

    // Player Vision Cone (Field of View Fan - 70 degrees forward)
    const fovAngle = (70 * Math.PI) / 180;
    const facingAngle = -playerPos.rotationY + Math.PI / 2; // adjust orientation
    const coneLen = halfSize * 0.85;

    const fovGrad = ctx.createRadialGradient(halfSize, halfSize, 4, halfSize, halfSize, coneLen);
    fovGrad.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
    fovGrad.addColorStop(0.6, 'rgba(250, 204, 21, 0.12)');
    fovGrad.addColorStop(1, 'rgba(250, 204, 21, 0.0)');

    ctx.beginPath();
    ctx.moveTo(halfSize, halfSize);
    ctx.arc(halfSize, halfSize, coneLen, facingAngle - fovAngle / 2, facingAngle + fovAngle / 2);
    ctx.closePath();
    ctx.fillStyle = fovGrad;
    ctx.fill();

    // Center Player Arrow (Genshin Style Golden Chevron)
    ctx.save();
    ctx.translate(halfSize, halfSize);
    ctx.rotate(facingAngle);

    // Chevron outer shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, 7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, -7);
    ctx.closePath();
    ctx.fill();

    // Golden Chevron Arrow
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }, [playerPos.x, playerPos.z, playerPos.rotationY, discoveredChunks, radarRadius]);

  // Memoized visible blips calculation to eliminate stutter / re-render overhead when moving in vast zones
  const visibleBlips = useMemo(() => {
    const px = playerPos.x;
    const pz = playerPos.z;
    const maxDistSq = radarRadius * radarRadius;

    const blips: {
      id: string;
      title: string;
      type: string;
      icon?: string;
      color?: string;
      percentX: number;
      percentY: number;
    }[] = [];

    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const relX = marker.x - px;
      const relZ = marker.z - pz;
      const distSq = relX * relX + relZ * relZ;

      if (distSq > maxDistSq) continue;

      const percentX = 50 + (relX / radarRadius) * 44;
      const percentY = 50 + (relZ / radarRadius) * 44;

      blips.push({
        id: marker.id,
        title: marker.title,
        type: marker.type,
        icon: marker.icon,
        color: marker.color,
        percentX,
        percentY,
      });
    }

    return blips;
  }, [markers, Math.round(playerPos.x * 2) / 2, Math.round(playerPos.z * 2) / 2, radarRadius]);

  return (
    <div className="flex flex-col items-end gap-1 select-none pointer-events-none">
      {/* Current Region Badge Header */}
      <div
        onClick={onOpenFullMap}
        className="pointer-events-auto flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-stone-900/95 border border-amber-600/70 rounded-full shadow-2xl backdrop-blur-md cursor-pointer hover:border-amber-400 hover:scale-[1.02] transition-all group max-w-[150px] sm:max-w-none truncate"
        title="Buka Peta Benua Eldoria (Tekan M)"
      >
        <span className="text-xs sm:text-sm drop-shadow">{currentRegion.icon}</span>
        <span className="text-[10px] sm:text-xs font-bold tracking-wide text-amber-200 group-hover:text-amber-300 truncate">
          {currentRegion.nameId}
        </span>
        <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-700/60 rounded font-mono font-bold flex-shrink-0">
          Lv.{currentRegion.recommendedLevel}
        </span>
      </div>

      {/* Genshin/Minecraft Style Circular Topographical Minimap Container with Zoom Controls */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Quick Zoom In/Out Buttons (+ / -) */}
        <div className="flex flex-col gap-1 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoomLevelIdx((prev) => Math.max(0, prev - 1));
            }}
            disabled={zoomLevelIdx === 0}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-stone-900/95 hover:bg-stone-800 disabled:opacity-40 border border-amber-600/70 text-amber-300 font-bold text-xs flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
            title="Perbesar Radar Minimap (+)"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoomLevelIdx((prev) => Math.min(zoomRadii.length - 1, prev + 1));
            }}
            disabled={zoomLevelIdx === zoomRadii.length - 1}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-stone-900/95 hover:bg-stone-800 disabled:opacity-40 border border-amber-600/70 text-amber-300 font-bold text-xs flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
            title="Perkecil Radar Minimap (-)"
          >
            -
          </button>
        </div>

        {/* Circular Minimap Viewport with Attached Coordinate HUD */}
        <div className="relative flex flex-col items-center flex-shrink-0">
          <div
            onClick={onOpenFullMap}
            className="relative w-[115px] h-[115px] sm:w-[136px] sm:h-[136px] rounded-full overflow-hidden border-[3px] border-amber-600/85 bg-stone-950 shadow-[0_10px_25px_rgba(0,0,0,0.85)] backdrop-blur-md cursor-pointer group hover:border-amber-400 transition-all flex-shrink-0"
            title="Klik untuk membuka Peta Lengkap (M)"
          >
          {/* Real-time Topographical Render Canvas */}
          <canvas
            ref={canvasRef}
            width={240}
            height={240}
            className="w-full h-full object-cover rounded-full"
          />

          {/* Ornate Gold Compass Ring Border */}
          <div className="absolute inset-0 rounded-full border border-amber-400/40 pointer-events-none shadow-inner" />

          {/* Cardinal Directions (Genshin Style) */}
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 flex items-center flex-col pointer-events-none">
            <span className="text-[9px] sm:text-[10px] font-black text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] tracking-tighter">
              N
            </span>
            <div className="w-1 h-1 bg-amber-400 rounded-full shadow-sm" />
          </div>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold text-stone-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] pointer-events-none">
            S
          </span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] sm:text-[9px] font-bold text-stone-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] pointer-events-none">
            W
          </span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] sm:text-[9px] font-bold text-stone-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] pointer-events-none">
            E
          </span>

          {/* Dynamic Entity Pins Projected over Canvas */}
          {visibleBlips.map((marker) => {
            const percentX = marker.percentX;
            const percentY = marker.percentY;

            const isBoss = marker.type === 'boss';
            const isQuest = marker.type === 'quest';
            const isWaypoint = marker.type === 'waypoint';

            return (
              <div
                key={marker.id}
                className="absolute -ml-2 -mt-2 flex items-center justify-center transition-all pointer-events-none"
                style={{
                  left: `${percentX}%`,
                  top: `${percentY}%`,
                }}
                title={marker.title}
              >
                {/* Boss / Danger Ping */}
                {isBoss && (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-4 h-4 rounded-full bg-red-600/40 animate-ping" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-md flex items-center justify-center text-[7px] text-white font-bold">
                      {marker.icon || '💀'}
                    </div>
                  </div>
                )}

                {/* Waypoint Teleport Pin */}
                {isWaypoint && (
                  <div className="w-3 h-3 bg-cyan-400 rotate-45 border border-white shadow-lg flex items-center justify-center text-[7px]">
                    <div className="w-1.5 h-1.5 bg-blue-700" />
                  </div>
                )}

                {/* Quest Marker */}
                {isQuest && (
                  <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-900 shadow-md flex items-center justify-center text-[8px] font-black text-stone-900 animate-bounce">
                    !
                  </div>
                )}

                {/* General Landmark / NPC Icon */}
                {!isBoss && !isWaypoint && !isQuest && (
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-stone-900 shadow flex items-center justify-center text-[8px]"
                    style={{ backgroundColor: marker.color || '#fff' }}
                  >
                    {marker.icon && <span className="text-[7px] scale-90">{marker.icon}</span>}
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* Coordinate HUD Pill placed neatly below the circular Minimap with natural margin and zero clipping */}
          <div className="mt-1.5 px-2.5 py-0.5 bg-black/85 text-amber-300 border border-amber-600/60 rounded text-[11px] font-mono font-bold tracking-tight shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap pointer-events-none z-30">
            <span>X: {Math.round(playerPos.x)}</span>
            <span className="text-amber-500/70 font-normal">|</span>
            <span>Z: {Math.round(playerPos.z)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
