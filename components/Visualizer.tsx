import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Base circle/glow
      const baseRadius = 50 + (volume * 30);

      // Dynamic Gradient
      const gradient = ctx.createRadialGradient(width/2, centerY, baseRadius * 0.5, width/2, centerY, baseRadius * 2);
      if (isActive) {
        gradient.addColorStop(0, 'rgba(96, 165, 250, 0.9)'); // Blue-400
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.4)'); // Blue-500
        gradient.addColorStop(1, 'rgba(29, 78, 216, 0)'); // Blue-800 transparent
      } else {
        gradient.addColorStop(0, 'rgba(148, 163, 184, 0.5)'); // Slate-400
        gradient.addColorStop(1, 'rgba(71, 85, 105, 0)'); // Slate-600
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(width/2, centerY, baseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Waveform
      if (isActive) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        for (let i = 0; i < width; i++) {
          const barHeight = volume * 50;
          // Sine wave modulated by volume and phase
          const y = centerY + Math.sin((i * 0.02) + phase) * Math.cos((i * 0.01) - phase) * barHeight;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
      }

      phase += 0.1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [volume, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full h-64 md:h-80"
    />
  );
};

export default Visualizer;
