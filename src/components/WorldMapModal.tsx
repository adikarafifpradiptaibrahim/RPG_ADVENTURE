import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Compass,
  Sparkles,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
} from 'lucide-react';
import { MapMarker, RegionInfo } from '../types/game';
import { REGIONS, WAYPOINTS } from '../game/mapData';
import {
  WORLD_BOUNDS,
  WORLD_LANDMARKS,
  worldToMapPercent,
  mapPercentToWorld,
  LandmarkDef,
} from '../game/3d/worldData';
import { renderIllustratedMap } from '../game/mapIllustratedRenderer';

export interface WorldHotspot {
  id: string;
  nameId: string;
  nameEn: string;
  leftPct: number; // percentage left on reference map (0..100)
  topPct: number;  // percentage top on reference map (0..100)
  worldX: number;
  worldZ: number;
  level: number;
  isBoss?: boolean;
  desc: string;
  waypointId?: string;
  icon: string;
  color: string;
}

export interface MapLandmark {
  id: string;
  name: string;
  nameId: string;
  icon: string;
  x: number;
  z: number;
  level: number;
  desc: string;
  color: string;
  isBoss?: boolean;
  waypointId?: string;
  leftPct?: number;
  topPct?: number;
}

// 100% Single Source of Truth derived from worldData.ts
export const WORLD_HOTSPOTS: WorldHotspot[] = WORLD_LANDMARKS.map((lm) => {
  const { xPercent, yPercent } = worldToMapPercent(lm.x, lm.z);
  return {
    id: lm.id,
    nameId: lm.nameId,
    nameEn: lm.name,
    leftPct: xPercent,
    topPct: yPercent,
    worldX: lm.x,
    worldZ: lm.z,
    level: lm.level,
    isBoss: lm.isBoss,
    desc: lm.descriptionId || lm.description,
    waypointId: lm.waypointId,
    icon: lm.icon,
    color: lm.color,
  };
});

