import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * CONFIGURATION & SAFETY ROLLBACK TOGGLE
 * ============================================================================
 * Jika USE_LEGACY_KNIGHT bernilai true: Game akan menggunakan model kotak-kotak lama.
 * Jika USE_LEGACY_KNIGHT bernilai false: Game menggunakan model Blocky Faceted Low-Poly baru.
 */
export const USE_LEGACY_KNIGHT = false;
export { createLegacyKnightMesh } from './KnightModelLegacy';

/**
 * ============================================================================
 * PRELOADED GEOMETRY & MATERIAL PALETTE (Zero-Lag & Object Pooling)
 * ============================================================================
 * Mengacu persis pada lembar turnaround 5-sudut Blocky Faceted Low-Poly Knight
 * (Front, Back, Left, Right, 3/4 View).
 */

interface BlockyKnightMaterialPalette {
  helmetMat: THREE.MeshStandardMaterial; // #4A4E57
  goldTrimMat: THREE.MeshStandardMaterial; // #D4A017
  visorDarkMat: THREE.MeshBasicMaterial; // #1A1A1D
  crestRedMat: THREE.MeshLambertMaterial; // #D32F2F
  royalBlueMat: THREE.MeshLambertMaterial; // #1953A6
  capeRedMat: THREE.MeshLambertMaterial; // #8B1E1E
  leatherBrownMat: THREE.MeshLambertMaterial; // #4A2E18
  woodCrossguardMat: THREE.MeshLambertMaterial; // #7A4B28
  pauldronWhiteMat: THREE.MeshStandardMaterial; // #E0E0E0
  gauntletGrayMat: THREE.MeshStandardMaterial; // #6C757D
  legDarkGrayMat: THREE.MeshStandardMaterial; // #4A4E57
  bootDarkMat: THREE.MeshStandardMaterial; // #2C3038
  soleMat: THREE.MeshStandardMaterial; // #1F242B
  bladeSilverMat: THREE.MeshStandardMaterial; // #A8B2C1
  shieldDarkMat: THREE.MeshStandardMaterial; // #1F2428
  skinMat: THREE.MeshLambertMaterial; // #FFD180
}

let cachedMaterials: BlockyKnightMaterialPalette | null = null;

