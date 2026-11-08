import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

/**
 * ============================================================================
 * MAIN 3D CHARACTER MODEL BUILDER: THE HUNTER (PEMBURU - BLOCKY REVISION)
 * Implementasi modular arsitektur Three.js:
 * 1. Wajah bertingkat: Batok kulit sawo matang + masker kain arang + mata cyan.
 * 2. Jubah bergerigi tangga (Cape) dipasang ke root dengan offset Z aman.
 * 3. Sepasang belati cyan memanjang tegas ke depan (sumbu Z+).
 * ============================================================================
 */
export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // --- PALET MATERIAL ---
  const matSuit = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.85 }); // Kain dalam hitam
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x525863, roughness: 0.5, metalness: 0.25 }); // Plat dada abu-abu
  const matHood = new THREE.MeshStandardMaterial({ color: 0x2d3037, roughness: 0.9 }); // Tudung & jubah gelap
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xc28854, roughness: 0.75 }); // Kulit sawo matang
  const matMask = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.95 }); // Masker kain arang
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x3d2618, roughness: 0.8 }); // Sabuk & bot cokelat
  const matBuckle = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6 }); // Logam perak
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.2,
    roughness: 0.2,
  }); // Cyan pendar belati & mata

  // ==========================================
  // 1. KAKI & SEPATU BOT (Tinggi: 0.0 - 0.82)
  // Pivot kaki di hip (Y = 0.74) agar animasi berjalan dinamis & natural
  // ==========================================
  const legGroup = new THREE.Group();
  legGroup.name = 'Hunter_Legs';
  let leftLegGroup: THREE.Group | undefined;
  let rightLegGroup: THREE.Group | undefined;

  [-0.14, 0.14].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'Leg_Left' : 'Leg_Right';
    legPivot.position.set(xPos, 0.74, 0);

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.60, 0.22), matSuit);
    leg.position.set(0, -0.30, 0); // world Y = 0.44
    leg.castShadow = true;

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.28), matLeather);
    boot.position.set(0, -0.62, 0.03); // world Y = 0.12
    boot.castShadow = true;

    legPivot.add(leg, boot);
    legGroup.add(legPivot);

    if (isLeft) {
      leftLegGroup = legPivot;
    } else {
      rightLegGroup = legPivot;
    }
  });
  root.add(legGroup);

  // ==========================================
  // 2. PINGGANG, SABUK & SARUNG BELATI (Y: 0.78 - 0.92)
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.32), matSuit);
  pelvis.position.set(0, 0.82, 0);
  pelvis.castShadow = true;

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.10, 0.36), matLeather);
  belt.position.set(0, 0.83, 0);
  belt.castShadow = true;

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.38), matBuckle);
  buckle.position.set(0, 0.83, 0);
  buckle.castShadow = true;

  // Sarung belati di samping paha luar
  [-0.30, 0.30].forEach((xPos) => {
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.12), matLeather);
    sheath.position.set(xPos, 0.74, 0);
    sheath.rotation.z = xPos < 0 ? 0.12 : -0.12;
    sheath.castShadow = true;
    root.add(sheath);
  });

  root.add(pelvis, belt, buckle);

  // ==========================================
  // 3. TORSO & ZIRAH DADA (Y: 0.90 - 1.50)
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'Hunter_Torso';

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.32), matSuit);
  torso.position.set(0, 1.20, 0);
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Plat baja dada depan (terlihat jelas di bawah leher)
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.08), matArmor);
  chestPlate.position.set(0, 1.28, 0.18);
  chestPlate.castShadow = true;
  torsoGroup.add(chestPlate);

  // Selempang kulit dada
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.35), matLeather);
  strap.rotation.z = -0.58;
  strap.position.set(0, 1.20, 0.02);
  strap.castShadow = true;
  torsoGroup.add(strap);

  root.add(torsoGroup);

  // ==========================================
  // 4. JUBAH BERGERIGI TANGGA (CAPE LANGSUNG KE ROOT)
  // ==========================================
  const capeGroup = new THREE.Group();
  capeGroup.name = 'HunterCape';
  capeGroup.position.set(0, 1.45, -0.22);
  capeGroup.rotation.x = -0.16; // Melambai ke belakang

  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x282b31,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const capeMain = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.76, 0.03), capeMat);
  capeMain.position.set(0, -0.38, 0);
  capeMain.castShadow = true;
  capeGroup.add(capeMain);

  // 3 Ujung gerigi tangga bawah jubah
  const fringeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.03), capeMat);
  fringeL.position.set(-0.18, -0.83, 0);
  fringeL.castShadow = true;
  const fringeM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.03), capeMat);
  fringeM.position.set(0.01, -0.87, 0);
  fringeM.castShadow = true;
  const fringeR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.03), capeMat);
  fringeR.position.set(0.19, -0.81, 0);
  fringeR.castShadow = true;
  capeGroup.add(fringeL, fringeM, fringeR);

  root.add(capeGroup);

  // Tabung panah (Quiver) menempel di atas jubah
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), matLeather);
  quiver.position.set(0.14, 1.25, -0.28);
  quiver.rotation.z = -0.50;
  quiver.rotation.x = -0.10;
  quiver.castShadow = true;
  root.add(quiver);

  // ==========================================
  // 5. KEPALA, TUDUNG & MASKER MULTILAYER
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'Hunter_Head';
  headGroup.position.set(0, 1.50, 0);

  // Leher
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.20), matSuit);
  neck.position.set(0, 0.06, 0);
  neck.castShadow = true;
  headGroup.add(neck);

  // Batok kepala (lapisan kulit dasar sawo matang)
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.42), matSkin);
  headMesh.position.set(0, 0.24, 0);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Masker kain padat (hanya menutupi hidung ke dagu)
  const maskMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.14), matMask);
  maskMesh.position.set(0, 0.16, 0.18);
  maskMesh.castShadow = true;
  headGroup.add(maskMesh);

  // Mata cyan berpendar di atas garis masker
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.04), matGlow);
  eyeL.position.set(-0.10, 0.29, 0.23);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.04), matGlow);
  eyeR.position.set(0.10, 0.29, 0.23);
  headGroup.add(eyeL, eyeR);

  // Tudung luar (atap, samping, dan belakang)
  const hoodRoof = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.52), matHood);
  hoodRoof.position.set(0, 0.48, 0.02);
  hoodRoof.rotation.x = 0.14;
  hoodRoof.castShadow = true;

  const hoodSideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.40, 0.50), matHood);
  hoodSideL.position.set(-0.24, 0.26, 0.01);
  hoodSideL.castShadow = true;
  const hoodSideR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.40, 0.50), matHood);
  hoodSideR.position.set(0.24, 0.26, 0.01);
  hoodSideR.castShadow = true;

  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.06), matHood);
  hoodBack.position.set(0, 0.26, -0.22);
  hoodBack.castShadow = true;

  headGroup.add(hoodRoof, hoodSideL, hoodSideR, hoodBack);
  root.add(headGroup);

  // ==========================================
  // 6. LENGAN & DUAL BELATI CYAN MEMANJANG KE DEPAN
  // ==========================================
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;

  [-0.34, 0.34].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const arm = new THREE.Group();
    arm.name = isLeft ? 'Hunter_ArmLeft' : 'Hunter_ArmRight';
    arm.position.set(xSide, 1.42, 0);

    // Bahu baja
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), matArmor);
    shoulder.castShadow = true;
    arm.add(shoulder);

    // Lengan ditekuk ke depan
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.40, 0.14), matSuit);
    forearm.position.set(0, -0.20, 0.06);
    forearm.rotation.x = 0.32;
    forearm.castShadow = true;
    arm.add(forearm);

    // Tangan
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.12), matSkin);
    hand.position.set(0, -0.38, 0.18);
    hand.castShadow = true;
    arm.add(hand);

    // Gagang belati
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), matLeather);
    hilt.position.set(0, -0.38, 0.20);
    hilt.castShadow = true;
    arm.add(hilt);

    // Guard belati
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), matArmor);
    guard.position.set(0, -0.38, 0.28);
    guard.castShadow = true;
    arm.add(guard);

    // Bilah belati cyan memanjang ke arah depan (sumbu Z+)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.46), matGlow);
    blade.position.set(0, -0.38, 0.52);
    blade.rotation.y = isLeft ? -0.10 : 0.10;
    blade.castShadow = true;
    arm.add(blade);

    root.add(arm);

    if (isLeft) {
      armLeft = arm;
    } else {
      armRight = arm;
    }
  });

  // Simpan referensi internal pada root untuk animasi & gameplay engine
  (root as any).leftLeg = leftLegGroup;
  (root as any).rightLeg = rightLegGroup;
  (root as any).leftArm = armLeft;
  (root as any).rightArm = armRight;
  (root as any).body = torsoGroup;
  (root as any).head = headGroup;
  (root as any).cape = capeGroup;
  (root as any).chestplate = chestPlate;
  (root as any).quiver = quiver;
  (root as any).weapon = armRight;
  (root as any).leftWeapon = armLeft;

  return root;
}

