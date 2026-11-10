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
  createAncientMonsterRibMesh,
  createCrackedSandstoneObeliskMesh,
  createSandVortexSwirlMesh,
} from './models';
import { buildWorldRoadNetwork, isPointOnRoad } from '../RoadSystem';

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
  const segmentsX = 256;
  const segmentsZ = 256;
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

    // 1. Suspension bridge walkable deck corridor (centered straight at z = 47)
    if (Math.abs(z - 47) <= 2.2 && x >= 135.5 && x <= 154.5) {
      return 1.35;
    }

    // 2. Coastal Wooden Harbor (Seamless Beach Connection, Extended Main Pier, Symmetrical Wings & Pier Head)
    // 2a. Beach shoreline boardwalk apron (z: 198.0..202.0)
    if (Math.abs(x) <= 3.5 && z >= 198.0 && z < 202.0) {
      const t = (z - 198.0) / 4.0;
      return 0.25 - t * 0.10; // Smooth 0.25 -> 0.15 transition onto ramp foot
    }
    // 2b. Wooden Beach Ramp & Short Stairs (z: 201.5..205.5, rises smoothly 0.15 -> 1.85)
    if (Math.abs(x) <= 2.6 && z >= 201.5 && z < 205.5) {
      const t = (z - 201.5) / 4.0;
      return 0.15 + t * 1.70;
    }
    // 2c. Extended Main Straight Pier (z: 205.5..253.5, |x| <= 2.6)
    // 2d. Seaward Pier Head Platform (z: 253.5..259.5, |x| <= 5.2)
    // 2e. Inner Symmetrical Berthing Wings (z: 218.8..223.2, |x| <= 15.0)
    // 2f. Outer Symmetrical Berthing Wings (z: 234.8..239.2, |x| <= 15.0)
    // 2g. Boarding Gangways to Ships (|x|: 14.4..18.5, z: 219.8..222.2)
    if (
      (Math.abs(x) <= 2.6 && z >= 205.5 && z <= 253.5) ||
      (Math.abs(x) <= 5.2 && z >= 253.5 && z <= 259.5) ||
      (Math.abs(z - 221.0) <= 2.2 && Math.abs(x) <= 15.0) ||
      (Math.abs(z - 237.0) <= 2.2 && Math.abs(x) <= 15.0) ||
      (Math.abs(z - 221.0) <= 1.2 && Math.abs(x) >= 14.4 && Math.abs(x) <= 18.5)
    ) {
      return 1.85; // Solid continuous wooden pier deck
    }

    // 3. Relocated Fortress Val-Kragor Solid Courtyard (Center [380, 80], radius 38 at y = 2.50)
    if (Math.hypot(x - 380, z - 80) <= 38) {
      return 2.50;
    }

    // 4. Imperial Capital Astraea Courtyard & Esplanade (Center [-340, -220], radius 46 at y = 2.00)
    if (Math.hypot(x - -340, z - -220) <= 46) {
      return 2.00;
    }

    // 5. Solaria Desert Village Bazaar & Grand Palace (Taj Mahal) Courtyard (y = 1.80..2.00)
    if (Math.hypot(x - 280, z - -280) <= 45) return 1.80;
    if (Math.hypot(x - 340, z - -280) <= 35) return 2.00;
    if (x >= 250 && x <= 370 && Math.abs(z - -280) <= 25) return 1.90;

    // 6. Ancient Titan Sanctuary Basin Arena (Center [-196, -254], radius 40 at y = 0.20)
    if (Math.hypot(x - -196, z - -254) <= 40) return 0.20;

    // 7. Primal Dragonfang Caldera (Center [80, 360], radius 45 at y = 2.50)
    if (Math.hypot(x - 80, z - 360) <= 45) return 2.50;

    // 8. Mage Tower Puncak Halilintar (Center [180, 60], radius 20 at y = 4.50)
    if (Math.hypot(x - 180, z - 60) <= 20) return 4.50;

    // 9. Exact rendered polygon surface
    return getMeshSurfaceHeight(x, z);
  };

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
  // 1b. EXTENDED CONTINUOUS COASTAL HARBOR (Sea Shoreline at Z >= 201.5)
  // Dermaga Kayu Utama Diperpanjang Lurus ke Arah Laut Terbuka (Z: 198.0..259.5)
  // Sambungan padat dari pangkal tangga hingga anjungan laut lepas TANPA CELAH air di tengah jalan!
  // Dua pasang cabang bersandar kapal yang simetris, presisi, dan kokoh di sisi kiri dan kanan.
  // ==========================================
  const dockY = -0.375; // Aligns top of 2.1m deck + 0.125m plank exactly at y = 1.85

  // 0. Shoreline Boardwalk Apron (Z: 198.0..202.0, menghubungkan jalan setapak tanah desa ke pangkal tangga)
  const shorelineBoardwalk = createDockShorelineBoardwalkMesh(5.6, 4.0);
  shorelineBoardwalk.position.set(0, 0.22, 198.0);
  scene.add(shorelineBoardwalk);

  // 1. Wooden Beach Ramp & Short Stairs (Z: 201.5..205.5, menanjak mulus 0.15 -> 1.85)
  const beachRamp = createDockStairRampMesh(4.8, 4.0, 1.8);
  beachRamp.position.set(0, 0.05, 201.5);
  scene.add(beachRamp);

  // 2. Extended Main Straight Pier (Dermaga Utama Lebar 4.8m Membentang Lurus ke Laut Lepas)
  // Section 1: Pangkal tangga ke cabang bersandar dalam (X: 0, Z: 205.5..221.5, panjang 16m)
  const pierMain1 = createPierDockMesh({ length: 16.0, width: 4.8, pileDepth: 7.0, hasMooringBollards: true });
  pierMain1.position.set(0, dockY, 205.5);
  scene.add(pierMain1);

  // Section 2: Cabang dalam ke cabang luar (X: 0, Z: 221.5..237.5, panjang 16m)
  const pierMain2 = createPierDockMesh({ length: 16.0, width: 4.8, pileDepth: 7.5, hasMooringBollards: true });
  pierMain2.position.set(0, dockY, 221.5);
  scene.add(pierMain2);

  // Section 3: Jalur laut lepas ke anjungan (X: 0, Z: 237.5..253.5, panjang 16m)
  const pierMain3 = createPierDockMesh({ length: 16.0, width: 4.8, pileDepth: 8.0, hasMooringBollards: true });
  pierMain3.position.set(0, dockY, 237.5);
  scene.add(pierMain3);

  // Section 4: Anjungan Ujung Dermaga Laut Lepas (Seaward Pier Head Platform: X: -5.0..5.0, Z: 253.5..259.5, lebar 10m)
  const pierHeadPlatform = createPierDockMesh({ length: 6.0, width: 10.0, pileDepth: 8.5, hasLantern: true, lanternSide: 'both', hasMooringBollards: true });
  pierHeadPlatform.position.set(0, dockY, 253.5);
  scene.add(pierHeadPlatform);

  // 3. Two Symmetrical Pairs of Berthing Wings (Dua Pasang Cabang Tempat Bersandar Kapal Simetris)
  // Branch 1: Inner Symmetrical Berthing Wings (Z = 221.0, Lebar 4.0m, Panjang 13.0m)
  // Sayap Barat 1 (Kiri: menempel padat dari X = -2.4 menjulur ke X = -15.4 tanpa celah!)
  const wingWest1 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.2, hasLantern: true, lanternSide: 'left', hasMooringBollards: true });
  wingWest1.position.set(-2.4, dockY, 221.0);
  wingWest1.rotation.y = Math.PI * 1.5;
  scene.add(wingWest1);

  // Sayap Timur 1 (Kanan: menempel padat dari X = 2.4 menjulur ke X = 15.4 tanpa celah!)
  const wingEast1 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.2, hasLantern: true, lanternSide: 'right', hasMooringBollards: true });
  wingEast1.position.set(2.4, dockY, 221.0);
  wingEast1.rotation.y = Math.PI / 2;
  scene.add(wingEast1);

  // Branch 2: Outer Symmetrical Berthing Wings (Z = 237.0, Lebar 4.0m, Panjang 13.0m)
  // Sayap Barat 2 (Kiri luar: menempel padat dari X = -2.4 menjulur ke X = -15.4)
  const wingWest2 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.8, hasLantern: true, lanternSide: 'left', hasMooringBollards: true });
  wingWest2.position.set(-2.4, dockY, 237.0);
  wingWest2.rotation.y = Math.PI * 1.5;
  scene.add(wingWest2);

  // Sayap Timur 2 (Kanan luar: menempel padat dari X = 2.4 menjulur ke X = 15.4)
  const wingEast2 = createPierDockMesh({ length: 13.0, width: 4.0, pileDepth: 7.8, hasLantern: true, lanternSide: 'right', hasMooringBollards: true });
  wingEast2.position.set(2.4, dockY, 237.0);
  wingEast2.rotation.y = Math.PI / 2;
  scene.add(wingEast2);

  // 4. Moored Main Ships & Boarding Gangways
  // Grand Merchant Galleon 1 (Bertambat rapi di samping Sayap Timur 1, X: 19.5, Z: 221.0)
  const galleon1 = createMerchantGalleonMesh();
  galleon1.position.set(19.5, -0.25, 221.0);
  galleon1.rotation.y = 0;
  scene.add(galleon1);

  // Viking Shielded Warship 2 (Bertambat rapi di samping Sayap Barat 1, X: -19.5, Z: 221.0)
  const warship2 = createVikingWarshipMesh();
  warship2.position.set(-19.5, -0.25, 221.0);
  warship2.rotation.y = 0;
  scene.add(warship2);

  // Perahu Nelayan Pak Joko (Bertambat rapi di ujung anjungan dermaga utama, X: 0, Z: 261.0)
  const rowboatJoko = createRowboatMesh();
  rowboatJoko.position.set(0, -0.25, 261.0);
  rowboatJoko.rotation.y = Math.PI / 2;
  scene.add(rowboatJoko);

  // Timber boarding gangway bridging East Wing 1 to Galleon 1
  const gangwayMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const gangwayEast = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayEast.position.set(16.9, 1.86, 221.0);
  scene.add(gangwayEast);

  // Timber boarding gangway bridging West Wing 1 to Warship 2
  const gangwayWest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.6), gangwayMat);
  gangwayWest.position.set(-16.9, 1.86, 221.0);
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
    { type: 'box', minX: 17.5, maxX: 22.5, minZ: 214, maxZ: 228, label: 'Lambung Kapal Dagang Emas 1' },
    { type: 'box', minX: -22.5, maxX: -17.5, minZ: 214, maxZ: 228, label: 'Lambung Kapal Perang Bershield' }
  );

  // 2.1 Northern Village Gateway Arch (Start of Royal Avenue at Z = 160)
  const villageArch = createVillageArchMesh('GERBANG ELDORIA');
  const archZ = 160;
  villageArch.position.set(0, villageMainlandY, archZ);
  scene.add(villageArch);
  colliders.push(
    { type: 'circle', x: -3.5, z: archZ, radius: 0.6, label: 'Gerbang Pilar Kiri' },
    { type: 'circle', x: 3.5, z: archZ, radius: 0.6, label: 'Gerbang Pilar Kanan' }
  );

  // 2.2 Sanctuary Grand Fountain in Central Town Plaza (X: 0, Z: 180)
  // Perfectly centered on plaza, leaving spawn point (0, 184) open and unobstructed
  const fountainZ = 180;
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
  sanctuaryPlazaRim.position.set(0, villageMainlandY + 0.04, fountainZ);
  sanctuaryPlazaRim.receiveShadow = true;
  scene.add(sanctuaryPlazaRim);

  // 2.3 Balai Tetua Vaelen & Pusat Komunitas (North-West Plaza: X: -13, Z: 170)
  const house1 = createVillageHouseMesh();
  const h1Pos = { x: -13, z: 170 };
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

  // 2.4 Village Tavern & Resting Inn: "Penginapan Eldoria" (North-East Plaza: X: 13, Z: 170)
  const tavern = createTavernMesh();
  const tavernPos = { x: 13, z: 170 };
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

  // 2.5 Master Torvald's Blacksmith Forge (West Commercial Avenue: X: -13, Z: 187)
  const blacksmith = createBlacksmithMesh();
  const forgePos = { x: -13, z: 187 };
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

  // 2.6 Anya's Alchemy & Potion Stall (East Commercial Avenue: X: 13, Z: 183)
  const anyaStall = createMarketStallMesh(0x15803d);
  const anyaPos = { x: 13, z: 183 };
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

  // 2.7 Maya's Armor & Weapon Outfitter Stall (East Commercial Avenue: X: 13, Z: 191)
  const marketStall2 = createArmorStallMesh(0x1e3a8a);
  const m2Pos = { x: 13, z: 191 };
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
  const h2Pos = { x: -24, z: 170 };
  house2.position.set(h2Pos.x, villageMainlandY, h2Pos.z);
  house2.rotation.y = 0;
  scene.add(house2);
  colliders.push({
    type: 'box',
    minX: h2Pos.x - 2.5, maxX: h2Pos.x + 2.5, minZ: h2Pos.z - 2.5, maxZ: h2Pos.z + 2.5,
    label: 'Rumah Pengrajin Barat',
  });

  const house6 = createVillageHouseMesh();
  const h6Pos = { x: -24, z: 182 };
  house6.position.set(h6Pos.x, villageMainlandY, h6Pos.z);
  house6.rotation.y = 0;
  scene.add(house6);
  colliders.push({
    type: 'box',
    minX: h6Pos.x - 2.5, maxX: h6Pos.x + 2.5, minZ: h6Pos.z - 2.5, maxZ: h6Pos.z + 2.5,
    label: 'Rumah Kebun Apel Barat',
  });

  const house7 = createVillageHouseMesh();
  const h7Pos = { x: -24, z: 194 };
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
  const h3Pos = { x: 24, z: 170 };
  house3.position.set(h3Pos.x, villageMainlandY, h3Pos.z);
  house3.rotation.y = Math.PI;
  scene.add(house3);
  colliders.push({
    type: 'box',
    minX: h3Pos.x - 2.5, maxX: h3Pos.x + 2.5, minZ: h3Pos.z - 2.5, maxZ: h3Pos.z + 2.5,
    label: 'Rumah Petani Lembah Timur',
  });

  const house4 = createVillageHouseMesh();
  const h4Pos = { x: 24, z: 182 };
  house4.position.set(h4Pos.x, villageMainlandY, h4Pos.z);
  house4.rotation.y = Math.PI;
  scene.add(house4);
  colliders.push({
    type: 'box',
    minX: h4Pos.x - 2.5, maxX: h4Pos.x + 2.5, minZ: h4Pos.z - 2.5, maxZ: h4Pos.z + 2.5,
    label: 'Rumah Padang Rumput Timur',
  });

  const house5 = createVillageHouseMesh();
  const h5Pos = { x: 24, z: 194 };
  house5.position.set(h5Pos.x, villageMainlandY, h5Pos.z);
  house5.rotation.y = Math.PI;
  scene.add(house5);
  colliders.push({
    type: 'box',
    minX: h5Pos.x - 2.5, maxX: h5Pos.x + 2.5, minZ: h5Pos.z - 2.5, maxZ: h5Pos.z + 2.5,
    label: 'Pondok Penjaga Padang Timur',
  });

  // Coastal Lookout Cottage (Situated safely on dry mainland at Z = 197, overlooking the harbor)
  const house8 = createVillageHouseMesh();
  const h8Pos = { x: -13, z: 197 };
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
    [-3.8, 164],
    [3.8, 164],
    [-3.8, 172],
    [3.8, 172],
    // Central Plaza Corners
    [-6.0, 180],
    [6.0, 180],
    [-6.0, 188],
    [6.0, 188],
    // South Promenade leading to Harbor
    [-3.8, 196],
    [3.8, 196],
    [-3.8, 202],
    [3.8, 202],
    // Shoreline Quay Boardwalk Entrances
    [-12.0, 203.5],
    [12.0, 203.5],
  ];
  const villageLampTransforms = lampPositions.map(([lx, lz]) => {
    colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Jalan' });
    return { x: lx, y: villageMainlandY, z: lz };
  });
  const villageLampsMesh = createInstancedStreetLamps(villageLampTransforms);
  scene.add(villageLampsMesh);

  // Village barrels placed neatly against walls in alleyways (Cleaned up: zero clutter)
  const barrelPositions = [
    [-16.5, 187],
    [16.5, 170],
    [15.5, 183],
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
  const elderPos: [number, number, number] = [-10.5, villageMainlandY, 173.5];
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
  const guardPos: [number, number, number] = [0, villageMainlandY, 161.5];
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
  const anyaNPCPos: [number, number, number] = [10.5, villageMainlandY, 183];
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
  const torvaldPos: [number, number, number] = [-9.5, villageMainlandY, 187];
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
  const bardPos: [number, number, number] = [10.5, villageMainlandY, 173.5];
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
  const jokoPos: [number, number, number] = [1.8, 1.85, 257.0]; // At seaward pier head looking out to open sea
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
  const kaelPos: [number, number, number] = [-8, villageMainlandY, 194];
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
  const mayaPos: [number, number, number] = [10.5, villageMainlandY, 191];
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
  // (Pusat Dataran Padang Rumput Timur: Center [380, 80], Courtyard X: 354..406, Z: 58..102 at y = 2.50)
  // Gerbang Utama diputar lurus menghadap Barat (Rotation Y = Math.PI * 1.5 / 270°).
  // Interior lengkap: Barak Prajurit, Bengkel Persenjataan Goran, Menara Panah, Tempat Latihan Pedang & Panahan, Api Unggun.
  // ==========================================
  const valKragorBaseY = 2.50;

  // A. Grand Fortress Gatehouse (West Entrance at X = 354, Z = 80)
  // Menghadap lurus ke BARAT (Rotation Y = 270° / Math.PI * 1.5) menyambut jalan raya berbatu dari jembatan
  const fortressGate = createFortressGatehouseMesh();
  fortressGate.position.set(354, valKragorBaseY, 80);
  fortressGate.rotation.y = Math.PI * 1.5;
  scene.add(fortressGate);
  colliders.push(
    { type: 'box', minX: 352, maxX: 356, minZ: 73.5, maxZ: 77.5, label: 'Menara Gerbang Val-Kragor Kiri' },
    { type: 'box', minX: 352, maxX: 356, minZ: 82.5, maxZ: 86.5, label: 'Menara Gerbang Val-Kragor Kanan' }
  );

  // B. Grand Fortress Citadel / Command Keep (East End of Courtyard at X = 402, Z = 80)
  // Menghadap ke BARAT ke arah alun-alun dan gerbang utama
  const fortressKeep = createFortressKeepMesh();
  fortressKeep.position.set(402, valKragorBaseY, 80);
  fortressKeep.rotation.y = -Math.PI / 2;
  scene.add(fortressKeep);
  colliders.push({
    type: 'box',
    minX: 397,
    maxX: 407,
    minZ: 74,
    maxZ: 86,
    label: 'Kastil Komando Val-Kragor',
  });

  // C. Four Expanded Corner Watchtowers
  const towerCoords = [
    { x: 354, z: 58, label: 'Menara Sudut Barat Laut' },
    { x: 354, z: 102, label: 'Menara Sudut Barat Daya' },
    { x: 406, z: 58, label: 'Menara Sudut Timur Laut' },
    { x: 406, z: 102, label: 'Menara Sudut Timur Daya' },
  ];
  towerCoords.forEach((tc) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(tc.x, valKragorBaseY, tc.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: tc.x, z: tc.z, radius: 2.5, label: tc.label });
  });

  // D. Solid Rampart Walls Enclosing Expanded Courtyard (X: 354..406, Z: 58..102)
  // North Wall (length 52, centered at X: 380, Z: 58)
  const vkWallNorth = createFortressWallMesh(52);
  vkWallNorth.position.set(380, valKragorBaseY, 58);
  scene.add(vkWallNorth);
  colliders.push({ type: 'box', minX: 354, maxX: 406, minZ: 56.5, maxZ: 59.5, label: 'Benteng Val-Kragor Utara' });

  // South Wall (length 52, centered at X: 380, Z: 102)
  const vkWallSouth = createFortressWallMesh(52);
  vkWallSouth.position.set(380, valKragorBaseY, 102);
  scene.add(vkWallSouth);
  colliders.push({ type: 'box', minX: 354, maxX: 406, minZ: 100.5, maxZ: 103.5, label: 'Benteng Val-Kragor Selatan' });

  // East Wall (length 44, centered at X: 406, Z: 80)
  const vkWallEast = createFortressWallMesh(44);
  vkWallEast.position.set(406, valKragorBaseY, 80);
  vkWallEast.rotation.y = Math.PI / 2;
  scene.add(vkWallEast);
  colliders.push({ type: 'box', minX: 404.5, maxX: 407.5, minZ: 58, maxZ: 102, label: 'Benteng Val-Kragor Timur' });

  // West Wall North Segment (connecting NW Watchtower to Gate North Bastion)
  const vkWallWestN = createFortressWallMesh(17.5);
  vkWallWestN.position.set(354, valKragorBaseY, 66.75);
  vkWallWestN.rotation.y = Math.PI / 2;
  scene.add(vkWallWestN);
  colliders.push({ type: 'box', minX: 352.5, maxX: 355.5, minZ: 58, maxZ: 75.5, label: 'Benteng Val-Kragor Barat Laut' });

  // West Wall South Segment (connecting SW Watchtower to Gate South Bastion)
  const vkWallWestS = createFortressWallMesh(17.5);
  vkWallWestS.position.set(354, valKragorBaseY, 93.25);
  vkWallWestS.rotation.y = Math.PI / 2;
  scene.add(vkWallWestS);
  colliders.push({ type: 'box', minX: 352.5, maxX: 355.5, minZ: 84.5, maxZ: 102, label: 'Benteng Val-Kragor Barat Daya' });

  // E. Outer Perimeter Surveillance Watchtowers
  const outerVkTowers = [
    { x: 344, z: 50, label: 'Menara Pengawas Luar Barat Laut' },
    { x: 416, z: 50, label: 'Menara Pengawas Luar Timur Laut' },
    { x: 344, z: 110, label: 'Menara Pengawas Luar Barat Daya' },
    { x: 416, z: 110, label: 'Menara Pengawas Luar Timur Daya' },
  ];
  outerVkTowers.forEach((ot) => {
    const oTower = createFortressWatchtowerMesh();
    oTower.position.set(ot.x, getTerrainHeight(ot.x, ot.z), ot.z);
    scene.add(oTower);
    colliders.push({ type: 'circle', x: ot.x, z: ot.z, radius: 2.5, label: ot.label });
  });

  // F. INTERIOR MILITARY FACILITIES (Lengkap, Rapi, & Tidak Kosong!)
  // F1. Barak Prajurit (Soldier Barracks in North-West Courtyard: X: 368, Z: 68)
  const vkBarracks = createBarracksMesh();
  vkBarracks.position.set(368, valKragorBaseY, 68);
  vkBarracks.rotation.y = 0;
  scene.add(vkBarracks);
  colliders.push({
    type: 'box',
    minX: 363.5,
    maxX: 372.5,
    minZ: 64.5,
    maxZ: 71.5,
    label: 'Barak Prajurit Benteng Val-Kragor',
  });

  // F2. Bengkel Tempa & Kedai Persenjataan Goran (North Courtyard: X: 388, Z: 68)
  const goranForge = createBlacksmithMesh();
  goranForge.position.set(388, valKragorBaseY, 68);
  goranForge.rotation.y = 0;
  scene.add(goranForge);
  colliders.push({
    type: 'box',
    minX: 385,
    maxX: 391,
    minZ: 65,
    maxZ: 71,
    label: 'Bengkel Tempa Gunung Goran',
  });

  // F3. Rak Senjata Militer di Luar Bengkel Tempa
  const rack1 = createWeaponRackMesh();
  rack1.position.set(382, valKragorBaseY, 71);
  scene.add(rack1);
  const rack2 = createWeaponRackMesh();
  rack2.position.set(394, valKragorBaseY, 71);
  scene.add(rack2);
  colliders.push(
    { type: 'box', minX: 380.8, maxX: 383.2, minZ: 70.5, maxZ: 71.5, label: 'Rak Senjata Benteng 1' },
    { type: 'box', minX: 392.8, maxX: 395.2, minZ: 70.5, maxZ: 71.5, label: 'Rak Senjata Benteng 2' }
  );

  // F4. Frostwolf Tavern / Highland Longhouse (South Courtyard: X: 388, Z: 92)
  const frostwolfLodge = createTavernMesh();
  frostwolfLodge.position.set(388, valKragorBaseY, 92);
  frostwolfLodge.rotation.y = Math.PI;
  scene.add(frostwolfLodge);
  colliders.push({
    type: 'box',
    minX: 384,
    maxX: 392,
    minZ: 88.5,
    maxZ: 95.5,
    label: 'Kedai Serigala Salju',
  });

  // F5. Tempat Latihan Pedang & Sasaran Panah (Combat Training Yard: South-West Courtyard)
  // Target Dummy Pedang
  const dummy1 = createTrainingDummyMesh();
  dummy1.position.set(364, valKragorBaseY, 88);
  dummy1.rotation.y = Math.PI / 4;
  const dummy2 = createTrainingDummyMesh();
  dummy2.position.set(370, valKragorBaseY, 88);
  dummy2.rotation.y = -Math.PI / 6;
  scene.add(dummy1, dummy2);
  colliders.push(
    { type: 'circle', x: 364, z: 88, radius: 0.6, label: 'Boneka Latihan Pedang 1' },
    { type: 'circle', x: 370, z: 88, radius: 0.6, label: 'Boneka Latihan Pedang 2' }
  );

  // Sasaran Panah
  const archeryTarget1 = createArcheryTargetMesh();
  archeryTarget1.position.set(364, valKragorBaseY, 93);
  archeryTarget1.rotation.y = 0;
  const archeryTarget2 = createArcheryTargetMesh();
  archeryTarget2.position.set(370, valKragorBaseY, 93);
  archeryTarget2.rotation.y = 0;
  scene.add(archeryTarget1, archeryTarget2);
  colliders.push(
    { type: 'box', minX: 363.2, maxX: 364.8, minZ: 92.5, maxZ: 93.5, label: 'Sasaran Panah 1' },
    { type: 'box', minX: 369.2, maxX: 370.8, minZ: 92.5, maxZ: 93.5, label: 'Sasaran Panah 2' }
  );

  // F6. Menara Panah Interior (Inner Arrow Watchtowers)
  const innerArrowTower1 = createFortressWatchtowerMesh();
  innerArrowTower1.position.set(362, valKragorBaseY, 64);
  scene.add(innerArrowTower1);
  colliders.push({ type: 'circle', x: 362, z: 64, radius: 2.2, label: 'Menara Panah Interior Utara' });

  const innerArrowTower2 = createFortressWatchtowerMesh();
  innerArrowTower2.position.set(362, valKragorBaseY, 96);
  scene.add(innerArrowTower2);
  colliders.push({ type: 'circle', x: 362, z: 96, radius: 2.2, label: 'Menara Panah Interior Selatan' });

  // F7. Api Unggun Prajurit Benteng (Pusat Alun-Alun: X: 378, Z: 80)
  const fortressFire = createBonfireMesh();
  fortressFire.position.set(378, valKragorBaseY, 80);
  scene.add(fortressFire);
  colliders.push({ type: 'circle', x: 378, z: 80, radius: 1.2, label: 'Perapian Utama Benteng' });

  // F8. Courtyard Iron Streetlamps
  for (const lx of [360, 372, 386, 396]) {
    for (const lz of [76, 84]) {
      const lamp = createStreetLampMesh();
      lamp.position.set(lx, valKragorBaseY, lz);
      scene.add(lamp);
      colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Benteng' });
    }
  }

  // --- NPCS OF DESA BENTENG VAL-KRAGOR ---
  // NPC 9: Komandan Brann (Highland Fortress Commander)
  const brannGroup = createCustomNPCMesh('commander');
  const brannPos: [number, number, number] = [378, valKragorBaseY, 83];
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
  const eloraPos: [number, number, number] = [390, valKragorBaseY, 86];
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
  const goranPos: [number, number, number] = [388, valKragorBaseY, 72];
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
  const fGuardPos: [number, number, number] = [352, valKragorBaseY, 77];
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
  const fGuardPos2: [number, number, number] = [352, valKragorBaseY, 83];
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
  const fGuardPos3: [number, number, number] = [368, valKragorBaseY, 74];
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
  const fRecruitPos: [number, number, number] = [366, valKragorBaseY, 90];
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
  // Membentang lurus menghubungkan Ngarai Kabut di X: 135..155 pada Z = 47.
  // ==========================================
  const bridge = createSuspensionBridgeMesh(22);
  bridge.position.set(145, 1.35, 47);
  scene.add(bridge);

  // Pilar Penyangga Batu Kokoh (Tinggi 4.4m, duduk di dasar ngarai menopang tepat di bawah dek)
  const chasmStonePier = createStoneBridgePierMesh(4.4);
  chasmStonePier.position.set(145, -2.2, 47);
  scene.add(chasmStonePier);

  // Pagar Pengaman Jembatan Gantung (Membentang lurus di Z = 44.8 dan Z = 49.2)
  colliders.push(
    { type: 'box', minX: 135.5, maxX: 154.5, minZ: 44.8, maxZ: 45.6, label: 'Pagar Jembatan Kiri' },
    { type: 'box', minX: 135.5, maxX: 154.5, minZ: 48.4, maxZ: 49.2, label: 'Pagar Jembatan Kanan' }
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

    // Strict Anti-Overlap Exclusion
    const inSanctuaryMainland = (Math.abs(tx) <= 35 && tz >= 152 && tz <= 200);
    const inSanctuaryHarborOcean = (Math.abs(tx) <= 50 && tz > 200);
    const inBridgeHighwayCorridor = (tx >= 115 && tx <= 360 && (Math.abs(tz - 47) <= 12.0 || Math.abs(tz - 75) <= 12.0));
    const inValKragor = (tx >= 345 && tx <= 420 && tz >= 48 && tz <= 112);
    const inDesert = (tz < -60 && tx > -115);
    const inDragonCaldera = (tz > 280 && Math.abs(tx - 50) < 60);
    const inAstraea = Math.hypot(tx - -340, tz - -220) < 60;
    const inTitan = Math.hypot(tx - -196, tz - -254) < 45;
    if (inSanctuaryMainland || inSanctuaryHarborOcean || inBridgeHighwayCorridor || inValKragor || inDesert || inDragonCaldera || inAstraea || inTitan) continue;

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
    { x: -31, z: 170, type: 'oak', scale: 1.1 },
    { x: -31, z: 182, type: 'oak', scale: 1.2 },
    { x: -31, z: 194, type: 'oak', scale: 1.1 },
    // East Residential Backyards (Lush Garden)
    { x: 31, z: 170, type: 'oak', scale: 1.1 },
    { x: 31, z: 182, type: 'oak', scale: 1.2 },
    { x: 31, z: 194, type: 'oak', scale: 1.1 },
    // Flanking North Gate
    { x: -7, z: 159, type: 'pine', scale: 1.2 },
    { x: 7, z: 159, type: 'pine', scale: 1.2 },
    // North Garden behind Elder Lodge & Tavern
    { x: -14, z: 163, type: 'oak', scale: 1.0 },
    { x: 14, z: 163, type: 'oak', scale: 1.0 },
    // Coastal Palm / Pine near beach sand
    { x: -28, z: 202, type: 'oak', scale: 1.15 },
    { x: 28, z: 202, type: 'oak', scale: 1.15 },
  ];

  const villageTreesData = curatedVillageTrees
    .filter(vt => !isPointOnRoad(vt.x, vt.z))
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
  // 5. SOLARIA GOLDEN DESERT: VILLAGE, GRAND PALACE & SUNKEN PYRAMID
  // ==========================================

  // ------------------------------------------
  // 5A. ANCIENT SUNKEN PYRAMID RUINS ([20, -220])
  // ------------------------------------------
  const pyramid = createDesertPyramidMesh();
  const pyY = 1.50;
  pyramid.position.set(20, pyY, -220);
  scene.add(pyramid);
  colliders.push({
    type: 'box',
    minX: 11,
    maxX: 29,
    minZ: -229,
    maxZ: -211,
    label: 'Piramida Emas Solaria',
  });

  // Obelisks guarding pyramid approach
  const obeliskPositions = [
    { x: 5, z: -220 },
    { x: 35, z: -220 },
    { x: 20, z: -235 },
    { x: 20, z: -205 },
  ];
  obeliskPositions.forEach((pos) => {
    const obelisk = createDesertObeliskMesh();
    obelisk.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(obelisk);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Obelisk Solaria' });
  });

  // Palms near Pyramid Oasis Spring
  const pyramidPalmPositions = [
    { x: 38, z: -234 },
    { x: 32, z: -230 },
    { x: 42, z: -226 },
    { x: 2, z: -204 },
    { x: -2, z: -198 },
  ];
  const pyramidPalmsData = pyramidPalmPositions.map((pos) => {
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
  oasisPool.position.set(150, 0.05, -360);
  scene.add(oasisPool);

  const oasisPalmsData: { x: number; y: number; z: number; rotationY: number }[] = [];
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    const px = 150 + Math.cos(angle) * 17;
    const pz = -360 + Math.sin(angle) * 17;
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
  solariaPalace.position.set(340, solariaPalaceY, -280);
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
    { type: 'palm',    x: 270, z: -284.5 },
    { type: 'lantern', x: 285, z: -284.5 },
    { type: 'palm',    x: 300, z: -284.5 },
    { type: 'lantern', x: 315, z: -284.5 },
    { type: 'lantern', x: 255, z: -275.5 },
    { type: 'palm',    x: 270, z: -275.5 },
    { type: 'lantern', x: 285, z: -275.5 },
    { type: 'palm',    x: 300, z: -275.5 },
    { type: 'lantern', x: 315, z: -275.5 },
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

  // ==========================================
  // 5D. THE GREAT SOLARIA SINKHOLE - SARANG CACING PURBA JARRUS ([495, -362])
  // ==========================================
  const sinkholeCenter = { x: 495, z: -362 };
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
  // 6. THUNDERPEAK LIGHTNING SPIRE & MAGE TOWER SANCTUARY (East Plains Hill: [180, 60])
  // Struktur Megah 3D Mage Tower, Interior Bertingkat, Kristal Petir Bersinar, dan Dewan Penyihir
  // ==========================================
  const mageTowerBaseY = 4.50;

  // A. Struktur Eksterior 3D "Mage Tower" Puncak Halilintar (Center: [180, 60])
  const mageTowerExterior = createMageTowerExteriorMesh();
  mageTowerExterior.position.set(180, mageTowerBaseY, 60);
  scene.add(mageTowerExterior);
  colliders.push({
    type: 'circle',
    x: 180,
    z: 60,
    radius: 7.2,
    label: 'Menara Eksterior Mage Tower Puncak Halilintar',
  });

  // B. Interior Bertingkat 3D Mage Tower (Underground Interior Cell: [180, -45, 60])
  const mageTowerInterior = createMageTowerInteriorMesh();
  mageTowerInterior.position.set(180, -45, 60);
  scene.add(mageTowerInterior);

  // Interior Wall Box Colliders
  colliders.push(
    { type: 'box', minX: 169, maxX: 191, minZ: 49, maxZ: 51, maxY: -10, label: 'Dinding Utara Interior Mage Tower' },
    { type: 'box', minX: 169, maxX: 171, minZ: 49, maxZ: 71, maxY: -10, label: 'Dinding Barat Interior Mage Tower' },
    { type: 'box', minX: 189, maxX: 191, minZ: 49, maxZ: 71, maxY: -10, label: 'Dinding Timur Interior Mage Tower' },
    { type: 'box', minX: 169, maxX: 177.5, minZ: 69, maxZ: 71, maxY: -10, label: 'Dinding Selatan Barat Interior Mage Tower' },
    { type: 'box', minX: 182.5, maxX: 191, minZ: 69, maxZ: 71, maxY: -10, label: 'Dinding Selatan Timur Interior Mage Tower' }
  );
  // Colliders Perabotan Lantai 1
  colliders.push(
    { type: 'box', minX: 176, maxX: 184, minZ: 51, maxZ: 53, maxY: -38, label: 'Lemari Kitab Purba Utara' },
    { type: 'box', minX: 171, maxX: 173, minZ: 57, maxZ: 63, maxY: -38, label: 'Lemari Kitab Purba Barat' },
    { type: 'box', minX: 187, maxX: 189, minZ: 57, maxZ: 63, maxY: -38, label: 'Lemari Kitab Purba Timur' }
  );
  // Colliders Perabotan Lantai 2
  colliders.push({
    type: 'box',
    minX: 177,
    maxX: 183,
    minZ: 58,
    maxZ: 62,
    minY: -39,
    maxY: -32,
    label: 'Meja Eksperimen Kristal Petir Alkimia',
  });
  // Colliders Perabotan Lantai 3
  colliders.push({
    type: 'circle',
    x: 180,
    z: 60,
    radius: 1.6,
    minY: -31,
    maxY: -15,
    label: 'Pilar Armillary Orrery Observatorium',
  });

  // C. Dewan Penyihir Mage Tower (Unique Mage NPCs):
  // 1. Grand Mage Eldrin
  const eldrinGroup = createGrandMageEldrinMesh();
  const eldrinPos: [number, number, number] = [180, -45, 58];
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
  const sorceressMayaPos: [number, number, number] = [176.5, -45, 62];
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
  const pyroPos: [number, number, number] = [180, -37.5, 62];
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
    { x: 191, z: 67, scale: 1.4 },
    { x: 169, z: 67, scale: 1.3 },
    { x: 191, z: 53, scale: 1.4 },
    { x: 169, z: 53, scale: 1.35 },
    { x: 180, z: 73, scale: 1.5 },
    { x: 180, z: 47, scale: 1.4 },
    { x: 163, z: 59, scale: 1.3 },
    { x: 197, z: 59, scale: 1.2 },
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
    { x: 160, z: 43 },
    { x: 200, z: 77 },
    { x: 165, z: 79 },
  ];
  secondarySpires.forEach((pos) => {
    const spire = createThunderSpireMesh();
    spire.scale.set(0.85, 0.95, 0.85);
    spire.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(spire);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Pilar Petir Melayang' });
  });

  // ==========================================
  // 8. DRAGONFANG CALDERA & INFERNO ARCHIPELAGO (South Across Ocean: [80, 360])
  // Arena Kaldera Naga: Kawah Melingkar (Diameter ~45m), 4 Pilar Obsidian Naga, Fosil Naga, & Lahar Pijar
  // ==========================================
  const dragonArenaCenter = { x: 80, z: 360 };
  const dragonArenaBaseY = 2.50;

  // A. Monumental Dragon Fossil Skull & Ribcage (Placed at North Rim of Caldera: [80, 2.50, 347])
  const dragonFossil = createDragonSkullBonesMesh();
  dragonFossil.position.set(dragonArenaCenter.x, dragonArenaBaseY, 347);
  scene.add(dragonFossil);
  colliders.push({
    type: 'box',
    minX: 75,
    maxX: 85,
    minZ: 341,
    maxZ: 353,
    label: 'Fosil Tengkorak Naga Purba',
  });

  // B. 4 Sharp Black Obsidian Dragon Pillars (Pilar Naga Batas Arena Kawah pada Radius 42 unit)
  const dragonPillars = [
    { x: 80, z: 318, label: 'Pilar Naga Obsidian Utara' },
    { x: 80, z: 402, label: 'Pilar Naga Obsidian Selatan' },
    { x: 122, z: 360, label: 'Pilar Naga Obsidian Timur' },
    { x: 38, z: 360, label: 'Pilar Naga Obsidian Barat' },
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
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 3.5, label: 'Tebing Basalt Kaldera' });
  }

  // C. Retakan Tanah Berlapis Lava Merah Menyala di Seputar Kaldera
  const lavaCrackCoords = [
    { x: 80, z: 346, r: 4.8 },
    { x: 94, z: 352, r: 4.5 },
    { x: 66, z: 352, r: 4.5 },
    { x: 97, z: 374, r: 4.6 },
    { x: 63, z: 374, r: 4.6 },
    { x: 80, z: 380, r: 5.0 },
    { x: 95, z: 365, r: 5.5 },
    { x: 65, z: 365, r: 4.6 },
  ];
  lavaCrackCoords.forEach((lc) => {
    const crack = createLavaCrackMesh(lc.r);
    const cy = getTerrainHeight(lc.x, lc.z);
    crack.position.set(lc.x, cy + 0.02, lc.z);
    scene.add(crack);
  });

  // D. Bebatuan Vulkanik Hitam Berurat Magma (Jagged Volcanic Basalt Rocks)
  const basaltRockCoords = [
    { x: 65, z: 350, s: 1.6 },
    { x: 95, z: 348, s: 1.5 },
    { x: 61, z: 372, s: 1.7 },
    { x: 99, z: 375, s: 1.8 },
    { x: 80, z: 388, s: 1.6 },
    { x: 80, z: 332, s: 1.5 },
    { x: 104, z: 365, s: 1.8 },
    { x: 56, z: 356, s: 1.4 },
    { x: 100, z: 380, s: 1.9 },
  ];
  basaltRockCoords.forEach((br) => {
    const rock = createVolcanicBasaltRockMesh(br.s);
    const ry = getTerrainHeight(br.x, br.z);
    rock.position.set(br.x, ry, br.z);
    scene.add(rock);
    colliders.push({ type: 'circle', x: br.x, z: br.z, radius: 1.3 * br.s, label: 'Batu Vulkanik Basalt' });
  });

  // E. Surrounding Volcanic Horn Arches
  for (const hPos of [{ x: 70, z: 345 }, { x: 90, z: 345 }, { x: 80, z: 376 }]) {
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
  // 8b. GRAND IMPERIAL KINGDOM OF ASTRAEA (North-West Plains Metropolis: [-340, -220])
  // Relocated to the peaceful north-west plains (Lv.4), completely separated from Val-Kragor and Solaria.
  // Grand West Gatehouse facing West (270° / Math.PI * 1.5) at [-360, -220].
  // All structures sit on flat terrain at Y = 2.00 (zero gap).
  // ==========================================
  const astraeaBaseY = 2.00;

  // A. Grand Imperial Sun Palace of Astraea (East End: X: -320, Z: -220)
  // Facing WEST (Direction: 270° / rotation.y = Math.PI * 1.5)
  const imperialPalace = createImperialPalaceMesh();
  imperialPalace.position.set(-320, astraeaBaseY, -220);
  imperialPalace.rotation.y = Math.PI * 1.5;
  scene.add(imperialPalace);
  colliders.push({
    type: 'box',
    minX: -329,
    maxX: -309,
    minZ: -231,
    maxZ: -209,
    label: 'Istana Kerajaan Kaisar Astraea',
  });

  // B. Grand Circular Stone Plaza & Jalan Lingkar (Center: X: -340, Z: -220, Radius: 11.5m)
  const circularPlaza = createCircularPlazaMesh(11.5, 4.8);
  circularPlaza.position.set(-340, astraeaBaseY, -220);
  scene.add(circularPlaza);

  // B2. Celestial 3-Tier Fountain of Immortality (Relocated to Center of Circular Plaza at X: -340, Z: -220)
  const celestialFountain = createImperialFountainMesh();
  celestialFountain.position.set(-340, astraeaBaseY, -220);
  scene.add(celestialFountain);
  colliders.push({
    type: 'circle',
    x: -340,
    z: -220,
    radius: 4.8,
    label: 'Air Mancur Keabadian Alun-Alun Astraea',
  });

  // B3. Four Golden Heroic Statues Placed at Diagonal Corners of Circular Plaza (NW, NE, SW, SE)
  const heroStatues = [
    { x: -348, z: -228, ry: Math.PI * 0.75 }, // Barat Laut
    { x: -332, z: -228, ry: Math.PI * 1.25 }, // Timur Laut
    { x: -348, z: -212, ry: Math.PI * 0.25 }, // Barat Daya
    { x: -332, z: -212, ry: -Math.PI * 0.25 }, // Timur Daya
  ];
  heroStatues.forEach((hs, idx) => {
    const statue = createImperialHeroStatueMesh();
    statue.position.set(hs.x, astraeaBaseY, hs.z);
    statue.rotation.y = hs.ry;
    scene.add(statue);
    colliders.push({ type: 'circle', x: hs.x, z: hs.z, radius: 1.4, label: `Monumen Ksatria Emas ${idx + 1}` });
  });

  // B4. Tiang Lampu Emas Kerajaan di Sepanjang Pinggir Jalan Lingkar & Flanking Alur Istana
  const astraeaStreetlamps = [
    // North Parallel Row (Flanking Bazaar Stalls, Z = -234)
    { x: -352, z: -234 },
    { x: -340, z: -234 },
    { x: -328, z: -234 },
    // South Parallel Row (Flanking Bazaar Stalls, Z = -206)
    { x: -352, z: -206 },
    { x: -340, z: -206 },
    { x: -328, z: -206 },
    // Avenue from West Gate towards Plaza (Flanking Z = -220 avenue)
    { x: -354, z: -224.5 },
    { x: -354, z: -215.5 },
    // Grand Esplanade approaching Palace Stairs (Flanking open promenade)
    { x: -326, z: -225.0 },
    { x: -326, z: -215.0 },
    { x: -318, z: -225.0 },
    { x: -318, z: -215.0 },
  ];
  astraeaStreetlamps.forEach((sl) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(sl.x, astraeaBaseY, sl.z);
    scene.add(lamp);
    colliders.push({ type: 'circle', x: sl.x, z: sl.z, radius: 0.35, label: 'Lampu Emas Kerajaan' });
  });

  // C. West Imperial Gatehouse (West Entrance, X: -360, Z: -220)
  // Facing WEST (Rotation Y = 270° / Math.PI * 1.5) towards western highway
  const imperialGatehouse = createImperialGatehouseMesh();
  imperialGatehouse.position.set(-360, astraeaBaseY, -220);
  imperialGatehouse.rotation.y = Math.PI * 1.5;
  scene.add(imperialGatehouse);
  colliders.push(
    { type: 'box', minX: -362.5, maxX: -357.5, minZ: -228, maxZ: -223, label: 'Bastion Utara Gerbang Barat Astraea' },
    { type: 'box', minX: -362.5, maxX: -357.5, minZ: -217, maxZ: -212, label: 'Bastion Selatan Gerbang Barat Astraea' }
  );

  // D. Solid Imperial Fortress Wall Perimeter Enclosing Capital
  // 1. West Wall - North Wing (from Gatehouse [-360, -225.5] to NW corner [-360, -245], length 19.5)
  const wallWestNorth = createImperialWallMesh(19.5);
  wallWestNorth.position.set(-360, astraeaBaseY, -235.25);
  wallWestNorth.rotation.y = Math.PI / 2;
  scene.add(wallWestNorth);
  colliders.push({ type: 'box', minX: -361.5, maxX: -358.5, minZ: -245, maxZ: -225.5, label: 'Benteng Astraea Barat Utara' });

  // 2. West Wall - South Wing (from Gatehouse [-360, -214.5] to SW corner [-360, -195], length 19.5)
  const wallWestSouth = createImperialWallMesh(19.5);
  wallWestSouth.position.set(-360, astraeaBaseY, -204.75);
  wallWestSouth.rotation.y = Math.PI / 2;
  scene.add(wallWestSouth);
  colliders.push({ type: 'box', minX: -361.5, maxX: -358.5, minZ: -214.5, maxZ: -195, label: 'Benteng Astraea Barat Selatan' });

  // 3. North Wall (from [-360, -245] to [-310, -245], length 50)
  const nWall = createImperialWallMesh(50);
  nWall.position.set(-335, astraeaBaseY, -245);
  scene.add(nWall);
  colliders.push({ type: 'box', minX: -360, maxX: -310, minZ: -246.5, maxZ: -243.5, label: 'Benteng Astraea Utara' });

  // 4. South Wall (from [-360, -195] to [-310, -195], length 50)
  const sWall = createImperialWallMesh(50);
  sWall.position.set(-335, astraeaBaseY, -195);
  scene.add(sWall);
  colliders.push({ type: 'box', minX: -360, maxX: -310, minZ: -196.5, maxZ: -193.5, label: 'Benteng Astraea Selatan' });

  // 5. East Wall (behind Palace, from [-310, -245] to [-310, -195], length 50)
  const eWall = createImperialWallMesh(50);
  eWall.position.set(-310, astraeaBaseY, -220);
  eWall.rotation.y = Math.PI / 2;
  scene.add(eWall);
  colliders.push({ type: 'box', minX: -311.5, maxX: -308.5, minZ: -245, maxZ: -195, label: 'Benteng Astraea Timur' });

  // 6. Four Corner Bastion Towers
  const cornerTowers = [
    { x: -360, z: -195, label: 'Menara Benteng Barat Daya Astraea' },
    { x: -310, z: -195, label: 'Menara Benteng Tenggara Astraea' },
    { x: -360, z: -245, label: 'Menara Benteng Barat Laut Astraea' },
    { x: -310, z: -245, label: 'Menara Benteng Timur Laut Astraea' },
  ];
  cornerTowers.forEach((ct) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(ct.x, astraeaBaseY, ct.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: ct.x, z: ct.z, radius: 2.8, label: ct.label });
  });

  // E. Symmetrical Grand Royal Bazaar Stalls Flanking North & South Promenades
  const astraeaStall1 = createImperialBazaarStallMesh(0x9333ea, 0xfacc15); // Celestial Potions (Lyra)
  astraeaStall1.position.set(-346, astraeaBaseY, -234);
  astraeaStall1.rotation.y = Math.PI;
  scene.add(astraeaStall1);
  colliders.push({ type: 'box', minX: -348, maxX: -344, minZ: -236, maxZ: -232, label: 'Kios Alkimia Kerajaan' });

  const astraeaStall2 = createImperialBazaarStallMesh(0x2563eb, 0x38bdf8); // Masterwork Armory
  astraeaStall2.position.set(-334, astraeaBaseY, -234);
  astraeaStall2.rotation.y = Math.PI;
  scene.add(astraeaStall2);
  colliders.push({ type: 'box', minX: -336, maxX: -332, minZ: -236, maxZ: -232, label: 'Kios Senjata Astraea' });

  // South Promenade:
  const astraeaStall3 = createImperialBazaarStallMesh(0xd97706, 0xfef08a); // Silk & Relics
  astraeaStall3.position.set(-346, astraeaBaseY, -206);
  astraeaStall3.rotation.y = 0;
  scene.add(astraeaStall3);
  colliders.push({ type: 'box', minX: -348, maxX: -344, minZ: -208, maxZ: -204, label: 'Kios Sutra Emas' });

  const astraeaStall4 = createImperialBazaarStallMesh(0x059669, 0xa7f3d0); // Royal Provisions
  astraeaStall4.position.set(-334, astraeaBaseY, -206);
  astraeaStall4.rotation.y = 0;
  scene.add(astraeaStall4);
  colliders.push({ type: 'box', minX: -336, maxX: -332, minZ: -208, maxZ: -204, label: 'Kios Perjamuan Kaisar' });

  // G. Pine Trees along Courtyard (Plains Flora)
  const astraeaCourtyardPineCoords = [
    { x: -349, z: -228 }, { x: -349, z: -212 },
    { x: -326, z: -228 }, { x: -326, z: -212 },
    { x: -342, z: -238 }, { x: -342, z: -202 },
    { x: -320, z: -238 }, { x: -320, z: -202 },
    { x: -314, z: -238 }, { x: -314, z: -202 },
  ];
  astraeaCourtyardPineCoords.forEach((pc) => {
    const s = 0.95 + Math.random() * 0.35;
    const pTree = createTreeMesh('pine');
    pTree.position.set(pc.x, astraeaBaseY, pc.z);
    scene.add(pTree);
    colliders.push({ type: 'circle', x: pc.x, z: pc.z, radius: 0.6 * s, label: 'Pohon Pinus Astraea' });
  });

  // H. Astraea Royal NPCs
  // NPC 13: Kaisar Aurelius Astraea (Standing on Throne Portico at entrance, facing West down the carpet)
  const emperorGroup = createCustomNPCMesh('emperor');
  const emperorPos: [number, number, number] = [-327.8, astraeaBaseY + 1.6, -220];
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
  const marshalPos: [number, number, number] = [-335, astraeaBaseY, -215];
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
  const lyraPos: [number, number, number] = [-345, astraeaBaseY, -231];
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
  const astraeaGuardPos: [number, number, number] = [-362, astraeaBaseY, -223];
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
  // 9. TREASURE CHESTS (Across all active continent zones)
  // ==========================================
  const chestData = [
    { id: 'chest_village', pos: [4, 0, 184] as [number, number, number] },
    { id: 'chest_beach', pos: [-3.0, 1.85, 257] as [number, number, number] }, // Seaward Pier Head Platform Stash
    { id: 'chest_ruins', pos: [-120, 0, 32] as [number, number, number] }, // Ancient ruins altar
    { id: 'chest_forest', pos: [-60, 0, 110] as [number, number, number] }, // Whispering Mystic Forest
    { id: 'chest_titan', pos: [-182, 0.2, -244] as [number, number, number] }, // Ancient Titan Basin
    { id: 'chest_valkragor', pos: [402, 2.5, 80] as [number, number, number] }, // Val-Kragor Keep Secret Vault
    { id: 'chest_thunderpeak', pos: [180, 4.5, 60] as [number, number, number] }, // Thunderpeak Mage Tower Relic
    { id: 'chest_solaria_palace', pos: [340, 2.0, -280] as [number, number, number] }, // Solaria Sultan Vault
    { id: 'chest_solaria', pos: [20, 1.5, -220] as [number, number, number] }, // Solaria Pyramid Gold
    { id: 'chest_solaria_oasis', pos: [150, 0.5, -360] as [number, number, number] }, // Solaria Hidden Oasis
    { id: 'chest_dragoncaldera', pos: [80, 2.5, 360] as [number, number, number] }, // Dragon Caldera Hoard
    { id: 'chest_astraea', pos: [-320, 2.0, -220] as [number, number, number] }, // Astraea Imperial Vault
    { id: 'chest_harbor_galleon', pos: [19.5, 0, 221] as [number, number, number] }, // Harbor Galleon Stash
    { id: 'chest_bridge', pos: [135, 1.35, 47] as [number, number, number] }, // Gorge Suspension Bridge Cache
    { id: 'chest_sandworm_cache', pos: [506, -0.6, -370] as [number, number, number] }, // Ancient Sandworm Sinkhole Cache
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
  // 10. ANCIENT TITAN SANCTUARY BASIN ARENA (Plains Lake: [-196, -254])
  // Cekungan Danau Lembah Purba (Radius 40m / Diameter 80m), Platform Batu Pijakan Tengah (Diameter 16m), & Formasi 12 Megalit Rune Kuno
  // ==========================================
  const titanArenaCenter = { x: -196, z: -254 };
  const titanPlatformY = getTerrainHeight(titanArenaCenter.x, titanArenaCenter.z) + 0.35;

  // A. Central Shallow Stone Stepping Platform (Platform Granit Pusat Berdiameter 16 unit)
  const titanPlatformGeo = new THREE.CylinderGeometry(8.0, 8.4, 0.65, 36);
  const titanPlatformMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.85,
    metalness: 0.15,
    flatShading: true,
  });
  const titanPlatformMesh = new THREE.Mesh(titanPlatformGeo, titanPlatformMat);
  titanPlatformMesh.position.set(titanArenaCenter.x, titanPlatformY - 0.15, titanArenaCenter.z);
  scene.add(titanPlatformMesh);

  // Gold/Cyan Rune Ring Inlay on Platform Rim
  const titanRuneRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.6, 0.22, 8, 36),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    })
  );
  titanRuneRing.rotation.x = Math.PI / 2;
  titanRuneRing.position.set(titanArenaCenter.x, titanPlatformY + 0.2, titanArenaCenter.z);
  scene.add(titanRuneRing);

  // B. Shallow Valley Lake Basin Water Disk (Air Danau Cekungan Perlindungan - Radius 40m / Diameter 80m)
  const titanLakeGeo = new THREE.CircleGeometry(40.0, 48);
  titanLakeGeo.rotateX(-Math.PI / 2);
  const titanLakeMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.8,
  });
  const titanLakeMesh = new THREE.Mesh(titanLakeGeo, titanLakeMat);
  titanLakeMesh.position.set(titanArenaCenter.x, -0.05, titanArenaCenter.z);
  scene.add(titanLakeMesh);

  // C. 12 Megalithic Rune-Carved Stone Formations Ringing Basin at Radius 40m
  const megalithCount = 12;
  const megalithRadius = 40.0;
  for (let i = 0; i < megalithCount; i++) {
    const ang = i * ((Math.PI * 2) / megalithCount);
    const mx = titanArenaCenter.x + Math.cos(ang) * megalithRadius;
    const mz = titanArenaCenter.z + Math.sin(ang) * megalithRadius;
    const my = getTerrainHeight(mx, mz);

    const megalithGroup = new THREE.Group();

    // Weathered ancient stone monolith pillar
    const monolithGeo = new THREE.BoxGeometry(1.6, 7.5, 1.6);
    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.9,
      flatShading: true,
    });
    const monolith = new THREE.Mesh(monolithGeo, monolithMat);
    monolith.position.y = 3.75;
    megalithGroup.add(monolith);

    // Glowing cyan rune band
    const runeBandGeo = new THREE.BoxGeometry(1.7, 0.55, 1.7);
    const runeBandMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.95,
    });
    const runeBand = new THREE.Mesh(runeBandGeo, runeBandMat);
    runeBand.position.y = 4.2;
    megalithGroup.add(runeBand);

    // Tapered top monolith capstone
    const capGeo = new THREE.ConeGeometry(1.2, 1.8, 4);
    capGeo.rotateY(Math.PI / 4);
    const cap = new THREE.Mesh(capGeo, monolithMat);
    cap.position.y = 8.4;
    megalithGroup.add(cap);

    megalithGroup.rotation.y = -ang + Math.PI / 2;
    megalithGroup.position.set(mx, my, mz);
    scene.add(megalithGroup);

    colliders.push({ type: 'circle', x: mx, z: mz, radius: 1.5, label: `Megalit Rune Lembah Titan ${i + 1}` });
  }

  // D. Ancient Titan Arena Mystic Beacon
  const titanLight = new THREE.PointLight(0x38bdf8, 2.8, 48);
  titanLight.position.set(titanArenaCenter.x, titanPlatformY + 3.8, titanArenaCenter.z);
  scene.add(titanLight);

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
      nameId: 'Alun-Alun Desa Sanctuary Eldoria',
      pos: [0, 180],
    },
    {
      id: 'wp_harbor',
      name: 'Sanctuary Coastal Harbor',
      nameId: 'Dermaga & Pelabuhan Sanctuary',
      pos: [0, 205],
    },
    {
      id: 'wp_titan',
      name: 'Ancient Titan Sanctuary Basin',
      nameId: 'Lembah Danau Cekungan Titan Kuno',
      pos: [-196, -254],
    },
    {
      id: 'wp_astraea',
      name: 'Grand Imperial Capital Astraea',
      nameId: 'Ibukota Kerajaan Emas Astraea',
      pos: [-340, -220],
    },
    {
      id: 'wp_valkragor',
      name: 'Val-Kragor Fortress Plaza',
      nameId: 'Alun-Alun Benteng Val-Kragor',
      pos: [380, 80],
    },
    {
      id: 'wp_thunderpeak',
      name: 'Thunderpeak Spire & Mage Tower',
      nameId: 'Mage Tower Puncak Halilintar',
      pos: [180, 60],
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
      nameId: 'Istana Taj Mahal Sultan Solaria',
      pos: [340, -280],
    },
    {
      id: 'wp_solaria',
      name: 'Solaria Golden Desert Pyramid',
      nameId: 'Piramida Emas Gurun Solaria',
      pos: [20, -220],
    },
    {
      id: 'wp_solaria_oasis',
      name: 'Solaria Hidden Oasis',
      nameId: 'Oase Tersembunyi Solaria',
      pos: [150, -360],
    },
    {
      id: 'wp_dragoncaldera',
      name: 'Primal Dragonfang Caldera',
      nameId: 'Kaldera Sarang Naga Purba',
      pos: [80, 360],
    },
    {
      id: 'wp_sandworm',
      name: 'The Great Solaria Sinkhole',
      nameId: 'Kawah Pusaran Sang Cacing Purba Jarrus',
      pos: [495, -362],
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
