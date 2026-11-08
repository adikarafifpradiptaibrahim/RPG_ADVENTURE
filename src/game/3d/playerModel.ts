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

  ctx.fillStyle = '#c68642'; // Kulit dahi & mata
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#141619'; // Masker kain bawah
  ctx.fillRect(0, 64, 128, 64);

  ctx.fillStyle = '#2b2e35';
  ctx.fillRect(0, 60, 128, 4);

  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 10;
  ctx.fillRect(22, 36, 26, 14); // Mata Kiri
  ctx.fillRect(80, 36, 26, 14); // Mata Kanan

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// Generator Busur Bersudut 5-Segmen (Angular Recurve Bow)
function createSegmentedBow(matWood: THREE.Material, matString: THREE.Material): THREE.Group {
  const bow = new THREE.Group();
  bow.name = 'SegmentedBow';

  // Handle tengah
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), matWood);
  bow.add(handle);

  // Sayap Atas & Bawah
  const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), matWood);
  limbTop.position.set(0, 0.24, -0.06);
  limbTop.rotation.x = -0.45;

  const limbBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), matWood);
  limbBottom.position.set(0, -0.24, -0.06);
  limbBottom.rotation.x = 0.45;

  // Tip Ujung Atas & Bawah
  const tipTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.04), matWood);
  tipTop.position.set(0, 0.44, 0.01);
  tipTop.rotation.x = 0.65;

  const tipBottom = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.04), matWood);
  tipBottom.position.set(0, -0.44, 0.01);
  tipBottom.rotation.x = -0.65;

  // Tali Busur Cyan Berpendar
  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.52, 0.08),
    new THREE.Vector3(0, 0, 0.02),
    new THREE.Vector3(0, -0.52, 0.08)
  ]);
  const bowString = new THREE.Line(stringGeo, matString);

  bow.add(limbTop, limbBottom, tipTop, tipBottom, bowString);
  return bow;
}

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // MATERIAL
  const matSuit = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.85 });
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x545a66, roughness: 0.5, metalness: 0.25 });
  const matHoodCape = new THREE.MeshStandardMaterial({ color: 0x292c33, roughness: 0.9, side: THREE.DoubleSide });
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x3d2618, roughness: 0.8 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
  const matBuckle = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6 });
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.2,
    roughness: 0.2
  });
  const matString = new THREE.LineBasicMaterial({ color: 0x00f0ff });

  // 1. KAKI & SEPATU
  const legGroup = new THREE.Group();
  legGroup.name = 'LegGroup';
  let leftLegGroup: THREE.Group | undefined;
  let rightLegGroup: THREE.Group | undefined;

  [-0.14, 0.14].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'Leg_Left' : 'Leg_Right';
    legPivot.position.set(xPos, 0.74, 0);

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.60, 0.22), matSuit);
    leg.position.set(0, -0.30, 0); // world Y = 0.44

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.28), matLeather);
    boot.position.set(0, -0.62, 0.03); // world Y = 0.12

    legPivot.add(leg, boot);
    legGroup.add(legPivot);

    if (isLeft) leftLegGroup = legPivot;
    else rightLegGroup = legPivot;
  });
  root.add(legGroup);

  // 2. PINGGANG & SABUK
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.32), matSuit);
  pelvis.position.set(0, 0.82, 0);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.10, 0.36), matLeather);
  belt.position.set(0, 0.83, 0);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.38), matBuckle);
  buckle.position.set(0, 0.83, 0);

  [-0.30, 0.30].forEach((xPos) => {
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.12), matLeather);
    sheath.position.set(xPos, 0.74, 0);
    sheath.rotation.z = xPos < 0 ? 0.12 : -0.12;
    root.add(sheath);
  });
  root.add(pelvis, belt, buckle);

  // 3. TORSO & PLAT DADA
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'TorsoGroup';
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.32), matSuit);
  torso.position.set(0, 1.20, 0);
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.08), matArmor);
  chestPlate.position.set(0, 1.28, 0.18);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.35), matLeather);
  strap.rotation.z = -0.58;
  strap.position.set(0, 1.20, 0.02);
  torsoGroup.add(torso, chestPlate, strap);
  root.add(torsoGroup);

  // 4. JUBAH BERGERIGI (CAPE)
  const capeGroup = new THREE.Group();
  capeGroup.name = 'HunterCape';
  capeGroup.position.set(0, 1.45, -0.32);
  capeGroup.rotation.x = -0.22;

  const capeMain = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.76, 0.03), matHoodCape);
  capeMain.position.set(0, -0.38, 0);
  capeGroup.add(capeMain);

  const fringeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.03), matHoodCape);
  fringeL.position.set(-0.18, -0.83, 0);
  const fringeM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.03), matHoodCape);
  fringeM.position.set(0.01, -0.87, 0);
  const fringeR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.03), matHoodCape);
  fringeR.position.set(0.19, -0.81, 0);
  capeGroup.add(fringeL, fringeM, fringeR);
  root.add(capeGroup);

  // 5. PUNGGUNG: TABUNG PANAH & BUSUR PUNGGUNG (BACK WEAPONS)
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), matLeather);
  quiver.position.set(0.14, 1.25, -0.28);
  quiver.rotation.z = -0.50;
  quiver.rotation.x = -0.10;
  root.add(quiver);

  // Busur saat terpasang di punggung (Back Bow)
  const backBow = createSegmentedBow(matWood, matString);
  backBow.name = 'BackBow';
  backBow.position.set(-0.06, 1.22, -0.29);
  backBow.rotation.z = 0.65;
  backBow.rotation.y = Math.PI;
  root.add(backBow);

  // 6. KEPALA DENGAN TEKSTUR WAJAH & TUDUNG
  const faceTexture = createHunterFaceTexture();
  const matFace = new THREE.MeshBasicMaterial({ map: faceTexture });
  const headMaterials = [matHoodCape, matHoodCape, matHoodCape, matHoodCape, matFace, matHoodCape];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.46), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 1.74, 0);
  root.add(headMesh);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.50), matHoodCape);
  visor.position.set(0, 1.99, 0.04);
  visor.rotation.x = 0.16;
  root.add(visor);

  // 7. LENGAN, DUAL BELATI & HAND BOW (UNTUK STANCE BUSUR)
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;

  [-0.34, 0.34].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const arm = new THREE.Group();
    arm.name = isLeft ? 'LeftArm' : 'RightArm';
    arm.position.set(xSide, 1.42, 0);

    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), matArmor);
    arm.add(shoulder);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.40, 0.14), matSuit);
    forearm.position.set(0, -0.20, 0.06);
    forearm.rotation.x = 0.32;
    arm.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.12), matSuit);
    hand.position.set(0, -0.38, 0.18);
    arm.add(hand);

    // Dagger Group di Tangan
    const daggerGroup = new THREE.Group();
    daggerGroup.name = 'HandDagger';
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), matLeather);
    hilt.position.set(0, -0.38, 0.18);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), matArmor);
    guard.position.set(0, -0.38, 0.28);
    // Bilah belati cyan memanjang tegas ke depan (+0.38 dari telapak tangan)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.50), matGlow);
    blade.position.set(0, -0.38, 0.56);
    blade.rotation.y = isLeft ? -0.10 : 0.10;
    daggerGroup.add(hilt, guard, blade);
    arm.add(daggerGroup);

    // Di tangan kiri, pasang busur tangan (Hand Bow)
    if (isLeft) {
      const handBow = createSegmentedBow(matWood, matString);
      handBow.name = 'HandBow';
      handBow.position.set(0, -0.38, 0.22);
      handBow.rotation.y = -Math.PI / 2;
      handBow.visible = false; // Default tersembunyi jika stance belati aktif
      arm.add(handBow);
      armLeft = arm;
    } else {
      armRight = arm;
    }

    root.add(arm);
  });

  // Simpan referensi internal pada root untuk kebutuhan gameplay & animasi engine
  (root as any).leftLeg = leftLegGroup;
  (root as any).rightLeg = rightLegGroup;
  (root as any).leftArm = armLeft;
  (root as any).rightArm = armRight;
  (root as any).body = torsoGroup;
  (root as any).head = headMesh;
  (root as any).cape = capeGroup;
  (root as any).chestplate = chestPlate;
  (root as any).weapon = armRight;
  (root as any).leftWeapon = armLeft;

  return root;
}

