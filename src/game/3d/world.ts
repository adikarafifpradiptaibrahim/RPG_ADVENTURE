import * as THREE from 'three';
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
  createTrainingDummyMesh,
  createBonfireMesh,
  createGiantMushroomMesh,
  createShipwreckMesh,
  createIceCrystalSpireMesh,
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
  roleType: 'elder' | 'guard' | 'alchemist' | 'blacksmith' | 'bard' | 'fisherman' | 'villager' | 'commander' | 'seer' | 'frostsmith';
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
  dirLight.position.set(50, 70, 35);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 220;
  const d = 75;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Expanded World Terrain specifications (Span: X[-155..155], Z[-135..105])
  const terrainWidth = 320;
  const terrainDepth = 250;
  const segmentsX = 128;
  const segmentsZ = 100;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segmentsX, segmentsZ);
  terrainGeo.rotateX(-Math.PI / 2);

  // Height function for diverse biomes across the vast world
  const getTerrainHeight = (x: number, z: number): number => {
    // 1. Starting Village: Desa Eldoria Center (x: -16..16, z: -16..16) -> Smooth flat plateau
    const distCenter = Math.hypot(x, z);
    if (distCenter < 14) {
      return 0.1;
    }

    // 2. Second Village: Desa Benteng Val-Kragor (x: 95..140, z: -38..5)
    // Elevated highland fortress plateau at y = 3.2
    const distValKragor = Math.hypot(x - 116, z - -17);
    if (distValKragor < 19) {
      return 3.2; // Perfectly flat fortress plateau
    }
    // Fortress western ramp / approach slope
    if (x >= 88 && x <= 98 && z >= -24 && z <= -10) {
      const t = (x - 88) / 10;
      return 1.8 + t * 1.4;
    }

    // 3. Misty Chasm & Wooden Suspension Bridge (x: 63..87, z: -30..0)
    // Deep gorge dividing east highland from central mainland
    if (x >= 63 && x <= 87 && z >= -34 && z <= 2) {
      // Bridge walking corridor: players smoothly traverse the bridge deck
      if (Math.abs(z - -15) <= 2.2 && x >= 62 && x <= 88) {
        const bridgeT = (x - 62) / 26;
        const sag = Math.sin(bridgeT * Math.PI) * 0.75;
        return 2.4 - sag;
      }
      // Chasm canyon floor drops down
      const chasmCenter = 75;
      const chasmDepth = Math.max(0, 1 - Math.abs(x - chasmCenter) / 12);
      return 1.2 - chasmDepth * 5.2;
    }

    // 4. Frostpeak Mountain Glacier (Far North-East: x > 85, z < -42)
    if (x > 85 && z < -42) {
      const peakDist = Math.hypot(x - 122, z - -85);
      // Summit Cryo Altar
      if (peakDist < 7) {
        return 6.2;
      }
      const mountainSlope = Math.min(10.5, 3.2 + Math.abs(z - -42) * 0.09 + Math.sin(x * 0.12) * 2.2);
      return mountainSlope;
    }

    // 5. Shadowfen Gloom Marsh (Far West: x < -65, z > -25 && z < 45)
    if (x < -65 && z > -25 && z < 45) {
      // Murky swamp with shallow puddles and mossy mounds
      const swampWater = Math.sin(x * 0.16) * 0.6 + Math.cos(z * 0.14) * 0.5;
      return Math.max(-0.25, 0.2 + swampWater);
    }

    // 6. Coral Cove & Ocean Beach (South-East: x > 48, z > 20)
    if (x > 48 && z > 20) {
      const coveDist = z - 20;
      const beachSlope = coveDist * 0.11;
      const seaWave = Math.sin(x * 0.12) * 0.35;
      const height = 0.2 - beachSlope + seaWave;
      if (height < -0.3) {
        return Math.max(-4.2, -0.3 - (z - 30) * 0.16);
      }
      return height;
    }

    // 7. Azure Coast & Ocean (South, z > 18)
    if (z > 18) {
      const beachSlope = (z - 18) * 0.12;
      const waveNoise = Math.sin(x * 0.15) * 0.4;
      const height = 0.1 - beachSlope + waveNoise;
      if (height < -0.4) {
        return Math.max(-4.5, -0.4 - (z - 28) * 0.18);
      }
      return height;
    }

    // 8. Boss Arena at North Volcanic Caldera (z < -36 && Math.abs(x) < 42)
    if (z < -36 && Math.abs(x) < 42) {
      const craterDist = Math.hypot(x, z - -52);
      if (craterDist < 16) {
        return -0.8 + Math.sin(x * 0.3) * 0.3; // Flat arena floor inside crater
      }
      return 1.5 + Math.sin(x * 0.2) * 1.2;
    }

    // 9. Ancient Ruins (West, x: -65..-18, z: -15..35)
    if (x < -18 && x > -65 && z > -15 && z < 35) {
      return 1.2 + Math.sin(x * 0.1) * 1.5 + Math.cos(z * 0.1) * 0.8;
    }

    // 10. Mystic Pine Forest (East, x: 18..62, z: -30..25)
    if (x > 18 && x < 62 && z > -30 && z < 25) {
      return 0.8 + Math.sin(x * 0.12) * 2.2 + Math.cos(z * 0.1) * 1.4;
    }

    // General rolling meadow terrain across continent
    let h =
      Math.sin(x * 0.08) * 1.6 +
      Math.cos(z * 0.07) * 1.4 +
      Math.sin(x * 0.15 + z * 0.15) * 0.8;

    // Edge boundary mountain walls
    if ((distCenter > 145 && z < 25) || z < -115 || x < -135 || x > 145) {
      const edgeFactor = Math.min(Math.max(0, distCenter - 130) * 0.35, 16);
      h += edgeFactor;
    }

    return h;
  };

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;

  // Vertex colors for rich biomes
  const colors: number[] = [];
  const colorGrass = new THREE.Color(0x689f38);
  const colorPath = new THREE.Color(0xd7ccc8);
  const colorFortressStone = new THREE.Color(0x475569); // Val-Kragor slate paving
  const colorStone = new THREE.Color(0x64748b);
  const colorVolcano = new THREE.Color(0x263238);
  const colorSand = new THREE.Color(0xffe082); // Beach sand
  const colorSeabed = new THREE.Color(0x80cbc4);
  const colorSnow = new THREE.Color(0xf1f5f9); // Frostpeak snow
  const colorIce = new THREE.Color(0xbae6fd);
  const colorSwampMud = new THREE.Color(0x3f3d23);
  const colorSwampMoss = new THREE.Color(0x2e381f);

  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    posAttr.setY(i, vy);

    const distCenter = Math.hypot(vx, vz);
    const distValKragor = Math.hypot(vx - 116, vz - -17);

    // 1. Village Eldoria cobblestone
    if (distCenter < 14) {
      colors.push(colorPath.r, colorPath.g, colorPath.b);
    }
    // 2. Desa Benteng Val-Kragor stone courtyard
    else if (distValKragor < 18) {
      colors.push(colorFortressStone.r, colorFortressStone.g, colorFortressStone.b);
    }
    // 3. Frostpeak Glacier & Snow
    else if (vx > 85 && vz < -42) {
      if (vy > 5.5) {
        colors.push(colorSnow.r, colorSnow.g, colorSnow.b);
      } else {
        colors.push(colorIce.r, colorIce.g, colorIce.b);
      }
    }
    // 4. Shadowfen Marsh Mud & Moss
    else if (vx < -65 && vz > -25 && vz < 45) {
      if (vy < 0.1) {
        colors.push(colorSwampMud.r, colorSwampMud.g, colorSwampMud.b);
      } else {
        colors.push(colorSwampMoss.r, colorSwampMoss.g, colorSwampMoss.b);
      }
    }
    // 5. Beach & Coral Cove & seabed
    else if (vz > 18) {
      if (vy < -0.3) {
        colors.push(colorSeabed.r, colorSeabed.g, colorSeabed.b);
      } else {
        colors.push(colorSand.r, colorSand.g, colorSand.b);
      }
    }
    // 6. Volcanic Crags
    else if (vz < -36 && Math.abs(vx) < 42) {
      colors.push(colorVolcano.r, colorVolcano.g, colorVolcano.b);
    }
    // 7. Mountain cliffs & ruins
    else if (vy > 3.0) {
      colors.push(colorStone.r, colorStone.g, colorStone.b);
    }
    // 8. Green meadows
    else {
      const tint = (Math.sin(vx * 0.2) + Math.cos(vz * 0.2)) * 0.04;
      colors.push(colorGrass.r + tint, colorGrass.g + tint, colorGrass.b);
    }
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

  // ==========================================
  // 1. VAST AZURE OCEAN WATER PLANE
  // ==========================================
  const oceanGeo = new THREE.PlaneGeometry(420, 220, 32, 32);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0096c7,
    roughness: 0.1,
    metalness: 0.45,
    transparent: true,
    opacity: 0.82,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.set(20, -0.25, 95);
  scene.add(oceanMesh);

  // Wooden Pier / Dock extending into ocean
  const pier = createPierDockMesh();
  pier.position.set(6, -0.4, 25);
  scene.add(pier);

  // Rowboat moored at the end of dock
  const boat = createBoatMesh();
  boat.position.set(9.5, -0.25, 36);
  boat.rotation.y = 0.4;
  scene.add(boat);

  // ==========================================
  // 2. EXPANDED VILLAGE, STRUCTURES & COLLIDERS
  // ==========================================
  const colliders: WorldCollider[] = [];
  const npcs: WorldNPC[] = [];

  // Pier dock colliders
  colliders.push(
    { type: 'box', minX: 4.2, maxX: 4.8, minZ: 18.5, maxZ: 32.5, label: 'Pier Left Rail' },
    { type: 'box', minX: 7.2, maxX: 7.8, minZ: 18.5, maxZ: 32.5, label: 'Pier Right Rail' }
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
  // 2.10 FROSTPEAK MOUNTAIN & CRYO ALTAR
  // (Far North-East Icy Mountain Summit)
  // ==========================================
  const frostSpire1 = createIceCrystalSpireMesh();
  frostSpire1.position.set(116, getTerrainHeight(116, -82), -82);
  const frostSpire2 = createIceCrystalSpireMesh();
  frostSpire2.position.set(128, getTerrainHeight(128, -88), -88);
  frostSpire2.scale.set(1.4, 1.4, 1.4);
  scene.add(frostSpire1, frostSpire2);

  // Ancient Ice Altar Circle
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
  const altarY = getTerrainHeight(122, -85);
  iceRing.position.set(122, altarY + 0.3, -85);
  scene.add(iceRing);

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
  }

  // ==========================================
  // 5. TREASURE CHESTS (Across all diverse regions!)
  // ==========================================
  const chestData = [
    { id: 'chest_village', pos: [-4, 0, 4] as [number, number, number] },
    { id: 'chest_beach', pos: [12, 0, 32] as [number, number, number] }, // By the ocean pier
    { id: 'chest_ruins', pos: [-35, 0, 24] as [number, number, number] }, // Ancient ruins altar
    { id: 'chest_forest', pos: [38, 0, 12] as [number, number, number] }, // Mystic deep forest
    { id: 'chest_boss_gateway', pos: [0, 0, -38] as [number, number, number] }, // Entrance to Titan Crater
    { id: 'chest_valkragor', pos: [134, 0, -22] as [number, number, number] }, // Fortress keep secret treasury
    { id: 'chest_frostpeak', pos: [122, 0, -85] as [number, number, number] }, // Cryo Altar Summit
    { id: 'chest_shadowfen', pos: [-110, 0, 12] as [number, number, number] }, // Shadowfen smuggler cache
    { id: 'chest_coralcove', pos: [86, 0, 56] as [number, number, number] }, // Shipwreck pirate gold
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
