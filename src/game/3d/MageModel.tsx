import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * CONFIGURATION & SAFETY ROLLBACK TOGGLE
 * ============================================================================
 * Jika USE_LEGACY_MAGE bernilai true: Game akan menggunakan model lama dari backup.
 * Jika USE_LEGACY_MAGE bernilai false: Game menggunakan model Blocky Faceted Low-Poly baru
 * yang dirancang persis sesuai lembar referensi turnaround 6-sudut (Front, Back, Left, Right, 3/4).
 */
export const USE_LEGACY_MAGE = false;
export { createLegacyMageMesh } from './MageModel_v1_backup';

/**
 * ============================================================================
 * PRELOADED GEOMETRY & MATERIAL PALETTE (Zero-Lag & Object Pooling)
 * ============================================================================
 * Mengacu persis pada lembar referensi turnaround karakter Mage:
 * - Tunic & Rok Hem: Ungu Kerajaan (#6B21A8)
 * - Rompi Dada V-Taper: Kulit Cokelat Tua (#78350F)
 * - Sabuk & Bot: Cokelat Tua (#4A2E18 & #78350F)
 * - Lis Emas, Gesper, Cincin Tongkat & Brim Trim: Emas Murni (#EAB308 / #D4A017)
 * - Pauldron Pundak: Balok Prisma Abu-abu Metalik (#9CA3AF) berlis emas kaku
 * - Jubah Luar Belakang (Cape): Merah Marun (#831843) memanjang lurus ke bawah
 * - Mata: Celah Biru Neon (#00F0FF) bersinar tanpa pupil
 * - Kristal Tongkat: Kristal Icosahedron Bersinar Cyan (#00F0FF / Emissive #00E5FF)
 * - Grimoire: Kitab marun (#831843) dengan lis emas & halaman kertas (#FEF08A)
 */

interface BlockyMageMaterialPalette {
  tunicPurpleMat: THREE.MeshLambertMaterial; // #6B21A8
  vestBrownMat: THREE.MeshLambertMaterial; // #78350F
  beltDarkMat: THREE.MeshLambertMaterial; // #4A2E18
  goldTrimMat: THREE.MeshStandardMaterial; // #EAB308 / #D4A017
  capeMaroonMat: THREE.MeshLambertMaterial; // #831843
  pauldronGrayMat: THREE.MeshStandardMaterial; // #9CA3AF
  skinPeachMat: THREE.MeshLambertMaterial; // #FFD180
  eyesCyanGlowMat: THREE.MeshBasicMaterial; // #00F0FF
  staffShaftMat: THREE.MeshLambertMaterial; // #581C87
  crystalCyanMat: THREE.MeshStandardMaterial; // #00F0FF + Emissive
  grimoireCoverMat: THREE.MeshLambertMaterial; // #831843
  grimoirePagesMat: THREE.MeshLambertMaterial; // #FEF08A
  kneeGrayMat: THREE.MeshStandardMaterial; // #9CA3AF
  bootBrownMat: THREE.MeshStandardMaterial; // #78350F
  soleMat: THREE.MeshStandardMaterial; // #2B1407
}

let cachedMaterials: BlockyMageMaterialPalette | null = null;

function getMageMaterials(tier: number): BlockyMageMaterialPalette {
  if (!cachedMaterials) {
    cachedMaterials = {
      // 1. Tunic Ungu Kerajaan (#6B21A8)
      tunicPurpleMat: new THREE.MeshLambertMaterial({
        color: 0x6B21A8,
        flatShading: true,
      }),
      // 2. Rompi Dada Kulit Cokelat Tua (#78350F)
      vestBrownMat: new THREE.MeshLambertMaterial({
        color: 0x78350F,
        flatShading: true,
      }),
      // 3. Sabuk Cokelat Tua (#4A2E18)
      beltDarkMat: new THREE.MeshLambertMaterial({
        color: 0x4A2E18,
        flatShading: true,
      }),
      // 4. Lis Emas Murni (#EAB308)
      goldTrimMat: new THREE.MeshStandardMaterial({
        color: 0xEAB308,
        metalness: 0.85,
        roughness: 0.22,
        emissive: 0x996B08,
        emissiveIntensity: 0.25,
        flatShading: true,
      }),
      // 5. Jubah Luar Belakang Merah Marun (#831843)
      capeMaroonMat: new THREE.MeshLambertMaterial({
        color: 0x831843,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      // 6. Pauldron Pundak Abu-abu Metalik (#9CA3AF)
      pauldronGrayMat: new THREE.MeshStandardMaterial({
        color: 0x9CA3AF,
        metalness: 0.65,
        roughness: 0.30,
        flatShading: true,
      }),
      // 7. Kulit Peach (#FFD180)
      skinPeachMat: new THREE.MeshLambertMaterial({
        color: 0xFFD180,
        flatShading: true,
      }),
      // 8. Celah Mata Biru Neon (#00F0FF)
      eyesCyanGlowMat: new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
      }),
      // 9. Batang Tongkat Sihir (#581C87)
      staffShaftMat: new THREE.MeshLambertMaterial({
        color: 0x581C87,
        flatShading: true,
      }),
      // 10. Kristal Tongkat Cyan Bersinar (#00F0FF)
      crystalCyanMat: new THREE.MeshStandardMaterial({
        color: 0x00F0FF,
        emissive: 0x00E5FF,
        emissiveIntensity: 1.25,
        roughness: 0.15,
        metalness: 0.3,
        flatShading: true,
      }),
      // 11. Sampul Kitab Grimoire (#831843)
      grimoireCoverMat: new THREE.MeshLambertMaterial({
        color: 0x831843,
        flatShading: true,
      }),
      // 12. Lembaran Kertas Grimoire (#FEF08A)
      grimoirePagesMat: new THREE.MeshLambertMaterial({
        color: 0xFEF08A,
        flatShading: true,
      }),
      // 13. Pelindung Lutut (#9CA3AF)
      kneeGrayMat: new THREE.MeshStandardMaterial({
        color: 0x9CA3AF,
        metalness: 0.60,
        roughness: 0.35,
        flatShading: true,
      }),
      // 14. Sepatu Bot Cokelat (#78350F)
      bootBrownMat: new THREE.MeshStandardMaterial({
        color: 0x78350F,
        metalness: 0.20,
        roughness: 0.75,
        flatShading: true,
      }),
      // 15. Sol Sepatu Bot (#2B1407)
      soleMat: new THREE.MeshStandardMaterial({
        color: 0x2B1407,
        metalness: 0.10,
        roughness: 0.90,
        flatShading: true,
      }),
    };
  }

  // Tier 3+ Archmage Gilded Enhancements
  if (tier >= 3) {
    cachedMaterials.goldTrimMat.emissiveIntensity = 0.55;
    cachedMaterials.crystalCyanMat.emissiveIntensity = tier >= 5 ? 1.8 : 1.45;
  } else {
    cachedMaterials.goldTrimMat.emissiveIntensity = 0.25;
    cachedMaterials.crystalCyanMat.emissiveIntensity = 1.25;
  }

  return cachedMaterials;
}

