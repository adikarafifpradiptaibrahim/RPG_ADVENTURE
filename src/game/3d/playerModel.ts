import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

// 1. Texture Kanvas Wajah Masker Assassin (Sesuai Gambar 1)
function createRogueFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Area gelap dalam tudung
  ctx.fillStyle = '#111215';
  ctx.fillRect(0, 0, 128, 128);

  // Masker Kain Hitam Arang di bawah mata (55% ke bawah)
  ctx.fillStyle = '#1c1e24';
  ctx.fillRect(0, 70, 128, 58);

  // Celah kulit di sekitar mata
  ctx.fillStyle = '#d49b6a';
  ctx.fillRect(16, 38, 96, 26);

  // Masker hidung segitiga menjorok ke atas
  ctx.fillStyle = '#1c1e24';
  ctx.beginPath();
  ctx.moveTo(48, 70);
  ctx.lineTo(64, 52);
  ctx.lineTo(80, 70);
  ctx.fill();

  // Mata Cyan Tajam Menyipit (Rogue Glance)
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 10;
  // Mata Kiri
  ctx.beginPath();
  ctx.moveTo(26, 48);
  ctx.lineTo(48, 44);
  ctx.lineTo(44, 54);
  ctx.lineTo(26, 50);
  ctx.fill();
  // Mata Kanan
  ctx.beginPath();
  ctx.moveTo(102, 48);
  ctx.lineTo(80, 44);
  ctx.lineTo(84, 54);
  ctx.lineTo(102, 50);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// 2. Busur Bersudut 5-Segmen Low-Poly
