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
 * Mengacu pada lembar turnaround 5-sudut (Front, Back, Left, Right, 3/4 View).
 */

// 1. Materials Cache
interface KnightMaterialPalette {
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  helmetFaceMat: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  royalBlue: THREE.MeshLambertMaterial;
  plumeRed: THREE.MeshLambertMaterial;
  visorMat: THREE.MeshBasicMaterial;
  woodLeather: THREE.MeshLambertMaterial;
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
      // 1. Silver Steel Armor (Baja perak bersih mengkilap bersudut sesuai gambar)
      steel: new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.68,
        roughness: 0.32,
        flatShading: true,
      }),
      // 2. Darker inner joint steel
      darkSteel: new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.70,
        roughness: 0.38,
        flatShading: true,
      }),
      // 3. Helmet Faceplate (Pelat muka helm bernuansa tembaga-merah kecokelatan sesuai acuan)
      helmetFaceMat: new THREE.MeshStandardMaterial({
        color: 0x9e5a52,
        metalness: 0.58,
        roughness: 0.38,
        flatShading: true,
      }),
      // 4. Gold Trim (Lis emas tebal berkilau 0xeab308 pada tepi pelindung & perisai)
      gold: new THREE.MeshStandardMaterial({
        color: 0xeab308,
        metalness: 0.88,
        roughness: 0.22,
        emissive: 0xd97706,
        emissiveIntensity: 0.25,
        flatShading: true,
      }),
      // 5. Royal Blue Gambeson, Pants & Tabard (Kain biru dongker ksatria)
      royalBlue: new THREE.MeshLambertMaterial({
        color: 0x1e3a8a,
        flatShading: true,
      }),
      // 6. Plume Red Crest (Jambul merah melengkung menyambung 0xd97706 / 0xdc2626)
      plumeRed: new THREE.MeshLambertMaterial({
        color: 0xd97706,
        flatShading: true,
      }),
      // 7. Visor T-Slit (Celah gelap T pekat)
      visorMat: new THREE.MeshBasicMaterial({
        color: 0x0f172a,
      }),
      // 8. Wood & Leather (Crossguard kayu cokelat pedang & sabuk kulit)
      woodLeather: new THREE.MeshLambertMaterial({
        color: 0x78350f,
        flatShading: true,
      }),
      // 9. Broadsword Blade (Bilah pedang baja perak berujung runcing)
      bladeSteel: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.92,
        roughness: 0.18,
        flatShading: true,
      }),
      // 10. Kite Shield Face (Permukaan abu-abu gelap slate steel)
      shieldFace: new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.72,
        roughness: 0.34,
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
    cachedMaterials.steel.color.setHex(0xd1d5db);
    cachedMaterials.steel.emissive.setHex(0x000000);
    cachedMaterials.steel.emissiveIntensity = 0;
    cachedMaterials.gold.emissiveIntensity = 0.25;
  }

  return cachedMaterials;
}

