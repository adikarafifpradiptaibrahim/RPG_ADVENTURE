import * as THREE from 'three';
import { WorldCollider } from './world';
import {
  createImperialThroneMesh,
  createImperialKnightStatueMesh,
  createImperialBanquetTableMesh,
  createImperialWarTableMesh,
  createCustomNPCMesh,
} from './models';

export interface Transform {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
}

export interface InteriorRoom {
  id: string;
  name: string;
  exteriorName: string;
  rootGroup: THREE.Group;
  origin: Transform;
  dimensions: { width: number; depth: number; height: number };
  interiorSpawn: Transform;
  exteriorDoorPos: Transform;
  exteriorSpawn: Transform;
  exitDoorPos: Transform;
  colliders: WorldCollider[];
  mainLight: THREE.PointLight;
  fireplaceLight?: THREE.PointLight;
  ambientLight: THREE.HemisphereLight;
  doorMarkerMesh: THREE.Group;
  exitMarkerMesh: THREE.Group;
  chestObj?: {
    id: string;
    group: THREE.Group;
    lid: THREE.Group;
    opened: boolean;
    position: [number, number, number];
  };
  bedRestTrigger?: {
    x: number;
    y: number;
    z: number;
    radius: number;
  };
  npcs?: {
    id: string;
    name: string;
    nameId: string;
    role: string;
    group: THREE.Group;
    position: [number, number, number];
    dialogueId: string;
    icon?: string;
  }[];
  flameMesh?: THREE.Mesh;
}

export interface InteriorRoomConfig {
  id: string;
  name: string;
  exteriorName: string;
  origin: Transform;
  dimensions?: { width: number; depth: number; height: number };
  exteriorDoorPos: Transform;
  exteriorSpawn: Transform;
  roomType?: 'tavern' | 'cottage' | 'forge' | 'palace';
  floorMaterial?: 'wood' | 'stone' | 'marble';
  wallMaterial?: 'timber' | 'stone' | 'plaster';
}

// ==============================================================
// 1. GTA SAN ANDREAS STYLE DOOR MARKER (ICONIC YELLOW/GOLD BEACON)
// ==============================================================

/**
 * Door Marker - Invisible group (visual markers removed as requested, interaction is purely proximity-based)
 */
export function createDoorMarkerMesh(label: string, isExit: boolean = false): THREE.Group {
  const marker = new THREE.Group();
  marker.name = isExit ? 'interior_exit_marker' : 'exterior_door_marker';
  marker.visible = false;
  return marker;
}

// ==============================================================
// 2. INTERIOR FURNITURE & PROPS GENERATION (OPTIMIZED SHADOWS)
// ==============================================================

/**
 * 2.1 Center Carpet / Rug
 */
function createCarpetMesh(width = 4.8, depth = 3.6, type: 'tavern' | 'cottage' | 'palace' = 'tavern'): THREE.Group {
  const carpet = new THREE.Group();

  let mainColor = 0x8b1e1e; // Crimson red
  let goldColor = 0xd4af37; // Gold trim
  if (type === 'cottage') {
    mainColor = 0x2e5a44; // Forest emerald green
    goldColor = 0xc2a649;
  } else if (type === 'palace') {
    mainColor = 0x581845; // Royal imperial purple
    goldColor = 0xffd700;
  }

  // Base rug body
  const bodyGeo = new THREE.BoxGeometry(width, 0.03, depth);
  const bodyMat = new THREE.MeshLambertMaterial({ color: mainColor, flatShading: true });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.015;
  body.receiveShadow = true;
  carpet.add(body);

  // Decorative border band
  const borderGeo = new THREE.BoxGeometry(width + 0.12, 0.025, depth + 0.12);
  const borderMat = new THREE.MeshLambertMaterial({ color: goldColor, flatShading: true });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.position.y = 0.012;
  border.receiveShadow = true;
  carpet.add(border);

  // Inner medallion pattern
  const medGeo = new THREE.BoxGeometry(width * 0.45, 0.035, depth * 0.45);
  const medMat = new THREE.MeshLambertMaterial({ color: goldColor, flatShading: true });
  const med = new THREE.Mesh(medGeo, medMat);
  med.position.y = 0.02;
  med.rotation.y = Math.PI / 4;
  med.receiveShadow = true;
  carpet.add(med);

  // Fringes on ends
  const fringeGeo = new THREE.BoxGeometry(0.12, 0.015, depth + 0.1);
  const fringeMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
  for (const side of [-1, 1]) {
    const fringe = new THREE.Mesh(fringeGeo, fringeMat);
    fringe.position.set(side * (width / 2 + 0.05), 0.008, 0);
    carpet.add(fringe);
  }

  return carpet;
}

/**
 * 2.2 Table & Chairs (with tabletop tankards, food, candelabra)
 */
function createTableAndChairsMesh(woodMat: THREE.Material): { group: THREE.Group; colliders: WorldCollider[] } {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];

  const tableTopMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const chairMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x37474f, flatShading: true });

  // Table top (2.8 x 0.14 x 1.5)
  const topGeo = new THREE.BoxGeometry(2.8, 0.14, 1.5);
  const top = new THREE.Mesh(topGeo, tableTopMat);
  top.position.y = 1.05;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 4 Table legs
  const legGeo = new THREE.BoxGeometry(0.14, 1.0, 0.14);
  const legCoords = [
    [-1.25, 0.5, -0.6],
    [1.25, 0.5, -0.6],
    [-1.25, 0.5, 0.6],
    [1.25, 0.5, 0.6],
  ];
  legCoords.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, tableTopMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    group.add(leg);
  });

  // Table stretcher bar
  const stretcher = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), tableTopMat);
  stretcher.position.set(0, 0.35, 0);
  group.add(stretcher);

  // Table collider
  colliders.push({
    type: 'box',
    minX: -1.5,
    maxX: 1.5,
    minZ: -0.85,
    maxZ: 0.85,
    label: 'Meja Makan',
  });

  // 4 Chairs around table
  const chairPositions: { x: number; z: number; rotY: number }[] = [
    { x: -0.7, z: -1.05, rotY: 0 },
    { x: 0.7, z: -1.05, rotY: 0 },
    { x: -0.7, z: 1.05, rotY: Math.PI },
    { x: 0.7, z: 1.05, rotY: Math.PI },
  ];

  chairPositions.forEach(({ x, z, rotY }) => {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = rotY;

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
    seat.position.y = 0.55;
    seat.castShadow = true;
    chair.add(seat);

    // 4 legs
    const cLegGeo = new THREE.BoxGeometry(0.08, 0.55, 0.08);
    for (const [lx, lz] of [
      [-0.22, -0.22],
      [0.22, -0.22],
      [-0.22, 0.22],
      [0.22, 0.22],
    ]) {
      const cLeg = new THREE.Mesh(cLegGeo, chairMat);
      cLeg.position.set(lx, 0.275, lz);
      chair.add(cLeg);
    }

    // Backrest posts & slat
    const backPostGeo = new THREE.BoxGeometry(0.08, 0.65, 0.08);
    for (const bx of [-0.22, 0.22]) {
      const bPost = new THREE.Mesh(backPostGeo, chairMat);
      bPost.position.set(bx, 0.9, -0.22);
      chair.add(bPost);
    }
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.06), chairMat);
    slat.position.set(0, 1.05, -0.22);
    chair.add(slat);

    group.add(chair);
  });

  // Tabletop Props: Tankard, Bread cutting board, Bowl, Candelabra
  // 1. Pewter Tankards
  for (const [tx, tz] of [
    [-0.8, -0.25],
    [0.7, 0.2],
  ]) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 10), metalMat);
    mug.position.set(tx, 1.23, tz);
    group.add(mug);
  }

  // 2. Cutting board & fresh bread
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x8d6e63 })
  );
  board.position.set(0.1, 1.14, -0.15);
  group.add(board);

  const bread = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.12, 0.18),
    new THREE.MeshLambertMaterial({ color: 0xd7a15c, flatShading: true })
  );
  bread.position.set(0.1, 1.22, -0.15);
  group.add(bread);

  // 3. Brass Candelabra with 3 lit candles in center
  const candelabra = new THREE.Group();
  candelabra.position.set(-0.25, 1.12, 0.1);
  const brassMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
  const candleWaxMat = new THREE.MeshLambertMaterial({ color: 0xfffde7 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });

  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.06, 12), brassMat);
  cBase.position.y = 0.03;
  candelabra.add(cBase);

  const cStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.28, 8), brassMat);
  cStem.position.y = 0.18;
  candelabra.add(cStem);

  for (const cx of [-0.12, 0, 0.12]) {
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), candleWaxMat);
    wax.position.set(cx, 0.32, 0);
    candelabra.add(wax);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 6), flameMat);
    flame.position.set(cx, 0.43, 0);
    candelabra.add(flame);
  }
  group.add(candelabra);

  return { group, colliders };
}

