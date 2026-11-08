import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CharacterClass } from '../../types/game';
import {
  createHeroicKnightMesh,
  USE_LEGACY_KNIGHT,
  animateKnightWalk,
  animateKnightCombatPose,
  setKnightBladeGlow,
  resetKnightBladeGlow,
} from './KnightModel';
import { createLegacyKnightMesh } from './KnightModelLegacy';
import {
  createHeroicMageMesh,
  createLegacyMageMesh,
  USE_LEGACY_MAGE,
  animateMageWalk,
  animateMageSkillPose,
} from './MageModel';
import {
  createHunterModel,
  createBlockyHunterMesh,
  createLegacyHunterMesh,
  USE_LEGACY_HUNTER,
  animateHunterWalk,
} from './playerModel';

export {
  createHeroicKnightMesh,
  createLegacyKnightMesh,
  USE_LEGACY_KNIGHT,
  animateKnightWalk,
  animateKnightCombatPose,
  setKnightBladeGlow,
  resetKnightBladeGlow,
  createHeroicMageMesh,
  createLegacyMageMesh,
  USE_LEGACY_MAGE,
  animateMageWalk,
  animateMageSkillPose,
  createHunterModel,
  createBlockyHunterMesh,
  createLegacyHunterMesh,
  USE_LEGACY_HUNTER,
  animateHunterWalk,
};

// Materials cache to optimize performance and prevent memory duplication
export const createPaletteMaterials = () => {
  return {
    grass: new THREE.MeshLambertMaterial({ color: 0x4caf50, flatShading: true }),
    grassDark: new THREE.MeshLambertMaterial({ color: 0x388e3c, flatShading: true }),
    dirt: new THREE.MeshLambertMaterial({ color: 0x795548, flatShading: true }),
    stone: new THREE.MeshLambertMaterial({ color: 0x78909c, flatShading: true }),
    stoneDark: new THREE.MeshLambertMaterial({ color: 0x455a64, flatShading: true }),
    wood: new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true }),
    foliage: new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true }),
    foliageAutumn: new THREE.MeshLambertMaterial({ color: 0xe65100, flatShading: true }),
    foliageCyan: new THREE.MeshLambertMaterial({ color: 0x00897b, flatShading: true }),
    water: new THREE.MeshStandardMaterial({
      color: 0x0288d1,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.1,
    }),
    crystalBlue: new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    }),
    crystalRed: new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xd50000,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.8,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0xffa000,
      emissiveIntensity: 0.2,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.8, roughness: 0.2 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.9, roughness: 0.3 }),
    skin: new THREE.MeshLambertMaterial({ color: 0xffcc80, flatShading: true }),
  };
};

export interface PlayerMeshObjects {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm?: THREE.Group;
  leftHand?: THREE.Group;
  rightHand?: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weapon: THREE.Group;
  leftWeapon?: THREE.Group;
  shield?: THREE.Mesh;
  shieldGroup?: THREE.Group;
  cape: THREE.Mesh;
  body: THREE.Mesh;
  head: THREE.Mesh;
  charClass: CharacterClass;
  tier: number;
  orbMesh?: THREE.Mesh;
  orbRing?: THREE.Mesh;
  grimoire?: THREE.Group;
  orbitingOrbs?: THREE.Mesh[];
  wings?: THREE.Group;
  halo?: THREE.Mesh;
  halo2?: THREE.Mesh;
  auraRing?: THREE.Mesh;
  auraRing2?: THREE.Mesh;
  // Hunter (Pemburu) dual weapons: Panah & Belati
  daggerRight?: THREE.Group;
  daggerLeft?: THREE.Group;
  hunterBow?: THREE.Group;
  hunterBowStowed?: THREE.Group;
  hunterQuiver?: THREE.Group;
  sheathedDaggers?: THREE.Group;
  hunterWeaponMode?: 'dagger' | 'bow';
  setHunterWeaponMode?: (mode: 'dagger' | 'bow') => void;
}

export function createPlayerMesh(charClass: CharacterClass = 'warrior', tier: number = 1): PlayerMeshObjects {
  if ((charClass as string) === 'warrior') {
    return USE_LEGACY_KNIGHT ? createLegacyKnightMesh(tier) : createHeroicKnightMesh(tier);
  }
  if ((charClass as string) === 'mage') {
    return USE_LEGACY_MAGE ? createLegacyMageMesh(tier) : createHeroicMageMesh(tier);
  }
  if ((charClass as string) === 'rogue') {
    return USE_LEGACY_HUNTER ? createLegacyHunterMesh(tier) : createBlockyHunterMesh(tier);
  }

  const group = new THREE.Group();

  // Class colors & tier theme adjustments
  let primaryColor = 0x1976d2; // Warrior royal blue
  let secondaryColor = tier >= 3 ? 0xffd700 : 0xb0bec5; // Gold armor at tier 3+
  let capeColor = tier >= 3 ? 0xb91c1c : 0xd32f2f;

  if ((charClass as CharacterClass) === 'mage') {
    primaryColor = tier >= 3 ? 0x3b0764 : 0x5b21b6; // Deep cosmic violet
    secondaryColor = 0xf59e0b; // Amber gold trim
    capeColor = tier >= 3 ? 0x1e1b4b : 0x4c1d95; // Starlight nebula cape
  } else if (charClass === 'rogue') {
    primaryColor = tier >= 3 ? 0x022c22 : 0x065f46; // Abyssal shadow emerald
    secondaryColor = tier >= 3 ? 0x09090b : 0x1f2937; // Void leather
    capeColor = tier >= 3 ? 0x030712 : 0x064e3b; // Phantom cowl
  }

  const primaryMat = new THREE.MeshLambertMaterial({ color: primaryColor, flatShading: true });
  const armorMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    metalness: tier >= 3 ? 0.9 : 0.6,
    roughness: tier >= 3 ? 0.2 : 0.35,
    flatShading: true,
  });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd180, flatShading: true });
  const capeMat = new THREE.MeshLambertMaterial({ color: capeColor, side: THREE.DoubleSide, flatShading: true });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0,
    metalness: 0.85,
    roughness: 0.2,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.25 });
  const poisonMat = new THREE.MeshStandardMaterial({
    color: tier >= 3 ? 0x34d399 : 0x10b981,
    emissive: tier >= 3 ? 0x10b981 : 0x059669,
    emissiveIntensity: tier >= 4 ? 1.0 : tier >= 2 ? 0.75 : 0.4,
    metalness: 0.5,
  });
  const arcaneMat = new THREE.MeshStandardMaterial({
    color: tier >= 4 ? 0xe0e7ff : tier >= 3 ? 0xa855f7 : 0x00e5ff,
    emissive: tier >= 4 ? 0x6366f1 : tier >= 3 ? 0x9333ea : 0x00b0ff,
    emissiveIntensity: tier >= 4 ? 1.1 : 0.85,
    roughness: 0.1,
  });

  // Torso / Chest
  const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
  const body = new THREE.Mesh(torsoGeo, primaryMat);
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // Chestplate / Armor vest
  const chestPlateGeo = new THREE.BoxGeometry(0.74, 0.52, 0.48);
  const chestPlate = new THREE.Mesh(chestPlateGeo, armorMat);
  chestPlate.position.y = 1.45;
  chestPlate.castShadow = true;
  group.add(chestPlate);

  // Pauldrons (Shoulder Armor)
  if (charClass === 'rogue' && tier >= 2) {
    // Spiked leather assassin shoulder guards
    const pauldronGeo = new THREE.BoxGeometry(0.24, 0.18, 0.28);
    const lp = new THREE.Mesh(pauldronGeo, armorMat);
    lp.position.set(0.5, 1.82, 0);
    const rp = new THREE.Mesh(pauldronGeo, armorMat);
    rp.position.set(-0.5, 1.82, 0);
    group.add(lp, rp);
  } else if ((charClass as CharacterClass) === 'mage' && tier >= 2) {
    // Arcane shoulder mantle runes
    const mantleGeo = new THREE.BoxGeometry(0.26, 0.08, 0.3);
    const lm = new THREE.Mesh(mantleGeo, arcaneMat);
    lm.position.set(0.5, 1.82, 0);
    const rm = new THREE.Mesh(mantleGeo, arcaneMat);
    rm.position.set(-0.5, 1.82, 0);
    group.add(lm, rm);
  }

  // Belt
  const beltGeo = new THREE.BoxGeometry(0.72, 0.14, 0.48);
  const beltMat = new THREE.MeshLambertMaterial({ color: 0x212121 });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.y = 0.98;
  group.add(belt);

  const buckleGeo = new THREE.BoxGeometry(0.2, 0.16, 0.5);
  const buckle = new THREE.Mesh(buckleGeo, goldMat);
  buckle.position.y = 0.98;
  group.add(buckle);

  // Head
  const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);

  // Class Headgear
  if ((charClass as CharacterClass) === 'mage') {
    // Wizard pointed hat with brim and star
    const hatBaseGeo = new THREE.CylinderGeometry(0.52, 0.6, 0.08, 8);
    const hatBase = new THREE.Mesh(hatBaseGeo, primaryMat);
    hatBase.position.y = 2.32;
    group.add(hatBase);

    const hatBandGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.1, 8);
    const hatBand = new THREE.Mesh(hatBandGeo, goldMat);
    hatBand.position.y = 2.4;
    group.add(hatBand);

    const hatConeGeo = new THREE.ConeGeometry(0.34, 0.75, 7);
    const hatCone = new THREE.Mesh(hatConeGeo, primaryMat);
    hatCone.position.set(0, 2.75, -0.06);
    hatCone.rotation.x = -0.18;
    group.add(hatCone);
  } else {
    // Rogue hood cowl & ninja face mask
    const cowlGeo = new THREE.BoxGeometry(0.52, 0.32, 0.52);
    const cowl = new THREE.Mesh(cowlGeo, primaryMat);
    cowl.position.y = 2.24;
    group.add(cowl);

    const maskGeo = new THREE.BoxGeometry(0.49, 0.22, 0.2);
    const maskMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const mask = new THREE.Mesh(maskGeo, maskMat);
    mask.position.set(0, 1.96, 0.18);
    group.add(mask);
  }

  // Eyes (Glowing for rogue & mage)
  const eyeMat = charClass === 'rogue'
    ? new THREE.MeshBasicMaterial({ color: 0x34d399 }) // Glowing green assassin eyes
    : (charClass as CharacterClass) === 'mage'
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8 }) // Glowing celestial cyan eyes
    : new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.06, 0.05);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.14, 2.06, 0.24);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(-0.14, 2.06, 0.24);
  group.add(leftEye, rightEye);

  // Cape
  const capeGeo = new THREE.PlaneGeometry(0.65, 1.1, 3, 3);
  const cape = new THREE.Mesh(capeGeo, capeMat);
  cape.position.set(0, 1.3, -0.25);
  cape.rotation.x = 0.1;
  cape.castShadow = true;
  group.add(cape);

  // Arm pivots
  const armGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  armGeo.translate(0, -0.32, 0); // pivot at top shoulder

  const leftArm = new THREE.Group();
  leftArm.position.set(0.5, 1.7, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, primaryMat);
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(-0.5, 1.7, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, primaryMat);
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  group.add(rightArm);

  // Right Hand Weapon
  const weapon = new THREE.Group();
  let orbMesh: THREE.Mesh | undefined;
  let orbRing: THREE.Mesh | undefined;
  let leftWeapon: THREE.Group | undefined;
  let shield: THREE.Mesh | undefined;
  let grimoire: THREE.Group | undefined;
  let daggerRight: THREE.Group | undefined;
  let daggerLeft: THREE.Group | undefined;
  let hunterBow: THREE.Group | undefined;
  let hunterBowStowed: THREE.Group | undefined;
  let hunterQuiver: THREE.Group | undefined;
  let sheathedDaggers: THREE.Group | undefined;
  let hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  let setHunterWeaponMode: ((mode: 'dagger' | 'bow') => void) | undefined;

  if ((charClass as CharacterClass) === 'mage') {
    // Archmage Staff
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.055, 1.8, 6);
    shaftGeo.translate(0, 0.35, 0);
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x312e81 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);

    const headpieceGeo = new THREE.TorusGeometry(0.18, 0.03, 6, 12);
    headpieceGeo.rotateX(Math.PI / 2);
    const headpiece = new THREE.Mesh(headpieceGeo, goldMat);
    headpiece.position.set(0, 1.25, 0);

    const orbGeo = new THREE.IcosahedronGeometry(0.17, 1);
    orbMesh = new THREE.Mesh(orbGeo, arcaneMat);
    orbMesh.position.set(0, 1.25, 0);

    const ringGeo = new THREE.TorusGeometry(0.26, 0.02, 4, 16);
    orbRing = new THREE.Mesh(ringGeo, goldMat);
    orbRing.position.set(0, 1.25, 0);

    weapon.add(shaft, headpiece, orbMesh, orbRing);
    weapon.position.set(0, -0.65, 0.1);
    weapon.rotation.x = Math.PI / 6;

    // Floating Ancient Grimoire / Spellbook on left arm
    grimoire = new THREE.Group();
    const coverGeo = new THREE.BoxGeometry(0.32, 0.42, 0.08);
    const coverMat = new THREE.MeshLambertMaterial({ color: 0x4a044e });
    const cover = new THREE.Mesh(coverGeo, coverMat);

    const pagesGeo = new THREE.BoxGeometry(0.28, 0.38, 0.07);
    const pagesMat = new THREE.MeshLambertMaterial({ color: 0xfef08a });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.position.x = 0.02;

    const runeGlyph = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.09), arcaneMat);

    grimoire.add(cover, pages, runeGlyph);
    grimoire.position.set(0.18, -0.3, 0.22);
    grimoire.rotation.set(0.3, 0.4, -0.2);
    leftArm.add(grimoire);
  } else {
    // Rogue / Hunter (Pemburu) Dual Weapons: Dual Poison Daggers & Recurve Bow
    const woodBowMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.6 });
    const bowstringMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const quiverLeatherMat = new THREE.MeshLambertMaterial({ color: 0x271c19 });
    const fletchMat = new THREE.MeshLambertMaterial({ color: 0x10b981 });

    // 1. Mainhand Dagger (Right)
    const daggerGeo = new THREE.BoxGeometry(0.08, 0.75, 0.03);
    daggerGeo.translate(0, 0.35, 0);
    const daggerBlade = new THREE.Mesh(daggerGeo, poisonMat);
    const guardGeo = new THREE.BoxGeometry(0.22, 0.05, 0.06);
    const guard = new THREE.Mesh(guardGeo, armorMat);
    daggerRight = new THREE.Group();
    daggerRight.add(daggerBlade, guard);
    weapon.add(daggerRight);
    weapon.position.set(0, -0.55, 0.1);
    weapon.rotation.x = Math.PI / 2.5;

    // 2. Offhand Dagger (Left)
    leftWeapon = new THREE.Group();
    daggerLeft = new THREE.Group();
    const leftDaggerBlade = new THREE.Mesh(daggerGeo.clone(), poisonMat);
    const leftGuard = new THREE.Mesh(guardGeo.clone(), armorMat);
    daggerLeft.add(leftDaggerBlade, leftGuard);
    leftWeapon.add(daggerLeft);
    leftWeapon.position.set(0, -0.55, 0.1);
    leftWeapon.rotation.x = Math.PI / 2.5;
    leftArm.add(leftWeapon);

    // 3. Hunter Recurve Bow (Attached to Left Hand for Bow Combat)
    hunterBow = new THREE.Group();
    const bowGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.32, 6), goldMat);
    hunterBow.add(bowGrip);

    // Upper limb
    const upperLimb1 = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.42, 0.028), woodBowMat);
    upperLimb1.position.set(0, 0.32, 0.05);
    upperLimb1.rotation.x = 0.32;
    const upperLimb2 = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.32, 0.022), woodBowMat);
    upperLimb2.position.set(0, 0.62, -0.03);
    upperLimb2.rotation.x = -0.42;
    hunterBow.add(upperLimb1, upperLimb2);

    // Lower limb
    const lowerLimb1 = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.42, 0.028), woodBowMat);
    lowerLimb1.position.set(0, -0.32, 0.05);
    lowerLimb1.rotation.x = -0.32;
    const lowerLimb2 = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.32, 0.022), woodBowMat);
    lowerLimb2.position.set(0, -0.62, -0.03);
    lowerLimb2.rotation.x = 0.42;
    hunterBow.add(lowerLimb1, lowerLimb2);

    // Glowing Bowstring
    const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.45, 4), bowstringMat);
    bowString.position.set(0, 0, -0.14);
    hunterBow.add(bowString);

    // Position bow in left hand
    hunterBow.position.set(0.08, -0.4, 0.1);
    hunterBow.rotation.set(0, Math.PI / 2, 0);
    hunterBow.visible = false; // Initially hidden in dagger mode
    leftArm.add(hunterBow);

    // 4. Stowed Recurve Bow (Strapped across back during dagger mode)
    hunterBowStowed = hunterBow.clone();
    hunterBowStowed.position.set(0, 0, -0.3);
    hunterBowStowed.rotation.set(0.1, 0, 0.7);
    hunterBowStowed.visible = true;
    body.add(hunterBowStowed);

    // 5. Hunter Leather Quiver with Feathered Arrows (On back)
    hunterQuiver = new THREE.Group();
    const quiverPouch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.075, 0.72, 6), quiverLeatherMat);
    quiverPouch.rotation.z = -0.32;
    hunterQuiver.add(quiverPouch);

    for (let i = -1; i <= 1; i++) {
      const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 4), woodBowMat);
      arrowShaft.position.set(i * 0.05 - 0.08, 0.42, (i % 2) * 0.03);
      arrowShaft.rotation.z = -0.32 + i * 0.06;

      const fletch1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.01), fletchMat);
      fletch1.position.set(0, 0.34, 0);
      arrowShaft.add(fletch1);
      hunterQuiver.add(arrowShaft);
    }
    hunterQuiver.position.set(-0.16, 0.12, -0.3);
    hunterQuiver.rotation.set(0.08, 0, -0.28);
    body.add(hunterQuiver);

    // 6. Sheathed Daggers at Hips (Visible when bow is drawn)
    sheathedDaggers = new THREE.Group();
    const sheathGeo = new THREE.BoxGeometry(0.09, 0.55, 0.05);
    const sheath1 = new THREE.Mesh(sheathGeo, quiverLeatherMat);
    sheath1.position.set(-0.4, -0.28, 0.05);
    sheath1.rotation.set(0.2, 0, 0.2);
    const sheath2 = new THREE.Mesh(sheathGeo.clone(), quiverLeatherMat);
    sheath2.position.set(0.4, -0.28, 0.05);
    sheath2.rotation.set(0.2, 0, -0.2);
    sheathedDaggers.add(sheath1, sheath2);
    sheathedDaggers.visible = false;
    body.add(sheathedDaggers);

    // Toggle Function for Hunter
    setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
      hunterWeaponMode = mode;
      if (daggerRight && daggerLeft && hunterBow && hunterBowStowed && sheathedDaggers) {
        if (mode === 'bow') {
          daggerRight.visible = false;
          daggerLeft.visible = false;
          hunterBow.visible = true;
          hunterBowStowed.visible = false;
          sheathedDaggers.visible = true;
        } else {
          daggerRight.visible = true;
          daggerLeft.visible = true;
          hunterBow.visible = false;
          hunterBowStowed.visible = true;
          sheathedDaggers.visible = false;
        }
      }
    };
  }
  rightArm.add(weapon);

  // Leg pivots with anatomically grounded boots, greaves, toe caps, and tread soles
  const bootLeatherMat = new THREE.MeshLambertMaterial({
    color: charClass === 'rogue' ? 0x18181b : 0x3f3f46,
    flatShading: true,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const buildLegGroup = (posX: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(posX, 0.88, 0);

    // 1. Thigh / Upper Leg (pivot at hip y=0)
    const thighGeo = new THREE.BoxGeometry(0.28, 0.42, 0.28);
    thighGeo.translate(0, -0.21, 0);
    const thigh = new THREE.Mesh(thighGeo, primaryMat);
    thigh.castShadow = true;
    leg.add(thigh);

    // 2. Knee Guard / Poleyn Armor
    const kneeGeo = new THREE.BoxGeometry(0.30, 0.14, 0.14);
    const knee = new THREE.Mesh(kneeGeo, armorMat);
    knee.position.set(0, -0.42, 0.08);
    knee.castShadow = true;
    leg.add(knee);

    // 3. Lower Leg / Shin Greave
    const shinGeo = new THREE.BoxGeometry(0.27, 0.34, 0.27);
    shinGeo.translate(0, -0.58, 0);
    const shin = new THREE.Mesh(shinGeo, armorMat);
    shin.castShadow = true;
    leg.add(shin);

    // 4. Armored Boot Foot (with distinct toe extension forward +Z)
    const footGeo = new THREE.BoxGeometry(0.29, 0.18, 0.36);
    footGeo.translate(0, -0.77, 0.04);
    const foot = new THREE.Mesh(footGeo, bootLeatherMat);
    foot.castShadow = true;
    leg.add(foot);

    // 5. Boot Toe Cap Plate
    const toeGeo = new THREE.BoxGeometry(0.27, 0.12, 0.14);
    toeGeo.translate(0, -0.80, 0.16);
    const toe = new THREE.Mesh(toeGeo, armorMat);
    toe.castShadow = true;
    leg.add(toe);

    // 6. Solid Boot Sole / Tread (rests perfectly flush at character base y = 0.00)
    const soleGeo = new THREE.BoxGeometry(0.31, 0.04, 0.39);
    soleGeo.translate(0, -0.86, 0.04);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.receiveShadow = true;
    leg.add(sole);

    group.add(leg);
    return leg;
  };

  const leftLeg = buildLegGroup(0.2);
  const rightLeg = buildLegGroup(-0.2);

  // Tier-specific Special Features: Wings, Orbiting Orbs, Halos
  // Tier-specific Special Features: Wings, Orbiting Orbs, Halos, Divine Mandalas (Tiers 1 to 6)
  // Tier 1: Level 1-4 (Novice)
  // Tier 2: Level 5-9 (Adept - Rune gleams, Spiked pauldrons)
  // Tier 3: Level 10-24 (Master - Golden Halo, Orbiting Crystals, Ground Seal)
  // Tier 4: Level 25-49 (Grandmaster - Quad Radiant Wings, Dual Rotating Ground Seals)
  // Tier 5: Level 50-99 (Demigod - Hexa-Seraph Wings, Orbiting Glyphs, Cosmic Lightning)
  // Tier 6: Level 100+ (Transcendent God - Octa-Archangel Divine Wings, Supreme Twin Halos, Astral Star Relics, Golden Sacred Mandala)
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  let wings: THREE.Group | undefined;
  const orbitingOrbs: THREE.Mesh[] = [];
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  // 1. Halos (Tier 3+: Single Halo, Tier 5+: Crown Rays, Tier 6: Twin Hyper-Radiant Celestial Halos)
  if (tier >= 3) {
    const haloColor = (charClass as CharacterClass) === 'mage'
      ? (tier >= 6 ? 0xe0e7ff : 0x38bdf8)
      : (tier >= 6 ? 0x6ee7b7 : 0x10b981);
    const haloRadius = tier >= 5 ? 0.42 : 0.35;
    const haloTube = tier >= 6 ? 0.045 : 0.035;
    const haloGeo = new THREE.TorusGeometry(haloRadius, haloTube, 6, 20);
    haloGeo.rotateX(Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.9 });
    halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 2.65;
    group.add(halo);

    if (tier >= 6) {
      // Second concentric outer divine halo
      const outerHaloGeo = new THREE.TorusGeometry(0.56, 0.025, 6, 24);
      outerHaloGeo.rotateX(Math.PI / 2);
      const outerHaloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
      halo2 = new THREE.Mesh(outerHaloGeo, outerHaloMat);
      halo2.position.y = 2.68;
      group.add(halo2);

      // 4 Radiant Cross Beams above crown
      for (let r = 0; r < 4; r++) {
        const ray = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const rayAngle = (r / 4) * Math.PI * 2;
        ray.position.set(Math.cos(rayAngle) * 0.48, 2.7, Math.sin(rayAngle) * 0.48);
        group.add(ray);
      }
    }
  }

  // 2. Wings (Tier 4: Quad Wings, Tier 5: Hexa-Seraph Wings, Tier 6: Octa-Archangel God Wings)
  if (tier >= 4) {
    wings = new THREE.Group();
    wings.position.set(0, 1.6, -0.26);

    const wingMat = (charClass as CharacterClass) === 'mage'
      ? new THREE.MeshStandardMaterial({
          color: tier >= 6 ? 0xe0e7ff : 0x818cf8,
          emissive: tier >= 6 ? 0xa5b4fc : 0x4f46e5,
          emissiveIntensity: tier >= 6 ? 1.4 : tier >= 5 ? 1.1 : 0.8,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshStandardMaterial({
          color: tier >= 6 ? 0xd1fae5 : 0x059669,
          emissive: tier >= 6 ? 0x34d399 : 0x064e3b,
          emissiveIntensity: tier >= 6 ? 1.4 : tier >= 5 ? 1.1 : 0.8,
          side: THREE.DoubleSide,
        });

    const featherCount = tier >= 6 ? 8 : tier >= 5 ? 6 : 4;
    const wingSpanScale = tier >= 6 ? 1.55 : tier >= 5 ? 1.3 : 1.0;

    // Left Wing
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
    // Right Wing
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

  // 3. Orbiting Relics & Mana Crystals (Mage: Crystals, Warrior: Golden Sigils, Rogue: Emerald Shurikens)
  if (tier >= 3) {
    const orbCount = tier >= 6 ? 6 : tier >= 5 ? 4 : ((charClass as CharacterClass) === 'mage' ? (tier >= 4 ? 3 : 2) : 2);
    const orbColors = (charClass as CharacterClass) === 'mage'
      ? [0x00e5ff, 0xa855f7, 0xfbbf24, 0x67e8f9, 0xffffff, 0xc084fc]
      : [0x10b981, 0x34d399, 0x059669, 0x6ee7b7, 0xffffff, 0x14b8a6];

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
  }

  // 4. Ground Aura Rings & Sacred Mandalas (Tier 3+: Single Ring, Tier 5+: Dual Rings, Tier 6: Transcendent Sun Mandala)
  if (tier >= 3) {
    const auraColor = (charClass as CharacterClass) === 'mage' ? 0x8b5cf6 : 0x10b981;
    const ringGeo = new THREE.RingGeometry(0.65, tier >= 5 ? 0.85 : 0.78, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: tier >= 6 ? 0.85 : 0.6,
    });
    auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.position.y = 0.05;
    group.add(auraRing);

    if (tier >= 5) {
      // Counter-rotating outer celestial rune ring
      const outerRingGeo = new THREE.RingGeometry(1.05, 1.22, 32);
      outerRingGeo.rotateX(-Math.PI / 2);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: tier >= 6 ? 0xffffff : auraColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: tier >= 6 ? 0.75 : 0.45,
      });
      auraRing2 = new THREE.Mesh(outerRingGeo, outerRingMat);
      auraRing2.position.y = 0.06;
      group.add(auraRing2);
    }
  }

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weapon,
    leftWeapon,
    shield,
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
    daggerRight,
    daggerLeft,
    hunterBow,
    hunterBowStowed,
    hunterQuiver,
    sheathedDaggers,
    hunterWeaponMode,
    setHunterWeaponMode,
  };
}

// 3D Arrow Mesh for Hunter Bow Attacks
export function createArrowMesh(): THREE.Group {
  const arrow = new THREE.Group();
  const shaftMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.85, roughness: 0.2 });
  const fletchMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

  // Arrow shaft (points along +Z forward)
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 5), shaftMat);
  shaft.rotation.x = Math.PI / 2;
  arrow.add(shaft);

  // Metal arrowhead (cone pointing +Z)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), tipMat);
  tip.position.set(0, 0, 0.52);
  tip.rotation.x = Math.PI / 2;
  arrow.add(tip);

  // Green fletchings at tail
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.01), fletchMat);
  f1.position.set(0, 0, -0.36);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, 0.08), fletchMat);
  f2.position.set(0, 0, -0.36);
  arrow.add(f1, f2);

  // Glowing trail tip
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.85 })
  );
  glow.position.set(0, 0, -0.42);
  arrow.add(glow);

  return arrow;
}

// NPC Elder Vaelen
export function createNPCMesh(): THREE.Group {
  const group = new THREE.Group();

  // Robe
  const robeMat = new THREE.MeshLambertMaterial({ color: 0x311b92, flatShading: true });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0xffd54f, flatShading: true });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd180, flatShading: true });
  const beardMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee, flatShading: true });

  const robeGeo = new THREE.CylinderGeometry(0.35, 0.6, 1.5, 8);
  const robe = new THREE.Mesh(robeGeo, robeMat);
  robe.position.y = 0.75;
  robe.castShadow = true;
  group.add(robe);

  // Head
  const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.65;
  group.add(head);

  // Beard
  const beardGeo = new THREE.ConeGeometry(0.2, 0.6, 6);
  const beard = new THREE.Mesh(beardGeo, beardMat);
  beard.position.set(0, 1.4, 0.15);
  beard.rotation.x = -0.2;
  group.add(beard);

  // Wizard Hat
  const brimGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 8);
  const brim = new THREE.Mesh(brimGeo, robeMat);
  brim.position.y = 1.85;
  group.add(brim);

  const hatConeGeo = new THREE.ConeGeometry(0.4, 0.9, 8);
  const hatCone = new THREE.Mesh(hatConeGeo, robeMat);
  hatCone.position.set(0, 2.3, -0.1);
  hatCone.rotation.x = -0.2;
  group.add(hatCone);

  // Glowing Crystal Staff
  const staffShaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6);
  staffShaftGeo.translate(0, 1.05, 0);
  const staffShaft = new THREE.Mesh(staffShaftGeo, new THREE.MeshLambertMaterial({ color: 0x4e342e }));
  staffShaft.position.set(0.5, 0, 0.2);

  const crystalGeo = new THREE.OctahedronGeometry(0.22, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.9,
    roughness: 0.1,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.set(0.5, 2.15, 0.2);
  group.add(staffShaft, crystal);

  // Floating quest exclamation icon
  const iconGroup = new THREE.Group();
  iconGroup.name = 'questIcon';
  const iconGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
  const dotGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const iconMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
  const iconBar = new THREE.Mesh(iconGeo, iconMat);
  iconBar.position.y = 0.2;
  const iconDot = new THREE.Mesh(dotGeo, iconMat);
  iconDot.position.y = -0.2;
  iconGroup.add(iconBar, iconDot);
  iconGroup.position.y = 2.9;
  group.add(iconGroup);

  return group;
}


/**
 * Colossal Quadrupedal Winged Dragon Boss: Ignis, Sang Naga Purba
 * Menacing winged obsidian dragon with magma underbelly, serpentine neck, horned skull, and articulated wings & tail
 */
