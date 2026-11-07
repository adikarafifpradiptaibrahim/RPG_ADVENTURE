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
  getOrigin?: () => { origin: THREE.Vector3; direction?: THREE.Vector3 };
  onHitTick?: (isTick: boolean) => void;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): MageLaserBeamVfxInstance {
  const {
    origin,
    direction: rawDirection,
    beamLength = 32.0,
    duration = 1.0,
    getOrigin,
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

    // Dynamic position tracking: Keep Magic Circle and beam glued to staff crystal
    if (getOrigin) {
      const dynamic = getOrigin();
      origin.copy(dynamic.origin);
      if (dynamic.direction) {
        fwd.copy(dynamic.direction).normalize();
      }
      magicCircleGroup.position.copy(origin);
      magicCircleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd);

      const beamCenter = origin.clone().addScaledVector(fwd, beamLength / 2);
      laserBeamGroup.position.copy(beamCenter);
      laserBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fwd);

      const endPoint = origin.clone().addScaledVector(fwd, beamLength);
      impactGroup.position.copy(endPoint);
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

export interface StarfallCastingCircleInstance {
  group: THREE.Group;
  update: (delta: number, currentPos?: THREE.Vector3) => boolean;
  cleanup: () => void;
  readonly isActive: boolean;
  activate: (
    playerPos: THREE.Vector3,
    duration?: number,
    onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void
  ) => void;
}

export interface StarfallMeteorBarrageInstance {
  group: THREE.Group;
  update: (delta: number) => boolean;
  cleanup: () => void;
  readonly isActive: boolean;
  activate: (
    targetCenter: THREE.Vector3,
    onImpact?: (impactPos: THREE.Vector3, isLast: boolean, index: number) => void,
    onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void
  ) => void;
}

/**
 * Singleton Static Geometries, Materials & Object Pools for Starfall
 * Eliminates garbage collection spikes and runtime shader compiling freezes at 60 FPS
 */
export class StarfallResourcePool {
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
  public baseShaderMat!: THREE.ShaderMaterial;

  public isInitialized = false;

  private castingCirclePool: StarfallCastingCircleInstance[] = [];
  private meteorBarragePool: StarfallMeteorBarrageInstance[] = [];

  public static get(): StarfallResourcePool {
    if (!StarfallResourcePool.instance) {
      StarfallResourcePool.instance = new StarfallResourcePool();
      StarfallResourcePool.instance.init();
    }
    return StarfallResourcePool.instance;
  }

  private init() {
    if (this.isInitialized) return;

    // 1. Magic Circle Geometries
    this.circlePlaneGeom = new THREE.PlaneGeometry(6.6, 6.6);
    this.outerTorusGeom = new THREE.TorusGeometry(3.0, 0.045, 8, 48);
    this.innerTorusGeom = new THREE.TorusGeometry(1.9, 0.035, 8, 36);
    this.auraCylGeom = new THREE.CylinderGeometry(2.7, 3.0, 4.0, 24, 1, true);
    this.sparkGeom = new THREE.SphereGeometry(0.18, 8, 8);

    // 2. Expanded AOE Target Zone Geometries (radius 10.5)
    this.aoeRingGeom = new THREE.TorusGeometry(10.5, 0.14, 8, 56);
    this.aoeInnerRingGeom = new THREE.TorusGeometry(9.6, 0.06, 8, 48);
    this.aoeDiskGeom = new THREE.PlaneGeometry(21.0, 21.0);

    // 3. Meteor Geometries
    this.meteorCoreGeom = new THREE.ConeGeometry(0.75, 2.8, 6);
    this.meteorFlareGeom = new THREE.SphereGeometry(0.6, 8, 8);
    this.meteorFlameGeom = new THREE.ConeGeometry(1.3, 4.8, 8);

    // 4. Impact Geometries
    this.shockwaveGeom = new THREE.TorusGeometry(1.0, 0.16, 8, 32);
    this.crackGeom = new THREE.PlaneGeometry(0.3, 3.8);
    this.shardGeom = new THREE.ConeGeometry(0.32, 1.6, 5);

    // 5. Shared Materials
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

    // 6. Base Circuit Shader Material
    this.baseShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: getStarfallMagicCircleTexture() },
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

    // 7. Pre-instantiate 2 reusable Casting Circle instances and 2 Barrage instances in pool
    for (let i = 0; i < 2; i++) {
      this.castingCirclePool.push(this.buildCastingCircleInstance());
      this.meteorBarragePool.push(this.buildMeteorBarrageInstance());
    }

    this.isInitialized = true;
  }

  private buildCastingCircleInstance(): StarfallCastingCircleInstance {
    const group = new THREE.Group();
    group.visible = false;

    const shaderMat = this.baseShaderMat.clone();

    const circlePlane = new THREE.Mesh(this.circlePlaneGeom, shaderMat);
    circlePlane.rotation.x = -Math.PI / 2;
    group.add(circlePlane);

    const outerTorusMat = this.outerTorusMat.clone();
    const outerTorus = new THREE.Mesh(this.outerTorusGeom, outerTorusMat);
    outerTorus.rotation.x = Math.PI / 2;
    outerTorus.scale.set(0.01, 0.01, 0.01);
    group.add(outerTorus);

    const innerTorusMat = this.innerTorusMat.clone();
    const innerTorus = new THREE.Mesh(this.innerTorusGeom, innerTorusMat);
    innerTorus.rotation.x = Math.PI / 2;
    innerTorus.scale.set(0.01, 0.01, 0.01);
    group.add(innerTorus);

    const auraCylMat = this.auraCylMat.clone();
    const auraCyl = new THREE.Mesh(this.auraCylGeom, auraCylMat);
    auraCyl.scale.set(1, 0.01, 1);
    auraCyl.position.y = 0.05;
    group.add(auraCyl);

    const circuitSparks: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(this.sparkGeom, this.leadingSparkMat);
      sp.position.set(0, 0.08, 0);
      group.add(sp);
      circuitSparks.push(sp);
    }

    const circleLight = new THREE.PointLight(0xfacc15, 0.0, 10.0);
    circleLight.position.set(0, 1.2, 0);
    group.add(circleLight);

    let elapsed = 0;
    let sparkTimer = 0;
    let isActive = false;
    let castDuration = 1.0;
    const holdDuration = 2.0; // 2.0s continuous meteor shower active hold
    const fadeDuration = 0.5; // 0.5s smooth fadeout
    const totalDuration = castDuration + holdDuration + fadeDuration; // 3.5s total visual lifespan
    let spawnSparksCb: ((pos: THREE.Vector3, color: number, count: number, speed: number) => void) | undefined;

    const cleanup = () => {
      isActive = false;
      group.visible = false;
      shaderMat.uniforms.uOpacity.value = 0;
      shaderMat.uniforms.uProgress.value = 0;
      circleLight.intensity = 0;
      auraCylMat.opacity = 0;
      outerTorusMat.opacity = 0.85;
      innerTorusMat.opacity = 0.75;
      circuitSparks.forEach((sp) => (sp.visible = false));
      if (group.parent) {
        group.parent.remove(group);
      }
    };

    const activate = (
      playerPos: THREE.Vector3,
      duration = 1.0,
      onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void
    ) => {
      elapsed = 0;
      sparkTimer = 0;
      isActive = true;
      castDuration = duration;
      spawnSparksCb = onSpawnSparks;

      group.position.set(playerPos.x, playerPos.y + 0.05, playerPos.z);
      group.visible = true;

      circlePlane.visible = true;
      outerTorus.visible = true;
      innerTorus.visible = true;
      auraCyl.visible = true;

      outerTorus.scale.set(0.01, 0.01, 0.01);
      innerTorus.scale.set(0.01, 0.01, 0.01);
      auraCyl.scale.set(1, 0.01, 1);
      auraCyl.position.y = 0.05;

      outerTorusMat.opacity = 0.85;
      innerTorusMat.opacity = 0.75;
      auraCylMat.opacity = 0;

      shaderMat.uniforms.uProgress.value = 0.0;
      shaderMat.uniforms.uOpacity.value = 1.0;
      shaderMat.uniforms.uTime.value = 0.0;
      circleLight.intensity = 0.0;

      circuitSparks.forEach((sp) => {
        sp.position.set(0, 0.08, 0);
        sp.visible = true;
      });
    };

    const update = (delta: number, currentPos?: THREE.Vector3): boolean => {
      if (!isActive) return false;

      elapsed += delta;

      // Track player feet position during casting phase (0.0s to 1.0s)
      if (elapsed <= castDuration && currentPos) {
        group.position.set(currentPos.x, currentPos.y + 0.05, currentPos.z);
      }

      shaderMat.uniforms.uTime.value = elapsed;

      // Torus & aura rotations
      outerTorus.rotation.z += delta * 1.5;
      innerTorus.rotation.z -= delta * 1.2;
      auraCyl.rotation.y += delta * 0.8;

      if (elapsed <= castDuration) {
        // Phase 1: Circuit Stroke Reveal (0.0 to 1.0 over exactly 1.0s)
        const progress = Math.min(1.0, elapsed / castDuration);
        shaderMat.uniforms.uProgress.value = progress;
        shaderMat.uniforms.uOpacity.value = 1.0;

        const cylHeightScale = Math.min(1.0, progress * 1.15);
        auraCyl.scale.set(1, cylHeightScale, 1);
        auraCyl.position.y = (cylHeightScale * 4.0) / 2.0;
        auraCylMat.opacity = 0.22 * Math.min(1.0, progress * 1.2);

        if (progress >= 0.5) {
          const innerScale = Math.min(1.0, (progress - 0.5) / 0.3);
          innerTorus.scale.set(innerScale, innerScale, 1);
        }
        if (progress >= 0.85) {
          const outerScale = Math.min(1.0, (progress - 0.85) / 0.15);
          outerTorus.scale.set(outerScale, outerScale, 1);
        }

        const sparkRadius = Math.min(3.0, progress * 3.1);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          circuitSparks[i].position.set(Math.cos(a) * sparkRadius, 0.08, Math.sin(a) * sparkRadius);
          circuitSparks[i].visible = true;
        }

        circleLight.intensity = progress * 4.8;

        sparkTimer += delta;
        if (sparkTimer >= 0.035) {
          sparkTimer = 0;
          for (let i = 0; i < 4; i++) {
            const spPos = group.position.clone().add(circuitSparks[i].position);
            spawnSparksCb?.(spPos, 0xfacc15, 2, 2.8);
            spawnSparksCb?.(spPos, 0xffffff, 1, 2.0);
          }
        }
      } else if (elapsed <= castDuration + holdDuration) {
        // Phase 2: Active Meteor Shower (1.0s to 3.0s, full 2.0s continuous barrage hold)
        shaderMat.uniforms.uProgress.value = 1.0;
        shaderMat.uniforms.uOpacity.value = 1.0;

        auraCyl.scale.set(1, 1.0, 1);
        auraCyl.position.y = 2.0;
        auraCylMat.opacity = 0.22;

        innerTorus.scale.set(1, 1, 1);
        outerTorus.scale.set(1, 1, 1);
        outerTorusMat.opacity = 0.85;
        innerTorusMat.opacity = 0.75;

        circleLight.intensity = 4.8;

        // Dynamic orbiting celestial sparks at perimeter
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + elapsed * 2.5;
          circuitSparks[i].position.set(Math.cos(a) * 3.0, 0.08, Math.sin(a) * 3.0);
          circuitSparks[i].visible = true;
        }

        sparkTimer += delta;
        if (sparkTimer >= 0.06) {
          sparkTimer = 0;
          for (let i = 0; i < 4; i++) {
            const spPos = group.position.clone().add(circuitSparks[i].position);
            spawnSparksCb?.(spPos, 0xfacc15, 1, 2.0);
          }
        }
      } else {
        // Phase 3: Smooth 0.5s Fade Out (3.0s to 3.5s total lifespan)
        const fadeElapsed = elapsed - (castDuration + holdDuration);
        const alpha = Math.max(0.0, 1.0 - fadeElapsed / fadeDuration);

        shaderMat.uniforms.uProgress.value = 1.0;
        shaderMat.uniforms.uOpacity.value = alpha;

        circleLight.intensity = 4.8 * alpha;
        auraCylMat.opacity = 0.22 * alpha;
        outerTorusMat.opacity = 0.85 * alpha;
        innerTorusMat.opacity = 0.75 * alpha;

        circuitSparks.forEach((sp) => (sp.visible = false));

        if (elapsed >= totalDuration) {
          cleanup();
          return false;
        }
      }

      return true;
    };

    return {
      group,
      get isActive() {
        return isActive;
      },
      activate,
      update,
      cleanup,
    };
  }

  private buildMeteorBarrageInstance(): StarfallMeteorBarrageInstance {
    const group = new THREE.Group();
    group.visible = false;

    // 1. AOE Target Group on Ground (Radius 10.5 units)
    const aoeGroup = new THREE.Group();
    const aoeRingMat = this.aoeRingMat.clone();
    const aoeRing = new THREE.Mesh(this.aoeRingGeom, aoeRingMat);
    aoeRing.rotation.x = Math.PI / 2;
    aoeGroup.add(aoeRing);

    const aoeInnerRingMat = this.aoeInnerRingMat.clone();
    const aoeInnerRing = new THREE.Mesh(this.aoeInnerRingGeom, aoeInnerRingMat);
    aoeInnerRing.rotation.x = Math.PI / 2;
    aoeGroup.add(aoeInnerRing);

    const aoeDiskMat = this.aoeDiskMat.clone();
    const aoeDisk = new THREE.Mesh(this.aoeDiskGeom, aoeDiskMat);
    aoeDisk.rotation.x = -Math.PI / 2;
    aoeGroup.add(aoeDisk);

    group.add(aoeGroup);

    // 2. 10 Pre-allocated Meteors
    interface MeteorItem {
      mesh: THREE.Group;
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      impactTime: number;
      hasImpacted: boolean;
    }

    const meteors: MeteorItem[] = [];
    const shockwaves: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; timer: number; maxRadius: number; active: boolean }[] = [];
    const fissures: { mesh: THREE.Group; crackMat: THREE.MeshBasicMaterial; shardMat: THREE.MeshBasicMaterial; timer: number; active: boolean }[] = [];

    for (let idx = 0; idx < 10; idx++) {
      const mGroup = new THREE.Group();
      const crystalCore = new THREE.Mesh(this.meteorCoreGeom, this.meteorCrystalMat);
      crystalCore.rotation.x = Math.PI;
      mGroup.add(crystalCore);

      const whiteFlare = new THREE.Mesh(this.meteorFlareGeom, this.meteorWhiteFlareMat);
      mGroup.add(whiteFlare);

      const flameTail = new THREE.Mesh(this.meteorFlameGeom, this.meteorFlameMat);
      flameTail.position.y = 1.8;
      mGroup.add(flameTail);

      mGroup.visible = false;
      group.add(mGroup);

      meteors.push({
        mesh: mGroup,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        impactTime: 0,
        hasImpacted: false,
      });

      // Shockwave Ring
      const swMat = this.shockwaveMat.clone();
      const swMesh = new THREE.Mesh(this.shockwaveGeom, swMat);
      swMesh.rotation.x = Math.PI / 2;
      swMesh.visible = false;
      group.add(swMesh);
      shockwaves.push({ mesh: swMesh, mat: swMat, timer: 0.45, maxRadius: idx === 9 ? 8.2 : 5.8, active: false });

      // Fissure Group
      const fGroup = new THREE.Group();
      const cMat = this.crackMat.clone();
      const sMat = this.shardMat.clone();
      for (let c = 0; c < 5; c++) {
        const crack = new THREE.Mesh(this.crackGeom, cMat);
        crack.rotation.x = -Math.PI / 2;
        crack.rotation.z = (c / 5) * Math.PI + c * 0.2;
        fGroup.add(crack);
      }
      for (let s = 0; s < 4; s++) {
        const shard = new THREE.Mesh(this.shardGeom, sMat);
        shard.position.set(((s % 2) - 0.5) * 1.2, 0.5, ((s > 1 ? 1 : 0) - 0.5) * 1.2);
        shard.rotation.z = (s - 1.5) * 0.25;
        fGroup.add(shard);
      }
      fGroup.visible = false;
      group.add(fGroup);
      fissures.push({ mesh: fGroup, crackMat: cMat, shardMat: sMat, timer: 1.6, active: false });
    }

    let elapsed = 0;
    let isActive = false;
    const maxLifetime = 3.0; // 2.0s barrage + 1.0s crater dissipation
    let onImpactCb: ((impactPos: THREE.Vector3, isLast: boolean, index: number) => void) | undefined;
    let onSpawnSparksCb: ((pos: THREE.Vector3, color: number, count: number, speed: number) => void) | undefined;

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
    const skyOffset = new THREE.Vector3(-18, 52, -14);

    const cleanup = () => {
      isActive = false;
      group.visible = false;
      aoeRingMat.opacity = 0.9;
      aoeInnerRingMat.opacity = 0.75;
      aoeDiskMat.opacity = 0.22;

      shockwaves.forEach((sw) => {
        sw.active = false;
        sw.mesh.visible = false;
      });

      fissures.forEach((f) => {
        f.active = false;
        f.mesh.visible = false;
      });

      meteors.forEach((m) => {
        m.mesh.visible = false;
        m.hasImpacted = true;
      });

      if (group.parent) {
        group.parent.remove(group);
      }
    };

    const activate = (
      targetCenter: THREE.Vector3,
      onImpact?: (impactPos: THREE.Vector3, isLast: boolean, index: number) => void,
      onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void
    ) => {
      elapsed = 0;
      isActive = true;
      onImpactCb = onImpact;
      onSpawnSparksCb = onSpawnSparks;

      group.visible = true;
      aoeGroup.visible = true;
      aoeGroup.position.set(targetCenter.x, targetCenter.y + 0.05, targetCenter.z);

      aoeRingMat.opacity = 0.9;
      aoeInnerRingMat.opacity = 0.75;
      aoeDiskMat.opacity = 0.22;

      meteorOffsets.forEach(([ox, oz], idx) => {
        const m = meteors[idx];
        m.endPos.set(targetCenter.x + ox, targetCenter.y, targetCenter.z + oz);
        m.startPos.copy(m.endPos).add(skyOffset).add(new THREE.Vector3((idx - 4.5) * 2.0, 0, (idx - 4.5) * 1.4));
        m.impactTime = 0.18 + idx * 0.185; // Continuous staggered impact across 2.0s!
        m.hasImpacted = false;
        m.mesh.position.copy(m.startPos);

        const travelDir = new THREE.Vector3().subVectors(m.endPos, m.startPos).normalize();
        m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), travelDir);
        m.mesh.visible = true;

        shockwaves[idx].active = false;
        shockwaves[idx].mesh.visible = false;
        fissures[idx].active = false;
        fissures[idx].mesh.visible = false;
      });
    };

    const triggerImpact = (idx: number, impactPos: THREE.Vector3, isLast: boolean) => {
      const sw = shockwaves[idx];
      if (sw) {
        sw.mesh.position.set(impactPos.x, impactPos.y + 0.08, impactPos.z);
        sw.mesh.scale.set(1, 1, 1);
        sw.mesh.visible = true;
        sw.timer = 0.45;
        sw.active = true;
      }

      const f = fissures[idx];
      if (f) {
        f.mesh.position.set(impactPos.x, impactPos.y + 0.07, impactPos.z);
        f.mesh.visible = true;
        f.timer = 1.6;
        f.active = true;
      }

      onSpawnSparksCb?.(impactPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xf97316, isLast ? 36 : 18, 6.0);
      onSpawnSparksCb?.(impactPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x38bdf8, isLast ? 24 : 12, 5.0);
      onSpawnSparksCb?.(impactPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xffffff, isLast ? 18 : 8, 4.5);

      onImpactCb?.(impactPos, isLast, idx);
    };

    const update = (delta: number): boolean => {
      if (!isActive) return false;

      elapsed += delta;

      // 1. Update 10 falling meteors across 2.0s
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];
        if (m.hasImpacted) continue;

        if (elapsed < m.impactTime) {
          const t = elapsed / m.impactTime;
          m.mesh.position.lerpVectors(m.startPos, m.endPos, t);

          if (Math.random() > 0.45) {
            onSpawnSparksCb?.(m.mesh.position, 0xf97316, 2, 2.5);
            onSpawnSparksCb?.(m.mesh.position, 0x38bdf8, 1, 2.0);
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
      for (let i = 0; i < shockwaves.length; i++) {
        const sw = shockwaves[i];
        if (!sw.active) continue;
        sw.timer -= delta;
        const t = Math.max(0, sw.timer / 0.45);
        const scale = 1.0 + (1.0 - t) * (sw.maxRadius - 1.0);
        sw.mesh.scale.set(scale, scale, 1);
        sw.mat.opacity = t * 0.95;

        if (sw.timer <= 0) {
          sw.active = false;
          sw.mesh.visible = false;
        }
      }

      // 4. Update active fissures
      for (let i = 0; i < fissures.length; i++) {
        const f = fissures[i];
        if (!f.active) continue;
        f.timer -= delta;
        const alpha = Math.max(0, f.timer / 1.6);
        f.crackMat.opacity = alpha * 0.95;
        f.shardMat.opacity = alpha * 0.92;

        if (f.timer <= 0) {
          f.active = false;
          f.mesh.visible = false;
        }
      }

      // 5. Fade out AOE Ring after all 10 meteors impact (t > 2.0s)
      if (elapsed > 2.0) {
        const aoeAlpha = Math.max(0, (maxLifetime - elapsed) / (maxLifetime - 2.0));
        aoeRingMat.opacity = 0.9 * aoeAlpha;
        aoeInnerRingMat.opacity = 0.75 * aoeAlpha;
        aoeDiskMat.opacity = 0.22 * aoeAlpha;
      }

      if (elapsed >= maxLifetime) {
        cleanup();
        return false;
      }

      return true;
    };

    return {
      group,
      get isActive() {
        return isActive;
      },
      activate,
      update,
      cleanup,
    };
  }

  public acquireCastingCircle(
    playerPos: THREE.Vector3,
    duration = 1.0,
    onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void
  ): StarfallCastingCircleInstance {
    let inst = this.castingCirclePool.find((c) => !c.isActive);
    if (!inst) {
      inst = this.castingCirclePool[0];
      inst.cleanup();
    }
    inst.activate(playerPos, duration, onSpawnSparks);
    return inst;
  }

  public acquireMeteorBarrage(
    targetCenter: THREE.Vector3,
    onImpact?: (impactPos: THREE.Vector3, isLast: boolean, index: number) => void,
    onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void
  ): StarfallMeteorBarrageInstance {
    let inst = this.meteorBarragePool.find((b) => !b.isActive);
    if (!inst) {
      inst = this.meteorBarragePool[0];
      inst.cleanup();
    }
    inst.activate(targetCenter, onImpact, onSpawnSparks);
    return inst;
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

    // Starfall Circuit Shader Material & Meshes Pre-compilation
    dummyGroup.add(new THREE.Mesh(starfallPool.circlePlaneGeom, starfallPool.baseShaderMat));
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

    // Celestial Heal (Cahaya) Material Pre-compilation
    const celestialPool = CelestialHealResourcePool.get();
    dummyGroup.add(new THREE.Mesh(celestialPool.circlePlaneGeom, celestialPool.baseShaderMat));
    dummyGroup.add(new THREE.Mesh(celestialPool.outerBeamGeom, celestialPool.outerBeamMat));
    dummyGroup.add(new THREE.Mesh(celestialPool.innerBeamGeom, celestialPool.innerBeamMat));
    dummyGroup.add(new THREE.Mesh(celestialPool.runeRingGeom1, celestialPool.runeRingMat1));
    dummyGroup.add(new THREE.Mesh(celestialPool.runeRingGeom2, celestialPool.runeRingMat2));
    dummyGroup.add(new THREE.Points(celestialPool.stardustGeom, celestialPool.stardustMat));
    dummyGroup.add(new THREE.Mesh(celestialPool.shockwaveGeom1, celestialPool.shockwaveMat1));

    // Mage Blink Material Pre-compilation
    const blinkPool = MageBlinkResourcePool.get();
    dummyGroup.add(new THREE.Mesh(blinkPool.circlePlaneGeom, blinkPool.departureCircleMat));
    dummyGroup.add(new THREE.Mesh(blinkPool.circlePlaneGeom, blinkPool.arrivalCircleMat));
    dummyGroup.add(new THREE.Mesh(blinkPool.tracerGeom, blinkPool.tracerMat));
    dummyGroup.add(new THREE.Mesh(blinkPool.tracerCoreGeom, blinkPool.tracerCoreMat));
    dummyGroup.add(new THREE.Mesh(blinkPool.torsoGeom, blinkPool.afterimageMat1));
    dummyGroup.add(new THREE.Mesh(blinkPool.shockwaveGeom1, blinkPool.landingShockwaveMatCyan));

    scene.add(dummyGroup);
    try {
      renderer.compile(scene, camera);
    } catch {}
    scene.remove(dummyGroup);
  }
}

