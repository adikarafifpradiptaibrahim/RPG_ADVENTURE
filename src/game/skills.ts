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
  cleanup: () => void;
}

/**
 * Singleton Static Geometries and Materials for Arcane Laser Beam
 * Pre-allocates all 3D geometries and materials so cast execution is 100% zero-lag at 60 FPS
 */
class ArcaneBeamResourcePool {
  private static instance: ArcaneBeamResourcePool | null = null;

  public circlePlaneGeom!: THREE.PlaneGeometry;
  public outerTorusGeom!: THREE.TorusGeometry;
  public innerTorusGeom!: THREE.TorusGeometry;
  public coreSphereGeom!: THREE.SphereGeometry;
  public crossHGeom!: THREE.PlaneGeometry;
  public crossVGeom!: THREE.PlaneGeometry;

  public coreCylGeom!: THREE.CylinderGeometry;
  public plasmaCylGeom!: THREE.CylinderGeometry;
  public shroudCylGeom!: THREE.CylinderGeometry;
  public ringGeom!: THREE.TorusGeometry;

  public impactCoreGeom!: THREE.SphereGeometry;
  public impactGlowGeom!: THREE.SphereGeometry;

  public circlePlaneMat!: THREE.MeshBasicMaterial;
  public outerTorusMat!: THREE.MeshBasicMaterial;
  public innerTorusMat!: THREE.MeshBasicMaterial;
  public coreSphereMat!: THREE.MeshBasicMaterial;
  public crossMat!: THREE.MeshBasicMaterial;

  public coreCylMat!: THREE.MeshBasicMaterial;
  public plasmaCylMat!: THREE.MeshBasicMaterial;
  public shroudCylMat!: THREE.MeshBasicMaterial;
  public ringMat!: THREE.MeshBasicMaterial;

  public impactCoreMat!: THREE.MeshBasicMaterial;
  public impactGlowMat!: THREE.MeshBasicMaterial;

  public isInitialized = false;

  public static get(): ArcaneBeamResourcePool {
    if (!ArcaneBeamResourcePool.instance) {
      ArcaneBeamResourcePool.instance = new ArcaneBeamResourcePool();
      ArcaneBeamResourcePool.instance.init();
    }
    return ArcaneBeamResourcePool.instance;
  }

  private init() {
    if (this.isInitialized) return;

    this.circlePlaneGeom = new THREE.PlaneGeometry(3.8, 3.8);
    this.outerTorusGeom = new THREE.TorusGeometry(1.75, 0.045, 8, 36);
    this.innerTorusGeom = new THREE.TorusGeometry(1.15, 0.035, 8, 28);
    this.coreSphereGeom = new THREE.SphereGeometry(0.38, 12, 12);
    this.crossHGeom = new THREE.PlaneGeometry(4.2, 0.14);
    this.crossVGeom = new THREE.PlaneGeometry(0.14, 4.2);

    this.coreCylGeom = new THREE.CylinderGeometry(0.14, 0.14, 32.0, 12, 1, true);
    this.plasmaCylGeom = new THREE.CylinderGeometry(0.38, 0.42, 32.0, 16, 1, true);
    this.shroudCylGeom = new THREE.CylinderGeometry(0.72, 0.80, 32.0, 16, 1, true);
    this.ringGeom = new THREE.TorusGeometry(0.55, 0.04, 6, 16);

    this.impactCoreGeom = new THREE.SphereGeometry(0.45, 12, 12);
    this.impactGlowGeom = new THREE.SphereGeometry(0.9, 12, 12);

    this.circlePlaneMat = new THREE.MeshBasicMaterial({
      map: getMageMagicCircleTexture(),
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.outerTorusMat = new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.innerTorusMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.coreSphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });

    this.crossMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.coreCylMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    this.plasmaCylMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.shroudCylMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.impactCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    this.impactGlowMat = new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.isInitialized = true;
  }
}

