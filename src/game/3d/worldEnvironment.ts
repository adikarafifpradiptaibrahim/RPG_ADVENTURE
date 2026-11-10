import * as THREE from 'three';
import { WorldCollider } from './world';
import { isPointNearRoad } from '../RoadSystem';
import {
  isDesertBiome,
  getDistanceToRiver,
  RIVER_NORTHWEST_BRANCH,
  RIVER_EAST_BRANCH,
  RIVER_MAIN_DOWNSTREAM,
} from '../mapSampler';

export interface WorldEnvironmentResult {
  group: THREE.Group;
  colliders: WorldCollider[];
  update: (delta: number, time: number) => void;
}

/**
 * Lead Level Designer & World Builder
 * Modul Builder Tata Ruang Lanskap Dunia Berbasis 4 Zonasi Lingkungan & Instanced Mesh Vegetasi
 */
export function buildWorldEnvironment(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number) => number,
  colliders: WorldCollider[]
): WorldEnvironmentResult {
  const envGroup = new THREE.Group();
  envGroup.name = 'WorldEnvironment_Zones';
  scene.add(envGroup);

  const animatedLights: { light: THREE.PointLight; baseIntensity: number; speed: number }[] = [];
  const animatedFlames: { mesh: THREE.Mesh; baseScale: THREE.Vector3; speed: number }[] = [];
  let windmillBladesGroup: THREE.Group | null = null;

  // ============================================================================
  // PALET MATERIAL BERSAMA (LOW-POLY FLAT SHADING & OPTIMIZED PERFORMANCE)
  // ============================================================================
  const matWoodRustic = new THREE.MeshStandardMaterial({ color: 0x785135, roughness: 0.85, metalness: 0.05, flatShading: true });
  const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9, flatShading: true });
  const matStoneRuins = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, metalness: 0.1, flatShading: true });
  const matStoneDarkCrag = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
  const matCyanRune = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });
  const matBlueFire = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const matOrangeFire = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 3.2,
    roughness: 0.2,
  });
  const matCopperCauldron = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45, metalness: 0.65 });
  const matHay = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.95, flatShading: true });
  const matFarmSoil = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95, flatShading: true });
  const matCabbage = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, flatShading: true });
  const matLettuce = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.8, flatShading: true });
  const matPumpkin = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.75, flatShading: true });
  const matStem = new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 0.8, flatShading: true });
  const matCarrotTop = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.8, flatShading: true });
  const matCarrotTip = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7, flatShading: true });
  const matWheat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.85, flatShading: true });
  const matTentFabric = new THREE.MeshStandardMaterial({ color: 0x6b705c, roughness: 0.9, flatShading: true });
  const matBone = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.6, flatShading: true });

  // Material Tambahan untuk Pesisir Barat, Sabana, & Perkemahan Bandit
  const matWetSeaRock = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.25, flatShading: true });
  const matPalmTrunk = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9, flatShading: true });
  const matPalmRing = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, flatShading: true });
  const matPalmLeaf = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7, flatShading: true });
  const matCoconut = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.85, flatShading: true });
  const matShipWood = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95, flatShading: true });
  const matShipPlank = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9, flatShading: true });
  const matIronBands = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.7 });
  const matWineBarrel = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.85, flatShading: true });
  const matBeachGrass = new THREE.MeshStandardMaterial({ color: 0xa3a658, roughness: 0.9, flatShading: true });
  const matPineFoliage = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.85, flatShading: true });
  const matOakFoliage = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8, flatShading: true });
  const matBoulder = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
  const matShrub = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85, flatShading: true });
  const matDarkSoil = new THREE.MeshStandardMaterial({ color: 0x27201c, roughness: 0.95, flatShading: true });
  const matWildflower = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7, flatShading: true });
  const matMossStone = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, flatShading: true });

  // Helper deteksi batas pekarangan pertanian untuk isolasi vegetasi instanced & bebatuan alami
  function isInsideFarmYard(x: number, z: number): boolean {
    if (x >= 19 && x <= 45 && z >= 151 && z <= 166) return true; // Pekarangan 1 (Utara)
    if (x >= 21 && x <= 47 && z >= 111 && z <= 126) return true; // Pekarangan 2 (Selatan)
    if (x >= 57 && x <= 81 && z >= 85 && z <= 99) return true;   // Pekarangan 3 (Gandum)
    return false;
  }

  // ============================================================================
  // 1. ZONA A: DESA & PERTANIAN PINGGIRAN (X: 10 s.d. 80, Z: 100 s.d. 160)
  // ============================================================================
  const farmGroup = new THREE.Group();
  farmGroup.name = 'ZoneA_VillageFarmlands';

  // Helper Pembuat Pagar Kayu Rustic Antara Dua Titik dengan Celah Pintu Gerbang
  function createRusticFenceSegment(
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    gateGap?: { min: number; max: number; axis: 'x' | 'z' }
  ) {
    const dist = Math.hypot(endX - startX, endZ - startZ);
    if (dist < 0.5) return;
    const postCount = Math.max(2, Math.round(dist / 2.2));
    const angle = Math.atan2(endZ - startZ, endX - startX);

    for (let i = 0; i < postCount; i++) {
      const t = i / (postCount - 1);
      const px = startX + (endX - startX) * t;
      const pz = startZ + (endZ - startZ) * t;

      // Cek apakah posisi berada di dalam celah pintu gerbang
      if (gateGap) {
        const val = gateGap.axis === 'x' ? px : pz;
        if (val > gateGap.min && val < gateGap.max) {
          continue; // Lewati agar menjadi akses pintu gerbang masuk
        }
      }

      // ROAD CLEARANCE: Batas aman minimal 3.5 unit dari garis tengah jalan setapak
      if (isPointNearRoad(px, pz, 3.5)) continue;

      const py = getTerrainHeight(px, pz);

      // Tiang kayu vertikal
      const isGatePost = gateGap && (
        Math.abs((gateGap.axis === 'x' ? px : pz) - gateGap.min) < 0.8 ||
        Math.abs((gateGap.axis === 'x' ? px : pz) - gateGap.max) < 0.8
      );
      const postHeight = isGatePost ? 1.45 : 1.15;
      const postRadius = isGatePost ? 0.11 : 0.085;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(postRadius * 0.9, postRadius, postHeight, 6),
        matWoodRustic
      );
      post.position.set(px, py + postHeight * 0.5, pz);
      post.rotation.y = angle + (Math.sin(px * 3.7 + pz * 2.1) * 0.12);
      post.rotation.z = Math.sin(px * 1.5) * 0.04;
      farmGroup.add(post);

      if (i < postCount - 1) {
        const nextT = (i + 1) / (postCount - 1);
        const nextX = startX + (endX - startX) * nextT;
        const nextZ = startZ + (endZ - startZ) * nextT;

        // Skip rail jika melintasi gerbang
        if (gateGap) {
          const midVal = gateGap.axis === 'x' ? (px + nextX) * 0.5 : (pz + nextZ) * 0.5;
          if (midVal >= gateGap.min && midVal <= gateGap.max) {
            continue;
          }
        }

        const midX = (px + nextX) * 0.5;
        const midZ = (pz + nextZ) * 0.5;
        if (isPointNearRoad(midX, midZ, 3.5)) continue;

        const midY = (py + getTerrainHeight(nextX, nextZ)) * 0.5;
        const segLen = Math.hypot(nextX - px, nextZ - pz);

        [0.35, 0.75].forEach((hOffset) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.07, 0.05), matWoodRustic);
          rail.position.set(midX, midY + hOffset, midZ);
          rail.rotation.y = angle;
          farmGroup.add(rail);
        });
      }
    }
  }

  // Helper Pembuat Pekarangan Tertutup Berpagar Persegi Panjang
  function createEnclosedFarmYard(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    gateSide: 'north' | 'south',
    gateMin: number,
    gateMax: number
  ) {
    // 1. Sisi Selatan (minZ)
    createRusticFenceSegment(
      minX, minZ, maxX, minZ,
      gateSide === 'south' ? { min: gateMin, max: gateMax, axis: 'x' } : undefined
    );
    // 2. Sisi Utara (maxZ)
    createRusticFenceSegment(
      minX, maxZ, maxX, maxZ,
      gateSide === 'north' ? { min: gateMin, max: gateMax, axis: 'x' } : undefined
    );
    // 3. Sisi Barat (minX)
    createRusticFenceSegment(minX, minZ, minX, maxZ);
    // 4. Sisi Timur (maxX)
    createRusticFenceSegment(maxX, minZ, maxX, maxZ);
  }

  // Pekarangan 1: Sayap Kiri / Utara Jalan (Z: 152 s.d 165, clearing > 7.0m dari jalan)
  createEnclosedFarmYard(20, 44, 152, 165, 'south', 30, 34);

  // Pekarangan 2: Sayap Kanan / Selatan Jalan (Z: 112 s.d 125, clearing > 7.0m dari jalan)
  createEnclosedFarmYard(22, 46, 112, 125, 'north', 32, 36);

  // Pekarangan 3: Ladang Gandum & Lumbung Timur (Z: 86 s.d 98, Z < 100, clearing > 5.0m dari jalan)
  createEnclosedFarmYard(58, 80, 86, 98, 'north', 67, 71);

  // 3 Petak Kebun Sayur Berpematang Kayu di Dalam Pekarangan Rapi
  const gardenPatches = [
    // Kebun 1: Di dalam Pekarangan 1 (Utara Jalan), Cabbage & Carrot
    { x: 32, z: 158.5, w: 14, d: 5.5, cropType: 'cabbage_carrot' },
    // Kebun 2: Di dalam Pekarangan 2 (Selatan Jalan), Pumpkin & Veggies
    { x: 34, z: 118.5, w: 14, d: 5.5, cropType: 'pumpkin_veggies' },
    // Kebun 3: Di dalam Pekarangan 3 (Selatan Jalan Timur, Z < 100), Wheat Field
    { x: 69, z: 92.0, w: 13, d: 4.8, cropType: 'wheat' },
  ];

  gardenPatches.forEach((patch) => {
    // Road clearance check
    if (isPointNearRoad(patch.x, patch.z, 3.5)) return;

    const y = getTerrainHeight(patch.x, patch.z);

    // Bedengan tanah subur gembur
    const soil = new THREE.Mesh(new THREE.BoxGeometry(patch.w, 0.22, patch.d), matFarmSoil);
    soil.position.set(patch.x, y + 0.11, patch.z);
    farmGroup.add(soil);

    // Pematang bingkai balok kayu rustic
    const halfW = patch.w * 0.5;
    const halfD = patch.d * 0.5;
    const borderGeos = [
      { pos: [patch.x, y + 0.16, patch.z - halfD], sz: [patch.w, 0.32, 0.22] },
      { pos: [patch.x, y + 0.16, patch.z + halfD], sz: [patch.w, 0.32, 0.22] },
      { pos: [patch.x - halfW, y + 0.16, patch.z], sz: [0.22, 0.32, patch.d] },
      { pos: [patch.x + halfW, y + 0.16, patch.z], sz: [0.22, 0.32, patch.d] },
    ];
    borderGeos.forEach((bg) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(bg.sz[0], bg.sz[1], bg.sz[2]), matWoodRustic);
      beam.position.set(bg.pos[0], bg.pos[1], bg.pos[2]);
      farmGroup.add(beam);
    });

    // Tanaman sayuran dalam petak rapi berbaris
    const rows = patch.cropType === 'wheat' ? 5 : 4;
    const cols = patch.cropType === 'wheat' ? 12 : 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = patch.x - halfW + 1.0 + (c / (cols - 1)) * (patch.w - 2.0);
        const cz = patch.z - halfD + 0.8 + (r / (rows - 1)) * (patch.d - 1.6);
        const cy = y + 0.22;

        if (patch.cropType === 'cabbage_carrot') {
          if (r < 2) {
            // Cabbage
            const cabbage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), matCabbage);
            cabbage.position.set(cx, cy + 0.12, cz);
            cabbage.scale.set(1.1, 0.85, 1.0);
            farmGroup.add(cabbage);
          } else {
            // Carrot
            const carrotTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), matCarrotTip);
            carrotTip.position.set(cx, cy + 0.05, cz);
            carrotTip.rotation.x = Math.PI;
            const carrotLeaves = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 5), matCarrotTop);
            carrotLeaves.position.set(cx, cy + 0.20, cz);
            farmGroup.add(carrotTip, carrotLeaves);
          }
        } else if (patch.cropType === 'pumpkin_veggies') {
          if (r === 0 || r === 3) {
            // Labu Oranye (Pumpkin)
            const pumpkin = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), matPumpkin);
            pumpkin.position.set(cx, cy + 0.14, cz);
            pumpkin.scale.set(1.15, 0.85, 1.15);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 5), matStem);
            stem.position.set(cx, cy + 0.27, cz);
            stem.rotation.z = 0.2;
            farmGroup.add(pumpkin, stem);
          } else if (r === 1) {
            // Kubis Segar (Lettuce / Cabbage)
            const lettuce = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), matLettuce);
            lettuce.position.set(cx, cy + 0.11, cz);
            farmGroup.add(lettuce);
          } else {
            // Wortel
            const carrotTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), matCarrotTip);
            carrotTip.position.set(cx, cy + 0.05, cz);
            carrotTip.rotation.x = Math.PI;
            const carrotLeaves = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 5), matCarrotTop);
            carrotLeaves.position.set(cx, cy + 0.20, cz);
            farmGroup.add(carrotTip, carrotLeaves);
          }
        } else {
          // Gandum Emas (Golden Wheat Stalks)
          const wheatStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 4), matWheat);
          wheatStalk.position.set(cx, cy + 0.34, cz);
          wheatStalk.rotation.z = Math.sin(cx * 4 + cz * 3) * 0.18;
          farmGroup.add(wheatStalk);
        }
      }
    }
  });

  // 9 Tumpukan Jerami (Haystack Emas): Terkumpul Rapi di Sudut-Sudut Pekarangan
  const haystacks = [
    // Sudut Pekarangan 1 (Utara)
    { x: 23.0, z: 161.0, r: 1.4, h: 1.8 },
    { x: 25.8, z: 161.5, r: 1.2, h: 1.5 },
    { x: 24.2, z: 157.5, r: 1.1, h: 1.4 },
    // Sudut Pekarangan 2 (Selatan)
    { x: 25.0, z: 115.0, r: 1.5, h: 1.9 },
    { x: 27.8, z: 114.0, r: 1.3, h: 1.6 },
    { x: 25.5, z: 118.0, r: 1.1, h: 1.4 },
    // Sudut Pekarangan 3 (Gandum Timur)
    { x: 61.5, z: 90.5, r: 1.5, h: 1.9 },
    { x: 64.0, z: 92.5, r: 1.2, h: 1.5 },
    { x: 61.8, z: 94.5, r: 1.1, h: 1.4 },
  ];

  haystacks.forEach((hs) => {
    if (isPointNearRoad(hs.x, hs.z, 3.5)) return;

    const y = getTerrainHeight(hs.x, hs.z);
    const hayGroup = new THREE.Group();
    hayGroup.position.set(hs.x, y, hs.z);

    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(hs.r * 0.9, hs.r, hs.h * 0.65, 8), matHay);
    baseCyl.position.y = hs.h * 0.325;
    const topDome = new THREE.Mesh(new THREE.ConeGeometry(hs.r * 0.9, hs.h * 0.55, 8), matHay);
    topDome.position.y = hs.h * 0.65 + hs.h * 0.275;

    hayGroup.add(baseCyl, topDome);
    farmGroup.add(hayGroup);
    colliders.push({ type: 'circle', x: hs.x, z: hs.z, radius: hs.r, label: 'Tumpukan Jerami' });
  });

  // 2 Gerobak Dorong Kayu & Peti Barang Dagangan di Sisi Pintu Gerbang Pekarangan
  function createWoodenCart(x: number, z: number, rotY: number) {
    if (isPointNearRoad(x, z, 3.5)) return;

    const y = getTerrainHeight(x, z);
    const cart = new THREE.Group();
    cart.position.set(x, y + 0.42, z);
    cart.rotation.y = rotY;

    // Bak gerobak
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 2.2), matWoodRustic);
    tray.position.y = 0.25;

    // Roda kayu kiri & kanan
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelL = new THREE.Mesh(wheelGeo, matWoodDark);
    wheelL.position.set(-0.82, -0.05, -0.2);
    const wheelR = new THREE.Mesh(wheelGeo, matWoodDark);
    wheelR.position.set(0.82, -0.05, -0.2);

    // Tangkai pegangan
    const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), matWoodRustic);
    handleL.position.set(-0.45, 0.35, 1.6);
    handleL.rotation.x = -0.15;
    const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), matWoodRustic);
    handleR.position.set(0.45, 0.35, 1.6);
    handleR.rotation.x = -0.15;

    // Muatan peti dan tong di atas gerobak
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.65), matWoodDark);
    crate.position.set(0.15, 0.65, -0.4);
    const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), matHay);
    sack.position.set(-0.25, 0.55, 0.3);

    cart.add(tray, wheelL, wheelR, handleL, handleR, crate, sack);
    farmGroup.add(cart);
    colliders.push({ type: 'circle', x, z, radius: 1.4, label: 'Gerobak Kayu' });
  }

  // Gerobak 1 terparkir di dekat pintu gerbang Pekarangan 1 (Utara)
  createWoodenCart(32, 147.5, 0.2);
  // Gerobak 2 terparkir di dekat pintu gerbang Pekarangan 2 (Selatan)
  createWoodenCart(34, 129.5, -0.25);

  // Tumpukan peti barang di dekat gerobak dan pagar
  const crateClusters = [
    { x: 28.5, z: 149.0 },
    { x: 30.5, z: 128.0 },
    { x: 64.5, z: 96.5 },
  ];
  crateClusters.forEach((cc) => {
    if (isPointNearRoad(cc.x, cc.z, 3.5)) return;

    const cy = getTerrainHeight(cc.x, cc.z);
    [
      { dx: 0, dz: 0, h: 0.65, w: 0.7, dy: 0 },
      { dx: 0.65, dz: 0.1, h: 0.55, w: 0.6, dy: 0 },
      { dx: 0.25, dz: 0.05, h: 0.5, w: 0.55, dy: 0.65 },
    ].forEach((cDef) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(cDef.w, cDef.h, cDef.w), matWoodDark);
      box.position.set(cc.x + cDef.dx, cy + cDef.dy + cDef.h * 0.5, cc.z + cDef.dz);
      box.rotation.y = (Math.random() - 0.5) * 0.3;
      farmGroup.add(box);
    });
    colliders.push({ type: 'circle', x: cc.x, z: cc.z, radius: 1.2, label: 'Peti Barang' });
  });

  envGroup.add(farmGroup);

  // ============================================================================
  // 2. ZONA B: RERUNTUHAN PILAR KUNO / ANCIENT RUINS (X: -80 s.d. -130, Z: 50 s.d. 100)
  // ============================================================================
  const ruinsGroup = new THREE.Group();
  ruinsGroup.name = 'ZoneB_AncientRuins';

  const ruinsCenterX = -105;
  const ruinsCenterZ = 75;
  const ruinsBaseY = getTerrainHeight(ruinsCenterX, ruinsCenterZ);

  // Pelataran Ubin Batu Retak Melingkar (Radius 22 unit)
  const plazaRadius = 22;
  const plazaSlabCount = 28;
  for (let i = 0; i < plazaSlabCount; i++) {
    const angle = (i / plazaSlabCount) * Math.PI * 2;
    const rDist = 4.0 + (i % 3) * 6.5;
    const sx = ruinsCenterX + Math.cos(angle) * rDist;
    const sz = ruinsCenterZ + Math.sin(angle) * rDist;
    const sy = getTerrainHeight(sx, sz);

    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2 + Math.random() * 1.2, 2.4 + Math.random() * 1.2, 0.22, 6),
      matStoneRuins
    );
    slab.position.set(sx, sy + 0.1, sz);
    slab.rotation.y = Math.random() * Math.PI;
    ruinsGroup.add(slab);
  }

  // Lingkaran Runik Sihir Cyan Pusat di Tengah Reruntuhan
  const centerPlazaRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 3.8, 16), matCyanRune);
  centerPlazaRing.rotateX(-Math.PI / 2);
  centerPlazaRing.position.set(ruinsCenterX, ruinsBaseY + 0.14, ruinsCenterZ);
  ruinsGroup.add(centerPlazaRing);

  // Bongkahan Pilar Roboh & Patah Tergeletak di Rumput
  const fallenPillars = [
    { x: -115, z: 66, len: 4.2, r: 0.8, rotY: 0.65 },
    { x: -94, z: 82, len: 3.5, r: 0.75, rotY: -0.85 },
    { x: -118, z: 86, len: 4.8, r: 0.85, rotY: 1.2 },
    { x: -96, z: 64, len: 3.0, r: 0.7, rotY: -0.3 },
  ];

  fallenPillars.forEach((fp) => {
    const y = getTerrainHeight(fp.x, fp.z);
    const brokenCol = new THREE.Group();
    brokenCol.position.set(fp.x, y + fp.r * 0.9, fp.z);
    brokenCol.rotation.y = fp.rotY;

    // Batang pilar silinder merebah
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(fp.r, fp.r, fp.len, 8), matStoneRuins);
    shaft.rotateZ(Math.PI / 2);
    brokenCol.add(shaft);

    // Retakan batu pecahan di ujung pilar
    const chunk1 = new THREE.Mesh(new THREE.DodecahedronGeometry(fp.r * 0.7, 0), matStoneRuins);
    chunk1.position.set(fp.len * 0.55, -0.2, 0.2);
    const chunk2 = new THREE.Mesh(new THREE.DodecahedronGeometry(fp.r * 0.6, 0), matStoneRuins);
    chunk2.position.set(-fp.len * 0.55, -0.2, -0.15);
    brokenCol.add(chunk1, chunk2);

    ruinsGroup.add(brokenCol);
    colliders.push({ type: 'circle', x: fp.x, z: fp.z, radius: fp.len * 0.45, label: 'Pilar Roboh' });
  });

  // 4 Cawan Obor Api Sihir Biru Menyala di Sudut Reruntuhan
  const braziers = [
    { x: ruinsCenterX - 14, z: ruinsCenterZ - 14 },
    { x: ruinsCenterX + 14, z: ruinsCenterZ - 14 },
    { x: ruinsCenterX - 14, z: ruinsCenterZ + 14 },
    { x: ruinsCenterX + 14, z: ruinsCenterZ + 14 },
  ];

  braziers.forEach((br, bIdx) => {
    const by = getTerrainHeight(br.x, br.z);
    const bStand = new THREE.Group();
    bStand.position.set(br.x, by, br.z);

    // Kaki tiang tumpuan batu bertakik
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.3, 6), matStoneRuins);
    pedestal.position.y = 0.65;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.35, 0.35, 8), matStoneDarkCrag);
    bowl.position.y = 1.45;

    // Api sihir biru
    const blueFlame = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matBlueFire);
    blueFlame.position.y = 1.75;
    bStand.add(pedestal, bowl, blueFlame);

    // Cahaya point light biru
    const bLight = new THREE.PointLight(0x00f0ff, 1.8, 18);
    bLight.position.set(br.x, by + 1.85, br.z);
    ruinsGroup.add(bLight);

    animatedLights.push({ light: bLight, baseIntensity: 1.8, speed: 7 + bIdx });
    animatedFlames.push({ mesh: blueFlame, baseScale: new THREE.Vector3(1, 1.35, 1), speed: 8 + bIdx });

    ruinsGroup.add(bStand);
    colliders.push({ type: 'circle', x: br.x, z: br.z, radius: 0.85, label: 'Cawan Obor Biru' });
  });

  envGroup.add(ruinsGroup);

  // ============================================================================
  // 3. ZONA C: SARANG MONSTER LIAR / BEAST LAIR (X: -170 s.d. -230, Z: 70 s.d. 130)
  // ============================================================================
  const beastGroup = new THREE.Group();
  beastGroup.name = 'ZoneC_BeastLair';

  const lairCenterX = -200;
  const lairCenterZ = 100;

  // Formasi Tebing Batu Tajam Melingkar Menyerupai Sarang / Gua Terbuka
  const cragCount = 14;
  for (let i = 0; i < cragCount; i++) {
    // Membentuk tapal kuda terbuka ke arah Timur
    const angle = 0.45 * Math.PI + (i / cragCount) * 1.55 * Math.PI;
    const rDist = 18 + (i % 2) * 5;
    const cx = lairCenterX + Math.cos(angle) * rDist;
    const cz = lairCenterZ + Math.sin(angle) * rDist;
    const cy = getTerrainHeight(cx, cz);

    const cragHeight = 5.5 + Math.random() * 4.5;
    const cragWidth = 2.4 + Math.random() * 1.6;
    const crag = new THREE.Mesh(new THREE.ConeGeometry(cragWidth, cragHeight, 5), matStoneDarkCrag);
    crag.position.set(cx, cy + cragHeight * 0.45, cz);
    crag.rotation.y = Math.random() * Math.PI;
    crag.rotation.z = (Math.random() - 0.5) * 0.22;
    crag.rotation.x = (Math.random() - 0.5) * 0.22;
    beastGroup.add(crag);

    colliders.push({ type: 'circle', x: cx, z: cz, radius: cragWidth * 0.85, label: 'Tebing Batu Sarang' });
  }

  // 4 Pohon Mati Meranggas (Gnarled Dead Trees Tanpa Dedaunan)
  const deadTrees = [
    { x: -186, z: 86 },
    { x: -218, z: 92 },
    { x: -214, z: 116 },
    { x: -188, z: 120 },
  ];

  deadTrees.forEach((dt) => {
    if (isDesertBiome(dt.x, dt.z)) return;
    const dy = getTerrainHeight(dt.x, dt.z);
    const dTree = new THREE.Group();
    dTree.position.set(dt.x, dy, dt.z);

    // Batang bengkok
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 4.2, 5), matWoodDark);
    trunk.position.y = 2.1;
    trunk.rotation.z = (Math.random() - 0.5) * 0.25;
    dTree.add(trunk);

    // 3 Cabang ranting kering mencuat
    for (let b = 0; b < 3; b++) {
      const branchAngle = (b / 3) * Math.PI * 2;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.2, 4), matWoodDark);
      branch.position.set(Math.cos(branchAngle) * 0.6, 3.2 + b * 0.4, Math.sin(branchAngle) * 0.6);
      branch.rotation.z = 0.75;
      branch.rotation.y = branchAngle;
      dTree.add(branch);
    }

    beastGroup.add(dTree);
    colliders.push({ type: 'circle', x: dt.x, z: dt.z, radius: 0.75, label: 'Pohon Mati Meranggas' });
  });

  // Tulang Belulang & Sisa Kayu Lapuk
  const bonePiles = [
    { x: -196, z: 98 },
    { x: -206, z: 104 },
    { x: -192, z: 110 },
  ];

  bonePiles.forEach((bp) => {
    const by = getTerrainHeight(bp.x, bp.z);
    const boneGroup = new THREE.Group();
    boneGroup.position.set(bp.x, by + 0.1, bp.z);

    // Tulang rusuk melengkung (ribcage arches)
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.55 + r * 0.08, 0.07, 4, 8, Math.PI), matBone);
      rib.position.set(0, 0, (r - 1.5) * 0.35);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.y = (Math.random() - 0.5) * 0.3;
      boneGroup.add(rib);
    }

    // Tulang tengkorak binatang
    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), matBone);
    skull.position.set(0.65, 0.2, 0);
    skull.scale.set(1.4, 0.9, 0.9);
    boneGroup.add(skull);

    // Kayu lapuk
    const rottenLog = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 5), matWoodDark);
    rottenLog.rotation.z = Math.PI / 2;
    rottenLog.position.set(-0.6, 0.12, 0.4);
    boneGroup.add(rottenLog);

    beastGroup.add(boneGroup);
  });

  envGroup.add(beastGroup);

  // ============================================================================
  // 4. ZONA D: KOMPLEKS PERKEMAHAN BANDIT / OUTPOST PADAT (X: -220 s.d -280, Z: -10 s.d -60)
  // ============================================================================
  const outpostGroup = new THREE.Group();
  outpostGroup.name = 'ZoneD_EnemyOutpost';

  const outpostCenterX = -250;
  const outpostCenterZ = -35;
  const outpostBaseY = getTerrainHeight(outpostCenterX, outpostCenterZ);

  // Menara Pantau (Watchtower) Menyatu di Dalam Kamp
  const towerX = -266;
  const towerZ = -42;
  const towerY = getTerrainHeight(towerX, towerZ);
  const tower = new THREE.Group();
  tower.position.set(towerX, towerY, towerZ);

  const towerH = 6.8;
  const towerSpan = 2.6;
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, towerH, 6), matWoodRustic);
    post.position.set(sx * towerSpan * 0.5, towerH * 0.5, sz * towerSpan * 0.5);
    tower.add(post);
  });

  // Dek pengawas lantai atas
  const deck = new THREE.Mesh(new THREE.BoxGeometry(towerSpan + 0.8, 0.25, towerSpan + 0.8), matWoodRustic);
  deck.position.y = towerH - 1.2;
  tower.add(deck);

  // Pagar pembatas dek
  const railH = 0.9;
  [
    { p: [0, towerH - 1.2 + railH * 0.5, -(towerSpan * 0.5 + 0.3)], sz: [towerSpan + 0.8, 0.1, 0.08] },
    { p: [0, towerH - 1.2 + railH * 0.5, towerSpan * 0.5 + 0.3], sz: [towerSpan + 0.8, 0.1, 0.08] },
    { p: [-(towerSpan * 0.5 + 0.3), towerH - 1.2 + railH * 0.5, 0], sz: [0.08, 0.1, towerSpan + 0.8] },
    { p: [towerSpan * 0.5 + 0.3, towerH - 1.2 + railH * 0.5, 0], sz: [0.08, 0.1, towerSpan + 0.8] },
  ].forEach((rf) => {
    const rMesh = new THREE.Mesh(new THREE.BoxGeometry(rf.sz[0], rf.sz[1], rf.sz[2]), matWoodRustic);
    rMesh.position.set(rf.p[0], rf.p[1], rf.p[2]);
    tower.add(rMesh);
  });

  // Anak tangga kayu (ladder rungs) di salah satu tiang
  for (let l = 0; l < 10; l++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.06), matWoodRustic);
    rung.position.set(-towerSpan * 0.5, 0.8 + l * 0.5, 0);
    tower.add(rung);
  }

  // Atap kanopi piramida
  const roof = new THREE.Mesh(new THREE.ConeGeometry(towerSpan * 0.85, 1.4, 4), matTentFabric);
  roof.position.y = towerH + 0.9;
  roof.rotation.y = Math.PI / 4;
  tower.add(roof);

  outpostGroup.add(tower);
  colliders.push({ type: 'circle', x: towerX, z: towerZ, radius: 2.2, label: 'Menara Pengawas' });

  // 3 Tenda Kain Lusuh Menghadap Api Unggun Sentral
  const tents = [
    { x: -262, z: -26, rotY: 2.35, scale: 1.15 }, // Tenda Barat Laut
    { x: -238, z: -34, rotY: -1.55, scale: 1.05 }, // Tenda Timur
    { x: -252, z: -48, rotY: 0.15, scale: 1.25 }, // Tenda Selatan
  ];

  tents.forEach((td) => {
    const ty = getTerrainHeight(td.x, td.z);
    const tent = new THREE.Group();
    tent.position.set(td.x, ty, td.z);
    tent.rotation.y = td.rotY;
    tent.scale.setScalar(td.scale);

    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.8, 5), matTentFabric);
    canopy.position.y = 1.4;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.0, 5), matWoodRustic);
    pole.position.set(0, 1.5, 0.85);

    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 6), matWoodDark);
    rug.rotateX(-Math.PI / 2);
    rug.position.y = 0.03;

    tent.add(canopy, pole, rug);
    outpostGroup.add(tent);
    colliders.push({ type: 'circle', x: td.x, z: td.z, radius: 2.4 * td.scale, label: 'Tenda Bandit' });
  });

  // Barikade Kayu Runcing Mengelilingi Kamp (Perimeter Barricades)
  const barricades = [
    { x: -268, z: -18, rotY: -0.4, len: 7.0 },
    { x: -248, z: -16, rotY: 0.05, len: 7.0 },
    { x: -276, z: -35, rotY: 1.57, len: 7.5 },
    { x: -266, z: -54, rotY: 2.6, len: 7.0 },
    { x: -246, z: -56, rotY: 3.14, len: 7.0 },
    { x: -232, z: -48, rotY: -2.4, len: 6.5 },
  ];

  barricades.forEach((bc) => {
    const by = getTerrainHeight(bc.x, bc.z);
    const bGroup = new THREE.Group();
    bGroup.position.set(bc.x, by, bc.z);
    bGroup.rotation.y = bc.rotY;

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(bc.len, 0.16, 0.16), matWoodRustic);
    crossBeam.position.y = 0.75;
    bGroup.add(crossBeam);

    const stakeCount = Math.floor(bc.len / 0.75);
    for (let s = 0; s < stakeCount; s++) {
      const sx = -bc.len * 0.5 + 0.4 + s * 0.75;
      const spike1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.7, 5), matWoodRustic);
      spike1.position.set(sx, 0.85, 0.15);
      spike1.rotation.x = 0.35;
      const spike2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.7, 5), matWoodRustic);
      spike2.position.set(sx, 0.85, -0.15);
      spike2.rotation.x = -0.35;
      bGroup.add(spike1, spike2);
    }

    outpostGroup.add(bGroup);
    colliders.push({ type: 'circle', x: bc.x, z: bc.z, radius: bc.len * 0.4, label: 'Barikade Runcing' });
  });

  // Api Unggun Besar di Tengah Perkemahan dengan Panci Masak Tembaga
  const campFireGroup = new THREE.Group();
  campFireGroup.position.set(outpostCenterX, outpostBaseY, outpostCenterZ);

  // Lingkaran batu api unggun
  const rockRingCount = 10;
  for (let r = 0; r < rockRingCount; r++) {
    const rAngle = (r / rockRingCount) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), matStoneDarkCrag);
    stone.position.set(Math.cos(rAngle) * 1.35, 0.18, Math.sin(rAngle) * 1.35);
    campFireGroup.add(stone);
  }

  // Kayu bakar silang
  for (let l = 0; l < 4; l++) {
    const lAngle = (l / 4) * Math.PI;
    const firewood = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 5), matWoodDark);
    firewood.rotateZ(Math.PI / 2);
    firewood.rotation.y = lAngle;
    firewood.position.y = 0.22;
    campFireGroup.add(firewood);
  }

  // Api unggun berkobar
  const campFlame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.45, 6), matOrangeFire);
  campFlame.position.y = 0.85;
  campFireGroup.add(campFlame);

  // Tripod tiang kayu penyangga panci masak
  for (let t = 0; t < 3; t++) {
    const tAngle = (t / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 4), matWoodRustic);
    leg.position.set(Math.cos(tAngle) * 0.75, 1.25, Math.sin(tAngle) * 0.75);
    leg.rotation.z = 0.32;
    leg.rotation.y = tAngle;
    campFireGroup.add(leg);
  }

  // Panci masak tembaga
  const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), matCopperCauldron);
  cauldron.position.y = 1.4;
  cauldron.scale.set(1.1, 0.85, 1.1);
  campFireGroup.add(cauldron);

  // Cahaya api unggun
  const fireLight = new THREE.PointLight(0xff7700, 2.8, 28);
  fireLight.position.set(outpostCenterX, outpostBaseY + 1.2, outpostCenterZ);
  outpostGroup.add(fireLight);

  animatedLights.push({ light: fireLight, baseIntensity: 2.8, speed: 10 });
  animatedFlames.push({ mesh: campFlame, baseScale: new THREE.Vector3(1, 1.3, 1), speed: 11 });

  outpostGroup.add(campFireGroup);
  colliders.push({ type: 'circle', x: outpostCenterX, z: outpostCenterZ, radius: 1.6, label: 'Api Unggun' });

  // Peti Kayu Rampasan (Loot Crates)
  const lootStacks = [
    { x: -264, z: -28, crates: [
      { dx: 0, dz: 0, w: 0.8, h: 0.65, dy: 0 },
      { dx: 0.7, dz: 0.1, w: 0.65, h: 0.6, dy: 0 },
      { dx: 0.3, dz: 0.05, w: 0.6, h: 0.55, dy: 0.65 },
    ]},
    { x: -248, z: -44, crates: [
      { dx: 0, dz: 0, w: 0.9, h: 0.75, dy: 0 },
      { dx: 0.8, dz: -0.15, w: 0.7, h: 0.65, dy: 0 },
      { dx: 0.35, dz: 0.0, w: 0.65, h: 0.6, dy: 0.75 },
    ]},
    { x: -263, z: -46, crates: [
      { dx: 0, dz: 0, w: 0.75, h: 0.6, dy: 0 },
      { dx: 0.65, dz: 0.1, w: 0.65, h: 0.55, dy: 0 },
    ]},
  ];

  lootStacks.forEach((ls) => {
    const ly = getTerrainHeight(ls.x, ls.z);
    ls.crates.forEach((c) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.w), matWoodDark);
      box.position.set(ls.x + c.dx, ly + c.dy + c.h * 0.5, ls.z + c.dz);
      box.rotation.y = (Math.random() - 0.5) * 0.4;

      const band = new THREE.Mesh(new THREE.BoxGeometry(c.w * 1.02, 0.08, c.w * 1.02), matIronBands);
      band.position.set(ls.x + c.dx, ly + c.dy + c.h * 0.5, ls.z + c.dz);
      outpostGroup.add(box, band);
    });
    colliders.push({ type: 'circle', x: ls.x, z: ls.z, radius: 1.3, label: 'Peti Rampasan' });
  });

  // Tong Anggur Kayu Rusak (Broken Wine Barrels)
  const wineBarrels = [
    { x: -247, z: -31, rotX: 0, rotY: 0.2, rotZ: 0 }, // Tegak
    { x: -255, z: -38, rotX: 0.2, rotY: 0.8, rotZ: 1.45 }, // Tergeletak miring
    { x: -242, z: -39, rotX: -0.15, rotY: 1.2, rotZ: 0.2 }, // Sedikit miring pecah
  ];

  wineBarrels.forEach((wb) => {
    const wy = getTerrainHeight(wb.x, wb.z);
    const bGroup = new THREE.Group();
    bGroup.position.set(wb.x, wy + 0.45, wb.z);
    bGroup.rotation.set(wb.rotX, wb.rotY, wb.rotZ);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.95, 8), matWineBarrel);
    const hoop1 = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 8), matIronBands);
    hoop1.position.y = 0.26;
    const hoop2 = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 8), matIronBands);
    hoop2.position.y = -0.26;

    bGroup.add(barrel, hoop1, hoop2);
    outpostGroup.add(bGroup);
    colliders.push({ type: 'circle', x: wb.x, z: wb.z, radius: 0.65, label: 'Tong Anggur Rusak' });
  });

  // Obor Tiang Kayu Berkobar (Standing Wooden Torches)
  const campTorches = [
    { x: -234, z: -24 }, // Gerbang kamp sisi utara
    { x: -234, z: -32 }, // Gerbang kamp sisi selatan
    { x: -264, z: -38 }, // Dekat menara pengawas
    { x: -258, z: -22 }, // Dekat tenda 1
  ];

  campTorches.forEach((ct, tIdx) => {
    const ty = getTerrainHeight(ct.x, ct.z);
    const tGroup = new THREE.Group();
    tGroup.position.set(ct.x, ty, ct.z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 5), matWoodDark);
    pole.position.y = 1.1;

    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.35, 6), matIronBands);
    basket.position.y = 2.15;

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 5), matOrangeFire);
    flame.position.y = 2.45;

    tGroup.add(pole, basket, flame);
    outpostGroup.add(tGroup);

    const tLight = new THREE.PointLight(0xff8800, 1.6, 14);
    tLight.position.set(ct.x, ty + 2.5, ct.z);
    outpostGroup.add(tLight);

    animatedLights.push({ light: tLight, baseIntensity: 1.6, speed: 8 + tIdx });
    animatedFlames.push({ mesh: flame, baseScale: new THREE.Vector3(1, 1.25, 1), speed: 9 + tIdx });
  });

  envGroup.add(outpostGroup);

  // ============================================================================
  // 5. ZONA E: SABANA & LERENG BUKIT PADANG RUMPUT (X: -290 s.d -350, Z: 80 s.d 150)
  // ============================================================================
  const savannaGroup = new THREE.Group();
  savannaGroup.name = 'ZoneE_SavannaHills';

  // Gugusan Bebatuan Besar (Rock Clusters) dengan Variasi Skala
  const rockClusters = [
    // Gugusan Punggung Bukit Barat
    { cx: -332, cz: 108, rocks: [
      { dx: 0, dz: 0, s: [2.6, 2.2, 2.4], rot: 0.4 },
      { dx: 2.2, dz: 1.2, s: [1.8, 1.6, 1.9], rot: -0.8 },
      { dx: -1.9, dz: -1.4, s: [2.1, 1.9, 1.8], rot: 1.2 },
      { dx: 0.8, dz: -2.3, s: [1.5, 1.3, 1.6], rot: -1.5 },
      { dx: -2.4, dz: 1.8, s: [1.4, 1.2, 1.5], rot: 0.9 },
    ]},
    // Gugusan Puncak Lereng Utara
    { cx: -306, cz: 136, rocks: [
      { dx: 0, dz: 0, s: [2.8, 2.4, 2.5], rot: 1.1 },
      { dx: 2.4, dz: -0.8, s: [2.0, 1.7, 1.9], rot: -0.5 },
      { dx: -2.1, dz: 1.4, s: [1.6, 1.4, 1.7], rot: 0.3 },
      { dx: 1.2, dz: 2.1, s: [1.4, 1.1, 1.4], rot: -1.2 },
    ]},
    // Gugusan Lembah Sabana Selatan
    { cx: -342, cz: 92, rocks: [
      { dx: 0, dz: 0, s: [2.5, 2.0, 2.3], rot: -0.7 },
      { dx: 1.8, dz: 1.5, s: [1.9, 1.6, 1.8], rot: 0.6 },
      { dx: -1.7, dz: -1.6, s: [1.7, 1.3, 1.6], rot: -1.1 },
      { dx: 2.6, dz: -1.2, s: [1.4, 1.1, 1.5], rot: 1.4 },
      { dx: -2.5, dz: 1.1, s: [1.3, 1.0, 1.4], rot: -0.3 },
    ]},
  ];

  rockClusters.forEach((rc) => {
    rc.rocks.forEach((r) => {
      const rx = rc.cx + r.dx;
      const rz = rc.cz + r.dz;
      const ry = getTerrainHeight(rx, rz);
      const bMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), matStoneDarkCrag);
      bMesh.position.set(rx, ry + r.s[1] * 0.45, rz);
      bMesh.scale.set(r.s[0], r.s[1], r.s[2]);
      bMesh.rotation.set(r.rot * 0.5, r.rot, r.rot * 0.3);
      savannaGroup.add(bMesh);
    });
    colliders.push({ type: 'circle', x: rc.cx, z: rc.cz, radius: 3.5, label: 'Gugusan Batu Sabana' });
  });

  // Kelompok Pohon Cemara Lebat di Punggung Bukit Noise
  const hillPines = [
    { x: -315, z: 120, s: 1.25 },
    { x: -319, z: 125, s: 1.1 },
    { x: -322, z: 118, s: 1.35 },
    { x: -312, z: 115, s: 1.05 },
    { x: -326, z: 128, s: 1.2 },
    { x: -330, z: 134, s: 1.15 },
    { x: -324, z: 112, s: 1.3 },
  ];

  hillPines.forEach((hp) => {
    if (isDesertBiome(hp.x, hp.z)) return;
    const hy = getTerrainHeight(hp.x, hp.z);
    const pGroup = new THREE.Group();
    pGroup.position.set(hp.x, hy, hp.z);
    pGroup.scale.setScalar(hp.s);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 2.4, 5), matWoodRustic);
    trunk.position.y = 1.2;
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.3, 5), matPineFoliage);
    c1.position.y = 2.5;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.0, 5), matPineFoliage);
    c2.position.y = 3.8;
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 5), matPineFoliage);
    c3.position.y = 4.9;

    pGroup.add(trunk, c1, c2, c3);
    savannaGroup.add(pGroup);
    colliders.push({ type: 'circle', x: hp.x, z: hp.z, radius: 1.1 * hp.s, label: 'Pohon Cemara Bukit' });
  });

  // Kelompok Pohon Rindang Oak Lebat
  const hillOaks = [
    { x: -298, z: 95, s: 1.2 },
    { x: -304, z: 102, s: 1.35 },
    { x: -308, z: 90, s: 1.15 },
    { x: -335, z: 142, s: 1.25 },
    { x: -340, z: 146, s: 1.1 },
    { x: -344, z: 138, s: 1.3 },
    { x: -300, z: 115, s: 1.1 },
    { x: -332, z: 98, s: 1.2 },
  ];

  hillOaks.forEach((ho) => {
    if (isDesertBiome(ho.x, ho.z)) return;
    const oy = getTerrainHeight(ho.x, ho.z);
    const oGroup = new THREE.Group();
    oGroup.position.set(ho.x, oy, ho.z);
    oGroup.scale.setScalar(ho.s);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 2.8, 6), matWoodRustic);
    trunk.position.y = 1.4;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 0), matOakFoliage);
    crown.position.y = 4.0;
    crown.scale.set(1.1, 0.95, 1.05);

    oGroup.add(trunk, crown);
    savannaGroup.add(oGroup);
    colliders.push({ type: 'circle', x: ho.x, z: ho.z, radius: 1.3 * ho.s, label: 'Pohon Oak Sabana' });
  });

  envGroup.add(savannaGroup);

  // ============================================================================
  // 6. ZONA F: WILAYAH PESISIR BARAT & TEBING PANTAI (X: -400 s.d -450, Z: -50 s.d -240)
  // ============================================================================
  const coastGroup = new THREE.Group();
  coastGroup.name = 'ZoneF_WesternCoast';

  // Helper Pembuat Pohon Kelapa/Palem Tropis Miring (Leaning Palm Tree)
  function createPalmTree(x: number, z: number, leanAngle: number, leanDir: number, scale = 1.0) {
    const y = getTerrainHeight(x, z);
    const palm = new THREE.Group();
    palm.position.set(x, y, z);
    palm.rotation.y = leanDir;
    palm.scale.setScalar(scale);

    // Batang melengkung bertingkat (curved segmented trunk)
    const segCount = 6;
    const segH = 0.95;
    let curX = 0;
    let curY = 0;
    for (let i = 0; i < segCount; i++) {
      const r = 0.22 - i * 0.015;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, segH, 6), matPalmTrunk);
      seg.position.set(curX, curY + segH * 0.5, 0);
      seg.rotation.z = -leanAngle * (i / segCount);

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.08, 6), matPalmRing);
      ring.position.set(curX, curY + segH * 0.95, 0);
      ring.rotation.z = -leanAngle * (i / segCount);

      palm.add(seg, ring);
      curX += Math.sin(leanAngle * (i / segCount)) * segH;
      curY += Math.cos(leanAngle * (i / segCount)) * segH;
    }

    // Tajuk Pelepah Daun Kelapa (Palm Fronds Crown)
    const frondCount = 7;
    for (let f = 0; f < frondCount; f++) {
      const fAngle = (f / frondCount) * Math.PI * 2;
      const frond = new THREE.Group();
      frond.position.set(curX, curY, 0);
      frond.rotation.y = fAngle;

      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 4), matPalmLeaf);
      leaf.position.set(0, 0.8, 1.2);
      leaf.rotation.x = 1.15;
      leaf.scale.set(1.0, 1.0, 0.15);
      frond.add(leaf);

      palm.add(frond);
    }

    // Gerombolan Buah Kelapa di Bawah Daun
    for (let c = 0; c < 4; c++) {
      const cAngle = (c / 4) * Math.PI * 2 + 0.3;
      const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 5), matCoconut);
      coconut.position.set(curX + Math.cos(cAngle) * 0.35, curY - 0.2, Math.sin(cAngle) * 0.35);
      palm.add(coconut);
    }

    coastGroup.add(palm);
    colliders.push({ type: 'circle', x, z, radius: 0.9 * scale, label: 'Pohon Kelapa Pantai' });
  }

  // Deretan Pohon Kelapa/Palem Miring di Sepanjang Garis Pantai
  const coastalPalms = [
    { x: -408, z: -65, lean: 0.32, dir: 1.5, s: 1.15 },
    { x: -412, z: -85, lean: 0.28, dir: 1.3, s: 1.05 },
    { x: -416, z: -110, lean: 0.35, dir: 1.6, s: 1.2 },
    { x: -419, z: -130, lean: 0.30, dir: 1.4, s: 1.1 },
    { x: -422, z: -150, lean: 0.36, dir: 1.7, s: 1.25 },
    { x: -425, z: -175, lean: 0.32, dir: 1.5, s: 1.15 },
    { x: -428, z: -195, lean: 0.34, dir: 1.6, s: 1.2 },
    { x: -432, z: -215, lean: 0.28, dir: 1.3, s: 1.05 },
    { x: -436, z: -235, lean: 0.35, dir: 1.6, s: 1.2 },
    // Palem cadangan di gumuk pasir
    { x: -404, z: -95, lean: 0.25, dir: 1.2, s: 1.0 },
    { x: -414, z: -165, lean: 0.30, dir: 1.5, s: 1.1 },
    { x: -420, z: -205, lean: 0.27, dir: 1.4, s: 1.05 },
    { x: -410, z: -120, lean: 0.33, dir: 1.6, s: 1.15 },
  ];

  coastalPalms.forEach((cp) => {
    createPalmTree(cp.x, cp.z, cp.lean, cp.dir, cp.s);
  });

  // Reruntuhan Perahu Kayu Karam di Dekat Garis Pantai
  const wreckX = -428;
  const wreckZ = -135;
  const wreckY = getTerrainHeight(wreckX, wreckZ);
  const wreckGroup = new THREE.Group();
  wreckGroup.position.set(wreckX, wreckY + 0.3, wreckZ);
  wreckGroup.rotation.set(0.18, 0.65, 0.32); // Miring terdampar di pasir

  // Lambung kapal kayu besar retak
  const hullLength = 9.5;
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, hullLength), matShipWood);
  keel.position.y = 0.25;
  wreckGroup.add(keel);

  // Tulang iga rusuk kapal melengkung keluar dari pasir
  for (let r = 0; r < 7; r++) {
    const rz = -hullLength * 0.45 + r * (hullLength * 0.15);
    const ribW = 2.4 - Math.abs(r - 3) * 0.35;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(ribW * 0.5, 0.14, 5, 8, Math.PI), matShipWood);
    rib.rotation.x = Math.PI / 2;
    rib.rotation.y = (Math.random() - 0.5) * 0.2;
    rib.position.set(0, 0.4, rz);
    wreckGroup.add(rib);
  }

  // Papan dinding geladak yang lapuk & pecah
  for (let p = 0; p < 6; p++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, hullLength * 0.75), matShipPlank);
    plank.position.set(1.1 + (p % 2) * 0.15, 0.3 + p * 0.35, 0);
    plank.rotation.z = 0.25;
    wreckGroup.add(plank);
  }

  // Tiang layar patah (snapped mast) miring
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 4.2, 6), matShipWood);
  mast.position.set(-0.2, 1.8, -0.6);
  mast.rotation.z = -0.55;
  mast.rotation.x = 0.3;
  wreckGroup.add(mast);

  // Palang layar patah (yardarm) tergeletak
  const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 5), matShipWood);
  yardarm.position.set(0.8, 0.4, 0.8);
  yardarm.rotation.y = 0.8;
  yardarm.rotation.z = 0.15;
  wreckGroup.add(yardarm);

  // Peti dan tong kargo terdampar di sekitar kapal
  [
    { dx: 2.2, dz: 1.5, w: 0.8, h: 0.65 },
    { dx: -2.0, dz: 2.2, w: 0.7, h: 0.55 },
    { dx: 2.8, dz: -1.8, w: 0.75, h: 0.6 },
  ].forEach((wc) => {
    const cMesh = new THREE.Mesh(new THREE.BoxGeometry(wc.w, wc.h, wc.w), matWoodDark);
    cMesh.position.set(wc.dx, 0.3, wc.dz);
    cMesh.rotation.y = Math.random() * Math.PI;
    wreckGroup.add(cMesh);
  });

  coastGroup.add(wreckGroup);
  colliders.push({ type: 'circle', x: wreckX, z: wreckZ, radius: 4.8, label: 'Bangkai Perahu Karam' });

  // Formasi Batu Karang Laut di Bibir Air (Sea Reef Rocks)
  const coastalReefs = [
    { x: -435, z: -75, rocks: [
      { dx: 0, dz: 0, s: [3.2, 2.2, 3.0] },
      { dx: 2.1, dz: 1.4, s: [2.0, 1.6, 2.2] },
      { dx: -1.8, dz: -1.2, s: [1.8, 1.4, 1.7] },
    ]},
    { x: -440, z: -115, rocks: [
      { dx: 0, dz: 0, s: [3.5, 2.5, 3.2] },
      { dx: 1.8, dz: -1.6, s: [2.2, 1.8, 2.0] },
    ]},
    { x: -445, z: -155, rocks: [
      { dx: 0, dz: 0, s: [3.0, 2.4, 2.8] },
      { dx: -2.2, dz: 1.5, s: [2.1, 1.5, 2.3] },
      { dx: 1.9, dz: -1.1, s: [1.9, 1.4, 1.8] },
    ]},
    { x: -442, z: -190, rocks: [
      { dx: 0, dz: 0, s: [3.4, 2.2, 3.1] },
      { dx: 2.4, dz: 1.0, s: [2.0, 1.5, 2.0] },
    ]},
    { x: -448, z: -225, rocks: [
      { dx: 0, dz: 0, s: [3.6, 2.6, 3.5] },
      { dx: -2.1, dz: -1.5, s: [2.3, 1.7, 2.1] },
    ]},
  ];

  coastalReefs.forEach((cr) => {
    cr.rocks.forEach((r) => {
      const rx = cr.x + r.dx;
      const rz = cr.z + r.dz;
      const ry = getTerrainHeight(rx, rz);
      const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), matWetSeaRock);
      crag.position.set(rx, ry + r.s[1] * 0.4, rz);
      crag.scale.set(r.s[0], r.s[1], r.s[2]);
      crag.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      coastGroup.add(crag);
    });
    colliders.push({ type: 'circle', x: cr.x, z: cr.z, radius: 3.2, label: 'Batu Karang Laut' });
  });

  envGroup.add(coastGroup);

  // ============================================================================
  // 4. ZONA G: PADANG RUMPUT UTARA & SARANG SERIGALA RIMBA (X: -60 s.d -120, Z: -30 s.d -90)
  // Menghidupkan wilayah koordinat X: -77, Z: -45 dan bukit landai sekitarnya
  // Serta menata cekungan sarang monster buas berjarak > 190 unit dari pusat desa
  // ============================================================================
  const meadowGroup = new THREE.Group();
  meadowGroup.name = 'ZoneG_NorthernMeadows';

  // 1. Puncak Pemandangan Bukit Padang Rumput (Scenic Hill Overlook di X: -77, Z: -45)
  const landmarkX = -77;
  const landmarkZ = -45;
  const landmarkY = getTerrainHeight(landmarkX, landmarkZ);

  // Megalit Kuno Puncak Bukit (Weather-worn Waypoint Monolith)
  const monolith = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, 3.8, 6), matStoneRuins);
  monolith.position.set(landmarkX, landmarkY + 1.9, landmarkZ);
  monolith.rotation.y = 0.45;
  monolith.castShadow = true;
  meadowGroup.add(monolith);
  colliders.push({ type: 'circle', x: landmarkX, z: landmarkZ, radius: 1.4, label: 'Megalit Padang Rumput' });

  // Lingkaran Rune Kuno Lemah di dasar Megalit
  const runeRing = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.9, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
  );
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.set(landmarkX, landmarkY + 0.04, landmarkZ);
  meadowGroup.add(runeRing);

  // Batang Kayu Tumbang Berlumut / Bangku Kayu Rustic Alami
  const logX = -74.5;
  const logZ = -42.5;
  const logY = getTerrainHeight(logX, logZ);
  const mossyLog = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 3.6, 6), matWoodRustic);
  mossyLog.position.set(logX, logY + 0.32, logZ);
  mossyLog.rotation.z = Math.PI / 2;
  mossyLog.rotation.y = 0.65;
  mossyLog.castShadow = true;
  meadowGroup.add(mossyLog);
  colliders.push({ type: 'circle', x: logX, z: logZ, radius: 1.2, label: 'Batang Kayu Berlumut' });

  // 2. CEKUNGAN MONSTER SERIGALA RIMBA / WILD WOLF HOLLOW (Pusat [ -95, -65 ])
  // Terletak di cekungan bukit, berjarak > 195 unit dari pusat desa
  const wolfLairX = -95;
  const wolfLairZ = -65;
  const wolfLairY = getTerrainHeight(wolfLairX, wolfLairZ);

  // Penanda Lingkungan: Bercak Tanah Gelap / Dark Scorched Soil Decal
  const darkSoilPatch = new THREE.Mesh(
    new THREE.CircleGeometry(16, 24),
    matDarkSoil
  );
  darkSoilPatch.rotation.x = -Math.PI / 2;
  darkSoilPatch.position.set(wolfLairX, wolfLairY + 0.03, wolfLairZ);
  darkSoilPatch.receiveShadow = true;
  meadowGroup.add(darkSoilPatch);

  // Formasi 9 Batu Runcing Mengelilingi Cekungan Tapal Kuda (Sharp Dark Crags)
  const sharpCragCount = 9;
  for (let sc = 0; sc < sharpCragCount; sc++) {
    const scAngle = 0.3 * Math.PI + (sc / sharpCragCount) * 1.5 * Math.PI;
    const scDist = 13 + (sc % 2) * 3.5;
    const rcX = wolfLairX + Math.cos(scAngle) * scDist;
    const rcZ = wolfLairZ + Math.sin(scAngle) * scDist;
    const rcY = getTerrainHeight(rcX, rcZ);

    const cragH = 3.6 + Math.random() * 2.8;
    const cragW = 1.6 + Math.random() * 1.2;
    const cragMesh = new THREE.Mesh(new THREE.ConeGeometry(cragW, cragH, 5), matStoneDarkCrag);
    cragMesh.position.set(rcX, rcY + cragH * 0.45, rcZ);
    cragMesh.rotation.y = Math.random() * Math.PI * 2;
    cragMesh.rotation.z = (Math.random() - 0.5) * 0.28;
    cragMesh.castShadow = true;
    meadowGroup.add(cragMesh);

    colliders.push({ type: 'circle', x: rcX, z: rcZ, radius: cragW * 0.85, label: 'Batu Runcing Sarang Serigala' });
  }

  // 3 Batang Pohon Mati Meranggas (Twisted Dead Trees)
  const deadTreeCoords = [
    { x: -88, z: -57 },
    { x: -103, z: -63 },
    { x: -94, z: -76 },
  ];
  deadTreeCoords.forEach((dt) => {
    if (isDesertBiome(dt.x, dt.z)) return;
    const dty = getTerrainHeight(dt.x, dt.z);
    const deadTree = new THREE.Group();
    deadTree.position.set(dt.x, dty, dt.z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 4.0, 5), matWoodDark);
    trunk.position.y = 2.0;
    trunk.rotation.z = (Math.random() - 0.5) * 0.3;
    trunk.rotation.x = (Math.random() - 0.5) * 0.25;
    trunk.castShadow = true;
    deadTree.add(trunk);

    // Cabang ranting kering mencuat
    for (let b = 0; b < 3; b++) {
      const bGeo = new THREE.CylinderGeometry(0.08, 0.16, 2.0, 4);
      const branch = new THREE.Mesh(bGeo, matWoodDark);
      branch.position.set((b - 1) * 0.45, 2.8 + b * 0.35, 0);
      branch.rotation.z = (b % 2 === 0 ? 1 : -1) * (0.6 + Math.random() * 0.4);
      deadTree.add(branch);
    }

    meadowGroup.add(deadTree);
    colliders.push({ type: 'circle', x: dt.x, z: dt.z, radius: 1.0, label: 'Pohon Mati Padang' });
  });

  // Tumpukan Tulang Belulang & Tengkorak Hewan Mangsa
  const wolfBones = [
    { x: -92, z: -62 },
    { x: -97, z: -68 },
    { x: -89, z: -70 },
  ];
  wolfBones.forEach((wb) => {
    const wby = getTerrainHeight(wb.x, wb.z);
    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), matBone);
    skull.position.set(wb.x, wby + 0.18, wb.z);
    skull.rotation.set(0.3, Math.random() * Math.PI, 0.2);
    skull.castShadow = true;
    meadowGroup.add(skull);
  });

  envGroup.add(meadowGroup);

  // ============================================================================
  // 5. ZONA H: RERUNTUHAN COLOSSEUM KUNO / ANCIENT COLOSSEUM ARENA (X: -224, Z: -435)
  // Perbesar skala wilayah boss minimal 2.5x lipat dari ukuran sebelumnya (Radius 52 unit).
  // Arsitektur Colosseum Kuno:
  // - Dinding melingkar bertingkat Roman Stone Arches dengan beberapa bagian runtuh alami.
  // - Lantai arena: hamparan pasir berdebu luas, retakan batu kuno, bercak hangus, pecahan pilar marmer.
  // - Gapura masuk raksasa (Grand South Entrance Arch) di sisi selatan.
  // - Tata pencahayaan: 6 obor cawan perunggu berkobar di sekeliling arena.
  // ============================================================================
  const colosseumGroup = new THREE.Group();
  colosseumGroup.name = 'ZoneH_AncientColosseumBossArena';

  const colosseumCenterX = -224;
  const colosseumCenterZ = -435;
  const craterCenterX = colosseumCenterX;
  const craterCenterZ = colosseumCenterZ;
  const colosseumFloorY = -0.20;
  const arenaRadius = 48.0;
  const wallRadius = 53.0;

  // A. Lantai Arena Pasir Berdebu Luas (Dusty Sand Floor)
  const matColosseumSand = new THREE.MeshStandardMaterial({
    color: 0xc4b59d,
    roughness: 0.92,
    flatShading: true,
  });
  const arenaFloor = new THREE.Mesh(
    new THREE.CircleGeometry(arenaRadius, 48).rotateX(-Math.PI / 2),
    matColosseumSand
  );
  arenaFloor.position.set(colosseumCenterX, colosseumFloorY + 0.02, colosseumCenterZ);
  arenaFloor.receiveShadow = true;
  colosseumGroup.add(arenaFloor);

  // B. Bercak Hangus & Retakan Batu Kuno pada Lantai Arena
  const scorchCoords = [
    { dx: -12, dz: -8, r: 4.8 },
    { dx: 14, dz: 6, r: 5.2 },
    { dx: -6, dz: 16, r: 3.8 },
    { dx: 18, dz: -14, r: 4.5 },
    { dx: 0, dz: 0, r: 6.0 }, // Titik sentral tumbukan
    { dx: -18, dz: -18, r: 3.5 },
  ];
  scorchCoords.forEach((sc) => {
    const scorch = new THREE.Mesh(
      new THREE.CircleGeometry(sc.r, 20).rotateX(-Math.PI / 2),
      matDarkSoil
    );
    scorch.position.set(colosseumCenterX + sc.dx, colosseumFloorY + 0.04, colosseumCenterZ + sc.dz);
    scorch.receiveShadow = true;
    colosseumGroup.add(scorch);
  });

  // Pelat Batu Kuno Pecah di Lantai Arena (Cracked Stone Slabs)
  for (let s = 0; s < 14; s++) {
    const sAng = (s / 14) * Math.PI * 2;
    const sDist = 12.0 + (s % 5) * 6.5;
    const sx = colosseumCenterX + Math.cos(sAng) * sDist;
    const sz = colosseumCenterZ + Math.sin(sAng) * sDist;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(2.6 + (s % 3) * 0.8, 0.12, 3.2 + (s % 4) * 0.6),
      matStoneRuins
    );
    slab.position.set(sx, colosseumFloorY + 0.06, sz);
    slab.rotation.y = sAng + Math.PI / 4;
    slab.receiveShadow = true;
    colosseumGroup.add(slab);
  }

  // Pecahan Pilar Marmer Roboh di Lantai Arena (Fallen Marble Column Drums)
  const fallenPillarOffsets = [
    { dx: -22, dz: 8, rotY: 0.6, len: 4.2 },
    { dx: 16, dz: -18, rotY: -0.8, len: 3.6 },
    { dx: -8, dz: -24, rotY: 1.2, len: 4.8 },
    { dx: 24, dz: 14, rotY: 2.1, len: 3.5 },
    { dx: 8, dz: 22, rotY: -1.4, len: 4.0 },
  ];
  fallenPillarOffsets.forEach((fp, idx) => {
    const px = colosseumCenterX + fp.dx;
    const pz = colosseumCenterZ + fp.dz;
    const colMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, fp.len, 12),
      matStoneRuins
    );
    colMesh.position.set(px, colosseumFloorY + 0.75, pz);
    colMesh.rotation.set(Math.PI / 2, fp.rotY, 0);
    colMesh.castShadow = true;
    colosseumGroup.add(colMesh);

    // Drum potongan pilar patah di dekatnya
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 1.2, 12), matStoneRuins);
    drum.position.set(px + Math.cos(fp.rotY) * 2.8, colosseumFloorY + 0.6, pz + Math.sin(fp.rotY) * 2.8);
    drum.rotation.set(0.3, Math.random() * Math.PI, 0.4);
    drum.castShadow = true;
    colosseumGroup.add(drum);

    colliders.push({ type: 'circle', x: px, z: pz, radius: 1.8, label: `Pilar Roboh Colosseum ${idx + 1}` });
  });

  // C. Dinding Melingkar Bertingkat (Roman Stone Arches) di Sekeliling Arena
  // 24 Bay melingkar di sekeliling arena, menyisakan gapura selatan
  const totalBays = 24;
  for (let b = 0; b < totalBays; b++) {
    const angle = (b / totalBays) * Math.PI * 2;
    // Celah gapura masuk selatan di sisi Z positif (sekitar angle ~ PI/2, yaitu Z: -382)
    const isSouthEntrance = Math.abs(angle - Math.PI / 2) < 0.28;
    if (isSouthEntrance) continue; // Biarkan terbuka untuk gerbang masuk pemain

    const bx = colosseumCenterX + Math.cos(angle) * wallRadius;
    const bz = colosseumCenterZ + Math.sin(angle) * wallRadius;
    const by = getTerrainHeight(bx, bz);

    // Beberapa bagian dinding runtuh alami (ruined breaches)
    const isRuined = b === 7 || b === 8 || b === 18 || b === 19;

    const bayGroup = new THREE.Group();
    bayGroup.position.set(bx, by, bz);
    bayGroup.rotation.y = -angle + Math.PI / 2;

    // Tingkat 1: Pilar Batu dan Lengkungan Bawah (Tier 1 Arcade)
    const pierL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 1.8), matStoneRuins);
    pierL.position.set(-2.4, 3.75, 0);
    pierL.castShadow = true;
    bayGroup.add(pierL);

    const pierR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 1.8), matStoneRuins);
    pierR.position.set(2.4, 3.75, 0);
    pierR.castShadow = true;
    bayGroup.add(pierR);

    // Lintel balok lengkung atas tingkat 1
    const archHeader = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.2, 2.0), matStoneRuins);
    archHeader.position.set(0, 7.5 + 0.6, 0);
    archHeader.castShadow = true;
    bayGroup.add(archHeader);

    if (!isRuined) {
      // Tingkat 2: Galeri Dinding Bertingkat Atas (Tier 2 Gallery)
      const tier2Wall = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.5, 1.6), matStoneRuins);
      tier2Wall.position.set(0, 8.7 + 2.75, 0);
      tier2Wall.castShadow = true;
      bayGroup.add(tier2Wall);

      // Cornice pembatas atas
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.8, 2.2), matStoneRuins);
      cornice.position.set(0, 14.2 + 0.4, 0);
      cornice.castShadow = true;
      bayGroup.add(cornice);
    } else {
      // Dinding runtuh: puing batu berserakan di dasar
      for (let r = 0; r < 4; r++) {
        const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 + (r % 3) * 0.35, 0), matStoneRuins);
        rubble.position.set((r - 1.5) * 1.2, 0.5 + (r % 2) * 0.4, (r % 2 === 0 ? 1.0 : -1.0));
        rubble.castShadow = true;
        bayGroup.add(rubble);
      }
    }

    colosseumGroup.add(bayGroup);
    colliders.push({ type: 'circle', x: bx, z: bz, radius: 2.5, label: `Dinding Colosseum Bay ${b + 1}` });
  }

  // D. Gapura Masuk Raksasa Sisi Selatan (Grand South Entrance Archway)
  // Berada di sisi selatan Z = colosseumCenterZ + wallRadius = -382
  const entrancePortalX = colosseumCenterX;
  const entrancePortalZ = colosseumCenterZ + wallRadius;
  const entranceY = getTerrainHeight(entrancePortalX, entrancePortalZ);

  const portalGroup = new THREE.Group();
  portalGroup.position.set(entrancePortalX, entranceY, entrancePortalZ);

  // Menara Tiang Gerbang Kiri & Kanan Megah
  const gatePillarGeo = new THREE.BoxGeometry(2.8, 11.0, 3.2);
  const gatePillarL = new THREE.Mesh(gatePillarGeo, matStoneRuins);
  gatePillarL.position.set(-6.2, 5.5, 0);
  gatePillarL.castShadow = true;
  portalGroup.add(gatePillarL);

  const gatePillarR = new THREE.Mesh(gatePillarGeo, matStoneRuins);
  gatePillarR.position.set(6.2, 5.5, 0);
  gatePillarR.castShadow = true;
  portalGroup.add(gatePillarR);

  // Lintel Balok Gapura Lengkung Megah
  const gateArch = new THREE.Mesh(new THREE.BoxGeometry(14.8, 2.2, 3.6), matStoneRuins);
  gateArch.position.set(0, 11.0 + 1.1, 0);
  gateArch.castShadow = true;
  portalGroup.add(gateArch);

  // Pedimen segitiga mahkota gerbang
  const pediment = new THREE.Mesh(new THREE.ConeGeometry(5.5, 2.2, 4), matStoneRuins);
  pediment.position.set(0, 13.2 + 1.1, 0);
  pediment.rotation.y = Math.PI / 4;
  pediment.castShadow = true;
  portalGroup.add(pediment);

  colosseumGroup.add(portalGroup);
  colliders.push({ type: 'circle', x: entrancePortalX - 6.2, z: entrancePortalZ, radius: 2.2, label: 'Tiang Kiri Gapura Colosseum' });
  colliders.push({ type: 'circle', x: entrancePortalX + 6.2, z: entrancePortalZ, radius: 2.2, label: 'Tiang Kanan Gapura Colosseum' });

  // E. Tata Pencahayaan: 6 Obor Cawan Perunggu Berkobar (Bronze Braziers)
  const brazierAngles = [
    0,
    Math.PI / 3,
    (2 * Math.PI) / 3,
    Math.PI,
    (4 * Math.PI) / 3,
    (5 * Math.PI) / 3,
  ];
  const brazierRadius = 42.0;

  brazierAngles.forEach((bAng, bIdx) => {
    const brX = colosseumCenterX + Math.cos(bAng) * brazierRadius;
    const brZ = colosseumCenterZ + Math.sin(bAng) * brazierRadius;
    const brY = getTerrainHeight(brX, brZ);

    const brazierGroup = new THREE.Group();
    brazierGroup.position.set(brX, brY, brZ);

    // Kaki tiang batu berundak
    const baseStone = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.4, 8), matStoneRuins);
    baseStone.position.y = 0.7;
    baseStone.castShadow = true;
    brazierGroup.add(baseStone);

    // Cawan perunggu besar
    const bronzeBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 0.8, 0.7, 12),
      matCopperCauldron
    );
    bronzeBowl.position.y = 1.4 + 0.35;
    bronzeBowl.castShadow = true;
    brazierGroup.add(bronzeBowl);

    // Kobaran lidah api membara
    const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 8), matOrangeFire);
    flameMesh.position.y = 2.1 + 1.1;
    brazierGroup.add(flameMesh);

    animatedFlames.push({
      mesh: flameMesh,
      baseScale: new THREE.Vector3(1, 1, 1),
      speed: 4.2 + (bIdx % 3) * 0.8,
    });

    // Lampu dinamis obor arena
    const brazierLight = new THREE.PointLight(0xf97316, 2.8, 34);
    brazierLight.position.set(0, 3.2, 0);
    brazierGroup.add(brazierLight);

    animatedLights.push({
      light: brazierLight,
      baseIntensity: 2.8,
      speed: 5.5 + (bIdx % 4) * 0.9,
    });

    colosseumGroup.add(brazierGroup);
    colliders.push({ type: 'circle', x: brX, z: brZ, radius: 1.4, label: `Obor Cawan Colosseum ${bIdx + 1}` });
  });

  envGroup.add(colosseumGroup);

  // ============================================================================
  // 6. ZONA I: SISTEM ALIRAN SUNGAI BERCABANG (NORTHWEST, EAST -> CONFLUENCE -> SOUTH OCEAN)
  // Palung lama diratakan menjadi padang hijau, palung baru dialiri air jernih tanpa sumbatan batu.
  // ============================================================================
  const canyonGroup = new THREE.Group();
  canyonGroup.name = 'ZoneI_RiverNetworkAndRavine';

  // Pita Air Sungai Tiga Jalur Tanpa Putus (Continuous Translucent River Ribbon Mesh)
  const matRiverWater = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });

  function buildRiverRibbon(points: [number, number][], width: number, yLevel: number): THREE.Mesh {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let dx = 0;
      let dz = 0;
      if (i < points.length - 1) {
        dx += points[i + 1][0] - p[0];
        dz += points[i + 1][1] - p[1];
      }
      if (i > 0) {
        dx += p[0] - points[i - 1][0];
        dz += p[1] - points[i - 1][1];
      }
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const halfW = width * 0.5;

      // Titik Kiri
      vertices.push(p[0] + nx * halfW, yLevel, p[1] + nz * halfW);
      uvs.push(0, i / (points.length - 1));

      // Titik Kanan
      vertices.push(p[0] - nx * halfW, yLevel, p[1] - nz * halfW);
      uvs.push(1, i / (points.length - 1));

      if (i < points.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, matRiverWater);
    mesh.receiveShadow = true;
    return mesh;
  }

  // 1. Cabang Barat Laut
  canyonGroup.add(buildRiverRibbon(RIVER_NORTHWEST_BRANCH, 5.2, -0.42));
  // 2. Cabang Timur
  canyonGroup.add(buildRiverRibbon(RIVER_EAST_BRANCH, 5.0, -0.42));
  // 3. Alur Utama Hilir (Melewati Jembatan Gantung [142, 47] Menuju Samudra Selatan)
  canyonGroup.add(buildRiverRibbon(RIVER_MAIN_DOWNSTREAM, 5.6, -0.42));

  envGroup.add(canyonGroup);

  // ============================================================================
  // 7. ZONA J: TITIK MINAT BARU DATARAN BARAT (WESTERN POINTS OF INTEREST)
  // Menghidupkan wilayah luas X: -270 s.d -496, Z: -326 s.d 177 yang sebelumnya sepi
  // ============================================================================
  const westPOIGroup = new THREE.Group();
  westPOIGroup.name = 'ZoneJ_WesternPOIs';

  // ----------------------------------------------------------------------------
  // POI A: LEMBAH BATU LUMUT KUNO / ANCIENT MOSS GLADE (X: -326, Z: -55)
  // Formasi Stonehenge mini: lingkaran 5 batu monolit besar, semak bunga liar, & pilar lintel
  // Digeser aman > 20 unit menjauhi garis tengah jalan (X: -361, Z: -30) agar jalur setapak 100% bebas rintangan
  // ----------------------------------------------------------------------------
  const mossGladeX = -326;
  const mossGladeZ = -55;
  const mossGladeY = getTerrainHeight(mossGladeX, mossGladeZ);

  const stonehengeCount = 5;
  const stonehengeRadius = 7.5;
  for (let s = 0; s < stonehengeCount; s++) {
    const sAng = (s / stonehengeCount) * Math.PI * 2;
    const sx = mossGladeX + Math.cos(sAng) * stonehengeRadius;
    const sz = mossGladeZ + Math.sin(sAng) * stonehengeRadius;

    // ROAD CLEARANCE: Minimal 4.5 unit dari garis tengah jalan batu
    if (isPointNearRoad(sx, sz, 4.5)) continue;

    const sy = getTerrainHeight(sx, sz);

    const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.6, 1.1), matMossStone);
    monolith.position.set(sx, sy + 2.3, sz);
    monolith.rotation.y = sAng + 0.2;
    monolith.castShadow = true;
    westPOIGroup.add(monolith);
    colliders.push({ type: 'circle', x: sx, z: sz, radius: 1.2, label: 'Monolit Batu Lumut' });

    // Batu lintel horizontal melintang di atas dua pilar pertama
    if (s === 0) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 1.2), matMossStone);
      lintel.position.set(sx + 1.6, sy + 4.9, sz);
      lintel.rotation.y = sAng;
      lintel.castShadow = true;
      westPOIGroup.add(lintel);
    }
  }

  // Rumpun bunga liar dan semak subur di tengah Stonehenge
  for (let f = 0; f < 6; f++) {
    const fAng = (f / 6) * Math.PI * 2;
    const fx = mossGladeX + Math.cos(fAng) * 3.2;
    const fz = mossGladeZ + Math.sin(fAng) * 3.2;

    if (isPointNearRoad(fx, fz, 4.5)) continue;

    const fy = getTerrainHeight(fx, fz);

    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), matShrub);
    bush.position.set(fx, fy + 0.35, fz);
    bush.scale.set(1.2, 0.8, 1.2);
    westPOIGroup.add(bush);

    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), matWildflower);
    flower.position.set(fx, fy + 0.65, fz);
    westPOIGroup.add(flower);
  }

  // ----------------------------------------------------------------------------
  // POI B: POS PENJAGA RUSAK / RUINED WATCHPOST (X: -420, Z: 50)
  // Reruntuhan pondasi batu bata lumut, sisa tiang kayu menara, & gerobak rusak
  // ----------------------------------------------------------------------------
  const watchpostX = -420;
  const watchpostZ = 50;
  const watchposY = getTerrainHeight(watchpostX, watchpostZ);

  // Pondasi Dinding Batu Reruntuhan L-Shape
  const wallGeo1 = new THREE.BoxGeometry(6.5, 1.8, 1.2);
  const wall1 = new THREE.Mesh(wallGeo1, matStoneRuins);
  wall1.position.set(watchpostX, watchposY + 0.9, watchpostZ);
  wall1.castShadow = true;
  westPOIGroup.add(wall1);
  colliders.push({ type: 'box', minX: watchpostX - 3.4, maxX: watchpostX + 3.4, minZ: watchpostZ - 0.7, maxZ: watchpostZ + 0.7, label: 'Dinding Pos Rusak' });

  const wallGeo2 = new THREE.BoxGeometry(1.2, 1.4, 5.0);
  const wall2 = new THREE.Mesh(wallGeo2, matStoneRuins);
  wall2.position.set(watchpostX - 2.8, watchposY + 0.7, watchpostZ + 2.5);
  wall2.castShadow = true;
  westPOIGroup.add(wall2);

  // Sisa Tiang Menara Pengawas Kayu Miring
  const ruinedPost = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 4.2, 6), matWoodDark);
  ruinedPost.position.set(watchpostX + 2.2, watchposY + 1.9, watchpostZ + 1.8);
  ruinedPost.rotation.z = 0.22;
  ruinedPost.castShadow = true;
  westPOIGroup.add(ruinedPost);

  // Reruntuhan Gerobak Kayu Patah Roda Miring
  const cartX = watchpostX + 2.0;
  const cartZ = watchpostZ - 3.2;
  const cartY = getTerrainHeight(cartX, cartZ);

  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 2.6), matWoodRustic);
  cartBody.position.set(cartX, cartY + 0.4, cartZ);
  cartBody.rotation.set(0.12, 0.45, -0.15);
  cartBody.castShadow = true;
  westPOIGroup.add(cartBody);

  const wheelBroken = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.18, 12), matWoodRustic);
  wheelBroken.position.set(cartX - 1.1, cartY + 0.3, cartZ);
  wheelBroken.rotation.z = Math.PI / 2.3;
  westPOIGroup.add(wheelBroken);

  // Peti Kayu & Tong Terbengkalai
  const crateBroken = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), matWoodRustic);
  crateBroken.position.set(watchpostX - 1.0, watchposY + 0.4, watchpostZ - 2.0);
  crateBroken.rotation.y = 0.5;
  westPOIGroup.add(crateBroken);

  const barrelOld = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.0, 10), matWineBarrel);
  barrelOld.position.set(watchpostX + 0.5, watchposY + 0.5, watchpostZ - 2.4);
  westPOIGroup.add(barrelOld);

  // ----------------------------------------------------------------------------
  // POI C: KEBUN PINUS KABUT / FOGGY PINE WOODS (X: -430, Z: -90)
  // Rumpun pinus tinggi lebat menutupi punggung bukit barat
  // ----------------------------------------------------------------------------
  const pineWoodX = -430;
  const pineWoodZ = -90;
  for (let pt = 0; pt < 7; pt++) {
    const ptx = pineWoodX + (pt % 3) * 6.5 - 6.5;
    const ptz = pineWoodZ + Math.floor(pt / 3) * 7.0 - 7.0;
    if (isDesertBiome(ptx, ptz)) continue;
    const pty = getTerrainHeight(ptx, ptz);

    const fPineTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.2, 5), matWoodDark);
    fPineTrunk.position.set(ptx, pty + 1.6, ptz);
    fPineTrunk.castShadow = true;
    westPOIGroup.add(fPineTrunk);

    const fPineFoliage = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.0, 5), matPineFoliage);
    fPineFoliage.position.set(ptx, pty + 5.2, ptz);
    fPineFoliage.castShadow = true;
    westPOIGroup.add(fPineFoliage);

    colliders.push({ type: 'circle', x: ptx, z: ptz, radius: 1.2, label: 'Pohon Pinus Kabut' });
  }

  envGroup.add(westPOIGroup);

  // ============================================================================
  // 8. ZONA K: PERBUKITAN KINCIR ANGIN & PONDOK GEMBALA (X: 288, Z: 137)
  // Patahkan kesan tanah datar polos dengan bukit landai Perlin Noise (tinggi 1.5 - 2.5 unit).
  // - 1 Kincir angin kayu klasik dengan kincir berputar perlahan
  // - Pondok kayu kecil dengan tumpukan jerami dan pagar ternak kayu luas
  // - Kelompok pohon oak rindang di lereng bukit
  // ============================================================================
  const windmillHillGroup = new THREE.Group();
  windmillHillGroup.name = 'ZoneK_WindmillHillAndShepherdCot';

  const wmCenterX = 288;
  const wmCenterZ = 137;
  const wmBaseY = getTerrainHeight(wmCenterX, wmCenterZ);

  // A. Kincir Angin Kayu Klasik (Classic Wooden Windmill)
  const windmillTower = new THREE.Group();
  windmillTower.position.set(wmCenterX, wmBaseY, wmCenterZ);

  // Pondasi bawah batu cadas
  const wmStoneBase = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.4, 3.2, 12), matStoneRuins);
  wmStoneBase.position.y = 1.6;
  wmStoneBase.castShadow = true;
  windmillTower.add(wmStoneBase);

  // Menara kayu utama mengerucut ke atas
  const wmWoodTower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, 8.8, 12), matWoodRustic);
  wmWoodTower.position.y = 3.2 + 4.4;
  wmWoodTower.castShadow = true;
  windmillTower.add(wmWoodTower);

  // Atap kubah / kerucut kayu sirap
  const wmCapRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 12), matWoodDark);
  wmCapRoof.position.y = 12.0 + 1.7;
  wmCapRoof.castShadow = true;
  windmillTower.add(wmCapRoof);

  // Gandar poros kincir (Axle hub) menghadap ke depan (+Z)
  const wmAxleHub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 8), matWoodDark);
  wmAxleHub.rotation.x = Math.PI / 2;
  wmAxleHub.position.set(0, 11.2, 2.7);
  windmillTower.add(wmAxleHub);

  // Baling-baling kincir (4 Windmill Lattice Sails)
  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 11.2, 3.4);

  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });

  for (let b = 0; b < 4; b++) {
    const bRot = (b / 4) * Math.PI * 2;
    const bladeArm = new THREE.Group();
    bladeArm.rotation.z = bRot;

    // Tiang kayu kisi-kisi (Wooden spar)
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.4, 0.18), matWoodRustic);
    spar.position.y = 3.2;
    spar.castShadow = true;
    bladeArm.add(spar);

    // Kain layar kanvas putih klasik
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5.2), canvasMat);
    sail.position.set(0.65, 3.4, 0.05);
    sail.rotation.y = 0.15; // Sudut hembusan angin
    sail.castShadow = true;
    bladeArm.add(sail);

    bladesGroup.add(bladeArm);
  }

  windmillTower.add(bladesGroup);
  windmillBladesGroup = bladesGroup;

  windmillHillGroup.add(windmillTower);
  colliders.push({ type: 'circle', x: wmCenterX, z: wmCenterZ, radius: 4.4, label: 'Menara Kincir Angin' });

  // B. Pondok Kayu Kecil Gembala (Shepherd's Cottage)
  const cotX = 274;
  const cotZ = 142;
  const cotY = getTerrainHeight(cotX, cotZ);

  const cottage = new THREE.Group();
  cottage.position.set(cotX, cotY, cotZ);

  // Bangunan pondok balok kayu
  const cotWalls = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 5.2), matWoodRustic);
  cotWalls.position.y = 1.8;
  cotWalls.castShadow = true;
  cottage.add(cotWalls);

  // Atap sirap gabled segitiga
  const cotRoof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.4, 4), matWoodDark);
  cotRoof.position.y = 3.6 + 1.2;
  cotRoof.rotation.y = Math.PI / 4;
  cotRoof.scale.set(1.0, 1.0, 1.35);
  cotRoof.castShadow = true;
  cottage.add(cotRoof);

  // Cerobong asap batu
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.2, 0.9), matStoneRuins);
  chimney.position.set(2.2, 2.6, -1.6);
  chimney.castShadow = true;
  cottage.add(chimney);

  // Jendela berpendar hangat
  const windowGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
    })
  );
  windowGlow.position.set(-1.2, 1.8, 2.62);
  cottage.add(windowGlow);

  const windowLight = new THREE.PointLight(0xf59e0b, 1.6, 14);
  windowLight.position.set(-1.2, 1.8, 3.2);
  cottage.add(windowLight);

  windmillHillGroup.add(cottage);
  colliders.push({ type: 'box', minX: cotX - 3.4, maxX: cotX + 3.4, minZ: cotZ - 2.8, maxZ: cotZ + 2.8, label: 'Pondok Gembala' });

  // C. Tumpukan Jerami Emas (Haystacks)
  const hayCoords = [
    { x: 281, z: 146 },
    { x: 283, z: 149 },
    { x: 281, z: 152 },
    { x: 271, z: 149 },
    { x: 269, z: 146 },
  ];
  hayCoords.forEach((hc) => {
    const hy = getTerrainHeight(hc.x, hc.z);
    const hayGroup = new THREE.Group();
    hayGroup.position.set(hc.x, hy, hc.z);

    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.3, 10), matHay);
    baseCyl.position.y = 0.65;
    baseCyl.castShadow = true;
    hayGroup.add(baseCyl);

    const topCone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.1, 10), matHay);
    topCone.position.y = 1.3 + 0.55;
    topCone.castShadow = true;
    hayGroup.add(topCone);

    windmillHillGroup.add(hayGroup);
    colliders.push({ type: 'circle', x: hc.x, z: hc.z, radius: 1.3, label: 'Tumpukan Jerami' });
  });

  // D. Pagar Ternak Kayu Luas (Livestock Corral)
  // Area persegi panjang (X: 268 s.d 282, Z: 122 s.d 136)
  const corralPosts: [number, number][] = [
    [268, 122], [273, 122], [278, 122], [282, 122],
    [282, 127], [282, 132], [282, 136],
    [278, 136], [273, 136], [268, 136],
    [268, 131], [268, 126],
  ];
  for (let i = 0; i < corralPosts.length; i++) {
    const [px, pz] = corralPosts[i];
    const py = getTerrainHeight(px, pz);

    // Tiang pagar
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 6), matWoodRustic);
    post.position.set(px, py + 0.75, pz);
    post.castShadow = true;
    windmillHillGroup.add(post);

    // Rel horizontal antar tiang (kecuali celah gerbang [273, 136] ke [278, 136])
    const nextIdx = (i + 1) % corralPosts.length;
    if (i !== 8) {
      const [nx, nz] = corralPosts[nextIdx];
      const midX = (px + nx) * 0.5;
      const midZ = (pz + nz) * 0.5;
      const midY = (py + getTerrainHeight(nx, nz)) * 0.5;
      const dist = Math.hypot(nx - px, nz - pz);
      const angle = Math.atan2(nx - px, nz - pz);

      for (let r = 0; r < 2; r++) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, dist), matWoodRustic);
        rail.position.set(midX, midY + (r === 0 ? 0.55 : 1.1), midZ);
        rail.rotation.y = angle;
        rail.castShadow = true;
        windmillHillGroup.add(rail);
      }
    }
  }

  // 2 Domba Putih di dalam Pagar Ternak
  const sheepCoords = [
    { x: 273, z: 128, rot: 0.8 },
    { x: 277, z: 131, rot: -1.2 },
  ];
  sheepCoords.forEach((sc) => {
    const sy = getTerrainHeight(sc.x, sc.z);
    const sheep = new THREE.Group();
    sheep.position.set(sc.x, sy, sc.z);
    sheep.rotation.y = sc.rot;

    // Badan domba berbulu putih
    const woolBody = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 1), matBone);
    woolBody.position.y = 0.75;
    woolBody.scale.set(1.2, 0.9, 0.9);
    woolBody.castShadow = true;
    sheep.add(woolBody);

    // Kepala domba
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), matWoodDark);
    head.position.set(0.85, 0.95, 0);
    sheep.add(head);

    // 4 Kaki domba
    [[-0.45, -0.28], [-0.45, 0.28], [0.45, -0.28], [0.45, 0.28]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5), matWoodDark);
      leg.position.set(lx, 0.3, lz);
      sheep.add(leg);
    });

    windmillHillGroup.add(sheep);
  });

  // E. Kelompok Pohon Oak Rindang di Lereng Bukit (Shady Oak Grove)
  const oakHillCoords: [number, number][] = [
    [298, 126],
    [306, 138],
    [296, 152],
    [276, 155],
    [265, 132],
    [282, 118],
    [310, 128],
  ];
  oakHillCoords.forEach(([ox, oz], oIdx) => {
    const oy = getTerrainHeight(ox, oz);
    const oak = new THREE.Group();
    oak.position.set(ox, oy, oz);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.65, 3.6, 7), matWoodRustic);
    trunk.position.y = 1.8;
    trunk.castShadow = true;
    oak.add(trunk);

    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8 + (oIdx % 3) * 0.4, 1), matOakFoliage);
    crown.position.y = 4.8;
    crown.scale.set(1.2, 0.95, 1.2);
    crown.castShadow = true;
    oak.add(crown);

    windmillHillGroup.add(oak);
    colliders.push({ type: 'circle', x: ox, z: oz, radius: 1.4, label: `Pohon Oak Lereng Kincir ${oIdx + 1}` });
  });

  envGroup.add(windmillHillGroup);

  // ============================================================================
  // 8. DISTRIBUSI VEGETASI ALAMI MASIF MENGGUNAKAN THREE.InstancedMesh (60 FPS)
  // Menutupi seluruh dataran hijau yang luas (X: -460 s.d 120, Z: -420 s.d 180)
  // Terdiri dari: 450 Cemara, 300 Oak, 500 Batu Granit, & 750 Semak Liar
  // ============================================================================
  const dummy = new THREE.Object3D();

  // 1. POHON CEMARA SEGITIGA BERUMPUN (CLUSTERED PINE TREES): 450 Instances
  const PINE_COUNT = 450;
  const pineTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 5);
  pineTrunkGeo.translate(0, 1.1, 0);

  const pineConeGeo1 = new THREE.ConeGeometry(1.5, 2.2, 5);
  pineConeGeo1.translate(0, 2.4, 0);
  const pineConeGeo2 = new THREE.ConeGeometry(1.2, 1.9, 5);
  pineConeGeo2.translate(0, 3.6, 0);
  const pineConeGeo3 = new THREE.ConeGeometry(0.85, 1.6, 5);
  pineConeGeo3.translate(0, 4.6, 0);

  const pineTrunkMesh = new THREE.InstancedMesh(pineTrunkGeo, matWoodRustic, PINE_COUNT);
  const pineFoliageMesh1 = new THREE.InstancedMesh(pineConeGeo1, matPineFoliage, PINE_COUNT);
  const pineFoliageMesh2 = new THREE.InstancedMesh(pineConeGeo2, matPineFoliage, PINE_COUNT);
  const pineFoliageMesh3 = new THREE.InstancedMesh(pineConeGeo3, matPineFoliage, PINE_COUNT);

  let pineAssigned = 0;
  let pineAttempts = 0;
  while (pineAssigned < PINE_COUNT && pineAttempts < 1500) {
    pineAttempts++;
    // Cakupan diperluas ke seluruh barat, utara dan timur Eldoria Padang Rumput
    const cx = -460 + Math.random() * 880;
    const cz = -420 + Math.random() * 600;

    // Pengecualian Gurun Solaria (Wajib Single Source of Truth)
    if (isDesertBiome(cx, cz)) continue;
    // Pengecualian Pesisir Pantai Barat khusus Pohon Kelapa
    if (cx < -460 || cz > 190) continue;
    // Pengecualian Pemukiman Desa
    if (Math.hypot(cx - 10, cz - 110) < 54) continue;
    if (Math.hypot(cx - 0, cz - 180) < 40) continue;
    // Pengecualian Palung Aliran Sungai (Northwest, East, Downstream)
    if (getDistanceToRiver(cx, cz) < 5.0) continue;
    // Pengecualian Kawah Boss Kuno
    if (Math.hypot(cx - craterCenterX, cz - craterCenterZ) < 24) continue;
    if (Math.hypot(cx - -250, cz - -35) < 32) continue; // Outpost inner
    if (isInsideFarmYard(cx, cz)) continue;

    const clusterSize = 3 + Math.floor(Math.random() * 5);
    const clusterRadius = 4.0 + Math.random() * 6.5;

    for (let c = 0; c < clusterSize && pineAssigned < PINE_COUNT; c++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = c === 0 ? 0 : 1.5 + Math.random() * (clusterRadius - 1.5);
      const px = cx + Math.cos(angle) * dist;
      const pz = cz + Math.sin(angle) * dist;

      if (isDesertBiome(px, pz)) continue;
      if (isPointNearRoad(px, pz, 3.2)) continue;
      if (isInsideFarmYard(px, pz)) continue;
      if (Math.hypot(px - 10, pz - 110) < 52) continue;
      if (getDistanceToRiver(px, pz) < 5.0) continue;
      if (Math.hypot(px - craterCenterX, pz - craterCenterZ) < 23) continue;

      const py = getTerrainHeight(px, pz);
      if (py < 0.0 || py > 4.5) continue; // Tidak boleh di bawah air

      const s = 0.8 + Math.random() * 0.55;
      dummy.position.set(px, py, pz);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      pineTrunkMesh.setMatrixAt(pineAssigned, dummy.matrix);
      pineFoliageMesh1.setMatrixAt(pineAssigned, dummy.matrix);
      pineFoliageMesh2.setMatrixAt(pineAssigned, dummy.matrix);
      pineFoliageMesh3.setMatrixAt(pineAssigned, dummy.matrix);
      pineAssigned++;
    }
  }
  pineTrunkMesh.instanceMatrix.needsUpdate = true;
  pineFoliageMesh1.instanceMatrix.needsUpdate = true;
  pineFoliageMesh2.instanceMatrix.needsUpdate = true;
  pineFoliageMesh3.instanceMatrix.needsUpdate = true;
  envGroup.add(pineTrunkMesh, pineFoliageMesh1, pineFoliageMesh2, pineFoliageMesh3);

  // 2. POHON RINDANG BULAT BERUMPUN (CLUSTERED OAK TREES): 300 Instances
  const OAK_COUNT = 300;
  const oakTrunkGeo = new THREE.CylinderGeometry(0.32, 0.46, 2.6, 6);
  oakTrunkGeo.translate(0, 1.3, 0);
  const oakCrownGeo = new THREE.DodecahedronGeometry(2.1, 0);
  oakCrownGeo.translate(0, 3.8, 0);

  const oakTrunkMesh = new THREE.InstancedMesh(oakTrunkGeo, matWoodRustic, OAK_COUNT);
  const oakCrownMesh = new THREE.InstancedMesh(oakCrownGeo, matOakFoliage, OAK_COUNT);

  let oakAssigned = 0;
  let oakAttempts = 0;
  while (oakAssigned < OAK_COUNT && oakAttempts < 1200) {
    oakAttempts++;
    const cx = -440 + Math.random() * 860;
    const cz = -380 + Math.random() * 560;

    if (isDesertBiome(cx, cz)) continue;
    if (Math.hypot(cx - 10, cz - 110) < 54) continue;
    if (Math.hypot(cx - 0, cz - 180) < 40) continue;
    if (Math.hypot(cx - ruinsCenterX, cz - ruinsCenterZ) < 26) continue;
    if (Math.hypot(cx - -250, cz - -35) < 32) continue;
    if (getDistanceToRiver(cx, cz) < 5.0) continue;
    if (Math.hypot(cx - craterCenterX, cz - craterCenterZ) < 24) continue;
    if (isInsideFarmYard(cx, cz)) continue;

    const clusterSize = 3 + Math.floor(Math.random() * 4);
    const clusterRadius = 4.5 + Math.random() * 7.0;

    for (let c = 0; c < clusterSize && oakAssigned < OAK_COUNT; c++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = c === 0 ? 0 : 2.0 + Math.random() * (clusterRadius - 2.0);
      const ox = cx + Math.cos(angle) * dist;
      const oz = cz + Math.sin(angle) * dist;

      if (isDesertBiome(ox, oz)) continue;
      if (isPointNearRoad(ox, oz, 3.2)) continue;
      if (isInsideFarmYard(ox, oz)) continue;
      if (Math.hypot(ox - 10, oz - 110) < 52) continue;
      if (getDistanceToRiver(ox, oz) < 5.0) continue;
      if (Math.hypot(ox - craterCenterX, oz - craterCenterZ) < 23) continue;

      const oy = getTerrainHeight(ox, oz);
      if (oy < 0.0 || oy > 4.2) continue;

      const s = 0.8 + Math.random() * 0.55;
      dummy.position.set(ox, oy, oz);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(s, s * 1.05, s);
      dummy.updateMatrix();

      oakTrunkMesh.setMatrixAt(oakAssigned, dummy.matrix);
      oakCrownMesh.setMatrixAt(oakAssigned, dummy.matrix);
      oakAssigned++;
    }
  }
  oakTrunkMesh.instanceMatrix.needsUpdate = true;
  oakCrownMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(oakTrunkMesh, oakCrownMesh);

  // 3. FORMASI BEBATUAN ALAM (GRANITE BOULDER FORMATIONS): 500 Instances
  const BOULDER_COUNT = 500;
  const boulderGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const boulderMesh = new THREE.InstancedMesh(boulderGeo, matBoulder, BOULDER_COUNT);

  let boulderAssigned = 0;
  let boulderAttempts = 0;
  while (boulderAssigned < BOULDER_COUNT && boulderAttempts < 1400) {
    boulderAttempts++;
    const cx = -460 + Math.random() * 880;
    const cz = -400 + Math.random() * 580;

    if (isDesertBiome(cx, cz)) continue;
    if (Math.hypot(cx - 10, cz - 110) < 52) continue;
    if (Math.hypot(cx - 0, cz - 180) < 35) continue;
    if (getDistanceToRiver(cx, cz) < 5.0) continue;
    if (Math.hypot(cx - craterCenterX, cz - craterCenterZ) < 24) continue;
    if (isInsideFarmYard(cx, cz)) continue;
    if (isPointNearRoad(cx, cz, 3.2)) continue;

    const cy = getTerrainHeight(cx, cz);
    if (cy < 0.0) continue;

    const bigScale = 0.95 + Math.random() * 0.55;
    const bigScaleY = bigScale * (0.8 + Math.random() * 0.4);
    dummy.position.set(cx, cy + bigScaleY * 0.38, cz);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(bigScale, bigScaleY, bigScale);
    dummy.updateMatrix();
    boulderMesh.setMatrixAt(boulderAssigned, dummy.matrix);
    boulderAssigned++;

    const satCount = 2 + Math.floor(Math.random() * 2);
    for (let s = 0; s < satCount && boulderAssigned < BOULDER_COUNT; s++) {
      const sAngle = Math.random() * Math.PI * 2;
      const sDist = 1.6 + Math.random() * 2.2;
      const bx = cx + Math.cos(sAngle) * sDist;
      const bz = cz + Math.sin(sAngle) * sDist;

      if (isDesertBiome(bx, bz)) continue;
      if (isPointNearRoad(bx, bz, 3.0)) continue;
      const by = getTerrainHeight(bx, bz);
      if (by < 0.0) continue;

      const smallScale = 0.4 + Math.random() * 0.45;
      const smallScaleY = smallScale * (0.7 + Math.random() * 0.5);
      dummy.position.set(bx, by + smallScaleY * 0.35, bz);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.set(smallScale, smallScaleY, smallScale);
      dummy.updateMatrix();
      boulderMesh.setMatrixAt(boulderAssigned, dummy.matrix);
      boulderAssigned++;
    }
  }
  boulderMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(boulderMesh);

  // 4. RUMPUN SEMAK LIAR & BUNGA PADANG RUMPUT (SHRUBS): 750 Instances
  const SHRUB_COUNT = 750;
  const shrubGeo = new THREE.DodecahedronGeometry(0.65, 0);
  const shrubMesh = new THREE.InstancedMesh(shrubGeo, matShrub, SHRUB_COUNT);

  let shrubAssigned = 0;
  let shrubAttempts = 0;
  while (shrubAssigned < SHRUB_COUNT && shrubAttempts < 1800) {
    shrubAttempts++;
    const cx = -460 + Math.random() * 880;
    const cz = -420 + Math.random() * 600;

    if (isDesertBiome(cx, cz)) continue;
    if (Math.hypot(cx - 10, cz - 110) < 52) continue;
    if (getDistanceToRiver(cx, cz) < 5.0) continue;
    if (Math.hypot(cx - craterCenterX, cz - craterCenterZ) < 24) continue;
    if (isInsideFarmYard(cx, cz)) continue;

    const shrubClusterSize = 3 + Math.floor(Math.random() * 4);
    const shrubRadius = 2.5 + Math.random() * 4.5;

    for (let sc = 0; sc < shrubClusterSize && shrubAssigned < SHRUB_COUNT; sc++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = sc === 0 ? 0 : 0.8 + Math.random() * (shrubRadius - 0.8);
      const sx = cx + Math.cos(angle) * dist;
      const sz = cz + Math.sin(angle) * dist;

      if (isDesertBiome(sx, sz)) continue;
      if (isPointNearRoad(sx, sz, 3.2)) continue;
      if (isInsideFarmYard(sx, sz)) continue;

      const sy = getTerrainHeight(sx, sz);
      if (sy < 0.0) continue;

      const s = 0.55 + Math.random() * 0.65;
      dummy.position.set(sx, sy + s * 0.32, sz);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(s * (0.8 + Math.random() * 0.4), s * 0.7, s * (0.8 + Math.random() * 0.4));
      dummy.updateMatrix();

      shrubMesh.setMatrixAt(shrubAssigned, dummy.matrix);
      shrubAssigned++;
    }
  }
  shrubMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(shrubMesh);

  // 5. BATU KARANG LAUT PESISIR INSTANCED (COASTAL REEF STONES): 60 Instances
  const REEF_STONE_COUNT = 60;
  const reefStoneGeo = new THREE.DodecahedronGeometry(0.85, 0);
  const reefStoneMesh = new THREE.InstancedMesh(reefStoneGeo, matWetSeaRock, REEF_STONE_COUNT);

  let reefAssigned = 0;
  let reefAttempts = 0;
  while (reefAssigned < REEF_STONE_COUNT && reefAttempts < 500) {
    reefAttempts++;
    const rx = -410 - Math.random() * 38;
    const rz = -50 - Math.random() * 190;
    if (isDesertBiome(rx, rz)) continue;
    const ry = getTerrainHeight(rx, rz);

    const sX = 0.8 + Math.random() * 1.4;
    const sY = 0.6 + Math.random() * 1.2;
    const sZ = 0.8 + Math.random() * 1.4;

    dummy.position.set(rx, ry + sY * 0.35, rz);
    dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
    dummy.scale.set(sX, sY, sZ);
    dummy.updateMatrix();

    reefStoneMesh.setMatrixAt(reefAssigned, dummy.matrix);
    reefAssigned++;
  }
  reefStoneMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(reefStoneMesh);

  // 6. RUMPUT GUMUK PANTAI INSTANCED (BEACH DUNE GRASS): 80 Instances
  const BEACH_GRASS_COUNT = 80;
  const beachGrassGeo = new THREE.ConeGeometry(0.45, 0.9, 4);
  const beachGrassMesh = new THREE.InstancedMesh(beachGrassGeo, matBeachGrass, BEACH_GRASS_COUNT);

  let bgAssigned = 0;
  let bgAttempts = 0;
  while (bgAssigned < BEACH_GRASS_COUNT && bgAttempts < 600) {
    bgAttempts++;
    const gx = -402 - Math.random() * 26;
    const gz = -55 - Math.random() * 180;
    if (isDesertBiome(gx, gz)) continue;
    const gy = getTerrainHeight(gx, gz);
    if (gy < 0.25) continue; // Di atas garis air laut

    const s = 0.65 + Math.random() * 0.6;
    dummy.position.set(gx, gy + s * 0.4, gz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
    dummy.scale.set(s, s * 1.1, s);
    dummy.updateMatrix();

    beachGrassMesh.setMatrixAt(bgAssigned, dummy.matrix);
    bgAssigned++;
  }
  beachGrassMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(beachGrassMesh);

  // ============================================================================
  // ZONA L: VEGETASI & BEBATUAN GURUN SOLARIA (SAGUARO CACTI, SANDSTONE CRAGS & DRY TREES)
  // Mengisi wilayah gurun luas di utara garis kuning dengan flora & geologi khas gurun
  // ============================================================================
  const desertFloraGroup = new THREE.Group();
  desertFloraGroup.name = 'ZoneL_SolariaDesertFlora';

  const matCactus = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });
  const matSandstoneCrag = new THREE.MeshStandardMaterial({
    color: 0xd49b55,
    roughness: 0.88,
    metalness: 0.08,
    flatShading: true,
  });
  const matDryDesertWood = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });

  // 1. Saguaro Cacti (Cylinder batang utama + cabang L)
  const cactusCoords: [number, number][] = [
    [10, -260], [35, -240], [70, -210], [120, -160], [160, -110], [210, -130],
    [-20, -310], [50, -320], [140, -250], [190, -220], [250, -200], [290, -210],
    [320, -240], [360, -270], [420, -310], [460, -330], [230, -340], [270, -360],
    [90, -280], [130, -310], [175, -290], [310, -330], [380, -340], [430, -260],
  ];
  cactusCoords.forEach(([cx, cz]) => {
    if (!isDesertBiome(cx, cz)) return;
    const cy = getTerrainHeight(cx, cz);
    if (cy < 0.2) return;

    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    const scale = 0.8 + Math.random() * 0.5;
    cGroup.scale.set(scale, scale, scale);

    // Batang utama silinder berusuk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 3.8, 8), matCactus);
    trunk.position.y = 1.9;
    trunk.castShadow = true;
    cGroup.add(trunk);

    // Lengan kiri (L-arm)
    const armLHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.9, 6), matCactus);
    armLHoriz.rotation.z = Math.PI / 2;
    armLHoriz.position.set(-0.55, 2.2, 0);
    cGroup.add(armLHoriz);
    const armLVert = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.2, 6), matCactus);
    armLVert.position.set(-1.0, 2.8, 0);
    cGroup.add(armLVert);

    // Lengan kanan (L-arm)
    if (Math.random() > 0.3) {
      const armRHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.8, 6), matCactus);
      armRHoriz.rotation.z = Math.PI / 2;
      armRHoriz.position.set(0.5, 1.8, 0);
      cGroup.add(armRHoriz);
      const armRVert = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.0, 6), matCactus);
      armRVert.position.set(0.9, 2.3, 0);
      cGroup.add(armRVert);
    }

    cGroup.rotation.y = Math.random() * Math.PI * 2;
    desertFloraGroup.add(cGroup);
    colliders.push({ type: 'circle', x: cx, z: cz, radius: 0.6 * scale, label: 'Kaktus Saguaro' });
  });

  // 2. Sandstone Crags (Bebatuan Pasir Cadas Runcing)
  const cragCoords: [number, number][] = [
    [-10, -290], [25, -270], [80, -250], [150, -200], [200, -170], [260, -180],
    [110, -220], [170, -150], [230, -160], [300, -250], [350, -230], [400, -290],
    [450, -310], [480, -320], [330, -350], [280, -320], [60, -340], [130, -370],
  ];
  cragCoords.forEach(([rx, rz]) => {
    if (!isDesertBiome(rx, rz)) return;
    const ry = getTerrainHeight(rx, rz);
    if (ry < 0.2) return;

    const crag = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.6, 5), matSandstoneCrag);
    const cragScale = 0.8 + Math.random() * 0.7;
    crag.scale.set(cragScale, cragScale * (1.2 + Math.random() * 0.6), cragScale);
    crag.position.set(rx, ry + (1.8 * cragScale), rz);
    crag.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.25);
    crag.castShadow = true;
    desertFloraGroup.add(crag);
    colliders.push({ type: 'circle', x: rx, z: rz, radius: 1.1 * cragScale, label: 'Cadas Pasir Runcing' });
  });

  // 3. Dry Desert Trees (Pohon Kering Gurun)
  const dryTreeCoords: [number, number][] = [
    [5, -240], [45, -220], [95, -180], [145, -130], [185, -100], [240, -140],
    [85, -310], [165, -270], [220, -240], [340, -220], [390, -260], [440, -280],
  ];
  dryTreeCoords.forEach(([tx, tz]) => {
    if (!isDesertBiome(tx, tz)) return;
    const ty = getTerrainHeight(tx, tz);
    if (ty < 0.2) return;

    const treeGroup = new THREE.Group();
    treeGroup.position.set(tx, ty, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 3.2, 5), matDryDesertWood);
    trunk.position.y = 1.6;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
    treeGroup.add(trunk);

    // Bare gnarled branches
    for (let b = 0; b < 4; b++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.4, 4), matDryDesertWood);
      branch.position.set(0, 2.2 + b * 0.3, 0);
      branch.rotation.set((Math.random() - 0.5) * 0.8, (b * Math.PI) / 2, 0.6 + Math.random() * 0.4);
      treeGroup.add(branch);
    }
    desertFloraGroup.add(treeGroup);
  });

  envGroup.add(desertFloraGroup);

  // ============================================================================
  // ANIMASI UPDATE CALLBACK (FLICKERING TORCHES & CAMPFIRE)
  // ============================================================================
  const update = (delta: number, time: number) => {
    // Animasi flicker cahaya obor dan api unggun
    animatedLights.forEach((al) => {
      al.light.intensity = al.baseIntensity + Math.sin(time * al.speed) * 0.35 + Math.cos(time * al.speed * 1.6) * 0.15;
    });

    // Animasi denyut lidah api
    animatedFlames.forEach((af) => {
      const pulse = 1.0 + Math.sin(time * af.speed) * 0.12;
      af.mesh.scale.set(af.baseScale.x * pulse, af.baseScale.y * (1.0 + Math.cos(time * af.speed * 1.3) * 0.18), af.baseScale.z * pulse);
    });

    // Animasi putaran baling-baling kincir angin perlahan
    if (windmillBladesGroup) {
      windmillBladesGroup.rotation.z += delta * 0.55;
    }
  };

  return {
    group: envGroup,
    colliders,
    update,
  };
}

