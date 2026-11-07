import * as THREE from 'three';
import { createInstancedStreetLamps, createDesertOilLanternMesh } from './3d/models';
import { WorldCollider } from './3d/world';

export type RoadBiomeType = 'plains' | 'desert';

export interface RoadRouteDef {
  id: string;
  name: string;
  biome: RoadBiomeType;
  width: number;
  controlPoints: [number, number][]; // [X, Z] waypoints
  colorHex: number;
  canvasStroke: string;
  canvasDash: number[];
  canvasWidth: number;
}

export interface RoadJunctionDef {
  id: string;
  name: string;
  pos: [number, number]; // [X, Z]
  signDirections: Array<{ label: string; angle: number }>;
}

/**
 * 1. TATA LETAK RUTE EKSPLISIT (WAYPOINT ARRAY)
 * - Rute Barat memutar jauh di selatan Danau Titan (Z: 45) dan masuk tepat ke gerbang barat Astraea [-370..-345, -220].
 * - Rute Timur melintasi dek kayu jembatan gantung lurus [136..154, 47] dan masuk ke gerbang benteng Val-Kragor [355..375, 80].
 * - Sanctuary: Satu jalan lurus utama dari pelabuhan [0, 205] ke gerbang gapura [0, 168] hingga persimpangan [0, 155].
 * - Gurun Solaria: Jalur lurus Bazaar [240, -280] ke Istana Sultan [330, -280].
 */
export const ROAD_ROUTE_DEFS: RoadRouteDef[] = [
  // A. JALUR UTAMA DESA SANCTUARY & PELABUHAN
  {
    id: 'sanctuary_artery',
    name: 'Jalan Utama Desa Sanctuary & Pelabuhan',
    biome: 'plains',
    width: 3.5,
    controlPoints: [
      [0, 205],
      [0, 192],
      [0, 180],
      [0, 168],
      [0, 155],
    ],
    colorHex: 0x6e6255, // Batu tanah cokelat abu-abu medieval padat
    canvasStroke: '#a3917a',
    canvasDash: [],
    canvasWidth: 3.0,
  },

  // B. JALUR BARAT (MENUJU IBUKOTA ASTRAEA - MEMUTARI ARENA TITAN)
  {
    id: 'plains_west_astraea',
    name: 'Jalan Raya Kerajaan Barat Sanctuary - Ibukota Astraea',
    biome: 'plains',
    width: 3.5,
    controlPoints: [
      [0, 155],
      [-60, 140],
      [-130, 100],
      [-190, 60],
      [-260, 45], // 65m di selatan Danau Titan [-260, -20]
      [-320, 20],
      [-360, -60],
      [-370, -140],
      [-370, -220], // Di depan lubang gerbang barat
      [-345, -220], // Menembus lubang gerbang gapura tepat di tengah
      [-335, -220], // Masuk ke pelataran air mancur istana kaisar
    ],
    colorHex: 0x6e6255, // Batu tanah cokelat abu-abu medieval padat
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.8,
  },

  // C. JALUR TIMUR (MENUJU BENTENG VAL-KRAGOR VIA JEMBATAN GANTUNG)
  {
    id: 'plains_east_valkragor',
    name: 'Jalan Raya Timur Sanctuary - Jembatan Gantung - Benteng Val-Kragor',
    biome: 'plains',
    width: 3.5,
    controlPoints: [
      [0, 155],
      [50, 130],
      [95, 90],
      [125, 60],
      [136, 47], // Masuk lurus ke bibir barat jembatan gantung
      [154, 47], // Menyeberang dek kayu jembatan gantung lurus
      [170, 47], // Keluar jembatan menyambung langsung
      [185, 50], // Melengkung di luar pilar kristal halaman Mage Tower
      [225, 55],
      [290, 65],
      [330, 75],
      [355, 80], // Melewati celah gerbang benteng tepat di tengah
      [375, 80], // Masuk ke pelataran dalam benteng
    ],
    colorHex: 0x6e6255, // Batu tanah cokelat abu-abu medieval padat
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.8,
  },

  // D. JALUR GURUN SOLARIA (BAZAAR KE ISTANA SULTAN)
  {
    id: 'desert_bazaar_palace',
    name: 'Jalur Pasir Padat Bazaar Solaria - Istana Taj Mahal Sultan',
    biome: 'desert',
    width: 3.5,
    controlPoints: [
      [240, -280],
      [285, -280],
      [330, -280],
    ],
    colorHex: 0xd1b480, // Pasir padat keemasan (#d1b480)
    canvasStroke: '#fde047',
    canvasDash: [],
    canvasWidth: 3.2,
  },
];

