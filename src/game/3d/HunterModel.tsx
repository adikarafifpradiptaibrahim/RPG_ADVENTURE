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
 * dengan peningkatan kontras material taktis, tudung assassin bersudut, leher anatomis,
 * tekukan siku alami, serta posisi jangkar busur vertikal.
 */
export const USE_LEGACY_HUNTER = false;
import { createLegacyHunterMesh } from './HunterModelLegacy';
export { createLegacyHunterMesh };

/**
 * Scale factor mapping turnaround sheet coordinates to standard world units
 * so the Hunter has identical stature to the Knight and Mage (~2.1 units tall).
 */
const S = 0.5;

/**
 * ============================================================================
 * PRELOADED MATERIAL PALETTE (High-Contrast Tactical Stealth Theme)
 * ============================================================================
 * Menghilangkan kesan balok hitam polos dengan palet kontras tinggi:
 * - Kulit Sawo Matang Wajah & Leher: #c68642
 * - Tudung & Jubah (Hood & Cape): Abu-abu Arang Medium #3a3d45 (tekstur kain terlihat)
 * - Masker Wajah (Face Mask): Hitam Gelap #1a1a1d
 * - Celah Wajah Kulit di Sekitar Mata: Terbuka #c68642
 * - Mata Pemburu: Cyan Glow Emisi #00f5ff (emissiveIntensity: 2.0)
 * - Torso / Baju Dalam Taktis: Abu-abu Gelap #282a2e
 * - Plat Zirah Dada (Chestplate): Abu-abu Baja Kontras #5c626d dengan Lis Strip Logam #7b8290
 * - Pauldron Pundak: Abu-abu Baja Bersiku #5c626d dengan Lis #7b8290
 * - Sabuk Taktis & Selempang: Cokelat Kulit Tua #4a2e18 dengan Gesper Perak #d1d5db
 * - Celana Taktis: Abu-abu Gelap #282a2e
 * - Sepatu Bot: Kulit Cokelat Tua #3b2416 dengan Pelindung Tulang Kering Baja #5c626d
 * - Belati Baja: Bilah #5c626d dengan Tepi Cyan Menyala #00f5ff
 * - Busur 5-Segmen: Kayu Hardwood #4a2e18 & Sendi Logam #7b8290, Tali Cyan #00f5ff
 * - Quiver Tabung Panah: Cokelat Gelap #4a2e18, 5 Panah Berbulu Abu-abu #7b8290
 */

interface BlockyHunterMaterialPalette {
  skinTanMat: THREE.MeshLambertMaterial; // #c68642
  hoodCharcoalMat: THREE.MeshLambertMaterial; // #3a3d45
  capeCharcoalMat: THREE.MeshLambertMaterial; // #3a3d45
  faceMaskMat: THREE.MeshLambertMaterial; // #1a1a1d
  eyesCyanGlowMat: THREE.MeshStandardMaterial; // #00f5ff + Emissive 2.0
  torsoBlackMat: THREE.MeshLambertMaterial; // #282a2e
  chestplateSteelMat: THREE.MeshStandardMaterial; // #5c626d
  chestplateTrimMat: THREE.MeshStandardMaterial; // #7b8290
  pauldronSteelMat: THREE.MeshStandardMaterial; // #5c626d
  beltLeatherMat: THREE.MeshLambertMaterial; // #4a2e18
  buckleSilverMat: THREE.MeshStandardMaterial; // #d1d5db
  pouchLeatherMat: THREE.MeshLambertMaterial; // #4a2e18
  pantsBlackMat: THREE.MeshLambertMaterial; // #282a2e
  bootLeatherMat: THREE.MeshStandardMaterial; // #3b2416
  shinGuardSteelMat: THREE.MeshStandardMaterial; // #5c626d
  bootSoleMat: THREE.MeshLambertMaterial; // #1a1a1d
  daggerBladeMat: THREE.MeshStandardMaterial; // #5c626d
  daggerCyanEdgeMat: THREE.MeshStandardMaterial; // #00f5ff + Emissive 1.8
  daggerGripMat: THREE.MeshLambertMaterial; // #1a1a1d
  daggerGuardMat: THREE.MeshStandardMaterial; // #7b8290
  sheathMat: THREE.MeshLambertMaterial; // #282a2e
  bowWoodMat: THREE.MeshStandardMaterial; // #4a2e18
  bowMetalMat: THREE.MeshStandardMaterial; // #7b8290
  bowstringCyanMat: THREE.MeshBasicMaterial; // #00f5ff
  quiverMat: THREE.MeshLambertMaterial; // #4a2e18
  arrowShaftMat: THREE.MeshLambertMaterial; // #4a2e18
  arrowFletchMat: THREE.MeshLambertMaterial; // #7b8290
  arrowHeadMat: THREE.MeshStandardMaterial; // #d1d5db
}

let cachedMaterials: BlockyHunterMaterialPalette | null = null;