function getKnightMaterials(tier: number): BlockyKnightMaterialPalette {
  if (!cachedMaterials) {
    cachedMaterials = {
      // 1. Helm abu-abu gelap
      helmetMat: new THREE.MeshStandardMaterial({
        color: 0x4A4E57,
        metalness: 0.65,
        roughness: 0.35,
        flatShading: true,
      }),
      // 2. Lis Emas/Kuning pekat (#D4A017)
      goldTrimMat: new THREE.MeshStandardMaterial({
        color: 0xD4A017,
        metalness: 0.85,
        roughness: 0.25,
        emissive: 0x996B08,
        emissiveIntensity: 0.20,
        flatShading: true,
      }),
      // 3. Celah Kisi-kisi Visor Hitam pekat (#1A1A1D)
      visorDarkMat: new THREE.MeshBasicMaterial({
        color: 0x1A1A1D,
      }),
      // 4. Jambul Merah Menyala (#D32F2F)
      crestRedMat: new THREE.MeshLambertMaterial({
        color: 0xD32F2F,
        flatShading: true,
      }),
      // 5. Biru Kerajaan Torso & Tassets (#1953A6)
      royalBlueMat: new THREE.MeshLambertMaterial({
        color: 0x1953A6,
        flatShading: true,
      }),
      // 6. Jubah Merah Tua Menjuntai (#8B1E1E)
      capeRedMat: new THREE.MeshLambertMaterial({
        color: 0x8B1E1E,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      // 7. Sabuk Cokelat Tua (#4A2E18)
      leatherBrownMat: new THREE.MeshLambertMaterial({
        color: 0x4A2E18,
        flatShading: true,
      }),
      // 8. Crossguard Kayu Cokelat (#7A4B28)
      woodCrossguardMat: new THREE.MeshLambertMaterial({
        color: 0x7A4B28,
        flatShading: true,
      }),
      // 9. Pauldron Putih-Perak (#E0E0E0)
      pauldronWhiteMat: new THREE.MeshStandardMaterial({
        color: 0xE0E0E0,
        metalness: 0.55,
        roughness: 0.30,
        flatShading: true,
      }),
      // 10. Sarung Tangan & Lutut Abu-abu (#6C757D)
      gauntletGrayMat: new THREE.MeshStandardMaterial({
        color: 0x6C757D,
        metalness: 0.65,
        roughness: 0.35,
        flatShading: true,
      }),
      // 11. Kaki Abu-abu Gelap (#4A4E57)
      legDarkGrayMat: new THREE.MeshStandardMaterial({
        color: 0x4A4E57,
        metalness: 0.60,
        roughness: 0.40,
        flatShading: true,
      }),
      // 12. Boot Gelap (#2C3038)
      bootDarkMat: new THREE.MeshStandardMaterial({
        color: 0x2C3038,
        roughness: 0.75,
        metalness: 0.25,
        flatShading: true,
      }),
      soleMat: new THREE.MeshStandardMaterial({
        color: 0x1F242B,
        roughness: 0.90,
        metalness: 0.10,
        flatShading: true,
      }),
      // 13. Bilah Pedang Silver (#A8B2C1)
      bladeSilverMat: new THREE.MeshStandardMaterial({
        color: 0xA8B2C1,
        metalness: 0.90,
        roughness: 0.20,
        flatShading: true,
      }),
      // 14. Perisai Hitam/Graphite (#1F2428)
      shieldDarkMat: new THREE.MeshStandardMaterial({
        color: 0x1F2428,
        metalness: 0.70,
        roughness: 0.35,
        flatShading: true,
      }),
      skinMat: new THREE.MeshLambertMaterial({
        color: 0xFFD180,
        flatShading: true,
      }),
    };
  }

  // Tier 3+ Gilded Armor enhancement
  if (tier >= 3) {
    cachedMaterials.helmetMat.color.setHex(0xFFEA00);
    cachedMaterials.helmetMat.emissive.setHex(tier >= 4 ? 0xFFD700 : 0xFFA000);
    cachedMaterials.helmetMat.emissiveIntensity = tier >= 4 ? 0.6 : 0.35;
    cachedMaterials.goldTrimMat.emissiveIntensity = 0.5;
  } else {
    cachedMaterials.helmetMat.color.setHex(0x4A4E57);
    cachedMaterials.helmetMat.emissive.setHex(0x000000);
    cachedMaterials.helmetMat.emissiveIntensity = 0;
    cachedMaterials.goldTrimMat.emissiveIntensity = 0.20;
  }

  return cachedMaterials;
}

// 2. Preloaded Geometries Cache
interface BlockyKnightGeometryPalette {
  headGeo: THREE.BufferGeometry;
  neckCollarGeo: THREE.BufferGeometry;
  helmetCraniumGeo: THREE.BufferGeometry;
  visorBrowGeo: THREE.BufferGeometry;
  visorLowerBarGeo: THREE.BufferGeometry;
  visorSideBracketGeo: THREE.BufferGeometry;
  visorEyeSlitGeo: THREE.BufferGeometry;
  visorGrilleBackingGeo: THREE.BufferGeometry;
  visorGrilleBarGeo: THREE.BufferGeometry;
  visorChinGoldGeo: THREE.BufferGeometry;
  // Jambul Bertingkat (Stepped Comb Fins)
  crestMountGeo: THREE.BufferGeometry;
  crestFin1Geo: THREE.BufferGeometry;
  crestFin2Geo: THREE.BufferGeometry;
  crestFin3Geo: THREE.BufferGeometry;
  crestFin4Geo: THREE.BufferGeometry;
  crestFin5Geo: THREE.BufferGeometry;
  crestFin6Geo: THREE.BufferGeometry;
  // Torso, Tassets & Sabuk
  torsoChestGeo: THREE.BufferGeometry;
  torsoTassetsGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  capeGeo: THREE.BufferGeometry;
  // Pauldrons (Pundak Putih Lis Emas)
  pauldronDomeGeo: THREE.BufferGeometry;
  pauldronRimGeo: THREE.BufferGeometry;
  // Lengan & Gauntlet
  armUpperGeo: THREE.BufferGeometry;
  gauntletGeo: THREE.BufferGeometry;
  wristGoldGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  // Kaki & Boots
  thighGeo: THREE.BufferGeometry;
  kneeBandGeo: THREE.BufferGeometry;
  shinGeo: THREE.BufferGeometry;
  bootAnkleGeo: THREE.BufferGeometry;
  bootToeGeo: THREE.BufferGeometry;
  bootSoleGeo: THREE.BufferGeometry;
  // Senjata
  bladeGeo: THREE.BufferGeometry;
  bladeTipGeo: THREE.BufferGeometry;
  bladeFullerGeo: THREE.BufferGeometry;
  crossguardGeo: THREE.BufferGeometry;
  gripGeo: THREE.BufferGeometry;
  pommelGeo: THREE.BufferGeometry;
  // Perisai
  shieldFaceGeo: THREE.BufferGeometry;
  shieldRimGeo: THREE.BufferGeometry;
  shieldDiamondGeo: THREE.BufferGeometry;
  shieldGripGeo: THREE.BufferGeometry;
}

let cachedGeometries: BlockyKnightGeometryPalette | null = null;

function createBlockyShieldGeometries(): { faceGeo: THREE.BufferGeometry; rimGeo: THREE.BufferGeometry; diamondGeo: THREE.BufferGeometry } {
  // Shape heater/kite shield bersudut tegas
  const shape = new THREE.Shape();
  const w = 0.31;
  const topY = 0.44;
  const bottomY = -0.46;

  shape.moveTo(0, bottomY);
  shape.lineTo(-w * 0.92, -0.05);
  shape.lineTo(-w, topY * 0.7);
  shape.lineTo(-w * 0.86, topY);
  shape.lineTo(0, topY * 0.96);
  shape.lineTo(w * 0.86, topY);
  shape.lineTo(w, topY * 0.7);
  shape.lineTo(w * 0.92, -0.05);
  shape.closePath();

  const faceGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: false,
  });
  faceGeo.center();

  // Raised gold outer border/rim
  const rimShape = new THREE.Shape();
  const rw = w * 1.08;
  const rTopY = topY * 1.06;
  const rBottomY = bottomY * 1.08;

  rimShape.moveTo(0, rBottomY);
  rimShape.lineTo(-rw * 0.92, -0.05);
  rimShape.lineTo(-rw, rTopY * 0.7);
  rimShape.lineTo(-rw * 0.86, rTopY);
  rimShape.lineTo(0, rTopY * 0.96);
  rimShape.lineTo(rw * 0.86, rTopY);
  rimShape.lineTo(rw, rTopY * 0.7);
  rimShape.lineTo(rw * 0.92, -0.05);
  rimShape.closePath();

  const rimHole = new THREE.Path();
  const hw = w * 0.88;
  rimHole.moveTo(0, bottomY * 0.92);
  rimHole.lineTo(hw * 0.92, -0.05);
  rimHole.lineTo(hw, topY * 0.68);
  rimHole.lineTo(hw * 0.86, topY * 0.94);
  rimHole.lineTo(0, topY * 0.90);
  rimHole.lineTo(-hw * 0.86, topY * 0.94);
  rimHole.lineTo(-hw, topY * 0.68);
  rimHole.lineTo(-hw * 0.92, -0.05);
  rimHole.closePath();
  rimShape.holes.push(rimHole);

  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: 0.065,
    bevelEnabled: false,
  });
  rimGeo.center();

  // Diamond / Belah ketupat emas di tengah perisai
  const diamondGeo = new THREE.OctahedronGeometry(0.11, 0);
  diamondGeo.scale(1.0, 1.6, 0.45);

  return { faceGeo, rimGeo, diamondGeo };
}

