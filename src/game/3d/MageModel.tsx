import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * CONFIGURATION & SAFETY ROLLBACK TOGGLE
 * ============================================================================
 * Jika USE_LEGACY_MAGE bernilai true: Game akan menggunakan model lama dari backup.
 * Jika USE_LEGACY_MAGE bernilai false: Game menggunakan model Astral Archmage baru
 * dengan topi berlekuk, jubah berlapis, tabard terbelah, tongkat kristal melayang,
 * dan grimoire melayang di samping pinggang.
 */
export const USE_LEGACY_MAGE = false;
export { createLegacyMageMesh } from './MageModel_v1_backup';

/**
 * ============================================================================
 * PRELOADED GEOMETRY & MATERIAL PALETTE (Zero-Lag & Object Pooling)
 * ============================================================================
 * Palet warna Astral Archmage:
 * - Jubah, Tunic, Kerah & Topi: Midnight Indigo (#241445)
 * - Lis Emas, Gesper, Cincin Tongkat & Bordir Bintang: Rich Royal Gold (#D4AF37)
 * - Mata, Rune, Permata Pauldron, & Kristal Tongkat: Arcane Cyan Glow (#00F0FF / Emissive 2.0)
 * - Kulit Wajah & Tangan: Peach Natural (#FFD180)
 * - Rambut, Alis & Janggut: Dark Warm Brown (#3D2314)
 * - Sabuk & Tali: Kulit Gelap (#1F1610)
 * - Sepatu Bot: Polished Dark Leather (#2C1B12) & Sol (#170E0A)
 * - Batang Tongkat: Dark Twisted Astral Wood (#221436)
 * - Grimoire: Sampul Indigo (#241445), Sudut Emas (#D4AF37), Segel Cyan (#00F0FF), Lembaran Kertas (#FEF9C3)
 * - Jubah Belakang (Cape): Deep Astral Indigo (#1E1038) berlis emas
 */

interface BlockyMageMaterialPalette {
  midnightIndigoMat: THREE.MeshLambertMaterial; // #241445
  tunicPurpleMat: THREE.MeshLambertMaterial; // alias #241445
  vestBrownMat: THREE.MeshLambertMaterial; // #3D2314
  beltDarkMat: THREE.MeshLambertMaterial; // #1F1610
  goldTrimMat: THREE.MeshStandardMaterial; // #D4AF37
  goldTrimEmissiveMat: THREE.MeshStandardMaterial; // #D4AF37 with emissive
  capeIndigoMat: THREE.MeshLambertMaterial; // #1E1038
  capeMaroonMat: THREE.MeshLambertMaterial; // alias
  pauldronIndigoMat: THREE.MeshStandardMaterial; // #241445 with subtle metallic sheen
  pauldronGrayMat: THREE.MeshStandardMaterial; // alias
  skinPeachMat: THREE.MeshLambertMaterial; // #FFD180
  beardHairMat: THREE.MeshLambertMaterial; // #3D2314
  eyesCyanGlowMat: THREE.MeshBasicMaterial; // #00F0FF
  runeCyanGlowMat: THREE.MeshBasicMaterial; // #00F0FF pure emissive
  staffWoodMat: THREE.MeshLambertMaterial; // #221436
  staffShaftMat: THREE.MeshLambertMaterial; // alias
  crystalCyanMat: THREE.MeshStandardMaterial; // #00F0FF + Emissive
  grimoireCoverMat: THREE.MeshLambertMaterial; // #241445
  grimoirePagesMat: THREE.MeshLambertMaterial; // #FEF9C3
  kneeGrayMat: THREE.MeshStandardMaterial; // #2C1B12
  bootBrownMat: THREE.MeshStandardMaterial; // #2C1B12
  soleMat: THREE.MeshStandardMaterial; // #170E0A
  sparkCyanMat: THREE.PointsMaterial; // Arcane particle glow
}

let cachedMaterials: BlockyMageMaterialPalette | null = null;

function getMageMaterials(tier: number): BlockyMageMaterialPalette {
  if (!cachedMaterials) {
    const midnightIndigoMat = new THREE.MeshLambertMaterial({
      color: 0x241445,
      flatShading: true,
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.22,
      emissive: 0x7A5B10,
      emissiveIntensity: 0.35,
      flatShading: true,
    });

    const goldTrimEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xE6C35C,
      metalness: 0.90,
      roughness: 0.18,
      emissive: 0xA37D1A,
      emissiveIntensity: 0.65,
      flatShading: true,
    });

    const capeIndigoMat = new THREE.MeshLambertMaterial({
      color: 0x1E1038,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    const pauldronIndigoMat = new THREE.MeshStandardMaterial({
      color: 0x241445,
      metalness: 0.45,
      roughness: 0.35,
      flatShading: true,
    });

    const crystalCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00F0FF,
      emissive: 0x00E5FF,
      emissiveIntensity: 2.0,
      roughness: 0.10,
      metalness: 0.20,
      flatShading: true,
    });

    const eyesCyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00F0FF,
    });

    const runeCyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00F0FF,
    });

    const skinPeachMat = new THREE.MeshLambertMaterial({
      color: 0xFFD180,
      flatShading: true,
    });

    const beardHairMat = new THREE.MeshLambertMaterial({
      color: 0x3D2314,
      flatShading: true,
    });

    const staffWoodMat = new THREE.MeshLambertMaterial({
      color: 0x221436,
      flatShading: true,
    });

    const beltDarkMat = new THREE.MeshLambertMaterial({
      color: 0x1F1610,
      flatShading: true,
    });

    const bootBrownMat = new THREE.MeshStandardMaterial({
      color: 0x2C1B12,
      metalness: 0.25,
      roughness: 0.65,
      flatShading: true,
    });

    const soleMat = new THREE.MeshStandardMaterial({
      color: 0x170E0A,
      metalness: 0.10,
      roughness: 0.90,
      flatShading: true,
    });

    const grimoireCoverMat = new THREE.MeshLambertMaterial({
      color: 0x241445,
      flatShading: true,
    });

    const grimoirePagesMat = new THREE.MeshLambertMaterial({
      color: 0xFEF9C3,
      flatShading: true,
    });

    const sparkCyanMat = new THREE.PointsMaterial({
      color: 0x00F0FF,
      size: 0.035,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    cachedMaterials = {
      midnightIndigoMat,
      tunicPurpleMat: midnightIndigoMat,
      vestBrownMat: beardHairMat,
      beltDarkMat,
      goldTrimMat,
      goldTrimEmissiveMat,
      capeIndigoMat,
      capeMaroonMat: capeIndigoMat,
      pauldronIndigoMat,
      pauldronGrayMat: pauldronIndigoMat,
      skinPeachMat,
      beardHairMat,
      eyesCyanGlowMat,
      runeCyanGlowMat,
      staffWoodMat,
      staffShaftMat: staffWoodMat,
      crystalCyanMat,
      grimoireCoverMat,
      grimoirePagesMat,
      kneeGrayMat: bootBrownMat,
      bootBrownMat,
      soleMat,
      sparkCyanMat,
    };
  }

  // Tier 3+ Archmage Gilded Enhancements
  if (tier >= 3) {
    cachedMaterials.goldTrimMat.emissiveIntensity = 0.60;
    cachedMaterials.crystalCyanMat.emissiveIntensity = tier >= 5 ? 2.6 : 2.2;
  } else {
    cachedMaterials.goldTrimMat.emissiveIntensity = 0.35;
    cachedMaterials.crystalCyanMat.emissiveIntensity = 2.0;
  }

  return cachedMaterials;
}

