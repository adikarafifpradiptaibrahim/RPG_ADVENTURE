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
  ctx.fillStyle = '#08090d';
  ctx.fillRect(0, 0, 128, 128);

  // Celah kulit gelap di bawah bayangan paruh tudung
  ctx.fillStyle = '#8b5e42';
  ctx.fillRect(16, 40, 96, 26);

  // Gradien bayangan atas dahi di bawah puncak paruh elang
  const browShadow = ctx.createLinearGradient(0, 38, 0, 58);
  browShadow.addColorStop(0, 'rgba(8, 9, 13, 0.92)');
  browShadow.addColorStop(1, 'rgba(8, 9, 13, 0.05)');
  ctx.fillStyle = browShadow;
  ctx.fillRect(14, 38, 100, 22);

  // Masker kain gelap penutup hidung dan mulut
  ctx.fillStyle = '#1b2028';
  ctx.fillRect(0, 66, 128, 62);

  // Hidung masker segitiga tajam + garis jahitan tepi tipis
  ctx.fillStyle = '#1b2028';
  ctx.beginPath();
  ctx.moveTo(42, 68);
  ctx.lineTo(64, 48);
  ctx.lineTo(86, 68);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 68);
  ctx.lineTo(44, 68);
  ctx.lineTo(64, 49);
  ctx.lineTo(84, 68);
  ctx.lineTo(116, 68);
  ctx.stroke();

  // Sepasang Mata Cyan (#00e5ff) Tajam & Menyipit Bercahaya
  ctx.save();
  ctx.fillStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 12;

  // Mata kiri menyudut ke dalam
  ctx.beginPath();
  ctx.moveTo(22, 46);
  ctx.lineTo(49, 50);
  ctx.lineTo(47, 56);
  ctx.lineTo(24, 53);
  ctx.closePath();
  ctx.fill();

  // Mata kanan menyudut ke dalam
  ctx.beginPath();
  ctx.moveTo(106, 46);
  ctx.lineTo(79, 50);
  ctx.lineTo(81, 56);
  ctx.lineTo(104, 53);
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

/** Bangun belati Assassin ramping berujung lancip + crossguard perak */
function createAssassinDagger(
  matLeather: THREE.Material,
  matSilver: THREE.Material,
  matCyanGlow: THREE.Material,
  matDarkMetal: THREE.Material
): THREE.Group {
  const dagger = new THREE.Group();
  dagger.name = 'HandDagger';

  // Gagang kulit gelap + pommel berlian perak
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.14, 6), matLeather);
  hilt.rotation.x = Math.PI / 2;
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.030, 0), matSilver);
  pommel.position.set(0, 0, -0.075);

  // Crossguard tipis bergaya Assassin
  const guardCore = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.032), matSilver);
  guardCore.position.set(0, 0, 0.07);
  const guardTipL = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 4), matDarkMetal);
  guardTipL.rotation.z = Math.PI / 2;
  guardTipL.position.set(-0.068, 0, 0.075);
  const guardTipR = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 4), matDarkMetal);
  guardTipR.rotation.z = -Math.PI / 2;
  guardTipR.position.set(0.068, 0, 0.075);

  // Bilah utama meruncing tipis ke depan sumbu +Z
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.040, 0.44, 4), matCyanGlow);
  blade.rotation.x = Math.PI / 2;
  blade.scale.set(1.0, 1.0, 0.24);
  blade.position.set(0, 0, 0.30);

  // Punggung bilah logam di pangkal agar terasa kokoh & tajam
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.016, 0.17), matDarkMetal);
  spine.position.set(0, 0, 0.17);

  dagger.add(hilt, pommel, guardCore, guardTipL, guardTipR, blade, spine);
  return dagger;
}

