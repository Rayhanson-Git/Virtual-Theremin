import * as Tone from 'tone';
import { DrumHit } from './gestures';

// CR-78 drum machine samples from the Tone.js example library. "Clap" plays the
// CR-78's third tom, which is how the instrument has always sounded.
export const SAMPLE_URLS: Record<DrumHit, string> = {
  kick: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3',
  snare: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
  hihat: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
  clap: 'https://tonejs.github.io/audio/drum-samples/CR78/tom3.mp3',
};

const LOAD_TIMEOUT_MS = 15000;

export type DrumStatus = 'loading' | 'ready' | 'partial' | 'failed';

export class DrumSynthesisService {
  private players: Map<DrumHit, Tone.Player> = new Map();
  private masterGain: Tone.Gain | null = null;
  private status: DrumStatus = 'loading';

  /**
   * Loads the four samples. Never throws: if some or all of them fail to load
   * (offline, blocked host), the rest of the instrument keeps working and
   * getStatus() says what happened.
   */
  async initialize(): Promise<DrumStatus> {
    await Tone.start();

    this.masterGain = new Tone.Gain(0.9).toDestination();

    const loads = (Object.entries(SAMPLE_URLS) as [DrumHit, string][]).map(
      ([drum, url]) =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`Timed out loading ${url}`)), LOAD_TIMEOUT_MS);
          const player = new Tone.Player({
            url,
            onload: () => {
              clearTimeout(timer);
              resolve();
            },
            onerror: (error) => {
              clearTimeout(timer);
              reject(error);
            },
          }).connect(this.masterGain!);
          this.players.set(drum, player);
        })
    );

    const results = await Promise.allSettled(loads);
    const failed = results.filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.warn('Drum sample failed to load:', (r as PromiseRejectedResult).reason));
    this.status = failed.length === 0 ? 'ready' : failed.length === results.length ? 'failed' : 'partial';
    return this.status;
  }

  getStatus(): DrumStatus {
    return this.status;
  }

  /** Plays a drum now, or at a Tone.js time (used by the looper). */
  trigger(hit: DrumHit, time?: number): void {
    const player = this.players.get(hit);
    if (player?.loaded) {
      player.stop(time);
      player.start(time);
    }
  }

  destroy(): void {
    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();
    this.masterGain?.dispose();
    this.masterGain = null;
    this.status = 'loading';
  }
}
