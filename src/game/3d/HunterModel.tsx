import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterClass } from '../../types/game';
import { PlayerMeshObjects } from './models';

/**
 * ============================================================================
 * CONFIGURATION & SAFETY ROLLBACK TOGGLE
 * ============================================================================
 */
export const USE_LEGACY_HUNTER = false;
import { createLegacyHunterMesh } from './HunterModelLegacy';
export { createLegacyHunterMesh };

/**
 * ============================================================================
 * PRELOADED MATERIAL PALETTE (Standard Humanoid High-Contrast Palette)
 * ============================================================================
 * - Kulit Kepala & Leher: #c68642
 * - Masker Wajah: #1a1a1d
 * - Mata Cyan Glow Emisi: #00f5ff (emissiveIntensity: 2.5)
 * - Tudung Rogue Ramping: #33363d
 * - Baju Dalam Torso: #1f2022
 * - Zirah Dada Abu-Abu Baja Kontras: #6b7280 (Terlihat jelas, tidak tertutup tudung)
 * - Lis Logam: #9ca3af
 * - Sabuk Kulit Cokelat: #452b19 dengan Gesper Perak #d1d5db
 * - Celana Hitam: #18181b
 * - Sepatu Bot Kulit Cokelat Tua: #2d1b0f
 * - Jubah Belakang: #282a2e
 * - Quiver & Panah: #452b19 & #9ca3af
 * - Belati & Busur: #6b7280 & #00f5ff
 */

