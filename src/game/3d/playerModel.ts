import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import { CharacterClass } from '../../types/game';
import { createLegacyHunterMesh } from './HunterModelLegacy';

export type { PlayerMeshObjects };
export const USE_LEGACY_HUNTER = false;
export { createLegacyHunterMesh };
export { createHeroicMageMesh, buildMageModel } from './MageModel';

// 1. TEKSTUR WAJAH KANVAS DETERMINISTIK (CACHED SINGLETON - 0% MEMORY OVERHEAD)
let cachedRogueFaceTexture: THREE.CanvasTexture | null = null;
let cachedRogueFaceMaterial: THREE.MeshBasicMaterial | null = null;

function getRogueFaceTexture(): THREE.CanvasTexture {
  if (cachedRogueFaceTexture) return cachedRogueFaceTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Bayangan gelap bagian dalam tudung Assassin
  ctx.fillStyle = '#0f1217';
  ctx.fillRect(0, 0, 128, 128);

  // Celah kulit gelap di bawah bayangan paruh tudung (menutup penuh hingga tepi kain samping)
  ctx.fillStyle = '#6e4e3a';
  ctx.fillRect(0, 38, 128, 28);

  // Bayangan tepi kiri-kanan & dahi dari dalam tudung agar tidak ada celah terang di pipi
  const browShadow = ctx.createLinearGradient(0, 36, 0, 56);
  browShadow.addColorStop(0, 'rgba(15, 18, 23, 0.94)');
  browShadow.addColorStop(1, 'rgba(15, 18, 23, 0.12)');
  ctx.fillStyle = browShadow;
  ctx.fillRect(0, 36, 128, 22);

  ctx.fillStyle = '#0f1217';
  ctx.fillRect(0, 36, 14, 30);
  ctx.fillRect(114, 36, 14, 30);

  // Masker kain gelap rapi (#2c333d) menutup hidung & mulut tanpa celah
  ctx.fillStyle = '#2c333d';
  ctx.fillRect(0, 62, 128, 66);

  // Batang masker segitiga menutup rapi pangkal hidung
  ctx.fillStyle = '#2c333d';
  ctx.beginPath();
  ctx.moveTo(40, 64);
  ctx.lineTo(64, 48);
  ctx.lineTo(88, 64);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3f4856';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 63);
  ctx.lineTo(42, 63);
  ctx.lineTo(64, 49);
  ctx.lineTo(86, 63);
  ctx.lineTo(128, 63);
  ctx.stroke();

  // Sepasang Mata Cyan (#00e5ff) tajam & simetris
  ctx.save();
  ctx.fillStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 10;

  // Mata kiri menyudut tegas
  ctx.beginPath();
  ctx.moveTo(24, 46);
  ctx.lineTo(50, 50);
  ctx.lineTo(48, 56);
  ctx.lineTo(25, 53);
  ctx.closePath();
  ctx.fill();

  // Mata kanan simetris
  ctx.beginPath();
  ctx.moveTo(104, 46);
  ctx.lineTo(78, 50);
  ctx.lineTo(80, 56);
  ctx.lineTo(103, 53);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  cachedRogueFaceTexture = texture;
  return texture;
}

function getRogueFaceMaterial(): THREE.MeshBasicMaterial {
  if (!cachedRogueFaceMaterial) {
    cachedRogueFaceMaterial = new THREE.MeshBasicMaterial({ map: getRogueFaceTexture() });
  }
  return cachedRogueFaceMaterial;
}

// 2. BUSUR BERSUDUT 5-SEGMEN DENGAN ANAK PANAH & PUSARAN ANGIN ZAMRUD
function createSegmentedBow(matWood: THREE.Material, matString: THREE.Material, includeArrow: boolean = false): THREE.Group {
  const bow = new THREE.Group();
  bow.name = 'SegmentedBow';

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), matWood);
  bow.add(handle);

  const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), matWood);
  limbTop.position.set(0, 0.24, -0.06);
  limbTop.rotation.x = -0.45;

  const limbBottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), matWood);
  limbBottom.position.set(0, -0.24, -0.06);
  limbBottom.rotation.x = 0.45;

  const tipTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), matWood);
  tipTop.position.set(0, 0.44, 0.01);
  tipTop.rotation.x = 0.65;

  const tipBottom = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), matWood);
  tipBottom.position.set(0, -0.44, 0.01);
  tipBottom.rotation.x = -0.65;

  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.52, 0.07),
    new THREE.Vector3(0, 0, 0.01),
    new THREE.Vector3(0, -0.52, 0.07)
  ]);
  const bowString = new THREE.Line(stringGeo, matString);
  bow.add(limbTop, limbBottom, tipTop, tipBottom, bowString);

  if (includeArrow) {
    // Anak Panah di Busur (Digunakan saat membidik dan menarik busur)
    const arrowGroup = new THREE.Group();
    arrowGroup.name = 'BowArrow';
    arrowGroup.visible = false;
    arrowGroup.rotation.x = Math.PI / 2;

    const matArrowWood = new THREE.MeshLambertMaterial({ color: 0x4a3321 });
    const matArrowHead = new THREE.MeshStandardMaterial({
      color: 0xd1fae5,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
      metalness: 0.6,
      roughness: 0.2,
    });
    const matWindGlow = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const matGoldCore = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    // Batang panah (membujur ke depan sumbu +Z)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.92, 6), matArrowWood);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0, 0.04);
    arrowGroup.add(shaft);

    // Mata panah tajam
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), matArrowHead);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0, 0.52);
    arrowGroup.add(tip);

    // Bulu panah di pangkal senar
    const fletch1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.01), matWindGlow);
    fletch1.position.set(0, 0, -0.38);
    const fletch2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.07), matWindGlow);
    fletch2.position.set(0, 0, -0.38);
    arrowGroup.add(fletch1, fletch2);

    // Pusaran Angin Zamrud Bercahaya (Emerald Wind Vortex) di Ujung Mata Panah
    // Aktif saat bowChargeRatio >= 0.85
    const vortexGroup = new THREE.Group();
    vortexGroup.name = 'ArrowVortex';
    vortexGroup.position.set(0, 0, 0.56);
    vortexGroup.visible = false;

    // Outer emerald wind vortex ring
    const ringOuter = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.24, 16), matWindGlow);
    // Inner white-gold hyper-charge core ring
    const ringInner = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.13, 12), matGoldCore);
    ringInner.position.z = 0.01;

    // Cross flare blades for intense swirl appearance
    const flare1 = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.04), matGoldCore);
    const flare2 = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.04), matGoldCore);
    flare2.rotation.z = Math.PI / 2;

    vortexGroup.add(ringOuter, ringInner, flare1, flare2);
    arrowGroup.add(vortexGroup);

    bow.add(arrowGroup);
  }

  return bow;
}

