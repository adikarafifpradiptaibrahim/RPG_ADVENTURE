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
 * HELPER: DUAL STEEL DAGGER BUILDER (DUAL BELATI)
 * Steel blade with glowing cyan core/edge and diamond pointed tip.
 * Based on "DUAL BELATI - Steel daggers" blueprint specification.
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

  // 1. Grip / Handle (Dark Leather / Charcoal)
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.042, 0.16), matLeather);
  hilt.position.set(0, 0, 0.08);
  hilt.castShadow = true;
  dagger.add(hilt);

  // 2. Pommel (End Cap)
  const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.035), matArmor);
  pommel.position.set(0, 0, -0.01);
  pommel.castShadow = true;
  dagger.add(pommel);

  // 3. Steel Crossguard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.036, 0.042), matArmor);
  guard.position.set(0, 0, 0.18);
  guard.castShadow = true;
  dagger.add(guard);

  // 4. Steel Blade Outer Edge (Bevelled steel body)
  const steelBlade = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.02, 0.38), matArmor);
  steelBlade.position.set(0, 0, 0.39);
  steelBlade.castShadow = true;
  dagger.add(steelBlade);

  // 5. Glowing Cyan Energy Core / Spine (#00f0ff)
  const cyanCore = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.024, 0.36), matGlow);
  cyanCore.position.set(0, 0, 0.39);
  dagger.add(cyanCore);

  // 6. Diamond / Angled Pointed Tip (Cyan Energy Tip)
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.022, 0.06), matGlow);
  tip.position.set(0, 0, 0.60);
  tip.rotation.y = Math.PI / 4; // 45 degree diamond point
  dagger.add(tip);

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
 * Faithful 1:1 realization of the official orthographic blueprint.
 * ============================================================================
 */
