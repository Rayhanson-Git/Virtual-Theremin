import { describe, expect, it } from 'vitest';
import {
  computeFingerSpread,
  computeHandRotation,
  computePinchSpread,
  createTapState,
  detectTap,
  INDEX_TIP,
  MIDDLE_TIP,
  PINCH_THRESHOLD,
  RELEASE_THRESHOLD,
} from './gestures';
import { fist, openHand, rotatedHand, thumbTowards } from '../test/hands';

// The expected values were recorded from the original March 2026 code before
// it was moved into this module, so these tests pin its behaviour exactly.
const close = (n: number, digits = 5) => expect.closeTo(n, digits);

describe('computeHandRotation (right hand: vocal pitch and bass)', () => {
  it.each([
    [-120, 0],
    [-90, 0],
    [-45, 0.321429],
    [-20, 0.5],
    [0, 0.642857],
    [20, 0.785714],
    [50, 1],
    [80, 1],
  ])('turned %i° gives %f', (deg, expected) => {
    expect(computeHandRotation(rotatedHand(deg))).toEqual(close(expected));
  });

  it('maps -90° to 0 and +50° to 1, linearly between', () => {
    const a = computeHandRotation(rotatedHand(-90));
    const b = computeHandRotation(rotatedHand(50));
    const mid = computeHandRotation(rotatedHand(-20));
    expect([a, b, mid]).toEqual([close(0), close(1), close(0.5)]);
  });
});

describe('computePinchSpread (left hand: volume)', () => {
  it.each([
    [0, 0.514513],
    [0.5, 0.257256],
    [0.8, 0.102903],
    [1, 0],
  ])('thumb %f of the way to the index tip gives %f', (fraction, expected) => {
    expect(computePinchSpread(thumbTowards(INDEX_TIP, fraction))).toEqual(close(expected));
  });

  it('is larger when the fingers are further apart (wider = louder)', () => {
    expect(computePinchSpread(openHand())).toBeGreaterThan(computePinchSpread(thumbTowards(INDEX_TIP, 0.5)));
  });

  it('handles a fist', () => {
    expect(computePinchSpread(fist())).toEqual(close(0.078567));
  });

  it('returns 0 for a degenerate hand', () => {
    const flat = openHand().map(() => ({ x: 0.5, y: 0.5, z: 0 }));
    expect(computePinchSpread(flat)).toBe(0);
  });
});

describe('computeFingerSpread', () => {
  it('matches the recorded values', () => {
    expect(computeFingerSpread(openHand())).toEqual(close(0.119975));
    expect(computeFingerSpread(fist())).toEqual(close(0.120989));
  });
});

describe('detectTap (right hand: drums)', () => {
  it('uses the original thresholds', () => {
    expect([PINCH_THRESHOLD, RELEASE_THRESHOLD]).toEqual([0.25, 0.35]);
  });

  it('fires once per touch, and re-arms only after the fingers open past the release threshold', () => {
    let state = createTapState();
    const taps: boolean[] = [];
    for (const f of [0, 0.9, 0.95, 1, 0.9, 0.6, 0.3, 0.95, 1]) {
      const r = detectTap(thumbTowards(INDEX_TIP, f), INDEX_TIP, state);
      state = r.state;
      taps.push(r.tap);
    }
    // 0.6 of the way is between the two thresholds, so it does not re-arm.
    expect(taps).toEqual([false, true, false, false, false, false, false, true, false]);
  });

  it('works on any finger', () => {
    const r = detectTap(thumbTowards(MIDDLE_TIP, 0.9), MIDDLE_TIP, createTapState());
    expect(r.tap).toBe(true);
  });

  it('does not mutate the state it is given', () => {
    const state = createTapState();
    detectTap(thumbTowards(INDEX_TIP, 1), INDEX_TIP, state);
    expect(state).toEqual({ wasDown: false, fired: false });
  });
});
