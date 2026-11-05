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

/**
 * Procedural Starfall Golden Runic Magic Circle Texture Generator
 * Creates a high-resolution 512x512 sacred runic golden circle matching image_68.png:
 * Radiant golden and amber aura, 16 rune medallions, interlaced sacred stars, and central aperture.
 */
let cachedStarfallCircleTexture: THREE.CanvasTexture | null = null;

export function getStarfallMagicCircleTexture(): THREE.CanvasTexture {
  if (cachedStarfallCircleTexture) return cachedStarfallCircleTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cachedStarfallCircleTexture = new THREE.CanvasTexture(canvas);
    return cachedStarfallCircleTexture;
  }

  const cx = size / 2;
  const cy = size / 2;

  // 1. Radiant golden background aura
  const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 248);
  bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  bgGrad.addColorStop(0.18, 'rgba(254, 240, 138, 0.92)');
  bgGrad.addColorStop(0.42, 'rgba(250, 204, 21, 0.65)');
  bgGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.28)');
  bgGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 248, 0, Math.PI * 2);
  ctx.fill();

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

  // 2. Outer Concentric Golden Runic Rings
  drawGlowRing(240, '#facc15', 2.8, 14);
  drawGlowRing(228, '#ffffff', 1.8, 8);
  drawGlowRing(216, '#f59e0b', 3.6, 16);
  drawGlowRing(210, '#fef08a', 1.6, 6);

  // 3. Inner Boundary for the Runic Band
  drawGlowRing(140, '#f59e0b', 2.8, 12);
  drawGlowRing(134, '#ffffff', 1.6, 6);

  // 4. 16 Circular Rune Medallions along radius 176
  const numMedallions = 16;
  const medallionR = 176;
  const badgeRadius = 16;

  for (let i = 0; i < numMedallions; i++) {
    const angle = (i / numMedallions) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * medallionR;
    const by = cy + Math.sin(angle) * medallionR;

    // Medallion boundary circle
    ctx.save();
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius - 3, 0, Math.PI * 2);
    ctx.stroke();

    // Procedural Mystic Rune Glyph
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const rIdx = i % 8;
    if (rIdx === 0) {
      // Celestial Sun Cross
      ctx.moveTo(bx - 6, by);
      ctx.lineTo(bx + 6, by);
      ctx.moveTo(bx, by - 6);
      ctx.lineTo(bx, by + 6);
    } else if (rIdx === 1) {
      // Star Sigil
      ctx.moveTo(bx - 5, by - 6);
      ctx.lineTo(bx + 5, by + 6);
      ctx.moveTo(bx + 5, by - 6);
      ctx.lineTo(bx - 5, by + 6);
    } else if (rIdx === 2) {
      // Algiz Rune
      ctx.moveTo(bx, by + 7);
      ctx.lineTo(bx, by - 7);
      ctx.moveTo(bx - 5, by - 3);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 5, by - 3);
    } else if (rIdx === 3) {
      // Sowilo Solar Sigil
      ctx.moveTo(bx - 4, by - 6);
      ctx.lineTo(bx + 4, by - 2);
      ctx.lineTo(bx - 4, by + 2);
      ctx.lineTo(bx + 4, by + 6);
    } else if (rIdx === 4) {
      // Othala Diamond
      ctx.moveTo(bx, by - 6);
      ctx.lineTo(bx + 5, by - 1);
      ctx.lineTo(bx - 5, by + 6);
      ctx.moveTo(bx, by - 6);
      ctx.lineTo(bx - 5, by - 1);
      ctx.lineTo(bx + 5, by + 6);
    } else if (rIdx === 5) {
      // Tiwaz Spear
      ctx.moveTo(bx, by + 6);
      ctx.lineTo(bx, by - 6);
      ctx.lineTo(bx - 4, by - 2);
      ctx.moveTo(bx, by - 6);
      ctx.lineTo(bx + 4, by - 2);
    } else if (rIdx === 6) {
      // Kenaz Torch
      ctx.moveTo(bx + 4, by - 5);
      ctx.lineTo(bx - 4, by);
      ctx.lineTo(bx + 4, by + 5);
    } else {
      // Ansuz Breath
      ctx.moveTo(bx - 4, by + 6);
      ctx.lineTo(bx - 4, by - 6);
      ctx.moveTo(bx - 4, by - 3);
      ctx.lineTo(bx + 4, by - 6);
      ctx.moveTo(bx - 4, by + 2);
      ctx.lineTo(bx + 3, by - 1);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 5. Sacred Interlaced Stars (8-pointed & 12-pointed sacred geometry)
  ctx.save();
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.8;
  const starRadius = 128;
  for (let s = 0; s < 4; s++) {
    const rot = (s * Math.PI) / 4;
    ctx.beginPath();
    for (let p = 0; p < 4; p++) {
      const a = rot + (p * Math.PI) / 2;
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
  drawGlowRing(92, '#ffffff', 2.2, 8);
  drawGlowRing(80, '#facc15', 1.8, 6);

  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  for (let s = 0; s < 24; s++) {
    const a = (s / 24) * Math.PI * 2;
    const r1 = 56;
    const r2 = s % 2 === 0 ? 78 : 68;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // 7. Innermost Star Aperture Ring
  drawGlowRing(52, '#ffffff', 2.8, 14);
  drawGlowRing(38, '#fef08a', 2.0, 8);

  cachedStarfallCircleTexture = new THREE.CanvasTexture(canvas);
  cachedStarfallCircleTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedStarfallCircleTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedStarfallCircleTexture.generateMipmaps = true;

  return cachedStarfallCircleTexture;
}

export interface StarfallCastingCircleInstance {
  group: THREE.Group;
  update: (delta: number, currentPos?: THREE.Vector3) => boolean;
  cleanup: () => void;
}

/**
 * Creates the Gradual 1.5s Starfall Magic Circle at the character's feet (image_68.png)
 * - Detik 0.0: opacity 0.0, scale 0.5x, particles ascending
 * - Selama 0.0 s.d 1.5: LERP opacity 0.0 -> 1.0, scale 0.5x -> 1.0x, rotasi sumbu Y
 * - Detik 1.5: Full brightness 100%, then fast fade out
 */
export function createStarfallCastingCircleVfx(params: {
  playerPos: THREE.Vector3;
  duration?: number;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): StarfallCastingCircleInstance {
  const { playerPos, duration = 1.5, onSpawnSparks } = params;
  const group = new THREE.Group();
  group.position.set(playerPos.x, playerPos.y + 0.05, playerPos.z);

  const texture = getStarfallMagicCircleTexture();
  const circlePlaneMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const circlePlane = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), circlePlaneMat);
  circlePlane.rotation.x = -Math.PI / 2;
  group.add(circlePlane);

  // Outer Golden 3D Torus Ring
  const outerTorusMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const outerTorus = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.045, 8, 48), outerTorusMat);
  outerTorus.rotation.x = Math.PI / 2;
  group.add(outerTorus);

  // Middle Cyan/White Counter-Rotating Torus Ring
  const innerTorusMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerTorus = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.035, 8, 36), innerTorusMat);
  innerTorus.rotation.x = Math.PI / 2;
  group.add(innerTorus);

  // Vertical Aura Light Cylinder (Light shaft rising around player)
  const auraCylMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const auraCyl = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.0, 4.0, 24, 1, true), auraCylMat);
  auraCyl.position.y = 2.0;
  group.add(auraCyl);

  // Dynamic Golden PointLight
  const circleLight = new THREE.PointLight(0xfacc15, 0.0, 10.0);
  circleLight.position.set(0, 1.2, 0);
  group.add(circleLight);

  let elapsed = 0;
  let sparkTimer = 0;
  let isFadingOut = false;
  let fadeOutTimer = 0.25;

  const update = (delta: number, currentPos?: THREE.Vector3): boolean => {
    elapsed += delta;
    if (currentPos) {
      group.position.set(currentPos.x, currentPos.y + 0.05, currentPos.z);
    }

    // 1. Rotation around Y axis
    circlePlane.rotation.z += delta * 1.5;
    outerTorus.rotation.z += delta * 1.8;
    innerTorus.rotation.z -= delta * 1.4;
    auraCyl.rotation.y += delta * 0.8;

    if (!isFadingOut) {
      // Gradual 0.0 s.d 1.5 LERP (Scale: 0.5x -> 1.0x, Opacity: 0.0 -> 1.0)
      const progress = Math.min(1.0, elapsed / duration);
      const scale = 0.5 + 0.5 * progress;
      circlePlane.scale.set(scale, scale, scale);
      outerTorus.scale.set(scale, scale, scale);
      innerTorus.scale.set(scale, scale, scale);
      auraCyl.scale.set(scale, 1, scale);

      circlePlaneMat.opacity = progress * 0.98;
      outerTorusMat.opacity = progress * 0.85;
      innerTorusMat.opacity = progress * 0.75;
      auraCylMat.opacity = progress * 0.22;
      circleLight.intensity = progress * 4.5;

      // Ascending starlight particles
      sparkTimer += delta;
      if (sparkTimer >= 0.04) {
        sparkTimer = 0;
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkDist = (0.5 + Math.random() * 2.4) * scale;
        const sparkPos = group.position.clone().add(
          new THREE.Vector3(
            Math.cos(sparkAngle) * sparkDist,
            0.1 + Math.random() * 0.4,
            Math.sin(sparkAngle) * sparkDist
          )
        );
        const color = Math.random() > 0.35 ? 0xfacc15 : 0x67e8f9;
        onSpawnSparks?.(sparkPos, color, 2, 3.8);
      }

      if (elapsed >= duration) {
        isFadingOut = true;
      }
    } else {
      // Fast fade out after 1.5s
      fadeOutTimer -= delta;
      const alpha = Math.max(0, fadeOutTimer / 0.25);
      circlePlaneMat.opacity = 0.98 * alpha;
      outerTorusMat.opacity = 0.85 * alpha;
      innerTorusMat.opacity = 0.75 * alpha;
      auraCylMat.opacity = 0.22 * alpha;
      circleLight.intensity = 4.5 * alpha;

      if (fadeOutTimer <= 0) {
        if (group.parent) group.parent.remove(group);
        return false;
      }
    }

    return true;
  };

  const cleanup = () => {
    if (group.parent) group.parent.remove(group);
  };

  return { group, update, cleanup };
}

