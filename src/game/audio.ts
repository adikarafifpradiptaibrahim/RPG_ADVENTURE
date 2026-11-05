/**
 * Procedural Web Audio API Sound Synthesizer for 3D RPG
 * Guarantees zero latency and works without external MP3/WAV files
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicInterval: any = null;
  private isMusicPlaying: boolean = false;
  private currentBossMusic: 'titan' | 'dragon' | 'worm' | null = null;
  private bossMusicInterval: any = null;
  private bossMusicGain: GainNode | null = null;
  private bossStep = 0;

  private noiseBuffer: AudioBuffer | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.42, this.ctx.currentTime);

        this.musicGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);

        // Precompute procedural organic noise buffer for realistic whooshes and impacts
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.03 * white) / 1.03;
          data[i] = white * 0.35 + lastOut * 0.65;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Helper for generating organic noise bursts (whooshes, blade friction, gas hiss, explosions)
  private playNoiseBurst(options: {
    duration: number;
    gain: number;
    filterType?: BiquadFilterType;
    freqStart: number;
    freqEnd: number;
    delay?: number;
  }) {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime + (options.delay || 0);

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = options.filterType || 'bandpass';
    filter.frequency.setValueAtTime(options.freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, options.freqEnd), now + options.duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(options.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(now);
    source.stop(now + options.duration + 0.02);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.musicGain && this.sfxGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(muted ? 0 : 0.2, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(muted ? 0 : 0.42, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public playSlash() {
    this.playWarriorCleave(1);
  }

  // --- WARRIOR SOUNDS (Heavy, Metallic, Concussive) ---
  public playWarriorCleave(combo: 1 | 2 | 3 = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    if (combo === 3) {
      // Finisher: Massive 360° Greatsword cleave with metallic blade ring + deep sub-bass thump
      this.playNoiseBurst({
        duration: 0.26,
        gain: 0.38,
        filterType: 'bandpass',
        freqStart: 2400,
        freqEnd: 280,
      });

      // Concussive Heavy Metal Sub-bass impact
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.32);
      subGain.gain.setValueAtTime(0.65, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);
      subOsc.start(now);
      subOsc.stop(now + 0.34);

      // Steel resonance ring
      const ringOsc = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ringOsc.type = 'triangle';
      ringOsc.frequency.setValueAtTime(840, now + 0.04);
      ringOsc.frequency.exponentialRampToValueAtTime(320, now + 0.3);
      ringGain.gain.setValueAtTime(0.3, now + 0.04);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      ringOsc.connect(ringGain);
      ringGain.connect(this.sfxGain);
      ringOsc.start(now + 0.04);
      ringOsc.stop(now + 0.32);
    } else {
      // Combo 1 & 2: Quick, heavy blade whoosh with crisp steel slicing transient
      this.playNoiseBurst({
        duration: 0.16,
        gain: 0.3,
        filterType: 'bandpass',
        freqStart: combo === 1 ? 2200 : 2800,
        freqEnd: 350,
      });

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const startFreq = combo === 1 ? 320 : 380;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.15);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  }

  public playWarriorShieldSlam() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Heavy 808-style concussive sub punch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(150, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.29);

    // 2. Metallic shield clank (resonating metal bell/plate)
    const clankOsc = this.ctx.createOscillator();
    const clankGain = this.ctx.createGain();
    clankOsc.type = 'triangle';
    clankOsc.frequency.setValueAtTime(680, now);
    clankOsc.frequency.exponentialRampToValueAtTime(240, now + 0.2);
    clankGain.gain.setValueAtTime(0.38, now);
    clankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    clankOsc.connect(clankGain);
    clankGain.connect(this.sfxGain);
    clankOsc.start(now);
    clankOsc.stop(now + 0.23);

    // 3. Air blast noise burst
    this.playNoiseBurst({
      duration: 0.18,
      gain: 0.35,
      filterType: 'lowpass',
      freqStart: 1800,
      freqEnd: 150,
    });
  }

  // ==========================================
  // EPIC CHARACTER ACTIVE SKILL AUDIO SYNTHESIZERS
  // ==========================================

  // 1. TEBAS 360° (Full 360° Greatsword Cleave Finisher)
  // Concussive sub-bass punch (75Hz -> 26Hz) + high-velocity razor steel whoosh + resonant harmonic blade ring
  public playSkillTebas360() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // A. Sub-bass kinetic body punch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.32);
    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.33);

    // B. High-velocity aerodynamic blade slice whoosh
    this.playNoiseBurst({
      duration: 0.32,
      gain: 0.52,
      filterType: 'bandpass',
      freqStart: 3800,
      freqEnd: 220,
    });

    // C. Resonating forged steel blade sing
    const ringOsc = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ringOsc.type = 'triangle';
    ringOsc.frequency.setValueAtTime(1180, now + 0.03);
    ringOsc.frequency.exponentialRampToValueAtTime(440, now + 0.38);
    ringGain.gain.setValueAtTime(0.42, now + 0.03);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    ringOsc.connect(ringGain);
    ringGain.connect(this.sfxGain);
    ringOsc.start(now + 0.03);
    ringOsc.stop(now + 0.39);
  }

  // 2. PUSARAN BADAI BAJA (Skill 1: Whirlwind Cyclone 360°)
  // Roaring elemental tornado bass drone + multi-layer swirling wind vortex + rapid steel blade friction slices
  public playSkillPusaran() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // A. Low-frequency cyclone rumble drone
    const droneOsc = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.setValueAtTime(85, now);
    droneOsc.frequency.linearRampToValueAtTime(120, now + 0.25);
    droneOsc.frequency.exponentialRampToValueAtTime(40, now + 0.55);
    droneGain.gain.setValueAtTime(0.45, now);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    droneOsc.connect(droneGain);
    droneGain.connect(this.sfxGain);
    droneOsc.start(now);
    droneOsc.stop(now + 0.56);

    // B. Multi-burst swirling vortex whooshes (simulates 360-degree rotation)
    [0, 0.1, 0.22, 0.34].forEach((delay, idx) => {
      this.playNoiseBurst({
        duration: 0.24,
        gain: 0.42 - idx * 0.05,
        filterType: 'bandpass',
        freqStart: 1200 + idx * 400,
        freqEnd: 300,
        delay,
      });

      // Steel blade friction sweep
      const sliceOsc = this.ctx!.createOscillator();
      const sliceGain = this.ctx!.createGain();
      sliceOsc.type = 'triangle';
      sliceOsc.frequency.setValueAtTime(700 + idx * 180, now + delay);
      sliceOsc.frequency.exponentialRampToValueAtTime(220, now + delay + 0.18);
      sliceGain.gain.setValueAtTime(0.3, now + delay);
      sliceGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
      sliceOsc.connect(sliceGain);
      sliceGain.connect(this.sfxGain!);
      sliceOsc.start(now + delay);
      sliceOsc.stop(now + delay + 0.19);
    });
  }

  // 3. TERJANGAN PERISAI SUCI (Skill 2: Holy Shield Rush & Concussive Impact)
  // Kinetic sonic charge whoosh + heavy 808 shield impact slam + resonant brass shield clang + compressed air blast
  public playSkillTerjang() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // A. Kinetic charge sonic rush whoosh
    this.playNoiseBurst({
      duration: 0.22,
      gain: 0.45,
      filterType: 'lowpass',
      freqStart: 500,
      freqEnd: 1900,
    });

    // B. Heavy 808 sub-bass concussion slam on impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(175, now + 0.12);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.42);
    subGain.gain.setValueAtTime(0.72, now + 0.12);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now + 0.12);
    subOsc.stop(now + 0.43);

    // C. Resonating heavy metal buckler shield clang
    const clangOsc = this.ctx.createOscillator();
    const clangGain = this.ctx.createGain();
    clangOsc.type = 'triangle';
    clangOsc.frequency.setValueAtTime(820, now + 0.12);
    clangOsc.frequency.exponentialRampToValueAtTime(180, now + 0.36);
    clangGain.gain.setValueAtTime(0.55, now + 0.12);
    clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    clangOsc.connect(clangGain);
    clangGain.connect(this.sfxGain);
    clangOsc.start(now + 0.12);
    clangOsc.stop(now + 0.37);

    // D. Compressed shockwave air dispersion
    this.playNoiseBurst({
      duration: 0.25,
      gain: 0.48,
      filterType: 'bandpass',
      freqStart: 2600,
      freqEnd: 140,
      delay: 0.12,
    });
  }

  // 4. BENTENG BESI SUCI (Skill 3: Holy Iron Fortress & Divine Barrier Dome)
  // Sacred divine cathedral bell harmony (528Hz + 792Hz) + heavy ground stake slam + radiant glowing forcefield aura shimmer
  public playSkillBenteng() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // A. Heavy ground stake impact thump (sword stabbing earth)
    const thumpOsc = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(120, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    thumpGain.gain.setValueAtTime(0.65, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.sfxGain);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.31);

    // B. Dual harmonic cathedral bell chimes (Solfeggio harmonic 528Hz root + 792Hz pure fifth)
    [528, 792].forEach((freq, idx) => {
      const bellOsc = this.ctx!.createOscillator();
      const bellGain = this.ctx!.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(freq, now + 0.05);
      bellOsc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.65);
      bellGain.gain.setValueAtTime(0.4 - idx * 0.1, now + 0.05);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      bellOsc.connect(bellGain);
      bellGain.connect(this.sfxGain!);
      bellOsc.start(now + 0.05);
      bellOsc.stop(now + 0.66);
    });

    // C. Shimmering divine aura shimmer whoosh
    this.playNoiseBurst({
      duration: 0.55,
      gain: 0.38,
      filterType: 'highpass',
      freqStart: 800,
      freqEnd: 3600,
      delay: 0.06,
    });
  }

  // 5. LOMPAT & DENTUMAN TANAH (Jump & Heavy Ground Slam)
  // Takeoff: kinetic spring leap whoosh + armor plate clatter
  public playSkillLompat() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Upward kinetic swoosh
    const swooshOsc = this.ctx.createOscillator();
    const swooshGain = this.ctx.createGain();
    swooshOsc.type = 'sine';
    swooshOsc.frequency.setValueAtTime(140, now);
    swooshOsc.frequency.exponentialRampToValueAtTime(420, now + 0.18);
    swooshGain.gain.setValueAtTime(0.35, now);
    swooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    swooshOsc.connect(swooshGain);
    swooshGain.connect(this.sfxGain);
    swooshOsc.start(now);
    swooshOsc.stop(now + 0.19);

    // Armor rustle / step noise
    this.playNoiseBurst({
      duration: 0.14,
      gain: 0.28,
      filterType: 'bandpass',
      freqStart: 1800,
      freqEnd: 600,
    });
  }

  // Ground Landing: Heavy seismic earth impact slam
  public playSkillLompatLand() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy subterranean earth thud
    const landOsc = this.ctx.createOscillator();
    const landGain = this.ctx.createGain();
    landOsc.type = 'sine';
    landOsc.frequency.setValueAtTime(130, now);
    landOsc.frequency.exponentialRampToValueAtTime(28, now + 0.28);
    landGain.gain.setValueAtTime(0.68, now);
    landGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    landOsc.connect(landGain);
    landGain.connect(this.sfxGain);
    landOsc.start(now);
    landOsc.stop(now + 0.29);

    // Shattering dust & gravel impact burst
    this.playNoiseBurst({
      duration: 0.22,
      gain: 0.42,
      filterType: 'lowpass',
      freqStart: 1400,
      freqEnd: 110,
    });
  }

  // --- MAGE SOUNDS (Crystalline, Astral, Ethereal) ---
  public playMageBolt() {
    this.playMageArcaneLaser();
  }

  // Spectacular 1.0s Arcane Laser Beam SFX (Charge Sweep + Energy Explosion + Sustained Laser Plasma Hum)
  public playMageArcaneLaser() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Arcane Beam Charge (Instant 0.08s rising energy sweep)
    const chargeOsc = this.ctx.createOscillator();
    const chargeGain = this.ctx.createGain();
    chargeOsc.type = 'sine';
    chargeOsc.frequency.setValueAtTime(800, now);
    chargeOsc.frequency.exponentialRampToValueAtTime(3200, now + 0.08);
    chargeGain.gain.setValueAtTime(0.01, now);
    chargeGain.gain.linearRampToValueAtTime(0.35, now + 0.07);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    chargeOsc.connect(chargeGain);
    chargeGain.connect(this.sfxGain);
    chargeOsc.start(now);
    chargeOsc.stop(now + 0.13);

    // 2. Energy Explosion Punch (Sub-bass impact + high energy discharge)
    const punchOsc = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punchOsc.type = 'sine';
    punchOsc.frequency.setValueAtTime(220, now + 0.04);
    punchOsc.frequency.exponentialRampToValueAtTime(42, now + 0.38);
    punchGain.gain.setValueAtTime(0.55, now + 0.04);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    punchOsc.connect(punchGain);
    punchGain.connect(this.sfxGain);
    punchOsc.start(now + 0.04);
    punchOsc.stop(now + 0.4);

    // Discharge crackle / plasma burst
    this.playNoiseBurst({
      duration: 0.3,
      gain: 0.28,
      filterType: 'bandpass',
      freqStart: 4200,
      freqEnd: 680,
      delay: 0.04,
    });

    // 3. 1.0-Second Sustained Laser Plasma Hum with Rapid LFO Modulation
    const laserOsc = this.ctx.createOscillator();
    const laserFilter = this.ctx.createBiquadFilter();
    const laserGain = this.ctx.createGain();

    laserOsc.type = 'sawtooth';
    laserOsc.frequency.setValueAtTime(320, now + 0.05);
    laserOsc.frequency.exponentialRampToValueAtTime(240, now + 1.0);

    laserFilter.type = 'lowpass';
    laserFilter.frequency.setValueAtTime(1400, now + 0.05);
    laserFilter.frequency.exponentialRampToValueAtTime(750, now + 1.0);
    laserFilter.Q.setValueAtTime(3.8, now + 0.05);

    // 26 Hz LFO Tremolo / Vibrato for electric plasma sizzle
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(26, now + 0.05);
    lfoGain.gain.setValueAtTime(0.08, now + 0.05);

    laserGain.gain.setValueAtTime(0.01, now + 0.05);
    laserGain.gain.linearRampToValueAtTime(0.32, now + 0.12);
    laserGain.gain.setValueAtTime(0.3, now + 0.72);
    laserGain.gain.exponentialRampToValueAtTime(0.001, now + 1.02);

    lfo.connect(lfoGain);
    lfoGain.connect(laserGain.gain);

    laserOsc.connect(laserFilter);
    laserFilter.connect(laserGain);
    laserGain.connect(this.sfxGain);

    laserOsc.start(now + 0.05);
    lfo.start(now + 0.05);
    laserOsc.stop(now + 1.05);
    lfo.stop(now + 1.05);

    // 4. Shimmering High-Crystalline Harmonics
    const shimmerOsc = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmerOsc.type = 'triangle';
    shimmerOsc.frequency.setValueAtTime(1280, now + 0.06);
    shimmerOsc.frequency.linearRampToValueAtTime(1040, now + 0.95);
    shimmerGain.gain.setValueAtTime(0.18, now + 0.06);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain);
    shimmerOsc.start(now + 0.06);
    shimmerOsc.stop(now + 0.98);

    // 5. Sustained plasma hiss
    this.playNoiseBurst({
      duration: 0.85,
      gain: 0.12,
      filterType: 'bandpass',
      freqStart: 2200,
      freqEnd: 900,
      delay: 0.08,
    });
  }

  public playMageNova() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Cosmic sub-bass explosion
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.45);
    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.46);

    // 2. Astral celestial chord explosion
    const celestialChord = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    celestialChord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const startTime = now + idx * 0.025;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.8, startTime + 0.38);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.48);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });

    // 3. Cosmic stardust dispersion noise
    this.playNoiseBurst({
      duration: 0.42,
      gain: 0.35,
      filterType: 'highpass',
      freqStart: 1800,
      freqEnd: 4200,
    });
  }

  public playMageBlink() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Dimensional fold warp swoop
    const warp = this.ctx.createOscillator();
    const warpGain = this.ctx.createGain();
    warp.type = 'sine';
    warp.frequency.setValueAtTime(260, now);
    warp.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
    warp.frequency.exponentialRampToValueAtTime(440, now + 0.22);
    warpGain.gain.setValueAtTime(0.38, now);
    warpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    warp.connect(warpGain);
    warpGain.connect(this.sfxGain);
    warp.start(now);
    warp.stop(now + 0.23);

    // 2. Spatial tear sizzle
    this.playNoiseBurst({
      duration: 0.18,
      gain: 0.28,
      filterType: 'bandpass',
      freqStart: 4500,
      freqEnd: 800,
    });

    // 3. Arrival chime
    const arrivalChime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    arrivalChime.type = 'triangle';
    arrivalChime.frequency.setValueAtTime(1046.5, now + 0.08); // C6
    arrivalChime.frequency.exponentialRampToValueAtTime(1318.5, now + 0.25); // E6
    chimeGain.gain.setValueAtTime(0.25, now + 0.08);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    arrivalChime.connect(chimeGain);
    chimeGain.connect(this.sfxGain);
    arrivalChime.start(now + 0.08);
    arrivalChime.stop(now + 0.29);
  }

  public playMageCelestialHeal() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Angelic harp arpeggio: F4, A4, C5, E5, G5, C6
    const harpNotes = [349.23, 440, 523.25, 659.25, 783.99, 1046.5];
    harpNotes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.01, noteTime);
      gain.gain.linearRampToValueAtTime(0.28, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.58);
    });

    // Warm sub harmonic pad
    const pad = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    pad.type = 'triangle';
    pad.frequency.setValueAtTime(174.61, now);
    padGain.gain.setValueAtTime(0.01, now);
    padGain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    pad.connect(padGain);
    padGain.connect(this.sfxGain);
    pad.start(now);
    pad.stop(now + 0.68);
  }

  // --- ROGUE & HUNTER SOUNDS (Razor-Sharp, Rapid, Aerodynamic) ---
  public playRogueDoubleSlash(combo: 1 | 2 | 3 = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    if (combo === 3) {
      // Finisher: 360° Shadow Whirlwind double scissor slice
      this.playNoiseBurst({
        duration: 0.22,
        gain: 0.36,
        filterType: 'bandpass',
        freqStart: 4200,
        freqEnd: 480,
      });

      [0, 0.06].forEach((delay, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx === 0 ? 840 : 960, now + delay);
        osc.frequency.exponentialRampToValueAtTime(180, now + delay + 0.12);

        gain.gain.setValueAtTime(0.35, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + delay);
        osc.stop(now + delay + 0.13);
      });

      // Low shadow thud
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(120, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.21);
    } else {
      // Rapid dual dagger slashes with razor-sharp high frequency whoosh
      [0, 0.055].forEach((delay, idx) => {
        this.playNoiseBurst({
          duration: 0.1,
          gain: 0.28,
          filterType: 'highpass',
          freqStart: 2500,
          freqEnd: 5500,
          delay,
        });

        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx === 0 ? 880 : 1020, now + delay);
        osc.frequency.exponentialRampToValueAtTime(260, now + delay + 0.08);

        gain.gain.setValueAtTime(0.3, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + delay);
        osc.stop(now + delay + 0.09);
      });
    }
  }

  public playRogueShadowFlurry() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // 5 rapid-fire slashes with accelerating tempo
    const strikeDelays = [0, 0.06, 0.11, 0.15, 0.18];
    strikeDelays.forEach((delay, idx) => {
      const t = now + delay;

      this.playNoiseBurst({
        duration: 0.07,
        gain: 0.25,
        filterType: 'bandpass',
        freqStart: 3500 + idx * 300,
        freqEnd: 1200,
        delay,
      });

      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680 + idx * 120, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  public playRogueSmoke() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Canister pop
    const pop = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    pop.type = 'square';
    pop.frequency.setValueAtTime(220, now);
    pop.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    popGain.gain.setValueAtTime(0.35, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    pop.connect(popGain);
    popGain.connect(this.sfxGain);
    pop.start(now);
    pop.stop(now + 0.09);

    // 2. Prolonged pressurized gas hiss
    this.playNoiseBurst({
      duration: 0.38,
      gain: 0.35,
      filterType: 'lowpass',
      freqStart: 2800,
      freqEnd: 650,
    });

    // 3. Sinister shadow drone
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = 'triangle';
    drone.frequency.setValueAtTime(95, now);
    drone.frequency.exponentialRampToValueAtTime(45, now + 0.35);
    droneGain.gain.setValueAtTime(0.3, now);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    drone.connect(droneGain);
    droneGain.connect(this.sfxGain);
    drone.start(now);
    drone.stop(now + 0.36);
  }

  public playBowDraw() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(460, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBowShoot(isSkill = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Taut string snap (twang)
    const twang = this.ctx.createOscillator();
    const twangGain = this.ctx.createGain();
    twang.type = 'triangle';
    twang.frequency.setValueAtTime(isSkill ? 720 : 580, now);
    twang.frequency.exponentialRampToValueAtTime(120, now + 0.1);

    twangGain.gain.setValueAtTime(0.42, now);
    twangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    twang.connect(twangGain);
    twangGain.connect(this.sfxGain);
    twang.start(now);
    twang.stop(now + 0.11);

    // 2. Aerodynamic wind whistle whoosh
    this.playNoiseBurst({
      duration: isSkill ? 0.2 : 0.14,
      gain: isSkill ? 0.35 : 0.28,
      filterType: 'bandpass',
      freqStart: 4200,
      freqEnd: 950,
    });

    const whistle = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(isSkill ? 1400 : 1100, now);
    whistle.frequency.exponentialRampToValueAtTime(320, now + (isSkill ? 0.2 : 0.15));

    whistleGain.gain.setValueAtTime(0.28, now);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + (isSkill ? 0.2 : 0.15));

    whistle.connect(whistleGain);
    whistleGain.connect(this.sfxGain);
    whistle.start(now);
    whistle.stop(now + (isSkill ? 0.21 : 0.16));
  }

  public playArrowHit(isCrit = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Crisp projectile impact thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 480 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.1);

    gain.gain.setValueAtTime(isCrit ? 0.45 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);

    // 2. Sharp wood puncture snap
    this.playNoiseBurst({
      duration: 0.08,
      gain: isCrit ? 0.4 : 0.28,
      filterType: 'highpass',
      freqStart: 3500,
      freqEnd: 1500,
    });
  }

  public playHeavySkill() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Sub-bass seismic drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.38);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.39);

    // 2. Earth-shattering rumble noise
    this.playNoiseBurst({
      duration: 0.32,
      gain: 0.4,
      filterType: 'lowpass',
      freqStart: 1200,
      freqEnd: 120,
    });
  }

  public playMagic() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.28);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playDash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    this.playNoiseBurst({
      duration: 0.16,
      gain: 0.3,
      filterType: 'bandpass',
      freqStart: 1800,
      freqEnd: 350,
    });

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(540, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playHit(isCrit = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    if (isCrit) {
      // Critical Hit: Ultra punchy bass drop + crunchy glass/armor shatter + ringing metallic chime!
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(180, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.22);
      subGain.gain.setValueAtTime(0.55, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.23);

      // High glass/metal shatter ring
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(1240, now);
      chime.frequency.exponentialRampToValueAtTime(620, now + 0.25);
      chimeGain.gain.setValueAtTime(0.4, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chime.start(now);
      chime.stop(now + 0.26);

      this.playNoiseBurst({
        duration: 0.18,
        gain: 0.45,
        filterType: 'highpass',
        freqStart: 4000,
        freqEnd: 1500,
      });
    } else {
      // Normal hit: Solid body impact with crunchy noise transient + pitch drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.13);

      this.playNoiseBurst({
        duration: 0.08,
        gain: 0.28,
        filterType: 'bandpass',
        freqStart: 1600,
        freqEnd: 300,
      });
    }
  }

  public playEnemyDeath() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [260, 207.65, 164.81, 110];
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.19);
    });

    this.playNoiseBurst({
      duration: 0.35,
      gain: 0.3,
      filterType: 'lowpass',
      freqStart: 800,
      freqEnd: 80,
    });
  }

  public playLevelUp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    // Victory fanfare arpeggio: C4, E4, G4, B4, C5, E5
    const notes = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.42);
    });
  }

  public playChestOpen() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [440, 554.37, 659.25, 880];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playPotion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);
    osc.frequency.linearRampToValueAtTime(750, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public toggleAmbientMusic(start?: boolean) {
    this.initContext();
    if (!this.ctx || !this.musicGain) return;

    if (start === undefined) {
      this.isMusicPlaying = !this.isMusicPlaying;
    } else {
      this.isMusicPlaying = start;
    }

    if (!this.isMusicPlaying) {
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
      return;
    }

    // Fantasy ambient pentatonic chord progression
    const chordProgression = [
      [220, 261.63, 329.63, 392],    // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392, 523.25], // C
      [196, 246.94, 293.66, 392],    // G
    ];

    let chordIdx = 0;
    const playChord = () => {
      if (!this.ctx || !this.musicGain || this.isMuted || !this.isMusicPlaying) return;
      const notes = chordProgression[chordIdx % chordProgression.length];
      chordIdx++;

      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const noteTime = now + idx * 0.35;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(0.04, noteTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 2.4);

        osc.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(noteTime);
        osc.stop(noteTime + 2.5);
      });
    };

    playChord();
    this.musicInterval = setInterval(playChord, 3200);
  }

  public getMusicPlaying() {
    return this.isMusicPlaying;
  }


  // ==========================================
  // DYNAMIC BOSS BGM SYSTEM
  // ==========================================

  /**
   * Automatically triggered when boss encounter begins.
   * Plays Heavy Orchestral War BGM for Titan or Epic Choir Dragon BGM for Ignis.
   */
  public playBossMusic(bossType: 'titan' | 'dragon' | 'worm') {
    if (this.currentBossMusic === bossType) return;
    this.initContext();
    if (!this.ctx || !this.bossMusicGain) return;

    // Clear existing boss music loop if switching
    if (this.bossMusicInterval) {
      clearInterval(this.bossMusicInterval);
      this.bossMusicInterval = null;
    }

    this.currentBossMusic = bossType;
    this.bossStep = 0;

    // Smoothly duck overworld ambient music during boss encounter
    if (this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.04, now + 1.2);
    }

    // Bring up boss music volume
    const now = this.ctx.currentTime;
    this.bossMusicGain.gain.setValueAtTime(0.01, now);
    this.bossMusicGain.gain.linearRampToValueAtTime(0.36, now + 0.8);

    if (bossType === 'titan') {
      // 1. HEAVY ORCHESTRAL BATTLE BGM (Obsidian Ancient Titan)
      // Heavy 75 BPM War March: Thundering taiko war drums, punchy sub-bass hits, & menacing low brass stabs
      const playTitanStep = () => {
        if (!this.ctx || !this.bossMusicGain || this.isMuted || this.currentBossMusic !== 'titan') return;
        const tNow = this.ctx.currentTime;
        const s = this.bossStep % 4;
        this.bossStep++;

        // Heavy Taiko War Drum Kick (on beats 0 and 2)
        if (s === 0 || s === 2) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, tNow);
          osc.frequency.exponentialRampToValueAtTime(34, tNow + 0.38);
          gain.gain.setValueAtTime(0.55, tNow);
          gain.gain.exponentialRampToValueAtTime(0.001, tNow + 0.42);
          osc.connect(gain);
          gain.connect(this.bossMusicGain!);
          osc.start(tNow);
          osc.stop(tNow + 0.45);

          this.playNoiseBurst({
            duration: 0.28,
            gain: 0.35,
            filterType: 'lowpass',
            freqStart: 650,
            freqEnd: 60,
          });
        }

        // Heavy Metallic Anvil / Rimshot Snare (on beats 1 and 3)
        if (s === 1 || s === 3) {
          this.playNoiseBurst({
            duration: 0.22,
            gain: 0.32,
            filterType: 'bandpass',
            freqStart: 2400,
            freqEnd: 380,
          });

          const ring = this.ctx.createOscillator();
          const ringGain = this.ctx.createGain();
          ring.type = 'triangle';
          ring.frequency.setValueAtTime(940, tNow);
          ring.frequency.exponentialRampToValueAtTime(260, tNow + 0.28);
          ringGain.gain.setValueAtTime(0.28, tNow);
          ringGain.gain.exponentialRampToValueAtTime(0.001, tNow + 0.28);
          ring.connect(ringGain);
          ringGain.connect(this.bossMusicGain!);
          ring.start(tNow);
          ring.stop(tNow + 0.3);
        }

        // Menacing Low Brass Horn Power Chords (D-minor / Bb-major / C-major / A-minor progression)
        const chordIndex = Math.floor((this.bossStep / 4) % 4);
        const brassChords = [
          [73.42, 110.0, 146.83],  // D2 power chord
          [58.27, 87.31, 116.54],  // Bb1 power chord
          [65.41, 98.0, 130.81],   // C2 power chord
          [55.0, 82.41, 110.0],    // A1 power chord
        ];
        const chord = brassChords[chordIndex];

        if (s === 0) {
          chord.forEach((freq, idx) => {
            const horn = this.ctx!.createOscillator();
            const hornGain = this.ctx!.createGain();
            horn.type = idx === 0 ? 'sawtooth' : 'triangle';
            horn.frequency.setValueAtTime(freq, tNow);
            hornGain.gain.setValueAtTime(0.001, tNow);
            hornGain.gain.linearRampToValueAtTime(0.18, tNow + 0.1);
            hornGain.gain.exponentialRampToValueAtTime(0.001, tNow + 1.4);
            horn.connect(hornGain);
            hornGain.connect(this.bossMusicGain!);
            horn.start(tNow);
            horn.stop(tNow + 1.45);
          });
        }
      };

      playTitanStep();
      this.bossMusicInterval = setInterval(playTitanStep, 800); // 75 BPM 4/4
    } else if (bossType === 'dragon') {
      // 2. EPIC CHOIR DRAGON BATTLE BGM (Ignis Primal Dragon)
      // Furious 132 BPM Battle Tempo: Fast driving double-kick galloping drums, synthesized epic choir pads, & brass fanfare
      const playDragonStep = () => {
        if (!this.ctx || !this.bossMusicGain || this.isMuted || this.currentBossMusic !== 'dragon') return;
        const tNow = this.ctx.currentTime;
        const s = this.bossStep % 8;
        this.bossStep++;

        // Galloping Double-Kick War Drums on every step
        const kick = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(155, tNow);
        kick.frequency.exponentialRampToValueAtTime(42, tNow + 0.22);
        kickGain.gain.setValueAtTime(0.5, tNow);
        kickGain.gain.exponentialRampToValueAtTime(0.001, tNow + 0.24);
        kick.connect(kickGain);
        kickGain.connect(this.bossMusicGain!);
        kick.start(tNow);
        kick.stop(tNow + 0.25);

        // Dragon fire burst sizzle on syncopated beats
        if (s % 2 === 1) {
          this.playNoiseBurst({
            duration: 0.14,
            gain: 0.22,
            filterType: 'bandpass',
            freqStart: 3200,
            freqEnd: 700,
          });
        }

        // Synthesized Epic Vocal Choir Pads (E-minor, C-major, A-minor, B7-dominant)
        const chordIndex = Math.floor((this.bossStep / 8) % 4);
        const choirChords = [
          [164.81, 196.0, 246.94, 329.63], // Em
          [130.81, 164.81, 196.0, 261.63], // C
          [110.0, 164.81, 220.0, 261.63],  // Am
          [123.47, 155.56, 184.99, 246.94],// B7
        ];
        const chord = choirChords[chordIndex];

        if (s === 0) {
          chord.forEach((freq, idx) => {
            // Choir formant 1 (Ah / Oh vowel fundamental)
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = idx % 2 === 0 ? 'sine' : 'sawtooth';
            osc.frequency.setValueAtTime(freq, tNow);
            gain.gain.setValueAtTime(0.001, tNow);
            gain.gain.linearRampToValueAtTime(0.14, tNow + 0.35);
            gain.gain.exponentialRampToValueAtTime(0.001, tNow + 3.2);
            osc.connect(gain);
            gain.connect(this.bossMusicGain!);
            osc.start(tNow);
            osc.stop(tNow + 3.3);

            // Harmonic Choir Shimmer (High formant octave)
            const shimmer = this.ctx!.createOscillator();
            const sGain = this.ctx!.createGain();
            shimmer.type = 'triangle';
            shimmer.frequency.setValueAtTime(freq * 2.0, tNow + 0.1);
            sGain.gain.setValueAtTime(0.001, tNow + 0.1);
            sGain.gain.linearRampToValueAtTime(0.08, tNow + 0.4);
            sGain.gain.exponentialRampToValueAtTime(0.001, tNow + 2.8);
            shimmer.connect(sGain);
            sGain.connect(this.bossMusicGain!);
            shimmer.start(tNow + 0.1);
            shimmer.stop(tNow + 2.9);
          });
        }
      };

      playDragonStep();
      this.bossMusicInterval = setInterval(playDragonStep, 450); // 132 BPM
    } else if (bossType === 'worm') {
      // 3. INTENSE DESERT TRIBAL WAR DRUM BGM (Jarrus, Sang Cacing Purba Solaria)
      // Driving 120 BPM tempo: syncopated Middle-Eastern darbuka / djembe tribal drums,
      // rattlesnake sand hisses, and menacing Phrygian dominant desert string / brass stabs
      const playWormStep = () => {
        if (!this.ctx || !this.bossMusicGain || this.isMuted || this.currentBossMusic !== 'worm') return;
        const tNow = this.ctx.currentTime;
        const s = this.bossStep % 8;
        this.bossStep++;

        // Low-tuned Subterranean Tribal Darbuka / Djembe Kick (beats 0, 3, 5)
        if (s === 0 || s === 3 || s === 5) {
          const drum = this.ctx.createOscillator();
          const dGain = this.ctx.createGain();
          drum.type = 'triangle';
          const startF = s === 0 ? 165 : 125;
          drum.frequency.setValueAtTime(startF, tNow);
          drum.frequency.exponentialRampToValueAtTime(38, tNow + 0.32);
          dGain.gain.setValueAtTime(0.55, tNow);
          dGain.gain.exponentialRampToValueAtTime(0.001, tNow + 0.35);
          drum.connect(dGain);
          dGain.connect(this.bossMusicGain!);
          drum.start(tNow);
          drum.stop(tNow + 0.36);

          this.playNoiseBurst({
            duration: 0.2,
            gain: 0.28,
            filterType: 'lowpass',
            freqStart: 450,
            freqEnd: 80,
          });
        }

        // Desert Rattlesnake & Shaker Accent (syncopated off-beats 1, 2, 4, 7)
        if (s === 1 || s === 2 || s === 4 || s === 7) {
          this.playNoiseBurst({
            duration: 0.12,
            gain: 0.24,
            filterType: 'highpass',
            freqStart: 4500,
            freqEnd: 2200,
          });
        }

        // Menacing Phrygian Dominant Desert Synth Stabs (D, Eb, F#, G, A, Bb)
        const chordIndex = Math.floor((this.bossStep / 8) % 4);
        const desertChords = [
          [146.83, 185.0, 220.0],  // D major (Phrygian tonic with F#)
          [155.56, 196.0, 233.08], // Eb major (Phrygian bII)
          [146.83, 174.61, 220.0], // D minor
          [130.81, 164.81, 196.0], // C minor
        ];
        const chord = desertChords[chordIndex];

        if (s === 0 || s === 4) {
          chord.forEach((freq, idx) => {
            const stab = this.ctx!.createOscillator();
            const sGain = this.ctx!.createGain();
            stab.type = idx === 0 ? 'sawtooth' : 'triangle';
            stab.frequency.setValueAtTime(freq, tNow);
            sGain.gain.setValueAtTime(0.001, tNow);
            sGain.gain.linearRampToValueAtTime(0.16, tNow + 0.05);
            sGain.gain.exponentialRampToValueAtTime(0.001, tNow + 0.65);
            stab.connect(sGain);
            sGain.connect(this.bossMusicGain!);
            stab.start(tNow);
            stab.stop(tNow + 0.7);
          });
        }
      };

      playWormStep();
      this.bossMusicInterval = setInterval(playWormStep, 500); // 120 BPM
    }
  }

  /**
   * Smoothly stops Boss BGM and restores overworld ambient music.
   */
  public stopBossMusic() {
    if (!this.currentBossMusic) return;
    this.currentBossMusic = null;

    if (this.bossMusicInterval) {
      clearInterval(this.bossMusicInterval);
      this.bossMusicInterval = null;
    }

    // Fade out boss music smoothly
    if (this.ctx && this.bossMusicGain) {
      const now = this.ctx.currentTime;
      this.bossMusicGain.gain.setValueAtTime(this.bossMusicGain.gain.value, now);
      this.bossMusicGain.gain.linearRampToValueAtTime(0.001, now + 1.2);
    }

    // Restore overworld ambient music
    if (this.ctx && this.musicGain && this.isMusicPlaying) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.3, now + 1.5);
    }
  }

  public playBossBGM(bossType: 'titan' | 'dragon' | 'worm') {
    return this.playBossMusic(bossType);
  }

  public getCurrentBossMusic(): 'titan' | 'dragon' | 'worm' | null {
    return this.currentBossMusic;
  }


  // Sandworm Burrow, Burst Out & Acid Spit SFX
  public playWormBurrow() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const rumble = this.ctx.createOscillator();
    const rGain = this.ctx.createGain();
    rumble.type = 'triangle';
    rumble.frequency.setValueAtTime(70, now);
    rumble.frequency.linearRampToValueAtTime(32, now + 1.2);
    rGain.gain.setValueAtTime(0.4, now);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    rumble.connect(rGain);
    rGain.connect(this.sfxGain);
    rumble.start(now);
    rumble.stop(now + 1.25);
    this.playNoiseBurst({ duration: 1.0, gain: 0.35, filterType: 'lowpass', freqStart: 380, freqEnd: 80 });
  }

  public playWormBurstOut() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.85);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.95);
    this.playNoiseBurst({ duration: 0.65, gain: 0.5, filterType: 'bandpass', freqStart: 1800, freqEnd: 120 });
  }

  public playWormAcidSpit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.35);
    osc.frequency.linearRampToValueAtTime(400, now + 0.7);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.8);
    this.playNoiseBurst({ duration: 0.75, gain: 0.42, filterType: 'highpass', freqStart: 1800, freqEnd: 3200 });
  }

  // Checkpoint Waypoint Unlock Chime
  public playCheckpointUnlock() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const chimeFrequencies = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
    chimeFrequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 1.25);
    });
  }

  // Primal Dragon Ignis Roar
  public playDragonRoar() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(65, now);
    subOsc.frequency.exponentialRampToValueAtTime(140, now + 0.4);
    subOsc.frequency.exponentialRampToValueAtTime(50, now + 1.5);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.4, now + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 1.65);

    this.playNoiseBurst({
      duration: 1.5,
      gain: 0.35,
      filterType: 'bandpass',
      freqStart: 450,
      freqEnd: 180,
    });
  }

  // Dragon Fire Breath Flamethrower
  public playDragonFireBreath() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    this.playNoiseBurst({
      duration: 1.8,
      gain: 0.32,
      filterType: 'lowpass',
      freqStart: 850,
      freqEnd: 280,
    });

    const fireOsc = this.ctx.createOscillator();
    const fireGain = this.ctx.createGain();
    fireOsc.type = 'triangle';
    fireOsc.frequency.setValueAtTime(110, now);
    fireOsc.frequency.linearRampToValueAtTime(75, now + 1.8);

    fireGain.gain.setValueAtTime(0.001, now);
    fireGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    fireGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    fireOsc.connect(fireGain);
    fireGain.connect(this.sfxGain);
    fireOsc.start(now);
    fireOsc.stop(now + 1.85);
  }

  // Meteor Strike Impact Explosion
  public playMeteorImpact() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.7);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.95);

    this.playNoiseBurst({
      duration: 0.8,
      gain: 0.45,
      filterType: 'lowpass',
      freqStart: 600,
      freqEnd: 70,
    });
  }

  // Ancient Titan Colossal Ground Slam
  public playTitanGroundSlam() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.8);

    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.9);

    this.playNoiseBurst({
      duration: 0.7,
      gain: 0.38,
      filterType: 'bandpass',
      freqStart: 380,
      freqEnd: 60,
    });
  }
}

export const soundManager = new SoundManager();