/**
 * Persimpangan Jalan Utama & Papan Petunjuk Arah
 */
export const ROAD_JUNCTIONS: RoadJunctionDef[] = [
  {
    id: 'jct_crossroad_main',
    name: 'Persimpangan Utama Luar Gerbang Sanctuary',
    pos: [0, 155],
    signDirections: [
      { label: '<- Ibukota Astraea', angle: -Math.PI * 0.72 },
      { label: 'Benteng Val-Kragor ->', angle: 0.18 },
      { label: 'v Desa Sanctuary & Pelabuhan', angle: Math.PI * 0.5 },
    ],
  },
  {
    id: 'jct_bridge_west',
    name: 'Pangkal Barat Jembatan Gantung',
    pos: [136, 47],
    signDirections: [
      { label: 'Benteng Val-Kragor & Mage Tower ->', angle: 0.0 },
      { label: '<- Desa Sanctuary', angle: Math.PI },
    ],
  },
  {
    id: 'jct_valkragor_gate',
    name: 'Gerbang Masuk Benteng Val-Kragor',
    pos: [355, 80],
    signDirections: [
      { label: 'Masuk Alun-Alun Benteng ->', angle: 0.0 },
      { label: '<- Jembatan Gantung & Sanctuary', angle: Math.PI },
    ],
  },
  {
    id: 'jct_astraea_gate',
    name: 'Gerbang Masuk Barat Ibukota Astraea',
    pos: [-370, -220],
    signDirections: [
      { label: 'Masuk Alun-Alun Istana Astraea ->', angle: 0.0 },
      { label: '<- Desa Sanctuary & Padang Rumput', angle: Math.PI * 0.5 },
    ],
  },
  {
    id: 'jct_bazaar_gate',
    name: 'Gerbang Pasar Bazaar Gurun Solaria',
    pos: [240, -280],
    signDirections: [
      { label: 'Istana Taj Mahal Sultan Malik ->', angle: 0.0 },
      { label: '<- Pasar Bazaar Solaria', angle: Math.PI },
    ],
  },
];

export interface SampledRoad {
  def: RoadRouteDef;
  curve: THREE.CatmullRomCurve3;
  points: THREE.Vector3[]; // Dense spline points spaced ~1.4 units
  points2D: [number, number][]; // [X, Z] for 2D map
  coarsePoints2D: [number, number][]; // [X, Z] spaced ~3.5 units for fast collision
  bbox: { minX: number; maxX: number; minZ: number; maxZ: number };
}

let cachedSampledRoads: SampledRoad[] | null = null;

export function getSampledRoads(): SampledRoad[] {
  if (cachedSampledRoads) return cachedSampledRoads;

  cachedSampledRoads = ROAD_ROUTE_DEFS.map((route) => {
    const v3s = route.controlPoints.map((p) => new THREE.Vector3(p[0], 0, p[1]));
    const curve = new THREE.CatmullRomCurve3(v3s, false, 'centripetal');
    const length = curve.getLength();

    // 1. DENSE CURVE SAMPLING (setiap interval ~1.2 s/d 1.5 unit, misal 150-300 titik per rute)
    const divisions = Math.max(8, Math.floor(length / 1.4));
    const points = curve.getSpacedPoints(divisions);
    const points2D: [number, number][] = points.map((p) => [p.x, p.z]);

    // 2. Coarse points for fast O(1) collision query (step ~3.5 units)
    const coarseDivisions = Math.max(4, Math.floor(length / 3.5));
    const coarsePoints = curve.getSpacedPoints(coarseDivisions);
    const coarsePoints2D: [number, number][] = coarsePoints.map((p) => [p.x, p.z]);

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const pad = route.width * 0.5 + 2.0;

    return {
      def: route,
      curve,
      points,
      points2D,
      coarsePoints2D,
      bbox: {
        minX: minX - pad,
        maxX: maxX + pad,
        minZ: minZ - pad,
        maxZ: maxZ + pad,
      },
    };
  });

  return cachedSampledRoads;
}

// Distance from point (px, pz) to line segment (x1, z1)-(x2, z2) squared
function distToSegmentSq(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return (px - x1) * (px - x1) + (pz - z1) * (pz - z1);
  let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const ex = px - (x1 + t * dx);
  const ez = pz - (z1 + t * dz);
  return ex * ex + ez * ez;
}