/** Bangun belati Assassin proporsional: bilah logam gelap dengan tepi tajam cyan bercahaya */
function createAssassinDagger(
  matLeather: THREE.Material,
  matSilver: THREE.Material,
  matCyanGlow: THREE.Material,
  matBladeCore: THREE.Material
): THREE.Group {
  const dagger = new THREE.Group();
  dagger.name = 'HandDagger';

  // Gagang hitam terbungkus kulit + pommel perak
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.026, 0.14, 6), matLeather);
  hilt.rotation.x = Math.PI / 2;
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), matSilver);
  pommel.position.set(0, 0, -0.075);

  // Crossguard perak kecil proporsional
  const guardCore = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.024, 0.030), matSilver);
  guardCore.position.set(0, 0, 0.07);
  const guardTipL = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.036, 4), matSilver);
  guardTipL.rotation.z = Math.PI / 2;
  guardTipL.position.set(-0.068, 0, 0.074);
  const guardTipR = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.036, 4), matSilver);
  guardTipR.rotation.z = -Math.PI / 2;
  guardTipR.position.set(0.068, 0, 0.074);

  // Inti bilah logam gelap tebal & kokoh (proporsi tegas, bukan jarum tipis)
  const coreShaft = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.018, 0.24), matBladeCore);
  coreShaft.position.set(0, 0, 0.20);

  const coreTipGeo = new THREE.ConeGeometry(0.046, 0.16, 4);
  coreTipGeo.rotateY(Math.PI / 4);
  const coreTip = new THREE.Mesh(coreTipGeo, matBladeCore);
  coreTip.rotation.x = Math.PI / 2;
  coreTip.scale.set(0.98, 1.0, 0.26);
  coreTip.position.set(0, 0, 0.40);

  // Lapisan tepi tajam bercahaya cyan (#00e5ff) di sekeliling sisi kiri, kanan & ujung bilah
  const glowEdge = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.008, 0.245), matCyanGlow);
  glowEdge.position.set(0, 0, 0.202);

  const glowTipGeo = new THREE.ConeGeometry(0.056, 0.175, 4);
  glowTipGeo.rotateY(Math.PI / 4);
  const glowTip = new THREE.Mesh(glowTipGeo, matCyanGlow);
  glowTip.rotation.x = Math.PI / 2;
  glowTip.scale.set(0.98, 1.0, 0.14);
  glowTip.position.set(0, 0, 0.408);

  dagger.add(hilt, pommel, guardCore, guardTipL, guardTipR, glowEdge, glowTip, coreShaft, coreTip);
  return dagger;
}

