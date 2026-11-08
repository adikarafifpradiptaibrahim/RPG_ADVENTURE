import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // --- PALET MATERIAL ---
  const matSuit = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.85 }); // Kain hitam taktis
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x4f545e, roughness: 0.5, metalness: 0.25 }); // Plat baja abu-abu
  const matHood = new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.9 }); // Tudung & jubah gelap
  const matMask = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.95 }); // Masker solid
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x3d2618, roughness: 0.8 }); // Kulit cokelat
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.0,
    roughness: 0.2,
  });

  // ==========================================
  // 1. KAKI & SEPATU (Tinggi: 0.0 - 0.82)
  // ==========================================
  const legs = new THREE.Group();
  let leftLegGroup: THREE.Group | undefined;
  let rightLegGroup: THREE.Group | undefined;

  [-0.14, 0.14].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    // Leg pivot at hip (Y: 0.75) for smooth walking animation
    const legPivot = new THREE.Group();
    legPivot.position.set(xPos, 0.75, 0);

    // Paha & Kaki (center Y: 0.44 world -> -0.31 local)
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.62, 0.22), matSuit);
    leg.position.set(0, -0.31, 0);
    leg.castShadow = true;

    // Sepatu Bot (center Y: 0.12 world -> -0.63 local)
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.28), matLeather);
    boot.position.set(0, -0.63, 0.03);
    boot.castShadow = true;

    legPivot.add(leg, boot);
    legs.add(legPivot);

    if (isLeft) {
      leftLegGroup = legPivot;
    } else {
      rightLegGroup = legPivot;
    }
  });
  root.add(legs);

  // ==========================================
  // 2. PINGGANG & SABUK (Tinggi: 0.78 - 0.92)
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.32), matSuit);
  pelvis.position.set(0, 0.82, 0);
  pelvis.castShadow = true;

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.10, 0.36), matLeather);
  belt.position.set(0, 0.83, 0);
  belt.castShadow = true;

  // Kantong amunisi kecil di pinggang depan
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.08), matLeather);
  pouchL.position.set(-0.16, 0.83, 0.19);
  pouchL.castShadow = true;

  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.08), matLeather);
  pouchR.position.set(0.16, 0.83, 0.19);
  pouchR.castShadow = true;

  root.add(pelvis, belt, pouchL, pouchR);

  // ==========================================
  // 3. TORSO & ZIRAH PLAT DADA (Tinggi: 0.90 - 1.50)
  // ==========================================
  const torsoGroup = new THREE.Group();
  
  // Tubuh utama
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.32), matSuit);
  torso.position.set(0, 1.20, 0);
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Plat Zirah Dada Abu-abu Kontras (Depan)
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.08), matArmor);
  chestPlate.position.set(0, 1.28, 0.18);
  chestPlate.castShadow = true;
  torsoGroup.add(chestPlate);

  // Selempang Sabuk Bahu Diagonal
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.35), matLeather);
  strap.rotation.z = -0.58;
  strap.position.set(0, 1.20, 0.02);
  strap.castShadow = true;
  torsoGroup.add(strap);

  // ==========================================
  // 4. JUBAH BERGERIGI BELAKANG (CAPE)
  // ==========================================
  const cape = new THREE.Group();
  cape.position.set(0, 1.45, -0.17);
  cape.rotation.x = -0.15; // Melambai ke belakang

  const capeSheet = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.70, 0.03), matHood);
  capeSheet.position.set(0, -0.35, 0);
  capeSheet.castShadow = true;
  cape.add(capeSheet);

  // Ujung Tangga Gerigi Bawah
  const stepL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), matHood);
  stepL.position.set(-0.16, -0.76, 0);
  stepL.castShadow = true;

  const stepM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.03), matHood);
  stepM.position.set(0.02, -0.80, 0);
  stepM.castShadow = true;

  const stepR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.03), matHood);
  stepR.position.set(0.18, -0.74, 0);
  stepR.castShadow = true;

  cape.add(stepL, stepM, stepR);
  torsoGroup.add(cape);

  // Tabung Panah (Quiver) di Punggung
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), matLeather);
  quiver.position.set(0.14, 1.25, -0.24);
  quiver.rotation.z = -0.50;
  quiver.castShadow = true;
  torsoGroup.add(quiver);

  root.add(torsoGroup);

  // ==========================================
  // 5. KEPALA, TUDUNG LANCIP & MASKER RAPAT
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.50, 0);

  // Leher solid
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.20), matSuit);
  neck.position.set(0, 0.06, 0);
  neck.castShadow = true;
  headGroup.add(neck);

  // Masker Hitam Menutup Penuh Dagu ke Hidung
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.38), matMask);
  mask.position.set(0, 0.22, 0.04);
  mask.castShadow = true;
  headGroup.add(mask);

  // Mata Bercahaya Cyan
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.03), matGlow);
  eyeL.position.set(-0.10, 0.34, 0.22);

  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.03), matGlow);
  eyeR.position.set(0.10, 0.34, 0.22);
  headGroup.add(eyeL, eyeR);

  // Tudung Bersiku Lancip (Hood Assembly)
  const hoodRoof = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.50), matHood);
  hoodRoof.position.set(0, 0.44, 0.02);
  hoodRoof.rotation.x = 0.18; // Miring ke depan menaungi mata
  hoodRoof.castShadow = true;

  const hoodL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.46), matHood);
  hoodL.position.set(-0.23, 0.26, 0.02);
  hoodL.castShadow = true;

  const hoodR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.46), matHood);
  hoodR.position.set(0.23, 0.26, 0.02);
  hoodR.castShadow = true;

  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.06), matHood);
  hoodBack.position.set(0, 0.26, -0.20);
  hoodBack.castShadow = true;

  headGroup.add(hoodRoof, hoodL, hoodR, hoodBack);
  root.add(headGroup);

  // ==========================================
  // 6. LENGAN & SEPASANG BELATI CYAN MEMANJANG KE DEPAN
  // ==========================================
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;

  [-0.34, 0.34].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const arm = new THREE.Group();
    arm.position.set(xSide, 1.42, 0);

    // Bahu Plat Baja
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), matArmor);
    shoulder.position.set(0, 0, 0);
    shoulder.castShadow = true;
    arm.add(shoulder);

    // Lengan Bawah Menekuk Maju
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), matSuit);
    forearm.position.set(0, -0.22, 0.05);
    forearm.rotation.x = 0.35; // Lengan ditekuk ke depan
    forearm.castShadow = true;
    arm.add(forearm);

    // Tangan
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.12), matSuit);
    hand.position.set(0, -0.42, 0.16);
    hand.castShadow = true;
    arm.add(hand);

    // Gagang Belati (Horisontal di genggaman)
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), matLeather);
    hilt.position.set(0, -0.42, 0.20);
    hilt.castShadow = true;
    arm.add(hilt);

    // Guard Belati
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), matArmor);
    guard.position.set(0, -0.42, 0.28);
    guard.castShadow = true;
    arm.add(guard);

    // Bilah Belati Cyan Mencuat Lurus ke Depan
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.42), matGlow);
    blade.position.set(0, -0.42, 0.50);
    blade.rotation.y = isLeft ? -0.15 : 0.15; // Sedikit menyerong keluar
    blade.castShadow = true;
    arm.add(blade);

    root.add(arm);

    if (isLeft) {
      armLeft = arm;
    } else {
      armRight = arm;
    }
  });

  // Simpan referensi internal pada root untuk kebutuhan gameplay & animasi
  (root as any).leftLeg = leftLegGroup;
  (root as any).rightLeg = rightLegGroup;
  (root as any).leftArm = armLeft;
  (root as any).rightArm = armRight;
  (root as any).body = torsoGroup;
  (root as any).head = headGroup;
  (root as any).cape = cape;
  (root as any).chestplate = chestPlate;
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
      playerMesh.cape.rotation.x = -0.15 - Math.abs(Math.sin(walkTime * 1.2)) * 0.18;
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
      playerMesh.cape.rotation.x = -0.15 - Math.sin(walkTime * 2.0) * 0.03;
    }
  }
}
