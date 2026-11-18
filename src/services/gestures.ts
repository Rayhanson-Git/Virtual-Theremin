// Pure gesture maths: no camera, no MediaPipe, no audio. Everything here works
// on the 21 landmarks HandLandmarker returns for each hand, in normalised image
// coordinates (0 to 1, y pointing down), and is covered by gestures.test.ts.

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type DrumHit = 'kick' | 'snare' | 'hihat' | 'clap';

export interface RightHandTaps {
  kick: boolean;
  snare: boolean;
  hihat: boolean;
  clap: boolean;
}

export const THUMB_TIP = 4;
export const INDEX_TIP = 8;
export const MIDDLE_TIP = 12;
export const RING_TIP = 16;
export const PINKY_TIP = 20;
export const WRIST = 0;
export const MIDDLE_MCP = 9;

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function distance2D(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function computeFingerSpread(landmarks: HandLandmark[]): number {
  const tips = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
  const wrist = landmarks[WRIST];

  const handSize = distance2D(wrist, landmarks[MIDDLE_TIP]);
  if (handSize < 0.01) return 0;

  let totalDist = 0;
  let count = 0;
  for (let i = 0; i < tips.length; i++) {
    for (let j = i + 1; j < tips.length; j++) {
      totalDist += distance2D(landmarks[tips[i]], landmarks[tips[j]]);
      count++;
    }
  }

  const avgDist = totalDist / count;
  const normalized = avgDist / handSize;

  return Math.max(0, Math.min(1, (normalized - 0.3) / 1.2));
}

export function computeHandRotation(landmarks: HandLandmark[]): number {
  const wrist = landmarks[WRIST];
  const middleMcp = landmarks[MIDDLE_MCP];

  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;

  const angle = Math.atan2(dx, -dy);

  const rightLimit = -90 * (Math.PI / 180);
  const leftLimit = 50 * (Math.PI / 180);
  const range = leftLimit - rightLimit;

  const normalized = (angle - rightLimit) / range;

  return Math.max(0, Math.min(1, normalized));
}

export function computePinchSpread(landmarks: HandLandmark[]): number {
  const thumb = landmarks[THUMB_TIP];
  const index = landmarks[INDEX_TIP];
  const wrist = landmarks[WRIST];
  const middleTip = landmarks[MIDDLE_TIP];

  const handSize = distance2D(wrist, middleTip);
  if (handSize < 0.01) return 0;

  const pinchDist = distance2D(thumb, index) / handSize;

  return Math.max(0, Math.min(1, pinchDist / 1.0));
}

// A tap fires when the thumb comes within 0.25 hand-lengths of a fingertip, and
// re-arms only once they are more than 0.35 apart again (hysteresis), so one
// touch is one hit even when the landmarks jitter.
export const PINCH_THRESHOLD = 0.25;
export const RELEASE_THRESHOLD = 0.35;

export interface TapState {
  wasDown: boolean;
  fired: boolean;
}

export function createTapState(): TapState {
  return { wasDown: false, fired: false };
}

export function detectTap(
  landmarks: HandLandmark[],
  fingerTip: number,
  state: TapState
): { tap: boolean; state: TapState } {
  const thumb = landmarks[THUMB_TIP];
  const finger = landmarks[fingerTip];
  const wrist = landmarks[WRIST];
  const middleTip = landmarks[MIDDLE_TIP];

  const handSize = distance2D(wrist, middleTip);
  if (handSize < 0.01) return { tap: false, state };

  const dist = distance2D(thumb, finger) / handSize;
  const isDown = dist < PINCH_THRESHOLD;
  const isUp = dist > RELEASE_THRESHOLD;

  let tap = false;
  const newState = { ...state };

  if (isDown && !state.wasDown) {
    tap = true;
    newState.wasDown = true;
    newState.fired = true;
  } else if (isUp) {
    newState.wasDown = false;
    newState.fired = false;
  }

  return { tap, state: newState };
}
