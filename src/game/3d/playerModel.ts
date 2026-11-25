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
    // Anak Panah Siap Tembak (Nocked Arrow): menempel di antara tangan kiri (busur) & tangan kanan (senar)
    // Mengarah lurus ke depan sumbu -Z lokal busur (dari senar di +Z menuju gagang/target di -Z)
    const arrowGroup = new THREE.Group();
    arrowGroup.name = 'BowArrow';
    arrowGroup.visible = false;

    const matArrowWood = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const matArrowHead = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.6,
      metalness: 0.7,
      roughness: 0.18,
    });
    const matFletchRed = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
    const matFletchWhite = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const matWindGlow = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
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

    // Batang panah ramping membujur dari senar (+0.34) ke depan gagang (-0.46)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.82, 6), matArrowWood);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0, -0.06);
    arrowGroup.add(shaft);

    // Ujung mata panah cyan bercahaya tajam menghadap target (-Z_bow)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.16, 4), matArrowHead);
    tip.rotation.x = -Math.PI / 2;
    tip.position.set(0, 0, -0.50);
    arrowGroup.add(tip);

    // Bulu ekor merah-putih menempel di dekat senar cyan (+Z_bow)
    const fletch1 = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.11, 0.01), matFletchRed);
    fletch1.position.set(0, 0, 0.30);
    const fletch2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.11, 0.065), matFletchWhite);
    fletch2.position.set(0, 0, 0.30);
    arrowGroup.add(fletch1, fletch2);

    // Pusaran Angin / Energi Bercahaya di Ujung Mata Panah saat Hold Charge tinggi
    const vortexGroup = new THREE.Group();
    vortexGroup.name = 'ArrowVortex';
    vortexGroup.position.set(0, 0, -0.54);
    vortexGroup.visible = false;

    const ringOuter = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.24, 16), matWindGlow);
    const ringInner = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.13, 12), matGoldCore);
    ringInner.position.z = 0.01;

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
  const matHood = new THREE.MeshStandardMaterial({ color: 0x232a36, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide });
  const matHoodFold = new THREE.MeshStandardMaterial({ color: 0x181d26, roughness: 0.94, metalness: 0.02, side: THREE.DoubleSide });
  const matCowl = new THREE.MeshStandardMaterial({ color: 0x262e3c, roughness: 0.90, metalness: 0.02, side: THREE.DoubleSide });
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

    // Sarung belati menempel rapi di pinggang/paha luar + gagang belati tersarung (tersembunyi saat dicabut)
    const thighSheath = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.25, 0.092), matLeather);
    thighSheath.position.set(sideSign * 0.11, -0.17, 0.01);
    const sheathTrim = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.028, 0.096), matDarkMetal);
    sheathTrim.position.set(sideSign * 0.11, -0.055, 0.01);

    const hipDaggerHilt = new THREE.Group();
    hipDaggerHilt.name = 'HipDaggerHilt';
    const sheathGuard = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.095), matSilver);
    sheathGuard.position.set(sideSign * 0.115, -0.038, 0.01);
    const sheathGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 6), matLeather);
    sheathGrip.position.set(sideSign * 0.115, 0.008, 0.01);
    const sheathPommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), matSilver);
    sheathPommel.position.set(sideSign * 0.115, 0.058, 0.01);
    hipDaggerHilt.add(sheathGuard, sheathGrip, sheathPommel);

    legPivot.add(leg, knee, boot, bootCuff, bootStrap, thighSheath, sheathTrim, hipDaggerHilt);
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

  // Pengikat sabuk punggung + Tabung Quiver & Busur Recurve pipih sejajar punggung (Zero Clipping!)
  const backMountStrap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.036), matLeather);
  backMountStrap.position.set(0.01, 0.04, -0.184);
  backMountStrap.rotation.z = 0.65;
  torsoGroup.add(backMountStrap);

  // 1) Tabung anak panah (Quiver) kulit cokelat tua menempel rapat di punggung atas (depan lapisan busur)
  const quiverGroup = new THREE.Group();
  quiverGroup.name = 'Quiver';
  quiverGroup.position.set(0.085, 0.045, -0.228);
  quiverGroup.rotation.set(0.02, 0, -0.52);

  const quiverBody = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.036, 0.48, 8), matLeather);
  const quiverCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.052, 0.055, 8), matDarkMetal);
  quiverCollar.position.set(0, 0.22, 0);
  const quiverBand = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.045, 0.045, 8), matCrimson);
  quiverBand.position.set(0, 0.07, 0);
  quiverGroup.add(quiverBody, quiverCollar, quiverBand);

  // 4 Ekor Anak Panah (fletching merah & putih) menyembul rapi di atas bahu kanan
  const fletchSpecs: [number, number, boolean][] = [
    [-0.020, 0.014, true],
    [0.0, -0.015, false],
    [0.020, 0.012, true],
    [0.008, 0.022, false],
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

  // 2) Busur Recurve pipih sejajar bidang XY punggung (rotation.y = Math.PI/2 di dalam holder diagonal z = +0.65 rad)
  // Diposisikan lebih luar di belakang Quiver (offset Z ekstra) sehingga 100% tipis dari samping & bebas tembus
  const backBowHolder = new THREE.Group();
  backBowHolder.name = 'BackBow';
  backBowHolder.position.set(-0.02, 0.03, -0.312);
  backBowHolder.rotation.set(0, 0, 0.65);

  const backBowMesh = createSegmentedBow(matWood, matString);
  backBowMesh.scale.set(0.80, 0.80, 0.80);
  backBowMesh.rotation.set(0, Math.PI / 2, 0); // Putar bidang kurva busur 90° agar rata pipih sejajar punggung!
  backBowHolder.add(backBowMesh);
  torsoGroup.add(backBowHolder);

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
  // 5. KEPALA & TUDUNG KAIN BERONGGA GAYA ASSASSIN'S CREED (ALTAIIR PEAKED HOOD - ZERO SPHERE)
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'HunterHeadGroup';
  headGroup.position.set(0, 1.50, 0);

  // Kerah kain berlapis melingkari bahu & leher (draped cowl)
  const cowlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.325, 0.135, 10), matHoodFold);
  cowlBase.position.set(0, -0.005, -0.015);
  cowlBase.scale.set(1.08, 1, 0.98);

  const cowlScarf = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.268, 0.115, 10), matCowl);
  cowlScarf.position.set(0, 0.068, -0.002);
  cowlScarf.rotation.x = 0.10;
  cowlScarf.scale.set(1.06, 1, 1.00);
  headGroup.add(cowlBase, cowlScarf);

  // Lipatan kerah selendang menyilang depan di atas dada (draped front cowl folds)
  [-1, 1].forEach((sideSign) => {
    const cowlLapel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.085, 0.16), sideSign < 0 ? matCowl : matHoodFold);
    cowlLapel.position.set(sideSign * 0.105, 0.005, 0.105);
    cowlLapel.rotation.set(0.26, sideSign * -0.25, sideSign * -0.34);
    headGroup.add(cowlLapel);
  });

  // Wajah bermasker gelap & bayangan tudung + kedua mata cyan (#00e5ff) di dalam rongga tudung
  // Dimensi kotak kepala: X in [-0.145, 0.145], Y in [0.07, 0.39], Z in [-0.14, 0.16]
  const matFace = getRogueFaceMaterial();
  const headMaterials = [matHoodShadow, matHoodShadow, matHoodShadow, matHoodShadow, matFace, matHoodShadow];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.32, 0.30), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 0.23, 0.01);
  headGroup.add(headMesh);

  // Bangun Cangkang Tudung Kain Berongga di Depan (BufferGeometry terstruktur: bingkai V terbalik + paruh elang + ekor kain landai)
  // Koordinat tepi depan dijaga 100% di luar kotak wajah agar 0% clipping & mata cyan terlihat tajam
  const createDrapedHoodShellGeometry = (inset: number): THREE.BufferGeometry => {
    // Setiap cross-section memiliki 9 simpul simetris dari kiri bawah -> kiri pipi -> pelipis -> puncak -> pelipis kanan -> kanan bawah:
    // Urutan simpul ring: [0:BL, 1:ML, 2:TL, 3:AL, 4:C(Center Ridge), 5:AR, 6:TR, 7:MR, 8:BR]
    const lerpInset = (v: [number, number, number], target: [number, number, number], k: number): [number, number, number] => [
      v[0] + (target[0] - v[0]) * k,
      v[1] + (target[1] - v[1]) * k,
      v[2] + (target[2] - v[2]) * k,
    ];
    const centerAnchor: [number, number, number] = [0, 0.22, -0.02];

    const rawRing1: [number, number, number][] = [
      [-0.215, 0.058, 0.130], // 0 BL: leher-pipi kiri
      [-0.190, 0.195, 0.168], // 1 ML: dinding pipi luar kiri (Z=0.168, |X|=0.190 > 0.145)
      [-0.172, 0.325, 0.188], // 2 TL: pelipis kiri atas
      [-0.088, 0.388, 0.225], // 3 AL: bahu kubah V kiri
      [0.0, 0.314, 0.262],    // 4 C:  ujung PARUH ELANG (menjorok depan Z=0.262, Y=0.314 di atas alis!)
      [0.088, 0.388, 0.225],  // 5 AR: bahu kubah V kanan
      [0.172, 0.325, 0.188],  // 6 TR: pelipis kanan atas
      [0.190, 0.195, 0.168],  // 7 MR: dinding pipi luar kanan
      [0.215, 0.058, 0.130],  // 8 BR: leher-pipi kanan
    ];

    const rawRing2: [number, number, number][] = [
      [-0.228, 0.068, 0.025], // 0 BL
      [-0.205, 0.225, 0.035], // 1 ML
      [-0.176, 0.382, 0.045], // 2 TL
      [-0.095, 0.438, 0.065], // 3 AL
      [0.0, 0.478, 0.055],    // 4 C: Puncak atap kain tajam (bukan bola bulat)
      [0.095, 0.438, 0.065],  // 5 AR
      [0.176, 0.382, 0.045],  // 6 TR
      [0.205, 0.225, 0.035],  // 7 MR
      [0.228, 0.068, 0.025],  // 8 BR
    ];

    const rawRing3: [number, number, number][] = [
      [-0.238, 0.065, -0.145], // 0 BL
      [-0.210, 0.215, -0.165], // 1 ML
      [-0.170, 0.342, -0.170], // 2 TL
      [-0.085, 0.398, -0.178], // 3 AL
      [0.0, 0.422, -0.178],    // 4 C: Lipatan punggung atas landai ke belakang
      [0.085, 0.398, -0.178],  // 5 AR
      [0.170, 0.342, -0.170],  // 6 TR
      [0.210, 0.215, -0.165],  // 7 MR
      [0.238, 0.065, -0.145],  // 8 BR
    ];

    // Ring 4: Ujung kain belakang tengkuk menyudut meruncing (draped hood tail) lalu turun ke kerah
    const rawRing4: [number, number, number][] = [
      [-0.185, 0.060, -0.205], // 0 BL
      [-0.155, 0.145, -0.235], // 1 ML
      [-0.115, 0.225, -0.255], // 2 TL
      [-0.055, 0.268, -0.272], // 3 AL
      [0.0, 0.285, -0.282],    // 4 C: Ujung lancip ekor tudung di tengkuk
      [0.055, 0.268, -0.272],  // 5 AR
      [0.115, 0.225, -0.255],  // 6 TR
      [0.155, 0.145, -0.235],  // 7 MR
      [0.185, 0.060, -0.205],  // 8 BR
    ];

    const rings = [rawRing1, rawRing2, rawRing3, rawRing4].map((ring, rIdx) =>
      ring.map((v) => {
        if (inset === 0) return v;
        // Untuk ring belakang, sedikit lebih pendek ke depan agar ketebalan tidak menembus belakang
        const p = lerpInset(v, centerAnchor, inset);
        if (rIdx === 0) p[2] -= 0.008;
        return p;
      })
    );

    const positions: number[] = [];
    const indices: number[] = [];
    const ringLen = 9;

    rings.forEach((ring) => {
      ring.forEach((v) => positions.push(v[0], v[1], v[2]));
    });

    // Hubungkan Ring r -> Ring r+1 (outward winding agar pencahayaan lipatan kain tepat)
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < ringLen - 1; i++) {
        const a = r * ringLen + i;
        const b = r * ringLen + i + 1;
        const c = (r + 1) * ringLen + i;
        const d = (r + 1) * ringLen + i + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    // Tutup lembut bagian paling bawah-belakang tudung masuk ke kerah leher
    const napeAnchorIdx = positions.length / 3;
    const napeZ = inset === 0 ? -0.205 : -0.185;
    positions.push(0, 0.055, napeZ);
    const lastRingStart = 3 * ringLen;
    for (let i = 0; i < ringLen - 1; i++) {
      indices.push(lastRingStart + i, lastRingStart + i + 1, napeAnchorIdx);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    // Pisahkan vertex per segitiga agar lipatan kain arang tampil bersudut tegas bergaya Altaïr
    const nonIndexed = geom.toNonIndexed();
    geom.dispose();
    nonIndexed.computeVertexNormals();
    return nonIndexed;
  };

  const outerHoodMesh = new THREE.Mesh(createDrapedHoodShellGeometry(0), matHood);
  outerHoodMesh.name = 'DrapedHoodOuter';
  const innerHoodMesh = new THREE.Mesh(createDrapedHoodShellGeometry(0.085), matHoodFold);
  innerHoodMesh.name = 'DrapedHoodInner';
  headGroup.add(outerHoodMesh, innerHoodMesh);

  // Jahitan lipatan paruh tengah (dorsal crest + beak bridge ridge) agar tepi V & paruh elang tajam di puncak kepala
  const beakCrestGeo = new THREE.ConeGeometry(0.068, 0.19, 4);
  beakCrestGeo.rotateY(Math.PI / 4);
  const beakCrest = new THREE.Mesh(beakCrestGeo, matHood);
  beakCrest.position.set(0, 0.392, 0.215);
  beakCrest.rotation.x = Math.PI * 0.72;
  beakCrest.scale.set(1.15, 1.0, 0.48);
  headGroup.add(beakCrest);

  // Garis tepi kain depan tipis di kiri-kanan bukaan wajah untuk ketebalan ekstra (frame huruf V terbalik)
  [-1, 1].forEach((sideSign) => {
    const cheekTrim = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.29, 0.042), matHoodFold);
    cheekTrim.position.set(sideSign * 0.184, 0.205, 0.168);
    cheekTrim.rotation.set(0.11, sideSign * 0.14, sideSign * -0.09);
    headGroup.add(cheekTrim);
  });

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

  // Busur di Tangan Kiri (Berdiri VERTIKAL saat standby & memanah — DILARANG tidur horizontal!)
  const handBow = createSegmentedBow(matWood, matString, true);
  handBow.name = 'HandBow';
  handBow.position.set(0.02, -0.43, 0.03);
  handBow.rotation.set(0.20, Math.PI, 0.18);
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
  isSheathed: boolean = true,
  bowInHand: boolean = false
) {
  const backBow = model.getObjectByName('BackBow');
  const handBow = model.getObjectByName('HandBow');
  const bowArrow = model.getObjectByName('BowArrow');
  const arrowVortex = model.getObjectByName('ArrowVortex');
  const leftDagger = model.getObjectByName('LeftArm')?.getObjectByName('HandDagger');
  const rightDagger = model.getObjectByName('RightArm')?.getObjectByName('HandDagger');
  const leftHipDagger = model.getObjectByName('Leg_Left')?.getObjectByName('HipDaggerHilt');
  const rightHipDagger = model.getObjectByName('Leg_Right')?.getObjectByName('HipDaggerHilt');

  const leftArmPose = model.getObjectByName('LeftArmPose');
  const rightArmPose = model.getObjectByName('RightArmPose');

  if (bowArrow) {
    bowArrow.visible = false;
    bowArrow.position.set(0, 0, 0);
    bowArrow.rotation.set(0, 0, 0);
  }
  if (arrowVortex) arrowVortex.visible = false;

  if (isSheathed) {
    // MODE SANTAI / HANDLESS (isWeaponDrawn === false):
    // Kedua tangan 100% kosong, busur rapi di punggung & belati tersarung di pinggang/paha
    if (handBow) handBow.visible = false;
    if (leftDagger) leftDagger.visible = false;
    if (rightDagger) rightDagger.visible = false;
    if (backBow) backBow.visible = true;
    if (leftHipDagger) leftHipDagger.visible = true;
    if (rightHipDagger) rightHipDagger.visible = true;

    if (leftArmPose) leftArmPose.rotation.set(0, 0, 0);
    if (rightArmPose) rightArmPose.rotation.set(0, 0, 0);
    return;
  }

  if (stance === 'bow') {
    // MODE SIAGA BUSUR (isWeaponDrawn === true):
    // Busur langsung dipegang VERTIKAL di tangan kiri, BackBow tersembunyi, belati tetap tersarung
    if (leftDagger) leftDagger.visible = false;
    if (rightDagger) rightDagger.visible = false;
    if (leftHipDagger) leftHipDagger.visible = true;
    if (rightHipDagger) rightHipDagger.visible = true;
    if (backBow) backBow.visible = false;

    if (handBow) {
      handBow.visible = true;
      // Di standby (belum menarik tali), busur berdiri tegak serong alami di sisi tangan kiri
      if (bowInHand) {
        handBow.rotation.set(-Math.PI / 2, 0, 0.21);
      } else {
        handBow.rotation.set(0.20, Math.PI, 0.18);
      }
    }
    if (leftArmPose) {
      leftArmPose.rotation.set(0, 0, 0);
    }
    if (rightArmPose) {
      rightArmPose.rotation.set(0, 0, 0);
    }
  } else {
    // MODE SIAGA BELATI (isWeaponDrawn === true):
    // Belati kembar aktif dalam reverse-grip, gagang di sarung pinggang disembunyikan, busur tetap di punggung
    if (backBow) backBow.visible = true;
    if (handBow) handBow.visible = false;
    if (leftDagger) leftDagger.visible = true;
    if (rightDagger) rightDagger.visible = true;
    if (leftHipDagger) leftHipDagger.visible = false;
    if (rightHipDagger) rightHipDagger.visible = false;

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
  let isHunterSheathed = true; // Default Open-World: Mode Santai / Handless sampai menyerang atau menekan X/T
  let isHunterBowInHand = false;
  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
    isHunterSheathed = false;
    isHunterBowInHand = mode === 'bow';
    updateHunterWeaponStance(root, mode, isHunterSheathed, isHunterBowInHand);
  };
  const setHunterSheathed = (sheathed: boolean) => {
    isHunterSheathed = sheathed;
    isHunterBowInHand = !sheathed && hunterWeaponMode === 'bow';
    updateHunterWeaponStance(root, hunterWeaponMode, sheathed, isHunterBowInHand);
  };
  const setHunterBowInHand = (inHand: boolean) => {
    isHunterBowInHand = inHand;
    if (inHand) isHunterSheathed = false;
    updateHunterWeaponStance(root, hunterWeaponMode, isHunterSheathed, isHunterBowInHand);
  };
  const setHunterWeaponDrawn = (drawn: boolean) => {
    isHunterSheathed = !drawn;
    isHunterBowInHand = drawn && hunterWeaponMode === 'bow';
    updateHunterWeaponStance(root, hunterWeaponMode, isHunterSheathed, isHunterBowInHand);
  };

  updateHunterWeaponStance(root, hunterWeaponMode, true, false);

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
    setHunterWeaponDrawn,
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
      // POSTUR & ANIMASI LARI CEPAT AGILE ASSASSIN (DYNAMIC LEAN & ATHLETIC PUMP)
      // ========================================================================
      // 1. Condong ke depan dinamis ~19.5° (0.34 rad) dengan transisi lerp halus
      if (playerMesh.body) {
        playerMesh.body.rotation.reorder('YXZ');
        playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0.34, 0.25);
        playerMesh.body.rotation.z = THREE.MathUtils.lerp(playerMesh.body.rotation.z, 0, 0.25);
      }
      // 2. Kepala mengompensasi sedikit mendongak agar pandangan tetap lurus tajam
      if (playerMesh.head) {
        playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, -0.18, 0.25);
        playerMesh.head.position.x = 0;
        playerMesh.head.position.y = THREE.MathUtils.lerp(playerMesh.head.position.y, 1.48, 0.25);
        playerMesh.head.position.z = THREE.MathUtils.lerp(playerMesh.head.position.z, 0.09, 0.25);
      }
      // 3. Stride langkah lebar cepat dengan tekukan lutut atletis & pantulan vertikal (bobbing) halus
      const legSwing = Math.sin(walkTime);
      const sprintBob = Math.abs(Math.sin(walkTime)) * 0.06;
      if (playerMesh.leftLeg) playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing * 0.96, 0.35);
      if (playerMesh.rightLeg) playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing * 0.96, 0.35);
      if (playerMesh.leftKnee) playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.78 : 0.14;
      if (playerMesh.rightKnee) playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.78 : 0.14;

      // 4. Ayunan lengan atletis berlawanan dengan kaki (siku ditekuk & belati mengarah belakang-bawah)
      if (!isAttacking) {
        const armSwing = Math.cos(walkTime);
        if (playerMesh.leftArm) {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0.34 - armSwing * 0.56, 0.32);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.14, 0.25);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, -0.12, 0.25);
          playerMesh.leftArm.position.set(-0.325, 1.40, 0.04);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0.34 + armSwing * 0.56, 0.32);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.14, 0.25);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0.12, 0.25);
          playerMesh.rightArm.position.set(0.325, 1.40, 0.04);
        }
      }

      // 5. Kibaran ekor jubah belakang mengikuti kecepatan lari
      if (playerMesh.cape) {
        const targetCape = 0.44 + Math.abs(Math.sin(walkTime * 0.5)) * 0.14;
        playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, targetCape, 0.28);
      }
      playerMesh.group.position.y = playerPosY + sprintBob;
    } else {
      // Normal moving walk (transisi mulus dengan lerp)
      if (playerMesh.body) {
        playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0, 0.25);
        playerMesh.body.rotation.z = THREE.MathUtils.lerp(playerMesh.body.rotation.z, 0, 0.25);
      }
      if (playerMesh.head) {
        playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0, 0.25);
        playerMesh.head.rotation.y = THREE.MathUtils.lerp(playerMesh.head.rotation.y, 0, 0.25);
        playerMesh.head.rotation.z = THREE.MathUtils.lerp(playerMesh.head.rotation.z, 0, 0.25);
        playerMesh.head.position.x = 0;
        playerMesh.head.position.y = THREE.MathUtils.lerp(playerMesh.head.position.y, 1.50, 0.25);
        playerMesh.head.position.z = THREE.MathUtils.lerp(playerMesh.head.position.z, 0, 0.25);
      }
      const legSwing = Math.sin(walkTime);
      const armSwing = Math.cos(walkTime);

      if (playerMesh.leftLeg) playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing * 0.75, 0.35);
      if (playerMesh.rightLeg) playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing * 0.75, 0.35);
      if (playerMesh.leftKnee) playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.4 : 0;
      if (playerMesh.rightKnee) playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.4 : 0;

      if (!isAttacking) {
        if (playerMesh.leftArm) {
          playerMesh.leftArm.position.set(-0.325, 1.42, 0.02);
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.32 + armSwing * 0.42, 0.3);
          playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.25);
          playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0, 0.25);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
          playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.32 - armSwing * 0.42, 0.3);
          playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.25);
          playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0, 0.25);
        }
      }

      if (playerMesh.cape) {
        playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.12 + Math.abs(Math.sin(walkTime * 0.5)) * 0.08, 0.25);
      }
      playerMesh.group.position.y = playerPosY;
    }
  } else {
    // Mode Diam (Idle Stance dengan transisi lerp halus)
    if (playerMesh.body) {
      playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0, 0.25);
      playerMesh.body.rotation.z = THREE.MathUtils.lerp(playerMesh.body.rotation.z, 0, 0.25);
    }
    if (playerMesh.head) {
      playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0, 0.25);
      playerMesh.head.rotation.y = THREE.MathUtils.lerp(playerMesh.head.rotation.y, 0, 0.25);
      playerMesh.head.rotation.z = THREE.MathUtils.lerp(playerMesh.head.rotation.z, 0, 0.25);
      playerMesh.head.position.x = 0;
      playerMesh.head.position.y = THREE.MathUtils.lerp(playerMesh.head.position.y, 1.50, 0.25);
      playerMesh.head.position.z = THREE.MathUtils.lerp(playerMesh.head.position.z, 0, 0.25);
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
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0, 0.25);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0, 0.25);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0, 0.25);
      }
      if (playerMesh.rightArm) {
        playerMesh.rightArm.position.set(0.325, 1.42, 0.02);
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0, 0.25);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.25);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0, 0.25);
      }
    }
    if (playerMesh.cape) {
      playerMesh.cape.rotation.x = THREE.MathUtils.lerp(
        playerMesh.cape.rotation.x,
        0.09 + Math.sin(walkTime * 2.0) * 0.015,
        0.25
      );
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

  // 1. TORSO MENYAMPING (~0.55 rad / ~31.5°): Bahu kiri menunjuk target, kepala menoleh balik fokus ke musuh
  if (playerMesh.body) {
    playerMesh.body.rotation.reorder('YXZ');
    playerMesh.body.rotation.set(0, 0.55, 0);
  }
  if (playerMesh.head) {
    playerMesh.head.rotation.set(0, -0.50, 0);
    playerMesh.head.position.set(0, 1.50, 0);
  }
  if (playerMesh.group) {
    playerMesh.group.rotation.x = 0;
    playerMesh.group.rotation.z = 0;
  }
  if (playerMesh.rotation) {
    playerMesh.rotation.x = 0;
    playerMesh.rotation.z = 0;
  }

  // Pastikan BackBow tersembunyi & HandBow aktif di tangan kiri
  const backBow = playerMesh.group?.getObjectByName('BackBow');
  if (backBow) backBow.visible = false;

  const leftArmPose = playerMesh.group?.getObjectByName('LeftArmPose');
  if (leftArmPose) leftArmPose.rotation.set(0, 0, 0);
  const rightArmPose = playerMesh.group?.getObjectByName('RightArmPose');
  if (rightArmPose) rightArmPose.rotation.set(0, 0, 0);

  // Getaran tegangan halus saat full hold charge (>= 0.75)
  const drawJitter = chargeRatio >= 0.75 ? Math.sin(performance.now() * 0.045) * 0.014 : 0;

  // 2. LENGAN KIRI: Lurus menjulur ke depan memegang gagang busur VERTIKAL (~12° natural cant)
  if (playerMesh.leftArm) {
    playerMesh.leftArm.position.set(-0.27, 1.42, 0.16);
    playerMesh.leftArm.rotation.set(-Math.PI * 0.48 + drawJitter * 0.4, 0.10, -0.05);
  }

  // WAJIB VERTIKAL: Lengkung kayu menghadap depan (+Z_world), tali cyan di belakang (-Z_world), miring ~12° (0.21 rad)
  const handBow = playerMesh.group?.getObjectByName('HandBow');
  if (handBow) {
    handBow.visible = true;
    handBow.rotation.set(-Math.PI / 2, 0, 0.21);
  }

  // 3. LENGAN KANAN: Terangkat setinggi bahu/pipi, menarik senar & ekor panah mundur
  if (playerMesh.rightArm) {
    playerMesh.rightArm.position.set(0.28, 1.42, -0.10);
    playerMesh.rightArm.rotation.set(
      -Math.PI * 0.44 + drawJitter,
      -0.20 - chargeRatio * 0.36,
      0.24 + chargeRatio * 0.30
    );
  }

  // 4. NOCKED ARROW: Menempel lurus antara busur & tangan penarik tali, menghilang tepat saat melesat
  const bowArrow = playerMesh.group?.getObjectByName('BowArrow');
  if (bowArrow) {
    bowArrow.visible = showArrow;
    bowArrow.rotation.set(0, 0, 0);
    bowArrow.position.set(0, 0, chargeRatio * 0.20);
  }

  // 5. PUSARAN ENERGI DI UJUNG PANAH: Aktif saat tarikan >= 0.85
  const vortex = playerMesh.group?.getObjectByName('ArrowVortex');
  if (vortex) {
    const isFullCharge = showArrow && chargeRatio >= 0.85;
    vortex.visible = isFullCharge;
    if (isFullCharge) {
      vortex.rotation.z += delta * 18.0;
    }
  }

  // 6. KAKI: Strafe walk (65% kecepatan) jika bergerak, atau berdiri sigap jika diam
  if (isMoving) {
    const legSwing = Math.sin(walkCycle) * 0.50;
    if (playerMesh.leftLeg) playerMesh.leftLeg.rotation.set(legSwing, 0, 0);
    if (playerMesh.rightLeg) playerMesh.rightLeg.rotation.set(-legSwing, 0, 0);
    if (playerMesh.leftKnee) playerMesh.leftKnee.rotation.x = legSwing > 0 ? legSwing * 0.30 : 0;
    if (playerMesh.rightKnee) playerMesh.rightKnee.rotation.x = legSwing < 0 ? -legSwing * 0.30 : 0;
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
    if (playerMesh.leftKnee) playerMesh.leftKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.leftKnee.rotation.x, 0, 0.25);
    if (playerMesh.rightKnee) playerMesh.rightKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.rightKnee.rotation.x, 0, 0.25);
  }

  if (playerMesh.cape) {
    playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.15, 0.20);
  }
}