// 2. Preloaded Geometries Cache
interface KnightGeometryPalette {
  headGeo: THREE.BufferGeometry;
  helmetDomeGeo: THREE.BufferGeometry;
  helmetCrownGeo: THREE.BufferGeometry;
  helmetFaceplateGeo: THREE.BufferGeometry;
  helmetNeckGuardGeo: THREE.BufferGeometry;
  visorHorizGeo: THREE.BufferGeometry;
  visorVertGeo: THREE.BufferGeometry;
  browRimGeo: THREE.BufferGeometry;
  plumeBaseGeo: THREE.BufferGeometry;
  plumeContinuousGeo: THREE.BufferGeometry;
  gorgetGeo: THREE.BufferGeometry;
  gorgetInnerGeo: THREE.BufferGeometry;
  torsoGambesonGeo: THREE.BufferGeometry;
  chestplateVTaperGeo: THREE.BufferGeometry;
  backplateVTaperGeo: THREE.BufferGeometry;
  chestNeckRimGeo: THREE.BufferGeometry;
  chestChevronRimGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  tabardFrontGeo: THREE.BufferGeometry;
  tabardBackGeo: THREE.BufferGeometry;
  tassetPlateGeo: THREE.BufferGeometry;
  tassetRimGeo: THREE.BufferGeometry;
  // Pauldrons (2 Lapis Bahu Bersudut dengan Lis Emas)
  pauldronTier1Geo: THREE.BufferGeometry;
  pauldronTier1RimGeo: THREE.BufferGeometry;
  pauldronTier2Geo: THREE.BufferGeometry;
  pauldronTier2RimGeo: THREE.BufferGeometry;
  armUpperGeo: THREE.BufferGeometry;
  elbowCopGeo: THREE.BufferGeometry;
  gauntletGeo: THREE.BufferGeometry;
  wristCuffGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  // Broadsword
  bladeGeo: THREE.BufferGeometry;
  bladeFullerGeo: THREE.BufferGeometry;
  bladeTipGeo: THREE.BufferGeometry;
  crossguardGeo: THREE.BufferGeometry;
  gripGeo: THREE.BufferGeometry;
  pommelGeo: THREE.BufferGeometry;
  // Kite Shield
  shieldFaceGeo: THREE.BufferGeometry;
  shieldRimGeo: THREE.BufferGeometry;
  shieldBossGeo: THREE.BufferGeometry;
  // Legs & Sabatons
  thighGeo: THREE.BufferGeometry;
  thighStrapGeo: THREE.BufferGeometry;
  kneeCopGeo: THREE.BufferGeometry;
  kneeUnderGeo: THREE.BufferGeometry;
  greaveGeo: THREE.BufferGeometry;
  calfBackGeo: THREE.BufferGeometry;
  footGeo: THREE.BufferGeometry;
  toeCapGeo: THREE.BufferGeometry;
  soleGeo: THREE.BufferGeometry;
  capeGeo: THREE.BufferGeometry;
}

let cachedGeometries: KnightGeometryPalette | null = null;

/**
 * Membuat profil 2D Heater / Kite Shield dengan bingkai emas timbul tebal
 */
function createHeaterShieldGeometries(): { faceGeo: THREE.BufferGeometry; rimGeo: THREE.BufferGeometry; bossGeo: THREE.BufferGeometry } {
  const shape = new THREE.Shape();
  const w = 0.32; // half-width
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
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  faceGeo.center();

  // Raised gold outer border/rim (Tebal & menonjol di tepi)
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
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  rimGeo.center();

  // Central emblem boss
  const bossGeo = new THREE.OctahedronGeometry(0.08, 0);
  bossGeo.scale(1.0, 1.4, 0.45);

  return { faceGeo, rimGeo, bossGeo };
}

/**
 * Membuat satu geometri tunggal menyambung untuk jambul merah (Plume Crest)
 * Menggunakan kurva dinamis S-curve yang melengkung ke belakang lalu menjentik ke atas di ekor
 */
function createContinuousPlumeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  // Titik kurva 2D profil samping sesuai referensi Left View:
  shape.moveTo(0.08, 0.0);
  shape.lineTo(0.12, 0.12);
  shape.lineTo(0.06, 0.26);
  shape.lineTo(-0.06, 0.36);
  shape.lineTo(-0.22, 0.30);
  shape.lineTo(-0.36, 0.18);
  shape.lineTo(-0.52, 0.06);
  shape.lineTo(-0.54, 0.12); // Ujung ekor menjentik ke atas
  shape.lineTo(-0.48, 0.02);
  shape.lineTo(-0.38, 0.08);
  shape.lineTo(-0.24, 0.16);
  shape.lineTo(-0.08, 0.18);
  shape.lineTo(0.0, 0.04);
  shape.closePath();

  const plumeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 1,
  });
  plumeGeo.center();
  plumeGeo.rotateY(Math.PI / 2);

  return plumeGeo;
}

/**
 * Membuat dada V-taper (lebar di bahu, menyempit di pinggang dengan keel-ridge tajam di depan)
 */
