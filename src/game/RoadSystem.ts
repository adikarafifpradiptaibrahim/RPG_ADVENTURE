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
  baseColor: number;
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
 * 3. RUTE JALUR MEDIEVAL YANG LOGIS & RAPI
 * Menggantikan rute lama dengan segmen kurva lengkung Catmull-Rom yang terhubung rapi
 * dari gerbang ke gerbang tanpa memotong air mancur, menembus pohon, pilar kristal, piramida, atau oase.
 */
export const ROAD_ROUTE_DEFS: RoadRouteDef[] = [
  // 1. RUTE SANCTUARY VILLAGE (MEDIEVAL STARTER)
  // A. Dermaga Pelabuhan ke Gerbang Selatan Desa
  {
    id: 'sanctuary_pier',
    name: 'Jalan Dermaga Pelabuhan Sanctuary',
    biome: 'plains',
    width: 3.8,
    controlPoints: [
      [0, 205],
      [0, 198],
      [0, 190],
    ],
    baseColor: 0x75695b,
    canvasStroke: '#a38f78',
    canvasDash: [5, 3],
    canvasWidth: 3.0,
  },
  // B. Alun-Alun: Jalur melingkari Air Mancur Rejuvenasi (X: 0, Z: 180, R: 3.9) secara elegan
  // Sisi Timur Bundaran Alun-Alun
  {
    id: 'sanctuary_plaza_east',
    name: 'Bundaran Alun-Alun Sanctuary (Sisi Timur)',
    biome: 'plains',
    width: 3.4,
    controlPoints: [
      [0, 190],
      [4.8, 185],
      [5.5, 180],
      [4.8, 175],
      [0, 168],
    ],
    baseColor: 0x6e6355,
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.6,
  },
  // Sisi Barat Bundaran Alun-Alun
  {
    id: 'sanctuary_plaza_west',
    name: 'Bundaran Alun-Alun Sanctuary (Sisi Barat)',
    biome: 'plains',
    width: 3.4,
    controlPoints: [
      [0, 190],
      [-4.8, 185],
      [-5.5, 180],
      [-4.8, 175],
      [0, 168],
    ],
    baseColor: 0x6e6355,
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.6,
  },

  // 2. RUTE PADANG RUMPUT BARAT KE GERBANG ASTRAEA
  // Dari Gapura Desa [0, 168] -> meliuk ke barat [-140, 100] -> melewati pelataran selatan Danau Titan [-220, 20]
  // -> berbelok ke utara menuju GERBANG BARAT ASTRAEA: [-360, -220]
  {
    id: 'plains_west_astraea',
    name: 'Jalan Raya Kerajaan Barat Sanctuary - Gerbang Astraea',
    biome: 'plains',
    width: 3.6,
    controlPoints: [
      [0, 168],
      [-70, 140],
      [-140, 100],
      [-220, 20],
      [-290, -80],
      [-330, -160],
      [-360, -220],
    ],
    baseColor: 0x6e6355,
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.6,
  },

  // 3. RUTE PADANG RUMPUT TIMUR & JEMBATAN GANTUNG
  // Dari Gapura Desa [0, 168] -> mengarah ke timur [80, 120] -> masuk ke lantai Jembatan Gantung [120..150, 70]
  // -> keluar jembatan -> melengkung melewati sisi luar halaman Mage Tower (aman dari pilar)
  // -> berakhir di Gerbang Barat Benteng Val-Kragor [380, 80]
  {
    id: 'plains_east_valkragor',
    name: 'Jalan Raya Timur Sanctuary - Jembatan Gantung - Benteng Val-Kragor',
    biome: 'plains',
    width: 3.5,
    controlPoints: [
      [0, 168],
      [45, 150],
      [80, 120],
      [118, 70],
      [135, 70],
      [150, 70],
      [195, 78],
      [240, 78],
      [290, 79],
      [350, 80],
      [380, 80],
    ],
    baseColor: 0x6e6355,
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.6,
  },

  // 4. RUTE GURUN PASIR EMAS (PACKED CARAVAN SAND TRAIL)
  // Jalur jejak pasir lebar menghubungkan Gerbang Depan Bazaar Solaria [250, -280]
  // lurus menuju Gerbang Masuk Istana Taj Mahal Sultan Malik [340, -280]
  {
    id: 'desert_bazaar_palace',
    name: 'Jejak Kafilah Karavan Bazaar Solaria - Istana Taj Mahal Sultan',
    biome: 'desert',
    width: 4.8,
    controlPoints: [
      [250, -280],
      [295, -280],
      [340, -280],
    ],
    baseColor: 0xcbb17b, // Pasir padat hangat kecokelatan (#cbb17b)
    canvasStroke: '#fde047',
    canvasDash: [],
    canvasWidth: 3.2,
  },
];

