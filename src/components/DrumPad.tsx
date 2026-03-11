import { DrumHit } from '../services/handTracking';

interface DrumPadProps {
  activeDrum: DrumHit | null;
}

const DRUMS: { id: DrumHit; label: string; finger: string; color: string; glow: string; bg: string }[] = [
  { id: 'kick', label: 'KICK', finger: 'Index', color: 'text-orange-400', glow: 'shadow-orange-500/60', bg: 'bg-orange-500' },
  { id: 'snare', label: 'SNARE', finger: 'Middle', color: 'text-cyan-400', glow: 'shadow-cyan-500/60', bg: 'bg-cyan-500' },
  { id: 'hihat', label: 'HI-HAT', finger: 'Ring', color: 'text-lime-400', glow: 'shadow-lime-500/60', bg: 'bg-lime-500' },
  { id: 'clap', label: 'CLAP', finger: 'Pinky', color: 'text-pink-400', glow: 'shadow-pink-500/60', bg: 'bg-pink-500' },
];

export function DrumPad({ activeDrum }: DrumPadProps) {
  return (
    <div className="bg-black/70 backdrop-blur-md rounded-lg border border-gray-700/80 overflow-hidden" style={{ width: 520 }}>
      <div className="px-3 py-1.5 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-white text-xs font-medium">Drums</span>
        <div className="flex-1 flex justify-end gap-1.5">
          {DRUMS.map((drum) => {
            const isActive = activeDrum === drum.id;
            return (
              <div
                key={drum.id}
                className={`
                  relative rounded px-3 py-1 text-center transition-all duration-75 select-none border
                  ${isActive
                    ? `border-white/40 ${drum.glow} shadow-md scale-95 ${drum.bg} bg-opacity-20`
                    : 'border-gray-700/50'
                  }
                `}
                style={!isActive ? { background: 'rgba(255,255,255,0.03)' } : undefined}
              >
                <span className={`text-[11px] font-bold tracking-wide ${isActive ? 'text-white' : drum.color}`}>
                  {drum.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
