import React, { useRef, useEffect, useCallback } from 'react';
import type { Topic } from '../../types';

interface WheelCanvasProps {
  topics: Topic[];
  rotationAngle: number;
  size?: number;
  sliceColors?: string[];
}

const DEFAULT_SLICE_COLORS = [
  '#9333ea', // purple-600
  '#2563eb', // blue-600
  '#0d9488', // teal-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#c026d3', // fuchsia-600
  '#0284c7', // sky-600
  '#ea580c', // orange-600
];

export const WheelCanvas: React.FC<WheelCanvasProps> = ({
  topics,
  rotationAngle,
  size = 460,
  sliceColors = DEFAULT_SLICE_COLORS,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawWheel = useCallback(
    (angle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const center = size / 2;
      const radius = center - 18;
      const totalSlices = topics.length;
      if (totalSlices === 0) return;

      const sliceAngle = (2 * Math.PI) / totalSlices;

      ctx.clearRect(0, 0, size, size);

      // Outer glow ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      // Draw slices
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle);

      for (let i = 0; i < totalSlices; i++) {
        const start = i * sliceAngle;
        const end = start + sliceAngle;
        const color = sliceColors[i % sliceColors.length];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Topic Index / Truncated text
        ctx.save();
        ctx.rotate(start + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 4;

        const topicText = `${i + 1}. ${topics[i].topic}`;
        const maxLen = 22;
        const displayText = topicText.length > maxLen ? topicText.substring(0, maxLen) + '…' : topicText;

        ctx.fillText(displayText, radius - 22, 4);
        ctx.restore();
      }

      ctx.restore();

      // Center Hub
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, 38, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Center Microphone / Logo Icon
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M2M', center, center);
      ctx.restore();
    },
    [topics, size, sliceColors]
  );

  useEffect(() => {
    drawWheel(rotationAngle);
  }, [drawWheel, rotationAngle]);

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Top Pointer Indicator */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-xl"
        style={{ marginTop: -2 }}
      >
        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-amber-400" />
      </div>

      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full shadow-[0_0_50px_rgba(168,85,247,0.3)] bg-slate-950"
      />
    </div>
  );
};