function createVTaperChestplate(): { chestGeo: THREE.BufferGeometry; backGeo: THREE.BufferGeometry; neckRimGeo: THREE.BufferGeometry; chevronRimGeo: THREE.BufferGeometry } {
  // 6-sided faceted cylinder:
  // Lebar atas di pundak: diameter ~0.82
  // Lebar bawah di pinggang: diameter ~0.54
  const chestGeo = new THREE.CylinderGeometry(0.41, 0.27, 0.58, 6);
  chestGeo.scale(1.0, 1.0, 0.68);
  chestGeo.translate(0, 0, 0.06);

  // Backplate yang melengkapi bagian belakang
  const backGeo = new THREE.CylinderGeometry(0.39, 0.26, 0.56, 6);
  backGeo.scale(1.0, 1.0, 0.64);
  backGeo.translate(0, 0, -0.04);

  // Gold neck collar rim di atas dada
  const neckRimGeo = new THREE.CylinderGeometry(0.34, 0.39, 0.06, 6);
  neckRimGeo.scale(1.02, 1.0, 0.70);
  neckRimGeo.translate(0, 0.28, 0.06);

  // Chevron gold trim rim di pinggang
  const chevronRimGeo = new THREE.CylinderGeometry(0.285, 0.27, 0.085, 6);
  chevronRimGeo.scale(1.02, 1.0, 0.70);
  chevronRimGeo.translate(0, -0.26, 0.06);

  return { chestGeo, backGeo, neckRimGeo, chevronRimGeo };
}

