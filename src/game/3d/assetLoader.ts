import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import knightGlbUrl from '../../assets/models/knight3D_test.glb';

/**
 * ============================================================================
 * ASSET LOADER: 3D MODEL PIPELINE (GLTF / GLB)
 * ============================================================================
 * Modul ini memuat dan mengelola model 3D eksternal menggunakan GLTFLoader.
 * Model template dicache setelah dimuat pertama kali, sehingga duplikasi/kloning
 * untuk player dan NPC berjalan instan tanpa overhead pengunduhan ulang.
 */

// Default konfigurasi ukuran dan bayangan untuk model Knight GLB
export const KNIGHT_GLB_CONFIG = {
  url: knightGlbUrl,
  // Model knight3D_test.glb memiliki tinggi asli ~1.112 unit.
  // Dengan skala 2.15x, tingginya menjadi ~2.39 unit (sesuai proporsi Mage, Rogue, dan NPC di dunia).
  scale: 2.15,
  castShadow: true,
  receiveShadow: true,
};

// Global toggle flag:
// true  = Menggunakan model 3D baru (knight3D_test.glb)
// false = Merestore dan menggunakan model procedural lama (Three.js)
export let USE_CUSTOM_KNIGHT_GLB = false;

// Cache untuk template GLTF Scene
let cachedKnightTemplate: THREE.Group | null = null;
let knightLoadingPromise: Promise<THREE.Group> | null = null;
let knightLoadingFailed = false;

// Event listeners untuk notifikasi saat model GLB selesai dimuat
type ModelLoadListener = (model: THREE.Group) => void;
const loadListeners: ModelLoadListener[] = [];

/**
 * Cek status apakah model custom GLB sedang aktif
 */
export function getUseCustomKnightGLB(): boolean {
  return USE_CUSTOM_KNIGHT_GLB;
}

/**
 * Ubah toggle penggunaan model custom GLB (true/false)
 */
export function setUseCustomKnightGLB(enabled: boolean): void {
  USE_CUSTOM_KNIGHT_GLB = enabled;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('knight-model-toggle', { detail: { enabled } }));
  }
}

/**
 * Daftarkan callback saat model GLB selesai dimuat
 */
export function onKnightModelLoaded(listener: ModelLoadListener): () => void {
  loadListeners.push(listener);
  if (cachedKnightTemplate) {
    listener(cachedKnightTemplate);
  }
  return () => {
    const idx = loadListeners.indexOf(listener);
    if (idx !== -1) loadListeners.splice(idx, 1);
  };
}

/**
 * Memuat berkas knight3D_test.glb menggunakan Three.js GLTFLoader.
 * Menghilangkan watermark/badge Sketchfab, mengaktifkan bayangan (castShadow & receiveShadow),
 * serta menyesuaikan ukuran (scale).
 */
export function loadKnightModel(): Promise<THREE.Group> {
  if (cachedKnightTemplate) {
    return Promise.resolve(cachedKnightTemplate);
  }

  if (knightLoadingPromise) {
    return knightLoadingPromise;
  }

  knightLoadingPromise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      KNIGHT_GLB_CONFIG.url,
      (gltf) => {
        const scene = gltf.scene;

        // 1. Bersihkan badge / watermark Sketchfab jika ada (node: supavoxel-badge_1)
        const badge = scene.getObjectByName('supavoxel-badge_1') || scene.getObjectByName('supavoxel-badge');
        if (badge && badge.parent) {
          badge.parent.remove(badge);
        }

        // Cari node lain yang mungkin mengandung teks badge
        scene.traverse((child) => {
          if (child.name && child.name.toLowerCase().includes('badge')) {
            child.visible = false;
          }
        });

        // 2. Beri bayangan (castShadow = true & receiveShadow = true) ke seluruh mesh
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = KNIGHT_GLB_CONFIG.castShadow;
            mesh.receiveShadow = KNIGHT_GLB_CONFIG.receiveShadow;

            // Pastikan material PBR ter-render dengan baik
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => {
                  mat.needsUpdate = true;
                });
              } else {
                mesh.material.needsUpdate = true;
              }
            }
          }
        });

        // 3. Pastikan pivot dasar kaki grounded di y = 0
        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene);
        if (box.min.y !== 0) {
          // Koreksi posisi y dasar kaki jika ada offset sekecil apa pun
          scene.position.y -= box.min.y;
        }

        cachedKnightTemplate = scene;
        knightLoadingFailed = false;

        // Beritahu seluruh listener yang sedang menunggu
        loadListeners.forEach((listener) => {
          try {
            listener(scene);
          } catch (e) {
            console.error('[AssetLoader] Error in load listener:', e);
          }
        });

        resolve(scene);
      },
      undefined,
      (error) => {
        console.error('[AssetLoader] Gagal memuat model knight3D_test.glb:', error);
        knightLoadingFailed = true;
        reject(error);
      }
    );
  });

  return knightLoadingPromise;
}

/**
 * Membuat container Three.js Group yang memuat klon model Knight GLB.
 * Jika model belum selesai diunduh, container akan otomatis diperbarui saat model selesai.
 */
export function createKnightGLBMesh(options?: {
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}): THREE.Group {
  const container = new THREE.Group();
  container.name = 'KnightGLB_Container';

  const scale = options?.scale ?? KNIGHT_GLB_CONFIG.scale;
  const castShadow = options?.castShadow ?? KNIGHT_GLB_CONFIG.castShadow;
  const receiveShadow = options?.receiveShadow ?? KNIGHT_GLB_CONFIG.receiveShadow;

  const attachModel = (template: THREE.Group) => {
    // Klon model dari template cache
    const clone = template.clone(true);
    clone.name = 'KnightGLB_Instance';
    clone.scale.setScalar(scale);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });

    // Bersihkan container sebelumnya dan tambahkan klon baru
    while (container.children.length > 0) {
      container.remove(container.children[0]);
    }
    container.add(clone);
  };

  if (cachedKnightTemplate) {
    attachModel(cachedKnightTemplate);
  } else {
    // Mulai proses pemuatan di background jika belum berjalan
    loadKnightModel()
      .then((template) => {
        attachModel(template);
      })
      .catch((err) => {
        console.warn('[AssetLoader] Fallback ke model procedural karena gagal memuat GLB:', err);
      });
  }

  return container;
}

// Pasang toggle global ke window untuk kemudahan debugging/inspeksi di console browser
if (typeof window !== 'undefined') {
  (window as any).__toggleKnightGLB = () => {
    setUseCustomKnightGLB(!USE_CUSTOM_KNIGHT_GLB);
    console.log(`[AssetLoader] Custom Knight GLB model is now: ${USE_CUSTOM_KNIGHT_GLB ? 'ENABLED' : 'DISABLED (Restored to classic model)'}`);
    return USE_CUSTOM_KNIGHT_GLB;
  };
  (window as any).__setKnightGLB = (val: boolean) => {
    setUseCustomKnightGLB(val);
    console.log(`[AssetLoader] Custom Knight GLB model is now: ${USE_CUSTOM_KNIGHT_GLB ? 'ENABLED' : 'DISABLED (Restored to classic model)'}`);
  };
}