function getHunterMaterials(tier: number): BlockyHunterMaterialPalette {
  if (!cachedMaterials) {
    cachedMaterials = {
      // 1. Kulit sawo matang alami wajah & leher (#c68642)
      skinTanMat: new THREE.MeshLambertMaterial({
        color: 0xc68642,
        flatShading: true,
      }),
      // 2. Tudung kepala arang medium (#3a3d45)
      hoodCharcoalMat: new THREE.MeshLambertMaterial({
        color: 0x3a3d45,
        flatShading: true,
      }),
      // 3. Jubah bergerigi arang medium (#3a3d45)
      capeCharcoalMat: new THREE.MeshLambertMaterial({
        color: 0x3a3d45,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      // 4. Masker wajah hitam gelap (#1a1a1d)
      faceMaskMat: new THREE.MeshLambertMaterial({
        color: 0x1a1a1d,
        flatShading: true,
      }),
      // 5. Mata cyan glow emisi (#00f5ff, emissiveIntensity: 2.0)
      eyesCyanGlowMat: new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 2.0,
        roughness: 0.1,
        metalness: 0.2,
      }),
      // 6. Badan kain taktis abu-abu gelap (#282a2e)
      torsoBlackMat: new THREE.MeshLambertMaterial({
        color: 0x282a2e,
        flatShading: true,
      }),
      // 7. Plat zirah dada abu-abu baja kontras (#5c626d)
      chestplateSteelMat: new THREE.MeshStandardMaterial({
        color: 0x5c626d,
        metalness: 0.70,
        roughness: 0.35,
        flatShading: true,
      }),
      // 8. Lis strip aksen logam dada & zirah (#7b8290)
      chestplateTrimMat: new THREE.MeshStandardMaterial({
        color: 0x7b8290,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      // 9. Pauldron pundak (#5c626d)
      pauldronSteelMat: new THREE.MeshStandardMaterial({
        color: 0x5c626d,
        metalness: 0.65,
        roughness: 0.35,
        flatShading: true,
      }),
      // 10. Sabuk kulit cokelat tua (#4a2e18)
      beltLeatherMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      // 11. Kepala sabuk perak persegi (#d1d5db)
      buckleSilverMat: new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.85,
        roughness: 0.20,
        flatShading: true,
      }),
      // 12. Kantong amunisi (#4a2e18)
      pouchLeatherMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      // 13. Celana taktis abu-abu gelap (#282a2e)
      pantsBlackMat: new THREE.MeshLambertMaterial({
        color: 0x282a2e,
        flatShading: true,
      }),
      // 14. Sepatu bot kulit cokelat tua (#3b2416)
      bootLeatherMat: new THREE.MeshStandardMaterial({
        color: 0x3b2416,
        roughness: 0.60,
        metalness: 0.20,
        flatShading: true,
      }),
      // 15. Pelindung tulang kering baja (#5c626d)
      shinGuardSteelMat: new THREE.MeshStandardMaterial({
        color: 0x5c626d,
        metalness: 0.75,
        roughness: 0.30,
        flatShading: true,
      }),
      // 16. Sol sepatu (#1a1a1d)
      bootSoleMat: new THREE.MeshLambertMaterial({
        color: 0x1a1a1d,
        flatShading: true,
      }),
      // 17. Bilah belati baja (#5c626d)
      daggerBladeMat: new THREE.MeshStandardMaterial({
        color: 0x5c626d,
        metalness: 0.80,
        roughness: 0.25,
        flatShading: true,
      }),
      // 18. Tepi bilah cyan bercahaya (#00f5ff, emissiveIntensity: 1.8)
      daggerCyanEdgeMat: new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.25,
      }),
      // 19. Gagang belati (#1a1a1d)
      daggerGripMat: new THREE.MeshLambertMaterial({
        color: 0x1a1a1d,
        flatShading: true,
      }),
      // 20. Pelindung tangan & pommel belati (#7b8290)
      daggerGuardMat: new THREE.MeshStandardMaterial({
        color: 0x7b8290,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      // 21. Sarung belati (#282a2e)
      sheathMat: new THREE.MeshLambertMaterial({
        color: 0x282a2e,
        flatShading: true,
      }),
      // 22. Kayu busur hardwood (#4a2e18)
      bowWoodMat: new THREE.MeshStandardMaterial({
        color: 0x4a2e18,
        roughness: 0.60,
        metalness: 0.15,
        flatShading: true,
      }),
      // 23. Sambungan & grip logam busur (#7b8290)
      bowMetalMat: new THREE.MeshStandardMaterial({
        color: 0x7b8290,
        metalness: 0.80,
        roughness: 0.30,
        flatShading: true,
      }),
      // 24. Tali busur neon cyan (#00f5ff)
      bowstringCyanMat: new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
      }),
      // 25. Quiver tabung panah (#4a2e18)
      quiverMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      // 26. Batang panah (#4a2e18)
      arrowShaftMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      // 27. Bulu sayap panah (#7b8290)
      arrowFletchMat: new THREE.MeshLambertMaterial({
        color: 0x7b8290,
        flatShading: true,
      }),
      // 28. Mata panah baja (#d1d5db)
      arrowHeadMat: new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
    };
  }

  // Tier 3+ Stealth Assassin enhancements: darker armor, brighter cyan luminescence
  if (tier >= 3) {
    cachedMaterials.chestplateSteelMat.emissive.setHex(0x003344);
    cachedMaterials.chestplateSteelMat.emissiveIntensity = 0.35;
    cachedMaterials.daggerCyanEdgeMat.emissiveIntensity = 2.2;
    cachedMaterials.eyesCyanGlowMat.emissiveIntensity = 2.4;
  } else {
    cachedMaterials.chestplateSteelMat.emissive.setHex(0x000000);
    cachedMaterials.chestplateSteelMat.emissiveIntensity = 0;
    cachedMaterials.daggerCyanEdgeMat.emissiveIntensity = 1.8;
    cachedMaterials.eyesCyanGlowMat.emissiveIntensity = 2.0;
  }

  return cachedMaterials;
}

// ----------------------------------------------------------------------------
// Preloaded Geometries Cache
// ----------------------------------------------------------------------------
interface BlockyHunterGeometryPalette {
  neckGeo: THREE.BufferGeometry;
  headGeo: THREE.BufferGeometry;
  hoodRoofGeo: THREE.BufferGeometry;
  hoodPeakGeo: THREE.BufferGeometry;
  hoodSideGeo: THREE.BufferGeometry;
  hoodCheekFlapGeo: THREE.BufferGeometry;
  hoodBackGeo: THREE.BufferGeometry;
  faceMaskGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  torsoGeo: THREE.BufferGeometry;
  chestplateGeo: THREE.BufferGeometry;
  chestplateTrimHorizGeo: THREE.BufferGeometry;
  chestplateTrimVertGeo: THREE.BufferGeometry;
  pauldronGeo: THREE.BufferGeometry;
  pauldronTrimGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  pouchGeo: THREE.BufferGeometry;
  crossStrapGeo: THREE.BufferGeometry;
  capeSteppedGeo: THREE.BufferGeometry;
  armUpperGeo: THREE.BufferGeometry;
  forearmGeo: THREE.BufferGeometry;
  bracerGeo: THREE.BufferGeometry;
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
  sheathBandGeo: THREE.BufferGeometry;
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
    // ------------------------------------------------------------------------
    // A. LEHER & KEPALA DENGAN TUDUNG ASSASSIN BERSUDUT
    // ------------------------------------------------------------------------
    // 1. Leher kecil [0.35, 0.25, 0.35] agar kepala tidak menempel langsung ke badan
    const neckGeo = new THREE.BoxGeometry(0.35 * S, 0.25 * S, 0.35 * S);