/**
 * Persimpangan Jalan Utama & Papan Petunjuk Arah Kayu Pedesaan
 */
export const ROAD_JUNCTIONS: RoadJunctionDef[] = [
  {
    id: 'jct_sanctuary_gate',
    name: 'Gapura Kayu Utara Desa Sanctuary',
    pos: [0, 168],
    signDirections: [
      { label: 'Ibukota Kerajaan Astraea', angle: -Math.PI * 0.72 }, // Barat Laut
      { label: 'Benteng Val-Kragor & Mage Tower', angle: 0.18 },    // Timur
      { label: 'Alun-Alun & Pelabuhan', angle: Math.PI * 0.5 },      // Selatan
    ],
  },
  {
    id: 'jct_bridge_approach',
    name: 'Pintu Masuk Barat Jembatan Gantung',
    pos: [118, 70],
    signDirections: [
      { label: 'Benteng Val-Kragor ->', angle: 0.0 },              // Timur (menyeberang)
      { label: '<- Desa Sanctuary', angle: Math.PI },              // Barat
    ],
  },
  {
    id: 'jct_titan_trail',
    name: 'Pelataran Selatan Danau Titan',
    pos: [-220, 20],
    signDirections: [
      { label: 'Ibukota Astraea ->', angle: -Math.PI * 0.55 },     // Utara
      { label: '<- Desa Sanctuary', angle: Math.PI * 0.42 },       // Tenggara
    ],
  },
  {
    id: 'jct_solaria_bazaar',
    name: 'Gerbang Depan Bazaar Gurun Solaria',
    pos: [250, -280],
    signDirections: [
      { label: 'Istana Sultan Malik ->', angle: 0.0 },             // Timur
      { label: '<- Jalur Kafilah Karavan', angle: Math.PI },       // Barat
    ],
  },
];

export interface SampledRoad {
  def: RoadRouteDef;
  points: [number, number][]; // [X, Z] spaced ~2.2 world units
  coarsePoints: [number, number][]; // [X, Z] spaced ~4.5 world units for collision
  bbox: { minX: number; maxX: number; minZ: number; maxZ: number };
}

let cachedSampledRoads: SampledRoad[] | null = null;