/**
 * 3. CLEARING VEGETASI & ASSET & VELOCITY BOOST
 * Helper ultra-cepat untuk mendeteksi apakah suatu titik (x, z) berada di atas jalan.
 */
export function isPointOnRoad(x: number, z: number): boolean {
  const roads = getSampledRoads();

  for (let r = 0; r < roads.length; r++) {
    const road = roads[r];
    // Quick AABB test first
    if (x < road.bbox.minX || x > road.bbox.maxX || z < road.bbox.minZ || z > road.bbox.maxZ) {
      continue;
    }

    const thresholdSq = Math.pow(road.def.width * 0.5 + 0.6, 2);
    const pts = road.coarsePoints2D;

    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegmentSq(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= thresholdSq) {
        return true;
      }
    }
  }

  return false;
}

/**
 * CONTINUOUS RIBBON STRIP DENGAN DENSE SAMPLING & BEBAS Z-FIGHTING
 * Membangun pita geometri tunggal bersambung:
 * - DENSE SAMPLING: Titik-titik dievaluasi setiap ~1.4 unit mengikuti kurva spline Catmull-Rom.
 * - Tangent & normal horizontal dihitung di setiap titik untuk quad strip selebar 3.5 unit.
 * - Offset +0.08 unit di atas tanah menjamin jalan tidak pernah tenggelam di medan berbukit.
 * - Pada bentang jembatan gantung [136..154, 47], ketinggian vertex dikunci rata dengan dek kayu (Y = 1.35).
 * - Material solid dengan polygonOffset (factor: -3, units: -3) agar renderer GPU memprioritaskan render jalan di atas tanah.
 */
function createContinuousRibbonMesh(
  points: THREE.Vector3[],
  width: number,
  yFunc: (x: number, z: number) => number,
  biome: RoadBiomeType
): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const halfW = width * 0.5;

  let totalDist = 0;

  for (let i = 0; i < points.length; i++) {
    const cur = points[i];

    let dx = 0;
    let dz = 0;
    if (i < points.length - 1) {
      dx = points[i + 1].x - cur.x;
      dz = points[i + 1].z - cur.z;
    } else {
      dx = cur.x - points[i - 1].x;
      dz = cur.z - points[i - 1].z;
    }
    const len = Math.hypot(dx, dz) || 1;
    if (i > 0) totalDist += Math.hypot(cur.x - points[i - 1].x, cur.z - points[i - 1].z);

    const nx = -dz / len;
    const nz = dx / len;

    const leftX = cur.x + nx * halfW;
    const leftZ = cur.z + nz * halfW;
    const rightX = cur.x - nx * halfW;
    const rightZ = cur.z - nz * halfW;

    // Offset +0.08 unit di atas tanah menjamin jalan tidak akan pernah tenggelam di medan berbukit
    let leftY = yFunc(leftX, leftZ) + 0.08;
    let rightY = yFunc(rightX, rightZ) + 0.08;

    // KONEKSI MULUS DI JEMBATAN GANTUNG:
    // Pada bentang jembatan [136, 47] s/d [154, 47], ketinggian vertex jalan dikunci rata dengan dek kayu jembatan (Y = 1.35)
    if (Math.abs(cur.z - 47) <= 2.8 && cur.x >= 135.5 && cur.x <= 154.5) {
      leftY = 1.35 + 0.02;
      rightY = 1.35 + 0.02;
    }

    positions.push(leftX, leftY, leftZ, rightX, rightY, rightZ);
    uvs.push(0, totalDist / 3.2, 1, totalDist / 3.2);

    // Quad Strip Triangles
    if (i < points.length - 1) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v2, v1, v3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const isPlains = biome === 'plains';
  const mat = new THREE.MeshStandardMaterial({
    color: isPlains ? 0x6e6255 : 0xd1b480, // Batu tanah cokelat abu-abu (#6e6255) / Pasir padat (#d1b480)
    roughness: isPlains ? 0.95 : 0.92,
    metalness: 0.05,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Papan Petunjuk Arah Kayu Abad Pertengahan
 */
export function createRoadSignpostMesh(junction: RoadJunctionDef): THREE.Group {
  const group = new THREE.Group();
  group.name = `Signpost_${junction.id}`;

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x4a3525,
    roughness: 0.85,
    metalness: 0.05,
  });
  const plankMat = new THREE.MeshStandardMaterial({
    color: 0xa07855,
    roughness: 0.8,
    metalness: 0.05,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2b2d42,
    roughness: 0.6,
    metalness: 0.8,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.9,
  });

  const baseMound = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.25, 7), stoneMat);
  baseMound.position.y = 0.12;
  group.add(baseMound);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 6), woodMat);
  post.position.y = 1.25;
  post.castShadow = true;
  group.add(post);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 5), ironMat);
  cap.position.y = 2.6;
  group.add(cap);

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.04), ironMat);
  bracket.position.set(0.18, 2.45, 0);
  group.add(bracket);

  const lanternGlow = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xffecb3 })
  );
  lanternGlow.position.set(0.32, 2.3, 0);
  group.add(lanternGlow);

  junction.signDirections.forEach((dir, idx) => {
    const armGroup = new THREE.Group();
    armGroup.position.y = 1.55 + idx * 0.26;
    armGroup.rotation.y = dir.angle;

    const plankLength = 0.95;
    const plankHeight = 0.22;
    const plankDepth = 0.05;

    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(plankLength, plankHeight, plankDepth),
      plankMat
    );
    plank.position.x = plankLength / 2 + 0.08;
    plank.castShadow = true;
    armGroup.add(plank);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.24, 3), plankMat);
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(plankLength + 0.16, 0, 0);
    armGroup.add(tip);

    const nail1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 4), ironMat);
    nail1.position.set(0.2, 0, plankDepth / 2 + 0.005);
    const nail2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 4), ironMat);
    nail2.position.set(0.35, 0, plankDepth / 2 + 0.005);
    armGroup.add(nail1, nail2);

    group.add(armGroup);
  });

  return group;
}

