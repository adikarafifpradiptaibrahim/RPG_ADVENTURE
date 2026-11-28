import * as THREE from 'three';
import { WorldCollider } from './world';
import {
  createImperialThroneMesh,
  createImperialKnightStatueMesh,
  createImperialBanquetTableMesh,
  createImperialWarTableMesh,
  createCustomNPCMesh,
  createWeaponRackMesh,
  createGrandMageEldrinMesh,
  createSorceressMayaMesh,
  createArchmagePyroMesh,
} from './models';
const _interiorRaycaster = new THREE.Raycaster();
const _interiorRayOrigin = new THREE.Vector3();
const _interiorDownVec = new THREE.Vector3(0, -1, 0);

export interface Transform {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
}

export interface InteriorNPCData {
  id: string;
  name: string;
  nameId: string;
  role: string;
  group: THREE.Group;
  position: [number, number, number];
  dialogueId: string;
  icon?: string;
}

export interface InteriorChestData {
  id: string;
  group: THREE.Group;
  lid: THREE.Group;
  opened: boolean;
  position: [number, number, number];
}

export interface InteriorTrainingDummySpawn {
  id: string;
  name: string;
  nameId: string;
  x: number;
  y: number;
  z: number;
}

export interface InteriorPortalDef {
  id: string;
  roomId: string;
  kind: 'enter' | 'exit' | 'floor';
  label: string;
  promptText: string;
  toastText: string;
  targetRoomId: string | null; // null = return to exterior
  markerPos: Transform;
  spawnPos: Transform;
  triggerRadius: number;
  autoRadius: number;
  colorHex: number;
  markerMesh: THREE.Group;
  arrowGroup: THREE.Group;
  outerRing: THREE.Mesh;
  innerDisc: THREE.Mesh;
}

export interface InteriorRoomInfoPayload {
  id: string;
  roomName: string;
  floorLabel: string;
  localX: number;
  localZ: number;
  canExit: boolean;
}

export interface InteriorRoom {
  id: string;
  name: string;
  exteriorName: string;
  rootGroup: THREE.Group;
  origin: Transform;
  baseFloorY: number;
  minFloorY: number;
  maxCeilingY: number;
  dimensions: { width: number; depth: number; height: number; radius?: number };
  colliders: WorldCollider[];
  walkableMeshes: THREE.Mesh[];
  npcs: InteriorNPCData[];
  chests: InteriorChestData[];
  trainingDummySpawns?: InteriorTrainingDummySpawn[];
  ambientSkyHex: number;
  ambientGroundHex: number;
  ambientIntensity: number;
  hemiIntensity: number;
  dirIntensity: number;
  bgHex: number;
  fogHex: number;
  animatedParts: Array<{
    mesh: THREE.Object3D;
    mode: 'spinY' | 'bobY' | 'tiltSpin';
    speed: number;
    baseY: number;
    phase: number;
  }>;
  getFallbackFloorY: (worldX: number, worldY: number, worldZ: number) => number;
  getFloorHeight: (worldX: number, currentY: number, worldZ: number) => number;
  getFloorLabel: (worldY: number) => string;
  clampInsideWalls: (worldX: number, worldZ: number, playerRadius: number) => { x: number; z: number };
  clampCameraPosition: (camPos: THREE.Vector3, anchorY?: number) => void;
}

export interface EntrancePortalConfig {
  id: string;
  roomId: string;
  label: string;
  exteriorDoorPos: Transform;
  exteriorReturnSpawn: Transform;
  colorHex?: number;
}

export interface DoorMarkerParts {
  group: THREE.Group;
  arrowGroup: THREE.Group;
  outerRing: THREE.Mesh;
  innerDisc: THREE.Mesh;
}

// ============================================================================
// 1. ICONIC GTA SAN ANDREAS / GTA 3 TELEPORT MARKER BUILDER
// Glowing gold / cyan rotating floor ring + bobbing vertical arrow beacon
// ============================================================================

export function createDoorMarkerMesh(
  label: string,
  colorHex = 0xfbbf24
): DoorMarkerParts {
  const group = new THREE.Group();
  group.name = `gta_marker_${label}`;
  group.userData.nonWalkable = true;

  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const discMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const arrowMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.92,
  });

  // Ground Outer Glowing Ring
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.45, 28), ringMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.08;
  outerRing.userData.nonWalkable = true;
  group.add(outerRing);

  // Inner Pulsing Beacon Pad
  const innerDisc = new THREE.Mesh(new THREE.CircleGeometry(0.96, 24), discMat);
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.07;
  innerDisc.userData.nonWalkable = true;
  group.add(innerDisc);

  // Floating Inverted Arrow pointing down onto center of marker
  const arrowGroup = new THREE.Group();
  arrowGroup.position.y = 1.65;
  arrowGroup.userData.nonWalkable = true;

  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 6), arrowMat);
  cone.rotation.x = Math.PI;
  cone.position.y = -0.35;
  cone.userData.nonWalkable = true;

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 6), arrowMat);
  shaft.position.y = 0.3;
  shaft.userData.nonWalkable = true;

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 20), arrowMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.75;
  halo.userData.nonWalkable = true;

  arrowGroup.add(cone, shaft, halo);
  group.add(arrowGroup);

  return { group, arrowGroup, outerRing, innerDisc };
}

// ============================================================================
// 2. REUSABLE ARCHITECTURAL & FURNITURE HELPERS (LOW OVERHEAD, ZERO DYNAMIC POINTLIGHTS)
// ============================================================================

const sharedInvisibleRampMat = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false,
  side: THREE.DoubleSide,
});

function addBoxWall(
  parent: THREE.Group,
  colliders: WorldCollider[],
  origin: Transform,
  w: number,
  h: number,
  d: number,
  lx: number,
  ly: number,
  lz: number,
  mat: THREE.Material,
  label: string
): THREE.Mesh {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  wall.position.set(lx, ly, lz);
  wall.receiveShadow = true;
  wall.userData.nonWalkable = true;
  parent.add(wall);
  colliders.push({
    type: 'box',
    minX: origin.x + lx - w * 0.5,
    maxX: origin.x + lx + w * 0.5,
    minZ: origin.z + lz - d * 0.5,
    maxZ: origin.z + lz + d * 0.5,
    minY: origin.y + ly - h * 0.5,
    maxY: origin.y + ly + h * 0.5 + 0.35,
    label,
  });
  return wall;
}

function addWalkableSlab(
  parent: THREE.Group,
  w: number,
  h: number,
  d: number,
  lx: number,
  ly: number,
  lz: number,
  mat: THREE.Material,
  _label: string
): THREE.Mesh {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  slab.position.set(lx, ly, lz);
  slab.receiveShadow = true;
  slab.userData.walkableSurface = true;
  parent.add(slab);
  return slab;
}

function addStaircase(
  parent: THREE.Group,
  width: number,
  steps: number,
  startY: number,
  endY: number,
  startZ: number,
  endZ: number,
  centerX: number,
  stepMat: THREE.Material,
  trimMat: THREE.Material,
  railMat: THREE.Material
) {
  const totalRise = endY - startY;
  const totalRun = endZ - startZ;
  const stepRise = totalRise / steps;
  const stepRun = Math.abs(totalRun) / steps;
  const dirZ = totalRun >= 0 ? 1 : -1;

  for (let i = 0; i < steps; i++) {
    const topY = startY + (i + 1) * stepRise;
    const stepH = topY - startY + 0.35;
    const zCenter = startZ + dirZ * (i + 0.5) * stepRun;

    // Visual treads marked nonWalkable; continuous smooth invisible ramp handles movement cleanly
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(width, stepH, stepRun + 0.08), stepMat);
    stepMesh.position.set(centerX, startY - 0.35 + stepH * 0.5, zCenter);
    stepMesh.receiveShadow = true;
    stepMesh.userData.nonWalkable = true;
    parent.add(stepMesh);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.05, 0.14), trimMat);
    trim.position.set(centerX, topY + 0.015, zCenter - dirZ * stepRun * 0.44);
    trim.userData.nonWalkable = true;
    parent.add(trim);
  }

  // Smooth continuous walkable ramp slab spanning startY -> endY with slight lip extensions
  const rampRun = Math.abs(totalRun) + 0.45;
  const rampSlope = Math.atan2(totalRise, rampRun);
  const rampLen = Math.hypot(totalRise, rampRun);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.14, rampLen), sharedInvisibleRampMat);
  ramp.position.set(centerX, (startY + endY) * 0.5 - 0.05, (startZ + endZ) * 0.5);
  ramp.rotation.x = dirZ > 0 ? -rampSlope : rampSlope;
  ramp.visible = true;
  ramp.userData.walkableSurface = true;
  parent.add(ramp);

  // Non-walkable decorative side balustrades
  const slopeAngle = Math.atan2(totalRise, Math.abs(totalRun));
  const diagLen = Math.hypot(totalRise, Math.abs(totalRun)) + 0.5;
  const midY = (startY + endY) * 0.5 + 0.7;
  const midZ = (startZ + endZ) * 0.5;
  for (const side of [-width * 0.5 - 0.18, width * 0.5 + 0.18]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, diagLen), railMat);
    rail.position.set(centerX + side, midY, midZ);
    rail.rotation.x = dirZ > 0 ? -slopeAngle : slopeAngle;
    rail.userData.nonWalkable = true;
    parent.add(rail);
  }
}

/** Partition wall along Z or X with an open walkable central archway and height-aware colliders */
function addPartitionWallWithArch(
  parent: THREE.Group,
  colliders: WorldCollider[],
  origin: Transform,
  axis: 'x' | 'z',
  fixedCoord: number,
  spanStart: number,
  spanEnd: number,
  archCenter: number,
  archWidth: number,
  baseY: number,
  wallHeight: number,
  wallThick: number,
  wallMat: THREE.Material,
  trimMat: THREE.Material,
  label: string
) {
  const halfArch = archWidth * 0.5;
  const leftLen = archCenter - halfArch - spanStart;
  const rightLen = spanEnd - (archCenter + halfArch);
  const archTopH = Math.max(0.8, wallHeight - 4.0);
  const archTopY = baseY + 4.0 + archTopH * 0.5;

  const placeSegment = (centerAlong: number, len: number, segLabel: string) => {
    if (len <= 0.1) return;
    if (axis === 'z') {
      addBoxWall(
        parent,
        colliders,
        origin,
        wallThick,
        wallHeight,
        len,
        fixedCoord,
        baseY + wallHeight * 0.5,
        centerAlong,
        wallMat,
        segLabel
      );
    } else {
      addBoxWall(
        parent,
        colliders,
        origin,
        len,
        wallHeight,
        wallThick,
        centerAlong,
        baseY + wallHeight * 0.5,
        fixedCoord,
        wallMat,
        segLabel
      );
    }
  };

  placeSegment(spanStart + leftLen * 0.5, leftLen, label);
  placeSegment(archCenter + halfArch + rightLen * 0.5, rightLen, label);

  // Overhead lintel + ornate jamb pillars framing the doorway (nonWalkable visual)
  const lintelGeo =
    axis === 'z'
      ? new THREE.BoxGeometry(wallThick + 0.14, archTopH, archWidth + 0.35)
      : new THREE.BoxGeometry(archWidth + 0.35, archTopH, wallThick + 0.14);
  const lintel = new THREE.Mesh(lintelGeo, wallMat);
  lintel.position.set(
    axis === 'z' ? fixedCoord : archCenter,
    archTopY,
    axis === 'z' ? archCenter : fixedCoord
  );
  lintel.userData.nonWalkable = true;
  parent.add(lintel);

  const trimGeo =
    axis === 'z'
      ? new THREE.BoxGeometry(wallThick + 0.24, 0.28, archWidth + 0.5)
      : new THREE.BoxGeometry(archWidth + 0.5, 0.28, wallThick + 0.24);
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.set(
    axis === 'z' ? fixedCoord : archCenter,
    baseY + 4.0,
    axis === 'z' ? archCenter : fixedCoord
  );
  trim.userData.nonWalkable = true;
  parent.add(trim);

  for (const sideSign of [-1, 1]) {
    const jambOffset = archCenter + sideSign * halfArch;
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.26, 4.15, wallThick + 0.26), trimMat);
    jamb.position.set(
      axis === 'z' ? fixedCoord : jambOffset,
      baseY + 2.075,
      axis === 'z' ? jambOffset : fixedCoord
    );
    jamb.userData.nonWalkable = true;
    parent.add(jamb);
  }
}

function createArabicArchGroup(span: number, pillarTopY: number, archMat: THREE.Material, accentMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.userData.nonWalkable = true;
  const half = span * 0.5;
  const archHeight = 2.65;
  const segments = 6;
  // Two symmetric graceful pointed curves meeting at central apex
  for (const side of [-1, 1]) {
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const z0 = side * half * (1 - t0);
      const z1 = side * half * (1 - t1);
      const y0 = pillarTopY + Math.sin(t0 * Math.PI * 0.5) * archHeight;
      const y1 = pillarTopY + Math.sin(t1 * Math.PI * 0.5) * archHeight;
      const len = Math.hypot(y1 - y0, z1 - z0) + 0.08;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, len), archMat);
      seg.position.set(0, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      seg.rotation.x = Math.atan2(y1 - y0, z1 - z0) * -1;
      seg.userData.nonWalkable = true;
      g.add(seg);
    }
  }
  const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), accentMat);
  keystone.position.set(0, pillarTopY + archHeight, 0);
  keystone.userData.nonWalkable = true;
  g.add(keystone);
  return g;
}

function createWallTorchMesh(ironMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.userData.nonWalkable = true;
  const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.65, 6), ironMat);
  sconce.rotation.x = 0.35;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.14, 0.22, 8), ironMat);
  bowl.position.set(0, 0.34, 0.12);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 6), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
  flame.position.set(0, 0.68, 0.12);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.35, 5), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  core.position.set(0, 0.62, 0.12);
  g.add(sconce, bowl, flame, core);
  return g;
}

function createCanopyBedMesh(woodMat: THREE.Material, drapeColor: number, trimMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const fabric = new THREE.MeshLambertMaterial({ color: drapeColor, side: THREE.DoubleSide });
  const sheet = new THREE.MeshLambertMaterial({ color: 0xfef3c7 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 4.4), woodMat);
  frame.position.y = 0.28;
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.45, 4.0), sheet);
  mattress.position.y = 0.68;
  const quilt = new THREE.Mesh(new THREE.BoxGeometry(3.12, 0.16, 2.75), fabric);
  quilt.position.set(0, 0.9, 0.6);
  for (const px of [-0.75, 0.75]) {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.7), sheet);
    pillow.position.set(px, 0.98, -1.4);
    g.add(pillow);
  }
  for (const [px, pz] of [[-1.6, -2.1], [1.6, -2.1], [-1.6, 2.1], [1.6, 2.1]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.6, 8), trimMat);
    post.position.set(px, 1.8, pz);
    g.add(post);
  }
  const topCanopy = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.22, 4.5), fabric);
  topCanopy.position.y = 3.6;
  g.add(frame, mattress, quilt, topCanopy);
  return g;
}

function createArmorStandMesh(ironMat: THREE.Material, accentMat: THREE.Material, woodMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.35, 8), woodMat);
  plinth.position.y = 0.18;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 6), woodMat);
  pole.position.y = 1.2;
  const chestPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.85, 8), ironMat);
  chestPlate.position.y = 1.5;
  const pauldronL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), accentMat);
  pauldronL.position.set(-0.42, 1.82, 0);
  const pauldronR = pauldronL.clone();
  pauldronR.position.x = 0.42;
  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.42, 8), ironMat);
  helm.position.y = 2.18;
  g.add(plinth, pole, chestPlate, pauldronL, pauldronR, helm);
  return g;
}

function createStudyDeskMesh(woodMat: THREE.Material, trimMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.6), woodMat);
  top.position.y = 1.05;
  g.add(top);
  for (const [lx, lz] of [[-1.35, -0.6], [1.35, -0.6], [-1.35, 0.6], [1.35, 0.6]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 0.18), woodMat);
    leg.position.set(lx, 0.52, lz);
    g.add(leg);
  }
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x991b1b }));
  book.position.set(-0.4, 1.2, 0.1);
  const globeStand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 0.25, 8), trimMat);
  globeStand.position.set(0.95, 1.25, -0.2);
  const globeBall = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), trimMat);
  globeBall.position.set(0.95, 1.6, -0.2);
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.28, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  candle.position.set(-1.1, 1.28, -0.35);
  g.add(book, globeStand, globeBall, candle);
  return g;
}

function createChairMesh(woodMat: THREE.Material, cushionColor: number): THREE.Group {
  const g = new THREE.Group();
  const cush = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.65), new THREE.MeshLambertMaterial({ color: cushionColor }));
  cush.position.y = 0.56;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.72), woodMat);
  seat.position.y = 0.44;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.78, 0.12), woodMat);
  back.position.set(0, 0.85, -0.3);
  g.add(seat, cush, back);
  for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.1), woodMat);
    leg.position.set(lx, 0.22, lz);
    g.add(leg);
  }
  return g;
}

function createGoldenUrnMesh(goldMat: THREE.Material): THREE.Group {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.45, 0.0),
    new THREE.Vector2(0.28, 0.32),
    new THREE.Vector2(0.68, 0.95),
    new THREE.Vector2(0.58, 1.45),
    new THREE.Vector2(0.32, 1.72),
    new THREE.Vector2(0.48, 1.95),
  ];
  const g = new THREE.Group();
  const urn = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), goldMat);
  g.add(urn);
  return g;
}

function createPalmPlanterMesh(potMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.54, 0.95, 10), potMat);
  pot.position.y = 0.48;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.8, 7), new THREE.MeshLambertMaterial({ color: 0x78350f }));
  trunk.position.y = 2.1;
  g.add(pot, trunk);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.75, 4), frondMat);
    frond.position.set(Math.cos(a) * 0.72, 3.35, Math.sin(a) * 0.72);
    frond.rotation.z = -Math.cos(a) * 0.95;
    frond.rotation.x = Math.sin(a) * 0.95;
    g.add(frond);
  }
  return g;
}

