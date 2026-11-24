import * as THREE from 'three';
import { getProceduralContinentHeight, getContinentBiomeSample, isDesertBiome, getDistanceToRiver } from '../mapSampler';
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
} from './models';
import { buildWorldRoadNetwork, isPointOnRoad } from '../RoadSystem';
import { checkFrameBudget, yieldIfBudgetExceeded, yieldToChrome, cooperativeYield } from './frameBudget';
import { SpatialLookupGrid } from './spatialGrid';
import { BRIDGE_CONFIGS, isStrictLandForProps, WATER_LEVEL, distToSegment } from './worldData';
import {
  TERRAIN_GRID,
  setMeshGroundHeights,
  getExactMeshGroundHeight,
} from './worldEnvironment';

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
  decorativeProps?: THREE.Object3D[];
  pointLights?: THREE.PointLight[];
  dirLight?: THREE.DirectionalLight;
  hemiLight?: THREE.HemisphereLight;
  getTerrainHeight: (x: number, z: number) => number;
}

/**
 * Standalone terrain elevation calculator matching procedural continental heights
 */
export function getTerrainHeight(x: number, z: number): number {
  return getExactMeshGroundHeight(x, z);
}

export function buildWorld(scene: THREE.Scene): WorldObjects {
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
        const vx = posAttr.getX(idx) + TERRAIN_GRID.centerX;
        const vz = posAttr.getZ(idx) + TERRAIN_GRID.centerZ;

        // Never clamp inside riverbed (must stay deep at Y = -2.5)
        if (getDistanceToRiver(vx, vz) < 7.0) continue;

        const left = smoothedHeights[gz * gridW + (gx - 1)];
        const right = smoothedHeights[gz * gridW + (gx + 1)];
        const top = smoothedHeights[(gz - 1) * gridW + gx];
        const bottom = smoothedHeights[(gz + 1) * gridW + gx];

        const avg = (left + right + top + bottom) * 0.25;
        let cur = smoothedHeights[idx];

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

    const sample = getContinentBiomeSample(vx, vz);
    colors[i * 3] = sample.color[0] / 255;
    colors[i * 3 + 1] = sample.color[1] / 255;
    colors[i * 3 + 2] = sample.color[2] / 255;
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
  terrainMesh.position.set(TERRAIN_GRID.centerX, 0, TERRAIN_GRID.centerZ);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  setMeshGroundHeights(smoothedHeights);
  const getTerrainHeight = getExactMeshGroundHeight;

  let syncWorld: WorldObjects | null = null;
  populateWorldEntities(scene, terrainMesh, getTerrainHeight, dirLight, hemiLight, decorativeProps, pointLights).then((res) => {
    syncWorld = res;
  });

  return {
    scene,
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
    getTerrainHeight,
  };
}

function createTerrainHeightEvaluator(
  _getMeshSurfaceHeight?: (x: number, z: number) => number,
  _getProceduralHeight?: (x: number, z: number) => number
): (x: number, z: number, forVisualMesh?: boolean) => number {
  return (x: number, z: number, forVisualMesh = false): number => {
    return getExactMeshGroundHeight(x, z, forVisualMesh);
  };
}

export async function buildWorldAsync(
  scene: THREE.Scene,
  onProgress?: (percent: number, statusText: string) => void
): Promise<WorldObjects> {
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

  // 1. Initial procedural heights sampling (Time-sliced 8ms max macrotask budget)
  onProgress?.(15, 'Membangun Geometri & Heightmap Benua Eldoria...');
  const rawHeights = new Float32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i) + TERRAIN_GRID.centerX;
    const vz = posAttr.getZ(i) + TERRAIN_GRID.centerZ;
    rawHeights[i] = getProceduralContinentHeight(vx, vz);
    if (i % 2000 === 0) {
      await cooperativeYield(4);
    }
  }

  // 2. Slope clamping and 3x3 smoothing filter (Time-sliced 8ms max per slice)
  onProgress?.(20, 'Menghaluskan Kontur Elevasi & Palung Sungai...');
  const smoothedHeights = new Float32Array(rawHeights);
  const gridW = TERRAIN_GRID.gridW;
  const gridH = TERRAIN_GRID.gridH;
  const maxSlopeDelta = 2.4;

  for (let pass = 0; pass < 2; pass++) {
    for (let gz = 1; gz < gridH - 1; gz++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const idx = gz * gridW + gx;
        const vx = posAttr.getX(idx) + TERRAIN_GRID.centerX;
        const vz = posAttr.getZ(idx) + TERRAIN_GRID.centerZ;

        if (getDistanceToRiver(vx, vz) < 7.0) continue;

        const left = smoothedHeights[gz * gridW + (gx - 1)];
        const right = smoothedHeights[gz * gridW + (gx + 1)];
        const top = smoothedHeights[(gz - 1) * gridW + gx];
        const bottom = smoothedHeights[(gz + 1) * gridW + gx];

        const avg = (left + right + top + bottom) * 0.25;
        let cur = smoothedHeights[idx];

        if (cur - avg > maxSlopeDelta) {
          cur = avg + maxSlopeDelta;
        } else if (avg - cur > maxSlopeDelta) {
          cur = avg - maxSlopeDelta;
        }
        smoothedHeights[idx] = cur;
      }
      if (gz % 20 === 0) {
        await cooperativeYield(4);
      }
    }
  }

  // 3. Vertex colors generated seamlessly (Time-sliced 8ms max per slice)
  onProgress?.(25, 'Mewarnai Biome Terrain...');
  const colors = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i) + TERRAIN_GRID.centerX;
    const vz = posAttr.getZ(i) + TERRAIN_GRID.centerZ;
    const vy = smoothedHeights[i];
    posAttr.setY(i, vy);

    const sample = getContinentBiomeSample(vx, vz);
    colors[i * 3] = sample.color[0] / 255;
    colors[i * 3 + 1] = sample.color[1] / 255;
    colors[i * 3 + 2] = sample.color[2] / 255;

    if (i % 2000 === 0) {
      await cooperativeYield(4);
    }
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
  terrainMesh.position.set(TERRAIN_GRID.centerX, 0, TERRAIN_GRID.centerZ);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  setMeshGroundHeights(smoothedHeights);
  const getTerrainHeight = getExactMeshGroundHeight;

  // 4. Build Spatial Lookup Grid (2D TypedArray Float32 & Uint8)
  onProgress?.(26, 'Membangun Spatial Lookup Grid & Heightmap (TypedArray)...');
  await SpatialLookupGrid.get().buildAsync(getTerrainHeight, onProgress);
  await cooperativeYield(4);

  return await populateWorldEntities(scene, terrainMesh, getTerrainHeight, dirLight, hemiLight, decorativeProps, pointLights, onProgress);
}


export async function buildHarbor(
  scene: THREE.Scene,
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

  // 1. Wooden Beach Ramp tepat di garis pantai (Z = 19..21)
  const beachRamp = createDockStairRampMesh(4.8, 4.0, 1.8);
  beachRamp.position.set(harborX, 0.05, harborZ);
  scene.add(beachRamp);

  // 2. Extended Main Straight Pier (Dermaga Utama Menjorok lurus ke Samudra Selatan Z: 21..49)
  const pierMain1 = createPierDockMesh({ length: 14.0, width: 4.8, pileDepth: 7.5, hasMooringBollards: true });
  pierMain1.position.set(harborX, dockY, harborZ + 1.0);
  scene.add(pierMain1);

  const pierMain2 = createPierDockMesh({ length: 14.0, width: 4.8, pileDepth: 8.0, hasMooringBollards: true });
  pierMain2.position.set(harborX, dockY, harborZ + 15.0);
  scene.add(pierMain2);

  const pierHeadPlatform = createPierDockMesh({ length: 12.0, width: 10.0, pileDepth: 9.0, hasLantern: true, lanternSide: 'both', hasMooringBollards: true });
  pierHeadPlatform.position.set(harborX, dockY, harborZ + 29.0);
  scene.add(pierHeadPlatform);

  // 3. Symmetrical Berthing Wings (Cabang Tempat Bersandar Kapal di Z = harborZ + 24)
  const wingWest1 = createPierDockMesh({ length: 14.0, width: 4.0, pileDepth: 7.5, hasLantern: true, lanternSide: 'left', hasMooringBollards: true });
  wingWest1.position.set(harborX - 2.4, dockY, harborZ + 24.0);
  wingWest1.rotation.y = Math.PI * 1.5;
  scene.add(wingWest1);

  const wingEast1 = createPierDockMesh({ length: 14.0, width: 4.0, pileDepth: 7.5, hasLantern: true, lanternSide: 'right', hasMooringBollards: true });
  wingEast1.position.set(harborX + 2.4, dockY, harborZ + 24.0);
  wingEast1.rotation.y = Math.PI / 2;
  scene.add(wingEast1);

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
  scene.add(gangwayEast);

  const gangwayWest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayWest.position.set(harborX - 15.5, 1.86, harborZ + 24.0);
  scene.add(gangwayWest);

  colliders.push(
    // Ship Hull Colliders (Outer water boundaries)
    { type: 'box', minX: harborX + 13.0, maxX: harborX + 23.0, minZ: harborZ + 18, maxZ: harborZ + 32, label: 'Lambung Kapal Dagang Emas 1' },
    { type: 'box', minX: harborX - 23.0, maxX: harborX - 13.0, minZ: harborZ + 18, maxZ: harborZ + 32, label: 'Lambung Kapal Perang Bershield' },
    { type: 'box', minX: harborX - 2.6, maxX: harborX + 2.6, minZ: harborZ, maxZ: harborZ + 42, label: 'Dermaga Utama Pelabuhan' }
  );

  await cooperativeYield(4);
  return { oceanMesh };
}


