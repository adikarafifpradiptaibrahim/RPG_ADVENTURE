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
  createMerchantGalleonMesh,
  createVikingWarshipMesh,
  createRowboatMesh,
  createIceSpikeMountainMesh,
  createWoodBarricadeMesh,
} from './models';

export interface WorldCollider {
  type: 'box' | 'circle';
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
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
  particles: THREE.Points;
  lavaParticles?: THREE.Points;
  getTerrainHeight: (x: number, z: number) => number;
}

export function buildWorld(scene: THREE.Scene): WorldObjects {
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

    // 1. Suspension bridge walkable deck corridor (x: 62..88, z: -17..-13)
    if (Math.abs(z - -15) <= 2.2 && x >= 62 && x <= 88) {
      const bridgeT = (x - 62) / 26;
      const sag = Math.sin(bridgeT * Math.PI) * 0.75;
      return 2.4 - sag;
    }

    // 2. Pier dock walkway deck planks and coastal harbor boardwalk network
    if (x >= -28 && x <= 38 && z >= 17.5 && z <= 21.5) return 1.825; // Shoreline boardwalk
    if (x >= 4.5 && x <= 7.5 && z >= 18.2 && z <= 52.5) return 1.825; // Main central pier
    if (x >= -16.5 && x <= -13.5 && z >= 18.5 && z <= 44.0) return 1.825; // West pier
    if (x >= 26.5 && x <= 29.5 && z >= 18.5 && z <= 44.0) return 1.825; // East pier
    if (x >= 148 && x <= 212 && z >= -288 && z <= -232) return 6.0; // Astraea Imperial plateau
    if (x >= 174 && x <= 186 && z >= -340 && z <= -300) return 4.6; // Frozen Chasm ice bridge

    // 3. Exact rendered polygon surface
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
  // 1b. EXPANDED SANCTUARY HARBOR & NAVAL BERTHS
  // Multi-pier docks, moored merchant galleons, shielded viking warships & rowboats
  // ==========================================
  // Main Central Pier (Extended out to sea)
  const pier1 = createPierDockMesh();
  pier1.position.set(6, -0.4, 25);
  scene.add(pier1);
  const pier1Outer = createPierDockMesh();
  pier1Outer.position.set(6, -0.4, 42);
  scene.add(pier1Outer);

  // West Pier Dock
  const pierWest = createPierDockMesh();
  pierWest.position.set(-15, -0.4, 30);
  scene.add(pierWest);

  // East Pier Dock
  const pierEast = createPierDockMesh();
  pierEast.position.set(28, -0.4, 30);
  scene.add(pierEast);

  // Connecting Shoreline Boardwalk Walkways
  const bwLeft = createPierDockMesh();
  bwLeft.position.set(-6, -0.4, 19.5);
  bwLeft.rotation.y = Math.PI / 2;
  scene.add(bwLeft);
  const bwRight = createPierDockMesh();
  bwRight.position.set(17, -0.4, 19.5);
  bwRight.rotation.y = Math.PI / 2;
  scene.add(bwRight);

  // Moored Merchant Galleons (Trading with Solaria and distant continents)
  const galleon1 = createMerchantGalleonMesh();
  galleon1.position.set(16, -0.3, 40);
  galleon1.rotation.y = -0.35;
  scene.add(galleon1);

  const galleon2 = createMerchantGalleonMesh();
  galleon2.position.set(-8, -0.3, 43);
  galleon2.rotation.y = 0.35;
  scene.add(galleon2);

  // Moored Shielded Wooden Warships (Sanctuary Naval Defense Fleet)
  const warship1 = createVikingWarshipMesh();
  warship1.position.set(38, -0.3, 38);
  warship1.rotation.y = -0.5;
  scene.add(warship1);

  const warship2 = createVikingWarshipMesh();
  warship2.position.set(-24, -0.3, 33);
  warship2.rotation.y = 0.6;
  scene.add(warship2);

  // Moored Coastal Rowboats
  const rowboat1 = createRowboatMesh();
  rowboat1.position.set(9.5, -0.25, 26);
  rowboat1.rotation.y = 0.4;
  scene.add(rowboat1);

  const rowboat2 = createRowboatMesh();
  rowboat2.position.set(-12, -0.25, 24);
  rowboat2.rotation.y = -0.3;
  scene.add(rowboat2);

  const rowboat3 = createRowboatMesh();
  rowboat3.position.set(25, -0.25, 34);
  rowboat3.rotation.y = 0.2;
  scene.add(rowboat3);

  // ==========================================
  // 2. EXPANDED VILLAGE, STRUCTURES & COLLIDERS
  // ==========================================
  const colliders: WorldCollider[] = [];
  const npcs: WorldNPC[] = [];

  // Expanded Harbor Pier rails and ship hull colliders
  colliders.push(
    // Main Pier rails
    { type: 'box', minX: 4.2, maxX: 4.8, minZ: 18.5, maxZ: 50.5, label: 'Dermaga Utama Pagar Kiri' },
    { type: 'box', minX: 7.2, maxX: 7.8, minZ: 18.5, maxZ: 50.5, label: 'Dermaga Utama Pagar Kanan' },
    // West Pier rails
    { type: 'box', minX: -16.8, maxX: -16.2, minZ: 18.5, maxZ: 41.5, label: 'Dermaga Barat Pagar Kiri' },
    { type: 'box', minX: -13.8, maxX: -13.2, minZ: 18.5, maxZ: 41.5, label: 'Dermaga Barat Pagar Kanan' },
    // East Pier rails
    { type: 'box', minX: 26.2, maxX: 26.8, minZ: 18.5, maxZ: 41.5, label: 'Dermaga Timur Pagar Kiri' },
    { type: 'box', minX: 29.2, maxX: 29.8, minZ: 18.5, maxZ: 41.5, label: 'Dermaga Timur Pagar Kanan' },
    // Ship hull colliders
    { type: 'box', minX: 13.5, maxX: 18.5, minZ: 32, maxZ: 48, label: 'Lambung Kapal Dagang Emas 1' },
    { type: 'box', minX: -10.5, maxX: -5.5, minZ: 35, maxZ: 51, label: 'Lambung Kapal Dagang Emas 2' },
    { type: 'box', minX: 35.5, maxX: 40.5, minZ: 30, maxZ: 46, label: 'Kapal Perang Bershield 1' },
    { type: 'box', minX: -26.5, maxX: -21.5, minZ: 25, maxZ: 41, label: 'Kapal Perang Bershield 2' }
  );

  // 2.1 Northern Village Gateway Arch
  const villageArch = createVillageArchMesh('GERBANG ELDORIA');
  const archZ = -17;
  villageArch.position.set(0, getTerrainHeight(0, archZ), archZ);
  scene.add(villageArch);
  colliders.push(
    { type: 'circle', x: -3.5, z: archZ, radius: 0.6, label: 'Gerbang Pilar Kiri' },
    { type: 'circle', x: 3.5, z: archZ, radius: 0.6, label: 'Gerbang Pilar Kanan' }
  );

  // 2.2 Sanctuary Fountain / Water Pond in Center Plaza
  const waterGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.4, 16);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x00b4d8,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, 0.15, -4);
  scene.add(waterMesh);

  const fountainRim = new THREE.Mesh(
    new THREE.TorusGeometry(4.6, 0.35, 8, 20),
    new THREE.MeshLambertMaterial({ color: 0xb0bec5, flatShading: true })
  );
  fountainRim.rotation.x = Math.PI / 2;
  fountainRim.position.set(0, 0.3, -4);
  scene.add(fountainRim);

  // Center water jet spout
  const spoutMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.6, 8), spoutMat);
  spout.position.set(0, 0.8, -4);
  scene.add(spout);
  colliders.push({ type: 'circle', x: 0, z: -4, radius: 4.8, label: 'Air Mancur Kuil' });

  // 2.3 Village Tavern: "Penginapan Eldoria" (North-East Plaza)
  const tavern = createTavernMesh();
  const tavernPos = { x: 12, z: -9 };
  tavern.position.set(tavernPos.x, getTerrainHeight(tavernPos.x, tavernPos.z), tavernPos.z);
  tavern.rotation.y = -Math.PI / 8;
  scene.add(tavern);
  colliders.push({
    type: 'box',
    minX: tavernPos.x - 3.4,
    maxX: tavernPos.x + 3.4,
    minZ: tavernPos.z - 3.0,
    maxZ: tavernPos.z + 3.0,
    label: 'Penginapan Eldoria',
  });

  // 2.4 Master Torvald's Blacksmith Forge (West Plaza)
  const blacksmith = createBlacksmithMesh();
  const forgePos = { x: -12, z: 3 };
  blacksmith.position.set(forgePos.x, getTerrainHeight(forgePos.x, forgePos.z), forgePos.z);
  blacksmith.rotation.y = Math.PI / 5;
  scene.add(blacksmith);
  colliders.push({
    type: 'box',
    minX: forgePos.x - 3.0,
    maxX: forgePos.x + 3.0,
    minZ: forgePos.z - 2.8,
    maxZ: forgePos.z + 2.8,
    label: 'Bengkel Pandai Besi',
  });

  // 2.5 Anya's Alchemy & Potion Stall (East Plaza)
  const anyaStall = createMarketStallMesh(0x15803d);
  const anyaPos = { x: 9.5, z: 4.5 };
  anyaStall.position.set(anyaPos.x, getTerrainHeight(anyaPos.x, anyaPos.z), anyaPos.z);
  anyaStall.rotation.y = -Math.PI / 6;
  scene.add(anyaStall);
  colliders.push({
    type: 'box',
    minX: anyaPos.x - 1.6,
    maxX: anyaPos.x + 1.6,
    minZ: anyaPos.z - 1.1,
    maxZ: anyaPos.z + 1.1,
    label: 'Kios Alkemis Anya',
  });

  // 2.6 Maya's Armor & Equipment Shop Stall (South Plaza)
  const marketStall2 = createArmorStallMesh(0x1e3a8a);
  const m2Pos = { x: 3.5, z: 8.5 };
  marketStall2.position.set(m2Pos.x, getTerrainHeight(m2Pos.x, m2Pos.z), m2Pos.z);
  marketStall2.rotation.y = Math.PI / 4;
  scene.add(marketStall2);
  colliders.push({
    type: 'box',
    minX: m2Pos.x - 1.6,
    maxX: m2Pos.x + 1.6,
    minZ: m2Pos.z - 1.1,
    maxZ: m2Pos.z + 1.1,
    label: 'Toko Zirah & Perlengkapan Maya',
  });

  // 2.7 House 1: Sanctuary Elder Lodge (North-West)
  const house1 = createVillageHouseMesh();
  const h1Pos = { x: -9, z: -10 };
  house1.position.set(h1Pos.x, getTerrainHeight(h1Pos.x, h1Pos.z), h1Pos.z);
  house1.rotation.y = Math.PI / 6;
  scene.add(house1);
  colliders.push({
    type: 'box',
    minX: h1Pos.x - 2.8,
    maxX: h1Pos.x + 2.8,
    minZ: h1Pos.z - 2.6,
    maxZ: h1Pos.z + 2.6,
    label: 'Kediaman Tetua',
  });

  // 2.8 House 2: South-West Resident Cottage
  const house2 = createVillageHouseMesh();
  const h2Pos = { x: -11, z: 13 };
  house2.position.set(h2Pos.x, getTerrainHeight(h2Pos.x, h2Pos.z), h2Pos.z);
  house2.rotation.y = Math.PI / 3;
  scene.add(house2);
  colliders.push({
    type: 'box',
    minX: h2Pos.x - 2.8,
    maxX: h2Pos.x + 2.8,
    minZ: h2Pos.z - 2.6,
    maxZ: h2Pos.z + 2.6,
    label: 'Rumah Warga Barat',
  });

  // 2.9 House 3: South-East Resident Cottage
  const house3 = createVillageHouseMesh();
  const h3Pos = { x: 12, z: 13 };
  house3.position.set(h3Pos.x, getTerrainHeight(h3Pos.x, h3Pos.z), h3Pos.z);
  house3.rotation.y = -Math.PI / 4;
  scene.add(house3);
  colliders.push({
    type: 'box',
    minX: h3Pos.x - 2.8,
    maxX: h3Pos.x + 2.8,
    minZ: h3Pos.z - 2.6,
    maxZ: h3Pos.z + 2.6,
    label: 'Rumah Warga Timur',
  });

  // 2.10 House 4: East Meadow Cottage
  const house4 = createVillageHouseMesh();
  const h4Pos = { x: 20, z: -12 };
  house4.position.set(h4Pos.x, getTerrainHeight(h4Pos.x, h4Pos.z), h4Pos.z);
  house4.rotation.y = -Math.PI / 3;
  scene.add(house4);
  colliders.push({
    type: 'box',
    minX: h4Pos.x - 2.8,
    maxX: h4Pos.x + 2.8,
    minZ: h4Pos.z - 2.6,
    maxZ: h4Pos.z + 2.6,
    label: 'Rumah Warga Padang Rumput Timur',
  });

  // 2.11 House 5: North Gatekeeper Cottage
  const house5 = createVillageHouseMesh();
  const h5Pos = { x: 5, z: -22 };
  house5.position.set(h5Pos.x, getTerrainHeight(h5Pos.x, h5Pos.z), h5Pos.z);
  house5.rotation.y = Math.PI / 6;
  scene.add(house5);
  colliders.push({
    type: 'box',
    minX: h5Pos.x - 2.8,
    maxX: h5Pos.x + 2.8,
    minZ: h5Pos.z - 2.6,
    maxZ: h5Pos.z + 2.6,
    label: 'Pondok Penjaga Gerbang Utara',
  });

  // 2.12 House 6: West Orchard Cottage
  const house6 = createVillageHouseMesh();
  const h6Pos = { x: -22, z: -18 };
  house6.position.set(h6Pos.x, getTerrainHeight(h6Pos.x, h6Pos.z), h6Pos.z);
  house6.rotation.y = Math.PI / 4;
  scene.add(house6);
  colliders.push({
    type: 'box',
    minX: h6Pos.x - 2.8,
    maxX: h6Pos.x + 2.8,
    minZ: h6Pos.z - 2.6,
    maxZ: h6Pos.z + 2.6,
    label: 'Rumah Kebun Barat',
  });

  // 2.13 House 7: West Herbalist Cottage
  const house7 = createVillageHouseMesh();
  const h7Pos = { x: -26, z: 4 };
  house7.position.set(h7Pos.x, getTerrainHeight(h7Pos.x, h7Pos.z), h7Pos.z);
  house7.rotation.y = -Math.PI / 8;
  scene.add(house7);
  colliders.push({
    type: 'box',
    minX: h7Pos.x - 2.8,
    maxX: h7Pos.x + 2.8,
    minZ: h7Pos.z - 2.6,
    maxZ: h7Pos.z + 2.6,
    label: 'Pondok Herbalis Barat',
  });

  // 2.14 House 8: Coastal Fisher Cottage (Near West Pier)
  const house8 = createVillageHouseMesh();
  const h8Pos = { x: -15, z: 12 };
  house8.position.set(h8Pos.x, getTerrainHeight(h8Pos.x, h8Pos.z), h8Pos.z);
  house8.rotation.y = Math.PI / 2;
  scene.add(house8);
  colliders.push({
    type: 'box',
    minX: h8Pos.x - 2.8,
    maxX: h8Pos.x + 2.8,
    minZ: h8Pos.z - 2.6,
    maxZ: h8Pos.z + 2.6,
    label: 'Pondok Nelayan Pesisir',
  });

  // 2.10 Street Lamps along Village Cobblestones
  const lampPositions = [
    [-4, 0],
    [4, 0],
    [0, -13],
    [-7, -5],
    [7, -4],
    [-5, 8],
    [5, 8],
    [5.5, 17], // Near Pier path
  ];
  lampPositions.forEach(([lx, lz]) => {
    const lamp = createStreetLampMesh();
    lamp.position.set(lx, getTerrainHeight(lx, lz), lz);
    scene.add(lamp);
    colliders.push({ type: 'circle', x: lx, z: lz, radius: 0.35, label: 'Lampu Jalan' });
  });

  // Village barrels & storage crates
  const barrelPositions = [
    [-6, -8],
    [-6.8, -8],
    [7, -6],
    [-8, 6],
    [4.2, 26], // on the pier
  ];
  barrelPositions.forEach(([bx, bz]) => {
    const barrel = createBarrelMesh();
    barrel.position.set(bx, getTerrainHeight(bx, bz), bz);
    scene.add(barrel);
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 0.45, label: 'Tong Kayu' });
  });

  // ==========================================
  // RANDOM NPCS OF ELDORIA
  // ==========================================
  // NPC 1: Tetua Vaelen (Penjaga Kuil)
  const elderGroup = createNPCMesh();
  const elderPos: [number, number, number] = [2.8, getTerrainHeight(2.8, -2), -2];
  elderGroup.position.set(...elderPos);
  elderGroup.rotation.y = -Math.PI / 3;
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
  const guardPos: [number, number, number] = [0, getTerrainHeight(0, -15.5), -15.5];
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

  // NPC 3: Anya (Alkemis & Herbalis)
  const anyaGroup = createCustomNPCMesh('alchemist');
  const anyaNPCPos: [number, number, number] = [8.5, getTerrainHeight(8.5, 3.5), 3.5];
  anyaGroup.position.set(...anyaNPCPos);
  anyaGroup.rotation.y = -Math.PI / 4;
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

  // NPC 4: Master Torvald (Pandai Besi Kuat)
  const torvaldGroup = createCustomNPCMesh('blacksmith');
  const torvaldPos: [number, number, number] = [-10.5, getTerrainHeight(-10.5, 3.5), 3.5];
  torvaldGroup.position.set(...torvaldPos);
  torvaldGroup.rotation.y = Math.PI / 4;
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

  // NPC 5: Lyra the Wandering Bard (Near Tavern)
  const bardGroup = createCustomNPCMesh('bard');
  const bardPos: [number, number, number] = [9.5, getTerrainHeight(9.5, -6.5), -6.5];
  bardGroup.position.set(...bardPos);
  bardGroup.rotation.y = -Math.PI / 2.5;
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

  // NPC 6: Nelayan Pak Joko (Coastal Fisherman on pier)
  const jokoGroup = createCustomNPCMesh('fisherman');
  const jokoPos: [number, number, number] = [4.8, 2.1, 23.5];
  jokoGroup.position.set(...jokoPos);
  jokoGroup.rotation.y = Math.PI / 2;
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

  // NPC 7: Kael (Warga Desa Muda)
  const kaelGroup = createCustomNPCMesh('villager');
  const kaelPos: [number, number, number] = [-3.5, getTerrainHeight(-3.5, 2.5), 2.5];
  kaelGroup.position.set(...kaelPos);
  kaelGroup.rotation.y = Math.PI / 3;
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

  // NPC 8: Maya (Toko Zirah & Perlengkapan Tempur)
  const mayaGroup = createCustomNPCMesh('villager');
  const mayaPos: [number, number, number] = [4.2, getTerrainHeight(4.2, 7.2), 7.2];
  mayaGroup.position.set(...mayaPos);
  mayaGroup.rotation.y = -Math.PI / 3;
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
  // 2.8 SECOND VILLAGE: DESA BENTENG VAL-KRAGOR
  // (Far-East Highland Fortress Village)
  // ==========================================
  const valKragorBaseY = 3.2;

  // A. Grand Fortress Gatehouse (West Entrance)
  const fortressGate = createFortressGatehouseMesh();
  fortressGate.position.set(98, valKragorBaseY, -17);
  fortressGate.rotation.y = Math.PI / 2;
  scene.add(fortressGate);
  colliders.push(
    { type: 'box', minX: 95.5, maxX: 100.5, minZ: -22.5, maxZ: -19.5, label: 'Menara Gerbang Val-Kragor Kiri' },
    { type: 'box', minX: 95.5, maxX: 100.5, minZ: -14.5, maxZ: -11.5, label: 'Menara Gerbang Val-Kragor Kanan' }
  );

  // B. Grand Fortress Citadel / Command Keep
  const fortressKeep = createFortressKeepMesh();
  fortressKeep.position.set(134, valKragorBaseY, -17);
  fortressKeep.rotation.y = -Math.PI / 2;
  scene.add(fortressKeep);
  colliders.push({
    type: 'box',
    minX: 129,
    maxX: 139,
    minZ: -23,
    maxZ: -11,
    label: 'Kastil Komando Val-Kragor',
  });

  // C. Four Sturdy Watchtowers
  const towerCoords = [
    { x: 104, z: -32, label: 'Menara Barat Laut' },
    { x: 104, z: -2, label: 'Menara Barat Daya' },
    { x: 132, z: -32, label: 'Menara Timur Laut' },
    { x: 132, z: -2, label: 'Menara Timur Daya' },
  ];
  towerCoords.forEach((tc) => {
    const tower = createFortressWatchtowerMesh();
    tower.position.set(tc.x, valKragorBaseY, tc.z);
    scene.add(tower);
    colliders.push({ type: 'circle', x: tc.x, z: tc.z, radius: 2.5, label: tc.label });
  });

  // B2. Solid Fortress Rampart Walls Enclosing Val-Kragor Settlement
  // North Wall (connecting NW Watchtower [104, -32] to NE Watchtower [132, -32])
  const vkWallNorth = createFortressWallMesh(28);
  vkWallNorth.position.set(118, valKragorBaseY, -32);
  scene.add(vkWallNorth);
  colliders.push({ type: 'box', minX: 104, maxX: 132, minZ: -33.5, maxZ: -30.5, label: 'Benteng Val-Kragor Utara' });

  // South Wall (connecting SW Watchtower [104, -2] to SE Watchtower [132, -2])
  const vkWallSouth = createFortressWallMesh(28);
  vkWallSouth.position.set(118, valKragorBaseY, -2);
  scene.add(vkWallSouth);
  colliders.push({ type: 'box', minX: 104, maxX: 132, minZ: -3.5, maxZ: -0.5, label: 'Benteng Val-Kragor Selatan' });

  // East Wall (connecting NE Watchtower [132, -32] to SE Watchtower [132, -2])
  const vkWallEast = createFortressWallMesh(30);
  vkWallEast.position.set(132, valKragorBaseY, -17);
  vkWallEast.rotation.y = Math.PI / 2;
  scene.add(vkWallEast);
  colliders.push({ type: 'box', minX: 130.5, maxX: 133.5, minZ: -32, maxZ: -2, label: 'Benteng Val-Kragor Timur' });

  // West Wall North Segment (connecting NW Watchtower to Gate North Bastion)
  const vkWallWestN = createFortressWallMesh(11);
  vkWallWestN.position.set(100, valKragorBaseY, -26.5);
  vkWallWestN.rotation.y = Math.PI / 2;
  scene.add(vkWallWestN);
  colliders.push({ type: 'box', minX: 98.5, maxX: 101.5, minZ: -32, maxZ: -21, label: 'Benteng Val-Kragor Barat Laut' });

  // West Wall South Segment (connecting SW Watchtower to Gate South Bastion)
  const vkWallWestS = createFortressWallMesh(11);
  vkWallWestS.position.set(100, valKragorBaseY, -7.5);
  vkWallWestS.rotation.y = Math.PI / 2;
  scene.add(vkWallWestS);
  colliders.push({ type: 'box', minX: 98.5, maxX: 101.5, minZ: -13, maxZ: -2, label: 'Benteng Val-Kragor Barat Daya' });

  // B3. Outer Perimeter Watchtowers (Extended Surveillance Perimeter)
  const outerVkTowers = [
    { x: 88, z: -45, label: 'Menara Pengawas Luar Barat Laut Val-Kragor' },
    { x: 150, z: -45, label: 'Menara Pengawas Luar Timur Laut Val-Kragor' },
    { x: 88, z: 12, label: 'Menara Pengawas Luar Barat Daya Val-Kragor' },
    { x: 150, z: 12, label: 'Menara Pengawas Luar Timur Daya Val-Kragor' },
  ];
  outerVkTowers.forEach((ot) => {
    const oTower = createFortressWatchtowerMesh();
    oTower.position.set(ot.x, getTerrainHeight(ot.x, ot.z), ot.z);
    scene.add(oTower);
    colliders.push({ type: 'circle', x: ot.x, z: ot.z, radius: 2.5, label: ot.label });
  });

  // B4. Heavy Spiked Wooden & Stone Barricades Guarding Approaches
  // Approach 1: Western mountain pass entrance
  const vkBarricadeWest = createWoodBarricadeMesh(12);
  vkBarricadeWest.position.set(92, valKragorBaseY, -18);
  vkBarricadeWest.rotation.y = Math.PI / 2;
  scene.add(vkBarricadeWest);
  colliders.push({ type: 'box', minX: 90.5, maxX: 93.5, minZ: -24, maxZ: -12, label: 'Barikade Gerbang Barat Val-Kragor' });

  // Approach 2: Southern highland mountain slope
  const vkBarricadeSouth = createWoodBarricadeMesh(14);
  vkBarricadeSouth.position.set(118, valKragorBaseY, 8);
  scene.add(vkBarricadeSouth);
  colliders.push({ type: 'box', minX: 111, maxX: 125, minZ: 6.8, maxZ: 9.2, label: 'Barikade Lereng Selatan Val-Kragor' });

  // Approach 3: Northern frost pass
  const vkBarricadeNorth = createWoodBarricadeMesh(12);
  vkBarricadeNorth.position.set(118, valKragorBaseY, -42);
  scene.add(vkBarricadeNorth);
  colliders.push({ type: 'box', minX: 112, maxX: 124, minZ: -43.2, maxZ: -40.8, label: 'Barikade Lereng Utara Val-Kragor' });

  // D. Goran's Highland Armory & Mountain Forge
  const goranForge = createBlacksmithMesh();
  goranForge.position.set(122, valKragorBaseY, -28);
  goranForge.rotation.y = 0;
  scene.add(goranForge);
  colliders.push({
    type: 'box',
    minX: 119,
    maxX: 125,
    minZ: -31,
    maxZ: -25,
    label: 'Bengkel Tempa Gunung Goran',
  });

  // E. Frostwolf Tavern / Highland Longhouse (Kedai Serigala Salju)
  const frostwolfLodge = createTavernMesh();
  frostwolfLodge.position.set(120, valKragorBaseY, -5);
  frostwolfLodge.rotation.y = Math.PI;
  scene.add(frostwolfLodge);
  colliders.push({
    type: 'box',
    minX: 116,
    maxX: 124,
    minZ: -8.5,
    maxZ: -1.5,
    label: 'Kedai Serigala Salju',
  });

  // F. Training Yard with Combat Dummies & Weapon Racks
  const dummy1 = createTrainingDummyMesh();
  dummy1.position.set(110, valKragorBaseY, -26);
  dummy1.rotation.y = Math.PI / 4;
  const dummy2 = createTrainingDummyMesh();
  dummy2.position.set(114, valKragorBaseY, -26);
  dummy2.rotation.y = -Math.PI / 6;
  scene.add(dummy1, dummy2);
  colliders.push(
    { type: 'circle', x: 110, z: -26, radius: 0.6, label: 'Target Latihan 1' },
    { type: 'circle', x: 114, z: -26, radius: 0.6, label: 'Target Latihan 2' }
  );

  // G. Central Plaza Roaring Bonfire (Pusat Perapian Benteng)
  const fortressFire = createBonfireMesh();
  fortressFire.position.set(116, valKragorBaseY, -17);
  scene.add(fortressFire);
  colliders.push({ type: 'circle', x: 116, z: -17, radius: 1.2, label: 'Perapian Utama Benteng' });

  // H. Iron Streetlamps with warm light
  for (const lx of [106, 126]) {
    for (const lz of [-22, -12]) {
      const lamp = createStreetLampMesh();
      lamp.position.set(lx, valKragorBaseY, lz);
      scene.add(lamp);
    }
  }

  // --- NPCS OF DESA BENTENG VAL-KRAGOR ---
  // NPC 9: Komandan Brann (Highland Fortress Commander)
  const brannGroup = createCustomNPCMesh('commander');
  const brannPos: [number, number, number] = [118, valKragorBaseY, -15];
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
  const eloraPos: [number, number, number] = [124, valKragorBaseY, -10];
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
  const goranPos: [number, number, number] = [120, valKragorBaseY, -26];
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

  // NPC 12: Fortress Gate Sentinel (Penjaga Gerbang)
  const fGuardGroup = createCustomNPCMesh('guard');
  const fGuardPos: [number, number, number] = [101, valKragorBaseY, -14];
  fGuardGroup.position.set(...fGuardPos);
  fGuardGroup.rotation.y = Math.PI / 2;
  scene.add(fGuardGroup);
  npcs.push({
    id: 'guard_valkragor',
    name: 'Val-Kragor Sentinel',
    nameId: 'Prajurit Penjaga Benteng',
    role: 'Fortress Vanguard',
    roleType: 'guard',
    group: fGuardGroup,
    position: fGuardPos,
    dialogueId: 'guard_valkragor',
    icon: '🛡️',
  });

  // ==========================================
  // 2.9 MISTY CHASM & SUSPENSION BRIDGE
  // Spanning the chasm at X: 75, Z: -15
  // ==========================================
  const bridge = createSuspensionBridgeMesh(26);
  bridge.position.set(75, 2.4, -15);
  scene.add(bridge);
  // Bridge side barrier colliders
  colliders.push(
    { type: 'box', minX: 62, maxX: 88, minZ: -17.5, maxZ: -16.5, label: 'Pagar Jembatan Kiri' },
    { type: 'box', minX: 62, maxX: 88, minZ: -13.5, maxZ: -12.5, label: 'Pagar Jembatan Kanan' }
  );

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
  // Luminescent Giant Mushrooms & Murky Waters
  // ==========================================
  const swampShroomCoords = [
    { x: -88, z: 8, color: 0xa855f7, scale: 1.2 },
    { x: -98, z: 22, color: 0x06b6d4, scale: 1.5 },
    { x: -110, z: -6, color: 0x10b981, scale: 1.3 },
    { x: -118, z: 18, color: 0xec4899, scale: 1.6 },
    { x: -78, z: 28, color: 0x8b5cf6, scale: 1.1 },
  ];
  swampShroomCoords.forEach((sc) => {
    const shroom = createGiantMushroomMesh(sc.color);
    const sy = getTerrainHeight(sc.x, sc.z);
    shroom.position.set(sc.x, sy, sc.z);
    shroom.scale.set(sc.scale, sc.scale, sc.scale);
    scene.add(shroom);
    colliders.push({ type: 'circle', x: sc.x, z: sc.z, radius: 0.8, label: 'Batang Jamur Raksasa' });
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
  // 3. ANCIENT RUINS (West)
  // ==========================================
  // Monumental Ancient Archway Gate
  const ancientArch = createAncientArchMesh();
  const archY = getTerrainHeight(-28, 16);
  ancientArch.position.set(-28, archY, 16);
  ancientArch.rotation.y = 0.3;
  scene.add(ancientArch);
  colliders.push(
    { type: 'circle', x: -30.5, z: 16, radius: 0.9, label: 'Pilar Gapura Kuno Kiri' },
    { type: 'circle', x: -25.5, z: 16, radius: 0.9, label: 'Pilar Gapura Kuno Kanan' }
  );

  // Ancient Pillars
  const ruinsPositions = [
    { x: -24, z: 22 },
    { x: -32, z: 25 },
    { x: -22, z: 32 },
    { x: -36, z: 16 },
    { x: -42, z: 22 },
    { x: -38, z: 28 },
    { x: -46, z: 12 },
    { x: -26, z: 8 },
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

    // Avoid village plaza
    if (Math.abs(tx) < 14 && Math.abs(tz) < 14) continue;
    // Avoid boss arena center
    if (tz < -35 && Math.abs(tx) < 26) continue;
    // Deep ocean has no trees
    if (tz > 35) continue;

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

    // Tree solid obstacle collider so player does not pass through trees
    colliders.push({
      type: 'circle',
      x: tx,
      z: tz,
      radius: 0.55 * scale,
      label: 'Pohon',
    });
  }

  // ==========================================
  // 5. SOLARIA GOLDEN DUNES & SUNKEN PYRAMID (South-West)
  // ==========================================
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

  // Desert Oasis Palms
  const palmPositions = [
    { x: -142, z: 86 },
    { x: -148, z: 90 },
    { x: -138, z: 94 },
    { x: -184, z: 128 },
    { x: -190, z: 134 },
  ];
  palmPositions.forEach((pos) => {
    const palm = createDesertPalmMesh();
    palm.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    palm.rotation.y = Math.random() * Math.PI * 2;
    scene.add(palm);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 0.65, label: 'Pohon Palem Solaria' });
  });

  // ==========================================
  // 6. THUNDERPEAK LIGHTNING SPIRES (North-West)
  // ==========================================
  const thunderSpireMain = createThunderSpireMesh();
  const tspY = getTerrainHeight(-155, -135);
  thunderSpireMain.position.set(-155, tspY, -135);
  scene.add(thunderSpireMain);
  colliders.push({ type: 'circle', x: -155, z: -135, radius: 1.8, label: 'Menara Altar Halilintar' });

  const secondarySpires = [
    { x: -172, z: -148 },
    { x: -138, z: -122 },
    { x: -168, z: -118 },
  ];
  secondarySpires.forEach((pos) => {
    const spire = createThunderSpireMesh();
    spire.scale.set(0.75, 0.85, 0.75);
    spire.position.set(pos.x, getTerrainHeight(pos.x, pos.z), pos.z);
    scene.add(spire);
    colliders.push({ type: 'circle', x: pos.x, z: pos.z, radius: 1.2, label: 'Pilar Petir' });
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
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 0.55 * s, label: 'Bambu Giok' });
  }

  // ==========================================
  // 8. DRAGONFANG CALDERA & SKELETON (Far North)
  // ==========================================
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

  // Surrounding volcanic horn arches
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
  // Grand staircase and royal red carpet descend West towards the central fountain and West Gate!
  const imperialPalace = createImperialPalaceMesh();
  imperialPalace.position.set(195, astraeaBaseY, -260);
  imperialPalace.rotation.y = Math.PI * 1.5;
  scene.add(imperialPalace);
  colliders.push({
    type: 'box',
    minX: 186,
    maxX: 206,
    minZ: -271,
    maxZ: -249,
    label: 'Istana Kerajaan Kaisar Astraea',
  });

  // B. Celestial 3-Tier Fountain of Immortality (Central Sun Plaza, X: 175, Z: -260)
  const celestialFountain = createImperialFountainMesh();
  celestialFountain.position.set(175, astraeaBaseY, -260);
  scene.add(celestialFountain);
  colliders.push({
    type: 'circle',
    x: 175,
    z: -260,
    radius: 4.8,
    label: 'Air Mancur Keabadian Astraea',
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

  // E. Grand Royal Bazaar Stalls flanking Central Plaza
  const astraeaStall1 = createImperialBazaarStallMesh(0x9333ea, 0xfacc15); // Celestial Potions (Lyra)
  astraeaStall1.position.set(170, astraeaBaseY, -268);
  astraeaStall1.rotation.y = Math.PI; // Facing South into plaza
  scene.add(astraeaStall1);
  colliders.push({ type: 'box', minX: 168, maxX: 172, minZ: -270, maxZ: -266, label: 'Kios Alkimia Kerajaan' });

  const astraeaStall2 = createImperialBazaarStallMesh(0x2563eb, 0x38bdf8); // Masterwork Armory
  astraeaStall2.position.set(180, astraeaBaseY, -268);
  astraeaStall2.rotation.y = Math.PI; // Facing South into plaza
  scene.add(astraeaStall2);
  colliders.push({ type: 'box', minX: 178, maxX: 182, minZ: -270, maxZ: -266, label: 'Kios Senjata Astraea' });

  const astraeaStall3 = createImperialBazaarStallMesh(0xd97706, 0xfef08a); // Silk & Relics
  astraeaStall3.position.set(170, astraeaBaseY, -252);
  astraeaStall3.rotation.y = 0; // Facing North into plaza
  scene.add(astraeaStall3);
  colliders.push({ type: 'box', minX: 168, maxX: 172, minZ: -254, maxZ: -250, label: 'Kios Sutra Emas' });

  const astraeaStall4 = createImperialBazaarStallMesh(0x059669, 0xa7f3d0); // Royal Provisions
  astraeaStall4.position.set(180, astraeaBaseY, -252);
  astraeaStall4.rotation.y = 0; // Facing North into plaza
  scene.add(astraeaStall4);
  colliders.push({ type: 'box', minX: 178, maxX: 182, minZ: -254, maxZ: -250, label: 'Kios Perjamuan Kaisar' });

  // F. Heroic Monuments Flanking Royal Avenue
  const heroStatue1 = createImperialHeroStatueMesh();
  heroStatue1.position.set(158, astraeaBaseY, -264);
  scene.add(heroStatue1);
  colliders.push({ type: 'circle', x: 158, z: -264, radius: 1.4, label: 'Monumen Pahlawan Astraea' });

  const heroStatue2 = createImperialHeroStatueMesh();
  heroStatue2.position.set(158, astraeaBaseY, -256);
  scene.add(heroStatue2);
  colliders.push({ type: 'circle', x: 158, z: -256, radius: 1.4, label: 'Monumen Ksatria Emas' });

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
  const emperorPos: [number, number, number] = [187.2, astraeaBaseY + 1.6, -260];
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

  // NPC 14: Panglima Perang Vane (At Avenue Entry inside West Gate, facing West)
  const marshalGroup = createCustomNPCMesh('marshal');
  const marshalPos: [number, number, number] = [154, astraeaBaseY, -257];
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
  const lyraPos: [number, number, number] = [170, astraeaBaseY, -266];
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

  // Oasis Palm Ring
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    const px = -340 + Math.cos(angle) * 17;
    const pz = 260 + Math.sin(angle) * 17;
    const py = getTerrainHeight(px, pz);
    const palm = createDesertPalmMesh();
    palm.position.set(px, py, pz);
    palm.rotation.y = angle + 0.5;
    scene.add(palm);
    colliders.push({ type: 'circle', x: px, z: pz, radius: 0.65, label: 'Pohon Palem Oase' });
  }

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
    { id: 'chest_beach', pos: [12, 0, 32] as [number, number, number] }, // By the ocean pier
    { id: 'chest_ruins', pos: [-35, 0, 24] as [number, number, number] }, // Ancient ruins altar
    { id: 'chest_forest', pos: [38, 0, 12] as [number, number, number] }, // Mystic deep forest
    { id: 'chest_boss_gateway', pos: [0, 0, -38] as [number, number, number] }, // Entrance to Titan Crater
    { id: 'chest_valkragor', pos: [134, 0, -22] as [number, number, number] }, // Fortress keep secret treasury
    { id: 'chest_frostpeak', pos: [115, 0, -65] as [number, number, number] }, // Cryo Altar Summit
    { id: 'chest_shadowfen', pos: [-110, 0, 12] as [number, number, number] }, // Shadowfen smuggler cache
    { id: 'chest_coralcove', pos: [86, 0, 56] as [number, number, number] }, // Shipwreck pirate gold
    { id: 'chest_solaria', pos: [-165, 0, 110] as [number, number, number] }, // Solaria Pharaoh Gold
    { id: 'chest_thunderpeak', pos: [-155, 0, -135] as [number, number, number] }, // Storm Altar Relic
    { id: 'chest_jadepagoda', pos: [165, 0, 115] as [number, number, number] }, // Celestial Pagoda Treasure
    { id: 'chest_dragoncaldera', pos: [20, 0, -145] as [number, number, number] }, // Dragon Hoard
    { id: 'chest_astraea', pos: [202, 0, -260] as [number, number, number] }, // Astraea Imperial Vault
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
    particles,
    getTerrainHeight,
  };
}
