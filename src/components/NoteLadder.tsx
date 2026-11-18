interface NoteLadderProps {
  notes: readonly string[];
  current: string;
  /** False while no hand (or mouse) is playing: the ladder dims. */
  active: boolean;
}

/**
 * Every note the right hand can reach, low to high, with the one playing lit.
 * Roots (the first note of each octave) are marked, so the shape of the scale
 * is easy to see.
 */
export function NoteLadder({ notes, current, active }: NoteLadderProps) {
  const root = notes[0]?.replace(/\d+$/, '');
  return (
    <div
      className="flex gap-[3px] rounded-xl border border-white/10 bg-black/45 p-1.5 backdrop-blur-md"
      role="img"
      aria-label={active ? `Playing ${current}` : 'No note playing'}
    >
      {notes.map((note) => {
        const lit = active && note === current;
        const isRoot = note.replace(/\d+$/, '') === root;
        return (
          <div
            key={note}
            className={`flex min-w-0 flex-1 flex-col items-center justify-end rounded-md py-1 transition-colors duration-100 ${
              lit ? 'bg-sky-400 text-black shadow-[0_0_18px_rgba(56,189,248,0.7)]' : isRoot ? 'bg-white/[0.07] text-white/70' : 'bg-white/[0.03] text-white/40'
            }`}
          >
            <span className="truncate text-[10px] font-medium tabular-nums leading-none">{note.replace('#', '♯')}</span>
          </div>
        );
      })}
    </div>
  );
}