// 2. Preloaded Geometries Cache
interface BlockyMageGeometryPalette {
  headGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  // Wizard Hat
  hatBrimGeo: THREE.BufferGeometry;
  hatBrimTrimGeo: THREE.BufferGeometry;
  hatBandGeo: THREE.BufferGeometry;
  hatConeGeo: THREE.BufferGeometry;
  // Torso & Armor
  torsoChestGeo: THREE.BufferGeometry;
  torsoVestGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  skirtHemGeo: THREE.BufferGeometry;
  capeGeo: THREE.BufferGeometry;
  // Pauldrons
  pauldronDomeGeo: THREE.BufferGeometry;
  pauldronTrimGeo: THREE.BufferGeometry;
  // Limbs
  armUpperGeo: THREE.BufferGeometry;
  armForearmGeo: THREE.BufferGeometry;
  wristTrimGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  // Legs & Boots
  thighGeo: THREE.BufferGeometry;
  kneeBandGeo: THREE.BufferGeometry;
  shinGeo: THREE.BufferGeometry;
  bootAnkleGeo: THREE.BufferGeometry;
  bootToeGeo: THREE.BufferGeometry;
  bootSoleGeo: THREE.BufferGeometry;
  // Staff
  staffShaftGeo: THREE.BufferGeometry;
  staffCollarGeo: THREE.BufferGeometry;
  staffRingHeadGeo: THREE.BufferGeometry;
  staffCrystalGeo: THREE.BufferGeometry;
  // Grimoire
  grimoireCoverGeo: THREE.BufferGeometry;
  grimoirePagesGeo: THREE.BufferGeometry;
  grimoireSpineGeo: THREE.BufferGeometry;
  grimoireGoldRuneGeo: THREE.BufferGeometry;
}

let cachedGeometries: BlockyMageGeometryPalette | null = null;

