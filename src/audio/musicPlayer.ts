import { AudioManager } from './audioManager';
import { AudioEvent, SOUND_MANIFEST } from './audioEvents';

const CROSSFADE_DURATION = 1; // seconds

/**
 * Handles music playback with crossfading between tracks.
 *
 * Only one music track plays at a time. Calling play() while a track is
 * already playing crossfades: the old track ramps to 0 over 1 s while the
 * new track ramps from 0 to its target volume over 1 s.
 */
export class MusicPlayer {
  private manager: AudioManager;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private currentEvent: AudioEvent | null = null;

  constructor(manager: AudioManager) {
    this.manager = manager;
  }

  /** Play a music track, crossfading from any currently playing track. */
  async play(event: AudioEvent): Promise<void> {
    if (event === this.currentEvent) return;

    const def = SOUND_MANIFEST[event];
    const ctx = this.manager.getContext();
    const buffer = await this.manager.loadBuffer(def.paths[0]);
    const now = ctx.currentTime;

    // Fade out the current track
    if (this.currentSource && this.currentGain) {
      const oldGain = this.currentGain;
      const oldSource = this.currentSource;
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);
      // Stop and disconnect after fade completes
      setTimeout(() => {
        oldSource.stop();
        oldSource.disconnect();
        oldGain.disconnect();
      }, CROSSFADE_DURATION * 1000 + 50);
    }

    // Create new source → per-track gain → music bus
    const gainNode = ctx.createGain();
    gainNode.connect(this.manager.getMusicGain());
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(def.volume, now + CROSSFADE_DURATION);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = def.loop;
    source.connect(gainNode);
    source.start(0);

    this.currentSource = source;
    this.currentGain = gainNode;
    this.currentEvent = event;
  }

  /** Stop the current music track with a fade-out. */
  stop(fadeDuration: number = CROSSFADE_DURATION): void {
    if (!this.currentSource || !this.currentGain) return;

    const ctx = this.manager.getContext();
    const now = ctx.currentTime;
    const oldGain = this.currentGain;
    const oldSource = this.currentSource;

    oldGain.gain.setValueAtTime(oldGain.gain.value, now);
    oldGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

    setTimeout(() => {
      oldSource.stop();
      oldSource.disconnect();
      oldGain.disconnect();
    }, fadeDuration * 1000 + 50);

    this.currentSource = null;
    this.currentGain = null;
    this.currentEvent = null;
  }

  /** Return the appropriate exploration music track for a given floor number. */
  getTrackForFloor(floor: number): AudioEvent {
    if (floor <= 3) return AudioEvent.MUSIC_FLOORS_1_3;
    if (floor <= 6) return AudioEvent.MUSIC_FLOORS_4_6;
    return AudioEvent.MUSIC_FLOORS_7_PLUS;
  }

  dispose(): void {
    this.stop(0);
  }
}