export async function buildMainVillage(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  npcs: WorldNPC[]
): Promise<{ elderGroup: THREE.Group; elderPos: [number, number, number] }> {
  const villageMainlandY = 0.25;
  await cooperativeYield(4);

  // Village Center relocated to (X: 20, Z: -60)
  const vShiftX = 55;  // 20 - (-35)
  const vShiftZ = -195; // -60 - 135

  const villageArch = createVillageArchMesh('GERBANG UTARA ELDORIA');
  const archX = -35 + vShiftX;
  const archZ = 105 + vShiftZ;
  villageArch.position.set(archX, villageMainlandY, archZ);
  scene.add(villageArch);
  colliders.push(
    { type: 'circle', x: archX - 3.5, z: archZ, radius: 0.6, label: 'Gerbang Utara Pilar Kiri' },
    { type: 'circle', x: archX + 3.5, z: archZ, radius: 0.6, label: 'Gerbang Utara Pilar Kanan' }
  );

  // 2.1b Western Village Gateway Arch (Start of Astraea Highway at X = 0, Z = -40)
  const villageWestArch = createVillageArchMesh('GERBANG BARAT ASTRAEA');
  villageWestArch.position.set(-75 + vShiftX, villageMainlandY, 135 + vShiftZ);
  villageWestArch.rotation.y = Math.PI / 2;
  scene.add(villageWestArch);
  colliders.push(
    { type: 'circle', x: -75 + vShiftX, z: 131.5 + vShiftZ, radius: 0.6, label: 'Gerbang Barat Pilar Utara' },
    { type: 'circle', x: -75 + vShiftX, z: 138.5 + vShiftZ, radius: 0.6, label: 'Gerbang Barat Pilar Selatan' }
  );

  // 2.2 Sanctuary Grand Fountain in Central Town Plaza (X: 40, Z: -40)
  // Perfectly centered on plaza, leaving pedestrian circulation open and unobstructed
  const fountainX = -35 + vShiftX;
  const fountainZ = 135 + vShiftZ;
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
  scene.add(sanctuaryPlazaRim);

  // 2.3 Balai Tetua Vaelen & Pusat Komunitas (North-West Plaza: X: 25, Z: -55 - safely >8 units from roads)
  const house1 = createVillageHouseMesh();
  const h1Pos = { x: -50 + vShiftX, z: 120 + vShiftZ };
  house1.position.set(h1Pos.x, villageMainlandY, h1Pos.z);
  house1.rotation.y = Math.PI / 4;
  scene.add(house1);
  colliders.push({
    type: 'box',
    minX: h1Pos.x - 3.2,
    maxX: h1Pos.x + 3.2,
    minZ: h1Pos.z - 3.2,
    maxZ: h1Pos.z + 3.2,
    label: 'Kediaman Tetua Vaelen',
  });

  // 2.4 Village Tavern & Resting Inn: "Penginapan Eldoria" (North-East Plaza: X: 55, Z: -55)
  const tavern = createTavernMesh();
  const tavernPos = { x: -20 + vShiftX, z: 120 + vShiftZ };
  tavern.position.set(tavernPos.x, villageMainlandY, tavernPos.z);
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

  // 2.5 Master Torvald's Blacksmith Forge (South-West: X: 25, Z: -25)
  const blacksmith = createBlacksmithMesh();
  const forgePos = { x: -50 + vShiftX, z: 150 + vShiftZ };
  blacksmith.position.set(forgePos.x, villageMainlandY, forgePos.z);
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

  // 2.6 Anya's Alchemy & Potion Stall (East Commercial Avenue: X: 65, Z: -30)
  const anyaStall = createMarketStallMesh(0x15803d);
  const anyaPos = { x: -10 + vShiftX, z: 145 + vShiftZ };
  anyaStall.position.set(anyaPos.x, villageMainlandY, anyaPos.z);
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

  // 2.7 Maya's Armor & Weapon Outfitter Stall (East Commercial Avenue: X: 67, Z: -20)
  const marketStall2 = createArmorStallMesh(0x1e3a8a);
  const m2Pos = { x: -8 + vShiftX, z: 155 + vShiftZ };
  marketStall2.position.set(m2Pos.x, villageMainlandY, m2Pos.z);
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
  // 2.8 SYMMETRICAL RESIDENTIAL WARDS (West and East Streets)
  // Perfectly aligned, spacious grid on dry elevated ground (≥8 units from road center)
  // ==========================================
  // West Residential Street (along X = 10)
  const house2 = createVillageHouseMesh();
  const h2Pos = { x: -65 + vShiftX, z: 120 + vShiftZ };
  house2.position.set(h2Pos.x, villageMainlandY, h2Pos.z);
  house2.rotation.y = 0;
  scene.add(house2);
  colliders.push({
    type: 'box',
    minX: h2Pos.x - 2.5, maxX: h2Pos.x + 2.5, minZ: h2Pos.z - 2.5, maxZ: h2Pos.z + 2.5,
    label: 'Rumah Pengrajin Barat',
  });

  const house6 = createVillageHouseMesh();
  const h6Pos = { x: -65 + vShiftX, z: 150 + vShiftZ };
  house6.position.set(h6Pos.x, villageMainlandY, h6Pos.z);
  house6.rotation.y = 0;
  scene.add(house6);
  colliders.push({
    type: 'box',
    minX: h6Pos.x - 2.5, maxX: h6Pos.x + 2.5, minZ: h6Pos.z - 2.5, maxZ: h6Pos.z + 2.5,
    label: 'Rumah Kebun Apel Barat',
  });

  const house7 = createVillageHouseMesh();
  const h7Pos = { x: -50 + vShiftX, z: 165 + vShiftZ };
  house7.position.set(h7Pos.x, villageMainlandY, h7Pos.z);
  house7.rotation.y = 0;
  scene.add(house7);
  colliders.push({
    type: 'box',
    minX: h7Pos.x - 2.5, maxX: h7Pos.x + 2.5, minZ: h7Pos.z - 2.5, maxZ: h7Pos.z + 2.5,
    label: 'Pondok Herbalis Barat',
  });

  // East Residential Street (along X = 70)
  const house3 = createVillageHouseMesh();
  const h3Pos = { x: -5 + vShiftX, z: 120 + vShiftZ };
  house3.position.set(h3Pos.x, villageMainlandY, h3Pos.z);
  house3.rotation.y = Math.PI;
  scene.add(house3);
  colliders.push({
    type: 'box',
    minX: h3Pos.x - 2.5, maxX: h3Pos.x + 2.5, minZ: h3Pos.z - 2.5, maxZ: h3Pos.z + 2.5,
    label: 'Rumah Petani Lembah Timur',
  });

  const house4 = createVillageHouseMesh();
  const h4Pos = { x: -5 + vShiftX, z: 145 + vShiftZ };
  house4.position.set(h4Pos.x, villageMainlandY, h4Pos.z);
  house4.rotation.y = Math.PI;
  scene.add(house4);
  colliders.push({
    type: 'box',
    minX: h4Pos.x - 2.5, maxX: h4Pos.x + 2.5, minZ: h4Pos.z - 2.5, maxZ: h4Pos.z + 2.5,
    label: 'Rumah Padang Rumput Timur',
  });

  const house5 = createVillageHouseMesh();
  const h5Pos = { x: -5 + vShiftX, z: 165 + vShiftZ };
  house5.position.set(h5Pos.x, villageMainlandY, h5Pos.z);
  house5.rotation.y = Math.PI;
  scene.add(house5);
  colliders.push({
    type: 'box',
    minX: h5Pos.x - 2.5, maxX: h5Pos.x + 2.5, minZ: h5Pos.z - 2.5, maxZ: h5Pos.z + 2.5,
    label: 'Pondok Penjaga Padang Timur',
  });

  // Coastal Lookout Cottage (Situated safely on dry mainland at Z = 0, X = 39, overlooking the harbor)
  const house8 = createVillageHouseMesh();
  const h8Pos = { x: -36 + vShiftX, z: 175 + vShiftZ };
  house8.position.set(h8Pos.x, villageMainlandY, h8Pos.z);
  house8.rotation.y = 0;
  scene.add(house8);
  colliders.push({
    type: 'box',
    minX: h8Pos.x - 2.5, maxX: h8Pos.x + 2.5, minZ: h8Pos.z - 2.5, maxZ: h8Pos.z + 2.5,
    label: 'Pondok Nelayan Pesisir',
  });

  // 2.9 Street Lamps along Promenade & Sidewalks (InstancedMesh - High Performance 60 FPS)
  const lampPositions = [
    // North Avenue
    [-39 + vShiftX, 115 + vShiftZ],
    [-31 + vShiftX, 115 + vShiftZ],
    [-39 + vShiftX, 125 + vShiftZ],
    [-31 + vShiftX, 125 + vShiftZ],
    // Central Plaza Corners
    [-43 + vShiftX, 127 + vShiftZ],
    [-27 + vShiftX, 127 + vShiftZ],
    [-43 + vShiftX, 143 + vShiftZ],
    [-27 + vShiftX, 143 + vShiftZ],
    // South Promenade leading to Harbor
    [-31 + vShiftX, 150 + vShiftZ],
    [-21 + vShiftX, 150 + vShiftZ],
    [-26 + vShiftX, 165 + vShiftZ],
    [-16 + vShiftX, 165 + vShiftZ],
    [-25 + vShiftX, 180 + vShiftZ],
    [-15 + vShiftX, 180 + vShiftZ],
    // West Avenue
    [-52 + vShiftX, 131 + vShiftZ],
    [-52 + vShiftX, 139 + vShiftZ],
    [-68 + vShiftX, 131 + vShiftZ],
    [-68 + vShiftX, 139 + vShiftZ],
  ];
  const villageLampTransforms = lampPositions.map(([lx, lz]) => {
    colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Jalan' });
    return { x: lx, y: villageMainlandY, z: lz };
  });
  const villageLampsMesh = createInstancedStreetLamps(villageLampTransforms);
  scene.add(villageLampsMesh);

  // Village barrels placed neatly against walls in alleyways (Cleaned up: zero clutter)
  const barrelPositions = [
    [-53.5 + vShiftX, 150 + vShiftZ],
    [-17.0 + vShiftX, 120 + vShiftZ],
    [-7.0 + vShiftX, 145 + vShiftZ],
  ];
  barrelPositions.forEach(([bx, bz]) => {
    const barrel = createBarrelMesh();
    barrel.position.set(bx, villageMainlandY, bz);
    scene.add(barrel);
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 0.45, label: 'Tong Kayu' });
  });

  // ==========================================
  // SANCTUARY NPCS (Organized, Dry, & Accessible Positions)
  // ==========================================
  // NPC 1: Tetua Vaelen (Penjaga Kuil & Tetua Desa) - Porch of Elder Lodge
  const elderGroup = createNPCMesh();
  const elderPos: [number, number, number] = [-47.5 + vShiftX, villageMainlandY, 123.5 + vShiftZ];
  elderGroup.position.set(...elderPos);
  elderGroup.rotation.y = -Math.PI / 4; // Facing South-East towards fountain plaza
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

  // NPC 2: Kapten Ronald (Panglima Penjaga Gerbang Utara)
  const guardGroup = createCustomNPCMesh('guard');
  const guardPos: [number, number, number] = [-35 + vShiftX, villageMainlandY, 107.0 + vShiftZ];
  guardGroup.position.set(...guardPos);
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
  await cooperativeYield(4);

  // NPC 3: Anya (Alkemis & Herbalis) - At her potion counter
  const anyaGroup = createCustomNPCMesh('alchemist');
  const anyaNPCPos: [number, number, number] = [-12.5 + vShiftX, villageMainlandY, 145 + vShiftZ];
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
  const torvaldPos: [number, number, number] = [-47.5 + vShiftX, villageMainlandY, 150 + vShiftZ];
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
  await cooperativeYield(4);

  // NPC 5: Lyra the Wandering Bard - Outside tavern terrace
  const bardGroup = createCustomNPCMesh('bard');
  const bardPos: [number, number, number] = [-22 + vShiftX, villageMainlandY, 122 + vShiftZ];
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
  const jokoPos: [number, number, number] = [42.0, 1.85, 100.0]; // At seaward harbor pier head looking out to open sea
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
  await cooperativeYield(4);

  // NPC 7: Kael (Warga Desa Muda) - By coastal alleyway
  const kaelGroup = createCustomNPCMesh('villager');
  const kaelPos: [number, number, number] = [-38 + vShiftX, villageMainlandY, 162 + vShiftZ];
  kaelGroup.position.set(...kaelPos);
  kaelGroup.rotation.y = Math.PI / 4;
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
  const mayaPos: [number, number, number] = [-30.5 + vShiftX, villageMainlandY, 157 + vShiftZ];
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
  await cooperativeYield(4);

  await cooperativeYield(4);
  return { elderGroup, elderPos };
}


