import * as Tone from 'tone';
import {
  VOCAL_SCALE_NOTES,
  voiceById,
  vocalNoteFor,
  noteFrequency,
  vocalFilterFrequency,
  vocalGain,
  bassFrequency,
  bassGain,
} from './sound';


export class AudioSynthesisService {
  private vocalSynth: Tone.PolySynth | null = null;
  private vocalGain: Tone.Gain | null = null;
  private vocalFilter: Tone.Filter | null = null;
  private vocalVibrato: Tone.Vibrato | null = null;
  private bassOscillator: Tone.Oscillator | null = null;
  private bassGainNode: Tone.Gain | null = null;
  private bassFilter: Tone.Filter | null = null;
  private isPlaying = false;

  private currentFrequency = 440;
  private currentNote: string = 'C4';
  private currentVolume = 0;
  private currentBass = 0;
  private activeNote: string | null = null;
  private notes: readonly string[] = VOCAL_SCALE_NOTES;
  private lastPitchValue: number | null = null;

  async initialize(): Promise<void> {
    await Tone.start();

    this.vocalFilter = new Tone.Filter({
      type: 'bandpass',
      frequency: 1200,
      Q: 1.5,
    });

    this.vocalVibrato = new Tone.Vibrato({
      frequency: 5,
      depth: 0.15,
    });

    this.vocalGain = new Tone.Gain(0).toDestination();

    this.vocalSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.08,
        decay: 0.3,
        sustain: 0.6,
        release: 0.4,
      },
    });

    this.vocalSynth.chain(this.vocalFilter, this.vocalVibrato, this.vocalGain);

    this.bassFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 200,
      rolloff: -24,
    });

    this.bassOscillator = new Tone.Oscillator({
      frequency: 55,
      type: 'triangle',
    }).start();

    this.bassGainNode = new Tone.Gain(0).toDestination();
    this.bassOscillator.connect(this.bassFilter);
    this.bassFilter.connect(this.bassGainNode);

    this.isPlaying = true;
  }

  setVolume(normalizedValue: number | null): void {
    if (!this.vocalGain) return;

    if (normalizedValue === null) {
      this.currentVolume = 0;
      this.vocalGain.gain.rampTo(0, 0.1);
      return;
    }

    this.currentVolume = Math.max(0, Math.min(1, normalizedValue));
    this.vocalGain.gain.rampTo(vocalGain(normalizedValue), 0.1);
  }

  setPitch(normalizedValue: number | null): void {
    if (!this.vocalSynth) return;

    if (normalizedValue === null) {
      this.lastPitchValue = null;
      if (this.activeNote) {
        this.vocalSynth.releaseAll();
        this.activeNote = null;
      }
      return;
    }

    this.lastPitchValue = normalizedValue;
    const note = vocalNoteFor(normalizedValue, this.notes);
    this.currentNote = note;
    this.currentFrequency = noteFrequency(note);

    if (this.vocalFilter) {
      this.vocalFilter.frequency.rampTo(vocalFilterFrequency(normalizedValue), 0.08);
    }

    if (note !== this.activeNote) {
      if (this.activeNote) {
        this.vocalSynth.releaseAll();
      }
      this.vocalSynth.triggerAttack(note);
      this.activeNote = note;
    }
  }

  setBass(normalizedValue: number | null): void {
    if (!this.bassOscillator || !this.bassGainNode) return;

    if (normalizedValue === null) {
      this.currentBass = 0;
      this.bassGainNode.gain.rampTo(0, 0.15);
      return;
    }

    this.currentBass = Math.max(0, Math.min(1, normalizedValue));
    this.bassOscillator.frequency.rampTo(bassFrequency(normalizedValue), 0.15);
    this.bassGainNode.gain.rampTo(bassGain(normalizedValue), 0.15);
  }

  /** Changes the notes the right hand sweeps through (see buildScale). */
  setScale(notes: readonly string[]): void {
    this.notes = notes;
    if (this.lastPitchValue !== null) this.setPitch(this.lastPitchValue);
  }

  getScale(): readonly string[] {
    return this.notes;
  }

  /** Switches the vocal voice preset; the note playing restarts in the new voice. */
  setVoice(id: string): void {
    if (!this.vocalSynth) return;
    const voice = voiceById(id);
    this.vocalSynth.releaseAll();
    this.activeNote = null;
    this.vocalSynth.set({
      oscillator: voice.oscillator as Tone.OmniOscillatorOptions,
      envelope: voice.envelope,
    });
    if (this.lastPitchValue !== null) this.setPitch(this.lastPitchValue);
  }

  getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  getCurrentNote(): string {
    return this.currentNote;
  }

  getCurrentVolume(): number {
    return this.currentVolume;
  }

  getCurrentBass(): number {
    return this.currentBass;
  }

  stop(): void {
    if (this.isPlaying) {
      this.vocalSynth?.releaseAll();
      this.bassOscillator?.stop();
      this.activeNote = null;
      this.isPlaying = false;
    }
  }

  destroy(): void {
    this.stop();
    this.vocalSynth?.dispose();
    this.vocalSynth = null;
    this.vocalGain?.dispose();
    this.vocalGain = null;
    this.vocalFilter?.dispose();
    this.vocalFilter = null;
    this.vocalVibrato?.dispose();
    this.vocalVibrato = null;
    this.bassOscillator?.dispose();
    this.bassOscillator = null;
    this.bassFilter?.dispose();
    this.bassFilter = null;
    this.bassGainNode?.dispose();
    this.bassGainNode = null;
  }
}
