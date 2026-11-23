import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Crosshair,
  Move,
  RotateCw,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  X,
  Compass,
  Sliders,
} from 'lucide-react';
import {
  WORLD_LAYOUT_CONFIG,
  WorldLandmarkLayout,
  WorldBridgeLayout,
} from '../3d/worldLayoutConfig';

export interface WorldEditorPanelProps {
  gameEngine?: any;
  onClose?: () => void;
}

export const WorldEditorPanel: React.FC<WorldEditorPanelProps> = ({
  gameEngine,
  onClose,
}) => {
  const [targetId, setTargetId] = useState<string>('village');
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  
  // Transform values state
  const [x, setX] = useState<number>(-35);
  const [y, setY] = useState<number>(0.25);
  const [z, setZ] = useState<number>(135);
  const [rotYDeg, setRotYDeg] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [flattenRadius, setFlattenRadius] = useState<number>(40);

  // Status & feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Load target transform from config
  const syncFromTarget = useCallback((id: string) => {
    if (WORLD_LAYOUT_CONFIG.landmarks[id]) {
      const lm = WORLD_LAYOUT_CONFIG.landmarks[id];
      setX(Number(lm.x.toFixed(2)));
      setY(Number(lm.y.toFixed(2)));
      setZ(Number(lm.z.toFixed(2)));
      setRotYDeg(Math.round((lm.rotationY * 180) / Math.PI));
      setScale(Number((lm.scale || 1.0).toFixed(2)));
      setFlattenRadius(Number((lm.flattenRadius || 30).toFixed(1)));
    } else if (WORLD_LAYOUT_CONFIG.bridges[id]) {
      const br = WORLD_LAYOUT_CONFIG.bridges[id];
      setX(Number(br.x.toFixed(2)));
      setY(Number(br.y.toFixed(2)));
      setZ(Number(br.z.toFixed(2)));
      setRotYDeg(Math.round((br.rotationY * 180) / Math.PI));
      setScale(Number((br.scale || 1.0).toFixed(2)));
      setFlattenRadius(30);
    }
    if (gameEngine?.selectEditorTarget) {
      gameEngine.selectEditorTarget(id);
    }
  }, [gameEngine]);

  // Initial target sync
  useEffect(() => {
    syncFromTarget(targetId);
  }, [targetId, syncFromTarget]);

  // Listen to 3D Gizmo transforms from GameEngine
  useEffect(() => {
    if (!gameEngine) return;
    gameEngine.onWorldEditorTransformChange = (
      id: string,
      transform: { x: number; y: number; z: number; rotationY: number; scale: number }
    ) => {
      if (id === targetId) {
        setX(transform.x);
        setY(transform.y);
        setZ(transform.z);
        setRotYDeg(Math.round((transform.rotationY * 180) / Math.PI));
        setScale(transform.scale);
      }
    };

    return () => {
      if (gameEngine) {
        gameEngine.onWorldEditorTransformChange = undefined;
      }
    };
  }, [gameEngine, targetId]);

  // Update GameEngine whenever an input or slider changes
  const applyTransform = (newVals: {
    x?: number;
    y?: number;
    z?: number;
    rotYDeg?: number;
    scale?: number;
    flattenRadius?: number;
  }) => {
    const curX = newVals.x !== undefined ? newVals.x : x;
    const curY = newVals.y !== undefined ? newVals.y : y;
    const curZ = newVals.z !== undefined ? newVals.z : z;
    const curRotDeg = newVals.rotYDeg !== undefined ? newVals.rotYDeg : rotYDeg;
    const curRotRad = (curRotDeg * Math.PI) / 180;
    const curScale = newVals.scale !== undefined ? newVals.scale : scale;
    const curRadius = newVals.flattenRadius !== undefined ? newVals.flattenRadius : flattenRadius;

    if (newVals.x !== undefined) setX(curX);
    if (newVals.y !== undefined) setY(curY);
    if (newVals.z !== undefined) setZ(curZ);
    if (newVals.rotYDeg !== undefined) setRotYDeg(curRotDeg);
    if (newVals.scale !== undefined) setScale(curScale);
    if (newVals.flattenRadius !== undefined) setFlattenRadius(curRadius);

    if (gameEngine?.updateEditorTargetTransform) {
      gameEngine.updateEditorTargetTransform(targetId, {
        x: curX,
        y: curY,
        z: curZ,
        rotationY: curRotRad,
        scale: curScale,
        flattenRadius: curRadius,
      });
    }
  };

  // Change Gizmo Mode
  const handleSetMode = (mode: 'translate' | 'rotate' | 'scale') => {
    setGizmoMode(mode);
    if (gameEngine?.setEditorGizmoMode) {
      gameEngine.setEditorGizmoMode(mode);
    }
  };

  // Shortcut listeners for W, E, R
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'KeyW') {
        handleSetMode('translate');
      } else if (e.code === 'KeyE') {
        handleSetMode('rotate');
      } else if (e.code === 'KeyR') {
        handleSetMode('scale');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus Camera
  const handleFocusCamera = () => {
    if (gameEngine?.focusCameraOnTarget) {
      gameEngine.focusCameraOnTarget(targetId);
    }
  };

  // Save to File
  const handleSave = async () => {
    setIsSaving(true);
    setToastMessage(null);
    try {
      let res: { success: boolean; message?: string; error?: string };
      if (gameEngine?.saveWorldLayoutToFile) {
        res = await gameEngine.saveWorldLayoutToFile();
      } else {
        const fetchRes = await fetch('/__api/save-world-layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: WORLD_LAYOUT_CONFIG }),
        });
        res = await fetchRes.json();
      }

      if (res.success) {
        setToastType('success');
        setToastMessage(res.message || 'Tersimpan ke worldLayoutConfig.ts — Siap git push!');
      } else {
        setToastType('error');
        setToastMessage(res.error || 'Gagal menyimpan konfigurasi peta.');
      }
    } catch (err: any) {
      setToastType('error');
      setToastMessage(err?.message || 'Gagal menghubungi server pengembang.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const isLandmark = !!WORLD_LAYOUT_CONFIG.landmarks[targetId];

  return (
    <div className="fixed top-16 right-4 z-50 w-84 max-h-[85vh] flex flex-col rounded-2xl bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl text-white overflow-hidden text-xs select-none animate-fade-in pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-cyan-300 text-xs">🛠️ Editor Peta Dunia</h3>
            <p className="text-[10px] text-slate-400 font-mono">Dev Mode • Vite Live-Save</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Tutup Panel Editor"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="p-3.5 space-y-3.5 overflow-y-auto max-h-[calc(85vh-130px)] custom-scrollbar">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs animate-in fade-in duration-200 ${
              toastType === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-emerald-900/40 shadow-lg'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-rose-900/40 shadow-lg'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium leading-tight">{toastMessage}</div>
          </div>
        )}

        {/* Target Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
            <span>Pilih Objek Dunia:</span>
            <span className="text-[10px] text-cyan-400 font-mono uppercase">{targetId}</span>
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition cursor-pointer"
            >
              <optgroup label="Desa & Kota Peradaban">
                <option value="village">Desa Utama Sanctuary & Padang Rumput</option>
                <option value="harbor">Pelabuhan Sanctuary</option>
                <option value="astraea">Ibukota Kerajaan Astraea & Sun Palace</option>
                <option value="valkragor">Desa Benteng Val-Kragor</option>
                <option value="desert_village">Desa Gurun & Bazaar Solaria</option>
              </optgroup>
              <optgroup label="Landmark & Wilayah Khusus">
                <option value="abandoned_castle">Puing Kastil Terbengkalai</option>
                <option value="pyramid">Piramida Emas Solaria</option>
                <option value="oasis">Oase Solaria</option>
                <option value="sultan_palace">Istana Sultan Malik</option>
                <option value="kawah_boss">Arena Colosseum Boss Kawah</option>
                <option value="desert_sandworm">Sarang Cacing Sandworm</option>
                <option value="danau_titan">Lembah Danau Titan Kuno</option>
                <option value="canyon">Kanyon Kuno</option>
                <option value="mage_tower">Mage Tower Puncak Halilintar</option>
                <option value="moss_valley">Lembah Batu Lumut</option>
              </optgroup>
              <optgroup label="Kepulauan & Samudra">
                <option value="caldera">Kepulauan Kaldera Naga (Altar Utama)</option>
                <option value="caldera_sw_satellite">Pulau Satelit SW Kaldera</option>
                <option value="caldera_nw_satellite">Pulau Satelit NW Kaldera</option>
                <option value="caldera_dock">Dermaga Hangus Teluk Kaldera</option>
                <option value="lighthouse_island">Pulau Mercusuar & Karang Pelaut</option>
                <option value="pirate_island">Pulau Reruntuhan Bajak Laut</option>
                <option value="rocky_reef_island">Pulau Karang Terjal</option>
              </optgroup>
              <optgroup label="Jembatan Penyeberangan">
                <option value="bridge_astraea">Jembatan 1: Penyeberangan Astraea</option>
                <option value="bridge_south_chasm">Jembatan 2: Gantung Hilir Selatan</option>
                <option value="bridge_moss_valley">Jembatan 3: Lembah Lumut</option>
                <option value="bridge_puing_kastil">Jembatan 4: Puing Kastil</option>
                <option value="bridge_caldera_sw">Jembatan Rantai Kaldera SW</option>
                <option value="bridge_caldera_nw">Jembatan Rantai Kaldera NW</option>
              </optgroup>
            </select>
            <button
              type="button"
              onClick={handleFocusCamera}
              className="p-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/60 border border-cyan-500/40 text-cyan-300 hover:text-white transition cursor-pointer"
              title="Fokuskan Kamera ke Objek Ini"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gizmo Mode Selector Toolbar */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">Mode Gizmo 3D:</label>
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleSetMode('translate')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition cursor-pointer ${
                gizmoMode === 'translate'
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Geser Objek (Shortcut: W)"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Geser [W]</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetMode('rotate')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition cursor-pointer ${
                gizmoMode === 'rotate'
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Putar Rotasi Y (Shortcut: E)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Putar [E]</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetMode('scale')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition cursor-pointer ${
                gizmoMode === 'scale'
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ubah Skala (Shortcut: R)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Skala [R]</span>
            </button>
          </div>
        </div>

        {/* Coordinate Inputs & Sliders */}
        <div className="space-y-2.5 pt-1">
          {/* Posisi X */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-rose-400 font-semibold font-mono">Posisi X:</span>
              <input
                type="number"
                step="0.5"
                value={x}
                onChange={(e) => applyTransform({ x: parseFloat(e.target.value) || 0 })}
                className="w-18 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-[11px] focus:outline-none focus:border-cyan-400"
              />
            </div>
            <input
              type="range"
              min="-1250"
              max="650"
              step="1"
              value={x}
              onChange={(e) => applyTransform({ x: parseFloat(e.target.value) })}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Posisi Y (Elevasi) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-400 font-semibold font-mono">Posisi Y (Elevasi):</span>
              <input
                type="number"
                step="0.1"
                value={y}
                onChange={(e) => applyTransform({ y: parseFloat(e.target.value) || 0 })}
                className="w-18 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-[11px] focus:outline-none focus:border-cyan-400"
              />
            </div>
            <input
              type="range"
              min="-5"
              max="40"
              step="0.1"
              value={y}
              onChange={(e) => applyTransform({ y: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Posisi Z */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-sky-400 font-semibold font-mono">Posisi Z:</span>
              <input
                type="number"
                step="0.5"
                value={z}
                onChange={(e) => applyTransform({ z: parseFloat(e.target.value) || 0 })}
                className="w-18 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-[11px] focus:outline-none focus:border-cyan-400"
              />
            </div>
            <input
              type="range"
              min="-650"
              max="1150"
              step="1"
              value={z}
              onChange={(e) => applyTransform({ z: parseFloat(e.target.value) })}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Rotasi Y (Derajat) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-400 font-semibold font-mono">Rotasi Y:</span>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <input
                  type="number"
                  step="1"
                  value={rotYDeg}
                  onChange={(e) => applyTransform({ rotYDeg: parseFloat(e.target.value) || 0 })}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-[11px] focus:outline-none focus:border-cyan-400"
                />
                <span className="text-slate-400">°</span>
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotYDeg}
              onChange={(e) => applyTransform({ rotYDeg: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Skala */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-purple-400 font-semibold font-mono">Skala:</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5.0"
                value={scale}
                onChange={(e) => applyTransform({ scale: parseFloat(e.target.value) || 1.0 })}
                className="w-18 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-[11px] focus:outline-none focus:border-cyan-400"
              />
            </div>
            <input
              type="range"
              min="0.2"
              max="4.0"
              step="0.05"
              value={scale}
              onChange={(e) => applyTransform({ scale: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Flatten Radius (Khusus Landmark) */}
          {isLandmark && (
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="text-teal-400 font-semibold font-mono">Radius Perataan Medan:</span>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="120"
                  value={flattenRadius}
                  onChange={(e) => applyTransform({ flattenRadius: parseFloat(e.target.value) || 30 })}
                  className="w-18 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-[11px] focus:outline-none focus:border-cyan-400"
                />
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="1"
                value={flattenRadius}
                onChange={(e) => applyTransform({ flattenRadius: parseFloat(e.target.value) })}
                className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer / Permanent Save Button */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-900/30 border border-emerald-400/40 transition cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menulis ke File Kode...' : '💾 Simpan Permanen ke File Kode'}</span>
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-1 font-mono">
          Menulis langsung ke src/game/3d/worldLayoutConfig.ts
        </p>
      </div>
    </div>
  );
};

export default WorldEditorPanel;