export function createDragonBossMesh(): {
  group: THREE.Group;
  parts: Record<string, any>;
} {
  const group = new THREE.Group();
  const parts: Record<string, any> = {};

  // Colossal scale lock for intimidating presence in Dragonfang Caldera
  group.scale.set(4.2, 4.2, 4.2);

  // Volcanic dragon materials
  const dragonScaleMat = new THREE.MeshStandardMaterial({
    color: 0x141212,
    roughness: 0.72,
    metalness: 0.28,
    flatShading: true,
  });

  const dragonLavaMat = new THREE.MeshStandardMaterial({
    color: 0xd32f2f,
    emissive: 0xff3d00,
    emissiveIntensity: 1.6,
    roughness: 0.35,
    flatShading: true,
  });

  const dragonHornMat = new THREE.MeshStandardMaterial({
    color: 0x1f0c0c,
    emissive: 0xaa2200,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.5,
    flatShading: true,
  });

  const dragonEyeMat = new THREE.MeshBasicMaterial({
    color: 0xff3d00,
  });

  const dragonWingMat = new THREE.MeshStandardMaterial({
    color: 0x4a0e0e,
    emissive: 0x220505,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.65,
    flatShading: true,
  });

  // 1. Torso / Muscular Chest
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.35, 0);

  const chestGeo = new THREE.CylinderGeometry(0.55, 0.78, 1.7, 8);
  chestGeo.rotateX(Math.PI / 2);
  const chest = new THREE.Mesh(chestGeo, dragonScaleMat);
  chest.castShadow = true;
  torsoGroup.add(chest);

  // Magma Glowing Belly Plates with stratified fissures
  const bellyGeo = new THREE.CylinderGeometry(0.44, 0.62, 1.55, 6, 1, false, Math.PI * 0.7, Math.PI * 0.6);
  bellyGeo.rotateX(Math.PI / 2);
  const belly = new THREE.Mesh(bellyGeo, dragonLavaMat);
  belly.position.set(0, -0.16, 0);
  torsoGroup.add(belly);

  // Dorsal Carapace Spines along upper back
  for (let i = -0.7; i <= 0.7; i += 0.28) {
    const spineGeo = new THREE.ConeGeometry(0.13, 0.52, 4);
    spineGeo.rotateX(-0.35);
    const spine = new THREE.Mesh(spineGeo, dragonLavaMat);
    spine.position.set(0, 0.58, i);
    torsoGroup.add(spine);

    // Flanking lateral spikes
    for (const side of [-1, 1]) {
      const latSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 4), dragonHornMat);
      latSpike.position.set(side * 0.45, 0.38, i);
      latSpike.rotation.z = side * 0.7;
      torsoGroup.add(latSpike);
    }
  }

  // Internal flame hearth core
  const flameHeart = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), dragonLavaMat);
  flameHeart.position.set(0, 0.1, 0.2);
  torsoGroup.add(flameHeart);

  group.add(torsoGroup);
  parts.torso = torsoGroup;

  // 2. Long Arching Serpentine Neck & Head
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.7, 0.7);

  const neckSegment1 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 0.75, 7), dragonScaleMat);
  neckSegment1.rotation.x = -0.58;
  neckSegment1.position.set(0, 0.26, 0.2);
  neckGroup.add(neckSegment1);

  const neckSegment2 = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.36, 0.75, 7), dragonScaleMat);
  neckSegment2.rotation.x = -0.28;
  neckSegment2.position.set(0, 0.72, 0.48);
  neckGroup.add(neckSegment2);

  // Ventral glowing throat plates
  const throat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.16), dragonLavaMat);
  throat.position.set(0, 0.48, 0.42);
  throat.rotation.x = -0.42;
  neckGroup.add(throat);

  // Dragon Skull Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.08, 0.62);

  const skullGeo = new THREE.BoxGeometry(0.5, 0.4, 0.78);
  const skull = new THREE.Mesh(skullGeo, dragonScaleMat);
  skull.position.set(0, 0, 0.26);
  headGroup.add(skull);

  const snoutGeo = new THREE.ConeGeometry(0.34, 0.72, 5);
  snoutGeo.rotateX(Math.PI / 2);
  const snout = new THREE.Mesh(snoutGeo, dragonScaleMat);
  snout.position.set(0, -0.05, 0.78);
  headGroup.add(snout);

  // Fiery glowing eyes (Glowing Red/Orange)
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), dragonEyeMat);
  leftEye.position.set(0.23, 0.13, 0.4);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), dragonEyeMat);
  rightEye.position.set(-0.23, 0.13, 0.4);
  headGroup.add(leftEye, rightEye);

  // Eye Brow Ridges
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), dragonHornMat);
    brow.position.set(side * 0.24, 0.22, 0.38);
    brow.rotation.z = side * 0.25;
    headGroup.add(brow);
  }

  // Crown of Volcanic Fiery Horns
  // 1. Primary Swept-Back Horns with Lava Tips
  const hornGeo = new THREE.ConeGeometry(0.13, 1.25, 5);
  hornGeo.rotateX(-0.82);
  const leftHorn = new THREE.Mesh(hornGeo, dragonHornMat);
  leftHorn.position.set(0.25, 0.32, -0.16);
  leftHorn.rotation.z = -0.28;
  const rightHorn = new THREE.Mesh(hornGeo, dragonHornMat);
  rightHorn.position.set(-0.25, 0.32, -0.16);
  rightHorn.rotation.z = 0.28;
  headGroup.add(leftHorn, rightHorn);

  // Horn Magma Tips
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 4), dragonLavaMat);
    tip.position.set(side * 0.38, 0.95, -0.75);
    tip.rotation.set(-0.82, 0, side * -0.28);
    headGroup.add(tip);
  }

  // 2. Secondary Brow Horns
  for (const side of [-1, 1]) {
    const secHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 4), dragonHornMat);
    secHorn.position.set(side * 0.28, 0.25, 0.05);
    secHorn.rotation.set(-0.45, 0, side * -0.45);
    headGroup.add(secHorn);
  }

  // 3. Cheek Horns
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 4), dragonHornMat);
    cheek.position.set(side * 0.29, -0.06, 0.12);
    cheek.rotation.set(0, 0, side * -1.25);
    headGroup.add(cheek);
  }

  // Jaw with Jagged Teeth
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.68), dragonScaleMat);
  jaw.position.set(0, -0.19, 0.36);
  headGroup.add(jaw);

  // Jagged Obsidian Teeth along upper and lower jaw
  for (let t = -0.14; t <= 0.14; t += 0.07) {
    const upperTooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 3), dragonHornMat);
    upperTooth.position.set(t, -0.12, 0.65);
    upperTooth.rotation.x = Math.PI;
    headGroup.add(upperTooth);

    const lowerTooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 3), dragonHornMat);
    lowerTooth.position.set(t, -0.14, 0.63);
    headGroup.add(lowerTooth);
  }

  // Internal Maw Flame Core
  const flameCore = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), dragonLavaMat);
  flameCore.position.set(0, -0.06, 0.52);
  headGroup.add(flameCore);
  parts.flameCore = flameCore;

  neckGroup.add(headGroup);
  group.add(neckGroup);
  parts.neck = neckGroup;
  parts.head = headGroup;

  // 3. Colossal Anatomical Wings with Organic Body Membrane Connection
  const createWing = (isLeft: boolean) => {
    const wingRoot = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    wingRoot.position.set(sign * 0.55, 1.85, 0.15);

    // Shoulder Socket / Muscular Scapula Joint firmly anchoring wing into torso
    const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 7), dragonScaleMat);
    shoulderJoint.scale.set(1.1, 0.85, 1.2);
    wingRoot.add(shoulderJoint);

    // Humerus (Upper arm bone)
    const humerusGeo = new THREE.CylinderGeometry(0.13, 0.18, 1.5, 6);
    humerusGeo.rotateZ(sign * (Math.PI / 4));
    const humerus = new THREE.Mesh(humerusGeo, dragonScaleMat);
    humerus.position.set(sign * 0.55, 0.45, 0);
    wingRoot.add(humerus);

    // Armored Lava Shoulder Spikes
    const shoulderSpike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 4), dragonLavaMat);
    shoulderSpike.position.set(sign * 0.2, 0.35, 0);
    shoulderSpike.rotation.z = sign * -0.4;
    wingRoot.add(shoulderSpike);

    // Inner Wing Membrane (Direct connection between Torso Flank, Shoulder, and Elbow)
    // Seamless bridge that connects wing organically to the body without gaps!
    const innerMembraneGeo = new THREE.BufferGeometry();
    const innerVerts = new Float32Array([
      0, -0.5, -0.15,
      sign * 0.55, 0.45, 0,
      sign * 1.05, 0.88, 0,
      0, -0.5, -0.15,
      sign * 1.05, 0.88, 0,
      sign * 0.4, -0.7, -0.25,
    ]);
    innerMembraneGeo.setAttribute('position', new THREE.BufferAttribute(innerVerts, 3));
    innerMembraneGeo.computeVertexNormals();
    const innerMembrane = new THREE.Mesh(innerMembraneGeo, dragonWingMat);
    wingRoot.add(innerMembrane);

    // Forearm Group (Elbow to Hand)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(sign * 1.05, 0.88, 0);

    // Carpal Elbow Joint & Thumb Spur Claw
    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), dragonScaleMat);
    forearmGroup.add(elbowJoint);

    const thumbSpur = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), dragonHornMat);
    thumbSpur.position.set(0, 0.18, 0.15);
    thumbSpur.rotation.x = 0.6;
    forearmGroup.add(thumbSpur);

    // Forearm Bones (Radius / Ulna)
    const radiusGeo = new THREE.CylinderGeometry(0.09, 0.13, 1.9, 6);
    radiusGeo.rotateZ(sign * (-Math.PI / 5.5));
    const radiusMesh = new THREE.Mesh(radiusGeo, dragonScaleMat);
    radiusMesh.position.set(sign * 0.75, 0.45, 0);
    forearmGroup.add(radiusMesh);

    // 3 Wing Finger Struts
    const finger1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, 2.4, 5), dragonScaleMat);
    finger1.position.set(sign * 1.3, 0.25, -0.45);
    finger1.rotation.set(0.32, 0, sign * (-0.42));
    forearmGroup.add(finger1);

    const finger2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.075, 2.7, 5), dragonScaleMat);
    finger2.position.set(sign * 1.5, -0.12, -0.95);
    finger2.rotation.set(0.52, 0, sign * (-0.72));
    forearmGroup.add(finger2);

    const finger3 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 2.2, 5), dragonScaleMat);
    finger3.position.set(sign * 1.2, -0.45, -1.35);
    finger3.rotation.set(0.68, 0, sign * (-0.95));
    forearmGroup.add(finger3);

    // Main Wing Webbing Membrane Mesh
    const mainMembraneGeo = new THREE.BufferGeometry();
    const p0 = [0, 0, 0];
    const p1 = [sign * 1.3, 0.85, 0];
    const p2 = [sign * 2.5, 0.75, -0.45];
    const p3 = [sign * 2.6, -0.2, -1.1];
    const p4 = [sign * 1.8, -0.8, -1.6];
    const p5 = [sign * 0.8, -0.9, -0.8];

    const webVerts = new Float32Array([
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p0[0], p0[1], p0[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2],
      p0[0], p0[1], p0[2],
      p3[0], p3[1], p3[2],
      p4[0], p4[1], p4[2],
      p0[0], p0[1], p0[2],
      p4[0], p4[1], p4[2],
      p5[0], p5[1], p5[2],
    ]);
    mainMembraneGeo.setAttribute('position', new THREE.BufferAttribute(webVerts, 3));
    mainMembraneGeo.computeVertexNormals();
    const mainMembrane = new THREE.Mesh(mainMembraneGeo, dragonWingMat);
    forearmGroup.add(mainMembrane);

    wingRoot.add(forearmGroup);
    wingRoot.rotation.y = sign * 0.22;
    wingRoot.rotation.x = -0.2;
    return { wingRoot, forearmGroup };
  };

  const leftWing = createWing(true);
  const rightWing = createWing(false);
  group.add(leftWing.wingRoot);
  group.add(rightWing.wingRoot);
  parts.leftWing = leftWing.wingRoot;
  parts.rightWing = rightWing.wingRoot;

  // 4. Quadrupedal Sturdy Dragon Legs with Layered Volcanic Carapace
  const createForeleg = (isLeft: boolean) => {
    const sign = isLeft ? 1 : -1;
    const legGroup = new THREE.Group();
    legGroup.position.set(sign * 0.65, 1.25, 0.55);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), dragonScaleMat);
    legGroup.add(shoulder);

    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.85, 6), dragonScaleMat);
    upperLeg.position.set(0, -0.32, 0);
    upperLeg.rotation.z = sign * 0.15;
    legGroup.add(upperLeg);

    const elbowSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), dragonLavaMat);
    elbowSpike.position.set(0, -0.65, -0.15);
    elbowSpike.rotation.x = -0.7;
    legGroup.add(elbowSpike);

    const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.85, 6), dragonScaleMat);
    lowerLeg.position.set(0, -0.88, 0.08);
    lowerLeg.rotation.x = -0.2;
    legGroup.add(lowerLeg);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.52), dragonScaleMat);
    foot.position.set(0, -1.22, 0.2);
    legGroup.add(foot);

    for (let c = -0.13; c <= 0.13; c += 0.13) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.25, 4), dragonHornMat);
      claw.rotateX(Math.PI / 2);
      claw.position.set(c, -1.22, 0.48);
      legGroup.add(claw);
    }

    return legGroup;
  };

  const frontLeftLeg = createForeleg(true);
  const frontRightLeg = createForeleg(false);
  group.add(frontLeftLeg, frontRightLeg);
  parts.frontLeftLeg = frontLeftLeg;
  parts.frontRightLeg = frontRightLeg;

  const createHindLeg = (isLeft: boolean) => {
    const sign = isLeft ? 1 : -1;
    const legGroup = new THREE.Group();
    legGroup.position.set(sign * 0.7, 1.35, -0.55);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.35, 0.95, 7), dragonScaleMat);
    thigh.position.set(0, -0.38, 0);
    thigh.rotation.x = 0.35;
    legGroup.add(thigh);

    // Thigh armor scute
    const thighScute = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), dragonLavaMat);
    thighScute.position.set(sign * 0.25, -0.35, 0);
    legGroup.add(thighScute);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.9, 6), dragonScaleMat);
    shin.position.set(0, -0.9, -0.15);
    shin.rotation.x = -0.35;
    legGroup.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.58), dragonScaleMat);
    foot.position.set(0, -1.28, 0.1);
    legGroup.add(foot);

    for (let c = -0.15; c <= 0.15; c += 0.15) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 4), dragonHornMat);
      claw.rotateX(Math.PI / 2);
      claw.position.set(c, -1.28, 0.4);
      legGroup.add(claw);
    }

    return legGroup;
  };

  const hindLeftLeg = createHindLeg(true);
  const hindRightLeg = createHindLeg(false);
  group.add(hindLeftLeg, hindRightLeg);
  parts.leftLeg = hindLeftLeg;
  parts.rightLeg = hindRightLeg;

  // 5. Long Magma Spiked Dragon Tail with Heavy Spear/Flange Blade
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 1.3, -0.78);

  const tailSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.95, 7), dragonScaleMat);
  tailSeg1.rotation.x = -Math.PI / 3;
  tailSeg1.position.set(0, -0.22, -0.38);
  tailGroup.add(tailSeg1);

  const tailSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.15, 6), dragonScaleMat);
  tailSeg2.rotation.x = -Math.PI / 4;
  tailSeg2.position.set(0, -0.58, -1.1);
  tailGroup.add(tailSeg2);

  const tailSeg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.35, 5), dragonScaleMat);
  tailSeg3.rotation.x = -0.42;
  tailSeg3.position.set(0, -0.8, -2.0);
  tailGroup.add(tailSeg3);

  const tailSeg4 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 5), dragonScaleMat);
  tailSeg4.rotation.x = -0.25;
  tailSeg4.position.set(0, -0.95, -3.0);
  tailGroup.add(tailSeg4);

  // Fiery Molten Spikes running along the entire tail
  const tailSpineZ = [-0.3, -0.7, -1.1, -1.5, -1.9, -2.4, -2.9];
  const tailSpineY = [-0.15, -0.35, -0.52, -0.68, -0.78, -0.88, -0.92];
  tailSpineZ.forEach((tz, idx) => {
    const sGeo = new THREE.ConeGeometry(0.08, 0.38 - idx * 0.03, 4);
    sGeo.rotateX(-0.5);
    const spike = new THREE.Mesh(sGeo, dragonLavaMat);
    spike.position.set(0, tailSpineY[idx] + 0.22, tz);
    tailGroup.add(spike);

    // Bilateral horizontal barbs
    for (const side of [-1, 1]) {
      const bGeo = new THREE.ConeGeometry(0.05, 0.24 - idx * 0.02, 4);
      bGeo.rotateZ(side * Math.PI / 2);
      const barb = new THREE.Mesh(bGeo, dragonHornMat);
      barb.position.set(side * 0.22, tailSpineY[idx], tz);
      tailGroup.add(barb);
    }
  });

  // Heavy Spear-Head Tail Blade with glowing magma flanges
  const tailBlade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 4), dragonHornMat);
  tailBlade.rotateX(-Math.PI / 2);
  tailBlade.position.set(0, -0.95, -3.8);
  tailGroup.add(tailBlade);

  for (const side of [-1, 1]) {
    const flange = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.75), dragonLavaMat);
    flange.position.set(side * 0.22, -0.95, -3.65);
    flange.rotation.z = side * 0.3;
    tailGroup.add(flange);
  }

  group.add(tailGroup);
  parts.tail = tailGroup;

  return { group, parts };
}

export function createCheckpointMonumentMesh(unlocked: boolean = false): {
  group: THREE.Group;
  crystal: THREE.Mesh;
  auraRings: THREE.Mesh[];
  light: THREE.PointLight;
  beacon: THREE.Mesh;
  setUnlocked: (unlocked: boolean) => void;
} {
  const group = new THREE.Group();

  // 1. Tiered Ancient Stone Altar Base
  const stoneBaseMat = new THREE.MeshStandardMaterial({
    color: 0x3e3835,
    roughness: 0.85,
    metalness: 0.2,
    flatShading: true,
  });

  const baseLower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.4, 8), stoneBaseMat);
  baseLower.position.y = 0.2;
  baseLower.castShadow = true;
  baseLower.receiveShadow = true;
  group.add(baseLower);

  const baseUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, 0.35, 8), stoneBaseMat);
  baseUpper.position.y = 0.55;
  baseUpper.castShadow = true;
  group.add(baseUpper);

  // 2. Perimeter Rune Focus Obelisks
  const obeliskMat = new THREE.MeshStandardMaterial({
    color: 0x252321,
    roughness: 0.7,
    metalness: 0.3,
  });

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 1.2, 4), obeliskMat);
    obelisk.position.set(Math.cos(angle) * 1.15, 1.15, Math.sin(angle) * 1.15);
    obelisk.rotation.y = angle + Math.PI / 4;
    group.add(obelisk);

    const tipMat = new THREE.MeshBasicMaterial({
      color: unlocked ? 0x00e5ff : 0xff9100,
    });
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), tipMat);
    tip.position.set(Math.cos(angle) * 1.15, 1.82, Math.sin(angle) * 1.15);
    group.add(tip);
  }

  // 3. Central Hovering Faceted Grand Crystal
  const crystalMat = new THREE.MeshStandardMaterial({
    color: unlocked ? 0x00e5ff : 0xffa000,
    emissive: unlocked ? 0x00e5ff : 0xff8f00,
    emissiveIntensity: unlocked ? 1.25 : 0.45,
    roughness: 0.15,
    metalness: 0.4,
    transparent: true,
    opacity: 0.92,
  });

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), crystalMat);
  crystal.position.y = 2.2;
  crystal.scale.set(1, 1.45, 1);
  group.add(crystal);

  // 4. Rotating Magical Aura Rings
  const auraRings: THREE.Mesh[] = [];
  const ringMat = new THREE.MeshBasicMaterial({
    color: unlocked ? 0x80d8ff : 0xffd54f,
    transparent: true,
    opacity: unlocked ? 0.75 : 0.35,
    side: THREE.DoubleSide,
  });

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.035, 8, 32), ringMat);
  ring1.position.y = 2.2;
  ring1.rotation.x = Math.PI / 3;
  group.add(ring1);
  auraRings.push(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.03, 8, 32), ringMat);
  ring2.position.y = 2.2;
  ring2.rotation.x = -Math.PI / 4;
  ring2.rotation.y = Math.PI / 6;
  group.add(ring2);
  auraRings.push(ring2);

  // 5. Vertical Celestial Light Beacon
  const beaconMat = new THREE.MeshBasicMaterial({
    color: unlocked ? 0x00e5ff : 0xffb300,
    transparent: true,
    opacity: unlocked ? 0.28 : 0.06,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8.0, 16, 1, true), beaconMat);
  beacon.position.y = 4.5;
  group.add(beacon);

  // 6. Dynamic Point Light
  const light = new THREE.PointLight(unlocked ? 0x00e5ff : 0xff9100, unlocked ? 2.4 : 0.7, 15);
  light.position.set(0, 2.3, 0);
  group.add(light);

  const setUnlocked = (isUnlocked: boolean) => {
    crystalMat.color.setHex(isUnlocked ? 0x00e5ff : 0xffa000);
    crystalMat.emissive.setHex(isUnlocked ? 0x00e5ff : 0xff8f00);
    crystalMat.emissiveIntensity = isUnlocked ? 1.25 : 0.45;

    ringMat.color.setHex(isUnlocked ? 0x80d8ff : 0xffd54f);
    ringMat.opacity = isUnlocked ? 0.75 : 0.35;

    beaconMat.color.setHex(isUnlocked ? 0x00e5ff : 0xffb300);
    beaconMat.opacity = isUnlocked ? 0.28 : 0.06;

    light.color.setHex(isUnlocked ? 0x00e5ff : 0xff9100);
    light.intensity = isUnlocked ? 2.4 : 0.7;
  };

  return { group, crystal, auraRings, light, beacon, setUnlocked };
}

// Enemy models: Slime, Magma Slime, Skeleton, Skeleton Mage, Goblin, Golem, Spider, Frost Wolf, Swamp Crawler, Boss
export function createEnemyMesh(
  type: 'slime' | 'magma_slime' | 'skeleton' | 'skeleton_mage' | 'goblin' | 'golem' | 'spider' | 'frost_wolf' | 'swamp_crawler' | 'boss' | 'dragon' | 'worm'
): {
  group: THREE.Group;
  parts: Record<string, any>;
} {
  if (type === 'dragon') {
    return createDragonBossMesh();
  }
  if (type === 'worm') {
    return createSandwormBossMesh();
  }

  const group = new THREE.Group();
  const parts: Record<string, any> = {};

  if (type === 'slime') {
    // Gelatinous bouncy dome
    const slimeMat = new THREE.MeshStandardMaterial({
      color: 0x66bb6a,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    });
    const slimeGeo = new THREE.SphereGeometry(0.7, 10, 8);
    slimeGeo.scale(1, 0.7, 1);
    const body = new THREE.Mesh(slimeGeo, slimeMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);
    parts.body = body;

    // Slime Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.12, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.2, 0.5, 0.58);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.2, 0.5, 0.58);
    group.add(leftEye, rightEye);

    // Cute blush
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xef5350 });
    const blushGeo = new THREE.BoxGeometry(0.08, 0.05, 0.04);
    const b1 = new THREE.Mesh(blushGeo, blushMat);
    b1.position.set(0.28, 0.4, 0.55);
    const b2 = new THREE.Mesh(blushGeo, blushMat);
    b2.position.set(-0.28, 0.4, 0.55);
    group.add(b1, b2);
  } else if (type === 'magma_slime') {
    // Molten flaming magma slime
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      emissive: 0xff5722,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });
    const slimeGeo = new THREE.SphereGeometry(0.75, 10, 8);
    slimeGeo.scale(1, 0.72, 1);
    const body = new THREE.Mesh(slimeGeo, magmaMat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);
    parts.body = body;

    // Glowing Lava Core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), coreMat);
    core.position.y = 0.48;
    group.add(core);

    // Fiery Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.06);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.22, 0.55, 0.6);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.22, 0.55, 0.6);
    group.add(leftEye, rightEye);

    // Magma Horn
    const hornGeo = new THREE.ConeGeometry(0.16, 0.35, 5);
    const horn = new THREE.Mesh(hornGeo, coreMat);
    horn.position.set(0, 0.95, 0);
    group.add(horn);
  } else if (type === 'skeleton') {
    // Bone warrior
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8, flatShading: true });
    const armorMat = new THREE.MeshLambertMaterial({ color: 0x37474f, flatShading: true });
    const redGlow = new THREE.MeshBasicMaterial({ color: 0xff1744 });

    // Ribcage / Spine
    const spineGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    const spine = new THREE.Mesh(spineGeo, boneMat);
    spine.position.y = 1.1;
    spine.castShadow = true;
    group.add(spine);

    // Rib rings
    for (let i = 0; i < 3; i++) {
      const ribGeo = new THREE.TorusGeometry(0.28 - i * 0.03, 0.04, 4, 8);
      const rib = new THREE.Mesh(ribGeo, boneMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.y = 1.25 - i * 0.16;
      group.add(rib);
    }

    // Skull
    const skullGeo = new THREE.BoxGeometry(0.42, 0.42, 0.45);
    const skull = new THREE.Mesh(skullGeo, boneMat);
    skull.position.y = 1.75;
    skull.castShadow = true;
    group.add(skull);

    // Red glowing eye sockets
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
    const e1 = new THREE.Mesh(eyeGeo, redGlow);
    e1.position.set(0.12, 1.75, 0.23);
    const e2 = new THREE.Mesh(eyeGeo, redGlow);
    e2.position.set(-0.12, 1.75, 0.23);
    group.add(e1, e2);

    // Horned rusty helmet
    const helmGeo = new THREE.BoxGeometry(0.46, 0.2, 0.48);
    const helm = new THREE.Mesh(helmGeo, armorMat);
    helm.position.y = 1.95;
    group.add(helm);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 4);
    armGeo.translate(0, -0.3, 0);

    const leftArm = new THREE.Group();
    leftArm.position.set(0.4, 1.45, 0);
    leftArm.add(new THREE.Mesh(armGeo, boneMat));
    group.add(leftArm);
    parts.leftArm = leftArm;

    const rightArm = new THREE.Group();
    rightArm.position.set(-0.4, 1.45, 0);
    rightArm.add(new THREE.Mesh(armGeo, boneMat));
    group.add(rightArm);
    parts.rightArm = rightArm;

    // Rusted blade in right arm
    const bladeGeo = new THREE.BoxGeometry(0.1, 0.9, 0.03);
    bladeGeo.translate(0, 0.4, 0);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, metalness: 0.6 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, -0.6, 0.1);
    blade.rotation.x = Math.PI / 4;
    rightArm.add(blade);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 4);
    legGeo.translate(0, -0.35, 0);
    const leftLeg = new THREE.Group();
    leftLeg.position.set(0.18, 0.7, 0);
    leftLeg.add(new THREE.Mesh(legGeo, boneMat));
    group.add(leftLeg);
    parts.leftLeg = leftLeg;

    const rightLeg = new THREE.Group();
    rightLeg.position.set(-0.18, 0.7, 0);
    rightLeg.add(new THREE.Mesh(legGeo, boneMat));
    group.add(rightLeg);
    parts.rightLeg = rightLeg;
  } else if (type === 'skeleton_mage') {
    // Skeleton Necromancer
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc, flatShading: true });
    const robeMat = new THREE.MeshLambertMaterial({ color: 0x311b92, flatShading: true });
    const purpleGlow = new THREE.MeshBasicMaterial({ color: 0xc084fc });

    // Spine & tattered cowl
    const spineGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    const spine = new THREE.Mesh(spineGeo, boneMat);
    spine.position.y = 1.1;
    group.add(spine);

    // Robe Mantle
    const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 6), robeMat);
    mantle.position.y = 0.9;
    group.add(mantle);

    // Skull
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.45), boneMat);
    skull.position.y = 1.75;
    group.add(skull);

    // Purple Glowing Eyes
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.06);
    const leftEye = new THREE.Mesh(eyeGeo, purpleGlow);
    leftEye.position.set(0.11, 1.76, 0.22);
    const rightEye = new THREE.Mesh(eyeGeo, purpleGlow);
    rightEye.position.set(-0.11, 1.76, 0.22);
    group.add(leftEye, rightEye);

    // Necromancer Horned Cowl
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 5), robeMat);
    cowl.position.set(0, 2.15, -0.05);
    cowl.rotation.x = -0.2;
    group.add(cowl);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 4);
    armGeo.translate(0, -0.35, 0);

    const rightArm = new THREE.Group();
    rightArm.position.set(-0.42, 1.45, 0);
    rightArm.add(new THREE.Mesh(armGeo, boneMat));
    group.add(rightArm);
    parts.rightArm = rightArm;

    const leftArm = new THREE.Group();
    leftArm.position.set(0.42, 1.45, 0);
    leftArm.add(new THREE.Mesh(armGeo, boneMat));
    group.add(leftArm);
    parts.leftArm = leftArm;

    // Twisted Obsidian Necromancer Staff
    const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 6), new THREE.MeshLambertMaterial({ color: 0x18181b }));
    staffShaft.translateY(0.4);
    const staffOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), purpleGlow);
    staffOrb.position.y = 1.35;
    const staff = new THREE.Group();
    staff.add(staffShaft, staffOrb);
    staff.position.set(0, -0.5, 0.15);
    staff.rotation.x = Math.PI / 5;
    rightArm.add(staff);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 4);
    legGeo.translate(0, -0.35, 0);
    const leftLeg = new THREE.Group();
    leftLeg.position.set(0.18, 0.7, 0);
    leftLeg.add(new THREE.Mesh(legGeo, boneMat));
    group.add(leftLeg);
    parts.leftLeg = leftLeg;

    const rightLeg = new THREE.Group();
    rightLeg.position.set(-0.18, 0.7, 0);
    rightLeg.add(new THREE.Mesh(legGeo, boneMat));
    group.add(rightLeg);
    parts.rightLeg = rightLeg;
  } else if (type === 'goblin') {
    // Goblin raider
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x558b2f, flatShading: true });
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.7, 0.4);
    const body = new THREE.Mesh(bodyGeo, leatherMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.48, 0.4, 0.45);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.45;
    group.add(head);

    // Pointy goblin ears
    const earGeo = new THREE.ConeGeometry(0.1, 0.35, 4);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(0.32, 1.45, -0.05);
    leftEar.rotation.z = -Math.PI / 3;
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(-0.32, 1.45, -0.05);
    rightEar.rotation.z = Math.PI / 3;
    group.add(leftEar, rightEar);

    // Club
    const clubGeo = new THREE.CylinderGeometry(0.12, 0.05, 0.8, 6);
    clubGeo.translate(0, 0.35, 0);
    const clubMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const club = new THREE.Mesh(clubGeo, clubMat);
    club.position.set(-0.4, 0.7, 0.1);
    group.add(club);
    parts.weapon = club;
  } else if (type === 'golem') {
    // Ancient Stone Golem
    group.scale.set(1.35, 1.35, 1.35);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x455a64,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.8,
    });

    // Broad Stone Chest
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.65), stoneMat);
    chest.position.y = 1.25;
    chest.castShadow = true;
    group.add(chest);

    // Chest Inscribed Rune
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.08), runeMat);
    rune.position.set(0, 1.35, 0.32);
    group.add(rune);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), stoneMat);
    head.position.y = 1.85;
    group.add(head);

    // Glowing Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
    eye1.position.set(0.14, 1.85, 0.25);
    const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
    eye2.position.set(-0.14, 1.85, 0.25);
    group.add(eye1, eye2);

    // Rocky Arms & Fists
    const armGeo = new THREE.BoxGeometry(0.35, 0.85, 0.35);
    armGeo.translate(0, -0.35, 0);

    const leftArm = new THREE.Group();
    leftArm.position.set(0.65, 1.45, 0);
    leftArm.add(new THREE.Mesh(armGeo, stoneMat));
    const leftFist = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), stoneMat);
    leftFist.position.y = -0.75;
    leftArm.add(leftFist);
    group.add(leftArm);
    parts.leftArm = leftArm;

    const rightArm = new THREE.Group();
    rightArm.position.set(-0.65, 1.45, 0);
    rightArm.add(new THREE.Mesh(armGeo, stoneMat));
    const rightFist = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), stoneMat);
    rightFist.position.y = -0.75;
    rightArm.add(rightFist);
    group.add(rightArm);
    parts.rightArm = rightArm;

    // Thick Legs
    const legGeo = new THREE.BoxGeometry(0.35, 0.75, 0.35);
    legGeo.translate(0, -0.3, 0);
    const leftLeg = new THREE.Group();
    leftLeg.position.set(0.28, 0.75, 0);
    leftLeg.add(new THREE.Mesh(legGeo, stoneMat));
    group.add(leftLeg);
    parts.leftLeg = leftLeg;

    const rightLeg = new THREE.Group();
    rightLeg.position.set(-0.28, 0.75, 0);
    rightLeg.add(new THREE.Mesh(legGeo, stoneMat));
    group.add(rightLeg);
    parts.rightLeg = rightLeg;
  } else if (type === 'spider') {
    // Giant Forest Arachnid
    const spiderMat = new THREE.MeshLambertMaterial({ color: 0x18181b, flatShading: true });
    const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const fangMat = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });

    // Cephalothorax (head/midsection)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.65), spiderMat);
    head.position.y = 0.38;
    group.add(head);

    // Bulbous Abdomen (rear)
    const abdomenGeo = new THREE.SphereGeometry(0.6, 8, 8);
    abdomenGeo.scale(1.0, 0.8, 1.4);
    const abdomen = new THREE.Mesh(abdomenGeo, spiderMat);
    abdomen.position.set(0, 0.55, -0.85);
    group.add(abdomen);

    // Glowing Cluster Eyes (4 eyes)
    for (let e = 0; e < 4; e++) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), redEyeMat);
      eye.position.set((e - 1.5) * 0.12, 0.44, 0.33);
      group.add(eye);
    }

    // Venom Fangs
    const fangGeo = new THREE.ConeGeometry(0.06, 0.22, 4);
    fangGeo.rotateX(Math.PI);
    const leftFang = new THREE.Mesh(fangGeo, fangMat);
    leftFang.position.set(0.12, 0.2, 0.35);
    const rightFang = new THREE.Mesh(fangGeo, fangMat);
    rightFang.position.set(-0.12, 0.2, 0.35);
    group.add(leftFang, rightFang);

    // 8 Jointed Legs (4 left, 4 right)
    for (let l = 0; l < 4; l++) {
      const legMat = spiderMat;
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4);
      legGeo.translate(0, 0.35, 0);

      // Left leg
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(0.35, 0.35, 0.25 - l * 0.22);
      leftLeg.rotation.z = -0.85;
      leftLeg.rotation.y = 0.4 - l * 0.25;
      group.add(leftLeg);

      // Right leg
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(-0.35, 0.35, 0.25 - l * 0.22);
      rightLeg.rotation.z = 0.85;
      rightLeg.rotation.y = -0.4 + l * 0.25;
      group.add(rightLeg);
    }
  } else if (type === 'frost_wolf') {
    // Four-legged glacial dire wolf
    const furMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });
    const snoutMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    const iceEyeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

    // Torso / Body
    const bodyGeo = new THREE.BoxGeometry(0.55, 0.5, 0.95);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);
    parts.body = body;

    // Head & Snout
    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.45);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 0.9, 0.48);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.28), snoutMat);
    snout.position.set(0, 0.82, 0.72);
    head.add(snout);

    // Glowing Cyan Eyes
    const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), iceEyeMat);
    eye1.position.set(0.12, 0.95, 0.65);
    const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), iceEyeMat);
    eye2.position.set(-0.12, 0.95, 0.65);
    group.add(head, eye1, eye2);

    // Wolf Ears
    const earGeo = new THREE.ConeGeometry(0.1, 0.22, 4);
    const ear1 = new THREE.Mesh(earGeo, furMat);
    ear1.position.set(0.14, 1.14, 0.45);
    ear1.rotation.z = -0.15;
    const ear2 = new THREE.Mesh(earGeo, furMat);
    ear2.position.set(-0.14, 1.14, 0.45);
    ear2.rotation.z = 0.15;
    group.add(ear1, ear2);

    // Four Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const legMat = furMat;
    const flLeg = new THREE.Mesh(legGeo, legMat);
    flLeg.position.set(0.22, 0.25, 0.32);
    const frLeg = new THREE.Mesh(legGeo, legMat);
    frLeg.position.set(-0.22, 0.25, 0.32);
    const blLeg = new THREE.Mesh(legGeo, legMat);
    blLeg.position.set(0.22, 0.25, -0.32);
    const brLeg = new THREE.Mesh(legGeo, legMat);
    brLeg.position.set(-0.22, 0.25, -0.32);
    group.add(flLeg, frLeg, blLeg, brLeg);

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.5, 5), furMat);
    tail.position.set(0, 0.65, -0.65);
    tail.rotation.x = -0.7;
    group.add(tail);
  } else if (type === 'swamp_crawler') {
    // Toxic swamp slime slug crawler with glowing pustules
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x4d7c0f,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });
    const pustuleMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

    const slugGeo = new THREE.CylinderGeometry(0.35, 0.65, 1.1, 8);
    slugGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(slugGeo, skinMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);
    parts.body = body;

    // Glowing Toxic Spores
    const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), pustuleMat);
    p1.position.set(0.18, 0.6, 0.15);
    const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), pustuleMat);
    p2.position.set(-0.16, 0.58, -0.2);
    const p3 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), pustuleMat);
    p3.position.set(0, 0.64, -0.05);
    group.add(p1, p2, p3);

    // Stalk Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat);
    eye1.position.set(0.16, 0.65, 0.52);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat);
    eye2.position.set(-0.16, 0.65, 0.52);
    group.add(eye1, eye2);
  } else if (type === 'boss') {
    // Ancient Colossal Obsidian Titan Boss!
    group.scale.set(3.5, 3.5, 3.5);

    const titanStoneMat = new THREE.MeshStandardMaterial({
      color: 0x212121,
      roughness: 0.7,
      metalness: 0.3,
      flatShading: true,
    });
    const magmaGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      emissive: 0xff3d00,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });
    const runeCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.8,
    });

    // Massive Chest / Core
    const chestGeo = new THREE.BoxGeometry(1.2, 1.4, 0.9);
    const chest = new THREE.Mesh(chestGeo, titanStoneMat);
    chest.position.y = 1.9;
    chest.castShadow = true;
    group.add(chest);

    // Glowing Magma Core in chest
    const coreGeo = new THREE.OctahedronGeometry(0.35, 1);
    const core = new THREE.Mesh(coreGeo, magmaGlowMat);
    core.position.set(0, 1.9, 0.42);
    group.add(core);
    parts.core = core;

    // Shoulders with spiky stone armor
    const shoulderGeo = new THREE.ConeGeometry(0.5, 0.8, 5);
    const leftShoulder = new THREE.Mesh(shoulderGeo, titanStoneMat);
    leftShoulder.position.set(0.85, 2.5, 0);
    leftShoulder.rotation.z = -0.4;
    const rightShoulder = new THREE.Mesh(shoulderGeo, titanStoneMat);
    rightShoulder.position.set(-0.85, 2.5, 0);
    rightShoulder.rotation.z = 0.4;
    group.add(leftShoulder, rightShoulder);

    // Head / Visor
    const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const head = new THREE.Mesh(headGeo, titanStoneMat);
    head.position.y = 2.85;
    group.add(head);

    // Glowing Single Visor Eye
    const visorGeo = new THREE.BoxGeometry(0.45, 0.12, 0.1);
    const visor = new THREE.Mesh(visorGeo, runeCyanMat);
    visor.position.set(0, 2.85, 0.33);
    group.add(visor);

    // Giant Fists / Arms
    const armGeo = new THREE.BoxGeometry(0.45, 1.2, 0.45);
    armGeo.translate(0, -0.5, 0);

    const leftArm = new THREE.Group();
    leftArm.position.set(0.95, 2.2, 0);
    leftArm.add(new THREE.Mesh(armGeo, titanStoneMat));
    const leftFist = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), magmaGlowMat);
    leftFist.position.y = -1.1;
    leftArm.add(leftFist);
    group.add(leftArm);
    parts.leftArm = leftArm;

    const rightArm = new THREE.Group();
    rightArm.position.set(-0.95, 2.2, 0);
    rightArm.add(new THREE.Mesh(armGeo, titanStoneMat));
    const rightFist = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), magmaGlowMat);
    rightFist.position.y = -1.1;
    rightArm.add(rightFist);
    group.add(rightArm);
    parts.rightArm = rightArm;

    // Massive Stone Legs
    const legGeo = new THREE.BoxGeometry(0.45, 1.1, 0.45);
    legGeo.translate(0, -0.5, 0);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(0.4, 1.1, 0);
    leftLeg.add(new THREE.Mesh(legGeo, titanStoneMat));
    group.add(leftLeg);
    parts.leftLeg = leftLeg;

    const rightLeg = new THREE.Group();
    rightLeg.position.set(-0.4, 1.1, 0);
    rightLeg.add(new THREE.Mesh(legGeo, titanStoneMat));
    group.add(rightLeg);
    parts.rightLeg = rightLeg;
  }

  return { group, parts };
}

