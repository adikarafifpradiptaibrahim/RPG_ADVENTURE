import * as THREE from 'three';

export interface DayNightKeyframe {
  time: number; // 0.0 to 1.0 (0.0 = midnight, 0.25 = 06:00, 0.5 = 12:00, 0.75 = 18:00)
  zenithColor: number;
  horizonColor: number;
  groundColor: number;
  skyColor: number; // hemisphere sky bounce
  hemiGroundColor: number;
  ambientIntensity: number;
  moonAmbientIntensity: number;
  dirColor: number;
  dirIntensity: number;
  fogColor: number;
  fogDensity: number;
  sunsetGlowColor: number;
  sunsetStrength: number;
  cloudColor: number;
  starVisibility: number;
  phase: 'dawn' | 'day' | 'sunset' | 'night';
  phaseNameId: string;
  icon: string;
}

export interface DayNightState {
  timeOfDay: number; // 0.0 to 1.0
  hours: number;
  minutes: number;
  timeString: string;
  phase: 'dawn' | 'day' | 'sunset' | 'night';
  phaseNameId: string;
  icon: string;
  progress: number;
  isNight: boolean;
}

export interface SkyAtmosphereState {
  zenithColor: THREE.Color;
  horizonColor: THREE.Color;
  groundColor: THREE.Color;
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  sunsetGlowColor: THREE.Color;
  sunsetStrength: number;
  cloudColor: THREE.Color;
  starVisibility: number;
  isNight: boolean;
}