function createChandelierGroup(radius: number, goldMat: THREE.Material, glowColor = 0xfef08a): THREE.Group {
  const ch = new THREE.Group();
  ch.userData.nonWalkable = true;
  const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), goldMat);
  chain.position.y = -1.1;
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.08, 8, 22), goldMat);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = -2.2;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.58, 0.06, 8, 16), goldMat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = -2.7;
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.25), glowMat);
  orb.position.y = -2.45;
  ch.add(chain, ring1, ring2, orb);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), glowMat);
    candle.position.set(Math.cos(a) * radius, -2.02, Math.sin(a) * radius);
    ch.add(candle);
  }
  return ch;
}

function createCarpetMesh(width: number, depth: number, mainHex: number, trimHex: number): THREE.Group {
  const rug = new THREE.Group();
  rug.userData.nonWalkable = true;
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.22, 0.025, depth + 0.22),
    new THREE.MeshLambertMaterial({ color: trimHex, flatShading: true })
  );
  border.position.y = 0.012;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.032, depth),
    new THREE.MeshLambertMaterial({ color: mainHex, flatShading: true })
  );
  body.position.y = 0.018;
  rug.add(border, body);
  return rug;
}

function createChestProp(id: string, x: number, y: number, z: number, origin: Transform, colliders: WorldCollider[]): InteriorChestData {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24, flatShading: true });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), woodMat);
  base.position.y = 0.3;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.84), goldMat);
  trim.position.y = 0.56;
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.08), goldMat);
  lock.position.set(0, 0.42, 0.42);
  group.add(base, trim, lock);

  const lid = new THREE.Group();
  lid.position.set(0, 0.6, -0.4);
  const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, Math.PI), woodMat);
  lidMesh.rotation.z = Math.PI / 2;
  lidMesh.position.set(0, 0, 0.4);
  lid.add(lidMesh);
  group.add(lid);

  colliders.push({
    type: 'box',
    minX: origin.x + x - 0.7,
    maxX: origin.x + x + 0.7,
    minZ: origin.z + z - 0.5,
    maxZ: origin.z + z + 0.5,
    minY: origin.y + y,
    maxY: origin.y + y + 1.5,
    label: 'Peti Harta Karun',
  });

  return {
    id,
    group,
    lid,
    opened: false,
    position: [origin.x + x, origin.y + y, origin.z + z],
  };
}

function createFireplaceNoLight(matStone: THREE.Material, matWood: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const breast = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.2, 1.2), matStone);
  breast.position.set(0, 2.6, 0);
  const hearth = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.8, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x18181b })
  );
  hearth.position.set(0, 0.9, 0.48);
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.22, 1.45), matWood);
  mantel.position.set(0, 2.2, 0.15);
  const coals = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.55), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
  coals.position.set(0, 0.12, 0.55);
  const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.95, 6), new THREE.MeshBasicMaterial({ color: 0xff7a00 }));
  flame1.position.set(0, 0.65, 0.55);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  flame2.position.set(0, 0.52, 0.58);
  g.add(breast, hearth, mantel, coals, flame1, flame2);
  return g;
}

function createLargeBookcase(w: number, h: number, woodMat: THREE.Material, bookColors: number[]): THREE.Group {
  const bc = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.7), woodMat);
  back.position.y = h * 0.5;
  bc.add(back);
  const rows = Math.max(3, Math.floor(h / 1.15));
  for (let r = 0; r < rows; r++) {
    const sy = 0.65 + r * 1.05;
    for (let s = 0; s < 3; s++) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.28, 0.62, 0.4),
        new THREE.MeshLambertMaterial({ color: bookColors[(r + s) % bookColors.length] })
      );
      strip.position.set((s - 1) * (w * 0.30), sy, 0.28);
      bc.add(strip);
    }
  }
  return bc;
}

// ============================================================================
// 3. BUILDER FOR ALL 7 EXPANSIVE INTERIORS
// ============================================================================

function enforceDoubleSideMaterial(mat: THREE.Material | THREE.Material[]) {
  const arr = Array.isArray(mat) ? mat : [mat];
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (m && m.side !== THREE.DoubleSide) {
      m.side = THREE.DoubleSide;
      m.needsUpdate = true;
    }
  }
}

function finalizeInteriorRoom(room: InteriorRoom): InteriorRoom {
  room.walkableMeshes.length = 0;
  room.rootGroup.frustumCulled = false;
  room.rootGroup.traverse((obj) => {
    obj.frustumCulled = false;
    if (obj instanceof THREE.Mesh) {
      if (obj.material) enforceDoubleSideMaterial(obj.material);
      if (obj.userData && obj.userData.walkableSurface === true && obj.userData.nonWalkable !== true) {
        room.walkableMeshes.push(obj);
      }
    }
  });
  room.rootGroup.updateMatrixWorld(true);
  return room;
}

function sampleRoomFloorHeight(room: InteriorRoom, worldX: number, currentY: number, worldZ: number): number {
  const fallback = Math.max(room.minFloorY, room.getFallbackFloorY(worldX, currentY, worldZ));
  if (room.walkableMeshes.length === 0) return fallback;

  _interiorRayOrigin.set(worldX, currentY + 1.15, worldZ);
  _interiorRaycaster.set(_interiorRayOrigin, _interiorDownVec);
  _interiorRaycaster.near = 0.01;
  _interiorRaycaster.far = 24.0;

  const hits = _interiorRaycaster.intersectObjects(room.walkableMeshes, false);
  for (let i = 0; i < hits.length; i++) {
    const hitY = hits[i].point.y;
    if (hitY <= currentY + 0.85 && hitY >= room.minFloorY - 0.5) {
      return Math.max(room.minFloorY, hitY);
    }
  }
  return fallback;
}

function clampShellRoomCamera(room: InteriorRoom, camPos: THREE.Vector3): void {
  const halfW = room.dimensions.width * 0.5;
  const halfD = room.dimensions.depth * 0.5;
  camPos.x = THREE.MathUtils.clamp(camPos.x, room.origin.x - halfW + 1.0, room.origin.x + halfW - 1.0);
  camPos.z = THREE.MathUtils.clamp(camPos.z, room.origin.z - halfD + 1.0, room.origin.z + halfD - 1.0);
  camPos.y = THREE.MathUtils.clamp(camPos.y, room.minFloorY + 0.65, room.maxCeilingY - 0.85);
}

function createSlottedTowerFloorGeometry(
  outerR: number,
  holeInnerR: number,
  holeOuterR: number,
  holeStartAngle: number,
  holeEndAngle: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);

  const hole = new THREE.Path();
  const segs = 24;
  for (let i = 0; i <= segs; i++) {
    const ang = Math.PI + holeStartAngle + (i / segs) * (holeEndAngle - holeStartAngle);
    const px = Math.cos(ang) * holeOuterR;
    const py = Math.sin(ang) * holeOuterR;
    if (i === 0) hole.moveTo(px, py);
    else hole.lineTo(px, py);
  }
  for (let i = segs; i >= 0; i--) {
    const ang = Math.PI + holeStartAngle + (i / segs) * (holeEndAngle - holeStartAngle);
    hole.lineTo(Math.cos(ang) * holeInnerR, Math.sin(ang) * holeInnerR);
  }
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 32 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function addTowerSpiralStairs(
  rootGroup: THREE.Group,
  colliders: WorldCollider[],
  origin: Transform,
  fromY: number,
  toY: number,
  rInner: number,
  rOuter: number,
  angleStart: number,
  angleEnd: number,
  steps: number,
  stepMat: THREE.Material,
  trimMat: THREE.Material
) {
  const rMid = (rInner + rOuter) * 0.5;
  const stairW = rOuter - rInner;
  const treadDepth = 1.68;
  const thickness = 0.54;

  for (let i = 0; i < steps; i++) {
    const frac = (i + 0.5) / steps;
    const stepTopY = fromY + ((i + 1) / steps) * (toY - fromY);
    const t = angleStart + frac * (angleEnd - angleStart);
    const cx = -Math.cos(t) * rMid;
    const cz = Math.sin(t) * rMid;

    // Visual treads marked nonWalkable so continuous smooth helical ramp handles walking smoothly
    const step = new THREE.Mesh(new THREE.BoxGeometry(stairW, thickness, treadDepth), stepMat);
    step.position.set(cx, stepTopY - thickness * 0.5, cz);
    step.rotation.y = t;
    step.receiveShadow = true;
    step.userData.nonWalkable = true;
    rootGroup.add(step);

    if (i % 3 === 0 || i === steps - 1) {
      const innerPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 6), trimMat);
      innerPost.position.set(-Math.cos(t) * (rInner + 0.12), stepTopY + 0.52, Math.sin(t) * (rInner + 0.12));
      innerPost.userData.nonWalkable = true;
      rootGroup.add(innerPost);
    }
  }

  // Smooth continuous helical invisible walkable ramp covering mouth transitions + full staircase arc
  const arcSegs = 40;
  const rampVerts: number[] = [];
  const rampIndices: number[] = [];
  const rampInner = rInner - 0.25;
  const rampOuter = rOuter + 0.25;
  const extStart = angleStart - 0.14;
  const extEnd = angleEnd + 0.14;
  for (let s = 0; s <= arcSegs; s++) {
    const u = s / arcSegs;
    const ang = extStart + u * (extEnd - extStart);
    const stairFrac = THREE.MathUtils.clamp((ang - angleStart) / (angleEnd - angleStart), 0, 1);
    const ry = THREE.MathUtils.lerp(fromY, toY, stairFrac) + 0.015;
    const ix = -Math.cos(ang) * rampInner;
    const iz = Math.sin(ang) * rampInner;
    const ox = -Math.cos(ang) * rampOuter;
    const oz = Math.sin(ang) * rampOuter;
    rampVerts.push(ix, ry, iz, ox, ry, oz);
    if (s < arcSegs) {
      const base = s * 2;
      rampIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const rampGeo = new THREE.BufferGeometry();
  rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(rampVerts, 3));
  rampGeo.setIndex(rampIndices);
  rampGeo.computeVertexNormals();
  const rampMesh = new THREE.Mesh(rampGeo, sharedInvisibleRampMat);
  rampMesh.visible = true;
  rampMesh.userData.walkableSurface = true;
  rootGroup.add(rampMesh);

  // Upper floor stairwell guardrails so player uses stair mouths cleanly without walking off the side edge
  const guardSteps = 7;
  for (let i = 0; i <= guardSteps; i++) {
    const t = angleStart + 0.12 + (i / guardSteps) * (angleEnd - angleStart - 0.24);
    const gx = -Math.cos(t) * (rInner - 0.25);
    const gz = Math.sin(t) * (rInner - 0.25);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.15, 6), trimMat);
    post.position.set(gx, toY + 0.58, gz);
    post.userData.nonWalkable = true;
    rootGroup.add(post);

    if (i < guardSteps) {
      const tNext = angleStart + 0.12 + ((i + 1) / guardSteps) * (angleEnd - angleStart - 0.24);
      const gx2 = -Math.cos(tNext) * (rInner - 0.25);
      const gz2 = Math.sin(tNext) * (rInner - 0.25);
      const segLen = Math.hypot(gx2 - gx, gz2 - gz);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, segLen + 0.1), trimMat);
      rail.position.set((gx + gx2) * 0.5, toY + 1.08, (gz + gz2) * 0.5);
      rail.rotation.y = Math.atan2(gx2 - gx, gz2 - gz);
      rail.userData.nonWalkable = true;
      rootGroup.add(rail);
    }

    colliders.push({
      type: 'circle',
      x: origin.x + gx,
      z: origin.z + gz,
      radius: 0.45,
      minY: origin.y + toY - 0.5,
      maxY: origin.y + toY + 2.5,
      label: 'Pagar Pembatas Tangga Spiral',
    });
  }
}

function buildShellRoom(
  id: string,
  name: string,
  exteriorName: string,
  origin: Transform,
  w: number,
  d: number,
  h: number,
  floorMat: THREE.Material,
  wallMat: THREE.Material,
  ceilMat: THREE.Material,
  doorWidth = 3.2
): {
  rootGroup: THREE.Group;
  colliders: WorldCollider[];
  halfW: number;
  halfD: number;
} {
  const rootGroup = new THREE.Group();
  rootGroup.name = `interior_${id}`;
  rootGroup.position.set(origin.x, origin.y, origin.z);
  rootGroup.visible = false;

  const colliders: WorldCollider[] = [];
  const halfW = w * 0.5;
  const halfD = d * 0.5;
  const wallT = 0.7;

  // Walkable Main Floor
  addWalkableSlab(rootGroup, w, 0.4, d, 0, -0.2, 0, floorMat, `Lantai ${name}`);

  // Ceiling slab
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), ceilMat);
  ceil.position.y = h + 0.175;
  ceil.userData.nonWalkable = true;
  rootGroup.add(ceil);

  // North, West, East solid walls
  addBoxWall(rootGroup, colliders, origin, w, h, wallT, 0, h * 0.5, -halfD, wallMat, `Dinding Utara ${id}`);
  addBoxWall(rootGroup, colliders, origin, wallT, h, d, -halfW, h * 0.5, 0, wallMat, `Dinding Barat ${id}`);
  addBoxWall(rootGroup, colliders, origin, wallT, h, d, halfW, h * 0.5, 0, wallMat, `Dinding Timur ${id}`);

  // South wall split for Doorway
  const sideW = (w - doorWidth) * 0.5;
  addBoxWall(rootGroup, colliders, origin, sideW, h, wallT, -halfW + sideW * 0.5, h * 0.5, halfD, wallMat, `Dinding Selatan Kiri ${id}`);
  addBoxWall(rootGroup, colliders, origin, sideW, h, wallT, halfW - sideW * 0.5, h * 0.5, halfD, wallMat, `Dinding Selatan Kanan ${id}`);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, Math.max(0.8, h - 4.2), wallT), wallMat);
  lintel.position.set(0, 4.2 + Math.max(0.8, h - 4.2) * 0.5, halfD);
  lintel.userData.nonWalkable = true;
  rootGroup.add(lintel);

  return { rootGroup, colliders, halfW, halfD };
}