    // 2. Kepala dasar kulit [1.02, 1.02, 1.02]
    const headGeo = new THREE.BoxGeometry(1.02 * S, 1.02 * S, 1.02 * S);

    // 3. Atap tudung miring melandai ke arah depan (rotasi X: 15° / ~0.26 rad)
    const hoodRoofGeo = new THREE.BoxGeometry(1.28 * S, 0.30 * S, 1.30 * S);

    // 4. Paruh depan tudung (peaked visor cowl)
    const hoodPeakGeo = new THREE.BoxGeometry(1.18 * S, 0.18 * S, 0.42 * S);

    // 5. Penutup samping tudung
    const hoodSideGeo = new THREE.BoxGeometry(0.18 * S, 1.15 * S, 1.10 * S);

    // 6. Sayap pipi meruncing ke depan (cheek flaps framing face)
    const hoodCheekFlapGeo = new THREE.BoxGeometry(0.16 * S, 0.52 * S, 0.34 * S);

    // 7. Penutup belakang tudung
    const hoodBackGeo = new THREE.BoxGeometry(1.28 * S, 1.15 * S, 0.18 * S);

    // 8. Masker wajah [0.95, 0.40, 0.22] menutupi hidung hingga dagu
    const faceMaskGeo = new THREE.BoxGeometry(0.95 * S, 0.40 * S, 0.22 * S);

    // 9. Mata cyan lebih lebar [0.22, 0.12, 0.08]
    const eyeGeo = new THREE.BoxGeometry(0.22 * S, 0.12 * S, 0.08 * S);

    // ------------------------------------------------------------------------
    // B. BADAN ATLETIS RAMPING, ZIRAH DADA KONTRAS & SABUK
    // ------------------------------------------------------------------------
    // 1. Proporsi torso lebih ramping atletis [1.1, 1.4, 0.7] (sebelumnya 1.35x1.7)
    const torsoGeo = new THREE.BoxGeometry(1.1 * S, 1.4 * S, 0.7 * S);

    // 2. Plat zirah dada abu-abu baja kontras [1.14, 0.85, 0.20]
    const chestplateGeo = new THREE.BoxGeometry(1.14 * S, 0.85 * S, 0.20 * S);

    // 3. Lis strip aksen logam dada
    const chestplateTrimHorizGeo = new THREE.BoxGeometry(1.16 * S, 0.10 * S, 0.22 * S);
    const chestplateTrimVertGeo = new THREE.BoxGeometry(0.12 * S, 0.86 * S, 0.22 * S);

    // 4. Pauldron pundak bersiku [0.50, 0.50, 0.50]
    const pauldronGeo = new THREE.BoxGeometry(0.50 * S, 0.50 * S, 0.50 * S);
    const pauldronTrimGeo = new THREE.BoxGeometry(0.52 * S, 0.10 * S, 0.52 * S);

    // 5. Sabuk taktis kulit [1.18, 0.22, 0.76] & kepala sabuk perak persegi [0.28, 0.28, 0.82]
    const beltGeo = new THREE.BoxGeometry(1.18 * S, 0.22 * S, 0.76 * S);
    const buckleGeo = new THREE.BoxGeometry(0.28 * S, 0.28 * S, 0.82 * S);
    const pouchGeo = new THREE.BoxGeometry(0.22 * S, 0.28 * S, 0.16 * S);
    const crossStrapGeo = new THREE.BoxGeometry(0.16 * S, 1.60 * S, 0.06 * S);

    // ------------------------------------------------------------------------
    // C. JUBAH BERGERIGI TANGGA (STAIR-CASE STEPPED CAPE)
    // ------------------------------------------------------------------------
    const capeShape = new THREE.Shape();
    const halfW = (1.18 * S) / 2;
    const fullH = 2.05 * S;
    capeShape.moveTo(-halfW, 0);
    capeShape.lineTo(halfW, 0);
    capeShape.lineTo(halfW, -fullH * 0.78);
    // Pola potongan tangga kaku (stair-case stepped teeth)
    capeShape.lineTo(halfW * 0.46, -fullH * 0.78);
    capeShape.lineTo(halfW * 0.46, -fullH);
    capeShape.lineTo(halfW * 0.02, -fullH);
    capeShape.lineTo(halfW * 0.02, -fullH * 0.86);
    capeShape.lineTo(-halfW * 0.48, -fullH * 0.86);
    capeShape.lineTo(-halfW * 0.48, -fullH * 0.96);
    capeShape.lineTo(-halfW, -fullH * 0.96);
    capeShape.closePath();

    const capeSteppedGeo = new THREE.ExtrudeGeometry(capeShape, {
      depth: 0.07 * S,
      bevelEnabled: false,
    });
    capeSteppedGeo.center();

    // ------------------------------------------------------------------------
    // D. LENGAN, SENDI SIKU & TANGAN
    // ------------------------------------------------------------------------
    const armUpperGeo = new THREE.BoxGeometry(0.36 * S, 0.68 * S, 0.36 * S);
    const forearmGeo = new THREE.BoxGeometry(0.32 * S, 0.62 * S, 0.32 * S);
    const bracerGeo = new THREE.BoxGeometry(0.34 * S, 0.38 * S, 0.12 * S);
    const handGeo = new THREE.BoxGeometry(0.28 * S, 0.26 * S, 0.28 * S);

    // ------------------------------------------------------------------------
    // E. KAKI, CELANA & SEPATU BOT KULIT DENGAN SHIN GUARD
    // ------------------------------------------------------------------------
    const thighGeo = new THREE.BoxGeometry(0.40 * S, 1.25 * S, 0.40 * S);
    const bootGeo = new THREE.BoxGeometry(0.46 * S, 0.60 * S, 0.50 * S);
    const shinGuardGeo = new THREE.BoxGeometry(0.40 * S, 0.52 * S, 0.14 * S);
    const bootToeGeo = new THREE.BoxGeometry(0.46 * S, 0.26 * S, 0.28 * S);
    const bootSoleGeo = new THREE.BoxGeometry(0.48 * S, 0.08 * S, 0.58 * S);

