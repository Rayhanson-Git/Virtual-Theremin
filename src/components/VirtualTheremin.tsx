import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Camera, Hand, Mouse } from 'lucide-react';
import { HandTrackingService, HandPositions, DrumHit, RightHandTaps } from '../services/handTracking';
import { AudioSynthesisService } from '../services/audioSynthesis';
import { DrumSynthesisService, DrumStatus } from '../services/drumSynthesis';
import { RhythmService, RhythmSnapshot } from '../services/rhythm';
import { PerformanceRecorder, recordingFileName } from '../services/performanceRecorder';
import { DRUM_COLORS, DRUM_PADS, UI_UPDATE_MS, createLiveState, smoothValue } from '../services/liveState';
import { DEFAULT_ROOT, DEFAULT_SCALE, DEFAULT_VOICE, buildScale } from '../services/sound';
import { DEFAULT_BPM } from '../services/pattern';
import { ThreeVisualization } from './ThreeVisualization';
import { HandOverlay } from './HandOverlay';
import { MusicPlayer } from './MusicPlayer';
import { DrumPad } from './DrumPad';
import { NoteLadder } from './NoteLadder';
import { StudioPanel, SoundSettings } from './StudioPanel';
import { PlayPad } from './PlayPad';

type Phase = 'idle' | 'starting' | 'running';
type Mode = 'camera' | 'mouse';

/** What the panels show; refreshed at most every UI_UPDATE_MS. */
interface UiState {
  leftPinch: number | null;
  rightRotation: number | null;
  leftPresent: boolean;
  rightPresent: boolean;
  hands: number;
  note: string;
  frequency: number;
  volume: number;
  bass: number;
}

const INITIAL_UI: UiState = {
  leftPinch: null,
  rightRotation: null,
  leftPresent: false,
  rightPresent: false,
  hands: 0,
  note: 'C4',
  frequency: 440,
  volume: 0,
  bass: 0,
};

const NO_TAPS: RightHandTaps = { kick: false, snare: false, hihat: false, clap: false };
const DRUM_ORDER: [keyof RightHandTaps, DrumHit][] = [
  ['kick', 'kick'],
  ['snare', 'snare'],
  ['hihat', 'hihat'],
  ['clap', 'clap'],
];
const KEY_TO_DRUM: Record<string, DrumHit> = Object.fromEntries(DRUM_PADS.map((d) => [d.key.toLowerCase(), d.id]));

const INITIAL_RHYTHM: RhythmSnapshot = { state: 'empty', bpm: DEFAULT_BPM, metronome: false, quantise: true, pattern: [], step: -1 };

/** Turns a getUserMedia or model-loading failure into a sentence a person can act on. */
function describeStartError(err: unknown): string {
  const name = err instanceof DOMException || err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera access was blocked. Allow the camera for this site in the address bar, then try again, or play with the mouse and keyboard.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No camera was found. Connect one and try again, or play with the mouse and keyboard.';
  if (name === 'NotReadableError') return 'The camera is in use by another app. Close it and try again.';
  return 'The hand-tracking model could not load. Check your connection and try again, or play with the mouse and keyboard.';
}