export async function buildAstraeaCastle(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  npcs: WorldNPC[]
): Promise<void> {
  const astraeaBaseY = 2.00;
  await cooperativeYield(4);

  // Relocated Astraea Imperial Capital Center to (X: 460, Z: -420)
  const astDX = 710; // 460 - (-250)
  const astDZ = -180; // -420 - (-240)

  // A. Grand Imperial Sun Palace of Astraea (North End: X: 320, Z: -285)
  // Facing SOUTH (Direction: 0° / rotation.y = 0) looking over the plaza and south gate
  const imperialPalace = createImperialPalaceMesh();
  imperialPalace.position.set(-250 + astDX, astraeaBaseY, -265 + astDZ);
  imperialPalace.rotation.y = 0;
  scene.add(imperialPalace);
  colliders.push({
    type: 'box',
    minX: -264 + astDX,
    maxX: -236 + astDX,
    minZ: -276 + astDZ,
    maxZ: -254 + astDZ,
    label: 'Istana Kerajaan Kaisar Astraea',
  });

  // B. Grand Circular Stone Plaza & Jalan Lingkar (Center: X: 320, Z: -260, Radius: 11.5m)
  const circularPlaza = createCircularPlazaMesh(11.5, 4.8);
  circularPlaza.position.set(-250 + astDX, astraeaBaseY, -240 + astDZ);
  scene.add(circularPlaza);

  // B2. Celestial 3-Tier Fountain of Immortality (Center of Circular Plaza at X: 320, Z: -260)
  const celestialFountain = createImperialFountainMesh();
  celestialFountain.position.set(-250 + astDX, astraeaBaseY, -240 + astDZ);
  scene.add(celestialFountain);
  colliders.push({
    type: 'circle',
    x: -250 + astDX,
    z: -240 + astDZ,
    radius: 4.8,
    label: 'Air Mancur Keabadian Alun-Alun Astraea',
  });

  // B3. Four Golden Heroic Statues Placed at Diagonal Corners of Circular Plaza (NW, NE, SW, SE)
  const heroStatues = [
    { x: -258 + astDX, z: -248 + astDZ, ry: Math.PI * 0.75 }, // Barat Laut
    { x: -242 + astDX, z: -248 + astDZ, ry: Math.PI * 1.25 }, // Timur Laut
    { x: -258 + astDX, z: -232 + astDZ, ry: Math.PI * 0.25 }, // Barat Daya
    { x: -242 + astDX, z: -232 + astDZ, ry: -Math.PI * 0.25 }, // Timur Daya
  ];
  heroStatues.forEach((hs, idx) => {
    const statue = createImperialHeroStatueMesh();
    statue.position.set(hs.x, astraeaBaseY, hs.z);
    statue.rotation.y = hs.ry;
    scene.add(statue);
    colliders.push({ type: 'circle', x: hs.x, z: hs.z, radius: 1.4, label: `Monumen Ksatria Emas ${idx + 1}` });
  });

  // B4. Tiang Lampu Emas Kerajaan di Sepanjang Alur Istana dan Gerbang Selatan
  const astraeaStreetlamps = [
    // Flanking Central Promenade between Gate [320, -230] and Plaza [320, -260]
    { x: -255 + astDX, z: -218 + astDZ },
    { x: -245 + astDX, z: -218 + astDZ },
    { x: -255 + astDX, z: -228 + astDZ },
    { x: -245 + astDX, z: -228 + astDZ },
    // Flanking Central Promenade between Plaza [320, -260] and Palace [320, -285]
    { x: -255 + astDX, z: -250 + astDZ },
    { x: -245 + astDX, z: -250 + astDZ },
    { x: -255 + astDX, z: -258 + astDZ },
    { x: -245 + astDX, z: -258 + astDZ },
    // Outer Courtyard flanking lanterns
    { x: -264 + astDX, z: -240 + astDZ },
    { x: -236 + astDX, z: -240 + astDZ },
  ];
  astraeaStreetlamps.forEach((sl) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(sl.x, astraeaBaseY, sl.z);
    scene.add(lamp);
    colliders.push({ type: 'circle', x: sl.x, z: sl.z, radius: 0.35, label: 'Lampu Emas Kerajaan' });
  });

  // C. South Imperial Gatehouse (South Entrance, X: 320, Z: -230)
  // Facing SOUTH (Rotation Y = 0) meeting approach road perpendicularly
  const imperialGatehouse = createImperialGatehouseMesh();
  imperialGatehouse.position.set(-250 + astDX, astraeaBaseY, -210 + astDZ);
  imperialGatehouse.rotation.y = 0;
  scene.add(imperialGatehouse);
  colliders.push(
    { type: 'box', minX: -257.5 + astDX, maxX: -253.5 + astDX, minZ: -212.5 + astDZ, maxZ: -207.5 + astDZ, label: 'Bastion Barat Gerbang Selatan Astraea' },
    { type: 'box', minX: -246.5 + astDX, maxX: -242.5 + astDX, minZ: -212.5 + astDZ, maxZ: -207.5 + astDZ, label: 'Bastion Timur Gerbang Selatan Astraea' }
  );

  // D. Solid Imperial Fortress Wall Perimeter Enclosing Capital (X: 295..345, Z: -290..-230)
  // 1. South Wall - West Wing (from Gatehouse [316.5, -230] to SW corner [295, -230], length 21.5)
  const wallSouthWest = createImperialWallMesh(21.5);
  wallSouthWest.position.set(-264.25 + astDX, astraeaBaseY, -210 + astDZ);
  scene.add(wallSouthWest);
  colliders.push({ type: 'box', minX: -275 + astDX, maxX: -253.5 + astDX, minZ: -211.5 + astDZ, maxZ: -208.5 + astDZ, label: 'Benteng Astraea Selatan Barat' });

  // 2. South Wall - East Wing (from Gatehouse [323.5, -230] to SE corner [345, -230], length 21.5)
  const wallSouthEast = createImperialWallMesh(21.5);
  wallSouthEast.position.set(-235.75 + astDX, astraeaBaseY, -210 + astDZ);
  scene.add(wallSouthEast);
  colliders.push({ type: 'box', minX: -246.5 + astDX, maxX: -225 + astDX, minZ: -211.5 + astDZ, maxZ: -208.5 + astDZ, label: 'Benteng Astraea Selatan Timur' });

  // 3. North Wall (from [295, -290] to [345, -290], length 50)
  const nWall = createImperialWallMesh(50);
  nWall.position.set(-250 + astDX, astraeaBaseY, -270 + astDZ);
  scene.add(nWall);
  colliders.push({ type: 'box', minX: -275 + astDX, maxX: -225 + astDX, minZ: -271.5 + astDZ, maxZ: -268.5 + astDZ, label: 'Benteng Astraea Utara' });

  // 4. West Wall (from [295, -290] to [295, -230], length 60)
  const wWall = createImperialWallMesh(60);
  wWall.position.set(-275 + astDX, astraeaBaseY, -240 + astDZ);
  wWall.rotation.y = Math.PI / 2;
  scene.add(wWall);
  colliders.push({ type: 'box', minX: -276.5 + astDX, maxX: -273.5 + astDX, minZ: -270 + astDZ, maxZ: -210 + astDZ, label: 'Benteng Astraea Barat' });

  // 5. East Imperial Gatehouse & Split Wall (Facing EAST)
  const imperialEastGatehouse = createImperialGatehouseMesh();
  imperialEastGatehouse.position.set(-225 + astDX, astraeaBaseY, -230 + astDZ);
  imperialEastGatehouse.rotation.y = Math.PI / 2;
  scene.add(imperialEastGatehouse);
  colliders.push(
    { type: 'box', minX: -227.5 + astDX, maxX: -222.5 + astDX, minZ: -237.5 + astDZ, maxZ: -233.5 + astDZ, label: 'Bastion Utara Gerbang Timur Astraea' },
    { type: 'box', minX: -227.5 + astDX, maxX: -222.5 + astDX, minZ: -226.5 + astDZ, maxZ: -222.5 + astDZ, label: 'Bastion Selatan Gerbang Timur Astraea' }
  );

  // 5a. East Wall - North Wing
  const eWallNorth = createImperialWallMesh(36.5);
  eWallNorth.position.set(-225 + astDX, astraeaBaseY, -251.75 + astDZ);
  eWallNorth.rotation.y = Math.PI / 2;
  scene.add(eWallNorth);
  colliders.push({ type: 'box', minX: -226.5 + astDX, maxX: -223.5 + astDX, minZ: -270 + astDZ, maxZ: -233.5 + astDZ, label: 'Benteng Astraea Timur Sayap Utara' });

  // 5b. East Wall - South Wing
  const eWallSouth = createImperialWallMesh(16.5);
  eWallSouth.position.set(-225 + astDX, astraeaBaseY, -218.25 + astDZ);
  eWallSouth.rotation.y = Math.PI / 2;
  scene.add(eWallSouth);
  colliders.push({ type: 'box', minX: -226.5 + astDX, maxX: -223.5 + astDX, minZ: -226.5 + astDZ, maxZ: -210 + astDZ, label: 'Benteng Astraea Timur Sayap Selatan' });

  // 5c. Tiang Lampu Emas Gerbang Timur
  [-234.5, -225.5].forEach((lz) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(-220.5 + astDX, astraeaBaseY, lz + astDZ);
    scene.add(lamp);
    colliders.push({ type: 'circle', x: -220.5 + astDX, z: lz + astDZ, radius: 0.35, label: 'Lampu Emas Gerbang Timur' });
  });

  // 6. Four Corner Bastion Towers
  const cornerTowers = [
    { x: -275 + astDX, z: -210 + astDZ, label: 'Menara Benteng Barat Daya Astraea' },
    { x: -225 + astDX, z: -210 + astDZ, label: 'Menara Benteng Tenggara Astraea' },
    { x: -275 + astDX, z: -270 + astDZ, label: 'Menara Benteng Barat Laut Astraea' },
    { x: -225 + astDX, z: -270 + astDZ, label: 'Menara Benteng Timur Laut Astraea' },
  ];
  cornerTowers.forEach((ct) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(ct.x, astraeaBaseY, ct.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: ct.x, z: ct.z, radius: 2.8, label: ct.label });
  });

  // E. Symmetrical Grand Royal Bazaar Stalls Flanking West & East Promenades
  const astraeaStall1 = createImperialBazaarStallMesh(0x9333ea, 0xfacc15); // Celestial Potions
  astraeaStall1.position.set(-262 + astDX, astraeaBaseY, -225 + astDZ);
  astraeaStall1.rotation.y = Math.PI / 2;
  scene.add(astraeaStall1);
  colliders.push({ type: 'box', minX: -264 + astDX, maxX: -260 + astDX, minZ: -227 + astDZ, maxZ: -223 + astDZ, label: 'Kios Alkimia Kerajaan' });

  const astraeaStall2 = createImperialBazaarStallMesh(0x2563eb, 0x38bdf8); // Masterwork Armory
  astraeaStall2.position.set(-262 + astDX, astraeaBaseY, -245 + astDZ);
  astraeaStall2.rotation.y = Math.PI / 2;
  scene.add(astraeaStall2);
  colliders.push({ type: 'box', minX: -264 + astDX, maxX: -260 + astDX, minZ: -247 + astDZ, maxZ: -243 + astDZ, label: 'Kios Senjata Astraea' });

  const astraeaStall3 = createImperialBazaarStallMesh(0xd97706, 0xfef08a); // Silk & Relics
  astraeaStall3.position.set(-238 + astDX, astraeaBaseY, -225 + astDZ);
  astraeaStall3.rotation.y = -Math.PI / 2;
  scene.add(astraeaStall3);
  colliders.push({ type: 'box', minX: -240 + astDX, maxX: -236 + astDX, minZ: -227 + astDZ, maxZ: -223 + astDZ, label: 'Kios Sutra Emas' });

  const astraeaStall4 = createImperialBazaarStallMesh(0x059669, 0xa7f3d0); // Royal Provisions
  astraeaStall4.position.set(-238 + astDX, astraeaBaseY, -245 + astDZ);
  astraeaStall4.rotation.y = -Math.PI / 2;
  scene.add(astraeaStall4);
  colliders.push({ type: 'box', minX: -240 + astDX, maxX: -236 + astDX, minZ: -247 + astDZ, maxZ: -243 + astDZ, label: 'Kios Perjamuan Kaisar' });

  // G. Pine Trees along Courtyard Perimeter (Inside Inner Walls)
  const astraeaCourtyardPineCoords = [
    { x: -268 + astDX, z: -255 + astDZ }, { x: -268 + astDX, z: -235 + astDZ },
    { x: -232 + astDX, z: -255 + astDZ }, { x: -232 + astDX, z: -235 + astDZ },
    { x: -268 + astDX, z: -220 + astDZ }, { x: -232 + astDX, z: -220 + astDZ },
  ];
  astraeaCourtyardPineCoords.forEach((pc) => {
    const s = 0.95 + Math.random() * 0.35;
    const pTree = createTreeMesh('pine');
    pTree.position.set(pc.x, astraeaBaseY, pc.z);
    scene.add(pTree);
    colliders.push({ type: 'circle', x: pc.x, z: pc.z, radius: 0.6 * s, label: 'Pohon Pinus Astraea' });
  });

  // H. Astraea Royal NPCs
  // NPC 13: Kaisar Aurelius Astraea (Standing on Throne Portico at palace entrance, facing South over plaza)
  const emperorGroup = createCustomNPCMesh('emperor');
  const emperorPos: [number, number, number] = [-250 + astDX, astraeaBaseY + 1.6, -257 + astDZ];
  emperorGroup.position.set(...emperorPos);
  emperorGroup.rotation.y = 0; // Facing South towards plaza and south gate
  scene.add(emperorGroup);
  npcs.push({
    id: 'emperor_aurelius',
    name: 'Emperor Aurelius',
    nameId: 'Kaisar Aurelius Astraea',
    role: 'Ruler of the Imperial Realm',
    roleType: 'emperor',
    group: emperorGroup,
    position: emperorPos,
    dialogueId: 'emperor_aurelius',
    icon: '👑',
  });

  // NPC 14: Panglima Perang Vane (Standing with dignity flanking the royal avenue entrance)
  const marshalGroup = createCustomNPCMesh('marshal');
  const marshalPos: [number, number, number] = [-246 + astDX, astraeaBaseY, -215 + astDZ];
  marshalGroup.position.set(...marshalPos);
  marshalGroup.rotation.y = 0;
  scene.add(marshalGroup);
  npcs.push({
    id: 'marshal_vane',
    name: 'Grand Marshal Vane',
    nameId: 'Panglima Perang Vane',
    role: 'Supreme Legion Commander',
    roleType: 'marshal',
    group: marshalGroup,
    position: marshalPos,
    dialogueId: 'marshal_vane',
    icon: '⚔️',
  });
  await cooperativeYield(4);

  // NPC 15: Saudagar Kerajaan Lyra (At Alchemy Stall, facing East into promenade)
  const lyraGroup = createCustomNPCMesh('alchemist');
  const lyraPos: [number, number, number] = [-260 + astDX, astraeaBaseY, -225 + astDZ];
  lyraGroup.position.set(...lyraPos);
  lyraGroup.rotation.y = Math.PI / 2;
  scene.add(lyraGroup);
  npcs.push({
    id: 'merchant_lyra',
    name: 'Royal Merchant Lyra',
    nameId: 'Saudagar Kerajaan Lyra',
    role: 'Imperial Silk & Elixir Merchant',
    roleType: 'alchemist',
    group: lyraGroup,
    position: lyraPos,
    dialogueId: 'merchant_lyra',
    icon: '💎',
  });

  // NPC 16: Penjaga Gerbang Emas Astraea (Outside South Gate, facing South)
  const astraeaGuardGroup = createCustomNPCMesh('guard');
  const astraeaGuardPos: [number, number, number] = [-250 + astDX, astraeaBaseY, -207 + astDZ];
  astraeaGuardGroup.position.set(...astraeaGuardPos);
  astraeaGuardGroup.rotation.y = 0; // Facing South guarding entrance from highway
  scene.add(astraeaGuardGroup);
  npcs.push({
    id: 'guard_astraea',
    name: 'Imperial Gate Sentinel',
    nameId: 'Prajurit Gerbang Emas Astraea',
    role: 'Imperial Palace Guard',
    roleType: 'guard',
    group: astraeaGuardGroup,
    position: astraeaGuardPos,
    dialogueId: 'guard_astraea',
    icon: '🛡️',
  });

  await cooperativeYield(4);
}


