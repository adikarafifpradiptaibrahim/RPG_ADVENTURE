import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * CONFIGURATION & SAFETY ROLLBACK TOGGLE
 * ============================================================================
 * Jika USE_LEGACY_KNIGHT bernilai true: Game akan menggunakan model kotak-kotak lama.
 * Jika USE_LEGACY_KNIGHT bernilai false: Game menggunakan model Heroic Low-Poly baru.
 */
export const USE_LEGACY_KNIGHT = false;
export { createLegacyKnightMesh } from './KnightModelLegacy';

/**
 * ============================================================================
 * PRELOADED GEOMETRY & MATERIAL PALETTE (Zero-Lag & Object Pooling)
 * ============================================================================
 * Seluruh geometri dan material dibuat satu kali saat modul dimuat untuk
 * menghindari lonjakan alokasi memori (GC spike) saat inisialisasi karakter.
 */

// 1. Materials Cache
interface KnightMaterialPalette {
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  royalBlue: THREE.MeshLambertMaterial;
  plumeRed: THREE.MeshLambertMaterial;
  visorMat: THREE.MeshBasicMaterial;
  leather: THREE.MeshLambertMaterial;
  bladeSteel: THREE.MeshStandardMaterial;
  shieldFace: THREE.MeshStandardMaterial;
  soleMat: THREE.MeshStandardMaterial;
  capeMat: THREE.MeshLambertMaterial;
  skinMat: THREE.MeshLambertMaterial;
}

let cachedMaterials: KnightMaterialPalette | null = null;

function getKnightMaterials(tier: number): KnightMaterialPalette {
  if (!cachedMaterials) {
    cachedMaterials = {
      steel: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.78,
        roughness: 0.32,
        flatShading: true,
      }),
      darkSteel: new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.75,
        roughness: 0.38,
        flatShading: true,
      }),
      gold: new THREE.MeshStandardMaterial({
        color: 0xeab308,
        metalness: 0.88,
        roughness: 0.22,
        emissive: 0xd97706,
        emissiveIntensity: 0.15,
        flatShading: true,
      }),
      royalBlue: new THREE.MeshLambertMaterial({
        color: 0x1e3a8a,
        flatShading: true,
      }),
      plumeRed: new THREE.MeshLambertMaterial({
        color: 0xdc2626,
        flatShading: true,
      }),
      visorMat: new THREE.MeshBasicMaterial({
        color: 0x09090b,
      }),
      leather: new THREE.MeshLambertMaterial({
        color: 0x451a03,
        flatShading: true,
      }),
      bladeSteel: new THREE.MeshStandardMaterial({
        color: 0xdbeafe,
        metalness: 0.92,
        roughness: 0.18,
        flatShading: true,
      }),
      shieldFace: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.75,
        roughness: 0.35,
        flatShading: true,
      }),
      soleMat: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
      }),
      capeMat: new THREE.MeshLambertMaterial({
        color: 0xb91c1c,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      skinMat: new THREE.MeshLambertMaterial({
        color: 0xffd180,
        flatShading: true,
      }),
    };
  }

  // Tier 3+ Gilded Armor enhancement
  if (tier >= 3) {
    cachedMaterials.steel.color.setHex(0xffea00);
    cachedMaterials.steel.emissive.setHex(tier >= 4 ? 0xffd700 : 0xffa000);
    cachedMaterials.steel.emissiveIntensity = tier >= 4 ? 0.6 : 0.35;
    cachedMaterials.gold.emissiveIntensity = 0.5;
  } else {
    cachedMaterials.steel.color.setHex(0x94a3b8);
    cachedMaterials.steel.emissive.setHex(0x000000);
    cachedMaterials.steel.emissiveIntensity = 0;
    cachedMaterials.gold.emissiveIntensity = 0.15;
  }

  return cachedMaterials;
}

