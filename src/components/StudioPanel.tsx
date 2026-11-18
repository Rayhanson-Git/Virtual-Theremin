import { Circle, Download, Eraser, Mic, Play, Square } from 'lucide-react';
import { ROOTS, SCALES, VOICES, type Root } from '../services/sound';
import { DRUMS, MAX_BPM, MIN_BPM, STEPS, patternGrid } from '../services/pattern';
import type { RhythmSnapshot } from '../services/rhythm';
import { DRUM_COLORS } from '../services/liveState';

export interface SoundSettings {
  root: Root;
  scale: string;
  voice: string;
}

interface StudioPanelProps {
  sound: SoundSettings;
  onSound: (next: SoundSettings) => void;
  rhythm: RhythmSnapshot;
  onBpm: (bpm: number) => void;
  onMetronome: (on: boolean) => void;
  onQuantise: (on: boolean) => void;
  onLoopRecord: () => void;
  onLoopPlay: () => void;
  onLoopClear: () => void;
  recording: { supported: boolean; active: boolean; seconds: number; url: string | null; fileName: string };
  onRecordToggle: () => void;
}

const LOOP_LABEL: Record<RhythmSnapshot['state'], string> = {
  empty: 'Empty: press Record, then play a bar',
  'count-in': 'Count-in: recording starts on the next bar',
  recording: 'Recording this bar…',
  playing: 'Looping',
  stopped: 'Stopped',
};

const DRUM_NAMES = { kick: 'Kick', snare: 'Snare', hihat: 'Hi-hat', clap: 'Clap' } as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function StudioPanel(props: StudioPanelProps) {
  const { sound, onSound, rhythm, recording } = props;
  const grid = patternGrid(rhythm.pattern);
  const busy = rhythm.state === 'count-in' || rhythm.state === 'recording';
  const running = rhythm.step >= 0;

  return (
    <section className="panel" aria-label="Studio">
      <header className="panel-head">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
        <h2>Studio</h2>
      </header>

      <div className="space-y-4 p-3">
        {/* ---- sound ---- */}
        <div className="grid grid-cols-3 gap-2">
          <label className="field">
            <span>Key</span>
            <select aria-label="Key" value={sound.root} onChange={(e) => onSound({ ...sound, root: e.target.value as Root })}>
              {ROOTS.map((r) => (
                <option key={r} value={r}>
                  {r.replace('#', '♯')}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Scale</span>
            <select aria-label="Scale" value={sound.scale} onChange={(e) => onSound({ ...sound, scale: e.target.value })}>
              {SCALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Voice</span>
            <select
              aria-label="Voice"
              value={sound.voice}
              onChange={(e) => onSound({ ...sound, voice: e.target.value })}
              title={VOICES.find((v) => v.id === sound.voice)?.description}
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* ---- tempo ---- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-xs text-white/60">
            <span className="w-16 tabular-nums text-white/85">{rhythm.bpm} BPM</span>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={rhythm.bpm}
              onChange={(e) => props.onBpm(Number(e.target.value))}
              className="flex-1 accent-sky-400"
              aria-label="Tempo in beats per minute"
            />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={rhythm.metronome} onChange={(e) => props.onMetronome(e.target.checked)} />
            Metronome
          </label>
          <label className="toggle">
            <input type="checkbox" checked={rhythm.quantise} onChange={(e) => props.onQuantise(e.target.checked)} />
            Quantise
          </label>
        </div>

        {/* ---- looper ---- */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <button type="button" className={`chip ${busy ? 'chip-live' : ''}`} onClick={props.onLoopRecord} disabled={busy}>
              <Circle className="h-3 w-3 fill-current" aria-hidden="true" />
              {rhythm.pattern.length ? 'Overdub' : 'Record bar'}
            </button>
            <button type="button" className="chip" onClick={props.onLoopPlay} aria-label={running ? 'Stop the loop' : 'Play the loop'}>
              {running ? <Square className="h-3 w-3 fill-current" aria-hidden="true" /> : <Play className="h-3 w-3 fill-current" aria-hidden="true" />}
              {running ? 'Stop' : 'Play'}
            </button>
            <button type="button" className="chip" onClick={props.onLoopClear} disabled={!rhythm.pattern.length}>
              <Eraser className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          </div>
          <p className="mb-2 text-[11px] text-white/45" role="status">
            {LOOP_LABEL[rhythm.state]}
          </p>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `3.25rem repeat(${STEPS}, minmax(0, 1fr))` }} aria-label="Loop pattern" role="img">
            {DRUMS.map((drum) => (
              <div key={drum} className="contents">
                <span className="self-center text-[10px] text-white/45">{DRUM_NAMES[drum]}</span>
                {grid[drum].map((on, i) => (
                  <span
                    key={i}
                    className="h-3.5 rounded-[3px]"
                    style={{
                      background: on ? DRUM_COLORS[drum] : i % 4 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                      outline: rhythm.step === i ? '1px solid rgba(255,255,255,0.7)' : undefined,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ---- record the performance ---- */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            className={`chip ${recording.active ? 'chip-live' : ''}`}
            onClick={props.onRecordToggle}
            disabled={!recording.supported}
            title={recording.supported ? undefined : 'This browser cannot record audio'}
          >
            {recording.active ? <Square className="h-3 w-3 fill-current" aria-hidden="true" /> : <Mic className="h-3 w-3" aria-hidden="true" />}
            {recording.active ? `Stop · ${fmt(recording.seconds)}` : 'Record performance'}
          </button>
          {recording.url && !recording.active && (
            <a className="chip" href={recording.url} download={recording.fileName}>
              <Download className="h-3 w-3" aria-hidden="true" />
              Download take
            </a>
          )}
          {recording.url && !recording.active && (
            <audio className="h-8 min-w-0 flex-1" src={recording.url} controls aria-label="Your last take" />
          )}
        </div>
      </div>
    </section>
  );
}