function getMageGeometries(): BlockyMageGeometryPalette {
  if (!cachedGeometries) {
    // 1. Topi Penyihir: Brim silinder datar berlis emas keliling & kerucut piramida bersih
    const hatBrimGeo = new THREE.CylinderGeometry(0.55, 0.58, 0.06, 6);
    const hatBrimTrimGeo = new THREE.CylinderGeometry(0.585, 0.595, 0.02, 6);
    const hatBandGeo = new THREE.CylinderGeometry(0.382, 0.39, 0.06, 6);

    // Kerucut Piramida Bersih (Clean 4-sided Pyramid Cone: radius 0.38, height 0.75, radialSegments 4)
    const hatConeGeo = new THREE.ConeGeometry(0.38, 0.75, 4);
    hatConeGeo.translate(0, 0.375, 0); // Base at y=0, peak at y=0.75

    // 2. Pauldrons: Balok prisma abu-abu metalik berlis emas kaku (identik dengan Knight)
    const pauldronDomeGeo = new THREE.BoxGeometry(0.28, 0.16, 0.28);
    const pauldronTrimGeo = new THREE.BoxGeometry(0.30, 0.04, 0.30);

    // 3. Torso Vest V-Taper: Panel pelindung dada kulit cokelat dengan sudut V di bawah
    const vestShape = new THREE.Shape();
    vestShape.moveTo(-0.35, 0.23);
    vestShape.lineTo(0.35, 0.23);
    vestShape.lineTo(0.35, -0.10);
    vestShape.lineTo(0, -0.24); // V-point meruncing ke arah gesper sabuk
    vestShape.lineTo(-0.35, -0.10);
    vestShape.closePath();
    const torsoVestGeo = new THREE.ExtrudeGeometry(vestShape, {
      depth: 0.06,
      bevelEnabled: false,
    });
    torsoVestGeo.center();

    // 4. Jubah Luar Belakang (Cape): Datar memanjang lurus ke bawah tanpa gelombang kain
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.32, 0); // Atas kiri (di antara kedua bahu)
    capeShape.lineTo(0.32, 0);  // Atas kanan
    capeShape.lineTo(0.38, -1.18); // Bawah kanan
    capeShape.lineTo(-0.38, -1.18); // Bawah kiri
    capeShape.closePath();
    const capeGeo = new THREE.ExtrudeGeometry(capeShape, {
      depth: 0.02,
      bevelEnabled: false,
    });
    capeGeo.center();

    // 5. Staff: Silinder bersegi ungu tua dengan hiasan puncak cincin emas & kristal bersinar
    const staffShaftGeo = new THREE.CylinderGeometry(0.032, 0.038, 1.82, 6);
    staffShaftGeo.translate(0, 0.30, 0);

    const staffCollarGeo = new THREE.CylinderGeometry(0.052, 0.045, 0.10, 6);
    const staffRingHeadGeo = new THREE.TorusGeometry(0.17, 0.032, 6, 16);
    staffRingHeadGeo.rotateX(Math.PI / 2);
    const staffCrystalGeo = new THREE.IcosahedronGeometry(0.11, 0);

    // 6. Grimoire: Kitab sihir balok datar tipis marun berlis emas
    const grimoireCoverGeo = new THREE.BoxGeometry(0.08, 0.36, 0.26);
    const grimoirePagesGeo = new THREE.BoxGeometry(0.065, 0.33, 0.23);
    const grimoireSpineGeo = new THREE.BoxGeometry(0.085, 0.365, 0.035);
    const grimoireGoldRuneGeo = new THREE.BoxGeometry(0.088, 0.12, 0.12);

    cachedGeometries = {
      headGeo: new THREE.BoxGeometry(0.46, 0.46, 0.46),
      eyeGeo: new THREE.BoxGeometry(0.08, 0.045, 0.03),
      hatBrimGeo,
      hatBrimTrimGeo,
      hatBandGeo,
      hatConeGeo,
      torsoChestGeo: new THREE.BoxGeometry(0.66, 0.78, 0.42),
      torsoVestGeo,
      beltGeo: new THREE.BoxGeometry(0.72, 0.12, 0.46),
      buckleGeo: new THREE.BoxGeometry(0.18, 0.15, 0.48),
      skirtHemGeo: new THREE.BoxGeometry(0.68, 0.20, 0.44),
      capeGeo,
      pauldronDomeGeo,
      pauldronTrimGeo,
      armUpperGeo: new THREE.BoxGeometry(0.22, 0.34, 0.22),
      armForearmGeo: new THREE.BoxGeometry(0.20, 0.28, 0.20),
      wristTrimGeo: new THREE.BoxGeometry(0.215, 0.04, 0.215),
      handGeo: new THREE.BoxGeometry(0.13, 0.13, 0.15),
      thighGeo: new THREE.BoxGeometry(0.24, 0.38, 0.24),
      kneeBandGeo: new THREE.BoxGeometry(0.26, 0.09, 0.26),
      shinGeo: new THREE.BoxGeometry(0.23, 0.28, 0.23),
      bootAnkleGeo: new THREE.BoxGeometry(0.25, 0.18, 0.26),
      bootToeGeo: new THREE.BoxGeometry(0.25, 0.14, 0.14),
      bootSoleGeo: new THREE.BoxGeometry(0.27, 0.04, 0.38),
      staffShaftGeo,
      staffCollarGeo,
      staffRingHeadGeo,
      staffCrystalGeo,
      grimoireCoverGeo,
      grimoirePagesGeo,
      grimoireSpineGeo,
      grimoireGoldRuneGeo,
    };
  }

  return cachedGeometries;
}

/**
 * ============================================================================
 * CONSTRUCT HEROIC MAGE MESH (Turnaround Accurate Low-Poly)
 * ============================================================================
 */