/** Bangun pelindung lengan bawah (vambrace) kulit-logam + housing Hidden Blade rapat */
function createForearmVambrace(
  sideSign: -1 | 1,
  matLeather: THREE.Material,
  matDarkMetal: THREE.Material,
  matSilver: THREE.Material,
  matCyanGlow: THREE.Material
): THREE.Group {
  const vambrace = new THREE.Group();
  vambrace.name = sideSign < 0 ? 'VambraceL' : 'VambraceR';

  // Manset kulit pembungkus lengan bawah
  const leatherWrap = new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.20, 0.142), matLeather);
  leatherWrap.position.set(0, -0.31, 0);

  // Plat pelindung luar logam gelap mengikuti kontur lengan
  const outerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.18, 0.125), matDarkMetal);
  outerPlate.position.set(sideSign * 0.064, -0.31, 0.005);

  // Strip pengikat pergelangan perak
  const wristBand = new THREE.Mesh(new THREE.BoxGeometry(0.150, 0.038, 0.150), matSilver);
  wristBand.position.set(0, -0.385, 0);

  // Housing Hidden Blade mekanis ringkas menempel di pergelangan bawah
  const hiddenHousing = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.135, 0.052), matDarkMetal);
  hiddenHousing.position.set(sideSign * 0.070, -0.33, 0.032);

  const hiddenStud = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.032, 0.022), matCyanGlow);
  hiddenStud.position.set(sideSign * 0.075, -0.37, 0.036);

  vambrace.add(leatherWrap, outerPlate, wristBand, hiddenHousing, hiddenStud);
  return vambrace;
}

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRogue';

  // --- PALET MASTER ASSASSIN ---
  const matHood = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.90, metalness: 0.02, side: THREE.DoubleSide });
  const matHoodFold = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide });
  const matCowl = new THREE.MeshStandardMaterial({ color: 0x222a36, roughness: 0.88, side: THREE.DoubleSide });
  const matHoodShadow = new THREE.MeshStandardMaterial({ color: 0x0f1217, roughness: 0.96 });
  const matCloakCloth = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.86, side: THREE.DoubleSide });
  const matTunic = new THREE.MeshStandardMaterial({ color: 0x1c222b, roughness: 0.82 });
  const matLeatherVest = new THREE.MeshStandardMaterial({ color: 0x2a221f, roughness: 0.76 });
  const matCrimson = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.76, side: THREE.DoubleSide });
  const matFletchWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.75, side: THREE.DoubleSide });
  const matFletchRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.72, side: THREE.DoubleSide });
  const matPants = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.90 });
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x3b261e, roughness: 0.74 });
  const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.36, metalness: 0.65 });
  const matBladeCore = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.28, metalness: 0.82 });
  const matSilver = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.88 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x4a3321, roughness: 0.70 });
  const matCyanGlow = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00e5ff,
    emissiveIntensity: 2.8,
    roughness: 0.18,
  });
  const matString = new THREE.LineBasicMaterial({ color: 0x00e5ff });

  // ==========================================
  // 1. KAKI, SEPATU BOT & SARUNG BELATI PAHA
  // ==========================================
  const legGroup = new THREE.Group();
  legGroup.name = 'LegGroup';
  let leftLegGroup: THREE.Group | undefined;
  let rightLegGroup: THREE.Group | undefined;
  let leftKneeMesh: THREE.Mesh | undefined;
  let rightKneeMesh: THREE.Mesh | undefined;

  [-0.145, 0.145].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    const sideSign = isLeft ? -1 : 1;
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'Leg_Left' : 'Leg_Right';
    legPivot.position.set(xPos, 0.74, 0);

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.62, 0.205), matPants);
    leg.position.set(0, -0.32, 0);

    // Pelindung lutut kulit-logam
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.10, 0.115), matDarkMetal);
    knee.name = isLeft ? 'Knee_Left' : 'Knee_Right';
    knee.position.set(0, -0.36, 0.075);

    // Sepatu bot tinggi kulit gelap + manset lipat
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.27, 0.26), matLeather);
    boot.position.set(0, -0.60, 0.03);

    const bootCuff = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.065, 0.275), matDarkMetal);
    bootCuff.position.set(0, -0.48, 0.025);

    const bootStrap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.28), matLeather);
    bootStrap.position.set(0, -0.57, 0.03);

    // Sarung belati menempel rapi di paha luar (bergerak selaras dengan ayunan kaki)
    const thighSheath = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.09), matLeather);
    thighSheath.position.set(sideSign * 0.11, -0.17, 0.01);
    const sheathHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.08, 6), matSilver);
    sheathHilt.position.set(sideSign * 0.115, -0.025, 0.01);

    legPivot.add(leg, knee, boot, bootCuff, bootStrap, thighSheath, sheathHilt);
    legGroup.add(legPivot);

    if (isLeft) {
      leftLegGroup = legPivot;
      leftKneeMesh = knee;
    } else {
      rightLegGroup = legPivot;
      rightKneeMesh = knee;
    }
  });
  root.add(legGroup);

  // ==========================================
  // 2. PINGGUL, SABUK KAIN MERAH TUA (#8b1a1a) & GESPER CHEVRON PERAK
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.16, 0.30), matPants);
  pelvis.position.set(0, 0.80, 0);

  // Sabuk kain merah tua melingkar rapi di pinggang
  const crimsonSashMain = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.105, 0.335), matCrimson);
  crimsonSashMain.position.set(0, 0.79, 0);

  const crimsonSashWrap = new THREE.Mesh(new THREE.BoxGeometry(0.545, 0.065, 0.340), matCrimson);
  crimsonSashWrap.position.set(0, 0.82, 0.004);
  crimsonSashWrap.rotation.z = -0.05;

  // Sabuk kulit atas tipis + kantong pinggang
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.055, 0.342), matLeather);
  belt.position.set(0, 0.855, 0);

  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 0.085), matLeather);
  pouchL.position.set(-0.20, 0.83, 0.155);
  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.08), matLeather);
  pouchR.position.set(0.20, 0.83, 0.155);

  // Ujung kain Crimson menjuntai rapi menyusuri sisi pinggul kiri
  const sashTailGroup = new THREE.Group();
  sashTailGroup.position.set(-0.268, 0.75, 0.03);
  sashTailGroup.rotation.z = -0.06;
  const sashTailCloth = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.28, 0.14), matCrimson);
  sashTailCloth.position.set(0, -0.14, 0);
  sashTailGroup.add(sashTailCloth);

  // Gesper Emblem Chevron/Segitiga Assassin Perak di tengah depan sabuk
  const buckleGroup = new THREE.Group();
  buckleGroup.position.set(0, 0.82, 0.182);
  const buckleBackplate = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.105, 0.022), matDarkMetal);
  const chevronArmL = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.095, 0.024), matSilver);
  chevronArmL.position.set(-0.025, 0.004, 0.008);
  chevronArmL.rotation.z = -0.44;
  const chevronArmR = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.095, 0.024), matSilver);
  chevronArmR.position.set(0.025, 0.004, 0.008);
  chevronArmR.rotation.z = 0.44;
  const chevronCrossbar = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.017, 0.022), matSilver);
  chevronCrossbar.position.set(0, -0.022, 0.007);
  const buckleCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.016, 0), matCyanGlow);
  buckleCore.position.set(0, 0.004, 0.015);
  buckleGroup.add(buckleBackplate, chevronArmL, chevronArmR, chevronCrossbar, buckleCore);

  root.add(pelvis, crimsonSashMain, crimsonSashWrap, belt, pouchL, pouchR, sashTailGroup, buckleGroup);

  // ==========================================
  // 3. TORSO TUNIK ASSASSIN (#1c222b), ROMPI KULIT (#2a221f) & 1 SELEMPANG DIAGONAL
  //    (Bebas motif tuksedo / V putih / segitiga leher / papan abu-abu kaku!)
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'TorsoGroup';
  torsoGroup.position.set(0, 1.18, 0);
  torsoGroup.rotation.set(0, 0, 0);
  torsoGroup.rotation.reorder('YXZ');

  // Lapisan dasar tunik abu-abu arang / biru malam gelap (#1c222b)
  const tunicCore = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.58, 0.30), matTunic);
  tunicCore.name = 'TunicCore';
  torsoGroup.add(tunicCore);

  // Rompi kulit cokelat gelap/hitam (#2a221f) menempel rapat di dada dan punggung
  const vestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.318), matLeatherVest);
  vestPlate.name = 'TunicVest';
  vestPlate.position.set(0, 0.07, 0.002);
  torsoGroup.add(vestPlate);

  // Plat tulang dada ringkas logam gelap untuk siluet baju tempur Assassin yang tegas
  const sternumTrim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.022), matDarkMetal);
  sternumTrim.position.set(0, 0.12, 0.164);
  torsoGroup.add(sternumTrim);

  // 1 Selempang kulit diagonal tipis (Bahu Kanan -> Pinggang Kiri) menempel rapat di dada & punggung
  const bandolierGroup = new THREE.Group();
  bandolierGroup.name = 'Bandolier';

  const bandolierFront = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.68, 0.018), matLeather);
  bandolierFront.position.set(0, 0.01, 0.168);
  bandolierFront.rotation.z = -0.66;

  const bandolierBack = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.68, 0.018), matLeather);
  bandolierBack.position.set(0, 0.01, -0.168);
  bandolierBack.rotation.z = -0.66;

  const bandolierShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.032, 0.345), matLeather);
  bandolierShoulder.position.set(0.19, 0.285, 0);

  bandolierGroup.add(bandolierFront, bandolierBack, bandolierShoulder);

  // 3 kantong pisau lempar kecil tertata rapat di bandolier depan
  [-0.11, -0.01, 0.09].forEach((offsetX, i) => {
    const knifeHolster = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.08, 0.018), matDarkMetal);
    knifeHolster.position.set(offsetX, -0.085 + i * 0.105, 0.180);
    knifeHolster.rotation.z = -0.66;
    const knifeHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.04, 5), matSilver);
    knifeHilt.position.set(offsetX + 0.028, -0.085 + i * 0.105 + 0.034, 0.182);
    knifeHilt.rotation.z = -0.66;
    bandolierGroup.add(knifeHolster, knifeHilt);
  });
  torsoGroup.add(bandolierGroup);

  // Pengikat sabuk punggung + Busur Recurve & Tabung Quiver sejajar rapi 100% di luar punggung (0% clipping!)
  const backMountStrap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.04), matLeather);
  backMountStrap.position.set(0.01, 0.04, -0.195);
  backMountStrap.rotation.z = -0.66;
  torsoGroup.add(backMountStrap);

  // Busur Recurve Assassin diagonal (tali cyan & seluruh lengkungan berada bersih di luar permukaan rompi z <= -0.177)
  const backBow = createSegmentedBow(matWood, matString);
  backBow.name = 'BackBow';
  backBow.scale.set(0.78, 0.78, 0.78);
  backBow.position.set(-0.04, 0.03, -0.285);
  backBow.rotation.set(0, 0, -0.66);
  torsoGroup.add(backBow);

  // Tabung anak panah (Quiver) kulit cokelat tua menyamping di samping busur dengan 4 ekor panah merah/putih di bahu kanan
  const quiverGroup = new THREE.Group();
  quiverGroup.name = 'Quiver';
  quiverGroup.position.set(0.09, 0.05, -0.242);
  quiverGroup.rotation.set(0.02, 0, -0.52);

  const quiverBody = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.038, 0.48, 8), matLeather);
  const quiverCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.054, 0.055, 8), matDarkMetal);
  quiverCollar.position.set(0, 0.22, 0);
  const quiverBand = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.047, 0.045, 8), matCrimson);
  quiverBand.position.set(0, 0.07, 0);
  quiverGroup.add(quiverBody, quiverCollar, quiverBand);

  // 4 Ekor Anak Panah (fletching merah & putih kecil) menyembul rapi di atas bahu kanan
  const fletchSpecs: [number, number, boolean][] = [
    [-0.022, 0.014, true],
    [0.0, -0.016, false],
    [0.020, 0.012, true],
    [0.008, 0.024, false],
  ];
  fletchSpecs.forEach(([fx, fz, isRed], idx) => {
    const arrowStick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.14, 5), matWood);
    arrowStick.position.set(fx, 0.30, fz);
    const fletchMat = isRed ? matFletchRed : matFletchWhite;
    const fletchFinA = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.075, 0.006), fletchMat);
    fletchFinA.position.set(fx, 0.34, fz);
    fletchFinA.rotation.y = idx * 0.55;
    const fletchFinB = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.075, 0.034), fletchMat);
    fletchFinB.position.set(fx, 0.34, fz);
    fletchFinB.rotation.y = idx * 0.55;
    quiverGroup.add(arrowStick, fletchFinA, fletchFinB);
  });
  torsoGroup.add(quiverGroup);

  root.add(torsoGroup);

  // ==========================================
  // 4. EKOR JUBAH TERBELAH (SPLIT COATTAILS) JATUH NATURAL HAMPIR VERTIKAL (5°-7°)
  // ==========================================
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'HunterCloak';
  cloakGroup.position.set(0, 0.85, -0.155);
  cloakGroup.rotation.x = 0.09; // ~5.1 derajat jatuh alami mengikuti kaki

  // Dua belahan ekor mantel utama di belakang paha-betis (menggantung hampir lurus ke bawah)
  [-1, 1].forEach((sideSign) => {
    const tail = new THREE.Group();
    tail.position.set(sideSign * 0.13, 0, 0);
    tail.rotation.z = sideSign * 0.04; // Terbelah rapi di tengah (~2.3 deg)

    const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.34, 0.026), matCloakCloth);
    upperPanel.position.set(0, -0.17, 0);

    const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.25, 0.024), matCloakCloth);
    lowerPanel.position.set(sideSign * 0.015, -0.45, 0);

    // Garis tepi (trim) tipis merah tua (#8b1a1a) di sisi dalam & bawah ekor
    const innerTrimTop = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.34, 0.029), matCrimson);
    innerTrimTop.position.set(-sideSign * 0.098, -0.17, 0);

    const innerTrimLow = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.25, 0.027), matCrimson);
    innerTrimLow.position.set(-sideSign * 0.065, -0.45, 0);

    const bottomHemTrim = new THREE.Mesh(new THREE.BoxGeometry(0.172, 0.024, 0.027), matCrimson);
    bottomHemTrim.position.set(sideSign * 0.015, -0.57, 0);

    tail.add(upperPanel, lowerPanel, innerTrimTop, innerTrimLow, bottomHemTrim);
    cloakGroup.add(tail);

    // Panel mantel samping paha membungkus pinggul ke bawah hampir vertikal
    const flankPanel = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.42, 0.18), matCloakCloth);
    flankPanel.position.set(sideSign * 0.245, -0.21, 0.075);
    flankPanel.rotation.z = sideSign * 0.045;

    const flankHem = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.022, 0.182), matCrimson);
    flankHem.position.set(sideSign * 0.254, -0.415, 0.075);
    flankHem.rotation.z = sideSign * 0.045;

    cloakGroup.add(flankPanel, flankHem);
  });

  root.add(cloakGroup);

  // ==========================================
  // 5. KEPALA & TUDUNG KAIN LENTUR MENGERUCUT (TAPERED CLOTH HOOD - NON-BOXY)
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'HunterHeadGroup';
  headGroup.position.set(0, 1.50, 0);

  // Lipatan kerah kain melingkar (cowl folds) menyambung lembut ke bahu
  const cowlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.295, 0.14, 10), matHoodFold);
  cowlBase.position.set(0, -0.01, -0.01);
  cowlBase.scale.set(1.06, 1, 0.96);

  const cowlScarf = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.255, 0.11, 10), matCowl);
  cowlScarf.position.set(0, 0.055, 0.005);
  cowlScarf.scale.set(1.05, 1, 0.98);
  headGroup.add(cowlBase, cowlScarf);

  // Wajah bermasker abu-abu gelap (#2c333d) & bayangan (#0f1217) + mata cyan di dalam tudung
  const matFace = getRogueFaceMaterial();
  const headMaterials = [matHoodShadow, matHoodShadow, matHoodShadow, matHoodShadow, matFace, matHoodShadow];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.32, 0.30), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 0.23, 0.01);
  headGroup.add(headMesh);

  // Kubah puncak kepala tudung melengkung & miring landai ke belakang (bukan kotak kaku!)
  const hoodDome = new THREE.Mesh(new THREE.SphereGeometry(0.245, 12, 9), matHood);
  hoodDome.position.set(0, 0.28, -0.06);
  hoodDome.rotation.x = 0.20;
  hoodDome.scale.set(0.94, 1.05, 1.08);
  headGroup.add(hoodDome);

  // Ujung belakang tudung kain meruncing lembut ke arah belakang-bawah (soft hood tail)
  const hoodTailCone = new THREE.Mesh(new THREE.ConeGeometry(0.205, 0.35, 7), matHood);
  hoodTailCone.position.set(0, 0.29, -0.19);
  hoodTailCone.rotation.x = -Math.PI * 0.64;
  hoodTailCone.scale.set(0.95, 1.0, 0.68);
  headGroup.add(hoodTailCone);

  // Lipatan kain tengkuk melandai halus masuk ke kerah leher (menghilangkan sudut siku belakang)
  const hoodNapeDrape = new THREE.Mesh(new THREE.ConeGeometry(0.215, 0.29, 8), matHoodFold);
  hoodNapeDrape.position.set(0, 0.16, -0.15);
  hoodNapeDrape.rotation.x = -Math.PI * 0.78;
  hoodNapeDrape.scale.set(0.98, 1.0, 0.72);
  headGroup.add(hoodNapeDrape);

  // Dinding kain samping tipis menyusuri pipi ke arah kerah (tidak menggembung seperti helm)
  [-1, 1].forEach((sideSign) => {
    const cheekCloth = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.072, 0.40, 6), matHood);
    cheekCloth.position.set(sideSign * 0.172, 0.235, 0.045);
    cheekCloth.rotation.x = 0.14;
    cheekCloth.rotation.z = sideSign * -0.06;
    cheekCloth.scale.set(0.58, 1.0, 1.55);

    const sideFoldInner = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.058, 0.36, 6), matHoodFold);
    sideFoldInner.position.set(sideSign * 0.155, 0.23, 0.085);
    sideFoldInner.rotation.x = 0.16;
    sideFoldInner.rotation.z = sideSign * -0.05;
    sideFoldInner.scale.set(0.45, 1.0, 1.15);

    headGroup.add(cheekCloth, sideFoldInner);
  });

  // Lengkung kain dahi halus menghubungkan puncak kepala ke paruh elang depan
  const browArch = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.09, 10), matHood);
  browArch.position.set(0, 0.41, 0.08);
  browArch.rotation.x = 0.34;
  browArch.scale.set(0.98, 1.0, 0.85);
  headGroup.add(browArch);

  // Puncak paruh elang simetris & tajam di tengah dahi menaungi mata
  const beakGeo = new THREE.ConeGeometry(0.145, 0.23, 4);
  beakGeo.rotateY(Math.PI / 4);
  const hoodBeak = new THREE.Mesh(beakGeo, matHood);
  hoodBeak.position.set(0, 0.415, 0.19);
  hoodBeak.rotation.x = Math.PI * 0.67;
  hoodBeak.scale.set(1.22, 1.0, 0.38);
  headGroup.add(hoodBeak);

  root.add(headGroup);

  // ==========================================
  // 6. LENGAN RAPAT TORSO, PAULDRON SIMETRIS, VAMBRACE & BELATI REVERSE-GRIP
  // ==========================================

  // --- TANGAN KIRI (Dirapatkan x = -0.325 agar nol celah ketiak) ---
  const leftArmGroup = new THREE.Group();
  leftArmGroup.name = 'LeftArm'; // Node ini dibiarkan netral untuk engine
  leftArmGroup.position.set(-0.325, 1.42, 0.02);

  const leftArmPose = new THREE.Group();
  leftArmPose.name = 'LeftArmPose';
  leftArmPose.rotation.z = -0.08;
  leftArmPose.rotation.x = -0.16;
  leftArmPose.rotation.y = 0.16;

  // Sendi bahu & pelindung bahu (pauldron) kulit-logam simetris mengikuti kontur pundak
  const leftJoint = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.12, 0.145), matTunic);
  leftJoint.position.set(0, -0.02, 0);

  const leftPauldronCap = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.09, 0.19), matLeatherVest);
  leftPauldronCap.position.set(-0.01, 0.02, 0);
  leftPauldronCap.rotation.z = 0.20;

  const leftPauldronPlate = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.055, 0.175), matDarkMetal);
  leftPauldronPlate.position.set(-0.012, 0.052, 0);
  leftPauldronPlate.rotation.z = 0.20;

  const leftPauldronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.168, 0.022, 0.194), matCrimson);
  leftPauldronTrim.position.set(-0.01, -0.012, 0);
  leftPauldronTrim.rotation.z = 0.20;

  leftArmPose.add(leftJoint, leftPauldronCap, leftPauldronPlate, leftPauldronTrim);

  // Lengan & sarung tangan gelap
  const leftLimb = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.13), matTunic);
  leftLimb.position.set(0, -0.22, 0);
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.115, 0.122), matPants);
  leftHand.position.set(0, -0.43, 0.015);
  leftArmPose.add(leftLimb, leftHand);

  // Vambrace kulit-logam & Hidden Blade lengan kiri
  leftArmPose.add(createForearmVambrace(-1, matLeather, matDarkMetal, matSilver, matCyanGlow));

  // Belati Assassin Kiri gaya Reverse-Grip (mengarah serong ke bawah-belakang sejajar lengan)
  const leftDagger = createAssassinDagger(matLeather, matSilver, matCyanGlow, matBladeCore);
  leftDagger.position.set(-0.022, -0.435, 0.01);
  leftDagger.rotation.set(Math.PI * 0.78, 0.16, 0);
  leftArmPose.add(leftDagger);

  // Busur Horizontal Membujur
  const handBow = createSegmentedBow(matWood, matString, true);
  handBow.name = 'HandBow';
  handBow.position.set(0.04, -0.42, 0.04);
  handBow.rotation.set(-Math.PI / 2, 0, 0);
  handBow.visible = false;
  leftArmPose.add(handBow);

  leftArmGroup.add(leftArmPose);
  root.add(leftArmGroup);

  // --- TANGAN KANAN (Dirapatkan x = +0.325, simetris dengan bahu kiri) ---
  const rightArmGroup = new THREE.Group();
  rightArmGroup.name = 'RightArm';
  rightArmGroup.position.set(0.325, 1.42, 0.02);

  const rightArmPose = new THREE.Group();
  rightArmPose.name = 'RightArmPose';
  rightArmPose.rotation.z = 0.08;
  rightArmPose.rotation.x = 0.08;
  rightArmPose.rotation.y = -0.16;

  // Sendi bahu & pelindung bahu (pauldron) kulit-logam simetris
  const rightJoint = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.12, 0.145), matTunic);
  rightJoint.position.set(0, -0.02, 0);

  const rightPauldronCap = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.09, 0.19), matLeatherVest);
  rightPauldronCap.position.set(0.01, 0.02, 0);
  rightPauldronCap.rotation.z = -0.20;

  const rightPauldronPlate = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.055, 0.175), matDarkMetal);
  rightPauldronPlate.position.set(0.012, 0.052, 0);
  rightPauldronPlate.rotation.z = -0.20;

  const rightPauldronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.168, 0.022, 0.194), matCrimson);
  rightPauldronTrim.position.set(0.01, -0.012, 0);
  rightPauldronTrim.rotation.z = -0.20;

  rightArmPose.add(rightJoint, rightPauldronCap, rightPauldronPlate, rightPauldronTrim);

  // Lengan & sarung tangan gelap
  const rightLimb = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.13), matTunic);
  rightLimb.position.set(0, -0.22, 0);
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.115, 0.122), matPants);
  rightHand.position.set(0, -0.43, 0.015);
  rightArmPose.add(rightLimb, rightHand);

  // Vambrace kulit-logam & Hidden Blade lengan kanan
  rightArmPose.add(createForearmVambrace(1, matLeather, matDarkMetal, matSilver, matCyanGlow));

  // Belati Assassin Kanan gaya Reverse-Grip (mengarah serong ke bawah-belakang sejajar lengan)
  const rightDagger = createAssassinDagger(matLeather, matSilver, matCyanGlow, matBladeCore);
  rightDagger.position.set(0.022, -0.435, 0.01);
  rightDagger.rotation.set(Math.PI * 0.72, -0.16, 0);
  rightArmPose.add(rightDagger);

  rightArmGroup.add(rightArmPose);
  root.add(rightArmGroup);

  // Simpan referensi internal pada root untuk kebutuhan gameplay & animasi engine
  (root as any).leftLeg = leftLegGroup;
  (root as any).rightLeg = rightLegGroup;
  (root as any).leftKnee = leftKneeMesh;
  (root as any).rightKnee = rightKneeMesh;
  (root as any).leftArm = leftArmGroup;
  (root as any).rightArm = rightArmGroup;
  (root as any).body = torsoGroup;
  (root as any).head = headGroup;
  (root as any).cape = cloakGroup;
  (root as any).chestplate = vestPlate;
  (root as any).weapon = rightArmGroup;
  (root as any).leftWeapon = leftArmGroup;

  return root;
}

