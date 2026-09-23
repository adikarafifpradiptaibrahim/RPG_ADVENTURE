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

      // Sub-bass impact
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.24);
      subGain.gain.setValueAtTime(0.48, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);
      subOsc.start(now);
      subOsc.stop(now + 0.25);

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

  // --- MAGE SOUNDS (Crystalline, Astral, Ethereal) ---
  public playMageBolt() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. High-frequency crystalline FM chirp
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.22);
    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);

    // 2. Crystalline sparkle harmonics
    const crystal = this.ctx.createOscillator();
    const crystalGain = this.ctx.createGain();
    crystal.type = 'triangle';
    crystal.frequency.setValueAtTime(1760, now);
    crystal.frequency.exponentialRampToValueAtTime(520, now + 0.16);
    crystalGain.gain.setValueAtTime(0.25, now);
    crystalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    crystal.connect(crystalGain);
    crystalGain.connect(this.sfxGain);
    crystal.start(now);
    crystal.stop(now + 0.17);

    // 3. Arcane discharge plasma whoosh
    this.playNoiseBurst({
      duration: 0.15,
      gain: 0.22,
      filterType: 'bandpass',
      freqStart: 3200,
      freqEnd: 600,
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
}

export const soundManager = new SoundManager();
