import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { getContinentBiomeSample, getBiomeAt } from '../game/mapSampler';
import { drawRoadsOnWorldMap } from '../game/RoadSystem';

// Persistent continent map cached image data to eliminate all lag on open & pan
const MAP_CACHE_VERSION = 'v5.0_dense_continuous_ribbon_roads';
let cachedMapVersion = '';
let cachedMapImageData: ImageData | null = null;

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: { x: number; z: number; rotationY: number };
  currentRegion: RegionInfo;
  markers: MapMarker[];
  unlockedCheckpoints?: string[];
  onFastTravel: (x: number, z: number) => void;
}

const WorldMapModalComponent: React.FC<WorldMapModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  currentRegion,
  markers,
  unlockedCheckpoints = ['wp_village'],
  onFastTravel,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo>(currentRegion);
  const [showLegend, setShowLegend] = useState(true);

  // Navigation state using uncontrolled Direct DOM (useRef) to ensure pure 60/120 FPS performance with zero React re-renders
  const transformRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1.0 });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapPlaneRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomLabelRef = useRef<HTMLDivElement | null>(null);
  const navHintRef = useRef<HTMLSpanElement | null>(null);

  // Drag interaction tracking (uncontrolled)
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Single RAF rendering scheduler
  const rafIdRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // HUD button state only (updated strictly on gesture settlement or button clicks)
  const [hudScale, setHudScale] = useState<number>(1.0);

  // Filtered Important Markers: Hapus seluruh ikon/pin monster biasa (mob/trash monsters)
  // Sisakan HANYA pin lokasi utama (Desa, Istana, Benteng, Reruntuhan) dan Boss Raksasa (Titan, Naga Ignis, Cacing Jarrus)
  const importantMarkers = useMemo(() => {
    return markers.filter((marker) => {
      // 1. Hapus seluruh monster biasa / trash mobs
      if (marker.type === 'enemy') return false;

      // 2. Boss Raksasa (Titan Kuno, Naga Purba Ignis, Cacing Purba Jarrus)
      if (marker.type === 'boss') return true;

      // 3. Lokasi Utama (Desa, Istana, Benteng, Reruntuhan, Pelabuhan)
      if (marker.type === 'waypoint' || marker.id.startsWith('landmark_')) return true;

      return false;
    });
  }, [markers]);

  // Map world coordinate boundaries for projection
  // 2.5x Expanded World bounds: X from -580 to +680 (width 1260), Z from -460 to +460 (height 920)
  const minX = -580;
  const maxX = 680;
  const minZ = -460;
  const maxZ = 460;

  // Clamped Pan Handler (prevents panning past the map boundaries at any zoom level)
  const clampPan = useCallback((nx: number, ny: number, curScale: number) => {
    const maxPanX = (curScale - 1.0) * 280;
    const maxPanY = (curScale - 1.0) * 210;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, nx)),
      y: Math.max(-maxPanY, Math.min(maxPanY, ny)),
    };
  }, []);

  // Hardware-accelerated RAF transform update (runs on monitor refresh rate cycle, 60/120 FPS)
  const requestTransformUpdate = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const { x, y, scale } = transformRef.current;
      if (mapPlaneRef.current) {
        mapPlaneRef.current.style.transform = `translate3d(${x}px, ${y}px, 0px) scale(${scale})`;
      }
      if (zoomLabelRef.current) {
        zoomLabelRef.current.textContent = `${scale.toFixed(1)}x`;
      }
      if (navHintRef.current) {
        navHintRef.current.textContent =
          scale > 1.0 ? 'Tahan & Geser untuk Menjelajah' : 'Scroll / (+) untuk Memperbesar';
      }
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = isDraggingRef.current
          ? 'grabbing'
          : scale > 1.0
          ? 'grab'
          : 'default';
      }
    });
  }, []);

  // Center on player (centers view onto player position and zooms in if at default scale)
  const handleCenterOnPlayer = useCallback(() => {
    const curScale = Math.max(1.5, transformRef.current.scale);
    transformRef.current.scale = curScale;
    const normX = (playerPos.x - minX) / (maxX - minX);
    const normZ = (playerPos.z - minZ) / (maxZ - minZ);
    const targetPanX = -(normX - 0.5) * 560 * curScale;
    const targetPanY = -(normZ - 0.5) * 420 * curScale;
    const nextPan = clampPan(targetPanX, targetPanY, curScale);
    transformRef.current.x = nextPan.x;
    transformRef.current.y = nextPan.y;

    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    requestTransformUpdate();
    setHudScale(curScale);
  }, [playerPos.x, playerPos.z, clampPan, requestTransformUpdate]);

  // Zoom In / Out Handlers with smooth GPU transitions
  const handleZoomIn = () => {
    const next = Math.min(3.5, Math.round((transformRef.current.scale + 0.5) * 10) / 10);
    transformRef.current.scale = next;
    const nextPan = clampPan(transformRef.current.x, transformRef.current.y, next);
    transformRef.current.x = nextPan.x;
    transformRef.current.y = nextPan.y;

    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    requestTransformUpdate();
    setHudScale(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(1.0, Math.round((transformRef.current.scale - 0.5) * 10) / 10);
    transformRef.current.scale = next;
    const nextPan = next === 1.0 ? { x: 0, y: 0 } : clampPan(transformRef.current.x, transformRef.current.y, next);
    transformRef.current.x = nextPan.x;
    transformRef.current.y = nextPan.y;

    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    requestTransformUpdate();
    setHudScale(next);
  };

  const handleResetZoom = () => {
    transformRef.current = { x: 0, y: 0, scale: 1.0 };
    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    requestTransformUpdate();
    setHudScale(1.0);
  };

  // Optimized Native Non-Passive Event Listeners for smooth drag/zoom with zero gesture delay
  useEffect(() => {
    if (!isOpen) return;
    const container = mapContainerRef.current;
    if (!container) return;

    // Reset view state when modal opens
    transformRef.current = { x: 0, y: 0, scale: 1.0 };
    setHudScale(1.0);
    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
      mapPlaneRef.current.style.transition = 'none';
    }
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = '1.0x';
    }
    if (navHintRef.current) {
      navHintRef.current.textContent = 'Scroll / (+) untuk Memperbesar';
    }
    container.style.cursor = 'default';

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      const prevScale = transformRef.current.scale;
      const nextScale = Math.max(1.0, Math.min(3.5, Math.round((prevScale + delta) * 100) / 100));

      if (nextScale === prevScale) return;

      const nextPan = nextScale === 1.0 ? { x: 0, y: 0 } : clampPan(transformRef.current.x, transformRef.current.y, nextScale);

      transformRef.current = {
        x: nextPan.x,
        y: nextPan.y,
        scale: nextScale,
      };

      if (mapPlaneRef.current) {
        mapPlaneRef.current.style.transition = 'transform 0.08s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      requestTransformUpdate();

      if (wheelCommitTimerRef.current) clearTimeout(wheelCommitTimerRef.current);
      wheelCommitTimerRef.current = setTimeout(() => {
        setHudScale(nextScale);
      }, 120);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (transformRef.current.scale <= 1.0) return;

      // Do not hijack clicks on waypoints or interactive buttons
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('button') || target.closest('.cursor-pointer'))) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { x: transformRef.current.x, y: transformRef.current.y };

      if (mapPlaneRef.current) {
        mapPlaneRef.current.style.transition = 'none';
      }
      container.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || transformRef.current.scale <= 1.0) return;

      e.preventDefault();
      e.stopPropagation();

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const targetX = panStartRef.current.x + dx;
      const targetY = panStartRef.current.y + dy;
      const clamped = clampPan(targetX, targetY, transformRef.current.scale);

      transformRef.current.x = clamped.x;
      transformRef.current.y = clamped.y;

      requestTransformUpdate();
    };

    const onPointerUp = (e: PointerEvent) => {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (mapPlaneRef.current) {
          mapPlaneRef.current.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        }
        container.style.cursor = transformRef.current.scale > 1.0 ? 'grab' : 'default';
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      onPointerUp(e);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('pointerdown', onPointerDown, { passive: false });
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', onPointerUp, { passive: false });
    container.addEventListener('pointercancel', onPointerCancel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerCancel);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (wheelCommitTimerRef.current) {
        clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
    };
  }, [isOpen, clampPan, requestTransformUpdate]);

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
    if (cachedMapVersion === MAP_CACHE_VERSION && cachedMapImageData && cachedMapImageData.width === width && cachedMapImageData.height === height) {
      ctx.putImageData(cachedMapImageData, 0, 0);
      drawRoadsOnWorldMap(ctx, width, height, minX, maxX, minZ, maxZ);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    // Direct pixel block sampling across the entire continent using getBiomeAt(wx, wz)
    const step = 2; // Crisp resolution

    for (let py = 0; py < height; py += step) {
      const v = py / height;
      const wz = minZ + v * (maxZ - minZ);

      for (let px = 0; px < width; px += step) {
        const u = px / width;
        const wx = minX + u * (maxX - minX);

        // Direct mathematical biome evaluation
        const zone = getBiomeAt(wx, wz);
        const sample = getContinentBiomeSample(wx, wz);

        let [r, g, b] = sample.color;

        // Apply exact requested 4-biome canvas palette
        if (!sample.isPath && sample.biomeId !== 'ship_deck' && sample.biomeId !== 'harbor_pier') {
          switch (zone.id) {
            case 'ocean':
              r = 2; g = 132; b = 199; // #0284c7 (Biru Laut Tropis Terbuka)
              break;
            case 'volcano':
              if (sample.biomeId === 'dragon_magma') {
                r = 220; g = 38; b = 38; // #dc2626 (Magma)
              } else {
                r = 28; g = 25; b = 23; // #1c1917 (Obsidian / Basalt)
              }
              break;
            case 'desert':
              r = 234; g = 179; b = 8; // #eab308 (Kuning Emas)
              break;
            case 'plains':
            default:
              r = 101; g = 163; b = 13; // #65a30d (Hijau Rumput Cerah)
              break;
          }
        }

        // Beach sand fringe along natural south and west coastlines
        const southCoastZ = 190 + Math.sin(wx * 0.012) * 20 + Math.cos(wx * 0.035) * 8;
        const westCoastX = -460 + Math.sin(wz * 0.015) * 35 + Math.cos(wz * 0.04) * 15;
        const isNearCoast = (wz >= southCoastZ - 8 && wz <= southCoastZ + 3 && wx >= westCoastX) ||
                            (wx >= westCoastX - 3 && wx <= westCoastX + 10 && wz <= southCoastZ);
        if (isNearCoast && sample.height < 0.6 && !sample.isPath) {
          r = 254; g = 215; b = 170;
        }

        // Dynamic hillshade sun angle (sun from North-West)
        const sunDot = 1.0 + (sample.slope * 0.42 * (u - v));
        const shade = Math.max(0.70, Math.min(1.30, sunDot));
        r = Math.min(255, Math.max(0, Math.round(r * shade)));
        g = Math.min(255, Math.max(0, Math.round(g * shade)));
        b = Math.min(255, Math.max(0, Math.round(b * shade)));

        // Topographical elevation contours
        if (sample.height > 0.5 && Math.abs(sample.height % 3.0) < 0.28) {
          r = Math.min(255, r + 35);
          g = Math.min(255, g + 35);
          b = Math.min(255, b + 45);
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

    cachedMapVersion = MAP_CACHE_VERSION;
    cachedMapImageData = imgData;
    ctx.putImageData(imgData, 0, 0);
    drawRoadsOnWorldMap(ctx, width, height, minX, maxX, minZ, maxZ);
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
              ref={mapContainerRef}
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
                cursor: hudScale > 1.0 ? 'grab' : 'default',
              } as React.CSSProperties}
              className="relative w-full h-full max-w-[620px] max-h-[580px] rounded-xl overflow-hidden border border-stone-700/60 shadow-inner bg-[#1e232a]"
            >
              {/* GPU Hardware Accelerated Continent Map Plane (translate3d + will-change: transform) */}
              <div
                ref={mapPlaneRef}
                className="absolute inset-0 w-full h-full"
                style={{
                  transform: `translate3d(${transformRef.current.x}px, ${transformRef.current.y}px, 0px) scale(${transformRef.current.scale})`,
                  transformOrigin: '50% 50%',
                  willChange: 'transform',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitUserDrag: 'none',
                  touchAction: 'none',
                  transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                } as React.CSSProperties}
              >
              {/* Real-time Topographical Biome Canvas */}
              <canvas
                ref={canvasRef}
                width={560}
                height={420}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitUserDrag: 'none',
                  touchAction: 'none',
                  willChange: 'transform',
                } as React.CSSProperties}
              />

              {/* DYNAMIC REGION CLICKABLE ZONES & LABELS */}
              {/* 1. Desa Utama Sanctuary (Pesisir Selatan Padang Rumput, X: 0, Z: 180) */}
              {(() => {
                const sp = worldToScreen(0, 180);
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

              {/* 2. Pelabuhan Sanctuary (Pesisir Selatan, X: 0, Z: 205) */}
              {(() => {
                const sp = worldToScreen(0, 205);
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
                      <span className="text-[7px] text-cyan-300/80 font-mono">Dermaga Kayu & Samudra Lepas</span>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Benteng Val-Kragor (Padang Rumput Timur, X: 380, Z: 80) */}
              {(() => {
                const sp = worldToScreen(380, 80);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[2])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-blue-950/80 border border-blue-400/60 shadow-lg hover:border-blue-300 hover:scale-110 transition-transform">
                      <span className="text-xs">🛡️</span>
                      <span className="text-[8px] font-bold text-blue-200 whitespace-nowrap">
                        {REGIONS[2].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 4. Ibukota Kerajaan Emas Astraea (Padang Rumput Barat Laut, X: -340, Z: -220) */}
              {(() => {
                const sp = worldToScreen(-340, -220);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[3])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1.5 rounded-xl bg-stone-950/75 border border-amber-400/80 shadow-2xl backdrop-blur-xs hover:border-amber-300 hover:scale-110 transition-transform">
                      <span className="text-sm sm:text-base">👑</span>
                      <span className="text-[9px] font-bold text-amber-300 tracking-wide whitespace-nowrap">
                        {REGIONS[3].nameId}
                      </span>
                      <span className="text-[7px] text-amber-200/80 font-mono">Ibukota Kerajaan</span>
                    </div>
                  </div>
                );
              })()}

              {/* 5. Ancient Titan Sanctuary Basin (Padang Rumput Barat Terpencil, X: -260, Z: -20) */}
              {(() => {
                const sp = worldToScreen(-260, -20);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[4])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-sky-950/80 border border-sky-500/70 shadow-lg hover:border-sky-400 hover:scale-110 transition-transform">
                      <span className="text-xs">🏛️</span>
                      <span className="text-[8px] font-bold text-sky-300 whitespace-nowrap">
                        {REGIONS[4].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 6. Mage Tower Puncak Halilintar (Bukit Padang Rumput Timur Tengah, X: 180, Z: 60) */}
              {(() => {
                const sp = worldToScreen(180, 60);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[5])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-indigo-950/80 border border-indigo-400/60 shadow-lg hover:border-indigo-300 hover:scale-110 transition-transform">
                      <span className="text-xs">⚡</span>
                      <span className="text-[8px] font-bold text-indigo-200 whitespace-nowrap">
                        {REGIONS[5].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 7. Desa Bazaar Gurun Solaria (Gurun Utara-Timur, X: 280, Z: -280) */}
              {(() => {
                const sp = worldToScreen(280, -280);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[7])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-yellow-950/80 border border-yellow-500/70 shadow-lg hover:border-yellow-400 hover:scale-110 transition-transform">
                      <span className="text-xs">🎪</span>
                      <span className="text-[8px] font-bold text-yellow-300 whitespace-nowrap">
                        Bazaar Gurun Solaria
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 8. Istana Taj Mahal Sultan Malik (X: 340, Z: -280) */}
              {(() => {
                const sp = worldToScreen(340, -280);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[7])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-yellow-950/80 border border-amber-400/80 shadow-lg hover:border-amber-300 hover:scale-110 transition-transform">
                      <span className="text-xs">🕌</span>
                      <span className="text-[8px] font-bold text-amber-200 whitespace-nowrap">
                        Istana Sultan Malik
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 9. Piramida Emas Solaria (Gurun Barat, X: 20, Z: -220) */}
              {(() => {
                const sp = worldToScreen(20, -220);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[7])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-amber-950/80 border border-yellow-500/70 shadow-lg hover:border-yellow-300 hover:scale-110 transition-transform">
                      <span className="text-xs">🏜️</span>
                      <span className="text-[8px] font-bold text-yellow-200 whitespace-nowrap">
                        Piramida Emas Solaria
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 10. Oase Tersembunyi Solaria (Gurun Utara, X: 150, Z: -360) */}
              {(() => {
                const sp = worldToScreen(150, -360);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[7])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-teal-950/80 border border-teal-400/70 shadow-lg hover:border-teal-300 hover:scale-110 transition-transform">
                      <span className="text-xs">🌴</span>
                      <span className="text-[8px] font-bold text-teal-200 whitespace-nowrap">
                        Oase Solaria
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 11. Kaldera Sarang Naga Purba (Pulau Vulkanik Selatan, X: 50, Z: 360) */}
              {(() => {
                const sp = worldToScreen(50, 360);
                if (!sp.visible) return null;
                return (
                  <div
                    onClick={() => setSelectedRegion(REGIONS[8])}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center p-1 rounded-lg bg-red-950/80 border border-red-500/70 shadow-lg hover:border-red-400 hover:scale-110 transition-transform">
                      <span className="text-xs">🐉</span>
                      <span className="text-[8px] font-bold text-red-300 whitespace-nowrap">
                        {REGIONS[8].nameId}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Coordinate Grid Overlay */}
              <div
                className="absolute inset-0 pointer-events-none grid grid-cols-4 grid-rows-4 border border-stone-700/20 divide-x divide-y divide-stone-700/20"
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                }}
              />

              {/* WAYPOINTS WITH FAST TRAVEL BUTTONS */}
              {WAYPOINTS.map((wp) => {
                const sp = worldToScreen(wp.pos[0], wp.pos[1]);
                if (!sp.visible) return null;
                const isUnlocked = unlockedCheckpoints.includes(wp.id);
                return (
                  <div
                    key={wp.id}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-25 group"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isUnlocked) {
                          onFastTravel(wp.pos[0], wp.pos[1]);
                          onClose();
                        }
                      }}
                      disabled={!isUnlocked}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 shadow-lg flex items-center justify-center text-[10px] sm:text-xs transition-transform hover:scale-125 pointer-events-auto ${
                        isUnlocked
                          ? 'bg-cyan-600/90 hover:bg-cyan-500 border-white text-white cursor-pointer shadow-cyan-500/50'
                          : 'bg-stone-800/80 border-stone-600/60 text-stone-400 opacity-60 cursor-not-allowed'
                      }`}
                      title={isUnlocked ? `Fast Travel ke: ${wp.nameId}` : `🔒 Checkpoint Terkunci: ${wp.nameId} (Kunjungi lokasi terlebih dahulu)`}
                    >
                      {isUnlocked ? wp.icon : '🔒'}
                    </button>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                      <div className={`px-2 py-1 bg-stone-900/95 border rounded-md shadow-xl text-center whitespace-nowrap ${
                        isUnlocked ? 'border-cyan-400/80' : 'border-stone-700'
                      }`}>
                        <p className={`text-[10px] sm:text-[11px] font-bold ${
                          isUnlocked ? 'text-cyan-200' : 'text-stone-400'
                        }`}>{wp.nameId}</p>
                        <p className="text-[8px] sm:text-[9px] text-stone-300">
                          {isUnlocked ? 'Klik untuk Teleportasi' : '🔒 Belum Terbuka (Kunjungi lokasi ini)'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* IMPORTANT MAP MARKERS ONLY (Boss Raksasa & Lokasi Utama) */}
              {importantMarkers.map((marker) => {
                const sp = worldToScreen(marker.x, marker.z);
                if (!sp.visible) return null;
                const isBoss = marker.type === 'boss';
                return (
                  <div
                    key={marker.id}
                    style={{ left: sp.left, top: sp.top }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-22 pointer-events-none"
                    title={marker.title}
                  >
                    {isBoss ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-5 h-5 rounded-full bg-red-600/40 animate-ping" />
                        <div className="w-5 h-5 rounded-full bg-red-600 border border-white shadow-xl flex items-center justify-center text-[10px] text-white font-bold drop-shadow">
                          {marker.icon || '💀'}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shadow-md border border-stone-900"
                        style={{ backgroundColor: marker.color || '#fff' }}
                      >
                        {marker.icon || '•'}
                      </div>
                    )}
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
                  disabled={hudScale >= 3.5}
                  className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Perbesar Peta (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div
                  ref={zoomLabelRef}
                  className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-200 min-w-[34px] text-center"
                >
                  {hudScale.toFixed(1)}x
                </div>
                <button
                  onClick={handleZoomOut}
                  disabled={hudScale <= 1.0}
                  className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Perkecil Peta (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-stone-700 mx-0.5" />
                <button
                  onClick={handleResetZoom}
                  disabled={hudScale === 1.0 && transformRef.current.x === 0 && transformRef.current.y === 0}
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
                <span ref={navHintRef}>
                  {hudScale > 1.0 ? 'Tahan & Geser untuk Menjelajah' : 'Scroll / (+) untuk Memperbesar'}
                </span>
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
                {WAYPOINTS.map((wp) => {
                  const isUnlocked = unlockedCheckpoints.includes(wp.id);
                  return (
                    <div
                      key={wp.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between transition-all group ${
                        isUnlocked
                          ? 'bg-stone-900/60 border-stone-800 hover:border-cyan-500/60'
                          : 'bg-stone-950/40 border-stone-900/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{isUnlocked ? wp.icon : '🔒'}</span>
                        <div>
                          <p className={`text-xs font-semibold ${
                            isUnlocked ? 'text-stone-200 group-hover:text-cyan-300' : 'text-stone-500'
                          }`}>
                            {wp.nameId}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {isUnlocked ? wp.desc : 'Kunjungi lokasi ini untuk membuka Fast Travel'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isUnlocked) {
                            onFastTravel(wp.pos[0], wp.pos[1]);
                            onClose();
                          }
                        }}
                        disabled={!isUnlocked}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold shadow transition-colors ${
                          isUnlocked
                            ? 'bg-cyan-700/80 hover:bg-cyan-600 text-white cursor-pointer'
                            : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                        }`}
                      >
                        {isUnlocked ? 'Teleport' : 'Terkunci'}
                      </button>
                    </div>
                  );
                })}
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

export const WorldMapModal = React.memo(WorldMapModalComponent, (prev, next) => {
  // If modal is closed and remains closed, do not re-render
  if (!prev.isOpen && !next.isOpen) return true;
  // If modal open state toggled, must re-render
  if (prev.isOpen !== next.isOpen) return false;
  // If current region or checkpoints changed, re-render
  if (prev.currentRegion.id !== next.currentRegion.id) return false;
  if (prev.unlockedCheckpoints?.length !== next.unlockedCheckpoints?.length) return false;
  // Ignore trash mob length changes completely (only re-render if important markers change)
  const prevImp = prev.markers.filter((m) => m.type === 'boss' || m.type === 'waypoint' || m.id.startsWith('landmark_')).length;
  const nextImp = next.markers.filter((m) => m.type === 'boss' || m.type === 'waypoint' || m.id.startsWith('landmark_')).length;
  if (prevImp !== nextImp) return false;
  // If player moved only slightly (< 1.2 units), avoid re-rendering entire modal tree during active interaction
  const dPos = Math.hypot(prev.playerPos.x - next.playerPos.x, prev.playerPos.z - next.playerPos.z);
  const dRot = Math.abs(prev.playerPos.rotationY - next.playerPos.rotationY);
  if (dPos < 1.2 && dRot < 0.1) return true;
  return false;
});