function getKnightGeometries(): BlockyKnightGeometryPalette {
  if (cachedGeometries) return cachedGeometries;

  const { faceGeo: shieldFaceGeo, rimGeo: shieldRimGeo, diamondGeo: shieldDiamondGeo } = createBlockyShieldGeometries();

  // 1. Head & Helm
  const headGeo = new THREE.BoxGeometry(0.40, 0.40, 0.40);
  const neckCollarGeo = new THREE.CylinderGeometry(0.24, 0.27, 0.12, 8);
  const helmetCraniumGeo = new THREE.BoxGeometry(0.48, 0.50, 0.48);

  const visorBrowGeo = new THREE.BoxGeometry(0.52, 0.055, 0.08);
  const visorLowerBarGeo = new THREE.BoxGeometry(0.52, 0.045, 0.08);
  const visorSideBracketGeo = new THREE.BoxGeometry(0.065, 0.16, 0.26);

  const visorEyeSlitGeo = new THREE.BoxGeometry(0.42, 0.055, 0.06);
  const visorGrilleBackingGeo = new THREE.BoxGeometry(0.32, 0.13, 0.08);
  const visorGrilleBarGeo = new THREE.BoxGeometry(0.04, 0.13, 0.09);
  const visorChinGoldGeo = new THREE.BoxGeometry(0.42, 0.045, 0.09);

  // Jambul Bertingkat (Stepped Comb Fins)
  const crestMountGeo = new THREE.BoxGeometry(0.09, 0.05, 0.44);
  const crestFin1Geo = new THREE.BoxGeometry(0.08, 0.22, 0.07);
  const crestFin2Geo = new THREE.BoxGeometry(0.08, 0.27, 0.07);
  const crestFin3Geo = new THREE.BoxGeometry(0.08, 0.32, 0.07);
  const crestFin4Geo = new THREE.BoxGeometry(0.08, 0.30, 0.07);
  const crestFin5Geo = new THREE.BoxGeometry(0.08, 0.25, 0.07);
  const crestFin6Geo = new THREE.BoxGeometry(0.08, 0.19, 0.07);

  // 2. Torso, Tassets & Sabuk
  const torsoChestGeo = new THREE.BoxGeometry(0.66, 0.54, 0.42);
  const torsoTassetsGeo = new THREE.BoxGeometry(0.68, 0.28, 0.44);
  const beltGeo = new THREE.BoxGeometry(0.70, 0.10, 0.46);
  const buckleGeo = new THREE.BoxGeometry(0.18, 0.14, 0.50);
  const capeGeo = new THREE.PlaneGeometry(0.64, 1.25, 2, 3);
  capeGeo.translate(0, -0.625, 0); // Anchor pivot at the top edge of the cape

  // 3. Pauldrons (Pundak Putih Lis Emas Kubik Bersudut)
  // Kubah putih bersudut (CylinderGeometry 6-segmen miring)
  const pauldronDomeGeo = new THREE.CylinderGeometry(0.20, 0.30, 0.24, 6);
  pauldronDomeGeo.scale(1.15, 0.90, 1.25);

  const pauldronRimGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.06, 6);
  pauldronRimGeo.scale(1.18, 1.0, 1.28);

  // 4. Lengan & Gauntlet
  const armUpperGeo = new THREE.BoxGeometry(0.22, 0.32, 0.22);
  armUpperGeo.translate(0, -0.16, 0);
  const gauntletGeo = new THREE.BoxGeometry(0.24, 0.34, 0.24);
  const wristGoldGeo = new THREE.BoxGeometry(0.25, 0.06, 0.25);
  wristGoldGeo.translate(0, -0.14, 0);
  const handGeo = new THREE.BoxGeometry(0.18, 0.16, 0.18);

  // 5. Kaki & Boots
  const thighGeo = new THREE.BoxGeometry(0.24, 0.36, 0.24);
  thighGeo.translate(0, -0.18, 0);
  const kneeBandGeo = new THREE.BoxGeometry(0.28, 0.10, 0.28);
  kneeBandGeo.translate(0, -0.38, 0.01);
  const shinGeo = new THREE.BoxGeometry(0.24, 0.30, 0.24);
  shinGeo.translate(0, -0.54, 0);

  const bootAnkleGeo = new THREE.BoxGeometry(0.28, 0.16, 0.32);
  bootAnkleGeo.translate(0, -0.74, 0.02);
  const bootToeGeo = new THREE.BoxGeometry(0.26, 0.12, 0.14);
  bootToeGeo.translate(0, -0.78, 0.16);
  const bootSoleGeo = new THREE.BoxGeometry(0.29, 0.04, 0.38);
  bootSoleGeo.translate(0, -0.86, 0.04);

  // 6. Broadsword (Flat uniform thickness 0.04 with angled chisel tip, pivot centered at grip)
  const gripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6);
  const crossguardGeo = new THREE.BoxGeometry(0.48, 0.10, 0.10);
  crossguardGeo.translate(0, 0.14, 0);
  const pommelGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  pommelGeo.translate(0, -0.18, 0);

  const bladeGeo = new THREE.BoxGeometry(0.15, 1.15, 0.04);
  bladeGeo.translate(0, 0.765, 0);

  // Broadsword flat chisel point (replaces 3D cone to eliminate arrowhead bug)
  const tipShape = new THREE.Shape();
  const halfBladeW = 0.075;
  tipShape.moveTo(-halfBladeW, 0);
  tipShape.lineTo(halfBladeW, 0);
  tipShape.lineTo(halfBladeW, 0.08);
  tipShape.lineTo(0, 0.20);
  tipShape.lineTo(-halfBladeW, 0.08);
  tipShape.closePath();

  const bladeTipGeo = new THREE.ExtrudeGeometry(tipShape, {
    depth: 0.04,
    bevelEnabled: false,
  });
  // Depth matches blade depth (0.04), centered in Z (-0.02) and positioned atop blade (y = 1.34)
  bladeTipGeo.translate(0, 1.34, -0.02);

  const bladeFullerGeo = new THREE.BoxGeometry(0.035, 1.05, 0.046);
  bladeFullerGeo.translate(0, 0.77, 0);

  // Handle pegangan perisai di pergelangan tangan
  const shieldGripGeo = new THREE.BoxGeometry(0.04, 0.18, 0.04);

  cachedGeometries = {
    headGeo,
    neckCollarGeo,
    helmetCraniumGeo,
    visorBrowGeo,
    visorLowerBarGeo,
    visorSideBracketGeo,
    visorEyeSlitGeo,
    visorGrilleBackingGeo,
    visorGrilleBarGeo,
    visorChinGoldGeo,
    crestMountGeo,
    crestFin1Geo,
    crestFin2Geo,
    crestFin3Geo,
    crestFin4Geo,
    crestFin5Geo,
    crestFin6Geo,
    torsoChestGeo,
    torsoTassetsGeo,
    beltGeo,
    buckleGeo,
    capeGeo,
    pauldronDomeGeo,
    pauldronRimGeo,
    armUpperGeo,
    gauntletGeo,
    wristGoldGeo,
    handGeo,
    thighGeo,
    kneeBandGeo,
    shinGeo,
    bootAnkleGeo,
    bootToeGeo,
    bootSoleGeo,
    bladeGeo,
    bladeTipGeo,
    bladeFullerGeo,
    crossguardGeo,
    gripGeo,
    pommelGeo,
    shieldFaceGeo,
    shieldRimGeo,
    shieldDiamondGeo,
    shieldGripGeo,
  };

  return cachedGeometries;
}

/**
 * ============================================================================
 * BLOCKY FACETED LOW-POLY KNIGHT MESH BUILDER
 * ============================================================================
 * Membangun model 3D Ksatria low-poly bersudut tegas sesuai persis dengan
 * lembar referensi turnaround 5-sudut (Front, Back, Left, Right, 3/4 View).
 */