function createSegmentedBow(matWood: THREE.Material, matString: THREE.Material): THREE.Group {
  const bow = new THREE.Group();
  bow.name = 'SegmentedBow';

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), matWood);
  bow.add(handle);

  const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), matWood);
  limbTop.position.set(0, 0.24, -0.06);
  limbTop.rotation.x = -0.45;

  const limbBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), matWood);
  limbBottom.position.set(0, -0.24, -0.06);
  limbBottom.rotation.x = 0.45;

  const tipTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), matWood);
  tipTop.position.set(0, 0.44, 0.01);
  tipTop.rotation.x = 0.65;

  const tipBottom = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), matWood);
  tipBottom.position.set(0, -0.44, 0.01);
  tipBottom.rotation.x = -0.65;

  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.52, 0.07),
    new THREE.Vector3(0, 0, 0.01),
    new THREE.Vector3(0, -0.52, 0.07)
  ]);
  const bowString = new THREE.Line(stringGeo, matString);

  bow.add(limbTop, limbBottom, tipTop, tipBottom, bowString);
  return bow;
}

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRogue';

  // --- PALET MATERIAL (BERDASARKAN GAMBAR 1) ---
  const matHood = new THREE.MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.85 }); // Tudung hitam arang
  const matTunic = new THREE.MeshStandardMaterial({ color: 0x3d1d24, roughness: 0.8 }); // Marun gelap / burgundy rogue
  const matPants = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.9 }); // Celana abu-abu arang
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.75 }); // Sabuk & sepatu bot
  const matArmorPlate = new THREE.MeshStandardMaterial({ color: 0x7c8594, roughness: 0.4, metalness: 0.35 }); // Baja abu-abu terang
  const matCape = new THREE.MeshStandardMaterial({ color: 0x2e151b, roughness: 0.85, side: THREE.DoubleSide }); // Jubah luar marun gelap
  const matWood = new THREE.MeshStandardMaterial({ color: 0x4a3321, roughness: 0.7 });
  const matBuckle = new THREE.MeshStandardMaterial({ color: 0xcfd4dc, metalness: 0.7 });
  const matCyanGlow = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.5,
    roughness: 0.2
  });
  const matString = new THREE.LineBasicMaterial({ color: 0x00f0ff });

  // ==========================================
  // 1. KAKI & SEPATU BOT (PROPORSIONAL GAMBAR 1)
  // ==========================================
  const legGroup = new THREE.Group();
  legGroup.name = 'LegGroup';
  let leftLegGroup: THREE.Group | undefined;
  let rightLegGroup: THREE.Group | undefined;

  [-0.15, 0.15].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'Leg_Left' : 'Leg_Right';
    legPivot.position.set(xPos, 0.74, 0);

    // Paha & Tulang Kering (world Y = 0.42 -> local Y = -0.32)
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.62, 0.22), matPants);
    leg.position.set(0, -0.32, 0);

    // Sepatu Bot Bergaya Medieval (world Y = 0.13 -> local Y = -0.61)
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.28), matLeather);
    boot.position.set(0, -0.61, 0.03);

    // Manset Bot Lipatan Atas (world Y = 0.24 -> local Y = -0.50)
    const bootCuff = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.30), matLeather);
    bootCuff.position.set(0, -0.50, 0.03);

    legPivot.add(leg, boot, bootCuff);
    legGroup.add(legPivot);

    if (isLeft) leftLegGroup = legPivot;
    else rightLegGroup = legPivot;
  });
  root.add(legGroup);

  // ==========================================
  // 2. PINGGUL & SABUK KANTONG
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.34), matPants);
  pelvis.position.set(0, 0.80, 0);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.10, 0.38), matLeather);
  belt.position.set(0, 0.81, 0);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.40), matBuckle);
  buckle.position.set(0, 0.81, 0);

  // Kantong Perlengkapan Pinggang (Kiri & Kanan Depan)
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.10), matLeather);
  pouchL.position.set(-0.18, 0.81, 0.20);
  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.08), matLeather);
  pouchR.position.set(0.18, 0.81, 0.20);

  // Sarung Belati Samping Paha Luar
  [-0.32, 0.32].forEach((xPos) => {
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.12), matLeather);
    sheath.position.set(xPos, 0.70, 0);
    sheath.rotation.z = xPos < 0 ? 0.14 : -0.14;
    root.add(sheath);
  });

  root.add(pelvis, belt, buckle, pouchL, pouchR);

  // ==========================================
  // 3. TORSO, TUNIK & ZIRAH DADA
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'TorsoGroup';

  // Badan Utama (Tunik Marun Gelap)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.60, 0.34), matTunic);
  torso.position.set(0, 1.18, 0);
  torsoGroup.add(torso);

  // Plat Dada Baja Bertingkat (Sesuai Gambar 1)
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.34, 0.08), matArmorPlate);
  chestPlate.position.set(0, 1.25, 0.18);
  torsoGroup.add(chestPlate);

  // Selempang Kulit Dada Menyilang
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.36), matLeather);
  strap.rotation.z = -0.55;
  strap.position.set(0, 1.18, 0.02);
  torsoGroup.add(strap);

  root.add(torsoGroup);

  // ==========================================
  // 4. JUBAH BELAKANG (BEBAS CLIPPING - MELAMBAI KELUAR)
  // ==========================================
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'HunterCloak';
  cloakGroup.position.set(0, 1.48, -0.20);
  cloakGroup.rotation.x = 0.14; // Melambai keluar ke belakang, tidak menusuk ke dalam tubuh!

  // Lembaran jubah marun lebar menjuntai
  const cloakMain = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.00, 0.04), matCape);
  cloakMain.position.set(0, -0.50, 0);
  cloakGroup.add(cloakMain);

  // Ujung bawah gerigi tangga asimetris
  const fringe1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.04), matCape);
  fringe1.position.set(-0.22, -1.05, 0);
  const fringe2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.04), matCape);
  fringe2.position.set(0.02, -1.09, 0);
  const fringe3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.04), matCape);
  fringe3.position.set(0.24, -1.04, 0);
  cloakGroup.add(fringe1, fringe2, fringe3);

  root.add(cloakGroup);

  // Quiver & Busur Punggung (Menempel di luar jubah)
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.16), matLeather);
  quiver.position.set(0.18, 1.26, -0.28);
  quiver.rotation.z = -0.48;
  root.add(quiver);

  const backBow = createSegmentedBow(matWood, matString);
  backBow.name = 'BackBow';
  backBow.position.set(-0.06, 1.22, -0.30);
  backBow.rotation.z = 0.65;
  backBow.rotation.y = Math.PI;
  root.add(backBow);

  // ==========================================
  // 5. KEPALA & TUDUNG PRISMA RUNCING (GAMBAR 1 STYLE)
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'HunterHeadGroup';
  headGroup.position.set(0, 1.50, 0);

  // Kerah jubah melingkari leher pundak (Cowl Wrap)
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.48), matHood);
  cowl.position.set(0, 0.02, 0);
  headGroup.add(cowl);

  // Wajah Inti Bertekstur
  const faceTexture = createRogueFaceTexture();
  const matFace = new THREE.MeshBasicMaterial({ map: faceTexture });
  const headMaterials = [matHood, matHood, matHood, matHood, matFace, matHood];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.44), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 0.28, 0);
  headGroup.add(headMesh);

  // Puncak Tudung Runcing (Peaked Rogue Hood Cone)
  const hoodRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 0.32, 4), // Prisma segi empat runcing ke atas
    matHood
  );
  hoodRoof.position.set(0, 0.58, -0.04);
  hoodRoof.rotation.y = Math.PI / 4; // Sudut lancip tepat di depan
  hoodRoof.rotation.x = -0.15;        // Miring sedikit menaungi dahi
  headGroup.add(hoodRoof);

  root.add(headGroup);

  // ==========================================
  // 6. LENGAN & POSE BELATI SIAP TEMPUR (GAMBAR 1 READY POSE)
  // ==========================================
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;

  [-0.38, 0.38].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const armGroup = new THREE.Group();
    armGroup.name = isLeft ? 'LeftArm' : 'RightArm';
    armGroup.position.set(xSide, 1.44, 0);

    // Pauldron Bahu Baja Bersudut (Gambar 1 Shoulder Armor)
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.22), matArmorPlate);
    armGroup.add(shoulder);

    // LENGAN: Mengarah ke luar samping, siku sedikit ditekuk santai
    const armLimb = new THREE.Group();
    armLimb.position.set(0, 0, 0);
    armLimb.rotation.z = isLeft ? 0.32 : -0.32; // Membuka ke samping membentuk huruf A
    armLimb.rotation.x = 0.20;                  // Menjorok sedikit ke depan

    const limbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.14), matTunic);
    limbMesh.position.set(0, -0.22, 0);
    armLimb.add(limbMesh);

    // Sarung Tangan Kulit Hitam
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.14), matPants);
    hand.position.set(0, -0.48, 0);
    armLimb.add(hand);

    // DUAL DAGGERS: Bilah Mengarah ke DEPAN-LUAR (Persis Gambar 1)
    const dagger = new THREE.Group();
    dagger.name = 'HandDagger';
    dagger.position.set(0, -0.48, 0);

    // Gagang di genggaman
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), matLeather);
    hilt.position.set(0, 0, 0);

    // Guard Belati
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), matArmorPlate);
    guard.position.set(0, 0.06, 0.06);

    // Bilah Belati Mengarah ke Depan Serong Keluar
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.44), matCyanGlow);
    blade.position.set(0, 0.06, 0.28); // Mencuat ke arah depan tangan (Z+)

    dagger.add(hilt, guard, blade);

    // Rotasi belati: sedikit menukik ke bawah dan menyerong ke luar
    dagger.rotation.x = -0.15; // Sedikit menukik
    dagger.rotation.y = isLeft ? 0.35 : -0.35; // Terbuka serong ke luar paha
    armLimb.add(dagger);

    // Busur di Tangan Kiri (untuk Stance Busur)
    if (isLeft) {
      const handBow = createSegmentedBow(matWood, matString);
      handBow.name = 'HandBow';
      handBow.position.set(0, -0.48, 0.12);
      handBow.rotation.y = -Math.PI / 2;
      handBow.visible = false;
      armLimb.add(handBow);
      armLeft = armGroup;
    } else {
      armRight = armGroup;
    }

    armGroup.add(armLimb);
    root.add(armGroup);
  });

  // Simpan referensi internal pada root untuk kebutuhan gameplay & animasi engine
  (root as any).leftLeg = leftLegGroup;
  (root as any).rightLeg = rightLegGroup;
  (root as any).leftArm = armLeft;
  (root as any).rightArm = armRight;
  (root as any).body = torsoGroup;
  (root as any).head = headGroup;
  (root as any).cape = cloakGroup;
  (root as any).chestplate = chestPlate;
  (root as any).weapon = armRight;
  (root as any).leftWeapon = armLeft;

  return root;
}