// 4-Phase Time-of-Day Keyframes around 24 hours:
// - Pagi (05:30 - 08:30): Peach-gold horizon (#fdba74) -> clear sky blue (#38bdf8)
// - Siang (08:30 - 16:00): Fresh sky blue (#2563eb) -> warm pale blue horizon (#bae6fd)
// - Sore / Senja (16:00 - 19:00): Sunset orange-red horizon (#f97316 / #e11d48) -> twilight purple-blue (#312e81)
// - Malam (19:00 - 05:30): Deep night blue (#090e1a -> #16233d, NEVER dead black!) + soft moonlit ambient
const KEYFRAMES: DayNightKeyframe[] = [
  // 00:00 Midnight
  {
    time: 0.0,
    zenithColor: 0x090e1a,
    horizonColor: 0x16233d,
    groundColor: 0x0b1222,
    skyColor: 0x3b5998,
    hemiGroundColor: 0x18243d,
    ambientIntensity: 0.56,
    moonAmbientIntensity: 0.42,
    dirColor: 0x93c5fd,
    dirIntensity: 0.52,
    fogColor: 0x132038,
    fogDensity: 0.010,
    sunsetGlowColor: 0x1e293b,
    sunsetStrength: 0.0,
    cloudColor: 0x2c3d5e,
    starVisibility: 1.0,
    phase: 'night',
    phaseNameId: 'Tengah Malam',
    icon: '🌙',
  },
  // 04:30 Late Night
  {
    time: 0.1875,
    zenithColor: 0x090e1a,
    horizonColor: 0x16233d,
    groundColor: 0x0c1424,
    skyColor: 0x425b91,
    hemiGroundColor: 0x1a2640,
    ambientIntensity: 0.56,
    moonAmbientIntensity: 0.42,
    dirColor: 0x93c5fd,
    dirIntensity: 0.50,
    fogColor: 0x14223a,
    fogDensity: 0.010,
    sunsetGlowColor: 0x3b2d54,
    sunsetStrength: 0.10,
    cloudColor: 0x314366,
    starVisibility: 0.95,
    phase: 'night',
    phaseNameId: 'Dini Hari',
    icon: '🌌',
  },
  // 05:30 Dawn Break (Pagi Starts)
  {
    time: 0.2292,
    zenithColor: 0x1e3a6e,
    horizonColor: 0xfdba74,
    groundColor: 0x3b271e,
    skyColor: 0xfdba74,
    hemiGroundColor: 0x2f2536,
    ambientIntensity: 0.64,
    moonAmbientIntensity: 0.22,
    dirColor: 0xfdba74,
    dirIntensity: 0.72,
    fogColor: 0xf5b37c,
    fogDensity: 0.0105,
    sunsetGlowColor: 0xf97316,
    sunsetStrength: 0.95,
    cloudColor: 0xfed7aa,
    starVisibility: 0.25,
    phase: 'dawn',
    phaseNameId: 'Fajar Pagi',
    icon: '🌅',
  },
  // 07:00 Early Morning (Pagi Cerah: Peach-Gold Horizon -> Clear Sky Blue #38bdf8)
  {
    time: 0.2917,
    zenithColor: 0x38bdf8,
    horizonColor: 0xfdba74,
    groundColor: 0x4b5563,
    skyColor: 0x7dd3fc,
    hemiGroundColor: 0x5c4738,
    ambientIntensity: 0.78,
    moonAmbientIntensity: 0.0,
    dirColor: 0xfef08a,
    dirIntensity: 1.08,
    fogColor: 0xfde68a,
    fogDensity: 0.0102,
    sunsetGlowColor: 0xfdba74,
    sunsetStrength: 0.60,
    cloudColor: 0xfff7ed,
    starVisibility: 0.0,
    phase: 'dawn',
    phaseNameId: 'Pagi Cerah',
    icon: '🌤️',
  },
  // 08:30 Mid-Morning Transition into Day
  {
    time: 0.3542,
    zenithColor: 0x2563eb,
    horizonColor: 0xbae6fd,
    groundColor: 0x4b5d46,
    skyColor: 0x93c5fd,
    hemiGroundColor: 0x4a5d40,
    ambientIntensity: 0.85,
    moonAmbientIntensity: 0.0,
    dirColor: 0xfff7cc,
    dirIntensity: 1.24,
    fogColor: 0xbae6fd,
    fogDensity: 0.0105,
    sunsetGlowColor: 0xfef08a,
    sunsetStrength: 0.15,
    cloudColor: 0xf8fafc,
    starVisibility: 0.0,
    phase: 'day',
    phaseNameId: 'Pagi Segar',
    icon: '☀️',
  },
  // 12:30 High Noon (Siang: Fresh Blue #2563eb -> Hazy Warm Horizon #bae6fd)
  {
    time: 0.5208,
    zenithColor: 0x2563eb,
    horizonColor: 0xbae6fd,
    groundColor: 0x526548,
    skyColor: 0x93c5fd,
    hemiGroundColor: 0x4c5e3f,
    ambientIntensity: 0.90,
    moonAmbientIntensity: 0.0,
    dirColor: 0xfffbeb,
    dirIntensity: 1.32,
    fogColor: 0xbae6fd,
    fogDensity: 0.0105,
    sunsetGlowColor: 0xfef3c7,
    sunsetStrength: 0.08,
    cloudColor: 0xffffff,
    starVisibility: 0.0,
    phase: 'day',
    phaseNameId: 'Siang Cerah',
    icon: '☀️',
  },
  // 16:00 Afternoon Sunset Begins (Sore Starts)
  {
    time: 0.6667,
    zenithColor: 0x3b82f6,
    horizonColor: 0xfdba74,
    groundColor: 0x4a3d33,
    skyColor: 0x93c5fd,
    hemiGroundColor: 0x4a4538,
    ambientIntensity: 0.76,
    moonAmbientIntensity: 0.0,
    dirColor: 0xfef08a,
    dirIntensity: 1.10,
    fogColor: 0xfde68a,
    fogDensity: 0.0108,
    sunsetGlowColor: 0xf97316,
    sunsetStrength: 0.45,
    cloudColor: 0xffedd5,
    starVisibility: 0.0,
    phase: 'day',
    phaseNameId: 'Sore Hangat',
    icon: '⛅',
  },
  // 17:45 Vivid Golden-Crimson Sunset (Sore/Senja: Orange-Red #f97316/#e11d48 -> Purple-Blue #312e81)
  {
    time: 0.7396,
    zenithColor: 0x312e81,
    horizonColor: 0xf97316,
    groundColor: 0x2a1824,
    skyColor: 0xf97316,
    hemiGroundColor: 0x3d232b,
    ambientIntensity: 0.66,
    moonAmbientIntensity: 0.14,
    dirColor: 0xfb923c,
    dirIntensity: 0.88,
    fogColor: 0xea6a47,
    fogDensity: 0.0112,
    sunsetGlowColor: 0xe11d48,
    sunsetStrength: 1.15,
    cloudColor: 0xfdba74,
    starVisibility: 0.18,
    phase: 'sunset',
    phaseNameId: 'Senja Lembayung',
    icon: '🌇',
  },
  // 19:00 Twilight Dusk -> Night Transition
  {
    time: 0.7917,
    zenithColor: 0x161c3a,
    horizonColor: 0x312e81,
    groundColor: 0x11172a,
    skyColor: 0x4338ca,
    hemiGroundColor: 0x1b233b,
    ambientIntensity: 0.56,
    moonAmbientIntensity: 0.36,
    dirColor: 0x93c5fd,
    dirIntensity: 0.54,
    fogColor: 0x1b2544,
    fogDensity: 0.0105,
    sunsetGlowColor: 0xe11d48,
    sunsetStrength: 0.35,
    cloudColor: 0x3c4b70,
    starVisibility: 0.78,
    phase: 'sunset',
    phaseNameId: 'Petang Berbintang',
    icon: '🌆',
  },
  // 21:00 Full Moonlit Night
  {
    time: 0.875,
    zenithColor: 0x090e1a,
    horizonColor: 0x16233d,
    groundColor: 0x0b1222,
    skyColor: 0x3b5998,
    hemiGroundColor: 0x18243d,
    ambientIntensity: 0.56,
    moonAmbientIntensity: 0.42,
    dirColor: 0x93c5fd,
    dirIntensity: 0.52,
    fogColor: 0x132038,
    fogDensity: 0.010,
    sunsetGlowColor: 0x1e293b,
    sunsetStrength: 0.0,
    cloudColor: 0x2c3d5e,
    starVisibility: 1.0,
    phase: 'night',
    phaseNameId: 'Malam Berbintang',
    icon: '🌙',
  },
];