/**
 * 2.3 Comfortable Bed & Rest Quarters
 */
function createBedMesh(): { group: THREE.Group; colliders: WorldCollider[] } {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];

  const frameMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
  const sheetMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const blanketMat = new THREE.MeshLambertMaterial({ color: 0xb71c1c, flatShading: true }); // Crimson velvet quilt
  const goldTrimMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });

  // Bed Dimensions: 2.2 wide (X) x 2.6 long (Z)
  // Wooden frame
  const frameGeo = new THREE.BoxGeometry(2.2, 0.45, 2.6);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = 0.225;
  frame.castShadow = true;
  group.add(frame);

  // 4 Corner Bed Posts
  const postGeo = new THREE.BoxGeometry(0.16, 1.5, 0.16);
  const postCoords = [
    [-1.02, 0.75, -1.22],
    [1.02, 0.75, -1.22],
    [-1.02, 0.75, 1.22],
    [1.02, 0.75, 1.22],
  ];
  postCoords.forEach(([px, py, pz]) => {
    const post = new THREE.Mesh(postGeo, frameMat);
    post.position.set(px, py, pz);
    post.castShadow = true;
    group.add(post);
  });

  // Tall ornate Headboard (Back Z = -1.22)
  const headboardGeo = new THREE.BoxGeometry(2.0, 1.2, 0.12);
  const headboard = new THREE.Mesh(headboardGeo, frameMat);
  headboard.position.set(0, 0.95, -1.22);
  headboard.castShadow = true;
  group.add(headboard);

  // Soft Mattress
  const matGeo = new THREE.BoxGeometry(1.95, 0.35, 2.35);
  const mattress = new THREE.Mesh(matGeo, sheetMat);
  mattress.position.set(0, 0.55, 0);
  mattress.receiveShadow = true;
  group.add(mattress);

  // Warm Quilt / Blanket covering lower 2/3
  const quiltGeo = new THREE.BoxGeometry(1.98, 0.38, 1.65);
  const quilt = new THREE.Mesh(quiltGeo, blanketMat);
  quilt.position.set(0, 0.58, 0.38);
  quilt.castShadow = true;
  group.add(quilt);

  // Quilt fold rim
  const quiltFold = new THREE.Mesh(new THREE.BoxGeometry(1.99, 0.08, 0.22), goldTrimMat);
  quiltFold.position.set(0, 0.78, -0.42);
  group.add(quiltFold);

  // 2 Fluffy Pillows at head
  const pillowGeo = new THREE.BoxGeometry(0.72, 0.16, 0.45);
  const pillowMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5, flatShading: true });
  for (const px of [-0.5, 0.5]) {
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(px, 0.8, -0.85);
    pillow.rotation.x = -0.15;
    group.add(pillow);
  }

  // Beside Nightstand Table
  const nightstand = new THREE.Group();
  nightstand.position.set(1.4, 0, -0.8);
  const nTable = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.7), frameMat);
  nTable.position.y = 0.375;
  nTable.castShadow = true;
  nightstand.add(nTable);

  // Nightstand brass handle
  const nHandle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), goldTrimMat);
  nHandle.position.set(0, 0.45, 0.36);
  nightstand.add(nHandle);

  // Small brass oil lamp on nightstand
  const oilLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.22, 10), goldTrimMat);
  oilLamp.position.set(0, 0.86, 0);
  nightstand.add(oilLamp);

  const lampFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.08, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd54f })
  );
  lampFlame.position.set(0, 1.0, 0);
  nightstand.add(lampFlame);

  group.add(nightstand);

  // Colliders for bed and nightstand
  colliders.push({
    type: 'box',
    minX: -1.2,
    maxX: 1.85,
    minZ: -1.4,
    maxZ: 1.4,
    label: 'Tempat Tidur',
  });

  return { group, colliders };
}

/**
 * 2.4 Stone Fireplace & Chimney Hearth with Crackling Fire
 */
function createFireplaceMesh(): {
  group: THREE.Group;
  colliders: WorldCollider[];
  fireplaceLight: THREE.PointLight;
  flameMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x424242, flatShading: true });
  const darkHearthMat = new THREE.MeshLambertMaterial({ color: 0x212121, flatShading: true });
  const mantelWoodMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
  const grateMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a, flatShading: true });
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });

  // Main Stone Chimney Breast (width: 2.6, height: 4.6, depth: 1.2)
  const breastGeo = new THREE.BoxGeometry(2.6, 4.6, 1.1);
  const breast = new THREE.Mesh(breastGeo, stoneMat);
  breast.position.set(0, 2.3, 0);
  breast.castShadow = true;
  group.add(breast);

  // Carved Firebox Hearth Cutout Frame
  // Left stone jamb
  const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 0.4), stoneMat);
  jambL.position.set(-0.9, 1.0, 0.45);
  jambL.castShadow = true;
  group.add(jambL);

  // Right stone jamb
  const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 0.4), stoneMat);
  jambR.position.set(0.9, 1.0, 0.45);
  jambR.castShadow = true;
  group.add(jambR);

  // Stone lintel arch above firebox
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.45), stoneMat);
  lintel.position.set(0, 2.1, 0.45);
  lintel.castShadow = true;
  group.add(lintel);

  // Firebox Backing
  const fireboxBack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 0.2), darkHearthMat);
  fireboxBack.position.set(0, 0.95, 0.1);
  group.add(fireboxBack);

  // Wooden Mantelpiece Shelf
  const mantelGeo = new THREE.BoxGeometry(2.9, 0.16, 0.7);
  const mantel = new THREE.Mesh(mantelGeo, mantelWoodMat);
  mantel.position.set(0, 2.4, 0.45);
  mantel.castShadow = true;
  group.add(mantel);

  // Antler or Brass Clock on mantel
  const clock = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.4, 0.18),
    new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true })
  );
  clock.position.set(0, 2.68, 0.4);
  group.add(clock);

  // Fire Grate
  const grate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.45), grateMat);
  grate.position.set(0, 0.12, 0.4);
  group.add(grate);

  // Hardwood Burning Logs
  for (const [lx, lz, rotY, rotZ] of [
    [-0.2, 0.38, 0.2, 0.1],
    [0.2, 0.38, -0.25, -0.1],
    [0.0, 0.42, 0.05, 0.0],
  ]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 8), logMat);
    log.position.set(lx, 0.24, lz);
    log.rotation.z = Math.PI / 2 + rotZ;
    log.rotation.y = rotY;
    group.add(log);
  }

  // Glowing Coal Bed & Crackling Fire Embers
  const coalBed = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.1, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff3d00 })
  );
  coalBed.position.set(0, 0.12, 0.38);
  group.add(coalBed);

  // Animated Core Fire Flame
  const flameGeo = new THREE.ConeGeometry(0.35, 0.75, 7);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7043 });
  const flameMesh = new THREE.Mesh(flameGeo, flameMat);
  flameMesh.position.set(0, 0.55, 0.38);
  flameMesh.name = 'fireplace_flame';
  group.add(flameMesh);

  // Inner Yellow Hot Core
  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.5, 6),
    new THREE.MeshBasicMaterial({ color: 0xffea00 })
  );
  innerFlame.position.set(0, 0.48, 0.38);
  group.add(innerFlame);

  // Fireplace Warm Flickering Light (NO SHADOW to ensure maximum performance!)
  const fireplaceLight = new THREE.PointLight(0xff6e40, 1.45, 14, 1.5);
  fireplaceLight.position.set(0, 0.75, 0.7);
  fireplaceLight.castShadow = false;
  group.add(fireplaceLight);

  // Collider
  colliders.push({
    type: 'box',
    minX: -1.45,
    maxX: 1.45,
    minZ: -0.7,
    maxZ: 0.85,
    label: 'Perapian Batu',
  });

  return { group, colliders, fireplaceLight, flameMesh };
}

