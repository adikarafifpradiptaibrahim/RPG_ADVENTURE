import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

// 1. TEKSTUR WAJAH KANVAS DETERMINISTIK
function createRogueFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111215';
  ctx.fillRect(0, 0, 128, 128);

  // Masker kain gelap
  ctx.fillStyle = '#1c1e24';
  ctx.fillRect(0, 68, 128, 60);

  // Celah kulit mata
  ctx.fillStyle = '#d49b6a';
  ctx.fillRect(16, 38, 96, 26);

  // Hidung masker segitiga
  ctx.fillStyle = '#1c1e24';
  ctx.beginPath();
  ctx.moveTo(48, 68);
  ctx.lineTo(64, 50);
  ctx.lineTo(80, 68);
  ctx.fill();

  // Mata Cyan Menyipit Bercahaya
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 12;
  ctx.fillRect(24, 46, 24, 8);
  ctx.fillRect(80, 46, 24, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// 2. BUSUR BERSUDUT 5-SEGMEN
function createSegmentedBow(matWood: THREE.Material, matString: THREE.Material): THREE.Group {
  const bow = new THREE.Group();
  bow.name = 'SegmentedBow';

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), matWood);
  bow.add(handle);

  const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), matWood);
  limbTop.position.set(0, 0.24, -0.06);
  limbTop.rotation.x = -0.45;

  const limbBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), matWood);
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

  // --- PALET MATERIAL ---
  const matHood = new THREE.MeshStandardMaterial({ color: 0x272a31, roughness: 0.9 });
  const matTunic = new THREE.MeshStandardMaterial({ color: 0x3d1d24, roughness: 0.8 });
  const matPants = new THREE.MeshStandardMaterial({ color: 0x1f2126, roughness: 0.9 });
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x422917, roughness: 0.75 });
  const matArmorPlate = new THREE.MeshStandardMaterial({ color: 0x6e7685, roughness: 0.4, metalness: 0.35 });
  const matCape = new THREE.MeshStandardMaterial({ color: 0x2a1318, roughness: 0.85, side: THREE.DoubleSide });
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
  // 1. KAKI & SEPATU
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

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.62, 0.22), matPants);
    leg.position.set(0, -0.32, 0);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.28), matLeather);
    boot.position.set(0, -0.61, 0.03);

    const bootCuff = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.30), matLeather);
    bootCuff.position.set(0, -0.50, 0.03);

    legPivot.add(leg, boot, bootCuff);
    legGroup.add(legPivot);

    if (isLeft) leftLegGroup = legPivot;
    else rightLegGroup = legPivot;
  });
  root.add(legGroup);

  // ==========================================
  // 2. PINGGUL & SABUK
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.34), matPants);
  pelvis.position.set(0, 0.80, 0);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.10, 0.38), matLeather);
  belt.position.set(0, 0.81, 0);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.40), matBuckle);
  buckle.position.set(0, 0.81, 0);

  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.10), matLeather);
  pouchL.position.set(-0.18, 0.81, 0.20);
  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.08), matLeather);
  pouchR.position.set(0.18, 0.81, 0.20);

  [-0.32, 0.32].forEach((xPos) => {
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.12), matLeather);
    sheath.position.set(xPos, 0.70, 0);
    sheath.rotation.z = xPos < 0 ? 0.14 : -0.14;
    root.add(sheath);
  });

  root.add(pelvis, belt, buckle, pouchL, pouchR);

  // ==========================================
  // 3. TORSO & PLAT DADA
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'TorsoGroup';

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.60, 0.34), matTunic);
  torso.position.set(0, 1.18, 0);
  torsoGroup.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.08), matArmorPlate);
  chestPlate.position.set(0, 1.25, 0.18);
  torsoGroup.add(chestPlate);

  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.36), matLeather);
  strap.rotation.z = -0.55;
  strap.position.set(0, 1.18, 0.02);
  torsoGroup.add(strap);

  root.add(torsoGroup);

  // ==========================================
  // 4. JUBAH BELAKANG
  // ==========================================
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'HunterCloak';
  cloakGroup.position.set(0, 1.48, -0.20);
  cloakGroup.rotation.x = 0.12;

  const cloakMain = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.00, 0.04), matCape);
  cloakMain.position.set(0, -0.50, 0);
  cloakGroup.add(cloakMain);

  const fringe1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.04), matCape);
  fringe1.position.set(-0.22, -1.05, 0);
  const fringe2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.04), matCape);
  fringe2.position.set(0.02, -1.09, 0);
  const fringe3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.04), matCape);
  fringe3.position.set(0.24, -1.04, 0);
  cloakGroup.add(fringe1, fringe2, fringe3);

  root.add(cloakGroup);

  // Quiver & Busur Punggung
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
  // 5. KEPALA DENGAN TUDUNG TRAPEZOID
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'HunterHeadGroup';
  headGroup.position.set(0, 1.50, 0);

  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.48), matHood);
  cowl.position.set(0, 0.04, 0);
  headGroup.add(cowl);

  const faceTexture = createRogueFaceTexture();
  const matFace = new THREE.MeshBasicMaterial({ map: faceTexture });
  const headMaterials = [matHood, matHood, matHood, matHood, matFace, matHood];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.44), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 0.28, 0);
  headGroup.add(headMesh);

  const hoodCap = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.14, 0.48), matHood);
  hoodCap.position.set(0, 0.52, 0.02);
  hoodCap.rotation.x = 0.16;
  headGroup.add(hoodCap);

  const hoodPeak = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.10, 0.36), matHood);
  hoodPeak.position.set(0, 0.59, -0.02);
  hoodPeak.rotation.x = 0.10;
  headGroup.add(hoodPeak);

  root.add(headGroup);

  // ==========================================
  // 6. LENGAN & DUAL BELATI: ANIMATION-SAFE HIERARCHY
  // ==========================================

  // --- TANGAN KIRI (X = -0.44 dari pandangan belakang) ---
  const leftArmGroup = new THREE.Group();
  leftArmGroup.name = 'LeftArm'; // Node ini dibiarkan netral untuk engine
  leftArmGroup.position.set(-0.44, 1.44, 0.02);

  // Sub-grup pose statis kebal override animasi
  const leftArmPose = new THREE.Group();
  leftArmPose.name = 'LeftArmPose';
  leftArmPose.rotation.z = -0.16; // Membuka ke samping kiri luar (A-Pose sejati)
  leftArmPose.rotation.x = -0.30; // Siku ditekuk maju ke depan dada
  leftArmPose.rotation.y = 0.20;

  // Pauldron Bahu Kiri
  const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.24), matArmorPlate);
  leftShoulder.position.set(0, 0, 0);
  leftArmPose.add(leftShoulder);

  // Batang Lengan Kiri
  const leftLimb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.14), matTunic);
  leftLimb.position.set(0, -0.22, 0);
  leftArmPose.add(leftLimb);

  // Telapak Tangan Kiri
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), matPants);
  leftHand.position.set(0, -0.44, 0.02);
  leftArmPose.add(leftHand);

  // Belati Kiri (Mencuat horizontal ke DEPAN lawan, sedikit serong luar)
  const leftDagger = new THREE.Group();
  leftDagger.name = 'HandDagger';
  leftDagger.position.set(0, -0.44, 0.04);
  leftDagger.rotation.x = 0.35;  // Menyeimbangkan tekukan lengan agar bilah mendatar ke depan
  leftDagger.rotation.y = -0.28; // Terbuka ke kiri luar

  const leftHilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), matLeather);
  const leftGuard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), matArmorPlate);
  leftGuard.position.set(0, 0, 0.07);
  const leftBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.48), matCyanGlow);
  leftBlade.position.set(0, 0, 0.31); // Mencuat ke depan sumbu Z

  leftDagger.add(leftHilt, leftGuard, leftBlade);
  leftArmPose.add(leftDagger);

  // Busur Horizontal Membujur (Senar di Atas, Gagang di Bawah)
  const handBow = createSegmentedBow(matWood, matString);
  handBow.name = 'HandBow';
  handBow.position.set(-0.06, -0.42, 0.04);

  // KOREKSI SUMBU TUNGGAL:
  // Cukup putar 90 derajat di sumbu Z agar busur tidur membujur dengan senar menghadap lurus ke ATAS
  handBow.rotation.set(0, 0, Math.PI / 2);
  handBow.visible = false;
  leftArmPose.add(handBow);

  leftArmGroup.add(leftArmPose);
  root.add(leftArmGroup);

  // --- TANGAN KANAN (X = +0.44 dari pandangan belakang) ---
  const rightArmGroup = new THREE.Group();
  rightArmGroup.name = 'RightArm'; // Node ini dibiarkan netral untuk engine
  rightArmGroup.position.set(0.44, 1.44, 0.02);

  // Sub-grup pose statis kebal override animasi
  const rightArmPose = new THREE.Group();
  rightArmPose.name = 'RightArmPose';
  rightArmPose.rotation.z = 0.16; // Membuka ke samping kanan luar (A-Pose sejati)
  rightArmPose.rotation.x = 0.12; // Lengan menjulur di samping paha
  rightArmPose.rotation.y = -0.20;

  // Pauldron Bahu Kanan
  const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.24), matArmorPlate);
  rightShoulder.position.set(0, 0, 0);
  rightArmPose.add(rightShoulder);

  // Batang Lengan Kanan
  const rightLimb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.14), matTunic);
  rightLimb.position.set(0, -0.22, 0);
  rightArmPose.add(rightLimb);

  // Telapak Tangan Kanan
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), matPants);
  rightHand.position.set(0, -0.44, 0.02);
  rightArmPose.add(rightHand);

  // Belati Kanan (Mencuat horizontal ke DEPAN lawan, serong ke kanan)
  const rightDagger = new THREE.Group();
  rightDagger.name = 'HandDagger';
  rightDagger.position.set(0, -0.44, 0.04);
  rightDagger.rotation.x = -0.05; // Mendatar ke depan
  rightDagger.rotation.y = 0.28;  // Terbuka ke kanan luar

  const rightHilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), matLeather);
  const rightGuard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), matArmorPlate);
  rightGuard.position.set(0, 0, 0.07);
  const rightBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.48), matCyanGlow);
  rightBlade.position.set(0, 0, 0.31); // Mencuat ke depan sumbu Z

  rightDagger.add(rightHilt, rightGuard, rightBlade);
  rightArmPose.add(rightDagger);

  rightArmGroup.add(rightArmPose);
  root.add(rightArmGroup);

  // Simpan referensi internal pada root untuk kebutuhan gameplay & animasi engine
  (root as any).leftLeg = leftLegGroup;
  (root as any).rightLeg = rightLegGroup;
  (root as any).leftArm = leftArmGroup;
  (root as any).rightArm = rightArmGroup;
  (root as any).body = torsoGroup;
  (root as any).head = headGroup;
  (root as any).cape = cloakGroup;
  (root as any).chestplate = chestPlate;
  (root as any).weapon = rightArmGroup;
  (root as any).leftWeapon = leftArmGroup;

  return root;
}

