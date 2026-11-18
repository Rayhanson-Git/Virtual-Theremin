// Pure timing maths for the drum looper: one bar of 4/4 split into 16 steps.
// rhythm.ts plays it with Tone.Transport; pattern.test.ts covers it.
import type { DrumHit } from './gestures';

export const STEPS = 16;
export const BEATS_PER_BAR = 4;
export const MIN_BPM = 60;
export const MAX_BPM = 160;
export const DEFAULT_BPM = 96;

export const DRUMS: DrumHit[] = ['kick', 'snare', 'hihat', 'clap'];

/** Length of one bar in seconds. */
export const barSeconds = (bpm: number) => (60 / bpm) * BEATS_PER_BAR;

/** Length of one step (a sixteenth note) in seconds. */
export const stepSeconds = (bpm: number) => barSeconds(bpm) / STEPS;

export const clampBpm = (bpm: number) => Math.round(Math.max(MIN_BPM, Math.min(MAX_BPM, bpm)));

/**
 * Where a hit lands in the bar. With quantise on it snaps to the nearest
 * sixteenth (wrapping the last half-step round to step 0); with it off it keeps
 * its exact position, as a fraction of a step.
 */
export function positionInBar(secondsIntoBar: number, bpm: number, quantise: boolean): number {
  const bar = barSeconds(bpm);
  const t = ((secondsIntoBar % bar) + bar) % bar;
  const steps = t / stepSeconds(bpm);
  if (!quantise) return steps;
  return Math.round(steps) % STEPS;
}

/** One recorded hit: which drum, and where in the bar, in steps (0 to 16). */
export interface PatternHit {
  drum: DrumHit;
  step: number;
}

/** Adds a hit, ignoring an exact repeat of one already there (a double trigger). */
export function addHit(pattern: PatternHit[], hit: PatternHit): PatternHit[] {
  const dup = pattern.some((h) => h.drum === hit.drum && Math.abs(h.step - hit.step) < 0.01);
  return dup ? pattern : [...pattern, hit].sort((a, b) => a.step - b.step);
}

/** The pattern as a 4 × 16 grid of booleans, for drawing. */
export function patternGrid(pattern: PatternHit[]): Record<DrumHit, boolean[]> {
  const grid = Object.fromEntries(DRUMS.map((d) => [d, Array(STEPS).fill(false)])) as Record<DrumHit, boolean[]>;
  for (const h of pattern) grid[h.drum][Math.floor(h.step) % STEPS] = true;
  return grid;
}