export function createHeroicKnightMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'warrior';

  const mats = getKnightMaterials(tier);
  const geos = getKnightGeometries();

  // --------------------------------------------------------------------------
  // 1. Torso, Blue Tunic, Belt & Buckle
  // --------------------------------------------------------------------------
  // Chestplate biru kerajaan (#1953A6)
  const body = new THREE.Mesh(geos.torsoChestGeo, mats.royalBlueMat);
  body.position.y = 1.48;
  body.castShadow = true;
  group.add(body);

  // Skirt paha / tassets biru kerajaan (#1953A6)
  const tassets = new THREE.Mesh(geos.torsoTassetsGeo, mats.royalBlueMat);
  tassets.position.y = 1.08;
  tassets.castShadow = true;
  group.add(tassets);

  // Sabuk kulit cokelat tua (#4A2E18)
  const belt = new THREE.Mesh(geos.beltGeo, mats.leatherBrownMat);
  belt.position.y = 1.20;
  const buckle = new THREE.Mesh(geos.buckleGeo, mats.goldTrimMat);
  buckle.position.set(0, 1.20, 0.01);
  buckle.castShadow = true;
  group.add(belt, buckle);

  // Jubah Merah Tua (#8B1E1E) menjuntai di bagian belakang luar armor
  const cape = new THREE.Mesh(geos.capeGeo, mats.capeRedMat);
  cape.position.set(0, 1.70, -0.27);
  cape.rotation.x = 0.08;
  cape.castShadow = true;
  group.add(cape);

  // --------------------------------------------------------------------------
  // 2. Head, Blocky Helmet, Gold Visor Frame & Stepped Comb Crest
  // --------------------------------------------------------------------------
  // Gorget / Collar baja gelap penutup celah antara torso dan helm
  const collar = new THREE.Mesh(geos.neckCollarGeo, mats.helmetMat);
  collar.position.set(0, 1.76, 0);
  collar.castShadow = true;
  group.add(collar);

  const head = new THREE.Mesh(geos.headGeo, mats.skinMat);
  head.position.y = 1.93;
  head.castShadow = true;
  group.add(head);

  // Group Helm Abu-abu Gelap (#4A4E57) - diturunkan Y -= 0.12 agar menempel pas di bahu
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 2.03, 0);

  const cranium = new THREE.Mesh(geos.helmetCraniumGeo, mats.helmetMat);
  cranium.castShadow = true;
  helmetGroup.add(cranium);

  // Frame Visor Persegi Panjang Emas (#D4A017)
  const visorBrow = new THREE.Mesh(geos.visorBrowGeo, mats.goldTrimMat);
  visorBrow.position.set(0, 0.08, 0.24);
  visorBrow.castShadow = true;

  const visorLowerBar = new THREE.Mesh(geos.visorLowerBarGeo, mats.goldTrimMat);
  visorLowerBar.position.set(0, -0.01, 0.24);
  visorLowerBar.castShadow = true;

  // Bracket samping emas (#D4A017) yang memeluk pelipis
  const leftBracket = new THREE.Mesh(geos.visorSideBracketGeo, mats.goldTrimMat);
  leftBracket.position.set(0.245, 0.02, 0.12);
  const rightBracket = new THREE.Mesh(geos.visorSideBracketGeo, mats.goldTrimMat);
  rightBracket.position.set(-0.245, 0.02, 0.12);
  helmetGroup.add(visorBrow, visorLowerBar, leftBracket, rightBracket);

  // Celah Mata Hitam Pekat (#1A1A1D)
  const eyeSlit = new THREE.Mesh(geos.visorEyeSlitGeo, mats.visorDarkMat);
  eyeSlit.position.set(0, 0.035, 0.25);
  helmetGroup.add(eyeSlit);

  // Kisi-kisi Vertikal Rahang Bawah (3 Gold Bars + Dark Backing)
  const grilleBacking = new THREE.Mesh(geos.visorGrilleBackingGeo, mats.visorDarkMat);
  grilleBacking.position.set(0, -0.12, 0.245);
  helmetGroup.add(grilleBacking);

  const grilleCenter = new THREE.Mesh(geos.visorGrilleBarGeo, mats.goldTrimMat);
  grilleCenter.position.set(0, -0.12, 0.255);
  const grilleLeft = new THREE.Mesh(geos.visorGrilleBarGeo, mats.goldTrimMat);
  grilleLeft.position.set(-0.09, -0.12, 0.255);
  const grilleRight = new THREE.Mesh(geos.visorGrilleBarGeo, mats.goldTrimMat);
  grilleRight.position.set(0.09, -0.12, 0.255);
  helmetGroup.add(grilleCenter, grilleLeft, grilleRight);

  const chinGold = new THREE.Mesh(geos.visorChinGoldGeo, mats.goldTrimMat);
  chinGold.position.set(0, -0.20, 0.25);
  helmetGroup.add(chinGold);

  // Jambul Merah Bertingkat (Stepped Red Crest #D32F2F)
  const crestGroup = new THREE.Group();
  crestGroup.position.set(0, 0.20, -0.02); // Dikencangkan agar menempel pas di kurva atas helm tanpa celah

  const crestMount = new THREE.Mesh(geos.crestMountGeo, mats.goldTrimMat);
  crestGroup.add(crestMount);

  // 6 Fin balok merah bertingkat fanning ke belakang mengikuti kurva kubah helm
  const fin1 = new THREE.Mesh(geos.crestFin1Geo, mats.crestRedMat);
  fin1.position.set(0, 0.08, 0.17);
  fin1.rotation.x = 0.16;

  const fin2 = new THREE.Mesh(geos.crestFin2Geo, mats.crestRedMat);
  fin2.position.set(0, 0.12, 0.10);
  fin2.rotation.x = 0.06;

  const fin3 = new THREE.Mesh(geos.crestFin3Geo, mats.crestRedMat);
  fin3.position.set(0, 0.15, 0.02);
  fin3.rotation.x = -0.06;

  const fin4 = new THREE.Mesh(geos.crestFin4Geo, mats.crestRedMat);
  fin4.position.set(0, 0.13, -0.06);
  fin4.rotation.x = -0.18;

  const fin5 = new THREE.Mesh(geos.crestFin5Geo, mats.crestRedMat);
  fin5.position.set(0, 0.09, -0.14);
  fin5.rotation.x = -0.32;

  const fin6 = new THREE.Mesh(geos.crestFin6Geo, mats.crestRedMat);
  fin6.position.set(0, 0.04, -0.21);
  fin6.rotation.x = -0.48;

  crestGroup.add(fin1, fin2, fin3, fin4, fin5, fin6);
  helmetGroup.add(crestGroup);
  group.add(helmetGroup);

  // --------------------------------------------------------------------------
  // 3. Pauldrons (Pundak Putih-Perak #E0E0E0 dengan Lis Emas #D4A017)
  // --------------------------------------------------------------------------
  const pauldronScale = tier >= 4 ? 1.30 : tier >= 2 ? 1.15 : 1.0;

  const buildPauldron = (isLeft: boolean): THREE.Group => {
    const pGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    pGroup.position.set(0.48 * sign, 1.74, 0);
    pGroup.rotation.z = -0.20 * sign;
    pGroup.scale.set(pauldronScale, pauldronScale, pauldronScale);

    // Kubah putih-perak melengkung bersudut (#E0E0E0)
    const dome = new THREE.Mesh(geos.pauldronDomeGeo, mats.pauldronWhiteMat);
    dome.castShadow = true;

    // Lis bawah emas (#D4A017)
    const rim = new THREE.Mesh(geos.pauldronRimGeo, mats.goldTrimMat);
    rim.position.set(0, -0.11, 0);
    rim.castShadow = true;

    pGroup.add(dome, rim);
    return pGroup;
  };

  const leftPauldron = buildPauldron(true);
  const rightPauldron = buildPauldron(false);
  group.add(leftPauldron, rightPauldron);

  // --------------------------------------------------------------------------
  // 4. Arms & Gauntlets (Pivot di sendi bahu y = 1.68)
  // --------------------------------------------------------------------------
  const buildArm = (isLeft: boolean): {
    armGroup: THREE.Group;
    forearmGroup: THREE.Group;
    handGroup: THREE.Group;
  } => {
    const armGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    armGroup.position.set(0.46 * sign, 1.68, 0);

    // 1. Lengan atas baju biru (#1953A6)
    const upperArm = new THREE.Mesh(geos.armUpperGeo, mats.royalBlueMat);
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    // 2. Forearm Group (Lengan bawah & Gauntlet, pivot di y = -0.46)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.46, 0);

    // Sarung tangan / gauntlet abu-abu kubik (#6C757D)
    const gauntlet = new THREE.Mesh(geos.gauntletGeo, mats.gauntletGrayMat);
    gauntlet.castShadow = true;

    // Cincin pergelangan emas (#D4A017)
    const cuff = new THREE.Mesh(geos.wristGoldGeo, mats.goldTrimMat);
    cuff.castShadow = true;

    forearmGroup.add(gauntlet, cuff);

    // 3. Hand Group (Telapak tangan / pergelangan, y = -0.20 di bawah gauntlet)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.20, 0);

    // Tangan gelap (#4A4E57)
    const hand = new THREE.Mesh(geos.handGeo, mats.legDarkGrayMat);
    hand.castShadow = true;
    handGroup.add(hand);

    forearmGroup.add(handGroup);
    armGroup.add(forearmGroup);
    group.add(armGroup);

    return { armGroup, forearmGroup, handGroup };
  };

  const { armGroup: leftArm, forearmGroup: leftForearm } = buildArm(true);
  const { armGroup: rightArm, handGroup: rightHand } = buildArm(false);

  // KOREKSI ANATOMI LENGAN (Requirement 1):
  // Simpan nilai default posisi bahu ke userData agar tidak pernah tertelan ke titik tengah dada
  leftArm.userData.defaultPos = new THREE.Vector3(0.46, 1.68, 0);
  rightArm.userData.defaultPos = new THREE.Vector3(-0.46, 1.68, 0);

  // --------------------------------------------------------------------------
  // 5. Right Hand: Broadsword (Child langsung dari rightHandGroup)
  // --------------------------------------------------------------------------
  const weapon = new THREE.Group();

  // Isolasi material khusus bilah pedang agar tidak berbagi dengan material armor/helm karakter
  const swordBladeMat = mats.bladeSilverMat.clone();
  swordBladeMat.userData.isSwordBlade = true;

  const blade = new THREE.Mesh(geos.bladeGeo, swordBladeMat);
  blade.name = 'Blade';
  blade.userData.isBlade = true;
  blade.userData.isSwordBlade = true;
  blade.castShadow = true;

  const bladeTip = new THREE.Mesh(geos.bladeTipGeo, swordBladeMat);
  bladeTip.name = 'BladeTip';
  bladeTip.userData.isBlade = true;
  bladeTip.userData.isSwordBlade = true;
  bladeTip.castShadow = true;

  const fuller = new THREE.Mesh(geos.bladeFullerGeo, mats.gauntletGrayMat);
  fuller.castShadow = true;

  const crossguard = new THREE.Mesh(geos.crossguardGeo, mats.woodCrossguardMat);
  crossguard.castShadow = true;

  const grip = new THREE.Mesh(geos.gripGeo, mats.woodCrossguardMat);
  const pommel = new THREE.Mesh(geos.pommelGeo, mats.helmetMat);
  pommel.castShadow = true;

  weapon.add(blade, bladeTip, fuller, crossguard, grip, pommel);

  // Pivot gagang (hilt) tepat di telapak tangan kanan dengan rotasi menghadap santai ke samping paha
  weapon.position.set(0, -0.05, 0.02);
  weapon.rotation.set(1.45, 0, 0.1);
  rightHand.add(weapon);

  // --------------------------------------------------------------------------
  // 6. Left Hand: Kite Shield (Child langsung dari leftForearmGroup)
  // --------------------------------------------------------------------------
  const shield = new THREE.Mesh(geos.shieldFaceGeo, mats.shieldDarkMat);
  shield.castShadow = true;

  // Bingkai emas tebal timbul di sekeliling perisai
  const shieldRim = new THREE.Mesh(geos.shieldRimGeo, mats.goldTrimMat);
  shieldRim.position.z = 0.015;
  shieldRim.castShadow = true;
  shield.add(shieldRim);

  // Emblem Belah Ketupat (Diamond) Emas di tengah perisai
  const diamondBoss = new THREE.Mesh(geos.shieldDiamondGeo, mats.goldTrimMat);
  diamondBoss.position.set(0, 0.06, 0.035);
  diamondBoss.castShadow = true;
  shield.add(diamondBoss);

  // Pegangan / grip kulit di belakang perisai sejajar dengan pergelangan tangan
  const shieldGrip = new THREE.Mesh(geos.shieldGripGeo, mats.leatherBrownMat);
  shieldGrip.position.set(0, 0, -0.02);
  shieldGrip.castShadow = true;
  shield.add(shieldGrip);

  // KOREKSI POSISI PERISAI (Requirement 3):
  // Group perisai dipasang di sisi luar lengan kiri: offset (0.14, -0.10, 0.02)
  const shieldGroup = new THREE.Group();
  shieldGroup.add(shield);
  shieldGroup.position.set(0.14, -0.10, 0.02);
  shieldGroup.rotation.set(0, Math.PI / 2, 0);
  shield.scale.set(1, 1, 1);
  shield.visible = true;
  leftForearm.add(shieldGroup);

  // --------------------------------------------------------------------------
  // 7. Legs & Boots (Heroic Stance, Pivot di paha y = 0.88, Sol rata y = 0.00)
  // --------------------------------------------------------------------------
  const buildLeg = (posX: number, isLeft: boolean): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(posX, 0.88, 0);

    // Stance terbuka heroik
    const sign = isLeft ? 1 : -1;
    leg.rotation.z = -0.04 * sign;
    leg.rotation.y = 0.08 * sign;

    // Paha abu-abu gelap (#4A4E57)
    const thigh = new THREE.Mesh(geos.thighGeo, mats.legDarkGrayMat);
    thigh.castShadow = true;
    leg.add(thigh);

    // Band pelindung lutut abu-abu terang (#6C757D)
    const knee = new THREE.Mesh(geos.kneeBandGeo, mats.gauntletGrayMat);
    knee.castShadow = true;
    leg.add(knee);

    // Betis abu-abu gelap (#4A4E57)
    const shin = new THREE.Mesh(geos.shinGeo, mats.legDarkGrayMat);
    shin.castShadow = true;
    leg.add(shin);

    // Boots blok bertegas datar di bagian bawah (#2C3038 & #1F242B)
    const foot = new THREE.Mesh(geos.bootAnkleGeo, mats.bootDarkMat);
    foot.castShadow = true;
    const toe = new THREE.Mesh(geos.bootToeGeo, mats.bootDarkMat);
    toe.castShadow = true;
    const sole = new THREE.Mesh(geos.bootSoleGeo, mats.soleMat);
    sole.receiveShadow = true;
    leg.add(foot, toe, sole);

    group.add(leg);
    return leg;
  };

  const leftLeg = buildLeg(0.20, true);
  const rightLeg = buildLeg(-0.20, false);

  // --------------------------------------------------------------------------
  // 8. Tier 3+ Legendary Celestial FX (Wings, Halos, Orbs, Auras)
  // --------------------------------------------------------------------------
  let wings: THREE.Group | undefined;
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  const orbitingOrbs: THREE.Mesh[] = [];
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  if (tier >= 3) {
    const haloColor = tier >= 6 ? 0xFFF066 : 0xFFD700;
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
      color: tier >= 6 ? 0xFFFBEB : 0xFFEA00,
      emissive: tier >= 6 ? 0xFACC15 : 0xFFB300,
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
    const orbColors = [0xFBBF24, 0xF59E0B, 0xFFEA00, 0xFFD700, 0xFFFFFF, 0xF97316];
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
      color: 0xF59E0B,
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
        color: tier >= 6 ? 0xFFFFFF : 0xF59E0B,
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
    leftForearm,
    rightHand,
    leftLeg,
    rightLeg,
    weapon,
    shield,
    shieldGroup,
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

/**
 * ============================================================================
 * SMOOTH KNIGHT WALK ANIMATION
 * ============================================================================
 * Menghaluskan animasi jalan Ksatria:
 * - Siklus frekuensi langkah seimbang (walkTime = clock.getElapsedTime() * 6)
 * - Ayunan kaki sinusoidal halus (+/- 0.45)
 * - Ayunan lengan stabil (lengan perisai -0.25, lengan pedang +0.4)
 * - Hip sway (kemiringan rotasi Z 0.03) dan body bobbing alami (naik-turun Y 0.05)
 */
export function animateKnightWalk(
  playerMesh: PlayerMeshObjects,
  walkTime: number,
  playerPosY: number,
  isAttacking: boolean = false
): void {
  // 1. Leg Swing: Kurva Math.sin() seimbang untuk langkah luwes
  const targetLeftLeg = Math.sin(walkTime) * 0.45;
  const targetRightLeg = -Math.sin(walkTime) * 0.45;
  playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, targetLeftLeg, 0.2);
  playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, targetRightLeg, 0.2);

  // 2. Arm Swing: HANYA jika TIDAK sedang dalam status isAttacking atau isChargingAttack (Requirement 2.2)
  if (!isAttacking) {
    // Pastikan posisi bahu tetap di defaultPos (0.46, 1.68, 0) & (-0.46, 1.68, 0) saat walk
    playerMesh.leftArm.position.copy(playerMesh.leftArm.userData.defaultPos || new THREE.Vector3(0.46, 1.68, 0));
    playerMesh.rightArm.position.copy(playerMesh.rightArm.userData.defaultPos || new THREE.Vector3(-0.46, 1.68, 0));

    const targetLeftArmX = -Math.sin(walkTime) * 0.25;
    const targetRightArmX = Math.sin(walkTime) * 0.4;
    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, targetLeftArmX, 0.2);
    playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.25, 0.2);
    playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.18, 0.2);

    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, targetRightArmX, 0.2);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.10, 0.2);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.20, 0.2);

    playerMesh.weapon.position.set(0, -0.05, 0.02);
    playerMesh.weapon.rotation.set(1.45, 0, 0.1);
  }

  // 3. Hip Sway & Body Bobbing alami
  const walkBob = Math.abs(Math.sin(walkTime * 2)) * 0.05;
  playerMesh.group.position.y = playerPosY + walkBob;
  // Kunci stabilitas tegak (Requirement 4.1): Badan tetap tegak lurus tanpa roll/kemiringan goyang
  playerMesh.group.rotation.x = 0;
  playerMesh.group.rotation.z = 0;
  playerMesh.body.rotation.x = 0;
  playerMesh.body.rotation.z = 0;
}

