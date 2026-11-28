import * as THREE from 'three';
import { WorldCollider } from './world';
import { isPointNearRoad } from '../RoadSystem';
import {
  getBiomeAt,
  BRIDGE_CONFIGS,
  isStrictLandForProps,
  WORLD_BOUNDS,
  getProceduralContinentHeight,
  distToSegment,
  isFarOcean,
  isMainContinentLand,
  getDistanceToNearestRoad,
  getDistanceToRiver as getWorldDistanceToRiver,
  getSnowWeight,
  NATURAL_POND_SITES,
  WATER_LEVEL,
  SEA_BED_HEIGHT,
  worldToBridgeLocal,
} from './worldData';
import { registerWalkableSurface } from './walkableSurfaceSystem';
import {
  isDesertBiome,
  getDistanceToRiver,
  getTerrainVertexColor,
  RIVER_NORTHWEST_BRANCH,
  RIVER_DESERT_BRANCH,
  RIVER_EAST_BRANCH,
  RIVER_MAIN_DOWNSTREAM,
} from '../mapSampler';
import { SpatialLookupGrid } from './spatialGrid';
import { checkFrameBudget, yieldIfBudgetExceeded, yieldToChrome, yieldIfNeeded, cooperativeYield, hardYield } from './frameBudget';
import { getDeviceProfile } from '../utils/deviceProfiler';
import { getLandmarkLayout } from './worldLayoutConfig';
import { SmoothLoadScheduler } from '../utils/asyncLoader';
import type { WorldCachePayload } from '../storage/worldCacheManager';

export { getTerrainVertexColor };

export interface WorldEnvironmentResult {
  group: THREE.Group;
  colliders: WorldCollider[];
  update: (delta: number, time: number) => void;
  setVegetationVisible: (visible: boolean) => void;
  setGrassDensity?: (scale: number) => void;
  setAmbientEffectsVisible?: (visible: boolean) => void;
  propMatrices?: Record<string, Float32Array>;
}

export { yieldIfNeeded, hardYield, cooperativeYield };

export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 12);
export const UNIT_CONE = new THREE.ConeGeometry(1, 1, 1, 12);

export const MaterialCache = new Map<string, THREE.MeshStandardMaterial>();

export function getSharedMaterial(
  color: number,
  roughness = 0.8,
  metalness = 0.1,
  flatShading = true,
  emissive = 0x000000,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  const key = `${color}_${roughness}_${metalness}_${flatShading}_${emissive}_${emissiveIntensity}`;
  let mat = MaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading,
      emissive,
      emissiveIntensity,
    });
    MaterialCache.set(key, mat);
  }
  return mat;
}

function isInsideWalledCityBounds(px: number, pz: number, margin = 0): boolean {
  // 1. Ibukota Emas Astraea [575, -495] (170x170 walls + South Gate apron)
  if (px >= 480 - margin && px <= 670 + margin && pz >= -590 - margin && pz <= -396 + margin) return true;
  // 2. Benteng Val-Kragor [580, 130] (110x110 walls + North Gate apron)
  if (px >= 518 - margin && px <= 642 + margin && pz >= 62 - margin && pz <= 194 + margin) return true;
  // 3. Kerajaan Gurun Solaria, Istana Sultan, Kolam Refleksi & Desa Gurun [-635..-445, -598..-325]
  if (px >= -635 - margin && px <= -445 + margin && pz >= -598 - margin && pz <= -325 + margin) return true;
  // 4. Mage Tower Circular Plaza Ring [270, -260]
  if (Math.hypot(px - 270, pz - -260) < 38 + margin) return true;
  return false;
}

function isPointDryLand(px: number, pz: number, extraMargin = 0): boolean {
  if (isFarOcean(px, pz)) return false;
  if (isInsideWalledCityBounds(px, pz, extraMargin)) return false;
  const biome = getBiomeAt(px, pz);
  if (biome === 'ocean' || biome === 'lake') return false;
  if (getWorldDistanceToRiver(px, pz) < 8.5 + extraMargin) return false;
  if (Math.hypot(px - 60, pz - -820) < 58 + extraMargin) return false;
  for (const pond of NATURAL_POND_SITES) {
    if (Math.hypot(px - pond.x, pz - pond.z) < pond.radius + 1.5 + extraMargin) return false;
  }
  if (biome !== 'volcano' && !isMainContinentLand(px, pz)) {
    const onOffshoreIsland =
      Math.hypot(px - -220, pz - 460) < 54 ||
      Math.hypot(px - -520, pz - 620) < 66 ||
      Math.hypot(px - -780, pz - 280) < 60;
    if (!onOffshoreIsland) return false;
  }
  const h = getExactMeshGroundHeight(px, pz, true);
  return h > WATER_LEVEL + 1.2;
}

/**
 * Strict global dry-land validator for buildings, gardens, foliage, ruins, & props:
 * Verifies center + 4 perimeter edge points (at distance `radius`) are strictly dry land
 * with elevation > WATER_LEVEL + 1.2 and inside valid continent/island landmass.
 */
export function isValidDryLand(x: number, z: number, radius = 0): boolean {
  if (!isPointDryLand(x, z, Math.min(3.5, radius * 0.25))) return false;
  if (radius > 0) {
    if (!isPointDryLand(x + radius, z)) return false;
    if (!isPointDryLand(x - radius, z)) return false;
    if (!isPointDryLand(x, z + radius)) return false;
    if (!isPointDryLand(x, z - radius)) return false;
  }
  return true;
}

const sharedRuinStoneMat = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.9,
  metalness: 0.06,
  flatShading: true,
});
const sharedRuinTrimMat = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.85,
  metalness: 0.1,
  flatShading: true,
});
const sharedRuinMossMat = new THREE.MeshStandardMaterial({
  color: 0x4d7c0f,
  roughness: 0.88,
  flatShading: true,
});
const sharedRuinVineMat = new THREE.MeshStandardMaterial({
  color: 0x65a30d,
  roughness: 0.85,
  flatShading: true,
});
const sharedRuinAltarRuneMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 1.4,
  roughness: 0.35,
});

/**
 * Redesigned Authentic Ancient Temple Ruins Complex (*Reruntuhan Kuil Kuno*)
 * - Cracked mossy floor slabs registered to `registerWalkableSurface()`
 * - Broken stone archways overhead (open walkthrough underneath, per-pier collision only)
 * - Cracked fluted columns of varied height + climbing green moss & vines
 * - Central weathered stone altar on walkable dais
 * - Zero enclosing box collider / zero rotated AABB invisible barriers!
 */
export function createAncientTempleRuinsComplex(
  parentGroup: THREE.Group,
  centerX: number,
  centerZ: number,
  getHeightFn: (x: number, z: number) => number,
  colliders: WorldCollider[],
  options?: {
    tileCount?: number;
    archCount?: number;
    pillarCount?: number;
    seedOffset?: number;
  }
): void {
  const tileCount = options?.tileCount ?? 18;
  const archCount = options?.archCount ?? 2;
  const pillarCount = options?.pillarCount ?? 7;
  const seed = options?.seedOffset ?? 0;

  if (!isValidDryLand(centerX, centerZ, 12) || getDistanceToNearestRoad(centerX, centerZ) < 20) {
    return;
  }

  // 1. Cracked Mossy Temple Courtyard Floor Slabs (Walkable)
  for (let i = 0; i < tileCount; i++) {
    const ang = (i / tileCount) * Math.PI * 2 + seed * 0.3;
    const dist = i < 6 ? 3.2 : 5.8 + (i % 3) * 3.4;
    const tx = centerX + Math.cos(ang) * dist;
    const tz = centerZ + Math.sin(ang) * dist;
    if (!isValidDryLand(tx, tz, 2.0) || getDistanceToNearestRoad(tx, tz) < 9.5) continue;
    const ty = getHeightFn(tx, tz);
    const rad = 1.6 + ((i * 7 + seed) % 5) * 0.25;

    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(rad, rad * 1.06, 0.24, 6),
      i % 3 === 0 ? sharedRuinTrimMat : sharedRuinStoneMat
    );
    slab.position.set(tx, ty + 0.12, tz);
    slab.rotation.y = (i * 1.1 + seed) % Math.PI;
    slab.receiveShadow = true;
    parentGroup.add(slab);
    registerWalkableSurface(slab, { label: 'Lantai Ubin Reruntuhan Kuil Kuno' });

    if (i % 2 === 0) {
      const mossPatch = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.45 + (i % 3) * 0.14, 0),
        i % 4 === 0 ? sharedRuinMossMat : sharedRuinVineMat
      );
      mossPatch.scale.set(1.3, 0.32, 1.1);
      mossPatch.position.set(tx + Math.cos(ang) * (rad * 0.55), ty + 0.24, tz + Math.sin(ang) * (rad * 0.55));
      parentGroup.add(mossPatch);
    }
  }

  // 2. Central Weathered Ancient Stone Altar on Walkable Dais
  const altarY = getHeightFn(centerX, centerZ);
  const dais1 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.36, 8), sharedRuinTrimMat);
  dais1.position.set(centerX, altarY + 0.18, centerZ);
  dais1.receiveShadow = true;
  parentGroup.add(dais1);
  registerWalkableSurface(dais1, { label: 'Pelataran Tangga Altar Kuil' });

  const dais2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 0.32, 8), sharedRuinStoneMat);
  dais2.position.set(centerX, altarY + 0.52, centerZ);
  dais2.receiveShadow = true;
  parentGroup.add(dais2);
  registerWalkableSurface(dais2, { label: 'Podium Altar Kuil Kuno' });

  const altarGroup = new THREE.Group();
  altarGroup.position.set(centerX, altarY + 0.68, centerZ);

  const altarPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 1.25, 6), sharedRuinTrimMat);
  altarPedestal.position.y = 0.62;
  altarPedestal.castShadow = true;
  altarGroup.add(altarPedestal);

  const altarSlab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.26, 1.4), sharedRuinStoneMat);
  altarSlab.position.y = 1.32;
  altarSlab.rotation.y = 0.25;
  altarSlab.castShadow = true;
  altarGroup.add(altarSlab);

  const runeRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.85, 16), sharedRuinAltarRuneMat);
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.y = 0.04;
  altarGroup.add(runeRing);

  const brokenStele = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 1.65, 5), sharedRuinStoneMat);
  brokenStele.position.set(0.1, 2.0, -0.15);
  brokenStele.rotation.z = -0.14;
  altarGroup.add(brokenStele);

  const altarMoss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), sharedRuinMossMat);
  altarMoss.scale.set(1.2, 0.4, 0.9);
  altarMoss.position.set(-0.75, 0.22, 0.6);
  altarGroup.add(altarMoss);

  parentGroup.add(altarGroup);
  colliders.push({ type: 'circle', x: centerX, z: centerZ, radius: 1.35, label: 'Altar Batu Kuil Kuno' });

  // 3. Broken Stone Archways (*Lengkungan Gerbang Batu Patah*)
  const archSpanHalf = 3.2;
  for (let a = 0; a < archCount; a++) {
    const archAng = seed * 0.4 + (a * Math.PI) / Math.max(1, archCount * 0.65);
    const archDist = 11.2;
    const ax = centerX + Math.cos(archAng) * archDist;
    const az = centerZ + Math.sin(archAng) * archDist;
    if (!isValidDryLand(ax, az, 4.0) || getDistanceToNearestRoad(ax, az) < 10.5) continue;

    const ay = getHeightFn(ax, az);
    const perpX = -Math.sin(archAng);
    const perpZ = Math.cos(archAng);
    const leftX = ax - perpX * archSpanHalf;
    const leftZ = az - perpZ * archSpanHalf;
    const rightX = ax + perpX * archSpanHalf;
    const rightZ = az + perpZ * archSpanHalf;
    if (getDistanceToNearestRoad(leftX, leftZ) < 9.5 || getDistanceToNearestRoad(rightX, rightZ) < 9.5) continue;

    const archHeight = 4.6 + (a % 2) * 0.6;
    [
      { x: leftX, z: leftZ, h: archHeight },
      { x: rightX, z: rightZ, h: archHeight * 0.92 },
    ].forEach((pier, pIdx) => {
      const py = getHeightFn(pier.x, pier.z);
      const pierBase = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.65, 1.45), sharedRuinTrimMat);
      pierBase.position.set(pier.x, py + 0.32, pier.z);
      pierBase.rotation.y = archAng;
      parentGroup.add(pierBase);

      const pierCol = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, pier.h, 7), sharedRuinStoneMat);
      pierCol.position.set(pier.x, py + pier.h * 0.5 + 0.4, pier.z);
      pierCol.castShadow = true;
      parentGroup.add(pierCol);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 1.35), sharedRuinTrimMat);
      cap.position.set(pier.x, py + pier.h + 0.55, pier.z);
      cap.rotation.y = archAng;
      parentGroup.add(cap);

      const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), sharedRuinMossMat);
      moss.position.set(pier.x, py + 0.8 + pIdx * 1.1, pier.z);
      moss.scale.set(1.1, 0.6, 1.1);
      parentGroup.add(moss);

      // Accurate circular collider strictly around each stone pier (archway doorway completely open!)
      colliders.push({ type: 'circle', x: pier.x, z: pier.z, radius: 0.9, label: 'Tiang Gerbang Batu Kuil' });
    });

    // Cracked overhead stone arch lintel & half-broken arch stones
    const lintelLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 3.8), sharedRuinStoneMat);
    lintelLeft.position.set(
      ax - perpX * (archSpanHalf * 0.45),
      ay + archHeight + 0.85,
      az - perpZ * (archSpanHalf * 0.45)
    );
    lintelLeft.rotation.y = archAng;
    lintelLeft.rotation.x = 0.08;
    lintelLeft.castShadow = true;
    parentGroup.add(lintelLeft);

    const lintelRight = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.68, 2.7), sharedRuinTrimMat);
    lintelRight.position.set(
      ax + perpX * (archSpanHalf * 0.52),
      ay + archHeight + 0.55,
      az + perpZ * (archSpanHalf * 0.52)
    );
    lintelRight.rotation.y = archAng;
    lintelRight.rotation.x = -0.14;
    lintelRight.castShadow = true;
    parentGroup.add(lintelRight);

    const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), sharedRuinVineMat);
    vine.position.set(ax - perpX * 1.1, ay + archHeight + 1.15, az - perpZ * 1.1);
    vine.scale.set(1.4, 0.5, 1.2);
    parentGroup.add(vine);
  }

  // 4. Varied-Height Cracked Stone Columns + Moss Clumps (wide walkspace between every column)
  for (let p = 0; p < pillarCount; p++) {
    const pAng = seed * 0.7 + (p / pillarCount) * Math.PI * 2 + 0.35;
    const pDist = 8.5 + (p % 3) * 3.2;
    const px = centerX + Math.cos(pAng) * pDist;
    const pz = centerZ + Math.sin(pAng) * pDist;
    if (!isValidDryLand(px, pz, 1.5) || getDistanceToNearestRoad(px, pz) < 9.5) continue;

    const py = getHeightFn(px, pz);
    const colH = 2.4 + ((p * 11 + seed) % 5) * 0.75;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.98, 0.45, 8), sharedRuinTrimMat);
    base.position.set(px, py + 0.22, pz);
    parentGroup.add(base);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.66, colH, 7), sharedRuinStoneMat);
    shaft.position.set(px, py + 0.45 + colH * 0.5, pz);
    shaft.rotation.z = ((p % 3) - 1) * 0.05;
    shaft.castShadow = true;
    parentGroup.add(shaft);

    // Slanted chipped broken stone crown atop column
    const chip = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.7, 5), sharedRuinTrimMat);
    chip.position.set(px, py + 0.45 + colH + 0.2, pz);
    chip.rotation.set(0.35, p * 0.9, 0.22);
    parentGroup.add(chip);

    // Creeping moss around column base & mid-shaft
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), p % 2 === 0 ? sharedRuinMossMat : sharedRuinVineMat);
    moss.scale.set(1.25, 0.55, 1.15);
    moss.position.set(px + 0.45, py + 0.42, pz + 0.3);
    parentGroup.add(moss);

    colliders.push({ type: 'circle', x: px, z: pz, radius: 0.95, label: 'Pilar Kuil Kuno Retak' });
  }

  // 5. Scattered Mossy Fallen Masonry Chunks on Outskirts (decorative low rubble off path)
  for (let f = 0; f < 4; f++) {
    const fAng = seed + f * 1.57 + 0.8;
    const fx = centerX + Math.cos(fAng) * 14.5;
    const fz = centerZ + Math.sin(fAng) * 14.5;
    if (!isValidDryLand(fx, fz, 1.5) || getDistanceToNearestRoad(fx, fz) < 9.5) continue;
    const fy = getHeightFn(fx, fz);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 2.2, 7), sharedRuinStoneMat);
    drum.position.set(fx, fy + 0.45, fz);
    drum.rotation.set(0.1, fAng, Math.PI / 2 - 0.12);
    drum.castShadow = true;
    parentGroup.add(drum);
    const vinePatch = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), sharedRuinVineMat);
    vinePatch.scale.set(1.4, 0.45, 1.0);
    vinePatch.position.set(fx, fy + 0.65, fz);
    parentGroup.add(vinePatch);
  }
}

/**
 * Lead Level Designer & World Builder
 * Modul Builder Tata Ruang Lanskap Dunia Berbasis 4 Zonasi Lingkungan & Instanced Mesh Vegetasi
 */
