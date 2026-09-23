import React, { useState } from 'react';
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
} from 'lucide-react';
import { MapMarker, RegionInfo } from '../types/game';
import { REGIONS, WAYPOINTS } from '../game/mapData';

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

  if (!isOpen) return null;

  // Map world coordinate boundaries for projection
  // Expanded World bounds: X from -225 to +225 (width 450), Z from -190 to +175 (height 365)
  const minX = -225;
  const maxX = 225;
  const minZ = -190;
  const maxZ = 175;

  const worldToPercent = (wx: number, wz: number) => {
    const px = Math.min(100, Math.max(0, ((wx - minX) / (maxX - minX)) * 100));
    const pz = Math.min(100, Math.max(0, ((wz - minZ) / (maxZ - minZ)) * 100));
    return { left: `${px}%`, top: `${pz}%` };
  };

  const playerCoord = worldToPercent(playerPos.x, playerPos.z);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[720px] bg-stone-900/95 border-2 border-amber-600/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-amber-300 flex items-center gap-2">
                Peta Benua Eldoria
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700/60 text-amber-400 font-normal">
                  Open World 3D
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Jelajahi berbagai wilayah: Pedesaan, Pantai & Laut, Reruntuhan Kuno, Hutan Mistis, dan Kawah Titan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-xs font-semibold text-stone-300 flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {showLegend ? 'Sembunyikan Legenda' : 'Tampilkan Legenda'}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-red-950/60 hover:border-red-500/60 flex items-center justify-center text-stone-400 hover:text-red-300 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Map Viewport + Sidebar Info */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Map Canvas Area */}
          <div className="relative flex-1 bg-stone-950/90 overflow-hidden flex items-center justify-center p-4">
            {/* Topographical Map Container */}
            <div className="relative w-full h-full max-w-[620px] max-h-[580px] rounded-xl overflow-hidden border border-stone-700/60 shadow-inner bg-[#1e232a]">
              {/* Region Biome Background Layers */}
              {/* 0. Dragonfang Caldera & Inferno Archipelago (Far North Center) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[13])}
                className="absolute top-0 left-[34%] w-[32%] h-[18%] bg-gradient-to-b from-[#450a0a] via-[#7f1d1d]/60 to-transparent border-b border-red-500/50 cursor-pointer hover:brightness-125 transition-all z-15"
              >
                <div className="absolute top-1 left-2 text-[9px] font-bold text-red-300 flex items-center gap-1">
                  <span>🐉</span> {REGIONS[13].nameId} (Lv.{REGIONS[13].recommendedLevel})
                </div>
                <div className="absolute bottom-1 right-2 text-[8px] text-red-400 font-mono">
                  Sarang Naga
                </div>
              </div>

              {/* 0.1. Thunderpeak Lightning Spire (Far North-West) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[11])}
                className="absolute top-0 left-0 w-[30%] h-[20%] bg-gradient-to-br from-[#1e1b4b] via-[#312e81]/60 to-transparent border-r border-b border-indigo-500/40 cursor-pointer hover:brightness-125 transition-all z-15"
              >
                <div className="absolute top-1 left-2 text-[9px] font-bold text-indigo-200 flex items-center gap-1">
                  <span>⚡</span> {REGIONS[11].nameId} (Lv.{REGIONS[11].recommendedLevel})
                </div>
                <div className="absolute bottom-1 left-2 text-[8px] text-indigo-300">
                  Altar Halilintar
                </div>
              </div>

              {/* 1. Frostpeak Glacier Summit (North-East) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[7])}
                className="absolute top-0 right-0 w-[35%] h-[32%] bg-gradient-to-bl from-[#0c4a6e] via-[#0284c7]/40 to-transparent border-l border-b border-sky-400/40 cursor-pointer hover:brightness-125 transition-all z-10"
              >
                <div className="absolute top-2 right-2 text-[10px] font-bold text-sky-200 flex items-center gap-1 text-right">
                  <span>❄️</span> {REGIONS[7].nameId} (Lv.{REGIONS[7].recommendedLevel})
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-80 pointer-events-none">
                  <span className="text-base">🏔️</span>
                  <span className="text-[8px] text-sky-300 font-bold">Cryo Altar</span>
                </div>
              </div>

              {/* 2. Volcanic Crater Zone (North Center) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[4])}
                className="absolute top-[18%] left-[26%] w-[39%] h-[26%] bg-gradient-to-b from-[#211210] via-[#2d1815] to-transparent border-b border-red-900/40 cursor-pointer hover:brightness-110 transition-all z-5"
              >
                <div className="absolute top-2 left-2 text-[10px] font-bold text-red-400/90 flex items-center gap-1">
                  <span>🌋</span> {REGIONS[4].nameId} (Lv.{REGIONS[4].recommendedLevel})
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-red-500/40 bg-red-950/40 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-red-600/30 blur-sm animate-pulse" />
                  <span className="text-sm">💀</span>
                </div>
              </div>

              {/* 0.2. Solaria Golden Dunes & Sunken Pyramid (South-West) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[10])}
                className="absolute bottom-0 left-0 w-[32%] h-[26%] bg-gradient-to-tr from-[#713f12] via-[#ca8a04]/40 to-transparent border-t border-r border-yellow-500/40 cursor-pointer hover:brightness-125 transition-all z-15"
              >
                <div className="absolute bottom-2 left-2 text-[9px] font-bold text-yellow-300 flex items-center gap-1">
                  <span>🏜️</span> {REGIONS[10].nameId} (Lv.{REGIONS[10].recommendedLevel})
                </div>
                <div className="absolute top-2 left-3 text-[8px] text-yellow-200">
                  Piramida Emas
                </div>
              </div>

              {/* 0.3. Jade Bamboo Grove & Pagoda (South-East) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[12])}
                className="absolute bottom-0 right-0 w-[32%] h-[26%] bg-gradient-to-tl from-[#064e3b] via-[#059669]/40 to-transparent border-t border-l border-emerald-500/40 cursor-pointer hover:brightness-125 transition-all z-15"
              >
                <div className="absolute bottom-2 right-2 text-[9px] font-bold text-emerald-300 flex items-center gap-1 text-right">
                  <span>⛩️</span> {REGIONS[12].nameId} (Lv.{REGIONS[12].recommendedLevel})
                </div>
                <div className="absolute top-2 right-3 text-[8px] text-emerald-200">
                  Pagoda Giok
                </div>
              </div>

              {/* 3. Shadowfen Gloom Marsh (Far West) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[8])}
                className="absolute top-[20%] left-0 w-[26%] h-[50%] bg-gradient-to-r from-[#2e1065]/90 via-[#3b0764]/60 to-transparent border-r border-purple-900/40 cursor-pointer hover:brightness-110 transition-all z-10"
              >
                <div className="absolute top-2 left-2 text-[10px] font-bold text-purple-300 flex items-center gap-1">
                  <span>🍄</span> {REGIONS[8].nameId} (Lv.{REGIONS[8].recommendedLevel})
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-70 pointer-events-none">
                  <span className="text-base">🧪</span>
                  <span className="text-[8px] text-purple-300">Rawa Gelap</span>
                </div>
              </div>

              {/* 4. Ancient Ruins (West Center) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[2])}
                className="absolute top-[32%] left-[26%] w-[20%] h-[38%] bg-gradient-to-r from-[#263238]/80 to-transparent border-r border-cyan-900/30 cursor-pointer hover:brightness-110 transition-all"
              >
                <div className="absolute top-2 left-2 text-[10px] font-bold text-cyan-300/90 flex items-center gap-1">
                  <span>🏛️</span> {REGIONS[2].nameId}
                </div>
                <div className="absolute bottom-3 left-3 text-stone-400/70 text-xs flex gap-1 pointer-events-none">
                  <span>🏛️</span>
                  <span>⚔️</span>
                </div>
              </div>

              {/* 5. Sanctuary Village (Center) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[0])}
                className="absolute top-[34%] left-[46%] w-[16%] h-[28%] rounded-xl bg-amber-950/40 border border-amber-600/40 cursor-pointer hover:brightness-110 transition-all flex flex-col items-center justify-center z-10"
              >
                <span className="text-lg">⛲</span>
                <span className="text-[10px] font-bold text-amber-300">
                  Desa Sanctuary
                </span>
                <span className="text-[8px] text-amber-200/70">Pusat Desa</span>
              </div>

              {/* 6. Mystic Forest (East Center) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[3])}
                className="absolute top-[32%] left-[62%] w-[16%] h-[34%] bg-gradient-to-l from-[#1b3022]/80 to-transparent cursor-pointer hover:brightness-110 transition-all"
              >
                <div className="absolute top-2 right-1 text-[10px] font-bold text-emerald-300/90 flex items-center gap-1 text-right">
                  <span>🌲</span> Hutan Pinus
                </div>
                <div className="absolute bottom-3 right-3 text-emerald-500/70 text-xs flex gap-1 pointer-events-none">
                  <span>🌲</span>
                  <span>🔮</span>
                </div>
              </div>

              {/* 7. Misty Chasm & Suspension Bridge (Mid-East) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[5])}
                className="absolute top-[34%] left-[78%] w-[9%] h-[30%] bg-stone-800/40 border-l border-r border-stone-600/30 cursor-pointer hover:brightness-125 transition-all flex flex-col items-center justify-center z-5"
              >
                <span className="text-xs">🌉</span>
                <span className="text-[7px] text-stone-300 font-bold text-center leading-tight">Jembatan Gantung</span>
              </div>

              {/* 8. Fortress Village Val-Kragor (Far East Highland) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[6])}
                className="absolute top-[28%] right-0 w-[22%] h-[40%] bg-gradient-to-l from-[#1e3a8a]/80 via-[#1e40af]/40 to-transparent border-l border-blue-500/40 cursor-pointer hover:brightness-110 transition-all z-10 flex flex-col justify-between p-2"
              >
                <div className="text-[10px] font-bold text-blue-300 flex items-center gap-1 justify-end">
                  <span>🏰</span> Val-Kragor (Lv.{REGIONS[6].recommendedLevel})
                </div>
                <div className="flex flex-col items-center pointer-events-none">
                  <span className="text-base">🛡️</span>
                  <span className="text-[8px] text-blue-200 font-bold">Benteng Dataran Tinggi</span>
                </div>
              </div>

              {/* 9. Coral Cove & Shipwreck (South East Coast) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[9])}
                className="absolute bottom-0 right-0 w-[42%] h-[30%] bg-gradient-to-t from-[#78350f]/80 via-[#0284c7]/40 to-transparent border-t border-amber-500/30 cursor-pointer hover:brightness-110 transition-all z-10"
              >
                <div className="absolute bottom-2 right-3 text-[10px] font-bold text-amber-300 flex items-center gap-1 justify-end">
                  <span>🏴‍☠️</span> {REGIONS[9].nameId}
                </div>
                <div className="absolute top-2 right-1/3 text-xs flex items-center gap-1 text-amber-200 pointer-events-none">
                  <span>🏝️</span>
                  <span>⛵ Karam</span>
                </div>
              </div>

              {/* 10. Azure Coast & Ocean (South) */}
              <div
                onClick={() => setSelectedRegion(REGIONS[1])}
                className="absolute bottom-0 left-0 w-[58%] h-[30%] bg-gradient-to-t from-[#023e8a] via-[#0077b6] to-[#0096c7]/60 border-t border-cyan-400/30 cursor-pointer hover:brightness-110 transition-all"
              >
                {/* Sandy Beach Ribbon */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-[#fde047]/30 border-b border-yellow-500/30" />
                <div className="absolute bottom-2 left-3 text-[10px] font-bold text-cyan-200 flex items-center gap-1">
                  <span>🌊</span> {REGIONS[1].nameId} (Lv.{REGIONS[1].recommendedLevel})
                </div>
                <div className="absolute top-2 left-1/3 text-cyan-100/90 text-xs flex items-center gap-2 pointer-events-none">
                  <span>⚓ Dermaga</span>
                </div>
              </div>

              {/* Coordinate Grid Lines */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-4 grid-rows-4 border border-stone-700/20 divide-x divide-y divide-stone-700/20" />

              {/* Waypoints with Fast Travel Buttons */}
              {WAYPOINTS.map((wp) => {
                const pos = worldToPercent(wp.pos[0], wp.pos[1]);
                return (
                  <div
                    key={wp.id}
                    style={pos}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                  >
                    <button
                      onClick={() => {
                        onFastTravel(wp.pos[0], wp.pos[1]);
                        onClose();
                      }}
                      className="w-7 h-7 rounded-full bg-cyan-600/90 hover:bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-xs transition-transform hover:scale-125"
                      title={`Fast Travel ke: ${wp.nameId}`}
                    >
                      {wp.icon}
                    </button>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                      <div className="px-2 py-1 bg-stone-900/95 border border-cyan-400/80 rounded-md shadow-xl text-center whitespace-nowrap">
                        <p className="text-[11px] font-bold text-cyan-200">{wp.nameId}</p>
                        <p className="text-[9px] text-stone-300">Klik untuk Teleportasi</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Dynamic Map Markers (NPC, Chests, Boss) */}
              {markers.map((marker) => {
                const pos = worldToPercent(marker.x, marker.z);
                return (
                  <div
                    key={marker.id}
                    style={pos}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-15 pointer-events-none"
                    title={marker.title}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shadow-md"
                      style={{ backgroundColor: marker.color || '#fff' }}
                    >
                      {marker.icon || '•'}
                    </div>
                  </div>
                );
              })}

              {/* LIVE PLAYER PIN */}
              <div
                style={playerCoord}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-7 h-7 rounded-full bg-amber-400/30 animate-ping" />
                  <div
                    className="w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-2xl flex items-center justify-center"
                    style={{
                      transform: `rotate(${(playerPos.rotationY * 180) / Math.PI + 180}deg)`,
                    }}
                  >
                    <Navigation className="w-3.5 h-3.5 text-stone-900 fill-stone-900" />
                  </div>
                </div>
                <span className="mt-0.5 px-1.5 py-0.2 bg-black/85 border border-amber-400/70 rounded text-[9px] font-bold text-amber-300 whitespace-nowrap shadow">
                  Kamu Disini
                </span>
              </div>

              {/* Compass Rose Top-Right */}
              <div className="absolute top-3 right-3 p-1.5 bg-stone-900/85 border border-stone-700/80 rounded-lg flex flex-col items-center pointer-events-none">
                <span className="text-[10px] font-bold text-amber-400">U</span>
                <div className="w-3 h-3 rounded-full border border-stone-600 flex items-center justify-center text-[7px] text-stone-400">
                  +
                </div>
                <span className="text-[9px] text-stone-500">S</span>
              </div>
            </div>
          </div>

          {/* Sidebar Region & Waypoint Details */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-stone-800 bg-stone-950/70 flex flex-col p-4 overflow-y-auto">
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
                      className="px-2.5 py-1 rounded bg-cyan-700/80 hover:bg-cyan-600 text-[10px] font-bold text-white shadow transition-colors"
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