/** Bangun pelindung lengan bawah (vambrace) kulit-logam + mekanisme Hidden Blade */
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
  const leatherWrap = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.21, 0.145), matLeather);
  leatherWrap.position.set(0, -0.32, 0);

  // Plat pelindung luar logam gelap
  const outerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.19, 0.13), matDarkMetal);
  outerPlate.position.set(sideSign * 0.066, -0.32, 0.01);

  // Strip pengikat pergelangan & ukiran perak
  const wristBand = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.042, 0.155), matSilver);
  wristBand.position.set(0, -0.39, 0);

  // Mekanisme Hidden Blade di sisi bawah/luar pergelangan tangan
  const hiddenHousing = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.15, 0.056), matDarkMetal);
  hiddenHousing.position.set(sideSign * 0.072, -0.34, 0.035);

  const hiddenRails = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.16, 0.034), matSilver);
  hiddenRails.position.set(sideSign * 0.076, -0.36, 0.04);

  const hiddenTip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.13, 4), matCyanGlow);
  hiddenTip.rotation.x = Math.PI;
  hiddenTip.scale.set(0.45, 1, 1.0);
  hiddenTip.position.set(sideSign * 0.075, -0.49, 0.045);

  vambrace.add(leatherWrap, outerPlate, wristBand, hiddenHousing, hiddenRails, hiddenTip);
  return vambrace;
}