export function updateHunterWeaponStance(
  model: THREE.Group,
  stance: 'dagger' | 'bow',
  isSheathed: boolean = false,
  bowInHand: boolean = false
) {
  const backBow = model.getObjectByName('BackBow');
  const handBow = model.getObjectByName('HandBow');
  const bowArrow = model.getObjectByName('BowArrow');
  const arrowVortex = model.getObjectByName('ArrowVortex');
  const leftDagger = model.getObjectByName('LeftArm')?.getObjectByName('HandDagger');
  const rightDagger = model.getObjectByName('RightArm')?.getObjectByName('HandDagger');

  const leftArmPose = model.getObjectByName('LeftArmPose');
  const rightArmPose = model.getObjectByName('RightArmPose');

  if (bowArrow) {
    bowArrow.visible = false;
    bowArrow.position.set(0, 0, 0.02);
    bowArrow.rotation.set(Math.PI / 2, 0, 0);
  }
  if (arrowVortex) arrowVortex.visible = false;

  if (isSheathed) {
    // Mode Tersimpan (Ninja Sprint Auto-Sheathe):
    // Bebaskan kedua tangan, simpan busur di punggung & belati di pinggang
    if (handBow) handBow.visible = false;
    if (leftDagger) leftDagger.visible = false;
    if (rightDagger) rightDagger.visible = false;
    if (backBow) backBow.visible = true;

    // Pose lengan netral agar leluasa dikendalikan oleh animasi Shinobi Arm Sweep
    if (leftArmPose) {
      leftArmPose.rotation.set(0, 0, 0);
    }
    if (rightArmPose) {
      rightArmPose.rotation.set(0, 0, 0);
    }
    return;
  }

  if (stance === 'bow') {
    if (leftDagger) leftDagger.visible = false;
    if (rightDagger) rightDagger.visible = false;

    if (bowInHand) {
      // Mode Siap / Membidik / Menembak: Busur pindah dari punggung ke tangan kiri!
      if (backBow) backBow.visible = false;
      if (handBow) {
        handBow.visible = true;
        handBow.rotation.set(-Math.PI / 2, 0, 0);
      }
      if (leftArmPose) {
        leftArmPose.rotation.set(0.04, 0.02, -0.10);
      }
      if (rightArmPose) {
        rightArmPose.rotation.set(0, 0, 0);
      }
    } else {
      // Mode Idle / Jalan santai tanpa menyerang: Busur rapi tersampir di punggung
      if (backBow) backBow.visible = true;
      if (handBow) {
        handBow.visible = false;
        handBow.rotation.set(-Math.PI / 2, 0, 0);
      }
      if (leftArmPose) {
        leftArmPose.rotation.set(0, 0, 0);
      }
      if (rightArmPose) {
        rightArmPose.rotation.set(0, 0, 0);
      }
    }
  } else {
    // Mode Belati (Melee A-Pose Asli):
    if (backBow) backBow.visible = true;
    if (handBow) handBow.visible = false;
    if (leftDagger) leftDagger.visible = true;
    if (rightDagger) rightDagger.visible = true;

    // Kembalikan ke pose belati siap tempur yang rapat ke torso
    if (leftArmPose) {
      leftArmPose.rotation.set(-0.16, 0.16, -0.08);
    }
    if (rightArmPose) {
      rightArmPose.rotation.set(0.08, -0.16, 0.08);
    }
  }
}

