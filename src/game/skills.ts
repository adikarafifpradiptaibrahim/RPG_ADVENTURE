import * as THREE from 'three';

// ============================================================================
// SKILL COOLDOWN CONSTANTS (STRESS-TESTING & BALANCING)
// ============================================================================
// TODO: Kembalikan cooldown normal setelah pengujian selesai
// Nilai balancing normal:
// - GLACIAL_BARRAGE: 7.5s
// - CELESTIAL_APOCALYPSE: 18.0s
// - ARCANE_BLINK: 0.1s (atau 2.0s)
// - CAHAYA_SUCI: 0.1s (atau 12.0s)
export const SKILL_COOLDOWNS = {
  GLACIAL_BARRAGE: 0, // TODO: Kembalikan cooldown normal setelah pengujian selesai (Normal: 7.5s)
  CELESTIAL_APOCALYPSE: 0, // TODO: Kembalikan cooldown normal setelah pengujian selesai (Normal: 18.0s)
  ARCANE_BLINK: 0, // TODO: Kembalikan cooldown normal setelah pengujian selesai (Normal: 0.1s / 2.0s)
  CAHAYA_SUCI: 0, // TODO: Kembalikan cooldown normal setelah pengujian selesai (Normal: 0.1s / 12.0s)
  SKYWARD_VOLLEY: 0, // TODO: Kembalikan cooldown 8s setelah pengujian selesai (Normal: 8.0s)
  HUNTER_MOBILITY: 0, // TODO: Kembalikan cooldown 6s setelah pengujian selesai (Normal: 6.0s)
};

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
  isActive: boolean;
  activate: (params: {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    beamLength?: number;
    duration?: number;
    getOrigin?: () => { origin: THREE.Vector3; direction?: THREE.Vector3 };
    onHitTick?: (isTick: boolean) => void;
    onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
  }) => void;
  update: (delta: number) => boolean;
  cleanup: () => void;
}

/**
 * Singleton Static Geometries and Materials for Arcane Laser Beam
 * Pre-allocates all 3D geometries, materials, and instances so cast execution is 100% zero-lag at 60 FPS
 */
export class ArcaneBeamResourcePool {
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

  private instances: MageLaserBeamVfxInstance[] = [];
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
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.innerTorusMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
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
      color: 0x00f0ff,
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
      blending: THREE.AdditiveBlending,
    });

    this.plasmaCylMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.shroudCylMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
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
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Pre-allocate 4 complete beam instances for zero-allocation casting
    this.instances = [];
    for (let i = 0; i < 4; i++) {
      this.instances.push(this.createBeamInstance());
    }

    this.isInitialized = true;
  }

  private createBeamInstance(): MageLaserBeamVfxInstance {
    const group = new THREE.Group();
    group.visible = false;
    group.position.set(0, -999, 0);

    const magicCircleGroup = new THREE.Group();
    const circlePlane = new THREE.Mesh(this.circlePlaneGeom, this.circlePlaneMat);
    const outerTorus = new THREE.Mesh(this.outerTorusGeom, this.outerTorusMat);
    const innerTorus = new THREE.Mesh(this.innerTorusGeom, this.innerTorusMat);
    const coreSphere = new THREE.Mesh(this.coreSphereGeom, this.coreSphereMat);
    const crossH = new THREE.Mesh(this.crossHGeom, this.crossMat);
    const crossV = new THREE.Mesh(this.crossVGeom, this.crossMat);
    // Dummy light reference kept detached from scene graph to satisfy local callbacks without pipeline invalidation
    const beamLight = new THREE.PointLight(0xe879f9, 0, 18.0);
    // Static Lighting Rule: Player skills do not add dynamic PointLights to scene groups
    magicCircleGroup.add(circlePlane, outerTorus, innerTorus, coreSphere, crossH, crossV);
    group.add(magicCircleGroup);

    const laserBeamGroup = new THREE.Group();
    const coreCyl = new THREE.Mesh(this.coreCylGeom, this.coreCylMat);
    const plasmaCyl = new THREE.Mesh(this.plasmaCylGeom, this.plasmaCylMat);
    const shroudCyl = new THREE.Mesh(this.shroudCylGeom, this.shroudCylMat);
    laserBeamGroup.add(coreCyl, plasmaCyl, shroudCyl);

    const ringMeshes: THREE.Mesh[] = [];
    for (let r = 0; r < 4; r++) {
      const ring = new THREE.Mesh(this.ringGeom, this.ringMat);
      laserBeamGroup.add(ring);
      ringMeshes.push(ring);
    }
    group.add(laserBeamGroup);

    const impactGroup = new THREE.Group();
    const impactCore = new THREE.Mesh(this.impactCoreGeom, this.impactCoreMat);
    const impactGlow = new THREE.Mesh(this.impactGlowGeom, this.impactGlowMat);
    impactGroup.add(impactCore, impactGlow);
    group.add(impactGroup);

    let isActive = false;
    let timeLeft = 0;
    let elapsed = 0;
    let sparkInterval = 0;
    let tickInterval = 0;
    const currentOrigin = new THREE.Vector3();
    const currentFwd = new THREE.Vector3(0, 0, 1);
    let currentBeamLength = 32.0;
    let getOriginCb: (() => { origin: THREE.Vector3; direction?: THREE.Vector3 }) | undefined;
    let onHitTickCb: ((isTick: boolean) => void) | undefined;
    let onSpawnSparksCb: ((pos: THREE.Vector3, color: number, count: number, speed: number) => void) | undefined;

    const cleanup = () => {
      isActive = false;
      group.visible = false;
      group.position.set(0, -999, 0);
      beamLight.intensity = 0;
    };

    const activate = (params: {
      origin: THREE.Vector3;
      direction: THREE.Vector3;
      beamLength?: number;
      duration?: number;
      getOrigin?: () => { origin: THREE.Vector3; direction?: THREE.Vector3 };
      onHitTick?: (isTick: boolean) => void;
      onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
    }) => {
      isActive = true;
      group.visible = true;
      group.position.set(0, 0, 0); // Reset position from pool storage to world origin
      timeLeft = params.duration ?? 0.8;
      elapsed = 0;
      sparkInterval = 0;
      tickInterval = 0;

      currentOrigin.copy(params.origin);
      currentFwd.copy(params.direction).normalize();
      currentBeamLength = params.beamLength ?? 32.0;
      getOriginCb = params.getOrigin;
      onHitTickCb = params.onHitTick;
      onSpawnSparksCb = params.onSpawnSparks;

      // Reset material opacities
      this.circlePlaneMat.opacity = 0.95;
      this.outerTorusMat.opacity = 0.85;
      this.innerTorusMat.opacity = 0.8;
      this.coreSphereMat.opacity = 0.98;
      this.crossMat.opacity = 0.9;
      this.coreCylMat.opacity = 1.0;
      this.plasmaCylMat.opacity = 0.85;
      this.shroudCylMat.opacity = 0.55;
      this.ringMat.opacity = 0.85;
      this.impactCoreMat.opacity = 0.95;
      this.impactGlowMat.opacity = 0.75;
      beamLight.intensity = 4.5;

      magicCircleGroup.position.copy(currentOrigin);
      magicCircleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentFwd);

      const beamCenter = currentOrigin.clone().addScaledVector(currentFwd, currentBeamLength / 2);
      laserBeamGroup.position.copy(beamCenter);
      laserBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), currentFwd);

      const ringOffsets = [-currentBeamLength * 0.35, -currentBeamLength * 0.12, currentBeamLength * 0.12, currentBeamLength * 0.35];
      ringMeshes.forEach((rm, i) => {
        rm.position.set(0, ringOffsets[i], 0);
        rm.rotation.x = Math.PI / 2;
      });

      const endPoint = currentOrigin.clone().addScaledVector(currentFwd, currentBeamLength);
      impactGroup.position.copy(endPoint);

      // Trigger instant first hit
      onHitTickCb?.(false);
    };

    const update = (delta: number): boolean => {
      if (!isActive) return false;
      timeLeft -= delta;
      elapsed += delta;

      if (timeLeft <= 0) {
        cleanup();
        return false;
      }

      if (getOriginCb) {
        const dynamic = getOriginCb();
        currentOrigin.copy(dynamic.origin);
        if (dynamic.direction) {
          currentFwd.copy(dynamic.direction).normalize();
        }
        magicCircleGroup.position.copy(currentOrigin);
        magicCircleGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentFwd);

        const beamCenter = currentOrigin.clone().addScaledVector(currentFwd, currentBeamLength / 2);
        laserBeamGroup.position.copy(beamCenter);
        laserBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), currentFwd);

        const endPoint = currentOrigin.clone().addScaledVector(currentFwd, currentBeamLength);
        impactGroup.position.copy(endPoint);
      }

      circlePlane.rotation.z += delta * 2.8;
      outerTorus.rotation.z += delta * 2.2;
      innerTorus.rotation.z -= delta * 1.8;
      crossH.rotation.z += delta * 1.5;
      crossV.rotation.z += delta * 1.5;

      const pulse = 1.0 + Math.sin(elapsed * 45) * 0.14;
      coreCyl.scale.set(pulse, 1, pulse);
      plasmaCyl.scale.set(pulse, 1, pulse);
      const shroudPulse = 1.0 + Math.sin(elapsed * 25) * 0.16;
      shroudCyl.scale.set(shroudPulse, 1, shroudPulse);

      ringMeshes.forEach((rm, i) => {
        rm.rotation.x += delta * (5 + i * 1.2);
        rm.rotation.y += delta * (4 - i * 0.8);
        rm.scale.setScalar(1.0 + Math.sin(elapsed * 20 + i) * 0.18);
      });

      sparkInterval += delta;
      if (sparkInterval >= 0.05) {
        sparkInterval = 0;
        const randDist = 1.2 + Math.random() * (currentBeamLength - 2.5);
        const sparkPos = currentOrigin.clone().addScaledVector(currentFwd, randDist);
        sparkPos.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8));
        const color = Math.random() > 0.4 ? 0x00f0ff : 0xffffff;
        onSpawnSparksCb?.(sparkPos, color, 2, 2.5);
      }

      tickInterval += delta;
      if (tickInterval >= 0.25) {
        tickInterval = 0;
        onHitTickCb?.(true);
      }

      if (timeLeft < 0.25) {
        const alpha = Math.max(0, timeLeft / 0.25);
        this.circlePlaneMat.opacity = 0.95 * alpha;
        this.outerTorusMat.opacity = 0.85 * alpha;
        this.innerTorusMat.opacity = 0.8 * alpha;
        this.coreSphereMat.opacity = 0.98 * alpha;
        this.crossMat.opacity = 0.9 * alpha;
        this.coreCylMat.opacity = alpha;
        this.plasmaCylMat.opacity = 0.85 * alpha;
        this.shroudCylMat.opacity = 0.55 * alpha;
        this.ringMat.opacity = 0.85 * alpha;
        this.impactCoreMat.opacity = 0.95 * alpha;
        this.impactGlowMat.opacity = 0.75 * alpha;
        beamLight.intensity = 4.5 * alpha;
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

  public acquire(params: {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    beamLength?: number;
    duration?: number;
    getOrigin?: () => { origin: THREE.Vector3; direction?: THREE.Vector3 };
    onHitTick?: (isTick: boolean) => void;
    onSpawnSparks?: (pos: THREE.Vector3, color: number, count: number, speed: number) => void;
  }): MageLaserBeamVfxInstance {
    let inst = this.instances.find((b) => !b.isActive);
    if (!inst) {
      inst = this.instances[0];
      inst.cleanup();
    }
    inst.activate(params);
    return inst;
  }
}

/**
 * Creates the Spectacular 3D Mage Arcane Laser Beam & Magic Circle VFX
 * Active duration: exactly 1.0 second (1000 ms).
 * Zero-Lag Implementation: Pre-allocated object pool with pre-warmed WebGL shaders
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
  return ArcaneBeamResourcePool.get().acquire(params);
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

let cachedScorchedCraterTexture: THREE.CanvasTexture | null = null;
export function getScorchedCraterTexture(): THREE.CanvasTexture {
  if (cachedScorchedCraterTexture) return cachedScorchedCraterTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cachedScorchedCraterTexture = new THREE.CanvasTexture(canvas);
    return cachedScorchedCraterTexture;
  }
  const cx = size / 2;
  const cy = size / 2;

  // Dark charred circle with glowing molten radial fade
  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 240);
  grad.addColorStop(0, 'rgba(255, 120, 0, 0.95)');
  grad.addColorStop(0.35, 'rgba(239, 68, 68, 0.75)');
  grad.addColorStop(0.7, 'rgba(40, 10, 5, 0.55)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 240, 0, Math.PI * 2);
  ctx.fill();

  // Draw 14 jagged magma fissure cracks
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + (Math.sin(i * 1.5) * 0.15);
    ctx.save();
    ctx.strokeStyle = '#fef08a';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    let curX = cx;
    let curY = cy;
    const len = 140 + (i % 4) * 30;
    for (let step = 0; step < 5; step++) {
      const segLen = len / 5;
      const deviation = Math.sin(step * 2.1 + i) * 18;
      curX += Math.cos(angle) * segLen + Math.sin(angle) * deviation;
      curY += Math.sin(angle) * segLen - Math.cos(angle) * deviation;
      ctx.lineTo(curX, curY);
    }
    ctx.stroke();
    ctx.restore();
  }
  cachedScorchedCraterTexture = new THREE.CanvasTexture(canvas);
  cachedScorchedCraterTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedScorchedCraterTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedScorchedCraterTexture;
}

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
 * Singleton Static Geometries, Materials & Object Pools for Celestial Apocalypse (Ultimate) & Starfall
 * Eliminates garbage collection spikes and runtime shader compiling freezes at 60 FPS
 */
