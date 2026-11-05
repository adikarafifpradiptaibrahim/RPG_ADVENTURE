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

// ----------------------------------------------------
// STARFALL SHADER & PRE-ALLOCATED RESOURCE POOL
// ----------------------------------------------------

const starfallRadialVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const starfallRadialFragmentShader = `
  uniform sampler2D uMap;
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uLeadingColor;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - vec2(0.5);
    float dist = length(centered);
    if (dist > 0.495) discard;

    // Clockwise angle starting from top (12 o'clock = 0.0 to 1.0)
    float angle = atan(centered.x, centered.y);
    if (angle < 0.0) {
      angle += 6.28318530718;
    }
    float normalizedAngle = angle / 6.28318530718;

    // Radial progressive stroke reveal: hide parts not yet drawn
    if (normalizedAngle > uProgress) {
      discard;
    }

    vec4 tex = texture2D(uMap, vUv);

    // Incandescent molten-energy spark traveling along the leading stroke edge
    float edgeDiff = abs(normalizedAngle - uProgress);
    if (edgeDiff < 0.024 && uProgress > 0.005 && uProgress < 0.995) {
      float spark = (1.0 - edgeDiff / 0.024) * 2.8;
      tex.rgb += uLeadingColor * spark;
      tex.a = max(tex.a, 0.98);
    }

    tex.a *= uOpacity;
    gl_FragColor = tex;
  }
`;

/**
 * Singleton Static Geometries and Materials for Starfall
 * Eliminates garbage collection spikes and runtime shader compiling freezes
 */
class StarfallResourcePool {
  private static instance: StarfallResourcePool | null = null;

  public circlePlaneGeom!: THREE.PlaneGeometry;
  public outerTorusGeom!: THREE.TorusGeometry;
  public innerTorusGeom!: THREE.TorusGeometry;
  public auraCylGeom!: THREE.CylinderGeometry;
  public sparkGeom!: THREE.SphereGeometry;

  public aoeRingGeom!: THREE.TorusGeometry;
  public aoeInnerRingGeom!: THREE.TorusGeometry;
  public aoeDiskGeom!: THREE.PlaneGeometry;

  public meteorCoreGeom!: THREE.ConeGeometry;
  public meteorFlareGeom!: THREE.SphereGeometry;
  public meteorFlameGeom!: THREE.ConeGeometry;

  public shockwaveGeom!: THREE.TorusGeometry;
  public crackGeom!: THREE.PlaneGeometry;
  public shardGeom!: THREE.ConeGeometry;

  public outerTorusMat!: THREE.MeshBasicMaterial;
  public innerTorusMat!: THREE.MeshBasicMaterial;
  public auraCylMat!: THREE.MeshBasicMaterial;
  public leadingSparkMat!: THREE.MeshBasicMaterial;

  public aoeRingMat!: THREE.MeshBasicMaterial;
  public aoeInnerRingMat!: THREE.MeshBasicMaterial;
  public aoeDiskMat!: THREE.MeshBasicMaterial;

  public meteorCrystalMat!: THREE.MeshBasicMaterial;
  public meteorWhiteFlareMat!: THREE.MeshBasicMaterial;
  public meteorFlameMat!: THREE.MeshBasicMaterial;

  public shockwaveMat!: THREE.MeshBasicMaterial;
  public crackMat!: THREE.MeshBasicMaterial;
  public shardMat!: THREE.MeshBasicMaterial;

  public isInitialized = false;

  public static get(): StarfallResourcePool {
    if (!StarfallResourcePool.instance) {
      StarfallResourcePool.instance = new StarfallResourcePool();
      StarfallResourcePool.instance.init();
    }
    return StarfallResourcePool.instance;
  }