export async function buildValKragorFort(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  npcs: WorldNPC[],
  floatingCrystals: THREE.Mesh[]
): Promise<void> {
  const valKragorBaseY = 3.80;
  await cooperativeYield(4);
  const vkBaseX = 580;
  const vkBaseZ = 130;
  const vkDX = vkBaseX - 380; // 200
  const vkDZ = vkBaseZ - 80;  // 50

  // A. Grand Fortress Gatehouse (West Entrance at X = 289, Z = 95)
  // Menghadap lurus ke BARAT (Rotation Y = 270° / Math.PI * 1.5) menyambut jalan raya berbatu dari jembatan
  const fortressGate = createFortressGatehouseMesh();
  fortressGate.position.set(354 + vkDX, valKragorBaseY, 80 + vkDZ);
  fortressGate.rotation.y = Math.PI * 1.5;
  scene.add(fortressGate);
  colliders.push(
    { type: 'box', minX: 352 + vkDX, maxX: 356 + vkDX, minZ: 73.5 + vkDZ, maxZ: 77.5 + vkDZ, label: 'Menara Gerbang Val-Kragor Kiri' },
    { type: 'box', minX: 352 + vkDX, maxX: 356 + vkDX, minZ: 82.5 + vkDZ, maxZ: 86.5 + vkDZ, label: 'Menara Gerbang Val-Kragor Kanan' }
  );

  // B. Grand Fortress Citadel / Command Keep (East End of Courtyard at X = 337, Z = 95)
  // Menghadap ke BARAT ke arah alun-alun dan gerbang utama
  const fortressKeep = createFortressKeepMesh();
  fortressKeep.position.set(402 + vkDX, valKragorBaseY, 80 + vkDZ);
  fortressKeep.rotation.y = -Math.PI / 2;
  scene.add(fortressKeep);
  colliders.push({
    type: 'box',
    minX: 397 + vkDX,
    maxX: 407 + vkDX,
    minZ: 74 + vkDZ,
    maxZ: 86 + vkDZ,
    label: 'Kastil Komando Val-Kragor',
  });

  // C. Four Expanded Corner Watchtowers
  const towerCoords = [
    { x: 354 + vkDX, z: 58 + vkDZ, label: 'Menara Sudut Barat Laut' },
    { x: 354 + vkDX, z: 102 + vkDZ, label: 'Menara Sudut Barat Daya' },
    { x: 406 + vkDX, z: 58 + vkDZ, label: 'Menara Sudut Timur Laut' },
    { x: 406 + vkDX, z: 102 + vkDZ, label: 'Menara Sudut Timur Daya' },
  ];
  towerCoords.forEach((tc) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(tc.x, valKragorBaseY, tc.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: tc.x, z: tc.z, radius: 2.5, label: tc.label });
  });

  // D. Solid Rampart Walls Enclosing Expanded Courtyard (X: 289..341, Z: 73..117)
  // North Wall (length 52, centered at X: 315, Z: 73)
  const vkWallNorth = createFortressWallMesh(52);
  vkWallNorth.position.set(380 + vkDX, valKragorBaseY, 58 + vkDZ);
  scene.add(vkWallNorth);
  colliders.push({ type: 'box', minX: 354 + vkDX, maxX: 406 + vkDX, minZ: 56.5 + vkDZ, maxZ: 59.5 + vkDZ, label: 'Benteng Val-Kragor Utara' });

  // South Wall (length 52, centered at X: 315, Z: 117)
  const vkWallSouth = createFortressWallMesh(52);
  vkWallSouth.position.set(380 + vkDX, valKragorBaseY, 102 + vkDZ);
  scene.add(vkWallSouth);
  colliders.push({ type: 'box', minX: 354 + vkDX, maxX: 406 + vkDX, minZ: 100.5 + vkDZ, maxZ: 103.5 + vkDZ, label: 'Benteng Val-Kragor Selatan' });

  // East Wall (length 44, centered at X: 341, Z: 95)
  const vkWallEast = createFortressWallMesh(44);
  vkWallEast.position.set(406 + vkDX, valKragorBaseY, 80 + vkDZ);
  vkWallEast.rotation.y = Math.PI / 2;
  scene.add(vkWallEast);
  colliders.push({ type: 'box', minX: 404.5 + vkDX, maxX: 407.5 + vkDX, minZ: 58 + vkDZ, maxZ: 102 + vkDZ, label: 'Benteng Val-Kragor Timur' });

  // West Wall North Segment (connecting NW Watchtower to Gate North Bastion)
  const vkWallWestN = createFortressWallMesh(17.5);
  vkWallWestN.position.set(354 + vkDX, valKragorBaseY, 66.75 + vkDZ);
  vkWallWestN.rotation.y = Math.PI / 2;
  scene.add(vkWallWestN);
  colliders.push({ type: 'box', minX: 352.5 + vkDX, maxX: 355.5 + vkDX, minZ: 58 + vkDZ, maxZ: 75.5 + vkDZ, label: 'Benteng Val-Kragor Barat Laut' });

  // West Wall South Segment (connecting SW Watchtower to Gate South Bastion)
  const vkWallWestS = createFortressWallMesh(17.5);
  vkWallWestS.position.set(354 + vkDX, valKragorBaseY, 93.25 + vkDZ);
  vkWallWestS.rotation.y = Math.PI / 2;
  scene.add(vkWallWestS);
  colliders.push({ type: 'box', minX: 352.5 + vkDX, maxX: 355.5 + vkDX, minZ: 84.5 + vkDZ, maxZ: 102 + vkDZ, label: 'Benteng Val-Kragor Barat Daya' });

  // E. Outer Perimeter Surveillance Watchtowers
  const outerVkTowers = [
    { x: 344 + vkDX, z: 50 + vkDZ, label: 'Menara Pengawas Luar Barat Laut' },
    { x: 416 + vkDX, z: 50 + vkDZ, label: 'Menara Pengawas Luar Timur Laut' },
    { x: 344 + vkDX, z: 110 + vkDZ, label: 'Menara Pengawas Luar Barat Daya' },
    { x: 416 + vkDX, z: 110 + vkDZ, label: 'Menara Pengawas Luar Timur Daya' },
  ];
  outerVkTowers.forEach((ot) => {
    const oTower = createFortressWatchtowerMesh();
    oTower.position.set(ot.x, getTerrainHeight(ot.x, ot.z), ot.z);
    scene.add(oTower);
    colliders.push({ type: 'circle', x: ot.x, z: ot.z, radius: 2.5, label: ot.label });
  });

  // F. INTERIOR MILITARY FACILITIES (Lengkap, Rapi, & Tidak Kosong!)
  // F1. Barak Prajurit (Soldier Barracks in North-West Courtyard)
  const vkBarracks = createBarracksMesh();
  vkBarracks.position.set(368 + vkDX, valKragorBaseY, 68 + vkDZ);
  vkBarracks.rotation.y = 0;
  scene.add(vkBarracks);
  colliders.push({
    type: 'box',
    minX: 363.5 + vkDX,
    maxX: 372.5 + vkDX,
    minZ: 64.5 + vkDZ,
    maxZ: 71.5 + vkDZ,
    label: 'Barak Prajurit Benteng Val-Kragor',
  });

  // F2. Bengkel Tempa & Kedai Persenjataan Goran
  const goranForge = createBlacksmithMesh();
  goranForge.position.set(388 + vkDX, valKragorBaseY, 68 + vkDZ);
  goranForge.rotation.y = 0;
  scene.add(goranForge);
  colliders.push({
    type: 'box',
    minX: 385 + vkDX,
    maxX: 391 + vkDX,
    minZ: 65 + vkDZ,
    maxZ: 71 + vkDZ,
    label: 'Bengkel Tempa Gunung Goran',
  });

  // F3. Rak Senjata Militer di Luar Bengkel Tempa
  const rack1 = createWeaponRackMesh();
  rack1.position.set(382 + vkDX, valKragorBaseY, 71 + vkDZ);
  scene.add(rack1);
  const rack2 = createWeaponRackMesh();
  rack2.position.set(394 + vkDX, valKragorBaseY, 71 + vkDZ);
  scene.add(rack2);
  colliders.push(
    { type: 'box', minX: 380.8 + vkDX, maxX: 383.2 + vkDX, minZ: 70.5 + vkDZ, maxZ: 71.5 + vkDZ, label: 'Rak Senjata Benteng 1' },
    { type: 'box', minX: 392.8 + vkDX, maxX: 395.2 + vkDX, minZ: 70.5 + vkDZ, maxZ: 71.5 + vkDZ, label: 'Rak Senjata Benteng 2' }
  );

  // F4. Frostwolf Tavern / Highland Longhouse
  const frostwolfLodge = createTavernMesh();
  frostwolfLodge.position.set(388 + vkDX, valKragorBaseY, 92 + vkDZ);
  frostwolfLodge.rotation.y = Math.PI;
  scene.add(frostwolfLodge);
  colliders.push({
    type: 'box',
    minX: 384 + vkDX,
    maxX: 392 + vkDX,
    minZ: 88.5 + vkDZ,
    maxZ: 95.5 + vkDZ,
    label: 'Kedai Serigala Salju',
  });

  // F5. Tempat Latihan Pedang & Sasaran Panah
  const dummy1 = createTrainingDummyMesh();
  dummy1.position.set(364 + vkDX, valKragorBaseY, 88 + vkDZ);
  dummy1.rotation.y = Math.PI / 4;
  const dummy2 = createTrainingDummyMesh();
  dummy2.position.set(370 + vkDX, valKragorBaseY, 88 + vkDZ);
  dummy2.rotation.y = -Math.PI / 6;
  scene.add(dummy1, dummy2);
  colliders.push(
    { type: 'circle', x: 364 + vkDX, z: 88 + vkDZ, radius: 0.6, label: 'Boneka Latihan Pedang 1' },
    { type: 'circle', x: 370 + vkDX, z: 88 + vkDZ, radius: 0.6, label: 'Boneka Latihan Pedang 2' }
  );

  const archeryTarget1 = createArcheryTargetMesh();
  archeryTarget1.position.set(364 + vkDX, valKragorBaseY, 93 + vkDZ);
  archeryTarget1.rotation.y = 0;
  const archeryTarget2 = createArcheryTargetMesh();
  archeryTarget2.position.set(370 + vkDX, valKragorBaseY, 93 + vkDZ);
  archeryTarget2.rotation.y = 0;
  scene.add(archeryTarget1, archeryTarget2);
  colliders.push(
    { type: 'box', minX: 363.2 + vkDX, maxX: 364.8 + vkDX, minZ: 92.5 + vkDZ, maxZ: 93.5 + vkDZ, label: 'Sasaran Panah 1' },
    { type: 'box', minX: 369.2 + vkDX, maxX: 370.8 + vkDX, minZ: 92.5 + vkDZ, maxZ: 93.5 + vkDZ, label: 'Sasaran Panah 2' }
  );

  // F6. Menara Panah Interior
  const innerArrowTower1 = createFortressWatchtowerMesh();
  innerArrowTower1.position.set(362 + vkDX, valKragorBaseY, 64 + vkDZ);
  scene.add(innerArrowTower1);
  colliders.push({ type: 'circle', x: 362 + vkDX, z: 64 + vkDZ, radius: 2.2, label: 'Menara Panah Interior Utara' });

  const innerArrowTower2 = createFortressWatchtowerMesh();
  innerArrowTower2.position.set(362 + vkDX, valKragorBaseY, 96 + vkDZ);
  scene.add(innerArrowTower2);
  colliders.push({ type: 'circle', x: 362 + vkDX, z: 96 + vkDZ, radius: 2.2, label: 'Menara Panah Interior Selatan' });

  // F7. Api Unggun Prajurit Benteng
  const fortressFire = createBonfireMesh();
  fortressFire.position.set(378 + vkDX, valKragorBaseY, 80 + vkDZ);
  scene.add(fortressFire);
  colliders.push({ type: 'circle', x: 378 + vkDX, z: 80 + vkDZ, radius: 1.2, label: 'Perapian Utama Benteng' });

  // F8. Courtyard Iron Streetlamps
  for (const lx of [360, 372, 386, 396]) {
    for (const lz of [76, 84]) {
      const lamp = createStreetLampMesh();
      lamp.position.set(lx + vkDX, valKragorBaseY, lz + vkDZ);
      scene.add(lamp);
      colliders.push({ type: 'circle', x: lx + vkDX, z: lz + vkDZ, radius: 0.35, label: 'Lampu Benteng' });
    }
  }

  // --- NPCS OF DESA BENTENG VAL-KRAGOR ---
  // NPC 9: Komandan Brann (Highland Fortress Commander)
  const brannGroup = createCustomNPCMesh('commander');
  const brannPos: [number, number, number] = [378 + vkDX, valKragorBaseY, 83 + vkDZ];
  brannGroup.position.set(...brannPos);
  brannGroup.rotation.y = -Math.PI / 2;
  scene.add(brannGroup);
  npcs.push({
    id: 'commander_brann',
    name: 'Commander Brann',
    nameId: 'Komandan Brann',
    role: 'Fortress Warlord',
    roleType: 'commander',
    group: brannGroup,
    position: brannPos,
    dialogueId: 'commander_brann',
    icon: '🐺',
  });

  // NPC 10: Peramal Elora (Astrologer & Seer)
  const eloraGroup = createCustomNPCMesh('seer');
  const eloraPos: [number, number, number] = [390 + vkDX, valKragorBaseY, 86 + vkDZ];
  eloraGroup.position.set(...eloraPos);
  eloraGroup.rotation.y = -Math.PI / 3;
  scene.add(eloraGroup);
  npcs.push({
    id: 'seer_elora',
    name: 'Seer Elora',
    nameId: 'Peramal Elora',
    role: 'Celestial Astrologer',
    roleType: 'seer',
    group: eloraGroup,
    position: eloraPos,
    dialogueId: 'seer_elora',
    icon: '🔮',
  });
  await cooperativeYield(4);

  // NPC 11: Goran Pandai Besi Dataran Tinggi (Highland Smith)
  const goranGroup = createCustomNPCMesh('frostsmith');
  const goranPos: [number, number, number] = [388 + vkDX, valKragorBaseY, 72 + vkDZ];
  goranGroup.position.set(...goranPos);
  goranGroup.rotation.y = Math.PI;
  scene.add(goranGroup);
  npcs.push({
    id: 'frostsmith_goran',
    name: 'Goran the Frostsmith',
    nameId: 'Goran Pandai Besi',
    role: 'Highland Forge Master',
    roleType: 'frostsmith',
    group: goranGroup,
    position: goranPos,
    dialogueId: 'frostsmith_goran',
    icon: '🔨',
  });

  // NPC 12: Prajurit Penjaga Gerbang Barat Kiri (Sentinel Gerbang Kiri)
  const fGuardGroup = createCustomNPCMesh('guard');
  const fGuardPos: [number, number, number] = [352 + vkDX, valKragorBaseY, 77 + vkDZ];
  fGuardGroup.position.set(...fGuardPos);
  fGuardGroup.rotation.y = Math.PI * 1.5;
  scene.add(fGuardGroup);
  npcs.push({
    id: 'guard_valkragor',
    name: 'Val-Kragor Sentinel',
    nameId: 'Prajurit Penjaga Gerbang Val-Kragor',
    role: 'Fortress Vanguard',
    roleType: 'guard',
    group: fGuardGroup,
    position: fGuardPos,
    dialogueId: 'guard_valkragor',
    icon: '🛡️',
  });
  await cooperativeYield(4);

  // NPC 12b: Prajurit Penjaga Gerbang Barat Kanan (Sentinel Gerbang Kanan)
  const fGuardGroup2 = createCustomNPCMesh('guard');
  const fGuardPos2: [number, number, number] = [352 + vkDX, valKragorBaseY, 83 + vkDZ];
  fGuardGroup2.position.set(...fGuardPos2);
  fGuardGroup2.rotation.y = Math.PI * 1.5;
  scene.add(fGuardGroup2);
  npcs.push({
    id: 'guard_valkragor_2',
    name: 'Val-Kragor Gate Sentinel',
    nameId: 'Prajurit Pengawal Gerbang Kanan',
    role: 'Gatekeeper',
    roleType: 'guard',
    group: fGuardGroup2,
    position: fGuardPos2,
    dialogueId: 'guard_valkragor',
    icon: '🛡️',
  });

  // NPC 12c: Prajurit Penjaga Barak (Barracks Sentry)
  const fGuardGroup3 = createCustomNPCMesh('guard');
  const fGuardPos3: [number, number, number] = [368 + vkDX, valKragorBaseY, 74 + vkDZ];
  fGuardGroup3.position.set(...fGuardPos3);
  fGuardGroup3.rotation.y = 0;
  scene.add(fGuardGroup3);
  npcs.push({
    id: 'guard_valkragor_barracks',
    name: 'Barracks Sentry',
    nameId: 'Prajurit Pengawal Barak',
    role: 'Camp Sentry',
    roleType: 'guard',
    group: fGuardGroup3,
    position: fGuardPos3,
    dialogueId: 'guard_valkragor',
    icon: '🛡️',
  });
  await cooperativeYield(4);

  // NPC 12d: Prajurit Rekrut Latihan Pedang (Sparring Recruit)
  const fRecruitGroup = createCustomNPCMesh('guard');
  const fRecruitPos: [number, number, number] = [366 + vkDX, valKragorBaseY, 90 + vkDZ];
  fRecruitGroup.position.set(...fRecruitPos);
  fRecruitGroup.rotation.y = Math.PI;
  scene.add(fRecruitGroup);
  npcs.push({
    id: 'valkragor_recruit',
    name: 'Val-Kragor Recruit',
    nameId: 'Prajurit Rekrut Latihan',
    role: 'Trainee',
    roleType: 'villager',
    group: fRecruitGroup,
    position: fRecruitPos,
    dialogueId: 'guard_valkragor',
    icon: '⚔️',
  });
  await cooperativeYield(4);

  // ==========================================
  // 2.9 SISTEM 4 JEMBATAN PERPOTONGAN SUNGAI (BRIDGE_CONFIGS SINGLE SOURCE OF TRUTH)
  // Menyeberangi sungai tegak lurus dengan abutment padat dan pagar pembatas kokoh
  // ==========================================
  for (const b of BRIDGE_CONFIGS) {
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
      bridgeMesh = createStoneArchBridgeMesh(b.length, b.width, 2.7);
      bridgeMesh.position.set(b.x, b.y, b.z);
      bridgeMesh.rotation.y = b.rotationY;
      scene.add(bridgeMesh);
    }

    if (Math.abs(b.rotationY) < 0.1) {
      colliders.push(
        { type: 'box', minX: b.x - b.length / 2, maxX: b.x + b.length / 2, minZ: b.z - b.width / 2 - 0.4, maxZ: b.z - b.width / 2, label: `Pagar ${b.nameId} Sisi Utara` },
        { type: 'box', minX: b.x - b.length / 2, maxX: b.x + b.length / 2, minZ: b.z + b.width / 2, maxZ: b.z + b.width / 2 + 0.4, label: `Pagar ${b.nameId} Sisi Selatan` }
      );
    } else {
      colliders.push(
        { type: 'box', minX: b.x - b.width / 2 - 0.4, maxX: b.x - b.width / 2, minZ: b.z - b.length / 2, maxZ: b.z + b.length / 2, label: `Pagar ${b.nameId} Sisi Barat` },
        { type: 'box', minX: b.x + b.width / 2, maxX: b.x + b.width / 2 + 0.4, minZ: b.z - b.length / 2, maxZ: b.z + b.length / 2, label: `Pagar ${b.nameId} Sisi Timur` }
      );
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
  // Monumental Ancient Archway Gate (West Entrance at X: -105, Z: 32)
  const ancientArch = createAncientArchMesh();
  const archY = getTerrainHeight(-105, 32);
  ancientArch.position.set(-105, archY, 32);
  ancientArch.rotation.y = Math.PI / 2;
  scene.add(ancientArch);
  colliders.push(
    { type: 'circle', x: -105, z: 29.5, radius: 0.9, label: 'Pilar Gapura Kuno Kiri' },
    { type: 'circle', x: -105, z: 34.5, radius: 0.9, label: 'Pilar Gapura Kuno Kanan' }
  );

  // Spatial Ancient Pillars scattered across the ruined sanctuary
  const ruinsPositions = [
    { x: -112, z: 26 },
    { x: -120, z: 32 },
    { x: -115, z: 42 },
    { x: -128, z: 24 },
    { x: -135, z: 36 },
    { x: -130, z: 48 },
    { x: -122, z: 52 },
    { x: -110, z: 48 },
  ];
  ruinsPositions.forEach((pos) => {
    if (!isStrictLandForProps(pos.x, pos.z, getTerrainHeight)) return;
    const pillar = createAncientPillarMesh();
    const py = getTerrainHeight(pos.x, pos.z);
    pillar.position.set(pos.x, py, pos.z);
    pillar.rotation.y = Math.random() * Math.PI;
    scene.add(pillar);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 0.85, label: 'Pilar Kuno' });
  });

  // ==========================================
  // 4. MYSTIC FOREST & MANA CRYSTALS (Hutan Pinus Mistis: X: -80..-40, Z: 80..140)
  // ==========================================
  // floatingCrystals passed as argument
  const monolith1 = createCrystalMonolithMesh();
  monolith1.group.position.set(-60, getTerrainHeight(-60, 100), 100);
  scene.add(monolith1.group);
  floatingCrystals.push(monolith1.crystal);

  const monolith2 = createCrystalMonolithMesh();
  monolith2.group.position.set(-50, getTerrainHeight(-50, 120), 120);
  scene.add(monolith2.group);
  floatingCrystals.push(monolith2.crystal);

  const monolith3 = createCrystalMonolithMesh();
  monolith3.group.position.set(-70, getTerrainHeight(-70, 90), 90);
  scene.add(monolith3.group);
  floatingCrystals.push(monolith3.crystal);

  // Mystic Pine Forest dense groves
  for (let i = 0; i < 45; i++) {
    if (i > 0 && i % 15 === 0) await cooperativeYield(4);
    const px = -80 + Math.random() * 40;
    const pz = 80 + Math.random() * 60;
    // DILARANG SPAWN di biome gurun!
    if (isDesertBiome(px, pz)) continue;
    // Pembersihan rintangan jalan: Jangan spawn pohon di atas jalan
    if (isPointOnRoad(px, pz)) continue;

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
    const tz = 180 + Math.sin(angle) * dist;

    // Strict Anti-Overlap & Cross-Biome Exclusion: DILARANG SPAWN di biome gurun atau laut!
    if (!isStrictLandForProps(tx, tz, getTerrainHeight)) continue;
    if (isDesertBiome(tx, tz)) continue;
    if (getDistanceToRiver(tx, tz) < 18.0) continue;
    const inSanctuaryMainland = (tx >= -70 && tx <= -10 && tz >= 115 && tz <= 175);
    const inSanctuaryHarborOcean = (Math.abs(tx - -140) <= 45 && tz >= 180);
    const inBridgeHighwayCorridor = (tx >= 115 && tx <= 360 && (Math.abs(tz - 47) <= 12.0 || Math.abs(tz - 75) <= 12.0));
    const inValKragor = (tx >= 270 && tx <= 350 && tz >= 80 && tz <= 145);
    const inDragonCaldera = Math.hypot(tx - -40, tz - 340) < 65;
    const inAstraea = Math.hypot(tx - -250, tz - -210) < 60;
    const inTitan = Math.hypot(tx - 235, tz - -380) < 55;
    const inSandworm = Math.hypot(tx - -30, tz - -220) < 50;
    const inMageTower = Math.hypot(tx - 110, tz - -10) < 30;
    const inMossValley = Math.hypot(tx - 465, tz - 35) < 45;
    if (inSanctuaryMainland || inSanctuaryHarborOcean || inBridgeHighwayCorridor || inValKragor || inDragonCaldera || inAstraea || inTitan || inSandworm || inMageTower || inMossValley) continue;

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
    // West Residential Backyards (Apple & Oak orchard)
    { x: -65, z: 135, type: 'oak', scale: 1.1 },
    { x: -65, z: 147, type: 'oak', scale: 1.2 },
    { x: -65, z: 159, type: 'oak', scale: 1.1 },
    // East Residential Backyards (Lush Garden)
    { x: -14, z: 135, type: 'oak', scale: 1.1 },
    { x: -14, z: 147, type: 'oak', scale: 1.2 },
    { x: -14, z: 159, type: 'oak', scale: 1.1 },
    // Flanking North Gate
    { x: -47, z: 125, type: 'pine', scale: 1.2 },
    { x: -33, z: 125, type: 'pine', scale: 1.2 },
    // North Garden behind Elder Lodge & Tavern
    { x: -14, z: 163, type: 'oak', scale: 1.0 },
    { x: 14, z: 163, type: 'oak', scale: 1.0 },
    // Coastal Palm / Pine near beach sand
    { x: -28, z: 202, type: 'oak', scale: 1.15 },
    { x: 28, z: 202, type: 'oak', scale: 1.15 },
  ];

  const villageTreesData = curatedVillageTrees
    .filter(vt => !isPointOnRoad(vt.x, vt.z) && !isDesertBiome(vt.x, vt.z))
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
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  npcs: WorldNPC[]
): Promise<void> {
  await cooperativeYield(4);
  // ------------------------------------------
  // 5A. ANCIENT SUNKEN PYRAMID RUINS (West: [-360, -520])
  // ------------------------------------------
  const pyramid = createDesertPyramidMesh();
  const pyY = 1.50;
  pyramid.position.set(-360, pyY, -520);
  scene.add(pyramid);
  colliders.push({
    type: 'box',
    minX: -369,
    maxX: -351,
    minZ: -529,
    maxZ: -511,
    label: 'Piramida Emas Solaria',
  });

  // Obelisks guarding pyramid approach
  const obeliskPositions = [
    { x: -375, z: -520 },
    { x: -345, z: -520 },
    { x: -360, z: -535 },
    { x: -360, z: -505 },
  ];
  obeliskPositions.forEach((pos) => {
    if (!isDesertBiome(pos.x, pos.z)) return; // DILARANG SPAWN di luar gurun!
    const obelisk = createDesertObeliskMesh();
    obelisk.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(obelisk);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Obelisk Solaria' });
  });

  // Palms near Pyramid Oasis Spring
  const pyramidPalmPositions = [
    { x: -342, z: -534 },
    { x: -348, z: -530 },
    { x: -338, z: -526 },
    { x: -378, z: -504 },
    { x: -382, z: -498 },
  ];
  const pyramidPalmsData = pyramidPalmPositions
    .filter((pos) => isDesertBiome(pos.x, pos.z)) // DILARANG SPAWN di luar gurun!
    .map((pos) => {
      colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 0.65, label: 'Pohon Palem Solaria' });
      return {
        x: pos.x,
        y: getTerrainHeight(pos.x, pos.z),
        z: pos.z,
        rotationY: Math.random() * Math.PI * 2,
      };
    });
  const pyramidPalmsMesh = createInstancedDesertPalms(pyramidPalmsData);
  scene.add(pyramidPalmsMesh);

  // ------------------------------------------
  // 5B. HIDDEN OASIS OF SOLARIA (West: [-400, -290])
  // ------------------------------------------
  const oasisPoolGeo = new THREE.CylinderGeometry(14, 14, 0.4, 24);
  const oasisPoolMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const oasisPool = new THREE.Mesh(oasisPoolGeo, oasisPoolMat);
  oasisPool.position.set(-400, 0.05, -290);
  scene.add(oasisPool);

  const oasisPalmsData: { x: number; y: number; z: number; rotationY: number }[] = [];
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    const px = -400 + Math.cos(angle) * 17;
    const pz = -290 + Math.sin(angle) * 17;
    if (!isDesertBiome(px, pz)) continue; // DILARANG SPAWN di luar gurun!
    const py = getTerrainHeight(px, pz);
    oasisPalmsData.push({ x: px, y: py, z: pz, rotationY: angle + 0.5 });
    colliders.push({ type: 'circle', x: px, z: pz, radius: 0.65, label: 'Pohon Palem Oase' });
  }
  const oasisPalmsMesh = createInstancedDesertPalms(oasisPalmsData);
  scene.add(oasisPalmsMesh);

  // ------------------------------------------
  // 5C. GRAND SULTAN SOLARIA PALACE & DESA BAZAAR GURUN
  // Palace Center: [-540, -540] (Y=2.00, Menghadap Selatan)
  // Desert Village Center: [-560, -110] (Y=1.80)
  // ------------------------------------------
  const solariaBaseY = 1.80;
  const solariaPalaceY = 2.00;
  const spDX = -950; // -540 - 410 -> Istana Sultan di [-540, -540]
  const spDZ = -70;  // -540 - (-470)
  const dvDX = -675; // -540 - 135 -> Desa Gurun di [-540, -420]
  const dvDZ = -175; // -420 - (-245)

  // 1. Grand Taj Mahal Palace of Sultan Solaria (West: [-540, -540])
  const solariaPalace = createTajMahalPalaceMesh();
  solariaPalace.position.set(410 + spDX, solariaPalaceY, -470 + spDZ);
  solariaPalace.rotation.y = -Math.PI / 2; // Menghadap ke Selatan menyambut jalan akses lurus dari Desa Gurun
  scene.add(solariaPalace);
  colliders.push({
    type: 'box',
    minX: 392 + spDX,
    maxX: 428 + spDX,
    minZ: -486 + spDZ,
    maxZ: -454 + spDZ,
    label: 'Istana Taj Mahal Sultan Solaria',
  });
  colliders.push({ type: 'circle', x: 394 + spDX, z: -486 + spDZ, radius: 2.2, label: 'Menara Minaret Barat Laut' });
  colliders.push({ type: 'circle', x: 394 + spDX, z: -454 + spDZ, radius: 2.2, label: 'Menara Minaret Barat Daya' });
  colliders.push({ type: 'circle', x: 426 + spDX, z: -486 + spDZ, radius: 2.2, label: 'Menara Minaret Timur Laut' });
  colliders.push({ type: 'circle', x: 426 + spDX, z: -454 + spDZ, radius: 2.2, label: 'Menara Minaret Tenggara' });

  // 2. Alur Jalan Setapak Kafilah Gurun Menuju Gerbang Selatan Istana [-540, -515]
  const causewayItems = [
    { type: 'lantern', x: -545.5, z: -505 },
    { type: 'palm', x: -545.5, z: -490 },
    { type: 'lantern', x: -545.5, z: -475 },
    { type: 'palm', x: -545.5, z: -460 },
    { type: 'lantern', x: -534.5, z: -505 },
    { type: 'palm', x: -534.5, z: -490 },
    { type: 'lantern', x: -534.5, z: -475 },
    { type: 'palm', x: -534.5, z: -460 },
  ];

  causewayItems.forEach((item, idx) => {
    if (!isDesertBiome(item.x, item.z)) return;
    if (item.type === 'palm') {
      const palm = createDesertPalmMesh();
      palm.position.set(item.x, solariaPalaceY, item.z);
      palm.rotation.y = idx * 0.8;
      scene.add(palm);
      colliders.push({ type: 'circle', x: item.x, z: item.z, radius: 0.65, label: 'Pohon Palem Desert Avenue' });
    } else {
      const lantern = createDesertOilLanternMesh();
      lantern.position.set(item.x, solariaPalaceY, item.z);
      scene.add(lantern);
      colliders.push({ type: 'circle', x: item.x, z: item.z, radius: 0.45, label: 'Lampu Minyak Desert Avenue' });
    }
  });

  // 3. Interior Ruang Takhta Sultan (Throne Room Interior Cell: [-540, -25, -640])
  const throneInterior = createThroneRoomInteriorMesh();
  throneInterior.position.set(410 + spDX, -25, -470 + spDZ);
  scene.add(throneInterior);
  colliders.push({ type: 'box', minX: 393 + spDX, maxX: 427 + spDX, minZ: -482 + spDZ, maxZ: -480 + spDZ, maxY: -10, label: 'Dinding Utara Ruang Takhta' });
  colliders.push({ type: 'box', minX: 393 + spDX, maxX: 427 + spDX, minZ: -460 + spDZ, maxZ: -458 + spDZ, maxY: -10, label: 'Dinding Selatan Ruang Takhta' });
  colliders.push({ type: 'box', minX: 392 + spDX, maxX: 394 + spDX, minZ: -481 + spDZ, maxZ: -459 + spDZ, maxY: -10, label: 'Dinding Belakang Takhta' });
  colliders.push({ type: 'box', minX: 395 + spDX, maxX: 400 + spDX, minZ: -473 + spDZ, maxZ: -467 + spDZ, maxY: -10, label: 'Singgasana Emas Sultan' });

  // Sultan Malik al-Solaria
  const sultanGroup = createCustomNPCMesh('emperor');
  const sultanPos: [number, number, number] = [397.5 + spDX, -25 + 1.4, -470 + spDZ];
  sultanGroup.position.set(...sultanPos);
  sultanGroup.rotation.y = Math.PI * 1.5;
  scene.add(sultanGroup);
  npcs.push({
    id: 'sultan_malik',
    name: 'Sultan Malik al-Solaria',
    nameId: 'Sultan Malik al-Solaria',
    role: 'Sultan of the Golden Dunes',
    roleType: 'emperor',
    group: sultanGroup,
    position: sultanPos,
    dialogueId: 'sultan_malik',
    icon: '👑',
  });
  await cooperativeYield(4);

  // 2 Royal Elite Desert Guards flanking the Sultan's Throne
  const guard1Group = createCustomNPCMesh('guard');
  const guard1Pos: [number, number, number] = [396 + spDX, -25, -473.5 + spDZ];
  guard1Group.position.set(...guard1Pos);
  guard1Group.rotation.y = Math.PI * 1.5;
  scene.add(guard1Group);
  npcs.push({
    id: 'guard_throne_1',
    name: 'Solaria Royal Guard',
    nameId: 'Prajurit Pengawal Takhta Sultan',
    role: 'Elite Throne Sentinel',
    roleType: 'guard',
    group: guard1Group,
    position: guard1Pos,
    dialogueId: 'guard_solaria',
    icon: '🛡️',
  });

  const guard2Group = createCustomNPCMesh('guard');
  const guard2Pos: [number, number, number] = [396 + spDX, -25, -466.5 + spDZ];
  guard2Group.position.set(...guard2Pos);
  guard2Group.rotation.y = Math.PI * 1.5;
  scene.add(guard2Group);
  npcs.push({
    id: 'guard_throne_2',
    name: 'Solaria Royal Guard',
    nameId: 'Prajurit Pengawal Takhta Sultan',
    role: 'Elite Throne Sentinel',
    roleType: 'guard',
    group: guard2Group,
    position: guard2Pos,
    dialogueId: 'guard_solaria',
    icon: '🛡️',
  });
  await cooperativeYield(4);
  await cooperativeYield(4);

  // 4. Sumur Batu Oase di Alun-Alun Desa Gurun (Village Oasis Well Plaza: [-460, -260])
  const desertWell = createDesertOasisWellMesh();
  desertWell.position.set(135 + dvDX, solariaBaseY, -245 + dvDZ);
  scene.add(desertWell);
  colliders.push({
    type: 'circle',
    x: 135 + dvDX,
    z: -245 + dvDZ,
    radius: 1.8,
    label: 'Sumur Oase Solaria',
  });

  // Pohon Kurma di Sekitar Sumur Oase
  const townPalmOffsets = [
    { x: 131 + dvDX, z: -248 + dvDZ },
    { x: 139 + dvDX, z: -248 + dvDZ },
    { x: 131 + dvDX, z: -242 + dvDZ },
    { x: 139 + dvDX, z: -242 + dvDZ },
  ];
  townPalmOffsets.forEach((tpo, idx) => {
    if (!isDesertBiome(tpo.x, tpo.z)) return;
    const palm = createDesertPalmMesh();
    palm.position.set(tpo.x, solariaBaseY, tpo.z);
    palm.rotation.y = idx * 1.57;
    scene.add(palm);
    colliders.push({ type: 'circle', x: tpo.x, z: tpo.z, radius: 0.65, label: 'Pohon Kurma Alun-Alun Solaria' });
  });

  // 5. Rumah-Rumah Tanah Liat Khas Gurun
  // Sisi Utara Jalan:
  const adobeHouse1 = createDesertMudBrickHouseMesh(1);
  adobeHouse1.position.set(120 + dvDX, solariaBaseY, -238 + dvDZ);
  adobeHouse1.rotation.y = 0;
  scene.add(adobeHouse1);
  colliders.push({ type: 'box', minX: 116 + dvDX, maxX: 124 + dvDX, minZ: -242 + dvDZ, maxZ: -234 + dvDZ, label: 'Rumah Bertingkat Gurun 1' });

  const adobeHouse2 = createDesertMudBrickHouseMesh(2);
  adobeHouse2.position.set(135 + dvDX, solariaBaseY, -238 + dvDZ);
  adobeHouse2.rotation.y = 0;
  scene.add(adobeHouse2);
  colliders.push({ type: 'box', minX: 131 + dvDX, maxX: 139 + dvDX, minZ: -242 + dvDZ, maxZ: -234 + dvDZ, label: 'Rumah Saudagar Gurun 2' });

  const adobeHouse3 = createDesertMudBrickHouseMesh(1);
  adobeHouse3.position.set(150 + dvDX, solariaBaseY, -238 + dvDZ);
  adobeHouse3.rotation.y = 0;
  scene.add(adobeHouse3);
  colliders.push({ type: 'box', minX: 146 + dvDX, maxX: 154 + dvDX, minZ: -242 + dvDZ, maxZ: -234 + dvDZ, label: 'Rumah Bertingkat Gurun 3' });

  // Sisi Selatan Jalan:
  const adobeHouse4 = createDesertMudBrickHouseMesh(0);
  adobeHouse4.position.set(120 + dvDX, solariaBaseY, -252 + dvDZ);
  adobeHouse4.rotation.y = Math.PI;
  scene.add(adobeHouse4);
  colliders.push({ type: 'box', minX: 116 + dvDX, maxX: 124 + dvDX, minZ: -256 + dvDZ, maxZ: -248 + dvDZ, label: 'Rumah Tanah Liat Gurun 4' });

  const camelRest = createCamelRestAreaMesh();
  camelRest.position.set(135 + dvDX, solariaBaseY, -252 + dvDZ);
  scene.add(camelRest);
  colliders.push({ type: 'box', minX: 129 + dvDX, maxX: 141 + dvDX, minZ: -257 + dvDZ, maxZ: -247 + dvDZ, label: 'Tempat Peristirahatan Unta Gurun' });

  const adobeHouse5 = createDesertMudBrickHouseMesh(0);
  adobeHouse5.position.set(150 + dvDX, solariaBaseY, -252 + dvDZ);
  adobeHouse5.rotation.y = Math.PI;
  scene.add(adobeHouse5);
  colliders.push({ type: 'box', minX: 146 + dvDX, maxX: 154 + dvDX, minZ: -256 + dvDZ, maxZ: -248 + dvDZ, label: 'Rumah Tanah Liat Gurun 5' });

  // 6. Pasar Bazaar Gurun Solaria
  const bazaarStall1 = createDesertBazaarStallMesh(0xd97706, 0xfef08a);
  bazaarStall1.position.set(126 + dvDX, solariaBaseY, -240 + dvDZ);
  bazaarStall1.rotation.y = 0;
  scene.add(bazaarStall1);
  colliders.push({ type: 'box', minX: 124 + dvDX, maxX: 128 + dvDX, minZ: -241 + dvDZ, maxZ: -239 + dvDZ, label: 'Kios Rempah Solaria' });

  const bazaarStall2 = createDesertBazaarStallMesh(0x9333ea, 0xfbbf24);
  bazaarStall2.position.set(144 + dvDX, solariaBaseY, -240 + dvDZ);
  bazaarStall2.rotation.y = 0;
  scene.add(bazaarStall2);
  colliders.push({ type: 'box', minX: 142 + dvDX, maxX: 146 + dvDX, minZ: -241 + dvDZ, maxZ: -239 + dvDZ, label: 'Kios Karpet Solaria' });

  const bazaarStall3 = createDesertBazaarStallMesh(0x059669, 0xa7f3d0);
  bazaarStall3.position.set(126 + dvDX, solariaBaseY, -250 + dvDZ);
  bazaarStall3.rotation.y = Math.PI;
  scene.add(bazaarStall3);
  colliders.push({ type: 'box', minX: 124 + dvDX, maxX: 128 + dvDX, minZ: -251 + dvDZ, maxZ: -249 + dvDZ, label: 'Kios Tembikar Solaria' });

  const bazaarStall4 = createDesertBazaarStallMesh(0xb91c1c, 0xfde047);
  bazaarStall4.position.set(144 + dvDX, solariaBaseY, -250 + dvDZ);
  bazaarStall4.rotation.y = Math.PI;
  scene.add(bazaarStall4);
  colliders.push({ type: 'box', minX: 142 + dvDX, maxX: 146 + dvDX, minZ: -251 + dvDZ, maxZ: -249 + dvDZ, label: 'Kios Baju Zirah Gurun' });

  // 7. Kemah-Kemah Sutra Bazaar
  const desertTent1 = createDesertTentMesh(0x991b1b);
  desertTent1.position.set(160 + dvDX, solariaBaseY, -242 + dvDZ);
  desertTent1.rotation.y = 0;
  scene.add(desertTent1);
  colliders.push({ type: 'circle', x: 160 + dvDX, z: -242 + dvDZ, radius: 2.8, label: 'Kemah Sutra Merah' });

  const desertTent2 = createDesertTentMesh(0x047857);
  desertTent2.position.set(160 + dvDX, solariaBaseY, -248 + dvDZ);
  desertTent2.rotation.y = Math.PI;
  scene.add(desertTent2);
  colliders.push({ type: 'circle', x: 160 + dvDX, z: -248 + dvDZ, radius: 2.8, label: 'Kemah Sutra Zamrud' });

  // Lampu Minyak Sepanjang Kerb Jalan
  const villageKerbLanterns = [
    { x: 122 + dvDX, z: -248 + dvDZ }, { x: 136 + dvDX, z: -248 + dvDZ }, { x: 148 + dvDX, z: -248 + dvDZ }, { x: 158 + dvDX, z: -248 + dvDZ },
    { x: 122 + dvDX, z: -242 + dvDZ }, { x: 136 + dvDX, z: -242 + dvDZ }, { x: 148 + dvDX, z: -242 + dvDZ }, { x: 158 + dvDX, z: -242 + dvDZ },
  ];
  villageKerbLanterns.forEach((vkl) => {
    const vLantern = createDesertOilLanternMesh();
    vLantern.position.set(vkl.x, solariaBaseY, vkl.z);
    scene.add(vLantern);
    colliders.push({ type: 'circle', x: vkl.x, z: vkl.z, radius: 0.4, label: 'Lampu Kerb Desa Gurun' });
  });

  // 8. Solaria Village NPCs
  const tariqGroup = createCustomNPCMesh('alchemist');
  const tariqPos: [number, number, number] = [126 + dvDX, solariaBaseY, -238.5 + dvDZ];
  tariqGroup.position.set(...tariqPos);
  tariqGroup.rotation.y = 0;
  scene.add(tariqGroup);
  npcs.push({
    id: 'merchant_tariq',
    name: 'Tariq the Spice Merchant',
    nameId: 'Tariq Sang Saudagar Rempah',
    role: 'Desert Bazaar Merchant',
    roleType: 'alchemist',
    group: tariqGroup,
    position: tariqPos,
    dialogueId: 'merchant_tariq',
    icon: '👳‍♂️',
  });

  const aminaGroup = createCustomNPCMesh('villager');
  const aminaPos: [number, number, number] = [135 + dvDX, solariaBaseY, -243 + dvDZ];
  aminaGroup.position.set(...aminaPos);
  aminaGroup.rotation.y = 0;
  scene.add(aminaGroup);
  npcs.push({
    id: 'oasis_amina',
    name: 'Amina the Water Bearer',
    nameId: 'Amina Pembawa Air Oase',
    role: 'Oasis Well Attendant',
    roleType: 'villager',
    group: aminaGroup,
    position: aminaPos,
    dialogueId: 'oasis_amina',
    icon: '🧕',
  });
  await cooperativeYield(4);

  const zahraGroup = createCustomNPCMesh('bard');
  const zahraPos: [number, number, number] = [160 + dvDX, solariaBaseY, -241 + dvDZ];
  zahraGroup.position.set(...zahraPos);
  zahraGroup.rotation.y = Math.PI * 1.5;
  scene.add(zahraGroup);
  npcs.push({
    id: 'weaver_zahra',
    name: 'Zahra the Silk Weaver',
    nameId: 'Zahra Penenun Sutra Gurun',
    role: 'Master Carpet & Tent Artisan',
    roleType: 'bard',
    group: zahraGroup,
    position: zahraPos,
    dialogueId: 'weaver_zahra',
    icon: '🧕',
  });

  const sGuardGroup = createCustomNPCMesh('guard');
  const sGuardPos: [number, number, number] = [116 + dvDX, solariaBaseY, -245 + dvDZ];
  sGuardGroup.position.set(...sGuardPos);
  sGuardGroup.rotation.y = Math.PI * 1.5;
  scene.add(sGuardGroup);
  npcs.push({
    id: 'guard_solaria',
    name: 'Solaria Desert Sentinel',
    nameId: 'Prajurit Pengawal Gerbang Solaria',
    role: 'Desert Stronghold Sentinel',
    roleType: 'guard',
    group: sGuardGroup,
    position: sGuardPos,
    dialogueId: 'guard_solaria',
    icon: '🛡️',
  });
  await cooperativeYield(4);
  await cooperativeYield(4);

  // Cacti in West Solaria Dunes
  const desertCacti = [
    { x: -280, z: -350, s: 1.0 },
    { x: -380, z: -400, s: 1.2 },
    { x: -440, z: -320, s: 0.9 },
    { x: -500, z: -450, s: 1.1 },
    { x: -350, z: -600, s: 1.3 },
    { x: -480, z: -580, s: 1.0 },
    { x: -580, z: -520, s: 1.15 },
    { x: -320, z: -420, s: 0.85 },
    { x: -520, z: -340, s: 1.05 },
    { x: -420, z: -520, s: 1.1 },
  ];
  const cactiData = desertCacti
    .filter((dc) => isDesertBiome(dc.x, dc.z))
    .map((dc) => {
      colliders.push({ type: 'circle', x: dc.x, z: dc.z, radius: 0.5, label: 'Kaktus Gurun' });
      return {
        x: dc.x,
        y: getTerrainHeight(dc.x, dc.z),
        z: dc.z,
        scale: dc.s,
        rotationY: Math.random() * Math.PI * 2,
      };
    });
  const cactiMesh = createInstancedDesertCacti(cactiData);
  scene.add(cactiMesh);

  // Gundukan pasir oval melayang (sandDunes) dihapus total sesuai permintaan user.

  await cooperativeYield(4);
}


