import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * CONFIGURATION & SAFETY ROLLBACK TOGGLE
 * ============================================================================
 * Jika USE_LEGACY_HUNTER bernilai true: Game akan menggunakan model lama dari backup.
 * Jika USE_LEGACY_HUNTER bernilai false: Game menggunakan model "THE HUNTER - BLOCKY REVISION"
 * baru yang dirancang persis sesuai lembar referensi turnaround 4-sudut (Front, Back, Action, Weapons).
 */
export const USE_LEGACY_HUNTER = false;
import { createLegacyHunterMesh } from './HunterModelLegacy';
export { createLegacyHunterMesh };

/**
 * Scale factor mapping the 2x turnaround sheet coordinates [1.1, 1.1, 1.1] to standard world units
 * so the Hunter has identical stature to the Knight and Mage (~2.1 units tall).
 */
const S = 0.5;

/**
 * ============================================================================
 * PRELOADED GEOMETRY & MATERIAL PALETTE (Zero-Lag & Object Pooling)
 * ============================================================================
 * Mengacu persis pada lembar referensi turnaround "ROLE REMODELLING: THE HUNTER - BLOCKY REVISION":
 * - Kulit Sawo Matang: #D4A373
 * - Tudung Kepala (Angular Rogue Hood): Abu-abu Arang Gelap #2E3033
 * - Masker Wajah (Face Mask): Hitam Pekat #1F2022
 * - Mata Pemburu: Cyan Glow Emisi #00F5FF (Intensity 1.5)
 * - Badan / Kain Taktis: Hitam #1A1A1A
 * - Plat Zirah Dada: Abu-abu Baja Kusam #4B4E54
 * - Pauldron Pundak: Abu-abu Bersiku #383A3D
 * - Sabuk Taktis & Kantong: Kulit Cokelat #5C4033, Gesper Perak #9CA3AF
 * - Jubah Bergerigi Tangga (Stair-Case Cape): Abu-abu Gelap #232426
 * - Celana Taktis: Hitam Pekat #18181B
 * - Sepatu Bot & Pelindung Kaki: Abu-abu Baja Bersiku #3F4246
 * - Belati Baja: Bilah Baja Gelap #374151 dengan Tepi Cyan Menyala #00F5FF
 * - Busur 5-Segmen: Kayu Hardwood #5C4033 & Sendi Logam #374151, Tali Cyan #00F5FF
 * - Quiver Tabung Panah: Cokelat Gelap #4A382C, 5 Panah Berbulu Abu-abu #6B7280
 */

interface BlockyHunterMaterialPalette {
  skinTanMat: THREE.MeshLambertMaterial; // #D4A373
  hoodCharcoalMat: THREE.MeshLambertMaterial; // #2E3033
  faceMaskMat: THREE.MeshLambertMaterial; // #1F2022
  eyesCyanGlowMat: THREE.MeshStandardMaterial; // #00F5FF + Emissive
  torsoBlackMat: THREE.MeshLambertMaterial; // #1A1A1A
  chestplateSteelMat: THREE.MeshStandardMaterial; // #4B4E54
  pauldronDarkMat: THREE.MeshStandardMaterial; // #383A3D
  beltLeatherMat: THREE.MeshLambertMaterial; // #5C4033
  buckleSilverMat: THREE.MeshStandardMaterial; // #9CA3AF
  pouchLeatherMat: THREE.MeshLambertMaterial; // #4A3525
  capeCharcoalMat: THREE.MeshLambertMaterial; // #232426
  pantsBlackMat: THREE.MeshLambertMaterial; // #18181B
  bootSteelMat: THREE.MeshStandardMaterial; // #3F4246
  bootSoleMat: THREE.MeshLambertMaterial; // #18181B
  daggerBladeMat: THREE.MeshStandardMaterial; // #374151
  daggerCyanEdgeMat: THREE.MeshStandardMaterial; // #00F5FF + Emissive 1.2
  daggerGripMat: THREE.MeshLambertMaterial; // #111111
  daggerGuardMat: THREE.MeshStandardMaterial; // #374151
  sheathMat: THREE.MeshLambertMaterial; // #232426
  bowWoodMat: THREE.MeshStandardMaterial; // #5C4033
  bowMetalMat: THREE.MeshStandardMaterial; // #374151
  bowstringCyanMat: THREE.MeshBasicMaterial; // #00F5FF
  quiverMat: THREE.MeshLambertMaterial; // #4A382C
  arrowShaftMat: THREE.MeshLambertMaterial; // #5C4033
  arrowFletchMat: THREE.MeshLambertMaterial; // #6B7280
  arrowHeadMat: THREE.MeshStandardMaterial; // #9CA3AF
}

let cachedMaterials: BlockyHunterMaterialPalette | null = null;