export function updateHunterWeaponStance(model: THREE.Group, stance: 'dagger' | 'bow') {
  const backBow = model.getObjectByName('BackBow');
  const handBow = model.getObjectByName('HandBow');
  const leftDagger = model.getObjectByName('LeftArm')?.getObjectByName('HandDagger');
  const rightDagger = model.getObjectByName('RightArm')?.getObjectByName('HandDagger');

  if (stance === 'bow') {
    if (backBow) backBow.visible = false;
    if (handBow) handBow.visible = true;
    if (leftDagger) leftDagger.visible = false;
    if (rightDagger) rightDagger.visible = false;
  } else {
    if (backBow) backBow.visible = true;
    if (handBow) handBow.visible = false;
    if (leftDagger) leftDagger.visible = true;
    if (rightDagger) rightDagger.visible = true;
  }
}

/**
 * ============================================================================
 * PLAYER MESH BUILDER FOR GAME ENGINE (PlayerMeshObjects)
 * ============================================================================
 */
export function createBlockyHunterMesh(tier: number = 1): PlayerMeshObjects {
  const root = createHunterModel();
  const charClass: CharacterClass = 'rogue';

  const leftLeg = ((root as any).leftLeg || new THREE.Group()) as THREE.Group;
  const rightLeg = ((root as any).rightLeg || new THREE.Group()) as THREE.Group;
  const leftArm = ((root as any).leftArm || root.getObjectByName('LeftArm')) as THREE.Group;
  const rightArm = ((root as any).rightArm || root.getObjectByName('RightArm')) as THREE.Group;
  const body = ((root as any).body || root.getObjectByName('TorsoGroup')) as THREE.Mesh;
  const head = ((root as any).head || root.getObjectByName('HunterHeadGroup')) as THREE.Mesh;
  const cape = ((root as any).cape || root.getObjectByName('HunterCloak')) as THREE.Mesh;
  const weapon = ((root as any).weapon || rightArm) as THREE.Group;
  const leftWeapon = ((root as any).leftWeapon || leftArm) as THREE.Group;

  let hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
    updateHunterWeaponStance(root, mode);
  };

  updateHunterWeaponStance(root, hunterWeaponMode);

  const orbitingOrbs: THREE.Mesh[] = [];
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  let wings: THREE.Group | undefined;
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  if (tier >= 3) {
    const ringGeo = new THREE.RingGeometry(0.55, 0.68, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.position.y = 0.05;
    root.add(auraRing);

    const orbCount = tier >= 5 ? 4 : 2;
    for (let i = 0; i < orbCount; i++) {
      const shurikenMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.6,
      });
      const shuriken = new THREE.Mesh(new THREE.OctahedronGeometry(0.10, 0), shurikenMat);
      const angle = (i / orbCount) * Math.PI * 2;
      shuriken.position.set(Math.cos(angle) * 0.8, 1.15, Math.sin(angle) * 0.8);
      root.add(shuriken);
      orbitingOrbs.push(shuriken);
    }
  }

  return {
    group: root,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weapon,
    leftWeapon,
    cape,
    body,
    head,
    charClass,
    tier,
    orbitingOrbs,
    wings,
    halo,
    halo2,
    auraRing,
    auraRing2,
    hunterWeaponMode,
    setHunterWeaponMode,
  };
}