export async function buildTitanLakeAndCanyon(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[],
  npcs: WorldNPC[]
): Promise<void> {
  await cooperativeYield(4);
  const sinkholeCenter = { x: -660, z: -160 };
  const sinkholeBaseY = getTerrainHeight(sinkholeCenter.x, sinkholeCenter.z);

  // 1. Partikel & Gelombang Pusaran Pasir Berputar di Dasar Kawah
  const sandVortex = createSandVortexSwirlMesh();
  sandVortex.position.set(sinkholeCenter.x, sinkholeBaseY + 0.05, sinkholeCenter.z);
  scene.add(sandVortex);
  decorativeProps.push(sandVortex);

  // 2. Cincin Formasi 8 Kerangka Tulang Rusuk Fosil Purba Raksasa (Radius ~43.5 unit di Bibir Kawah)
  for (let r = 0; r < 8; r++) {
    const angle = (r / 8) * Math.PI * 2 + 0.2;
    const rad = 43.5;
    const rx = sinkholeCenter.x + Math.cos(angle) * rad;
    const rz = sinkholeCenter.z + Math.sin(angle) * rad;
    if (!isDesertBiome(rx, rz)) continue; // DILARANG SPAWN di padang rumput hijau!
    const ry = getTerrainHeight(rx, rz);
    const rib = createAncientMonsterRibMesh();
    rib.position.set(rx, ry, rz);
    rib.rotation.y = angle + Math.PI / 2;
    const s = 1.35;
    rib.scale.set(s, s, s);
    scene.add(rib);
    decorativeProps.push(rib);
    colliders.push({ type: 'circle', x: rx, z: rz, radius: 1.4, label: 'Fosil Tulang Rusuk Monster Purba' });
  }

  // 3. 6 Obelisk Batu Pasir Kuno Retak Setengah Tertimbun Pasir di Tepi Luar Arena (Radius ~44 unit)
  for (let o = 0; o < 6; o++) {
    const angle = (o / 6) * Math.PI * 2;
    const ox = sinkholeCenter.x + Math.cos(angle) * 44.0;
    const oz = sinkholeCenter.z + Math.sin(angle) * 44.0;
    if (!isDesertBiome(ox, oz)) continue; // DILARANG SPAWN di padang rumput hijau!
    const oy = getTerrainHeight(ox, oz) - 0.6; // Setengah tertimbun pasir
    const obelisk = createCrackedSandstoneObeliskMesh();
    obelisk.position.set(ox, oy, oz);
    obelisk.rotation.y = angle + 0.4;
    scene.add(obelisk);
    decorativeProps.push(obelisk);
    colliders.push({ type: 'circle', x: ox, z: oz, radius: 1.5, label: 'Obelisk Kuno Kawah Cacing' });
  }
  // Seluruh lanskap gurun mengandalkan daratan utama terrainMesh alami yang mulus.

  // ==========================================
  // 6. THUNDERPEAK LIGHTNING SPIRE & MAGE TOWER SANCTUARY (East Plains Hill: [260, -180])
  // Struktur Megah 3D Mage Tower, Interior Bertingkat, Kristal Petir Bersinar, dan Dewan Penyihir
  // ==========================================
  const mageTowerBaseY = 5.50;
  const mtDX = 160; // 270 - 110
  const mtDZ = -250; // -260 - (-10)

  // A. Struktur Eksterior 3D "Mage Tower" Puncak Halilintar (Center: [220, -110])
  const mageTowerExterior = createMageTowerExteriorMesh();
  mageTowerExterior.position.set(110 + mtDX, mageTowerBaseY, -10 + mtDZ);
  scene.add(mageTowerExterior);
  colliders.push({
    type: 'circle',
    x: 110 + mtDX,
    z: -10 + mtDZ,
    radius: 7.2,
    label: 'Menara Eksterior Mage Tower Puncak Halilintar',
  });

  // B. Interior Bertingkat 3D Mage Tower (Underground Interior Cell: [220, -45, -110])
  const mageTowerInterior = createMageTowerInteriorMesh();
  mageTowerInterior.position.set(110 + mtDX, -45, -10 + mtDZ);
  scene.add(mageTowerInterior);

  // Interior Wall Box Colliders
  colliders.push(
    { type: 'box', minX: 99 + mtDX, maxX: 121 + mtDX, minZ: -21 + mtDZ, maxZ: -19 + mtDZ, maxY: -10, label: 'Dinding Utara Interior Mage Tower' },
    { type: 'box', minX: 99 + mtDX, maxX: 101 + mtDX, minZ: -21 + mtDZ, maxZ: 1 + mtDZ, maxY: -10, label: 'Dinding Barat Interior Mage Tower' },
    { type: 'box', minX: 119 + mtDX, maxX: 121 + mtDX, minZ: -21 + mtDZ, maxZ: 1 + mtDZ, maxY: -10, label: 'Dinding Timur Interior Mage Tower' },
    { type: 'box', minX: 99 + mtDX, maxX: 107.5 + mtDX, minZ: -1 + mtDZ, maxZ: 1 + mtDZ, maxY: -10, label: 'Dinding Selatan Barat Interior Mage Tower' },
    { type: 'box', minX: 112.5 + mtDX, maxX: 121 + mtDX, minZ: -1 + mtDZ, maxZ: 1 + mtDZ, maxY: -10, label: 'Dinding Selatan Timur Interior Mage Tower' }
  );
  // Colliders Perabotan Lantai 1
  colliders.push(
    { type: 'box', minX: 106 + mtDX, maxX: 114 + mtDX, minZ: -19 + mtDZ, maxZ: -17 + mtDZ, maxY: -38, label: 'Lemari Kitab Purba Utara' },
    { type: 'box', minX: 101 + mtDX, maxX: 103 + mtDX, minZ: -13 + mtDZ, maxZ: -7 + mtDZ, maxY: -38, label: 'Lemari Kitab Purba Barat' },
    { type: 'box', minX: 117 + mtDX, maxX: 119 + mtDX, minZ: -13 + mtDZ, maxZ: -7 + mtDZ, maxY: -38, label: 'Lemari Kitab Purba Timur' }
  );
  // Colliders Perabotan Lantai 2
  colliders.push({
    type: 'box',
    minX: 107 + mtDX,
    maxX: 113 + mtDX,
    minZ: -12 + mtDZ,
    maxZ: -8 + mtDZ,
    minY: -39,
    maxY: -32,
    label: 'Meja Eksperimen Kristal Petir Alkimia',
  });
  // Colliders Perabotan Lantai 3
  colliders.push({
    type: 'circle',
    x: 110 + mtDX,
    z: -10 + mtDZ,
    radius: 1.6,
    minY: -31,
    maxY: -15,
    label: 'Pilar Armillary Orrery Observatorium',
  });

  // C. Dewan Penyihir Mage Tower (Unique Mage NPCs):
  // 1. Grand Mage Eldrin
  const eldrinGroup = createGrandMageEldrinMesh();
  const eldrinPos: [number, number, number] = [110 + mtDX, -45, -12 + mtDZ];
  eldrinGroup.position.set(...eldrinPos);
  eldrinGroup.rotation.y = 0;
  scene.add(eldrinGroup);
  npcs.push({
    id: 'grand_mage_eldrin',
    name: 'Grand Mage Eldrin',
    nameId: 'Grand Mage Eldrin',
    role: 'Penjaga Kitab Halilintar Purba',
    roleType: 'elder',
    group: eldrinGroup,
    position: eldrinPos,
    dialogueId: 'grand_mage_eldrin',
    icon: '🧙‍♂️',
  });

  // 2. Sorceress Maya
  const sorceressMayaGroup = createSorceressMayaMesh();
  const sorceressMayaPos: [number, number, number] = [106.5 + mtDX, -45, -8 + mtDZ];
  sorceressMayaGroup.position.set(...sorceressMayaPos);
  sorceressMayaGroup.rotation.y = Math.PI / 2;
  scene.add(sorceressMayaGroup);
  npcs.push({
    id: 'sorceress_maya',
    name: 'Sorceress Maya',
    nameId: 'Sorceress Maya',
    role: 'Pengkaji Kitab Kuno & Astrologi',
    roleType: 'seer',
    group: sorceressMayaGroup,
    position: sorceressMayaPos,
    dialogueId: 'sorceress_maya',
    icon: '✨',
  });
  await cooperativeYield(4);

  // 3. Archmage Pyro
  const pyroGroup = createArchmagePyroMesh();
  const pyroPos: [number, number, number] = [110 + mtDX, -37.5, -8 + mtDZ];
  pyroGroup.position.set(...pyroPos);
  pyroGroup.rotation.y = Math.PI;
  scene.add(pyroGroup);
  npcs.push({
    id: 'archmage_pyro',
    name: 'Archmage Pyro',
    nameId: 'Archmage Pyro',
    role: 'Ahli Alkimia & Penghancur Elemen Api',
    roleType: 'commander',
    group: pyroGroup,
    position: pyroPos,
    dialogueId: 'archmage_pyro',
    icon: '🔥',
  });

  // D. Kristal Petir Biru Bersinar Menyala
  const lightningCrystalCoords = [
    { x: 121 + mtDX, z: -3 + mtDZ, scale: 1.4 },
    { x: 99 + mtDX, z: -3 + mtDZ, scale: 1.3 },
    { x: 121 + mtDX, z: -17 + mtDZ, scale: 1.4 },
    { x: 99 + mtDX, z: -17 + mtDZ, scale: 1.35 },
    { x: 110 + mtDX, z: 3 + mtDZ, scale: 1.5 },
    { x: 110 + mtDX, z: -23 + mtDZ, scale: 1.4 },
    { x: 93 + mtDX, z: -11 + mtDZ, scale: 1.3 },
    { x: 127 + mtDX, z: -11 + mtDZ, scale: 1.2 },
  ];
  lightningCrystalCoords.forEach((lc) => {
    const crystal = createLightningCrystalMesh(lc.scale);
    const cy = getTerrainHeight(lc.x, lc.z);
    crystal.position.set(lc.x, cy, lc.z);
    scene.add(crystal);
    colliders.push({ type: 'circle', x: lc.x, z: lc.z, radius: 0.9 * lc.scale, label: 'Kristal Halilintar Purba' });
  });

  // E. Magnetic Floating Thunder Spires on Outer Cliffs
  const secondarySpires = [
    { x: 90 + mtDX, z: -27 + mtDZ },
    { x: 130 + mtDX, z: 7 + mtDZ },
    { x: 95 + mtDX, z: 9 + mtDZ },
  ];
  secondarySpires.forEach((pos) => {
    const spire = createThunderSpireMesh();
    spire.scale.set(0.85, 0.95, 0.85);
    spire.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(spire);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Pilar Petir Melayang' });
  });

await cooperativeYield(4);
}