/**
 * IMPLEMENTASI 3D CONTINUOUS ROAD STRIP (world.ts)
 */
export function buildWorldRoadNetwork(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number) => number,
  colliders: WorldCollider[]
): THREE.Group {
  const roadSystemGroup = new THREE.Group();
  roadSystemGroup.name = 'Eldoria_Road_Network';

  const roads = getSampledRoads();
  const streetLampsData: { x: number; y: number; z: number }[] = [];

  // 1. Bangun Mesh Pita Jalan Bersambung (Continuous Ribbon Mesh)
  roads.forEach((road) => {
    // Grand Sandstone Desert Avenue sudah dibangun secara khusus di world.ts
    if (road.def.id === 'desert_bazaar_palace') return;

    const ribbonMesh = createContinuousRibbonMesh(
      road.points,
      road.def.width,
      getTerrainHeight,
      road.def.biome
    );
    roadSystemGroup.add(ribbonMesh);

    // 2. Lentera Tepi Jalan setiap ~45 unit
    const isPlains = road.def.biome === 'plains';
    for (let i = 0; i < road.points.length - 1; i++) {
      if (i > 0 && i % 32 === 0) {
        const cur = road.points[i];
        const next = road.points[i + 1];
        const dx = next.x - cur.x;
        const dz = next.z - cur.z;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        const side = i % 2 === 0 ? 1 : -1;

        const lampX = cur.x + nx * (road.def.width * 0.5 + 1.2) * side;
        const lampZ = cur.z + nz * (road.def.width * 0.5 + 1.2) * side;
        const lampY = getTerrainHeight(lampX, lampZ);

        if (!isPlains) {
          const lanternMesh = createDesertOilLanternMesh();
          lanternMesh.position.set(lampX, lampY, lampZ);
          roadSystemGroup.add(lanternMesh);
          colliders.push({
            type: 'circle',
            x: lampX,
            z: lampZ,
            radius: 0.35,
            label: 'Lentera Tepi Jalan Gurun',
          });
        } else {
          streetLampsData.push({ x: lampX, y: lampY, z: lampZ });
          colliders.push({
            type: 'circle',
            x: lampX,
            z: lampZ,
            radius: 0.35,
            label: 'Lentera Tepi Jalan',
          });
        }
      }
    }
  });

  if (streetLampsData.length > 0) {
    const instancedLamps = createInstancedStreetLamps(streetLampsData);
    roadSystemGroup.add(instancedLamps);
  }

  // 3. Papan Penunjuk Arah (Signposts) di Persimpangan Jalan Utama
  ROAD_JUNCTIONS.forEach((jct) => {
    const signX = jct.pos[0] + 2.8;
    const signZ = jct.pos[1] + 2.8;
    const signY = getTerrainHeight(signX, signZ);

    const signMesh = createRoadSignpostMesh(jct);
    signMesh.position.set(signX, signY, signZ);
    roadSystemGroup.add(signMesh);

    colliders.push({
      type: 'circle',
      x: signX,
      z: signZ,
      radius: 0.5,
      label: `Plang Arah: ${jct.name}`,
    });
  });

  scene.add(roadSystemGroup);
  return roadSystemGroup;
}

