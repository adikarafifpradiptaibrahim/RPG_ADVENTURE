import * as THREE from 'three';
import { CharacterClass } from '../../types/game';

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
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weapon: THREE.Group;
  leftWeapon?: THREE.Group;
  shield?: THREE.Mesh;
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
  const group = new THREE.Group();

  // Class colors & tier theme adjustments
  let primaryColor = 0x1976d2; // Warrior royal blue
  let secondaryColor = tier >= 3 ? 0xffd700 : 0xb0bec5; // Gold armor at tier 3+
  let capeColor = tier >= 3 ? 0xb91c1c : 0xd32f2f;

  if (charClass === 'mage') {
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
    color: tier >= 3 && charClass === 'warrior' ? 0xffea00 : 0xe0e0e0,
    metalness: 0.85,
    roughness: 0.2,
    emissive: tier >= 3 && charClass === 'warrior' ? (tier >= 4 ? 0xffd700 : 0xff6d00) : 0x000000,
    emissiveIntensity: tier >= 4 ? 0.9 : tier >= 3 ? 0.6 : 0,
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
  if (charClass === 'warrior') {
    const pauldronScale = tier >= 4 ? 1.5 : tier >= 2 ? 1.25 : 1.0;
    const pauldronGeo = new THREE.BoxGeometry(0.3 * pauldronScale, 0.24 * pauldronScale, 0.35 * pauldronScale);
    const leftPauldron = new THREE.Mesh(pauldronGeo, goldMat);
    leftPauldron.position.set(0.52, 1.85, 0);
    leftPauldron.rotation.z = -0.2;
    const rightPauldron = new THREE.Mesh(pauldronGeo, goldMat);
    rightPauldron.position.set(-0.52, 1.85, 0);
    rightPauldron.rotation.z = 0.2;
    group.add(leftPauldron, rightPauldron);

    // Spikes or dragon wings on pauldrons for Tier 2+
    if (tier >= 2) {
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
      const spike1 = new THREE.Mesh(spikeGeo, steelMat);
      spike1.position.set(0.55, 2.05, 0);
      const spike2 = new THREE.Mesh(spikeGeo, steelMat);
      spike2.position.set(-0.55, 2.05, 0);
      group.add(spike1, spike2);
    }
  } else if (charClass === 'rogue' && tier >= 2) {
    // Spiked leather assassin shoulder guards
    const pauldronGeo = new THREE.BoxGeometry(0.24, 0.18, 0.28);
    const lp = new THREE.Mesh(pauldronGeo, armorMat);
    lp.position.set(0.5, 1.82, 0);
    const rp = new THREE.Mesh(pauldronGeo, armorMat);
    rp.position.set(-0.5, 1.82, 0);
    group.add(lp, rp);
  } else if (charClass === 'mage' && tier >= 2) {
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
  if (charClass === 'warrior') {
    // Knight helmet with visor & plume
    const helmetGeo = new THREE.BoxGeometry(0.52, 0.32, 0.52);
    const helmet = new THREE.Mesh(helmetGeo, armorMat);
    helmet.position.y = 2.22;
    group.add(helmet);

    const visorGeo = new THREE.BoxGeometry(0.5, 0.1, 0.1);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2.08, 0.23);
    group.add(visor);

    const crestGeo = new THREE.BoxGeometry(0.12, 0.28, 0.62);
    const crestMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.y = 2.46;
    group.add(crest);
  } else if (charClass === 'mage') {
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
    : charClass === 'mage'
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

  if (charClass === 'warrior') {
    // Great Broadsword with gold fuller & hilt
    const bladeGeo = new THREE.BoxGeometry(0.13, 1.35, 0.04);
    bladeGeo.translate(0, 0.68, 0);
    const blade = new THREE.Mesh(bladeGeo, steelMat);
    blade.castShadow = true;

    const crossGeo = new THREE.BoxGeometry(0.42, 0.09, 0.1);
    const cross = new THREE.Mesh(crossGeo, goldMat);

    const gripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
    gripGeo.translate(0, -0.18, 0);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const grip = new THREE.Mesh(gripGeo, gripMat);

    const pommelGeo = new THREE.SphereGeometry(0.06, 6, 6);
    pommelGeo.translate(0, -0.36, 0);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);

    weapon.add(blade, cross, grip, pommel);
    weapon.position.set(0, -0.65, 0.15);
    weapon.rotation.x = Math.PI / 4;

    // Shield on left arm
    const shieldGeo = new THREE.BoxGeometry(0.56, 0.78, 0.08);
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    shield = new THREE.Mesh(shieldGeo, shieldMat);
    const shieldBorderGeo = new THREE.BoxGeometry(0.58, 0.8, 0.04);
    const shieldBorder = new THREE.Mesh(shieldBorderGeo, goldMat);
    shieldBorder.position.z = -0.02;
    shield.add(shieldBorder);

    const emblemGeo = new THREE.BoxGeometry(0.24, 0.24, 0.1);
    const emblem = new THREE.Mesh(emblemGeo, goldMat);
    shield.add(emblem);
    shield.position.set(0.12, -0.32, 0.14);
    leftArm.add(shield);
  } else if (charClass === 'mage') {
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
    color: charClass === 'warrior' ? 0x27272a : charClass === 'rogue' ? 0x18181b : 0x3f3f46,
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
    const haloColor = charClass === 'warrior'
      ? (tier >= 6 ? 0xfff066 : 0xffd700)
      : charClass === 'mage'
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

    const wingMat = charClass === 'warrior'
      ? new THREE.MeshStandardMaterial({
          color: tier >= 6 ? 0xfffbeb : 0xffea00,
          emissive: tier >= 6 ? 0xfacc15 : 0xffb300,
          emissiveIntensity: tier >= 6 ? 1.4 : tier >= 5 ? 1.1 : 0.8,
          side: THREE.DoubleSide,
        })
      : charClass === 'mage'
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
    const orbCount = tier >= 6 ? 6 : tier >= 5 ? 4 : (charClass === 'mage' ? (tier >= 4 ? 3 : 2) : 2);
    const orbColors = charClass === 'warrior'
      ? [0xfbbf24, 0xf59e0b, 0xffea00, 0xffd700, 0xffffff, 0xf97316]
      : charClass === 'mage'
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
    const auraColor = charClass === 'warrior' ? 0xf59e0b : charClass === 'mage' ? 0x8b5cf6 : 0x10b981;
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

// Enemy models: Slime, Magma Slime, Skeleton, Skeleton Mage, Goblin, Golem, Spider, Frost Wolf, Swamp Crawler, Boss
export function createEnemyMesh(
  type: 'slime' | 'magma_slime' | 'skeleton' | 'skeleton_mage' | 'goblin' | 'golem' | 'spider' | 'frost_wolf' | 'swamp_crawler' | 'boss'
): {
  group: THREE.Group;
  parts: Record<string, any>;
} {
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
    group.scale.set(2.8, 2.8, 2.8);

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

// Ocean Pier / Dock
export function createPierDockMesh(): THREE.Group {
  const pier = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true });

  // Piles / support poles in water
  const pileGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.5, 6);
  for (let z = 0; z <= 12; z += 3) {
    const leftPile = new THREE.Mesh(pileGeo, woodMat);
    leftPile.position.set(-1.2, 0.5, z);
    const rightPile = new THREE.Mesh(pileGeo, woodMat);
    rightPile.position.set(1.2, 0.5, z);
    pier.add(leftPile, rightPile);
  }

  // Walkway deck planks
  const deckGeo = new THREE.BoxGeometry(2.8, 0.25, 13.5);
  const deck = new THREE.Mesh(deckGeo, plankMat);
  deck.position.set(0, 2.1, 6);
  deck.receiveShadow = true;
  deck.castShadow = true;
  pier.add(deck);

  // Lantern on dock post
  const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6), woodMat);
  lanternPost.position.set(1.1, 2.8, 12);
  pier.add(lanternPost);

  const lanternGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.35, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffb74d })
  );
  lanternGlow.position.set(1.1, 3.4, 12);
  pier.add(lanternGlow);

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
  body.castShadow = true;
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
  post.castShadow = true;
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
  p1.castShadow = true;

  const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5.0, 8), logMat);
  p2.position.set(3.5, 2.5, 0);
  p2.castShadow = true;
  arch.add(p1, p2);

  // Crossbeam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.5, 0.8), logMat);
  beam.position.set(0, 4.8, 0);
  beam.castShadow = true;
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

  // Anchor Stone Pylons on both sides
  for (const x of [-length / 2, length / 2]) {
    for (const z of [-2.4, 2.4]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.5, 1.4), pylonMat);
      pylon.position.set(x, 2.2, z);
      pylon.castShadow = true;
      bridge.add(pylon);
    }
    // Cross timber beam between pylons
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 5.4), timberMat);
    beam.position.set(x, 4.4, 0);
    bridge.add(beam);
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
export function createTrainingDummyMesh(): THREE.Group {
  const dummy = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  const strawMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
  const targetMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });

  // Wood Stand Post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 6), woodMat);
  post.position.y = 1.0;
  post.castShadow = true;
  dummy.add(post);

  // Cross arms
  const cross = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.14), woodMat);
  cross.position.y = 1.4;
  dummy.add(cross);

  // Straw Body
  const strawBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.0, 8), strawMat);
  strawBody.position.y = 1.35;
  strawBody.castShadow = true;
  dummy.add(strawBody);

  // Straw Head with iron helmet
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), strawMat);
  head.position.y = 2.0;
  const helm = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 }));
  helm.position.y = 2.15;
  dummy.add(head, helm);

  // Target Bullseye Shield on chest
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12), targetMat);
  shield.position.set(0, 1.4, 0.32);
  shield.rotation.x = Math.PI / 2;
  dummy.add(shield);

  return dummy;
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

