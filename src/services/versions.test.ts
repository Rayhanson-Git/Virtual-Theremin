import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// handTracking.ts imports MediaPipe, which needs a browser, so read the constant as text.
const source = readFileSync(new URL('./handTracking.ts', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('MediaPipe versions', () => {
  it('loads the wasm runtime from the same release as the installed package', () => {
    const pinned = /MEDIAPIPE_VERSION = '([^']+)'/.exec(source)?.[1];
    expect(pinned).toBe(pkg.dependencies['@mediapipe/tasks-vision']);
  });
});