/**
 * Sets emissive glow on the Knight's broadsword blade during charge attack.
 * HANYA bilah pedang (Blade / BladeTip) yang berpendar, tubuh karakter tetap warna asli.
 */
export function setKnightBladeGlow(
  playerMesh: PlayerMeshObjects,
  intensity: number,
  colorHex: number = 0xffaa00
): void {
  if (!playerMesh || !playerMesh.weapon) return;
  playerMesh.weapon.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      (child.userData.isBlade || child.userData.isSwordBlade || (child.material as any)?.userData?.isSwordBlade) &&
      child.material
    ) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (mat.isMeshStandardMaterial) {
        if (mat.userData.origEmissive === undefined) {
          mat.userData.origEmissive = mat.emissive.getHex();
          mat.userData.origIntensity = mat.emissiveIntensity;
        }
        mat.emissive.setHex(colorHex);
        mat.emissiveIntensity = intensity;
      }
    }
  });
}

/**
 * Resets emissive glow on the Knight's broadsword blade.
 */
export function resetKnightBladeGlow(playerMesh: PlayerMeshObjects): void {
  if (!playerMesh || !playerMesh.weapon) return;
  playerMesh.weapon.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      (child.userData.isBlade || child.userData.isSwordBlade || (child.material as any)?.userData?.isSwordBlade) &&
      child.material
    ) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (mat.isMeshStandardMaterial && mat.userData.origEmissive !== undefined) {
        mat.emissive.setHex(mat.userData.origEmissive);
        mat.emissiveIntensity = mat.userData.origIntensity ?? 0;
      }
    }
  });
}