export function getSampledRoads(): SampledRoad[] {
  if (cachedSampledRoads) return cachedSampledRoads;

  cachedSampledRoads = ROAD_ROUTE_DEFS.map((route) => {
    const v3s = route.controlPoints.map((p) => new THREE.Vector3(p[0], 0, p[1]));
    const curve = new THREE.CatmullRomCurve3(v3s, false, 'centripetal');
    const length = curve.getLength();

    // 1. Fine points for 3D ribbon mesh & 2D canvas drawing (step ~2.2 units)
    const fineDivisions = Math.max(5, Math.ceil(length / 2.2));
    const fineSamples = curve.getSpacedPoints(fineDivisions);
    const points: [number, number][] = fineSamples.map((p) => [p.x, p.z]);

    // 2. Coarse points for fast O(1) collision query
    const coarseDivisions = Math.max(3, Math.ceil(length / 4.5));
    const coarseSamples = curve.getSpacedPoints(coarseDivisions);
    const coarsePoints: [number, number][] = coarseSamples.map((p) => [p.x, p.z]);

    // Bounding box with width padding
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const pad = route.width * 0.5 + 2.5;

    return {
      def: route,
      points,
      coarsePoints,
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
 * 4. PEMBERSIHAN TABRAKAN OBJEK (OBSTACLE CLEARING) & VELOCITY BOOST
 * Helper ultra-cepat untuk mendeteksi apakah suatu titik (x, z) berada di atas jalan.
 * Digunakan untuk:
 * 1. Mencegah pohon dan batu liar spawn di atas jalan.
 * 2. Memberikan boost kecepatan jalan (+15%) bagi pemain.
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
    const pts = road.coarsePoints;

    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegmentSq(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= thresholdSq) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 2. BUILDER GEOMETRI PITA DATAR (QUAD STRIP SEGMENTED PLANE)
 * Menggunakan THREE.BufferGeometry permukaan jalan nyata dengan vertex color blending:
 * - Tidak menggunakan THREE.Line / LineBasicMaterial.
 * - Tidak menggunakan tali atau kawat tipis.
 * - y = getTerrainHeight(x, z) + 0.05 untuk mencegah z-fighting.
 * - Tepi memudar halus (alpha/color falloff) menyatu ke rumput atau pasir gurun.
 */
function createRibbonSurfaceMesh(
  points: [number, number][],
  width: number,
  yFunc: (x: number, z: number) => number,
  biome: RoadBiomeType
): THREE.Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const halfW = width * 0.5;

  const isPlains = biome === 'plains';

  // Base Road Core Color & Outer Shoulder Blend Color
  // Padang rumput: Abu-abu kecokelatan (#6e6355 / #7d7163) memudar ke hijau rumput (#65a30d)
  // Gurun: Kuning pasir padat (#cbb17b / #bfa268) memudar ke warna bukit pasir (#eab308)
  const coreColor = isPlains ? new THREE.Color(0x6e6355) : new THREE.Color(0xcbb17b);
  const shoulderColor = isPlains ? new THREE.Color(0x65a30d) : new THREE.Color(0xeab308);

  for (let i = 0; i < points.length; i++) {
    const cur = points[i];

    // Hitung vektor arah dan normal segmen jalan
    let dx = 0;
    let dz = 0;
    if (i < points.length - 1) {
      dx = points[i + 1][0] - cur[0];
      dz = points[i + 1][1] - cur[1];
    } else {
      dx = cur[0] - points[i - 1][0];
      dz = cur[1] - points[i - 1][1];
    }
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    // Lekukan organik halus pada tepian jalan (soft/jagged falloff alami)
    const wobbleL = Math.sin(i * 0.85) * (isPlains ? 0.22 : 0.15);
    const wobbleR = Math.cos(i * 0.95) * (isPlains ? 0.22 : 0.15);

    const wL = halfW + wobbleL;
    const wR = halfW + wobbleR;

    // 1. Left Outer Shoulder
    const lx = cur[0] + nx * wL;
    const lz = cur[1] + nz * wL;
    const ly = yFunc(lx, lz) + 0.05;

    // 2. Road Center Core
    const cx = cur[0];
    const cz = cur[1];
    const cy = yFunc(cx, cz) + 0.052;

    // 3. Right Outer Shoulder
    const rx = cur[0] - nx * wR;
    const rz = cur[1] - nz * wR;
    const ry = yFunc(rx, rz) + 0.05;

    // 3 vertices per cross section: [Left, Center, Right]
    positions.push(lx, ly, lz, cx, cy, cz, rx, ry, rz);

    // Vertex Colors: Shoulder blends to biome color, center is authentic road paver/dirt
    colors.push(
      shoulderColor.r, shoulderColor.g, shoulderColor.b,
      coreColor.r, coreColor.g, coreColor.b,
      shoulderColor.r, shoulderColor.g, shoulderColor.b
    );

    // Quad Strips
    if (i < points.length - 1) {
      const row = i * 3;
      const nextRow = (i + 1) * 3;

      // Quad 1: Left shoulder to Center core
      indices.push(row, nextRow, row + 1);
      indices.push(row + 1, nextRow, nextRow + 1);

      // Quad 2: Center core to Right shoulder
      indices.push(row + 1, nextRow + 1, row + 2);
      indices.push(row + 2, nextRow + 1, nextRow + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: isPlains ? 0.9 : 0.88,
    metalness: 0.0,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Papan Petunjuk Arah Kayu Abad Pertengahan (Medieval Wooden Signposts)
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

  // Base Cobble Mound
  const baseMound = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.25, 7), stoneMat);
  baseMound.position.y = 0.12;
  group.add(baseMound);

  // Main Vertical Post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 6), woodMat);
  post.position.y = 1.25;
  post.castShadow = true;
  group.add(post);

  // Cap / Iron Finial
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 5), ironMat);
  cap.position.y = 2.6;
  group.add(cap);

  // Hanging Iron Bracket & Mini Lantern
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.04), ironMat);
  bracket.position.set(0.18, 2.45, 0);
  group.add(bracket);

  const lanternGlow = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xffecb3 })
  );
  lanternGlow.position.set(0.32, 2.3, 0);
  group.add(lanternGlow);

  // Directional Planks (Arms pointing toward destination)
  junction.signDirections.forEach((dir, idx) => {
    const armGroup = new THREE.Group();
    armGroup.position.y = 1.55 + idx * 0.26;
    armGroup.rotation.y = dir.angle;

    const plankLength = 0.95;
    const plankHeight = 0.22;
    const plankDepth = 0.05;

    // Main plank body
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(plankLength, plankHeight, plankDepth),
      plankMat
    );
    plank.position.x = plankLength / 2 + 0.08;
    plank.castShadow = true;
    armGroup.add(plank);

    // Arrow pointer tip (triangle at end)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.24, 3), plankMat);
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(plankLength + 0.16, 0, 0);
    armGroup.add(tip);

    // Iron studs
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
 * 2. IMPLEMENTASI 3D MESH JALAN (world.ts)
 * Bangun seluruh mesh permukaan jalan nyata, batu kali kecil tepi jalan, lentera, dan plang penunjuk arah
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

  // Low-poly pebble material for wayside stones
  const pebbleMat = new THREE.MeshStandardMaterial({
    color: 0x6b6052,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });
  const pebbleGeo = new THREE.DodecahedronGeometry(0.2, 0);

  // 1. Bangun Mesh Permukaan Pita Jalan
  roads.forEach((road) => {
    // Grand Sandstone Desert Avenue sudah dibangun secara khusus dengan pohon kurma di world.ts
    if (road.def.id === 'desert_bazaar_palace') return;

    // Mesh pita datar quad-strip bergradasi alami
    const ribbonMesh = createRibbonSurfaceMesh(
      road.points,
      road.def.width,
      getTerrainHeight,
      road.def.biome
    );
    roadSystemGroup.add(ribbonMesh);

    // 2. Taburan Batu Kali Kecil (Low-Poly Pebble Stones) & Lentera Tepi Jalan
    let distCounter = 0;
    const isPlains = road.def.biome === 'plains';

    for (let i = 0; i < road.points.length - 1; i++) {
      const p1 = road.points[i];
      const p2 = road.points[i + 1];
      const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      distCounter += segLen;

      // Hiasan Tepi: Sesekali batu kali kecil (pebble stones) di bibir jalan (setiap ~14 unit di padang rumput)
      if (isPlains && distCounter >= 14.0) {
        distCounter = 0;

        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        const side = i % 2 === 0 ? 1 : -1;

        const pebX = p1[0] + nx * (road.def.width * 0.5 + 0.35) * side;
        const pebZ = p1[1] + nz * (road.def.width * 0.5 + 0.35) * side;
        const pebY = getTerrainHeight(pebX, pebZ) + 0.05;

        const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
        pebble.position.set(pebX, pebY, pebZ);
        const s = 0.7 + (i % 5) * 0.15;
        pebble.scale.set(s, s * 0.7, s);
        pebble.rotation.set((i % 3) * 0.4, (i % 7) * 0.6, (i % 2) * 0.3);
        roadSystemGroup.add(pebble);
      }

      // Lentera Tepi Jalan setiap ~42 unit
      if (i > 0 && i % 20 === 0) {
        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        const side = i % 4 === 0 ? 1 : -1;

        const lampX = p1[0] + nx * (road.def.width * 0.5 + 1.2) * side;
        const lampZ = p1[1] + nz * (road.def.width * 0.5 + 1.2) * side;
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

  // Instanced lamps untuk efisiensi performa 60 FPS
  if (streetLampsData.length > 0) {
    const instancedLamps = createInstancedStreetLamps(streetLampsData);
    roadSystemGroup.add(instancedLamps);
  }

  // 3. Papan Penunjuk Arah (Signposts) di Persimpangan Jalan Utama
  ROAD_JUNCTIONS.forEach((jct) => {
    const signX = jct.pos[0] + 3.0;
    const signZ = jct.pos[1] + 3.0;
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
 * 3. VISUALISASI JALUR PADA CANVAS PETA 2D (WorldMapModal.tsx)
 * Render layer garis jalan raya halus antarkota sebelum pin/ikon dirender
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

  // 1. Layer Bayangan Dasar Jalan (Memberikan kedalaman & kontras di atas bioma)
  roads.forEach((road) => {
    if (road.points.length < 2) return;
    ctx.beginPath();
    const p0 = road.points[0];
    const sx0 = ((p0[0] - minX) / (maxX - minX)) * width;
    const sy0 = ((p0[1] - minZ) / (maxZ - minZ)) * height;
    ctx.moveTo(sx0, sy0);

    for (let i = 1; i < road.points.length; i++) {
      const p = road.points[i];
      const sx = ((p[0] - minX) / (maxX - minX)) * width;
      const sy = ((p[1] - minZ) / (maxZ - minZ)) * height;
      ctx.lineTo(sx, sy);
    }

    ctx.strokeStyle = 'rgba(20, 20, 20, 0.45)';
    ctx.lineWidth = road.def.canvasWidth + 2.0;
    ctx.stroke();
  });

  // 2. Layer Garis Jalan Utama (Dashed / Solid)
  roads.forEach((road) => {
    if (road.points.length < 2) return;
    ctx.beginPath();
    const p0 = road.points[0];
    const sx0 = ((p0[0] - minX) / (maxX - minX)) * width;
    const sy0 = ((p0[1] - minZ) / (maxZ - minZ)) * height;
    ctx.moveTo(sx0, sy0);

    for (let i = 1; i < road.points.length; i++) {
      const p = road.points[i];
      const sx = ((p[0] - minX) / (maxX - minX)) * width;
      const sy = ((p[1] - minZ) / (maxZ - minZ)) * height;
      ctx.lineTo(sx, sy);
    }

    ctx.strokeStyle = road.def.canvasStroke;
    ctx.lineWidth = road.def.canvasWidth;
    ctx.setLineDash(road.def.canvasDash);
    ctx.stroke();
  });

  // 3. Titik Simpul Persimpangan Bercahaya
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
 * 3. VISUALISASI JALUR PADA MINIMAP (MiniMap.tsx)
 * Render garis jalur yang berada di dalam jangkauan radar minimap pemain
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

    for (let i = 0; i < road.points.length; i++) {
      const p = road.points[i];
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
      // Underlay
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = road.def.canvasWidth + 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      // Main line
      ctx.strokeStyle = road.def.canvasStroke;
      ctx.lineWidth = Math.max(1.8, road.def.canvasWidth * 0.9);
      ctx.setLineDash(road.def.canvasDash.length > 0 ? [5, 3] : []);
      ctx.stroke();
    }
  });

  ctx.restore();
}