/** 3A. AULA KOMANDAN BENTENG VAL-KRAGOR (28 x 26 x 8) */
function createValKragorCommandHall(origin: Transform): { room: InteriorRoom; exitPos: Transform; spawnInPos: Transform } {
  const w = 40;
  const d = 34;
  const h = 13.5;
  const upperY = 5.4;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8, flatShading: true });
  const upperFloorMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.85, flatShading: true });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b4859, roughness: 0.84, flatShading: true });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2c221c, roughness: 0.9 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d3b24, flatShading: true });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.35 });
  const bannerMat = new THREE.MeshLambertMaterial({ color: 0x991b1b, side: THREE.DoubleSide });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.25 });

  const { rootGroup, colliders, halfW, halfD } = buildShellRoom(
    'valkragor_command_hall',
    'Aula Komandan Val-Kragor',
    'Desa Benteng Val-Kragor',
    origin,
    w,
    d,
    h,
    floorMat,
    wallMat,
    ceilMat,
    4.2
  );

  // Heavy Timber Ceiling Beams
  for (let z = -halfD + 4; z <= halfD - 4; z += 5.5) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 0.5, 0.6), woodMat);
    beam.position.set(0, h - 0.25, z);
    beam.userData.nonWalkable = true;
    rootGroup.add(beam);
  }

  // Crimson War Rug running down Central Tactical Hall
  const carpet = createCarpetMesh(6.2, 23.0, 0x7f1d1d, 0xd97706);
  carpet.position.set(0, 0, -1.5);
  rootGroup.add(carpet);

  // Grand Tactical War Map Table in Center + Officer Chairs
  const warTable = createImperialWarTableMesh();
  warTable.scale.set(1.28, 1.05, 1.28);
  warTable.position.set(0, 0, -1.5);
  rootGroup.add(warTable);
  colliders.push({
    type: 'box',
    minX: origin.x - 2.4,
    maxX: origin.x + 2.4,
    minZ: origin.z - 3.6,
    maxZ: origin.z + 0.6,
    minY: origin.y,
    maxY: origin.y + 2.6,
    label: 'Meja Peta Taktik Perang',
  });
  for (const [cx, cz, ry] of [[-2.9, -1.5, Math.PI / 2], [2.9, -1.5, -Math.PI / 2], [0, 1.3, 0]] as [number, number, number][]) {
    const ch = createChairMesh(woodMat, 0x7f1d1d);
    ch.position.set(cx, 0, cz);
    ch.rotation.y = ry;
    rootGroup.add(ch);
  }

  // Flanking Stone Pillars along Central Aisle with Hanging War Banners
  for (const px of [-9.0, 9.0]) {
    for (const pz of [-9.5, 1.5, 9.5]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.15, h, 1.15), wallMat);
      col.position.set(px, h * 0.5, pz);
      col.userData.nonWalkable = true;
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 3.8), bannerMat);
      banner.position.set(px + (px < 0 ? 0.65 : -0.65), 4.4, pz);
      banner.rotation.y = Math.PI / 2;
      rootGroup.add(col, banner);
      colliders.push({
        type: 'circle',
        x: origin.x + px,
        z: origin.z + pz,
        radius: 0.8,
        minY: origin.y,
        maxY: origin.y + h,
        label: 'Pilar Aula Benteng',
      });
    }
  }

  // Roaring Stone Fireplace & Wall War Map on North Wall + Scroll Cabinet
  const fire = createFireplaceNoLight(wallMat, woodMat);
  fire.position.set(-5.6, 0, -halfD + 0.9);
  rootGroup.add(fire);
  colliders.push({
    type: 'box',
    minX: origin.x - 7.4,
    maxX: origin.x - 3.8,
    minZ: origin.z - halfD,
    maxZ: origin.z - halfD + 1.9,
    minY: origin.y,
    maxY: origin.y + 5.2,
    label: 'Perapian Batu Komandan',
  });

  // Large Tactical Wall Map behind Commander
  const mapBoardFrame = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.2, 0.16), woodMat);
  mapBoardFrame.position.set(0, 3.1, -halfD + 0.48);
  const mapBoardCanvas = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 2.7, 0.2),
    new THREE.MeshLambertMaterial({ color: 0xe7d3a7 })
  );
  mapBoardCanvas.position.set(0, 3.1, -halfD + 0.52);
  rootGroup.add(mapBoardFrame, mapBoardCanvas);

  // Scroll Cabinet along North-East
  const scrollCab = createLargeBookcase(3.2, 4.4, woodMat, [0xd97706, 0x991b1b, 0xb45309]);
  scrollCab.position.set(5.6, 0, -halfD + 0.85);
  rootGroup.add(scrollCab);
  colliders.push({
    type: 'box',
    minX: origin.x + 3.9,
    maxX: origin.x + 7.3,
    minZ: origin.z - halfD,
    maxZ: origin.z - halfD + 1.4,
    minY: origin.y,
    maxY: origin.y + 4.8,
    label: 'Lemari Gulungan Perang',
  });

  // Glowing Perimeter Wall Torches (Floor 1 & Floor 2, zero dynamic PointLights)
  for (const tx of [-halfW + 0.55, halfW - 0.55]) {
    for (const tz of [-11.5, -2.5, 6.5]) {
      const torch = createWallTorchMesh(ironMat);
      torch.position.set(tx, 3.4, tz);
      torch.rotation.y = tx < 0 ? Math.PI / 2 : -Math.PI / 2;
      rootGroup.add(torch);
    }
  }

  // Floor 1 Side Rooms Partition Walls (X = -10.0 West Armory & X = +10.0 East Officers' Mess)
  addPartitionWallWithArch(rootGroup, colliders, origin, 'z', -10.0, -halfD + 0.4, 6.5, -4.5, 4.8, 0, upperY, 0.55, wallMat, woodMat, 'Dinding Gudang Senjata');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'z', 10.0, -halfD + 0.4, 6.5, -4.5, 4.8, 0, upperY, 0.55, wallMat, woodMat, 'Dinding Ruang Istirahat Perwira');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', 6.5, -halfW + 0.4, -10.0, -15.0, 4.8, 0, upperY, 0.55, wallMat, woodMat, 'Gerbang Gudang Senjata');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', 6.5, 10.0, halfW - 0.4, 15.0, 4.8, 0, upperY, 0.55, wallMat, woodMat, 'Gerbang Ruang Istirahat Perwira');

  // ROOM 1A (WEST FLOOR 1): GUDANG SENJATA & BAJA (Armory)
  for (const wz of [-11.5, -4.5, 2.2]) {
    const rack = createWeaponRackMesh();
    rack.position.set(-halfW + 1.3, 0, wz);
    rack.rotation.y = Math.PI / 2;
    rootGroup.add(rack);
    colliders.push({
      type: 'circle',
      x: origin.x - halfW + 1.3,
      z: origin.z + wz,
      radius: 1.0,
      minY: origin.y,
      maxY: origin.y + 3.5,
      label: 'Rak Senjata Perang',
    });
  }
  for (const az of [-12.5, 1.5]) {
    const stand = createArmorStandMesh(ironMat, goldMat, woodMat);
    stand.position.set(-14.2, 0, az);
    stand.rotation.y = Math.PI / 2;
    rootGroup.add(stand);
    colliders.push({
      type: 'circle',
      x: origin.x - 14.2,
      z: origin.z + az,
      radius: 0.9,
      minY: origin.y,
      maxY: origin.y + 3.2,
      label: 'Manekin Armor Baja',
    });
  }
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.05, 3.4), woodMat);
  benchTop.position.set(-14.8, 0.525, -4.5);
  const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.65), ironMat);
  anvil.position.set(-14.8, 1.32, -4.5);
  rootGroup.add(benchTop, anvil);
  colliders.push({
    type: 'box',
    minX: origin.x - 16.0,
    maxX: origin.x - 13.6,
    minZ: origin.z - 6.3,
    maxZ: origin.z - 2.7,
    minY: origin.y,
    maxY: origin.y + 2.4,
    label: 'Meja Perawatan Senjata',
  });

  // ROOM 1B (EAST FLOOR 1): RUANG ISTIRAHAT & MAKAN PERWIRA (Officers' Mess Hall)
  const messTable = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 8.2), woodMat);
  messTable.position.set(14.8, 0.5, -5.0);
  rootGroup.add(messTable);
  for (let mz = -8.0; mz <= -2.0; mz += 2.0) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.34, 8), goldMat);
    mug.position.set(14.5 + (mz % 4 === 0 ? 0.35 : -0.35), 1.17, mz);
    rootGroup.add(mug);
  }
  colliders.push({
    type: 'box',
    minX: origin.x + 13.6,
    maxX: origin.x + 16.0,
    minZ: origin.z - 9.2,
    maxZ: origin.z - 0.8,
    minY: origin.y,
    maxY: origin.y + 2.2,
    label: 'Meja Makan Perwira',
  });
  for (const bx of [13.0, 16.6]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 7.6), woodMat);
    bench.position.set(bx, 0.26, -5.0);
    rootGroup.add(bench);
  }
  // Stacked Ale Barrels against North-East Wall
  for (const [bx, by, bz] of [[14.5, 0.65, -14.8], [16.2, 0.65, -14.8], [15.35, 1.85, -14.8]] as [number, number, number][]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.56, 1.3, 10), woodMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(bx, by, bz);
    rootGroup.add(barrel);
  }
  colliders.push({
    type: 'box',
    minX: origin.x + 13.6,
    maxX: origin.x + 17.2,
    minZ: origin.z - 16.0,
    maxZ: origin.z - 13.6,
    minY: origin.y,
    maxY: origin.y + 3.0,
    label: 'Rak Tong Persediaan',
  });

  // FLOOR 2 (upperY = 5.4): UPPER OVERLOOK BALCONY & COMMANDER'S PRIVATE QUARTERS
  addWalkableSlab(rootGroup, 10.2, 0.45, 24.0, -14.9, upperY - 0.225, -5.0, upperFloorMat, 'Lantai 2 Sayap Barat Komandan');
  addWalkableSlab(rootGroup, 10.2, 0.45, 24.0, 14.9, upperY - 0.225, -5.0, upperFloorMat, 'Balkon Atas Timur Benteng');
  addWalkableSlab(rootGroup, 20.0, 0.45, 6.2, 0, upperY - 0.225, -13.9, upperFloorMat, 'Jembatan Balkon Atas Utara');

  // Timber Staircase ascending East Wing from Y=0 (Z=15.0) to Y=5.4 (Z=6.8) with Smooth Ramp
  addStaircase(rootGroup, 3.8, 16, 0, upperY, 15.0, 6.8, 15.0, woodMat, goldMat, ironMat);

  // Upper Balcony Guardrails (strictly height-aware: Y >= upperY - 0.3)
  const addUpperRail = (rw: number, rd: number, rx: number, rz: number) => {
    const rMesh = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.0, rd), woodMat);
    rMesh.position.set(rx, upperY + 0.5, rz);
    rMesh.userData.nonWalkable = true;
    rootGroup.add(rMesh);
    colliders.push({
      type: 'box',
      minX: origin.x + rx - rw * 0.5 - 0.1,
      maxX: origin.x + rx + rw * 0.5 + 0.1,
      minZ: origin.z + rz - rd * 0.5 - 0.1,
      maxZ: origin.z + rz + rd * 0.5 + 0.1,
      minY: origin.y + upperY - 0.3,
      maxY: origin.y + upperY + 3.0,
      label: 'Pagar Balkon Atas Benteng',
    });
  };
  addUpperRail(0.32, 17.8, 10.0, -1.9); // East overlook edge
  addUpperRail(0.32, 17.8, -10.0, -1.9); // West overlook edge (with North open bridge!)
  addUpperRail(20.0, 0.32, 0, -10.8); // North bridge inner edge

  // Commander's Private Quarters Partition + Archway on Floor 2 West (-20..-10, -17..+6)
  addPartitionWallWithArch(rootGroup, colliders, origin, 'z', -10.0, -halfD + 0.4, -1.0, -13.6, 4.4, upperY, h - upperY, 0.5, wallMat, woodMat, 'Pintu Kamar Pribadi Komandan');
  addBoxWall(rootGroup, colliders, origin, 10.0, h - upperY, 0.5, -15.0, upperY + (h - upperY) * 0.5, 6.2, wallMat, 'Dinding Selatan Kamar Komandan');

  // Inside Commander's Private Quarters: Heavy Timber Bed, Writing Desk, Tactical Bookcase, Heirloom Shield
  const cmdBed = createCanopyBedMesh(woodMat, 0x7f1d1d, woodMat);
  cmdBed.position.set(-16.6, upperY, -5.2);
  rootGroup.add(cmdBed);
  colliders.push({
    type: 'box',
    minX: origin.x - 18.5,
    maxX: origin.x - 14.7,
    minZ: origin.z - 7.6,
    maxZ: origin.z - 2.8,
    minY: origin.y + upperY,
    maxY: origin.y + upperY + 3.8,
    label: 'Ranjang Komandan Benteng',
  });

  const cmdDesk = createStudyDeskMesh(woodMat, goldMat);
  cmdDesk.position.set(-13.8, upperY, -10.5);
  cmdDesk.rotation.y = Math.PI;
  const cmdChair = createChairMesh(woodMat, 0x7f1d1d);
  cmdChair.position.set(-13.8, upperY, -9.2);
  cmdChair.rotation.y = Math.PI;
  rootGroup.add(cmdDesk, cmdChair);
  colliders.push({
    type: 'box',
    minX: origin.x - 15.6,
    maxX: origin.x - 12.0,
    minZ: origin.z - 11.5,
    maxZ: origin.z - 9.4,
    minY: origin.y + upperY,
    maxY: origin.y + upperY + 2.4,
    label: 'Meja Tulis Komandan',
  });

  const cmdBooks = createLargeBookcase(3.4, 4.4, woodMat, [0x991b1b, 0xd97706, 0x1e3a8a]);
  cmdBooks.position.set(-18.8, upperY, -11.5);
  cmdBooks.rotation.y = Math.PI / 2;
  rootGroup.add(cmdBooks);
  colliders.push({
    type: 'box',
    minX: origin.x - 19.6,
    maxX: origin.x - 18.0,
    minZ: origin.z - 13.4,
    maxZ: origin.z - 9.6,
    minY: origin.y + upperY,
    maxY: origin.y + upperY + 4.8,
    label: 'Rak Buku Strategi Komandan',
  });

  // Chandeliers hanging down Central Hall
  const chFront = createChandelierGroup(1.8, ironMat, 0xffa726);
  chFront.position.set(0, h - 0.2, 4.5);
  const chBack = createChandelierGroup(1.8, ironMat, 0xffa726);
  chBack.position.set(0, h - 0.2, -6.5);
  rootGroup.add(chFront, chBack);

  // Treasure Chest in Commander's Private Quarters + Tactician Haldor in War Hall
  const chest = createChestProp('chest_vk_command', -16.8, upperY, -14.8, origin, colliders);
  rootGroup.add(chest.group);

  const captainGroup = createCustomNPCMesh('commander');
  captainGroup.position.set(0, 0, -7.2);
  captainGroup.rotation.y = 0;
  rootGroup.add(captainGroup);

  const room: InteriorRoom = {
    id: 'valkragor_command_hall',
    name: 'Aula Komandan Val-Kragor',
    exteriorName: 'Desa Benteng Val-Kragor',
    rootGroup,
    origin,
    baseFloorY: origin.y,
    minFloorY: origin.y,
    maxCeilingY: origin.y + h,
    dimensions: { width: w, depth: d, height: h },
    colliders,
    walkableMeshes: [],
    npcs: [
      {
        id: 'vk_command_officer',
        name: 'Tactician Haldor',
        nameId: 'Perwira Taktik Benteng Haldor',
        role: 'Panglima Meja Perang',
        group: captainGroup,
        position: [origin.x, origin.y, origin.z - 7.2],
        dialogueId: 'commander_brann',
        icon: '⚔️',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xfef3c7,
    ambientGroundHex: 0x475569,
    ambientIntensity: 1.05,
    hemiIntensity: 1.25,
    dirIntensity: 1.05,
    bgHex: 0x1e293b,
    fogHex: 0x1e293b,
    animatedParts: [],
    getFallbackFloorY: (_wx, wy) => (wy - origin.y >= 4.0 ? origin.y + upperY : origin.y),
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: (wy) =>
      wy - origin.y >= 4.0
        ? 'Lantai 2: Kamar Komandan & Balkon Atas'
        : 'Lantai 1: Aula Taktik, Gudang & Perwira',
    clampInsideWalls: (wx, wz, r) => ({
      x: THREE.MathUtils.clamp(wx, origin.x - halfW + 0.8 + r, origin.x + halfW - 0.8 - r),
      z: THREE.MathUtils.clamp(wz, origin.z - halfD + 0.8 + r, origin.z + halfD - 0.8 - r),
    }),
    clampCameraPosition: (camPos) => clampShellRoomCamera(room, camPos),
  };

  finalizeInteriorRoom(room);

  return {
    room,
    exitPos: { x: origin.x, y: origin.y, z: origin.z + halfD - 1.6 },
    spawnInPos: { x: origin.x, y: origin.y + 0.05, z: origin.z + halfD - 3.6, rotationY: Math.PI },
  };
}

/** 3B. BENGKEL PANDAI BESI VAL-KRAGOR (22 x 20 x 6.8) */
function createValKragorBlacksmith(origin: Transform): { room: InteriorRoom; exitPos: Transform; spawnInPos: Transform } {
  const w = 22;
  const d = 20;
  const h = 11.0;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92, flatShading: true });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x291c15, roughness: 0.9 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.3 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
  const waterMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

  const { rootGroup, colliders, halfW, halfD } = buildShellRoom(
    'valkragor_blacksmith',
    'Bengkel Pandai Besi Val-Kragor',
    'Desa Benteng Val-Kragor',
    origin,
    w,
    d,
    h,
    floorMat,
    wallMat,
    ceilMat,
    3.2
  );

  // Blazing Forge Furnace at North End
  const hearthBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 2.8), wallMat);
  hearthBase.position.set(0, 1.1, -halfD + 1.8);
  const chimneyHood = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.6, 4.4, 4), wallMat);
  chimneyHood.rotation.y = Math.PI / 4;
  chimneyHood.position.set(0, 4.3, -halfD + 1.8);
  const glowingCoal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 1.4), emberMat);
  glowingCoal.position.set(0, 1.3, -halfD + 2.4);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0xff9800 }));
  flame.position.set(0, 2.0, -halfD + 2.4);
  rootGroup.add(hearthBase, chimneyHood, glowingCoal, flame);
  colliders.push({
    type: 'box',
    minX: origin.x - 3.0,
    maxX: origin.x + 3.0,
    minZ: origin.z - halfD,
    maxZ: origin.z - halfD + 3.4,
    label: 'Tungku Tempa Api',
  });

  // Twin Iron Anvils & Water Quenching Trough
  for (const ax of [-3.2, 3.2]) {
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.75, 8), woodMat);
    stump.position.set(ax, 0.37, -2.5);
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.65), ironMat);
    anvil.position.set(ax, 0.96, -2.5);
    rootGroup.add(stump, anvil);
    colliders.push({ type: 'circle', x: origin.x + ax, z: origin.z - 2.5, radius: 0.9, label: 'Paron Tempa' });
  }

  const trough = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.2), woodMat);
  trough.position.set(0, 0.37, -1.8);
  const troughWater = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.95), waterMat);
  troughWater.position.set(0, 0.72, -1.8);
  rootGroup.add(trough, troughWater);
  colliders.push({
    type: 'box',
    minX: origin.x - 1.3,
    maxX: origin.x + 1.3,
    minZ: origin.z - 2.5,
    maxZ: origin.z - 1.1,
    label: 'Bak Pendingin Baja',
  });

  // Sword & Armor Display Racks along East & West Walls
  for (const [rx, rz, rot] of [
    [-halfW + 1.3, -3.5, Math.PI / 2],
    [-halfW + 1.3, 2.5, Math.PI / 2],
    [halfW - 1.3, -3.5, -Math.PI / 2],
    [halfW - 1.3, 2.5, -Math.PI / 2],
  ] as [number, number, number][]) {
    const rack = createWeaponRackMesh();
    rack.position.set(rx, 0, rz);
    rack.rotation.y = rot;
    rootGroup.add(rack);
    colliders.push({ type: 'circle', x: origin.x + rx, z: origin.z + rz, radius: 1.0, label: 'Rak Pedang & Zirah' });
  }

  // Steel Armor Mannequins
  for (const mx of [-6.5, 6.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.25, 1.8, 6), woodMat);
    post.position.set(mx, 0.9, -6.5);
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.52), ironMat);
    chestPlate.position.set(mx, 1.45, -6.5);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), ironMat);
    helm.position.set(mx, 2.15, -6.5);
    rootGroup.add(post, chestPlate, helm);
    colliders.push({ type: 'circle', x: origin.x + mx, z: origin.z - 6.5, radius: 0.7, label: 'Stand Zirah Baja' });
  }

  // Chandelier + Forge Smith NPC
  const ch = createChandelierGroup(1.3, ironMat, 0xff8a00);
  ch.position.set(0, h - 0.2, 0.5);
  rootGroup.add(ch);

  const smithGroup = createCustomNPCMesh('frostsmith');
  smithGroup.position.set(-1.5, 0, -4.6);
  smithGroup.rotation.y = 0;
  rootGroup.add(smithGroup);

  const chest = createChestProp('chest_vk_smith', 7.5, 0, -6.8, origin, colliders);
  rootGroup.add(chest.group);

  const room: InteriorRoom = {
    id: 'valkragor_blacksmith',
    name: 'Bengkel Pandai Besi Val-Kragor',
    exteriorName: 'Desa Benteng Val-Kragor',
    rootGroup,
    origin,
    baseFloorY: origin.y,
    minFloorY: origin.y,
    maxCeilingY: origin.y + h,
    dimensions: { width: w, depth: d, height: h },
    colliders,
    walkableMeshes: [],
    npcs: [
      {
        id: 'vk_indoor_smith',
        name: 'Master Smith Torin',
        nameId: 'Pandai Besi Bengkel Val-Kragor',
        role: 'Ahli Senjata & Zirah Baja',
        group: smithGroup,
        position: [origin.x - 1.5, origin.y, origin.z - 4.6],
        dialogueId: 'frostsmith_goran',
        icon: '🔨',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xffedd5,
    ambientGroundHex: 0x432818,
    ambientIntensity: 0.92,
    hemiIntensity: 1.15,
    dirIntensity: 1.0,
    bgHex: 0x261611,
    fogHex: 0x261611,
    animatedParts: [
      { mesh: flame, mode: 'bobY', speed: 8.0, baseY: 2.0, phase: 0 },
    ],
    getFallbackFloorY: () => origin.y,
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: () => 'Lantai 1: Bengkel Pandai Besi',
    clampInsideWalls: (wx, wz, r) => ({
      x: THREE.MathUtils.clamp(wx, origin.x - halfW + 0.8 + r, origin.x + halfW - 0.8 - r),
      z: THREE.MathUtils.clamp(wz, origin.z - halfD + 0.8 + r, origin.z + halfD - 0.8 - r),
    }),
    clampCameraPosition: (camPos) => clampShellRoomCamera(room, camPos),
  };

  finalizeInteriorRoom(room);

  return {
    room,
    exitPos: { x: origin.x, y: origin.y, z: origin.z + halfD - 1.6 },
    spawnInPos: { x: origin.x, y: origin.y + 0.05, z: origin.z + halfD - 3.4, rotationY: Math.PI },
  };
}

/** 3C. ISTANA KAISAR ASTRAEA (56 x 80 x 15 — MARMER PUTIH-BIRU, KUBAH TINGGI, BALKON LANTAI 2) */
function createAstraeaImperialPalaceInterior(origin: Transform): { room: InteriorRoom; exitPos: Transform; spawnInPos: Transform } {
  const w = 56;
  const d = 80;
  const h = 20.0;
  const whiteMarble = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.08 });
  const blueMarble = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.25, metalness: 0.14 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.88 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
  const bannerBlue = new THREE.MeshLambertMaterial({ color: 0x1d4ed8, side: THREE.DoubleSide });
  const velvetRed = new THREE.MeshLambertMaterial({ color: 0x991b1b, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
  const sunGlow = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const { rootGroup, colliders, halfW, halfD } = buildShellRoom(
    'astraea_imperial_palace',
    'Istana Kaisar Astraea',
    'Ibukota Kerajaan Emas Astraea',
    origin,
    w,
    d,
    h,
    whiteMarble,
    wallMat,
    ceilMat,
    5.6
  );

  // Gleaming White-Blue Checkered Marble Floor Inlay along Nave
  for (let ix = -10; ix <= 10; ix += 4) {
    for (let iz = -24; iz <= 28; iz += 4) {
      if ((Math.abs(ix / 4) + Math.abs(iz / 4)) % 2 === 1) {
        const inlay = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.025, 3.85), blueMarble);
        inlay.position.set(ix, 0.014, iz);
        inlay.userData.nonWalkable = true;
        rootGroup.add(inlay);
      }
    }
  }

  // Vaulted Golden Coffered Dome Overhead
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(13.5, 0.75, 10, 32), goldTrim);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.set(0, h - 0.35, -6);
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(13.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfef9c3, side: THREE.BackSide })
  );
  skyDome.position.set(0, h - 0.3, -6);
  skyDome.scale.set(1, 0.42, 1);
  rootGroup.add(domeRing, skyDome);

  // Grand Crimson-and-Gold Carpet stretching down Central Nave
  const runner = createCarpetMesh(5.8, 56.0, 0x991b1b, 0xf59e0b);
  runner.position.set(0, 0, 6.0);
  rootGroup.add(runner);

  // Stepped Throne Dais at North End + Ornate Silk Canopy Pavilion
  addStaircase(rootGroup, 14.0, 4, 0, 1.4, -22.5, -26.5, 0, whiteMarble, goldTrim, goldTrim);
  addWalkableSlab(rootGroup, 20.0, 1.4, 12.0, 0, 0.7, -32.5, whiteMarble, 'Podium Singgasana Kaisar');

  const throne = createImperialThroneMesh();
  throne.scale.set(1.35, 1.35, 1.35);
  throne.position.set(0, 1.4, -34.8);
  rootGroup.add(throne);
  for (const [cx, cz] of [[-3.1, -33.2], [3.1, -33.2], [-3.1, -36.5], [3.1, -36.5]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.8, 8), goldTrim);
    post.position.set(cx, 3.8, cz);
    post.userData.nonWalkable = true;
    rootGroup.add(post);
  }
  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 4.0), velvetRed);
  canopyRoof.position.set(0, 6.25, -34.85);
  const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.25, 4.2), goldTrim);
  canopyTrim.position.set(0, 6.05, -34.85);
  rootGroup.add(canopyRoof, canopyTrim);
  colliders.push({
    type: 'box',
    minX: origin.x - 2.0,
    maxX: origin.x + 2.0,
    minZ: origin.z - 36.8,
    maxZ: origin.z - 33.4,
    minY: origin.y,
    maxY: origin.y + 6.5,
    label: 'Takhta Kaisar Aurelius',
  });

  // Glowing Golden Sun Rose Window behind Throne
  const sunWin = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), sunGlow);
  sunWin.position.set(0, 9.6, -halfD + 0.42);
  const sunRing = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.35, 8, 24), goldTrim);
  sunRing.position.set(0, 9.6, -halfD + 0.45);
  rootGroup.add(sunWin, sunRing);

  // 2 Rows of Colossal Fluted Marble Pillars with Royal Blue-Gold Silk Banners along Nave (X = ±12.2)
  for (const cx of [-12.2, 12.2]) {
    for (const cz of [-20, -10, 0, 10, 20, 30]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.9), blueMarble);
      base.position.set(cx, 0.35, cz);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.88, h - 1.2, 14), whiteMarble);
      col.position.set(cx, h * 0.5, cz);
      col.userData.nonWalkable = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 2.1), goldTrim);
      cap.position.set(cx, h - 0.5, cz);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.2), bannerBlue);
      banner.position.set(cx + (cx < 0 ? 0.92 : -0.92), 7.5, cz);
      banner.rotation.y = Math.PI / 2;
      rootGroup.add(base, col, cap, banner);
      colliders.push({
        type: 'circle',
        x: origin.x + cx,
        z: origin.z + cz,
        radius: 1.05,
        minY: origin.y,
        maxY: origin.y + h,
        label: 'Pilar Marmer Agung',
      });
    }
  }

  // Twin Royal Banquet Tables flanking Nave on Floor 1 (clear of central carpet & pillars!)
  for (const sideX of [-7.0, 7.0]) {
    const banquet = createImperialBanquetTableMesh();
    banquet.position.set(sideX, 0, 4.0);
    banquet.rotation.y = Math.PI / 2;
    rootGroup.add(banquet);
    for (const cz of [0.5, 4.0, 7.5]) {
      const cIn = createChairMesh(woodMat, 0x1d4ed8);
      cIn.position.set(sideX + (sideX < 0 ? 1.55 : -1.55), 0, cz);
      cIn.rotation.y = sideX < 0 ? -Math.PI / 2 : Math.PI / 2;
      rootGroup.add(cIn);
    }
    colliders.push({
      type: 'box',
      minX: origin.x + sideX - 1.6,
      maxX: origin.x + sideX + 1.6,
      minZ: origin.z - 0.5,
      maxZ: origin.z + 8.5,
      minY: origin.y,
      maxY: origin.y + 2.5,
      label: 'Meja Perjamuan Kerajaan',
    });
  }

  // Floor 1 Side Rooms Partition Walls (Y = 0..5.4, Open Archways from Central Aisles!)
  const balcY = 5.6;
  addPartitionWallWithArch(rootGroup, colliders, origin, 'z', -15.2, -26.0, 14.0, -6.0, 5.2, 0, balcY, 0.55, wallMat, goldTrim, 'Dinding Perpustakaan Kerajaan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'z', 15.2, -26.0, 14.0, -6.0, 5.2, 0, balcY, 0.55, wallMat, goldTrim, 'Dinding Ruang Dewan Bangsawan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -26.0, -halfW + 0.5, -15.2, -21.5, 4.4, 0, balcY, 0.55, wallMat, goldTrim, 'Gerbang Utara Perpustakaan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -26.0, 15.2, halfW - 0.5, 21.5, 4.4, 0, balcY, 0.55, wallMat, goldTrim, 'Gerbang Utara Ruang Dewan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', 14.0, -halfW + 0.5, -15.2, -21.5, 4.8, 0, balcY, 0.55, wallMat, goldTrim, 'Gerbang Selatan Perpustakaan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', 14.0, 15.2, halfW - 0.5, 21.5, 4.8, 0, balcY, 0.55, wallMat, goldTrim, 'Gerbang Selatan Ruang Dewan');

  // FLOOR 1 ROOM A (WEST WING): PERPUSTAKAAN KERAJAAN & ARSIP
  const libRug = createCarpetMesh(9.2, 26.0, 0x1e3a8a, 0xf59e0b);
  libRug.position.set(-21.5, 0, -6.0);
  rootGroup.add(libRug);
  const libColors = [0x991b1b, 0x1d4ed8, 0x059669, 0xd97706];
  for (const lz of [-20.0, -11.0, -2.0, 7.0]) {
    const bc = createLargeBookcase(3.8, 4.6, woodMat, libColors);
    bc.position.set(-halfW + 1.0, 0, lz);
    bc.rotation.y = Math.PI / 2;
    rootGroup.add(bc);
    colliders.push({
      type: 'box',
      minX: origin.x - halfW + 0.3,
      maxX: origin.x - halfW + 1.8,
      minZ: origin.z + lz - 2.1,
      maxZ: origin.z + lz + 2.1,
      minY: origin.y,
      maxY: origin.y + 4.8,
      label: 'Rak Buku Perpustakaan Kerajaan',
    });
  }
  const scholarDesk = createStudyDeskMesh(woodMat, goldTrim);
  scholarDesk.position.set(-21.5, 0, -6.0);
  scholarDesk.rotation.y = Math.PI / 2;
  const scholarChair = createChairMesh(woodMat, 0x1d4ed8);
  scholarChair.position.set(-20.0, 0, -6.0);
  scholarChair.rotation.y = -Math.PI / 2;
  rootGroup.add(scholarDesk, scholarChair);
  colliders.push({
    type: 'box',
    minX: origin.x - 22.8,
    maxX: origin.x - 20.2,
    minZ: origin.z - 8.0,
    maxZ: origin.z - 4.0,
    minY: origin.y,
    maxY: origin.y + 2.4,
    label: 'Meja Baca & Bola Dunia',
  });

  // FLOOR 1 ROOM B (EAST WING): RUANG DEWAN BANGSAWAN (Noble Council Chamber)
  const councilRug = createCarpetMesh(9.2, 26.0, 0x7f1d1d, 0xf59e0b);
  councilRug.position.set(21.5, 0, -6.0);
  rootGroup.add(councilRug);
  const councilTable = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 11.5), woodMat);
  councilTable.position.set(21.5, 0.525, -5.5);
  const councilTopTrim = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.08, 11.65), goldTrim);
  councilTopTrim.position.set(21.5, 1.06, -5.5);
  rootGroup.add(councilTable, councilTopTrim);
  colliders.push({
    type: 'box',
    minX: origin.x + 19.7,
    maxX: origin.x + 23.3,
    minZ: origin.z - 11.4,
    maxZ: origin.z + 0.4,
    minY: origin.y,
    maxY: origin.y + 2.4,
    label: 'Meja Panjang Dewan Bangsawan',
  });
  for (const cz of [-9.5, -5.5, -1.5]) {
    for (const sideSign of [-1, 1]) {
      const nc = createChairMesh(woodMat, 0x991b1b);
      nc.position.set(21.5 + sideSign * 2.3, 0, cz);
      nc.rotation.y = sideSign < 0 ? -Math.PI / 2 : Math.PI / 2;
      rootGroup.add(nc);
    }
  }
  const eastFire = createFireplaceNoLight(wallMat, woodMat);
  eastFire.position.set(halfW - 0.9, 0, -18.5);
  eastFire.rotation.y = -Math.PI / 2;
  rootGroup.add(eastFire);
  colliders.push({
    type: 'box',
    minX: origin.x + halfW - 1.9,
    maxX: origin.x + halfW,
    minZ: origin.z - 20.3,
    maxZ: origin.z - 16.7,
    minY: origin.y,
    maxY: origin.y + 5.2,
    label: 'Perapian Marmer Ruang Dewan',
  });
  for (const pz of [-10.0, -1.0, 8.0]) {
    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.8, 2.2), goldTrim);
    pFrame.position.set(halfW - 0.48, 3.0, pz);
    const pArt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 1.75), bannerBlue);
    pArt.position.set(halfW - 0.5, 3.0, pz);
    rootGroup.add(pFrame, pArt);
  }

  // FLOOR 2 (balcY = 5.6): WALKABLE U-GALLERY BALCONIES + ROYAL BEDCHAMBER & CROWN TREASURY
  addWalkableSlab(rootGroup, 13.2, 0.45, 66.0, -21.4, balcY - 0.225, -5.0, whiteMarble, 'Balkon Lantai 2 Sayap Barat');
  addWalkableSlab(rootGroup, 13.2, 0.45, 66.0, 21.4, balcY - 0.225, -5.0, whiteMarble, 'Balkon Lantai 2 Sayap Timur');
  addWalkableSlab(rootGroup, 29.6, 0.45, 9.6, 0, balcY - 0.225, -33.2, whiteMarble, 'Balkon Lantai 2 Sayap Utara');

  // Balcony Protective Railings & Height-Aware Colliders (Y >= balcY - 0.3)
  for (const bx of [-15.0, 15.0]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.05, 56.5), goldTrim);
    rail.position.set(bx, balcY + 0.55, 0.2);
    rail.userData.nonWalkable = true;
    rootGroup.add(rail);
    colliders.push({
      type: 'box',
      minX: origin.x + bx - 0.25,
      maxX: origin.x + bx + 0.25,
      minZ: origin.z - 28.0,
      maxZ: origin.z + 28.5,
      minY: origin.y + balcY - 0.4,
      maxY: origin.y + balcY + 3.0,
      label: 'Pagar Balkon Istana',
    });
  }
  const northRail = new THREE.Mesh(new THREE.BoxGeometry(29.8, 1.05, 0.35), goldTrim);
  northRail.position.set(0, balcY + 0.55, -28.4);
  northRail.userData.nonWalkable = true;
  rootGroup.add(northRail);
  colliders.push({
    type: 'box',
    minX: origin.x - 15.0,
    maxX: origin.x + 15.0,
    minZ: origin.z - 28.7,
    maxZ: origin.z - 28.1,
    minY: origin.y + balcY - 0.4,
    maxY: origin.y + balcY + 3.0,
    label: 'Pagar Balkon Utara Istana',
  });

  // Twin Wide Marble Staircases Ascending from Ground (Y=0, Z=35) to Balcony Decks (Y=5.6, Z=23.5) with Smooth Ramps
  addStaircase(rootGroup, 4.6, 16, 0, balcY, 35.0, 23.5, -21.5, whiteMarble, goldTrim, blueMarble);
  addStaircase(rootGroup, 4.6, 16, 0, balcY, 35.0, 23.5, 21.5, whiteMarble, goldTrim, blueMarble);

  // Floor 2 Side Luxury Room Partitions (Y = balcY..balcY + 6.4, Open Arch from Front Gallery Z = -1 & Overlook!)
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -1.0, -halfW + 0.5, -15.2, -21.5, 4.8, balcY, 6.2, 0.5, wallMat, goldTrim, 'Gerbang Kamar Tidur Kaisar');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -25.0, -halfW + 0.5, -15.2, -21.5, 4.4, balcY, 6.2, 0.5, wallMat, goldTrim, 'Gerbang Belakang Kamar Kaisar');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -1.0, 15.2, halfW - 0.5, 21.5, 4.8, balcY, 6.2, 0.5, wallMat, goldTrim, 'Gerbang Galeri Pusaka');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -25.0, 15.2, halfW - 0.5, 21.5, 4.4, balcY, 6.2, 0.5, wallMat, goldTrim, 'Gerbang Belakang Galeri Pusaka');

  // FLOOR 2 ROOM A (WEST UPPER): KAMAR TIDUR UTAMA KAISAR
  const bedRug = createCarpetMesh(8.2, 16.0, 0x991b1b, 0xf59e0b);
  bedRug.position.set(-21.5, balcY, -13.0);
  rootGroup.add(bedRug);
  const royalBed = createCanopyBedMesh(woodMat, 0x991b1b, goldTrim);
  royalBed.position.set(-22.8, balcY, -16.5);
  rootGroup.add(royalBed);
  colliders.push({
    type: 'box',
    minX: origin.x - 24.8,
    maxX: origin.x - 20.8,
    minZ: origin.z - 19.0,
    maxZ: origin.z - 14.0,
    minY: origin.y + balcY,
    maxY: origin.y + balcY + 4.0,
    label: 'Ranjang Kanopi Kaisar',
  });
  const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.4, 3.6), woodMat);
  wardrobe.position.set(-halfW + 1.2, balcY + 2.2, -11.0);
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 1.8), goldTrim);
  mirrorFrame.position.set(-halfW + 0.55, balcY + 2.2, -6.5);
  const deskF2 = createStudyDeskMesh(woodMat, goldTrim);
  deskF2.position.set(-21.2, balcY, -6.2);
  const chairF2 = createChairMesh(woodMat, 0x991b1b);
  chairF2.position.set(-21.2, balcY, -4.7);
  chairF2.rotation.y = Math.PI;
  rootGroup.add(wardrobe, mirrorFrame, deskF2, chairF2);
  colliders.push(
    {
      type: 'box',
      minX: origin.x - halfW + 0.3,
      maxX: origin.x - halfW + 2.1,
      minZ: origin.z - 13.0,
      maxZ: origin.z - 9.0,
      minY: origin.y + balcY,
      maxY: origin.y + balcY + 4.6,
      label: 'Lemari Pakaian Kerajaan',
    },
    {
      type: 'box',
      minX: origin.x - 23.0,
      maxX: origin.x - 19.4,
      minZ: origin.z - 7.2,
      maxZ: origin.z - 5.2,
      minY: origin.y + balcY,
      maxY: origin.y + balcY + 2.4,
      label: 'Meja Tulis Pribadi',
    }
  );

  // FLOOR 2 ROOM B (EAST UPPER): GALERI PUSAKA & HARTA TAHTA
  const treasRug = createCarpetMesh(8.2, 16.0, 0x1d4ed8, 0xf59e0b);
  treasRug.position.set(21.5, balcY, -13.0);
  rootGroup.add(treasRug);
  for (const az of [-8.0, -17.5]) {
    const armor = createArmorStandMesh(steelMat, goldTrim, whiteMarble);
    armor.position.set(18.2, balcY, az);
    armor.rotation.y = Math.PI / 2;
    const casePed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 2.2), blueMarble);
    casePed.position.set(24.8, balcY + 0.65, az);
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.22), goldTrim);
    swordBlade.position.set(24.8, balcY + 2.1, az);
    rootGroup.add(armor, casePed, swordBlade);
    colliders.push(
      {
        type: 'circle',
        x: origin.x + 18.2,
        z: origin.z + az,
        radius: 0.9,
        minY: origin.y + balcY,
        maxY: origin.y + balcY + 3.2,
        label: 'Manekin Baju Zirah Kerajaan',
      },
      {
        type: 'box',
        minX: origin.x + 23.9,
        maxX: origin.x + 25.7,
        minZ: origin.z + az - 1.3,
        maxZ: origin.z + az + 1.3,
        minY: origin.y + balcY,
        maxY: origin.y + balcY + 3.0,
        label: 'Etalase Pusaka Kerajaan',
      }
    );
  }

  // 3 Colossal Crystal Chandeliers Hanging down the Grand Hall
  for (const cz of [-18, 0, 18]) {
    const ch = createChandelierGroup(2.8, goldTrim, 0xfffbeb);
    ch.position.set(0, h - 0.2, cz);
    rootGroup.add(ch);
  }

  // Knight Honor Guard Statues flanking Dais
  for (const [kx, rot] of [[-7.2, Math.PI / 4], [7.2, -Math.PI / 4]] as [number, number][]) {
    const ks = createImperialKnightStatueMesh();
    ks.scale.setScalar(1.3);
    ks.position.set(kx, 0, -22.0);
    ks.rotation.y = rot;
    rootGroup.add(ks);
    colliders.push({
      type: 'circle',
      x: origin.x + kx,
      z: origin.z - 22.0,
      radius: 1.2,
      minY: origin.y,
      maxY: origin.y + 4.8,
      label: 'Patung Ksatria Pengawal',
    });
  }

  // Royal Treasury Chest on Floor 2 Crown Treasury + Preserved Emperor & Chamberlain NPCs
  const chest = createChestProp('chest_astraea_palace', 21.8, balcY, -21.5, origin, colliders);
  rootGroup.add(chest.group);

  const emperorNPC = createCustomNPCMesh('emperor');
  emperorNPC.position.set(0, 1.4, -31.0);
  emperorNPC.rotation.y = 0;
  rootGroup.add(emperorNPC);

  const stewardNPC = createCustomNPCMesh('marshal');
  stewardNPC.position.set(5.5, 0, 16.0);
  stewardNPC.rotation.y = -Math.PI / 4;
  rootGroup.add(stewardNPC);

  const room: InteriorRoom = {
    id: 'astraea_imperial_palace',
    name: 'Istana Kaisar Astraea',
    exteriorName: 'Ibukota Kerajaan Emas Astraea',
    rootGroup,
    origin,
    baseFloorY: origin.y,
    minFloorY: origin.y,
    maxCeilingY: origin.y + h,
    dimensions: { width: w, depth: d, height: h },
    colliders,
    walkableMeshes: [],
    npcs: [
      {
        id: 'astraea_indoor_emperor',
        name: 'Emperor Aurelius',
        nameId: 'Paduka Kaisar Aurelius Astraea',
        role: 'Kaisar Kekaisaran Astraea',
        group: emperorNPC,
        position: [origin.x, origin.y + 1.4, origin.z - 31.0],
        dialogueId: 'emperor_aurelius',
        icon: '👑',
      },
      {
        id: 'astraea_indoor_steward',
        name: 'Royal Chamberlain Vance',
        nameId: 'Kepala Rumah Tangga Istana',
        role: 'Penasihat Istana Kaisar',
        group: stewardNPC,
        position: [origin.x + 5.5, origin.y, origin.z + 16.0],
        dialogueId: 'marshal_vane',
        icon: '📜',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xfef3c7,
    ambientGroundHex: 0x475569,
    ambientIntensity: 1.05,
    hemiIntensity: 1.25,
    dirIntensity: 1.08,
    bgHex: 0x1e293b,
    fogHex: 0x1e293b,
    animatedParts: [],
    getFallbackFloorY: (_wx, wy) => (wy - origin.y >= 4.2 ? origin.y + balcY : origin.y),
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: (wy) =>
      wy - origin.y >= 4.2
        ? 'Lantai 2: Kamar Kaisar & Galeri Pusaka'
        : 'Lantai 1: Singgasana, Perpustakaan & Dewan',
    clampInsideWalls: (wx, wz, r) => ({
      x: THREE.MathUtils.clamp(wx, origin.x - halfW + 0.9 + r, origin.x + halfW - 0.9 - r),
      z: THREE.MathUtils.clamp(wz, origin.z - halfD + 0.9 + r, origin.z + halfD - 0.9 - r),
    }),
    clampCameraPosition: (camPos) => clampShellRoomCamera(room, camPos),
  };

  finalizeInteriorRoom(room);

  return {
    room,
    exitPos: { x: origin.x, y: origin.y, z: origin.z + halfD - 2.0 },
    spawnInPos: { x: origin.x, y: origin.y + 0.05, z: origin.z + halfD - 4.8, rotationY: Math.PI },
  };
}

/** 3D. TAVERN & TOKO IBUKOTA ASTRAEA (26 x 22 x 7.2) */
function createAstraeaTavernInterior(origin: Transform): { room: InteriorRoom; exitPos: Transform; spawnInPos: Transform } {
  const w = 26;
  const d = 22;
  const h = 11.5;
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x5c3d28, flatShading: true });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xe7dfd5, flatShading: true });
  const timberMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0x2c1b12, flatShading: true });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 });

  const { rootGroup, colliders, halfW, halfD } = buildShellRoom(
    'astraea_tavern',
    'Tavern & Toko Ibukota Astraea',
    'Ibukota Kerajaan Emas Astraea',
    origin,
    w,
    d,
    h,
    floorMat,
    wallMat,
    ceilMat,
    3.2
  );

  // Timber Wall Pillars & Ceiling Rafters
  for (let z = -halfD + 4; z <= halfD - 4; z += 5.5) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 0.38, 0.45), timberMat);
    beam.position.set(0, h - 0.2, z);
    beam.userData.nonWalkable = true;
    rootGroup.add(beam);
  }

  // Long Curved Bar Counter on North Side
  const barBody = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.25, 1.5), timberMat);
  barBody.position.set(0, 0.62, -6.2);
  const barSide = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.25, 4.2), timberMat);
  barSide.position.set(-4.5, 0.62, -8.2);
  rootGroup.add(barBody, barSide);
  colliders.push({
    type: 'box',
    minX: origin.x - 5.4,
    maxX: origin.x + 5.4,
    minZ: origin.z - 9.2,
    maxZ: origin.z - 5.3,
    label: 'Meja Bar Tavern Astraea',
  });

  // Giant Wine & Ale Barrels stacked behind bar
  for (let b = -3.6; b <= 3.6; b += 1.8) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 1.35, 12), timberMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(b, 0.85, -halfD + 1.2);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 12), brassMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(b, 0.85, -halfD + 1.2);
    rootGroup.add(barrel, band);
  }

  // Potion & Merchandise Shelves along East Wall (Shop Section!)
  const potColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
  for (const sz of [-5.5, 0.5, 5.5]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 3.8), timberMat);
    shelf.position.set(halfW - 1.1, 1.6, sz);
    rootGroup.add(shelf);
    for (let r = 0; r < 3; r++) {
      for (let p = -1; p <= 1; p++) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, 0.36, 8),
          new THREE.MeshBasicMaterial({ color: potColors[(r + p + 3) % potColors.length] })
        );
        bottle.position.set(halfW - 1.3, 0.8 + r * 0.9, sz + p * 0.95);
        rootGroup.add(bottle);
      }
    }
    colliders.push({
      type: 'box',
      minX: origin.x + halfW - 1.8,
      maxX: origin.x + halfW,
      minZ: origin.z + sz - 2.0,
      maxZ: origin.z + sz + 2.0,
      label: 'Rak Barang & Ramuan Toko',
    });
  }

  // Warm Dining Tables with Glowing Candles
  for (const [tx, tz] of [[-7.0, 2.0], [5.5, 2.0], [-7.0, -2.5]]) {
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.14, 12), timberMat);
    tbl.position.set(tx, 0.95, tz);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 0.9, 8), timberMat);
    leg.position.set(tx, 0.45, tz);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    candle.position.set(tx, 1.14, tz);
    rootGroup.add(tbl, leg, candle);
    colliders.push({ type: 'circle', x: origin.x + tx, z: origin.z + tz, radius: 1.5, label: 'Meja Tamu Tavern' });
  }

  const rug = createCarpetMesh(6.0, 8.5, 0x7f1d1d, 0xfbbf24);
  rug.position.set(0, 0, 2.0);
  rootGroup.add(rug);

  const fire = createFireplaceNoLight(new THREE.MeshLambertMaterial({ color: 0x475569 }), timberMat);
  fire.position.set(-halfW + 1.1, 0, 0);
  fire.rotation.y = Math.PI / 2;
  rootGroup.add(fire);
  colliders.push({
    type: 'box',
    minX: origin.x - halfW,
    maxX: origin.x - halfW + 1.9,
    minZ: origin.z - 1.8,
    maxZ: origin.z + 1.8,
    label: 'Perapian Tavern',
  });

  const ch = createChandelierGroup(1.7, brassMat, 0xffd54f);
  ch.position.set(0, h - 0.2, 0.5);
  rootGroup.add(ch);

  const barkeep = createCustomNPCMesh('alchemist');
  barkeep.position.set(0, 0, -7.8);
  barkeep.rotation.y = 0;
  rootGroup.add(barkeep);

  const chest = createChestProp('chest_astraea_tavern', 9.2, 0, -8.5, origin, colliders);
  rootGroup.add(chest.group);

  const room: InteriorRoom = {
    id: 'astraea_tavern',
    name: 'Tavern & Toko Ibukota Astraea',
    exteriorName: 'Ibukota Kerajaan Emas Astraea',
    rootGroup,
    origin,
    baseFloorY: origin.y,
    minFloorY: origin.y,
    maxCeilingY: origin.y + h,
    dimensions: { width: w, depth: d, height: h },
    colliders,
    walkableMeshes: [],
    npcs: [
      {
        id: 'astraea_tavern_keeper',
        name: 'Proprietor Selene',
        nameId: 'Pemilik Tavern & Toko Ramuan Ibukota',
        role: 'Saudagar & Pengelola Tavern',
        group: barkeep,
        position: [origin.x, origin.y, origin.z - 7.8],
        dialogueId: 'merchant_lyra',
        icon: '🍺',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xfef3c7,
    ambientGroundHex: 0x57534e,
    ambientIntensity: 0.95,
    hemiIntensity: 1.15,
    dirIntensity: 1.0,
    bgHex: 0x261a11,
    fogHex: 0x261a11,
    animatedParts: [],
    getFallbackFloorY: () => origin.y,
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: () => 'Lantai 1: Tavern & Toko Ibukota',
    clampInsideWalls: (wx, wz, r) => ({
      x: THREE.MathUtils.clamp(wx, origin.x - halfW + 0.8 + r, origin.x + halfW - 0.8 - r),
      z: THREE.MathUtils.clamp(wz, origin.z - halfD + 0.8 + r, origin.z + halfD - 0.8 - r),
    }),
    clampCameraPosition: (camPos) => clampShellRoomCamera(room, camPos),
  };

  finalizeInteriorRoom(room);

  return {
    room,
    exitPos: { x: origin.x, y: origin.y, z: origin.z + halfD - 1.6 },
    spawnInPos: { x: origin.x, y: origin.y + 0.05, z: origin.z + halfD - 3.6, rotationY: Math.PI },
  };
}

/** 3E. ISTANA SULTAN SOLARIA (56 x 76 x 16 — MARMER GADING, EMAS, MOSAIK TOSKA, KOLAM REFLEKSI, LENGKUNGAN ISLAM) */
function createSolariaSultanPalaceInterior(origin: Transform): { room: InteriorRoom; exitPos: Transform; spawnInPos: Transform } {
  const w = 56;
  const d = 74;
  const h = 21.0;
  const galY = 5.6;
  const ivoryMarble = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.24, metalness: 0.06 });
  const warmSandstone = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.45 });
  const turquoiseTile = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.22, metalness: 0.25 });
  const lapisAccent = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.28, metalness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.18, metalness: 0.9 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b3e1b, flatShading: true });
  const silkRed = new THREE.MeshLambertMaterial({ color: 0x991b1b, side: THREE.DoubleSide });
  const silkTeal = new THREE.MeshLambertMaterial({ color: 0x0f766e, side: THREE.DoubleSide });
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.08,
    metalness: 0.25,
    transparent: true,
    opacity: 0.85,
  });
  const lanternGlow = new THREE.MeshBasicMaterial({ color: 0xfde047 });

  const { rootGroup, colliders, halfW, halfD } = buildShellRoom(
    'solaria_sultan_palace',
    'Istana Sultan Solaria',
    'Kota Kerajaan Padang Pasir Solaria',
    origin,
    w,
    d,
    h,
    ivoryMarble,
    warmSandstone,
    ceilMat,
    5.6
  );

  // Exotic Turquoise Mosaic Border around Central Reflecting Pool (Z = -5.5..17.5)
  const mosaicFrame = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.04, 26.2), turquoiseTile);
  mosaicFrame.position.set(0, 0.02, 6.0);
  mosaicFrame.userData.nonWalkable = true;
  rootGroup.add(mosaicFrame);

  // Sleek Turquoise Reflecting Pool (Width 6.2 x Length 23.0) with Low Gold-Marble Curbs & Arched Central Bridge
  const poolBasin = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.28, 23.4), goldMat);
  poolBasin.position.set(0, 0.14, 6.0);
  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 22.8), poolWaterMat);
  poolWater.rotation.x = -Math.PI / 2;
  poolWater.position.set(0, 0.30, 6.0);
  rootGroup.add(poolBasin, poolWater);

  // Walkable Marble Bridge crossing Pool Center (Z = 4.5..7.5)
  addWalkableSlab(rootGroup, 7.6, 0.36, 3.0, 0, 0.22, 6.0, ivoryMarble, 'Jembatan Marmer Kolam Refleksi');
  for (const rz of [4.65, 7.35]) {
    const bRail = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.62, 0.16), goldMat);
    bRail.position.set(0, 0.7, rz);
    bRail.userData.nonWalkable = true;
    rootGroup.add(bRail);
  }
  // Pool colliders split strictly North & South of center bridge so walking aisles & bridge is effortless
  colliders.push(
    {
      type: 'box',
      minX: origin.x - 3.2,
      maxX: origin.x + 3.2,
      minZ: origin.z - 5.6,
      maxZ: origin.z + 4.3,
      minY: origin.y,
      maxY: origin.y + 1.5,
      label: 'Kolam Refleksi Utara',
    },
    {
      type: 'box',
      minX: origin.x - 3.2,
      maxX: origin.x + 3.2,
      minZ: origin.z + 7.7,
      maxZ: origin.z + 17.6,
      minY: origin.y,
      maxY: origin.y + 1.5,
      label: 'Kolam Refleksi Selatan',
    }
  );

  // Clean Non-Overlapping Persian Carpets flanking Pool & Throne Procession
  const carpetNorth = createCarpetMesh(7.6, 13.5, 0x991b1b, 0xfbbf24);
  carpetNorth.position.set(0, 0, -14.2);
  const carpetEast = createCarpetMesh(4.0, 22.0, 0x0f766e, 0xfbbf24);
  carpetEast.position.set(8.2, 0, 6.0);
  const carpetWest = createCarpetMesh(4.0, 22.0, 0x991b1b, 0xfbbf24);
  carpetWest.position.set(-8.2, 0, 6.0);
  rootGroup.add(carpetNorth, carpetEast, carpetWest);

  // Ornamental Desert Palm Planters & Embossed Golden Urns bordering Pool & Aisle
  for (const [px, pz] of [[-5.4, -5.0], [5.4, -5.0], [-5.4, 17.0], [5.4, 17.0]]) {
    const palm = createPalmPlanterMesh(ivoryMarble);
    palm.position.set(px, 0, pz);
    rootGroup.add(palm);
    colliders.push({
      type: 'circle',
      x: origin.x + px,
      z: origin.z + pz,
      radius: 0.85,
      minY: origin.y,
      maxY: origin.y + 4.2,
      label: 'Pot Palem Istana',
    });
  }
  for (const ux of [-5.2, 5.2]) {
    const urn = createGoldenUrnMesh(goldMat);
    urn.position.set(ux, 0, 1.5);
    rootGroup.add(urn);
    colliders.push({
      type: 'circle',
      x: origin.x + ux,
      z: origin.z + 1.5,
      radius: 0.72,
      minY: origin.y,
      maxY: origin.y + 2.4,
      label: 'Guci Emas Kebesaran',
    });
  }

  // High Exotic Turquoise-and-Gold Arabian Onion Dome Vault overhead
  const domeHalo = new THREE.Mesh(new THREE.TorusGeometry(15.0, 0.85, 10, 32), goldMat);
  domeHalo.rotation.x = Math.PI / 2;
  domeHalo.position.set(0, h - 0.35, -2.0);
  const arabDome = new THREE.Mesh(
    new THREE.SphereGeometry(15.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x0f766e, side: THREE.BackSide })
  );
  arabDome.position.set(0, h - 0.3, -2.0);
  arabDome.scale.set(1, 0.45, 1);
  rootGroup.add(domeHalo, arabDome);

  // Stepped Sultan Dais & Ornate Canopy Golden Throne at North End
  addStaircase(rootGroup, 15.0, 4, 0, 1.5, -21.5, -25.5, 0, ivoryMarble, goldMat, goldMat);
  addWalkableSlab(rootGroup, 22.0, 1.5, 12.0, 0, 0.75, -31.5, ivoryMarble, 'Podium Singgasana Sultan');

  const sultanThrone = createImperialThroneMesh();
  sultanThrone.scale.set(1.4, 1.35, 1.4);
  sultanThrone.position.set(0, 1.5, -33.5);
  rootGroup.add(sultanThrone);
  for (const [cx, cz] of [[-3.3, -31.8], [3.3, -31.8], [-3.3, -35.2], [3.3, -35.2]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 4.9, 8), goldMat);
    p.position.set(cx, 3.95, cz);
    p.userData.nonWalkable = true;
    rootGroup.add(p);
  }
  const sultanCanopy = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.36, 4.0), silkTeal);
  sultanCanopy.position.set(0, 6.4, -33.5);
  const sultanCanopyTrim = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.24, 4.2), goldMat);
  sultanCanopyTrim.position.set(0, 6.2, -33.5);
  rootGroup.add(sultanCanopy, sultanCanopyTrim);
  colliders.push({
    type: 'box',
    minX: origin.x - 2.0,
    maxX: origin.x + 2.0,
    minZ: origin.z - 35.5,
    maxZ: origin.z - 32.0,
    minY: origin.y,
    maxY: origin.y + 6.8,
    label: 'Singgasana Emas Sultan Malik',
  });

  // Colonnade with True Sculpted Ivory Marble & Gold Pointed Islamic Archways (no awkward diagonal sticks!)
  for (const ax of [-12.6, 12.6]) {
    const colZs = [-20, -10, 0, 10, 20, 30];
    colZs.forEach((cz, idx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, h - 1.5, 12), ivoryMarble);
      col.position.set(ax, h * 0.5, cz);
      col.userData.nonWalkable = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.68, 0.85, 8), turquoiseTile);
      cap.position.set(ax, h - 1.5, cz);
      rootGroup.add(col, cap);
      colliders.push({
        type: 'circle',
        x: origin.x + ax,
        z: origin.z + cz,
        radius: 0.92,
        minY: origin.y,
        maxY: origin.y + h,
        label: 'Pilar Lengkung Istana Sultan',
      });

      if (idx < colZs.length - 1) {
        const midZ = (cz + colZs[idx + 1]) * 0.5;
        const arch = createArabicArchGroup(10.0, 5.8, warmSandstone, lapisAccent);
        arch.position.set(ax, 0, midZ);
        rootGroup.add(arch);
      }
    });
  }

  // Hanging Golden Arabesque Moroccan Lanterns down Nave & Over Pool
  for (const lz of [-14, -4, 6, 16, 26]) {
    for (const lx of [-6.8, 6.8]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 5), goldMat);
      chain.position.set(lx, h - 2.1, lz);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.62), lanternGlow);
      lamp.position.set(lx, h - 4.2, lz);
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 1.05, 6, 1, true), goldMat);
      cage.position.set(lx, h - 4.2, lz);
      rootGroup.add(chain, lamp, cage);
    }
  }

  // Floor 1 Side Luxury Wing Partitions (X = ±15.4, Open Arch Doorways at Z = -6.0)
  addPartitionWallWithArch(rootGroup, colliders, origin, 'z', -15.4, -26.0, 14.0, -6.0, 5.2, 0, galY, 0.55, warmSandstone, goldMat, 'Dinding Ruang Majlis Sultan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'z', 15.4, -26.0, 14.0, -6.0, 5.2, 0, galY, 0.55, warmSandstone, goldMat, 'Dinding Gudang Harta Karun Gurun');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -26.0, -halfW + 0.5, -15.4, -21.5, 4.4, 0, galY, 0.55, warmSandstone, goldMat, 'Gerbang Utara Majlis');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -26.0, 15.4, halfW - 0.5, 21.5, 4.4, 0, galY, 0.55, warmSandstone, goldMat, 'Gerbang Utara Harta Gurun');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', 14.0, -halfW + 0.5, -15.4, -21.5, 4.8, 0, galY, 0.55, warmSandstone, goldMat, 'Gerbang Selatan Majlis');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', 14.0, 15.4, halfW - 0.5, 21.5, 4.8, 0, galY, 0.55, warmSandstone, goldMat, 'Gerbang Selatan Harta Gurun');

  // FLOOR 1 ROOM A (WEST WING): RUANG MAJLIS & JAMUAN SULTAN
  const majlisRug = createCarpetMesh(9.4, 24.0, 0x991b1b, 0xfbbf24);
  majlisRug.position.set(-21.5, 0, -6.0);
  rootGroup.add(majlisRug);
  // U-Shaped Silk Floor Divans around Ornate Low Brass Tea Tray Table
  const teaTableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.9, 0.42, 12), goldMat);
  teaTableTop.position.set(-21.5, 0.55, -6.0);
  const teaPot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), lapisAccent);
  teaPot.position.set(-21.5, 0.92, -6.0);
  rootGroup.add(teaTableTop, teaPot);
  colliders.push({
    type: 'circle',
    x: origin.x - 21.5,
    z: origin.z - 6.0,
    radius: 2.25,
    minY: origin.y,
    maxY: origin.y + 1.8,
    label: 'Meja Teh & Jamuan Sultan',
  });
  for (const [dx, dz, bw, bd] of [[-21.5, -11.2, 7.6, 1.8], [-25.6, -6.0, 1.8, 9.2], [-21.5, -0.8, 7.6, 1.8]] as [number, number, number, number][]) {
    const divanBase = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.48, bd), woodMat);
    divanBase.position.set(dx, 0.24, dz);
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.2, 0.34, bd - 0.2), silkTeal);
    cushion.position.set(dx, 0.62, dz);
    rootGroup.add(divanBase, cushion);
    colliders.push({
      type: 'box',
      minX: origin.x + dx - bw * 0.5,
      maxX: origin.x + dx + bw * 0.5,
      minZ: origin.z + dz - bd * 0.5,
      maxZ: origin.z + dz + bd * 0.5,
      minY: origin.y,
      maxY: origin.y + 1.6,
      label: 'Sofa Bantal Sutra Majlis',
    });
  }

  // FLOOR 1 ROOM B (EAST WING): GUDANG HARTA KARUN GURUN (Desert Treasury)
  const treasDesertRug = createCarpetMesh(9.4, 24.0, 0x0f766e, 0xfbbf24);
  treasDesertRug.position.set(21.5, 0, -6.0);
  rootGroup.add(treasDesertRug);
  for (const tz of [-13.5, -6.0, 1.5]) {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 2.2), ivoryMarble);
    ped.position.set(21.5, 0.45, tz);
    const urn = createGoldenUrnMesh(goldMat);
    urn.position.set(21.5, 0.9, tz);
    rootGroup.add(ped, urn);
    colliders.push({
      type: 'box',
      minX: origin.x + 20.3,
      maxX: origin.x + 22.7,
      minZ: origin.z + tz - 1.2,
      maxZ: origin.z + tz + 1.2,
      minY: origin.y,
      maxY: origin.y + 3.2,
      label: 'Guci Emas & Permata Gurun',
    });
  }
  // Rolled Silk Carpet Stack along East Wall
  for (let i = 0; i < 4; i++) {
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 3.4, 10),
      i % 2 === 0 ? silkRed : lapisAccent
    );
    roll.rotation.x = Math.PI / 2;
    roll.position.set(halfW - 1.2 - (i % 2) * 0.72, 0.4 + Math.floor(i / 2) * 0.65, -10.5);
    rootGroup.add(roll);
  }
  colliders.push({
    type: 'box',
    minX: origin.x + halfW - 2.2,
    maxX: origin.x + halfW - 0.5,
    minZ: origin.z - 12.4,
    maxZ: origin.z - 8.6,
    minY: origin.y,
    maxY: origin.y + 2.0,
    label: 'Gulungan Karpet Sutra Mewah',
  });

  // FLOOR 2 (galY = 5.6): UPPER MEZZANINE BALCONIES + SULTAN BEDCHAMBER & DESERT OBSERVATORY
  addWalkableSlab(rootGroup, 13.0, 0.45, 64.0, -21.5, galY - 0.225, -4.0, warmSandstone, 'Galeri Atas Barat Istana Sultan');
  addWalkableSlab(rootGroup, 13.0, 0.45, 64.0, 21.5, galY - 0.225, -4.0, warmSandstone, 'Galeri Atas Timur Istana Sultan');
  addWalkableSlab(rootGroup, 30.0, 0.45, 9.6, 0, galY - 0.225, -32.2, warmSandstone, 'Galeri Atas Utara Istana Sultan');

  for (const gx of [-15.2, 15.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 56.0), goldMat);
    rail.position.set(gx, galY + 0.5, 0.5);
    rail.userData.nonWalkable = true;
    rootGroup.add(rail);
    colliders.push({
      type: 'box',
      minX: origin.x + gx - 0.25,
      maxX: origin.x + gx + 0.25,
      minZ: origin.z - 27.5,
      maxZ: origin.z + 28.5,
      minY: origin.y + galY - 0.4,
      maxY: origin.y + galY + 3.0,
      label: 'Pagar Galeri Atas Istana',
    });
  }
  const northGalRail = new THREE.Mesh(new THREE.BoxGeometry(30.4, 1.0, 0.35), goldMat);
  northGalRail.position.set(0, galY + 0.5, -27.4);
  northGalRail.userData.nonWalkable = true;
  rootGroup.add(northGalRail);
  colliders.push({
    type: 'box',
    minX: origin.x - 15.2,
    maxX: origin.x + 15.2,
    minZ: origin.z - 27.7,
    maxZ: origin.z - 27.1,
    minY: origin.y + galY - 0.4,
    maxY: origin.y + galY + 3.0,
    label: 'Pagar Galeri Utara Istana',
  });

  // Twin Marble Staircases ascending from Ground (Y=0, Z=34) to Gallery (Y=5.6, Z=22.5) with Smooth Ramps
  addStaircase(rootGroup, 4.6, 16, 0, galY, 34.0, 22.5, -21.5, ivoryMarble, goldMat, turquoiseTile);
  addStaircase(rootGroup, 4.6, 16, 0, galY, 34.0, 22.5, 21.5, ivoryMarble, goldMat, turquoiseTile);

  // Floor 2 Upper Luxury Chambers Partitions (Y = galY..galY + 6.4)
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -1.0, -halfW + 0.5, -15.4, -21.5, 4.8, galY, 6.2, 0.5, warmSandstone, goldMat, 'Gerbang Kamar Tidur Sultan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -24.5, -halfW + 0.5, -15.4, -21.5, 4.4, galY, 6.2, 0.5, warmSandstone, goldMat, 'Gerbang Belakang Kamar Sultan');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -1.0, 15.4, halfW - 0.5, 21.5, 4.8, galY, 6.2, 0.5, warmSandstone, goldMat, 'Gerbang Observatorium Gurun');
  addPartitionWallWithArch(rootGroup, colliders, origin, 'x', -24.5, 15.4, halfW - 0.5, 21.5, 4.4, galY, 6.2, 0.5, warmSandstone, goldMat, 'Gerbang Belakang Observatorium');

  // FLOOR 2 ROOM A (WEST UPPER): KAMAR TIDUR SULTAN
  const sultanBedRug = createCarpetMesh(8.2, 16.0, 0x0f766e, 0xfbbf24);
  sultanBedRug.position.set(-21.5, galY, -12.5);
  rootGroup.add(sultanBedRug);
  const sultanBed = createCanopyBedMesh(woodMat, 0x0d9488, goldMat);
  sultanBed.position.set(-22.5, galY, -16.0);
  const sultanDesk = createStudyDeskMesh(woodMat, goldMat);
  sultanDesk.position.set(-21.5, galY, -6.2);
  const sultanChair = createChairMesh(woodMat, 0x0d9488);
  sultanChair.position.set(-21.5, galY, -4.6);
  sultanChair.rotation.y = Math.PI;
  rootGroup.add(sultanBed, sultanDesk, sultanChair);
  colliders.push(
    {
      type: 'box',
      minX: origin.x - 24.5,
      maxX: origin.x - 20.5,
      minZ: origin.z - 18.5,
      maxZ: origin.z - 13.5,
      minY: origin.y + galY,
      maxY: origin.y + galY + 4.0,
      label: 'Ranjang Sutra Sultan',
    },
    {
      type: 'box',
      minX: origin.x - 23.3,
      maxX: origin.x - 19.7,
      minZ: origin.z - 7.2,
      maxZ: origin.z - 5.2,
      minY: origin.y + galY,
      maxY: origin.y + galY + 2.4,
      label: 'Meja Rias Sultan',
    }
  );

  // FLOOR 2 ROOM B (EAST UPPER): OBSERVATORIUM & PERPUSTAKAAN GURUN
  const obsRug = createCarpetMesh(8.2, 16.0, 0x991b1b, 0xfbbf24);
  obsRug.position.set(21.5, galY, -12.5);
  rootGroup.add(obsRug);
  const astroBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 1.1, 10), ivoryMarble);
  astroBase.position.set(21.2, galY + 0.55, -12.0);
  const astroRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 8, 24), goldMat);
  astroRing1.position.set(21.2, galY + 2.5, -12.0);
  const astroRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 8, 20), lapisAccent);
  astroRing2.position.set(21.2, galY + 2.5, -12.0);
  astroRing2.rotation.x = Math.PI / 3;
  rootGroup.add(astroBase, astroRing1, astroRing2);
  colliders.push({
    type: 'circle',
    x: origin.x + 21.2,
    z: origin.z - 12.0,
    radius: 1.5,
    minY: origin.y + galY,
    maxY: origin.y + galY + 4.5,
    label: 'Astrolab Bintang Gurun',
  });
  for (const sz of [-8.0, -17.0]) {
    const desertShelf = createLargeBookcase(3.4, 4.4, woodMat, [0xd97706, 0x0d9488, 0x991b1b]);
    desertShelf.position.set(halfW - 1.0, galY, sz);
    desertShelf.rotation.y = -Math.PI / 2;
    rootGroup.add(desertShelf);
    colliders.push({
      type: 'box',
      minX: origin.x + halfW - 1.8,
      maxX: origin.x + halfW - 0.2,
      minZ: origin.z + sz - 1.9,
      maxZ: origin.z + sz + 1.9,
      minY: origin.y + galY,
      maxY: origin.y + galY + 4.8,
      label: 'Rak Kitab Bintang Gurun',
    });
  }

  // Chest & NPCs inside Sultan Palace (Treasure Chest in Upper Observatory Wing)
  const chest = createChestProp('chest_sultan_interior', 21.8, galY, -21.0, origin, colliders);
  rootGroup.add(chest.group);

  const sultanNPC = createCustomNPCMesh('emperor');
  sultanNPC.position.set(0, 1.5, -29.8);
  sultanNPC.rotation.y = 0;
  rootGroup.add(sultanNPC);

  const guard1 = createCustomNPCMesh('guard');
  guard1.position.set(-4.2, 1.5, -29.0);
  guard1.rotation.y = 0.2;
  const guard2 = createCustomNPCMesh('guard');
  guard2.position.set(4.2, 1.5, -29.0);
  guard2.rotation.y = -0.2;
  rootGroup.add(guard1, guard2);

  const room: InteriorRoom = {
    id: 'solaria_sultan_palace',
    name: 'Istana Sultan Solaria',
    exteriorName: 'Kota Kerajaan Padang Pasir Solaria',
    rootGroup,
    origin,
    baseFloorY: origin.y,
    minFloorY: origin.y,
    maxCeilingY: origin.y + h,
    dimensions: { width: w, depth: d, height: h },
    colliders,
    walkableMeshes: [],
    npcs: [
      {
        id: 'sultan_indoor_malik',
        name: 'Sultan Malik al-Solaria',
        nameId: 'Paduka Sultan Malik al-Solaria',
        role: 'Penguasa Gurun Pasir Emas',
        group: sultanNPC,
        position: [origin.x, origin.y + 1.5, origin.z - 29.8],
        dialogueId: 'sultan_malik',
        icon: '👑',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xfef3c7,
    ambientGroundHex: 0x115e59,
    ambientIntensity: 1.05,
    hemiIntensity: 1.25,
    dirIntensity: 1.08,
    bgHex: 0x162438,
    fogHex: 0x162438,
    animatedParts: [
      { mesh: astroRing1, mode: 'spinY', speed: 0.85, baseY: galY + 2.5, phase: 0 },
      { mesh: astroRing2, mode: 'tiltSpin', speed: 0.65, baseY: galY + 2.5, phase: 1.0 },
    ],
    getFallbackFloorY: (_wx, wy) => (wy - origin.y >= 4.4 ? origin.y + galY : origin.y),
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: (wy) =>
      wy - origin.y >= 4.4
        ? 'Lantai 2: Kamar Sultan, Observatorium & Galeri'
        : 'Lantai 1: Kolam Refleksi, Majlis & Harta Gurun',
    clampInsideWalls: (wx, wz, r) => ({
      x: THREE.MathUtils.clamp(wx, origin.x - halfW + 0.9 + r, origin.x + halfW - 0.9 - r),
      z: THREE.MathUtils.clamp(wz, origin.z - halfD + 0.9 + r, origin.z + halfD - 0.9 - r),
    }),
    clampCameraPosition: (camPos) => clampShellRoomCamera(room, camPos),
  };

  finalizeInteriorRoom(room);

  return {
    room,
    exitPos: { x: origin.x, y: origin.y, z: origin.z + halfD - 2.0 },
    spawnInPos: { x: origin.x, y: origin.y + 0.05, z: origin.z + halfD - 4.8, rotationY: Math.PI },
  };
}

function whiteRim(mat: THREE.Material): THREE.Material {
  return mat;
}

/** 3F. BAZAR & RUMAH SAUDAGAR GURUN SOLARIA (24 x 20 x 6.8) */
function createSolariaMerchantBazaarInterior(origin: Transform): { room: InteriorRoom; exitPos: Transform; spawnInPos: Transform } {
  const w = 24;
  const d = 20;
  const h = 11.5;
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xe7c687, flatShading: true });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf3e5ab, flatShading: true });
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0x6b3a1f, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.22 });
  const rugColors = [0x991b1b, 0x0d9488, 0x7c2d12, 0xd97706];

  const { rootGroup, colliders, halfW, halfD } = buildShellRoom(
    'solaria_merchant_bazaar',
    'Bazar & Rumah Saudagar Gurun',
    'Kota Kerajaan Padang Pasir Solaria',
    origin,
    w,
    d,
    h,
    floorMat,
    wallMat,
    ceilMat,
    3.2
  );

  // Main Ornate Persian Rugs layered on floor
  const rugMain = createCarpetMesh(9.0, 12.0, 0x991b1b, 0xfbbf24);
  rugMain.position.set(0, 0, -0.5);
  rootGroup.add(rugMain);

  // Hanging Persian Carpets mounted along West & East Walls
  for (let i = 0; i < 3; i++) {
    const cz = -5.5 + i * 5.0;
    const tapL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 3.6, 2.8),
      new THREE.MeshLambertMaterial({ color: rugColors[i % rugColors.length] })
    );
    tapL.position.set(-halfW + 0.45, 3.3, cz);
    const tapR = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 3.6, 2.8),
      new THREE.MeshLambertMaterial({ color: rugColors[(i + 1) % rugColors.length] })
    );
    tapR.position.set(halfW - 0.45, 3.3, cz);
    rootGroup.add(tapL, tapR);
  }

  // Ornate Trading Counter at North End
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 1.2, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true })
  );
  counter.position.set(0, 0.6, -5.8);
  rootGroup.add(counter);
  colliders.push({
    type: 'box',
    minX: origin.x - 4.4,
    maxX: origin.x + 4.4,
    minZ: origin.z - 6.7,
    maxZ: origin.z - 4.9,
    label: 'Meja Dagang Rempah & Sutra',
  });

  // Golden Urns (Guci Emas) & Silk Rolls arranged neatly around hall
  for (const [ux, uz] of [[-7.8, -6.5], [-6.4, -7.2], [7.8, -6.5], [6.4, -7.2], [-8.0, 5.2], [8.0, 5.2]]) {
    const urnBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.35, 10), goldMat);
    urnBase.position.set(ux, 0.18, uz);
    const urnBelly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), goldMat);
    urnBelly.scale.set(1, 1.35, 1);
    urnBelly.position.set(ux, 0.72, uz);
    const urnNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.3, 10), goldMat);
    urnNeck.position.set(ux, 1.32, uz);
    rootGroup.add(urnBase, urnBelly, urnNeck);
    colliders.push({ type: 'circle', x: origin.x + ux, z: origin.z + uz, radius: 0.65, label: 'Guci Emas Saudagar' });
  }

  // Plush Cushion Divan Seating Corner
  const divan = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.55, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x0f766e, flatShading: true })
  );
  divan.position.set(-6.5, 0.28, 1.2);
  rootGroup.add(divan);
  colliders.push({
    type: 'box',
    minX: origin.x - 9.4,
    maxX: origin.x - 3.6,
    minZ: origin.z,
    maxZ: origin.z + 2.4,
    label: 'Dipan Tamu Saudagar',
  });

  const ch = createChandelierGroup(1.5, goldMat, 0xfef08a);
  ch.position.set(0, h - 0.2, 0);
  rootGroup.add(ch);

  const merchantNPC = createCustomNPCMesh('bard');
  merchantNPC.position.set(0, 0, -7.2);
  merchantNPC.rotation.y = 0;
  rootGroup.add(merchantNPC);

  const chest = createChestProp('chest_solaria_bazaar', 8.5, 0, 1.5, origin, colliders);
  rootGroup.add(chest.group);

  const room: InteriorRoom = {
    id: 'solaria_merchant_bazaar',
    name: 'Bazar & Rumah Saudagar Gurun',
    exteriorName: 'Kota Kerajaan Padang Pasir Solaria',
    rootGroup,
    origin,
    baseFloorY: origin.y,
    minFloorY: origin.y,
    maxCeilingY: origin.y + h,
    dimensions: { width: w, depth: d, height: h },
    colliders,
    walkableMeshes: [],
    npcs: [
      {
        id: 'solaria_indoor_merchant',
        name: 'Merchant Tariq & Zahra',
        nameId: 'Saudagar Besar Gurun Solaria',
        role: 'Pedagang Permadani, Emas, & Rempah',
        group: merchantNPC,
        position: [origin.x, origin.y, origin.z - 7.2],
        dialogueId: 'weaver_zahra',
        icon: '🏺',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xfef3c7,
    ambientGroundHex: 0x78350f,
    ambientIntensity: 0.95,
    hemiIntensity: 1.15,
    dirIntensity: 1.0,
    bgHex: 0x2c1e16,
    fogHex: 0x2c1e16,
    animatedParts: [],
    getFallbackFloorY: () => origin.y,
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: () => 'Lantai 1: Bazar Saudagar Solaria',
    clampInsideWalls: (wx, wz, r) => ({
      x: THREE.MathUtils.clamp(wx, origin.x - halfW + 0.8 + r, origin.x + halfW - 0.8 - r),
      z: THREE.MathUtils.clamp(wz, origin.z - halfD + 0.8 + r, origin.z + halfD - 0.8 - r),
    }),
    clampCameraPosition: (camPos) => clampShellRoomCamera(room, camPos),
  };

  finalizeInteriorRoom(room);

  return {
    room,
    exitPos: { x: origin.x, y: origin.y, z: origin.z + halfD - 1.6 },
    spawnInPos: { x: origin.x, y: origin.y + 0.05, z: origin.z + halfD - 3.6, rotationY: Math.PI },
  };
}

/**
 * 3G. MAGE TOWER INTERIOR 4 ZONA BERTINGKAT (Diameter 36 unit, tinggi per lantai 14 unit)
 * - Floor 0 (localY = 0): Lantai Bawah Tanah (Arcane Basement & Vault)
 * - Floor 1 (localY = 14): Aula Utama & Perpustakaan Agung (Entry from Exterior!)
 * - Floor 2 (localY = 28): Laboratorium Penelitian & Tempat Latihan Indoor (incl. target dummies!)
 * - Floor 3 (localY = 42): Ruang Khusus Puncak (Archmage Observatory Sanctum)
 */
function createMageTowerMultiFloorInterior(origin: Transform): {
  room: InteriorRoom;
  portals: InteriorPortalDef[];
} {
  const radius = 21.0;
  const floorStep = 14.0;
  const stairInnerR = 11.4;
  const stairOuterR = 14.6;
  const stairHoleStart = -1.16;
  const stairHoleEnd = 1.16;
  const slottedFloorGeo = createSlottedTowerFloorGeometry(
    radius,
    stairInnerR,
    stairOuterR,
    stairHoleStart,
    stairHoleEnd,
    0.5
  );
  const rootGroup = new THREE.Group();
  rootGroup.name = 'interior_mage_tower_multi';
  rootGroup.position.set(origin.x, origin.y, origin.z);
  rootGroup.visible = false;

  const colliders: WorldCollider[] = [];
  const chests: InteriorChestData[] = [];
  const npcs: InteriorNPCData[] = [];
  const animatedParts: InteriorRoom['animatedParts'] = [];

  const slateMat = new THREE.MeshStandardMaterial({ color: 0x28304d, roughness: 0.72, metalness: 0.16 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x2f3659, roughness: 0.76, flatShading: true });
  const wallStoneMat = new THREE.MeshStandardMaterial({ color: 0x262c44, roughness: 0.78, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b3e1b, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 });
  const runeCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const runeViolet = new THREE.MeshBasicMaterial({ color: 0xc084fc });
  const emeraldGlow = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const vaultGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.3,
  });

  // Helper adding 6 emissive crystal sconces around each floor perimeter (0 PointLights)
  const addMageWallSconces = (floorY: number, crystalMat: THREE.Material) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.52;
      const sx = Math.cos(a) * (radius - 0.65);
      const sz = Math.sin(a) * (radius - 0.65);
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), goldMat);
      bracket.position.set(sx, floorY + 4.4, sz);
      bracket.userData.nonWalkable = true;
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.36), crystalMat);
      orb.position.set(sx, floorY + 5.0, sz);
      orb.userData.nonWalkable = true;
      rootGroup.add(bracket, orb);
    }
    const trimBand = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.18, 0.16, 6, 36), goldMat);
    trimBand.rotation.x = Math.PI / 2;
    trimBand.position.y = floorY + 0.12;
    trimBand.userData.nonWalkable = true;
    rootGroup.add(trimBand);
  };

  // -----------------------------------------------------------
  // FLOOR 0 (localY = -14): ARCANE BASEMENT & VAULT
  // -----------------------------------------------------------
  const f0Y = -floorStep;
  const floor0Mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.5, 32), darkStone);
  floor0Mesh.position.y = f0Y - 0.25;
  floor0Mesh.receiveShadow = true;
  floor0Mesh.userData.walkableSurface = true;
  rootGroup.add(floor0Mesh);

  const wall0 = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true), wallStoneMat);
  wall0.position.y = f0Y + floorStep * 0.5;
  wall0.userData.nonWalkable = true;
  rootGroup.add(wall0);
  addMageWallSconces(f0Y, runeViolet);

  // Vault Sigil & Sealed Energy Crystal Containment Tubes
  const vaultRing = new THREE.Mesh(new THREE.RingGeometry(4.0, 5.2, 28), runeViolet);
  vaultRing.rotation.x = -Math.PI / 2;
  vaultRing.position.y = f0Y + 0.03;
  vaultRing.userData.nonWalkable = true;
  rootGroup.add(vaultRing);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    const tx = Math.cos(a) * 17.2;
    const tz = Math.sin(a) * 17.2;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.9, 10), slateMat);
    ped.position.set(tx, f0Y + 0.45, tz);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 4.2, 14), vaultGlassMat);
    tube.position.set(tx, f0Y + 3.0, tz);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.48), i % 2 === 0 ? runeCyan : runeViolet);
    crystal.position.set(tx, f0Y + 3.0, tz);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.45, 10), goldMat);
    cap.position.set(tx, f0Y + 5.2, tz);
    rootGroup.add(ped, tube, crystal, cap);

    animatedParts.push({ mesh: crystal, mode: 'spinY', speed: 1.5, baseY: f0Y + 3.0, phase: i });
    colliders.push({
      type: 'circle',
      x: origin.x + tx,
      z: origin.z + tz,
      radius: 1.15,
      minY: origin.y + f0Y - 1.0,
      maxY: origin.y + f0Y + 6.0,
      label: 'Tabung Kristal Segel Arcane',
    });
  }

  const vaultChest = createChestProp('chest_mage_vault', 0, f0Y, 8.0, origin, colliders);
  rootGroup.add(vaultChest.group);
  chests.push(vaultChest);

  // -----------------------------------------------------------
  // FLOOR 1 (localY = 0): AULA UTAMA & PERPUSTAKAAN AGUNG (ENTRY FLOOR!)
  // -----------------------------------------------------------
  const f1Y = 0;
  const floor1Mesh = new THREE.Mesh(slottedFloorGeo, slateMat);
  floor1Mesh.position.y = f1Y - 0.5;
  floor1Mesh.receiveShadow = true;
  floor1Mesh.userData.walkableSurface = true;
  rootGroup.add(floor1Mesh);

  const wall1 = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true), wallStoneMat);
  wall1.position.y = f1Y + floorStep * 0.5;
  wall1.userData.nonWalkable = true;
  rootGroup.add(wall1);
  addMageWallSconces(f1Y, runeCyan);

  // Luminous Arcane Star Ring around Floor 1 Center
  const f1RuneRing = new THREE.Mesh(new THREE.RingGeometry(4.4, 5.1, 32), runeCyan);
  f1RuneRing.rotation.x = -Math.PI / 2;
  f1RuneRing.position.y = f1Y + 0.03;
  f1RuneRing.userData.nonWalkable = true;
  rootGroup.add(f1RuneRing);

  // Grand Star Carpet & Portal Archway on South Wall
  const libCarpet = createCarpetMesh(6.5, 22.0, 0x312e81, 0x38bdf8);
  libCarpet.position.set(0, f1Y, 2.5);
  rootGroup.add(libCarpet);

  // Tall Grand Library Bookcases along perimeter
  const libBookColors = [0x991b1b, 0x1d4ed8, 0x059669, 0x7c3aed, 0xd97706];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * 0.82 + (i / 7) * Math.PI * 1.64; // Skip south entrance doorway
    const bx = Math.sin(a) * 18.4;
    const bz = -Math.cos(a) * 18.4;
    const shelf = createLargeBookcase(3.8, 7.2, woodMat, libBookColors);
    shelf.position.set(bx, f1Y, bz);
    shelf.rotation.y = Math.atan2(-bx, -bz);
    rootGroup.add(shelf);
    colliders.push({
      type: 'circle',
      x: origin.x + bx,
      z: origin.z + bz,
      radius: 1.8,
      minY: origin.y + f1Y - 1.0,
      maxY: origin.y + f1Y + 8.0,
      label: 'Rak Buku Perpustakaan Agung',
    });
  }

  // Floating Astrology World Globe in Center of Floor 1
  const astBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.0, 12), goldMat);
  astBase.position.set(0, f1Y + 0.5, 0);
  const globe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 1),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.45, roughness: 0.25 })
  );
  globe.position.set(0, f1Y + 3.0, 0);
  const globeRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.08, 8, 28), goldMat);
  globeRing.position.set(0, f1Y + 3.0, 0);
  globeRing.rotation.x = 0.65;
  rootGroup.add(astBase, globe, globeRing);
  animatedParts.push({ mesh: globe, mode: 'spinY', speed: 0.9, baseY: f1Y + 3.0, phase: 0 });
  animatedParts.push({ mesh: globeRing, mode: 'tiltSpin', speed: 0.6, baseY: f1Y + 3.0, phase: 1.2 });
  colliders.push({
    type: 'circle',
    x: origin.x,
    z: origin.z,
    radius: 1.6,
    minY: origin.y + f1Y - 1.0,
    maxY: origin.y + f1Y + 6.0,
    label: 'Bola Dunia Astrologi Melayang',
  });

  // Grand Mage Eldrin & Sorceress Maya on Floor 1
  const eldrin = createGrandMageEldrinMesh();
  eldrin.position.set(-4.5, f1Y, -5.0);
  eldrin.rotation.y = 0.35;
  rootGroup.add(eldrin);
  npcs.push({
    id: 'mt_indoor_eldrin',
    name: 'Grand Mage Eldrin',
    nameId: 'Grand Mage Eldrin (Perpustakaan Agung)',
    role: 'Penjaga Kitab Halilintar',
    group: eldrin,
    position: [origin.x - 4.5, origin.y + f1Y, origin.z - 5.0],
    dialogueId: 'grand_mage_eldrin',
    icon: '🧙‍♂️',
  });

  const maya = createSorceressMayaMesh();
  maya.position.set(4.5, f1Y, -5.0);
  maya.rotation.y = -0.35;
  rootGroup.add(maya);
  npcs.push({
    id: 'mt_indoor_maya',
    name: 'Sorceress Maya',
    nameId: 'Sorceress Maya (Astrologi & Sihir)',
    role: 'Pengkaji Kitab Kuno',
    group: maya,
    position: [origin.x + 4.5, origin.y + f1Y, origin.z - 5.0],
    dialogueId: 'sorceress_maya',
    icon: '✨',
  });

  // -----------------------------------------------------------
  // FLOOR 2 (localY = 14): RESEARCH LAB & INDOOR TRAINING HALL
  // -----------------------------------------------------------
  const f2Y = floorStep; // 14
  const floor2Mesh = new THREE.Mesh(slottedFloorGeo, slateMat);
  floor2Mesh.position.y = f2Y - 0.5;
  floor2Mesh.receiveShadow = true;
  floor2Mesh.userData.walkableSurface = true;
  rootGroup.add(floor2Mesh);

  const wall2 = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true), wallStoneMat);
  wall2.position.y = f2Y + floorStep * 0.5;
  wall2.userData.nonWalkable = true;
  rootGroup.add(wall2);
  addMageWallSconces(f2Y, emeraldGlow);

  // Subtle brighter training zone runes on Floor 2
  const f2OuterRing = new THREE.Mesh(new THREE.RingGeometry(8.6, 9.2, 32), runeCyan);
  f2OuterRing.rotation.x = -Math.PI / 2;
  f2OuterRing.position.y = f2Y + 0.025;
  f2OuterRing.userData.nonWalkable = true;
  rootGroup.add(f2OuterRing);

  // Alchemy Tables stocked with glowing potions
  for (const ax of [-8.0, 8.0]) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.1, 1.8), woodMat);
    desk.position.set(ax, f2Y + 0.55, -2.5);
    rootGroup.add(desk);
    for (let k = -2; k <= 2; k++) {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.2, 0.42, 8),
        k % 2 === 0 ? emeraldGlow : k % 3 === 0 ? runeCyan : runeViolet
      );
      pot.position.set(ax + k * 0.95, f2Y + 1.32, -2.5);
      rootGroup.add(pot);
    }
    colliders.push({
      type: 'box',
      minX: origin.x + ax - 3.0,
      maxX: origin.x + ax + 3.0,
      minZ: origin.z - 3.6,
      maxZ: origin.z - 1.4,
      minY: origin.y + f2Y - 1.0,
      maxY: origin.y + f2Y + 4.0,
      label: 'Meja Alkimia Penelitian',
    });
  }

  // Crystal Experiment Circle in Center of Lab
  const expRing = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 24), emeraldGlow);
  expRing.rotation.x = -Math.PI / 2;
  expRing.position.set(0, f2Y + 0.03, -2.5);
  expRing.userData.nonWalkable = true;
  const expCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.95), runeCyan);
  expCrystal.position.set(0, f2Y + 2.1, -2.5);
  rootGroup.add(expRing, expCrystal);
  animatedParts.push({ mesh: expCrystal, mode: 'spinY', speed: 1.8, baseY: f2Y + 2.1, phase: 0.4 });
  colliders.push({
    type: 'circle',
    x: origin.x,
    z: origin.z - 2.5,
    radius: 1.2,
    minY: origin.y + f2Y - 1.0,
    maxY: origin.y + f2Y + 4.5,
    label: 'Kristal Eksperimen Inti',
  });

  // Indoor Mantra Combat Training Zone (South Half of Floor 2: ring decals beneath attackable dummies)
  const trainingDummySpawns: InteriorTrainingDummySpawn[] = [
    {
      id: 'mage_indoor_dummy_1',
      name: 'Arcane Target Dummy West',
      nameId: 'Dummy Latihan Sihir Barat',
      x: origin.x - 5.0,
      y: origin.y + f2Y,
      z: origin.z + 7.5,
    },
    {
      id: 'mage_indoor_dummy_2',
      name: 'Arcane Target Dummy East',
      nameId: 'Dummy Latihan Sihir Timur',
      x: origin.x + 5.0,
      y: origin.y + f2Y,
      z: origin.z + 7.5,
    },
  ];
  for (const dx of [-5.0, 5.0]) {
    const pad = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 20), runeViolet);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(dx, f2Y + 0.03, 7.5);
    pad.userData.nonWalkable = true;
    rootGroup.add(pad);
  }

  // Archmage Pyro on Floor 2
  const pyro = createArchmagePyroMesh();
  pyro.position.set(0, f2Y, -7.2);
  pyro.rotation.y = 0;
  rootGroup.add(pyro);
  npcs.push({
    id: 'mt_indoor_pyro',
    name: 'Archmage Pyro',
    nameId: 'Archmage Pyro (Lab Penelitian & Latihan)',
    role: 'Ahli Alkimia & Tempur Sihir',
    group: pyro,
    position: [origin.x, origin.y + f2Y, origin.z - 7.2],
    dialogueId: 'archmage_pyro',
    icon: '🔥',
  });

  // -----------------------------------------------------------
  // FLOOR 3 (localY = 28): ARCHMAGE OBSERVATORY SANCTUM
  // -----------------------------------------------------------
  const f3Y = floorStep * 2; // 28
  const floor3Mesh = new THREE.Mesh(slottedFloorGeo, darkStone);
  floor3Mesh.position.y = f3Y - 0.5;
  floor3Mesh.receiveShadow = true;
  floor3Mesh.userData.walkableSurface = true;
  rootGroup.add(floor3Mesh);

  const wall3 = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true), wallStoneMat);
  wall3.position.y = f3Y + floorStep * 0.5;
  wall3.userData.nonWalkable = true;
  rootGroup.add(wall3);
  addMageWallSconces(f3Y, runeCyan);

  const f3RuneRing = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.2, 32), runeViolet);
  f3RuneRing.rotation.x = -Math.PI / 2;
  f3RuneRing.position.y = f3Y + 0.03;
  f3RuneRing.userData.nonWalkable = true;
  rootGroup.add(f3RuneRing);

  // Starry Observatory Dome overhead
  const starDome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x253052, side: THREE.DoubleSide })
  );
  starDome.position.y = f3Y + floorStep - 0.4;
  starDome.scale.set(1, 0.55, 1);
  rootGroup.add(starDome);

  // Floating Constellation Rings spinning overhead
  const constRing1 = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.14, 8, 32), goldMat);
  constRing1.position.set(0, f3Y + 9.2, 0);
  constRing1.rotation.x = 0.55;
  const constRing2 = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.12, 8, 28), runeCyan);
  constRing2.position.set(0, f3Y + 9.2, 0);
  constRing2.rotation.y = 0.7;
  const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.85), runeCyan);
  starCore.position.set(0, f3Y + 9.2, 0);
  rootGroup.add(constRing1, constRing2, starCore);
  animatedParts.push({ mesh: constRing1, mode: 'tiltSpin', speed: 0.45, baseY: f3Y + 9.2, phase: 0 });
  animatedParts.push({ mesh: constRing2, mode: 'spinY', speed: -0.75, baseY: f3Y + 9.2, phase: 1.0 });
  animatedParts.push({ mesh: starCore, mode: 'spinY', speed: 1.4, baseY: f3Y + 9.2, phase: 2.0 });

  // Giant Brass Telescope facing North Cosmos
  const teleStand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.3, 3.2, 8), goldMat);
  teleStand.position.set(-4.8, f3Y + 1.6, -4.0);
  const teleTube = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.45, 7.6, 12), goldMat);
  teleTube.position.set(-4.8, f3Y + 4.0, -5.2);
  teleTube.rotation.x = -0.62;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), runeCyan);
  lens.position.set(-4.8, f3Y + 6.2, -7.4);
  lens.rotation.x = -0.62;
  rootGroup.add(teleStand, teleTube, lens);
  colliders.push({
    type: 'circle',
    x: origin.x - 4.8,
    z: origin.z - 4.0,
    radius: 1.6,
    minY: origin.y + f3Y - 1.0,
    maxY: origin.y + f3Y + 8.0,
    label: 'Teleskop Raksasa Observatorium',
  });

  // Secret Arcane Spell Table in Center of Sanctum
  const secretTable = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.15, 8), darkStone);
  secretTable.position.set(1.5, f3Y + 0.58, 1.0);
  const spellTome = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 1.0), runeViolet);
  spellTome.position.set(1.5, f3Y + 1.38, 1.0);
  rootGroup.add(secretTable, spellTome);
  animatedParts.push({ mesh: spellTome, mode: 'bobY', speed: 2.2, baseY: f3Y + 1.42, phase: 0 });
  colliders.push({
    type: 'circle',
    x: origin.x + 1.5,
    z: origin.z + 1.0,
    radius: 2.8,
    minY: origin.y + f3Y - 1.0,
    maxY: origin.y + f3Y + 5.0,
    label: 'Meja Mantra Rahasia',
  });

  const sanctumChest = createChestProp('chest_mage_sanctum', 8.5, f3Y, -5.5, origin, colliders);
  rootGroup.add(sanctumChest.group);
  chests.push(sanctumChest);

  // Continuous Walkable Arcane Spiral Staircases connecting all 4 floors on West Arc (manual climbing only — 0 floor teleport pads)
  addTowerSpiralStairs(rootGroup, colliders, origin, f0Y, f1Y, 11.5, 14.5, -1.10, 1.10, 28, darkStone, goldMat);
  addTowerSpiralStairs(rootGroup, colliders, origin, f1Y, f2Y, 11.5, 14.5, -1.10, 1.10, 28, slateMat, goldMat);
  addTowerSpiralStairs(rootGroup, colliders, origin, f2Y, f3Y, 11.5, 14.5, -1.10, 1.10, 28, darkStone, goldMat);

  const portals: InteriorPortalDef[] = [];

  const room: InteriorRoom = {
    id: 'mage_tower_interior',
    name: 'Mage Tower Puncak Halilintar',
    exteriorName: 'Pelataran Mage Tower',
    rootGroup,
    origin,
    baseFloorY: origin.y,
    minFloorY: origin.y + f0Y,
    maxCeilingY: origin.y + f3Y + floorStep + 4.0,
    dimensions: { width: radius * 2, depth: radius * 2, height: floorStep * 4, radius },
    colliders,
    walkableMeshes: [],
    npcs,
    chests,
    trainingDummySpawns,
    ambientSkyHex: 0xe0e7ff,
    ambientGroundHex: 0x3b446b,
    ambientIntensity: 1.2,
    hemiIntensity: 1.35,
    dirIntensity: 1.15,
    bgHex: 0x202742,
    fogHex: 0x202742,
    animatedParts,
    getFallbackFloorY: (_wx, wy, _wz) => {
      const localY = wy - origin.y;
      if (localY >= f3Y - 6) return origin.y + f3Y;
      if (localY >= f2Y - 6) return origin.y + f2Y;
      if (localY >= f1Y - 6) return origin.y + f1Y;
      return origin.y + f0Y;
    },
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: (wy) => {
      const localY = wy - origin.y;
      if (localY >= f3Y - 4.5) return 'Lantai 3: Observatorium Agung';
      if (localY >= f2Y - 4.5) return 'Lantai 2: Lab & Ruang Latihan';
      if (localY >= f1Y - 4.5) return 'Lantai 1: Perpustakaan Agung';
      return 'Basement: Arcane Vault';
    },
    clampInsideWalls: (wx, wz, r) => {
      const dx = wx - origin.x;
      const dz = wz - origin.z;
      const maxR = radius - 0.85 - r;
      const dist = Math.hypot(dx, dz);
      if (dist > maxR && dist > 0.001) {
        return {
          x: origin.x + (dx / dist) * maxR,
          z: origin.z + (dz / dist) * maxR,
        };
      }
      return { x: wx, z: wz };
    },
    clampCameraPosition: (camPos, anchorY = origin.y) => {
      const dx = camPos.x - origin.x;
      const dz = camPos.z - origin.z;
      const maxCamR = radius - 1.15;
      const dist = Math.hypot(dx, dz);
      if (dist > maxCamR && dist > 0.001) {
        camPos.x = origin.x + (dx / dist) * maxCamR;
        camPos.z = origin.z + (dz / dist) * maxCamR;
      }
      const refY = anchorY - origin.y;
      let floorMin = f0Y;
      let ceilMax = f0Y + floorStep - 0.85;
      if (refY >= f3Y - 4) {
        floorMin = f3Y;
        ceilMax = f3Y + floorStep + 3.0;
      } else if (refY >= f2Y - 4) {
        floorMin = f2Y;
        ceilMax = f2Y + floorStep - 0.85;
      } else if (refY >= f1Y - 4) {
        floorMin = f1Y;
        ceilMax = f1Y + floorStep - 0.85;
      }
      camPos.y = THREE.MathUtils.clamp(camPos.y, origin.y + floorMin + 0.65, origin.y + ceilMax);
    },
  };

  finalizeInteriorRoom(room);

  return { room, portals };
}