// 2. Preloaded Geometries Cache
interface BlockyMageGeometryPalette {
  headGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  eyebrowGeo: THREE.BufferGeometry;
  // Arcane Pointed Hat
  hatBrimGeo: THREE.BufferGeometry;
  hatBrimTrimGeo: THREE.BufferGeometry;
  hatBandGeo: THREE.BufferGeometry;
  hatBroochGeo: THREE.BufferGeometry;
  hatGemGeo: THREE.BufferGeometry;
  coneTier1Geo: THREE.BufferGeometry;
  coneTier2Geo: THREE.BufferGeometry;
  coneTier3Geo: THREE.BufferGeometry;
  // Facial Hair & Back/Side Hair
  mustacheGeo: THREE.BufferGeometry;
  beardTopGeo: THREE.BufferGeometry;
  beardMidGeo: THREE.BufferGeometry;
  beardTipGeo: THREE.BufferGeometry;
  hairBackGeo: THREE.BufferGeometry;
  hairNapeGeo: THREE.BufferGeometry;
  hairSideGeo: THREE.BufferGeometry;
  hairFrontLockGeo: THREE.BufferGeometry;
  // High Collar & Mantle
  collarBackGeo: THREE.BufferGeometry;
  collarSideGeo: THREE.BufferGeometry;
  collarTrimGeo: THREE.BufferGeometry;
  mantleUpperGeo: THREE.BufferGeometry;
  mantleTrimGeo: THREE.BufferGeometry;
  // Torso, Belt, Tabard & Cape
  torsoChestGeo: THREE.BufferGeometry;
  tabardChestGeo: THREE.BufferGeometry;
  astralStarHGeo: THREE.BufferGeometry;
  astralStarVGeo: THREE.BufferGeometry;
  astralStarCenterGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  buckleGemGeo: THREE.BufferGeometry;
  tabardLeftFlapGeo: THREE.BufferGeometry;
  tabardRightFlapGeo: THREE.BufferGeometry;
  tabardTrimGeo: THREE.BufferGeometry;
  skirtBackHemGeo: THREE.BufferGeometry;
  capeGeo: THREE.BufferGeometry;
  capeTrimGeo: THREE.BufferGeometry;
  // Pauldrons
  pauldronBodyGeo: THREE.BufferGeometry;
  pauldronCrestGeo: THREE.BufferGeometry;
  pauldronGemGeo: THREE.BufferGeometry;
  // Bell Sleeves & Hands
  armUpperGeo: THREE.BufferGeometry;
  bellSleeveGeo: THREE.BufferGeometry;
  bellCuffGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  // Pointed Boots & Legs
  thighGeo: THREE.BufferGeometry;
  kneeGuardGeo: THREE.BufferGeometry;
  shinGeo: THREE.BufferGeometry;
  bootAnkleGeo: THREE.BufferGeometry;
  bootToePointGeo: THREE.BufferGeometry;
  bootGoldRimGeo: THREE.BufferGeometry;
  bootSoleGeo: THREE.BufferGeometry;
  // Celestial Staff
  staffShaftGeo: THREE.BufferGeometry;
  staffRingCoilGeo: THREE.BufferGeometry;
  staffCrownBaseGeo: THREE.BufferGeometry;
  staffCrescentProngGeo: THREE.BufferGeometry;
  staffCrystalGeo: THREE.BufferGeometry;
  staffRuneRingGeo: THREE.BufferGeometry;
  // Grimoire
  grimoireCoverGeo: THREE.BufferGeometry;
  grimoirePagesGeo: THREE.BufferGeometry;
  grimoireSpineGeo: THREE.BufferGeometry;
  grimoireCornerGeo: THREE.BufferGeometry;
  grimoireRuneSealGeo: THREE.BufferGeometry;
  grimoireSparkGeo: THREE.BufferGeometry;
}

let cachedGeometries: BlockyMageGeometryPalette | null = null;

function getMageGeometries(): BlockyMageGeometryPalette {
  if (!cachedGeometries) {
    // 1. Topi Penyihir Agung (Arcane Pointed Hat):
    // Pinggiran lebar melengkung (wide brim) halus bersegi 14
    const hatBrimGeo = new THREE.CylinderGeometry(0.52, 0.56, 0.03, 14);
    const hatBrimTrimGeo = new THREE.CylinderGeometry(0.55, 0.58, 0.015, 14);
    const hatBandGeo = new THREE.CylinderGeometry(0.27, 0.28, 0.05, 12);
    const hatBroochGeo = new THREE.BoxGeometry(0.06, 0.06, 0.03);
    const hatGemGeo = new THREE.OctahedronGeometry(0.032, 0);

    // Crooked Wizard Tip (3-tier segmented cone bending backwards):
    // Tier 1: Pangkal kerucut di atas pita (sedikit miring)
    const coneTier1Geo = new THREE.CylinderGeometry(0.19, 0.26, 0.26, 8);
    coneTier1Geo.translate(0, 0.13, 0);

    // Tier 2: Bagian tengah kerucut (makin condong ke belakang)
    const coneTier2Geo = new THREE.CylinderGeometry(0.11, 0.19, 0.24, 8);
    coneTier2Geo.translate(0, 0.12, 0);

    // Tier 3: Ujung kerucut berlekuk khas wizard tip (crooked tip)
    const coneTier3Geo = new THREE.ConeGeometry(0.11, 0.24, 6);
    coneTier3Geo.translate(0, 0.12, 0);

    // 2. High Collar & Shoulder Mantle:
    const collarBackGeo = new THREE.BoxGeometry(0.44, 0.22, 0.05);
    const collarSideGeo = new THREE.BoxGeometry(0.05, 0.20, 0.32);
    const collarTrimGeo = new THREE.BoxGeometry(0.46, 0.03, 0.055);
    const mantleUpperGeo = new THREE.BoxGeometry(0.72, 0.14, 0.46);
    const mantleTrimGeo = new THREE.BoxGeometry(0.74, 0.035, 0.48);

    // 3. Pauldrons: Curved faceted indigo pauldron with sharp gold crest frame & cyan rune gem
    const pauldronBodyGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.24, 6);
    pauldronBodyGeo.rotateZ(Math.PI / 2);
    const pauldronCrestGeo = new THREE.BoxGeometry(0.26, 0.05, 0.26);
    const pauldronGemGeo = new THREE.OctahedronGeometry(0.042, 0);

    // 4. Torso & Tabard Depan Terbelah (Split Front Skirt):
    const torsoChestGeo = new THREE.BoxGeometry(0.66, 0.76, 0.40);
    const tabardChestGeo = new THREE.BoxGeometry(0.34, 0.48, 0.04);
    // Bordir Bintang Astral Emas di dada
    const astralStarHGeo = new THREE.BoxGeometry(0.22, 0.032, 0.02);
    const astralStarVGeo = new THREE.BoxGeometry(0.032, 0.22, 0.02);
    const astralStarCenterGeo = new THREE.OctahedronGeometry(0.04, 0);

    // Sabuk Tebal & Gesper Emas dengan Permata Rune Cyan
    const beltGeo = new THREE.BoxGeometry(0.70, 0.12, 0.44);
    const buckleGeo = new THREE.BoxGeometry(0.18, 0.16, 0.48);
    const buckleGemGeo = new THREE.BoxGeometry(0.075, 0.075, 0.49);

    // Tabard menjuntai ke bawah lutut, terbelah di tengah (kiri & kanan terpisah)
    const tabardLeftFlapGeo = new THREE.BoxGeometry(0.165, 0.48, 0.035);
    tabardLeftFlapGeo.translate(0, -0.24, 0);
    const tabardRightFlapGeo = new THREE.BoxGeometry(0.165, 0.48, 0.035);
    tabardRightFlapGeo.translate(0, -0.24, 0);
    const tabardTrimGeo = new THREE.BoxGeometry(0.165, 0.035, 0.04);
    const skirtBackHemGeo = new THREE.BoxGeometry(0.66, 0.26, 0.42);

    // 5. Flowing Cape (Jubah Belakang Lebar Berlipat Rendah & Lis Emas):
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.34, 0); // Atas kiri (lebar bahu)
    capeShape.lineTo(0.34, 0);  // Atas kanan
    capeShape.lineTo(0.48, -1.24); // Bawah kanan (melebar dramatis)
    capeShape.lineTo(0.24, -1.20); // Lipatan berundak 1
    capeShape.lineTo(0, -1.28);    // Ujung tengah meruncing
    capeShape.lineTo(-0.24, -1.20); // Lipatan berundak 2
    capeShape.lineTo(-0.48, -1.24); // Bawah kiri
    capeShape.closePath();
    const capeGeo = new THREE.ExtrudeGeometry(capeShape, {
      depth: 0.025,
      bevelEnabled: false,
    });
    capeGeo.center();

    const capeTrimGeo = new THREE.BoxGeometry(0.96, 0.035, 0.03);

    // 6. Bell Sleeves (Lengan Jubah Melebar ke Pergelangan):
    const armUpperGeo = new THREE.BoxGeometry(0.22, 0.34, 0.22);
    const bellSleeveGeo = new THREE.CylinderGeometry(0.17, 0.12, 0.28, 6);
    bellSleeveGeo.translate(0, -0.14, 0);
    const bellCuffGeo = new THREE.CylinderGeometry(0.185, 0.175, 0.05, 6);
    bellCuffGeo.translate(0, -0.27, 0);
    const handGeo = new THREE.BoxGeometry(0.11, 0.11, 0.13);

    // 7. Pointed Boots (Sepatu Bot Runcing Berlis Emas):
    const thighGeo = new THREE.BoxGeometry(0.23, 0.38, 0.23);
    const kneeGuardGeo = new THREE.BoxGeometry(0.25, 0.10, 0.25);
    const shinGeo = new THREE.BoxGeometry(0.22, 0.28, 0.22);
    const bootAnkleGeo = new THREE.BoxGeometry(0.24, 0.20, 0.25);
    // Ujung bot runcing bergaya sepatu penyihir kuno (pointed toe)
    const bootToePointGeo = new THREE.ConeGeometry(0.105, 0.18, 4);
    bootToePointGeo.rotateX(Math.PI / 2);
    const bootGoldRimGeo = new THREE.BoxGeometry(0.25, 0.035, 0.26);
    const bootSoleGeo = new THREE.BoxGeometry(0.26, 0.04, 0.38);

    // 8. Celestial Crystal Staff:
    // Gagang kayu gelap / ungu tua berulir
    const staffShaftGeo = new THREE.CylinderGeometry(0.030, 0.036, 1.50, 6);
    staffShaftGeo.translate(0, -0.05, 0); // Grip pivot di tengah
    const staffRingCoilGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.035, 8);
    const staffCrownBaseGeo = new THREE.CylinderGeometry(0.055, 0.042, 0.10, 6);
    // Mahkota cabang emas melengkung (crescent branch prongs)
    const staffCrescentProngGeo = new THREE.BoxGeometry(0.035, 0.28, 0.055);
    // Kristal oktahedron cyan bercahaya melayang bebas di udara
    const staffCrystalGeo = new THREE.OctahedronGeometry(0.125, 0);
    // Cincin rune emas tipis melayang miring di sekeliling kristal
    const staffRuneRingGeo = new THREE.TorusGeometry(0.19, 0.016, 6, 20);

    // 9. Floating Grimoire (Kitab Sihir Melayang di Samping Pinggang Kiri):
    const grimoireCoverGeo = new THREE.BoxGeometry(0.08, 0.38, 0.28);
    const grimoirePagesGeo = new THREE.BoxGeometry(0.065, 0.35, 0.25);
    const grimoireSpineGeo = new THREE.BoxGeometry(0.085, 0.385, 0.04);
    const grimoireCornerGeo = new THREE.BoxGeometry(0.085, 0.07, 0.07);
    const grimoireRuneSealGeo = new THREE.OctahedronGeometry(0.048, 0);

    // Partikel cahaya cyan tipis di sekeliling grimoire
    const sparkCount = 14;
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      const theta = (i / sparkCount) * Math.PI * 2;
      const r = 0.18 + (i % 3) * 0.05;
      sparkPositions[i * 3 + 0] = Math.cos(theta) * r;
      sparkPositions[i * 3 + 1] = (i % 5 - 2) * 0.08;
      sparkPositions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const grimoireSparkGeo = new THREE.BufferGeometry();
    grimoireSparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));

    cachedGeometries = {
      headGeo: new THREE.BoxGeometry(0.38, 0.38, 0.38),
      eyeGeo: new THREE.BoxGeometry(0.065, 0.035, 0.02),
      eyebrowGeo: new THREE.BoxGeometry(0.11, 0.024, 0.025),
      hatBrimGeo,
      hatBrimTrimGeo,
      hatBandGeo,
      hatBroochGeo,
      hatGemGeo,
      coneTier1Geo,
      coneTier2Geo,
      coneTier3Geo,
      mustacheGeo: new THREE.BoxGeometry(0.11, 0.035, 0.03),
      beardTopGeo: new THREE.BoxGeometry(0.20, 0.09, 0.06),
      beardMidGeo: new THREE.BoxGeometry(0.15, 0.09, 0.055),
      beardTipGeo: new THREE.ConeGeometry(0.06, 0.12, 4),
      hairBackGeo: new THREE.BoxGeometry(0.40, 0.36, 0.07),
      hairNapeGeo: new THREE.BoxGeometry(0.34, 0.16, 0.06),
      hairSideGeo: new THREE.BoxGeometry(0.045, 0.32, 0.22),
      hairFrontLockGeo: new THREE.BoxGeometry(0.045, 0.20, 0.05),
      collarBackGeo,
      collarSideGeo,
      collarTrimGeo,
      mantleUpperGeo,
      mantleTrimGeo,
      torsoChestGeo,
      tabardChestGeo,
      astralStarHGeo,
      astralStarVGeo,
      astralStarCenterGeo,
      beltGeo,
      buckleGeo,
      buckleGemGeo,
      tabardLeftFlapGeo,
      tabardRightFlapGeo,
      tabardTrimGeo,
      skirtBackHemGeo,
      capeGeo,
      capeTrimGeo,
      pauldronBodyGeo,
      pauldronCrestGeo,
      pauldronGemGeo,
      armUpperGeo,
      bellSleeveGeo,
      bellCuffGeo,
      handGeo,
      thighGeo,
      kneeGuardGeo,
      shinGeo,
      bootAnkleGeo,
      bootToePointGeo,
      bootGoldRimGeo,
      bootSoleGeo,
      staffShaftGeo,
      staffRingCoilGeo,
      staffCrownBaseGeo,
      staffCrescentProngGeo,
      staffCrystalGeo,
      staffRuneRingGeo,
      grimoireCoverGeo,
      grimoirePagesGeo,
      grimoireSpineGeo,
      grimoireCornerGeo,
      grimoireRuneSealGeo,
      grimoireSparkGeo,
    };
  }

  return cachedGeometries;
}

