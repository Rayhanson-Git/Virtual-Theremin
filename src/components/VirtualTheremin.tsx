import { useState, useRef, useEffect, useCallback } from 'react';
import { HandTrackingService, HandPositions, HandData, DrumHit, RightHandTaps } from '../services/handTracking';
import { AudioSynthesisService } from '../services/audioSynthesis';
import { DrumSynthesisService } from '../services/drumSynthesis';
import { ThreeVisualization } from './ThreeVisualization';
import { HandOverlay } from './HandOverlay';
import { MusicPlayer } from './MusicPlayer';
import { DrumPad } from './DrumPad';
import { Hand } from 'lucide-react';

const CAMERA_WIDTH = 1200;
const CAMERA_HEIGHT = 675;

export function VirtualTheremin() {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState(440);
  const [volume, setVolume] = useState(0);
  const [bass, setBass] = useState(0);
  const [currentNote, setCurrentNote] = useState('C4');
  const [hands, setHands] = useState<HandData[]>([]);
  const [activeDrum, setActiveDrum] = useState<DrumHit | null>(null);
  const [handPositions, setHandPositions] = useState<HandPositions>({
    leftPinch: null,
    rightFingerSpread: null,
    rightRotation: null,
    rightTaps: { kick: false, snare: false, hihat: false, clap: false },
    hands: []
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const handTrackingRef = useRef<HandTrackingService | null>(null);
  const audioSynthesisRef = useRef<AudioSynthesisService | null>(null);
  const drumSynthesisRef = useRef<DrumSynthesisService | null>(null);
  const smoothedPositionsRef = useRef<HandPositions>({
    leftPinch: null,
    rightFingerSpread: null,
    rightRotation: null,
    rightTaps: { kick: false, snare: false, hihat: false, clap: false },
    hands: []
  });
  const animationFrameRef = useRef<number | null>(null);
  const drumTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const smoothValue = (current: number | null, target: number | null, factor = 0.15): number | null => {
    if (target === null) return current;
    if (current === null) return target;
    return current + (target - current) * factor;
  };

  const processDrumTaps = useCallback((taps: RightHandTaps) => {
    const drumMap: [keyof RightHandTaps, DrumHit][] = [
      ['kick', 'kick'],
      ['snare', 'snare'],
      ['hihat', 'hihat'],
      ['clap', 'clap'],
    ];

    for (const [key, drum] of drumMap) {
      if (taps[key]) {
        drumSynthesisRef.current?.trigger(drum);
        setActiveDrum(drum);
        if (drumTimeoutRef.current) clearTimeout(drumTimeoutRef.current);
        drumTimeoutRef.current = setTimeout(() => setActiveDrum(null), 200);
      }
    }
  }, []);

  const startExperience = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 16 / 9 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      handTrackingRef.current = new HandTrackingService();
      await handTrackingRef.current.initialize(videoRef.current!);

      audioSynthesisRef.current = new AudioSynthesisService();
      await audioSynthesisRef.current.initialize();

      drumSynthesisRef.current = new DrumSynthesisService();
      await drumSynthesisRef.current.initialize();

      const targetPositionsRef = {
        current: { leftPinch: null, rightFingerSpread: null, rightRotation: null, rightTaps: { kick: false, snare: false, hihat: false, clap: false }, hands: [] } as HandPositions
      };

      handTrackingRef.current.startTracking((positions: HandPositions) => {
        targetPositionsRef.current = positions;
        setHands(positions.hands);

        if (audioSynthesisRef.current) {
          audioSynthesisRef.current.setVolume(positions.leftPinch);
          audioSynthesisRef.current.setPitch(positions.rightRotation);
          audioSynthesisRef.current.setBass(positions.rightRotation);

          setFrequency(audioSynthesisRef.current.getCurrentFrequency());
          setVolume(audioSynthesisRef.current.getCurrentVolume());
          setBass(audioSynthesisRef.current.getCurrentBass());
          setCurrentNote(audioSynthesisRef.current.getCurrentNote());
        }

        processDrumTaps(positions.rightTaps);
      });

      const updateSmoothed = () => {
        smoothedPositionsRef.current = {
          leftPinch: smoothValue(smoothedPositionsRef.current.leftPinch, targetPositionsRef.current.leftPinch, 0.2),
          rightFingerSpread: smoothValue(smoothedPositionsRef.current.rightFingerSpread, targetPositionsRef.current.rightFingerSpread, 0.2),
          rightRotation: smoothValue(smoothedPositionsRef.current.rightRotation, targetPositionsRef.current.rightRotation, 0.2),
          rightTaps: targetPositionsRef.current.rightTaps,
          hands: targetPositionsRef.current.hands
        };

        setHandPositions({ ...smoothedPositionsRef.current });
        animationFrameRef.current = requestAnimationFrame(updateSmoothed);
      };

      updateSmoothed();
      setIsStarted(true);
    } catch (err) {
      console.error('Error starting theremin:', err);
      setError('Failed to start. Please allow camera access and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (drumTimeoutRef.current) clearTimeout(drumTimeoutRef.current);
      if (handTrackingRef.current) handTrackingRef.current.destroy();
      if (audioSynthesisRef.current) audioSynthesisRef.current.destroy();
      if (drumSynthesisRef.current) drumSynthesisRef.current.destroy();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
      <ThreeVisualization frequency={frequency} volume={volume} rotation={bass} />

      <div className="absolute top-10 right-10 z-30" style={{ width: CAMERA_WIDTH, height: CAMERA_HEIGHT }}>
        <video
          ref={videoRef}
          width={CAMERA_WIDTH}
          height={CAMERA_HEIGHT}
          className="w-full h-full rounded-2xl border-4 border-gray-700 object-contain transform -scale-x-100"
          playsInline
          muted
        />
        <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ transform: 'scaleX(-1)' }}>
          <HandOverlay hands={hands} width={CAMERA_WIDTH} height={CAMERA_HEIGHT} activeDrum={activeDrum} />
        </div>
      </div>

      {isStarted && (
        <div className="absolute top-10 left-10 z-20" style={{ maxWidth: 'calc(100% - 1280px)' }}>
          <div className="flex gap-10">
            <div className="relative border-2 border-cyan-500/30 rounded-2xl bg-cyan-500/5 backdrop-blur-sm overflow-hidden" style={{ width: 560, height: 480 }}>
              <div className="absolute top-5 left-5 text-cyan-400 text-2xl font-light tracking-wider">VOLUME</div>
              <div className="absolute top-14 left-5 text-cyan-400/40 text-xl">Pinch = Quieter</div>

              <div className="absolute inset-0 flex items-center justify-center">
                {handPositions.leftPinch !== null && (
                  <div className="relative flex flex-col items-center">
                    <div
                      className="w-36 h-36 rounded-full border-4 border-cyan-400 flex items-center justify-center transition-transform duration-150"
                      style={{ transform: `scale(${0.6 + handPositions.leftPinch * 0.8})` }}
                    >
                      <Hand className="w-16 h-16 text-cyan-400" />
                    </div>
                    <div
                      className="absolute rounded-full bg-cyan-400/20 blur-2xl transition-all duration-150"
                      style={{
                        width: `${100 + handPositions.leftPinch * 150}px`,
                        height: `${100 + handPositions.leftPinch * 150}px`
                      }}
                    />
                    <div className="mt-6 text-cyan-300 text-2xl tabular-nums">
                      {Math.round(handPositions.leftPinch * 100)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-7 left-7 right-7">
                <div className="w-full h-4 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-150 rounded-full"
                    style={{ width: `${(handPositions.leftPinch ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="relative border-2 border-blue-500/30 rounded-2xl bg-blue-500/5 backdrop-blur-sm overflow-hidden" style={{ width: 560, height: 480 }}>
              <div className="absolute top-5 left-5 text-blue-400 text-2xl font-light tracking-wider">VOCAL + BASS</div>
              <div className="absolute top-14 left-5 text-blue-400/40 text-xl">Right Hand Rotation</div>

              <div className="absolute inset-0 flex items-center justify-center">
                {handPositions.rightRotation !== null && (
                  <div className="relative flex flex-col items-center">
                    <div
                      className="w-36 h-36 rounded-full border-4 border-blue-400 flex items-center justify-center transition-transform duration-150"
                      style={{
                        transform: `rotate(${(handPositions.rightRotation - 0.5) * 180}deg) scale(${0.8 + bass * 0.6})`,
                      }}
                    >
                      <Hand className="w-16 h-16 text-blue-400" />
                    </div>
                    <div
                      className="absolute rounded-full bg-blue-400/20 blur-2xl transition-all duration-150"
                      style={{
                        width: `${100 + handPositions.rightRotation * 150}px`,
                        height: `${100 + handPositions.rightRotation * 150}px`
                      }}
                    />
                    <div className="mt-6 flex flex-col items-center">
                      <div className="text-blue-200 text-3xl font-medium">{currentNote}</div>
                      <div className="text-blue-400/50 text-lg tabular-nums">{Math.round(frequency)} Hz</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-7 left-7 right-7 space-y-2">
                <div className="w-full h-4 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-300 transition-all duration-150 rounded-full"
                    style={{ width: `${(handPositions.rightRotation ?? 0) * 100}%` }}
                  />
                </div>
                <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-150 rounded-full"
                    style={{ width: `${bass * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-blue-400/50">vocal scale</span>
                  <span className="text-amber-400/50">bass {Math.round(bass * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="text-center space-y-14 px-14 max-w-4xl">
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Hand className="w-24 h-24 text-white" />
              </div>
            </div>

            <h1 className="text-8xl font-light text-white tracking-wide">
              Virtual Theremin
            </h1>

            <p className="text-gray-300 text-2xl leading-relaxed">
              Use your hands to create music in real-time:
              <br />
              <span className="text-cyan-400">Left hand</span> -- pinch to control volume
              <br />
              <span className="text-blue-400">Right hand</span> -- rotate to control vocal scale, bass &amp; size
              <br />
              <span className="text-orange-400">Right hand</span> -- tap thumb to each finger for drum sounds
              <br />
              <span className="text-emerald-400">Load a song</span> and control it with gestures
            </p>

            <button
              onClick={startExperience}
              disabled={isLoading}
              className="px-20 py-10 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-3xl font-medium rounded-2xl
                       hover:from-cyan-400 hover:to-blue-400 transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/50"
            >
              {isLoading ? 'Initializing...' : 'START AUDIO EXPERIENCE'}
            </button>

            {error && (
              <p className="text-red-400 text-2xl">{error}</p>
            )}
          </div>
        </div>
      )}

      {isStarted && (
        <div className="absolute bottom-20 left-20 z-20 space-y-3">
          <DrumPad activeDrum={activeDrum} />
          <MusicPlayer volume={volume} />
        </div>
      )}

      {isStarted && (
        <div className="absolute bottom-20 right-20 bg-black/60 backdrop-blur-sm rounded-2xl p-10 border-2 border-gray-700 z-20"
             style={{ maxWidth: 'calc(100% - 900px)' }}>
          <h2 className="text-white font-light text-2xl mb-5">Guide</h2>
          <div className="text-gray-300 text-xl space-y-4">
            <p className="flex items-center gap-5">
              <span className="w-5 h-5 rounded-full bg-cyan-400 inline-block flex-shrink-0" />
              Left hand: pinch thumb + index = volume
            </p>
            <p className="flex items-center gap-5">
              <span className="w-5 h-5 rounded-full bg-blue-400 inline-block flex-shrink-0" />
              Right hand: rotate wrist = vocal scale + bass + size
            </p>
            <p className="flex items-center gap-5">
              <span className="w-5 h-5 rounded-full bg-orange-400 inline-block flex-shrink-0" />
              Right hand: tap thumb to finger = drums
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
