import * as THREE from 'three';
import { getProceduralContinentHeight, getContinentBiomeSample, getTerrainVertexColor, isDesertBiome, getDistanceToRiver } from '../mapSampler';
import {
  createTreeMesh,
  createAncientPillarMesh,
  createCrystalMonolithMesh,
  createTreasureChestMesh,
  createNPCMesh,
  createVillageHouseMesh,
  createPierDockMesh,
  createBoatMesh,
  createAncientArchMesh,
  createBarrelMesh,
  createTavernMesh,
  createBlacksmithMesh,
  createMarketStallMesh,
  createArmorStallMesh,
  createStreetLampMesh,
  createVillageArchMesh,
  createCustomNPCMesh,
  createSuspensionBridgeMesh,
  createFortressGatehouseMesh,
  createFortressWatchtowerMesh,
  createFortressKeepMesh,
  createFortressWallMesh,
  createTrainingDummyMesh,
  createBonfireMesh,
  createGiantMushroomMesh,
  createShipwreckMesh,
  createIceCrystalSpireMesh,
  createDesertPyramidMesh,
  createDesertObeliskMesh,
  createDesertPalmMesh,
  createThunderSpireMesh,
  createJadePagodaMesh,
  createToriiGateMesh,
  createDragonSkullBonesMesh,
  createImperialPalaceMesh,
  createImperialFountainMesh,
  createImperialGatehouseMesh,
  createImperialWallMesh,
  createImperialBazaarStallMesh,
  createCherryBlossomTreeMesh,
  createImperialHeroStatueMesh,
  createSnowyPineTreeMesh,
  createIceBoulderMesh,
  createSnowDriftMoundMesh,
  createIceCrystalClusterMesh,
  createDesertMudBrickHouseMesh,
  createDesertPalaceMesh,
  createTajMahalPalaceMesh,
  createDesertPalaceFortressWallMesh,
  createReflectingPoolMesh,
  createDesertOilLanternMesh,
  createThroneRoomInteriorMesh,
  createDesertTentMesh,
  createDesertBazaarStallMesh,
  createDesertOasisWellMesh,
  createDesertCactusMesh,
  createInstancedDesertCacti,
  createInstancedDesertPalms,
  createInstancedStreetLamps,
  createInstancedVillageTrees,
  createSandstonePillarMesh,
  createCamelRestAreaMesh,
  createMageTowerExteriorMesh,
  createMageTowerInteriorMesh,
  createGrandMageEldrinMesh,
  createArchmagePyroMesh,
  createSorceressMayaMesh,
  createBambooClusterMesh,
  createMerchantGalleonMesh,
  createVikingWarshipMesh,
  createRowboatMesh,
  createIceSpikeMountainMesh,
  createWoodBarricadeMesh,
  createStoneBridgePierMesh,
  createStoneArchBridgeMesh,
  createObsidianDragonBridgeMesh,
  createDockStairRampMesh,
  createDockShorelineBoardwalkMesh,
  createBarracksMesh,
  createArcheryTargetMesh,
  createWeaponRackMesh,
  createCircularPlazaMesh,
  createSwampMangroveTreeMesh,
  createMossySwampBoulderMesh,
  createMurkySwampPoolMesh,
  createSwampMistPlaneMesh,
  createStoneRoadRibbonMesh,
  createLavaCrackMesh,
  createVolcanicPillarMesh,
  createVolcanicBasaltRockMesh,
  createLightningCrystalMesh,
  createAncientRitualTowerMesh,
  createAncientMonsterRibMesh,
  createCrackedSandstoneObeliskMesh,
  createSandVortexSwirlMesh,
  createMedievalTownhouseMesh,
  createDesertDomeHouseMesh,
} from './models';
import { InteriorManager, EntrancePortalConfig } from './interiorSystem';
import { buildWorldRoadNetwork, isPointOnRoad } from '../RoadSystem';
import { checkFrameBudget, yieldIfBudgetExceeded, yieldToChrome, cooperativeYield, hardYield } from './frameBudget';
import { SpatialLookupGrid } from './spatialGrid';
import { BRIDGE_CONFIGS, isStrictLandForProps, WATER_LEVEL, distToSegment, getDistanceToNearestRoad } from './worldData';
import { getLandmarkLayout } from './worldLayoutConfig';
import { SmoothLoadScheduler } from '../utils/asyncLoader';
import type { WorldCachePayload } from '../storage/worldCacheManager';
import {
  TERRAIN_GRID,
  setMeshGroundHeights,
  getExactMeshGroundHeight,
  isValidDryLand,
  createAncientTempleRuinsComplex,
} from './worldEnvironment';
import {
  clearWalkableSurfaces,
  registerWalkableSurface,
  getSolidGroundHeight,
} from './walkableSurfaceSystem';

export interface WorldCollider {
  type: 'box' | 'circle';
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
  minY?: number;
  maxY?: number;
  x?: number;
  z?: number;
  radius?: number;
  label?: string;
}

export interface WorldNPC {
  id: string;
  name: string;
  nameId: string;
  role: string;
  roleType: 'elder' | 'guard' | 'alchemist' | 'blacksmith' | 'bard' | 'fisherman' | 'villager' | 'commander' | 'seer' | 'frostsmith' | 'emperor' | 'marshal';
  group: THREE.Group;
  position: [number, number, number];
  dialogueId: string;
  icon?: string;
}


export interface WorldCheckpoint {
  id: string;
  name: string;
  nameId: string;
  group?: THREE.Group;
  crystal?: THREE.Mesh;
  auraRings?: THREE.Mesh[];
  light?: THREE.PointLight;
  beacon?: THREE.Mesh;
  position: [number, number, number];
  unlocked: boolean;
  setUnlocked?: (unlocked: boolean) => void;
}

export interface WorldObjects {
  scene: THREE.Scene;
  exteriorWorldGroup: THREE.Group;
  interiorManager?: InteriorManager;
  animatedProps?: Array<{ mesh: THREE.Object3D; speed: number; mode?: 'spinY' | 'bobY'; baseY?: number; phase?: number }>;
  terrainMesh: THREE.Mesh;
  oceanMesh: THREE.Mesh;
  chests: {
    id: string;
    group: THREE.Group;
    lid: THREE.Group;
    opened: boolean;
    position: [number, number, number];
  }[];
  npc: {
    id: string;
    group: THREE.Group;
    position: [number, number, number];
  };
  npcs: WorldNPC[];
  colliders: WorldCollider[];
  floatingCrystals: THREE.Mesh[];
  checkpoints: WorldCheckpoint[];
  particles: THREE.Points;
  lavaParticles?: THREE.Points;
  lavaSurfaceMat?: THREE.MeshStandardMaterial;
  lavaEmbers?: THREE.Points;
  decorativeProps?: THREE.Object3D[];
  pointLights?: THREE.PointLight[];
  dirLight?: THREE.DirectionalLight;
  hemiLight?: THREE.HemisphereLight;
  getTerrainHeight: (x: number, z: number, currentY?: number) => number;
}

/**
 * Standalone terrain elevation calculator matching procedural continental heights
 */
export function getTerrainHeight(x: number, z: number): number {
  return getExactMeshGroundHeight(x, z);
}

export function buildWorld(scene: THREE.Scene): WorldObjects {
  clearWalkableSurfaces();
  const decorativeProps: THREE.Object3D[] = [];
  const pointLights: THREE.PointLight[] = [];

  // Atmospheric Fog & Sky Color
  scene.fog = new THREE.FogExp2(0x8bc34a, 0.012);
  scene.background = new THREE.Color(0xaed581);

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xfff8e1, 0x4caf50, 0.7);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff9c4, 1.25);
  dirLight.position.set(50, 90, 45);
  dirLight.castShadow = true;
  const isMobileOrLowEnd = typeof navigator !== 'undefined' && (
    navigator.hardwareConcurrency <= 4 || /Android|iPhone|iPad/i.test(navigator.userAgent)
  );
  const shadowResolution = isMobileOrLowEnd ? 1024 : 1536;
  dirLight.shadow.mapSize.width = shadowResolution;
  dirLight.shadow.mapSize.height = shadowResolution;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 380;
  const d = 110;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Expanded World Terrain specifications (Span: X[-1250..650], Z[-650..1150])
  const terrainGeo = new THREE.PlaneGeometry(
    TERRAIN_GRID.width,
    TERRAIN_GRID.depth,
    TERRAIN_GRID.segmentsX,
    TERRAIN_GRID.segmentsZ
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;

  // 1. Initial procedural heights sampling
  const rawHeights = new Float32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i) + TERRAIN_GRID.centerX;
    const vz = posAttr.getZ(i) + TERRAIN_GRID.centerZ;
    rawHeights[i] = getProceduralContinentHeight(vx, vz);
  }

  // 2. Slope clamping and 3x3 smoothing filter to eliminate any vertical cliff wall spikes
  const smoothedHeights = new Float32Array(rawHeights);
  const gridW = TERRAIN_GRID.gridW;
  const gridH = TERRAIN_GRID.gridH;
  const maxSlopeDelta = 2.4;

  for (let pass = 0; pass < 2; pass++) {
    for (let gz = 1; gz < gridH - 1; gz++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const idx = gz * gridW + gx;
        if (rawHeights[idx] <= -5.8) continue;
        const vx = posAttr.getX(idx) + TERRAIN_GRID.centerX;
        const vz = posAttr.getZ(idx) + TERRAIN_GRID.centerZ;

        // Jangan haluskan pusat dasar palung sungai terdalam (< 3.2), tetapi haluskan tepian sungainya
        const dRiv = getDistanceToRiver(vx, vz);
        if (dRiv < 3.2) continue;

        const left = smoothedHeights[gz * gridW + (gx - 1)];
        const right = smoothedHeights[gz * gridW + (gx + 1)];
        const top = smoothedHeights[(gz - 1) * gridW + gx];
        const bottom = smoothedHeights[(gz + 1) * gridW + gx];

        const avg = (left + right + top + bottom) * 0.25;
        let cur = smoothedHeights[idx];

        if (dRiv < 13.5) {
          cur = cur * 0.45 + avg * 0.55;
        }
        if (cur - avg > maxSlopeDelta) {
          cur = avg + maxSlopeDelta;
        } else if (avg - cur > maxSlopeDelta) {
          cur = avg - maxSlopeDelta;
        }
        smoothedHeights[idx] = cur;
      }
    }
  }

  // Vertex colors generated seamlessly from unified mapSampler
  const colors = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i) + TERRAIN_GRID.centerX;
    const vz = posAttr.getZ(i) + TERRAIN_GRID.centerZ;
    const vy = smoothedHeights[i];
    posAttr.setY(i, vy);

    const col = getTerrainVertexColor(vx, vz, vy);
    colors[i * 3] = col[0] / 255;
    colors[i * 3 + 1] = col[1] / 255;
    colors[i * 3 + 2] = col[2] / 255;
  }

  posAttr.needsUpdate = true;
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  terrainGeo.computeBoundingSphere();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.08,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  const exteriorWorldGroup = new THREE.Group();
  exteriorWorldGroup.name = 'ExteriorWorldGroup';
  scene.add(exteriorWorldGroup);

  terrainMesh.position.set(TERRAIN_GRID.centerX, 0, TERRAIN_GRID.centerZ);
  terrainMesh.receiveShadow = true;
  exteriorWorldGroup.add(terrainMesh);

  setMeshGroundHeights(smoothedHeights);
  const getTerrainHeight = getExactMeshGroundHeight;

  let syncWorld: WorldObjects | null = null;
  const syncWorldResult: WorldObjects = {
    scene,
    exteriorWorldGroup,
    terrainMesh,
    oceanMesh: new THREE.Mesh(),
    chests: [],
    npc: { id: 'elder_vaelen', group: new THREE.Group(), position: [-50, 0.25, 120] },
    npcs: [],
    colliders: [],
    floatingCrystals: [],
    checkpoints: [],
    particles: new THREE.Points(),
    decorativeProps,
    pointLights,
    dirLight,
    hemiLight,
    getTerrainHeight: (x: number, z: number, currentY?: number) => getSolidGroundHeight(x, z, currentY),
  };
  populateWorldEntities(scene, exteriorWorldGroup, terrainMesh, getTerrainHeight, dirLight, hemiLight, decorativeProps, pointLights).then((res) => {
    syncWorld = res;
    if (syncWorld) Object.assign(syncWorldResult, syncWorld);
  });

  return syncWorldResult;
}
export async function buildWorldAsync(
  scene: THREE.Scene,
  onProgress?: (percent: number, statusText: string) => void,
  cachedTerrain?: WorldCachePayload | null
): Promise<WorldObjects> {
  clearWalkableSurfaces();
  const decorativeProps: THREE.Object3D[] = [];
  const pointLights: THREE.PointLight[] = [];
  const scheduler = new SmoothLoadScheduler();

  // Atmospheric Fog & Sky Color
  scene.fog = new THREE.FogExp2(0x8bc34a, 0.012);
  scene.background = new THREE.Color(0xaed581);

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xfff8e1, 0x4caf50, 0.7);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff9c4, 1.25);
  dirLight.position.set(50, 90, 45);
  dirLight.castShadow = true;
  const isMobileOrLowEndAsync = typeof navigator !== 'undefined' && (
    navigator.hardwareConcurrency <= 4 || /Android|iPhone|iPad/i.test(navigator.userAgent)
  );
  const shadowResolutionAsync = isMobileOrLowEndAsync ? 1024 : 1536;
  dirLight.shadow.mapSize.width = shadowResolutionAsync;
  dirLight.shadow.mapSize.height = shadowResolutionAsync;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 380;
  const d = 110;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Expanded World Terrain specifications (Span: X[-1250..650], Z[-650..1150])
  const terrainGeo = new THREE.PlaneGeometry(
    TERRAIN_GRID.width,
    TERRAIN_GRID.depth,
    TERRAIN_GRID.segmentsX,
    TERRAIN_GRID.segmentsZ
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;

  const canRestoreCachedTerrain =
    Boolean(cachedTerrain) &&
    cachedTerrain!.terrainPositions.length === vertexCount * 3 &&
    cachedTerrain!.terrainColors.length === vertexCount * 3 &&
    cachedTerrain!.terrainNormals.length === vertexCount * 3 &&
    cachedTerrain!.heightLookupGrid.length === vertexCount;

  if (canRestoreCachedTerrain && cachedTerrain) {
    // FAST PATH: Bulk-assign typed arrays langsung ke BufferAttribute tanpa sleep per tahap
    onProgress?.(20, 'Memuat dunia dari Cache Browser (Mode Cepat)...');

    (posAttr.array as Float32Array).set(cachedTerrain.terrainPositions);
    posAttr.needsUpdate = true;

    terrainGeo.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(new Float32Array(cachedTerrain.terrainColors), 3)
    );
    terrainGeo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(new Float32Array(cachedTerrain.terrainNormals), 3)
    );
    terrainGeo.computeBoundingSphere();
    setMeshGroundHeights(cachedTerrain.heightLookupGrid);

    onProgress?.(25, 'Memuat dunia dari Cache Browser (Mode Cepat)...');
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  } else {
    // 1. Initial procedural heights sampling (Pure time-sliced <= 6ms budget)
    onProgress?.(15, 'Membangun Geometri & Heightmap Benua Eldoria (15%)...');
    const rawHeights = new Float32Array(vertexCount);
    const gridW = TERRAIN_GRID.gridW;
    const gridH = TERRAIN_GRID.gridH;
    let tLast = performance.now();

    for (let gz = 0; gz < gridH; gz++) {
      for (let gx = 0; gx < gridW; gx++) {
        const idx = gz * gridW + gx;
        const vx = posAttr.getX(idx) + TERRAIN_GRID.centerX;
        const vz = posAttr.getZ(idx) + TERRAIN_GRID.centerZ;
        rawHeights[idx] = getProceduralContinentHeight(vx, vz);
      }
      if (performance.now() - tLast >= 6) {
        const pct = Math.round(15 + (gz / gridH) * 5);
        onProgress?.(pct, `Membangun Geometri & Heightmap (${pct}%)...`);
        await hardYield();
        tLast = performance.now();
      }
    }

    // 2. Slope clamping and 3x3 smoothing filter (Pure time-sliced <= 6ms budget)
    onProgress?.(20, 'Menghaluskan Kontur Elevasi & Palung Sungai (20%)...');
    const smoothedHeights = new Float32Array(rawHeights);
    const maxSlopeDelta = 2.4;
    tLast = performance.now();

    for (let pass = 0; pass < 2; pass++) {
      for (let gz = 1; gz < gridH - 1; gz++) {
        for (let gx = 1; gx < gridW - 1; gx++) {
          const idx = gz * gridW + gx;
          if (rawHeights[idx] <= -5.8) continue;
          const vx = posAttr.getX(idx) + TERRAIN_GRID.centerX;
          const vz = posAttr.getZ(idx) + TERRAIN_GRID.centerZ;

          const dRiv = getDistanceToRiver(vx, vz);
          if (dRiv < 3.2) continue;

          const left = smoothedHeights[gz * gridW + (gx - 1)];
          const right = smoothedHeights[gz * gridW + (gx + 1)];
          const top = smoothedHeights[(gz - 1) * gridW + gx];
          const bottom = smoothedHeights[(gz + 1) * gridW + gx];

          const avg = (left + right + top + bottom) * 0.25;
          let cur = smoothedHeights[idx];

          if (dRiv < 13.5) {
            cur = cur * 0.45 + avg * 0.55;
          }
          if (cur - avg > maxSlopeDelta) {
            cur = avg + maxSlopeDelta;
          } else if (avg - cur > maxSlopeDelta) {
            cur = avg - maxSlopeDelta;
          }
          smoothedHeights[idx] = cur;
        }
        if (performance.now() - tLast >= 6) {
          const pct = Math.round(20 + ((pass * gridH + gz) / (2 * gridH)) * 5);
          onProgress?.(pct, `Menghaluskan Kontur Elevasi (${pct}%)...`);
          await hardYield();
          tLast = performance.now();
        }
      }
    }

    // 3. Vertex colors generated seamlessly (Pure time-sliced <= 6ms budget)
    onProgress?.(25, 'Mewarnai Biome Terrain (25%)...');
    const colors = new Float32Array(vertexCount * 3);
    tLast = performance.now();

    for (let gz = 0; gz < gridH; gz++) {
      for (let gx = 0; gx < gridW; gx++) {
        const idx = gz * gridW + gx;
        const vx = posAttr.getX(idx) + TERRAIN_GRID.centerX;
        const vz = posAttr.getZ(idx) + TERRAIN_GRID.centerZ;
        const vy = smoothedHeights[idx];
        posAttr.setY(idx, vy);

        const col = getTerrainVertexColor(vx, vz, vy);
        colors[idx * 3] = col[0] / 255;
        colors[idx * 3 + 1] = col[1] / 255;
        colors[idx * 3 + 2] = col[2] / 255;
      }
      if (performance.now() - tLast >= 6) {
        const pct = Math.round(25 + (gz / gridH) * 5);
        onProgress?.(pct, `Mewarnai Biome Terrain (${pct}%)...`);
        await hardYield();
        tLast = performance.now();
      }
    }

    posAttr.needsUpdate = true;
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
    terrainGeo.computeBoundingSphere();

    setMeshGroundHeights(smoothedHeights);
  }

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.08,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  const exteriorWorldGroup = new THREE.Group();
  exteriorWorldGroup.name = 'ExteriorWorldGroup';
  scene.add(exteriorWorldGroup);

  terrainMesh.position.set(TERRAIN_GRID.centerX, 0, TERRAIN_GRID.centerZ);
  terrainMesh.receiveShadow = true;
  exteriorWorldGroup.add(terrainMesh);

  const getTerrainHeight = getExactMeshGroundHeight;

  // 4. Spatial Lookup Grid (2D TypedArray Float32 & Uint8) - Fast hydrate if cached
  const spatial = SpatialLookupGrid.get();
  const hydratedSpatial =
    canRestoreCachedTerrain &&
    cachedTerrain?.spatialHeightGrid &&
    cachedTerrain?.spatialFlagsGrid &&
    spatial.hydrate(cachedTerrain.spatialHeightGrid, cachedTerrain.spatialFlagsGrid);

  if (!hydratedSpatial) {
    onProgress?.(26, 'Membangun Spatial Lookup Grid & Heightmap (TypedArray)...');
    await spatial.buildAsync(getTerrainHeight, onProgress);
  } else {
    onProgress?.(31, 'Memuat dunia dari Cache Browser (Mode Cepat)...');
  }
  await scheduler.yieldIfNeeded(true);

  return await populateWorldEntities(scene, exteriorWorldGroup, terrainMesh, getTerrainHeight, dirLight, hemiLight, decorativeProps, pointLights, onProgress);
}