/**
 * ============================================================================
 * CONSTRUCT HEROIC MAGE MESH (Astral Archmage Low-Poly Redesign)
 * ============================================================================
 */
export function createHeroicMageMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'mage';

  const mats = getMageMaterials(tier);
  const geos = getMageGeometries();

  // 1. Root Group & Torso (mageRef)
  // Body Mesh (Hitbox & Root Anchor) di y = 1.35
  const body = new THREE.Mesh(geos.torsoChestGeo, mats.midnightIndigoMat);
  body.name = 'MageBody';
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // 1a. Kerah Tinggi Berdiri (High Collar & Mantle)
  // Kerah belakang berdiri tegak di sekitar leher berlis emas
  const collarBack = new THREE.Mesh(geos.collarBackGeo, mats.midnightIndigoMat);
  collarBack.position.set(0, 0.45, -0.19);
  collarBack.rotation.x = -0.12;
  collarBack.castShadow = true;
  body.add(collarBack);

  const collarTrim = new THREE.Mesh(geos.collarTrimGeo, mats.goldTrimMat);
  collarTrim.position.set(0, 0.56, -0.21);
  collarTrim.rotation.x = -0.12;
  body.add(collarTrim);

  // Kerah samping kiri & kanan
  const collarSideL = new THREE.Mesh(geos.collarSideGeo, mats.midnightIndigoMat);
  collarSideL.position.set(0.20, 0.44, -0.04);
  collarSideL.rotation.y = 0.15;
  const collarSideR = new THREE.Mesh(geos.collarSideGeo, mats.midnightIndigoMat);
  collarSideR.position.set(-0.20, 0.44, -0.04);
  collarSideR.rotation.y = -0.15;
  body.add(collarSideL, collarSideR);

  // Syal / Mantle Bahu Bertingkat (Tiered Shoulder Mantle)
  const mantleUpper = new THREE.Mesh(geos.mantleUpperGeo, mats.midnightIndigoMat);
  mantleUpper.position.set(0, 0.32, 0);
  mantleUpper.castShadow = true;
  body.add(mantleUpper);

  const mantleTrim = new THREE.Mesh(geos.mantleTrimGeo, mats.goldTrimMat);
  mantleTrim.position.set(0, 0.25, 0);
  body.add(mantleTrim);

  // 1b. Tabard Dada dengan Bordir Simbol Bintang / Rune Emas
  const tabardChest = new THREE.Mesh(geos.tabardChestGeo, mats.midnightIndigoMat);
  tabardChest.position.set(0, 0.08, 0.21);
  tabardChest.castShadow = true;
  body.add(tabardChest);

  // Bordir Simbol Bintang Astral Emas di dada
  const starH = new THREE.Mesh(geos.astralStarHGeo, mats.goldTrimMat);
  starH.position.set(0, 0.12, 0.235);
  const starV = new THREE.Mesh(geos.astralStarVGeo, mats.goldTrimMat);
  starV.position.set(0, 0.12, 0.235);
  const starCenter = new THREE.Mesh(geos.astralStarCenterGeo, mats.crystalCyanMat);
  starCenter.position.set(0, 0.12, 0.245);
  body.add(starH, starV, starCenter);

  // 1c. Sabuk Kulit Tebal dengan Gesper Emas Bercahaya Cyan
  const beltMesh = new THREE.Mesh(geos.beltGeo, mats.beltDarkMat);
  beltMesh.position.set(0, -0.32, 0);
  body.add(beltMesh);

  const buckleMesh = new THREE.Mesh(geos.buckleGeo, mats.goldTrimMat);
  buckleMesh.position.set(0, -0.32, 0.01);
  body.add(buckleMesh);

  const buckleGem = new THREE.Mesh(geos.buckleGemGeo, mats.crystalCyanMat);
  buckleGem.position.set(0, -0.32, 0.015);
  body.add(buckleGem);

  // 1d. Tabard Depan Terbelah (Split Front Skirt):
  // Menjuntai dari sabuk hingga ke bawah lutut, terbelah di tengah agar bebas bergerak tanpa clipping
  const tabardLeft = new THREE.Mesh(geos.tabardLeftFlapGeo, mats.midnightIndigoMat);
  tabardLeft.position.set(0.09, -0.38, 0.21);
  tabardLeft.castShadow = true;

  const tabardLeftTrim = new THREE.Mesh(geos.tabardTrimGeo, mats.goldTrimMat);
  tabardLeftTrim.position.set(0.09, -0.84, 0.215);

  const tabardRight = new THREE.Mesh(geos.tabardRightFlapGeo, mats.midnightIndigoMat);
  tabardRight.position.set(-0.09, -0.38, 0.21);
  tabardRight.castShadow = true;

  const tabardRightTrim = new THREE.Mesh(geos.tabardTrimGeo, mats.goldTrimMat);
  tabardRightTrim.position.set(-0.09, -0.84, 0.215);

  body.add(tabardLeft, tabardLeftTrim, tabardRight, tabardRightTrim);

  // Hem Rok Bagian Belakang & Samping
  const skirtBack = new THREE.Mesh(geos.skirtBackHemGeo, mats.midnightIndigoMat);
  skirtBack.position.set(0, -0.48, -0.02);
  skirtBack.castShadow = true;
  body.add(skirtBack);

  // 2. Jubah Belakang (Flowing Cape): Lebih lebar, meruncing berlipat bertingkat dengan lis emas
  const cape = new THREE.Mesh(geos.capeGeo, mats.capeIndigoMat);
  cape.name = 'MageCape';
  cape.position.set(0, 1.25, -0.23);
  cape.rotation.x = 0.06; // Miring tipis ke belakang
  cape.castShadow = true;
  group.add(cape);

  const capeTrim = new THREE.Mesh(geos.capeTrimGeo, mats.goldTrimMat);
  capeTrim.position.set(0, -0.62, 0.015);
  cape.add(capeTrim);

  // 3. Pelindung Bahu Melengkung (Arcane Pauldrons): Bingkai emas runcing & permata rune cyan kecil
  const buildArcanePauldron = (isLeft: boolean): THREE.Group => {
    const pGroup = new THREE.Group();
    pGroup.name = isLeft ? 'LeftPauldron' : 'RightPauldron';

    // Badan pelindung bahu melengkung indigo
    const pBody = new THREE.Mesh(geos.pauldronBodyGeo, mats.pauldronIndigoMat);
    pBody.castShadow = true;
    pGroup.add(pBody);

    // Bingkai emas runcing di tepi luar
    const crest = new THREE.Mesh(geos.pauldronCrestGeo, mats.goldTrimMat);
    crest.position.set(isLeft ? 0.06 : -0.06, 0.06, 0);
    crest.rotation.z = isLeft ? -0.22 : 0.22;
    pGroup.add(crest);

    // Permata rune cyan bersinar di tengah bahu
    const gem = new THREE.Mesh(geos.pauldronGemGeo, mats.crystalCyanMat);
    gem.position.set(isLeft ? 0.08 : -0.08, 0.12, 0);
    pGroup.add(gem);

    pGroup.position.set(isLeft ? 0.48 : -0.48, 1.76, 0);
    pGroup.rotation.z = isLeft ? -0.20 : 0.20;
    return pGroup;
  };
  const leftPauldron = buildArcanePauldron(true);
  const rightPauldron = buildArcanePauldron(false);
  group.add(leftPauldron, rightPauldron);

  // 4. Head, Face & Arcane Pointed Hat Group
  const headGroup = new THREE.Group();
  headGroup.name = 'MageHeadGroup';
  headGroup.position.set(0, 2.08, 0); // Di atas leher & bahu torso
  group.add(headGroup);

  // Kepala sculpted low-poly proporsional
  const head = new THREE.Mesh(geos.headGeo, mats.skinPeachMat);
  head.name = 'MageHead';
  head.castShadow = true;
  headGroup.add(head);

  // Mata Menyala Cyan Terang (#00F0FF, emissive: 2.0) di dalam bayangan topi
  const leftEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  leftEye.position.set(0.09, 0.035, 0.192);
  const rightEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  rightEye.position.set(-0.09, 0.035, 0.192);
  headGroup.add(leftEye, rightEye);

  // Alis Tajam di Atas Mata (Sharp Angled Eyebrows)
  const leftEyebrow = new THREE.Mesh(geos.eyebrowGeo, mats.beardHairMat);
  leftEyebrow.position.set(0.09, 0.075, 0.195);
  leftEyebrow.rotation.z = -0.18;
  const rightEyebrow = new THREE.Mesh(geos.eyebrowGeo, mats.beardHairMat);
  rightEyebrow.position.set(-0.09, 0.075, 0.195);
  rightEyebrow.rotation.z = 0.18;
  headGroup.add(leftEyebrow, rightEyebrow);

  // Janggut Runcing Bergaya Low-Poly Rapi (Pointed Low-Poly Beard)
  // Kumis rapi melengkung
  const mustacheL = new THREE.Mesh(geos.mustacheGeo, mats.beardHairMat);
  mustacheL.position.set(0.055, -0.05, 0.20);
  mustacheL.rotation.z = -0.15;
  const mustacheR = new THREE.Mesh(geos.mustacheGeo, mats.beardHairMat);
  mustacheR.position.set(-0.055, -0.05, 0.20);
  mustacheR.rotation.z = 0.15;
  headGroup.add(mustacheL, mustacheR);

  // Tingkat atas janggut dagu
  const beardTop = new THREE.Mesh(geos.beardTopGeo, mats.beardHairMat);
  beardTop.position.set(0, -0.12, 0.195);
  beardTop.castShadow = true;

  // Tingkat tengah janggut meruncing
  const beardMid = new THREE.Mesh(geos.beardMidGeo, mats.beardHairMat);
  beardMid.position.set(0, -0.18, 0.185);
  beardMid.castShadow = true;

  // Ujung janggut runcing kerucut (pointed tip)
  const beardTip = new THREE.Mesh(geos.beardTipGeo, mats.beardHairMat);
  beardTip.position.set(0, -0.24, 0.17);
  beardTip.rotation.x = 0.20; // Meruncing anggun ke depan
  beardTip.castShadow = true;
  headGroup.add(beardTop, beardMid, beardTip);

  // Rambut Panjang Tergerai Rapi dari Bawah Topi Menyentuh Kerah Bahu
  const hairBack = new THREE.Mesh(geos.hairBackGeo, mats.beardHairMat);
  hairBack.position.set(0, 0.02, -0.195);
  hairBack.castShadow = true;

  const hairNape = new THREE.Mesh(geos.hairNapeGeo, mats.beardHairMat);
  hairNape.position.set(0, -0.18, -0.19);
  hairNape.castShadow = true;

  const hairSideL = new THREE.Mesh(geos.hairSideGeo, mats.beardHairMat);
  hairSideL.position.set(0.195, 0.01, 0.02);
  hairSideL.castShadow = true;

  const hairSideR = new THREE.Mesh(geos.hairSideGeo, mats.beardHairMat);
  hairSideR.position.set(-0.195, 0.01, 0.02);
  hairSideR.castShadow = true;

  const hairLockL = new THREE.Mesh(geos.hairFrontLockGeo, mats.beardHairMat);
  hairLockL.position.set(0.175, -0.09, 0.14);
  const hairLockR = new THREE.Mesh(geos.hairFrontLockGeo, mats.beardHairMat);
  hairLockR.position.set(-0.175, -0.09, 0.14);

  headGroup.add(hairBack, hairNape, hairSideL, hairSideR, hairLockL, hairLockR);

  // Topi Penyihir Agung Berlekuk (Arcane Pointed Hat with Crooked Wizard Tip)
  const hatGroup = new THREE.Group();
  hatGroup.name = 'MageWizardHat';
  hatGroup.position.set(0, 0.19, 0); // Di puncak kepala

  // Pinggiran lebar melengkung berlis emas
  const hatBrim = new THREE.Mesh(geos.hatBrimGeo, mats.midnightIndigoMat);
  hatBrim.position.y = 0.02;
  hatBrim.castShadow = true;

  const hatBrimTrim = new THREE.Mesh(geos.hatBrimTrimGeo, mats.goldTrimMat);
  hatBrimTrim.position.y = 0.015;
  hatGroup.add(hatBrim, hatBrimTrim);

  // Pita lilitan emas berhias permata cyan kecil di bagian depan
  const hatBand = new THREE.Mesh(geos.hatBandGeo, mats.goldTrimMat);
  hatBand.position.y = 0.055;
  hatGroup.add(hatBand);

  const hatBrooch = new THREE.Mesh(geos.hatBroochGeo, mats.goldTrimMat);
  hatBrooch.position.set(0, 0.055, 0.28);
  const hatGem = new THREE.Mesh(geos.hatGemGeo, mats.crystalCyanMat);
  hatGem.position.set(0, 0.055, 0.295);
  hatGroup.add(hatBrooch, hatGem);

  // Kerucut Atas 3-Tingkat Berlekuk ke Belakang (Crooked Wizard Tip):
  // Tier 1
  const coneTier1 = new THREE.Mesh(geos.coneTier1Geo, mats.midnightIndigoMat);
  coneTier1.position.set(0, 0.06, 0);
  coneTier1.rotation.x = -0.10;
  coneTier1.castShadow = true;

  // Tier 2
  const coneTier2 = new THREE.Mesh(geos.coneTier2Geo, mats.midnightIndigoMat);
  coneTier2.position.set(0, 0.25, -0.03);
  coneTier2.rotation.x = -0.22;
  coneTier2.castShadow = true;

  // Tier 3 (crooked crooked tip)
  const coneTier3 = new THREE.Mesh(geos.coneTier3Geo, mats.midnightIndigoMat);
  coneTier3.position.set(0, 0.46, -0.09);
  coneTier3.rotation.x = -0.34;
  coneTier3.rotation.z = 0.08;
  coneTier3.castShadow = true;

  hatGroup.add(coneTier1, coneTier2, coneTier3);
  headGroup.add(hatGroup);

  // 5. Tangan Kanan & Senjata Tongkat Astral (Celestial Crystal Staff)
  const rightArm = new THREE.Group();
  rightArm.name = 'MageRightArm';
  rightArm.position.set(-0.46, 1.70, 0);

  const rightUpperArm = new THREE.Mesh(geos.armUpperGeo, mats.midnightIndigoMat);
  rightUpperArm.position.y = -0.16;
  rightUpperArm.castShadow = true;
  rightArm.add(rightUpperArm);

  const rightForearm = new THREE.Group();
  rightForearm.position.set(0, -0.32, 0);

  // Lengan jubah melebar (Bell Sleeve) dengan manset emas
  const rightBellSleeve = new THREE.Mesh(geos.bellSleeveGeo, mats.midnightIndigoMat);
  rightBellSleeve.castShadow = true;
  rightForearm.add(rightBellSleeve);

  const rightBellCuff = new THREE.Mesh(geos.bellCuffGeo, mats.goldTrimMat);
  rightForearm.add(rightBellCuff);

  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.32, 0);
  const rightHandMesh = new THREE.Mesh(geos.handGeo, mats.skinPeachMat);
  rightHandMesh.position.set(0, -0.06, 0.02);
  rightHandMesh.castShadow = true;
  rightHand.add(rightHandMesh);

  // Staff (Tongkat Astral Kayu Gelap Berulir dengan Mahkota Cabang Emas & Kristal Melayang)
  const weapon = new THREE.Group();
  weapon.name = 'MageStaff';

  const staffShaft = new THREE.Mesh(geos.staffShaftGeo, mats.staffWoodMat);
  staffShaft.castShadow = true;
  weapon.add(staffShaft);

  // Lilitan cincin emas di atas, tengah, dan ujung bawah tongkat
  const ringTop = new THREE.Mesh(geos.staffRingCoilGeo, mats.goldTrimMat);
  ringTop.position.y = 0.65;
  const ringGrip = new THREE.Mesh(geos.staffRingCoilGeo, mats.goldTrimMat);
  ringGrip.position.y = 0.08;
  const ringBottom = new THREE.Mesh(geos.staffRingCoilGeo, mats.goldTrimMat);
  ringBottom.position.y = -0.76;
  weapon.add(ringTop, ringGrip, ringBottom);

  // Mahkota cabang emas melengkung (crescent branch prongs)
  const staffCrownBase = new THREE.Mesh(geos.staffCrownBaseGeo, mats.goldTrimMat);
  staffCrownBase.position.y = 0.70;
  weapon.add(staffCrownBase);

  const prongL = new THREE.Mesh(geos.staffCrescentProngGeo, mats.goldTrimMat);
  prongL.position.set(0.12, 0.85, 0);
  prongL.rotation.z = -0.22;
  const prongR = new THREE.Mesh(geos.staffCrescentProngGeo, mats.goldTrimMat);
  prongR.position.set(-0.12, 0.85, 0);
  prongR.rotation.z = 0.22;
  weapon.add(prongL, prongR);

  // Kristal Oktahedron Cyan Bercahaya Melayang Bebas di Udara (orbMesh)
  const orbMesh = new THREE.Mesh(geos.staffCrystalGeo, mats.crystalCyanMat);
  orbMesh.name = 'StaffFloatingCrystal';
  orbMesh.position.set(0, 0.88, 0);
  weapon.add(orbMesh);

  // Cincin Rune Emas Tipis yang Melayang Miring Berputar (orbRing)
  const orbRing = new THREE.Mesh(geos.staffRuneRingGeo, mats.goldTrimMat);
  orbRing.name = 'StaffFloatingRuneRing';
  orbRing.position.set(0, 0.88, 0);
  orbRing.rotation.set(0.35, 0, 0.25);
  weapon.add(orbRing);

  // Pasang tongkat pas di cengkeraman tangan kanan
  weapon.position.set(0.01, 0.0, 0.10);
  weapon.rotation.set(0.32, 0.10, 0.05);
  rightHand.add(weapon);

  rightForearm.add(rightHand);
  rightArm.add(rightForearm);
  group.add(rightArm);

  // 6. Tangan Kiri & Grimoire Sihir Melayang (Floating Spellbook)
  const leftArm = new THREE.Group();
  leftArm.name = 'MageLeftArm';
  leftArm.position.set(0.46, 1.70, 0);

  const leftUpperArm = new THREE.Mesh(geos.armUpperGeo, mats.midnightIndigoMat);
  leftUpperArm.position.y = -0.16;
  leftUpperArm.castShadow = true;
  leftArm.add(leftUpperArm);

  const leftForearm = new THREE.Group();
  leftForearm.position.set(0, -0.32, 0);

  // Lengan jubah kiri melebar (Bell Sleeve)
  const leftBellSleeve = new THREE.Mesh(geos.bellSleeveGeo, mats.midnightIndigoMat);
  leftBellSleeve.castShadow = true;
  leftForearm.add(leftBellSleeve);

  const leftBellCuff = new THREE.Mesh(geos.bellCuffGeo, mats.goldTrimMat);
  leftForearm.add(leftBellCuff);

  const leftHand = new THREE.Group();
  leftHand.position.set(0, -0.32, 0);
  const leftHandMesh = new THREE.Mesh(geos.handGeo, mats.skinPeachMat);
  leftHandMesh.position.set(0, -0.06, 0.02);
  leftHandMesh.castShadow = true;
  leftHand.add(leftHandMesh);

  leftForearm.add(leftHand);
  leftArm.add(leftForearm);
  group.add(leftArm);

  // Grimoire Sihir Melayang (Floating Spellbook):
  // Melayang sedikit di samping pinggang kiri karakter dengan gerakan naik-turun lembut (idle hover)
  // serta partikel cahaya cyan tipis
  const grimoire = new THREE.Group();
  grimoire.name = 'FloatingGrimoire';

  const gCover = new THREE.Mesh(geos.grimoireCoverGeo, mats.grimoireCoverMat);
  gCover.castShadow = true;
  const gPages = new THREE.Mesh(geos.grimoirePagesGeo, mats.grimoirePagesMat);
  gPages.position.x = 0.01;
  const gSpine = new THREE.Mesh(geos.grimoireSpineGeo, mats.goldTrimMat);
  gSpine.position.set(-0.042, 0, 0);

  // 4 Sudut Logam Emas (Gold Corner Brackets)
  const cTopLeft = new THREE.Mesh(geos.grimoireCornerGeo, mats.goldTrimMat);
  cTopLeft.position.set(0.01, 0.17, 0.12);
  const cTopRight = new THREE.Mesh(geos.grimoireCornerGeo, mats.goldTrimMat);
  cTopRight.position.set(0.01, 0.17, -0.12);
  const cBotLeft = new THREE.Mesh(geos.grimoireCornerGeo, mats.goldTrimMat);
  cBotLeft.position.set(0.01, -0.17, 0.12);
  const cBotRight = new THREE.Mesh(geos.grimoireCornerGeo, mats.goldTrimMat);
  cBotRight.position.set(0.01, -0.17, -0.12);

  // Segel Kristal Cyan di Sampul Buku
  const gSeal = new THREE.Mesh(geos.grimoireRuneSealGeo, mats.crystalCyanMat);
  gSeal.position.set(0.045, 0, 0);
  gSeal.rotation.y = Math.PI / 4;

  // Partikel Cahaya Cyan Tipis
  const gSparks = new THREE.Points(geos.grimoireSparkGeo, mats.sparkCyanMat);

  grimoire.add(gCover, gPages, gSpine, cTopLeft, cTopRight, cBotLeft, cBotRight, gSeal, gSparks);

  // Posisi default melayang anggun di samping pinggul kiri
  grimoire.position.set(0.42, 1.25, 0.05);
  grimoire.rotation.set(0.18, 0.10, -0.05);
  group.add(grimoire);

  // 7. Kaki & Sepatu Bot Runcing Berlis Emas (Pointed Archmage Boots)
  const buildMageLeg = (posX: number): { leg: THREE.Group; knee: THREE.Group } => {
    const leg = new THREE.Group();
    leg.position.set(posX, 0.88, 0);

    // Paha Balok Indigo
    const thigh = new THREE.Mesh(geos.thighGeo, mats.midnightIndigoMat);
    thigh.position.y = -0.19;
    thigh.castShadow = true;
    leg.add(thigh);

    // Kaki Bawah & Lutut
    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.38, 0);

    // Pelindung Lutut Emas
    const kneeGuard = new THREE.Mesh(geos.kneeGuardGeo, mats.goldTrimMat);
    kneeGuard.position.set(0, 0, 0.02);
    kneeGuard.castShadow = true;
    kneeGroup.add(kneeGuard);

    // Betis Indigo
    const shin = new THREE.Mesh(geos.shinGeo, mats.midnightIndigoMat);
    shin.position.y = -0.14;
    shin.castShadow = true;
    kneeGroup.add(shin);

    // Sepatu Bot Kulit Gelap Dipoles
    const ankle = new THREE.Mesh(geos.bootAnkleGeo, mats.bootBrownMat);
    ankle.position.set(0, -0.32, 0.01);
    ankle.castShadow = true;
    kneeGroup.add(ankle);

    // Lis Emas di atas Pergelangan Bot
    const bootRim = new THREE.Mesh(geos.bootGoldRimGeo, mats.goldTrimMat);
    bootRim.position.set(0, -0.24, 0.01);
    kneeGroup.add(bootRim);

    // Ujung Bot Runcing (Pointed Toe)
    const toePoint = new THREE.Mesh(geos.bootToePointGeo, mats.bootBrownMat);
    toePoint.position.set(0, -0.42, 0.16);
    toePoint.castShadow = true;
    kneeGroup.add(toePoint);

    // Sol Sepatu Bot Datar (Rata menyentuh tanah y=0.00)
    const sole = new THREE.Mesh(geos.bootSoleGeo, mats.soleMat);
    sole.position.set(0, -0.48, 0.05);
    sole.receiveShadow = true;
    kneeGroup.add(sole);

    leg.add(kneeGroup);
    group.add(leg);
    return { leg, knee: kneeGroup };
  };

  const leftLegObj = buildMageLeg(0.20);
  const rightLegObj = buildMageLeg(-0.20);
  const leftLeg = leftLegObj.leg;
  const rightLeg = rightLegObj.leg;
  const leftKnee = leftLegObj.knee;
  const rightKnee = rightLegObj.knee;

  // 8. Tier 3 - 6 Celestial Archmage Features (Orbiting Crystals, Halos, Wings, Mandalas)
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  let wings: THREE.Group | undefined;
  let orbitingOrbs: THREE.Mesh[] | undefined;
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  if (tier >= 3) {
    orbitingOrbs = [];

    // Halos
    const haloColor = tier >= 6 ? 0xE0E7FF : 0x00F0FF;
    const haloRadius = tier >= 5 ? 0.44 : 0.36;
    const haloGeo = new THREE.TorusGeometry(haloRadius, 0.035, 6, 20);
    haloGeo.rotateX(Math.PI / 2);
    halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.9 }));
    halo.position.y = 2.82;
    group.add(halo);

    if (tier >= 6) {
      const outerHaloGeo = new THREE.TorusGeometry(0.58, 0.025, 6, 24);
      outerHaloGeo.rotateX(Math.PI / 2);
      halo2 = new THREE.Mesh(outerHaloGeo, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 }));
      halo2.position.y = 2.86;
      group.add(halo2);
    }

    // Wings
    if (tier >= 4) {
      wings = new THREE.Group();
      wings.position.set(0, 1.70, -0.28);
      const wingMat = new THREE.MeshStandardMaterial({
        color: tier >= 6 ? 0xE0E7FF : 0x00E5FF,
        emissive: tier >= 6 ? 0xA5B4FC : 0x00B4D8,
        emissiveIntensity: tier >= 6 ? 1.4 : tier >= 5 ? 1.1 : 0.8,
        side: THREE.DoubleSide,
      });
      const featherCount = tier >= 6 ? 8 : tier >= 5 ? 6 : 4;
      const wingSpanScale = tier >= 6 ? 1.55 : tier >= 5 ? 1.3 : 1.0;

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
    }

    // Orbiting Mana Crystals
    const orbCount = tier >= 6 ? 6 : tier >= 5 ? 4 : (tier >= 4 ? 3 : 2);
    const orbColors = [0x00F0FF, 0xA855F7, 0xFBBF24, 0x67E8F9, 0xFFFFFF, 0xC084FC];
    for (let i = 0; i < orbCount; i++) {
      const orbMat = new THREE.MeshStandardMaterial({
        color: orbColors[i % orbColors.length],
        emissive: orbColors[i % orbColors.length],
        emissiveIntensity: tier >= 6 ? 1.6 : 1.2,
      });
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(tier >= 6 ? 0.16 : 0.12, 0), orbMat);
      const angle = (i / orbCount) * Math.PI * 2;
      const radius = tier >= 5 ? 1.15 : 0.9;
      orb.position.set(Math.cos(angle) * radius, 1.8, Math.sin(angle) * radius);
      group.add(orb);
      orbitingOrbs.push(orb);
    }

    // Ground Aura Rings & Astral Mandalas
    const auraColor = 0x00E5FF;
    const ringGeo = new THREE.RingGeometry(0.65, tier >= 5 ? 0.85 : 0.78, 24);
    ringGeo.rotateX(-Math.PI / 2);
    auraRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: auraColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: tier >= 6 ? 0.85 : 0.6,
      })
    );
    auraRing.position.y = 0.05;
    group.add(auraRing);

    if (tier >= 5) {
      const outerRingGeo = new THREE.RingGeometry(1.05, 1.22, 32);
      outerRingGeo.rotateX(-Math.PI / 2);
      auraRing2 = new THREE.Mesh(
        outerRingGeo,
        new THREE.MeshBasicMaterial({
          color: tier >= 6 ? 0xFFFFFF : 0xA855F7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: tier >= 6 ? 0.75 : 0.45,
        })
      );
      auraRing2.position.y = 0.06;
      group.add(auraRing2);
    }
  }

  return {
    group,
    leftArm,
    rightArm,
    leftForearm,
    leftHand,
    rightHand,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    weapon,
    cape,
    body,
    head: headGroup as unknown as THREE.Mesh,
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
  };
}