// Re-export LANDMARKS for full backward compatibility
export const LANDMARKS: MapLandmark[] = WORLD_HOTSPOTS.map((h) => ({
  id: h.id,
  name: h.nameEn,
  nameId: h.nameId,
  icon: h.icon,
  x: h.worldX,
  z: h.worldZ,
  level: h.level,
  desc: h.desc,
  color: h.color,
  isBoss: h.isBoss,
  waypointId: h.waypointId,
  leftPct: h.leftPct,
  topPct: h.topPct,
}));

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
  unlockedCheckpoints = ['wp_village'],
  onFastTravel,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo>(currentRegion);
  const [showLegend, setShowLegend] = useState(true);
  const [inspectedHotspot, setInspectedHotspot] = useState<WorldHotspot | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<WorldHotspot | null>(null);
  const [waypointMarker, setWaypointMarker] = useState<{ x: number; z: number; name: string } | null>(null);

  // Canvas ref for procedural vector map
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Navigation transform using uncontrolled Direct DOM (useRef) for 60/120 FPS performance
  const transformRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1.0 });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapPlaneRef = useRef<HTMLDivElement | null>(null);
  const zoomLabelRef = useRef<HTMLDivElement | null>(null);
  const navHintRef = useRef<HTMLSpanElement | null>(null);

  // Drag interaction tracking
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Single RAF scheduler
  const rafIdRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // HUD scale state
  const [hudScale, setHudScale] = useState<number>(1.0);

  // Clamped Pan Handler
  const clampPan = useCallback((nx: number, ny: number, curScale: number) => {
    const maxPanX = (curScale - 1.0) * 320;
    const maxPanY = (curScale - 1.0) * 240;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, nx)),
      y: Math.max(-maxPanY, Math.min(maxPanY, ny)),
    };
  }, []);

  // Hardware-accelerated RAF transform update
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

  // Center on player position
  const handleCenterOnPlayer = useCallback(() => {
    const curScale = Math.max(1.5, transformRef.current.scale);
    transformRef.current.scale = curScale;
    const { xPercent, yPercent } = worldToMapPercent(playerPos.x, playerPos.z);
    const targetPanX = -(xPercent / 100 - 0.5) * 560 * curScale;
    const targetPanY = -(yPercent / 100 - 0.5) * 420 * curScale;
    const nextPan = clampPan(targetPanX, targetPanY, curScale);
    transformRef.current.x = nextPan.x;
    transformRef.current.y = nextPan.y;

    if (mapPlaneRef.current) {
      mapPlaneRef.current.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    requestTransformUpdate();
    setHudScale(curScale);
  }, [playerPos.x, playerPos.z, clampPan, requestTransformUpdate]);

  // Zoom In / Out Handlers
  const handleZoomIn = () => {
    const next = Math.min(3.0, Math.round((transformRef.current.scale + 0.5) * 10) / 10);
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

  // Render high-res illustrated procedural map once onto canvas on open
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High resolution render buffer (1600 x 1200)
    canvas.width = 1600;
    canvas.height = 1200;
    renderIllustratedMap(ctx, 1600, 1200);
  }, [isOpen]);

  // Optimized Event Listeners for smooth drag/zoom
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
      const nextScale = Math.max(1.0, Math.min(3.0, Math.round((prevScale + delta) * 100) / 100));

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

  if (!isOpen) return null;

  const playerScreen = worldToMapPercent(playerPos.x, playerPos.z);

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
                Jelajahi benua raksasa Eldoria: Danau Titan, Ibukota Astraea, Gurun Solaria, Hutan Kabut, hingga Kaldera Naga Api.
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
          {/* Main Map Viewport Area */}
          <div className="relative flex-1 bg-stone-950/90 overflow-hidden flex items-center justify-center p-2 sm:p-4">
            {/* Topographical Map Container with Zoom & Pan Viewport (Aspect Ratio 1000/900 ~ 10:9) */}
            <div
              ref={mapContainerRef}
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
                cursor: hudScale > 1.0 ? 'grab' : 'default',
              } as React.CSSProperties}
              onClick={() => setInspectedHotspot(null)}
              className="relative w-full max-w-[840px] aspect-[1000/900] max-h-[82vh] rounded-2xl overflow-hidden border border-stone-700/60 shadow-2xl bg-[#0284c7]"
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
                {/* High-Resolution Procedural Vector Illustrated Map Canvas */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                />

                {/* INTERACTIVE HOTSPOTS & CLICKABLE LANDMARK HITBOXES */}
                {WORLD_HOTSPOTS.map((spot) => {
                  const isHovered = hoveredHotspot?.id === spot.id;
                  const isInspected = inspectedHotspot?.id === spot.id;
                  const hasWaypoint = Boolean(spot.waypointId);
                  const isUnlocked = hasWaypoint && spot.waypointId ? unlockedCheckpoints.includes(spot.waypointId) : false;

                  return (
                    <div
                      key={spot.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedHotspot(spot);
                        const reg = REGIONS.find((r) => Math.hypot(spot.worldX - r.center[0], spot.worldZ - r.center[1]) < 120);
                        if (reg) setSelectedRegion(reg);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isUnlocked) {
                          onFastTravel(spot.worldX, spot.worldZ);
                          onClose();
                        }
                      }}
                      onMouseEnter={() => setHoveredHotspot(spot)}
                      onMouseLeave={() => setHoveredHotspot(null)}
                      style={{ left: `${spot.leftPct}%`, top: `${spot.topPct}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer pointer-events-auto flex flex-col items-center group"
                      title={spot.nameId}
                    >
                      {/* Interactive circular pin badge */}
                      <div
                        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                          isHovered || isInspected
                            ? 'bg-amber-400 border-white shadow-[0_0_20px_rgba(251,191,36,0.8)] scale-110 z-30'
                            : 'bg-stone-900/85 border-amber-400/70 hover:border-amber-300 shadow-md'
                        }`}
                      >
                        <span className="text-base sm:text-lg select-none">{spot.icon}</span>
                      </div>

                      {/* Desktop Hover Floating Info Card */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-40 pointer-events-none animate-in fade-in duration-150">
                        <div className="px-3 py-2 bg-stone-950/95 border border-amber-400/80 rounded-xl shadow-2xl text-center whitespace-nowrap backdrop-blur-md min-w-[150px]">
                          <div className="flex items-center gap-1.5 justify-center text-[11px] sm:text-xs font-bold text-amber-200">
                            <span>{spot.icon}</span>
                            <span>{spot.nameId}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <span className={`text-[9px] font-mono font-semibold px-2 py-0.2 rounded-full ${
                              spot.isBoss
                                ? 'bg-red-950/90 text-red-300 border border-red-800/80'
                                : 'bg-cyan-950/90 text-cyan-300 border border-cyan-800/80'
                            }`}>
                              {spot.isBoss ? `World Boss (Lv. ${spot.level})` : `Lv. ${spot.level}+`}
                            </span>
                          </div>
                          <p className="text-[9px] text-stone-300 mt-1 max-w-[210px] whitespace-normal leading-tight">
                            {spot.desc}
                          </p>
                          {hasWaypoint && (
                            <p className="text-[8px] mt-1 text-amber-300 font-semibold">
                              {isUnlocked ? '⚡ Klik Ganda: Fast Travel' : '🔒 Checkpoint Belum Terbuka'}
                            </p>
                          )}
                        </div>
                        <div className="w-2 h-2 bg-stone-950 border-r border-b border-amber-400/80 rotate-45 -mt-1" />
                      </div>
                    </div>
                  );
                })}

                {/* Custom Player Placed Waypoint Marker */}
                {waypointMarker && (() => {
                  const { left, top } = worldToMapPercent(waypointMarker.x, waypointMarker.z);
                  return (
                    <div
                      style={{ left, top }}
                      className="absolute -translate-x-1/2 -translate-y-full z-28 pointer-events-none animate-bounce"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xl drop-shadow-lg">📍</span>
                        <span className="px-1.5 py-0.5 rounded bg-black/90 text-[8px] font-bold text-amber-300 border border-amber-400 whitespace-nowrap shadow-lg">
                          {waypointMarker.name}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* LIVE DYNAMIC PLAYER PIN WITH ROTATING HEADING ARROW */}
                <div
                  style={{ left: playerScreen.left, top: playerScreen.top }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-8 h-8 rounded-full bg-amber-400/30 animate-ping" />
                    <div
                      className="w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-2xl flex items-center justify-center"
                      style={{
                        transform: `rotate(${(playerPos.rotationY * 180) / Math.PI + 180}deg)`,
                      }}
                    >
                      <Navigation className="w-3.5 h-3.5 text-stone-900 fill-stone-900" />
                    </div>
                  </div>
                  <span className="mt-1 px-2 py-0.5 bg-black/90 border border-amber-400/80 rounded-md text-[9px] font-bold text-amber-300 whitespace-nowrap shadow-xl">
                    Kamu Disini
                  </span>
                </div>
              </div>
              {/* END GPU Hardware Accelerated Continent Map Plane */}

              {/* FLOATING ZOOM & CAMERA CONTROLS (Top-Left HUD) */}
              <div className="absolute top-3 left-3 z-35 flex items-center gap-1.5 p-1 bg-stone-900/90 backdrop-blur-md border border-amber-600/60 rounded-xl shadow-xl pointer-events-auto">
                <button
                  onClick={handleZoomIn}
                  disabled={hudScale >= 3.0}
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

              {/* Tap-to-Inspect Landmark Bottom-Sheet Card */}
              {inspectedHotspot && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-40 bg-stone-950/95 border border-amber-400/90 rounded-2xl shadow-2xl backdrop-blur-md p-3 animate-in fade-in slide-in-from-bottom duration-200 pointer-events-auto"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg shadow">
                        {inspectedHotspot.icon}
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-amber-200 leading-tight">
                          {inspectedHotspot.nameId}
                        </h3>
                        <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 inline-block mt-0.5">
                          {inspectedHotspot.isBoss
                            ? `World Boss (Lv. ${inspectedHotspot.level})`
                            : `Rekomendasi Level ${inspectedHotspot.level}+`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setInspectedHotspot(null)}
                      className="w-5 h-5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-300 mt-2 leading-relaxed">
                    {inspectedHotspot.desc}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-800">
                    <button
                      onClick={() => {
                        setWaypointMarker({
                          x: inspectedHotspot.worldX,
                          z: inspectedHotspot.worldZ,
                          name: inspectedHotspot.nameId,
                        });
                        setInspectedHotspot(null);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-[11px] shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📍</span> Tandai Lokasi
                    </button>
                    {inspectedHotspot.waypointId && unlockedCheckpoints.includes(inspectedHotspot.waypointId) && (
                      <button
                        onClick={() => {
                          onFastTravel(inspectedHotspot.worldX, inspectedHotspot.worldZ);
                          onClose();
                        }}
                        className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>✨</span> Teleport
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          isUnlocked
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer active:scale-95'
                            : 'bg-stone-800 text-stone-600 cursor-not-allowed'
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
              <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 text-[11px]">
                <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Legenda Peta
                </h4>
                <div className="grid grid-cols-2 gap-2 text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#65a30d]" />
                    <span>Padang Rumput</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                    <span>Gurun Pasir Solaria</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                    <span>Samudra Azure & Sungai</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0]" />
                    <span>Pegunungan Salju</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
                    <span>Hutan Kabut</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                    <span>Kaldera Sarang Naga</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const WorldMapModal = React.memo(WorldMapModalComponent);
export default WorldMapModal;