/**
 * Creates the Spectacular 3D Mage Arcane Laser Beam & Magic Circle VFX
 * Active duration: exactly 1.0 second (1000 ms).
 * Zero-Lag Implementation: All geometries and materials are pre-cached in ArcaneBeamResourcePool
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

  const pool = ArcaneBeamResourcePool.get();
  const fwd = rawDirection.clone().normalize();
  const group = new THREE.Group();

  // ----------------------------------------------------
  // 1. 3D MAGIC CIRCLE (Pre-allocated plane & toruses)
  // ----------------------------------------------------
  const magicCircleGroup = new THREE.Group();
  magicCircleGroup.position.copy(origin);
  magicCircleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd);

  const circlePlane = new THREE.Mesh(pool.circlePlaneGeom, pool.circlePlaneMat);
  magicCircleGroup.add(circlePlane);

  const outerTorus = new THREE.Mesh(pool.outerTorusGeom, pool.outerTorusMat);
  magicCircleGroup.add(outerTorus);

  const innerTorus = new THREE.Mesh(pool.innerTorusGeom, pool.innerTorusMat);
  magicCircleGroup.add(innerTorus);

  const coreSphere = new THREE.Mesh(pool.coreSphereGeom, pool.coreSphereMat);
  magicCircleGroup.add(coreSphere);

  const crossH = new THREE.Mesh(pool.crossHGeom, pool.crossMat);
  const crossV = new THREE.Mesh(pool.crossVGeom, pool.crossMat);
  magicCircleGroup.add(crossH, crossV);

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

  const coreCyl = new THREE.Mesh(pool.coreCylGeom, pool.coreCylMat);
  laserBeamGroup.add(coreCyl);

  const plasmaCyl = new THREE.Mesh(pool.plasmaCylGeom, pool.plasmaCylMat);
  laserBeamGroup.add(plasmaCyl);

  const shroudCyl = new THREE.Mesh(pool.shroudCylGeom, pool.shroudCylMat);
  laserBeamGroup.add(shroudCyl);

  const ringOffsets = [-beamLength * 0.35, -beamLength * 0.12, beamLength * 0.12, beamLength * 0.35];
  const ringMeshes: THREE.Mesh[] = [];
  ringOffsets.forEach((yOff) => {
    const ring = new THREE.Mesh(pool.ringGeom, pool.ringMat);
    ring.position.y = yOff;
    ring.rotation.x = Math.PI / 2;
    laserBeamGroup.add(ring);
    ringMeshes.push(ring);
  });

  const endPoint = origin.clone().addScaledVector(fwd, beamLength);
  const impactGroup = new THREE.Group();
  impactGroup.position.copy(endPoint);

  const impactCore = new THREE.Mesh(pool.impactCoreGeom, pool.impactCoreMat);
  impactGroup.add(impactCore);

  const impactGlow = new THREE.Mesh(pool.impactGlowGeom, pool.impactGlowMat);
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

  const cleanup = () => {
    // Reset material opacities for pooled reuse
    pool.circlePlaneMat.opacity = 0.95;
    pool.outerTorusMat.opacity = 0.85;
    pool.innerTorusMat.opacity = 0.8;
    pool.coreSphereMat.opacity = 0.98;
    pool.crossMat.opacity = 0.9;
    pool.coreCylMat.opacity = 1.0;
    pool.plasmaCylMat.opacity = 0.85;
    pool.shroudCylMat.opacity = 0.55;
    pool.ringMat.opacity = 0.85;
    pool.impactCoreMat.opacity = 0.95;
    pool.impactGlowMat.opacity = 0.75;
    beamLight.intensity = 0;

    if (group.parent) {
      group.parent.remove(group);
    }
  };

  const update = (delta: number): boolean => {
    timeLeft -= delta;
    elapsed += delta;

    if (timeLeft <= 0) {
      cleanup();
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
      pool.circlePlaneMat.opacity = 0.95 * alpha;
      pool.outerTorusMat.opacity = 0.85 * alpha;
      pool.innerTorusMat.opacity = 0.8 * alpha;
      pool.coreSphereMat.opacity = 0.98 * alpha;
      pool.crossMat.opacity = 0.9 * alpha;

      pool.coreCylMat.opacity = alpha;
      pool.plasmaCylMat.opacity = 0.85 * alpha;
      pool.shroudCylMat.opacity = 0.55 * alpha;
      pool.ringMat.opacity = 0.85 * alpha;

      pool.impactCoreMat.opacity = 0.95 * alpha;
      pool.impactGlowMat.opacity = 0.75 * alpha;
      beamLight.intensity = 4.5 * alpha;
    }

    return true;
  };

  return { group, update, cleanup };
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

  // 5b. Arcane Circuit Bus Conduits & Junction Nodes (Circuit Board Layout)
  ctx.save();
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 10;
  for (let b = 0; b < 8; b++) {
    const angle = (b / 8) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Primary bus rail from center core to outer circuit
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + cosA * 42, cy + sinA * 42);
    ctx.lineTo(cx + cosA * 210, cy + sinA * 210);
    ctx.stroke();

    // Circuit junction pads (golden circle nodes)
    [70, 115, 155].forEach((jr) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + cosA * jr, cy + sinA * jr, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx + cosA * jr, cy + sinA * jr, 6.0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 45-degree angled branching circuit traces to the 16 rune badges
    const bAngle1 = angle + Math.PI / 16;
    const bAngle2 = angle - Math.PI / 16;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + cosA * 115, cy + sinA * 115);
    ctx.lineTo(cx + Math.cos(bAngle1) * 176, cy + Math.sin(bAngle1) * 176);
    ctx.moveTo(cx + cosA * 115, cy + sinA * 115);
    ctx.lineTo(cx + Math.cos(bAngle2) * 176, cy + Math.sin(bAngle2) * 176);
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
// STARFALL CIRCUIT SHADER & PRE-ALLOCATED RESOURCE POOL
// ----------------------------------------------------

export const starfallCircuitVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const starfallCircuitFragmentShader = `
  uniform sampler2D uMap;
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uElectricColor;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - vec2(0.5);
    float dist = length(centered) * 2.0; // 0.0 at center node, 1.0 at outer circle
    if (dist > 0.995) discard;

    float angle = atan(centered.y, centered.x);

    // 8 primary radial circuit channels + 45-degree angled PCB bus traces
    float octant = abs(mod(angle + 3.14159265, 0.785398) - 0.392699);
    float conduitSpeedBonus = smoothstep(0.392699, 0.0, octant) * 0.15;

    // Manhattan grid branching traces
    vec2 gridPos = abs(centered) * 18.0;
    float circuitStep = (step(0.82, fract(gridPos.x)) + step(0.82, fract(gridPos.y))) * 0.07;

    // The expanding circuit wavefront from center outward
    float waveRadius = uProgress * 1.14;
    float localThreshold = dist - conduitSpeedBonus - circuitStep;

    // Outer perimeter bus unlocks once casting reaches 88%
    if (dist > 0.84 && uProgress < 0.88) {
      discard;
    }

    if (localThreshold > waveRadius) {
      discard;
    }

    vec4 tex = texture2D(uMap, vUv);

    // Dynamic Electric Arc Wavefront Spark at the branching tips
    float edgeDist = abs(waveRadius - localThreshold);
    if (edgeDist < 0.045 && uProgress > 0.015 && uProgress < 0.995) {
      float electricPulse = sin(dist * 60.0 - uTime * 28.0) * 0.5 + 0.5;
      float spark = (1.0 - edgeDist / 0.045) * (2.8 + electricPulse * 1.5);
      tex.rgb += uElectricColor * spark;
      tex.a = max(tex.a, 0.96);
    }

    // Central node power core intense glow
    if (dist < 0.2) {
      tex.rgb += vec3(1.0, 0.95, 0.7) * (0.8 + 0.4 * sin(uTime * 15.0));
    }

    tex.a *= uOpacity;
    gl_FragColor = tex;
  }
`;

// Backward-compatible shader aliases
export const starfallRadialVertexShader = starfallCircuitVertexShader;
export const starfallRadialFragmentShader = starfallCircuitFragmentShader;

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

    // Expanded AOE Target Zone Geometries (radius 10.5)
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
 * Preloads and compiles all Mage Skill Shaders and Geometries (Arcane Beam + Starfall) into WebGL context
 * Called once during gameEngine initialization to guarantee 60 FPS without any GC pauses or shader compile stutter
 */
