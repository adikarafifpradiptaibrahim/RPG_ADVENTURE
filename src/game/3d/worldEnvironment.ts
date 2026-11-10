import * as THREE from 'three';
import { WorldCollider } from './world';
import { isPointNearRoad } from '../RoadSystem';

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
  const matCarrotTop = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.8, flatShading: true });
  const matCarrotTip = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7, flatShading: true });
  const matWheat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.85, flatShading: true });
  const matTentFabric = new THREE.MeshStandardMaterial({ color: 0x6b705c, roughness: 0.9, flatShading: true });
  const matBone = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.6, flatShading: true });

  // ============================================================================
  // 1. ZONA A: DESA & PERTANIAN PINGGIRAN (X: 10 s.d. 80, Z: 100 s.d. 160)
  // ============================================================================
  const farmGroup = new THREE.Group();
  farmGroup.name = 'ZoneA_VillageFarmlands';

  // Helper Pembuat Pagar Kayu Rustic
  function createRusticFence(startX: number, startZ: number, endX: number, endZ: number) {
    const dist = Math.hypot(endX - startX, endZ - startZ);
    const postCount = Math.max(2, Math.floor(dist / 2.6));
    const angle = Math.atan2(endZ - startZ, endX - startX);

    for (let i = 0; i < postCount; i++) {
      const t = i / (postCount - 1);
      const px = startX + (endX - startX) * t;
      const pz = startZ + (endZ - startZ) * t;
      const py = getTerrainHeight(px, pz);

      // Tiang kayu vertikal
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.15, 6), matWoodRustic);
      post.position.set(px, py + 0.55, pz);
      post.rotation.y = angle + (Math.random() - 0.5) * 0.15;
      farmGroup.add(post);

      if (i < postCount - 1) {
        // Palang horizontal (2 bilah)
        const nextT = (i + 1) / (postCount - 1);
        const nextX = startX + (endX - startX) * nextT;
        const nextZ = startZ + (endZ - startZ) * nextT;
        const midX = (px + nextX) * 0.5;
        const midZ = (pz + nextZ) * 0.5;
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

  // Pagar di sepanjang pinggiran lahan pertanian desa
  createRusticFence(14, 154, 45, 154);
  createRusticFence(45, 154, 76, 148);
  createRusticFence(14, 126, 45, 126);
  createRusticFence(45, 126, 76, 122);

  // 3 Petak Kebun Sayur Berpematang Kayu
  const gardenPatches = [
    { x: 30, z: 140, w: 9, d: 6, crop: 'cabbage' },
    { x: 50, z: 140, w: 10, d: 6, crop: 'carrot' },
    { x: 68, z: 135, w: 9, d: 7, crop: 'wheat' },
  ];

  gardenPatches.forEach((patch) => {
    const y = getTerrainHeight(patch.x, patch.z);

    // Bedengan tanah subur
    const soil = new THREE.Mesh(new THREE.BoxGeometry(patch.w, 0.22, patch.d), matFarmSoil);
    soil.position.set(patch.x, y + 0.11, patch.z);
    farmGroup.add(soil);

    // Pematang bingkai balok kayu
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

    // Tanaman sayuran dalam petak
    const rows = 4;
    const cols = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = patch.x - halfW + 1.0 + (c / (cols - 1)) * (patch.w - 2.0);
        const cz = patch.z - halfD + 0.8 + (r / (rows - 1)) * (patch.d - 1.6);
        const cy = y + 0.22;

        if (patch.crop === 'cabbage') {
          const cabbage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), matCabbage);
          cabbage.position.set(cx, cy + 0.12, cz);
          cabbage.scale.set(1.1, 0.85, 1.0);
          farmGroup.add(cabbage);
        } else if (patch.crop === 'carrot') {
          const carrotTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), matCarrotTip);
          carrotTip.position.set(cx, cy + 0.05, cz);
          carrotTip.rotation.x = Math.PI;
          const carrotLeaves = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 5), matCarrotTop);
          carrotLeaves.position.set(cx, cy + 0.20, cz);
          farmGroup.add(carrotTip, carrotLeaves);
        } else {
          // Wheat stalks
          const wheatStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 4), matWheat);
          wheatStalk.position.set(cx, cy + 0.32, cz);
          wheatStalk.rotation.z = (Math.random() - 0.5) * 0.18;
          farmGroup.add(wheatStalk);
        }
      }
    }
  });

  // 7 Tumpukan Jerami (Haystack Emas Kekuningan)
  const haystacks = [
    { x: 22, z: 150, r: 1.3, h: 1.6 },
    { x: 38, z: 150, r: 1.5, h: 1.8 },
    { x: 58, z: 148, r: 1.2, h: 1.5 },
    { x: 74, z: 142, r: 1.6, h: 2.0 },
    { x: 42, z: 124, r: 1.4, h: 1.7 },
    { x: 60, z: 120, r: 1.3, h: 1.6 },
    { x: 25, z: 124, r: 1.1, h: 1.4 },
  ];

  haystacks.forEach((hs) => {
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

  // 2 Gerobak Dorong Kayu & Peti Barang Dagangan
  function createWoodenCart(x: number, z: number, rotY: number) {
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

  createWoodenCart(16, 150, 0.4);
  createWoodenCart(28, 116, -0.35);

  // Tumpukan peti barang di pinggir jalan
  const crateClusters = [
    { x: 14, z: 144 },
    { x: 24, z: 112 },
  ];
  crateClusters.forEach((cc) => {
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
  // 4. ZONA D: BENTENG MUSUH / OUTPOST TERPENCIL (X: -260 s.d. -340, Z: -60 s.d. 80)
  // ============================================================================
  const outpostGroup = new THREE.Group();
  outpostGroup.name = 'ZoneD_EnemyOutpost';

  const outpostCenterX = -300;
  const outpostCenterZ = 10;
  const outpostBaseY = getTerrainHeight(outpostCenterX, outpostCenterZ);

  // 3 Tenda Kain Lusuh Bertiang Kayu
  const tents = [
    { x: -316, z: 24, rotY: 0.45, scale: 1.1 },
    { x: -286, z: 18, rotY: -0.85, scale: 1.0 },
    { x: -322, z: -16, rotY: 1.35, scale: 1.3 },
  ];

  tents.forEach((td) => {
    const ty = getTerrainHeight(td.x, td.z);
    const tent = new THREE.Group();
    tent.position.set(td.x, ty, td.z);
    tent.rotation.y = td.rotY;
    tent.scale.setScalar(td.scale);

    // Tenda kerucut / piramida kanvas
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.8, 5), matTentFabric);
    canopy.position.y = 1.4;

    // Tiang utama kayu di pintu tenda
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.0, 5), matWoodRustic);
    pole.position.set(0, 1.5, 0.85);

    tent.add(canopy, pole);
    outpostGroup.add(tent);
    colliders.push({ type: 'circle', x: td.x, z: td.z, radius: 2.4 * td.scale, label: 'Tenda Bandit' });
  });

  // Pagar Barikade Batang Kayu Runcing (Wooden Spike Barricade)
  const barricades = [
    { x: -272, z: 28, rotY: -0.35, len: 6 },
    { x: -276, z: -4, rotY: 0.5, len: 6 },
    { x: -334, z: 32, rotY: 0.8, len: 5 },
    { x: -338, z: -4, rotY: -0.6, len: 6 },
  ];

  barricades.forEach((bc) => {
    const by = getTerrainHeight(bc.x, bc.z);
    const bGroup = new THREE.Group();
    bGroup.position.set(bc.x, by, bc.z);
    bGroup.rotation.y = bc.rotY;

    // Palang horizontal
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(bc.len, 0.16, 0.16), matWoodRustic);
    crossBeam.position.y = 0.75;
    bGroup.add(crossBeam);

    // Rangkaian tiang pancang runcing bersilang
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
  const fireLight = new THREE.PointLight(0xff7700, 2.6, 26);
  fireLight.position.set(outpostCenterX, outpostBaseY + 1.2, outpostCenterZ);
  outpostGroup.add(fireLight);

  animatedLights.push({ light: fireLight, baseIntensity: 2.6, speed: 10 });
  animatedFlames.push({ mesh: campFlame, baseScale: new THREE.Vector3(1, 1.3, 1), speed: 11 });

  outpostGroup.add(campFireGroup);
  colliders.push({ type: 'circle', x: outpostCenterX, z: outpostCenterZ, radius: 1.6, label: 'Api Unggun' });

  // Menara Pengawas Kayu Sederhana (Watchtower)
  const towerX = -282;
  const towerZ = -18;
  const towerY = getTerrainHeight(towerX, towerZ);
  const tower = new THREE.Group();
  tower.position.set(towerX, towerY, towerZ);

  // 4 Tiang utama (tinggi 6.8m)
  const towerH = 6.8;
  const towerSpan = 2.4;
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

  // Atap kanopi piramida
  const roof = new THREE.Mesh(new THREE.ConeGeometry(towerSpan * 0.85, 1.4, 4), matTentFabric);
  roof.position.y = towerH + 0.9;
  roof.rotation.y = Math.PI / 4;
  tower.add(roof);

  outpostGroup.add(tower);
  colliders.push({ type: 'circle', x: towerX, z: towerZ, radius: 2.2, label: 'Menara Pengawas' });

  envGroup.add(outpostGroup);

  // ============================================================================
  // 5. DISTRIBUSI VEGETASI ALAMI MENGGUNAKAN THREE.InstancedMesh
  // ============================================================================
  const dummy = new THREE.Object3D();

  // 1. POHON CEMARA SEGITIGA (PINE TREES): 120 Instances
  const PINE_COUNT = 120;
  const pineTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 5);
  pineTrunkGeo.translate(0, 1.1, 0);

  // Gabungkan 3 tumpuk kerucut dedaunan cemara
  const pineConeGeo1 = new THREE.ConeGeometry(1.5, 2.2, 5);
  pineConeGeo1.translate(0, 2.4, 0);
  const pineConeGeo2 = new THREE.ConeGeometry(1.2, 1.9, 5);
  pineConeGeo2.translate(0, 3.6, 0);
  const pineConeGeo3 = new THREE.ConeGeometry(0.85, 1.6, 5);
  pineConeGeo3.translate(0, 4.6, 0);

  const matPineFoliage = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.85, flatShading: true });
  const pineTrunkMesh = new THREE.InstancedMesh(pineTrunkGeo, matWoodRustic, PINE_COUNT);
  const pineFoliageMesh1 = new THREE.InstancedMesh(pineConeGeo1, matPineFoliage, PINE_COUNT);
  const pineFoliageMesh2 = new THREE.InstancedMesh(pineConeGeo2, matPineFoliage, PINE_COUNT);
  const pineFoliageMesh3 = new THREE.InstancedMesh(pineConeGeo3, matPineFoliage, PINE_COUNT);

  let pineAssigned = 0;
  let attempts = 0;
  while (pineAssigned < PINE_COUNT && attempts < 1200) {
    attempts++;
    // Sebar mengelompok di lereng bukit dan tepi luar padang rumput
    const px = -240 + Math.random() * 320;
    const pz = -40 + Math.random() * 210;

    // Larangan menabrak jalur jalan (margin > 3.5m)
    if (isPointNearRoad(px, pz, 3.8)) continue;
    // Jangan spawn di dalam danau, kawah, atau safe zone tengah desa
    if (Math.hypot(px - 0, pz - 180) < 38) continue;
    if (Math.hypot(px - -196, pz - -254) < 45) continue;
    if (Math.hypot(px - -300, pz - 10) < 32) continue; // Outpost inner

    const py = getTerrainHeight(px, pz);
    if (py < 0.25 || py > 3.8) continue;

    const s = 0.85 + Math.random() * 0.45;
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
  pineTrunkMesh.instanceMatrix.needsUpdate = true;
  pineFoliageMesh1.instanceMatrix.needsUpdate = true;
  pineFoliageMesh2.instanceMatrix.needsUpdate = true;
  pineFoliageMesh3.instanceMatrix.needsUpdate = true;
  envGroup.add(pineTrunkMesh, pineFoliageMesh1, pineFoliageMesh2, pineFoliageMesh3);

  // 2. POHON RINDANG BULAT (OAK TREES): 80 Instances
  const OAK_COUNT = 80;
  const oakTrunkGeo = new THREE.CylinderGeometry(0.32, 0.46, 2.6, 6);
  oakTrunkGeo.translate(0, 1.3, 0);
  const oakCrownGeo = new THREE.DodecahedronGeometry(2.1, 0);
  oakCrownGeo.translate(0, 3.8, 0);

  const matOakFoliage = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8, flatShading: true });
  const oakTrunkMesh = new THREE.InstancedMesh(oakTrunkGeo, matWoodRustic, OAK_COUNT);
  const oakCrownMesh = new THREE.InstancedMesh(oakCrownGeo, matOakFoliage, OAK_COUNT);

  let oakAssigned = 0;
  attempts = 0;
  while (oakAssigned < OAK_COUNT && attempts < 900) {
    attempts++;
    // Tersebar di padang rumput antara desa dan reruntuhan
    const ox = -140 + Math.random() * 220;
    const oz = 40 + Math.random() * 130;

    if (isPointNearRoad(ox, oz, 4.0)) continue;
    if (Math.hypot(ox - 0, oz - 180) < 42) continue;
    if (Math.hypot(ox - ruinsCenterX, oz - ruinsCenterZ) < 26) continue;

    const oy = getTerrainHeight(ox, oz);
    if (oy < 0.25 || oy > 3.0) continue;

    const s = 0.8 + Math.random() * 0.5;
    dummy.position.set(ox, oy, oz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(s, s * 1.05, s);
    dummy.updateMatrix();

    oakTrunkMesh.setMatrixAt(oakAssigned, dummy.matrix);
    oakCrownMesh.setMatrixAt(oakAssigned, dummy.matrix);
    oakAssigned++;
  }
  oakTrunkMesh.instanceMatrix.needsUpdate = true;
  oakCrownMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(oakTrunkMesh, oakCrownMesh);

  // 3. FORMASI BATU ALAM (BOULDERS): 150 Instances
  const BOULDER_COUNT = 150;
  const boulderGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const matBoulder = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
  const boulderMesh = new THREE.InstancedMesh(boulderGeo, matBoulder, BOULDER_COUNT);

  let boulderAssigned = 0;
  attempts = 0;
  while (boulderAssigned < BOULDER_COUNT && attempts < 1400) {
    attempts++;
    const bx = -280 + Math.random() * 380;
    const bz = -50 + Math.random() * 240;

    if (isPointNearRoad(bx, bz, 3.6)) continue;
    if (Math.hypot(bx - 0, bz - 180) < 35) continue;

    const by = getTerrainHeight(bx, bz);
    if (by < 0.2) continue;

    const scaleX = 0.6 + Math.random() * 1.5;
    const scaleY = 0.5 + Math.random() * 1.2;
    const scaleZ = 0.6 + Math.random() * 1.5;

    dummy.position.set(bx, by + scaleY * 0.45, bz);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(scaleX, scaleY, scaleZ);
    dummy.updateMatrix();

    boulderMesh.setMatrixAt(boulderAssigned, dummy.matrix);
    boulderAssigned++;
  }
  boulderMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(boulderMesh);

  // 4. RUMPUN SEMAK & BUNGA LIAR (SHRUBS): 200 Instances
  const SHRUB_COUNT = 200;
  const shrubGeo = new THREE.DodecahedronGeometry(0.65, 0);
  const matShrub = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85, flatShading: true });
  const shrubMesh = new THREE.InstancedMesh(shrubGeo, matShrub, SHRUB_COUNT);

  let shrubAssigned = 0;
  attempts = 0;
  while (shrubAssigned < SHRUB_COUNT && attempts < 1600) {
    attempts++;
    // Ditebar menyusuri tepian luar jalur setapak (jarak aman 3.5m - 8.0m)
    const sx = -220 + Math.random() * 320;
    const sz = 20 + Math.random() * 170;

    // Harus berada di luar badan jalan tetapi dekat tepi
    if (isPointNearRoad(sx, sz, 3.2)) continue;

    const sy = getTerrainHeight(sx, sz);
    if (sy < 0.2) continue;

    const s = 0.6 + Math.random() * 0.7;
    dummy.position.set(sx, sy + s * 0.35, sz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(s * (0.8 + Math.random() * 0.4), s * 0.7, s * (0.8 + Math.random() * 0.4));
    dummy.updateMatrix();

    shrubMesh.setMatrixAt(shrubAssigned, dummy.matrix);
    shrubAssigned++;
  }
  shrubMesh.instanceMatrix.needsUpdate = true;
  envGroup.add(shrubMesh);

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
  };

  return {
    group: envGroup,
    colliders,
    update,
  };
}

