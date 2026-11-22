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
import { checkFrameBudget, yieldIfBudgetExceeded } from './frameBudget';
import { SpatialLookupGrid } from './spatialGrid';

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
  return getProceduralContinentHeight(x, z);
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
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 380;
  const d = 110;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // 2.5x - 3x Expanded World Terrain specifications (Span: X[-750..750], Z[-725..475])
  const terrainWidth = 1500;
  const terrainDepth = 1200;
  const segmentsX = 384;
  const segmentsZ = 384;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segmentsX, segmentsZ);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, -125); // Centered at x=0, z=-125 matching bounds X:[-600,600], Z:[-600,350]

  // Unified procedural height function from mapSampler
  const getProceduralHeight = (x: number, z: number): number => {
    return getProceduralContinentHeight(x, z);
  };

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;

  // 1. Initial procedural heights sampling
  const rawHeights: number[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    rawHeights[i] = getProceduralHeight(vx, vz);
  }

  // 2. Slope clamping and 3x3 smoothing filter to eliminate any vertical cliff wall spikes
  const smoothedHeights: number[] = [...rawHeights];
  const gridW = segmentsX + 1;
  const gridH = segmentsZ + 1;
  const maxSlopeDelta = 2.4;

  for (let pass = 0; pass < 2; pass++) {
    for (let gz = 1; gz < gridH - 1; gz++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const idx = gz * gridW + gx;
        const vx = posAttr.getX(idx);
        const vz = posAttr.getZ(idx);

        // Never clamp inside riverbed (must stay deep at Y = -2.5)
        if (getDistanceToRiver(vx, vz) < 6.5) continue;

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
  const colors: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = smoothedHeights[i];
    posAttr.setY(i, vy);

    const sample = getContinentBiomeSample(vx, vz);
    colors.push(sample.color[0] / 255, sample.color[1] / 255, sample.color[2] / 255);
  }

  posAttr.needsUpdate = true;
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.08,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Exact 3D rendered surface height calculation via barycentric triangle interpolation:
  // Guarantees that physics, character foot stepping, and object grounding align 100% with the rendered terrain polygon.
  const minTerrainX = -750; // 0 - 750
  const maxTerrainX = 750;  // 0 + 750
  const minTerrainZ = -725; // -125 - 600
  const maxTerrainZ = 475;  // -125 + 600
  const gridCellW = terrainWidth / segmentsX;
  const gridCellD = terrainDepth / segmentsZ;
  const gridX1 = segmentsX + 1;

  const getMeshSurfaceHeight = (x: number, z: number): number => {
    if (x <= minTerrainX || x >= maxTerrainX || z <= minTerrainZ || z >= maxTerrainZ) {
      return getProceduralHeight(x, z);
    }
    const fx = (x - minTerrainX) / gridCellW;
    const fz = (z - minTerrainZ) / gridCellD;
    const ix = Math.min(segmentsX - 1, Math.max(0, Math.floor(fx)));
    const iz = Math.min(segmentsZ - 1, Math.max(0, Math.floor(fz)));
    const tx = fx - ix;
    const tz = fz - iz;

    const i00 = iz * gridX1 + ix;
    const i10 = iz * gridX1 + (ix + 1);
    const i01 = (iz + 1) * gridX1 + ix;
    const i11 = (iz + 1) * gridX1 + (ix + 1);

    const y00 = posAttr.getY(i00);
    const y10 = posAttr.getY(i10);
    const y01 = posAttr.getY(i01);
    const y11 = posAttr.getY(i11);

    // Three.js PlaneGeometry triangle split along diagonal:
    if (tx + tz <= 1) {
      return y00 + tx * (y10 - y00) + tz * (y01 - y00);
    } else {
      return y11 + (1 - tx) * (y01 - y11) + (1 - tz) * (y10 - y11);
    }
  };

  const getTerrainHeight = createTerrainHeightEvaluator(getMeshSurfaceHeight, getProceduralHeight);

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
  getMeshSurfaceHeight: (x: number, z: number) => number,
  getProceduralHeight: (x: number, z: number) => number
): (x: number, z: number, forVisualMesh?: boolean) => number {
  return (x: number, z: number, forVisualMesh = false): number => {
    if (forVisualMesh) {
      return getProceduralHeight(x, z);
    }

    // 1. Suspension bridge walkable deck corridor (Bridge 2 - South Chasm, at [15, 110])
    if (Math.abs(z - 110) <= 2.4 && x >= 4 && x <= 26) {
      return 1.35;
    }

    // 1b. Bridge 1 - Astraea Highway Stone Bridge (X: -190, Z: -230, deck Y = 0.45)
    if (Math.abs(z - -230) <= 2.5 && x >= -203 && x <= -177) {
      return 0.45;
    }

    // 1c. Bridge 3 - Moss Valley River Bridge (X: 380, Z: 35, deck Y = 0.45)
    if (Math.abs(z - 35) <= 2.5 && x >= 368 && x <= 392) {
      return 0.45;
    }

    // 2. Coastal Wooden Harbor at [-20, 185..215] (Menempel di Pantai Selatan Desa Utama)
    if (
      (Math.abs(x - -20) <= 2.8 && z >= 185 && z <= 215) ||
      (Math.abs(z - 200.0) <= 2.2 && Math.abs(x - -20) <= 15.0) ||
      (Math.abs(x - -20) <= 5.2 && z >= 210 && z <= 216)
    ) {
      return 1.85; // Solid continuous wooden pier deck
    }

    // 3. Relocated Fortress Val-Kragor Solid Courtyard (Center [310, 115], radius 38 at y = 2.00)
    if (Math.hypot(x - 310, z - 115) <= 38) {
      return 2.00;
    }

    // 4. Imperial Capital Astraea Courtyard & Esplanade (Center [-250, -240], radius 46 at y = 2.00)
    if (Math.hypot(x - -250, z - -240) <= 46) {
      return 2.00;
    }

    // 5. Solaria Desert Village Bazaar & Grand Palace Courtyard (y = 1.80..2.00)
    if (Math.hypot(x - 85, z - -230) <= 35) return 0.50;
    if (Math.hypot(x - 430, z - -460) <= 35) return 2.00;

    // 6. Colosseum Kawah Boss Titan Kuno (Center [235, -380], radius 48 at y = 1.80)
    if (Math.hypot(x - 235, z - -380) <= 48) return 1.80;

    // 7. Primal Dragonfang Caldera (Center [-40, 340], radius 48 at y = 2.50)
    if (Math.hypot(x - -40, z - 340) <= 48) return 2.50;

    // 8. Mage Tower Puncak Halilintar (Center [110, -10], radius 20 at y = 4.50)
    if (Math.hypot(x - 110, z - -10) <= 20) return 4.50;

    // 9. Sanctuary Village Central Plains (Center [-35, 135], radius 35 at y = 0.25)
    if (Math.hypot(x - -35, z - 135) <= 35) return 0.25;

    // 10. Exact rendered polygon surface
    return getMeshSurfaceHeight(x, z);
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
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 380;
  const d = 110;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // 2.5x - 3x Expanded World Terrain specifications (Span: X[-750..750], Z[-725..475])
  const terrainWidth = 1500;
  const terrainDepth = 1200;
  const segmentsX = 384;
  const segmentsZ = 384;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segmentsX, segmentsZ);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, -125);

  const getProceduralHeight = (x: number, z: number): number => {
    return getProceduralContinentHeight(x, z);
  };

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;

  // 1. Initial procedural heights sampling (Time-sliced 8ms max macrotask budget)
  onProgress?.(15, 'Membangun Geometri & Heightmap Benua Eldoria...');
  const rawHeights: number[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    rawHeights[i] = getProceduralHeight(posAttr.getX(i), posAttr.getZ(i));
    if (i % 100 === 0) {
      await yieldIfBudgetExceeded(8);
    }
  }

  // 2. Slope clamping and 3x3 smoothing filter (Time-sliced 8ms max per slice)
  onProgress?.(20, 'Menghaluskan Kontur Elevasi & Palung Sungai...');
  const smoothedHeights: number[] = [...rawHeights];
  const gridW = segmentsX + 1;
  const gridH = segmentsZ + 1;
  const maxSlopeDelta = 2.4;

  for (let pass = 0; pass < 2; pass++) {
    for (let gz = 1; gz < gridH - 1; gz++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const idx = gz * gridW + gx;
        const vx = posAttr.getX(idx);
        const vz = posAttr.getZ(idx);

        if (getDistanceToRiver(vx, vz) < 6.5) continue;

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
      if (gz % 5 === 0) {
        await yieldIfBudgetExceeded(8);
      }
    }
  }

  // 3. Vertex colors generated seamlessly (Time-sliced 8ms max per slice)
  onProgress?.(25, 'Mewarnai Biome Terrain...');
  const colors: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = smoothedHeights[i];
    posAttr.setY(i, vy);

    const sample = getContinentBiomeSample(vx, vz);
    colors.push(sample.color[0] / 255, sample.color[1] / 255, sample.color[2] / 255);

    if (i % 100 === 0) {
      await yieldIfBudgetExceeded(8);
    }
  }

  posAttr.needsUpdate = true;
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.08,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const minTerrainX = -750;
  const maxTerrainX = 750;
  const minTerrainZ = -725;
  const maxTerrainZ = 475;
  const gridCellW = terrainWidth / segmentsX;
  const gridCellD = terrainDepth / segmentsZ;
  const gridX1 = segmentsX + 1;

  const getMeshSurfaceHeight = (x: number, z: number): number => {
    if (x <= minTerrainX || x >= maxTerrainX || z <= minTerrainZ || z >= maxTerrainZ) {
      return getProceduralHeight(x, z);
    }
    const fx = (x - minTerrainX) / gridCellW;
    const fz = (z - minTerrainZ) / gridCellD;
    const ix = Math.min(segmentsX - 1, Math.max(0, Math.floor(fx)));
    const iz = Math.min(segmentsZ - 1, Math.max(0, Math.floor(fz)));
    const tx = fx - ix;
    const tz = fz - iz;

    const i00 = iz * gridX1 + ix;
    const i10 = iz * gridX1 + (ix + 1);
    const i01 = (iz + 1) * gridX1 + ix;
    const i11 = (iz + 1) * gridX1 + (ix + 1);

    const y00 = posAttr.getY(i00);
    const y10 = posAttr.getY(i10);
    const y01 = posAttr.getY(i01);
    const y11 = posAttr.getY(i11);

    if (tx + tz <= 1) {
      return y00 + tx * (y10 - y00) + tz * (y01 - y00);
    } else {
      return y11 + (1 - tx) * (y01 - y11) + (1 - tz) * (y10 - y11);
    }
  };

  const getTerrainHeight = createTerrainHeightEvaluator(getMeshSurfaceHeight, getProceduralHeight);

  // 4. Build Spatial Lookup Grid (2D TypedArray Float32 & Uint8)
  onProgress?.(26, 'Membangun Spatial Lookup Grid & Heightmap (TypedArray)...');
  await SpatialLookupGrid.get().buildAsync(getTerrainHeight, onProgress);
  await yieldIfBudgetExceeded(8);

  return await populateWorldEntities(scene, terrainMesh, getTerrainHeight, dirLight, hemiLight, decorativeProps, pointLights, onProgress);
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

  // ==========================================
  // 1. VAST AZURE OCEAN WATER PLANE & COASTAL HARBOR & SANCTUARY VILLAGE (33%)
  // ==========================================
  onProgress?.(33, 'Membangun Desa Utama & Pelabuhan Sanctuary...');
  await yieldIfBudgetExceeded(8);

  // ==========================================
  // 1. VAST AZURE OCEAN WATER PLANE
  // ==========================================
  const oceanGeo = new THREE.PlaneGeometry(1600, 800, 32, 32);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0096c7,
    roughness: 0.1,
    metalness: 0.45,
    transparent: true,
    opacity: 0.82,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.set(80, -0.25, 360);
  scene.add(oceanMesh);

  // ==========================================
  // 1b. EXTENDED CONTINUOUS COASTAL HARBOR (Sea Shoreline at Z >= 185, X: -20)
  // Dermaga Kayu Pelabuhan Sanctuary menempel di pesisir selatan Desa Utama [-20, 185..215]
  // ==========================================
  const dockY = -0.375; // Aligns top of 2.1m deck + 0.125m plank exactly at y = 1.85
  const harborX = -20;

  // 0. Shoreline Boardwalk Apron (Z: 185..188)
  const shorelineBoardwalk = createDockShorelineBoardwalkMesh(5.6, 3.5);
  shorelineBoardwalk.position.set(harborX, 0.22, 185.0);
  scene.add(shorelineBoardwalk);

  // 1. Wooden Beach Ramp & Short Stairs (Z: 187.5..191.5)
  const beachRamp = createDockStairRampMesh(4.8, 4.0, 1.8);
  beachRamp.position.set(harborX, 0.05, 188.0);
  scene.add(beachRamp);

  // 2. Extended Main Straight Pier (Dermaga Utama Menjorok ke Samudra)
  const pierMain1 = createPierDockMesh({ length: 12.0, width: 4.8, pileDepth: 7.0, hasMooringBollards: true });
  pierMain1.position.set(harborX, dockY, 192.0);
  scene.add(pierMain1);

  const pierMain2 = createPierDockMesh({ length: 14.0, width: 4.8, pileDepth: 7.5, hasMooringBollards: true });
  pierMain2.position.set(harborX, dockY, 203.0);
  scene.add(pierMain2);

  const pierHeadPlatform = createPierDockMesh({ length: 6.0, width: 10.0, pileDepth: 8.5, hasLantern: true, lanternSide: 'both', hasMooringBollards: true });
  pierHeadPlatform.position.set(harborX, dockY, 212.0);
  scene.add(pierHeadPlatform);

  // 3. Symmetrical Berthing Wings (Cabang Tempat Bersandar Kapal di Z = 200)
  const wingWest1 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.2, hasLantern: true, lanternSide: 'left', hasMooringBollards: true });
  wingWest1.position.set(harborX - 2.4, dockY, 200.0);
  wingWest1.rotation.y = Math.PI * 1.5;
  scene.add(wingWest1);

  const wingEast1 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.2, hasLantern: true, lanternSide: 'right', hasMooringBollards: true });
  wingEast1.position.set(harborX + 2.4, dockY, 200.0);
  wingEast1.rotation.y = Math.PI / 2;
  scene.add(wingEast1);

  // 4. Moored Main Ships & Boarding Gangways
  // Grand Merchant Galleon 1 (Bertambat di samping Sayap Timur)
  const galleon1 = createMerchantGalleonMesh();
  galleon1.position.set(harborX + 19.5, -0.25, 200.0);
  galleon1.rotation.y = 0;
  scene.add(galleon1);

  // Viking Shielded Warship 2 (Bertambat di samping Sayap Barat)
  const warship2 = createVikingWarshipMesh();
  warship2.position.set(harborX - 19.5, -0.25, 200.0);
  warship2.rotation.y = 0;
  scene.add(warship2);

  // Perahu Nelayan Pak Joko (Bertambat di ujung anjungan)
  const rowboatJoko = createRowboatMesh();
  rowboatJoko.position.set(harborX, -0.25, 215.0);
  rowboatJoko.rotation.y = Math.PI / 2;
  scene.add(rowboatJoko);

  // Timber boarding gangways
  const gangwayMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const gangwayEast = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayEast.position.set(harborX + 16.9, 1.86, 200.0);
  scene.add(gangwayEast);

  const gangwayWest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayWest.position.set(harborX - 16.9, 1.86, 200.0);
  scene.add(gangwayWest);

  // ==========================================
  // 2. ORGANIZED SANCTUARY VILLAGE & FACILITIES
  // Symmetrical street grid on flat dry mainland (y = 0.25, z: -32..15).
  // Zero flooding, zero overlaps with roads or props!
  // ==========================================
  const colliders: WorldCollider[] = [];
  const npcs: WorldNPC[] = [];
  const villageMainlandY = 0.25;

  // 2.0 Moored Ship Hull Solid Boundaries (Dermaga Pelabuhan Sanctuary X: -20)
  colliders.push(
    // Ship Hull Colliders (Outer water boundaries)
    { type: 'box', minX: harborX + 14.5, maxX: harborX + 19.5, minZ: 193, maxZ: 207, label: 'Lambung Kapal Dagang Emas 1' },
    { type: 'box', minX: harborX - 19.5, maxX: harborX - 14.5, minZ: 193, maxZ: 207, label: 'Lambung Kapal Perang Bershield' }
  );

  // 2.1 Northern Village Gateway Arch (Start of North Highway at X = -35, Z = 105)
  const villageArch = createVillageArchMesh('GERBANG UTARA ELDORIA');
  const archX = -35;
  const archZ = 105;
  villageArch.position.set(archX, villageMainlandY, archZ);
  scene.add(villageArch);
  colliders.push(
    { type: 'circle', x: archX - 3.5, z: archZ, radius: 0.6, label: 'Gerbang Utara Pilar Kiri' },
    { type: 'circle', x: archX + 3.5, z: archZ, radius: 0.6, label: 'Gerbang Utara Pilar Kanan' }
  );

  // 2.1b Western Village Gateway Arch (Start of Astraea Highway at X = -75, Z = 135)
  const villageWestArch = createVillageArchMesh('GERBANG BARAT ASTRAEA');
  villageWestArch.position.set(-75, villageMainlandY, 135);
  villageWestArch.rotation.y = Math.PI / 2;
  scene.add(villageWestArch);
  colliders.push(
    { type: 'circle', x: -75, z: 131.5, radius: 0.6, label: 'Gerbang Barat Pilar Utara' },
    { type: 'circle', x: -75, z: 138.5, radius: 0.6, label: 'Gerbang Barat Pilar Selatan' }
  );

  // 2.2 Sanctuary Grand Fountain in Central Town Plaza (X: -35, Z: 135)
  // Perfectly centered on plaza, leaving pedestrian circulation open and unobstructed
  const fountainX = -35;
  const fountainZ = 135;
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

  // 2.3 Balai Tetua Vaelen & Pusat Komunitas (North-West Plaza: X: -50, Z: 120 - safely >8 units from roads)
  const house1 = createVillageHouseMesh();
  const h1Pos = { x: -50, z: 120 };
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

  // 2.4 Village Tavern & Resting Inn: "Penginapan Eldoria" (North-East Plaza: X: -20, Z: 120)
  const tavern = createTavernMesh();
  const tavernPos = { x: -20, z: 120 };
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

  // 2.5 Master Torvald's Blacksmith Forge (South-West: X: -50, Z: 150)
  const blacksmith = createBlacksmithMesh();
  const forgePos = { x: -50, z: 150 };
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

  // 2.6 Anya's Alchemy & Potion Stall (East Commercial Avenue: X: -10, Z: 145)
  const anyaStall = createMarketStallMesh(0x15803d);
  const anyaPos = { x: -10, z: 145 };
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

  // 2.7 Maya's Armor & Weapon Outfitter Stall (East Commercial Avenue: X: -8, Z: 155)
  const marketStall2 = createArmorStallMesh(0x1e3a8a);
  const m2Pos = { x: -8, z: 155 };
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
  // West Residential Street (along X = -65)
  const house2 = createVillageHouseMesh();
  const h2Pos = { x: -65, z: 120 };
  house2.position.set(h2Pos.x, villageMainlandY, h2Pos.z);
  house2.rotation.y = 0;
  scene.add(house2);
  colliders.push({
    type: 'box',
    minX: h2Pos.x - 2.5, maxX: h2Pos.x + 2.5, minZ: h2Pos.z - 2.5, maxZ: h2Pos.z + 2.5,
    label: 'Rumah Pengrajin Barat',
  });

  const house6 = createVillageHouseMesh();
  const h6Pos = { x: -65, z: 150 };
  house6.position.set(h6Pos.x, villageMainlandY, h6Pos.z);
  house6.rotation.y = 0;
  scene.add(house6);
  colliders.push({
    type: 'box',
    minX: h6Pos.x - 2.5, maxX: h6Pos.x + 2.5, minZ: h6Pos.z - 2.5, maxZ: h6Pos.z + 2.5,
    label: 'Rumah Kebun Apel Barat',
  });

  const house7 = createVillageHouseMesh();
  const h7Pos = { x: -50, z: 165 };
  house7.position.set(h7Pos.x, villageMainlandY, h7Pos.z);
  house7.rotation.y = 0;
  scene.add(house7);
  colliders.push({
    type: 'box',
    minX: h7Pos.x - 2.5, maxX: h7Pos.x + 2.5, minZ: h7Pos.z - 2.5, maxZ: h7Pos.z + 2.5,
    label: 'Pondok Herbalis Barat',
  });

  // East Residential Street (along X = -5)
  const house3 = createVillageHouseMesh();
  const h3Pos = { x: -5, z: 120 };
  house3.position.set(h3Pos.x, villageMainlandY, h3Pos.z);
  house3.rotation.y = Math.PI;
  scene.add(house3);
  colliders.push({
    type: 'box',
    minX: h3Pos.x - 2.5, maxX: h3Pos.x + 2.5, minZ: h3Pos.z - 2.5, maxZ: h3Pos.z + 2.5,
    label: 'Rumah Petani Lembah Timur',
  });

  const house4 = createVillageHouseMesh();
  const h4Pos = { x: -5, z: 145 };
  house4.position.set(h4Pos.x, villageMainlandY, h4Pos.z);
  house4.rotation.y = Math.PI;
  scene.add(house4);
  colliders.push({
    type: 'box',
    minX: h4Pos.x - 2.5, maxX: h4Pos.x + 2.5, minZ: h4Pos.z - 2.5, maxZ: h4Pos.z + 2.5,
    label: 'Rumah Padang Rumput Timur',
  });

  const house5 = createVillageHouseMesh();
  const h5Pos = { x: -5, z: 165 };
  house5.position.set(h5Pos.x, villageMainlandY, h5Pos.z);
  house5.rotation.y = Math.PI;
  scene.add(house5);
  colliders.push({
    type: 'box',
    minX: h5Pos.x - 2.5, maxX: h5Pos.x + 2.5, minZ: h5Pos.z - 2.5, maxZ: h5Pos.z + 2.5,
    label: 'Pondok Penjaga Padang Timur',
  });

  // Coastal Lookout Cottage (Situated safely on dry mainland at Z = 175, X = -36, overlooking the harbor)
  const house8 = createVillageHouseMesh();
  const h8Pos = { x: -36, z: 175 };
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
    [-39, 115],
    [-31, 115],
    [-39, 125],
    [-31, 125],
    // Central Plaza Corners
    [-43, 127],
    [-27, 127],
    [-43, 143],
    [-27, 143],
    // South Promenade leading to Harbor
    [-31, 150],
    [-21, 150],
    [-26, 165],
    [-16, 165],
    [-25, 180],
    [-15, 180],
    // West Avenue
    [-52, 131],
    [-52, 139],
    [-68, 131],
    [-68, 139],
  ];
  const villageLampTransforms = lampPositions.map(([lx, lz]) => {
    colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Jalan' });
    return { x: lx, y: villageMainlandY, z: lz };
  });
  const villageLampsMesh = createInstancedStreetLamps(villageLampTransforms);
  scene.add(villageLampsMesh);

  // Village barrels placed neatly against walls in alleyways (Cleaned up: zero clutter)
  const barrelPositions = [
    [-53.5, 150],
    [-17.0, 120],
    [-7.0, 145],
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
  const elderPos: [number, number, number] = [-47.5, villageMainlandY, 123.5];
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
  const guardPos: [number, number, number] = [-35, villageMainlandY, 107.0];
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

  // NPC 3: Anya (Alkemis & Herbalis) - At her potion counter
  const anyaGroup = createCustomNPCMesh('alchemist');
  const anyaNPCPos: [number, number, number] = [-12.5, villageMainlandY, 145];
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
  const torvaldPos: [number, number, number] = [-47.5, villageMainlandY, 150];
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

  // NPC 5: Lyra the Wandering Bard - Outside tavern terrace
  const bardGroup = createCustomNPCMesh('bard');
  const bardPos: [number, number, number] = [-22, villageMainlandY, 122];
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
  const jokoPos: [number, number, number] = [-18.2, 1.85, 212.0]; // At seaward harbor pier head looking out to open sea
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

  // NPC 7: Kael (Warga Desa Muda) - By coastal alleyway
  const kaelGroup = createCustomNPCMesh('villager');
  const kaelPos: [number, number, number] = [-38, villageMainlandY, 162];
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
  const mayaPos: [number, number, number] = [-30.5, villageMainlandY, 157];
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

  // ==========================================
  // 8b. GRAND IMPERIAL KINGDOM OF ASTRAEA (North-West Plains Metropolis: [-250, -240]) (36%)
  // ==========================================
  onProgress?.(36, 'Membangun Ibukota Kerajaan Emas Astraea...');
  await yieldIfBudgetExceeded(8);

  const astraeaBaseY = 2.00;

  // A. Grand Imperial Sun Palace of Astraea (North End: X: -250, Z: -265)
  // Facing SOUTH (Direction: 0° / rotation.y = 0) looking over the plaza and south gate
  const imperialPalace = createImperialPalaceMesh();
  imperialPalace.position.set(-250, astraeaBaseY, -265);
  imperialPalace.rotation.y = 0;
  scene.add(imperialPalace);
  colliders.push({
    type: 'box',
    minX: -264,
    maxX: -236,
    minZ: -276,
    maxZ: -254,
    label: 'Istana Kerajaan Kaisar Astraea',
  });

  // B. Grand Circular Stone Plaza & Jalan Lingkar (Center: X: -250, Z: -240, Radius: 11.5m)
  const circularPlaza = createCircularPlazaMesh(11.5, 4.8);
  circularPlaza.position.set(-250, astraeaBaseY, -240);
  scene.add(circularPlaza);

  // B2. Celestial 3-Tier Fountain of Immortality (Center of Circular Plaza at X: -250, Z: -240)
  const celestialFountain = createImperialFountainMesh();
  celestialFountain.position.set(-250, astraeaBaseY, -240);
  scene.add(celestialFountain);
  colliders.push({
    type: 'circle',
    x: -250,
    z: -240,
    radius: 4.8,
    label: 'Air Mancur Keabadian Alun-Alun Astraea',
  });

  // B3. Four Golden Heroic Statues Placed at Diagonal Corners of Circular Plaza (NW, NE, SW, SE)
  const heroStatues = [
    { x: -258, z: -248, ry: Math.PI * 0.75 }, // Barat Laut
    { x: -242, z: -248, ry: Math.PI * 1.25 }, // Timur Laut
    { x: -258, z: -232, ry: Math.PI * 0.25 }, // Barat Daya
    { x: -242, z: -232, ry: -Math.PI * 0.25 }, // Timur Daya
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
    // Flanking Central Promenade between Gate [-250, -210] and Plaza [-250, -240]
    { x: -255, z: -218 },
    { x: -245, z: -218 },
    { x: -255, z: -228 },
    { x: -245, z: -228 },
    // Flanking Central Promenade between Plaza [-250, -240] and Palace [-250, -265]
    { x: -255, z: -250 },
    { x: -245, z: -250 },
    { x: -255, z: -258 },
    { x: -245, z: -258 },
    // Outer Courtyard flanking lanterns
    { x: -264, z: -240 },
    { x: -236, z: -240 },
  ];
  astraeaStreetlamps.forEach((sl) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(sl.x, astraeaBaseY, sl.z);
    scene.add(lamp);
    colliders.push({ type: 'circle', x: sl.x, z: sl.z, radius: 0.35, label: 'Lampu Emas Kerajaan' });
  });

  // C. South Imperial Gatehouse (South Entrance, X: -250, Z: -210)
  // Facing SOUTH (Rotation Y = 0) meeting approach road perpendicularly
  const imperialGatehouse = createImperialGatehouseMesh();
  imperialGatehouse.position.set(-250, astraeaBaseY, -210);
  imperialGatehouse.rotation.y = 0;
  scene.add(imperialGatehouse);
  colliders.push(
    { type: 'box', minX: -257.5, maxX: -253.5, minZ: -212.5, maxZ: -207.5, label: 'Bastion Barat Gerbang Selatan Astraea' },
    { type: 'box', minX: -246.5, maxX: -242.5, minZ: -212.5, maxZ: -207.5, label: 'Bastion Timur Gerbang Selatan Astraea' }
  );

  // D. Solid Imperial Fortress Wall Perimeter Enclosing Capital (X: -275..-225, Z: -270..-210)
  // 1. South Wall - West Wing (from Gatehouse [-253.5, -210] to SW corner [-275, -210], length 21.5)
  const wallSouthWest = createImperialWallMesh(21.5);
  wallSouthWest.position.set(-264.25, astraeaBaseY, -210);
  scene.add(wallSouthWest);
  colliders.push({ type: 'box', minX: -275, maxX: -253.5, minZ: -211.5, maxZ: -208.5, label: 'Benteng Astraea Selatan Barat' });

  // 2. South Wall - East Wing (from Gatehouse [-246.5, -210] to SE corner [-225, -210], length 21.5)
  const wallSouthEast = createImperialWallMesh(21.5);
  wallSouthEast.position.set(-235.75, astraeaBaseY, -210);
  scene.add(wallSouthEast);
  colliders.push({ type: 'box', minX: -246.5, maxX: -225, minZ: -211.5, maxZ: -208.5, label: 'Benteng Astraea Selatan Timur' });

  // 3. North Wall (from [-275, -270] to [-225, -270], length 50)
  const nWall = createImperialWallMesh(50);
  nWall.position.set(-250, astraeaBaseY, -270);
  scene.add(nWall);
  colliders.push({ type: 'box', minX: -275, maxX: -225, minZ: -271.5, maxZ: -268.5, label: 'Benteng Astraea Utara' });

  // 4. West Wall (from [-275, -270] to [-275, -210], length 60)
  const wWall = createImperialWallMesh(60);
  wWall.position.set(-275, astraeaBaseY, -240);
  wWall.rotation.y = Math.PI / 2;
  scene.add(wWall);
  colliders.push({ type: 'box', minX: -276.5, maxX: -273.5, minZ: -270, maxZ: -210, label: 'Benteng Astraea Barat' });

  // 5. East Wall (from [-225, -270] to [-225, -210], length 60)
  const eWall = createImperialWallMesh(60);
  eWall.position.set(-225, astraeaBaseY, -240);
  eWall.rotation.y = Math.PI / 2;
  scene.add(eWall);
  colliders.push({ type: 'box', minX: -226.5, maxX: -223.5, minZ: -270, maxZ: -210, label: 'Benteng Astraea Timur' });

  // 6. Four Corner Bastion Towers
  const cornerTowers = [
    { x: -275, z: -210, label: 'Menara Benteng Barat Daya Astraea' },
    { x: -225, z: -210, label: 'Menara Benteng Tenggara Astraea' },
    { x: -275, z: -270, label: 'Menara Benteng Barat Laut Astraea' },
    { x: -225, z: -270, label: 'Menara Benteng Timur Laut Astraea' },
  ];
  cornerTowers.forEach((ct) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(ct.x, astraeaBaseY, ct.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: ct.x, z: ct.z, radius: 2.8, label: ct.label });
  });

  // E. Symmetrical Grand Royal Bazaar Stalls Flanking West & East Promenades
  const astraeaStall1 = createImperialBazaarStallMesh(0x9333ea, 0xfacc15); // Celestial Potions
  astraeaStall1.position.set(-262, astraeaBaseY, -225);
  astraeaStall1.rotation.y = Math.PI / 2;
  scene.add(astraeaStall1);
  colliders.push({ type: 'box', minX: -264, maxX: -260, minZ: -227, maxZ: -223, label: 'Kios Alkimia Kerajaan' });

  const astraeaStall2 = createImperialBazaarStallMesh(0x2563eb, 0x38bdf8); // Masterwork Armory
  astraeaStall2.position.set(-262, astraeaBaseY, -245);
  astraeaStall2.rotation.y = Math.PI / 2;
  scene.add(astraeaStall2);
  colliders.push({ type: 'box', minX: -264, maxX: -260, minZ: -247, maxZ: -243, label: 'Kios Senjata Astraea' });

  const astraeaStall3 = createImperialBazaarStallMesh(0xd97706, 0xfef08a); // Silk & Relics
  astraeaStall3.position.set(-238, astraeaBaseY, -225);
  astraeaStall3.rotation.y = -Math.PI / 2;
  scene.add(astraeaStall3);
  colliders.push({ type: 'box', minX: -240, maxX: -236, minZ: -227, maxZ: -223, label: 'Kios Sutra Emas' });

  const astraeaStall4 = createImperialBazaarStallMesh(0x059669, 0xa7f3d0); // Royal Provisions
  astraeaStall4.position.set(-238, astraeaBaseY, -245);
  astraeaStall4.rotation.y = -Math.PI / 2;
  scene.add(astraeaStall4);
  colliders.push({ type: 'box', minX: -240, maxX: -236, minZ: -247, maxZ: -243, label: 'Kios Perjamuan Kaisar' });

  // G. Pine Trees along Courtyard Perimeter (Inside Inner Walls)
  const astraeaCourtyardPineCoords = [
    { x: -268, z: -255 }, { x: -268, z: -235 },
    { x: -232, z: -255 }, { x: -232, z: -235 },
    { x: -268, z: -220 }, { x: -232, z: -220 },
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
  const emperorPos: [number, number, number] = [-250, astraeaBaseY + 1.6, -257];
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
  const marshalPos: [number, number, number] = [-246, astraeaBaseY, -215];
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

  // NPC 15: Saudagar Kerajaan Lyra (At Alchemy Stall, facing East into promenade)
  const lyraGroup = createCustomNPCMesh('alchemist');
  const lyraPos: [number, number, number] = [-260, astraeaBaseY, -225];
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
  const astraeaGuardPos: [number, number, number] = [-250, astraeaBaseY, -207];
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

  // ==========================================
  // 2.8 SECOND VILLAGE: RELOCATED & EXPANDED DESA BENTENG VAL-KRAGOR & PUING KASTIL (39%)
  // (Pusat Dataran Padang Rumput Timur: Center [315, 95], Courtyard X: 289..341, Z: 73..117 at y = 2.00)
  // Gerbang Utama diputar lurus menghadap Barat (Rotation Y = Math.PI * 1.5 / 270°).
  // Interior lengkap: Barak Prajurit, Bengkel Persenjataan Goran, Menara Panah, Tempat Latihan Pedang & Panahan, Api Unggun.
  // ==========================================
  onProgress?.(39, 'Membangun Desa Benteng Val-Kragor & Puing Kastil...');
  await yieldIfBudgetExceeded(8);
  const valKragorBaseY = 2.00;
  const vkBaseX = 310;
  const vkBaseZ = 115;
  const vkDX = vkBaseX - 380; // -70
  const vkDZ = vkBaseZ - 80;  // +35

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

  // ==========================================
  // 2.9 MISTY CHASM & SOLID SUSPENSION BRIDGE (JEMBATAN 2: JALUR HILIR SELATAN - X: 15, Z: 110)
  // Membentang lurus di X: 4..26 pada Z = 110 di atas Cabang Sungai Hilir Selatan.
  // ==========================================
  const bridge = createSuspensionBridgeMesh(22);
  bridge.position.set(15, 1.35, 110);
  scene.add(bridge);

  const chasmStonePier = createStoneBridgePierMesh(4.4);
  chasmStonePier.position.set(15, -2.2, 110);
  scene.add(chasmStonePier);

  colliders.push(
    { type: 'box', minX: 4, maxX: 26, minZ: 107.8, maxZ: 108.6, label: 'Pagar Jembatan Gantung Utara' },
    { type: 'box', minX: 4, maxX: 26, minZ: 111.4, maxZ: 112.2, label: 'Pagar Jembatan Gantung Selatan' }
  );

  // ==========================================
  // 2.9c JEMBATAN 1: JALUR BARAT / ASTRAEA HIGHWAY (X: -190, Z: -230)
  // ==========================================
  const bridge1West = createStoneArchBridgeMesh(26, 4.8, 2.7);
  bridge1West.position.set(-190, 0.45, -230);
  bridge1West.rotation.y = 0;
  scene.add(bridge1West);
  colliders.push(
    { type: 'box', minX: -203, maxX: -177, minZ: -232.5, maxZ: -232.1, label: 'Pagar Jembatan 1 Utara' },
    { type: 'box', minX: -203, maxX: -177, minZ: -227.9, maxZ: -227.5, label: 'Pagar Jembatan 1 Selatan' }
  );

  // ==========================================
  // 2.9d JEMBATAN 3: AKSES LEMBAH BATU LUMUT (X: 380, Z: 35)
  // Menyeberang Sungai Timur tegak lurus menghubungkan Val-Kragor ke Lembah Batu Lumut
  // ==========================================
  const bridge3Moss = createStoneArchBridgeMesh(24, 4.8, 2.7);
  bridge3Moss.position.set(380, 0.45, 35);
  bridge3Moss.rotation.y = 0; // Membentang tegak lurus menyeberangi lebar sungai
  scene.add(bridge3Moss);
  colliders.push(
    { type: 'box', minX: 368, maxX: 392, minZ: 32.5, maxZ: 32.9, label: 'Pagar Jembatan 3 Utara' },
    { type: 'box', minX: 368, maxX: 392, minZ: 37.1, maxZ: 37.5, label: 'Pagar Jembatan 3 Selatan' }
  );

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
  const floatingCrystals: THREE.Mesh[] = [];
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
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 120;
    const tx = Math.cos(angle) * dist;
    const tz = 180 + Math.sin(angle) * dist;

    // Strict Anti-Overlap & Cross-Biome Exclusion: DILARANG SPAWN di biome gurun!
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

  // ==========================================
  // 5. SOLARIA GOLDEN DESERT: VILLAGE, GRAND PALACE & SUNKEN PYRAMID (42%)
  // ==========================================
  onProgress?.(42, 'Membangun Piramida, Oase, & Istana Sultan Malik...');
  await yieldIfBudgetExceeded(8);

  // ------------------------------------------
  // 5A. ANCIENT SUNKEN PYRAMID RUINS ([120, -280])
  // ------------------------------------------
  const pyramid = createDesertPyramidMesh();
  const pyY = 1.50;
  pyramid.position.set(-20, pyY, -320);
  scene.add(pyramid);
  colliders.push({
    type: 'box',
    minX: 111,
    maxX: 129,
    minZ: -289,
    maxZ: -271,
    label: 'Piramida Emas Solaria',
  });

  // Obelisks guarding pyramid approach
  const obeliskPositions = [
    { x: -35, z: -320 },
    { x: -5, z: -320 },
    { x: -20, z: -335 },
    { x: -20, z: -305 },
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
    { x: 138, z: -294 },
    { x: 132, z: -290 },
    { x: 142, z: -286 },
    { x: 102, z: -264 },
    { x: 98, z: -258 },
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
  // 5B. HIDDEN OASIS OF SOLARIA ([150, -360])
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
  oasisPool.position.set(20, 0.05, -240);
  scene.add(oasisPool);

  const oasisPalmsData: { x: number; y: number; z: number; rotationY: number }[] = [];
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    const px = 150 + Math.cos(angle) * 17;
    const pz = -360 + Math.sin(angle) * 17;
    if (!isDesertBiome(px, pz)) continue; // DILARANG SPAWN di luar gurun!
    const py = getTerrainHeight(px, pz);
    oasisPalmsData.push({ x: px, y: py, z: pz, rotationY: angle + 0.5 });
    colliders.push({ type: 'circle', x: px, z: pz, radius: 0.65, label: 'Pohon Palem Oase' });
  }
  const oasisPalmsMesh = createInstancedDesertPalms(oasisPalmsData);
  scene.add(oasisPalmsMesh);

  // ------------------------------------------
  // 5C. GRAND SULTAN SOLARIA PALACE & DESA BAZAAR GURUN
  // Palace Center: [340, -280] (Y=2.00), Village Center: [280, -280] (Y=1.80)
  // ------------------------------------------
  const solariaBaseY = 1.80;
  const solariaPalaceY = 2.00;

  // 1. Grand Taj Mahal Palace of Sultan Solaria (East End: [340, -280])
  const solariaPalace = createTajMahalPalaceMesh();
  solariaPalace.position.set(360, solariaPalaceY, -440);
  solariaPalace.rotation.y = Math.PI; // Menghadap ke Barat (ke arah avenue & bazaar)
  scene.add(solariaPalace);
  colliders.push({
    type: 'box',
    minX: 322,
    maxX: 358,
    minZ: -296,
    maxZ: -264,
    label: 'Istana Taj Mahal Sultan Solaria',
  });
  colliders.push({ type: 'circle', x: 324, z: -296, radius: 2.2, label: 'Menara Minaret Barat Laut' });
  colliders.push({ type: 'circle', x: 324, z: -264, radius: 2.2, label: 'Menara Minaret Barat Daya' });
  colliders.push({ type: 'circle', x: 356, z: -296, radius: 2.2, label: 'Menara Minaret Timur Laut' });
  colliders.push({ type: 'circle', x: 356, z: -264, radius: 2.2, label: 'Menara Minaret Tenggara' });

  // 2. Alur Jalan Setapak Kafilah Gurun (Grand Sandstone Desert Avenue: X: 238..330, Z: -280)
  // Dibangun secara dinamis dan presisi oleh buildWorldRoadNetwork (RoadSystem.ts)
  // dengan material pasir padat #d9be8b dan lempengan batu pasir bakar #bfa16a.

  // Grand Avenue Date Palms & Brass Desert Oil Lanterns
  const causewayItems = [
    { type: 'lantern', x: 255, z: -284.5 },
    { type: 'palm', x: 270, z: -284.5 },
    { type: 'lantern', x: 285, z: -284.5 },
    { type: 'palm', x: 300, z: -284.5 },
    { type: 'lantern', x: 315, z: -284.5 },
    { type: 'lantern', x: 255, z: -275.5 },
    { type: 'palm', x: 270, z: -275.5 },
    { type: 'lantern', x: 285, z: -275.5 },
    { type: 'palm', x: 300, z: -275.5 },
    { type: 'lantern', x: 315, z: -275.5 },
  ];

  causewayItems.forEach((item, idx) => {
    if (!isDesertBiome(item.x, item.z)) return; // DILARANG SPAWN di padang rumput hijau!
    if (item.type === 'palm') {
      const palm = createDesertPalmMesh();
      palm.position.set(item.x, solariaBaseY, item.z);
      palm.rotation.y = idx * 0.8;
      scene.add(palm);
      colliders.push({ type: 'circle', x: item.x, z: item.z, radius: 0.65, label: 'Pohon Palem Desert Avenue' });
    } else {
      const lantern = createDesertOilLanternMesh();
      lantern.position.set(item.x, solariaBaseY, item.z);
      scene.add(lantern);
      colliders.push({ type: 'circle', x: item.x, z: item.z, radius: 0.45, label: 'Lampu Minyak Desert Avenue' });
    }
  });

  // 3. Interior Ruang Takhta Sultan (Throne Room Interior Cell: [340, -25, -280])
  const throneInterior = createThroneRoomInteriorMesh();
  throneInterior.position.set(340, -25, -280);
  scene.add(throneInterior);
  colliders.push({ type: 'box', minX: 323, maxX: 357, minZ: -292, maxZ: -290, maxY: -10, label: 'Dinding Utara Ruang Takhta' });
  colliders.push({ type: 'box', minX: 323, maxX: 357, minZ: -270, maxZ: -268, maxY: -10, label: 'Dinding Selatan Ruang Takhta' });
  colliders.push({ type: 'box', minX: 322, maxX: 324, minZ: -291, maxZ: -269, maxY: -10, label: 'Dinding Belakang Takhta' });
  colliders.push({ type: 'box', minX: 325, maxX: 330, minZ: -283, maxZ: -277, maxY: -10, label: 'Singgasana Emas Sultan' });

  // Sultan Malik al-Solaria
  const sultanGroup = createCustomNPCMesh('emperor');
  const sultanPos: [number, number, number] = [327.5, -25 + 1.4, -280];
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

  // 2 Royal Elite Desert Guards flanking the Sultan's Throne
  const guard1Group = createCustomNPCMesh('guard');
  const guard1Pos: [number, number, number] = [326, -25, -283.5];
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
  const guard2Pos: [number, number, number] = [326, -25, -276.5];
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

  // 4. Sumur Batu Oase di Tepi Jalan (Roadside Oasis Well Plaza: [250, -286])
  const desertWell = createDesertOasisWellMesh();
  desertWell.position.set(250, solariaBaseY, -286);
  scene.add(desertWell);
  colliders.push({
    type: 'circle',
    x: 250,
    z: -286,
    radius: 1.8,
    label: 'Sumur Oase Solaria',
  });

  // Pohon Kurma di Sekitar Sumur Oase
  const townPalmOffsets = [
    { x: 246, z: -289 },
    { x: 254, z: -289 },
    { x: 246, z: -283 },
    { x: 254, z: -283 },
  ];
  townPalmOffsets.forEach((tpo, idx) => {
    if (!isDesertBiome(tpo.x, tpo.z)) return; // DILARANG SPAWN di padang rumput hijau!
    const palm = createDesertPalmMesh();
    palm.position.set(tpo.x, solariaBaseY, tpo.z);
    palm.rotation.y = idx * 1.57;
    scene.add(palm);
    colliders.push({ type: 'circle', x: tpo.x, z: tpo.z, radius: 0.65, label: 'Pohon Kurma Alun-Alun Solaria' });
  });

  // 5. Rumah-Rumah Tanah Liat Khas Gurun
  // Sisi Utara Jalan (Z = -273):
  const adobeHouse1 = createDesertMudBrickHouseMesh(1);
  adobeHouse1.position.set(240, solariaBaseY, -273);
  adobeHouse1.rotation.y = 0;
  scene.add(adobeHouse1);
  colliders.push({ type: 'box', minX: 236, maxX: 244, minZ: -277, maxZ: -269, label: 'Rumah Bertingkat Gurun 1' });

  const adobeHouse2 = createDesertMudBrickHouseMesh(2);
  adobeHouse2.position.set(255, solariaBaseY, -273);
  adobeHouse2.rotation.y = 0;
  scene.add(adobeHouse2);
  colliders.push({ type: 'box', minX: 251, maxX: 259, minZ: -277, maxZ: -269, label: 'Rumah Saudagar Gurun 2' });

  const adobeHouse3 = createDesertMudBrickHouseMesh(1);
  adobeHouse3.position.set(270, solariaBaseY, -273);
  adobeHouse3.rotation.y = 0;
  scene.add(adobeHouse3);
  colliders.push({ type: 'box', minX: 266, maxX: 274, minZ: -277, maxZ: -269, label: 'Rumah Bertingkat Gurun 3' });

  // Sisi Selatan Jalan (Z = -287):
  const adobeHouse4 = createDesertMudBrickHouseMesh(0);
  adobeHouse4.position.set(240, solariaBaseY, -287);
  adobeHouse4.rotation.y = Math.PI;
  scene.add(adobeHouse4);
  colliders.push({ type: 'box', minX: 236, maxX: 244, minZ: -291, maxZ: -283, label: 'Rumah Tanah Liat Gurun 4' });

  const camelRest = createCamelRestAreaMesh();
  camelRest.position.set(255, solariaBaseY, -287);
  scene.add(camelRest);
  colliders.push({ type: 'box', minX: 249, maxX: 261, minZ: -292, maxZ: -282, label: 'Tempat Peristirahatan Unta Gurun' });

  const adobeHouse5 = createDesertMudBrickHouseMesh(0);
  adobeHouse5.position.set(270, solariaBaseY, -287);
  adobeHouse5.rotation.y = Math.PI;
  scene.add(adobeHouse5);
  colliders.push({ type: 'box', minX: 266, maxX: 274, minZ: -291, maxZ: -283, label: 'Rumah Tanah Liat Gurun 5' });

  // 6. Pasar Bazaar Gurun Solaria
  const bazaarStall1 = createDesertBazaarStallMesh(0xd97706, 0xfef08a);
  bazaarStall1.position.set(246, solariaBaseY, -275);
  bazaarStall1.rotation.y = 0;
  scene.add(bazaarStall1);
  colliders.push({ type: 'box', minX: 244, maxX: 248, minZ: -276, maxZ: -274, label: 'Kios Rempah Solaria' });

  const bazaarStall2 = createDesertBazaarStallMesh(0x9333ea, 0xfbbf24);
  bazaarStall2.position.set(264, solariaBaseY, -275);
  bazaarStall2.rotation.y = 0;
  scene.add(bazaarStall2);
  colliders.push({ type: 'box', minX: 262, maxX: 266, minZ: -276, maxZ: -274, label: 'Kios Karpet Solaria' });

  const bazaarStall3 = createDesertBazaarStallMesh(0x059669, 0xa7f3d0);
  bazaarStall3.position.set(246, solariaBaseY, -285);
  bazaarStall3.rotation.y = Math.PI;
  scene.add(bazaarStall3);
  colliders.push({ type: 'box', minX: 244, maxX: 248, minZ: -286, maxZ: -284, label: 'Kios Tembikar Solaria' });

  const bazaarStall4 = createDesertBazaarStallMesh(0xb91c1c, 0xfde047);
  bazaarStall4.position.set(264, solariaBaseY, -285);
  bazaarStall4.rotation.y = Math.PI;
  scene.add(bazaarStall4);
  colliders.push({ type: 'box', minX: 262, maxX: 266, minZ: -286, maxZ: -284, label: 'Kios Baju Zirah Gurun' });

  // 7. Kemah-Kemah Sutra Bazaar
  const desertTent1 = createDesertTentMesh(0x991b1b);
  desertTent1.position.set(278, solariaBaseY, -275);
  desertTent1.rotation.y = 0;
  scene.add(desertTent1);
  colliders.push({ type: 'circle', x: 278, z: -275, radius: 2.8, label: 'Kemah Sutra Merah' });

  const desertTent2 = createDesertTentMesh(0x047857);
  desertTent2.position.set(278, solariaBaseY, -285);
  desertTent2.rotation.y = Math.PI;
  scene.add(desertTent2);
  colliders.push({ type: 'circle', x: 278, z: -285, radius: 2.8, label: 'Kemah Sutra Zamrud' });

  // Lampu Minyak Sepanjang Kerb Jalan
  const villageKerbLanterns = [
    { x: 242, z: -283 }, { x: 256, z: -283 }, { x: 270, z: -283 }, { x: 284, z: -283 },
    { x: 242, z: -277 }, { x: 256, z: -277 }, { x: 270, z: -277 }, { x: 284, z: -277 },
  ];
  villageKerbLanterns.forEach((vkl) => {
    const vLantern = createDesertOilLanternMesh();
    vLantern.position.set(vkl.x, solariaBaseY, vkl.z);
    scene.add(vLantern);
    colliders.push({ type: 'circle', x: vkl.x, z: vkl.z, radius: 0.4, label: 'Lampu Kerb Desa Gurun' });
  });

  // 8. Solaria Village NPCs
  const tariqGroup = createCustomNPCMesh('alchemist');
  const tariqPos: [number, number, number] = [246, solariaBaseY, -273.5];
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
  const aminaPos: [number, number, number] = [250, solariaBaseY, -284];
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

  const zahraGroup = createCustomNPCMesh('bard');
  const zahraPos: [number, number, number] = [278, solariaBaseY, -274];
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
  const sGuardPos: [number, number, number] = [236, solariaBaseY, -280];
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

  // Cacti in Solaria Dunes
  const desertCacti = [
    { x: 120, z: -250, s: 1.0 },
    { x: 180, z: -280, s: 1.2 },
    { x: 220, z: -240, s: 0.9 },
    { x: 255, z: -220, s: 1.1 },
    { x: 300, z: -220, s: 1.3 },
    { x: 370, z: -260, s: 1.0 },
    { x: 410, z: -230, s: 1.15 },
    { x: 170, z: -320, s: 0.85 },
    { x: 240, z: -340, s: 1.05 },
    { x: 320, z: -330, s: 1.1 },
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

  // ==========================================
  // 5D. THE GREAT SOLARIA SINKHOLE & REGIONAL MONUMENTS (45%)
  // ==========================================
  onProgress?.(45, 'Membangun Lembah Danau Titan, Kanyon Kuno, & Kaldera Naga...');
  await yieldIfBudgetExceeded(8);
  const sinkholeCenter = { x: -30, z: -220 };
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
  // ==========================================
  // 6. THUNDERPEAK LIGHTNING SPIRE & MAGE TOWER SANCTUARY (East Plains Hill: [110, -10])
  // Struktur Megah 3D Mage Tower, Interior Bertingkat, Kristal Petir Bersinar, dan Dewan Penyihir
  // ==========================================
  const mageTowerBaseY = 4.50;

  // A. Struktur Eksterior 3D "Mage Tower" Puncak Halilintar (Center: [110, -10])
  const mageTowerExterior = createMageTowerExteriorMesh();
  mageTowerExterior.position.set(110, mageTowerBaseY, -10);
  scene.add(mageTowerExterior);
  colliders.push({
    type: 'circle',
    x: 110,
    z: -10,
    radius: 7.2,
    label: 'Menara Eksterior Mage Tower Puncak Halilintar',
  });

  // B. Interior Bertingkat 3D Mage Tower (Underground Interior Cell: [110, -45, -10])
  const mageTowerInterior = createMageTowerInteriorMesh();
  mageTowerInterior.position.set(110, -45, -10);
  scene.add(mageTowerInterior);

  // Interior Wall Box Colliders
  colliders.push(
    { type: 'box', minX: 99, maxX: 121, minZ: -21, maxZ: -19, maxY: -10, label: 'Dinding Utara Interior Mage Tower' },
    { type: 'box', minX: 99, maxX: 101, minZ: -21, maxZ: 1, maxY: -10, label: 'Dinding Barat Interior Mage Tower' },
    { type: 'box', minX: 119, maxX: 121, minZ: -21, maxZ: 1, maxY: -10, label: 'Dinding Timur Interior Mage Tower' },
    { type: 'box', minX: 99, maxX: 107.5, minZ: -1, maxZ: 1, maxY: -10, label: 'Dinding Selatan Barat Interior Mage Tower' },
    { type: 'box', minX: 112.5, maxX: 121, minZ: -1, maxZ: 1, maxY: -10, label: 'Dinding Selatan Timur Interior Mage Tower' }
  );
  // Colliders Perabotan Lantai 1
  colliders.push(
    { type: 'box', minX: 106, maxX: 114, minZ: -19, maxZ: -17, maxY: -38, label: 'Lemari Kitab Purba Utara' },
    { type: 'box', minX: 101, maxX: 103, minZ: -13, maxZ: -7, maxY: -38, label: 'Lemari Kitab Purba Barat' },
    { type: 'box', minX: 117, maxX: 119, minZ: -13, maxZ: -7, maxY: -38, label: 'Lemari Kitab Purba Timur' }
  );
  // Colliders Perabotan Lantai 2
  colliders.push({
    type: 'box',
    minX: 107,
    maxX: 113,
    minZ: -12,
    maxZ: -8,
    minY: -39,
    maxY: -32,
    label: 'Meja Eksperimen Kristal Petir Alkimia',
  });
  // Colliders Perabotan Lantai 3
  colliders.push({
    type: 'circle',
    x: 110,
    z: -10,
    radius: 1.6,
    minY: -31,
    maxY: -15,
    label: 'Pilar Armillary Orrery Observatorium',
  });

  // C. Dewan Penyihir Mage Tower (Unique Mage NPCs):
  // 1. Grand Mage Eldrin
  const eldrinGroup = createGrandMageEldrinMesh();
  const eldrinPos: [number, number, number] = [110, -45, -12];
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
  const sorceressMayaPos: [number, number, number] = [106.5, -45, -8];
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

  // 3. Archmage Pyro
  const pyroGroup = createArchmagePyroMesh();
  const pyroPos: [number, number, number] = [110, -37.5, -8];
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
    { x: 121, z: -3, scale: 1.4 },
    { x: 99, z: -3, scale: 1.3 },
    { x: 121, z: -17, scale: 1.4 },
    { x: 99, z: -17, scale: 1.35 },
    { x: 110, z: 3, scale: 1.5 },
    { x: 110, z: -23, scale: 1.4 },
    { x: 93, z: -11, scale: 1.3 },
    { x: 127, z: -11, scale: 1.2 },
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
    { x: 90, z: -27 },
    { x: 130, z: 7 },
    { x: 95, z: 9 },
  ];
  secondarySpires.forEach((pos) => {
    const spire = createThunderSpireMesh();
    spire.scale.set(0.85, 0.95, 0.85);
    spire.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(spire);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Pilar Petir Melayang' });
  });

  // ==========================================
  // 8. DRAGONFANG CALDERA & INFERNO ARCHIPELAGO (South Across Ocean: [-40, 340])
  // Arena Kaldera Naga: Kawah Melingkar (Diameter ~45m), 4 Pilar Obsidian Naga, Fosil Naga, & Lahar Pijar
  // ==========================================
  const dragonArenaCenter = { x: -40, z: 340 };
  const dragonArenaBaseY = 2.50;

  // A. Monumental Dragon Fossil Skull & Ribcage (Placed at North Rim of Caldera)
  const dragonFossil = createDragonSkullBonesMesh();
  dragonFossil.position.set(dragonArenaCenter.x, dragonArenaBaseY, dragonArenaCenter.z - 13);
  scene.add(dragonFossil);
  colliders.push({
    type: 'box',
    minX: dragonArenaCenter.x - 5,
    maxX: dragonArenaCenter.x + 5,
    minZ: dragonArenaCenter.z - 19,
    maxZ: dragonArenaCenter.z - 7,
    label: 'Fosil Tengkorak Naga Purba',
  });

  // B. 4 Sharp Black Obsidian Dragon Pillars (Pilar Naga Batas Arena Kawah pada Radius 42 unit)
  const dragonPillars = [
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z - 42, label: 'Pilar Naga Obsidian Utara' },
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z + 42, label: 'Pilar Naga Obsidian Selatan' },
    { x: dragonArenaCenter.x + 42, z: dragonArenaCenter.z, label: 'Pilar Naga Obsidian Timur' },
    { x: dragonArenaCenter.x - 42, z: dragonArenaCenter.z, label: 'Pilar Naga Obsidian Barat' },
  ];
  dragonPillars.forEach((dp) => {
    const pY = getTerrainHeight(dp.x, dp.z);
    const pillarGroup = new THREE.Group();

    // Sharp jagged obsidian column
    const colGeo = new THREE.CylinderGeometry(0.85, 2.2, 12.0, 6);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.25,
      metalness: 0.85,
      flatShading: true,
    });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.y = 6.0;
    pillarGroup.add(colMesh);

    // Flaming volcanic basin atop pillar
    const basinGeo = new THREE.ConeGeometry(1.8, 1.4, 6);
    basinGeo.rotateX(Math.PI);
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.7,
    });
    const basinMesh = new THREE.Mesh(basinGeo, basinMat);
    basinMesh.position.y = 12.0;
    pillarGroup.add(basinMesh);

    // Blazing fire flame atop pillar
    const flameGeo = new THREE.ConeGeometry(1.1, 2.8, 6);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      emissive: 0xff1744,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.y = 13.4;
    pillarGroup.add(flameMesh);

    // Local torch light
    const torchLight = new THREE.PointLight(0xff5722, 2.4, 22);
    torchLight.position.y = 13.6;
    pillarGroup.add(torchLight);

    pillarGroup.position.set(dp.x, pY, dp.z);
    scene.add(pillarGroup);
    colliders.push({ type: 'circle', x: dp.x, z: dp.z, radius: 2.2, label: dp.label });
  });

  // B2. Kolam Lahar Mendidih Melingkari Lantai Kawah (Radius 36 - 44 unit)
  const lavaRingGeo = new THREE.RingGeometry(36.0, 44.0, 48);
  lavaRingGeo.rotateX(-Math.PI / 2);
  const lavaRingMat = new THREE.MeshStandardMaterial({
    color: 0xff3700,
    emissive: 0xff2200,
    emissiveIntensity: 1.6,
    roughness: 0.25,
    transparent: true,
    opacity: 0.85,
  });
  const lavaRingMesh = new THREE.Mesh(lavaRingGeo, lavaRingMat);
  lavaRingMesh.position.set(dragonArenaCenter.x, dragonArenaBaseY + 0.04, dragonArenaCenter.z);
  scene.add(lavaRingMesh);

  // B3. Tebing Basalt Curam Melingkar Setinggi 6 unit di Radius 45 unit
  for (let b = 0; b < 16; b++) {
    const angle = (b / 16) * Math.PI * 2;
    const bx = dragonArenaCenter.x + Math.cos(angle) * 45.5;
    const bz = dragonArenaCenter.z + Math.sin(angle) * 45.5;
    const by = getTerrainHeight(bx, bz);
    const cliff = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 6.0, 4.0),
      new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.9,
        flatShading: true,
      })
    );
    cliff.position.set(bx, by + 3.0, bz);
    cliff.rotation.y = -angle + Math.PI / 2;
    scene.add(cliff);
    // Tanpa invisible collider melingkar agar pemain bebas menuruni kontur lereng kawah kaldera
  }

  // C. Retakan Tanah Berlapis Lava Merah Menyala di Seputar Kaldera
  const lavaCrackCoords = [
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z - 14, r: 4.8 },
    { x: dragonArenaCenter.x + 14, z: dragonArenaCenter.z - 8, r: 4.5 },
    { x: dragonArenaCenter.x - 14, z: dragonArenaCenter.z - 8, r: 4.5 },
    { x: dragonArenaCenter.x + 17, z: dragonArenaCenter.z + 14, r: 4.6 },
    { x: dragonArenaCenter.x - 17, z: dragonArenaCenter.z + 14, r: 4.6 },
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z + 20, r: 5.0 },
    { x: dragonArenaCenter.x + 15, z: dragonArenaCenter.z + 5, r: 5.5 },
    { x: dragonArenaCenter.x - 15, z: dragonArenaCenter.z + 5, r: 4.6 },
  ];
  lavaCrackCoords.forEach((lc) => {
    const crack = createLavaCrackMesh(lc.r);
    const cy = getTerrainHeight(lc.x, lc.z);
    crack.position.set(lc.x, cy + 0.02, lc.z);
    scene.add(crack);
  });

  // D. Bebatuan Vulkanik Hitam Berurat Magma (Jagged Volcanic Basalt Rocks)
  const basaltRockCoords = [
    { x: dragonArenaCenter.x - 15, z: dragonArenaCenter.z - 10, s: 1.6 },
    { x: dragonArenaCenter.x + 15, z: dragonArenaCenter.z - 12, s: 1.5 },
    { x: dragonArenaCenter.x - 19, z: dragonArenaCenter.z + 12, s: 1.7 },
    { x: dragonArenaCenter.x + 19, z: dragonArenaCenter.z + 15, s: 1.8 },
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z + 28, s: 1.6 },
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z - 28, s: 1.5 },
    { x: dragonArenaCenter.x + 24, z: dragonArenaCenter.z + 5, s: 1.8 },
    { x: dragonArenaCenter.x - 24, z: dragonArenaCenter.z - 4, s: 1.4 },
    { x: dragonArenaCenter.x + 20, z: dragonArenaCenter.z + 20, s: 1.9 },
  ];
  basaltRockCoords.forEach((br) => {
    const rock = createVolcanicBasaltRockMesh(br.s);
    const ry = getTerrainHeight(br.x, br.z);
    rock.position.set(br.x, ry, br.z);
    scene.add(rock);
    colliders.push({ type: 'circle', x: br.x, z: br.z, radius: 1.3 * br.s, label: 'Batu Vulkanik Basalt' });
  });

  // E. Surrounding Volcanic Horn Arches
  for (const hPos of [
    { x: dragonArenaCenter.x - 10, z: dragonArenaCenter.z - 15 },
    { x: dragonArenaCenter.x + 10, z: dragonArenaCenter.z - 15 },
    { x: dragonArenaCenter.x, z: dragonArenaCenter.z + 16 },
  ]) {
    const hornGroup = new THREE.Group();
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 6.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, flatShading: true })
    );
    horn.rotation.z = 0.35;
    horn.position.y = 3.0;
    hornGroup.add(horn);
    hornGroup.position.set(hPos.x, getTerrainHeight(hPos.x, hPos.z), hPos.z);
    scene.add(hornGroup);
    colliders.push({ type: 'circle', x: hPos.x, z: hPos.z, radius: 1.0, label: 'Tanduk Karang Naga' });
  }

  // F. Dragon Caldera Center Beacon Light
  const dragonCalderaLight = new THREE.PointLight(0xff3d00, 3.2, 45);
  dragonCalderaLight.position.set(dragonArenaCenter.x, 7.0, dragonArenaCenter.z);
  scene.add(dragonCalderaLight);

  // ==========================================
  // 9. TREASURE CHESTS (Across all active continent zones)
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
    { id: 'chest_dragoncaldera', pos: [-40, 2.5, 340] as [number, number, number] }, // Dragon Caldera Hoard
    { id: 'chest_astraea', pos: [-220, 2.0, -220] as [number, number, number] }, // Astraea Imperial Vault
    { id: 'chest_harbor_galleon', pos: [-15.5, 0, 200] as [number, number, number] }, // Harbor Galleon Stash
    { id: 'chest_bridge', pos: [15, 1.35, 110] as [number, number, number] }, // South River Suspension Bridge Cache
    { id: 'chest_sandworm_cache', pos: [-30, 0.5, -220] as [number, number, number] }, // Ancient Sandworm Sinkhole Cache
  ];

  const chests: WorldObjects['chests'] = [];
  chestData.forEach((cd) => {
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
  });

  // ==========================================
  // 10. MATA AIR SUCI & TAMAN BUNGA ELDORIA (Plains Spring: [-144, -270])
  // Ganti bekas wilayah raksasa lama: kolam air tawar melingkar kecil, tepian batu kali halus berlumut,
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

  lilyOffsets.forEach((l) => {
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
  });

  // D. Hamparan Rumpun Bunga Liar Warna-Warni (Lavender Ungu & Kamomil Putih)
  const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.6 });
  const chamomileMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });

  for (let f = 0; f < 36; f++) {
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

  willowTreePositions.forEach(([wx, wz], widx) => {
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
  });

  // F. Cahaya Suci Lembut Mata Air (Soft Cyan Sacred Light)
  const springLight = new THREE.PointLight(0x38bdf8, 1.8, 30);
  springLight.position.set(springCenter.x, 2.5, springCenter.z);
  springGroup.add(springLight);

  scene.add(springGroup);

  // ==========================================
  // 10B. REGIONAL LANDMARK: LEMBAH BATU LUMUT (X: 465, Z: 35)
  // Formasi bongkahan granit alami berlumut, pohon rindang teduh, semak bunga, air terjun timur
  // ==========================================
  const mossValleyGroup = new THREE.Group();
  mossValleyGroup.name = 'Region_MossValley';

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
    const angle = (m / 32) * Math.PI * 2 + ((m * 17) % 7) * 0.15;
    const r = 8.0 + ((m * 19) % 24);
    const mx = 465 + Math.cos(angle) * r;
    const mz = 35 + Math.sin(angle) * r;
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
    const angle = (tr / 12) * Math.PI * 2 + 0.3;
    const dist = 14 + (tr % 3) * 6;
    const tx = 465 + Math.cos(angle) * dist;
    const tz = 35 + Math.sin(angle) * dist;
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
    const sAngle = (s / 18) * Math.PI * 2 + 0.5;
    const sDist = 6 + (s % 5) * 4.5;
    const sx = 465 + Math.cos(sAngle) * sDist;
    const sz = 35 + Math.sin(sAngle) * sDist;
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
  const waterfallCliffY = getTerrainHeight(485, 35);
  const waterfallBasinY = getTerrainHeight(470, 35);
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
  waterfallMesh.position.set(476, (waterfallCliffY + waterfallBasinY) / 2, 35);
  waterfallMesh.rotation.y = -Math.PI / 2;
  mossValleyGroup.add(waterfallMesh);

  const basinPoolGeo = new THREE.CircleGeometry(6.5, 24);
  basinPoolGeo.rotateX(-Math.PI / 2);
  const basinPool = new THREE.Mesh(basinPoolGeo, waterfallMat);
  basinPool.position.set(470, waterfallBasinY + 0.1, 35);
  mossValleyGroup.add(basinPool);

  scene.add(mossValleyGroup);

  // ==========================================
  // 10C. REGIONAL LANDMARK: HUTAN KABUT ELDORIA (X: 335, Z: -140)
  // 150+ pohon pinus/oak lebat via InstancedMesh & lapisan kabut rendah
  // ==========================================
  const mistForestTreesData: { x: number; y: number; z: number; scale: number; rotationY: number }[] = [];
  for (let t = 0; t < 160; t++) {
    if (t % 50 === 0) {
      await yieldIfBudgetExceeded(8);
    }
    const angle = (t / 160) * Math.PI * 2 * 11;
    const r = Math.sqrt((t + 1) / 160) * 58;
    const tx = 335 + Math.cos(angle) * r;
    const tz = -140 + Math.sin(angle) * r;
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

  const mistPlanesGroup = new THREE.Group();
  for (let mp = 0; mp < 12; mp++) {
    const mistAngle = (mp / 12) * Math.PI * 2;
    const mistR = 12 + (mp % 4) * 11;
    const mx = 335 + Math.cos(mistAngle) * mistR;
    const mz = -140 + Math.sin(mistAngle) * mistR;
    const my = getTerrainHeight(mx, mz) + 0.85;

    const mist = createSwampMistPlaneMesh(28, 28);
    mist.position.set(mx, my, mz);
    mist.rotation.y = mistAngle;
    mistPlanesGroup.add(mist);
  }
  scene.add(mistPlanesGroup);

  // ==========================================
  // 10D. REGIONAL LANDMARK: PUING KASTIL TERBENGKALAI (X: 225, Z: -35)
  // Tembok benteng kastil masa lalu, menara patah berlumut, dan pilar batu roboh
  // ==========================================
  const castleRuinsGroup = new THREE.Group();
  castleRuinsGroup.name = 'Region_CastleRuins';
  const ruinsBaseY = getTerrainHeight(225, -35);

  const ruinsStoneMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const ruinedWallCoords = [
    { x: 215, z: -35, length: 14, rotY: 0 },
    { x: 235, z: -35, length: 12, rotY: 0 },
    { x: 225, z: -45, length: 18, rotY: Math.PI / 2 },
    { x: 225, z: -25, length: 12, rotY: Math.PI / 2 },
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
  brokenTower.position.set(214, ruinsBaseY + 2.75, -45);
  brokenTower.castShadow = true;
  castleRuinsGroup.add(brokenTower);
  colliders.push({ type: 'circle', x: 214, z: -45, radius: 2.8, label: 'Menara Patah Kastil' });

  const fallenPillarCoords = [
    { x: 222, z: -32, rotZ: 1.35, rotY: 0.4 },
    { x: 228, z: -38, rotZ: 1.45, rotY: -0.6 },
    { x: 220, z: -40, rotZ: 0.15, rotY: 0.2 },
    { x: 230, z: -30, rotZ: 0.18, rotY: -0.3 },
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
  // 11. REGIONAL CHECKPOINT & WAYPOINT TELEPORTATION MONUMENTS (48%)
  // ==========================================
  onProgress?.(48, 'Menempatkan NPC, Pedagang, & World Boss...');
  await yieldIfBudgetExceeded(8);

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
      pos: [-35, 135],
    },
    {
      id: 'wp_harbor',
      name: 'Sanctuary Coastal Harbor',
      nameId: 'Dermaga & Pelabuhan Sanctuary',
      pos: [-20, 185],
    },
    {
      id: 'wp_sacred_spring',
      name: 'Sacred Spring & Eldoria Flower Gardens',
      nameId: 'Mata Air Suci & Taman Bunga Eldoria',
      pos: [-144, -270],
    },
    {
      id: 'wp_titan',
      name: 'Ancient Titan Lake Valley',
      nameId: 'Lembah Danau Titan Kuno',
      pos: [-310, -480],
    },
    {
      id: 'wp_astraea',
      name: 'Grand Imperial Capital Astraea',
      nameId: 'Ibukota Kerajaan Emas Astraea',
      pos: [-250, -240],
    },
    {
      id: 'wp_valkragor',
      name: 'Val-Kragor Fortress Plaza',
      nameId: 'Alun-Alun Benteng Val-Kragor',
      pos: [310, 115],
    },
    {
      id: 'wp_thunderpeak',
      name: 'Thunderpeak Spire & Mage Tower',
      nameId: 'Mage Tower Puncak Halilintar',
      pos: [110, -10],
    },
    {
      id: 'wp_solaria_village',
      name: 'Solaria Desert Village & Bazaar',
      nameId: 'Desa Bazaar Gurun Solaria',
      pos: [250, -280],
    },
    {
      id: 'wp_solaria_palace',
      name: 'Solaria Grand Sultan Palace',
      nameId: 'Istana Sultan Malik',
      pos: [430, -460],
    },
    {
      id: 'wp_solaria',
      name: 'Solaria Golden Desert Pyramid',
      nameId: 'Piramida Emas Solaria',
      pos: [30, -350],
    },
    {
      id: 'wp_solaria_oasis',
      name: 'Solaria Hidden Oasis',
      nameId: 'Oase Solaria',
      pos: [85, -230],
    },
    {
      id: 'wp_dragoncaldera',
      name: 'Primal Dragonfang Caldera',
      nameId: 'Kaldera Sarang Naga Purba',
      pos: [-40, 340],
    },
    {
      id: 'wp_boss_crater',
      name: 'Ancient Colosseum Ruins (Titan Kuno)',
      nameId: 'Kawah Cacat World Boss (Lv. 10)',
      pos: [235, -380],
    },
    {
      id: 'wp_sandworm',
      name: 'The Great Solaria Sinkhole',
      nameId: 'Sarang Cacing Purba Gurun',
      pos: [-30, -220],
    },
    {
      id: 'wp_canyon',
      name: 'Ancient Canyon',
      nameId: 'Kanyon Kuno',
      pos: [160, -540],
    },
    {
      id: 'wp_mist_forest',
      name: 'Eldoria Mist Forest',
      nameId: 'Hutan Kabut Eldoria',
      pos: [380, -160],
    },
    {
      id: 'wp_abandoned_castle',
      name: 'Abandoned Castle Ruins',
      nameId: 'Puing Kastil Terbengkalai',
      pos: [220, -30],
    },
    {
      id: 'wp_moss_valley',
      name: 'Moss Rock Valley',
      nameId: 'Lembah Batu Lumut',
      pos: [465, 35],
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