export function updateHunterWeaponStance(model: THREE.Group, stance: 'dagger' | 'bow') {
  const backBow = model.getObjectByName('BackBow');
  const handBow = model.getObjectByName('HandBow');
  const leftDagger = model.getObjectByName('LeftArm')?.getObjectByName('HandDagger');
  const rightDagger = model.getObjectByName('RightArm')?.getObjectByName('HandDagger');

  const leftArmPose = model.getObjectByName('LeftArmPose');
  const rightArmPose = model.getObjectByName('RightArmPose');

  if (stance === 'bow') {
    // Mode Panah:
    if (backBow) backBow.visible = false;
    if (handBow) handBow.visible = true;
    if (leftDagger) leftDagger.visible = false;
    if (rightDagger) rightDagger.visible = false;

    // TANGAN PEMEGANG BUSUR: Turun menyusuri pinggul, ketiak sedikit santai
    if (leftArmPose) {
      leftArmPose.rotation.set(0.04, 0.02, -0.10);
    }

    // TANGAN TANPA SENJATA: Lurus vertikal ke bawah sejajar badan
    if (rightArmPose) {
      rightArmPose.rotation.set(0, 0, 0);
    }
  } else {
    // Mode Belati (Melee A-Pose Asli):
    if (backBow) backBow.visible = true;
    if (handBow) handBow.visible = false;
    if (leftDagger) leftDagger.visible = true;
    if (rightDagger) rightDagger.visible = true;

    // Kembalikan ke pose belati siap tempur
    if (leftArmPose) {
      leftArmPose.rotation.set(-0.30, 0.20, -0.16);
    }
    if (rightArmPose) {
      rightArmPose.rotation.set(0.12, -0.20, 0.16);
    }
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
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -legSwing * 0.15, 0.2);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.2);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0, 0.2);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, legSwing * 0.35, 0.2);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.2);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0, 0.2);
        }
      } else {
        // A-Pose Walk Dynamic Swing (Menggerakkan ShoulderRoot sehingga ArmPivot A-Pose tetap stabil)
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
      playerMesh.cape.rotation.x = 0.12 + Math.abs(Math.sin(walkTime * 1.2)) * 0.14;
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
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, breathe * 0.25, 0.15);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.15);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0, 0.15);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, breathe * 0.25, 0.15);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.15);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0, 0.15);
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
      playerMesh.cape.rotation.x = 0.12 + Math.sin(walkTime * 2.0) * 0.02;
    }
  }
}