/**
 * ============================================================================
 * PLAYER MESH BUILDER FOR GAME ENGINE (PlayerMeshObjects)
 * ============================================================================
 */
export function createBlockyHunterMesh(tier: number = 1): PlayerMeshObjects {
  const root = createHunterModel();
  const charClass: CharacterClass = 'rogue';

  const leftLeg = ((root as any).leftLeg || new THREE.Group()) as THREE.Group;
  const rightLeg = ((root as any).rightLeg || new THREE.Group()) as THREE.Group;
  const leftKnee = (root as any).leftKnee as THREE.Mesh | undefined;
  const rightKnee = (root as any).rightKnee as THREE.Mesh | undefined;
  const leftArm = ((root as any).leftArm || root.getObjectByName('LeftArm')) as THREE.Group;
  const rightArm = ((root as any).rightArm || root.getObjectByName('RightArm')) as THREE.Group;
  const body = ((root as any).body || root.getObjectByName('TorsoGroup')) as THREE.Mesh;
  if (body) {
    body.position.x = 0;
    body.rotation.set(0, 0, 0);
    body.rotation.reorder('YXZ');
  }
  const head = ((root as any).head || root.getObjectByName('HunterHeadGroup')) as THREE.Mesh;
  const cape = ((root as any).cape || root.getObjectByName('HunterCloak')) as THREE.Mesh;
  const weapon = ((root as any).weapon || rightArm) as THREE.Group;
  const leftWeapon = ((root as any).leftWeapon || leftArm) as THREE.Group;

  let hunterWeaponMode: 'dagger' | 'bow' = 'dagger';
  let isHunterSheathed = false;
  let isHunterBowInHand = false;
  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
    if (mode !== 'bow') isHunterBowInHand = false;
    updateHunterWeaponStance(root, mode, isHunterSheathed, isHunterBowInHand);
  };
  const setHunterSheathed = (sheathed: boolean) => {
    isHunterSheathed = sheathed;
    if (sheathed) isHunterBowInHand = false;
    updateHunterWeaponStance(root, hunterWeaponMode, sheathed, isHunterBowInHand);
  };
  const setHunterBowInHand = (inHand: boolean) => {
    isHunterBowInHand = inHand;
    updateHunterWeaponStance(root, hunterWeaponMode, isHunterSheathed, isHunterBowInHand);
  };

  updateHunterWeaponStance(root, hunterWeaponMode, false, false);

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
    leftKnee,
    rightKnee,
    weapon,
    leftWeapon,
    cape,
    body,
    head,
    charClass,
    tier,
    orbitingOrbs,
    rotation: root.rotation,
    wings,
    halo,
    halo2,
    auraRing,
    auraRing2,
    hunterWeaponMode,
    setHunterWeaponMode,
    setHunterSheathed,
    setHunterBowInHand,
  };
}