export function createHunterModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Hunter_ShadowRogue';

  // --- PALET MASTER ASSASSIN ---
  const matHood = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.85, side: THREE.DoubleSide });
  const matHoodShadow = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.95 });
  const matTunic = new THREE.MeshStandardMaterial({ color: 0x1e242e, roughness: 0.80 });
  const matClothLight = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78, side: THREE.DoubleSide });
  const matCrimson = new THREE.MeshStandardMaterial({ color: 0x9b1c1c, roughness: 0.74, side: THREE.DoubleSide });
  const matPants = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.90 });
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.72 });
  const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.65 });
  const matSilver = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x4a3321, roughness: 0.70 });
  const matCyanGlow = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00e5ff,
    emissiveIntensity: 3.0,
    roughness: 0.20,
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

  [-0.15, 0.15].forEach((xPos, idx) => {
    const isLeft = idx === 0;
    const sideSign = isLeft ? -1 : 1;
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'Leg_Left' : 'Leg_Right';
    legPivot.position.set(xPos, 0.74, 0);

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.62, 0.21), matPants);
    leg.position.set(0, -0.32, 0);

    // Pelindung lutut kulit-logam
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.10, 0.12), matDarkMetal);
    knee.name = isLeft ? 'Knee_Left' : 'Knee_Right';
    knee.position.set(0, -0.36, 0.08);

    // Sepatu bot tinggi kulit gelap + manset lipat
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.27, 0.27), matLeather);
    boot.position.set(0, -0.60, 0.03);

    const bootCuff = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.07, 0.28), matDarkMetal);
    bootCuff.position.set(0, -0.48, 0.025);

    const bootStrap = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.04, 0.285), matLeather);
    bootStrap.position.set(0, -0.57, 0.03);

    // Sarung belati menempel rapi di paha luar (bergerak selaras dengan ayunan kaki)
    const thighSheath = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.26, 0.095), matLeather);
    thighSheath.position.set(sideSign * 0.115, -0.17, 0.01);
    const sheathHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 6), matSilver);
    sheathHilt.position.set(sideSign * 0.12, -0.02, 0.01);

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
  // 2. PINGGUL, SABUK CRIMSON & GESPER CHEVRON ASSASSIN
  // ==========================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.32), matPants);
  pelvis.position.set(0, 0.80, 0);

  // Selempang kain merah Crimson melingkar pinggang
  const crimsonSashMain = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.11, 0.365), matCrimson);
  crimsonSashMain.position.set(0, 0.79, 0);

  const crimsonSashWrap = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.075, 0.372), matCrimson);
  crimsonSashWrap.position.set(0, 0.82, 0.005);
  crimsonSashWrap.rotation.z = -0.07;

  // Sabuk kulit atas + kantong perlengkapan pinggang
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.595, 0.06, 0.365), matLeather);
  belt.position.set(0, 0.86, 0);

  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.10), matLeather);
  pouchL.position.set(-0.22, 0.83, 0.16);
  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 0.09), matLeather);
  pouchR.position.set(0.22, 0.83, 0.16);

  // Ujung kain Crimson menjuntai di sisi pinggul kiri (aman dari ayunan paha)
  const sashTailGroup = new THREE.Group();
  sashTailGroup.position.set(-0.295, 0.76, 0.05);
  sashTailGroup.rotation.z = -0.14;
  sashTailGroup.rotation.x = 0.08;
  const sashTailCloth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.30, 0.16), matCrimson);
  sashTailCloth.position.set(0, -0.14, 0);
  const sashTailTip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.05, 0.15), matClothLight);
  sashTailTip.position.set(0, -0.28, 0);
  sashTailGroup.add(sashTailCloth, sashTailTip);

  // Gesper Emblem Chevron/Segitiga Assassin Perak di tengah depan sabuk
  const buckleGroup = new THREE.Group();
  buckleGroup.position.set(0, 0.82, 0.195);
  const buckleBackplate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.024), matDarkMetal);
  const chevronArmL = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.10, 0.026), matSilver);
  chevronArmL.position.set(-0.026, 0.004, 0.008);
  chevronArmL.rotation.z = -0.44;
  const chevronArmR = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.10, 0.026), matSilver);
  chevronArmR.position.set(0.026, 0.004, 0.008);
  chevronArmR.rotation.z = 0.44;
  const chevronCrossbar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.024), matSilver);
  chevronCrossbar.position.set(0, -0.024, 0.007);
  const buckleCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.017, 0), matCyanGlow);
  buckleCore.position.set(0, 0.004, 0.016);
  buckleGroup.add(buckleBackplate, chevronArmL, chevronArmR, chevronCrossbar, buckleCore);

  root.add(pelvis, crimsonSashMain, crimsonSashWrap, belt, pouchL, pouchR, sashTailGroup, buckleGroup);

  // ==========================================
  // 3. TORSO MASTER ASSASSIN, BANDOLIER, SELENDANG BAHU & BUSUR PUNGGUNG
  //    Catatan: Jangan beri nama anak node mengandung 'body'/'torso'/'chest'
  //    agar rotasi komponen tidak ditimpa traversal engine!
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'TorsoGroup';
  torsoGroup.position.set(0, 1.18, 0);
  torsoGroup.rotation.set(0, 0, 0);
  torsoGroup.rotation.reorder('YXZ');

  // Tunik gelap ramping + lapisan rompi Master Assassin bahu lebar
  const tunicCore = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.32), matTunic);
  tunicCore.name = 'TunicCore';
  torsoGroup.add(tunicCore);

  const vestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.35, 0.34), matHood);
  vestPlate.name = 'TunicVest';
  vestPlate.position.set(0, 0.11, 0.005);
  torsoGroup.add(vestPlate);

  // Kerah V-Neck perak-putih & aksen Crimson di bagian depan
  const lapelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.40, 0.028), matClothLight);
  lapelLeft.position.set(-0.11, 0.09, 0.175);
  lapelLeft.rotation.z = 0.25;
  const lapelRight = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.40, 0.028), matClothLight);
  lapelRight.position.set(0.11, 0.09, 0.175);
  lapelRight.rotation.z = -0.25;
  const innerTrimCenter = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.022), matCrimson);
  innerTrimCenter.position.set(0, -0.09, 0.168);
  torsoGroup.add(lapelLeft, lapelRight, innerTrimCenter);

  // Bandolier kulit diagonal menyilang (Bahu Kanan -> Pinggang Kiri) + 3 pisau lempar
  const bandolierGroup = new THREE.Group();
  bandolierGroup.name = 'Bandolier';

  const bandolierFront = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.72, 0.026), matLeather);
  bandolierFront.position.set(0, 0.01, 0.184);
  bandolierFront.rotation.z = -0.68;

  const bandolierBack = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.72, 0.026), matLeather);
  bandolierBack.position.set(0, 0.01, -0.182);
  bandolierBack.rotation.z = -0.68;

  const bandolierShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.38), matLeather);
  bandolierShoulder.position.set(0.21, 0.29, 0);

  bandolierGroup.add(bandolierFront, bandolierBack, bandolierShoulder);

  // 3 kantong pisau lempar kecil tertata rapi di bandolier depan
  [-0.12, -0.01, 0.10].forEach((offsetX, i) => {
    const knifeHolster = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.09, 0.024), matDarkMetal);
    knifeHolster.position.set(offsetX, -0.09 + i * 0.11, 0.198);
    knifeHolster.rotation.z = -0.68;
    const knifeHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 5), matSilver);
    knifeHilt.position.set(offsetX + 0.032, -0.09 + i * 0.11 + 0.038, 0.202);
    knifeHilt.rotation.z = -0.68;
    bandolierGroup.add(knifeHolster, knifeHilt);
  });
  torsoGroup.add(bandolierGroup);

  // Selendang Bahu Asimetris di Bahu Kiri (Left Shoulder Cape)
  const shoulderCapeGroup = new THREE.Group();
  shoulderCapeGroup.name = 'ShoulderCape';

  const shoulderCollarWrap = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.055, 0.36), matClothLight);
  shoulderCollarWrap.position.set(-0.20, 0.295, -0.01);
  shoulderCollarWrap.rotation.z = 0.22;

  const shoulderDrapedWing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.31), matClothLight);
  shoulderDrapedWing.position.set(-0.36, 0.205, -0.03);
  shoulderDrapedWing.rotation.z = -0.35;
  shoulderDrapedWing.rotation.x = 0.16;

  const shoulderCapeBackFlap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.035), matClothLight);
  shoulderCapeBackFlap.position.set(-0.20, 0.06, -0.205);
  shoulderCapeBackFlap.rotation.z = -0.18;
  shoulderCapeBackFlap.rotation.x = 0.14;

  const shoulderCapeStripe = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.055, 0.040), matCrimson);
  shoulderCapeStripe.position.set(-0.23, -0.13, -0.232);
  shoulderCapeStripe.rotation.z = -0.18;
  shoulderCapeStripe.rotation.x = 0.14;

  shoulderCapeGroup.add(shoulderCollarWrap, shoulderDrapedWing, shoulderCapeBackFlap, shoulderCapeStripe);
  torsoGroup.add(shoulderCapeGroup);

  // Quiver & Busur Punggung terpasang erat di punggung torso (ikut condong saat Shinobi Sprint!)
  const quiver = new THREE.Group();
  quiver.name = 'Quiver';
  quiver.position.set(0.15, 0.06, -0.26);
  quiver.rotation.z = -0.44;
  quiver.rotation.x = -0.04;

  const quiverTube = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.054, 0.56, 8), matLeather);
  const quiverCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.080, 0.076, 0.06, 8), matDarkMetal);
  quiverCollar.position.set(0, 0.26, 0);
  quiver.add(quiverTube, quiverCollar);

  // Bulu panah menyembul di bahu kanan
  [-0.025, 0.0, 0.025].forEach((ax, i) => {
    const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.04), i === 1 ? matCyanGlow : matClothLight);
    fletch.position.set(ax, 0.34, (i - 1) * 0.02);
    fletch.rotation.y = i * 0.6;
    quiver.add(fletch);
  });
  torsoGroup.add(quiver);

  const backBow = createSegmentedBow(matWood, matString);
  backBow.name = 'BackBow';
  backBow.position.set(-0.04, 0.04, -0.285);
  backBow.rotation.z = 0.62;
  backBow.rotation.y = Math.PI;
  backBow.rotation.x = -0.05;
  torsoGroup.add(backBow);

  root.add(torsoGroup);

  // ==========================================
  // 4. JUBAH TERBELAH (SPLIT COATTAILS) DI PINGGUL-BETIS
  // ==========================================
  const cloakGroup = new THREE.Group();
  cloakGroup.name = 'HunterCloak';
  cloakGroup.position.set(0, 1.48, -0.20);
  cloakGroup.rotation.x = 0.14;

  // Mantel punggung atas menyambung ke bahu & pinggang
  const cloakUpperMantle = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.030), matHood);
  cloakUpperMantle.position.set(0, -0.24, -0.005);
  cloakGroup.add(cloakUpperMantle);

  // Dua belahan ekor jubah panjang terpisah di tengah (anti clipping saat lari & walk)
  [-1, 1].forEach((sideSign) => {
    const tail = new THREE.Group();
    tail.position.set(sideSign * 0.165, -0.45, -0.015);
    tail.rotation.z = sideSign * 0.09; // Terbuka membentuk V terbelah di tengah
    tail.rotation.x = 0.06;           // Sedikit miring ke belakang agar bebas dari betis

    const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.032), matHood);
    upperPanel.position.set(0, -0.19, 0);

    const lowerTaper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.30, 0.030), matHood);
    lowerTaper.position.set(sideSign * 0.02, -0.49, 0);

    const tipPoint = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.18, 4), matHood);
    tipPoint.rotation.reorder('YXZ');
    tipPoint.rotation.x = Math.PI;
    tipPoint.rotation.y = Math.PI / 4;
    tipPoint.scale.set(1.1, 1.0, 0.22);
    tipPoint.position.set(sideSign * 0.03, -0.71, 0);

    // Garis jahitan terang perak di tepi luar + aksen crimson di tepi belahan dalam (ikuti lebar bertingkat)
    const upperOuterTrim = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.38, 0.035), matClothLight);
    upperOuterTrim.position.set(sideSign * 0.115, -0.19, 0);

    const lowerOuterTrim = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.30, 0.033), matClothLight);
    lowerOuterTrim.position.set(sideSign * 0.105, -0.49, 0);

    const upperCrimsonTrim = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.38, 0.035), matCrimson);
    upperCrimsonTrim.position.set(-sideSign * 0.115, -0.19, 0);

    const lowerCrimsonTrim = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.28, 0.033), matCrimson);
    lowerCrimsonTrim.position.set(-sideSign * 0.065, -0.48, 0);

    tail.add(
      upperPanel,
      lowerTaper,
      tipPoint,
      upperOuterTrim,
      lowerOuterTrim,
      upperCrimsonTrim,
      lowerCrimsonTrim
    );
    cloakGroup.add(tail);
  });

  root.add(cloakGroup);

  // ==========================================
  // 5. KEPALA & TUDUNG BERPARUH ELANG (ICONIC BEAKED ASSASSIN HOOD)
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.name = 'HunterHeadGroup';
  headGroup.position.set(0, 1.50, 0);

  // Kerah berlapis & syal melingkar leher (menutup mulus dari segala sudut bahkan saat Sprint)
  const cowlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.15, 8), matHood);
  cowlBase.position.set(0, 0.0, 0);
  cowlBase.scale.set(1.08, 1, 0.94);

  const cowlScarfFold = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.09, 8), matClothLight);
  cowlScarfFold.position.set(0, 0.055, 0.02);
  cowlScarfFold.rotation.x = 0.14;
  cowlScarfFold.scale.set(1.04, 1, 0.94);

  const cowlCrimsonEdge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.30), matCrimson);
  cowlCrimsonEdge.position.set(0, 0.025, 0.09);
  cowlCrimsonEdge.rotation.x = 0.20;
  headGroup.add(cowlBase, cowlScarfFold, cowlCrimsonEdge);

  // Wajah bermasker gelap & mata cyan bersinar agak menjorok ke dalam bayangan tudung
  const matFace = getRogueFaceMaterial();
  const headMaterials = [matHoodShadow, matHoodShadow, matHoodShadow, matHoodShadow, matFace, matHoodShadow];

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36), headMaterials);
  headMesh.name = 'HunterHead';
  headMesh.position.set(0, 0.25, -0.01);
  headGroup.add(headMesh);

  // Dinding samping kiri & kanan tudung menjorok ke depan menaungi sisi wajah
  [-1, 1].forEach((sideSign) => {
    const sideCowl = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.40, 0.44), matHood);
    sideCowl.position.set(sideSign * 0.205, 0.26, 0.025);
    sideCowl.rotation.z = sideSign * 0.16;
    sideCowl.rotation.y = sideSign * -0.10;

    const sideRim = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.36, 0.045), matClothLight);
    sideRim.position.set(sideSign * 0.185, 0.25, 0.22);
    sideRim.rotation.z = sideSign * 0.16;

    headGroup.add(sideCowl, sideRim);
  });

  // Bagian atas/belakang tudung miring alami ke belakang (hapus puncak kotak!)
  const hoodCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.27, 0.22, 6), matHood);
  hoodCrown.position.set(0, 0.47, -0.03);
  hoodCrown.rotation.y = Math.PI / 6;
  hoodCrown.rotation.x = 0.26;
  hoodCrown.scale.set(1.06, 1, 1.15);
  headGroup.add(hoodCrown);

  // Puncak paruh elang khas Assassin's Creed meruncing ke bawah menaungi dahi & mata
  const hoodBeak = new THREE.Mesh(new THREE.ConeGeometry(0.155, 0.30, 4), matHood);
  hoodBeak.rotation.reorder('YXZ');
  hoodBeak.position.set(0, 0.425, 0.21);
  hoodBeak.rotation.x = Math.PI * 0.62;
  hoodBeak.rotation.y = Math.PI / 4;
  hoodBeak.scale.set(1.20, 1.0, 0.42);
  headGroup.add(hoodBeak);

  // Lis perak tipis di punggung paruh agar siluet tudung berparuh tegas
  const beakCrest = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 4), matClothLight);
  beakCrest.rotation.reorder('YXZ');
  beakCrest.position.set(0, 0.445, 0.205);
  beakCrest.rotation.x = Math.PI * 0.62;
  beakCrest.rotation.y = Math.PI / 4;
  beakCrest.scale.set(0.60, 1.0, 0.35);
  headGroup.add(beakCrest);

  // Ekor kain tudung meruncing di bagian belakang kepala-leher
  const hoodTail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 5), matHood);
  hoodTail.position.set(0, 0.27, -0.22);
  hoodTail.rotation.x = Math.PI + 0.24;
  hoodTail.scale.set(1.25, 1.0, 0.45);
  headGroup.add(hoodTail);

  root.add(headGroup);

  // ==========================================
  // 6. LENGAN, VAMBRACE, HIDDEN BLADE & BELATI RAMPING
  // ==========================================

  // --- TANGAN KIRI ---
  const leftArmGroup = new THREE.Group();
  leftArmGroup.name = 'LeftArm'; // Node ini dibiarkan netral untuk engine
  leftArmGroup.position.set(-0.44, 1.44, 0.02);

  const leftArmPose = new THREE.Group();
  leftArmPose.name = 'LeftArmPose';
  leftArmPose.rotation.z = -0.16;
  leftArmPose.rotation.x = -0.30;
  leftArmPose.rotation.y = 0.20;

  // Pauldron bahu kiri logam berlapis + aksen crimson
  const leftPauldronMain = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.13, 0.25), matDarkMetal);
  leftPauldronMain.position.set(-0.01, 0.01, 0);
  leftPauldronMain.rotation.z = 0.18;
  const leftPauldronLower = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.22), matDarkMetal);
  leftPauldronLower.position.set(-0.02, -0.07, 0);
  leftPauldronLower.rotation.z = 0.22;
  const leftPauldronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.03, 0.255), matCrimson);
  leftPauldronTrim.position.set(-0.01, -0.03, 0);
  leftPauldronTrim.rotation.z = 0.18;
  leftArmPose.add(leftPauldronMain, leftPauldronLower, leftPauldronTrim);

  // Lengan & sarung tangan gelap
  const leftLimb = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.13), matTunic);
  leftLimb.position.set(0, -0.22, 0);
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.12, 0.125), matPants);
  leftHand.position.set(0, -0.44, 0.02);
  leftArmPose.add(leftLimb, leftHand);

  // Vambrace kulit-logam & Hidden Blade lengan kiri
  leftArmPose.add(createForearmVambrace(-1, matLeather, matDarkMetal, matSilver, matCyanGlow));

  // Belati Assassin Kiri ramping berujung lancip
  const leftDagger = createAssassinDagger(matLeather, matSilver, matCyanGlow, matDarkMetal);
  leftDagger.position.set(0, -0.44, 0.04);
  leftDagger.rotation.x = 0.35;
  leftDagger.rotation.y = -0.28;
  leftArmPose.add(leftDagger);

  // Busur Horizontal Membujur
  const handBow = createSegmentedBow(matWood, matString, true);
  handBow.name = 'HandBow';
  handBow.position.set(0.05, -0.42, 0.04);
  handBow.rotation.set(-Math.PI / 2, 0, 0);
  handBow.visible = false;
  leftArmPose.add(handBow);

  leftArmGroup.add(leftArmPose);
  root.add(leftArmGroup);

  // --- TANGAN KANAN ---
  const rightArmGroup = new THREE.Group();
  rightArmGroup.name = 'RightArm';
  rightArmGroup.position.set(0.44, 1.44, 0.02);

  const rightArmPose = new THREE.Group();
  rightArmPose.name = 'RightArmPose';
  rightArmPose.rotation.z = 0.16;
  rightArmPose.rotation.x = 0.12;
  rightArmPose.rotation.y = -0.20;

  // Penahan bahu kanan asimetris (sabuk kulit + pelindung ringkas)
  const rightShoulderLeather = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.11, 0.21), matLeather);
  rightShoulderLeather.position.set(0, 0.0, 0);
  rightShoulderLeather.rotation.z = -0.14;
  const rightShoulderRim = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.035, 0.215), matDarkMetal);
  rightShoulderRim.position.set(0, -0.04, 0);
  rightShoulderRim.rotation.z = -0.14;
  rightArmPose.add(rightShoulderLeather, rightShoulderRim);

  // Lengan & sarung tangan gelap
  const rightLimb = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.13), matTunic);
  rightLimb.position.set(0, -0.22, 0);
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.12, 0.125), matPants);
  rightHand.position.set(0, -0.44, 0.02);
  rightArmPose.add(rightLimb, rightHand);

  // Vambrace kulit-logam & Hidden Blade lengan kanan
  rightArmPose.add(createForearmVambrace(1, matLeather, matDarkMetal, matSilver, matCyanGlow));

  // Belati Assassin Kanan ramping berujung lancip
  const rightDagger = createAssassinDagger(matLeather, matSilver, matCyanGlow, matDarkMetal);
  rightDagger.position.set(0, -0.44, 0.04);
  rightDagger.rotation.x = -0.05;
  rightDagger.rotation.y = 0.28;
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

