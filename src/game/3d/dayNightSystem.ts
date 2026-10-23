import * as THREE from 'three';

export interface DayNightKeyframe {
  time: number; // 0.0 to 1.0 (0.0 = midnight, 0.25 = 06:00, 0.5 = 12:00, 0.75 = 18:00)
  skyColor: number;
  groundColor: number;
  ambientIntensity: number;
  dirColor: number;
  dirIntensity: number;
  dirPosition: [number, number, number];
  fogColor: number;
  fogDensity: number;
  backgroundColor: number;
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

// 10 Detailed Celestial Keyframes around the 24-hour cycle
const KEYFRAMES: DayNightKeyframe[] = [
  // 1. Tengah Malam (Midnight - 00:00)
  {
    time: 0.0,
    skyColor: 0x141a29,
    groundColor: 0x090e17,
    ambientIntensity: 0.32,
    dirColor: 0x7a9fc7,
    dirIntensity: 0.38,
    dirPosition: [-30, 85, -45],
    fogColor: 0x0a101d,
    fogDensity: 0.012,
    backgroundColor: 0x070c16,
    phase: 'night',
    phaseNameId: 'Tengah Malam',
    icon: '🌙',
  },
  // 2. Dini Hari (Late Night - 03:00)
  {
    time: 0.125,
    skyColor: 0x161e33,
    groundColor: 0x0b111e,
    ambientIntensity: 0.3,
    dirColor: 0x88a7d0,
    dirIntensity: 0.35,
    dirPosition: [-10, 80, -35],
    fogColor: 0x0d1424,
    fogDensity: 0.0125,
    backgroundColor: 0x0a0f1c,
    phase: 'night',
    phaseNameId: 'Dini Hari',
    icon: '🌌',
  },
  // 3. Fajar Mula (First Light - 05:00)
  {
    time: 0.208,
    skyColor: 0x3a2e4c,
    groundColor: 0x1a1525,
    ambientIntensity: 0.44,
    dirColor: 0xc084fc,
    dirIntensity: 0.48,
    dirPosition: [50, 40, -10],
    fogColor: 0x251e36,
    fogDensity: 0.012,
    backgroundColor: 0x1e172e,
    phase: 'dawn',
    phaseNameId: 'Fajar Mula',
    icon: '✨',
  },
  // 4. Fajar Emas / Matahari Terbit (Golden Sunrise - 06:30)
  {
    time: 0.271,
    skyColor: 0xfb923c,
    groundColor: 0x5a3118,
    ambientIntensity: 0.65,
    dirColor: 0xff9e64,
    dirIntensity: 0.98,
    dirPosition: [90, 35, 15],
    fogColor: 0xfca5a5,
    fogDensity: 0.0115,
    backgroundColor: 0xfb923c,
    phase: 'dawn',
    phaseNameId: 'Fajar Emas',
    icon: '🌅',
  },
  // 5. Pagi Segar (Fresh Morning - 08:30)
  {
    time: 0.354,
    skyColor: 0x90caf9,
    groundColor: 0x4a3728,
    ambientIntensity: 0.85,
    dirColor: 0xfef08a,
    dirIntensity: 1.2,
    dirPosition: [75, 70, 30],
    fogColor: 0x90caf9,
    fogDensity: 0.0118,
    backgroundColor: 0x90caf9,
    phase: 'day',
    phaseNameId: 'Pagi Cerah',
    icon: '🌤️',
  },
  // 6. Siang Terik (High Noon - 12:00)
  {
    time: 0.5,
    skyColor: 0x90caf9,
    groundColor: 0x4a3728,
    ambientIntensity: 0.9,
    dirColor: 0xfff9c4,
    dirIntensity: 1.3,
    dirPosition: [35, 105, 35],
    fogColor: 0x90caf9,
    fogDensity: 0.012,
    backgroundColor: 0x90caf9,
    phase: 'day',
    phaseNameId: 'Siang Terik',
    icon: '☀️',
  },
  // 7. Sore Hangat (Golden Afternoon - 15:30)
  {
    time: 0.646,
    skyColor: 0xfef08a,
    groundColor: 0x65a30d,
    ambientIntensity: 0.74,
    dirColor: 0xfde047,
    dirIntensity: 1.25,
    dirPosition: [-30, 85, 45],
    fogColor: 0xa3e635,
    fogDensity: 0.0118,
    backgroundColor: 0xbbf7d0,
    phase: 'day',
    phaseNameId: 'Sore Hangat',
    icon: '⛅',
  },
  // 8. Senja Emas (Golden Hour Sunset - 18:00)
  {
    time: 0.75,
    skyColor: 0xf97316,
    groundColor: 0x451a03,
    ambientIntensity: 0.58,
    dirColor: 0xe11d48,
    dirIntensity: 0.9,
    dirPosition: [-95, 28, 30],
    fogColor: 0xf43f5e,
    fogDensity: 0.012,
    backgroundColor: 0xe11d48,
    phase: 'sunset',
    phaseNameId: 'Senja Emas',
    icon: '🌇',
  },
  // 9. Petang / Senja Ungu (Dusk Twilight - 19:30)
  {
    time: 0.812,
    skyColor: 0x4338ca,
    groundColor: 0x1e1b4b,
    ambientIntensity: 0.42,
    dirColor: 0x818cf8,
    dirIntensity: 0.52,
    dirPosition: [-80, 15, 10],
    fogColor: 0x312e81,
    fogDensity: 0.0122,
    backgroundColor: 0x1e1b4b,
    phase: 'sunset',
    phaseNameId: 'Petang Ungu',
    icon: '🌆',
  },
  // 10. Malam Hari (Nightfall - 21:30)
  {
    time: 0.896,
    skyColor: 0x1e1b4b,
    groundColor: 0x0f172a,
    ambientIntensity: 0.35,
    dirColor: 0x7a9fc7,
    dirIntensity: 0.4,
    dirPosition: [-55, 60, -35],
    fogColor: 0x111827,
    fogDensity: 0.012,
    backgroundColor: 0x0f172a,
    phase: 'night',
    phaseNameId: 'Malam Berbintang',
    icon: '🌙',
  },
];

export class DayNightSystem {
  // Duration in seconds for a complete 24-hour cycle (240s = 4 minutes real-time)
  private cycleDuration: number;
  // Normalized time 0.0 to 1.0 (starts at 0.33 ~= 08:00 AM bright morning)
  private timeOfDay: number;
  private isPaused: boolean = false;

