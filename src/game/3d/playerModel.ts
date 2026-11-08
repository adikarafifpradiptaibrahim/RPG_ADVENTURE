import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };

/**
 * ============================================================================
 * HELPER: RECURVE BOW BUILDER (BUSUR & PANAH)
 * Segmented 5-part angular recurve bow with glowing cyan bowstring.
 * Based on "BUSUR & PANAH" blueprint specification.
 * ============================================================================
 */
export function createRecurveBowMesh(
  matWood: THREE.Material,
  matLeather: THREE.Material,
  matGlow: THREE.Material
): THREE.Group {
  const bow = new THREE.Group();
  bow.name = 'RecurveBow';

  // 1. Central Grip / Handle
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.16, 0.055), matLeather);
  grip.position.set(0, 0, 0);
  grip.castShadow = true;
  bow.add(grip);

  // 2. Upper Limb (Inner segment - angled backwards)
  const upperInner = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.28, 0.038), matWood);
  upperInner.position.set(0, 0.20, -0.05);
  upperInner.rotation.x = -0.35;
  upperInner.castShadow = true;
  bow.add(upperInner);

  // 3. Upper Limb (Outer recurve tip - angled forward)
  const upperOuter = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.22, 0.032), matWood);
  upperOuter.position.set(0, 0.40, -0.03);
  upperOuter.rotation.x = 0.50;
  upperOuter.castShadow = true;
  bow.add(upperOuter);

  // 4. Lower Limb (Inner segment - angled backwards)
  const lowerInner = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.28, 0.038), matWood);
  lowerInner.position.set(0, -0.20, -0.05);
  lowerInner.rotation.x = 0.35;
  lowerInner.castShadow = true;
  bow.add(lowerInner);

  // 5. Lower Limb (Outer recurve tip - angled forward)
  const lowerOuter = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.22, 0.032), matWood);
  lowerOuter.position.set(0, -0.40, -0.03);
  lowerOuter.rotation.x = -0.50;
  lowerOuter.castShadow = true;
  bow.add(lowerOuter);

  // 6. Glowing Cyan Bowstring (#00f0ff)
  const stringGeo = new THREE.BoxGeometry(0.012, 0.98, 0.012);
  const bowString = new THREE.Mesh(stringGeo, matGlow);
  bowString.position.set(0, 0, 0.04);
  bow.add(bowString);

  return bow;
}

/**
 * ============================================================================
 * HELPER: DUAL STEEL DAGGER BUILDER (DUAL BELATI CYAN MEMANJANG)
 * Bilah cyan 0.45 unit menonjol lurus ke depan dengan gagang & guard baja.
 * Berdasarkan spesifikasi: panjang bilah 0.45 unit lurus ke depan.
 * ============================================================================
 */
export function createSteelDaggerMesh(
  matLeather: THREE.Material,
  matArmor: THREE.Material,
  matGlow: THREE.Material,
  isLeft: boolean = false
): THREE.Group {
  const dagger = new THREE.Group();
  dagger.name = isLeft ? 'SteelDagger_Left' : 'SteelDagger_Right';

  // 1. Grip / Handle (Gagang di genggaman tangan)
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), matLeather);
  hilt.position.set(0, 0, 0);
  hilt.castShadow = true;
  dagger.add(hilt);

  // 2. Pommel (Penutup ujung gagang)
  const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.035), matArmor);
  pommel.position.set(0, 0, -0.09);
  pommel.castShadow = true;
  dagger.add(pommel);

  // 3. Steel Crossguard (Pelindung tangan plat baja)
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), matArmor);
  guard.position.set(0, 0, 0.09);
  guard.castShadow = true;
  dagger.add(guard);

  // 4. Bilah Cyan Memanjang 0.45 unit Lurus ke Depan (BoxGeometry 0.06 x 0.02 x 0.45)
  // Menjorok langsung ke depan dari crossguard
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.45), matGlow);
  blade.position.set(0, 0, 0.33); // center di 0.33 -> membentang dari 0.105 s/d 0.555
  blade.castShadow = true;
  dagger.add(blade);

  // 5. Ujung Runcing Berlian (Pointed Diamond Tip)
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.06), matGlow);
  tip.position.set(0, 0, 0.57);
  tip.rotation.y = Math.PI / 4;
  tip.castShadow = true;
  dagger.add(tip);

  // Rotasi menyerong sedikit ke luar untuk pose natural
  dagger.rotation.y = isLeft ? -0.12 : 0.12;

  return dagger;
}