// Interactive Treasure Chest with animated opening hinge
export function createTreasureChestMesh(): { group: THREE.Group; lidGroup: THREE.Group } {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 });

  // Chest Base Box
  const baseGeo = new THREE.BoxGeometry(0.9, 0.5, 0.6);
  const base = new THREE.Mesh(baseGeo, woodMat);
  base.position.y = 0.25;
  base.castShadow = true;
  group.add(base);

  // Gold Corner Brackets on Base
  const trimGeo = new THREE.BoxGeometry(0.94, 0.08, 0.64);
  const trim = new THREE.Mesh(trimGeo, goldMat);
  trim.position.y = 0.45;
  group.add(trim);

  // Lid pivot group (hinge at back edge)
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.5, -0.3); // back top edge

  const lidGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8, 1, false, 0, Math.PI);
  lidGeo.rotateZ(Math.PI / 2);
  lidGeo.translate(0, 0, 0.3);

  const lidMesh = new THREE.Mesh(lidGeo, woodMat);
  lidMesh.castShadow = true;
  lidGroup.add(lidMesh);

  // Gold lock latch on lid
  const lockGeo = new THREE.BoxGeometry(0.12, 0.16, 0.08);
  const lock = new THREE.Mesh(lockGeo, goldMat);
  lock.position.set(0, 0, 0.62);
  lidGroup.add(lock);

  group.add(lidGroup);

  // Hidden glowing loot treasure light inside chest
  const innerLight = new THREE.PointLight(0xffd700, 0, 4);
  innerLight.name = 'chestInnerLight';
  innerLight.position.set(0, 0.4, 0);
  group.add(innerLight);

  return { group, lidGroup };
}

// Low-poly environment trees and foliage
export function createTreeMesh(type: 'oak' | 'pine' | 'fantasy'): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });

  if (type === 'pine') {
    // Pine tree
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.2, 5);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.7; // Extends down to -0.4 to anchor into terrain slopes
    trunk.castShadow = true;
    group.add(trunk);

    // Root collar flare
    const rootGeo = new THREE.CylinderGeometry(0.35, 0.55, 0.8, 5);
    const root = new THREE.Mesh(rootGeo, trunkMat);
    root.position.y = -0.3;
    group.add(root);

    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20, flatShading: true });
    const layers = [
      { r: 1.4, h: 1.5, y: 2.0 },
      { r: 1.1, h: 1.4, y: 2.9 },
      { r: 0.7, h: 1.2, y: 3.7 },
    ];
    layers.forEach((l) => {
      const coneGeo = new THREE.ConeGeometry(l.r, l.h, 6);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = l.y;
      cone.castShadow = true;
      group.add(cone);
    });
  } else if (type === 'fantasy') {
    // Azure glowing fantasy tree
    const fantasyTrunkMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 2.8, 6);
    const trunk = new THREE.Mesh(trunkGeo, fantasyTrunkMat);
    trunk.position.y = 1.0;
    group.add(trunk);

    // Root collar flare
    const rootGeo = new THREE.CylinderGeometry(0.45, 0.65, 0.8, 6);
    const root = new THREE.Mesh(rootGeo, fantasyTrunkMat);
    root.position.y = -0.3;
    group.add(root);

    const fantasyMat = new THREE.MeshStandardMaterial({
      color: 0x00b4d8,
      emissive: 0x0077b6,
      emissiveIntensity: 0.3,
      flatShading: true,
    });
    const puff1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), fantasyMat);
    puff1.position.set(0, 3.1, 0);
    puff1.castShadow = true;
    group.add(puff1);
  } else {
    // Oak tree
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.6, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    group.add(trunk);

    // Root collar flare
    const rootGeo = new THREE.CylinderGeometry(0.5, 0.75, 0.8, 6);
    const root = new THREE.Mesh(rootGeo, trunkMat);
    root.position.y = -0.3;
    group.add(root);

    const leafMat = new THREE.MeshLambertMaterial({ color: 0x33691e, flatShading: true });
    const clusters = [
      { x: 0, y: 3.2, z: 0, s: 1.5 },
      { x: 0.6, y: 2.6, z: 0.4, s: 1.1 },
      { x: -0.6, y: 2.7, z: -0.3, s: 1.2 },
    ];
    clusters.forEach((c) => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(c.s, 1), leafMat);
      puff.position.set(c.x, c.y, c.z);
      puff.castShadow = true;
      group.add(puff);
    });
  }

  return group;
}

// Ancient Pillar / Temple Monument
export function createAncientPillarMesh(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae, flatShading: true });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00b0ff,
    emissiveIntensity: 0.8,
  });

  // Pillar base
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), stoneMat);
  base.position.y = 0.2;
  group.add(base);

  // Column
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 3.5, 8), stoneMat);
  col.position.y = 2.15;
  col.castShadow = true;
  group.add(col);

  // Capital top
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), stoneMat);
  cap.position.y = 4.05;
  group.add(cap);

  // Inscribed glowing rune band
  const rune = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8), runeMat);
  rune.position.y = 2.5;
  group.add(rune);

  return group;
}

// Floating Sanctuary Crystal
export function createCrystalMonolithMesh(): { group: THREE.Group; crystal: THREE.Mesh } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x546e7a, flatShading: true });

  // Altar base
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.6, 6), stoneMat);
  altar.position.y = 0.3;
  group.add(altar);

  // Floating Octahedron crystal
  const crystalGeo = new THREE.OctahedronGeometry(0.7, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.y = 1.8;
  group.add(crystal);

  const light = new THREE.PointLight(0x00e5ff, 1.5, 8);
  light.position.y = 1.8;
  group.add(light);

  return { group, crystal };
}

// Medieval Fantasy Village House
export function createVillageHouseMesh(): THREE.Group {
  const house = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe0d6c3,
    roughness: 0.9,
    flatShading: true,
  });
  const woodMat = new THREE.MeshLambertMaterial({
    color: 0x5d4037,
    flatShading: true,
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: 0x8d2b1d, // Red-terracotta tiles
    flatShading: true,
  });
  const chimneyMat = new THREE.MeshStandardMaterial({
    color: 0x616161,
    roughness: 0.95,
    flatShading: true,
  });

  // Base stone foundation - deep plinth prevents floating or terrain cutting through floor
  const foundGeo = new THREE.BoxGeometry(4.5, 2.2, 4.5);
  const found = new THREE.Mesh(foundGeo, chimneyMat);
  found.position.y = -0.6;
  found.receiveShadow = true;
  house.add(found);

  // Main walls
  const wallGeo = new THREE.BoxGeometry(4, 2.6, 4);
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = 1.8;
  walls.castShadow = true;
  walls.receiveShadow = true;
  house.add(walls);

  // Wooden corner beams
  const beamGeo = new THREE.BoxGeometry(0.35, 2.7, 0.35);
  const corners = [
    [-1.9, 1.8, -1.9],
    [1.9, 1.8, -1.9],
    [-1.9, 1.8, 1.9],
    [1.9, 1.8, 1.9],
  ];
  corners.forEach(([bx, by, bz]) => {
    const beam = new THREE.Mesh(beamGeo, woodMat);
    beam.position.set(bx, by, bz);
    beam.castShadow = true;
    house.add(beam);
  });

  // Gabled Roof
  const roofGeo = new THREE.ConeGeometry(3.6, 2.2, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 4.2;
  roof.castShadow = true;
  house.add(roof);

  // Chimney
  const chimGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
  const chimney = new THREE.Mesh(chimGeo, chimneyMat);
  chimney.position.set(1.1, 4.3, 0.8);
  chimney.castShadow = true;
  house.add(chimney);

  // Front wooden door
  const doorGeo = new THREE.BoxGeometry(0.9, 1.6, 0.1);
  const door = new THREE.Mesh(doorGeo, woodMat);
  door.position.set(0, 1.3, 2.02);
  house.add(door);

  // Warm glowing window
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const winGeo = new THREE.BoxGeometry(0.7, 0.7, 0.05);
  const win = new THREE.Mesh(winGeo, winMat);
  win.position.set(-1.2, 1.9, 2.02);
  house.add(win);

  return house;
}

// Ocean Pier / Dock with authentic deep wooden stilts, heavy timber deck, and nautical detailing
export interface PierDockOptions {
  length?: number;
  width?: number;
  pileDepth?: number;
  hasLantern?: boolean;
  lanternSide?: 'left' | 'right' | 'both' | 'none';
  hasMooringBollards?: boolean;
  hasCrossBrace?: boolean;
}

export function createPierDockMesh(options?: PierDockOptions): THREE.Group {
  const pier = new THREE.Group();
  const length = options?.length ?? 14;
  const width = options?.width ?? 3.2;
  const pileDepth = options?.pileDepth ?? 6.8;
  const hasLantern = options?.hasLantern ?? false;
  const lanternSide = options?.lanternSide ?? 'right';
  const hasMooringBollards = options?.hasMooringBollards ?? true;
  const hasCrossBrace = options?.hasCrossBrace ?? false;

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const darkTimberMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const ropeMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8, flatShading: true });

  const pileRadius = 0.20;
  const pileSpacing = 3.5;
  const halfWidth = width / 2;
  const pileX = halfWidth - 0.22;
  const pileY = 2.05 - pileDepth / 2;

  // 1. Heavy Wooden Stilts / Piles plunging deep into ocean water & seabed
  const pileGeo = new THREE.CylinderGeometry(pileRadius, pileRadius * 1.15, pileDepth, 8);
  const capBeamGeo = new THREE.BoxGeometry(width + 0.3, 0.22, 0.34);

  for (let z = 1.0; z <= length - 0.5; z += pileSpacing) {
    // Left & Right Stilts
    const leftPile = new THREE.Mesh(pileGeo, darkTimberMat);
    leftPile.position.set(-pileX, pileY, z);
    leftPile.castShadow = true;
    leftPile.receiveShadow = true;

    const rightPile = new THREE.Mesh(pileGeo, darkTimberMat);
    rightPile.position.set(pileX, pileY, z);
    rightPile.castShadow = true;
    rightPile.receiveShadow = true;

    pier.add(leftPile, rightPile);

    // If pier is wide (e.g. platform), add center support stilt
    if (width >= 5.0) {
      const centerPile = new THREE.Mesh(pileGeo, darkTimberMat);
      centerPile.position.set(0, pileY, z);
      pier.add(centerPile);
    }

    // Horizontal timber cap beam supporting the deck
    const capBeam = new THREE.Mesh(capBeamGeo, woodMat);
    capBeam.position.set(0, 1.96, z);
    capBeam.castShadow = true;
    pier.add(capBeam);

    // Diagonal X-bracing between piles in water
    if (hasCrossBrace && width <= 4.5) {
      const braceSpan = Math.hypot(pileX * 2, 1.4);
      const braceGeo = new THREE.BoxGeometry(0.12, braceSpan, 0.12);

      const brace1 = new THREE.Mesh(braceGeo, woodMat);
      brace1.position.set(0, 0.8, z);
      brace1.rotation.z = Math.atan2(pileX * 2, 1.4);

      const brace2 = new THREE.Mesh(braceGeo, woodMat);
      brace2.position.set(0, 0.8, z);
      brace2.rotation.z = -Math.atan2(pileX * 2, 1.4);

      pier.add(brace1, brace2);
    }
  }

  // 2. Walkway Deck Planks
  const deckGeo = new THREE.BoxGeometry(width, 0.25, length);
  const deck = new THREE.Mesh(deckGeo, plankMat);
  deck.position.set(0, 2.1, length / 2);
  deck.receiveShadow = true;
  deck.castShadow = true;
  pier.add(deck);

  // Raised edge curb logs / fender beams along pier flanks
  const curbGeo = new THREE.BoxGeometry(0.18, 0.24, length);
  const leftCurb = new THREE.Mesh(curbGeo, darkTimberMat);
  leftCurb.position.set(-halfWidth + 0.09, 2.25, length / 2);
  const rightCurb = new THREE.Mesh(curbGeo, darkTimberMat);
  rightCurb.position.set(halfWidth - 0.09, 2.25, length / 2);
  pier.add(leftCurb, rightCurb);

  // 3. Mooring Bollards / Cleats with rope wraps
  if (hasMooringBollards) {
    const bollardGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.5, 6);
    const ropeRingGeo = new THREE.TorusGeometry(0.15, 0.04, 6, 10);
    ropeRingGeo.rotateX(Math.PI / 2);

    for (let bz = 2.5; bz < length; bz += 5.0) {
      // Left bollard
      const bLeft = new THREE.Mesh(bollardGeo, darkTimberMat);
      bLeft.position.set(-halfWidth + 0.2, 2.45, bz);
      const rLeft = new THREE.Mesh(ropeRingGeo, ropeMat);
      rLeft.position.set(-halfWidth + 0.2, 2.4, bz);
      pier.add(bLeft, rLeft);

      // Right bollard
      const bRight = new THREE.Mesh(bollardGeo, darkTimberMat);
      bRight.position.set(halfWidth - 0.2, 2.45, bz);
      const rRight = new THREE.Mesh(ropeRingGeo, ropeMat);
      rRight.position.set(halfWidth - 0.2, 2.4, bz);
      pier.add(bRight, rRight);
    }
  }

  // 4. Harbor Lantern on Rustic Timber Post
  if (hasLantern) {
    const addLantern = (sideX: number) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.6, 6), woodMat);
      post.position.set(sideX, 2.9, length - 0.6);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.08), woodMat);
      arm.position.set(sideX > 0 ? sideX - 0.12 : sideX + 0.12, 3.65, length - 0.6);

      const lampHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.32, 0.24),
        new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
      );
      lampHousing.position.set(sideX > 0 ? sideX - 0.22 : sideX + 0.22, 3.48, length - 0.6);

      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.22, 0.18),
        new THREE.MeshBasicMaterial({ color: 0xffb74d })
      );
      glow.position.copy(lampHousing.position);

      pier.add(post, arm, lampHousing, glow);
    };

    if (lanternSide === 'right' || lanternSide === 'both') addLantern(halfWidth - 0.22);
    if (lanternSide === 'left' || lanternSide === 'both') addLantern(-halfWidth + 0.22);
  }

  return pier;
}

// Wooden Rowboat / Fisherman's Skiff
export function createBoatMesh(): THREE.Group {
  const boat = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const seatMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true });

  // Hull base
  const hullGeo = new THREE.BoxGeometry(1.6, 0.7, 4.2);
  const hull = new THREE.Mesh(hullGeo, woodMat);
  hull.position.y = 0.35;
  hull.castShadow = true;
  boat.add(hull);

  // Bow & stern tapered ends
  const bowGeo = new THREE.ConeGeometry(0.8, 1.2, 4);
  bowGeo.rotateX(Math.PI / 2);
  const bow = new THREE.Mesh(bowGeo, woodMat);
  bow.position.set(0, 0.35, 2.4);
  boat.add(bow);

  // Seats
  const seat1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.5), seatMat);
  seat1.position.set(0, 0.5, 0);
  boat.add(seat1);

  return boat;
}

// Ancient Ruin Archway / Gate
export function createAncientArchMesh(): THREE.Group {
  const arch = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78909c, flatShading: true });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.9,
  });

  // Left & Right Pillars
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 1.2), stoneMat);
  p1.position.set(-2.5, 2.5, 0);
  p1.castShadow = true;

  const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 1.2), stoneMat);
  p2.position.set(2.5, 2.5, 0);
  p2.castShadow = true;
  arch.add(p1, p2);

  // Arch lintel on top
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.2, 1.4), stoneMat);
  lintel.position.set(0, 5.4, 0);
  lintel.castShadow = true;
  arch.add(lintel);

  // Glowing Rune Core in Center of arch
  const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), runeMat);
  rune.position.set(0, 4.4, 0);
  arch.add(rune);

  return arch;
}

// Props: Wooden Barrel
export function createBarrelMesh(): THREE.Group {
  const barrel = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const metal = new THREE.MeshStandardMaterial({ color: 0x424242, metalness: 0.7 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.0, 8), wood);
  body.position.y = 0.5;
  body.castShadow = false; // Disabled shadow on small prop for optimal 60 FPS performance
  barrel.add(body);

  const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), metal);
  ring1.position.y = 0.75;
  const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), metal);
  ring2.position.y = 0.25;
  barrel.add(ring1, ring2);

  return barrel;
}

// Village Tavern: Penginapan Eldoria
export function createTavernMesh(): THREE.Group {
  const tavern = new THREE.Group();
  const timberMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8, flatShading: true });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xb71c1c, flatShading: true });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });

  // Deep stone foundation plinth to seat firmly into any slope
  const found = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.4, 6.4), timberMat);
  found.position.y = -0.7;
  found.receiveShadow = true;
  tavern.add(found);

  // Main 1st floor building (6.5 x 3.5 x 5.5)
  const floor1 = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.4, 5.2), wallMat);
  floor1.position.y = 1.7;
  floor1.castShadow = true;
  floor1.receiveShadow = true;
  tavern.add(floor1);

  // 2nd floor overhang (6.6 x 2.8 x 5.6)
  const floor2 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.8, 5.6), timberMat);
  floor2.position.y = 4.8;
  floor2.castShadow = true;
  tavern.add(floor2);

  // Pitched Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.6, 4), roofMat);
  roof.position.y = 7.4;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.1, 1.0, 0.85);
  roof.castShadow = true;
  tavern.add(roof);

  // Main Entrance Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.2), doorMat);
  door.position.set(0, 1.1, 2.62);
  tavern.add(door);

  // Windows with warm light
  for (const x of [-1.8, 1.8]) {
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), winMat);
    win1.position.set(x, 1.8, 2.62);
    tavern.add(win1);

    const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), winMat);
    win2.position.set(x, 4.8, 2.82);
    tavern.add(win2);
  }

  // Stone Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.5, 0.9), new THREE.MeshLambertMaterial({ color: 0x455a64 }));
  chimney.position.set(2.4, 4.8, -1.8);
  tavern.add(chimney);

  // Warm tavern lantern over door
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshBasicMaterial({ color: 0xffb74d }));
  lantern.position.set(0, 2.7, 2.9);
  tavern.add(lantern);

  return tavern;
}

// Master Torvald's Blacksmith Forge
export function createBlacksmithMesh(): THREE.Group {
  const forge = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x546e7a, flatShading: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x37474f, flatShading: true });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.8, roughness: 0.3 });

  // Deep stone foundation plinth to prevent terrain clipping
  const found = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.2, 5.8), stoneMat);
  found.position.y = -0.7;
  found.receiveShadow = true;
  forge.add(found);

  // Main Stone Workshop
  const shop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.0, 4.2), stoneMat);
  shop.position.y = 1.5;
  shop.castShadow = true;
  shop.receiveShadow = true;
  forge.add(shop);

  // Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 2.0, 4), roofMat);
  roof.position.y = 4.0;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.0, 1.0, 0.85);
  roof.castShadow = true;
  forge.add(roof);

  // Open Forge Hearth (Stone oven with blazing fire)
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.4), stoneMat);
  hearth.position.set(-1.4, 0.7, 2.4);
  const fire = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.8), fireMat);
  fire.position.set(-1.4, 0.9, 2.5);
  forge.add(hearth, fire);

  // Blacksmith Anvil
  const anvilBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.6, 6), woodMat);
  anvilBase.position.set(1.4, 0.3, 2.3);
  const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.9), metalMat);
  anvilTop.position.set(1.4, 0.72, 2.3);
  forge.add(anvilBase, anvilTop);

  // Water Trough for quenching
  const trough = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.4), woodMat);
  trough.position.set(0.0, 0.25, 2.4);
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 1.3), new THREE.MeshLambertMaterial({ color: 0x0288d1 }));
  water.position.set(0.0, 0.48, 2.4);
  forge.add(trough, water);

  // Blacksmith Hanging Signpost with Hammer & Anvil
  const signPole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), woodMat);
  signPole.position.set(2.4, 2.8, 2.4);
  const signArm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), woodMat);
  signArm.position.set(2.0, 3.6, 2.4);
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.06), woodMat);
  signBoard.position.set(1.9, 3.2, 2.4);
  const signHammer = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.08), metalMat);
  signHammer.position.set(1.9, 3.2, 2.44);
  forge.add(signPole, signArm, signBoard, signHammer);

  // Weapon Display Stand on Side
  const weaponRack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 1.6), woodMat);
  weaponRack.position.set(-2.2, 0.6, 2.2);
  const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.08), metalMat);
  swordBlade.position.set(-2.2, 0.9, 2.0);
  swordBlade.rotation.z = 0.2;
  const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.1), metalMat);
  axeHead.position.set(-2.2, 1.1, 2.5);
  forge.add(weaponRack, swordBlade, axeHead);

  return forge;
}

// Village Armor & Equipment Stall
export function createArmorStallMesh(clothColor: number = 0x1e3a8a): THREE.Group {
  const stall = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const clothMat = new THREE.MeshLambertMaterial({ color: clothColor, side: THREE.DoubleSide, flatShading: true });
  const silverMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide, flatShading: true });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });

  // Wooden Table / Counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.4), woodMat);
  counter.position.y = 0.45;
  // counter.castShadow = false;
  counter.receiveShadow = true;
  stall.add(counter);

  // 4 Corner Wooden Posts
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 4);
  for (const [px, pz] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]]) {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(px, 1.2, pz);
    post.castShadow = true;
    stall.add(post);
  }

  // Striped Canopy
  const canopy1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.9), clothMat);
  canopy1.position.set(0, 2.45, -0.3);
  canopy1.rotation.x = 0.15;
  const canopy2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.9), silverMat);
  canopy2.position.set(0, 2.45, 0.3);
  canopy2.rotation.x = -0.15;
  stall.add(canopy1, canopy2);

  // Golden Shield Emblem on Canopy front
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.45, 3), goldMat);
  crest.position.set(0, 2.5, 0.76);
  crest.rotation.x = Math.PI;
  stall.add(crest);

  // Display armor mannequin / breastplate on counter
  const armorStand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.35), steelMat);
  armorStand.position.set(-0.4, 1.35, 0);
  stall.add(armorStand);

  // Helmet on counter
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), steelMat);
  helm.position.set(0.6, 1.12, 0.2);
  stall.add(helm);

  // Steel Kite Shield leaning in front of stall
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.06), steelMat);
  shield.position.set(0.65, 0.45, 0.74);
  shield.rotation.x = -0.15;
  const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.08), goldMat);
  shieldRim.position.set(0.65, 0.45, 0.75);
  shieldRim.rotation.x = -0.15;
  stall.add(shield, shieldRim);

  return stall;
}

// Village Market Stall (Herbs, Potions, or Produce)
export function createMarketStallMesh(clothColor: number = 0x2e7d32): THREE.Group {
  const stall = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const clothMat = new THREE.MeshLambertMaterial({ color: clothColor, side: THREE.DoubleSide, flatShading: true });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5, side: THREE.DoubleSide, flatShading: true });

  // Wooden Table / Counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.4), woodMat);
  counter.position.y = 0.45;
  counter.castShadow = true;
  counter.receiveShadow = true;
  stall.add(counter);

  // 4 Corner Wooden Posts
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 4);
  for (const [px, pz] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]]) {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(px, 1.2, pz);
    post.castShadow = true;
    stall.add(post);
  }

  // Striped Canopy Canopy Roof
  const canopy1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.9), clothMat);
  canopy1.position.set(0, 2.45, -0.3);
  canopy1.rotation.x = 0.15;
  const canopy2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.9), whiteMat);
  canopy2.position.set(0, 2.45, 0.3);
  canopy2.rotation.x = -0.15;
  stall.add(canopy1, canopy2);

  // Goods on display (Crates & Bottles)
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
  const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.5), crateMat);
  crate1.position.set(-0.7, 1.05, 0);
  stall.add(crate1);

  // Potion vials on stall
  const vialGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 6);
  const v1 = new THREE.Mesh(vialGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  v1.position.set(0.3, 1.0, 0.2);
  const v2 = new THREE.Mesh(vialGeo, new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
  v2.position.set(0.6, 1.0, 0.2);
  const v3 = new THREE.Mesh(vialGeo, new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  v3.position.set(0.9, 1.0, 0.2);
  stall.add(v1, v2, v3);

  return stall;
}

// Street Lantern Post
export function createStreetLampMesh(): THREE.Group {
  const lamp = new THREE.Group();
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffecb3 });

  // Post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 6), ironMat);
  post.position.y = 1.6;
  post.castShadow = false; // Disabled shadow on small prop for optimal 60 FPS performance
  lamp.add(post);

  // Lantern Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), glowMat);
  head.position.y = 3.2;
  lamp.add(head);

  // Cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.25, 4), ironMat);
  cap.position.y = 3.55;
  cap.rotation.y = Math.PI / 4;
  lamp.add(cap);

  return lamp;
}

// Village Wooden Gate Arch
export function createVillageArchMesh(title: string = 'GERBANG ELDORIA'): THREE.Group {
  const arch = new THREE.Group();
  const logMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true });

  // Left & Right log pillars
  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5.0, 8), logMat);
  p1.position.set(-3.5, 2.5, 0);
  p1.castShadow = false;

  const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5.0, 8), logMat);
  p2.position.set(3.5, 2.5, 0);
  p2.castShadow = false;
  arch.add(p1, p2);

  // Crossbeam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.5, 0.8), logMat);
  beam.position.set(0, 4.8, 0);
  beam.castShadow = false;
  arch.add(beam);

  // Shingle roof on top of arch
  const roof = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.2, 1.6), roofMat);
  roof.position.set(0, 5.15, 0);
  arch.add(roof);

  // Lanterns on both posts
  for (const x of [-3.5, 3.5]) {
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xffb74d }));
    lantern.position.set(x, 3.8, 0.5);
    arch.add(lantern);

    const light = new THREE.PointLight(0xffb74d, 1.0, 8);
    light.position.set(x, 3.8, 0.6);
    arch.add(light);
  }

  return arch;
}

