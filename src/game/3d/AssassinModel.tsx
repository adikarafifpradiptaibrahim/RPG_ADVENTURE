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
    // Pastikan order Euler adalah 'YXZ' agar rotasi belok tidak memutar sumbu miring
    mesh.body.rotation.reorder('YXZ');
    mesh.body.rotation.z = 0;
  }
  if (mesh.group) {
    mesh.group.rotation.z = 0;
  }

  animateHunterWalk(mesh, walkTime, playerPosY, isMoving, isAttacking, weaponMode, isSprinting);

  // Kunci mutlak rotasi Z body agar selalu tegak lurus sempurna saat berjalan, berlari, berbelok, maupun drag kamera
  if (mesh.body) {
    mesh.body.rotation.z = 0;
  }
  if (mesh.group) {
    mesh.group.rotation.z = 0;
  }
  if (mesh.rotation) {
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