/**
 * ============================================================================
 * PLAYER MESH BUILDER FOR GAME ENGINE (PlayerMeshObjects)
 * ============================================================================
 */
export function createBlockyHunterMesh(tier: number = 1): PlayerMeshObjects {
  const root = createHunterModel();
  const charClass: CharacterClass = 'rogue';

  const leftLeg = (root as any).leftLeg as THREE.Group;
  const rightLeg = (root as any).rightLeg as THREE.Group;
  const leftArm = (root as any).leftArm as THREE.Group;
  const rightArm = (root as any).rightArm as THREE.Group;
  const body = (root as any).body as THREE.Mesh;
  const head = (root as any).head as THREE.Mesh;
  const cape = (root as any).cape as THREE.Mesh;
  const weapon = (root as any).weapon as THREE.Group;
  const leftWeapon = (root as any).leftWeapon as THREE.Group;

  let hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
  };

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

  if (isMoving) {
    // Ayunan langkah kaki humanoid taktis
    const legSwing = Math.sin(walkTime * 1.2) * 0.52;
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, 0.25);
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, 0.25);
    }

    if (!isAttacking) {
      // Ayunan dinamis lengan bersiap belati
      if (playerMesh.leftArm) {
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.45 - legSwing * 0.35, 0.2);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.2);
      }
      if (playerMesh.rightArm) {
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.45 + legSwing * 0.35, 0.2);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.2);
      }
    }

    // Melambai jubah bergerigi di punggung
    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.16 - Math.abs(Math.sin(walkTime * 1.2)) * 0.18;
    }

    const walkBob = Math.abs(Math.sin(walkTime * 2.4)) * 0.04;
    playerMesh.group.position.y = playerPosY + walkBob;
    playerMesh.group.rotation.z = Math.sin(walkTime * 1.2) * 0.025;
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
      if (playerMesh.leftArm) {
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.22 + breathe * 0.3, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.15);
      }
      if (playerMesh.rightArm) {
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.22 - breathe * 0.3, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.15);
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.16 - Math.sin(walkTime * 2.0) * 0.03;
    }
  }
}