// Custom NPC Models with distinctive roles
export function createCustomNPCMesh(role: 'elder' | 'guard' | 'alchemist' | 'blacksmith' | 'bard' | 'fisherman' | 'villager' | 'commander' | 'seer' | 'frostsmith' | 'emperor' | 'marshal'): THREE.Group {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd180, flatShading: true });

  if (role === 'guard') {
    // Kapten Ronald - Village Guard Captain in steel plate & halberd
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8, roughness: 0.3 });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });

    // Armor Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.5), armorMat);
    body.position.y = 1.35;
    body.castShadow = true;
    group.add(body);

    // Helmet with red crest
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), armorMat);
    head.position.y = 2.05;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.6), redMat);
    crest.position.y = 2.45;
    group.add(head, crest);

    // Pauldrons
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.35), armorMat);
    p1.position.set(0.5, 1.8, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.35), armorMat);
    p2.position.set(-0.5, 1.8, 0);
    group.add(p1, p2);

    // Legs
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), armorMat);
    l1.position.set(0.2, 0.45, 0);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), armorMat);
    l2.position.set(-0.2, 0.45, 0);
    group.add(l1, l2);

    // Royal Spear / Halberd
    const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0x4e342e }));
    spearShaft.position.set(0.55, 1.3, 0.2);
    const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 4), armorMat);
    spearHead.position.set(0.55, 2.7, 0.2);
    group.add(spearShaft, spearHead);
  } else if (role === 'alchemist') {
    // Anya - Herbalist & Alchemist
    const robeMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });
    const apronMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.4), robeMat);
    body.position.y = 1.3;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.05), apronMat);
    apron.position.set(0, 1.25, 0.22);
    group.add(body, apron);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
    head.position.y = 1.95;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), new THREE.MeshLambertMaterial({ color: 0xd97706 }));
    hair.position.y = 2.15;
    group.add(head, hair);

    // Belt with potion vials
    const v1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    v1.position.set(0.35, 0.95, 0.15);
    const v2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    v2.position.set(-0.35, 0.95, 0.15);
    group.add(v1, v2);
  } else if (role === 'blacksmith') {
    // Master Torvald - Heavy Blacksmith
    const skinTanned = new THREE.MeshLambertMaterial({ color: 0xd7a15c });
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.55), leatherMat);
    body.position.y = 1.35;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinTanned);
    head.position.y = 2.05;
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.2), new THREE.MeshLambertMaterial({ color: 0x374151 }));
    beard.position.set(0, 1.85, 0.22);
    group.add(head, beard);

    // Heavy Smithing Hammer in hand
    const hammerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), new THREE.MeshLambertMaterial({ color: 0x5d4037 }));
    hammerShaft.position.set(0.55, 0.9, 0.2);
    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.8 }));
    hammerHead.position.set(0.55, 1.3, 0.2);
    group.add(hammerShaft, hammerHead);
  } else if (role === 'bard') {
    // Lyra the Wandering Bard
    const bardMat = new THREE.MeshLambertMaterial({ color: 0x7c3aed });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.4), bardMat);
    body.position.y = 1.3;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
    head.position.y = 1.95;
    const featherHat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.4, 5), bardMat);
    featherHat.position.set(0, 2.3, 0);
    const feather = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    feather.position.set(0.2, 2.45, 0);
    feather.rotation.z = -0.4;
    group.add(head, featherHat, feather);

    // Lute on back
    const luteBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshLambertMaterial({ color: 0xb45309 }));
    luteBody.scale.set(0.8, 1.1, 0.4);
    luteBody.position.set(0, 1.4, -0.3);
    const luteNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), new THREE.MeshLambertMaterial({ color: 0x78350f }));
    luteNeck.position.set(0, 1.8, -0.3);
    group.add(luteBody, luteNeck);
  } else if (role === 'fisherman') {
    // Pak Joko - Coastal Fisherman
    const vestMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.42), vestMat);
    body.position.y = 1.3;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
    head.position.y = 1.95;
    // Straw sun hat
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 8), new THREE.MeshLambertMaterial({ color: 0xfef08a }));
    hatBrim.position.y = 2.18;
    const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0xfde047 }));
    hatTop.position.y = 2.35;
    group.add(head, hatBrim, hatTop);

    // Bamboo Fishing Rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 2.8, 6), new THREE.MeshLambertMaterial({ color: 0xa16207 }));
    rod.position.set(0.45, 1.5, 0.3);
    rod.rotation.x = -0.35;
    group.add(rod);
  } else if (role === 'commander') {
    // Komandan Brann - Highland Fortress Commander
    const heavySteel = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9, roughness: 0.25 });
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 });
    const peltMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 }); // White wolf pelt mantle

    // Heavy Plated Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.52), heavySteel);
    body.position.y = 1.35;
    body.castShadow = true;
    group.add(body);

    // Wolf pelt mantle / fur collar
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 0.65), peltMat);
    mantle.position.y = 1.85;
    group.add(mantle);

    // Horned War Helm
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), heavySteel);
    head.position.y = 2.15;
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), goldTrim);
    hornL.position.set(0.35, 2.45, 0);
    hornL.rotation.z = -0.6;
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), goldTrim);
    hornR.position.set(-0.35, 2.45, 0);
    hornR.rotation.z = 0.6;
    group.add(head, hornL, hornR);

    // Giant Bastard Greatsword strapped on back
    const swordShaft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.05), heavySteel);
    swordShaft.position.set(0, 1.6, -0.32);
    swordShaft.rotation.z = 0.25;
    const swordHilt = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.1), goldTrim);
    swordHilt.position.set(-0.15, 2.5, -0.32);
    group.add(swordShaft, swordHilt);
  } else if (role === 'seer') {
    // Elora - Astrologer & Mystic Seer
    const seerRobe = new THREE.MeshLambertMaterial({ color: 0x312e81 }); // Midnight indigo
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const orbGlow = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.5, 8), seerRobe);
    body.position.y = 1.0;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
    head.position.y = 1.95;
    // Golden Astrolabe Circlet
    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 16), goldMat);
    circlet.position.set(0, 2.05, 0);
    circlet.rotation.x = Math.PI / 2;
    group.add(head, circlet);

    // Floating Astrolabe Orb
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), orbGlow);
    orb.position.set(0.45, 1.7, 0.35);
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 6, 16), goldMat);
    orbRing.position.copy(orb.position);
    group.add(orb, orbRing);

    const orbLight = new THREE.PointLight(0x38bdf8, 1.2, 8);
    orbLight.position.copy(orb.position);
    group.add(orbLight);
  } else if (role === 'frostsmith') {
    // Goran - Highland Frost-Smith
    const smithApron = new THREE.MeshLambertMaterial({ color: 0x374151 });
    const frostSteel = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.4,
      metalness: 0.85,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.52), smithApron);
    body.position.y = 1.35;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skinMat);
    head.position.y = 2.05;
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.25), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
    beard.position.set(0, 1.85, 0.25);
    group.add(head, beard);

    // Frost Hammer
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), new THREE.MeshLambertMaterial({ color: 0x475569 }));
    handle.position.set(0.55, 1.1, 0.2);
    const sledge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.55), frostSteel);
    sledge.position.set(0.55, 1.55, 0.2);
    group.add(handle, sledge);
  } else if (role === 'emperor') {
    // Kaisar Aurelius Astraea - Grand Emperor in White & Golden Regalia
    const royalWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const goldArmorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
    const capeMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });

    // Imperial Robe Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.5), royalWhiteMat);
    body.position.y = 1.35;
    const breastplate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.12), goldArmorMat);
    breastplate.position.set(0, 1.45, 0.22);
    group.add(body, breastplate);

    // Flowing Royal Crimson Velvet Cape
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.3, 0.08), capeMat);
    cape.position.set(0, 1.25, -0.28);
    cape.rotation.x = 0.08;
    group.add(cape);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skinMat);
    head.position.y = 2.05;
    // Golden Imperial Crown with Gem
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.18, 8), goldArmorMat);
    crownBase.position.y = 2.38;
    const crownSpikes = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.25, 6), goldArmorMat);
    crownSpikes.position.y = 2.52;
    crownSpikes.rotation.x = Math.PI;
    const ruby = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    ruby.position.set(0, 2.45, 0.3);
    group.add(head, crownBase, crownSpikes, ruby);

    // Imperial Golden Sceptre of Astraea
    const sceptreShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), goldArmorMat);
    sceptreShaft.position.set(0.55, 1.3, 0.25);
    const sceptreOrb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    sceptreOrb.position.set(0.55, 2.2, 0.25);
    group.add(sceptreShaft, sceptreOrb);
  } else if (role === 'marshal') {
    // Panglima Vane - Grand Marshal of the Imperial Legion
    const goldArmorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
    const royalBlueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.52), goldArmorMat);
    body.position.y = 1.35;
    const surcoat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.1), royalBlueMat);
    surcoat.position.set(0, 1.3, 0.24);
    group.add(body, surcoat);

    // Heavy Pauldrons
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.4), goldArmorMat);
    p1.position.set(0.55, 1.85, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.4), goldArmorMat);
    p2.position.set(-0.55, 1.85, 0);
    group.add(p1, p2);

    // Winged Knight Helmet
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.5), goldArmorMat);
    head.position.y = 2.05;
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.25), royalBlueMat);
    wingL.position.set(0.3, 2.3, 0);
    wingL.rotation.z = 0.3;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.25), royalBlueMat);
    wingR.position.set(-0.3, 2.3, 0);
    wingR.rotation.z = -0.3;
    group.add(head, wingL, wingR);

    // Massive Imperial Greatsword in hand
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.04), goldArmorMat);
    swordBlade.position.set(0.6, 1.2, 0.2);
    swordBlade.rotation.z = -0.1;
    group.add(swordBlade);
  } else {
    // Villager Kael / Maya
    const clothesMat = new THREE.MeshLambertMaterial({ color: 0x0d9488 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.4), clothesMat);
    body.position.y = 1.3;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
    head.position.y = 1.95;
    group.add(head);
  }

  // Floating interaction icon
  const iconGroup = new THREE.Group();
  iconGroup.name = 'questIcon';
  const iconGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
  const dotGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const iconMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
  const iconBar = new THREE.Mesh(iconGeo, iconMat);
  iconBar.position.y = 0.2;
  const iconDot = new THREE.Mesh(dotGeo, iconMat);
  iconDot.position.y = -0.2;
  iconGroup.add(iconBar, iconDot);
  iconGroup.position.y = 2.8;
  group.add(iconGroup);

  return group;
}

// ==========================================
// NEW 3D ARCHITECTURAL & ENVIRONMENT ASSETS
// ==========================================

// 1. Suspension Rope Bridge spanning Chasm
export function createSuspensionBridgeMesh(length: number = 28): THREE.Group {
  const bridge = new THREE.Group();
  const timberMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const ropeMat = new THREE.MeshLambertMaterial({ color: 0x78533b, flatShading: true });
  const pylonMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });

  // Anchor Stone Pylons on both sides with deep grounding plinths (menempel padat di tanah)
  for (const x of [-length / 2, length / 2]) {
    for (const z of [-2.4, 2.4]) {
      // 8.5 unit tall stone pylon reaching deep into terrain foundation
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8.5, 1.6), pylonMat);
      pylon.position.set(x, 0.8, z);
      pylon.castShadow = true;
      pylon.receiveShadow = true;
      bridge.add(pylon);
    }
    // Cross timber beam between pylons
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 5.4), timberMat);
    beam.position.set(x, 4.4, 0);
    bridge.add(beam);

    // Solid stone abutment foundation block & flush approach ramp (menempel padat di tanah, zero gap!)
    const isWest = x < 0;
    const abutmentX = isWest ? x - 0.8 : x + 0.8;
    const abutment = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 4.4), pylonMat);
    abutment.position.set(abutmentX, -1.2, 0);
    abutment.receiveShadow = true;
    abutment.castShadow = true;
    bridge.add(abutment);

    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 3.6), timberMat);
    ramp.position.set(abutmentX, -0.06, 0);
    ramp.rotation.z = isWest ? 0.08 : -0.08;
    ramp.receiveShadow = true;
    bridge.add(ramp);
  }

  // Bridge Deck Planks with natural slight sag in middle
  const plankCount = Math.floor(length / 0.8);
  for (let i = 0; i <= plankCount; i++) {
    const px = -length / 2 + (i / plankCount) * length;
    const sag = Math.sin((i / plankCount) * Math.PI) * 0.9;
    const py = -sag;

    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 3.4), timberMat);
    plank.position.set(px, py, 0);
    plank.receiveShadow = true;
    bridge.add(plank);

    // Left and Right Handrail Posts
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 4);
    const postL = new THREE.Mesh(postGeo, timberMat);
    postL.position.set(px, py + 0.65, -1.6);
    const postR = new THREE.Mesh(postGeo, timberMat);
    postR.position.set(px, py + 0.65, 1.6);
    bridge.add(postL, postR);
  }

  // Longitudinal Thick Rope Handrails
  const ropeRadius = 0.08;
  for (const z of [-1.6, 1.6]) {
    const ropeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-length / 2, 4.2, z),
      new THREE.Vector3(0, 0.65 - 0.9, z),
      new THREE.Vector3(length / 2, 4.2, z),
    ]);
    const ropeGeo = new THREE.TubeGeometry(ropeCurve, 24, ropeRadius, 6, false);
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    bridge.add(rope);
  }

  return bridge;
}

// 2. Highland Fortress Gatehouse (Gerbang Benteng Val-Kragor)
export function createFortressGatehouseMesh(): THREE.Group {
  const gate = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true }); // Dark rugged slate
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
  const flagMat = new THREE.MeshLambertMaterial({ color: 0x991b1b }); // Crimson military banner

  // Left Tower
  const tower1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 8.5, 4.2), stoneMat);
  tower1.position.set(-4.5, 4.25, 0);
  tower1.castShadow = true;
  tower1.receiveShadow = true;

  // Deep foundation plinths
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 4.6), stoneMat);
  p1.position.set(-4.5, -1.0, 0);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 4.6), stoneMat);
  p2.position.set(4.5, -1.0, 0);
  gate.add(p1, p2);

  // Right Tower
  const tower2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 8.5, 4.2), stoneMat);
  tower2.position.set(4.5, 4.25, 0);
  tower2.castShadow = true;
  tower2.receiveShadow = true;
  gate.add(tower1, tower2);

  // Battlements / Crenellations on top of towers
  for (const tx of [-4.5, 4.5]) {
    for (const [bx, bz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      const cren = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), stoneMat);
      cren.position.set(tx + bx, 8.9, bz);
      gate.add(cren);
    }
    // Fortress Horned War Flag
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), ironMat);
    pole.position.set(tx, 10.0, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.05), flagMat);
    flag.position.set(tx + 0.8, 10.8, 0);
    gate.add(pole, flag);
  }

  // Central Arch Overpass
  const archway = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 4.0), stoneMat);
  archway.position.set(0, 6.9, 0);
  archway.castShadow = true;
  gate.add(archway);

  // Iron Portcullis Gate Grate
  const portcullis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.0, 0.2), ironMat);
  portcullis.position.set(0, 2.5, 0);
  gate.add(portcullis);

  // Heavy Oak Gates partially cracked open
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 4.8, 0.35), woodMat);
  leftDoor.position.set(-1.2, 2.4, -0.4);
  leftDoor.rotation.y = -0.45;
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 4.8, 0.35), woodMat);
  rightDoor.position.set(1.2, 2.4, -0.4);
  rightDoor.rotation.y = 0.45;
  gate.add(leftDoor, rightDoor);

  // Iron Brazier Torches on Gate
  for (const bx of [-2.8, 2.8]) {
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.4, 6), ironMat);
    brazier.position.set(bx, 4.5, 2.2);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff6d00 }));
    flame.position.set(bx, 4.8, 2.2);
    gate.add(brazier, flame);

    const fireLight = new THREE.PointLight(0xff6d00, 1.4, 12);
    fireLight.position.set(bx, 4.8, 2.4);
    gate.add(fireLight);
  }

  return gate;
}

// 2b. Highland Fortress Rampart Wall Section (Benteng Pertahanan Val-Kragor)
export function createFortressWallMesh(length: number = 20): THREE.Group {
  const wall = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true }); // Dark rugged slate
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true }); // Sturdy timber
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });

  // Main Slate Stone Wall Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(length, 5.5, 2.6), stoneMat);
  body.position.set(0, 2.75, 0);
  body.castShadow = true;
  body.receiveShadow = true;

  // Deep Sub-Terrain Foundation (never sinks or floats)
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 3.5, 3.0), stoneMat);
  foundation.position.set(0, -1.75, 0);
  wall.add(body, foundation);

  // Wooden Walkway on inner edge
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(length, 0.4, 1.2), woodMat);
  walkway.position.set(0, 5.3, -0.6);
  wall.add(walkway);

  // Stone Merlons & Defensive Crenellations on outer edge
  const merlonCount = Math.floor(length / 2.0);
  for (let i = 0; i < merlonCount; i++) {
    const x = -length / 2 + 1.0 + i * 2.0;
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.6), stoneMat);
    merlon.position.set(x, 6.0, 0.9);
    wall.add(merlon);
  }

  // Iron Wall Braziers / Torches along wall length
  const brazierCount = Math.max(1, Math.floor(length / 9));
  for (let b = 1; b <= brazierCount; b++) {
    const bx = -length / 2 + (length / (brazierCount + 1)) * b;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.5), ironMat);
    bracket.position.set(bx, 4.2, 1.5);
    const fireBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.15, 0.35, 6), ironMat);
    fireBowl.position.set(bx, 4.4, 1.7);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6d00 }));
    flame.position.set(bx, 4.65, 1.7);
    wall.add(bracket, fireBowl, flame);
  }

  return wall;
}

// 3. Fortress Watchtower (Menara Pengawas Batu)
export function createFortressWatchtowerMesh(): THREE.Group {
  const tower = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });

  // Deep foundation cylinder into terrain
  const baseFound = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 3.0, 8), stoneMat);
  baseFound.position.y = -1.0;
  tower.add(baseFound);

  // Main Stone Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 11.0, 8), stoneMat);
  shaft.position.y = 5.5;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  tower.add(shaft);

  // Overhanging Wooden Platform
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 5.2), woodMat);
  deck.position.y = 11.2;
  tower.add(deck);

  // Wooden Posts
  for (const [px, pz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 4), woodMat);
    post.position.set(px, 12.5, pz);
    tower.add(post);
  }

  // Pyramidal Slate Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 2.4, 4), roofMat);
  roof.position.y = 14.8;
  roof.rotation.y = Math.PI / 4;
  tower.add(roof);

  // Hanging Beacon Lantern
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
  lantern.position.set(0, 12.6, 0);
  tower.add(lantern);

  return tower;
}

// 4. Fortress Keep / Commander Citadel (Kastil Inti Val-Kragor)
export function createFortressKeepMesh(): THREE.Group {
  const keep = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Deep foundation plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(10.8, 3.0, 8.8), stoneMat);
  plinth.position.y = -1.0;
  plinth.receiveShadow = true;
  keep.add(plinth);

  // Grand Hall Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(10.0, 5.0, 8.0), stoneMat);
  base.position.y = 2.5;
  base.castShadow = true;
  base.receiveShadow = true;
  keep.add(base);

  // Upper Citadel Tier
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.0, 6.0), stoneMat);
  tier2.position.y = 7.0;
  tier2.castShadow = true;
  keep.add(tier2);

  // High Pitched Northern Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 3.5, 4), roofMat);
  roof.position.y = 10.5;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.2, 1.0, 1.0);
  keep.add(roof);

  // Heavy Entrance with Stone Steps
  const steps = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 1.6), stoneMat);
  steps.position.set(0, 0.2, 4.4);
  const arch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.6), woodMat);
  arch.position.set(0, 1.8, 4.1);
  keep.add(steps, arch);

  // Lit Windows
  for (const x of [-3.2, 3.2]) {
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.1), winMat);
    win1.position.set(x, 2.8, 4.05);
    keep.add(win1);
  }
  for (const x of [-2.0, 2.0]) {
    const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.1), winMat);
    win2.position.set(x, 7.2, 3.05);
    keep.add(win2);
  }

  // Stone Chimneys with warm smoke glow
  const chim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.5, 1.2), stoneMat);
  chim.position.set(3.8, 7.0, -2.6);
  keep.add(chim);

  return keep;
}

// 5. Training Yard Target & Combat Dummy
export function createAdvancedTrainingDummyMesh(): THREE.Group {
  return createTrainingDummyMesh();
}

// 6. Roaring Bonfire with glowing embers
export function createBonfireMesh(): THREE.Group {
  const fire = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const logMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });

  // Stone Circle Ring
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), stoneMat);
    stone.position.set(Math.cos(angle) * 0.9, 0.15, Math.sin(angle) * 0.9);
    fire.add(stone);
  }

  // Tepee of Logs
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 5), logMat);
    log.position.set(Math.cos(angle) * 0.4, 0.45, Math.sin(angle) * 0.4);
    log.rotation.z = 0.35;
    log.rotation.y = angle;
    fire.add(log);
  }

  // Blazing Fire Mesh
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 6), fireMat);
  f1.position.y = 0.55;
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 5), coreMat);
  f2.position.y = 0.45;
  fire.add(f1, f2);

  const light = new THREE.PointLight(0xff7043, 2.0, 14);
  light.position.y = 0.7;
  fire.add(light);

  return fire;
}

// 7. Luminescent Giant Swamp Mushroom (Rawa Bayangan)
export function createGiantMushroomMesh(capColor: number = 0xa855f7): THREE.Group {
  const shroom = new THREE.Group();
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
  const capMat = new THREE.MeshStandardMaterial({
    color: capColor,
    emissive: capColor,
    emissiveIntensity: 0.65,
    roughness: 0.3,
    flatShading: true,
  });
  const sporeMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });

  // Curving Stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 3.2, 7), stemMat);
  stem.position.y = 1.6;
  stem.rotation.z = 0.08;
  stem.castShadow = true;
  shroom.add(stem);

  // Wide Umbrella Cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.0, 8), capMat);
  cap.position.set(0.12, 3.2, 0);
  cap.castShadow = true;
  shroom.add(cap);

  // Glowing Spores under cap
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const spore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), sporeMat);
    spore.position.set(0.12 + Math.cos(angle) * 0.9, 2.85, Math.sin(angle) * 0.9);
    shroom.add(spore);
  }

  const glow = new THREE.PointLight(capColor, 1.2, 9);
  glow.position.set(0.12, 3.0, 0);
  shroom.add(glow);

  return shroom;
}

// 8. Broken Pirate Galleon Shipwreck (Teluk Karang Bajak Laut)
export function createShipwreckMesh(): THREE.Group {
  const wreck = new THREE.Group();
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x271e1b, flatShading: true });
  const ribMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });

  // Half-sunken tilted hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 8.5), darkWood);
  hull.position.set(0, 0.6, 0);
  hull.rotation.z = 0.35;
  hull.rotation.x = 0.15;
  wreck.add(hull);

  // Skeletal Hull Ribs
  for (let z = -3.5; z <= 3.5; z += 1.8) {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.2, 5), ribMat);
    rib.position.set(-1.8, 1.8, z);
    rib.rotation.z = -0.55;
    wreck.add(rib);
  }

  // Broken Main Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 5.5, 6), darkWood);
  mast.position.set(0.5, 3.0, -0.8);
  mast.rotation.z = 0.5;
  mast.rotation.y = 0.3;
  wreck.add(mast);

  return wreck;
}

// 9. Frostpeak Ice Crystal Spires
export function createIceCrystalSpireMesh(): THREE.Group {
  const spire = new THREE.Group();
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.7,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.88,
  });

  const mainSpire = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), iceMat);
  mainSpire.scale.set(0.7, 3.2, 0.7);
  mainSpire.position.y = 2.0;
  spire.add(mainSpire);

  for (const [ox, oz, rot] of [[-0.6, 0.4, 0.35], [0.7, -0.3, -0.4], [0.3, 0.7, 0.25]]) {
    const sideSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), iceMat);
    sideSpire.scale.set(0.5, 2.0, 0.5);
    sideSpire.position.set(ox, 1.0, oz);
    sideSpire.rotation.z = rot;
    spire.add(sideSpire);
  }

  const light = new THREE.PointLight(0x38bdf8, 1.2, 10);
  light.position.y = 2.2;
  spire.add(light);

  return spire;
}

// 10. Solaria Desert Stepped Pyramid (Optimized Single Merged Geometry)
export function createDesertPyramidMesh(): THREE.Group {
  const group = new THREE.Group();
  const sandStone = new THREE.MeshLambertMaterial({ color: 0xd4a373, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.8,
    roughness: 0.25,
    emissive: 0xffb300,
    emissiveIntensity: 0.35,
  });

  // Base tier 1 (includes foundation skirt into sand)
  const g1 = new THREE.BoxGeometry(16, 4.0, 16);
  g1.translate(0, 0.5, 0);

  // Tier 2
  const g2 = new THREE.BoxGeometry(11.5, 2.5, 11.5);
  g2.translate(0, 3.75, 0);

  // Tier 3
  const g3 = new THREE.BoxGeometry(7.5, 2.4, 7.5);
  g3.translate(0, 6.2, 0);

  const mergedBodyGeo = mergeGeometries([g1, g2, g3]);
  const pyramidBody = new THREE.Mesh(mergedBodyGeo, sandStone);
  pyramidBody.castShadow = false;
  pyramidBody.receiveShadow = true;
  group.add(pyramidBody);

  // Golden Capstone
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3.0, 3.5, 4), gold);
  cap.position.y = 8.85;
  cap.rotation.y = Math.PI / 4;
  cap.castShadow = false;
  cap.receiveShadow = true;
  group.add(cap);

  // Grand Entrance Portal
  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 3.6),
    new THREE.MeshBasicMaterial({ color: 0x110902 })
  );
  portal.position.set(0, 1.8, 8.02);
  group.add(portal);

  return group;
}

// 11. Solaria Desert Obelisk
export function createDesertObeliskMesh(): THREE.Group {
  const group = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0xddb892, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.85,
    emissive: 0xffa000,
    emissiveIntensity: 0.4,
  });

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.2), stone);
  base.position.y = 0.4;
  group.add(base);

  // Shaft (Tapered)
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 7.5, 4), stone);
  shaft.position.y = 4.55;
  shaft.rotation.y = Math.PI / 4;
  group.add(shaft);

  // Golden Point
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.6, 4), gold);
  point.position.y = 9.1;
  point.rotation.y = Math.PI / 4;
  group.add(point);

  return group;
}

// 12. Desert Oasis Palm Tree
export function createDesertPalmMesh(): THREE.Group {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true });
  const leafMatLight = new THREE.MeshLambertMaterial({ color: 0x43a047, flatShading: true });

  // Curving Trunk
  const trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 3.6, 6), trunkMat);
  trunk1.position.set(0, 1.4, 0); // Extends into ground down to -0.4
  trunk1.rotation.z = 0.08;
  // trunk1.castShadow = false;
  palm.add(trunk1);

  // Underground root flare
  const rootGeo = new THREE.CylinderGeometry(0.42, 0.65, 0.8, 6);
  const root = new THREE.Mesh(rootGeo, trunkMat);
  root.position.y = -0.3;
  palm.add(root);

  const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.0, 6), trunkMat);
  trunk2.position.set(0.3, 4.4, 0);
  trunk2.rotation.z = 0.16;
  palm.add(trunk2);

  // Fanned Palm Fronds
  const numFronds = 7;
  for (let i = 0; i < numFronds; i++) {
    const angle = (i / numFronds) * Math.PI * 2;
    const frond = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.06, 2.8),
      i % 2 === 0 ? leafMat : leafMatLight
    );
    frond.position.set(0.5, 5.8, 0);
    frond.rotation.y = angle;
    frond.rotation.x = 0.65;
    frond.translateZ(1.2);
    palm.add(frond);
  }

  return palm;
}

// 13. Thunderpeak Lightning Spire
export function createThunderSpireMesh(): THREE.Group {
  const group = new THREE.Group();
  const basalt = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.8,
    metalness: 0.3,
    flatShading: true,
  });
  const lightningCore = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  // Basalt pillar
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 8.5, 6), basalt);
  pillar.position.y = 4.25;
  group.add(pillar);

  // Floating Levitating Ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 6, 16), lightningCore);
  ring.position.y = 6.2;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Levitating Apex Crystal
  const apex = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), lightningCore);
  apex.position.y = 9.4;
  apex.scale.set(0.6, 2.0, 0.6);
  group.add(apex);

  return group;
}

// 14. Jade Bamboo Pagoda Temple
export function createJadePagodaMesh(): THREE.Group {
  const pagoda = new THREE.Group();
  const woodRed = new THREE.MeshLambertMaterial({ color: 0x991b1b, flatShading: true });
  const jadeRoof = new THREE.MeshStandardMaterial({
    color: 0x065f46,
    roughness: 0.3,
    metalness: 0.4,
    flatShading: true,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
  });
  const stoneBase = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });

  // Deep Stone Platform & Terrace
  const base = new THREE.Mesh(new THREE.BoxGeometry(10.6, 2.8, 10.6), stoneBase);
  base.position.y = -0.4;
  base.receiveShadow = true;
  pagoda.add(base);

  // Tier 1 Hall
  const hall1 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.2, 6.5), woodRed);
  hall1.position.y = 2.8;
  pagoda.add(hall1);

  // Roof 1 (Curved upturned roof)
  const roof1 = new THREE.Mesh(new THREE.ConeGeometry(6.2, 1.4, 4), jadeRoof);
  roof1.position.y = 5.1;
  roof1.rotation.y = Math.PI / 4;
  pagoda.add(roof1);

  // Tier 2 Hall
  const hall2 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 4.8), woodRed);
  hall2.position.y = 6.8;
  pagoda.add(hall2);

  // Roof 2
  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.3, 4), jadeRoof);
  roof2.position.y = 8.8;
  roof2.rotation.y = Math.PI / 4;
  pagoda.add(roof2);

  // Tier 3 Hall
  const hall3 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), woodRed);
  hall3.position.y = 10.3;
  pagoda.add(hall3);

  // Roof 3
  const roof3 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), jadeRoof);
  roof3.position.y = 11.8;
  roof3.rotation.y = Math.PI / 4;
  pagoda.add(roof3);

  // Golden Finial Spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 2.2, 6), gold);
  spire.position.y = 13.5;
  pagoda.add(spire);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), gold);
  orb.position.y = 14.7;
  pagoda.add(orb);

  // Emerald glow lantern
  const lanternLight = new THREE.PointLight(0x10b981, 1.4, 12);
  lanternLight.position.y = 3.5;
  pagoda.add(lanternLight);

  return pagoda;
}

// 15. Grand Japanese Torii Gate
export function createToriiGateMesh(): THREE.Group {
  const torii = new THREE.Group();
  const vermilion = new THREE.MeshLambertMaterial({ color: 0xb91c1c, flatShading: true });
  const blackWood = new THREE.MeshLambertMaterial({ color: 0x18181b, flatShading: true });
  const stone = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });

  // Stone bases
  for (const x of [-2.4, 2.4]) {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.6, 8), stone);
    plinth.position.set(x, 0.3, 0);
    torii.add(plinth);

    // Pillars
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 5.2, 8), vermilion);
    pillar.position.set(x, 3.0, 0);
    torii.add(pillar);
  }

  // Lower tie beam (Nuki)
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.28, 0.32), vermilion);
  nuki.position.set(0, 4.4, 0);
  torii.add(nuki);

  // Upper main curved crossbeam (Kasagi & Shimaki)
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.38, 0.45), vermilion);
  kasagi.position.set(0, 5.5, 0);
  torii.add(kasagi);

  const topCap = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.16, 0.55), blackWood);
  topCap.position.set(0, 5.75, 0);
  torii.add(topCap);

  return torii;
}

// 16. Dragonfang Bones & Volcanic Horns
export function createDragonSkullBonesMesh(): THREE.Group {
  const group = new THREE.Group();
  const boneMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, flatShading: true });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.9,
    metalness: 0.2,
    flatShading: true,
  });
  const magmaGlow = new THREE.MeshStandardMaterial({
    color: 0xff3d00,
    emissive: 0xdd2c00,
    emissiveIntensity: 1.0,
  });

  // Dragon Skull Crag
  const cranium = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 4.8), boneMat);
  cranium.position.set(0, 1.8, 0);
  group.add(cranium);

  // Snout
  const snout = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 3.4), boneMat);
  snout.position.set(0, 1.1, 3.6);
  group.add(snout);

  // Curved Dragon Horns
  for (const [x, rotZ] of [[-1.4, -0.4], [1.4, 0.4]]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4.2, 6), hornMat);
    horn.position.set(x, 4.0, -1.8);
    horn.rotation.x = -0.55;
    horn.rotation.z = rotZ;
    group.add(horn);
  }

  // Arched Ribcage Tunnel
  for (let i = 1; i <= 3; i++) {
    const ribZ = -i * 2.8;
    const ribTorus = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.24, 6, 12, Math.PI), boneMat);
    ribTorus.position.set(0, 0.2, ribZ);
    group.add(ribTorus);
  }

  // Glowing Magma pool underneath
  const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 12), magmaGlow);
  lavaPool.rotation.x = -Math.PI / 2;
  lavaPool.position.set(0, 0.08, 0);
  group.add(lavaPool);

  const flameLight = new THREE.PointLight(0xff3d00, 2.0, 14);
  flameLight.position.set(0, 2.5, 0);
  group.add(flameLight);

  return group;
}

// 17. Imperial Grand Sun Palace (Istana Kekaisaran Emas Astraea)
export function createImperialPalaceMesh(): THREE.Group {
  const palace = new THREE.Group();

  const whiteMarble = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
  const royalBlueRoof = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35 });
  const royalWindow = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.7,
    roughness: 0.1,
  });
  const redCarpet = new THREE.MeshLambertMaterial({ color: 0x991b1b });
  const goldFringe = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });

  // Elevated Marble Foundation Podium with deep sub-base (zero gaps)
  const podium = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 18), whiteMarble);
  podium.position.set(0, 0.8, 0);
  const podiumSubBase = new THREE.Mesh(new THREE.BoxGeometry(22.6, 3.2, 18.6), whiteMarble);
  podiumSubBase.position.set(0, -1.6, 0);
  palace.add(podium, podiumSubBase);

  // Grand Entrance Steps (Leading from podium z: 9.0, y: 1.6 smoothly down to ground y: 0.0, z: 15.4)
  // 8 progressive solid marble steps with deep foundation interlocking down to y: -1.5 (zero gaps)
  const stepCount = 8;
  const stepRise = 1.6 / stepCount; // 0.2m per step
  const stepRun = 0.8; // 0.8m per step
  const stairWidth = 11.0;

  for (let s = 0; s < stepCount; s++) {
    const stepTopY = 1.6 - (s + 1) * stepRise; // from 1.4 down to 0.0
    const stepZ = 9.0 + s * stepRun + stepRun / 2;
    // Step box extends from stepTopY down to -1.5 so there are NEVER floating gaps
    const stepHeight = stepTopY - (-1.5);
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, stepHeight, stepRun), whiteMarble);
    stepMesh.position.set(0, -1.5 + stepHeight / 2, stepZ);
    palace.add(stepMesh);

    // Red Carpet runner on this step tread
    const carpetStep = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.04, stepRun), redCarpet);
    carpetStep.position.set(0, stepTopY + 0.02, stepZ);
    palace.add(carpetStep);

    // Red Carpet runner on this step riser (front face)
    const riserHeight = stepRise;
    const carpetRiser = new THREE.Mesh(new THREE.BoxGeometry(3.6, riserHeight, 0.04), redCarpet);
    carpetRiser.position.set(0, stepTopY + riserHeight / 2, 9.0 + s * stepRun);
    palace.add(carpetRiser);
  }

  // Marble Balustrades & Handrails flanking stairs
  for (const bx of [-stairWidth / 2 - 0.4, stairWidth / 2 + 0.4]) {
    const balustrade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, stepCount * stepRun + 0.6), whiteMarble);
    balustrade.position.set(bx, 1.4, 9.0 + (stepCount * stepRun) / 2);
    balustrade.rotation.x = Math.atan2(1.6, stepCount * stepRun);
    const postBottom = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), whiteMarble);
    postBottom.position.set(bx, 0.8, 9.0 + stepCount * stepRun + 0.4);
    const postTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), whiteMarble);
    postTop.position.set(bx, 2.4, 9.0 - 0.4);
    const finialBottom = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), goldTrim);
    finialBottom.position.set(bx, 1.8, 9.0 + stepCount * stepRun + 0.4);
    const finialTop = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), goldTrim);
    finialTop.position.set(bx, 3.4, 9.0 - 0.4);
    palace.add(balustrade, postBottom, postTop, finialBottom, finialTop);
  }

  // Red Imperial Carpet on Portico (from doorway z: 6.8 to podium edge z: 9.0)
  const porticoCarpet = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.04, 2.2), redCarpet);
  porticoCarpet.position.set(0, 1.62, 7.9);
  palace.add(porticoCarpet);

  // Red Imperial Carpet extending straight out across the palace courtyard / pelataran istana
  // From bottom of stairs (z: 15.4) extending out to z: 34.0 (length 18.6m)
  const courtyardCarpetLength = 8.6;
  const courtyardCarpet = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.04, courtyardCarpetLength), redCarpet);
  courtyardCarpet.position.set(0, 0.03, 15.4 + courtyardCarpetLength / 2);
  // Gold fringe borders along left and right edges
  for (const fx of [-1.85, 1.85]) {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, courtyardCarpetLength), goldFringe);
    fringe.position.set(fx, 0.035, 15.4 + courtyardCarpetLength / 2);
    palace.add(fringe);
  }
  palace.add(courtyardCarpet);

  // Main Palace Central Hall
  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 14), whiteMarble);
  mainHall.position.set(0, 6.1, 0);
  palace.add(mainHall);

  // Marble Colonnade Pillars along front facade
  for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) === 1) continue; // Leave central doorway clear
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 7.5, 12), whiteMarble);
    pillar.position.set(i * 2.5, 5.35, 7.2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), goldTrim);
    cap.position.set(i * 2.5, 9.2, 7.2);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), goldTrim);
    base.position.set(i * 2.5, 1.8, 7.2);
    palace.add(pillar, cap, base);
  }

  // Grand Portal Arch Entrance
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(5.2, 6.5, 0.6), goldTrim);
  doorFrame.position.set(0, 4.85, 7.1);
  const royalDoor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5.8, 0.3), royalBlueRoof);
  royalDoor.position.set(0, 4.5, 7.15);
  palace.add(doorFrame, royalDoor);

  // Golden Arch Pediment over entrance
  const pediment = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.6, 4), goldTrim);
  pediment.position.set(0, 11.2, 7.1);
  pediment.rotation.y = Math.PI / 4;
  palace.add(pediment);

  // Central Golden Dome & Imperial Rotunda
  const rotundaBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.8, 3.2, 16), whiteMarble);
  rotundaBase.position.set(0, 12.2, 0);
  const goldenDome = new THREE.Mesh(new THREE.SphereGeometry(4.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldTrim);
  goldenDome.position.set(0, 13.8, 0);
  const palaceSpire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 4.2, 8), goldTrim);
  palaceSpire.position.set(0, 20.0, 0);
  // Imperial Star on top
  const starRelic = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), goldTrim);
  starRelic.position.set(0, 22.4, 0);
  palace.add(rotundaBase, goldenDome, palaceSpire, starRelic);

  // Flanking Royal Towers (Left & Right)
  for (const x of [-9.5, 9.5]) {
    const towerBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 14, 4.8), whiteMarble);
    towerBody.position.set(x, 8.6, 0);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.8, 5.4), goldTrim);
    cornice.position.set(x, 15.8, 0);
    const roofCone = new THREE.Mesh(new THREE.ConeGeometry(3.6, 5.5, 8), royalBlueRoof);
    roofCone.position.set(x, 18.8, 0);
    const towerSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 2.5, 6), goldTrim);
    towerSpire.position.set(x, 22.5, 0);

    // Stained glass arched windows
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 0.2), royalWindow);
    win.position.set(x, 10.5, 2.45);
    palace.add(towerBody, cornice, roofCone, towerSpire, win);
  }

  // Large Central Stained Glass Rose Window
  const roseWindow = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.3, 16), royalWindow);
  roseWindow.rotation.x = Math.PI / 2;
  roseWindow.position.set(0, 8.8, 7.1);
  palace.add(roseWindow);

  return palace;
}