    // ------------------------------------------------------------------------
    // F. SEPASANG BELATI BAJA (STEEL DAGGERS) & SARUNG PINGGUL
    // ------------------------------------------------------------------------
    const daggerGripGeo = new THREE.BoxGeometry(0.08 * S, 0.32 * S, 0.08 * S);
    const daggerGuardGeo = new THREE.BoxGeometry(0.26 * S, 0.06 * S, 0.10 * S);
    const daggerBladeGeo = new THREE.BoxGeometry(0.15 * S, 0.85 * S, 0.04 * S);
    const daggerEdgeGeo = new THREE.BoxGeometry(0.02 * S, 0.85 * S, 0.044 * S);
    const daggerTipGeo = new THREE.ConeGeometry(0.075 * S, 0.20 * S, 4);
    daggerTipGeo.rotateY(Math.PI / 4);

    const sheathGeo = new THREE.BoxGeometry(0.18 * S, 0.75 * S, 0.14 * S);
    const sheathBandGeo = new THREE.BoxGeometry(0.20 * S, 0.08 * S, 0.16 * S);

    // ------------------------------------------------------------------------
    // G. BUSUR RECURVE BERSUDUT & QUIVER MENYILANG DI PUNDAK
    // ------------------------------------------------------------------------
    const bowHandleGeo = new THREE.BoxGeometry(0.11 * S, 0.65 * S, 0.11 * S);
    const bowLimbGeo = new THREE.BoxGeometry(0.09 * S, 0.60 * S, 0.09 * S);
    const bowTipGeo = new THREE.BoxGeometry(0.08 * S, 0.42 * S, 0.08 * S);
    const bowstringGeo = new THREE.CylinderGeometry(0.012 * S, 0.012 * S, 2.20 * S, 4);

    const quiverGeo = new THREE.BoxGeometry(0.32 * S, 1.35 * S, 0.32 * S);
    const quiverBandGeo = new THREE.BoxGeometry(0.35 * S, 0.10 * S, 0.35 * S);

    const arrowShaftGeo = new THREE.CylinderGeometry(0.016 * S, 0.016 * S, 1.40 * S, 4);
    const arrowFletchGeo = new THREE.BoxGeometry(0.12 * S, 0.26 * S, 0.02 * S);
    const arrowTipGeo = new THREE.ConeGeometry(0.035 * S, 0.14 * S, 4);

    cachedGeometries = {
      neckGeo,
      headGeo,
      hoodRoofGeo,
      hoodPeakGeo,
      hoodSideGeo,
      hoodCheekFlapGeo,
      hoodBackGeo,
      faceMaskGeo,
      eyeGeo,
      torsoGeo,
      chestplateGeo,
      chestplateTrimHorizGeo,
      chestplateTrimVertGeo,
      pauldronGeo,
      pauldronTrimGeo,
      beltGeo,
      buckleGeo,
      pouchGeo,
      crossStrapGeo,
      capeSteppedGeo,
      armUpperGeo,
      forearmGeo,
      bracerGeo,
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
      sheathBandGeo,
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
 * 1. Palet kontras taktis (abu-abu arang medium, celah kulit, masker gelap, mata cyan terang).
 * 2. Anatomi leher nyata dan tudung miring melandai 15° dengan sayap pipi bersudut.
 * 3. Badan lebih ramping atletis [1.1, 1.4, 0.7] dan sendi siku dengan tekukan alami.
 * 4. Titik jangkar busur tegak vertikal pas di genggaman telapak tangan kiri.
 * 5. Quiver menyilang 35° melongok jelas di atas pundak kanan saat dilihat dari depan.
 * 6. Sepasang sarung belati pinggul siap cabut dengan gagang terlihat menonjol.
 */
export function createBlockyHunterMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'rogue';

  const mats = getHunterMaterials(tier);
  const geos = getHunterGeometries();

  // --------------------------------------------------------------------------
  // 1. Torso Atletis Ramping, Zirah Dada Kontras, Sabuk & Jubah
  // --------------------------------------------------------------------------
  // Torso ramping atletis [1.1, 1.4, 0.7] (sebelumnya 1.35x1.7)
  const body = new THREE.Mesh(geos.torsoGeo, mats.torsoBlackMat);
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // Plat Zirah Dada Abu-abu Baja Kontras (#5c626d)
  const chestplate = new THREE.Mesh(geos.chestplateGeo, mats.chestplateSteelMat);
  chestplate.position.set(0, 0.18 * S, 0.28 * S);
  chestplate.castShadow = true;
  body.add(chestplate);

  // Lis Aksen Strip Logam (#7b8290) pada zirah dada
  const chestTrimTop = new THREE.Mesh(geos.chestplateTrimHorizGeo, mats.chestplateTrimMat);
  chestTrimTop.position.set(0, 0.54 * S, 0.29 * S);
  chestTrimTop.castShadow = true;
  body.add(chestTrimTop);

  const chestTrimBottom = new THREE.Mesh(geos.chestplateTrimHorizGeo, mats.chestplateTrimMat);
  chestTrimBottom.position.set(0, -0.18 * S, 0.29 * S);
  chestTrimBottom.castShadow = true;
  body.add(chestTrimBottom);

  const chestTrimCenter = new THREE.Mesh(geos.chestplateTrimVertGeo, mats.chestplateTrimMat);
  chestTrimCenter.position.set(0, 0.18 * S, 0.30 * S);
  chestTrimCenter.castShadow = true;
  body.add(chestTrimCenter);

  // Selempang Kulit Diagonal (Cross-Strap #4a2e18) dari pundak kanan ke pinggang kiri
  const crossStrap = new THREE.Mesh(geos.crossStrapGeo, mats.beltLeatherMat);
  crossStrap.position.set(0, 0.10 * S, 0.33 * S);
  crossStrap.rotation.z = -0.52;
  crossStrap.castShadow = true;
  body.add(crossStrap);

  // Sabuk Taktis Kulit Cokelat Tua (#4a2e18)
  const belt = new THREE.Mesh(geos.beltGeo, mats.beltLeatherMat);
  belt.position.set(0, -0.56 * S, 0);
  belt.castShadow = true;
  body.add(belt);

  // Kepala Sabuk Perak Persegi (#d1d5db)
  const buckle = new THREE.Mesh(geos.buckleGeo, mats.buckleSilverMat);
  buckle.position.set(0, -0.56 * S, 0.01);
  buckle.castShadow = true;
  body.add(buckle);

  // 3 Kantong Amunisi Kulit Kecil di Sabuk Depan
  [-0.30 * S, 0, 0.30 * S].forEach((posX) => {
    const pouch = new THREE.Mesh(geos.pouchGeo, mats.pouchLeatherMat);
    pouch.position.set(posX, -0.56 * S, 0.40 * S);
    pouch.castShadow = true;
    body.add(pouch);
  });

  // Jubah Bergerigi Tangga (Stair-Case Stepped Cape) Abu-abu Arang Medium (#3a3d45)
  const cape = new THREE.Mesh(geos.capeSteppedGeo, mats.capeCharcoalMat);
  cape.position.set(0, 1.58, -0.28 * S);
  cape.rotation.x = 0.17; // Miring 10° ke belakang
  cape.castShadow = true;
  group.add(cape);

  // --------------------------------------------------------------------------
  // 2. Anatomi Leher & Tudung Kepala Assassin Bersudut (Angular Cowl)
  // --------------------------------------------------------------------------
  // A. Leher Kecil [0.35, 0.25, 0.35] Kulit Sawo Matang (#c68642)
  const neck = new THREE.Mesh(geos.neckGeo, mats.skinTanMat);
  neck.position.set(0, 1.76, 0);
  neck.castShadow = true;
  group.add(neck);

  // B. Kepala Dasar Kulit Sawo Matang (#c68642) di atas leher
  const head = new THREE.Mesh(geos.headGeo, mats.skinTanMat);
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);

