import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Map, Navigation } from 'lucide-react';
import { MapMarker, RegionInfo } from '../types/game';
import { getSharedDayNightSystem } from '../game/3d/dayNightSystem';
import {
  getBiomeAt,
  getProceduralContinentHeight,
  RIVER_NW_BRANCH,
  RIVER_DESERT_BRANCH,
  RIVER_EAST_BRANCH,
  RIVER_SOUTH_BRANCH,
} from '../game/mapSampler';
import { drawRoadsOnMiniMap } from '../game/RoadSystem';

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

  // In-game 24-hour Celestial Day/Night Clock
  const [dayNight, setDayNight] = useState(() => getSharedDayNightSystem().getState());
  useEffect(() => {
    const timer = setInterval(() => {
      setDayNight(getSharedDayNightSystem().getState());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Render dynamic procedural topographical landscape on canvas (NO text in radar)
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

    // 1. Procedural Top-down Terrain Raster
    // Sampled cleanly on a 48x48 buffer and bilinearly smoothed to 240x240
    const gridSize = 48;
    const offscreen = document.createElement('canvas');
    offscreen.width = gridSize;
    offscreen.height = gridSize;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      const imgData = offCtx.createImageData(gridSize, gridSize);
      const data = imgData.data;

      const px = playerPos.x;
      const pz = playerPos.z;

      for (let gy = 0; gy < gridSize; gy++) {
        const wz = pz + ((gy - gridSize / 2) / (gridSize / 2)) * radarRadius;
        for (let gx = 0; gx < gridSize; gx++) {
          const wx = px + ((gx - gridSize / 2) / (gridSize / 2)) * radarRadius;
          const idx = (gy * gridSize + gx) * 4;

          const zone = getBiomeAt(wx, wz);
          let r = 101, g = 163, b = 13; // default lush plains green #65a30d

          if (zone.id === 'ocean') {
            r = 2; g = 132; b = 199; // #0284c7 ocean azure
          } else if (zone.id === 'volcano') {
            r = 35; g = 31; b = 30; // dark obsidian basalt
          } else if (zone.id === 'desert') {
            r = 234; g = 179; b = 8; // golden desert sand #eab308
          } else {
            const h = getProceduralContinentHeight(wx, wz);
            if (h <= 0.0) {
              r = 2; g = 132; b = 199; // water / lake
            } else if (h > 10.0) {
              r = 241; g = 245; b = 249; // snowy mountain
            } else if (wx > 340 && wz < -80 && wz > -200) {
              r = 21; g = 128; b = 61; // mist forest green
            } else {
              r = 101; g = 163; b = 13; // plains green
            }
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
      offCtx.putImageData(imgData, 0, 0);

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offscreen, 0, 0, size, size);
    } else {
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(0, 0, size, size);
    }

    // 2. Vector Procedural Rivers (Meandering Blue Splines)
    const riverBranches = [RIVER_NW_BRANCH, RIVER_DESERT_BRANCH, RIVER_EAST_BRANCH, RIVER_SOUTH_BRANCH];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = Math.max(3.2, (6.5 / radarRadius) * halfSize);

    riverBranches.forEach((branch) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < branch.length; i++) {
        const pt = branch[i];
        const dx = pt[0] - playerPos.x;
        const dz = pt[1] - playerPos.z;
        const mx = halfSize + (dx / radarRadius) * halfSize;
        const my = halfSize + (dz / radarRadius) * halfSize;

        if (!started) {
          ctx.moveTo(mx, my);
          started = true;
        } else {
          ctx.lineTo(mx, my);
        }
      }
      ctx.stroke();
    });
    ctx.restore();

    // 3. Vector 3D Cobblestone Roads
    drawRoadsOnMiniMap(ctx, playerPos.x, playerPos.z, radarRadius, size);

    // Re-apply circular clip for HUD decorations
    ctx.restore();

    // Draw Subtle Topographical Grid & Concentric Distance Rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(halfSize, halfSize, halfSize - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(halfSize, halfSize, halfSize * 0.35, 0, Math.PI * 2);
    ctx.arc(halfSize, halfSize, halfSize * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(halfSize, 12);
    ctx.lineTo(halfSize, size - 12);
    ctx.moveTo(12, halfSize);
    ctx.lineTo(size - 12, halfSize);
    ctx.stroke();

    // Player Vision Cone (Field of View Fan - 70 degrees forward)
    const fovAngle = (70 * Math.PI) / 180;
    const facingAngle = -playerPos.rotationY + Math.PI / 2;
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

  /**
   * updateMinimapIcons():
   * Membersihkan penanda waypoint/quest lama dari wilayah lain
   * serta menghapus seluruh mob biasa.
   */
  const updateMinimapIcons = useCallback(() => {
    const px = playerPos.x;
    const pz = playerPos.z;
    const maxRadarDist = radarRadius * 0.90;
    const maxDistSq = maxRadarDist * maxRadarDist;
    const regionId = currentRegion.id;

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

      // 1. Filter out trash mob / ordinary enemies
      if (marker.type === 'enemy') continue;

      // 2. Strict distance check
      const relX = marker.x - px;
      const relZ = marker.z - pz;
      const distSq = relX * relX + relZ * relZ;
      if (distSq > maxDistSq) continue;

      // 3. Filter pin waypoint/quest lama saat pemain berpindah wilayah:
      if (marker.type === 'waypoint' || marker.type === 'quest') {
        const mId = marker.id.toLowerCase();
        if (regionId === 'gurun_solaria') {
          const isSolaria = mId.includes('solaria') || mId.includes('jarrus');
          if (!isSolaria && Math.sqrt(distSq) > 30) continue;
        } else if (regionId === 'desa_eldoria') {
          const isEldoria = mId.includes('sanctuary') || mId.includes('vael') || mId.includes('village') || mId.includes('harbor');
          if (!isEldoria && Math.sqrt(distSq) > 30) continue;
        } else if (regionId === 'desa_valkragor' || regionId === 'benteng_valkragor') {
          const isValkragor = mId.includes('valkragor');
          if (!isValkragor && Math.sqrt(distSq) > 30) continue;
        } else if (regionId.includes('astraea')) {
          const isNorth = mId.includes('astraea');
          if (!isNorth && Math.sqrt(distSq) > 30) continue;
        } else if (regionId.includes('kawah') || regionId.includes('kaldera')) {
          const isVolcano = mId.includes('dragon') || mId.includes('ignis') || mId.includes('caldera') || mId.includes('kawah');
          if (!isVolcano && Math.sqrt(distSq) > 30) continue;
        }
      }

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
  }, [markers, Math.round(playerPos.x * 2) / 2, Math.round(playerPos.z * 2) / 2, radarRadius, currentRegion.id]);

  const visibleBlips = useMemo(() => updateMinimapIcons(), [updateMinimapIcons]);

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

      {/* Circular Topographical Minimap Container with Zoom Controls */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Quick Zoom In/Out Buttons (+ / -) */}
        <div className="flex flex-col gap-1 z-20">
          <button
            onClick={() => setZoomLevelIdx((prev) => Math.max(0, prev - 1))}
            disabled={zoomLevelIdx === 0}
            className="w-5 h-5 rounded-md bg-stone-900/90 hover:bg-stone-800 disabled:opacity-30 border border-amber-600/50 flex items-center justify-center text-amber-300 text-xs font-bold transition-all shadow-md cursor-pointer active:scale-90"
            title="Perbesar Radar (+)"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevelIdx((prev) => Math.min(zoomRadii.length - 1, prev + 1))}
            disabled={zoomLevelIdx === zoomRadii.length - 1}
            className="w-5 h-5 rounded-md bg-stone-900/90 hover:bg-stone-800 disabled:opacity-30 border border-amber-600/50 flex items-center justify-center text-amber-300 text-xs font-bold transition-all shadow-md cursor-pointer active:scale-90"
            title="Perkecil Radar (-)"
          >
            -
          </button>
        </div>

        {/* Circular Radar Radar Viewport */}
        <div
          onClick={onOpenFullMap}
          className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-amber-500/70 shadow-2xl bg-stone-950/90 cursor-pointer hover:border-amber-400 group transition-all"
          title="Klik untuk membuka Peta Dunia Lengkap"
        >
          {/* Real-time Procedural Topography Canvas */}
          <canvas
            ref={canvasRef}
            width={240}
            height={240}
            className="w-full h-full object-cover"
          />

          {/* Minimap Blips */}
          {visibleBlips.map((blip) => (
            <div
              key={blip.id}
              style={{
                left: `${blip.percentX}%`,
                top: `${blip.percentY}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-15"
              title={blip.title}
            >
              <div
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] shadow-lg border ${
                  blip.type === 'boss'
                    ? 'bg-red-600 border-white animate-pulse'
                    : blip.type === 'quest'
                    ? 'bg-amber-400 border-amber-900'
                    : 'bg-cyan-500 border-cyan-900'
                }`}
                style={{ backgroundColor: blip.color }}
              >
                {blip.icon || '•'}
              </div>
            </div>
          ))}

          {/* Golden Outer Ring Bezel */}
          <div className="absolute inset-0 rounded-full border border-amber-400/30 pointer-events-none shadow-inner" />

          {/* Cardinal North Compass Marker on Rim */}
          <div
            className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-stone-900/90 border border-amber-400/80 flex items-center justify-center pointer-events-none shadow z-25"
          >
            <span className="text-[8px] font-black text-amber-300">N</span>
          </div>

          {/* Celestial Day/Night Clock Orb at bottom rim */}
          <div
            className="absolute bottom-1 right-2 px-1.5 py-0.2 rounded-full bg-black/85 border border-stone-700/80 flex items-center gap-1 text-[8px] font-mono text-stone-300 pointer-events-none shadow z-25"
          >
            <span>{dayNight.timeOfDay === 'night' ? '🌙' : dayNight.timeOfDay === 'sunset' ? '🌅' : '☀️'}</span>
            <span>{dayNight.formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Coordinate & Hotkey Hint Footer */}
      <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-stone-950/80 border border-stone-800 text-[9px] font-mono text-stone-400 shadow">
        <span>X: {Math.round(playerPos.x)}</span>
        <span>Z: {Math.round(playerPos.z)}</span>
        <span className="text-amber-400/90 font-bold">[M] Peta</span>
      </div>
    </div>
  );
};