// 18. Imperial Celestial 3-Tier Fountain of Immortality
export function createImperialFountainMesh(): THREE.Group {
  const fountain = new THREE.Group();

  const whiteMarble = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });

  // Base Octagonal Pool Basin
  const outerBasin = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.75, 8), whiteMarble);
  outerBasin.position.set(0, 0.38, 0);
  fountain.add(outerBasin);

  const waterSurface = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 8), waterMat);
  waterSurface.position.set(0, 0.65, 0);
  fountain.add(waterSurface);

  // Central Column & Tier 2 Basin
  const midColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.2, 12), whiteMarble);
  midColumn.position.set(0, 1.5, 0);
  const midBasin = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.1, 0.5, 12), whiteMarble);
  midBasin.position.set(0, 2.4, 0);
  const midWater = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.08, 12), waterMat);
  midWater.position.set(0, 2.62, 0);
  fountain.add(midColumn, midBasin, midWater);

  // Tier 3 Basin
  const topColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.6, 12), whiteMarble);
  topColumn.position.set(0, 3.2, 0);
  const topBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 0.4, 12), whiteMarble);
  topBasin.position.set(0, 3.9, 0);
  const topWater = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.06, 12), waterMat);
  topWater.position.set(0, 4.1, 0);
  fountain.add(topColumn, topBasin, topWater);

  // Astral Sun Crest at apex
  const sunRelic = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 1), goldTrim);
  sunRelic.position.set(0, 4.8, 0);
  fountain.add(sunRelic);

  const glowLight = new THREE.PointLight(0x38bdf8, 1.8, 12);
  glowLight.position.set(0, 3.0, 0);
  fountain.add(glowLight);

  return fountain;
}

// 19. Imperial City Gatehouse & Bastion Towers
export function createImperialGatehouseMesh(): THREE.Group {
  const gatehouse = new THREE.Group();

  const graniteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5, metalness: 0.1 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
  const royalBlueRoof = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35 });

  // Flanking Fortress Bastions (Left & Right)
  for (const x of [-5.5, 5.5]) {
    const bastion = new THREE.Mesh(new THREE.BoxGeometry(4.2, 9.5, 4.6), graniteMat);
    bastion.position.set(x, 4.75, 0);
    gatehouse.add(bastion);

    // Crenellated parapet
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 5.0), graniteMat);
    parapet.position.set(x, 9.8, 0);
    gatehouse.add(parapet);

    // Conical spire roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 4.2, 8), royalBlueRoof);
    roof.position.set(x, 12.2, 0);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.8, 6), goldTrim);
    spire.position.set(x, 14.8, 0);
    gatehouse.add(roof, spire);
  }

  // Central Archway Lintels
  const topWall = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.8, 4.0), graniteMat);
  topWall.position.set(0, 7.8, 0);
  const archGoldBand = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.4, 4.2), goldTrim);
  archGoldBand.position.set(0, 9.8, 0);
  gatehouse.add(topWall, archGoldBand);

  // Arched Portal Opening (Open corridor for walking)
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.0, 4.2), graniteMat);
  leftPillar.position.set(-3.0, 3.0, 0);
  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.0, 4.2), graniteMat);
  rightPillar.position.set(3.0, 3.0, 0);
  gatehouse.add(leftPillar, rightPillar);

  // Imperial Banner over gate
  const bannerPole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 0.1), goldTrim);
  bannerPole.position.set(0, 11.5, 2.2);
  const bannerCloth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.05), royalBlueRoof);
  bannerCloth.position.set(0, 10.2, 2.2);
  const sunInsignia = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), goldTrim);
  sunInsignia.position.set(0, 10.2, 2.25);
  gatehouse.add(bannerPole, bannerCloth, sunInsignia);

  return gatehouse;
}

// 20. Imperial Rampart City Wall Section
export function createImperialWallMesh(length: number = 18): THREE.Group {
  const wall = new THREE.Group();
  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
  const stoneTrim = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const goldCap = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 });

  // Main Wall Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(length, 6.5, 2.4), graniteMat);
  body.position.set(0, 3.25, 0);
  wall.add(body);

  // Base Plinth with deep sub-base into ground (never floats or sinks)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 0.8, 2.9), stoneTrim);
  plinth.position.set(0, 0.4, 0);
  const deepFoundation = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 3.5, 3.0), stoneTrim);
  deepFoundation.position.set(0, -1.75, 0);
  wall.add(plinth, deepFoundation);

  // Walkway Parapet on top
  const battlementCount = Math.floor(length / 2.2);
  for (let i = 0; i < battlementCount; i++) {
    const x = -length / 2 + 1.1 + i * 2.2;
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.5), graniteMat);
    merlon.position.set(x, 7.0, 1.0);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.15, 0.6), goldCap);
    cap.position.set(x, 7.6, 1.0);
    wall.add(merlon, cap);
  }

  return wall;
}

// 21. Imperial Grand Royal Bazaar Stall
export function createImperialBazaarStallMesh(canopyColor: number = 0x9333ea, patternColor: number = 0xfacc15): THREE.Group {
  const stall = new THREE.Group();

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
  const canopyMat = new THREE.MeshLambertMaterial({ color: canopyColor });
  const patternMat = new THREE.MeshLambertMaterial({ color: patternColor });
  const lanternGlow = new THREE.MeshBasicMaterial({ color: 0xffd54f });

  // Marble Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 2.8), marbleMat);
  base.position.set(0, 0.15, 0);
  stall.add(base);

  // Wooden Counter Desk
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 1.2), woodMat);
  counter.position.set(0, 0.7, 0.2);
  stall.add(counter);

  // 4 Corner Wooden Canopy Posts
  for (const [x, z] of [[-1.8, -1.1], [1.8, -1.1], [-1.8, 1.1], [1.8, 1.1]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), woodMat);
    post.position.set(x, 1.6, z);
    stall.add(post);
  }

  // Striped Silk Canopy Awning
  const awning = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 3.0), canopyMat);
  awning.position.set(0, 3.2, 0);
  awning.rotation.x = 0.08;
  stall.add(awning);

  // Valance Fringe
  for (let f = -3; f <= 3; f++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.05), (f % 2 === 0) ? canopyMat : patternMat);
    stripe.position.set(f * 0.58, 2.95, 1.48);
    stall.add(stripe);
  }

  // Hanging Lanterns
  for (const lx of [-1.6, 1.6]) {
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), lanternGlow);
    lantern.position.set(lx, 2.6, 1.2);
    stall.add(lantern);
  }

  return stall;
}

// 22. Imperial Cherry Blossom / Sakura Tree
export function createCherryBlossomTreeMesh(): THREE.Group {
  const tree = new THREE.Group();

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x451a03, flatShading: true });
  const sakuraMat1 = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.8,
    flatShading: true,
  });
  const sakuraMat2 = new THREE.MeshStandardMaterial({
    color: 0xfbcfe8,
    roughness: 0.8,
    flatShading: true,
  });

  // Gnarled Trunk
  const trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 3.8, 7), trunkMat);
  trunk1.position.set(0, 1.5, 0); // Extends into ground down to -0.4
  trunk1.castShadow = true;
  tree.add(trunk1);

  // Underground root flare
  const rootGeo = new THREE.CylinderGeometry(0.6, 0.85, 0.8, 7);
  const root = new THREE.Mesh(rootGeo, trunkMat);
  root.position.y = -0.3;
  tree.add(root);

  // Branches
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.2, 5), trunkMat);
  b1.position.set(0.6, 3.2, 0.3);
  b1.rotation.set(0.4, 0.2, -0.6);
  const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.0, 5), trunkMat);
  b2.position.set(-0.6, 3.1, -0.3);
  b2.rotation.set(-0.3, -0.2, 0.55);
  tree.add(b1, b2);

  // Soft Pink Blossom Canopy Clusters
  const clusters = [
    { pos: [0, 4.4, 0], scale: [2.4, 1.6, 2.4], mat: sakuraMat1 },
    { pos: [1.2, 3.9, 0.6], scale: [1.8, 1.4, 1.8], mat: sakuraMat2 },
    { pos: [-1.1, 3.8, -0.6], scale: [1.7, 1.3, 1.7], mat: sakuraMat1 },
    { pos: [0.3, 5.2, -0.4], scale: [1.9, 1.4, 1.9], mat: sakuraMat2 },
  ];

  for (const c of clusters) {
    const cluster = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), c.mat);
    cluster.position.set(c.pos[0], c.pos[1], c.pos[2]);
    cluster.scale.set(c.scale[0], c.scale[1], c.scale[2]);
    tree.add(cluster);
  }

  return tree;
}

// 23. Imperial Monument Statue of Hero Knight
export function createImperialHeroStatueMesh(): THREE.Group {
  const statue = new THREE.Group();

  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });
  const goldBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.25,
  });

  // Multi-tier Pedestal
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), pedestalMat);
  base1.position.set(0, 0.3, 0);
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), pedestalMat);
  base2.position.set(0, 1.3, 0);
  statue.add(base1, base2);

  // Knight Figure in Gold Bronze
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), goldBronzeMat);
  torso.position.set(0, 2.6, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), goldBronzeMat);
  head.position.set(0, 3.4, 0);
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.05), goldBronzeMat);
  sword.position.set(0.6, 2.6, 0.4);
  sword.rotation.z = -0.2;
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.1), goldBronzeMat);
  shield.position.set(-0.6, 2.6, 0.2);

  statue.add(torso, head, sword, shield);
  return statue;
}

// 24. Imperial Grand Throne of Aurelius
export function createImperialThroneMesh(): THREE.Group {
  const throne = new THREE.Group();

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.85,
    roughness: 0.2,
    emissive: 0x92400e,
    emissiveIntensity: 0.15,
  });
  const velvetMat = new THREE.MeshStandardMaterial({
    color: 0x881337,
    roughness: 0.7,
    metalness: 0.1,
  });
  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0xbe123c,
    emissiveIntensity: 0.4,
  });

  // Base platform & legs
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 1.8), goldMat);
  base.position.set(0, 0.2, 0);
  base.castShadow = true;
  throne.add(base);

  // Seat cushion
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.4), velvetMat);
  seat.position.set(0, 0.55, 0.1);
  throne.add(seat);

  // Backrest (high arch)
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.25), velvetMat);
  back.position.set(0, 1.8, -0.6);
  throne.add(back);

  // Gold back frame & crest
  const backFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 0.3), goldMat);
  backFrameL.position.set(-0.85, 1.8, -0.6);
  const backFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 0.3), goldMat);
  backFrameR.position.set(0.85, 1.8, -0.6);
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 4), goldMat);
  crest.position.set(0, 3.4, -0.6);
  crest.rotation.y = Math.PI / 4;
  throne.add(backFrameL, backFrameR, crest);

  // Armrests
  [-0.9, 0.9].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 1.4), goldMat);
    arm.position.set(x, 0.8, 0.1);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), rubyMat);
    gem.position.set(x, 1.18, 0.7);
    throne.add(arm, gem);
  });

  return throne;
}

// 25. Imperial Knight Honor Guard Statue
export function createImperialKnightStatueMesh(): THREE.Group {
  return createImperialHeroStatueMesh();
}

// 26. Imperial State Banquet Table
export function createImperialBanquetTableMesh(): THREE.Group {
  const table = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });

  // Tabletop (long table)
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 7.5), woodMat);
  top.position.set(0, 0.85, 0);
  top.castShadow = true;
  table.add(top);

  // Tablecloth runner
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 7.6), clothMat);
  cloth.position.set(0, 0.86, 0);
  table.add(cloth);

  // Table legs
  [-0.9, 0.9].forEach((x) => {
    [-3.2, 3.2].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.85, 8), woodMat);
      leg.position.set(x, 0.425, z);
      leg.castShadow = true;
      table.add(leg);
    });
  });

  // Tableware (plates & chalices)
  for (let z = -2.8; z <= 2.8; z += 1.4) {
    [-0.55, 0.55].forEach((x) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.03, 12), goldMat);
      plate.position.set(x, 0.95, z);
      const chalice = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.16, 8), goldMat);
      chalice.position.set(x + (x > 0 ? 0.2 : -0.2), 1.02, z + 0.15);
      table.add(plate, chalice);
    });
  }

  return table;
}

// 27. Imperial War Strategy & Council Table
export function createImperialWarTableMesh(): THREE.Group {
  const table = new THREE.Group();

  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.6 });
  const mapMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 });
  const markerRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const markerBlue = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });

  // Massive Round Council Table
  const tabletop = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2, 24), darkWoodMat);
  tabletop.position.set(0, 0.85, 0);
  tabletop.castShadow = true;
  table.add(tabletop);

  // Pedestal
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 0.85, 12), darkWoodMat);
  pedestal.position.set(0, 0.425, 0);
  table.add(pedestal);

  // Eldoria 3D Relief Map Surface
  const mapSurface = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.22, 24), mapMat);
  mapSurface.position.set(0, 0.86, 0);
  table.add(mapSurface);

  // Miniatures & strategic markers
  const markers = [
    { x: -0.6, z: 0.4, mat: markerBlue },
    { x: -0.4, z: -0.8, mat: markerBlue },
    { x: 0.5, z: -0.5, mat: markerRed },
    { x: 0.8, z: 0.6, mat: markerRed },
    { x: 0.0, z: 0.9, mat: goldMat },
  ];

  markers.forEach((m) => {
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), m.mat);
    pin.position.set(m.x, 1.15, m.z);
    table.add(pin);
  });

  return table;
}

// 28. Snowy Alpine Pine Tree (Pohon Pinus Bersalju Frostpeak)
export function createSnowyPineTreeMesh(scale = 1.0): THREE.Group {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
  const needleMat = new THREE.MeshLambertMaterial({ color: 0x1b4332, flatShading: true });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.9,
    flatShading: true,
  });

  // Main Trunk with deep root anchor
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 2.8, 6);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.8; // Extends down to -0.6
  trunk.castShadow = true;
  group.add(trunk);

  // Root flare anchor
  const root = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.65, 0.8, 6), trunkMat);
  root.position.y = -0.3;
  group.add(root);

  // Base snow drift mound around trunk
  const baseMound = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.2, 0.35, 7), snowMat);
  baseMound.position.y = 0.05;
  baseMound.receiveShadow = true;
  group.add(baseMound);

  // 3-tiered pine foliage cones with heavy snow mantle caps
  const tiers = [
    { rNeedle: 1.5, hNeedle: 1.6, yNeedle: 1.9, rSnow: 1.55, hSnow: 0.65, ySnow: 2.35 },
    { rNeedle: 1.2, hNeedle: 1.4, yNeedle: 2.8, rSnow: 1.25, hSnow: 0.58, ySnow: 3.2 },
    { rNeedle: 0.8, hNeedle: 1.2, yNeedle: 3.6, rSnow: 0.85, hSnow: 0.62, ySnow: 4.0 },
  ];

  tiers.forEach((t) => {
    // Dark green pine foliage cone
    const needleCone = new THREE.Mesh(new THREE.ConeGeometry(t.rNeedle, t.hNeedle, 7), needleMat);
    needleCone.position.y = t.yNeedle;
    needleCone.castShadow = true;
    group.add(needleCone);

    // Thick snow cap cone resting on top of foliage tier
    const snowCap = new THREE.Mesh(new THREE.ConeGeometry(t.rSnow, t.hSnow, 7), snowMat);
    snowCap.position.y = t.ySnow;
    snowCap.castShadow = true;
    group.add(snowCap);
  });

  if (scale !== 1.0) {
    group.scale.set(scale, scale, scale);
  }

  return group;
}

// 29. Slick Glacial Ice Boulder (Batu Es Licin Frostpeak)
export function createIceBoulderMesh(scale = 1.0): THREE.Group {
  const group = new THREE.Group();

  const iceMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.22,
    roughness: 0.16,
    metalness: 0.45,
    flatShading: true,
  });

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.9,
    flatShading: true,
  });

  // Faceted ice core rock
  const boulderGeo = new THREE.DodecahedronGeometry(1.3, 0);
  const boulder = new THREE.Mesh(boulderGeo, iceMat);
  boulder.scale.set(1.15, 0.95, 1.05);
  boulder.position.y = 0.85;
  boulder.castShadow = true;
  group.add(boulder);

  // Deep anchor foundation
  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.0, 7), iceMat);
  foundation.position.y = 0.0;
  group.add(foundation);

  // Snow cap on top of boulder
  const snowCap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), snowMat);
  snowCap.scale.set(1.1, 0.35, 1.05);
  snowCap.position.y = 1.6;
  snowCap.castShadow = true;
  group.add(snowCap);

  if (scale !== 1.0) {
    group.scale.set(scale, scale, scale);
  }

  return group;
}

// 30. Rounded Blunt Snow Drift Mound (Bukit Salju Bersudut Tumpul)
export function createSnowDriftMoundMesh(radiusX = 3.5, radiusZ = 2.8, height = 0.8): THREE.Group {
  const group = new THREE.Group();

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.9,
    flatShading: true,
  });

  // Soft rounded dome
  const domeGeo = new THREE.SphereGeometry(1.0, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, snowMat);
  dome.scale.set(radiusX, height, radiusZ);
  dome.receiveShadow = true;
  group.add(dome);

  // Sub-surface skirt to avoid floating on uneven mountain slopes
  const skirtGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.8, 10);
  const skirt = new THREE.Mesh(skirtGeo, snowMat);
  skirt.scale.set(radiusX, 1.0, radiusZ);
  skirt.position.y = -0.4;
  group.add(skirt);

  return group;
}

// 31. Glowing Ice Crystal Cluster (Pilar Kristal Es Bercahaya)
export function createIceCrystalClusterMesh(hasLight = false): THREE.Group {
  const cluster = new THREE.Group();

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.12,
    metalness: 0.8,
    transparent: true,
    opacity: 0.9,
    flatShading: true,
  });

  const snowBaseMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.9,
    flatShading: true,
  });

  // Base frosty crust
  const baseCrust = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 0.4, 6), snowBaseMat);
  baseCrust.position.y = 0.1;
  cluster.add(baseCrust);

  // Central tall obelisk
  const centralSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), crystalMat);
  centralSpire.scale.set(0.65, 2.8, 0.65);
  centralSpire.position.y = 1.9;
  centralSpire.castShadow = true;
  cluster.add(centralSpire);

  // Offset side crystal shards at varying tilt angles
  const shards = [
    { ox: -0.5, oz: 0.35, rotX: 0.2, rotZ: 0.35, sY: 1.8, sR: 0.45 },
    { ox: 0.55, oz: -0.3, rotX: -0.15, rotZ: -0.38, sY: 1.6, sR: 0.4 },
    { ox: 0.2, oz: 0.55, rotX: 0.35, rotZ: -0.15, sY: 1.3, sR: 0.35 },
  ];

  shards.forEach((s) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(s.sR, 0), crystalMat);
    shard.scale.set(1.0, s.sY, 1.0);
    shard.position.set(s.ox, s.sY * 0.5 + 0.2, s.oz);
    shard.rotation.x = s.rotX;
    shard.rotation.z = s.rotZ;
    shard.castShadow = true;
    cluster.add(shard);
  });

  if (hasLight) {
    const light = new THREE.PointLight(0x38bdf8, 0.9, 8);
    light.position.y = 1.8;
    cluster.add(light);
  }

  return cluster;
}

// 32. Large Ocean Merchant Galleon (Kapal Dagang Pelabuhan)
export function createMerchantGalleonMesh(): THREE.Group {
  const ship = new THREE.Group();

  const hullWood = new THREE.MeshLambertMaterial({ color: 0x4a2e18, flatShading: true });
  const deckWood = new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true });
  const trimGold = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 });
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f4, flatShading: true });
  const mastWood = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });

  // Main Hull Body
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 14), hullWood);
  hull.position.y = 1.6;
  hull.castShadow = true;
  ship.add(hull);

  // Bow prow taper
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.5, 4), hullWood);
  bow.rotateX(Math.PI / 2);
  bow.position.set(0, 1.6, 8.5);
  bow.castShadow = true;
  ship.add(bow);

  // Stern Castle (Raised rear cabin)
  const sternCabin = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.2, 4.5), hullWood);
  sternCabin.position.set(0, 3.8, -4.5);
  sternCabin.castShadow = true;
  ship.add(sternCabin);

  // Upper Deck Floor
  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 13), deckWood);
  mainDeck.position.set(0, 3.2, 0);
  ship.add(mainDeck);

  // Gold Trim Railing
  const railing = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.5, 13.5), trimGold);
  railing.position.set(0, 3.5, 0);
  ship.add(railing);

  // Masts
  const mastCoords = [
    { z: 1.5, h: 11, r: 0.28 },
    { z: -2.5, h: 9.5, r: 0.24 },
  ];

  mastCoords.forEach((m) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(m.r * 0.7, m.r, m.h, 6), mastWood);
    mast.position.set(0, m.h * 0.5 + 3.0, m.z);
    mast.castShadow = true;
    ship.add(mast);

    // Yardarms & Furled Sails
    for (let sy = 5.5; sy <= m.h + 1; sy += 3.2) {
      const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.2, 5), mastWood);
      yardarm.rotation.z = Math.PI / 2;
      yardarm.position.set(0, sy + 3.0, m.z);
      ship.add(yardarm);

      // Furled Sail Roll
      const sail = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.8, 6), sailMat);
      sail.rotation.z = Math.PI / 2;
      sail.position.set(0, sy + 2.7, m.z + 0.15);
      sail.castShadow = true;
      ship.add(sail);
    }
  });

  // (Bowsprit pole removed to ensure clean prow with zero mid-air floating timber)

  // Cargo crates & barrels on deck
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
  for (let c = 0; c < 4; c++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), crateMat);
    crate.position.set(c % 2 === 0 ? 1.0 : -1.0, 3.75, 4.0 - Math.floor(c / 2) * 1.4);
    ship.add(crate);
  }

  return ship;
}

// 33. Wooden Warship with Shields (Kapal Perang Kayu Ber-Shield)
export function createVikingWarshipMesh(): THREE.Group {
  const warship = new THREE.Group();

  const darkOak = new THREE.MeshLambertMaterial({ color: 0x332211, flatShading: true });
  const lightDeck = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const redShield = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.4 });
  const blueShield = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.4 });
  const goldBoss = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
  const mastWood = new THREE.MeshLambertMaterial({ color: 0x271911, flatShading: true });

  // Sleek Longship Hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 16), darkOak);
  hull.position.y = 1.1;
  hull.castShadow = true;
  warship.add(hull);

  // High curving prow (Bow)
  const prow = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.8, 5), darkOak);
  prow.rotation.x = Math.PI / 2.3;
  prow.position.set(0, 2.2, 9.2);
  prow.castShadow = true;
  warship.add(prow);

  // High curving stern
  const stern = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 5), darkOak);
  stern.rotation.x = -Math.PI / 2.3;
  stern.position.set(0, 2.0, -9.0);
  stern.castShadow = true;
  warship.add(stern);

  // Walkable deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 14.8), lightDeck);
  deck.position.set(0, 2.1, 0);
  warship.add(deck);

  // Center War Mast & Furled War Sail
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 9.5, 6), mastWood);
  mast.position.set(0, 6.5, 0);
  mast.castShadow = true;
  warship.add(mast);

  const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.0, 5), mastWood);
  yardarm.rotation.z = Math.PI / 2;
  yardarm.position.set(0, 10.0, 0);
  warship.add(yardarm);

  // War Pennant at top of mast
  const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6, 3), redShield);
  pennant.rotation.z = Math.PI / 2;
  pennant.position.set(0.9, 11.0, 0);
  warship.add(pennant);

  // Shields mounted along both gunwales (Left & Right)
  for (let s = -5.5; s <= 5.5; s += 1.4) {
    const isRed = Math.abs(Math.round(s * 10)) % 2 === 0;
    const shieldMat = isRed ? redShield : blueShield;

    // Left gunwale shield
    const leftShield = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12), shieldMat);
    leftShield.rotation.z = Math.PI / 2;
    leftShield.position.set(-1.85, 2.3, s);
    leftShield.castShadow = true;
    warship.add(leftShield);

    const leftBoss = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), goldBoss);
    leftBoss.position.set(-1.92, 2.3, s);
    warship.add(leftBoss);

    // Right gunwale shield
    const rightShield = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12), shieldMat);
    rightShield.rotation.z = Math.PI / 2;
    rightShield.position.set(1.85, 2.3, s);
    rightShield.castShadow = true;
    warship.add(rightShield);

    const rightBoss = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), goldBoss);
    rightBoss.position.set(1.92, 2.3, s);
    warship.add(rightBoss);
  }

  return warship;
}

// 34. Small Rowboat with Dual Oars (Perahu Dayung Kayu)
export function createRowboatMesh(): THREE.Group {
  const boat = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
  const seatMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true });
  const oarMat = new THREE.MeshLambertMaterial({ color: 0xbcaaa4 });

  // Hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 4.0), woodMat);
  hull.position.y = 0.35;
  hull.castShadow = true;
  boat.add(hull);

  // Bow & stern points
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 4), woodMat);
  bow.rotateX(Math.PI / 2);
  bow.position.set(0, 0.35, 2.4);
  boat.add(bow);

  const stern = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 4), woodMat);
  stern.rotateX(-Math.PI / 2);
  stern.position.set(0, 0.35, -2.3);
  boat.add(stern);

  // Benches
  for (const bz of [-0.9, 0.2, 1.2]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.45), seatMat);
    bench.position.set(0, 0.55, bz);
    boat.add(bench);
  }

  // Wooden Oars stowed flat inside the boat hull (no floating/slanted sticks in the air!)
  const leftOar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), oarMat);
  leftOar.rotation.x = Math.PI / 2;
  leftOar.position.set(-0.45, 0.42, 0);
  boat.add(leftOar);

  const rightOar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), oarMat);
  rightOar.rotation.x = Math.PI / 2;
  rightOar.position.set(0.45, 0.42, 0);
  boat.add(rightOar);

  return boat;
}

// 35. Ancient Ice Crystal Mountain Peak (Pegunungan Kristal Es Purba)
export function createIceSpikeMountainMesh(scale = 1.0): THREE.Group {
  const peak = new THREE.Group();

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    roughness: 0.1,
    metalness: 0.75,
    transparent: true,
    opacity: 0.9,
    flatShading: true,
  });

  const frostRockMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.8,
    flatShading: true,
  });

  // Base mountain crag
  const baseCrag = new THREE.Mesh(new THREE.ConeGeometry(5.5, 9.0, 7), frostRockMat);
  baseCrag.position.y = 4.5;
  baseCrag.castShadow = true;
  peak.add(baseCrag);

  // Main soaring central crystal shard
  const mainShard = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), crystalMat);
  mainShard.scale.set(1.0, 5.5, 1.0);
  mainShard.position.y = 12.0;
  mainShard.castShadow = true;
  peak.add(mainShard);

  // Flanking angled shards
  const shardConfigs = [
    { ox: -2.8, oz: 1.4, sY: 4.2, rX: 0.25, rZ: 0.35, sR: 1.8 },
    { ox: 2.6, oz: -1.8, sY: 4.0, rX: -0.2, rZ: -0.38, sR: 1.6 },
    { ox: 1.2, oz: 2.8, sY: 3.6, rX: 0.32, rZ: -0.15, sR: 1.5 },
  ];

  shardConfigs.forEach((sc) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(sc.sR, 0), crystalMat);
    shard.scale.set(1.0, sc.sY, 1.0);
    shard.position.set(sc.ox, 8.0, sc.oz);
    shard.rotation.x = sc.rX;
    shard.rotation.z = sc.rZ;
    shard.castShadow = true;
    peak.add(shard);
  });

  if (scale !== 1.0) {
    peak.scale.set(scale, scale, scale);
  }

  return peak;
}

// 36. Defensive Spiked Wood & Stone Barricade (Barikade Benteng Val-Kragor)
export function createWoodBarricadeMesh(length = 6): THREE.Group {
  const barricade = new THREE.Group();

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });

  // Stone base bollards
  for (const bx of [-length / 2 + 0.5, length / 2 - 0.5]) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), stoneMat);
    stone.position.set(bx, 0.7, 0);
    stone.castShadow = true;
    barricade.add(stone);
  }

  // Cross timber beams
  const beam1 = new THREE.Mesh(new THREE.BoxGeometry(length, 0.35, 0.35), woodMat);
  beam1.position.set(0, 0.6, 0);
  barricade.add(beam1);

  const beam2 = new THREE.Mesh(new THREE.BoxGeometry(length, 0.35, 0.35), woodMat);
  beam2.position.set(0, 1.3, 0);
  barricade.add(beam2);

  // Sharpened angled wooden stakes
  const stakeCount = Math.floor(length * 1.5);
  const step = (length - 0.8) / (stakeCount - 1);
  for (let i = 0; i < stakeCount; i++) {
    const sx = -length / 2 + 0.4 + i * step;
    const stake = new THREE.Mesh(new THREE.ConeGeometry(0.14, 2.2, 5), woodMat);
    // Angle forward towards attackers
    stake.rotation.x = (i % 2 === 0 ? 0.45 : -0.35);
    stake.position.set(sx, 1.0, (i % 2 === 0 ? 0.3 : -0.2));
    stake.castShadow = true;
    barricade.add(stake);

    // Iron reinforcement band
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 6), ironMat);
    band.rotation.x = stake.rotation.x;
    band.position.set(sx, 0.9, stake.position.z);
    barricade.add(band);
  }

  return barricade;
}

// Stone Bridge Pier rising from the bottom of the chasm/river to support suspension bridge
export function createStoneBridgePierMesh(height: number = 7.5): THREE.Group {
  const pier = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
  const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });

  // Deep underwater/bottom foundation plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.2, 4.6), darkStoneMat);
  plinth.position.y = -height / 2 + 1.1;
  plinth.receiveShadow = true;
  pier.add(plinth);

  // Main vertical stone masonry pillar
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.8, height - 1.5, 3.6), stoneMat);
  pillar.position.y = 0.5;
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  pier.add(pillar);

  // Capital / supporting corbel ledge under bridge deck
  const capital = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 4.4), darkStoneMat);
  capital.position.y = height / 2;
  capital.castShadow = true;
  pier.add(capital);

  return pier;
}

// Wooden Dock Beach Ramp & Short Stairs connecting sand beach to pier deck
export function createDockStairRampMesh(width: number = 4.6, length: number = 4.0, height: number = 1.8): THREE.Group {
  const group = new THREE.Group();
  const timberMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const darkTimberMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });

  // Sloping deck planks
  const slopeGeo = new THREE.BoxGeometry(width, 0.22, Math.hypot(length, height));
  const slope = new THREE.Mesh(slopeGeo, plankMat);
  slope.position.set(0, height / 2, length / 2);
  slope.rotation.x = -Math.atan2(height, length);
  slope.receiveShadow = true;
  group.add(slope);

  // Stepped wooden treads for character grip
  const stepCount = 5;
  for (let s = 1; s <= stepCount; s++) {
    const sz = (s / (stepCount + 1)) * length;
    const sy = (s / (stepCount + 1)) * height;
    const stepPlank = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.12, 0.35), timberMat);
    stepPlank.position.set(0, sy + 0.08, sz);
    group.add(stepPlank);
  }

  // Left & right side stringer curb timbers
  const curbGeo = new THREE.BoxGeometry(0.24, 0.4, Math.hypot(length, height));
  const curbL = new THREE.Mesh(curbGeo, darkTimberMat);
  curbL.position.set(-width / 2 + 0.12, height / 2 + 0.1, length / 2);
  curbL.rotation.x = -Math.atan2(height, length);

  const curbR = new THREE.Mesh(curbGeo, darkTimberMat);
  curbR.position.set(width / 2 - 0.12, height / 2 + 0.1, length / 2);
  curbR.rotation.x = -Math.atan2(height, length);

  group.add(curbL, curbR);

  // Lantern posts at beach foot
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.4, 6), timberMat);
  postL.position.set(-width / 2 + 0.15, 0.8, 0.3);
  const lanternL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), new THREE.MeshBasicMaterial({ color: 0xffb74d }));
  lanternL.position.set(-width / 2 + 0.15, 1.4, 0.3);

  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.4, 6), timberMat);
  postR.position.set(width / 2 - 0.15, 0.8, 0.3);
  const lanternR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), new THREE.MeshBasicMaterial({ color: 0xffb74d }));
  lanternR.position.set(width / 2 - 0.15, 1.4, 0.3);

  group.add(postL, lanternL, postR, lanternR);

  return group;
}

// ==========================================
// EXPANDED REGIONAL & INTER-ROAD 3D MODELS
// ==========================================