// 2. Preloaded Geometries Cache
interface KnightGeometryPalette {
  headGeo: THREE.BufferGeometry;
  helmetDomeGeo: THREE.BufferGeometry;
  helmetCrownGeo: THREE.BufferGeometry;
  visorHorizGeo: THREE.BufferGeometry;
  visorVertGeo: THREE.BufferGeometry;
  browRimGeo: THREE.BufferGeometry;
  plumeBaseGeo: THREE.BufferGeometry;
  plumeSeg1Geo: THREE.BufferGeometry;
  plumeSeg2Geo: THREE.BufferGeometry;
  plumeSeg3Geo: THREE.BufferGeometry;
  plumeSeg4Geo: THREE.BufferGeometry;
  gorgetGeo: THREE.BufferGeometry;
  gorgetInnerGeo: THREE.BufferGeometry;
  torsoGeo: THREE.BufferGeometry;
  chestplateLeftGeo: THREE.BufferGeometry;
  chestplateRightGeo: THREE.BufferGeometry;
  chestRimGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  tabardGeo: THREE.BufferGeometry;
  tassetPlateGeo: THREE.BufferGeometry;
  tassetRimGeo: THREE.BufferGeometry;
  pauldronMainGeo: THREE.BufferGeometry;
  pauldronRimGeo: THREE.BufferGeometry;
  pauldronUnderGeo: THREE.BufferGeometry;
  armUpperGeo: THREE.BufferGeometry;
  elbowCopGeo: THREE.BufferGeometry;
  gauntletGeo: THREE.BufferGeometry;
  wristCuffGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  bladeGeo: THREE.BufferGeometry;
  bladeFullerGeo: THREE.BufferGeometry;
  crossguardGeo: THREE.BufferGeometry;
  crossguardTipGeo: THREE.BufferGeometry;
  gripGeo: THREE.BufferGeometry;
  pommelGeo: THREE.BufferGeometry;
  shieldFaceGeo: THREE.BufferGeometry;
  shieldRimGeo: THREE.BufferGeometry;
  thighGeo: THREE.BufferGeometry;
  cuisseGeo: THREE.BufferGeometry;
  kneeCopGeo: THREE.BufferGeometry;
  greaveGeo: THREE.BufferGeometry;
  footGeo: THREE.BufferGeometry;
  toeCapGeo: THREE.BufferGeometry;
  soleGeo: THREE.BufferGeometry;
  capeGeo: THREE.BufferGeometry;
}

let cachedGeometries: KnightGeometryPalette | null = null;

function createHeaterShieldGeometries(): { faceGeo: THREE.BufferGeometry; rimGeo: THREE.BufferGeometry } {
  // Shape heater shield yang elegan (melengkung di atas, meruncing di bawah)
  const shape = new THREE.Shape();
  const w = 0.31; // half-width
  const topY = 0.44;
  const bottomY = -0.44;

  shape.moveTo(0, bottomY);
  shape.lineTo(-w * 0.9, -0.05);
  shape.lineTo(-w, topY * 0.7);
  shape.lineTo(-w * 0.85, topY);
  shape.lineTo(0, topY * 0.95);
  shape.lineTo(w * 0.85, topY);
  shape.lineTo(w, topY * 0.7);
  shape.lineTo(w * 0.9, -0.05);
  shape.closePath();

  const faceGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 1,
  });
  faceGeo.center();

  // Raised gold outer border/rim
  const rimShape = new THREE.Shape();
  const rw = w * 1.06;
  const rTopY = topY * 1.05;
  const rBottomY = bottomY * 1.06;

  rimShape.moveTo(0, rBottomY);
  rimShape.lineTo(-rw * 0.9, -0.05);
  rimShape.lineTo(-rw, rTopY * 0.7);
  rimShape.lineTo(-rw * 0.85, rTopY);
  rimShape.lineTo(0, rTopY * 0.95);
  rimShape.lineTo(rw * 0.85, rTopY);
  rimShape.lineTo(rw, rTopY * 0.7);
  rimShape.lineTo(rw * 0.9, -0.05);
  rimShape.closePath();

  const rimHole = new THREE.Path();
  const hw = w * 0.86;
  rimHole.moveTo(0, bottomY * 0.9);
  rimHole.lineTo(hw * 0.9, -0.05);
  rimHole.lineTo(hw, topY * 0.65);
  rimHole.lineTo(hw * 0.85, topY * 0.92);
  rimHole.lineTo(0, topY * 0.88);
  rimHole.lineTo(-hw * 0.85, topY * 0.92);
  rimHole.lineTo(-hw, topY * 0.65);
  rimHole.lineTo(-hw * 0.9, -0.05);
  rimHole.closePath();
  rimShape.holes.push(rimHole);

  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: 0.065,
    bevelEnabled: false,
  });
  rimGeo.center();

  return { faceGeo, rimGeo };
}