export async function buildHarbor(
  scene: THREE.Object3D,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps?: THREE.Object3D[]
): Promise<{ oceanMesh: THREE.Mesh }> {
  await cooperativeYield(4);
  // 1. VAST AZURE OCEAN WATER PLANE (Covers expanded world X:[-1250, 650], Z:[-650, 1150])
  // ==========================================
  const oceanGeo = new THREE.PlaneGeometry(3600, 3200, 32, 32);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0096c7,
    roughness: 0.1,
    metalness: 0.45,
    transparent: true,
    opacity: 0.82,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.set(-100, -0.25, -125);
  scene.add(oceanMesh);

  // ==========================================
  // 1b. EXTENDED CONTINUOUS COASTAL HARBOR (Sea Shoreline at Z = 20, X = 20)
  // Dermaga Kayu Pelabuhan Sanctuary memanjang lurus ke arah Samudra Selatan
  // ==========================================
  const dockY = -0.375; // Aligns top of 2.1m deck + 0.125m plank exactly at y = 1.85
  const harborX = 20;
  const harborZ = 20;

  // 1. Wooden Beach Ramp & Shoreline Boardwalk tepat di garis pantai (Z = 16..21)
  // Menghubungkan ujung jalan batu dari Desa Utama ke dermaga kayu tanpa celah
  const shorelineBoardwalk = createDockShorelineBoardwalkMesh(5.4, 6.0);
  shorelineBoardwalk.position.set(harborX, 0.15, harborZ - 2.0);
  scene.add(shorelineBoardwalk);
  registerWalkableSurface(shorelineBoardwalk, { label: 'Boardwalk Pantai Pelabuhan' });

  const beachRamp = createDockStairRampMesh(4.8, 4.0, 1.8);
  beachRamp.position.set(harborX, 0.05, harborZ);
  scene.add(beachRamp);
  registerWalkableSurface(beachRamp, { label: 'Ramp Tangga Pantai Pelabuhan' });

  // 2. Extended Main Straight Pier (Dermaga Utama Menjorok lurus ke Samudra Selatan Z: 21..49)
  const pierMain1 = createPierDockMesh({ length: 14.0, width: 4.8, pileDepth: 7.5, hasMooringBollards: true });
  pierMain1.position.set(harborX, dockY, harborZ + 1.0);
  scene.add(pierMain1);
  registerWalkableSurface(pierMain1, { label: 'Dermaga Utama Pelabuhan 1' });

  const pierMain2 = createPierDockMesh({ length: 14.0, width: 4.8, pileDepth: 8.0, hasMooringBollards: true });
  pierMain2.position.set(harborX, dockY, harborZ + 15.0);
  scene.add(pierMain2);
  registerWalkableSurface(pierMain2, { label: 'Dermaga Utama Pelabuhan 2' });

  const pierHeadPlatform = createPierDockMesh({ length: 12.0, width: 10.0, pileDepth: 9.0, hasLantern: true, lanternSide: 'both', hasMooringBollards: true });
  pierHeadPlatform.position.set(harborX, dockY, harborZ + 29.0);
  scene.add(pierHeadPlatform);
  registerWalkableSurface(pierHeadPlatform, { label: 'Platform Ujung Dermaga Pelabuhan' });

  // 3. Symmetrical Berthing Wings (Cabang Tempat Bersandar Kapal di Z = harborZ + 24)
  const wingWest1 = createPierDockMesh({ length: 14.0, width: 4.0, pileDepth: 7.5, hasLantern: true, lanternSide: 'left', hasMooringBollards: true });
  wingWest1.position.set(harborX - 2.4, dockY, harborZ + 24.0);
  wingWest1.rotation.y = Math.PI * 1.5;
  scene.add(wingWest1);
  registerWalkableSurface(wingWest1, { label: 'Sayap Dermaga Barat' });

  const wingEast1 = createPierDockMesh({ length: 14.0, width: 4.0, pileDepth: 7.5, hasLantern: true, lanternSide: 'right', hasMooringBollards: true });
  wingEast1.position.set(harborX + 2.4, dockY, harborZ + 24.0);
  wingEast1.rotation.y = Math.PI / 2;
  scene.add(wingEast1);
  registerWalkableSurface(wingEast1, { label: 'Sayap Dermaga Timur' });

  // 4. Moored Main Ships (100% Mengapung di atas Air Laut Dalam Samudra Selatan Z: 48..60)
  const galleon1 = createMerchantGalleonMesh();
  galleon1.position.set(harborX + 18.0, WATER_LEVEL - 0.15, harborZ + 24.0);
  galleon1.rotation.y = 0;
  scene.add(galleon1);

  const warship2 = createVikingWarshipMesh();
  warship2.position.set(harborX - 18.0, WATER_LEVEL - 0.15, harborZ + 24.0);
  warship2.rotation.y = 0;
  scene.add(warship2);

  const rowboatJoko = createRowboatMesh();
  rowboatJoko.position.set(harborX, WATER_LEVEL - 0.15, harborZ + 43.0);
  rowboatJoko.rotation.y = Math.PI / 2;
  scene.add(rowboatJoko);

  // Timber boarding gangways
  const gangwayMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const gangwayEast = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayEast.position.set(harborX + 15.5, 1.86, harborZ + 24.0);
  gangwayEast.userData.walkableSurface = true;
  scene.add(gangwayEast);
  registerWalkableSurface(gangwayEast, { label: 'Papan Naik Kapal Timur' });

  const gangwayWest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayWest.position.set(harborX - 15.5, 1.86, harborZ + 24.0);
  gangwayWest.userData.walkableSurface = true;
  scene.add(gangwayWest);
  registerWalkableSurface(gangwayWest, { label: 'Papan Naik Kapal Barat' });

  colliders.push(
    // Ship Hull Colliders (Outer water boundaries)
    { type: 'box', minX: harborX + 13.0, maxX: harborX + 23.0, minZ: harborZ + 18, maxZ: harborZ + 32, label: 'Lambung Kapal Dagang Emas 1' },
    { type: 'box', minX: harborX - 23.0, maxX: harborX - 13.0, minZ: harborZ + 18, maxZ: harborZ + 32, label: 'Lambung Kapal Perang Bershield' },
    // Pembatas tepi kiri & kanan dermaga utama (membiarkan jalur tengah terbuka untuk dilalui!)
    { type: 'box', minX: harborX - 2.65, maxX: harborX - 2.38, minZ: harborZ + 1, maxZ: harborZ + 21.8, label: 'Tepi Barat Dermaga Utama' },
    { type: 'box', minX: harborX + 2.38, maxX: harborX + 2.65, minZ: harborZ + 1, maxZ: harborZ + 21.8, label: 'Tepi Timur Dermaga Utama' },
    { type: 'box', minX: harborX - 2.65, maxX: harborX - 2.38, minZ: harborZ + 26.2, maxZ: harborZ + 29.0, label: 'Tepi Barat Leher Dermaga' },
    { type: 'box', minX: harborX + 2.38, maxX: harborX + 2.65, minZ: harborZ + 26.2, maxZ: harborZ + 29.0, label: 'Tepi Timur Leher Dermaga' }
  );

  await cooperativeYield(4);
  return { oceanMesh };
}


export async function buildMainVillage(
  scene: THREE.Object3D,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  npcs: WorldNPC[]
): Promise<{ elderGroup: THREE.Group; elderPos: [number, number, number] }> {
  const villageMainlandY = 2.00;
  await cooperativeYield(6);

  // Village Center at (X: 20, Z: -60)
  const fountainX = 20;
  const fountainZ = -60;

  // 2.1 Entrance Gates straddling actual main highways perpendicularly
  // A. North-West Solaria Desert Highway Gate (Road: [20, -60] -> [-40, -100], t = 0.55 => [-13, -82])
  const nwArchX = -13;
  const nwArchZ = -82;
  const nwRotY = Math.atan2(60, 40); // Aligns local Z with road vector (-60, -40) so pillars flank road perpendicularly
  const nwCos = Math.cos(nwRotY);
  const nwSin = Math.sin(nwRotY);
  const nwArchY = getTerrainHeight(nwArchX, nwArchZ);

  const villageWestArch = createVillageArchMesh('GERBANG BARAT SOLARIA');
  villageWestArch.position.set(nwArchX, nwArchY, nwArchZ);
  villageWestArch.rotation.y = nwRotY;
  scene.add(villageWestArch);
  colliders.push(
    { type: 'circle', x: nwArchX - 3.5 * nwCos, z: nwArchZ + 3.5 * nwSin, radius: 0.6, label: 'Gerbang Barat Solaria Pilar Kiri' },
    { type: 'circle', x: nwArchX + 3.5 * nwCos, z: nwArchZ - 3.5 * nwSin, radius: 0.6, label: 'Gerbang Barat Solaria Pilar Kanan' }
  );

  // B. East Astraea Imperial Highway Gate (Road: [20, -60] -> [95, -60], at X = 64, Z = -60)
  const eastArchX = 64;
  const eastArchZ = -60;
  const eastArchY = getTerrainHeight(eastArchX, eastArchZ);
  const villageEastArch = createVillageArchMesh('GERBANG TIMUR ASTRAEA');
  villageEastArch.position.set(eastArchX, eastArchY, eastArchZ);
  villageEastArch.rotation.y = Math.PI / 2;
  scene.add(villageEastArch);
  colliders.push(
    { type: 'circle', x: eastArchX, z: eastArchZ - 3.5, radius: 0.6, label: 'Gerbang Timur Pilar Utara' },
    { type: 'circle', x: eastArchX, z: eastArchZ + 3.5, radius: 0.6, label: 'Gerbang Timur Pilar Selatan' }
  );

  // C. South Harbor Promenade Gate (Road: [20, -60] -> [20, 20], at X = 20, Z = -16)
  const southArchX = 20;
  const southArchZ = -16;
  const southArchY = getTerrainHeight(southArchX, southArchZ);
  const villageArch = createVillageArchMesh('GERBANG SELATAN PELABUHAN');
  villageArch.position.set(southArchX, southArchY, southArchZ);
  villageArch.rotation.y = 0;
  scene.add(villageArch);
  colliders.push(
    { type: 'circle', x: southArchX - 3.5, z: southArchZ, radius: 0.6, label: 'Gerbang Selatan Pilar Barat' },
    { type: 'circle', x: southArchX + 3.5, z: southArchZ, radius: 0.6, label: 'Gerbang Selatan Pilar Timur' }
  );

  // 2.2 Sanctuary Grand Fountain in Central Town Plaza (X: 20, Z: -60)
  const waterGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.4, 16);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x00b4d8,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(fountainX, villageMainlandY + 0.15, fountainZ);
  scene.add(waterMesh);

  const fountainRim = new THREE.Mesh(
    new THREE.TorusGeometry(3.7, 0.35, 8, 20),
    new THREE.MeshLambertMaterial({ color: 0xb0bec5, flatShading: true })
  );
  fountainRim.rotation.x = Math.PI / 2;
  fountainRim.position.set(fountainX, villageMainlandY + 0.3, fountainZ);
  scene.add(fountainRim);

  const spoutMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 1.6, 8), spoutMat);
  spout.position.set(fountainX, villageMainlandY + 0.8, fountainZ);
  scene.add(spout);
  colliders.push({ type: 'circle', x: fountainX, z: fountainZ, radius: 3.9, label: 'Air Mancur Sanctuary' });

  // 2.2b Pelataran Batu Bundar Alun-Alun di Sekitar Air Mancur Sanctuary
  const sanctuaryPlazaRim = new THREE.Mesh(
    new THREE.RingGeometry(3.8, 8.2, 32),
    new THREE.MeshStandardMaterial({
      color: 0x857563,
      roughness: 0.9,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
    })
  );
  sanctuaryPlazaRim.rotation.x = -Math.PI / 2;
  sanctuaryPlazaRim.position.set(fountainX, villageMainlandY + 0.04, fountainZ);
  sanctuaryPlazaRim.receiveShadow = true;
  sanctuaryPlazaRim.userData.walkableSurface = true;
  scene.add(sanctuaryPlazaRim);
  registerWalkableSurface(sanctuaryPlazaRim, { label: 'Alun-Alun Air Mancur Sanctuary' });

  // ==========================================
  // ALL VILLAGE HOUSES & BUILDINGS (>= 15 units clearance from all road centerlines & river)
  // ==========================================
  // 2.3 Balai Tetua Vaelen (North Plaza: X: 22, Z: -88, dist >= 22 from all roads & river)
  const house1 = createVillageHouseMesh();
  const h1Pos = { x: 22, z: -88 };
  const h1Y = getTerrainHeight(h1Pos.x, h1Pos.z);
  house1.position.set(h1Pos.x, h1Y, h1Pos.z);
  house1.rotation.y = 0; // Facing South towards fountain plaza
  scene.add(house1);
  colliders.push({
    type: 'box',
    minX: h1Pos.x - 3.2,
    maxX: h1Pos.x + 3.2,
    minZ: h1Pos.z - 3.2,
    maxZ: h1Pos.z + 3.2,
    label: 'Kediaman Tetua Vaelen',
  });

  // 2.4 Village Tavern & Resting Inn: "Penginapan Eldoria" (North-East Plaza: X: 38, Z: -78)
  const tavern = createTavernMesh();
  const tavernPos = { x: 38, z: -78 };
  const tavernY = getTerrainHeight(tavernPos.x, tavernPos.z);
  tavern.position.set(tavernPos.x, tavernY, tavernPos.z);
  tavern.rotation.y = -Math.PI / 4;
  scene.add(tavern);
  colliders.push({
    type: 'box',
    minX: tavernPos.x - 3.8,
    maxX: tavernPos.x + 3.8,
    minZ: tavernPos.z - 3.6,
    maxZ: tavernPos.z + 3.6,
    label: 'Penginapan Eldoria',
  });

  // 2.5 Master Torvald's Blacksmith Forge (West of Harbor Road: X: 2, Z: -45, dist = 18 from road)
  const blacksmith = createBlacksmithMesh();
  const forgePos = { x: 2, z: -45 };
  const forgeY = getTerrainHeight(forgePos.x, forgePos.z);
  blacksmith.position.set(forgePos.x, forgeY, forgePos.z);
  blacksmith.rotation.y = Math.PI / 2;
  scene.add(blacksmith);
  colliders.push({
    type: 'box',
    minX: forgePos.x - 3.5,
    maxX: forgePos.x + 3.5,
    minZ: forgePos.z - 2.8,
    maxZ: forgePos.z + 2.8,
    label: 'Bengkel Pandai Besi',
  });

  // 2.6 Anya's Alchemy & Potion Stall (South-East Plaza Market: X: 38, Z: -42, dist = 18 from roads)
  const anyaStall = createMarketStallMesh(0x15803d);
  const anyaPos = { x: 38, z: -42 };
  const anyaY = getTerrainHeight(anyaPos.x, anyaPos.z);
  anyaStall.position.set(anyaPos.x, anyaY, anyaPos.z);
  anyaStall.rotation.y = -Math.PI / 2;
  scene.add(anyaStall);
  colliders.push({
    type: 'box',
    minX: anyaPos.x - 1.6,
    maxX: anyaPos.x + 1.6,
    minZ: anyaPos.z - 1.1,
    maxZ: anyaPos.z + 1.1,
    label: 'Kios Alkemis Anya',
  });

  // 2.7 Maya's Armor & Weapon Outfitter Stall (South-East Plaza Market: X: 38, Z: -32, dist = 18 from roads)
  const marketStall2 = createArmorStallMesh(0x1e3a8a);
  const m2Pos = { x: 38, z: -32 };
  const m2Y = getTerrainHeight(m2Pos.x, m2Pos.z);
  marketStall2.position.set(m2Pos.x, m2Y, m2Pos.z);
  marketStall2.rotation.y = -Math.PI / 2;
  scene.add(marketStall2);
  colliders.push({
    type: 'box',
    minX: m2Pos.x - 1.6,
    maxX: m2Pos.x + 1.6,
    minZ: m2Pos.z - 1.1,
    maxZ: m2Pos.z + 1.1,
    label: 'Toko Zirah & Perlengkapan Maya',
  });

  // ==========================================
  // 2.8 SYMMETRICAL RESIDENTIAL WARDS (All >= 15 units from all road centerlines)
  // ==========================================
  // West Quarter
  const house2 = createVillageHouseMesh();
  const h2Pos = { x: -16, z: -54 };
  house2.position.set(h2Pos.x, getTerrainHeight(h2Pos.x, h2Pos.z), h2Pos.z);
  house2.rotation.y = Math.PI / 3;
  scene.add(house2);
  colliders.push({
    type: 'box',
    minX: h2Pos.x - 2.5, maxX: h2Pos.x + 2.5, minZ: h2Pos.z - 2.5, maxZ: h2Pos.z + 2.5,
    label: 'Rumah Pengrajin Barat',
  });

  const house6 = createVillageHouseMesh();
  const h6Pos = { x: -16, z: -34 };
  house6.position.set(h6Pos.x, getTerrainHeight(h6Pos.x, h6Pos.z), h6Pos.z);
  house6.rotation.y = Math.PI / 2;
  scene.add(house6);
  colliders.push({
    type: 'box',
    minX: h6Pos.x - 2.5, maxX: h6Pos.x + 2.5, minZ: h6Pos.z - 2.5, maxZ: h6Pos.z + 2.5,
    label: 'Rumah Kebun Apel Barat',
  });

  const house7 = createVillageHouseMesh();
  const h7Pos = { x: 2, z: -26 };
  house7.position.set(h7Pos.x, getTerrainHeight(h7Pos.x, h7Pos.z), h7Pos.z);
  house7.rotation.y = Math.PI / 2;
  scene.add(house7);
  colliders.push({
    type: 'box',
    minX: h7Pos.x - 2.5, maxX: h7Pos.x + 2.5, minZ: h7Pos.z - 2.5, maxZ: h7Pos.z + 2.5,
    label: 'Pondok Herbalis Barat',
  });

  // East Quarter
  const house3 = createVillageHouseMesh();
  const h3Pos = { x: 56, z: -78 };
  house3.position.set(h3Pos.x, getTerrainHeight(h3Pos.x, h3Pos.z), h3Pos.z);
  house3.rotation.y = 0;
  scene.add(house3);
  colliders.push({
    type: 'box',
    minX: h3Pos.x - 2.5, maxX: h3Pos.x + 2.5, minZ: h3Pos.z - 2.5, maxZ: h3Pos.z + 2.5,
    label: 'Rumah Petani Lembah Timur',
  });

  const house4 = createVillageHouseMesh();
  const h4Pos = { x: 54, z: -40 };
  house4.position.set(h4Pos.x, getTerrainHeight(h4Pos.x, h4Pos.z), h4Pos.z);
  house4.rotation.y = Math.PI;
  scene.add(house4);
  colliders.push({
    type: 'box',
    minX: h4Pos.x - 2.5, maxX: h4Pos.x + 2.5, minZ: h4Pos.z - 2.5, maxZ: h4Pos.z + 2.5,
    label: 'Rumah Padang Rumput Timur',
  });

  const house5 = createVillageHouseMesh();
  const h5Pos = { x: 54, z: -22 };
  house5.position.set(h5Pos.x, getTerrainHeight(h5Pos.x, h5Pos.z), h5Pos.z);
  house5.rotation.y = -Math.PI / 2;
  scene.add(house5);
  colliders.push({
    type: 'box',
    minX: h5Pos.x - 2.5, maxX: h5Pos.x + 2.5, minZ: h5Pos.z - 2.5, maxZ: h5Pos.z + 2.5,
    label: 'Pondok Penjaga Padang Timur',
  });

  // Coastal Lookout Cottage (Moved off Harbor road to dry elevated lawn at X: 38, Z: -18, 18 units east of road)
  const house8 = createVillageHouseMesh();
  const h8Pos = { x: 38, z: -18 };
  house8.position.set(h8Pos.x, getTerrainHeight(h8Pos.x, h8Pos.z), h8Pos.z);
  house8.rotation.y = -Math.PI / 2;
  scene.add(house8);
  colliders.push({
    type: 'box',
    minX: h8Pos.x - 2.5, maxX: h8Pos.x + 2.5, minZ: h8Pos.z - 2.5, maxZ: h8Pos.z + 2.5,
    label: 'Pondok Nelayan Pesisir',
  });

  // 2.9 Street Lamps flanking Plaza, Harbor South, East Highway, & NW Solaria Highway
  const nwL1x = 20 - 15;
  const nwL1z = -60 - 10;
  const nwL2x = 20 - 27;
  const nwL2z = -60 - 18;
  const rawLampPositions: [number, number][] = [
    // Central Fountain Plaza Rim
    [13, -53], [27, -53], [13, -67], [27, -67],
    // South Promenade to Harbor
    [16.5, -44], [23.5, -44],
    [16.5, -30], [23.5, -30],
    [16.5, -20], [23.5, -20],
    [16.5, -4], [23.5, -4],
    // East Astraea Highway
    [34, -63.5], [34, -56.5],
    [48, -63.5], [48, -56.5],
    // NW Solaria Highway
    [nwL1x - 3.4 * nwCos, nwL1z + 3.4 * nwSin], [nwL1x + 3.4 * nwCos, nwL1z - 3.4 * nwSin],
    [nwL2x - 3.4 * nwCos, nwL2z + 3.4 * nwSin], [nwL2x + 3.4 * nwCos, nwL2z - 3.4 * nwSin],
  ];
  const villageLampTransforms = rawLampPositions
    .filter(([lx, lz]) => !isPointOnRoad(lx, lz))
    .map(([lx, lz]) => {
      const ly = getTerrainHeight(lx, lz);
      colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Jalan' });
      return { x: lx, y: ly, z: lz };
    });
  const villageLampsMesh = createInstancedStreetLamps(villageLampTransforms);
  scene.add(villageLampsMesh);

  // Village barrels placed neatly beside buildings
  const barrelPositions: [number, number][] = [
    [forgePos.x - 3.5, forgePos.z - 2.0],
    [tavernPos.x - 4.0, tavernPos.z - 2.0],
    [anyaPos.x + 2.0, anyaPos.z],
  ];
  barrelPositions.forEach(([bx, bz]) => {
    const by = getTerrainHeight(bx, bz);
    const barrel = createBarrelMesh();
    barrel.position.set(bx, by, bz);
    scene.add(barrel);
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 0.45, label: 'Tong Kayu' });
  });

  // ==========================================
  // SANCTUARY NPCS (Organized, Dry, & Accessible Positions)
  // ==========================================
  // NPC 1: Tetua Vaelen (Porch of Elder Lodge)
  const elderGroup = createNPCMesh();
  const elderX = 22;
  const elderZ = -84.2;
  const elderPos: [number, number, number] = [elderX, getTerrainHeight(elderX, elderZ), elderZ];
  elderGroup.position.set(...elderPos);
  elderGroup.rotation.y = 0; // Facing South towards fountain plaza
  scene.add(elderGroup);
  npcs.push({
    id: 'elder_vaelen',
    name: 'Elder Vaelen',
    nameId: 'Tetua Vaelen',
    role: 'Sanctuary Guardian',
    roleType: 'elder',
    group: elderGroup,
    position: elderPos,
    dialogueId: 'elder_quest_titan',
  });

  // NPC 2: Kapten Ronald (Beside NW Entrance Gate Pillar)
  const guardGroup = createCustomNPCMesh('guard');
  const guardX = nwArchX + 4.4 * nwCos;
  const guardZ = nwArchZ - 4.4 * nwSin;
  const guardPos: [number, number, number] = [guardX, getTerrainHeight(guardX, guardZ), guardZ];
  guardGroup.position.set(...guardPos);
  guardGroup.rotation.y = nwRotY;
  scene.add(guardGroup);
  npcs.push({
    id: 'guard_ronald',
    name: 'Captain Ronald',
    nameId: 'Kapten Ronald',
    role: 'Gate Commander',
    roleType: 'guard',
    group: guardGroup,
    position: guardPos,
    dialogueId: 'guard_intro',
  });
  await cooperativeYield(6);

  // NPC 3: Anya (Alkemis & Herbalis) - At her potion counter
  const anyaGroup = createCustomNPCMesh('alchemist');
  const anyaNPCPos: [number, number, number] = [anyaPos.x - 2.2, getTerrainHeight(anyaPos.x - 2.2, anyaPos.z), anyaPos.z];
  anyaGroup.position.set(...anyaNPCPos);
  anyaGroup.rotation.y = -Math.PI / 2;
  scene.add(anyaGroup);
  npcs.push({
    id: 'alchemist_anya',
    name: 'Anya the Herbalist',
    nameId: 'Anya Alkemis',
    role: 'Master Apothecary',
    roleType: 'alchemist',
    group: anyaGroup,
    position: anyaNPCPos,
    dialogueId: 'alchemist_intro',
  });

  // NPC 4: Master Torvald (Pandai Besi Kuat) - At his forge
  const torvaldGroup = createCustomNPCMesh('blacksmith');
  const torvaldPos: [number, number, number] = [forgePos.x + 3.0, getTerrainHeight(forgePos.x + 3.0, forgePos.z), forgePos.z];
  torvaldGroup.position.set(...torvaldPos);
  torvaldGroup.rotation.y = Math.PI / 2;
  scene.add(torvaldGroup);
  npcs.push({
    id: 'blacksmith_torvald',
    name: 'Master Torvald',
    nameId: 'Master Torvald',
    role: 'Master Blacksmith',
    roleType: 'blacksmith',
    group: torvaldGroup,
    position: torvaldPos,
    dialogueId: 'blacksmith_torvald',
  });
  await cooperativeYield(6);

  // NPC 5: Lyra the Wandering Bard - Outside tavern terrace
  const bardGroup = createCustomNPCMesh('bard');
  const bardX = 35;
  const bardZ = -73.5;
  const bardPos: [number, number, number] = [bardX, getTerrainHeight(bardX, bardZ), bardZ];
  bardGroup.position.set(...bardPos);
  bardGroup.rotation.y = -Math.PI / 4;
  scene.add(bardGroup);
  npcs.push({
    id: 'bard_lyra',
    name: 'Lyra the Bard',
    nameId: 'Lyra Sang Bard',
    role: 'Wandering Minstrel',
    roleType: 'bard',
    group: bardGroup,
    position: bardPos,
    dialogueId: 'bard_lyra',
  });

  // NPC 6: Nelayan Pak Joko (Coastal Fisherman on extended harbor pier)
  const jokoGroup = createCustomNPCMesh('fisherman');
  const jokoPos: [number, number, number] = [20.0, 1.85, 49.0]; // At seaward harbor pier head looking out to open sea
  jokoGroup.position.set(...jokoPos);
  jokoGroup.rotation.y = Math.PI; // Facing South towards open ocean
  scene.add(jokoGroup);
  npcs.push({
    id: 'fisherman_joko',
    name: 'Old Fisherman Joko',
    nameId: 'Pak Joko Nelayan',
    role: 'Ocean Angler',
    roleType: 'fisherman',
    group: jokoGroup,
    position: jokoPos,
    dialogueId: 'fisherman_joko',
  });
  await cooperativeYield(6);

  // NPC 7: Kael (Warga Desa Muda) - By coastal alleyway
  const kaelGroup = createCustomNPCMesh('villager');
  const kaelX = 27;
  const kaelZ = -38;
  const kaelPos: [number, number, number] = [kaelX, getTerrainHeight(kaelX, kaelZ), kaelZ];
  kaelGroup.position.set(...kaelPos);
  kaelGroup.rotation.y = -Math.PI / 4;
  scene.add(kaelGroup);
  npcs.push({
    id: 'villager_kael',
    name: 'Kael the Scout',
    nameId: 'Kael Pedagang Gelap',
    role: 'Shadow Relics Trader',
    roleType: 'villager',
    group: kaelGroup,
    position: kaelPos,
    dialogueId: 'villager_kael',
  });

  // NPC 8: Maya (Toko Zirah & Perlengkapan Tempur) - At her armor counter
  const mayaGroup = createCustomNPCMesh('villager');
  const mayaPos: [number, number, number] = [m2Pos.x - 2.2, getTerrainHeight(m2Pos.x - 2.2, m2Pos.z), m2Pos.z];
  mayaGroup.position.set(...mayaPos);
  mayaGroup.rotation.y = -Math.PI / 2;
  scene.add(mayaGroup);
  npcs.push({
    id: 'villager_maya',
    name: 'Maya the Outfitter',
    nameId: 'Maya Toko Zirah',
    role: 'Armor & Equipment Shop',
    roleType: 'villager',
    group: mayaGroup,
    position: mayaPos,
    dialogueId: 'villager_maya',
  });
  await cooperativeYield(6);

  return { elderGroup, elderPos };
}


