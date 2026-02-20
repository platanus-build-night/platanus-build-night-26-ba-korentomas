/**
 * Central audio manager owning the Web Audio API context and gain routing.
 *
 * Gain chain: source → per-channel gain (music | sfx) → master gain → destination
 */
export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode;
  private sfxGain: GainNode;
  private bufferCache: Map<string, AudioBuffer> = new Map();

  constructor() {
    this.ctx = new AudioContext();

    // Master gain → destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    // Music gain → master
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);

    // SFX gain → master
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
  }

  /** Load a WAV file and cache the decoded AudioBuffer. */
  async loadBuffer(path: string): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(path);
    if (cached) return cached;

    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(path, audioBuffer);
    return audioBuffer;
  }

  /** Resume suspended AudioContext (required after first user gesture). */
  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  getContext(): AudioContext {
    return this.ctx;
  }

  getMusicGain(): GainNode {
    return this.musicGain;
  }

  getSfxGain(): GainNode {
    return this.sfxGain;
  }

  /** Set music channel volume (0-1). */
  setMusicVolume(v: number): void {
    this.musicGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime,
    );
  }

  /** Set SFX channel volume (0-1). */
  setSfxVolume(v: number): void {
    this.sfxGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime,
    );
  }

  dispose(): void {
    this.bufferCache.clear();
    void this.ctx.close();
  }
}
