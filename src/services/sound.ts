// Pure mappings from gesture values (0 to 1) to sound parameters, plus the
// scales and voices you can choose. The audio service applies them with
// Tone.js; sound.test.ts covers them.

// ------------------------------------------------------------------ scales

export const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type Root = (typeof ROOTS)[number];

export interface ScaleDef {
  id: string;
  name: string;
  /** Semitones above the root, within one octave. */
  steps: number[];
}

// Pentatonic comes first and is the default: no two neighbouring notes clash,
// so sweeping through them always sounds musical.
export const SCALES: ScaleDef[] = [
  { id: 'pentatonic', name: 'Major pentatonic', steps: [0, 2, 4, 7, 9] },
  { id: 'minor-pentatonic', name: 'Minor pentatonic', steps: [0, 3, 5, 7, 10] },
  { id: 'major', name: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', name: 'Natural minor', steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'blues', name: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
  { id: 'dorian', name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'chromatic', name: 'Chromatic', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

export const DEFAULT_ROOT: Root = 'C';
export const DEFAULT_SCALE = 'pentatonic';

/** Lowest and highest octave of the vocal range: root 3 up to root 6. */
export const LOW_OCTAVE = 3;
export const OCTAVES = 3;

/**
 * The notes the right hand sweeps through: three octaves of the scale from the
 * root in octave 3, plus the root in octave 6 on top.
 */
export function buildScale(root: Root = DEFAULT_ROOT, scaleId: string = DEFAULT_SCALE): string[] {
  const scale = SCALES.find((s) => s.id === scaleId) ?? SCALES[0];
  const rootIndex = ROOTS.indexOf(root);
  const notes: string[] = [];
  for (let octave = 0; octave < OCTAVES; octave++) {
    for (const step of scale.steps) notes.push(noteName(rootIndex + step, LOW_OCTAVE + octave));
  }
  notes.push(noteName(rootIndex, LOW_OCTAVE + OCTAVES));
  return notes;
}

function noteName(semitone: number, octave: number): string {
  return `${ROOTS[semitone % 12]}${octave + Math.floor(semitone / 12)}`;
}

/** The original scale, C major pentatonic from C3 to C6. */
export const VOCAL_SCALE_NOTES = buildScale();

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The scale note for a right-hand rotation value: 0 is the lowest, 1 the highest. */
export function vocalNoteFor(value: number, notes: readonly string[] = VOCAL_SCALE_NOTES): string {
  return notes[noteIndexFor(value, notes.length)];
}

export function noteIndexFor(value: number, count: number): number {
  return Math.round(clamp01(value) * (count - 1));
}

/** Equal-tempered frequency of a note name such as 'A4' (440 Hz) or 'F#3'. */
export function noteFrequency(note: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Not a note name: ${note}`);
  const midi = (Number(m[2]) + 1) * 12 + ROOTS.indexOf(m[1] as Root);
  return 440 * 2 ** ((midi - 69) / 12);
}

// ------------------------------------------------------------------ voices

export interface VoiceDef {
  id: string;
  name: string;
  description: string;
  oscillator: { type: string; count?: number; spread?: number };
  envelope: { attack: number; decay: number; sustain: number; release: number };
}

// "Classic" is the original sound and stays the default.
export const VOICES: VoiceDef[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Sawtooth through a band-pass, with vibrato: the original voice.',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.4 },
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'A pure sine with a slow swell and a long tail, closest to a real theremin.',
    oscillator: { type: 'sine' },
    envelope: { attack: 0.18, decay: 0.2, sustain: 0.9, release: 1.2 },
  },
  {
    id: 'choir',
    name: 'Choir',
    description: 'Three detuned sawtooths, wide and breathy.',
    oscillator: { type: 'fatsawtooth', count: 3, spread: 28 },
    envelope: { attack: 0.25, decay: 0.3, sustain: 0.7, release: 0.9 },
  },
  {
    id: 'chip',
    name: 'Chip',
    description: 'A square wave with a fast attack, like an 8-bit console.',
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.5, release: 0.2 },
  },
];

export const DEFAULT_VOICE = 'classic';

export const voiceById = (id: string): VoiceDef => VOICES.find((v) => v.id === id) ?? VOICES[0];

// --------------------------------------------------------------- mappings

/** The band-pass centre of the vocal voice: brighter as the hand turns. */
export const vocalFilterFrequency = (value: number) => 800 + clamp01(value) * 2000;

/** Vocal loudness from the left-hand pinch: wider apart is louder. */
export const vocalGain = (pinch: number) => clamp01(pinch) * 0.4;

/** Bass pitch follows the same rotation as the vocal, from 40 to 120 Hz. */
export const bassFrequency = (value: number) => 40 + clamp01(value) * 80;

/** Bass loudness rises with the rotation too. */
export const bassGain = (value: number) => clamp01(value) * 0.35;