export async function buildAstraeaCastle(
  scene: THREE.Object3D,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  _pointLights: THREE.PointLight[],
  npcs: WorldNPC[]
): Promise<void> {
  await cooperativeYield(4);
  const astLm = getLandmarkLayout('astraea');
  const cx = astLm?.x ?? 575;
  const cz = astLm?.z ?? -495;
  const half = 85; // 170x170 relative to (cx, cz)
  const baseY = getTerrainHeight(cx, cz);

  const astraeaStoneMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.85,
    metalness: 0.08,
  });
  const astraeaTrimMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.8,
  });

  // 1. Walkable Grand Stone Avenue & Central Imperial Plaza Floor Slabs
  const nsAvenue = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 130), astraeaStoneMat);
  nsAvenue.position.set(cx, baseY + 0.02, cz + 18);
  nsAvenue.receiveShadow = true;
  scene.add(nsAvenue);
  registerWalkableSurface(nsAvenue, { label: 'Jalan Raya Selatan-Utara Astraea' });

  const ewAvenue = new THREE.Mesh(new THREE.BoxGeometry(162, 0.14, 13), astraeaTrimMat);
  ewAvenue.position.set(cx, baseY + 0.015, cz + 18);
  ewAvenue.receiveShadow = true;
  scene.add(ewAvenue);
  registerWalkableSurface(ewAvenue, { label: 'Jalan Raya Timur-Barat Astraea' });

  const plaza = createCircularPlazaMesh(26);
  plaza.position.set(cx, baseY + 0.04, cz + 18);
  scene.add(plaza);
  registerWalkableSurface(plaza, { label: 'Alun-Alun Utama Ibukota Astraea' });

  // 2. Monumental Emperor's Sun Palace (scaled 1.85x) facing South (+Z)
  const imperialPalace = createImperialPalaceMesh();
  imperialPalace.position.set(cx, baseY, cz - 54);
  imperialPalace.scale.set(1.85, 1.85, 1.85);
  imperialPalace.rotation.y = 0;
  scene.add(imperialPalace);
  registerWalkableSurface(imperialPalace, { label: 'Tangga & Podium Istana Kaisar Astraea' });
  colliders.push({ type: 'box', minX: cx - 26, maxX: cx + 26, minZ: cz - 81, maxZ: cz - 26, label: 'Istana Kaisar Astraea' });

  // 3. Grand Celestial Fountain & 4 Marble Hero Statues
  const celestialFountain = createImperialFountainMesh();
  celestialFountain.position.set(cx, baseY, cz + 18);
  celestialFountain.scale.set(1.2, 1.2, 1.2);
  scene.add(celestialFountain);
  decorativeProps.push(celestialFountain);
  colliders.push({ type: 'circle', x: cx, z: cz + 18, radius: 4.5, label: 'Air Mancur Alun-Alun Astraea' });

  const statueSpots: [number, number, number][] = [
    [cx - 20, cz + 36, Math.PI * 0.25],
    [cx + 20, cz + 36, -Math.PI * 0.25],
    [cx - 20, cz, Math.PI * 0.75],
    [cx + 20, cz, -Math.PI * 0.75],
  ];
  statueSpots.forEach(([sx, sz, rot]) => {
    const sy = getTerrainHeight(sx, sz);
    const statue = createImperialHeroStatueMesh();
    statue.position.set(sx, sy, sz);
    statue.rotation.y = rot;
    scene.add(statue);
    colliders.push({ type: 'circle', x: sx, z: sz, radius: 1.8, label: 'Patung Pahlawan Kekaisaran' });
  });

  // 4. City Gates (South Gate & East Gate)
  const southGate = createImperialGatehouseMesh();
  southGate.position.set(cx, getTerrainHeight(cx, cz + half), cz + half);
  southGate.rotation.y = 0;
  scene.add(southGate);
  colliders.push({ type: 'box', minX: cx - 10, maxX: cx - 4.8, minZ: cz + half - 3.5, maxZ: cz + half + 3.5, label: 'Pilar Gerbang Selatan Astraea' });
  colliders.push({ type: 'box', minX: cx + 4.8, maxX: cx + 10, minZ: cz + half - 3.5, maxZ: cz + half + 3.5, label: 'Pilar Gerbang Selatan Astraea' });

  const eastGate = createImperialGatehouseMesh();
  eastGate.position.set(cx + half, getTerrainHeight(cx + half, cz), cz);
  eastGate.rotation.y = Math.PI / 2;
  scene.add(eastGate);
  colliders.push({ type: 'box', minX: cx + half - 3.5, maxX: cx + half + 3.5, minZ: cz - 10, maxZ: cz - 4.8, label: 'Pilar Gerbang Timur Astraea' });
  colliders.push({ type: 'box', minX: cx + half - 3.5, maxX: cx + half + 3.5, minZ: cz + 4.8, maxZ: cz + 10, label: 'Pilar Gerbang Timur Astraea' });

  // 5. 170x170 City Curtain Walls
  const wallNorth = createImperialWallMesh(170);
  wallNorth.position.set(cx, getTerrainHeight(cx, cz - half), cz - half);
  scene.add(wallNorth);
  colliders.push({ type: 'box', minX: cx - half, maxX: cx + half, minZ: cz - half - 2.2, maxZ: cz - half + 2.2, label: 'Tembok Utara Astraea' });

  const wallWest = createImperialWallMesh(170);
  wallWest.position.set(cx - half, getTerrainHeight(cx - half, cz), cz);
  wallWest.rotation.y = Math.PI / 2;
  scene.add(wallWest);
  colliders.push({ type: 'box', minX: cx - half - 2.2, maxX: cx - half + 2.2, minZ: cz - half, maxZ: cz + half, label: 'Tembok Barat Astraea' });

  const wallSouthW = createImperialWallMesh(75);
  wallSouthW.position.set(cx - 47.5, getTerrainHeight(cx - 47.5, cz + half), cz + half);
  scene.add(wallSouthW);
  colliders.push({ type: 'box', minX: cx - half, maxX: cx - 10, minZ: cz + half - 2.2, maxZ: cz + half + 2.2, label: 'Tembok Selatan Astraea' });

  const wallSouthE = createImperialWallMesh(75);
  wallSouthE.position.set(cx + 47.5, getTerrainHeight(cx + 47.5, cz + half), cz + half);
  scene.add(wallSouthE);
  colliders.push({ type: 'box', minX: cx + 10, maxX: cx + half, minZ: cz + half - 2.2, maxZ: cz + half + 2.2, label: 'Tembok Selatan Astraea' });

  const wallEastN = createImperialWallMesh(75);
  wallEastN.position.set(cx + half, getTerrainHeight(cx + half, cz - 47.5), cz - 47.5);
  wallEastN.rotation.y = Math.PI / 2;
  scene.add(wallEastN);
  colliders.push({ type: 'box', minX: cx + half - 2.2, maxX: cx + half + 2.2, minZ: cz - half, maxZ: cz - 10, label: 'Tembok Timur Astraea' });

  const wallEastS = createImperialWallMesh(75);
  wallEastS.position.set(cx + half, getTerrainHeight(cx + half, cz + 47.5), cz + 47.5);
  wallEastS.rotation.y = Math.PI / 2;
  scene.add(wallEastS);
  colliders.push({ type: 'box', minX: cx + half - 2.2, maxX: cx + half + 2.2, minZ: cz + 10, maxZ: cz + half, label: 'Tembok Timur Astraea' });

  // 6. Flush Blue-Gold Corner & Mid-Wall Watchtowers
  const towerPositions: [number, number][] = [
    [cx - half, cz - half],
    [cx + half, cz - half],
    [cx - half, cz + half],
    [cx + half, cz + half],
    [cx, cz - half],
    [cx - half, cz],
  ];
  towerPositions.forEach(([tx, tz]) => {
    const ty = getTerrainHeight(tx, tz);
    const tower = createFortressWatchtowerMesh();
    tower.position.set(tx, ty, tz);
    tower.scale.set(1.35, 1.35, 1.35);
    scene.add(tower);
    colliders.push({ type: 'circle', x: tx, z: tz, radius: 4.5, label: 'Menara Penjaga Ibukota Astraea' });
  });

  // 7. West Residential Quarter: 6 Two-Story Medieval Townhouses
  const resHouses: Array<{ x: number; z: number; rot: number; style: 'blue' | 'terracotta'; awning?: boolean }> = [
    { x: cx - 64, z: cz - 55, rot: Math.PI / 2, style: 'blue' },
    { x: cx - 38, z: cz - 55, rot: Math.PI / 2, style: 'terracotta' },
    { x: cx - 64, z: cz - 12, rot: Math.PI / 2, style: 'terracotta' },
    { x: cx - 38, z: cz - 12, rot: Math.PI / 2, style: 'blue' },
    { x: cx - 62, z: cz + 48, rot: 0, style: 'blue' },
    { x: cx - 36, z: cz + 48, rot: 0, style: 'terracotta' },
  ];
  resHouses.forEach((h) => {
    const hy = getTerrainHeight(h.x, h.z);
    const houseMesh = createMedievalTownhouseMesh(h.style, !!h.awning);
    houseMesh.position.set(h.x, hy, h.z);
    houseMesh.rotation.y = h.rot;
    scene.add(houseMesh);
    colliders.push({ type: 'box', minX: h.x - 3.6, maxX: h.x + 3.6, minZ: h.z - 3.4, maxZ: h.z + 3.4, label: 'Rumah Bangsawan Astraea' });
  });

  // 8. East Commercial, Market, & Tavern District
  // Grand Tavern & Guildhall (Enterable GTA Door interior 'astraea_tavern')
  const astTavX = cx + 48;
  const astTavZ = cz + 46;
  const tavernY = getTerrainHeight(astTavX, astTavZ);
  const astraeaTavern = createTavernMesh();
  astraeaTavern.position.set(astTavX, tavernY, astTavZ);
  astraeaTavern.scale.set(1.35, 1.35, 1.35);
  astraeaTavern.rotation.y = 0;
  scene.add(astraeaTavern);
  registerWalkableSurface(astraeaTavern, { label: 'Undakan Tavern & Guildhall Astraea' });
  colliders.push({ type: 'box', minX: astTavX - 8, maxX: astTavX + 8, minZ: astTavZ - 8, maxZ: astTavZ + 7.5, label: 'Tavern & Toko Ibukota Astraea' });

  // Merchant Townhouses facing West Plaza
  const shopBuildings: Array<{ x: number; z: number; rot: number; style: 'blue' | 'terracotta' }> = [
    { x: cx + 60, z: cz - 52, rot: -Math.PI / 2, style: 'terracotta' },
    { x: cx + 60, z: cz - 20, rot: -Math.PI / 2, style: 'blue' },
  ];
  shopBuildings.forEach((s) => {
    const sy = getTerrainHeight(s.x, s.z);
    const shopMesh = createMedievalTownhouseMesh(s.style, true);
    shopMesh.position.set(s.x, sy, s.z);
    shopMesh.rotation.y = s.rot;
    scene.add(shopMesh);
    colliders.push({ type: 'box', minX: s.x - 3.6, maxX: s.x + 3.6, minZ: s.z - 3.4, maxZ: s.z + 3.4, label: 'Toko Pedagang Astraea' });
  });

  // Colorful Market & Armory Stalls lining East Market Square
  const marketStalls = [
    { mesh: createImperialBazaarStallMesh(0x1d4ed8), x: cx + 32, z: cz + 28, rot: Math.PI },
    { mesh: createImperialBazaarStallMesh(0xb91c1c), x: cx + 46, z: cz + 28, rot: Math.PI },
    { mesh: createMarketStallMesh(0xd97706), x: cx + 32, z: cz + 6, rot: 0 },
    { mesh: createArmorStallMesh(), x: cx + 46, z: cz + 6, rot: 0 },
  ];
  marketStalls.forEach((st) => {
    st.mesh.position.set(st.x, getTerrainHeight(st.x, st.z), st.z);
    st.mesh.rotation.y = st.rot;
    scene.add(st.mesh);
    colliders.push({ type: 'box', minX: st.x - 2.3, maxX: st.x + 2.3, minZ: st.z - 1.8, maxZ: st.z + 1.8, label: 'Kios Pasar Ibukota Astraea' });
  });

  // 9. Royal Blossom Gardens & Avenue Street Lamps
  const gardenTrees: [number, number][] = [
    [cx - 58, cz - 76], [cx - 32, cz - 76], [cx + 32, cz - 76], [cx + 58, cz - 76],
    [cx - 22, cz - 36], [cx + 22, cz - 36], [cx - 22, cz + 68], [cx + 22, cz + 68],
  ];
  gardenTrees.forEach(([tx, tz]) => {
    const tree = createCherryBlossomTreeMesh();
    tree.position.set(tx, getTerrainHeight(tx, tz), tz);
    scene.add(tree);
    colliders.push({ type: 'circle', x: tx, z: tz, radius: 1.0, label: 'Pohon Sakura Taman Ibukota' });
  });

  const lampCoords: [number, number][] = [
    [cx - 9, cz + 72], [cx + 9, cz + 72], [cx - 9, cz + 48], [cx + 9, cz + 48],
    [cx - 9, cz - 12], [cx + 9, cz - 12], [cx + 32, cz + 24], [cx + 66, cz + 24],
  ];
  lampCoords.forEach(([lx, lz]) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(lx, getTerrainHeight(lx, lz), lz);
    scene.add(lamp);
  });

  // 10. Outdoor Astraea Sentinels (Emperor Aurelius, Marshal Vane, & Lyra reside inside interiors)
  const g1Group = createCustomNPCMesh('guard');
  const g1Pos: [number, number, number] = [cx - 7, getTerrainHeight(cx - 7, cz + 79), cz + 79];
  g1Group.position.set(...g1Pos);
  scene.add(g1Group);
  npcs.push({
    id: 'npc_astraea_guard',
    name: 'Penjaga Gerbang Astraea',
    nameId: 'Kapten Penjaga Gerbang Astraea',
    role: 'Royal Gate Sentinel',
    roleType: 'guard',
    group: g1Group,
    position: g1Pos,
    dialogueId: 'guard_astraea',
    icon: '🛡️',
  });

  const g2Group = createCustomNPCMesh('guard');
  const g2Pos: [number, number, number] = [cx + 12, getTerrainHeight(cx + 12, cz + 26), cz + 26];
  g2Group.position.set(...g2Pos);
  g2Group.rotation.y = -Math.PI / 4;
  scene.add(g2Group);
  npcs.push({
    id: 'npc_astraea_herald',
    name: 'Herald Kerajaan',
    nameId: 'Herald Alun-Alun Astraea',
    role: 'Imperial Herald',
    roleType: 'guard',
    group: g2Group,
    position: g2Pos,
    dialogueId: 'guard_astraea',
    icon: '🎺',
  });
}