function getKnightGeometries(): KnightGeometryPalette {
  if (cachedGeometries) return cachedGeometries;

  const { faceGeo, rimGeo } = createHeaterShieldGeometries();

  // Head & Helmet
  const headGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.44, 6);
  const helmetDomeGeo = new THREE.CylinderGeometry(0.27, 0.29, 0.36, 8);
  const helmetCrownGeo = new THREE.ConeGeometry(0.27, 0.16, 8);
  helmetCrownGeo.translate(0, 0.26, 0);

  const visorHorizGeo = new THREE.BoxGeometry(0.32, 0.05, 0.08);
  const visorVertGeo = new THREE.BoxGeometry(0.065, 0.20, 0.08);
  const browRimGeo = new THREE.BoxGeometry(0.34, 0.04, 0.07);

  // Plume segments
  const plumeBaseGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.08, 6);
  const plumeSeg1Geo = new THREE.ConeGeometry(0.12, 0.24, 6);
  plumeSeg1Geo.translate(0, 0.12, 0);
  const plumeSeg2Geo = new THREE.ConeGeometry(0.14, 0.28, 6);
  plumeSeg2Geo.translate(0, 0.14, 0);
  const plumeSeg3Geo = new THREE.ConeGeometry(0.12, 0.26, 6);
  plumeSeg3Geo.translate(0, 0.13, 0);
  const plumeSeg4Geo = new THREE.ConeGeometry(0.08, 0.22, 5);
  plumeSeg4Geo.translate(0, 0.11, 0);

  // Gorget & Torso
  const gorgetGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.12, 6);
  const gorgetInnerGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.14, 6);
  const torsoGeo = new THREE.BoxGeometry(0.70, 0.88, 0.45);

  // Keel-ridged Chestplate Halves
  const chestplateLeftGeo = new THREE.BoxGeometry(0.36, 0.54, 0.28);
  chestplateLeftGeo.translate(0.18, 0, 0.04);
  const chestplateRightGeo = new THREE.BoxGeometry(0.36, 0.54, 0.28);
  chestplateRightGeo.translate(-0.18, 0, 0.04);
  const chestRimGeo = new THREE.BoxGeometry(0.74, 0.08, 0.52);

  // Belt & Tassets
  const beltGeo = new THREE.BoxGeometry(0.74, 0.14, 0.48);
  const buckleGeo = new THREE.BoxGeometry(0.22, 0.18, 0.52);
  const tabardGeo = new THREE.BoxGeometry(0.32, 0.48, 0.04);
  tabardGeo.translate(0, -0.24, 0);

  const tassetPlateGeo = new THREE.BoxGeometry(0.24, 0.36, 0.06);
  tassetPlateGeo.translate(0, -0.18, 0);
  const tassetRimGeo = new THREE.BoxGeometry(0.26, 0.06, 0.08);

  // Pauldrons
  const pauldronMainGeo = new THREE.CylinderGeometry(0.26, 0.34, 0.36, 6);
  const pauldronRimGeo = new THREE.TorusGeometry(0.32, 0.04, 5, 8, Math.PI);
  pauldronRimGeo.rotateZ(Math.PI / 2);
  const pauldronUnderGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.24, 6);

  // Arms & Gauntlets
  const armUpperGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.36, 6);
  armUpperGeo.translate(0, -0.18, 0);
  const elbowCopGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  const gauntletGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.42, 6);
  gauntletGeo.translate(0, -0.42, 0);
  const wristCuffGeo = new THREE.CylinderGeometry(0.15, 0.14, 0.08, 6);
  wristCuffGeo.translate(0, -0.56, 0);
  const handGeo = new THREE.BoxGeometry(0.14, 0.14, 0.16);
  handGeo.translate(0, -0.66, 0);

  // Broadsword
  const bladeGeo = new THREE.BoxGeometry(0.15, 1.42, 0.045);
  bladeGeo.translate(0, 0.71, 0);
  const bladeFullerGeo = new THREE.BoxGeometry(0.04, 1.15, 0.055);
  bladeFullerGeo.translate(0, 0.62, 0);
  const crossguardGeo = new THREE.BoxGeometry(0.48, 0.10, 0.10);
  const crossguardTipGeo = new THREE.ConeGeometry(0.06, 0.10, 4);
  const gripGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.34, 6);
  gripGeo.translate(0, -0.17, 0);
  const pommelGeo = new THREE.OctahedronGeometry(0.075, 0);
  pommelGeo.translate(0, -0.37, 0);

  // Legs & Sabatons
  const thighGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.42, 6);
  thighGeo.translate(0, -0.21, 0);
  const cuisseGeo = new THREE.BoxGeometry(0.24, 0.38, 0.12);
  cuisseGeo.translate(0, -0.20, 0.08);
  const kneeCopGeo = new THREE.OctahedronGeometry(0.14, 0);
  kneeCopGeo.scale(1.1, 0.9, 1.2);
  const greaveGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.36, 6);
  greaveGeo.translate(0, -0.58, 0.02);

  const footGeo = new THREE.BoxGeometry(0.30, 0.18, 0.36);
  footGeo.translate(0, -0.76, 0.04);
  const toeCapGeo = new THREE.BoxGeometry(0.28, 0.12, 0.16);
  toeCapGeo.translate(0, -0.79, 0.17);
  const soleGeo = new THREE.BoxGeometry(0.32, 0.04, 0.40);
  soleGeo.translate(0, -0.86, 0.04);

  // Cape
  const capeGeo = new THREE.PlaneGeometry(0.70, 1.25, 3, 4);

  cachedGeometries = {
    headGeo,
    helmetDomeGeo,
    helmetCrownGeo,
    visorHorizGeo,
    visorVertGeo,
    browRimGeo,
    plumeBaseGeo,
    plumeSeg1Geo,
    plumeSeg2Geo,
    plumeSeg3Geo,
    plumeSeg4Geo,
    gorgetGeo,
    gorgetInnerGeo,
    torsoGeo,
    chestplateLeftGeo,
    chestplateRightGeo,
    chestRimGeo,
    beltGeo,
    buckleGeo,
    tabardGeo,
    tassetPlateGeo,
    tassetRimGeo,
    pauldronMainGeo,
    pauldronRimGeo,
    pauldronUnderGeo,
    armUpperGeo,
    elbowCopGeo,
    gauntletGeo,
    wristCuffGeo,
    handGeo,
    bladeGeo,
    bladeFullerGeo,
    crossguardGeo,
    crossguardTipGeo,
    gripGeo,
    pommelGeo,
    shieldFaceGeo: faceGeo,
    shieldRimGeo: rimGeo,
    thighGeo,
    cuisseGeo,
    kneeCopGeo,
    greaveGeo,
    footGeo,
    toeCapGeo,
    soleGeo,
    capeGeo,
  };

  return cachedGeometries;
}