function getHunterMaterials(tier: number): BlockyHunterMaterialPalette {
  if (!cachedMaterials) {
    cachedMaterials = {
      // 1. Kulit sawo matang (#D4A373)
      skinTanMat: new THREE.MeshLambertMaterial({
        color: 0xD4A373,
        flatShading: true,
      }),
      // 2. Tudung kepala rogue arang gelap (#2E3033)
      hoodCharcoalMat: new THREE.MeshLambertMaterial({
        color: 0x2E3033,
        flatShading: true,
      }),
      // 3. Masker wajah hitam pekat (#1F2022)
      faceMaskMat: new THREE.MeshLambertMaterial({
        color: 0x1F2022,
        flatShading: true,
      }),
      // 4. Mata cyan glow emisi (#00F5FF)
      eyesCyanGlowMat: new THREE.MeshStandardMaterial({
        color: 0x00F5FF,
        emissive: 0x00F5FF,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.2,
      }),
      // 5. Badan kain taktis hitam (#1A1A1A)
      torsoBlackMat: new THREE.MeshLambertMaterial({
        color: 0x1A1A1A,
        flatShading: true,
      }),
      // 6. Plat zirah dada abu-abu baja kusam (#4B4E54)
      chestplateSteelMat: new THREE.MeshStandardMaterial({
        color: 0x4B4E54,
        metalness: 0.70,
        roughness: 0.35,
        flatShading: true,
      }),
      // 7. Pauldron pundak (#383A3D)
      pauldronDarkMat: new THREE.MeshStandardMaterial({
        color: 0x383A3D,
        metalness: 0.60,
        roughness: 0.40,
        flatShading: true,
      }),
      // 8. Sabuk kulit cokelat (#5C4033)
      beltLeatherMat: new THREE.MeshLambertMaterial({
        color: 0x5C4033,
        flatShading: true,
      }),
      // 9. Kepala sabuk perak persegi (#9CA3AF)
      buckleSilverMat: new THREE.MeshStandardMaterial({
        color: 0x9CA3AF,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      // 10. Kantong amunisi (#4A3525)
      pouchLeatherMat: new THREE.MeshLambertMaterial({
        color: 0x4A3525,
        flatShading: true,
      }),
      // 11. Jubah bergerigi tangga (#232426)
      capeCharcoalMat: new THREE.MeshLambertMaterial({
        color: 0x232426,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      // 12. Celana taktis hitam (#18181B)
      pantsBlackMat: new THREE.MeshLambertMaterial({
        color: 0x18181B,
        flatShading: true,
      }),
      // 13. Sepatu bot abu-abu baja (#3F4246)
      bootSteelMat: new THREE.MeshStandardMaterial({
        color: 0x3F4246,
        metalness: 0.55,
        roughness: 0.45,
        flatShading: true,
      }),
      // 14. Sol sepatu bot (#18181B)
      bootSoleMat: new THREE.MeshLambertMaterial({
        color: 0x18181B,
        flatShading: true,
      }),
      // 15. Bilah belati baja (#374151)
      daggerBladeMat: new THREE.MeshStandardMaterial({
        color: 0x374151,
        metalness: 0.80,
        roughness: 0.25,
        flatShading: true,
      }),
      // 16. Tepi bilah cyan bercahaya (#00F5FF)
      daggerCyanEdgeMat: new THREE.MeshStandardMaterial({
        color: 0x00F5FF,
        emissive: 0x00F5FF,
        emissiveIntensity: 1.25,
        roughness: 0.1,
        metalness: 0.3,
      }),
      // 17. Gagang belati (#111111)
      daggerGripMat: new THREE.MeshLambertMaterial({
        color: 0x111111,
        flatShading: true,
      }),
      // 18. Pelindung tangan belati (#374151)
      daggerGuardMat: new THREE.MeshStandardMaterial({
        color: 0x374151,
        metalness: 0.75,
        roughness: 0.30,
        flatShading: true,
      }),
      // 19. Sarung belati (#232426)
      sheathMat: new THREE.MeshLambertMaterial({
        color: 0x232426,
        flatShading: true,
      }),
      // 20. Kayu busur (#5C4033)
      bowWoodMat: new THREE.MeshStandardMaterial({
        color: 0x5C4033,
        roughness: 0.65,
        metalness: 0.15,
        flatShading: true,
      }),
      // 21. Sambungan logam busur (#374151)
      bowMetalMat: new THREE.MeshStandardMaterial({
        color: 0x374151,
        metalness: 0.80,
        roughness: 0.30,
        flatShading: true,
      }),
      // 22. Tali busur neon cyan (#00F5FF)
      bowstringCyanMat: new THREE.MeshBasicMaterial({
        color: 0x00F5FF,
      }),
      // 23. Quiver (#4A382C)
      quiverMat: new THREE.MeshLambertMaterial({
        color: 0x4A382C,
        flatShading: true,
      }),
      // 24. Batang panah (#5C4033)
      arrowShaftMat: new THREE.MeshLambertMaterial({
        color: 0x5C4033,
        flatShading: true,
      }),
      // 25. Bulu sayap panah (#6B7280)
      arrowFletchMat: new THREE.MeshLambertMaterial({
        color: 0x6B7280,
        flatShading: true,
      }),
      // 26. Mata panah baja (#9CA3AF)
      arrowHeadMat: new THREE.MeshStandardMaterial({
        color: 0x9CA3AF,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
    };
  }

  // Tier 3+ Stealth Assassin enhancements: darker armor, brighter cyan luminescence
  if (tier >= 3) {
    cachedMaterials.chestplateSteelMat.emissive.setHex(0x004455);
    cachedMaterials.chestplateSteelMat.emissiveIntensity = 0.35;
    cachedMaterials.daggerCyanEdgeMat.emissiveIntensity = 1.6;
    cachedMaterials.eyesCyanGlowMat.emissiveIntensity = 1.8;
  } else {
    cachedMaterials.chestplateSteelMat.emissive.setHex(0x000000);
    cachedMaterials.chestplateSteelMat.emissiveIntensity = 0;
    cachedMaterials.daggerCyanEdgeMat.emissiveIntensity = 1.25;
    cachedMaterials.eyesCyanGlowMat.emissiveIntensity = 1.5;
  }

  return cachedMaterials;
}

// ----------------------------------------------------------------------------
// Preloaded Geometries Cache
// ----------------------------------------------------------------------------
interface BlockyHunterGeometryPalette {
  headGeo: THREE.BufferGeometry;
  hoodTopGeo: THREE.BufferGeometry;
  hoodPeakGeo: THREE.BufferGeometry;
  hoodSideGeo: THREE.BufferGeometry;
  hoodBackGeo: THREE.BufferGeometry;
  faceMaskGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  torsoGeo: THREE.BufferGeometry;
  chestplateGeo: THREE.BufferGeometry;
  pauldronGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  pouchGeo: THREE.BufferGeometry;
  crossStrapGeo: THREE.BufferGeometry;
  capeSteppedGeo: THREE.BufferGeometry;
  armUpperGeo: THREE.BufferGeometry;
  forearmGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  thighGeo: THREE.BufferGeometry;
  bootGeo: THREE.BufferGeometry;
  shinGuardGeo: THREE.BufferGeometry;
  bootToeGeo: THREE.BufferGeometry;
  bootSoleGeo: THREE.BufferGeometry;
  // Dagger
  daggerGripGeo: THREE.BufferGeometry;
  daggerGuardGeo: THREE.BufferGeometry;
  daggerBladeGeo: THREE.BufferGeometry;
  daggerEdgeGeo: THREE.BufferGeometry;
  daggerTipGeo: THREE.BufferGeometry;
  sheathGeo: THREE.BufferGeometry;
  // Bow
  bowHandleGeo: THREE.BufferGeometry;
  bowLimbGeo: THREE.BufferGeometry;
  bowTipGeo: THREE.BufferGeometry;
  bowstringGeo: THREE.BufferGeometry;
  quiverGeo: THREE.BufferGeometry;
  quiverBandGeo: THREE.BufferGeometry;
  arrowShaftGeo: THREE.BufferGeometry;
  arrowFletchGeo: THREE.BufferGeometry;
  arrowTipGeo: THREE.BufferGeometry;
}

let cachedGeometries: BlockyHunterGeometryPalette | null = null;

function getHunterGeometries(): BlockyHunterGeometryPalette {
  if (!cachedGeometries) {
    // A. KEPALA & TUDUNG SILUMAN
    // Kepala dasar BoxGeometry [1.1, 1.1, 1.1]
    const headGeo = new THREE.BoxGeometry(1.1 * S, 1.1 * S, 1.1 * S);

    // Tudung lapisan luar [1.35, 1.35, 1.35]
    const hoodTopGeo = new THREE.BoxGeometry(1.35 * S, 0.32 * S, 1.35 * S);
    // Potongan miring bersiku ke arah depan (hood peak visor)
    const hoodPeakGeo = new THREE.BoxGeometry(1.22 * S, 0.18 * S, 0.42 * S);
    const hoodSideGeo = new THREE.BoxGeometry(0.18 * S, 1.25 * S, 1.35 * S);
    const hoodBackGeo = new THREE.BoxGeometry(1.35 * S, 1.25 * S, 0.18 * S);

    // Masker wajah [1.15, 0.45, 0.2]
    const faceMaskGeo = new THREE.BoxGeometry(1.15 * S, 0.45 * S, 0.2 * S);

    // Mata cyan [0.18, 0.1, 0.05]
    const eyeGeo = new THREE.BoxGeometry(0.18 * S, 0.1 * S, 0.05 * S);

    // B. BADAN, ZIRAH DADA & SABUK KANTONG
    // Badan utama [1.35, 1.7, 0.8]
    const torsoGeo = new THREE.BoxGeometry(1.35 * S, 1.7 * S, 0.8 * S);

    // Plat zirah dada [1.4, 1.1, 0.25]
    const chestplateGeo = new THREE.BoxGeometry(1.4 * S, 1.1 * S, 0.25 * S);

    // Pelindung bahu [0.55, 0.55, 0.55]
    const pauldronGeo = new THREE.BoxGeometry(0.55 * S, 0.55 * S, 0.55 * S);

    // Sabuk taktis & kantong
    const beltGeo = new THREE.BoxGeometry(1.42 * S, 0.25 * S, 0.88 * S);
    const buckleGeo = new THREE.BoxGeometry(0.32 * S, 0.32 * S, 0.92 * S);
    const pouchGeo = new THREE.BoxGeometry(0.25 * S, 0.35 * S, 0.2 * S);
    const crossStrapGeo = new THREE.BoxGeometry(0.18 * S, 1.85 * S, 0.06 * S);

    // C. JUBAH BERGERIGI TANGGA (STAIR-CASE STEPPED CAPE)
    // Mesh bidang datar Box pipih [1.3, 2.2, 0.1] dengan pola tangga kaku kotak-kotak (3-4 gerigi asimetris)
    const capeShape = new THREE.Shape();
    const halfW = (1.3 * S) / 2;
    const fullH = 2.2 * S;
    // Atas jubah
    capeShape.moveTo(-halfW, 0);
    capeShape.lineTo(halfW, 0);
    capeShape.lineTo(halfW, -fullH * 0.78);
    // Pola potongan tangga kaku (stair-case stepped teeth)
    // Gigi tangga 1 (kanan):
    capeShape.lineTo(halfW * 0.46, -fullH * 0.78);
    capeShape.lineTo(halfW * 0.46, -fullH);
    // Gigi tangga 2 (tengah kanan):
    capeShape.lineTo(halfW * 0.02, -fullH);
    capeShape.lineTo(halfW * 0.02, -fullH * 0.86);
    // Gigi tangga 3 (tengah kiri):
    capeShape.lineTo(-halfW * 0.48, -fullH * 0.86);
    capeShape.lineTo(-halfW * 0.48, -fullH * 0.96);
    // Gigi tangga 4 (kiri):
    capeShape.lineTo(-halfW, -fullH * 0.96);
    capeShape.closePath();

    const capeSteppedGeo = new THREE.ExtrudeGeometry(capeShape, {
      depth: 0.08 * S,
      bevelEnabled: false,
    });
    capeSteppedGeo.center();

    // D. LENGAN & TANGAN
    const armUpperGeo = new THREE.BoxGeometry(0.42 * S, 0.82 * S, 0.42 * S);
    const forearmGeo = new THREE.BoxGeometry(0.38 * S, 0.75 * S, 0.38 * S);
    const handGeo = new THREE.BoxGeometry(0.32 * S, 0.30 * S, 0.32 * S);

    // E. KAKI & SEPATU BOT
    // Celana taktis [0.45, 1.3, 0.45]
    const thighGeo = new THREE.BoxGeometry(0.45 * S, 1.3 * S, 0.45 * S);
    // Sepatu bot tinggi bersudut [0.5, 0.65, 0.55]
    const bootGeo = new THREE.BoxGeometry(0.5 * S, 0.65 * S, 0.55 * S);
    const shinGuardGeo = new THREE.BoxGeometry(0.44 * S, 0.55 * S, 0.12 * S);
    const bootToeGeo = new THREE.BoxGeometry(0.5 * S, 0.28 * S, 0.32 * S);
    const bootSoleGeo = new THREE.BoxGeometry(0.52 * S, 0.08 * S, 0.65 * S);

    // F. SEPASANG BELATI BAJA (STEEL DAGGERS)
    // Gagang silinder segi empat [0.08, 0.35, 0.08]
    const daggerGripGeo = new THREE.BoxGeometry(0.08 * S, 0.35 * S, 0.08 * S);
    // Guard [0.28, 0.06, 0.1]
    const daggerGuardGeo = new THREE.BoxGeometry(0.28 * S, 0.06 * S, 0.1 * S);
    // Bilah belati [0.16, 0.9, 0.04]
    const daggerBladeGeo = new THREE.BoxGeometry(0.16 * S, 0.9 * S, 0.04 * S);
    // Garis tepi cyan menyala [0.02, 0.9, 0.044]
    const daggerEdgeGeo = new THREE.BoxGeometry(0.02 * S, 0.9 * S, 0.044 * S);
    // Ujung runcing (angular drop-point tip)
    const daggerTipGeo = new THREE.ConeGeometry(0.08 * S, 0.22 * S, 4);
    daggerTipGeo.rotateY(Math.PI / 4);

    // Sarung belati [0.2, 0.8, 0.15]
    const sheathGeo = new THREE.BoxGeometry(0.2 * S, 0.8 * S, 0.15 * S);

    // G. BUSUR BERSUDUT 5-SEGMEN (ANGULAR RECURVE BOW)
    // Handle tengah [0.12, 0.7, 0.12]
    const bowHandleGeo = new THREE.BoxGeometry(0.12 * S, 0.7 * S, 0.12 * S);
    // Sayap atas & bawah [0.1, 0.65, 0.1]
    const bowLimbGeo = new THREE.BoxGeometry(0.1 * S, 0.65 * S, 0.1 * S);
    // Tip ujung atas & bawah [0.08, 0.45, 0.08]
    const bowTipGeo = new THREE.BoxGeometry(0.08 * S, 0.45 * S, 0.08 * S);
    // Tali busur neon cyan
    const bowstringGeo = new THREE.CylinderGeometry(0.012 * S, 0.012 * S, 2.35 * S, 4);

    // Quiver [0.35, 1.3, 0.35]
    const quiverGeo = new THREE.BoxGeometry(0.35 * S, 1.3 * S, 0.35 * S);
    const quiverBandGeo = new THREE.BoxGeometry(0.38 * S, 0.12 * S, 0.38 * S);

    const arrowShaftGeo = new THREE.CylinderGeometry(0.018 * S, 0.018 * S, 1.35 * S, 4);
    const arrowFletchGeo = new THREE.BoxGeometry(0.12 * S, 0.24 * S, 0.02 * S);
    const arrowTipGeo = new THREE.ConeGeometry(0.038 * S, 0.15 * S, 4);

    cachedGeometries = {
      headGeo,
      hoodTopGeo,
      hoodPeakGeo,
      hoodSideGeo,
      hoodBackGeo,
      faceMaskGeo,
      eyeGeo,
      torsoGeo,
      chestplateGeo,
      pauldronGeo,
      beltGeo,
      buckleGeo,
      pouchGeo,
      crossStrapGeo,
      capeSteppedGeo,
      armUpperGeo,
      forearmGeo,
      handGeo,
      thighGeo,
      bootGeo,
      shinGuardGeo,
      bootToeGeo,
      bootSoleGeo,
      daggerGripGeo,
      daggerGuardGeo,
      daggerBladeGeo,
      daggerEdgeGeo,
      daggerTipGeo,
      sheathGeo,
      bowHandleGeo,
      bowLimbGeo,
      bowTipGeo,
      bowstringGeo,
      quiverGeo,
      quiverBandGeo,
      arrowShaftGeo,
      arrowFletchGeo,
      arrowTipGeo,
    };
  }

  return cachedGeometries;
}

/**
 * ============================================================================
 * MAIN BUILDER: createBlockyHunterMesh
 * ============================================================================
 * Merakit model 3D Pemburu (The Hunter) lengkap dengan arsitektur modular:
 * - Tudung Siluman & Masker Wajah dengan Mata Cyan Glow
 * - Zirah Dada Abu-abu Baja & Selempang Kulit Diagonal
 * - Jubah Bergerigi Tangga Kaku (Stair-Case Bottom Cuts)
 * - Sistem Senjata Ganda (Dual Daggers & Recurve Bow with Stance Swapping)
 */
export function createBlockyHunterMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'rogue';

  const mats = getHunterMaterials(tier);
  const geos = getHunterGeometries();

  // --------------------------------------------------------------------------
  // 1. Torso, Zirah Dada, Sabuk & Jubah Bergerigi Tangga
  // --------------------------------------------------------------------------
  // Badan utama kain taktis hitam [1.35, 1.7, 0.8]
  const body = new THREE.Mesh(geos.torsoGeo, mats.torsoBlackMat);
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // Plat zirah dada abu-abu baja kusam [1.4, 1.1, 0.25]
  const chestplate = new THREE.Mesh(geos.chestplateGeo, mats.chestplateSteelMat);
  chestplate.position.set(0, 0.24 * S, 0.38 * S);
  chestplate.castShadow = true;
  body.add(chestplate);

  // Selempang kulit diagonal (cross-chest strap) dari pundak kanan ke pinggang kiri
  const crossStrap = new THREE.Mesh(geos.crossStrapGeo, mats.beltLeatherMat);
  crossStrap.position.set(0, 0.12 * S, 0.44 * S);
  crossStrap.rotation.z = -0.48;
  crossStrap.castShadow = true;
  body.add(crossStrap);

  // Sabuk taktis kulit cokelat dengan kepala sabuk perak persegi
  const belt = new THREE.Mesh(geos.beltGeo, mats.beltLeatherMat);
  belt.position.set(0, -0.65 * S, 0);
  belt.castShadow = true;
  body.add(belt);

  const buckle = new THREE.Mesh(geos.buckleGeo, mats.buckleSilverMat);
  buckle.position.set(0, -0.65 * S, 0.01);
  buckle.castShadow = true;
  body.add(buckle);

  // 3 Balok kantong amunisi kecil [0.25, 0.35, 0.2] di pinggang depan
  [-0.34 * S, 0, 0.34 * S].forEach((posX) => {
    const pouch = new THREE.Mesh(geos.pouchGeo, mats.pouchLeatherMat);
    pouch.position.set(posX, -0.65 * S, 0.46 * S);
    pouch.castShadow = true;
    body.add(pouch);
  });

  // Jubah Bergerigi Tangga (Stair-Case Stepped Cape)
  // Menggantung dari leher belakang miring ke belakang 10° (0.17 rad)
  const cape = new THREE.Mesh(geos.capeSteppedGeo, mats.capeCharcoalMat);
  cape.position.set(0, 1.62, -0.32 * S);
  cape.rotation.x = 0.17; // Miring 10° ke belakang
  cape.castShadow = true;
  group.add(cape);

  // --------------------------------------------------------------------------
  // 2. Kepala, Tudung Siluman (Angular Hood) & Masker Wajah (Face Mask)
  // --------------------------------------------------------------------------
  // Kepala dasar BoxGeometry [1.1, 1.1, 1.1] kulit sawo matang
  const head = new THREE.Mesh(geos.headGeo, mats.skinTanMat);
  head.position.y = 1.95;
  head.castShadow = true;
  group.add(head);

  // Tudung Kepala (Angular Rogue Hood):
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0, 0, 0);

  // Top hood plate
  const hoodTop = new THREE.Mesh(geos.hoodTopGeo, mats.hoodCharcoalMat);
  hoodTop.position.set(0, 0.46 * S, 0);
  hoodTop.castShadow = true;
  hoodGroup.add(hoodTop);

  // Potongan miring bersiku ke arah depan (visor cowl)
  const hoodPeak = new THREE.Mesh(geos.hoodPeakGeo, mats.hoodCharcoalMat);
  hoodPeak.position.set(0, 0.44 * S, 0.58 * S);
  hoodPeak.rotation.x = 0.32;
  hoodPeak.castShadow = true;
  hoodGroup.add(hoodPeak);

  // Samping tudung (kiri & kanan)
  const hoodLeft = new THREE.Mesh(geos.hoodSideGeo, mats.hoodCharcoalMat);
  hoodLeft.position.set(0.58 * S, -0.02 * S, 0);
  hoodLeft.castShadow = true;

  const hoodRight = new THREE.Mesh(geos.hoodSideGeo, mats.hoodCharcoalMat);
  hoodRight.position.set(-0.58 * S, -0.02 * S, 0);
  hoodRight.castShadow = true;
  hoodGroup.add(hoodLeft, hoodRight);

  // Belakang tudung
  const hoodBack = new THREE.Mesh(geos.hoodBackGeo, mats.hoodCharcoalMat);
  hoodBack.position.set(0, -0.02 * S, -0.58 * S);
  hoodBack.castShadow = true;
  hoodGroup.add(hoodBack);

  head.add(hoodGroup);

  // Masker Wajah (Face Mask) [1.15, 0.45, 0.2] menutupi hidung hingga dagu
  const faceMask = new THREE.Mesh(geos.faceMaskGeo, mats.faceMaskMat);
  faceMask.position.set(0, -0.22 * S, 0.50 * S);
  faceMask.castShadow = true;
  head.add(faceMask);

  // Mata Pemburu (Cyan Glow Eyes) [0.18, 0.1, 0.05]
  const leftEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  leftEye.position.set(0.24 * S, 0.10 * S, 0.56 * S);

  const rightEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  rightEye.position.set(-0.24 * S, 0.10 * S, 0.56 * S);
  head.add(leftEye, rightEye);

  // --------------------------------------------------------------------------
  // 3. Pelindung Bahu Bersiku (Angular Pauldrons)
  // --------------------------------------------------------------------------
  const pauldronLeft = new THREE.Mesh(geos.pauldronGeo, mats.pauldronDarkMat);
  pauldronLeft.position.set(0.52, 1.70, 0);
  pauldronLeft.rotation.z = -0.25;
  pauldronLeft.castShadow = true;

  const pauldronRight = new THREE.Mesh(geos.pauldronGeo, mats.pauldronDarkMat);
  pauldronRight.position.set(-0.52, 1.70, 0);
  pauldronRight.rotation.z = 0.25;
  pauldronRight.castShadow = true;
  group.add(pauldronLeft, pauldronRight);

  // --------------------------------------------------------------------------
  // 4. Lengan & Tangan (Left & Right Arms)
  // --------------------------------------------------------------------------
  const buildHunterArm = (isLeft: boolean) => {
    const armGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    armGroup.position.set(sign * 0.50, 1.62, 0);

    const upperArm = new THREE.Mesh(geos.armUpperGeo, mats.torsoBlackMat);
    upperArm.position.y = -0.38 * S;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    const forearm = new THREE.Mesh(geos.forearmGeo, mats.torsoBlackMat);
    forearm.position.y = -0.85 * S;
    forearm.castShadow = true;
    armGroup.add(forearm);

    const hand = new THREE.Mesh(geos.handGeo, mats.skinTanMat);
    hand.position.y = -1.25 * S;
    hand.castShadow = true;
    armGroup.add(hand);

    group.add(armGroup);
    return armGroup;
  };

  const leftArm = buildHunterArm(true);
  const rightArm = buildHunterArm(false);

  // --------------------------------------------------------------------------
  // 5. Kaki & Sepatu Bot Bersudut (Legs & Boots)
  // --------------------------------------------------------------------------
  const buildHunterLeg = (posX: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(posX, 0.88, 0);

    // Celana taktis [0.45, 1.3, 0.45] hitam pekat
    const thigh = new THREE.Mesh(geos.thighGeo, mats.pantsBlackMat);
    thigh.position.y = -0.38;
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Sepatu bot tinggi bersudut [0.5, 0.65, 0.55] abu-abu baja
    const boot = new THREE.Mesh(geos.bootGeo, mats.bootSteelMat);
    boot.position.set(0, -0.66, 0.02);
    boot.castShadow = true;
    legGroup.add(boot);

    // Pelindung tulang kering bersiku
    const shinGuard = new THREE.Mesh(geos.shinGuardGeo, mats.bootSteelMat);
    shinGuard.position.set(0, -0.58, 0.16 * S);
    shinGuard.castShadow = true;
    legGroup.add(shinGuard);

    // Ujung depan bot kaku (toe block)
    const toe = new THREE.Mesh(geos.bootToeGeo, mats.bootSteelMat);
    toe.position.set(0, -0.76, 0.14 * S);
    toe.castShadow = true;
    legGroup.add(toe);

    // Sol datar menyentuh tanah
    const sole = new THREE.Mesh(geos.bootSoleGeo, mats.bootSoleMat);
    sole.position.set(0, -0.84, 0.06 * S);
    sole.receiveShadow = true;
    legGroup.add(sole);

    group.add(legGroup);
    return legGroup;
  };

  const leftLeg = buildHunterLeg(0.20);
  const rightLeg = buildHunterLeg(-0.20);

  // --------------------------------------------------------------------------
  // 6. Sarung Belati di Paha (Angular Dagger Sheaths)
  // --------------------------------------------------------------------------
  const sheathedDaggers = new THREE.Group();

  const leftSheath = new THREE.Mesh(geos.sheathGeo, mats.sheathMat);
  leftSheath.position.set(0.18, -0.15, 0);
  leftSheath.rotation.z = -0.18;
  leftSheath.castShadow = true;
  leftLeg.add(leftSheath);

  const rightSheath = new THREE.Mesh(geos.sheathGeo, mats.sheathMat);
  rightSheath.position.set(-0.18, -0.15, 0);
  rightSheath.rotation.z = 0.18;
  rightSheath.castShadow = true;
  rightLeg.add(rightSheath);

  // Gagang belati yang terselip di dalam sarung saat mode busur
  const sheathHiltGeo = new THREE.BoxGeometry(0.08 * S, 0.35 * S, 0.08 * S);
  const sheathGuardGeo = new THREE.BoxGeometry(0.26 * S, 0.05 * S, 0.08 * S);

  const leftHilt = new THREE.Group();
  leftHilt.add(new THREE.Mesh(sheathHiltGeo, mats.daggerGripMat));
  const lGuard = new THREE.Mesh(sheathGuardGeo, mats.daggerGuardMat);
  lGuard.position.y = -0.16 * S;
  leftHilt.add(lGuard);
  leftHilt.position.set(0, 0.45 * S, 0);
  leftSheath.add(leftHilt);

  const rightHilt = new THREE.Group();
  rightHilt.add(new THREE.Mesh(sheathHiltGeo, mats.daggerGripMat));
  const rGuard = new THREE.Mesh(sheathGuardGeo, mats.daggerGuardMat);
  rGuard.position.y = -0.16 * S;
  rightHilt.add(rGuard);
  rightHilt.position.set(0, 0.45 * S, 0);
  rightSheath.add(rightHilt);

  sheathedDaggers.add(leftHilt, rightHilt);
  sheathedDaggers.visible = false; // Awalnya disembunyikan dalam mode belati

  // --------------------------------------------------------------------------
  // 7. Sepasang Belati Baja Beremisi (Steel Daggers)
  // --------------------------------------------------------------------------
  const buildDagger = () => {
    const daggerGroup = new THREE.Group();

    // Gagang [0.08, 0.35, 0.08] hitam
    const grip = new THREE.Mesh(geos.daggerGripGeo, mats.daggerGripMat);
    grip.position.y = 0;
    grip.castShadow = true;
    daggerGroup.add(grip);

    // Pommel ujung bawah
    const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.06 * S, 0.12 * S), mats.daggerGuardMat);
    pommel.position.y = -0.18 * S;
    daggerGroup.add(pommel);

    // Guard pelindung tangan [0.28, 0.06, 0.1]
    const guard = new THREE.Mesh(geos.daggerGuardGeo, mats.daggerGuardMat);
    guard.position.y = 0.18 * S;
    guard.castShadow = true;
    daggerGroup.add(guard);

    // Bilah belati baja gelap bersiku [0.16, 0.9, 0.04]
    const blade = new THREE.Mesh(geos.daggerBladeGeo, mats.daggerBladeMat);
    blade.position.y = (0.18 + 0.45) * S;
    blade.castShadow = true;
    daggerGroup.add(blade);

    // Garis tepi bilah menyala cyan (#00F5FF)
    const edgeLeft = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeLeft.position.set(-0.075 * S, (0.18 + 0.45) * S, 0);
    const edgeRight = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeRight.position.set(0.075 * S, (0.18 + 0.45) * S, 0);
    daggerGroup.add(edgeLeft, edgeRight);

    // Ujung mata pisau runcing (drop-point tip)
    const tip = new THREE.Mesh(geos.daggerTipGeo, mats.daggerBladeMat);
    tip.position.y = (0.18 + 0.90 + 0.08) * S;
    tip.castShadow = true;
    daggerGroup.add(tip);

    const tipCyan = new THREE.Mesh(new THREE.ConeGeometry(0.085 * S, 0.12 * S, 4), mats.daggerCyanEdgeMat);
    tipCyan.position.y = (0.18 + 0.90 + 0.04) * S;
    tipCyan.rotateY(Math.PI / 4);
    daggerGroup.add(tipCyan);

    return daggerGroup;
  };

  // Mainhand (Right) Dagger
  const weapon = new THREE.Group();
  const daggerRight = buildDagger();
  weapon.add(daggerRight);
  weapon.position.set(0, -1.25 * S, 0.08);
  weapon.rotation.x = Math.PI / 2.5;
  rightArm.add(weapon);

  // Offhand (Left) Dagger
  const leftWeapon = new THREE.Group();
  const daggerLeft = buildDagger();
  leftWeapon.add(daggerLeft);
  leftWeapon.position.set(0, -1.25 * S, 0.08);
  leftWeapon.rotation.x = Math.PI / 2.5;
  leftArm.add(leftWeapon);

  // --------------------------------------------------------------------------
  // 8. Busur Bersudut 5-Segmen (Angular Recurve Bow) & Tabung Panah (Quiver)
  // --------------------------------------------------------------------------
  const buildAngularRecurveBow = () => {
    const bowGroup = new THREE.Group();

    // 1. Segmen Handle Tengah [0.12, 0.7, 0.12]
    const handle = new THREE.Mesh(geos.bowHandleGeo, mats.bowWoodMat);
    handle.castShadow = true;
    bowGroup.add(handle);

    // Grip logam di tengah
    const handleGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * S, 0.32 * S, 0.14 * S),
      mats.bowMetalMat
    );
    bowGroup.add(handleGrip);

    // 2. Sayap Atas [0.1, 0.65, 0.1] miring 30°
    const upperLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    upperLimb.position.set(0, 0.58 * S, 0.14 * S);
    upperLimb.rotation.x = 0.52; // 30°
    upperLimb.castShadow = true;
    bowGroup.add(upperLimb);

    // 3. Tip Ujung Atas [0.08, 0.45, 0.08] miring 60°
    const upperTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    upperTip.position.set(0, 1.05 * S, -0.04 * S);
    upperTip.rotation.x = -0.52;
    upperTip.castShadow = true;
    bowGroup.add(upperTip);

    // 4. Sayap Bawah [0.1, 0.65, 0.1] miring -30°
    const lowerLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    lowerLimb.position.set(0, -0.58 * S, 0.14 * S);
    lowerLimb.rotation.x = -0.52; // -30°
    lowerLimb.castShadow = true;
    bowGroup.add(lowerLimb);

    // 5. Tip Ujung Bawah [0.08, 0.45, 0.08] miring -60°
    const lowerTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    lowerTip.position.set(0, -1.05 * S, -0.04 * S);
    lowerTip.rotation.x = 0.52;
    lowerTip.castShadow = true;
    bowGroup.add(lowerTip);

    // Tali Busur Neon Cyan Lurus (#00F5FF)
    const bowstring = new THREE.Mesh(geos.bowstringGeo, mats.bowstringCyanMat);
    bowstring.position.set(0, 0, -0.22 * S);
    bowGroup.add(bowstring);

    return bowGroup;
  };

  // Busur aktif di tangan kiri (untuk mode busur)
  const hunterBow = buildAngularRecurveBow();
  hunterBow.position.set(0.04, -1.25 * S, 0.12);
  hunterBow.rotation.set(0, Math.PI / 2, 0);
  hunterBow.visible = false; // Awalnya disembunyikan dalam mode belati
  leftArm.add(hunterBow);

  // Busur tersampir menyilang di punggung saat mode belati
  const hunterBowStowed = buildAngularRecurveBow();
  hunterBowStowed.position.set(0.05, 0.05, -0.52 * S);
  hunterBowStowed.rotation.set(0.12, 0, 0.68);
  hunterBowStowed.visible = true;
  body.add(hunterBowStowed);

  // Wadah Anak Panah (Quiver) di Punggung
  // Tabung balok bersudut [0.35, 1.3, 0.35] dipasang miring 35° menyilang di atas jubah punggung kanan
  const hunterQuiver = new THREE.Group();
  hunterQuiver.position.set(-0.18, 0.15, -0.48 * S);
  hunterQuiver.rotation.set(0.10, 0, -0.61); // Miring 35° menyilang

  const quiverTube = new THREE.Mesh(geos.quiverGeo, mats.quiverMat);
  quiverTube.castShadow = true;
  hunterQuiver.add(quiverTube);

  const quiverBand1 = new THREE.Mesh(geos.quiverBandGeo, mats.buckleSilverMat);
  quiverBand1.position.y = 0.42 * S;
  const quiverBand2 = new THREE.Mesh(geos.quiverBandGeo, mats.buckleSilverMat);
  quiverBand2.position.y = -0.42 * S;
  hunterQuiver.add(quiverBand1, quiverBand2);

  // 5 Anak panah dengan bulu sayap bersudut abu-abu dan mata panah baja
  const arrowOffsets = [
    { x: -0.06 * S, z: -0.06 * S, rot: 0.04 },
    { x: 0.06 * S, z: -0.06 * S, rot: -0.05 },
    { x: 0, z: 0, rot: 0.02 },
    { x: -0.06 * S, z: 0.06 * S, rot: -0.03 },
    { x: 0.06 * S, z: 0.06 * S, rot: 0.06 },
  ];

  arrowOffsets.forEach((off) => {
    const arrow = new THREE.Group();
    arrow.position.set(off.x, 0.65 * S, off.z);
    arrow.rotation.z = off.rot;

    const shaft = new THREE.Mesh(geos.arrowShaftGeo, mats.arrowShaftMat);
    arrow.add(shaft);

    const fletchX = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowFletchMat);
    fletchX.position.y = 0.52 * S;
    const fletchZ = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowFletchMat);
    fletchZ.position.y = 0.52 * S;
    fletchZ.rotation.y = Math.PI / 2;
    arrow.add(fletchX, fletchZ);

    const headArrow = new THREE.Mesh(geos.arrowTipGeo, mats.arrowHeadMat);
    headArrow.position.y = -0.68 * S;
    arrow.add(headArrow);

    hunterQuiver.add(arrow);
  });

  body.add(hunterQuiver);

  // --------------------------------------------------------------------------
  // 9. Sistem Transisi Senjata Dinamis (Dynamic Stance Swapping)
  // --------------------------------------------------------------------------
  let hunterWeaponMode: 'dagger' | 'bow' = 'dagger';

  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
    if (mode === 'bow') {
      // MODE JARAK JAUH (RANGED / BUSUR):
      // Belati otomatis tersimpan di sarung pinggang
      daggerRight.visible = false;
      daggerLeft.visible = false;
      hunterBow.visible = true;
      hunterBowStowed.visible = false;
      sheathedDaggers.visible = true;
    } else {
      // MODE JARAK DEKAT (MELEE / BELATI):
      // Busur tersampir menyilang di punggung, kedua tangan memegang belati baja cyan
      daggerRight.visible = true;
      daggerLeft.visible = true;
      hunterBow.visible = false;
      hunterBowStowed.visible = true;
      sheathedDaggers.visible = false;
    }
  };

  // --------------------------------------------------------------------------
  // 10. Tier 3+ Aura & Particle Orbs
  // --------------------------------------------------------------------------
  const orbitingOrbs: THREE.Mesh[] = [];
  let halo: THREE.Mesh | undefined;
  let halo2: THREE.Mesh | undefined;
  let wings: THREE.Group | undefined;
  let auraRing: THREE.Mesh | undefined;
  let auraRing2: THREE.Mesh | undefined;

  if (tier >= 3) {
    // Ground stealth aura ring
    const ringGeo = new THREE.RingGeometry(0.65, 0.78, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00F5FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.position.y = 0.05;
    group.add(auraRing);

    // Orbiting emerald/cyan phantom shurikens
    const orbCount = tier >= 5 ? 4 : 2;
    for (let i = 0; i < orbCount; i++) {
      const shurikenMat = new THREE.MeshStandardMaterial({
        color: 0x00F5FF,
        emissive: 0x00F5FF,
        emissiveIntensity: 1.4,
      });
      const shuriken = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), shurikenMat);
      const angle = (i / orbCount) * Math.PI * 2;
      shuriken.position.set(Math.cos(angle) * 0.9, 1.35, Math.sin(angle) * 0.9);
      group.add(shuriken);
      orbitingOrbs.push(shuriken);
    }
  }

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weapon,
    leftWeapon,
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
    daggerRight,
    daggerLeft,
    hunterBow,
    hunterBowStowed,
    hunterQuiver,
    sheathedDaggers,
    hunterWeaponMode,
    setHunterWeaponMode,
  };
}

