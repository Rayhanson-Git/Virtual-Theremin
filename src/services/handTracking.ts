import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import {
  HandLandmark,
  RightHandTaps,
  INDEX_TIP,
  MIDDLE_TIP,
  RING_TIP,
  PINKY_TIP,
  computeFingerSpread,
  computeHandRotation,
  computePinchSpread,
  createTapState,
  detectTap,
} from './gestures';

export type { HandLandmark, DrumHit, RightHandTaps } from './gestures';
export { HAND_CONNECTIONS } from './gestures';

export interface HandData {
  landmarks: HandLandmark[];
  label: string;
}

export interface HandPositions {
  leftPinch: number | null;
  rightFingerSpread: number | null;
  rightRotation: number | null;
  rightTaps: RightHandTaps;
  hands: HandData[];
}

// The wasm runtime must come from the same release as the JavaScript API in
// package.json; a mismatch fails in odd ways. versions.test.ts checks this.
export const MEDIAPIPE_VERSION = '0.10.22-rc.20250304';
export const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
export const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const LANDMARKER_OPTIONS = {
  runningMode: 'VIDEO' as const,
  numHands: 2,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

export class HandTrackingService {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private lastVideoTime = -1;
  private onUpdateCallback: ((positions: HandPositions) => void) | null = null;
  private tapStates = {
    index: createTapState(),
    middle: createTapState(),
    ring: createTapState(),
    pinky: createTapState(),
  };

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

    // The GPU delegate is much faster, but not every browser and graphics
    // driver supports it; fall back to the CPU rather than failing.
    try {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
        ...LANDMARKER_OPTIONS,
      });
    } catch (gpuError) {
      console.warn('Hand tracking: GPU delegate unavailable, using the CPU.', gpuError);
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'CPU' },
        ...LANDMARKER_OPTIONS,
      });
    }
  }

  startTracking(onUpdate: (positions: HandPositions) => void): void {
    this.onUpdateCallback = onUpdate;
    this.detectHands();
  }

  private detectHands = (): void => {
    if (!this.handLandmarker || !this.videoElement) return;
    this.animationFrameId = requestAnimationFrame(this.detectHands);

    // Only run the model when the camera has delivered a new frame: the
    // display often refreshes faster than the camera.
    const video = this.videoElement;
    if (video.readyState < 2 || video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;

    const results: HandLandmarkerResult = this.handLandmarker.detectForVideo(video, performance.now());
    const positions = this.extractHandPositions(results);
    this.onUpdateCallback?.(positions);
  };

  private extractHandPositions(results: HandLandmarkerResult): HandPositions {
    const positions: HandPositions = {
      leftPinch: null,
      rightFingerSpread: null,
      rightRotation: null,
      rightTaps: { kick: false, snare: false, hihat: false, clap: false },
      hands: [],
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

      // MediaPipe's handedness label, used as is. MediaPipe assumes a mirrored
      // (selfie) image, and frames here go to the model unmirrored (only the
      // preview is flipped, in CSS), so check with a camera before swapping.
      const label = handedness[0].categoryName;

      positions.hands.push({ landmarks, label });

      if (label === 'Left') {
        positions.leftPinch = computePinchSpread(landmarks);
      } else if (label === 'Right') {
        positions.rightFingerSpread = computeFingerSpread(landmarks);
        positions.rightRotation = computeHandRotation(landmarks);

        // thumb to index = kick, middle = snare, ring = hi-hat, pinky = clap
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
    this.onUpdateCallback = null;
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}