export async function buildWorldEnvironmentAsync(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number) => number,
  colliders: WorldCollider[],
  onProgress?: (percent: number, statusText: string) => void,
  cachedWorld?: WorldCachePayload | null,
  collectCacheMatrices = false
): Promise<WorldEnvironmentResult> {
  const scheduler = new SmoothLoadScheduler();
  const envGroup = new THREE.Group();
  envGroup.name = 'WorldEnvironment_Zones';
  scene.add(envGroup);

  const animatedLights: { light: THREE.PointLight; baseIntensity: number; speed: number }[] = [];
  const animatedFlames: { mesh: THREE.Mesh; baseScale: THREE.Vector3; speed: number }[] = [];
  const animatedMistPlanes: { mesh: THREE.Mesh; baseY: number; speed: number }[] = [];
  const animatedSpores: { mesh: THREE.Mesh; basePos: THREE.Vector3; speed: number; phase: number }[] = [];
  let windmillBladesGroup: THREE.Group | null = null;

  let tLastEnvYield = performance.now();
  const checkEnvYield = async (pct?: number, text?: string) => {
    if (performance.now() - tLastEnvYield > 6) {
      if (pct !== undefined && text) {
        onProgress?.(pct, text);
      }
      await hardYield();
      tLastEnvYield = performance.now();
    }
  };

  // ============================================================================
  // PALET MATERIAL BERSAMA (LOW-POLY FLAT SHADING & OPTIMIZED PERFORMANCE)
  // ============================================================================
  const matWoodRustic = new THREE.MeshStandardMaterial({ color: 0x785135, roughness: 0.85, metalness: 0.05, flatShading: true });
  const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9, flatShading: true });
  const matStoneRuins = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, metalness: 0.1, flatShading: true });
  const matStoneDarkCrag = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
  const matCyanRune = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });
  const matBlueFire = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const matOrangeFire = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 3.2,
    roughness: 0.2,
  });
  const matCopperCauldron = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45, metalness: 0.65 });
  const matHay = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.95, flatShading: true });
  const matFarmSoil = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95, flatShading: true });
  const matCabbage = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, flatShading: true });
  const matLettuce = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.8, flatShading: true });
  const matPumpkin = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.75, flatShading: true });
  const matStem = new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 0.8, flatShading: true });
  const matCarrotTop = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.8, flatShading: true });
  const matCarrotTip = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7, flatShading: true });
  const matWheat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.85, flatShading: true });
  const matTentFabric = new THREE.MeshStandardMaterial({ color: 0x6b705c, roughness: 0.9, flatShading: true });
  const matBone = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.6, flatShading: true });

  // Material Tambahan untuk Pesisir Barat, Sabana, & Perkemahan Bandit
  const matWetSeaRock = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.25, flatShading: true });
  const matPalmTrunk = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9, flatShading: true });
  const matPalmRing = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, flatShading: true });
  const matPalmLeaf = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7, flatShading: true });
  const matCoconut = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.85, flatShading: true });
  const matShipWood = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95, flatShading: true });
  const matShipPlank = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9, flatShading: true });
  const matIronBands = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.7 });
  const matWineBarrel = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.85, flatShading: true });
  const matBeachGrass = new THREE.MeshStandardMaterial({ color: 0xa3a658, roughness: 0.9, flatShading: true });
  const matPineFoliage = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.85, flatShading: true });
  const matOakFoliage = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8, flatShading: true });
  const matBoulder = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
  const matShrub = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85, flatShading: true });
  const matDarkSoil = new THREE.MeshStandardMaterial({ color: 0x27201c, roughness: 0.95, flatShading: true });
  const matWildflower = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7, flatShading: true });
  const matMossStone = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, flatShading: true });


  /**
   * Helper deteksi batas pekarangan pertanian di Barat Daya Desa Utama [20, -60]
   */
  function isInsideFarmYard(x: number, z: number): boolean {
    if (x >= -66 && x <= -42 && z >= -46 && z <= -29) return true; // Pekarangan 1 (Utara Barat)
    if (x >= -66 && x <= -42 && z >= -28 && z <= -11) return true; // Pekarangan 2 (Selatan Barat)
    if (x >= -41 && x <= -22 && z >= -28 && z <= -11) return true; // Pekarangan 3 (Gandum Timur)
    return false;
  }

  function isInsideCastleOrFort(x: number, z: number): boolean {
    if (isInsideWalledCityBounds(x, z, 4)) return true;
    if (Math.hypot(x - 580, z - -60) <= 42 || Math.hypot(x - 580, z - -120) <= 44) return true; // Castle Ruins / Moss Valley
    return false;
  }

  // ============================================================================
  // 1. ZONA A: DESA & PERTANIAN PINGGIRAN (X: 10 s.d. 80, Z: 100 s.d. 160)
  // ============================================================================
  await checkEnvYield(64, 'Membangun Tata Ruang Zona Pedesaan & Pertanian (64%)...');
  const farmGroup = new THREE.Group();
  farmGroup.name = 'ZoneA_VillageFarmlands';

  // Helper Pembuat Pagar Kayu Rustic Antara Dua Titik dengan Celah Pintu Gerbang
  function createRusticFenceSegment(
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    gateGap?: { min: number; max: number; axis: 'x' | 'z' }
  ) {
    const dist = Math.hypot(endX - startX, endZ - startZ);
    if (dist < 0.5) return;
    const postCount = Math.max(2, Math.round(dist / 2.2));
    const angle = Math.atan2(endZ - startZ, endX - startX);

    for (let i = 0; i < postCount; i++) {
      const t = i / (postCount - 1);
      const px = startX + (endX - startX) * t;
      const pz = startZ + (endZ - startZ) * t;

      // Cek apakah posisi berada di dalam celah pintu gerbang
      if (gateGap) {
        const val = gateGap.axis === 'x' ? px : pz;
        if (val > gateGap.min && val < gateGap.max) {
          continue; // Lewati agar menjadi akses pintu gerbang masuk
        }
      }

      // STRICT ROAD CLEARANCE (>= 9.5u) & DRY LAND VALIDATOR
      if (getDistanceToNearestRoad(px, pz) < 9.5 || !isValidDryLand(px, pz, 0.8)) continue;

      const py = getTerrainHeight(px, pz);

      // Tiang kayu vertikal
      const isGatePost = gateGap && (
        Math.abs((gateGap.axis === 'x' ? px : pz) - gateGap.min) < 0.8 ||
        Math.abs((gateGap.axis === 'x' ? px : pz) - gateGap.max) < 0.8
      );
      const postHeight = isGatePost ? 1.45 : 1.15;
      const postRadius = isGatePost ? 0.11 : 0.085;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(postRadius * 0.9, postRadius, postHeight, 6),
        matWoodRustic
      );
      post.position.set(px, py + postHeight * 0.5, pz);
      post.rotation.y = angle + (Math.sin(px * 3.7 + pz * 2.1) * 0.12);
      post.rotation.z = Math.sin(px * 1.5) * 0.04;
      farmGroup.add(post);

      if (i < postCount - 1) {
        const nextT = (i + 1) / (postCount - 1);
        const nextX = startX + (endX - startX) * nextT;
        const nextZ = startZ + (endZ - startZ) * nextT;

        // Skip rail jika melintasi gerbang
        if (gateGap) {
          const midVal = gateGap.axis === 'x' ? (px + nextX) * 0.5 : (pz + nextZ) * 0.5;
          if (midVal >= gateGap.min && midVal <= gateGap.max) {
            continue;
          }
        }

        const midX = (px + nextX) * 0.5;
        const midZ = (pz + nextZ) * 0.5;
        if (getDistanceToNearestRoad(midX, midZ) < 9.5 || !isValidDryLand(midX, midZ, 0.8)) continue;

        const midY = (py + getTerrainHeight(nextX, nextZ)) * 0.5;
        const segLen = Math.hypot(nextX - px, nextZ - pz);

        [0.35, 0.75].forEach((hOffset) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.07, 0.05), matWoodRustic);
          rail.position.set(midX, midY + hOffset, midZ);
          rail.rotation.y = angle;
          farmGroup.add(rail);
        });
      }
    }
  }

  // Helper Pembuat Pekarangan Tertutup Berpagar Persegi Panjang
  function createEnclosedFarmYard(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    gateSide: 'north' | 'south',
    gateMin: number,
    gateMax: number
  ) {
    // 1. Sisi Selatan (minZ)
    createRusticFenceSegment(
      minX, minZ, maxX, minZ,
      gateSide === 'south' ? { min: gateMin, max: gateMax, axis: 'x' } : undefined
    );
    // 2. Sisi Utara (maxZ)
    createRusticFenceSegment(
      minX, maxZ, maxX, maxZ,
      gateSide === 'north' ? { min: gateMin, max: gateMax, axis: 'x' } : undefined
    );
    // 3. Sisi Barat (minX)
    createRusticFenceSegment(minX, minZ, minX, maxZ);
    // 4. Sisi Timur (maxX)
    createRusticFenceSegment(maxX, minZ, maxX, maxZ);
  }

  // Pekarangan 1: Daratan Kering Barat Laut Desa Utama (Z: -44 s.d -31)
  createEnclosedFarmYard(-64, -44, -44, -31, 'north', -56, -52);

  // Pekarangan 2: Daratan Kering Barat Daya Desa Utama (Z: -26 s.d -13)
  createEnclosedFarmYard(-64, -44, -26, -13, 'south', -56, -52);

  // Pekarangan 3: Ladang Gandum & Lumbung Barat Pelabuhan (Z: -26 s.d -13)
  createEnclosedFarmYard(-40, -24, -26, -13, 'north', -34, -30);

  // 3 Petak Kebun Sayur Berpematang Kayu di Dalam Pekarangan Kering Sanctuary
  const gardenPatches = [
    // Kebun 1: Di dalam Pekarangan 1 (Utara), Cabbage & Carrot
    { x: -54, z: -37.5, w: 14, d: 5.5, cropType: 'cabbage_carrot' },
    // Kebun 2: Di dalam Pekarangan 2 (Selatan), Pumpkin & Veggies
    { x: -54, z: -19.5, w: 14, d: 5.5, cropType: 'pumpkin_veggies' },
    // Kebun 3: Di dalam Pekarangan 3 (Gandum), Wheat Field
    { x: -32, z: -19.5, w: 12, d: 4.8, cropType: 'wheat' },
  ];

  gardenPatches.forEach((patch) => {
    // Strict road & dry-land check across full patch footprint
    const patchRadius = Math.max(patch.w, patch.d) * 0.5;
    if (getDistanceToNearestRoad(patch.x, patch.z) < 9.5 || !isValidDryLand(patch.x, patch.z, patchRadius)) return;

    const y = getTerrainHeight(patch.x, patch.z);

    // Bedengan tanah subur gembur
    const soil = new THREE.Mesh(new THREE.BoxGeometry(patch.w, 0.22, patch.d), matFarmSoil);
    soil.position.set(patch.x, y + 0.11, patch.z);
    farmGroup.add(soil);

    // Pematang bingkai balok kayu rustic
    const halfW = patch.w * 0.5;
    const halfD = patch.d * 0.5;
    const borderGeos = [
      { pos: [patch.x, y + 0.16, patch.z - halfD], sz: [patch.w, 0.32, 0.22] },
      { pos: [patch.x, y + 0.16, patch.z + halfD], sz: [patch.w, 0.32, 0.22] },
      { pos: [patch.x - halfW, y + 0.16, patch.z], sz: [0.22, 0.32, patch.d] },
      { pos: [patch.x + halfW, y + 0.16, patch.z], sz: [0.22, 0.32, patch.d] },
    ];
    borderGeos.forEach((bg) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(bg.sz[0], bg.sz[1], bg.sz[2]), matWoodRustic);
      beam.position.set(bg.pos[0], bg.pos[1], bg.pos[2]);
      farmGroup.add(beam);
    });

    // Tanaman sayuran dalam petak rapi berbaris
    const rows = patch.cropType === 'wheat' ? 5 : 4;
    const cols = patch.cropType === 'wheat' ? 12 : 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = patch.x - halfW + 1.0 + (c / (cols - 1)) * (patch.w - 2.0);
        const cz = patch.z - halfD + 0.8 + (r / (rows - 1)) * (patch.d - 1.6);
        const cy = y + 0.22;

        if (patch.cropType === 'cabbage_carrot') {
          if (r < 2) {
            // Cabbage
            const cabbage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), matCabbage);
            cabbage.position.set(cx, cy + 0.12, cz);
            cabbage.scale.set(1.1, 0.85, 1.0);
            farmGroup.add(cabbage);
          } else {
            // Carrot
            const carrotTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), matCarrotTip);
            carrotTip.position.set(cx, cy + 0.05, cz);
            carrotTip.rotation.x = Math.PI;
            const carrotLeaves = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 5), matCarrotTop);
            carrotLeaves.position.set(cx, cy + 0.20, cz);
            farmGroup.add(carrotTip, carrotLeaves);
          }
        } else if (patch.cropType === 'pumpkin_veggies') {
          if (r === 0 || r === 3) {
            // Labu Oranye (Pumpkin)
            const pumpkin = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), matPumpkin);
            pumpkin.position.set(cx, cy + 0.14, cz);
            pumpkin.scale.set(1.15, 0.85, 1.15);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 5), matStem);
            stem.position.set(cx, cy + 0.27, cz);
            stem.rotation.z = 0.2;
            farmGroup.add(pumpkin, stem);
          } else if (r === 1) {
            // Kubis Segar (Lettuce / Cabbage)
            const lettuce = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), matLettuce);
            lettuce.position.set(cx, cy + 0.11, cz);
            farmGroup.add(lettuce);
          } else {
            // Wortel
            const carrotTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), matCarrotTip);
            carrotTip.position.set(cx, cy + 0.05, cz);
            carrotTip.rotation.x = Math.PI;
            const carrotLeaves = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 5), matCarrotTop);
            carrotLeaves.position.set(cx, cy + 0.20, cz);
            farmGroup.add(carrotTip, carrotLeaves);
          }
        } else {
          // Gandum Emas (Golden Wheat Stalks)
          const wheatStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 4), matWheat);
          wheatStalk.position.set(cx, cy + 0.34, cz);
          wheatStalk.rotation.z = Math.sin(cx * 4 + cz * 3) * 0.18;
          farmGroup.add(wheatStalk);
        }
      }
    }
  });

  // 9 Tumpukan Jerami (Haystack Emas): Terkumpul Rapi di Sudut-Sudut Pekarangan Kering
  const haystacks = [
    // Sudut Pekarangan 1
    { x: -61.0, z: -34.0, r: 1.4, h: 1.8 },
    { x: -58.2, z: -33.5, r: 1.2, h: 1.5 },
    { x: -59.8, z: -37.5, r: 1.1, h: 1.4 },
    // Sudut Pekarangan 2
    { x: -61.0, z: -23.0, r: 1.5, h: 1.9 },
    { x: -58.2, z: -24.0, r: 1.3, h: 1.6 },
    { x: -60.5, z: -20.0, r: 1.1, h: 1.4 },
    // Sudut Pekarangan 3
    { x: -37.5, z: -22.5, r: 1.5, h: 1.9 },
    { x: -35.0, z: -20.5, r: 1.2, h: 1.5 },
    { x: -37.2, z: -18.5, r: 1.1, h: 1.4 },
  ];

  haystacks.forEach((hs) => {
    if (getDistanceToNearestRoad(hs.x, hs.z) < 9.5 || !isValidDryLand(hs.x, hs.z, hs.r)) return;

    const y = getTerrainHeight(hs.x, hs.z);
    const hayGroup = new THREE.Group();
    hayGroup.position.set(hs.x, y, hs.z);

    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(hs.r * 0.9, hs.r, hs.h * 0.65, 8), matHay);
    baseCyl.position.y = hs.h * 0.325;
    const topDome = new THREE.Mesh(new THREE.ConeGeometry(hs.r * 0.9, hs.h * 0.55, 8), matHay);
    topDome.position.y = hs.h * 0.65 + hs.h * 0.275;

    hayGroup.add(baseCyl, topDome);
    farmGroup.add(hayGroup);
    colliders.push({ type: 'circle', x: hs.x, z: hs.z, radius: hs.r, label: 'Tumpukan Jerami' });
  });

  // 2 Gerobak Dorong Kayu & Peti Barang Dagangan di Sisi Pintu Gerbang Pekarangan
  function createWoodenCart(x: number, z: number, rotY: number) {
    if (getDistanceToNearestRoad(x, z) < 9.5 || !isValidDryLand(x, z, 1.8)) return;

    const y = getTerrainHeight(x, z);
    const cart = new THREE.Group();
    cart.position.set(x, y + 0.42, z);
    cart.rotation.y = rotY;

    // Bak gerobak
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 2.2), matWoodRustic);
    tray.position.y = 0.25;

    // Roda kayu kiri & kanan
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelL = new THREE.Mesh(wheelGeo, matWoodDark);
    wheelL.position.set(-0.82, -0.05, -0.2);
    const wheelR = new THREE.Mesh(wheelGeo, matWoodDark);
    wheelR.position.set(0.82, -0.05, -0.2);

    // Tangkai pegangan
    const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), matWoodRustic);
    handleL.position.set(-0.45, 0.35, 1.6);
    handleL.rotation.x = -0.15;
    const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), matWoodRustic);
    handleR.position.set(0.45, 0.35, 1.6);
    handleR.rotation.x = -0.15;

    // Muatan peti dan tong di atas gerobak
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.65), matWoodDark);
    crate.position.set(0.15, 0.65, -0.4);
    const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), matHay);
    sack.position.set(-0.25, 0.55, 0.3);

    cart.add(tray, wheelL, wheelR, handleL, handleR, crate, sack);
    farmGroup.add(cart);
    colliders.push({ type: 'circle', x, z, radius: 1.4, label: 'Gerobak Kayu' });
  }

  // Gerobak 1 & 2 di dekat pintu gerbang pekarangan barat desa
  createWoodenCart(-51.5, -28.8, 0.2);
  createWoodenCart(-30.5, -28.5, -0.25);

  // Tumpukan peti barang di dekat gerobak dan pagar
  const crateClusters = [
    { x: -56.5, z: -28.5 },
    { x: -48.0, z: -28.8 },
    { x: -36.5, z: -28.5 },
    { x: -27.5, z: -28.5 },
  ];
  crateClusters.forEach((cc) => {
    if (getDistanceToNearestRoad(cc.x, cc.z) < 9.5 || !isValidDryLand(cc.x, cc.z, 1.5)) return;

    const cy = getTerrainHeight(cc.x, cc.z);
    [
      { dx: 0, dz: 0, h: 0.65, w: 0.7, dy: 0 },
      { dx: 0.65, dz: 0.1, h: 0.55, w: 0.6, dy: 0 },
      { dx: 0.25, dz: 0.05, h: 0.5, w: 0.55, dy: 0.65 },
    ].forEach((cDef) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(cDef.w, cDef.h, cDef.w), matWoodDark);
      box.position.set(cc.x + cDef.dx, cy + cDef.dy + cDef.h * 0.5, cc.z + cDef.dz);
      box.rotation.y = (Math.random() - 0.5) * 0.3;
      farmGroup.add(box);
    });
    colliders.push({ type: 'circle', x: cc.x, z: cc.z, radius: 1.2, label: 'Peti Barang' });
  });

  envGroup.add(farmGroup);

  // ============================================================================
  // 2. ZONA B: RERUNTUHAN PILAR KUNO / ANCIENT RUINS (Relocated to Dry SE Plains X: 145, Z: 5)
  // ============================================================================
  await checkEnvYield(65, 'Membangun Reruntuhan Pilar Kuno & Sarang Monster (65%)...');
  const ruinsGroup = new THREE.Group();
  ruinsGroup.name = 'ZoneB_AncientRuins';

  const ruinsCenterX = 145;
  const ruinsCenterZ = 5;
  if (isValidDryLand(ruinsCenterX, ruinsCenterZ, 22) && getDistanceToNearestRoad(ruinsCenterX, ruinsCenterZ) >= 9.5) {
    const ruinsBaseY = getTerrainHeight(ruinsCenterX, ruinsCenterZ);

    // Pelataran Ubin Batu Retak Melingkar (Radius 20 unit) — hanya pada daratan kering sah!
    const plazaSlabCount = 24;
    for (let i = 0; i < plazaSlabCount; i++) {
      const angle = (i / plazaSlabCount) * Math.PI * 2;
      const rDist = 4.0 + (i % 3) * 5.8;
      const sx = ruinsCenterX + Math.cos(angle) * rDist;
      const sz = ruinsCenterZ + Math.sin(angle) * rDist;
      if (!isValidDryLand(sx, sz, 2.2) || getDistanceToNearestRoad(sx, sz) < 9.5) continue;
      const sy = getTerrainHeight(sx, sz);

      const slab = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1 + Math.random() * 1.0, 2.3 + Math.random() * 1.0, 0.22, 6),
        matStoneRuins
      );
      slab.position.set(sx, sy + 0.1, sz);
      slab.rotation.y = Math.random() * Math.PI;
      ruinsGroup.add(slab);
      registerWalkableSurface(slab, { label: 'Ubin Reruntuhan Kuno' });
    }

    // Lingkaran Runik Sihir Cyan Pusat di Tengah Reruntuhan
    const centerPlazaRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 3.8, 16), matCyanRune);
    centerPlazaRing.rotateX(-Math.PI / 2);
    centerPlazaRing.position.set(ruinsCenterX, ruinsBaseY + 0.14, ruinsCenterZ);
    ruinsGroup.add(centerPlazaRing);
    registerWalkableSurface(centerPlazaRing, { label: 'Pusat Reruntuhan Kuno' });

    // Bongkahan Pilar Roboh & Patah Tergeletak di Daratan Kering
    const fallenPillars = [
      { x: ruinsCenterX - 10, z: ruinsCenterZ - 9, len: 4.2, r: 0.8, rotY: 0.65 },
      { x: ruinsCenterX + 11, z: ruinsCenterZ + 7, len: 3.5, r: 0.75, rotY: -0.85 },
      { x: ruinsCenterX - 13, z: ruinsCenterZ + 11, len: 4.8, r: 0.85, rotY: 1.2 },
      { x: ruinsCenterX + 9, z: ruinsCenterZ - 11, len: 3.0, r: 0.7, rotY: -0.3 },
    ];

    fallenPillars.forEach((fp) => {
      if (!isValidDryLand(fp.x, fp.z, 2.2) || getDistanceToNearestRoad(fp.x, fp.z) < 9.5) return;
      const y = getTerrainHeight(fp.x, fp.z);
      const brokenCol = new THREE.Group();
      brokenCol.position.set(fp.x, y + fp.r * 0.9, fp.z);
      brokenCol.rotation.y = fp.rotY;

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(fp.r, fp.r, fp.len, 8), matStoneRuins);
      shaft.rotateZ(Math.PI / 2);
      brokenCol.add(shaft);

      const chunk1 = new THREE.Mesh(new THREE.DodecahedronGeometry(fp.r * 0.7, 0), matStoneRuins);
      chunk1.position.set(fp.len * 0.55, -0.2, 0.2);
      const chunk2 = new THREE.Mesh(new THREE.DodecahedronGeometry(fp.r * 0.6, 0), matStoneRuins);
      chunk2.position.set(-fp.len * 0.55, -0.2, -0.15);
      brokenCol.add(chunk1, chunk2);

      ruinsGroup.add(brokenCol);
      colliders.push({ type: 'circle', x: fp.x, z: fp.z, radius: fp.len * 0.45, label: 'Pilar Roboh' });
    });

    // 4 Cawan Obor Api Sihir Biru Menyala di Sudut Reruntuhan
    const braziers = [
      { x: ruinsCenterX - 14, z: ruinsCenterZ - 14 },
      { x: ruinsCenterX + 14, z: ruinsCenterZ - 14 },
      { x: ruinsCenterX - 14, z: ruinsCenterZ + 14 },
      { x: ruinsCenterX + 14, z: ruinsCenterZ + 14 },
    ];

    braziers.forEach((br, bIdx) => {
      if (!isValidDryLand(br.x, br.z, 1.5) || getDistanceToNearestRoad(br.x, br.z) < 9.5) return;
      const by = getTerrainHeight(br.x, br.z);
      const bStand = new THREE.Group();
      bStand.position.set(br.x, by, br.z);

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.3, 6), matStoneRuins);
      pedestal.position.y = 0.65;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.35, 0.35, 8), matStoneDarkCrag);
      bowl.position.y = 1.45;

      const blueFlame = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matBlueFire);
      blueFlame.position.y = 1.75;
      bStand.add(pedestal, bowl, blueFlame);

      const bLight = new THREE.PointLight(0x00f0ff, 1.8, 18);
      bLight.position.set(br.x, by + 1.85, br.z);
      ruinsGroup.add(bLight);

      animatedLights.push({ light: bLight, baseIntensity: 1.8, speed: 7 + bIdx });
      animatedFlames.push({ mesh: blueFlame, baseScale: new THREE.Vector3(1, 1.35, 1), speed: 8 + bIdx });

      ruinsGroup.add(bStand);
      colliders.push({ type: 'circle', x: br.x, z: br.z, radius: 0.85, label: 'Cawan Obor Biru' });
    });
  }

  envGroup.add(ruinsGroup);

  // ============================================================================
  // 3. ZONA C: SARANG MONSTER LIAR / BEAST LAIR (Dry SE Grassland: X: 215, Z: 45)
  // ============================================================================
  await checkEnvYield(65, 'Membangun Reruntuhan Pilar Kuno & Sarang Monster (65%)...');
  const beastGroup = new THREE.Group();
  beastGroup.name = 'ZoneC_BeastLair';

  const lairCenterX = 215;
  const lairCenterZ = 45;

  // Formasi Tebing Batu Tajam Melingkar Menyerupai Sarang / Gua Terbuka (Hanya di daratan kering)
  const cragCount = 14;
  for (let i = 0; i < cragCount; i++) {
    const angle = 0.45 * Math.PI + (i / cragCount) * 1.55 * Math.PI;
    const rDist = 18 + (i % 2) * 5;
    const cx = lairCenterX + Math.cos(angle) * rDist;
    const cz = lairCenterZ + Math.sin(angle) * rDist;
    if (!isValidDryLand(cx, cz, 2.5) || getDistanceToNearestRoad(cx, cz) < 9.5) continue;
    const cy = getTerrainHeight(cx, cz);

    const cragHeight = 5.5 + Math.random() * 4.5;
    const cragWidth = 2.4 + Math.random() * 1.6;
    const crag = new THREE.Mesh(new THREE.ConeGeometry(cragWidth, cragHeight, 5), matStoneDarkCrag);
    crag.position.set(cx, cy + cragHeight * 0.45, cz);
    crag.rotation.y = Math.random() * Math.PI;
    crag.rotation.z = (Math.random() - 0.5) * 0.22;
    crag.rotation.x = (Math.random() - 0.5) * 0.22;
    beastGroup.add(crag);

    colliders.push({ type: 'circle', x: cx, z: cz, radius: cragWidth * 0.85, label: 'Tebing Batu Sarang' });
  }

  // 4 Pohon Mati Meranggas
  const deadTrees = [
    { x: lairCenterX + 14, z: lairCenterZ - 14 },
    { x: lairCenterX - 18, z: lairCenterZ - 8 },
    { x: lairCenterX - 14, z: lairCenterZ + 16 },
    { x: lairCenterX + 12, z: lairCenterZ + 20 },
  ];

  deadTrees.forEach((dt) => {
    if (isDesertBiome(dt.x, dt.z) || !isValidDryLand(dt.x, dt.z, 1.5) || getDistanceToNearestRoad(dt.x, dt.z) < 9.5) return;
    const dy = getTerrainHeight(dt.x, dt.z);
    const dTree = new THREE.Group();
    dTree.position.set(dt.x, dy, dt.z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 4.2, 5), matWoodDark);
    trunk.position.y = 2.1;
    trunk.rotation.z = (Math.random() - 0.5) * 0.25;
    dTree.add(trunk);

    for (let b = 0; b < 3; b++) {
      const branchAngle = (b / 3) * Math.PI * 2;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.2, 4), matWoodDark);
      branch.position.set(Math.cos(branchAngle) * 0.6, 3.2 + b * 0.4, Math.sin(branchAngle) * 0.6);
      branch.rotation.z = 0.75;
      branch.rotation.y = branchAngle;
      dTree.add(branch);
    }

    beastGroup.add(dTree);
    colliders.push({ type: 'circle', x: dt.x, z: dt.z, radius: 0.75, label: 'Pohon Mati Meranggas' });
  });

  // Tulang Belulang & Sisa Kayu Lapuk
  const bonePiles = [
    { x: lairCenterX + 4, z: lairCenterZ - 2 },
    { x: lairCenterX - 6, z: lairCenterZ + 4 },
    { x: lairCenterX + 8, z: lairCenterZ + 10 },
  ];

  bonePiles.forEach((bp) => {
    if (!isValidDryLand(bp.x, bp.z, 1.5) || getDistanceToNearestRoad(bp.x, bp.z) < 9.5) return;
    const by = getTerrainHeight(bp.x, bp.z);
    const boneGroup = new THREE.Group();
    boneGroup.position.set(bp.x, by + 0.1, bp.z);

    // Tulang rusuk melengkung (ribcage arches)
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.55 + r * 0.08, 0.07, 4, 8, Math.PI), matBone);
      rib.position.set(0, 0, (r - 1.5) * 0.35);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.y = (Math.random() - 0.5) * 0.3;
      boneGroup.add(rib);
    }

    // Tulang tengkorak binatang
    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), matBone);
    skull.position.set(0.65, 0.2, 0);
    skull.scale.set(1.4, 0.9, 0.9);
    boneGroup.add(skull);

    // Kayu lapuk
    const rottenLog = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 5), matWoodDark);
    rottenLog.rotation.z = Math.PI / 2;
    rottenLog.position.set(-0.6, 0.12, 0.4);
    boneGroup.add(rottenLog);

    beastGroup.add(boneGroup);
  });

  envGroup.add(beastGroup);

  // ============================================================================
  // 4. ZONA D: KOMPLEKS PERKEMAHAN BANDIT / OUTPOST PADAT (X: -260, Z: -95)
  // Berdiri kokoh di atas daratan kering tinggi (height >= 3.5m, jarak dari air >= 40, dari jalan >= 25)
  // ============================================================================
  await checkEnvYield(66, 'Membangun Kompleks Perkemahan Bandit (66%)...');
  const outpostGroup = new THREE.Group();
  outpostGroup.name = 'ZoneD_EnemyOutpost';

  const outpostCenterX = -260;
  const outpostCenterZ = -95;
  const outpostBaseY = getTerrainHeight(outpostCenterX, outpostCenterZ);

  // Menara Pantau (Watchtower) Menyatu di Dalam Kamp
  const towerX = -276;
  const towerZ = -102;
  const towerY = getTerrainHeight(towerX, towerZ);
  const tower = new THREE.Group();
  tower.position.set(towerX, towerY, towerZ);

  const towerH = 6.8;
  const towerSpan = 2.6;
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, towerH + 2.5, 6), matWoodRustic);
    post.position.set(sx * towerSpan * 0.5, (towerH * 0.5) - 1.25, sz * towerSpan * 0.5);
    tower.add(post);
  });

  // Pondasi skirt menara pengawas agar menancap kokoh ke tanah
  const towerPlinth = new THREE.Mesh(new THREE.BoxGeometry(towerSpan + 0.8, 3.0, towerSpan + 0.8), matWoodDark);
  towerPlinth.position.y = -1.25;
  towerPlinth.receiveShadow = true;
  tower.add(towerPlinth);

  // Dek pengawas lantai atas
  const deck = new THREE.Mesh(new THREE.BoxGeometry(towerSpan + 0.8, 0.25, towerSpan + 0.8), matWoodRustic);
  deck.position.y = towerH - 1.2;
  tower.add(deck);
  tower.updateMatrixWorld(true);
  registerWalkableSurface(deck, { label: 'Dek Menara Pengawas' });

  // Pagar pembatas dek
  const railH = 0.9;
  [
    { p: [0, towerH - 1.2 + railH * 0.5, -(towerSpan * 0.5 + 0.3)], sz: [towerSpan + 0.8, 0.1, 0.08] },
    { p: [0, towerH - 1.2 + railH * 0.5, towerSpan * 0.5 + 0.3], sz: [towerSpan + 0.8, 0.1, 0.08] },
    { p: [-(towerSpan * 0.5 + 0.3), towerH - 1.2 + railH * 0.5, 0], sz: [0.08, 0.1, towerSpan + 0.8] },
    { p: [towerSpan * 0.5 + 0.3, towerH - 1.2 + railH * 0.5, 0], sz: [0.08, 0.1, towerSpan + 0.8] },
  ].forEach((rf) => {
    const rMesh = new THREE.Mesh(new THREE.BoxGeometry(rf.sz[0], rf.sz[1], rf.sz[2]), matWoodRustic);
    rMesh.position.set(rf.p[0], rf.p[1], rf.p[2]);
    tower.add(rMesh);
  });

  // Anak tangga kayu (ladder rungs) di salah satu tiang
  for (let l = 0; l < 10; l++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.06), matWoodRustic);
    rung.position.set(-towerSpan * 0.5, 0.8 + l * 0.5, 0);
    tower.add(rung);
  }

  // Atap kanopi piramida
  const roof = new THREE.Mesh(new THREE.ConeGeometry(towerSpan * 0.85, 1.4, 4), matTentFabric);
  roof.position.y = towerH + 0.9;
  roof.rotation.y = Math.PI / 4;
  tower.add(roof);

  outpostGroup.add(tower);
  colliders.push({ type: 'circle', x: towerX, z: towerZ, radius: 2.2, label: 'Menara Pengawas' });

  // 3 Tenda Kain Lusuh Menghadap Api Unggun Sentral
  const tents = [
    { x: -272, z: -86, rotY: 2.35, scale: 1.15 }, // Tenda Barat Laut
    { x: -248, z: -94, rotY: -1.55, scale: 1.05 }, // Tenda Timur
    { x: -262, z: -108, rotY: 0.15, scale: 1.25 }, // Tenda Selatan
  ];

  tents.forEach((td) => {
    if (isPointNearRoad(td.x, td.z, 6.5)) return;
    const ty = getTerrainHeight(td.x, td.z);
    const tent = new THREE.Group();
    tent.position.set(td.x, ty, td.z);
    tent.rotation.y = td.rotY;
    tent.scale.setScalar(td.scale);

    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.8, 5), matTentFabric);
    canopy.position.y = 1.4;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.0, 5), matWoodRustic);
    pole.position.set(0, 1.5, 0.85);

    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 6), matWoodDark);
    rug.rotateX(-Math.PI / 2);
    rug.position.y = 0.03;

    tent.add(canopy, pole, rug);
    outpostGroup.add(tent);
    colliders.push({ type: 'circle', x: td.x, z: td.z, radius: 2.4 * td.scale, label: 'Tenda Bandit' });
  });

  // Barikade Kayu Runcing Mengelilingi Kamp (Perimeter Barricades)
  const barricades = [
    { x: -278, z: -78, rotY: -0.4, len: 7.0 },
    { x: -258, z: -76, rotY: 0.05, len: 7.0 },
    { x: -286, z: -95, rotY: 1.57, len: 7.5 },
    { x: -276, z: -114, rotY: 2.6, len: 7.0 },
    { x: -256, z: -116, rotY: 3.14, len: 7.0 },
    { x: -242, z: -108, rotY: -2.4, len: 6.5 },
  ];

  barricades.forEach((bc) => {
    if (isPointNearRoad(bc.x, bc.z, 6.5)) return;
    const by = getTerrainHeight(bc.x, bc.z);
    const bGroup = new THREE.Group();
    bGroup.position.set(bc.x, by, bc.z);
    bGroup.rotation.y = bc.rotY;

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(bc.len, 0.16, 0.16), matWoodRustic);
    crossBeam.position.y = 0.75;
    bGroup.add(crossBeam);

    const stakeCount = Math.floor(bc.len / 0.75);
    for (let s = 0; s < stakeCount; s++) {
      const sx = -bc.len * 0.5 + 0.4 + s * 0.75;
      const spike1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.7, 5), matWoodRustic);
      spike1.position.set(sx, 0.85, 0.15);
      spike1.rotation.x = 0.35;
      const spike2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.7, 5), matWoodRustic);
      spike2.position.set(sx, 0.85, -0.15);
      spike2.rotation.x = -0.35;
      bGroup.add(spike1, spike2);
    }

    outpostGroup.add(bGroup);
    colliders.push({ type: 'circle', x: bc.x, z: bc.z, radius: bc.len * 0.4, label: 'Barikade Runcing' });
  });

  // Api Unggun Besar di Tengah Perkemahan dengan Panci Masak Tembaga
  const campFireGroup = new THREE.Group();
  campFireGroup.position.set(outpostCenterX, outpostBaseY, outpostCenterZ);

  // Lingkaran batu api unggun
  const rockRingCount = 10;
  for (let r = 0; r < rockRingCount; r++) {
    const rAngle = (r / rockRingCount) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), matStoneDarkCrag);
    stone.position.set(Math.cos(rAngle) * 1.35, 0.18, Math.sin(rAngle) * 1.35);
    campFireGroup.add(stone);
  }

  // Kayu bakar silang
  for (let l = 0; l < 4; l++) {
    const lAngle = (l / 4) * Math.PI;
    const firewood = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 5), matWoodDark);
    firewood.rotateZ(Math.PI / 2);
    firewood.rotation.y = lAngle;
    firewood.position.y = 0.22;
    campFireGroup.add(firewood);
  }

  // Api unggun berkobar
  const campFlame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.45, 6), matOrangeFire);
  campFlame.position.y = 0.85;
  campFireGroup.add(campFlame);

  // Tripod tiang kayu penyangga panci masak
  for (let t = 0; t < 3; t++) {
    const tAngle = (t / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 4), matWoodRustic);
    leg.position.set(Math.cos(tAngle) * 0.75, 1.25, Math.sin(tAngle) * 0.75);
    leg.rotation.z = 0.32;
    leg.rotation.y = tAngle;
    campFireGroup.add(leg);
  }

  // Panci masak tembaga
  const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), matCopperCauldron);
  cauldron.position.y = 1.4;
  cauldron.scale.set(1.1, 0.85, 1.1);
  campFireGroup.add(cauldron);

  // Cahaya api unggun
  const fireLight = new THREE.PointLight(0xff7700, 2.8, 28);
  fireLight.position.set(outpostCenterX, outpostBaseY + 1.2, outpostCenterZ);
  outpostGroup.add(fireLight);

  animatedLights.push({ light: fireLight, baseIntensity: 2.8, speed: 10 });
  animatedFlames.push({ mesh: campFlame, baseScale: new THREE.Vector3(1, 1.3, 1), speed: 11 });

  outpostGroup.add(campFireGroup);
  colliders.push({ type: 'circle', x: outpostCenterX, z: outpostCenterZ, radius: 1.6, label: 'Api Unggun' });

  // Peti Kayu Rampasan (Loot Crates)
  const lootStacks = [
    {
      x: -274, z: -88, crates: [
        { dx: 0, dz: 0, w: 0.8, h: 0.65, dy: 0 },
        { dx: 0.7, dz: 0.1, w: 0.65, h: 0.6, dy: 0 },
        { dx: 0.3, dz: 0.05, w: 0.6, h: 0.55, dy: 0.65 },
      ]
    },
    {
      x: -258, z: -104, crates: [
        { dx: 0, dz: 0, w: 0.9, h: 0.75, dy: 0 },
        { dx: 0.8, dz: -0.15, w: 0.7, h: 0.65, dy: 0 },
        { dx: 0.35, dz: 0.0, w: 0.65, h: 0.6, dy: 0.75 },
      ]
    },
    {
      x: -273, z: -106, crates: [
        { dx: 0, dz: 0, w: 0.75, h: 0.6, dy: 0 },
        { dx: 0.65, dz: 0.1, w: 0.65, h: 0.55, dy: 0 },
      ]
    },
  ];

  lootStacks.forEach((ls) => {
    if (isPointNearRoad(ls.x, ls.z, 6.5)) return;
    const ly = getTerrainHeight(ls.x, ls.z);
    ls.crates.forEach((c) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.w), matWoodDark);
      box.position.set(ls.x + c.dx, ly + c.dy + c.h * 0.5, ls.z + c.dz);
      box.rotation.y = (Math.random() - 0.5) * 0.4;

      const band = new THREE.Mesh(new THREE.BoxGeometry(c.w * 1.02, 0.08, c.w * 1.02), matIronBands);
      band.position.set(ls.x + c.dx, ly + c.dy + c.h * 0.5, ls.z + c.dz);
      outpostGroup.add(box, band);
    });
    colliders.push({ type: 'circle', x: ls.x, z: ls.z, radius: 1.3, label: 'Peti Rampasan' });
  });

  // Tong Anggur Kayu Rusak (Broken Wine Barrels)
  const wineBarrels = [
    { x: -257, z: -91, rotX: 0, rotY: 0.2, rotZ: 0 }, // Tegak
    { x: -265, z: -98, rotX: 0.2, rotY: 0.8, rotZ: 1.45 }, // Tergeletak miring
    { x: -252, z: -99, rotX: -0.15, rotY: 1.2, rotZ: 0.2 }, // Sedikit miring pecah
  ];

  wineBarrels.forEach((wb) => {
    if (isPointNearRoad(wb.x, wb.z, 6.5)) return;
    const wy = getTerrainHeight(wb.x, wb.z);
    const bGroup = new THREE.Group();
    bGroup.position.set(wb.x, wy + 0.45, wb.z);
    bGroup.rotation.set(wb.rotX, wb.rotY, wb.rotZ);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.95, 8), matWineBarrel);
    const hoop1 = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 8), matIronBands);
    hoop1.position.y = 0.26;
    const hoop2 = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 8), matIronBands);
    hoop2.position.y = -0.26;

    bGroup.add(barrel, hoop1, hoop2);
    outpostGroup.add(bGroup);
    colliders.push({ type: 'circle', x: wb.x, z: wb.z, radius: 0.65, label: 'Tong Anggur Rusak' });
  });

  // Obor Tiang Kayu Berkobar (Standing Wooden Torches)
  const campTorches = [
    { x: -244, z: -84 }, // Gerbang kamp sisi utara
    { x: -244, z: -92 }, // Gerbang kamp sisi selatan
    { x: -274, z: -98 }, // Dekat menara pengawas
    { x: -268, z: -82 }, // Dekat tenda 1
  ];

  campTorches.forEach((ct, tIdx) => {
    const ty = getTerrainHeight(ct.x, ct.z);
    const tGroup = new THREE.Group();
    tGroup.position.set(ct.x, ty, ct.z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 5), matWoodDark);
    pole.position.y = 1.1;

    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.35, 6), matIronBands);
    basket.position.y = 2.15;

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 5), matOrangeFire);
    flame.position.y = 2.45;

    tGroup.add(pole, basket, flame);
    outpostGroup.add(tGroup);

    const tLight = new THREE.PointLight(0xff8800, 1.6, 14);
    tLight.position.set(ct.x, ty + 2.5, ct.z);
    outpostGroup.add(tLight);

    animatedLights.push({ light: tLight, baseIntensity: 1.6, speed: 8 + tIdx });
    animatedFlames.push({ mesh: flame, baseScale: new THREE.Vector3(1, 1.25, 1), speed: 9 + tIdx });
  });

  envGroup.add(outpostGroup);

  // ============================================================================
  // 5. ZONA E: SABANA & LERENG BUKIT PADANG RUMPUT (Dry SE Coastal Downs X: 320..365, Z: 75..120)
  // ============================================================================
  await checkEnvYield(67, 'Membangun Wilayah Sabana & Pesisir Barat (67%)...');
  const savannaGroup = new THREE.Group();
  savannaGroup.name = 'ZoneE_SavannaHills';

  // Gugusan Bebatuan Besar (Rock Clusters) di daratan kering tenggara
  const rockClusters = [
    {
      cx: 325, cz: 82, rocks: [
        { dx: 0, dz: 0, s: [2.6, 2.2, 2.4], rot: 0.4 },
        { dx: 2.2, dz: 1.2, s: [1.8, 1.6, 1.9], rot: -0.8 },
        { dx: -1.9, dz: -1.4, s: [2.1, 1.9, 1.8], rot: 1.2 },
        { dx: 0.8, dz: -2.3, s: [1.5, 1.3, 1.6], rot: -1.5 },
        { dx: -2.4, dz: 1.8, s: [1.4, 1.2, 1.5], rot: 0.9 },
      ]
    },
    {
      cx: 350, cz: 105, rocks: [
        { dx: 0, dz: 0, s: [2.8, 2.4, 2.5], rot: 1.1 },
        { dx: 2.4, dz: -0.8, s: [2.0, 1.7, 1.9], rot: -0.5 },
        { dx: -2.1, dz: 1.4, s: [1.6, 1.4, 1.7], rot: 0.3 },
        { dx: 1.2, dz: 2.1, s: [1.4, 1.1, 1.4], rot: -1.2 },
      ]
    },
    {
      cx: 332, cz: 112, rocks: [
        { dx: 0, dz: 0, s: [2.5, 2.0, 2.3], rot: -0.7 },
        { dx: 1.8, dz: 1.5, s: [1.9, 1.6, 1.8], rot: 0.6 },
        { dx: -1.7, dz: -1.6, s: [1.7, 1.3, 1.6], rot: -1.1 },
        { dx: 2.6, dz: -1.2, s: [1.4, 1.1, 1.5], rot: 1.4 },
        { dx: -2.5, dz: 1.1, s: [1.3, 1.0, 1.4], rot: -0.3 },
      ]
    },
  ];

  rockClusters.forEach((rc) => {
    if (getDistanceToNearestRoad(rc.cx, rc.cz) < 9.5 || !isValidDryLand(rc.cx, rc.cz, 3.5)) return;
    rc.rocks.forEach((r) => {
      const rx = rc.cx + r.dx;
      const rz = rc.cz + r.dz;
      const ry = getTerrainHeight(rx, rz);
      const bMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), matStoneDarkCrag);
      bMesh.position.set(rx, ry + r.s[1] * 0.45, rz);
      bMesh.scale.set(r.s[0], r.s[1], r.s[2]);
      bMesh.rotation.set(r.rot * 0.5, r.rot, r.rot * 0.3);
      savannaGroup.add(bMesh);
    });
    colliders.push({ type: 'circle', x: rc.cx, z: rc.cz, radius: 3.5, label: 'Gugusan Batu Sabana' });
  });

  // Kelompok Pohon Cemara Lebat di Bukit Sabana Kering
  const hillPines = [
    { x: 338, z: 78, s: 1.25 },
    { x: 344, z: 85, s: 1.1 },
    { x: 334, z: 92, s: 1.35 },
    { x: 342, z: 98, s: 1.05 },
    { x: 356, z: 88, s: 1.2 },
    { x: 360, z: 96, s: 1.15 },
    { x: 320, z: 95, s: 1.3 },
  ];

  hillPines.forEach((hp) => {
    if (isDesertBiome(hp.x, hp.z) || !isValidDryLand(hp.x, hp.z, 1.5) || getDistanceToNearestRoad(hp.x, hp.z) < 9.5) return;
    const hy = getTerrainHeight(hp.x, hp.z);
    const pGroup = new THREE.Group();
    pGroup.position.set(hp.x, hy, hp.z);
    pGroup.scale.setScalar(hp.s);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 2.4, 5), matWoodRustic);
    trunk.position.y = 1.2;
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.3, 5), matPineFoliage);
    c1.position.y = 2.5;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.0, 5), matPineFoliage);
    c2.position.y = 3.8;
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 5), matPineFoliage);
    c3.position.y = 4.9;

    pGroup.add(trunk, c1, c2, c3);
    savannaGroup.add(pGroup);
    colliders.push({ type: 'circle', x: hp.x, z: hp.z, radius: 1.1 * hp.s, label: 'Pohon Cemara Bukit' });
  });

  // Kelompok Pohon Rindang Oak Lebat
  const hillOaks = [
    { x: 315, z: 75, s: 1.2 },
    { x: 322, z: 102, s: 1.35 },
    { x: 312, z: 108, s: 1.15 },
    { x: 355, z: 112, s: 1.25 },
    { x: 362, z: 104, s: 1.1 },
    { x: 348, z: 74, s: 1.3 },
    { x: 328, z: 72, s: 1.1 },
    { x: 358, z: 78, s: 1.2 },
  ];

  hillOaks.forEach((ho) => {
    if (isDesertBiome(ho.x, ho.z) || !isValidDryLand(ho.x, ho.z, 1.5) || getDistanceToNearestRoad(ho.x, ho.z) < 9.5) return;
    const oy = getTerrainHeight(ho.x, ho.z);
    const oGroup = new THREE.Group();
    oGroup.position.set(ho.x, oy, ho.z);
    oGroup.scale.setScalar(ho.s);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 2.8, 6), matWoodRustic);
    trunk.position.y = 1.4;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 0), matOakFoliage);
    crown.position.y = 4.0;
    crown.scale.set(1.1, 0.95, 1.05);

    oGroup.add(trunk, crown);
    savannaGroup.add(oGroup);
    colliders.push({ type: 'circle', x: ho.x, z: ho.z, radius: 1.3 * ho.s, label: 'Pohon Oak Sabana' });
  });

  envGroup.add(savannaGroup);

  // ============================================================================
  // 6. ZONA F: WILAYAH PESISIR BARAT & TEBING PANTAI (X: -400 s.d -450, Z: -50 s.d -240)
  // ============================================================================
  await checkEnvYield(67, 'Membangun Wilayah Sabana & Pesisir Barat (67%)...');
  const coastGroup = new THREE.Group();
  coastGroup.name = 'ZoneF_WesternCoast';

  // Helper Pembuat Pohon Kelapa/Palem Tropis Miring (Leaning Palm Tree)
  function createPalmTree(x: number, z: number, leanAngle: number, leanDir: number, scale = 1.0) {
    const y = getTerrainHeight(x, z);
    const palm = new THREE.Group();
    palm.position.set(x, y, z);
    palm.rotation.y = leanDir;
    palm.scale.setScalar(scale);

    // Batang melengkung bertingkat (curved segmented trunk)
    const segCount = 6;
    const segH = 0.95;
    let curX = 0;
    let curY = 0;
    for (let i = 0; i < segCount; i++) {
      const r = 0.22 - i * 0.015;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, segH, 6), matPalmTrunk);
      seg.position.set(curX, curY + segH * 0.5, 0);
      seg.rotation.z = -leanAngle * (i / segCount);

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.08, 6), matPalmRing);
      ring.position.set(curX, curY + segH * 0.95, 0);
      ring.rotation.z = -leanAngle * (i / segCount);

      palm.add(seg, ring);
      curX += Math.sin(leanAngle * (i / segCount)) * segH;
      curY += Math.cos(leanAngle * (i / segCount)) * segH;
    }

    // Tajuk Pelepah Daun Kelapa (Palm Fronds Crown)
    const frondCount = 7;
    for (let f = 0; f < frondCount; f++) {
      const fAngle = (f / frondCount) * Math.PI * 2;
      const frond = new THREE.Group();
      frond.position.set(curX, curY, 0);
      frond.rotation.y = fAngle;

      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 4), matPalmLeaf);
      leaf.position.set(0, 0.8, 1.2);
      leaf.rotation.x = 1.15;
      leaf.scale.set(1.0, 1.0, 0.15);
      frond.add(leaf);

      palm.add(frond);
    }

    // Gerombolan Buah Kelapa di Bawah Daun
    for (let c = 0; c < 4; c++) {
      const cAngle = (c / 4) * Math.PI * 2 + 0.3;
      const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 5), matCoconut);
      coconut.position.set(curX + Math.cos(cAngle) * 0.35, curY - 0.2, Math.sin(cAngle) * 0.35);
      palm.add(coconut);
    }

    coastGroup.add(palm);
    colliders.push({ type: 'circle', x, z, radius: 0.9 * scale, label: 'Pohon Kelapa Pantai' });
  }

  // Deretan Pohon Kelapa/Palem Miring di Sepanjang Garis Pantai
  const coastalPalms = [
    { x: -408, z: -65, lean: 0.32, dir: 1.5, s: 1.15 },
    { x: -412, z: -85, lean: 0.28, dir: 1.3, s: 1.05 },
    { x: -416, z: -110, lean: 0.35, dir: 1.6, s: 1.2 },
    { x: -419, z: -130, lean: 0.30, dir: 1.4, s: 1.1 },
    { x: -422, z: -150, lean: 0.36, dir: 1.7, s: 1.25 },
    { x: -425, z: -175, lean: 0.32, dir: 1.5, s: 1.15 },
    { x: -428, z: -195, lean: 0.34, dir: 1.6, s: 1.2 },
    { x: -432, z: -215, lean: 0.28, dir: 1.3, s: 1.05 },
    { x: -436, z: -235, lean: 0.35, dir: 1.6, s: 1.2 },
    // Palem cadangan di gumuk pasir
    { x: -404, z: -95, lean: 0.25, dir: 1.2, s: 1.0 },
    { x: -414, z: -165, lean: 0.30, dir: 1.5, s: 1.1 },
    { x: -420, z: -205, lean: 0.27, dir: 1.4, s: 1.05 },
    { x: -410, z: -120, lean: 0.33, dir: 1.6, s: 1.15 },
  ];

  coastalPalms.forEach((cp) => {
    if (!isValidDryLand(cp.x, cp.z, 1.5) || getDistanceToNearestRoad(cp.x, cp.z) < 9.5) return;
    createPalmTree(cp.x, cp.z, cp.lean, cp.dir, cp.s);
  });

  // Reruntuhan Perahu Kayu Karam di Dekat Garis Pantai (hanya di pantai kering bebas jalan)
  let wreckX = -428;
  let wreckZ = -135;
  if (!isValidDryLand(wreckX, wreckZ, 2.0)) {
    wreckX = -402;
    wreckZ = -135;
  }
  const wreckY = getTerrainHeight(wreckX, wreckZ);
  const wreckGroup = new THREE.Group();
  wreckGroup.position.set(wreckX, wreckY + 0.3, wreckZ);
  wreckGroup.rotation.set(0.18, 0.65, 0.32); // Miring terdampar di pasir

  // Lambung kapal kayu besar retak
  const hullLength = 9.5;
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, hullLength), matShipWood);
  keel.position.y = 0.25;
  wreckGroup.add(keel);

  // Tulang iga rusuk kapal melengkung keluar dari pasir
  for (let r = 0; r < 7; r++) {
    const rz = -hullLength * 0.45 + r * (hullLength * 0.15);
    const ribW = 2.4 - Math.abs(r - 3) * 0.35;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(ribW * 0.5, 0.14, 5, 8, Math.PI), matShipWood);
    rib.rotation.x = Math.PI / 2;
    rib.rotation.y = (Math.random() - 0.5) * 0.2;
    rib.position.set(0, 0.4, rz);
    wreckGroup.add(rib);
  }

  // Papan dinding geladak yang lapuk & pecah
  for (let p = 0; p < 6; p++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, hullLength * 0.75), matShipPlank);
    plank.position.set(1.1 + (p % 2) * 0.15, 0.3 + p * 0.35, 0);
    plank.rotation.z = 0.25;
    wreckGroup.add(plank);
  }

  // Tiang layar patah (snapped mast) miring
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 4.2, 6), matShipWood);
  mast.position.set(-0.2, 1.8, -0.6);
  mast.rotation.z = -0.55;
  mast.rotation.x = 0.3;
  wreckGroup.add(mast);

  // Palang layar patah (yardarm) tergeletak
  const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 5), matShipWood);
  yardarm.position.set(0.8, 0.4, 0.8);
  yardarm.rotation.y = 0.8;
  yardarm.rotation.z = 0.15;
  wreckGroup.add(yardarm);

  // Peti dan tong kargo terdampar di sekitar kapal
  [
    { dx: 2.2, dz: 1.5, w: 0.8, h: 0.65 },
    { dx: -2.0, dz: 2.2, w: 0.7, h: 0.55 },
    { dx: 2.8, dz: -1.8, w: 0.75, h: 0.6 },
  ].forEach((wc) => {
    const cMesh = new THREE.Mesh(new THREE.BoxGeometry(wc.w, wc.h, wc.w), matWoodDark);
    cMesh.position.set(wc.dx, 0.3, wc.dz);
    cMesh.rotation.y = Math.random() * Math.PI;
    wreckGroup.add(cMesh);
  });

  if (isValidDryLand(wreckX, wreckZ, 1.5) && getDistanceToNearestRoad(wreckX, wreckZ) >= 9.5) {
    coastGroup.add(wreckGroup);
    colliders.push({ type: 'circle', x: wreckX, z: wreckZ, radius: 4.8, label: 'Bangkai Perahu Karam' });
  }

  // Formasi Batu Karang Laut di Bibir Air (Sea Reef Rocks)
  const coastalReefs = [
    {
      x: -435, z: -75, rocks: [
        { dx: 0, dz: 0, s: [3.2, 2.2, 3.0] },
        { dx: 2.1, dz: 1.4, s: [2.0, 1.6, 2.2] },
        { dx: -1.8, dz: -1.2, s: [1.8, 1.4, 1.7] },
      ]
    },
    {
      x: -440, z: -115, rocks: [
        { dx: 0, dz: 0, s: [3.5, 2.5, 3.2] },
        { dx: 1.8, dz: -1.6, s: [2.2, 1.8, 2.0] },
      ]
    },
    {
      x: -445, z: -155, rocks: [
        { dx: 0, dz: 0, s: [3.0, 2.4, 2.8] },
        { dx: -2.2, dz: 1.5, s: [2.1, 1.5, 2.3] },
        { dx: 1.9, dz: -1.1, s: [1.9, 1.4, 1.8] },
      ]
    },
    {
      x: -442, z: -190, rocks: [
        { dx: 0, dz: 0, s: [3.4, 2.2, 3.1] },
        { dx: 2.4, dz: 1.0, s: [2.0, 1.5, 2.0] },
      ]
    },
    {
      x: -448, z: -225, rocks: [
        { dx: 0, dz: 0, s: [3.6, 2.6, 3.5] },
        { dx: -2.1, dz: -1.5, s: [2.3, 1.7, 2.1] },
      ]
    },
  ];

  coastalReefs.forEach((cr) => {
    if (getBiomeAt(cr.x, cr.z) === 'ocean' || getTerrainHeight(cr.x, cr.z) < WATER_LEVEL - 0.1 || getDistanceToNearestRoad(cr.x, cr.z) < 9.5) return;
    cr.rocks.forEach((r) => {
      const rx = cr.x + r.dx;
      const rz = cr.z + r.dz;
      const ry = getTerrainHeight(rx, rz);
      const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), matWetSeaRock);
      crag.position.set(rx, ry + r.s[1] * 0.4, rz);
      crag.scale.set(r.s[0], r.s[1], r.s[2]);
      crag.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      coastGroup.add(crag);
    });
    colliders.push({ type: 'circle', x: cr.x, z: cr.z, radius: 3.2, label: 'Batu Karang Laut' });
  });

  envGroup.add(coastGroup);

  // ============================================================================
  // 4. ZONA G: PADANG RUMPUT UTARA & SARANG SERIGALA RIMBA (X: -60 s.d -120, Z: -30 s.d -90)
  // Menghidupkan wilayah koordinat X: -77, Z: -45 dan bukit landai sekitarnya
  // Serta menata cekungan sarang monster buas berjarak > 190 unit dari pusat desa
  // ============================================================================
  await checkEnvYield(68, 'Membangun Padang Rumput Utara & Arena Colosseum (68%)...');
  const meadowGroup = new THREE.Group();
  meadowGroup.name = 'ZoneG_NorthernMeadows';

  // 1. Puncak Pemandangan Bukit Padang Rumput (Scenic Hill Overlook di X: -77, Z: -45)
  const landmarkX = -77;
  const landmarkZ = -45;
  if (isValidDryLand(landmarkX, landmarkZ, 2.5) && getDistanceToNearestRoad(landmarkX, landmarkZ) >= 9.5) {
    const landmarkY = getTerrainHeight(landmarkX, landmarkZ);

    // Megalit Kuno Puncak Bukit (Weather-worn Waypoint Monolith)
    const monolith = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, 3.8, 6), matStoneRuins);
    monolith.position.set(landmarkX, landmarkY + 1.9, landmarkZ);
    monolith.rotation.y = 0.45;
    monolith.castShadow = true;
    meadowGroup.add(monolith);
    colliders.push({ type: 'circle', x: landmarkX, z: landmarkZ, radius: 1.4, label: 'Megalit Padang Rumput' });

    // Lingkaran Rune Kuno Lemah di dasar Megalit
    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.9, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.set(landmarkX, landmarkY + 0.04, landmarkZ);
    meadowGroup.add(runeRing);

    // Batang Kayu Tumbang Berlumut / Bangku Kayu Rustic Alami
    const logX = -74.5;
    const logZ = -42.5;
    if (isValidDryLand(logX, logZ, 1.5) && getDistanceToNearestRoad(logX, logZ) >= 9.5) {
      const logY = getTerrainHeight(logX, logZ);
      const mossyLog = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 3.6, 6), matWoodRustic);
      mossyLog.position.set(logX, logY + 0.32, logZ);
      mossyLog.rotation.z = Math.PI / 2;
      mossyLog.rotation.y = 0.65;
      mossyLog.castShadow = true;
      meadowGroup.add(mossyLog);
      colliders.push({ type: 'circle', x: logX, z: logZ, radius: 1.2, label: 'Batang Kayu Berlumut' });
    }
  }

  // 2. CEKUNGAN MONSTER SERIGALA RIMBA / WILD WOLF HOLLOW (Direlokasi ke Daratan Aman [-95, -245])
  const wolfLairX = -95;
  const wolfLairZ = -245;
  const wolfLairY = getTerrainHeight(wolfLairX, wolfLairZ);

  // Formasi 9 Batu Runcing Mengelilingi Cekungan Tapal Kuda (Sharp Dark Crags - strictly dry & clear of river/road)
  const sharpCragCount = 9;
  for (let sc = 0; sc < sharpCragCount; sc++) {
    const scAngle = 0.3 * Math.PI + (sc / sharpCragCount) * 1.5 * Math.PI;
    const scDist = 13 + (sc % 2) * 3.5;
    const rcX = wolfLairX + Math.cos(scAngle) * scDist;
    const rcZ = wolfLairZ + Math.sin(scAngle) * scDist;

    if (!isValidDryLand(rcX, rcZ, 2.5) || getDistanceToNearestRoad(rcX, rcZ) < 9.5) continue;

    const rcY = getTerrainHeight(rcX, rcZ);

    const cragH = 3.6 + Math.random() * 2.8;
    const cragW = 1.6 + Math.random() * 1.2;
    const cragMesh = new THREE.Mesh(new THREE.ConeGeometry(cragW, cragH, 5), matStoneDarkCrag);
    cragMesh.position.set(rcX, rcY + cragH * 0.45, rcZ);
    cragMesh.rotation.y = Math.random() * Math.PI * 2;
    cragMesh.rotation.z = (Math.random() - 0.5) * 0.28;
    cragMesh.castShadow = true;
    meadowGroup.add(cragMesh);

    colliders.push({ type: 'circle', x: rcX, z: rcZ, radius: cragW * 0.85, label: 'Batu Runcing Sarang Serigala' });
  }

  // 3 Batang Pohon Mati Meranggas (Twisted Dead Trees)
  const deadTreeCoords = [
    { x: -88, z: -238 },
    { x: -103, z: -244 },
    { x: -94, z: -258 },
  ];
  deadTreeCoords.forEach((dt) => {
    if (isDesertBiome(dt.x, dt.z) || !isValidDryLand(dt.x, dt.z, 1.5) || getDistanceToNearestRoad(dt.x, dt.z) < 9.5) return;
    const dty = getTerrainHeight(dt.x, dt.z);
    const deadTree = new THREE.Group();
    deadTree.position.set(dt.x, dty, dt.z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 4.0, 5), matWoodDark);
    trunk.position.y = 2.0;
    trunk.rotation.z = (Math.random() - 0.5) * 0.3;
    trunk.rotation.x = (Math.random() - 0.5) * 0.25;
    trunk.castShadow = true;
    deadTree.add(trunk);

    // Cabang ranting kering mencuat
    for (let b = 0; b < 3; b++) {
      const bGeo = new THREE.CylinderGeometry(0.08, 0.16, 2.0, 4);
      const branch = new THREE.Mesh(bGeo, matWoodDark);
      branch.position.set((b - 1) * 0.45, 2.8 + b * 0.35, 0);
      branch.rotation.z = (b % 2 === 0 ? 1 : -1) * (0.6 + Math.random() * 0.4);
      deadTree.add(branch);
    }

    meadowGroup.add(deadTree);
    colliders.push({ type: 'circle', x: dt.x, z: dt.z, radius: 1.0, label: 'Pohon Mati Padang' });
  });

  // Tumpukan Tulang Belulang & Tengkorak Hewan Mangsa
  const wolfBones = [
    { x: -92, z: -62 },
    { x: -97, z: -68 },
    { x: -89, z: -70 },
  ];
  wolfBones.forEach((wb) => {
    const wby = getTerrainHeight(wb.x, wb.z);
    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), matBone);
    skull.position.set(wb.x, wby + 0.18, wb.z);
    skull.rotation.set(0.3, Math.random() * Math.PI, 0.2);
    skull.castShadow = true;
    meadowGroup.add(skull);
  });

  envGroup.add(meadowGroup);

  // ============================================================================
  // 5. ZONA H: RERUNTUHAN COLOSSEUM KUNO / ANCIENT COLOSSEUM ARENA [180, -560]
  // Ekspansi platform batu raksasa radius 60 unit (diameter 120u) + lingkaran megalit Stonehenge & 2 gerbang masuk lebar.
  // 0 dynamic PointLight: pencahayaan menggunakan material emissive agar tetap 60 FPS saat bertarung.
  // ============================================================================
  await checkEnvYield(68, 'Membangun Padang Rumput Utara & Arena Colosseum Raksasa (68%)...');
  const colosseumGroup = new THREE.Group();
  colosseumGroup.name = 'ZoneH_AncientColosseumBossArena';

  const golemLayout = getLandmarkLayout('bossGolem') || getLandmarkLayout('kawah_boss');
  const colosseumCenterX = golemLayout?.x ?? 180;
  const colosseumCenterZ = golemLayout?.z ?? -560;
  const craterCenterX = colosseumCenterX;
  const craterCenterZ = colosseumCenterZ;
  const colosseumFloorY = golemLayout?.y ?? 4.50;
  const arenaRadius = 60.0;
  const wallRadius = 64.5;

  // A. Lantai Batu Arena Colosseum Luas (Radius 60u, Walkable Solid Surface)
  const matColosseumFloor = new THREE.MeshStandardMaterial({
    color: 0xb0a390,
    roughness: 0.9,
    metalness: 0.08,
    flatShading: true,
  });
  const matColosseumInnerRing = new THREE.MeshStandardMaterial({
    color: 0x7c7265,
    roughness: 0.88,
    metalness: 0.12,
  });
  const matFissureEmissive = new THREE.MeshBasicMaterial({
    color: 0xea580c,
    transparent: true,
    opacity: 0.58,
  });
  const matMegalithRune = new THREE.MeshStandardMaterial({
    color: 0x2d3442,
    roughness: 0.85,
    metalness: 0.25,
    flatShading: true,
  });
  const matMegalithEmissive = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.25,
  });

  const arenaFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(arenaRadius, arenaRadius + 1.5, 0.35, 56),
    matColosseumFloor
  );
  arenaFloor.position.set(colosseumCenterX, colosseumFloorY - 0.12, colosseumCenterZ);
  arenaFloor.receiveShadow = true;
  colosseumGroup.add(arenaFloor);
  registerWalkableSurface(arenaFloor, { label: 'Lantai Utama Colosseum Titan Kuno' });

  // B. Medallion Hantaman Tengah & Retakan Magma Kuno Walkable di Lantai Arena
  const centerMedallion = new THREE.Mesh(
    new THREE.CylinderGeometry(16.0, 16.5, 0.12, 32),
    matColosseumInnerRing
  );
  centerMedallion.position.set(colosseumCenterX, colosseumFloorY + 0.04, colosseumCenterZ);
  centerMedallion.receiveShadow = true;
  colosseumGroup.add(centerMedallion);
  registerWalkableSurface(centerMedallion, { label: 'Pelat Tengah Colosseum Titan' });

  const craterRing = new THREE.Mesh(
    new THREE.RingGeometry(15.2, 16.0, 40).rotateX(-Math.PI / 2),
    matFissureEmissive
  );
  craterRing.position.set(colosseumCenterX, colosseumFloorY + 0.11, colosseumCenterZ);
  colosseumGroup.add(craterRing);

  // 8 Garis Retakan Bekas Hantaman Memancar dari Tengah
  for (let f = 0; f < 8; f++) {
    const fAng = (f / 8) * Math.PI * 2 + 0.2;
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 18.0), matDarkSoil);
    crack.position.set(
      colosseumCenterX + Math.sin(fAng) * 12.0,
      colosseumFloorY + 0.08,
      colosseumCenterZ + Math.cos(fAng) * 12.0
    );
    crack.rotation.y = fAng;
    crack.receiveShadow = true;
    colosseumGroup.add(crack);
  }

  const scorchCoords = [
    { dx: -16, dz: -12, r: 5.2 },
    { dx: 18, dz: 10, r: 5.8 },
    { dx: -10, dz: 22, r: 4.5 },
    { dx: 22, dz: -18, r: 5.0 },
    { dx: 0, dz: 0, r: 7.5 },
    { dx: -24, dz: -22, r: 4.2 },
  ];
  scorchCoords.forEach((sc) => {
    const scorch = new THREE.Mesh(
      new THREE.CircleGeometry(sc.r, 20).rotateX(-Math.PI / 2),
      matDarkSoil
    );
    scorch.position.set(colosseumCenterX + sc.dx, colosseumFloorY + 0.11, colosseumCenterZ + sc.dz);
    scorch.receiveShadow = true;
    colosseumGroup.add(scorch);
    registerWalkableSurface(scorch, { label: 'Lantai Bekas Hantaman Colosseum' });
  });

  // Pelat Batu Kuno Pecah Walkable di Lantai Arena
  for (let s = 0; s < 18; s++) {
    const sAng = (s / 18) * Math.PI * 2;
    const sDist = 18.0 + (s % 5) * 7.2;
    const sx = colosseumCenterX + Math.cos(sAng) * sDist;
    const sz = colosseumCenterZ + Math.sin(sAng) * sDist;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(3.2 + (s % 3) * 0.9, 0.14, 3.6 + (s % 4) * 0.7),
      matStoneRuins
    );
    slab.position.set(sx, colosseumFloorY + 0.07, sz);
    slab.rotation.y = sAng + Math.PI / 4;
    slab.receiveShadow = true;
    colosseumGroup.add(slab);
    registerWalkableSurface(slab, { label: 'Pelat Batu Colosseum' });
  }

  // Pecahan Pilar Marmer Roboh di Zona Luar Arena (tidak memblokir tengah)
  const fallenPillarOffsets = [
    { dx: -40, dz: 16, rotY: 0.6, len: 4.8 },
    { dx: 36, dz: -32, rotY: -0.8, len: 4.2 },
    { dx: -16, dz: -42, rotY: 1.2, len: 5.0 },
    { dx: 40, dz: 24, rotY: 2.1, len: 4.0 },
    { dx: 14, dz: 44, rotY: -1.4, len: 4.4 },
  ];
  fallenPillarOffsets.forEach((fp, idx) => {
    const px = colosseumCenterX + fp.dx;
    const pz = colosseumCenterZ + fp.dz;
    const colMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, fp.len, 12),
      matStoneRuins
    );
    colMesh.position.set(px, colosseumFloorY + 0.85, pz);
    colMesh.rotation.set(Math.PI / 2, fp.rotY, 0);
    colMesh.castShadow = true;
    colosseumGroup.add(colMesh);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 1.3, 12), matStoneRuins);
    drum.position.set(px + Math.cos(fp.rotY) * 3.1, colosseumFloorY + 0.65, pz + Math.sin(fp.rotY) * 3.1);
    drum.rotation.set(0.3, idx * 1.1, 0.4);
    drum.castShadow = true;
    colosseumGroup.add(drum);

    colliders.push({ type: 'circle', x: px, z: pz, radius: 1.9, label: `Pilar Roboh Colosseum ${idx + 1}` });
  });

  // C. Dinding Lengkung Colosseum Bertingkat + 2 Gerbang Masuk Lebar (Selatan & Timur)
  const totalBays = 28;
  for (let b = 0; b < totalBays; b++) {
    if (b > 0 && b % 4 === 0) {
      await cooperativeYield(4);
    }
    const angle = (b / totalBays) * Math.PI * 2;
    const isSouthEntrance = Math.abs(angle - Math.PI / 2) < 0.25;
    const isEastEntrance = angle < 0.25 || angle > Math.PI * 2 - 0.25;
    if (isSouthEntrance || isEastEntrance) continue;

    const bx = colosseumCenterX + Math.cos(angle) * wallRadius;
    const bz = colosseumCenterZ + Math.sin(angle) * wallRadius;
    const by = getTerrainHeight(bx, bz);
    const isRuined = b === 5 || b === 11 || b === 16 || b === 22;

    const bayGroup = new THREE.Group();
    bayGroup.position.set(bx, by, bz);
    bayGroup.rotation.y = -angle + Math.PI / 2;

    const pierL = new THREE.Mesh(UNIT_BOX, matStoneRuins);
    pierL.scale.set(1.75, 8.2, 2.0);
    pierL.position.set(-2.6, 4.1, 0);
    pierL.castShadow = true;
    bayGroup.add(pierL);

    const pierR = new THREE.Mesh(UNIT_BOX, matStoneRuins);
    pierR.scale.set(1.75, 8.2, 2.0);
    pierR.position.set(2.6, 4.1, 0);
    pierR.castShadow = true;
    bayGroup.add(pierR);

    const archHeader = new THREE.Mesh(UNIT_BOX, matStoneRuins);
    archHeader.scale.set(6.2, 1.35, 2.2);
    archHeader.position.set(0, 8.6, 0);
    archHeader.castShadow = true;
    bayGroup.add(archHeader);

    if (!isRuined) {
      const tier2Wall = new THREE.Mesh(UNIT_BOX, matStoneRuins);
      tier2Wall.scale.set(6.0, 6.2, 1.8);
      tier2Wall.position.set(0, 12.2, 0);
      tier2Wall.castShadow = true;
      bayGroup.add(tier2Wall);

      const cornice = new THREE.Mesh(UNIT_BOX, matStoneRuins);
      cornice.scale.set(6.4, 0.9, 2.4);
      cornice.position.set(0, 15.6, 0);
      cornice.castShadow = true;
      bayGroup.add(cornice);
    } else {
      for (let r = 0; r < 4; r++) {
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95 + (r % 3) * 0.35, 0), matStoneRuins);
        rubble.position.set((r - 1.5) * 1.3, 0.5 + (r % 2) * 0.4, r % 2 === 0 ? 1.1 : -1.1);
        rubble.castShadow = true;
        bayGroup.add(rubble);
      }
    }

    colosseumGroup.add(bayGroup);
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 2.8, label: `Dinding Colosseum Bay ${b + 1}` });
  }

  // D. Lingkaran Batu Megalitik Stonehenge Raksasa di Tepi Terluar (r = 69.5u)
  const colosseumStonehengeRadius = 69.5;
  for (let m = 0; m < 12; m++) {
    const mAng = (m / 12) * Math.PI * 2 + 0.14;
    if (Math.abs(mAng - Math.PI / 2) < 0.24 || Math.abs(mAng) < 0.24 || Math.abs(mAng - Math.PI * 2) < 0.24) {
      continue; // Sisakan jalan masuk selatan & timur
    }
    const mx = colosseumCenterX + Math.cos(mAng) * colosseumStonehengeRadius;
    const mz = colosseumCenterZ + Math.sin(mAng) * colosseumStonehengeRadius;
    const my = getTerrainHeight(mx, mz);
    const height = 11.5 + (m % 3) * 1.8;

    const monolithGroup = new THREE.Group();
    monolithGroup.position.set(mx, my, mz);
    monolithGroup.rotation.y = -mAng + Math.PI / 2;

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.2, height, 2.2), matMegalithRune);
    pillar.position.y = height / 2 - 0.3;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    monolithGroup.add(pillar);

    const runeBand = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 2.35), matMegalithEmissive);
    runeBand.position.y = height * 0.68;
    monolithGroup.add(runeBand);

    if (m % 2 === 0) {
      // Trilithon stone cap beam
      const capBeam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.35, 2.5), matStoneRuins);
      capBeam.position.y = height + 0.35;
      monolithGroup.add(capBeam);
    }

    colosseumGroup.add(monolithGroup);
    colliders.push({ type: 'circle', x: mx, z: mz, radius: 2.4, label: `Megalit Stonehenge ${m + 1}` });
  }

  // E. 2 Gapura Masuk Raksasa (Gerbang Selatan & Gerbang Timur)
  const buildColosseumGate = (gx: number, gz: number, rotY: number, gateLabel: string) => {
    const gy = getTerrainHeight(gx, gz);
    const portalGroup = new THREE.Group();
    portalGroup.position.set(gx, gy, gz);
    portalGroup.rotation.y = rotY;

    const gatePillarGeo = new THREE.BoxGeometry(3.4, 14.5, 3.8);
    const gatePillarL = new THREE.Mesh(gatePillarGeo, matStoneRuins);
    gatePillarL.position.set(-8.5, 7.25, 0);
    gatePillarL.castShadow = true;
    portalGroup.add(gatePillarL);

    const gatePillarR = new THREE.Mesh(gatePillarGeo, matStoneRuins);
    gatePillarR.position.set(8.5, 7.25, 0);
    gatePillarR.castShadow = true;
    portalGroup.add(gatePillarR);

    const gateArch = new THREE.Mesh(new THREE.BoxGeometry(20.4, 2.8, 4.2), matStoneRuins);
    gateArch.position.set(0, 14.5 + 1.4, 0);
    gateArch.castShadow = true;
    portalGroup.add(gateArch);

    const runeLintel = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.5, 4.35), matMegalithEmissive);
    runeLintel.position.set(0, 14.9, 0);
    portalGroup.add(runeLintel);

    const pediment = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.8, 4), matStoneRuins);
    pediment.position.set(0, 17.3 + 1.4, 0);
    pediment.rotation.y = Math.PI / 4;
    pediment.castShadow = true;
    portalGroup.add(pediment);

    colosseumGroup.add(portalGroup);
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    colliders.push({ type: 'circle', x: gx - 8.5 * cosR, z: gz + 8.5 * sinR, radius: 2.5, label: `Tiang Kiri ${gateLabel}` });
    colliders.push({ type: 'circle', x: gx + 8.5 * cosR, z: gz - 8.5 * sinR, radius: 2.5, label: `Tiang Kanan ${gateLabel}` });
  };

  buildColosseumGate(colosseumCenterX, colosseumCenterZ + wallRadius, 0, 'Gapura Selatan Colosseum');
  buildColosseumGate(colosseumCenterX + wallRadius, colosseumCenterZ, Math.PI / 2, 'Gapura Timur Colosseum');

  // F. 8 Anglo Api Kuno Bercahaya Emissive (ZERO dynamic PointLight!)
  const brazierCount = 8;
  const brazierRadius = 54.0;
  for (let bIdx = 0; bIdx < brazierCount; bIdx++) {
    const bAng = (bIdx / brazierCount) * Math.PI * 2 + Math.PI / 8;
    const brX = colosseumCenterX + Math.cos(bAng) * brazierRadius;
    const brZ = colosseumCenterZ + Math.sin(bAng) * brazierRadius;
    const brY = colosseumFloorY;

    const brazierGroup = new THREE.Group();
    brazierGroup.position.set(brX, brY, brZ);

    const baseStone = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 1.8, 8), matStoneRuins);
    baseStone.position.y = 0.9;
    baseStone.castShadow = true;
    brazierGroup.add(baseStone);

    const bronzeBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.0, 0.9, 12), matCopperCauldron);
    bronzeBowl.position.y = 2.25;
    bronzeBowl.castShadow = true;
    brazierGroup.add(bronzeBowl);

    const emberCore = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), matMegalithEmissive);
    emberCore.scale.set(1, 0.5, 1);
    emberCore.position.y = 2.75;
    brazierGroup.add(emberCore);

    const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.8, 8), matOrangeFire);
    flameMesh.position.y = 3.9;
    brazierGroup.add(flameMesh);

    animatedFlames.push({
      mesh: flameMesh,
      baseScale: new THREE.Vector3(1, 1, 1),
      speed: 4.2 + (bIdx % 3) * 0.8,
    });

    colosseumGroup.add(brazierGroup);
    colliders.push({ type: 'circle', x: brX, z: brZ, radius: 1.7, label: `Anglo Api Kuno Colosseum ${bIdx + 1}` });
  }

  envGroup.add(colosseumGroup);

  // ============================================================================
  // 6. ZONA I: SISTEM ALIRAN SUNGAI BERCABANG (NORTHWEST, EAST -> CONFLUENCE -> SOUTH OCEAN)
  // Palung meliuk natural sedalam Y: -2.2 unit, pita air jernih Y: -0.35 unit dengan animasi UV scroll.
  // ============================================================================
  await checkEnvYield(69, 'Menata Aliran Sungai Bercabang & Dataran Barat (69%)...');
  const canyonGroup = new THREE.Group();
  canyonGroup.name = 'ZoneI_RiverNetworkAndRavine';

  // Procedural flowing water ripple texture for continuous UV scrolling
  const riverWaterCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let riverWaterTexture: THREE.CanvasTexture | null = null;
  if (riverWaterCanvas) {
    riverWaterCanvas.width = 256;
    riverWaterCanvas.height = 256;
    const rCtx = riverWaterCanvas.getContext('2d');
    if (rCtx) {
      rCtx.fillStyle = '#0284c7';
      rCtx.fillRect(0, 0, 256, 256);
      rCtx.strokeStyle = 'rgba(224, 242, 254, 0.45)';
      rCtx.lineWidth = 4;
      for (let y = 8; y < 256; y += 28) {
        rCtx.beginPath();
        rCtx.moveTo(0, y);
        for (let x = 0; x <= 256; x += 16) {
          rCtx.lineTo(x, y + Math.sin(x * 0.1) * 3.5);
        }
        rCtx.stroke();
      }
    }
    riverWaterTexture = new THREE.CanvasTexture(riverWaterCanvas);
    riverWaterTexture.wrapS = THREE.RepeatWrapping;
    riverWaterTexture.wrapT = THREE.RepeatWrapping;
    riverWaterTexture.repeat.set(1, 8);
  }

  // Pita Air Sungai Tiga Jalur Tanpa Putus (Continuous Translucent River Ribbon Mesh)
  const matRiverWater = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Unified ocean & river blue
    map: riverWaterTexture,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });

  function samplePolyline(points: [number, number][], step = 3.5): [number, number][] {
    const res: [number, number][] = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const count = Math.max(1, Math.ceil(dist / step));
      for (let s = 1; s <= count; s++) {
        const t = s / count;
        res.push([
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t,
        ]);
      }
    }
    return res;
  }

  function buildRiverRibbon(rawPoints: [number, number][], width: number, yLevel: number): THREE.Mesh {
    const points = samplePolyline(rawPoints, 2.0);
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let accumDist = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i > 0) {
        accumDist += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
      }

      let dx = 0;
      let dz = 0;
      if (i < points.length - 1) {
        dx += points[i + 1][0] - p[0];
        dz += points[i + 1][1] - p[1];
      }
      if (i > 0) {
        dx += p[0] - points[i - 1][0];
        dz += p[1] - points[i - 1][1];
      }
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      let curW = width;
      if (i > points.length - 5) {
        const t = (points.length - 1 - i) / 4;
        curW = width * (0.45 + 0.55 * t);
      }
      const halfW = curW * 0.5;

      // Titik Kiri
      vertices.push(p[0] + nx * halfW, yLevel, p[1] + nz * halfW);
      uvs.push(0, accumDist * 0.08);

      // Titik Kanan
      vertices.push(p[0] - nx * halfW, yLevel, p[1] - nz * halfW);
      uvs.push(1, accumDist * 0.08);

      if (i < points.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, matRiverWater);
    mesh.receiveShadow = true;
    return mesh;
  }

  // Lebar pita air sungai 13.5..14.0 di Y: -0.25 menyatu halus ke tebing smoothstep sungai
  // 1. Cabang A (Barat Laut / Northwest)
  canyonGroup.add(buildRiverRibbon(RIVER_NORTHWEST_BRANCH, 13.8, -0.25));
  // 2. Cabang B (Gurun / Desert Branch)
  canyonGroup.add(buildRiverRibbon(RIVER_DESERT_BRANCH, 13.2, -0.25));
  // 3. Cabang C (Timur / East)
  canyonGroup.add(buildRiverRibbon(RIVER_EAST_BRANCH, 13.5, -0.25));
  // 4. Cabang D (Selatan / Hilir Utama)
  canyonGroup.add(buildRiverRibbon(RIVER_MAIN_DOWNSTREAM, 14.0, -0.25));

  // Hulu sungai alami di outlet Danau Titan + Telaga Lembah Hijau & Oase Bukir Pasir (NATURAL_POND_SITES)
  const createSpringPool = (sx: number, sz: number, radius = 8.0) => {
    const poolGeo = new THREE.CircleGeometry(radius, 24);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMesh = new THREE.Mesh(poolGeo, matRiverWater);
    poolMesh.position.set(sx, -0.22, sz);
    canyonGroup.add(poolMesh);
  };
  createSpringPool(60, -764, 9.5); // Muara aliran keluar Danau Titan Kuno

  const pondReedGeo = new THREE.ConeGeometry(0.14, 1.35, 4);
  pondReedGeo.translate(0, 0.67, 0);
  const matPondReed = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.85, flatShading: true });
  const matPondWater = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    roughness: 0.14,
    metalness: 0.22,
    transparent: true,
    opacity: 0.84,
  });

  NATURAL_POND_SITES.forEach((site, sIdx) => {
    const waterR = site.id === 'oasis_solaria_main' ? 11.8 : site.radius * 0.92;
    const pondGeo = new THREE.CircleGeometry(waterR, 28);
    pondGeo.rotateX(-Math.PI / 2);
    const pondMesh = new THREE.Mesh(pondGeo, site.biome === 'desert' ? matPondWater : matRiverWater);
    pondMesh.position.set(site.x, site.id === 'oasis_solaria_main' ? 0.78 : -0.22, site.z);
    canyonGroup.add(pondMesh);

    const rimCount = site.biome === 'desert' ? 6 : 8;
    for (let r = 0; r < rimCount; r++) {
      const ang = (r / rimCount) * Math.PI * 2 + sIdx * 0.55;
      const rr = waterR + 1.4 + (r % 2) * 1.1;
      const rx = site.x + Math.cos(ang) * rr;
      const rz = site.z + Math.sin(ang) * rr;
      const ry = getTerrainHeight(rx, rz);
      if (ry < 0.05) continue;

      if (site.biome === 'desert') {
        if (r % 2 === 0) {
          const pGroup = new THREE.Group();
          pGroup.position.set(rx, ry, rz);
          const lean = 0.18 + (r % 3) * 0.05;
          pGroup.rotation.y = ang + Math.PI;
          const tSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 4.6, 6), matPalmTrunk);
          tSeg.position.set(Math.sin(lean) * 0.8, 2.2, 0);
          tSeg.rotation.z = -lean;
          tSeg.castShadow = true;
          pGroup.add(tSeg);
          for (let f = 0; f < 5; f++) {
            const frond = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.5, 4), matPalmLeaf);
            frond.position.set(Math.sin(lean) * 1.6, 4.4, 0);
            frond.rotation.set(Math.PI * 0.38, (f / 5) * Math.PI * 2, 0);
            pGroup.add(frond);
          }
          canyonGroup.add(pGroup);
          colliders.push({ type: 'circle', x: rx, z: rz, radius: 0.65, label: 'Pohon Palem Oase' });
        }
      } else {
        if (r % 2 === 0) {
          const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95 + (r % 3) * 0.3, 0), matMossStone);
          boulder.position.set(rx, ry + 0.35, rz);
          boulder.scale.set(1.2, 0.72, 1.0);
          boulder.rotation.y = ang;
          canyonGroup.add(boulder);
        }
        const reed = new THREE.Mesh(pondReedGeo, matPondReed);
        reed.position.set(rx + 0.5, ry - 0.05, rz - 0.4);
        reed.rotation.z = 0.08 * Math.sin(r);
        canyonGroup.add(reed);
      }
    }
  });

  envGroup.add(canyonGroup);

  // ============================================================================
  // 7. ZONA J: TITIK MINAT BARU DATARAN BARAT (WESTERN POINTS OF INTEREST)
  // Menghidupkan wilayah luas X: -270 s.d -496, Z: -326 s.d 177 yang sebelumnya sepi
  // ============================================================================
  await checkEnvYield(69, 'Menata Aliran Sungai Bercabang & Dataran Barat (69%)...');
  const westPOIGroup = new THREE.Group();
  westPOIGroup.name = 'ZoneJ_WesternPOIs';

  // ----------------------------------------------------------------------------
  // POI A: LEMBAH BATU LUMUT KUNO / ANCIENT MOSS GLADE (X: -326, Z: -55)
  // Formasi Stonehenge mini: lingkaran 5 batu monolit besar, semak bunga liar, & pilar lintel
  // Digeser aman > 20 unit menjauhi garis tengah jalan (X: -361, Z: -30) agar jalur setapak 100% bebas rintangan
  // ----------------------------------------------------------------------------
  const mossGladeX = -326;
  const mossGladeZ = -55;
  const mossGladeY = getTerrainHeight(mossGladeX, mossGladeZ);

  const stonehengeCount = 5;
  const stonehengeRadius = 7.5;
  for (let s = 0; s < stonehengeCount; s++) {
    const sAng = (s / stonehengeCount) * Math.PI * 2;
    const sx = mossGladeX + Math.cos(sAng) * stonehengeRadius;
    const sz = mossGladeZ + Math.sin(sAng) * stonehengeRadius;

    // ROAD CLEARANCE & WATER EXCLUSION: Minimal 4.5 unit dari garis tengah jalan batu & dilarang di perairan
    if (getDistanceToNearestRoad(sx, sz) < 9.5 || !isValidDryLand(sx, sz, 2.0)) continue;

    const sy = getTerrainHeight(sx, sz);

    const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.6, 1.1), matMossStone);
    monolith.position.set(sx, sy + 2.3, sz);
    monolith.rotation.y = sAng + 0.2;
    monolith.castShadow = true;
    westPOIGroup.add(monolith);
    colliders.push({ type: 'circle', x: sx, z: sz, radius: 1.2, label: 'Monolit Batu Lumut' });

    // Batu lintel horizontal melintang di atas dua pilar pertama
    if (s === 0) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 1.2), matMossStone);
      lintel.position.set(sx + 1.6, sy + 4.9, sz);
      lintel.rotation.y = sAng;
      lintel.castShadow = true;
      westPOIGroup.add(lintel);
    }
  }

  // Rumpun bunga liar dan semak subur di tengah Stonehenge
  for (let f = 0; f < 6; f++) {
    const fAng = (f / 6) * Math.PI * 2;
    const fx = mossGladeX + Math.cos(fAng) * 3.2;
    const fz = mossGladeZ + Math.sin(fAng) * 3.2;

    if (getDistanceToNearestRoad(fx, fz) < 9.5 || !isValidDryLand(fx, fz, 1.0)) continue;

    const fy = getTerrainHeight(fx, fz);

    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), matShrub);
    bush.position.set(fx, fy + 0.35, fz);
    bush.scale.set(1.2, 0.8, 1.2);
    westPOIGroup.add(bush);

    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), matWildflower);
    flower.position.set(fx, fy + 0.65, fz);
    westPOIGroup.add(flower);
  }

  // ----------------------------------------------------------------------------
  // POI B: POS PENJAGA RUSAK / RUINED WATCHPOST (Direlokasi ke Daratan Aman X: -340, Z: -145)
  // ----------------------------------------------------------------------------
  const watchpostX = -340;
  const watchpostZ = -145;
  if (isValidDryLand(watchpostX, watchpostZ, 4.0) && getDistanceToNearestRoad(watchpostX, watchpostZ) >= 12.0) {
    const watchposY = getTerrainHeight(watchpostX, watchpostZ);

    // Pondasi Dinding Batu Reruntuhan L-Shape
    const wallGeo1 = new THREE.BoxGeometry(6.5, 1.8, 1.2);
    const wall1 = new THREE.Mesh(wallGeo1, matStoneRuins);
    wall1.position.set(watchpostX, watchposY + 0.9, watchpostZ);
    wall1.castShadow = true;
    westPOIGroup.add(wall1);
    colliders.push({ type: 'box', minX: watchpostX - 3.4, maxX: watchpostX + 3.4, minZ: watchpostZ - 0.7, maxZ: watchpostZ + 0.7, label: 'Dinding Pos Rusak' });

    const wallGeo2 = new THREE.BoxGeometry(1.2, 1.4, 5.0);
    const wall2 = new THREE.Mesh(wallGeo2, matStoneRuins);
    wall2.position.set(watchpostX - 2.8, watchposY + 0.7, watchpostZ + 2.5);
    wall2.castShadow = true;
    westPOIGroup.add(wall2);

    // Sisa Tiang Menara Pengawas Kayu Miring
    const ruinedPost = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 4.2, 6), matWoodDark);
    ruinedPost.position.set(watchpostX + 2.2, watchposY + 1.9, watchpostZ + 1.8);
    ruinedPost.rotation.z = 0.22;
    ruinedPost.castShadow = true;
    westPOIGroup.add(ruinedPost);

    // Reruntuhan Gerobak Kayu Patah Roda Miring
    const cartX = watchpostX + 2.0;
    const cartZ = watchpostZ - 3.2;
    const cartY = getTerrainHeight(cartX, cartZ);

    const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 2.6), matWoodRustic);
    cartBody.position.set(cartX, cartY + 0.4, cartZ);
    cartBody.rotation.set(0.12, 0.45, -0.15);
    cartBody.castShadow = true;
    westPOIGroup.add(cartBody);

    const wheelBroken = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.18, 12), matWoodRustic);
    wheelBroken.position.set(cartX - 1.1, cartY + 0.3, cartZ);
    wheelBroken.rotation.z = Math.PI / 2.3;
    westPOIGroup.add(wheelBroken);

    // Peti Kayu & Tong Terbengkalai
    const crateBroken = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), matWoodRustic);
    crateBroken.position.set(watchpostX - 1.0, watchposY + 0.4, watchpostZ - 2.0);
    crateBroken.rotation.y = 0.5;
    westPOIGroup.add(crateBroken);

    const barrelOld = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.0, 10), matWineBarrel);
    barrelOld.position.set(watchpostX + 0.5, watchposY + 0.5, watchpostZ - 2.4);
    westPOIGroup.add(barrelOld);
  }

  // ----------------------------------------------------------------------------
  // POI C: KEBUN PINUS KABUT / FOGGY PINE WOODS (X: -430, Z: -90)
  // Rumpun pinus tinggi lebat menutupi punggung bukit barat
  // ----------------------------------------------------------------------------
  const pineWoodX = -430;
  const pineWoodZ = -90;
  for (let pt = 0; pt < 7; pt++) {
    const ptx = pineWoodX + (pt % 3) * 6.5 - 6.5;
    const ptz = pineWoodZ + Math.floor(pt / 3) * 7.0 - 7.0;
    if (isDesertBiome(ptx, ptz) || !isValidDryLand(ptx, ptz, 1.5) || getDistanceToNearestRoad(ptx, ptz) < 9.5) continue;
    const pty = getTerrainHeight(ptx, ptz);

    const fPineTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.2, 5), matWoodDark);
    fPineTrunk.position.set(ptx, pty + 1.6, ptz);
    fPineTrunk.castShadow = true;
    westPOIGroup.add(fPineTrunk);

    const fPineFoliage = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.0, 5), matPineFoliage);
    fPineFoliage.position.set(ptx, pty + 5.2, ptz);
    fPineFoliage.castShadow = true;
    westPOIGroup.add(fPineFoliage);

    colliders.push({ type: 'circle', x: ptx, z: ptz, radius: 1.2, label: 'Pohon Pinus Kabut' });
  }

  envGroup.add(westPOIGroup);

  // ============================================================================
  // 8. ZONA K: PERBUKITAN KINCIR ANGIN & PONDOK GEMBALA (X: 288, Z: 137)
  // Patahkan kesan tanah datar polos dengan bukit landai Perlin Noise (tinggi 1.5 - 2.5 unit).
  // - 1 Kincir angin kayu klasik dengan kincir berputar perlahan
  // - Pondok kayu kecil dengan tumpukan jerami dan pagar ternak kayu luas
  // - Kelompok pohon oak rindang di lereng bukit
  // ============================================================================
  await checkEnvYield(70, 'Membangun Perbukitan Kincir Angin (70%)...');
  const windmillHillGroup = new THREE.Group();
  windmillHillGroup.name = 'ZoneK_WindmillHillAndShepherdCot';

  const wmCenterX = 288;
  const wmCenterZ = 137;
  const wmCanBuild = isValidDryLand(wmCenterX, wmCenterZ, 4.5) && getDistanceToNearestRoad(wmCenterX, wmCenterZ) >= 9.5;
  const wmBaseY = getTerrainHeight(wmCenterX, wmCenterZ);

  // A. Kincir Angin Kayu Klasik (Classic Wooden Windmill)
  const windmillTower = new THREE.Group();
  windmillTower.position.set(wmCenterX, wmBaseY, wmCenterZ);

  // Pondasi bawah batu cadas
  const wmStoneBase = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.4, 3.2, 12), matStoneRuins);
  wmStoneBase.position.y = 1.6;
  wmStoneBase.castShadow = true;
  windmillTower.add(wmStoneBase);

  // Menara kayu utama mengerucut ke atas
  const wmWoodTower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, 8.8, 12), matWoodRustic);
  wmWoodTower.position.y = 3.2 + 4.4;
  wmWoodTower.castShadow = true;
  windmillTower.add(wmWoodTower);

  // Atap kubah / kerucut kayu sirap
  const wmCapRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 12), matWoodDark);
  wmCapRoof.position.y = 12.0 + 1.7;
  wmCapRoof.castShadow = true;
  windmillTower.add(wmCapRoof);

  // Gandar poros kincir (Axle hub) menghadap ke depan (+Z)
  const wmAxleHub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 8), matWoodDark);
  wmAxleHub.rotation.x = Math.PI / 2;
  wmAxleHub.position.set(0, 11.2, 2.7);
  windmillTower.add(wmAxleHub);

  // Baling-baling kincir (4 Windmill Lattice Sails)
  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 11.2, 3.4);

  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });

  for (let b = 0; b < 4; b++) {
    const bRot = (b / 4) * Math.PI * 2;
    const bladeArm = new THREE.Group();
    bladeArm.rotation.z = bRot;

    // Tiang kayu kisi-kisi (Wooden spar)
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.4, 0.18), matWoodRustic);
    spar.position.y = 3.2;
    spar.castShadow = true;
    bladeArm.add(spar);

    // Kain layar kanvas putih klasik
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5.2), canvasMat);
    sail.position.set(0.65, 3.4, 0.05);
    sail.rotation.y = 0.15; // Sudut hembusan angin
    sail.castShadow = true;
    bladeArm.add(sail);

    bladesGroup.add(bladeArm);
  }

  windmillTower.add(bladesGroup);
  windmillBladesGroup = bladesGroup;

  if (wmCanBuild) {
    windmillHillGroup.add(windmillTower);
    colliders.push({ type: 'circle', x: wmCenterX, z: wmCenterZ, radius: 4.4, label: 'Menara Kincir Angin' });
  }

  // B. Pondok Kayu Kecil Gembala (Shepherd's Cottage)
  const cotX = 274;
  const cotZ = 142;
  const cotCanBuild = isValidDryLand(cotX, cotZ, 3.5) && getDistanceToNearestRoad(cotX, cotZ) >= 9.5;
  const cotY = getTerrainHeight(cotX, cotZ);

  const cottage = new THREE.Group();
  cottage.position.set(cotX, cotY, cotZ);

  // Bangunan pondok balok kayu
  const cotWalls = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 5.2), matWoodRustic);
  cotWalls.position.y = 1.8;
  cotWalls.castShadow = true;
  cottage.add(cotWalls);

  // Atap sirap gabled segitiga
  const cotRoof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.4, 4), matWoodDark);
  cotRoof.position.y = 3.6 + 1.2;
  cotRoof.rotation.y = Math.PI / 4;
  cotRoof.scale.set(1.0, 1.0, 1.35);
  cotRoof.castShadow = true;
  cottage.add(cotRoof);

  // Cerobong asap batu
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.2, 0.9), matStoneRuins);
  chimney.position.set(2.2, 2.6, -1.6);
  chimney.castShadow = true;
  cottage.add(chimney);

  // Jendela berpendar hangat
  const windowGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
    })
  );
  windowGlow.position.set(-1.2, 1.8, 2.62);
  cottage.add(windowGlow);

  const windowLight = new THREE.PointLight(0xf59e0b, 1.6, 14);
  windowLight.position.set(-1.2, 1.8, 3.2);
  cottage.add(windowLight);

  if (cotCanBuild) {
    windmillHillGroup.add(cottage);
    colliders.push({ type: 'box', minX: cotX - 3.4, maxX: cotX + 3.4, minZ: cotZ - 2.8, maxZ: cotZ + 2.8, label: 'Pondok Gembala' });
  }

  // C. Tumpukan Jerami Emas (Haystacks)
  const hayCoords = [
    { x: 281, z: 146 },
    { x: 283, z: 149 },
    { x: 281, z: 152 },
    { x: 271, z: 149 },
    { x: 269, z: 146 },
  ];
  hayCoords.forEach((hc) => {
    if (!isValidDryLand(hc.x, hc.z, 1.5) || getDistanceToNearestRoad(hc.x, hc.z) < 9.5) return;
    const hy = getTerrainHeight(hc.x, hc.z);
    const hayGroup = new THREE.Group();
    hayGroup.position.set(hc.x, hy, hc.z);

    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.3, 10), matHay);
    baseCyl.position.y = 0.65;
    baseCyl.castShadow = true;
    hayGroup.add(baseCyl);

    const topCone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.1, 10), matHay);
    topCone.position.y = 1.3 + 0.55;
    topCone.castShadow = true;
    hayGroup.add(topCone);

    windmillHillGroup.add(hayGroup);
    colliders.push({ type: 'circle', x: hc.x, z: hc.z, radius: 1.3, label: 'Tumpukan Jerami' });
  });

  // D. Pagar Ternak Kayu Luas (Livestock Corral)
  // Area persegi panjang (X: 268 s.d 282, Z: 122 s.d 136)
  const corralPosts: [number, number][] = [
    [268, 122], [273, 122], [278, 122], [282, 122],
    [282, 127], [282, 132], [282, 136],
    [278, 136], [273, 136], [268, 136],
    [268, 131], [268, 126],
  ];
  for (let i = 0; i < corralPosts.length; i++) {
    const [px, pz] = corralPosts[i];
    if (!isValidDryLand(px, pz, 1.0) || getDistanceToNearestRoad(px, pz) < 9.5) continue;
    const py = getTerrainHeight(px, pz);

    // Tiang pagar
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 6), matWoodRustic);
    post.position.set(px, py + 0.75, pz);
    post.castShadow = true;
    windmillHillGroup.add(post);

    // Rel horizontal antar tiang (kecuali celah gerbang [273, 136] ke [278, 136])
    const nextIdx = (i + 1) % corralPosts.length;
    if (i !== 8) {
      const [nx, nz] = corralPosts[nextIdx];
      const midX = (px + nx) * 0.5;
      const midZ = (pz + nz) * 0.5;
      const midY = (py + getTerrainHeight(nx, nz)) * 0.5;
      const dist = Math.hypot(nx - px, nz - pz);
      const angle = Math.atan2(nx - px, nz - pz);

      for (let r = 0; r < 2; r++) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, dist), matWoodRustic);
        rail.position.set(midX, midY + (r === 0 ? 0.55 : 1.1), midZ);
        rail.rotation.y = angle;
        rail.castShadow = true;
        windmillHillGroup.add(rail);
      }
    }
  }

  // 2 Domba Putih di dalam Pagar Ternak
  const sheepCoords = [
    { x: 273, z: 128, rot: 0.8 },
    { x: 277, z: 131, rot: -1.2 },
  ];
  sheepCoords.forEach((sc) => {
    if (!isValidDryLand(sc.x, sc.z, 1.0) || getDistanceToNearestRoad(sc.x, sc.z) < 9.5) return;
    const sy = getTerrainHeight(sc.x, sc.z);
    const sheep = new THREE.Group();
    sheep.position.set(sc.x, sy, sc.z);
    sheep.rotation.y = sc.rot;

    // Badan domba berbulu putih
    const woolBody = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 1), matBone);
    woolBody.position.y = 0.75;
    woolBody.scale.set(1.2, 0.9, 0.9);
    woolBody.castShadow = true;
    sheep.add(woolBody);

    // Kepala domba
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), matWoodDark);
    head.position.set(0.85, 0.95, 0);
    sheep.add(head);

    // 4 Kaki domba
    [[-0.45, -0.28], [-0.45, 0.28], [0.45, -0.28], [0.45, 0.28]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5), matWoodDark);
      leg.position.set(lx, 0.3, lz);
      sheep.add(leg);
    });

    windmillHillGroup.add(sheep);
  });

  // E. Kelompok Pohon Oak Rindang di Lereng Bukit (Shady Oak Grove)
  const oakHillCoords: [number, number][] = [
    [298, 126],
    [306, 138],
    [296, 152],
    [276, 155],
    [265, 132],
    [282, 118],
    [310, 128],
  ];
  oakHillCoords.forEach(([ox, oz], oIdx) => {
    if (!isValidDryLand(ox, oz, 1.5) || getDistanceToNearestRoad(ox, oz) < 9.5) return;
    const oy = getTerrainHeight(ox, oz);
    const oak = new THREE.Group();
    oak.position.set(ox, oy, oz);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.65, 3.6, 7), matWoodRustic);
    trunk.position.y = 1.8;
    trunk.castShadow = true;
    oak.add(trunk);

    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8 + (oIdx % 3) * 0.4, 1), matOakFoliage);
    crown.position.y = 4.8;
    crown.scale.set(1.2, 0.95, 1.2);
    crown.castShadow = true;
    oak.add(crown);

    windmillHillGroup.add(oak);
    colliders.push({ type: 'circle', x: ox, z: oz, radius: 1.4, label: `Pohon Oak Lereng Kincir ${oIdx + 1}` });
  });

  envGroup.add(windmillHillGroup);

  // ============================================================================
  // 8. DISTRIBUSI VEGETASI ALAMI MASIF MENGGUNAKAN THREE.InstancedMesh (60 FPS)
  // Jittered Grid Sampling O(N) 1x Lewat Saja - Anti-Lag & Bebas Page Unresponsive
  // Sub-tahap: 50% Oak -> 53% Cemara -> 56% Bebatuan -> 60% Rumput -> 64% Semak & Pantai
  // Otomatis berskala dengan spesifikasi perangkat (Low / Medium / High Tier)
  // ============================================================================
  const dummy = new THREE.Object3D();
  const deviceProfile = getDeviceProfile();
  const propScale = deviceProfile.propDensityScale;

  const spatialGrid = SpatialLookupGrid.get();
  if (!spatialGrid.isBuilt) {
    await spatialGrid.buildAsync(getTerrainHeight, (pct, status) => {
      onProgress?.(68 + Math.round((pct / 100) * 2), status);
    });
  }

  function isNearBridge(x: number, z: number, dist = 16.0): boolean {
    for (const b of BRIDGE_CONFIGS) {
      if (Math.hypot(x - b.x, z - b.z) < dist + b.length * 0.5) return true;
    }
    return false;
  }

  function isNearBossArena(x: number, z: number, dist = 55.0): boolean {
    // 1. Boss Sandworm (Kawah Pusaran Solaria - Jarrus)
    if (Math.hypot(x - (-840), z - (-260)) < Math.max(dist, 82.0)) return true;
    // 2. Boss Titan (Arena Colosseum Reruntuhan Batu)
    const titanLayout = getLandmarkLayout('bossGolem') || getLandmarkLayout('kawah_boss');
    const tX = titanLayout?.x ?? 180;
    const tZ = titanLayout?.z ?? -560;
    if (Math.hypot(x - tX, z - tZ) < dist) return true;
    // 3. Boss Dragon Ignis (Kepulauan Kaldera Naga)
    if (Math.hypot(x - 40, z - 840) < dist) return true;
    return false;
  }

  // Helper penggabung geometri sederhana (0 dependensi eksternal) untuk rumpun rumput/bunga/cemara salju instanced
  function mergeSimpleGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const nonIndexed = geos.map((g) => {
      const ni = g.index ? g.toNonIndexed() : g.clone();
      if (!ni.getAttribute('normal')) ni.computeVertexNormals();
      return ni;
    });
    let totalVerts = 0;
    for (const g of nonIndexed) {
      totalVerts += g.getAttribute('position').count;
    }
    const posArr = new Float32Array(totalVerts * 3);
    const normArr = new Float32Array(totalVerts * 3);
    let vOffset = 0;
    for (const g of nonIndexed) {
      const p = g.getAttribute('position');
      const n = g.getAttribute('normal');
      for (let i = 0; i < p.count; i++) {
        posArr[(vOffset + i) * 3] = p.getX(i);
        posArr[(vOffset + i) * 3 + 1] = p.getY(i);
        posArr[(vOffset + i) * 3 + 2] = p.getZ(i);
        if (n) {
          normArr[(vOffset + i) * 3] = n.getX(i);
          normArr[(vOffset + i) * 3 + 1] = n.getY(i);
          normArr[(vOffset + i) * 3 + 2] = n.getZ(i);
        }
      }
      vOffset += p.count;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
    merged.computeBoundingSphere();
    return merged;
  }

  // GPU Vertex-Shader Wind Sway (0% CPU loop overhead) untuk rumput & bunga instanced
  const windUniforms = { uWindTime: { value: 0 } };
  function applyGrassWindShader(mat: THREE.MeshStandardMaterial, amplitude = 0.16) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = windUniforms.uWindTime;
      shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 windInstPos = vec4(0.0, 0.0, 0.0, 1.0);
        #ifdef USE_INSTANCING
          windInstPos = instanceMatrix * vec4(transformed, 1.0);
        #else
          windInstPos = vec4(transformed, 1.0);
        #endif
        float bendFactor = clamp(position.y, 0.0, 1.2);
        float breeze = sin(uWindTime * 2.1 + windInstPos.x * 0.19 + windInstPos.z * 0.16) * 0.72
                     + cos(uWindTime * 3.4 - windInstPos.x * 0.31) * 0.28;
        transformed.x += breeze * ${amplitude.toFixed(3)} * bendFactor * bendFactor;
        transformed.z += breeze * ${(amplitude * 0.65).toFixed(3)} * bendFactor * bendFactor;`
      );
    };
    mat.customProgramCacheKey = () => `eldoria_wind_${amplitude}`;
  }

  const OAK_COUNT = Math.max(100, Math.round(1250 * propScale));
  const oakTrunkGeo = new THREE.CylinderGeometry(0.32, 0.46, 2.6, 6);
  oakTrunkGeo.translate(0, 1.3, 0);
  const oakCrownGeo = new THREE.DodecahedronGeometry(2.1, 0);
  oakCrownGeo.translate(0, 3.8, 0);

  const PINE_COUNT = Math.max(100, Math.round(900 * propScale));
  const pineTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 5);
  pineTrunkGeo.translate(0, 1.1, 0);
  const pineConeGeo1 = new THREE.ConeGeometry(1.5, 2.2, 5);
  pineConeGeo1.translate(0, 2.4, 0);
  const pineConeGeo2 = new THREE.ConeGeometry(1.2, 1.9, 5);
  pineConeGeo2.translate(0, 3.6, 0);
  const pineConeGeo3 = new THREE.ConeGeometry(0.85, 1.6, 5);
  pineConeGeo3.translate(0, 4.6, 0);

  // Pinus Salju Utara Instanced (3-tier dark spruce + white snow caps di zona snowWeight > 0.45)
  const SNOW_PINE_COUNT = Math.max(80, Math.round(520 * propScale));
  const snowPineTrunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 2.6, 5);
  snowPineTrunkGeo.translate(0, 1.3, 0);
  const snowPineFoliageGeo = mergeSimpleGeometries([
    (() => { const g = new THREE.ConeGeometry(2.05, 2.6, 6); g.translate(0, 2.9, 0); return g; })(),
    (() => { const g = new THREE.ConeGeometry(1.55, 2.2, 6); g.translate(0, 4.3, 0); return g; })(),
    (() => { const g = new THREE.ConeGeometry(1.05, 1.8, 6); g.translate(0, 5.5, 0); return g; })(),
  ]);
  const snowPineCapGeo = mergeSimpleGeometries([
    (() => { const g = new THREE.ConeGeometry(1.42, 1.45, 6); g.translate(0, 3.55, 0); return g; })(),
    (() => { const g = new THREE.ConeGeometry(1.08, 1.25, 6); g.translate(0, 4.85, 0); return g; })(),
    (() => { const g = new THREE.ConeGeometry(0.74, 1.05, 6); g.translate(0, 5.95, 0); return g; })(),
  ]);
  const matSnowPineFoliage = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85, flatShading: true });
  const matSnowPineCap = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.62, flatShading: true });

  const BOULDER_COUNT = Math.max(100, Math.round(920 * propScale));
  const boulderGeo = new THREE.DodecahedronGeometry(1.0, 0);

  const SNOW_BOULDER_COUNT = Math.max(40, Math.round(280 * propScale));
  const matSnowBoulder = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.48,
    metalness: 0.15,
    flatShading: true,
  });

  // Rumpun Rumput 3-Helai Bersilang (Wind-Swaying Instanced Tuft Cluster)
  const PLAINS_GRASS_COUNT = Math.max(250, Math.round(4800 * propScale));
  const buildCrossedGrassTuftGeo = (height = 0.88, width = 0.36): THREE.BufferGeometry => {
    const blades: THREE.BufferGeometry[] = [];
    for (let b = 0; b < 3; b++) {
      const ang = (b * Math.PI) / 3;
      const g = new THREE.ConeGeometry(width * 0.55, height, 3);
      g.translate(0, height * 0.5, 0);
      g.rotateZ((b === 0 ? 0.16 : b === 1 ? -0.14 : 0.08));
      g.rotateY(ang);
      g.translate(Math.cos(ang) * 0.14, 0, Math.sin(ang) * 0.14);
      blades.push(g);
    }
    return mergeSimpleGeometries(blades);
  };
  const plainsGrassGeo = buildCrossedGrassTuftGeo(0.88, 0.36);
  const matPlainsGrass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.04,
    flatShading: true,
  });
  applyGrassWindShader(matPlainsGrass, 0.16);
  const plainsGrassPalette = [
    new THREE.Color(0x4d9a3d),
    new THREE.Color(0x62b446),
    new THREE.Color(0x76bf49),
    new THREE.Color(0x3f7d32),
  ];

  // Bunga Liar Berwarna-Warni Instanced (Kuning, Putih, Biru Muda, Merah Muda)
  const WILDFLOWER_COUNT = Math.max(120, Math.round(1450 * propScale));
  const wildflowerGeo = mergeSimpleGeometries([
    (() => { const g = new THREE.CylinderGeometry(0.03, 0.04, 0.45, 4); g.translate(0, 0.22, 0); return g; })(),
    (() => { const g = new THREE.DodecahedronGeometry(0.16, 0); g.scale(1.1, 0.65, 1.1); g.translate(0, 0.48, 0); return g; })(),
    (() => { const g = new THREE.DodecahedronGeometry(0.13, 0); g.scale(1.1, 0.65, 1.1); g.translate(0.22, 0.38, 0.14); return g; })(),
    (() => { const g = new THREE.DodecahedronGeometry(0.12, 0); g.scale(1.1, 0.65, 1.1); g.translate(-0.18, 0.34, -0.16); return g; })(),
  ]);
  const matWildflowerCluster = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.04,
    flatShading: true,
  });
  applyGrassWindShader(matWildflowerCluster, 0.14);
  const wildflowerPalette = [
    new THREE.Color(0xfacc15), // Kuning keemasan
    new THREE.Color(0xf8fafc), // Putih aster
    new THREE.Color(0x60a5fa), // Biru langit
    new THREE.Color(0xf472b6), // Merah muda liar
  ];

  // Semak Berry & Kayu Tumbang Alami (Lembah & Perbukitan)
  const SHRUB_COUNT = Math.max(80, Math.round(880 * propScale));
  const shrubGeo = new THREE.DodecahedronGeometry(0.65, 0);

  const BERRY_BUSH_COUNT = Math.max(50, Math.round(520 * propScale));
  const berryBushGeo = mergeSimpleGeometries([
    (() => { const g = new THREE.DodecahedronGeometry(0.58, 0); g.translate(0, 0.42, 0); return g; })(),
    (() => { const g = new THREE.DodecahedronGeometry(0.42, 0); g.translate(0.38, 0.32, 0.2); return g; })(),
    (() => { const g = new THREE.DodecahedronGeometry(0.36, 0); g.translate(-0.34, 0.28, -0.18); return g; })(),
  ]);
  const matBerryBush = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    flatShading: true,
  });
  const berryBushPalette = [
    new THREE.Color(0x2f6b2f),
    new THREE.Color(0x3f7d2c),
    new THREE.Color(0x882d3f),
    new THREE.Color(0x36693a),
  ];

  const FALLEN_LOG_COUNT = Math.max(30, Math.round(240 * propScale));
  const fallenLogGeo = (() => {
    const trunk = new THREE.CylinderGeometry(0.28, 0.38, 3.6, 6);
    trunk.rotateZ(Math.PI / 2);
    trunk.translate(0, 0.26, 0);
    const stub = new THREE.CylinderGeometry(0.10, 0.16, 1.0, 5);
    stub.rotateZ(0.45);
    stub.translate(0.7, 0.65, 0.12);
    return mergeSimpleGeometries([trunk, stub]);
  })();

  // Flora Gurun Solaria Instanced: Rumpun Rumput Kering & Singkapan Sandstone Berlapis
  const DESERT_GRASS_COUNT = Math.max(100, Math.round(1450 * propScale));
  const desertGrassGeo = buildCrossedGrassTuftGeo(0.74, 0.32);
  const matDesertGrass = new THREE.MeshStandardMaterial({
    color: 0xc2a45c,
    roughness: 0.9,
    flatShading: true,
  });
  applyGrassWindShader(matDesertGrass, 0.12);

  const DESERT_ROCK_COUNT = Math.max(60, Math.round(440 * propScale));
  const desertRockGeo = mergeSimpleGeometries([
    (() => { const g = new THREE.DodecahedronGeometry(1.15, 0); g.scale(1.4, 0.55, 1.15); g.translate(0, 0.45, 0); return g; })(),
    (() => { const g = new THREE.DodecahedronGeometry(0.85, 0); g.scale(1.2, 0.45, 0.95); g.translate(0.3, 0.95, -0.15); return g; })(),
  ]);
  const matDesertOutcrop = new THREE.MeshStandardMaterial({
    color: 0xc68646,
    roughness: 0.9,
    flatShading: true,
  });

  const REEF_STONE_COUNT = Math.max(20, Math.round(60 * propScale));
  const reefStoneGeo = new THREE.DodecahedronGeometry(0.85, 0);

  const BEACH_GRASS_COUNT = Math.max(25, Math.round(80 * propScale));
  const beachGrassGeo = new THREE.ConeGeometry(0.45, 0.9, 4);

  const cachedProps = cachedWorld?.propMatrices;
  const hasAllCachedProps = Boolean(
    cachedProps &&
      cachedProps.oak instanceof Float32Array &&
      cachedProps.pine instanceof Float32Array &&
      cachedProps.snowPine instanceof Float32Array &&
      cachedProps.boulder instanceof Float32Array &&
      cachedProps.snowBoulder instanceof Float32Array &&
      cachedProps.plainsGrass instanceof Float32Array &&
      cachedProps.wildflower instanceof Float32Array &&
      cachedProps.shrub instanceof Float32Array &&
      cachedProps.berryBush instanceof Float32Array &&
      cachedProps.fallenLog instanceof Float32Array &&
      cachedProps.desertGrass instanceof Float32Array &&
      cachedProps.desertRock instanceof Float32Array &&
      cachedProps.reefStone instanceof Float32Array &&
      cachedProps.beachGrass instanceof Float32Array
  );

  const restoreInstancedLayer = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    matrices: Float32Array,
    palette?: THREE.Color[]
  ): THREE.InstancedMesh => {
    const count = Math.floor(matrices.length / 16);
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
    mesh.count = count;
    if (count > 0) {
      (mesh.instanceMatrix.array as Float32Array).set(matrices.subarray(0, count * 16));
      mesh.instanceMatrix.needsUpdate = true;
      if (palette && palette.length > 0) {
        for (let i = 0; i < count; i++) {
          mesh.setColorAt(i, palette[(i * 7 + (i >> 2)) % palette.length]);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    mesh.computeBoundingSphere();
    return mesh;
  };

  let oakTrunkMesh: THREE.InstancedMesh;
  let oakCrownMesh: THREE.InstancedMesh;
  let pineTrunkMesh: THREE.InstancedMesh;
  let pineFoliageMesh1: THREE.InstancedMesh;
  let pineFoliageMesh2: THREE.InstancedMesh;
  let pineFoliageMesh3: THREE.InstancedMesh;
  let snowPineTrunkMesh: THREE.InstancedMesh;
  let snowPineFoliageMesh: THREE.InstancedMesh;
  let snowPineSnowCapMesh: THREE.InstancedMesh;
  let boulderMesh: THREE.InstancedMesh;
  let snowBoulderMesh: THREE.InstancedMesh;
  let plainsGrassMesh: THREE.InstancedMesh;
  let wildflowerMesh: THREE.InstancedMesh;
  let shrubMesh: THREE.InstancedMesh;
  let berryBushMesh: THREE.InstancedMesh;
  let fallenLogMesh: THREE.InstancedMesh;
  let desertGrassMesh: THREE.InstancedMesh;
  let desertRockMesh: THREE.InstancedMesh;
  let reefStoneMesh: THREE.InstancedMesh;
  let beachGrassMesh: THREE.InstancedMesh;
  let capturedPropMatrices: Record<string, Float32Array> | undefined;

  if (hasAllCachedProps && cachedProps) {
    // FAST PATH: Bulk-assign seluruh matriks InstancedMesh dari IndexedDB tanpa sleep dalam loop (cukup 1 rAF)
    onProgress?.(72, 'Memuat dunia dari Cache Browser (Mode Cepat)...');

    oakTrunkMesh = restoreInstancedLayer(oakTrunkGeo, matWoodRustic, cachedProps.oak);
    oakCrownMesh = restoreInstancedLayer(oakCrownGeo, matOakFoliage, cachedProps.oak);
    pineTrunkMesh = restoreInstancedLayer(pineTrunkGeo, matWoodRustic, cachedProps.pine);
    pineFoliageMesh1 = restoreInstancedLayer(pineConeGeo1, matPineFoliage, cachedProps.pine);
    pineFoliageMesh2 = restoreInstancedLayer(pineConeGeo2, matPineFoliage, cachedProps.pine);
    pineFoliageMesh3 = restoreInstancedLayer(pineConeGeo3, matPineFoliage, cachedProps.pine);
    snowPineTrunkMesh = restoreInstancedLayer(snowPineTrunkGeo, matWoodDark, cachedProps.snowPine);
    snowPineFoliageMesh = restoreInstancedLayer(snowPineFoliageGeo, matSnowPineFoliage, cachedProps.snowPine);
    snowPineSnowCapMesh = restoreInstancedLayer(snowPineCapGeo, matSnowPineCap, cachedProps.snowPine);
    boulderMesh = restoreInstancedLayer(boulderGeo, matBoulder, cachedProps.boulder);
    snowBoulderMesh = restoreInstancedLayer(boulderGeo, matSnowBoulder, cachedProps.snowBoulder);
    plainsGrassMesh = restoreInstancedLayer(plainsGrassGeo, matPlainsGrass, cachedProps.plainsGrass, plainsGrassPalette);
    wildflowerMesh = restoreInstancedLayer(wildflowerGeo, matWildflowerCluster, cachedProps.wildflower, wildflowerPalette);
    shrubMesh = restoreInstancedLayer(shrubGeo, matShrub, cachedProps.shrub);
    berryBushMesh = restoreInstancedLayer(berryBushGeo, matBerryBush, cachedProps.berryBush, berryBushPalette);
    fallenLogMesh = restoreInstancedLayer(fallenLogGeo, matWoodDark, cachedProps.fallenLog);
    desertGrassMesh = restoreInstancedLayer(desertGrassGeo, matDesertGrass, cachedProps.desertGrass);
    desertRockMesh = restoreInstancedLayer(desertRockGeo, matDesertOutcrop, cachedProps.desertRock);
    reefStoneMesh = restoreInstancedLayer(reefStoneGeo, matWetSeaRock, cachedProps.reefStone);
    beachGrassMesh = restoreInstancedLayer(beachGrassGeo, matBeachGrass, cachedProps.beachGrass);

    envGroup.add(
      oakTrunkMesh,
      oakCrownMesh,
      pineTrunkMesh,
      pineFoliageMesh1,
      pineFoliageMesh2,
      pineFoliageMesh3,
      snowPineTrunkMesh,
      snowPineFoliageMesh,
      snowPineSnowCapMesh,
      boulderMesh,
      snowBoulderMesh,
      plainsGrassMesh,
      wildflowerMesh,
      shrubMesh,
      berryBushMesh,
      fallenLogMesh,
      desertGrassMesh,
      desertRockMesh,
      reefStoneMesh,
      beachGrassMesh
    );

    capturedPropMatrices = cachedProps;
    onProgress?.(75, 'Memuat dunia dari Cache Browser (Mode Cepat)...');
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  } else {
    // 1. SUB-TAHAP 71%: POHON OAK RINDANG DI BUKIT & LEMBAH HIJAU (BERSKALA PERANGKAT)
    onProgress?.(71, 'Menanam Pohon Oak & Hutan Salju Utara (InstancedMesh 71%)...');
    oakTrunkMesh = new THREE.InstancedMesh(oakTrunkGeo, matWoodRustic, OAK_COUNT);
    oakCrownMesh = new THREE.InstancedMesh(oakCrownGeo, matOakFoliage, OAK_COUNT);

    let oakAssigned = 0;
    const oakStep = 18;
    for (let x = -640; x < 860 && oakAssigned < OAK_COUNT; x += oakStep) {
      for (let z = -760; z < 210 && oakAssigned < OAK_COUNT; z += oakStep) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        const ox = x + (0.15 + Math.random() * 0.7) * oakStep;
        const oz = z + (0.15 + Math.random() * 0.7) * oakStep;

        if (getSnowWeight(ox, oz) > 0.35 || isFarOcean(ox, oz) || spatialGrid.isBlocked(ox, oz) || spatialGrid.isDesert(ox, oz) || spatialGrid.isOcean(ox, oz) || isNearBridge(ox, oz) || isNearBossArena(ox, oz) || !isValidDryLand(ox, oz, 1.5) || getDistanceToNearestRoad(ox, oz) < 9.5) continue;
        const oy = getTerrainHeight(ox, oz);
        if (oy < 0.25 || oy > 22.0) continue;

        const s = 0.8 + Math.random() * 0.55;
        dummy.position.set(ox, oy, oz);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.set(s, s * 1.05, s);
        dummy.updateMatrix();

        oakTrunkMesh.setMatrixAt(oakAssigned, dummy.matrix);
        oakCrownMesh.setMatrixAt(oakAssigned, dummy.matrix);
        oakAssigned++;
      }
    }
    oakTrunkMesh.count = oakAssigned;
    oakCrownMesh.count = oakAssigned;
    oakTrunkMesh.instanceMatrix.needsUpdate = true;
    oakCrownMesh.instanceMatrix.needsUpdate = true;
    oakTrunkMesh.computeBoundingSphere();
    oakCrownMesh.computeBoundingSphere();
    envGroup.add(oakTrunkMesh, oakCrownMesh);
    await checkEnvYield();

    // 2. SUB-TAHAP 72%: POHON CEMARA HIJAU & HUTAN PINUS BERSALJU UTARA
    onProgress?.(72, 'Menanam Cemara Bukit & Hutan Pinus Salju (InstancedMesh 72%)...');
    pineTrunkMesh = new THREE.InstancedMesh(pineTrunkGeo, matWoodRustic, PINE_COUNT);
    pineFoliageMesh1 = new THREE.InstancedMesh(pineConeGeo1, matPineFoliage, PINE_COUNT);
    pineFoliageMesh2 = new THREE.InstancedMesh(pineConeGeo2, matPineFoliage, PINE_COUNT);
    pineFoliageMesh3 = new THREE.InstancedMesh(pineConeGeo3, matPineFoliage, PINE_COUNT);

    let pineAssigned = 0;
    const pineStep = 18;
    for (let x = -640; x < 860 && pineAssigned < PINE_COUNT; x += pineStep) {
      for (let z = -760; z < 210 && pineAssigned < PINE_COUNT; z += pineStep) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        const px = x + (0.15 + Math.random() * 0.7) * pineStep;
        const pz = z + (0.15 + Math.random() * 0.7) * pineStep;

        if (getSnowWeight(px, pz) > 0.45 || isFarOcean(px, pz) || spatialGrid.isBlocked(px, pz) || spatialGrid.isDesert(px, pz) || spatialGrid.isOcean(px, pz) || isNearBridge(px, pz) || isNearBossArena(px, pz) || !isValidDryLand(px, pz, 1.5) || getDistanceToNearestRoad(px, pz) < 9.5) continue;
        const py = getTerrainHeight(px, pz);
        if (py < 0.25 || py > 22.0) continue;

        const s = 0.8 + Math.random() * 0.55;
        dummy.position.set(px, py, pz);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();

        pineTrunkMesh.setMatrixAt(pineAssigned, dummy.matrix);
        pineFoliageMesh1.setMatrixAt(pineAssigned, dummy.matrix);
        pineFoliageMesh2.setMatrixAt(pineAssigned, dummy.matrix);
        pineFoliageMesh3.setMatrixAt(pineAssigned, dummy.matrix);
        pineAssigned++;
      }
    }
    pineTrunkMesh.count = pineAssigned;
    pineFoliageMesh1.count = pineAssigned;
    pineFoliageMesh2.count = pineAssigned;
    pineFoliageMesh3.count = pineAssigned;
    pineTrunkMesh.instanceMatrix.needsUpdate = true;
    pineFoliageMesh1.instanceMatrix.needsUpdate = true;
    pineFoliageMesh2.instanceMatrix.needsUpdate = true;
    pineFoliageMesh3.instanceMatrix.needsUpdate = true;
    pineTrunkMesh.computeBoundingSphere();
    pineFoliageMesh1.computeBoundingSphere();
    pineFoliageMesh2.computeBoundingSphere();
    pineFoliageMesh3.computeBoundingSphere();
    envGroup.add(pineTrunkMesh, pineFoliageMesh1, pineFoliageMesh2, pineFoliageMesh3);

    // Pinus Salju Bertingkat Khusus Bioma Salju Utara (getSnowWeight > 0.45)
    snowPineTrunkMesh = new THREE.InstancedMesh(snowPineTrunkGeo, matWoodDark, SNOW_PINE_COUNT);
    snowPineFoliageMesh = new THREE.InstancedMesh(snowPineFoliageGeo, matSnowPineFoliage, SNOW_PINE_COUNT);
    snowPineSnowCapMesh = new THREE.InstancedMesh(snowPineCapGeo, matSnowPineCap, SNOW_PINE_COUNT);
    let spAssigned = 0;
    const spStep = 14;
    for (let x = -280; x <= 320 && spAssigned < SNOW_PINE_COUNT; x += spStep) {
      for (let z = -980; z <= -640 && spAssigned < SNOW_PINE_COUNT; z += spStep) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        const sx = x + (0.15 + Math.random() * 0.7) * spStep;
        const sz = z + (0.15 + Math.random() * 0.7) * spStep;
        if (getSnowWeight(sx, sz) <= 0.45) continue;
        if (Math.hypot(sx - 60, sz - -820) < 64) continue; // Tepi danau
        if (Math.hypot(sx - 180, sz - -560) < 88) continue; // Colosseum
        if (isFarOcean(sx, sz) || spatialGrid.isOcean(sx, sz) || spatialGrid.isNearRiver(sx, sz) || !isValidDryLand(sx, sz, 1.5) || getDistanceToNearestRoad(sx, sz) < 10.0) continue;
        const sy = getTerrainHeight(sx, sz);
        if (sy < 0.35 || sy > 26.0) continue;

        const sc = 0.85 + Math.random() * 0.6;
        dummy.position.set(sx, sy, sz);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.set(sc, sc * (0.95 + Math.random() * 0.25), sc);
        dummy.updateMatrix();
        snowPineTrunkMesh.setMatrixAt(spAssigned, dummy.matrix);
        snowPineFoliageMesh.setMatrixAt(spAssigned, dummy.matrix);
        snowPineSnowCapMesh.setMatrixAt(spAssigned, dummy.matrix);
        spAssigned++;
      }
    }
    snowPineTrunkMesh.count = spAssigned;
    snowPineFoliageMesh.count = spAssigned;
    snowPineSnowCapMesh.count = spAssigned;
    snowPineTrunkMesh.instanceMatrix.needsUpdate = true;
    snowPineFoliageMesh.instanceMatrix.needsUpdate = true;
    snowPineSnowCapMesh.instanceMatrix.needsUpdate = true;
    snowPineTrunkMesh.computeBoundingSphere();
    snowPineFoliageMesh.computeBoundingSphere();
    snowPineSnowCapMesh.computeBoundingSphere();
    envGroup.add(snowPineTrunkMesh, snowPineFoliageMesh, snowPineSnowCapMesh);
    await checkEnvYield();

    // 3. SUB-TAHAP 73%: BEBATUAN GRANIT, KAYU TUMBANG & BATU SALJU/ES
    onProgress?.(73, 'Membentuk Bebatuan Lembah & Formasi Batu Es (InstancedMesh 73%)...');
    boulderMesh = new THREE.InstancedMesh(boulderGeo, matBoulder, BOULDER_COUNT);
    snowBoulderMesh = new THREE.InstancedMesh(boulderGeo, matSnowBoulder, SNOW_BOULDER_COUNT);
    fallenLogMesh = new THREE.InstancedMesh(fallenLogGeo, matWoodDark, FALLEN_LOG_COUNT);

    let boulderAssigned = 0;
    let sbAssigned = 0;
    let logAssigned = 0;
    const boulderStep = 20;
    for (let x = -560; x < 840; x += boulderStep) {
      for (let z = -940; z < 210; z += boulderStep) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        const bx = x + (0.15 + Math.random() * 0.7) * boulderStep;
        const bz = z + (0.15 + Math.random() * 0.7) * boulderStep;

        if (isFarOcean(bx, bz) || spatialGrid.isBlocked(bx, bz) || spatialGrid.isDesert(bx, bz) || spatialGrid.isOcean(bx, bz) || isNearBridge(bx, bz) || isNearBossArena(bx, bz) || !isValidDryLand(bx, bz, 1.5) || getDistanceToNearestRoad(bx, bz) < 9.5) continue;
        const by = getTerrainHeight(bx, bz);
        if (by < 0.25 || by > 24.0) continue;

        const sw = getSnowWeight(bx, bz);
        if (sw > 0.35 && sbAssigned < SNOW_BOULDER_COUNT) {
          const scale = 0.75 + Math.random() * 0.9;
          dummy.position.set(bx, by + scale * 0.35, bz);
          dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          dummy.scale.set(scale * 1.1, scale * 0.85, scale);
          dummy.updateMatrix();
          snowBoulderMesh.setMatrixAt(sbAssigned, dummy.matrix);
          sbAssigned++;
        } else if (sw <= 0.35 && boulderAssigned < BOULDER_COUNT && Math.random() > 0.32) {
          const scale = 0.7 + Math.random() * 0.8;
          const scaleY = scale * (0.72 + Math.random() * 0.45);
          dummy.position.set(bx, by + scaleY * 0.35, bz);
          dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          dummy.scale.set(scale, scaleY, scale);
          dummy.updateMatrix();
          boulderMesh.setMatrixAt(boulderAssigned, dummy.matrix);
          boulderAssigned++;
        } else if (sw < 0.2 && logAssigned < FALLEN_LOG_COUNT && Math.random() > 0.72) {
          const lScale = 0.8 + Math.random() * 0.55;
          dummy.position.set(bx, by - 0.05, bz);
          dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
          dummy.scale.set(lScale, lScale, lScale);
          dummy.updateMatrix();
          fallenLogMesh.setMatrixAt(logAssigned, dummy.matrix);
          logAssigned++;
        }
      }
    }
    boulderMesh.count = boulderAssigned;
    snowBoulderMesh.count = sbAssigned;
    fallenLogMesh.count = logAssigned;
    boulderMesh.instanceMatrix.needsUpdate = true;
    snowBoulderMesh.instanceMatrix.needsUpdate = true;
    fallenLogMesh.instanceMatrix.needsUpdate = true;
    boulderMesh.computeBoundingSphere();
    snowBoulderMesh.computeBoundingSphere();
    fallenLogMesh.computeBoundingSphere();
    envGroup.add(boulderMesh, snowBoulderMesh, fallenLogMesh);
    await checkEnvYield();

    // 4. SUB-TAHAP 74%: PADANG RUMPUT BERGOYANG ANGIN & BUNGA LIAR BERWARNA-WARNI
    onProgress?.(74, 'Menumbuhkan Rumput Bergoyang & Taman Bunga Liar (InstancedMesh 74%)...');
    plainsGrassMesh = new THREE.InstancedMesh(plainsGrassGeo, matPlainsGrass, PLAINS_GRASS_COUNT);
    wildflowerMesh = new THREE.InstancedMesh(wildflowerGeo, matWildflowerCluster, WILDFLOWER_COUNT);

    let pgAssigned = 0;
    let wfAssigned = 0;
    const grassStep = 8.5;
    for (let x = -640; x < 860 && (pgAssigned < PLAINS_GRASS_COUNT || wfAssigned < WILDFLOWER_COUNT); x += grassStep) {
      for (let z = -760; z < 210 && (pgAssigned < PLAINS_GRASS_COUNT || wfAssigned < WILDFLOWER_COUNT); z += grassStep) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        const gx = x + (0.1 + Math.random() * 0.8) * grassStep;
        const gz = z + (0.1 + Math.random() * 0.8) * grassStep;

        if (getSnowWeight(gx, gz) > 0.30 || isFarOcean(gx, gz) || spatialGrid.isBlocked(gx, gz) || spatialGrid.isDesert(gx, gz) || spatialGrid.isOcean(gx, gz) || isNearBridge(gx, gz) || isNearBossArena(gx, gz) || !isValidDryLand(gx, gz, 0.9) || getDistanceToNearestRoad(gx, gz) < 7.8) continue;
        const gy = getTerrainHeight(gx, gz);
        if (gy < 0.3 || gy > 22.0) continue;

        if (pgAssigned < PLAINS_GRASS_COUNT) {
          const s = 0.72 + Math.random() * 0.72;
          dummy.position.set(gx, gy - 0.04, gz);
          dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.14);
          dummy.scale.set(s, s * (0.85 + Math.random() * 0.4), s);
          dummy.updateMatrix();
          plainsGrassMesh.setMatrixAt(pgAssigned, dummy.matrix);
          plainsGrassMesh.setColorAt(pgAssigned, plainsGrassPalette[(pgAssigned * 7 + (pgAssigned >> 2)) % plainsGrassPalette.length]);
          pgAssigned++;
        }

        // Bunga liar tumbuh alami mengelompok di padang rumput & lembah
        if (wfAssigned < WILDFLOWER_COUNT && (Math.sin(gx * 0.045) + Math.cos(gz * 0.045) > 0.35 || Math.random() > 0.82)) {
          const fs = 0.85 + Math.random() * 0.55;
          dummy.position.set(gx + (Math.random() - 0.5) * 1.4, gy - 0.02, gz + (Math.random() - 0.5) * 1.4);
          dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
          dummy.scale.set(fs, fs, fs);
          dummy.updateMatrix();
          wildflowerMesh.setMatrixAt(wfAssigned, dummy.matrix);
          wildflowerMesh.setColorAt(wfAssigned, wildflowerPalette[(wfAssigned * 7 + (wfAssigned >> 2)) % wildflowerPalette.length]);
          wfAssigned++;
        }
      }
    }
    plainsGrassMesh.count = pgAssigned;
    wildflowerMesh.count = wfAssigned;
    plainsGrassMesh.instanceMatrix.needsUpdate = true;
    wildflowerMesh.instanceMatrix.needsUpdate = true;
    if (plainsGrassMesh.instanceColor) plainsGrassMesh.instanceColor.needsUpdate = true;
    if (wildflowerMesh.instanceColor) wildflowerMesh.instanceColor.needsUpdate = true;
    plainsGrassMesh.computeBoundingSphere();
    wildflowerMesh.computeBoundingSphere();
    envGroup.add(plainsGrassMesh, wildflowerMesh);
    await checkEnvYield();

    // 5. SUB-TAHAP 75%: SEMAK BERRY, FLORA GURUN INSTANCED & VEGETASI PANTAI
    onProgress?.(75, 'Menyebarkan Semak Berry, Rumput Gurun & Singkapan Batu Pasir (75%)...');
    shrubMesh = new THREE.InstancedMesh(shrubGeo, matShrub, SHRUB_COUNT);
    berryBushMesh = new THREE.InstancedMesh(berryBushGeo, matBerryBush, BERRY_BUSH_COUNT);
    desertGrassMesh = new THREE.InstancedMesh(desertGrassGeo, matDesertGrass, DESERT_GRASS_COUNT);
    desertRockMesh = new THREE.InstancedMesh(desertRockGeo, matDesertOutcrop, DESERT_ROCK_COUNT);

    let shrubAssigned = 0;
    let bbAssigned = 0;
    const shrubStep = 17;
    for (let x = -640; x < 860 && (shrubAssigned < SHRUB_COUNT || bbAssigned < BERRY_BUSH_COUNT); x += shrubStep) {
      for (let z = -760; z < 210 && (shrubAssigned < SHRUB_COUNT || bbAssigned < BERRY_BUSH_COUNT); z += shrubStep) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        const sx = x + (0.15 + Math.random() * 0.7) * shrubStep;
        const sz = z + (0.15 + Math.random() * 0.7) * shrubStep;

        if (getSnowWeight(sx, sz) > 0.35 || isFarOcean(sx, sz) || spatialGrid.isBlocked(sx, sz) || spatialGrid.isDesert(sx, sz) || spatialGrid.isOcean(sx, sz) || isNearBridge(sx, sz) || isNearBossArena(sx, sz) || !isValidDryLand(sx, sz, 1.0) || getDistanceToNearestRoad(sx, sz) < 9.0) continue;
        const sy = getTerrainHeight(sx, sz);
        if (sy < 0.25 || sy > 22.0) continue;

        if (shrubAssigned < SHRUB_COUNT && Math.random() > 0.25) {
          const s = 0.55 + Math.random() * 0.65;
          dummy.position.set(sx, sy + s * 0.32, sz);
          dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
          dummy.scale.set(s * (0.8 + Math.random() * 0.4), s * 0.7, s * (0.8 + Math.random() * 0.4));
          dummy.updateMatrix();
          shrubMesh.setMatrixAt(shrubAssigned, dummy.matrix);
          shrubAssigned++;
        } else if (bbAssigned < BERRY_BUSH_COUNT) {
          const bs = 0.72 + Math.random() * 0.52;
          dummy.position.set(sx, sy - 0.04, sz);
          dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
          dummy.scale.set(bs, bs * 0.9, bs);
          dummy.updateMatrix();
          berryBushMesh.setMatrixAt(bbAssigned, dummy.matrix);
          berryBushMesh.setColorAt(bbAssigned, berryBushPalette[(bbAssigned * 7 + (bbAssigned >> 2)) % berryBushPalette.length]);
          bbAssigned++;
        }
      }
    }
    shrubMesh.count = shrubAssigned;
    berryBushMesh.count = bbAssigned;
    shrubMesh.instanceMatrix.needsUpdate = true;
    berryBushMesh.instanceMatrix.needsUpdate = true;
    if (berryBushMesh.instanceColor) berryBushMesh.instanceColor.needsUpdate = true;
    shrubMesh.computeBoundingSphere();
    berryBushMesh.computeBoundingSphere();
    envGroup.add(shrubMesh, berryBushMesh);

    // Flora & Singkapan Geologi Gurun Solaria Instanced
    let dgAssigned = 0;
    let drAssigned = 0;
    const desertStep = 14;
    for (let x = -1040; x <= -180 && (dgAssigned < DESERT_GRASS_COUNT || drAssigned < DESERT_ROCK_COUNT); x += desertStep) {
      for (let z = -760; z <= 120 && (dgAssigned < DESERT_GRASS_COUNT || drAssigned < DESERT_ROCK_COUNT); z += desertStep) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        const dx = x + (0.15 + Math.random() * 0.7) * desertStep;
        const dz = z + (0.15 + Math.random() * 0.7) * desertStep;
        if (!spatialGrid.isDesert(dx, dz) || spatialGrid.isBlocked(dx, dz) || isInsideCastleOrFort(dx, dz) || isNearBossArena(dx, dz) || !isValidDryLand(dx, dz, 1.2) || getDistanceToNearestRoad(dx, dz) < 9.5) continue;
        const dy = getTerrainHeight(dx, dz);
        if (dy < 0.35 || dy > 20.0) continue;

        if (drAssigned < DESERT_ROCK_COUNT && Math.random() > 0.78) {
          const rs = 0.75 + Math.random() * 1.15;
          dummy.position.set(dx, dy - 0.1, dz);
          dummy.rotation.set((Math.random() - 0.5) * 0.14, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.14);
          dummy.scale.set(rs * (0.9 + Math.random() * 0.5), rs * (0.65 + Math.random() * 0.45), rs);
          dummy.updateMatrix();
          desertRockMesh.setMatrixAt(drAssigned, dummy.matrix);
          drAssigned++;
        } else if (dgAssigned < DESERT_GRASS_COUNT && Math.random() > 0.35) {
          const ds = 0.75 + Math.random() * 0.6;
          dummy.position.set(dx, dy - 0.04, dz);
          dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.16);
          dummy.scale.set(ds, ds, ds);
          dummy.updateMatrix();
          desertGrassMesh.setMatrixAt(dgAssigned, dummy.matrix);
          dgAssigned++;
        }
      }
    }
    desertGrassMesh.count = dgAssigned;
    desertRockMesh.count = drAssigned;
    desertGrassMesh.instanceMatrix.needsUpdate = true;
    desertRockMesh.instanceMatrix.needsUpdate = true;
    desertGrassMesh.computeBoundingSphere();
    desertRockMesh.computeBoundingSphere();
    envGroup.add(desertGrassMesh, desertRockMesh);

    // Batu Karang Laut Pesisir (Coastal Reef Stones): 60 Instances
    reefStoneMesh = new THREE.InstancedMesh(reefStoneGeo, matWetSeaRock, REEF_STONE_COUNT);
    let reefAssigned = 0;
    for (let rx = -448; rx <= -410 && reefAssigned < REEF_STONE_COUNT; rx += 7) {
      for (let rz = -240; rz <= -50 && reefAssigned < REEF_STONE_COUNT; rz += 15) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        if (spatialGrid.isDesert(rx, rz) || getBiomeAt(rx, rz) === 'ocean' || getDistanceToNearestRoad(rx, rz) < 9.5) continue;
        const ry = getTerrainHeight(rx, rz);
        if (ry < WATER_LEVEL - 0.15) continue;

        const sX = 0.8 + Math.random() * 1.4;
        const sY = 0.6 + Math.random() * 1.2;
        const sZ = 0.8 + Math.random() * 1.4;
        dummy.position.set(rx, ry + sY * 0.35, rz);
        dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
        dummy.scale.set(sX, sY, sZ);
        dummy.updateMatrix();

        reefStoneMesh.setMatrixAt(reefAssigned, dummy.matrix);
        reefAssigned++;
      }
    }
    reefStoneMesh.count = reefAssigned;
    reefStoneMesh.instanceMatrix.needsUpdate = true;
    reefStoneMesh.computeBoundingSphere();
    envGroup.add(reefStoneMesh);

    // Rumput Gumuk Pantai (Beach Dune Grass): 80 Instances
    beachGrassMesh = new THREE.InstancedMesh(beachGrassGeo, matBeachGrass, BEACH_GRASS_COUNT);
    let bgAssigned = 0;
    for (let gx = -428; gx <= -402 && bgAssigned < BEACH_GRASS_COUNT; gx += 5) {
      for (let gz = -235; gz <= -55 && bgAssigned < BEACH_GRASS_COUNT; gz += 10) {
        if (performance.now() - tLastEnvYield >= 6) {
          await hardYield();
          tLastEnvYield = performance.now();
        }
        if (spatialGrid.isDesert(gx, gz) || !isValidDryLand(gx, gz, 1.0) || getDistanceToNearestRoad(gx, gz) < 9.5) continue;
        const gy = getTerrainHeight(gx, gz);
        if (gy < 0.25) continue;

        const s = 0.65 + Math.random() * 0.6;
        dummy.position.set(gx, gy + s * 0.4, gz);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
        dummy.scale.set(s, s * 1.1, s);
        dummy.updateMatrix();

        beachGrassMesh.setMatrixAt(bgAssigned, dummy.matrix);
        bgAssigned++;
      }
    }
    beachGrassMesh.count = bgAssigned;
    beachGrassMesh.instanceMatrix.needsUpdate = true;
    beachGrassMesh.computeBoundingSphere();
    envGroup.add(beachGrassMesh);

    // Selalu tangkap matriks prop aktif agar Instant In-Game Capture tetap instan kapan pun cache diaktifkan
    if (collectCacheMatrices || true) {
      const sliceActive = (mesh: THREE.InstancedMesh): Float32Array =>
        (mesh.instanceMatrix.array as Float32Array).slice(0, mesh.count * 16);
      capturedPropMatrices = {
        oak: sliceActive(oakTrunkMesh),
        pine: sliceActive(pineTrunkMesh),
        snowPine: sliceActive(snowPineTrunkMesh),
        boulder: sliceActive(boulderMesh),
        snowBoulder: sliceActive(snowBoulderMesh),
        plainsGrass: sliceActive(plainsGrassMesh),
        wildflower: sliceActive(wildflowerMesh),
        shrub: sliceActive(shrubMesh),
        berryBush: sliceActive(berryBushMesh),
        fallenLog: sliceActive(fallenLogMesh),
        desertGrass: sliceActive(desertGrassMesh),
        desertRock: sliceActive(desertRockMesh),
        reefStone: sliceActive(reefStoneMesh),
        beachGrass: sliceActive(beachGrassMesh),
      };
    }
  }

  // ============================================================================
  // ZONA L: VEGETASI & BEBATUAN GURUN SOLARIA (SAGUARO CACTI, SANDSTONE CRAGS & DRY TREES)
  // Mengisi wilayah gurun luas di utara garis kuning dengan flora & geologi khas gurun
  // ============================================================================
  await checkEnvYield(76, 'Menanam Vegetasi Gurun Solaria & Kaktus Saguaro (76%)...');
  const desertFloraGroup = new THREE.Group();
  desertFloraGroup.name = 'ZoneL_SolariaDesertFlora';

  const matCactus = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });
  const matSandstoneCrag = new THREE.MeshStandardMaterial({
    color: 0xd49b55,
    roughness: 0.88,
    metalness: 0.08,
    flatShading: true,
  });
  const matDryDesertWood = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });

  // 1. Saguaro Cacti (Cylinder batang utama + cabang L)
  const cactusCoords: [number, number][] = [
    [-200, -260], [-240, -240], [-280, -210], [-320, -180], [-360, -220], [-410, -200],
    [-220, -310], [-260, -320], [-300, -280], [-350, -380], [-390, -340], [-430, -310],
    [-460, -360], [-500, -320], [-520, -280], [-550, -340], [-280, -420], [-340, -460],
    [-380, -500], [-420, -530], [-460, -570], [-510, -540], [-540, -490], [-480, -620],
  ];
  cactusCoords.forEach(([cx, cz]) => {
    if (!isDesertBiome(cx, cz) || isInsideCastleOrFort(cx, cz) || !isValidDryLand(cx, cz, 1.5) || getDistanceToNearestRoad(cx, cz) < 9.5) return;
    const cy = getTerrainHeight(cx, cz);
    if (cy < 0.2) return;

    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    const scale = 0.8 + Math.random() * 0.5;
    cGroup.scale.set(scale, scale, scale);

    // Batang utama silinder berusuk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 3.8, 8), matCactus);
    trunk.position.y = 1.9;
    trunk.castShadow = true;
    cGroup.add(trunk);

    // Lengan kiri (L-arm)
    const armLHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.9, 6), matCactus);
    armLHoriz.rotation.z = Math.PI / 2;
    armLHoriz.position.set(-0.55, 2.2, 0);
    cGroup.add(armLHoriz);
    const armLVert = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.2, 6), matCactus);
    armLVert.position.set(-1.0, 2.8, 0);
    cGroup.add(armLVert);

    // Lengan kanan (L-arm)
    if (Math.random() > 0.3) {
      const armRHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.8, 6), matCactus);
      armRHoriz.rotation.z = Math.PI / 2;
      armRHoriz.position.set(0.5, 1.8, 0);
      cGroup.add(armRHoriz);
      const armRVert = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.0, 6), matCactus);
      armRVert.position.set(0.9, 2.3, 0);
      cGroup.add(armRVert);
    }

    cGroup.rotation.y = Math.random() * Math.PI * 2;
    desertFloraGroup.add(cGroup);
    colliders.push({ type: 'circle', x: cx, z: cz, radius: 0.6 * scale, label: 'Kaktus Saguaro' });
  });

  // 2. Sandstone Crags (Bebatuan Pasir Cadas Runcing)
  const cragCoords: [number, number][] = [
    [-210, -290], [-250, -270], [-290, -250], [-330, -200], [-380, -170], [-420, -180],
    [-270, -220], [-310, -150], [-360, -160], [-440, -250], [-480, -230], [-530, -290],
    [-560, -310], [-580, -320], [-490, -350], [-450, -320], [-310, -340], [-370, -370],
  ];
  cragCoords.forEach(([rx, rz]) => {
    if (!isDesertBiome(rx, rz) || isInsideCastleOrFort(rx, rz) || !isValidDryLand(rx, rz, 1.5) || getDistanceToNearestRoad(rx, rz) < 9.5) return;
    const ry = getTerrainHeight(rx, rz);
    if (ry < 0.2) return;

    const crag = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.6, 5), matSandstoneCrag);
    const cragScale = 0.8 + Math.random() * 0.7;
    crag.scale.set(cragScale, cragScale * (1.2 + Math.random() * 0.6), cragScale);
    crag.position.set(rx, ry + (1.8 * cragScale), rz);
    crag.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.25);
    crag.castShadow = true;
    desertFloraGroup.add(crag);
    colliders.push({ type: 'circle', x: rx, z: rz, radius: 1.1 * cragScale, label: 'Cadas Pasir Runcing' });
  });

  // 3. Dry Desert Trees (Pohon Kering Gurun)
  const dryTreeCoords: [number, number][] = [
    [-220, -240], [-260, -220], [-310, -180], [-350, -130], [-400, -140], [-450, -170],
    [-280, -310], [-330, -270], [-390, -240], [-470, -220], [-520, -260], [-560, -280],
  ];
  dryTreeCoords.forEach(([tx, tz]) => {
    if (!isDesertBiome(tx, tz) || isInsideCastleOrFort(tx, tz) || !isValidDryLand(tx, tz, 1.5) || getDistanceToNearestRoad(tx, tz) < 9.5) return;
    const ty = getTerrainHeight(tx, tz);
    if (ty < 0.2) return;

    const treeGroup = new THREE.Group();
    treeGroup.position.set(tx, ty, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 3.2, 5), matDryDesertWood);
    trunk.position.y = 1.6;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
    treeGroup.add(trunk);

    // Bare gnarled branches
    for (let b = 0; b < 4; b++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.4, 4), matDryDesertWood);
      branch.position.set(0, 2.2 + b * 0.3, 0);
      branch.rotation.set((Math.random() - 0.5) * 0.8, (b * Math.PI) / 2, 0.6 + Math.random() * 0.4);
      treeGroup.add(branch);
    }
    desertFloraGroup.add(treeGroup);
  });

  // 4. Ancient Desert Skulls & Fossil Ribs along deep dune fringes
  const desertBoneCoords: [number, number][] = [
    [-640, -250], [-720, -340], [-745, -180], [-585, -245], [-680, -455], [-470, -610],
  ];
  desertBoneCoords.forEach(([bx, bz], idx) => {
    if (!isDesertBiome(bx, bz) || isInsideCastleOrFort(bx, bz) || !isValidDryLand(bx, bz, 1.5) || getDistanceToNearestRoad(bx, bz) < 10.0) return;
    const by = getTerrainHeight(bx, bz);
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, by, bz);
    bGroup.rotation.y = idx * 1.3;
    const dSkull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), matBone);
    dSkull.position.set(0, 0.28, 0);
    dSkull.scale.set(1.35, 0.85, 0.95);
    bGroup.add(dSkull);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.72, 5), matBone);
    hornL.rotation.set(0.3, 0, 0.75);
    hornL.position.set(-0.35, 0.48, -0.2);
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.72, 5), matBone);
    hornR.rotation.set(-0.3, 0, -0.75);
    hornR.position.set(0.35, 0.48, -0.2);
    bGroup.add(hornL, hornR);
    desertFloraGroup.add(bGroup);
  });

  envGroup.add(desertFloraGroup);
  await checkEnvYield();

  // ============================================================================
  // ZONA M: LEMBAH DANAU TITAN KUNO & PINUS BERSALJU (NORTHWEST TITAN LAKE)
  // Koordinat Pusat X: 60, Z: -820 (Danau Biru Jernih & Pegunungan Salju)
  // ============================================================================
  await checkEnvYield(77, 'Membangun Danau Titan Kuno & Pinus Bersalju (77%)...');
  const titanLakeGroup = new THREE.Group();
  titanLakeGroup.name = 'ZoneM_TitanLakeValley';

  const matLakeWater = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
  });
  const matAlpineEvergreen = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.85,
    flatShading: true,
  });
  const matAlpineSnowCap = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.65,
    flatShading: true,
  });
  const matTitanStone = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.8,
    metalness: 0.2,
    flatShading: true,
  });
  const matMountainCliff = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.9,
    metalness: 0.08,
    flatShading: true,
  });
  const matMountainSnow = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.62,
    flatShading: true,
  });

  function addSnowCappedAlpinePine(px: number, pz: number, s: number, label: string) {
    if (!isValidDryLand(px, pz, 1.5) || getDistanceToNearestRoad(px, pz) < 9.5) return;
    if (Math.hypot(px - 60, pz - -820) < 62 || Math.hypot(px - 180, pz - -560) < 68) return;
    const py = getTerrainHeight(px, pz);
    if (py < 0.2) return;

    const spGroup = new THREE.Group();
    spGroup.position.set(px, py, pz);
    spGroup.scale.setScalar(s);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 3.2, 5), matWoodDark);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    spGroup.add(trunk);

    const tiers = [
      { r: 2.35, h: 3.0, y: 3.5 },
      { r: 1.75, h: 2.5, y: 5.1 },
      { r: 1.15, h: 2.0, y: 6.5 },
    ];
    tiers.forEach((t, idx) => {
      const greenCone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 6), matAlpineEvergreen);
      greenCone.position.y = t.y;
      greenCone.rotation.y = idx * 0.4;
      greenCone.castShadow = true;
      spGroup.add(greenCone);

      const snowCone = new THREE.Mesh(new THREE.ConeGeometry(t.r * 0.68, t.h * 0.56, 6), matAlpineSnowCap);
      snowCone.position.y = t.y + t.h * 0.25;
      snowCone.rotation.y = idx * 0.4 + 0.18;
      spGroup.add(snowCone);
    });

    titanLakeGroup.add(spGroup);
    colliders.push({ type: 'circle', x: px, z: pz, radius: 1.0 * s, label });
  }

  // 1. Permukaan Air Danau Titan (Radius 58 unit di elevasi Y = -0.35)
  const lakeGeo = new THREE.CircleGeometry(58, 48);
  lakeGeo.rotateX(-Math.PI / 2);
  const lakeMesh = new THREE.Mesh(lakeGeo, matLakeWater);
  lakeMesh.position.set(60, -0.35, -820);
  titanLakeGroup.add(lakeMesh);

  // 2. Monolit Pilar Kuno Sang Titan Mengelilingi Danau
  const monolithAngles = [0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6];
  monolithAngles.forEach((ang) => {
    const mx = 60 + Math.cos(ang) * 62;
    const mz = -820 + Math.sin(ang) * 62;
    if (!isValidDryLand(mx, mz, 1.5) || getDistanceToNearestRoad(mx, mz) < 9.5) return;
    const my = getTerrainHeight(mx, mz);
    const mHeight = 5.0 + Math.random() * 3.5;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, mHeight, 1.6), matTitanStone);
    pillar.position.set(mx, my + mHeight / 2, mz);
    pillar.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * Math.PI, (Math.random() - 0.5) * 0.15);
    pillar.castShadow = true;
    titanLakeGroup.add(pillar);
    colliders.push({ type: 'circle', x: mx, z: mz, radius: 1.2, label: 'Monolit Titan Kuno' });
  });

  // 3. Rangkaian Pegunungan Salju Raksasa Utara (Berpunggung Asimetris Berundak — 0% Kerucut Seragam, Bebas Jarak >=50u dari Titan Colosseum)
  const buildRidgedMountainGeo = (variantSeed: number): THREE.BufferGeometry => {
    const geo = new THREE.ConeGeometry(1.0, 1.0, 18, 9);
    geo.translate(0, 0.5, 0);
    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const h = Math.max(0, Math.min(1, y));
      const ang = Math.atan2(z, x);

      if (h < 0.985) {
        const ridgeMul =
          1.0 +
          0.32 * Math.cos(ang * 3 + variantSeed * 1.4) +
          0.18 * Math.sin(ang * 5 - variantSeed * 2.1) +
          0.10 * Math.cos(h * 10 + ang * 2);
        const spurBoost = h < 0.55 ? (1.0 - h) * 0.22 * Math.max(0, Math.sin(ang * 2 + variantSeed)) : 0;
        x *= ridgeMul + spurBoost;
        z *= (ridgeMul + spurBoost * 0.7) * (0.86 + 0.14 * Math.sin(variantSeed));
        x += h * h * 0.14 * Math.cos(variantSeed * 1.9);
        z += h * h * 0.12 * Math.sin(variantSeed * 1.3);
        y += Math.sin(ang * 4 + h * 7 + variantSeed) * 0.035 * (1 - h);
        pos.setXYZ(i, x, y, z);
      }

      const snowLine = 0.44 + 0.12 * Math.sin(ang * 3 + variantSeed * 1.7) + 0.06 * Math.cos(ang * 6);
      let cr: number, cg: number, cb: number;
      if (h < snowLine) {
        const rockTone = 0.22 + (h / Math.max(0.1, snowLine)) * 0.14;
        cr = rockTone;
        cg = rockTone + 0.05;
        cb = rockTone + 0.12;
      } else if (h < snowLine + 0.13) {
        const tS = (h - snowLine) / 0.13;
        cr = 0.36 + tS * 0.54;
        cg = 0.43 + tS * 0.50;
        cb = 0.50 + tS * 0.46;
      } else {
        cr = 0.92 + 0.06 * h;
        cg = 0.95 + 0.04 * h;
        cb = 0.98 + 0.02 * h;
      }
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  };

  const ridgedPeakVariants = [buildRidgedMountainGeo(0.7), buildRidgedMountainGeo(2.3), buildRidgedMountainGeo(4.1)];
  const matRidgedMassif = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.06,
    flatShading: true,
  });

  const alpinePeaks: [number, number, number, number][] = [
    [-195, -915, 48, 96],  [-160, -965, 52, 110], [-110, -990, 50, 106],
    [-45, -1010, 54, 114], [25, -1015, 52, 108],  [95, -995, 50, 104],
    [160, -960, 48, 95],   [215, -905, 46, 90],   [245, -840, 42, 82],
    [-210, -835, 40, 78],  [-170, -790, 36, 70],  [-135, -890, 40, 84],
    [-85, -935, 44, 92],   [125, -925, 38, 76],   [188, -875, 42, 86],
    [220, -785, 36, 66],   [-185, -745, 34, 58],  [-125, -735, 32, 54],
    [-65, -725, 31, 50],   [-150, -845, 32, 62],
  ];
  alpinePeaks.forEach(([mx, mz, baseR, peakH], idx) => {
    if (!isValidDryLand(mx, mz, 5.0)) return;
    if (Math.hypot(mx - 60, mz - -820) < 84) return;
    if (Math.hypot(mx - 180, mz - -560) < 130) return; // Garansi lembah bebas >=50u dari dinding Colosseum Titan
    if (Math.hypot(mx - -49, mz - -828) < 48) return;
    if (getDistanceToNearestRoad(mx, mz) < 22) return;

    const my = getTerrainHeight(mx, mz);
    const mGroup = new THREE.Group();
    mGroup.position.set(mx, my - 2.5, mz);
    mGroup.rotation.y = (idx * 1.27) % (Math.PI * 2);

    const primaryGeo = ridgedPeakVariants[idx % ridgedPeakVariants.length];
    const mainMassif = new THREE.Mesh(primaryGeo, matRidgedMassif);
    mainMassif.scale.set(baseR, peakH, baseR * (0.82 + (idx % 3) * 0.08));
    mainMassif.castShadow = true;
    mainMassif.receiveShadow = true;
    mGroup.add(mainMassif);

    const flankGeo = ridgedPeakVariants[(idx + 1) % ridgedPeakVariants.length];
    const flankRidge = new THREE.Mesh(flankGeo, matRidgedMassif);
    flankRidge.position.set(baseR * 0.42, 0, -baseR * 0.22);
    flankRidge.rotation.set(0.06, 0.9 + idx * 0.4, -0.05);
    flankRidge.scale.set(baseR * 0.68, peakH * 0.72, baseR * 0.62);
    flankRidge.receiveShadow = true;
    mGroup.add(flankRidge);

    const spurGeo = ridgedPeakVariants[(idx + 2) % ridgedPeakVariants.length];
    const spurRidge = new THREE.Mesh(spurGeo, matRidgedMassif);
    spurRidge.position.set(-baseR * 0.34, 0, baseR * 0.25);
    spurRidge.rotation.set(-0.04, 2.2 - idx * 0.3, 0.05);
    spurRidge.scale.set(baseR * 0.56, peakH * 0.54, baseR * 0.52);
    spurRidge.receiveShadow = true;
    mGroup.add(spurRidge);

    titanLakeGroup.add(mGroup);
    colliders.push({ type: 'circle', x: mx, z: mz, radius: baseR * 0.46, label: 'Puncak Gunung Salju Utara' });
  });

  // 4. Pohon Pinus Hijau Gelap Bertopi Salju Mengelilingi Lereng Danau & Pegunungan Utara
  const snowPineCoords: [number, number][] = [
    [50, -880], [60, -760], [70, -885], [90, -870], [120, -855],
    [130, -805], [125, -775], [105, -760], [45, -765], [30, -795],
    [20, -840], [80, -890], [110, -875], [120, -825], [40, -770],
    [-55, -800], [-30, -850], [-75, -830], [-60, -870], [-20, -790],
    [-95, -795], [-115, -825], [-85, -855], [-45, -750], [5, -875],
    [10, -745], [85, -735], [140, -740], [160, -815], [148, -860],
  ];
  snowPineCoords.forEach(([spx, spz], pIdx) => {
    const scale = 1.0 + (pIdx % 4) * 0.16;
    addSnowCappedAlpinePine(spx, spz, scale, 'Pinus Salju Utara');
  });

  // 5. Bongkahan Batu Es & Pinus Bertopi Salju di Lereng Pegunungan Salju Utara
  const matIceBoulder = new THREE.MeshStandardMaterial({
    color: 0xcfe8f7,
    roughness: 0.35,
    metalness: 0.25,
    flatShading: true,
  });
  const alpineSlopeProps: { x: number; z: number; type: 'pine' | 'boulder'; scale: number }[] = [
    { x: -140, z: -860, type: 'boulder', scale: 2.2 },
    { x: -110, z: -920, type: 'pine', scale: 1.3 },
    { x: -60, z: -950, type: 'boulder', scale: 2.8 },
    { x: -20, z: -910, type: 'pine', scale: 1.4 },
    { x: 30, z: -960, type: 'boulder', scale: 3.0 },
    { x: 100, z: -920, type: 'pine', scale: 1.25 },
    { x: 140, z: -880, type: 'boulder', scale: 2.5 },
    { x: 180, z: -840, type: 'pine', scale: 1.35 },
    { x: 210, z: -800, type: 'boulder', scale: 2.0 },
    { x: -80, z: -780, type: 'pine', scale: 1.2 },
    { x: -40, z: -740, type: 'boulder', scale: 1.8 },
    { x: 150, z: -750, type: 'pine', scale: 1.2 },
    { x: 190, z: -720, type: 'boulder', scale: 2.2 },
    { x: -65, z: -848, type: 'boulder', scale: 1.9 },
    { x: -32, z: -808, type: 'boulder', scale: 1.6 },
    { x: -88, z: -815, type: 'pine', scale: 1.25 },
  ];
  alpineSlopeProps.forEach((asp) => {
    if (!isValidDryLand(asp.x, asp.z, 2.0) || getDistanceToNearestRoad(asp.x, asp.z) < 9.5) return;
    if (Math.hypot(asp.x - -49, asp.z - -828) < 10) return;
    const aspy = getTerrainHeight(asp.x, asp.z);
    if (aspy < 0.5) return;

    if (asp.type === 'boulder') {
      const bMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(asp.scale, 1), matIceBoulder);
      bMesh.position.set(asp.x, aspy + asp.scale * 0.7, asp.z);
      bMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      bMesh.castShadow = true;
      titanLakeGroup.add(bMesh);
      colliders.push({ type: 'circle', x: asp.x, z: asp.z, radius: asp.scale * 0.9, label: 'Bongkahan Batu Es' });
    } else {
      addSnowCappedAlpinePine(asp.x, asp.z, asp.scale, 'Pinus Salju Pegunungan');
    }
  });

  envGroup.add(titanLakeGroup);
  await checkEnvYield();

  // ============================================================================
  // ZONA N: KANYON KUNO (NORTHERN RED CANYON MESAS & CANYON CLIFFS)
  // Koordinat Pusat X: -380, Z: -640 (100% di atas Daratan Pasir Kering Gurun)
  // ============================================================================
  await checkEnvYield(78, 'Menata Tebing Kanyon Kuno & Hutan Kabut (78%)...');
  const ancientCanyonGroup = new THREE.Group();
  ancientCanyonGroup.name = 'ZoneN_AncientCanyon';

  const matCanyonRock = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const matSandstoneOrange = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true,
  });

  const canyonCenterX = -380;
  const canyonCenterZ = -640;
  const canyonMesaOffsets: [number, number, number, number][] = [
    [0, 0, 16, 20],
    [-26, -18, 13, 17],
    [24, 16, 14, 18],
    [-18, 24, 11, 15],
    [22, -22, 12, 16],
    [-30, 8, 10, 14],
    [28, -8, 11, 15],
  ];
  canyonMesaOffsets.forEach(([dx, dz, radius, height]) => {
    const cx = canyonCenterX + dx;
    const cz = canyonCenterZ + dz;
    // Pastikan setiap pilar batu hanya di-spawn jika isStrictLandForProps(cx, cz) === true dan tanah kering!
    if (!isStrictLandForProps(cx, cz, getTerrainHeight)) return;
    const cy = getTerrainHeight(cx, cz);
    if (cy < 1.5) return; // Garansi berdiri di atas tanah kering

    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, height, 7), matCanyonRock);
    mesa.position.set(cx, cy + height / 2, cz);
    mesa.rotation.y = Math.random() * Math.PI;
    mesa.castShadow = true;
    ancientCanyonGroup.add(mesa);

    // Top tier cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.45, radius * 0.65, height * 0.35, 6), matSandstoneOrange);
    cap.position.set(cx, cy + height + (height * 0.175), cz);
    ancientCanyonGroup.add(cap);

    colliders.push({ type: 'circle', x: cx, z: cz, radius: radius * 0.9, label: 'Tebing Cadas Kanyon' });
  });

  envGroup.add(ancientCanyonGroup);
  await checkEnvYield();

  // ============================================================================
  // ZONA O: HUTAN KABUT ELDORIA (MIST FOREST & FOG EFFECT)
  // Koordinat Pusat X: 760, Z: -280 (Hutan Pinus Lebat & Kabut Melayang)
  // ============================================================================
  const mistForestGroup = new THREE.Group();
  mistForestGroup.name = 'ZoneO_MistForest';

  const matDeepPine = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.85,
    flatShading: true,
  });
  const matMistPlane = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // 1. Kumpulan Pohon Pinus Gelap Rapat
  for (let px = 730; px <= 790; px += 14) {
    for (let pz = -310; pz <= -250; pz += 14) {
      const offsetX = px + (Math.sin(px * 1.5 + pz) * 5.0);
      const offsetZ = pz + (Math.cos(pz * 1.8 + px) * 5.0);
      if (isDesertBiome(offsetX, offsetZ)) continue;
      const py = getTerrainHeight(offsetX, offsetZ);

      const tree = new THREE.Group();
      tree.position.set(offsetX, py, offsetZ);
      const s = 1.0 + Math.random() * 0.45;
      tree.scale.set(s, s, s);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.5, 5), matWoodDark);
      trunk.position.y = 1.75;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.5, 5), matDeepPine);
      foliage.position.y = 5.2;
      foliage.castShadow = true;
      tree.add(foliage);

      mistForestGroup.add(tree);
      colliders.push({ type: 'circle', x: offsetX, z: offsetZ, radius: 0.9 * s, label: 'Pinus Hutan Kabut' });
    }
  }

  // 2. Lembaran Kabut Tipis Melayang (Mist Planes)
  const mistCenters = [
    [745, -295], [775, -290], [760, -265], [740, -260], [785, -275],
  ];
  mistCenters.forEach(([mx, mz], idx) => {
    const my = getTerrainHeight(mx, mz);
    const planeGeo = new THREE.PlaneGeometry(28, 28);
    planeGeo.rotateX(-Math.PI / 2);
    const plane = new THREE.Mesh(planeGeo, matMistPlane);
    plane.position.set(mx, my + 1.2 + idx * 0.2, mz);
    mistForestGroup.add(plane);
    animatedMistPlanes.push({ mesh: plane, baseY: my + 1.2, speed: 0.6 + idx * 0.15 });
  });

  envGroup.add(mistForestGroup);
  await checkEnvYield();

  // ============================================================================
  // ZONA P: RERUNTUHAN KUIL KUNO (ANCIENT TEMPLE RUINS) - X: 608, Z: -50
  // Terbuka, jauh dari jalan raya (>= 25 unit), tanpa invisible barrier
  // ============================================================================
  await checkEnvYield(79, 'Membangun Reruntuhan Kuil Kuno & Benteng Val-Kragor (79%)...');
  const castleRuinsGroup = new THREE.Group();
  castleRuinsGroup.name = 'ZoneP_AbandonedCastleRuins';
  createAncientTempleRuinsComplex(castleRuinsGroup, 608, -50, getTerrainHeight, colliders, {
    tileCount: 20,
    archCount: 2,
    pillarCount: 8,
    seedOffset: 3,
  });
  envGroup.add(castleRuinsGroup);
  await checkEnvYield();

  // ============================================================================
  // ZONA Q: DESA BENTENG VAL-KRAGOR (EAST FORTRESS VILLAGE)
  // Struktural dinding 110x110 & 4 corner watchtower terintegrasi di buildValKragorFort (world.ts).
  // Barikade & pos jaga lama di sini dihapus agar tidak menghalangi halaman dalam atau menembus tembok.
  // ============================================================================
  const valkragorGroup = new THREE.Group();
  valkragorGroup.name = 'ZoneQ_FortressValKragor';
  envGroup.add(valkragorGroup);
  await checkEnvYield();

  // ============================================================================
  // ZONA R: LEMBAH BATU LUMUT (MOSSY ROCK VALLEY & GLADE SPORES)
  // Koordinat Pusat X: 680, Z: -160 (Megalit Berlumut & Pendar Partikel Glade)
  // ============================================================================
  await checkEnvYield(80, 'Membentuk Lembah Batu Lumut & Hutan Lindung (80%)...');
  const mossValleyGroup = new THREE.Group();
  mossValleyGroup.name = 'ZoneR_MossRockValley';

  const matMossGladeRock = new THREE.MeshStandardMaterial({
    color: 0x4d7c0f,
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true,
  });
  const matGladeSpore = new THREE.MeshBasicMaterial({
    color: 0x84cc16,
    transparent: true,
    opacity: 0.8,
  });

  // 1. Gugusan Batu Megalit Berlumut Besar
  const mossRocks = [
    [565, -135, 2.8], [580, -140, 3.6], [595, -130, 2.5],
    [570, -115, 3.2], [588, -110, 3.8], [600, -120, 2.6],
    [578, -125, 4.2], [560, -120, 2.2], [590, -128, 3.0],
  ];
  mossRocks.forEach(([mx, mz, s]) => {
    if (!isValidDryLand(mx, mz, s) || getDistanceToNearestRoad(mx, mz) < 9.5) return;
    const my = getTerrainHeight(mx, mz);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), matMossGladeRock);
    rock.position.set(mx, my + s * 0.7, mz);
    rock.scale.set(1.0, 1.3, 0.9);
    rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
    rock.castShadow = true;
    mossValleyGroup.add(rock);
    colliders.push({ type: 'circle', x: mx, z: mz, radius: s * 0.9, label: 'Batu Purba Berlumut' });
  });

  // 2. Partikel Spora Bercahaya Melayang di Lembah
  for (let sp = 0; sp < 16; sp++) {
    const sx = 565 + Math.random() * 32;
    const sz = -135 + Math.random() * 30;
    if (!isValidDryLand(sx, sz, 1.0) || getDistanceToNearestRoad(sx, sz) < 9.5) continue;
    const sy = getTerrainHeight(sx, sz) + 0.8 + Math.random() * 2.2;
    const spore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 4, 4), matGladeSpore);
    spore.position.set(sx, sy, sz);
    mossValleyGroup.add(spore);
    animatedSpores.push({
      mesh: spore,
      basePos: new THREE.Vector3(sx, sy, sz),
      speed: 1.2 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    });
  }

  envGroup.add(mossValleyGroup);
  await checkEnvYield();

  // ============================================================================
  // ZONA S: HUTAN LINDUNG BARAT DAYA (SOUTHWEST LUSH OAK FOREST)
  // Rentang X: -320 s.d -180, Z: 50 s.d 150 (Cluster Rimbun Hijau Pesisir Barat)
  // ============================================================================
  const swForestGroup = new THREE.Group();
  swForestGroup.name = 'ZoneS_SouthwestLushForest';

  const matSWFTrunk = new THREE.MeshStandardMaterial({
    color: 0x4a3525,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const matSWFCanopy1 = new THREE.MeshStandardMaterial({
    color: 0x1e6928,
    roughness: 0.85,
    flatShading: true,
  });
  const matSWFCanopy2 = new THREE.MeshStandardMaterial({
    color: 0x2d8a3e,
    roughness: 0.85,
    flatShading: true,
  });

  const swTreeGeoTrunk = new THREE.CylinderGeometry(0.35, 0.55, 3.6, 6);
  const swCanopyGeo1 = new THREE.DodecahedronGeometry(2.4, 1);
  const swCanopyGeo2 = new THREE.DodecahedronGeometry(1.8, 1);

  for (let tx = 165; tx <= 330; tx += 24) {
    for (let tz = 15; tz <= 125; tz += 22) {
      const jx = tx + (Math.random() - 0.5) * 14;
      const jz = tz + (Math.random() - 0.5) * 14;
      if (getBiomeAt(jx, jz) === 'ocean' || isDesertBiome(jx, jz)) continue;
      if (!isValidDryLand(jx, jz, 2.0) || getDistanceToNearestRoad(jx, jz) < 9.5) continue;
      const jy = getTerrainHeight(jx, jz);
      if (jy < 0.5) continue;

      const tGroup = new THREE.Group();
      tGroup.position.set(jx, jy, jz);
      const s = 0.9 + Math.random() * 0.5;
      tGroup.scale.set(s, s, s);

      const trunk = new THREE.Mesh(swTreeGeoTrunk, matSWFTrunk);
      trunk.position.y = 1.8;
      trunk.castShadow = true;
      tGroup.add(trunk);

      const canopyMat = Math.random() > 0.4 ? matSWFCanopy1 : matSWFCanopy2;
      const c1 = new THREE.Mesh(swCanopyGeo1, canopyMat);
      c1.position.y = 4.2;
      c1.castShadow = true;
      tGroup.add(c1);

      const c2 = new THREE.Mesh(swCanopyGeo2, canopyMat);
      c2.position.set(0.6, 5.0, 0.3);
      c2.castShadow = true;
      tGroup.add(c2);

      swForestGroup.add(tGroup);
      colliders.push({ type: 'circle', x: jx, z: jz, radius: 1.1 * s, label: 'Pohon Ek Hutan Tenggara' });
    }
  }
  envGroup.add(swForestGroup);
  await checkEnvYield();

  // ============================================================================
  // ANIMASI UPDATE CALLBACK (FLICKERING TORCHES & CAMPFIRE)
  // ============================================================================
  let ambientEffectsEnabled = true;

  const update = (delta: number, time: number) => {
    // Update seragam animasi angin rumput & bunga liar (GPU vertex shader)
    windUniforms.uWindTime.value = time;

    // Animasi flicker cahaya obor dan api unggun
    animatedLights.forEach((al) => {
      al.light.intensity = al.baseIntensity + Math.sin(time * al.speed) * 0.35 + Math.cos(time * al.speed * 1.6) * 0.15;
    });

    // Animasi denyut lidah api
    animatedFlames.forEach((af) => {
      const pulse = 1.0 + Math.sin(time * af.speed) * 0.12;
      af.mesh.scale.set(af.baseScale.x * pulse, af.baseScale.y * (1.0 + Math.cos(time * af.speed * 1.3) * 0.18), af.baseScale.z * pulse);
    });

    // Animasi putaran baling-baling kincir angin perlahan
    if (windmillBladesGroup) {
      windmillBladesGroup.rotation.z += delta * 0.55;
    }

    // Animasi aliran arus air sungai jernih (UV scrolling)
    if (riverWaterTexture) {
      riverWaterTexture.offset.y = (time * 0.16) % 1.0;
    }

    if (!ambientEffectsEnabled) return;

    // Animasi kabut melayang perlahan di Hutan Kabut Eldoria
    animatedMistPlanes.forEach((mp) => {
      mp.mesh.position.y = mp.baseY + Math.sin(time * mp.speed) * 0.35;
      mp.mesh.rotation.z = Math.sin(time * (mp.speed * 0.5)) * 0.08;
    });

    // Animasi denyut dan goyangan spora bercahaya Lembah Batu Lumut
    animatedSpores.forEach((sp) => {
      sp.mesh.position.y = sp.basePos.y + Math.sin(time * sp.speed + sp.phase) * 0.45;
      sp.mesh.position.x = sp.basePos.x + Math.cos(time * 0.8 + sp.phase) * 0.25;
    });
  };

  const vegetationAndFarGroups: THREE.Object3D[] = [
    pineTrunkMesh,
    pineFoliageMesh1,
    pineFoliageMesh2,
    pineFoliageMesh3,
    snowPineTrunkMesh,
    snowPineFoliageMesh,
    snowPineSnowCapMesh,
    oakTrunkMesh,
    oakCrownMesh,
    boulderMesh,
    snowBoulderMesh,
    shrubMesh,
    berryBushMesh,
    fallenLogMesh,
    desertGrassMesh,
    desertRockMesh,
    reefStoneMesh,
    beachGrassMesh,
    plainsGrassMesh,
    wildflowerMesh,
    desertFloraGroup,
    titanLakeGroup,
    ancientCanyonGroup,
    mistForestGroup,
    castleRuinsGroup,
    valkragorGroup,
    mossValleyGroup,
    swForestGroup,
    colosseumGroup,
    canyonGroup,
    savannaGroup,
    outpostGroup,
    beastGroup,
    ruinsGroup,
    farmGroup,
    coastGroup,
    meadowGroup,
    westPOIGroup,
    windmillHillGroup,
  ];

  const fullPlainsGrassCount = plainsGrassMesh?.count ?? 0;
  const fullWildflowerCount = wildflowerMesh?.count ?? 0;
  const fullDesertGrassCount = desertGrassMesh?.count ?? 0;
  const fullBeachGrassCount = beachGrassMesh?.count ?? 0;
  const fullShrubCount = shrubMesh?.count ?? 0;
  const fullBerryBushCount = berryBushMesh?.count ?? 0;
  let currentGrassDensity = 1.0;

  const setGrassDensity = (scale: number) => {
    currentGrassDensity = Math.max(0, Math.min(1, scale));
    if (plainsGrassMesh) {
      plainsGrassMesh.visible = currentGrassDensity > 0.01;
      if (plainsGrassMesh.visible && fullPlainsGrassCount > 0) {
        plainsGrassMesh.count = Math.max(1, Math.floor(fullPlainsGrassCount * currentGrassDensity));
      }
    }
    if (wildflowerMesh) {
      wildflowerMesh.visible = currentGrassDensity > 0.01;
      if (wildflowerMesh.visible && fullWildflowerCount > 0) {
        wildflowerMesh.count = Math.max(1, Math.floor(fullWildflowerCount * currentGrassDensity));
      }
    }
    if (desertGrassMesh) {
      desertGrassMesh.visible = currentGrassDensity > 0.01;
      if (desertGrassMesh.visible && fullDesertGrassCount > 0) {
        desertGrassMesh.count = Math.max(1, Math.floor(fullDesertGrassCount * currentGrassDensity));
      }
    }
    if (beachGrassMesh) {
      beachGrassMesh.visible = currentGrassDensity > 0.01;
      if (beachGrassMesh.visible && fullBeachGrassCount > 0) {
        beachGrassMesh.count = Math.max(1, Math.floor(fullBeachGrassCount * currentGrassDensity));
      }
    }
    if (shrubMesh) {
      shrubMesh.visible = currentGrassDensity > 0.01;
      if (shrubMesh.visible && fullShrubCount > 0) {
        const shrubScale = Math.max(0.2, currentGrassDensity);
        shrubMesh.count = Math.max(1, Math.floor(fullShrubCount * shrubScale));
      }
    }
    if (berryBushMesh) {
      berryBushMesh.visible = currentGrassDensity > 0.01;
      if (berryBushMesh.visible && fullBerryBushCount > 0) {
        const bushScale = Math.max(0.2, currentGrassDensity);
        berryBushMesh.count = Math.max(1, Math.floor(fullBerryBushCount * bushScale));
      }
    }
  };

  const setAmbientEffectsVisible = (visible: boolean) => {
    ambientEffectsEnabled = visible;
    for (let i = 0; i < animatedSpores.length; i++) {
      animatedSpores[i].mesh.visible = visible;
    }
    for (let i = 0; i < animatedMistPlanes.length; i++) {
      animatedMistPlanes[i].mesh.visible = visible;
    }
  };

  const setVegetationVisible = (visible: boolean) => {
    for (let i = 0; i < vegetationAndFarGroups.length; i++) {
      vegetationAndFarGroups[i].visible = visible;
    }
    if (visible) {
      setGrassDensity(currentGrassDensity);
    }
  };

  return {
    group: envGroup,
    colliders,
    update,
    setVegetationVisible,
    setGrassDensity,
    setAmbientEffectsVisible,
    propMatrices: capturedPropMatrices,
  };
}

/**
 * Synchronous compatibility wrapper
 */
export function buildWorldEnvironment(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number) => number,
  colliders: WorldCollider[]
): WorldEnvironmentResult {
  let syncResult: WorldEnvironmentResult | null = null;
  buildWorldEnvironmentAsync(scene, getTerrainHeight, colliders).then((res) => {
    syncResult = res;
  });
  const envGroup = new THREE.Group();
  envGroup.name = 'WorldEnvironment_Zones_SyncGroup';
  scene.add(envGroup);
  return {
    group: envGroup,
    colliders,
    update: (delta, time) => { syncResult?.update(delta, time); },
    setVegetationVisible: (visible) => { syncResult?.setVegetationVisible(visible); },
    setGrassDensity: (scale) => { syncResult?.setGrassDensity?.(scale); },
    setAmbientEffectsVisible: (visible) => { syncResult?.setAmbientEffectsVisible?.(visible); },
  };
}

// ============================================================================
// SINGLE SOURCE OF TRUTH RE-EXPORT (worldData.ts & worldLayoutConfig.ts)
// ============================================================================
export {
  WORLD_BOUNDS,
  WORLD_LANDMARKS,
  WORLD_LAYOUT_CONFIG,
  worldToMapPercent,
  mapPercentToWorld,
} from './worldData';

// ============================================================================
// EXACT BARYCENTRIC TERRAIN MESH HEIGHT SYSTEM
// ============================================================================
export const TERRAIN_GRID = {
  minX: WORLD_BOUNDS.minX,
  maxX: WORLD_BOUNDS.maxX,
  minZ: WORLD_BOUNDS.minZ,
  maxZ: WORLD_BOUNDS.maxZ,
  width: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX, // 3100
  depth: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ, // 2650
  cellSize: 2.5,
  segmentsX: 1240, // 3100 / 2.5
  segmentsZ: 1060, // 2650 / 2.5
  gridW: 1241,     // segmentsX + 1
  gridH: 1061,     // segmentsZ + 1
  centerX: (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2, // -100
  centerZ: (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2, // -125
};

let activeMeshGroundHeights: Float32Array | null = null;

export function setMeshGroundHeights(heights: Float32Array | number[]): void {
  if (heights instanceof Float32Array) {
    activeMeshGroundHeights = heights;
  } else {
    activeMeshGroundHeights = new Float32Array(heights);
  }
}

export function getMeshGroundHeights(): Float32Array | null {
  return activeMeshGroundHeights;
}

/**
 * Single source of truth for exact 3D rendered surface height via barycentric triangle interpolation.
 * Exactly matches GPU triangulation of PlaneGeometry (2 triangles per quad cell).
 */
export function getExactMeshGroundHeight(x: number, z: number, forVisualMesh = false): number {
  if (isFarOcean(x, z)) {
    return SEA_BED_HEIGHT;
  }
  if (forVisualMesh) {
    return getProceduralContinentHeight(x, z);
  }

  // 1. Walkable bridge deck corridors (BRIDGE_CONFIGS)
  for (const b of BRIDGE_CONFIGS) {
    const { lx, lz } = worldToBridgeLocal(x, z, b);
    if (Math.abs(lx) <= b.length * 0.49 && Math.abs(lz) <= b.width * 0.52) {
      return b.y;
    }
  }

  // 2. Coastal Wooden Harbor Pier at [20, 19..56]
  if (
    (Math.abs(x - 20) <= 2.8 && z >= 19 && z <= 56) ||
    (Math.abs(z - 44) <= 2.2 && Math.abs(x - 20) <= 12.0) ||
    (Math.abs(x - 20) <= 5.2 && z >= 43 && z <= 56)
  ) {
    return 1.85;
  }

  // 4. Bounds check and fallback
  if (
    !activeMeshGroundHeights ||
    x < TERRAIN_GRID.minX ||
    x > TERRAIN_GRID.maxX ||
    z < TERRAIN_GRID.minZ ||
    z > TERRAIN_GRID.maxZ
  ) {
    return getProceduralContinentHeight(x, z);
  }

  // 5. Grid cell conversion
  const u = (x - TERRAIN_GRID.minX) / TERRAIN_GRID.cellSize;
  const v = (z - TERRAIN_GRID.minZ) / TERRAIN_GRID.cellSize;
  const ix = Math.min(TERRAIN_GRID.segmentsX - 1, Math.max(0, Math.floor(u)));
  const iz = Math.min(TERRAIN_GRID.segmentsZ - 1, Math.max(0, Math.floor(v)));
  const tx = u - ix;
  const tz = v - iz;

  const i00 = iz * TERRAIN_GRID.gridW + ix;
  const i10 = i00 + 1;
  const i01 = (iz + 1) * TERRAIN_GRID.gridW + ix;
  const i11 = i01 + 1;

  const y00 = activeMeshGroundHeights[i00];
  const y10 = activeMeshGroundHeights[i10];
  const y01 = activeMeshGroundHeights[i01];
  const y11 = activeMeshGroundHeights[i11];

  // 6. Three.js PlaneGeometry triangle split along diagonal (i01 to i10)
  if (tx + tz <= 1) {
    // Upper-left triangle
    return y00 + tx * (y10 - y00) + tz * (y01 - y00);
  } else {
    // Lower-right triangle
    return y11 + (1 - tx) * (y01 - y11) + (1 - tz) * (y10 - y11);
  }
}

export {
  getLandmarkLayout,
  getBridgeLayout,
} from './worldLayoutConfig';
export type { WorldLandmarkLayout, WorldBridgeLayout, WorldLayoutConfig } from './worldLayoutConfig';

export {
  buildMainVillage,
  buildHarbor,
  buildAstraeaCastle,
  buildValKragorFort,
  buildDesertStructures,
  buildTitanLakeAndCanyon,
  buildDragonCaldera,
} from './world';