/**
 * ============================================================================
 * ANIMASI GERAK & STANCE HUNTER
 * ============================================================================
 */
export function animateHunterWalk(
  playerMesh: PlayerMeshObjects,
  walkTime: number,
  playerPosY: number,
  isMoving: boolean,
  isAttacking: boolean = false,
  hunterWeaponMode: 'dagger' | 'bow' = 'dagger',
  isSprinting: boolean = false,
  leanAngle: number = 0
): void {
  if (!playerMesh) return;

  if (isMoving) {
    if (isSprinting) {
      // ========================================================================
      // POSTUR & ANIMASI LARI ALA NINJA (SHINOBI RUN POSE)
      // ========================================================================
      // 1. Kemiringan Tubuh Rendah 32 derajat (0.56 rad)
      if (playerMesh.body) {
        playerMesh.body.rotation.reorder('YXZ');
        playerMesh.body.rotation.set(0.56, 0, 0);
      }
      // 2. Balas sudut pada kepala agar tatapan mata tetap lurus ke depan
      if (playerMesh.head) {
        playerMesh.head.rotation.set(-0.476, 0, 0); // -0.56 * 0.85
        playerMesh.head.position.set(0, 1.45, 0.16);
      }
      // 3. Langkah Kaki Cepat & Dinamis (tekukan lutut lebih tinggi)
      const legSwing = Math.sin(walkTime);
      if (playerMesh.leftLeg) playerMesh.leftLeg.rotation.set(legSwing * 0.95, 0, 0);
      if (playerMesh.rightLeg) playerMesh.rightLeg.rotation.set(-legSwing * 0.95, 0, 0);
      if (playerMesh.leftKnee) playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.85 : 0.15;
      if (playerMesh.rightKnee) playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.85 : 0.15;

      // 4. Kedua Lengan Terbentang ke Belakang (Shinobi Arm Sweep)
      if (!isAttacking) {
        const armWindSway = Math.sin(walkTime * 2.0) * 0.06;
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.set(1.05 + armWindSway, 0.05, -0.14);
          playerMesh.leftArm.position.set(-0.325, 1.39, 0.08);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.set(1.05 - armWindSway, -0.05, 0.14);
          playerMesh.rightArm.position.set(0.325, 1.39, 0.08);
        }
      }

      // 5. Ekor jubah menyapu ke belakang saat berlari cepat
      if (playerMesh.cape) {
        playerMesh.cape.rotation.set(0.55 + Math.abs(Math.sin(walkTime * 0.5)) * 0.15, 0, 0);
      }
      playerMesh.group.position.y = playerPosY;
    } else {
      // Normal moving walk
      if (playerMesh.body) {
        playerMesh.body.rotation.set(0, 0, 0);
      }
      if (playerMesh.head) {
        playerMesh.head.rotation.set(0, 0, 0);
        playerMesh.head.position.set(0, 1.50, 0);
      }
      const legSwing = Math.sin(walkTime);
      const armSwing = Math.cos(walkTime);

      if (playerMesh.leftLeg) playerMesh.leftLeg.rotation.set(legSwing * 0.75, 0, 0);
      if (playerMesh.rightLeg) playerMesh.rightLeg.rotation.set(-legSwing * 0.75, 0, 0);
      if (playerMesh.leftKnee) playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.4 : 0;
      if (playerMesh.rightKnee) playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.4 : 0;

      if (!isAttacking) {
        if (playerMesh.leftArm) {
          playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
          if (hunterWeaponMode === 'bow') {
            playerMesh.leftArm.rotation.set(0.04, 0.02, -0.08);
          } else {
            playerMesh.leftArm.rotation.set(-0.32 + armSwing * 0.42, 0, 0);
          }
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
          playerMesh.rightArm.rotation.set(-0.32 - armSwing * 0.42, 0, 0);
        }
      }

      if (playerMesh.cape) {
        playerMesh.cape.rotation.set(0.10 + Math.abs(Math.sin(walkTime * 0.5)) * 0.08, 0, 0);
      }
      playerMesh.group.position.y = playerPosY;
    }
  } else {
    // Mode Diam (Idle Stance)
    if (playerMesh.body) {
      playerMesh.body.rotation.set(0, 0, 0);
    }
    if (playerMesh.head) {
      playerMesh.head.rotation.set(0, 0, 0);
      playerMesh.head.position.set(0, 1.50, 0);
    }
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, 0.25);
      playerMesh.leftLeg.rotation.y = 0;
      playerMesh.leftLeg.rotation.z = 0;
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, 0.25);
      playerMesh.rightLeg.rotation.y = 0;
      playerMesh.rightLeg.rotation.z = 0;
    }
    if (playerMesh.leftKnee) {
      playerMesh.leftKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.leftKnee.rotation.x, 0, 0.25);
    }
    if (playerMesh.rightKnee) {
      playerMesh.rightKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.rightKnee.rotation.x, 0, 0.25);
    }

    if (!isAttacking) {
      if (playerMesh.leftArm) {
        playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
        if (hunterWeaponMode === 'bow') {
          playerMesh.leftArm.rotation.set(0.04, 0.02, -0.08);
        } else {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0, 0.25);
          playerMesh.leftArm.rotation.y = 0;
          playerMesh.leftArm.rotation.z = 0;
        }
      }
      if (playerMesh.rightArm) {
        playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0, 0.25);
        playerMesh.rightArm.rotation.y = 0;
        playerMesh.rightArm.rotation.z = 0;
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.set(0.09 + Math.sin(walkTime * 2.0) * 0.015, 0, 0);
    }

    playerMesh.group.position.y = playerPosY;
  }
}