export class DayNightSystem {
  private cycleDuration: number;
  private timeOfDay: number;

  // Reusable THREE objects to avoid garbage collection pressure
  private tempColorA = new THREE.Color();
  private tempColorB = new THREE.Color();
  private interpolatedZenith = new THREE.Color();
  private interpolatedHorizon = new THREE.Color();
  private interpolatedGround = new THREE.Color();
  private interpolatedSky = new THREE.Color();
  private interpolatedHemiGround = new THREE.Color();
  private interpolatedDir = new THREE.Color();
  private interpolatedFog = new THREE.Color();
  private interpolatedSunset = new THREE.Color();
  private interpolatedCloud = new THREE.Color();
  private _sunDir = new THREE.Vector3(1, 0, -0.22).normalize();
  private _moonDir = new THREE.Vector3(-1, 0, 0.18).normalize();
  private _lightDir = new THREE.Vector3();

  private readonly _skyAtmoState: SkyAtmosphereState;

  constructor(initialTimeOfDay: number = 0.35, cycleDurationSeconds: number = 1440) {
    this.timeOfDay = initialTimeOfDay % 1.0;
    this.cycleDuration = Math.max(30, cycleDurationSeconds);
    this._skyAtmoState = {
      zenithColor: this.interpolatedZenith,
      horizonColor: this.interpolatedHorizon,
      groundColor: this.interpolatedGround,
      sunDir: this._sunDir,
      moonDir: this._moonDir,
      sunsetGlowColor: this.interpolatedSunset,
      sunsetStrength: 0,
      cloudColor: this.interpolatedCloud,
      starVisibility: 0,
      isNight: false,
    };
  }

  /**
   * Lentera Desa & Obor: otomatis menyala pukul 18:00 (0.75) s/d 05:30 (0.2292)
   */
  public isVillageLanternTime(): boolean {
    return this.timeOfDay >= 0.75 || this.timeOfDay < 5.5 / 24;
  }

