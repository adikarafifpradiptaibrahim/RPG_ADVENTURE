import * as THREE from 'three';

/**
 * Procedural Arcane Magic Circle Texture Generator
 * Creates a high-resolution 512x512 glowing runic circle matching the Mage Magic Circle aesthetics:
 * Concentric glowing rings, 12 rune medallions, sacred dodecagram geometry, and central aperture.
 */
let cachedMagicCircleTexture: THREE.CanvasTexture | null = null;

export function getMageMagicCircleTexture(): THREE.CanvasTexture {
  if (cachedMagicCircleTexture) return cachedMagicCircleTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cachedMagicCircleTexture = new THREE.CanvasTexture(canvas);
    return cachedMagicCircleTexture;
  }

  const cx = size / 2;
  const cy = size / 2;

  // 1. Soft radial background energy aura
  const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 246);
  bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  bgGrad.addColorStop(0.15, 'rgba(244, 114, 182, 0.88)');
  bgGrad.addColorStop(0.38, 'rgba(232, 121, 249, 0.52)');
  bgGrad.addColorStop(0.72, 'rgba(168, 85, 247, 0.24)');
  bgGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 246, 0, Math.PI * 2);
  ctx.fill();

  // Helper for glowing concentric circles
  const drawGlowRing = (r: number, color: string, width: number, blur = 10) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  // 2. Outer Concentric Runic Rings
  drawGlowRing(238, '#e879f9', 2.2, 12);
  drawGlowRing(226, '#fdf4ff', 1.6, 8);
  drawGlowRing(214, '#c084fc', 3.4, 14);
  drawGlowRing(208, '#f472b6', 1.8, 8);

  // 3. Inner Boundary for the Runic Band
  drawGlowRing(136, '#f472b6', 2.6, 10);
  drawGlowRing(130, '#fdf4ff', 1.5, 6);

  // 4. 12 Circular Rune Medallions evenly spaced along R = 172
  const numMedallions = 12;
  const medallionR = 172;
  const badgeRadius = 18;

  for (let i = 0; i < numMedallions; i++) {
    const angle = (i / numMedallions) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * medallionR;
    const by = cy + Math.sin(angle) * medallionR;

    // Medallion boundary circle
    ctx.save();
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary inner badge circle
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius - 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // Procedural Mystic Rune Glyph inside medallion
    ctx.strokeStyle = '#fdf4ff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const rIdx = i % 6;
    if (rIdx === 0) {
      // Algiz / Arcane Fork
      ctx.moveTo(bx, by + 10);
      ctx.lineTo(bx, by - 10);
      ctx.moveTo(bx - 7, by - 5);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 7, by - 5);
    } else if (rIdx === 1) {
      // Sowilo / Energy Sigil
      ctx.moveTo(bx - 6, by - 8);
      ctx.lineTo(bx + 5, by - 4);
      ctx.lineTo(bx - 5, by + 2);
      ctx.lineTo(bx + 6, by + 8);
    } else if (rIdx === 2) {
      // Ansuz / Cosmic Breath
      ctx.moveTo(bx - 5, by + 9);
      ctx.lineTo(bx - 5, by - 9);
      ctx.moveTo(bx - 5, by - 4);
      ctx.lineTo(bx + 6, by - 8);
      ctx.moveTo(bx - 5, by + 3);
      ctx.lineTo(bx + 5, by - 1);
    } else if (rIdx === 3) {
      // Othala / Star Seal
      ctx.moveTo(bx, by - 9);
      ctx.lineTo(bx + 7, by - 2);
      ctx.lineTo(bx - 7, by + 9);
      ctx.moveTo(bx, by - 9);
      ctx.lineTo(bx - 7, by - 2);
      ctx.lineTo(bx + 7, by + 9);
    } else if (rIdx === 4) {
      // Tiwaz / Cosmic Arrowhead
      ctx.moveTo(bx, by + 9);
      ctx.lineTo(bx, by - 9);
      ctx.lineTo(bx - 7, by - 2);
      ctx.moveTo(bx, by - 9);
      ctx.lineTo(bx + 7, by - 2);
    } else {
      // Kenaz / Radiant Flare
      ctx.moveTo(bx + 6, by - 8);
      ctx.lineTo(bx - 6, by);
      ctx.lineTo(bx + 6, by + 8);
      ctx.moveTo(bx - 6, by);
      ctx.lineTo(bx + 7, by);
    }
    ctx.stroke();
    ctx.restore();

    // Connecting arc tick marks between badges
    const nextAngle = ((i + 1) / numMedallions) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;
    const mx1 = cx + Math.cos(midAngle) * 163;
    const my1 = cy + Math.sin(midAngle) * 163;
    const mx2 = cx + Math.cos(midAngle) * 181;
    const my2 = cy + Math.sin(midAngle) * 181;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(mx1, my1);
    ctx.lineTo(mx2, my2);
    ctx.stroke();
  }

  // 5. Sacred Dodecagram / Overlapping Rotated Triangles
  ctx.save();
  ctx.shadowColor = '#d946ef';
  ctx.shadowBlur = 9;
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = 1.6;
  const starRadius = 126;
  for (let t = 0; t < 4; t++) {
    const rot = (t * Math.PI) / 6;
    ctx.beginPath();
    for (let p = 0; p < 3; p++) {
      const a = rot + (p * 2 * Math.PI) / 3;
      const px = cx + Math.cos(a) * starRadius;
      const py = cy + Math.sin(a) * starRadius;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  // 6. Mid Inner Rings & Radial Energy Spokes
  drawGlowRing(88, '#fdf4ff', 2.0, 8);
  drawGlowRing(76, '#e879f9', 1.5, 6);

  ctx.save();
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = 1.5;
  for (let s = 0; s < 24; s++) {
    const a = (s / 24) * Math.PI * 2;
    const r1 = 52;
    const r2 = s % 2 === 0 ? 74 : 64;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // 7. Innermost Aperture Ring
  drawGlowRing(48, '#ffffff', 2.6, 14);
  drawGlowRing(36, '#fdf4ff', 1.8, 8);

  cachedMagicCircleTexture = new THREE.CanvasTexture(canvas);
  cachedMagicCircleTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedMagicCircleTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedMagicCircleTexture.generateMipmaps = true;

  return cachedMagicCircleTexture;
}

export interface MageLaserBeamVfxInstance {
  group: THREE.Group;
  update: (delta: number) => boolean;
}

/**
 * Creates the Spectacular 3D Mage Arcane Laser Beam & Magic Circle VFX
 * Active duration: exactly 1.0 second (1000 ms).
 * Features:
 * - 3D Magic Circle with Runic Glow, Rotating Torus Rings, and Core Starburst
 * - Straight-line High-Energy Laser Beam (White-Hot Core + Neon Pink Plasma + Neon Violet Shroud)
 * - 4 Orbiting Helical Torus Energy Rings along the ray
 * - Dynamic Neon Purple PointLight
 * - Continuous Raycast Hitbox callback for 1.0s tick damage
 */
export function createMageArcaneLaserBeamVfx(params: {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  beamLength?: number;
  duration?: number;
  onHitTick?: (isTick: boolean) => void;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): MageLaserBeamVfxInstance {
  const {
    origin,
    direction: rawDirection,
    beamLength = 32.0,
    duration = 1.0,
    onHitTick,
    onSpawnSparks,
  } = params;

  const fwd = rawDirection.clone().normalize();
  const group = new THREE.Group();

  // ----------------------------------------------------
  // 1. 3D MAGIC CIRCLE (Canvas Texture + 3D Glowing Toruses)
  // ----------------------------------------------------
  const magicCircleGroup = new THREE.Group();
  magicCircleGroup.position.copy(origin);
  magicCircleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd);

  const texture = getMageMagicCircleTexture();
  const circlePlaneMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const circlePlane = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8), circlePlaneMat);
  magicCircleGroup.add(circlePlane);

  // Outer 3D Glowing Torus Ring
  const outerTorusMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const outerTorus = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.045, 8, 36), outerTorusMat);
  magicCircleGroup.add(outerTorus);

  // Inner 3D Counter-Rotating Torus Ring
  const innerTorusMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerTorus = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 8, 28), innerTorusMat);
  magicCircleGroup.add(innerTorus);

  // Central Core Lens Flare Sphere
  const coreSphereMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
  });
  const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), coreSphereMat);
  magicCircleGroup.add(coreSphere);

  // 4-Pointed Radiant Cross Flare
  const crossMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const crossH = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.14), crossMat);
  const crossV = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 4.2), crossMat);
  magicCircleGroup.add(crossH, crossV);

  // Dynamic Neon Violet Light at the origin
  const beamLight = new THREE.PointLight(0xe879f9, 4.5, 18.0);
  magicCircleGroup.add(beamLight);

  group.add(magicCircleGroup);

  // ----------------------------------------------------
  // 2. STRAIGHT LASER BEAM CYLINDERS (Core White + Neon Violet)
  // ----------------------------------------------------
  const laserBeamGroup = new THREE.Group();
  const beamCenter = origin.clone().addScaledVector(fwd, beamLength / 2);
  laserBeamGroup.position.copy(beamCenter);
  laserBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fwd);

  // 2a. Brilliant White-Hot Laser Core
  const coreCylMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
  });
  const coreCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, beamLength, 12, 1, true), coreCylMat);
  laserBeamGroup.add(coreCyl);

  // 2b. Middle Neon Pink/Magenta Plasma Ray
  const plasmaCylMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const plasmaCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, beamLength, 16, 1, true), plasmaCylMat);
  laserBeamGroup.add(plasmaCyl);

  // 2c. Outer Glowing Neon Violet Shroud / Corona
  const shroudCylMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const shroudCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.80, beamLength, 16, 1, true), shroudCylMat);
  laserBeamGroup.add(shroudCyl);

  // 2d. Helical Energy Torus Rings orbiting along the beam
  const ringOffsets = [-beamLength * 0.35, -beamLength * 0.12, beamLength * 0.12, beamLength * 0.35];
  const ringMeshes: THREE.Mesh[] = [];
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  ringOffsets.forEach((yOff) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 16), ringMat);
    ring.position.y = yOff;
    ring.rotation.x = Math.PI / 2;
    laserBeamGroup.add(ring);
    ringMeshes.push(ring);
  });

  // 2e. Terminal Impact Blast at beam end
  const endPoint = origin.clone().addScaledVector(fwd, beamLength);
  const impactGroup = new THREE.Group();
  impactGroup.position.copy(endPoint);

  const impactCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const impactCore = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), impactCoreMat);
  impactGroup.add(impactCore);

  const impactGlowMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const impactGlow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), impactGlowMat);
  impactGroup.add(impactGlow);

  group.add(laserBeamGroup);
  group.add(impactGroup);

  // ----------------------------------------------------
  // 3. ANIMATION & LIFECYCLE CONTROLLER (1.0 Second Active Duration)
  // ----------------------------------------------------
  let timeLeft = duration;
  let elapsed = 0;
  let sparkInterval = 0;
  let tickInterval = 0;

  // Initial instant hit check
  onHitTick?.(false);

  const update = (delta: number): boolean => {
    timeLeft -= delta;
    elapsed += delta;

    if (timeLeft <= 0) {
      // Clean up all resources
      if (group.parent) {
        group.parent.remove(group);
      }
      return false;
    }

    // 1. Rotate Magic Circle components
    circlePlane.rotation.z += delta * 2.8;
    outerTorus.rotation.z += delta * 2.2;
    innerTorus.rotation.z -= delta * 1.8;
    crossH.rotation.z += delta * 1.5;
    crossV.rotation.z += delta * 1.5;

    // 2. High-energy Laser Pulse
    const pulse = 1.0 + Math.sin(elapsed * 45) * 0.14;
    coreCyl.scale.set(pulse, 1, pulse);
    plasmaCyl.scale.set(pulse, 1, pulse);
    const shroudPulse = 1.0 + Math.sin(elapsed * 25) * 0.16;
    shroudCyl.scale.set(shroudPulse, 1, shroudPulse);

    // Helical rings spin and glide
    ringMeshes.forEach((rm, i) => {
      rm.rotation.x += delta * (5 + i * 1.2);
      rm.rotation.y += delta * (4 - i * 0.8);
      rm.scale.setScalar(1.0 + Math.sin(elapsed * 20 + i) * 0.18);
    });

    // 3. Arcane sparks along the beam trajectory
    sparkInterval += delta;
    if (sparkInterval >= 0.05) {
      sparkInterval = 0;
      const randDist = 1.2 + Math.random() * (beamLength - 2.5);
      const sparkPos = origin.clone().addScaledVector(fwd, randDist);
      sparkPos.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8
        )
      );
      const color = Math.random() > 0.4 ? 0xe879f9 : 0xffffff;
      onSpawnSparks?.(sparkPos, color, 2, 2.5);
    }

    // 4. Hitbox damage tick every 0.25 seconds
    tickInterval += delta;
    if (tickInterval >= 0.25) {
      tickInterval = 0;
      onHitTick?.(true);
    }

    // 5. Smooth fade out during last 0.25 seconds
    if (timeLeft < 0.25) {
      const alpha = Math.max(0, timeLeft / 0.25);
      circlePlaneMat.opacity = 0.95 * alpha;
      outerTorusMat.opacity = 0.85 * alpha;
      innerTorusMat.opacity = 0.8 * alpha;
      coreSphereMat.opacity = 0.98 * alpha;
      crossMat.opacity = 0.9 * alpha;

      coreCylMat.opacity = alpha;
      plasmaCylMat.opacity = 0.85 * alpha;
      shroudCylMat.opacity = 0.55 * alpha;
      ringMat.opacity = 0.85 * alpha;

      impactCoreMat.opacity = 0.95 * alpha;
      impactGlowMat.opacity = 0.75 * alpha;
      beamLight.intensity = 4.5 * alpha;
    }

    return true;
  };

  return { group, update };
}
