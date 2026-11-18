import { useRef, useState } from 'react';
import type { HandPositions } from '../services/handTracking';

interface PlayPadProps {
  notes: readonly string[];
  note: string;
  playing: boolean;
  onChange: (positions: HandPositions) => void;
}

// Space at each side, so the end notes and their labels are not on the edge.
const INSET = 24;
const at = (fraction: number) => `calc(${INSET}px + ${fraction} * (100% - ${INSET * 2}px))`;

const NO_TAPS = { kick: false, snare: false, hihat: false, clap: false };
const SILENT: HandPositions = { leftPinch: null, rightFingerSpread: null, rightRotation: null, rightTaps: NO_TAPS, hands: [] };

/**
 * The instrument without a camera. Hold the mouse button (or a finger) on the
 * pad: across is the right hand's turn (pitch and bass), up and down is the
 * left hand's pinch (volume). Letting go is the same as taking the hands away.
 */
export function PlayPad({ notes, note, playing, onChange }: PlayPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  const send = (e: React.PointerEvent) => {
    const rect = padRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left - INSET) / (rect.width - INSET * 2)));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPoint({ x, y });
    onChange({ leftPinch: 1 - y, rightFingerSpread: null, rightRotation: x, rightTaps: NO_TAPS, hands: [] });
  };

  const stop = () => {
    setPoint(null);
    onChange(SILENT);
  };

  return (
    <div
      ref={padRef}
      className="relative aspect-[16/8] w-full touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        send(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons || e.pointerType === 'touch') send(e);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      role="application"
      aria-label="Play pad. Hold and move: left to right changes the note, up and down changes the volume."
    >
      {/* one column per note, centred where the pad lands on it */}
      {notes.map((n, i) => {
        const lit = playing && n === note;
        return (
          <div key={n} className="absolute inset-y-0" style={{ left: at(i / (notes.length - 1)) }} aria-hidden="true">
            <div className={`absolute inset-y-0 w-px ${lit ? 'bg-sky-300/80' : 'bg-white/[0.06]'}`} />
            <span className={`absolute bottom-2 -translate-x-1/2 text-[10px] ${lit ? 'text-sky-200' : 'text-white/25'}`}>
              {notes.length <= 24 || i % 2 === 0 ? n.replace('#', '♯') : ''}
            </span>
          </div>
        );
      })}
      <span className="absolute left-8 top-2 text-[11px] uppercase tracking-[0.14em] text-white/35">Louder</span>
      <span className="absolute bottom-7 left-8 text-[11px] uppercase tracking-[0.14em] text-white/35">Quieter</span>
      {!point && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-white/55">Press and hold here, then move</p>
      )}
      {point && (
        <div
          className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300 bg-sky-400/25 shadow-[0_0_30px_rgba(56,189,248,0.6)]"
          style={{ left: at(point.x), top: `${point.y * 100}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
