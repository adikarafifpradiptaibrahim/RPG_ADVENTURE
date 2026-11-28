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
import { getCachedTerrainRasterCanvas } from '../game/mapIllustratedRenderer';
import { WORLD_BOUNDS, WORLD_WIDTH, WORLD_HEIGHT, getSnowWeight } from '../game/3d/worldData';

interface MiniMapProps {
  playerPos: { x: number; z: number; rotationY: number };
  currentRegion: RegionInfo;
  markers: MapMarker[];
  onOpenFullMap: () => void;
  compactMobile?: boolean;
  interiorRoomInfo?: {
    id: string;
    roomName: string;
    floorLabel: string;
    localX: number;
    localZ: number;
    canExit: boolean;
  } | null;
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
  compactMobile = false,
  interiorRoomInfo = null,
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

    // 1. Interior Blueprint Radar OR Procedural Top-down Terrain Raster
    if (interiorRoomInfo) {
      ctx.fillStyle = interiorRoomInfo.id.includes('mage_tower') ? '#0b1128' : '#18141c';
      ctx.fillRect(0, 0, size, size);

      // Subtle architectural floor grid shifting smoothly with player interior movement
      const scalePx = halfSize / Math.max(24, radarRadius * 0.72);
      const cx = halfSize - interiorRoomInfo.localX * scalePx;
      const cz = halfSize - interiorRoomInfo.localZ * scalePx;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 1;
      const gridStep = 5 * scalePx;
      for (let gx = ((cx % gridStep) + gridStep) % gridStep; gx < size; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, size);
        ctx.stroke();
      }
      for (let gz = ((cz % gridStep) + gridStep) % gridStep; gz < size; gz += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, gz);
        ctx.lineTo(size, gz);
        ctx.stroke();
      }

      // Room chamber outline centered at origin (0, 0)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.lineWidth = 2;
      if (interiorRoomInfo.id.includes('mage_tower')) {
        ctx.beginPath();
        ctx.arc(cx, cz, 21 * scalePx, 0, Math.PI * 2);
        ctx.stroke();
        // Spiral staircase West arc hint
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cz, 13 * scalePx, Math.PI - 1.15, Math.PI + 1.15);
        ctx.stroke();
      } else {
        const w = interiorRoomInfo.id.includes('palace') ? 56 : 26;
        const d = interiorRoomInfo.id.includes('palace') ? 78 : 22;
        ctx.strokeRect(cx - (w * 0.5) * scalePx, cz - (d * 0.5) * scalePx, w * scalePx, d * scalePx);
      }
    } else {
    // 1b. Procedural Top-down Terrain Raster (gunakan cached raster 512x512 saat radar lebar bila tersedia)
    const cachedRaster = radarRadius >= 75 ? getCachedTerrainRasterCanvas() : null;
    const sx = ((playerPos.x - radarRadius - WORLD_BOUNDS.minX) / WORLD_WIDTH) * 512;
    const sy = ((playerPos.z - radarRadius - WORLD_BOUNDS.minZ) / WORLD_HEIGHT) * 512;
    const sw = ((radarRadius * 2) / WORLD_WIDTH) * 512;
    const sh = ((radarRadius * 2) / WORLD_HEIGHT) * 512;

    if (cachedRaster && sx >= 0 && sy >= 0 && sx + sw <= 512 && sy + sh <= 512) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cachedRaster, sx, sy, sw, sh, 0, 0, size, size);
    } else {
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
            const h = getProceduralContinentHeight(wx, wz);
            const snowW = getSnowWeight(wx, wz);
            let r = 2, g = 132, b = 199; // #0284c7 ocean azure

            if (zone.id === 'ocean' || h <= 0.0) {
              r = 2; g = 132; b = 199; // ocean azure / lake
            } else if (zone.id === 'volcano') {
              r = 35; g = 31; b = 30; // dark obsidian basalt
            } else if (h > 0.0 && h <= 0.45 && snowW < 0.25) {
              // Pita tipis pasir pantai tepat di bibir air
              r = 230; g = 210; b = 150; // #e6d296
            } else if (zone.id === 'desert') {
              r = 222; g = 184; b = 100; // golden desert sand (#e2be6e..#d4a64c)
            } else if (snowW >= 0.45) {
              r = 242; g = 247; b = 251; // snowy mountain / snow biome (#f2f7fb)
            } else if (wx > 340 && wz < -80 && wz > -200) {
              r = 54; g = 122; b = 48; // mist forest lush green
            } else {
              r = 78; g = 148; b = 62; // fresh plains green (#569e46..#438537)
              if (snowW > 0.02) {
                const blendS = snowW / 0.45;
                r = Math.round(r * (1 - blendS) + 195 * blendS);
                g = Math.round(g * (1 - blendS) + 216 * blendS);
                b = Math.round(b * (1 - blendS) + 220 * blendS);
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
    }

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
  }, [playerPos.x, playerPos.z, playerPos.rotationY, discoveredChunks, radarRadius, interiorRoomInfo?.id, interiorRoomInfo?.localX, interiorRoomInfo?.localZ]);

  /**
   * updateMinimapIcons():
   * Membersihkan penanda waypoint/quest lama dari wilayah lain
   * serta menghapus seluruh mob biasa.
   */
  const updateMinimapIcons = useCallback(() => {
    if (interiorRoomInfo) {
      return [];
    }
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
      {/* Current Region Badge Header (Desktop only; on Mobile moved to center top) */}
      {!compactMobile && (
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
      )}

      {/* Circular Topographical Minimap Container */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Quick Zoom In/Out Buttons (+ / -) — Hidden in compact Mobile mode */}
        {!compactMobile && (
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
        )}

        {/* Circular Radar Viewport (78px compact mobile vs 144px desktop) */}
        <div
          onClick={onOpenFullMap}
          className={`relative rounded-full overflow-hidden border-2 border-amber-500/75 shadow-2xl bg-stone-950/90 cursor-pointer hover:border-amber-400 active:scale-95 group transition-all ${
            compactMobile ? 'w-[78px] h-[78px]' : 'w-28 h-28 sm:w-36 sm:h-36'
          }`}
          title="Ketuk untuk membuka Peta Dunia Lengkap"
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
                className={`${compactMobile ? 'w-2 h-2 text-[7px]' : 'w-2.5 h-2.5 sm:w-3 sm:h-3 text-[8px] sm:text-[9px]'} rounded-full flex items-center justify-center shadow-lg border ${
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
            className={`absolute top-0.5 left-1/2 -translate-x-1/2 rounded-full bg-stone-900/90 border border-amber-400/80 flex items-center justify-center pointer-events-none shadow z-25 ${
              compactMobile ? 'w-3 h-3' : 'w-4 h-4'
            }`}
          >
            <span className={`${compactMobile ? 'text-[7px]' : 'text-[8px]'} font-black text-amber-300`}>N</span>
          </div>

          {/* Celestial Day/Night Clock Orb (Desktop full minimap) */}
          {!compactMobile && (
            <div
              className="absolute bottom-1 right-2 px-1.5 py-0.2 rounded-full bg-black/85 border border-stone-700/80 flex items-center gap-1 text-[8px] font-mono text-stone-300 pointer-events-none shadow z-25"
            >
              <span>{dayNight.timeOfDay === 'night' ? '🌙' : dayNight.timeOfDay === 'sunset' ? '🌅' : '☀️'}</span>
              <span>{dayNight.formattedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Coordinate & Hotkey Hint Footer — Desktop only */}
      {!compactMobile && (
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-stone-950/85 border border-stone-800 text-[9px] font-mono text-stone-300 shadow max-w-[230px]">
          <span>X: {interiorRoomInfo ? interiorRoomInfo.localX : Math.round(playerPos.x)}</span>
          <span>Z: {interiorRoomInfo ? interiorRoomInfo.localZ : Math.round(playerPos.z)}</span>
          {interiorRoomInfo ? (
            <span className="text-sky-300 font-bold truncate">{interiorRoomInfo.floorLabel}</span>
          ) : (
            <span className="text-amber-400/90 font-bold">[M] Peta</span>
          )}
        </div>
      )}
    </div>
  );
};