// 10. Solaria Desert Stepped Pyramid
export function createDesertPyramidMesh(): THREE.Group {
  const group = new THREE.Group();
  const sandStone = new THREE.MeshLambertMaterial({ color: 0xd4a373, flatShading: true });
  const sandStoneDark = new THREE.MeshLambertMaterial({ color: 0xb5835a, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.8,
    roughness: 0.25,
    emissive: 0xffb300,
    emissiveIntensity: 0.35,
  });

  // Deep foundation skirt into sand
  const baseFound = new THREE.Mesh(new THREE.BoxGeometry(17, 3.0, 17), sandStone);
  baseFound.position.y = -1.0;
  baseFound.receiveShadow = true;
  group.add(baseFound);

  // Base tier 1
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 16), sandStone);
  t1.position.y = 1.25;
  group.add(t1);

  // Tier 2
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(11.5, 2.4, 11.5), sandStoneDark);
  t2.position.y = 3.7;
  group.add(t2);

  // Tier 3
  const t3 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.2, 7.5), sandStone);
  t3.position.y = 6.0;
  group.add(t3);

  // Golden Capstone
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3.0, 3.5, 4), gold);
  cap.position.y = 8.85;
  cap.rotation.y = Math.PI / 4;
  group.add(cap);

  // Grand Entrance Arch
  const portal = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 3.6, 1.5),
    new THREE.MeshBasicMaterial({ color: 0x110902 })
  );
  portal.position.set(0, 1.8, 8.05);
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
  trunk1.castShadow = true;
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

  // Elevated Marble Foundation Podium
  const podium = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 18), whiteMarble);
  podium.position.set(0, 0.8, 0);
  palace.add(podium);

  // Grand Entrance Steps (Leading to +Z)
  for (let s = 1; s <= 4; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(10 - s * 0.6, 0.35, 1.2), whiteMarble);
    step.position.set(0, 0.18 * s, 9 + s * 1.0);
    palace.add(step);
  }

  // Red Imperial Carpet on Steps and Portico
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 16), redCarpet);
  carpet.position.set(0, 1.63, 6);
  palace.add(carpet);

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

  // Base Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 0.8, 2.9), stoneTrim);
  plinth.position.set(0, 0.4, 0);
  wall.add(plinth);

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