interface BlockyHunterMaterialPalette {
  skinMat: THREE.MeshLambertMaterial; // #c68642
  hoodMat: THREE.MeshLambertMaterial; // #33363d
  faceMaskMat: THREE.MeshLambertMaterial; // #1a1a1d
  eyesCyanMat: THREE.MeshStandardMaterial; // #00f5ff + Emissive 2.5
  bajuDalamMat: THREE.MeshLambertMaterial; // #1f2022
  chestplateMat: THREE.MeshStandardMaterial; // #6b7280
  chestplateTrimMat: THREE.MeshStandardMaterial; // #9ca3af
  pauldronMat: THREE.MeshStandardMaterial; // #3e4147
  beltMat: THREE.MeshLambertMaterial; // #452b19
  buckleMat: THREE.MeshStandardMaterial; // #d1d5db
  pantsMat: THREE.MeshLambertMaterial; // #18181b
  bootsMat: THREE.MeshStandardMaterial; // #2d1b0f
  capeMat: THREE.MeshLambertMaterial; // #282a2e
  quiverMat: THREE.MeshLambertMaterial; // #452b19
  arrowMat: THREE.MeshStandardMaterial; // #9ca3af
  arrowShaftMat: THREE.MeshLambertMaterial; // #452b19
  daggerBladeMat: THREE.MeshStandardMaterial; // #6b7280
  daggerCyanEdgeMat: THREE.MeshStandardMaterial; // #00f5ff + Emissive 2.0
  daggerGripMat: THREE.MeshLambertMaterial; // #1a1a1d
  daggerGuardMat: THREE.MeshStandardMaterial; // #9ca3af
  sheathMat: THREE.MeshLambertMaterial; // #1a1a1d
  bowWoodMat: THREE.MeshStandardMaterial; // #452b19
  bowMetalMat: THREE.MeshStandardMaterial; // #9ca3af
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
        color: 0x33363d,
        flatShading: true,
      }),
      faceMaskMat: new THREE.MeshLambertMaterial({
        color: 0x1a1a1d,
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
      chestplateMat: new THREE.MeshStandardMaterial({
        color: 0x6b7280,
        metalness: 0.65,
        roughness: 0.30,
        flatShading: true,
      }),
      chestplateTrimMat: new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        metalness: 0.85,
        roughness: 0.20,
        flatShading: true,
      }),
      pauldronMat: new THREE.MeshStandardMaterial({
        color: 0x3e4147,
        metalness: 0.60,
        roughness: 0.40,
        flatShading: true,
      }),
      beltMat: new THREE.MeshLambertMaterial({
        color: 0x452b19,
        flatShading: true,
      }),
      buckleMat: new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.85,
        roughness: 0.20,
        flatShading: true,
      }),
      pantsMat: new THREE.MeshLambertMaterial({
        color: 0x18181b,
        flatShading: true,
      }),
      bootsMat: new THREE.MeshStandardMaterial({
        color: 0x2d1b0f,
        roughness: 0.60,
        metalness: 0.20,
        flatShading: true,
      }),
      capeMat: new THREE.MeshLambertMaterial({
        color: 0x282a2e,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      quiverMat: new THREE.MeshLambertMaterial({
        color: 0x452b19,
        flatShading: true,
      }),
      arrowMat: new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      arrowShaftMat: new THREE.MeshLambertMaterial({
        color: 0x452b19,
        flatShading: true,
      }),
      daggerBladeMat: new THREE.MeshStandardMaterial({
        color: 0x6b7280,
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
        color: 0x1a1a1d,
        flatShading: true,
      }),
      daggerGuardMat: new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      }),
      sheathMat: new THREE.MeshLambertMaterial({
        color: 0x1a1a1d,
        flatShading: true,
      }),
      bowWoodMat: new THREE.MeshStandardMaterial({
        color: 0x452b19,
        roughness: 0.60,
        metalness: 0.15,
        flatShading: true,
      }),
      bowMetalMat: new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
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
  neckGeo: THREE.BufferGeometry;
  headGeo: THREE.BufferGeometry;
  faceMaskGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  hoodRoofGeo: THREE.BufferGeometry;
  hoodSideGeo: THREE.BufferGeometry;
  hoodBackGeo: THREE.BufferGeometry;
  torsoGeo: THREE.BufferGeometry;
  chestplateGeo: THREE.BufferGeometry;
  chestplateTrimGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  pouchGeo: THREE.BufferGeometry;
  pauldronGeo: THREE.BufferGeometry;
  thighGeo: THREE.BufferGeometry;
  bootGeo: THREE.BufferGeometry;
  capeMainGeo: THREE.BufferGeometry;
  capeFringe1Geo: THREE.BufferGeometry;
  capeFringe2Geo: THREE.BufferGeometry;
  capeFringe3Geo: THREE.BufferGeometry;
  armUpperGeo: THREE.BufferGeometry;
  forearmGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  daggerGripGeo: THREE.BufferGeometry;
  daggerGuardGeo: THREE.BufferGeometry;
  daggerBladeGeo: THREE.BufferGeometry;
  daggerEdgeGeo: THREE.BufferGeometry;
  daggerTipGeo: THREE.BufferGeometry;
  sheathGeo: THREE.BufferGeometry;
  bowHandleGeo: THREE.BufferGeometry;
  bowLimbGeo: THREE.BufferGeometry;
  bowTipGeo: THREE.BufferGeometry;
  bowstringGeo: THREE.BufferGeometry;
  quiverGeo: THREE.BufferGeometry;
  arrowShaftGeo: THREE.BufferGeometry;
  arrowFletchGeo: THREE.BufferGeometry;
  arrowTipGeo: THREE.BufferGeometry;
}

let cachedGeometries: BlockyHunterGeometryPalette | null = null;