/**
 * 2.5 Tall Wardrobe / Armoire Cabinet & Bookshelf
 */
function createWardrobeMesh(): { group: THREE.Group; colliders: WorldCollider[] } {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const panelMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
  const brassMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });

  // Main body: 1.8 wide, 2.6 high, 0.9 deep
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.9), woodMat);
  body.position.y = 1.3;
  body.castShadow = true;
  group.add(body);

  // Cornice Molding on top
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.16, 1.05), woodMat);
  cornice.position.y = 2.68;
  cornice.castShadow = true;
  group.add(cornice);

  // Door Panels
  for (const px of [-0.42, 0.42]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.2, 0.05), panelMat);
    door.position.set(px, 1.3, 0.46);
    group.add(door);

    // Brass Handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), brassMat);
    handle.position.set(px + (px < 0 ? 0.24 : -0.24), 1.3, 0.5);
    group.add(handle);
  }

  colliders.push({
    type: 'box',
    minX: -1.0,
    maxX: 1.0,
    minZ: -0.55,
    maxZ: 0.55,
    label: 'Lemari Kayu',
  });

  return { group, colliders };
}

/**
 * 2.6 Ancient Bookshelf with Colorful Grimoires & Potion Jars
 */
function createBookshelfMesh(): { group: THREE.Group; colliders: WorldCollider[] } {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];

  const shelfMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const colors = [0xb71c1c, 0x1565c0, 0x2e7d32, 0x6a1b9a, 0xd4af37];

  // Frame: 1.6 wide x 2.4 high x 0.5 deep
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.5), shelfMat);
  frame.position.y = 1.2;
  frame.castShadow = true;
  group.add(frame);

  // Books on 3 shelves
  for (let shelfIdx = 0; shelfIdx < 3; shelfIdx++) {
    const shelfY = 0.6 + shelfIdx * 0.65;
    for (let b = -0.55; b <= 0.55; b += 0.14) {
      const bColor = colors[Math.floor(Math.random() * colors.length)];
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.35 + Math.random() * 0.1, 0.32),
        new THREE.MeshLambertMaterial({ color: bColor })
      );
      book.position.set(b, shelfY, 0.12);
      group.add(book);
    }
  }

  colliders.push({
    type: 'box',
    minX: -0.9,
    maxX: 0.9,
    minZ: -0.35,
    maxZ: 0.35,
    label: 'Rak Buku',
  });

  return { group, colliders };
}

/**
 * 2.7 Interactive Treasure Chest (Standard & Lootable)
 */
function createInteriorChestMesh(id: string): {
  group: THREE.Group;
  lid: THREE.Group;
  opened: boolean;
  colliders: WorldCollider[];
} {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x37474f, flatShading: true });
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd54f, flatShading: true });

  // Chest Base Box (1.1 x 0.55 x 0.75)
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.75), woodMat);
  base.position.y = 0.275;
  base.castShadow = true;
  group.add(base);

  // Iron corner brackets & trim
  const bandGeo = new THREE.BoxGeometry(1.14, 0.57, 0.1);
  for (const bz of [-0.25, 0.25]) {
    const band = new THREE.Mesh(bandGeo, ironMat);
    band.position.set(0, 0.275, bz);
    group.add(band);
  }

  // Chest Keyhole / Lock
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.08), goldMat);
  lock.position.set(0, 0.35, 0.4);
  group.add(lock);

  // Chest Lid Pivot Group
  const lid = new THREE.Group();
  lid.position.set(0, 0.55, -0.375); // Pivot at back edge

  const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.1, 12, 1, false, 0, Math.PI), woodMat);
  lidMesh.rotation.z = Math.PI / 2;
  lidMesh.position.set(0, 0, 0.375);
  lidMesh.castShadow = true;
  lid.add(lidMesh);

  group.add(lid);

  colliders.push({
    type: 'box',
    minX: -0.65,
    maxX: 0.65,
    minZ: -0.45,
    maxZ: 0.45,
    label: 'Peti Harta Interior',
  });

  return { group, lid, opened: false, colliders };
}

/**
 * 2.8 Oak Wine & Ale Barrels (Stacked in corner)
 */
function createBarrelsStackMesh(): { group: THREE.Group; colliders: WorldCollider[] } {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x263238, flatShading: true });

  const createSingleBarrel = (x: number, y: number, z: number) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, y, z);

    const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.95, 12), woodMat);
    bMesh.castShadow = true;
    bGroup.add(bMesh);

    // Iron bands
    for (const by of [-0.3, 0, 0.3]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.06, 12), ironMat);
      band.position.y = by;
      bGroup.add(band);
    }
    return bGroup;
  };

  group.add(createSingleBarrel(-0.45, 0.48, 0));
  group.add(createSingleBarrel(0.45, 0.48, 0));
  group.add(createSingleBarrel(0, 1.35, 0)); // Top stacked barrel

  colliders.push({
    type: 'box',
    minX: -0.9,
    maxX: 0.9,
    minZ: -0.5,
    maxZ: 0.5,
    label: 'Tumpukan Tong Kayu',
  });

  return { group, colliders };
}

// ==============================================================
// 3. GRAND IMPERIAL PALACE INTERIOR BUILDER (LUXURIOUS & SPACIOUS)
// ==============================================================

/**
 * Creates the majestic Grand Throne Hall of Astraea ("Aula Agung Istana Astraea")
 * - Vast, expansive dimensions (34m width x 42m depth x 9.6m height)
 * - Polished Carrara white marble floor with gold trim & checkered dark marble inlays
 * - High vaulted ceiling with golden coffer beams
 * - Multi-tiered Raised Throne Dais with the Golden Throne of Aurelius
 * - Emperor Aurelius NPC sitting on the Throne Dais with royal audience dialogue
 * - Radiant Golden Sun Stained-Glass Rose Window with divine volumetric sunbeams
 * - Twin Golden Knight Guardian Statues flanking the throne
 * - Grand crimson-and-gold velvet runner carpet along the central aisle
 * - Colonnade of Corinthian marble pillars with golden capitals & celestial braziers
 * - East Wing: Imperial State Banquet Hall with roasted feast platters, candelabras, velvet chairs
 * - West Wing: Imperial War Strategy & Council Gallery with continent tactical map & bookshelves
 * - North-West Alcove: Four-poster Royal Canopied Bed (Bed rest trigger: HP/MP restore)
 * - North-East Alcove: Imperial Treasury Vault with gold coin heaps and interactive Palace Chest
 * - Three magnificent suspended golden chandeliers with warm ambient lighting
 */