/**
 * ============================================================================
 * SMOOTH HUNTER WALK & STANCE ANIMATION
 * ============================================================================
 * Menghaluskan animasi jalan dan stance Pemburu:
 * - Siklus langkah gesit lincah (agile assassin stride)
 * - Ayunan kaki seimbang
 * - Posisi tangan adaptif berdasarkan mode senjata (Dagger vs Bow)
 * - Cape bergerigi tangga berayun lembut
 * - Transisi senjata halus tanpa patahan pose (lerp tangan 0.15s)
 */
export function animateHunterWalk(
  playerMesh: PlayerMeshObjects,
  walkTime: number,
  playerPosY: number,
  isMoving: boolean,
  isAttacking: boolean = false,
  hunterWeaponMode: 'dagger' | 'bow' = 'dagger'
): void {
  const isBow = hunterWeaponMode === 'bow';

  if (isMoving) {
    // 1. Ayunan Kaki Gesit
    const legSwing = Math.sin(walkTime * 1.2) * 0.52;
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, 0.25);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, 0.25);

    // 2. Ayunan Lengan Berdasarkan Stance
    if (!isAttacking) {
      if (isBow) {
        // Mode Busur: Tangan kiri memegang busur stabil ke depan, tangan kanan santai
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.65, 0.2);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.25, 0.2);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.10, 0.2);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, legSwing * 0.45, 0.2);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.2);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.15, 0.2);
      } else {
        // Mode Belati: Postur condong rendah cepat, kedua belati terhunus siap tebas
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.45 - legSwing * 0.35, 0.2);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.15, 0.2);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.20, 0.2);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.45 + legSwing * 0.35, 0.2);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, 0.2);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.20, 0.2);
      }
    }

    // 3. Kibasan Jubah Bergerigi Tangga saat bergerak
    playerMesh.cape.rotation.x = 0.25 + Math.sin(walkTime * 1.2) * 0.18;

    // Body bobbing gesit
    const walkBob = Math.abs(Math.sin(walkTime * 2.4)) * 0.04;
    playerMesh.group.position.y = playerPosY + walkBob;
    playerMesh.group.rotation.z = Math.sin(walkTime * 1.2) * 0.025;
  } else {
    // ------------------------------------------------------------------------
    // IDLE BREATHING & READY STANCE
    // ------------------------------------------------------------------------
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, 0.2);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, 0.2);
    playerMesh.group.rotation.z = THREE.MathUtils.lerp(playerMesh.group.rotation.z, 0, 0.2);

    const breathe = Math.sin(walkTime * 2.2) * 0.015;
    playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.35 + breathe, 0.15);

    if (!isAttacking) {
      if (isBow) {
        // Ready Bow Stance
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.35, 0.15);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.20, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.12, 0.15);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0.15, 0.15);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.15, 0.15);
      } else {
        // Ready Dual Daggers Stance
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.25 + breathe * 0.4, 0.15);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.15, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.22, 0.15);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.25 - breathe * 0.4, 0.15);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.22, 0.15);
      }
    }

    playerMesh.cape.rotation.x = 0.17 + Math.sin(walkTime * 2.0) * 0.04;
  }
}

/**
 * ============================================================================
 * REACT THREE FIBER PREVIEW WRAPPER: HunterModel
 * ============================================================================
 */
export interface HunterModelProps {
  tier?: number;
  weaponMode?: 'dagger' | 'bow';
  isMoving?: boolean;
  scale?: number;
}

export const HunterModel: React.FC<HunterModelProps> = ({
  tier = 1,
  weaponMode = 'dagger',
  scale = 1.0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 4.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 6, 4);
    scene.add(dirLight);

    const hunter = USE_LEGACY_HUNTER ? createLegacyHunterMesh(tier) : createBlockyHunterMesh(tier);
    hunter.group.scale.set(scale, scale, scale);
    if (hunter.setHunterWeaponMode) {
      hunter.setHunterWeaponMode(weaponMode as 'dagger' | 'bow');
    }
    scene.add(hunter.group);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      hunter.group.rotation.y = elapsed * 0.6;
      animateHunterWalk(hunter, elapsed, 0, false, false, weaponMode as 'dagger' | 'bow');
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [tier, weaponMode, scale]);

  return <div ref={mountRef} className="w-full h-full min-h-[300px]" />;
};

export default HunterModel;