export function createHeroicMageMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'mage';

  const mats = getMageMaterials(tier);
  const geos = getMageGeometries();

  // 1. Root Group & Torso (mageRef)
  // Body Mesh (Hitbox & Root Anchor)
  const body = new THREE.Mesh(geos.torsoChestGeo, mats.tunicPurpleMat);
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // Panel Pelindung Dada Datar dari Balok Cokelat Tua (#78350F)
  const vestMesh = new THREE.Mesh(geos.torsoVestGeo, mats.vestBrownMat);
  vestMesh.position.set(0, 0.06, 0.21);
  vestMesh.castShadow = true;
  body.add(vestMesh);

  // Sabuk Persegi Kaku Cokelat Bergesper Emas
  const beltMesh = new THREE.Mesh(geos.beltGeo, mats.beltDarkMat);
  beltMesh.position.set(0, -0.32, 0);
  body.add(beltMesh);

  const buckleMesh = new THREE.Mesh(geos.buckleGeo, mats.goldTrimMat);
  buckleMesh.position.set(0, -0.32, 0.01);
  body.add(buckleMesh);

  // Bagian Rok Tunic Bawah (Skirt Hem / Tassets)
  const skirtMesh = new THREE.Mesh(geos.skirtHemGeo, mats.tunicPurpleMat);
  skirtMesh.position.set(0, -0.46, 0);
  skirtMesh.castShadow = true;
  body.add(skirtMesh);

  // 2. Jubah Luar di Bagian Belakang (Cape): Merah Marun (#831843)
  // Memanjang lurus ke bawah tanpa lipatan atau gelombang kain
  const cape = new THREE.Mesh(geos.capeGeo, mats.capeMaroonMat);
  cape.position.set(0, 1.25, -0.23);
  cape.rotation.x = 0.06; // Miring tipis ke belakang agar tidak clipping dengan punggung
  cape.castShadow = true;
  group.add(cape);

  // 3. Pelindung Bahu (Shoulder Pads): Balok Prisma Abu-abu Metalik Berlis Emas Kaku
  const buildPauldron = (isLeft: boolean): THREE.Group => {
    const pGroup = new THREE.Group();
    const dome = new THREE.Mesh(geos.pauldronDomeGeo, mats.pauldronGrayMat);
    dome.castShadow = true;
    pGroup.add(dome);

    const rim = new THREE.Mesh(geos.pauldronTrimGeo, mats.goldTrimMat);
    rim.position.y = -0.07;
    pGroup.add(rim);

    // Miringkan ke luar bahu
    pGroup.position.set(isLeft ? 0.48 : -0.48, 1.76, 0);
    pGroup.rotation.z = isLeft ? -0.16 : 0.16;
    return pGroup;
  };
  const leftPauldron = buildPauldron(true);
  const rightPauldron = buildPauldron(false);
  group.add(leftPauldron, rightPauldron);

  // 4. Head & Hat Group (Kepala Kubus & Topi Runcing Wizard Hat)
  const head = new THREE.Mesh(geos.headGeo, mats.skinPeachMat);
  head.position.y = 2.02;
  head.castShadow = true;
  group.add(head);

  // Dua Balok Mata Kecil Bersinar Biru Neon (#00F0FF, tanpa pupil)
  const leftEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  leftEye.position.set(0.12, 0.02, 0.235);
  const rightEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  rightEye.position.set(-0.12, 0.02, 0.235);
  head.add(leftEye, rightEye);

  // Topi Runcing (Wizard Hat Group)
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 0.23, 0); // Menempel rapat di atas kepala (head top y=0.23)

  // Brim Datar dari CylinderGeometry berlis emas (#eab308)
  const hatBrim = new THREE.Mesh(geos.hatBrimGeo, mats.tunicPurpleMat);
  hatBrim.position.y = 0.03;
  hatBrim.castShadow = true;

  const hatBrimTrim = new THREE.Mesh(geos.hatBrimTrimGeo, mats.goldTrimMat);
  hatBrimTrim.position.y = 0.01;
  hatGroup.add(hatBrim, hatBrimTrim);

  // Hatband Emas
  const hatBand = new THREE.Mesh(geos.hatBandGeo, mats.goldTrimMat);
  hatBand.position.y = 0.07;
  hatGroup.add(hatBand);

  // Satu Kerucut Piramida Bersih (Tegak Lurus Meruncing ke Atas, Tanpa Lekukan/Tumpukan Aneh)
  const hatCone = new THREE.Mesh(geos.hatConeGeo, mats.tunicPurpleMat);
  hatCone.position.set(0, 0.06, 0);
  hatCone.rotation.y = Math.PI / 4;
  hatCone.castShadow = true;
  hatGroup.add(hatCone);

  head.add(hatGroup);

  // 5. Tangan Kanan & Staff (Tongkat Sihir)
  const rightArm = new THREE.Group();
  rightArm.position.set(-0.46, 1.70, 0);

  const rightUpperArm = new THREE.Mesh(geos.armUpperGeo, mats.tunicPurpleMat);
  rightUpperArm.position.y = -0.16;
  rightUpperArm.castShadow = true;
  rightArm.add(rightUpperArm);

  const rightForearm = new THREE.Group();
  rightForearm.position.set(0, -0.32, 0);

  const rightForearmMesh = new THREE.Mesh(geos.armForearmGeo, mats.tunicPurpleMat);
  rightForearmMesh.position.y = -0.14;
  rightForearmMesh.castShadow = true;
  rightForearm.add(rightForearmMesh);

  const rightWristTrim = new THREE.Mesh(geos.wristTrimGeo, mats.goldTrimMat);
  rightWristTrim.position.y = -0.27;
  rightForearm.add(rightWristTrim);

  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.32, 0);
  const rightHandMesh = new THREE.Mesh(geos.handGeo, mats.skinPeachMat);
  rightHandMesh.position.set(0, -0.06, 0.02);
  rightHandMesh.castShadow = true;
  rightHand.add(rightHandMesh);

  // Staff (Tongkat lurus silinder bersegi warna ungu tua dengan puncak cincin emas menjepit kristal biru)
  const weapon = new THREE.Group();
  const staffShaft = new THREE.Mesh(geos.staffShaftGeo, mats.staffShaftMat);
  staffShaft.castShadow = true;
  weapon.add(staffShaft);

  // Collar Emas
  const staffCollar = new THREE.Mesh(geos.staffCollarGeo, mats.goldTrimMat);
  staffCollar.position.y = 1.15;
  weapon.add(staffCollar);

  // Lingkaran Emas yang Kaku (Cincin Bersudut)
  const orbRing = new THREE.Mesh(geos.staffRingHeadGeo, mats.goldTrimMat);
  orbRing.position.y = 1.34;
  weapon.add(orbRing);

  // Kristal Biru Neon Icosahedron Kecil yang Dijepit di Tengah Cincin
  const orbMesh = new THREE.Mesh(geos.staffCrystalGeo, mats.crystalCyanMat);
  orbMesh.position.y = 1.34;
  weapon.add(orbMesh);

  // Pasangkan tongkat di telapak tangan kanan dengan posisi vertikal natural tanpa clipping
  weapon.position.set(0, -0.25, 0.12);
  weapon.rotation.set(0.08, 0, 0);
  rightHand.add(weapon);

  rightForearm.add(rightHand);
  rightArm.add(rightForearm);
  group.add(rightArm);

  // 6. Tangan Kiri & Grimoire (Kitab Sihir Berlis Emas)
  const leftArm = new THREE.Group();
  leftArm.position.set(0.46, 1.70, 0);

  const leftUpperArm = new THREE.Mesh(geos.armUpperGeo, mats.tunicPurpleMat);
  leftUpperArm.position.y = -0.16;
  leftUpperArm.castShadow = true;
  leftArm.add(leftUpperArm);

  const leftForearm = new THREE.Group();
  leftForearm.position.set(0, -0.32, 0);

  const leftForearmMesh = new THREE.Mesh(geos.armForearmGeo, mats.tunicPurpleMat);
  leftForearmMesh.position.y = -0.14;
  leftForearmMesh.castShadow = true;
  leftForearm.add(leftForearmMesh);

  const leftWristTrim = new THREE.Mesh(geos.wristTrimGeo, mats.goldTrimMat);
  leftWristTrim.position.y = -0.27;
  leftForearm.add(leftWristTrim);

  const leftHandMesh = new THREE.Mesh(geos.handGeo, mats.skinPeachMat);
  leftHandMesh.position.set(0, -0.38, 0.02);
  leftHandMesh.castShadow = true;
  leftForearm.add(leftHandMesh);

  // Grimoire (Kitab sihir sederhana berbentuk balok datar tipis marun dengan lis emas)
  const grimoire = new THREE.Group();
  const gCover = new THREE.Mesh(geos.grimoireCoverGeo, mats.grimoireCoverMat);
  gCover.castShadow = true;
  const gPages = new THREE.Mesh(geos.grimoirePagesGeo, mats.grimoirePagesMat);
  gPages.position.x = 0.01;
  const gSpine = new THREE.Mesh(geos.grimoireSpineGeo, mats.goldTrimMat);
  gSpine.position.x = -0.042;
  const gRune = new THREE.Mesh(geos.grimoireGoldRuneGeo, mats.goldTrimMat);
  gRune.rotation.y = Math.PI / 4;
  grimoire.add(gCover, gPages, gSpine, gRune);

  // Pasang rapi di sisi luar pergelangan tangan kiri tanpa menembus badan
  grimoire.position.set(0.12, -0.26, 0.04);
  grimoire.rotation.set(0.12, 0.20, -0.15);
  leftForearm.add(grimoire);

  leftArm.add(leftForearm);
  group.add(leftArm);

  // 7. Kaki (leftLegGroup & rightLegGroup) & Boots Cokelat Kaku
  const buildMageLeg = (posX: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(posX, 0.88, 0);

    // Paha Balok Ungu (Pivot di Pinggul y=0)
    const thigh = new THREE.Mesh(geos.thighGeo, mats.tunicPurpleMat);
    thigh.position.y = -0.19;
    thigh.castShadow = true;
    leg.add(thigh);

    // Pelindung Lutut Abu-abu Metalik
    const knee = new THREE.Mesh(geos.kneeBandGeo, mats.kneeGrayMat);
    knee.position.set(0, -0.38, 0.02);
    knee.castShadow = true;
    leg.add(knee);

    // Betis Balok Ungu
    const shin = new THREE.Mesh(geos.shinGeo, mats.tunicPurpleMat);
    shin.position.y = -0.52;
    shin.castShadow = true;
    leg.add(shin);

    // Boots Cokelat Kaku: Pergelangan
    const ankle = new THREE.Mesh(geos.bootAnkleGeo, mats.bootBrownMat);
    ankle.position.set(0, -0.70, 0.01);
    ankle.castShadow = true;
    leg.add(ankle);

    // Ujung Kotak Kaku (Toe Block)
    const toe = new THREE.Mesh(geos.bootToeGeo, mats.bootBrownMat);
    toe.position.set(0, -0.78, 0.12);
    toe.castShadow = true;
    leg.add(toe);

    // Sol Sepatu Bot Datar (Rata menyentuh tanah y=0.00)
    const sole = new THREE.Mesh(geos.bootSoleGeo, mats.soleMat);
    sole.position.set(0, -0.86, 0.05);
    sole.receiveShadow = true;
    leg.add(sole);

    group.add(leg);
    return leg;
  };

  const leftLeg = buildMageLeg(0.20);
  const rightLeg = buildMageLeg(-0.20);

  // 8. Tier 3 - 6 Celestial Archmage Features (Orbiting Crystals, Halos, Wings, Mandalas)
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  let wings: THREE.Group | undefined;
  let orbitingOrbs: THREE.Mesh[] | undefined;
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  if (tier >= 3) {
    orbitingOrbs = [];

    // Halos
    const haloColor = tier >= 6 ? 0xE0E7FF : 0x38BDF8;
    const haloRadius = tier >= 5 ? 0.44 : 0.36;
    const haloGeo = new THREE.TorusGeometry(haloRadius, 0.035, 6, 20);
    haloGeo.rotateX(Math.PI / 2);
    halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.9 }));
    halo.position.y = 2.72;
    group.add(halo);

    if (tier >= 6) {
      const outerHaloGeo = new THREE.TorusGeometry(0.58, 0.025, 6, 24);
      outerHaloGeo.rotateX(Math.PI / 2);
      halo2 = new THREE.Mesh(outerHaloGeo, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 }));
      halo2.position.y = 2.76;
      group.add(halo2);
    }

    // Wings
    if (tier >= 4) {
      wings = new THREE.Group();
      wings.position.set(0, 1.70, -0.28);
      const wingMat = new THREE.MeshStandardMaterial({
        color: tier >= 6 ? 0xE0E7FF : 0x818CF8,
        emissive: tier >= 6 ? 0xA5B4FC : 0x4F46E5,
        emissiveIntensity: tier >= 6 ? 1.4 : tier >= 5 ? 1.1 : 0.8,
        side: THREE.DoubleSide,
      });
      const featherCount = tier >= 6 ? 8 : tier >= 5 ? 6 : 4;
      const wingSpanScale = tier >= 6 ? 1.55 : tier >= 5 ? 1.3 : 1.0;

      const leftWing = new THREE.Group();
      for (let f = 0; f < featherCount; f++) {
        const featherLen = (0.85 - (f % 4) * 0.14) * wingSpanScale;
        const featherGeo = new THREE.BoxGeometry(0.09 * wingSpanScale, featherLen, 0.02);
        featherGeo.translate(0, featherLen * 0.5, 0);
        const feather = new THREE.Mesh(featherGeo, wingMat);
        feather.position.set((0.2 + (f % 4) * 0.2) * wingSpanScale, (0.15 - Math.floor(f / 4) * 0.35 - (f % 4) * 0.08) * wingSpanScale, 0);
        feather.rotation.z = -0.45 - (f % 4) * 0.32;
        leftWing.add(feather);
      }
      const rightWing = new THREE.Group();
      for (let f = 0; f < featherCount; f++) {
        const featherLen = (0.85 - (f % 4) * 0.14) * wingSpanScale;
        const featherGeo = new THREE.BoxGeometry(0.09 * wingSpanScale, featherLen, 0.02);
        featherGeo.translate(0, featherLen * 0.5, 0);
        const feather = new THREE.Mesh(featherGeo, wingMat);
        feather.position.set((-0.2 - (f % 4) * 0.2) * wingSpanScale, (0.15 - Math.floor(f / 4) * 0.35 - (f % 4) * 0.08) * wingSpanScale, 0);
        feather.rotation.z = 0.45 + (f % 4) * 0.32;
        rightWing.add(feather);
      }
      wings.add(leftWing, rightWing);
      group.add(wings);
    }

    // Orbiting Mana Crystals
    const orbCount = tier >= 6 ? 6 : tier >= 5 ? 4 : (tier >= 4 ? 3 : 2);
    const orbColors = [0x00E5FF, 0xA855F7, 0xFBBF24, 0x67E8F9, 0xFFFFFF, 0xC084FC];
    for (let i = 0; i < orbCount; i++) {
      const orbMat = new THREE.MeshStandardMaterial({
        color: orbColors[i % orbColors.length],
        emissive: orbColors[i % orbColors.length],
        emissiveIntensity: tier >= 6 ? 1.5 : 1.0,
      });
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(tier >= 6 ? 0.16 : 0.12, 0), orbMat);
      const angle = (i / orbCount) * Math.PI * 2;
      const radius = tier >= 5 ? 1.15 : 0.9;
      orb.position.set(Math.cos(angle) * radius, 1.8, Math.sin(angle) * radius);
      group.add(orb);
      orbitingOrbs.push(orb);
    }

    // Ground Aura Rings & Astral Mandalas
    const auraColor = 0x8B5CF6;
    const ringGeo = new THREE.RingGeometry(0.65, tier >= 5 ? 0.85 : 0.78, 24);
    ringGeo.rotateX(-Math.PI / 2);
    auraRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: auraColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: tier >= 6 ? 0.85 : 0.6,
      })
    );
    auraRing.position.y = 0.05;
    group.add(auraRing);

    if (tier >= 5) {
      const outerRingGeo = new THREE.RingGeometry(1.05, 1.22, 32);
      outerRingGeo.rotateX(-Math.PI / 2);
      auraRing2 = new THREE.Mesh(
        outerRingGeo,
        new THREE.MeshBasicMaterial({
          color: tier >= 6 ? 0xFFFFFF : auraColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: tier >= 6 ? 0.75 : 0.45,
        })
      );
      auraRing2.position.y = 0.06;
      group.add(auraRing2);
    }
  }

  return {
    group,
    leftArm,
    rightArm,
    leftForearm,
    rightHand,
    leftLeg,
    rightLeg,
    weapon,
    cape,
    body,
    head,
    charClass,
    tier,
    orbMesh,
    orbRing,
    grimoire,
    orbitingOrbs,
    wings,
    halo,
    halo2,
    auraRing,
    auraRing2,
  };
}