export class StarfallResourcePool {
  private static instance: StarfallResourcePool | null = null;

  // Casting Circle (Phase 1)
  public circlePlaneGeom!: THREE.PlaneGeometry;
  public outerTorusGeom!: THREE.TorusGeometry;
  public innerTorusGeom!: THREE.TorusGeometry;
  public auraCylGeom!: THREE.CylinderGeometry;
  public sparkGeom!: THREE.SphereGeometry;

  // Glacial Hailstorm (Phase 2 - 14 Ice Crystals)
  public iceCrystalGeom!: THREE.ConeGeometry;
  public iceCoreGeom!: THREE.IcosahedronGeometry;
  public iceMistGeom!: THREE.SphereGeometry;

  // Cataclysmic Giant Meteor (Phase 3 - Radius 3.2 units)
  public giantMeteorGeom!: THREE.DodecahedronGeometry;
  public giantMeteorAtmosphereGeom!: THREE.TorusGeometry;
  public giantMeteorFlameGeom!: THREE.ConeGeometry;

  // Shockwave Rings & Scorched Crater
  public giantShockwaveGeom1!: THREE.TorusGeometry;
  public giantShockwaveGeom2!: THREE.TorusGeometry;
  public scorchedCraterGeom!: THREE.PlaneGeometry;

  // Particle Pool (60 static particle meshes)
  public pooledParticleGeom!: THREE.SphereGeometry;

  // Materials
  public baseShaderMat!: THREE.ShaderMaterial;
  public outerTorusMatCyan!: THREE.MeshBasicMaterial;
  public innerTorusMatGold!: THREE.MeshBasicMaterial;
  public auraCylMat!: THREE.MeshBasicMaterial;
  public leadingSparkMat!: THREE.MeshBasicMaterial;

  public iceCrystalMat!: THREE.MeshBasicMaterial;
  public iceCoreMat!: THREE.MeshBasicMaterial;
  public iceMistMat!: THREE.MeshBasicMaterial;

  public giantMeteorMat!: THREE.MeshBasicMaterial;
  public giantMeteorAtmosphereMat!: THREE.MeshBasicMaterial;
  public giantMeteorFlameMat!: THREE.MeshBasicMaterial;

  public giantShockwaveMat1!: THREE.MeshBasicMaterial;
  public giantShockwaveMat2!: THREE.MeshBasicMaterial;
  public scorchedCraterMat!: THREE.MeshBasicMaterial;

  public pooledIceSparkMat!: THREE.MeshBasicMaterial;
  public pooledEmberMat!: THREE.MeshBasicMaterial;

  // Backward-compatible properties
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

    // 1. Casting Circle Geometries (Radius 14.5 units)
    this.circlePlaneGeom = new THREE.PlaneGeometry(29.0, 29.0);
    this.outerTorusGeom = new THREE.TorusGeometry(14.5, 0.16, 8, 64);
    this.innerTorusGeom = new THREE.TorusGeometry(11.6, 0.12, 8, 56);
    this.auraCylGeom = new THREE.CylinderGeometry(13.8, 14.5, 5.0, 32, 1, true);
    this.sparkGeom = new THREE.SphereGeometry(0.24, 8, 8);

    // 2. Glacial Hailstorm Geometries (14 Ice Crystals)
    this.iceCrystalGeom = new THREE.ConeGeometry(0.75, 2.8, 6);
    this.iceCoreGeom = new THREE.IcosahedronGeometry(0.85, 0);
    this.iceMistGeom = new THREE.SphereGeometry(0.55, 8, 8);

    // 3. Cataclysmic Giant Meteor (Phase 3 - Radius 3.2 units)
    this.giantMeteorGeom = new THREE.DodecahedronGeometry(3.2, 1);
    this.giantMeteorAtmosphereGeom = new THREE.TorusGeometry(3.8, 0.28, 8, 36);
    this.giantMeteorFlameGeom = new THREE.ConeGeometry(3.6, 9.5, 8);

    // 4. Shockwave Rings & Scorched Crater
    this.giantShockwaveGeom1 = new THREE.TorusGeometry(1.0, 0.35, 8, 48);
    this.giantShockwaveGeom2 = new THREE.TorusGeometry(1.0, 0.24, 8, 48);
    this.scorchedCraterGeom = new THREE.PlaneGeometry(12.0, 12.0);

    // 5. Particle Pool
    this.pooledParticleGeom = new THREE.SphereGeometry(0.22, 6, 6);

    // Backward compat aliases
    this.aoeRingGeom = this.outerTorusGeom;
    this.aoeInnerRingGeom = this.innerTorusGeom;
    this.aoeDiskGeom = this.circlePlaneGeom;
    this.meteorCoreGeom = this.iceCrystalGeom;
    this.meteorFlareGeom = this.iceMistGeom;
    this.meteorFlameGeom = this.giantMeteorFlameGeom;
    this.shockwaveGeom = this.giantShockwaveGeom1;
    this.crackGeom = this.scorchedCraterGeom;
    this.shardGeom = this.iceCrystalGeom;

    // Materials
    this.outerTorusMatCyan = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.innerTorusMatGold = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.auraCylMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
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