export async function buildValKragorFort(
  scene: THREE.Object3D,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  npcs: WorldNPC[],
  floatingCrystals: THREE.Mesh[]
): Promise<void> {
  await cooperativeYield(4);
  const cx = 580;
  const cz = 130;
  const half = 55; // 110x110: X [525..635], Z [75..185]
  const baseY = getTerrainHeight(cx, cz);

  const fortRoadMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.92,
  });

  // 1. Stone Courtyard Roads (North Gate to Command Keep + East-West Wing Avenue)
  const nsFortRoad = new THREE.Mesh(new THREE.BoxGeometry(13, 0.16, 86), fortRoadMat);
  nsFortRoad.position.set(cx, baseY + 0.02, 115);
  nsFortRoad.receiveShadow = true;
  scene.add(nsFortRoad);
  registerWalkableSurface(nsFortRoad, { label: 'Jalan Batu Benteng Val-Kragor' });

  const ewFortRoad = new THREE.Mesh(new THREE.BoxGeometry(82, 0.14, 11), fortRoadMat);
  ewFortRoad.position.set(cx, baseY + 0.015, 118);
  ewFortRoad.receiveShadow = true;
  scene.add(ewFortRoad);
  registerWalkableSurface(ewFortRoad, { label: 'Pelataran Tengah Benteng Val-Kragor' });

  // 2. North Iron Gatehouse at (580, 75) facing North (-Z) to meet road_mage_valkragor
  const northGate = createFortressGatehouseMesh();
  northGate.position.set(cx, getTerrainHeight(cx, cz - half), cz - half);
  northGate.rotation.y = Math.PI;
  scene.add(northGate);
  colliders.push({ type: 'box', minX: cx - 10, maxX: cx - 4.5, minZ: cz - half - 3.5, maxZ: cz - half + 3.5, label: 'Pilar Gerbang Utara Val-Kragor' });
  colliders.push({ type: 'box', minX: cx + 4.5, maxX: cx + 10, minZ: cz - half - 3.5, maxZ: cz - half + 3.5, label: 'Pilar Gerbang Utara Val-Kragor' });

  // 3. Perimeter Fortress Curtain Walls (110x110 flush to corners)
  const vkWallSouth = createFortressWallMesh(110);
  vkWallSouth.position.set(cx, getTerrainHeight(cx, cz + half), cz + half);
  scene.add(vkWallSouth);
  colliders.push({ type: 'box', minX: cx - half, maxX: cx + half, minZ: cz + half - 2.2, maxZ: cz + half + 2.2, label: 'Tembok Selatan Val-Kragor' });

  const vkWallWest = createFortressWallMesh(110);
  vkWallWest.position.set(cx - half, getTerrainHeight(cx - half, cz), cz);
  vkWallWest.rotation.y = Math.PI / 2;
  scene.add(vkWallWest);
  colliders.push({ type: 'box', minX: cx - half - 2.2, maxX: cx - half + 2.2, minZ: cz - half, maxZ: cz + half, label: 'Tembok Barat Val-Kragor' });

  const vkWallEast = createFortressWallMesh(110);
  vkWallEast.position.set(cx + half, getTerrainHeight(cx + half, cz), cz);
  vkWallEast.rotation.y = Math.PI / 2;
  scene.add(vkWallEast);
  colliders.push({ type: 'box', minX: cx + half - 2.2, maxX: cx + half + 2.2, minZ: cz - half, maxZ: cz + half, label: 'Tembok Timur Val-Kragor' });

  const vkWallNorthW = createFortressWallMesh(46);
  vkWallNorthW.position.set(cx - 32, getTerrainHeight(cx - 32, cz - half), cz - half);
  scene.add(vkWallNorthW);
  colliders.push({ type: 'box', minX: cx - half, maxX: cx - 9, minZ: cz - half - 2.2, maxZ: cz - half + 2.2, label: 'Tembok Utara Barat Val-Kragor' });

  const vkWallNorthE = createFortressWallMesh(46);
  vkWallNorthE.position.set(cx + 32, getTerrainHeight(cx + 32, cz - half), cz - half);
  scene.add(vkWallNorthE);
  colliders.push({ type: 'box', minX: cx + 9, maxX: cx + half, minZ: cz - half - 2.2, maxZ: cz - half + 2.2, label: 'Tembok Utara Timur Val-Kragor' });

  // 4. STRICTLY 4 Flush Corner Watchtowers (ZERO outer protruding towers!)
  const cornerTowers: [number, number][] = [
    [cx - half, cz - half],
    [cx + half, cz - half],
    [cx - half, cz + half],
    [cx + half, cz + half],
  ];
  cornerTowers.forEach(([tx, tz]) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(tx, getTerrainHeight(tx, tz), tz);
    scene.add(tower);
    colliders.push({ type: 'circle', x: tx, z: tz, radius: 3.6, label: 'Menara Sudut Benteng Val-Kragor' });
  });

  // 5. Command Keep (Aula Komandan Benteng - Enterable GTA Interior)
  const fortressKeep = createFortressKeepMesh();
  fortressKeep.position.set(cx, baseY, 166);
  fortressKeep.rotation.y = Math.PI;
  scene.add(fortressKeep);
  registerWalkableSurface(fortressKeep, { label: 'Undakan Kastil Komando Val-Kragor' });
  colliders.push({ type: 'box', minX: 571, maxX: 589, minZ: 155, maxZ: 177, label: 'Aula Komandan Val-Kragor' });

  // 6. West Wing: Blacksmith Forge (Enterable GTA Interior), Barracks, & Warrior House
  const goranForge = createBlacksmithMesh();
  goranForge.position.set(546, getTerrainHeight(546, 108), 108);
  goranForge.scale.set(1.35, 1.35, 1.35);
  goranForge.rotation.y = Math.PI / 2;
  scene.add(goranForge);
  registerWalkableSurface(goranForge, { label: 'Pelataran Pandai Besi Val-Kragor' });
  colliders.push({ type: 'box', minX: 539, maxX: 552, minZ: 102, maxZ: 114, label: 'Bengkel Pandai Besi Val-Kragor' });

  const vkBarracks = createBarracksMesh();
  vkBarracks.position.set(546, getTerrainHeight(546, 150), 150);
  vkBarracks.rotation.y = Math.PI / 2;
  scene.add(vkBarracks);
  colliders.push({ type: 'box', minX: 539, maxX: 553, minZ: 143, maxZ: 157, label: 'Barak Pasukan Val-Kragor' });

  const houseNW = createVillageHouseMesh();
  houseNW.position.set(546, getTerrainHeight(546, 90), 90);
  houseNW.scale.set(1.15, 1.15, 1.15);
  houseNW.rotation.y = Math.PI / 2;
  scene.add(houseNW);
  colliders.push({ type: 'box', minX: 542, maxX: 550, minZ: 86, maxZ: 94, label: 'Pos Prajurit Barat' });

  const houseNE = createVillageHouseMesh();
  houseNE.position.set(614, getTerrainHeight(614, 92), 92);
  houseNE.scale.set(1.15, 1.15, 1.15);
  houseNE.rotation.y = -Math.PI / 2;
  scene.add(houseNE);
  colliders.push({ type: 'box', minX: 610, maxX: 618, minZ: 88, maxZ: 96, label: 'Pos Prajurit Timur' });

  // 7. East Wing: Martial Combat & Archery Training Ground
  const rack1 = createWeaponRackMesh();
  rack1.position.set(600, getTerrainHeight(600, 114), 114);
  scene.add(rack1);
  const rack2 = createWeaponRackMesh();
  rack2.position.set(600, getTerrainHeight(600, 162), 162);
  scene.add(rack2);

  const dummyPositions: [number, number][] = [
    [612, 128],
    [612, 138],
    [612, 148],
  ];
  dummyPositions.forEach(([dx, dz]) => {
    const dummy = createTrainingDummyMesh();
    dummy.position.set(dx, getTerrainHeight(dx, dz), dz);
    dummy.rotation.y = -Math.PI / 2;
    scene.add(dummy);
    colliders.push({ type: 'circle', x: dx, z: dz, radius: 0.75, label: 'Boneka Latihan Val-Kragor' });
  });

  const archerySpots: [number, number][] = [
    [624, 130],
    [624, 146],
  ];
  archerySpots.forEach(([ax, az]) => {
    const target = createArcheryTargetMesh();
    target.position.set(ax, getTerrainHeight(ax, az), az);
    target.rotation.y = -Math.PI / 2;
    scene.add(target);
    colliders.push({ type: 'circle', x: ax, z: az, radius: 0.85, label: 'Sasaran Panah Val-Kragor' });
  });

  const campfire = createBonfireMesh();
  campfire.position.set(596, getTerrainHeight(596, 138), 138);
  scene.add(campfire);
  colliders.push({ type: 'circle', x: 596, z: 138, radius: 1.2, label: 'Api Unggun Kamp Latihan' });

  const lampSpots: [number, number][] = [
    [572, 88], [588, 88], [572, 112], [588, 112], [572, 144], [588, 144],
  ];
  lampSpots.forEach(([lx, lz]) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(lx, getTerrainHeight(lx, lz), lz);
    scene.add(lamp);
  });

  // 8. Outdoor Val-Kragor NPCs (Commander Brann & Goran Forge reside inside interiors)
  const eloraGroup = createCustomNPCMesh('alchemist');
  const eloraPos: [number, number, number] = [604, getTerrainHeight(604, 128), 128];
  eloraGroup.position.set(...eloraPos);
  eloraGroup.rotation.y = -Math.PI / 2;
  scene.add(eloraGroup);
  npcs.push({
    id: 'npc_elora',
    name: 'Peramal Elora',
    nameId: 'Kapten Elora',
    role: 'Quartermaster & Tactical Seer',
    roleType: 'seer',
    group: eloraGroup,
    position: eloraPos,
    dialogueId: 'seer_elora',
    icon: '🔮',
  });

  const fortGuards: Array<{ id: string; pos: [number, number]; rot: number; label: string }> = [
    { id: 'npc_valkragor_guard1', pos: [574.5, 81], rot: Math.PI, label: 'Penjaga Gerbang Val-Kragor' },
    { id: 'npc_valkragor_guard2', pos: [585.5, 81], rot: Math.PI, label: 'Penjaga Gerbang Val-Kragor' },
    { id: 'npc_valkragor_guard3', pos: [575.5, 152], rot: Math.PI, label: 'Pengawal Aula Komandan' },
  ];
  fortGuards.forEach((fg) => {
    const posY = getTerrainHeight(fg.pos[0], fg.pos[1]);
    const gGroup = createCustomNPCMesh('guard');
    gGroup.position.set(fg.pos[0], posY, fg.pos[1]);
    gGroup.rotation.y = fg.rot;
    scene.add(gGroup);
    npcs.push({
      id: fg.id,
      name: fg.label,
      nameId: fg.label,
      role: 'Fortress Garrison',
      roleType: 'guard',
      group: gGroup,
      position: [fg.pos[0], posY, fg.pos[1]],
      dialogueId: 'guard_valkragor',
      icon: '⚔️',
    });
  });

  // ==========================================
  // 2.9 SISTEM JEMBATAN PERPOTONGAN SUNGAI (BRIDGE_CONFIGS SINGLE SOURCE OF TRUTH)
  // Menyeberangi sungai tegak lurus dengan abutment padat, ramp pendekatan ke kontur tanah, dan pagar pembatas terarah
  // ==========================================
  for (const b of BRIDGE_CONFIGS) {
    const cosY = Math.cos(b.rotationY);
    const sinY = Math.sin(b.rotationY);
    let bridgeMesh: THREE.Group;

    if (b.type === 'suspension') {
      bridgeMesh = createSuspensionBridgeMesh(b.length);
      bridgeMesh.position.set(b.x, b.y, b.z);
      bridgeMesh.rotation.y = b.rotationY;
      scene.add(bridgeMesh);

      const chasmStonePier = createStoneBridgePierMesh(4.4);
      chasmStonePier.position.set(b.x, -2.2, b.z);
      scene.add(chasmStonePier);
    } else {
      const bankProbeOffset = b.length * 0.5 + 3.2;
      const bankLeftX = b.x - bankProbeOffset * cosY;
      const bankLeftZ = b.z + bankProbeOffset * sinY;
      const bankRightX = b.x + bankProbeOffset * cosY;
      const bankRightZ = b.z - bankProbeOffset * sinY;

      const leftTerrainY = getTerrainHeight(bankLeftX, bankLeftZ, true);
      const rightTerrainY = getTerrainHeight(bankRightX, bankRightZ, true);
      const leftBankDropY = leftTerrainY - b.y - 0.14;
      const rightBankDropY = rightTerrainY - b.y - 0.14;

      bridgeMesh =
        b.id === 'bridge_caldera_north'
          ? createObsidianDragonBridgeMesh(b.length, b.width, 5.4, {
            leftBankDropY,
            rightBankDropY,
            rampLength: 4.6,
          })
          : createStoneArchBridgeMesh(b.length, b.width, Math.max(2.7, b.y + 2.6), {
            leftBankDropY,
            rightBankDropY,
            rampLength: 3.4,
          });
      bridgeMesh.position.set(b.x, b.y, b.z);
      bridgeMesh.rotation.y = b.rotationY;
      scene.add(bridgeMesh);
    }

    // Daftarkan seluruh lantai dek & ramp pendekatan sebagai permukaan solid walkable
    registerWalkableSurface(bridgeMesh, { label: `Jembatan ${b.nameId}` });

    // Pasang collider pagar kiri & kanan akurat mengikuti sudut rotasi jembatan
    const railSideOffset = b.width * 0.5 + 0.28;
    if (Math.abs(sinY) < 0.05) {
      colliders.push(
        { type: 'box', minX: b.x - b.length / 2, maxX: b.x + b.length / 2, minZ: b.z - railSideOffset - 0.15, maxZ: b.z - railSideOffset + 0.15, label: `Pagar ${b.nameId} Sisi Utara` },
        { type: 'box', minX: b.x - b.length / 2, maxX: b.x + b.length / 2, minZ: b.z + railSideOffset - 0.15, maxZ: b.z + railSideOffset + 0.15, label: `Pagar ${b.nameId} Sisi Selatan` }
      );
    } else if (Math.abs(cosY) < 0.05) {
      colliders.push(
        { type: 'box', minX: b.x - railSideOffset - 0.15, maxX: b.x - railSideOffset + 0.15, minZ: b.z - b.length / 2, maxZ: b.z + b.length / 2, label: `Pagar ${b.nameId} Sisi Barat` },
        { type: 'box', minX: b.x + railSideOffset - 0.15, maxX: b.x + railSideOffset + 0.15, minZ: b.z - b.length / 2, maxZ: b.z + b.length / 2, label: `Pagar ${b.nameId} Sisi Timur` }
      );
    } else {
      const halfSpan = b.length * 0.48;
      const step = 1.8;
      for (let lx = -halfSpan; lx <= halfSpan + 0.01; lx += step) {
        const clampedLx = Math.min(halfSpan, lx);
        for (const sideZ of [-railSideOffset, railSideOffset]) {
          const rx = b.x + clampedLx * cosY + sideZ * sinY;
          const rz = b.z - clampedLx * sinY + sideZ * cosY;
          colliders.push({
            type: 'circle',
            x: rx,
            z: rz,
            radius: 0.30,
            label: `Pagar ${b.nameId}`,
          });
        }
      }
    }
  }

  // 2.9b Jaringan Jalan Raya & Jalan Setapak Terstruktur Benua Eldoria (Road Network & Path System)
  // Menghubungkan Pelabuhan, Alun-Alun Sanctuary, Ibukota Astraea, Puncak Mage Tower,
  // Benteng Val-Kragor, Jalur Sutra Gurun Solaria, dan Ziarah Danau Titan.
  buildWorldRoadNetwork(scene, getTerrainHeight, colliders);

  // ==========================================
  // 2.12 CORAL COVE & PIRATE SHIPWRECK
  // (South Azure Ocean Reef)
  // ==========================================
  const shipwreck = createShipwreckMesh();
  shipwreck.position.set(86, -0.2, 254);
  shipwreck.rotation.y = -0.6;
  scene.add(shipwreck);
  colliders.push({
    type: 'box',
    minX: 82,
    maxX: 90,
    minZ: 249,
    maxZ: 259,
    label: 'Bangkai Kapal Bajak Laut',
  });

  // ==========================================
  // 3. ANCIENT SUNKEN RUINS OF VAEL (Upstream Far-West Outskirts: X: -105..-135, Z: 25..55)
  // Separated far from village settlement border (> 100 units from village plaza)
  // ==========================================
  // Monumental Ancient Archway Gate (Direlokasi ke Daratan Aman Tenggara X: 145, Z: 5)
  if (isValidDryLand(145, 5, 3.0) && getDistanceToNearestRoad(145, 5) >= 9.5) {
    const ancientArch = createAncientArchMesh();
    const archY = getTerrainHeight(145, 5);
    ancientArch.position.set(145, archY, 5);
    ancientArch.rotation.y = Math.PI / 2;
    scene.add(ancientArch);
    colliders.push(
      { type: 'circle', x: 145, z: 2.5, radius: 0.9, label: 'Pilar Gapura Kuno Kiri' },
      { type: 'circle', x: 145, z: 7.5, radius: 0.9, label: 'Pilar Gapura Kuno Kanan' }
    );
  }

  // Spatial Ancient Pillars scattered across the dry ruined sanctuary
  const ruinsPositions = [
    { x: 138, z: -1 },
    { x: 130, z: 5 },
    { x: 135, z: 15 },
    { x: 122, z: -3 },
    { x: 115, z: 9 },
    { x: 120, z: 21 },
    { x: 128, z: 25 },
    { x: 140, z: 21 },
  ];
  ruinsPositions.forEach((pos) => {
    if (!isValidDryLand(pos.x, pos.z, 1.5) || getDistanceToNearestRoad(pos.x, pos.z) < 9.5) return;
    const pillar = createAncientPillarMesh();
    const py = getTerrainHeight(pos.x, pos.z);
    pillar.position.set(pos.x, py, pos.z);
    pillar.rotation.y = Math.random() * Math.PI;
    scene.add(pillar);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 0.85, label: 'Pilar Kuno' });
  });

  // ==========================================
  // 4. MYSTIC FOREST & MANA CRYSTALS (Direlokasi ke Daratan Aman X: 128..174, Z: 42..94)
  // ==========================================
  [
    { x: 148, z: 60 },
    { x: 158, z: 76 },
    { x: 138, z: 52 },
  ].forEach(({ x: mx, z: mz }) => {
    if (!isValidDryLand(mx, mz, 2.0) || getDistanceToNearestRoad(mx, mz) < 9.5) return;
    const mono = createCrystalMonolithMesh();
    mono.group.position.set(mx, getTerrainHeight(mx, mz), mz);
    scene.add(mono.group);
    floatingCrystals.push(mono.crystal);
  });

  // Mystic Pine Forest dense groves
  for (let i = 0; i < 45; i++) {
    if (i > 0 && i % 15 === 0) await cooperativeYield(4);
    const px = 128 + Math.random() * 46;
    const pz = 42 + Math.random() * 52;
    if (isDesertBiome(px, pz)) continue;
    if (isPointOnRoad(px, pz) || getDistanceToNearestRoad(px, pz) < 9.5 || !isValidDryLand(px, pz, 1.5)) continue;

    const py = getTerrainHeight(px, pz);
    const pine = createTreeMesh('pine');
    pine.position.set(px, py, pz);
    const s = 0.9 + Math.random() * 0.6;
    pine.scale.set(s, s, s);
    pine.rotation.y = Math.random() * Math.PI * 2;
    scene.add(pine);
    decorativeProps.push(pine);
    colliders.push({ type: 'circle', x: px, z: pz, radius: 0.55 * s, label: 'Pohon Pinus Mistis' });
  }

  // General wilderness trees in plains
  const treeCount = 60;
  for (let i = 0; i < treeCount; i++) {
    if (i > 0 && i % 15 === 0) await cooperativeYield(4);
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 120;
    const tx = Math.cos(angle) * dist;
    const tz = -190 + Math.sin(angle) * dist;

    // Strict Anti-Overlap & Cross-Biome Exclusion: hanya daratan kering & bebas jalan >= 9.5 unit
    if (!isValidDryLand(tx, tz, 1.5) || getDistanceToNearestRoad(tx, tz) < 9.5) continue;
    if (isDesertBiome(tx, tz)) continue;
    if (getDistanceToRiver(tx, tz) < 18.0) continue;
    const inSanctuaryMainland = (tx >= -70 && tx <= -10 && tz >= 115 && tz <= 175);
    const inSanctuaryHarborOcean = (Math.abs(tx - -140) <= 45 && tz >= 180);
    const inBridgeHighwayCorridor = (tx >= 115 && tx <= 360 && (Math.abs(tz - 47) <= 12.0 || Math.abs(tz - 75) <= 12.0));
    const inValKragor = (tx >= 518 && tx <= 642 && tz >= 68 && tz <= 192);
    const inDragonCaldera = Math.hypot(tx - -40, tz - 340) < 65;
    const inAstraea = (tx >= 368 && tx <= 552 && tz >= -512 && tz <= -328);
    const inTitan = Math.hypot(tx - 235, tz - -380) < 55;
    const inSandworm = Math.hypot(tx - (-840), tz - (-260)) < 78;
    const inSultanKingdom = (tx >= -622 && tx <= -458 && tz >= -588 && tz <= -422);
    const inMageTower = Math.hypot(tx - 270, tz - -260) < 46;
    const inMossValley = Math.hypot(tx - 465, tz - 35) < 45;
    if (inSanctuaryMainland || inSanctuaryHarborOcean || inBridgeHighwayCorridor || inValKragor || inDragonCaldera || inAstraea || inTitan || inSandworm || inSultanKingdom || inMageTower || inMossValley) continue;

    // Pembersihan rintangan jalan: Jangan spawn pohon padang rumput di atas permukaan jalan
    if (isPointOnRoad(tx, tz)) continue;

    const ty = getTerrainHeight(tx, tz);
    const tree = createTreeMesh(i % 3 === 0 ? 'fantasy' : 'oak');
    tree.position.set(tx, ty, tz);
    const scale = 0.8 + Math.random() * 0.6;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    decorativeProps.push(tree);

    colliders.push({
      type: 'circle',
      x: tx,
      z: tz,
      radius: 0.55 * scale,
      label: 'Pohon Padang Rumput',
    });
  }

  // Curated Village Landscaping Trees (InstancedMesh - High Performance 60 FPS, Zero Stutter!)
  const curatedVillageTrees: { x: number; z: number; type: 'oak' | 'fantasy' | 'pine'; scale: number }[] = [
    // Pekarangan Barat Desa Utama [20, -60]
    { x: -24, z: -46, type: 'oak', scale: 1.1 },
    { x: -24, z: -58, type: 'oak', scale: 1.2 },
    { x: -24, z: -70, type: 'oak', scale: 1.1 },
    // Pekarangan Timur Desa Utama
    { x: 58, z: -46, type: 'oak', scale: 1.1 },
    { x: 58, z: -58, type: 'oak', scale: 1.2 },
    { x: 58, z: -70, type: 'oak', scale: 1.1 },
    // Gerbang Utara Desa Utama
    { x: 12, z: -88, type: 'pine', scale: 1.2 },
    { x: 28, z: -88, type: 'pine', scale: 1.2 },
    // Taman Belakang Penginapan & Balairung
    { x: 6, z: -92, type: 'oak', scale: 1.0 },
    { x: 34, z: -92, type: 'oak', scale: 1.0 },
    // Pinggiran Pesisir Kering Selatan Desa
    { x: -12, z: -16, type: 'oak', scale: 1.15 },
    { x: 52, z: -16, type: 'oak', scale: 1.15 },
  ];

  const villageTreesData = curatedVillageTrees
    .filter(vt => !isPointOnRoad(vt.x, vt.z) && !isDesertBiome(vt.x, vt.z) && isValidDryLand(vt.x, vt.z, 1.5) && getDistanceToNearestRoad(vt.x, vt.z) >= 9.5)
    .map(vt => {
      colliders.push({
        type: 'circle',
        x: vt.x,
        z: vt.z,
        radius: 0.55 * vt.scale,
        label: 'Pohon Desa',
      });
      return {
        x: vt.x,
        y: getTerrainHeight(vt.x, vt.z),
        z: vt.z,
        scale: vt.scale,
        rotationY: ((vt.x * 17 + vt.z * 23) % 100) / 100 * Math.PI * 2,
      };
    });
  const villageTreesMesh = createInstancedVillageTrees(villageTreesData);
  scene.add(villageTreesMesh);

  await cooperativeYield(4);
}