export function preloadMageVfxPool(scene: THREE.Scene, renderer?: THREE.WebGLRenderer, camera?: THREE.Camera) {
  const starfallPool = StarfallResourcePool.get();
  const arcanePool = ArcaneBeamResourcePool.get();

  getStarfallMagicCircleTexture();
  getMageMagicCircleTexture();

  if (renderer && camera) {
    const dummyGroup = new THREE.Group();

    // Starfall Circuit Shader Material Pre-compilation
    const starfallMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: getStarfallMagicCircleTexture() },
        uProgress: { value: 0.5 },
        uOpacity: { value: 1.0 },
        uElectricColor: { value: new THREE.Vector3(1.0, 0.95, 0.7) },
        uTime: { value: 0.0 },
      },
      vertexShader: starfallCircuitVertexShader,
      fragmentShader: starfallCircuitFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    dummyGroup.add(new THREE.Mesh(starfallPool.circlePlaneGeom, starfallMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.outerTorusGeom, starfallPool.outerTorusMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.innerTorusGeom, starfallPool.innerTorusMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.auraCylGeom, starfallPool.auraCylMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.aoeRingGeom, starfallPool.aoeRingMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.aoeDiskGeom, starfallPool.aoeDiskMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.meteorCoreGeom, starfallPool.meteorCrystalMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.meteorFlameGeom, starfallPool.meteorFlameMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.shockwaveGeom, starfallPool.shockwaveMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.crackGeom, starfallPool.crackMat));

    // Arcane Laser Beam Material Pre-compilation
    dummyGroup.add(new THREE.Mesh(arcanePool.circlePlaneGeom, arcanePool.circlePlaneMat));
    dummyGroup.add(new THREE.Mesh(arcanePool.coreCylGeom, arcanePool.coreCylMat));
    dummyGroup.add(new THREE.Mesh(arcanePool.plasmaCylGeom, arcanePool.plasmaCylMat));
    dummyGroup.add(new THREE.Mesh(arcanePool.shroudCylGeom, arcanePool.shroudCylMat));
    dummyGroup.add(new THREE.Mesh(arcanePool.ringGeom, arcanePool.ringMat));

    scene.add(dummyGroup);
    try {
      renderer.compile(scene, camera);
    } catch {}
    scene.remove(dummyGroup);
  }
}

