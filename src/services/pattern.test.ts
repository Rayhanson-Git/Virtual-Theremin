import { describe, expect, it } from 'vitest';
import { addHit, barSeconds, clampBpm, patternGrid, positionInBar, stepSeconds, STEPS } from './pattern';

describe('timing', () => {
  it('measures bars and steps', () => {
    expect(barSeconds(120)).toBe(2);
    expect(stepSeconds(120)).toBe(0.125);
    expect(barSeconds(60)).toBe(4);
  });

  it('clamps and rounds the tempo', () => {
    expect([clampBpm(10), clampBpm(96.4), clampBpm(400)]).toEqual([60, 96, 160]);
  });
});

describe('positionInBar', () => {
  it('snaps to the nearest sixteenth with quantise on', () => {
    expect(positionInBar(0.06, 120, true)).toBe(0); // under half a step
    expect(positionInBar(0.07, 120, true)).toBe(1); // over half a step
    expect(positionInBar(0.5, 120, true)).toBe(4); // beat two
    expect(positionInBar(1.97, 120, true)).toBe(0); // late in the bar wraps to the downbeat
  });

  it('keeps the exact position with quantise off', () => {
    expect(positionInBar(0.07, 120, false)).toBeCloseTo(0.56, 5);
  });

  it('wraps times past the bar', () => {
    expect(positionInBar(2.5, 120, true)).toBe(4);
    expect(positionInBar(-0.5, 120, true)).toBe(12);
  });
});

describe('patterns', () => {
  it('adds hits in order and ignores exact repeats', () => {
    let p = addHit([], { drum: 'snare', step: 4 });
    p = addHit(p, { drum: 'kick', step: 0 });
    p = addHit(p, { drum: 'snare', step: 4 });
    expect(p).toEqual([{ drum: 'kick', step: 0 }, { drum: 'snare', step: 4 }]);
  });

  it('draws as a grid', () => {
    const g = patternGrid([{ drum: 'kick', step: 0 }, { drum: 'hihat', step: 6.6 }]);
    expect(g.kick[0]).toBe(true);
    expect(g.hihat[6]).toBe(true);
    expect(g.snare.every((s) => !s)).toBe(true);
    expect(g.kick).toHaveLength(STEPS);
  });
});
