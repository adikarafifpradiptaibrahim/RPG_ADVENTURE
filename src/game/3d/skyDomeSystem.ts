import * as THREE from 'three';
import type { SkyAtmosphereState } from './dayNightSystem';

export type SkyDomeQualityTier = 'low' | 'medium' | 'high' | 'ultra';

interface DriftingCloudSlot {
  cluster: THREE.Group;
  azimuth: number;
  elevationY: number;
  speed: number;
  baseScale: number;
  tier: number; // 1 = medium+, 2 = high/ultra only
}

function createRadialGlowTexture(innerRgba: string, midRgba: string, outerRgba: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0.0, innerRgba);
    grad.addColorStop(0.35, midRgba);
    grad.addColorStop(1.0, outerRgba);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createMoonSurfaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 128, 128);

    const maria = [
      { x: 42, y: 44, r: 22, a: 0.20 },
      { x: 76, y: 58, r: 18, a: 0.16 },
      { x: 54, y: 82, r: 16, a: 0.18 },
      { x: 88, y: 34, r: 12, a: 0.14 },
      { x: 26, y: 74, r: 14, a: 0.15 },
    ];
    for (const m of maria) {
      ctx.fillStyle = `rgba(100, 116, 139, ${m.a})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const cx = ((i * 53 + 17) % 108) + 10;
      const cy = ((i * 37 + 29) % 108) + 10;
      const cr = 2 + (i % 4) * 1.4;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalDir;
  void main() {
    vLocalDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uGroundColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunsetGlowColor;
  uniform float uSunsetStrength;
  uniform float uMilkyWayStrength;
  uniform float uStormFactor;
  uniform vec3 uStormZenith;
  uniform vec3 uStormHorizon;

  varying vec3 vLocalDir;

  void main() {
    vec3 dir = normalize(vLocalDir);
    float y = dir.y;

    float upFactor = pow(clamp(y, 0.0, 1.0), 0.52);
    vec3 skyCol = mix(uHorizonColor, uZenithColor, upFactor);

    // Smooth blend below horizon so world borders never expose harsh black gap
    if (y < 0.0) {
      float downFactor = clamp(-y * 4.0, 0.0, 1.0);
      skyCol = mix(uHorizonColor, uGroundColor, downFactor);
    }

    // Dawn / dusk atmospheric solar scattering near horizon and sun azimuth
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float horizonMask = exp(-abs(y) * 5.2);
    float glowAmt = (pow(sunDot, 5.0) * 0.65 + horizonMask * pow(sunDot, 1.8) * 0.45) * uSunsetStrength;
    skyCol += uSunsetGlowColor * glowAmt;

    // Subtle galactic Milky Way shimmer ribbon in clear night sky (High / Ultra)
    if (uMilkyWayStrength > 0.01 && y > 0.03) {
      vec3 bandAxis = normalize(vec3(0.42, 0.72, -0.55));
      float bandDist = abs(dot(dir, bandAxis));
      float bandMask = smoothstep(0.32, 0.0, bandDist) * smoothstep(0.03, 0.25, y);
      float cloudNoise = 0.55 + 0.45 * sin(dir.x * 11.0 + dir.z * 7.0) * cos(dir.y * 9.0 - dir.x * 5.0);
      vec3 milkyCol = vec3(0.18, 0.25, 0.46) * bandMask * cloudNoise * uMilkyWayStrength * (1.0 - uStormFactor);
      skyCol += milkyCol;
    }

    // Dragon Caldera Ignis Phase 2 Storm smooth overcast override
    if (uStormFactor > 0.001) {
      vec3 stormSky = mix(uStormHorizon, uStormZenith, upFactor);
      skyCol = mix(skyCol, stormSky, clamp(uStormFactor * 0.92, 0.0, 1.0));
    }

    gl_FragColor = vec4(skyCol, 1.0);
  }
`;

const STAR_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uStarOpacity;
  uniform float uTwinkleStrength;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    float twinkle = 0.68 + 0.32 * sin(uTime * 2.1 + aPhase);
    vAlpha = uStarOpacity * mix(1.0, twinkle, uTwinkleStrength);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * mix(0.85, 1.25, twinkle), 1.4, 5.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float rSq = dot(cxy, cxy);
    if (rSq > 1.0) discard;
    float soft = pow(1.0 - rSq, 1.6);
    gl_FragColor = vec4(vColor, vAlpha * soft);
  }
