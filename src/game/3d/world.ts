import * as THREE from 'three';
import { getProceduralContinentHeight, getContinentBiomeSample } from '../mapSampler';
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
  createDesertPavedRoadMesh,
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
} from './models';

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
  getTerrainHeight: (x: number, z: number) => number;
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

  // 2.5x - 3x Expanded World Terrain specifications (Span: X[-680..820], Z[-550..550])
  const terrainWidth = 1500;
  const terrainDepth = 1100;
  const segmentsX = 250;
  const segmentsZ = 200;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segmentsX, segmentsZ);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(70, 0, 0); // Centered at x=70 so all vast expanded biomes fit seamlessly

  // Unified procedural height function from mapSampler
  const getProceduralHeight = (x: number, z: number): number => {
    return getProceduralContinentHeight(x, z);
  };

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;

  // Vertex colors generated seamlessly from unified mapSampler
  const colors: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getProceduralHeight(vx, vz);
    posAttr.setY(i, vy);

    const sample = getContinentBiomeSample(vx, vz);
    colors.push(sample.color[0] / 255, sample.color[1] / 255, sample.color[2] / 255);
  }

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
  const minTerrainX = -680; // 70 - 750
  const maxTerrainX = 820;  // 70 + 750
  const minTerrainZ = -550;
  const maxTerrainZ = 550;
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

  const getTerrainHeight = (x: number, z: number, forVisualMesh = false): number => {
    if (forVisualMesh) {
      return getProceduralHeight(x, z);
    }

    // 1. Suspension bridge walkable deck corridor (x: 62..88, centered straight at z = -16)
    if (Math.abs(z - -16) <= 2.2 && x >= 62 && x <= 88) {
      const bridgeT = (x - 62) / 26;
      const sag = Math.sin(bridgeT * Math.PI) * 0.70;
      return 2.0 - sag;
    }

    // 2. Coastal Wooden Harbor (Seamless Beach Connection, Extended Main Pier, Symmetrical Wings & Pier Head)
    // 2a. Beach shoreline boardwalk apron (z: 14.0..18.0)
    if (Math.abs(x) <= 3.5 && z >= 14.0 && z < 18.0) {
      const t = (z - 14.0) / 4.0;
      return 0.25 - t * 0.10; // Smooth 0.25 -> 0.15 transition onto ramp foot
    }
    // 2b. Wooden Beach Ramp & Short Stairs (z: 17.5..21.5, rises smoothly 0.15 -> 1.85)
    if (Math.abs(x) <= 2.6 && z >= 17.5 && z < 21.5) {
      const t = (z - 17.5) / 4.0;
      return 0.15 + t * 1.70;
    }
    // 2c. Extended Main Straight Pier (z: 21.5..69.5, |x| <= 2.6)
    // 2d. Seaward Pier Head Platform (z: 69.5..75.5, |x| <= 5.2)
    // 2e. Inner Symmetrical Berthing Wings (z: 34.8..39.2, |x| <= 15.0)
    // 2f. Outer Symmetrical Berthing Wings (z: 50.8..55.2, |x| <= 15.0)
    // 2g. Boarding Gangways to Ships (|x|: 14.4..18.5, z: 35.8..38.2)
    if (
      (Math.abs(x) <= 2.6 && z >= 21.5 && z <= 69.5) ||
      (Math.abs(x) <= 5.2 && z >= 69.5 && z <= 75.5) ||
      (Math.abs(z - 37.0) <= 2.2 && Math.abs(x) <= 15.0) ||
      (Math.abs(z - 53.0) <= 2.2 && Math.abs(x) <= 15.0) ||
      (Math.abs(z - 37.0) <= 1.2 && Math.abs(x) >= 14.4 && Math.abs(x) <= 18.5)
    ) {
      return 1.85; // Solid continuous wooden pier deck
    }

    // 3. Relocated Fortress Val-Kragor Solid Courtyard (Center [188, -16], radius 34 at y = 3.2)
    if (Math.hypot(x - 188, z - -16) <= 34) {
      return 3.2;
    }

    // 4. Imperial Capital Astraea Elevated Plateau & Grand Esplanade (y = 6.0)
    if (x >= 148 && x <= 212 && z >= -288 && z <= -232) return 6.0;
    if (x >= 174 && x <= 186 && z >= -340 && z <= -300) return 4.6; // Frozen Chasm ice bridge

    // 4b. Solaria Desert Village Bazaar & Grand Palace (Taj Mahal) Courtyard Plateau (y = 2.4)
    if (Math.hypot(x - -305, z - 350) <= 45) return 2.4;
    if (Math.hypot(x - -415, z - 350) <= 35) return 2.4;
    if (x >= -445 && x <= -260 && Math.abs(z - 350) <= 42) return 2.4;

    // 5. Exact rendered polygon surface
    return getMeshSurfaceHeight(x, z);
  };

  // ==========================================
  // 1. VAST AZURE OCEAN WATER PLANE
  // ==========================================
  const oceanGeo = new THREE.PlaneGeometry(1400, 700, 32, 32);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0096c7,
    roughness: 0.1,
    metalness: 0.45,
    transparent: true,
    opacity: 0.82,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.set(70, -0.25, 270);
  scene.add(oceanMesh);

  // ==========================================
  // 1b. EXTENDED CONTINUOUS COASTAL HARBOR (Sea Shoreline at Z >= 17.5)
  // Dermaga Kayu Utama Diperpanjang Lurus ke Arah Laut Terbuka (Z: 14.0..75.5)
  // Sambungan padat dari pangkal tangga hingga anjungan laut lepas TANPA CELAH air di tengah jalan!
  // Dua pasang cabang bersandar kapal yang simetris, presisi, dan kokoh di sisi kiri dan kanan.
  // ==========================================
  const dockY = -0.375; // Aligns top of 2.1m deck + 0.125m plank exactly at y = 1.85

  // 0. Shoreline Boardwalk Apron (Z: 14.0..18.0, menghubungkan jalan setapak tanah desa ke pangkal tangga)
  const shorelineBoardwalk = createDockShorelineBoardwalkMesh(5.6, 4.0);
  shorelineBoardwalk.position.set(0, 0.22, 14.0);
  scene.add(shorelineBoardwalk);

  // 1. Wooden Beach Ramp & Short Stairs (Z: 17.5..21.5, menanjak mulus 0.15 -> 1.85)
  const beachRamp = createDockStairRampMesh(4.8, 4.0, 1.8);
  beachRamp.position.set(0, 0.05, 17.5);
  scene.add(beachRamp);

  // 2. Extended Main Straight Pier (Dermaga Utama Lebar 4.8m Membentang Lurus ke Laut Lepas)
  // Section 1: Pangkal tangga ke cabang bersandar dalam (X: 0, Z: 21.5..37.5, panjang 16m)
  const pierMain1 = createPierDockMesh({ length: 16.0, width: 4.8, pileDepth: 7.0, hasMooringBollards: true });
  pierMain1.position.set(0, dockY, 21.5);
  scene.add(pierMain1);

  // Section 2: Cabang dalam ke cabang luar (X: 0, Z: 37.5..53.5, panjang 16m)
  const pierMain2 = createPierDockMesh({ length: 16.0, width: 4.8, pileDepth: 7.5, hasMooringBollards: true });
  pierMain2.position.set(0, dockY, 37.5);
  scene.add(pierMain2);

  // Section 3: Jalur laut lepas ke anjungan (X: 0, Z: 53.5..69.5, panjang 16m)
  const pierMain3 = createPierDockMesh({ length: 16.0, width: 4.8, pileDepth: 8.0, hasMooringBollards: true });
  pierMain3.position.set(0, dockY, 53.5);
  scene.add(pierMain3);

  // Section 4: Anjungan Ujung Dermaga Laut Lepas (Seaward Pier Head Platform: X: -5.0..5.0, Z: 69.5..75.5, lebar 10m)
  const pierHeadPlatform = createPierDockMesh({ length: 6.0, width: 10.0, pileDepth: 8.5, hasLantern: true, lanternSide: 'both', hasMooringBollards: true });
  pierHeadPlatform.position.set(0, dockY, 69.5);
  scene.add(pierHeadPlatform);

  // 3. Two Symmetrical Pairs of Berthing Wings (Dua Pasang Cabang Tempat Bersandar Kapal Simetris)
  // Branch 1: Inner Symmetrical Berthing Wings (Z = 37.0, Lebar 4.0m, Panjang 13.0m)
  // Sayap Barat 1 (Kiri: menempel padat dari X = -2.4 menjulur ke X = -15.4 tanpa celah!)
  const wingWest1 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.2, hasLantern: true, lanternSide: 'left', hasMooringBollards: true });
  wingWest1.position.set(-2.4, dockY, 37.0);
  wingWest1.rotation.y = Math.PI * 1.5;
  scene.add(wingWest1);

  // Sayap Timur 1 (Kanan: menempel padat dari X = 2.4 menjulur ke X = 15.4 tanpa celah!)
  const wingEast1 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.2, hasLantern: true, lanternSide: 'right', hasMooringBollards: true });
  wingEast1.position.set(2.4, dockY, 37.0);
  wingEast1.rotation.y = Math.PI / 2;
  scene.add(wingEast1);

  // Branch 2: Outer Symmetrical Berthing Wings (Z = 53.0, Lebar 4.0m, Panjang 13.0m)
  // Sayap Barat 2 (Kiri luar: menempel padat dari X = -2.4 menjulur ke X = -15.4)
  const wingWest2 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.8, hasLantern: true, lanternSide: 'left', hasMooringBollards: true });
  wingWest2.position.set(-2.4, dockY, 53.0);
  wingWest2.rotation.y = Math.PI * 1.5;
  scene.add(wingWest2);

  // Sayap Timur 2 (Kanan luar: menempel padat dari X = 2.4 menjulur ke X = 15.4)
  const wingEast2 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.8, hasLantern: true, lanternSide: 'right', hasMooringBollards: true });
  wingEast2.position.set(2.4, dockY, 53.0);
  wingEast2.rotation.y = Math.PI / 2;
  scene.add(wingEast2);

  // 4. Moored Main Ships & Boarding Gangways
  // Grand Merchant Galleon 1 (Bertambat rapi di samping Sayap Timur 1, X: 19.5, Z: 37.0)
  const galleon1 = createMerchantGalleonMesh();
  galleon1.position.set(19.5, -0.25, 37.0);
  galleon1.rotation.y = 0;
  scene.add(galleon1);

  // Viking Shielded Warship 2 (Bertambat rapi di samping Sayap Barat 1, X: -19.5, Z: 37.0)
  const warship2 = createVikingWarshipMesh();
  warship2.position.set(-19.5, -0.25, 37.0);
  warship2.rotation.y = 0;
  scene.add(warship2);

  // Perahu Nelayan Pak Joko (Bertambat rapi di ujung anjungan dermaga utama, X: 0, Z: 77.0)
  const rowboatJoko = createRowboatMesh();
  rowboatJoko.position.set(0, -0.25, 77.0);
  rowboatJoko.rotation.y = Math.PI / 2;
  scene.add(rowboatJoko);

  // Timber boarding gangway bridging East Wing 1 to Galleon 1
  const gangwayMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const gangwayEast = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayEast.position.set(16.9, 1.86, 37.0);
  scene.add(gangwayEast);

  // Timber boarding gangway bridging West Wing 1 to Warship 2
  const gangwayWest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayWest.position.set(-16.9, 1.86, 37.0);
  scene.add(gangwayWest);

  // ==========================================
  // 2. ORGANIZED SANCTUARY VILLAGE & FACILITIES
  // Symmetrical street grid on flat dry mainland (y = 0.25, z: -32..15).
  // Zero flooding, zero overlaps with roads or props!
  // ==========================================
  const colliders: WorldCollider[] = [];
  const npcs: WorldNPC[] = [];
  const villageMainlandY = 0.25;

  // 2.0 Moored Ship Hull Solid Boundaries (Karakter bebas menjelajah & berjalan di atas dermaga kayu tanpa terhalang tembok gaib!)
  colliders.push(
    // Ship Hull Colliders (Outer water boundaries)
    { type: 'box', minX: 17.5, maxX: 22.5, minZ: 30, maxZ: 44, label: 'Lambung Kapal Dagang Emas 1' },
    { type: 'box', minX: -22.5, maxX: -17.5, minZ: 30, maxZ: 44, label: 'Lambung Kapal Perang Bershield' }
  );

  // 2.1 Northern Village Gateway Arch (Start of Royal Avenue at Z = -24)
  const villageArch = createVillageArchMesh('GERBANG ELDORIA');
  const archZ = -24;
  villageArch.position.set(0, villageMainlandY, archZ);
  scene.add(villageArch);
  colliders.push(
    { type: 'circle', x: -3.5, z: archZ, radius: 0.6, label: 'Gerbang Pilar Kiri' },
    { type: 'circle', x: 3.5, z: archZ, radius: 0.6, label: 'Gerbang Pilar Kanan' }
  );

  // 2.2 Sanctuary Grand Fountain in Central Town Plaza (X: 0, Z: -4)
  // Perfectly centered on plaza, leaving spawn point (0, 4) open and unobstructed
  const fountainZ = -4;
  const waterGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.4, 16);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x00b4d8,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, villageMainlandY + 0.15, fountainZ);
  scene.add(waterMesh);

  const fountainRim = new THREE.Mesh(
    new THREE.TorusGeometry(3.7, 0.35, 8, 20),
    new THREE.MeshLambertMaterial({ color: 0xb0bec5, flatShading: true })
  );
  fountainRim.rotation.x = Math.PI / 2;
  fountainRim.position.set(0, villageMainlandY + 0.3, fountainZ);
  scene.add(fountainRim);

  const spoutMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 1.6, 8), spoutMat);
  spout.position.set(0, villageMainlandY + 0.8, fountainZ);
  scene.add(spout);
  colliders.push({ type: 'circle', x: 0, z: fountainZ, radius: 3.9, label: 'Air Mancur Sanctuary' });

  // 2.3 Balai Tetua Vaelen & Pusat Komunitas (North-West Plaza: X: -13, Z: -14)
  const house1 = createVillageHouseMesh();
  const h1Pos = { x: -13, z: -14 };
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

  // 2.4 Village Tavern & Resting Inn: "Penginapan Eldoria" (North-East Plaza: X: 13, Z: -14)
  const tavern = createTavernMesh();
  const tavernPos = { x: 13, z: -14 };
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

  // 2.5 Master Torvald's Blacksmith Forge (West Commercial Avenue: X: -13, Z: 3)
  const blacksmith = createBlacksmithMesh();
  const forgePos = { x: -13, z: 3 };
  blacksmith.position.set(forgePos.x, villageMainlandY, forgePos.z);
  blacksmith.rotation.y = Math.PI / 2; // Facing East towards the main promenade
  scene.add(blacksmith);
  colliders.push({
    type: 'box',
    minX: forgePos.x - 3.5,
    maxX: forgePos.x + 3.5,
    minZ: forgePos.z - 2.8,
    maxZ: forgePos.z + 2.8,
    label: 'Bengkel Pandai Besi',
  });

  // 2.6 Anya's Alchemy & Potion Stall (East Commercial Avenue: X: 13, Z: -1)
  const anyaStall = createMarketStallMesh(0x15803d);
  const anyaPos = { x: 13, z: -1 };
  anyaStall.position.set(anyaPos.x, villageMainlandY, anyaPos.z);
  anyaStall.rotation.y = -Math.PI / 2; // Facing West towards the main promenade
  scene.add(anyaStall);
  colliders.push({
    type: 'box',
    minX: anyaPos.x - 1.6,
    maxX: anyaPos.x + 1.6,
    minZ: anyaPos.z - 1.1,
    maxZ: anyaPos.z + 1.1,
    label: 'Kios Alkemis Anya',
  });

  // 2.7 Maya's Armor & Weapon Outfitter Stall (East Commercial Avenue: X: 13, Z: 7)
  const marketStall2 = createArmorStallMesh(0x1e3a8a);
  const m2Pos = { x: 13, z: 7 };
  marketStall2.position.set(m2Pos.x, villageMainlandY, m2Pos.z);
  marketStall2.rotation.y = -Math.PI / 2; // Facing West towards the main promenade
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
  // Perfectly aligned, spacious grid on dry elevated ground (Zero flooding!)
  // ==========================================
  // West Residential Street (along X = -24, facing East towards street)
  const house2 = createVillageHouseMesh();
  const h2Pos = { x: -24, z: -14 };
  house2.position.set(h2Pos.x, villageMainlandY, h2Pos.z);
  house2.rotation.y = 0;
  scene.add(house2);
  colliders.push({
    type: 'box',
    minX: h2Pos.x - 2.5, maxX: h2Pos.x + 2.5, minZ: h2Pos.z - 2.5, maxZ: h2Pos.z + 2.5,
    label: 'Rumah Pengrajin Barat',
  });

  const house6 = createVillageHouseMesh();
  const h6Pos = { x: -24, z: -2 };
  house6.position.set(h6Pos.x, villageMainlandY, h6Pos.z);
  house6.rotation.y = 0;
  scene.add(house6);
  colliders.push({
    type: 'box',
    minX: h6Pos.x - 2.5, maxX: h6Pos.x + 2.5, minZ: h6Pos.z - 2.5, maxZ: h6Pos.z + 2.5,
    label: 'Rumah Kebun Apel Barat',
  });

  const house7 = createVillageHouseMesh();
  const h7Pos = { x: -24, z: 10 };
  house7.position.set(h7Pos.x, villageMainlandY, h7Pos.z);
  house7.rotation.y = 0;
  scene.add(house7);
  colliders.push({
    type: 'box',
    minX: h7Pos.x - 2.5, maxX: h7Pos.x + 2.5, minZ: h7Pos.z - 2.5, maxZ: h7Pos.z + 2.5,
    label: 'Pondok Herbalis Barat',
  });

  // East Residential Street (along X = 24, facing West towards street)
  const house3 = createVillageHouseMesh();
  const h3Pos = { x: 24, z: -14 };
  house3.position.set(h3Pos.x, villageMainlandY, h3Pos.z);
  house3.rotation.y = Math.PI;
  scene.add(house3);
  colliders.push({
    type: 'box',
    minX: h3Pos.x - 2.5, maxX: h3Pos.x + 2.5, minZ: h3Pos.z - 2.5, maxZ: h3Pos.z + 2.5,
    label: 'Rumah Petani Lembah Timur',
  });

  const house4 = createVillageHouseMesh();
  const h4Pos = { x: 24, z: -2 };
  house4.position.set(h4Pos.x, villageMainlandY, h4Pos.z);
  house4.rotation.y = Math.PI;
  scene.add(house4);
  colliders.push({
    type: 'box',
    minX: h4Pos.x - 2.5, maxX: h4Pos.x + 2.5, minZ: h4Pos.z - 2.5, maxZ: h4Pos.z + 2.5,
    label: 'Rumah Padang Rumput Timur',
  });

  const house5 = createVillageHouseMesh();
  const h5Pos = { x: 24, z: 10 };
  house5.position.set(h5Pos.x, villageMainlandY, h5Pos.z);
  house5.rotation.y = Math.PI;
  scene.add(house5);
  colliders.push({
    type: 'box',
    minX: h5Pos.x - 2.5, maxX: h5Pos.x + 2.5, minZ: h5Pos.z - 2.5, maxZ: h5Pos.z + 2.5,
    label: 'Pondok Penjaga Padang Timur',
  });

  // Coastal Lookout Cottage (Situated safely on dry mainland at Z = 13, overlooking the harbor)
  const house8 = createVillageHouseMesh();
  const h8Pos = { x: -13, z: 13 };
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
    // North Promenade
    [-3.8, -20],
    [3.8, -20],
    [-3.8, -12],
    [3.8, -12],
    // Central Plaza Corners
    [-6.0, -4],
    [6.0, -4],
    [-6.0, 4],
    [6.0, 4],
    // South Promenade leading to Harbor
    [-3.8, 12],
    [3.8, 12],
    [-3.8, 18],
    [3.8, 18],
    // Shoreline Quay Boardwalk Entrances
    [-12.0, 19.5],
    [12.0, 19.5],
  ];
  const villageLampTransforms = lampPositions.map(([lx, lz]) => {
    colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Jalan' });
    return { x: lx, y: villageMainlandY, z: lz };
  });
  const villageLampsMesh = createInstancedStreetLamps(villageLampTransforms);
  scene.add(villageLampsMesh);

  // Village barrels placed neatly against walls in alleyways (Cleaned up: zero clutter)
  const barrelPositions = [
    [-16.5, 3],
    [16.5, -14],
    [15.5, -1],
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
  const elderPos: [number, number, number] = [-10.5, villageMainlandY, -10.5];
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
  const guardPos: [number, number, number] = [0, villageMainlandY, -22.5];
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
  const anyaNPCPos: [number, number, number] = [10.5, villageMainlandY, -1];
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
  const torvaldPos: [number, number, number] = [-9.5, villageMainlandY, 3];
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
  const bardPos: [number, number, number] = [10.5, villageMainlandY, -10.5];
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

  // NPC 6: Nelayan Pak Joko (Coastal Fisherman on extended seaward pier head platform)
  const jokoGroup = createCustomNPCMesh('fisherman');
  const jokoPos: [number, number, number] = [1.8, 1.85, 73.0]; // At seaward pier head looking out to open sea
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
  const kaelPos: [number, number, number] = [-8, villageMainlandY, 10];
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
  const mayaPos: [number, number, number] = [10.5, villageMainlandY, 7];
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
  // 2.8 SECOND VILLAGE: RELOCATED & EXPANDED DESA BENTENG VAL-KRAGOR
  // (Pusat Dataran Tinggi Timur: Center [188, -16], Courtyard X: 162..214, Z: -38..6 at y = 3.2)
  // Gerbang Utama diputar lurus menghadap Barat (Rotation Y = Math.PI * 1.5 / 270°).
  // Jarak dari ujung jembatan (X = 88) ke gerbang benteng (X = 162) adalah 74 meter:
  // Jembatan dan kabel 100% bebas dari tabrakan/penetrasi tembok atau bangunan!
  // Interior lengkap: Barak Prajurit, Bengkel Persenjataan Goran, Menara Panah, Tempat Latihan Pedang & Panahan, Api Unggun.
  // ==========================================
  const valKragorBaseY = 3.2;

  // A. Grand Fortress Gatehouse (West Entrance at X = 162, Z = -16)
  // Menghadap lurus ke BARAT (Rotation Y = 270° / Math.PI * 1.5) menyambut jalan raya berbatu dari jembatan
  const fortressGate = createFortressGatehouseMesh();
  fortressGate.position.set(162, valKragorBaseY, -16);
  fortressGate.rotation.y = Math.PI * 1.5;
  scene.add(fortressGate);
  colliders.push(
    { type: 'box', minX: 160, maxX: 164, minZ: -22.5, maxZ: -18.5, label: 'Menara Gerbang Val-Kragor Kiri' },
    { type: 'box', minX: 160, maxX: 164, minZ: -13.5, maxZ: -9.5, label: 'Menara Gerbang Val-Kragor Kanan' }
  );

  // B. Grand Fortress Citadel / Command Keep (East End of Courtyard at X = 210, Z = -16)
  // Menghadap ke BARAT ke arah alun-alun dan gerbang utama
  const fortressKeep = createFortressKeepMesh();
  fortressKeep.position.set(210, valKragorBaseY, -16);
  fortressKeep.rotation.y = -Math.PI / 2;
  scene.add(fortressKeep);
  colliders.push({
    type: 'box',
    minX: 205,
    maxX: 215,
    minZ: -22,
    maxZ: -10,
    label: 'Kastil Komando Val-Kragor',
  });

  // C. Four Expanded Corner Watchtowers
  const towerCoords = [
    { x: 162, z: -38, label: 'Menara Sudut Barat Laut' },
    { x: 162, z: 6, label: 'Menara Sudut Barat Daya' },
    { x: 214, z: -38, label: 'Menara Sudut Timur Laut' },
    { x: 214, z: 6, label: 'Menara Sudut Timur Daya' },
  ];
  towerCoords.forEach((tc) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(tc.x, valKragorBaseY, tc.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: tc.x, z: tc.z, radius: 2.5, label: tc.label });
  });

  // D. Solid Rampart Walls Enclosing Expanded Courtyard (X: 162..214, Z: -38..6)
  // North Wall (length 52, centered at X: 188, Z: -38)
  const vkWallNorth = createFortressWallMesh(52);
  vkWallNorth.position.set(188, valKragorBaseY, -38);
  scene.add(vkWallNorth);
  colliders.push({ type: 'box', minX: 162, maxX: 214, minZ: -39.5, maxZ: -36.5, label: 'Benteng Val-Kragor Utara' });

  // South Wall (length 52, centered at X: 188, Z: 6)
  const vkWallSouth = createFortressWallMesh(52);
  vkWallSouth.position.set(188, valKragorBaseY, 6);
  scene.add(vkWallSouth);
  colliders.push({ type: 'box', minX: 162, maxX: 214, minZ: 4.5, maxZ: 7.5, label: 'Benteng Val-Kragor Selatan' });

  // East Wall (length 44, centered at X: 214, Z: -16)
  const vkWallEast = createFortressWallMesh(44);
  vkWallEast.position.set(214, valKragorBaseY, -16);
  vkWallEast.rotation.y = Math.PI / 2;
  scene.add(vkWallEast);
  colliders.push({ type: 'box', minX: 212.5, maxX: 215.5, minZ: -38, maxZ: 6, label: 'Benteng Val-Kragor Timur' });

  // West Wall North Segment (connecting NW Watchtower to Gate North Bastion)
  const vkWallWestN = createFortressWallMesh(17.5);
  vkWallWestN.position.set(162, valKragorBaseY, -29.25);
  vkWallWestN.rotation.y = Math.PI / 2;
  scene.add(vkWallWestN);
  colliders.push({ type: 'box', minX: 160.5, maxX: 163.5, minZ: -38, maxZ: -20.5, label: 'Benteng Val-Kragor Barat Laut' });

  // West Wall South Segment (connecting SW Watchtower to Gate South Bastion)
  const vkWallWestS = createFortressWallMesh(17.5);
  vkWallWestS.position.set(162, valKragorBaseY, -2.75);
  vkWallWestS.rotation.y = Math.PI / 2;
  scene.add(vkWallWestS);
  colliders.push({ type: 'box', minX: 160.5, maxX: 163.5, minZ: -11.5, maxZ: 6, label: 'Benteng Val-Kragor Barat Daya' });

  // E. Outer Perimeter Surveillance Watchtowers
  const outerVkTowers = [
    { x: 152, z: -46, label: 'Menara Pengawas Luar Barat Laut' },
    { x: 224, z: -46, label: 'Menara Pengawas Luar Timur Laut' },
    { x: 152, z: 14, label: 'Menara Pengawas Luar Barat Daya' },
    { x: 224, z: 14, label: 'Menara Pengawas Luar Timur Daya' },
  ];
  outerVkTowers.forEach((ot) => {
    const oTower = createFortressWatchtowerMesh();
    oTower.position.set(ot.x, getTerrainHeight(ot.x, ot.z), ot.z);
    scene.add(oTower);
    colliders.push({ type: 'circle', x: ot.x, z: ot.z, radius: 2.5, label: ot.label });
  });

  // F. INTERIOR MILITARY FACILITIES (Lengkap, Rapi, & Tidak Kosong!)
  // F1. Barak Prajurit (Soldier Barracks in North-West Courtyard: X: 176, Z: -28)
  const vkBarracks = createBarracksMesh();
  vkBarracks.position.set(176, valKragorBaseY, -28);
  vkBarracks.rotation.y = 0;
  scene.add(vkBarracks);
  colliders.push({
    type: 'box',
    minX: 171.5,
    maxX: 180.5,
    minZ: -31.5,
    maxZ: -24.5,
    label: 'Barak Prajurit Benteng Val-Kragor',
  });

  // F2. Bengkel Tempa & Kedai Persenjataan Goran (North Courtyard: X: 196, Z: -28)
  const goranForge = createBlacksmithMesh();
  goranForge.position.set(196, valKragorBaseY, -28);
  goranForge.rotation.y = 0;
  scene.add(goranForge);
  colliders.push({
    type: 'box',
    minX: 193,
    maxX: 199,
    minZ: -31,
    maxZ: -25,
    label: 'Bengkel Tempa Gunung Goran',
  });

  // F3. Rak Senjata Militer di Luar Bengkel Tempa
  const rack1 = createWeaponRackMesh();
  rack1.position.set(190, valKragorBaseY, -25);
  scene.add(rack1);
  const rack2 = createWeaponRackMesh();
  rack2.position.set(202, valKragorBaseY, -25);
  scene.add(rack2);
  colliders.push(
    { type: 'box', minX: 188.8, maxX: 191.2, minZ: -25.5, maxZ: -24.5, label: 'Rak Senjata Benteng 1' },
    { type: 'box', minX: 200.8, maxX: 203.2, minZ: -25.5, maxZ: -24.5, label: 'Rak Senjata Benteng 2' }
  );

  // F4. Frostwolf Tavern / Highland Longhouse (South Courtyard: X: 196, Z: -4)
  const frostwolfLodge = createTavernMesh();
  frostwolfLodge.position.set(196, valKragorBaseY, -4);
  frostwolfLodge.rotation.y = Math.PI;
  scene.add(frostwolfLodge);
  colliders.push({
    type: 'box',
    minX: 192,
    maxX: 200,
    minZ: -7.5,
    maxZ: -0.5,
    label: 'Kedai Serigala Salju',
  });

  // F5. Tempat Latihan Pedang & Sasaran Panah (Combat Training Yard: South-West Courtyard)
  // Target Dummy Pedang
  const dummy1 = createTrainingDummyMesh();
  dummy1.position.set(172, valKragorBaseY, -8);
  dummy1.rotation.y = Math.PI / 4;
  const dummy2 = createTrainingDummyMesh();
  dummy2.position.set(178, valKragorBaseY, -8);
  dummy2.rotation.y = -Math.PI / 6;
  scene.add(dummy1, dummy2);
  colliders.push(
    { type: 'circle', x: 172, z: -8, radius: 0.6, label: 'Boneka Latihan Pedang 1' },
    { type: 'circle', x: 178, z: -8, radius: 0.6, label: 'Boneka Latihan Pedang 2' }
  );

  // Sasaran Panah
  const archeryTarget1 = createArcheryTargetMesh();
  archeryTarget1.position.set(172, valKragorBaseY, -3);
  archeryTarget1.rotation.y = 0;
  const archeryTarget2 = createArcheryTargetMesh();
  archeryTarget2.position.set(178, valKragorBaseY, -3);
  archeryTarget2.rotation.y = 0;
  scene.add(archeryTarget1, archeryTarget2);
  colliders.push(
    { type: 'box', minX: 171.2, maxX: 172.8, minZ: -3.5, maxZ: -2.5, label: 'Sasaran Panah 1' },
    { type: 'box', minX: 177.2, maxX: 178.8, minZ: -3.5, maxZ: -2.5, label: 'Sasaran Panah 2' }
  );

  // F6. Menara Panah Interior (Inner Arrow Watchtowers)
  const innerArrowTower1 = createFortressWatchtowerMesh();
  innerArrowTower1.position.set(170, valKragorBaseY, -32);
  scene.add(innerArrowTower1);
  colliders.push({ type: 'circle', x: 170, z: -32, radius: 2.2, label: 'Menara Panah Interior Utara' });

  const innerArrowTower2 = createFortressWatchtowerMesh();
  innerArrowTower2.position.set(170, valKragorBaseY, 0);
  scene.add(innerArrowTower2);
  colliders.push({ type: 'circle', x: 170, z: 0, radius: 2.2, label: 'Menara Panah Interior Selatan' });

  // F7. Api Unggun Prajurit Benteng (Pusat Alun-Alun: X: 186, Z: -16)
  const fortressFire = createBonfireMesh();
  fortressFire.position.set(186, valKragorBaseY, -16);
  scene.add(fortressFire);
  colliders.push({ type: 'circle', x: 186, z: -16, radius: 1.2, label: 'Perapian Utama Benteng' });

  // F8. Courtyard Iron Streetlamps
  for (const lx of [168, 180, 194, 204]) {
    for (const lz of [-20, -12]) {
      const lamp = createStreetLampMesh();
      lamp.position.set(lx, valKragorBaseY, lz);
      scene.add(lamp);
      colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Benteng' });
    }
  }

  // --- NPCS OF DESA BENTENG VAL-KRAGOR ---
  // NPC 9: Komandan Brann (Highland Fortress Commander)
  const brannGroup = createCustomNPCMesh('commander');
  const brannPos: [number, number, number] = [186, valKragorBaseY, -13];
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
  const eloraPos: [number, number, number] = [198, valKragorBaseY, -10];
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
  const goranPos: [number, number, number] = [196, valKragorBaseY, -24];
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
  const fGuardPos: [number, number, number] = [160, valKragorBaseY, -19];
  fGuardGroup.position.set(...fGuardPos);
  fGuardGroup.rotation.y = Math.PI * 1.5; // Menghadap lurus ke Barat keluar gerbang
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
  const fGuardPos2: [number, number, number] = [160, valKragorBaseY, -13];
  fGuardGroup2.position.set(...fGuardPos2);
  fGuardGroup2.rotation.y = Math.PI * 1.5; // Menghadap lurus ke Barat keluar gerbang
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
  const fGuardPos3: [number, number, number] = [176, valKragorBaseY, -22];
  fGuardGroup3.position.set(...fGuardPos3);
  fGuardGroup3.rotation.y = 0; // Menghadap Selatan ke jalan
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
  const fRecruitPos: [number, number, number] = [174, valKragorBaseY, -6];
  fRecruitGroup.position.set(...fRecruitPos);
  fRecruitGroup.rotation.y = Math.PI; // Menghadap Utara ke arah dummy
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
  // 2.9 MISTY CHASM & SOLID SUSPENSION BRIDGE
  // Membentang lurus menghubungkan jalur dari Desa Utama (Barat) menuju Benteng Val-Kragor (Timur) pada Z = -16.
  // Pilar penyangga batu berdiri kokoh di dasar jurang/sungai tanpa menembus papan lantai jembatan!
  // ==========================================
  const bridge = createSuspensionBridgeMesh(26);
  bridge.position.set(75, 2.4, -16);
  scene.add(bridge);

  // Pilar Penyangga Batu Kokoh (Tinggi 4.4m, duduk di dasar jurang y = -4.0, corbel capital menopang tepat di bawah dek y = 1.40)
  // Tidak menembus atau menyembul ke atas permukaan lantai kayu jembatan!
  const chasmStonePier = createStoneBridgePierMesh(4.4);
  chasmStonePier.position.set(75, -1.2, -16);
  scene.add(chasmStonePier);

  // Pagar Pengaman Jembatan Gantung (Membentang lurus di Z = -18.2 dan Z = -13.8)
  colliders.push(
    { type: 'box', minX: 62, maxX: 88, minZ: -18.2, maxZ: -17.4, label: 'Pagar Jembatan Kiri' },
    { type: 'box', minX: 62, maxX: 88, minZ: -14.6, maxZ: -13.8, label: 'Pagar Jembatan Kanan' }
  );

  // 2.9b Alur Jalan Setapak Berbatu (Cobblestone Highway)
  // Menghubungkan Jembatan Gantung (X = 88) lurus menuju ke Gerbang Barat Benteng Val-Kragor (X = 162)
  const valKragorRoadPoints: Array<[number, number]> = [
    [88, -16],
    [98, -16],
    [110, -16],
    [122, -16],
    [134, -16],
    [144, -16],
    [154, -16],
    [162, -16],
  ];
  const valKragorRoadMesh = createStoneRoadRibbonMesh(
    valKragorRoadPoints,
    3.8,
    getTerrainHeight,
    0x94a3b8, // Slate cobblestone path color
    0x475569  // Deep stone kerb border color
  );
  scene.add(valKragorRoadMesh);

  // 2.9c Highway Waymarkers: Jalan Raya Desa Utama -> Jembatan Gantung -> Gerbang Benteng Val-Kragor (InstancedMesh)
  // Tiang-tiang lampu jalan diposisikan di sisi pinggir kiri (Z = -18.5) dan kanan (Z = -13.5).
  // Alur jalan setapak di tengah Z = -16 selebar 3.8 meter 100% BERSIH, BEBAS HAMBATAN, dan LAPANG!
  const highwayLampPairs = [
    { x: 24, zL: -18.5, zR: -13.5 },
    { x: 40, zL: -18.5, zR: -13.5 },
    { x: 56, zL: -18.5, zR: -13.5 },
    { x: 60, zL: -18.5, zR: -13.5 }, // Pintu Masuk Barat Jembatan
    { x: 90, zL: -18.5, zR: -13.5 }, // Pintu Keluar Timur Jembatan
    { x: 104, zL: -18.5, zR: -13.5 }, // Lereng Dataran Tinggi
    { x: 118, zL: -18.5, zR: -13.5 }, // Tanjakan Menuju Benteng
    { x: 132, zL: -18.5, zR: -13.5 },
    { x: 146, zL: -18.5, zR: -13.5 },
    { x: 156, zL: -18.5, zR: -13.5 }, // Depan Gerbang Barat Benteng Val-Kragor
  ];

  const highwayLampsData: { x: number; y: number; z: number }[] = [];
  highwayLampPairs.forEach(pair => {
    const yL = getTerrainHeight(pair.x, pair.zL);
    const yR = getTerrainHeight(pair.x, pair.zR);
    highwayLampsData.push({ x: pair.x, y: yL, z: pair.zL });
    highwayLampsData.push({ x: pair.x, y: yR, z: pair.zR });
    colliders.push({ type: 'circle', x: pair.x, z: pair.zL, radius: 0.35, label: 'Lampu Pinggir Jalan Kiri' });
    colliders.push({ type: 'circle', x: pair.x, z: pair.zR, radius: 0.35, label: 'Lampu Pinggir Jalan Kanan' });
  });
  const highwayLampsMesh = createInstancedStreetLamps(highwayLampsData);
  scene.add(highwayLampsMesh);

  // ==========================================
  // 2.10 FROSTPEAK GLACIER CRYO ALTAR & RICH WILDERNESS DECORATIONS
  // (Puncak Salju Frostpeak Summit ridge, outer Astraea wilderness, snowy pines, ice boulders, glowing crystals, rounded snowdrifts)
  // ==========================================
  const frostSpire1 = createIceCrystalSpireMesh();
  frostSpire1.position.set(112, getTerrainHeight(112, -65), -65);
  const frostSpire2 = createIceCrystalSpireMesh();
  frostSpire2.position.set(118, getTerrainHeight(118, -65), -65);
  frostSpire2.scale.set(1.4, 1.4, 1.4);
  scene.add(frostSpire1, frostSpire2);

  // Ancient Ice Altar Circle on glacier ridge
  const iceRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.4, 6, 16),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.7,
    })
  );
  iceRing.rotation.x = Math.PI / 2;
  const altarY = getTerrainHeight(115, -65);
  iceRing.position.set(115, altarY + 0.3, -65);
  scene.add(iceRing);
  colliders.push({ type: 'circle', x: 115, z: -65, radius: 5.2, label: 'Altar Es Frostpeak' });

  // 1. Glowing Ice Crystal Clusters & Spires (Pilar Kristal Es Bercahaya)
  const crystalCoords = [
    { x: 104, z: -55, scale: 1.0, light: true },
    { x: 126, z: -58, scale: 1.1, light: false },
    { x: 88, z: -78, scale: 1.0, light: true },
    { x: 74, z: -108, scale: 1.2, light: true },
    { x: 92, z: -98, scale: 0.95, light: false },
    { x: 86, z: -124, scale: 1.15, light: true },
    { x: 112, z: -146, scale: 1.2, light: false },
    { x: 136, z: -146, scale: 1.3, light: true },
    { x: 154, z: -142, scale: 1.1, light: false },
    { x: 172, z: -110, scale: 1.25, light: true },
  ];
  crystalCoords.forEach((cc) => {
    const crys = createIceCrystalClusterMesh(cc.light);
    const cy = getTerrainHeight(cc.x, cc.z);
    crys.position.set(cc.x, cy, cc.z);
    crys.scale.set(cc.scale, cc.scale, cc.scale);
    scene.add(crys);
    colliders.push({ type: 'circle', x: cc.x, z: cc.z, radius: 0.8, label: 'Pilar Kristal Es' });
  });

  // 2. Snowy Alpine Pine Trees (Pohon Pinus Bersalju Frostpeak)
  const frostpeakPineCoords = [
    // Western approach & flanking royal descent road
    { x: 72, z: -104, scale: 1.1 },
    { x: 76, z: -118, scale: 0.95 },
    { x: 82, z: -102, scale: 1.2 },
    { x: 85, z: -116, scale: 1.05 },
    { x: 92, z: -104, scale: 1.15 },
    { x: 95, z: -120, scale: 0.9 },
    { x: 100, z: -102, scale: 1.25 },
    // Southern mountain pass & valley (between Val-Kragor and Astraea)
    { x: 92, z: -45, scale: 1.0 },
    { x: 102, z: -48, scale: 1.1 },
    { x: 118, z: -46, scale: 1.2 },
    { x: 132, z: -44, scale: 0.95 },
    { x: 96, z: -60, scale: 1.05 },
    { x: 128, z: -58, scale: 1.15 },
    { x: 142, z: -56, scale: 1.0 },
    { x: 90, z: -72, scale: 1.2 },
    { x: 138, z: -70, scale: 1.1 },
    // Cryo altar grove
    { x: 105, z: -68, scale: 1.05 },
    { x: 124, z: -66, scale: 1.1 },
    { x: 112, z: -55, scale: 0.9 },
    { x: 120, z: -56, scale: 1.0 },
    // Outer northern & western slopes
    { x: 86, z: -88, scale: 1.15 },
    { x: 82, z: -128, scale: 1.05 },
    { x: 90, z: -138, scale: 1.2 },
    { x: 100, z: -145, scale: 1.1 },
    { x: 115, z: -148, scale: 1.25 },
    { x: 130, z: -147, scale: 1.0 },
    { x: 145, z: -146, scale: 1.15 },
    { x: 160, z: -144, scale: 1.05 },
    // Expanded Northern Frostpeak Wilderness (Anti-Polos)
    { x: 110, z: -175, scale: 1.2 },
    { x: 125, z: -190, scale: 1.1 },
    { x: 140, z: -170, scale: 1.25 },
    { x: 155, z: -185, scale: 1.15 },
    { x: 170, z: -195, scale: 1.3 },
    { x: 185, z: -175, scale: 1.05 },
    { x: 120, z: -215, scale: 1.2 },
    { x: 135, z: -225, scale: 1.15 },
    { x: 150, z: -210, scale: 1.25 },
    { x: 165, z: -220, scale: 1.3 },
    { x: 105, z: -245, scale: 1.15 },
    { x: 120, z: -255, scale: 1.2 },
    { x: 135, z: -240, scale: 1.25 },
    { x: 100, z: -270, scale: 1.1 },
    { x: 115, z: -280, scale: 1.2 },
    { x: 130, z: -275, scale: 1.3 },
    { x: 195, z: -220, scale: 1.1 },
    { x: 210, z: -235, scale: 1.25 },
    { x: 200, z: -275, scale: 1.2 },
    { x: 215, z: -285, scale: 1.15 },
  ];
  frostpeakPineCoords.forEach((p, idx) => {
    const pine = createSnowyPineTreeMesh(p.scale);
    const py = getTerrainHeight(p.x, p.z);
    pine.position.set(p.x, py, p.z);
    pine.rotation.y = (idx * 1.37) % (Math.PI * 2);
    scene.add(pine);
    colliders.push({ type: 'circle', x: p.x, z: p.z, radius: 0.5 * p.scale, label: 'Pohon Pinus Bersalju' });
  });

  // 3. Slick Glacial Ice Boulders (Batu Es Licin Frostpeak)
  const iceBoulders = [
    // Western approach
    { x: 78, z: -110, scale: 1.1 },
    { x: 88, z: -122, scale: 1.3 },
    { x: 98, z: -118, scale: 0.9 },
    { x: 100, z: -96, scale: 1.2 },
    // Southern pass & Cryo ridge
    { x: 108, z: -58, scale: 1.4 },
    { x: 122, z: -60, scale: 1.1 },
    { x: 135, z: -66, scale: 1.3 },
    { x: 104, z: -76, scale: 1.0 },
    { x: 126, z: -78, scale: 1.2 },
    { x: 146, z: -80, scale: 1.5 },
    // Northern alpine foothills
    { x: 108, z: -142, scale: 1.3 },
    { x: 125, z: -144, scale: 1.5 },
    { x: 138, z: -142, scale: 1.2 },
    { x: 155, z: -140, scale: 1.4 },
    // Eastern glacier crags
    { x: 170, z: -98, scale: 1.6 },
    { x: 172, z: -120, scale: 1.4 },
    // Expanded Frostpeak Wilderness Boulders (Anti-Polos)
    { x: 115, z: -180, scale: 1.5 },
    { x: 130, z: -195, scale: 1.3 },
    { x: 145, z: -175, scale: 1.6 },
    { x: 160, z: -190, scale: 1.4 },
    { x: 125, z: -220, scale: 1.5 },
    { x: 140, z: -230, scale: 1.2 },
    { x: 110, z: -250, scale: 1.4 },
    { x: 125, z: -265, scale: 1.6 },
    { x: 205, z: -225, scale: 1.5 },
    { x: 215, z: -270, scale: 1.7 },
  ];
  iceBoulders.forEach((b, idx) => {
    const boulder = createIceBoulderMesh(b.scale);
    const by = getTerrainHeight(b.x, b.z);
    boulder.position.set(b.x, by, b.z);
    boulder.rotation.y = (idx * 1.61) % (Math.PI * 2);
    scene.add(boulder);
    colliders.push({ type: 'circle', x: b.x, z: b.z, radius: 0.85 * b.scale, label: 'Batu Es Licin' });
  });

  // 4. Rounded Blunt Snow Drift Mounds (Bukit Salju Bersudut Tumpul)
  const snowDrifts = [
    // Outer Southern Fortress Wall base
    { x: 112, z: -82, rx: 4.2, rz: 3.2, h: 0.9 },
    { x: 128, z: -82, rx: 4.5, rz: 3.5, h: 1.1 },
    { x: 144, z: -82, rx: 4.0, rz: 3.0, h: 0.8 },
    { x: 158, z: -82, rx: 3.8, rz: 3.0, h: 0.9 },
    // Outer Northern Fortress Wall base
    { x: 112, z: -138, rx: 4.0, rz: 3.0, h: 0.9 },
    { x: 126, z: -138, rx: 4.8, rz: 3.4, h: 1.2 },
    { x: 142, z: -138, rx: 4.2, rz: 3.2, h: 1.0 },
    { x: 156, z: -138, rx: 3.6, rz: 2.8, h: 0.8 },
    // Flanking West Gate outer entrance
    { x: 102, z: -118, rx: 4.0, rz: 3.2, h: 1.0 },
    { x: 102, z: -102, rx: 4.0, rz: 3.2, h: 1.0 },
    // Open Valley hummocks
    { x: 115, z: -74, rx: 5.0, rz: 4.0, h: 1.2 },
    { x: 132, z: -72, rx: 4.5, rz: 3.5, h: 1.0 },
    { x: 85, z: -82, rx: 4.2, rz: 3.5, h: 1.1 },
    { x: 90, z: -125, rx: 4.6, rz: 3.8, h: 1.2 },
  ];
  snowDrifts.forEach((sd) => {
    const drift = createSnowDriftMoundMesh(sd.rx, sd.rz, sd.h);
    const dy = getTerrainHeight(sd.x, sd.z);
    drift.position.set(sd.x, dy, sd.z);
    scene.add(drift);
  });

  // ==========================================
  // 2.11 SHADOWFEN GLOOM MARSH (Far West)
  // Pohon Bakau Purba, Genangan Rawa Murky, Kabut Mengambang, Jamur Neon & Batu Berlumut
  // ==========================================
  // A. Pohon Bakau / Beringin Rawa Purba (Ancient Gnarled Mangroves with Hanging Roots)
  const swampMangroveCoords = [
    { x: -92, z: 14, scale: 1.2 },
    { x: -105, z: 30, scale: 1.35 },
    { x: -125, z: 5, scale: 1.1 },
    { x: -115, z: -15, scale: 1.3 },
    { x: -80, z: 18, scale: 1.15 },
    { x: -130, z: 28, scale: 1.25 },
  ];
  swampMangroveCoords.forEach((mc) => {
    const mangrove = createSwampMangroveTreeMesh(mc.scale);
    const my = getTerrainHeight(mc.x, mc.z);
    mangrove.position.set(mc.x, my, mc.z);
    scene.add(mangrove);
    colliders.push({ type: 'circle', x: mc.x, z: mc.z, radius: 1.5 * mc.scale, label: 'Pohon Bakau Rawa Purba' });
  });

  // B. Genangan Rawa Air Keruh Berlumpur (Murky Swamp Pools)
  const swampPoolCoords = [
    { x: -100, z: 16, radius: 4.8 },
    { x: -112, z: 6, radius: 5.5 },
    { x: -86, z: 24, radius: 4.2 },
    { x: -124, z: 18, radius: 5.0 },
  ];
  swampPoolCoords.forEach((pc) => {
    const pool = createMurkySwampPoolMesh(pc.radius);
    const py = getTerrainHeight(pc.x, pc.z);
    pool.position.set(pc.x, py + 0.03, pc.z);
    scene.add(pool);

    // Swamp floating ground mist
    const mist = createSwampMistPlaneMesh(pc.radius * 2.2, pc.radius * 2.2);
    mist.position.set(pc.x, py + 0.45, pc.z);
    scene.add(mist);
  });

  // C. Bebatuan Rawa Berlumut Gelap (Mossy Swamp Boulders)
  const mossyBoulderCoords = [
    { x: -94, z: 6, scale: 1.4 },
    { x: -106, z: 22, scale: 1.6 },
    { x: -120, z: 14, scale: 1.5 },
    { x: -82, z: 32, scale: 1.3 },
    { x: -128, z: -4, scale: 1.8 },
  ];
  mossyBoulderCoords.forEach((bc) => {
    const boulder = createMossySwampBoulderMesh(bc.scale);
    const by = getTerrainHeight(bc.x, bc.z);
    boulder.position.set(bc.x, by, bc.z);
    scene.add(boulder);
    colliders.push({ type: 'circle', x: bc.x, z: bc.z, radius: 1.2 * bc.scale, label: 'Batu Rawa Berlumut' });
  });

  // D. Jamur Luminesens Raksasa Bercahaya Neon (Giant Glowing Shrooms)
  const swampShroomCoords = [
    { x: -88, z: 8, color: 0xa855f7, scale: 1.2 },
    { x: -98, z: 22, color: 0x06b6d4, scale: 1.5 },
    { x: -110, z: -6, color: 0x10b981, scale: 1.3 },
    { x: -118, z: 18, color: 0xec4899, scale: 1.6 },
    { x: -78, z: 28, color: 0x8b5cf6, scale: 1.1 },
    { x: -128, z: 10, color: 0x38bdf8, scale: 1.4 },
  ];
  swampShroomCoords.forEach((sc) => {
    const shroom = createGiantMushroomMesh(sc.color);
    const sy = getTerrainHeight(sc.x, sc.z);
    shroom.position.set(sc.x, sy, sc.z);
    shroom.scale.set(sc.scale, sc.scale, sc.scale);
    scene.add(shroom);
    colliders.push({ type: 'circle', x: sc.x, z: sc.z, radius: 0.8 * sc.scale, label: 'Batang Jamur Raksasa' });
  });

  // ==========================================
  // 2.12 CORAL COVE & PIRATE SHIPWRECK
  // (Far South-East Coastal Reef)
  // ==========================================
  const shipwreck = createShipwreckMesh();
  shipwreck.position.set(86, -0.2, 54);
  shipwreck.rotation.y = -0.6;
  scene.add(shipwreck);
  colliders.push({
    type: 'box',
    minX: 82,
    maxX: 90,
    minZ: 49,
    maxZ: 59,
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
  // 4. MYSTIC FOREST & MANA CRYSTALS (East)
  // ==========================================
  const floatingCrystals: THREE.Mesh[] = [];
  const monolith1 = createCrystalMonolithMesh();
  monolith1.group.position.set(-6, getTerrainHeight(-6, -15), -15);
  scene.add(monolith1.group);
  floatingCrystals.push(monolith1.crystal);

  const monolith2 = createCrystalMonolithMesh();
  monolith2.group.position.set(30, getTerrainHeight(30, 8), 8);
  scene.add(monolith2.group);
  floatingCrystals.push(monolith2.crystal);

  const monolith3 = createCrystalMonolithMesh();
  monolith3.group.position.set(35, getTerrainHeight(35, -18), -18);
  scene.add(monolith3.group);
  floatingCrystals.push(monolith3.crystal);

  // Trees in forest, meadow & beach palms
  const treeCount = 95;
  for (let i = 0; i < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 60;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;

    // Strict Anti-Overlap Exclusion: Prevent ANY wild trees from spawning inside Sanctuary Village, Harbor/Ocean, Suspension Bridge, Highway, or Val-Kragor
    const inSanctuaryMainland = (Math.abs(tx) <= 35 && tz >= -32 && tz <= 16);
    const inSanctuaryHarborOcean = (Math.abs(tx) <= 50 && tz > 16);
    const inBridgeHighwayCorridor = (tx >= 42 && tx <= 168 && Math.abs(tz - -16) <= 9.0);
    const inMistyChasm = (tx >= 58 && tx <= 92 && tz >= -35 && tz <= 5);
    const inValKragor = (tx >= 155 && tx <= 225 && tz >= -48 && tz <= 15);
    if (inSanctuaryMainland || inSanctuaryHarborOcean || inBridgeHighwayCorridor || inMistyChasm || inValKragor) continue;
    // Avoid boss arena center
    if (tz < -35 && Math.abs(tx) < 26) continue;

    const ty = getTerrainHeight(tx, tz);
    const treeType =
      tx > 20 ? (i % 3 === 0 ? 'fantasy' : 'pine') :
      tz > 18 ? 'oak' :
      i % 4 === 0 ? 'fantasy' : 'oak';

    const tree = createTreeMesh(treeType);
    tree.position.set(tx, ty, tz);
    const scale = 0.8 + Math.random() * 0.6;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    decorativeProps.push(tree);

    // Tree solid obstacle collider so player does not pass through trees
    colliders.push({
      type: 'circle',
      x: tx,
      z: tz,
      radius: 0.55 * scale,
      label: 'Pohon',
    });
  }

  // Curated Village Landscaping Trees (InstancedMesh - High Performance 60 FPS, Zero Stutter!)
  const curatedVillageTrees: { x: number; z: number; type: 'oak' | 'fantasy' | 'pine'; scale: number }[] = [
    // West Residential Backyards (Apple & Oak orchard)
    { x: -31, z: -14, type: 'oak', scale: 1.1 },
    { x: -31, z: -2, type: 'oak', scale: 1.2 },
    { x: -31, z: 10, type: 'oak', scale: 1.1 },
    // East Residential Backyards (Lush Garden)
    { x: 31, z: -14, type: 'oak', scale: 1.1 },
    { x: 31, z: -2, type: 'oak', scale: 1.2 },
    { x: 31, z: 10, type: 'oak', scale: 1.1 },
    // Flanking North Gate
    { x: -7, z: -25, type: 'pine', scale: 1.2 },
    { x: 7, z: -25, type: 'pine', scale: 1.2 },
    // North Garden behind Elder Lodge & Tavern
    { x: -14, z: -21, type: 'oak', scale: 1.0 },
    { x: 14, z: -21, type: 'oak', scale: 1.0 },
    // Coastal Palm / Pine near beach sand
    { x: -28, z: 18, type: 'oak', scale: 1.15 },
    { x: 28, z: 18, type: 'oak', scale: 1.15 },
  ];

  const villageTreesData = curatedVillageTrees.map(vt => {
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
  // 5. SOLARIA GOLDEN DESERT: VILLAGE, GRAND PALACE & SUNKEN PYRAMID
  // ==========================================

  // ------------------------------------------
  // 5A. ANCIENT SUNKEN PYRAMID RUINS (East Outskirts: [-165, 110])
  // ------------------------------------------
  const pyramid = createDesertPyramidMesh();
  const pyY = getTerrainHeight(-165, 110);
  pyramid.position.set(-165, pyY, 110);
  scene.add(pyramid);
  colliders.push({
    type: 'box',
    minX: -174,
    maxX: -156,
    minZ: 101,
    maxZ: 119,
    label: 'Piramida Emas Solaria',
  });

  // Obelisks guarding pyramid approach
  const obeliskPositions = [
    { x: -180, z: 110 },
    { x: -150, z: 110 },
    { x: -165, z: 95 },
    { x: -165, z: 125 },
  ];
  obeliskPositions.forEach((pos) => {
    const obelisk = createDesertObeliskMesh();
    obelisk.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(obelisk);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Obelisk Solaria' });
  });

  // Palms near Pyramid Oasis Spring (InstancedMesh - High Performance 60 FPS)
  const palmPositions = [
    { x: -142, z: 86 },
    { x: -148, z: 90 },
    { x: -138, z: 94 },
    { x: -184, z: 128 },
    { x: -190, z: 134 },
  ];
  const pyramidPalmsData = palmPositions.map((pos) => {
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
  // 5B. GRAND SULTAN SOLARIA PALACE & DESA BAZAAR GURUN
  // Palace Center: [-415, 350], Village Center: [-375, 350] (Ideal 40 unit separation)
  // Fortified sandstone battlements, golden minarets, fountain courtyard & clear paved road
  // ------------------------------------------
  const solariaBaseY = 2.4;

  // 1. Grand Taj Mahal Palace of Sultan Solaria (West End: [-415, 350])
  const solariaPalace = createTajMahalPalaceMesh();
  solariaPalace.position.set(-415, solariaBaseY, 350);
  solariaPalace.rotation.y = 0; // Menghadap lurus ke Timur (ke arah pelataran & desa)
  scene.add(solariaPalace);
  colliders.push({
    type: 'box',
    minX: -433,
    maxX: -400,
    minZ: 334,
    maxZ: 366,
    label: 'Istana Taj Mahal Sultan Solaria',
  });
  colliders.push({ type: 'circle', x: -431, z: 334, radius: 2.2, label: 'Menara Minaret Barat Laut' });
  colliders.push({ type: 'circle', x: -431, z: 366, radius: 2.2, label: 'Menara Minaret Barat Daya' });
  colliders.push({ type: 'circle', x: -399, z: 334, radius: 2.2, label: 'Menara Minaret Timur Laut' });
  colliders.push({ type: 'circle', x: -399, z: 366, radius: 2.2, label: 'Menara Minaret Tenggara' });

  // 1b. Pagar Benteng Batu Pasir Bertingkat & 4 Menara Minaret Emas Luar
  const palaceWalls = createDesertPalaceFortressWallMesh();
  palaceWalls.position.set(0, solariaBaseY, 0);
  scene.add(palaceWalls);
  colliders.push({ type: 'box', minX: -438, maxX: -434, minZ: 324, maxZ: 376, label: 'Benteng Barat Istana Solaria' });
  colliders.push({ type: 'box', minX: -438, maxX: -392, minZ: 372, maxZ: 376, label: 'Benteng Utara Istana Solaria' });
  colliders.push({ type: 'box', minX: -438, maxX: -392, minZ: 324, maxZ: 328, label: 'Benteng Selatan Istana Solaria' });
  colliders.push({ type: 'circle', x: -436, z: 326, radius: 2.5, label: 'Minaret Benteng Barat Daya' });
  colliders.push({ type: 'circle', x: -436, z: 374, radius: 2.5, label: 'Minaret Benteng Barat Laut' });
  colliders.push({ type: 'circle', x: -394, z: 326, radius: 2.5, label: 'Minaret Benteng Tenggara' });
  colliders.push({ type: 'circle', x: -394, z: 374, radius: 2.5, label: 'Minaret Benteng Timur Laut' });

  // 2. Alur Jalan Setapak Batu Pasir yang Luas & Megah (Grand Sandstone Desert Avenue)
  // Menghubungkan Teras Pintu Masuk Istana [-396] langsung ke Pemukiman Desa Gurun [-330 s/d -250]
  // Pelataran depan pintu istana (-405 s/d -385) dibersihkan 100% dari kolam kerucut, tiang, dan balok beton!
  const pavedRoad = createDesertPavedRoadMesh(-396, -250, 350, 7.5);
  pavedRoad.position.set(0, solariaBaseY, 0);
  scene.add(pavedRoad);

  // Grand Avenue Date Palms & Brass Desert Oil Lanterns (Along North Z=344.5 & South Z=355.5 Walkways)
  // Area pelataran depan pintu istana (-405 s/d -385) 100% bersih, lapang, dan terbuka
  const causewayItems = [
    // North side avenue promenade (Z = 344.5)
    { type: 'lantern', x: -380, z: 344.5 },
    { type: 'palm',    x: -366, z: 344.5 },
    { type: 'lantern', x: -352, z: 344.5 },
    { type: 'palm',    x: -338, z: 344.5 },
    // South side avenue promenade (Z = 355.5)
    { type: 'lantern', x: -380, z: 355.5 },
    { type: 'palm',    x: -366, z: 355.5 },
    { type: 'lantern', x: -352, z: 355.5 },
    { type: 'palm',    x: -338, z: 355.5 },
  ];

  causewayItems.forEach((item, idx) => {
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

  // 3. Interior Ruang Takhta Sultan (Throne Room Interior Cell: [-415, -25, 350])
  const throneInterior = createThroneRoomInteriorMesh();
  throneInterior.position.set(-415, -25, 350);
  scene.add(throneInterior);
  // Throne room interior wall colliders (maxY: -10 isolates them from overworld surface)
  colliders.push({ type: 'box', minX: -432, maxX: -398, minZ: 338, maxZ: 340, maxY: -10, label: 'Dinding Utara Ruang Takhta' });
  colliders.push({ type: 'box', minX: -432, maxX: -398, minZ: 360, maxZ: 362, maxY: -10, label: 'Dinding Selatan Ruang Takhta' });
  colliders.push({ type: 'box', minX: -433, maxX: -431, minZ: 339, maxZ: 361, maxY: -10, label: 'Dinding Belakang Takhta' });
  colliders.push({ type: 'box', minX: -400, maxX: -398, minZ: 339, maxZ: 348, maxY: -10, label: 'Dinding Pintu Masuk Takhta Utara' });
  colliders.push({ type: 'box', minX: -400, maxX: -398, minZ: 352, maxZ: 361, maxY: -10, label: 'Dinding Pintu Masuk Takhta Selatan' });
  colliders.push({ type: 'box', minX: -430, maxX: -425, minZ: 347, maxZ: 353, maxY: -10, label: 'Singgasana Emas Sultan' });

  // Sultan Malik al-Solaria (Seated on the Royal Peacock Throne inside Throne Room)
  const sultanGroup = createCustomNPCMesh('emperor');
  const sultanPos: [number, number, number] = [-427.5, -25 + 1.4, 350];
  sultanGroup.position.set(...sultanPos);
  sultanGroup.rotation.y = Math.PI * 1.5; // Menghadap ke Timur ke arah karpet & pintu masuk
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
  const guard1Pos: [number, number, number] = [-426, -25, 346.5];
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
  const guard2Pos: [number, number, number] = [-426, -25, 353.5];
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

  // 4. Sumur Batu Oase di Tepi Jalan (Roadside Oasis Well Plaza: [-306, 342.5])
  // Berada tepat di tepi utara Desert Avenue, mudah diakses dan mempercantik pemandangan jalan
  const desertWell = createDesertOasisWellMesh();
  desertWell.position.set(-306, solariaBaseY, 342.5);
  scene.add(desertWell);
  colliders.push({
    type: 'circle',
    x: -306,
    z: 342.5,
    radius: 1.8,
    label: 'Sumur Oase Solaria',
  });

  // Pohon Kurma Subur di Sekitar Taman Sumur Oase
  const townPalmOffsets = [
    { x: -310, z: 339.5 },
    { x: -302, z: 339.5 },
    { x: -310, z: 344.0 },
    { x: -302, z: 344.0 },
  ];
  townPalmOffsets.forEach((tpo, idx) => {
    const palm = createDesertPalmMesh();
    palm.position.set(tpo.x, solariaBaseY, tpo.z);
    palm.rotation.y = idx * 1.57;
    scene.add(palm);
    colliders.push({ type: 'circle', x: tpo.x, z: tpo.z, radius: 0.65, label: 'Pohon Kurma Alun-Alun Solaria' });
  });

  // 5. Rumah-Rumah Tanah Liat Khas Gurun (Symmetrical Mud-Brick Adobe Houses)
  // Berjejer rapi di sepanjang baris utara (Z = 330-333) dan baris selatan (Z = 367) menghadap jalan
  // Sisi Utara Jalan (Z = 330 - 333):
  // House 1: Two-Tier Adobe Villa (Barat Laut: [-322, 333])
  const adobeHouse1 = createDesertMudBrickHouseMesh(1);
  adobeHouse1.position.set(-322, solariaBaseY, 333);
  adobeHouse1.rotation.y = 0;
  scene.add(adobeHouse1);
  colliders.push({
    type: 'box',
    minX: -326,
    maxX: -318,
    minZ: 329,
    maxZ: 337,
    label: 'Rumah Bertingkat Gurun 1',
  });

  // House 2: Merchant Adobe Residence (Utara Tengah di belakang Sumur Oase: [-306, 330])
  const adobeHouse2 = createDesertMudBrickHouseMesh(2);
  adobeHouse2.position.set(-306, solariaBaseY, 330);
  adobeHouse2.rotation.y = 0;
  scene.add(adobeHouse2);
  colliders.push({
    type: 'box',
    minX: -310,
    maxX: -302,
    minZ: 326,
    maxZ: 334,
    label: 'Rumah Saudagar Gurun 2',
  });

  // House 3: Two-Tier Adobe Villa (Timur Laut: [-286, 333])
  const adobeHouse3 = createDesertMudBrickHouseMesh(1);
  adobeHouse3.position.set(-286, solariaBaseY, 333);
  adobeHouse3.rotation.y = 0;
  scene.add(adobeHouse3);
  colliders.push({
    type: 'box',
    minX: -290,
    maxX: -282,
    minZ: 329,
    maxZ: 337,
    label: 'Rumah Bertingkat Gurun 3',
  });

  // Sisi Selatan Jalan (Z = 367):
  // House 4: Traditional Mud-Brick (Barat Daya: [-322, 367])
  const adobeHouse4 = createDesertMudBrickHouseMesh(0);
  adobeHouse4.position.set(-322, solariaBaseY, 367);
  adobeHouse4.rotation.y = Math.PI;
  scene.add(adobeHouse4);
  colliders.push({
    type: 'box',
    minX: -326,
    maxX: -318,
    minZ: 363,
    maxZ: 371,
    label: 'Rumah Tanah Liat Gurun 4',
  });

  // Tempat Peristirahatan Unta (Camel Rest Area: Selatan Tengah berhadapan dengan Sumur Oase: [-306, 367])
  const camelRest = createCamelRestAreaMesh();
  camelRest.position.set(-306, solariaBaseY, 367);
  scene.add(camelRest);
  colliders.push({
    type: 'box',
    minX: -312,
    maxX: -300,
    minZ: 362,
    maxZ: 372,
    label: 'Tempat Peristirahatan Unta Gurun',
  });

  // House 5: Traditional Mud-Brick (Tenggara: [-286, 367])
  const adobeHouse5 = createDesertMudBrickHouseMesh(0);
  adobeHouse5.position.set(-286, solariaBaseY, 367);
  adobeHouse5.rotation.y = Math.PI;
  scene.add(adobeHouse5);
  colliders.push({
    type: 'box',
    minX: -290,
    maxX: -282,
    minZ: 363,
    maxZ: 371,
    label: 'Rumah Tanah Liat Gurun 5',
  });

  // 6. Pasar Bazaar Gurun Solaria (Bazaar Stalls: Berjejer Rapi di Kiri dan Kanan Jalan)
  // Sisi Utara (Z = 343.5, menghadap ke Selatan arah jalan):
  // Kios Rempah Tariq (Barat Laut: [-316, 343.5])
  const bazaarStall1 = createDesertBazaarStallMesh(0xd97706, 0xfef08a);
  bazaarStall1.position.set(-316, solariaBaseY, 343.5);
  bazaarStall1.rotation.y = 0;
  scene.add(bazaarStall1);
  colliders.push({ type: 'box', minX: -318, maxX: -314, minZ: 342.5, maxZ: 344.5, label: 'Kios Rempah Solaria' });

  // Kios Sutra & Karpet (Timur Laut: [-296, 343.5])
  const bazaarStall2 = createDesertBazaarStallMesh(0x9333ea, 0xfbbf24);
  bazaarStall2.position.set(-296, solariaBaseY, 343.5);
  bazaarStall2.rotation.y = 0;
  scene.add(bazaarStall2);
  colliders.push({ type: 'box', minX: -298, maxX: -294, minZ: 342.5, maxZ: 344.5, label: 'Kios Karpet Solaria' });

  // Sisi Selatan (Z = 356.5, menghadap ke Utara arah jalan):
  // Kios Tembikar & Kurma (Barat Daya: [-316, 356.5])
  const bazaarStall3 = createDesertBazaarStallMesh(0x059669, 0xa7f3d0);
  bazaarStall3.position.set(-316, solariaBaseY, 356.5);
  bazaarStall3.rotation.y = Math.PI;
  scene.add(bazaarStall3);
  colliders.push({ type: 'box', minX: -318, maxX: -314, minZ: 355.5, maxZ: 357.5, label: 'Kios Tembikar Solaria' });

  // Kios Zirah & Kulit Gurun (Tenggara: [-296, 356.5])
  const bazaarStall4 = createDesertBazaarStallMesh(0xb91c1c, 0xfde047);
  bazaarStall4.position.set(-296, solariaBaseY, 356.5);
  bazaarStall4.rotation.y = Math.PI;
  scene.add(bazaarStall4);
  colliders.push({ type: 'box', minX: -298, maxX: -294, minZ: 355.5, maxZ: 357.5, label: 'Kios Baju Zirah Gurun' });

  // 7. Kemah-Kemah Sutra Bazaar Khas Gurun (Bedouin Pavilion Tents: Berjejer Rapi di Sisi Timur)
  // Sisi Utara (Z = 343.5, menghadap jalan):
  const desertTent1 = createDesertTentMesh(0x991b1b);
  desertTent1.position.set(-274, solariaBaseY, 343.5);
  desertTent1.rotation.y = 0;
  scene.add(desertTent1);
  colliders.push({ type: 'circle', x: -274, z: 343.5, radius: 2.8, label: 'Kemah Sutra Merah' });

  const desertTent3 = createDesertTentMesh(0xd97706);
  desertTent3.position.set(-260, solariaBaseY, 343.5);
  desertTent3.rotation.y = 0;
  scene.add(desertTent3);
  colliders.push({ type: 'circle', x: -260, z: 343.5, radius: 2.8, label: 'Kemah Sutra Emas' });

  // Sisi Selatan (Z = 356.5, menghadap jalan):
  const desertTent2 = createDesertTentMesh(0x047857);
  desertTent2.position.set(-274, solariaBaseY, 356.5);
  desertTent2.rotation.y = Math.PI;
  scene.add(desertTent2);
  colliders.push({ type: 'circle', x: -274, z: 356.5, radius: 2.8, label: 'Kemah Sutra Zamrud' });

  const desertTent4 = createDesertTentMesh(0x1d4ed8);
  desertTent4.position.set(-260, solariaBaseY, 356.5);
  desertTent4.rotation.y = Math.PI;
  scene.add(desertTent4);
  colliders.push({ type: 'circle', x: -260, z: 356.5, radius: 2.8, label: 'Kemah Sutra Safir' });

  // Lampu Minyak Sepanjang Kerb Jalan Desa Gurun (Village Kerb Lanterns)
  const villageKerbLanterns = [
    { x: -322, z: 345.5 },
    { x: -306, z: 345.5 },
    { x: -286, z: 345.5 },
    { x: -267, z: 345.5 },
    { x: -322, z: 354.5 },
    { x: -306, z: 354.5 },
    { x: -286, z: 354.5 },
    { x: -267, z: 354.5 },
  ];
  villageKerbLanterns.forEach((vkl) => {
    const vLantern = createDesertOilLanternMesh();
    vLantern.position.set(vkl.x, solariaBaseY, vkl.z);
    scene.add(vLantern);
    colliders.push({ type: 'circle', x: vkl.x, z: vkl.z, radius: 0.4, label: 'Lampu Kerb Desa Gurun' });
  });

  // 8. Solaria Village NPCs (Pedagang, Gadis Air, Penenun, Prajurit Gerbang)
  // Tariq Sang Saudagar Rempah (Inside Bazaar Stall 1: [-316, 342.0])
  const tariqGroup = createCustomNPCMesh('alchemist');
  const tariqPos: [number, number, number] = [-316, solariaBaseY, 342.0];
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

  // Amina Gadis Pembawa Air Oase (Standing by Side Oasis Well: [-306, 345.0])
  const aminaGroup = createCustomNPCMesh('villager');
  const aminaPos: [number, number, number] = [-306, solariaBaseY, 345.0];
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

  // Zahra Penenun Sutra (Inside Tent 1: [-274, 342.5])
  const zahraGroup = createCustomNPCMesh('bard');
  const zahraPos: [number, number, number] = [-274, solariaBaseY, 342.5];
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

  // Prajurit Gurun Solaria (Western Avenue Entrance: [-330, 345.5] di pos gerbang)
  const sGuardGroup = createCustomNPCMesh('guard');
  const sGuardPos: [number, number, number] = [-330, solariaBaseY, 345.5];
  sGuardGroup.position.set(...sGuardPos);
  sGuardGroup.rotation.y = Math.PI * 1.5; // Menghadap Barat ke arah Desert Avenue & Istana
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

  // ------------------------------------------
  // 5C. DEKORASI GURUN SOLARIA LUAR (Anti-Polos: Sandstone Pillars, Cacti, Dunes)
  // ------------------------------------------
  // Sandstone stacked pillars removed per user cleanup request

  // Cacti in Solaria Dunes (InstancedMesh - High Performance 60 FPS, draw call reduction)
  const desertCacti = [
    { x: -180, z: 80, s: 1.0 },
    { x: -200, z: 115, s: 1.2 },
    { x: -220, z: 145, s: 0.9 },
    { x: -255, z: 138, s: 1.1 },
    { x: -270, z: 210, s: 1.3 },
    { x: -230, z: 210, s: 1.0 },
    { x: -310, z: 250, s: 1.15 },
    { x: -170, z: 140, s: 0.85 },
    { x: -285, z: 160, s: 1.05 },
    { x: -205, z: 195, s: 1.1 },
  ];
  const cactiData = desertCacti.map((dc) => {
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
  // Seluruh lanskap gurun mengandalkan daratan utama terrainMesh alami yang mulus.

  // ==========================================
  // 6. THUNDERPEAK LIGHTNING SPIRE & MAGE TOWER SANCTUARY (North-West)
  // Struktur Megah 3D Mage Tower, Interior Bertingkat, Kristal Petir Bersinar, dan Dewan Penyihir
  // ==========================================
  const mageTowerBaseY = getTerrainHeight(-155, -135);

  // A. Struktur Eksterior 3D "Mage Tower" Puncak Halilintar (Center: [-155, -135])
  const mageTowerExterior = createMageTowerExteriorMesh();
  mageTowerExterior.position.set(-155, mageTowerBaseY, -135);
  scene.add(mageTowerExterior);
  colliders.push({
    type: 'circle',
    x: -155,
    z: -135,
    radius: 7.2,
    label: 'Menara Eksterior Mage Tower Puncak Halilintar',
  });

  // B. Interior Bertingkat 3D Mage Tower (Underground Interior Cell: [-155, -45, -135])
  // - Lantai 1 (Y: -45): Perpustakaan Kitab Kuno & Altar Teleport
  // - Lantai 2 (Y: -37.5): Laboratorium Alkimia & Meja Kristal Petir
  // - Lantai 3 (Y: -30.0): Anjungan Puncak Observatorium & Armillary Orrery
  const mageTowerInterior = createMageTowerInteriorMesh();
  mageTowerInterior.position.set(-155, -45, -135);
  scene.add(mageTowerInterior);

  // Interior Wall Box Colliders (Padat, terhubung tanpa celah, dan menyisakan pintu keluar selatan)
  colliders.push(
    { type: 'box', minX: -166, maxX: -144, minZ: -146, maxZ: -144, maxY: -10, label: 'Dinding Utara Interior Mage Tower' },
    { type: 'box', minX: -166, maxX: -164, minZ: -146, maxZ: -124, maxY: -10, label: 'Dinding Barat Interior Mage Tower' },
    { type: 'box', minX: -146, maxX: -144, minZ: -146, maxZ: -124, maxY: -10, label: 'Dinding Timur Interior Mage Tower' },
    { type: 'box', minX: -166, maxX: -157.5, minZ: -126, maxZ: -124, maxY: -10, label: 'Dinding Selatan Barat Interior Mage Tower' },
    { type: 'box', minX: -152.5, maxX: -144, minZ: -126, maxZ: -124, maxY: -10, label: 'Dinding Selatan Timur Interior Mage Tower' }
  );
  // Colliders Perabotan Lantai 1 (Perpustakaan & Lemari Kitab Kuno)
  colliders.push(
    { type: 'box', minX: -159, maxX: -151, minZ: -144, maxZ: -142, maxY: -38, label: 'Lemari Kitab Purba Utara' },
    { type: 'box', minX: -164, maxX: -162, minZ: -138, maxZ: -132, maxY: -38, label: 'Lemari Kitab Purba Barat' },
    { type: 'box', minX: -148, maxX: -146, minZ: -138, maxZ: -132, maxY: -38, label: 'Lemari Kitab Purba Timur' }
  );
  // Colliders Perabotan Lantai 2 (Meja Kristal Petir Alkimia)
  colliders.push({
    type: 'box',
    minX: -158,
    maxX: -152,
    minZ: -137,
    maxZ: -133,
    minY: -39,
    maxY: -32,
    label: 'Meja Eksperimen Kristal Petir Alkimia',
  });
  // Colliders Perabotan Lantai 3 (Orrery Observatorium)
  colliders.push({
    type: 'circle',
    x: -155,
    z: -135,
    radius: 1.6,
    minY: -31,
    maxY: -15,
    label: 'Pilar Armillary Orrery Observatorium',
  });

  // C. Dewan Penyihir Mage Tower (Unique Mage NPCs):
  // 1. Grand Mage Eldrin (Lantai 1: Altar Teleport [-155, -45, -137] jubah ungu & tongkat petir)
  const eldrinGroup = createGrandMageEldrinMesh();
  const eldrinPos: [number, number, number] = [-155, -45, -137];
  eldrinGroup.position.set(...eldrinPos);
  eldrinGroup.rotation.y = 0; // Menghadap ke Selatan ke arah altar & pintu masuk
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

  // 2. Sorceress Maya (Lantai 1: Perpustakaan Kitab Kuno [-158.5, -45, -133] jubah biru bintang)
  const sorceressMayaGroup = createSorceressMayaMesh();
  const sorceressMayaPos: [number, number, number] = [-158.5, -45, -133];
  sorceressMayaGroup.position.set(...sorceressMayaPos);
  sorceressMayaGroup.rotation.y = Math.PI / 2; // Menghadap ke Timur ke arah tengah perpustakaan
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

  // 3. Archmage Pyro (Lantai 2: Laboratorium Alkimia [-155, -37.5, -133] jubah api & tongkat menyala)
  const pyroGroup = createArchmagePyroMesh();
  const pyroPos: [number, number, number] = [-155, -37.5, -133];
  pyroGroup.position.set(...pyroPos);
  pyroGroup.rotation.y = Math.PI; // Menghadap ke meja kristal petir
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

  // D. Kristal Petir Biru Bersinar Menyala (Glowing Blue Lightning Crystals around Sanctuary)
  const lightningCrystalCoords = [
    { x: -144, z: -128, scale: 1.4 },
    { x: -166, z: -128, scale: 1.3 },
    { x: -144, z: -142, scale: 1.4 },
    { x: -166, z: -142, scale: 1.35 },
    { x: -155, z: -122, scale: 1.5 },
    { x: -155, z: -148, scale: 1.4 },
    { x: -172, z: -136, scale: 1.3 },
    { x: -138, z: -136, scale: 1.2 },
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
    { x: -175, z: -152 },
    { x: -135, z: -118 },
    { x: -170, z: -116 },
  ];
  secondarySpires.forEach((pos) => {
    const spire = createThunderSpireMesh();
    spire.scale.set(0.85, 0.95, 0.85);
    spire.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(spire);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Pilar Petir Melayang' });
  });

  // ==========================================
  // 7. JADE BAMBOO GROVE & PAGODA (South-East)
  // ==========================================
  const jadePagoda = createJadePagodaMesh();
  const pagodaY = getTerrainHeight(165, 115);
  jadePagoda.position.set(165, pagodaY, 115);
  scene.add(jadePagoda);
  colliders.push({
    type: 'box',
    minX: 159,
    maxX: 171,
    minZ: 109,
    maxZ: 121,
    label: 'Kuil Pagoda Giok Tiga Tingkat',
  });

  // Grand Torii Gate at mountain path
  const toriiGate = createToriiGateMesh();
  const toriiY = getTerrainHeight(144, 102);
  toriiGate.position.set(144, toriiY, 102);
  toriiGate.rotation.y = 0.55;
  scene.add(toriiGate);
  colliders.push(
    { type: 'circle', x: 142.5, z: 101, radius: 0.7, label: 'Pilar Torii Kiri' },
    { type: 'circle', x: 145.5, z: 103, radius: 0.7, label: 'Pilar Torii Kanan' }
  );

  // Bamboo / Zen pine clusters
  for (let i = 0; i < 24; i++) {
    const bx = 125 + Math.random() * 70;
    const bz = 80 + Math.random() * 70;
    if (Math.hypot(bx - 165, bz - 115) < 14) continue;
    const by = getTerrainHeight(bx, bz);
    const tree = createTreeMesh('fantasy');
    tree.position.set(bx, by, bz);
    const s = 0.8 + Math.random() * 0.5;
    tree.scale.set(s * 0.7, s * 1.5, s * 0.7);
    scene.add(tree);
    decorativeProps.push(tree);
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 0.55 * s, label: 'Bambu Giok' });
  }

  // ==========================================
  // 8. DRAGONFANG CALDERA & INFERNO ARCHIPELAGO (Far North)
  // Fosil Naga Raksasa, Retakan Tanah Berlapis Lava Merah, Pilar Batu Vulkanik Berapi, & Basalt Magma
  // ==========================================
  // A. Monumental Dragon Fossil Skull & Ribcage
  const dragonFossil = createDragonSkullBonesMesh();
  const dragonY = getTerrainHeight(20, -145);
  dragonFossil.position.set(20, dragonY, -145);
  scene.add(dragonFossil);
  colliders.push({
    type: 'box',
    minX: 16,
    maxX: 24,
    minZ: -155,
    maxZ: -140,
    label: 'Fosil Tengkorak Naga Purba',
  });

  // B. Retakan Tanah Berlapis Lava Merah Menyala (Glowing Red Molten Magma Cracks)
  const lavaCrackCoords = [
    { x: 22, z: -148, r: 4.2 },
    { x: 15, z: -165, r: 4.8 },
    { x: 32, z: -190, r: 5.2 },
    { x: 18, z: -230, r: 4.5 },
    { x: 35, z: -270, r: 5.5 },
    { x: 26, z: -285, r: 4.6 },
  ];
  lavaCrackCoords.forEach((lc) => {
    const crack = createLavaCrackMesh(lc.r);
    const cy = getTerrainHeight(lc.x, lc.z);
    crack.position.set(lc.x, cy + 0.02, lc.z);
    scene.add(crack);
  });

  // C. Pilar Batu Vulkanik Berapi / Kolom Basalt (Volcanic Basalt Pillars with Flaming Basins)
  const volcanicPillarCoords = [
    { x: 12, z: -140, h: 6.5 },
    { x: 28, z: -140, h: 7.2 },
    { x: 8, z: -170, h: 6.0 },
    { x: 32, z: -180, h: 8.0 },
    { x: 14, z: -220, h: 6.8 },
    { x: 38, z: -250, h: 8.5 },
    { x: 24, z: -280, h: 7.5 },
    { x: 42, z: -288, h: 8.0 },
  ];
  volcanicPillarCoords.forEach((vp) => {
    const pillar = createVolcanicPillarMesh(vp.h);
    const py = getTerrainHeight(vp.x, vp.z);
    pillar.position.set(vp.x, py, vp.z);
    scene.add(pillar);
    colliders.push({ type: 'circle', x: vp.x, z: vp.z, radius: 1.2, label: 'Pilar Vulkanik Berapi' });
  });

  // D. Bebatuan Vulkanik Hitam Berurat Magma (Jagged Volcanic Basalt Rocks)
  const basaltRockCoords = [
    { x: 6, z: -150, s: 1.4 },
    { x: 25, z: -155, s: 1.6 },
    { x: 36, z: -165, s: 1.8 },
    { x: 14, z: -185, s: 1.3 },
    { x: 28, z: -210, s: 1.7 },
    { x: 12, z: -240, s: 1.5 },
    { x: 34, z: -265, s: 1.8 },
    { x: 20, z: -276, s: 1.4 },
    { x: 40, z: -290, s: 1.9 },
  ];
  basaltRockCoords.forEach((br) => {
    const rock = createVolcanicBasaltRockMesh(br.s);
    const ry = getTerrainHeight(br.x, br.z);
    rock.position.set(br.x, ry, br.z);
    scene.add(rock);
    colliders.push({ type: 'circle', x: br.x, z: br.z, radius: 1.3 * br.s, label: 'Batu Vulkanik Basalt' });
  });

  // E. Surrounding Volcanic Horn Arches
  for (const hPos of [{ x: 38, z: -138 }, { x: 2, z: -154 }, { x: 32, z: -158 }]) {
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

  // ==========================================
  // 8b. GRAND IMPERIAL KINGDOM OF ASTRAEA (Far North Frostpeak Metropolis)
  // Relocated to the northern reaches of Frostpeak (Lv.5), completely separated from Val-Kragor (Z = -260 vs Z = -17).
  // Grand West Gatehouse facing West (270° / Math.PI * 1.5).
  // All structures sit perfectly on flat snow plateau at Y = 6.0 (zero gap).
  // ==========================================
  const astraeaBaseY = 6.0;

  // A. Grand Imperial Sun Palace of Astraea (East End: X: 195, Z: -260)
  // Facing WEST (Direction: 270° / rotation.y = Math.PI * 1.5)
  // Grand staircase descends West to elevated marble entry esplanade (X: 174..180)
  const imperialPalace = createImperialPalaceMesh();
  imperialPalace.position.set(200, astraeaBaseY, -260);
  imperialPalace.rotation.y = Math.PI * 1.5;
  scene.add(imperialPalace);
  colliders.push({
    type: 'box',
    minX: 191,
    maxX: 211,
    minZ: -271,
    maxZ: -249,
    label: 'Istana Kerajaan Kaisar Astraea',
  });

  // B. Grand Circular Stone Plaza & Jalan Lingkar (Center: X: 164, Z: -260, Radius: 11.5m)
  // Surrounds the central fountain with polished white marble and a sunburst ringroad!
  const circularPlaza = createCircularPlazaMesh(11.5, 4.8);
  circularPlaza.position.set(164, astraeaBaseY, -260);
  scene.add(circularPlaza);

  // B2. Celestial 3-Tier Fountain of Immortality (Relocated to Center of Circular Plaza at X: 164, Z: -260)
  // Perfectly centered inside the circular stone roundabout, completely clear of the red carpet!
  const celestialFountain = createImperialFountainMesh();
  celestialFountain.position.set(164, astraeaBaseY, -260);
  scene.add(celestialFountain);
  colliders.push({
    type: 'circle',
    x: 164,
    z: -260,
    radius: 4.8,
    label: 'Air Mancur Keabadian Alun-Alun Astraea',
  });

  // B3. Four Golden Heroic Statues Placed at Diagonal Corners of Circular Plaza (NW, NE, SW, SE)
  // Membebaskan alur jalan lurus Z = -260 100% BERSIH tanpa halangan dari Gerbang Barat ke Pintu Istana!
  const heroStatues = [
    { x: 156, z: -268, ry: Math.PI * 0.75 }, // Barat Laut
    { x: 172, z: -268, ry: Math.PI * 1.25 }, // Timur Laut
    { x: 156, z: -252, ry: Math.PI * 0.25 }, // Barat Daya
    { x: 172, z: -252, ry: -Math.PI * 0.25 }, // Timur Daya
  ];
  heroStatues.forEach((hs, idx) => {
    const statue = createImperialHeroStatueMesh();
    statue.position.set(hs.x, astraeaBaseY, hs.z);
    statue.rotation.y = hs.ry;
    scene.add(statue);
    colliders.push({ type: 'circle', x: hs.x, z: hs.z, radius: 1.4, label: `Monumen Ksatria Emas ${idx + 1}` });
  });

  // B4. Tiang Lampu Emas Kerajaan di Sepanjang Pinggir Jalan Lingkar & Flanking Alur Istana
  // Seluruh tiang lampu berada di pinggir alur jalan (Z = -264 & Z = -256), alur jalan tengah Z = -260 tetap lapang!
  const astraeaStreetlamps = [
    // North Parallel Row (Flanking Bazaar Stalls outside plaza circle, Z = -274)
    { x: 152, z: -274 },
    { x: 164, z: -274 },
    { x: 176, z: -274 },
    // South Parallel Row (Flanking Bazaar Stalls outside plaza circle, Z = -246)
    { x: 152, z: -246 },
    { x: 164, z: -246 },
    { x: 176, z: -246 },
    // Avenue from West Gate towards Plaza (Flanking Z = -260 avenue)
    { x: 150, z: -264.5 },
    { x: 150, z: -255.5 },
    // Grand Esplanade approaching Palace Stairs (Flanking open carpet promenade)
    { x: 178, z: -265.0 },
    { x: 178, z: -255.0 },
    { x: 186, z: -265.0 },
    { x: 186, z: -255.0 },
  ];
  astraeaStreetlamps.forEach((sl) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(sl.x, astraeaBaseY, sl.z);
    scene.add(lamp);
    colliders.push({ type: 'circle', x: sl.x, z: sl.z, radius: 0.35, label: 'Lampu Emas Kerajaan' });
  });

  // C. West Imperial Gatehouse (West Entrance, X: 148, Z: -260)
  // Facing WEST (Rotation Y = 270° / Math.PI * 1.5) towards western highway
  const imperialGatehouse = createImperialGatehouseMesh();
  imperialGatehouse.position.set(148, astraeaBaseY, -260);
  imperialGatehouse.rotation.y = Math.PI * 1.5;
  scene.add(imperialGatehouse);
  colliders.push(
    { type: 'box', minX: 145.5, maxX: 150.5, minZ: -268, maxZ: -263, label: 'Bastion Utara Gerbang Barat Astraea' },
    { type: 'box', minX: 145.5, maxX: 150.5, minZ: -257, maxZ: -252, label: 'Bastion Selatan Gerbang Barat Astraea' }
  );

  // D. Solid Imperial Fortress Wall Perimeter Enclosing Capital
  // 1. West Wall - North Wing (from Gatehouse [148, -265.5] to NW corner [148, -285], length 19.5)
  const wallWestNorth = createImperialWallMesh(19.5);
  wallWestNorth.position.set(148, astraeaBaseY, -275.25);
  wallWestNorth.rotation.y = Math.PI / 2;
  scene.add(wallWestNorth);
  colliders.push({ type: 'box', minX: 146.5, maxX: 149.5, minZ: -285, maxZ: -265.5, label: 'Benteng Astraea Barat Utara' });

  // 2. West Wall - South Wing (from Gatehouse [148, -254.5] to SW corner [148, -235], length 19.5)
  const wallWestSouth = createImperialWallMesh(19.5);
  wallWestSouth.position.set(148, astraeaBaseY, -244.75);
  wallWestSouth.rotation.y = Math.PI / 2;
  scene.add(wallWestSouth);
  colliders.push({ type: 'box', minX: 146.5, maxX: 149.5, minZ: -254.5, maxZ: -235, label: 'Benteng Astraea Barat Selatan' });

  // 3. North Wall (from [148, -285] to [212, -285], length 64)
  for (let w = 0; w < 2; w++) {
    const wx = 164 + w * 32;
    const nWall = createImperialWallMesh(32);
    nWall.position.set(wx, astraeaBaseY, -285);
    scene.add(nWall);
  }
  colliders.push({ type: 'box', minX: 148, maxX: 212, minZ: -286.5, maxZ: -283.5, label: 'Benteng Astraea Utara' });

  // 4. South Wall (from [148, -235] to [212, -235], length 64)
  for (let w = 0; w < 2; w++) {
    const wx = 164 + w * 32;
    const sWall = createImperialWallMesh(32);
    sWall.position.set(wx, astraeaBaseY, -235);
    scene.add(sWall);
  }
  colliders.push({ type: 'box', minX: 148, maxX: 212, minZ: -236.5, maxZ: -233.5, label: 'Benteng Astraea Selatan' });

  // 5. East Wall (behind Palace, from [212, -285] to [212, -235], length 50)
  for (let w = 0; w < 2; w++) {
    const wz = -272.5 + w * 25;
    const eWall = createImperialWallMesh(25);
    eWall.position.set(212, astraeaBaseY, wz);
    eWall.rotation.y = Math.PI / 2;
    scene.add(eWall);
  }
  colliders.push({ type: 'box', minX: 210.5, maxX: 213.5, minZ: -285, maxZ: -235, label: 'Benteng Astraea Timur' });

  // 6. Four Corner Bastion Towers
  const cornerTowers = [
    { x: 148, z: -235, label: 'Menara Benteng Barat Daya Astraea' },
    { x: 212, z: -235, label: 'Menara Benteng Tenggara Astraea' },
    { x: 148, z: -285, label: 'Menara Benteng Barat Laut Astraea' },
    { x: 212, z: -285, label: 'Menara Benteng Timur Laut Astraea' },
  ];
  cornerTowers.forEach((ct) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(ct.x, astraeaBaseY, ct.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: ct.x, z: ct.z, radius: 2.8, label: ct.label });
  });

  // E. Symmetrical Grand Royal Bazaar Stalls Flanking North & South Promenades
  // North Promenade (Facing South towards circular plaza at Z = -274):
  const astraeaStall1 = createImperialBazaarStallMesh(0x9333ea, 0xfacc15); // Celestial Potions (Lyra)
  astraeaStall1.position.set(158, astraeaBaseY, -274);
  astraeaStall1.rotation.y = Math.PI;
  scene.add(astraeaStall1);
  colliders.push({ type: 'box', minX: 156, maxX: 160, minZ: -276, maxZ: -272, label: 'Kios Alkimia Kerajaan' });

  const astraeaStall2 = createImperialBazaarStallMesh(0x2563eb, 0x38bdf8); // Masterwork Armory
  astraeaStall2.position.set(170, astraeaBaseY, -274);
  astraeaStall2.rotation.y = Math.PI;
  scene.add(astraeaStall2);
  colliders.push({ type: 'box', minX: 168, maxX: 172, minZ: -276, maxZ: -272, label: 'Kios Senjata Astraea' });

  // South Promenade (Facing North towards circular plaza at Z = -246):
  const astraeaStall3 = createImperialBazaarStallMesh(0xd97706, 0xfef08a); // Silk & Relics
  astraeaStall3.position.set(158, astraeaBaseY, -246);
  astraeaStall3.rotation.y = 0;
  scene.add(astraeaStall3);
  colliders.push({ type: 'box', minX: 156, maxX: 160, minZ: -248, maxZ: -244, label: 'Kios Sutra Emas' });

  const astraeaStall4 = createImperialBazaarStallMesh(0x059669, 0xa7f3d0); // Royal Provisions
  astraeaStall4.position.set(170, astraeaBaseY, -246);
  astraeaStall4.rotation.y = 0;
  scene.add(astraeaStall4);
  colliders.push({ type: 'box', minX: 168, maxX: 172, minZ: -248, maxZ: -244, label: 'Kios Perjamuan Kaisar' });

  // G. Snowy Pine Trees along Avenue and Courtyard (Thematic Snow Alpine Vegetation)
  const astraeaCourtyardPineCoords = [
    { x: 155, z: -268 }, { x: 155, z: -252 },
    { x: 188, z: -268 }, { x: 188, z: -252 },
    { x: 162, z: -278 }, { x: 162, z: -242 },
    { x: 194, z: -278 }, { x: 194, z: -242 },
    { x: 204, z: -278 }, { x: 204, z: -242 },
  ];
  astraeaCourtyardPineCoords.forEach((pc) => {
    const s = 0.95 + Math.random() * 0.35;
    const pTree = createSnowyPineTreeMesh(s);
    pTree.position.set(pc.x, astraeaBaseY, pc.z);
    scene.add(pTree);
    colliders.push({ type: 'circle', x: pc.x, z: pc.z, radius: 0.6 * s, label: 'Pohon Pinus Salju Astraea' });
  });

  // H. Astraea Royal NPCs
  // NPC 13: Kaisar Aurelius Astraea (Standing on Throne Portico at entrance, facing West down the carpet)
  const emperorGroup = createCustomNPCMesh('emperor');
  const emperorPos: [number, number, number] = [192.2, astraeaBaseY + 1.6, -260];
  emperorGroup.position.set(...emperorPos);
  emperorGroup.rotation.y = Math.PI * 1.5; // Facing West towards royal carpet and plaza
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
  const marshalPos: [number, number, number] = [179, astraeaBaseY, -255];
  marshalGroup.position.set(...marshalPos);
  marshalGroup.rotation.y = Math.PI * 1.5;
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

  // NPC 15: Saudagar Kerajaan Lyra (At Alchemy Stall, facing South into plaza)
  const lyraGroup = createCustomNPCMesh('alchemist');
  const lyraPos: [number, number, number] = [159, astraeaBaseY, -271];
  lyraGroup.position.set(...lyraPos);
  lyraGroup.rotation.y = Math.PI;
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

  // NPC 16: Penjaga Gerbang Emas Astraea (Outside West Gate, facing West)
  const astraeaGuardGroup = createCustomNPCMesh('guard');
  const astraeaGuardPos: [number, number, number] = [146, astraeaBaseY, -263];
  astraeaGuardGroup.position.set(...astraeaGuardPos);
  astraeaGuardGroup.rotation.y = Math.PI * 1.5; // Facing West guarding entrance
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
  // 8c. NORTHERN FROSTPEAK DOMAIN & FROZEN CHASM
  // Ancient Ice Spike Mountain Clusters, Natural Ice Bridge across Chasm, and Outer Ice Watchtowers
  // ==========================================
  // 1. Natural Crystalline Ice Bridge Spanning the Chasm (X: 180, Z: -300..-340)
  const chasmBridgeGeo = new THREE.BoxGeometry(10, 1.2, 42);
  const chasmBridgeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const chasmBridge = new THREE.Mesh(chasmBridgeGeo, chasmBridgeMat);
  chasmBridge.position.set(180, 4.6, -320);
  scene.add(chasmBridge);

  // Ice Bridge crystalline handrails
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0x0284c7,
    emissiveIntensity: 0.2,
  });
  const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 42), railMat);
  railLeft.position.set(175.2, 5.4, -320);
  scene.add(railLeft);
  const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 42), railMat);
  railRight.position.set(184.8, 5.4, -320);
  scene.add(railRight);

  colliders.push(
    { type: 'box', minX: 174.8, maxX: 175.6, minZ: -341, maxZ: -299, label: 'Pagar Kiri Jembatan Es Purba' },
    { type: 'box', minX: 184.4, maxX: 185.2, minZ: -341, maxZ: -299, label: 'Pagar Kanan Jembatan Es Purba' }
  );

  // 2. Towering Ancient Ice Spike Mountain Clusters in Far Northern Glacier Ridge
  const iceSpikeClusters = [
    { pos: [140, 1.3, -370], scale: 1.15 },
    { pos: [175, 1.8, -390], scale: 1.35 },
    { pos: [210, 1.5, -365], scale: 1.2 },
    { pos: [120, 1.4, -410], scale: 1.25 },
    { pos: [195, 1.9, -420], scale: 1.4 },
    { pos: [240, 1.6, -380], scale: 1.2 },
  ];
  iceSpikeClusters.forEach((isc, idx) => {
    const spike = createIceSpikeMountainMesh(isc.scale);
    spike.position.set(isc.pos[0], isc.pos[1], isc.pos[2]);
    scene.add(spike);
    colliders.push({
      type: 'circle',
      x: isc.pos[0],
      z: isc.pos[2],
      radius: 9.5 * isc.scale,
      label: `Pegunungan Kristal Es Purba ${idx + 1}`,
    });
  });

  // 3. Outer Ice Watchtowers guarding Northern Frozen Chasm
  const outerIceTowers = [
    { x: 148, z: -298, label: 'Menara Pengawas Jurang Es Barat' },
    { x: 180, z: -298, label: 'Menara Pengawas Gerbang Jurang Es' },
    { x: 212, z: -298, label: 'Menara Pengawas Jurang Es Timur' },
  ];
  outerIceTowers.forEach((oit) => {
    const iTower = createFortressWatchtowerMesh();
    iTower.position.set(oit.x, getTerrainHeight(oit.x, oit.z), oit.z);
    scene.add(iTower);
    colliders.push({ type: 'circle', x: oit.x, z: oit.z, radius: 2.5, label: oit.label });
  });

  // 4. Glowing Ice Crystals around Northern Chasm
  const chasmCrystalCoords = [
    [172, -305], [188, -305], [172, -335], [188, -335],
    [160, -320], [200, -320], [145, -350], [215, -350]
  ];
  chasmCrystalCoords.forEach(([cx, cz]) => {
    const cy = getTerrainHeight(cx, cz);
    const cluster = createIceCrystalClusterMesh();
    cluster.position.set(cx, cy, cz);
    cluster.scale.setScalar(1.2);
    scene.add(cluster);
    colliders.push({ type: 'circle', x: cx, z: cz, radius: 1.2, label: 'Kristal Es Jurang Purba' });
  });

  // ==========================================
  
  // ==========================================
  // 9. EXPANDED CONTINENT LANDMARKS & SECRET ZONES
  // ==========================================

  // 9.1 Secret Palm Oasis of Solaria ([-340, 260])
  const oasisPoolGeo = new THREE.CylinderGeometry(14, 14, 0.4, 24);
  const oasisPoolMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const oasisPool = new THREE.Mesh(oasisPoolGeo, oasisPoolMat);
  oasisPool.position.set(-340, 0.05, 260);
  scene.add(oasisPool);

  // Oasis Palm Ring (InstancedMesh - High Performance)
  const oasisPalmsData: { x: number; y: number; z: number; rotationY: number }[] = [];
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    const px = -340 + Math.cos(angle) * 17;
    const pz = 260 + Math.sin(angle) * 17;
    const py = getTerrainHeight(px, pz);
    oasisPalmsData.push({ x: px, y: py, z: pz, rotationY: angle + 0.5 });
    colliders.push({ type: 'circle', x: px, z: pz, radius: 0.65, label: 'Pohon Palem Oase' });
  }
  const oasisPalmsMesh = createInstancedDesertPalms(oasisPalmsData);
  scene.add(oasisPalmsMesh);

  // Ancient sandstone arches at Oasis
  const oasisArch = createAncientArchMesh();
  oasisArch.position.set(-340, getTerrainHeight(-340, 242), 242);
  scene.add(oasisArch);

  // 9.2 Outer Frostpeak Glacier Watchtower & Ice Spire Ridge ([240, -220])
  const glacierTower = createFortressWatchtowerMesh();
  const gty = getTerrainHeight(240, -220);
  glacierTower.position.set(240, gty, -220);
  scene.add(glacierTower);
  colliders.push({ type: 'circle', x: 240, z: -220, radius: 2.8, label: 'Menara Gletser Frostpeak' });

  for (const gc of [{ x: 228, z: -212 }, { x: 252, z: -228 }, { x: 245, z: -205 }]) {
    const cCluster = createIceCrystalClusterMesh(true);
    cCluster.position.set(gc.x, getTerrainHeight(gc.x, gc.z), gc.z);
    scene.add(cCluster);
  }

  // 9.3 Primal Dragon Magma Core ([35, -280])
  const dragonSkullCore = createDragonSkullBonesMesh();
  const dcy = getTerrainHeight(35, -280);
  dragonSkullCore.position.set(35, dcy, -280);
  dragonSkullCore.scale.set(1.4, 1.4, 1.4);
  scene.add(dragonSkullCore);
  colliders.push({ type: 'box', minX: 25, maxX: 45, minZ: -290, maxZ: -270, label: 'Kerangka Naga Inti' });

  // 9.4 Shadowfen Deep Hollow ([ -300, 25 ])
  const deepShrooms = [
    { x: -300, z: 25, color: 0xa855f7, s: 1.8 },
    { x: -312, z: 32, color: 0x06b6d4, s: 1.5 },
    { x: -288, z: 18, color: 0x10b981, s: 1.4 },
    { x: -295, z: 38, color: 0xec4899, s: 1.6 },
  ];
  deepShrooms.forEach((sc) => {
    const shroom = createGiantMushroomMesh(sc.color);
    shroom.position.set(sc.x, getTerrainHeight(sc.x, sc.z), sc.z);
    shroom.scale.set(sc.s, sc.s, sc.s);
    scene.add(shroom);
    colliders.push({ type: 'circle', x: sc.x, z: sc.z, radius: 0.85, label: 'Jamur Raksasa Purba' });
  });

  // 9.5 Celestial Jade Bamboo Sanctuary ([310, 210])
  const celestialTorii = createToriiGateMesh();
  celestialTorii.position.set(310, getTerrainHeight(310, 210), 210);
  scene.add(celestialTorii);
  colliders.push({ type: 'box', minX: 306, maxX: 314, minZ: 208, maxZ: 212, label: 'Gerbang Torii Langit' });

  const celestialPagodaOuter = createJadePagodaMesh();
  celestialPagodaOuter.position.set(325, getTerrainHeight(325, 220), 220);
  scene.add(celestialPagodaOuter);
  colliders.push({ type: 'box', minX: 321, maxX: 329, minZ: 216, maxZ: 224, label: 'Paviliun Pagoda Langit' });

  // ==========================================
  // 9. TREASURE CHESTS (Across all diverse regions!)
  // ==========================================
  const chestData = [
    { id: 'chest_village', pos: [-4, 0, 4] as [number, number, number] },
    { id: 'chest_beach', pos: [-3.0, 1.85, 73] as [number, number, number] }, // Seaward Pier Head Platform Stash
    { id: 'chest_ruins', pos: [-120, 0, 36] as [number, number, number] }, // Ancient ruins altar (Upstream Outskirts)
    { id: 'chest_forest', pos: [38, 0, 12] as [number, number, number] }, // Mystic deep forest
    { id: 'chest_boss_gateway', pos: [0, 0, -38] as [number, number, number] }, // Entrance to Titan Crater
    { id: 'chest_valkragor', pos: [208, 0, -20] as [number, number, number] }, // Fortress keep secret treasury
    { id: 'chest_frostpeak', pos: [115, 0, -65] as [number, number, number] }, // Cryo Altar Summit
    { id: 'chest_shadowfen', pos: [-110, 0, 12] as [number, number, number] }, // Shadowfen smuggler cache
    { id: 'chest_coralcove', pos: [86, 0, 56] as [number, number, number] }, // Shipwreck pirate gold
    { id: 'chest_solaria_palace', pos: [-428, -25 + 1.2, 354] as [number, number, number] }, // Istana Sultan Solaria Vault (Throne Room)
    { id: 'chest_solaria', pos: [-165, 0, 110] as [number, number, number] }, // Solaria Pharaoh Gold
    { id: 'chest_thunderpeak', pos: [-155, 0, -135] as [number, number, number] }, // Storm Altar Relic
    { id: 'chest_jadepagoda', pos: [165, 0, 115] as [number, number, number] }, // Celestial Pagoda Treasure
    { id: 'chest_dragoncaldera', pos: [20, 0, -145] as [number, number, number] }, // Dragon Hoard
    { id: 'chest_astraea', pos: [204, 0, -260] as [number, number, number] }, // Astraea Imperial Vault
    { id: 'chest_frozen_chasm', pos: [180, 0, -325] as [number, number, number] }, // Ancient Chasm Relic Chest
    { id: 'chest_harbor_galleon', pos: [16, 0, 42] as [number, number, number] }, // Harbor Galleon Stash
    { id: 'chest_solaria_oasis', pos: [-340, 0, 260] as [number, number, number] }, // Secret Oasis Treasure
    { id: 'chest_frostpeak_glacier', pos: [240, 0, -220] as [number, number, number] }, // Glacier Vault
    { id: 'chest_dragon_core', pos: [35, 0, -280] as [number, number, number] }, // Primal Magma Core Relic
    { id: 'chest_shadowfen_deep', pos: [-300, 0, 25] as [number, number, number] }, // Deep Hollow Cache
    { id: 'chest_jade_sanctuary', pos: [325, 0, 220] as [number, number, number] }, // Celestial Sanctuary Gold
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
  // 6. VOLCANIC ARENA (North)
  // ==========================================
  const bossPortalRing = new THREE.Mesh(
    new THREE.TorusGeometry(8.5, 0.45, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      emissive: 0xd50000,
      emissiveIntensity: 0.85,
    })
  );
  bossPortalRing.rotation.x = Math.PI / 2;
  const bz = -52;
  bossPortalRing.position.set(0, getTerrainHeight(0, bz) + 0.25, bz);
  scene.add(bossPortalRing);

  // Volcanic Molten Magma pool in center of arena
  const lavaGeo = new THREE.CircleGeometry(6.5, 20);
  lavaGeo.rotateX(-Math.PI / 2);
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff5722,
    emissive: 0xff3d00,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  const lavaMesh = new THREE.Mesh(lavaGeo, lavaMat);
  lavaMesh.position.set(0, getTerrainHeight(0, bz) + 0.15, bz);
  scene.add(lavaMesh);

  // Boss arena beacon light
  const bossLight = new THREE.PointLight(0xff3d00, 2.5, 32);
  bossLight.position.set(0, getTerrainHeight(0, bz) + 4.5, bz);
  scene.add(bossLight);


  // 11. REGIONAL CHECKPOINT & WAYPOINT TELEPORTATION MONUMENTS
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
      nameId: 'Alun-Alun Desa Sanctuary',
      pos: [0, -8],
    },
    {
      id: 'wp_harbor',
      name: 'Sanctuary Coastal Harbor',
      nameId: 'Dermaga Pelabuhan Sanctuary',
      pos: [0, 24],
    },
    {
      id: 'wp_valkragor',
      name: 'Val-Kragor Fortress Plaza',
      nameId: 'Alun-Alun Benteng Val-Kragor',
      pos: [186, -10],
    },
    {
      id: 'wp_astraea',
      name: 'Grand Imperial Capital Astraea',
      nameId: 'Alun-Alun Ibukota Emas Astraea',
      pos: [164, -248],
    },
    {
      id: 'wp_shadowfen',
      name: 'Shadowfen Ancient Marsh',
      nameId: 'Pusat Rawa Bayangan Purba',
      pos: [-105, 14],
    },
    {
      id: 'wp_solaria_village',
      name: 'Solaria Desert Village & Palace',
      nameId: 'Alun-Alun Desa & Istana Gurun Solaria',
      pos: [-350, 350],
    },
    {
      id: 'wp_solaria',
      name: 'Solaria Golden Desert Pyramid',
      nameId: 'Piramida Emas Gurun Solaria',
      pos: [-165, 110],
    },
    {
      id: 'wp_jadepagoda',
      name: 'Jade Bamboo Pagoda Shrine',
      nameId: 'Kuil Pagoda Giok & Bambu',
      pos: [165, 115],
    },
    {
      id: 'wp_frostpeak',
      name: 'Frostpeak Glacier Summit',
      nameId: 'Kuil Es Puncak Frostpeak',
      pos: [115, -65],
    },
    {
      id: 'wp_thunderpeak',
      name: 'Thunderpeak Basalt Altar',
      nameId: 'Altar Menara Puncak Halilintar',
      pos: [-155, -135],
    },
    {
      id: 'wp_dragoncaldera',
      name: 'Primal Dragonfang Caldera',
      nameId: 'Altar Kaldera Sarang Naga Purba',
      pos: [20, -125],
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
    getTerrainHeight,
  };
}
