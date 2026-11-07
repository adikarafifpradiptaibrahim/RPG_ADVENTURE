import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * KNIGHT MODEL LEGACY (Box-based Classic Model Backup)
 * ============================================================================
 * Duplikasi lengkap model Ksatria (Warrior) generasi pertama (box-based/kotak-kotak)
 * untuk sistem safety rollback. Jika USE_LEGACY_KNIGHT diaktifkan, fungsi ini
 * akan merender model lama secara instan tanpa mengganggu mekanika game lainnya.
 */
export function createLegacyKnightMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'warrior';

  // Class colors & tier theme adjustments
  const primaryColor = tier >= 3 ? 0xffd700 : 0x1976d2; // Royal blue / gold at tier 3+
  const secondaryColor = tier >= 3 ? 0xffd700 : 0xb0bec5; // Steel / Gold armor at tier 3+
  const capeColor = tier >= 3 ? 0xb91c1c : 0xd32f2f;

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
    color: tier >= 3 ? 0xffea00 : 0xe0e0e0,
    metalness: 0.85,
    roughness: 0.2,
    emissive: tier >= 3 ? (tier >= 4 ? 0xffd700 : 0xff6d00) : 0x000000,
    emissiveIntensity: tier >= 4 ? 0.9 : tier >= 3 ? 0.6 : 0,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.25 });

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
  const pauldronScale = tier >= 4 ? 1.5 : tier >= 2 ? 1.25 : 1.0;
  const pauldronGeo = new THREE.BoxGeometry(0.3 * pauldronScale, 0.24 * pauldronScale, 0.35 * pauldronScale);
  const leftPauldron = new THREE.Mesh(pauldronGeo, goldMat);
  leftPauldron.position.set(0.52, 1.85, 0);
  leftPauldron.rotation.z = -0.2;
  const rightPauldron = new THREE.Mesh(pauldronGeo, goldMat);
  rightPauldron.position.set(-0.52, 1.85, 0);
  rightPauldron.rotation.z = 0.2;
  group.add(leftPauldron, rightPauldron);

  // Spikes on pauldrons for Tier 2+
  if (tier >= 2) {
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
    const spike1 = new THREE.Mesh(spikeGeo, steelMat);
    spike1.position.set(0.55, 2.05, 0);
    const spike2 = new THREE.Mesh(spikeGeo, steelMat);
    spike2.position.set(-0.55, 2.05, 0);
    group.add(spike1, spike2);
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

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
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

  // Right Hand Weapon (Great Broadsword)
  const weapon = new THREE.Group();
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
  rightArm.add(weapon);

  // Shield on left arm
  const shieldGeo = new THREE.BoxGeometry(0.56, 0.78, 0.08);
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  const shieldBorderGeo = new THREE.BoxGeometry(0.58, 0.8, 0.04);
  const shieldBorder = new THREE.Mesh(shieldBorderGeo, goldMat);
  shieldBorder.position.z = -0.02;
  shield.add(shieldBorder);

  const emblemGeo = new THREE.BoxGeometry(0.24, 0.24, 0.1);
  const emblem = new THREE.Mesh(emblemGeo, goldMat);
  shield.add(emblem);
  shield.position.set(0.12, -0.32, 0.14);
  leftArm.add(shield);

  // Leg pivots
  const bootLeatherMat = new THREE.MeshLambertMaterial({
    color: 0x27272a,
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

    const thighGeo = new THREE.BoxGeometry(0.28, 0.42, 0.28);
    thighGeo.translate(0, -0.21, 0);
    const thigh = new THREE.Mesh(thighGeo, primaryMat);
    thigh.castShadow = true;
    leg.add(thigh);

    const kneeGeo = new THREE.BoxGeometry(0.30, 0.14, 0.14);
    const knee = new THREE.Mesh(kneeGeo, armorMat);
    knee.position.set(0, -0.42, 0.08);
    knee.castShadow = true;
    leg.add(knee);

    const shinGeo = new THREE.BoxGeometry(0.27, 0.34, 0.27);
    shinGeo.translate(0, -0.58, 0);
    const shin = new THREE.Mesh(shinGeo, armorMat);
    shin.castShadow = true;
    leg.add(shin);

    const footGeo = new THREE.BoxGeometry(0.29, 0.18, 0.36);
    footGeo.translate(0, -0.77, 0.04);
    const foot = new THREE.Mesh(footGeo, bootLeatherMat);
    foot.castShadow = true;
    leg.add(foot);

    const toeGeo = new THREE.BoxGeometry(0.27, 0.12, 0.14);
    toeGeo.translate(0, -0.80, 0.16);
    const toe = new THREE.Mesh(toeGeo, armorMat);
    toe.castShadow = true;
    leg.add(toe);

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

  // Tier 3+ Aura & Special FX
  let wings: THREE.Group | undefined;
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  const orbitingOrbs: THREE.Mesh[] = [];
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  if (tier >= 3) {
    const haloColor = tier >= 6 ? 0xfff066 : 0xffd700;
    const haloRadius = tier >= 5 ? 0.42 : 0.35;
    const haloGeo = new THREE.TorusGeometry(haloRadius, 0.03, 6, 24);
    haloGeo.rotateX(Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({ color: haloColor });
    halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, 2.7, 0);
    group.add(halo);

    if (tier >= 5) {
      const halo2Geo = new THREE.TorusGeometry(0.55, 0.02, 6, 32);
      halo2Geo.rotateX(Math.PI / 2);
      halo2 = new THREE.Mesh(halo2Geo, haloMat);
      halo2.position.set(0, 2.82, 0);
      group.add(halo2);
    }

    // Wings
    wings = new THREE.Group();
    const wingSpanScale = tier >= 6 ? 1.5 : tier >= 5 ? 1.25 : 1.0;
    wings.position.set(0, 1.6, -0.26);

    const wingMat = new THREE.MeshStandardMaterial({
      color: tier >= 6 ? 0xfffbeb : 0xffea00,
      emissive: tier >= 6 ? 0xfacc15 : 0xffb300,
      emissiveIntensity: tier >= 6 ? 1.4 : tier >= 5 ? 1.1 : 0.8,
      side: THREE.DoubleSide,
    });

    const featherCount = tier >= 5 ? 8 : 5;
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

    // Orbiting Orbs
    const orbCount = tier >= 6 ? 6 : tier >= 5 ? 4 : 2;
    const orbColors = [0xfbbf24, 0xf59e0b, 0xffea00, 0xffd700, 0xffffff, 0xf97316];
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

    // Ground Aura Rings
    const ringGeo = new THREE.RingGeometry(0.65, tier >= 5 ? 0.85 : 0.78, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: tier >= 6 ? 0.85 : 0.6,
    });
    auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.position.y = 0.05;
    group.add(auraRing);

    if (tier >= 5) {
      const outerRingGeo = new THREE.RingGeometry(1.05, 1.22, 32);
      outerRingGeo.rotateX(-Math.PI / 2);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: tier >= 6 ? 0xffffff : 0xf59e0b,
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
    shield,
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
  };
}