  // C. Struktur Tudung Assassin (Medium Charcoal Grey #3a3d45):
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0, 0, 0);

  // 1. Atap Tudung miring melandai ke arah depan (rotasi X: 15° / ~0.26 rad)
  const hoodRoof = new THREE.Mesh(geos.hoodRoofGeo, mats.hoodCharcoalMat);
  hoodRoof.position.set(0, 0.40 * S, -0.04 * S);
  hoodRoof.rotation.x = 0.26; // 15° kemiringan ke depan
  hoodRoof.castShadow = true;
  hoodGroup.add(hoodRoof);

  // 2. Paruh Depan Tudung (Peaked Visor Cowl) menaungi mata
  const hoodPeak = new THREE.Mesh(geos.hoodPeakGeo, mats.hoodCharcoalMat);
  hoodPeak.position.set(0, 0.38 * S, 0.50 * S);
  hoodPeak.rotation.x = 0.35;
  hoodPeak.castShadow = true;
  hoodGroup.add(hoodPeak);

  // 3. Penutup Samping (Kiri & Kanan)
  const hoodLeft = new THREE.Mesh(geos.hoodSideGeo, mats.hoodCharcoalMat);
  hoodLeft.position.set(0.50 * S, -0.02 * S, 0);
  hoodLeft.castShadow = true;

  const hoodRight = new THREE.Mesh(geos.hoodSideGeo, mats.hoodCharcoalMat);
  hoodRight.position.set(-0.50 * S, -0.02 * S, 0);
  hoodRight.castShadow = true;
  hoodGroup.add(hoodLeft, hoodRight);

  // 4. Sayap Pipi Meruncing ke Depan (Cheek Flaps) membingkai celah mata dan masker
  const leftCheekFlap = new THREE.Mesh(geos.hoodCheekFlapGeo, mats.hoodCharcoalMat);
  leftCheekFlap.position.set(0.46 * S, -0.15 * S, 0.46 * S);
  leftCheekFlap.rotation.y = -0.18; // Menekuk ke dalam membingkai pipi
  leftCheekFlap.castShadow = true;

  const rightCheekFlap = new THREE.Mesh(geos.hoodCheekFlapGeo, mats.hoodCharcoalMat);
  rightCheekFlap.position.set(-0.46 * S, -0.15 * S, 0.46 * S);
  rightCheekFlap.rotation.y = 0.18; // Menekuk ke dalam membingkai pipi
  rightCheekFlap.castShadow = true;
  hoodGroup.add(leftCheekFlap, rightCheekFlap);

  // 5. Penutup Belakang Tudung
  const hoodBack = new THREE.Mesh(geos.hoodBackGeo, mats.hoodCharcoalMat);
  hoodBack.position.set(0, -0.02 * S, -0.52 * S);
  hoodBack.castShadow = true;
  hoodGroup.add(hoodBack);

  head.add(hoodGroup);

  // D. Masker Wajah Hitam Gelap (#1a1a1d) menutupi hidung ke bawah
  const faceMask = new THREE.Mesh(geos.faceMaskGeo, mats.faceMaskMat);
  faceMask.position.set(0, -0.22 * S, 0.48 * S);
  faceMask.castShadow = true;
  head.add(faceMask);

  // E. Mata Cyan Glow Terang (#00f5ff, emissiveIntensity: 2.0) Dimensi Lebar [0.22, 0.12, 0.08]
  // Terletak di celah kulit alami (#c68642) antara paruh tudung dan masker
  const leftEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  leftEye.position.set(0.24 * S, 0.10 * S, 0.52 * S);

  const rightEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanGlowMat);
  rightEye.position.set(-0.24 * S, 0.10 * S, 0.52 * S);
  head.add(leftEye, rightEye);

  // --------------------------------------------------------------------------
  // 3. Pelindung Bahu Bersiku (Pauldrons) dengan Lis Perak
  // --------------------------------------------------------------------------
  const buildPauldron = (isLeft: boolean) => {
    const pGroup = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    pGroup.position.set(sign * 0.42, 1.64, 0);
    pGroup.rotation.z = -sign * 0.22;

    const mainPlate = new THREE.Mesh(geos.pauldronGeo, mats.pauldronSteelMat);
    mainPlate.castShadow = true;
    pGroup.add(mainPlate);

    const rim = new THREE.Mesh(geos.pauldronTrimGeo, mats.chestplateTrimMat);
    rim.position.y = -0.20 * S;
    rim.castShadow = true;
    pGroup.add(rim);

    return pGroup;
  };

  const pauldronLeft = buildPauldron(true);
  const pauldronRight = buildPauldron(false);
  group.add(pauldronLeft, pauldronRight);

  // --------------------------------------------------------------------------
  // 4. Lengan dengan Sendi Siku Alami (Natural Elbow Bend) & Tangan
  // --------------------------------------------------------------------------
  const buildHunterArm = (isLeft: boolean) => {
    const sign = isLeft ? 1 : -1;

    // Sendi Bahu (Upper Arm Pivot)
    const armGroup = new THREE.Group();
    armGroup.position.set(sign * 0.42, 1.60, 0);
    // Pose alami bahu: miring sedikit ke luar (rotasi Z: ±10° / ±0.17 rad)
    armGroup.rotation.z = sign * 0.17;
    armGroup.rotation.x = -0.10;

    const upperArm = new THREE.Mesh(geos.armUpperGeo, mats.torsoBlackMat);
    upperArm.position.y = -0.34 * S;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    // Sendi Siku (Forearm Pivot)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.68 * S, 0);
    // Tekukan siku alami: menekuk ke depan (rotasi X: -0.20 rad) dan ke dalam (rotasi Z: ∓15° / ∓0.26 rad)
    forearmGroup.rotation.x = -0.20;
    forearmGroup.rotation.z = -sign * 0.26;

    const forearm = new THREE.Mesh(geos.forearmGeo, mats.torsoBlackMat);
    forearm.position.y = -0.31 * S;
    forearm.castShadow = true;
    forearmGroup.add(forearm);

    // Pelindung lengan baja (Bracer) di bagian luar
    const bracer = new THREE.Mesh(geos.bracerGeo, mats.chestplateSteelMat);
    bracer.position.set(sign * 0.14 * S, -0.31 * S, 0.08 * S);
    bracer.castShadow = true;
    forearmGroup.add(bracer);

    // Pergelangan & Telapak Tangan (Hand Pivot)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.62 * S, 0);

    const hand = new THREE.Mesh(geos.handGeo, mats.skinTanMat);
    hand.position.y = -0.12 * S;
    hand.castShadow = true;
    handGroup.add(hand);

    forearmGroup.add(handGroup);
    armGroup.add(forearmGroup);
    group.add(armGroup);

    return { armGroup, forearmGroup, handGroup };
  };

  const leftArmData = buildHunterArm(true);
  const rightArmData = buildHunterArm(false);

  const leftArm = leftArmData.armGroup;
  const rightArm = rightArmData.armGroup;
  const leftForearm = leftArmData.forearmGroup;
  const rightForearm = rightArmData.forearmGroup;
  const leftHand = leftArmData.handGroup;
  const rightHand = rightArmData.handGroup;

  // --------------------------------------------------------------------------
  // 5. Kaki, Celana Taktis & Sepatu Bot Kulit dengan Shin Guard
  // --------------------------------------------------------------------------
  const buildHunterLeg = (posX: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(posX, 0.88, 0);

    // Celana taktis abu-abu gelap (#282a2e)
    const thigh = new THREE.Mesh(geos.thighGeo, mats.pantsBlackMat);
    thigh.position.y = -0.36;
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Sepatu bot kulit cokelat tua (#3b2416)
    const boot = new THREE.Mesh(geos.bootGeo, mats.bootLeatherMat);
    boot.position.set(0, -0.64, 0.02);
    boot.castShadow = true;
    legGroup.add(boot);

    // Pelindung tulang kering baja (#5c626d)
    const shinGuard = new THREE.Mesh(geos.shinGuardGeo, mats.shinGuardSteelMat);
    shinGuard.position.set(0, -0.58, 0.16 * S);
    shinGuard.castShadow = true;
    legGroup.add(shinGuard);

    // Ujung depan bot (toe block)
    const toe = new THREE.Mesh(geos.bootToeGeo, mats.bootLeatherMat);
    toe.position.set(0, -0.74, 0.14 * S);
    toe.castShadow = true;
    legGroup.add(toe);

    // Sol sepatu gelap (#1a1a1d)
    const sole = new THREE.Mesh(geos.bootSoleGeo, mats.bootSoleMat);
    sole.position.set(0, -0.82, 0.06 * S);
    sole.receiveShadow = true;
    legGroup.add(sole);

    group.add(legGroup);
    return legGroup;
  };

  const leftLeg = buildHunterLeg(0.18);
  const rightLeg = buildHunterLeg(-0.18);

  // --------------------------------------------------------------------------
  // 6. Sarung Belati Pinggul Ganda (Dual Hip Dagger Sheaths)
  // --------------------------------------------------------------------------
  // Dipasang di pinggul luar kiri dan kanan sabuk dengan sudut siap cabut
  const sheathedDaggers = new THREE.Group();

  const buildHipSheath = (isLeft: boolean) => {
    const sheathAnchor = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    sheathAnchor.position.set(sign * 0.62 * S, -0.48 * S, 0.04 * S);
    sheathAnchor.rotation.set(0.18, 0, -sign * 0.28); // Sudut siap cabut

    // Wadah sarung kulit
    const holster = new THREE.Mesh(geos.sheathGeo, mats.sheathMat);
    holster.castShadow = true;
    sheathAnchor.add(holster);

    // Lis pengikat sarung perak
    const band = new THREE.Mesh(geos.sheathBandGeo, mats.buckleSilverMat);
    band.position.y = 0.28 * S;
    sheathAnchor.add(band);

    // Gagang belati menonjol keluar saat belati disarungkan
    const hiltGroup = new THREE.Group();
    hiltGroup.position.set(0, 0.44 * S, 0);

    const grip = new THREE.Mesh(geos.daggerGripGeo, mats.daggerGripMat);
    grip.castShadow = true;
    hiltGroup.add(grip);

    const guard = new THREE.Mesh(geos.daggerGuardGeo, mats.daggerGuardMat);
    guard.position.y = -0.16 * S;
    guard.castShadow = true;
    hiltGroup.add(guard);

    const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.11 * S, 0.05 * S, 0.11 * S), mats.daggerGuardMat);
    pommel.position.y = 0.16 * S;
    hiltGroup.add(pommel);

    sheathAnchor.add(hiltGroup);
    sheathedDaggers.add(hiltGroup);

    body.add(sheathAnchor);
    return sheathAnchor;
  };

  buildHipSheath(true);
  buildHipSheath(false);

  // Awalnya belati sedang terhunus di tangan (mode belati)
  sheathedDaggers.visible = false;

  // --------------------------------------------------------------------------
  // 7. Sepasang Belati Baja Beremisi (Steel Daggers) di Tangan
  // --------------------------------------------------------------------------
  const buildDagger = () => {
    const daggerGroup = new THREE.Group();

    // Gagang hitam taktis
    const grip = new THREE.Mesh(geos.daggerGripGeo, mats.daggerGripMat);
    grip.castShadow = true;
    daggerGroup.add(grip);

    // Pommel bawah
    const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.11 * S, 0.05 * S, 0.11 * S), mats.daggerGuardMat);
    pommel.position.y = -0.16 * S;
    daggerGroup.add(pommel);

    // Guard pelindung tangan
    const guard = new THREE.Mesh(geos.daggerGuardGeo, mats.daggerGuardMat);
    guard.position.y = 0.16 * S;
    guard.castShadow = true;
    daggerGroup.add(guard);

    // Bilah belati baja abu-abu (#5c626d)
    const blade = new THREE.Mesh(geos.daggerBladeGeo, mats.daggerBladeMat);
    blade.position.y = (0.16 + 0.425) * S;
    blade.castShadow = true;
    daggerGroup.add(blade);

    // Tepi bilah cyan menyala terang (#00f5ff, emissive: 1.8)
    const edgeLeft = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeLeft.position.set(-0.07 * S, (0.16 + 0.425) * S, 0);
    const edgeRight = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeRight.position.set(0.07 * S, (0.16 + 0.425) * S, 0);
    daggerGroup.add(edgeLeft, edgeRight);

    // Ujung mata pisau runcing (drop-point tip)
    const tip = new THREE.Mesh(geos.daggerTipGeo, mats.daggerBladeMat);
    tip.position.y = (0.16 + 0.85 + 0.08) * S;
    tip.castShadow = true;
    daggerGroup.add(tip);

    const tipCyan = new THREE.Mesh(new THREE.ConeGeometry(0.08 * S, 0.12 * S, 4), mats.daggerCyanEdgeMat);
    tipCyan.position.y = (0.16 + 0.85 + 0.04) * S;
    tipCyan.rotateY(Math.PI / 4);
    daggerGroup.add(tipCyan);

    return daggerGroup;
  };

  // Mainhand (Right) Dagger di tangan kanan
  const weapon = new THREE.Group();
  const daggerRight = buildDagger();
  weapon.add(daggerRight);
  weapon.position.set(0, -0.12 * S, 0.06);
  weapon.rotation.set(Math.PI / 2.3, 0.12, 0);
  rightHand.add(weapon);

  // Offhand (Left) Dagger di tangan kiri
  const leftWeapon = new THREE.Group();
  const daggerLeft = buildDagger();
  leftWeapon.add(daggerLeft);
  leftWeapon.position.set(0, -0.12 * S, 0.06);
  leftWeapon.rotation.set(Math.PI / 2.3, -0.12, 0);
  leftHand.add(leftWeapon);

  // --------------------------------------------------------------------------
  // 8. Busur 5-Segmen Berdiri Tegak di Tangan Kiri & Quiver Pundak
  // --------------------------------------------------------------------------
  const buildAngularRecurveBow = () => {
    const bowGroup = new THREE.Group();

    // 1. Handle Tengah - Pusat Jangkar Pegangan Telapak Tangan
    const handle = new THREE.Mesh(geos.bowHandleGeo, mats.bowWoodMat);
    handle.castShadow = true;
    bowGroup.add(handle);

    // Grip logam di tengah pegangan
    const handleGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.13 * S, 0.28 * S, 0.13 * S),
      mats.bowMetalMat
    );
    bowGroup.add(handleGrip);

    // 2. Sayap Atas [0.09, 0.60, 0.09] miring ke depan 30°
    const upperLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    upperLimb.position.set(0, 0.52 * S, 0.12 * S);
    upperLimb.rotation.x = 0.52;
    upperLimb.castShadow = true;
    bowGroup.add(upperLimb);

    // 3. Tip Ujung Atas miring kembali -30°
    const upperTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    upperTip.position.set(0, 0.96 * S, -0.04 * S);
    upperTip.rotation.x = -0.52;
    upperTip.castShadow = true;
    bowGroup.add(upperTip);

    // 4. Sayap Bawah miring ke depan -30°
    const lowerLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    lowerLimb.position.set(0, -0.52 * S, 0.12 * S);
    lowerLimb.rotation.x = -0.52;
    lowerLimb.castShadow = true;
    bowGroup.add(lowerLimb);

    // 5. Tip Ujung Bawah miring kembali 30°
    const lowerTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    lowerTip.position.set(0, -0.96 * S, -0.04 * S);
    lowerTip.rotation.x = 0.52;
    lowerTip.castShadow = true;
    bowGroup.add(lowerTip);

    // Tali Busur Neon Cyan Lurus (#00f5ff)
    const bowstring = new THREE.Mesh(geos.bowstringGeo, mats.bowstringCyanMat);
    bowstring.position.set(0, 0, -0.20 * S);
    bowGroup.add(bowstring);

    return bowGroup;
  };

  // Busur aktif di tangan kiri:
  // Pusat pegangan (grip) pas di telapak tangan kiri, berdiri tegak vertikal sejajar tangan
  const hunterBow = buildAngularRecurveBow();
  hunterBow.position.set(0.04 * S, -0.12 * S, 0.06 * S);
  hunterBow.rotation.set(0, 0, 0); // Tegak vertikal tanpa rotasi miring canggung
  hunterBow.visible = false; // Awalnya tersimpan dalam mode belati
  leftHand.add(hunterBow);

  // Busur tersampir menyilang di punggung saat mode belati
  const hunterBowStowed = buildAngularRecurveBow();
  hunterBowStowed.position.set(0.04, 0.08, -0.42 * S);
  hunterBowStowed.rotation.set(0.12, 0, 0.65);
  hunterBowStowed.visible = true;
  body.add(hunterBowStowed);

  // Quiver (Tabung Panah) di Punggung Kanan Atas:
  // Menyilang 35° melewati pundak kanan, sehingga tabung dan ujung bulu 5 anak panah
  // melongok jelas ke atas bahu saat dilihat dari kamera depan
  const hunterQuiver = new THREE.Group();
  hunterQuiver.position.set(-0.22, 0.30, -0.36 * S);
  hunterQuiver.rotation.set(0.10, -0.08, -0.61); // Miring 35° menyilang ke pundak kanan

  const quiverTube = new THREE.Mesh(geos.quiverGeo, mats.quiverMat);
  quiverTube.castShadow = true;
  hunterQuiver.add(quiverTube);

  const quiverBand1 = new THREE.Mesh(geos.quiverBandGeo, mats.buckleSilverMat);
  quiverBand1.position.y = 0.44 * S;
  const quiverBand2 = new THREE.Mesh(geos.quiverBandGeo, mats.buckleSilverMat);
  quiverBand2.position.y = -0.44 * S;
  hunterQuiver.add(quiverBand1, quiverBand2);

  // 5 Anak Panah dengan bulu sayap abu-abu baja (#7b8290) melongok tinggi ke atas pundak
  const arrowOffsets = [
    { x: -0.05 * S, z: -0.05 * S, rot: 0.04 },
    { x: 0.05 * S, z: -0.05 * S, rot: -0.05 },
    { x: 0, z: 0, rot: 0.02 },
    { x: -0.05 * S, z: 0.05 * S, rot: -0.03 },
    { x: 0.05 * S, z: 0.05 * S, rot: 0.06 },
  ];

  arrowOffsets.forEach((off) => {
    const arrow = new THREE.Group();
    arrow.position.set(off.x, 0.70 * S, off.z);
    arrow.rotation.z = off.rot;

    const shaft = new THREE.Mesh(geos.arrowShaftGeo, mats.arrowShaftMat);
    arrow.add(shaft);

    const fletchX = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowFletchMat);
    fletchX.position.y = 0.54 * S;
    const fletchZ = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowFletchMat);
    fletchZ.position.y = 0.54 * S;
    fletchZ.rotation.y = Math.PI / 2;
    arrow.add(fletchX, fletchZ);

    const headArrow = new THREE.Mesh(geos.arrowTipGeo, mats.arrowHeadMat);
    headArrow.position.y = -0.70 * S;
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
      // MODE JARAK JAUH (BUSUR):
      // Belati tersimpan di sarung pinggul dengan gagang terlihat, busur dipegang tegak di tangan kiri
      daggerRight.visible = false;
      daggerLeft.visible = false;
      hunterBow.visible = true;
      hunterBowStowed.visible = false;
      sheathedDaggers.visible = true;
    } else {
      // MODE JARAK DEKAT (BELATI):
      // Busur tersampir di punggung, kedua belati terhunus di tangan
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
    const ringGeo = new THREE.RingGeometry(0.65, 0.78, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.position.y = 0.05;
    group.add(auraRing);

    const orbCount = tier >= 5 ? 4 : 2;
    for (let i = 0; i < orbCount; i++) {
      const shurikenMat = new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 1.4,
      });
      const shuriken = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), shurikenMat);
      const angle = (i / orbCount) * Math.PI * 2;
      shuriken.position.set(Math.cos(angle) * 0.9, 1.35, Math.sin(angle) * 0.9);
      group.add(shuriken);
      orbitingOrbs.push(shuriken);
    }
  }

  const result: PlayerMeshObjects = {
    group,
    leftArm,
    rightArm,
    leftForearm,
    leftHand,
    rightHand,
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

  // Simpan rightForearm untuk animasi siku
  (result as any).rightForearm = rightForearm;

  return result;
}