/**
 * ============================================================================
 * ANIMASI JALAN & IDLE MAGE (SMOOTH LERP & DELTA TIME)
 * ============================================================================
 * Mengimplementasikan spesifikasi Bagian 2 dari instruksi:
 * - Idle State (Kecepatan <= 0.1):
 *   * Pernapasan halus: torso naik-turun subtil Math.sin(time * 2.5) * 0.02
 *   * Tangan kanan memegang tongkat santai di sisi tubuh
 *   * Tangan kiri mendekap grimoire di pinggul
 * - Walk Cycle (Kecepatan > 0.1):
 *   * Kaki kiri dan kanan berayun bergantian: rotation.x = Math.sin(time * 8.5) * 0.45
 *   * Lengan kiri berayun alami seirama langkah: rotation.x = -Math.sin(time * 8.5) * 0.3
 *   * Lengan kanan (tongkat) tetap stabil condong ke depan dengan sway vertikal minim
 *   * Goyangan pinggul (hip sway) & bobbing badan: position.y += Math.abs(Math.sin(time * 8.5)) * 0.07
 *   * Jubah belakang terangkat sedikit ke belakang (cape tilt: rotation.x = 0.2 rad)
 */
export function animateMageWalk(
  playerMesh: PlayerMeshObjects,
  walkTime: number,
  playerPosY: number,
  isMoving: boolean,
  isAttacking: boolean = false
): void {
  const lerpSpeed = 0.20;

  if (isMoving) {
    // 1. Walk Cycle (Frekuensi 8.5)
    const legSwing = Math.sin(walkTime * 8.5) * 0.45;
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, lerpSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, lerpSpeed);

    if (!isAttacking) {
      // Lengan kiri berayun alami seirama langkah: -Math.sin(time * 8.5) * 0.3
      const leftArmSwing = -Math.sin(walkTime * 8.5) * 0.3;
      playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, leftArmSwing, lerpSpeed);
      playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.12, lerpSpeed);
      playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.14, lerpSpeed);

      // Lengan kanan stabil condong ke depan, sway vertikal minim agar tongkat tidak liar / menusuk tanah
      const staffSway = Math.sin(walkTime * 4.25) * 0.035;
      playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.32 + staffSway, lerpSpeed);
      playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.05, lerpSpeed);
      playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.10, lerpSpeed);
    }

    // Goyangan pinggul & bobbing badan alami
    const bodyBob = Math.abs(Math.sin(walkTime * 8.5)) * 0.07;
    const hipSway = Math.sin(walkTime * 8.5) * 0.025;

    playerMesh.group.position.y = playerPosY + bodyBob;
    playerMesh.group.rotation.z = hipSway;

    // Jubah belakang terangkat halus ke belakang saat bergerak (cape tilt 0.20 rad)
    const capeFlap = Math.sin(walkTime * 8.5) * 0.05;
    playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.20 + capeFlap, lerpSpeed);
  } else {
    // 2. Idle State: Pernapasan halus & pose santai
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, lerpSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, lerpSpeed);
    playerMesh.group.rotation.z = THREE.MathUtils.lerp(playerMesh.group.rotation.z, 0, lerpSpeed);

    // Pernapasan subtil: Math.sin(time * 2.5) * 0.02
    const breathe = Math.sin(walkTime * 2.5) * 0.02;
    playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.35 + breathe, lerpSpeed);

    if (!isAttacking) {
      // Tangan kanan memegang tongkat santai di sisi tubuh
      playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.18 + breathe * 0.3, lerpSpeed);
      playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, lerpSpeed);
      playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.08, lerpSpeed);

      // Tangan kiri mendekap grimoire di pinggul
      playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0.06 - breathe * 0.2, lerpSpeed);
      playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.10, lerpSpeed);
      playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.12, lerpSpeed);
    }

    // Jubah kembali tegak saat diam
    playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.06 + Math.sin(walkTime * 2) * 0.02, lerpSpeed);
  }
}

