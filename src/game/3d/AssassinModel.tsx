import React from 'react';
import * as THREE from 'three';
import { PlayerMeshObjects } from './models';
import {
  HunterModel,
  HunterModelProps,
  createHunterModel,
  createBlockyHunterMesh,
  USE_LEGACY_HUNTER,
  createLegacyHunterMesh,
  animateHunterWalk,
} from './HunterModel';

/**
 * Factory pembuatan Assassin Mesh dengan rotasi dasar netral
 */
export function createAssassinModel(): THREE.Group {
  const root = createHunterModel();
  root.rotation.set(0, 0, 0);
  root.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
      if (
        child.name.toLowerCase().includes('body') ||
        child.name.toLowerCase().includes('torso') ||
        child.name.toLowerCase().includes('chest')
      ) {
        child.rotation.set(0, 0, 0);
      }
    }
  });
  return root;
}

export function createBlockyAssassinMesh(tier: number = 1): PlayerMeshObjects {
  const meshObj = createBlockyHunterMesh(tier);
  meshObj.group.rotation.set(0, 0, 0);
  if (meshObj.rotation) {
    meshObj.rotation.set(0, 0, 0);
  }
  meshObj.group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
      if (
        child.name.toLowerCase().includes('body') ||
        child.name.toLowerCase().includes('torso') ||
        child.name.toLowerCase().includes('chest') ||
        child === meshObj.body
      ) {
        child.rotation.set(0, 0, 0);
      }
    }
  });
  return meshObj;
}

/**
 * Animasi Pose & Walk Assassin
 * Rotasi Z selalu dikunci tepat 0 agar badan selalu tegak lurus sempurna saat bergerak dan drag kamera
 */
export function animateAssassin(
  mesh: PlayerMeshObjects,
  walkTime: number,
  playerPosY: number,
  isMoving: boolean,
  isAttacking: boolean = false,
  weaponMode: 'dagger' | 'bow' = 'dagger',
  isSprinting: boolean = false
): void {
  if (!mesh) return;

  if (mesh.body) {
    mesh.body.rotation.set(0, 0, 0);
  }
  if (mesh.group) {
    mesh.group.rotation.x = 0;
    mesh.group.rotation.z = 0;
  }
  if (mesh.rotation) {
    mesh.rotation.x = 0;
    mesh.rotation.z = 0;
  }

  animateHunterWalk(mesh, walkTime, playerPosY, isMoving, isAttacking, weaponMode, isSprinting);

  // Kunci mutlak rotasi Z body agar selalu tegak lurus sempurna saat berjalan, berlari, berbelok, maupun drag kamera
  if (mesh.body) {
    mesh.body.rotation.set(0, 0, 0);
  }
  if (mesh.group) {
    mesh.group.rotation.x = 0;
    mesh.group.rotation.z = 0;
  }
  if (mesh.rotation) {
    mesh.rotation.x = 0;
    mesh.rotation.z = 0;
  }
}

export const updateAssassinPose = animateAssassin;
export const animateAssassinWalk = animateAssassin;

export {
  createHunterModel,
  createBlockyHunterMesh,
  USE_LEGACY_HUNTER,
  createLegacyHunterMesh,
  animateHunterWalk,
};

export interface AssassinModelProps extends HunterModelProps {}

export const AssassinModel: React.FC<AssassinModelProps> = (props) => {
  return <HunterModel {...props} />;
};

export default AssassinModel;