  public setCycleDuration(durationSeconds: number) {
    this.cycleDuration = Math.max(30, durationSeconds);
  }

  public getCycleDuration(): number {
    return this.cycleDuration;
  }

  public setTimeOfDay(normalizedTime: number) {
    this.timeOfDay = ((normalizedTime % 1.0) + 1.0) % 1.0;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public update(delta: number, isPaused: boolean = false) {
    if (isPaused) return;
    const rate = 1.0 / this.cycleDuration;
    this.timeOfDay = (this.timeOfDay + delta * rate) % 1.0;
  }

  public getState(): DayNightState {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const { k1 } = this.getKeyframePair(this.timeOfDay);
    const isNight = hours >= 19 || hours < 6;

    return {
      timeOfDay: this.timeOfDay,
      hours,
      minutes,
      timeString,
      phase: k1.phase,
      phaseNameId: k1.phaseNameId,
      icon: k1.icon,
      progress: this.timeOfDay,
      isNight,
    };
  }

  private getKeyframePair(t: number): { k1: DayNightKeyframe; k2: DayNightKeyframe; factor: number } {
    for (let i = 0; i < KEYFRAMES.length; i++) {
      const k1 = KEYFRAMES[i];
      const nextIdx = (i + 1) % KEYFRAMES.length;
      const k2 = KEYFRAMES[nextIdx];

      const t1 = k1.time;
      let t2 = k2.time;
      let curT = t;

      if (nextIdx === 0) {
        t2 = 1.0;
      }

      if (curT >= t1 && curT <= t2) {
        const span = Math.max(0.0001, t2 - t1);
        const factor = (curT - t1) / span;
        return { k1, k2, factor };
      }
    }
    return { k1: KEYFRAMES[0], k2: KEYFRAMES[1], factor: 0 };
  }

  private updateSunMoonDirections() {
    // 06:00 (0.25) -> 0 rad (+X East), 12:00 (0.50) -> PI/2 (+Y Zenith), 18:00 (0.75) -> PI (-X West)
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    this._sunDir.set(Math.cos(sunAngle), Math.sin(sunAngle), -0.22).normalize();

    // Moon orbits opposite Sun (rises East +X at dusk, peaks zenith at midnight, sets West -X at dawn)
    const moonAngle = sunAngle + Math.PI;
    this._moonDir.set(Math.cos(moonAngle), Math.sin(moonAngle), 0.18).normalize();
  }

  public getSkyAtmosphere(): SkyAtmosphereState {
    const { k1, k2, factor } = this.getKeyframePair(this.timeOfDay);
    const easedFactor = factor * factor * (3 - 2 * factor);

    this.updateSunMoonDirections();

    const lerpHex = (c1: number, c2: number, out: THREE.Color) => {
      this.tempColorA.setHex(c1);
      this.tempColorB.setHex(c2);
      out.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    };

    lerpHex(k1.zenithColor, k2.zenithColor, this.interpolatedZenith);
    lerpHex(k1.horizonColor, k2.horizonColor, this.interpolatedHorizon);
    lerpHex(k1.groundColor, k2.groundColor, this.interpolatedGround);
    lerpHex(k1.sunsetGlowColor, k2.sunsetGlowColor, this.interpolatedSunset);
    lerpHex(k1.cloudColor, k2.cloudColor, this.interpolatedCloud);

    this._skyAtmoState.sunsetStrength = THREE.MathUtils.lerp(k1.sunsetStrength, k2.sunsetStrength, easedFactor);
    this._skyAtmoState.starVisibility = THREE.MathUtils.lerp(k1.starVisibility, k2.starVisibility, easedFactor);
    this._skyAtmoState.isNight = this._sunDir.y < 0.04;
    return this._skyAtmoState;
  }

  public applyOutdoorLighting(
    scene: THREE.Scene,
    hemiLight: THREE.HemisphereLight,
    dirLight: THREE.DirectionalLight,
    targetPos?: THREE.Vector3,
    moonAmbientLight?: THREE.AmbientLight | null
  ) {
    const { k1, k2, factor } = this.getKeyframePair(this.timeOfDay);
    const easedFactor = factor * factor * (3 - 2 * factor);
    const atmo = this.getSkyAtmosphere();

    // 1. Shift Hemisphere Light
    this.tempColorA.setHex(k1.skyColor);
    this.tempColorB.setHex(k2.skyColor);
    this.interpolatedSky.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    hemiLight.color.copy(this.interpolatedSky);

    this.tempColorA.setHex(k1.hemiGroundColor);
    this.tempColorB.setHex(k2.hemiGroundColor);
    this.interpolatedHemiGround.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    hemiLight.groundColor.copy(this.interpolatedHemiGround);

    hemiLight.intensity = THREE.MathUtils.lerp(k1.ambientIntensity, k2.ambientIntensity, easedFactor);

    // Optional soft moonlit AmbientLight fill so night terrain & buildings remain readable (NEVER pitch black)
    if (moonAmbientLight) {
      moonAmbientLight.color.setHex(0x4769a6);
      moonAmbientLight.intensity = THREE.MathUtils.lerp(
        k1.moonAmbientIntensity,
        k2.moonAmbientIntensity,
        easedFactor
      );
    }

    // 2. Shift Directional Light (Sun by day, soft moonlight by night)
    this.tempColorA.setHex(k1.dirColor);
    this.tempColorB.setHex(k2.dirColor);
    this.interpolatedDir.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    dirLight.color.copy(this.interpolatedDir);
    dirLight.intensity = THREE.MathUtils.lerp(k1.dirIntensity, k2.dirIntensity, easedFactor);

    // Track real East -> West celestial trajectory of whichever orb is above horizon
    const activeCelestial = this._sunDir.y >= 0.04 ? this._sunDir : this._moonDir;
    this._lightDir.copy(activeCelestial);
    this._lightDir.y = Math.max(0.24, this._lightDir.y); // Prevent flat extreme horizon shadow acne
    this._lightDir.normalize();

    const dist = 115;
    if (targetPos) {
      dirLight.position.set(
        targetPos.x + this._lightDir.x * dist,
        this._lightDir.y * dist,
        targetPos.z + this._lightDir.z * dist
      );
      if (dirLight.target) {
        dirLight.target.position.set(targetPos.x, targetPos.y, targetPos.z);
        if (!dirLight.target.parent) {
          scene.add(dirLight.target);
        }
      }
    } else {
      dirLight.position.set(this._lightDir.x * dist, this._lightDir.y * dist, this._lightDir.z * dist);
    }

    // 3. Background fallback & Fog matched cleanly to SkyDome Horizon Color
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(atmo.horizonColor);
    } else {
      scene.background = atmo.horizonColor.clone();
    }

    this.tempColorA.setHex(k1.fogColor);
    this.tempColorB.setHex(k2.fogColor);
    this.interpolatedFog.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);

