import type { DrumHit } from './gestures';
import type { HandData } from './handTracking';

/**
 * Values that change every camera frame. They live in a ref, not in React
 * state: the canvas overlay and the 3D scene read them in their own animation
 * loops, and React only re-renders the panels at UI_UPDATE_MS intervals.
 */
export interface LiveState {
  hands: HandData[];
  /** Left-hand pinch, smoothed (0 to 1), or null with no left hand. */
  leftPinch: number | null;
  /** Right-hand rotation, smoothed (0 to 1), or null with no right hand. */
  rightRotation: number | null;
  /** Current vocal note and its frequency in Hz. */
  note: string;
  frequency: number;
  /** Vocal level (0 to 1) and bass level (0 to 1), as sent to the synths. */
  volume: number;
  bass: number;
  activeDrum: DrumHit | null;
  /** Set to 1 on every drum hit (live or looped); the 3D scene lets it decay. */
  drumPulse: number;
  drumColor: string;
}

export const UI_UPDATE_MS = 50;

/** The colour each drum flashes, on the pads, the overlay and the 3D scene. */
export const DRUM_COLORS: Record<DrumHit, string> = {
  kick: '#f97316',
  snare: '#22d3ee',
  hihat: '#a3e635',
  clap: '#f472b6',
};

/** Which finger and which key play each drum. */
export const DRUM_PADS: { id: DrumHit; label: string; finger: string; key: string }[] = [
  { id: 'kick', label: 'Kick', finger: 'Index', key: 'A' },
  { id: 'snare', label: 'Snare', finger: 'Middle', key: 'S' },
  { id: 'hihat', label: 'Hi-hat', finger: 'Ring', key: 'D' },
  { id: 'clap', label: 'Clap', finger: 'Pinky', key: 'F' },
];


export function createLiveState(): LiveState {
  return {
    hands: [],
    leftPinch: null,
    rightRotation: null,
    note: 'C4',
    frequency: 440,
    volume: 0,
    bass: 0,
    activeDrum: null,
    drumPulse: 0,
    drumColor: '#22d3ee',
  };
}

/** Moves `current` a fraction of the way to `target`; a null target keeps the last value. */
export function smoothValue(current: number | null, target: number | null, factor = 0.15): number | null {
  if (target === null) return current;
  if (current === null) return target;
  return current + (target - current) * factor;
}