/**
 * ============================================================================
 * ANIMASI JALAN, SPRINT (ASTRAL GLIDE), IDLE & FLOATING OBJECTS MAGE
 * ============================================================================
 * - Animasi Tongkat:
 *   * Kristal oktahedron cyan (orbMesh) melayang bebas dan berputar perlahan
 *   * Cincin rune emas tipis (orbRing) melayang miring dan berputar presesi
 * - Animasi Grimoire:
 *   * Melayang di samping pinggul kiri dengan idle hover naik-turun halus
 *   * Partikel cyan berkedip lembut
 * - Animasi Jubah Belakang:
 *   * Mengayun halus (sway) saat berjalan, berkibar mulus saat lari/glide
 */
export function animateMageWalk(
  playerMesh: PlayerMeshObjects,
  walkTime: number,
  playerPosY: number,
  isMoving: boolean,
  isAttacking: boolean = false,
  isSprinting: boolean = false
): void {
  const lerpSpeed = 0.20;

  // 1. Update Floating Crystal & Rune Ring Animation on Celestial Staff
  if (playerMesh.orbMesh) {
    // Berputar perlahan di udara pada sumbu Y dan X
    playerMesh.orbMesh.rotation.y = walkTime * 1.6;
    playerMesh.orbMesh.rotation.x = Math.sin(walkTime * 1.2) * 0.25;
    // Hovering vertikal mikro di dalam mahkota cabang emas
    playerMesh.orbMesh.position.y = 0.88 + Math.sin(walkTime * 3.0) * 0.025;
  }

  if (playerMesh.orbRing) {
    // Cincin rune emas tipis ikut berputar miring (presesi)
    playerMesh.orbRing.rotation.z = walkTime * 1.4;
    playerMesh.orbRing.rotation.y = walkTime * 0.9;
    playerMesh.orbRing.position.y = 0.88 + Math.sin(walkTime * 3.0) * 0.025;
  }

  // 2. Update Floating Grimoire Idle Hover beside left hip
  if (playerMesh.grimoire) {
    const grimoireHoverY = 1.25 + Math.sin(walkTime * 2.5) * 0.045;
    const grimoireTiltZ = -0.05 + Math.sin(walkTime * 2.0) * 0.04;
    const grimoireTiltX = 0.18 + Math.cos(walkTime * 2.2) * 0.03;

    if (!isAttacking) {
      playerMesh.grimoire.position.x = THREE.MathUtils.lerp(playerMesh.grimoire.position.x, 0.42, lerpSpeed);
      playerMesh.grimoire.position.y = THREE.MathUtils.lerp(playerMesh.grimoire.position.y, grimoireHoverY, lerpSpeed);
      playerMesh.grimoire.position.z = THREE.MathUtils.lerp(playerMesh.grimoire.position.z, 0.05, lerpSpeed);
      playerMesh.grimoire.rotation.x = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.x, grimoireTiltX, lerpSpeed);
      playerMesh.grimoire.rotation.y = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.y, 0.10, lerpSpeed);
      playerMesh.grimoire.rotation.z = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.z, grimoireTiltZ, lerpSpeed);
    }
  }

  // 3. Update Locomotion (Sprint / Walk / Idle)
  if (isMoving) {
    if (isSprinting) {
      // Astral Glide (Superman Pose Melayang Cepat Aerodinamis):
      const targetBodyPitch = 0.42;
      playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, targetBodyPitch, lerpSpeed);
      playerMesh.body.rotation.y = THREE.MathUtils.lerp(playerMesh.body.rotation.y, 0, lerpSpeed);
      playerMesh.body.rotation.z = THREE.MathUtils.lerp(playerMesh.body.rotation.z, 0, lerpSpeed);
      playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.35, lerpSpeed);

      // Tatapan lurus ke depan
      const targetHeadPitch = -targetBodyPitch * 0.75;
      playerMesh.head.position.set(0, 2.08, 0);
      playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, targetHeadPitch, lerpSpeed);
      playerMesh.head.rotation.y = THREE.MathUtils.lerp(playerMesh.head.rotation.y, 0, lerpSpeed);
      playerMesh.head.rotation.z = THREE.MathUtils.lerp(playerMesh.head.rotation.z, 0, lerpSpeed);

      // Kaki menjulur santai ke belakang
      const targetLeftHip = -targetBodyPitch * 0.8;
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, targetLeftHip, lerpSpeed);
      playerMesh.leftLeg.rotation.y = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.y, 0, lerpSpeed);
      playerMesh.leftLeg.rotation.z = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.z, -0.06, lerpSpeed);
      if (playerMesh.leftKnee) {
        playerMesh.leftKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.leftKnee.rotation.x, 0.15, lerpSpeed);
      }

      const targetRightHip = -targetBodyPitch * 0.5;
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, targetRightHip, lerpSpeed);
      playerMesh.rightLeg.rotation.y = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.y, 0, lerpSpeed);
      playerMesh.rightLeg.rotation.z = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.z, 0.06, lerpSpeed);
      if (playerMesh.rightKnee) {
        playerMesh.rightKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.rightKnee.rotation.x, 0.55, lerpSpeed);
      }

      // Jubah berkibar ke belakang bebas clipping
      const capeWave = Math.sin(walkTime * 12.0) * 0.08;
      const targetCapeX = -targetBodyPitch * 0.6 + capeWave;
      playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, targetCapeX, lerpSpeed);

      // Lengan tersapu angin ke belakang
      const targetArmX = -targetBodyPitch * 0.8;
      playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, targetArmX, lerpSpeed);
      playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.05, lerpSpeed);
      playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, -0.16, lerpSpeed);

      if (!isAttacking) {
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, targetArmX, lerpSpeed);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.05, lerpSpeed);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0.16, lerpSpeed);

        playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, -1.45, lerpSpeed);
        playerMesh.weapon.rotation.y = THREE.MathUtils.lerp(playerMesh.weapon.rotation.y, -0.10, lerpSpeed);
        playerMesh.weapon.rotation.z = THREE.MathUtils.lerp(playerMesh.weapon.rotation.z, 0.05, lerpSpeed);
      }

      // Kristal tongkat menyala lebih terang saat terbang cepat
      if (playerMesh.orbMesh && (playerMesh.orbMesh.material as THREE.MeshStandardMaterial)) {
        (playerMesh.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = THREE.MathUtils.lerp(
          (playerMesh.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity,
          2.8,
          lerpSpeed
        );
      }
    } else {
      // Walk Cycle Biasa (Frekuensi 8.5)
      playerMesh.head.position.set(0, 2.08, 0);
      playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0, lerpSpeed);

      if (playerMesh.leftKnee) {
        playerMesh.leftKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.leftKnee.rotation.x, 0, lerpSpeed);
      }
      if (playerMesh.rightKnee) {
        playerMesh.rightKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.rightKnee.rotation.x, 0, lerpSpeed);
      }

      if (playerMesh.orbMesh && (playerMesh.orbMesh.material as THREE.MeshStandardMaterial)) {
        (playerMesh.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = THREE.MathUtils.lerp(
          (playerMesh.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity,
          2.0,
          lerpSpeed
        );
      }

      playerMesh.leftLeg.rotation.z = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.z, 0, lerpSpeed);
      playerMesh.rightLeg.rotation.z = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.z, 0, lerpSpeed);
      const legSwing = Math.sin(walkTime * 8.5) * 0.45;
      playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, lerpSpeed);
      playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, lerpSpeed);

      playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0, lerpSpeed);
      playerMesh.body.rotation.y = THREE.MathUtils.lerp(playerMesh.body.rotation.y, 0, lerpSpeed);
      playerMesh.body.rotation.z = THREE.MathUtils.lerp(playerMesh.body.rotation.z, 0, lerpSpeed);
      playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.35, lerpSpeed);

      playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, 0.32, lerpSpeed);
      playerMesh.weapon.rotation.y = THREE.MathUtils.lerp(playerMesh.weapon.rotation.y, 0.10, lerpSpeed);
      playerMesh.weapon.rotation.z = THREE.MathUtils.lerp(playerMesh.weapon.rotation.z, 0.05, lerpSpeed);

      if (!isAttacking) {
        const leftArmSwing = Math.sin(walkTime * 8.5) * 0.25;
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, leftArmSwing, lerpSpeed);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.06, lerpSpeed);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.12, lerpSpeed);

        const staffBob = Math.sin(walkTime * 4.25) * 0.04;
        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.18 + staffBob, lerpSpeed);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, lerpSpeed);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0, lerpSpeed);
      }

      // Bobbing badan & ayunan halus jubah
      const bodyBob = Math.abs(Math.sin(walkTime * 8.5)) * 0.07;
      const hipSway = Math.sin(walkTime * 8.5) * 0.025;

      playerMesh.group.position.y = playerPosY + bodyBob;
      playerMesh.group.rotation.z = hipSway;

      const capeFlap = Math.sin(walkTime * 8.5) * 0.05;
      playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.20 + capeFlap, lerpSpeed);
    }
  } else {
    // 2. Idle State: Pernapasan halus & pose santai
    playerMesh.head.position.set(0, 2.08, 0);
    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0, lerpSpeed);
    playerMesh.leftLeg.rotation.z = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.z, 0, lerpSpeed);
    playerMesh.rightLeg.rotation.z = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.z, 0, lerpSpeed);
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, lerpSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, lerpSpeed);

    if (playerMesh.leftKnee) {
      playerMesh.leftKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.leftKnee.rotation.x, 0, lerpSpeed);
    }
    if (playerMesh.rightKnee) {
      playerMesh.rightKnee.rotation.x = THREE.MathUtils.lerp(playerMesh.rightKnee.rotation.x, 0, lerpSpeed);
    }

    if (playerMesh.orbMesh && (playerMesh.orbMesh.material as THREE.MeshStandardMaterial)) {
      (playerMesh.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = THREE.MathUtils.lerp(
        (playerMesh.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity,
        2.0,
        lerpSpeed
      );
    }
    playerMesh.group.rotation.z = THREE.MathUtils.lerp(playerMesh.group.rotation.z, 0, lerpSpeed);
    playerMesh.group.position.y = THREE.MathUtils.lerp(playerMesh.group.position.y, playerPosY, lerpSpeed);

    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0, lerpSpeed);
    playerMesh.body.rotation.y = THREE.MathUtils.lerp(playerMesh.body.rotation.y, 0, lerpSpeed);
    playerMesh.body.rotation.z = THREE.MathUtils.lerp(playerMesh.body.rotation.z, 0, lerpSpeed);

    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, 0.32, lerpSpeed);
    playerMesh.weapon.rotation.y = THREE.MathUtils.lerp(playerMesh.weapon.rotation.y, 0.10, lerpSpeed);
    playerMesh.weapon.rotation.z = THREE.MathUtils.lerp(playerMesh.weapon.rotation.z, 0.05, lerpSpeed);

    const breathe = Math.sin(walkTime * 2.5) * 0.02;
    playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.35 + breathe, lerpSpeed);
    playerMesh.body.position.x = THREE.MathUtils.lerp(playerMesh.body.position.x, 0, lerpSpeed);
    playerMesh.body.position.z = THREE.MathUtils.lerp(playerMesh.body.position.z, 0, lerpSpeed);

    if (!isAttacking) {
      playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.18 + breathe * 0.3, lerpSpeed);
      playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, lerpSpeed);
      playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0, lerpSpeed);

      playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0.06 - breathe * 0.2, lerpSpeed);
      playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.08, lerpSpeed);
      playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.12, lerpSpeed);
    }

    // Ayunan halus jubah belakang saat bernapas
    playerMesh.cape.rotation.x = THREE.MathUtils.lerp(playerMesh.cape.rotation.x, 0.06 + Math.sin(walkTime * 2) * 0.02, lerpSpeed);
  }
}