  private init() {
    if (this.isInitialized) return;

    // Magic Circle Geometries
    this.circlePlaneGeom = new THREE.PlaneGeometry(6.6, 6.6);
    this.outerTorusGeom = new THREE.TorusGeometry(3.0, 0.045, 8, 48);
    this.innerTorusGeom = new THREE.TorusGeometry(1.9, 0.035, 8, 36);
    this.auraCylGeom = new THREE.CylinderGeometry(2.7, 3.0, 4.0, 24, 1, true);
    this.sparkGeom = new THREE.SphereGeometry(0.18, 8, 8);

    // Expanded AOE Target Zone Geometries (1.8x wider, radius 10.5)
    this.aoeRingGeom = new THREE.TorusGeometry(10.5, 0.14, 8, 56);
    this.aoeInnerRingGeom = new THREE.TorusGeometry(9.6, 0.06, 8, 48);
    this.aoeDiskGeom = new THREE.PlaneGeometry(21.0, 21.0);

    // Meteor Geometries
    this.meteorCoreGeom = new THREE.ConeGeometry(0.75, 2.8, 6);
    this.meteorFlareGeom = new THREE.SphereGeometry(0.6, 8, 8);
    this.meteorFlameGeom = new THREE.ConeGeometry(1.3, 4.8, 8);

    // Impact Geometries
    this.shockwaveGeom = new THREE.TorusGeometry(1.0, 0.16, 8, 32);
    this.crackGeom = new THREE.PlaneGeometry(0.3, 3.8);
    this.shardGeom = new THREE.ConeGeometry(0.32, 1.6, 5);

    // Shared Materials
    this.outerTorusMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.innerTorusMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.auraCylMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.leadingSparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });

    this.aoeRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.aoeInnerRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.aoeDiskMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.meteorCrystalMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });

    this.meteorWhiteFlareMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthWrite: false,
    });

    this.meteorFlameMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.crackMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.shardMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });

    this.isInitialized = true;
  }
}

/**
 * Preloads and compiles all Starfall Shaders and Geometries into WebGL context
 * Called once during gameEngine initialization to ensure 60 FPS without stutter
 */
export function preloadStarfallPool(scene: THREE.Scene, renderer?: THREE.WebGLRenderer, camera?: THREE.Camera) {
  const pool = StarfallResourcePool.get();
  getStarfallMagicCircleTexture();

  if (renderer && camera) {
    const dummyGroup = new THREE.Group();

    // Pre-create dummy meshes with all materials
    const shaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: getStarfallMagicCircleTexture() },
        uProgress: { value: 0.5 },
        uOpacity: { value: 1.0 },
        uLeadingColor: { value: new THREE.Vector3(1.0, 0.92, 0.6) },
      },
      vertexShader: starfallRadialVertexShader,
      fragmentShader: starfallRadialFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    dummyGroup.add(new THREE.Mesh(pool.circlePlaneGeom, shaderMat));
    dummyGroup.add(new THREE.Mesh(pool.outerTorusGeom, pool.outerTorusMat));
    dummyGroup.add(new THREE.Mesh(pool.innerTorusGeom, pool.innerTorusMat));
    dummyGroup.add(new THREE.Mesh(pool.auraCylGeom, pool.auraCylMat));
    dummyGroup.add(new THREE.Mesh(pool.aoeRingGeom, pool.aoeRingMat));
    dummyGroup.add(new THREE.Mesh(pool.aoeDiskGeom, pool.aoeDiskMat));
    dummyGroup.add(new THREE.Mesh(pool.meteorCoreGeom, pool.meteorCrystalMat));
    dummyGroup.add(new THREE.Mesh(pool.meteorFlameGeom, pool.meteorFlameMat));
    dummyGroup.add(new THREE.Mesh(pool.shockwaveGeom, pool.shockwaveMat));
    dummyGroup.add(new THREE.Mesh(pool.crackGeom, pool.crackMat));

    scene.add(dummyGroup);
    try {
      renderer.compile(scene, camera);
    } catch {}
    scene.remove(dummyGroup);
  }
}

export interface StarfallCastingCircleInstance {
  group: THREE.Group;
  update: (delta: number, currentPos?: THREE.Vector3) => boolean;
  cleanup: () => void;
}

/**
 * Creates the Gradual 1.5s Starfall Magic Circle at the character's feet (image_68.png)
 * Uses Radial Progressive Stroke Shader:
 * - Concentric circles, 16 runes, and sacred star are drawn progressively clockwise (0% to 100%)
 * - Incandescent leading spark travels along the circumference tracing the rune line
 * - At 1.5s: 100% full circle completed, followed by smooth fade-out
 */
