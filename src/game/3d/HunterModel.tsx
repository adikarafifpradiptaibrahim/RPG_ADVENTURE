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
 * dengan sambungan pelvis padat (bebas celah), masker wajah solid, jubah bergerigi tangga,
 * dan plat zirah dada kontras tinggi.
 */
export const USE_LEGACY_HUNTER = false;
import { createLegacyHunterMesh } from './HunterModelLegacy';
export { createLegacyHunterMesh };

/**
 * ============================================================================
 * PRELOADED MATERIAL PALETTE (High-Contrast Tactical Stealth Theme)
 * ============================================================================
 * Menghilangkan kesan balok kusam menyatu dengan kontras tajam:
 * - Kulit Kepala & Wajah: #c68642
 * - Masker Wajah Solid: #1f2022
 * - Mata Cyan Glow Emisi: #00f5ff (emissiveIntensity: 2.5)
 * - Tudung Rogue Medium: #32353b
 * - Baju Dalam Torso: #1f2022
 * - Pelvis & Celana: #18181b
 * - Plat Zirah Dada Abu-abu Baja Kontras: #545860
 * - Lis Strip Logam: #7b8290
 * - Pauldron Bahu Bersiku: #3e4147
 * - Sabuk Kulit Cokelat: #4a2e18 dengan Kepala Sabuk Perak #d1d5db
 * - Sepatu Bot Kulit Cokelat Gelap: #301c10 dengan Shin Guard #545860
 * - Jubah Bergerigi Tangga: #26282c
 * - Quiver & Panah: #4a2e18 & #7b8290
 * - Senjata Belati & Busur: #545860, #7b8290, Tali & Tepi Cyan #00f5ff
 */

interface BlockyHunterMaterialPalette {
  skinMat: THREE.MeshLambertMaterial; // #c68642
  hoodMat: THREE.MeshLambertMaterial; // #32353b
  faceMaskMat: THREE.MeshLambertMaterial; // #1f2022
  eyesCyanMat: THREE.MeshStandardMaterial; // #00f5ff + Emissive 2.5
  bajuDalamMat: THREE.MeshLambertMaterial; // #1f2022
  pelvisMat: THREE.MeshLambertMaterial; // #18181b
  chestplateMat: THREE.MeshStandardMaterial; // #545860
  chestplateTrimMat: THREE.MeshStandardMaterial; // #7b8290
  pauldronMat: THREE.MeshStandardMaterial; // #3e4147
  beltMat: THREE.MeshLambertMaterial; // #4a2e18
  buckleMat: THREE.MeshStandardMaterial; // #d1d5db
  pouchMat: THREE.MeshLambertMaterial; // #4a2e18
  bootsMat: THREE.MeshStandardMaterial; // #301c10
  shinGuardMat: THREE.MeshStandardMaterial; // #545860
  soleMat: THREE.MeshLambertMaterial; // #18181b
  capeMat: THREE.MeshLambertMaterial; // #26282c
  quiverMat: THREE.MeshLambertMaterial; // #4a2e18
  arrowMat: THREE.MeshStandardMaterial; // #7b8290
  arrowShaftMat: THREE.MeshLambertMaterial; // #4a2e18
  daggerBladeMat: THREE.MeshStandardMaterial; // #545860
  daggerCyanEdgeMat: THREE.MeshStandardMaterial; // #00f5ff + Emissive 2.0
  daggerGripMat: THREE.MeshLambertMaterial; // #18181b
  daggerGuardMat: THREE.MeshStandardMaterial; // #7b8290
  sheathMat: THREE.MeshLambertMaterial; // #18181b
  bowWoodMat: THREE.MeshStandardMaterial; // #4a2e18
  bowMetalMat: THREE.MeshStandardMaterial; // #7b8290
  bowstringCyanMat: THREE.MeshBasicMaterial; // #00f5ff
}

let cachedMaterials: BlockyHunterMaterialPalette | null = null;

