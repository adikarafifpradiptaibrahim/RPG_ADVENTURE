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
  pos: [number, number]; // [X, Z] waypoint intersection
  signPos: [number, number]; // [X, Z] exact signpost world position beside the road
  signDirections: Array<{ label: string; angle: number }>;
}

/**
 * 1. TATA LETAK RUTE EKSPLISIT (WAYPOINT ARRAY)
 * Sesuai panduan "ROAD & PATHWAY DESIGN GUIDE - CHRONICLES OF ELDORIA":
 * - Jalan raya antarkota TIDAK memotong ke dalam pelataran istana atau benteng.
 * - Gerbang Astraea: Kunci tepat di depan pintu luar West Gatehouse [X: -365, Z: -220].
 * - Gerbang Val-Kragor: Kunci tepat di depan pintu luar gerbang benteng slate [X: 350, Z: 80].
 * - Desa Sanctuary: Rute pelabuhan berhenti di tangga alun-alun [0, 192]. Alun-alun tengah
 *   menggunakan pelataran batu melingkar desa. Jalan luar dimulai dari gapura utara [0, 168].
 * - Jembatan Gantung: Menghubungkan lurus [136, 47] ke [154, 47] pada dek kayu Y = 1.35.
 * - Gurun Solaria: Jalur kafilah lebar 4.5 unit dari Bazaar [238, -280] ke Istana Sultan [330, -280].
 */
export const ROAD_ROUTE_DEFS: RoadRouteDef[] = [
  // A1. JALUR DERMAGA PELABUHAN KE ALUN-ALUN SANCTUARY
  {
    id: 'sanctuary_harbor',
    name: 'Jalan Dermaga Pelabuhan ke Alun-Alun Sanctuary',
    biome: 'plains',
    width: 3.2,
    controlPoints: [
      [20, 175],
      [20, 155],
      [20, 130], // Alun-alun desa sentral
    ],
    colorHex: 0x8c7a65,
    canvasStroke: '#8c7a65',
    canvasDash: [],
    canvasWidth: 3.0,
  },

  // A2. JALUR KELUAR GAPURA UTARA DESA SANCTUARY KE PERSIMPANGAN UTAMA
  {
    id: 'sanctuary_north_artery',
    name: 'Jalan Keluar Gapura Desa Sanctuary ke Persimpangan Luar',
    biome: 'plains',
    width: 3.2,
    controlPoints: [
      [20, 130],
      [20, 110],
      [20, 95], // Menyatu di persimpangan luar desa
    ],
    colorHex: 0x8c7a65,
    canvasStroke: '#8c7a65',
    canvasDash: [],
    canvasWidth: 3.0,
  },

  // B. JALUR BARAT (MENUJU IBUKOTA ASTRAEA & DANAU TITAN)
  {
    id: 'plains_west_astraea',
    name: 'Jalan Raya Kerajaan Barat Sanctuary - Astraea - Danau Titan',
    biome: 'plains',
    width: 3.2,
    controlPoints: [
      [20, 95],
      [-30, 80],
      [-80, 50],
      [-130, 10],
      [-170, -60],
      [-190, -140],
      [-195, -210], // Jembatan 1 - Astraea Highway Stone Bridge
      [-225, -235],
      [-260, -240], // Gerbang Kerajaan Emas Astraea
      [-260, -320],
      [-260, -415], // Lembah Danau Titan Kuno
    ],
    colorHex: 0x8c7a65,
    canvasStroke: '#a3917a',
    canvasDash: [6, 4],
    canvasWidth: 2.8,
  },

  // C. JALUR TIMUR (MENUJU BENTENG VAL-KRAGOR & LEMBAH BATU LUMUT)
  {
    id: 'plains_east_valkragor',
    name: 'Jalan Raya Timur Sanctuary - Jembatan Gantung - Val-Kragor - Lembah Batu Lumut',
    biome: 'plains',
    width: 3.2,
    controlPoints: [
      [20, 95],
      [30, 60],
      [38, 22],   // Jembatan 2 - Central Suspension Bridge
      [70, 20],   // Mage Tower Puncak Halilintar
      [130, 18],
      [190, 15],  // Jembatan 4 - Puing Kastil Stone Arch Bridge
      [230, 15],
      [280, 25],
      [335, 38],  // Jembatan 3 - Val-Kragor Highway Stone Arch Bridge
      [330, 80],  // Gerbang Benteng Val-Kragor
      [380, 50],
      [430, 25],  // Jembatan 5 - Lembah Batu Lumut Stone Arch Bridge
      [475, 20],  // Lembah Batu Lumut
    ],
    colorHex: 0x8c7a65,
    canvasStroke: '#a3917a',
    canvasDash: [6, 4],
    canvasWidth: 2.8,
  },

  // D. JALUR GURUN SOLARIA (OASE - PIRAMIDA - SULTAN PALACE)
  {
    id: 'desert_bazaar_palace',
    name: 'Jalur Kafilah Pasir Gurun Solaria - Oase - Piramida - Istana Sultan',
    biome: 'desert',
    width: 4.5,
    controlPoints: [
      [20, -240],   // Oase Solaria
      [-20, -320],  // Piramida Emas
      [80, -320],
      [170, -340],
      [270, -380],
      [360, -440],  // Istana Sultan Malik
    ],
    colorHex: 0xd9be8b,
    canvasStroke: '#d9be8b',
    canvasDash: [],
    canvasWidth: 3.4,
  },
];