// ============================================================================
// 4. CENTRAL INTERIOR MANAGER (ISOLATED RENDERING, GTA PORTALS, ZERO OVERHEAD)
// ============================================================================

export class InteriorManager {
  public masterGroup = new THREE.Group();
  public exteriorMarkersGroup = new THREE.Group();
  public rooms = new Map<string, InteriorRoom>();
  public portals: InteriorPortalDef[] = [];
  public activeRoom: InteriorRoom | null = null;

  constructor(
    scene: THREE.Scene,
    exteriorWorldGroup: THREE.Group,
    entranceConfigs: Record<string, EntrancePortalConfig>
  ) {
    this.masterGroup.name = 'interiorRootGroup';
    this.masterGroup.visible = false;
    this.masterGroup.frustumCulled = false;
    scene.add(this.masterGroup);

    this.exteriorMarkersGroup.name = 'ExteriorGTADoorMarkers';
    exteriorWorldGroup.add(this.exteriorMarkersGroup);

    // Every isolated room occupies clean world origin (0, 0, 0) while only activeRoom is visible
    const cleanOrigin: Transform = { x: 0, y: 0, z: 0 };
    const origins: Record<string, Transform> = {
      valkragor_command_hall: { ...cleanOrigin },
      valkragor_blacksmith: { ...cleanOrigin },
      astraea_imperial_palace: { ...cleanOrigin },
      astraea_tavern: { ...cleanOrigin },
      solaria_sultan_palace: { ...cleanOrigin },
      solaria_merchant_bazaar: { ...cleanOrigin },
      mage_tower_interior: { ...cleanOrigin },
    };

    const builders: Array<{
      id: string;
      built: { room: InteriorRoom; exitPos?: Transform; spawnInPos?: Transform; portals?: InteriorPortalDef[] };
      customEntryOffset?: Transform;
    }> = [
      { id: 'valkragor_command_hall', built: createValKragorCommandHall(origins.valkragor_command_hall) },
      { id: 'valkragor_blacksmith', built: createValKragorBlacksmith(origins.valkragor_blacksmith) },
      { id: 'astraea_imperial_palace', built: createAstraeaImperialPalaceInterior(origins.astraea_imperial_palace) },
      { id: 'astraea_tavern', built: createAstraeaTavernInterior(origins.astraea_tavern) },
      { id: 'solaria_sultan_palace', built: createSolariaSultanPalaceInterior(origins.solaria_sultan_palace) },
      { id: 'solaria_merchant_bazaar', built: createSolariaMerchantBazaarInterior(origins.solaria_merchant_bazaar) },
      {
        id: 'mage_tower_interior',
        built: createMageTowerMultiFloorInterior(origins.mage_tower_interior),
        // Enter onto Floor 1 Library at clean origin y=0 near south doorway
        customEntryOffset: {
          x: 0,
          y: 0.05,
          z: 14.5,
          rotationY: Math.PI,
        },
      },
    ];

    for (const item of builders) {
      const { room, exitPos, spawnInPos, portals: extraPortals } = item.built;
      this.rooms.set(room.id, room);
      this.masterGroup.add(room.rootGroup);
      if (extraPortals) {
        this.portals.push(...extraPortals);
      }

      const cfg = entranceConfigs[room.id];
      if (!cfg) continue;

      const markerColor = cfg.colorHex ?? (room.id === 'mage_tower_interior' ? 0x38bdf8 : 0xfbbf24);

      // Exterior Entrance Portal -> Interior Spawn
      const targetSpawn = item.customEntryOffset ?? spawnInPos ?? {
        x: room.origin.x,
        y: room.origin.y + 0.05,
        z: room.origin.z + 4.0,
        rotationY: Math.PI,
      };
      const enterMarker = createDoorMarkerMesh(`${room.id}_enter`, markerColor);
      enterMarker.group.position.set(cfg.exteriorDoorPos.x, cfg.exteriorDoorPos.y, cfg.exteriorDoorPos.z);
      this.exteriorMarkersGroup.add(enterMarker.group);

      this.portals.push({
        id: `${room.id}_enter`,
        roomId: 'exterior',
        kind: 'enter',
        label: cfg.label,
        promptText: `Masuk ${cfg.label} (E / Ketuk)`,
        toastText: `Memasuki ${cfg.label}`,
        targetRoomId: room.id,
        markerPos: { ...cfg.exteriorDoorPos },
        spawnPos: targetSpawn,
        triggerRadius: 2.9,
        autoRadius: 1.4,
        colorHex: markerColor,
        markerMesh: enterMarker.group,
        arrowGroup: enterMarker.arrowGroup,
        outerRing: enterMarker.outerRing,
        innerDisc: enterMarker.innerDisc,
      });

      // Interior Exit Portal -> Exterior Door Front
      const actualExitPos = exitPos ?? {
        x: 0,
        y: 0.0,
        z: 18.0,
      };
      const exitMarker = createDoorMarkerMesh(`${room.id}_exit`, markerColor);
      exitMarker.group.position.set(
        actualExitPos.x - room.origin.x,
        actualExitPos.y - room.origin.y,
        actualExitPos.z - room.origin.z
      );
      room.rootGroup.add(exitMarker.group);

      this.portals.push({
        id: `${room.id}_exit`,
        roomId: room.id,
        kind: 'exit',
        label: `Keluar ke ${room.exteriorName}`,
        promptText: `Keluar ke ${room.exteriorName} (E / Ketuk)`,
        toastText: `Kembali ke ${room.exteriorName}`,
        targetRoomId: null,
        markerPos: actualExitPos,
        spawnPos: { ...cfg.exteriorReturnSpawn },
        triggerRadius: 2.9,
        autoRadius: 1.4,
        colorHex: markerColor,
        markerMesh: exitMarker.group,
        arrowGroup: exitMarker.arrowGroup,
        outerRing: exitMarker.outerRing,
        innerDisc: exitMarker.innerDisc,
      });
    }
  }