/**
 * ============================================================================
 * STATE ANIMASI SKILL MAGE (Spesifikasi Bagian 3)
 * ============================================================================
 */
export interface MageSkillAnimContext {
  attackType: string | null;
  progress: number; // 0.0 s/d 1.0
  isCasting: boolean;
  castingProgress: number; // 0.0 s/d 1.0
  isBlinking: boolean;
  blinkProgress: number; // 0.0 s/d 1.0
  isCastingLight?: boolean;
}

export function animateMageSkillPose(
  playerMesh: PlayerMeshObjects,
  ctx: MageSkillAnimContext
): void {
  const lerpSpeed = 0.25;

  // A. Basic Attack: Arcane Beam (Channeling 1.0 Detik)
  if (ctx.attackType === 'basic') {
    // 1. Lengan Kanan: Angkat lurus ke depan setinggi dada
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -Math.PI / 2, lerpSpeed);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, lerpSpeed);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, 0, lerpSpeed);

    // Orientasi Tongkat: Ujung kristal biru menghadap lurus ke depan (+Z target)
    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, Math.PI, lerpSpeed);
    playerMesh.weapon.rotation.y = THREE.MathUtils.lerp(playerMesh.weapon.rotation.y, 0, lerpSpeed);
    playerMesh.weapon.rotation.z = THREE.MathUtils.lerp(playerMesh.weapon.rotation.z, 0, lerpSpeed);

    // 2. Lengan Kiri (Grimoire): Kitab melayang sedikit ke depan seolah membaca mantra
    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.40, lerpSpeed);
    playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.50, lerpSpeed);
    playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.20, lerpSpeed);

    if (playerMesh.grimoire) {
      playerMesh.grimoire.position.x = THREE.MathUtils.lerp(playerMesh.grimoire.position.x, 0.25, lerpSpeed);
      playerMesh.grimoire.position.y = THREE.MathUtils.lerp(playerMesh.grimoire.position.y, 1.40, lerpSpeed);
      playerMesh.grimoire.position.z = THREE.MathUtils.lerp(playerMesh.grimoire.position.z, 0.22, lerpSpeed);
      playerMesh.grimoire.rotation.x = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.x, 0.35, lerpSpeed);
      playerMesh.grimoire.rotation.y = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.y, -0.30, lerpSpeed);
    }

    // 3. Tubuh & Kaki: Kunci torso lurus menghadap target tanpa terpelintir
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0, lerpSpeed);
    playerMesh.body.rotation.y = THREE.MathUtils.lerp(playerMesh.body.rotation.y, 0, lerpSpeed);
    playerMesh.body.rotation.z = THREE.MathUtils.lerp(playerMesh.body.rotation.z, 0, lerpSpeed);
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, -0.15, lerpSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0.15, lerpSpeed);

    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, -0.05, lerpSpeed);
    return;
  } else if (
    !ctx.isCasting &&
    !ctx.isCastingLight &&
    ctx.attackType !== 'starfall' &&
    ctx.attackType !== 'supernova' &&
    ctx.attackType !== 'celestial_heal' &&
    ctx.attackType !== 'cahaya' &&
    ctx.attackType !== 'celestial_light' &&
    ctx.attackType !== 'glacial_barrage'
  ) {
    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, 0.32, lerpSpeed);
    playerMesh.weapon.rotation.y = THREE.MathUtils.lerp(playerMesh.weapon.rotation.y, 0.10, lerpSpeed);
    playerMesh.weapon.rotation.z = THREE.MathUtils.lerp(playerMesh.weapon.rotation.z, 0.05, lerpSpeed);
  }

  // B. Skill 1: Starfall / Celestial Apocalypse (Fase Casting)
  if (ctx.isCasting) {
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, lerpSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, lerpSpeed);
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, -0.06, lerpSpeed);

    // Lengan Kanan (Tongkat): Angkat tinggi ke atas mengacungkan tongkat ke langit
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -Math.PI * 0.85, lerpSpeed);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, lerpSpeed);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.20, lerpSpeed);

    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, Math.PI, lerpSpeed);
    playerMesh.weapon.rotation.y = THREE.MathUtils.lerp(playerMesh.weapon.rotation.y, 0, lerpSpeed);
    playerMesh.weapon.rotation.z = THREE.MathUtils.lerp(playerMesh.weapon.rotation.z, 0, lerpSpeed);

    // Lengan Kiri: Terangkat ke atas menyalurkan energi langit
    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -Math.PI * 0.70, lerpSpeed);
    playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.15, lerpSpeed);
    playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.20, lerpSpeed);

    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, -0.35, lerpSpeed);
    return;
  }

  if (ctx.attackType === 'starfall' || ctx.attackType === 'supernova') {
    const slam = Math.sin((1 - ctx.progress) * Math.PI);
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.65 - slam * 0.85, 0.45);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.35);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.10, 0.35);

    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, Math.PI, 0.35);

    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0.06, 0.35);
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0.12 * slam, 0.35);
    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0.10, lerpSpeed);
    return;
  }

  // C. Skill 2: Blink (Langkah Dimensi - iFrame 0.2 Detik)
  if (ctx.isBlinking || ctx.attackType === 'blink') {
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0.40, 0.35);
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0.50, 0.35);
    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, 0.50, 0.35);

    if (ctx.blinkProgress > 0.7) {
      playerMesh.group.position.y -= 0.10 * (1 - ctx.blinkProgress);
    }
    return;
  } else {
    playerMesh.body.rotation.x = THREE.MathUtils.lerp(playerMesh.body.rotation.x, 0, 0.25);
    playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.35, 0.25);
  }

  // D. Skill 3: Cahaya / Celestial Light (Pose Merapal Doa Agung)
  if (
    ctx.isCastingLight ||
    ctx.attackType === 'celestial_heal' ||
    ctx.attackType === 'cahaya' ||
    ctx.attackType === 'celestial_light'
  ) {
    const castSpeed = 0.28;

    // 1. Lengan Kanan & Tongkat: Angkat diagonal ke atas
    playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -Math.PI * 0.65, castSpeed);
    playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, castSpeed);
    playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.30, castSpeed);

    playerMesh.weapon.rotation.x = THREE.MathUtils.lerp(playerMesh.weapon.rotation.x, Math.PI - 0.20, castSpeed);
    playerMesh.weapon.rotation.y = THREE.MathUtils.lerp(playerMesh.weapon.rotation.y, 0, castSpeed);
    playerMesh.weapon.rotation.z = THREE.MathUtils.lerp(playerMesh.weapon.rotation.z, 0, castSpeed);

    // 2. Lengan Kiri & Grimoire: Membuka kitab di depan dada
    playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -Math.PI * 0.45, castSpeed);
    playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.35, castSpeed);
    playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, -0.20, castSpeed);

    if (playerMesh.grimoire) {
      playerMesh.grimoire.position.x = THREE.MathUtils.lerp(playerMesh.grimoire.position.x, 0.20, castSpeed);
      playerMesh.grimoire.position.y = THREE.MathUtils.lerp(playerMesh.grimoire.position.y, 1.45, castSpeed);
      playerMesh.grimoire.position.z = THREE.MathUtils.lerp(playerMesh.grimoire.position.z, 0.28, castSpeed);
      playerMesh.grimoire.rotation.x = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.x, 0.45, castSpeed);
      playerMesh.grimoire.rotation.y = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.y, -0.25, castSpeed);
      playerMesh.grimoire.rotation.z = THREE.MathUtils.lerp(playerMesh.grimoire.rotation.z, 0.10, castSpeed);
    }

    // 3. Kepala mendongak khidmat
    playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, -0.35, castSpeed);

    // 4. Floating Levitation
    const floatCurve = ctx.progress ? Math.sin(ctx.progress * Math.PI) : 1.0;
    playerMesh.group.position.y += 0.10 * floatCurve;

    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, castSpeed);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, castSpeed);
    playerMesh.body.rotation.set(0, 0, 0);
    return;
  }

  // Default Head Angle Recovery
  playerMesh.head.rotation.x = THREE.MathUtils.lerp(playerMesh.head.rotation.x, 0, lerpSpeed);
}