export interface KnightCombatAnimContext {
  attackType: string | null;
  progress: number; // 1.0 (start) -> 0.0 (end)
  attackDuration?: number;
  attackTimer?: number;
  isCharging?: boolean;
  chargeTimer?: number;
  delta?: number;
}

/**
 * Helper interpolasi kinematika ayunan 3 fase:
 * - Wind-up (0.0 - 0.25): Ancang-ancang menarik senjata ke belakang
 * - Strike (0.25 - 0.70): Tebasan cepat berkecepatan tinggi dengan easeOut kubik
 * - Recovery (0.70 - 1.0): Follow-through melambat kembali ke pose siap tempur
 */
function interpolateStrikeTrajectory(
  t: number,
  pStart: { armX: number; armY: number; armZ: number; bodyY: number },
  pWindup: { armX: number; armY: number; armZ: number; bodyY: number },
  pStrike: { armX: number; armY: number; armZ: number; bodyY: number },
  pRecovery: { armX: number; armY: number; armZ: number; bodyY: number }
): { armX: number; armY: number; armZ: number; bodyY: number } {
  if (t < 0.25) {
    const p = t / 0.25;
    const ease = p * p;
    return {
      armX: THREE.MathUtils.lerp(pStart.armX, pWindup.armX, ease),
      armY: THREE.MathUtils.lerp(pStart.armY, pWindup.armY, ease),
      armZ: THREE.MathUtils.lerp(pStart.armZ, pWindup.armZ, ease),
      bodyY: THREE.MathUtils.lerp(pStart.bodyY, pWindup.bodyY, ease),
    };
  } else if (t < 0.70) {
    const p = (t - 0.25) / 0.45;
    const ease = 1 - Math.pow(1 - p, 3);
    return {
      armX: THREE.MathUtils.lerp(pWindup.armX, pStrike.armX, ease),
      armY: THREE.MathUtils.lerp(pWindup.armY, pStrike.armY, ease),
      armZ: THREE.MathUtils.lerp(pWindup.armZ, pStrike.armZ, ease),
      bodyY: THREE.MathUtils.lerp(pWindup.bodyY, pStrike.bodyY, ease),
    };
  } else {
    const p = (t - 0.70) / 0.30;
    const ease = p * (2 - p);
    return {
      armX: THREE.MathUtils.lerp(pStrike.armX, pRecovery.armX, ease),
      armY: THREE.MathUtils.lerp(pStrike.armY, pRecovery.armY, ease),
      armZ: THREE.MathUtils.lerp(pStrike.armZ, pRecovery.armZ, ease),
      bodyY: THREE.MathUtils.lerp(pStrike.bodyY, pRecovery.bodyY, ease),
    };
  }
}

