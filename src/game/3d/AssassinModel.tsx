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
  const body = root.getObjectByName('TorsoGroup');
  if (body) {
    body.position.x = 0;
    body.rotation.set(0, 0, 0);
    body.rotation.reorder('YXZ');
  }
  return root;
}

export function createBlockyAssassinMesh(tier: number = 1): PlayerMeshObjects {
  const meshObj = createBlockyHunterMesh(tier);
  if (meshObj.body) {
    meshObj.body.position.x = 0;
    meshObj.body.rotation.set(0, 0, 0);
    meshObj.body.rotation.reorder('YXZ');
  }
  if (meshObj.group) {
    meshObj.group.rotation.z = 0;
  }
  return meshObj;
}

/**
 * Animasi Pose & Walk Assassin
 * Seluruh rotasi Z netral dan murni diatur oleh gameEngine
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
    // Pastikan order Euler adalah 'YXZ' agar rotasi belok tidak memutar sumbu miring
    mesh.body.rotation.reorder('YXZ');
    // Rotasi Z netral: tidak ada nilai hardcode kemiringan Z di file ini
    // Murni dikontrol oleh sistem lean di gameEngine
  }
  if (mesh.group) {
    mesh.group.rotation.z = 0;
  }

  animateHunterWalk(mesh, walkTime, playerPosY, isMoving, isAttacking, weaponMode, isSprinting);
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
