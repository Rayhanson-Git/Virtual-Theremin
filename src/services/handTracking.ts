import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  label: string;
}

export type DrumHit = 'kick' | 'snare' | 'hihat' | 'clap';

export interface RightHandTaps {
  kick: boolean;
  snare: boolean;
  hihat: boolean;
  clap: boolean;
}

export interface HandPositions {
  leftPinch: number | null;
  rightFingerSpread: number | null;
  rightRotation: number | null;
  rightTaps: RightHandTaps;
  hands: HandData[];
}

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const WRIST = 0;
const MIDDLE_MCP = 9;

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

function computeFingerSpread(landmarks: HandLandmark[]): number {
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

function computeHandRotation(landmarks: HandLandmark[]): number {
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

function computePinchSpread(landmarks: HandLandmark[]): number {
  const thumb = landmarks[THUMB_TIP];
  const index = landmarks[INDEX_TIP];
  const wrist = landmarks[WRIST];
  const middleTip = landmarks[MIDDLE_TIP];

  const handSize = distance2D(wrist, middleTip);
  if (handSize < 0.01) return 0;

  const pinchDist = distance2D(thumb, index) / handSize;

  return Math.max(0, Math.min(1, pinchDist / 1.0));
}

const PINCH_THRESHOLD = 0.25;
const RELEASE_THRESHOLD = 0.35;

interface TapState {
  wasDown: boolean;
  fired: boolean;
}

function createTapState(): TapState {
  return { wasDown: false, fired: false };
}

function detectTap(
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

export class HandTrackingService {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private onUpdateCallback: ((positions: HandPositions) => void) | null = null;
  private tapStates = {
    index: createTapState(),
    middle: createTapState(),
    ring: createTapState(),
    pinky: createTapState(),
  };

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  startTracking(onUpdate: (positions: HandPositions) => void): void {
    this.onUpdateCallback = onUpdate;
    this.detectHands();
  }

  private detectHands = (): void => {
    if (!this.handLandmarker || !this.videoElement) return;

    const startTimeMs = performance.now();
    const results: HandLandmarkerResult = this.handLandmarker.detectForVideo(
      this.videoElement,
      startTimeMs
    );

    const positions = this.extractHandPositions(results);
    if (this.onUpdateCallback) {
      this.onUpdateCallback(positions);
    }

    this.animationFrameId = requestAnimationFrame(this.detectHands);
  };

  private extractHandPositions(results: HandLandmarkerResult): HandPositions {
    const positions: HandPositions = {
      leftPinch: null,
      rightFingerSpread: null,
      rightRotation: null,
      rightTaps: { kick: false, snare: false, hihat: false, clap: false },
      hands: []
    };

    if (!results.landmarks || results.landmarks.length === 0) {
      return positions;
    }

    for (let i = 0; i < results.landmarks.length; i++) {
      const landmarks = results.landmarks[i];
      const handedness = results.handedness[i];

      if (!landmarks || landmarks.length === 0 || !handedness || handedness.length === 0) {
        continue;
      }

      const label = handedness[0].categoryName;

      positions.hands.push({ landmarks, label });

      if (label === 'Left') {
        positions.leftPinch = computePinchSpread(landmarks);
      } else if (label === 'Right') {
        positions.rightFingerSpread = computeFingerSpread(landmarks);
        positions.rightRotation = computeHandRotation(landmarks);

        const indexResult = detectTap(landmarks, INDEX_TIP, this.tapStates.index);
        this.tapStates.index = indexResult.state;
        positions.rightTaps.kick = indexResult.tap;

        const middleResult = detectTap(landmarks, MIDDLE_TIP, this.tapStates.middle);
        this.tapStates.middle = middleResult.state;
        positions.rightTaps.snare = middleResult.tap;

        const ringResult = detectTap(landmarks, RING_TIP, this.tapStates.ring);
        this.tapStates.ring = ringResult.state;
        positions.rightTaps.hihat = ringResult.tap;

        const pinkyResult = detectTap(landmarks, PINKY_TIP, this.tapStates.pinky);
        this.tapStates.pinky = pinkyResult.state;
        positions.rightTaps.clap = pinkyResult.tap;
      }
    }

    return positions;
  }

  stopTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy(): void {
    this.stopTracking();
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}