export async function buildDragonCaldera(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number, forVisualMesh?: boolean) => number,
  colliders: WorldCollider[],
  decorativeProps: THREE.Object3D[],
  pointLights: THREE.PointLight[]
): Promise<{ chests: WorldObjects['chests'] }> {
  await cooperativeYield(4);
  const dragonArenaCenter = { x: 40, z: 840 };
  const dragonArenaBaseY = 2.50;

  // ============================================================================
  // 1. PULAU UTAMA KALDERA NAGA [40, 840]
  // ============================================================================

  // A. Altar Batu Rune Naga (Pusat Kawah [40, 840])
  const altarGroup = new THREE.Group();
  altarGroup.name = 'DragonRuneAltar';

  // Stepped circular dais
  const daisMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.35,
    metalness: 0.7,
    flatShading: true,
  });
  const daisBase = new THREE.Mesh(new THREE.CylinderGeometry(15.0, 16.5, 0.7, 32), daisMat);
  daisBase.position.y = 0.35;
  altarGroup.add(daisBase);

  const daisTop = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 13.5, 0.6, 32), daisMat);
  daisTop.position.y = 0.95;
  altarGroup.add(daisTop);

  // Fiery glowing runic outer circle
  const runeRingGeo = new THREE.RingGeometry(10.5, 12.2, 32);
  runeRingGeo.rotateX(-Math.PI / 2);
  const runeRingMat = new THREE.MeshStandardMaterial({
    color: 0xff3d00,
    emissive: 0xff1744,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  const runeRingMesh = new THREE.Mesh(runeRingGeo, runeRingMat);
  runeRingMesh.position.y = 1.26;
  altarGroup.add(runeRingMesh);

  // Central dragon summoning fire bowl
  const brazierGeo = new THREE.CylinderGeometry(2.2, 1.2, 1.4, 8);
  const brazierMesh = new THREE.Mesh(brazierGeo, daisMat);
  brazierMesh.position.y = 1.95;
  altarGroup.add(brazierMesh);

  // Roaring primal fire flame
  const flameGeo = new THREE.ConeGeometry(1.6, 3.4, 8);
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xff6d00,
    emissive: 0xff3d00,
    emissiveIntensity: 3.0,
    roughness: 0.15,
  });
  const flameMesh = new THREE.Mesh(flameGeo, flameMat);
  flameMesh.position.y = 3.8;
  altarGroup.add(flameMesh);

  // Local central altar light
  const altarLight = new THREE.PointLight(0xff3d00, 3.8, 55);
  altarLight.position.set(0, 4.2, 0);
  altarGroup.add(altarLight);
  pointLights.push(altarLight);

  altarGroup.position.set(dragonArenaCenter.x, dragonArenaBaseY, dragonArenaCenter.z);
  scene.add(altarGroup);
  colliders.push({ type: 'circle', x: dragonArenaCenter.x, z: dragonArenaCenter.z, radius: 2.5, label: 'Altar Rune Naga' });

  // B. 4 Pilar Rune Naga Obsidian di Sudut Altar (Radius 14.5 unit)
  const altarPillars = [
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z - 14.5, label: 'Pilar Rune Naga Utara' },
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z + 14.5, label: 'Pilar Rune Naga Selatan' },
    { x: dragonArenaCenter.x + 14.5, z: dragonArenaCenter.z, label: 'Pilar Rune Naga Timur' },
    { x: dragonArenaCenter.x - 14.5, z: dragonArenaCenter.z, label: 'Pilar Rune Naga Barat' },
  ];
  altarPillars.forEach((dp) => {
    const pY = getTerrainHeight(dp.x, dp.z);
    const pGroup = new THREE.Group();

    const colGeo = new THREE.CylinderGeometry(0.75, 1.6, 9.0, 6);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.25,
      metalness: 0.85,
      flatShading: true,
    });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.y = 4.5;
    pGroup.add(colMesh);

    const torchLight = new THREE.PointLight(0xff5722, 2.0, 18);
    torchLight.position.y = 9.5;
    pGroup.add(torchLight);

    pGroup.position.set(dp.x, pY, dp.z);
    scene.add(pGroup);
    colliders.push({ type: 'circle', x: dp.x, z: dp.z, radius: 1.6, label: dp.label });
  });

  // C. Fosil Tengkorak Naga Purba Raksasa & Tulang Rusuk (Tertimbun Abu di Sisi Utara Altar)
  const dragonFossil = createDragonSkullBonesMesh();
  dragonFossil.position.set(dragonArenaCenter.x, dragonArenaBaseY, dragonArenaCenter.z - 18);
  scene.add(dragonFossil);
  colliders.push({
    type: 'box',
    minX: dragonArenaCenter.x - 6,
    maxX: dragonArenaCenter.x + 6,
    minZ: dragonArenaCenter.z - 24,
    maxZ: dragonArenaCenter.z - 12,
    label: 'Fosil Tengkorak Naga Purba',
  });

  // D. Formasi Kolom Basalt Heksagonal Alami & Runcing (InstancedMesh untuk performa maksimal)
  // Menghiasi lereng tebing kawah bertingkat (Radius 46 s.d. 78 unit) dengan tinggi & kemiringan acak
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
    metalness: 0.35,
    flatShading: true,
  });
  const basaltBaseGeo = new THREE.CylinderGeometry(0.8, 1.0, 1.0, 6);
  basaltBaseGeo.translate(0, 0.5, 0);
  const basaltInstMesh = new THREE.InstancedMesh(basaltBaseGeo, basaltMat, 28);
  let basaltCount = 0;
  const basaltDummy = new THREE.Object3D();

  for (let i = 0; i < 28; i++) {
    if (i % 8 === 0) await cooperativeYield(8);
    const angle = (i / 28) * Math.PI * 2;
    // Hindari jalur celah ngarai masuk utara (sudut sekitar -Math.PI / 2)
    if (angle > -Math.PI * 0.65 && angle < -Math.PI * 0.35) continue;

    const r = 48 + (i % 5) * 6.0;
    const bx = dragonArenaCenter.x + Math.cos(angle) * r;
    const bz = dragonArenaCenter.z + Math.sin(angle) * r;
    const by = getTerrainHeight(bx, bz);

    const colH = 6.0 + (i % 4) * 3.5;
    const colR = 1.4 + (i % 3) * 0.4;

    basaltDummy.position.set(bx, by, bz);
    basaltDummy.scale.set(colR, colH, colR);
    basaltDummy.rotation.set(((i % 3) - 1) * 0.08, 0, (((i + 1) % 3) - 1) * 0.08);
    basaltDummy.updateMatrix();
    basaltInstMesh.setMatrixAt(basaltCount++, basaltDummy.matrix);

    colliders.push({ type: 'circle', x: bx, z: bz, radius: colR, label: 'Formasi Basalt Kawah' });
  }
  basaltInstMesh.count = basaltCount;
  basaltInstMesh.instanceMatrix.needsUpdate = true;
  basaltInstMesh.computeBoundingSphere();
  scene.add(basaltInstMesh);

  // E. Kolam & Retakan Lahar Merah Menyala di Seputar Kaldera
  const lavaRingGeo = new THREE.RingGeometry(24.0, 32.0, 36);
  lavaRingGeo.rotateX(-Math.PI / 2);
  const lavaRingMat = new THREE.MeshStandardMaterial({
    color: 0xff3700,
    emissive: 0xff2200,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const lavaRingMesh = new THREE.Mesh(lavaRingGeo, lavaRingMat);
  lavaRingMesh.position.set(dragonArenaCenter.x, dragonArenaBaseY + 0.04, dragonArenaCenter.z);
  scene.add(lavaRingMesh);

  // Retakan lahar aktif
  const lavaCrackCoords = [
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z - 10, r: 4.8 },
    { x: dragonArenaCenter.x + 16, z: dragonArenaCenter.z - 6, r: 4.5 },
    { x: dragonArenaCenter.x - 16, z: dragonArenaCenter.z - 6, r: 4.5 },
    { x: dragonArenaCenter.x + 18, z: dragonArenaCenter.z + 12, r: 4.6 },
    { x: dragonArenaCenter.x - 18, z: dragonArenaCenter.z + 12, r: 4.6 },
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z + 18, r: 5.0 },
  ];
  lavaCrackCoords.forEach((lc) => {
    const crack = createLavaCrackMesh(lc.r);
    const cy = getTerrainHeight(lc.x, lc.z);
    crack.position.set(lc.x, cy + 0.02, lc.z);
    scene.add(crack);
  });

  // F. Dermaga Kayu Hangus di Teluk Utara Pulau [40, 750] (Titik Labuh Kapal)
  const charredDockMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const dockPier = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.45, 18.0), charredDockMat);
  dockPier.position.set(40, 0.45, 750);
  scene.add(dockPier);
  // Tiang pancang dermaga hangus (InstancedMesh)
  const dockPileGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.5, 6);
  const dockPileMesh = new THREE.InstancedMesh(dockPileGeo, charredDockMat, 8);
  let pileIdx = 0;
  const pileDummy = new THREE.Object3D();
  for (let pz = 743; pz <= 757; pz += 4.5) {
    pileDummy.position.set(37.3, 0.2, pz);
    pileDummy.updateMatrix();
    dockPileMesh.setMatrixAt(pileIdx++, pileDummy.matrix);

    pileDummy.position.set(42.7, 0.2, pz);
    pileDummy.updateMatrix();
    dockPileMesh.setMatrixAt(pileIdx++, pileDummy.matrix);
  }
  dockPileMesh.count = pileIdx;
  dockPileMesh.instanceMatrix.needsUpdate = true;
  dockPileMesh.computeBoundingSphere();
  scene.add(dockPileMesh);
  colliders.push({ type: 'box', minX: 37.0, maxX: 43.0, minZ: 741, maxZ: 759, label: 'Dermaga Kayu Hangus' });

  // G. 2 Jembatan Batu Rantai Vulkanik Penghubung ke Pulau Satelit
  // Jembatan 1: Menghubungkan Pulau Satelit Barat Daya [-75, 875] ke Pulau Utama [40, 840]
  // Bentang segmen: [-38, 858] ke [-8, 848]
  const bridge1Len = Math.hypot(-8 - -38, 848 - 858);
  const bridge1MidX = (-38 + -8) / 2;
  const bridge1MidZ = (858 + 848) / 2;
  const bridge1Ang = Math.atan2(848 - 858, -8 - -38);
  const bridge1Mesh = new THREE.Mesh(new THREE.BoxGeometry(bridge1Len, 0.65, 4.2), basaltMat);
  bridge1Mesh.position.set(bridge1MidX, 2.40, bridge1MidZ);
  bridge1Mesh.rotation.y = -bridge1Ang;
  scene.add(bridge1Mesh);

  // Jembatan 2: Menghubungkan Pulau Satelit Barat Laut [-65, 775] ke Pulau Utama [40, 840]
  // Bentang segmen: [-34, 792] ke [-4, 808]
  const bridge2Len = Math.hypot(-4 - -34, 808 - 792);
  const bridge2MidX = (-34 + -4) / 2;
  const bridge2MidZ = (792 + 808) / 2;
  const bridge2Ang = Math.atan2(808 - 792, -4 - -34);
  const bridge2Mesh = new THREE.Mesh(new THREE.BoxGeometry(bridge2Len, 0.65, 4.2), basaltMat);
  bridge2Mesh.position.set(bridge2MidX, 2.40, bridge2MidZ);
  bridge2Mesh.rotation.y = -bridge2Ang;
  scene.add(bridge2Mesh);

  // H. Lingkungan Pulau Satelit Barat Daya [-75, 875]
  const swRock = createVolcanicBasaltRockMesh(2.2);
  swRock.position.set(-75, 6.50, 875);
  scene.add(swRock);
  colliders.push({ type: 'circle', x: -75, z: 875, radius: 2.8, label: 'Puncak Satelit Vulkanik Barat Daya' });

  // I. Lingkungan Pulau Satelit Barat Laut [-65, 775]
  const nwSpire = createVolcanicPillarMesh();
  nwSpire.position.set(-65, 5.50, 775);
  scene.add(nwSpire);
  colliders.push({ type: 'circle', x: -65, z: 775, radius: 2.2, label: 'Pilar Obsidian Satelit Barat Laut' });

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
  colliders.push({ type: 'box', minX: -195, maxX: -181, minZ: 457, maxZ: 463, label: 'Dermaga Pulau Mercusuar' });

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
    { id: 'chest_village', pos: [-32, 0.25, 138] as [number, number, number] }, // Alun-Alun Desa Sanctuary
    { id: 'chest_beach', pos: [-18.2, 1.85, 215] as [number, number, number] }, // Pelabuhan Pier Head Platform
    { id: 'chest_ruins', pos: [-120, 0, 32] as [number, number, number] }, // Ancient ruins altar
    { id: 'chest_forest', pos: [-60, 0, 110] as [number, number, number] }, // Whispering Mystic Forest
    { id: 'chest_titan', pos: [-182, 0.2, -244] as [number, number, number] }, // Ancient Titan Basin
    { id: 'chest_valkragor', pos: [332, 2.5, 115] as [number, number, number] }, // Val-Kragor Keep Secret Vault
    { id: 'chest_thunderpeak', pos: [110, 4.5, -10] as [number, number, number] }, // Thunderpeak Mage Tower Relic
    { id: 'chest_solaria_palace', pos: [340, 2.0, -280] as [number, number, number] }, // Solaria Sultan Vault
    { id: 'chest_solaria', pos: [-20, 1.5, -320] as [number, number, number] }, // Solaria Pyramid Gold
    { id: 'chest_solaria_oasis', pos: [20, 0.5, -240] as [number, number, number] }, // Solaria Hidden Oasis
    { id: 'chest_dragoncaldera', pos: [40, 2.5, 840] as [number, number, number] }, // Dragon Caldera Hoard (Pusat Altar)
    { id: 'chest_lighthouse', pos: [-218, 6.2, 462] as [number, number, number] }, // Peti Harta Karun Pulau Mercusuar
    { id: 'chest_pirate', pos: [-495, 0.5, 620] as [number, number, number] }, // Peti Harta Karun Bajak Laut
    { id: 'chest_astraea', pos: [-220, 2.0, -220] as [number, number, number] }, // Astraea Imperial Vault
    { id: 'chest_harbor_galleon', pos: [-15.5, 0, 200] as [number, number, number] }, // Harbor Galleon Stash
    { id: 'chest_bridge', pos: [15, 1.35, 110] as [number, number, number] }, // South River Suspension Bridge Cache
    { id: 'chest_sandworm_cache', pos: [-30, 0.5, -220] as [number, number, number] }, // Ancient Sandworm Sinkhole Cache
  ];

  const chests: WorldObjects['chests'] = [];
  for (let c = 0; c < chestData.length; c++) {
    const cd = chestData[c];
    const { group, lidGroup } = createTreasureChestMesh();
    const cy = getTerrainHeight(cd.pos[0], cd.pos[2]);
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
      await cooperativeYield(4);
    }
  }

  await cooperativeYield(4);
  return { chests };
}