  // Reusable THREE.Color instances to avoid garbage collection pressure
  private tempColorA = new THREE.Color();
  private tempColorB = new THREE.Color();
  private interpolatedSky = new THREE.Color();
  private interpolatedGround = new THREE.Color();
  private interpolatedDir = new THREE.Color();
  private interpolatedFog = new THREE.Color();
  private interpolatedBg = new THREE.Color();

  constructor(initialTimeOfDay: number = 0.33, cycleDurationSeconds: number = 240) {
    this.timeOfDay = initialTimeOfDay % 1.0;
    this.cycleDuration = Math.max(30, cycleDurationSeconds);
  }

  /**
   * Set cycle duration in real seconds (e.g. 240 seconds for 4-minute full day)
   */
  public setCycleDuration(durationSeconds: number) {
    this.cycleDuration = Math.max(30, durationSeconds);
  }

  public getCycleDuration(): number {
    return this.cycleDuration;
  }

  /**
   * Directly sets the normalized time of day (0.0 to 1.0)
   */
  public setTimeOfDay(normalizedTime: number) {
    this.timeOfDay = ((normalizedTime % 1.0) + 1.0) % 1.0;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  /**
   * Advance time based on delta in-game seconds
   */
  public update(delta: number, isPaused: boolean = false) {
    if (isPaused) return;
    const rate = 1.0 / this.cycleDuration;
    this.timeOfDay = (this.timeOfDay + delta * rate) % 1.0;
  }

  /**
   * Computes human-readable time (00:00 to 23:59), phase name, icon, and progress
   */
  public getState(): DayNightState {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Find current active keyframe
    const { k1, k2, factor } = this.getKeyframePair(this.timeOfDay);
    const activeKeyframe = factor < 0.5 ? k1 : k2;

    const isNight = this.timeOfDay < 0.22 || this.timeOfDay > 0.83;

    return {
      timeOfDay: this.timeOfDay,
      hours,
      minutes,
      timeString,
      phase: activeKeyframe.phase,
      phaseNameId: activeKeyframe.phaseNameId,
      icon: activeKeyframe.icon,
      progress: this.timeOfDay,
      isNight,
    };
  }

  /**
   * Finds the two surrounding keyframes and interpolation factor
   */
  private getKeyframePair(t: number): { k1: DayNightKeyframe; k2: DayNightKeyframe; factor: number } {
    const n = KEYFRAMES.length;
    for (let i = 0; i < n; i++) {
      const k1 = KEYFRAMES[i];
      const nextIndex = (i + 1) % n;
      const k2 = KEYFRAMES[nextIndex];

      let t1 = k1.time;
      let t2 = k2.time;

      if (t2 < t1) {
        // Wraps around midnight (e.g. from 0.896 to 0.0)
        t2 += 1.0;
        let testT = t;
        if (testT < t1) {
          testT += 1.0;
        }
        if (testT >= t1 && testT <= t2) {
          const factor = (testT - t1) / (t2 - t1);
          return { k1, k2, factor: Math.max(0, Math.min(1, factor)) };
        }
      } else {
        if (t >= t1 && t <= t2) {
          const factor = (t - t1) / (t2 - t1);
          return { k1, k2, factor: Math.max(0, Math.min(1, factor)) };
        }
      }
    }

    // Fallback if boundary edge
    return { k1: KEYFRAMES[0], k2: KEYFRAMES[1], factor: 0 };
  }

  /**
   * Smoothly apply gradual lighting shifts to Three.js scene, ambient/hemi light, and directional sun/moon light
   */
  public applyOutdoorLighting(
    scene: THREE.Scene,
    hemiLight: THREE.HemisphereLight,
    dirLight: THREE.DirectionalLight
  ) {
    const { k1, k2, factor } = this.getKeyframePair(this.timeOfDay);

    // Smoothstep easing for ultra-gradual color transitions
    const easedFactor = factor * factor * (3 - 2 * factor);

    // 1. Shift Ambient / Hemisphere Sky & Ground Colors
    this.tempColorA.setHex(k1.skyColor);
    this.tempColorB.setHex(k2.skyColor);
    this.interpolatedSky.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    hemiLight.color.copy(this.interpolatedSky);

    this.tempColorA.setHex(k1.groundColor);
    this.tempColorB.setHex(k2.groundColor);
    this.interpolatedGround.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    hemiLight.groundColor.copy(this.interpolatedGround);

    // Shift Ambient Intensity
    hemiLight.intensity = THREE.MathUtils.lerp(
      k1.ambientIntensity,
      k2.ambientIntensity,
      easedFactor
    );

    // 2. Shift Directional Light (Sun / Moon) Color & Intensity
    this.tempColorA.setHex(k1.dirColor);
    this.tempColorB.setHex(k2.dirColor);
    this.interpolatedDir.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    dirLight.color.copy(this.interpolatedDir);

    dirLight.intensity = THREE.MathUtils.lerp(
      k1.dirIntensity,
      k2.dirIntensity,
      easedFactor
    );

    // 3. Shift Directional Light Position across the Celestial Arc
    const posX = THREE.MathUtils.lerp(k1.dirPosition[0], k2.dirPosition[0], easedFactor);
    const posY = THREE.MathUtils.lerp(k1.dirPosition[1], k2.dirPosition[1], easedFactor);
    const posZ = THREE.MathUtils.lerp(k1.dirPosition[2], k2.dirPosition[2], easedFactor);
    dirLight.position.set(posX, posY, posZ);

    // 4. Shift Atmospheric Sky Background & Fog Color
    this.tempColorA.setHex(k1.backgroundColor);
    this.tempColorB.setHex(k2.backgroundColor);
    this.interpolatedBg.copy(this.tempColorA).lerp(this.tempColorB, easedFactor);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(this.interpolatedBg);
    } else {
      scene.background = this.interpolatedBg.clone();
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

  /**
   * Returns current interpolated fog and background colors for exterior restoration
   */
  public getCurrentAtmosphere(): { fogColor: THREE.Color; bgColor: THREE.Color; fogDensity: number } {
    const { k1, k2, factor } = this.getKeyframePair(this.timeOfDay);
    const easedFactor = factor * factor * (3 - 2 * factor);

    const fog = new THREE.Color(k1.fogColor).lerp(new THREE.Color(k2.fogColor), easedFactor);
    const bg = new THREE.Color(k1.backgroundColor).lerp(new THREE.Color(k2.backgroundColor), easedFactor);
    const density = THREE.MathUtils.lerp(k1.fogDensity, k2.fogDensity, easedFactor);

    return { fogColor: fog, bgColor: bg, fogDensity: density };
  }
}