export function createStarfallCastingCircleVfx(params: {
  playerPos: THREE.Vector3;
  duration?: number;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): StarfallCastingCircleInstance {
  const { playerPos, duration = 1.5, onSpawnSparks } = params;
  const pool = StarfallResourcePool.get();
  const group = new THREE.Group();
  group.position.set(playerPos.x, playerPos.y + 0.05, playerPos.z);

  const texture = getStarfallMagicCircleTexture();

  // Radial Progressive Stroke Shader Material
  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uLeadingColor: { value: new THREE.Vector3(1.0, 0.94, 0.7) },
    },
    vertexShader: starfallRadialVertexShader,
    fragmentShader: starfallRadialFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const circlePlane = new THREE.Mesh(pool.circlePlaneGeom, shaderMat);
  circlePlane.rotation.x = -Math.PI / 2;
  group.add(circlePlane);

  // Outer Golden 3D Torus Ring
  const outerTorus = new THREE.Mesh(pool.outerTorusGeom, pool.outerTorusMat);
  outerTorus.rotation.x = Math.PI / 2;
  group.add(outerTorus);

  // Middle Cyan/White Counter-Rotating Torus Ring
  const innerTorus = new THREE.Mesh(pool.innerTorusGeom, pool.innerTorusMat);
  innerTorus.rotation.x = Math.PI / 2;
  group.add(innerTorus);

  // Vertical Aura Light Cylinder
  const auraCyl = new THREE.Mesh(pool.auraCylGeom, pool.auraCylMat);
  auraCyl.position.y = 2.0;
  group.add(auraCyl);

  // Incandescent Leading Spark (Travels at the head of the drawing stroke)
  const leadingSpark = new THREE.Mesh(pool.sparkGeom, pool.leadingSparkMat);
  leadingSpark.position.set(0, 0.08, 3.0);
  group.add(leadingSpark);

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

    // Rotations around Y
    outerTorus.rotation.z += delta * 1.5;
    innerTorus.rotation.z -= delta * 1.2;
    auraCyl.rotation.y += delta * 0.8;

    if (!isFadingOut) {
      // Clockwise Radial Stroke Drawing Progress (0.0 to 1.0 over exactly 1.5s)
      const progress = Math.min(1.0, elapsed / duration);
      shaderMat.uniforms.uProgress.value = progress;
      shaderMat.uniforms.uOpacity.value = 1.0;

      // Position leading spark along circumference (radius 3.0)
      // Clockwise angle: 0 at top (Z = -3.0), PI/2 at right (X = 3.0), etc.
      const headAngle = progress * Math.PI * 2;
      const hX = Math.sin(headAngle) * 3.0;
      const hZ = -Math.cos(headAngle) * 3.0;
      leadingSpark.position.set(hX, 0.08, hZ);

      // Light and aura intensity scale with progress
      circleLight.intensity = progress * 4.5;

      // Emit continuous golden starlight sparks at the leading drawing point
      sparkTimer += delta;
      if (sparkTimer >= 0.035) {
        sparkTimer = 0;
        const sparkPos = group.position.clone().add(new THREE.Vector3(hX, 0.1, hZ));
        onSpawnSparks?.(sparkPos, 0xfacc15, 3, 3.5);
        onSpawnSparks?.(sparkPos, 0xffffff, 2, 2.8);
      }

      if (elapsed >= duration) {
        isFadingOut = true;
        leadingSpark.visible = false;
      }
    } else {
      // Smooth fade out after 1.5s
      fadeOutTimer -= delta;
      const alpha = Math.max(0, fadeOutTimer / 0.25);
      shaderMat.uniforms.uOpacity.value = alpha;
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
 * Creates the Expanded 8-Meteor Starfall Barrage and Impact Visual Effects (image_68.png)
 * - Expanded Target Red AOE Zone on Ground (Radius 10.5 units, 1.8x wider!)
 * - 8 Flaming crystal meteors streaking diagonally from sky in rapid succession
 * - Zero GC allocation: uses pre-allocated object pool for meteors, shockwaves, and ground fissures
 */
export function createStarfallMeteorBarrageVfx(params: {
  targetCenter: THREE.Vector3;
  onImpact?: (impactPos: THREE.Vector3, isLast: boolean, index: number) => void;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): StarfallMeteorBarrageInstance {
  const { targetCenter, onImpact, onSpawnSparks } = params;
  const pool = StarfallResourcePool.get();
  const group = new THREE.Group();

  // 1. Expanded Red AOE Target Ring on Ground (Radius 10.5 units)
  const aoeGroup = new THREE.Group();
  aoeGroup.position.set(targetCenter.x, targetCenter.y + 0.05, targetCenter.z);

  const aoeRing = new THREE.Mesh(pool.aoeRingGeom, pool.aoeRingMat);
  aoeRing.rotation.x = Math.PI / 2;
  aoeGroup.add(aoeRing);

  const aoeInnerRing = new THREE.Mesh(pool.aoeInnerRingGeom, pool.aoeInnerRingMat);
  aoeInnerRing.rotation.x = Math.PI / 2;
  aoeGroup.add(aoeInnerRing);

  const aoeDisk = new THREE.Mesh(pool.aoeDiskGeom, pool.aoeDiskMat);
  aoeDisk.rotation.x = -Math.PI / 2;
  aoeGroup.add(aoeDisk);

  group.add(aoeGroup);

  // 2. Pre-allocated 8 Meteors with Dispersed Target Points across the 10.5-radius zone
  interface MeteorItem {
    mesh: THREE.Group;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    impactTime: number;
    hasImpacted: boolean;
  }

  const meteorOffsets: [number, number][] = [
    [-5.5, 4.2],   // 1. Upper-left
    [6.0, 5.2],    // 2. Upper-right
    [-3.5, -6.8],  // 3. Lower-left
    [7.8, -3.2],   // 4. Far right
    [-7.5, -1.8],  // 5. Far left
    [2.8, 4.5],    // 6. Mid upper
    [-1.5, 8.2],   // 7. Outer north
    [0.0, 0.0],    // 8. GRAND FINALE - Direct Center Bullseye!
  ];

  const skyOffset = new THREE.Vector3(-18, 52, -14); // Diagonal sky trajectory (from upper-left)
  const meteors: MeteorItem[] = [];

  // Shockwave & Crater impact pool (8 reusable instances)
  const shockwavePool: { mesh: THREE.Mesh; timer: number; maxRadius: number; active: boolean }[] = [];
  const fissurePool: { mesh: THREE.Group; timer: number; active: boolean }[] = [];

  meteorOffsets.forEach(([ox, oz], idx) => {
    const endPos = targetCenter.clone().add(new THREE.Vector3(ox, 0, oz));
    const startPos = endPos.clone().add(skyOffset).add(new THREE.Vector3((idx - 3.5) * 2.2, 0, (idx - 3.5) * 1.5));

    // Meteor Group using pooled geometries and materials
    const mGroup = new THREE.Group();
    mGroup.position.copy(startPos);

    const crystalCore = new THREE.Mesh(pool.meteorCoreGeom, pool.meteorCrystalMat);
    crystalCore.rotation.x = Math.PI; // point downwards along trajectory
    mGroup.add(crystalCore);

    const whiteFlare = new THREE.Mesh(pool.meteorFlareGeom, pool.meteorWhiteFlareMat);
    mGroup.add(whiteFlare);

    const flameTail = new THREE.Mesh(pool.meteorFlameGeom, pool.meteorFlameMat);
    flameTail.position.y = 1.8;
    mGroup.add(flameTail);

    const travelDir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    mGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), travelDir);

    group.add(mGroup);

    meteors.push({
      mesh: mGroup,
      startPos,
      endPos,
      impactTime: 0.14 + idx * 0.12, // Staggered over ~1.0s: 0.14s, 0.26s, 0.38s, 0.50s, 0.62s, 0.74s, 0.86s, 0.98s
      hasImpacted: false,
    });

    // Reusable Shockwave Ring
    const swMesh = new THREE.Mesh(pool.shockwaveGeom, pool.shockwaveMat);
    swMesh.rotation.x = Math.PI / 2;
    swMesh.visible = false;
    group.add(swMesh);
    shockwavePool.push({ mesh: swMesh, timer: 0.45, maxRadius: idx === 7 ? 7.8 : 5.8, active: false });

    // Reusable Fissure Group
    const fGroup = new THREE.Group();
    for (let c = 0; c < 5; c++) {
      const crack = new THREE.Mesh(pool.crackGeom, pool.crackMat);
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = (c / 5) * Math.PI + (c * 0.2);
      fGroup.add(crack);
    }
    for (let s = 0; s < 4; s++) {
      const shard = new THREE.Mesh(pool.shardGeom, pool.shardMat);
      shard.position.set(((s % 2) - 0.5) * 1.2, 0.5, ((s > 1 ? 1 : 0) - 0.5) * 1.2);
      shard.rotation.z = (s - 1.5) * 0.25;
      fGroup.add(shard);
    }
    fGroup.visible = false;
    group.add(fGroup);
    fissurePool.push({ mesh: fGroup, timer: 1.6, active: false });
  });

  const triggerImpact = (idx: number, impactPos: THREE.Vector3, isLast: boolean) => {
    // 1. Activate Pooled Shockwave Ring
    const sw = shockwavePool[idx];
    if (sw) {
      sw.mesh.position.set(impactPos.x, impactPos.y + 0.08, impactPos.z);
      sw.mesh.scale.set(1, 1, 1);
      sw.mesh.visible = true;
      sw.timer = 0.45;
      sw.active = true;
    }

    // 2. Activate Pooled Fissure
    const f = fissurePool[idx];
    if (f) {
      f.mesh.position.set(impactPos.x, impactPos.y + 0.07, impactPos.z);
      f.mesh.visible = true;
      f.timer = 1.6;
      f.active = true;
    }

    // 3. Explosive Sparks Burst
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xf97316, isLast ? 32 : 18, 6.0);
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x38bdf8, isLast ? 22 : 12, 5.0);
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xffffff, isLast ? 16 : 8, 4.5);

    // Trigger game engine impact logic
    onImpact?.(impactPos, isLast, idx);
  };

  let elapsed = 0;
  const maxLifetime = 2.6;

  const update = (delta: number): boolean => {
    elapsed += delta;

    // 1. Update 8 falling meteors
    for (let i = 0; i < meteors.length; i++) {
      const m = meteors[i];
      if (m.hasImpacted) continue;

      if (elapsed < m.impactTime) {
        const t = elapsed / m.impactTime;
        m.mesh.position.lerpVectors(m.startPos, m.endPos, t);

        // Spark tail
        if (Math.random() > 0.45) {
          onSpawnSparks?.(m.mesh.position, 0xf97316, 2, 2.5);
          onSpawnSparks?.(m.mesh.position, 0x38bdf8, 1, 2.0);
        }
      } else {
        m.hasImpacted = true;
        m.mesh.visible = false;
        triggerImpact(i, m.endPos, i === meteors.length - 1);
      }
    }

    // 2. Pulse AOE Target Ring
    const pulse = 1.0 + Math.sin(elapsed * 12) * 0.04;
    aoeGroup.scale.set(pulse, 1, pulse);

    // 3. Update active shockwaves
    for (let i = 0; i < shockwavePool.length; i++) {
      const sw = shockwavePool[i];
      if (!sw.active) continue;
      sw.timer -= delta;
      const t = Math.max(0, sw.timer / 0.45);
      const scale = 1.0 + (1.0 - t) * (sw.maxRadius - 1.0);
      sw.mesh.scale.set(scale, scale, 1);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.95;

      if (sw.timer <= 0) {
        sw.active = false;
        sw.mesh.visible = false;
      }
    }

    // 4. Update active fissures
    for (let i = 0; i < fissurePool.length; i++) {
      const f = fissurePool[i];
      if (!f.active) continue;
      f.timer -= delta;
      const alpha = Math.max(0, f.timer / 1.6);
      f.mesh.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = alpha * 0.92;
      });

      if (f.timer <= 0) {
        f.active = false;
        f.mesh.visible = false;
      }
    }

    // 5. Fade out AOE Ring after all 8 meteors impact (t > 1.2s)
    if (elapsed > 1.1) {
      const aoeAlpha = Math.max(0, (maxLifetime - elapsed) / (maxLifetime - 1.1));
      pool.aoeRingMat.opacity = 0.9 * aoeAlpha;
      pool.aoeInnerRingMat.opacity = 0.75 * aoeAlpha;
      pool.aoeDiskMat.opacity = 0.22 * aoeAlpha;
    }

    if (elapsed >= maxLifetime) {
      // Reset material opacities for next cast
      pool.aoeRingMat.opacity = 0.9;
      pool.aoeInnerRingMat.opacity = 0.75;
      pool.aoeDiskMat.opacity = 0.22;
      if (group.parent) group.parent.remove(group);
      return false;
    }

    return true;
  };

  return { group, update };
}

