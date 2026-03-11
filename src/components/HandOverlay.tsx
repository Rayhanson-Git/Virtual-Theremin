import { useRef, useEffect, useCallback } from 'react';
import { HandData, HAND_CONNECTIONS, DrumHit } from '../services/handTracking';

interface HandOverlayProps {
  hands: HandData[];
  width: number;
  height: number;
  activeDrum?: DrumHit | null;
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

const DRUM_COLORS: Record<DrumHit, string> = {
  kick: '#f97316',
  snare: '#22d3ee',
  hihat: '#a3e635',
  clap: '#f472b6',
};

export function HandOverlay({ hands, width, height, activeDrum }: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
  }, [hands, width, height, activeDrum]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
