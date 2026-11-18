import * as Tone from 'tone';
import type { DrumHit } from './gestures';
import { DEFAULT_BPM, PatternHit, STEPS, addHit, barSeconds, clampBpm, positionInBar } from './pattern';

export type LooperState = 'empty' | 'count-in' | 'recording' | 'playing' | 'stopped';

export interface RhythmSnapshot {
  state: LooperState;
  bpm: number;
  metronome: boolean;
  quantise: boolean;
  pattern: PatternHit[];
  /** Current sixteenth while the transport runs, or -1. */
  step: number;
}

/**
 * Tempo, metronome and a one-bar drum looper on Tone's transport.
 *
 * Recording: press Record, hear one bar of count-in clicks, then every drum you
 * play in the next bar is written into the loop (snapped to sixteenths when
 * quantise is on). The bar then loops; press Record again to overdub.
 */
export class RhythmService {
  private bpm = DEFAULT_BPM;
  private metronome = false;
  private quantise = true;
  private state: LooperState = 'empty';
  private pattern: PatternHit[] = [];
  /** The bar that will be (or is being) recorded. */
  private recordBar = 0;
  private click: Tone.Synth | null = null;
  private clickGain: Tone.Gain | null = null;
  private stepEvent: number | null = null;
  private currentStep = -1;
  private listeners = new Set<() => void>();

  constructor(private play: (hit: DrumHit, time?: number) => void) {}

  initialize(): void {
    const transport = Tone.getTransport();
    transport.bpm.value = this.bpm;
    this.clickGain = new Tone.Gain(0.25).toDestination();
    this.click = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    }).connect(this.clickGain);

    // One callback per sixteenth: metronome, loop playback, count-in and the
    // end of a recording all hang off it.
    this.stepEvent = transport.scheduleRepeat((time) => {
      const step = Math.round(transport.getTicksAtTime(time) / (transport.PPQ / 4)) % STEPS;
      this.onStep(step, time);
    }, '16n');
  }

  private barAt(time?: number): number {
    const transport = Tone.getTransport();
    const ticks = time === undefined ? transport.ticks : transport.getTicksAtTime(time);
    // Round to the nearest sixteenth first: at a downbeat the tick count can come
    // back a hair under the bar line, which would put it in the previous bar.
    const sixteenths = Math.round(ticks / (transport.PPQ / 4));
    return Math.floor(sixteenths / STEPS);
  }

  private onStep(step: number, time: number): void {
    if (step === 0) {
      const bar = this.barAt(time);
      if (this.state === 'count-in' && bar === this.recordBar) this.state = 'recording';
      else if (this.state === 'recording' && bar > this.recordBar) this.state = 'playing';
    }

    const beat = step % 4 === 0;
    if (beat && (this.metronome || this.state === 'count-in' || this.state === 'recording')) {
      this.click?.triggerAttackRelease(step === 0 ? 'A5' : 'E5', '32n', time);
    }

    if (this.state === 'playing' || this.state === 'recording') {
      for (const hit of this.pattern) {
        if (Math.floor(hit.step) === step) {
          const offset = (hit.step - step) * (60 / this.bpm / 4);
          this.play(hit.drum, time + offset);
        }
      }
    }

    Tone.getDraw().schedule(() => {
      this.currentStep = step;
      this.emit();
    }, time);
  }

  /** Called for every live drum hit; writes it into the loop while recording. */
  noteHit(drum: DrumHit): void {
    if (this.state !== 'recording') return;
    const transport = Tone.getTransport();
    const seconds = transport.seconds % barSeconds(this.bpm);
    this.pattern = addHit(this.pattern, { drum, step: positionInBar(seconds, this.bpm, this.quantise) });
    this.emit();
  }

  /**
   * Arms recording. From a standstill the transport starts and one bar of
   * count-in clicks plays first; while running, recording starts at the next
   * downbeat and adds to the loop already there (overdub).
   */
  record(): void {
    if (this.state === 'count-in' || this.state === 'recording') return;
    const transport = Tone.getTransport();
    if (transport.state !== 'started') {
      transport.position = 0;
      transport.start();
      this.recordBar = 1;
    } else {
      this.recordBar = this.barAt() + 1;
    }
    this.state = 'count-in';
    this.emit();
  }

  togglePlay(): void {
    const transport = Tone.getTransport();
    if (transport.state === 'started') {
      transport.stop();
      this.state = this.pattern.length ? 'stopped' : 'empty';
      this.currentStep = -1;
    } else {
      transport.position = 0;
      transport.start();
      if (this.pattern.length) this.state = 'playing';
    }
    this.emit();
  }

  clear(): void {
    this.pattern = [];
    if (this.state !== 'count-in') this.state = Tone.getTransport().state === 'started' ? 'stopped' : 'empty';
    this.emit();
  }

  setBpm(bpm: number): void {
    this.bpm = clampBpm(bpm);
    Tone.getTransport().bpm.value = this.bpm;
    this.emit();
  }

  setMetronome(on: boolean): void {
    this.metronome = on;
    this.emit();
  }

  setQuantise(on: boolean): void {
    this.quantise = on;
    this.emit();
  }

  isRunning(): boolean {
    return Tone.getTransport().state === 'started';
  }

  snapshot(): RhythmSnapshot {
    return {
      state: this.state,
      bpm: this.bpm,
      metronome: this.metronome,
      quantise: this.quantise,
      pattern: this.pattern,
      step: this.currentStep,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  destroy(): void {
    const transport = Tone.getTransport();
    transport.stop();
    if (this.stepEvent !== null) transport.clear(this.stepEvent);
    this.click?.dispose();
    this.clickGain?.dispose();
    this.listeners.clear();
  }
}