function getHunterGeometries(): BlockyHunterGeometryPalette {
  if (!cachedGeometries) {
    // 1. Kepala & Tudung Ramping
    const neckGeo = new THREE.BoxGeometry(0.25, 0.15, 0.25);
    const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const faceMaskGeo = new THREE.BoxGeometry(0.56, 0.22, 0.15);
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.04);
    const hoodRoofGeo = new THREE.BoxGeometry(0.68, 0.15, 0.68);
    const hoodSideGeo = new THREE.BoxGeometry(0.08, 0.55, 0.66);
    const hoodBackGeo = new THREE.BoxGeometry(0.68, 0.55, 0.08);

    // 2. Badan & Zirah Dada Terbuka
    const torsoGeo = new THREE.BoxGeometry(0.75, 0.70, 0.42);
    const chestplateGeo = new THREE.BoxGeometry(0.76, 0.45, 0.12);
    const chestplateTrimGeo = new THREE.BoxGeometry(0.77, 0.06, 0.13);
    const beltGeo = new THREE.BoxGeometry(0.77, 0.14, 0.44);
    const buckleGeo = new THREE.BoxGeometry(0.18, 0.16, 0.46);
    const pouchGeo = new THREE.BoxGeometry(0.14, 0.15, 0.10);
    const pauldronGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);

    // 3. Kaki Proporsional Ramping (Tinggi Kaki 0.80)
    const thighGeo = new THREE.BoxGeometry(0.30, 0.80, 0.32);
    const bootGeo = new THREE.BoxGeometry(0.32, 0.32, 0.38);

    // 4. Jubah Belakang
    const capeMainGeo = new THREE.BoxGeometry(0.72, 1.05, 0.05);
    const capeFringe1Geo = new THREE.BoxGeometry(0.20, 0.18, 0.05);
    const capeFringe2Geo = new THREE.BoxGeometry(0.18, 0.24, 0.05);
    const capeFringe3Geo = new THREE.BoxGeometry(0.20, 0.14, 0.05);

    // 5. Lengan & Tangan
    const armUpperGeo = new THREE.BoxGeometry(0.22, 0.42, 0.22);
    const forearmGeo = new THREE.BoxGeometry(0.18, 0.38, 0.18);
    const handGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);

    // 6. Belati & Sarung Pinggul
    const daggerGripGeo = new THREE.BoxGeometry(0.05, 0.20, 0.05);
    const daggerGuardGeo = new THREE.BoxGeometry(0.18, 0.04, 0.06);
    const daggerBladeGeo = new THREE.BoxGeometry(0.10, 0.55, 0.025);
    const daggerEdgeGeo = new THREE.BoxGeometry(0.014, 0.55, 0.03);
    const daggerTipGeo = new THREE.ConeGeometry(0.05, 0.14, 4);
    daggerTipGeo.rotateY(Math.PI / 4);
    const sheathGeo = new THREE.BoxGeometry(0.12, 0.48, 0.09);

    // 7. Busur & Tabung Panah
    const bowHandleGeo = new THREE.BoxGeometry(0.08, 0.42, 0.08);
    const bowLimbGeo = new THREE.BoxGeometry(0.06, 0.38, 0.06);
    const bowTipGeo = new THREE.BoxGeometry(0.05, 0.28, 0.05);
    const bowstringGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.45, 4);
    const quiverGeo = new THREE.BoxGeometry(0.20, 0.70, 0.20);
    const arrowShaftGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.85, 4);
    const arrowFletchGeo = new THREE.BoxGeometry(0.08, 0.18, 0.015);
    const arrowTipGeo = new THREE.ConeGeometry(0.025, 0.10, 4);

    cachedGeometries = {
      neckGeo,
      headGeo,
      faceMaskGeo,
      eyeGeo,
      hoodRoofGeo,
      hoodSideGeo,
      hoodBackGeo,
      torsoGeo,
      chestplateGeo,
      chestplateTrimGeo,
      beltGeo,
      buckleGeo,
      pouchGeo,
      pauldronGeo,
      thighGeo,
      bootGeo,
      capeMainGeo,
      capeFringe1Geo,
      capeFringe2Geo,
      capeFringe3Geo,
      armUpperGeo,
      forearmGeo,
      handGeo,
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
      arrowShaftGeo,
      arrowFletchGeo,
      arrowTipGeo,
    };
  }

  return cachedGeometries;
}

/**
 * ============================================================================
 * MAIN BUILDER: createBlockyHunterMesh (Standar Humanoid 2.05 unit)
 * ============================================================================
 */
