import * as THREE from 'three';
import { createStoneRoadRibbonMesh, createInstancedStreetLamps, createDesertOilLanternMesh } from './3d/models';
import { WorldCollider } from './3d/world';

export type RoadType = 'plains' | 'desert' | 'wood';

export interface RoadRouteDef {
  id: string;
  name: string;
  type: RoadType;
  width: number;
  controlPoints: [number, number][]; // [X, Z]
  roadColor: number;
  curbColor: number;
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
 * 1. DEFINISI JARINGAN JALUR UTAMA (ROAD WAYPOINTS)
 * Jaringan jalan raya dan setapak antarkota/desa di benua Eldoria
 */
export const ROAD_ROUTE_DEFS: RoadRouteDef[] = [
  // A. JALUR UTAMA SANCTUARY (THE ROYAL ARTERY)
  // 1. Rute Pelabuhan ke Alun-Alun: [0, 205] -> [0, 180]
  {
    id: 'sanctuary_harbor',
    name: 'Jalan Dermaga Pelabuhan Sanctuary',
    type: 'wood',
    width: 5.0,
    controlPoints: [
      [0, 205],
      [0, 192],
      [0, 180],
    ],
    roadColor: 0x8d7b68,
    curbColor: 0x5c4d3c,
    canvasStroke: '#a38f78',
    canvasDash: [5, 3],
    canvasWidth: 3.0,
  },
  // 2. Jalur Barat Laut Menuju Ibukota Emas Astraea:
  // [0, 180] -> [-100, 130] -> [-180, 50] -> [-260, -80] -> [-340, -220]
  {
    id: 'sanctuary_astraea',
    name: 'Jalan Raya Kerajaan Barat Sanctuary - Astraea',
    type: 'plains',
    width: 4.8,
    controlPoints: [
      [0, 180],
      [-50, 160],
      [-100, 130],
      [-145, 95],
      [-180, 50],
      [-220, -15],
      [-260, -80],
      [-300, -150],
      [-340, -220],
    ],
    roadColor: 0x8d7b68,
    curbColor: 0x5c4d3c,
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.6,
  },
  // 3. Jalur Timur Menuju Benteng Val-Kragor:
  // [0, 180] -> [90, 150] -> [180, 60] -> [280, 70] -> [380, 80]
  {
    id: 'sanctuary_valkragor',
    name: 'Jalan Raya Timur Sanctuary - Val-Kragor',
    type: 'plains',
    width: 4.5,
    controlPoints: [
      [0, 180],
      [45, 170],
      [90, 150],
      [140, 105],
      [180, 60],
      [230, 64],
      [280, 70],
      [330, 75],
      [380, 80],
    ],
    roadColor: 0x8d7b68,
    curbColor: 0x5c4d3c,
    canvasStroke: '#d7c49e',
    canvasDash: [6, 4],
    canvasWidth: 2.6,
  },

  // B. JALUR PERDAGANGAN GURUN SUTRA (SILK DESERT HIGHWAY)
  // 1. Jalur Penghubung Padang Rumput ke Wilayah Gurun:
  // [180, 60] -> [150, -60] -> [20, -220] -> [150, -360]
  {
    id: 'silk_road_ascent',
    name: 'Jalur Sutra Gurun: Mage Tower - Piramida - Oase',
    type: 'desert',
    width: 4.5,
    controlPoints: [
      [180, 60],
      [165, 0],
      [150, -60],
      [100, -140],
      [20, -220],
      [80, -290],
      [150, -360],
    ],
    roadColor: 0xd4a373,
    curbColor: 0xa8794c,
    canvasStroke: '#fde047',
    canvasDash: [],
    canvasWidth: 2.8,
  },
  // 2. Jalur Emas Oase ke Bazaar Solaria:
  {
    id: 'silk_road_oasis_bazaar',
    name: 'Jalur Penghubung Oase - Bazaar Solaria',
    type: 'desert',
    width: 4.5,
    controlPoints: [
      [150, -360],
      [195, -325],
      [250, -280],
    ],
    roadColor: 0xd4a373,
    curbColor: 0xa8794c,
    canvasStroke: '#fde047',
    canvasDash: [],
    canvasWidth: 2.8,
  },
  // 3. Jalur Emas Bazaar ke Istana Sultan:
  // [250, -280] (Bazaar Solaria) lurus ke [340, -280] (Istana Taj Mahal Sultan)
  {
    id: 'bazaar_palace_avenue',
    name: 'Jalan Raya Emas Grand Avenue Solaria',
    type: 'desert',
    width: 6.0,
    controlPoints: [
      [250, -280],
      [295, -280],
      [340, -280],
    ],
    roadColor: 0xd4a373,
    curbColor: 0xa8794c,
    canvasStroke: '#fde047',
    canvasDash: [],
    canvasWidth: 3.5,
  },
  // 4. Konektor Piramida ke Bazaar Solaria:
  {
    id: 'pyramid_bazaar_link',
    name: 'Jalur Karavan Piramida - Bazaar',
    type: 'desert',
    width: 4.2,
    controlPoints: [
      [20, -220],
      [130, -250],
      [250, -280],
    ],
    roadColor: 0xd4a373,
    curbColor: 0xa8794c,
    canvasStroke: '#fde047',
    canvasDash: [8, 3],
    canvasWidth: 2.5,
  },

  // C. JALUR ZIARAH PENDAPATAN LEMBAH TITAN
  // Percabangan dari jalan raya Astraea di [-180, 50] menuju pelataran luar Cekungan Danau Titan di [-230, -20]
  {
    id: 'titan_pilgrimage',
    name: 'Jalur Ziarah Cekungan Danau Titan',
    type: 'plains',
    width: 3.6,
    controlPoints: [
      [-180, 50],
      [-205, 18],
      [-230, -20],
    ],
    roadColor: 0x78716c,
    curbColor: 0x44403c,
    canvasStroke: '#a38f78',
    canvasDash: [4, 4],
    canvasWidth: 2.2,
  },
];

/**
 * Persimpangan Jalan Utama & Papan Petunjuk Arah (Signposts)
 */
export const ROAD_JUNCTIONS: RoadJunctionDef[] = [
  {
    id: 'jct_sanctuary',
    name: 'Persimpangan Alun-Alun Sanctuary',
    pos: [0, 180],
    signDirections: [
      { label: 'Ibukota Astraea', angle: -Math.PI * 0.75 }, // Barat Laut
      { label: 'Benteng Val-Kragor', angle: 0.15 },        // Timur
      { label: 'Pelabuhan Samudra', angle: Math.PI * 0.5 }, // Selatan
    ],
  },
  {
    id: 'jct_titan_cross',
    name: 'Simpang Tiga Lembah Titan',
    pos: [-180, 50],
    signDirections: [
      { label: 'Ibukota Astraea', angle: -Math.PI * 0.65 }, // Barat Laut
      { label: 'Danau Titan (Ziarah)', angle: -Math.PI * 0.25 }, // Utara-Barat
      { label: 'Desa Sanctuary', angle: Math.PI * 0.45 },   // Tenggara
    ],
  },
  {
    id: 'jct_mage_tower',
    name: 'Simpang Empat Menara Penyihir',
    pos: [180, 60],
    signDirections: [
      { label: 'Benteng Val-Kragor', angle: 0.1 },          // Timur
      { label: 'Jalur Sutra Gurun', angle: -Math.PI * 0.55 }, // Utara
      { label: 'Desa Sanctuary', angle: Math.PI * 0.85 },   // Barat-Daya
    ],
  },
  {
    id: 'jct_pyramid',
    name: 'Simpang Piramida Solaria',
    pos: [20, -220],
    signDirections: [
      { label: 'Oase Solaria', angle: -Math.PI * 0.35 },    // Timur Laut
      { label: 'Bazaar Solaria', angle: 0.0 },              // Timur
      { label: 'Lembah Padang Rumput', angle: Math.PI * 0.6 }, // Tenggara
    ],
  },
  {
    id: 'jct_bazaar',
    name: 'Gerbang Barat Bazaar Solaria',
    pos: [250, -280],
    signDirections: [
      { label: 'Istana Sultan Malik', angle: 0.0 },         // Timur
      { label: 'Oase & Piramida', angle: Math.PI },         // Barat
    ],
  },
];

/**
 * Pre-computed high-density sampled points per route for fast rendering and collision
 */
export interface SampledRoad {
  def: RoadRouteDef;
  points: [number, number][]; // [X, Z] spaced ~2.5 world units
  coarsePoints: [number, number][]; // [X, Z] spaced ~5.0 world units for collision
  bbox: { minX: number; maxX: number; minZ: number; maxZ: number };
}

let cachedSampledRoads: SampledRoad[] | null = null;

export function getSampledRoads(): SampledRoad[] {
  if (cachedSampledRoads) return cachedSampledRoads;

  cachedSampledRoads = ROAD_ROUTE_DEFS.map((route) => {
    const v3s = route.controlPoints.map((p) => new THREE.Vector3(p[0], 0, p[1]));
    const curve = new THREE.CatmullRomCurve3(v3s, false, 'centripetal');
    const length = curve.getLength();

    // 1. Fine points for 3D ribbon mesh & detailed 2D canvas drawing (step ~2.5 units)
    const fineDivisions = Math.max(6, Math.ceil(length / 2.5));
    const fineSamples = curve.getSpacedPoints(fineDivisions);
    const points: [number, number][] = fineSamples.map((p) => [p.x, p.z]);

    // 2. Coarse points for fast O(1) collision query
    const coarseDivisions = Math.max(4, Math.ceil(length / 5.0));
    const coarseSamples = curve.getSpacedPoints(coarseDivisions);
    const coarsePoints: [number, number][] = coarseSamples.map((p) => [p.x, p.z]);

    // Compute bounding box with width padding
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
    const pad = route.width * 0.5 + 3.0;

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
 * 4. LOGIKA INTEGRASI ENGINE & VELOCITY BOOST
 * Helper ultra-cepat untuk mendeteksi apakah pemain sedang berdiri/berjalan di atas jalan
 */
export function isPointOnRoad(x: number, z: number): boolean {
  const roads = getSampledRoads();

  for (let r = 0; r < roads.length; r++) {
    const road = roads[r];
    // Quick AABB test first
    if (x < road.bbox.minX || x > road.bbox.maxX || z < road.bbox.minZ || z > road.bbox.maxZ) {
      continue;
    }

    const thresholdSq = Math.pow(road.def.width * 0.5 + 0.8, 2);
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
 * 3D Signpost Mesh Generator:
 * Papan petunjuk arah kayu pedesaan dengan panah terukir dan lentera gantung
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
 * Bangun seluruh mesh jalan pita, lentera pinggir jalan, dan plang penunjuk arah
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

  // 1. Bangun Mesh Pita Jalan Mengikuti Elevasi Tanah
  roads.forEach((road) => {
    // Grand Sandstone Desert Avenue sudah dibangun secara khusus dengan pohon kurma di world.ts
    if (road.def.id === 'bazaar_palace_avenue') return;

    const roadMesh = createStoneRoadRibbonMesh(
      road.points,
      road.def.width,
      (x, z) => getTerrainHeight(x, z),
      road.def.roadColor,
      road.def.curbColor
    );
    roadSystemGroup.add(roadMesh);

    // 2. Tempatkan Lentera Tepi Jalan setiap ~36-40 unit
    let accumulatedDist = 0;
    const interval = 38.0;

    for (let i = 0; i < road.points.length - 1; i++) {
      const p1 = road.points[i];
      const p2 = road.points[i + 1];
      const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      accumulatedDist += segLen;

      if (accumulatedDist >= interval) {
        accumulatedDist = 0;

        // Hitung vektor normal tegak lurus arah jalan
        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;

        // Sisi kanan atau kiri bergantian
        const side = (i % 2 === 0 ? 1 : -1);
        const lampX = p1[0] + nx * (road.def.width * 0.5 + 1.2) * side;
        const lampZ = p1[1] + nz * (road.def.width * 0.5 + 1.2) * side;
        const lampY = getTerrainHeight(lampX, lampZ);

        if (road.def.type === 'desert') {
          // Lentera Minyak Kuningan Solaria di Gurun
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
          // Lentera Tiang Besi Padang Rumput
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

  // Tambahkan instanced mesh untuk seluruh lampu jalan padang rumput (zero draw call overhead)
  if (streetLampsData.length > 0) {
    const instancedLamps = createInstancedStreetLamps(streetLampsData);
    roadSystemGroup.add(instancedLamps);
  }

  // 3. Tempatkan Papan Penunjuk Arah (Signposts) di setiap Persimpangan Jalan
  ROAD_JUNCTIONS.forEach((jct) => {
    // Geser sedikit dari titik tengah agar tidak menghalangi poros jalan
    const signX = jct.pos[0] + 3.2;
    const signZ = jct.pos[1] + 3.2;
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

  // 1. Layer Bayangan Dasar Jalan (Memberikan kedalaman & kontras di atas bioma)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

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

  // 2. Layer Garis Jalan Utama (Dashed / Solid sesuai spesifikasi)
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

  // 3. Titik Simpul Persimpangan (Junction Waypoints)
  ctx.setLineDash([]);
  ROAD_JUNCTIONS.forEach((jct) => {
    const sx = ((jct.pos[0] - minX) / (maxX - minX)) * width;
    const sy = ((jct.pos[1] - minZ) / (maxZ - minZ)) * height;

    // Glowing circle hub
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
    // Cek apakah jalan berada dekat pemain
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

      // Koordinat canvas minimap
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
