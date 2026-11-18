import { describe, expect, it } from 'vitest';
import {
  VOCAL_SCALE_NOTES,
  bassFrequency,
  bassGain,
  noteFrequency,
  vocalFilterFrequency,
  vocalGain,
  vocalNoteFor,
} from './sound';

describe('vocal scale', () => {
  it('is the original C pentatonic, C3 to C6', () => {
    expect(VOCAL_SCALE_NOTES).toEqual([
      'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6',
    ]);
  });

  it('maps 0 to C3, 1 to C6 and rounds to the nearest note', () => {
    expect(vocalNoteFor(0)).toBe('C3');
    expect(vocalNoteFor(1)).toBe('C6');
    expect(vocalNoteFor(0.5)).toBe('G4'); // round(7.5) = 8
    expect(vocalNoteFor(0.642857)).toBe('C5'); // a hand held upright
    expect(vocalNoteFor(-1)).toBe('C3');
    expect(vocalNoteFor(2)).toBe('C6');
  });
});

describe('noteFrequency (same values Tone.Frequency gives)', () => {
  it.each([
    ['A4', 440],
    ['C4', 261.625565],
    ['C3', 130.812783],
    ['C6', 1046.502261],
    ['G4', 391.995436],
  ])('%s is %f Hz', (note, hz) => {
    expect(noteFrequency(note)).toBeCloseTo(hz, 4);
  });
});

describe('sound mappings', () => {
  it('keeps the original ranges', () => {
    expect([vocalFilterFrequency(0), vocalFilterFrequency(1)]).toEqual([800, 2800]);
    expect([vocalGain(0), vocalGain(1), vocalGain(2)]).toEqual([0, 0.4, 0.4]);
    expect([bassFrequency(0), bassFrequency(1)]).toEqual([40, 120]);
    expect([bassGain(0), bassGain(1)]).toEqual([0, 0.35]);
  });
});

import { ROOTS, SCALES, VOICES, buildScale, noteIndexFor, voiceById } from './sound';

describe('buildScale', () => {
  it('defaults to the original C major pentatonic', () => {
    expect(buildScale()).toEqual([...VOCAL_SCALE_NOTES]);
    expect(buildScale('C', 'pentatonic')).toHaveLength(16);
  });

  it('starts on the root in octave 3 and ends on it in octave 6', () => {
    for (const root of ROOTS) {
      for (const scale of SCALES) {
        const notes = buildScale(root, scale.id);
        expect(notes[0]).toBe(`${root}3`);
        expect(notes[notes.length - 1]).toBe(`${root}6`);
        expect(notes).toHaveLength(scale.steps.length * 3 + 1);
        // strictly rising
        const hz = notes.map(noteFrequency);
        hz.slice(1).forEach((f, i) => expect(f).toBeGreaterThan(hz[i]));
      }
    }
  });

  it('carries into the next octave name past B', () => {
    expect(buildScale('A', 'major').slice(0, 8)).toEqual(['A3', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'G#4', 'A4']);
  });

  it('builds the blues and minor scales', () => {
    expect(buildScale('E', 'blues').slice(0, 7)).toEqual(['E3', 'G3', 'A3', 'A#3', 'B3', 'D4', 'E4']);
    expect(buildScale('A', 'minor').slice(0, 8)).toEqual(['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4']);
  });

  it('falls back to pentatonic for an unknown scale', () => {
    expect(buildScale('C', 'nope')).toEqual(buildScale());
  });
});

describe('notes and voices', () => {
  it('handles sharps', () => {
    expect(noteFrequency('C#4')).toBeCloseTo(277.182631, 4);
    expect(noteFrequency('F#3')).toBeCloseTo(184.997211, 4);
    expect(() => noteFrequency('H2')).toThrow();
  });

  it('spreads the hand range across any number of notes', () => {
    expect(noteIndexFor(0, 22)).toBe(0);
    expect(noteIndexFor(1, 22)).toBe(21);
    expect(vocalNoteFor(1, buildScale('A', 'major'))).toBe('A6');
  });

  it('keeps the original voice as the default', () => {
    expect(VOICES[0]).toMatchObject({ id: 'classic', oscillator: { type: 'sawtooth' } });
    expect(VOICES[0].envelope).toEqual({ attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.4 });
    expect(voiceById('missing').id).toBe('classic');
  });
});