/**
 * 2D CANVAS RENDERING UNTUK PETA BENUA (WorldMapModal.tsx)
 */
export function drawRoadsOnWorldMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number
): void {
  const roads = getSampledRoads();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Bayangan dasar
  roads.forEach((road) => {
    if (road.points2D.length < 2) return;
    ctx.beginPath();
    const p0 = road.points2D[0];
    const sx0 = ((p0[0] - minX) / (maxX - minX)) * width;
    const sy0 = ((p0[1] - minZ) / (maxZ - minZ)) * height;
    ctx.moveTo(sx0, sy0);

    for (let i = 1; i < road.points2D.length; i++) {
      const p = road.points2D[i];
      const sx = ((p[0] - minX) / (maxX - minX)) * width;
      const sy = ((p[1] - minZ) / (maxZ - minZ)) * height;
      ctx.lineTo(sx, sy);
    }

    ctx.strokeStyle = 'rgba(20, 20, 20, 0.45)';
    ctx.lineWidth = road.def.canvasWidth + 2.0;
    ctx.stroke();
  });

  // 2. Garis jalan utama
  roads.forEach((road) => {
    if (road.points2D.length < 2) return;
    ctx.beginPath();
    const p0 = road.points2D[0];
    const sx0 = ((p0[0] - minX) / (maxX - minX)) * width;
    const sy0 = ((p0[1] - minZ) / (maxZ - minZ)) * height;
    ctx.moveTo(sx0, sy0);

    for (let i = 1; i < road.points2D.length; i++) {
      const p = road.points2D[i];
      const sx = ((p[0] - minX) / (maxX - minX)) * width;
      const sy = ((p[1] - minZ) / (maxZ - minZ)) * height;
      ctx.lineTo(sx, sy);
    }

    ctx.strokeStyle = road.def.canvasStroke;
    ctx.lineWidth = road.def.canvasWidth;
    ctx.setLineDash(road.def.canvasDash);
    ctx.stroke();
  });

  // 3. Simpul persimpangan
  ctx.setLineDash([]);
  ROAD_JUNCTIONS.forEach((jct) => {
    const sx = ((jct.pos[0] - minX) / (maxX - minX)) * width;
    const sy = ((jct.pos[1] - minZ) / (maxZ - minZ)) * height;

    ctx.beginPath();
    ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx, sy, 5.0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * 2D CANVAS RENDERING UNTUK MINIMAP (MiniMap.tsx)
 */
export function drawRoadsOnMiniMap(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerZ: number,
  radarRadius: number,
  canvasSize: number
): void {
  const roads = getSampledRoads();
  const halfSize = canvasSize / 2;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  roads.forEach((road) => {
    if (
      playerX + radarRadius < road.bbox.minX ||
      playerX - radarRadius > road.bbox.maxX ||
      playerZ + radarRadius < road.bbox.minZ ||
      playerZ - radarRadius > road.bbox.maxZ
    ) {
      return;
    }

    ctx.beginPath();
    let hasStarted = false;

    for (let i = 0; i < road.points2D.length; i++) {
      const p = road.points2D[i];
      const dx = p[0] - playerX;
      const dz = p[1] - playerZ;

      const mx = halfSize + (dx / radarRadius) * halfSize;
      const my = halfSize + (dz / radarRadius) * halfSize;

      if (!hasStarted) {
        ctx.moveTo(mx, my);
        hasStarted = true;
      } else {
        ctx.lineTo(mx, my);
      }
    }

    if (hasStarted) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = road.def.canvasWidth + 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      ctx.strokeStyle = road.def.canvasStroke;
      ctx.lineWidth = Math.max(1.8, road.def.canvasWidth * 0.9);
      ctx.setLineDash(road.def.canvasDash.length > 0 ? [5, 3] : []);
      ctx.stroke();
    }
  });

  ctx.restore();
}