    if (scene.fog) {
      scene.fog.color.copy(this.interpolatedFog);
      if ('density' in scene.fog) {
        const targetDensity = THREE.MathUtils.lerp(k1.fogDensity, k2.fogDensity, easedFactor);
        (scene.fog as THREE.FogExp2).density = targetDensity;
      }
    }
  }

  public getCurrentAtmosphere(): { fogColor: THREE.Color; bgColor: THREE.Color; fogDensity: number } {
    const { k1, k2, factor } = this.getKeyframePair(this.timeOfDay);
    const easedFactor = factor * factor * (3 - 2 * factor);

    const fog = new THREE.Color(k1.fogColor).lerp(new THREE.Color(k2.fogColor), easedFactor);
    const bg = new THREE.Color(k1.horizonColor).lerp(new THREE.Color(k2.horizonColor), easedFactor);
    const density = THREE.MathUtils.lerp(k1.fogDensity, k2.fogDensity, easedFactor);

    return { fogColor: fog, bgColor: bg, fogDensity: density };
  }
}

let sharedDayNightSystem: DayNightSystem | null = null;
export function getSharedDayNightSystem(): DayNightSystem {
  if (!sharedDayNightSystem) {
    sharedDayNightSystem = new DayNightSystem(0.35, 1440);
  }
  return sharedDayNightSystem;
}