export function createBlockyHunterMesh(tier: number = 1): PlayerMeshObjects {
  const group = new THREE.Group();
  const charClass: CharacterClass = 'rogue';

  const mats = getHunterMaterials(tier);
  const geos = getHunterGeometries();

  // --------------------------------------------------------------------------
  // 1. KAKI PROPORSIONAL (PINGGUL Y = 0.80, PANJANG KAKI RAMPING)
  // --------------------------------------------------------------------------
  const buildHunterLeg = (sign: number) => {
    // Pivot kaki menyatu rapat di bawah sabuk pada Y = 0.80
    const legGroup = new THREE.Group();
    legGroup.position.set(sign * 0.20, 0.80, 0);

    // Paha & Tulang Kering: BoxGeometry(0.30, 0.80, 0.32) posisi [-0.20, 0.40, 0] / [0.20, 0.40, 0]
    const thigh = new THREE.Mesh(geos.thighGeo, mats.pantsMat);
    thigh.position.set(0, -0.40, 0); // World Y = 0.80 - 0.40 = 0.40
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Sepatu Bot: BoxGeometry(0.32, 0.32, 0.38) di ujung bawah kaki (Y = 0.16)
    const boot = new THREE.Mesh(geos.bootGeo, mats.bootsMat);
    boot.position.set(0, -0.64, 0.03); // World Y = 0.80 - 0.64 = 0.16
    boot.castShadow = true;
    legGroup.add(boot);

    group.add(legGroup);
    return legGroup;
  };

  const leftLeg = buildHunterLeg(-1); // Kaki Kiri: [-0.20, 0.40, 0]
  const rightLeg = buildHunterLeg(1);  // Kaki Kanan: [0.20, 0.40, 0]

  // --------------------------------------------------------------------------
  // 2. BADAN UTAMA (TORSO Y = 1.15), ZIRAH DADA TERBUKA & SABUK
  // --------------------------------------------------------------------------
  // Badan Utama: BoxGeometry(0.75, 0.70, 0.42) di posisi Y = 1.15
  const body = new THREE.Mesh(geos.torsoGeo, mats.bajuDalamMat);
  body.position.set(0, 1.15, 0);
  body.castShadow = true;
  group.add(body);

  // Plat Zirah Dada Abu-Abu Baja (Chestplate): BoxGeometry(0.76, 0.45, 0.12) posisi [0, 1.25, 0.20]
  const chestplate = new THREE.Mesh(geos.chestplateGeo, mats.chestplateMat);
  chestplate.position.set(0, 1.25, 0.20);
  chestplate.castShadow = true;
  group.add(chestplate);

  // Lis logam perak di bagian atas zirah dada
  const chestTrim = new THREE.Mesh(geos.chestplateTrimGeo, mats.chestplateTrimMat);
  chestTrim.position.set(0, 1.45, 0.21);
  chestTrim.castShadow = true;
  group.add(chestTrim);

  // Sabuk Kulit Cokelat: BoxGeometry(0.77, 0.14, 0.44) di posisi [0, 0.87, 0]
  const belt = new THREE.Mesh(geos.beltGeo, mats.beltMat);
  belt.position.set(0, 0.87, 0);
  belt.castShadow = true;
  group.add(belt);

  // Kepala sabuk perak
  const buckle = new THREE.Mesh(geos.buckleGeo, mats.buckleMat);
  buckle.position.set(0, 0.87, 0.02);
  buckle.castShadow = true;
  group.add(buckle);

  // 2 Kotak kantong amunisi kecil di depan kanan dan kiri sabuk
  [-0.22, 0.22].forEach((posX) => {
    const pouch = new THREE.Mesh(geos.pouchGeo, mats.beltMat);
    pouch.position.set(posX, 0.87, 0.24);
    pouch.castShadow = true;
    group.add(pouch);
  });

  // --------------------------------------------------------------------------
  // 3. JUBAH BELAKANG BERGERIGI TANGGA (CAPE)
  // --------------------------------------------------------------------------
  // Balok tipis BoxGeometry(0.72, 1.05, 0.05) menempel di punggung: position.set(0, 0.95, -0.24)
  const cape = new THREE.Mesh(geos.capeMainGeo, mats.capeMat);
  cape.position.set(0, 0.95, -0.24);
  cape.rotation.x = -0.14; // Miring ke belakang
  cape.castShadow = true;

  // 3 Balok kecil bergerigi tangga di ujung bawah jubah (Y = 0.40)
  const fringe1 = new THREE.Mesh(geos.capeFringe1Geo, mats.capeMat);
  fringe1.position.set(-0.22, -0.55, -0.01);
  fringe1.castShadow = true;
  cape.add(fringe1);

  const fringe2 = new THREE.Mesh(geos.capeFringe2Geo, mats.capeMat);
  fringe2.position.set(0.0, -0.58, -0.01);
  fringe2.castShadow = true;
  cape.add(fringe2);

  const fringe3 = new THREE.Mesh(geos.capeFringe3Geo, mats.capeMat);
  fringe3.position.set(0.22, -0.53, -0.01);
  fringe3.castShadow = true;
  cape.add(fringe3);

  group.add(cape);

  // --------------------------------------------------------------------------
  // 4. STANDARISASI KEPALA, TUDUNG RAMPING & MASKER (TIDAK MENELAN DADA)
  // --------------------------------------------------------------------------
  // Leher: BoxGeometry(0.25, 0.15, 0.25), posisi Y = 1.45
  const neck = new THREE.Mesh(geos.neckGeo, mats.skinMat);
  neck.position.set(0, 1.45, 0);
  neck.castShadow = true;
  group.add(neck);

  // Kepala Inti (Head Base): BoxGeometry(0.55, 0.55, 0.55) di posisi Y = 1.75
  const head = new THREE.Mesh(geos.headGeo, mats.skinMat);
  head.position.set(0, 1.75, 0);
  head.castShadow = true;
  group.add(head);

  // Masker Wajah (Face Mask): BoxGeometry(0.56, 0.22, 0.15) di posisi [0, 1.66, 0.22]
  const faceMask = new THREE.Mesh(geos.faceMaskGeo, mats.faceMaskMat);
  faceMask.position.set(0, 1.66, 0.22);
  faceMask.castShadow = true;
  group.add(faceMask);

  // Mata Cyan: BoxGeometry(0.12, 0.06, 0.04) di [-0.14, 1.80, 0.28] dan [0.14, 1.80, 0.28]
  const leftEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanMat);
  leftEye.position.set(-0.14, 1.80, 0.28);

  const rightEye = new THREE.Mesh(geos.eyeGeo, mats.eyesCyanMat);
  rightEye.position.set(0.14, 1.80, 0.28);
  group.add(leftEye, rightEye);

  // Tudung Rogue Ramping (Outer Hood):
  // Atap Tudung: BoxGeometry(0.68, 0.15, 0.68) di posisi Y = 2.05 (miring sedikit ke depan 10 derajat)
  const hoodRoof = new THREE.Mesh(geos.hoodRoofGeo, mats.hoodMat);
  hoodRoof.position.set(0, 2.05, 0);
  hoodRoof.rotation.x = 0.17; // 10 derajat
  hoodRoof.castShadow = true;
  group.add(hoodRoof);

  // Sisi Samping Kiri/Kanan: BoxGeometry(0.08, 0.55, 0.66) di [-0.32, 1.78, 0] dan [0.32, 1.78, 0]
  // Berhenti tepat di leher (Y = 1.50), TIDAK diteruskan ke bawah menutupi dada!
  const hoodLeft = new THREE.Mesh(geos.hoodSideGeo, mats.hoodMat);
  hoodLeft.position.set(-0.32, 1.78, 0);
  hoodLeft.castShadow = true;

  const hoodRight = new THREE.Mesh(geos.hoodSideGeo, mats.hoodMat);
  hoodRight.position.set(0.32, 1.78, 0);
  hoodRight.castShadow = true;
  group.add(hoodLeft, hoodRight);

  // Belakang Tudung: BoxGeometry(0.68, 0.55, 0.08) di [0, 1.78, -0.32]
  const hoodBack = new THREE.Mesh(geos.hoodBackGeo, mats.hoodMat);
  hoodBack.position.set(0, 1.78, -0.32);
  hoodBack.castShadow = true;
  group.add(hoodBack);

  // --------------------------------------------------------------------------
  // 5. PAULDRON BAHU BERSUDUT
  // --------------------------------------------------------------------------
  const pauldronLeft = new THREE.Mesh(geos.pauldronGeo, mats.pauldronMat);
  pauldronLeft.position.set(-0.46, 1.45, 0);
  pauldronLeft.rotation.z = 0.20;
  pauldronLeft.castShadow = true;

  const pauldronRight = new THREE.Mesh(geos.pauldronGeo, mats.pauldronMat);
  pauldronRight.position.set(0.46, 1.45, 0);
  pauldronRight.rotation.z = -0.20;
  pauldronRight.castShadow = true;
  group.add(pauldronLeft, pauldronRight);

  // --------------------------------------------------------------------------
  // 6. LENGAN, SENDI SIKU & TANGAN (SETINGGI PINGGANG)
  // --------------------------------------------------------------------------
  const buildHunterArm = (isLeft: boolean) => {
    const sign = isLeft ? -1 : 1;

    // Sendi bahu
    const armGroup = new THREE.Group();
    armGroup.position.set(sign * 0.44, 1.42, 0);
    armGroup.rotation.z = sign * 0.17;
    armGroup.rotation.x = -0.10;

    const upperArm = new THREE.Mesh(geos.armUpperGeo, mats.bajuDalamMat);
    upperArm.position.y = -0.21;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    // Sendi siku (Forearm)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.42, 0);
    forearmGroup.rotation.x = -0.20;
    forearmGroup.rotation.z = -sign * 0.26;

    const forearm = new THREE.Mesh(geos.forearmGeo, mats.bajuDalamMat);
    forearm.position.y = -0.19;
    forearm.castShadow = true;
    forearmGroup.add(forearm);

    // Tangan (setinggi pinggang Y ~ 0.85)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.38, 0);

    const hand = new THREE.Mesh(geos.handGeo, mats.skinMat);
    hand.position.y = -0.08;
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
  // 7. SARUNG BELATI PINGGUL GANDA
  // --------------------------------------------------------------------------
  const sheathedDaggers = new THREE.Group();

  const buildHipSheath = (sign: number) => {
    const sheathAnchor = new THREE.Group();
    sheathAnchor.position.set(sign * 0.40, 0.87, 0.04);
    sheathAnchor.rotation.set(0.18, 0, -sign * 0.28);

    const holster = new THREE.Mesh(geos.sheathGeo, mats.sheathMat);
    holster.castShadow = true;
    sheathAnchor.add(holster);

    const hiltGroup = new THREE.Group();
    hiltGroup.position.set(0, 0.26, 0);

    const grip = new THREE.Mesh(geos.daggerGripGeo, mats.daggerGripMat);
    grip.castShadow = true;
    hiltGroup.add(grip);

    const guard = new THREE.Mesh(geos.daggerGuardGeo, mats.daggerGuardMat);
    guard.position.y = -0.09;
    guard.castShadow = true;
    hiltGroup.add(guard);

    sheathAnchor.add(hiltGroup);
    sheathedDaggers.add(hiltGroup);
    group.add(sheathAnchor);
  };

  buildHipSheath(-1);
  buildHipSheath(1);
  sheathedDaggers.visible = false;

  // --------------------------------------------------------------------------
  // 8. SEPASANG BELATI BAJA DI TANGAN
  // --------------------------------------------------------------------------
  const buildDagger = () => {
    const daggerGroup = new THREE.Group();

    const grip = new THREE.Mesh(geos.daggerGripGeo, mats.daggerGripMat);
    grip.castShadow = true;
    daggerGroup.add(grip);

    const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.07), mats.daggerGuardMat);
    pommel.position.y = -0.10;
    daggerGroup.add(pommel);

    const guard = new THREE.Mesh(geos.daggerGuardGeo, mats.daggerGuardMat);
    guard.position.y = 0.10;
    guard.castShadow = true;
    daggerGroup.add(guard);

    const blade = new THREE.Mesh(geos.daggerBladeGeo, mats.daggerBladeMat);
    blade.position.y = 0.10 + 0.275;
    blade.castShadow = true;
    daggerGroup.add(blade);

    const edgeLeft = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeLeft.position.set(-0.045, 0.10 + 0.275, 0);
    const edgeRight = new THREE.Mesh(geos.daggerEdgeGeo, mats.daggerCyanEdgeMat);
    edgeRight.position.set(0.045, 0.10 + 0.275, 0);
    daggerGroup.add(edgeLeft, edgeRight);

    const tip = new THREE.Mesh(geos.daggerTipGeo, mats.daggerBladeMat);
    tip.position.y = 0.10 + 0.55 + 0.05;
    tip.castShadow = true;
    daggerGroup.add(tip);

    const tipCyan = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.08, 4), mats.daggerCyanEdgeMat);
    tipCyan.position.y = 0.10 + 0.55 + 0.02;
    tipCyan.rotateY(Math.PI / 4);
    daggerGroup.add(tipCyan);

    return daggerGroup;
  };

  const weapon = new THREE.Group();
  const daggerRight = buildDagger();
  weapon.add(daggerRight);
  weapon.position.set(0, -0.08, 0.04);
  weapon.rotation.set(Math.PI / 2.3, 0.12, 0);
  rightHand.add(weapon);

  const leftWeapon = new THREE.Group();
  const daggerLeft = buildDagger();
  leftWeapon.add(daggerLeft);
  leftWeapon.position.set(0, -0.08, 0.04);
  leftWeapon.rotation.set(Math.PI / 2.3, -0.12, 0);
  leftHand.add(leftWeapon);

  // --------------------------------------------------------------------------
  // 9. BUSUR DI TANGAN KIRI & QUIVER DI PUNGGUNG KANAN ATAS
  // --------------------------------------------------------------------------
  const buildAngularRecurveBow = () => {
    const bowGroup = new THREE.Group();

    const handle = new THREE.Mesh(geos.bowHandleGeo, mats.bowWoodMat);
    handle.castShadow = true;
    bowGroup.add(handle);

    const upperLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    upperLimb.position.set(0, 0.35, 0.08);
    upperLimb.rotation.x = 0.52;
    upperLimb.castShadow = true;
    bowGroup.add(upperLimb);

    const upperTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    upperTip.position.set(0, 0.65, -0.02);
    upperTip.rotation.x = -0.52;
    upperTip.castShadow = true;
    bowGroup.add(upperTip);

    const lowerLimb = new THREE.Mesh(geos.bowLimbGeo, mats.bowWoodMat);
    lowerLimb.position.set(0, -0.35, 0.08);
    lowerLimb.rotation.x = -0.52;
    lowerLimb.castShadow = true;
    bowGroup.add(lowerLimb);

    const lowerTip = new THREE.Mesh(geos.bowTipGeo, mats.bowMetalMat);
    lowerTip.position.set(0, -0.65, -0.02);
    lowerTip.rotation.x = 0.52;
    lowerTip.castShadow = true;
    bowGroup.add(lowerTip);

    const bowstring = new THREE.Mesh(geos.bowstringGeo, mats.bowstringCyanMat);
    bowstring.position.set(0, 0, -0.13);
    bowGroup.add(bowstring);

    return bowGroup;
  };

  const hunterBow = buildAngularRecurveBow();
  hunterBow.position.set(0, -0.08, 0.04);
  hunterBow.rotation.set(0, 0, 0);
  hunterBow.visible = false;
  leftHand.add(hunterBow);

  const hunterBowStowed = buildAngularRecurveBow();
  hunterBowStowed.position.set(0.04, 1.10, -0.28);
  hunterBowStowed.rotation.set(0.12, 0, 0.65);
  hunterBowStowed.visible = true;
  group.add(hunterBowStowed);

  // Quiver (Tabung Panah) miring 35 derajat di punggung kanan atas
  const hunterQuiver = new THREE.Group();
  hunterQuiver.position.set(-0.18, 1.30, -0.28);
  hunterQuiver.rotation.set(0.10, -0.08, -0.61);

  const quiverTube = new THREE.Mesh(geos.quiverGeo, mats.quiverMat);
  quiverTube.castShadow = true;
  hunterQuiver.add(quiverTube);

  const arrowOffsets = [
    { x: -0.04, z: -0.04, rot: 0.04 },
    { x: 0.04, z: -0.04, rot: -0.05 },
    { x: -0.03, z: 0.04, rot: -0.03 },
    { x: 0.03, z: 0.04, rot: 0.06 },
  ];

  arrowOffsets.forEach((off) => {
    const arrow = new THREE.Group();
    arrow.position.set(off.x, 0.38, off.z);
    arrow.rotation.z = off.rot;

    const shaft = new THREE.Mesh(geos.arrowShaftGeo, mats.arrowShaftMat);
    arrow.add(shaft);

    const fletchX = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowMat);
    fletchX.position.y = 0.35;
    const fletchZ = new THREE.Mesh(geos.arrowFletchGeo, mats.arrowMat);
    fletchZ.position.y = 0.35;
    fletchZ.rotation.y = Math.PI / 2;
    arrow.add(fletchX, fletchZ);

    const headArrow = new THREE.Mesh(geos.arrowTipGeo, mats.arrowMat);
    headArrow.position.y = -0.42;
    arrow.add(headArrow);

    hunterQuiver.add(arrow);
  });

  group.add(hunterQuiver);

  // --------------------------------------------------------------------------
  // 10. SISTEM TRANSISI SENJATA
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
  // 11. TIER 3+ EFEK EMISI
  // --------------------------------------------------------------------------
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
      const shuriken = new THREE.Mesh(new THREE.OctahedronGeometry(0.10, 0), shurikenMat);
      const angle = (i / orbCount) * Math.PI * 2;
      shuriken.position.set(Math.cos(angle) * 0.8, 1.15, Math.sin(angle) * 0.8);
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

    playerMesh.cape.rotation.x = -0.14 - Math.abs(Math.sin(walkTime * 1.2)) * 0.18;

    const walkBob = Math.abs(Math.sin(walkTime * 2.4)) * 0.04;
    playerMesh.group.position.y = playerPosY + walkBob;
    playerMesh.group.rotation.z = Math.sin(walkTime * 1.2) * 0.025;
  } else {
    playerMesh.leftLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.leftLeg.rotation.x, 0, 0.2);
    playerMesh.rightLeg.rotation.x = THREE.MathUtils.lerp(playerMesh.rightLeg.rotation.x, 0, 0.2);
    playerMesh.group.rotation.z = THREE.MathUtils.lerp(playerMesh.group.rotation.z, 0, 0.2);

    const breathe = Math.sin(walkTime * 2.2) * 0.012;
    playerMesh.body.position.y = THREE.MathUtils.lerp(playerMesh.body.position.y, 1.15 + breathe, 0.15);

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

    playerMesh.cape.rotation.x = -0.14 - Math.sin(walkTime * 2.0) * 0.03;
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
    camera.position.set(0, 1.2, 3.5);

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