/**
 * ============================================================================
 * STATE ANIMASI SKILL MAGE (Spesifikasi Bagian 3)
 * ============================================================================
 */
export interface MageSkillAnimContext {
  attackType: string | null;
  progress: number; // 0.0 s/d 1.0
  isCasting: boolean;
  castingProgress: number; // 0.0 s/d 1.0
  isBlinking: boolean;
  blinkProgress: number; // 0.0 s/d 1.0
}

export function animateMageSkillPose(
  playerMesh: PlayerMeshObjects,
  ctx: MageSkillAnimContext
): void {
  const lerpSpeed = 0.25;

  // A. Basic Attack: Arcane Beam (Channeling 1.0 Detik)
  if (ctx.attackType === 'basic') {
    // 1. Lengan Kanan: Angkat lurus ke depan setinggi dada (rotation.x = -Math.PI / 2)
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -Math.PI / 2, lerpSpeed);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, lerpSpeed);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.05, lerpSpeed);

    // Balik arah pivot tongkat pada tangan kanan agar kepala kristal biru menghadap ke depan (+Z target)
    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, Math.PI, lerpSpeed);

    // 2. Lengan Kiri (Grimoire): Angkat sedikit ke samping depan seolah membaca mantra dari kitab
    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.40, lerpSpeed);
    playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.50, lerpSpeed);
    playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.20, lerpSpeed);

    // 3. Tubuh & Kaki: Berikan kuda-kuda kokoh (tekukan lutut & tubuh condong ke depan 0.1 rad menahan daya dorong laser)
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0.10, lerpSpeed);
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, -0.15, lerpSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0.15, lerpSpeed);

    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, -0.05, lerpSpeed);
    return;
  } else {
    // Kembalikan orientasi tegak natural tongkat saat tidak menembakkan Arcane Beam
    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, 0.08, lerpSpeed);
  }

  // B. Skill 1: Starfall (Fase Casting 1.0 Detik & Fase Barrage Meteor 10-Barrage)
  if (ctx.isCasting) {
    // Detik 0.0 - 1.0 (Fase Casting):
    // Karakter diam di tempat, kedua tangan diangkat tinggi ke langit, kepala mendongak ke atas
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, lerpSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, lerpSpeed);

    // Kedua lengan diangkat tinggi ke atas langit
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -Math.PI * 0.85, lerpSpeed);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, lerpSpeed);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.20, lerpSpeed);

    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -Math.PI * 0.85, lerpSpeed);
    playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.15, lerpSpeed);
    playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.25, lerpSpeed);

    // Kepala mendongak ke atas (head rotation.x = -0.3 rad)
    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, -0.30, lerpSpeed);

    // Seluruh model terangkat halus (+0.15 unit Y) melayang selama casting
    playerMesh.group.position.y += THREE.MathUtils.lerp(0, 0.15, ctx.castingProgress);
    return;
  }

  if (ctx.attackType === 'starfall' || ctx.attackType === 'supernova') {
    // Tepat di Detik 1.0: Ayunkan tongkat ke arah tanah di depannya (slam/point gesture singkat 0.2 detik)
    const slam = Math.sin((1 - ctx.progress) * Math.PI);
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.65 - slam * 0.85, 0.45);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.35);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.10, 0.35);

    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.30, 0.35);
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0.12 * slam, 0.35);
    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0.10, lerpSpeed);
    return;
  }

  // C. Skill 2: Blink (Langkah Dimensi - iFrame 0.2 Detik)
  if (ctx.isBlinking || ctx.attackType === 'blink') {
    // Tubuh condong ke arah teleportasi (torso lean forward rotation.x = 0.4 rad)
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0.40, 0.35);
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0.50, 0.35);
    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0.50, 0.35);

    // Saat mendarat (crouch landing offset -0.1 unit)
    if (ctx.blinkProgress > 0.7) {
      playerMesh.group.position.y -= 0.10 * (1 - ctx.blinkProgress);
    }
    return;
  } else {
    // Kembalikan kemiringan torso normal
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0, 0.2);
  }

  // D. Skill 3: Cahaya / Celestial Light (Pose Doa / Self-Channel Durasi 0.5 Detik)
  if (ctx.attackType === 'celestial_heal') {
    // Kedua lengan menyilang ke dada, tongkat dirapatkan ke tubuh, grimoire ditekan ke dada
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.75, lerpSpeed);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0.45, lerpSpeed);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0.35, lerpSpeed);

    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.75, lerpSpeed);
    playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, -0.45, lerpSpeed);
    playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, -0.35, lerpSpeed);

    // Kepala sedikit menunduk khidmat (headGroup.rotation.x = 0.2 rad)
    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0.20, lerpSpeed);
    return;
  }

  // Default Head Angle Recovery
  playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0, lerpSpeed);
}