/**
 * Sistem Animasi Combat Lengkap Ksatria (Bagian 3):
 * Kinematika ayunan berbasis 3 fase (Wind-up -> Strike -> Recovery)
 * Dilengkapi proteksi sendi bahu default (0.46, 1.68, 0) & (-0.46, 1.68, 0)
 */
export function animateKnightCombatPose(
  playerMesh: PlayerMeshObjects,
  ctx: KnightCombatAnimContext
): void {
  if (!playerMesh) return;

  // Hitung progres ayunan: t dari 0.0 s.d 1.0
  const duration = ctx.attackDuration && ctx.attackDuration > 0 ? ctx.attackDuration : 0.35;
  const timer = ctx.attackTimer !== undefined ? ctx.attackTimer : 0;
  const t = Math.max(0, Math.min(1, 1 - (timer / duration)));

  // Kunci posisi bahu default (Requirement 1 & 4)
  playerMesh.leftArm.position.copy(playerMesh.leftArm.userData.defaultPos || new THREE.Vector3(0.46, 1.68, 0));
  playerMesh.rightArm.position.copy(playerMesh.rightArm.userData.defaultPos || new THREE.Vector3(-0.46, 1.68, 0));
  playerMesh.group.rotation.x = 0;
  playerMesh.group.rotation.z = 0;
  playerMesh.body.rotation.x = 0;
  playerMesh.body.rotation.z = 0;

  switch (ctx.attackType) {
    case 'warrior_combo_1': {
      // Hit 1: Tebas Diagonal Kanan ke Kiri
      // Wind-up: Lengan kanan ditarik ke kanan-belakang (-0.8, -0.7, -0.6), torso memutar ke kanan (body.rotation.y = -0.35)
      // Strike: Lengan kanan menyapu kuat dari kanan atas ke kiri bawah (0.7, 0.8, 0.3), torso memutar ke kiri (body.rotation.y = 0.35)
      const pose = interpolateStrikeTrajectory(
        t,
        { armX: -0.55, armY: -0.10, armZ: -0.20, bodyY: 0 },
        { armX: -0.8, armY: -0.7, armZ: -0.6, bodyY: -0.35 },
        { armX: 0.7, armY: 0.8, armZ: 0.3, bodyY: 0.35 },
        { armX: -0.55, armY: -0.10, armZ: -0.20, bodyY: 0 }
      );
      playerMesh.rightArm.rotation.set(pose.armX, pose.armY, pose.armZ);
      playerMesh.body.rotation.y = pose.bodyY;

      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-0.1, 0, 0);

      playerMesh.leftArm.rotation.set(-0.3, 0.2, 0.15);
      break;
    }
    case 'warrior_combo_2': {
      // Hit 2: Tebasan Balasan Kiri ke Kanan
      // Wind-up: Lengan kanan di sisi kiri bawah (-0.4, 0.7, 0.5), torso menghadap kiri (0.35)
      // Strike: Ayunan punggung pedang menyapu melintang ke kanan atas (0.8, -0.8, -0.4), torso memutar ke kanan (-0.35)
      const pose = interpolateStrikeTrajectory(
        t,
        { armX: 0.7, armY: 0.8, armZ: 0.3, bodyY: 0.35 },
        { armX: -0.4, armY: 0.7, armZ: 0.5, bodyY: 0.35 },
        { armX: 0.8, armY: -0.8, armZ: -0.4, bodyY: -0.35 },
        { armX: -0.55, armY: -0.10, armZ: -0.20, bodyY: 0 }
      );
      playerMesh.rightArm.rotation.set(pose.armX, pose.armY, pose.armZ);
      playerMesh.body.rotation.y = pose.bodyY;

      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-0.1, 0, 0);

      playerMesh.leftArm.rotation.set(-0.3, 0.2, 0.15);
      break;
    }
    case 'warrior_combo_3_shield': {
      // Hit 3: Shield Bash
      // Lengan kanan ditarik sedikit ke belakang (-0.2, -0.2, -0.3)
      playerMesh.rightArm.rotation.set(-0.2, -0.2, -0.3);
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-Math.PI / 2, 0, 0);

      // Lengan kiri: Menghantamkan perisai lurus ke depan!
      // Rotasi: leftArm.rotation.set(-1.50 * Math.sin(t * Math.PI), 0.30, 0.10)
      // Translasi: leftArm.position.set(0.46, 1.68, Math.sin(t * Math.PI) * 0.35)
      const bashSin = Math.sin(t * Math.PI);
      playerMesh.leftArm.rotation.set(-1.50 * bashSin, 0.30, 0.10);
      playerMesh.leftArm.position.set(0.46, 1.68, bashSin * 0.35);
      playerMesh.body.rotation.y = bashSin * 0.15;
      break;
    }
    case 'warrior_combo_4_thrust': {
      // Hit 4: Thrust Pierce Finisher
      // Wind-up: Lengan kanan menarik pedang ke samping rusuk (-0.2, 0, -0.2)
      // Strike: Lengan kanan menusuk lurus ke depan secara horizontal (-Math.PI / 2, 0, 0)
      const thrustSin = Math.sin(t * Math.PI);
      if (t < 0.25) {
        const p = t / 0.25;
        playerMesh.rightArm.rotation.set(
          THREE.MathUtils.lerp(-0.55, -0.2, p),
          0,
          THREE.MathUtils.lerp(-0.20, -0.2, p)
        );
        playerMesh.weapon.position.set(0, -0.05, 0.08);
      } else {
        const p = Math.min(1, (t - 0.25) / 0.45);
        const ease = 1 - Math.pow(1 - p, 3);
        playerMesh.rightArm.rotation.set(
          THREE.MathUtils.lerp(-0.2, -Math.PI / 2, ease),
          0,
          THREE.MathUtils.lerp(-0.2, 0, ease)
        );
        playerMesh.weapon.position.set(0, -0.05, 0.08 + thrustSin * 0.45);
      }
      playerMesh.weapon.rotation.set(-Math.PI / 2, 0, 0);

      // Perisai kiri menyeimbangkan tubuh di samping belakang: (-0.25, 0.2, 0.18)
      playerMesh.leftArm.rotation.set(-0.25, 0.2, 0.18);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
    case 'warrior_charge_release_quick':
    case 'warrior_charge_release_tier1':
    case 'warrior_charge_release_tier2':
    case 'warrior_charge_release_tier3': {
      // Lengan kanan menghantamkan pedang dari atas kepala lurus vertikal ke bawah (lerp(-2.85, 0.85))
      const cleaveEase = 1 - Math.pow(1 - t, 3);
      playerMesh.rightArm.rotation.set(
        THREE.MathUtils.lerp(-2.85, 0.85, cleaveEase),
        0,
        -0.15
      );
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-Math.PI / 2, 0, 0);

      playerMesh.leftArm.rotation.set(-0.25, 0.20, 0.18);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
    case 'warrior_crescent_1': {
      // Crescent 1: Ayunan cepat diagonal kanan ke kiri
      const pose = interpolateStrikeTrajectory(
        t,
        { armX: -0.55, armY: -0.10, armZ: -0.20, bodyY: 0 },
        { armX: -0.85, armY: -0.75, armZ: -0.65, bodyY: -0.40 },
        { armX: 0.75, armY: 0.85, armZ: 0.35, bodyY: 0.40 },
        { armX: -0.55, armY: -0.10, armZ: -0.20, bodyY: 0 }
      );
      playerMesh.rightArm.rotation.set(pose.armX, pose.armY, pose.armZ);
      playerMesh.body.rotation.y = pose.bodyY;
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-0.1, 0, 0);
      playerMesh.leftArm.rotation.set(-0.3, 0.2, 0.15);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      break;
    }
    case 'warrior_crescent_2': {
      // Crescent 2: Ayunan balasan cepat kiri ke kanan
      const pose = interpolateStrikeTrajectory(
        t,
        { armX: 0.75, armY: 0.85, armZ: 0.35, bodyY: 0.40 },
        { armX: -0.45, armY: 0.75, armZ: 0.55, bodyY: 0.40 },
        { armX: 0.85, armY: -0.85, armZ: -0.45, bodyY: -0.40 },
        { armX: -0.55, armY: -0.10, armZ: -0.20, bodyY: 0 }
      );
      playerMesh.rightArm.rotation.set(pose.armX, pose.armY, pose.armZ);
      playerMesh.body.rotation.y = pose.bodyY;
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-0.1, 0, 0);
      playerMesh.leftArm.rotation.set(-0.3, 0.2, 0.15);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      break;
    }
    case 'warrior_crescent_3': {
      // Crescent 3: Ayunan vertikal ke bawah dari atas kepala
      const cleaveEase = 1 - Math.pow(1 - t, 3);
      playerMesh.rightArm.rotation.set(
        THREE.MathUtils.lerp(-2.85, 0.85, cleaveEase),
        0,
        -0.15
      );
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-Math.PI / 2, 0, 0);
      playerMesh.leftArm.rotation.set(-0.25, 0.20, 0.18);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
    case 'cataclysmic_leap': {
      // Skill 3 di Udara: Tangan kanan mengangkat pedang tinggi (-2.95, 0, -0.15)
      // Tangan KIRI (Perisai) TETAP DI SAMPING PINGGANG SIAGA (-0.25, 0.20, 0.18), TIDAK BOLEH IKUT TERANGKAT!
      playerMesh.rightArm.rotation.set(-2.95, 0, -0.15);
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-Math.PI / 2, 0, 0);

      playerMesh.leftArm.rotation.set(-0.25, 0.20, 0.18);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
    case 'cataclysmic_slam': {
      // Skill 3 Mendarat: Ksatria menghujamkan pedang ke lantai (0.95, 0, -0.1)
      const slamEase = 1 - Math.pow(1 - t, 3);
      playerMesh.rightArm.rotation.set(
        THREE.MathUtils.lerp(-2.95, 0.95, slamEase),
        0,
        -0.1
      );
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-Math.PI / 2, 0, 0);

      playerMesh.leftArm.rotation.set(-0.25, 0.20, 0.18);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
    case 'aegis_retribution': {
      // Skill 4: Torso tetap tegak, hanya lengan kiri mengangkat perisai tinggi lalu menghantamkannya ke tanah
      const slamSin = Math.sin(t * Math.PI);
      playerMesh.leftArm.rotation.set(-1.60 * slamSin - 0.25, 0.30, 0.15);
      playerMesh.leftArm.position.set(0.46, 1.68, slamSin * 0.15);

      playerMesh.rightArm.rotation.set(-0.55, -0.10, -0.20);
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-0.20, 0, 0);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
    case 'shield_dash':
    case 'shield_charge': {
      // Dash: Lengan kiri mengangkat perisai di depan dada sebagai bumper
      playerMesh.leftArm.rotation.set(-1.45, 0.35, 0.15);
      playerMesh.leftArm.position.set(0.46, 1.68, 0.25);

      playerMesh.rightArm.rotation.set(-0.20, -0.15, -0.20);
      playerMesh.weapon.position.set(0, -0.05, 0.08);
      playerMesh.weapon.rotation.set(-Math.PI / 2, 0, 0);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
    default: {
      playerMesh.rightArm.rotation.set(0.0, 0, -0.15);
      playerMesh.leftArm.rotation.set(-0.35, 0.25, 0.18);
      playerMesh.leftArm.position.set(0.46, 1.68, 0);
      playerMesh.weapon.position.set(0, -0.05, 0.02);
      playerMesh.weapon.rotation.set(1.45, 0, 0.1);
      playerMesh.body.rotation.set(0, 0, 0);
      break;
    }
  }
}
