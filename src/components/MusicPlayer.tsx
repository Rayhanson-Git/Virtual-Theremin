import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Music, Upload, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface MusicPlayerProps {
  /** The left-hand volume (0 to 1), read every frame while a song plays. */
  volumeRef: MutableRefObject<number>;
  /** The same value, refreshed a few times a second, for the readout. */
  volume: number;
}

const formatTime = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

/**
 * Plays an audio file of your own under the instrument. Its volume follows the
 * left hand, like the vocal. The file never leaves the browser: it is played
 * from a local object URL.
 */
export function MusicPlayer({ volumeRef, volume }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Follow the hand every frame, but only while something is playing.
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const tick = () => {
      if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volumeRef.current));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, volumeRef]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.pause();
    audio.src = url;
    audio.load();
    setFileName(file.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    e.target.value = ''; // choosing the same file again still fires a change
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !fileName) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Could not play the file:', err);
      }
    }
  }, [isPlaying, fileName]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    },
    [duration]
  );

  const skip = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, Math.min(duration || 0, audio.currentTime + seconds));
    },
    [duration]
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return (
    <section className="panel" aria-label="Music player">
      <header className="panel-head">
        <Music className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
        <h2>Music player</h2>
        <span className="ml-auto text-[11px] text-white/45">Volume follows the left hand</span>
      </header>

      <div className="p-3">
        {!fileName ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 py-3 transition-all duration-200 hover:border-emerald-500/60 hover:bg-emerald-500/5"
          >
            <Upload className="h-4 w-4 text-gray-400 transition-colors group-hover:text-emerald-400" aria-hidden="true" />
            <span className="text-sm text-gray-400 transition-colors group-hover:text-emerald-300">Choose an audio file</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-white">{fileName}</p>
                <p className="flex-shrink-0 text-[10px] tabular-nums text-gray-400">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
              <div
                className="group h-1.5 w-full cursor-pointer rounded-full bg-gray-700"
                onClick={seek}
                role="slider"
                aria-label="Position in the song"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
              >
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button type="button" onClick={() => skip(-10)} className="text-gray-400 transition-colors hover:text-white" aria-label="Back 10 seconds">
                <SkipBack className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-400"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="ml-0.5 h-4 w-4 text-white" />}
              </button>
              <button type="button" onClick={() => skip(10)} className="text-gray-400 transition-colors hover:text-white" aria-label="Forward 10 seconds">
                <SkipForward className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-shrink-0 border-l border-gray-700/50 px-2 text-center">
              <div className="text-[10px] text-gray-500">Vol</div>
              <div className="text-xs font-medium tabular-nums text-cyan-300">{Math.round(volume * 100)}%</div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 text-gray-500 transition-colors hover:text-gray-300"
              aria-label="Choose another file"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />
      </div>
    </section>
  );
}