// LOGIKA SWITCH WEAPON STANCE
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
  const head = ((root as any).head || root.getObjectByName('HunterHead')) as THREE.Mesh;
  const cape = ((root as any).cape || root.getObjectByName('HunterCape')) as THREE.Mesh;
  const weapon = ((root as any).weapon || rightArm) as THREE.Group;
  const leftWeapon = ((root as any).leftWeapon || leftArm) as THREE.Group;

  let hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
    updateHunterWeaponStance(root, mode);
  };

  // Pastikan stance awal sinkron
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
    const legSwing = Math.sin(walkTime * 1.2) * 0.52;
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, 0.25);
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, 0.25);
    }

    if (!isAttacking) {
      if (isBow) {
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.75, 0.2);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.25, 0.2);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.10, 0.2);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.30 + legSwing * 0.35, 0.2);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, 0.2);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.15, 0.2);
        }
      } else {
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.45 - legSwing * 0.35, 0.2);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.2);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.2);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.45 + legSwing * 0.35, 0.2);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.2);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.2);
        }
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.22 - Math.abs(Math.sin(walkTime * 1.2)) * 0.18;
    }

    const walkBob = Math.abs(Math.sin(walkTime * 2.4)) * 0.04;
    playerMesh.group.position.y = playerPosY + walkBob;
    playerMesh.group.rotation.z = Math.sin(walkTime * 1.2) * 0.025;
  } else {
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
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.65, 0.15);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.20, 0.15);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.05, 0.15);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.25 + breathe * 0.3, 0.15);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, 0.15);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.12, 0.15);
        }
      } else {
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.22 + breathe * 0.3, 0.15);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.15);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.15);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.22 - breathe * 0.3, 0.15);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.15);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.15);
        }
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.22 - Math.sin(walkTime * 2.0) * 0.03;
    }
  }
}
