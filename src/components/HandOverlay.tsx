import { MutableRefObject, useEffect, useRef } from 'react';
import { HAND_CONNECTIONS, DrumHit } from '../services/handTracking';
import { DRUM_COLORS, type LiveState } from '../services/liveState';

interface HandOverlayProps {
  live: MutableRefObject<LiveState>;
  /** Size of the camera image, so the drawing lines up with the video. */
  width: number;
  height: number;
}
const HAND_COLORS: Record<string, { dot: string; line: string; pinch: string }> = {
  Left: { dot: '#22d3ee', line: 'rgba(34, 211, 238, 0.35)', pinch: 'rgba(250, 204, 21, 0.8)' },
  Right: { dot: '#60a5fa', line: 'rgba(96, 165, 250, 0.35)', pinch: 'rgba(250, 204, 21, 0.8)' },
};

const DRUM_FINGER_MAP: Record<DrumHit, number> = {
  kick: 8,
  snare: 12,
  hihat: 16,
  clap: 20,
};


/**
 * Draws the tracked hands over the camera preview: the skeleton, the left-hand
 * pinch line, and a flash between thumb and finger when a drum fires. It reads
 * the live values in its own animation loop rather than through React.
 */
export function HandOverlay({ live, width, height }: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let frame = 0;
    let lastHands: unknown = null;
    let lastDrum: DrumHit | null = null;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const { hands, activeDrum } = live.current;
      if (hands === lastHands && activeDrum === lastDrum) return; // nothing new to draw
      lastHands = hands;
      lastDrum = activeDrum;

      ctx.clearRect(0, 0, width, height);

      for (const hand of hands) {
        const colors = HAND_COLORS[hand.label] || HAND_COLORS.Right;

        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 1;
        for (const [start, end] of HAND_CONNECTIONS) {
          const a = hand.landmarks[start];
          const b = hand.landmarks[end];
          if (!a || !b) continue;
          ctx.beginPath();
          ctx.moveTo(a.x * width, a.y * height);
          ctx.lineTo(b.x * width, b.y * height);
          ctx.stroke();
        }

        if (hand.label === 'Left') {
          const thumb = hand.landmarks[4];
          const index = hand.landmarks[8];
          if (thumb && index) {
            ctx.strokeStyle = colors.pinch;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(thumb.x * width, thumb.y * height);
            ctx.lineTo(index.x * width, index.y * height);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        if (hand.label === 'Right' && activeDrum) {
          const thumb = hand.landmarks[4];
          const fingerTip = hand.landmarks[DRUM_FINGER_MAP[activeDrum]];
          if (thumb && fingerTip) {
            const cx = ((thumb.x + fingerTip.x) / 2) * width;
            const cy = ((thumb.y + fingerTip.y) / 2) * height;
            const color = DRUM_COLORS[activeDrum];

            ctx.save();
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(thumb.x * width, thumb.y * height);
            ctx.lineTo(fingerTip.x * width, fingerTip.y * height);
            ctx.stroke();
            ctx.restore();
          }
        }

        for (const landmark of hand.landmarks) {
          ctx.fillStyle = colors.dot;
          ctx.beginPath();
          ctx.arc(landmark.x * width, landmark.y * height, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(landmark.x * width, landmark.y * height, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [live, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