// Shoreline Boardwalk Apron (Menempel padat di pasir pantai, menghubungkan jalan batu ke tangga dermaga)
export function createDockShorelineBoardwalkMesh(width: number = 14.0, length: number = 3.5): THREE.Group {
  const group = new THREE.Group();
  const timberMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });
  const darkTimberMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });

  // Sub-base ground mudsills buried in sand (prevent floating gaps)
  const sillsGeo = new THREE.BoxGeometry(width + 0.4, 0.4, length + 0.4);
  const sills = new THREE.Mesh(sillsGeo, darkTimberMat);
  sills.position.set(0, -0.15, length / 2);
  sills.receiveShadow = true;
  group.add(sills);

  // Surface timber planks
  const deckGeo = new THREE.BoxGeometry(width, 0.16, length);
  const deck = new THREE.Mesh(deckGeo, plankMat);
  deck.position.set(0, 0.08, length / 2);
  deck.receiveShadow = true;
  group.add(deck);

  // Side curbs
  for (const bx of [-width / 2 + 0.1, width / 2 - 0.1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, length), timberMat);
    curb.position.set(bx, 0.16, length / 2);
    group.add(curb);
  }

  // Decorative rope bollards
  for (const bx of [-width / 2 + 0.3, width / 2 - 0.3]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.8, 6), timberMat);
    post.position.set(bx, 0.4, 0.3);
    group.add(post);
  }

  return group;
}

// Fortress Soldier Barracks (Barak Prajurit Militer Val-Kragor)
export function createBarracksMesh(): THREE.Group {
  const barracks = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
  const windowGlow = new THREE.MeshBasicMaterial({ color: 0xfde047 });

  // Stone Lower Level (Foundation & Lower Quarters)
  const lowerGeo = new THREE.BoxGeometry(11.0, 3.2, 7.0);
  const lower = new THREE.Mesh(lowerGeo, stoneMat);
  lower.position.y = 1.6;
  lower.castShadow = true;
  lower.receiveShadow = true;
  barracks.add(lower);

  // Timber Upper Level
  const upperGeo = new THREE.BoxGeometry(11.4, 2.6, 7.4);
  const upper = new THREE.Mesh(upperGeo, woodMat);
  upper.position.y = 4.5;
  upper.castShadow = true;
  barracks.add(upper);

  // Gabled Slate Roof
  const roofGeo = new THREE.ConeGeometry(7.2, 2.6, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 6.9;
  roof.scale.set(1.15, 1.0, 0.8);
  roof.castShadow = true;
  barracks.add(roof);

  // Heavy Oak Door
  const doorGeo = new THREE.BoxGeometry(1.6, 2.2, 0.2);
  const door = new THREE.Mesh(doorGeo, new THREE.MeshLambertMaterial({ color: 0x271e1b }));
  door.position.set(0, 1.1, 3.55);
  barracks.add(door);

  // Glowing Slit Windows
  const winGeo = new THREE.BoxGeometry(0.6, 0.7, 0.15);
  for (const wx of [-3.5, 3.5]) {
    const wLow = new THREE.Mesh(winGeo, windowGlow);
    wLow.position.set(wx, 1.8, 3.55);
    const wHigh = new THREE.Mesh(winGeo, windowGlow);
    wHigh.position.set(wx, 4.6, 3.75);
    barracks.add(wLow, wHigh);
  }

  // Exterior Torch Lamp
  const torch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), new THREE.MeshLambertMaterial({ color: 0x78350f }));
  torch.position.set(1.2, 2.2, 3.65);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  flame.position.set(1.2, 2.5, 3.65);
  barracks.add(torch, flame);

  return barracks;
}

// Archery Bullseye Target (Tempat Latihan Memanah)
export function createArcheryTargetMesh(): THREE.Group {
  const target = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  const strawMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
  const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

  // Tripod Stand
  const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.8, 4);
  const legL = new THREE.Mesh(legGeo, woodMat);
  legL.position.set(-0.35, 0.85, 0);
  legL.rotation.z = -0.22;
  const legR = new THREE.Mesh(legGeo, woodMat);
  legR.position.set(0.35, 0.85, 0);
  legR.rotation.z = 0.22;
  const legBack = new THREE.Mesh(legGeo, woodMat);
  legBack.position.set(0, 0.85, -0.45);
  legBack.rotation.x = -0.32;
  target.add(legL, legR, legBack);

  // Round Straw Boss
  const strawBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.16, 16), strawMat);
  strawBoss.rotation.x = Math.PI / 2 - 0.15;
  strawBoss.position.set(0, 1.25, 0.02);
  target.add(strawBoss);

  // Concentric Rings
  const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.17, 16), whiteMat);
  ring1.rotation.x = Math.PI / 2 - 0.15;
  ring1.position.set(0, 1.25, 0.03);
  const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 16), redMat);
  ring2.rotation.x = Math.PI / 2 - 0.15;
  ring2.position.set(0, 1.25, 0.04);
  const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.19, 16), goldMat);
  bullseye.rotation.x = Math.PI / 2 - 0.15;
  bullseye.position.set(0, 1.25, 0.05);
  target.add(ring1, ring2, bullseye);

  // Embedded Arrows
  const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), woodMat);
  arrowShaft.position.set(0.08, 1.28, 0.3);
  arrowShaft.rotation.x = Math.PI / 2;
  target.add(arrowShaft);

  return target;
}

// Combat Sparring Training Dummy (Dummy Target Latihan Prajurit)
export function createTrainingDummyMesh(): THREE.Group {
  const dummy = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
  const strawMat = new THREE.MeshLambertMaterial({ color: 0xca8a04 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
  const redTrim = new THREE.MeshLambertMaterial({ color: 0xb91c1c });

  // Base Stand
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.9), woodMat);
  base.position.y = 0.08;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.9, 6), woodMat);
  post.position.y = 0.95;
  dummy.add(base, post);

  // Straw Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.9, 8), strawMat);
  torso.position.y = 1.35;
  torso.castShadow = true;
  dummy.add(torso);

  // Crossbar Sparring Arms
  const arms = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6), woodMat);
  arms.position.set(0, 1.55, 0);
  arms.rotation.z = Math.PI / 2;
  dummy.add(arms);

  // Padded Straw Forearms
  for (const ax of [-0.65, 0.65]) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 6), strawMat);
    pad.position.set(ax, 1.55, 0);
    pad.rotation.z = Math.PI / 2;
    dummy.add(pad);
  }

  // Wooden Head with Painted Helmet & Target Cross
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.38, 0.35), ironMat);
  head.position.y = 2.0;
  head.castShadow = true;
  const targetMark = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.36), redTrim);
  targetMark.position.set(0, 2.0, 0.02);
  dummy.add(head, targetMark);

  return dummy;
}

// Timber Weapon Rack (Rak Persenjataan & Perisai)
export function createWeaponRackMesh(): THREE.Group {
  const rack = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
  const shieldMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });

  // Frame uprights & horizontal shelf
  for (const rx of [-1.1, 1.1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), woodMat);
    post.position.set(rx, 0.8, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.6), woodMat);
    foot.position.set(rx, 0.06, 0);
    rack.add(post, foot);
  }
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.14), woodMat);
  topBar.position.set(0, 1.45, 0);
  const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.25), woodMat);
  bottomBar.position.set(0, 0.25, 0);
  rack.add(topBar, bottomBar);

  // Stored Halberds / Spears
  for (let i = -3; i <= 3; i++) {
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 4), woodMat);
    spear.position.set(i * 0.32, 1.05, 0.02);
    spear.rotation.z = (Math.random() - 0.5) * 0.08;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), ironMat);
    tip.position.set(i * 0.32, 2.2, 0.02);
    rack.add(spear, tip);
  }

  // Mounted Shield on front
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.08), shieldMat);
  shield.position.set(0, 0.8, 0.12);
  rack.add(shield);

  return rack;
}

// Grand Circular Stone Plaza (Bundaran Alun-Alun Marmer & Jalan Lingkar Astraea)
export function createCircularPlazaMesh(outerRadius: number = 11.5, innerRadius: number = 4.8): THREE.Group {
  const plaza = new THREE.Group();
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.1 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });

  // Outer Ringroad Paved Disk
  const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, marbleMat);
  ringMesh.position.y = 0.02;
  ringMesh.receiveShadow = true;
  plaza.add(ringMesh);

  // Concentric Gold Inlay Ring
  const inlayGeo = new THREE.RingGeometry(innerRadius + 0.3, innerRadius + 0.5, 32);
  inlayGeo.rotateX(-Math.PI / 2);
  const inlay = new THREE.Mesh(inlayGeo, goldTrim);
  inlay.position.y = 0.025;
  plaza.add(inlay);

  // Outer Perimeter Stone Curb
  const curbGeo = new THREE.RingGeometry(outerRadius - 0.3, outerRadius, 32);
  curbGeo.rotateX(-Math.PI / 2);
  const curb = new THREE.Mesh(curbGeo, darkStone);
  curb.position.y = 0.035;
  plaza.add(curb);

  // Radial Sunburst Rays
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const rayLength = outerRadius - innerRadius - 0.8;
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, rayLength), goldTrim);
    const midR = innerRadius + rayLength / 2 + 0.4;
    ray.position.set(Math.cos(angle) * midR, 0.026, Math.sin(angle) * midR);
    ray.rotation.y = -angle + Math.PI / 2;
    plaza.add(ray);
  }

  // (Perimeter lampposts are curated and placed cleanly with colliders in world.ts to avoid blocking walkways)

  return plaza;
}

// Ancient Gnarled Mangrove / Banyan Swamp Tree (Pohon Rawa Purba Shadowfen)
export function createSwampMangroveTreeMesh(scale: number = 1.0): THREE.Group {
  const tree = new THREE.Group();
  tree.scale.setScalar(scale);

  const barkMat = new THREE.MeshLambertMaterial({ color: 0x27272a, flatShading: true }); // Dark bogwood
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x365314, flatShading: true }); // Mossy swamp green
  const vineMat = new THREE.MeshLambertMaterial({ color: 0x14532d, flatShading: true });

  // Curving Twisting Central Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 5.0, 7), barkMat);
  trunk.position.set(0.2, 2.5, 0);
  trunk.rotation.z = -0.12;
  trunk.castShadow = true;
  tree.add(trunk);

  // Stilt / Aerial Roots arching deep into bog water & mud
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const rootLen = 2.8;
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, rootLen, 5), barkMat);
    const rx = Math.cos(angle) * 1.5;
    const rz = Math.sin(angle) * 1.5;
    root.position.set(rx / 2, 1.2, rz / 2);
    root.rotation.x = Math.sin(angle) * 0.45;
    root.rotation.z = Math.cos(angle) * 0.45;
    tree.add(root);
  }

  // Large Layered Weeping Canopy
  const crownLevels = [
    { y: 4.8, r: 3.2, h: 2.0 },
    { y: 6.0, r: 2.6, h: 1.8 },
    { y: 7.2, r: 1.8, h: 1.4 },
  ];
  crownLevels.forEach((lvl) => {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(lvl.r, lvl.h, 7), foliageMat);
    crown.position.y = lvl.y;
    crown.castShadow = true;
    tree.add(crown);
  });

  // Hanging Vine Tendrils
  for (let v = 0; v < 6; v++) {
    const vAngle = (v / 6) * Math.PI * 2;
    const vineLen = 1.8 + Math.random() * 1.2;
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, vineLen, 4), vineMat);
    vine.position.set(Math.cos(vAngle) * 2.2, 4.2 - vineLen / 2, Math.sin(vAngle) * 2.2);
    tree.add(vine);
  }

  return tree;
}

// Mossy Swamp Boulder (Bebatuan Rawa Berlumut)
export function createMossySwampBoulderMesh(scale: number = 1.0): THREE.Group {
  const rock = new THREE.Group();
  rock.scale.setScalar(scale);

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x1f2937, flatShading: true });
  const mossMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f, flatShading: true });

  // Main irregular boulder
  const geo = new THREE.DodecahedronGeometry(1.4, 1);
  const mainRock = new THREE.Mesh(geo, stoneMat);
  mainRock.position.y = 1.0;
  mainRock.scale.set(1.4, 0.85, 1.1);
  mainRock.castShadow = true;
  mainRock.receiveShadow = true;
  rock.add(mainRock);

  // Top Moss cap
  const mossGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const moss = new THREE.Mesh(mossGeo, mossMat);
  moss.position.set(0.1, 1.35, 0.1);
  moss.scale.set(1.3, 0.45, 1.0);
  rock.add(moss);

  return rock;
}

// Murky Green Swamp Water Pool (Rawa-Rawa Air Keruh Hijau)
export function createMurkySwampPoolMesh(radius: number = 3.8): THREE.Group {
  const pool = new THREE.Group();
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  const lilyMat = new THREE.MeshLambertMaterial({ color: 0x65a30d });
  const mudRimMat = new THREE.MeshLambertMaterial({ color: 0x1c1917, flatShading: true });

  // Muddy Rim depression
  const rimGeo = new THREE.RingGeometry(radius - 0.4, radius + 0.6, 16);
  rimGeo.rotateX(-Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, mudRimMat);
  rim.position.y = 0.01;
  pool.add(rim);

  // Murky Pool Disc
  const waterGeo = new THREE.CircleGeometry(radius, 16);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.02;
  pool.add(water);

  // Floating Lily Pads
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.3;
    const dist = radius * 0.55;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35, 8), lilyMat);
    pad.rotateX(-Math.PI / 2);
    pad.position.set(Math.cos(angle) * dist, 0.025, Math.sin(angle) * dist);
    pool.add(pad);
  }

  return pool;
}

// Atmospheric Swamp Ground Mist Plane (Efek Kabut Tipis)
export function createSwampMistPlaneMesh(width: number = 26, depth: number = 26): THREE.Mesh {
  const mistGeo = new THREE.PlaneGeometry(width, depth, 4, 4);
  mistGeo.rotateX(-Math.PI / 2);
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const mist = new THREE.Mesh(mistGeo, mistMat);
  mist.position.y = 0.45;
  return mist;
}

// 3D Stone / Dirt Road Ribbon Mesh Generator
// Creates visible continuous textured path ribbons conforming directly to terrain elevation!
export function createStoneRoadRibbonMesh(
  points: Array<[number, number]>,
  width: number = 3.6,
  yFunc: (x: number, z: number) => number,
  roadColor: number = 0xb09e8a,
  curbColor: number = 0x6d5745
): THREE.Group {
  const roadGroup = new THREE.Group();
  if (points.length < 2) return roadGroup;

  const halfW = width / 2;
  const roadMat = new THREE.MeshStandardMaterial({
    color: roadColor,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const curbMat = new THREE.MeshStandardMaterial({
    color: curbColor,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
  });

  const positions: number[] = [];
  const curbPositionsL: number[] = [];
  const curbPositionsR: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const cur = points[i];
    // Direction calculation
    let dx = 0;
    let dz = 0;
    if (i < points.length - 1) {
      dx = points[i + 1][0] - cur[0];
      dz = points[i + 1][1] - cur[1];
    } else {
      dx = cur[0] - points[i - 1][0];
      dz = cur[1] - points[i - 1][1];
    }
    const len = Math.hypot(dx, dz) || 1;
    // Normal vector perpendicular to path direction
    const nx = -dz / len;
    const nz = dx / len;

    const lx = cur[0] + nx * halfW;
    const lz = cur[1] + nz * halfW;
    const ly = yFunc(lx, lz) + 0.04;

    const rx = cur[0] - nx * halfW;
    const rz = cur[1] - nz * halfW;
    const ry = yFunc(rx, rz) + 0.04;

    positions.push(lx, ly, lz, rx, ry, rz);

    // Side Curbs (Left & Right raised stones)
    curbPositionsL.push(lx, ly + 0.05, lz, lx + nx * 0.28, ly + 0.07, lz + nz * 0.28);
    curbPositionsR.push(rx, ry + 0.05, rz, rx - nx * 0.28, ry + 0.07, rz - nz * 0.28);
  }

  // Build Triangle Strip / Indexed Triangles for road
  const indices: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const v0 = i * 2;
    const v1 = i * 2 + 1;
    const v2 = (i + 1) * 2;
    const v3 = (i + 1) * 2 + 1;
    indices.push(v0, v1, v2, v2, v1, v3);
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  roadGroup.add(roadMesh);

  // Left Curb Mesh
  const curbGeoL = new THREE.BufferGeometry();
  curbGeoL.setAttribute('position', new THREE.Float32BufferAttribute(curbPositionsL, 3));
  curbGeoL.setIndex(indices);
  curbGeoL.computeVertexNormals();
  roadGroup.add(new THREE.Mesh(curbGeoL, curbMat));

  // Right Curb Mesh
  const curbGeoR = new THREE.BufferGeometry();
  curbGeoR.setAttribute('position', new THREE.Float32BufferAttribute(curbPositionsR, 3));
  curbGeoR.setIndex(indices);
  curbGeoR.computeVertexNormals();
  roadGroup.add(new THREE.Mesh(curbGeoR, curbMat));

  return roadGroup;
}

// ==========================================
// DRAGONFANG CALDERA & THUNDERPEAK 3D MODELS
// ==========================================

// Retakan Tanah Berlapis Lava Merah Menyala (Kaldera Naga)
export function createLavaCrackMesh(radius: number = 3.5): THREE.Group {
  const group = new THREE.Group();
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x18181b, flatShading: true });
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff3d00,
    emissive: 0xff2200,
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });

  // Basalt jagged crust rim
  const rimGeo = new THREE.RingGeometry(radius * 0.4, radius, 12);
  rimGeo.rotateX(-Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.02;
  group.add(rim);

  // Glowing molten magma core
  const coreGeo = new THREE.CircleGeometry(radius * 0.65, 12);
  coreGeo.rotateX(-Math.PI / 2);
  const core = new THREE.Mesh(coreGeo, lavaMat);
  core.position.y = 0.025;
  group.add(core);

  // Radial crack veins
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
    const veinLen = radius * 0.85;
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, veinLen), lavaMat);
    const midR = radius * 0.45;
    vein.position.set(Math.cos(angle) * midR, 0.026, Math.sin(angle) * midR);
    vein.rotation.y = -angle + Math.PI / 2;
    group.add(vein);
  }

  const lavaLight = new THREE.PointLight(0xff3d00, 1.2, 10);
  lavaLight.position.set(0, 0.6, 0);
  group.add(lavaLight);

  return group;
}

// Pilar Batu Vulkanik Berapi / Kolom Basalt (Kaldera Naga)
export function createVolcanicPillarMesh(height: number = 6.0): THREE.Group {
  const pillar = new THREE.Group();
  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, flatShading: true });
  const magmaMat = new THREE.MeshStandardMaterial({
    color: 0xff3d00,
    emissive: 0xff2200,
    emissiveIntensity: 0.9,
  });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });

  // Main hexagonal basalt column
  const colGeo = new THREE.CylinderGeometry(0.7, 0.95, height, 6);
  const col = new THREE.Mesh(colGeo, basaltMat);
  col.position.y = height / 2;
  col.castShadow = true;
  col.receiveShadow = true;
  pillar.add(col);

  // Vertical glowing magma fissure vein along the side
  const veinGeo = new THREE.BoxGeometry(0.12, height * 0.85, 0.16);
  const vein = new THREE.Mesh(veinGeo, magmaMat);
  vein.position.set(0.68, height / 2, 0);
  pillar.add(vein);

  // Top Flaming Fire Basin
  const bowlGeo = new THREE.CylinderGeometry(1.0, 0.6, 0.6, 6);
  const bowl = new THREE.Mesh(bowlGeo, basaltMat);
  bowl.position.y = height + 0.3;
  pillar.add(bowl);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.2, 6), fireMat);
  flame.position.y = height + 0.9;
  pillar.add(flame);

  const flameLight = new THREE.PointLight(0xff5722, 1.5, 12);
  flameLight.position.y = height + 1.1;
  pillar.add(flameLight);

  return pillar;
}

// Bebatuan Vulkanik Hitam Berurat Magma (Kaldera Naga)
export function createVolcanicBasaltRockMesh(scale: number = 1.0): THREE.Group {
  const rock = new THREE.Group();
  rock.scale.setScalar(scale);

  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, flatShading: true });
  const magmaMat = new THREE.MeshStandardMaterial({
    color: 0xff3d00,
    emissive: 0xff2200,
    emissiveIntensity: 0.8,
  });

  const geo = new THREE.DodecahedronGeometry(1.3, 1);
  const mainRock = new THREE.Mesh(geo, basaltMat);
  mainRock.position.y = 0.9;
  mainRock.scale.set(1.3, 0.85, 1.1);
  mainRock.castShadow = true;
  mainRock.receiveShadow = true;
  rock.add(mainRock);

  // Magma glowing seam
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.9), magmaMat);
  seam.position.set(0.2, 0.9, 0.1);
  seam.rotation.z = 0.4;
  rock.add(seam);

  return rock;
}

// Kristal Petir Biru Bersinar (Puncak Halilintar / Thunderpeak)
export function createLightningCrystalMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x00f0ff,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.88,
    flatShading: true,
  });
  const darkStone = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });

  // Stone base pedestal
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), darkStone);
  base.position.y = 0.2;
  group.add(base);

  // Tall central crystal spire
  const mainSpire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 5), crystalMat);
  mainSpire.position.set(0, 1.8, 0);
  mainSpire.castShadow = true;
  group.add(mainSpire);

  // Clustered smaller crystals angled around base
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const subSpire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.8, 5), crystalMat);
    subSpire.position.set(Math.cos(angle) * 0.45, 1.0, Math.sin(angle) * 0.45);
    subSpire.rotation.x = Math.sin(angle) * 0.35;
    subSpire.rotation.z = Math.cos(angle) * 0.35;
    group.add(subSpire);
  }

  // Floating lightning spark ring
  const ringGeo = new THREE.TorusGeometry(0.7, 0.03, 6, 16);
  ringGeo.rotateX(Math.PI / 2);
  const sparkRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xbae6fd }));
  sparkRing.position.y = 2.4;
  group.add(sparkRing);

  const light = new THREE.PointLight(0x00f0ff, 1.6, 12);
  light.position.set(0, 2.2, 0);
  group.add(light);

  return group;
}

// Menara Ritual Purba Puncak Halilintar (Ancient Ritual Monolith Tower)
export function createAncientRitualTowerMesh(): THREE.Group {
  const tower = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x00f0ff,
    emissiveIntensity: 0.95,
  });

  // Stepped Plinth Foundation
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 6.5), stoneMat);
  step1.position.y = 0.4;
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 5.2), stoneMat);
  step2.position.y = 1.2;
  tower.add(step1, step2);

  // Main Obelisk / Ritual Monolith
  const obelisk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.5, 2.4), stoneMat);
  obelisk.position.y = 5.2;
  obelisk.castShadow = true;
  obelisk.receiveShadow = true;
  tower.add(obelisk);

  // Pyramidion Spire Top
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.6, 4), runeMat);
  top.position.y = 9.8;
  top.rotation.y = Math.PI / 4;
  tower.add(top);

  // Carved Glowing Lightning Rune Bands
  for (const ry of [3.5, 5.5, 7.2]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, 2.5), runeMat);
    band.position.y = ry;
    tower.add(band);
  }

  // Floating Energy Aura Orb
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), runeMat);
  orb.position.y = 11.6;
  tower.add(orb);

  const orbLight = new THREE.PointLight(0x00f0ff, 2.0, 18);
  orbLight.position.y = 11.6;
  tower.add(orbLight);

  return tower;
}

// ==========================================
// SOLARIA DESERT VILLAGE & PALACE 3D ASSETS
// ==========================================

export function createDesertMudBrickHouseMesh(style: number = 0): THREE.Group {
  const house = new THREE.Group();

  const adobeMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.92,
    metalness: 0.05,
  });
  const darkAdobeMat = new THREE.MeshStandardMaterial({
    color: 0xb48154,
    roughness: 0.95,
  });
  const woodVigaMat = new THREE.MeshStandardMaterial({
    color: 0x5c3d28,
    roughness: 0.85,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x452311,
    roughness: 0.75,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: style === 1 ? 0x0284c7 : style === 2 ? 0x059669 : 0xb45309,
    roughness: 0.8,
  });

  if (style === 1) {
    // Two-tiered tiered desert adobe villa
    // Lower floor
    const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, 6.4), adobeMat);
    base.position.y = 1.9;
    base.castShadow = true;
    base.receiveShadow = true;
    house.add(base);

    // Upper floor stepped back
    const upper = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 4.4), adobeMat);
    upper.position.set(-0.8, 3.8 + 1.6, -0.6);
    upper.castShadow = true;
    upper.receiveShadow = true;
    house.add(upper);

    // Upper terrace cloth canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 3.8), clothMat);
    canopy.position.set(-0.8, 7.1, -0.6);
    house.add(canopy);

    // Parapets around lower roof terrace
    const parapetF = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.45, 0.3), darkAdobeMat);
    parapetF.position.set(0, 3.8 + 0.22, 3.1);
    house.add(parapetF);

    // Protruding wooden vigas
    for (let x = -3.0; x <= 3.0; x += 1.0) {
      const viga = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.8, 8), woodVigaMat);
      viga.rotation.x = Math.PI / 2;
      viga.position.set(x, 3.5, 0);
      house.add(viga);
    }
  } else {
    // Single-story authentic mud-brick house
    const w = style === 2 ? 8.0 : 6.2;
    const d = style === 2 ? 6.8 : 5.4;
    const h = 3.6;

    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), adobeMat);
    base.position.y = h / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    house.add(base);

    // Parapets
    const parapetFront = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.45, 0.35), darkAdobeMat);
    parapetFront.position.set(0, h + 0.22, d / 2);
    house.add(parapetFront);
    const parapetBack = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.45, 0.35), darkAdobeMat);
    parapetBack.position.set(0, h + 0.22, -d / 2);
    house.add(parapetBack);

    // Protruding wooden vigas
    for (let vx = -w / 2 + 0.6; vx <= w / 2 - 0.6; vx += 0.9) {
      const viga = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, d + 0.6, 8), woodVigaMat);
      viga.rotation.x = Math.PI / 2;
      viga.position.set(vx, h - 0.25, 0);
      house.add(viga);
    }

    // Doorway awning
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.4), clothMat);
    awning.position.set(0, 2.7, d / 2 + 0.65);
    awning.rotation.x = 0.15;
    house.add(awning);
  }

  // Arched wooden doorway
  const doorGeo = new THREE.BoxGeometry(1.6, 2.5, 0.2);
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 1.25, style === 1 ? 3.25 : (style === 2 ? 3.45 : 2.75));
  house.add(door);

  // Decorative clay water pots / jars at entrance
  const jarMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });
  for (const jx of [-1.2, 1.2, 1.6]) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.7, 10), jarMat);
    jar.position.set(jx, 0.35, style === 1 ? 3.5 : (style === 2 ? 3.7 : 3.0));
    house.add(jar);
  }

  return house;
}

export function createDesertPalaceMesh(): THREE.Group {
  const palace = new THREE.Group();

  const sandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    roughness: 0.85,
    metalness: 0.1,
  });
  const darkSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xb8860b,
    roughness: 0.8,
    metalness: 0.2,
  });
  const goldDomeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.85,
  });
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.6,
  });

  // 1. Broad Sandstone Terrace Podium
  const podium = new THREE.Mesh(new THREE.BoxGeometry(26, 1.4, 20), sandstoneMat);
  podium.position.y = 0.7;
  podium.receiveShadow = true;
  palace.add(podium);

  // Grand Entrance Steps
  const steps = new THREE.Mesh(new THREE.BoxGeometry(12, 0.7, 5), darkSandstoneMat);
  steps.position.set(0, 0.35, 12);
  palace.add(steps);

  // 2. Main Palace Citadel Block
  const citadel = new THREE.Mesh(new THREE.BoxGeometry(20, 8.5, 15), sandstoneMat);
  citadel.position.set(0, 1.4 + 4.25, 0);
  citadel.castShadow = true;
  citadel.receiveShadow = true;
  palace.add(citadel);

  // 3. Central Grand Horseshoe Archway Portico
  const portico = new THREE.Mesh(new THREE.BoxGeometry(8, 7.5, 3.5), darkSandstoneMat);
  portico.position.set(0, 1.4 + 3.75, 8.5);
  portico.castShadow = true;
  palace.add(portico);

  const archHole = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 2.0, 4.0, 16),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 })
  );
  archHole.rotation.x = Math.PI / 2;
  archHole.position.set(0, 1.4 + 3.5, 8.5);
  palace.add(archHole);

  // 4. Central Gilded Onion Dome
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.0, 1.8, 24), darkSandstoneMat);
  domeBase.position.set(0, 1.4 + 8.5 + 0.9, 0);
  palace.add(domeBase);

  const domeGeo = new THREE.SphereGeometry(4.6, 24, 20);
  domeGeo.scale(1.0, 1.35, 1.0);
  const dome = new THREE.Mesh(domeGeo, goldDomeMat);
  dome.position.set(0, 1.4 + 8.5 + 1.8 + 2.5, 0);
  dome.castShadow = true;
  palace.add(dome);

  // Crescent Spire Finial
  const finialSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 2.8, 8), goldDomeMat);
  finialSpire.position.set(0, 1.4 + 8.5 + 1.8 + 6.2, 0);
  palace.add(finialSpire);

  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 16, Math.PI * 1.5), goldDomeMat);
  crescent.position.set(0, 1.4 + 8.5 + 1.8 + 7.5, 0);
  palace.add(crescent);

  // 5. Four Octagonal Corner Minaret Towers
  const minaretOffsets = [
    { x: -11.5, z: -8.5 },
    { x: 11.5, z: -8.5 },
    { x: -11.5, z: 8.5 },
    { x: 11.5, z: 8.5 },
  ];
  minaretOffsets.forEach((mo) => {
    const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 14.5, 12), sandstoneMat);
    towerShaft.position.set(mo.x, 1.4 + 7.25, mo.z);
    towerShaft.castShadow = true;
    palace.add(towerShaft);

    // Tower Balcony
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.8, 1.2, 12), darkSandstoneMat);
    balcony.position.set(mo.x, 1.4 + 14.5, mo.z);
    palace.add(balcony);

    // Minaret Golden Domelet
    const miniDomeGeo = new THREE.SphereGeometry(1.5, 16, 12);
    miniDomeGeo.scale(1.0, 1.4, 1.0);
    const miniDome = new THREE.Mesh(miniDomeGeo, goldDomeMat);
    miniDome.position.set(mo.x, 1.4 + 15.6 + 1.0, mo.z);
    miniDome.castShadow = true;
    palace.add(miniDome);
  });

  // 6. Crimson & Gold Banners on Facade
  for (const bx of [-3.2, 3.2]) {
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 0.08), bannerMat);
    banner.position.set(bx, 1.4 + 5.0, 10.3);
    palace.add(banner);
  }

  // Palace Lantern Braziers
  for (const lx of [-4.5, 4.5]) {
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 1.2, 8), darkSandstoneMat);
    brazier.position.set(lx, 1.4 + 0.6, 10.5);
    palace.add(brazier);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff7a00 })
    );
    flame.position.set(lx, 1.4 + 1.35, 10.5);
    palace.add(flame);

    const pLight = new THREE.PointLight(0xff7a00, 1.8, 12);
    pLight.position.set(lx, 1.4 + 1.5, 10.5);
    palace.add(pLight);
  }

  return palace;
}

export function createDesertTentMesh(stripeColor: number = 0x991b1b): THREE.Group {
  const tent = new THREE.Group();

  const tanClothMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 });
  const stripeClothMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.85 });
  const woodPoleMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.8 });
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.8 });

  // Faceted tent canopy
  const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.6, 6, 1, true), tanClothMat);
  tentRoof.position.y = 1.3 + 1.3;
  // tentRoof.castShadow = false;
  tent.add(tentRoof);

  // Striped ridge covers
  const stripeRidge = new THREE.Mesh(new THREE.ConeGeometry(3.62, 2.62, 6, 1, true, 0, Math.PI / 3), stripeClothMat);
  stripeRidge.position.y = 1.3 + 1.3;
  tent.add(stripeRidge);
  const stripeRidge2 = new THREE.Mesh(new THREE.ConeGeometry(3.62, 2.62, 6, 1, true, Math.PI * (2/3), Math.PI / 3), stripeClothMat);
  stripeRidge2.position.y = 1.3 + 1.3;
  tent.add(stripeRidge2);

  // Center Pole
  const centerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.9, 8), woodPoleMat);
  centerPole.position.y = 1.95;
  tent.add(centerPole);

  // 4 Corner Poles
  for (let a = 0; a < 4; a++) {
    const angle = (a / 4) * Math.PI * 2;
    const px = Math.cos(angle) * 2.8;
    const pz = Math.sin(angle) * 2.8;
    const cornerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), woodPoleMat);
    cornerPole.position.set(px, 0.8, pz);
    tent.add(cornerPole);
  }

  // Interior Carpet
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 4.2), carpetMat);
  carpet.position.y = 0.03;
  carpet.receiveShadow = true;
  tent.add(carpet);

  // Hanging Brass Lantern inside
  const lantern = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.2, 0),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  lantern.position.set(0, 1.8, 0);
  tent.add(lantern);

  return tent;
}

export function createDesertBazaarStallMesh(canopyColor: number = 0xd97706, stripeColor: number = 0xfef08a): THREE.Group {
  const stall = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.8 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.8 });

  // Wooden counter table
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.6), woodMat);
  counter.position.set(0, 0.5, 0);
  counter.castShadow = true;
  counter.receiveShadow = true;
  stall.add(counter);

  // 4 Corner Support Posts
  const postOffsets = [
    [-1.5, -0.7],
    [1.5, -0.7],
    [-1.5, 0.7],
    [1.5, 0.7],
  ];
  postOffsets.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6), woodMat);
    post.position.set(px, 1.4, pz);
    stall.add(post);
  });

  // Striped Canopy Awning
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.0), canopyMat);
  canopy.position.set(0, 2.8, 0);
  canopy.rotation.x = 0.12;
  stall.add(canopy);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 2.02), stripeMat);
  stripe.position.set(0, 2.8, 0);
  stripe.rotation.x = 0.12;
  stall.add(stripe);

  // Goods: Colorful spice mounds
  const spiceColors = [0xef4444, 0xf59e0b, 0x06b6d4, 0x854d0e];
  spiceColors.forEach((sc, idx) => {
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: sc, roughness: 0.95 })
    );
    mound.position.set(-1.1 + idx * 0.7, 1.15, 0.15);
    stall.add(mound);
  });

  return stall;
}