/**
 * ============================================================================
 * HELPER: ARROW MESH BUILDER
 * Wooden shaft, diamond steel arrowhead, and blocky fletching feathers.
 * ============================================================================
 */
export function createArrowMesh(
  matWood: THREE.Material,
  matArmor: THREE.Material,
  matFeather: THREE.Material
): THREE.Group {
  const arrow = new THREE.Group();
  arrow.name = 'HunterArrow';

  // 1. Shaft
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.68), matWood);
  shaft.position.set(0, 0, 0);
  shaft.castShadow = true;
  arrow.add(shaft);

  // 2. Diamond Steel Arrowhead
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.08), matArmor);
  head.position.set(0, 0, 0.38);
  head.rotation.y = Math.PI / 4;
  head.castShadow = true;
  arrow.add(head);

  // 3. Blocky Fletching Feathers (Tail)
  const fin1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.10), matFeather);
  fin1.position.set(0, 0, -0.28);
  const fin2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.10), matFeather);
  fin2.position.set(0, 0, -0.28);
  arrow.add(fin1, fin2);

  return arrow;
}

/**
 * ============================================================================
 * MAIN 3D CHARACTER MODEL BUILDER: THE HUNTER (PEMBURU - BLOCKY REVISION)
 * Realisasi 1:1 presisi sesuai Blueprint Orthographic Hunter.
 * ============================================================================
 */