function getHunterMaterials(tier: number): BlockyHunterMaterialPalette {
  if (!cachedMaterials) {
    cachedMaterials = {
      skinMat: new THREE.MeshLambertMaterial({
        color: 0xc68642,
        flatShading: true,
      }),
      hoodMat: new THREE.MeshLambertMaterial({
        color: 0x32353b,
        flatShading: true,
      }),
      faceMaskMat: new THREE.MeshLambertMaterial({
        color: 0x1f2022,
        flatShading: true,
      }),
      eyesCyanMat: new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 2.5,
        roughness: 0.1,
        metalness: 0.2,
      }),
      bajuDalamMat: new THREE.MeshLambertMaterial({
        color: 0x1f2022,
        flatShading: true,
      }),
      pelvisMat: new THREE.MeshLambertMaterial({
        color: 0x18181b,
        flatShading: true,
      }),
      chestplateMat: new THREE.MeshStandardMaterial({
        color: 0x545860,
        metalness: 0.65,
        roughness: 0.30,
        flatShading: true,
      }),
      chestplateTrimMat: new THREE.MeshStandardMaterial({
        color: 0x7b8290,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      pauldronMat: new THREE.MeshStandardMaterial({
        color: 0x3e4147,
        metalness: 0.60,
        roughness: 0.40,
        flatShading: true,
      }),
      beltMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      buckleMat: new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.85,
        roughness: 0.20,
        flatShading: true,
      }),
      pouchMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      bootsMat: new THREE.MeshStandardMaterial({
        color: 0x301c10,
        roughness: 0.60,
        metalness: 0.20,
        flatShading: true,
      }),
      shinGuardMat: new THREE.MeshStandardMaterial({
        color: 0x545860,
        metalness: 0.75,
        roughness: 0.30,
        flatShading: true,
      }),
      soleMat: new THREE.MeshLambertMaterial({
        color: 0x18181b,
        flatShading: true,
      }),
      capeMat: new THREE.MeshLambertMaterial({
        color: 0x26282c,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      quiverMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      arrowMat: new THREE.MeshStandardMaterial({
        color: 0x7b8290,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      arrowShaftMat: new THREE.MeshLambertMaterial({
        color: 0x4a2e18,
        flatShading: true,
      }),
      daggerBladeMat: new THREE.MeshStandardMaterial({
        color: 0x545860,
        metalness: 0.80,
        roughness: 0.25,
        flatShading: true,
      }),
      daggerCyanEdgeMat: new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 2.0,
        roughness: 0.1,
        metalness: 0.25,
      }),
      daggerGripMat: new THREE.MeshLambertMaterial({
        color: 0x18181b,
        flatShading: true,
      }),
      daggerGuardMat: new THREE.MeshStandardMaterial({
        color: 0x7b8290,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      sheathMat: new THREE.MeshLambertMaterial({
        color: 0x18181b,
        flatShading: true,
      }),
      bowWoodMat: new THREE.MeshStandardMaterial({
        color: 0x4a2e18,
        roughness: 0.60,
        metalness: 0.15,
        flatShading: true,
      }),
      bowMetalMat: new THREE.MeshStandardMaterial({
        color: 0x7b8290,
        metalness: 0.80,
        roughness: 0.30,
        flatShading: true,
      }),
      bowstringCyanMat: new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
      }),
    };
  }

  if (tier >= 3) {
    cachedMaterials.chestplateMat.emissive.setHex(0x003344);
    cachedMaterials.chestplateMat.emissiveIntensity = 0.35;
    cachedMaterials.daggerCyanEdgeMat.emissiveIntensity = 2.4;
    cachedMaterials.eyesCyanMat.emissiveIntensity = 3.0;
  } else {
    cachedMaterials.chestplateMat.emissive.setHex(0x000000);
    cachedMaterials.chestplateMat.emissiveIntensity = 0;
    cachedMaterials.daggerCyanEdgeMat.emissiveIntensity = 2.0;
    cachedMaterials.eyesCyanMat.emissiveIntensity = 2.5;
  }

  return cachedMaterials;
}

// ----------------------------------------------------------------------------
// Preloaded Geometries Cache
// ----------------------------------------------------------------------------
interface BlockyHunterGeometryPalette {
  pelvisGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  pouchGeo: THREE.BufferGeometry;
  crossStrapGeo: THREE.BufferGeometry;
  torsoGeo: THREE.BufferGeometry;
  chestplateGeo: THREE.BufferGeometry;
  chestplateTrimTopGeo: THREE.BufferGeometry;
  chestplateTrimVertGeo: THREE.BufferGeometry;
  pauldronGeo: THREE.BufferGeometry;
  thighGeo: THREE.BufferGeometry;
  bootGeo: THREE.BufferGeometry;
  shinGuardGeo: THREE.BufferGeometry;
  soleGeo: THREE.BufferGeometry;
  headGeo: THREE.BufferGeometry;
  faceMaskGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  hoodRoofGeo: THREE.BufferGeometry;
  hoodVisorGeo: THREE.BufferGeometry;
  hoodSideGeo: THREE.BufferGeometry;
  hoodBackGeo: THREE.BufferGeometry;
  capeMainGeo: THREE.BufferGeometry;
  capeFringe1Geo: THREE.BufferGeometry;
  capeFringe2Geo: THREE.BufferGeometry;
  capeFringe3Geo: THREE.BufferGeometry;
  armUpperGeo: THREE.BufferGeometry;
  forearmGeo: THREE.BufferGeometry;
  bracerGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  daggerGripGeo: THREE.BufferGeometry;
  daggerGuardGeo: THREE.BufferGeometry;
  daggerBladeGeo: THREE.BufferGeometry;
  daggerEdgeGeo: THREE.BufferGeometry;
  daggerTipGeo: THREE.BufferGeometry;
  sheathGeo: THREE.BufferGeometry;
  sheathBandGeo: THREE.BufferGeometry;
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
    // 1. Pelvis & Sabuk (Penyambung Tubuh & Kaki)
    const pelvisGeo = new THREE.BoxGeometry(0.9, 0.35, 0.6);
    const beltGeo = new THREE.BoxGeometry(0.95, 0.22, 0.65);
    const buckleGeo = new THREE.BoxGeometry(0.24, 0.24, 0.68);
    const pouchGeo = new THREE.BoxGeometry(0.18, 0.22, 0.14);
    const crossStrapGeo = new THREE.BoxGeometry(0.14, 0.95, 0.05);