    this.iceCrystalMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.iceCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.iceMistMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.giantMeteorMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      depthWrite: true,
    });
    this.giantMeteorAtmosphereMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.giantMeteorFlameMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.giantShockwaveMat1 = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.giantShockwaveMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.scorchedCraterMat = new THREE.MeshBasicMaterial({
      map: getScorchedCraterTexture(),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    this.pooledIceSparkMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.pooledEmberMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Backward compat aliases
    this.outerTorusMat = this.outerTorusMatCyan;
    this.innerTorusMat = this.innerTorusMatGold;
    this.aoeRingMat = this.outerTorusMatCyan;
    this.aoeInnerRingMat = this.innerTorusMatGold;
    this.aoeDiskMat = this.auraCylMat;
    this.meteorCrystalMat = this.iceCrystalMat;
    this.meteorWhiteFlareMat = this.iceCoreMat;
    this.meteorFlameMat = this.giantMeteorFlameMat;
    this.shockwaveMat = this.giantShockwaveMat1;
    this.crackMat = this.scorchedCraterMat;
    this.shardMat = this.iceCrystalMat;

    this.baseShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: getStarfallMagicCircleTexture() },
        uProgress: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uElectricColor: { value: new THREE.Vector3(0.22, 0.74, 0.97) },
        uTime: { value: 0.0 },
      },
      vertexShader: starfallCircuitVertexShader,
      fragmentShader: starfallCircuitFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    // Pre-instantiate reusable Casting Circle instances and Barrage instances in pool (4 for stress testing & rapid spam)
    for (let i = 0; i < 4; i++) {
      this.castingCirclePool.push(this.buildCastingCircleInstance());
      this.meteorBarragePool.push(this.buildMeteorBarrageInstance());
    }

    this.isInitialized = true;
  }

  private buildCastingCircleInstance(): StarfallCastingCircleInstance {
    const group = new THREE.Group();
    group.visible = false;

    const shaderMat = this.baseShaderMat.clone();

    // Player casting circle (feet aura)
    const circlePlane = new THREE.Mesh(this.circlePlaneGeom, shaderMat);
    circlePlane.rotation.x = -Math.PI / 2;
    circlePlane.scale.set(0.24, 0.24, 0.24); // Compact player aura scale
    group.add(circlePlane);

    const outerTorusMat = this.outerTorusMatCyan.clone();
    const outerTorus = new THREE.Mesh(this.outerTorusGeom, outerTorusMat);
    outerTorus.rotation.x = Math.PI / 2;
    outerTorus.scale.set(0.24, 0.24, 0.24);
    group.add(outerTorus);

    const innerTorusMat = this.innerTorusMatGold.clone();
    const innerTorus = new THREE.Mesh(this.innerTorusGeom, innerTorusMat);
    innerTorus.rotation.x = Math.PI / 2;
    innerTorus.scale.set(0.24, 0.24, 0.24);
    group.add(innerTorus);

    const auraCylMat = this.auraCylMat.clone();
    const auraCyl = new THREE.Mesh(this.auraCylGeom, auraCylMat);
    auraCyl.scale.set(0.24, 0.01, 0.24);
    auraCyl.position.y = 0.05;
    group.add(auraCyl);

    const circuitSparks: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(this.sparkGeom, this.leadingSparkMat);
      sp.position.set(0, 0.08, 0);
      group.add(sp);
      circuitSparks.push(sp);
    }

    let elapsed = 0;
    let sparkTimer = 0;
    let isActive = false;
    let castDuration = 0.8;
    const fadeDuration = 0.35;
    let spawnSparksCb: ((pos: THREE.Vector3, color: number, count: number, speed: number) => void) | undefined;

    const cleanup = () => {
      isActive = false;
      group.visible = false;
      shaderMat.uniforms.uOpacity.value = 0;
      shaderMat.uniforms.uProgress.value = 0;
      auraCylMat.opacity = 0;
      outerTorusMat.opacity = 0.9;
      innerTorusMat.opacity = 0.9;
      circuitSparks.forEach((sp) => (sp.visible = false));
      if (group.parent) {
        group.parent.remove(group);
      }
    };

    const activate = (
      playerPos: THREE.Vector3,
      duration = 0.8,
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
      auraCyl.scale.set(0.24, 0.01, 0.24);
      auraCyl.position.y = 0.05;

      outerTorusMat.opacity = 0.9;
      innerTorusMat.opacity = 0.9;
      auraCylMat.opacity = 0;

      shaderMat.uniforms.uProgress.value = 0.0;
      shaderMat.uniforms.uOpacity.value = 1.0;
      shaderMat.uniforms.uTime.value = 0.0;

      circuitSparks.forEach((sp) => {
        sp.position.set(0, 0.08, 0);
        sp.visible = true;
      });
    };

    const update = (delta: number, currentPos?: THREE.Vector3): boolean => {
      if (!isActive) return false;

      elapsed += delta;

      if (elapsed <= castDuration && currentPos) {
        group.position.set(currentPos.x, currentPos.y + 0.05, currentPos.z);
      }

      shaderMat.uniforms.uTime.value = elapsed;

      // Counter-rotating dual rings
      outerTorus.rotation.z += delta * 1.5;
      innerTorus.rotation.z -= delta * 1.8;
      auraCyl.rotation.y += delta * 0.9;

      if (elapsed <= castDuration) {
        const progress = Math.min(1.0, elapsed / castDuration);
        shaderMat.uniforms.uProgress.value = progress;
        shaderMat.uniforms.uOpacity.value = 1.0;

        const cylH = Math.min(1.0, progress * 1.2);
        auraCyl.scale.set(0.24, cylH * 0.24, 0.24);
        auraCyl.position.y = (cylH * 5.0 * 0.24) / 2.0;
        auraCylMat.opacity = 0.22 * Math.min(1.0, progress * 1.2);

        const currentScale = Math.min(0.24, progress * 0.24);
        innerTorus.scale.set(currentScale, currentScale, 1);
        outerTorus.scale.set(currentScale, currentScale, 1);

        const sparkRadius = Math.min(3.2, progress * 3.3);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + elapsed * 2.0;
          circuitSparks[i].position.set(Math.cos(a) * sparkRadius, 0.08, Math.sin(a) * sparkRadius);
          circuitSparks[i].visible = true;
        }

        sparkTimer += delta;
        if (sparkTimer >= 0.04) {
          sparkTimer = 0;
          for (let i = 0; i < 4; i++) {
            const spPos = group.position.clone().add(circuitSparks[i].position);
            spawnSparksCb?.(spPos, 0x38bdf8, 2, 2.5);
            spawnSparksCb?.(spPos, 0xfbbf24, 1, 2.0);
          }
        }
      } else {
        const fadeElapsed = elapsed - castDuration;
        const alpha = Math.max(0.0, 1.0 - fadeElapsed / fadeDuration);

        shaderMat.uniforms.uProgress.value = 1.0;
        shaderMat.uniforms.uOpacity.value = alpha;
        auraCylMat.opacity = 0.22 * alpha;
        outerTorusMat.opacity = 0.9 * alpha;
        innerTorusMat.opacity = 0.9 * alpha;
        circuitSparks.forEach((sp) => (sp.visible = false));

        if (elapsed >= castDuration + fadeDuration) {
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

    // 1. Giant Target Runic Circle on Ground (Radius 14.5 units)
    const runicGroup = new THREE.Group();

    const shaderMat = this.baseShaderMat.clone();
    const runicPlane = new THREE.Mesh(this.circlePlaneGeom, shaderMat);
    runicPlane.rotation.x = -Math.PI / 2;
    runicGroup.add(runicPlane);

    // Dual counter-rotating rings: Cyan ice (0x38bdf8) & Cosmic gold (0xfbbf24)
    const outerTorusMat = this.outerTorusMatCyan.clone();
    const outerTorus = new THREE.Mesh(this.outerTorusGeom, outerTorusMat);
    outerTorus.rotation.x = Math.PI / 2;
    runicGroup.add(outerTorus);

    const innerTorusMat = this.innerTorusMatGold.clone();
    const innerTorus = new THREE.Mesh(this.innerTorusGeom, innerTorusMat);
    innerTorus.rotation.x = Math.PI / 2;
    runicGroup.add(innerTorus);

    const auraCylMat = this.auraCylMat.clone();
    const auraCyl = new THREE.Mesh(this.auraCylGeom, auraCylMat);
    auraCyl.position.y = 2.5;
    runicGroup.add(auraCyl);

    group.add(runicGroup);

    // 2. 14 Pre-allocated Glacial Ice Crystals (Glacial Hailstorm)
    interface IceItem {
      mesh: THREE.Group;
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      impactTime: number;
      startTime: number;
      hasImpacted: boolean;
    }

    const iceCrystals: IceItem[] = [];
    const hailstormOffsets: [number, number][] = [
      [-4.2, 3.5],
      [5.1, 2.2],
      [-1.5, -6.2],
      [6.5, -3.8],
      [-7.8, -1.2],
      [2.2, 7.8],
      [-5.5, 6.0],
      [3.8, -7.5],
      [-8.2, 4.5],
      [8.5, 3.2],
      [-3.0, -8.5],
      [7.2, 6.8],
      [-6.8, -5.5],
      [1.0, -2.5],
    ];

    for (let idx = 0; idx < 14; idx++) {
      const cGroup = new THREE.Group();
      const cone = new THREE.Mesh(this.iceCrystalGeom, this.iceCrystalMat);
      cone.rotation.x = Math.PI;
      cGroup.add(cone);

      const core = new THREE.Mesh(this.iceCoreGeom, this.iceCoreMat);
      cGroup.add(core);

      const mist = new THREE.Mesh(this.iceMistGeom, this.iceMistMat);
      mist.position.y = 1.0;
      cGroup.add(mist);

      cGroup.visible = false;
      group.add(cGroup);

      iceCrystals.push({
        mesh: cGroup,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        impactTime: 0,
        startTime: 0,
        hasImpacted: false,
      });
    }

    // 3. Cataclysmic Giant Meteor (Radius 3.2 units)
    const giantMeteorGroup = new THREE.Group();
    const magmaCore = new THREE.Mesh(this.giantMeteorGeom, this.giantMeteorMat);
    giantMeteorGroup.add(magmaCore);

    const atmosphereRing = new THREE.Mesh(this.giantMeteorAtmosphereGeom, this.giantMeteorAtmosphereMat);
    giantMeteorGroup.add(atmosphereRing);

    const flameTail = new THREE.Mesh(this.giantMeteorFlameGeom, this.giantMeteorFlameMat);
    flameTail.position.y = 4.5;
    giantMeteorGroup.add(flameTail);

    giantMeteorGroup.visible = false;
    group.add(giantMeteorGroup);

    const giantMeteorStartPos = new THREE.Vector3();
    const giantMeteorEndPos = new THREE.Vector3();
    let giantMeteorImpacted = false;

    // 4. Shockwave Rings (Expanding up to 14.5 units radius)
    const sw1Mat = this.giantShockwaveMat1.clone();
    const sw1Mesh = new THREE.Mesh(this.giantShockwaveGeom1, sw1Mat);
    sw1Mesh.rotation.x = Math.PI / 2;
    sw1Mesh.visible = false;
    group.add(sw1Mesh);

    const sw2Mat = this.giantShockwaveMat2.clone();
    const sw2Mesh = new THREE.Mesh(this.giantShockwaveGeom2, sw2Mat);
    sw2Mesh.rotation.x = Math.PI / 2;
    sw2Mesh.visible = false;
    group.add(sw2Mesh);

    let swTimer1 = 0;
    let swTimer2 = 0;

    // 5. Scorched Crater Decal (Tanah Membara 3 Detik)
    const craterMat = this.scorchedCraterMat.clone();
    const craterMesh = new THREE.Mesh(this.scorchedCraterGeom, craterMat);
    craterMesh.rotation.x = -Math.PI / 2;
    craterMesh.visible = false;
    group.add(craterMesh);
    let craterActiveTimer = 0;

    // 6. 60 Pooled Static Particles (30 ice sparks + 30 embers)
    interface PooledParticle {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      timer: number;
      maxTimer: number;
      active: boolean;
    }
    const particlePool: PooledParticle[] = [];
    for (let p = 0; p < 60; p++) {
      const isEmber = p >= 30;
      const pMesh = new THREE.Mesh(
        this.pooledParticleGeom,
        isEmber ? this.pooledEmberMat : this.pooledIceSparkMat
      );
      pMesh.visible = false;
      group.add(pMesh);
      particlePool.push({
        mesh: pMesh,
        vel: new THREE.Vector3(),
        timer: 0,
        maxTimer: 1.0,
        active: false,
      });
    }

    const spawnPooledBurst = (center: THREE.Vector3, isEmber: boolean, count: number, speed: number) => {
      let spawned = 0;
      for (let p = 0; p < particlePool.length; p++) {
        const pt = particlePool[p];
        if (pt.active) continue;
        const ptIsEmber = p >= 30;
        if (ptIsEmber !== isEmber) continue;

        pt.active = true;
        pt.timer = 0.5 + Math.random() * 0.4;
        pt.maxTimer = pt.timer;
        pt.mesh.position.copy(center).add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          Math.random() * 0.8,
          (Math.random() - 0.5) * 1.5
        ));
        pt.mesh.scale.set(1, 1, 1);
        pt.mesh.visible = true;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5;
        const spd = speed * (0.6 + Math.random() * 0.8);
        pt.vel.set(
          Math.cos(theta) * Math.cos(phi) * spd,
          Math.sin(phi) * spd + 2.0,
          Math.sin(theta) * Math.cos(phi) * spd
        );

        spawned++;
        if (spawned >= count) break;
      }
    };

    let elapsed = 0;
    let isActive = false;
    const maxTotalLifespan = 6.3; // Full 3-phase Ultimate + 3.0s Scorched Crater + dissipation
    let onImpactCb: ((impactPos: THREE.Vector3, isLast: boolean, index: number) => void) | undefined;
    let onSpawnSparksCb: ((pos: THREE.Vector3, color: number, count: number, speed: number) => void) | undefined;

    const cleanup = () => {
      isActive = false;
      group.visible = false;
      runicGroup.visible = false;
      outerTorusMat.opacity = 0.9;
      innerTorusMat.opacity = 0.9;
      auraCylMat.opacity = 0.18;
      shaderMat.uniforms.uOpacity.value = 0;
      shaderMat.uniforms.uProgress.value = 0;

      iceCrystals.forEach((c) => {
        c.mesh.visible = false;
        c.hasImpacted = true;
      });

      giantMeteorGroup.visible = false;
      giantMeteorImpacted = true;

      sw1Mesh.visible = false;
      sw2Mesh.visible = false;
      craterMesh.visible = false;
      craterActiveTimer = 0;

      particlePool.forEach((pt) => {
        pt.active = false;
        pt.mesh.visible = false;
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

      // Phase 1: Setup 14.5 unit Runic Circle at targetCenter
      runicGroup.visible = true;
      runicGroup.position.set(targetCenter.x, targetCenter.y + 0.05, targetCenter.z);
      outerTorus.scale.set(1, 1, 1);
      innerTorus.scale.set(1, 1, 1);
      outerTorusMat.opacity = 0.9;
      innerTorusMat.opacity = 0.9;
      auraCylMat.opacity = 0.18;
      shaderMat.uniforms.uProgress.value = 0.0;
      shaderMat.uniforms.uOpacity.value = 1.0;
      shaderMat.uniforms.uTime.value = 0.0;

      // Phase 2: Setup 14 Glacial Ice Crystals
      hailstormOffsets.forEach(([ox, oz], idx) => {
        const ice = iceCrystals[idx];
        ice.endPos.set(targetCenter.x + ox, targetCenter.y, targetCenter.z + oz);
        ice.startPos.copy(ice.endPos).add(new THREE.Vector3(-10 + (idx % 3) * 2, 42, -8 + (idx % 4) * 2));
        ice.impactTime = 0.85 + idx * 0.135; // Staggered between 0.85s and 2.65s
        ice.startTime = Math.max(0.0, ice.impactTime - 0.35); // 0.35s travel duration
        ice.hasImpacted = false;
        ice.mesh.position.copy(ice.startPos);

        const travelDir = new THREE.Vector3().subVectors(ice.endPos, ice.startPos).normalize();
        ice.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), travelDir);
        ice.mesh.visible = false;
      });

      // Phase 3: Setup Giant Meteor (radius 3.2)
      giantMeteorEndPos.copy(targetCenter);
      giantMeteorStartPos.copy(targetCenter).add(new THREE.Vector3(-14, 52, -10));
      giantMeteorGroup.position.copy(giantMeteorStartPos);
      giantMeteorGroup.scale.set(1, 1, 1);
      giantMeteorGroup.visible = false;
      giantMeteorImpacted = false;

      const meteorDir = new THREE.Vector3().subVectors(giantMeteorEndPos, giantMeteorStartPos).normalize();
      giantMeteorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), meteorDir);

      sw1Mesh.visible = false;
      sw2Mesh.visible = false;
      swTimer1 = 0;
      swTimer2 = 0;

      craterMesh.position.set(targetCenter.x, targetCenter.y + 0.06, targetCenter.z);
      craterMesh.visible = false;
      craterActiveTimer = 0;

      particlePool.forEach((pt) => {
        pt.active = false;
        pt.mesh.visible = false;
      });
    };

    const triggerHailImpact = (idx: number, impactPos: THREE.Vector3) => {
      spawnPooledBurst(impactPos, false, 4, 4.5);
      onSpawnSparksCb?.(impactPos.clone().add(new THREE.Vector3(0, 0.4, 0)), 0x38bdf8, 10, 4.5);
      onSpawnSparksCb?.(impactPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xffffff, 6, 3.5);
      onImpactCb?.(impactPos, false, idx);
    };

    const triggerGiantMeteorImpact = (impactCenter: THREE.Vector3) => {
      giantMeteorImpacted = true;
      giantMeteorGroup.visible = false;

      // 1. Shockwaves expanding to 14.5 units radius
      sw1Mesh.position.set(impactCenter.x, impactCenter.y + 0.08, impactCenter.z);
      sw1Mesh.scale.set(1, 1, 1);
      sw1Mesh.visible = true;
      swTimer1 = 0.55;

      sw2Mesh.position.set(impactCenter.x, impactCenter.y + 0.09, impactCenter.z);
      sw2Mesh.scale.set(1, 1, 1);
      sw2Mesh.visible = true;
      swTimer2 = 0.65;

      // 2. Scorched Crater Decal (Tanah Membara 3 Detik)
      craterMesh.position.set(impactCenter.x, impactCenter.y + 0.06, impactCenter.z);
      craterMesh.visible = true;
      craterMat.opacity = 0.95;
      craterActiveTimer = 3.0; // 3.0s active burning ground

      // 3. Pooled Ember & Fire Burst (30 embers + sparks)
      spawnPooledBurst(impactCenter, true, 26, 8.5);
      onSpawnSparksCb?.(impactCenter.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xf97316, 32, 7.5);
      onSpawnSparksCb?.(impactCenter.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfbbf24, 24, 6.5);
      onSpawnSparksCb?.(impactCenter.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffffff, 16, 5.0);

      onImpactCb?.(impactCenter, true, 14);
    };

    const update = (delta: number): boolean => {
      if (!isActive) return false;

      elapsed += delta;
      shaderMat.uniforms.uTime.value = elapsed;

      // Counter-rotating dual rings at target area
      outerTorus.rotation.z += delta * 1.0;
      innerTorus.rotation.z -= delta * 1.4;
      auraCyl.rotation.y += delta * 0.7;

      // Phase 1: Cosmic Runic Circle Reveal (0.0s - 0.8s)
      if (elapsed <= 0.8) {
        const progress = Math.min(1.0, elapsed / 0.8);
        shaderMat.uniforms.uProgress.value = progress;
        shaderMat.uniforms.uOpacity.value = 1.0;
      } else {
        shaderMat.uniforms.uProgress.value = 1.0;
      }

      // Phase 2: Glacial Hailstorm (0.8s - 2.8s)
      for (let i = 0; i < iceCrystals.length; i++) {
        const ice = iceCrystals[i];
        if (ice.hasImpacted) continue;

        if (elapsed >= ice.startTime && elapsed < ice.impactTime) {
          ice.mesh.visible = true;
          const t = (elapsed - ice.startTime) / (ice.impactTime - ice.startTime);
          ice.mesh.position.lerpVectors(ice.startPos, ice.endPos, t);
        } else if (elapsed >= ice.impactTime) {
          ice.hasImpacted = true;
          ice.mesh.visible = false;
          triggerHailImpact(i, ice.endPos);
        }
      }

      // Phase 3: Cataclysmic Giant Meteor (2.8s - 3.2s)
      if (!giantMeteorImpacted) {
        if (elapsed >= 2.8 && elapsed < 3.2) {
          giantMeteorGroup.visible = true;
          const t = (elapsed - 2.8) / 0.4;
          giantMeteorGroup.position.lerpVectors(giantMeteorStartPos, giantMeteorEndPos, t);
          magmaCore.rotation.y += delta * 4.0;
          magmaCore.rotation.x += delta * 2.0;
          atmosphereRing.rotation.z += delta * 6.0;
        } else if (elapsed >= 3.2) {
          triggerGiantMeteorImpact(giantMeteorEndPos);
        }
      }

      // Shockwave Ring 1 Animation
      if (swTimer1 > 0) {
        swTimer1 -= delta;
        const t = Math.max(0, swTimer1 / 0.55);
        const radiusScale = 1.0 + (1.0 - t) * 13.5; // Expands to 14.5 units radius
        sw1Mesh.scale.set(radiusScale, radiusScale, 1);
        sw1Mat.opacity = t * 0.95;
        if (swTimer1 <= 0) {
          sw1Mesh.visible = false;
        }
      }

      // Shockwave Ring 2 Animation
      if (swTimer2 > 0) {
        swTimer2 -= delta;
        const t = Math.max(0, swTimer2 / 0.65);
        const radiusScale = 1.0 + (1.0 - t) * 14.5;
        sw2Mesh.scale.set(radiusScale, radiusScale, 1);
        sw2Mat.opacity = t * 0.90;
        if (swTimer2 <= 0) {
          sw2Mesh.visible = false;
        }
      }

      // Scorched Crater (Tanah Membara 3 Detik: 3.2s to 6.2s)
      if (craterActiveTimer > 0) {
        craterActiveTimer -= delta;
        if (craterActiveTimer <= 0.6) {
          // Smooth fade-out in final 0.6 seconds
          craterMat.opacity = Math.max(0, (craterActiveTimer / 0.6) * 0.95);
        }
        if (craterActiveTimer <= 0) {
          craterMesh.visible = false;
        }
      }

      // Update pooled particles (zero dynamic GC)
      for (let p = 0; p < particlePool.length; p++) {
        const pt = particlePool[p];
        if (!pt.active) continue;
        pt.timer -= delta;
        pt.mesh.position.addScaledVector(pt.vel, delta);
        pt.vel.y -= 14.0 * delta; // Gravity
        const lifeT = Math.max(0, pt.timer / pt.maxTimer);
        pt.mesh.scale.set(lifeT, lifeT, lifeT);
        if (pt.timer <= 0) {
          pt.active = false;
          pt.mesh.visible = false;
        }
      }

      // Fade out Runic Circle after 5.7s to 6.3s
      if (elapsed > 5.7) {
        const aoeAlpha = Math.max(0, (maxTotalLifespan - elapsed) / (maxTotalLifespan - 5.7));
        outerTorusMat.opacity = 0.9 * aoeAlpha;
        innerTorusMat.opacity = 0.9 * aoeAlpha;
        auraCylMat.opacity = 0.18 * aoeAlpha;
        shaderMat.uniforms.uOpacity.value = aoeAlpha;
      }

      if (elapsed >= maxTotalLifespan) {
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
    duration = 0.8,
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

// Celestial Apocalypse backward-compatible aliases
export const CelestialApocalypseResourcePool = StarfallResourcePool;

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

    // Celestial Apocalypse Ultimate Geometries & Materials Pre-compilation
    dummyGroup.add(new THREE.Mesh(starfallPool.giantMeteorGeom, starfallPool.giantMeteorMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.giantMeteorAtmosphereGeom, starfallPool.giantMeteorAtmosphereMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.giantMeteorFlameGeom, starfallPool.giantMeteorFlameMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.giantShockwaveGeom1, starfallPool.giantShockwaveMat1));
    dummyGroup.add(new THREE.Mesh(starfallPool.giantShockwaveGeom2, starfallPool.giantShockwaveMat2));
    dummyGroup.add(new THREE.Mesh(starfallPool.scorchedCraterGeom, starfallPool.scorchedCraterMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.iceCrystalGeom, starfallPool.iceCrystalMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.iceCoreGeom, starfallPool.iceCoreMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.iceMistGeom, starfallPool.iceMistMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.pooledParticleGeom, starfallPool.pooledIceSparkMat));
    dummyGroup.add(new THREE.Mesh(starfallPool.pooledParticleGeom, starfallPool.pooledEmberMat));

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

    // Glacial Crystal Barrage Material Pre-compilation
    const glacialPool = GlacialBarrageResourcePool.get();
    dummyGroup.add(new THREE.Mesh(glacialPool.iceShardGeom, glacialPool.iceShardMat));
    dummyGroup.add(new THREE.Mesh(glacialPool.iceShardCoreGeom, glacialPool.iceShardCoreMat));
    dummyGroup.add(new THREE.Mesh(glacialPool.frostTrailGeom, glacialPool.frostTrailMat));
    dummyGroup.add(new THREE.Mesh(glacialPool.shatterSparkGeom, glacialPool.shatterSparkMat));

    dummyGroup.visible = true;
    dummyGroup.traverse((child) => {
      child.visible = true;
      child.frustumCulled = false;
    });

    // In-Frustum GPU Shader Warm-Up: Position 5 units directly ahead of camera
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    dummyGroup.position.copy(camera.position).addScaledVector(camDir, 5.0);
    dummyGroup.lookAt(camera.position);

    scene.add(dummyGroup);
    try {
      renderer.compile(scene, camera);
      // Run 2 full frames behind loading screen so GPU driver compiles 100% shaders & uploads textures to VRAM
      renderer.render(scene, camera);
      renderer.render(scene, camera);
    } catch (e) {
      console.warn('[VFX] Shader prewarm render error:', e);
    }

    dummyGroup.visible = false;
    dummyGroup.traverse((child) => {
      child.visible = false;
      child.frustumCulled = true;
    });
    scene.remove(dummyGroup);
  }
}