export interface StarfallMeteorBarrageInstance {
  group: THREE.Group;
  update: (delta: number) => boolean;
}

/**
 * Creates the 3-Meteor Starfall Barrage and Impact Visual Effects (image_68.png)
 * - Red AOE Target Ring indicator on the ground
 * - 3 Flaming crystal meteors streaking diagonally from sky (y=50) to the target zone
 * - Explosive ground impact: Shockwave ring, ground cracks, fiery debris & star sparkles
 */
export function createStarfallMeteorBarrageVfx(params: {
  targetCenter: THREE.Vector3;
  onImpact?: (impactPos: THREE.Vector3, isLast: boolean) => void;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): StarfallMeteorBarrageInstance {
  const { targetCenter, onImpact, onSpawnSparks } = params;
  const group = new THREE.Group();

  // 1. Red AOE Target Ring on Ground (image_68.png)
  const aoeGroup = new THREE.Group();
  aoeGroup.position.set(targetCenter.x, targetCenter.y + 0.05, targetCenter.z);

  // Outer glowing fiery red border
  const aoeRingMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const aoeRing = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.08, 8, 48), aoeRingMat);
  aoeRing.rotation.x = Math.PI / 2;
  aoeGroup.add(aoeRing);

  // Secondary inner orange boundary ring
  const aoeInnerRingMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const aoeInnerRing = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.045, 8, 40), aoeInnerRingMat);
  aoeInnerRing.rotation.x = Math.PI / 2;
  aoeGroup.add(aoeInnerRing);

  // Faint glowing red ground disk fill
  const aoeDiskMat = new THREE.MeshBasicMaterial({
    color: 0xdc2626,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const aoeDisk = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 11.6), aoeDiskMat);
  aoeDisk.rotation.x = -Math.PI / 2;
  aoeGroup.add(aoeDisk);

  group.add(aoeGroup);

  // 2. Setup 3 Flaming Crystal Meteors
  interface MeteorData {
    mesh: THREE.Group;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    impactTime: number;
    hasImpacted: boolean;
  }

  const meteorTargets = [
    targetCenter.clone().add(new THREE.Vector3(-2.2, 0, 1.4)),
    targetCenter.clone(), // Direct center
    targetCenter.clone().add(new THREE.Vector3(2.4, 0, -1.8)),
  ];

  const skyOffset = new THREE.Vector3(-16, 48, -12); // Diagonal sky trajectory (from upper-left)
  const meteors: MeteorData[] = [];

  meteorTargets.forEach((endPos, idx) => {
    const meteorGroup = new THREE.Group();
    const startPos = endPos.clone().add(skyOffset).add(new THREE.Vector3((idx - 1) * 3.5, 0, (idx - 1) * 2.0));
    meteorGroup.position.copy(startPos);

    // Cyan crystalline core
    const crystalMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });
    const crystalCore = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 6), crystalMat);
    crystalCore.rotation.x = Math.PI; // point downwards along trajectory
    meteorGroup.add(crystalCore);

    // Inner bright white flare
    const whiteFlare = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    meteorGroup.add(whiteFlare);

    // Blazing golden-orange comet tail cone
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flameTail = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.2, 8), flameMat);
    flameTail.position.y = 1.6;
    meteorGroup.add(flameTail);

    // Orient towards destination
    const travelDir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    meteorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), travelDir);

    group.add(meteorGroup);

    meteors.push({
      mesh: meteorGroup,
      startPos,
      endPos,
      impactTime: 0.38 + idx * 0.18, // Staggered: 0.38s, 0.56s, 0.74s
      hasImpacted: false,
    });
  });

  // Shockwave & Crater impact rings pool
  const activeImpactRings: { mesh: THREE.Mesh; timer: number; maxRadius: number }[] = [];
  const activeFissures: { mesh: THREE.Group; timer: number }[] = [];

  const triggerMeteorImpactVfx = (impactPos: THREE.Vector3, isLast: boolean) => {
    // 1. Fiery ground shockwave ring
    const swMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const swMesh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.14, 8, 36), swMat);
    swMesh.position.set(impactPos.x, impactPos.y + 0.08, impactPos.z);
    swMesh.rotation.x = Math.PI / 2;
    group.add(swMesh);
    activeImpactRings.push({ mesh: swMesh, timer: 0.45, maxRadius: 5.6 });

    // 2. Burning ground cracks / fissure
    const fissureGroup = new THREE.Group();
    fissureGroup.position.set(impactPos.x, impactPos.y + 0.07, impactPos.z);

    const crackMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    for (let c = 0; c < 5; c++) {
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 2.8 + Math.random() * 1.4), crackMat);
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = (c / 5) * Math.PI + (Math.random() - 0.5) * 0.3;
      fissureGroup.add(crack);
    }

    // Embedded glowing cyan crystal shards poking up from crater
    for (let s = 0; s < 4; s++) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 1.4, 5),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92, depthWrite: false })
      );
      shard.position.set((Math.random() - 0.5) * 1.2, 0.5, (Math.random() - 0.5) * 1.2);
      shard.rotation.z = (Math.random() - 0.5) * 0.6;
      shard.rotation.x = (Math.random() - 0.5) * 0.6;
      fissureGroup.add(shard);
    }

    group.add(fissureGroup);
    activeFissures.push({ mesh: fissureGroup, timer: 1.6 });

    // 3. Explosive Sparks Burst
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xf97316, 24, 6.0);
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x38bdf8, 16, 5.0);
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xffffff, 12, 4.5);

    // Trigger game engine impact logic
    onImpact?.(impactPos, isLast);
  };

  let elapsed = 0;
  const maxLifetime = 2.4;

  const update = (delta: number): boolean => {
    elapsed += delta;

    // 1. Update falling meteors
    meteors.forEach((m, idx) => {
      if (m.hasImpacted) return;

      if (elapsed < m.impactTime) {
        const t = elapsed / m.impactTime;
        m.mesh.position.lerpVectors(m.startPos, m.endPos, t);

        // Emit spark trail
        if (Math.random() > 0.4) {
          onSpawnSparks?.(m.mesh.position, 0xf97316, 2, 2.5);
          onSpawnSparks?.(m.mesh.position, 0x38bdf8, 1, 2.0);
        }
      } else {
        // Impact occurred!
        m.hasImpacted = true;
        m.mesh.visible = false;
        triggerMeteorImpactVfx(m.endPos, idx === meteors.length - 1);
      }
    });

    // 2. Pulse AOE Target Ring
    const pulse = 1.0 + Math.sin(elapsed * 12) * 0.05;
    aoeGroup.scale.set(pulse, 1, pulse);

    // 3. Update expanding shockwaves
    for (let i = activeImpactRings.length - 1; i >= 0; i--) {
      const sw = activeImpactRings[i];
      sw.timer -= delta;
      const t = Math.max(0, sw.timer / 0.45);
      const scale = 1.0 + (1.0 - t) * (sw.maxRadius - 1.0);
      sw.mesh.scale.set(scale, scale, 1);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.95;

      if (sw.timer <= 0) {
        group.remove(sw.mesh);
        activeImpactRings.splice(i, 1);
      }
    }

    // 4. Update burning fissures
    for (let i = activeFissures.length - 1; i >= 0; i--) {
      const f = activeFissures[i];
      f.timer -= delta;
      const alpha = Math.max(0, f.timer / 1.6);
      f.mesh.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = alpha * 0.92;
      });

      if (f.timer <= 0) {
        group.remove(f.mesh);
        activeFissures.splice(i, 1);
      }
    }

    // 5. Fade out AOE Ring after all meteors impact (t > 1.2s)
    if (elapsed > 1.1) {
      const aoeAlpha = Math.max(0, (maxLifetime - elapsed) / (maxLifetime - 1.1));
      aoeRingMat.opacity = 0.9 * aoeAlpha;
      aoeInnerRingMat.opacity = 0.75 * aoeAlpha;
      aoeDiskMat.opacity = 0.22 * aoeAlpha;
    }

    if (elapsed >= maxLifetime) {
      if (group.parent) group.parent.remove(group);
      return false;
    }

    return true;
  };

  return { group, update };
}

