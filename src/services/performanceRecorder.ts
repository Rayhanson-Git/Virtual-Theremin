import * as Tone from 'tone';

/**
 * Records everything the instrument plays (vocal, bass, drums, looper and
 * metronome) straight from Tone's output, using the browser's MediaRecorder.
 * The song loaded in the music player plays through a separate element and is
 * not part of the recording.
 */
export class PerformanceRecorder {
  private recorder: Tone.Recorder | null = null;
  private startedAt = 0;

  static get supported(): boolean {
    return typeof window !== 'undefined' && 'MediaRecorder' in window && Tone.Recorder.supported;
  }

  get recording(): boolean {
    return this.recorder?.state === 'started';
  }

  /** Seconds since recording started, or 0. */
  elapsed(): number {
    return this.recording ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  async start(): Promise<void> {
    if (!PerformanceRecorder.supported || this.recording) return;
    this.recorder = new Tone.Recorder();
    Tone.getDestination().connect(this.recorder);
    await this.recorder.start();
    this.startedAt = performance.now();
  }

  /** Stops and returns the audio as a Blob (WebM/Opus in Chrome, Ogg or MP4 elsewhere). */
  async stop(): Promise<Blob | null> {
    if (!this.recorder || !this.recording) return null;
    const blob = await this.recorder.stop();
    Tone.getDestination().disconnect(this.recorder);
    this.recorder.dispose();
    this.recorder = null;
    return blob;
  }

  destroy(): void {
    if (this.recorder) {
      if (this.recording) void this.recorder.stop();
      this.recorder.dispose();
      this.recorder = null;
    }
  }
}

/** A file name such as virtual-theremin-2026-11-18-0912.webm. */
export function recordingFileName(blob: Blob, date = new Date()): string {
  const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `virtual-theremin-${stamp}.${ext}`;
}
