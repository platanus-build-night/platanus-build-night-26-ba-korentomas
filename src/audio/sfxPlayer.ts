import { AudioManager } from './audioManager';
import { AudioEvent, SOUND_MANIFEST } from './audioEvents';

/**
 * Plays one-shot sound effects, picking a random variant when multiple
 * paths are available (footsteps, hurt sounds, etc.).
 *
 * Each play() creates a fresh AudioBufferSourceNode that auto-disconnects
 * after playback finishes.
 */
export class SfxPlayer {
  private manager: AudioManager;

  constructor(manager: AudioManager) {
    this.manager = manager;
  }

  /** Play a one-shot SFX. Picks a random variant if the sound has multiple paths. */
  async play(event: AudioEvent): Promise<void> {
    const def = SOUND_MANIFEST[event];
    const path = def.paths[Math.floor(Math.random() * def.paths.length)];
    const buffer = await this.manager.loadBuffer(path);
    const ctx = this.manager.getContext();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(def.volume, ctx.currentTime);
    gainNode.connect(this.manager.getSfxGain());

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = def.loop;
    source.connect(gainNode);

    // Auto-cleanup when the source finishes (one-shots only)
    if (!def.loop) {
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    }

    source.start(0);
  }

  /** Preload buffers for latency-critical sounds so play() is instant. */
  async preload(events: AudioEvent[]): Promise<void> {
    const loads: Promise<unknown>[] = [];
    for (const event of events) {
      for (const path of SOUND_MANIFEST[event].paths) {
        loads.push(this.manager.loadBuffer(path));
      }
    }
    await Promise.all(loads);
  }
}