export function VirtualTheremin() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('camera');
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<UiState>(INITIAL_UI);
  const [activeDrum, setActiveDrum] = useState<DrumHit | null>(null);
  const [drumStatus, setDrumStatus] = useState<DrumStatus>('loading');
  const [videoSize, setVideoSize] = useState({ width: 1280, height: 720 });
  const [sound, setSound] = useState<SoundSettings>({ root: DEFAULT_ROOT, scale: DEFAULT_SCALE, voice: DEFAULT_VOICE });
  const [notes, setNotes] = useState<readonly string[]>(() => buildScale());
  const [rhythm, setRhythm] = useState<RhythmSnapshot>(INITIAL_RHYTHM);
  const [take, setTake] = useState<{ active: boolean; seconds: number; url: string | null; fileName: string }>({
    active: false,
    seconds: 0,
    url: null,
    fileName: '',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const live = useRef(createLiveState());
  const target = useRef<HandPositions>({ leftPinch: null, rightFingerSpread: null, rightRotation: null, rightTaps: NO_TAPS, hands: [] });
  const musicVolume = useRef(0);
  const tracking = useRef<HandTrackingService | null>(null);
  const audio = useRef<AudioSynthesisService | null>(null);
  const drums = useRef<DrumSynthesisService | null>(null);
  const rhythmService = useRef<RhythmService | null>(null);
  const recorder = useRef<PerformanceRecorder | null>(null);
  const drumTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopFrame = useRef<number | null>(null);

  // ------------------------------------------------------------ drums

  /** The flash on the pads, the overlay and the 3D scene. */
  const showDrum = useCallback((drum: DrumHit) => {
    const state = live.current;
    state.activeDrum = drum;
    state.drumPulse = 1;
    state.drumColor = DRUM_COLORS[drum];
    setActiveDrum(drum);
    if (drumTimeout.current) clearTimeout(drumTimeout.current);
    drumTimeout.current = setTimeout(() => {
      live.current.activeDrum = null;
      setActiveDrum(null);
    }, 200);
  }, []);

  /** A drum played live: by a finger tap, a key or a click. */
  const hitDrum = useCallback(
    (drum: DrumHit) => {
      drums.current?.trigger(drum);
      rhythmService.current?.noteHit(drum);
      showDrum(drum);
    },
    [showDrum]
  );

  // ------------------------------------------------------------ input

  /** Every input source (camera or mouse) ends up here. */
  const applyPositions = useCallback(
    (positions: HandPositions) => {
      target.current = positions;
      live.current.hands = positions.hands;

      const synth = audio.current;
      if (synth) {
        synth.setVolume(positions.leftPinch);
        synth.setPitch(positions.rightRotation);
        synth.setBass(positions.rightRotation);
        const state = live.current;
        state.frequency = synth.getCurrentFrequency();
        state.volume = synth.getCurrentVolume();
        state.bass = synth.getCurrentBass();
        state.note = synth.getCurrentNote();
        musicVolume.current = state.volume;
      }

      for (const [key, drum] of DRUM_ORDER) if (positions.rightTaps[key]) hitDrum(drum);
    },
    [hitDrum]
  );

  // Smoothing for the panels, and a throttled hand-off to React.
  const startUiLoop = useCallback(() => {
    let lastCommit = 0;
    const step = (now: number) => {
      const state = live.current;
      const t = target.current;
      state.leftPinch = smoothValue(state.leftPinch, t.leftPinch, 0.2);
      state.rightRotation = smoothValue(state.rightRotation, t.rightRotation, 0.2);
      if (now - lastCommit >= UI_UPDATE_MS) {
        lastCommit = now;
        setUi({
          leftPinch: state.leftPinch,
          rightRotation: state.rightRotation,
          leftPresent: t.leftPinch !== null,
          rightPresent: t.rightRotation !== null,
          hands: t.hands.length,
          note: state.note,
          frequency: state.frequency,
          volume: state.volume,
          bass: state.bass,
        });
      }
      loopFrame.current = requestAnimationFrame(step);
    };
    loopFrame.current = requestAnimationFrame(step);
  }, []);

  // ------------------------------------------------------------ start

  /** Sound engine, drums, looper and recorder: set up once, whichever input starts first. */
  const ensureAudio = useCallback(async () => {
    if (audio.current) return;
    await Tone.start();
    const synth = new AudioSynthesisService();
    await synth.initialize();
    audio.current = synth;

    const kit = new DrumSynthesisService();
    drums.current = kit;
    void kit.initialize().then(setDrumStatus);

    const r = new RhythmService((drum, time) => {
      kit.trigger(drum, time);
      Tone.getDraw().schedule(() => showDrum(drum), time ?? Tone.now());
    });
    r.initialize();
    r.subscribe(() => setRhythm(r.snapshot()));
    rhythmService.current = r;
    setRhythm(r.snapshot());

    recorder.current = new PerformanceRecorder();
    startUiLoop();
  }, [showDrum, startUiLoop]);

  const startCamera = async () => {
    setPhase((p) => (p === 'running' ? p : 'starting'));
    setError(null);
    // Start the audio context inside the click, before any slow await, so the
    // browser still counts it as a user gesture.
    const audioReady = Tone.start();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 16 / 9 } },
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setVideoSize({ width: video.videoWidth || 1280, height: video.videoHeight || 720 });

      const service = new HandTrackingService();
      await service.initialize(video);
      tracking.current = service;

      await audioReady;
      await ensureAudio();
      service.startTracking(applyPositions);
      setMode('camera');
      setPhase('running');
    } catch (err) {
      console.error('Error starting the camera:', err);
      (videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
      setError(describeStartError(err));
      setPhase((p) => (p === 'running' ? p : 'idle'));
    }
  };

  const startMouse = async () => {
    setError(null);
    setPhase('starting');
    try {
      await ensureAudio();
      setMode('mouse');
      setPhase('running');
    } catch (err) {
      console.error('Error starting audio:', err);
      setError('Sound could not start in this browser.');
      setPhase('idle');
    }
  };

  // ------------------------------------------------------------ settings

  const changeSound = (next: SoundSettings) => {
    setSound(next);
    const scale = buildScale(next.root, next.scale);
    setNotes(scale);
    audio.current?.setScale(scale);
    if (next.voice !== sound.voice) audio.current?.setVoice(next.voice);
  };

  const toggleTake = async () => {
    const rec = recorder.current;
    if (!rec) return;
    if (rec.recording) {
      const blob = await rec.stop();
      if (blob) {
        setTake((t) => {
          if (t.url) URL.revokeObjectURL(t.url);
          return { active: false, seconds: 0, url: URL.createObjectURL(blob), fileName: recordingFileName(blob) };
        });
      }
    } else {
      await rec.start();
      setTake((t) => ({ ...t, active: true, seconds: 0 }));
    }
  };

  useEffect(() => {
    if (!take.active) return;
    const id = setInterval(() => setTake((t) => ({ ...t, seconds: recorder.current?.elapsed() ?? 0 })), 250);
    return () => clearInterval(id);
  }, [take.active]);

  // A S D F play the drums, in either mode.
  useEffect(() => {
    if (phase !== 'running') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea')) return;
      const drum = KEY_TO_DRUM[e.key.toLowerCase()];
      if (drum) {
        e.preventDefault();
        hitDrum(drum);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, hitDrum]);

  // Tear everything down when the page goes away.
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (loopFrame.current) cancelAnimationFrame(loopFrame.current);
      if (drumTimeout.current) clearTimeout(drumTimeout.current);
      tracking.current?.destroy();
      rhythmService.current?.destroy();
      recorder.current?.destroy();
      audio.current?.destroy();
      drums.current?.destroy();
      (video?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ------------------------------------------------------------ view

  const running = phase === 'running';
  const leftPinch = ui.leftPinch;
  const rotation = ui.rightRotation;
  const cameraOn = running && mode === 'camera';

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden text-white">
      <ThreeVisualization live={live} />

      <div className="mx-auto flex max-w-[1800px] flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:grid lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.55fr)] lg:items-start">
        {/* ---- header ---- */}
        <header className="flex items-center gap-3 lg:col-span-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
            <Hand className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <h1 className="whitespace-nowrap text-lg font-light tracking-wide sm:text-xl">Virtual Theremin</h1>
          {running && (
            <span className="hidden rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] text-white/60 sm:inline" role="status">
              {mode === 'camera' ? `Camera · ${ui.hands} ${ui.hands === 1 ? 'hand' : 'hands'} in view` : 'Mouse and keyboard'}
            </span>
          )}
          {running && mode === 'mouse' && (
            <button type="button" className="chip ml-auto" onClick={startCamera}>
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              Use the camera
            </button>
          )}
        </header>

        {/* ---- the stage: camera with hand overlay, or the mouse pad ---- */}
        <div className="order-1 flex flex-col gap-3 lg:order-none lg:col-start-2 lg:row-start-2">
          <div
            className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60 ${cameraOn || phase !== 'running' ? '' : 'hidden'}`}
            style={{ aspectRatio: `${videoSize.width} / ${videoSize.height}` }}
          >
            <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" playsInline muted aria-label="Your camera, mirrored" />
            <div className="absolute inset-0 -scale-x-100">
              <HandOverlay live={live} width={videoSize.width} height={videoSize.height} />
            </div>
            {cameraOn && ui.hands === 0 && (
              <p className="absolute inset-x-0 bottom-4 text-center text-sm text-white/70">Raise both hands into view, palms to the camera</p>
            )}
          </div>
          {running && mode === 'mouse' && <PlayPad notes={notes} onChange={applyPositions} note={ui.note} playing={ui.rightPresent} />}
          {running && <NoteLadder notes={notes} current={ui.note} active={ui.rightPresent && ui.volume > 0.01} />}
          {running && <Guide mode={mode} />}
        </div>

        {/* ---- controls ---- */}
        {running && (
          <div className="order-2 flex flex-col gap-3 lg:order-none lg:col-start-1 lg:row-start-2">
            <div className="grid grid-cols-2 gap-3">
              <GesturePanel
                title="Volume"
                hint={mode === 'camera' ? 'Left hand · pinch closer = quieter' : 'Mouse height · higher = louder'}
                accent="cyan"
                present={ui.leftPresent}
                value={leftPinch}
                scale={leftPinch === null ? 1 : 0.6 + leftPinch * 0.8}
                readout={<span className="text-xl tabular-nums text-cyan-200">{Math.round((leftPinch ?? 0) * 100)}%</span>}
                bars={[{ value: leftPinch ?? 0, from: 'from-cyan-500', to: 'to-cyan-300' }]}
              />
              <GesturePanel
                title="Vocal + bass"
                hint={mode === 'camera' ? 'Right hand · turn the wrist' : 'Mouse across · left = low'}
                accent="blue"
                present={ui.rightPresent}
                value={rotation}
                rotate={rotation === null ? 0 : (rotation - 0.5) * 180}
                scale={0.8 + ui.bass * 0.6}
                readout={
                  <span className="flex flex-col items-center leading-tight">
                    <span className="text-xl font-medium text-blue-100">{ui.note.replace('#', '♯')}</span>
                    <span className="text-xs tabular-nums text-blue-300/60">{Math.round(ui.frequency)} Hz</span>
                  </span>
                }
                bars={[
                  { value: rotation ?? 0, from: 'from-blue-500', to: 'to-blue-300' },
                  { value: ui.bass, from: 'from-orange-500', to: 'to-amber-400', label: `bass ${Math.round(ui.bass * 100)}%` },
                ]}
              />
            </div>
            <DrumPad activeDrum={activeDrum} status={drumStatus} onHit={hitDrum} />
            <StudioPanel
              sound={sound}
              onSound={changeSound}
              rhythm={rhythm}
              onBpm={(bpm) => rhythmService.current?.setBpm(bpm)}
              onMetronome={(on) => rhythmService.current?.setMetronome(on)}
              onQuantise={(on) => rhythmService.current?.setQuantise(on)}
              onLoopRecord={() => rhythmService.current?.record()}
              onLoopPlay={() => rhythmService.current?.togglePlay()}
              onLoopClear={() => rhythmService.current?.clear()}
              recording={{ supported: PerformanceRecorder.supported, ...take }}
              onRecordToggle={toggleTake}
            />
            <MusicPlayer volumeRef={musicVolume} volume={ui.volume} />
          </div>
        )}
      </div>

      {/* ---- start screen ---- */}
      {!running && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl space-y-8 text-center">
            <div className="flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 sm:h-28 sm:w-28">
                <Hand className="h-12 w-12 text-white sm:h-14 sm:w-14" aria-hidden="true" />
              </div>
            </div>

            <h1 className="text-4xl font-light tracking-wide text-white sm:text-6xl">Virtual Theremin</h1>

            <ul className="mx-auto max-w-lg space-y-2 text-left text-base leading-relaxed text-gray-300 sm:text-lg">
              <li>
                <span className="text-cyan-400">Left hand</span>: pinch thumb and index closer for quieter, apart for louder
              </li>
              <li>
                <span className="text-blue-400">Right hand</span>: turn the wrist to move the vocal up the scale and raise the bass
              </li>
              <li>
                <span className="text-orange-400">Right hand</span>: tap the thumb to each finger for kick, snare, hi-hat and clap
              </li>
              <li>
                <span className="text-emerald-400">Studio</span>: change key, scale and voice, loop a bar of drums, record your take
              </li>
            </ul>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={startCamera}
                disabled={phase === 'starting'}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera className="h-5 w-5" aria-hidden="true" />
                {phase === 'starting' ? 'Starting…' : 'Start with the camera'}
              </button>
              <button
                type="button"
                onClick={startMouse}
                disabled={phase === 'starting'}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-4 text-base text-white/85 transition-colors hover:border-white/40 hover:bg-white/5 disabled:opacity-50"
              >
                <Mouse className="h-5 w-5" aria-hidden="true" />
                Play with mouse and keyboard
              </button>
            </div>

            <p className="text-sm text-white/45">
              The camera image stays in your browser. Use headphones or speakers, and good light on both hands.
            </p>

            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-base text-red-200" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ parts

interface GesturePanelProps {
  title: string;
  hint: string;
  accent: 'cyan' | 'blue';
  present: boolean;
  value: number | null;
  scale: number;
  rotate?: number;
  readout: React.ReactNode;
  bars: { value: number; from: string; to: string; label?: string }[];
}

const ACCENT = {
  cyan: { ring: 'border-cyan-400', icon: 'text-cyan-400', glow: 'bg-cyan-400/20', title: 'text-cyan-300', frame: 'border-cyan-500/25 bg-cyan-500/[0.04]' },
  blue: { ring: 'border-blue-400', icon: 'text-blue-400', glow: 'bg-blue-400/20', title: 'text-blue-300', frame: 'border-blue-500/25 bg-blue-500/[0.04]' },
};

function GesturePanel({ title, hint, accent, present, value, scale, rotate = 0, readout, bars }: GesturePanelProps) {
  const a = ACCENT[accent];
  return (
    <section className={`relative flex min-h-[15rem] flex-col overflow-hidden rounded-2xl border backdrop-blur-sm ${a.frame}`} aria-label={title}>
      <div className="px-4 pt-3">
        <h2 className={`text-sm font-medium uppercase tracking-[0.14em] ${a.title}`}>{title}</h2>
        <p className="text-xs text-white/40">{hint}</p>
      </div>
      <div className={`flex flex-1 flex-col items-center justify-center gap-5 py-4 transition-opacity duration-300 ${present ? 'opacity-100' : 'opacity-35'}`}>
        <div className="relative flex items-center justify-center">
          <div
            className={`absolute rounded-full blur-2xl transition-all duration-150 ${a.glow}`}
            style={{ width: 70 + (value ?? 0) * 90, height: 70 + (value ?? 0) * 90 }}
            aria-hidden="true"
          />
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border-[3px] transition-transform duration-150 ${a.ring}`}
            style={{ transform: `rotate(${rotate}deg) scale(${scale})` }}
          >
            <Hand className={`h-9 w-9 ${a.icon}`} aria-hidden="true" />
          </div>
        </div>
        {readout}
      </div>
      <div className="space-y-1.5 px-4 pb-4">
        {bars.map((b, i) => (
          <div key={i}>
            <div className={`w-full overflow-hidden rounded-full bg-gray-700/50 ${i === 0 ? 'h-2.5' : 'h-2'}`}>
              <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-150 ${b.from} ${b.to}`} style={{ width: `${b.value * 100}%` }} />
            </div>
            {b.label && <p className="mt-1 text-right text-[11px] text-amber-300/60">{b.label}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Guide({ mode }: { mode: Mode }) {
  const rows =
    mode === 'camera'
      ? [
          ['bg-cyan-400', 'Left hand: pinch thumb and index, closer = quieter'],
          ['bg-blue-400', 'Right hand: turn the wrist = vocal note, bass and size'],
          ['bg-orange-400', 'Right hand: thumb to index, middle, ring, pinky = kick, snare, hi-hat, clap'],
          ['bg-white/50', 'Keys A S D F play the drums too'],
        ]
      : [
          ['bg-blue-400', 'Hold the mouse button on the pad to play; left to right = low to high'],
          ['bg-cyan-400', 'Up and down = louder and quieter'],
          ['bg-orange-400', 'A S D F = kick, snare, hi-hat, clap (or click the pads)'],
        ];
  return (
    <section className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-md" aria-label="How to play">
      <ul className="grid gap-x-6 gap-y-1.5 text-sm text-gray-300 sm:grid-cols-2">
        {rows.map(([dot, text]) => (
          <li key={text} className="flex items-start gap-2.5">
            <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
