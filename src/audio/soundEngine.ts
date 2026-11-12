/**
 * Procedural Web Audio Engine for Velocity Horizon
 * Zero external audio files: Synthesizes engine RPM, turbo boost, tire skids,
 * collisions, stunt chimes, and an in-car generative Synthwave radio.
 */

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.7;
  private radioVolume: number = 0.4;

  // Master Gain Nodes
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private radioGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineStarted: boolean = false;

  // Tire Skid nodes
  private skidNode: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  // Nitro Hiss
  private nitroGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;
  private nitroNoise: AudioBufferSourceNode | null = null;

  // Radio Sequencer
  private radioInterval: number | null = null;
  private currentRadioStation: number = 0; // 0 = chillwave, 1 = cyber electro, 2 = outrun, -1 = off
  private radioStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      // SFX
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      // Radio
      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = this.radioVolume;
      this.radioGain.connect(this.masterGain);

      this.setupEngineSound();
      this.setupSkidSound();
      this.setupNitroSound();
      this.startRadio();
    } catch {
      // Audio not supported or blocked
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupEngineSound() {
    if (!this.ctx || !this.sfxGain) return;

    // Sub rumble
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 40;

    // Primary firing stroke
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 75;

    // Cylinder harmonic whine
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.value = 150;

    // Resonant lowpass
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 350;
    this.engineFilter.Q.value = 4.0;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.25;

    this.engineSubOsc.connect(this.engineFilter);
    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineSubOsc.start();
    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineStarted = true;
  }

  private createNoiseBuffer(duration = 2): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private setupSkidSound() {
    if (!this.ctx || !this.sfxGain) return;
    const noiseBuffer = this.createNoiseBuffer(2);
    if (!noiseBuffer) return;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1000;
    this.skidFilter.Q.value = 2.5;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0.0;

    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.sfxGain);

    const loopSkid = () => {
      if (!this.ctx || !this.skidFilter) return;
      this.skidNode = this.ctx.createBufferSource();
      this.skidNode.buffer = noiseBuffer;
      this.skidNode.loop = true;
      this.skidNode.connect(this.skidFilter);
      this.skidNode.start();
    };
    loopSkid();
  }

  private setupNitroSound() {
    if (!this.ctx || !this.sfxGain) return;
    const noiseBuffer = this.createNoiseBuffer(2);
    if (!noiseBuffer) return;

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = 'highpass';
    this.nitroFilter.frequency.value = 1200;

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.value = 0.0;

    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxGain);

    this.nitroNoise = this.ctx.createBufferSource();
    this.nitroNoise.buffer = noiseBuffer;
    this.nitroNoise.loop = true;
    this.nitroNoise.connect(this.nitroFilter);
    this.nitroNoise.start();
  }

  /**
   * Update dynamic engine sound in real time based on RPM and throttle
   */
  public updateEngine(rpmRatio: number, throttle: boolean, gear: number) {
    if (!this.ctx || !this.engineStarted) return;
    const now = this.ctx.currentTime;
    const baseFreq = 45 + rpmRatio * 180 + (gear - 1) * 8;

    if (this.engineOsc1) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    }
    if (this.engineOsc2) {
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.05, now, 0.04);
    }
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    }
    if (this.engineFilter) {
      const filterCutoff = throttle ? 400 + rpmRatio * 1600 : 250 + rpmRatio * 600;
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.05);
    }
    if (this.engineGain) {
      const targetGain = 0.18 + rpmRatio * 0.25 + (throttle ? 0.08 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }
  }

  /**
   * Update tire skid intensity (0 to 1)
   */
  public updateSkid(intensity: number) {
    if (!this.ctx || !this.skidGain || !this.skidFilter) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    const now = this.ctx.currentTime;
    this.skidGain.gain.setTargetAtTime(clamped * 0.45, now, 0.05);
    this.skidFilter.frequency.setTargetAtTime(800 + clamped * 1200, now, 0.05);
  }

  /**
   * Update nitro flame / whoosh sound
   */
  public updateNitro(active: boolean) {
    if (!this.ctx || !this.nitroGain) return;
    const now = this.ctx.currentTime;
    this.nitroGain.gain.setTargetAtTime(active ? 0.4 : 0.0, now, 0.05);
  }

  /**
   * Impact sound on rough landing or collision
   */
  public playImpact(force: number) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    const volume = Math.min(0.6, force * 0.35);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Celebratory chime when hitting a checkpoint or speed trap
   */
  public playChime(isSpeedTrap = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = isSpeedTrap ? [587.33, 880, 1174.66] : [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.18, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.35);
    });
  }

  // ----------------------------------------------------
  // PROCEDURAL SYNTHWAVE RADIO
  // Generates real-time retro 80s synth chords & bass arpeggio
  // ----------------------------------------------------
  public setRadioStation(stationIndex: number) {
    this.currentRadioStation = stationIndex;
    if (stationIndex === -1) {
      if (this.radioGain && this.ctx) {
        this.radioGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    } else {
      if (this.radioGain && this.ctx) {
        this.radioGain.gain.setTargetAtTime(this.radioVolume, this.ctx.currentTime, 0.1);
      }
    }
  }

  public getRadioStation(): number {
    return this.currentRadioStation;
  }

  private startRadio() {
    if (this.radioInterval) clearInterval(this.radioInterval);

    // Chords scales for Synthwave (A minor / F major / C major / G major)
    const chords = [
      [220, 261.63, 329.63, 440], // Am
      [174.61, 220, 261.63, 349.23], // F
      [130.81, 164.81, 196, 261.63], // C
      [196, 246.94, 293.66, 392], // G
    ];

    const bassNotes = [110, 87.31, 65.41, 98];

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || this.currentRadioStation === -1 || this.isMuted) return;

      const chordIdx = Math.floor(this.radioStep / 8) % chords.length;
      const currentChord = chords[chordIdx];
      const noteInChord = currentChord[this.radioStep % currentChord.length];
      const now = this.ctx.currentTime;

      // Bass pulse
      if (this.radioStep % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = this.currentRadioStation === 1 ? 'sawtooth' : 'triangle';
        bassOsc.frequency.setValueAtTime(bassNotes[chordIdx], now);

        bassGain.gain.setValueAtTime(0.16, now);
        bassGain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = this.currentRadioStation === 1 ? 500 : 300;

        bassOsc.connect(filter);
        filter.connect(bassGain);
        if (this.radioGain) bassGain.connect(this.radioGain);

        bassOsc.start(now);
        bassOsc.stop(now + 0.2);
      }

      // Arpeggiated synth lead
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = this.currentRadioStation === 1 ? 'square' : 'sine';
      leadOsc.frequency.setValueAtTime(noteInChord * (this.currentRadioStation === 2 ? 1.5 : 1.0), now);

      leadGain.gain.setValueAtTime(0.08, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      leadOsc.connect(leadGain);
      if (this.radioGain) leadGain.connect(this.radioGain);

      leadOsc.start(now);
      leadOsc.stop(now + 0.23);

      this.radioStep = (this.radioStep + 1) % 32;
    }, 140); // ~107 BPM 16th notes
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const soundEngine = new ProceduralSoundEngine();