export const preloadStarfallPool = preloadMageVfxPool;

export interface StarfallCastingCircleInstance {
  group: THREE.Group;
  update: (delta: number, currentPos?: THREE.Vector3) => boolean;
  cleanup: () => void;
}

/**
 * Creates the Gradual 1.5s Starfall Magic Circle with Circuit Stroke Reveal Animation
 * - Energy traces from the center node under the player's feet, branching outward like a circuit board
 * - At 1.5s: circuit locks and full outer boundary ring forms
 * - Self-cleaning: aura cylinder and all meshes are reliably removed on completion
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

  // Circuit Stroke Reveal Shader Material
  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uElectricColor: { value: new THREE.Vector3(1.0, 0.95, 0.65) },
      uTime: { value: 0.0 },
    },
    vertexShader: starfallCircuitVertexShader,
    fragmentShader: starfallCircuitFragmentShader,
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
  outerTorus.scale.set(0.01, 0.01, 0.01);
  group.add(outerTorus);

  // Middle Cyan/White Counter-Rotating Torus Ring
  const innerTorus = new THREE.Mesh(pool.innerTorusGeom, pool.innerTorusMat);
  innerTorus.rotation.x = Math.PI / 2;
  innerTorus.scale.set(0.01, 0.01, 0.01);
  group.add(innerTorus);

  // Vertical Aura Light Cylinder (Wells up from ground in sync with circuit power)
  const auraCyl = new THREE.Mesh(pool.auraCylGeom, pool.auraCylMat);
  auraCyl.scale.set(1, 0.01, 1);
  auraCyl.position.y = 0.05;
  group.add(auraCyl);

  // 4 Circuit Branch Node Sparks traveling outward along cardinal circuit conduits
  const circuitSparks: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(pool.sparkGeom, pool.leadingSparkMat);
    sp.position.set(0, 0.08, 0);
    group.add(sp);
    circuitSparks.push(sp);
  }

  // Dynamic Golden PointLight
  const circleLight = new THREE.PointLight(0xfacc15, 0.0, 10.0);
  circleLight.position.set(0, 1.2, 0);
  group.add(circleLight);

  let elapsed = 0;
  let sparkTimer = 0;
  let isFadingOut = false;
  let fadeOutTimer = 0.22;

  const cleanup = () => {
    // Thoroughly reset opacities and remove all meshes to prevent lingering visual ghosts
    pool.auraCylMat.opacity = 0;
    shaderMat.uniforms.uOpacity.value = 0;
    circleLight.intensity = 0;

    circuitSparks.forEach((sp) => group.remove(sp));
    group.remove(auraCyl);
    group.remove(outerTorus);
    group.remove(innerTorus);
    group.remove(circlePlane);
    group.remove(circleLight);

    if (group.parent) {
      group.parent.remove(group);
    }
  };

  const update = (delta: number, currentPos?: THREE.Vector3): boolean => {
    elapsed += delta;
    if (currentPos) {
      group.position.set(currentPos.x, currentPos.y + 0.05, currentPos.z);
    }

    shaderMat.uniforms.uTime.value = elapsed;

    // Torus rotations
    outerTorus.rotation.z += delta * 1.5;
    innerTorus.rotation.z -= delta * 1.2;
    auraCyl.rotation.y += delta * 0.8;

    if (!isFadingOut) {
      // Circuit Stroke Reveal Progress (0.0 to 1.0 over exactly 1.5s)
      const progress = Math.min(1.0, elapsed / duration);
      shaderMat.uniforms.uProgress.value = progress;
      shaderMat.uniforms.uOpacity.value = 1.0;

      // Vertical yellow cylinder rises smoothly from ground up to 4 units
      const cylHeightScale = Math.min(1.0, progress * 1.15);
      auraCyl.scale.set(1, cylHeightScale, 1);
      auraCyl.position.y = (cylHeightScale * 4.0) / 2.0;
      pool.auraCylMat.opacity = 0.22 * Math.min(1.0, progress * 1.2);

      // Torus rings scale outward as circuit wavefront reaches them
      if (progress >= 0.5) {
        const innerScale = Math.min(1.0, (progress - 0.5) / 0.3);
        innerTorus.scale.set(innerScale, innerScale, 1);
      }
      if (progress >= 0.85) {
        const outerScale = Math.min(1.0, (progress - 0.85) / 0.15);
        outerTorus.scale.set(outerScale, outerScale, 1);
      }

      // 4 Circuit Node Sparks traveling from center (r = 0.1) out to perimeter (r = 3.0)
      const sparkRadius = Math.min(3.0, progress * 3.1);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        circuitSparks[i].position.set(Math.cos(a) * sparkRadius, 0.08, Math.sin(a) * sparkRadius);
      }

      circleLight.intensity = progress * 4.8;

      // Emit continuous golden & electric white sparks at the circuit branch tips
      sparkTimer += delta;
      if (sparkTimer >= 0.035) {
        sparkTimer = 0;
        for (let i = 0; i < 4; i++) {
          const spPos = group.position.clone().add(circuitSparks[i].position);
          onSpawnSparks?.(spPos, 0xfacc15, 2, 2.8);
          onSpawnSparks?.(spPos, 0xffffff, 1, 2.0);
        }
      }

      if (elapsed >= duration) {
        isFadingOut = true;
        circuitSparks.forEach((sp) => (sp.visible = false));
      }
    } else {
      // Smooth fade out after 1.5s
      fadeOutTimer -= delta;
      const alpha = Math.max(0, fadeOutTimer / 0.22);
      shaderMat.uniforms.uOpacity.value = alpha;
      circleLight.intensity = 4.8 * alpha;
      pool.auraCylMat.opacity = 0.22 * alpha;

      if (fadeOutTimer <= 0) {
        cleanup();
        return false;
      }
    }

    return true;
  };

  return { group, update, cleanup };
}

export interface StarfallMeteorBarrageInstance {
  group: THREE.Group;
  update: (delta: number) => boolean;
  cleanup: () => void;
}

/**
 * Creates the Expanded 10-Meteor Continuous 2.0s Starfall Barrage (image_68.png)
 * - Target Red Zone offset in front of character (14.5 units ahead, completely safe from player's feet)
 * - Continuous staggered volley of 10 meteors raining down across 2.0 full seconds
 * - Pooled Zero-GC execution with complete cleanup
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

  // 2. Pre-allocated 10 Meteors Clustered across the target area (Safe forward zone)
  interface MeteorItem {
    mesh: THREE.Group;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    impactTime: number;
    hasImpacted: boolean;
  }

  const meteorOffsets: [number, number][] = [
    [-3.8, 1.5],   // 1. Forward left
    [4.2, 2.0],    // 2. Forward right
    [0.5, 4.8],    // 3. Deep north
    [-4.5, -0.5],  // 4. Mid left
    [4.6, 0.2],    // 5. Mid right
    [-1.8, 5.2],   // 6. Deep north-left
    [2.4, 3.5],    // 7. North-right
    [-2.6, 2.8],   // 8. Inner left
    [3.2, 4.6],    // 9. North-east
    [0.0, 1.2],    // 10. GRAND FINALE - Direct Center Bullseye!
  ];

  const skyOffset = new THREE.Vector3(-18, 52, -14); // Diagonal sky trajectory
  const meteors: MeteorItem[] = [];

  // Shockwave & Crater impact pool (10 reusable instances)
  const shockwavePool: { mesh: THREE.Mesh; timer: number; maxRadius: number; active: boolean }[] = [];
  const fissurePool: { mesh: THREE.Group; timer: number; active: boolean }[] = [];

  meteorOffsets.forEach(([ox, oz], idx) => {
    const endPos = targetCenter.clone().add(new THREE.Vector3(ox, 0, oz));
    const startPos = endPos.clone().add(skyOffset).add(new THREE.Vector3((idx - 4.5) * 2.0, 0, (idx - 4.5) * 1.4));

    // Meteor Group using pooled geometries and materials
    const mGroup = new THREE.Group();
    mGroup.position.copy(startPos);

    const crystalCore = new THREE.Mesh(pool.meteorCoreGeom, pool.meteorCrystalMat);
    crystalCore.rotation.x = Math.PI;
    mGroup.add(crystalCore);

    const whiteFlare = new THREE.Mesh(pool.meteorFlareGeom, pool.meteorWhiteFlareMat);
    mGroup.add(whiteFlare);

    const flameTail = new THREE.Mesh(pool.meteorFlameGeom, pool.meteorFlameMat);
    flameTail.position.y = 1.8;
    mGroup.add(flameTail);

    const travelDir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    mGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), travelDir);

    group.add(mGroup);

    // Staggered continuously over 2.0 full seconds: 0.20s to 2.00s!
    meteors.push({
      mesh: mGroup,
      startPos,
      endPos,
      impactTime: 0.20 + idx * 0.20,
      hasImpacted: false,
    });

    // Reusable Shockwave Ring
    const swMesh = new THREE.Mesh(pool.shockwaveGeom, pool.shockwaveMat);
    swMesh.rotation.x = Math.PI / 2;
    swMesh.visible = false;
    group.add(swMesh);
    shockwavePool.push({ mesh: swMesh, timer: 0.45, maxRadius: idx === 9 ? 8.2 : 5.8, active: false });

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
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xf97316, isLast ? 36 : 18, 6.0);
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x38bdf8, isLast ? 24 : 12, 5.0);
    onSpawnSparks?.(impactPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xffffff, isLast ? 18 : 8, 4.5);

    // Trigger game engine impact logic
    onImpact?.(impactPos, isLast, idx);
  };

  let elapsed = 0;
  const maxLifetime = 3.0; // 2.0s continuous meteor barrage + 1.0s crater dissipation

  const cleanup = () => {
    pool.aoeRingMat.opacity = 0.9;
    pool.aoeInnerRingMat.opacity = 0.75;
    pool.aoeDiskMat.opacity = 0.22;

    shockwavePool.forEach((sw) => {
      sw.active = false;
      sw.mesh.visible = false;
    });

    fissurePool.forEach((f) => {
      f.active = false;
      f.mesh.visible = false;
    });

    meteors.forEach((m) => {
      m.mesh.visible = false;
    });

    if (group.parent) {
      group.parent.remove(group);
    }
  };

  const update = (delta: number): boolean => {
    elapsed += delta;

    // 1. Update 10 falling meteors across 2.0s
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

    // 2. Pulse AOE Target Ring continuously through the full 2.0s barrage
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

    // 5. Fade out AOE Ring after all 10 meteors impact (t > 2.0s)
    if (elapsed > 2.0) {
      const aoeAlpha = Math.max(0, (maxLifetime - elapsed) / (maxLifetime - 2.0));
      pool.aoeRingMat.opacity = 0.9 * aoeAlpha;
      pool.aoeInnerRingMat.opacity = 0.75 * aoeAlpha;
      pool.aoeDiskMat.opacity = 0.22 * aoeAlpha;
    }

    if (elapsed >= maxLifetime) {
      cleanup();
      return false;
    }

    return true;
  };

  return { group, update, cleanup };
}

