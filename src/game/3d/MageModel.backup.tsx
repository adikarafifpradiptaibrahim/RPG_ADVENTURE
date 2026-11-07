import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * MAGE MODEL BACKUP (Legacy V1 - Procedural Box/Cylinder/Cone)
 * ============================================================================
 * Salinan cadangan aman model Mage lama sebelum perombakan Heroic Blocky Low-Poly.
 * Digunakan untuk safety rollback jika USE_LEGACY_MAGE diaktifkan.
 */
export const USE_LEGACY_MAGE = false;

export function createLegacyMageMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'mage';

  const primaryColor = tier >= 3 ? 0x3b0764 : 0x5b21b6; // Deep cosmic violet
  const secondaryColor = 0xf59e0b; // Amber gold trim
  const capeColor = tier >= 3 ? 0x1e1b4b : 0x4c1d95; // Starlight nebula cape

  const primaryMat = new THREE.MeshLambertMaterial({ color: primaryColor, flatShading: true });
  const armorMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    metalness: tier >= 3 ? 0.9 : 0.6,
    roughness: tier >= 3 ? 0.2 : 0.35,
    flatShading: true,
  });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd180, flatShading: true });
  const capeMat = new THREE.MeshLambertMaterial({ color: capeColor, side: THREE.DoubleSide, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.25 });
  const arcaneMat = new THREE.MeshStandardMaterial({
    color: 0x818cf8,
    emissive: 0x6366f1,
    emissiveIntensity: tier >= 4 ? 1.1 : 0.85,
    roughness: 0.1,
  });

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
  const body = new THREE.Mesh(torsoGeo, primaryMat);
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // Chestplate
  const chestPlateGeo = new THREE.BoxGeometry(0.74, 0.52, 0.48);
  const chestPlate = new THREE.Mesh(chestPlateGeo, armorMat);
  chestPlate.position.y = 1.45;
  chestPlate.castShadow = true;
  group.add(chestPlate);

  // Arcane shoulder mantle runes
  if (tier >= 2) {
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

  // Wizard hat
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

  // Glowing eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
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
  armGeo.translate(0, -0.32, 0);

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

  // Staff & Grimoire
  const weapon = new THREE.Group();
  const shaftGeo = new THREE.CylinderGeometry(0.04, 0.055, 1.8, 6);
  shaftGeo.translate(0, 0.35, 0);
  const shaftMat = new THREE.MeshLambertMaterial({ color: 0x312e81 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);

  const headpieceGeo = new THREE.TorusGeometry(0.18, 0.03, 6, 12);
  headpieceGeo.rotateX(Math.PI / 2);
  const headpiece = new THREE.Mesh(headpieceGeo, goldMat);
  headpiece.position.set(0, 1.25, 0);

  const orbGeo = new THREE.IcosahedronGeometry(0.17, 1);
  const orbMesh = new THREE.Mesh(orbGeo, arcaneMat);
  orbMesh.position.set(0, 1.25, 0);

  const ringGeo = new THREE.TorusGeometry(0.26, 0.02, 4, 16);
  const orbRing = new THREE.Mesh(ringGeo, goldMat);
  orbRing.position.set(0, 1.25, 0);

  weapon.add(shaft, headpiece, orbMesh, orbRing);
  weapon.position.set(0, -0.65, 0.1);
  weapon.rotation.x = Math.PI / 6;
  rightArm.add(weapon);

  const grimoire = new THREE.Group();
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

  // Legs
  const bootLeatherMat = new THREE.MeshLambertMaterial({ color: 0x3f3f46, flatShading: true });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9, metalness: 0.1 });

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

  return {
    group,
    leftArm,
    rightArm,
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
  };
}