export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRanger';

  // --- PALET MATERIAL (Exact Match with Reference Blueprint) ---
  const matSuit = new THREE.MeshStandardMaterial({
    color: 0x181a1d, // Hitam taktis stealth
    roughness: 0.85,
  });
  const matArmor = new THREE.MeshStandardMaterial({
    color: 0x4f545e, // Plat baja abu-abu baja (chestplate, pauldrons, boots, blade steel)
    roughness: 0.45,
    metalness: 0.35,
  });
  const matHood = new THREE.MeshStandardMaterial({
    color: 0x2b2e34, // Tudung & jubah gelap abu arang
    roughness: 0.90,
  });
  const matMask = new THREE.MeshStandardMaterial({
    color: 0x112022, // Masker wajah solid stealth gelap (#112022 / #23033)
    roughness: 0.95,
  });
  const matLeather = new THREE.MeshStandardMaterial({
    color: 0x3d2618, // Kulit cokelat sabuk, kantong amunisi, tabung panah
    roughness: 0.80,
  });
  const matBuckle = new THREE.MeshStandardMaterial({
    color: 0x8a929e, // Gesper sabuk logam baja kontras
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
    color: 0x00f0ff, // Cyan elektrik bercahaya (mata, bilah belati, tali busur)
    emissive: 0x00f0ff,
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

  // Gagang belati yang tersarung di sarung kiri (muncul saat busur aktif)
  const sheathedHiltL = new THREE.Group();
  const sHiltL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), matLeather);
  sHiltL.position.set(0, 0.14, 0);
  const sGuardL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), matArmor);
  sGuardL.position.set(0, 0.06, 0);
  sheathedHiltL.add(sHiltL, sGuardL);
  sheathedHiltL.visible = false; // Tersembunyi di stance belati
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

  // Gagang belati yang tersarung di sarung kanan (muncul saat busur aktif)
  const sheathedHiltR = new THREE.Group();
  const sHiltR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), matLeather);
  sHiltR.position.set(0, 0.14, 0);
  const sGuardR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), matArmor);
  sGuardR.position.set(0, 0.06, 0);
  sheathedHiltR.add(sHiltR, sGuardR);
  sheathedHiltR.visible = false; // Tersembunyi di stance belati
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
  // ==========================================
  const cape = new THREE.Group();
  cape.name = 'Hunter_Cape';
  cape.position.set(0, 1.48, -0.18);
  cape.rotation.x = -0.16; // Melambai anggun ke belakang tanpa menembus torso

  // Lembar jubah utama
  const capeSheet = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.70, 0.03), matHood);
  capeSheet.position.set(0, -0.35, 0);
  capeSheet.castShadow = true;
  cape.add(capeSheet);

  // Gerigi Tangga Bawah ("stair-case" / stepid kaku bottom cuts)
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.03), matHood);
  step1.position.set(-0.21, -0.77, 0);
  step1.castShadow = true;

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.03), matHood);
  step2.position.set(-0.07, -0.82, 0);
  step2.castShadow = true;

  const step3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.03), matHood);
  step3.position.set(0.07, -0.78, 0);
  step3.castShadow = true;

  const step4 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.03), matHood);
  step4.position.set(0.21, -0.84, 0);
  step4.castShadow = true;

  cape.add(step1, step2, step3, step4);
  torsoGroup.add(cape);

  // ==========================================
  // 5. TABUNG PANAH (QUIVER) DENGAN BULU PANAH
  // ==========================================
  const quiverGroup = new THREE.Group();
  quiverGroup.name = 'Hunter_Quiver';
  quiverGroup.position.set(0.15, 1.28, -0.24);
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
  // Terpasang di punggung saat di stance belati; hilang saat busur aktif di tangan
  // ==========================================
  const backBow = createRecurveBowMesh(matWood, matLeather, matGlow);
  backBow.name = 'BackSlungBow';
  backBow.position.set(-0.08, 1.28, -0.27);
  backBow.rotation.set(-0.15, 0.12, 0.55);
  torsoGroup.add(backBow);

  root.add(torsoGroup);

  // ==========================================
  // 7. KEPALA, TUDUNG BERSUDUT LANCIP & MASKER GELAP DENGAN MATA CYAN
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'Hunter_Head';
  headGroup.position.set(0, 1.50, 0);

  // Leher solid
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.20), matSuit);
  neck.position.set(0, 0.06, 0);
  neck.castShadow = true;
  headGroup.add(neck);

  // Masker Wajah Gelap Solid (Face mask #112022)
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.36), matMask);
  mask.position.set(0, 0.24, 0.04);
  mask.castShadow = true;
  headGroup.add(mask);

  // Mata Bercahaya Cyan (#00f0ff)
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.03), matGlow);
  eyeL.position.set(-0.10, 0.27, 0.23);

  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.03), matGlow);
  eyeR.position.set(0.10, 0.27, 0.23);
  headGroup.add(eyeL, eyeR);

  // Tudung Bersiku Lancip (Peaked Rogue Hood)
  // Atap tudung miring ke depan
  const hoodRoof = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.52), matHood);
  hoodRoof.position.set(0, 0.44, 0.04);
  hoodRoof.rotation.x = 0.20; // Miring ke depan menaungi mata
  hoodRoof.castShadow = true;

  // Puncak lancip tengah tudung (Crest Ridge)
  const hoodPeak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.48), matHood);
  hoodPeak.position.set(0, 0.48, 0.04);
  hoodPeak.rotation.x = 0.20;
  hoodPeak.castShadow = true;

  // Dinding samping kiri tudung
  const hoodL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.50), matHood);
  hoodL.position.set(-0.24, 0.26, 0.02);
  hoodL.castShadow = true;

  // Dinding samping kanan tudung
  const hoodR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.50), matHood);
  hoodR.position.set(0.24, 0.26, 0.02);
  hoodR.castShadow = true;

  // Penutup belakang tudung
  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.40, 0.06), matHood);
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
    hand.position.set(0, -0.44, 0.16);
    hand.castShadow = true;
    arm.add(hand);

    // -------------------------------------------------------------
    // WEAPON ATTACHMENTS TO HAND
    // -------------------------------------------------------------
    if (isLeft) {
      // 1. Belati Tangan Kiri
      handDaggerL = createSteelDaggerMesh(matLeather, matArmor, matGlow, true);
      handDaggerL.position.set(0, -0.44, 0.16);
      handDaggerL.rotation.y = -0.15; // Serong sedikit ke luar
      arm.add(handDaggerL);

      // 2. Busur Tangan Kiri (Active Bow Stance)
      handBow = createRecurveBowMesh(matWood, matLeather, matGlow);
      handBow.position.set(0, -0.44, 0.24);
      handBow.visible = false; // Tersembunyi saat dagger stance aktif
      arm.add(handBow);

      armLeft = arm;
    } else {
      // 1. Belati Tangan Kanan
      handDaggerR = createSteelDaggerMesh(matLeather, matArmor, matGlow, false);
      handDaggerR.position.set(0, -0.44, 0.16);
      handDaggerR.rotation.y = 0.15; // Serong sedikit ke luar
      arm.add(handDaggerR);

      // 2. Anak Panah di Tangan Kanan (Active Bow Stance)
      handArrow = createArrowMesh(matWood, matArmor, matFeather);
      handArrow.position.set(0, -0.44, 0.22);
      handArrow.visible = false; // Tersembunyi saat dagger stance aktif
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
  (root as any).cape = cape;
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
      playerMesh.cape.rotation.x = -0.16 - Math.abs(Math.sin(walkTime * 1.2)) * 0.20;
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
      playerMesh.cape.rotation.x = -0.16 - Math.sin(walkTime * 2.0) * 0.03;
    }
  }
}
