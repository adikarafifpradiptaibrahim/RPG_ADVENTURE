import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

function createHunterFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Area Kulit Sawo Matang (Dahi & Mata)
  ctx.fillStyle = '#c68642';
  ctx.fillRect(0, 0, 128, 128);

  // Masker Kain Hitam Arang (50% ke bawah)
  ctx.fillStyle = '#141619';
  ctx.fillRect(0, 64, 128, 64);

  // Garis Jahitan Masker
  ctx.fillStyle = '#2b2e35';
  ctx.fillRect(0, 60, 128, 4);

  // Mata Cyan Berpendar
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 12;
  ctx.fillRect(20, 36, 28, 14); // Kiri
  ctx.fillRect(80, 36, 28, 14); // Kanan

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

function createSegmentedBow(matWood: THREE.Material, matString: THREE.Material): THREE.Group {
  const bow = new THREE.Group();
  bow.name = 'SegmentedBow';

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.07), matWood);
  bow.add(handle);

  const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), matWood);
  limbTop.position.set(0, 0.28, -0.07);
  limbTop.rotation.x = -0.45;

  const limbBottom = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), matWood);
  limbBottom.position.set(0, -0.28, -0.07);
  limbBottom.rotation.x = 0.45;

  const tipTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), matWood);
  tipTop.position.set(0, 0.50, 0.02);
  tipTop.rotation.x = 0.65;

  const tipBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), matWood);
  tipBottom.position.set(0, -0.50, 0.02);
  tipBottom.rotation.x = -0.65;

  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.60, 0.09),
    new THREE.Vector3(0, 0, 0.02),
    new THREE.Vector3(0, -0.60, 0.09)
  ]);
  const bowString = new THREE.Line(stringGeo, matString);

  bow.add(limbTop, limbBottom, tipTop, tipBottom, bowString);
  return bow;
}

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // --- MATERIAL DEFINITIONS ---
  const matSuit = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.85 });
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x4f5460, roughness: 0.5, metalness: 0.3 });
  const matCloak = new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: 0.9, side: THREE.DoubleSide });
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x3d2618, roughness: 0.8 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x543924, roughness: 0.7 });
  const matBuckle = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6 });
  const matCyanGlow = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.5,
    roughness: 0.2
  });
  const matString = new THREE.LineBasicMaterial({ color: 0x00f0ff });

  // ==========================================
  // 1. KAKI & SEPATU BOT (PROPORSIONAL KNIGHT/MAGE)
  // ==========================================
  const legGroup = new THREE.Group();
  legGroup.name = 'LegGroup';
  let leftLegGroup: THREE.Group | undefined;
  let rightLegGroup: THREE.Group | undefined;

  [-0.18, 0.18].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'Leg_Left' : 'Leg_Right';
    legPivot.position.set(xPos, 0.74, 0);

    // Paha & Betis (world Y = 0.44 -> local Y = -0.30)
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.64, 0.26), matSuit);
    leg.position.set(0, -0.30, 0);

    // Sepatu Bot (world Y = 0.13 -> local Y = -0.61)
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.32), matLeather);
    boot.position.set(0, -0.61, 0.03);

    legPivot.add(leg, boot);
    legGroup.add(legPivot);

    if (isLeft) leftLegGroup = legPivot;
    else rightLegGroup = legPivot;
  });
  root.add(legGroup);

  // ==========================================
  // 2. PINGGUL & SABUK
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.20, 0.38), matSuit);
  pelvis.position.set(0, 0.82, 0);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.42), matLeather);
  belt.position.set(0, 0.83, 0);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.44), matBuckle);
  buckle.position.set(0, 0.83, 0);

  // Sarung Belati Samping Paha Luar
  [-0.38, 0.38].forEach((xPos) => {
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.36, 0.14), matLeather);
    sheath.position.set(xPos, 0.72, 0);
    sheath.rotation.z = xPos < 0 ? 0.14 : -0.14;
    root.add(sheath);
  });

  root.add(pelvis, belt, buckle);

  // ==========================================
  // 3. TORSO & ZIRAH DADA (LEBAR SETARA KNIGHT)
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'TorsoGroup';

  // Torso utama tegap
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.62, 0.38), matSuit);
  torso.position.set(0, 1.22, 0);
  torsoGroup.add(torso);

  // Plat Dada Baja
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.38, 0.10), matArmor);
  chestPlate.position.set(0, 1.30, 0.20);
  torsoGroup.add(chestPlate);

  // Selempang Sabuk Bahu
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.68, 0.40), matLeather);
  strap.rotation.z = -0.55;
  strap.position.set(0, 1.22, 0.02);
  torsoGroup.add(strap);

  root.add(torsoGroup);

  // ==========================================
  // 4. JUBAH LEBAR MENYELIMUTI TUBUH (ROB-LIKE CLOAK)
  // ==========================================
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'HunterCloak';
  cloakGroup.position.set(0, 1.50, -0.22);

  // Lembaran Belakang Lebar Menjuntai
  const backCloak = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 0.05), matCloak);
  backCloak.position.set(0, -0.52, 0);
  backCloak.rotation.x = -0.12;
  cloakGroup.add(backCloak);

  // Sayap Jubah Samping Kiri (Menutupi Rusuk & Paha Kiri)
  const sideCloakL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.36), matCloak);
  sideCloakL.position.set(-0.42, -0.48, 0.12);
  sideCloakL.rotation.z = 0.08;
  cloakGroup.add(sideCloakL);

  // Sayap Jubah Samping Kanan (Menutupi Rusuk & Paha Kanan)
  const sideCloakR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.36), matCloak);
  sideCloakR.position.set(0.42, -0.48, 0.12);
  sideCloakR.rotation.z = -0.08;
  cloakGroup.add(sideCloakR);

  // Gerigi Bawah Jubah
  const fringe1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.05), matCloak);
  fringe1.position.set(-0.26, -1.10, 0);
  const fringe2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.30, 0.05), matCloak);
  fringe2.position.set(0.02, -1.14, 0);
  const fringe3 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.05), matCloak);
  fringe3.position.set(0.28, -1.08, 0);
  cloakGroup.add(fringe1, fringe2, fringe3);

  root.add(cloakGroup);

  // Quiver & Busur Punggung (Bertengger di luar jubah)
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.70, 0.18), matLeather);
  quiver.position.set(0.20, 1.30, -0.32);
  quiver.rotation.z = -0.50;
  root.add(quiver);

  const backBow = createSegmentedBow(matWood, matString);
  backBow.name = 'BackBow';
  backBow.position.set(-0.08, 1.25, -0.34);
  backBow.rotation.z = 0.65;
  backBow.rotation.y = Math.PI;
  root.add(backBow);

  // ==========================================
  // 5. KEPALA, TUDUNG & MASKER PROPORSIONAL
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'HunterHeadGroup';
  headGroup.position.set(0, 1.55, 0);

  // Leher
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.24), matSuit);
  neck.position.set(0, 0.07, 0);
  headGroup.add(neck);

  // Kepala Inti Bertekstur
  const faceTexture = createHunterFaceTexture();
  const matFace = new THREE.MeshBasicMaterial({ map: faceTexture });
  const headMaterials = [matCloak, matCloak, matCloak, matCloak, matFace, matCloak];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.48), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 0.32, 0);
  headGroup.add(headMesh);

  // Tudung Luar & Visor Atas
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.54), matCloak);
  visor.position.set(0, 0.58, 0.04);
  visor.rotation.x = 0.16;
  headGroup.add(visor);

  root.add(headGroup);

  // ==========================================
  // 6. LENGAN: A-POSE DUAL BLADE (ATTACK ON TITAN / ASSASSIN'S CREED)
  // ==========================================
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;

  [-0.44, 0.44].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const armGroup = new THREE.Group();
    armGroup.name = isLeft ? 'LeftArm' : 'RightArm';
    armGroup.position.set(xSide, 1.46, 0);

    // Pauldron Bahu Baja (Lebar dan gagah setara Knight)
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), matArmor);
    armGroup.add(shoulder);

    // Lengan Membuka ke Luar dan Menekuk ke Depan (A-Pose Angle)
    const limb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.18), matSuit);
    limb.position.set(isLeft ? -0.06 : 0.06, -0.24, 0.04);
    limb.rotation.z = isLeft ? 0.35 : -0.35; // Lengan membuka membentuk kaki huruf A
    limb.rotation.x = 0.25;                  // Menekuk sedikit ke depan
    armGroup.add(limb);

    // Tangan (Kepalan)
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), matSuit);
    hand.position.set(isLeft ? -0.14 : 0.14, -0.48, 0.12);
    armGroup.add(hand);

    // Dual Dagger Group (Reverse / Low Tactical Grip)
    const dagger = new THREE.Group();
    dagger.name = 'HandDagger';
    dagger.position.set(isLeft ? -0.14 : 0.14, -0.48, 0.12);
    // Orientasi bilah serong menyamping & sedikit menukik ke bawah
    dagger.rotation.z = isLeft ? -0.30 : 0.30;
    dagger.rotation.x = 0.55;

    // Gagang di genggaman
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), matLeather);
    hilt.position.set(0, 0, 0);
    // Guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.06), matArmor);
    guard.position.set(0, 0.08, 0);

    // Bilah Cyan Memanjang Mantap
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.02), matCyanGlow);
    blade.position.set(0, 0.36, 0);

    dagger.add(hilt, guard, blade);
    armGroup.add(dagger);

    // Busur Tangan (Khusus Tangan Kiri saat Ranged Mode)
    if (isLeft) {
      const handBow = createSegmentedBow(matWood, matString);
      handBow.name = 'HandBow';
      handBow.position.set(0, -0.48, 0.14);
      handBow.rotation.y = -Math.PI / 2;
      handBow.visible = false;
      armGroup.add(handBow);
      armLeft = armGroup;
    } else {
      armRight = armGroup;
    }

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
        // A-Pose Walk Dynamic Swing (menjaga sikap lengan A-pose tactical)
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

    // Melambai jubah lebar (HunterCloak)
    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.12 - Math.abs(Math.sin(walkTime * 1.2)) * 0.14;
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
      playerMesh.cape.rotation.x = -0.12 - Math.sin(walkTime * 2.0) * 0.02;
    }
  }
}
