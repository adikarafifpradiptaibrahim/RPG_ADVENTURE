import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'HunterModel';

  // --- PALET MATERIAL ---
  const matHoodCape = new THREE.MeshStandardMaterial({ color: 0x32353b, roughness: 0.85 }); // Abu-abu arang gelap
  const matInnerSuit = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }); // Hitam taktis
  const matChestplate = new THREE.MeshStandardMaterial({ color: 0x5a606d, roughness: 0.6, metalness: 0.2 }); // Zirah plat baja kontras
  const matCrossguard = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.8, roughness: 0.25 }); // Guard baja abu-abu
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.8 }); // Sawo matang
  const matMask = new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.95 }); // Masker hitam pekat
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x422a1d, roughness: 0.8 }); // Sabuk/Sepatu cokelat
  const matBuckle = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6 }); // Gesper perak
  const matCyanGlow = new THREE.MeshStandardMaterial({ 
    color: 0xebffff, // Putih kebiruan
    emissive: 0x00f5ff, 
    emissiveIntensity: 3.0,
    roughness: 0.15,
    metalness: 0.1
  }); // Mata & Bilah Belati Cyan Terang

  // ==========================================
  // 1. KAKI & SEPATU (Y: 0.0 -> 0.85) - RAMPING & TINGGI
  // ==========================================
  const legGroup = new THREE.Group();
  
  // Kaki Kiri (Pivoted at hip Y: 0.775 for natural stride animation)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, 0.775, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.26), matInnerSuit);
  leftLeg.position.set(0, -0.325, 0); // World Y = 0.45
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.25, 0.32), matLeather);
  leftBoot.position.set(0, -0.655, 0.03); // World Y = 0.12
  leftLegPivot.add(leftLeg, leftBoot);
  legGroup.add(leftLegPivot);

  // Kaki Kanan (Pivoted at hip Y: 0.775 for natural stride animation)
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.16, 0.775, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.26), matInnerSuit);
  rightLeg.position.set(0, -0.325, 0); // World Y = 0.45
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.25, 0.32), matLeather);
  rightBoot.position.set(0, -0.655, 0.03); // World Y = 0.12
  rightLegPivot.add(rightLeg, rightBoot);
  legGroup.add(rightLegPivot);

  root.add(legGroup);

  // ==========================================
  // 2. PINGGUL & SABUK (Y: 0.80 -> 0.95)
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.20, 0.38), matInnerSuit);
  pelvis.position.set(0, 0.85, 0);
  
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.42), matLeather);
  belt.position.set(0, 0.86, 0);
  
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.44), matBuckle);
  buckle.position.set(0, 0.86, 0);
  
  root.add(pelvis, belt, buckle);

  // ==========================================
  // 3. BADAN / TORSO & PLAT DADA (Y: 0.95 -> 1.55)
  // ==========================================
  const torsoGroup = new THREE.Group();
  
  // Badan Utama
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.60, 0.36), matInnerSuit);
  torso.position.set(0, 1.25, 0);
  torsoGroup.add(torso);

  // Plat Zirah Dada Abu-abu Kontras (Dada Atas)
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.36, 0.10), matChestplate);
  chestPlate.position.set(0, 1.34, 0.16);
  torsoGroup.add(chestPlate);

  // Tali Selempang Kulit Diagonal
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.62, 0.38), matLeather);
  strap.rotation.z = -0.55;
  strap.position.set(0, 1.25, 0.02);
  torsoGroup.add(strap);

  // ==========================================
  // 4. JUBAH BERGERIGI TANGGA (CAPE)
  // ==========================================
  const capeGroup = new THREE.Group();
  capeGroup.position.set(0, 1.48, -0.20);
  capeGroup.rotation.x = -0.16; // Miring melambai ke belakang

  const capeMain = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.04), matHoodCape);
  capeMain.position.set(0, -0.375, 0);
  capeGroup.add(capeMain);

  // Gerigi Tangga Bawah Jubah
  const fringe1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), matHoodCape);
  fringe1.position.set(-0.20, -0.82, 0);
  const fringe2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.04), matHoodCape);
  fringe2.position.set(0.02, -0.86, 0);
  const fringe3 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.04), matHoodCape);
  fringe3.position.set(0.20, -0.80, 0);
  capeGroup.add(fringe1, fringe2, fringe3);

  torsoGroup.add(capeGroup);

  // Tabung Panah (Quiver) di Punggung
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.70, 0.20), matLeather);
  quiver.position.set(0.18, 1.30, -0.28);
  quiver.rotation.z = -0.45;
  torsoGroup.add(quiver);

  root.add(torsoGroup);

  // ==========================================
  // 5. KEPALA, TUDUNG ROGUE LANCIP & MASKER (Y: 1.55 -> 2.05)
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.55, 0);

  // Leher
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), matSkin);
  neck.position.set(0, 0.06, 0);
  headGroup.add(neck);

  // Batok Kepala Dalam
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.44), matSkin);
  head.position.set(0, 0.32, 0);
  headGroup.add(head);

  // Masker Wajah Padat
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.18, 0.20), matMask);
  mask.position.set(0, 0.25, 0.16);
  headGroup.add(mask);

  // Mata Cyan Bercahaya
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.04), matCyanGlow);
  eyeL.position.set(-0.12, 0.37, 0.23);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.04), matCyanGlow);
  eyeR.position.set(0.12, 0.37, 0.23);
  headGroup.add(eyeL, eyeR);

  // --- TUDUNG ROGUE BERSUDUT LANCIP (PEAKED HOOD) ---
  // 1. Atap Tudung Miring (Peaked Top): BoxGeometry(0.54, 0.16, 0.58) rotation.x = 0.22 di [0, 0.52, 0.05]
  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.58), matHoodCape);
  hoodTop.position.set(0, 0.52, 0.05);
  hoodTop.rotation.x = 0.22;
  hoodTop.castShadow = true;

  // 2. Puncak Lancip Tengah (Crest Ridge): BoxGeometry(0.12, 0.10, 0.50) aksen lipatan meruncing
  const hoodRidge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.50), matHoodCape);
  hoodRidge.position.set(0, 0.58, 0.05);
  hoodRidge.rotation.x = 0.22;
  hoodRidge.castShadow = true;

  // 3. Pelindung Dahi / Visor Shade: BoxGeometry(0.48, 0.08, 0.16) di [0, 0.44, 0.22]
  const hoodVisor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.16), matHoodCape);
  hoodVisor.position.set(0, 0.44, 0.22);
  hoodVisor.rotation.x = 0.20;
  hoodVisor.castShadow = true;

  // 4. Sisi Samping Kiri & Kanan Tudung Ramping: BoxGeometry(0.06, 0.44, 0.52) di [-0.24, 0.28, 0] dan [0.24, 0.28, 0]
  const hoodSideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.52), matHoodCape);
  hoodSideL.position.set(-0.24, 0.28, 0);
  hoodSideL.castShadow = true;

  const hoodSideR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.52), matHoodCape);
  hoodSideR.position.set(0.24, 0.28, 0);
  hoodSideR.castShadow = true;

  // 5. Belakang Tudung
  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.08), matHoodCape);
  hoodBack.position.set(0, 0.28, -0.24);
  hoodBack.castShadow = true;

  headGroup.add(hoodTop, hoodRidge, hoodVisor, hoodSideL, hoodSideR, hoodBack);
  root.add(headGroup);

  // ==========================================
  // 6. LENGAN, PUNDAK RAMPING & SEPASANG BELATI CYAN GAGAH
  // ==========================================
  function createArm(isLeft: boolean): THREE.Group {
    const arm = new THREE.Group();
    const sign = isLeft ? -1 : 1;

    // Pauldron bahu ramping atletis [0.20, 0.18, 0.24]
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.24), matChestplate);
    shoulder.position.set(0, 0, 0);
    shoulder.rotation.z = sign * 0.10;
    shoulder.castShadow = true;

    // Lengan atas & bawah
    const limb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.50, 0.18), matInnerSuit);
    limb.position.set(0, -0.25, 0);
    limb.castShadow = true;

    // Telapak tangan
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), matSkin);
    hand.position.set(0, -0.54, 0);
    hand.castShadow = true;

    // --- SEPASANG BELATI CYAN GAGAH (CYAN DAGGERS) ---
    const daggerGroup = new THREE.Group();
    daggerGroup.position.set(sign * 0.02, -0.54, 0.04);
    daggerGroup.rotation.y = sign * 0.15; // Serong sedikit ke luar

    // Gagang Belati (Grip) [0.06, 0.18, 0.06] melintang di telapak tangan
    const daggerGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), matLeather);
    daggerGrip.position.set(0, 0, 0);
    daggerGrip.castShadow = true;

    // Crossguard (Pelindung Tangan) [0.16, 0.04, 0.08] warna abu-abu baja (#6b7280)
    const daggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.08), matCrossguard);
    daggerGuard.position.set(0, 0, 0.06);
    daggerGuard.castShadow = true;

    // Bilah Belati Cyan (Luminous Blade) [0.08, 0.48, 0.02] mencuat ke depan (offset Z: +0.28)
    const daggerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.02), matCyanGlow);
    daggerBlade.position.set(0, 0, 0.28);
    daggerBlade.rotation.x = Math.PI / 2;
    daggerBlade.castShadow = true;

    // Ujung Runcing Bilah (Drop-point tip)
    const daggerTip = new THREE.Mesh(new THREE.ConeGeometry(0.056, 0.12, 4), matCyanGlow);
    daggerTip.position.set(0, 0, 0.52);
    daggerTip.rotation.x = Math.PI / 2;
    daggerTip.rotateZ(Math.PI / 4);

    daggerGroup.add(daggerGrip, daggerGuard, daggerBlade, daggerTip);

    arm.add(shoulder, limb, hand, daggerGroup);
    // Posisi sendi pundak merapat ke torso: dari ±0.44 menjadi ±0.36
    arm.position.set(sign * 0.36, 1.44, 0);
    return arm;
  }

  const armL = createArm(true);
  const armR = createArm(false);
  root.add(armL, armR);

  // Simpan referensi internal pada root untuk kebutuhan gameplay & animasi
  (root as any).leftLeg = leftLegPivot;
  (root as any).rightLeg = rightLegPivot;
  (root as any).leftArm = armL;
  (root as any).rightArm = armR;
  (root as any).body = torsoGroup;
  (root as any).head = headGroup;
  (root as any).cape = capeGroup;
  (root as any).chestplate = chestPlate;
  (root as any).weapon = armR;
  (root as any).leftWeapon = armL;

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

  // Stance Swapping: Dagger vs Bow
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
      color: 0x00f5ff,
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
        color: 0x00f5ff,
        emissive: 0x00f5ff,
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
    const legSwing = Math.sin(walkTime * 1.2) * 0.52;
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, 0.25);
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, 0.25);
    }

    if (!isAttacking) {
      if (playerMesh.leftArm) {
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.45 - legSwing * 0.35, 0.2);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.2);
      }
      if (playerMesh.rightArm) {
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.45 + legSwing * 0.35, 0.2);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.2);
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.16 - Math.abs(Math.sin(walkTime * 1.2)) * 0.18;
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
      if (playerMesh.leftArm) {
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.20 + breathe * 0.3, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.15);
      }
      if (playerMesh.rightArm) {
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.20 - breathe * 0.3, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.15);
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.16 - Math.sin(walkTime * 2.0) * 0.03;
    }
  }
}