export function createDesertOasisWellMesh(): THREE.Group {
  const well = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.8 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });

  // Circular stone well curb
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 1.1, 16), stoneMat);
  rim.position.y = 0.55;
  // rim.castShadow = false;
  well.add(rim);

  // Interior Water
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16), waterMat);
  water.position.y = 0.85;
  well.add(water);

  // 2 Side Timber Pillars
  for (const sx of [-1.5, 1.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), woodMat);
    post.position.set(sx, 1.6, 0);
    well.add(post);
  }

  // Crossbeam & Pulley
  const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.22), woodMat);
  crossbeam.position.set(0, 3.1, 0);
  well.add(crossbeam);

  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 8, 16), woodMat);
  pulley.position.set(0, 2.8, 0);
  well.add(pulley);

  // Wooden water bucket
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 10), woodMat);
  bucket.position.set(0, 1.8, 0);
  well.add(bucket);

  return well;
}

export function createDesertCactusMesh(heightScale = 1.0): THREE.Group {
  const cactus = new THREE.Group();

  const cactusMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.85,
  });
  const flowerMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });

  const h = 4.2 * heightScale;
  const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, h, 12), cactusMat);
  mainTrunk.position.y = h / 2;
  // mainTrunk.castShadow = false;
  cactus.add(mainTrunk);

  // Left Arm (lower)
  const lArmH = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 8), cactusMat);
  lArmH.rotation.z = Math.PI / 2;
  lArmH.position.set(-0.7, h * 0.45, 0);
  cactus.add(lArmH);

  const lArmV = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8), cactusMat);
  lArmV.position.set(-1.15, h * 0.45 + 0.6, 0);
  cactus.add(lArmV);

  // Right Arm (higher)
  const rArmH = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8), cactusMat);
  rArmH.rotation.z = Math.PI / 2;
  rArmH.position.set(0.75, h * 0.62, 0);
  cactus.add(rArmH);

  const rArmV = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 8), cactusMat);
  rArmV.position.set(1.25, h * 0.62 + 0.65, 0);
  cactus.add(rArmV);

  // Blooming pink desert flower on top
  const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), flowerMat);
  flower.position.set(0, h + 0.15, 0);
  cactus.add(flower);

  return cactus;
}

export function createSandstonePillarMesh(scale = 1.0): THREE.Group {
  const pillar = new THREE.Group();

  const colors = [0xd97706, 0xb45309, 0xfde047, 0x9a3412];
  let curY = 0;
  const layers = 5;

  for (let l = 0; l < layers; l++) {
    const mat = new THREE.MeshStandardMaterial({
      color: colors[l % colors.length],
      roughness: 0.95,
      flatShading: true,
    });
    const segH = (1.4 + Math.sin(l * 1.5) * 0.4) * scale;
    const rT = (1.2 + Math.cos(l * 1.2) * 0.5) * scale;
    const rB = (1.4 + Math.sin(l * 1.8) * 0.4) * scale;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, segH, 10), mat);
    seg.position.y = curY + segH / 2;
    seg.castShadow = true;
    seg.receiveShadow = true;
    pillar.add(seg);
    curY += segH;
  }

  // Weathered Hoodoo Cap
  const capMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * scale, 1.0 * scale, 0.9 * scale, 10), capMat);
  cap.position.y = curY + 0.45 * scale;
  cap.castShadow = true;
  pillar.add(cap);

  return pillar;
}

export function createSandDuneMoundMesh(radiusX = 14, radiusZ = 20, height = 3.5): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(radiusX, height, radiusZ);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    roughness: 0.96,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export function createBambooClusterMesh(count = 7): THREE.Group {
  const group = new THREE.Group();
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.6 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.7 });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
    const r = 0.5 + (i % 3) * 0.4;
    const h = 4.8 + (i % 4) * 0.8;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, h, 8), stalkMat);
    stalk.position.set(Math.cos(angle) * r, h / 2, Math.sin(angle) * r);
    stalk.castShadow = true;
    group.add(stalk);
    for (let ly = h * 0.55; ly <= h; ly += 0.9) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.65, 4), leafMat);
      leaf.position.set(stalk.position.x + 0.15, ly, stalk.position.z - 0.1);
      leaf.rotation.z = 0.4;
      group.add(leaf);
    }
  }
  return group;
}

// ==========================================
// 17. TAJ MAHAL DESERT PALACE & ENTERABLE THRONE ROOM
// ==========================================

/**
 * Creates the Grand Taj Mahal White Marble & Gold Desert Palace
 * Featuring 4 tall corner minarets, central onion dome, secondary chhatris, and grand Pishtaq arched portals.
 */
export function createTajMahalPalaceMesh(): THREE.Group {
  const palace = new THREE.Group();

  const whiteMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    metalness: 0.08,
  });
  const reliefMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.32,
    metalness: 0.12,
  });
  const royalGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.18,
    metalness: 0.9,
  });
  const darkGoldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.25,
    metalness: 0.85,
  });
  const lapisMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.3,
    metalness: 0.4,
  });

  // 1. Monumental White Marble Plinth Podium (36m x 36m x 2.2m)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(36, 2.2, 36), whiteMarbleMat);
  plinth.position.y = 1.1;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  palace.add(plinth);

  // Plinth Golden Cornice Trim
  const plinthTrim = new THREE.Mesh(new THREE.BoxGeometry(36.8, 0.4, 36.8), royalGoldMat);
  plinthTrim.position.y = 2.1;
  palace.add(plinthTrim);

  // Grand Front Entrance Terrace & Low Approaching Steps (y = 0.2 flat landing at terrain level)
  // Completely eliminates floating concrete blocks, providing a clean flat terrace (y = terrainHeight + 0.2)
  const entranceTerrace = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 14), whiteMarbleMat);
  entranceTerrace.position.set(19, 0.1, 0);
  entranceTerrace.receiveShadow = true;
  palace.add(entranceTerrace);

  const terraceGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(10.3, 0.22, 14.3), royalGoldMat);
  terraceGoldTrim.position.set(19, 0.09, 0);
  palace.add(terraceGoldTrim);

  // Gentle low step leading smoothly from Desert Avenue up to the terrace floor (y = 0.2)
  const stepLow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 14.1), reliefMarbleMat);
  stepLow.position.set(24.6, 0.05, 0);
  stepLow.receiveShadow = true;
  palace.add(stepLow);

  // Grand Tiered Marble Portal Stairway (Ascending gently from terrace y=0.2 to the Pishtaq Portal Niche y=2.2)
  const numSteps = 5;
  for (let s = 0; s < numSteps; s++) {
    const stepT = (s + 1) / (numSteps + 1);
    const stepX = 18.0 - s * 1.0;
    const stepH = 0.2 + stepT * 2.0;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(1.05, stepH, 10.0), reliefMarbleMat);
    stepMesh.position.set(stepX, stepH / 2, 0);
    stepMesh.receiveShadow = true;
    palace.add(stepMesh);

    // Golden step edge nosing
    const stepNosing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 10.1), royalGoldMat);
    stepNosing.position.set(stepX + 0.5, stepH, 0);
    palace.add(stepNosing);
  }

  // 2. Central Mausoleum Citadel (24m x 24m x 15m) with beveled corners
  const citadel = new THREE.Mesh(new THREE.BoxGeometry(24, 15, 24), whiteMarbleMat);
  citadel.position.set(0, 2.2 + 7.5, 0);
  citadel.castShadow = true;
  citadel.receiveShadow = true;
  palace.add(citadel);

  // Pishtaq Grand Vaulted Arches on 4 Facades
  const archConfigs = [
    { rotY: 0, x: 0, z: 12.1 },            // South
    { rotY: Math.PI, x: 0, z: -12.1 },       // North
    { rotY: Math.PI * 0.5, x: 12.1, z: 0 },  // East (Front Entrance Portal)
    { rotY: Math.PI * 1.5, x: -12.1, z: 0 }, // West (Rear)
  ];

  archConfigs.forEach((ac, idx) => {
    const archGroup = new THREE.Group();
    archGroup.position.set(ac.x, 2.2 + 7.5, ac.z);
    archGroup.rotation.y = ac.rotY;

    // Outer Pishtaq Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(11, 13, 0.8), reliefMarbleMat);
    archGroup.add(frame);

    // Golden Filigree Border
    const goldBorder = new THREE.Mesh(new THREE.BoxGeometry(11.4, 13.4, 0.2), royalGoldMat);
    goldBorder.position.z = 0.35;
    archGroup.add(goldBorder);

    // Lapis Lazuli Inlay Border
    const lapisBorder = new THREE.Mesh(new THREE.BoxGeometry(10.2, 12.2, 0.25), lapisMat);
    lapisBorder.position.z = 0.38;
    archGroup.add(lapisBorder);

    // Arched Portal Niche
    const portalHole = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 })
    );
    portalHole.rotation.x = Math.PI / 2;
    portalHole.position.set(0, 1.5, 0);
    archGroup.add(portalHole);

    // If East Portal (idx === 2), add Ornate Golden Brass Palace Doors
    if (idx === 2) {
      const doorMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.85 });
      const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6.2, 2.4), doorMat);
      leftDoor.position.set(0.4, -1.8, -1.25);
      const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6.2, 2.4), doorMat);
      rightDoor.position.set(0.4, -1.8, 1.25);
      archGroup.add(leftDoor, rightDoor);
    }

    palace.add(archGroup);
  });

  // 3. Central Monumental Golden Onion Dome
  // High Cylindrical Drum
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.5, 3.8, 24), whiteMarbleMat);
  drum.position.set(0, 2.2 + 15 + 1.9, 0);
  drum.castShadow = true;
  palace.add(drum);

  // Drum Golden Cornice
  const drumCornice = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 7.2, 0.6, 24), royalGoldMat);
  drumCornice.position.set(0, 2.2 + 15 + 3.8, 0);
  palace.add(drumCornice);

  // Main Golden Onion Bulb
  const domeBulbGeo = new THREE.SphereGeometry(7.2, 32, 24);
  domeBulbGeo.scale(1.0, 1.48, 1.0);
  const mainDome = new THREE.Mesh(domeBulbGeo, royalGoldMat);
  mainDome.position.set(0, 2.2 + 15 + 3.8 + 5.2, 0);
  mainDome.castShadow = true;
  palace.add(mainDome);

  // Golden Spire & Crescent Finial
  const finialSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.45, 6.5, 12), royalGoldMat);
  finialSpire.position.set(0, 2.2 + 15 + 3.8 + 12.8, 0);
  palace.add(finialSpire);

  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.14, 10, 24, Math.PI * 1.6), royalGoldMat);
  crescent.position.set(0, 2.2 + 15 + 3.8 + 16.2, 0);
  palace.add(crescent);

  // 4. Four Secondary Chhatris (Roof Corner Cupolas with Golden Domes)
  const chhatriOffsets = [
    { x: -8.5, z: -8.5 },
    { x: 8.5, z: -8.5 },
    { x: -8.5, z: 8.5 },
    { x: 8.5, z: 8.5 },
  ];
  chhatriOffsets.forEach((co) => {
    const chGroup = new THREE.Group();
    chGroup.position.set(co.x, 2.2 + 15, co.z);

    // 4 Marble Pillars
    for (const px of [-1.1, 1.1]) {
      for (const pz of [-1.1, 1.1]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 3.2, 8), whiteMarbleMat);
        pillar.position.set(px, 1.6, pz);
        chGroup.add(pillar);
      }
    }

    // Golden Onion Domelet
    const domeletGeo = new THREE.SphereGeometry(1.8, 16, 14);
    domeletGeo.scale(1.0, 1.4, 1.0);
    const domelet = new THREE.Mesh(domeletGeo, royalGoldMat);
    domelet.position.y = 3.2 + 1.2;
    chGroup.add(domelet);

    // Mini finial
    const miniSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.6, 6), darkGoldTrimMat);
    miniSpire.position.y = 3.2 + 2.8;
    chGroup.add(miniSpire);

    palace.add(chGroup);
  });

  // 5. Four Monumental Free-Standing Corner Minarets (28m tall each)
  const minaretOffsets = [
    { x: -16.5, z: -16.5 },
    { x: 16.5, z: -16.5 },
    { x: -16.5, z: 16.5 },
    { x: 16.5, z: 16.5 },
  ];
  minaretOffsets.forEach((mo) => {
    const minaret = new THREE.Group();
    minaret.position.set(mo.x, 2.2, mo.z);

    // Octagonal Base Plinth
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 4.0, 8), reliefMarbleMat);
    base.position.y = 2.0;
    base.castShadow = true;
    minaret.add(base);

    // Tapered Fluted Shaft (3 tiers with balconies)
    const tierHeights = [8.5, 7.5, 6.5];
    let curY = 4.0;
    let rBot = 2.1;

    tierHeights.forEach((th, tIdx) => {
      const rTop = rBot * 0.9;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, th, 16), whiteMarbleMat);
      shaft.position.y = curY + th / 2;
      shaft.castShadow = true;
      minaret.add(shaft);

      curY += th;

      // Balcony with golden balustrade
      const balcony = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 1.45, rTop * 1.1, 0.9, 16), reliefMarbleMat);
      balcony.position.y = curY + 0.45;
      minaret.add(balcony);

      const balustrade = new THREE.Mesh(new THREE.TorusGeometry(rTop * 1.45, 0.12, 6, 16), royalGoldMat);
      balustrade.rotation.x = Math.PI / 2;
      balustrade.position.y = curY + 0.9;
      minaret.add(balustrade);

      curY += 0.9;
      rBot = rTop;
    });

    // Minaret Cupola Chhatri & Golden Onion Dome
    const cupolaPillars = 6;
    for (let p = 0; p < cupolaPillars; p++) {
      const a = (p / cupolaPillars) * Math.PI * 2;
      const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 6), whiteMarbleMat);
      cp.position.set(Math.cos(a) * 1.2, curY + 1.1, Math.sin(a) * 1.2);
      minaret.add(cp);
    }

    const minDomeGeo = new THREE.SphereGeometry(1.6, 16, 12);
    minDomeGeo.scale(1.0, 1.45, 1.0);
    const minDome = new THREE.Mesh(minDomeGeo, royalGoldMat);
    minDome.position.y = curY + 2.2 + 1.1;
    minDome.castShadow = true;
    minaret.add(minDome);

    const minFinial = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 2.2, 8), royalGoldMat);
    minFinial.position.y = curY + 2.2 + 2.8;
    minaret.add(minFinial);

    palace.add(minaret);
  });

  return palace;
}

/**
 * Creates the Taj Mahal Reflecting Pool with crystal-blue water, marble coping, and fountains
 */
export function createReflectingPoolMesh(length = 32, width = 9): THREE.Group {
  const pool = new THREE.Group();

  const copingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
  const basinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.3 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.2,
    transparent: true,
    opacity: 0.88,
  });
  const goldNozzleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.85 });

  // Marble Coping Border
  const copingGeo = new THREE.BoxGeometry(length + 1.8, 0.45, width + 1.8);
  const coping = new THREE.Mesh(copingGeo, copingMat);
  coping.position.y = 0.22;
  coping.receiveShadow = true;
  pool.add(coping);

  // Sunken Basin Void
  const basin = new THREE.Mesh(new THREE.BoxGeometry(length, 0.4, width), basinMat);
  basin.position.y = 0.2;
  pool.add(basin);

  // Crystal Clear Water Plane
  const water = new THREE.Mesh(new THREE.BoxGeometry(length * 0.98, 0.12, width * 0.98), waterMat);
  water.position.y = 0.32;
  pool.add(water);

  // 5 Symmetrical Fountain Jets along the central axis
  const numFountains = 5;
  for (let i = 0; i < numFountains; i++) {
    const fx = -length / 2 + (i + 0.5) * (length / numFountains);
    // Brass nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.65, 8), goldNozzleMat);
    nozzle.position.set(fx, 0.45, 0);
    pool.add(nozzle);

    // Sculpted Water Spray Cone
    const sprayGeo = new THREE.ConeGeometry(0.65, 1.8, 8);
    const sprayMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
    });
    const spray = new THREE.Mesh(sprayGeo, sprayMat);
    spray.position.set(fx, 1.45, 0);
    pool.add(spray);
  }

  return pool;
}

/**
 * Creates the Enterable Royal Throne Room Interior (Throne Room of Sultan Malik al-Solaria)
 * Enclosed luxury hall with checkerboard marble floor, crimson carpet, 8 golden colonnade pillars,
 * Sultan's Peacock Throne on raised dais, royal braziers, and exit archway.
 */
export function createThroneRoomInteriorMesh(): THREE.Group {
  const room = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.15 });
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
  const carpetGoldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.85 });
  const pillarGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.85 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }); // midnight blue vaulted ceiling

  // Room Dimensions: 32m Long (along X), 20m Wide (along Z), 9m High
  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(32, 0.4, 20), floorMat);
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  room.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(32, 0.4, 20), ceilingMat);
  ceiling.position.y = 9.0;
  room.add(ceiling);

  // Walls (North, South, West / Throne End, East / Entrance End)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(32, 9, 0.5), wallMat);
  northWall.position.set(0, 4.5, -10);
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(32, 9, 0.5), wallMat);
  southWall.position.set(0, 4.5, 10);
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 20), wallMat); // Behind Throne
  westWall.position.set(-16, 4.5, 0);
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 20), wallMat); // Entrance Door Wall
  eastWall.position.set(16, 4.5, 0);
  room.add(northWall, southWall, westWall, eastWall);

  // Grand Royal Crimson Carpet with Gold Border (runs down center aisle from entrance to dais)
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(26, 0.05, 5.0), carpetMat);
  carpet.position.set(1.5, 0.03, 0);
  carpet.receiveShadow = true;
  room.add(carpet);

  for (const bz of [-2.6, 2.6]) {
    const border = new THREE.Mesh(new THREE.BoxGeometry(26, 0.06, 0.25), carpetGoldTrimMat);
    border.position.set(1.5, 0.04, bz);
    room.add(border);
  }

  // 8 Golden Colonnade Pillars flanking the red carpet
  const pillarOffsetsX = [-8, -3, 2, 7];
  pillarOffsetsX.forEach((px) => {
    for (const pz of [-4.2, 4.2]) {
      const colGroup = new THREE.Group();
      colGroup.position.set(px, 0, pz);

      // Base
      const pBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.4), pillarGoldMat);
      pBase.position.y = 0.4;
      colGroup.add(pBase);

      // Fluted Shaft
      const pShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 7.4, 16), pillarGoldMat);
      pShaft.position.y = 0.8 + 3.7;
      pShaft.castShadow = true;
      colGroup.add(pShaft);

      // Ornate Lotus Capital
      const pCap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), pillarGoldMat);
      pCap.position.y = 0.8 + 7.4 + 0.4;
      colGroup.add(pCap);

      room.add(colGroup);
    }
  });

  // Raised 3-Tier Royal Dais at West End
  const dais1 = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 11), floorMat);
  dais1.position.set(-11.5, 0.2, 0);
  const dais2 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.4, 9), floorMat);
  dais2.position.set(-12, 0.6, 0);
  const dais3 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 7), carpetMat);
  dais3.position.set(-12.5, 1.0, 0);
  room.add(dais1, dais2, dais3);

  // The Golden Peacock Throne of Solaria (center of dais3 at X: -13.5, y: 1.2, Z: 0)
  const throneGroup = new THREE.Group();
  throneGroup.position.set(-13.8, 1.2, 0);
  throneGroup.rotation.y = Math.PI * 0.5; // Facing East down the carpet

  // Throne Base & Cushion
  const throneBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 2.2), pillarGoldMat);
  throneBase.position.y = 0.4;
  const throneCushion = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 1.8), carpetMat);
  throneCushion.position.set(0, 0.9, 0);
  throneGroup.add(throneBase, throneCushion);

  // High Ornate Peacock Fan Backrest
  const backrestGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.4, 16, 1, false, 0, Math.PI);
  const backrest = new THREE.Mesh(backrestGeo, pillarGoldMat);
  backrest.rotation.z = Math.PI / 2;
  backrest.position.set(0, 2.6, -0.9);
  throneGroup.add(backrest);

  // Ruby Gemstone Inlays
  const rubyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.1, emissive: 0x991b1b, emissiveIntensity: 0.8 });
  const rubyCenter = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), rubyMat);
  rubyCenter.position.set(0, 2.8, -0.75);
  throneGroup.add(rubyCenter);

  // Armrests with Golden Lions
  for (const ax of [-1.2, 1.2]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 1.8), pillarGoldMat);
    arm.position.set(ax, 1.1, 0);
    throneGroup.add(arm);
  }
  room.add(throneGroup);

  // 6 Royal Flaming Braziers with Warm Ambient Torches
  const brazierPositions = [
    { x: -9, z: -5.5 },
    { x: -9, z: 5.5 },
    { x: -1, z: -6.5 },
    { x: -1, z: 6.5 },
    { x: 8, z: -6.5 },
    { x: 8, z: 6.5 },
  ];
  brazierPositions.forEach((bp) => {
    const bStand = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.6, 8), pillarGoldMat);
    bStand.position.set(bp.x, 0.8, bp.z);
    room.add(bStand);

    const bFlame = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    bFlame.position.set(bp.x, 1.75, bp.z);
    room.add(bFlame);

    const light = new THREE.PointLight(0xffaa00, 1.8, 14);
    light.position.set(bp.x, 2.2, bp.z);
    room.add(light);
  });

  // Entrance Archway & Exit Door at East Wall (X: 15.6)
  const exitArch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.5, 4.5), pillarGoldMat);
  exitArch.position.set(15.6, 3.25, 0);
  room.add(exitArch);

  const exitPortalMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const exitPortal = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.5), exitPortalMat);
  exitPortal.rotation.y = -Math.PI / 2;
  exitPortal.position.set(15.5, 2.8, 0);
  room.add(exitPortal);

  return room;
}

/**
 * Creates Ornate Desert Oil Lantern on stone pedestal
 */
export function createDesertOilLanternMesh(): THREE.Group {
  const lantern = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.0, 8), stoneMat);
  ped.position.y = 1.0;
  // ped.castShadow = false;
  lantern.add(ped);

  const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.85, 6), brassMat);
  lampHousing.position.y = 2.4;
  lantern.add(lampHousing);

  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd600 }));
  flame.position.y = 2.4;
  lantern.add(flame);

  const pl = new THREE.PointLight(0xffaa00, 1.4, 9);
  pl.position.y = 2.5;
  lantern.add(pl);

  return lantern;
}

// ==========================================
// 18. JARRUS THE ANCIENT SANDWORM BOSS MESH
// ==========================================

/**
 * Creates Jarrus, Sang Cacing Purba Solaria (Colossal Devourer Sandworm Boss with Circular Fanged Maw)
 * - Diameter tubuh: 3.8 unit (radius 1.9 unit).
 * - Panjang tubuh saat keluar penuh: 28-35 unit (10 segmen beruas saling terhubung).
 * - Sisik karapas gurun cokelat pasir keras (#8b6f47) dengan duri runcing di punggung tiap segmen.
 * - Mulut melingkar dengan 3 lapis gigi taring segitiga tajam (#f3f4f6) dan bagian dalam merah gelap berpendar lava (#991b1b).
 */
export function createSandwormBossMesh(): {
  group: THREE.Group;
  parts: Record<string, any>;
} {
  const group = new THREE.Group();
  group.name = 'Boss_Jarrus_Sandworm';
  const parts: Record<string, any> = {};

  // Karapas gurun cokelat pasir keras (#8b6f47)
  const chitinPrimaryMat = new THREE.MeshStandardMaterial({
    color: 0x8b6f47, // Cokelat pasir keras (#8b6f47)
    roughness: 0.88,
    metalness: 0.12,
    flatShading: true,
  });

  const chitinSecondaryMat = new THREE.MeshStandardMaterial({
    color: 0x735738, // Cokelat tua pelat pelindung
    roughness: 0.92,
    metalness: 0.10,
    flatShading: true,
  });

  // Duri runcing punggung karapas
  const dorsalSpikeMat = new THREE.MeshStandardMaterial({
    color: 0x3d2714,
    roughness: 0.85,
    metalness: 0.15,
    flatShading: true,
  });

  // Gigi taring segitiga tajam (#f3f4f6)
  const toothMat = new THREE.MeshStandardMaterial({
    color: 0xf3f4f6, // Gigi taring tajam (#f3f4f6)
    roughness: 0.35,
    metalness: 0.15,
  });

  // Bagian dalam mulut merah gelap berpendar lava (#991b1b)
  const lavaThroatMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Merah gelap berpendar lava (#991b1b)
    emissive: 0x991b1b,
    emissiveIntensity: 1.25,
    roughness: 0.45,
  });

  // Mata majemuk merah membara
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.6,
  });

  // Struktur Tubuh: 10 segmen silinder beruas (diameter 3.8 unit, panjang total ~32 unit)
  const segments: THREE.Group[] = [];
  const numSegments = 10;
  let currentParent: THREE.Group = group;

  for (let i = 0; i < numSegments; i++) {
    const segGroup = new THREE.Group();
    segGroup.name = `Sandworm_Segment_${i}`;
    const t = i / numSegments;
    // Radius mengecil alami dari 1.9 unit di kepala hingga 1.1 unit di ekor
    const radius = 1.9 * (1.05 - t * 0.48);
    const length = 3.2;

    // Tabung ruas chitin silinder
    const segGeo = new THREE.CylinderGeometry(radius * 0.94, radius, length, 14);
    const segMesh = new THREE.Mesh(segGeo, i % 2 === 0 ? chitinPrimaryMat : chitinSecondaryMat);
    segMesh.rotation.x = Math.PI / 2;
    segMesh.castShadow = true;
    segMesh.receiveShadow = true;
    segGroup.add(segMesh);

    // Pelat karapas punggung bertingkat
    const carapacePlate = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.55, length * 0.75, radius * 0.45),
      chitinSecondaryMat
    );
    carapacePlate.position.y = radius * 0.85;
    carapacePlate.castShadow = true;
    segGroup.add(carapacePlate);

    // Duri runcing di punggung tiap segmen (Dorsal spines)
    for (let sp = -1; sp <= 1; sp += 2) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.45, 5), dorsalSpikeMat);
      spike.position.set(sp * (radius * 0.55), radius * 1.15, 0);
      spike.rotation.z = -sp * 0.35;
      spike.rotation.x = -0.15;
      spike.castShadow = true;
      segGroup.add(spike);
    }

    // Duri lateral samping (Side spikes)
    for (let s = -1; s <= 1; s += 2) {
      const sideSpike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 5), dorsalSpikeMat);
      sideSpike.position.set(s * (radius * 1.05), radius * 0.25, 0);
      sideSpike.rotation.z = -s * 0.85;
      segGroup.add(sideSpike);
    }

    // Kurva lekukan alami tubuh cacing keluar dari tanah pasir
    const pitchAngle = i === 0 ? 0.38 : (i < 4 ? -0.14 : -0.20);
    segGroup.position.set(0, i === 0 ? 4.5 : 0, i === 0 ? 0 : -length * 0.92);
    segGroup.rotation.x = pitchAngle;

    currentParent.add(segGroup);
    segments.push(segGroup);
    parts[`segment_${i}`] = segGroup;
    currentParent = segGroup;
  }

  // Kepala & Mulut Melingkar Mengerikan (Diameter 3.8 unit)
  const headGroup = new THREE.Group();
  headGroup.name = 'Sandworm_Head';
  headGroup.position.set(0, 0, 1.6);

  // Bibir luar lingkaran karapas
  const rimGeo = new THREE.TorusGeometry(1.9, 0.45, 12, 24);
  const rimMesh = new THREE.Mesh(rimGeo, chitinSecondaryMat);
  headGroup.add(rimMesh);

  // Bagian dalam mulut merah gelap berpendar lava (#991b1b)
  const throatGeo = new THREE.CircleGeometry(1.75, 20);
  const throatMesh = new THREE.Mesh(throatGeo, lavaThroatMat);
  throatMesh.position.z = -0.4;
  headGroup.add(throatMesh);

  // 3 Lapis Gigi Taring Segitiga Tajam Berputar Konsentris (#f3f4f6)
  const toothRings = [
    { count: 16, rad: 1.62, size: 0.48, len: 0.85 }, // Lapis 1 Luar
    { count: 12, rad: 1.18, size: 0.38, len: 0.72 }, // Lapis 2 Tengah
    { count: 8,  rad: 0.72, size: 0.28, len: 0.58 }, // Lapis 3 Dalam
  ];

  const teethGroup = new THREE.Group();
  teethGroup.name = 'Sandworm_Rotating_Teeth';
  toothRings.forEach((ring, rIdx) => {
    for (let c = 0; c < ring.count; c++) {
      const angle = (c / ring.count) * Math.PI * 2 + (rIdx * 0.25);
      const toothGeo = new THREE.ConeGeometry(ring.size * 0.45, ring.len, 5);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      const tx = Math.cos(angle) * ring.rad;
      const ty = Math.sin(angle) * ring.rad;
      tooth.position.set(tx, ty, -0.2 + rIdx * 0.12);
      tooth.rotation.z = angle - Math.PI / 2;
      tooth.rotation.x = -0.42; // Miring tajam menusuk ke dalam tenggorokan
      teethGroup.add(tooth);
    }
  });
  headGroup.add(teethGroup);

  // Capit Mandibula Samping Raksasa
  const leftMandible = new THREE.Mesh(new THREE.ConeGeometry(0.48, 2.5, 6), dorsalSpikeMat);
  leftMandible.position.set(-2.2, 0, 0.4);
  leftMandible.rotation.z = Math.PI / 3;
  leftMandible.rotation.y = 0.4;
  leftMandible.castShadow = true;

  const rightMandible = new THREE.Mesh(new THREE.ConeGeometry(0.48, 2.5, 6), dorsalSpikeMat);
  rightMandible.position.set(2.2, 0, 0.4);
  rightMandible.rotation.z = -Math.PI / 3;
  rightMandible.rotation.y = -0.4;
  rightMandible.castShadow = true;
  headGroup.add(leftMandible, rightMandible);

  // Gugusan Mata Majemuk Merah Membara
  for (let eyeSide = -1; eyeSide <= 1; eyeSide += 2) {
    for (let eIdx = 0; eIdx < 4; eIdx++) {
      const eyeGeo = new THREE.SphereGeometry(0.18, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(eyeSide * (1.45 + eIdx * 0.22), 0.95 + (eIdx % 2) * 0.3, -0.15 - eIdx * 0.35);
      headGroup.add(eye);
    }
  }

  // Pasang kepala ke segmen paling depan (segment 0)
  segments[0].add(headGroup);

  parts.head = headGroup;
  parts.teeth = teethGroup;
  parts.throat = throatMesh;
  parts.mandibles = [leftMandible, rightMandible];
  parts.segments = segments;

  return { group, parts };
}

/**
 * Lingkaran formasi kerangka tulang rusuk fosil monster purba raksasa di bibir kawah
 */
export function createAncientMonsterRibMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Ancient_Monster_Rib';
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xeadbc8, // Tulang fosil purba memutih
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });

  // Tulang rusuk melengkung raksasa (radius 4.2m) mencuat keluar dari tanah pasir
  const ribGeo = new THREE.TorusGeometry(4.2, 0.38, 6, 16, Math.PI * 0.65);
  const rib = new THREE.Mesh(ribGeo, boneMat);
  rib.rotation.z = Math.PI * 0.2;
  rib.rotation.y = Math.PI * 0.5;
  rib.position.y = 1.0;
  rib.castShadow = true;
  rib.receiveShadow = true;
  group.add(rib);

  return group;
}

/**
 * Obelisk batu pasir kuno retak yang setengah tertimbun pasir di tepi luar arena
 */
export function createCrackedSandstoneObeliskMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Cracked_Sandstone_Obelisk';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xc49a6c, // Batu pasir kuno Solaria
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const crackMat = new THREE.MeshStandardMaterial({
    color: 0x5c4028,
    roughness: 0.95,
  });

  // Batang pilar obelisk setengah tertimbun bukit pasir
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 7.5, 4), stoneMat);
  shaft.position.y = 3.2;
  shaft.rotation.y = Math.PI / 4;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  // Ujung piramida (Pyramidion) di puncak
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.8, 4), stoneMat);
  tip.position.y = 7.7;
  tip.rotation.y = Math.PI / 4;
  tip.castShadow = true;
  group.add(tip);

  // Alur retakan kuno
  const crackRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 4, 8), crackMat);
  crackRing.position.y = 4.2;
  crackRing.rotation.x = Math.PI / 2 + 0.15;
  group.add(crackRing);

  // Kemiringan alami obelisk kuno terhempas badai pasir gurun
  group.rotation.z = 0.12;
  group.rotation.x = -0.08;

  return group;
}

/**
 * Efek partikel pusaran pasir halus (sand vortex / dust whirl) yang berputar melingkar di tengah kawah
 */
export function createSandVortexSwirlMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Sand_Vortex_Swirl';

  const vortexMat = new THREE.MeshBasicMaterial({
    color: 0xd97706,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x78350f,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const r1 = new THREE.Mesh(new THREE.RingGeometry(1.5, 8.0, 32), innerMat);
  r1.rotation.x = -Math.PI / 2;
  r1.position.y = 0.04;
  group.add(r1);

  const r2 = new THREE.Mesh(new THREE.RingGeometry(8.0, 18.0, 32), vortexMat);
  r2.rotation.x = -Math.PI / 2;
  r2.position.y = 0.08;
  group.add(r2);

  const r3 = new THREE.Mesh(new THREE.RingGeometry(18.0, 32.0, 32), vortexMat);
  r3.rotation.x = -Math.PI / 2;
  r3.position.y = 0.12;
  group.add(r3);

  return group;
}

export interface InstancedItemTransform {
  x: number;
  y: number;
  z: number;
  scale?: number;
  rotationY?: number;
}

/**
 * Creates an InstancedMesh group for Desert Cacti to dramatically reduce draw calls.
 */
export function createInstancedDesertCacti(items: InstancedItemTransform[]): THREE.InstancedMesh {
  const cactusMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.85,
  });

  const mainTrunk = new THREE.CylinderGeometry(0.32, 0.36, 4.2, 8);
  mainTrunk.translate(0, 2.1, 0);

  const lArmH = new THREE.CylinderGeometry(0.22, 0.22, 1.1, 6);
  lArmH.rotateZ(Math.PI / 2);
  lArmH.translate(-0.7, 1.9, 0);

  const lArmV = new THREE.CylinderGeometry(0.22, 0.22, 1.4, 6);
  lArmV.translate(-1.15, 2.5, 0);

  const rArmH = new THREE.CylinderGeometry(0.22, 0.22, 1.2, 6);
  rArmH.rotateZ(Math.PI / 2);
  rArmH.translate(0.75, 2.6, 0);

  const rArmV = new THREE.CylinderGeometry(0.22, 0.22, 1.5, 6);
  rArmV.translate(1.25, 3.25, 0);

  const mergedGeo = mergeGeometries([mainTrunk, lArmH, lArmV, rArmH, rArmV]);

  const instanced = new THREE.InstancedMesh(mergedGeo, cactusMat, items.length);
  instanced.castShadow = false;
  instanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  items.forEach((item, i) => {
    dummy.position.set(item.x, item.y, item.z);
    dummy.rotation.set(0, item.rotationY ?? 0, 0);
    const s = item.scale ?? 1.0;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  });

  instanced.instanceMatrix.needsUpdate = true;
  return instanced;
}