/**
 * ============================================================================
 * ANIMASI MEMBIDIK & MENARIK BUSUR HUNTER (PROGRESSIVE BOW CHARGE)
 * ============================================================================
 */
export function animateHunterBowAim(
  playerMesh: PlayerMeshObjects,
  chargeRatio: number,
  isMoving: boolean,
  walkCycle: number,
  delta: number,
  showArrow: boolean = true
): void {
  if (!playerMesh) return;

  // KUNCI: Badan tegak, bahu sedikit menyamping alami saat pose memanah
  if (playerMesh.body) {
    playerMesh.body.rotation.set(0, 0.22, 0);
  }
  if (playerMesh.head) {
    playerMesh.head.rotation.set(0, -0.20, 0);
  }
  if (playerMesh.group) {
    playerMesh.group.rotation.x = 0;
    playerMesh.group.rotation.z = 0;
  }
  if (playerMesh.rotation) {
    playerMesh.rotation.x = 0;
    playerMesh.rotation.z = 0;
  }

  // Sembunyikan BackBow saat busur diangkat ke tangan kiri
  const backBow = playerMesh.group?.getObjectByName('BackBow');
  if (backBow) backBow.visible = false;

  // 1. LENGAN KIRI: Mengangkat busur sejajar bahu lurus ke depan menuju target
  if (playerMesh.leftArm) {
    playerMesh.leftArm.rotation.set(-Math.PI * 0.48, 0.16, -0.06);
  }

  // Sesuaikan pose handBow agar berdiri tegak menghadap lurus ke depan
  const handBow = playerMesh.group?.getObjectByName('HandBow');
  if (handBow) {
    handBow.visible = true;
    handBow.rotation.set(0, 0, -0.15); // Vertikal alami dengan sedikit kemiringan ~8 derajat
  }

  // 2. LENGAN KANAN: Menarik / melepas senar ke belakang menuju pipi/bahu
  if (playerMesh.rightArm) {
    playerMesh.rightArm.rotation.set(
      -Math.PI * 0.45,
      -0.15 - chargeRatio * 0.40,
      0.15 + chargeRatio * 0.32
    );
  }

  // 3. ANAK PANAH PADA BUSUR: Tampil saat membidik/menarik senar, sembunyi sesaat setelah dilepas
  const bowArrow = playerMesh.group?.getObjectByName('BowArrow');
  if (bowArrow) {
    bowArrow.visible = showArrow;
    bowArrow.rotation.set(Math.PI / 2, 0, 0);
    bowArrow.position.set(0, chargeRatio * 0.18, 0.02);
  }

  // 4. PUSARAN ANGIN ZAMRUD BERCAHAYA: Muncul di ujung mata panah saat bowChargeRatio >= 0.85
  const vortex = playerMesh.group?.getObjectByName('ArrowVortex');
  if (vortex) {
    const isFullCharge = chargeRatio >= 0.85;
    vortex.visible = isFullCharge;
    if (isFullCharge) {
      vortex.rotation.z += delta * 18.0;
    }
  }

  // 5. KAKI: Strafe walk (65% kecepatan) jika bergerak, atau berdiri tegak jika diam
  if (isMoving) {
    const legSwing = Math.sin(walkCycle) * 0.50;
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.set(legSwing, 0, 0);
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.set(-legSwing, 0, 0);
    }
    if (playerMesh.leftKnee) {
      playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.30 : 0;
    }
    if (playerMesh.rightKnee) {
      playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.30 : 0;
    }
  } else {
    if (playerMesh.leftLeg) {
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, 0.25);
      playerMesh.leftLeg.rotation.y = 0;
      playerMesh.leftLeg.rotation.z = 0;
    }
    if (playerMesh.rightLeg) {
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, 0.25);
      playerMesh.rightLeg.rotation.y = 0;
      playerMesh.rightLeg.rotation.z = 0;
    }
    if (playerMesh.leftKnee) {
      playerMesh.leftKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.leftKnee.rotation.x, 0, 0.25);
    }
    if (playerMesh.rightKnee) {
      playerMesh.rightKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.rightKnee.rotation.x, 0, 0.25);
    }
  }

  if (playerMesh.cape) {
    playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.15, 0.20);
  }
}
