import { DrumHit } from '../services/handTracking';
import type { DrumStatus } from '../services/drumSynthesis';
import { DRUM_COLORS, DRUM_PADS } from '../services/liveState';

interface DrumPadProps {
  activeDrum: DrumHit | null;
  status: DrumStatus;
  onHit: (drum: DrumHit) => void;
}


const STATUS_TEXT: Record<DrumStatus, string> = {
  loading: 'Loading samples…',
  ready: 'Thumb to finger, a key, or a click',
  partial: 'Some samples failed to load',
  failed: 'Drum samples could not load',
};

export function DrumPad({ activeDrum, status, onHit }: DrumPadProps) {
  const broken = status === 'failed' || status === 'partial';
  return (
    <section className="panel" aria-label="Drums">
      <header className="panel-head">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" aria-hidden="true" />
        <h2>Drums</h2>
        <span className={`ml-auto text-[11px] ${broken ? 'text-red-300' : 'text-white/45'}`} role="status">
          {STATUS_TEXT[status]}
        </span>
      </header>
      <div className="grid grid-cols-4 gap-2 p-3">
        {DRUM_PADS.map((drum) => {
          const isActive = activeDrum === drum.id;
          const color = DRUM_COLORS[drum.id];
          return (
            <button
              key={drum.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onHit(drum.id);
              }}
              className="group relative rounded-xl border px-2 py-2.5 text-center transition-[transform,background-color,border-color] duration-75 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: isActive ? color : 'rgba(255,255,255,0.1)',
                background: isActive ? `${color}40` : 'rgba(255,255,255,0.03)',
                transform: isActive ? 'scale(0.95)' : undefined,
                boxShadow: isActive ? `0 0 24px ${color}66` : undefined,
                outlineColor: color,
              }}
              aria-label={`${drum.label}: ${drum.finger.toLowerCase()} finger, or key ${drum.key}`}
            >
              <span className="block text-xs font-semibold tracking-wide" style={{ color: isActive ? '#fff' : color }}>
                {drum.label}
              </span>
              <span className="mt-0.5 block text-[10px] text-white/40">
                {drum.finger} · <kbd className="font-mono">{drum.key}</kbd>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
