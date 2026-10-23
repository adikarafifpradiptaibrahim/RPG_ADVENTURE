import * as THREE from 'three';

/**
 * PBR Materials Pipeline & Enhancement System
 * 
 * Provides calibrated physically based materials (PBR) with natural roughness,
 * subtle ambient occlusion / gradient depth, and balanced tone response for
 * character and building models under ACESFilmicToneMapping.
 * 
 * Specifically optimized to ensure vibrant, deep, non-flat visual depth
 * when 3D Dynamic Shadows are turned OFF.
 */

export interface PBRMaterialOptions {
  color: number | string;
  roughness?: number;
  metalness?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
  flatShading?: boolean;
  wireframe?: boolean;
  transparent?: boolean;
  opacity?: number;
}

/**
 * Creates a calibrated MeshStandardMaterial tailored for Eldoria's tone mapping.
 */
export function createPBRMaterial(options: PBRMaterialOptions): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: options.color,
    roughness: options.roughness ?? 0.65,
    metalness: options.metalness ?? 0.05,
    flatShading: options.flatShading ?? true,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1.0,
  });

  if (options.emissive) {
    mat.emissive = new THREE.Color(options.emissive);
    mat.emissiveIntensity = options.emissiveIntensity ?? 0.8;
  }

  return mat;
}

/**
 * Curated PBR Material Library for Architecture, Characters, and World Elements
 */
export const PBR_PALETTE = {
  // Stone & Masonry
  stoneWall: createPBRMaterial({ color: 0x64748b, roughness: 0.72, metalness: 0.05 }),
  castleBrick: createPBRMaterial({ color: 0x475569, roughness: 0.70, metalness: 0.08 }),
  cobblestone: createPBRMaterial({ color: 0x78716c, roughness: 0.68, metalness: 0.04 }),
  marbleDais: createPBRMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.12 }),
  fountainBasin: createPBRMaterial({ color: 0x94a3b8, roughness: 0.55, metalness: 0.08 }),

  // Woods & Timber
  woodPlanks: createPBRMaterial({ color: 0x78350f, roughness: 0.65, metalness: 0.02 }),
  darkWoodLog: createPBRMaterial({ color: 0x451a03, roughness: 0.75, metalness: 0.02 }),
  weatheredBeams: createPBRMaterial({ color: 0x57534e, roughness: 0.80, metalness: 0.02 }),

  // Roofing & Tiles
  terracottaRoof: createPBRMaterial({ color: 0xb45309, roughness: 0.60, metalness: 0.04 }),
  royalGoldRoof: createPBRMaterial({ color: 0xd97706, roughness: 0.38, metalness: 0.65 }),
  slateRoof: createPBRMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.06 }),

  // Metals & Armor
  polishedSteel: createPBRMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.88 }),
  darkIron: createPBRMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.82 }),
  imperialGold: createPBRMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.90 }),
  ancientBronze: createPBRMaterial({ color: 0xd97706, roughness: 0.38, metalness: 0.75 }),

  // Character Garments & Skin
  heroSkin: createPBRMaterial({ color: 0xfbbf24, roughness: 0.58, metalness: 0.0 }),
  warriorArmor: createPBRMaterial({ color: 0x475569, roughness: 0.32, metalness: 0.85 }),
  mageRobes: createPBRMaterial({ color: 0x3b82f6, roughness: 0.72, metalness: 0.08 }),
  rogueLeather: createPBRMaterial({ color: 0x27272a, roughness: 0.55, metalness: 0.15 }),
};

/**
 * Global shared cache for lightweight MeshLambertMaterials (Gouraud shading without GGX PBR cost)
 */
const lambertCache = new Map<string, THREE.MeshLambertMaterial>();

export function getOrCreateLambertMaterial(sourceMat: THREE.MeshStandardMaterial): THREE.MeshLambertMaterial {
  const colorHex = sourceMat.color ? sourceMat.color.getHexString() : 'ffffff';
  const transparent = sourceMat.transparent ? '1' : '0';
  const opacity = sourceMat.opacity !== undefined ? sourceMat.opacity.toFixed(2) : '1.0';
  const flat = sourceMat.flatShading ? '1' : '0';
  const vertexColors = sourceMat.vertexColors ? '1' : '0';
  const key = `${colorHex}_${transparent}_${opacity}_${flat}_${vertexColors}`;

  let lambert = lambertCache.get(key);
  if (!lambert) {
    lambert = new THREE.MeshLambertMaterial({
      color: sourceMat.color,
      map: sourceMat.map,
      vertexColors: sourceMat.vertexColors,
      flatShading: sourceMat.flatShading,
      transparent: sourceMat.transparent,
      opacity: sourceMat.opacity,
    });
    if (sourceMat.emissive && sourceMat.emissive.getHex() > 0) {
      lambert.emissive = sourceMat.emissive;
      lambert.emissiveIntensity = sourceMat.emissiveIntensity;
    }
    lambertCache.set(key, lambert);
  }
  return lambert;
}

/**
 * Traverses character and world meshes in the scene.
 * If isLow is true: replaces MeshStandardMaterial (PBR) with lightweight MeshLambertMaterial (Gouraud shading)
 * If isLow is false: restores original high-fidelity PBR materials with calibrated roughness/metalness
 */
export function applyMaterialQuality(root: THREE.Object3D, isLow: boolean, shadowsEnabled: boolean = false) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    if (isLow) {
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((mat) => {
          if (!mesh.userData.__origMat) mesh.userData.__origMat = mat;
          return mat instanceof THREE.MeshStandardMaterial ? getOrCreateLambertMaterial(mat) : mat;
        });
      } else {
        if (!mesh.userData.__origMat) mesh.userData.__origMat = mesh.material;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material = getOrCreateLambertMaterial(mesh.material);
        }
      }
    } else {
      // Restore original PBR material
      if (mesh.userData.__origMat) {
        mesh.material = mesh.userData.__origMat;
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (!shadowsEnabled) {
            if (mat.roughness > 0.78) mat.roughness = 0.68;
            if (mat.metalness > 0.5 && mat.roughness > 0.45) mat.roughness = 0.35;
          }
          mat.needsUpdate = true;
        }
      });
    }
  });
}

/**
 * Traverses character and building meshes in the scene and dynamically applies
 * refined PBR roughness, ambient contrast, and specular gradient response.
 */
export function applyPBRMaterialEnhancements(root: THREE.Object3D, shadowsEnabled: boolean) {
  applyMaterialQuality(root, false, shadowsEnabled);
}
