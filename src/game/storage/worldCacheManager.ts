import { getDeviceProfile } from '../utils/deviceProfiler';

export const WORLD_CACHE_PREF_KEY = 'eldoria_local_world_cache_enabled';
export const WORLD_CACHE_VERSION = 'eldoria-world-v1';
export const WORLD_CACHE_DB_NAME = 'EldoriaWorldCacheDB';
export const WORLD_CACHE_STORE_NAME = 'worldChunks';
const WORLD_CACHE_DB_VERSION = 1;

export interface WorldCachePayload {
  cacheKey: string;
  version: string;
  terrainPositions: Float32Array;
  terrainColors: Float32Array;
  terrainNormals: Float32Array;
  heightLookupGrid: Float32Array;
  worldMapBlob: Blob;
  propMatrices: Record<string, Float32Array>;
  spatialHeightGrid?: Float32Array;
  spatialFlagsGrid?: Uint8Array;
  savedAt: number;
  approxSizeBytes: number;
}

export type WorldCacheInput = Omit<
  WorldCachePayload,
  'cacheKey' | 'version' | 'savedAt' | 'approxSizeBytes'
>;

export interface WorldCacheInfo {
  exists: boolean;
  sizeMB: string;
  savedAt: number | null;
}

function dispatchWorldCacheEvent(type: 'eldoria_world_cache_changed' | 'eldoria_world_cache_saved'): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(type));
  } catch {
    // Ignore event dispatch issues in restricted environments
  }
}

/**
 * Menghasilkan kunci cache unik berbasis versi peta + tier perangkat.
 */
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
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;
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
      const request = window.indexedDB.open(WORLD_CACHE_DB_NAME, WORLD_CACHE_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORLD_CACHE_STORE_NAME)) {
          db.createObjectStore(WORLD_CACHE_STORE_NAME, { keyPath: 'cacheKey' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('[WorldCache] Gagal membuka IndexedDB (fallback generate normal):', request.error);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[WorldCache] Pembukaan IndexedDB diblokir sementara.');
        resolve(null);
      };
    } catch (err) {
      console.warn('[WorldCache] Pengecualian saat membuka IndexedDB:', err);
      resolve(null);
    }
  });
}

function validateCachePayload(raw: unknown, expectedVersion: string): raw is WorldCachePayload {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<WorldCachePayload>;

  if (candidate.version !== expectedVersion || candidate.cacheKey !== expectedVersion) {
    return false;
  }
  if (
    !(candidate.terrainPositions instanceof Float32Array) ||
    candidate.terrainPositions.length === 0 ||
    !(candidate.terrainColors instanceof Float32Array) ||
    candidate.terrainColors.length === 0 ||
    !(candidate.terrainNormals instanceof Float32Array) ||
    candidate.terrainNormals.length === 0 ||
    !(candidate.heightLookupGrid instanceof Float32Array) ||
    candidate.heightLookupGrid.length === 0
  ) {
    return false;
  }
  if (!(candidate.worldMapBlob instanceof Blob) || candidate.worldMapBlob.size === 0) {
    return false;
  }
  if (!candidate.propMatrices || typeof candidate.propMatrices !== 'object') {
    return false;
  }

  for (const val of Object.values(candidate.propMatrices)) {
    if (!(val instanceof Float32Array)) {
      return false;
    }
  }

  return true;
}

function estimatePayloadBytes(input: WorldCacheInput): number {
  let total =
    input.terrainPositions.byteLength +
    input.terrainColors.byteLength +
    input.terrainNormals.byteLength +
    input.heightLookupGrid.byteLength +
    input.worldMapBlob.size;

  if (input.spatialHeightGrid) total += input.spatialHeightGrid.byteLength;
  if (input.spatialFlagsGrid) total += input.spatialFlagsGrid.byteLength;

  for (const arr of Object.values(input.propMatrices)) {
    total += arr.byteLength;
  }

  return total;
}

/**
 * Memuat cache dunia dari IndexedDB.
 * Jika versi tidak cocok atau data rusak/tidak ada/Incognito, menghapus entri usang & mengembalikan `null`.
 */
export async function loadWorldCache(cacheKey: string = getWorldCacheKey()): Promise<WorldCachePayload | null> {
  const db = await openWorldCacheDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readonly');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      const req = store.getAll();

      req.onsuccess = async () => {
        const records = (req.result || []) as unknown[];
        db.close();

        if (!Array.isArray(records) || records.length === 0) {
          resolve(null);
          return;
        }

        let matched: WorldCachePayload | null = null;
        let hasStaleOrCorrupt = false;

        for (const rec of records) {
          if (validateCachePayload(rec, cacheKey)) {
            matched = rec;
          } else {
            hasStaleOrCorrupt = true;
          }
        }

        if (!matched || hasStaleOrCorrupt) {
          if (!matched) {
            // Cache kedaluwarsa / korup: bersihkan & fallback build normal
            await clearWorldCache();
            resolve(null);
            return;
          }
          // Ada kecocokan valid + entri usang lain: bersihkan entri usang secara senyap
          void removeStaleCacheKeys(cacheKey);
        }

        resolve(matched);
      };

      req.onerror = () => {
        console.warn('[WorldCache] Gagal membaca store IndexedDB:', req.error);
        db.close();
        resolve(null);
      };
    } catch (err) {
      console.warn('[WorldCache] Error saat loadWorldCache:', err);
      try {
        db.close();
      } catch {
        // ignore
      }
      resolve(null);
    }
  });
}