export async function buildDesertStructures(
  scene: THREE.Object3D,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  _decorativeProps: THREE.Object3D[],
  _pointLights: THREE.PointLight[],
  npcs: WorldNPC[]
): Promise<void> {
  await cooperativeYield(4);

  // ------------------------------------------
  // 9A. ANCIENT PYRAMIDS & OBELISKS OF SOLARIA (-760, -240)
  // ------------------------------------------
  const pyramidSpots = [
    { x: -760, z: -240, scale: 1.5, rot: 0.25 },
    { x: -710, z: -185, scale: 0.95, rot: -0.4 },
    { x: -815, z: -185, scale: 0.85, rot: 0.6 },
  ];
  for (const ps of pyramidSpots) {
    if (!isDesertBiome(ps.x, ps.z)) continue;
    const py = getTerrainHeight(ps.x, ps.z);
    const pyramid = createDesertPyramidMesh();
    pyramid.scale.setScalar(ps.scale);
    pyramid.position.set(ps.x, py, ps.z);
    pyramid.rotation.y = ps.rot;
    scene.add(pyramid);
    colliders.push({ type: 'circle', x: ps.x, z: ps.z, radius: 13 * ps.scale, label: 'Piramida Kuno Solaria' });
  }

  // ------------------------------------------
  // 9B. KERJAAN GURUN SOLARIA & ISTANA SULTAN (150x150 Plaza: X [-615..-465], Z [-580..-430])
  // ------------------------------------------
  const kcX = -540;
  const kcZ = -506;
  const kingdomY = getTerrainHeight(kcX, kcZ);

  const sandstonePlazaMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.86,
  });
  const sandstoneAvenueMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.82,
  });

  // Grand Walkable Sandstone Kingdom Plaza & Main Avenue
  const kingdomSlab = new THREE.Mesh(new THREE.BoxGeometry(144, 0.16, 144), sandstonePlazaMat);
  kingdomSlab.position.set(kcX, kingdomY + 0.02, kcZ);
  kingdomSlab.receiveShadow = true;
  scene.add(kingdomSlab);
  registerWalkableSurface(kingdomSlab, { label: 'Pelataran Batu Pasir Kerajaan Solaria' });

  const kingdomAxisRoad = new THREE.Mesh(new THREE.BoxGeometry(16, 0.22, 112), sandstoneAvenueMat);
  kingdomAxisRoad.position.set(kcX, kingdomY + 0.04, -482);
  kingdomAxisRoad.receiveShadow = true;
  scene.add(kingdomAxisRoad);
  registerWalkableSurface(kingdomAxisRoad, { label: 'Jalan Utama Istana Sultan Solaria' });

  // Monumental Taj Mahal Sultan Palace (scaled 1.15x) at (-540, -548) facing South (+Z)
  const palaceY = getTerrainHeight(-540, -548);
  const solariaPalace = createTajMahalPalaceMesh();
  solariaPalace.position.set(-540, palaceY, -548);
  solariaPalace.scale.set(1.15, 1.15, 1.15);
  solariaPalace.rotation.y = 0;
  scene.add(solariaPalace);
  registerWalkableSurface(solariaPalace, { label: 'Undakan & Pelataran Istana Sultan' });
  colliders.push({ type: 'box', minX: -560, maxX: -520, minZ: -569, maxZ: -527, label: 'Istana Megah Sultan Solaria' });

  // Grand Turquoise Reflecting Pool & Palm Garden Promenade directly south of Palace stairs
  const reflectingPool = createReflectingPoolMesh(26, 8.2);
  reflectingPool.position.set(-540, kingdomY + 0.04, -496);
  reflectingPool.rotation.y = Math.PI / 2;
  scene.add(reflectingPool);
  colliders.push({ type: 'box', minX: -544.6, maxX: -535.4, minZ: -509.5, maxZ: -482.5, label: 'Kolam Refleksi Istana Sultan' });

  // Perimeter Desert Arched Sandstone Walls around 150x150 Kingdom (opening South Gate at x=-540, z=-434)
  const sandWallMat = new THREE.MeshStandardMaterial({ color: 0xe6c79c, roughness: 0.86, flatShading: true });
  const sandCopingMat = new THREE.MeshStandardMaterial({ color: 0xc28e5c, roughness: 0.78 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.75, roughness: 0.25 });
  const buildSolariaWall = (len: number, x: number, z: number, rotY = 0) => {
    const wg = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(len, 5.4, 2.2), sandWallMat);
    core.position.y = 2.7;
    core.receiveShadow = true;
    core.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.4, 0.55, 2.6), sandCopingMat);
    cap.position.y = 5.6;
    wg.add(core, cap);
    wg.position.set(x, kingdomY, z);
    wg.rotation.y = rotY;
    scene.add(wg);
  };
  buildSolariaWall(146, kcX, -578, 0);
  colliders.push({ type: 'box', minX: -613, maxX: -467, minZ: -580.2, maxZ: -575.8, label: 'Tembok Utara Solaria' });

  buildSolariaWall(144, -613, kcZ, Math.PI / 2);
  colliders.push({ type: 'box', minX: -615.2, maxX: -610.8, minZ: -578, maxZ: -434, label: 'Tembok Barat Solaria' });

  buildSolariaWall(144, -467, kcZ, Math.PI / 2);
  colliders.push({ type: 'box', minX: -469.2, maxX: -464.8, minZ: -578, maxZ: -434, label: 'Tembok Timur Solaria' });

  buildSolariaWall(62, -582, -434, 0);
  colliders.push({ type: 'box', minX: -613, maxX: -551, minZ: -436.2, maxZ: -431.8, label: 'Tembok Selatan Barat Solaria' });

  buildSolariaWall(62, -498, -434, 0);
  colliders.push({ type: 'box', minX: -529, maxX: -467, minZ: -436.2, maxZ: -431.8, label: 'Tembok Selatan Timur Solaria' });

  // Corner Minaret Turrets for Solaria Perimeter
  [[-613, -578], [-467, -578], [-613, -434], [-467, -434]].forEach(([tx, tz]) => {
    const turret = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 9.2, 8), sandWallMat);
    shaft.position.y = 4.6;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 10), goldTrimMat);
    dome.position.y = 9.8;
    turret.add(shaft, dome);
    turret.position.set(tx, kingdomY, tz);
    scene.add(turret);
    colliders.push({ type: 'circle', x: tx, z: tz, radius: 3.1, label: 'Menara Sudut Kerajaan Solaria' });
  });

  // Sandstone Pillars framing South Entrance Gate (-540, -434)
  for (const gx of [-550, -530]) {
    const p = createSandstonePillarMesh(1.3);
    p.position.set(gx, kingdomY, -434);
    scene.add(p);
    colliders.push({ type: 'circle', x: gx, z: -434, radius: 1.4, label: 'Pilar Gerbang Solaria' });
  }

  // Twin Palm & Golden Oil Lantern Rows flanking Reflecting Pool Promenade
  for (let pz = -516; pz <= -472; pz += 11) {
    for (const px of [-552, -528]) {
      const palm = createDesertPalmMesh();
      palm.scale.setScalar(0.95);
      palm.position.set(px, kingdomY, pz);
      scene.add(palm);
      const lantern = createDesertOilLanternMesh();
      lantern.position.set(px + (px < -540 ? 4.5 : -4.5), kingdomY, pz + 3);
      scene.add(lantern);
    }
  }

  // West Residential Wing: 6 Middle Eastern Domed Sandstone Houses
  const desertHomes: Array<{ x: number; z: number; rot: number; v: number }> = [
    { x: -592, z: -545, rot: Math.PI / 2, v: 0 },
    { x: -572, z: -545, rot: Math.PI / 2, v: 1 },
    { x: -592, z: -502, rot: Math.PI / 2, v: 2 },
    { x: -572, z: -502, rot: Math.PI / 2, v: 0 },
    { x: -592, z: -462, rot: 0, v: 1 },
    { x: -572, z: -462, rot: 0, v: 2 },
  ];
  desertHomes.forEach((dh) => {
    const house = createDesertDomeHouseMesh(dh.v);
    house.position.set(dh.x, kingdomY, dh.z);
    house.rotation.y = dh.rot;
    scene.add(house);
    colliders.push({ type: 'box', minX: dh.x - 3.6, maxX: dh.x + 3.6, minZ: dh.z - 3.4, maxZ: dh.z + 3.4, label: 'Rumah Kubah Gurun Solaria' });
  });

  // East Bazaar & Saudagar Pavilion (Enterable GTA Interior 'solaria_merchant_bazaar')
  const bazaarHall = createDesertDomeHouseMesh(2);
  bazaarHall.position.set(-493, kingdomY, -482);
  bazaarHall.scale.set(1.35, 1.35, 1.35);
  bazaarHall.rotation.y = -Math.PI / 2;
  scene.add(bazaarHall);
  colliders.push({ type: 'box', minX: -498.5, maxX: -487.5, minZ: -487.5, maxZ: -476.5, label: 'Gedung Bazar & Saudagar Solaria' });

  const bazaarStalls = [
    { mesh: createDesertBazaarStallMesh(0x991b1b), x: -512, z: -508, rot: -Math.PI / 2 },
    { mesh: createDesertBazaarStallMesh(0x0d9488), x: -512, z: -494, rot: -Math.PI / 2 },
    { mesh: createDesertBazaarStallMesh(0xd97706), x: -512, z: -468, rot: -Math.PI / 2 },
    { mesh: createDesertBazaarStallMesh(0x7c2d12), x: -492, z: -456, rot: Math.PI },
  ];
  bazaarStalls.forEach((st) => {
    st.mesh.position.set(st.x, kingdomY, st.z);
    st.mesh.rotation.y = st.rot;
    scene.add(st.mesh);
    colliders.push({ type: 'box', minX: st.x - 2.3, maxX: st.x + 2.3, minZ: st.z - 1.8, maxZ: st.z + 1.8, label: 'Tenda Kios Bazar Solaria' });
  });

  const tent1 = createDesertTentMesh();
  tent1.position.set(-490, kingdomY, -536);
  tent1.rotation.y = -Math.PI / 2;
  scene.add(tent1);
  colliders.push({ type: 'circle', x: -490, z: -536, radius: 3.2, label: 'Tenda Sutra Solaria' });

  const kingdomWell = createDesertOasisWellMesh();
  kingdomWell.position.set(-494, kingdomY, -514);
  scene.add(kingdomWell);
  colliders.push({ type: 'circle', x: -494, z: -514, radius: 2.2, label: 'Sumur Air Kota Solaria' });

  // South Approach Caravan Rest Outpost outside gate (-540, -340)
  const oasisY = getTerrainHeight(-540, -340);
  const southWell = createDesertOasisWellMesh();
  southWell.position.set(-548, oasisY, -340);
  scene.add(southWell);
  const camelRest = createCamelRestAreaMesh();
  camelRest.position.set(-532, oasisY, -342);
  scene.add(camelRest);
  colliders.push({ type: 'circle', x: -548, z: -340, radius: 2.4, label: 'Pos Oase Kafilah Selatan' });

  // Outdoor Solaria NPCs (Sultan Malik & Zahra reside inside interiors)
  const tariqGroup = createCustomNPCMesh('alchemist');
  const tariqPos: [number, number, number] = [-506, kingdomY, -464];
  tariqGroup.position.set(...tariqPos);
  scene.add(tariqGroup);
  npcs.push({
    id: 'npc_tariq',
    name: 'Saudagar Tariq',
    nameId: 'Saudagar Tariq',
    role: 'Caravan Silk Trader',
    roleType: 'alchemist',
    group: tariqGroup,
    position: tariqPos,
    dialogueId: 'merchant_tariq',
    icon: '🏺',
  });

  const aminaGroup = createCustomNPCMesh('villager');
  const aminaPos: [number, number, number] = [-544, oasisY, -337];
  aminaGroup.position.set(...aminaPos);
  scene.add(aminaGroup);
  npcs.push({
    id: 'npc_amina',
    name: 'Penjaga Oase Amina',
    nameId: 'Penjaga Oase Amina',
    role: 'Oasis Caretaker',
    roleType: 'villager',
    group: aminaGroup,
    position: aminaPos,
    dialogueId: 'oasis_amina',
    icon: '🌴',
  });

  const sGuards: Array<{ id: string; pos: [number, number]; rot: number; label: string }> = [
    { id: 'npc_solaria_guard1', pos: [-545.5, -438], rot: 0, label: 'Pengawal Gerbang Solaria' },
    { id: 'npc_solaria_guard2', pos: [-534.5, -438], rot: 0, label: 'Pengawal Gerbang Solaria' },
    { id: 'npc_solaria_guard3', pos: [-547.5, -523], rot: 0, label: 'Pengawal Istana Sultan' },
  ];
  sGuards.forEach((sg) => {
    const gGroup = createCustomNPCMesh('guard');
    gGroup.position.set(sg.pos[0], kingdomY, sg.pos[1]);
    gGroup.rotation.y = sg.rot;
    scene.add(gGroup);
    npcs.push({
      id: sg.id,
      name: sg.label,
      nameId: sg.label,
      role: 'Royal Solaria Guard',
      roleType: 'guard',
      group: gGroup,
      position: [sg.pos[0], kingdomY, sg.pos[1]],
      dialogueId: 'guard_solaria',
      icon: '🗡️',
    });
  });

  // Scatter desert cacti in sandy dunes (avoiding roads, pyramid, kingdom plaza, sinkhole)
  const cactiList: { x: number; y: number; z: number; scale: number; rotationY: number }[] = [];
  for (let i = 0; i < 65; i++) {
    const cxRand = -900 + (((i * 197) % 450));
    const czRand = -700 + (((i * 263) % 580));
    if (!isDesertBiome(cxRand, czRand)) continue;
    if (cxRand > -625 && cxRand < -455 && czRand > -590 && czRand < -420) continue;
    if (Math.hypot(cxRand - -840, czRand - -260) < 72) continue;
    if (Math.hypot(cxRand - -760, czRand - -240) < 35) continue;
    if (getDistanceToNearestRoad(cxRand, czRand) < 10) continue;
    cactiList.push({
      x: cxRand,
      y: getTerrainHeight(cxRand, czRand),
      z: czRand,
      scale: 0.8 + (i % 4) * 0.25,
      rotationY: i * 1.1,
    });
  }
  if (cactiList.length > 0) {
    scene.add(createInstancedDesertCacti(cactiList));
  }

}

