import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

// 1. Generator Tekstur Wajah Canvas 2D (Anti-Bug & Anti-Void)
function createHunterFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Kulit Sawo Matang (Dahi & Area Mata)
  ctx.fillStyle = '#c68642';
  ctx.fillRect(0, 0, 128, 128);

  // Masker Kain Hitam-Abu (Menutup hidung hingga dagu)
  ctx.fillStyle = '#141619';
  ctx.fillRect(0, 64, 128, 64);

  // Jahitan Pembatas Masker
  ctx.fillStyle = '#2b2e35';
  ctx.fillRect(0, 60, 128, 4);

  // Mata Cyan Bercahaya
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

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // --- MATERIAL DEFINITIONS ---
  const matSuit = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.85 });
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x545a66, roughness: 0.5, metalness: 0.25 });
  const matHoodCape = new THREE.MeshStandardMaterial({ color: 0x292c33, roughness: 0.9, side: THREE.DoubleSide });
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x3d2618, roughness: 0.8 });
  const matBuckle = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6 });
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.2,
    roughness: 0.2
  });

  // ==========================================
  // 1. KAKI & SEPATU BOT (Y: 0.0 -> 0.82)
  // ==========================================
  const legGroup = new THREE.Group();
  [-0.14, 0.14].forEach((xPos) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.60, 0.22), matSuit);
    leg.position.set(xPos, 0.44, 0);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.28), matLeather);
    boot.position.set(xPos, 0.12, 0.03);

    legGroup.add(leg, boot);
  });
  root.add(legGroup);

  // ==========================================
  // 2. PINGGANG, SABUK & SARUNG BELATI (Y: 0.78 -> 0.92)
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.32), matSuit);
  pelvis.position.set(0, 0.82, 0);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.10, 0.36), matLeather);
  belt.position.set(0, 0.83, 0);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.38), matBuckle);
  buckle.position.set(0, 0.83, 0);

  // Sarung Belati Samping Paha
  [-0.30, 0.30].forEach((xPos) => {
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.12), matLeather);
    sheath.position.set(xPos, 0.74, 0);
    sheath.rotation.z = xPos < 0 ? 0.12 : -0.12;
    root.add(sheath);
  });

  root.add(pelvis, belt, buckle);

  // ==========================================
  // 3. TORSO & ZIRAH DADA (Y: 0.90 -> 1.50)
  // ==========================================
  const torsoGroup = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.32), matSuit);
  torso.position.set(0, 1.20, 0);
  torsoGroup.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.08), matArmor);
  chestPlate.position.set(0, 1.28, 0.18);
  torsoGroup.add(chestPlate);

  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.35), matLeather);
  strap.rotation.z = -0.58;
  strap.position.set(0, 1.20, 0.02);
  torsoGroup.add(strap);

  root.add(torsoGroup);

  // ==========================================
  // 4. JUBAH BERGERIGI TANGGA (LANGSUNG KE ROOT)
  // ==========================================
  const capeGroup = new THREE.Group();
  capeGroup.name = 'HunterCapeDirect';
  capeGroup.position.set(0, 1.45, -0.20);
  capeGroup.rotation.x = -0.16;

  const capeMain = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.76, 0.03), matHoodCape);
  capeMain.position.set(0, -0.38, 0);
  capeGroup.add(capeMain);

  // 3 Gerigi Tangga Bawah
  const fringeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.03), matHoodCape);
  fringeL.position.set(-0.18, -0.83, 0);
  const fringeM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.03), matHoodCape);
  fringeM.position.set(0.01, -0.87, 0);
  const fringeR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.03), matHoodCape);
  fringeR.position.set(0.19, -0.81, 0);
  capeGroup.add(fringeL, fringeM, fringeR);

  root.add(capeGroup);

  // Tabung Panah di Luar Jubah
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), matLeather);
  quiver.position.set(0.14, 1.25, -0.28);
  quiver.rotation.z = -0.50;
  quiver.rotation.x = -0.10;
  root.add(quiver);

  // ==========================================
  // 5. KEPALA DENGAN TEKSTUR KANVAS 2D
  // ==========================================
  const faceTexture = createHunterFaceTexture();
  const matFace = new THREE.MeshBasicMaterial({ map: faceTexture });

  // [kanan, kiri, atas, bawah, DEPAN, belakang]
  const headMaterials = [
    matHoodCape,
    matHoodCape,
    matHoodCape,
    matHoodCape,
    matFace,
    matHoodCape
  ];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.46), headMaterials);
  headMesh.position.set(0, 1.74, 0);
  root.add(headMesh);

  // Visor / Atap Tudung Miring
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.50), matHoodCape);
  visor.position.set(0, 1.99, 0.04);
  visor.rotation.x = 0.16;
  root.add(visor);

  // ==========================================
  // 6. LENGAN & SEPASANG BELATI CYAN KE DEPAN
  // ==========================================
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;

  [-0.34, 0.34].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const arm = new THREE.Group();
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

    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), matLeather);
    hilt.position.set(0, -0.38, 0.20);
    arm.add(hilt);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), matArmor);
    guard.position.set(0, -0.38, 0.28);
    arm.add(guard);

    // Bilah belati panjang ke depan (Z+)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.46), matGlow);
    blade.position.set(0, -0.38, 0.52);
    blade.rotation.y = isLeft ? -0.10 : 0.10;
    arm.add(blade);

    root.add(arm);

    if (isLeft) {
      armLeft = arm;
    } else {
      armRight = arm;
    }
  });

  // Simpan referensi internal pada root untuk kebutuhan gameplay & animasi
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
