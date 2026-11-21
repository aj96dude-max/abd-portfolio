export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private humOscA: OscillatorNode | null = null;
  private humOscB: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private unlocked = false;
  private muted = false;
  private lastTickMs = 0;

  isUnlocked(): boolean {
    return this.unlocked;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.35,
        this.ctx.currentTime,
        0.04,
      );
    }
  }

  unlock(): void {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
      this.masterGain.connect(this.ctx.destination);

      // 0.25s white noise buffer for tactile mechanical micro-clicks.
      const len = Math.floor(this.ctx.sampleRate * 0.25);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;

      // Subtle sub-harmonic compute hum unlocked once; gain defaults to 0.
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 210;

      this.humGain = this.ctx.createGain();
      this.humGain.gain.value = 0;

      this.humOscA = this.ctx.createOscillator();
      this.humOscA.type = "sine";
      this.humOscA.frequency.value = 66;

      this.humOscB = this.ctx.createOscillator();
      this.humOscB.type = "triangle";
      this.humOscB.frequency.value = 132.4;

      this.humOscA.connect(filter);
      this.humOscB.connect(filter);
      filter.connect(this.humGain);
      this.humGain.connect(this.masterGain);

      this.humOscA.start();
      this.humOscB.start();
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this.unlocked = true;
  }

  playTick(pitchHz = 1150, intensity = 0.08): void {
    if (!this.unlocked || this.muted || !this.ctx || !this.masterGain) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTickMs < 42) return;
    this.lastTickMs = nowMs;

    const t = this.ctx.currentTime;

    // Short filtered noise burst (mechanical detent).
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(pitchHz * 1.6, t);
      bp.Q.value = 4.5;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(intensity * 0.55, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(t);
      src.stop(t + 0.036);
    }

    // Crisp resonant click oscillator.
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(pitchHz, t);
    osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.55, t + 0.028);

    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(intensity * 0.45, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.034);
  }

  playPowerLock(powered: boolean): void {
    if (!this.unlocked || this.muted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const notes = powered ? [440, 660, 880] : [520, 340];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = t + idx * 0.045;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.09, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  updateChargeHum(charge: number, powered: boolean): void {
    if (!this.unlocked || !this.ctx || !this.humGain || !this.humOscA || !this.humOscB) {
      return;
    }
    const t = this.ctx.currentTime;
    const baseLevel = powered ? 0.032 : 0.0;
    const activeGain = this.muted ? 0 : Math.max(baseLevel, charge * 0.07);
    const freqShift = 66 + charge * 54 + (powered ? 18 : 0);

    this.humGain.gain.setTargetAtTime(activeGain, t, 0.06);
    this.humOscA.frequency.setTargetAtTime(freqShift, t, 0.08);
    this.humOscB.frequency.setTargetAtTime(freqShift * 2.01, t, 0.08);
  }

  dispose(): void {
    try {
      this.humOscA?.stop();
      this.humOscB?.stop();
      this.humOscA?.disconnect();
      this.humOscB?.disconnect();
      this.humGain?.disconnect();
      this.masterGain?.disconnect();
      if (this.ctx && this.ctx.state !== "closed") {
        void this.ctx.close();
      }
    } catch {
      // Ignore cleanup exceptions on already-closed contexts.
    }
    this.ctx = null;
    this.noiseBuffer = null;
    this.unlocked = false;
  }
}