export function updateHunterWeaponStance(model: THREE.Group, stance: 'dagger' | 'bow', isSheathed: boolean = false) {
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
    // Mode Panah:
    if (backBow) backBow.visible = false;
    if (handBow) {
      handBow.visible = true;
      handBow.rotation.set(-Math.PI / 2, 0, 0);
    }
    if (leftDagger) leftDagger.visible = false;
    if (rightDagger) rightDagger.visible = false;

    // TANGAN PEMEGANG BUSUR: Turun menyusuri pinggul, ketiak sedikit santai
    if (leftArmPose) {
      leftArmPose.rotation.set(0.04, 0.02, -0.10);
    }

    // TANGAN TANPA SENJATA: Lurus vertikal ke bawah sejajar badan
    if (rightArmPose) {
      rightArmPose.rotation.set(0, 0, 0);
    }
  } else {
    // Mode Belati (Melee A-Pose Asli):
    if (backBow) backBow.visible = true;
    if (handBow) handBow.visible = false;
    if (leftDagger) leftDagger.visible = true;
    if (rightDagger) rightDagger.visible = true;

    // Kembalikan ke pose belati siap tempur
    if (leftArmPose) {
      leftArmPose.rotation.set(-0.30, 0.20, -0.16);
    }
    if (rightArmPose) {
      rightArmPose.rotation.set(0.12, -0.20, 0.16);
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
  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
    updateHunterWeaponStance(root, mode, isHunterSheathed);
  };
  const setHunterSheathed = (sheathed: boolean) => {
    isHunterSheathed = sheathed;
    updateHunterWeaponStance(root, hunterWeaponMode, sheathed);
  };

  updateHunterWeaponStance(root, hunterWeaponMode, false);

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
          playerMesh.leftArm.rotation.set(1.05 + armWindSway, 0.05, -0.22);
          playerMesh.leftArm.position.set(-0.44, 1.40, 0.10);
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.rotation.set(1.05 - armWindSway, -0.05, 0.22);
          playerMesh.rightArm.position.set(0.44, 1.40, 0.10);
        }
      }

      // 5. Jubah berkibar ke belakang membelah angin
      if (playerMesh.cape) {
        playerMesh.cape.rotation.set(0.78 + Math.abs(Math.sin(walkTime * 0.5)) * 0.25, 0, 0);
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
          playerMesh.leftArm.position.set(-0.44, 1.44, 0.02);
          if (hunterWeaponMode === 'bow') {
            playerMesh.leftArm.rotation.set(0.04, 0.02, -0.10);
          } else {
            playerMesh.leftArm.rotation.set(-0.4 + armSwing * 0.45, 0, 0);
          }
        }
        if (playerMesh.rightArm) {
          playerMesh.rightArm.position.set(0.44, 1.44, 0.02);
          playerMesh.rightArm.rotation.set(-0.4 - armSwing * 0.45, 0, 0);
        }
      }

      if (playerMesh.cape) {
        playerMesh.cape.rotation.set(0.15 + Math.abs(Math.sin(walkTime * 0.5)) * 0.20, 0, 0);
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
        playerMesh.leftArm.position.set(-0.44, 1.44, 0.02);
        if (hunterWeaponMode === 'bow') {
          playerMesh.leftArm.rotation.set(0.04, 0.02, -0.10);
        } else {
          playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0, 0.25);
          playerMesh.leftArm.rotation.y = 0;
          playerMesh.leftArm.rotation.z = 0;
        }
      }
      if (playerMesh.rightArm) {
        playerMesh.rightArm.position.set(0.44, 1.44, 0.02);
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0, 0.25);
        playerMesh.rightArm.rotation.y = 0;
        playerMesh.rightArm.rotation.z = 0;
      }
    }

    if (playerMesh.cape) {
      playerMesh.cape.rotation.set(0.12 + Math.sin(walkTime * 2.0) * 0.02, 0, 0);
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
  delta: number
): void {
  if (!playerMesh) return;

  // KUNCI: Badan tegak sempurna mengikuti hadap bidikan
  if (playerMesh.body) {
    playerMesh.body.rotation.set(0, 0, 0);
  }
  if (playerMesh.group) {
    playerMesh.group.rotation.x = 0;
    playerMesh.group.rotation.z = 0;
  }
  if (playerMesh.rotation) {
    playerMesh.rotation.x = 0;
    playerMesh.rotation.z = 0;
  }

  // 1. LENGAN KIRI: Mengangkat busur sejajar bahu lurus ke depan
  if (playerMesh.leftArm) {
    playerMesh.leftArm.rotation.set(-Math.PI * 0.48, 0.16, -0.06);
  }

  // Sesuaikan pose handBow agar berdiri tegak menghadap lurus ke depan
  const handBow = playerMesh.group?.getObjectByName('HandBow');
  if (handBow) {
    handBow.visible = true;
    handBow.rotation.set(0, 0, -0.15); // Vertikal alami dengan sedikit kemiringan ~8 derajat
  }

  // 2. LENGAN KANAN: Menarik senar ke belakang menuju pipi/bahu seiring naiknya bowChargeRatio (0.0 -> 1.0)
  if (playerMesh.rightArm) {
    playerMesh.rightArm.rotation.set(
      -Math.PI * 0.45,
      -0.15 - chargeRatio * 0.40,
      0.15 + chargeRatio * 0.32
    );
  }

  // 3. ANAK PANAH PADA BUSUR: Menunjuk lurus mendatar ke depan searah crosshair +, mundur sedikit seiring tarikan senar
  const bowArrow = playerMesh.group?.getObjectByName('BowArrow');
  if (bowArrow) {
    bowArrow.visible = true;
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