/**
 * ============================================================================
 * OPTIONAL REACT / R3F COMPONENT WRAPPER (Declarative Props Interface)
 * ============================================================================
 * Menyediakan antarmuka komponen React jika model dipanggil secara deklaratif
 * dalam pohon komponen UI / scene viewer dengan props: speed, state, castEvent, tier.
 */
export interface MageModelProps {
  speed?: number;
  state?: 'idle' | 'walk' | 'attack' | 'casting' | 'blink' | 'dead';
  castEvent?: string | null;
  tier?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

export const MageModel: React.FC<MageModelProps> = ({
  speed = 0,
  state = 'idle',
  castEvent = null,
  tier = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const mountRef = useRef<THREE.Group>(null);
  const meshObjRef = useRef<PlayerMeshObjects | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const meshObj = createHeroicMageMesh(tier);
    meshObjRef.current = meshObj;
    mountRef.current.add(meshObj.group);

    return () => {
      if (mountRef.current && meshObj.group) {
        mountRef.current.remove(meshObj.group);
      }
    };
  }, [tier]);

  useEffect(() => {
    if (!meshObjRef.current) return;
    const isMoving = speed > 0.1 || state === 'walk';
    animateMageWalk(meshObjRef.current, performance.now() * 0.001, 0, isMoving, state === 'attack');
    if (state === 'attack' || state === 'casting' || state === 'blink' || castEvent) {
      animateMageSkillPose(meshObjRef.current, {
        attackType: castEvent || (state === 'attack' ? 'basic' : state),
        progress: 0.5,
        isCasting: state === 'casting',
        castingProgress: 0.5,
        isBlinking: state === 'blink',
        blinkProgress: 0.5,
      });
    }
  }, [speed, state, castEvent]);

  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <group
      ref={mountRef}
      position={new THREE.Vector3(...position)}
      rotation={new THREE.Euler(...rotation)}
      scale={new THREE.Vector3(...(s as [number, number, number]))}
    />
  );
};

export default MageModel;