export async function buildTitanLakeAndCanyon(
  scene: THREE.Object3D,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  _pointLights: THREE.PointLight[],
  npcs: WorldNPC[],
  animatedProps?: WorldObjects['animatedProps']
): Promise<void> {
  // ------------------------------------------
  // 9E. KAWAH PUSARAN PASIR SOLARIA / ARENA JARRUS [-840, -260]
  // ------------------------------------------
  await cooperativeYield(4);
  const sinkholeCenter = { x: -840, z: -260 };
  const sinkholeBaseY = getTerrainHeight(sinkholeCenter.x, sinkholeCenter.z);
  const sandVortex = createSandVortexSwirlMesh();
  sandVortex.position.set(sinkholeCenter.x, sinkholeBaseY + 0.05, sinkholeCenter.z);
  sandVortex.scale.set(1.25, 1.0, 1.25);
  scene.add(sandVortex);
  decorativeProps.push(sandVortex);

  for (let r = 0; r < 12; r++) {
    const angle = (r / 12) * Math.PI * 2 + 0.18;
    const rad = 57.5 + (r % 3) * 2.1;
    const rx = sinkholeCenter.x + Math.cos(angle) * rad;
    const rz = sinkholeCenter.z + Math.sin(angle) * rad;
    if (!isDesertBiome(rx, rz)) continue;
    const ry = getTerrainHeight(rx, rz);
    const rib = createAncientMonsterRibMesh();
    rib.position.set(rx, ry, rz);
    rib.rotation.y = angle + Math.PI / 2;
    const s = 1.45 + (r % 2) * 0.18;
    rib.scale.set(s, s, s);
    scene.add(rib);
    decorativeProps.push(rib);
    colliders.push({ type: 'circle', x: rx, z: rz, radius: 1.5, label: 'Fosil Tulang Rusuk Monster Purba' });
  }

  for (let o = 0; o < 8; o++) {
    const angle = (o / 8) * Math.PI * 2 + 0.12;
    const rad = 60.0 + (o % 2) * 3.5;
    const ox = sinkholeCenter.x + Math.cos(angle) * rad;
    const oz = sinkholeCenter.z + Math.sin(angle) * rad;
    if (!isDesertBiome(ox, oz)) continue;
    const oy = getTerrainHeight(ox, oz) - 0.55;
    const obelisk = createCrackedSandstoneObeliskMesh();
    obelisk.position.set(ox, oy, oz);
    obelisk.rotation.y = angle + 0.4;
    scene.add(obelisk);
    decorativeProps.push(obelisk);
    colliders.push({ type: 'circle', x: ox, z: oz, radius: 1.6, label: 'Obelisk Kuno Kawah Solaria' });
  }

  // ------------------------------------------
  // 9F. GRAND MAGE TOWER & CIRCULAR ARCANE PLAZA [270, -260]
  // ------------------------------------------
  const mtX = 270;
  const mtZ = -260;
  const mageTowerBaseY = getTerrainHeight(mtX, mtZ);

  // Walkable Circular Arcane Courtyard Slab (r=28.5 inside r=32 circular ring road)
  const arcaneCourtyard = createCircularPlazaMesh(28.5);
  arcaneCourtyard.position.set(mtX, mageTowerBaseY + 0.04, mtZ);
  scene.add(arcaneCourtyard);
  registerWalkableSurface(arcaneCourtyard, { label: 'Pelataran Lingkar Menara Sihir' });

  // 2x Colossal Mage Tower Exterior
  const mageTowerExterior = createMageTowerExteriorMesh();
  mageTowerExterior.position.set(mtX, mageTowerBaseY, mtZ);
  scene.add(mageTowerExterior);
  registerWalkableSurface(mageTowerExterior, { label: 'Undakan & Plinth Mage Tower' });
  colliders.push({ type: 'circle', x: mtX, z: mtZ, radius: 13.6, label: 'Menara Sihir Agung' });

  if (animatedProps) {
    const rings = mageTowerExterior.userData.animatedRings as THREE.Object3D[] | undefined;
    if (rings) {
      rings.forEach((rg, idx) => {
        animatedProps.push({
          mesh: rg,
          speed: (rg.userData.spinSpeed as number) || (idx % 2 === 0 ? 0.5 : -0.6),
          mode: 'spinY',
          phase: idx * 1.1,
        });
      });
    }
    const apex = mageTowerExterior.userData.apexCrystal as THREE.Object3D | undefined;
    if (apex) {
      animatedProps.push({
        mesh: apex,
        speed: 1.2,
        mode: 'bobY',
        baseY: apex.position.y,
        phase: 0,
      });
    }
  }

  // Outdoor Arcane Training Grounds inside plaza (East & West flanks, south door corridor clear)
  const runeDiscGeo = new THREE.RingGeometry(2.6, 3.1, 24);
  runeDiscGeo.rotateX(-Math.PI / 2);
  const cyanRuneMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
  const violetRuneMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.75, side: THREE.DoubleSide });

  const runeZoneCenters: Array<{ x: number; z: number; mat: THREE.Material }> = [
    { x: mtX + 21, z: mtZ + 2, mat: cyanRuneMat },
    { x: mtX - 21, z: mtZ + 2, mat: violetRuneMat },
  ];
  runeZoneCenters.forEach((rz) => {
    const circle = new THREE.Mesh(runeDiscGeo, rz.mat);
    circle.position.set(rz.x, mageTowerBaseY + 0.08, rz.z);
    scene.add(circle);
  });

  // Outdoor Target Dummies & Mana Crystal Racks
  const mtDummyCoords: [number, number, number][] = [
    [mtX + 22, mtZ - 4, -Math.PI / 2],
    [mtX + 22, mtZ + 8, -Math.PI / 2],
    [mtX - 22, mtZ + 2, Math.PI / 2],
  ];
  mtDummyCoords.forEach(([dx, dz, rot]) => {
    const d = createTrainingDummyMesh();
    d.position.set(dx, mageTowerBaseY, dz);
    d.rotation.y = rot;
    scene.add(d);
    colliders.push({ type: 'circle', x: dx, z: dz, radius: 0.8, label: 'Boneka Target Latihan Sihir' });
  });

  const manaRackCoords: [number, number, number][] = [
    [mtX + 18, mtZ + 12, -Math.PI * 0.7],
    [mtX - 18, mtZ + 12, Math.PI * 0.7],
  ];
  manaRackCoords.forEach(([rx, rz, rot]) => {
    const rack = createWeaponRackMesh();
    rack.position.set(rx, mageTowerBaseY, rz);
    rack.rotation.y = rot;
    scene.add(rack);
  });

  // 4 Rotating Purple-Cyan Obelisks framing Arcane Yard
  const obeliskAngles = [Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.75, -Math.PI * 0.25];
  obeliskAngles.forEach((ang, idx) => {
    const ox = mtX + Math.cos(ang) * 23.5;
    const oz = mtZ + Math.sin(ang) * 23.5;
    const obObj = createCrystalMonolithMesh();
    obObj.group.position.set(ox, mageTowerBaseY, oz);
    obObj.group.scale.set(0.75, 0.85, 0.75);
    scene.add(obObj.group);
    colliders.push({ type: 'circle', x: ox, z: oz, radius: 1.2, label: 'Obelisk Mana Menara Sihir' });
    if (animatedProps) {
      animatedProps.push({ mesh: obObj.group, speed: idx % 2 === 0 ? 0.55 : -0.55, mode: 'spinY', phase: idx * 0.8 });
    }
  });

  // 8 Outer Thunder Spires outside circular ring road (avoiding 4 cardinal road spokes!)
  for (let s = 0; s < 8; s++) {
    const ang = (s / 8) * Math.PI * 2 + Math.PI / 8;
    const sx = mtX + Math.cos(ang) * 39;
    const sz = mtZ + Math.sin(ang) * 39;
    const spire = createThunderSpireMesh();
    spire.position.set(sx, getTerrainHeight(sx, sz), sz);
    scene.add(spire);
    colliders.push({ type: 'circle', x: sx, z: sz, radius: 1.4, label: 'Pilar Petir Lingkar Menara' });
  }

  // Outdoor Gate Sentinel for Mage Tower (Eldrin, Maya, & Pyro reside inside the 4-floor Interior!)
  const mtGuardGroup = createCustomNPCMesh('guard');
  const mtGuardPos: [number, number, number] = [mtX - 6.0, mageTowerBaseY, mtZ + 21.5];
  mtGuardGroup.position.set(...mtGuardPos);
  scene.add(mtGuardGroup);
  npcs.push({
    id: 'npc_mage_tower_sentinel',
    name: 'Penjaga Menara Sihir',
    nameId: 'Penjaga Gerbang Menara Sihir',
    role: 'Arcane Tower Sentinel',
    roleType: 'guard',
    group: mtGuardGroup,
    position: mtGuardPos,
    dialogueId: 'guard_astraea',
    icon: '🔮',
  });

  await cooperativeYield(4);
}


export async function buildDragonCaldera(
  scene: THREE.Object3D,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  onProgress?: (percent: number, statusText: string) => void
): Promise<{
  chests: WorldObjects['chests'];
  lavaSurfaceMat?: THREE.MeshStandardMaterial;
  lavaEmbers?: THREE.Points;
}> {
  let tLast = performance.now();
  const checkCalderaYield = async (pct?: number, text?: string) => {
    if (performance.now() - tLast > 6) {
      if (pct && text) onProgress?.(pct, text);
      await hardYield();
      tLast = performance.now();
    }
  };

  await hardYield();
  const dragonArenaCenter = { x: 40, z: 840 };
  const dragonArenaBaseY = 2.50;

  // ============================================================================
  // 1. PULAU UTAMA KALDERA NAGA [40, 840] (Radius Arena ~54 unit + Danau Lahar + Jembatan Obsidian)
  // ZERO dynamic PointLight! Seluruh cahaya menggunakan MeshBasicMaterial/emissive + pooled particles.
  // ============================================================================

  // A. Platform Pulau Tempur Basalt-Obsidian Berlapis (Radius ~54 unit, 100% Walkable)
  onProgress?.(52, 'Membangun Pulau Basalt-Obsidian & Danau Lahar Kaldera (52%)...');
  const arenaPlatformGroup = new THREE.Group();
  arenaPlatformGroup.name = 'DragonCalderaMainPlatform';
  arenaPlatformGroup.position.set(dragonArenaCenter.x, dragonArenaBaseY, dragonArenaCenter.z);

  const basaltPlatformMat = new THREE.MeshStandardMaterial({
    color: 0x1c1919,
    roughness: 0.88,
    metalness: 0.24,
    flatShading: true,
  });
  const obsidianTrimMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.45,
    metalness: 0.58,
    flatShading: true,
  });
  const magmaFissureMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xf97316,
    emissiveIntensity: 1.55,
    roughness: 0.28,
  });

  // Lapisan tebing basalt utama menyatu hingga dasar danau lahar
  const baseCliffCyl = new THREE.Mesh(new THREE.CylinderGeometry(54.0, 56.8, 4.9, 44), basaltPlatformMat);
  baseCliffCyl.position.y = -2.45; // Top permukaan tepat di +0.0 (world Y = 2.50)
  baseCliffCyl.receiveShadow = true;
  baseCliffCyl.userData.walkableSurface = true;
  arenaPlatformGroup.add(baseCliffCyl);

  // Tepi bingkai batu obsidian luar di pinggiran pulau (r = 52.8..54.4)
  const rimRing = new THREE.Mesh(new THREE.CylinderGeometry(54.3, 54.6, 0.26, 44), obsidianTrimMat);
  rimRing.position.y = -0.13;
  rimRing.receiveShadow = true;
  rimRing.userData.walkableSurface = true;
  arenaPlatformGroup.add(rimRing);

  // Jalur retakan magma bercahaya oranye-merah di permukaan lantai batu altar (100% walkable)
  const crackRadialCount = 12;
  for (let c = 0; c < crackRadialCount; c++) {
    const ang = (c / crackRadialCount) * Math.PI * 2;
    // Sisakan jalur mulut jembatan utara (-Math.PI / 2) bersih dari retakan
    const angDiffNorth = Math.abs(Math.atan2(Math.sin(ang + Math.PI / 2), Math.cos(ang + Math.PI / 2)));
    if (angDiffNorth < 0.20) continue;
    const midR = 31.0;
    const crackLen = 28.0;
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, crackLen), magmaFissureMat);
    crack.position.set(Math.cos(ang) * midR, 0.008, Math.sin(ang) * midR);
    crack.rotation.y = -ang + Math.PI / 2;
    crack.userData.walkableSurface = true;
    arenaPlatformGroup.add(crack);
  }
  const outerMagmaVeinRing = new THREE.Mesh(new THREE.RingGeometry(39.6, 40.3, 48), magmaFissureMat);
  outerMagmaVeinRing.rotation.x = -Math.PI / 2;
  outerMagmaVeinRing.position.y = 0.01;
  outerMagmaVeinRing.userData.walkableSurface = true;
  arenaPlatformGroup.add(outerMagmaVeinRing);

  scene.add(arenaPlatformGroup);
  registerWalkableSurface(arenaPlatformGroup, { label: 'Platform Pulau Arena Kaldera Naga' });

  // B. Altar Cincin Rune Naga Kuno di Pusat Arena [40, 840]
  const altarGroup = new THREE.Group();
  altarGroup.name = 'DragonRuneAltar';

  const daisBase = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 16.0, 0.5, 32), obsidianTrimMat);
  daisBase.position.y = 0.25;
  daisBase.userData.walkableSurface = true;
  altarGroup.add(daisBase);

  const daisTop = new THREE.Mesh(new THREE.CylinderGeometry(11.8, 12.6, 0.45, 32), obsidianTrimMat);
  daisTop.position.y = 0.72;
  daisTop.userData.walkableSurface = true;
  altarGroup.add(daisTop);

  // Cincin Rune Naga bercahaya di atas dais (walkable)
  const runeRingGeo = new THREE.RingGeometry(9.6, 11.4, 36);
  runeRingGeo.rotateX(-Math.PI / 2);
  const runeRingMesh = new THREE.Mesh(runeRingGeo, magmaFissureMat);
  runeRingMesh.position.y = 0.96;
  runeRingMesh.userData.walkableSurface = true;
  altarGroup.add(runeRingMesh);

  // Anglo api pemanggil naga kuno di titik paling pusat altar (non-walkable, dihalangi collider r = 2.4)
  const brazierMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.2, 1.3, 8), obsidianTrimMat);
  brazierMesh.position.y = 1.55;
  brazierMesh.userData.nonWalkable = true;
  altarGroup.add(brazierMesh);

  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.0, 8), new THREE.MeshBasicMaterial({ color: 0xff6d00 }));
  flameMesh.position.y = 3.25;
  flameMesh.userData.nonWalkable = true;
  altarGroup.add(flameMesh);

  const altarHalo = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      transparent: true,
      opacity: 0.30,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  altarHalo.position.y = 3.2;
  altarHalo.userData.nonWalkable = true;
  altarGroup.add(altarHalo);

  altarGroup.position.set(dragonArenaCenter.x, dragonArenaBaseY, dragonArenaCenter.z);
  scene.add(altarGroup);
  registerWalkableSurface(altarGroup, { label: 'Altar Rune Naga Kaldera' });
  colliders.push({ type: 'circle', x: dragonArenaCenter.x, z: dragonArenaCenter.z, radius: 2.3, label: 'Altar Rune Naga' });

  // C. 7 Pilar Obsidian Anglo Api & Lengkungan Tulang Vulkanik di Pinggiran Paling Luar Platform (r = 50..52.5)
  const perimeterCount = 8;
  const brazierFlameMat = new THREE.MeshBasicMaterial({ color: 0xff6d00 });
  const brazierHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff3d00,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const perimeterPillarPoints: Array<{ x: number; z: number; angle: number }> = [];
  for (let p = 0; p < perimeterCount; p++) {
    await checkCalderaYield(52, 'Menata Pilar Obsidian Pinggiran Kaldera (52%)...');
    const angle = (p / perimeterCount) * Math.PI * 2;
    // Sisakan sisi mulut Jembatan Obsidian Utara (-Math.PI / 2) bersih 100%
    const angDiffNorth = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
    if (angDiffNorth < 0.35) continue;

    const rPillar = 50.5;
    const px = dragonArenaCenter.x + Math.cos(angle) * rPillar;
    const pz = dragonArenaCenter.z + Math.sin(angle) * rPillar;
    perimeterPillarPoints.push({ x: px, z: pz, angle });

    const pGroup = new THREE.Group();
    const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.55, 8.8, 6), obsidianTrimMat);
    colMesh.position.y = 4.4;
    colMesh.castShadow = true;
    pGroup.add(colMesh);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.65, 0.7, 8), basaltPlatformMat);
    bowl.position.y = 9.0;
    pGroup.add(bowl);

    const topFlame = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.9, 6), brazierFlameMat);
    topFlame.position.y = 10.0;
    pGroup.add(topFlame);

    const topHalo = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 8), brazierHaloMat);
    topHalo.position.y = 9.85;
    pGroup.add(topHalo);

    pGroup.position.set(px, dragonArenaBaseY, pz);
    scene.add(pGroup);
    colliders.push({ type: 'circle', x: px, z: pz, radius: 1.65, label: 'Pilar Obsidian Anglo Kaldera' });
  }

  // Lengkungan batu vulkanik / tulang raksasa di bingkai terluar (r = 52.0, menghadap luar arena)
  for (let a = 0; a < perimeterPillarPoints.length; a++) {
    if (a % 2 !== 0) continue;
    const pt = perimeterPillarPoints[a];
    const archRib = createAncientMonsterRibMesh();
    archRib.position.set(
      dragonArenaCenter.x + Math.cos(pt.angle + 0.36) * 52.0,
      dragonArenaBaseY,
      dragonArenaCenter.z + Math.sin(pt.angle + 0.36) * 52.0
    );
    archRib.rotation.y = pt.angle + 0.36 + Math.PI / 2;
    archRib.scale.set(1.5, 1.5, 1.5);
    scene.add(archRib);
  }

  // Fosil Tengkorak Naga Purba di sisi selatan-barat paling pinggir arena (r = 46, aman dari tengah arena)
  const dragonFossil = createDragonSkullBonesMesh();
  dragonFossil.position.set(dragonArenaCenter.x - 32, dragonArenaBaseY, dragonArenaCenter.z + 32);
  dragonFossil.rotation.y = -Math.PI * 0.25;
  scene.add(dragonFossil);
  colliders.push({
    type: 'circle',
    x: dragonArenaCenter.x - 32,
    z: dragonArenaCenter.z + 32,
    radius: 4.5,
    label: 'Fosil Tengkorak Naga Purba',
  });

  // D. Danau Lahar Lebar Mengelilingi Seluruh Pulau Arena (innerR = 52.5, outerR = 90.0)
  // Pola tekstur prosedural magma + retakan kerak hitam tipis (0 PointLight)
  let lavaSurfaceMat: THREE.MeshStandardMaterial | undefined;
  let lavaEmbers: THREE.Points | undefined;
  {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(0, 0, 256, 256);

      // Pendar magma kuning-oranye menyala
      for (let i = 0; i < 48; i++) {
        const x = (i * 53) % 256;
        const y = (i * 97) % 256;
        const r = 18 + (i % 4) * 10;
        const g = ctx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, '#fde047');
        g.addColorStop(0.45, '#f97316');
        g.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Garis-garis tipis kerak obsidian gelap di atas aliran lahar
      ctx.strokeStyle = '#1c110d';
      ctx.lineWidth = 3.2;
      for (let k = 0; k < 28; k++) {
        const sx = (k * 41) % 256;
        const sy = (k * 73) % 256;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + ((k % 3) - 1) * 32 + 18, sy + ((k % 2) * 2 - 1) * 24);
        ctx.lineTo(sx + ((k % 3) - 1) * 14 + 34, sy + 36);
        ctx.stroke();
      }
    }
    const lavaTex = new THREE.CanvasTexture(canvas);
    lavaTex.wrapS = THREE.RepeatWrapping;
    lavaTex.wrapT = THREE.RepeatWrapping;
    lavaTex.repeat.set(8, 3);

    lavaSurfaceMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      map: lavaTex,
      emissive: 0xea580c,
      emissiveMap: lavaTex,
      emissiveIntensity: 1.85,
      roughness: 0.35,
      metalness: 0.1,
    });
    const lavaMoatGeo = new THREE.RingGeometry(52.5, 90.0, 64, 4);
    lavaMoatGeo.rotateX(-Math.PI / 2);
    const lavaMoatMesh = new THREE.Mesh(lavaMoatGeo, lavaSurfaceMat);
    lavaMoatMesh.position.set(dragonArenaCenter.x, 0.05, dragonArenaCenter.z);
    lavaMoatMesh.userData.nonWalkable = true;
    scene.add(lavaMoatMesh);

    // Pooled bara api naik dari permukaan danau lahar (160 titik, frustumCulled = false)
    const emberCount = 160;
    const emberPos = new Float32Array(emberCount * 3);
    const emberCol = new Float32Array(emberCount * 3);
    for (let e = 0; e < emberCount; e++) {
      const ang = (e / emberCount) * Math.PI * 2 + (e % 7) * 0.21;
      const rad = 54.5 + ((e * 37) % 33);
      emberPos[e * 3] = dragonArenaCenter.x + Math.cos(ang) * rad;
      emberPos[e * 3 + 1] = 0.25 + ((e * 17) % 50) * 0.12;
      emberPos[e * 3 + 2] = dragonArenaCenter.z + Math.sin(ang) * rad;
      emberCol[e * 3] = 1.0;
      emberCol[e * 3 + 1] = 0.38 + (e % 4) * 0.14;
      emberCol[e * 3 + 2] = 0.05;
    }
    const emberGeo = new THREE.BufferGeometry();
    const emberAttr = new THREE.BufferAttribute(emberPos, 3);
    emberAttr.setUsage(THREE.DynamicDrawUsage);
    emberGeo.setAttribute('position', emberAttr);
    emberGeo.setAttribute('color', new THREE.BufferAttribute(emberCol, 3));
    const emberMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    lavaEmbers = new THREE.Points(emberGeo, emberMat);
    lavaEmbers.frustumCulled = false;
    scene.add(lavaEmbers);
  }

  // E. Formasi Kolom Basalt Heksagonal di Tebing Dinding Luar Kawah (Radius 90..114, melewati Danau Lahar)
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
    metalness: 0.35,
    flatShading: true,
  });
  const basaltBaseGeo = new THREE.CylinderGeometry(0.8, 1.0, 1.0, 6);
  basaltBaseGeo.translate(0, 0.5, 0);
  const basaltInstMesh = new THREE.InstancedMesh(basaltBaseGeo, basaltMat, 32);
  let basaltCount = 0;
  const basaltDummy = new THREE.Object3D();

  for (let i = 0; i < 32; i++) {
    await checkCalderaYield(54, 'Membangun Tebing Kolom Basalt Kaldera (54%)...');
    const angle = (i / 32) * Math.PI * 2;
    const angDiffNorth = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
    if (angDiffNorth < 0.25) continue;

    const r = 91 + (i % 5) * 4.8;
    const bx = dragonArenaCenter.x + Math.cos(angle) * r;
    const bz = dragonArenaCenter.z + Math.sin(angle) * r;
    const by = getTerrainHeight(bx, bz);

    const colH = 8.0 + (i % 4) * 4.0;
    const colR = 1.6 + (i % 3) * 0.45;

    basaltDummy.position.set(bx, by, bz);
    basaltDummy.scale.set(colR, colH, colR);
    basaltDummy.rotation.set(((i % 3) - 1) * 0.08, 0, (((i + 1) % 3) - 1) * 0.08);
    basaltDummy.updateMatrix();
    basaltInstMesh.setMatrixAt(basaltCount++, basaltDummy.matrix);

    colliders.push({ type: 'circle', x: bx, z: bz, radius: colR, label: 'Tebing Basalt Luar Kaldera' });
  }
  basaltInstMesh.count = basaltCount;
  basaltInstMesh.instanceMatrix.needsUpdate = true;
  basaltInstMesh.computeBoundingSphere();
  scene.add(basaltInstMesh);

  // Jalan Batu Hitam Pendek dari Dermaga Utara [40, 722] menuju Kepala Jembatan Obsidian [40, 749]
  const northRoadSlab = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.28, 22.0), basaltPlatformMat);
  northRoadSlab.position.set(40, 2.38, 738);
  northRoadSlab.receiveShadow = true;
  northRoadSlab.userData.walkableSurface = true;
  scene.add(northRoadSlab);
  registerWalkableSurface(northRoadSlab, { label: 'Jalan Batu Gerbang Kaldera Utara' });

  // F. Dermaga Kayu Hangus di Teluk Utara Pulau [40, 716] (Titik Labuh Kapal menuju Jembatan Obsidian)
  const charredDockMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const dockPier = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.45, 18.0), charredDockMat);
  dockPier.position.set(40, 0.55, 716);
  dockPier.userData.walkableSurface = true;
  scene.add(dockPier);
  registerWalkableSurface(dockPier, { label: 'Dermaga Kayu Hangus Kaldera' });

  const dockPileGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.8, 6);
  const dockPileMesh = new THREE.InstancedMesh(dockPileGeo, charredDockMat, 8);
  let pileIdx = 0;
  const pileDummy = new THREE.Object3D();
  for (let pz = 709; pz <= 723; pz += 4.5) {
    await checkCalderaYield();
    pileDummy.position.set(36.8, 0.2, pz);
    pileDummy.updateMatrix();
    dockPileMesh.setMatrixAt(pileIdx++, pileDummy.matrix);

    pileDummy.position.set(43.2, 0.2, pz);
    pileDummy.updateMatrix();
    dockPileMesh.setMatrixAt(pileIdx++, pileDummy.matrix);
  }
  dockPileMesh.count = pileIdx;
  dockPileMesh.instanceMatrix.needsUpdate = true;
  dockPileMesh.computeBoundingSphere();
  scene.add(dockPileMesh);
  colliders.push(
    { type: 'box', minX: 36.5, maxX: 37.0, minZ: 707, maxZ: 725, label: 'Tepi Barat Dermaga Kayu Hangus' },
    { type: 'box', minX: 43.0, maxX: 43.5, minZ: 707, maxZ: 725, label: 'Tepi Timur Dermaga Kayu Hangus' }
  );

  // H. Lingkungan Pulau Satelit Barat Daya [-138, 892]
  const swRock = createVolcanicBasaltRockMesh(2.2);
  swRock.position.set(-138, 6.50, 892);
  scene.add(swRock);
  colliders.push({ type: 'circle', x: -138, z: 892, radius: 2.8, label: 'Puncak Satelit Vulkanik Barat Daya' });

  // I. Lingkungan Pulau Satelit Barat Laut [-128, 772]
  const nwSpire = createVolcanicPillarMesh();
  nwSpire.position.set(-128, 5.50, 772);
  scene.add(nwSpire);
  colliders.push({ type: 'circle', x: -128, z: 772, radius: 2.2, label: 'Pilar Obsidian Satelit Barat Laut' });

  // ============================================================================
  // 2. KEPULAUAN PERANTARA SELATAN & BARAT (ARCHIPELAGO PHASE 1)
  // ============================================================================

  // 1. Pulau Mercusuar & Karang Pelaut [-220, 460]
  const lighthouseGroup = new THREE.Group();
  lighthouseGroup.name = 'LighthouseIsland';

  // Menara Mercusuar Batu (Tinggi 18 unit)
  const lhMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7, flatShading: true });
  const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.8, 16.0, 16), lhMat);
  lhBase.position.y = 8.0;
  lighthouseGroup.add(lhBase);

  // Balkon Galeri Pengawas
  const lhBalconyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
  const lhBalcony = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.5, 16), lhBalconyMat);
  lhBalcony.position.y = 16.25;
  lighthouseGroup.add(lhBalcony);

  // Ruang Lentera Kaca Bersinar (Beacon Room)
  const lhLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 3.5,
    roughness: 0.1,
  });
  const lhLantern = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.8, 12), lhLanternMat);
  lhLantern.position.y = 17.8;
  lighthouseGroup.add(lhLantern);

  // Atap Kerucut Merah
  const lhRoofMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6, flatShading: true });
  const lhRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.8, 12), lhRoofMat);
  lhRoof.position.y = 20.6;
  lighthouseGroup.add(lhRoof);

  // Cahaya Mercusuar Utama (PointLight Sorot Jauh)
  const lhLight = new THREE.PointLight(0xfffbeb, 4.2, 90);
  lhLight.position.set(0, 18.0, 0);
  lighthouseGroup.add(lhLight);
  pointLights.push(lhLight);

  lighthouseGroup.position.set(-220, 6.20, 460);
  scene.add(lighthouseGroup);
  colliders.push({ type: 'circle', x: -220, z: 460, radius: 3.8, label: 'Menara Mercusuar Karang Pelaut' });

  // Dermaga Singgah di Sisi Timur Pulau Mercusuar [-188, 460]
  const lhDock = createPierDockMesh({ length: 14.0, width: 4.2, pileDepth: 6.0, hasMooringBollards: true });
  lhDock.position.set(-188, -0.35, 460);
  lhDock.rotation.y = Math.PI / 2;
  scene.add(lhDock);
  registerWalkableSurface(lhDock, { label: 'Dermaga Pulau Mercusuar' });
  colliders.push(
    { type: 'box', minX: -195, maxX: -181, minZ: 457.6, maxZ: 458.1, label: 'Tepi Utara Dermaga Mercusuar' },
    { type: 'box', minX: -195, maxX: -181, minZ: 461.9, maxZ: 462.4, label: 'Tepi Selatan Dermaga Mercusuar' }
  );

  // Rumpun Palem di Pulau Mercusuar
  const lhPalm1 = createDesertPalmMesh();
  lhPalm1.position.set(-214, getTerrainHeight(-214, 452), 452);
  scene.add(lhPalm1);
  const lhPalm2 = createDesertPalmMesh();
  lhPalm2.position.set(-226, getTerrainHeight(-226, 468), 468);
  scene.add(lhPalm2);

  // 2. Pulau Reruntuhan Bajak Laut [-520, 620]
  // Bangkai kapal karam di teluk bulan sabit [-490, 620]
  const pirateWreck = createShipwreckMesh();
  pirateWreck.position.set(-490, 0.40, 620);
  pirateWreck.rotation.y = 0.65;
  pirateWreck.rotation.z = 0.22; // Kandas miring di pasir
  scene.add(pirateWreck);
  colliders.push({ type: 'box', minX: -497, maxX: -483, minZ: 613, maxZ: 627, label: 'Bangkai Kapal Bajak Laut' });

  // Perkemahan Bajak Laut di Tepi Teluk
  const pirateCampfire = createBonfireMesh();
  pirateCampfire.position.set(-502, getTerrainHeight(-502, 624), 624);
  scene.add(pirateCampfire);

  const barrel1 = createBarrelMesh();
  barrel1.position.set(-504, getTerrainHeight(-504, 622), 622);
  scene.add(barrel1);

  // 3. Pulau Karang Terjal [-780, 280]
  // Gugusan pilar karang alami & gerbang batu di samudra barat
  const reefArch = createAncientArchMesh();
  reefArch.position.set(-780, getTerrainHeight(-780, 280), 280);
  reefArch.scale.set(1.5, 1.8, 1.5);
  scene.add(reefArch);
  colliders.push({ type: 'circle', x: -780, z: 280, radius: 4.5, label: 'Gerbang Karang Terjal Samudra Barat' });

  // ==========================================
  // 3. TREASURE CHESTS (Across all active continent & archipelago zones)
  // ==========================================
  const chestData = [
    { id: 'chest_village', pos: [14, 2.0, -52] as [number, number, number] }, // Alun-Alun Desa Sanctuary
    { id: 'chest_beach', pos: [20, 1.85, 47] as [number, number, number] }, // Pelabuhan Pier Head Platform
    { id: 'chest_ruins', pos: [145, 0, 5] as [number, number, number] }, // Ancient ruins altar
    { id: 'chest_forest', pos: [148, 0, 60] as [number, number, number] }, // Whispering Mystic Forest
    { id: 'chest_titan', pos: [-182, 0.2, -244] as [number, number, number] }, // Ancient Titan Basin
    { id: 'chest_valkragor', pos: [332, 2.5, 115] as [number, number, number] }, // Val-Kragor Keep Secret Vault
    { id: 'chest_thunderpeak', pos: [110, 4.5, -10] as [number, number, number] }, // Thunderpeak Mage Tower Relic
    { id: 'chest_solaria_palace', pos: [340, 2.0, -280] as [number, number, number] }, // Solaria Sultan Vault
    { id: 'chest_solaria', pos: [-20, 1.5, -320] as [number, number, number] }, // Solaria Pyramid Gold
    { id: 'chest_solaria_oasis', pos: [20, 0.5, -240] as [number, number, number] }, // Solaria Hidden Oasis
    { id: 'chest_dragoncaldera', pos: [40, 3.0, 829] as [number, number, number] }, // Dragon Caldera Hoard (Tepi Altar Rune)
    { id: 'chest_lighthouse', pos: [-218, 6.2, 462] as [number, number, number] }, // Peti Harta Karun Pulau Mercusuar
    { id: 'chest_pirate', pos: [-495, 0.5, 620] as [number, number, number] }, // Peti Harta Karun Bajak Laut
    { id: 'chest_astraea', pos: [-220, 2.0, -220] as [number, number, number] }, // Astraea Imperial Vault
    { id: 'chest_harbor_galleon', pos: [20, 1.85, 36] as [number, number, number] }, // Harbor Galleon Stash
    { id: 'chest_bridge', pos: [95, 2.0, -50] as [number, number, number] }, // Eastern River Approach Cache
    { id: 'chest_sandworm_cache', pos: [-840, 0.5, -260] as [number, number, number] }, // Ancient Sandworm Sinkhole Cache
  ];

  const chests: WorldObjects['chests'] = [];
  for (let c = 0; c < chestData.length; c++) {
    const cd = chestData[c];
    const { group, lidGroup } = createTreasureChestMesh();
    const cy = getSolidGroundHeight(cd.pos[0], cd.pos[2]);
    group.position.set(cd.pos[0], cy, cd.pos[2]);
    scene.add(group);
    chests.push({
      id: cd.id,
      group,
      lid: lidGroup,
      opened: false,
      position: [cd.pos[0], cy, cd.pos[2]],
    });
    if (c % 2 === 1) {
      await checkCalderaYield(55, `Menempatkan Peti Harta Karun (${c + 1}/${chestData.length})...`);
    }
  }

  await hardYield();
  return { chests, lavaSurfaceMat, lavaEmbers };
}