    // 2. Kaki & Sepatu Bot
    const thighGeo = new THREE.BoxGeometry(0.38, 0.85, 0.42);
    const bootGeo = new THREE.BoxGeometry(0.42, 0.45, 0.52);
    const shinGuardGeo = new THREE.BoxGeometry(0.34, 0.40, 0.10);
    const soleGeo = new THREE.BoxGeometry(0.44, 0.06, 0.54);

    // 3. Torso & Zirah Dada
    const torsoGeo = new THREE.BoxGeometry(0.92, 0.68, 0.55);
    const chestplateGeo = new THREE.BoxGeometry(1.05, 0.70, 0.15);
    const chestplateTrimTopGeo = new THREE.BoxGeometry(1.07, 0.08, 0.17);
    const chestplateTrimVertGeo = new THREE.BoxGeometry(0.12, 0.72, 0.17);
    const pauldronGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);

    // 4. Kepala, Masker Padat & Tudung
    const headGeo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
    const faceMaskGeo = new THREE.BoxGeometry(0.78, 0.38, 0.30);
    const eyeGeo = new THREE.BoxGeometry(0.16, 0.08, 0.05);
    const hoodRoofGeo = new THREE.BoxGeometry(0.95, 0.25, 0.95);
    const hoodVisorGeo = new THREE.BoxGeometry(0.85, 0.12, 0.25);
    const hoodSideGeo = new THREE.BoxGeometry(0.18, 0.85, 0.92);
    const hoodBackGeo = new THREE.BoxGeometry(0.95, 0.85, 0.18);

    // 5. Jubah Bergerigi Tangga (Stair-Case Cape)
    const capeMainGeo = new THREE.BoxGeometry(1.1, 1.4, 0.08);
    const capeFringe1Geo = new THREE.BoxGeometry(0.28, 0.25, 0.08);
    const capeFringe2Geo = new THREE.BoxGeometry(0.24, 0.35, 0.08);
    const capeFringe3Geo = new THREE.BoxGeometry(0.28, 0.20, 0.08);

    // 6. Lengan & Tangan
    const armUpperGeo = new THREE.BoxGeometry(0.32, 0.55, 0.32);
    const forearmGeo = new THREE.BoxGeometry(0.28, 0.50, 0.28);
    const bracerGeo = new THREE.BoxGeometry(0.30, 0.32, 0.10);
    const handGeo = new THREE.BoxGeometry(0.24, 0.22, 0.24);

    // 7. Belati & Sarung Pinggul
    const daggerGripGeo = new THREE.BoxGeometry(0.07, 0.28, 0.07);
    const daggerGuardGeo = new THREE.BoxGeometry(0.24, 0.05, 0.08);
    const daggerBladeGeo = new THREE.BoxGeometry(0.14, 0.75, 0.035);
    const daggerEdgeGeo = new THREE.BoxGeometry(0.018, 0.75, 0.04);
    const daggerTipGeo = new THREE.ConeGeometry(0.07, 0.18, 4);
    daggerTipGeo.rotateY(Math.PI / 4);

    const sheathGeo = new THREE.BoxGeometry(0.16, 0.65, 0.12);
    const sheathBandGeo = new THREE.BoxGeometry(0.18, 0.06, 0.14);

    // 8. Busur & Tabung Panah (Quiver)
    const bowHandleGeo = new THREE.BoxGeometry(0.10, 0.55, 0.10);
    const bowLimbGeo = new THREE.BoxGeometry(0.08, 0.50, 0.08);
    const bowTipGeo = new THREE.BoxGeometry(0.07, 0.35, 0.07);
    const bowstringGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.85, 4);

    const quiverGeo = new THREE.BoxGeometry(0.28, 0.95, 0.28);
    const quiverBandGeo = new THREE.BoxGeometry(0.30, 0.08, 0.30);
    const arrowShaftGeo = new THREE.CylinderGeometry(0.014, 0.014, 1.15, 4);
    const arrowFletchGeo = new THREE.BoxGeometry(0.10, 0.22, 0.02);
    const arrowTipGeo = new THREE.ConeGeometry(0.03, 0.12, 4);

    cachedGeometries = {
      pelvisGeo,
      beltGeo,
      buckleGeo,
      pouchGeo,
      crossStrapGeo,
      torsoGeo,
      chestplateGeo,
      chestplateTrimTopGeo,
      chestplateTrimVertGeo,
      pauldronGeo,
      thighGeo,
      bootGeo,
      shinGuardGeo,
      soleGeo,
      headGeo,
      faceMaskGeo,
      eyeGeo,
      hoodRoofGeo,
      hoodVisorGeo,
      hoodSideGeo,
      hoodBackGeo,
      capeMainGeo,
      capeFringe1Geo,
      capeFringe2Geo,
      capeFringe3Geo,
      armUpperGeo,
      forearmGeo,
      bracerGeo,
      handGeo,
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
 * Memperbaiki 4 bug fatal:
 * 1. Pelvis solid [0.9, 0.35, 0.6] di Y: 0.95 menyambung torso ke pangkal kaki (Y: 0.85).
 * 2. Kepala inti + Masker solid [0.78, 0.38, 0.3] di Y: 1.82 + Mata cyan + Tudung padat.
 * 3. Jubah bergerigi tangga [1.1, 1.4, 0.08] di Y: 1.15 Z: -0.42 menempel di punggung.
 * 4. Zirah dada kontras baja [1.05, 0.7, 0.15] di Y: 1.45 Z: 0.35 di atas baju dalam hitam.
 */
export function createBlockyHunterMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'rogue';

  const mats = getHunterMaterials(tier);
  const geos = getHunterGeometries();

  // --------------------------------------------------------------------------
  // 1. ROOT PELVIS & SABUK PINGGUL (MENGHILANGKAN CELAH MELAYANG)
  // --------------------------------------------------------------------------
  // Balok pinggul/pelvis penyambung tubuh ke kaki pada posisi Y: 0.95
  const pelvis = new THREE.Mesh(geos.pelvisGeo, mats.pelvisMat);
  pelvis.position.set(0, 0.95, 0);
  pelvis.castShadow = true;
  group.add(pelvis);

  // Sabuk kulit cokelat melingkar di sekeliling pelvis
  const belt = new THREE.Mesh(geos.beltGeo, mats.beltMat);
  belt.position.set(0, 0.95, 0);
  belt.castShadow = true;
  group.add(belt);

  // Kepala sabuk perak persegi di depan
  const buckle = new THREE.Mesh(geos.buckleGeo, mats.buckleMat);
  buckle.position.set(0, 0.95, 0.02);
  buckle.castShadow = true;
  group.add(buckle);

  // Kantong amunisi kecil di depan sabuk
  [-0.26, 0.26].forEach((posX) => {
    const pouch = new THREE.Mesh(geos.pouchGeo, mats.pouchMat);
    pouch.position.set(posX, 0.95, 0.34);
    pouch.castShadow = true;
    group.add(pouch);
  });

  // --------------------------------------------------------------------------
  // 2. TORSO, ZIRAH DADA KONTRAS & SELEMPANG
  // --------------------------------------------------------------------------
  // Baju dalam hitam (#1f2022) menempel pas di atas pelvis
  const body = new THREE.Mesh(geos.torsoGeo, mats.bajuDalamMat);
  body.position.set(0, 1.45, 0);
  body.castShadow = true;
  group.add(body);

  // Plat Zirah Dada Abu-abu Baja Kontras (#545860) di bagian depan torso (Y: 1.45, Z: 0.35)
  const chestplate = new THREE.Mesh(geos.chestplateGeo, mats.chestplateMat);
  chestplate.position.set(0, 1.45, 0.35);
  chestplate.castShadow = true;
  group.add(chestplate);

  // Lis aksen strip logam perak (#7b8290)
  const chestTrimTop = new THREE.Mesh(geos.chestplateTrimTopGeo, mats.chestplateTrimMat);
  chestTrimTop.position.set(0, 1.76, 0.36);
  chestTrimTop.castShadow = true;
  group.add(chestTrimTop);

  const chestTrimVert = new THREE.Mesh(geos.chestplateTrimVertGeo, mats.chestplateTrimMat);
  chestTrimVert.position.set(0, 1.45, 0.365);
  chestTrimVert.castShadow = true;
  group.add(chestTrimVert);

  // Selempang diagonal kulit cokelat (#4a2e18)
  const crossStrap = new THREE.Mesh(geos.crossStrapGeo, mats.beltMat);
  crossStrap.position.set(0, 1.45, 0.38);
  crossStrap.rotation.z = -0.52;
  crossStrap.castShadow = true;
  group.add(crossStrap);

  // --------------------------------------------------------------------------
  // 3. JUBAH BERGERIGI TANGGA (STAIR-CASE CAPE) DI PUNGGUNG
  // --------------------------------------------------------------------------
  // Lembaran jubah utama BoxGeometry(1.1, 1.4, 0.08) di posisi (0, 1.15, -0.42)
  const cape = new THREE.Mesh(geos.capeMainGeo, mats.capeMat);
  cape.position.set(0, 1.15, -0.42);
  cape.rotation.x = -0.15; // Melambai lembut ke belakang 8-9 derajat
  cape.castShadow = true;

  // 3 Gerigi bawah kaku asimetris di ujung bawah jubah (Y: 0.4 world)
  const fringe1 = new THREE.Mesh(geos.capeFringe1Geo, mats.capeMat);
  fringe1.position.set(-0.35, 0.35 - 1.15, -0.48 - (-0.42)); // World: [-0.35, 0.35, -0.48]
  fringe1.castShadow = true;
  cape.add(fringe1);

  const fringe2 = new THREE.Mesh(geos.capeFringe2Geo, mats.capeMat);
  fringe2.position.set(0.0, 0.30 - 1.15, -0.48 - (-0.42)); // World: [0.0, 0.30, -0.48]
  fringe2.castShadow = true;
  cape.add(fringe2);

  const fringe3 = new THREE.Mesh(geos.capeFringe3Geo, mats.capeMat);
  fringe3.position.set(0.35, 0.38 - 1.15, -0.48 - (-0.42)); // World: [0.35, 0.38, -0.48]
  fringe3.castShadow = true;
  cape.add(fringe3);

  group.add(cape);

  // --------------------------------------------------------------------------
  // 4. ANATOMI KEPALA, TUDUNG & MASKER PADAT (SOLID, TIDAK BERLUBANG)
  // --------------------------------------------------------------------------
  // Kepala Inti (Head Base) BoxGeometry(0.75, 0.75, 0.75) kulit (#c68642) di [0, 1.95, 0]
  const head = new THREE.Mesh(geos.headGeo, mats.skinMat);
  head.position.set(0, 1.95, 0);
  head.castShadow = true;
  group.add(head);

  // Masker Wajah Solid [0.78, 0.38, 0.3] di [0, 1.82, 0.26] warna #1f2022
  const faceMask = new THREE.Mesh(geos.faceMaskGeo, mats.faceMaskMat);
  faceMask.position.set(0, 1.82, 0.26);
  faceMask.castShadow = true;
  group.add(faceMask);

  // Mata Bercahaya Cyan [0.16, 0.08, 0.05] di atas masker (emissiveIntensity: 2.5)
  const leftEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanMat);
  leftEye.position.set(-0.18, 2.02, 0.39);

  const rightEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanMat);
  rightEye.position.set(0.18, 2.02, 0.39);
  group.add(leftEye, rightEye);

  // Tudung Rogue Menyelimuti Kepala (Medium Grey #32353b):
  // Atap Tudung: BoxGeometry(0.95, 0.25, 0.95) miring ke depan di [0, 2.35, 0]
  const hoodRoof = new THREE.Mesh(geos.hoodRoofGeo, mats.hoodMat);
  hoodRoof.position.set(0, 2.35, 0);
  hoodRoof.rotation.x = 0.10;
  hoodRoof.castShadow = true;
  group.add(hoodRoof);

  // Paruh dahi pelindung (Visor)
  const hoodVisor = new THREE.Mesh(geos.hoodVisorGeo, mats.hoodMat);
  hoodVisor.position.set(0, 2.31, 0.44);
  hoodVisor.rotation.x = 0.18;
  hoodVisor.castShadow = true;
  group.add(hoodVisor);

  // Sisi Kiri & Kanan Tudung [0.18, 0.85, 0.92]
  const hoodLeft = new THREE.Mesh(geos.hoodSideGeo, mats.hoodMat);
  hoodLeft.position.set(-0.42, 1.95, 0);
  hoodLeft.castShadow = true;

  const hoodRight = new THREE.Mesh(geos.hoodSideGeo, mats.hoodMat);
  hoodRight.position.set(0.42, 1.95, 0);
  hoodRight.castShadow = true;
  group.add(hoodLeft, hoodRight);

  // Belakang Tudung [0.95, 0.85, 0.18] di [0, 1.95, -0.40]
  const hoodBack = new THREE.Mesh(geos.hoodBackGeo, mats.hoodMat);
  hoodBack.position.set(0, 1.95, -0.40);
  hoodBack.castShadow = true;
  group.add(hoodBack);

  // --------------------------------------------------------------------------
  // 5. PANGKAL KAKI & SEPATU BOT (TERHUBUNG KE BAWAH PELVIS Y: 0.85)
  // --------------------------------------------------------------------------
  const buildHunterLeg = (sign: number) => {
    // Pivot kaki tepat di bawah pelvis (Y: 0.85)
    const legGroup = new THREE.Group();
    legGroup.position.set(sign * 0.24, 0.85, 0);

    // Kaki [0.38, 0.85, 0.42], posisi relatif y = -0.40 (world center y = 0.45)
    const thigh = new THREE.Mesh(geos.thighGeo, mats.pelvisMat);
    thigh.position.set(0, -0.40, 0);
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Sepatu bot cokelat gelap [0.42, 0.45, 0.52] di bawah kaki
    const boot = new THREE.Mesh(geos.bootGeo, mats.bootsMat);
    boot.position.set(0, -0.63, 0.04);
    boot.castShadow = true;
    legGroup.add(boot);

    // Pelindung tulang kering baja (#545860)
    const shinGuard = new THREE.Mesh(geos.shinGuardGeo, mats.shinGuardMat);
    shinGuard.position.set(0, -0.55, 0.22);
    shinGuard.castShadow = true;
    legGroup.add(shinGuard);

    // Sol sepatu gelap menapak tanah (Y: 0.0)
    const sole = new THREE.Mesh(geos.soleGeo, mats.soleMat);
    sole.position.set(0, -0.84, 0.04);
    sole.receiveShadow = true;
    legGroup.add(sole);

    group.add(legGroup);
    return legGroup;
  };

  const leftLeg = buildHunterLeg(-1); // Kiri [-0.24, 0.85, 0]
  const rightLeg = buildHunterLeg(1);  // Kanan [0.24, 0.85, 0]

  // --------------------------------------------------------------------------
  // 6. PAULDRON BAHU BERCORAK BAJA (#3e4147)
  // --------------------------------------------------------------------------
  const pauldronLeft = new THREE.Mesh(geos.pauldronGeo, mats.pauldronMat);
  pauldronLeft.position.set(-0.52, 1.70, 0);
  pauldronLeft.rotation.z = 0.20;
  pauldronLeft.castShadow = true;

  const pauldronRight = new THREE.Mesh(geos.pauldronGeo, mats.pauldronMat);
  pauldronRight.position.set(0.52, 1.70, 0);
  pauldronRight.rotation.z = -0.20;
  pauldronRight.castShadow = true;
  group.add(pauldronLeft, pauldronRight);

  // --------------------------------------------------------------------------
  // 7. LENGAN, SENDI SIKU ALAMI & TANGAN
  // --------------------------------------------------------------------------
  const buildHunterArm = (isLeft: boolean) => {
    const sign = isLeft ? -1 : 1;

    // Sendi bahu
    const armGroup = new THREE.Group();
    armGroup.position.set(sign * 0.50, 1.68, 0);
    armGroup.rotation.z = sign * 0.17; // Miring sedikit ke luar
    armGroup.rotation.x = -0.10;

    const upperArm = new THREE.Mesh(geos.armUpperGeo, mats.bajuDalamMat);
    upperArm.position.y = -0.275;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    // Sendi siku (Forearm Pivot)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.55, 0);
    forearmGroup.rotation.x = -0.20; // Menekuk ke depan
    forearmGroup.rotation.z = -sign * 0.26; // Menekuk ke dalam

    const forearm = new THREE.Mesh(geos.forearmGeo, mats.bajuDalamMat);
    forearm.position.y = -0.25;
    forearm.castShadow = true;
    forearmGroup.add(forearm);

    // Bracer baja di lengan bawah
    const bracer = new THREE.Mesh(geos.bracerGeo, mats.chestplateMat);
    bracer.position.set(sign * 0.12, -0.25, 0.06);
    bracer.castShadow = true;
    forearmGroup.add(bracer);

    // Telapak tangan
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.50, 0);

    const hand = new THREE.Mesh(geos.handGeo, mats.skinMat);
    hand.position.y = -0.10;
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
  // 8. SARUNG BELATI PINGGUL GANDA (DUAL HIP DAGGER SHEATHS)
  // --------------------------------------------------------------------------
  const sheathedDaggers = new THREE.Group();

  const buildHipSheath = (sign: number) => {
    const sheathAnchor = new THREE.Group();
    sheathAnchor.position.set(sign * 0.48, 0.95, 0.05);
    sheathAnchor.rotation.set(0.18, 0, -sign * 0.28);

    const holster = new THREE.Mesh(geos.sheathGeo, mats.sheathMat);
    holster.castShadow = true;
    sheathAnchor.add(holster);

    const band = new THREE.Mesh(geos.sheathBandGeo, mats.buckleMat);
    band.position.y = 0.22;
    sheathAnchor.add(band);

    const hiltGroup = new THREE.Group();
    hiltGroup.position.set(0, 0.35, 0);

    const grip = new THREE.Mesh(geos.daggerGripGeo, mats.daggerGripMat);
    grip.castShadow = true;
    hiltGroup.add(grip);

    const guard = new THREE.Mesh(geos.daggerGuardGeo, mats.daggerGuardMat);
    guard.position.y = -0.12;
    guard.castShadow = true;
    hiltGroup.add(guard);

    sheathAnchor.add(hiltGroup);
    sheathedDaggers.add(hiltGroup);
    group.add(sheathAnchor);
  };

  buildHipSheath(-1);
  buildHipSheath(1);
  sheathedDaggers.visible = false; // Awalnya dipegang di tangan

  // --------------------------------------------------------------------------
  // 9. SEPASANG BELATI BAJA (STEEL DAGGERS) DI TANGAN
  // --------------------------------------------------------------------------
  const buildDagger = () => {
    const daggerGroup = new THREE.Group();

    const grip = new THREE.Mesh(geos.daggerGripGeo, mats.daggerGripMat);
    grip.castShadow = true;
    daggerGroup.add(grip);

    const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.09), mats.daggerGuardMat);
    pommel.position.y = -0.14;
    daggerGroup.add(pommel);

    const guard = new THREE.Mesh(geos.daggerGuardGeo, mats.daggerGuardMat);
    guard.position.y = 0.14;
    guard.castShadow = true;
    daggerGroup.add(guard);

    const blade = new THREE.Mesh(geos.daggerBladeGeo, mats.daggerBladeMat);
    blade.position.y = 0.14 + 0.375;
    blade.castShadow = true;
    daggerGroup.add(blade);

    const edgeLeft = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeLeft.position.set(-0.065, 0.14 + 0.375, 0);
    const edgeRight = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeRight.position.set(0.065, 0.14 + 0.375, 0);
    daggerGroup.add(edgeLeft, edgeRight);

    const tip = new THREE.Mesh(geos.daggerTipGeo, mats.daggerBladeMat);
    tip.position.y = 0.14 + 0.75 + 0.07;
    tip.castShadow = true;
    daggerGroup.add(tip);

    const tipCyan = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.10, 4), mats.daggerCyanEdgeMat);
    tipCyan.position.y = 0.14 + 0.75 + 0.03;
    tipCyan.rotateY(Math.PI / 4);
    daggerGroup.add(tipCyan);

    return daggerGroup;
  };

  const weapon = new THREE.Group();
  const daggerRight = buildDagger();
  weapon.add(daggerRight);
  weapon.position.set(0, -0.10, 0.05);
  weapon.rotation.set(Math.PI / 2.3, 0.12, 0);
  rightHand.add(weapon);

  const leftWeapon = new THREE.Group();
  const daggerLeft = buildDagger();
  leftWeapon.add(daggerLeft);
  leftWeapon.position.set(0, -0.10, 0.05);
  leftWeapon.rotation.set(Math.PI / 2.3, -0.12, 0);
  leftHand.add(leftWeapon);

  // --------------------------------------------------------------------------
  // 10. BUSUR 5-SEGMEN DI TANGAN KIRI & QUIVER DI PUNGGUNG KANAN ATAS
  // --------------------------------------------------------------------------
  const buildAngularRecurveBow = () => {
    const bowGroup = new THREE.Group();

    const handle = new THREE.Mesh(geos.bowHandleGeo, mats.bowWoodMat);
    handle.castShadow = true;
    bowGroup.add(handle);

    const handleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), mats.bowMetalMat);
    bowGroup.add(handleGrip);

    const upperLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    upperLimb.position.set(0, 0.44, 0.10);
    upperLimb.rotation.x = 0.52;
    upperLimb.castShadow = true;
    bowGroup.add(upperLimb);

    const upperTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    upperTip.position.set(0, 0.80, -0.03);
    upperTip.rotation.x = -0.52;
    upperTip.castShadow = true;
    bowGroup.add(upperTip);

    const lowerLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    lowerLimb.position.set(0, -0.44, 0.10);
    lowerLimb.rotation.x = -0.52;
    lowerLimb.castShadow = true;
    bowGroup.add(lowerLimb);

    const lowerTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    lowerTip.position.set(0, -0.80, -0.03);
    lowerTip.rotation.x = 0.52;
    lowerTip.castShadow = true;
    bowGroup.add(lowerTip);

    const bowstring = new THREE.Mesh(geos.bowstringGeo, mats.bowstringCyanMat);
    bowstring.position.set(0, 0, -0.16);
    bowGroup.add(bowstring);

    return bowGroup;
  };

  const hunterBow = buildAngularRecurveBow();
  hunterBow.position.set(0, -0.10, 0.05);
  hunterBow.rotation.set(0, 0, 0); // Tegak lurus di telapak tangan kiri
  hunterBow.visible = false;
  leftHand.add(hunterBow);

  const hunterBowStowed = buildAngularRecurveBow();
  hunterBowStowed.position.set(0.04, 1.35, -0.45);
  hunterBowStowed.rotation.set(0.12, 0, 0.65);
  hunterBowStowed.visible = true;
  group.add(hunterBowStowed);

  // Tabung Panah (Quiver) BoxGeometry(0.28, 0.95, 0.28) miring 35° di punggung kanan atas (Z: -0.48)
  const hunterQuiver = new THREE.Group();
  hunterQuiver.position.set(-0.24, 1.55, -0.48);
  hunterQuiver.rotation.set(0.10, -0.08, -0.61);

  const quiverTube = new THREE.Mesh(geos.quiverGeo, mats.quiverMat);
  quiverTube.castShadow = true;
  hunterQuiver.add(quiverTube);

  const quiverBand = new THREE.Mesh(geos.quiverBandGeo, mats.buckleMat);
  quiverBand.position.y = 0.32;
  hunterQuiver.add(quiverBand);

  // 4 Anak panah mencuat ke atas
  const arrowOffsets = [
    { x: -0.05, z: -0.05, rot: 0.04 },
    { x: 0.05, z: -0.05, rot: -0.05 },
    { x: -0.04, z: 0.05, rot: -0.03 },
    { x: 0.04, z: 0.05, rot: 0.06 },
  ];

  arrowOffsets.forEach((off) => {
    const arrow = new THREE.Group();
    arrow.position.set(off.x, 0.50, off.z);
    arrow.rotation.z = off.rot;

    const shaft = new THREE.Mesh(geos.arrowShaftGeo, mats.arrowShaftMat);
    arrow.add(shaft);

    const fletchX = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowMat);
    fletchX.position.y = 0.45;
    const fletchZ = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowMat);
    fletchZ.position.y = 0.45;
    fletchZ.rotation.y = Math.PI / 2;
    arrow.add(fletchX, fletchZ);

    const headArrow = new THREE.Mesh(geos.arrowTipGeo, mats.arrowMat);
    headArrow.position.y = -0.55;
    arrow.add(headArrow);

    hunterQuiver.add(arrow);
  });

  group.add(hunterQuiver);

  // --------------------------------------------------------------------------
  // 11. SISTEM TRANSISI SENJATA (DYNAMIC STANCE SWAPPING)
  // --------------------------------------------------------------------------
  let hunterWeaponMode: 'dagger' | 'bow' = 'dagger';

  const setHunterWeaponMode = (mode: 'dagger' | 'bow') => {
    hunterWeaponMode = mode;
    if (mode === 'bow') {
      daggerRight.visible = false;
      daggerLeft.visible = false;
      hunterBow.visible = true;
      hunterBowStowed.visible = false;
      sheathedDaggers.visible = true;
    } else {
      daggerRight.visible = true;
      daggerLeft.visible = true;
      hunterBow.visible = false;
      hunterBowStowed.visible = true;
      sheathedDaggers.visible = false;
    }
  };

  // --------------------------------------------------------------------------
  // 12. TIER 3+ EFEK EMISI & SHURIKEN PHANTOM
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
        emissiveIntensity: 1.6,
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

  (result as any).rightForearm = rightForearm;
  (result as any).pelvis = pelvis;
  (result as any).chestplate = chestplate;
  (result as any).faceMask = faceMask;

  return result;
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
  hunterWeaponMode: 'dagger' | 'bow' = 'dagger'
): void {
  const isBow = hunterWeaponMode === 'bow';
  const leftForearm = playerMesh.leftForearm;
  const rightForearm = (playerMesh as any).rightForearm as THREE.Group | undefined;

  if (isMoving) {
    const legSwing = Math.sin(walkTime * 1.2) * 0.52;
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, legSwing, 0.25);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, -legSwing, 0.25);

    if (!isAttacking) {
      if (isBow) {
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

    // Kibasan jubah ke belakang
    playerMesh.cape.rotation.x = -0.15 - Math.abs(Math.sin(walkTime * 1.2)) * 0.20;

    const walkBob = Math.abs(Math.sin(walkTime * 2.4)) * 0.04;
    playerMesh.group.position.y = playerPosY + walkBob;
    playerMesh.group.rotation.z = Math.sin(walkTime * 1.2) * 0.025;
  } else {
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, 0.2);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, 0.2);
    playerMesh.group.rotation.z = THREE.MathUtils.lerp(playerMesh.group.rotation.z, 0, 0.2);

    const breathe = Math.sin(walkTime * 2.2) * 0.015;
    playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.45 + breathe, 0.15);

    if (!isAttacking) {
      if (isBow) {
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.25, 0.15);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.15, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.15);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, 0.10, 0.15);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, 0, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.15);

        if (leftForearm) {
          leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, -0.20, 0.15);
          leftForearm.rotation.z = THREE.MathUtils.lerp(leftForearm.rotation.z, -0.26, 0.15);
        }
        if (rightForearm) {
          rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, -0.20, 0.15);
          rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.26, 0.15);
        }
      } else {
        playerMesh.leftArm.rotation.x = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.x, -0.20 + breathe * 0.3, 0.15);
        playerMesh.leftArm.rotation.y = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.y, 0.12, 0.15);
        playerMesh.leftArm.rotation.z = THREE.MathUtils.lerp(playerMesh.leftArm.rotation.z, 0.17, 0.15);

        playerMesh.rightArm.rotation.x = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.x, -0.20 - breathe * 0.3, 0.15);
        playerMesh.rightArm.rotation.y = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.y, -0.12, 0.15);
        playerMesh.rightArm.rotation.z = THREE.MathUtils.lerp(playerMesh.rightArm.rotation.z, -0.17, 0.15);

        if (leftForearm) {
          leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, -0.20, 0.15);
          leftForearm.rotation.z = THREE.MathUtils.lerp(leftForearm.rotation.z, -0.26, 0.15);
        }
        if (rightForearm) {
          rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, -0.20, 0.15);
          rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.26, 0.15);
        }
      }
    }

    playerMesh.cape.rotation.x = -0.15 - Math.sin(walkTime * 2.0) * 0.03;
  }
}

/**
 * ============================================================================
 * PREVIEW COMPONENT: HunterModel
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