export const preloadStarfallPool = preloadMageVfxPool;

/**
 * Acquires the pooled Starfall 3D Magic Circle with Circuit Stroke Reveal Animation
 * - Phase 1 (0.0s - 1.0s): Energy traces outward like circuit branches in sync with 1.0s casting progress
 * - Phase 2 (1.0s - 3.0s): Magic Circle remains fully active and illuminated during the 2.0s continuous meteor shower
 * - Phase 3 (3.0s - 3.5s): Smooth 0.5s fade-out before resetting in object pool
 */
export function createStarfallCastingCircleVfx(params: {
  playerPos: THREE.Vector3;
  duration?: number;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): StarfallCastingCircleInstance {
  return StarfallResourcePool.get().acquireCastingCircle(
    params.playerPos,
    params.duration ?? 1.0,
    params.onSpawnSparks
  );
}

/**
 * Acquires the pooled Expanded 10-Meteor Continuous 2.0s Starfall Barrage
 * - Target Red Zone offset in front of character (14.5 units ahead)
 * - Continuous staggered volley of 10 meteors raining down across 2.0 full seconds
 * - Pooled Zero-GC execution with complete cleanup
 */
export function createStarfallMeteorBarrageVfx(params: {
  targetCenter: THREE.Vector3;
  onImpact?: (impactPos: THREE.Vector3, isLast: boolean, index: number) => void;
  onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
}): StarfallMeteorBarrageInstance {
  return StarfallResourcePool.get().acquireMeteorBarrage(
    params.targetCenter,
    params.onImpact,
    params.onSpawnSparks
  );
}

// =========================================================================
// MAGE SKILL 3: CELESTIAL HEAL (HUJAN CAHAYA ASTRAL) - REVAMPED ZERO-LAG POOL
// =========================================================================

let cachedCelestialCircleTexture: THREE.CanvasTexture | null = null;

/**
 * Procedural Celestial Magic Circle Texture Generator (512x512)
 * Matches the glowing magenta/violet runic circle with cyan/white geometric star
 * as shown in media_1793971099244_89e4fb0d.jpg and media_1793971419222_8c86e088.jpg:
 * - Glowing magenta outer perimeter rings and rune medallions
 * - Sacred 8-pointed star / octagram (two intersecting 45-deg rotated squares) in glowing cyan
 * - Central square aperture and radial circuit conduits
 */
export function getCelestialMagicCircleTexture(): THREE.CanvasTexture {
  if (cachedCelestialCircleTexture) return cachedCelestialCircleTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cachedCelestialCircleTexture = new THREE.CanvasTexture(canvas);
    return cachedCelestialCircleTexture;
  }

  const cx = size / 2;
  const cy = size / 2;

  // 1. Subtle, translucent violet-magenta background aura (eliminates solid floor bleaching)
  const bgGrad = ctx.createRadialGradient(cx, cy, 25, cx, cy, 248);
  bgGrad.addColorStop(0, 'rgba(165, 243, 252, 0.28)');
  bgGrad.addColorStop(0.18, 'rgba(217, 70, 239, 0.20)');
  bgGrad.addColorStop(0.45, 'rgba(168, 85, 247, 0.12)');
  bgGrad.addColorStop(0.75, 'rgba(147, 51, 234, 0.05)');
  bgGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 248, 0, Math.PI * 2);
  ctx.fill();

  const drawGlowRing = (r: number, color: string, width: number, blur = 6) => {
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

  // 2. Outer Concentric Runic Rings (Sharp, crisp Magenta & Electric Violet)
  drawGlowRing(242, '#d946ef', 2.4, 8);
  drawGlowRing(230, '#ffffff', 1.6, 5);
  drawGlowRing(218, '#c084fc', 2.8, 8);
  drawGlowRing(212, '#fdf4ff', 1.4, 4);

  // 3. Inner Boundary for the Runic Band (Cyan/White)
  drawGlowRing(142, '#38bdf8', 2.4, 6);
  drawGlowRing(136, '#ffffff', 1.4, 4);

  // 4. 16 Circular Rune Medallions along R = 176
  const numMedallions = 16;
  const medallionR = 176;
  const badgeRadius = 15;

  for (let i = 0; i < numMedallions; i++) {
    const angle = (i / numMedallions) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * medallionR;
    const by = cy + Math.sin(angle) * medallionR;

    ctx.save();
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius - 3, 0, Math.PI * 2);
    ctx.stroke();

    // Procedural Ancient Rune Glyph
    ctx.strokeStyle = '#fdf4ff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const rIdx = i % 8;
    if (rIdx === 0) {
      // Celestial Cross
      ctx.moveTo(bx - 5, by);
      ctx.lineTo(bx + 5, by);
      ctx.moveTo(bx, by - 5);
      ctx.lineTo(bx + 5, by + 5);
    } else if (rIdx === 1) {
      // Star Sigil
      ctx.moveTo(bx - 4, by - 5);
      ctx.lineTo(bx + 4, by + 5);
      ctx.moveTo(bx + 4, by - 5);
      ctx.lineTo(bx - 4, by + 5);
    } else if (rIdx === 2) {
      // Algiz Rune
      ctx.moveTo(bx, by + 6);
      ctx.lineTo(bx, by - 6);
      ctx.moveTo(bx - 4, by - 2);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 4, by - 2);
    } else if (rIdx === 3) {
      // Fehu Rune
      ctx.moveTo(bx - 3, by + 6);
      ctx.lineTo(bx - 3, by - 6);
      ctx.moveTo(bx - 3, by - 4);
      ctx.lineTo(bx + 3, by - 1);
      ctx.moveTo(bx - 3, by);
      ctx.lineTo(bx + 3, by + 3);
    } else if (rIdx === 4) {
      // Tiwaz Rune (Arrow up)
      ctx.moveTo(bx, by + 6);
      ctx.lineTo(bx, by - 6);
      ctx.moveTo(bx - 4, by - 2);
      ctx.lineTo(bx, by - 6);
      ctx.lineTo(bx + 4, by - 2);
    } else if (rIdx === 5) {
      // Diamond Sigil
      ctx.moveTo(bx, by - 5);
      ctx.lineTo(bx + 4, by);
      ctx.lineTo(bx, by + 5);
      ctx.lineTo(bx - 4, by);
      ctx.closePath();
    } else if (rIdx === 6) {
      // Solar Arc
      ctx.arc(bx, by, 4.5, 0, Math.PI * 1.5);
    } else {
      // Hourglass Sigil
      ctx.moveTo(bx - 4, by - 5);
      ctx.lineTo(bx + 4, by - 5);
      ctx.lineTo(bx - 4, by + 5);
      ctx.lineTo(bx + 4, by + 5);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }

  // 5. Sacred 8-Pointed Star / Octagram (Two Intersecting Squares Rotated 45 Deg)
  ctx.save();
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 2.0;
  const starRadius = 132;

  for (let s = 0; s < 2; s++) {
    const rot = s * (Math.PI / 4);
    ctx.beginPath();
    for (let p = 0; p < 4; p++) {
      const a = rot + p * (Math.PI / 2);
      const px = cx + Math.cos(a) * starRadius;
      const py = cy + Math.sin(a) * starRadius;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  // 5b. Connecting diagonal trusses from star vertices to rune band
  ctx.save();
  ctx.strokeStyle = '#a5f3fc';
  ctx.lineWidth = 1.4;
  for (let v = 0; v < 8; v++) {
    const a = v * (Math.PI / 4);
    const px1 = cx + Math.cos(a) * starRadius;
    const py1 = cy + Math.sin(a) * starRadius;
    const px2 = cx + Math.cos(a) * 176;
    const py2 = cy + Math.sin(a) * 176;
    ctx.beginPath();
    ctx.moveTo(px1, py1);
    ctx.lineTo(px2, py2);
    ctx.stroke();
  }
  ctx.restore();

  // 6. Central Nested Squares and Radial Circuit Conduits
  drawGlowRing(88, '#ffffff', 2.0, 8);
  drawGlowRing(76, '#38bdf8', 1.8, 6);

  ctx.save();
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 1.6;
  [56, 38, 22].forEach((sqSize) => {
    ctx.strokeRect(cx - sqSize / 2, cy - sqSize / 2, sqSize, sqSize);
  });
  ctx.restore();

  // 7. Radial Bus Lines with Circular Junction Pads
  ctx.save();
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 8;
  for (let b = 0; b < 8; b++) {
    const a = (b / 8) * Math.PI * 2;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx + cosA * 28, cy + sinA * 28);
    ctx.lineTo(cx + cosA * 212, cy + sinA * 212);
    ctx.stroke();

    [62, 110, 156].forEach((jr) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + cosA * jr, cy + sinA * jr, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx + cosA * jr, cy + sinA * jr, 5.5, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  ctx.restore();

  // 8. Innermost Aperture Ring
  drawGlowRing(44, '#ffffff', 2.6, 12);
  drawGlowRing(30, '#a5f3fc', 1.8, 8);

  cachedCelestialCircleTexture = new THREE.CanvasTexture(canvas);
  cachedCelestialCircleTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedCelestialCircleTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedCelestialCircleTexture.generateMipmaps = true;

  return cachedCelestialCircleTexture;
}

// ----------------------------------------------------
// CELESTIAL CIRCUIT SHADER
// ----------------------------------------------------

export const celestialCircuitVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const celestialCircuitFragmentShader = `
  uniform sampler2D uMap;
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uElectricCyan;
  uniform vec3 uElectricMagenta;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - vec2(0.5);
    float dist = length(centered) * 2.0; // 0.0 at center, 1.0 at outer edge
    if (dist > 0.995) discard;

    float angle = atan(centered.y, centered.x);

    // 8 radial channels with 45-degree angled PCB bus traces
    float octant = abs(mod(angle + 3.14159265, 0.785398) - 0.392699);
    float conduitSpeedBonus = smoothstep(0.392699, 0.0, octant) * 0.16;

    // Manhattan grid branching traces
    vec2 gridPos = abs(centered) * 16.0;
    float circuitStep = (step(0.84, fract(gridPos.x)) + step(0.84, fract(gridPos.y))) * 0.08;

    // The expanding circuit wavefront from center outward
    float waveRadius = uProgress * 1.15;
    float localThreshold = dist - conduitSpeedBonus - circuitStep;

    // Outer perimeter runes unlock as casting approaches completion (progress > 0.85)
    if (dist > 0.84 && uProgress < 0.86) {
      discard;
    }

    if (localThreshold > waveRadius) {
      discard;
    }

    vec4 tex = texture2D(uMap, vUv);

    // Dynamic Electric Arc Wavefront Spark at the branching tips (crisp & non-bleeding)
    float edgeDist = abs(waveRadius - localThreshold);
    if (edgeDist < 0.05 && uProgress > 0.02 && uProgress < 0.995) {
      float electricPulse = sin(dist * 50.0 - uTime * 30.0) * 0.5 + 0.5;
      float spark = (1.0 - edgeDist / 0.05) * (1.1 + electricPulse * 0.5);
      vec3 sparkCol = mix(uElectricCyan, uElectricMagenta, sin(angle * 4.0 + uTime * 8.0) * 0.5 + 0.5);
      tex.rgb += sparkCol * spark;
      tex.a = max(tex.a, 0.95);
    }

    // Central node power core crisp cyan glow (prevents overexposure wash)
    if (dist < 0.22) {
      tex.rgb += vec3(0.25, 0.55, 0.65) * (0.35 + 0.15 * sin(uTime * 16.0));
    }

    tex.a *= uOpacity;
    gl_FragColor = tex;
  }
`;

export interface CelestialHealVfxInstance {
  group: THREE.Group;
  isActive: boolean;
  activate: (pos: THREE.Vector3) => void;
  update: (delta: number, currentPos?: THREE.Vector3, terrainHeight?: number) => boolean;
  cleanup: () => void;
}

/**
 * Singleton Static Geometries and Materials for Celestial Heal (Cahaya)
 * Guarantees ZERO runtime allocations and ZERO Garbage Collection spikes at 60 FPS
 */
export class CelestialHealResourcePool {
  private static instance: CelestialHealResourcePool | null = null;

  public circlePlaneGeom!: THREE.PlaneGeometry;
  public outerBeamGeom!: THREE.CylinderGeometry;
  public innerBeamGeom!: THREE.CylinderGeometry;
  public runeRingGeom1!: THREE.RingGeometry;
  public runeRingGeom2!: THREE.RingGeometry;
  public stardustGeom!: THREE.BufferGeometry;
  public shockwaveGeom1!: THREE.RingGeometry;
  public shockwaveGeom2!: THREE.RingGeometry;

  public outerBeamMat!: THREE.MeshBasicMaterial;
  public innerBeamMat!: THREE.MeshBasicMaterial;
  public runeRingMat1!: THREE.MeshBasicMaterial;
  public runeRingMat2!: THREE.MeshBasicMaterial;
  public stardustMat!: THREE.PointsMaterial;
  public shockwaveMat1!: THREE.MeshBasicMaterial;
  public shockwaveMat2!: THREE.MeshBasicMaterial;
  public baseShaderMat!: THREE.ShaderMaterial;

  public stardustSpeeds!: Float32Array;
  public isInitialized = false;

  private instances: CelestialHealVfxInstance[] = [];

  public static get(): CelestialHealResourcePool {
    if (!CelestialHealResourcePool.instance) {
      CelestialHealResourcePool.instance = new CelestialHealResourcePool();
      CelestialHealResourcePool.instance.init();
    }
    return CelestialHealResourcePool.instance;
  }

  private init() {
    if (this.isInitialized) return;

    // 1. Geometries
    this.circlePlaneGeom = new THREE.PlaneGeometry(6.4, 6.4);
    this.outerBeamGeom = new THREE.CylinderGeometry(1.9, 1.9, 14, 24, 1, true); // diameter 3.8, height 14
    this.innerBeamGeom = new THREE.CylinderGeometry(0.8, 0.8, 14, 20, 1, true); // diameter 1.6, height 14
    this.runeRingGeom1 = new THREE.RingGeometry(1.2, 2.2, 32);
    this.runeRingGeom2 = new THREE.RingGeometry(1.0, 1.9, 32);
    this.shockwaveGeom1 = new THREE.RingGeometry(0.2, 1.0, 32);
    this.shockwaveGeom2 = new THREE.RingGeometry(0.2, 1.0, 32);

    // 30 Stardust Particle BufferGeometry
    const count = 30;
    const positions = new Float32Array(count * 3);
    this.stardustSpeeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
      const radius = 0.5 + (i % 5) * 0.45;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.4 + (i % 10) * 0.9;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      this.stardustSpeeds[i] = 1.2 + (i % 4) * 0.5;
    }
    this.stardustGeom = new THREE.BufferGeometry();
    this.stardustGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 2. Materials (Translucent Additive Blending without overexposing character)
    this.outerBeamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.innerBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.40,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.runeRingMat1 = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.runeRingMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.stardustMat = new THREE.PointsMaterial({
      color: 0xa5f3fc,
      size: 0.32,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.shockwaveMat1 = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.shockwaveMat2 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.baseShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: getCelestialMagicCircleTexture() },
        uProgress: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uElectricCyan: { value: new THREE.Vector3(0.22, 0.74, 0.97) },
        uElectricMagenta: { value: new THREE.Vector3(0.91, 0.47, 0.98) },
        uTime: { value: 0.0 },
      },
      vertexShader: celestialCircuitVertexShader,
      fragmentShader: celestialCircuitFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    // 3. Pre-instantiate 2 reusable VFX instances in the pool
    for (let i = 0; i < 2; i++) {
      this.instances.push(this.buildVfxInstance());
    }

    this.isInitialized = true;
  }

  private buildVfxInstance(): CelestialHealVfxInstance {
    const group = new THREE.Group();
    group.visible = false;

    // Instance-cloned shader material for independent progress & opacity
    const shaderMat = this.baseShaderMat.clone();

    // 1. Ground Magic Circle Plane
    const circlePlane = new THREE.Mesh(this.circlePlaneGeom, shaderMat);
    circlePlane.rotation.x = -Math.PI / 2;
    circlePlane.position.y = 0.02;
    group.add(circlePlane);

    // 2. Dual Ground Shockwaves
    const shockwave1 = new THREE.Mesh(this.shockwaveGeom1, this.shockwaveMat1);
    shockwave1.rotation.x = -Math.PI / 2;
    shockwave1.position.y = 0.03;
    group.add(shockwave1);

    const shockwave2 = new THREE.Mesh(this.shockwaveGeom2, this.shockwaveMat2);
    shockwave2.rotation.x = -Math.PI / 2;
    shockwave2.position.y = 0.04;
    group.add(shockwave2);

    // 3. Outer Cylinder (Astral Sky-Blue, diameter 3.8, height 14)
    const outerBeam = new THREE.Mesh(this.outerBeamGeom, this.outerBeamMat);
    outerBeam.position.y = 7.0;
    group.add(outerBeam);

    // 4. Inner Core Cylinder (Pure Brilliant White, diameter 1.6, height 14)
    const innerBeam = new THREE.Mesh(this.innerBeamGeom, this.innerBeamMat);
    innerBeam.position.y = 7.0;
    group.add(innerBeam);

    // 5. 2 Ascending Cyan Rune Rings
    const runeRing1 = new THREE.Mesh(this.runeRingGeom1, this.runeRingMat1);
    runeRing1.rotation.x = Math.PI / 2;
    runeRing1.position.y = 1.0;
    group.add(runeRing1);

    const runeRing2 = new THREE.Mesh(this.runeRingGeom2, this.runeRingMat2);
    runeRing2.rotation.x = Math.PI / 2;
    runeRing2.position.y = 4.2;
    group.add(runeRing2);

    // 6. 30 Floating Stardust Particles
    const stardust = new THREE.Points(this.stardustGeom, this.stardustMat);
    group.add(stardust);

    // 7. Dynamic PointLight: Soft Cyan (0x67e8f9), intensity 2.0, distance 6.0, y = 1.0
    const pointLight = new THREE.PointLight(0x67e8f9, 0.0, 6.0);
    pointLight.position.set(0, 1.0, 0);
    group.add(pointLight);

    let elapsed = 0;
    let isActive = false;
    const castDuration = 0.7;
    const fadeDuration = 1.2;
    const totalDuration = castDuration + fadeDuration; // 1.9s

    const cleanup = () => {
      isActive = false;
      group.visible = false;
      shaderMat.uniforms.uOpacity.value = 0;
      pointLight.intensity = 0.0;
      this.outerBeamMat.opacity = 0.25;
      this.innerBeamMat.opacity = 0.40;
      this.runeRingMat1.opacity = 0.85;
      this.runeRingMat2.opacity = 0.75;
      this.stardustMat.opacity = 0.90;
      this.shockwaveMat1.opacity = 0.85;
      this.shockwaveMat2.opacity = 0.95;
    };

    const activate = (pos: THREE.Vector3) => {
      elapsed = 0;
      isActive = true;
      group.position.set(pos.x, pos.y + 0.05, pos.z);
      group.visible = true;

      pointLight.intensity = 2.0;
      runeRing1.position.y = 1.0;
      runeRing2.position.y = 4.2;
      outerBeam.rotation.y = 0;
      innerBeam.rotation.y = 0;
      shaderMat.uniforms.uProgress.value = 0.0;
      shaderMat.uniforms.uOpacity.value = 1.0;
      shaderMat.uniforms.uTime.value = 0.0;
    };

    const update = (delta: number, currentPos?: THREE.Vector3, terrainHeight?: number): boolean => {
      if (!isActive) return false;

      elapsed += delta;

      // Lock horizontal location to actively track player
      if (currentPos) {
        group.position.x = currentPos.x;
        group.position.z = currentPos.z;
        if (terrainHeight !== undefined) {
          group.position.y = terrainHeight + 0.05;
        } else {
          group.position.y = currentPos.y + 0.05;
        }
      }

      // Outer Cylinder: rotates clockwise (rotation.y += delta * 2.5)
      outerBeam.rotation.y += delta * 2.5;

      // Inner Cylinder: rotates counter-clockwise (rotation.y -= delta * 3.5)
      innerBeam.rotation.y -= delta * 3.5;

      // Ascending Rune Rings: float upward (position.y += delta * 2.0) while spinning rapidly
      runeRing1.position.y += delta * 2.0;
      runeRing1.rotation.z += delta * 3.0;
      if (runeRing1.position.y > 12.0) runeRing1.position.y = 1.0;

      runeRing2.position.y += delta * 2.0;
      runeRing2.rotation.z -= delta * 2.5;
      if (runeRing2.position.y > 12.0) runeRing2.position.y = 1.0;

      // Animate 30 stardust particles drifting upward
      const posAttr = this.stardustGeom.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      for (let i = 0; i < 30; i++) {
        posArr[i * 3 + 1] += delta * this.stardustSpeeds[i];
        if (posArr[i * 3 + 1] > 11.5) {
          posArr[i * 3 + 1] = 0.3;
        }
      }
      posAttr.needsUpdate = true;

      // Expanding ground shockwaves
      const swScale1 = Math.min(4.5, 0.4 + elapsed * 5.2);
      shockwave1.scale.set(swScale1, swScale1, 1);
      const swScale2 = Math.min(2.8, 0.2 + elapsed * 3.6);
      shockwave2.scale.set(swScale2, swScale2, 1);

      if (elapsed <= castDuration) {
        // Phase 1: Circuit Stroke Reveal (0.0 to 1.0 over exactly 0.7s)
        const progress = Math.min(1.0, elapsed / castDuration);
        shaderMat.uniforms.uProgress.value = progress;
        shaderMat.uniforms.uOpacity.value = 1.0;
        shaderMat.uniforms.uTime.value = elapsed;

        this.outerBeamMat.opacity = 0.25 * Math.min(1.0, progress * 1.5);
        this.innerBeamMat.opacity = 0.40 * Math.min(1.0, progress * 1.5);
        this.runeRingMat1.opacity = 0.85 * Math.min(1.0, progress * 1.5);
        this.runeRingMat2.opacity = 0.75 * Math.min(1.0, progress * 1.5);
        this.stardustMat.opacity = 0.90;
        this.shockwaveMat1.opacity = 0.85 * Math.max(0, 1.0 - elapsed / 0.7);
        this.shockwaveMat2.opacity = 0.95 * Math.max(0, 1.0 - elapsed / 0.5);

        pointLight.intensity = 2.0;
      } else {
        // Phase 2: Smooth 1.2s Fade Out after cast duration completes
        const fadeElapsed = elapsed - castDuration;
        const alpha = Math.max(0.0, 1.0 - fadeElapsed / fadeDuration);

        shaderMat.uniforms.uProgress.value = 1.0;
        shaderMat.uniforms.uOpacity.value = alpha;
        shaderMat.uniforms.uTime.value = elapsed;

        this.outerBeamMat.opacity = 0.25 * alpha;
        this.innerBeamMat.opacity = 0.40 * alpha;
        this.runeRingMat1.opacity = 0.85 * alpha;
        this.runeRingMat2.opacity = 0.75 * alpha;
        this.stardustMat.opacity = 0.90 * alpha;
        this.shockwaveMat1.opacity = 0;
        this.shockwaveMat2.opacity = 0;

        // Dynamic PointLight fades out linearly together with the light pillar
        pointLight.intensity = 2.0 * alpha;
      }

      if (elapsed >= totalDuration) {
        cleanup();
        return false;
      }

      return true;
    };

    return {
      group,
      get isActive() {
        return isActive;
      },
      activate,
      update,
      cleanup,
    };
  }

  public acquire(playerPos: THREE.Vector3): CelestialHealVfxInstance {
    let instance = this.instances.find((i) => !i.isActive);
    if (!instance) {
      instance = this.instances[0];
      instance.cleanup();
    }
    instance.activate(playerPos);
    return instance;
  }
}

/**
 * Creates and acquires the pre-allocated Mage Celestial Heal VFX Instance
 */
export function createMageCelestialHealVfx(params: {
  playerPos: THREE.Vector3;
}): CelestialHealVfxInstance {
  return CelestialHealResourcePool.get().acquire(params.playerPos);
}

// =========================================================================
// MAGE SKILL 2: BLINK (LANGKAH DIMENSI) - DUAL RUNIC CIRCLE & AFTERIMAGE POOL
// =========================================================================

export interface MageBlinkVfxInstance {
  group: THREE.Group;
  isActive: boolean;
  activate: (
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    playerRotationY: number,
    getTerrainHeight: (x: number, z: number) => number
  ) => void;
  update: (delta: number, onArrival?: () => void) => boolean;
  cleanup: () => void;
}

export class MageBlinkResourcePool {
  private static instance: MageBlinkResourcePool | null = null;

  // Shared Geometries
  public circlePlaneGeom!: THREE.PlaneGeometry;
  public tracerGeom!: THREE.CylinderGeometry;
  public tracerCoreGeom!: THREE.CylinderGeometry;
  public shockwaveGeom1!: THREE.RingGeometry;
  public shockwaveGeom2!: THREE.RingGeometry;

  // Afterimage Avatar Geometries
  public torsoGeom!: THREE.BoxGeometry;
  public skirtGeom!: THREE.CylinderGeometry;
  public headGeom!: THREE.BoxGeometry;
  public hatBrimGeom!: THREE.CylinderGeometry;
  public hatConeGeom!: THREE.ConeGeometry;
  public armGeom!: THREE.BoxGeometry;
  public staffGeom!: THREE.CylinderGeometry;

  // Materials
  public departureCircleMat!: THREE.MeshBasicMaterial;
  public arrivalCircleMat!: THREE.MeshBasicMaterial;
  public tracerMat!: THREE.MeshBasicMaterial;
  public tracerCoreMat!: THREE.MeshBasicMaterial;
  public afterimageMat1!: THREE.MeshBasicMaterial;
  public afterimageMat2!: THREE.MeshBasicMaterial;
  public afterimageMat3!: THREE.MeshBasicMaterial;
  public landingShockwaveMatCyan!: THREE.MeshBasicMaterial;
  public landingShockwaveMatPurple!: THREE.MeshBasicMaterial;

  public isInitialized = false;
  private instances: MageBlinkVfxInstance[] = [];

  public static get(): MageBlinkResourcePool {
    if (!MageBlinkResourcePool.instance) {
      MageBlinkResourcePool.instance = new MageBlinkResourcePool();
      MageBlinkResourcePool.instance.init();
    }
    return MageBlinkResourcePool.instance;
  }

  private init() {
    if (this.isInitialized) return;

    // 1. Geometries
    // Radius 1.8 units -> Diameter 3.6 units
    this.circlePlaneGeom = new THREE.PlaneGeometry(3.6, 3.6);
    this.tracerGeom = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8);
    this.tracerCoreGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8);
    this.shockwaveGeom1 = new THREE.RingGeometry(0.2, 1.0, 32);
    this.shockwaveGeom2 = new THREE.RingGeometry(0.2, 1.0, 32);

    // Afterimage Mage Avatar Geometries
    this.torsoGeom = new THREE.BoxGeometry(0.7, 0.9, 0.45);
    this.skirtGeom = new THREE.CylinderGeometry(0.35, 0.58, 0.95, 8);
    this.headGeom = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    this.hatBrimGeom = new THREE.CylinderGeometry(0.52, 0.6, 0.08, 8);
    this.hatConeGeom = new THREE.ConeGeometry(0.36, 0.75, 8);
    this.armGeom = new THREE.BoxGeometry(0.22, 0.72, 0.22);
    this.staffGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);

    // 2. Materials
    const runicTex = getCelestialMagicCircleTexture();

    // Titik Asal (Departure): Magenta / Ungu Neon
    this.departureCircleMat = new THREE.MeshBasicMaterial({
      map: runicTex,
      color: 0xd946ef,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    // Titik Target (Arrival): Cyan / Sky-Blue Neon
    this.arrivalCircleMat = new THREE.MeshBasicMaterial({
      map: runicTex,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    // Ethereal Tracer (Cyan aura + White core)
    this.tracerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.tracerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // 3 Afterimages (cyan/purple glow, opacity 0.6)
    this.afterimageMat1 = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.afterimageMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.afterimageMat3 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Landing Shockwaves
    this.landingShockwaveMatCyan = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.landingShockwaveMatPurple = new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    // Create 3 pooled instances
    for (let i = 0; i < 3; i++) {
      this.instances.push(this.createInstance());
    }

    this.isInitialized = true;
  }

  private createInstance(): MageBlinkVfxInstance {
    const group = new THREE.Group();
    let isActive = false;
    let elapsed = 0;
    let arrivalFired = false;
    const totalDuration = 0.35; // 0.2s traversal & afterimages + 0.15s landing burst

    // 1. Departure Runic Magic Circle
    const departureCircle = new THREE.Mesh(this.circlePlaneGeom, this.departureCircleMat.clone());
    departureCircle.rotation.x = -Math.PI / 2;
    group.add(departureCircle);

    // 2. Arrival Runic Magic Circle
    const arrivalCircle = new THREE.Mesh(this.circlePlaneGeom, this.arrivalCircleMat.clone());
    arrivalCircle.rotation.x = -Math.PI / 2;
    group.add(arrivalCircle);

    // 3. Ethereal Tracer (Outer + Core)
    const tracerGroup = new THREE.Group();
    const outerTracer = new THREE.Mesh(this.tracerGeom, this.tracerMat.clone());
    const innerTracer = new THREE.Mesh(this.tracerCoreGeom, this.tracerCoreMat.clone());
    tracerGroup.add(outerTracer, innerTracer);
    group.add(tracerGroup);

    // 4. 3 Afterimage Clones
    const afterimageMats = [
      this.afterimageMat1.clone(),
      this.afterimageMat2.clone(),
      this.afterimageMat3.clone(),
    ];
    const afterimageGroups: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const cloneGroup = new THREE.Group();
      const mat = afterimageMats[i];

      const body = new THREE.Mesh(this.torsoGeom, mat);
      body.position.y = 1.35;

      const skirt = new THREE.Mesh(this.skirtGeom, mat);
      skirt.position.y = 0.65;

      const head = new THREE.Mesh(this.headGeom, mat);
      head.position.y = 2.05;

      const hatBrim = new THREE.Mesh(this.hatBrimGeom, mat);
      hatBrim.position.y = 2.32;

      const hatCone = new THREE.Mesh(this.hatConeGeom, mat);
      hatCone.position.y = 2.72;

      const leftArm = new THREE.Mesh(this.armGeom, mat);
      leftArm.position.set(0.48, 1.35, 0);
      leftArm.rotation.set(-0.6, 0, 0.35);

      const rightArm = new THREE.Mesh(this.armGeom, mat);
      rightArm.position.set(-0.48, 1.35, 0);
      rightArm.rotation.set(-1.52, 0, -0.05);

      const staff = new THREE.Mesh(this.staffGeom, mat);
      staff.position.set(-0.55, 1.25, 0.3);

      cloneGroup.add(body, skirt, head, hatBrim, hatCone, leftArm, rightArm, staff);
      afterimageGroups.push(cloneGroup);
      group.add(cloneGroup);
    }

    // 5. Landing Shockwaves (Cyan & Magenta)
    const landingShockwave1 = new THREE.Mesh(this.shockwaveGeom1, this.landingShockwaveMatCyan.clone());
    landingShockwave1.rotation.x = -Math.PI / 2;
    landingShockwave1.visible = false;
    group.add(landingShockwave1);

    const landingShockwave2 = new THREE.Mesh(this.shockwaveGeom2, this.landingShockwaveMatPurple.clone());
    landingShockwave2.rotation.x = -Math.PI / 2;
    landingShockwave2.visible = false;
    group.add(landingShockwave2);

    const cleanup = () => {
      isActive = false;
      group.visible = false;
      landingShockwave1.visible = false;
      landingShockwave2.visible = false;
      if (group.parent) {
        group.parent.remove(group);
      }
    };

    const activate = (
      startPos: THREE.Vector3,
      targetPos: THREE.Vector3,
      playerRotationY: number,
      getTerrainHeight: (x: number, z: number) => number
    ) => {
      isActive = true;
      elapsed = 0;
      arrivalFired = false;
      group.visible = true;

      // 1. Position Departure Circle
      const startGroundY = getTerrainHeight(startPos.x, startPos.z);
      departureCircle.position.set(startPos.x, startGroundY + 0.05, startPos.z);
      departureCircle.material.opacity = 0.85;

      // 2. Position Arrival Circle
      const targetGroundY = getTerrainHeight(targetPos.x, targetPos.z);
      arrivalCircle.position.set(targetPos.x, targetGroundY + 0.05, targetPos.z);
      arrivalCircle.material.opacity = 0.85;

      // 3. Configure Ethereal Tracer
      const dist = startPos.distanceTo(targetPos);
      const mid = new THREE.Vector3().addVectors(startPos, targetPos).multiplyScalar(0.5);
      mid.y = getTerrainHeight(mid.x, mid.z) + 1.1;
      tracerGroup.position.copy(mid);

      const fwd = new THREE.Vector3().subVectors(targetPos, startPos);
      if (fwd.lengthSq() > 0.0001) {
        fwd.normalize();
        tracerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fwd);
      }
      outerTracer.scale.set(1, dist, 1);
      innerTracer.scale.set(1, dist, 1);
      outerTracer.material.opacity = 0.85;
      innerTracer.material.opacity = 0.95;
      tracerGroup.visible = true;

      // 4. Configure 3 Afterimage Clones along trajectory (25%, 50%, 75%)
      const fractions = [0.25, 0.50, 0.75];
      for (let i = 0; i < 3; i++) {
        const t = fractions[i];
        const clonePos = new THREE.Vector3().lerpVectors(startPos, targetPos, t);
        clonePos.y = getTerrainHeight(clonePos.x, clonePos.z);
        const cloneGroup = afterimageGroups[i];
        cloneGroup.position.copy(clonePos);
        cloneGroup.rotation.y = playerRotationY;
        cloneGroup.scale.setScalar(1.0);
        cloneGroup.visible = true;
        afterimageMats[i].opacity = 0.60;
      }

      // 5. Reset Landing Shockwaves
      landingShockwave1.position.set(targetPos.x, targetGroundY + 0.06, targetPos.z);
      landingShockwave1.scale.set(0.2, 0.2, 1);
      landingShockwave1.visible = false;

      landingShockwave2.position.set(targetPos.x, targetGroundY + 0.07, targetPos.z);
      landingShockwave2.scale.set(0.2, 0.2, 1);
      landingShockwave2.visible = false;
    };

    const update = (delta: number, onArrival?: () => void): boolean => {
      if (!isActive) return false;
      elapsed += delta;

      // Phase 1: Departure Circle & Arrival Circle Fade Out (0.0s - 0.20s)
      const depAlpha = Math.max(0, 1.0 - elapsed / 0.20);
      departureCircle.material.opacity = 0.85 * depAlpha;

      const arrAlpha = Math.max(0, 1.0 - elapsed / 0.22);
      arrivalCircle.material.opacity = 0.85 * arrAlpha;

      // Tracer Beam Fade Out (0.0s - 0.20s)
      outerTracer.material.opacity = 0.85 * depAlpha;
      innerTracer.material.opacity = 0.95 * depAlpha;

      // Afterimages Fade Out (0.0s - 0.18s) with subtle expansion
      const afAlpha = Math.max(0, 1.0 - elapsed / 0.18);
      for (let i = 0; i < 3; i++) {
        afterimageMats[i].opacity = 0.60 * afAlpha;
        afterimageGroups[i].scale.setScalar(1.0 + (elapsed / 0.18) * 0.12);
        if (afAlpha <= 0) {
          afterimageGroups[i].visible = false;
        }
      }

      // Phase 2: Landing Trigger at 0.18s - 0.20s
      if (elapsed >= 0.18 && !arrivalFired) {
        arrivalFired = true;
        landingShockwave1.visible = true;
        landingShockwave2.visible = true;
        if (onArrival) onArrival();
      }

      // Landing Shockwaves Expansion (0.18s - 0.32s)
      if (arrivalFired) {
        const landingElapsed = elapsed - 0.18;
        const swAlpha = Math.max(0, 1.0 - landingElapsed / 0.14);

        const swScale1 = 0.3 + landingElapsed * 24.0; // Expands to ~3.6
        landingShockwave1.scale.set(swScale1, swScale1, 1);
        landingShockwave1.material.opacity = 0.90 * swAlpha;

        const swScale2 = 0.2 + landingElapsed * 18.0; // Expands to ~2.7
        landingShockwave2.scale.set(swScale2, swScale2, 1);
        landingShockwave2.material.opacity = 0.85 * swAlpha;
      }

      if (elapsed >= totalDuration) {
        cleanup();
        return false;
      }

      return true;
    };

    return {
      group,
      get isActive() {
        return isActive;
      },
      activate,
      update,
      cleanup,
    };
  }

  public acquire(
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    playerRotationY: number,
    getTerrainHeight: (x: number, z: number) => number
  ): MageBlinkVfxInstance {
    let instance = this.instances.find((i) => !i.isActive);
    if (!instance) {
      instance = this.instances[0];
      instance.cleanup();
    }
    instance.activate(startPos, targetPos, playerRotationY, getTerrainHeight);
    return instance;
  }
}

/**
 * Creates and acquires the pre-allocated Mage Blink VFX Instance
 */
export function createMageBlinkVfx(params: {
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  playerRotationY: number;
  getTerrainHeight: (x: number, z: number) => number;
}): MageBlinkVfxInstance {
  return MageBlinkResourcePool.get().acquire(
    params.startPos,
    params.targetPos,
    params.playerRotationY,
    params.getTerrainHeight
  );
}