async function populateWorldEntities(
  scene: THREE.Scene,
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

  // ==========================================
  // 1. VAST AZURE OCEAN WATER PLANE & COASTAL HARBOR & SANCTUARY VILLAGE (33%)
  // ==========================================
  onProgress?.(33, 'Membangun Desa Utama & Pelabuhan Sanctuary...');
  await cooperativeYield(4);
  const { oceanMesh } = await buildHarbor(scene, getTerrainHeight, colliders, decorativeProps);
  const { elderGroup, elderPos } = await buildMainVillage(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs);

  // ==========================================
  // 2. GRAND IMPERIAL KINGDOM OF ASTRAEA (36%)
  // ==========================================
  onProgress?.(36, 'Membangun Ibukota Kerajaan Emas Astraea...');
  await cooperativeYield(4);
  await buildAstraeaCastle(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs);

  // ==========================================
  // 3. FORTRESS VAL-KRAGOR & CASTLE RUINS (39%)
  // ==========================================
  onProgress?.(39, 'Membangun Desa Benteng Val-Kragor & Puing Kastil...');
  await cooperativeYield(4);
  await buildValKragorFort(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs, floatingCrystals);

  // ==========================================
  // 4. SOLARIA GOLDEN DESERT: VILLAGE, GRAND PALACE & SUNKEN PYRAMID (42%)
  // ==========================================
  onProgress?.(42, 'Membangun Piramida, Oase, & Istana Sultan Malik (42%)...');
  await cooperativeYield(8);
  await buildDesertStructures(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs);

  // ==========================================
  // 5. TITAN LAKE & CANYON (46%)
  // ==========================================
  onProgress?.(46, 'Membangun Lembah Danau Titan & Kawah Cacing Purba (46%)...');
  await cooperativeYield(8);
  await buildTitanLakeAndCanyon(scene, getTerrainHeight, colliders, decorativeProps, pointLights, npcs);

  // ==========================================
  // 6. DRAGON CALDERA ARCHIPELAGO (50% - 54%)
  // ==========================================
  onProgress?.(50, 'Membangun Gugusan Kepulauan Kaldera Naga (50%)...');
  await cooperativeYield(8);
  const { chests } = await buildDragonCaldera(scene, getTerrainHeight, colliders, decorativeProps, pointLights);

  // ==========================================
  // 7. SACRED SPRING, REGIONAL LANDMARKS & CHECKPOINTS (54% - 58%)
  // ==========================================
  onProgress?.(54, 'Menata Mata Air Suci & Kolam Teratai (54%)...');
  await cooperativeYield(4);
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
  onProgress?.(56, 'Membentuk Lembah Batu Lumut Granit & Air Terjun (56%)...');
  await cooperativeYield(4);

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
    const my = getTerrainHeight(mx, mz);
    const mRadius = 1.1 + ((m * 3) % 4) * 0.35;

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
  onProgress?.(57, 'Menumbuhkan Hutan Kabut Eldoria & Puing Kastil (57%)...');
  await cooperativeYield(4);

  const mfDX = 305; // 640 - 335
  const mfDZ = -200; // -340 - (-140)
  const mistForestTreesData: { x: number; y: number; z: number; scale: number; rotationY: number }[] = [];
  for (let t = 0; t < 160; t++) {
    if (t > 0 && t % 20 === 0) await cooperativeYield(4);
    const angle = (t / 160) * Math.PI * 2 * 11;
    const r = Math.sqrt((t + 1) / 160) * 58;
    const tx = 335 + mfDX + Math.cos(angle) * r;
    const tz = -140 + mfDZ + Math.sin(angle) * r;
    if (isPointOnRoad(tx, tz)) continue;
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
  // 10D. REGIONAL LANDMARK: PUING KASTIL TERBENGKALAI (X: 420, Z: -140)
  // Tembok benteng kastil masa lalu, menara patah berlumut, dan pilar batu roboh
  // ==========================================
  const crDX = 195; // 420 - 225
  const crDZ = -105; // -140 - (-35)
  const castleRuinsGroup = new THREE.Group();
  castleRuinsGroup.name = 'Region_CastleRuins';
  const ruinsBaseY = getTerrainHeight(225 + crDX, -35 + crDZ);

  const ruinsStoneMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const ruinedWallCoords = [
    { x: 215 + crDX, z: -35 + crDZ, length: 14, rotY: 0 },
    { x: 235 + crDX, z: -35 + crDZ, length: 12, rotY: 0 },
    { x: 225 + crDX, z: -45 + crDZ, length: 18, rotY: Math.PI / 2 },
    { x: 225 + crDX, z: -25 + crDZ, length: 12, rotY: Math.PI / 2 },
  ];
  ruinedWallCoords.forEach((rw) => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(rw.length, 3.2, 1.8),
      ruinsStoneMat
    );
    wall.position.set(rw.x, ruinsBaseY + 1.6, rw.z);
    wall.rotation.y = rw.rotY;
    wall.castShadow = true;
    castleRuinsGroup.add(wall);
    colliders.push({
      type: 'box',
      minX: rw.x - rw.length / 2,
      maxX: rw.x + rw.length / 2,
      minZ: rw.z - 1.2,
      maxZ: rw.z + 1.2,
      label: 'Tembok Kastil Reruntuhan',
    });
  });

  const brokenTower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.8, 5.5, 8),
    ruinsStoneMat
  );
  brokenTower.position.set(214 + crDX, ruinsBaseY + 2.75, -45 + crDZ);
  brokenTower.castShadow = true;
  castleRuinsGroup.add(brokenTower);
  colliders.push({ type: 'circle', x: 214 + crDX, z: -45 + crDZ, radius: 2.8, label: 'Menara Patah Kastil' });

  const fallenPillarCoords = [
    { x: 222 + crDX, z: -32 + crDZ, rotZ: 1.35, rotY: 0.4 },
    { x: 228 + crDX, z: -38 + crDZ, rotZ: 1.45, rotY: -0.6 },
    { x: 220 + crDX, z: -40 + crDZ, rotZ: 0.15, rotY: 0.2 },
    { x: 230 + crDX, z: -30 + crDZ, rotZ: 0.18, rotY: -0.3 },
  ];
  fallenPillarCoords.forEach((fp) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 4.2, 6),
      ruinsStoneMat
    );
    pillar.position.set(fp.x, ruinsBaseY + 0.8, fp.z);
    pillar.rotation.set(0, fp.rotY, fp.rotZ);
    pillar.castShadow = true;
    castleRuinsGroup.add(pillar);
    colliders.push({ type: 'circle', x: fp.x, z: fp.z, radius: 1.2, label: 'Pilar Roboh Reruntuhan' });
  });

  scene.add(castleRuinsGroup);

  // ==========================================
  // 11. REGIONAL CHECKPOINT & WAYPOINT TELEPORTATION MONUMENTS (58%)
  // ==========================================
  onProgress?.(58, 'Menyiapkan Pos Penjaga & Monumen Checkpoint (58%)...');
  await cooperativeYield(8);

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
        pos: [460, -420],
      },
      {
        id: 'wp_valkragor',
        name: 'Val-Kragor Fortress Plaza',
        nameId: 'Alun-Alun Benteng Val-Kragor',
        pos: [660, 150],
      },
      {
        id: 'wp_thunderpeak',
        name: 'Thunderpeak Spire & Mage Tower',
        nameId: 'Mage Tower Puncak Halilintar',
        pos: [260, -180],
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
        pos: [-400, -290],
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
        pos: [320, -640],
      },
      {
        id: 'wp_sandworm',
        name: 'The Great Solaria Sinkhole',
        nameId: 'Sarang Cacing Purba Gurun',
        pos: [-660, -160],
      },
      {
        id: 'wp_canyon',
        name: 'Ancient Canyon',
        nameId: 'Kanyon Kuno',
        pos: [-280, -760],
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

  // Ambient Forest / Valley Fireflies
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 200;
  const particlePos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePos[i] = (Math.random() - 0.5) * 140;
    particlePos[i + 1] = 1 + Math.random() * 9;
    particlePos[i + 2] = (Math.random() - 0.5) * 140;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xfff59d,
    size: 0.35,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
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

  return {
    scene,
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
    decorativeProps,
    pointLights,
    dirLight,
    hemiLight,
    getTerrainHeight,
  };
}