  public setActiveRoom(roomId: string | null): InteriorRoom | null {
    this.rooms.forEach((r) => {
      r.rootGroup.visible = r.id === roomId;
    });
    this.activeRoom = roomId ? this.rooms.get(roomId) ?? null : null;
    this.masterGroup.visible = this.activeRoom !== null;
    this.exteriorMarkersGroup.visible = this.activeRoom === null;

    return this.activeRoom;
  }

  public updateAnimations(elapsed: number): void {
    // Animate visible markers (either exterior markers OR active room's exit/floor markers)
    const activeId = this.activeRoom ? this.activeRoom.id : 'exterior';
    for (let i = 0; i < this.portals.length; i++) {
      const p = this.portals[i];
      if (p.roomId !== activeId) continue;

      p.outerRing.rotation.z = elapsed * 1.4;
      p.innerDisc.scale.setScalar(0.88 + Math.sin(elapsed * 4.2 + i) * 0.12);
      p.arrowGroup.position.y = 1.65 + Math.sin(elapsed * 3.8 + i) * 0.25;
      p.arrowGroup.rotation.y = elapsed * 2.2;
    }

    if (this.activeRoom) {
      const parts = this.activeRoom.animatedParts;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.mode === 'spinY') {
          part.mesh.rotation.y = elapsed * part.speed + part.phase;
        } else if (part.mode === 'bobY') {
          part.mesh.position.y = part.baseY + Math.sin(elapsed * part.speed + part.phase) * 0.18;
        } else if (part.mode === 'tiltSpin') {
          part.mesh.rotation.y = elapsed * part.speed + part.phase;
          part.mesh.rotation.z = Math.sin(elapsed * 0.6 + part.phase) * 0.35;
        }
      }
    }
  }

  public findClosestPortal(x: number, y: number, z: number): { portal: InteriorPortalDef; dist: number } | null {
    const activeId = this.activeRoom ? this.activeRoom.id : 'exterior';
    let best: InteriorPortalDef | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < this.portals.length; i++) {
      const p = this.portals[i];
      if (p.roomId !== activeId) continue;
      if (Math.abs(y - p.markerPos.y) > 4.0) continue;
      const dist = Math.hypot(x - p.markerPos.x, z - p.markerPos.z);
      if (dist <= p.triggerRadius && dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return best ? { portal: best, dist: bestDist } : null;
  }
}