/**
 * ============================================================================
 * ANIMASI GERAK & STANCE HUNTER
 * ============================================================================
 */
export function animateHunterWalk(
  playerMesh: PlayerMeshObjects,
  walkTime: number,
  playerPosY: number,
  isMoving: boolean,
  isAttacking: boolean = false,
  hunterWeaponMode: 'dagger' | 'bow' = 'dagger'
): void {
  if (!playerMesh) return;

  const isBow = hunterWeaponMode === 'bow';

  if (isMoving) {
    const legSwing = Math.sin(walkTime * 1.2) * 0.48;
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, 0.25);
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, 0.25);
    }

    if (!isAttacking) {
      if (isBow) {
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.65, 0.2);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.22, 0.2);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.10, 0.2);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.25 + legSwing * 0.3, 0.2);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, 0.2);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.12, 0.2);
        }
      } else {
        // A-Pose Walk Dynamic Swing
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -legSwing * 0.35, 0.2);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.2);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, legSwing * 0.35, 0.2);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.2);
        }
      }
    }

    // Melambai jubah belakang
    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = 0.14 + Math.abs(Math.sin(walkTime * 1.2)) * 0.14;
    }

    const walkBob = Math.abs(Math.sin(walkTime * 2.4)) * 0.04;
    playerMesh.group.position.y = playerPosY + walkBob;
    playerMesh.group.rotation.z = Math.sin(walkTime * 1.2) * 0.02;
  } else {
    // Mode Diam (Idle Stance)
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, 0.2);
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, 0.2);
    }
    playerMesh.group.rotation.z = THREE.MathUtils.lerp(playerMesh.group.rotation.z, 0, 0.2);

    const breathe = Math.sin(walkTime * 2.2) * 0.012;
    if (playerMesh.body) {
      playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, breathe, 0.15);
    }

    if (!isAttacking) {
      if (isBow) {
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.55, 0.15);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.18, 0.15);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.20 + breathe * 0.25, 0.15);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.12, 0.15);
        }
      } else {
        // Idle Tactical A-Pose
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, breathe * 0.25, 0.15);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.15);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, breathe * 0.25, 0.15);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.15);
        }
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = 0.14 + Math.sin(walkTime * 2.0) * 0.02;
    }
  }
}