export function createImperialPalaceInteriorRoom(config: InteriorRoomConfig): InteriorRoom {
  const {
    id,
    name,
    exteriorName,
    origin,
    exteriorDoorPos,
    exteriorSpawn,
  } = config;

  const width = config.dimensions?.width ?? 34.0;
  const depth = config.dimensions?.depth ?? 42.0;
  const height = config.dimensions?.height ?? 9.6;

  const halfW = width / 2;
  const halfD = depth / 2;

  const rootGroup = new THREE.Group();
  rootGroup.name = `interior_palace_${id}`;
  rootGroup.position.set(origin.x, origin.y, origin.z);

  const colliders: WorldCollider[] = [];

  // Imperial Luxury Materials
  const whiteMarbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.16, metalness: 0.08 });
  const darkMarbleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.22, metalness: 0.1 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.18 });
  const imperialWallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
  const royalBlueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35 });
  const velvetCrimsonMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });
  const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
  const celestialCyanGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  // 1. High-Gloss White Marble Floor with Checkered Pattern & Golden Border
  const floorBase = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, depth), whiteMarbleMat);
  floorBase.position.y = -0.2;
  floorBase.receiveShadow = true;
  rootGroup.add(floorBase);

  // Outer Gold Border on floor
  const floorBorder = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.04, depth + 0.3), goldTrimMat);
  floorBorder.position.y = 0.02;
  rootGroup.add(floorBorder);

  // Central Checkered Black Marble Inlays along the nave
  for (let ix = -4; ix <= 4; ix += 2) {
    for (let iz = -12; iz <= 14; iz += 2) {
      if ((Math.abs(ix / 2) + Math.abs(iz / 2)) % 2 === 1) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 1.9), darkMarbleMat);
        tile.position.set(ix, 0.015, iz);
        rootGroup.add(tile);
      }
    }
  }

  // 2. High Vaulted Palace Ceiling with Golden Coffers
  const ceilingBase = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, depth), imperialWallMat);
  ceilingBase.position.y = height + 0.15;
  rootGroup.add(ceilingBase);

  // Gilded longitudinal and transverse ceiling beams
  for (let x = -halfW + 4; x <= halfW - 4; x += 5.5) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, depth), goldTrimMat);
    beam.position.set(x, height - 0.25, 0);
    rootGroup.add(beam);
  }
  for (let z = -halfD + 4; z <= halfD - 4; z += 6.5) {
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.45, 0.4), goldTrimMat);
    crossBeam.position.set(0, height - 0.22, z);
    rootGroup.add(crossBeam);
  }

  // 3. Palace Walls (Carrara Marble with Golden Cornices)
  const wallThick = 0.6;

  // North Wall (Behind Throne)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), imperialWallMat);
  northWall.position.set(0, height / 2, -halfD);
  northWall.receiveShadow = true;
  rootGroup.add(northWall);
  colliders.push({
    type: 'box',
    minX: origin.x - halfW,
    maxX: origin.x + halfW,
    minZ: origin.z - halfD - 0.5,
    maxZ: origin.z - halfD + wallThick,
    label: 'Dinding Utara Istana',
  });

  // Massive Golden Sun Rose Window above throne on North Wall
  const roseWinFrame = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.3, 24), goldTrimMat);
  roseWinFrame.rotation.x = Math.PI / 2;
  roseWinFrame.position.set(0, 6.2, -halfD + 0.2);
  const roseWinGlass = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.32, 24), windowGlowMat);
  roseWinGlass.rotation.x = Math.PI / 2;
  roseWinGlass.position.set(0, 6.2, -halfD + 0.22);
  const roseWinInner = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.35, 16), celestialCyanGlow);
  roseWinInner.rotation.x = Math.PI / 2;
  roseWinInner.position.set(0, 6.2, -halfD + 0.24);
  rootGroup.add(roseWinFrame, roseWinGlass, roseWinInner);

  // Volumetric divine sunbeams pouring over throne
  const sunbeamPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(7.0, 14.0),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunbeamPlane.rotation.x = Math.PI / 3;
  sunbeamPlane.position.set(0, 4.5, -halfD + 6.0);
  rootGroup.add(sunbeamPlane);

  // West Wall
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), imperialWallMat);
  westWall.position.set(-halfW, height / 2, 0);
  westWall.receiveShadow = true;
  rootGroup.add(westWall);
  colliders.push({
    type: 'box',
    minX: origin.x - halfW - 0.5,
    maxX: origin.x - halfW + wallThick,
    minZ: origin.z - halfD,
    maxZ: origin.z + halfD,
    label: 'Dinding Barat Istana',
  });

  // East Wall
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), imperialWallMat);
  eastWall.position.set(halfW, height / 2, 0);
  eastWall.receiveShadow = true;
  rootGroup.add(eastWall);
  colliders.push({
    type: 'box',
    minX: origin.x + halfW - wallThick,
    maxX: origin.x + halfW + 0.5,
    minZ: origin.z - halfD,
    maxZ: origin.z + halfD,
    label: 'Dinding Timur Istana',
  });

  // Arched stained glass windows on East and West walls
  for (const wz of [-12, -4, 4, 12]) {
    // West window
    const wWin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 1.8), windowGlowMat);
    wWin.position.set(-halfW + 0.25, 4.8, wz);
    const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.0, 2.0), goldTrimMat);
    wFrame.position.set(-halfW + 0.22, 4.8, wz);
    rootGroup.add(wWin, wFrame);

    // East window
    const eWin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 1.8), windowGlowMat);
    eWin.position.set(halfW - 0.25, 4.8, wz);
    const eFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.0, 2.0), goldTrimMat);
    eFrame.position.set(halfW - 0.22, 4.8, wz);
    rootGroup.add(eWin, eFrame);
  }

  // South Wall with Grand Portal Archway Entrance
  const doorWidth = 4.2;
  const doorHeight = 5.5;
  const southSideWidth = (width - doorWidth) / 2;

  const southWallL = new THREE.Mesh(new THREE.BoxGeometry(southSideWidth, height, wallThick), imperialWallMat);
  southWallL.position.set(-halfW + southSideWidth / 2, height / 2, halfD);
  southWallL.receiveShadow = true;
  rootGroup.add(southWallL);

  const southWallR = new THREE.Mesh(new THREE.BoxGeometry(southSideWidth, height, wallThick), imperialWallMat);
  southWallR.position.set(halfW - southSideWidth / 2, height / 2, halfD);
  southWallR.receiveShadow = true;
  rootGroup.add(southWallR);

  const lintelH = height - doorHeight;
  const southLintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, wallThick), imperialWallMat);
  southLintel.position.set(0, doorHeight + lintelH / 2, halfD);
  rootGroup.add(southLintel);

  // Gilded Portal Frame & Arch Pediment
  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.6, doorHeight + 0.3, wallThick + 0.2), goldTrimMat);
  portalArch.position.set(0, doorHeight / 2, halfD);
  rootGroup.add(portalArch);

  // Grand Imperial Double Doors (Royal Blue lacquer with gold crest)
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.95, doorHeight * 0.95, 0.15), royalBlueMat);
  leftDoor.position.set(-1.05, doorHeight / 2, halfD - 0.2);
  leftDoor.rotation.y = 0.35;
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.95, doorHeight * 0.95, 0.15), royalBlueMat);
  rightDoor.position.set(1.05, doorHeight / 2, halfD - 0.2);
  rightDoor.rotation.y = -0.35;
  rootGroup.add(leftDoor, rightDoor);

  colliders.push(
    {
      type: 'box',
      minX: origin.x - halfW,
      maxX: origin.x - doorWidth / 2,
      minZ: origin.z + halfD - wallThick,
      maxZ: origin.z + halfD + 0.5,
      label: 'Dinding Selatan Kiri Istana',
    },
    {
      type: 'box',
      minX: origin.x + doorWidth / 2,
      maxX: origin.x + halfW,
      minZ: origin.z + halfD - wallThick,
      maxZ: origin.z + halfD + 0.5,
      label: 'Dinding Selatan Kanan Istana',
    }
  );

  // 4. Grand Raised Throne Dais (North End) - Fully walkable, no invisible wall!
  const daisW = 16.0;
  const daisD = 9.0;
  const daisH = 0.35; // Majestic elevation with gentle steps
  const daisZ = -halfD + daisD / 2 + 1.2; // approx -15.3

  const daisMesh = new THREE.Mesh(new THREE.BoxGeometry(daisW, daisH, daisD), whiteMarbleMat);
  daisMesh.position.set(0, daisH / 2, daisZ);
  daisMesh.receiveShadow = true;
  rootGroup.add(daisMesh);

  const daisTrim = new THREE.Mesh(new THREE.BoxGeometry(daisW + 0.2, 0.08, daisD + 0.2), goldTrimMat);
  daisTrim.position.set(0, daisH + 0.04, daisZ);
  rootGroup.add(daisTrim);

  // Front Marble Steps leading up to dais (smooth walk-up)
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(daisW - 1.5, 0.18, 0.6), whiteMarbleMat);
  step1.position.set(0, 0.09, daisZ + daisD / 2 + 0.6);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(daisW - 0.8, 0.27, 0.6), whiteMarbleMat);
  step2.position.set(0, 0.135, daisZ + daisD / 2 + 0.2);
  rootGroup.add(step1, step2);

  // Only protect the golden throne chair itself (NO invisible wall blocking the dais or steps!)
  colliders.push({
    type: 'box',
    minX: origin.x - 1.5,
    maxX: origin.x + 1.5,
    minZ: origin.z + daisZ - 2.2,
    maxZ: origin.z + daisZ - 0.5,
    label: 'Takhta Emas Kaisar Aurelius',
  });

  // The Grand Golden Throne of Aurelius
  const throneMesh = createImperialThroneMesh();
  throneMesh.position.set(0, daisH, daisZ - 1.2);
  rootGroup.add(throneMesh);

  // 5. Imperial Red-and-Gold Velvet Runner Carpet
  const runnerWidth = 4.8;
  const runnerLength = 31.0;
  const carpetRunner = new THREE.Mesh(new THREE.BoxGeometry(runnerWidth, 0.03, runnerLength), velvetCrimsonMat);
  carpetRunner.position.set(0, 0.02, 3.5);
  carpetRunner.receiveShadow = true;
  rootGroup.add(carpetRunner);

  const carpetGoldL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, runnerLength), goldTrimMat);
  carpetGoldL.position.set(-runnerWidth / 2, 0.025, 3.5);
  const carpetGoldR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, runnerLength), goldTrimMat);
  carpetGoldR.position.set(runnerWidth / 2, 0.025, 3.5);
  rootGroup.add(carpetGoldL, carpetGoldR);

  // 6. Colonnade of Corinthian Marble Columns along the nave
  const colX = 7.6;
  const colZCoords = [-10, -5, 0, 5, 10];
  colZCoords.forEach((cz) => {
    [-colX, colX].forEach((cx) => {
      // Column Base
      const colBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), darkMarbleMat);
      colBase.position.set(cx, 0.25, cz);
      // Fluted Marble Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, height - 1.2, 16), whiteMarbleMat);
      shaft.position.set(cx, height / 2, cz);
      // Corinthian Gilded Capital
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 1.3), goldTrimMat);
      cap.position.set(cx, height - 0.4, cz);
      rootGroup.add(colBase, shaft, cap);

      // Collider for each column
      colliders.push({
        type: 'circle',
        x: origin.x + cx,
        z: origin.z + cz,
        radius: 0.75,
        label: 'Pilar Marmer Istana',
      });

      // Ceremonial Golden Brazier beside column
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.85, 8), goldTrimMat);
      brazier.position.set(cx + (cx > 0 ? -1.1 : 1.1), 0.42, cz);
      const brazierFlame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 6), new THREE.MeshBasicMaterial({ color: 0xffa000 }));
      brazierFlame.position.set(cx + (cx > 0 ? -1.1 : 1.1), 0.95, cz);
      rootGroup.add(brazier, brazierFlame);
    });
  });

  // 7. Imperial Knight Honor Guard Statues flanking the throne
  const knightL = createImperialKnightStatueMesh();
  knightL.position.set(-6.2, 0, daisZ + 2.5);
  knightL.rotation.y = Math.PI / 4;
  rootGroup.add(knightL);
  colliders.push({
    type: 'circle',
    x: origin.x - 6.2,
    z: origin.z + daisZ + 2.5,
    radius: 1.1,
    label: 'Patung Ksatria Pengawal Barat',
  });

  const knightR = createImperialKnightStatueMesh();
  knightR.position.set(6.2, 0, daisZ + 2.5);
  knightR.rotation.y = -Math.PI / 4;
  rootGroup.add(knightR);
  colliders.push({
    type: 'circle',
    x: origin.x + 6.2,
    z: origin.z + daisZ + 2.5,
    radius: 1.1,
    label: 'Patung Ksatria Pengawal Timur',
  });

  // 8. East Wing: Imperial State Banquet Hall
  const banquetX = 11.2;
  const banquetZ = 0;
  const banquetTable = createImperialBanquetTableMesh();
  banquetTable.position.set(banquetX, 0, banquetZ);
  banquetTable.rotation.y = Math.PI / 2;
  rootGroup.add(banquetTable);
  colliders.push({
    type: 'box',
    minX: origin.x + banquetX - 1.8,
    maxX: origin.x + banquetX + 1.8,
    minZ: origin.z + banquetZ - 4.2,
    maxZ: origin.z + banquetZ + 4.2,
    label: 'Meja Perjamuan Kerajaan',
  });

  // 9. West Wing: Imperial War Strategy & Council Gallery
  const warX = -11.2;
  const warZ = 0;
  const warTable = createImperialWarTableMesh();
  warTable.position.set(warX, 0, warZ);
  warTable.rotation.y = Math.PI / 2;
  rootGroup.add(warTable);
  colliders.push({
    type: 'box',
    minX: origin.x + warX - 2.2,
    maxX: origin.x + warX + 2.2,
    minZ: origin.z + warZ - 3.2,
    maxZ: origin.z + warZ + 3.2,
    label: 'Meja Rencana Perang Kekaisaran',
  });

  // Bookshelves in West Wing
  const { group: book1 } = createBookshelfMesh();
  book1.position.set(-halfW + 0.6, 0, 4.0);
  book1.rotation.y = Math.PI / 2;
  rootGroup.add(book1);
  const { group: book2 } = createBookshelfMesh();
  book2.position.set(-halfW + 0.6, 0, -4.0);
  book2.rotation.y = Math.PI / 2;
  rootGroup.add(book2);

  // 10. North-West Alcove: Emperor's Royal Quarters (Bed Rest)
  const bedX = -halfW + 3.2;
  const bedZ = -halfD + 4.5;
  const { group: bedGroup } = createBedMesh();
  bedGroup.position.set(bedX, 0, bedZ);
  rootGroup.add(bedGroup);
  colliders.push({
    type: 'box',
    minX: origin.x + bedX - 1.5,
    maxX: origin.x + bedX + 1.5,
    minZ: origin.z + bedZ - 1.5,
    maxZ: origin.z + bedZ + 1.5,
    label: 'Peraduan Megah Kaisar',
  });

  // 11. North-East Alcove: Imperial Treasury Vault (Chest & Gold)
  const chestX = halfW - 3.5;
  const chestZ = -halfD + 4.5;
  const {
    group: chestGroup,
    lid: chestLid,
    opened: chestOpened,
    colliders: chestColliders,
  } = createInteriorChestMesh(`${id}_chest`);
  chestGroup.position.set(chestX, 0, chestZ);
  rootGroup.add(chestGroup);
  chestColliders.forEach((col) => {
    colliders.push({
      ...col,
      minX: origin.x + (col.minX ?? 0) + chestX,
      maxX: origin.x + (col.maxX ?? 0) + chestX,
      minZ: origin.z + (col.minZ ?? 0) + chestZ,
      maxZ: origin.z + (col.maxZ ?? 0) + chestZ,
    });
  });

  // Gold Coin Heaps in Treasury
  for (let g = 0; g < 4; g++) {
    const heap = new THREE.Mesh(new THREE.ConeGeometry(0.6 + g * 0.2, 0.45, 8), goldTrimMat);
    heap.position.set(chestX + (g % 2 === 0 ? -1.2 : 1.2), 0.22, chestZ + (g < 2 ? -1.0 : 1.0));
    rootGroup.add(heap);
  }

  // 12. NPCs inside Palace: Emperor Aurelius sitting on the Throne Dais!
  const emperorGroup = createCustomNPCMesh('emperor');
  const emperorInternalPos: [number, number, number] = [origin.x, origin.y + daisH, origin.z + daisZ + 0.2];
  emperorGroup.position.set(0, daisH, daisZ + 0.2);
  emperorGroup.rotation.y = 0; // Facing south towards entrance
  rootGroup.add(emperorGroup);

  const npcs = [
    {
      id: 'emperor_aurelius',
      name: 'Emperor Aurelius',
      nameId: 'Paduka Kaisar Aurelius Astraea',
      role: 'Penguasa Tertinggi Ibukota Kekaisaran Emas',
      group: emperorGroup,
      position: emperorInternalPos,
      dialogueId: 'emperor_aurelius',
      icon: '👑',
    },
  ];

  // 13. Lighting: 3 Grand Imperial Chandeliers & Warm Ambiance
  const ambientLight = new THREE.HemisphereLight(0xfff8e7, 0x3e2723, 0.55);
  ambientLight.position.set(0, 14, 0);
  rootGroup.add(ambientLight);

  // Main Chandelier (Center)
  const mainLight = new THREE.PointLight(0xffedd5, 2.8, 38, 1.1);
  mainLight.position.set(0, height - 1.8, 0);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.bias = -0.002;
  rootGroup.add(mainLight);

  // Chandelier Models
  for (const cz of [-10, 0, 10]) {
    const chGroup = new THREE.Group();
    chGroup.position.set(0, height - 0.2, cz);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), goldTrimMat);
    chain.position.y = -0.9;
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 20), goldTrimMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -1.8;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 8, 16), goldTrimMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -2.2;
    chGroup.add(chain, ring1, ring2);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), windowGlowMat);
      fl.position.set(Math.cos(angle) * 1.5, -1.65, Math.sin(angle) * 1.5);
      chGroup.add(fl);
    }
    rootGroup.add(chGroup);
  }

  // Soft glow light over Throne Dais
  const throneLight = new THREE.PointLight(0xfef08a, 1.8, 18, 1.2);
  throneLight.position.set(0, 6.0, daisZ);
  rootGroup.add(throneLight);

  // 14. Door References (proximity interaction only)
  const doorMarkerMesh = createDoorMarkerMesh(name, false);
  doorMarkerMesh.position.set(exteriorDoorPos.x, exteriorDoorPos.y, exteriorDoorPos.z);
  doorMarkerMesh.visible = false;

  const exitDoorLocalZ = halfD - 1.2;
  const exitMarkerMesh = createDoorMarkerMesh(`Keluar ke ${exteriorName}`, true);
  exitMarkerMesh.position.set(0, 0, exitDoorLocalZ);
  exitMarkerMesh.visible = false;

  const exitDoorPos: Transform = {
    x: origin.x,
    y: origin.y,
    z: origin.z + exitDoorLocalZ,
  };

  const interiorSpawn: Transform = {
    x: origin.x,
    y: origin.y + 0.05,
    z: origin.z + exitDoorLocalZ - 2.2,
    rotationY: Math.PI, // Facing into the throne room
  };

  return {
    id,
    name,
    exteriorName,
    rootGroup,
    origin,
    dimensions: { width, depth, height },
    interiorSpawn,
    exteriorDoorPos,
    exteriorSpawn,
    exitDoorPos,
    colliders,
    mainLight,
    ambientLight,
    doorMarkerMesh,
    exitMarkerMesh,
    chestObj: {
      id: `${id}_chest`,
      group: chestGroup,
      lid: chestLid,
      opened: chestOpened,
      position: [origin.x + chestX, origin.y, origin.z + chestZ],
    },
    bedRestTrigger: {
      x: origin.x + bedX,
      y: origin.y,
      z: origin.z + bedZ,
      radius: 2.8,
    },
    npcs,
  };
}