/**
 * ============================================================================
 * HEROIC LOW-POLY MODULAR KNIGHT MESH BUILDER
 * ============================================================================
 * Membangun model 3D Ksatria low-poly bersudut (angular & faceted) dengan
 * proporsi heroik sesuai referensi visual gambar kanan.
 */
export function createHeroicKnightMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'warrior';

  const mats = getKnightMaterials(tier);
  const geos = getKnightGeometries();

  // --------------------------------------------------------------------------
  // 1. Torso, Gambeson & Keel-Ridged Chestplate
  // --------------------------------------------------------------------------
  const body = new THREE.Mesh(geos.torsoGeo, mats.royalBlue);
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // Angular Keel-Ridged Breastplate (Left & Right plates meeting at sharp prow)
  const chestLeft = new THREE.Mesh(geos.chestplateLeftGeo, mats.steel);
  chestLeft.position.set(0, 1.46, 0.08);
  chestLeft.rotation.y = 0.16;
  chestLeft.castShadow = true;

  const chestRight = new THREE.Mesh(geos.chestplateRightGeo, mats.steel);
  chestRight.position.set(0, 1.46, 0.08);
  chestRight.rotation.y = -0.16;
  chestRight.castShadow = true;

  // Gold Chevron Rim along lower chestplate
  const chestRim = new THREE.Mesh(geos.chestRimGeo, mats.gold);
  chestRim.position.set(0, 1.20, 0.04);
  chestRim.castShadow = true;

  group.add(chestLeft, chestRight, chestRim);

  // Gorget / Collar Neck Armor
  const gorgetInner = new THREE.Mesh(geos.gorgetInnerGeo, mats.royalBlue);
  gorgetInner.position.set(0, 1.76, 0);
  const gorget = new THREE.Mesh(geos.gorgetGeo, mats.gold);
  gorget.position.set(0, 1.76, 0);
  gorget.castShadow = true;
  group.add(gorgetInner, gorget);

  // Belt & Gold Rectangular Buckle
  const belt = new THREE.Mesh(geos.beltGeo, mats.leather);
  belt.position.y = 0.98;
  const buckle = new THREE.Mesh(geos.buckleGeo, mats.gold);
  buckle.position.set(0, 0.98, 0);
  buckle.castShadow = true;
  group.add(belt, buckle);

  // Royal Blue Tabard (front drape)
  const tabard = new THREE.Mesh(geos.tabardGeo, mats.royalBlue);
  tabard.position.set(0, 0.92, 0.23);
  tabard.rotation.x = 0.08;
  tabard.castShadow = true;
  group.add(tabard);

  // Side Flared Tassets (Left & Right Hip Armor)
  const leftTasset = new THREE.Group();
  leftTasset.position.set(0.38, 0.94, 0.02);
  leftTasset.rotation.set(0.10, 0, -0.32);
  const leftTassetMesh = new THREE.Mesh(geos.tassetPlateGeo, mats.steel);
  leftTassetMesh.castShadow = true;
  const leftTassetRim = new THREE.Mesh(geos.tassetRimGeo, mats.gold);
  leftTassetRim.position.set(0, -0.34, 0.01);
  leftTasset.add(leftTassetMesh, leftTassetRim);

  const rightTasset = new THREE.Group();
  rightTasset.position.set(-0.38, 0.94, 0.02);
  rightTasset.rotation.set(0.10, 0, 0.32);
  const rightTassetMesh = new THREE.Mesh(geos.tassetPlateGeo, mats.steel);
  rightTassetMesh.castShadow = true;
  const rightTassetRim = new THREE.Mesh(geos.tassetRimGeo, mats.gold);
  rightTassetRim.position.set(0, -0.34, 0.01);
  rightTasset.add(rightTassetMesh, rightTassetRim);

  group.add(leftTasset, rightTasset);

  // --------------------------------------------------------------------------
  // 2. Head, Faceted Helmet, T-Visor & Curving Red Plume
  // --------------------------------------------------------------------------
  const head = new THREE.Mesh(geos.headGeo, mats.skinMat);
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);

  // Angular Faceted Knight Helmet
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 2.12, 0);

  const helmetDome = new THREE.Mesh(geos.helmetDomeGeo, mats.steel);
  helmetDome.castShadow = true;
  const helmetCrown = new THREE.Mesh(geos.helmetCrownGeo, mats.steel);
  helmetCrown.castShadow = true;
  helmetGroup.add(helmetDome, helmetCrown);

  // Gold Brow Accent Rim
  const browRim = new THREE.Mesh(geos.browRimGeo, mats.gold);
  browRim.position.set(0, 0.04, 0.26);
  helmetGroup.add(browRim);

  // Signature T-Shaped Dark Visor Slit
  const visorHoriz = new THREE.Mesh(geos.visorHorizGeo, mats.visorMat);
  visorHoriz.position.set(0, -0.02, 0.27);
  const visorVert = new THREE.Mesh(geos.visorVertGeo, mats.visorMat);
  visorVert.position.set(0, -0.10, 0.27);
  helmetGroup.add(visorHoriz, visorVert);

  // Curving Red Plume / Crest (Jambul Merah Melengkung ke Belakang)
  const plumeGroup = new THREE.Group();
  plumeGroup.position.set(0, 0.28, 0.05);

  const plumeBase = new THREE.Mesh(geos.plumeBaseGeo, mats.gold);
  plumeGroup.add(plumeBase);

  // Segmen 1 (Arch Upward)
  const plumeSeg1 = new THREE.Mesh(geos.plumeSeg1Geo, mats.plumeRed);
  plumeSeg1.position.set(0, 0.06, 0.02);
  plumeSeg1.rotation.x = 0.26;
  plumeGroup.add(plumeSeg1);

  // Segmen 2 (Arch Apex)
  const plumeSeg2 = new THREE.Mesh(geos.plumeSeg2Geo, mats.plumeRed);
  plumeSeg2.position.set(0, 0.22, -0.08);
  plumeSeg2.rotation.x = 0.82;
  plumeGroup.add(plumeSeg2);

  // Segmen 3 (Down-curve)
  const plumeSeg3 = new THREE.Mesh(geos.plumeSeg3Geo, mats.plumeRed);
  plumeSeg3.position.set(0, 0.20, -0.26);
  plumeSeg3.rotation.x = 1.45;
  plumeGroup.add(plumeSeg3);

  // Segmen 4 (Tapered Tail Tip)
  const plumeSeg4 = new THREE.Mesh(geos.plumeSeg4Geo, mats.plumeRed);
  plumeSeg4.position.set(0, 0.06, -0.42);
  plumeSeg4.rotation.x = 2.10;
  plumeGroup.add(plumeSeg4);

  helmetGroup.add(plumeGroup);
  group.add(helmetGroup);

  // --------------------------------------------------------------------------
  // 3. Massive Heroic Pauldrons (Shoulder Armor with Flared Gold Trim)
  // --------------------------------------------------------------------------
  const pauldronScale = tier >= 4 ? 1.35 : tier >= 2 ? 1.18 : 1.0;

  const buildPauldron = (isLeft: boolean): THREE.Group => {
    const pGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    pGroup.position.set(0.53 * sign, 1.84, 0);
    pGroup.rotation.z = -0.24 * sign;
    pGroup.scale.set(pauldronScale, pauldronScale, pauldronScale);

    // Upper Flared Steel Shell
    const pMain = new THREE.Mesh(geos.pauldronMainGeo, mats.steel);
    pMain.castShadow = true;
    pMain.rotation.z = 0.15 * sign;

    // Raised Gold Flanged Rim
    const pRim = new THREE.Mesh(geos.pauldronRimGeo, mats.gold);
    pRim.position.set(0.12 * sign, 0.05, 0);
    pRim.rotation.y = isLeft ? 0 : Math.PI;

    // Lower Tier Plate
    const pUnder = new THREE.Mesh(geos.pauldronUnderGeo, mats.darkSteel);
    pUnder.position.set(0.04 * sign, -0.16, 0);
    pUnder.castShadow = true;

    pGroup.add(pMain, pRim, pUnder);

    // Tier 2+ Extra Gold Crest Spikes
    if (tier >= 2) {
      const spikeGeo = new THREE.ConeGeometry(0.07, 0.22, 4);
      const spike = new THREE.Mesh(spikeGeo, mats.gold);
      spike.position.set(0.08 * sign, 0.22, 0);
      spike.rotation.z = -0.3 * sign;
      pGroup.add(spike);
    }

    return pGroup;
  };

  const leftPauldron = buildPauldron(true);
  const rightPauldron = buildPauldron(false);
  group.add(leftPauldron, rightPauldron);

  // --------------------------------------------------------------------------
  // 4. Arms & Gauntlets (Pivot Groups at Shoulders)
  // --------------------------------------------------------------------------
  const buildArm = (isLeft: boolean): { armGroup: THREE.Group } => {
    const armGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    armGroup.position.set(0.50 * sign, 1.70, 0);

    // Upper Arm (Royal Blue Tunic Cloth)
    const upperArm = new THREE.Mesh(geos.armUpperGeo, mats.royalBlue);
    upperArm.castShadow = true;

    // Elbow Guard Plate
    const elbow = new THREE.Mesh(geos.elbowCopGeo, mats.steel);
    elbow.position.set(0, -0.36, -0.04);
    elbow.castShadow = true;

    // Forearm Gauntlet (Faceted Steel Vambrace)
    const gauntlet = new THREE.Mesh(geos.gauntletGeo, mats.steel);
    gauntlet.castShadow = true;

    // Gold Flared Wrist Cuff
    const cuff = new THREE.Mesh(geos.wristCuffGeo, mats.gold);
    cuff.castShadow = true;

    // Clenched Armored Fist / Hand
    const hand = new THREE.Mesh(geos.handGeo, mats.darkSteel);
    hand.castShadow = true;

    armGroup.add(upperArm, elbow, gauntlet, cuff, hand);
    group.add(armGroup);
    return { armGroup };
  };

  const { armGroup: leftArm } = buildArm(true);
  const { armGroup: rightArm } = buildArm(false);

  // --------------------------------------------------------------------------
  // 5. Right Hand Weapon: Heroic Low-Poly Broadsword
  // --------------------------------------------------------------------------
  const weapon = new THREE.Group();

  const blade = new THREE.Mesh(geos.bladeGeo, mats.bladeSteel);
  blade.castShadow = true;

  const fuller = new THREE.Mesh(geos.bladeFullerGeo, mats.gold);
  fuller.castShadow = true;

  const crossguard = new THREE.Mesh(geos.crossguardGeo, mats.gold);
  crossguard.castShadow = true;

  const grip = new THREE.Mesh(geos.gripGeo, mats.leather);
  const pommel = new THREE.Mesh(geos.pommelGeo, mats.gold);
  pommel.castShadow = true;

  weapon.add(blade, fuller, crossguard, grip, pommel);
  weapon.position.set(0, -0.66, 0.15);
  weapon.rotation.x = Math.PI / 4;
  rightArm.add(weapon);

  // --------------------------------------------------------------------------
  // 6. Left Arm Shield: Large Low-Poly Heater / Kite Shield
  // --------------------------------------------------------------------------
  const shield = new THREE.Mesh(geos.shieldFaceGeo, mats.shieldFace);
  shield.castShadow = true;

  const shieldRim = new THREE.Mesh(geos.shieldRimGeo, mats.gold);
  shieldRim.position.z = 0.01;
  shieldRim.castShadow = true;
  shield.add(shieldRim);

  // Shield mount position on left forearm
  shield.position.set(0.18, -0.38, 0.18);
  shield.rotation.set(0, -0.15, 0.12);
  leftArm.add(shield);

  // --------------------------------------------------------------------------
  // 7. Cape (Back)
  // --------------------------------------------------------------------------
  const cape = new THREE.Mesh(geos.capeGeo, mats.capeMat);
  cape.position.set(0, 1.40, -0.25);
  cape.rotation.x = 0.12;
  cape.castShadow = true;
  group.add(cape);

  // --------------------------------------------------------------------------
  // 8. Legs, Knee Cops (Poleyns) & Heavy Sabatons
  // --------------------------------------------------------------------------
  const buildLeg = (posX: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(posX, 0.88, 0);

    // Thigh (Royal Blue Pants) + Cuisse Armor Plate
    const thigh = new THREE.Mesh(geos.thighGeo, mats.royalBlue);
    thigh.castShadow = true;
    const cuisse = new THREE.Mesh(geos.cuisseGeo, mats.steel);
    cuisse.castShadow = true;
    leg.add(thigh, cuisse);

    // Faceted Diamond Knee Cop (Poleyn)
    const knee = new THREE.Mesh(geos.kneeCopGeo, mats.steel);
    knee.position.set(0, -0.42, 0.12);
    knee.castShadow = true;
    leg.add(knee);

    // Shin Greave
    const shin = new THREE.Mesh(geos.greaveGeo, mats.steel);
    shin.castShadow = true;
    leg.add(shin);

    // Sabaton Armored Boot (Anatomically Grounded flush at y = 0.0)
    const foot = new THREE.Mesh(geos.footGeo, mats.steel);
    foot.castShadow = true;
    const toe = new THREE.Mesh(geos.toeCapGeo, mats.steel);
    toe.castShadow = true;
    const sole = new THREE.Mesh(geos.soleGeo, mats.soleMat);
    sole.receiveShadow = true;
    leg.add(foot, toe, sole);

    group.add(leg);
    return leg;
  };

  const leftLeg = buildLeg(0.22);
  const rightLeg = buildLeg(-0.22);

  // --------------------------------------------------------------------------
  // 9. Tier 3+ Legendary Celestial FX (Wings, Halos, Orbs, Auras)
  // --------------------------------------------------------------------------
  let wings: THREE.Group | undefined;
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  const orbitingOrbs: THREE.Mesh[] = [];
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  if (tier >= 3) {
    const haloColor = tier >= 6 ? 0xfff066 : 0xffd700;
    const haloRadius = tier >= 5 ? 0.44 : 0.36;
    const haloGeo = new THREE.TorusGeometry(haloRadius, 0.03, 6, 24);
    haloGeo.rotateX(Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({ color: haloColor });
    halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, 2.76, 0);
    group.add(halo);

    if (tier >= 5) {
      const halo2Geo = new THREE.TorusGeometry(0.56, 0.02, 6, 32);
      halo2Geo.rotateX(Math.PI / 2);
      halo2 = new THREE.Mesh(halo2Geo, haloMat);
      halo2.position.set(0, 2.88, 0);
      group.add(halo2);
    }

    // Wings
    wings = new THREE.Group();
    const wingSpanScale = tier >= 6 ? 1.5 : tier >= 5 ? 1.25 : 1.0;
    wings.position.set(0, 1.62, -0.28);

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