/**
 * ============================================================================
 * SMOOTH HUNTER WALK & STANCE ANIMATION (TEKUKAN SIKU ALAMI)
 * ============================================================================
 * Menghaluskan animasi gerak & idle Pemburu:
 * - Upper arm miring sedikit ke luar (rotasi Z: ±10° / ±0.17 rad).
 * - Forearm menekuk sedikit ke depan/dalam (rotasi Z: ∓15° / ∓0.26 rad, rotasi X: -0.20 rad).
 * - Posisi busur tegak vertikal stabil di tangan kiri.
 * - Kibasan jubah bergerigi arang medium berayun dinamis.
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
  const leftForearm = playerMesh.leftForearm;
  const rightForearm = (playerMesh as any).rightForearm as THREE.Group | undefined;

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
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.22, 0.2);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.2);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, legSwing * 0.45, 0.2);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.2);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.2);

        if (leftForearm) {
          leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, -0.25, 0.2);
          leftForearm.rotation.z = THREE.MathUtils.lerp(leftForearm.rotation.z, -0.26, 0.2);
        }
        if (rightForearm) {
          rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, -0.20, 0.2);
          rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.26, 0.2);
        }
      } else {
        // Mode Belati: Postur condong gesit siap tebas
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.45 - legSwing * 0.35, 0.2);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.15, 0.2);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.2);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.45 + legSwing * 0.35, 0.2);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.15, 0.2);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.2);

        if (leftForearm) {
          leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, -0.20, 0.2);
          leftForearm.rotation.z = THREE.MathUtils.lerp(leftForearm.rotation.z, -0.26, 0.2);
        }
        if (rightForearm) {
          rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, -0.20, 0.2);
          rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.26, 0.2);
        }
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
    // IDLE BREATHING & READY STANCE (TEKUKAN SIKU ALAMI)
    // ------------------------------------------------------------------------
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, 0.2);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, 0.2);
    playerMesh.group.rotation.z = THREE.MathUtils.lerp(playerMesh.group.rotation.z, 0, 0.2);

    const breathe = Math.sin(walkTime * 2.2) * 0.015;
    playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.35 + breathe, 0.15);

    if (!isAttacking) {
      if (isBow) {
        // Ready Bow Stance: Busur berdiri tegak di tangan kiri
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.25, 0.15);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.15, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.15); // +10° out

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0.10, 0.15);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.15); // -10° out

        if (leftForearm) {
          leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, -0.20, 0.15);
          leftForearm.rotation.z = THREE.MathUtils.lerp(leftForearm.rotation.z, -0.26, 0.15); // -15° inward
        }
        if (rightForearm) {
          rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, -0.20, 0.15);
          rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.26, 0.15); // +15° inward
        }
      } else {
        // Ready Dual Daggers Stance: Siku menekuk alami, belati menghadap depan siap reaksi
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.20 + breathe * 0.3, 0.15);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.12, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.15); // +10° out

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.20 - breathe * 0.3, 0.15);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.12, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.15); // -10° out

        if (leftForearm) {
          leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, -0.20, 0.15);
          leftForearm.rotation.z = THREE.MathUtils.lerp(leftForearm.rotation.z, -0.26, 0.15); // -15° inward
        }
        if (rightForearm) {
          rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, -0.20, 0.15);
          rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.26, 0.15); // +15° inward
        }
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
