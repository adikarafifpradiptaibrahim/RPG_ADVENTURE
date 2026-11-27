import { getDeviceProfile } from '../utils/deviceProfiler';
import {
  WORLD_BOUNDS,
  SEA_BED_HEIGHT,
  BIOMES,
  RIVER_SPLINES,
  ROAD_SPLINES,
  BRIDGE_CONFIGS,
  WORLD_LANDMARKS,
  WORLD_LAYOUT_CONFIG,
} from '../3d/worldData';
import { exportWorldMapRasterToBlob } from '../mapIllustratedRenderer';

export const WORLD_CACHE_PREF_KEY = 'eldoria_local_world_cache_enabled';
export const WORLD_CACHE_VERSION = 'eldoria-modular-v4';
export const WORLD_CACHE_DB_NAME = 'EldoriaWorldCacheDB';
export const WORLD_CACHE_STORE_NAME = 'worldModules';
const WORLD_CACHE_DB_VERSION = 2;

export interface TerrainGridHashSpec {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  segmentsX: number;
  segmentsZ: number;
}

export interface WorldTerrainModuleData {
  terrainPositions: Float32Array;
  terrainColors: Float32Array;
  terrainNormals: Float32Array;
  heightLookupGrid: Float32Array;
  spatialHeightGrid?: Float32Array;
  spatialFlagsGrid?: Uint8Array;
}

export interface WorldMapModuleData {
  worldMapBlob: Blob;
}

export interface WorldPropsModuleData {
  propMatrices: Record<string, Float32Array>;
}

export type ModularCacheData =
  | WorldTerrainModuleData
  | WorldMapModuleData
  | WorldPropsModuleData;

export interface WorldCacheModuleRecord<T = ModularCacheData> {
  moduleKey: string;
  configHash: string;
  version: string;
  data: T;
  byteSize: number;
  savedAt: number;
}

export interface WorldModuleHashes {
  deviceTier: string;
  terrainKey: string;
  worldMapKey: string;
  propsKey: string;
  terrainHash: string;
  worldMapHash: string;
  propsHash: string;
}

export interface WorldCachePayload {
  cacheKey: string;
  version: string;
  terrainPositions?: Float32Array;
  terrainColors?: Float32Array;
  terrainNormals?: Float32Array;
  heightLookupGrid?: Float32Array;
  worldMapBlob?: Blob;
  propMatrices?: Record<string, Float32Array>;
  spatialHeightGrid?: Float32Array;
  spatialFlagsGrid?: Uint8Array;
  savedAt?: number;
  approxSizeBytes?: number;
}

export interface ModularWorldCacheLoadResult {
  hashes: WorldModuleHashes;
  terrain: WorldTerrainModuleData | null;
  worldMap: WorldMapModuleData | null;
  props: WorldPropsModuleData | null;
  payload: WorldCachePayload | null;
  hitCount: number;
}

export interface ActiveWorldSnapshot {
  terrainPositions: Float32Array;
  terrainColors: Float32Array;
  terrainNormals: Float32Array;
  heightLookupGrid: Float32Array;
  propMatrices?: Record<string, Float32Array>;
  spatialHeightGrid?: Float32Array;
  spatialFlagsGrid?: Uint8Array;
  worldMapBlob?: Blob | null;
  terrainGridSpec?: TerrainGridHashSpec;
}

export type ActiveWorldSnapshotProvider = () => ActiveWorldSnapshot | null;

export interface WorldCacheInfo {
  exists: boolean;
  sizeMB: string;
  savedAt: number | null;
  moduleCount?: number;
}

let activeSnapshotProvider: ActiveWorldSnapshotProvider | null = null;

export function registerActiveWorldSnapshotProvider(
  provider: ActiveWorldSnapshotProvider | null
): void {
  activeSnapshotProvider = provider;
}

export function hasActiveWorldSnapshot(): boolean {
  if (!activeSnapshotProvider) return false;
  try {
    return activeSnapshotProvider() !== null;
  } catch {
    return false;
  }
}