export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // --- PALET MATERIAL ---
  const matSuit = new THREE.MeshStandardMaterial({
    color: 0x181a1d, // Hitam taktis stealth
    roughness: 0.85,
  });
  const matArmor = new THREE.MeshStandardMaterial({
    color: 0x4f545e, // Plat baja abu-abu (chestplate, pauldrons, boots)
    roughness: 0.45,
    metalness: 0.35,
  });
  const matLeather = new THREE.MeshStandardMaterial({
    color: 0x3d2618, // Kulit cokelat sabuk, kantong amunisi, tabung panah
    roughness: 0.80,
  });
  const matBuckle = new THREE.MeshStandardMaterial({
    color: 0x8a929e, // Gesper logam baja kontras
    metalness: 0.65,
    roughness: 0.30,
  });
  const matWood = new THREE.MeshStandardMaterial({
    color: 0x5a3d28, // Kayu busur dan batang panah
    roughness: 0.75,
  });
  const matFeather = new THREE.MeshStandardMaterial({
    color: 0xcfd4dc, // Bulu fletching panah
    roughness: 0.60,
  });
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0x00f5ff, // Cyan elektrik berpendar kuat (mata, bilah belati, tali busur)
    emissive: 0x00f5ff,
    emissiveIntensity: 3.0,
    roughness: 0.15,
  });

  // ==========================================
  // 1. KAKI & SEPATU BOT BAJA (Tinggi: 0.0 - 0.82)
  // ==========================================
  const legs = new THREE.Group();
  legs.name = 'Hunter_Legs';
  let leftLegGroup: THREE.Group | undefined;
  let rightLegGroup: THREE.Group | undefined;

  [-0.14, 0.14].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'LegPivot_Left' : 'LegPivot_Right';
    legPivot.position.set(xPos, 0.78, 0);

    // Celana hitam taktis
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.48, 0.22), matSuit);
    thigh.position.set(0, -0.24, 0);
    thigh.castShadow = true;

    // Sepatu bot baja abu-abu (Grey Boots / Shin Guards)
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.26), matArmor);
    boot.position.set(0, -0.56, 0.02);
    boot.castShadow = true;

    // Ujung jari kaki sepatu (Toe Box)
    const bootToe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.10), matArmor);
    bootToe.position.set(0, -0.65, 0.18);
    bootToe.castShadow = true;

    legPivot.add(thigh, boot, bootToe);
    legs.add(legPivot);

    if (isLeft) {
      leftLegGroup = legPivot;
    } else {
      rightLegGroup = legPivot;
    }
  });
  root.add(legs);

  // ==========================================
  // 2. PINGGANG, SABUK & 2 ANGULAR DAGGER SHEATHS
  // ==========================================
  const pelvisGroup = new THREE.Group();
  pelvisGroup.name = 'Hunter_Pelvis';

  // Inti pinggul
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.30), matSuit);
  pelvis.position.set(0, 0.82, 0);
  pelvis.castShadow = true;

  // Sabuk kulit cokelat
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.10, 0.34), matLeather);
  belt.position.set(0, 0.83, 0);
  belt.castShadow = true;

  // Gesper sabuk logam depan
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.04), matBuckle);
  buckle.position.set(0, 0.83, 0.18);
  buckle.castShadow = true;

  // Dua kantong amunisi kecil di depan (Pouches on belt)
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.08), matLeather);
  pouchL.position.set(-0.17, 0.83, 0.18);
  pouchL.castShadow = true;

  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.08), matLeather);
  pouchR.position.set(0.17, 0.83, 0.18);
  pouchR.castShadow = true;

  // 2 Sarung Belati Bersudut di Pinggang (2 Angular Dagger Sheath on Hips)
  // Left Sheath
  const sheathGroupL = new THREE.Group();
  sheathGroupL.position.set(-0.30, 0.74, 0.02);
  sheathGroupL.rotation.set(-0.20, 0, 0.14); // Miring ke belakang mengikuti paha

  const sheathBodyL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.40, 0.10), matSuit);
  sheathBodyL.position.set(0, -0.16, 0);
  sheathBodyL.castShadow = true;
  const sheathRimL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.11), matArmor);
  sheathRimL.position.set(0, 0.04, 0);
  sheathGroupL.add(sheathBodyL, sheathRimL);

  // Gagang belati tersarung di kiri (muncul saat busur aktif)
  const sheathedHiltL = new THREE.Group();
  const sHiltL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), matLeather);
  sHiltL.position.set(0, 0.14, 0);
  const sGuardL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), matArmor);
  sGuardL.position.set(0, 0.06, 0);
  sheathedHiltL.add(sHiltL, sGuardL);
  sheathedHiltL.visible = false;
  sheathGroupL.add(sheathedHiltL);

  // Right Sheath
  const sheathGroupR = new THREE.Group();
  sheathGroupR.position.set(0.30, 0.74, 0.02);
  sheathGroupR.rotation.set(-0.20, 0, -0.14);

  const sheathBodyR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.40, 0.10), matSuit);
  sheathBodyR.position.set(0, -0.16, 0);
  sheathBodyR.castShadow = true;
  const sheathRimR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.11), matArmor);
  sheathRimR.position.set(0, 0.04, 0);
  sheathGroupR.add(sheathBodyR, sheathRimR);

  // Gagang belati tersarung di kanan (muncul saat busur aktif)
  const sheathedHiltR = new THREE.Group();
  const sHiltR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), matLeather);
  sHiltR.position.set(0, 0.14, 0);
  const sGuardR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), matArmor);
  sGuardR.position.set(0, 0.06, 0);
  sheathedHiltR.add(sHiltR, sGuardR);
  sheathedHiltR.visible = false;
  sheathGroupR.add(sheathedHiltR);

  pelvisGroup.add(pelvis, belt, buckle, pouchL, pouchR, sheathGroupL, sheathGroupR);
  root.add(pelvisGroup);

  // ==========================================
  // 3. TORSO & ZIRAH PLAT DADA BAJA (STEEL ARMOR)
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'Hunter_Torso';

  // Torso utama
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.30), matSuit);
  torso.position.set(0, 1.20, 0);
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Plat Zirah Baja Dada (Steel Armor Chestplate)
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.08), matArmor);
  chestPlate.position.set(0, 1.30, 0.16);
  chestPlate.castShadow = true;
  torsoGroup.add(chestPlate);

  // Selempang Sabuk Bahu Diagonal (Leather Strap)
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.33), matLeather);
  strap.rotation.z = -0.55;
  strap.position.set(0, 1.20, 0.01);
  strap.castShadow = true;
  torsoGroup.add(strap);

  // ==========================================
  // 4. JUBAH BERGERIGI TANGGA (CAPE WITH STAIR-CASE CUTS)
  // Offset Z = -0.22, DoubleSide, bebas culling dari badan
  // ==========================================
  const capeGroup = new THREE.Group();
  capeGroup.name = 'Hunter_Cape';
  capeGroup.position.set(0, 1.42, -0.22);
  capeGroup.rotation.x = -0.14; // Melambai ke belakang

  // Lembaran jubah utama (terlihat dari belakang)
  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d33,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const capeMain = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.04), capeMat);
  capeMain.position.set(0, -0.36, 0);
  capeMain.castShadow = true;
  capeGroup.add(capeMain);

  // 3 Gerigi Tangga Bawah ("stair-case" / stepid kaku bottom cuts)
  const fringeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.04), capeMat);
  fringeL.position.set(-0.18, -0.78, 0);
  fringeL.castShadow = true;

  const fringeM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.04), capeMat);
  fringeM.position.set(0.01, -0.82, 0);
  fringeM.castShadow = true;

  const fringeR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.04), capeMat);
  fringeR.position.set(0.19, -0.76, 0);
  fringeR.castShadow = true;

  capeGroup.add(fringeL, fringeM, fringeR);
  torsoGroup.add(capeGroup);

  // ==========================================
  // 5. TABUNG PANAH (QUIVER) DENGAN BULU PANAH
  // Diposisikan di luar jubah punggung (Z = -0.28)
  // ==========================================
  const quiverGroup = new THREE.Group();
  quiverGroup.name = 'Hunter_Quiver';
  quiverGroup.position.set(0.15, 1.25, -0.28);
  quiverGroup.rotation.z = -0.48;

  // Bodi tabung panah kulit cokelat
  const quiverBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), matLeather);
  quiverBody.position.set(0, 0, 0);
  quiverBody.castShadow = true;

  // Kerah atas tabung
  const quiverRim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), matArmor);
  quiverRim.position.set(0, 0.32, 0);
  quiverRim.castShadow = true;
  quiverGroup.add(quiverBody, quiverRim);

  // Batang & Bulu Panah di Dalam Tabung (Arrows in Quiver)
  const arrow1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.03), matWood);
  arrow1.position.set(-0.03, 0.42, -0.02);
  const fin1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), matFeather);
  fin1.position.set(-0.03, 0.50, -0.02);

  const arrow2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.03), matWood);
  arrow2.position.set(0.03, 0.44, 0.02);
  const fin2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), matFeather);
  fin2.position.set(0.03, 0.54, 0.02);

  const arrow3 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.03), matWood);
  arrow3.position.set(0.00, 0.40, 0.04);
  const fin3 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), matFeather);
  fin3.position.set(0.00, 0.48, 0.04);

  quiverGroup.add(arrow1, fin1, arrow2, fin2, arrow3, fin3);
  torsoGroup.add(quiverGroup);

  // ==========================================
  // 6. BUSUR PUNGGUNG SELEMPANG (BACK SLUNG RECURVE BOW)
  // Diposisikan di punggung (Z = -0.30), muncul saat di stance belati
  // ==========================================
  const backBow = createRecurveBowMesh(matWood, matLeather, matGlow);
  backBow.name = 'BackSlungBow';
  backBow.position.set(-0.08, 1.25, -0.30);
  backBow.rotation.set(-0.15, 0.12, 0.55);
  torsoGroup.add(backBow);

  root.add(torsoGroup);

  // ==========================================
  // 7. WAJAH DENGAN LAYER KULIT + MASKER (FIX BLACK VOID)
  // Layer berlapis: Kepala Inti Kulit + Masker Abu-abu + Mata Cyan + Tudung Abu Gelap
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'Hunter_Head';
  headGroup.position.set(0, 1.50, 0);

  // Leher solid
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.20), matSuit);
  neck.position.set(0, 0.06, 0);
  neck.castShadow = true;
  headGroup.add(neck);

  // Kepala Inti (Skin Base) - Kulit sawo matang terlihat di dahi dan area mata
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.8 });
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.42), matSkin);
  headMesh.position.set(0, 0.24, 0);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Masker Wajah Bawah (Solid Face Mask) - Menutupi hidung ke dagu (#1f2228 abu-abu arang)
  const matMaskCustom = new THREE.MeshStandardMaterial({ color: 0x1f2228, roughness: 0.9 });
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.20, 0.22), matMaskCustom);
  mask.position.set(0, 0.16, 0.14);
  mask.castShadow = true;
  headGroup.add(mask);

  // Mata Cyan Berpendar (#00f5ff)
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.04), matGlow);
  eyeL.position.set(-0.10, 0.28, 0.22);

  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.04), matGlow);
  eyeR.position.set(0.10, 0.28, 0.22);
  headGroup.add(eyeL, eyeR);

  // Tudung Luar (Hood Rim) - Warna abu-abu gelap (#34373e)
  const matHoodCustom = new THREE.MeshStandardMaterial({ color: 0x34373e, roughness: 0.85 });

  // Atap Tudung
  const hoodRoof = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.52), matHoodCustom);
  hoodRoof.position.set(0, 0.48, 0.02);
  hoodRoof.rotation.x = 0.15; // Miring ke depan menaungi dahi
  hoodRoof.castShadow = true;

  // Puncak lancip tengah tudung (Crest Ridge)
  const hoodPeak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.48), matHoodCustom);
  hoodPeak.position.set(0, 0.52, 0.02);
  hoodPeak.rotation.x = 0.15;
  hoodPeak.castShadow = true;

  // Sisi Samping Kiri Tudung
  const hoodL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.50), matHoodCustom);
  hoodL.position.set(-0.24, 0.26, 0);
  hoodL.castShadow = true;

  // Sisi Samping Kanan Tudung
  const hoodR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.50), matHoodCustom);
  hoodR.position.set(0.24, 0.26, 0);
  hoodR.castShadow = true;

  // Dinding Belakang Tudung
  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.40, 0.06), matHoodCustom);
  hoodBack.position.set(0, 0.26, -0.22);
  hoodBack.castShadow = true;

  headGroup.add(hoodRoof, hoodPeak, hoodL, hoodR, hoodBack);
  root.add(headGroup);

  // ==========================================
  // 8. LENGAN, BAHU BAJA & SENJATA GANDA DINAMIS
  // ==========================================
  let armLeft: THREE.Group | undefined;
  let armRight: THREE.Group | undefined;
  let handDaggerL: THREE.Group | undefined;
  let handDaggerR: THREE.Group | undefined;
  let handBow: THREE.Group | undefined;
  let handArrow: THREE.Group | undefined;

  [-0.34, 0.34].forEach((xSide, idx) => {
    const isLeft = idx === 0;
    const arm = new THREE.Group();
    arm.name = isLeft ? 'Hunter_ArmLeft' : 'Hunter_ArmRight';
    arm.position.set(xSide, 1.44, 0);

    // Bahu Pelindung Baja (Pauldron Plate)
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.20), matArmor);
    pauldron.position.set(0, 0, 0);
    pauldron.castShadow = true;
    arm.add(pauldron);

    // Lengan Atas
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), matSuit);
    upperArm.position.set(0, -0.16, 0);
    upperArm.castShadow = true;
    arm.add(upperArm);

    // Lengan Bawah Menekuk Maju
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.14), matSuit);
    forearm.position.set(0, -0.32, 0.06);
    forearm.rotation.x = 0.32;
    forearm.castShadow = true;
    arm.add(forearm);

    // Sarung Tangan
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), matSuit);
    hand.position.set(0, -0.40, 0.16);
    hand.castShadow = true;
    arm.add(hand);

    // -------------------------------------------------------------
    // SENJATA DI GENGGAMAN TANGAN (BELATI 0.45 UNIT / BUSUR)
    // -------------------------------------------------------------
    if (isLeft) {
      // 1. Belati Tangan Kiri (Bilah Cyan 0.45 unit menonjol lurus ke depan)
      handDaggerL = createSteelDaggerMesh(matLeather, matArmor, matGlow, true);
      handDaggerL.position.set(0, -0.40, 0.18);
      arm.add(handDaggerL);

      // 2. Busur Tangan Kiri (Active Bow Stance)
      handBow = createRecurveBowMesh(matWood, matLeather, matGlow);
      handBow.position.set(0, -0.40, 0.24);
      handBow.visible = false;
      arm.add(handBow);

      armLeft = arm;
    } else {
      // 1. Belati Tangan Kanan (Bilah Cyan 0.45 unit menonjol lurus ke depan)
      handDaggerR = createSteelDaggerMesh(matLeather, matArmor, matGlow, false);
      handDaggerR.position.set(0, -0.40, 0.18);
      arm.add(handDaggerR);

      // 2. Anak Panah di Tangan Kanan (Active Bow Stance)
      handArrow = createArrowMesh(matWood, matArmor, matFeather);
      handArrow.position.set(0, -0.40, 0.22);
      handArrow.visible = false;
      arm.add(handArrow);

      armRight = arm;
    }

    root.add(arm);
  });

  // ==========================================
  // 9. DYNAMIC WEAPON STANCE CONTROLLER (DAGGER / BOW)
  // ==========================================
  let currentWeaponMode: 'dagger' | 'bow' = 'dagger';
  const applyWeaponMode = (mode: 'dagger' | 'bow') => {
    currentWeaponMode = mode;
    const isDagger = mode === 'dagger';

    // Senjata di genggaman tangan
    if (handDaggerL) handDaggerL.visible = isDagger;
    if (handDaggerR) handDaggerR.visible = isDagger;
    if (handBow) handBow.visible = !isDagger;
    if (handArrow) handArrow.visible = !isDagger;

    // Busur di selempang punggung
    backBow.visible = isDagger;

    // Belati tersarung di sarung pinggang
    sheathedHiltL.visible = !isDagger;
    sheathedHiltR.visible = !isDagger;
  };

  // Simpan referensi internal pada root untuk animasi & gameplay engine
  (root as any).leftLeg = leftLegGroup;
  (root as any).rightLeg = rightLegGroup;
  (root as any).leftArm = armLeft;
  (root as any).rightArm = armRight;
  (root as any).body = torsoGroup;
  (root as any).head = headGroup;
  (root as any).cape = capeGroup;
  (root as any).chestplate = chestPlate;
  (root as any).quiver = quiverGroup;
  (root as any).backBow = backBow;
  (root as any).handBow = handBow;
  (root as any).handDaggerL = handDaggerL;
  (root as any).handDaggerR = handDaggerR;
  (root as any).weapon = armRight;
  (root as any).leftWeapon = armLeft;
  (root as any).setHunterWeaponMode = applyWeaponMode;
  (root as any).getHunterWeaponMode = () => currentWeaponMode;

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
    if (typeof (root as any).setHunterWeaponMode === 'function') {
      (root as any).setHunterWeaponMode(mode);
    }
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
 * Mendukung animasi berjalan & idle dinamis untuk mode Belati Ganda & Busur
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
    // Ayunan langkah kaki humanoid taktis
    const legSwing = Math.sin(walkTime * 1.2) * 0.52;
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, 0.25);
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, 0.25);
    }

    if (!isAttacking) {
      if (isBow) {
        // Stance Gerak Membawa Busur
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
        // Stance Gerak Belati Ganda
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

    // Melambai jubah bergerigi
    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.14 - Math.abs(Math.sin(walkTime * 1.2)) * 0.18;
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
      if (isBow) {
        // Idle Busur Siaga
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
        // Idle Belati Ganda Siaga
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

    // Cape subtle flutter saat diam
    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = -0.14 - Math.sin(walkTime * 2.0) * 0.03;
    }
  }
}
