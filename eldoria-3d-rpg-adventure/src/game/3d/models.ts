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
  auraRing?: THREE.Mesh;
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
    // Rogue Dual Poison Daggers
    // Mainhand dagger (Right)
    const daggerGeo = new THREE.BoxGeometry(0.08, 0.75, 0.03);
    daggerGeo.translate(0, 0.35, 0);
    const daggerBlade = new THREE.Mesh(daggerGeo, poisonMat);
    const guardGeo = new THREE.BoxGeometry(0.22, 0.05, 0.06);
    const guard = new THREE.Mesh(guardGeo, armorMat);
    weapon.add(daggerBlade, guard);
    weapon.position.set(0, -0.55, 0.1);
    weapon.rotation.x = Math.PI / 2.5;

    // Offhand dagger (Left)
    leftWeapon = new THREE.Group();
    const leftDaggerBlade = new THREE.Mesh(daggerGeo.clone(), poisonMat);
    const leftGuard = new THREE.Mesh(guardGeo.clone(), armorMat);
    leftWeapon.add(leftDaggerBlade, leftGuard);
    leftWeapon.position.set(0, -0.55, 0.1);
    leftWeapon.rotation.x = Math.PI / 2.5;
    leftArm.add(leftWeapon);
  }
  rightArm.add(weapon);

  // Leg pivots
  const legGeo = new THREE.BoxGeometry(0.28, 0.85, 0.28);
  legGeo.translate(0, -0.4, 0); // pivot at hip

  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.2, 0.88, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, armorMat);
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.2, 0.88, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, armorMat);
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  group.add(rightLeg);

  // Tier-specific Special Features: Wings, Orbiting Orbs, Halos
  let halo: THREE.Mesh | undefined;
  let wings: THREE.Group | undefined;
  const orbitingOrbs: THREE.Mesh[] = [];
  let auraRing: THREE.Mesh | undefined;

  // 1. Halo for Tier 3+ Warrior or Tier 4 Mage
  if ((charClass === 'warrior' && tier >= 3) || (charClass === 'mage' && tier >= 3)) {
    const haloColor = charClass === 'warrior' ? 0xffd700 : 0x38bdf8;
    const haloGeo = new THREE.TorusGeometry(0.35, 0.035, 6, 16);
    haloGeo.rotateX(Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.85 });
    halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 2.65;
    group.add(halo);
  }

  // 2. Wings for Tier 4 (Warrior Radiant Wings, Rogue Void Wings, Mage Celestial Wings)
  if (tier >= 4) {
    wings = new THREE.Group();
    wings.position.set(0, 1.6, -0.26);

    const wingMat = charClass === 'warrior'
      ? new THREE.MeshStandardMaterial({ color: 0xffea00, emissive: 0xffb300, emissiveIntensity: 0.8, side: THREE.DoubleSide })
      : charClass === 'mage'
      ? new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x4f46e5, emissiveIntensity: 0.8, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ color: 0x059669, emissive: 0x064e3b, emissiveIntensity: 0.8, side: THREE.DoubleSide });

    // Left Wing (3 feathers)
    const leftWing = new THREE.Group();
    for (let f = 0; f < 3; f++) {
      const featherGeo = new THREE.BoxGeometry(0.1, 0.7 - f * 0.12, 0.02);
      featherGeo.translate(0, 0.35, 0);
      const feather = new THREE.Mesh(featherGeo, wingMat);
      feather.position.set(0.2 + f * 0.18, 0.1 - f * 0.1, 0);
      feather.rotation.z = -0.5 - f * 0.35;
      leftWing.add(feather);
    }
    // Right Wing
    const rightWing = new THREE.Group();
    for (let f = 0; f < 3; f++) {
      const featherGeo = new THREE.BoxGeometry(0.1, 0.7 - f * 0.12, 0.02);
      featherGeo.translate(0, 0.35, 0);
      const feather = new THREE.Mesh(featherGeo, wingMat);
      feather.position.set(-0.2 - f * 0.18, 0.1 - f * 0.1, 0);
      feather.rotation.z = 0.5 + f * 0.35;
      rightWing.add(feather);
    }
    wings.add(leftWing, rightWing);
    group.add(wings);
  }

  // 3. Orbiting Mana Crystals for Mage (Tier 3: 2 crystals, Tier 4: 3 crystals)
  if (charClass === 'mage' && tier >= 3) {
    const orbCount = tier >= 4 ? 3 : 2;
    const orbColors = [0x00e5ff, 0xa855f7, 0xfbbf24];
    for (let i = 0; i < orbCount; i++) {
      const orbMat = new THREE.MeshStandardMaterial({
        color: orbColors[i % orbColors.length],
        emissive: orbColors[i % orbColors.length],
        emissiveIntensity: 0.9,
      });
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), orbMat);
      const angle = (i / orbCount) * Math.PI * 2;
      orb.position.set(Math.cos(angle) * 0.9, 1.8, Math.sin(angle) * 0.9);
      group.add(orb);
      orbitingOrbs.push(orb);
    }
  }

  // 4. Ground Aura Ring for Tier 3+
  if (tier >= 3) {
    const auraColor = charClass === 'warrior' ? 0xf59e0b : charClass === 'mage' ? 0x8b5cf6 : 0x10b981;
    const ringGeo = new THREE.RingGeometry(0.65, 0.78, 18);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: auraColor, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.position.y = 0.05;
    group.add(auraRing);
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
    auraRing,
  };
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

// Enemy models: Slime, Magma Slime, Skeleton, Skeleton Mage, Goblin, Golem, Spider, Boss
export function createEnemyMesh(
  type: 'slime' | 'magma_slime' | 'skeleton' | 'skeleton_mage' | 'goblin' | 'golem' | 'spider' | 'boss'
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
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.8, 5);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    group.add(trunk);

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
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.4, 6);
    const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x37474f }));
    trunk.position.y = 1.2;
    group.add(trunk);

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
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.2, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    group.add(trunk);

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

  // Base stone foundation
  const foundGeo = new THREE.BoxGeometry(4.4, 0.5, 4.4);
  const found = new THREE.Mesh(foundGeo, chimneyMat);
  found.position.y = 0.25;
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

  const lanternLight = new THREE.PointLight(0xffb74d, 1.2, 12);
  lanternLight.position.set(1.1, 3.4, 12);
  pier.add(lanternLight);

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

  const runeLight = new THREE.PointLight(0x00e5ff, 1.2, 10);
  runeLight.position.set(0, 4.4, 0);
  arch.add(runeLight);

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

  const light = new THREE.PointLight(0xffb74d, 1.5, 14);
  light.position.set(0, 2.7, 3.1);
  tavern.add(light);

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

  const fireLight = new THREE.PointLight(0xff5722, 2.0, 10);
  fireLight.position.set(-1.4, 1.2, 2.6);
  forge.add(fireLight);

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

  return forge;
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

  const light = new THREE.PointLight(0xffecb3, 1.2, 10);
  light.position.y = 3.2;
  lamp.add(light);

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
export function createCustomNPCMesh(role: 'elder' | 'guard' | 'alchemist' | 'blacksmith' | 'bard' | 'fisherman' | 'villager'): THREE.Group {
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