/**
 * Time-Sliced Async GPU Shader Warm-Up for Mage VFX
 * Renders 2 consecutive frames with yieldToMainThread in between
 * to compile 100% shaders to VRAM without freezing the UI or browser tab.
 */
export async function preloadMageVfxPoolAsync(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  yieldFn: () => Promise<void>
): Promise<void> {
  const starfallPool = StarfallResourcePool.get();
  const arcanePool = ArcaneBeamResourcePool.get();
  const celestialPool = CelestialHealResourcePool.get();
  const blinkPool = MageBlinkResourcePool.get();

  getStarfallMagicCircleTexture();
  getMageMagicCircleTexture();

  const dummyGroup = new THREE.Group();
  dummyGroup.name = 'MageVfx_PrewarmAsyncGroup';

  // 1. Starfall & Celestial Apocalypse (Lingkaran Sihir, Kristal Es, Meteor Raksasa, Shockwave Ring)
  dummyGroup.add(new THREE.Mesh(starfallPool.circlePlaneGeom, starfallPool.baseShaderMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.outerTorusGeom, starfallPool.outerTorusMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.innerTorusGeom, starfallPool.innerTorusMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.auraCylGeom, starfallPool.auraCylMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.aoeRingGeom, starfallPool.aoeRingMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.aoeDiskGeom, starfallPool.aoeDiskMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.giantMeteorGeom, starfallPool.giantMeteorMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.giantMeteorAtmosphereGeom, starfallPool.giantMeteorAtmosphereMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.giantMeteorFlameGeom, starfallPool.giantMeteorFlameMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.giantShockwaveGeom1, starfallPool.giantShockwaveMat1));
  dummyGroup.add(new THREE.Mesh(starfallPool.giantShockwaveGeom2, starfallPool.giantShockwaveMat2));
  dummyGroup.add(new THREE.Mesh(starfallPool.scorchedCraterGeom, starfallPool.scorchedCraterMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.iceCrystalGeom, starfallPool.iceCrystalMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.iceCoreGeom, starfallPool.iceCoreMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.iceMistGeom, starfallPool.iceMistMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.pooledParticleGeom, starfallPool.pooledIceSparkMat));
  dummyGroup.add(new THREE.Mesh(starfallPool.pooledParticleGeom, starfallPool.pooledEmberMat));

  // 2. Arcane Laser Beam
  dummyGroup.add(new THREE.Mesh(arcanePool.circlePlaneGeom, arcanePool.circlePlaneMat));
  dummyGroup.add(new THREE.Mesh(arcanePool.coreCylGeom, arcanePool.coreCylMat));
  dummyGroup.add(new THREE.Mesh(arcanePool.plasmaCylGeom, arcanePool.plasmaCylMat));
  dummyGroup.add(new THREE.Mesh(arcanePool.shroudCylGeom, arcanePool.shroudCylMat));
  dummyGroup.add(new THREE.Mesh(arcanePool.ringGeom, arcanePool.ringMat));

  // 3. Cahaya Suci (Celestial Heal)
  dummyGroup.add(new THREE.Mesh(celestialPool.circlePlaneGeom, celestialPool.baseShaderMat));
  dummyGroup.add(new THREE.Mesh(celestialPool.outerBeamGeom, celestialPool.outerBeamMat));
  dummyGroup.add(new THREE.Mesh(celestialPool.innerBeamGeom, celestialPool.innerBeamMat));
  dummyGroup.add(new THREE.Mesh(celestialPool.runeRingGeom1, celestialPool.runeRingMat1));
  dummyGroup.add(new THREE.Mesh(celestialPool.runeRingGeom2, celestialPool.runeRingMat2));
  dummyGroup.add(new THREE.Points(celestialPool.stardustGeom, celestialPool.stardustMat));
  dummyGroup.add(new THREE.Mesh(celestialPool.shockwaveGeom1, celestialPool.shockwaveMat1));

  // 4. Arcane Blink
  dummyGroup.add(new THREE.Mesh(blinkPool.circlePlaneGeom, blinkPool.departureCircleMat));
  dummyGroup.add(new THREE.Mesh(blinkPool.circlePlaneGeom, blinkPool.arrivalCircleMat));
  dummyGroup.add(new THREE.Mesh(blinkPool.tracerGeom, blinkPool.tracerMat));
  dummyGroup.add(new THREE.Mesh(blinkPool.tracerCoreGeom, blinkPool.tracerCoreMat));
  dummyGroup.add(new THREE.Mesh(blinkPool.torsoGeom, blinkPool.afterimageMat1));
  dummyGroup.add(new THREE.Mesh(blinkPool.shockwaveGeom1, blinkPool.landingShockwaveMatCyan));

  // 5. Glacial Crystal Barrage
  const glacialPool = GlacialBarrageResourcePool.get();
  dummyGroup.add(new THREE.Mesh(glacialPool.iceShardGeom, glacialPool.iceShardMat));
  dummyGroup.add(new THREE.Mesh(glacialPool.iceShardCoreGeom, glacialPool.iceShardCoreMat));
  dummyGroup.add(new THREE.Mesh(glacialPool.frostTrailGeom, glacialPool.frostTrailMat));
  dummyGroup.add(new THREE.Mesh(glacialPool.shatterSparkGeom, glacialPool.shatterSparkMat));

  dummyGroup.visible = true;
  dummyGroup.traverse((child) => {
    child.visible = true;
    child.frustumCulled = false;
  });

  // Position directly ahead of camera
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  dummyGroup.position.copy(camera.position).addScaledVector(camDir, 5.0);
  dummyGroup.lookAt(camera.position);

  scene.add(dummyGroup);

  try {
    await new Promise((r) => setTimeout(r, 30));
    if ('compileAsync' in renderer && typeof (renderer as any).compileAsync === 'function') {
      await (renderer as any).compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
    }
    await new Promise((r) => setTimeout(r, 30));
    // Render Frame 1
    renderer.render(scene, camera);
    await yieldFn();
    await new Promise((r) => setTimeout(r, 30));
    // Render Frame 2
    renderer.render(scene, camera);
    await yieldFn();
    await new Promise((r) => setTimeout(r, 30));
  } catch (e) {
    console.warn('[VFX] Async shader prewarm render error:', e);
  } finally {
    dummyGroup.visible = false;
    dummyGroup.traverse((child) => {
      child.visible = false;
      child.frustumCulled = true;
    });
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

export const createCelestialApocalypseVfx = createStarfallMeteorBarrageVfx;
export type CelestialApocalypseInstance = StarfallMeteorBarrageInstance;

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

    // 7. Dynamic PointLight: soft cyan (not added to scene graph to maintain static lighting)
    const pointLight = new THREE.PointLight(0x67e8f9, 0.0, 6.0);
    pointLight.position.set(0, 1.0, 0);

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

// ============================================================================
// GLACIAL CRYSTAL BARRAGE RESOURCE POOL (Mage Skill 1 [Q])
// 12 Aimable Ice Shards Wide Arc Curtain Formation + Sequential High-Speed Barrage
// ============================================================================

export interface GlacialBarrageVfxInstance {
  group: THREE.Group;
  isActive: boolean;
  readonly isAiming: boolean;
  activate: (
    casterPos: THREE.Vector3,
    casterRotationY: number,
    onShardLaunch?: (index: number) => void,
    onShardHit?: (targetEnemy: any, hitPos: THREE.Vector3) => void,
    onShardGroundHit?: (hitPos: THREE.Vector3) => void,
    isHoldToAim?: boolean
  ) => void;
  releaseFire: (finalTargetPoint?: THREE.Vector3) => void;
  cancel: () => void;
  update: (
    delta: number,
    casterPos: THREE.Vector3,
    casterRotationY: number,
    aimTargetPoint: THREE.Vector3,
    enemies: any[],
    getTerrainHeight: (x: number, z: number) => number
  ) => boolean;
  cleanup: () => void;
}

export class GlacialBarrageResourcePool {
  private static instance: GlacialBarrageResourcePool | null = null;

  // Shared Geometries
  public iceShardGeom!: THREE.BufferGeometry;
  public iceShardCoreGeom!: THREE.BufferGeometry;
  public frostTrailGeom!: THREE.CylinderGeometry;
  public shatterSparkGeom!: THREE.TetrahedronGeometry;

  // Shared Materials
  public iceShardMat!: THREE.MeshStandardMaterial;
  public iceShardCoreMat!: THREE.MeshBasicMaterial;
  public frostTrailMat!: THREE.MeshBasicMaterial;
  public shatterSparkMat!: THREE.MeshBasicMaterial;

  public isInitialized = false;
  private instances: GlacialBarrageVfxInstance[] = [];

  public static get(): GlacialBarrageResourcePool {
    if (!GlacialBarrageResourcePool.instance) {
      GlacialBarrageResourcePool.instance = new GlacialBarrageResourcePool();
      GlacialBarrageResourcePool.instance.init();
    }
    return GlacialBarrageResourcePool.instance;
  }

  private createFacetedIceDiamondGeom(length: number, radiusX: number, radiusY: number, numPerimeter: number = 8): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const halfLen = length / 2;
    const positions: number[] = [];
    const indices: number[] = [];

    // Vertex 0: Front Apex (0, 0, halfLen) -> along +Z
    // Vertex 1: Back Apex (0, 0, -halfLen) -> along -Z
    positions.push(0, 0, halfLen);
    positions.push(0, 0, -halfLen);

    // Perimeter vertices at Z = 0
    for (let i = 0; i < numPerimeter; i++) {
      const theta = (i / numPerimeter) * Math.PI * 2;
      positions.push(Math.cos(theta) * radiusX, Math.sin(theta) * radiusY, 0);
    }

    // Front faces (Apex 0 to perimeter)
    for (let i = 0; i < numPerimeter; i++) {
      const next = (i + 1) % numPerimeter;
      indices.push(0, 2 + i, 2 + next);
    }

    // Back faces (Apex 1 to perimeter)
    for (let i = 0; i < numPerimeter; i++) {
      const next = (i + 1) % numPerimeter;
      indices.push(1, 2 + next, 2 + i);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  private init() {
    if (this.isInitialized) return;

    // 1. Geometries
    this.iceShardGeom = this.createFacetedIceDiamondGeom(2.3, 0.28, 0.20, 8);
    this.iceShardCoreGeom = this.createFacetedIceDiamondGeom(1.65, 0.16, 0.12, 6);

    // Frost trail extends along -Z behind the shard
    const trailGeom = new THREE.CylinderGeometry(0.02, 0.22, 1.8, 8, 1, true);
    trailGeom.rotateX(Math.PI / 2);
    trailGeom.translate(0, 0, -2.0);
    this.frostTrailGeom = trailGeom;

    this.shatterSparkGeom = new THREE.TetrahedronGeometry(0.13, 0);

    // 2. Materials
    this.iceShardMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.90,
      depthWrite: true,
    });

    this.iceShardCoreMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.frostTrailMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.70,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.shatterSparkMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 3. Pre-allocate VFX instances (6 instances for stress testing & rapid spam)
    for (let k = 0; k < 6; k++) {
      this.instances.push(this.createVfxInstance());
    }

    this.isInitialized = true;
  }

  private createVfxInstance(): GlacialBarrageVfxInstance {
    const group = new THREE.Group();
    group.name = 'GlacialBarrageVfxInstance';
    group.visible = false;

    // 12 Shard Objects
    interface PooledShard {
      group: THREE.Group;
      crystalMesh: THREE.Mesh;
      coreMesh: THREE.Mesh;
      trailMesh: THREE.Mesh;
      worldPos: THREE.Vector3;
      velocity: THREE.Vector3;
      localOffset: THREE.Vector3;
      fireTime: number;
      hasFired: boolean;
      flightTimer: number;
      state: 'inactive' | 'forming' | 'flying' | 'impacted';
    }

    const shards: PooledShard[] = [];
    const NUM_SHARDS = 12;

    for (let i = 0; i < NUM_SHARDS; i++) {
      const shardGroup = new THREE.Group();
      shardGroup.name = `IceShard_${i}`;
      shardGroup.visible = false;

      const crystalMesh = new THREE.Mesh(this.iceShardGeom, this.iceShardMat);
      const coreMesh = new THREE.Mesh(this.iceShardCoreGeom, this.iceShardCoreMat);
      const trailMesh = new THREE.Mesh(this.frostTrailGeom, this.frostTrailMat);
      trailMesh.visible = false;

      shardGroup.add(crystalMesh);
      shardGroup.add(coreMesh);
      shardGroup.add(trailMesh);
      group.add(shardGroup);

      // Wide arc curtain coordinates (above & behind shoulders)
      // i: 0 to 11 -> u: -1.0 to +1.0
      const u = (i / (NUM_SHARDS - 1)) * 2.0 - 1.0;
      const localX = u * 4.5; // X: -4.5 to +4.5
      // Height Y: 2.8 to 5.2 units
      const staggerY = i % 2 === 0 ? 0.15 : -0.15;
      const localY = Math.max(2.8, Math.min(5.2, 3.2 + (1.0 - u * u) * 1.9 + staggerY));
      // Curved backwards behind shoulders: -1.2 at edges, -2.6 at center
      const staggerZ = i % 2 === 1 ? -0.22 : 0.22;
      const localZ = -1.2 - (1.0 - u * u) * 1.4 + staggerZ;

      shards.push({
        group: shardGroup,
        crystalMesh,
        coreMesh,
        trailMesh,
        worldPos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        localOffset: new THREE.Vector3(localX, localY, localZ),
        fireTime: 0,
        hasFired: false,
        flightTimer: 0,
        state: 'inactive',
      });
    }

    // 40 Pooled Shatter Particles
    interface ShatterParticle {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      timer: number;
      maxTimer: number;
      active: boolean;
    }
    const particlePool: ShatterParticle[] = [];
    for (let p = 0; p < 40; p++) {
      const pMesh = new THREE.Mesh(this.shatterSparkGeom, this.shatterSparkMat);
      pMesh.visible = false;
      group.add(pMesh);
      particlePool.push({
        mesh: pMesh,
        vel: new THREE.Vector3(),
        timer: 0,
        maxTimer: 0.5,
        active: false,
      });
    }

    const spawnShatterBurst = (pos: THREE.Vector3, count: number, speed: number) => {
      let spawned = 0;
      for (let p = 0; p < particlePool.length; p++) {
        const pt = particlePool[p];
        if (pt.active) continue;

        pt.active = true;
        pt.timer = 0.35 + Math.random() * 0.25;
        pt.maxTimer = pt.timer;
        pt.mesh.position.copy(pos).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        ));
        pt.mesh.scale.set(1, 1, 1);
        pt.mesh.visible = true;

        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.3) * Math.PI;
        const spd = speed * (0.65 + Math.random() * 0.7);
        pt.vel.set(
          Math.cos(theta) * Math.cos(phi) * spd,
          Math.sin(phi) * spd + 1.8,
          Math.sin(theta) * Math.cos(phi) * spd
        );

        spawned++;
        if (spawned >= count) break;
      }
    };

    let elapsed = 0;
    let isActive = false;
    let isHoldingAim = false;
    let fireStartTime = -1;
    let lockedTargetPoint: THREE.Vector3 | null = null;
    let onShardLaunchCb: ((index: number) => void) | undefined;
    let onShardHitCb: ((targetEnemy: any, hitPos: THREE.Vector3) => void) | undefined;
    let onShardGroundHitCb: ((hitPos: THREE.Vector3) => void) | undefined;

    // Firing order: outer to inner alternating
    const FIRE_ORDER = [0, 11, 1, 10, 2, 9, 3, 8, 4, 7, 5, 6];

    const cleanup = () => {
      isActive = false;
      isHoldingAim = false;
      fireStartTime = -1;
      lockedTargetPoint = null;
      group.visible = false;
      shards.forEach((s) => {
        s.state = 'inactive';
        s.group.visible = false;
        s.trailMesh.visible = false;
        s.hasFired = false;
        s.flightTimer = 0;
      });
      particlePool.forEach((pt) => {
        pt.active = false;
        pt.mesh.visible = false;
      });
      if (group.parent) {
        group.parent.remove(group);
      }
    };

    const activate = (
      casterPos: THREE.Vector3,
      casterRotationY: number,
      onShardLaunch?: (index: number) => void,
      onShardHit?: (targetEnemy: any, hitPos: THREE.Vector3) => void,
      onShardGroundHit?: (hitPos: THREE.Vector3) => void,
      isHoldToAim = false
    ) => {
      elapsed = 0;
      isActive = true;
      isHoldingAim = isHoldToAim;
      fireStartTime = isHoldToAim ? -1 : 0.45;
      lockedTargetPoint = null;
      group.visible = true;
      onShardLaunchCb = onShardLaunch;
      onShardHitCb = onShardHit;
      onShardGroundHitCb = onShardGroundHit;

      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), casterRotationY);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), casterRotationY);
      const up = new THREE.Vector3(0, 1, 0);

      // Setup shards
      for (let i = 0; i < NUM_SHARDS; i++) {
        const s = shards[i];
        s.state = 'forming';
        s.group.visible = true;
        s.trailMesh.visible = false;
        s.hasFired = false;
        s.flightTimer = 0;
        s.group.scale.set(0.001, 0.001, 0.001);

        s.worldPos.copy(casterPos)
          .addScaledVector(right, s.localOffset.x)
          .addScaledVector(up, s.localOffset.y)
          .addScaledVector(fwd, s.localOffset.z);
        s.group.position.copy(s.worldPos);

        // Schedule fire times (interval 0.075s from outer to inner)
        const orderIdx = FIRE_ORDER.indexOf(i);
        s.fireTime = isHoldToAim ? Infinity : 0.45 + orderIdx * 0.075;
      }
    };

    const releaseFire = (finalTargetPoint?: THREE.Vector3) => {
      if (!isActive) return;
      isHoldingAim = false;
      fireStartTime = elapsed;
      if (finalTargetPoint) {
        lockedTargetPoint = finalTargetPoint.clone();
      }
      for (let i = 0; i < NUM_SHARDS; i++) {
        const orderIdx = FIRE_ORDER.indexOf(i);
        shards[i].fireTime = fireStartTime + orderIdx * 0.075;
      }
    };

    const cancel = () => {
      cleanup();
    };

    const update = (
      delta: number,
      casterPos: THREE.Vector3,
      casterRotationY: number,
      aimTargetPoint: THREE.Vector3,
      enemies: any[],
      getTerrainHeight: (x: number, z: number) => number
    ): boolean => {
      if (!isActive) return false;
      elapsed += delta;

      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), casterRotationY);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), casterRotationY);
      const up = new THREE.Vector3(0, 1, 0);

      let anyFlyingOrForming = false;

      // Update shards
      for (let i = 0; i < NUM_SHARDS; i++) {
        const s = shards[i];

        if (s.state === 'forming') {
          anyFlyingOrForming = true;
          // Scale-in between 0.0s and 0.25s
          const u = (i / (NUM_SHARDS - 1)) * 2.0 - 1.0;
          const appearTime = Math.abs(u) * 0.08;
          const p = Math.max(0, Math.min(1.0, (elapsed - appearTime) / 0.16));
          const scale = isHoldingAim
            ? 1.0
            : (p < 1.0 ? p * p * (3.0 - 2.0 * p) * 1.15 : 1.0);
          s.group.scale.set(scale, scale, scale);

          // Update position relative to moving caster during Phase 1 / Aiming
          s.worldPos.copy(casterPos)
            .addScaledVector(right, s.localOffset.x)
            .addScaledVector(up, s.localOffset.y)
            .addScaledVector(fwd, s.localOffset.z);
          s.group.position.copy(s.worldPos);

          // Dynamic Aimable Tracking: continuous lookAt towards aim target
          const curTarget = lockedTargetPoint || aimTargetPoint;
          s.group.lookAt(curTarget);

          // Check if time to launch (only when NOT holding aim)
          if (!isHoldingAim && elapsed >= s.fireTime && !s.hasFired) {
            s.hasFired = true;
            s.state = 'flying';
            s.group.scale.set(1, 1, 1);
            s.trailMesh.visible = true;

            // Fire velocity: 48 units/s directly towards aimTargetPoint / locked target
            const target = lockedTargetPoint || aimTargetPoint;
            s.velocity.subVectors(target, s.worldPos).normalize().multiplyScalar(48.0);
            s.group.lookAt(s.worldPos.clone().add(s.velocity));

            const orderIdx = FIRE_ORDER.indexOf(i);
            onShardLaunchCb?.(orderIdx);
          }
        } else if (s.state === 'flying') {
          anyFlyingOrForming = true;
          s.flightTimer += delta;

          // Soft-homing: steer slightly towards nearest live enemy in cone
          let bestTargetPos: THREE.Vector3 | null = null;
          let bestScore = Infinity;
          for (let e = 0; e < enemies.length; e++) {
            const enemy = enemies[e];
            if (enemy.data?.isDead) continue;
            const isBoss = enemy.data.type === 'boss' || enemy.data.id?.startsWith('boss_');
            const ePos = enemy.mesh.position.clone();
            ePos.y += isBoss ? 2.2 : 0.9;

            const toE = ePos.clone().sub(s.worldPos);
            const dist = toE.length();
            if (dist > 32) continue;
            toE.normalize();
            const dot = s.velocity.clone().normalize().dot(toE);
            if (dot > 0.35) { // within ~69 degree cone
              const score = dist - dot * 12;
              if (score < bestScore) {
                bestScore = score;
                bestTargetPos = ePos;
              }
            }
          }

          if (bestTargetPos) {
            const desiredDir = bestTargetPos.clone().sub(s.worldPos).normalize();
            const curDir = s.velocity.clone().normalize();
            curDir.lerp(desiredDir, Math.min(1.0, 7.5 * delta));
            s.velocity.copy(curDir.multiplyScalar(48.0));
          }

          // Advance position
          s.worldPos.addScaledVector(s.velocity, delta);
          s.group.position.copy(s.worldPos);
          s.group.lookAt(s.worldPos.clone().add(s.velocity));

          // 1. Enemy collision detection
          for (let e = 0; e < enemies.length; e++) {
            const enemy = enemies[e];
            if (enemy.data?.isDead) continue;
            const isBoss = enemy.data.type === 'boss' || enemy.data.id?.startsWith('boss_');
            const hitRadius = isBoss ? 3.5 : 1.6;
            const ePos = enemy.mesh.position.clone();
            ePos.y += isBoss ? 2.2 : 0.9;

            if (s.worldPos.distanceTo(ePos) <= hitRadius) {
              s.state = 'impacted';
              s.group.visible = false;
              spawnShatterBurst(s.worldPos, 10, 4.8);
              onShardHitCb?.(enemy, s.worldPos);
              break;
            }
          }

          // 2. Terrain collision detection
          if (s.state === 'flying') {
            const terrainH = getTerrainHeight(s.worldPos.x, s.worldPos.z);
            if (s.worldPos.y <= terrainH + 0.25) {
              s.state = 'impacted';
              s.group.visible = false;
              s.worldPos.y = terrainH + 0.1;
              spawnShatterBurst(s.worldPos, 8, 3.8);
              onShardGroundHitCb?.(s.worldPos);
            }
          }

          // 3. Max flight timeout (1.35s)
          if (s.state === 'flying' && s.flightTimer > 1.35) {
            s.state = 'impacted';
            s.group.visible = false;
            spawnShatterBurst(s.worldPos, 4, 2.5);
          }
        }
      }

      // Update pooled shatter particles
      let anyParticleActive = false;
      for (let p = 0; p < particlePool.length; p++) {
        const pt = particlePool[p];
        if (!pt.active) continue;
        anyParticleActive = true;
        pt.timer -= delta;
        if (pt.timer <= 0) {
          pt.active = false;
          pt.mesh.visible = false;
          continue;
        }
        const t = 1.0 - (pt.timer / pt.maxTimer);
        pt.vel.y -= 9.8 * delta; // gravity
        pt.mesh.position.addScaledVector(pt.vel, delta);
        const s = (1.0 - t) * 1.2;
        pt.mesh.scale.set(s, s, s);
        (pt.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1.0 - t);
      }

      // Keep active until all shards finished and all particles faded
      if (!anyFlyingOrForming && !anyParticleActive && elapsed > 1.6) {
        cleanup();
        return false;
      }

      if (elapsed > 4.5) {
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
      get isAiming() {
        return isHoldingAim;
      },
      activate,
      releaseFire,
      cancel,
      update,
      cleanup,
    };
  }

  public acquire(
    casterPos: THREE.Vector3,
    casterRotationY: number,
    onShardLaunch?: (index: number) => void,
    onShardHit?: (targetEnemy: any, hitPos: THREE.Vector3) => void,
    onShardGroundHit?: (hitPos: THREE.Vector3) => void,
    isHoldToAim = false
  ): GlacialBarrageVfxInstance {
    let instance = this.instances.find((i) => !i.isActive);
    if (!instance) {
      instance = this.instances[0];
      instance.cleanup();
    }
    instance.activate(casterPos, casterRotationY, onShardLaunch, onShardHit, onShardGroundHit, isHoldToAim);
    return instance;
  }
}