/**
 * Persimpangan Jalan Utama & Papan Petunjuk Arah
 */
export const ROAD_JUNCTIONS: RoadJunctionDef[] = [
  {
    id: 'jct_crossroad_main',
    name: 'Persimpangan Utama Luar Gerbang Sanctuary',
    pos: [20, 95],
    signPos: [22.5, 93.5],
    signDirections: [
      { label: '<- Ibukota Astraea & Danau Titan', angle: -Math.PI * 0.72 },
      { label: 'Benteng Val-Kragor & Jembatan ->', angle: 0.18 },
      { label: 'v Desa Sanctuary & Pelabuhan', angle: Math.PI * 0.5 },
    ],
  },
  {
    id: 'jct_bridge_west',
    name: 'Pangkal Jembatan Gantung',
    pos: [38, 22],
    signPos: [36.0, 19.5],
    signDirections: [
      { label: 'Benteng Val-Kragor & Mage Tower ->', angle: 0.0 },
      { label: '<- Desa Sanctuary', angle: Math.PI },
    ],
  },
  {
    id: 'jct_valkragor_gate',
    name: 'Ambang Luar Gerbang Benteng Val-Kragor',
    pos: [330, 80],
    signPos: [327.5, 83.5],
    signDirections: [
      { label: 'Pintu Gerbang Benteng ->', angle: 0.0 },
      { label: '<- Jembatan Gantung & Sanctuary', angle: Math.PI },
    ],
  },
  {
    id: 'jct_astraea_gate',
    name: 'Gerbang Emas Astraea',
    pos: [-260, -240],
    signPos: [-262.5, -243.5],
    signDirections: [
      { label: 'Gerbang Istana Astraea ->', angle: 0.0 },
      { label: '<- Desa Sanctuary & Padang Rumput', angle: Math.PI * 0.5 },
    ],
  },
  {
    id: 'jct_bazaar_gate',
    name: 'Oase Solaria Crossroads',
    pos: [20, -240],
    signPos: [19.0, -236.5],
    signDirections: [
      { label: 'Istana Sultan Malik ->', angle: 0.0 },
      { label: '<- Oase & Piramida', angle: Math.PI },
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

    // 1. DENSE CURVE SAMPLING (setiap interval ~1.2 s/d 1.5 unit)
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
 * CLEARING VEGETASI & ASSET & VELOCITY BOOST
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
 * Mendeteksi apakah titik berada terlalu dekat dengan jalan (buffer margin).
 * Digunakan agar penempatan vegetasi instanced mesh tidak menabrak jalur pejalan kaki.
 */
export function isPointNearRoad(x: number, z: number, margin = 3.5): boolean {
  const roads = getSampledRoads();

  for (let r = 0; r < roads.length; r++) {
    const road = roads[r];
    if (
      x < road.bbox.minX - margin ||
      x > road.bbox.maxX + margin ||
      z < road.bbox.minZ - margin ||
      z > road.bbox.maxZ + margin
    ) {
      continue;
    }

    const thresholdSq = Math.pow(road.def.width * 0.5 + margin, 2);
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
 * - Kerapatan sampling ~1.4 unit mengikuti kurva spline Catmull-Rom.
 * - Tangent & normal horizontal dihitung di setiap titik untuk quad strip presisi.
 * - Proyeksi ketinggian: vertex.y = getTerrainHeight(x, z) + 0.05.
 * - Pada bentang jembatan gantung [136..154, 47], ketinggian dikunci rata dengan dek kayu (Y = 1.35).
 * - Polygon offset (factor: -3, units: -3) agar renderer GPU memprioritaskan render jalan di atas tanah.
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

    // Requirement 3: vertex.y = getTerrainHeight(x, z) + 0.05
    let leftY = yFunc(leftX, leftZ) + 0.05;
    let rightY = yFunc(rightX, rightZ) + 0.05;

    // KONEKSI MULUS DI JEMBATAN GANTUNG:
    // Pada bentang jembatan [136, 47] s/d [154, 47], ketinggian dikunci rata dengan dek kayu jembatan (Y = 1.35)
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
    color: isPlains ? 0x8c7a65 : 0xd9be8b, // Cokelat hangat (#8c7a65) / Krem pasir padat (#d9be8b)
    roughness: isPlains ? 0.96 : 0.92,
    metalness: 0.04,
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
 * 2A. EFEK BATU KERIKIL & LEMPENGAN BATU CEPER (PLAINS MEDIEVAL COBBLESTONE DIRT TRAIL)
 * Generate instanced mesh berupa lempengan batu ceper pipih (low-poly round pebbles & stone slabs,
 * ukuran acak 0.3 - 0.7 unit, warna abu-abu batu #6b6965) dengan kepadatan 3-5 batu per meter jalan
 * serta batu batas jalan (border stones) di tepian jalan.
 */
function createCobblestoneDetailMesh(
  roads: SampledRoad[],
  yFunc: (x: number, z: number) => number
): THREE.InstancedMesh {
  const stoneGeo = new THREE.CylinderGeometry(0.48, 0.54, 0.05, 6);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6b6965, // Abu-abu batu (#6b6965)
    roughness: 0.88,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];

  let seed = 42;
  function prng(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  roads.forEach((road) => {
    if (road.def.biome !== 'plains') return;

    const pts = road.points;
    const halfW = road.def.width * 0.5;

    for (let i = 0; i < pts.length - 1; i++) {
      const cur = pts[i];
      const next = pts[i + 1];

      // Jangan spawn batu di atas jembatan gantung (dek kayu murni)
      if (Math.abs(cur.z - 47) <= 3.0 && cur.x >= 135.5 && cur.x <= 154.5) continue;

      const dx = next.x - cur.x;
      const dz = next.z - cur.z;
      const segLen = Math.hypot(dx, dz) || 1;
      const nx = -dz / segLen;
      const nz = dx / segLen;

      // Kepadatan: 3-5 batu per meter jalan
      const numStones = Math.max(3, Math.min(6, Math.round(segLen * 3.6)));

      for (let k = 0; k < numStones; k++) {
        const s = (k + 0.3 + prng() * 0.5) / numStones;
        const cx = cur.x + dx * s;
        const cz = cur.z + dz * s;

        // Sebar acak lempengan batu ceper di permukaan jalan
        const lateral = (prng() - 0.5) * (halfW * 1.55);
        const px = cx + nx * lateral;
        const pz = cz + nz * lateral;
        const py = yFunc(px, pz) + 0.052;

        const stoneSize = 0.32 + prng() * 0.36; // Ukuran acak 0.3 - 0.7 unit
        const stoneHeight = 0.5 + prng() * 0.5;
        const rotY = prng() * Math.PI * 2;

        dummy.position.set(px, py, pz);
        dummy.rotation.set((prng() - 0.5) * 0.06, rotY, (prng() - 0.5) * 0.06);
        dummy.scale.set(stoneSize, stoneHeight, stoneSize);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }

      // Batu batas jalan (border stones) sesekali di tepian kiri-kanan jalan
      if (i % 2 === 0) {
        const side = i % 4 === 0 ? 1 : -1;
        const borderLateral = side * (halfW * 0.94 + prng() * 0.22);
        const bx = cur.x + nx * borderLateral;
        const bz = cur.z + nz * borderLateral;
        const by = yFunc(bx, bz) + 0.054;
        const bSize = 0.42 + prng() * 0.32;

        dummy.position.set(bx, by, bz);
        dummy.rotation.set((prng() - 0.5) * 0.1, prng() * Math.PI * 2, (prng() - 0.5) * 0.1);
        dummy.scale.set(bSize, 0.7 + prng() * 0.5, bSize);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
    }
  });

  const instancedMesh = new THREE.InstancedMesh(stoneGeo, stoneMat, matrices.length);
  for (let m = 0; m < matrices.length; m++) {
    instancedMesh.setMatrixAt(m, matrices[m]);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.receiveShadow = true;
  return instancedMesh;
}

/**
 * 2B. LEMPENGAN BATU PASIR (SANDSTONE PAVERS) DI JALUR GURUN
 * Menaburkan lempengan batu pipih warna pasir bakar (#bfa16a) di dekat area bazaar dan istana sultan.
 */
function createSandstonePaversMesh(
  road: SampledRoad,
  yFunc: (x: number, z: number) => number
): THREE.InstancedMesh {
  const paverGeo = new THREE.CylinderGeometry(0.65, 0.72, 0.05, 7);
  const paverMat = new THREE.MeshStandardMaterial({
    color: 0xbfa16a, // Pasir bakar (#bfa16a)
    roughness: 0.84,
    metalness: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];

  let seed = 137;
  function prng(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const pts = road.points;
  const halfW = road.def.width * 0.5;

  for (let i = 0; i < pts.length - 1; i++) {
    const cur = pts[i];
    const next = pts[i + 1];

    const dx = next.x - cur.x;
    const dz = next.z - cur.z;
    const segLen = Math.hypot(dx, dz) || 1;
    const nx = -dz / segLen;
    const nz = dx / segLen;

    // Konsentrasi tinggi di dekat bazaar (X <= 280) dan dekat istana (X >= 300)
    const isNearBazaar = cur.x <= 280;
    const isNearPalace = cur.x >= 300;
    const paverCount = isNearBazaar || isNearPalace
      ? Math.max(2, Math.round(segLen * 2.2))
      : (i % 2 === 0 ? 1 : 0);

    for (let k = 0; k < paverCount; k++) {
      const s = (k + 0.4 + prng() * 0.4) / (paverCount || 1);
      const cx = cur.x + dx * s;
      const cz = cur.z + dz * s;

      const lateral = (prng() - 0.5) * (halfW * 1.5);
      const px = cx + nx * lateral;
      const pz = cz + nz * lateral;
      const py = yFunc(px, pz) + 0.052;

      const paverSize = 0.55 + prng() * 0.45;
      const rotY = prng() * Math.PI * 2;

      dummy.position.set(px, py, pz);
      dummy.rotation.set((prng() - 0.5) * 0.05, rotY, (prng() - 0.5) * 0.05);
      dummy.scale.set(paverSize, 0.6 + prng() * 0.4, paverSize);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
  }

  const instancedMesh = new THREE.InstancedMesh(paverGeo, paverMat, matrices.length);
  for (let m = 0; m < matrices.length; m++) {
    instancedMesh.setMatrixAt(m, matrices[m]);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.receiveShadow = true;
  return instancedMesh;
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

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.22, 5), ironMat);
  lantern.position.set(0.32, 2.3, 0);
  group.add(lantern);

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const lanternGlow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), glowMat);
  lanternGlow.position.set(0.32, 2.3, 0);
  group.add(lanternGlow);

  junction.signDirections.forEach((dir, idx) => {
    const armGroup = new THREE.Group();
    armGroup.position.y = 1.55 + idx * 0.26;
    armGroup.rotation.y = dir.angle;

    const plankLength = 0.72;
    const plankHeight = 0.18;
    const plankDepth = 0.038;

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
    const ribbonMesh = createContinuousRibbonMesh(
      road.points,
      road.def.width,
      getTerrainHeight,
      road.def.biome
    );
    roadSystemGroup.add(ribbonMesh);

    // 2. Lentera Tepi Jalan setiap ~45 unit (hanya di jalur Padang Rumput utama)
    if (road.def.biome === 'plains') {
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

          // Filter rintangan: Jangan spawn di jembatan, di dalam desa, di depan gerbang istana/benteng
          if (lampX >= 134 && lampX <= 156 && Math.abs(lampZ - 47) <= 5.0) continue;
          if (Math.hypot(lampX, lampZ - 180) <= 25.0) continue;
          if (Math.hypot(lampX - -365, lampZ - -220) <= 15.0) continue;
          if (Math.hypot(lampX - 350, lampZ - 80) <= 15.0) continue;
          if (isPointOnRoad(lampX, lampZ)) continue;

          const lampY = getTerrainHeight(lampX, lampZ);
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

  // 2A. Upgraded Visuals: Instanced Cobblestones & Border Stones di Padang Rumput
  const cobblestoneMesh = createCobblestoneDetailMesh(roads, getTerrainHeight);
  if (cobblestoneMesh.count > 0) {
    roadSystemGroup.add(cobblestoneMesh);
  }

  // 2B. Upgraded Visuals: Instanced Sandstone Pavers di Jalur Gurun
  const desertRoad = roads.find((r) => r.def.biome === 'desert');
  if (desertRoad) {
    const sandstonePaversMesh = createSandstonePaversMesh(desertRoad, getTerrainHeight);
    if (sandstonePaversMesh.count > 0) {
      roadSystemGroup.add(sandstonePaversMesh);
    }
  }

  // Lentera tepi jalan instanced
  if (streetLampsData.length > 0) {
    const instancedLamps = createInstancedStreetLamps(streetLampsData);
    roadSystemGroup.add(instancedLamps);
  }

  // 3. Papan Penunjuk Arah (Signposts) di Persimpangan Jalan Utama (Posisi presisi di tepi jalan)
  ROAD_JUNCTIONS.forEach((jct) => {
    const signX = jct.signPos[0];
    const signZ = jct.signPos[1];
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
