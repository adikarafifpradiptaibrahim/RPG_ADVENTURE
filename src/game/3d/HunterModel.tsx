import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  createHunterModel,
  createBlockyHunterMesh,
  USE_LEGACY_HUNTER,
  createLegacyHunterMesh,
  animateHunterWalk,
} from './playerModel';

export {
  createHunterModel,
  createBlockyHunterMesh,
  USE_LEGACY_HUNTER,
  createLegacyHunterMesh,
  animateHunterWalk,
};

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