/**
 * Creates and acquires the pre-allocated Glacial Crystal Barrage VFX Instance
 */
export function createGlacialBarrageVfx(params: {
  casterPos: THREE.Vector3;
  casterRotationY: number;
  onShardLaunch?: (index: number) => void;
  onShardHit?: (targetEnemy: any, hitPos: THREE.Vector3) => void;
  onShardGroundHit?: (hitPos: THREE.Vector3) => void;
  isHoldToAim?: boolean;
}): GlacialBarrageVfxInstance {
  return GlacialBarrageResourcePool.get().acquire(
    params.casterPos,
    params.casterRotationY,
    params.onShardLaunch,
    params.onShardHit,
    params.onShardGroundHit,
    params.isHoldToAim
  );
}

/**
 * Procedural Gale Magic Circle Texture Generator (512x512)
 * Creates an emerald-green wind compass magic circle with concentric rings,
 * compass rose points (N, S, E, W diamonds), wind runes, and spiral gale currents.
 */
let cachedGaleMagicCircleTexture: THREE.CanvasTexture | null = null;

export function getGaleMagicCircleTexture(): THREE.CanvasTexture {
  if (cachedGaleMagicCircleTexture) return cachedGaleMagicCircleTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cachedGaleMagicCircleTexture = new THREE.CanvasTexture(canvas);
    return cachedGaleMagicCircleTexture;
  }

  const cx = size / 2;
  const cy = size / 2;

  // 1. Emerald glowing radial background
  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 248);
  bgGrad.addColorStop(0, 'rgba(167, 243, 208, 0.28)');
  bgGrad.addColorStop(0.25, 'rgba(52, 211, 153, 0.22)');
  bgGrad.addColorStop(0.55, 'rgba(16, 185, 129, 0.15)');
  bgGrad.addColorStop(0.85, 'rgba(5, 150, 105, 0.06)');
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

  // Outer primary ring
  drawGlowRing(242, '#34d399', 3.5, 12);
  drawGlowRing(234, '#10b981', 1.8, 8);
  drawGlowRing(210, '#6ee7b7', 1.5, 6);
  drawGlowRing(160, '#34d399', 2.0, 10);
  drawGlowRing(110, '#10b981', 1.6, 6);
  drawGlowRing(50, '#6ee7b7', 2.5, 8);

  // Outer perimeter ticks (32 directional tick marks)
  ctx.save();
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2.0;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 6;
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const isMajor = i % 8 === 0;
    const rIn = isMajor ? 222 : 234;
    const rOut = 242;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rIn, cy + Math.sin(angle) * rIn);
    ctx.lineTo(cx + Math.cos(angle) * rOut, cy + Math.sin(angle) * rOut);
    ctx.stroke();
  }
  ctx.restore();

  // 4-point Grand Compass Rose Star + 4 minor needles
  ctx.save();
  ctx.shadowColor = '#34d399';
  ctx.shadowBlur = 10;
  for (let c = 0; c < 8; c++) {
    const angle = (c / 8) * Math.PI * 2;
    const isMajor = c % 2 === 0;
    const starLen = isMajor ? 190 : 130;
    const starWidth = isMajor ? 26 : 14;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, -starLen, 0, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, isMajor ? '#6ee7b7' : '#34d399');
    grad.addColorStop(1.0, 'rgba(16, 185, 129, 0.1)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, -starLen);
    ctx.lineTo(starWidth / 2, 0);
    ctx.lineTo(-starWidth / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();

  // Spiral Wind Runes in middle annular ring (r: 160..210)
  ctx.save();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.0;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 8;
  for (let w = 0; w < 16; w++) {
    const a = (w / 16) * Math.PI * 2;
    const rMid = 185;
    const wx = cx + Math.cos(a) * rMid;
    const wy = cy + Math.sin(a) * rMid;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.arc(0, 0, 10, -Math.PI * 0.7, Math.PI * 0.7, false);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  cachedGaleMagicCircleTexture = new THREE.CanvasTexture(canvas);
  cachedGaleMagicCircleTexture.needsUpdate = true;
  return cachedGaleMagicCircleTexture;
}

export interface SkywardArrowVolleyVfxInstance {
  group: THREE.Group;
  isActive: boolean;
  setPrewarmVisible?: (visible: boolean) => void;
  activate: (
    casterPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    onFlareLaunch?: () => void,
    onArrowImpact?: (impactPos: THREE.Vector3, arrowIndex: number) => void,
    onFinisherImpact?: (impactPos: THREE.Vector3) => void
  ) => void;
  update: (
    delta: number,
    enemies: any[],
    damageArrowCallback: (enemy: any, impactPos: THREE.Vector3) => void,
    damageFinisherCallback: (enemies: any[], impactPos: THREE.Vector3) => void
  ) => boolean;
  cleanup: () => void;
}

export class SkywardArrowVolleyResourcePool {
  private static instance: SkywardArrowVolleyResourcePool | null = null;

  // Shared Geometries
  public arrowShaftGeom!: THREE.CylinderGeometry;
  public arrowHeadGeom!: THREE.ConeGeometry;
  public arrowTrailGeom!: THREE.CylinderGeometry;
  public flareTrailGeom!: THREE.CylinderGeometry;
  public magicCircleGeom!: THREE.CircleGeometry;
  public magicRingGeom!: THREE.RingGeometry;
  public giantShaftGeom!: THREE.CylinderGeometry;
  public giantHeadGeom!: THREE.ConeGeometry;
  public giantVortexGeom!: THREE.CylinderGeometry;
  public shockwaveGeom!: THREE.RingGeometry;
  public particleGeom!: THREE.TetrahedronGeometry;

  // Shared Materials
  public arrowShaftMat!: THREE.MeshStandardMaterial;
  public arrowHeadMat!: THREE.MeshStandardMaterial;
  public arrowTrailMat!: THREE.MeshBasicMaterial;
  public flareArrowMat!: THREE.MeshStandardMaterial;
  public flareTrailMat!: THREE.MeshBasicMaterial;
  public magicCircleMat!: THREE.MeshBasicMaterial;
  public magicRingMat!: THREE.MeshBasicMaterial;
  public giantShaftMat!: THREE.MeshStandardMaterial;
  public giantHeadMat!: THREE.MeshStandardMaterial;
  public giantVortexMat!: THREE.MeshBasicMaterial;
  public shockwaveMat!: THREE.MeshBasicMaterial;
  public particleMat!: THREE.MeshStandardMaterial;

  public isInitialized = false;
  private instances: SkywardArrowVolleyVfxInstance[] = [];

  public static get(): SkywardArrowVolleyResourcePool {
    if (!SkywardArrowVolleyResourcePool.instance) {
      SkywardArrowVolleyResourcePool.instance = new SkywardArrowVolleyResourcePool();
      SkywardArrowVolleyResourcePool.instance.init();
    }
    return SkywardArrowVolleyResourcePool.instance;
  }

  private init() {
    if (this.isInitialized) return;

    // 1. Geometries
    this.arrowShaftGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6);
    this.arrowHeadGeom = new THREE.ConeGeometry(0.12, 0.32, 6);

    const rainTrail = new THREE.CylinderGeometry(0.01, 0.12, 1.8, 6, 1, true);
    rainTrail.rotateX(Math.PI / 2);
    rainTrail.translate(0, 0, -1.0);
    this.arrowTrailGeom = rainTrail;

    const flareTrail = new THREE.CylinderGeometry(0.02, 0.25, 3.2, 8, 1, true);
    flareTrail.rotateX(Math.PI / 2);
    flareTrail.translate(0, 0, -1.8);
    this.flareTrailGeom = flareTrail;

    const circle = new THREE.CircleGeometry(5.5, 48);
    circle.rotateX(-Math.PI / 2);
    this.magicCircleGeom = circle;

    const ring = new THREE.RingGeometry(5.1, 5.5, 48);
    ring.rotateX(-Math.PI / 2);
    this.magicRingGeom = ring;

    this.giantShaftGeom = new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8);
    this.giantHeadGeom = new THREE.ConeGeometry(0.35, 0.85, 8);
    this.giantVortexGeom = new THREE.CylinderGeometry(0.9, 0.45, 3.4, 12, 1, true);

    const sw = new THREE.RingGeometry(0.5, 1.2, 48);
    sw.rotateX(-Math.PI / 2);
    this.shockwaveGeom = sw;

    this.particleGeom = new THREE.TetrahedronGeometry(0.16, 0);

    // 2. Materials (Energi Cyan-Aqua #00e5ff bercahaya tajam)
    this.arrowShaftMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.45,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.5,
    });
    this.arrowHeadMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.15,
      metalness: 0.85,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.2,
    });
    this.arrowTrailMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.flareArrowMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.6,
    });
    this.flareTrailMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.magicCircleMat = new THREE.MeshBasicMaterial({
      map: getGaleMagicCircleTexture(),
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.magicRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.giantShaftMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.0,
    });
    this.giantHeadMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.5,
    });
    this.giantVortexMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.particleMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.75,
      roughness: 0.35,
    });

    // 3. Pre-allocate 2 VFX Instances
    for (let inst = 0; inst < 2; inst++) {
      this.instances.push(this.createInstance());
    }

    this.isInitialized = true;
  }

  private createInstance(): SkywardArrowVolleyVfxInstance {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'SkywardArrowVolley_Instance';
    rootGroup.visible = false;

    // A. 4 Opening Sky-Launch Arrows (Fase 1: Tembak Cepat ke Langit)
    const SKY_LAUNCH_COUNT = 4;
    const skyLaunchArrows: THREE.Group[] = [];
    for (let s = 0; s < SKY_LAUNCH_COUNT; s++) {
      const fGroup = new THREE.Group();
      const flareShaft = new THREE.Mesh(this.arrowShaftGeom, this.flareArrowMat);
      flareShaft.rotation.x = Math.PI / 2;
      const flareHead = new THREE.Mesh(this.arrowHeadGeom, this.flareArrowMat);
      flareHead.position.z = 0.8;
      flareHead.rotation.x = Math.PI / 2;
      const flareTrail = new THREE.Mesh(this.flareTrailGeom, this.flareTrailMat);
      fGroup.add(flareShaft, flareHead, flareTrail);
      fGroup.visible = false;
      rootGroup.add(fGroup);
      skyLaunchArrows.push(fGroup);
    }

    // B. Magic Circle & Outer Ring
    const magicCircleMesh = new THREE.Mesh(this.magicCircleGeom, this.magicCircleMat);
    const magicRingMesh = new THREE.Mesh(this.magicRingGeom, this.magicRingMat);
    magicCircleMesh.visible = false;
    magicRingMesh.visible = false;
    rootGroup.add(magicCircleMesh, magicRingMesh);

    // C. 28 Cyan Energy Rain Arrows (Fase 2: Hujan Panah Menancap ~0.6s) + Pooled Micro Impact Rings
    const RAIN_COUNT = 28;
    const rainArrowGroups: THREE.Group[] = [];
    const rainArrowTrails: THREE.Mesh[] = [];
    for (let r = 0; r < RAIN_COUNT; r++) {
      const arrGroup = new THREE.Group();
      const shaft = new THREE.Mesh(this.arrowShaftGeom, this.arrowShaftMat);
      shaft.rotation.x = -Math.PI / 2;
      const head = new THREE.Mesh(this.arrowHeadGeom, this.arrowHeadMat);
      head.position.z = 0.8;
      head.rotation.x = -Math.PI / 2;
      const trail = new THREE.Mesh(this.arrowTrailGeom, this.arrowTrailMat);
      arrGroup.add(shaft, head, trail);
      arrGroup.visible = false;
      rootGroup.add(arrGroup);
      rainArrowGroups.push(arrGroup);
      rainArrowTrails.push(trail);
    }

    const IMPACT_RING_COUNT = 14;
    const impactRingMeshes: THREE.Mesh[] = [];
    const impactRingMats: THREE.MeshBasicMaterial[] = [];
    const impactRingTimers: number[] = new Array(IMPACT_RING_COUNT).fill(-1);
    for (let ir = 0; ir < IMPACT_RING_COUNT; ir++) {
      const rMat = this.shockwaveMat.clone();
      const rMesh = new THREE.Mesh(this.shockwaveGeom, rMat);
      rMesh.visible = false;
      rootGroup.add(rMesh);
      impactRingMeshes.push(rMesh);
      impactRingMats.push(rMat);
    }
    let impactRingNext = 0;

    // D. Giant Finisher Arrow (Phase 3)
    const giantGroup = new THREE.Group();
    const gShaft = new THREE.Mesh(this.giantShaftGeom, this.giantShaftMat);
    gShaft.rotation.x = -Math.PI / 2;
    const gHead = new THREE.Mesh(this.giantHeadGeom, this.giantHeadMat);
    gHead.position.z = 2.0;
    gHead.rotation.x = -Math.PI / 2;
    const gVortex = new THREE.Mesh(this.giantVortexGeom, this.giantVortexMat);
    gVortex.rotation.x = -Math.PI / 2;
    giantGroup.add(gShaft, gHead, gVortex);
    giantGroup.visible = false;
    rootGroup.add(giantGroup);

    // E. Expanding Wind Shockwave Ring
    const shockwaveMesh = new THREE.Mesh(this.shockwaveGeom, this.shockwaveMat.clone());
    shockwaveMesh.visible = false;
    rootGroup.add(shockwaveMesh);

    // F. 40 Cyan Wind Particles
    const PARTICLE_COUNT = 40;
    const particleMeshes: THREE.Mesh[] = [];
    const particleVels: THREE.Vector3[] = [];
    for (let p = 0; p < PARTICLE_COUNT; p++) {
      const pMesh = new THREE.Mesh(this.particleGeom, this.particleMat);
      pMesh.visible = false;
      rootGroup.add(pMesh);
      particleMeshes.push(pMesh);
      particleVels.push(new THREE.Vector3());
    }

    // State Variables (Pre-allocated untuk Zero-GC di runtime)
    let isActive = false;
    let elapsedTime = 0;
    const casterPos = new THREE.Vector3();
    const targetPos = new THREE.Vector3();
    const _impactPosScratch = new THREE.Vector3();
    const SKY_SPREAD = [
      { dx: -0.75, dz: 0.45, delay: 0.0 },
      { dx: 0.75, dz: 0.45, delay: 0.03 },
      { dx: -0.35, dz: -0.65, delay: 0.06 },
      { dx: 0.35, dz: -0.65, delay: 0.09 },
    ];
    const arrowOffsets: { x: number; z: number; yaw: number; slantX: number }[] = Array.from(
      { length: RAIN_COUNT },
      () => ({ x: 0, z: 0, yaw: 0, slantX: 1.32 })
    );
    const dropStartTimes: number[] = new Array(RAIN_COUNT).fill(0);
    const arrowHasHit: boolean[] = new Array(RAIN_COUNT).fill(false);
    const WAVE_TIMES = [0.46, 0.72, 0.98, 1.24, 1.50];
    const waveHasHit: boolean[] = [false, false, false, false, false];
    let finisherHasHit = false;
    let shockwaveStartTime = -1;

    let onFlareCb: (() => void) | undefined;
    let onArrowCb: ((impactPos: THREE.Vector3, arrowIndex: number) => void) | undefined;
    let onFinisherCb: ((impactPos: THREE.Vector3) => void) | undefined;

    const activate = (
      cPos: THREE.Vector3,
      tPos: THREE.Vector3,
      onFlareLaunch?: () => void,
      onArrowImpact?: (impactPos: THREE.Vector3, arrowIndex: number) => void,
      onFinisherImpact?: (impactPos: THREE.Vector3) => void
    ) => {
      isActive = true;
      elapsedTime = 0;
      casterPos.copy(cPos);
      targetPos.copy(tPos);
      onFlareCb = onFlareLaunch;
      onArrowCb = onArrowImpact;
      onFinisherCb = onFinisherImpact;
      finisherHasHit = false;
      shockwaveStartTime = -1;
      for (let w = 0; w < WAVE_TIMES.length; w++) {
        waveHasHit[w] = false;
      }
      for (let ir = 0; ir < IMPACT_RING_COUNT; ir++) {
        impactRingTimers[ir] = -1;
        impactRingMeshes[ir].visible = false;
      }

      rootGroup.visible = true;

      // Sky-launch arrows originate from caster hands aiming up
      for (let s = 0; s < SKY_LAUNCH_COUNT; s++) {
        skyLaunchArrows[s].position.set(casterPos.x, casterPos.y + 1.55, casterPos.z);
        skyLaunchArrows[s].rotation.set(-Math.PI * 0.44, SKY_SPREAD[s].dx * 0.25, 0);
        skyLaunchArrows[s].visible = true;
      }
      onFlareCb?.();

      // Ground Magic Circle at target (fades in smoothly as sky barrage arcs overhead)
      magicCircleMesh.position.set(targetPos.x, targetPos.y + 0.04, targetPos.z);
      magicRingMesh.position.set(targetPos.x, targetPos.y + 0.05, targetPos.z);
      magicCircleMesh.scale.set(0.15, 0.15, 0.15);
      magicRingMesh.scale.set(0.15, 0.15, 0.15);
      magicCircleMesh.visible = false;
      magicRingMesh.visible = false;

      // 28 Rain arrows staggered ~0.05s per batch (2-3 arrows per wave) across 0.30s..1.00s
      for (let i = 0; i < RAIN_COUNT; i++) {
        const ang = (i / RAIN_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist = Math.sqrt((i + 0.4) / RAIN_COUNT) * 5.1;
        arrowOffsets[i].x = Math.cos(ang) * dist;
        arrowOffsets[i].z = Math.sin(ang) * dist;
        arrowOffsets[i].yaw = (Math.random() - 0.5) * 0.45;
        arrowOffsets[i].slantX = 1.24 + (Math.random() - 0.5) * 0.18; // ~71° slanted steep plunge
        dropStartTimes[i] = 0.30 + Math.floor(i / 2) * 0.05;
        arrowHasHit[i] = false;
        rainArrowGroups[i].visible = false;
        rainArrowGroups[i].scale.set(1, 1, 1);
        rainArrowTrails[i].visible = true;
      }

      giantGroup.visible = false;
      shockwaveMesh.visible = false;
      for (let p = 0; p < PARTICLE_COUNT; p++) {
        particleMeshes[p].visible = false;
      }
    };

    const cleanup = () => {
      isActive = false;
      rootGroup.visible = false;
      for (let s = 0; s < skyLaunchArrows.length; s++) {
        skyLaunchArrows[s].visible = false;
      }
      magicCircleMesh.visible = false;
      magicRingMesh.visible = false;
      for (let r = 0; r < rainArrowGroups.length; r++) {
        rainArrowGroups[r].visible = false;
      }
      for (let ir = 0; ir < impactRingMeshes.length; ir++) {
        impactRingMeshes[ir].visible = false;
      }
      giantGroup.visible = false;
      shockwaveMesh.visible = false;
      for (let p = 0; p < particleMeshes.length; p++) {
        particleMeshes[p].visible = false;
      }
    };

    const setPrewarmVisible = (visible: boolean) => {
      rootGroup.visible = visible;
      if (skyLaunchArrows.length > 0) skyLaunchArrows[0].visible = visible;
      magicCircleMesh.visible = visible;
      magicRingMesh.visible = visible;
      if (rainArrowGroups.length > 0) rainArrowGroups[0].visible = visible;
      if (impactRingMeshes.length > 0) impactRingMeshes[0].visible = visible;
      giantGroup.visible = visible;
      shockwaveMesh.visible = visible;
      if (particleMeshes.length > 0) particleMeshes[0].visible = visible;
    };

    const update = (
      delta: number,
      enemies: any[],
      damageArrowCallback: (enemy: any, impactPos: THREE.Vector3) => void,
      damageFinisherCallback: (enemies: any[], impactPos: THREE.Vector3) => void
    ): boolean => {
      if (!isActive) return true;
      elapsedTime += delta;

      // Phase 1: 4 Sky-Launch Opening Arrows shooting steeply upward (0.00s - 0.42s)
      for (let s = 0; s < SKY_LAUNCH_COUNT; s++) {
        const sp = SKY_SPREAD[s];
        const sElapsed = elapsedTime - sp.delay;
        if (sElapsed >= 0 && sElapsed < 0.34) {
          const t = sElapsed / 0.34;
          skyLaunchArrows[s].position.set(
            casterPos.x + sp.dx * t * 3.2,
            casterPos.y + 1.55 + t * 36.0,
            casterPos.z + sp.dz * t * 3.2
          );
          skyLaunchArrows[s].visible = true;
        } else {
          skyLaunchArrows[s].visible = false;
        }
      }

      // Ground Target Magic Circle (~0.26s onward)
      if (elapsedTime >= 0.26 && elapsedTime <= 2.35) {
        magicCircleMesh.visible = true;
        magicRingMesh.visible = true;
        const mcElapsed = elapsedTime - 0.26;
        if (mcElapsed < 0.22) {
          const s = 0.18 + (mcElapsed / 0.22) * 0.82;
          magicCircleMesh.scale.set(s, s, s);
          magicRingMesh.scale.set(s, s, s);
        } else {
          magicCircleMesh.scale.set(1.0, 1.0, 1.0);
          magicRingMesh.scale.set(1.0, 1.0, 1.0);
        }
        magicCircleMesh.rotation.z += delta * 4.0;
        magicRingMesh.rotation.z -= delta * 2.5;

        if (elapsedTime > 1.95) {
          const fadeT = Math.max(0, 1.0 - (elapsedTime - 1.95) / 0.40);
          (magicCircleMesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * fadeT;
          (magicRingMesh.material as THREE.MeshBasicMaterial).opacity = 0.88 * fadeT;
        } else {
          (magicCircleMesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
          (magicRingMesh.material as THREE.MeshBasicMaterial).opacity = 0.88;
        }
      } else {
        magicCircleMesh.visible = false;
        magicRingMesh.visible = false;
      }

      // Phase 2: 28 Cyan Rain Arrows plunging from Y + 26, sparking on impact, sticking ~0.6s, fading cleanly
      const FALL_DURATION = 0.18;
      const STICK_DURATION = 0.60;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const startTime = dropStartTimes[i];
        if (elapsedTime < startTime) continue;
        const dropElapsed = elapsedTime - startTime;
        const off = arrowOffsets[i];
        const ax = targetPos.x + off.x;
        const az = targetPos.z + off.z;
        const targetY = targetPos.y;
        const arrGroup = rainArrowGroups[i];

        if (dropElapsed < FALL_DURATION) {
          const fallT = dropElapsed / FALL_DURATION;
          const slantOffset = (1.0 - fallT) * 5.2; // Meluncur miring dari atas langit
          arrGroup.position.set(
            ax - Math.sin(off.yaw) * slantOffset,
            targetY + 26.0 * (1.0 - fallT),
            az - Math.cos(off.yaw) * slantOffset
          );
          arrGroup.rotation.set(off.slantX - Math.PI * 0.5, off.yaw, 0);
          arrGroup.scale.set(1, 1, 1);
          rainArrowTrails[i].visible = true;
          arrGroup.visible = true;
        } else if (dropElapsed <= FALL_DURATION + STICK_DURATION) {
          if (!arrowHasHit[i]) {
            arrowHasHit[i] = true;
            _impactPosScratch.set(ax, targetY + 0.06, az);
            onArrowCb?.(_impactPosScratch, i);

            // Activate pooled micro impact ring on ground
            const rIdx = impactRingNext;
            impactRingNext = (impactRingNext + 1) % IMPACT_RING_COUNT;
            impactRingTimers[rIdx] = 0;
            impactRingMeshes[rIdx].position.set(ax, targetY + 0.06, az);
            impactRingMeshes[rIdx].scale.set(0.22, 0.22, 0.22);
            impactRingMats[rIdx].opacity = 0.78;
            impactRingMeshes[rIdx].visible = true;

            // Direct splash damage within horizontal XZ 2.0u
            for (let e = 0; e < enemies.length; e++) {
              const enemy = enemies[e];
              if (enemy.data?.isDead) continue;
              const distXZ = Math.hypot(enemy.mesh.position.x - ax, enemy.mesh.position.z - az);
              if (distXZ <= 2.0) {
                damageArrowCallback(enemy, _impactPosScratch);
              }
            }
          }

          // Menancap miring di tanah selama ~0.60 detik sebelum memudar ke pool
          const stickT = dropElapsed - FALL_DURATION;
          const fadeProgress = stickT > 0.40 ? (stickT - 0.40) / 0.20 : 0;
          const scale = Math.max(0.01, 1.0 - fadeProgress);
          arrGroup.position.set(ax, targetY + 0.14 - fadeProgress * 0.14, az);
          arrGroup.rotation.set(off.slantX - Math.PI * 0.5, off.yaw, 0);
          arrGroup.scale.set(scale, scale, scale);
          rainArrowTrails[i].visible = false;
          arrGroup.visible = true;
        } else {
          arrGroup.visible = false;
        }
      }

      // Update pooled micro ground impact rings
      for (let ir = 0; ir < IMPACT_RING_COUNT; ir++) {
        if (impactRingTimers[ir] < 0) continue;
        impactRingTimers[ir] += delta;
        const rDur = 0.24;
        if (impactRingTimers[ir] >= rDur) {
          impactRingTimers[ir] = -1;
          impactRingMeshes[ir].visible = false;
        } else {
          const rt = impactRingTimers[ir] / rDur;
          const rs = 0.22 + rt * 1.15;
          impactRingMeshes[ir].scale.set(rs, rs, rs);
          impactRingMats[ir].opacity = 0.78 * (1.0 - rt);
        }
      }

      // Synchronized consistent AoE damage waves inside radius 5.5
      for (let w = 0; w < WAVE_TIMES.length; w++) {
        if (!waveHasHit[w] && elapsedTime >= WAVE_TIMES[w]) {
          waveHasHit[w] = true;
          for (let e = 0; e < enemies.length; e++) {
            const enemy = enemies[e];
            if (enemy.data?.isDead) continue;
            const distXZ = Math.hypot(
              enemy.mesh.position.x - targetPos.x,
              enemy.mesh.position.z - targetPos.z
            );
            if (distXZ <= 5.5) {
              damageArrowCallback(enemy, targetPos);
            }
          }
        }
      }

      // Phase 3: Great Gale Arrow Finisher (starts dropping at 1.65s, lands at 1.80s)
      if (elapsedTime >= 1.65 && !finisherHasHit) {
        const finElapsed = elapsedTime - 1.65;
        const finDur = 0.15;
        if (finElapsed < finDur) {
          const fallT = finElapsed / finDur;
          const gy = 36.0 * (1 - fallT) + targetPos.y * fallT;
          giantGroup.position.set(targetPos.x, gy, targetPos.z);
          giantGroup.visible = true;
          gVortex.rotation.y += delta * 14.0;
        } else {
          // Slam Impact at 1.80s!
          finisherHasHit = true;
          giantGroup.visible = false;
          onFinisherCb?.(targetPos);

          // Trigger shockwave ring
          shockwaveMesh.position.set(targetPos.x, targetPos.y + 0.08, targetPos.z);
          shockwaveMesh.scale.set(0.15, 0.15, 0.15);
          shockwaveMesh.visible = true;
          (shockwaveMesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
          shockwaveStartTime = elapsedTime;

          // Trigger 40 emerald leaf/wind particles
          for (let p = 0; p < PARTICLE_COUNT; p++) {
            const pMesh = particleMeshes[p];
            pMesh.position.copy(targetPos).add(new THREE.Vector3(0, 0.35, 0));
            pMesh.visible = true;
            const pAng = (p / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
            const pSpeed = 6.0 + Math.random() * 10.0;
            particleVels[p].set(
              Math.cos(pAng) * pSpeed,
              2.5 + Math.random() * 5.0,
              Math.sin(pAng) * pSpeed
            );
          }

          // Damage all enemies in 5.5 radius and apply micro-pull to center
          const hitEnemies = [];
          for (let e = 0; e < enemies.length; e++) {
            const enemy = enemies[e];
            if (enemy.data?.isDead) continue;
            const dist = Math.hypot(
              enemy.mesh.position.x - targetPos.x,
              enemy.mesh.position.z - targetPos.z
            );
            if (dist <= 5.5) {
              hitEnemies.push(enemy);
              // Micro-pull towards center
              const toCenter = new THREE.Vector3(
                targetPos.x - enemy.mesh.position.x,
                0,
                targetPos.z - enemy.mesh.position.z
              );
              const len = toCenter.length();
              if (len > 0.35) {
                toCenter.normalize();
                enemy.mesh.position.addScaledVector(toCenter, Math.min(1.2, len * 0.45));
              }
            }
          }
          damageFinisherCallback(hitEnemies, targetPos);
        }
      }

      // Update Shockwave expansion & fade (1.80s - 2.15s)
      if (shockwaveMesh.visible && shockwaveStartTime >= 0) {
        const swElapsed = elapsedTime - shockwaveStartTime;
        const swDur = 0.35;
        if (swElapsed < swDur) {
          const swT = swElapsed / swDur;
          const s = 0.15 + swT * 5.35; // Expands outward to radius 5.5
          shockwaveMesh.scale.set(s, s, s);
          (shockwaveMesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1.0 - swT);
        } else {
          shockwaveMesh.visible = false;
        }
      }

      // Update 40 Particles
      if (finisherHasHit) {
        for (let p = 0; p < PARTICLE_COUNT; p++) {
          const pMesh = particleMeshes[p];
          if (!pMesh.visible) continue;
          pMesh.position.addScaledVector(particleVels[p], delta);
          particleVels[p].y -= delta * 14.0; // Gravity
          particleVels[p].x *= (1.0 - delta * 2.0);
          particleVels[p].z *= (1.0 - delta * 2.0);
          pMesh.rotation.x += delta * 6.0;
          pMesh.rotation.y += delta * 7.0;
          if (pMesh.position.y <= targetPos.y) {
            pMesh.visible = false;
          }
        }
      }

      if (elapsedTime >= 2.38) {
        cleanup();
        return true;
      }
      return false;
    };

    return {
      group: rootGroup,
      get isActive() {
        return isActive;
      },
      setPrewarmVisible,
      activate,
      update,
      cleanup,
    };
  }

  public attachToScene(scene: THREE.Scene) {
    for (let i = 0; i < this.instances.length; i++) {
      const grp = this.instances[i].group;
      if (grp.parent !== scene) {
        scene.add(grp);
      }
    }
  }

  public acquire(
    casterPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    onFlareLaunch?: () => void,
    onArrowImpact?: (impactPos: THREE.Vector3, arrowIndex: number) => void,
    onFinisherImpact?: (impactPos: THREE.Vector3) => void
  ): SkywardArrowVolleyVfxInstance {
    let instance = this.instances.find((i) => !i.isActive);
    if (!instance) {
      instance = this.instances[0];
      instance.cleanup();
    }
    instance.activate(casterPos, targetPos, onFlareLaunch, onArrowImpact, onFinisherImpact);
    return instance;
  }

  public prewarm(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.attachToScene(scene);
    if (this.instances.length > 0) {
      const sample = this.instances[0];
      const prevVis = sample.isActive;
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      sample.group.position.copy(camera.position).addScaledVector(fwd, 5.0);
      sample.setPrewarmVisible?.(true);
      try {
        renderer.compile(scene, camera);
      } catch (e) {
        console.warn('[Engine] Skyward arrow volley prewarm compile warning:', e);
      }
      if (!prevVis) {
        sample.cleanup();
      }
      sample.group.position.set(0, 0, 0);
    }
  }
}

export function createSkywardArrowVolleyVfx(params: {
  casterPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  onFlareLaunch?: () => void;
  onArrowImpact?: (impactPos: THREE.Vector3, arrowIndex: number) => void;
  onFinisherImpact?: (impactPos: THREE.Vector3) => void;
}): SkywardArrowVolleyVfxInstance {
  return SkywardArrowVolleyResourcePool.get().acquire(
    params.casterPos,
    params.targetPos,
    params.onFlareLaunch,
    params.onArrowImpact,
    params.onFinisherImpact
  );
}