/**
 * ============================================================================
 * FASE 1 BADAI PANAH: ANIMASI MEMANAH MENDONGAK KE LANGIT (~0.45 DETIK)
 * ============================================================================
 */
export function animateHunterSkyVolley(
  playerMesh: PlayerMeshObjects,
  progress: number, // 0.0 (start) -> 1.0 (0.45s end)
  isMoving: boolean,
  walkCycle: number,
  delta: number
): void {
  if (!playerMesh) return;

  const isLaunchingArrow = progress < 0.48;
  const drawPull = isLaunchingArrow ? Math.min(1.0, progress / 0.32) : Math.max(0.2, 1.0 - (progress - 0.48) * 1.4);

  // Torso condong menyamping & sedikit mendongak ke belakang menatap langit
  if (playerMesh.body) {
    playerMesh.body.rotation.reorder('YXZ');
    playerMesh.body.rotation.set(-0.22, 0.52, 0);
  }
  if (playerMesh.head) {
    playerMesh.head.rotation.set(-0.46, -0.48, 0);
    playerMesh.head.position.set(0, 1.49, -0.05);
  }
  if (playerMesh.group) {
    playerMesh.group.rotation.x = 0;
    playerMesh.group.rotation.z = 0;
  }

  const backBow = playerMesh.group?.getObjectByName('BackBow');
  if (backBow) backBow.visible = false;

  const leftArmPose = playerMesh.group?.getObjectByName('LeftArmPose');
  if (leftArmPose) leftArmPose.rotation.set(0, 0, 0);
  const rightArmPose = playerMesh.group?.getObjectByName('RightArmPose');
  if (rightArmPose) rightArmPose.rotation.set(0, 0, 0);

  // Lengan kiri mengangkat busur vertikal miring ~58° ke arah langit (-Math.PI * 0.82)
  if (playerMesh.leftArm) {
    playerMesh.leftArm.position.set(-0.27, 1.46, 0.14);
    playerMesh.leftArm.rotation.set(-Math.PI * 0.82, 0.08, -0.06);
  }
  const handBow = playerMesh.group?.getObjectByName('HandBow');
  if (handBow) {
    handBow.visible = true;
    handBow.rotation.set(-Math.PI / 2, 0, 0.18);
  }

  // Lengan kanan menarik tali mengarah ke langit lalu melepas suar panah
  if (playerMesh.rightArm) {
    playerMesh.rightArm.position.set(0.28, 1.40, -0.10);
    playerMesh.rightArm.rotation.set(
      -Math.PI * 0.74,
      -0.18 - drawPull * 0.30,
      0.22 + drawPull * 0.25
    );
  }

  const bowArrow = playerMesh.group?.getObjectByName('BowArrow');
  if (bowArrow) {
    bowArrow.visible = isLaunchingArrow;
    bowArrow.rotation.set(0, 0, 0);
    bowArrow.position.set(0, 0, drawPull * 0.18);
  }
  const vortex = playerMesh.group?.getObjectByName('ArrowVortex');
  if (vortex) {
    vortex.visible = isLaunchingArrow;
    if (isLaunchingArrow) vortex.rotation.z += delta * 22.0;
  }

  if (isMoving) {
    const legSwing = Math.sin(walkCycle) * 0.45;
    if (playerMesh.leftLeg) playerMesh.leftLeg.rotation.set(legSwing, 0, 0);
    if (playerMesh.rightLeg) playerMesh.rightLeg.rotation.set(-legSwing, 0, 0);
  } else {
    if (playerMesh.leftLeg) playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0.14, 0.25);
    if (playerMesh.rightLeg) playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -0.18, 0.25);
  }

  if (playerMesh.cape) {
    playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.24, 0.25);
  }
}