function getKnightGeometries(): KnightGeometryPalette {
  if (cachedGeometries) return cachedGeometries;

  const { faceGeo, rimGeo, bossGeo } = createHeaterShieldGeometries();
  const plumeContinuousGeo = createContinuousPlumeGeometry();
  const { chestGeo: chestplateVTaperGeo, backGeo: backplateVTaperGeo, neckRimGeo: chestNeckRimGeo, chevronRimGeo: chestChevronRimGeo } = createVTaperChestplate();

  // Head & Helmet
  const headGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.44, 6);
  const helmetDomeGeo = new THREE.CylinderGeometry(0.27, 0.29, 0.36, 8);
  const helmetCrownGeo = new THREE.ConeGeometry(0.27, 0.16, 8);
  helmetCrownGeo.translate(0, 0.26, 0);

  // Helmet Faceplate (Pelat muka miring bersudut)
  const helmetFaceplateGeo = new THREE.CylinderGeometry(0.28, 0.25, 0.28, 8);
  helmetFaceplateGeo.scale(1.02, 1.0, 1.05);

  // Helmet Back Neck Guard (Pelindung leher belakang)
  const helmetNeckGuardGeo = new THREE.CylinderGeometry(0.26, 0.30, 0.12, 8);
  helmetNeckGuardGeo.translate(0, -0.16, -0.06);

  const visorHorizGeo = new THREE.BoxGeometry(0.30, 0.045, 0.08);
  const visorVertGeo = new THREE.BoxGeometry(0.06, 0.18, 0.08);
  const browRimGeo = new THREE.BoxGeometry(0.34, 0.04, 0.07);
  const plumeBaseGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.08, 6);

  // Gorget & Torso (Gambeson V-Taper)
  const gorgetGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.12, 6);
  const gorgetInnerGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.14, 6);
  const torsoGambesonGeo = new THREE.CylinderGeometry(0.39, 0.26, 0.86, 6);
  torsoGambesonGeo.scale(1.0, 1.0, 0.64);

  // Belt & Tassets
  const beltGeo = new THREE.BoxGeometry(0.72, 0.14, 0.46);
  const buckleGeo = new THREE.BoxGeometry(0.22, 0.18, 0.50);
  const tabardFrontGeo = new THREE.BoxGeometry(0.28, 0.46, 0.04);
  tabardFrontGeo.translate(0, -0.23, 0);
  const tabardBackGeo = new THREE.BoxGeometry(0.28, 0.46, 0.04);
  tabardBackGeo.translate(0, -0.23, 0);

  const tassetPlateGeo = new THREE.BoxGeometry(0.24, 0.36, 0.06);
  tassetPlateGeo.translate(0, -0.18, 0);
  const tassetRimGeo = new THREE.BoxGeometry(0.26, 0.06, 0.08);

  // --------------------------------------------------------------------------
  // Pauldrons (2 Lapis Bahu Bersudut dengan Lis Emas sesuai gambar)
  // --------------------------------------------------------------------------
  // Lapis 1 (Top Tier): Shell melengkung bersudut perak
  const pauldronTier1Geo = new THREE.CylinderGeometry(0.24, 0.36, 0.28, 6);
  pauldronTier1Geo.scale(1.15, 0.9, 1.3);

  // Lis Emas Lapis 1: Bingkai emas menonjol di tepi atas & luar
  const pauldronTier1RimGeo = new THREE.CylinderGeometry(0.26, 0.38, 0.08, 6);
  pauldronTier1RimGeo.scale(1.18, 1.0, 1.32);

  // Lapis 2 (Lower Tier): Lempeng sekunder di bawahnya
  const pauldronTier2Geo = new THREE.CylinderGeometry(0.20, 0.28, 0.22, 6);
  pauldronTier2Geo.scale(1.1, 0.9, 1.25);
  pauldronTier2Geo.translate(0, -0.14, 0);

  // Lis Emas Lapis 2: Lis emas di bibir bawah lempeng kedua
  const pauldronTier2RimGeo = new THREE.CylinderGeometry(0.21, 0.29, 0.05, 6);
  pauldronTier2RimGeo.scale(1.12, 1.0, 1.27);
  pauldronTier2RimGeo.translate(0, -0.22, 0);

  // Arms & Gauntlets (Pivot tepat di pangkal bahu y = 0.0)
  const armUpperGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.34, 6);
  armUpperGeo.translate(0, -0.17, 0);
  const elbowCopGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  const gauntletGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.36, 6);
  gauntletGeo.translate(0, -0.48, 0);
  const wristCuffGeo = new THREE.CylinderGeometry(0.15, 0.14, 0.08, 6);
  wristCuffGeo.translate(0, -0.58, 0);
  const handGeo = new THREE.BoxGeometry(0.14, 0.14, 0.16);
  handGeo.translate(0, -0.68, 0);

  // Broadsword (Pedang Besar)
  const bladeGeo = new THREE.BoxGeometry(0.16, 1.25, 0.045);
  bladeGeo.translate(0, 0.62, 0);
  const bladeTipGeo = new THREE.ConeGeometry(0.115, 0.26, 4);
  bladeTipGeo.rotateY(Math.PI / 4);
  bladeTipGeo.translate(0, 1.36, 0);
  const bladeFullerGeo = new THREE.BoxGeometry(0.04, 1.05, 0.055);
  bladeFullerGeo.translate(0, 0.58, 0);
  const crossguardGeo = new THREE.BoxGeometry(0.50, 0.11, 0.11);
  const gripGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.34, 6);
  gripGeo.translate(0, -0.17, 0);
  const pommelGeo = new THREE.OctahedronGeometry(0.08, 0);
  pommelGeo.translate(0, -0.37, 0);

  // Legs & Sabatons (Pivot tepat di pangkal paha hip joint y = 0.0)
  const thighGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.40, 6);
  thighGeo.translate(0, -0.20, 0);
  const thighStrapGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.07, 6);
  thighStrapGeo.translate(0, -0.10, 0);

  // Knee cop bersudut intan menonjol ke depan
  const kneeCopGeo = new THREE.OctahedronGeometry(0.15, 0);
  kneeCopGeo.scale(1.15, 0.95, 1.25);
  const kneeUnderGeo = new THREE.BoxGeometry(0.24, 0.16, 0.14);
  kneeUnderGeo.translate(0, -0.42, 0.06);

  const greaveGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.36, 6);
  greaveGeo.translate(0, -0.56, 0.02);
  const calfBackGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.26, 6);
  calfBackGeo.translate(0, -0.54, -0.04);

  const footGeo = new THREE.BoxGeometry(0.30, 0.18, 0.36);
  footGeo.translate(0, -0.74, 0.04);
  const toeCapGeo = new THREE.BoxGeometry(0.28, 0.12, 0.16);
  toeCapGeo.translate(0, -0.77, 0.17);
  const soleGeo = new THREE.BoxGeometry(0.32, 0.04, 0.40);
  soleGeo.translate(0, -0.86, 0.04); // Rata persis di dasar y = -0.88 terhadap hip

  // Cape
  const capeGeo = new THREE.PlaneGeometry(0.70, 1.25, 3, 4);

  cachedGeometries = {
    headGeo,
    helmetDomeGeo,
    helmetCrownGeo,
    helmetFaceplateGeo,
    helmetNeckGuardGeo,
    visorHorizGeo,
    visorVertGeo,
    browRimGeo,
    plumeBaseGeo,
    plumeContinuousGeo,
    gorgetGeo,
    gorgetInnerGeo,
    torsoGambesonGeo,
    chestplateVTaperGeo,
    backplateVTaperGeo,
    chestNeckRimGeo,
    chestChevronRimGeo,
    beltGeo,
    buckleGeo,
    tabardFrontGeo,
    tabardBackGeo,
    tassetPlateGeo,
    tassetRimGeo,
    pauldronTier1Geo,
    pauldronTier1RimGeo,
    pauldronTier2Geo,
    pauldronTier2RimGeo,
    armUpperGeo,
    elbowCopGeo,
    gauntletGeo,
    wristCuffGeo,
    handGeo,
    bladeGeo,
    bladeFullerGeo,
    bladeTipGeo,
    crossguardGeo,
    gripGeo,
    pommelGeo,
    shieldFaceGeo: faceGeo,
    shieldRimGeo: rimGeo,
    shieldBossGeo: bossGeo,
    thighGeo,
    thighStrapGeo,
    kneeCopGeo,
    kneeUnderGeo,
    greaveGeo,
    calfBackGeo,
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
 * proporsi heroik persis seperti lembar turnaround gambar acuan.
 */
export function createHeroicKnightMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'warrior';

  const mats = getKnightMaterials(tier);
  const geos = getKnightGeometries();

  // --------------------------------------------------------------------------
  // 1. Torso, Gambeson & V-Taper Faceted Chestplate / Backplate
  // --------------------------------------------------------------------------
  // Gambeson bodi dasar V-taper (biru dongker)
  const body = new THREE.Mesh(geos.torsoGambesonGeo, mats.royalBlue);
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // Chestplate V-Taper (Lebar di bahu, meramping di pinggang dengan keel ridge tengah)
  const chestplate = new THREE.Mesh(geos.chestplateVTaperGeo, mats.steel);
  chestplate.position.set(0, 1.44, 0.02);
  chestplate.castShadow = true;

  // Backplate di bagian punggung
  const backplate = new THREE.Mesh(geos.backplateVTaperGeo, mats.steel);
  backplate.position.set(0, 1.44, 0.0);
  backplate.castShadow = true;

  // Lis emas di leher dada & chevron di tepi bawah dada
  const chestNeckRim = new THREE.Mesh(geos.chestNeckRimGeo, mats.gold);
  chestNeckRim.position.set(0, 1.44, 0.02);
  chestNeckRim.castShadow = true;

  const chestChevronRim = new THREE.Mesh(geos.chestChevronRimGeo, mats.gold);
  chestChevronRim.position.set(0, 1.44, 0.02);
  chestChevronRim.castShadow = true;

  group.add(chestplate, backplate, chestNeckRim, chestChevronRim);

  // Gorget / Collar Neck Armor
  const gorgetInner = new THREE.Mesh(geos.gorgetInnerGeo, mats.royalBlue);
  gorgetInner.position.set(0, 1.76, 0);
  const gorget = new THREE.Mesh(geos.gorgetGeo, mats.gold);
  gorget.position.set(0, 1.76, 0);
  gorget.castShadow = true;
  group.add(gorgetInner, gorget);

  // Belt & Gold Rectangular Buckle
  const belt = new THREE.Mesh(geos.beltGeo, mats.woodLeather);
  belt.position.y = 0.98;
  const buckle = new THREE.Mesh(geos.buckleGeo, mats.gold);
  buckle.position.set(0, 0.98, 0.02);
  buckle.castShadow = true;
  group.add(belt, buckle);

  // Tabard Depan & Belakang (Royal Blue drapes)
  const tabardFront = new THREE.Mesh(geos.tabardFrontGeo, mats.royalBlue);
  tabardFront.position.set(0, 0.92, 0.22);
  tabardFront.rotation.x = 0.08;
  tabardFront.castShadow = true;

  const tabardBack = new THREE.Mesh(geos.tabardBackGeo, mats.royalBlue);
  tabardBack.position.set(0, 0.92, -0.20);
  tabardBack.rotation.x = -0.06;
  tabardBack.castShadow = true;

  group.add(tabardFront, tabardBack);

  // Side Flared Tassets (Pelindung pinggul berlapis lis emas)
  const leftTasset = new THREE.Group();
  leftTasset.position.set(0.36, 0.94, 0.02);
  leftTasset.rotation.set(0.10, 0, -0.32);
  const leftTassetMesh = new THREE.Mesh(geos.tassetPlateGeo, mats.steel);
  leftTassetMesh.castShadow = true;
  const leftTassetRim = new THREE.Mesh(geos.tassetRimGeo, mats.gold);
  leftTassetRim.position.set(0, -0.34, 0.01);
  leftTasset.add(leftTassetMesh, leftTassetRim);

  const rightTasset = new THREE.Group();
  rightTasset.position.set(-0.36, 0.94, 0.02);
  rightTasset.rotation.set(0.10, 0, 0.32);
  const rightTassetMesh = new THREE.Mesh(geos.tassetPlateGeo, mats.steel);
  rightTassetMesh.castShadow = true;
  const rightTassetRim = new THREE.Mesh(geos.tassetRimGeo, mats.gold);
  rightTassetRim.position.set(0, -0.34, 0.01);
  rightTasset.add(rightTassetMesh, rightTassetRim);

  group.add(leftTasset, rightTasset);

  // --------------------------------------------------------------------------
  // 2. Head, Faceted Helmet, T-Visor & Continuous Connected Red Plume
  // --------------------------------------------------------------------------
  const head = new THREE.Mesh(geos.headGeo, mats.skinMat);
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);

  // Angular Faceted Knight Helmet
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 2.12, 0);

  // Kubah atas helm perak
  const helmetDome = new THREE.Mesh(geos.helmetDomeGeo, mats.steel);
  helmetDome.castShadow = true;
  const helmetCrown = new THREE.Mesh(geos.helmetCrownGeo, mats.steel);
  helmetCrown.castShadow = true;
  const helmetNeckGuard = new THREE.Mesh(geos.helmetNeckGuardGeo, mats.steel);
  helmetNeckGuard.castShadow = true;
  helmetGroup.add(helmetDome, helmetCrown, helmetNeckGuard);

  // Pelat muka bernuansa tembaga-merah (helmetFaceMat) sesuai gambar acuan
  const helmetFaceplate = new THREE.Mesh(geos.helmetFaceplateGeo, mats.helmetFaceMat);
  helmetFaceplate.position.set(0, -0.06, 0.03);
  helmetFaceplate.castShadow = true;
  helmetGroup.add(helmetFaceplate);

  // Gold Brow Accent Rim
  const browRim = new THREE.Mesh(geos.browRimGeo, mats.gold);
  browRim.position.set(0, 0.04, 0.26);
  helmetGroup.add(browRim);

  // Signature T-Shaped Dark Visor Slit
  const visorHoriz = new THREE.Mesh(geos.visorHorizGeo, mats.visorMat);
  visorHoriz.position.set(0, -0.02, 0.28);
  const visorVert = new THREE.Mesh(geos.visorVertGeo, mats.visorMat);
  visorVert.position.set(0, -0.10, 0.28);
  helmetGroup.add(visorHoriz, visorVert);

  // Jambul Merah Menyambung Utuh (Continuous Extruded Crest Plume)
  const plumeGroup = new THREE.Group();
  plumeGroup.position.set(0, 0.28, -0.04);

  const plumeBase = new THREE.Mesh(geos.plumeBaseGeo, mats.steel);
  plumeBase.position.set(0, -0.02, 0.10);
  plumeGroup.add(plumeBase);

  const plumeMesh = new THREE.Mesh(geos.plumeContinuousGeo, mats.plumeRed);
  plumeMesh.castShadow = true;
  plumeGroup.add(plumeMesh);

  helmetGroup.add(plumeGroup);
  group.add(helmetGroup);

  // --------------------------------------------------------------------------
  // 3. 2-Tier Faceted Pauldrons (Bahu 2 Lapis Bersudut dengan Lis Emas Tebal)
  // --------------------------------------------------------------------------
  const pauldronScale = tier >= 4 ? 1.30 : tier >= 2 ? 1.15 : 1.0;

  const buildPauldron = (isLeft: boolean): THREE.Group => {
    const pGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    pGroup.position.set(0.52 * sign, 1.82, 0);
    pGroup.rotation.z = -0.22 * sign;
    pGroup.scale.set(pauldronScale, pauldronScale, pauldronScale);

    // Lapis 1 (Top Tier): Shell atas perak bersudut
    const pTier1 = new THREE.Mesh(geos.pauldronTier1Geo, mats.steel);
    pTier1.castShadow = true;

    // Lis Emas Lapis 1 (Gold Trim 0xeab308 menonjol di tepi)
    const pTier1Rim = new THREE.Mesh(geos.pauldronTier1RimGeo, mats.gold);
    pTier1Rim.position.set(0.04 * sign, 0.08, 0);
    pTier1Rim.castShadow = true;

    // Lapis 2 (Lower Tier): Lempeng sekunder di bawahnya
    const pTier2 = new THREE.Mesh(geos.pauldronTier2Geo, mats.steel);
    pTier2.castShadow = true;

    // Lis Emas Lapis 2
    const pTier2Rim = new THREE.Mesh(geos.pauldronTier2RimGeo, mats.gold);
    pTier2Rim.castShadow = true;

    pGroup.add(pTier1, pTier1Rim, pTier2, pTier2Rim);

    // Tier 2+ Extra Gold Crest Spikes
    if (tier >= 2) {
      const spikeGeo = new THREE.ConeGeometry(0.065, 0.20, 4);
      const spike = new THREE.Mesh(spikeGeo, mats.gold);
      spike.position.set(0.08 * sign, 0.20, 0);
      spike.rotation.z = -0.32 * sign;
      pGroup.add(spike);
    }

    return pGroup;
  };

  const leftPauldron = buildPauldron(true);
  const rightPauldron = buildPauldron(false);
  group.add(leftPauldron, rightPauldron);

  // --------------------------------------------------------------------------
  // 4. Arms & Gauntlets (Pivot Group tepat di sendi bahu y = 1.72)
  // --------------------------------------------------------------------------
  const buildArm = (isLeft: boolean): { armGroup: THREE.Group } => {
    const armGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    armGroup.position.set(0.48 * sign, 1.72, 0);

    // Upper Arm (Royal Blue Tunic Cloth)
    const upperArm = new THREE.Mesh(geos.armUpperGeo, mats.royalBlue);
    upperArm.castShadow = true;

    // Elbow Guard Plate
    const elbow = new THREE.Mesh(geos.elbowCopGeo, mats.steel);
    elbow.position.set(0, -0.34, -0.04);
    elbow.castShadow = true;

    // Forearm Gauntlet (Faceted Steel Vambrace)
    const gauntlet = new THREE.Mesh(geos.gauntletGeo, mats.steel);
    gauntlet.castShadow = true;

    // Gold Flared Wrist Cuff (Bingkai Emas Pergelangan)
    const cuff = new THREE.Mesh(geos.wristCuffGeo, mats.gold);
    cuff.castShadow = true;

    // Armored Hand / Fist (Dark Steel)
    const hand = new THREE.Mesh(geos.handGeo, mats.darkSteel);
    hand.castShadow = true;

    armGroup.add(upperArm, elbow, gauntlet, cuff, hand);
    group.add(armGroup);
    return { armGroup };
  };

  const { armGroup: leftArm } = buildArm(true);
  const { armGroup: rightArm } = buildArm(false);

  // --------------------------------------------------------------------------
  // 5. Right Hand Weapon: Heroic Low-Poly Broadsword (Guard Kayu & Blade Runcing)
  // --------------------------------------------------------------------------
  const weapon = new THREE.Group();

  const blade = new THREE.Mesh(geos.bladeGeo, mats.bladeSteel);
  blade.castShadow = true;

  const bladeTip = new THREE.Mesh(geos.bladeTipGeo, mats.bladeSteel);
  bladeTip.castShadow = true;

  const fuller = new THREE.Mesh(geos.bladeFullerGeo, mats.darkSteel);
  fuller.castShadow = true;

  // Crossguard kayu cokelat bersudut quillons
  const crossguard = new THREE.Mesh(geos.crossguardGeo, mats.woodLeather);
  crossguard.castShadow = true;

  const grip = new THREE.Mesh(geos.gripGeo, mats.woodLeather);
  const pommel = new THREE.Mesh(geos.pommelGeo, mats.steel);
  pommel.castShadow = true;

  weapon.add(blade, bladeTip, fuller, crossguard, grip, pommel);
  weapon.position.set(0, -0.68, 0.15);
  weapon.rotation.x = Math.PI / 4;
  rightArm.add(weapon);

  // --------------------------------------------------------------------------
  // 6. Left Arm Shield: Large Low-Poly Kite Shield (Abu-abu Gelap + Lis Emas Tebal)
  // --------------------------------------------------------------------------
  const shield = new THREE.Mesh(geos.shieldFaceGeo, mats.shieldFace);
  shield.castShadow = true;

  // Bingkai emas timbul di sekeliling perisai
  const shieldRim = new THREE.Mesh(geos.shieldRimGeo, mats.gold);
  shieldRim.position.z = 0.015;
  shieldRim.castShadow = true;
  shield.add(shieldRim);

  // Central Gold Boss / Emblem
  const shieldBoss = new THREE.Mesh(geos.shieldBossGeo, mats.gold);
  shieldBoss.position.set(0, 0.08, 0.035);
  shieldBoss.castShadow = true;
  shield.add(shieldBoss);

  // Shield mount position on left forearm
  shield.position.set(0.18, -0.40, 0.16);
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
  // 8. Legs, Knee Cops (Poleyns) & Heavy Sabatons (Heroic Idle Stance Terbuka)
  // --------------------------------------------------------------------------
  const buildLeg = (posX: number, isLeft: boolean): THREE.Group => {
    const leg = new THREE.Group();
    // Pivot tepat di pangkal paha hip joint y = 0.88
    leg.position.set(posX, 0.88, 0);

    // Stance terbuka heroik (A-frame stance)
    const sign = isLeft ? 1 : -1;
    leg.rotation.z = -0.04 * sign;
    leg.rotation.y = 0.08 * sign;

    // Thigh (Royal Blue Pants) + Leather Thigh Band
    const thigh = new THREE.Mesh(geos.thighGeo, mats.royalBlue);
    thigh.castShadow = true;
    const thighStrap = new THREE.Mesh(geos.thighStrapGeo, mats.woodLeather);
    thighStrap.castShadow = true;
    leg.add(thigh, thighStrap);

    // Faceted Diamond Knee Cop (Poleyn) bersudut intan menonjol
    const knee = new THREE.Mesh(geos.kneeCopGeo, mats.steel);
    knee.position.set(0, -0.42, 0.13);
    knee.castShadow = true;
    const kneeUnder = new THREE.Mesh(geos.kneeUnderGeo, mats.darkSteel);
    kneeUnder.castShadow = true;
    leg.add(knee, kneeUnder);

    // Shin Greave & Pelat Belakang Betis
    const shin = new THREE.Mesh(geos.greaveGeo, mats.steel);
    shin.castShadow = true;
    const calfBack = new THREE.Mesh(geos.calfBackGeo, mats.steel);
    calfBack.castShadow = true;
    leg.add(shin, calfBack);

    // Sabaton Armored Boot (Anatomically Grounded flush at world terrain y = 0.00)
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

  const leftLeg = buildLeg(0.22, true);
  const rightLeg = buildLeg(-0.22, false);

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
