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

  ctx.fillStyle = '#141619'; // Masker kain
  ctx.fillRect(0, 64, 128, 64);

  ctx.fillStyle = '#2b2e35';
  ctx.fillRect(0, 60, 128, 4);

  ctx.fillStyle = '#00f5ff'; // Mata cyan berpendar
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 12;
  ctx.fillRect(20, 36, 28, 14);
  ctx.fillRect(80, 36, 28, 14);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

function createSegmentedBow(matWood: THREE.Material, matString: THREE.Material): THREE.Group {
  const bow = new THREE.Group();
  bow.name = 'SegmentedBow';

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.30, 0.06), matWood);
  bow.add(handle);

  const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), matWood);
  limbTop.position.set(0, 0.26, -0.06);
  limbTop.rotation.x = -0.45;

  const limbBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), matWood);
  limbBottom.position.set(0, -0.26, -0.06);
  limbBottom.rotation.x = 0.45;

  const tipTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.04), matWood);
  tipTop.position.set(0, 0.46, 0.02);
  tipTop.rotation.x = 0.65;

  const tipBottom = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.04), matWood);
  tipBottom.position.set(0, -0.46, 0.02);
  tipBottom.rotation.x = -0.65;

  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.54, 0.08),
    new THREE.Vector3(0, 0, 0.02),
    new THREE.Vector3(0, -0.54, 0.08)
  ]);
  const bowString = new THREE.Line(stringGeo, matString);

  bow.add(limbTop, limbBottom, tipTop, tipBottom, bowString);
  return bow;
}

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // --- MATERIAL ---
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
  // 1. KAKI & SEPATU BOT
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

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.66, 0.22), matSuit);
    leg.position.set(0, -0.30, 0);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.28), matLeather);
    boot.position.set(0, -0.61, 0.03);

    legPivot.add(leg, boot);
    legGroup.add(legPivot);

    if (isLeft) leftLegGroup = legPivot;
    else rightLegGroup = legPivot;
  });
  root.add(legGroup);

  // ==========================================
  // 2. PINGGANG & SABUK
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.34), matSuit);
  pelvis.position.set(0, 0.82, 0);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.10, 0.38), matLeather);
  belt.position.set(0, 0.83, 0);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.40), matBuckle);
  buckle.position.set(0, 0.83, 0);

  [-0.32, 0.32].forEach((xPos) => {
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.12), matLeather);
    sheath.position.set(xPos, 0.72, 0);
    sheath.rotation.z = xPos < 0 ? 0.14 : -0.14;
    root.add(sheath);
  });
  root.add(pelvis, belt, buckle);

  // ==========================================
  // 3. TORSO & PLAT DADA
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'TorsoGroup';

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.34), matSuit);
  torso.position.set(0, 1.22, 0);
  torsoGroup.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.38, 0.08), matArmor);
  chestPlate.position.set(0, 1.30, 0.18);
  torsoGroup.add(chestPlate);

  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.68, 0.36), matLeather);
  strap.rotation.z = -0.55;
  strap.position.set(0, 1.22, 0.02);
  torsoGroup.add(strap);

  root.add(torsoGroup);

  // ==========================================
  // 4. JUBAH BERVOLUME MENYELIMUTI TUBUH
  // ==========================================
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'HunterCloak';
  cloakGroup.position.set(0, 1.50, -0.22);

  // Jubah belakang tebal melambai
  const backCloak = new THREE.Mesh(new THREE.BoxGeometry(0.70, 1.05, 0.05), matCloak);
  backCloak.position.set(0, -0.52, 0);
  backCloak.rotation.x = -0.16;
  cloakGroup.add(backCloak);

  // Gerigi tangga ujung jubah
  const fringe1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.05), matCloak);
  fringe1.position.set(-0.22, -1.08, 0);
  const fringe2 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.28, 0.05), matCloak);
  fringe2.position.set(0.01, -1.13, 0);
  const fringe3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.05), matCloak);
  fringe3.position.set(0.24, -1.07, 0);
  cloakGroup.add(fringe1, fringe2, fringe3);

  root.add(cloakGroup);

  // Quiver & Busur Punggung (Bertengger di luar jubah)
  const quiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.68, 0.16), matLeather);
  quiver.position.set(0.18, 1.28, -0.30);
  quiver.rotation.z = -0.50;
  root.add(quiver);

  const backBow = createSegmentedBow(matWood, matString);
  backBow.name = 'BackBow';
  backBow.position.set(-0.06, 1.25, -0.32);
  backBow.rotation.z = 0.65;
  backBow.rotation.y = Math.PI;
  root.add(backBow);

  // ==========================================
  // 5. KEPALA, KERAH TUDUNG (COWL) & TUDUNG
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'HunterHeadGroup';
  headGroup.position.set(0, 1.55, 0);

  // Kerah tudung melingkar di leher (Cowl Collar)
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.50), matCloak);
  cowl.position.set(0, -0.04, 0);
  headGroup.add(cowl);

  // Batok kepala bertekstur
  const faceTexture = createHunterFaceTexture();
  const matFace = new THREE.MeshBasicMaterial({ map: faceTexture });
  const headMaterials = [matCloak, matCloak, matCloak, matCloak, matFace, matCloak];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.46), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 0.26, 0);
  headGroup.add(headMesh);

  // Atap tudung miring
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.50), matCloak);
  visor.position.set(0, 0.50, 0.04);
  visor.rotation.x = 0.16;
  headGroup.add(visor);

  root.add(headGroup);

  // ==========================================
  // 6. LENGAN: A-POSE SEJATI & DUAL BELATI TERBUKA (FLARING OUTWARD)
  // ==========================================
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;

  [-0.38, 0.38].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const armGroup = new THREE.Group();
    armGroup.name = isLeft ? 'LeftArm' : 'RightArm';
    armGroup.position.set(xSide, 1.44, 0);

    // Pauldron Bahu
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.20), matArmor);
    armGroup.add(shoulder);

    // LENGAN ATAS & BAWAH: Membuka ke LUAR (Huruf A, BUKAN V)
    const armLimb = new THREE.Group();
    armLimb.position.set(0, 0, 0);
    // Sudut Z positif pada tangan kiri & negatif pada tangan kanan melebarkan lengan ke luar
    armLimb.rotation.z = isLeft ? 0.38 : -0.38;
    armLimb.rotation.x = 0.12; // Sedikit santai ke depan

    const limbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.14), matSuit);
    limbMesh.position.set(0, -0.24, 0);
    armLimb.add(limbMesh);

    // Telapak Tangan
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), matSuit);
    hand.position.set(0, -0.50, 0);
    armLimb.add(hand);

    // DUAL DAGGER: Posisi Terbuka ke Luar (Outward Flare Grip)
    const dagger = new THREE.Group();
    dagger.name = 'HandDagger';
    dagger.position.set(0, -0.50, 0);

    // Rotasi bilah: Menukik ke bawah-belakang dan MELEBAR TERBUKA KE LUAR
    dagger.rotation.x = 2.30;
    // Rotasi Z positif untuk tangan kiri (menjauh ke samping kiri), negatif untuk kanan (menjauh ke kanan)
    dagger.rotation.z = isLeft ? 0.55 : -0.55;
    dagger.rotation.y = isLeft ? -0.25 : 0.25;

    // Gagang belati
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), matLeather);
    hilt.position.set(0, 0, 0);

    // Guard belati
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), matArmor);
    guard.position.set(0, 0.08, 0);

    // Bilah belati cyan memanjang mencuat ke samping luar
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.50, 0.02), matCyanGlow);
    blade.position.set(0, 0.35, 0);

    dagger.add(hilt, guard, blade);
    armLimb.add(dagger);

    // Busur tangan kiri saat stance busur aktif
    if (isLeft) {
      const handBow = createSegmentedBow(matWood, matString);
      handBow.name = 'HandBow';
      handBow.position.set(0, -0.50, 0.10);
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
      playerMesh.cape.rotation.x = -0.16 - Math.abs(Math.sin(walkTime * 1.2)) * 0.14;
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
      playerMesh.cape.rotation.x = -0.16 - Math.sin(walkTime * 2.0) * 0.02;
    }
  }
}