async function populateWorldEntities(
  trueScene: THREE.Scene,
  scene: THREE.Group,
  terrainMesh: THREE.Mesh,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  dirLight: THREE.DirectionalLight,
  hemiLight: THREE.HemisphereLight,
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  onProgress?: (percent: number, statusText: string) => void
): Promise<WorldObjects> {
  const colliders: WorldCollider[] = [];
  const npcs: WorldNPC[] = [];
  const floatingCrystals: THREE.Mesh[] = [];
  const animatedProps: NonNullable<WorldObjects['animatedProps']> = [];

  // ==========================================
  // 1. VAST AZURE OCEAN WATER PLANE & COASTAL HARBOR & SANCTUARY VILLAGE (31% - 34%)
  // ==========================================
  onProgress?.(31, 'Membangun Desa Utama & Pelabuhan Sanctuary (31%)...');
  await hardYield();
  const { oceanMesh } = await buildHarbor(scene, getTerrainHeight, colliders, decorativeProps);
  onProgress?.(34, 'Membangun Alun-Alun & Rumah Desa Sanctuary (34%)...');
  await hardYield();
  const { elderGroup, elderPos } = await buildMainVillage(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs);

  // ==========================================
  // 2. GRAND IMPERIAL KINGDOM OF ASTRAEA (38%)
  // ==========================================
  onProgress?.(38, 'Membangun Ibukota Kerajaan Emas Astraea (38%)...');
  await hardYield();
  await buildAstraeaCastle(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs);

  // ==========================================
  // 3. FORTRESS VAL-KRAGOR & CASTLE RUINS (42%)
  // ==========================================
  onProgress?.(42, 'Membangun Desa Benteng Val-Kragor & Puing Kastil (42%)...');
  await hardYield();
  await buildValKragorFort(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs, floatingCrystals);

  // ==========================================
  // 4. SOLARIA GOLDEN DESERT: VILLAGE, GRAND PALACE & SUNKEN PYRAMID (46%)
  // ==========================================
  onProgress?.(46, 'Membangun Piramida, Oase, & Istana Sultan Malik (46%)...');
  await hardYield();
  await buildDesertStructures(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs);

  // ==========================================
  // 5. TITAN LAKE & CANYON (49%)
  // ==========================================
  onProgress?.(49, 'Membangun Lembah Danau Titan & Kawah Cacing Purba (49%)...');
  await hardYield();
  await buildTitanLakeAndCanyon(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs, animatedProps);

  // ==========================================
  // 6. DRAGON CALDERA ARCHIPELAGO (52% - 56%)
  // ==========================================
  onProgress?.(52, 'Membangun Gugusan Kepulauan Kaldera Naga (52%)...');
  await hardYield();
  const {
    chests,
    lavaSurfaceMat,
    lavaEmbers,
  } = await buildDragonCaldera(scene, getTerrainHeight, colliders, decorativeProps, pointLights, onProgress);

  // ==========================================
  // 7. SACRED SPRING, REGIONAL LANDMARKS & CHECKPOINTS (57% - 61%)
  // ==========================================
  onProgress?.(57, 'Menata Mata Air Suci & Kolam Teratai (57%)...');
  await hardYield();
  // 10. MATA AIR SUCI & TAMAN BUNGA ELDORIA (Plains Spring: [-144, -270])
  // Kolam air tawar melingkar kecil, tepian batu kali halus berlumut,
  // tumbuhan teratai air terapung, hamparan rumpun bunga liar (lavender, kamomil), dan 2 pohon willow rindang.
  // ==========================================
  const springCenter = { x: -144, z: -270 };
  const springGroup = new THREE.Group();
  springGroup.name = 'SacredSpring_Eldoria';

  // A. Kolam Air Tawar Jernih (Radius 5.5 unit)
  const springWaterGeo = new THREE.CircleGeometry(5.5, 32);
  springWaterGeo.rotateX(-Math.PI / 2);
  const springWaterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const springWater = new THREE.Mesh(springWaterGeo, springWaterMat);
  springWater.position.set(springCenter.x, -0.32, springCenter.z);
  springGroup.add(springWater);

  // B. Tepian Kolam Batu Kali Halus Berlumut
  const mossyStoneMat = new THREE.MeshStandardMaterial({
    color: 0x576352,
    roughness: 0.85,
    flatShading: true,
  });
  const stoneCount = 28;
  for (let i = 0; i < stoneCount; i++) {
    if (i > 0 && i % 4 === 0) await cooperativeYield(4);
    const angle = (i / stoneCount) * Math.PI * 2;
    const r = 5.4 + (i % 3) * 0.25;
    const sx = springCenter.x + Math.cos(angle) * r;
    const sz = springCenter.z + Math.sin(angle) * r;
    const sy = getTerrainHeight(sx, sz);

    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55 + (i % 4) * 0.15, 0),
      mossyStoneMat
    );
    stone.position.set(sx, Math.max(sy, -0.25) + 0.2, sz);
    stone.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    stone.castShadow = true;
    springGroup.add(stone);
  }

  // C. Teratai Air Mengapung di Atas Kolam (Water Lily Pads & Lotus Blossoms)
  const lilyPadMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const lotusPetalMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.5,
  });
  const lotusCenterMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
    emissive: 0xeab308,
    emissiveIntensity: 0.4,
  });

  const lilyOffsets = [
    { dx: -1.8, dz: -1.2, r: 0.65, hasLotus: true },
    { dx: -0.8, dz: 1.5, r: 0.55, hasLotus: false },
    { dx: 1.5, dz: -1.8, r: 0.7, hasLotus: true },
    { dx: 2.2, dz: 0.8, r: 0.6, hasLotus: true },
    { dx: 0.5, dz: -2.4, r: 0.5, hasLotus: false },
    { dx: -2.4, dz: 1.0, r: 0.58, hasLotus: true },
    { dx: -1.2, dz: -2.8, r: 0.48, hasLotus: false },
    { dx: 1.8, dz: 2.1, r: 0.62, hasLotus: true },
  ];

  for (let li = 0; li < lilyOffsets.length; li++) {
    const l = lilyOffsets[li];
    const pad = new THREE.Mesh(new THREE.CircleGeometry(l.r, 14), lilyPadMat);
    pad.rotateX(-Math.PI / 2);
    pad.position.set(springCenter.x + l.dx, -0.28, springCenter.z + l.dz);
    springGroup.add(pad);

    if (l.hasLotus) {
      // Bunga teratai mekar (Lotus flower)
      const flowerGroup = new THREE.Group();
      flowerGroup.position.set(springCenter.x + l.dx, -0.25, springCenter.z + l.dz);

      // Kelopak teratai
      for (let p = 0; p < 6; p++) {
        const pAng = (p / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 4), lotusPetalMat);
        petal.position.set(Math.cos(pAng) * 0.12, 0.12, Math.sin(pAng) * 0.12);
        petal.rotation.set(0.4 * Math.sin(pAng), pAng, -0.4 * Math.cos(pAng));
        flowerGroup.add(petal);
      }
      // Putik kuning di tengah
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 6), lotusCenterMat);
      core.position.y = 0.12;
      flowerGroup.add(core);

      springGroup.add(flowerGroup);
    }
    if (li % 3 === 0) await cooperativeYield(4);
  }

  // D. Hamparan Rumpun Bunga Liar Warna-Warni (Lavender Ungu & Kamomil Putih)
  onProgress?.(55, 'Menanam Hamparan Rumpun Bunga & Willow Rindang (55%)...');
  await cooperativeYield(4);

  const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.6 });
  const chamomileMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });

  for (let f = 0; f < 36; f++) {
    if (f > 0 && f % 6 === 0) await cooperativeYield(4);
    const fAng = (f / 36) * Math.PI * 2 + (f % 5) * 0.3;
    const fDist = 6.8 + (f % 7) * 1.5;
    const fx = springCenter.x + Math.cos(fAng) * fDist;
    const fz = springCenter.z + Math.sin(fAng) * fDist;
    const fy = getTerrainHeight(fx, fz);

    const fCluster = new THREE.Group();
    fCluster.position.set(fx, fy, fz);

    const isLavender = f % 2 === 0;
    const blossomMat = isLavender ? lavenderMat : chamomileMat;

    // Batang
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 4), flowerStemMat);
    stem.position.y = 0.27;
    fCluster.add(stem);

    // Kuntum bunga
    if (isLavender) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), blossomMat);
      spike.position.y = 0.55;
      fCluster.add(spike);
    } else {
      const daisy = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 7), blossomMat);
      daisy.position.y = 0.55;
      fCluster.add(daisy);
      const daisyCore = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 6), lotusCenterMat);
      daisyCore.position.y = 0.57;
      fCluster.add(daisyCore);
    }

    springGroup.add(fCluster);
  }

  // E. 2 Pohon Willow Rindang Berdaun Teduh (Weeping Willows)
  const willowTreePositions: [number, number][] = [
    [-139, -263],
    [-150, -276],
  ];
  const willowWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9, flatShading: true });
  const willowFoliageMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.8, flatShading: true });

  for (let widx = 0; widx < willowTreePositions.length; widx++) {
    const [wx, wz] = willowTreePositions[widx];
    const wy = getTerrainHeight(wx, wz);
    const willow = new THREE.Group();
    willow.position.set(wx, wy, wz);

    // Batang pohon melengkung anggun
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 4.8, 7), willowWoodMat);
    trunk.position.y = 2.4;
    trunk.rotation.z = widx === 0 ? 0.12 : -0.15;
    trunk.castShadow = true;
    willow.add(trunk);

    // Dahan utama rindang
    const canopyTop = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), willowFoliageMat);
    canopyTop.position.y = 5.6;
    canopyTop.scale.set(1.4, 0.9, 1.4);
    canopyTop.castShadow = true;
    willow.add(canopyTop);

    // Ranting dedaunan melambai menjuntai ke bawah (Cascading Willow Branches)
    for (let d = 0; d < 8; d++) {
      const dAng = (d / 8) * Math.PI * 2;
      const drape = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.8, 5), willowFoliageMat);
      drape.position.set(Math.cos(dAng) * 2.6, 3.8, Math.sin(dAng) * 2.6);
      drape.rotation.x = Math.PI; // Menghadap ke bawah
      drape.castShadow = true;
      willow.add(drape);
    }

    springGroup.add(willow);
    colliders.push({ type: 'circle', x: wx, z: wz, radius: 1.3, label: `Pohon Willow Mata Air ${widx + 1}` });
    await cooperativeYield(4);
  }

  // F. Cahaya Suci Lembut Mata Air (Soft Cyan Sacred Light)
  const springLight = new THREE.PointLight(0x38bdf8, 1.8, 30);
  springLight.position.set(springCenter.x, 2.5, springCenter.z);
  springGroup.add(springLight);

  scene.add(springGroup);

  // ==========================================
  // 10B. REGIONAL LANDMARK: LEMBAH BATU LUMUT (X: 600, Z: -120)
  // Formasi bongkahan granit alami berlumut, pohon rindang teduh, semak bunga, air terjun timur
  // ==========================================
  onProgress?.(58, 'Membentuk Lembah Batu Lumut Granit & Air Terjun (58%)...');
  await hardYield();

  const mossValleyGroup = new THREE.Group();
  mossValleyGroup.name = 'Region_MossValley';
  const mvDX = 135; // 600 - 465
  const mvDZ = -155; // -120 - 35

  const megalithStoneMat = new THREE.MeshStandardMaterial({
    color: 0x475545,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const mossCapMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.85,
    flatShading: true,
  });

  for (let m = 0; m < 32; m++) {
    if (m > 0 && m % 6 === 0) await cooperativeYield(4);
    const angle = (m / 32) * Math.PI * 2 + ((m * 17) % 7) * 0.15;
    const r = 8.0 + ((m * 19) % 24);
    const mx = 465 + mvDX + Math.cos(angle) * r;
    const mz = 35 + mvDZ + Math.sin(angle) * r;
    const mRadius = 1.1 + ((m * 3) % 4) * 0.35;
    if (!isValidDryLand(mx, mz, mRadius + 0.5) || getDistanceToNearestRoad(mx, mz) < 9.5) continue;
    const my = getTerrainHeight(mx, mz);

    const megalith = new THREE.Group();
    megalith.position.set(mx, my, mz);
    megalith.rotation.y = (((m * 37) % 100) / 100) * Math.PI * 2;
    megalith.rotation.z = ((m % 5) - 2) * 0.06;

    // Natural mossy granite boulder using DodecahedronGeometry
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(mRadius * 1.4, 1),
      megalithStoneMat
    );
    boulder.scale.set(1.25, 0.85, 1.15);
    boulder.position.y = (mRadius * 1.4 * 0.85) / 2;
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    megalith.add(boulder);

    // Natural moss cap overlay atop boulder
    const cap = new THREE.Mesh(
      new THREE.DodecahedronGeometry(mRadius * 1.3, 1),
      mossCapMat
    );
    cap.position.y = (mRadius * 1.4 * 0.85) * 0.72;
    cap.scale.set(1.2, 0.42, 1.1);
    megalith.add(cap);

    mossValleyGroup.add(megalith);
    colliders.push({ type: 'circle', x: mx, z: mz, radius: mRadius + 0.4, label: 'Bongkahan Batu Lumut Granit' });
  }

  // Shady trees and peaceful glade in Moss Rock Valley
  for (let tr = 0; tr < 12; tr++) {
    if (tr > 0 && tr % 4 === 0) await cooperativeYield(4);
    const angle = (tr / 12) * Math.PI * 2 + 0.3;
    const dist = 14 + (tr % 3) * 6;
    const tx = 465 + mvDX + Math.cos(angle) * dist;
    const tz = 35 + mvDZ + Math.sin(angle) * dist;
    if (!isValidDryLand(tx, tz, 1.5) || getDistanceToNearestRoad(tx, tz) < 9.5) continue;
    const ty = getTerrainHeight(tx, tz);
    const tree = createTreeMesh(tr % 2 === 0 ? 'fantasy' : 'oak');
    tree.position.set(tx, ty, tz);
    const scale = 0.9 + (tr % 4) * 0.15;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = tr * 1.3;
    mossValleyGroup.add(tree);
    colliders.push({ type: 'circle', x: tx, z: tz, radius: 0.7 * scale, label: 'Pohon Lembah Batu Lumut' });
  }

  // Lush flowering shrubs & flora
  const shrubGeo = new THREE.DodecahedronGeometry(0.7, 0);
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.8, flatShading: true });
  const flowerColors = [0xe879f9, 0x38bdf8, 0xfacc15, 0xf43f5e];
  for (let s = 0; s < 18; s++) {
    if (s > 0 && s % 6 === 0) await cooperativeYield(4);
    const sAngle = (s / 18) * Math.PI * 2 + 0.5;
    const sDist = 6 + (s % 5) * 4.5;
    const sx = 465 + mvDX + Math.cos(sAngle) * sDist;
    const sz = 35 + mvDZ + Math.sin(sAngle) * sDist;
    if (!isValidDryLand(sx, sz, 1.0) || getDistanceToNearestRoad(sx, sz) < 9.5) continue;
    const sy = getTerrainHeight(sx, sz);
    const shrub = new THREE.Mesh(shrubGeo, shrubMat);
    shrub.position.set(sx, sy + 0.35, sz);
    const sScale = 0.7 + (s % 3) * 0.3;
    shrub.scale.set(sScale, sScale * 0.8, sScale);
    mossValleyGroup.add(shrub);

    const blossomMat = new THREE.MeshBasicMaterial({ color: flowerColors[s % flowerColors.length] });
    const blossom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), blossomMat);
    blossom.position.set(sx, sy + 0.35 + 0.5 * sScale, sz);
    mossValleyGroup.add(blossom);
  }

  // Air Terjun Kecil dari Dinding Tebing Timur
  const waterfallCliffY = getTerrainHeight(485 + mvDX, 35 + mvDZ);
  const waterfallBasinY = getTerrainHeight(470 + mvDX, 35 + mvDZ);
  const waterfallHeight = Math.max(4.0, waterfallCliffY - waterfallBasinY + 2.0);

  const waterfallGeo = new THREE.PlaneGeometry(3.5, waterfallHeight, 4, 12);
  const waterfallMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.78,
    roughness: 0.1,
  });
  const waterfallMesh = new THREE.Mesh(waterfallGeo, waterfallMat);
  waterfallMesh.position.set(476 + mvDX, (waterfallCliffY + waterfallBasinY) / 2, 35 + mvDZ);
  waterfallMesh.rotation.y = -Math.PI / 2;
  mossValleyGroup.add(waterfallMesh);

  const basinPoolGeo = new THREE.CircleGeometry(6.5, 24);
  basinPoolGeo.rotateX(-Math.PI / 2);
  const basinPool = new THREE.Mesh(basinPoolGeo, waterfallMat);
  basinPool.position.set(470 + mvDX, waterfallBasinY + 0.1, 35 + mvDZ);
  mossValleyGroup.add(basinPool);

  scene.add(mossValleyGroup);
  await cooperativeYield(4);

  // ==========================================
  // 10C. REGIONAL LANDMARK: HUTAN KABUT ELDORIA (X: 640, Z: -340)
  // 150+ pohon pinus/oak lebat via InstancedMesh & lapisan kabut rendah
  // ==========================================
  onProgress?.(59, 'Menumbuhkan Hutan Kabut Eldoria & Puing Kastil (59%)...');
  await hardYield();

  const mfDX = 305; // 640 - 335
  const mfDZ = -200; // -340 - (-140)
  const mistForestTreesData: { x: number; y: number; z: number; scale: number; rotationY: number }[] = [];
  for (let t = 0; t < 160; t++) {
    if (t > 0 && t % 20 === 0) await cooperativeYield(4);
    const angle = (t / 160) * Math.PI * 2 * 11;
    const r = Math.sqrt((t + 1) / 160) * 58;
    const tx = 335 + mfDX + Math.cos(angle) * r;
    const tz = -140 + mfDZ + Math.sin(angle) * r;
    if (isPointOnRoad(tx, tz) || getDistanceToNearestRoad(tx, tz) < 9.5 || !isValidDryLand(tx, tz, 1.5)) continue;
    const ty = getTerrainHeight(tx, tz);
    const scale = 0.85 + ((t * 7) % 6) * 0.12;

    mistForestTreesData.push({
      x: tx,
      y: ty,
      z: tz,
      scale,
      rotationY: (((t * 29) % 100) / 100) * Math.PI * 2,
    });
    colliders.push({ type: 'circle', x: tx, z: tz, radius: 0.65 * scale, label: 'Pohon Hutan Kabut' });
  }
  const mistForestTreesMesh = createInstancedVillageTrees(mistForestTreesData);
  scene.add(mistForestTreesMesh);
  await cooperativeYield(4);

  const mistPlanesGroup = new THREE.Group();
  for (let mp = 0; mp < 12; mp++) {
    const mistAngle = (mp / 12) * Math.PI * 2;
    const mistR = 12 + (mp % 4) * 11;
    const mx = 335 + mfDX + Math.cos(mistAngle) * mistR;
    const mz = -140 + mfDZ + Math.sin(mistAngle) * mistR;
    const my = getTerrainHeight(mx, mz) + 0.85;

    const mist = createSwampMistPlaneMesh(28, 28);
    mist.position.set(mx, my, mz);
    mist.rotation.y = mistAngle;
    mistPlanesGroup.add(mist);
  }
  scene.add(mistPlanesGroup);
  await cooperativeYield(4);

  // ==========================================
  // 10D. REGIONAL LANDMARK: RERUNTUHAN KUIL KUNO TIMUR (X: 456, Z: -62)
  // Direlokasi aman >= 35 unit dari jalan raya, desain kuil terbuka tanpa invisible barrier
  // ==========================================
  const castleRuinsGroup = new THREE.Group();
  castleRuinsGroup.name = 'Region_CastleRuins';
  createAncientTempleRuinsComplex(castleRuinsGroup, 456, -62, getTerrainHeight, colliders, {
    tileCount: 22,
    archCount: 3,
    pillarCount: 8,
    seedOffset: 7,
  });
  scene.add(castleRuinsGroup);

  // ==========================================
  // 11. REGIONAL CHECKPOINT & WAYPOINT TELEPORTATION MONUMENTS (60%)
  // ==========================================
  onProgress?.(60, 'Menyiapkan Pos Penjaga & Monumen Checkpoint (60%)...');
  await hardYield();

  const checkpoints: WorldCheckpoint[] = [];

  const CHECKPOINT_DEFINITIONS: {
    id: string;
    name: string;
    nameId: string;
    pos: [number, number];
  }[] = [
      {
        id: 'wp_village',
        name: 'Sanctuary Village Plaza',
        nameId: 'Alun-Alun Desa Sanctuary Eldoria',
        pos: [40, -40],
      },
      {
        id: 'wp_harbor',
        name: 'Sanctuary Coastal Harbor',
        nameId: 'Dermaga & Pelabuhan Sanctuary',
        pos: [20, 20],
      },
      {
        id: 'wp_sacred_spring',
        name: 'Sacred Spring & Eldoria Flower Gardens',
        nameId: 'Mata Air Suci & Taman Bunga Eldoria',
        pos: [140, -520],
      },
      {
        id: 'wp_titan',
        name: 'Ancient Titan Lake Valley',
        nameId: 'Lembah Danau Titan Kuno',
        pos: [60, -820],
      },
      {
        id: 'wp_astraea',
        name: 'Grand Imperial Capital Astraea',
        nameId: 'Ibukota Kerajaan Emas Astraea',
        pos: [575, -447],
      },
      {
        id: 'wp_valkragor',
        name: 'Val-Kragor Fortress Plaza',
        nameId: 'Alun-Alun Benteng Val-Kragor',
        pos: [580, 130],
      },
      {
        id: 'wp_thunderpeak',
        name: 'Thunderpeak Spire & Mage Tower',
        nameId: 'Mage Tower Puncak Halilintar',
        pos: [270, -260],
      },
      {
        id: 'wp_solaria_village',
        name: 'Solaria Desert Village & Bazaar',
        nameId: 'Desa Bazaar Gurun Solaria',
        pos: [-540, -420],
      },
      {
        id: 'wp_solaria_palace',
        name: 'Solaria Grand Sultan Palace',
        nameId: 'Istana Sultan Malik',
        pos: [-540, -540],
      },
      {
        id: 'wp_solaria',
        name: 'Solaria Golden Desert Pyramid',
        nameId: 'Piramida Emas Solaria',
        pos: [-360, -520],
      },
      {
        id: 'wp_solaria_oasis',
        name: 'Solaria Hidden Oasis',
        nameId: 'Oase Solaria',
        pos: [-420, -350],
      },
      {
        id: 'wp_dragoncaldera',
        name: 'Dragonfang Caldera Archipelago',
        nameId: 'Kepulauan Kaldera Naga (Lv. 12)',
        pos: [40, 840],
      },
      {
        id: 'wp_lighthouse_island',
        name: 'Sailor Reef & Lighthouse Island',
        nameId: 'Pulau Mercusuar & Karang Pelaut',
        pos: [-220, 460],
      },
      {
        id: 'wp_pirate_island',
        name: 'Pirate Ruins Island',
        nameId: 'Pulau Reruntuhan Bajak Laut',
        pos: [-520, 620],
      },
      {
        id: 'wp_rocky_reef',
        name: 'Craggy Reef Stacks',
        nameId: 'Pulau Karang Terjal',
        pos: [-780, 280],
      },
      {
        id: 'wp_boss_crater',
        name: 'Ancient Colosseum Ruins (Titan Kuno)',
        nameId: 'Arena Colosseum World Boss (Lv. 10)',
        pos: [180, -560],
      },
      {
        id: 'wp_sandworm',
        name: 'Solaria Whirlwind Crater',
        nameId: 'Kawah Pusaran Solaria (Sarang Jarrus)',
        pos: [-840, -260],
      },
      {
        id: 'wp_canyon',
        name: 'Ancient Canyon',
        nameId: 'Kanyon Kuno',
        pos: [-320, -650],
      },
      {
        id: 'wp_mist_forest',
        name: 'Eldoria Mist Forest',
        nameId: 'Hutan Kabut Eldoria',
        pos: [760, -280],
      },
      {
        id: 'wp_abandoned_castle',
        name: 'Abandoned Castle Ruins',
        nameId: 'Puing Kastil Terbengkalai',
        pos: [580, -60],
      },
      {
        id: 'wp_moss_valley',
        name: 'Moss Rock Valley',
        nameId: 'Lembah Batu Lumut',
        pos: [680, -160],
      },
    ];

  // Invisible Checkpoint & Fast Travel Destination Metadata (No 3D Meshes Spawned)
  CHECKPOINT_DEFINITIONS.forEach((cpDef) => {
    const cy = getTerrainHeight(cpDef.pos[0], cpDef.pos[1]);
    checkpoints.push({
      id: cpDef.id,
      name: cpDef.name,
      nameId: cpDef.nameId,
      position: [cpDef.pos[0], cy, cpDef.pos[1]],
      unlocked: false,
    });
  });

  // Cuaca & partikel ambien kini ditangani terpadu per bioma oleh Pooled Biome Weather di GameEngine
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xfff59d,
    size: 0.01,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.visible = false;
  scene.add(particles);

  // Frustum Culling on all meshes & Dynamic PointLights registration
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = true;
    }
    if ((child as THREE.PointLight).isPointLight) {
      pointLights.push(child as THREE.PointLight);
    }
  });

  // Build all 7 GTA-style isolated interiors & glowing exterior entrance markers
  const astLayout = getLandmarkLayout('astraea');
  const astCx = astLayout?.x ?? 575;
  const astCz = astLayout?.z ?? -495;
  const vkBaseY = getTerrainHeight(580, 130);
  const vkForgeY = getTerrainHeight(546, 108);
  const astBaseY = getTerrainHeight(astCx, astCz);
  const astTavY = getTerrainHeight(astCx + 48, astCz + 46);
  const solBaseY = getTerrainHeight(-540, -506);
  const mtBaseY = getTerrainHeight(270, -260);

  const entranceConfigs: Record<string, EntrancePortalConfig> = {
    valkragor_command_hall: {
      id: 'door_valkragor_keep',
      roomId: 'valkragor_command_hall',
      label: 'Aula Komandan Val-Kragor',
      exteriorDoorPos: { x: 580, y: vkBaseY + 0.06, z: 152.2 },
      exteriorReturnSpawn: { x: 580, y: vkBaseY + 0.2, z: 148.2, rotationY: Math.PI },
      colorHex: 0xf59e0b,
    },
    valkragor_blacksmith: {
      id: 'door_valkragor_forge',
      roomId: 'valkragor_blacksmith',
      label: 'Bengkel Pandai Besi Val-Kragor',
      exteriorDoorPos: { x: 554.0, y: vkForgeY + 0.06, z: 108 },
      exteriorReturnSpawn: { x: 557.8, y: vkForgeY + 0.2, z: 108, rotationY: Math.PI / 2 },
      colorHex: 0xf97316,
    },
    astraea_imperial_palace: {
      id: 'door_astraea_palace',
      roomId: 'astraea_imperial_palace',
      label: 'Istana Kaisar Astraea',
      exteriorDoorPos: { x: astCx, y: astBaseY + 0.06, z: astCz - 22.2 },
      exteriorReturnSpawn: { x: astCx, y: astBaseY + 0.2, z: astCz - 17.8, rotationY: 0 },
      colorHex: 0xfbbf24,
    },
    astraea_tavern: {
      id: 'door_astraea_tavern',
      roomId: 'astraea_tavern',
      label: 'Tavern & Toko Ibukota',
      exteriorDoorPos: { x: astCx + 48, y: astTavY + 0.06, z: astCz + 56.2 },
      exteriorReturnSpawn: { x: astCx + 48, y: astTavY + 0.2, z: astCz + 60.5, rotationY: 0 },
      colorHex: 0xf59e0b,
    },
    solaria_sultan_palace: {
      id: 'door_solaria_palace',
      roomId: 'solaria_sultan_palace',
      label: 'Istana Sultan Solaria',
      exteriorDoorPos: { x: -540, y: solBaseY + 0.06, z: -523.5 },
      exteriorReturnSpawn: { x: -540, y: solBaseY + 0.2, z: -519.2, rotationY: 0 },
      colorHex: 0xfbbf24,
    },
    solaria_merchant_bazaar: {
      id: 'door_solaria_bazaar',
      roomId: 'solaria_merchant_bazaar',
      label: 'Bazar & Saudagar Gurun',
      exteriorDoorPos: { x: -501.5, y: solBaseY + 0.06, z: -482 },
      exteriorReturnSpawn: { x: -505.8, y: solBaseY + 0.2, z: -482, rotationY: -Math.PI / 2 },
      colorHex: 0x14b8a6,
    },
    mage_tower_interior: {
      id: 'door_mage_tower',
      roomId: 'mage_tower_interior',
      label: 'Menara Sihir (4 Lantai)',
      exteriorDoorPos: { x: 270, y: mtBaseY + 0.06, z: -241.8 },
      exteriorReturnSpawn: { x: 270, y: mtBaseY + 0.2, z: -237.5, rotationY: 0 },
      colorHex: 0x38bdf8,
    },
  };

  const interiorManager = new InteriorManager(trueScene, scene, entranceConfigs);

  return {
    scene: trueScene,
    exteriorWorldGroup: scene,
    interiorManager,
    animatedProps,
    terrainMesh,
    oceanMesh,
    chests,
    npc: {
      id: 'elder_vaelen',
      group: elderGroup,
      position: elderPos,
    },
    npcs,
    colliders,
    floatingCrystals,
    checkpoints,
    particles,
    lavaSurfaceMat,
    lavaEmbers,
    decorativeProps,
    pointLights,
    dirLight,
    hemiLight,
    getTerrainHeight: (x: number, z: number, currentY?: number) => getSolidGroundHeight(x, z, currentY),
  };
}