function dispatchWorldCacheEvent(
  type: 'eldoria_world_cache_changed' | 'eldoria_world_cache_saved'
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(type));
  } catch {
    // Ignore event dispatch issues in restricted environments
  }
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalStringify(item)).join(',') + ']';
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as Uint8Array;
    return `"TypedArray(${view.byteLength})"`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .filter((k) => obj[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`)
      .join(',') +
    '}'
  );
}

/**
 * Menghasilkan digest hash deterministik dual 32-bit FNV-1a (16-char hex)
 * dari konfigurasi world agar perubahan kecil langsung terdeteksi presisi.
 */
export function computeConfigHash(obj: unknown): string {
  const input = canonicalStringify(obj);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

/**
 * Menghitung hash konfigurasi independen untuk setiap modul dunia:
 * - `mod_terrain`: hanya bergantung pada bounds, bioma, sungai, flatten landmark, grid terrain, & tier perangkat
 * - `mod_worldmap`: hanya bergantung pada bounds, bioma, sungai, jalan, jembatan, & landmark peta
 * - `mod_props`: hanya bergantung pada vegetasi/prop layout, jalan, landmark, & propDensityScale perangkat
 * Catatan: Skin karakter, animasi, UI, dan skill TIDAK pernah masuk ke hash apa pun.
 */
export function getWorldModuleHashes(
  terrainGridSpec?: TerrainGridHashSpec
): WorldModuleHashes {
  const profile = getDeviceProfile();
  const landmarkFlattenConfig = Object.values(WORLD_LAYOUT_CONFIG.landmarks).map((lm) => ({
    id: lm.id,
    x: lm.x,
    z: lm.z,
    r: lm.flattenRadius,
  }));

  const terrainHash = computeConfigHash({
    schema: 4,
    bounds: WORLD_BOUNDS,
    seaBed: SEA_BED_HEIGHT,
    biomes: BIOMES,
    rivers: RIVER_SPLINES,
    roads: ROAD_SPLINES,
    bridges: BRIDGE_CONFIGS,
    flatten: landmarkFlattenConfig,
    terrainGrid: terrainGridSpec ?? { segmentsX: 1240, segmentsZ: 1060 },
    deviceTier: profile.tier,
  });

  const worldMapHash = computeConfigHash({
    schema: 4,
    bounds: WORLD_BOUNDS,
    biomes: BIOMES,
    rivers: RIVER_SPLINES,
    roads: ROAD_SPLINES,
    bridges: BRIDGE_CONFIGS,
    landmarks: WORLD_LANDMARKS.map((lm) => ({
      id: lm.id,
      nameId: lm.nameId,
      x: lm.x,
      z: lm.z,
      color: lm.color,
      icon: lm.icon,
      level: lm.level,
    })),
  });

  const propsHash = computeConfigHash({
    schema: 4,
    bounds: WORLD_BOUNDS,
    roads: ROAD_SPLINES,
    bridges: BRIDGE_CONFIGS,
    rivers: RIVER_SPLINES,
    landmarks: landmarkFlattenConfig,
    propDensityScale: profile.propDensityScale,
    deviceTier: profile.tier,
  });

  return {
    deviceTier: profile.tier,
    terrainKey: `mod_terrain_${profile.tier}`,
    worldMapKey: 'mod_worldmap',
    propsKey: `mod_props_${profile.tier}`,
    terrainHash,
    worldMapHash,
    propsHash,
  };
}

export function getWorldCacheKey(): string {
  const profile = getDeviceProfile();
  return `${WORLD_CACHE_VERSION}_${profile.tier}`;
}

/**
 * Pengaturan 100% lokal per browser (TIDAK disinkronkan ke cloud). Default: false.
 */
export function isWorldCacheEnabled(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    return window.localStorage.getItem(WORLD_CACHE_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Aktifkan atau nonaktifkan cache dunia lokal.
 * Saat dimatikan (`false`), isi IndexedDB otomatis dibersihkan agar storage lega.
 */
export async function setWorldCacheEnabled(enabled: boolean): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WORLD_CACHE_PREF_KEY, enabled ? 'true' : 'false');
    } catch (err) {
      console.warn('[WorldCache] Gagal menyimpan preferensi cache lokal:', err);
    }
  }

  if (!enabled) {
    await clearWorldCache();
  } else {
    dispatchWorldCacheEvent('eldoria_world_cache_changed');
  }
}

function isIndexedDbAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.indexedDB !== 'undefined' &&
      window.indexedDB !== null
    );
  } catch {
    return false;
  }
}

function openWorldCacheDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(WORLD_CACHE_DB_NAME, WORLD_CACHE_DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (db.objectStoreNames.contains('worldChunks')) {
          db.deleteObjectStore('worldChunks');
        }
        if (!db.objectStoreNames.contains(WORLD_CACHE_STORE_NAME)) {
          db.createObjectStore(WORLD_CACHE_STORE_NAME, { keyPath: 'moduleKey' });
        }
      };

      req.onsuccess = () => {
        resolve(req.result);
      };

      req.onerror = () => {
        console.warn('[WorldCache] IndexedDB tidak dapat dibuka:', req.error);
        resolve(null);
      };

      req.onblocked = () => {
        resolve(null);
      };
    } catch (err) {
      console.warn('[WorldCache] Akses IndexedDB diblokir browser (mode privat/kuota):', err);
      resolve(null);
    }
  });
}

function computeModuleByteSize(data: ModularCacheData): number {
  let bytes = 0;
  if ('terrainPositions' in data) {
    bytes += data.terrainPositions.byteLength;
    bytes += data.terrainColors.byteLength;
    bytes += data.terrainNormals.byteLength;
    bytes += data.heightLookupGrid.byteLength;
    if (data.spatialHeightGrid) bytes += data.spatialHeightGrid.byteLength;
    if (data.spatialFlagsGrid) bytes += data.spatialFlagsGrid.byteLength;
  } else if ('worldMapBlob' in data) {
    bytes += data.worldMapBlob.size;
  } else if ('propMatrices' in data) {
    for (const key of Object.keys(data.propMatrices)) {
      bytes += data.propMatrices[key].byteLength;
    }
  }
  return bytes;
}

function isValidTerrainRecord(data: unknown): data is WorldTerrainModuleData {
  if (!data || typeof data !== 'object') return false;
  const d = data as WorldTerrainModuleData;
  return (
    d.terrainPositions instanceof Float32Array &&
    d.terrainColors instanceof Float32Array &&
    d.terrainNormals instanceof Float32Array &&
    d.heightLookupGrid instanceof Float32Array
  );
}

function isValidWorldMapRecord(data: unknown): data is WorldMapModuleData {
  if (!data || typeof data !== 'object') return false;
  const d = data as WorldMapModuleData;
  return d.worldMapBlob instanceof Blob && d.worldMapBlob.size > 0;
}

function isValidPropsRecord(data: unknown): data is WorldPropsModuleData {
  if (!data || typeof data !== 'object') return false;
  const d = data as WorldPropsModuleData;
  if (!d.propMatrices || typeof d.propMatrices !== 'object') return false;
  const requiredKeys = [
    'oak',
    'pine',
    'boulder',
    'plainsGrass',
    'shrub',
    'reefStone',
    'beachGrass',
  ];
  return requiredKeys.every((k) => d.propMatrices[k] instanceof Float32Array);
}

/**
 * Memuat seluruh modul dunia secara independen dari IndexedDB dan memverifikasi
 * kesesuaian configHash per modul (Partial Invalidation).
 */
export async function loadModularWorldCache(
  terrainGridSpec?: TerrainGridHashSpec
): Promise<ModularWorldCacheLoadResult> {
  const hashes = getWorldModuleHashes(terrainGridSpec);
  const emptyResult: ModularWorldCacheLoadResult = {
    hashes,
    terrain: null,
    worldMap: null,
    props: null,
    payload: null,
    hitCount: 0,
  };

  if (!isWorldCacheEnabled()) {
    return emptyResult;
  }

  const db = await openWorldCacheDB();
  if (!db) {
    return emptyResult;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readonly');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);

      const reqTerrain = store.get(hashes.terrainKey);
      const reqMap = store.get(hashes.worldMapKey);
      const reqProps = store.get(hashes.propsKey);

      let terrain: WorldTerrainModuleData | null = null;
      let worldMap: WorldMapModuleData | null = null;
      let props: WorldPropsModuleData | null = null;

      reqTerrain.onsuccess = () => {
        const rec = reqTerrain.result as WorldCacheModuleRecord | undefined;
        if (rec && rec.configHash === hashes.terrainHash && isValidTerrainRecord(rec.data)) {
          terrain = rec.data;
        }
      };

      reqMap.onsuccess = () => {
        const rec = reqMap.result as WorldCacheModuleRecord | undefined;
        if (rec && rec.configHash === hashes.worldMapHash && isValidWorldMapRecord(rec.data)) {
          worldMap = rec.data;
        }
      };

      reqProps.onsuccess = () => {
        const rec = reqProps.result as WorldCacheModuleRecord | undefined;
        if (rec && rec.configHash === hashes.propsHash && isValidPropsRecord(rec.data)) {
          props = rec.data;
        }
      };

      tx.oncomplete = () => {
        db.close();
        let hitCount = 0;
        if (terrain) hitCount++;
        if (worldMap) hitCount++;
        if (props) hitCount++;

        const payload: WorldCachePayload | null =
          hitCount > 0
            ? {
                cacheKey: getWorldCacheKey(),
                version: WORLD_CACHE_VERSION,
                terrainPositions: terrain?.terrainPositions,
                terrainColors: terrain?.terrainColors,
                terrainNormals: terrain?.terrainNormals,
                heightLookupGrid: terrain?.heightLookupGrid,
                spatialHeightGrid: terrain?.spatialHeightGrid,
                spatialFlagsGrid: terrain?.spatialFlagsGrid,
                worldMapBlob: worldMap?.worldMapBlob,
                propMatrices: props?.propMatrices,
              }
            : null;

        resolve({
          hashes,
          terrain,
          worldMap,
          props,
          payload,
          hitCount,
        });
      };

      tx.onerror = () => {
        db.close();
        resolve(emptyResult);
      };

      tx.onabort = () => {
        db.close();
        resolve(emptyResult);
      };
    } catch {
      db.close();
      resolve(emptyResult);
    }
  });
}

/**
 * Menyimpan 1 modul cache dunia secara spesifik (digunakan saat Partial Update).
 */
export async function saveModularCache(
  moduleKey: string,
  configHash: string,
  data: ModularCacheData
): Promise<boolean> {
  if (!isWorldCacheEnabled()) return false;
  const db = await openWorldCacheDB();
  if (!db) return false;

  const byteSize = computeModuleByteSize(data);
  const record: WorldCacheModuleRecord = {
    moduleKey,
    configHash,
    version: WORLD_CACHE_VERSION,
    data,
    byteSize,
    savedAt: Date.now(),
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      store.put(record);

      tx.oncomplete = () => {
        db.close();
        dispatchWorldCacheEvent('eldoria_world_cache_changed');
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
      tx.onabort = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

/**
 * Menyimpan seluruh modul dunia yang tersedia ke IndexedDB dalam 1 transaksi atomik.
 */
export async function saveAllModularCaches(
  snapshot: ActiveWorldSnapshot,
  hashesOverride?: WorldModuleHashes
): Promise<boolean> {
  if (!isWorldCacheEnabled()) return false;

  const db = await openWorldCacheDB();
  if (!db) return false;

  const hashes = hashesOverride ?? getWorldModuleHashes(snapshot.terrainGridSpec);
  const now = Date.now();
  const records: WorldCacheModuleRecord[] = [];

  if (
    snapshot.terrainPositions &&
    snapshot.terrainColors &&
    snapshot.terrainNormals &&
    snapshot.heightLookupGrid
  ) {
    const tData: WorldTerrainModuleData = {
      terrainPositions: new Float32Array(snapshot.terrainPositions),
      terrainColors: new Float32Array(snapshot.terrainColors),
      terrainNormals: new Float32Array(snapshot.terrainNormals),
      heightLookupGrid: new Float32Array(snapshot.heightLookupGrid),
      spatialHeightGrid: snapshot.spatialHeightGrid
        ? new Float32Array(snapshot.spatialHeightGrid)
        : undefined,
      spatialFlagsGrid: snapshot.spatialFlagsGrid
        ? new Uint8Array(snapshot.spatialFlagsGrid)
        : undefined,
    };
    records.push({
      moduleKey: hashes.terrainKey,
      configHash: hashes.terrainHash,
      version: WORLD_CACHE_VERSION,
      data: tData,
      byteSize: computeModuleByteSize(tData),
      savedAt: now,
    });
  }

  if (snapshot.worldMapBlob && snapshot.worldMapBlob.size > 0) {
    const mData: WorldMapModuleData = {
      worldMapBlob: snapshot.worldMapBlob,
    };
    records.push({
      moduleKey: hashes.worldMapKey,
      configHash: hashes.worldMapHash,
      version: WORLD_CACHE_VERSION,
      data: mData,
      byteSize: computeModuleByteSize(mData),
      savedAt: now,
    });
  }

  if (snapshot.propMatrices && Object.keys(snapshot.propMatrices).length > 0) {
    const clonedProps: Record<string, Float32Array> = {};
    for (const k of Object.keys(snapshot.propMatrices)) {
      clonedProps[k] = new Float32Array(snapshot.propMatrices[k]);
    }
    const pData: WorldPropsModuleData = { propMatrices: clonedProps };
    records.push({
      moduleKey: hashes.propsKey,
      configHash: hashes.propsHash,
      version: WORLD_CACHE_VERSION,
      data: pData,
      byteSize: computeModuleByteSize(pData),
      savedAt: now,
    });
  }

  if (records.length === 0) {
    db.close();
    return false;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      for (const rec of records) {
        store.put(rec);
      }

      tx.oncomplete = () => {
        db.close();
        dispatchWorldCacheEvent('eldoria_world_cache_saved');
        dispatchWorldCacheEvent('eldoria_world_cache_changed');
        resolve(true);
      };

      tx.onerror = (ev) => {
        console.warn('[WorldCache] Gagal menyimpan modul dunia:', ev);
        db.close();
        resolve(false);
      };

      tx.onabort = () => {
        db.close();
        resolve(false);
      };
    } catch (err) {
      console.warn('[WorldCache] Transaksi penyimpanan modul dilewati (Incognito/Kuota):', err);
      db.close();
      resolve(false);
    }
  });
}

/**
 * Instant In-Game Capture: langsung menangkap buffer dunia aktif yang sudah berada
 * di memori saat tombol "Simpan Cache Dunia" diaktifkan di Pengaturan dalam game.
 */
export async function captureAndSaveActiveWorldCache(): Promise<{
  saved: boolean;
  sizeMB: string;
}> {
  if (!isWorldCacheEnabled() || !activeSnapshotProvider) {
    return { saved: false, sizeMB: '0' };
  }

  try {
    const snapshot = activeSnapshotProvider();
    if (!snapshot) {
      return { saved: false, sizeMB: '0' };
    }

    if (!snapshot.worldMapBlob) {
      snapshot.worldMapBlob = await exportWorldMapRasterToBlob();
    }

    const ok = await saveAllModularCaches(snapshot);
    if (!ok) {
      return { saved: false, sizeMB: '0' };
    }

    const info = await getWorldCacheInfo();
    return { saved: info.exists, sizeMB: info.sizeMB };
  } catch (err) {
    console.warn('[WorldCache] Instant in-game capture gagal:', err);
    return { saved: false, sizeMB: '0' };
  }
}

/**
 * Menghapus seluruh cache dunia di IndexedDB.
 */
export async function clearWorldCache(): Promise<void> {
  const db = await openWorldCacheDB();
  if (!db) {
    dispatchWorldCacheEvent('eldoria_world_cache_changed');
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => {
        db.close();
        dispatchWorldCacheEvent('eldoria_world_cache_changed');
        resolve();
      };

      req.onerror = () => {
        db.close();
        dispatchWorldCacheEvent('eldoria_world_cache_changed');
        resolve();
      };

      tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      dispatchWorldCacheEvent('eldoria_world_cache_changed');
      resolve();
    }
  });
}

/**
 * Mengambil informasi ukuran (MB), jumlah modul, & waktu penyimpanan cache dunia lokal.
 */
export async function getWorldCacheInfo(): Promise<WorldCacheInfo> {
  const db = await openWorldCacheDB();
  if (!db) {
    return { exists: false, sizeMB: '0', savedAt: null, moduleCount: 0 };
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readonly');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        db.close();
        const records = (req.result as WorldCacheModuleRecord[] | undefined) || [];
        if (records.length === 0) {
          resolve({ exists: false, sizeMB: '0', savedAt: null, moduleCount: 0 });
          return;
        }
        let totalBytes = 0;
        let latestSaved = 0;
        for (const rec of records) {
          totalBytes += typeof rec.byteSize === 'number' ? rec.byteSize : 0;
          if (typeof rec.savedAt === 'number' && rec.savedAt > latestSaved) {
            latestSaved = rec.savedAt;
          }
        }
        const mb = totalBytes / (1024 * 1024);
        const sizeMB = mb >= 10 ? mb.toFixed(1) : Math.max(0.1, mb).toFixed(1);
        resolve({
          exists: true,
          sizeMB,
          savedAt: latestSaved || null,
          moduleCount: records.length,
        });
      };

      req.onerror = () => {
        db.close();
        resolve({ exists: false, sizeMB: '0', savedAt: null, moduleCount: 0 });
      };
    } catch {
      db.close();
      resolve({ exists: false, sizeMB: '0', savedAt: null, moduleCount: 0 });
    }
  });
}

/**
 * Wrapper kompatibilitas legacy agar referensi lama tetap aman.
 */
export async function loadWorldCache(_cacheKey?: string): Promise<WorldCachePayload | null> {
  const res = await loadModularWorldCache();
  return res.payload;
}

export async function saveWorldCache(
  _cacheKey: string,
  input: ActiveWorldSnapshot
): Promise<boolean> {
  return saveAllModularCaches(input);
}
