import { useState, useRef, useCallback, useEffect } from 'react';
import { Music, Upload, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface MusicPlayerProps {
  volume: number;
}

export function MusicPlayer({ volume }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    audioRef.current.src = url;
    audioRef.current.load();
    setFileName(file.name);
    setIsPlaying(false);
    setCurrentTime(0);

    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current?.duration ?? 0);
    };

    audioRef.current.ontimeupdate = () => {
      setCurrentTime(audioRef.current?.currentTime ?? 0);
    };

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !fileName) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, fileName]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  }, [duration]);

  const skipBack = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  }, []);

  const skipForward = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  }, [duration]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-black/70 backdrop-blur-md rounded-xl border border-gray-700/80 overflow-hidden" style={{ width: 520 }}>
      <div className="px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
        <Music className="w-4 h-4 text-emerald-400" />
        <span className="text-white text-sm font-medium">Music Player</span>
      </div>

      <div className="p-3">
        {!fileName ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-600 rounded-lg
                     hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all duration-200 group"
          >
            <Upload className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
            <span className="text-gray-400 group-hover:text-emerald-300 text-sm transition-colors">
              Choose audio file
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-white text-xs truncate">{fileName}</p>
                <p className="text-gray-400 text-[10px] tabular-nums flex-shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</p>
              </div>
              <div
                className="w-full h-1.5 bg-gray-700 rounded-full cursor-pointer group"
                onClick={seek}
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full relative transition-all duration-100"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md
                                opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={skipBack} className="text-gray-400 hover:text-white transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center
                         transition-colors shadow-lg shadow-emerald-500/30"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </button>
              <button onClick={skipForward} className="text-gray-400 hover:text-white transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-shrink-0 text-center px-2 border-l border-gray-700/50">
              <div className="text-gray-500 text-[10px]">Vol</div>
              <div className="text-cyan-300 font-medium tabular-nums text-xs">{Math.round(volume * 100)}%</div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