// ==============================================================
// 4. MAIN INTERIOR ROOM BUILDER & PREFAB GENERATION
// ==============================================================

/**
 * Generates an isolated interior room with:
 * - Dinding, lantai, langit-langit berbalok, dan pintu keluar
 * - Pencahayaan khusus interior (Point Light hangat chandelier & perapian)
 * - Furnitur & Properti standar (Karpet, Meja & Kursi, Tempat Tidur, Lemari, Peti Harta, Perapian)
 * - Batasan Kamera & Tabrakan (Colliders lengkap dinding dan furnitur)
 * - Pembatasan shadow (hanya lampu utama yang menghasilkan bayangan)
 */
export function createInteriorRoom(config: InteriorRoomConfig): InteriorRoom {
  if (config.roomType === 'palace') {
    return createImperialPalaceInteriorRoom(config);
  }

  const {
    id,
    name,
    exteriorName,
    origin,
    exteriorDoorPos,
    exteriorSpawn,
    roomType = 'tavern',
    floorMaterial = 'wood',
    wallMaterial = 'timber',
  } = config;

  const width = config.dimensions?.width ?? 15.0; // X dimension
  const depth = config.dimensions?.depth ?? 13.0; // Z dimension
  const height = config.dimensions?.height ?? 4.8; // Y dimension

  const rootGroup = new THREE.Group();
  rootGroup.name = `interior_room_${id}`;
  rootGroup.position.set(origin.x, origin.y, origin.z);

  const colliders: WorldCollider[] = [];

  // ==============================================================
  // A. FLOOR & CEILING
  // ==============================================================
  let floorColor = 0x543d2b; // Warm polished oak timber
  if (floorMaterial === 'stone') floorColor = 0x546e7a;
  if (floorMaterial === 'marble') floorColor = 0xe0e0e0;

  const floorGeo = new THREE.BoxGeometry(width, 0.3, depth);
  const floorMat = new THREE.MeshLambertMaterial({
    color: floorColor,
    flatShading: true,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = -0.15;
  floorMesh.receiveShadow = true;
  rootGroup.add(floorMesh);

  // Ceiling
  const ceilingGeo = new THREE.BoxGeometry(width, 0.25, depth);
  const ceilingMat = new THREE.MeshLambertMaterial({
    color: 0x3e2723,
    flatShading: true,
  });
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.position.y = height + 0.12;
  rootGroup.add(ceilingMesh);

  // Heavy timber exposed ceiling crossbeams
  const beamGeo = new THREE.BoxGeometry(0.3, 0.38, depth);
  const beamMat = new THREE.MeshLambertMaterial({ color: 0x2e1c14, flatShading: true });
  for (let bx = -width / 2 + 2.5; bx <= width / 2 - 2.5; bx += 3.2) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(bx, height - 0.19, 0);
    rootGroup.add(beam);
  }

  // ==============================================================
  // B. WALLS & DOORWAY STRUCTURE
  // ==============================================================
  let wallColor = 0xd7ccc8; // Cream plaster
  if (wallMaterial === 'stone') wallColor = 0x78909c;
  if (wallMaterial === 'timber') wallColor = 0xbcaaa4;

  const wallMat = new THREE.MeshLambertMaterial({
    color: wallColor,
    flatShading: true,
  });
  const wainscotMat = new THREE.MeshLambertMaterial({
    color: 0x4e342e,
    flatShading: true,
  });

  const wallThick = 0.45;
  const halfW = width / 2;
  const halfD = depth / 2;

  // 1. North Wall (Back)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), wallMat);
  northWall.position.set(0, height / 2, -halfD);
  northWall.receiveShadow = true;
  rootGroup.add(northWall);

  // North wall wainscoting
  const northWain = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, 0.06), wainscotMat);
  northWain.position.set(0, 0.6, -halfD + wallThick / 2 + 0.03);
  rootGroup.add(northWain);

  // North wall collider
  colliders.push({
    type: 'box',
    minX: origin.x - halfW,
    maxX: origin.x + halfW,
    minZ: origin.z - halfD - 0.3,
    maxZ: origin.z - halfD + wallThick,
    label: 'Dinding Utara',
  });

  // 2. West Wall (Left)
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
  westWall.position.set(-halfW, height / 2, 0);
  westWall.receiveShadow = true;
  rootGroup.add(westWall);

  // West wall collider
  colliders.push({
    type: 'box',
    minX: origin.x - halfW - 0.3,
    maxX: origin.x - halfW + wallThick,
    minZ: origin.z - halfD,
    maxZ: origin.z + halfD,
    label: 'Dinding Barat',
  });

  // 3. East Wall (Right)
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
  eastWall.position.set(halfW, height / 2, 0);
  eastWall.receiveShadow = true;
  rootGroup.add(eastWall);

  // East wall collider
  colliders.push({
    type: 'box',
    minX: origin.x + halfW - wallThick,
    maxX: origin.x + halfW + 0.3,
    minZ: origin.z - halfD,
    maxZ: origin.z + halfD,
    label: 'Dinding Timur',
  });

  // 4. South Wall (Front with Doorway Opening in center)
  const doorWidth = 2.0;
  const doorHeight = 2.8;
  const leftWallWidth = (width - doorWidth) / 2;

  // South Wall Left Segment
  const southWallL = new THREE.Mesh(new THREE.BoxGeometry(leftWallWidth, height, wallThick), wallMat);
  southWallL.position.set(-halfW + leftWallWidth / 2, height / 2, halfD);
  southWallL.receiveShadow = true;
  rootGroup.add(southWallL);

  // South Wall Right Segment
  const southWallR = new THREE.Mesh(new THREE.BoxGeometry(leftWallWidth, height, wallThick), wallMat);
  southWallR.position.set(halfW - leftWallWidth / 2, height / 2, halfD);
  southWallR.receiveShadow = true;
  rootGroup.add(southWallR);

  // Header lintel above door
  const lintelH = height - doorHeight;
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, wallThick), wallMat);
  doorLintel.position.set(0, doorHeight + lintelH / 2, halfD);
  rootGroup.add(doorLintel);

  // Wooden Door Frame
  const doorFrameGeo = new THREE.BoxGeometry(doorWidth + 0.25, doorHeight + 0.15, wallThick + 0.15);
  const doorFrame = new THREE.Mesh(doorFrameGeo, wainscotMat);
  doorFrame.position.set(0, doorHeight / 2, halfD);
  rootGroup.add(doorFrame);

  // Door leaf (slightly ajar into room)
  const doorLeafGeo = new THREE.BoxGeometry(doorWidth * 0.95, doorHeight * 0.96, 0.12);
  const doorLeaf = new THREE.Mesh(doorLeafGeo, new THREE.MeshLambertMaterial({ color: 0x3e2723 }));
  doorLeaf.position.set(0.65, doorHeight / 2, halfD - 0.25);
  doorLeaf.rotation.y = 0.55;
  rootGroup.add(doorLeaf);

  // South wall colliders (blocking left and right of doorway)
  colliders.push({
    type: 'box',
    minX: origin.x - halfW,
    maxX: origin.x - doorWidth / 2,
    minZ: origin.z + halfD - wallThick,
    maxZ: origin.z + halfD + 0.3,
    label: 'Dinding Selatan Kiri',
  });
  colliders.push({
    type: 'box',
    minX: origin.x + doorWidth / 2,
    maxX: origin.x + halfW,
    minZ: origin.z + halfD - wallThick,
    maxZ: origin.z + halfD + 0.3,
    label: 'Dinding Selatan Kanan',
  });

  // Windows on East and West walls with soft glowing sunbeams
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffe082, side: THREE.DoubleSide });
  for (const wz of [-2.5, 2.5]) {
    // West window
    const winW = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.2), winMat);
    winW.position.set(-halfW + 0.18, 2.4, wz);
    rootGroup.add(winW);

    // Warm sunbeam quad
    const beamGeo = new THREE.PlaneGeometry(1.4, 3.2);
    beamGeo.rotateX(Math.PI / 4);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunbeam = new THREE.Mesh(beamGeo, beamMat);
    sunbeam.position.set(-halfW + 1.2, 1.5, wz);
    sunbeam.rotation.y = -Math.PI / 2;
    rootGroup.add(sunbeam);
  }

  // ==============================================================
  // C. LIGHTING (WARM COZY ATMOSPHERE - RESTRICTED SHADOWS)
  // ==============================================================
  // 1. Interior Ambient
  const ambientLight = new THREE.HemisphereLight(0x4a3728, 0x1f140e, 0.45);
  ambientLight.position.set(0, 10, 0);
  rootGroup.add(ambientLight);

  // 2. Hanging Chandelier (Central point light - ONLY ONE THAT CASTS SHADOW)
  const chandelierGroup = new THREE.Group();
  chandelierGroup.position.set(0, height - 0.2, 0);

  // Iron chain
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x263238 })
  );
  chain.position.y = -0.6;
  chandelierGroup.add(chain);

  // Iron chandelier ring
  const cRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.06, 8, 16),
    new THREE.MeshLambertMaterial({ color: 0x263238 })
  );
  cRing.rotation.x = Math.PI / 2;
  cRing.position.y = -1.2;
  chandelierGroup.add(cRing);

  // Candle lights around ring
  const candleWaxMat = new THREE.MeshLambertMaterial({ color: 0xfffde7 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const cx = Math.cos(angle) * 0.85;
    const cz = Math.sin(angle) * 0.85;

    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), candleWaxMat);
    candle.position.set(cx, -1.08, cz);
    chandelierGroup.add(candle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 6), flameMat);
    flame.position.set(cx, -0.93, cz);
    chandelierGroup.add(flame);
  }
  rootGroup.add(chandelierGroup);

  // MAIN LIGHT: Only this light casts shadow as requested
  const mainLight = new THREE.PointLight(0xffb74d, 2.2, 22, 1.2);
  mainLight.position.set(0, height - 1.4, 0);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.bias = -0.002;
  rootGroup.add(mainLight);

  // ==============================================================
  // D. FURNITURE & PROPS PLACEMENT
  // ==============================================================

  // 1. Center Carpet
  const carpet = createCarpetMesh(4.8, 3.6, roomType === 'cottage' ? 'cottage' : 'tavern');
  carpet.position.set(0, 0, 0);
  rootGroup.add(carpet);

  // 2. Dining Table & Chairs in Center (offset slightly forward)
  const { group: tableGroup, colliders: tableColliders } = createTableAndChairsMesh(wainscotMat);
  tableGroup.position.set(0, 0, 0.4);
  rootGroup.add(tableGroup);
  // Transform colliders to world space
  tableColliders.forEach((col) => {
    colliders.push({
      ...col,
      minX: origin.x + (col.minX ?? 0) + 0,
      maxX: origin.x + (col.maxX ?? 0) + 0,
      minZ: origin.z + (col.minZ ?? 0) + 0.4,
      maxZ: origin.z + (col.maxZ ?? 0) + 0.4,
    });
  });

  // 3. Resting Bed in North-East Alcove
  const bedX = halfW - 2.2;
  const bedZ = -halfD + 2.0;
  const { group: bedGroup, colliders: bedColliders } = createBedMesh();
  bedGroup.position.set(bedX, 0, bedZ);
  rootGroup.add(bedGroup);
  bedColliders.forEach((col) => {
    colliders.push({
      ...col,
      minX: origin.x + (col.minX ?? 0) + bedX,
      maxX: origin.x + (col.maxX ?? 0) + bedX,
      minZ: origin.z + (col.minZ ?? 0) + bedZ,
      maxZ: origin.z + (col.maxZ ?? 0) + bedZ,
    });
  });

  // 4. Stone Fireplace built into North Wall
  const fireX = -2.2;
  const fireZ = -halfD + 0.55;
  const {
    group: fireplaceGroup,
    colliders: fireColliders,
    fireplaceLight,
    flameMesh,
  } = createFireplaceMesh();
  fireplaceGroup.position.set(fireX, 0, fireZ);
  rootGroup.add(fireplaceGroup);
  fireColliders.forEach((col) => {
    colliders.push({
      ...col,
      minX: origin.x + (col.minX ?? 0) + fireX,
      maxX: origin.x + (col.maxX ?? 0) + fireX,
      minZ: origin.z + (col.minZ ?? 0) + fireZ,
      maxZ: origin.z + (col.maxZ ?? 0) + fireZ,
    });
  });

  // 5. Tall Storage Wardrobe on East Wall
  const wardX = halfW - 0.7;
  const wardZ = 2.4;
  const { group: wardGroup, colliders: wardColliders } = createWardrobeMesh();
  wardGroup.position.set(wardX, 0, wardZ);
  wardGroup.rotation.y = -Math.PI / 2; // Facing into room
  rootGroup.add(wardGroup);
  wardColliders.forEach((col) => {
    // Note rotated 90deg: X and Z flip dimensions
    colliders.push({
      type: 'box',
      minX: origin.x + wardX - 0.55,
      maxX: origin.x + wardX + 0.55,
      minZ: origin.z + wardZ - 1.0,
      maxZ: origin.z + wardZ + 1.0,
      label: col.label,
    });
  });

  // 6. Bookshelf on West Wall
  const bookX = -halfW + 0.5;
  const bookZ = -1.5;
  const { group: bookGroup, colliders: bookColliders } = createBookshelfMesh();
  bookGroup.position.set(bookX, 0, bookZ);
  bookGroup.rotation.y = Math.PI / 2; // Facing into room
  rootGroup.add(bookGroup);
  bookColliders.forEach((col) => {
    colliders.push({
      type: 'box',
      minX: origin.x + bookX - 0.35,
      maxX: origin.x + bookX + 0.35,
      minZ: origin.z + bookZ - 0.9,
      maxZ: origin.z + bookZ + 0.9,
      label: col.label,
    });
  });

  // 7. Interactive Loot Chest near bed
  const chestX = halfW - 4.5;
  const chestZ = -halfD + 1.4;
  const {
    group: chestGroup,
    lid: chestLid,
    opened: chestOpened,
    colliders: chestColliders,
  } = createInteriorChestMesh(`${id}_chest`);
  chestGroup.position.set(chestX, 0, chestZ);
  rootGroup.add(chestGroup);
  chestColliders.forEach((col) => {
    colliders.push({
      ...col,
      minX: origin.x + (col.minX ?? 0) + chestX,
      maxX: origin.x + (col.maxX ?? 0) + chestX,
      minZ: origin.z + (col.minZ ?? 0) + chestZ,
      maxZ: origin.z + (col.maxZ ?? 0) + chestZ,
    });
  });

  // 8. Stacked Ale & Wine Barrels in South-West corner
  const barrelX = -halfW + 1.4;
  const barrelZ = halfD - 1.4;
  const { group: bGroup, colliders: bColliders } = createBarrelsStackMesh();
  bGroup.position.set(barrelX, 0, barrelZ);
  rootGroup.add(bGroup);
  bColliders.forEach((col) => {
    colliders.push({
      ...col,
      minX: origin.x + (col.minX ?? 0) + barrelX,
      maxX: origin.x + (col.maxX ?? 0) + barrelX,
      minZ: origin.z + (col.minZ ?? 0) + barrelZ,
      maxZ: origin.z + (col.maxZ ?? 0) + barrelZ,
    });
  });

  // Wall heraldic shield decoration on North wall
  const shieldMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.0, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x1565c0, flatShading: true })
  );
  shieldMesh.position.set(2.0, 3.1, -halfD + 0.26);
  rootGroup.add(shieldMesh);

  // Door references (markers invisible, proximity interaction only)
  const doorMarkerMesh = createDoorMarkerMesh(name, false);
  doorMarkerMesh.position.set(exteriorDoorPos.x, exteriorDoorPos.y, exteriorDoorPos.z);
  doorMarkerMesh.visible = false;

  const exitDoorLocalZ = halfD - 1.2;
  const exitMarkerMesh = createDoorMarkerMesh(`Keluar ke ${exteriorName}`, true);
  exitMarkerMesh.position.set(0, 0, exitDoorLocalZ);
  exitMarkerMesh.visible = false;

  const exitDoorPos: Transform = {
    x: origin.x,
    y: origin.y,
    z: origin.z + exitDoorLocalZ,
  };

  const interiorSpawn: Transform = {
    x: origin.x,
    y: origin.y + 0.05,
    z: origin.z + exitDoorLocalZ - 1.6,
    rotationY: Math.PI, // Facing into the room away from door
  };

  return {
    id,
    name,
    exteriorName,
    rootGroup,
    origin,
    dimensions: { width, depth, height },
    interiorSpawn,
    exteriorDoorPos,
    exteriorSpawn,
    exitDoorPos,
    colliders,
    mainLight,
    fireplaceLight,
    ambientLight,
    doorMarkerMesh,
    exitMarkerMesh,
    chestObj: {
      id: `${id}_chest`,
      group: chestGroup,
      lid: chestLid,
      opened: chestOpened,
      position: [origin.x + chestX, origin.y, origin.z + chestZ],
    },
    bedRestTrigger: {
      x: origin.x + bedX,
      y: origin.y,
      z: origin.z + bedZ,
      radius: 2.2,
    },
    flameMesh,
  };
}

/**
 * Animate interior fireplace flickers
 */
export function updateInteriorRoomAnimations(
  room: InteriorRoom,
  time: number,
  delta: number,
  isInteriorActive: boolean
) {
  // Fireplace flame organic flicker (when inside)
  if (isInteriorActive) {
    if (room.fireplaceLight) {
      room.fireplaceLight.intensity = 1.35 + (Math.random() - 0.5) * 0.3;
    }
    if (room.flameMesh) {
      const fScale = 1.0 + Math.sin(time * 12) * 0.12;
      room.flameMesh.scale.set(fScale, 1.0 + Math.sin(time * 16) * 0.15, fScale);
    }
  }
}
