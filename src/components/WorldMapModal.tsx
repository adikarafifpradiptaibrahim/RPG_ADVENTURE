import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Compass,
  Sparkles,
  Navigation,
  Footprints,
  Shield,
  Layers,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
} from 'lucide-react';
import { MapMarker, RegionInfo } from '../types/game';
import { REGIONS, WAYPOINTS } from '../game/mapData';
import { getContinentBiomeSample } from '../game/mapSampler';

// Persistent continent map cached image data to eliminate all lag on open & pan
let cachedMapImageData: ImageData | null = null;

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: { x: number; z: number; rotationY: number };
  currentRegion: RegionInfo;
  markers: MapMarker[];
  onFastTravel: (x: number, z: number) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  currentRegion,
  markers,
  onFastTravel,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo>(currentRegion);
  const [showLegend, setShowLegend] = useState(true);

  // Zoom & Pan state with pure 60 FPS hardware accelerated performance
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  const zoomRef = useRef<number>(1.0);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragRafRef = useRef<number | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapPlaneRef = useRef<HTMLDivElement | null>(null);

  // Map world coordinate boundaries for projection
  // 2.5x Expanded World bounds: X from -580 to +680 (width 1260), Z from -460 to +460 (height 920)
  const minX = -580;
  const maxX = 680;
  const minZ = -460;
  const maxZ = 460;

  // Clamped Pan Handler (prevents panning past the map boundaries at any zoom level)
  const clampPan = useCallback((nx: number, ny: number, curZoom: number) => {
    const maxPanX = (curZoom - 1.0) * 280;
    const maxPanY = (curZoom - 1.0) * 210;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, nx)),
      y: Math.max(-maxPanY, Math.min(maxPanY, ny)),
    };
  }, []);

  // Direct DOM hardware transform update (runs on GPU, avoids layout thrashing and React VDOM re-renders)
  const applyTransform = useCallback((px: number, py: number, z: number) => {
    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transform = `translate3d(${px}px, ${py}px, 0px) scale(${z})`;
    }
  }, []);

  // Center on player (instantly centers view onto player position)
  const handleCenterOnPlayer = useCallback(() => {
    const curZoom = zoomRef.current;
    const normX = (playerPos.x - minX) / (maxX - minX);
    const normZ = (playerPos.z - minZ) / (maxZ - minZ);
    const targetPanX = -(normX - 0.5) * 560 * curZoom;
    const targetPanY = -(normZ - 0.5) * 420 * curZoom;
    const nextPan = clampPan(targetPanX, targetPanY, curZoom);
    panRef.current = nextPan;
    setPan(nextPan);
    applyTransform(nextPan.x, nextPan.y, curZoom);
  }, [playerPos.x, playerPos.z, clampPan, applyTransform]);

  // Zoom In / Out Handlers with smooth GPU transitions
  const handleZoomIn = () => {
    const next = Math.min(3.5, Math.round((zoomRef.current + 0.5) * 10) / 10);
    zoomRef.current = next;
    const nextPan = clampPan(panRef.current.x, panRef.current.y, next);
    panRef.current = nextPan;
    setZoom(next);
    setPan(nextPan);
    applyTransform(nextPan.x, nextPan.y, next);
  };

  const handleZoomOut = () => {
    const next = Math.max(1.0, Math.round((zoomRef.current - 0.5) * 10) / 10);
    zoomRef.current = next;
    const nextPan = next === 1.0 ? { x: 0, y: 0 } : clampPan(panRef.current.x, panRef.current.y, next);
    panRef.current = nextPan;
    setZoom(next);
    setPan(nextPan);
    applyTransform(nextPan.x, nextPan.y, next);
  };

  const handleResetZoom = () => {
    zoomRef.current = 1.0;
    panRef.current = { x: 0, y: 0 };
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    applyTransform(0, 0, 1.0);
  };

  // Mouse wheel zoom wrapped in requestAnimationFrame with zero layout thrashing
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    const nextZoom = Math.max(1.0, Math.min(3.5, Math.round((zoomRef.current + delta) * 100) / 100));
    zoomRef.current = nextZoom;

    const nextPan = nextZoom === 1.0 ? { x: 0, y: 0 } : clampPan(panRef.current.x, panRef.current.y, nextZoom);
    panRef.current = nextPan;

    if (!isInteracting) setIsInteracting(true);

    if (wheelRafRef.current == null) {
      wheelRafRef.current = requestAnimationFrame(() => {
        applyTransform(panRef.current.x, panRef.current.y, zoomRef.current);
        wheelRafRef.current = null;
      });
    }

    // Debounce syncing to React state when wheel scrolling settles
    if (wheelCommitTimerRef.current) clearTimeout(wheelCommitTimerRef.current);
    wheelCommitTimerRef.current = setTimeout(() => {
      setZoom(zoomRef.current);
      setPan({ ...panRef.current });
      setIsInteracting(false);
    }, 120);
  };

  // Unified pointer drag handler with pointer capture and direct RAF hardware transform for silky 60fps pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomRef.current <= 1.0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDraggingRef.current = true;
    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transition = 'none';
    }
    e.currentTarget.style.cursor = 'grabbing';
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panRef.current };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || zoomRef.current <= 1.0) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const targetX = panStartRef.current.x + dx;
    const targetY = panStartRef.current.y + dy;
    const clamped = clampPan(targetX, targetY, zoomRef.current);
    panRef.current = clamped;

    if (dragRafRef.current == null) {
      dragRafRef.current = requestAnimationFrame(() => {
        applyTransform(panRef.current.x, panRef.current.y, zoomRef.current);
        dragRafRef.current = null;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (mapPlaneRef.current) {
        mapPlaneRef.current.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
      }
      e.currentTarget.style.cursor = zoomRef.current > 1.0 ? 'grab' : 'default';
      setPan({ ...panRef.current });
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    handlePointerUp(e);
  };

  // Cleanup RAF and timers on unmount
  useEffect(() => {
    return () => {
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
      if (wheelCommitTimerRef.current) clearTimeout(wheelCommitTimerRef.current);
    };
  }, []);

  // Normalized World to screen percentage conversion (relative to the GPU transformed map plane)
  const worldToScreen = (wx: number, wz: number) => {
    const normX = (wx - minX) / (maxX - minX);
    const normZ = (wz - minZ) / (maxZ - minZ);
    return {
      left: `${normX * 100}%`,
      top: `${normZ * 100}%`,
      visible: true,
    };
  };

  const playerScreen = worldToScreen(playerPos.x, playerPos.z);

  // Render Topographical Continent Landscape once (cached for instant reopening and zero-lag dragging)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Use cached image data if already generated
    if (cachedMapImageData && cachedMapImageData.width === width && cachedMapImageData.height === height) {
      ctx.putImageData(cachedMapImageData, 0, 0);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    // Direct pixel block sampling across the entire continent
    const step = 2; // Crisp resolution

    for (let py = 0; py < height; py += step) {
      const v = py / height;
      const wz = minZ + v * (maxZ - minZ);

      for (let px = 0; px < width; px += step) {
        const u = px / width;
        const wx = minX + u * (maxX - minX);

        const sample = getContinentBiomeSample(wx, wz);
        let [r, g, b] = sample.color;

        // Dynamic hillshade sun angle (sun from North-West)
        const sunDot = 1.0 + (sample.slope * 0.45 * (u - v));
        const shade = Math.max(0.65, Math.min(1.35, sunDot));
        r = Math.min(255, Math.max(0, Math.round(r * shade)));
        g = Math.min(255, Math.max(0, Math.round(g * shade)));
        b = Math.min(255, Math.max(0, Math.round(b * shade)));

        // Topographical elevation contours
        if (sample.height > 0.5 && Math.abs(sample.height % 3.0) < 0.28) {
          r = Math.min(255, r + 40);
          g = Math.min(255, g + 40);
          b = Math.min(255, b + 50);
        }

        for (let dy = 0; dy < step && py + dy < height; dy++) {
          const rowOff = (py + dy) * width * 4;
          for (let dx = 0; dx < step && px + dx < width; dx++) {
            const idx = rowOff + (px + dx) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
          }
        }
      }
    }

    cachedMapImageData = imgData;
    ctx.putImageData(imgData, 0, 0);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="game-modal-card relative w-full max-w-5xl max-h-[88vh] h-[88vh] bg-stone-900/95 border-2 border-amber-600/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-stone-800 bg-stone-950/95">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg md:text-xl font-bold tracking-wide text-amber-300 flex items-center gap-1.5 sm:gap-2">
                Peta Benua Eldoria
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700/60 text-amber-400 font-normal">
                  Open World 3D
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-stone-400 hidden sm:block">
                Jelajahi benua raksasa Eldoria: Ibukota Astraea Utara, Jurang Es Frostpeak, Gurun Solaria, Rawa Shadowfen, Kuil Pagoda, dan Pelabuhan Sanctuary.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-[11px] sm:text-xs font-semibold text-stone-300 flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{showLegend ? 'Sembunyikan Legenda' : 'Tampilkan Legenda'}</span>
              <span className="sm:hidden">Legenda</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 sm:w-9 sm:h-9 rounded-lg border border-stone-700 bg-stone-800/90 hover:bg-red-950/80 hover:border-red-500/60 justify-center text-stone-300 hover:text-red-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Tutup Peta (M / Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>

        {/* Content Body: Map Viewport + Sidebar Info */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Main Map Canvas Area */}
          <div className="relative flex-1 bg-stone-950/90 overflow-hidden flex items-center justify-center p-2 sm:p-4">
            {/* Topographical Map Container with Zoom & Pan Viewport */}
            <div
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              style={{
                cursor: zoom > 1.0 ? 'grab' : 'default',
                touchAction: 'none',
              }}
              className="relative w-full h-full max-w-[620px] max-h-[580px] rounded-xl overflow-hidden border border-stone-700/60 shadow-inner bg-[#1e232a]"
            >
              {/* GPU Hardware Accelerated Continent Map Plane (translate3d + will-change: transform) */}
              <div
                ref={mapPlaneRef}
                className="absolute inset-0 w-full h-full"
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
                  transformOrigin: '50% 50%',
                  willChange: 'transform',
                  transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
              {/* Real-time Topographical Biome Canvas */}
              <canvas
                ref={canvasRef}
                width={560}
                height={420}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ willChange: 'transform' }}
              />

              {/* DYNAMIC REGION CLICKABLE ZONES & LABELS */}
              {/* 1. Grand Imperial Astraea (Far North Frostpeak, X: 180, Z: -260) */}
              {(() => {
                const sp = worldToScreen(180, -260);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[14])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1.5 rounded-xl bg-stone-950/75 border border-amber-400/80 shadow-2xl backdrop-blur-xs hover:border-amber-300 hover:scale-110 transition-transform">
                      <span className="text-sm sm:text-base">👑</span>
                      <span className="text-[9px] font-bold text-amber-300 tracking-wide whitespace-nowrap">
                        {REGIONS[14].nameId}
                      </span>
                      <span className="text-[7px] text-amber-200/80 font-mono">Ibukota Kerajaan</span>
                    </div>
                  </div>
                );
              })()}

              {/* 2. Frostpeak Glacier Summit (Lv.5, X: 115, Z: -65) */}
              {(() => {
                const sp = worldToScreen(115, -65);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[7])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-sky-950/75 border border-sky-400/60 shadow-xl backdrop-blur-xs hover:border-sky-300 hover:scale-110 transition-transform">
                      <span className="text-xs">❄️</span>
                      <span className="text-[8px] font-bold text-sky-200 whitespace-nowrap">
                        {REGIONS[7].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Jurang Es Purba / Frozen Chasm (X: 180, Z: -320) */}
              {(() => {
                const sp = worldToScreen(180, -320);
                if (!sp.visible) return null;
                return (
                  <div
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-15 pointer-events-none flex flex-col items-center"
                  >
                    <span className="text-[7px] px-1.5 py-0.2 bg-blue-950/80 border border-blue-400/50 rounded text-cyan-200 font-bold whitespace-nowrap shadow">
                      ❄️ Jurang Es Purba
                    </span>
                  </div>
                );
              })()}

              {/* 4. Sanctuary Harbor & Coastal Docks (X: 0, Z: 21) */}
              {(() => {
                const sp = worldToScreen(0, 21);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[0])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-blue-950/80 border border-cyan-400/70 shadow-lg hover:border-cyan-300 hover:scale-110 transition-transform">
                      <span className="text-xs">⛵</span>
                      <span className="text-[8px] font-bold text-cyan-200 whitespace-nowrap">
                        Pelabuhan Sanctuary
                      </span>
                      <span className="text-[7px] text-cyan-300/80 font-mono">Dermaga Kayu & Kapal Berlabuh</span>
                    </div>
                  </div>
                );
              })()}

              {/* 4b. Reruntuhan Kuno Vael (Upstream Outskirts: X: -118, Z: 36) */}
              {(() => {
                const sp = worldToScreen(-118, 36);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[2])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-stone-900/80 border border-stone-400/70 shadow-lg hover:border-stone-200 hover:scale-110 transition-transform">
                      <span className="text-xs">🏛️</span>
                      <span className="text-[8px] font-bold text-stone-200 whitespace-nowrap">
                        {REGIONS[2].nameId}
                      </span>
                      <span className="text-[7px] text-stone-400 font-mono">Pilar Spasial Kuno</span>
                    </div>
                  </div>
                );
              })()}

              {/* 5. Sanctuary Village Plaza (X: 0, Z: -4) */}
              {(() => {
                const sp = worldToScreen(0, -4);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[0])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1.5 rounded-xl bg-amber-950/80 border border-amber-500/70 shadow-lg hover:border-amber-300 hover:scale-110 transition-transform">
                      <span className="text-sm">⛲</span>
                      <span className="text-[9px] font-bold text-amber-200 whitespace-nowrap">
                        {REGIONS[0].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 6. Desa Benteng Val-Kragor (X: 158, Z: -16) */}
              {(() => {
                const sp = worldToScreen(158, -16);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[6])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-blue-950/80 border border-blue-400/60 shadow-lg hover:border-blue-300 hover:scale-110 transition-transform">
                      <span className="text-xs">🛡️</span>
                      <span className="text-[8px] font-bold text-blue-200 whitespace-nowrap">
                        {REGIONS[6].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 7. Dragonfang Caldera (Far North, X: 20, Z: -280) */}
              {(() => {
                const sp = worldToScreen(20, -280);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[13])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-red-950/80 border border-red-500/70 shadow-lg hover:border-red-400 hover:scale-110 transition-transform">
                      <span className="text-xs">🐉</span>
                      <span className="text-[8px] font-bold text-red-300 whitespace-nowrap">
                        {REGIONS[13].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 8. Gurun Emas Solaria (South-West, X: -240, Z: 180) */}
              {(() => {
                const sp = worldToScreen(-240, 180);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[10])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-yellow-950/80 border border-yellow-500/70 shadow-lg hover:border-yellow-400 hover:scale-110 transition-transform">
                      <span className="text-xs">🏜️</span>
                      <span className="text-[8px] font-bold text-yellow-300 whitespace-nowrap">
                        {REGIONS[10].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 9. Shadowfen Gloom Marsh (West, X: -200, Z: 20) */}
              {(() => {
                const sp = worldToScreen(-200, 20);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[8])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-purple-950/80 border border-purple-500/70 shadow-lg hover:border-purple-400 hover:scale-110 transition-transform">
                      <span className="text-xs">🍄</span>
                      <span className="text-[8px] font-bold text-purple-300 whitespace-nowrap">
                        {REGIONS[8].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 10. Jade Bamboo Grove & Pagoda (South-East, X: 240, Z: 180) */}
              {(() => {
                const sp = worldToScreen(240, 180);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[12])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-emerald-950/80 border border-emerald-500/70 shadow-lg hover:border-emerald-400 hover:scale-110 transition-transform">
                      <span className="text-xs">⛩️</span>
                      <span className="text-[8px] font-bold text-emerald-300 whitespace-nowrap">
                        {REGIONS[12].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Coordinate Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-4 grid-rows-4 border border-stone-700/20 divide-x divide-y divide-stone-700/20" />

              {/* WAYPOINTS WITH FAST TRAVEL BUTTONS */}
              {WAYPOINTS.map((wp) => {
                const sp = worldToScreen(wp.pos[0], wp.pos[1]);
                if (!sp.visible) return null;
                return (
                  <div
                    key={wp.id}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-25 group"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFastTravel(wp.pos[0], wp.pos[1]);
                        onClose();
                      }}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-cyan-600/90 hover:bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-[10px] sm:text-xs transition-transform hover:scale-125 cursor-pointer pointer-events-auto"
                      title={`Fast Travel ke: ${wp.nameId}`}
                    >
                      {wp.icon}
                    </button>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                      <div className="px-2 py-1 bg-stone-900/95 border border-cyan-400/80 rounded-md shadow-xl text-center whitespace-nowrap">
                        <p className="text-[10px] sm:text-[11px] font-bold text-cyan-200">{wp.nameId}</p>
                        <p className="text-[8px] sm:text-[9px] text-stone-300">Klik untuk Teleportasi</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* DYNAMIC MAP MARKERS (NPC, Chests, Bosses) */}
              {markers.map((marker) => {
                const sp = worldToScreen(marker.x, marker.z);
                if (!sp.visible) return null;
                return (
                  <div
                    key={marker.id}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                    title={marker.title}
                  >
                    <div
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] shadow-md border border-stone-900"
                      style={{ backgroundColor: marker.color || '#fff' }}
                    >
                      {marker.icon || '•'}
                    </div>
                  </div>
                );
              })}

              {/* LIVE PLAYER PIN WITH HEADING ARROW */}
              {playerScreen.visible && (
                <div
                  style={{ left: playerScreen.left, top: playerScreen.top }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-7 h-7 rounded-full bg-amber-400/30 animate-ping" />
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 border-2 border-white shadow-2xl flex items-center justify-center"
                      style={{
                        transform: `rotate(${(playerPos.rotationY * 180) / Math.PI + 180}deg)`,
                      }}
                    >
                      <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-900 fill-stone-900" />
                    </div>
                  </div>
                  <span className="mt-0.5 px-1.5 py-0.2 bg-black/85 border border-amber-400/70 rounded text-[8px] sm:text-[9px] font-bold text-amber-300 whitespace-nowrap shadow">
                    Kamu Disini
                  </span>
                </div>
              )}

              </div>
              {/* END GPU Hardware Accelerated Continent Map Plane */}

              {/* FLOATING ZOOM & CAMERA CONTROLS (Top-Left HUD) */}
              <div className="absolute top-3 left-3 z-35 flex items-center gap-1.5 p-1 bg-stone-900/90 backdrop-blur-md border border-amber-600/60 rounded-xl shadow-xl pointer-events-auto">
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 3.5}
                  className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Perbesar Peta (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-200">
                  {zoom.toFixed(1)}x
                </div>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 1.0}
                  className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Perkecil Peta (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-stone-700 mx-0.5" />
                <button
                  onClick={handleResetZoom}
                  disabled={zoom === 1.0 && pan.x === 0 && pan.y === 0}
                  className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Reset Tampilan (1.0x)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCenterOnPlayer}
                  className="w-7 h-7 rounded-lg bg-amber-600/30 hover:bg-amber-600/60 border border-amber-500/50 text-amber-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Pusatkan Kamera ke Posisi Pemain"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Navigation Hint Pill (Bottom-Left) */}
              <div className="absolute bottom-3 left-3 z-35 px-2.5 py-1 bg-stone-950/80 backdrop-blur-xs border border-stone-800/80 rounded-lg text-[9px] font-mono text-stone-400 pointer-events-none flex items-center gap-1.5 shadow">
                <span>🖱️</span>
                <span>{zoom > 1.0 ? 'Tahan & Geser untuk Menjelajah' : 'Scroll / (+) untuk Memperbesar'}</span>
              </div>

              {/* Compass Rose Top-Right */}
              <div className="absolute top-3 right-3 p-1 sm:p-1.5 bg-stone-900/85 border border-stone-700/80 rounded-lg flex flex-col items-center pointer-events-none z-30">
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-400">U</span>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-stone-600 flex items-center justify-center text-[7px] text-stone-400">
                  +
                </div>
                <span className="text-[8px] sm:text-[9px] text-stone-500">S</span>
              </div>
            </div>
          </div>

          {/* Sidebar Region & Waypoint Details */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-stone-800 bg-stone-950/70 flex flex-col p-4 overflow-y-auto modal-scroll-area">
            {/* Selected Region Card */}
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selectedRegion.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-amber-300">{selectedRegion.nameId}</h3>
                  <span className="text-[10px] text-stone-400">Rekomendasi Level {selectedRegion.recommendedLevel}+</span>
                </div>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed mb-3">
                {selectedRegion.descriptionId}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedRegion.color }}
                />
                <span className="text-[10px] font-mono text-stone-400">
                  Zona: {selectedRegion.id}
                </span>
              </div>
            </div>

            {/* Fast Travel / Teleport Waypoints List */}
            <div className="mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Titik Teleportasi (Fast Travel)
              </h4>
              <div className="space-y-2">
                {WAYPOINTS.map((wp) => (
                  <div
                    key={wp.id}
                    className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 hover:border-cyan-500/60 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{wp.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-stone-200 group-hover:text-cyan-300">
                          {wp.nameId}
                        </p>
                        <p className="text-[10px] text-stone-500">{wp.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onFastTravel(wp.pos[0], wp.pos[1]);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-700/80 hover:bg-cyan-600 text-[10px] font-bold text-white shadow transition-colors cursor-pointer"
                    >
                      Teleport
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Map Legend */}
            {showLegend && (
              <div className="mt-auto p-3 rounded-xl bg-stone-900/50 border border-stone-800/80">
                <h5 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Keterangan Simbol
                </h5>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Posisi Pemain</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span>Teleportasi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span>Tetua / NPC</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Peti Harta</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Musuh / Monster</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <span>Boss Titan</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-stone-950 border-t border-stone-800 text-[11px] text-stone-400 font-mono">
          <div className="flex items-center gap-4">
            <span>
              Koordinat Kamu: <strong className="text-amber-400">X: {Math.round(playerPos.x)}, Z: {Math.round(playerPos.z)}</strong>
            </span>
            <span>
              Wilayah Saat Ini: <strong className="text-stone-200">{currentRegion.nameId}</strong>
            </span>
          </div>
          <div>
            Tekan <kbd className="px-1.5 py-0.5 bg-stone-800 text-amber-300 rounded border border-stone-700">M</kbd> atau <kbd className="px-1.5 py-0.5 bg-stone-800 text-amber-300 rounded border border-stone-700">ESC</kbd> untuk menutup
          </div>
        </div>
      </div>
    </div>
  );
};