/**
 * ============================================================================
 * OPTIONAL REACT / R3F COMPONENT WRAPPER (Declarative Props Interface)
 * ============================================================================
 */
export interface MageModelProps {
  speed?: number;
  state?: 'idle' | 'walk' | 'attack' | 'casting' | 'blink' | 'dead';
  castEvent?: string | null;
  tier?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

export const MageModel: React.FC<MageModelProps> = ({
  speed = 0,
  state = 'idle',
  castEvent = null,
  tier = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const mountRef = useRef<THREE.Group>(null);
  const meshObjRef = useRef<PlayerMeshObjects | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const meshObj = createHeroicMageMesh(tier);
    meshObjRef.current = meshObj;
    mountRef.current.add(meshObj.group);

    return () => {
      if (mountRef.current && meshObj.group) {
        mountRef.current.remove(meshObj.group);
      }
    };
  }, [tier]);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) * 0.001, 0.1);
      lastTime = currentTime;

      if (meshObjRef.current) {
        const isMoving = speed > 0.1 || state === 'walk';
        animateMageWalk(meshObjRef.current, currentTime * 0.001, 0, isMoving, state === 'attack');
        if (state === 'attack' || state === 'casting' || state === 'blink' || castEvent) {
          animateMageSkillPose(meshObjRef.current, {
            attackType: castEvent || (state === 'attack' ? 'basic' : state),
            progress: 0.5,
            isCasting: state === 'casting',
            castingProgress: 0.5,
            isBlinking: state === 'blink',
            blinkProgress: 0.5,
          });
        } else {
          meshObjRef.current.body.rotation.x = THREE.MathUtils.lerp(meshObjRef.current.body.rotation.x, 0, delta * 10);
          meshObjRef.current.body.rotation.y = THREE.MathUtils.lerp(meshObjRef.current.body.rotation.y, 0, delta * 10);
          meshObjRef.current.body.rotation.z = THREE.MathUtils.lerp(meshObjRef.current.body.rotation.z, 0, delta * 10);
          meshObjRef.current.body.position.y = THREE.MathUtils.lerp(meshObjRef.current.body.position.y, 1.35, delta * 10);
          meshObjRef.current.weapon.rotation.x = THREE.MathUtils.lerp(meshObjRef.current.weapon.rotation.x, 0.32, delta * 10);
          meshObjRef.current.weapon.rotation.y = THREE.MathUtils.lerp(meshObjRef.current.weapon.rotation.y, 0.10, delta * 10);
          meshObjRef.current.weapon.rotation.z = THREE.MathUtils.lerp(meshObjRef.current.weapon.rotation.z, 0.05, delta * 10);
          meshObjRef.current.head.rotation.x = THREE.MathUtils.lerp(meshObjRef.current.head.rotation.x, 0, delta * 10);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [speed, state, castEvent]);

  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <group
      ref={mountRef}
      position={new THREE.Vector3(...position)}
      rotation={new THREE.Euler(...rotation)}
      scale={new THREE.Vector3(...(s as [number, number, number]))}
    />
  );
};

export const buildMageModel = createHeroicMageMesh;
export default MageModel;
