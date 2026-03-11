import * as Tone from 'tone';
import { DrumHit } from './handTracking';

const SAMPLE_URLS: Record<DrumHit, string> = {
  kick: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3',
  snare: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
  hihat: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
  clap: 'https://tonejs.github.io/audio/drum-samples/CR78/tom3.mp3',
};

export class DrumSynthesisService {
  private players: Map<DrumHit, Tone.Player> = new Map();
  private masterGain: Tone.Gain | null = null;
  private loaded = false;

  async initialize(): Promise<void> {
    await Tone.start();

    this.masterGain = new Tone.Gain(0.9).toDestination();

    const loadPromises: Promise<void>[] = [];

    for (const [drum, url] of Object.entries(SAMPLE_URLS) as [DrumHit, string][]) {
      const player = new Tone.Player({ url }).connect(this.masterGain);
      this.players.set(drum, player);
      loadPromises.push(Tone.loaded());
    }

    await Promise.all(loadPromises);
    this.loaded = true;
  }

  trigger(hit: DrumHit): void {
    if (!this.loaded) return;
    const player = this.players.get(hit);
    if (player?.loaded) {
      player.stop();
      player.start();
    }
  }

  destroy(): void {
    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();
    this.masterGain?.dispose();
    this.masterGain = null;
    this.loaded = false;
  }
}