`;

export class DynamicSkySystem {
  public readonly group = new THREE.Group();

  private skyDomeMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;

  private sunGroup = new THREE.Group();
  private sunCoreMesh: THREE.Mesh;
  private sunCoreMat: THREE.MeshBasicMaterial;
  private sunHaloSprite: THREE.Sprite;
  private sunHaloMat: THREE.SpriteMaterial;

  private moonGroup = new THREE.Group();
  private moonCoreMesh: THREE.Mesh;
  private moonCoreMat: THREE.MeshBasicMaterial;
  private moonHaloSprite: THREE.Sprite;
  private moonHaloMat: THREE.SpriteMaterial;

  private starPoints: THREE.Points;
  private starGeo: THREE.BufferGeometry;
  private starMat: THREE.ShaderMaterial;
  private readonly MAX_STARS = 520;

  private cloudGroup = new THREE.Group();
  private cloudMat: THREE.MeshBasicMaterial;
  private cloudSlots: DriftingCloudSlot[] = [];

  private qualityTier: SkyDomeQualityTier = 'medium';
  private halosEnabled = true;
  private stormOverride = 0;

  private readonly _stormCloudTint = new THREE.Color(0x272024);
  private readonly _workingCloudColor = new THREE.Color(0xf8fafc);

  constructor() {
    this.group.name = 'DynamicSkySystemGroup';
    this.group.frustumCulled = false;

    // 1. Unit Sky Dome (dynamically scaled each frame to stay inside camera.far)
    const domeGeo = new THREE.SphereGeometry(1, 36, 22);
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      uniforms: {
        uZenithColor: { value: new THREE.Color(0x2563eb) },
        uHorizonColor: { value: new THREE.Color(0xbae6fd) },
        uGroundColor: { value: new THREE.Color(0x1e293b) },
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, -0.22).normalize() },
        uSunsetGlowColor: { value: new THREE.Color(0xf97316) },
        uSunsetStrength: { value: 0.0 },
        uMilkyWayStrength: { value: 0.0 },
        uStormFactor: { value: 0.0 },
        uStormZenith: { value: new THREE.Color(0x1b141a) },
        uStormHorizon: { value: new THREE.Color(0x3b1f1e) },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.skyDomeMesh = new THREE.Mesh(domeGeo, this.skyMat);
    this.skyDomeMesh.name = 'SkyGradientDome';
    this.skyDomeMesh.frustumCulled = false;
    this.skyDomeMesh.renderOrder = -20;
    this.group.add(this.skyDomeMesh);

    // 2. Twinkling Starfield + Subtle Galactic Milky Way Concentration (pre-allocated buffer)
    const starPositions = new Float32Array(this.MAX_STARS * 3);
    const starColors = new Float32Array(this.MAX_STARS * 3);
    const starSizes = new Float32Array(this.MAX_STARS);
    const starPhases = new Float32Array(this.MAX_STARS);

    const bandNormal = new THREE.Vector3(0.42, 0.72, -0.55).normalize();
    const tmpDir = new THREE.Vector3();
    const tmpCol = new THREE.Color();

    let sIdx = 0;
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    while (sIdx < this.MAX_STARS) {
      const u = rand();
      const v = rand();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(0.06 + v * 0.94); // Upper hemisphere only (y >= 0.06)
      tmpDir.set(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      );

      // Bias last 35% of stars along Milky Way band for High/Ultra visual payoff
      const isMilkyBandStar = sIdx >= 330;
      if (isMilkyBandStar && Math.abs(tmpDir.dot(bandNormal)) > 0.22) {
        continue;
      }

      const r = 0.92;
      starPositions[sIdx * 3] = tmpDir.x * r;
      starPositions[sIdx * 3 + 1] = tmpDir.y * r;
      starPositions[sIdx * 3 + 2] = tmpDir.z * r;

      const hueChoice = rand();
      if (hueChoice < 0.35) tmpCol.setHex(0xe0f2fe);
      else if (hueChoice < 0.72) tmpCol.setHex(0xfef9c3);
      else tmpCol.setHex(0xc7d2fe);

      starColors[sIdx * 3] = tmpCol.r;
      starColors[sIdx * 3 + 1] = tmpCol.g;
      starColors[sIdx * 3 + 2] = tmpCol.b;

      starSizes[sIdx] = isMilkyBandStar ? 1.8 + rand() * 1.4 : 2.2 + rand() * 2.4;
      starPhases[sIdx] = rand() * Math.PI * 2;
      sIdx++;
    }

    this.starGeo = new THREE.BufferGeometry();
    this.starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    this.starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    this.starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    this.starGeo.setDrawRange(0, 320);

    this.starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uStarOpacity: { value: 0 },
        uTwinkleStrength: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.starPoints = new THREE.Points(this.starGeo, this.starMat);
    this.starPoints.name = 'SkyNightStars';
    this.starPoints.frustumCulled = false;
    this.starPoints.renderOrder = -18;
    this.group.add(this.starPoints);

    // 3. Sun Visual (Golden Orb + Additive Radial Halo)
    this.sunCoreMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      fog: false,
      depthWrite: false,
    });
    this.sunCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 12), this.sunCoreMat);
    this.sunCoreMesh.frustumCulled = false;
    this.sunCoreMesh.renderOrder = -16;

    const sunGlowTex = createRadialGlowTexture(
      'rgba(255, 248, 210, 0.95)',
      'rgba(251, 191, 36, 0.42)',
      'rgba(251, 146, 60, 0.0)'
    );
    this.sunHaloMat = new THREE.SpriteMaterial({
      map: sunGlowTex,
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sunHaloSprite = new THREE.Sprite(this.sunHaloMat);
    this.sunHaloSprite.scale.setScalar(0.32);
    this.sunHaloSprite.frustumCulled = false;
    this.sunHaloSprite.renderOrder = -17;

    this.sunGroup.add(this.sunHaloSprite, this.sunCoreMesh);
    this.sunGroup.frustumCulled = false;
    this.group.add(this.sunGroup);

    // 4. Moon Visual (Cratered Silver-Blue Orb + Soft Cool Halo)
    const moonTex = createMoonSurfaceTexture();
    this.moonCoreMat = new THREE.MeshBasicMaterial({
      map: moonTex,
      color: 0xe2e8f0,
      fog: false,
      depthWrite: false,
    });
    this.moonCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), this.moonCoreMat);
    this.moonCoreMesh.frustumCulled = false;
    this.moonCoreMesh.renderOrder = -16;

    const moonGlowTex = createRadialGlowTexture(
      'rgba(226, 232, 240, 0.78)',
      'rgba(147, 197, 253, 0.28)',
      'rgba(30, 58, 138, 0.0)'
    );
    this.moonHaloMat = new THREE.SpriteMaterial({
      map: moonGlowTex,
      color: 0xbfdbfe,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.moonHaloSprite = new THREE.Sprite(this.moonHaloMat);
    this.moonHaloSprite.scale.setScalar(0.21);
    this.moonHaloSprite.frustumCulled = false;
    this.moonHaloSprite.renderOrder = -17;

    this.moonGroup.add(this.moonHaloSprite, this.moonCoreMesh);
    this.moonGroup.frustumCulled = false;
    this.group.add(this.moonGroup);

    // 5. Drifting Low-Poly Cloud Clusters (pre-allocated pool on r = 0.74)
    this.cloudGroup.name = 'SkyLowPolyClouds';
    this.cloudGroup.frustumCulled = false;
    this.cloudMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      fog: false,
    });
    const puffGeo = new THREE.IcosahedronGeometry(0.032, 0);
    const totalClouds = 14;
    for (let i = 0; i < totalClouds; i++) {
      const cluster = new THREE.Group();
      cluster.frustumCulled = false;

      const puffSpecs = [
        { x: 0, y: 0.008, z: 0, sx: 1.55, sy: 0.75, sz: 1.15 },
        { x: -0.032, y: -0.002, z: 0.006, sx: 1.05, sy: 0.62, sz: 0.9 },
        { x: 0.034, y: -0.001, z: -0.004, sx: 1.12, sy: 0.65, sz: 0.92 },
      ];
      for (const ps of puffSpecs) {
        const puff = new THREE.Mesh(puffGeo, this.cloudMat);
        puff.position.set(ps.x, ps.y, ps.z);
        puff.scale.set(ps.sx, ps.sy, ps.sz);
        puff.frustumCulled = false;
        puff.renderOrder = -14;
        cluster.add(puff);
      }

      const azimuth = (i / totalClouds) * Math.PI * 2 + (i % 3) * 0.14;
      const elevationY = 0.22 + (i % 4) * 0.065;
      const baseScale = 0.85 + (i % 3) * 0.28;
      const speed = 0.008 + (i % 4) * 0.0022;
      const tier = i % 2 === 0 ? 1 : 2;

      this.cloudGroup.add(cluster);
      this.cloudSlots.push({ cluster, azimuth, elevationY, speed, baseScale, tier });
    }
    this.group.add(this.cloudGroup);
  }

  public setQuality(quality: SkyDomeQualityTier, halosEnabled = true) {
    this.qualityTier = quality;
    this.halosEnabled = halosEnabled;

    if (quality === 'low') {
      this.starGeo.setDrawRange(0, 160);
      this.starMat.uniforms.uTwinkleStrength.value = 0.0;
      this.cloudGroup.visible = false;
    } else if (quality === 'medium') {
      this.starGeo.setDrawRange(0, 320);
      this.starMat.uniforms.uTwinkleStrength.value = 0.65;
      this.cloudGroup.visible = true;
      for (const c of this.cloudSlots) {
        c.cluster.visible = c.tier === 1;
      }
    } else {
      this.starGeo.setDrawRange(0, this.MAX_STARS);
      this.starMat.uniforms.uTwinkleStrength.value = 1.0;
      this.cloudGroup.visible = true;
      for (const c of this.cloudSlots) {
        c.cluster.visible = true;
      }
    }

    this.sunHaloSprite.visible = halosEnabled && quality !== 'low';
    this.moonHaloSprite.visible = halosEnabled && quality !== 'low';
  }

  public setStormOverride(stormFactor: number) {
    this.stormOverride = Math.max(0, Math.min(1, stormFactor));
  }

  public update(
    delta: number,
    elapsed: number,
    cameraPos: THREE.Vector3,
    cameraFar: number,
    atmo: SkyAtmosphereState
  ) {
    // 1. Follow camera cleanly & keep dome inside [near, far] across PC & Mobile render distances
    const skyRadius = THREE.MathUtils.clamp(cameraFar * 0.82, 125, 760);
    this.group.position.set(cameraPos.x, cameraPos.y * 0.12, cameraPos.z);
    this.group.scale.setScalar(skyRadius);

    // 2. Sky Gradient Shader Uniforms
    const u = this.skyMat.uniforms;
    u.uZenithColor.value.copy(atmo.zenithColor);
    u.uHorizonColor.value.copy(atmo.horizonColor);
    u.uGroundColor.value.copy(atmo.groundColor);
    u.uSunDir.value.copy(atmo.sunDir);
    u.uSunsetGlowColor.value.copy(atmo.sunsetGlowColor);

    const scatterScale = this.qualityTier === 'low' ? 0.55 : this.qualityTier === 'medium' ? 0.85 : 1.15;
    u.uSunsetStrength.value = atmo.sunsetStrength * scatterScale;
    u.uMilkyWayStrength.value =
      this.qualityTier === 'high' || this.qualityTier === 'ultra'
        ? atmo.starVisibility * 0.85
        : this.qualityTier === 'medium'
          ? atmo.starVisibility * 0.25
          : 0.0;
    u.uStormFactor.value = this.stormOverride;

    // 3. Sun (East +X -> Zenith +Y -> West -X)
    const sunElev = atmo.sunDir.y;
    const sunVisible = sunElev > -0.14 && this.stormOverride < 0.88;
    this.sunGroup.visible = sunVisible;
    if (sunVisible) {
      this.sunGroup.position.copy(atmo.sunDir).multiplyScalar(0.86);
      const lowHorizon = THREE.MathUtils.clamp(1.0 - Math.max(0, sunElev) / 0.35, 0, 1);
      this.sunCoreMat.color.setHex(lowHorizon > 0.45 ? 0xffedd5 : 0xfff5c0);
      this.sunHaloMat.color.setHex(lowHorizon > 0.35 ? 0xf97316 : 0xfde047);
      const fadeOutStorm = 1.0 - this.stormOverride;
      const horizonFade = THREE.MathUtils.smoothstep(sunElev, -0.12, 0.08);
      this.sunHaloMat.opacity = (this.halosEnabled ? 0.85 : 0.0) * fadeOutStorm * horizonFade;
      this.sunHaloSprite.visible = this.halosEnabled && this.qualityTier !== 'low' && horizonFade > 0.05;
    }

    // 4. Moon (180° opposite Sun -> rises East +X at dusk, zenith at midnight, sets West -X at dawn)
    const moonElev = atmo.moonDir.y;
    const moonVisible = moonElev > -0.12 && this.stormOverride < 0.88;
    this.moonGroup.visible = moonVisible;
    if (moonVisible) {
      this.moonGroup.position.copy(atmo.moonDir).multiplyScalar(0.86);
      this.moonCoreMesh.lookAt(0, 0, 0);
      const moonFade = THREE.MathUtils.smoothstep(moonElev, -0.10, 0.12) * (1.0 - this.stormOverride);
      this.moonHaloMat.opacity = 0.72 * moonFade;
      this.moonHaloSprite.visible = this.halosEnabled && this.qualityTier !== 'low' && moonFade > 0.05;
    }

    // 5. Night Stars Fade & GPU Twinkle
    const starAlpha = atmo.starVisibility * (1.0 - this.stormOverride * 0.92);
    this.starPoints.visible = starAlpha > 0.02;
    if (this.starPoints.visible) {
      this.starMat.uniforms.uTime.value = elapsed;
      this.starMat.uniforms.uStarOpacity.value = starAlpha;
    }

    // 6. Drifting Low-Poly Clouds (wind drift + phase/storm tinting)
    if (this.cloudGroup.visible) {
      this._workingCloudColor.copy(atmo.cloudColor);
      if (this.stormOverride > 0.01) {
        this._workingCloudColor.lerp(this._stormCloudTint, this.stormOverride * 0.88);
      }
      this.cloudMat.color.copy(this._workingCloudColor);
      this.cloudMat.opacity = THREE.MathUtils.lerp(0.88, 0.58, atmo.starVisibility * (1 - this.stormOverride));

      for (let i = 0; i < this.cloudSlots.length; i++) {
        const slot = this.cloudSlots[i];
        if (!slot.cluster.visible) continue;
        slot.azimuth = (slot.azimuth + slot.speed * delta) % (Math.PI * 2);
        const horizR = Math.sqrt(Math.max(0.1, 1.0 - slot.elevationY * slot.elevationY)) * 0.74;
        slot.cluster.position.set(
          Math.cos(slot.azimuth) * horizR,
          slot.elevationY * 0.74,
          Math.sin(slot.azimuth) * horizR
        );
        slot.cluster.rotation.y = -slot.azimuth + Math.PI / 2;
        slot.cluster.scale.setScalar(slot.baseScale);
      }
    }
  }
}