/**
 * Creates InstancedMesh group for Desert Palms (Trunk + Canopy) to dramatically reduce draw calls.
 */
export function createInstancedDesertPalms(items: InstancedItemTransform[]): THREE.Group {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63, flatShading: true });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true });

  // 1. Merged trunk geometry
  const trunk1 = new THREE.CylinderGeometry(0.28, 0.42, 3.6, 6);
  trunk1.rotateZ(0.08);
  trunk1.translate(0, 1.4, 0);

  const root = new THREE.CylinderGeometry(0.42, 0.65, 0.8, 6);
  root.translate(0, -0.3, 0);

  const trunk2 = new THREE.CylinderGeometry(0.22, 0.28, 3.0, 6);
  trunk2.rotateZ(0.16);
  trunk2.translate(0.3, 4.4, 0);

  const mergedTrunkGeo = mergeGeometries([trunk1, root, trunk2]);

  // 2. Merged canopy geometry (7 fan fronds)
  const frondGeos: THREE.BufferGeometry[] = [];
  const numFronds = 7;
  for (let i = 0; i < numFronds; i++) {
    const angle = (i / numFronds) * Math.PI * 2;
    const frond = new THREE.BoxGeometry(0.35, 0.06, 2.8);
    frond.rotateX(0.65);
    frond.rotateY(angle);
    frond.translate(0.5, 5.8, 0);
    frondGeos.push(frond);
  }
  const mergedCanopyGeo = mergeGeometries(frondGeos);

  const trunkInstanced = new THREE.InstancedMesh(mergedTrunkGeo, trunkMat, items.length);
  trunkInstanced.castShadow = false;
  trunkInstanced.receiveShadow = true;

  const canopyInstanced = new THREE.InstancedMesh(mergedCanopyGeo, leafMat, items.length);
  canopyInstanced.castShadow = false;
  canopyInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  items.forEach((item, i) => {
    dummy.position.set(item.x, item.y, item.z);
    dummy.rotation.set(0, item.rotationY ?? 0, 0);
    const s = item.scale ?? 1.0;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunkInstanced.setMatrixAt(i, dummy.matrix);
    canopyInstanced.setMatrixAt(i, dummy.matrix);
  });

  trunkInstanced.instanceMatrix.needsUpdate = true;
  canopyInstanced.instanceMatrix.needsUpdate = true;

  group.add(trunkInstanced);
  group.add(canopyInstanced);
  return group;
}

/**
 * Creates InstancedMesh group for Street Lamps (Iron Post/Cap + Glowing Head).
 * High Performance 60 FPS: reduces dozens of separate draw calls down to 2 with zero shadow map overhead.
 */
export function createInstancedStreetLamps(items: InstancedItemTransform[]): THREE.Group {
  const group = new THREE.Group();
  if (items.length === 0) return group;

  const ironMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffecb3 });

  // 1. Post + Cap merged geometry
  const postGeo = new THREE.CylinderGeometry(0.09, 0.12, 3.2, 6);
  postGeo.translate(0, 1.6, 0);

  const capGeo = new THREE.ConeGeometry(0.35, 0.25, 4);
  capGeo.rotateY(Math.PI / 4);
  capGeo.translate(0, 3.55, 0);

  const mergedIronGeo = mergeGeometries([postGeo, capGeo]);

  // 2. Head geometry
  const headGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
  headGeo.translate(0, 3.2, 0);

  const ironInstanced = new THREE.InstancedMesh(mergedIronGeo, ironMat, items.length);
  ironInstanced.castShadow = false;
  ironInstanced.receiveShadow = true;

  const glowInstanced = new THREE.InstancedMesh(headGeo, glowMat, items.length);
  glowInstanced.castShadow = false;
  glowInstanced.receiveShadow = false;

  const dummy = new THREE.Object3D();
  items.forEach((item, i) => {
    dummy.position.set(item.x, item.y, item.z);
    dummy.rotation.set(0, item.rotationY ?? 0, 0);
    const s = item.scale ?? 1.0;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    ironInstanced.setMatrixAt(i, dummy.matrix);
    glowInstanced.setMatrixAt(i, dummy.matrix);
  });

  ironInstanced.instanceMatrix.needsUpdate = true;
  glowInstanced.instanceMatrix.needsUpdate = true;

  group.add(ironInstanced);
  group.add(glowInstanced);
  return group;
}

/**
 * Creates InstancedMesh group for Curated Village Trees (Trunk + Foliage).
 * High Performance 60 FPS: renders all village trees in just 2 draw calls with zero shadow stuttering.
 */
export function createInstancedVillageTrees(items: InstancedItemTransform[]): THREE.Group {
  const group = new THREE.Group();
  if (items.length === 0) return group;

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x33691e, flatShading: true });

  // 1. Merged trunk + root flare
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.6, 6);
  trunkGeo.translate(0, 0.9, 0);

  const rootGeo = new THREE.CylinderGeometry(0.5, 0.75, 0.8, 6);
  rootGeo.translate(0, -0.3, 0);

  const mergedTrunkGeo = mergeGeometries([trunkGeo, rootGeo]);

  // 2. Merged foliage clusters (3 dodecahedron puffs)
  const clusters = [
    { x: 0, y: 3.2, z: 0, s: 1.5 },
    { x: 0.6, y: 2.6, z: 0.4, s: 1.1 },
    { x: -0.6, y: 2.7, z: -0.3, s: 1.2 },
  ];
  const clusterGeos = clusters.map(c => {
    const g = new THREE.DodecahedronGeometry(c.s, 1);
    g.translate(c.x, c.y, c.z);
    return g;
  });
  const mergedFoliageGeo = mergeGeometries(clusterGeos);

  const trunkInstanced = new THREE.InstancedMesh(mergedTrunkGeo, trunkMat, items.length);
  trunkInstanced.castShadow = false;
  trunkInstanced.receiveShadow = true;

  const foliageInstanced = new THREE.InstancedMesh(mergedFoliageGeo, leafMat, items.length);
  foliageInstanced.castShadow = false;
  foliageInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  items.forEach((item, i) => {
    dummy.position.set(item.x, item.y, item.z);
    dummy.rotation.set(0, item.rotationY ?? 0, 0);
    const s = item.scale ?? 1.0;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunkInstanced.setMatrixAt(i, dummy.matrix);
    foliageInstanced.setMatrixAt(i, dummy.matrix);
  });

  trunkInstanced.instanceMatrix.needsUpdate = true;
  foliageInstanced.instanceMatrix.needsUpdate = true;

  group.add(trunkInstanced);
  group.add(foliageInstanced);
  return group;
}

/**
 * Creates Sandstone Tiered Fortified Battlements & Outer Golden Minarets
 * encircling the Sultan's Palace compound.
 */
export function createDesertPalaceFortressWallMesh(): THREE.Group {
  const group = new THREE.Group();

  const sandStoneMat = new THREE.MeshLambertMaterial({ color: 0xddb892, flatShading: true });
  const sandStoneDark = new THREE.MeshLambertMaterial({ color: 0xb5835a, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.85,
    roughness: 0.2,
    emissive: 0xd97706,
    emissiveIntensity: 0.25,
  });

  // 1. West Curtain Wall (Rear of Palace: X = -436, Z from 326 to 374)
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.0, 48), sandStoneMat);
  westWall.position.set(-436, 3.0, 350);
  westWall.receiveShadow = true;
  group.add(westWall);

  // West Wall Crenellations
  for (let z = 328; z <= 372; z += 4) {
    const cren = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.0), sandStoneDark);
    cren.position.set(-436, 6.6, z);
    group.add(cren);
  }

  // 2. North Curtain Wall (Z = 374, X from -436 to -394, length 42)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(42, 6.0, 2.4), sandStoneMat);
  northWall.position.set(-415, 3.0, 374);
  northWall.receiveShadow = true;
  group.add(northWall);

  for (let x = -434; x <= -396; x += 4) {
    const cren = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.6), sandStoneDark);
    cren.position.set(x, 6.6, 374);
    group.add(cren);
  }

  // 3. South Curtain Wall (Z = 326, X from -436 to -394, length 42)
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(42, 6.0, 2.4), sandStoneMat);
  southWall.position.set(-415, 3.0, 326);
  southWall.receiveShadow = true;
  group.add(southWall);

  for (let x = -434; x <= -396; x += 4) {
    const cren = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.6), sandStoneDark);
    cren.position.set(x, 6.6, 326);
    group.add(cren);
  }

  // 4. Four Outer Golden Minaret Bastions at Wall Corners
  const corners = [
    { x: -436, z: 326 },
    { x: -436, z: 374 },
    { x: -394, z: 326 },
    { x: -394, z: 374 },
  ];

  corners.forEach((c) => {
    // Bastion Plinth
    const bBase = new THREE.Mesh(new THREE.BoxGeometry(5.0, 7.5, 5.0), sandStoneMat);
    bBase.position.set(c.x, 3.75, c.z);
    group.add(bBase);

    // Minaret Shaft
    const mShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 12, 8), sandStoneMat);
    mShaft.position.set(c.x, 13.5, c.z);
    group.add(mShaft);

    // Minaret Balcony
    const mBalc = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.6, 1.2, 8), sandStoneDark);
    mBalc.position.set(c.x, 19.5, c.z);
    group.add(mBalc);

    // Golden Onion Dome Spire
    const mDome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), goldMat);
    mDome.scale.set(1.0, 1.45, 1.0);
    mDome.position.set(c.x, 21.6, c.z);
    group.add(mDome);

    // Crescent Finial Spire
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.2, 4), goldMat);
    finial.position.set(c.x, 24.2, c.z);
    group.add(finial);
  });

  return group;
}

/**
 * Creates a prominent, elevated Desert Avenue Paved Sandstone Road linking the Sultan's Palace and Desert Village.
 * Raised cleanly above desert sand terrain (y = 0.08) with authentic carved sandstone flagstone slabs and solid stone kerbs.
 */
export function createDesertPavedRoadMesh(startX = -396, endX = -250, z = 350, width = 7.5): THREE.Group {
  const group = new THREE.Group();
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const length = maxX - minX;
  const centerX = (minX + maxX) / 2;

  // Rich warm desert flagstone materials
  const mainPavementMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373, // Warm carved desert sandstone
    roughness: 0.78,
    metalness: 0.08,
  });
  const accentPavementMat = new THREE.MeshStandardMaterial({
    color: 0xc48b52, // Slightly deeper sandstone flagstone accent
    roughness: 0.82,
    metalness: 0.06,
  });
  const kerbMat = new THREE.MeshStandardMaterial({
    color: 0x8c5836, // Deep sandstone kerbstones
    roughness: 0.72,
    metalness: 0.12,
  });
  const kerbTrimMat = new THREE.MeshStandardMaterial({
    color: 0x6e3d1b, // Darker border foundation
    roughness: 0.85,
    metalness: 0.05,
  });

  // 1. Raised Main Pavement Roadbed (thickness 0.14m, top at y = 0.12 above terrain)
  const roadBed = new THREE.Mesh(new THREE.BoxGeometry(length, 0.14, width), mainPavementMat);
  roadBed.position.set(centerX, 0.07, z);
  roadBed.receiveShadow = true;
  group.add(roadBed);

  // 2. Transverse Decorative Sandstone Flagstone Paver Ribbons (every 8m along the avenue)
  const numBands = Math.floor(length / 8);
  for (let b = 1; b <= numBands; b++) {
    const bandX = minX + b * 8;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, width * 0.98), accentPavementMat);
    band.position.set(bandX, 0.076, z);
    band.receiveShadow = true;
    group.add(band);
  }

  // 3. Robust Elevated Kerb Borders on North and South sides (height 0.26m, top at y = 0.20)
  const kerbThickness = 0.45;
  const northKerb = new THREE.Mesh(new THREE.BoxGeometry(length, 0.26, kerbThickness), kerbMat);
  northKerb.position.set(centerX, 0.13, z + (width - kerbThickness) / 2);
  northKerb.receiveShadow = true;
  northKerb.castShadow = true;
  group.add(northKerb);

  const southKerb = new THREE.Mesh(new THREE.BoxGeometry(length, 0.26, kerbThickness), kerbMat);
  southKerb.position.set(centerX, 0.13, z - (width - kerbThickness) / 2);
  southKerb.receiveShadow = true;
  southKerb.castShadow = true;
  group.add(southKerb);

  // Decorative Golden Brass Kerb Cap Trim
  const northTrim = new THREE.Mesh(new THREE.BoxGeometry(length, 0.06, kerbThickness * 1.1), kerbTrimMat);
  northTrim.position.set(centerX, 0.26, z + (width - kerbThickness) / 2);
  group.add(northTrim);

  const southTrim = new THREE.Mesh(new THREE.BoxGeometry(length, 0.06, kerbThickness * 1.1), kerbTrimMat);
  southTrim.position.set(centerX, 0.26, z - (width - kerbThickness) / 2);
  group.add(southTrim);

  return group;
}

// ==========================================
// SOLARIA CAMEL RESTING AREA & ENHANCED ASSETS
// ==========================================

/**
 * Creates a Desert Camel Rest Area with timber canopy, straw bedding,
 * water trough, and 2 resting low-poly camels in the shade.
 */
export function createCamelRestAreaMesh(): THREE.Group {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.85 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75 });
  const goldStripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.75 });
  const hayMat = new THREE.MeshLambertMaterial({ color: 0xeab308 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.6 });
  const camelFurMat = new THREE.MeshLambertMaterial({ color: 0xc29b6e });
  const darkCamelMat = new THREE.MeshLambertMaterial({ color: 0xa17c52 });
  const blanketMat1 = new THREE.MeshLambertMaterial({ color: 0x9333ea });
  const blanketMat2 = new THREE.MeshLambertMaterial({ color: 0x059669 });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xdeb887, flatShading: true });

  // 1. Low Sandstone Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 8.5), stoneMat);
  plinth.position.y = 0.15;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Timber Canopy Posts & Beams
  const postCoords = [
    { x: -4.8, z: -3.6 },
    { x: 4.8, z: -3.6 },
    { x: -4.8, z: 3.6 },
    { x: 4.8, z: 3.6 },
  ];
  postCoords.forEach((p) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.8, 6), woodMat);
    post.position.set(p.x, 1.9, p.z);
    post.castShadow = true;
    group.add(post);
  });

  // Longitudinal & Cross Beams
  const beam1 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.25, 0.25), woodMat);
  beam1.position.set(0, 3.8, -3.6);
  const beam2 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.25, 0.25), woodMat);
  beam2.position.set(0, 3.8, 3.6);
  const beamCross1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 7.4), woodMat);
  beamCross1.position.set(-4.8, 3.8, 0);
  const beamCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 7.4), woodMat);
  beamCross2.position.set(4.8, 3.8, 0);
  group.add(beam1, beam2, beamCross1, beamCross2);

  // Striped Canopy Cloth Roof
  for (let s = -4.6; s <= 4.6; s += 0.8) {
    const isGold = Math.round(s * 10) % 2 === 0;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 7.6), isGold ? goldStripeMat : fabricMat);
    stripe.position.set(s, 3.9, 0);
    stripe.castShadow = true;
    group.add(stripe);
  }

  // 3. Wooden Water Trough & Hay Feeding Box
  const troughFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.65, 1.1), woodMat);
  troughFrame.position.set(0, 0.5, -2.8);
  const water = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.1, 0.8), waterMat);
  water.position.set(0, 0.72, -2.8);
  group.add(troughFrame, water);

  // Hay Bales in the Corner
  const hayBale1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.9), hayMat);
  hayBale1.position.set(-3.6, 0.55, -2.6);
  hayBale1.rotation.y = 0.2;
  const hayBale2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.8), hayMat);
  hayBale2.position.set(-3.4, 1.2, -2.6);
  hayBale2.rotation.y = -0.3;
  group.add(hayBale1, hayBale2);

  // 4. Two Resting Low-Poly Camels
  const createSittingCamel = (furMat: THREE.Material, blanketMat: THREE.Material, rotationY: number) => {
    const camel = new THREE.Group();

    // Body (resting on folded legs)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.95), furMat);
    body.position.y = 0.65;
    body.castShadow = true;
    camel.add(body);

    // Folded Legs Base
    const legsLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.3), darkCamelMat);
    legsLeft.position.set(0, 0.2, 0.55);
    const legsRight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.3), darkCamelMat);
    legsRight.position.set(0, 0.2, -0.55);
    camel.add(legsLeft, legsRight);

    // Single Desert Hump
    const hump = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.65, 6), furMat);
    hump.position.set(-0.15, 1.35, 0);
    hump.castShadow = true;
    camel.add(hump);

    // Elegant Neck leaning forward and up
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.1, 6), furMat);
    neck.position.set(0.75, 1.25, 0);
    neck.rotation.z = -0.45;
    camel.add(neck);

    // Head with Muzzle & Ears
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.48), furMat);
    head.position.set(1.15, 1.7, 0);
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), darkCamelMat);
    ear1.position.set(1.05, 1.9, 0.2);
    const ear2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), darkCamelMat);
    ear2.position.set(1.05, 1.9, -0.2);
    camel.add(head, ear1, ear2);

    // Decorative Silk Saddle Blanket & Tassels
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.88, 1.05), blanketMat);
    blanket.position.set(0, 0.72, 0);
    camel.add(blanket);

    camel.rotation.y = rotationY;
    return camel;
  };

  const camel1 = createSittingCamel(camelFurMat, blanketMat1, 0.35);
  camel1.position.set(-1.8, 0.2, 0.8);
  const camel2 = createSittingCamel(darkCamelMat, blanketMat2, -0.3);
  camel2.position.set(2.0, 0.2, 0.6);
  group.add(camel1, camel2);

  return group;
}

// ==========================================
// MAGE TOWER 3D MODELS (PUNCAK HALILINTAR & INTERIOR)
// ==========================================

/**
 * Creates the exterior 3D structure for the Mage Tower at Puncak Halilintar:
 * Octagonal basalt foundation, rune-inscribed tower shaft, stained-glass windows,
 * observatory balcony, gothic spire, and floating lightning core.
 */
export function createMageTowerExteriorMesh(): THREE.Group {
  const tower = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.2,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.7,
    metalness: 0.3,
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x00f0ff,
    emissiveIntensity: 0.85,
    roughness: 0.3,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x271911,
    roughness: 0.8,
  });
  const goldRuneMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
  });

  // 1. Stepped Octagonal Plinth Foundation
  const baseStep1 = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 1.2, 8), stoneMat);
  baseStep1.position.y = 0.6;
  baseStep1.receiveShadow = true;
  const baseStep2 = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 8.2, 1.2, 8), trimMat);
  baseStep2.position.y = 1.8;
  baseStep2.receiveShadow = true;
  tower.add(baseStep1, baseStep2);

  // 2. Tower Lower Shaft (Level 1 Library)
  const shaft1 = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 7.2, 8.5, 8), stoneMat);
  shaft1.position.y = 6.0;
  shaft1.castShadow = true;
  shaft1.receiveShadow = true;
  tower.add(shaft1);

  // Entrance Portal on South side (+Z)
  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.2, 1.2), trimMat);
  portalArch.position.set(0, 3.8, 6.8);
  const portalDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.4), doorMat);
  portalDoor.position.set(0, 3.4, 7.2);
  const runeDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), runeMat);
  runeDoorFrame.position.set(0, 3.6, 7.05);
  tower.add(portalArch, portalDoor, runeDoorFrame);

  // Entrance Steps
  const entranceSteps = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 2.2), stoneMat);
  entranceSteps.position.set(0, 0.3, 8.0);
  tower.add(entranceSteps);

  // Rune Belt 1
  const runeBelt1 = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.45, 8), runeMat);
  runeBelt1.position.y = 10.2;
  tower.add(runeBelt1);

  // 3. Tower Middle Shaft (Level 2 Alchemy Lab)
  const shaft2 = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 6.2, 8.0, 8), stoneMat);
  shaft2.position.y = 14.2;
  shaft2.castShadow = true;
  tower.add(shaft2);

  // Arched Windows on Middle Shaft
  const windowAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  windowAngles.forEach((ang) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.3), windowMat);
    const wx = Math.sin(ang) * 5.7;
    const wz = Math.cos(ang) * 5.7;
    win.position.set(wx, 14.5, wz);
    win.rotation.y = ang;
    tower.add(win);
  });

  // Rune Belt 2
  const runeBelt2 = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.45, 8), goldRuneMat);
  runeBelt2.position.y = 18.2;
  tower.add(runeBelt2);

  // 4. Tower Upper Shaft & Observatory Balcony (Level 3)
  const shaft3 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 7.5, 8), stoneMat);
  shaft3.position.y = 21.8;
  shaft3.castShadow = true;
  tower.add(shaft3);

  // Balcony Ring Platform
  const balconyRing = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 5.0, 1.2, 8), trimMat);
  balconyRing.position.y = 25.8;
  const balustrade = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.9, 8), runeMat);
  balustrade.position.y = 26.8;
  tower.add(balconyRing, balustrade);

  // 4 Corner Pinnacles with Glowing Mini Crystals
  const pinnacleOffsets = [
    { x: -4.4, z: -4.4 },
    { x: 4.4, z: -4.4 },
    { x: -4.4, z: 4.4 },
    { x: 4.4, z: 4.4 },
  ];
  pinnacleOffsets.forEach((po) => {
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.2, 4), trimMat);
    pin.position.set(po.x, 28.2, po.z);
    const pinCrys = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), runeMat);
    pinCrys.position.set(po.x, 30.0, po.z);
    tower.add(pin, pinCrys);
  });

  // 5. Gothic Observatory Spire Roof
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4.2, 8.5, 8), stoneMat);
  spire.position.y = 30.2;
  spire.castShadow = true;
  tower.add(spire);

  // Apex Levitating Giant Lightning Crystal Core
  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), runeMat);
  coreMesh.position.y = 35.4;
  tower.add(coreMesh);

  // Pulsing Arcane Light Beacon
  const coreLight = new THREE.PointLight(0x00f0ff, 2.6, 38);
  coreLight.position.y = 35.4;
  tower.add(coreLight);

  return tower;
}

/**
 * Creates the Multi-floor Interior Cell for Mage Tower:
 * - Level 1 (Y: 0, World Y: -45): Ancient Grimoire Library & Teleport Altar
 * - Level 2 (Y: 7.5, World Y: -37.5): Alchemy Lab & Crackling Lightning Crystals
 * - Level 3 (Y: 15.0, World Y: -30.0): Celestial Observatory with Brass Orrery & Giant Crystal
 */
export function createMageTowerInteriorMesh(): THREE.Group {
  const interior = new THREE.Group();

  const slateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.2 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.8 });
  const runeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });

  // Dedicated Interior Ambient Illumination (Ensures bright, crystal-clear interior visuals)
  const ambientInterior = new THREE.AmbientLight(0xdbeafe, 0.75);
  interior.add(ambientInterior);

  // Outer Circular Wall Enclosing the 3 Floors (Height: 23 units, Radius: 9.8 units)
  const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 9.8, 23, 24, 1, true), wallMat);
  outerWall.position.y = 11.5;
  interior.add(outerWall);

  // South Exit Portal Doorway Archway (Level 1 Exit to Puncak Halilintar)
  const exitDoorArch = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.4, 0.8), stoneMat);
  exitDoorArch.position.set(0, 2.2, 8.4);
  const exitDoorTrim = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.6, 0.2), runeMat);
  exitDoorTrim.position.set(0, 2.0, 8.2);
  const exitDoorGlow = new THREE.PointLight(0x38bdf8, 1.5, 8);
  exitDoorGlow.position.set(0, 2.0, 7.8);
  interior.add(exitDoorArch, exitDoorTrim, exitDoorGlow);

  // ==========================================
  // LEVEL 1: LIBRARY & TELEPORT ALTAR (Y = 0)
  // ==========================================
  const floor1 = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 0.6, 24), slateMat);
  floor1.position.y = -0.3;
  floor1.receiveShadow = true;
  interior.add(floor1);

  // Inlaid Teleportation Ritual Circle on Floor 1
  const ritualRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 3.2, 24), runeMat);
  ritualRing.rotation.x = -Math.PI / 2;
  ritualRing.position.y = 0.02;
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.8, 16), goldMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.03;
  interior.add(ritualRing, innerRing);

  // 4 Corner Runic Pedestals around Teleport Altar
  const altarAngles = [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4];
  altarAngles.forEach((ang) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.2, 0.65), woodMat);
    const px = Math.sin(ang) * 3.6;
    const pz = Math.cos(ang) * 3.6;
    ped.position.set(px, 0.6, pz);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), runeMat);
    orb.position.set(px, 1.35, pz);
    interior.add(ped, orb);
  });

  // Arched Ancient Bookcases along North, East, and West walls
  const bookcaseConfigs = [
    { x: 0, z: -8.2, rot: 0 },
    { x: -3.8, z: -7.4, rot: 0.4 },
    { x: 3.8, z: -7.4, rot: -0.4 },
    { x: -7.8, z: -2.5, rot: Math.PI / 2 },
    { x: -7.8, z: 2.5, rot: Math.PI / 2 },
    { x: 7.8, z: -2.5, rot: -Math.PI / 2 },
    { x: 7.8, z: 2.5, rot: -Math.PI / 2 },
  ];
  bookcaseConfigs.forEach((bc) => {
    const bookcase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5.2, 0.8), woodMat);
    bookcase.position.set(bc.x, 2.6, bc.z);
    bookcase.rotation.y = bc.rot;
    interior.add(bookcase);

    // Shelf books rows (colored books)
    for (let row = 0; row < 4; row++) {
      const bookStrip = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.7, 0.4),
        new THREE.MeshLambertMaterial({ color: row % 2 === 0 ? 0x991b1b : 0x1e3a8a })
      );
      bookStrip.position.set(bc.x, 0.9 + row * 1.1, bc.z);
      bookStrip.rotation.y = bc.rot;
      interior.add(bookStrip);
    }
  });

  // Scholar Reading Lectern with Floating Open Grimoire
  const lectern = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.2, 6), woodMat);
  lectern.position.set(0, 0.6, -4.5);
  const openGrimoire = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.65), runeMat);
  openGrimoire.position.set(0, 1.28, -4.5);
  openGrimoire.rotation.x = 0.35;
  interior.add(lectern, openGrimoire);

  // Level 1 Arcane Ambient Light
  const lightL1 = new THREE.PointLight(0x38bdf8, 2.2, 18);
  lightL1.position.set(0, 4.0, 0);
  interior.add(lightL1);

  // ==========================================
  // LEVEL 2: ALCHEMY LAB & LIGHTNING CRYSTAL TABLE (Y = 7.5)
  // ==========================================
  const floor2 = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 0.5, 24), slateMat);
  floor2.position.y = 7.5 - 0.25;
  interior.add(floor2);

  // Central Alchemy Experimentation Slab
  const expTable = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.1, 3.2), stoneMat);
  expTable.position.set(0, 7.5 + 0.55, 0);
  interior.add(expTable);

  // Crackling Blue Lightning Crystals on Slab
  const crys1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), runeMat);
  crys1.position.set(-1.0, 7.5 + 1.6, 0);
  const crys2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), runeMat);
  crys2.position.set(0.8, 7.5 + 1.5, -0.4);
  const crys3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.48), goldMat);
  crys3.position.set(0.6, 7.5 + 1.45, 0.5);
  interior.add(crys1, crys2, crys3);

  // Alchemical Distillation Racks & Retorts
  const benchNorth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.0, 1.2), woodMat);
  benchNorth.position.set(0, 7.5 + 0.5, -7.5);
  interior.add(benchNorth);

  // Cauldron with Glowing Emerald Brew
  const cauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.9, 12), woodMat);
  cauldron.position.set(-4.5, 7.5 + 0.45, -4.5);
  const brew = new THREE.Mesh(new THREE.CircleGeometry(0.8, 12), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  brew.rotation.x = -Math.PI / 2;
  brew.position.set(-4.5, 7.5 + 0.92, -4.5);
  interior.add(cauldron, brew);

  // Level 2 Light
  const lightL2 = new THREE.PointLight(0x10b981, 2.0, 18);
  lightL2.position.set(0, 7.5 + 4.2, 0);
  interior.add(lightL2);

  // ==========================================
  // LEVEL 3: CELESTIAL OBSERVATORY (Y = 15.0)
  // ==========================================
  const floor3 = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 0.5, 24), slateMat);
  floor3.position.y = 15.0 - 0.25;
  interior.add(floor3);

  // Brass Orrery / Armillary Sphere in Center
  const orreryPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.4, 8), brassMat);
  orreryPillar.position.set(0, 15.0 + 0.7, 0);
  const armRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.06, 8, 24), brassMat);
  armRing1.position.set(0, 15.0 + 2.1, 0);
  armRing1.rotation.x = 0.5;
  const armRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 8, 24), goldMat);
  armRing2.position.set(0, 15.0 + 2.1, 0);
  armRing2.rotation.y = 0.8;
  const armSun = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), runeMat);
  armSun.position.set(0, 15.0 + 2.1, 0);
  interior.add(orreryPillar, armRing1, armRing2, armSun);

  // Large Brass Celestial Telescope
  const teleTripod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.6, 1.6, 6), brassMat);
  teleTripod.position.set(0, 15.0 + 0.8, -5.2);
  const teleBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 3.2, 8), brassMat);
  teleBarrel.position.set(0, 15.0 + 2.2, -5.2);
  teleBarrel.rotation.x = -0.55;
  interior.add(teleTripod, teleBarrel);

  // Level 3 Light (Star Arcane Glow)
  const lightL3 = new THREE.PointLight(0x38bdf8, 2.5, 22);
  lightL3.position.set(0, 15.0 + 4.5, 0);
  interior.add(lightL3);

  return interior;
}

// ==========================================
// MAGE TOWER UNIQUE NPC MESHES
// ==========================================

/**
 * Grand Mage Eldrin: Purple wizard robe with gold runes, silver beard,
 * pointed wizard hat with sapphire gem, and glowing lightning staff.
 */
export function createGrandMageEldrinMesh(): THREE.Group {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd180, flatShading: true });
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.75 });
  const goldRuneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x3f2e18 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x00f0ff, emissiveIntensity: 0.95 });

  // Robe Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 1.3, 8), robeMat);
  body.position.y = 0.9;
  body.castShadow = true;
  const hemTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.62, 0.15, 8), goldRuneMat);
  hemTrim.position.y = 0.35;
  group.add(body, hemTrim);

  // Head & Majestic White Beard
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
  head.position.y = 1.75;
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 5), hairMat);
  beard.position.set(0, 1.45, 0.24);
  beard.rotation.x = 0.2;
  group.add(head, beard);

  // Wizard Hat with Star Brim & Sapphire Gem
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 8), robeMat);
  hatBrim.position.y = 1.98;
  const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 6), robeMat);
  hatCone.position.set(0, 2.45, -0.05);
  hatCone.rotation.x = -0.15;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), crystalMat);
  gem.position.set(0, 2.05, 0.35);
  group.add(hatBrim, hatCone, gem);

  // Grand Lightning Staff in Right Hand
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), woodMat);
  staff.position.set(0.6, 1.25, 0.2);
  const staffOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), crystalMat);
  staffOrb.position.set(0.6, 2.55, 0.2);
  const staffLight = new THREE.PointLight(0x00f0ff, 1.4, 8);
  staffLight.position.set(0.6, 2.55, 0.2);
  group.add(staff, staffOrb, staffLight);

  return group;
}

/**
 * Archmage Pyro: Dark battlemage robe with fiery crimson trims,
 * flame-tipped staff, and glowing fire particle aura.
 */
export function createArchmagePyroMesh(): THREE.Group {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: 0xf5b780, flatShading: true });
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 });
  const flameTrimMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff3d00, emissiveIntensity: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7 });
  const fireCrystalMat = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff6d00, emissiveIntensity: 1.0 });

  // Robe Torso
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.58, 1.3, 8), robeMat);
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  // Dark Fiery Pauldrons
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.32), darkMat);
  p1.position.set(0.48, 1.5, 0);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.32), darkMat);
  p2.position.set(-0.48, 1.5, 0);
  group.add(p1, p2);

  // Head & Dark Cowl
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
  head.position.y = 1.75;
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), robeMat);
  cowl.position.set(0, 1.82, -0.06);
  group.add(head, cowl);

  // Blazing Fire Staff in Hand
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.4, 6), darkMat);
  staff.position.set(0.55, 1.2, 0.25);
  const flameTip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 5), fireCrystalMat);
  flameTip.position.set(0.55, 2.5, 0.25);
  const flameLight = new THREE.PointLight(0xff3d00, 1.6, 9);
  flameLight.position.set(0.55, 2.5, 0.25);
  group.add(staff, flameTip, flameLight);

  return group;
}

/**
 * Sorceress Maya: Celestial star-blue scholar robe, silver tiara,
 * and open floating grimoire emitting starlight.
 */
export function createSorceressMayaMesh(): THREE.Group {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd180, flatShading: true });
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.75 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.85 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x1e1b4b });
  const bookMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.75 });

  // Slender Gown Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 1.35, 8), robeMat);
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  // Head, Flowing Hair, Silver Tiara
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat);
  head.position.y = 1.75;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.46), hairMat);
  hair.position.set(0, 1.68, -0.08);
  const tiara = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 8), silverMat);
  tiara.position.set(0, 1.96, 0);
  group.add(head, hair, tiara);

  // Floating Starlight Grimoire in front of her hands
  const grimoire = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.45), bookMat);
  grimoire.position.set(0, 1.25, 0.45);
  grimoire.rotation.x = 0.4;
  const starlight = new THREE.PointLight(0x38bdf8, 1.2, 7);
  starlight.position.set(0, 1.3, 0.45);
  group.add(grimoire, starlight);

  return group;
}