async function removeStaleCacheKeys(activeKey: string): Promise<void> {
  const db = await openWorldCacheDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const keys = keysReq.result || [];
        for (const k of keys) {
          if (k !== activeKey) {
            store.delete(k);
          }
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {
        // ignore
      }
      resolve();
    }
  });
}

/**
 * Menyimpan buffer biner terrain, height lookup, peta 512x512, & matriks prop ke IndexedDB.
 * Aman terhadap QuotaExceededError / mode Incognito.
 */
export async function saveWorldCache(cacheKey: string, input: WorldCacheInput): Promise<boolean> {
  if (!isWorldCacheEnabled()) {
    return false;
  }

  const db = await openWorldCacheDB();
  if (!db) return false;

  const approxSizeBytes = estimatePayloadBytes(input);
  const record: WorldCachePayload = {
    cacheKey,
    version: cacheKey,
    terrainPositions: input.terrainPositions,
    terrainColors: input.terrainColors,
    terrainNormals: input.terrainNormals,
    heightLookupGrid: input.heightLookupGrid,
    worldMapBlob: input.worldMapBlob,
    propMatrices: input.propMatrices,
    spatialHeightGrid: input.spatialHeightGrid,
    spatialFlagsGrid: input.spatialFlagsGrid,
    savedAt: Date.now(),
    approxSizeBytes,
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);

      // Bersihkan versi cache lama terlebih dahulu agar storage tetap ringkas
      store.clear();
      store.put(record);

      tx.oncomplete = () => {
        db.close();
        dispatchWorldCacheEvent('eldoria_world_cache_changed');
        resolve(true);
      };

      tx.onerror = () => {
        console.warn('[WorldCache] Gagal menyimpan cache (mungkin kuota browser penuh):', tx.error);
        db.close();
        resolve(false);
      };

      tx.onabort = () => {
        console.warn('[WorldCache] Transaksi penyimpanan cache dibatalkan:', tx.error);
        db.close();
        resolve(false);
      };
    } catch (err) {
      console.warn('[WorldCache] Pengecualian saveWorldCache:', err);
      try {
        db.close();
      } catch {
        // ignore
      }
      resolve(false);
    }
  });
}

/**
 * Menghapus seluruh data cache dunia di IndexedDB secara aman.
 */
export async function clearWorldCache(): Promise<void> {
  const db = await openWorldCacheDB();
  if (!db) {
    dispatchWorldCacheEvent('eldoria_world_cache_changed');
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      store.clear();

      tx.oncomplete = () => {
        db.close();
        dispatchWorldCacheEvent('eldoria_world_cache_changed');
        resolve();
      };
      tx.onerror = () => {
        db.close();
        dispatchWorldCacheEvent('eldoria_world_cache_changed');
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {
        // ignore
      }
      dispatchWorldCacheEvent('eldoria_world_cache_changed');
      resolve();
    }
  });
}

/**
 * Mengembalikan status ukuran & waktu simpan cache lokal untuk UI Pengaturan.
 */
export async function getWorldCacheInfo(): Promise<WorldCacheInfo> {
  const db = await openWorldCacheDB();
  if (!db) {
    return { exists: false, sizeMB: '0', savedAt: null };
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(WORLD_CACHE_STORE_NAME, 'readonly');
      const store = tx.objectStore(WORLD_CACHE_STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []) as Partial<WorldCachePayload>[];
        db.close();

        if (!Array.isArray(records) || records.length === 0) {
          resolve({ exists: false, sizeMB: '0', savedAt: null });
          return;
        }

        let totalBytes = 0;
        let latestSavedAt: number | null = null;

        for (const rec of records) {
          if (typeof rec?.approxSizeBytes === 'number' && rec.approxSizeBytes > 0) {
            totalBytes += rec.approxSizeBytes;
          }
          if (typeof rec?.savedAt === 'number') {
            latestSavedAt = latestSavedAt === null ? rec.savedAt : Math.max(latestSavedAt, rec.savedAt);
          }
        }

        if (totalBytes <= 0) {
          resolve({ exists: false, sizeMB: '0', savedAt: null });
          return;
        }

        const sizeMB = (totalBytes / (1024 * 1024)).toFixed(1);
        resolve({
          exists: true,
          sizeMB,
          savedAt: latestSavedAt,
        });
      };

      req.onerror = () => {
        db.close();
        resolve({ exists: false, sizeMB: '0', savedAt: null });
      };
    } catch {
      try {
        db.close();
      } catch {
        // ignore
      }
      resolve({ exists: false, sizeMB: '0', savedAt: null });
    }
  });
}
