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
    maxY: origin.y + ly + h * 0.5 + 1.5,
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
  label: string
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

    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(width, stepH, stepRun + 0.08), stepMat);
    stepMesh.position.set(centerX, startY - 0.35 + stepH * 0.5, zCenter);
    stepMesh.receiveShadow = true;
    stepMesh.userData.walkableSurface = true;
    parent.add(stepMesh);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.05, 0.14), trimMat);
    trim.position.set(centerX, topY + 0.015, zCenter - dirZ * stepRun * 0.44);
    trim.userData.nonWalkable = true;
    parent.add(trim);
  }

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

  _interiorRayOrigin.set(worldX, currentY + 1.55, worldZ);
  _interiorRaycaster.set(_interiorRayOrigin, _interiorDownVec);
  _interiorRaycaster.near = 0.01;
  _interiorRaycaster.far = 24.0;

  const hits = _interiorRaycaster.intersectObjects(room.walkableMeshes, false);
  for (let i = 0; i < hits.length; i++) {
    const hitY = hits[i].point.y;
    if (hitY <= currentY + 1.35 && hitY >= room.minFloorY - 0.5) {
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

    const step = new THREE.Mesh(new THREE.BoxGeometry(stairW, thickness, treadDepth), stepMat);
    step.position.set(cx, stepTopY - thickness * 0.5, cz);
    step.rotation.y = t;
    step.receiveShadow = true;
    step.userData.walkableSurface = true;
    rootGroup.add(step);

    if (i % 3 === 0 || i === steps - 1) {
      const innerPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 6), trimMat);
      innerPost.position.set(-Math.cos(t) * (rInner + 0.12), stepTopY + 0.52, Math.sin(t) * (rInner + 0.12));
      innerPost.userData.nonWalkable = true;
      rootGroup.add(innerPost);
    }
  }

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
  const w = 28;
  const d = 26;
  const h = 11.5;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3f4756, roughness: 0.85, flatShading: true });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88, flatShading: true });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x261d17, roughness: 0.9 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a3222, flatShading: true });
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
    3.6
  );

  // Heavy Timber Ceiling Beams
  for (let z = -halfD + 4; z <= halfD - 4; z += 5.5) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 0.45, 0.55), woodMat);
    beam.position.set(0, h - 0.25, z);
    beam.userData.nonWalkable = true;
    rootGroup.add(beam);
  }

  // Crimson War Rug running to War Table & Throne
  const carpet = createCarpetMesh(6.5, 17.5, 0x7f1d1d, 0xd97706);
  carpet.position.set(0, 0, -0.5);
  rootGroup.add(carpet);

  // Grand Tactical War Map Table in Center
  const warTable = createImperialWarTableMesh();
  warTable.scale.set(1.25, 1.05, 1.25);
  warTable.position.set(0, 0, -1.5);
  rootGroup.add(warTable);
  colliders.push({
    type: 'box',
    minX: origin.x - 2.4,
    maxX: origin.x + 2.4,
    minZ: origin.z - 3.6,
    maxZ: origin.z + 0.6,
    minY: origin.y,
    maxY: origin.y + 2.5,
    label: 'Meja Peta Taktik Perang',
  });

  // Flanking Stone Pillars with Hanging War Banners
  for (const px of [-7.5, 7.5]) {
    for (const pz of [-6.5, 1.5, 8.0]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 1.1), wallMat);
      col.position.set(px, h * 0.5, pz);
      col.userData.nonWalkable = true;
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 3.6), bannerMat);
      banner.position.set(px + (px < 0 ? 0.62 : -0.62), 4.6, pz);
      banner.rotation.y = Math.PI / 2;
      rootGroup.add(col, banner);
      colliders.push({ type: 'circle', x: origin.x + px, z: origin.z + pz, radius: 0.78, label: 'Pilar Aula Benteng' });
    }
  }

  // Stone Fireplace along North-West Wall
  const fire = createFireplaceNoLight(wallMat, woodMat);
  fire.position.set(-7.5, 0, -halfD + 0.85);
  rootGroup.add(fire);
  colliders.push({
    type: 'box',
    minX: origin.x - 9.2,
    maxX: origin.x - 5.8,
    minZ: origin.z - halfD,
    maxZ: origin.z - halfD + 1.8,
    label: 'Perapian Batu Komandan',
  });

  // War Banners on North Wall
  for (const bx of [-2.8, 0, 2.8]) {
    const wallBanner = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.2, 0.08), bannerMat);
    wallBanner.position.set(bx, 4.6, -halfD + 0.45);
    const goldCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), goldMat);
    goldCrest.position.set(bx, 5.1, -halfD + 0.52);
    rootGroup.add(wallBanner, goldCrest);
  }

  // Weapon Racks flanking East & West Walls
  for (const [wx, wz, rot] of [
    [-halfW + 1.2, -5.0, Math.PI / 2],
    [-halfW + 1.2, 2.0, Math.PI / 2],
    [halfW - 1.2, -5.0, -Math.PI / 2],
    [halfW - 1.2, 2.0, -Math.PI / 2],
  ] as [number, number, number][]) {
    const rack = createWeaponRackMesh();
    rack.position.set(wx, 0, wz);
    rack.rotation.y = rot;
    rootGroup.add(rack);
    colliders.push({ type: 'circle', x: origin.x + wx, z: origin.z + wz, radius: 1.0, label: 'Rak Senjata Perang' });
  }

  // Chandeliers (emissive glow only — no dynamic lights)
  const chFront = createChandelierGroup(1.5, ironMat, 0xffa726);
  chFront.position.set(0, h - 0.2, 3.0);
  const chBack = createChandelierGroup(1.5, ironMat, 0xffa726);
  chBack.position.set(0, h - 0.2, -6.5);
  rootGroup.add(chFront, chBack);

  // Chest & NPC
  const chest = createChestProp('chest_vk_command', 9.2, 0, -9.5, origin, colliders);
  rootGroup.add(chest.group);

  const captainGroup = createCustomNPCMesh('commander');
  captainGroup.position.set(0, 0, -6.8);
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
        position: [origin.x, origin.y, origin.z - 6.8],
        dialogueId: 'commander_brann',
        icon: '⚔️',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xfef3c7,
    ambientGroundHex: 0x475569,
    ambientIntensity: 0.92,
    hemiIntensity: 1.15,
    dirIntensity: 1.0,
    bgHex: 0x1e293b,
    fogHex: 0x1e293b,
    animatedParts: [],
    getFallbackFloorY: () => origin.y,
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: () => 'Lantai 1: Aula Komandan Benteng',
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
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
  const bannerBlue = new THREE.MeshLambertMaterial({ color: 0x1d4ed8, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
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
  for (let ix = -12; ix <= 12; ix += 4) {
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

  // Grand Crimson-and-Gold Carpet stretching down 62 units
  const runner = createCarpetMesh(6.0, 58.0, 0x991b1b, 0xf59e0b);
  runner.position.set(0, 0, 5.0);
  rootGroup.add(runner);

  // Stepped Throne Dais at North End + Walkable Steps
  addStaircase(rootGroup, 14.0, 4, 0, 1.4, -22.5, -26.5, 0, whiteMarble, goldTrim, goldTrim);
  addWalkableSlab(rootGroup, 20.0, 1.4, 12.0, 0, 0.7, -32.5, whiteMarble, 'Podium Singgasana Kaisar');

  const throne = createImperialThroneMesh();
  throne.scale.set(1.35, 1.35, 1.35);
  throne.position.set(0, 1.4, -34.8);
  rootGroup.add(throne);
  colliders.push({
    type: 'box',
    minX: origin.x - 2.0,
    maxX: origin.x + 2.0,
    minZ: origin.z - 36.8,
    maxZ: origin.z - 33.4,
    label: 'Takhta Kaisar Aurelius',
  });

  // Glowing Golden Sun Rose Window behind Throne
  const sunWin = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), sunGlow);
  sunWin.position.set(0, 9.0, -halfD + 0.42);
  const sunRing = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.35, 8, 24), goldTrim);
  sunRing.position.set(0, 9.0, -halfD + 0.45);
  rootGroup.add(sunWin, sunRing);

  // 2 Rows of Colossal Fluted Marble Pillars with Royal Banners
  for (const cx of [-11.0, 11.0]) {
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
      colliders.push({ type: 'circle', x: origin.x + cx, z: origin.z + cz, radius: 1.05, label: 'Pilar Marmer Agung' });
    }
  }

  // Twin Walkable 2nd Floor Balconies (Y = 5.4) + Twin Access Staircases!
  const balcY = 5.4;
  // West Balcony Deck (X: -27.5..-19.5, Z: -38..28)
  addWalkableSlab(rootGroup, 8.2, 0.45, 68.0, -23.5, balcY - 0.225, -4.0, whiteMarble, 'Balkon Lantai 2 Sayap Barat');
  // East Balcony Deck (X: 19.5..27.5, Z: -38..28)
  addWalkableSlab(rootGroup, 8.2, 0.45, 68.0, 23.5, balcY - 0.225, -4.0, whiteMarble, 'Balkon Lantai 2 Sayap Timur');
  // North Overlook Bridge Balcony connecting West & East above rear wall (X: -20..20, Z: -38..-31)
  addWalkableSlab(rootGroup, 40.0, 0.45, 6.5, 0, balcY - 0.225, -36.5, whiteMarble, 'Balkon Lantai 2 Sayap Utara');

  // Balcony Protective Railings & Colliders (only active when up at Y >= 4.0)
  for (const bx of [-19.5, 19.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.05, 66.0), goldTrim);
    rail.position.set(bx, balcY + 0.55, -3.0);
    rail.userData.nonWalkable = true;
    rootGroup.add(rail);
    colliders.push({
      type: 'box',
      minX: origin.x + bx - 0.25,
      maxX: origin.x + bx + 0.25,
      minZ: origin.z - 33.0,
      maxZ: origin.z + 29.0,
      minY: origin.y + balcY - 0.5,
      maxY: origin.y + balcY + 3.0,
      label: 'Pagar Balkon Istana',
    });
  }

  // Twin Marble Staircases Ascending from Ground (Y=0, Z=33) to Balcony Decks (Y=5.4, Z=23)
  addStaircase(rootGroup, 4.2, 16, 0, balcY, 35.0, 24.0, -23.5, whiteMarble, goldTrim, blueMarble);
  addStaircase(rootGroup, 4.2, 16, 0, balcY, 35.0, 24.0, 23.5, whiteMarble, goldTrim, blueMarble);

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
    colliders.push({ type: 'circle', x: origin.x + kx, z: origin.z - 22.0, radius: 1.2, label: 'Patung Ksatria Pengawal' });
  }

  // Side Wing Banquet & Strategy Galleries (Ground Floor under Balconies)
  const banquet = createImperialBanquetTableMesh();
  banquet.position.set(16.0, 0, 0);
  banquet.rotation.y = Math.PI / 2;
  rootGroup.add(banquet);
  colliders.push({
    type: 'box',
    minX: origin.x + 14.0,
    maxX: origin.x + 18.0,
    minZ: origin.z - 4.5,
    maxZ: origin.z + 4.5,
    maxY: origin.y + 3.5,
    label: 'Meja Perjamuan Agung',
  });

  const warMap = createImperialWarTableMesh();
  warMap.position.set(-16.0, 0, 0);
  warMap.rotation.y = Math.PI / 2;
  rootGroup.add(warMap);
  colliders.push({
    type: 'box',
    minX: origin.x - 18.0,
    maxX: origin.x - 14.0,
    minZ: origin.z - 3.5,
    maxZ: origin.z + 3.5,
    maxY: origin.y + 3.5,
    label: 'Meja Dewan Kekaisaran',
  });

  // Chest in Imperial Treasury Corner + Royal NPC
  const chest = createChestProp('chest_astraea_palace', -22.5, 0, -32.0, origin, colliders);
  rootGroup.add(chest.group);

  const emperorNPC = createCustomNPCMesh('emperor');
  emperorNPC.position.set(0, 1.4, -31.0);
  emperorNPC.rotation.y = 0;
  rootGroup.add(emperorNPC);

  const stewardNPC = createCustomNPCMesh('marshal');
  stewardNPC.position.set(5.5, 0, 12.0);
  stewardNPC.rotation.y = -Math.PI / 4;
  rootGroup.add(stewardNPC);

  // Decorative wood benches on Balcony Lantai 2
  for (const bx of [-23.5, 23.5]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 3.2), woodMat);
    bench.position.set(bx, balcY + 0.32, -8.0);
    rootGroup.add(bench);
  }

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
        position: [origin.x + 5.5, origin.y, origin.z + 12.0],
        dialogueId: 'marshal_vane',
        icon: '📜',
      },
    ],
    chests: [chest],
    ambientSkyHex: 0xfef3c7,
    ambientGroundHex: 0x475569,
    ambientIntensity: 0.95,
    hemiIntensity: 1.15,
    dirIntensity: 1.0,
    bgHex: 0x1e293b,
    fogHex: 0x1e293b,
    animatedParts: [],
    getFallbackFloorY: () => origin.y,
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: (wy) => (wy - origin.y >= 4.2 ? 'Lantai 2: Balkon Emas Kekaisaran' : 'Lantai 1: Singgasana Kaisar'),
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
  const d = 76;
  const h = 20.0;
  const ivoryMarble = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.24, metalness: 0.06 });
  const warmSandstone = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.45 });
  const turquoiseTile = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.22, metalness: 0.25 });
  const lapisAccent = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.28, metalness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.18, metalness: 0.9 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
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

  // Exotic Turquoise Mosaic Floor Frame around Central Pool
  const mosaicFrame = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.04, 34.0), turquoiseTile);
  mosaicFrame.position.set(0, 0.02, 4.0);
  mosaicFrame.userData.nonWalkable = true;
  rootGroup.add(mosaicFrame);

  // Crystal-Clear Central Reflecting Pool (Width 7.2 x Length 28.0) with Marble Curb
  const poolBasin = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.32, 28.4), whiteRim(goldMat));
  poolBasin.position.set(0, 0.16, 4.0);
  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 27.6), poolWaterMat);
  poolWater.rotation.x = -Math.PI / 2;
  poolWater.position.set(0, 0.35, 4.0);
  rootGroup.add(poolBasin, poolWater);

  // Keep player safely around reflecting pool edges (walkable gold walkways on East & West + North & South!)
  colliders.push({
    type: 'box',
    minX: origin.x - 3.6,
    maxX: origin.x + 3.6,
    minZ: origin.z + 4.0 - 14.0,
    maxZ: origin.z + 4.0 + 14.0,
    maxY: origin.y + 1.5,
    label: 'Kolam Refleksi Air Istana Sultan',
  });

  // High Exotic Turquoise-and-Gold Arabian Onion Dome Vault overhead
  const domeHalo = new THREE.Mesh(new THREE.TorusGeometry(15.0, 0.85, 10, 32), goldMat);
  domeHalo.rotation.x = Math.PI / 2;
  domeHalo.position.set(0, h - 0.35, 0);
  const arabDome = new THREE.Mesh(
    new THREE.SphereGeometry(15.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x0f766e, side: THREE.BackSide })
  );
  arabDome.position.set(0, h - 0.3, 0);
  arabDome.scale.set(1, 0.45, 1);
  rootGroup.add(domeHalo, arabDome);

  // Persian Carpets surrounding the Reflecting Pool & Leading to Sultan Throne
  const carpetNorth = createCarpetMesh(9.0, 12.0, 0x991b1b, 0xfbbf24);
  carpetNorth.position.set(0, 0, -16.5);
  const carpetEast = createCarpetMesh(5.5, 28.0, 0x0f766e, 0xfbbf24);
  carpetEast.position.set(8.8, 0, 4.0);
  const carpetWest = createCarpetMesh(5.5, 28.0, 0x991b1b, 0xfbbf24);
  carpetWest.position.set(-8.8, 0, 4.0);
  rootGroup.add(carpetNorth, carpetEast, carpetWest);

  // Stepped Sultan Dais & Ornate Golden Throne at North End
  addStaircase(rootGroup, 15.0, 4, 0, 1.5, -21.5, -25.5, 0, ivoryMarble, goldMat, goldMat);
  addWalkableSlab(rootGroup, 22.0, 1.5, 12.0, 0, 0.75, -31.5, ivoryMarble, 'Podium Singgasana Sultan');

  const sultanThrone = createImperialThroneMesh();
  sultanThrone.scale.set(1.4, 1.35, 1.4);
  sultanThrone.position.set(0, 1.5, -33.5);
  rootGroup.add(sultanThrone);
  colliders.push({
    type: 'box',
    minX: origin.x - 2.0,
    maxX: origin.x + 2.0,
    minZ: origin.z - 35.5,
    maxZ: origin.z - 32.0,
    label: 'Singgasana Emas Sultan Malik',
  });

  // Colonnade with Sculpted Pointed Islamic Arches (East & West aisles)
  for (const ax of [-13.5, 13.5]) {
    const colZs = [-20, -10, 0, 10, 20, 30];
    colZs.forEach((cz, idx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, h - 1.5, 12), ivoryMarble);
      col.position.set(ax, h * 0.5, cz);
      col.userData.nonWalkable = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.7, 0.85, 8), turquoiseTile);
      cap.position.set(ax, h - 1.5, cz);
      rootGroup.add(col, cap);
      colliders.push({ type: 'circle', x: origin.x + ax, z: origin.z + cz, radius: 0.95, label: 'Pilar Lengkung Istana Sultan' });

      // Pointed Islamic Arch linking adjacent Z columns
      if (idx < colZs.length - 1) {
        const midZ = (cz + colZs[idx + 1]) * 0.5;
        const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 5.4), goldMat);
        archLeft.position.set(ax, 6.2, midZ - 2.1);
        archLeft.rotation.x = 0.42;
        const archRight = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 5.4), goldMat);
        archRight.position.set(ax, 6.2, midZ + 2.1);
        archRight.rotation.x = -0.42;
        const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), lapisAccent);
        keystone.position.set(ax, 7.25, midZ);
        rootGroup.add(archLeft, archRight, keystone);
      }
    });
  }

  // Hanging Golden Arabesque Lanterns down East & West Aisles & Over Pool
  for (const lz of [-15, -5, 5, 15, 25]) {
    for (const lx of [-6.5, 6.5]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 5), goldMat);
      chain.position.set(lx, h - 2.1, lz);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.65), lanternGlow);
      lamp.position.set(lx, h - 4.2, lz);
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.48, 1.1, 6, 1, true), goldMat);
      cage.position.set(lx, h - 4.2, lz);
      rootGroup.add(chain, lamp, cage);
    }
  }

  // Upper Walkable Mezzanine Galleries (Balkon Galeri Lantai Atas Y = 5.6) + Twin Staircases
  const galY = 5.6;
  addWalkableSlab(rootGroup, 8.0, 0.45, 64.0, -23.5, galY - 0.225, -4.0, warmSandstone, 'Galeri Atas Barat Istana Sultan');
  addWalkableSlab(rootGroup, 8.0, 0.45, 64.0, 23.5, galY - 0.225, -4.0, warmSandstone, 'Galeri Atas Timur Istana Sultan');
  addWalkableSlab(rootGroup, 40.0, 0.45, 6.0, 0, galY - 0.225, -34.5, warmSandstone, 'Galeri Atas Utara Istana Sultan');

  for (const gx of [-19.6, 19.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 62.0), goldMat);
    rail.position.set(gx, galY + 0.5, -3.0);
    rail.userData.nonWalkable = true;
    rootGroup.add(rail);
    colliders.push({
      type: 'box',
      minX: origin.x + gx - 0.25,
      maxX: origin.x + gx + 0.25,
      minZ: origin.z - 32.0,
      maxZ: origin.z + 28.0,
      minY: origin.y + galY - 0.5,
      maxY: origin.y + galY + 3.0,
      label: 'Pagar Galeri Atas Istana',
    });
  }

  addStaircase(rootGroup, 4.2, 16, 0, galY, 34.0, 23.0, -23.5, ivoryMarble, goldMat, turquoiseTile);
  addStaircase(rootGroup, 4.2, 16, 0, galY, 34.0, 23.0, 23.5, ivoryMarble, goldMat, turquoiseTile);

  // Chest & NPCs inside Sultan Palace
  const chest = createChestProp('chest_sultan_interior', 22.0, 0, -30.0, origin, colliders);
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
    ambientIntensity: 0.95,
    hemiIntensity: 1.15,
    dirIntensity: 1.0,
    bgHex: 0x162438,
    fogHex: 0x162438,
    animatedParts: [],
    getFallbackFloorY: () => origin.y,
    getFloorHeight: (wx, wy, wz) => sampleRoomFloorHeight(room, wx, wy, wz),
    getFloorLabel: (wy) => (wy - origin.y >= 4.4 ? 'Lantai 2: Galeri Atas Istana Sultan' : 'Lantai 1: Aula Kolam Refleksi'),
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

  const slateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.18 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.88, flatShading: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x451a03, flatShading: true });
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

  // -----------------------------------------------------------
  // FLOOR 0 (localY = -14): ARCANE BASEMENT & VAULT
  // -----------------------------------------------------------
  const f0Y = -floorStep;
  const floor0Mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.5, 32), darkStone);
  floor0Mesh.position.y = f0Y - 0.25;
  floor0Mesh.receiveShadow = true;
  floor0Mesh.userData.walkableSurface = true;
  rootGroup.add(floor0Mesh);

  const wall0 = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x17142e, roughness: 0.9, side: THREE.DoubleSide })
  );
  wall0.position.y = f0Y + floorStep * 0.5;
  wall0.userData.nonWalkable = true;
  rootGroup.add(wall0);

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

  const wall1 = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, side: THREE.DoubleSide })
  );
  wall1.position.y = f1Y + floorStep * 0.5;
  wall1.userData.nonWalkable = true;
  rootGroup.add(wall1);

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

  const wall2 = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, side: THREE.DoubleSide })
  );
  wall2.position.y = f2Y + floorStep * 0.5;
  wall2.userData.nonWalkable = true;
  rootGroup.add(wall2);

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

  const wall3 = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, floorStep, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.85, side: THREE.DoubleSide })
  );
  wall3.position.y = f3Y + floorStep * 0.5;
  wall3.userData.nonWalkable = true;
  rootGroup.add(wall3);

  // Starry Glass Observatory Dome overhead
  const starDome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
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

  // Continuous Walkable Arcane Spiral Staircases connecting all 4 floors on West Arc (r=11.5..14.5)
  addTowerSpiralStairs(rootGroup, colliders, origin, f0Y, f1Y, 11.5, 14.5, -1.10, 1.10, 28, darkStone, goldMat);
  addTowerSpiralStairs(rootGroup, colliders, origin, f1Y, f2Y, 11.5, 14.5, -1.10, 1.10, 28, slateMat, goldMat);
  addTowerSpiralStairs(rootGroup, colliders, origin, f2Y, f3Y, 11.5, 14.5, -1.10, 1.10, 28, darkStone, goldMat);

  // Glowing GTA Floor Teleport Portals between all 4 floors (East / North-East perimeter, clear of spiral stairs)
  const portals: InteriorPortalDef[] = [];
  const addFloorPortal = (
    pid: string,
    label: string,
    promptText: string,
    toastText: string,
    mx: number,
    my: number,
    mz: number,
    sx: number,
    sy: number,
    sz: number,
    rotY: number,
    colorHex: number,
    targetRoomId: string | null,
    kind: 'floor' | 'exit'
  ) => {
    const marker = createDoorMarkerMesh(pid, colorHex);
    marker.group.position.set(mx, my, mz);
    rootGroup.add(marker.group);
    portals.push({
      id: pid,
      roomId: 'mage_tower_interior',
      kind,
      label,
      promptText,
      toastText,
      targetRoomId,
      markerPos: { x: origin.x + mx, y: origin.y + my, z: origin.z + mz },
      spawnPos: { x: origin.x + sx, y: origin.y + sy, z: origin.z + sz, rotationY: rotY },
      triggerRadius: 2.8,
      autoRadius: 1.35,
      colorHex,
      markerMesh: marker.group,
      arrowGroup: marker.arrowGroup,
      outerRing: marker.outerRing,
      innerDisc: marker.innerDisc,
    });
  };

  // Floor 1 -> Basement (Floor 0) & Floor 0 -> Floor 1
  addFloorPortal(
    'mt_f1_to_f0',
    'Turun ke Bawah Tanah (Arcane Vault)',
    'Turun ke Basement Arcane Vault (E / Ketuk)',
    'Basement: Arcane Vault',
    11.5, f1Y, 9.5,
    0, f0Y + 0.05, -6.5, 0,
    0xa855f7,
    'mage_tower_interior',
    'floor'
  );
  addFloorPortal(
    'mt_f0_to_f1',
    'Naik ke Lantai 1 (Perpustakaan Agung)',
    'Naik ke Lantai 1 Perpustakaan (E / Ketuk)',
    'Lantai 1: Aula Utama & Perpustakaan Agung',
    0, f0Y, -12.0,
    7.5, f1Y + 0.05, 8.0, Math.PI * 0.75,
    0x38bdf8,
    'mage_tower_interior',
    'floor'
  );

  // Floor 1 -> Floor 2 & Floor 2 -> Floor 1
  addFloorPortal(
    'mt_f1_to_f2',
    'Naik ke Lantai 2 (Lab & Ruang Latihan)',
    'Naik ke Lantai 2 Lab & Latihan (E / Ketuk)',
    'Lantai 2: Lab & Ruang Latihan',
    11.5, f1Y, -9.5,
    7.0, f2Y + 0.05, -7.5, Math.PI * 0.25,
    0x38bdf8,
    'mage_tower_interior',
    'floor'
  );
  addFloorPortal(
    'mt_f2_to_f1',
    'Turun ke Lantai 1 (Perpustakaan Agung)',
    'Turun ke Lantai 1 Perpustakaan (E / Ketuk)',
    'Lantai 1: Aula Utama & Perpustakaan Agung',
    11.5, f2Y, 9.5,
    7.5, f1Y + 0.05, -7.5, -Math.PI * 0.25,
    0xa855f7,
    'mage_tower_interior',
    'floor'
  );

  // Floor 2 -> Floor 3 & Floor 3 -> Floor 2
  addFloorPortal(
    'mt_f2_to_f3',
    'Naik ke Lantai 3 (Puncak Observatorium)',
    'Naik ke Lantai 3 Observatorium (E / Ketuk)',
    'Lantai 3: Observatorium Agung',
    11.5, f2Y, -9.5,
    0, f3Y + 0.05, -7.5, 0,
    0x38bdf8,
    'mage_tower_interior',
    'floor'
  );
  addFloorPortal(
    'mt_f3_to_f2',
    'Turun ke Lantai 2 (Lab & Ruang Latihan)',
    'Turun ke Lantai 2 Lab & Latihan (E / Ketuk)',
    'Lantai 2: Lab & Ruang Latihan',
    10.5, f3Y, -10.5,
    7.0, f2Y + 0.05, -7.5, -Math.PI * 0.75,
    0xa855f7,
    'mage_tower_interior',
    'floor'
  );

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
    ambientGroundHex: 0x312e81,
    ambientIntensity: 0.92,
    hemiIntensity: 1.15,
    dirIntensity: 1.0,
    bgHex: 0x171c36,
    fogHex: 0x171c36,
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
      if (localY >= f3Y - 5) return 'Lantai 3: Observatorium Agung';
      if (localY >= f2Y - 5) return 'Lantai 2: Lab & Ruang Latihan';
      if (localY >= f1Y - 5) return 'Lantai 1: Perpustakaan Agung';
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
